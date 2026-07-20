# Mobile Scenario Review Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A phone-friendly `/review` screen that renders each visual scenario's board live, captures a Keep/Revise/Retire verdict + note, syncs to Supabase, and a `pull-reviews` script that turns those verdicts into a repo worklist.

**Architecture:** A lazy-loaded screen in the existing React SPA (custom hash/`screen`-state routing in `src/App.jsx`). Pure logic lives in a Vite-free `src/review/reviewCore.js` so it's unit-testable with plain `node` (the project has no component test runner; we follow its `test-rules.mjs` golden-test pattern and do **not** add a test dependency). Board rendering reuses the real `RinkStage`. Feedback writes to a new `scenario_reviews` Supabase table via functions in `src/supabase.js`, buffered through a `localStorage` queue for offline resilience. `scripts/pull-reviews.mjs` reads the table and emits a fix-list + markdown worklist.

**Tech Stack:** React 18 + Vite, inline styles via `C`/`FONT` tokens from `src/shared.jsx`, `@supabase/supabase-js` (already a dep), plain-`node` ESM scripts (`"type":"module"`).

**Spec:** `docs/superpowers/specs/2026-06-11-mobile-scenario-review-design.md`

---

## File Structure

| File | Responsibility |
|---|---|
| `supabase/migration_0013_scenario_reviews.sql` | New table + RLS (manual paste into Supabase SQL editor). |
| `src/review/reviewCore.js` | **Pure, Vite-free:** `hasBoard`, `selectAndOrder`, `boardHash`, `mergeQueue`, `groupReviews`. |
| `src/review/reviewData.js` | `loadReviewScenarios()` — wraps `qbLoader.loadQB()` + `selectAndOrder`. |
| `src/review/reviewQueue.js` | `localStorage` queue + Supabase flush + reviewed-id tracking. |
| `src/review/ReviewBoard.jsx` | Read-only live board (`RinkStage`) with the correct answer annotated; error boundary → raw JSON. |
| `src/review/ReviewScreen.jsx` | The triage deck: owner gate, progress, verdict buttons, note field. |
| `src/supabase.js` (modify) | Add `upsertScenarioReview`, `listMyReviews`. |
| `src/App.jsx` (modify) | Lazy import + `#review` hash mapping + `screen === "review"` render. |
| `scripts/test-review.mjs` | Node golden tests for `reviewCore`. |
| `scripts/pull-reviews.mjs` | Pull verdicts → `docs/ai-pipeline/_review-feedback.json` + `_review-worklist.md`. |
| `package.json` (modify) | Add `test:review` and `pull-reviews` scripts. |

---

## Task 1: Supabase migration `scenario_reviews`

**Files:**
- Create: `supabase/migration_0013_scenario_reviews.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- Migration 0013: scenario_reviews (mobile board-review triage)
-- See docs/superpowers/specs/2026-06-11-mobile-scenario-review-design.md
--
-- One upsertable row per (scenario_id, reviewer_email): a Keep/Revise/Retire
-- verdict + optional note from the /review deck. RLS: a signed-in reviewer can
-- only read/write their own rows.
--
-- Paste into Supabase Dashboard → SQL Editor → New query → Run.
-- Idempotent: safe to re-run.

create table if not exists public.scenario_reviews (
  id uuid primary key default gen_random_uuid(),
  scenario_id text not null,
  reviewer_email text not null,
  verdict text not null check (verdict in ('keep','revise','retire')),
  note text,
  board_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (scenario_id, reviewer_email)
);

create index if not exists scenario_reviews_scenario_idx on public.scenario_reviews(scenario_id);
create index if not exists scenario_reviews_reviewer_idx on public.scenario_reviews(reviewer_email);

-- Shared trigger fn (already created in migration_0012); redefine if absent.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists scenario_reviews_updated_at on public.scenario_reviews;
create trigger scenario_reviews_updated_at
  before update on public.scenario_reviews
  for each row execute function public.set_updated_at();

alter table public.scenario_reviews enable row level security;

drop policy if exists scenario_reviews_select_own on public.scenario_reviews;
create policy scenario_reviews_select_own on public.scenario_reviews
  for select using (reviewer_email = auth.jwt() ->> 'email');

drop policy if exists scenario_reviews_insert_own on public.scenario_reviews;
create policy scenario_reviews_insert_own on public.scenario_reviews
  for insert with check (reviewer_email = auth.jwt() ->> 'email');

drop policy if exists scenario_reviews_update_own on public.scenario_reviews;
create policy scenario_reviews_update_own on public.scenario_reviews
  for update using (reviewer_email = auth.jwt() ->> 'email')
  with check (reviewer_email = auth.jwt() ->> 'email');
```

