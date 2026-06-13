# Review Panel — Accordion History + Neutral Verdict — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the flat "Previously incorporated" list into a per-row accordion (date + headline, expand for detail) and make the KEEP/REVISE/RETIRE buttons neutral (drop the coach "suggested" pre-pick; keep the owner's saved ✓).

**Architecture:** Client-only. One pure helper added to `src/review/browseCore.js` (node-testable), and all UI changes confined to the shared `src/review/BoardReviewPanel.jsx` (used by both `#browse` and `#triage`). No schema, data-function, or prop changes — the panel already receives `logs` and `savedVerdict`.

**Tech Stack:** React (function components, hooks), plain JS, inline styles via the shared `C`/`FONT` tokens. Tests are plain-node assertion scripts (`scripts/test-browse.mjs`, run with `npm run test:browse`), not a test framework.

**Spec:** `docs/superpowers/specs/2026-06-13-review-panel-accordion-neutral-verdict-design.md`

---

## File structure

- **Modify** `src/review/browseCore.js` — add the pure `iterationHeadline(log)` helper. Already the Vite-free, node-importable helpers module.
- **Modify** `scripts/test-browse.mjs` — add golden assertions for `iterationHeadline`.
- **Modify** `src/review/BoardReviewPanel.jsx` — add `useState` import + `iterationHeadline` import; add `fmtLogDate` + `IterationRow`; replace the flat log block with the accordion; remove the `suggests()` pre-pick and simplify the verdict button styling/labels.

No new files. No other files touched.

---

### Task 1: Pure `iterationHeadline` helper (TDD)

**Files:**
- Modify: `src/review/browseCore.js`
- Test: `scripts/test-browse.mjs`

- [ ] **Step 1: Write the failing tests**

Add these lines to `scripts/test-browse.mjs`. Add `iterationHeadline` to the existing import on line 2, and append the checks after the `applyFilters` block (before the final `console.log`):

Change line 2 from:
```js
import { ageTierOf, ageTiers, flagOf, applyFilters } from "../src/review/browseCore.js";
```
to:
```js
import { ageTierOf, ageTiers, flagOf, applyFilters, iterationHeadline } from "../src/review/browseCore.js";
```

Append before the final `console.log`:
```js
// iterationHeadline: change wins; falls back to feedback; else "(no detail)"
check("headline uses change when present", iterationHeadline({ change: "added a 2nd read", feedback: "only one option" }) === "added a 2nd read");
check("headline falls back to feedback", iterationHeadline({ change: "", feedback: "only one option" }) === "only one option");
check("headline blank both -> placeholder", iterationHeadline({ change: "", feedback: "" }) === "(no detail)");
check("headline whitespace -> placeholder", iterationHeadline({ change: "   ", feedback: "" }) === "(no detail)");
check("headline trims", iterationHeadline({ change: "  trimmed  " }) === "trimmed");
check("headline null-safe", iterationHeadline(null) === "(no detail)");
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test:browse`
Expected: the new `headline …` lines print `FAIL` (and the script exits non-zero) because `iterationHeadline` is not exported yet (`undefined is not a function`).

- [ ] **Step 3: Implement the helper**

Append to `src/review/browseCore.js`:
```js
// Headline for a feedback_log row in the "Previously incorporated" accordion:
// the change made, else the feedback, else a placeholder. Trimmed.
export function iterationHeadline(log) {
  const t = (log?.change || log?.feedback || "").trim();
  return t || "(no detail)";
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test:browse`
Expected: every line prints `PASS`, final line `All passed`, exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/review/browseCore.js scripts/test-browse.mjs
git commit -m "feat(review): iterationHeadline helper for accordion history"
```

---

### Task 2: Accordion "Previously incorporated" in BoardReviewPanel

**Files:**
- Modify: `src/review/BoardReviewPanel.jsx`

This is presentational; verification is a manual smoke test (no unit test for the component).

- [ ] **Step 1: Update imports**

In `src/review/BoardReviewPanel.jsx`, change line 1 from:
```js
import React from "react";
```
to:
```js
import React, { useState } from "react";
```

And add this import alongside the others (after the `reviewCore` import):
```js
import { iterationHeadline } from "./browseCore.js";
```

- [ ] **Step 2: Add `fmtLogDate` + `IterationRow` above the default export**

Insert this block immediately before `export default function BoardReviewPanel(`:
```jsx
// Compact Mountain-Time date for a log row, e.g. "Jun 11". Empty on missing/invalid.
function fmtLogDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-CA", { month: "short", day: "numeric", timeZone: "America/Edmonton" });
}

