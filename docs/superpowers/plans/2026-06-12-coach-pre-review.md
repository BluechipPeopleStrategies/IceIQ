# Coach Pre-Review + Resolve/Pass-Log Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run the gauntlet's judgment coaches over existing boards into a `coach_reviews` table, surface their verdict+notes in the `/#triage` deck (pre-selected, with a flagged-only toggle), and add a resolve loop that wipes a board's open feedback while appending it to a permanent, iteration-aware `feedback_log` keyed by question type.

**Architecture:** Two Supabase tables (`coach_reviews`, `feedback_log`) + reuse of the existing gauntlet audit (`tools/gauntlet-audit.mjs` → `auditScenario` via the `claude` CLI) with a new `--sink supabase` flag. Pure logic lives in a Vite-free `tools/lib/coach-core.mjs` (node-testable); Supabase I/O is isolated in `tools/lib/coach-sink.mjs` and two new `scripts/*.mjs`. The React deck gains coach + prior-feedback panels.

**Tech Stack:** Node ESM scripts (plain `node`), `@supabase/supabase-js` (already a dep), the `claude` CLI wrapper (`tools/lib/claude-agent.mjs`), React + Vite deck, golden tests via plain `node` (no new test dep).

**Spec:** `docs/superpowers/specs/2026-06-12-coach-pre-review-design.md`

---

## File Structure

| File | Responsibility |
|---|---|
| `supabase/migration_0014_coach_reviews.sql` | coach verdicts table (manual paste). |
| `supabase/migration_0015_feedback_log.sql` | append-only incorporated-feedback log (manual paste). |
| `tools/lib/coach-core.mjs` | **Pure:** `coachRow`, `buildLogRows`, `groupByNode`. Node-testable. |
| `tools/lib/coach-sink.mjs` | Supabase service-role client + `coach_reviews` upsert. |
| `tools/gauntlet-audit.mjs` (modify) | add `--sink supabase`: upsert each board's coach verdict. |
| `scripts/test-coach.mjs` | node golden tests for `coach-core`. |
| `scripts/resolve-feedback.mjs` | wipe open rows + append `feedback_log` (service role). |
| `scripts/render-pass-log.mjs` | `feedback_log` → `docs/factory/feedback-pass-log.md` + fold into `visual-lessons.json`. |
| `src/supabase.js` (modify) | add `listCoachReviews`, `listFeedbackLog`. |
| `src/review/ReviewScreen.jsx` (modify) | coach panel, pre-select, flagged-only toggle, prior-feedback panel. |
| `package.json` (modify) | `coach-review`, `resolve-feedback`, `render-pass-log`, `test:coach` scripts. |

Phase A = Tasks 1–6 (coaches → deck). Phase B = Tasks 7–11 (resolve + pass log). Phase A is independently shippable.

---

## Task 1: `coach_reviews` migration

**Files:** Create `supabase/migration_0014_coach_reviews.sql`

- [ ] **Step 1: Write the migration**
```sql
-- Migration 0014: coach_reviews (LLM coach pre-review of boards)
-- See docs/superpowers/specs/2026-06-12-coach-pre-review-design.md
-- One upsertable row per scenario_id: the gauntlet coaches' verdict + notes,
-- written by `tools/gauntlet-audit.mjs --sink supabase` (service role).
-- Owner-readable so the /#triage deck can show it.
-- Paste into Supabase Dashboard → SQL Editor → New query → Run. Idempotent.

create table if not exists public.coach_reviews (
  scenario_id text primary key,
  verdict text not null check (verdict in ('keep','revise','retire')),
  confidence real,
  notes text,
  convened boolean not null default false,
  board_hash text,
  model text,
  reviewed_at timestamptz not null default now()
);

alter table public.coach_reviews enable row level security;

drop policy if exists coach_reviews_read on public.coach_reviews;
create policy coach_reviews_read on public.coach_reviews for select using (true);
-- No insert/update/delete policy: writes happen via the service-role key, which bypasses RLS.
```

- [ ] **Step 2: Apply it (manual)** — paste into Supabase SQL Editor → Run. Verify:
```sql
select count(*) from public.coach_reviews;
```
Expected: `0`.

- [ ] **Step 3: Commit**
```bash
git -C C:/Users/mtsli/IceIQ add supabase/migration_0014_coach_reviews.sql
git -C C:/Users/mtsli/IceIQ commit supabase/migration_0014_coach_reviews.sql -m "feat(coach): coach_reviews table" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: `coach-core.mjs` pure logic (TDD)

**Files:** Create `tools/lib/coach-core.mjs`, `scripts/test-coach.mjs`; modify `package.json`.

- [ ] **Step 1: Add the test script to package.json** — in `"scripts"`, after `"test:review": ...`, add:
```json
    "test:coach": "node scripts/test-coach.mjs",