- [ ] **Step 2: Apply it (manual)**

Open Supabase Dashboard → SQL Editor → paste the file → Run. Then verify in the SQL editor:

```sql
select count(*) from public.scenario_reviews;
```
Expected: returns `0` (table exists, empty).

- [ ] **Step 3: Commit**

```bash
git -C C:/Users/mtsli/IceIQ add supabase/migration_0013_scenario_reviews.sql
git -C C:/Users/mtsli/IceIQ commit supabase/migration_0013_scenario_reviews.sql -m "feat(review): scenario_reviews table + RLS

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: `reviewCore.js` (pure logic, TDD)

**Files:**
- Create: `src/review/reviewCore.js`
- Test: `scripts/test-review.mjs`
- Modify: `package.json` (add `test:review` script)

- [ ] **Step 1: Add the test script to package.json**

In the `"scripts"` block (next to the existing `"test:rules": "node scripts/test-rules.mjs"`), add:

```json
    "test:review": "node scripts/test-review.mjs",
```

- [ ] **Step 2: Write the failing tests**

Create `scripts/test-review.mjs`:

```javascript
// Golden tests for src/review/reviewCore.js (pure logic). Run: npm run test:review
import { hasBoard, selectAndOrder, boardHash, mergeQueue, groupReviews } from "../src/review/reviewCore.js";

let failed = 0;
const check = (name, cond) => { console.log(`${cond ? "PASS" : "FAIL"}  ${name}`); if (!cond) failed++; };

// hasBoard
check("hasBoard true for scenario w/ actors+stage", hasBoard({ type: "scenario", actors: [{ id: "a" }], stage: { view: "right" } }) === true);
check("hasBoard false for text mc", hasBoard({ type: "mc", opts: [] }) === false);
check("hasBoard false for empty actors", hasBoard({ type: "scenario", actors: [], stage: {} }) === false);

// boardHash
const s1 = { actors: [{ id: "a", x: 1, y: 2 }], stage: { view: "right", zone: "off-zone" }, interaction: { kind: "selection" }, correct: { ids: ["a"] } };
const s2 = { correct: { ids: ["a"] }, interaction: { kind: "selection" }, stage: { zone: "off-zone", view: "right" }, actors: [{ y: 2, x: 1, id: "a" }] };
check("boardHash stable across key order", boardHash(s1) === boardHash(s2));
check("boardHash changes when a coord changes", boardHash(s1) !== boardHash({ ...s1, actors: [{ id: "a", x: 9, y: 2 }] }));

// selectAndOrder
const qb = {
  "U9 / Novice": [{ id: "y", type: "scenario", actors: [{}], stage: {}, nodeId: "n2" }],
  "U13 / Peewee": [{ id: "x", type: "scenario", actors: [{}], stage: {}, nodeId: "n1" }, { id: "t", type: "mc" }],
};
const ordered = selectAndOrder(qb, new Set(["x"]));
check("selectAndOrder excludes non-board", ordered.every(q => q.id !== "t"));
check("selectAndOrder unreviewed-first", ordered[0].id === "y" && ordered.some(q => q.id === "x"));

// mergeQueue
const q1 = mergeQueue([{ scenario_id: "a", verdict: "keep" }], { scenario_id: "a", verdict: "retire" });
check("mergeQueue replaces same id (latest wins)", q1.length === 1 && q1[0].verdict === "retire");
check("mergeQueue appends new id", mergeQueue(q1, { scenario_id: "b", verdict: "keep" }).length === 2);

// groupReviews
const reviews = [
  { scenario_id: "a", verdict: "keep", board_hash: "h1", updated_at: "2026-06-11T00:00:00Z" },
  { scenario_id: "a", verdict: "retire", board_hash: "h1", updated_at: "2026-06-11T01:00:00Z" },
  { scenario_id: "b", verdict: "revise", note: "fix goalie", board_hash: "old", updated_at: "2026-06-11T00:00:00Z" },
];
const g = groupReviews(reviews, { b: "new" });
check("groupReviews latest verdict wins", g.retire.some(x => x.id === "a") && !g.keep.some(x => x.id === "a"));
check("groupReviews flags stale board", g.revise.find(x => x.id === "b")?.stale === true);
check("groupReviews carries note", g.revise.find(x => x.id === "b")?.note === "fix goalie");

