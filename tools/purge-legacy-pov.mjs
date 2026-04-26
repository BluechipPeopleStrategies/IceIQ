// One-shot: remove legacy SVG-rendered pov-mc / pov-pick questions from
// src/data/questions.json. The new image-backed pov-mc system that
// replaces them lives in tools/seed-pov-to-bank.mjs.
//
//   node tools/purge-legacy-pov.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const qPath = path.join(here, "..", "src", "data", "questions.json");

const bank = JSON.parse(fs.readFileSync(qPath, "utf8"));

let dropped = 0;
const droppedIds = [];
for (const level of Object.keys(bank)) {
  const before = bank[level].length;
  bank[level] = bank[level].filter(q => {
    if (q.type === "pov-mc" || q.type === "pov-pick") {
      droppedIds.push(`${level}::${q.id}`);
      return false;
    }
    return true;
  });
  dropped += before - bank[level].length;
}

fs.writeFileSync(qPath, JSON.stringify(bank, null, 2) + "\n");
console.log(`Dropped ${dropped} legacy POV questions.`);
for (const id of droppedIds) console.log("  -", id);
