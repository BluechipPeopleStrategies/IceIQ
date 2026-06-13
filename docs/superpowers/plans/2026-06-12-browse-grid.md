# Browse Grid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An owner-only `#browse` grid of mini-board thumbnails, filterable by flag status and age tier, where tapping a board opens the deck's editor to re-verdict + note.

**Architecture:** New hash route `#browse` → lazy `BrowseScreen`, gated like `#triage`. Reuses existing data functions (`loadReviewScenarios`, `listCoachReviews`, `syncServerReviews`, `getSavedReview`, `listFeedbackLog`) and the existing board renderer. The single-board editor is extracted from `ReviewScreen` into a shared `BoardReviewPanel` so the deck and grid stay identical. Pure filter logic lives in `browseCore.js` (node-testable).

**Tech Stack:** React (plain JSX), Vite, Supabase, IntersectionObserver for lazy thumbnails. Tests are node scripts over pure modules (the repo's established pattern — see `scripts/test-review.mjs`).

**Spec:** `docs/superpowers/specs/2026-06-12-browse-grid-design.md`

---

## File Structure

- Create `src/review/browseCore.js` — pure filter/group helpers (no browser/Vite globals).
- Create `scripts/test-browse.mjs` — node tests for `browseCore.js`.
- Create `src/review/BoardReviewPanel.jsx` — shared single-board editor (extracted from ReviewScreen).
- Create `src/review/BrowseTile.jsx` — one lazy-mounted thumbnail cell.
- Create `src/review/BrowseScreen.jsx` — load + filters + grid + focused editor.
- Modify `src/review/ReviewBoard.jsx` — export `OptionsOverlay`.
- Modify `src/review/ReviewScreen.jsx` — render `BoardReviewPanel` instead of inline board block.
- Modify `src/App.jsx` — add `#browse` route + lazy import.
- Modify `package.json` — add `test:browse` script.

---

## Task 1: Pure filter logic (`browseCore.js`)

**Files:**
- Create: `src/review/browseCore.js`
- Test: `scripts/test-browse.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing test**

Create `scripts/test-browse.mjs`:

```js
// Golden tests for src/review/browseCore.js (pure logic). Run: npm run test:browse
import { ageTierOf, ageTiers, flagOf, applyFilters } from "../src/review/browseCore.js";

let failed = 0;
const check = (name, cond) => { console.log(`${cond ? "PASS" : "FAIL"}  ${name}`); if (!cond) failed++; };

const mk = (id, level, nodeId = "n") => ({ id, type: "scenario", stage: {}, actors: [{}], levels: [level], nodeId });
const scn = [mk("a", "U7"), mk("b", "U11"), mk("c", "U11"), mk("d", "U13")];

// ageTierOf / ageTiers
check("ageTierOf reads first level", ageTierOf(mk("x", "U9")) === "U9");
check("ageTierOf empty when no level", ageTierOf({ }) === "");
check("ageTiers sorted unique", JSON.stringify(ageTiers(scn)) === JSON.stringify(["U11", "U13", "U7"]));

// flagOf: coach != keep -> coach; my revise/retire -> mine; neither -> unreviewed; my keep + coach keep -> clean
check("flagOf coach when coach not keep", flagOf(mk("a","U7"), { verdict: "revise" }, null) === "coach");
check("flagOf mine when my verdict retire", flagOf(mk("a","U7"), null, { verdict: "retire" }) === "mine");
check("flagOf unreviewed when nothing", flagOf(mk("a","U7"), null, null) === "unreviewed");
check("flagOf clean when both keep", flagOf(mk("a","U7"), { verdict: "keep" }, { verdict: "keep" }) === "clean");
check("flagOf coach wins over my keep", flagOf(mk("a","U7"), { verdict: "revise" }, { verdict: "keep" }) === "coach");

// applyFilters
const coachById = { b: { verdict: "revise" } };
const myById = { d: { verdict: "retire" } };
check("applyFilters all returns everything", applyFilters(scn, { flagScope: "all", ageTier: "all" }, coachById, myById).length === 4);
check("applyFilters coach scope", applyFilters(scn, { flagScope: "coach", ageTier: "all" }, coachById, myById).map(s=>s.id).join() === "b");
check("applyFilters mine scope", applyFilters(scn, { flagScope: "mine", ageTier: "all" }, coachById, myById).map(s=>s.id).join() === "d");
check("applyFilters unreviewed scope", applyFilters(scn, { flagScope: "unreviewed", ageTier: "all" }, coachById, myById).map(s=>s.id).sort().join() === "a,c");
check("applyFilters age tier", applyFilters(scn, { flagScope: "all", ageTier: "U11" }, coachById, myById).map(s=>s.id).sort().join() === "b,c");
check("applyFilters flag + age combined", applyFilters(scn, { flagScope: "coach", ageTier: "U11" }, coachById, myById).map(s=>s.id).join() === "b");

console.log(failed ? `\n${failed} FAILED` : "\nAll passed");
process.exit(failed ? 1 : 0);
```

Add to `package.json` scripts (after `"test:coach"` line):

```json
    "test:browse": "node scripts/test-browse.mjs",
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix C:/Users/mtsli/IceIQ run test:browse`
Expected: FAIL — `Cannot find module .../browseCore.js`.

- [ ] **Step 3: Write minimal implementation**

Create `src/review/browseCore.js`:

```js
// Pure, Vite-free browse filtering. Imported by the React app AND node test
// scripts, so it must not touch import.meta.glob or browser globals.

// The scenario's age tier = its first level string (e.g. "U11"), or "".
export function ageTierOf(scenario) {
  return scenario?.levels?.[0] || scenario?.level || "";
}

// Sorted unique list of tiers present in a scenario list.
export function ageTiers(scenarios) {
  return [...new Set((scenarios || []).map(ageTierOf).filter(Boolean))].sort();
}

// One scenario's flag state, given its coach row and my-verdict row (either null):
//   coach      — coach reviewed it and did NOT keep (action needed)
//   mine       — I marked it revise or retire
//   unreviewed — no coach row and no verdict from me
//   clean      — reviewed and not flagged by either
export function flagOf(scenario, coach, myVerdict) {
  if (coach && coach.verdict && coach.verdict !== "keep") return "coach";
  const mv = myVerdict?.verdict;
  if (mv === "revise" || mv === "retire") return "mine";
  if (!coach && !mv) return "unreviewed";
  return "clean";
}

// Filter a scenario list by flag scope + age tier.
//   flagScope: "all" | "coach" | "mine" | "unreviewed"
//   ageTier:   "all" | "<tier>"
export function applyFilters(scenarios, { flagScope, ageTier }, coachById = {}, myVerdictById = {}) {
  return (scenarios || []).filter((s) => {
    if (ageTier && ageTier !== "all" && ageTierOf(s) !== ageTier) return false;
    if (!flagScope || flagScope === "all") return true;
    return flagOf(s, coachById[s.id] || null, myVerdictById[s.id] || null) === flagScope;
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix C:/Users/mtsli/IceIQ run test:browse`
Expected: PASS — `All passed`.

- [ ] **Step 5: Commit**

```bash
git -C C:/Users/mtsli/IceIQ add src/review/browseCore.js scripts/test-browse.mjs package.json
git -C C:/Users/mtsli/IceIQ commit -m "feat(browse): pure filter helpers + tests (browseCore)"
```

---

## Task 2: Extract `BoardReviewPanel` from the deck

The deck's single-board editor (board + previously-incorporated + note + verdict buttons + coach panel) becomes a shared component. The deck keeps its own queue/nav logic and passes its Prev/Next nav into the panel's `children` slot (rendered between the verdict buttons and the coach panel, exactly where it sits today).

**Files:**
- Create: `src/review/BoardReviewPanel.jsx`
- Modify: `src/review/ReviewScreen.jsx`

- [ ] **Step 1: Create `BoardReviewPanel.jsx`**

```jsx
import React from "react";
import ReviewBoard from "./ReviewBoard.jsx";
import { boardHash } from "./reviewCore.js";
import { C, FONT } from "../shared.jsx";

const VERDICT_LABEL = { keep: "KEEP", revise: "REVISE", retire: "RETIRE" };
const verdictBtn = { flex: 1, padding: ".9rem 0", borderRadius: 10, border: "1px solid", fontWeight: 700, fontFamily: FONT.body, cursor: "pointer", fontSize: ".95rem" };

// Shared single-board editor used by BOTH the #triage deck and the #browse grid.
// Presentation + callbacks only — it does not own the review queue. `children`
// renders between the verdict buttons and the coach panel (the deck slots its
// Prev/Next nav there).
export default function BoardReviewPanel({ scenario, coach, logs = [], savedVerdict, note, onNote, onVerdict, children }) {
  const coachStale = coach && coach.board_hash && coach.board_hash !== boardHash(scenario);
  const suggests = (v) => !savedVerdict && coach && coach.verdict === v;
  const vStyle = (v, dim, border, color) => ({
    ...verdictBtn, background: dim, color,
    borderColor: savedVerdict === v ? color : (suggests(v) ? color : border),
    borderStyle: suggests(v) ? "dashed" : "solid",
  });

  return (
    <>
      <ReviewBoard scenario={scenario} />

      {logs.length > 0 && (
        <div style={{ marginTop: ".4rem", padding: ".5rem .6rem", borderRadius: 8, background: C.bgCard, border: `1px dashed ${C.border}` }}>
          <div style={{ fontSize: ".72rem", color: C.dimmer, marginBottom: ".2rem" }}>Previously incorporated</div>
          {logs.map((l, k) => (
            <div key={k} style={{ fontSize: ".76rem", color: C.dim }}>· (iter {l.iteration}) {l.feedback}{l.change ? ` → ${l.change}` : ""}</div>
          ))}
        </div>
      )}

      <input value={note} onChange={e => onNote(e.target.value)} placeholder="note (use your keyboard 🎤 to speak)…"
        style={{ width: "100%", margin: ".6rem 0", padding: ".6rem", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bgCard, color: C.white, fontFamily: FONT.body, boxSizing: "border-box" }} />

      <div style={{ display: "flex", gap: ".5rem", marginBottom: ".5rem" }}>
        <button onClick={() => onVerdict("keep")} style={vStyle("keep", C.greenDim, C.greenBorder, C.green)}>KEEP{savedVerdict === "keep" ? " ✓" : suggests("keep") ? " ·sugg" : ""}</button>
        <button onClick={() => onVerdict("revise")} style={vStyle("revise", C.goldDim, C.goldBorder, C.gold)}>REVISE{savedVerdict === "revise" ? " ✓" : suggests("revise") ? " ·sugg" : ""}</button>
        <button onClick={() => onVerdict("retire")} style={vStyle("retire", C.redDim, C.redBorder, C.red)}>RETIRE{savedVerdict === "retire" ? " ✓" : suggests("retire") ? " ·sugg" : ""}</button>
      </div>

      {children}

      {coach && (
        <div style={{ marginTop: "1.4rem", padding: ".5rem .6rem", borderRadius: 8, background: C.bgCard, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: ".78rem", color: C.dim }}>
            🤖 Coaches: <b style={{ color: C.white }}>{VERDICT_LABEL[coach.verdict] || coach.verdict}</b>
            {coach.confidence != null ? ` · ${Math.round(coach.confidence * 100)}%` : ""}{coach.convened ? " · room" : ""}
            {coachStale ? " · ⚠ out of date" : ""}
          </div>
          {coach.notes && <div style={{ fontSize: ".78rem", color: C.dim, marginTop: ".2rem" }}>{coach.notes}</div>}
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Rewire `ReviewScreen.jsx` to use the panel**

In `src/review/ReviewScreen.jsx`:

1. Add import near the other review imports (line ~2):

```jsx
import BoardReviewPanel from "./BoardReviewPanel.jsx";
```

2. Replace the entire JSX block from `<ReviewBoard scenario={current} />` (line 109) through the closing of the coach panel `)}` (line 141) — i.e. the board, the `logs.length > 0` panel, the note `<input>`, the verdict buttons row, the Prev/Next nav row, and the coach panel — with:

```jsx
      <BoardReviewPanel
        scenario={current}
        coach={coach}
        logs={logs}
        savedVerdict={savedVerdict}
        note={note}
        onNote={setNote}
        onVerdict={verdict}
      >
        <div style={{ display: "flex", gap: ".5rem" }}>
          <button onClick={() => move(-1)} disabled={i === 0} style={{ ...navBtn, opacity: i === 0 ? 0.4 : 1, cursor: i === 0 ? "default" : "pointer" }}>← Previous</button>
          <button onClick={() => move(1)} style={navBtn}>Next →</button>
        </div>
      </BoardReviewPanel>
```

3. Delete now-dead code in `ReviewScreen.jsx`: the `verdictBtn` const (line 19), the `coachStale`/`suggests`/`vStyle` locals (lines 91–97), and the `ReviewBoard` import if no longer referenced (it is now only used via the panel — remove the `import ReviewBoard` line). Keep `navBtn`, `VERDICT_LABEL` (still used in the header counter), `boardHash` import (still used in `verdict`/`move`).

- [ ] **Step 3: Manual smoke — deck unchanged**

Run `npm --prefix C:/Users/mtsli/IceIQ run dev`, open `http://localhost:5174/#triage`, sign in. Verify the deck looks and behaves exactly as before: board, options, note persists across Prev/Next, verdict buttons save and advance, coach panel at the very bottom, suggestion dashed-border still shows. No console errors.

- [ ] **Step 4: Commit**

```bash
git -C C:/Users/mtsli/IceIQ add src/review/BoardReviewPanel.jsx src/review/ReviewScreen.jsx
git -C C:/Users/mtsli/IceIQ commit -m "refactor(review): extract shared BoardReviewPanel from the deck"
```

---

## Task 3: Export `OptionsOverlay` + build `BrowseTile`

**Files:**
- Modify: `src/review/ReviewBoard.jsx`
- Create: `src/review/BrowseTile.jsx`

- [ ] **Step 1: Export `OptionsOverlay`**

In `src/review/ReviewBoard.jsx`, change the overlay declaration (line 10) from:

```jsx
function OptionsOverlay({ scenario }) {
```

to:

```jsx
export function OptionsOverlay({ scenario }) {
```

(No other change — `ReviewBoard` keeps using it internally.)

- [ ] **Step 2: Create `BrowseTile.jsx`**

```jsx
import React, { useEffect, useRef, useState } from "react";
import RinkStage from "../scenario/RinkStage.jsx";
import { OptionsOverlay } from "./ReviewBoard.jsx";
import { ageTierOf, flagOf } from "./browseCore.js";
import { C, FONT } from "../shared.jsx";

// One grid cell: a lazy-mounted mini board + a flag badge + an "age · node" caption.
// The SVG only mounts when the tile scrolls near the viewport (IntersectionObserver),
// so a 148-board grid doesn't render 148 SVGs at once.
const BADGE = { coach: "🚩", mine: "⚠", clean: "", unreviewed: "" };

export default function BrowseTile({ scenario, coach, myVerdict, revised, onOpen }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (shown || !ref.current || typeof IntersectionObserver === "undefined") { if (!shown) setShown(true); return; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)) { setShown(true); io.disconnect(); }
    }, { rootMargin: "300px" });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [shown]);

  const flag = flagOf(scenario, coach, myVerdict);
  const badge = BADGE[flag];
  const kept = myVerdict?.verdict === "keep";
  const caption = [ageTierOf(scenario), scenario.nodeId].filter(Boolean).join(" · ");

  return (
    <button ref={ref} onClick={() => onOpen(scenario)}
      style={{ position: "relative", padding: 0, border: `1px solid ${C.border}`, borderRadius: 10, background: C.bgCard, cursor: "pointer", overflow: "hidden", textAlign: "left" }}>
      <div style={{ position: "absolute", top: 4, right: 6, zIndex: 2, fontSize: ".9rem" }}>
        {badge}{kept ? " ✓" : ""}{revised ? " ◍" : ""}
      </div>
      <div style={{ width: "100%", aspectRatio: "2 / 1", background: C.bg }}>
        {shown
          ? <RinkStage stage={scenario.stage} actors={scenario.actors} levels={scenario.levels}>
              {() => <OptionsOverlay scenario={scenario} />}
            </RinkStage>
          : <div style={{ width: "100%", height: "100%" }} />}
      </div>
      <div style={{ padding: ".3rem .45rem", fontSize: ".68rem", letterSpacing: ".03em", color: C.gold, fontFamily: FONT.body }}>{caption}</div>
    </button>
  );
}
```

Note: multi-step scenarios have no top-level `actors`; for the thumbnail, RinkStage with `actors={undefined}` renders an empty rink, which is acceptable for v1 (the badge + caption still identify it, and tapping opens the full multi-step board). Do not special-case it here.

- [ ] **Step 3: Manual smoke**

Deferred to Task 4 (BrowseTile has no standalone route). Confirm it compiles by importing it in BrowseScreen next task; lint/build will catch errors.

- [ ] **Step 4: Commit**

```bash
git -C C:/Users/mtsli/IceIQ add src/review/ReviewBoard.jsx src/review/BrowseTile.jsx
git -C C:/Users/mtsli/IceIQ commit -m "feat(browse): export OptionsOverlay + lazy BrowseTile thumbnail"
```

---

## Task 4: `BrowseScreen` (load + filters + grid + focused editor)

**Files:**
- Create: `src/review/BrowseScreen.jsx`

- [ ] **Step 1: Create `BrowseScreen.jsx`**

```jsx
import React, { useEffect, useMemo, useState } from "react";
import BrowseTile from "./BrowseTile.jsx";
import BoardReviewPanel from "./BoardReviewPanel.jsx";
import { loadReviewScenarios } from "./reviewData.js";
import { ageTiers, applyFilters } from "./browseCore.js";
import { boardHash } from "./reviewCore.js";
import { enqueueReview, flushQueue, getSavedReview, syncServerReviews } from "./reviewQueue.js";
import { getSession, listCoachReviews, listFeedbackLog } from "../supabase.js";
import { C, FONT } from "../shared.jsx";

const OWNERS = (import.meta.env.VITE_REVIEW_OWNERS || "")
  .split(",").map(s => s.trim().toLowerCase()).filter(Boolean);

const FLAG_SCOPES = [
  { key: "all", label: "All" },
  { key: "coach", label: "🚩 Coach" },
  { key: "mine", label: "⚠ Mine" },
  { key: "unreviewed", label: "Unreviewed" },
];

function Centered({ children }) {
  return <div style={{ minHeight: "100vh", background: C.bg, color: C.white, fontFamily: FONT.body, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "1rem", gap: ".6rem" }}>{children}</div>;
}
const btn = { padding: ".5rem 1rem", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bgCard, color: C.white, cursor: "pointer" };
const ghost = { padding: ".3rem .6rem", borderRadius: 6, border: "none", background: "transparent", color: C.dim, fontSize: ".8rem", cursor: "pointer" };
const chip = (on) => ({ padding: ".3rem .6rem", borderRadius: 999, border: `1px solid ${on ? C.gold : C.border}`, background: on ? C.goldDim : "transparent", color: on ? C.gold : C.dim, fontSize: ".75rem", cursor: "pointer", fontFamily: FONT.body });

export default function BrowseScreen({ onBack }) {
  const [status, setStatus] = useState("loading"); // loading | denied | ready
  const [list, setList] = useState([]);
  const [coachById, setCoachById] = useState({});
  const [myById, setMyById] = useState({});
  const [revisedIds, setRevisedIds] = useState(new Set());
  const [logById, setLogById] = useState({});
  const [flagScope, setFlagScope] = useState("all");
  const [ageTier, setAgeTier] = useState("all");
  const [focused, setFocused] = useState(null); // scenario or null
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      let email = null;
      try { const s = await getSession(); email = s?.user?.email?.toLowerCase(); }
      catch (e) { console.error("[browse] getSession failed", e); }
      if (!email || (OWNERS.length && !OWNERS.includes(email))) { if (alive) setStatus("denied"); return; }
      try { await syncServerReviews(); } catch (e) { console.error("[browse] syncServerReviews failed", e); }
      let scenarios = [];
      try { scenarios = await loadReviewScenarios(new Set()); } catch (e) { console.error("[browse] loadReviewScenarios failed", e); }
      try { const c = await listCoachReviews(); if (alive) setCoachById(Object.fromEntries(c.map(x => [x.scenario_id, x]))); }
      catch (e) { console.error("[browse] listCoachReviews failed", e); }
      try { const logs = await listFeedbackLog(); if (alive) { setRevisedIds(new Set(logs.map(l => l.scenario_id))); const lg = {}; for (const r of logs) (lg[r.scenario_id] ||= []).push(r); setLogById(lg); } }
      catch (e) { console.error("[browse] listFeedbackLog failed", e); }
      if (!alive) return;
      const mine = {};
      for (const s of scenarios) { const sv = getSavedReview(s.id); if (sv) mine[s.id] = sv; }
      setMyById(mine);
      setList(scenarios);
      setStatus("ready");
    })();
    return () => { alive = false; };
  }, []);

  const tiers = useMemo(() => ageTiers(list), [list]);
  const filtered = useMemo(() => applyFilters(list, { flagScope, ageTier }, coachById, myById), [list, flagScope, ageTier, coachById, myById]);

  function openBoard(s) { setFocused(s); setNote(getSavedReview(s.id)?.note || ""); }
  function closeBoard() { setFocused(null); }

  async function saveVerdict(v) {
    if (!focused) return;
    enqueueReview({ scenario_id: focused.id, verdict: v, note: note.trim(), board_hash: boardHash(focused) });
    setMyById(m => ({ ...m, [focused.id]: { verdict: v, note: note.trim() } }));
    setPending(await flushQueue());
    closeBoard();
  }

  if (status === "loading") return <Centered>Loading library…</Centered>;
  if (status === "denied") return <Centered><div>Not authorized.</div><button onClick={onBack} style={btn}>Back</button></Centered>;

  if (focused) {
    const coach = coachById[focused.id] || null;
    const savedVerdict = getSavedReview(focused.id)?.verdict || myById[focused.id]?.verdict || null;
    return (
      <div style={{ minHeight: "100vh", background: C.bg, color: C.white, fontFamily: FONT.body, padding: "1rem", maxWidth: 480, margin: "0 auto" }}>
        <button onClick={closeBoard} style={ghost}>← back to grid{pending ? ` · ${pending} syncing` : ""}</button>
        <div style={{ height: ".4rem" }} />
        <BoardReviewPanel
          scenario={focused} coach={coach} logs={logById[focused.id] || []} savedVerdict={savedVerdict}
          note={note} onNote={setNote} onVerdict={saveVerdict}
        />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.white, fontFamily: FONT.body, padding: "1rem", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".5rem" }}>
        <button onClick={onBack} style={ghost}>← exit</button>
        <span style={{ color: C.dim, fontSize: ".8rem" }}>{filtered.length} board{filtered.length === 1 ? "" : "s"}{pending ? ` · ${pending} pending` : ""}</span>
        <span style={{ width: 40 }} />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: ".35rem", marginBottom: ".4rem" }}>
        {FLAG_SCOPES.map(f => <button key={f.key} onClick={() => setFlagScope(f.key)} style={chip(flagScope === f.key)}>{f.label}</button>)}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: ".35rem", marginBottom: ".8rem" }}>
        <button onClick={() => setAgeTier("all")} style={chip(ageTier === "all")}>All ages</button>
        {tiers.map(t => <button key={t} onClick={() => setAgeTier(t)} style={chip(ageTier === t)}>{t}</button>)}
      </div>

      {filtered.length === 0
        ? <div style={{ color: C.dim, textAlign: "center", padding: "2rem 0" }}>No boards match. <button onClick={() => { setFlagScope("all"); setAgeTier("all"); }} style={ghost}>clear filters</button></div>
        : <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: ".6rem" }}>
            {filtered.map(s => (
              <BrowseTile key={s.id} scenario={s} coach={coachById[s.id] || null} myVerdict={myById[s.id] || null} revised={revisedIds.has(s.id)} onOpen={openBoard} />
            ))}
          </div>}
    </div>
  );
}
```

- [ ] **Step 2: Manual smoke (after Task 5 wires the route)**

Deferred to Task 5 — the route must exist to reach the screen.

- [ ] **Step 3: Commit**

```bash
git -C C:/Users/mtsli/IceIQ add src/review/BrowseScreen.jsx
git -C C:/Users/mtsli/IceIQ commit -m "feat(browse): BrowseScreen — load, filter chips, grid, tap-to-edit"
```

---

## Task 5: Wire the `#browse` route

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Add the lazy import**

In `src/App.jsx`, next to the other review lazy imports (near line 433 `const ReviewScreen = lazy(...)`), add:

```jsx
const BrowseScreen = lazy(() => import("./review/BrowseScreen.jsx"));
```

- [ ] **Step 2: Add the route branch**

Right after the `#triage` branch (line ~8051, after the `ReviewScreen` block closes), add:

```jsx
  // Owner-only browse grid of all boards (Supabase-backed). (`#browse`)
  if (hashRoute === "browse") {
    return <Suspense fallback={<LazyFallback/>}><BrowseScreen onBack={() => { window.location.hash = ""; }}/></Suspense>;
  }
```

- [ ] **Step 3: Manual smoke — full feature**

Run `npm --prefix C:/Users/mtsli/IceIQ run dev`, open `http://localhost:5174/#browse`, sign in as owner. Verify:
- Grid of 2-up thumbnails renders; off-screen tiles fill in as you scroll.
- Flag chips (All / Coach / Mine / Unreviewed) and age chips filter the grid; count updates.
- A coach-flagged board shows 🚩; a board you've revised shows ⚠; a kept board shows ✓.
- Tap a tile → editor opens (board + note + KEEP/REVISE/RETIRE + coach panel). Save a verdict → returns to grid, the tile's badge reflects the new verdict.
- Open `#triage` and confirm the same board now reflects that verdict (shared Supabase tables).
- No console errors.

- [ ] **Step 4: Run the pure tests**

Run: `npm --prefix C:/Users/mtsli/IceIQ run test:browse`
Expected: PASS. Also run `npm --prefix C:/Users/mtsli/IceIQ run test:review` to confirm the BoardReviewPanel extraction didn't disturb reviewCore. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git -C C:/Users/mtsli/IceIQ add src/App.jsx
git -C C:/Users/mtsli/IceIQ commit -m "feat(browse): wire #browse route"
```

---

## Final review

After all tasks: confirm the deck (`#triage`) is visually/behaviorally identical to before (the only at-risk change is the BoardReviewPanel extraction), the grid loads and filters on both desktop and phone, and verdicts cross-sync between grid and deck. Then this is ready to push (push requires explicit user confirmation).
