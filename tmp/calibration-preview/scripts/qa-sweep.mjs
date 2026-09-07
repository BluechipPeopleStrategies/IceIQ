// QA sweep — proactively audit every geometric scenario seed in one shot.
// Runs the same lint the engine gates on (schema + hockey rules + scorer
// self-test + the QA coherence checks) over all of src/scenario/seeds/*.json
// and prints a triage report: errors first, then warnings, then a clean count.
//
//   node scripts/qa-sweep.mjs                    # full report
//   node scripts/qa-sweep.mjs --warns            # only seeds with errors OR warnings
//   node scripts/qa-sweep.mjs --quiet            # just the summary line
//   node scripts/qa-sweep.mjs --update-baseline  # re-record the accepted warnings
//
// EXIT CODE: non-zero on any error, and ALSO on any warning that is not in the
// recorded baseline (scripts/qa-warn-baseline.json). Before 2026-08-03 this
// exited 0 whenever everything was a warning, which is how a goalie drawn 6.9 m
// off its own net shipped past two validators that both caught it — warnings
// gated nothing, so adding a third would have changed nothing. Known warnings
// stay non-blocking; NEW ones block. Clear a baseline entry by fixing the seed
// and re-running with --update-baseline.
//
// This is the automated half of the QA system. The judgment half (does the
// read make hockey sense?) is the AI QA coach — see docs/ai-pipeline/SCENARIO-QA.md.

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { lintScenario } from "../tools/scenario-author/validate.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const seedsDir = resolve(root, "src/scenario/seeds");
const baselinePath = resolve(root, "scripts/qa-warn-baseline.json");
const argv = process.argv.slice(2);
const onlyFlagged = argv.includes("--warns");
const quiet = argv.includes("--quiet");
const updateBaseline = argv.includes("--update-baseline");

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

// ── warning baseline ────────────────────────────────────────────────────────
// Numbers are normalized out of the signature so a seed nudged by a few
// centimetres doesn't read as a brand-new warning, while a different KIND of
// warning on that same seed still does.
const signature = (msg) => msg.replace(/-?\d+(\.\d+)?/g, "#").trim();

const current = {};
for (const r of results) {
  if (!r.warns.length) continue;
  current[r.f] = [...new Set(r.warns.map(signature))].sort();
}

if (updateBaseline) {
  writeFileSync(baselinePath, JSON.stringify(current, null, 2) + "\n");
  const n = Object.values(current).reduce((a, v) => a + v.length, 0);
  console.log(`baseline updated — ${n} accepted warning${n === 1 ? "" : "s"} across ${Object.keys(current).length} seed(s)`);
  console.log(`  ${baselinePath.replace(root + "\\", "").replace(root + "/", "")}`);
  process.exit(0);
}

let baseline = {};
try { baseline = JSON.parse(readFileSync(baselinePath, "utf8")); }
catch { baseline = {}; }

const newWarns = [];
for (const [file, sigs] of Object.entries(current)) {
  const accepted = new Set(baseline[file] || []);
  for (const s of sigs) if (!accepted.has(s)) newWarns.push({ file, sig: s });
}

if (newWarns.length) {
  console.log(`${YEL}NEW WARNINGS above the recorded baseline:${RST}`);
  for (const w of newWarns) console.log(`   ${YEL}⚠ ${w.file.replace(/\.json$/, "")} — ${w.sig}${RST}`);
  console.log(`${DIM}   Fix the seed, or accept it with: node scripts/qa-sweep.mjs --update-baseline${RST}`);
  console.log("");
}

const acceptedCount = Object.values(baseline).reduce((a, v) => a + v.length, 0);

console.log(
  `${results.length} seeds — ` +
  `${RED}${withErr.length} error${RST} / ${YEL}${withWarn.length} warn-only${RST} / ${GRN}${clean.length} clean${RST}` +
  ` ${DIM}(${acceptedCount} baselined warning${acceptedCount === 1 ? "" : "s"}, ${newWarns.length} new)${RST}`
);
process.exit(withErr.length || newWarns.length ? 1 : 0);
