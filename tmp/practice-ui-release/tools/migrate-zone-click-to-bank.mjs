// One-shot migration: move ZONE_CLICK_QUESTIONS from src/App.jsx into
// src/data/questions.json so zone-click questions become first-class
// entries in the bank (curatable in the dashboard, same as every other
// type).
//
// Field transforms per question:
//   level: [...]       → primary level = level[0];
//                        if length > 1, store `levels: [...]` (matching
//                        the multi-age field qbLoader already supports);
//                        otherwise omit `levels`.
//   explanation: "..."  → renamed to `why: "..."` to match bank schema.
//   (id / type / d / pos / sit / question / correctZone / zones preserved)
//
// Idempotent: if a question with the same id already exists anywhere in
// the bank, skip it and log.
//
// Run:   node tools/migrate-zone-click-to-bank.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here     = path.dirname(fileURLToPath(import.meta.url));
const bankPath = path.join(here, "..", "src", "data", "questions.json");
const appPath  = path.join(here, "..", "src", "App.jsx");

const app  = fs.readFileSync(appPath, "utf8");
const bank = JSON.parse(fs.readFileSync(bankPath, "utf8"));

// Extract the array source between `const ZONE_CLICK_QUESTIONS = [` and the
// matching closing `];`. We then eval it in a Node VM to get real objects —
// the file is trusted source we own, and JSON.parse won't handle JS object
// literals (unquoted keys, trailing commas, etc).
const start = app.indexOf("const ZONE_CLICK_QUESTIONS = [");
if (start < 0) { console.error("ZONE_CLICK_QUESTIONS not found — already migrated?"); process.exit(0); }
const openBracket = app.indexOf("[", start);
// Balanced-bracket scan to find the matching `]`.
let depth = 0, end = -1;
for (let i = openBracket; i < app.length; i++) {
  const ch = app[i];
  if (ch === "[") depth++;
  else if (ch === "]") {
    depth--;
    if (depth === 0) { end = i + 1; break; }
  }
}
if (end < 0) throw new Error("Could not find matching ] for ZONE_CLICK_QUESTIONS");

const arrSrc = app.slice(openBracket, end);
// eslint-disable-next-line no-new-func
const arr = Function(`"use strict"; return ${arrSrc};`)();
if (!Array.isArray(arr)) throw new Error("Parsed value is not an array");

console.log(`Parsed ${arr.length} zone-click questions from App.jsx`);

// Collect every id already in the bank so we can skip duplicates on re-run.
const existingIds = new Set();
for (const lvl of Object.keys(bank)) {
  for (const q of bank[lvl]) existingIds.add(q.id);
}

let added = 0, skipped = 0;
for (const src of arr) {
  if (existingIds.has(src.id)) {
    console.log(`  skip ${src.id} (already in bank)`);
    skipped++;
    continue;
  }
  if (!Array.isArray(src.level) || src.level.length === 0) {
    console.warn(`  warn ${src.id} has no level[] — skipping`);
    skipped++;
    continue;
  }
  const primary = src.level[0];
  if (!bank[primary]) {
    console.warn(`  warn ${src.id} primary level "${primary}" not in bank — skipping`);
    skipped++;
    continue;
  }
  const next = {
    id: src.id,
    type: "zone-click",
    cat: src.cat || "positioning", // default category for zone-click
    d: src.d,
    pos: src.pos,
    sit: src.sit,
    question: src.question,
    correctZone: src.correctZone,
    zones: src.zones,
    why: src.explanation || src.why || "",
  };
  if (src.level.length > 1) next.levels = [...src.level];
  bank[primary].push(next);
  added++;
}

fs.writeFileSync(bankPath, JSON.stringify(bank, null, 2) + "\n");
console.log(`\nMigration complete: ${added} added, ${skipped} skipped.`);
console.log(`Bank written to ${path.relative(process.cwd(), bankPath)}`);
