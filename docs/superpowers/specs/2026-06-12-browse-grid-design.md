# Browse Grid — Design

**Date:** 2026-06-12
**Status:** Approved for planning

## Goal

A persistent, owner-only screen that shows **every** board scenario as a grid of
mini-board thumbnails, filterable by flag status and age tier, so the owner can
browse the whole library anytime (not just work a one-pass queue) and tap any board
to re-verdict + leave a note. Phone and desktop stay in sync through the existing
Supabase tables.

## Why (problem)

The `#triage` deck is a one-pass queue: it loads scenarios **minus** the ones already
reviewed (`getReviewedIds()`), works through them linearly, and drops a board once a
verdict is saved. That is correct for "clear the backlog," but it cannot answer
"let me look at all of these whenever I want and make a mild tweak." There is no
way to revisit a board you already reviewed, and "flagged" is only reachable as a
toggle over the not-yet-reviewed set.

The data to support browsing already exists in Supabase (`scenario_reviews`,
`coach_reviews`, `feedback_log`). The gap is a **browse view**, not a new database.

## Non-goals (YAGNI)

- Inline editing of question text/options. Text changes still go through the existing
  note → `resolve-feedback` → `feedback_log` (pass-log) pipeline, which keeps the
  golden-test validators and the change history in the loop.
- Node-level filters or a free-text search box. Age tier + flag scope is enough for v1.
- Any change to how verdicts are stored or synced.

## Architecture

A new hash route `#browse` renders `BrowseScreen`, lazy-loaded exactly like the
existing `#triage` → `ReviewScreen`. Owner-gated inside the screen (getSession +
`VITE_REVIEW_OWNERS`), identical to the deck. Everything reuses existing data
functions and the existing board renderer.

### Data flow

On mount, `BrowseScreen`:

1. `getSession()` → resolve owner email; deny if not an owner (same gate as ReviewScreen).
2. `syncServerReviews()` → refresh the local durable map from Supabase (authoritative).
3. `loadReviewScenarios(new Set())` → **all** board scenarios, nothing excluded
   (passing an empty reviewed-set means `selectAndOrder` never moves anything to the back
   for being reviewed; order falls through to level then nodeId).
4. `listCoachReviews()` → coach verdicts keyed by `scenario_id`.
5. Build a `myVerdictById` map: for each scenario id, `getSavedReview(id)` from the
   (now server-synced) local store → `{ verdict, note }` or null.
6. `listFeedbackLog()` → set of scenario ids that have prior pass-log entries (for a
   "revised before" dot).

All six are wrapped in try/catch with `console.error("[browse] … failed")` so one
failing fetch never blanks the screen (same resilience pattern as ReviewScreen).

### Components

- **`BrowseScreen.jsx`** — owns load, filter state (`flagScope`, `ageTier`,
  `focusedId`), and layout. Renders the filter chips, the grid, and — when a tile is
  tapped — the shared `BoardReviewPanel` for that scenario.
- **`BrowseTile.jsx`** — one grid cell: a lazy-mounted mini board (RinkStage +
  the answer overlay) + a badge corner + an `age · node` caption. Uses
  IntersectionObserver to mount its SVG only when near the viewport; off-screen it is a
  same-size placeholder box so 148 boards do not all render at once.
- **`BoardReviewPanel.jsx`** — the single-board editor (board + "previously
  incorporated" panel + note field + KEEP/REVISE/RETIRE + coach panel at the bottom),
  **extracted from `ReviewScreen.jsx`** so the deck and the grid share one editor and
  behave identically. Props: `scenario`, `coach`, `logs`, `savedVerdict`, `note`,
  `onNote`, `onVerdict`. Pure presentation + callbacks; it does not own queue logic.
- **`browseCore.js`** — pure, Vite-free filter/group helpers (so node test scripts can
  import them, same constraint as `reviewCore.js`):
  - `ageTierOf(scenario)` → the scenario's first level string (e.g. `"U11"`), or `""`.
  - `ageTiers(scenarios)` → sorted unique tier list present in the library.
  - `flagOf(scenario, coach, myVerdict)` → `"coach" | "mine" | "unreviewed" | "clean"`
    (coach = coach verdict ≠ keep; mine = my verdict is revise|retire; unreviewed = no
    coach row and no my-verdict; else clean).
  - `applyFilters(scenarios, { flagScope, ageTier }, coachById, myVerdictById)` →
    filtered list. `flagScope` ∈ `all | coach | mine | unreviewed`; `ageTier` ∈
    `all | <tier>`.

### Changes to existing files

- **`src/App.jsx`** — add `if (hashRoute === "browse")` branch rendering
  `<Suspense><BrowseScreen onBack={() => { window.location.hash = ""; }} /></Suspense>`,
  with a lazy import alongside the other review screens.
- **`src/review/ReviewScreen.jsx`** — replace the inline single-board JSX (board,
  previously-incorporated, note input, verdict buttons, coach panel) with
  `<BoardReviewPanel … />`. The deck keeps its own queue/nav logic (`verdict`, `move`,
  `flaggedOnly`, the header counter); only the board-editor block moves into the shared
  component. Behavior must be unchanged.
- **`src/review/ReviewBoard.jsx`** — export `OptionsOverlay` so `BrowseTile` can render
  the same answer overlay at thumbnail scale. The thumbnail is RinkStage + OptionsOverlay
  only — no prompt/option text inside the tile (the `age · node` caption carries the
  label; the full prompt/options appear in `BoardReviewPanel` after tap). No behavior
  change to the deck.

### Filter UI

Two rows of chips at the top of `BrowseScreen`:

- Flag scope: **All · 🚩 Coach · ⚠ Mine · Unreviewed**
- Age tier: **All · U7 · U9 · U11 · U13 · U15 · U18** (only tiers actually present render).

Selected chip is gold-bordered; others are dim. Changing a filter resets scroll to top.
A small `n boards` count sits with the chips.

### Tile badges (icon + shape, never color alone — colorblind-safe)

- 🚩 coach-flagged (coach verdict ≠ keep)
- ⚠ my-flagged (my verdict revise|retire)
- ✓ I kept it
- a small ◍ dot if the board has `feedback_log` history ("revised before")

## Error handling

- Each load step independently try/caught; a failure logs and leaves that facet empty
  rather than blanking the grid.
- `BrowseTile` wraps its board in the existing `BoardBoundary` so a malformed scenario
  shows raw JSON instead of crashing the grid.
- Empty filtered result → friendly "No boards match" with a clear-filters affordance.

## Testing

- **`scripts/test-browse.mjs`** (node, like `test-review.mjs`): unit-tests the pure
  `browseCore.js` helpers against hand-built fixtures —
  `ageTierOf`/`ageTiers`, `flagOf` for each of the four states, and `applyFilters`
  across flag scopes and age tiers (including "nothing excluded" vs the deck's
  reviewed-exclusion). Wire as `npm run test:browse`.
- Manual smoke: `#browse` on desktop and phone — grid loads, filters work, lazy tiles
  fill in on scroll, tap opens the editor, a verdict saved in the grid shows up in the
  deck (same Supabase tables).

## Rollout

Additive. No migration. No change to Supabase schema or to the deck's storage. The
`BoardReviewPanel` extraction is the only edit to existing behavior and must be
verified to leave the deck visually/functionally identical.
