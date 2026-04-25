// Deletes questions from src/data/questions.json by id. Pass ids as args.
//
//   node tools/delete-questions.mjs u11_rr_15 u11_rr_47 u11_rr_53
//
// Searches every level array. Reports which ids were found + removed and
// which weren't found anywhere.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const qPath = path.join(here, "..", "src", "data", "questions.json");

const ids = process.argv.slice(2).map(s => s.trim()).filter(Boolean);
if (!ids.length) {
  console.error("Usage: node tools/delete-questions.mjs <id> [<id>...]");
  process.exit(1);
}

const qb = JSON.parse(fs.readFileSync(qPath, "utf8"));
const idSet = new Set(ids);
const removed = [];
const notFound = new Set(ids);

for (const [level, qs] of Object.entries(qb)) {
  qb[level] = qs.filter(q => {
    if (q.id && idSet.has(q.id)) {
      removed.push({ id: q.id, level });
      notFound.delete(q.id);
      return false;
    }
    return true;
  });
}

fs.writeFileSync(qPath, JSON.stringify(qb, null, 2) + "\n");

console.log(`Removed ${removed.length} question(s):`);
for (const r of removed) console.log(`  - ${r.id} (from ${r.level})`);
if (notFound.size) {
  console.log(`\nNOT FOUND (no changes for these): ${[...notFound].join(", ")}`);
}