console.log(`\n${failed ? failed + " FAILED" : "all passed"}`);
process.exit(failed ? 1 : 0);
```

- [ ] **Step 3: Run to verify it fails**

Run: `npm run test:review`
Expected: FAIL — `Cannot find module '../src/review/reviewCore.js'`.

- [ ] **Step 4: Implement `reviewCore.js`**

Create `src/review/reviewCore.js`:

```javascript
// Pure, Vite-free review logic. Imported by the React app AND by node scripts
// (scripts/test-review.mjs, scripts/pull-reviews.mjs), so it must not import
// anything that uses import.meta.glob or browser globals.

// A scenario has a reviewable board if it's a scenario with placed actors + a stage.
export function hasBoard(q) {
  return !!q && q.type === "scenario" && Array.isArray(q.actors) && q.actors.length > 0 && !!q.stage;
}

// Flatten a qb ({ [level]: question[] }) to board scenarios, deduped by id,
// ordered unreviewed-first then level then nodeId.
export function selectAndOrder(qb, reviewedIds = new Set()) {
  const seen = new Set();
  const all = [];
  for (const level of Object.keys(qb || {})) {
    for (const q of qb[level] || []) {
      if (!hasBoard(q) || seen.has(q.id)) continue;
      seen.add(q.id);
      all.push(q);
    }
  }
  all.sort((a, b) => {
    const ar = reviewedIds.has(a.id) ? 1 : 0, br = reviewedIds.has(b.id) ? 1 : 0;
    if (ar !== br) return ar - br;
    const al = a.levels?.[0] || a.level || "", bl = b.levels?.[0] || b.level || "";
    if (al !== bl) return al < bl ? -1 : 1;
    const an = a.nodeId || "", bn = b.nodeId || "";
    return an < bn ? -1 : an > bn ? 1 : 0;
  });
  return all;
}

// Deterministic stringify (sorted keys) so hashes don't depend on key order.
function stableStringify(v) {
  if (Array.isArray(v)) return "[" + v.map(stableStringify).join(",") + "]";
  if (v && typeof v === "object") {
    return "{" + Object.keys(v).sort().map(k => JSON.stringify(k) + ":" + stableStringify(v[k])).join(",") + "}";
  }
  return JSON.stringify(v);
}

// Stable 8-hex hash of the board-defining fields, to tie a review to a board version.
export function boardHash(scenario) {
  const subset = {
    actors: scenario?.actors ?? null,
    stage: scenario?.stage ?? null,
    interaction: scenario?.interaction ?? null,
    correct: scenario?.correct ?? null,
  };
  const str = stableStringify(subset);
  let h = 0x811c9dc5; // FNV-1a 32-bit
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return ("0000000" + h.toString(16)).slice(-8);
}

// Replace any queued entry for the same scenario (latest wins), else append.
export function mergeQueue(queue, entry) {
  const out = (queue || []).filter(e => e.scenario_id !== entry.scenario_id);
  out.push(entry);
  return out;
}