```

- [ ] **Step 2: Write the failing test** — create `scripts/test-coach.mjs`:
```javascript
// Golden tests for tools/lib/coach-core.mjs. Run: npm run test:coach
import { coachRow, buildLogRows, groupByNode } from "../tools/lib/coach-core.mjs";

let failed = 0;
const check = (name, cond) => { console.log(`${cond ? "PASS" : "FAIL"}  ${name}`); if (!cond) failed++; };

// coachRow
const seed = { id: "x1", actors: [{ id: "a", x: 1, y: 2 }], stage: { view: "right" }, interaction: { kind: "selection" }, correct: { ids: ["a"] } };
const row = coachRow({ seed, result: { verdict: "REVISE", confidence: 0.8, notes: ["only one option", "D off-rink"], convened: true }, model: "sonnet" });
check("coachRow lowercases verdict", row.verdict === "revise");
check("coachRow joins notes", row.notes === "only one option · D off-rink");
check("coachRow carries convened + model", row.convened === true && row.model === "sonnet");
check("coachRow sets a board_hash", typeof row.board_hash === "string" && row.board_hash.length === 8);
check("coachRow has no reviewed_at (DB default)", !("reviewed_at" in row));

// buildLogRows
const rows = buildLogRows({
  scenario_id: "x1", node: "u13.gap-control", change: "added a 2nd read", priorMaxIteration: 1,
  ownerReview: { verdict: "revise", note: "only one option" },
  coachReview: { notes: "antagonistic: only one viable option" },
});
check("buildLogRows iteration = prior+1", rows.every(r => r.iteration === 2));
check("buildLogRows one row per source", rows.length === 2 && rows.some(r => r.source === "owner") && rows.some(r => r.source === "coach"));
check("buildLogRows owner feedback is the note", rows.find(r => r.source === "owner").feedback === "only one option");
check("buildLogRows carries change + node", rows.every(r => r.change === "added a 2nd read" && r.node === "u13.gap-control"));
const ownerOnly = buildLogRows({ scenario_id: "x2", node: null, change: "fix", priorMaxIteration: 0, ownerReview: { note: "n" }, coachReview: null });
check("buildLogRows skips missing source", ownerOnly.length === 1 && ownerOnly[0].iteration === 1);

// groupByNode
const grouped = groupByNode([{ node: "a", scenario_id: "1" }, { node: "a", scenario_id: "2" }, { node: null, scenario_id: "3" }]);
check("groupByNode groups by node", grouped["a"].length === 2 && grouped["(unknown)"].length === 1);

console.log(`\n${failed ? failed + " FAILED" : "all passed"}`);
process.exit(failed ? 1 : 0);
```

- [ ] **Step 3: Run to verify it fails**
Run: `npm --prefix C:/Users/mtsli/IceIQ run test:coach`
Expected: FAIL — `Cannot find module '../tools/lib/coach-core.mjs'`.

- [ ] **Step 4: Implement `tools/lib/coach-core.mjs`**
```javascript
// Pure helpers for the coach pre-review + resolve/pass-log loop.
// No Supabase, no Vite — node-testable. boardHash is the SAME hash the deck uses,
// so coach reviews can be matched to the board version they judged (stale detection).
import { boardHash } from "../../src/review/reviewCore.js";

// auditScenario result → a coach_reviews row. reviewed_at is left to the DB default.
export function coachRow({ seed, result, model }) {
  return {
    scenario_id: seed.id,
    verdict: String(result.verdict || "").toLowerCase(),
    confidence: result.confidence ?? null,
    notes: (result.notes || []).join(" · ") || null,
    convened: !!result.convened,
    board_hash: boardHash(seed),
    model: model || null,
  };
}

// Build the feedback_log rows to append for one resolved board: one per source
// (owner / coach) that actually had open feedback, all sharing one iteration.
export function buildLogRows({ scenario_id, node, change, priorMaxIteration, ownerReview, coachReview }) {
  const iteration = (priorMaxIteration || 0) + 1;
  const rows = [];
  const ownerFeedback = ownerReview && (ownerReview.note || ownerReview.verdict);
  if (ownerFeedback) rows.push({ scenario_id, node: node || null, iteration, source: "owner", feedback: ownerReview.note || ownerReview.verdict, change });
  if (coachReview && coachReview.notes) rows.push({ scenario_id, node: node || null, iteration, source: "coach", feedback: coachReview.notes, change });
  return rows;
}

// Group feedback_log rows by node (question type) for the markdown pass log.
export function groupByNode(rows) {
  const out = {};
  for (const r of rows || []) (out[r.node || "(unknown)"] ||= []).push(r);
  return out;
}
```

- [ ] **Step 5: Run to verify it passes**
Run: `npm --prefix C:/Users/mtsli/IceIQ run test:coach`
Expected: every line PASS, `all passed`, exit 0.

- [ ] **Step 6: Commit**
```bash
git -C C:/Users/mtsli/IceIQ add tools/lib/coach-core.mjs scripts/test-coach.mjs package.json
git -C C:/Users/mtsli/IceIQ commit tools/lib/coach-core.mjs scripts/test-coach.mjs package.json -m "feat(coach): pure coach-core logic + golden tests" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: `coach-sink.mjs` (Supabase upsert)