// One collapsed accordion row in "Previously incorporated": date + one-line headline;
// click to reveal full feedback/change + a meta line. Caret glyph signals state
// (not color — colorblind-safe).
function IterationRow({ log }) {
  const [open, setOpen] = useState(false);
  const date = fmtLogDate(log.created_at);
  const meta = [
    log.iteration != null ? `iter ${log.iteration}` : null,
    log.node ? `node ${log.node}` : null,
    log.source || null,
  ].filter(Boolean).join(" · ");
  return (
    <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: ".25rem", marginTop: ".25rem" }}>
      <div onClick={() => setOpen(o => !o)} style={{ display: "flex", gap: ".4rem", alignItems: "baseline", cursor: "pointer", fontSize: ".76rem", color: C.dim }}>
        <span style={{ color: C.dimmer }}>{open ? "▾" : "▸"}</span>
        {date && <span style={{ color: C.dimmer, flexShrink: 0 }}>{date}</span>}
        <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{iterationHeadline(log)}</span>
      </div>
      {open && (
        <div style={{ fontSize: ".74rem", color: C.dim, margin: ".25rem 0 .35rem 1rem", lineHeight: 1.4 }}>
          {log.feedback && <div><span style={{ color: C.dimmer }}>Feedback:</span> {log.feedback}</div>}
          {log.change && <div><span style={{ color: C.dimmer }}>Change:</span> {log.change}</div>}
          {meta && <div style={{ color: C.dimmer, marginTop: ".15rem" }}>{meta}</div>}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Replace the flat log block with the accordion**

In the `BoardReviewPanel` return, replace this block:
```jsx
      {logs.length > 0 && (
        <div style={{ marginTop: ".4rem", padding: ".5rem .6rem", borderRadius: 8, background: C.bgCard, border: `1px dashed ${C.border}` }}>
          <div style={{ fontSize: ".72rem", color: C.dimmer, marginBottom: ".2rem" }}>Previously incorporated</div>
          {logs.map((l, k) => (
            <div key={k} style={{ fontSize: ".76rem", color: C.dim }}>· (iter {l.iteration}) {l.feedback}{l.change ? ` → ${l.change}` : ""}</div>
          ))}
        </div>
      )}
```
with:
```jsx
      {logs.length > 0 && (
        <div style={{ marginTop: ".4rem", padding: ".5rem .6rem", borderRadius: 8, background: C.bgCard, border: `1px dashed ${C.border}` }}>
          <div style={{ fontSize: ".72rem", color: C.dimmer, marginBottom: ".2rem" }}>Previously incorporated</div>
          {[...logs].reverse().map((l, k) => <IterationRow key={k} log={l} />)}
        </div>
      )}
```

(`[...logs].reverse()` shows newest first without mutating the prop; `logs` arrives `created_at` ascending from `listFeedbackLog`.)

- [ ] **Step 4: Build to verify no syntax/import errors**

Run: `npm run build`
Expected: build succeeds (no "iterationHeadline is not defined" / JSX errors).

- [ ] **Step 5: Manual smoke test**

Run `npm run dev`, open `http://localhost:5175/#browse`, open a board that has multiple `feedback_log` rows.
Expected: under "Previously incorporated" each iteration is a collapsed row showing `▸ <date> <one-line headline>`, **newest first**; clicking one expands just it to `▾` with full Feedback / Change / `iter N · node X · source`; other rows stay collapsed. A row with a long change shows an ellipsis, not a wrap.

- [ ] **Step 6: Commit**

```bash
git add src/review/BoardReviewPanel.jsx
git commit -m "feat(review): collapsible accordion for previously-incorporated history"
```

---

### Task 3: Neutral verdict buttons (remove coach pre-pick)

**Files:**
- Modify: `src/review/BoardReviewPanel.jsx`

- [ ] **Step 1: Remove `suggests()` and simplify `vStyle`**

Replace this block near the top of `BoardReviewPanel`:
```jsx
  const coachStale = coach && coach.board_hash && coach.board_hash !== boardHash(scenario);
  const suggests = (v) => !savedVerdict && coach && coach.verdict === v;
  const vStyle = (v, dim, border, color) => ({
    ...verdictBtn, background: dim, color,
    borderColor: savedVerdict === v ? color : (suggests(v) ? color : border),
    borderStyle: suggests(v) ? "dashed" : "solid",
  });
```
with:
```jsx
  const coachStale = coach && coach.board_hash && coach.board_hash !== boardHash(scenario);
  const vStyle = (v, dim, border, color) => ({
    ...verdictBtn, background: dim, color,
    borderColor: savedVerdict === v ? color : border,
    borderStyle: "solid",
  });
```

- [ ] **Step 2: Remove the `·sugg` suffixes from the verdict buttons**

Replace the three verdict buttons:
```jsx
        <button onClick={() => onVerdict("keep")} style={vStyle("keep", C.greenDim, C.greenBorder, C.green)}>KEEP{savedVerdict === "keep" ? " ✓" : suggests("keep") ? " ·sugg" : ""}</button>
        <button onClick={() => onVerdict("revise")} style={vStyle("revise", C.goldDim, C.goldBorder, C.gold)}>REVISE{savedVerdict === "revise" ? " ✓" : suggests("revise") ? " ·sugg" : ""}</button>
        <button onClick={() => onVerdict("retire")} style={vStyle("retire", C.redDim, C.redBorder, C.red)}>RETIRE{savedVerdict === "retire" ? " ✓" : suggests("retire") ? " ·sugg" : ""}</button>
```
with:
```jsx
        <button onClick={() => onVerdict("keep")} style={vStyle("keep", C.greenDim, C.greenBorder, C.green)}>KEEP{savedVerdict === "keep" ? " ✓" : ""}</button>
        <button onClick={() => onVerdict("revise")} style={vStyle("revise", C.goldDim, C.goldBorder, C.gold)}>REVISE{savedVerdict === "revise" ? " ✓" : ""}</button>
        <button onClick={() => onVerdict("retire")} style={vStyle("retire", C.redDim, C.redBorder, C.red)}>RETIRE{savedVerdict === "retire" ? " ✓" : ""}</button>
```

(The 🤖 Coaches panel further down still renders `coach.verdict` + notes + `coachStale` — that block is unchanged and is now the only place a coach verdict appears.)

- [ ] **Step 3: Build to verify no errors**

Run: `npm run build`
Expected: build succeeds. There must be no remaining reference to `suggests` in the file.

- [ ] **Step 4: Manual smoke test (both surfaces)**

Run `npm run dev`. 
- `#browse`: open a board whose coach verdict is `revise` → the REVISE button is **not** highlighted and shows no `·sugg`; the 🤖 panel still shows the coach's REVISE. Open a board you previously saved KEEP on → KEEP shows ` ✓` with a solid colored border.
- `#triage`: same board-editor behavior (shared component) — coach verdict no longer pre-picks a button; the deck's nav/queue is unaffected.

- [ ] **Step 5: Commit**

```bash
git add src/review/BoardReviewPanel.jsx
git commit -m "feat(review): neutral verdict buttons — drop coach suggestion pre-pick"
```

---

## Self-review notes

- **Spec coverage:** accordion (Task 2) ✓; headline = change-then-feedback (Task 1) ✓; compact MT date (Task 2 `fmtLogDate`) ✓; newest-first (Task 2 `[...logs].reverse()`) ✓; remove `suggests()` pre-pick (Task 3) ✓; keep owner ✓ (Task 3 retains `savedVerdict === v` styling + ✓) ✓; both surfaces via shared component (no prop branch) ✓; `iterationHeadline` unit-tested (Task 1) ✓; coach panel unchanged (Task 3 note) ✓.
- **No placeholders:** every code step shows full replacement code.
- **Naming consistency:** `iterationHeadline`, `fmtLogDate`, `IterationRow` used identically in helper, import, and JSX. `savedVerdict` matches the existing prop.
- **Out of scope (SP2):** coach auto-revise + verdict reset-to-blank-on-coach-change — separate spec/plan.