// Group reviews by verdict using the latest row per scenario; flag stale boards.
export function groupReviews(reviews, currentHashById = {}) {
  const latest = {};
  for (const r of reviews || []) {
    const prev = latest[r.scenario_id];
    if (!prev || (r.updated_at || "") > (prev.updated_at || "")) latest[r.scenario_id] = r;
  }
  const out = { keep: [], revise: [], retire: [] };
  for (const r of Object.values(latest)) {
    const cur = currentHashById[r.scenario_id];
    const stale = !!(r.board_hash && cur && r.board_hash !== cur);
    const item = { id: r.scenario_id, note: r.note || "", board_hash: r.board_hash || null, stale };
    if (out[r.verdict]) out[r.verdict].push(item);
  }
  return out;
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npm run test:review`
Expected: PASS — `all passed`, exit 0.

- [ ] **Step 6: Commit**

```bash
git -C C:/Users/mtsli/IceIQ add src/review/reviewCore.js scripts/test-review.mjs package.json
git -C C:/Users/mtsli/IceIQ commit src/review/reviewCore.js scripts/test-review.mjs package.json -m "feat(review): pure review-core logic + golden tests

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Supabase access functions

**Files:**
- Modify: `src/supabase.js` (append near the other exported data functions)

- [ ] **Step 1: Add the functions**

Append to `src/supabase.js` (these match the existing `getSession`/exported-async-fn style):

```javascript
// ── Scenario review (mobile /review deck) ───────────────────────────────
export async function upsertScenarioReview({ scenario_id, verdict, note, board_hash }) {
  if (!supabase) return { ok: false, offline: true };
  const session = await getSession();
  const email = session?.user?.email;
  if (!email) return { ok: false, error: "not signed in" };
  const { error } = await supabase.from("scenario_reviews").upsert(
    {
      scenario_id,
      reviewer_email: email,
      verdict,
      note: note || null,
      board_hash: board_hash || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "scenario_id,reviewer_email" },
  );
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function listMyReviews() {
  if (!supabase) return [];
  const session = await getSession();
  const email = session?.user?.email;
  if (!email) return [];
  const { data, error } = await supabase
    .from("scenario_reviews")
    .select("scenario_id,verdict,note,board_hash,updated_at")
    .eq("reviewer_email", email);
  return error ? [] : (data || []);
}
```

- [ ] **Step 2: Verify it imports cleanly**

Run: `node -e "import('./src/supabase.js').then(m => console.log(typeof m.upsertScenarioReview, typeof m.listMyReviews)).catch(e => { console.error(e.message); process.exit(1); })"`
Expected: prints `function function`. (Runs with no env → `supabase` is null, functions still defined.)

- [ ] **Step 3: Commit**

```bash
git -C C:/Users/mtsli/IceIQ add src/supabase.js
git -C C:/Users/mtsli/IceIQ commit src/supabase.js -m "feat(review): supabase upsertScenarioReview + listMyReviews

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: `reviewData.js` + `reviewQueue.js`

**Files:**
- Create: `src/review/reviewData.js`
- Create: `src/review/reviewQueue.js`

- [ ] **Step 1: Implement `reviewData.js`**

```javascript
import { loadQB } from "../qbLoader.js";
import { selectAndOrder } from "./reviewCore.js";

// All reviewable board scenarios, ordered unreviewed-first.
export async function loadReviewScenarios(reviewedIds = new Set()) {
  const qb = await loadQB();
  return selectAndOrder(qb, reviewedIds);
}
```

- [ ] **Step 2: Implement `reviewQueue.js`**

```javascript
import { mergeQueue } from "./reviewCore.js";
import { upsertScenarioReview, listMyReviews } from "../supabase.js";

const QUEUE_KEY = "rr_review_queue_v1";
const REVIEWED_KEY = "rr_reviewed_ids_v1";

function read(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; }
}
function write(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* quota / private mode */ } }

// Queue a verdict locally and mark the scenario reviewed (offline-safe).
export function enqueueReview(entry) {
  const e = { ...entry, updated_at: new Date().toISOString() };
  write(QUEUE_KEY, mergeQueue(read(QUEUE_KEY, []), e));
  const reviewed = new Set(read(REVIEWED_KEY, []));
  reviewed.add(e.scenario_id);
  write(REVIEWED_KEY, [...reviewed]);
}

export function getReviewedIds() { return new Set(read(REVIEWED_KEY, [])); }

// Try to push every queued verdict; keep the ones that fail. Returns pending count.
export async function flushQueue() {
  const queue = read(QUEUE_KEY, []);
  const remaining = [];
  for (const e of queue) {
    const res = await upsertScenarioReview(e);
    if (!res.ok) remaining.push(e);
  }
  write(QUEUE_KEY, remaining);
  return remaining.length;
}

// Pull this reviewer's server rows into the local reviewed set (cross-device).
export async function syncServerReviews() {
  const rows = await listMyReviews();
  if (!rows.length) return;
  const reviewed = new Set(read(REVIEWED_KEY, []));
  for (const r of rows) reviewed.add(r.scenario_id);
  write(REVIEWED_KEY, [...reviewed]);
}
```

- [ ] **Step 3: Verify both import cleanly (build check happens in Task 6)**

Run: `node --check src/review/reviewData.js && node --check src/review/reviewQueue.js`
Expected: no output, exit 0 (syntax valid). Note: these can't be *executed* in node (browser/Vite deps), only syntax-checked.

- [ ] **Step 4: Commit**

```bash
git -C C:/Users/mtsli/IceIQ add src/review/reviewData.js src/review/reviewQueue.js
git -C C:/Users/mtsli/IceIQ commit src/review/reviewData.js src/review/reviewQueue.js -m "feat(review): scenario loader + offline localStorage queue

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: `ReviewBoard.jsx` (read-only live board)

