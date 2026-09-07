#!/usr/bin/env node
// Run: node tools/daily-tracker/rinkreads-tasks-ops.test.mjs
import { removeItem, addItem, moveItem, NOW_SOFT_LIMIT, nowWarning } from "./rinkreads-tasks-ops.mjs";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

const base = {
  headerRaw: "# Title",
  now: ["A", "B"],
  next: ["C", "D"],
  later: ["E"],
  parking: [],
  changelog: ["done one"],
  crlf: false,
};

// removeItem
const afterRemove = removeItem(base, "now", 0);
ok("removeItem drops the item at the index", afterRemove.now.length === 1 && afterRemove.now[0] === "B");
ok("removeItem does not mutate the input", base.now.length === 2);
ok("removeItem rejects changelog (read-only)", (() => { try { removeItem(base, "changelog", 0); return false; } catch { return true; } })());

// addItem
const afterAdd = addItem(base, "later", "  F  ");
ok("addItem appends to the end", afterAdd.later.length === 2 && afterAdd.later[1] === "F");
ok("addItem trims whitespace", afterAdd.later[1] === "F");
ok("addItem does not mutate the input", base.later.length === 1);
ok("addItem rejects an empty/whitespace-only item", (() => { try { addItem(base, "later", "   "); return false; } catch { return true; } })());
ok("addItem rejects changelog (read-only)", (() => { try { addItem(base, "changelog", "x"); return false; } catch { return true; } })());

// moveItem
const afterMove = moveItem(base, "now", 1, "parking");
ok("moveItem removes from the source section", afterMove.now.length === 1 && afterMove.now[0] === "A");
ok("moveItem adds to the target section", afterMove.parking.length === 1 && afterMove.parking[0] === "B");
ok("moveItem does not mutate the input", base.now.length === 2 && base.parking.length === 0);
ok("moveItem on an out-of-range index throws", (() => { try { moveItem(base, "now", 9, "later"); return false; } catch { return true; } })());

// nowWarning
ok("NOW_SOFT_LIMIT is 3", NOW_SOFT_LIMIT === 3);
ok("nowWarning is null at/under the limit", nowWarning({ ...base, now: ["1", "2", "3"] }) === null);
ok("nowWarning fires over the limit", typeof nowWarning({ ...base, now: ["1", "2", "3", "4"] }) === "string");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
