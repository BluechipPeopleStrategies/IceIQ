#!/usr/bin/env node
// Run: node tools/gauntlet/pool.test.mjs
import { runPool } from "./pool.mjs";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };
const tick = (ms) => new Promise((r) => setTimeout(r, ms));

await (async () => {
  // processes every item, results in input order
  const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  let live = 0, maxLive = 0;
  const results = await runPool(items, 3, async (x) => {
    live++; maxLive = Math.max(maxLive, live);
    await tick(10);
    live--;
    return x * 2;
  });
  ok("all items processed", results.length === 10);
  ok("results in input order", JSON.stringify(results) === JSON.stringify(items.map((x) => x * 2)));
  ok("never exceeds the concurrency cap", maxLive <= 3);
  ok("actually ran concurrently (cap reached)", maxLive === 3);

  // limit larger than item count is fine
  const r2 = await runPool([1, 2], 10, async (x) => x + 1);
  ok("limit > items works", JSON.stringify(r2) === JSON.stringify([2, 3]));

  // empty list
  const r3 = await runPool([], 4, async () => 1);
  ok("empty list returns []", Array.isArray(r3) && r3.length === 0);

  // a throwing worker rejects the pool (so callers can try/catch) — but here we
  // confirm a worker that returns a value for every item doesn't lose any
  let count = 0;
  await runPool([1, 1, 1, 1, 1], 2, async () => { count++; await tick(1); });
  ok("worker called once per item", count === 5);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