**Files:**
- Create: `src/review/ReviewBoard.jsx`

- [ ] **Step 1: Implement the component**

```jsx
import React from "react";
import RinkStage from "../scenario/RinkStage.jsx";
import { denorm } from "../scenario/schema.js";
import { resolveTarget } from "../scenario/zones.js";
import { C, FONT } from "../shared.jsx";

// Green ring / arrow / zone showing the declared correct answer, drawn over the board.
function CorrectOverlay({ scenario }) {
  const c = scenario.correct;
  if (!c) return null;
  const byId = Object.fromEntries((scenario.actors || []).map(a => [a.id, a]));
  if (c.kind === "selection") {
    return <>{(c.ids || []).map(id => {
      const a = byId[id]; if (!a) return null;
      const p = denorm(a);
      return <circle key={id} cx={p.x} cy={p.y} r="20" fill="none" stroke={C.green} strokeWidth="2.6" strokeDasharray="4 3" />;
    })}</>;
  }
  if (c.kind === "point") {
    let t; try { t = resolveTarget(c); } catch { return null; }
    const p = denorm(t);
    return <ellipse cx={p.x} cy={p.y} rx={t.tolerance * 600} ry={t.tolerance * 300} fill="rgba(34,197,94,.22)" stroke={C.green} strokeWidth="1.8" />;
  }
  if (c.kind === "path") {
    const from = byId[scenario.interaction?.from];
    let t; try { t = resolveTarget(c.end); } catch { return null; }
    if (!from) return null;
    const a = denorm(from), b = denorm(t);
    const mx = (a.x + b.x) / 2, my = Math.min(a.y, b.y) - 24;
    return <>
      <defs><marker id="rvwarrow" markerWidth="5" markerHeight="5" refX="2.4" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 Z" fill={C.gold} /></marker></defs>
      <path d={`M${a.x},${a.y} Q ${mx},${my} ${b.x},${b.y}`} fill="none" stroke={C.gold} strokeWidth="2.6" strokeDasharray="5 3" markerEnd="url(#rvwarrow)" vectorEffect="non-scaling-stroke" />
    </>;
  }
  return null;
}

// If the board throws while rendering, show the raw JSON so it's still triageable.
class BoardBoundary extends React.Component {
  constructor(p) { super(p); this.state = { err: false }; }
  static getDerivedStateFromError() { return { err: true }; }
  render() { return this.state.err ? this.props.fallback : this.props.children; }
}

export default function ReviewBoard({ scenario }) {
  const prompt = scenario.interaction?.prompt || scenario.mc?.stem || "";
  const fallback = <pre style={{ color: C.red, fontSize: ".7rem", overflow: "auto", background: C.bgCard, padding: ".5rem", borderRadius: 8 }}>{JSON.stringify(scenario, null, 2)}</pre>;
  return (
    <div>
      <BoardBoundary fallback={fallback}>
        <RinkStage stage={scenario.stage} actors={scenario.actors} levels={scenario.levels}>
          {() => <CorrectOverlay scenario={scenario} />}
        </RinkStage>
      </BoardBoundary>
      <div style={{ marginTop: ".5rem", fontFamily: FONT.body, color: C.white, fontSize: ".9rem" }}>{prompt}</div>
      {scenario.feedback?.right && <div style={{ marginTop: ".3rem", color: C.dim, fontSize: ".8rem" }}>✓ {scenario.feedback.right}</div>}
      {scenario.tip && <div style={{ marginTop: ".2rem", color: C.dimmer, fontSize: ".75rem" }}>tip: {scenario.tip}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Syntax check**

Run: `node --check src/review/ReviewBoard.jsx`
Expected: JSX won't pass `node --check` (it's not plain JS), so instead verify via the dev build in Task 6. Skip if it errors on JSX — that's expected.

> Note: `RinkStage` default export and `children`-as-function, plus `denorm` (from `schema.js`) and `resolveTarget` (from `zones.js`), are confirmed in the codebase. If an import path differs, fix it here.

- [ ] **Step 3: Commit**

```bash
git -C C:/Users/mtsli/IceIQ add src/review/ReviewBoard.jsx
git -C C:/Users/mtsli/IceIQ commit src/review/ReviewBoard.jsx -m "feat(review): read-only ReviewBoard with correct-answer overlay

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: `ReviewScreen.jsx` + router wiring + env