**Files:** Create `tools/lib/coach-sink.mjs`

- [ ] **Step 1: Implement it** (copies the `.env` loader pattern from `scripts/pull-reviews.mjs`):
```javascript
// Supabase service-role sink for coach verdicts. Used by gauntlet-audit --sink supabase.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

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

// Returns { upsert(row) }. Throws if env is missing (caller surfaces it).
export function createCoachSink() {
  const env = { ...loadEnv(), ...process.env };
  const url = env.VITE_SUPABASE_URL, key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  const sb = createClient(url, key, { auth: { persistSession: false } });
  return {
    async upsert(row) {
      const { error } = await sb.from("coach_reviews").upsert(row, { onConflict: "scenario_id" });
      if (error) throw new Error(error.message);
    },
  };
}
```

- [ ] **Step 2: Syntax check**
Run: `node --check C:/Users/mtsli/IceIQ/tools/lib/coach-sink.mjs`
Expected: exit 0, no output.

- [ ] **Step 3: Commit**
```bash
git -C C:/Users/mtsli/IceIQ add tools/lib/coach-sink.mjs
git -C C:/Users/mtsli/IceIQ commit tools/lib/coach-sink.mjs -m "feat(coach): supabase coach-review sink" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Wire `--sink supabase` into `gauntlet-audit.mjs` + `coach-review` script

**Files:** Modify `tools/gauntlet-audit.mjs`, `package.json`

- [ ] **Step 1: Add imports** — after the existing line `import { runAgent } from "./lib/claude-agent.mjs";` add:
```javascript
import { createCoachSink } from "./lib/coach-sink.mjs";
import { coachRow } from "./lib/coach-core.mjs";
```

- [ ] **Step 2: Add the `--sink` flag** — in `parseArgs`, the defaults object currently is `{ mock: false, dryRun: false, limit: Infinity, band: null, ids: null, coachModel: "sonnet" }`. Change it to include `sink: null`:
```javascript
  const a = { mock: false, dryRun: false, limit: Infinity, band: null, ids: null, coachModel: "sonnet", sink: null };
```
And add a branch in the arg loop (next to the `--coach-model` branch):
```javascript
    else if (t === "--sink") a.sink = argv[++i];
