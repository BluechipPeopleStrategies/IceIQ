// Applies a dashboard-authored patch file to src/data/questions.json.
// Idempotent — skips scenarios whose ids already exist in the bank.
//
//   node tools/apply-dashboard-patch.mjs <path-to-patch.json>
//
// Patch shape (emitted by the "📦 Download NEW only" button in
// tools/dashboard.html):
//
//   { "U9 / Novice": [ { id, type, cat, concept, d, pos, sit, why, tip, scene }, ... ],
//     "U11 / Atom":  [ ... ], ... }
//
// Matches the existing bank shape — levels are the outer keys, each scenario
// inside the array is ready to push onto bank[level] verbatim.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const qPath = path.join(here, "..", "src", "data", "questions.json");

const patchArg = process.argv[2];
if (!patchArg) {
  console.error("Usage: node tools/apply-dashboard-patch.mjs <path-to-patch.json>");
  process.exit(1);
}
const patchPath = path.resolve(patchArg);
if (!fs.existsSync(patchPath)) {
  console.error(`Patch file not found: ${patchPath}`);
  process.exit(1);
}

const patch = JSON.parse(fs.readFileSync(patchPath, "utf8"));
if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
  console.error("Patch must be a level-keyed object, e.g. { \"U9 / Novice\": [ ... ] }");
  process.exit(1);
}

const bank = JSON.parse(fs.readFileSync(qPath, "utf8"));
let added = 0, skipped = 0;

for (const level of Object.keys(patch)) {
  const rows = patch[level];
  if (!Array.isArray(rows)) {
    console.warn(`skip  level "${level}" — expected array, got ${typeof rows}`);
    continue;
  }
  if (!Array.isArray(bank[level])) {
    console.warn(`skip  level "${level}" — not present in questions.json (typo?)`);
    continue;
  }
  for (const q of rows) {
    if (!q?.id) { console.warn(`skip  row in ${level} — missing id`); continue; }
    if (bank[level].some(existing => existing.id === q.id)) {
      console.log(`skip  ${q.id} (already in ${level})`);
      skipped++;
      continue;
    }
    bank[level].push(q);
    console.log(`add   ${q.id} → ${level}`);
    added++;
  }
}

if (added === 0) {
  console.log(`\nNothing to apply. ${skipped} skipped.`);
  process.exit(0);
}

fs.writeFileSync(qPath, JSON.stringify(bank, null, 2) + "\n");
console.log(`\nApplied patch: ${added} added, ${skipped} skipped.`);
console.log(`Updated ${path.relative(process.cwd(), qPath)}`);
