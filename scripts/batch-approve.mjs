// batch-approve.mjs — review layer (stage 4). Moves approved pending seeds
// into src/scenario/seeds/ where qbLoader auto-merges them into the bank.
//
// Usage: node scripts/batch-approve.mjs [--list docs/ai-pipeline/approved.json]

import { readFileSync, readdirSync, renameSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const ix = args.indexOf("--list");
const LIST = ix >= 0 ? args[ix + 1] : "docs/ai-pipeline/approved.json";
const PENDING = "docs/ai-pipeline/_pending-seeds";
const DEST = "src/scenario/seeds";

if (!existsSync(LIST)) {
  console.error(`No approved list at ${LIST}. Download approved.json from the contact sheet into docs/ai-pipeline/ first.`);
  process.exit(1);
}
let ids;
try { ids = JSON.parse(readFileSync(LIST, "utf8")); }
catch (e) { console.error(`Could not parse ${LIST}: ${e.message}`); process.exit(1); }
if (!Array.isArray(ids)) { console.error(`${LIST} must be a JSON array of seed ids.`); process.exit(1); }

const pending = existsSync(PENDING) ? readdirSync(PENDING).filter(f => f.endsWith(".json")) : [];
if (pending.length === 0) {
  console.error(`No pending seeds in ${PENDING} — nothing to approve.`);
  process.exit(1);
}

let moved = 0;
const missing = [];
for (const id of ids) {
  const src = join(PENDING, `${id}.json`);
  if (!existsSync(src)) { missing.push(id); continue; }
  const dst = join(DEST, `${id}.json`);
  if (existsSync(dst)) rmSync(dst); // overwrite
  renameSync(src, dst);
  moved++;
}
const held = pending.length - moved - missing.length + (missing.length ? 0 : 0);
const remaining = existsSync(PENDING) ? readdirSync(PENDING).filter(f => f.endsWith(".json")).length : 0;

console.log(`Approved + moved: ${moved} → ${DEST}/`);
console.log(`Held back in ${PENDING}: ${remaining}`);
if (missing.length) console.log(`Not found in pending (skipped): ${missing.join(", ")}`);
console.log(`The bank picks up moved seeds on next app load (qbLoader auto-merge).`);
