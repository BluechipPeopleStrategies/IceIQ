#!/usr/bin/env node
// Scenario authoring CLI — drives the `claude` Code CLI under the hood
// to generate scenario JSON from a natural-language description, then
// validates with the engine's own validator + scorer self-test.
//
// Usage:
//   node tools/scenario-author.mjs new "U13 forecheck where F1 angles..."
//   node tools/scenario-author.mjs validate <path.json>
//   node tools/scenario-author.mjs show <path.json>
//   node tools/scenario-author.mjs help
//
// Flags (for `new`):
//   --model sonnet|opus|haiku   default: sonnet (fast + cheap + great at structured)
//   --budget 1                   max-budget-usd passed to claude CLI; default 1
//   --out <path>                 default: src/scenario/seeds/<id>.json
//   --no-save                    print to stdout, don't write a file
//
// Cost: zero on a Claude Max plan since we shell out to `claude`. The
// --budget flag is a guardrail for direct-API users (rare).

import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSystemPrompt, buildJsonSchema } from "./scenario-author/prompt.js";
import { lintScenario } from "./scenario-author/validate.mjs";
import { asciiRink } from "./scenario-author/ascii.mjs";

// Resolve the claude binary explicitly so spawn finds it on Windows
// (where the npm shim is `claude.cmd`, not `claude`).
function resolveClaudeBinary() {
  if (process.env.CLAUDE_BIN && fs.existsSync(process.env.CLAUDE_BIN)) return process.env.CLAUDE_BIN;
  const isWin = process.platform === "win32";
  const candidates = isWin
    ? [
        path.join(process.env.APPDATA || "", "npm", "claude.cmd"),
        path.join(process.env.LOCALAPPDATA || "", "npm", "claude.cmd"),
      ]
    : ["/usr/local/bin/claude", "/usr/bin/claude", path.join(os.homedir(), ".local/bin/claude")];
  for (const c of candidates) if (c && fs.existsSync(c)) return c;
  return "claude"; // fallback to PATH
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SEEDS_DIR = path.join(ROOT, "src", "scenario", "seeds");

// ─────────────────────────────────────────────────────────────────────
// argv parsing — small enough to inline; not worth adding a dep.

function parseArgs(argv) {
  const [, , command, ...rest] = argv;
  const flags = { model: "sonnet", budget: "1", out: null, save: true };
  const positional = [];
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === "--no-save") { flags.save = false; continue; }
    if (a === "--model")   { flags.model = rest[++i]; continue; }
    if (a === "--budget")  { flags.budget = rest[++i]; continue; }
    if (a === "--out")     { flags.out = rest[++i]; continue; }
    positional.push(a);
  }
  return { command, positional, flags };
}

// ─────────────────────────────────────────────────────────────────────
// claude CLI invocation — non-interactive, schema-constrained, bare.

function runClaude({ system, prompt, schema, model, budget }) {
  return new Promise((resolve, reject) => {
    // System prompt + schema can both be large + contain shell-special
    // characters. Easiest portable path: write to temp files and pass
    // file paths via the --*-file flags claude supports.
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rinkreads-author-"));
    const sysPath = path.join(tmpDir, "system.txt");
    fs.writeFileSync(sysPath, system, "utf8");

    // Note: we skip --json-schema (inline JSON args quote-escape badly
    // through cmd.exe + the shim) AND --bare (it forces API-key auth,
    // breaking Claude Max users' OAuth session). --system-prompt-file
    // already replaces the default system prompt entirely, so personal
    // memory + CLAUDE.md don't leak into the authoring session.
    const args = [
      "--print",
      "--model", model,
      "--max-budget-usd", String(budget),
      "--system-prompt-file", sysPath,
      "--output-format", "json",
    ];
    const bin = resolveClaudeBinary();
    const isWin = process.platform === "win32";
    const child = spawn(bin, args, {
      stdio: ["pipe", "pipe", "pipe"],
      // On Windows we need shell:true to handle the .cmd extension when
      // invoking via the resolved path. The args carry no user input so
      // shell-interpolation isn't a vector here.
      shell: isWin,
    });
    let stdout = "", stderr = "";
    child.stdout.on("data", c => { stdout += c.toString(); });
    child.stderr.on("data", c => { stderr += c.toString(); });
    child.on("close", code => {
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
      if (code !== 0) {
        return reject(new Error(`claude exited with code ${code}\nstderr: ${stderr}\nstdout: ${stdout.slice(0, 1000)}`));
      }
      resolve({ stdout, stderr });
    });
    child.on("error", reject);
    child.stdin.write(prompt);
    child.stdin.end();
  });
}

// claude --output-format json wraps the result in an envelope. Extract
// the actual scenario JSON we asked for.
function extractScenario(rawStdout) {
  let envelope;
  try { envelope = JSON.parse(rawStdout); }
  catch (e) { throw new Error(`claude output was not JSON: ${e.message}\n${rawStdout.slice(0, 500)}`); }
  // Possible shapes from claude --output-format json:
  //   { type: "result", subtype: "success", result: "<the json string or object>" }
  //   { result: { ...the scenario... } }
  //   <the scenario directly>
  let candidate = envelope;
  if (envelope && typeof envelope === "object" && "result" in envelope) {
    candidate = envelope.result;
  }
  if (typeof candidate === "string") {
    // Strip any code fences the model might still emit despite our rules.
    const fenced = candidate.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = fenced ? fenced[1] : candidate;
    return JSON.parse(jsonStr);
  }
  return candidate;
}