**Files:**
- Create: `src/review/ReviewScreen.jsx`
- Modify: `src/App.jsx` (lazy import + hash mapping + screen render)
- Modify: `.env.example` (document `VITE_REVIEW_OWNERS`)

- [ ] **Step 1: Implement `ReviewScreen.jsx`**

```jsx
import React, { useEffect, useState } from "react";
import ReviewBoard from "./ReviewBoard.jsx";
import { loadReviewScenarios } from "./reviewData.js";
import { boardHash } from "./reviewCore.js";
import { enqueueReview, flushQueue, getReviewedIds, syncServerReviews } from "./reviewQueue.js";
import { getSession } from "../supabase.js";
import { C, FONT } from "../shared.jsx";

const OWNERS = (import.meta.env.VITE_REVIEW_OWNERS || "")
  .split(",").map(s => s.trim().toLowerCase()).filter(Boolean);

function Centered({ children }) {
  return <div style={{ minHeight: "100vh", background: C.bg, color: C.white, fontFamily: FONT.body, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "1rem", gap: ".6rem" }}>{children}</div>;
}
const btn = { padding: ".5rem 1rem", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bgCard, color: C.white, cursor: "pointer" };
const btnGhost = { padding: ".3rem .6rem", borderRadius: 6, border: "none", background: "transparent", color: C.dim, fontSize: ".8rem", cursor: "pointer" };
const verdictBtn = { flex: 1, padding: ".9rem 0", borderRadius: 10, border: "1px solid", fontWeight: 700, fontFamily: FONT.body, cursor: "pointer", fontSize: ".95rem" };

export default function ReviewScreen({ onBack }) {
  const [status, setStatus] = useState("loading"); // loading | denied | empty | ready
  const [list, setList] = useState([]);
  const [i, setI] = useState(0);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      const session = await getSession();
      const email = session?.user?.email?.toLowerCase();
      if (!email || (OWNERS.length && !OWNERS.includes(email))) { if (alive) setStatus("denied"); return; }
      await syncServerReviews();
      const scenarios = await loadReviewScenarios(getReviewedIds());
      if (!alive) return;
      setList(scenarios);
      setStatus(scenarios.length ? "ready" : "empty");
    })();
    return () => { alive = false; };
  }, []);

  const current = list[i];
  async function verdict(v) {
    if (!current) return;
    enqueueReview({ scenario_id: current.id, verdict: v, note: note.trim(), board_hash: boardHash(current) });
    setNote("");
    setI(n => Math.min(n + 1, list.length));
    setPending(await flushQueue());
  }

  if (status === "loading") return <Centered>Loading review deck…</Centered>;
  if (status === "denied") return <Centered><div>Not authorized.</div><button onClick={onBack} style={btn}>Back</button></Centered>;
  if (status === "empty") return <Centered><div>No boards to review 🎉</div><button onClick={onBack} style={btn}>Back</button></Centered>;
  if (i >= list.length) return <Centered><div>Done. {pending ? `${pending} still syncing…` : "All synced."}</div><button onClick={onBack} style={btn}>Back</button></Centered>;

  const chips = [current.levels?.[0] || current.level || "", current.nodeId].filter(Boolean).join(" · ");
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.white, fontFamily: FONT.body, padding: "1rem", maxWidth: 480, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".5rem" }}>
        <button onClick={onBack} style={btnGhost}>← back</button>
        <span style={{ color: C.dim, fontSize: ".8rem" }}>{i + 1} / {list.length}{pending ? ` · ${pending} pending` : ""}</span>
        <button onClick={() => setI(n => Math.min(n + 1, list.length))} style={btnGhost}>skip ⏭</button>
      </div>
      <div style={{ color: C.gold, fontSize: ".75rem", marginBottom: ".4rem", letterSpacing: ".04em" }}>{chips}</div>
      <ReviewBoard scenario={current} />
      <input value={note} onChange={e => setNote(e.target.value)} placeholder="note (use your keyboard 🎤 to speak)…"
        style={{ width: "100%", margin: ".6rem 0", padding: ".6rem", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bgCard, color: C.white, fontFamily: FONT.body, boxSizing: "border-box" }} />
      <div style={{ display: "flex", gap: ".5rem" }}>
        <button onClick={() => verdict("keep")} style={{ ...verdictBtn, background: C.greenDim, borderColor: C.greenBorder, color: C.green }}>KEEP</button>
        <button onClick={() => verdict("revise")} style={{ ...verdictBtn, background: C.goldDim, borderColor: C.goldBorder, color: C.gold }}>REVISE</button>
        <button onClick={() => verdict("retire")} style={{ ...verdictBtn, background: C.redDim, borderColor: C.redBorder, color: C.red }}>RETIRE</button>
      </div>
      {i > 0 && <button onClick={() => setI(n => Math.max(0, n - 1))} style={{ ...btnGhost, marginTop: ".6rem" }}>← previous</button>}
    </div>
  );
}
```

