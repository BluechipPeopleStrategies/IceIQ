# Parallel Question Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the gauntlet generate questions concurrently — coaches within a debate round fire in parallel, and N nodes run through their pipelines at once via a `--concurrency` pool — turning a ~30-min batch into a few minutes.

**Architecture:** Two levels of parallelism in `tools/gauntlet-run.mjs`: (1) `Promise.all` the independent coach reviews inside each debate round of `runPanel`/`runScenarioPanel`; (2) a concurrency-limited worker pool (`runPool`) in `main` that runs generation for multiple work-items at once. No file lock is needed: every queue/lesson/log write goes through *synchronous* fs (`readFileSync`/`writeFileSync`/`appendFileSync`), and Node's single thread runs a synchronous function to completion without interleaving, so concurrent workers' writes are atomic w.r.t. the event loop. Pure tooling — no app changes.

**Tech Stack:** Node ESM, plain JS. Tests = `.mjs` assert scripts + `process.exit(1)` (repo convention).

**Spec basis:** the user-approved design in conversation (parallelize generation; coach-level + node-level; concurrency default 4).

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `tools/gauntlet/pool.mjs` | Pure `runPool(items, limit, worker)` concurrency-limited map | Create |
| `tools/gauntlet/pool.test.mjs` | Unit tests (cap respected, all processed, ordered results) | Create |
| `tools/gauntlet-run.mjs` | `Promise.all` coach reviews per round; `--concurrency` flag; `main` uses `runPool`; per-worker line logging | Modify |

Reuse unchanged: `runAgent`, `enqueue`, `seenHashes`, `loadCounts`, `selectTargets`, `generateOne`, `generateVisualOne`, `PANEL_LENSES`.

---

## Task 1: Concurrency pool

**Files:** Create `tools/gauntlet/pool.mjs`, `tools/gauntlet/pool.test.mjs`

- [ ] **Step 1: Write the failing test** — create `tools/gauntlet/pool.test.mjs`:

```js
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
```

- [ ] **Step 2: Run it, verify it fails** — `node tools/gauntlet/pool.test.mjs` → FAIL (module not found).

- [ ] **Step 3: Implement** — create `tools/gauntlet/pool.mjs`:

```js
// Run an async worker over items with a bounded number in flight at once.
// Results are returned in input order. Pure — no shared mutable state beyond
// the local cursor. (Used to parallelize gauntlet generation across nodes.)
export async function runPool(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  const cap = Math.max(1, Math.min(limit, items.length));
  async function lane() {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: cap }, lane));
  return results;
}
```

- [ ] **Step 4: Run, verify pass** — `node tools/gauntlet/pool.test.mjs` → `0 failed`.

- [ ] **Step 5: Commit**

```bash
git add tools/gauntlet/pool.mjs tools/gauntlet/pool.test.mjs
git commit -m "feat(gauntlet): concurrency-limited runPool + tests"
```

---

## Task 2: Coaches review in parallel within a round

**Files:** Modify `tools/gauntlet-run.mjs`

Both panel runners currently build `reviews` with a sequential `for (const lens of …) { … reviews.push(…) }`. Replace each with a `Promise.all` over the lenses (the reviews within one round are independent). Behaviour is identical; only the awaits run concurrently.

- [ ] **Step 1: Replace the text `runPanel` round body.** Find this block in `runPanel`:

```js
    reviews = [];
    for (const lens of PANEL_LENSES) {
      if (opts.mock) {
        // The first lens fails forever under --mock-fail to exercise drop+learn.
        const verdict = (opts.mockFail && lens.key === PANEL_LENSES[0].key) ? "REVISE" : "PASS";
        reviews.push({ key: lens.key, verdict, critique: verdict === "REVISE" ? ["[mock] not perfect"] : [] });
      } else {
        const peers = others ? others.filter((o) => o.key !== lens.key) : null;
        let r;
        try { r = await runAgent({ ...buildPanelCoachPrompt({ question: q, node, concept, lens, others: peers }), model: opts.model }); }
        catch (e) { r = { verdict: "REVISE", critique: [`${lens.key} error: ${e.message}`] }; }
        reviews.push({ key: lens.key, verdict: r.verdict, critique: r.critique || [] });
      }
    }
```

Replace it with:

```js
    reviews = await Promise.all(PANEL_LENSES.map(async (lens) => {
      if (opts.mock) {
        // The first lens fails forever under --mock-fail to exercise drop+learn.
        const verdict = (opts.mockFail && lens.key === PANEL_LENSES[0].key) ? "REVISE" : "PASS";
        return { key: lens.key, verdict, critique: verdict === "REVISE" ? ["[mock] not perfect"] : [] };
      }
      const peers = others ? others.filter((o) => o.key !== lens.key) : null;
      let r;
      try { r = await runAgent({ ...buildPanelCoachPrompt({ question: q, node, concept, lens, others: peers }), model: opts.model }); }
      catch (e) { r = { verdict: "REVISE", critique: [`${lens.key} error: ${e.message}`] }; }
      return { key: lens.key, verdict: r.verdict, critique: r.critique || [] };
    }));
```