```

- [ ] **Step 3: Create the sink before the loop** — immediately before the `for (const { seed } of seeds) {` line in `main`, add:
```javascript
  const coachSink = opts.sink === "supabase" ? createCoachSink() : null;
  if (coachSink) console.log("→ writing coach verdicts to Supabase coach_reviews");
```

- [ ] **Step 4: Upsert each verdict** — inside the loop, immediately after the line `rows.push({ id: seed.id, ... convened: r.convened });` add:
```javascript
    if (coachSink) {
      try { await coachSink.upsert(coachRow({ seed, result: r, model: opts.coachModel })); }
      catch (e) { console.error(`coach_reviews upsert failed for ${seed.id}: ${e.message}`); }
    }
```

- [ ] **Step 5: Add the package script** — in `package.json` `"scripts"`, after `"gauntlet:audit": ...`, add:
```json
    "coach-review": "node tools/gauntlet-audit.mjs --sink supabase",
```

- [ ] **Step 6: Syntax check + mock smoke**
Run: `node --check C:/Users/mtsli/IceIQ/tools/gauntlet-audit.mjs`
Expected: exit 0.
Run (no LLM, no writes): `node C:/Users/mtsli/IceIQ/tools/gauntlet-audit.mjs --mock --dry-run --limit 2`
Expected: prints two `KEEP <id>` lines, exits 0 (mock verdict, no Supabase because `--sink` not passed).

- [ ] **Step 7: Live smoke (needs .env + migration 0014 applied)**
Run: `npm --prefix C:/Users/mtsli/IceIQ run coach-review -- --ids u13_oddman_pass_mc_v1 --coach-model sonnet`
Expected: prints a verdict line for that board; a row appears in Supabase → Table Editor → `coach_reviews`. (Skip if you want to batch the full run later.)

- [ ] **Step 8: Commit**
```bash
git -C C:/Users/mtsli/IceIQ add tools/gauntlet-audit.mjs package.json
git -C C:/Users/mtsli/IceIQ commit tools/gauntlet-audit.mjs package.json -m "feat(coach): gauntlet-audit --sink supabase + coach-review script" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Supabase read fns `listCoachReviews` / `listFeedbackLog`

**Files:** Modify `src/supabase.js`

- [ ] **Step 1: Append the read fns** — after the existing `listMyReviews` function, add:
```javascript
export async function listCoachReviews() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("coach_reviews")
    .select("scenario_id,verdict,confidence,notes,convened,board_hash,reviewed_at");
  return error ? [] : (data || []);
}

export async function listFeedbackLog() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("feedback_log")
    .select("scenario_id,node,iteration,source,feedback,change,created_at")
    .order("created_at", { ascending: true });
  return error ? [] : (data || []);
}
```
(`feedback_log` table lands in Task 7; the fn returns `[]` gracefully until then.)

- [ ] **Step 2: Syntax check**
Run: `node --check C:/Users/mtsli/IceIQ/src/supabase.js`
Expected: exit 0.

- [ ] **Step 3: Commit**
```bash
git -C C:/Users/mtsli/IceIQ add src/supabase.js
git -C C:/Users/mtsli/IceIQ commit src/supabase.js -m "feat(coach): listCoachReviews + listFeedbackLog" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Deck — coach panel, pre-select, flagged-only toggle

**Files:** Modify `src/review/ReviewScreen.jsx` (full replacement below)

- [ ] **Step 1: Replace `src/review/ReviewScreen.jsx` with:**
```jsx
import React, { useEffect, useState } from "react";
import ReviewBoard from "./ReviewBoard.jsx";
import { loadReviewScenarios } from "./reviewData.js";
import { boardHash } from "./reviewCore.js";
import { enqueueReview, flushQueue, getReviewedIds, getSavedReview, syncServerReviews } from "./reviewQueue.js";
import { getSession, listCoachReviews, listFeedbackLog } from "../supabase.js";
import { C, FONT } from "../shared.jsx";

const OWNERS = (import.meta.env.VITE_REVIEW_OWNERS || "")
  .split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
const VERDICT_LABEL = { keep: "KEEP", revise: "REVISE", retire: "RETIRE" };

function Centered({ children }) {
  return <div style={{ minHeight: "100vh", background: C.bg, color: C.white, fontFamily: FONT.body, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "1rem", gap: ".6rem" }}>{children}</div>;
}
const btn = { padding: ".5rem 1rem", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bgCard, color: C.white, cursor: "pointer" };
const ghost = { padding: ".3rem .6rem", borderRadius: 6, border: "none", background: "transparent", color: C.dim, fontSize: ".8rem", cursor: "pointer" };
const navBtn = { flex: 1, padding: ".55rem 0", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bgCard, color: C.white, fontFamily: FONT.body, cursor: "pointer", fontSize: ".85rem" };
const verdictBtn = { flex: 1, padding: ".9rem 0", borderRadius: 10, border: "1px solid", fontWeight: 700, fontFamily: FONT.body, cursor: "pointer", fontSize: ".95rem" };

export default function ReviewScreen({ onBack }) {
  const [status, setStatus] = useState("loading"); // loading | denied | empty | ready
  const [list, setList] = useState([]);
  const [i, setI] = useState(0);
  const [notesById, setNotesById] = useState({});
  const [pending, setPending] = useState(0);
  const [coachById, setCoachById] = useState({});
  const [logById, setLogById] = useState({});
  const [flaggedOnly, setFlaggedOnly] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const session = await getSession();
      const email = session?.user?.email?.toLowerCase();
      if (!email || (OWNERS.length && !OWNERS.includes(email))) { if (alive) setStatus("denied"); return; }
      await syncServerReviews();
      const [scenarios, coaches, logs] = await Promise.all([
        loadReviewScenarios(getReviewedIds()), listCoachReviews(), listFeedbackLog(),
      ]);
      if (!alive) return;
      setCoachById(Object.fromEntries(coaches.map(c => [c.scenario_id, c])));
      const lg = {};
      for (const r of logs) (lg[r.scenario_id] ||= []).push(r);
      setLogById(lg);
      setList(scenarios);
      setStatus(scenarios.length ? "ready" : "empty");
    })();
    return () => { alive = false; };
  }, []);

  const deck = flaggedOnly ? list.filter(s => { const c = coachById[s.id]; return c && c.verdict !== "keep"; }) : list;
  const current = deck[i];
  const saved = current ? getSavedReview(current.id) : null;
  const savedVerdict = saved?.verdict || null;
  const coach = current ? coachById[current.id] : null;
  const logs = current ? (logById[current.id] || []) : [];
  const note = current ? (notesById[current.id] ?? "") : "";

  useEffect(() => {
    if (!current) return;
    setNotesById(m => (current.id in m ? m : { ...m, [current.id]: saved?.note || "" }));
  }, [current?.id]);

  const setNote = (text) => { if (current) setNotesById(m => ({ ...m, [current.id]: text })); };

  async function verdict(v) {
    if (!current) return;
    enqueueReview({ scenario_id: current.id, verdict: v, note: note.trim(), board_hash: boardHash(current) });
    setI(n => Math.min(n + 1, deck.length));
    setPending(await flushQueue());
  }

  async function move(delta) {
    if (current && savedVerdict && note.trim() !== (saved?.note || "")) {
      enqueueReview({ scenario_id: current.id, verdict: savedVerdict, note: note.trim(), board_hash: boardHash(current) });
      setPending(await flushQueue());
    }
    setI(n => Math.max(0, Math.min(n + delta, deck.length)));
  }

  function toggleFlagged() { setFlaggedOnly(f => !f); setI(0); }

  if (status === "loading") return <Centered>Loading review deck…</Centered>;
  if (status === "denied") return <Centered><div>Not authorized.</div><button onClick={onBack} style={btn}>Back</button></Centered>;
  if (status === "empty") return <Centered><div>No boards to review 🎉</div><button onClick={onBack} style={btn}>Back</button></Centered>;
  if (!current) return <Centered><div>{flaggedOnly ? "No coach-flagged boards 🎉" : "End of the deck."} {pending ? `${pending} syncing…` : ""}</div><button onClick={() => setI(0)} style={btn}>Back to start</button><button onClick={onBack} style={ghost}>Exit</button></Centered>;

  const chips = [current.levels?.[0] || current.level || "", current.nodeId].filter(Boolean).join(" · ");
  const coachStale = coach && coach.board_hash && coach.board_hash !== boardHash(current);
  const suggests = (v) => !savedVerdict && coach && coach.verdict === v;
  const vStyle = (v, dim, border, color) => ({
    ...verdictBtn, background: dim, color,
    borderColor: savedVerdict === v ? color : (suggests(v) ? color : border),
    borderStyle: suggests(v) ? "dashed" : "solid",
  });

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.white, fontFamily: FONT.body, padding: "1rem", maxWidth: 480, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".5rem" }}>
        <button onClick={onBack} style={ghost}>← exit</button>
        <span style={{ color: C.dim, fontSize: ".8rem" }}>
          {i + 1} / {deck.length}{pending ? ` · ${pending} pending` : ""}{savedVerdict ? ` · saved: ${VERDICT_LABEL[savedVerdict]}` : ""}
        </span>
        <button onClick={toggleFlagged} style={{ ...ghost, color: flaggedOnly ? C.gold : C.dim }}>{flaggedOnly ? "all" : "flagged"}</button>
      </div>
      <div style={{ color: C.gold, fontSize: ".75rem", marginBottom: ".4rem", letterSpacing: ".04em" }}>{chips}</div>
      <ReviewBoard scenario={current} />

      {coach && (
        <div style={{ marginTop: ".5rem", padding: ".5rem .6rem", borderRadius: 8, background: C.bgCard, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: ".78rem", color: C.dim }}>
            🤖 Coaches: <b style={{ color: C.white }}>{VERDICT_LABEL[coach.verdict] || coach.verdict}</b>
            {coach.confidence != null ? ` · ${Math.round(coach.confidence * 100)}%` : ""}{coach.convened ? " · room" : ""}
            {coachStale ? " · ⚠ out of date" : ""}
          </div>
          {coach.notes && <div style={{ fontSize: ".78rem", color: C.dim, marginTop: ".2rem" }}>{coach.notes}</div>}
        </div>
      )}

      {logs.length > 0 && (
        <div style={{ marginTop: ".4rem", padding: ".5rem .6rem", borderRadius: 8, background: C.bgCard, border: `1px dashed ${C.border}` }}>
          <div style={{ fontSize: ".72rem", color: C.dimmer, marginBottom: ".2rem" }}>Previously incorporated</div>
          {logs.map((l, k) => (
            <div key={k} style={{ fontSize: ".76rem", color: C.dim }}>· (iter {l.iteration}) {l.feedback}{l.change ? ` → ${l.change}` : ""}</div>
          ))}
        </div>
      )}

      <input value={note} onChange={e => setNote(e.target.value)} placeholder="note (use your keyboard 🎤 to speak)…"
        style={{ width: "100%", margin: ".6rem 0", padding: ".6rem", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bgCard, color: C.white, fontFamily: FONT.body, boxSizing: "border-box" }} />
      <div style={{ display: "flex", gap: ".5rem", marginBottom: ".5rem" }}>
        <button onClick={() => verdict("keep")} style={vStyle("keep", C.greenDim, C.greenBorder, C.green)}>KEEP{savedVerdict === "keep" ? " ✓" : suggests("keep") ? " ·sugg" : ""}</button>
        <button onClick={() => verdict("revise")} style={vStyle("revise", C.goldDim, C.goldBorder, C.gold)}>REVISE{savedVerdict === "revise" ? " ✓" : suggests("revise") ? " ·sugg" : ""}</button>
        <button onClick={() => verdict("retire")} style={vStyle("retire", C.redDim, C.redBorder, C.red)}>RETIRE{savedVerdict === "retire" ? " ✓" : suggests("retire") ? " ·sugg" : ""}</button>
      </div>
      <div style={{ display: "flex", gap: ".5rem" }}>
        <button onClick={() => move(-1)} disabled={i === 0} style={{ ...navBtn, opacity: i === 0 ? 0.4 : 1, cursor: i === 0 ? "default" : "pointer" }}>← Previous</button>
        <button onClick={() => move(1)} style={navBtn}>Next →</button>
      </div>
    </div>
  );
}
```
> Note: this version already renders the "Previously incorporated" panel (Task 10's UI) — it's harmless before `feedback_log` exists because `listFeedbackLog()` returns `[]`. The pre-select uses dashed border + "·sugg" so it's distinct from the solid "✓" of a saved verdict (no reliance on color).

- [ ] **Step 2: Build**
Run: `npm --prefix C:/Users/mtsli/IceIQ run build`
Expected: builds clean, no errors.

- [ ] **Step 3: Manual smoke** — `npm run dev`, sign in, open `localhost:5173/#triage`. With a coach row present (Task 4 live smoke): the 🤖 panel shows the verdict+notes, the matching verdict button is dashed/"·sugg", and the header "flagged"/"all" toggle filters the deck. Your own tap still saves and shows "✓".