- [ ] **Step 2: Wire the route in `src/App.jsx`**

(a) Near the other `lazy(...)` imports (the block that defines `AdminReports`, `QuestionReviewScreen`, around line 428), add:

```javascript
const ReviewScreen = lazy(() => import("./review/ReviewScreen.jsx"));
```

(b) In the `hashRoute` `useEffect` that maps hashes to screens (the block with `if (hashRoute === "parents" ...)`), add a line:

```javascript
    if (hashRoute === "review" && screen !== "review") setScreen("review");
```

(c) In the screen-render block (near `{screen === "profile" && <Profile ... />}`), add:

```jsx
      {screen === "review" && (
        <Suspense fallback={<LazyFallback />}>
          <ReviewScreen onBack={() => setScreen("home")} />
        </Suspense>
      )}
```

> `Suspense`, `lazy`, and `LazyFallback` are already imported/defined in `App.jsx` (confirmed). If `Suspense` isn't in the React import, add it.

- [ ] **Step 3: Document the env var**

Append to `.env.example`:

```
# Comma-separated owner emails allowed to open the /review deck
VITE_REVIEW_OWNERS=you@example.com
```

- [ ] **Step 4: Manual verification (build + device)**

Run: `npm run build`
Expected: build succeeds, no missing-import errors.

Then run `npm run dev`, and in a browser:
1. Set `VITE_REVIEW_OWNERS` in `.env` to your signed-in email; sign in.
2. Visit `http://localhost:5173/#review`.
3. Expected: the deck loads, shows a board with the correct answer ringed in green, a note field, and KEEP/REVISE/RETIRE. Tapping a verdict advances to the next board and the counter increments.
4. With a wrong/empty `VITE_REVIEW_OWNERS`, expected: "Not authorized."
5. (Use the `/verify` skill or your phone on the same network for the mobile check.)

- [ ] **Step 5: Commit**

```bash
git -C C:/Users/mtsli/IceIQ add src/review/ReviewScreen.jsx src/App.jsx .env.example
git -C C:/Users/mtsli/IceIQ commit src/review/ReviewScreen.jsx src/App.jsx .env.example -m "feat(review): mobile triage deck + #review route + owner gate

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: `pull-reviews.mjs` (phone → repo)

**Files:**
- Create: `scripts/pull-reviews.mjs`
- Modify: `package.json` (add `pull-reviews` script)

- [ ] **Step 1: Add the script entry to package.json**

In `"scripts"`, add:

```json
    "pull-reviews": "node scripts/pull-reviews.mjs",
