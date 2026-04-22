// One-shot structural fix for src/data/questions.json errors surfaced by
// tools/quality-scan.mjs. Idempotent — safe to re-run.
//
//   node tools/fix-quality-errors.mjs
//
// Fixes two clusters:
//   1. U13 MC questions where `pos` is a comma-delimited string. Converts
//      "D" → ["D"], "F" → ["F"], "F,D" → ["F","D"].
//   2. Duplicate u15tf1 + u15tf2 in U15 / Bantam. Removes the second
//      occurrence of each (keeps first).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const qPath = path.join(here, "..", "src", "data", "questions.json");
const bank = JSON.parse(fs.readFileSync(qPath, "utf8"));

let posFixed = 0, dupsRemoved = 0;

// ── 1. pos-shape for any level (catches U13 and any future regressions) ────
for (const level of Object.keys(bank)) {
  for (const q of bank[level]) {
    if (typeof q.pos === "string") {
      q.pos = q.pos.split(",").map(s => s.trim()).filter(Boolean);
      posFixed++;
    }
  }
}

// ── 2. duplicate ids within each age bucket (keep first, drop rest) ─────────
for (const level of Object.keys(bank)) {
  const seen = new Set();
  const kept = [];
  for (const q of bank[level]) {
    if (q.id && seen.has(q.id)) {
      console.log(`drop duplicate ${q.id} in ${level}`);
      dupsRemoved++;
      continue;
    }
    if (q.id) seen.add(q.id);
    kept.push(q);
  }
  bank[level] = kept;
}

fs.writeFileSync(qPath, JSON.stringify(bank, null, 2) + "\n");
console.log(`\nFixed ${posFixed} pos-shape entries.`);
console.log(`Removed ${dupsRemoved} duplicate-id entries.`);
console.log(`Updated ${path.relative(process.cwd(), qPath)}.`);