- [ ] **Step 4: Commit**
```bash
git -C C:/Users/mtsli/IceIQ add src/review/ReviewScreen.jsx
git -C C:/Users/mtsli/IceIQ commit src/review/ReviewScreen.jsx -m "feat(coach): deck coach panel + pre-select + flagged-only toggle + prior-feedback panel" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: `feedback_log` migration

**Files:** Create `supabase/migration_0015_feedback_log.sql`

- [ ] **Step 1: Write the migration**
```sql
-- Migration 0015: feedback_log (permanent, append-only record of incorporated feedback)
-- See docs/superpowers/specs/2026-06-12-coach-pre-review-design.md
-- Written by scripts/resolve-feedback.mjs (service role) when a board's feedback is implemented.
-- Never deleted. Owner-readable so the deck shows "previously incorporated".
-- Paste into Supabase Dashboard → SQL Editor → New query → Run. Idempotent.

create table if not exists public.feedback_log (
  id uuid primary key default gen_random_uuid(),
  scenario_id text not null,
  node text,
  iteration int not null default 1,
  source text not null check (source in ('owner','coach')),
  feedback text,
  change text,
  created_at timestamptz not null default now()
);

create index if not exists feedback_log_scenario_idx on public.feedback_log(scenario_id);

alter table public.feedback_log enable row level security;
drop policy if exists feedback_log_read on public.feedback_log;
create policy feedback_log_read on public.feedback_log for select using (true);
-- writes are service-role only.
```

- [ ] **Step 2: Apply (manual)** → Run in SQL Editor. Verify `select count(*) from public.feedback_log;` → `0`.

- [ ] **Step 3: Commit**
```bash
git -C C:/Users/mtsli/IceIQ add supabase/migration_0015_feedback_log.sql
git -C C:/Users/mtsli/IceIQ commit supabase/migration_0015_feedback_log.sql -m "feat(coach): feedback_log table" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: `resolve-feedback.mjs` (wipe open rows + append log)