// ─────────────────────────────────────────────────────────────────────
// Commands

async function cmdNew({ positional, flags }) {
  const description = positional.join(" ").trim();
  if (!description) {
    console.error("Usage: scenario-author new \"<description of the scenario>\"");
    process.exit(2);
  }

  const system = buildSystemPrompt();
  const schema = buildJsonSchema();
  const userPrompt =
    `Author a scenario for the following request. Use a unique id of the form ` +
    `"<level>_<concept>_<3-letter-suffix>", e.g. "u13_forecheck_a1b". Output ONLY ` +
    `the scenario JSON.\n\nRequest: ${description}`;

  console.error(`→ generating scenario via claude --model ${flags.model} (budget $${flags.budget})...`);
  const t0 = Date.now();
  const { stdout, stderr } = await runClaude({
    system, prompt: userPrompt, schema,
    model: flags.model, budget: flags.budget,
  });
  if (stderr.trim()) console.error(stderr.trim());
  const dt = ((Date.now() - t0) / 1000).toFixed(1);

  let scenario;
  try { scenario = extractScenario(stdout); }
  catch (e) {
    console.error(`✗ could not parse scenario from claude output: ${e.message}`);
    console.error("--- raw stdout ---");
    console.error(stdout);
    process.exit(1);
  }

  console.error(`← received in ${dt}s · id=${scenario.id}\n`);

  // ASCII preview before validation so authors can eyeball the layout
  // even if validation later fails.
  if (Array.isArray(scenario.actors) && scenario.stage) {
    console.log(asciiRink(scenario.actors, scenario.stage.view));
    console.log("");
  }

  const lint = lintScenario(scenario);
  if (lint.warns.length) {
    console.error("⚠ warnings:");
    for (const w of lint.warns) console.error("  · " + w);
  }
  if (!lint.ok) {
    console.error("✗ validation failed:");
    for (const e of lint.errs) console.error("  · " + e);
    console.error("\nNot saving. Try `new` again with a refined prompt.");
    process.exit(1);
  }
  console.error("✓ validated · scorer self-test passed\n");

  if (!flags.save) {
    process.stdout.write(JSON.stringify(scenario, null, 2) + "\n");
    return;
  }

  const outPath = flags.out || path.join(SEEDS_DIR, `${scenario.id}.json`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(scenario, null, 2) + "\n", "utf8");
  console.log(`wrote ${path.relative(ROOT, outPath)}`);
  console.log("\nview side-by-side: open http://localhost:5177/#scenario-test");
}

async function cmdValidate({ positional }) {
  const p = positional[0];
  if (!p) { console.error("Usage: scenario-author validate <path.json>"); process.exit(2); }
  const scenario = JSON.parse(fs.readFileSync(p, "utf8"));
  const lint = lintScenario(scenario);
  if (lint.warns.length) {
    console.log("⚠ warnings:");
    for (const w of lint.warns) console.log("  · " + w);
  }
  if (!lint.ok) {
    console.error("✗ errors:");
    for (const e of lint.errs) console.error("  · " + e);
    process.exit(1);
  }
  console.log(`✓ ${scenario.id} validated · scorer self-test passed`);
}

async function cmdShow({ positional }) {
  const p = positional[0];
  if (!p) { console.error("Usage: scenario-author show <path.json>"); process.exit(2); }
  const scenario = JSON.parse(fs.readFileSync(p, "utf8"));
  console.log(`${scenario.id}  ·  ${scenario.cat}  ·  difficulty ${scenario.difficulty}`);
  console.log(`prompt: ${scenario.interaction.prompt}`);
  console.log("");
  console.log(asciiRink(scenario.actors, scenario.stage.view));
  console.log("");
  if (scenario.tip) console.log(`💡 ${scenario.tip}`);
}

function cmdHelp() {
  console.log(`scenario-author — RinkReads scenario authoring CLI

usage:
  node tools/scenario-author.mjs new "<natural-language description>" [--model sonnet|opus] [--budget 1] [--out <path>] [--no-save]
  node tools/scenario-author.mjs validate <path.json>
  node tools/scenario-author.mjs show <path.json>
  node tools/scenario-author.mjs help

defaults:
  model    sonnet (fast, strong on structured output)
  budget   1.00 USD per call (relevant only for direct-API; Claude Max users pay nothing)
  output   src/scenario/seeds/<id>.json

example:
  node tools/scenario-author.mjs new "U13 breakout where the strong-side D retrieves the puck and the player picks the right first-pass option"
`);
}

// ─────────────────────────────────────────────────────────────────────
// main

const { command, positional, flags } = parseArgs(process.argv);

try {
  switch (command) {
    case "new":      await cmdNew({ positional, flags }); break;
    case "validate": await cmdValidate({ positional }); break;
    case "show":     await cmdShow({ positional }); break;
    case "help":
    case undefined:  cmdHelp(); break;
    default:
      console.error(`unknown command: ${command}`);
      cmdHelp();
      process.exit(2);
  }
} catch (e) {
  console.error(`✗ ${e.message}`);
  process.exit(1);
}
