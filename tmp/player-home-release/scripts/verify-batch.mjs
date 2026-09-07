// verify-batch.mjs — the v1 ship gate. For each seed, runs the real
// lintScenario AND requires a citation (sourceRef.note + sourceRef.cite).
// Usage: node scripts/verify-batch.mjs --dir <folder>
//        node scripts/verify-batch.mjs <seed.json> [<seed.json> ...]
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { lintScenario } from "../tools/scenario-author/validate.mjs";

const args = process.argv.slice(2);
const dirIdx = args.indexOf("--dir");
let files = [];
if (dirIdx > -1) {
  const dir = args[dirIdx + 1];
  files = readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => join(dir, f)).sort();
} else {
  files = args.filter((a) => a.endsWith(".json"));
}
if (!files.length) { console.error("usage: verify-batch.mjs --dir <folder> | <seed.json> ..."); process.exit(2); }

function citationOf(seed) {
  const r = seed.sourceRef;
  if (!r || typeof r.note !== "string" || !r.note.trim() || typeof r.cite !== "string" || !r.cite.trim()) {
    return "missing sourceRef (need {note, cite})";
  }
  return null;
}

let pass = 0;
for (const f of files) {
  let seed;
  try { seed = JSON.parse(readFileSync(f, "utf8")); }
  catch (e) { console.error(`FAIL ${f} — bad JSON: ${e.message}`); continue; }
  const lint = lintScenario(seed);
  const cite = citationOf(seed);
  if (lint.ok && !cite) { console.log(`OK   ${seed.id}`); pass++; continue; }
  for (const e of (lint.errs || [])) console.error(`  err:  ${e}`);
  if (cite) console.error(`  err:  ${cite}`);
  console.error(`FAIL ${seed.id || f}`);
}
console.log(`\n── ${pass}/${files.length} OK`);
process.exit(pass === files.length ? 0 : 1);