- [ ] **Step 2: Replace the `runScenarioPanel` round body.** Find this block in `runScenarioPanel`:

```js
    reviews = [];
    for (const lens of lenses) {
      if (opts.mock) {
        const verdict = (opts.mockFail && lens.key === lenses[0].key) ? "REVISE" : "PASS";
        reviews.push({ key: lens.key, verdict, critique: verdict === "REVISE" ? ["[mock] not perfect"] : [] });
      } else {
        const peers = others ? others.filter((o) => o.key !== lens.key) : null;
        let r;
        try { r = await runAgent({ ...makePrompt({ scenario, ascii, node, concept, lens, others: peers }), model: opts.model }); }
        catch (e) { r = { verdict: "REVISE", critique: [`${lens.key} error: ${e.message}`] }; }
        reviews.push({ key: lens.key, verdict: r.verdict, critique: r.critique || [] });
      }
    }
```

Replace it with:

```js
    reviews = await Promise.all(lenses.map(async (lens) => {
      if (opts.mock) {
        const verdict = (opts.mockFail && lens.key === lenses[0].key) ? "REVISE" : "PASS";
        return { key: lens.key, verdict, critique: verdict === "REVISE" ? ["[mock] not perfect"] : [] };
      }
      const peers = others ? others.filter((o) => o.key !== lens.key) : null;
      let r;
      try { r = await runAgent({ ...makePrompt({ scenario, ascii, node, concept, lens, others: peers }), model: opts.model }); }
      catch (e) { r = { verdict: "REVISE", critique: [`${lens.key} error: ${e.message}`] }; }
      return { key: lens.key, verdict: r.verdict, critique: r.critique || [] };
    }));
```

- [ ] **Step 3: Verify mock behaviour unchanged.**

Run: `node tools/gauntlet-run.mjs --node u11.decision-making --mock` → queues; check `node -e "const q=require('./src/data/review-queue.json');const v=q.items.find(i=>i.question.id.startsWith('gen_u11'));console.log(v.gateHistory.panel,v.gateHistory.headCoach)"` → `unanimous approve`.
Run: `node tools/gauntlet-run.mjs --node u15.scanning --mock --mock-fail` → `dropped (...) — learned: ...`.
Run: `node tools/gauntlet-run.mjs --node u11.decision-making --visual --mock` → queues; gateHistory `unanimous unanimous approve`.
Then restore: `git checkout -- src/data/review-queue.json src/data/review-log.jsonl tools/gauntlet/lessons.json tools/gauntlet/visual-lessons.json`.

- [ ] **Step 4: Build + commit.**

```bash
npm run build   # still green (no app change, but confirms no syntax break in the bundle's dep graph is irrelevant — just run node syntax check)
node --check tools/gauntlet-run.mjs && echo "syntax ok"
git add tools/gauntlet-run.mjs
git commit -m "perf(gauntlet): run each debate round's coaches concurrently (Promise.all)"
```

---

## Task 3: Node-level concurrency pool in `main`

**Files:** Modify `tools/gauntlet-run.mjs`

- [ ] **Step 1: Import + flag.** Add the import near the other gauntlet imports:

```js
import { runPool } from "./gauntlet/pool.mjs";
```

In `parseArgs`, add `concurrency: 4,` to the defaults object and this branch in the loop:

```js
    else if (t === "--concurrency") a.concurrency = parseInt(argv[++i], 10);
```

And clamp it next to the other clamps (`a.rounds = …`, `a.debateRounds = …`):

```js
  a.concurrency = Math.max(1, Number.isFinite(a.concurrency) ? a.concurrency : 4);
```

- [ ] **Step 2: Replace the generation loop in `main`.** Find this block (the nested `for` loops):

```js
  const seen = seenHashes();
  let enq = 0, skipped = 0;
  for (const node of targets) {
    for (let i = 0; i < opts.count; i++) {
      process.stdout.write(`• ${node.id} (${i + 1}/${opts.count}) … `);
      const r = opts.visual
        ? await generateVisualOne(ledger, node, opts, seen)
        : await generateOne(ledger, node, opts, seen);
      if (!r.ok) { console.log(`dropped (${r.reason})${r.learned?.length ? ` — learned: ${r.learned.join(" | ")}` : ""}`); skipped++; continue; }
      seen.add(r.hash);
      if (opts.dryRun) { console.log("ok (dry-run, not queued)"); continue; }
      const e = enqueue(paths, r.item);
      console.log(e.added ? `queued ${r.item.question.id}` : "dup (already queued)");
      if (e.added) enq++;
    }
  }
  console.log(`\nDone. queued ${enq}, skipped ${skipped}. Review at #review (npm run dev).`);