**Files:** Create `scripts/resolve-feedback.mjs`; modify `package.json`

- [ ] **Step 1: Add the package script** — in `"scripts"`, after `"coach-review": ...`, add:
```json
    "resolve-feedback": "node scripts/resolve-feedback.mjs",
```

- [ ] **Step 2: Implement `scripts/resolve-feedback.mjs`**
```javascript
// Resolve implemented feedback: append it to feedback_log (permanent), then wipe the
// board's open scenario_reviews + coach_reviews rows. Reads a {id: change} JSON map.
// Run: npm run resolve-feedback -- --from docs/ai-pipeline/_resolutions.json
//   or: npm run resolve-feedback -- --id u13_x --change "added a second read"
import { readFileSync } from "node:fs";
import { dirname, join, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { buildLogRows } from "../tools/lib/coach-core.mjs";

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

function parseArgs(argv) {
  const a = { from: null, id: null, change: "" };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--from") a.from = argv[++i];
    else if (argv[i] === "--id") a.id = argv[++i];
    else if (argv[i] === "--change") a.change = argv[++i];
  }
  return a;
}

const args = parseArgs(process.argv.slice(2));
const resolutions = args.from
  ? JSON.parse(readFileSync(resolvePath(ROOT, args.from), "utf8"))
  : (args.id ? { [args.id]: args.change } : {});
const ids = Object.keys(resolutions);
if (!ids.length) { console.error("Nothing to resolve. Pass --from <json> or --id <id> --change <text>."); process.exit(1); }

const env = { ...loadEnv(), ...process.env };
const url = env.VITE_SUPABASE_URL, key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env"); process.exit(1); }
const sb = createClient(url, key, { auth: { persistSession: false } });

for (const scenario_id of ids) {
  const change = resolutions[scenario_id];
  // gather open feedback
  const { data: srRows } = await sb.from("scenario_reviews").select("verdict,note").eq("scenario_id", scenario_id);
  const { data: crRows } = await sb.from("coach_reviews").select("verdict,notes").eq("scenario_id", scenario_id);
  const ownerReview = srRows && srRows[0] ? { verdict: srRows[0].verdict, note: srRows[0].note } : null;
  const coachReview = crRows && crRows[0] ? { notes: crRows[0].notes } : null;
  // node + prior iteration
  const { data: priorRows } = await sb.from("feedback_log").select("iteration,node").eq("scenario_id", scenario_id);
  const priorMaxIteration = (priorRows || []).reduce((m, r) => Math.max(m, r.iteration || 0), 0);
  const node = (priorRows || []).find(r => r.node)?.node || scenario_id.replace(/^(?:gvis_)?/, "").split("_")[0]; // best-effort; deck passes nodeId on append below
  const logRows = buildLogRows({ scenario_id, node, change, priorMaxIteration, ownerReview, coachReview });
  if (logRows.length) {
    const { error: insErr } = await sb.from("feedback_log").insert(logRows);
    if (insErr) { console.error(`feedback_log insert failed for ${scenario_id}: ${insErr.message}`); continue; }
  }
  // wipe open rows
  await sb.from("scenario_reviews").delete().eq("scenario_id", scenario_id);
  await sb.from("coach_reviews").delete().eq("scenario_id", scenario_id);
  console.log(`resolved ${scenario_id} → logged ${logRows.length} row(s), wiped open feedback`);
}
console.log(`done: ${ids.length} board(s)`);
```
> The `node` for the log is best-effort from the id when no prior row carries it; the implementer should pass the real `nodeId` via the resolutions file as `{ "id": { "change": "...", "node": "u13.gap-control" } }` if precise typing is wanted — see Step 3.

