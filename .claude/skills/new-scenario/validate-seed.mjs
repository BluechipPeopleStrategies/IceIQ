// Validate a unified-engine scenario seed before it ships.
// Wraps lintScenario (schema shape + hockey-logic rules + scorer self-test).
// Usage:  node .claude/skills/new-scenario/validate-seed.mjs <path-to-seed.json>
// Exit 0 = ok (warnings printed but non-fatal), 1 = hard errors, 2 = bad usage.
import { readFileSync } from "node:fs";
import { lintScenario } from "../../../tools/scenario-author/validate.mjs";

const path = process.argv[2];
if (!path) {
  console.error("usage: node .claude/skills/new-scenario/validate-seed.mjs <path-to-seed.json>");
  process.exit(2);
}

let scenario;
try {
  scenario = JSON.parse(readFileSync(path, "utf8"));
} catch (e) {
  console.error(`could not read/parse ${path}: ${e.message}`);
  process.exit(2);
}

const r = lintScenario(scenario);
const id = scenario.id || path;
for (const w of r.warns) console.log(`  warn: ${w}`);
if (r.ok) {
  console.log(`OK  ${id}${r.warns.length ? `  (${r.warns.length} warning${r.warns.length > 1 ? "s" : ""})` : ""}`);
  process.exit(0);
}
for (const e of r.errs) console.error(`  err:  ${e}`);
console.error(`FAIL ${id}`);
process.exit(1);
