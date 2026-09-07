#!/usr/bin/env node
// One-shot category consolidation. Rewrites `q.cat` in-place in
// questions.json per the MERGES map. Idempotent — running twice is a
// no-op. Print run is dry by default; pass --apply to write.

import fs from "node:fs";
import path from "node:path";

const BANK = path.resolve("src/data/questions.json");
const APPLY = process.argv.includes("--apply");

// { old category name → canonical replacement }
const MERGES = {
  // Breakouts family — plural form, absorbs "Exiting the Zone" and
  // "Breakout Execution" since they describe the same phase of play.
  "Breakout":            "Breakouts",
  "Breakout Execution":  "Breakouts",
  "Exiting the Zone":    "Breakouts",
  // Decision-Making (hyphen canonical) — absorbs "Decision Making" + "Decision Timing".
  "Decision Making":     "Decision-Making",
  "Decision Timing":     "Decision-Making",
  // Goaltending (the skill) — absorbs "Goalie" (the person).
  "Goalie":              "Goaltending",
  // Transition — absorbs "Transition Game".
  "Transition Game":     "Transition",
  // Puck Support — absorbs the unqualified "Support".
  "Support":             "Puck Support",
};

const bank = JSON.parse(fs.readFileSync(BANK, "utf8"));
let changed = 0;
const perMerge = {};
for (const [level, rows] of Object.entries(bank)) {
  for (const q of rows) {
    if (!q || !q.cat) continue;
    const target = MERGES[q.cat];
    if (target && target !== q.cat) {
      perMerge[q.cat] = (perMerge[q.cat] || 0) + 1;
      if (APPLY) q.cat = target;
      changed++;
    }
  }
}

if (!APPLY) {
  console.log(`DRY RUN — ${changed} questions would be rewritten. Pass --apply to write.\n`);
} else {
  fs.writeFileSync(BANK, JSON.stringify(bank, null, 2) + "\n", "utf8");
  console.log(`Rewrote ${changed} questions.\n`);
}
for (const [from, count] of Object.entries(perMerge)) {
  console.log(`  ${count.toString().padStart(3)} · ${from} → ${MERGES[from]}`);
}