- [ ] **Step 3: Support a richer resolutions shape** — replace the `change`/`node` derivation in the loop so an entry can be either a string or `{change, node}`:
```javascript
  const entry = resolutions[scenario_id];
  const change = typeof entry === "string" ? entry : (entry?.change || "");
  const explicitNode = typeof entry === "object" ? entry?.node : null;
```
and use `const node = explicitNode || (priorRows||[]).find(r=>r.node)?.node || null;` (drop the id-parsing fallback).

- [ ] **Step 4: Syntax check + live smoke**
Run: `node --check C:/Users/mtsli/IceIQ/scripts/resolve-feedback.mjs` → exit 0.
After Task 6 you have at least one `scenario_reviews` + `coach_reviews` row for some board. Run:
`npm --prefix C:/Users/mtsli/IceIQ run resolve-feedback -- --id <that id> --change "test resolve"`
Expected: prints `resolved <id> → logged N row(s), wiped open feedback`; in Supabase the `feedback_log` has new row(s), and that board's `scenario_reviews`/`coach_reviews` rows are gone.

- [ ] **Step 5: Commit**
```bash
git -C C:/Users/mtsli/IceIQ add scripts/resolve-feedback.mjs package.json
git -C C:/Users/mtsli/IceIQ commit scripts/resolve-feedback.mjs package.json -m "feat(coach): resolve-feedback (wipe open + append feedback_log)" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: `render-pass-log.mjs` (markdown + lessons fold)

**Files:** Create `scripts/render-pass-log.mjs`; modify `package.json`

- [ ] **Step 1: Add the package script** — after `"resolve-feedback": ...`:
```json
    "render-pass-log": "node scripts/render-pass-log.mjs",
```

- [ ] **Step 2: Implement `scripts/render-pass-log.mjs`**
```javascript
// Render feedback_log → docs/factory/feedback-pass-log.md (grouped by question type),
// and fold new owner feedback into tools/gauntlet/visual-lessons.json so the coaches
// + generator learn. Run: npm run render-pass-log
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { groupByNode } from "../tools/lib/coach-core.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
function loadEnv() {
  const env = {};
  try { for (const line of readFileSync(join(ROOT, ".env"), "utf8").split(/\r?\n/)) { const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i); if (m) env[m[1]] = m[2]; } } catch {}
  return env;
}
const env = { ...loadEnv(), ...process.env };
const url = env.VITE_SUPABASE_URL, key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env"); process.exit(1); }
const sb = createClient(url, key, { auth: { persistSession: false } });

const { data: rows, error } = await sb.from("feedback_log").select("scenario_id,node,iteration,source,feedback,change,created_at").order("created_at", { ascending: true });
if (error) { console.error(error.message); process.exit(1); }