```

- [ ] **Step 2: Implement `scripts/pull-reviews.mjs`**

```javascript
// Pull scenario_reviews from Supabase → a repo fix-list + markdown worklist.
// Run: npm run pull-reviews   (needs VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env)
import { readFileSync, writeFileSync, readdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { boardHash, groupReviews } from "../src/review/reviewCore.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function loadEnv() {
  const env = {};
  try {
    for (const line of readFileSync(join(ROOT, ".env"), "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
      if (m) env[m[1]] = m[2];
    }
  } catch { /* no .env */ }
  return env;
}
const env = { ...loadEnv(), ...process.env };
const url = env.VITE_SUPABASE_URL, serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) { console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env"); process.exit(1); }
const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

// Current board hash for every scenario (seeds + any type:"scenario" in bank.json).
function currentHashes() {
  const byId = {};
  const seedDir = join(ROOT, "src/scenario/seeds");
  for (const f of readdirSync(seedDir).filter(f => f.endsWith(".json"))) {
    try { const s = JSON.parse(readFileSync(join(seedDir, f), "utf8")); if (s?.id) byId[s.id] = boardHash(s); } catch { /* skip */ }
  }
  try {
    const bank = JSON.parse(readFileSync(join(ROOT, "src/data/bank.json"), "utf8"));
    for (const level of Object.keys(bank)) for (const q of bank[level] || []) {
      if (q?.id && q.type === "scenario") byId[q.id] = boardHash(q);
    }
  } catch { /* skip */ }
  return byId;
}

const { data, error } = await sb.from("scenario_reviews").select("scenario_id,verdict,note,board_hash,updated_at");
if (error) { console.error(error.message); process.exit(1); }

const grouped = groupReviews(data || [], currentHashes());
writeFileSync(join(ROOT, "docs/ai-pipeline/_review-feedback.json"), JSON.stringify(grouped, null, 2));

const lines = ["# Review worklist", "", `_Pulled ${(data || []).length} reviews._`, ""];
for (const [head, items] of [["Retire", grouped.retire], ["Revise", grouped.revise], ["Keep", grouped.keep]]) {
  lines.push(`## ${head} (${items.length})`, "");
  for (const it of items) lines.push(`- [ ] \`${it.id}\`${it.stale ? " ⚠️ board changed since review" : ""}${it.note ? ` — ${it.note}` : ""}`);
  lines.push("");
}
writeFileSync(join(ROOT, "docs/ai-pipeline/_review-worklist.md"), lines.join("\n"));

console.log(`pulled ${(data || []).length} reviews → keep ${grouped.keep.length}, revise ${grouped.revise.length}, retire ${grouped.retire.length}`);
console.log("wrote docs/ai-pipeline/_review-feedback.json and _review-worklist.md");
```

- [ ] **Step 3: Verify it runs (with env set)**

Run: `npm run pull-reviews`
Expected (after Task 6 manual smoke created at least one review): prints a `pulled N reviews → …` summary and writes the two files. With no `.env`, expected: clean error `Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env` and exit 1.

- [ ] **Step 4: Verify the worklist content**

Open `docs/ai-pipeline/_review-worklist.md`. Expected: Retire/Revise/Keep sections; any board you triaged appears under its verdict with its note; a board you edited after reviewing shows `⚠️ board changed since review`.

- [ ] **Step 5: Commit**

```bash
git -C C:/Users/mtsli/IceIQ add scripts/pull-reviews.mjs package.json
git -C C:/Users/mtsli/IceIQ commit scripts/pull-reviews.mjs package.json -m "feat(review): pull-reviews script → fix-list + worklist

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: End-to-end smoke + ignore generated artifacts

**Files:**
- Modify: `.gitignore` (ignore the generated pull outputs)

- [ ] **Step 1: Ignore generated outputs**

Append to `.gitignore`:

```
# Generated by npm run pull-reviews
docs/ai-pipeline/_review-feedback.json
docs/ai-pipeline/_review-worklist.md
```

- [ ] **Step 2: Full loop smoke**

1. `npm run test:review` → `all passed`.
2. `npm run build` → succeeds.
3. `npm run dev`, sign in as an owner, open `#review`, triage 3 boards (one KEEP, one REVISE with a note, one RETIRE).
4. `npm run pull-reviews` → summary shows `keep 1, revise 1, retire 1`; worklist matches.
5. Edit one reviewed scenario's `actors` in its seed JSON, re-run `npm run pull-reviews` → that board now shows `⚠️ board changed since review`.

- [ ] **Step 3: Commit**

```bash
git -C C:/Users/mtsli/IceIQ add .gitignore
git -C C:/Users/mtsli/IceIQ commit .gitignore -m "chore(review): ignore generated review artifacts

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Notes for the implementer

- **No new dependencies.** All tests are plain-`node` golden scripts (the project's convention). Do not add vitest/jest without asking the owner.
- **Commit style:** the repo has background automation that can bundle staged files; always commit with an explicit pathspec (`git commit <files> -m`) as shown, never `git add -A`.
- **Supabase env:** the client needs `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (already used by the app); `pull-reviews` additionally needs `SUPABASE_SERVICE_ROLE_KEY` (server-side only, never shipped to the client).
- **The improvement loop:** acting on a `revise`/`retire` means editing the scenario JSON; the golden-test validators (`npm run test:rules`) gate that edit, and the live board reflects it immediately on the next review pass.
