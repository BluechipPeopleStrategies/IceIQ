// Renders the founder's decision-richness calibration (tools/gauntlet/decision-calibration.json)
// as a compact few-shot block injected into the Head Coach prompts, so the AI's
// "genuine decision" judgment matches Thomas's stricter standard instead of its
// own lenient default. Loaded once and cached.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
let cached = null;

function load() {
  if (cached) return cached;
  try { cached = JSON.parse(readFileSync(resolve(here, "decision-calibration.json"), "utf8")); }
  catch { cached = { principle: "", examples: [] }; }
  return cached;
}

// Compact block for prompt injection. Empty string if no calibration is present.
export function renderDecisionCalibration() {
  const c = load();
  if (!c.principle && !(c.examples || []).length) return "";
  const lines = [`FOUNDER CALIBRATION for decision-richness — match this stricter standard:`, c.principle];
  for (const e of c.examples || []) lines.push(`- [${e.verdict}] ${e.label}: ${e.reason}`);
  return lines.filter(Boolean).join("\n");
}
