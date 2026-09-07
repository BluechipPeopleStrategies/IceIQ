// batch-approve.mjs — review layer (stage 4). Moves approved pending seeds
// into src/scenario/seeds/ where qbLoader auto-merges them into the bank.
//
// Usage: node scripts/batch-approve.mjs [--list docs/ai-pipeline/approved.json]

import { readFileSync, readdirSync, renameSync, existsSync, rmSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { assertNotFrozen } from "../tools/lib/frozen-tools.mjs";

// FROZEN (Phase 9 Task 1). This whole script exists to overwrite live seeds:
// it rmSync's an existing same-ID destination and renames the replacement over
// it, with no run record. Nothing below this line runs.
assertNotFrozen("scripts/batch-approve.mjs");

const args = process.argv.slice(2);
const ix = args.indexOf("--list");
const LIST = ix >= 0 ? args[ix + 1] : "docs/ai-pipeline/approved.json";
const PENDING = "docs/ai-pipeline/_pending-seeds";
const DEST = "src/scenario/seeds";

if (!existsSync(LIST)) {
  console.error(`No approved list at ${LIST}. Download approved.json from the contact sheet into docs/ai-pipeline/ first.`);
  process.exit(1);
}
let payload;
try { payload = JSON.parse(readFileSync(LIST, "utf8")); }
catch (e) { console.error(`Could not parse ${LIST}: ${e.message}`); process.exit(1); }
// Accept the sign-off shape { coach, signedAt, approved:[ids] } or a legacy array.
const ids = Array.isArray(payload) ? payload : payload.approved;
const coach = Array.isArray(payload) ? "(unsigned)" : (payload.coach || "(unsigned)");
const signedAt = Array.isArray(payload) ? new Date().toISOString().slice(0, 10) : (payload.signedAt || "");
if (!Array.isArray(ids)) { console.error(`${LIST} must contain an "approved" array of seed ids.`); process.exit(1); }

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

// Record the sign-off (who approved what, when) — a lightweight audit trail.
if (moved > 0) {
  const movedIds = ids.filter(id => !missing.includes(id));
  appendFileSync(join(DEST, "..", "..", "docs", "ai-pipeline", "_signoff-log.jsonl"),
    JSON.stringify({ coach, signedAt, approved: movedIds }) + "\n", "utf8");
}

console.log(`Signed off by ${coach}${signedAt ? ` (${signedAt})` : ""}`);
console.log(`Approved + moved: ${moved} → ${DEST}/`);
console.log(`Held back in ${PENDING}: ${remaining}`);
if (missing.length) console.log(`Not found in pending (skipped): ${missing.join(", ")}`);
console.log(`The bank picks up moved seeds on next app load (qbLoader auto-merge).`);
