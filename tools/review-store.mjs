// Review store — pure fs logic behind the founder review dashboard. The Vite
// dev plugin (tools/review-server-plugin.mjs) is a thin HTTP shell over these.
// Kept framework-free and path-explicit so it is unit-testable with temp files
// (tools/review-store.test.mjs).
import { readFileSync, writeFileSync, appendFileSync, existsSync } from "node:fs";
import { assertNotFrozen } from "./lib/frozen-tools.mjs";

// nodeId age prefix (e.g. "u15") → bank age-level display name.
const AGE_LEVEL = {
  u7: "U7 / Initiation", u9: "U9 / Novice", u11: "U11 / Atom",
  u13: "U13 / Peewee", u15: "U15 / Bantam", u18: "U18 / Midget",
};

function readJSON(path, fallback) {
  try { return JSON.parse(readFileSync(path, "utf8")); } catch { return fallback; }
}
function writeJSON(path, obj) {
  writeFileSync(path, JSON.stringify(obj, null, 2) + "\n");
}
function logDecision(paths, entry, ts) {
  appendFileSync(paths.log, JSON.stringify({ ts, by: "founder", ...entry }) + "\n");
}

export function loadQueue(paths) {
  const q = readJSON(paths.queue, { items: [] });
  if (!Array.isArray(q.items)) q.items = [];
  return q;
}

// Append a review-queue item (e.g. from the gauntlet generator). Deduped by
// question.id — re-enqueuing the same id is a no-op. Returns { ok, added }.
export function enqueue(paths, item) {
  const id = item?.question?.id;
  if (!id) return { ok: false, error: "item.question.id required" };
  const q = loadQueue(paths);
  if (q.items.some((i) => i.question?.id === id)) return { ok: true, added: false };
  q.items.push(item);
  writeJSON(paths.queue, q);
  return { ok: true, added: true };
}

// Levels a question should land in: explicit levels[] wins; else the nodeId age.
function levelsFor(question) {
  if (Array.isArray(question.levels) && question.levels.length) return question.levels;
  const age = String(question.nodeId || "").split(".")[0];
  const lvl = AGE_LEVEL[age];
  return lvl ? [lvl] : [];
}

function removeFromQueue(paths, id) {
  const q = loadQueue(paths);
  const item = q.items.find((i) => i.question?.id === id);
  if (!item) return { item: null, q };
  q.items = q.items.filter((i) => i.question?.id !== id);
  writeJSON(paths.queue, q);
  return { item, q };
}

// Approve: push the question into bank.json under each of its levels (dedupe by
// id), remove it from the queue, log. Returns { ok, levels, bankCount }.
export function approve(paths, id, ts) {
  // FROZEN (Phase 9 Task 1). approve() is the direct-writer named in the
  // framework-fit audit: it appends into bank.json with no run record and no
  // recall path. Only approve() is frozen — enqueue/loadQueue/reject/sendBack/
  // editItem stay live, because gauntlet-run and gauntlet-audit depend on them
  // and none of them touch the live bank.
  assertNotFrozen("tools/review-store.mjs approve()");

  const q = loadQueue(paths);
  const item = q.items.find((i) => i.question?.id === id);
  if (!item) return { ok: false, error: "id not found in queue" };
  const question = item.question;
  const levels = levelsFor(question);
  if (!levels.length) return { ok: false, error: "question has no level (levels[] or nodeId age)" };

  const bank = readJSON(paths.bank, {});
  for (const lvl of levels) {
    if (!Array.isArray(bank[lvl])) bank[lvl] = [];
    if (!bank[lvl].some((x) => x.id === question.id)) bank[lvl].push(question);
  }
  writeJSON(paths.bank, bank);

  // remove from queue (re-read to avoid clobbering concurrent edits)
  removeFromQueue(paths, id);
  logDecision(paths, { action: "approve", id, levels }, ts);
  const bankCount = Object.values(bank).reduce((n, arr) => n + (arr?.length || 0), 0);
  return { ok: true, levels, bankCount };
}

export function reject(paths, id, note, ts) {
  const { item } = removeFromQueue(paths, id);
  if (!item) return { ok: false, error: "id not found in queue" };
  logDecision(paths, { action: "reject", id, note: note || "" }, ts);
  return { ok: true };
}

export function sendBack(paths, id, note, ts) {
  const { item } = removeFromQueue(paths, id);
  if (!item) return { ok: false, error: "id not found in queue" };
  logDecision(paths, { action: "sendback", id, note: note || "" }, ts);
  return { ok: true };
}

// Edit replaces the queued item's question in place (stays in queue for re-review).
export function editItem(paths, id, question, ts) {
  const q = loadQueue(paths);
  const item = q.items.find((i) => i.question?.id === id);
  if (!item) return { ok: false, error: "id not found in queue" };
  item.question = question;
  writeJSON(paths.queue, q);
  logDecision(paths, { action: "edit", id }, ts);
  return { ok: true };
}
