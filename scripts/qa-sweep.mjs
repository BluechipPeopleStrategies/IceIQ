// QA sweep — proactively audit every geometric scenario seed in one shot.
// Runs the same lint the engine gates on (schema + hockey rules + scorer
// self-test + the QA coherence checks) over all of src/scenario/seeds/*.json
// and prints a triage report: errors first, then warnings, then a clean count.
//
//   node scripts/qa-sweep.mjs            # full report
//   node scripts/qa-sweep.mjs --warns    # only seeds with errors OR warnings
//   node scripts/qa-sweep.mjs --quiet    # just the summary line
//
// This is the automated half of the QA system. The judgment half (does the
// read make hockey sense?) is the AI QA coach — see docs/ai-pipeline/SCENARIO-QA.md.

import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { lintScenario } from "../tools/scenario-author/validate.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const seedsDir = resolve(root, "src/scenario/seeds");
const argv = process.argv.slice(2);
const onlyFlagged = argv.includes("--warns");
const quiet = argv.includes("--quiet");

const RED = "\x1b[31m", YEL = "\x1b[33m", GRN = "\x1b[32m", DIM = "\x1b[2m", RST = "\x1b[0m";

let files;
try {
  files = readdirSync(seedsDir).filter(f => f.endsWith(".json")).sort();
} catch {
  console.log("no seeds dir (src/scenario/seeds) — nothing to sweep.");
  process.exit(0);
}

const results = [];
for (const f of files) {
  let scn;
  try { scn = JSON.parse(readFileSync(resolve(seedsDir, f), "utf8")); }
  catch (e) { results.push({ f, errs: [`unreadable JSON: ${e.message}`], warns: [] }); continue; }
  const r = lintScenario(scn);
  results.push({ f, errs: r.errs || [], warns: r.warns || [] });
}

const withErr = results.filter(r => r.errs.length);
const withWarn = results.filter(r => !r.errs.length && r.warns.length);
const clean = results.filter(r => !r.errs.length && !r.warns.length);

if (!quiet) {
  for (const r of results) {
    const flagged = r.errs.length || r.warns.length;
    if (onlyFlagged && !flagged) continue;
    if (!flagged) { console.log(`${GRN}OK${RST}  ${DIM}${r.f}${RST}`); continue; }
    const tag = r.errs.length ? `${RED}FAIL${RST}` : `${YEL}WARN${RST}`;
    console.log(`${tag}  ${r.f.replace(/\.json$/, "")}`);
    for (const e of r.errs)  console.log(`   ${RED}✗ ${e}${RST}`);
    for (const w of r.warns) console.log(`   ${YEL}⚠ ${w}${RST}`);
  }
  console.log("");
}

console.log(
  `${results.length} seeds — ` +
  `${RED}${withErr.length} error${RST} / ${YEL}${withWarn.length} warn-only${RST} / ${GRN}${clean.length} clean${RST}`
);
process.exit(withErr.length ? 1 : 0);
