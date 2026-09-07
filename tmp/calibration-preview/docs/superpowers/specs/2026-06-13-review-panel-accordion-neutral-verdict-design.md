# Review Panel — Accordion History + Neutral Verdict — Design

- **Date:** 2026-06-13
- **Status:** Approved design, ready for implementation planning
- **Project:** IceIQ / RinkReads
- **Builds on:** `2026-06-12-coach-pre-review-design.md`, `2026-06-12-browse-grid-design.md`
- **Scope:** Sub-project 1 of 2. Client-only. (SP2 = coach auto-revise pipeline; separate brainstorm.)

## Goal

Two changes to the shared single-board review editor (`BoardReviewPanel.jsx`), used by both
`#browse` and the `#triage` deck:

1. **Accordion history.** The "Previously incorporated" panel currently dumps every iteration's
   full `feedback → change` text flat. Replace it with a per-row accordion: each iteration shows a
   compact date + a one-line headline, collapsed by default, and expands on click to reveal the
   full feedback, full change, and source. The owner scans the history without a wall of text and
   opens only the entries they care about.
2. **Neutral verdict decision.** The verdict buttons must never pre-select REVISE just because a
   coach suggested it (or because the board was looked at before). Every time a board opens, the
   decision is fresh: *get rid of it (RETIRE) / change it (REVISE) / good to go (KEEP)*. The
   owner's own previously-saved verdict still shows as a `✓` so they can see what they last chose;
   the coach's take stays visible only in the 🤖 Coaches panel as information.

## Why

- The flat "Previously incorporated" list grows unreadable as iterations accumulate; the owner
  wants date + headline to scan, and detail on demand.
- The coach "suggested" pre-selection (`suggests()` in `BoardReviewPanel`, designed in the
  coach-pre-review A3 section) makes REVISE look pre-decided. The owner wants a clean slate each
  view so the verdict reflects a real fresh judgment, not an inherited suggestion.

## Non-goals (YAGNI)

- No coach JSON auto-revise. Coaches still only emit verdict + notes; making coach revisions
  go live unattended is **SP2** and is brainstormed separately.
- No schema, Supabase, or data-function changes. `feedback_log` already carries
  `created_at, iteration, node, source, feedback, change` (see `listFeedbackLog` select).
- No change to how verdicts are stored or synced. The owner's saved `✓` behavior is unchanged;
  only the *coach suggestion* pre-pick is removed.
- Dropping the owner's own saved `✓` (full blank-every-time) is explicitly **not** done — the
  owner chose "blank from coach, keep my ✓."

## Architecture

Single file: `src/review/BoardReviewPanel.jsx`. One new in-file subcomponent (`IterationRow`) and
one tiny pure helper extracted for node-testability. Everything else in the panel (board render,
note field, KEEP/REVISE/RETIRE save, coach panel) is unchanged.

### 1. Accordion — "Previously incorporated"

Replace the current block (the `logs.map` that renders `· (iter N) feedback → change` flat) with
a list of `IterationRow`s, **newest first** (the data arrives `created_at` ascending from
`listFeedbackLog`, so reverse for display).

`IterationRow({ log })` — a self-contained accordion row owning its own `open` boolean
(`useState(false)`):

- **Collapsed (default):** a single clickable line:
  `▸  <date>   <headline>`
  - `<date>`: `log.created_at` formatted compactly in Mountain Time (e.g. `Jun 11`). Inline
    formatting via `toLocaleDateString("en-CA", { month: "short", day: "numeric", timeZone: "America/Edmonton" })`, guarded for a missing/invalid date (render nothing rather than "Invalid Date").
  - `<headline>`: `iterationHeadline(log)` — `log.change` if non-empty, else `log.feedback`, else
    `"(no detail)"`. Rendered on one line with CSS ellipsis
    (`whiteSpace: nowrap; overflow: hidden; textOverflow: ellipsis`) so a long change never wraps.
- **Expanded (on click):** caret flips to `▾`; below the headline line, show:
  - `Feedback: <log.feedback>` (full, wraps) — omitted if empty.
  - `Change: <log.change>` (full, wraps) — omitted if empty.
  - meta line: `iter <log.iteration> · node <log.node> · <log.source>` (each part omitted if
    absent), dimmer/smaller.
