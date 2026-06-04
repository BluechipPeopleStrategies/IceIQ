#!/usr/bin/env node
// Unit tests for the review store (founder approval dashboard backend logic).
// Uses a temp dir with fixture files; no Vite/HTTP. Run: node tools/review-store.test.mjs
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadQueue, approve, reject, sendBack, editItem, enqueue } from "./review-store.mjs";

let pass = 0, fail = 0;
const ok = (name, cond) => { console.log(`${cond ? "PASS" : "FAIL"}  ${name}`); cond ? pass++ : fail++; };

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), "review-"));
  const paths = {
    queue: join(dir, "review-queue.json"),
    bank: join(dir, "bank.json"),
    log: join(dir, "review-log.jsonl"),
  };
  const item = (id, levels) => ({
    question: { id, type: "mc", nodeId: `${levels[0].toLowerCase().split(" ")[0]}.x`, levels,
      sit: "?", opts: ["a", "b"], ok: 0 },
    gateHistory: { coachPanel: "pass" },
    proxyVerdict: { decision: "forward", scores: { brand: 0.9, learner: 0.9, strategy: 0.9 }, rationale: "ok" },
    queuedAt: "2026-06-04",
  });
  writeFileSync(paths.queue, JSON.stringify({ items: [
    item("q1", ["U9 / Novice", "U7 / Initiation"]),
    item("q2", ["U11 / Atom"]),
    item("q3", ["U13 / Peewee"]),
  ] }));
  writeFileSync(paths.bank, "{}");
  return { dir, paths };
}
const TS = "2026-06-04T00:00:00Z";
const logLines = (p) => existsSync(p.log) ? readFileSync(p.log, "utf8").trim().split("\n").filter(Boolean).map(JSON.parse) : [];

// --- approve: moves question into bank under EACH level, dedup, removes from queue, logs ---
{
  const { dir, paths } = fixture();
  const r = approve(paths, "q1", TS);
  const bank = JSON.parse(readFileSync(paths.bank, "utf8"));
  ok("approve returns ok", r.ok === true);
  ok("approve adds to both levels", (bank["U9 / Novice"]?.length === 1) && (bank["U7 / Initiation"]?.length === 1));
  ok("approve bank carries the question id", bank["U9 / Novice"][0].id === "q1");
  ok("approve removes from queue", !loadQueue(paths).items.some(i => i.question.id === "q1"));
  const log = logLines(paths);
  ok("approve logs one line", log.length === 1 && log[0].action === "approve" && log[0].id === "q1");
  ok("approve log records levels", Array.isArray(log[0].levels) && log[0].levels.length === 2);
  // idempotent dedupe: approving same id again (re-add to queue first) doesn't double-insert
  const q = loadQueue(paths); q.items.push({ question: { id: "q1", type: "mc", levels: ["U9 / Novice"], ok: 0, opts: ["a"], sit: "?" }, proxyVerdict: {} });
  writeFileSync(paths.queue, JSON.stringify(q));
  approve(paths, "q1", TS);
  const bank2 = JSON.parse(readFileSync(paths.bank, "utf8"));
  ok("approve dedupes by id within a level", bank2["U9 / Novice"].filter(x => x.id === "q1").length === 1);
  rmSync(dir, { recursive: true, force: true });
}

// --- approve falls back to nodeId age when levels missing ---
{
  const { dir, paths } = fixture();
  const q = loadQueue(paths);
  q.items.push({ question: { id: "q9", type: "mc", nodeId: "u15.decision-making", ok: 0, opts: ["a"], sit: "?" }, proxyVerdict: {} });
  writeFileSync(paths.queue, JSON.stringify(q));
  approve(paths, "q9", TS);
  const bank = JSON.parse(readFileSync(paths.bank, "utf8"));
  ok("approve uses nodeId age when no levels[]", bank["U15 / Bantam"]?.some(x => x.id === "q9"));
  rmSync(dir, { recursive: true, force: true });
}

// --- reject: removes from queue, logs, does NOT touch bank ---
{
  const { dir, paths } = fixture();
  const r = reject(paths, "q2", "off-brand", TS);
  ok("reject ok", r.ok === true);
  ok("reject removes from queue", !loadQueue(paths).items.some(i => i.question.id === "q2"));
  ok("reject leaves bank empty", Object.keys(JSON.parse(readFileSync(paths.bank, "utf8"))).length === 0);
  const log = logLines(paths);
  ok("reject logs note", log[0].action === "reject" && log[0].id === "q2" && log[0].note === "off-brand");
  rmSync(dir, { recursive: true, force: true });
}

// --- sendBack: removes from queue + logs note ---
{
  const { dir, paths } = fixture();
  sendBack(paths, "q3", "tighten the stem", TS);
  ok("sendBack removes from queue", !loadQueue(paths).items.some(i => i.question.id === "q3"));
  const log = logLines(paths);
  ok("sendBack logs note", log[0].action === "sendback" && log[0].note === "tighten the stem");
  rmSync(dir, { recursive: true, force: true });
}

// --- editItem: replaces the queued question, logs, stays in queue ---
{
  const { dir, paths } = fixture();
  const edited = { id: "q2", type: "mc", levels: ["U11 / Atom"], sit: "EDITED", opts: ["a", "b"], ok: 1 };
  editItem(paths, "q2", edited, TS);
  const item = loadQueue(paths).items.find(i => i.question.id === "q2");
  ok("edit keeps item in queue", !!item);
  ok("edit replaces question fields", item.question.sit === "EDITED" && item.question.ok === 1);
  const log = logLines(paths);
  ok("edit logs", log[0].action === "edit" && log[0].id === "q2");
  rmSync(dir, { recursive: true, force: true });
}

// --- enqueue: appends a new item, dedupes by question.id ---
{
  const { dir, paths } = fixture();
  const before = loadQueue(paths).items.length;
  const item = { question: { id: "gen1", type: "mc", levels: ["U11 / Atom"], sit: "?", opts: ["a","b"], ok: 0 },
    gateHistory: { coachPanel: "pass" }, proxyVerdict: { decision: "forward" }, queuedAt: "2026-06-04" };
  const r1 = enqueue(paths, item);
  ok("enqueue adds", r1.ok && r1.added === true && loadQueue(paths).items.length === before + 1);
  const r2 = enqueue(paths, item);
  ok("enqueue dedupes by id", r2.ok && r2.added === false && loadQueue(paths).items.length === before + 1);
  const r3 = enqueue(paths, { question: {} });
  ok("enqueue without id fails", r3.ok === false);
  rmSync(dir, { recursive: true, force: true });
}

// --- unknown id is a soft failure, not a throw ---
{
  const { dir, paths } = fixture();
  const r = reject(paths, "nope", "", TS);
  ok("unknown id returns ok:false (no throw)", r.ok === false);
  rmSync(dir, { recursive: true, force: true });
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