```

Replace it with:

```js
  const seen = seenHashes();
  // Flatten to one work item per attempt, then run through a concurrency pool.
  const work = [];
  for (const node of targets) for (let i = 0; i < opts.count; i++) work.push(node);
  let enq = 0, skipped = 0;
  console.log(`Generating ${work.length} question(s) across ${targets.length} node(s), concurrency ${opts.concurrency}${opts.visual ? " [visual]" : ""}…\n`);
  await runPool(work, opts.concurrency, async (node) => {
    const r = opts.visual
      ? await generateVisualOne(ledger, node, opts, seen)
      : await generateOne(ledger, node, opts, seen);
    // All side-effects below are synchronous → atomic w.r.t. the event loop, so
    // concurrent workers cannot corrupt the queue/lesson/log files (no lock needed).
    if (!r.ok) { console.log(`dropped  ${node.id}  (${r.reason})${r.learned?.length ? ` — learned: ${r.learned.join(" | ")}` : ""}`); skipped++; return; }
    seen.add(r.hash);
    if (opts.dryRun) { console.log(`ok (dry-run)  ${node.id}`); return; }
    const e = enqueue(paths, r.item);
    console.log(e.added ? `queued   ${r.item.question.id}` : `dup      ${r.item.question.id}`);
    if (e.added) enq++;
  });
  console.log(`\nDone. queued ${enq}, skipped ${skipped} (concurrency ${opts.concurrency}). Review at #review (npm run dev).`);
```

- [ ] **Step 3: Verify mock at concurrency.**

Run: `node tools/gauntlet-run.mjs --fill-gaps --max 4 --concurrency 4 --mock`
Expected: header line shows `concurrency 4`; up to 4 lines like `queued gen_…` / `dropped …`; final `Done. queued N, skipped M (concurrency 4).`. Then check the queue grew: `node -e "console.log(require('./src/data/review-queue.json').items.filter(i=>i.question.id.startsWith('gen_')).length,'generated')"`.
Run a visual concurrency mock too: `node tools/gauntlet-run.mjs --fill-gaps --max 3 --concurrency 3 --visual --mock`.
Then restore: `git checkout -- src/data/review-queue.json src/data/review-log.jsonl tools/gauntlet/lessons.json tools/gauntlet/visual-lessons.json`.

- [ ] **Step 4: Commit.**

```bash
node --check tools/gauntlet-run.mjs && echo "syntax ok"
git add tools/gauntlet-run.mjs
git commit -m "perf(gauntlet): --concurrency pool runs N nodes' pipelines at once"
```

---

## Task 4: Verify end-to-end + measure speedup

**Files:** none

- [ ] **Step 1: Unit + build green** — run each, expect `0 failed`:
```bash
node tools/gauntlet/pool.test.mjs
node tools/gauntlet/validate-mc.test.mjs
node tools/gauntlet/select-targets.test.mjs
node tools/gauntlet/lessons.test.mjs
node tools/gauntlet/prompts.test.mjs
node tools/gauntlet/visual-prompts.test.mjs
node tools/gauntlet/visual-scenario.test.mjs
node tools/gauntlet/ascii-rink.test.mjs
node tools/review-store.test.mjs
```
Then `npm run test:ledger` → VALID; `npm run build` → succeeds.

- [ ] **Step 2: Real parallel smoke (measure speedup).** Run a small real batch with concurrency and time it:
```bash
node tools/gauntlet-run.mjs --fill-gaps --max 3 --concurrency 3 --debate-rounds 1 --rounds 2
```
Expected: the 3 nodes run concurrently (interleaved completion lines), finishing roughly in the time of ~1 node rather than 3× sequential. Note wall-clock vs the earlier ~10–15 min sequential run for the same `--max 3`. Whatever clears lands in the queue; drops bank lessons as before.

- [ ] **Step 3: Restore generated/transient data (keep only intended content).** If the smoke produced questions you want to keep for review, leave `review-queue.json`; otherwise:
```bash
git checkout -- src/data/review-queue.json src/data/review-log.jsonl
```
(Leave `tools/gauntlet/lessons.json` as-is if real lessons were learned and should persist; commit it separately if so.)

---

## Self-Review

- **Spec coverage:** coach-level parallelism (Task 2, `Promise.all` in both panel runners) ✓; node-level concurrency pool (Task 1 `runPool` + Task 3 `main`) ✓; `--concurrency` flag with default 4 + clamp (Task 3) ✓; both text and visual tracks benefit (the pool wraps `generateOne`/`generateVisualOne`; the panel change hits both runners) ✓; no file lock, justified by synchronous-write atomicity (Task 3 comment + plan architecture) ✓.
- **Placeholder scan:** none — full code/commands; the `npm run build` note in Task 2 Step 4 is paired with `node --check` as the real syntax gate (the bundle doesn't include `tools/`).
- **Type/name consistency:** `runPool(items, limit, worker)` signature identical in Task 1 def, its test, and the Task 3 call; `--concurrency`/`opts.concurrency` consistent; the `reviews` shape (`{key, verdict, critique}`) unchanged by the Promise.all refactor; `enq`/`skipped` still incremented in the worker (safe — synchronous).
- **Concurrency correctness:** workers only mutate `seen` (a Set) and `enq`/`skipped` (numbers) and call `enqueue`/`addLesson`/`appendFileSync` — all synchronous, so atomic between `await` points; the only cross-worker imprecision is best-effort dedupe (a parallel pair on the *same* node with `--count>1` could both pass the `seen` check before either enqueues), which is acceptable and already the case for the structural-hash dedupe. Noted, not fixed.