- The whole row is the click target (toggle `open`); cursor pointer. Caret glyph (`▸`/`▾`)
  signals state — a glyph, not color, so it is colorblind-safe (consistent with the rest of the
  app's icon-not-color rule).

The panel keeps its existing wrapper (the dashed-border card with the "Previously incorporated"
label); only the rows inside change. Rendered only when `logs.length > 0` (unchanged).

### 2. Neutral verdict buttons

In `BoardReviewPanel`:

- **Remove** the `suggests(v)` helper and every use of it: the dashed border, the `borderStyle`
  switch, and the `·sugg` suffix on the button labels.
- `vStyle(v, dim, border, color)` simplifies to: solid border in `color` when
  `savedVerdict === v`, else the neutral `border`; always `borderStyle: solid`.
- Button labels: `KEEP` / `REVISE` / `RETIRE`, with a trailing ` ✓` only when
  `savedVerdict === v`. No suggestion text.
- The 🤖 Coaches panel at the bottom is **unchanged** — it still shows the coach verdict +
  confidence + notes + stale flag. That is the only place a coach verdict appears now; it informs,
  it does not pre-select.

This is consistent across `#browse` and `#triage` because both render the same shared
`BoardReviewPanel`. No branching prop. The deck's queue/nav logic is untouched.

### Pure helper (testability)

Extract `iterationHeadline(log)` as a pure function in `src/review/browseCore.js` (the existing
Vite-free, node-testable helpers module):

```
export function iterationHeadline(log) {
  const t = (log?.change || log?.feedback || "").trim();
  return t || "(no detail)";
}
```

Date formatting stays inline in the component (locale/timezone output is environment-dependent and
brittle to assert in a unit test; the headline-pick is the logic worth locking down).

## Data flow

Unchanged. `BrowseScreen` / `ReviewScreen` already pass `logs={logById[id] || []}` (from
`listFeedbackLog`) and `savedVerdict` into `BoardReviewPanel`. The accordion is pure presentation
over `logs`; the verdict change only edits styling/labels. No new props, no new fetches.

## Error handling

- Missing/invalid `created_at` → render no date (never "Invalid Date").
- Empty `change` and `feedback` → headline `"(no detail)"`; expanded body shows only the meta line.
- `logs` empty → the panel does not render (existing guard).
- A row with only some fields renders the parts it has; no crash on missing `node`/`source`.

## Testing

- **Unit (node, extend `scripts/test-browse.mjs`):** `iterationHeadline` — change present →
  change; change empty, feedback present → feedback; both empty → `"(no detail)"`; whitespace-only
  → `"(no detail)"`.
- **Manual smoke (`#browse` on localhost:5175, and `#triage`):**
  - Open a board with multiple `feedback_log` rows → rows are collapsed, newest first, each showing
    date + one-line headline; clicking one expands only it (full feedback/change/meta), others stay
    closed.
  - A board with a coach REVISE verdict → REVISE button is **not** pre-highlighted and has no
    `·sugg`; the coach verdict still appears in the 🤖 panel.
  - A board the owner previously saved KEEP → KEEP shows `✓` with a solid border (saved verdict
    preserved).
  - Behavior identical in the deck and the grid (shared component).

## Rollout

Additive, client-only. No migration, no schema change, no data-function change. Risk is confined
to one shared component; verify the deck looks/behaves identically apart from the intended
accordion + neutral-suggestion changes.

## Handoff to SP2 (coach auto-revise) — not in this spec

For when SP2 is brainstormed: coaches today emit verdict + notes only (`coachRow` in
`coach-core.mjs`); they do not edit JSON. SP2 must (a) have the coach produce a JSON edit, (b) gate
it through the golden-test validators before it goes live, (c) apply it to the seed unattended,
(d) append a `feedback_log` row with `source: "coach"` (already supported by `buildLogRows`, so it
renders in this accordion identically to an owner note), and (e) wipe that board's open
`coach_reviews` row **and** the owner's saved verdict so this panel resets to a fresh blank
decision. This is the "auto-revising boards" item deferred in the coach-pre-review design.
