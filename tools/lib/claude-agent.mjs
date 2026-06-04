// Reusable agent driver — shells out to the `claude` CLI non-interactively to
// run one role (a system prompt + a user prompt) and return JSON. Extracted from
// the proven pattern in tools/scenario-author.mjs so the gauntlet generator can
// drive multiple roles (creator / curriculum / coach) without re-implementing
// the subprocess + envelope handling. Zero cost on a Claude Max plan; the
// --max-budget-usd flag is only a guardrail for direct-API users.
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Resolve the claude binary explicitly (Windows npm shim is `claude.cmd`).
export function resolveClaudeBinary() {
  if (process.env.CLAUDE_BIN && fs.existsSync(process.env.CLAUDE_BIN)) return process.env.CLAUDE_BIN;
  const isWin = process.platform === "win32";
  const candidates = isWin
    ? [path.join(process.env.APPDATA || "", "npm", "claude.cmd"),
       path.join(process.env.LOCALAPPDATA || "", "npm", "claude.cmd")]
    : ["/usr/local/bin/claude", "/usr/bin/claude", path.join(os.homedir(), ".local/bin/claude")];
  for (const c of candidates) if (c && fs.existsSync(c)) return c;
  return "claude";
}

// Low-level: run one claude turn. Returns raw stdout. system replaces the
// default system prompt entirely (so personal memory / CLAUDE.md don't leak).
export function runClaudeRaw({ system, prompt, model = "sonnet", budget = 1 }) {
  return new Promise((resolve, reject) => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rinkreads-gauntlet-"));
    const sysPath = path.join(tmpDir, "system.txt");
    fs.writeFileSync(sysPath, system, "utf8");
    const args = [
      "--print",
      "--model", model,
      "--max-budget-usd", String(budget),
      "--system-prompt-file", sysPath,
      "--output-format", "json",
    ];
    const isWin = process.platform === "win32";
    const child = spawn(resolveClaudeBinary(), args, { stdio: ["pipe", "pipe", "pipe"], shell: isWin });
    let stdout = "", stderr = "";
    child.stdout.on("data", (c) => (stdout += c.toString()));
    child.stderr.on("data", (c) => (stderr += c.toString()));
    child.on("close", (code) => {
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
      if (code !== 0) return reject(new Error(`claude exited ${code}\n${stderr}\n${stdout.slice(0, 800)}`));
      resolve(stdout);
    });
    child.on("error", reject);
    child.stdin.write(prompt);
    child.stdin.end();
  });
}

// Unwrap claude --output-format json envelope, then parse the model's JSON
// payload (tolerating code fences the model may emit despite instructions).
export function extractJSON(rawStdout) {
  let envelope;
  try { envelope = JSON.parse(rawStdout); }
  catch (e) { throw new Error(`claude output was not JSON: ${e.message}\n${rawStdout.slice(0, 400)}`); }
  let candidate = (envelope && typeof envelope === "object" && "result" in envelope) ? envelope.result : envelope;
  if (typeof candidate === "string") {
    const fenced = candidate.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = fenced ? fenced[1] : candidate;
    return JSON.parse(jsonStr);
  }
  return candidate;
}

// High-level: run a role and return parsed JSON. Throws on non-zero exit or
// unparseable output (callers decide whether to retry).
export async function runAgent({ system, prompt, model = "sonnet", budget = 1 }) {
  const raw = await runClaudeRaw({ system, prompt, model, budget });
  return extractJSON(raw);
}