// markdown grouped by node
const grouped = groupByNode(rows || []);
const lines = ["# Feedback pass log", "", `_Rendered from feedback_log (${(rows || []).length} entries)._`, ""];
for (const node of Object.keys(grouped).sort()) {
  lines.push(`## ${node}`, "");
  for (const r of grouped[node]) lines.push(`- ${(r.created_at || "").slice(0, 10)} · \`${r.scenario_id}\` (iter ${r.iteration}, ${r.source}) — ${r.feedback || ""}${r.change ? ` → ${r.change}` : ""}`);
  lines.push("");
}
const outDir = join(ROOT, "docs/factory");
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "feedback-pass-log.md"), lines.join("\n"));

// fold owner feedback into visual-lessons.json (existing {lessons:[{text,count}]} shape)
const lessonsPath = join(ROOT, "tools/gauntlet/visual-lessons.json");
let lessons = { lessons: [] };
try { lessons = JSON.parse(readFileSync(lessonsPath, "utf8")); } catch {}
const seen = new Set(lessons.lessons.map(l => l.text));
let added = 0;
for (const r of (rows || []).filter(r => r.source === "owner" && r.feedback)) {
  const text = `[${r.node || "general"}] ${r.feedback}`;
  if (!seen.has(text)) { lessons.lessons.push({ text, count: 1 }); seen.add(text); added++; }
}
writeFileSync(lessonsPath, JSON.stringify(lessons, null, 2));
console.log(`wrote docs/factory/feedback-pass-log.md (${(rows || []).length} entries); folded ${added} new lesson(s) into visual-lessons.json`);
```

- [ ] **Step 3: Syntax check + live smoke**
Run: `node --check C:/Users/mtsli/IceIQ/scripts/render-pass-log.mjs` → exit 0.
After Task 8 created a `feedback_log` row: `npm --prefix C:/Users/mtsli/IceIQ run render-pass-log`
Expected: writes `docs/factory/feedback-pass-log.md` grouped by node and reports lessons folded. Open the md to confirm.

- [ ] **Step 4: Commit**
```bash
git -C C:/Users/mtsli/IceIQ add scripts/render-pass-log.mjs package.json
git -C C:/Users/mtsli/IceIQ commit scripts/render-pass-log.mjs package.json -m "feat(coach): render-pass-log → markdown + visual-lessons fold" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Verify the deck's "previously incorporated" panel end-to-end

The panel UI shipped in Task 6. This task just verifies the full Phase-B loop renders it.

**Files:** none (verification only)

- [ ] **Step 1: Full loop smoke**
1. `npm run coach-review -- --ids <board>` → coach row.
2. On the deck, Revise that board with a note → `scenario_reviews` row.
3. `npm run resolve-feedback -- --id <board> --change "did X"` → `feedback_log` row, open rows wiped.
4. Reload the deck → that board no longer shows as outstanding; if you re-open it (it'll reappear once re-flagged or via "all"), the **"Previously incorporated"** panel shows `(iter 1) <feedback> → did X`.
Expected: the prior-feedback panel renders from `feedback_log`; nothing from round one is lost.

- [ ] **Step 2: No code change → no commit.** (If the smoke surfaces a bug, fix it in `ReviewScreen.jsx` and commit with `fix(coach): …`.)

---

## Task 11: Ignore generated artifacts + final smoke

**Files:** Modify `.gitignore`

- [ ] **Step 1: Append to `.gitignore`**
```
# Generated by npm run render-pass-log
docs/factory/feedback-pass-log.md
docs/ai-pipeline/_resolutions.json
```
(`docs/factory/coach-runs/` audit reports are already produced by the gauntlet; leave existing ignores alone.)

- [ ] **Step 2: Full-stack smoke**
- `npm run test:coach` → all passed.
- `npm run test:review` → all passed (unchanged).
- `npm run build` → clean.

- [ ] **Step 3: Commit**
```bash
git -C C:/Users/mtsli/IceIQ add .gitignore
git -C C:/Users/mtsli/IceIQ commit .gitignore -m "chore(coach): ignore generated pass-log + resolutions" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Notes for the implementer
- **No new dependencies.** Pure logic is node-tested (`test:coach`); LLM/Supabase scripts are manually smoked (they need the `claude` CLI + live Supabase + the migrations applied).
- **Commit discipline:** the repo has background automation that bundles staged files; always commit with an explicit pathspec (`git commit <files> -m`), never `git add -A`.
- **Migrations 0014 + 0015 are manual** — paste each into the Supabase SQL Editor before the live smokes that depend on them.
- **Env:** scripts need `VITE_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` in `.env` (already present). The deck reads via the anon client + the owner's session.
- **The first real run = your 20:** `npm run coach-review` over the bank, then open the deck to compare the coaches' verdicts to your earlier 20 (calibration).
