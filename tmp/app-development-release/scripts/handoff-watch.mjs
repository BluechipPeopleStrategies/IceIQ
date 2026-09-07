// handoff-watch.mjs — watch an outbox folder and auto-copy anything dropped
// there to the Windows clipboard, so a passed pipeline artifact is one Ctrl+V
// away from your Codex / ChatGPT / Gemini tab (no select-copy step).
//
// Why a folder and not "send to the Codex tab": VS Code sandboxes extensions,
// so nothing local can type into the Codex tab. The clipboard is the closest
// hands-off bridge that works with every tab-based agent.
//
// Usage:  node scripts/handoff-watch.mjs
//   then  drop / save any .txt or .json into docs/ai-pipeline/handoff/
//   → its contents land on your clipboard; the file is moved to handoff/sent/.
//
// Producers (you, Claude, or a script) just write a file into handoff/.

import { watch, mkdirSync, readFileSync, renameSync, existsSync, readdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve, basename } from "node:path";

const HF = resolve("docs/ai-pipeline/handoff");
const SENT = join(HF, "sent");
mkdirSync(SENT, { recursive: true });

const stamp = () => new Date().toISOString().replace(/[:.]/g, "-");
const isCandidate = (name) => name && name !== "sent" && !name.startsWith(".") && !name.endsWith("~") && /\.(txt|json|md)$/i.test(name);

function copyToClipboard(absPath) {
  const r = spawnSync(
    "powershell",
    ["-NoProfile", "-Command", "Set-Clipboard -Value (Get-Content -Raw -Encoding UTF8 -LiteralPath $env:HF_FILE)"],
    { env: { ...process.env, HF_FILE: absPath } }
  );
  return r.status === 0;
}

function process(name) {
  const src = join(HF, name);
  if (!existsSync(src)) return;
  let st; try { st = statSync(src); } catch { return; }
  if (!st.isFile()) return;
  let chars = 0;
  try { chars = readFileSync(src, "utf8").length; } catch { return; }
  const ok = copyToClipboard(src);
  const dest = join(SENT, `${stamp()}__${name}`);
  try { renameSync(src, dest); } catch {}
  if (ok) console.log(`📋 copied ${name} (${chars} chars) → paste into your Codex tab (Ctrl+V). archived → handoff/sent/`);
  else console.log(`⚠ copied FAILED for ${name} (clipboard blocked?). file is at handoff/sent/ — copy it manually.`);
}

// debounce duplicate fs events per filename
const pending = new Map();
function schedule(name) {
  if (!isCandidate(name)) return;
  clearTimeout(pending.get(name));
  pending.set(name, setTimeout(() => { pending.delete(name); process(name); }, 250));
}

// process any backlog already sitting in the folder
for (const name of readdirSync(HF)) schedule(name);

watch(HF, (_event, name) => schedule(name));

console.log("RinkReads handoff watcher");
console.log(`  watching: ${HF}`);
console.log(`  drop a .txt/.json/.md here → it auto-copies to your clipboard, then click your Codex tab and paste.`);
console.log(`  Ctrl+C to stop.`);
