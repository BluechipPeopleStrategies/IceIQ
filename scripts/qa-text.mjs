// Text-question QA gate — the deterministic half of the review-bank gate.
// Validates a batch of text-format questions (mc/tf/seq/mistake/next) against
// the schema + structural rules from docs/ai-pipeline/PROMPT-PACK.md before they
// can ship into src/data/bank.json. The hockey-accuracy / distractor / age-fit
// judgment is a separate AI reviewer pass (the gauntlet's review prompt).
//
//   node scripts/qa-text.mjs docs/ai-pipeline/_qa-text-batch.json
//
// Exit 1 if any question has a hard error. Warnings (e.g. em dashes) don't block.

import { readFileSync } from "node:fs";

const VALID_LEVELS = new Set([
  "U7 / Initiation", "U9 / Novice", "U11 / Atom",
  "U13 / Peewee", "U15 / Bantam", "U18 / Midget",
]);
const OPT_TYPES = new Set(["mc", "mistake", "next"]);
const ALL_TYPES = new Set(["mc", "tf", "seq", "mistake", "next"]);

const RED = "\x1b[31m", YEL = "\x1b[33m", GRN = "\x1b[32m", DIM = "\x1b[2m", RST = "\x1b[0m";

const path = process.argv[2] || "docs/ai-pipeline/_qa-text-batch.json";
let batch;
try { batch = JSON.parse(readFileSync(path, "utf8")); }
catch (e) { console.error("cannot read batch:", e.message); process.exit(2); }
if (!Array.isArray(batch)) { console.error("batch must be a JSON array"); process.exit(2); }

const seenIds = new Set();

function lint(q, idx) {
  const errs = [], warns = [];
  const where = q?.id || `#${idx}`;
  const E = (m) => errs.push(m);
  const W = (m) => warns.push(m);

  if (!q || typeof q !== "object") { return { errs: ["not an object"], warns }; }
  const type = q.type || "mc";

  if (!q.id || typeof q.id !== "string") E("missing id");
  else if (seenIds.has(q.id)) E(`duplicate id "${q.id}"`);
  else seenIds.add(q.id);

  if (!ALL_TYPES.has(type)) E(`unknown type "${type}"`);

  const levels = Array.isArray(q.levels) ? q.levels : (q.level ? [q.level] : []);
  if (!levels.length) E("missing levels");
  for (const L of levels) if (!VALID_LEVELS.has(L)) E(`invalid level "${L}"`);

  if (!q.cat || typeof q.cat !== "string") E("missing cat");
  if (!q.nodeId || typeof q.nodeId !== "string") E("missing nodeId");
  if (![1, 2, 3].includes(q.d)) E(`d must be 1-3 (got ${JSON.stringify(q.d)})`);
  if (!q.sit || typeof q.sit !== "string" || q.sit.length < 12) E("sit (situation/statement) missing or too short");

  if (OPT_TYPES.has(type)) {
    if (!Array.isArray(q.opts) || q.opts.length !== 4) E(`${type} needs exactly 4 opts (got ${q.opts?.length ?? 0})`);
    else {
      if (q.opts.some(o => typeof o !== "string" || !o.trim())) E("an opt is empty/non-string");
      if (new Set(q.opts.map(o => String(o).trim().toLowerCase())).size !== 4) E("opts are not all distinct");
    }
    if (!Number.isInteger(q.ok) || q.ok < 0 || q.ok > 3) E(`ok must be an index 0-3 (got ${JSON.stringify(q.ok)})`);
    if (!q.explain && !q.tip) W("no explain/tip (recommended)");
    if (type === "mistake" && !q.question) W('mistake usually carries a "question" field');
  } else if (type === "tf") {
    if (typeof q.ok !== "boolean") E(`tf ok must be boolean (got ${JSON.stringify(q.ok)})`);
    if (!q.tip) W("tf has no tip");
    if (!q.why && !q.explain) W("tf has no why/explain");
  } else if (type === "seq") {
    const items = q.items;
    if (!Array.isArray(items) || items.length < 4 || items.length > 6) E(`seq needs 4-6 items (got ${items?.length ?? 0})`);
    const co = q.correct_order;
    if (!Array.isArray(co) || co.length < 2) E("seq needs a correct_order array");
    else if (Array.isArray(items)) {
      if (co.some(i => !Number.isInteger(i) || i < 0 || i >= items.length)) E("correct_order has an out-of-range index");
      else if (new Set(co).size !== co.length) E("correct_order has duplicate indices");
      else if (co.length === items.length && co.every((v, i) => v === i)) {
        E("correct_order is identity [0,1,2,…] — items are in solved order, which hands the kid the answer. Shuffle items and repoint correct_order.");
      }
    }
    if (!q.explain) W("seq has no explain");
  }

  // No em dashes anywhere (house rule).
  for (const k of ["sit", "tip", "why", "explain", "question"]) {
    if (typeof q[k] === "string" && q[k].includes("—")) W(`em dash in "${k}" — replace with comma/period/parens`);
  }
  if (Array.isArray(q.opts)) q.opts.forEach((o, i) => { if (String(o).includes("—")) warns.push(`em dash in opts[${i}]`); });

  return { where, errs, warns };
}

let nErr = 0, nWarn = 0, nClean = 0;
for (let i = 0; i < batch.length; i++) {
  const { where, errs, warns } = lint(batch[i], i);
  if (errs.length) {
    nErr++;
    console.log(`${RED}FAIL${RST} ${where}`);
    errs.forEach(e => console.log(`   ${RED}✗ ${e}${RST}`));
    warns.forEach(w => console.log(`   ${YEL}⚠ ${w}${RST}`));
  } else if (warns.length) {
    nWarn++;
    console.log(`${YEL}WARN${RST} ${where}`);
    warns.forEach(w => console.log(`   ${YEL}⚠ ${w}${RST}`));
  } else {
    nClean++;
    console.log(`${GRN}OK${RST}   ${DIM}${where}${RST}`);
  }
}
console.log(`\n${batch.length} questions — ${RED}${nErr} error${RST} / ${YEL}${nWarn} warn-only${RST} / ${GRN}${nClean} clean${RST}`);
process.exit(nErr ? 1 : 0);
