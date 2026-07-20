# Question Dashboard — Design

**Status:** design, ready for review · **Date:** 2026-06-13
**Origin:** Thomas wants one place to find any question (especially **player-flagged**
ones from the live app), look at it, and **edit it in place**, across every question
type — the scenario boards AND the legacy text bank. "How we ship it" is part of the
design.

**Approved decisions:**
- **Edit + ship = DB-backed overrides.** Editing writes an override row to Supabase; the
  app layers it on the base question at runtime, so a fix is LIVE instantly (no rebuild,
  works from the phone). Overrides get baked back into the source files periodically.
- **Scope = everything**, scenario boards + the text bank, in one dashboard.

This evolves the existing `#browse` grid into the dashboard; it does not start from scratch.

---

## 1. What already exists (reuse, don't rebuild)

- **Player flags:** `question_reports` (migration 0002) — players report a question in the
  app (`question_id`, `reason`, `detail`, `resolved`). This IS the flag feed.
- **Owner/coach review:** `scenario_reviews`, `coach_reviews`, `feedback_log`.
- **Overrides hook:** `applyOverride(question)` already merges a local override onto a bank
  question at render/scoring time (App.jsx). We formalize its source to the DB.
- **The grid:** `#browse` (BrowseScreen) — filters, open a board, verdict/note, auto-advance.
- **Two question sources:** scenario **seeds** (`prompt`/`mc`/`correct`/`actors`) and the
  text **bank** (`sit`/`opts`/`ok`/`d`). Field names differ — the dashboard normalizes them.

## 2. Unified question model

A pure normalizer feeds the dashboard one list regardless of source:

```js
// reviewData / a new questionsData.js
// { id, source: "seed"|"bank", typeLabel, level, nodeId, stem, board, raw }
//   - stem   = scenario.interaction?.prompt || scenario.mc?.stem || bank.sit
//   - board  = the scenario object if it has a rink board, else null (text-only)
//   - typeLabel via questionTypeLabel(), extended for bank text-mc
```

The grid renders a **board thumbnail** when `board` is present (today's tiles) and a
**text card** (stem + type chip) when it's text-only. So every question type shows.

## 3. Flags surfaced in the dashboard

Aggregate a flag state per question from three feeds:
- **🚩 Player-flagged** — has an unresolved `question_reports` row. (Owner needs to read all
  reports: add an owner-email select policy, or reuse the admin read path from
  migration 0012. A `pull-reports` worklist already-style script can back it if needed.)
- **🤖 Coach-flagged** — `coach_reviews.verdict != keep` (today's filter).
- **⚠ Mine** — my `scenario_reviews` revise/retire (today's filter).

Filter chips gain **Player-flagged**; tapping it shows exactly the questions players
reported — the core "find the flagged one" path. The opened question shows the report
reason/detail so you know what the player objected to.

## 4. Overrides — edit in place, live (Phase 2)

`question_overrides` table:

```sql
question_id text primary key,
patch jsonb not null,           -- partial fields to merge over the base question
editor_email text not null,
updated_at timestamptz
```

- **Apply at runtime:** `applyOverride(q)` is extended to merge `overrides[q.id].patch`
  over the base (seed or bank) question. Edits are live the moment they're saved — the app
  and the dashboard both read through `applyOverride`.
- **Edit form (per type):** text fields first — stem/prompt, options, correct/ok, feedback,
  tip. Saving upserts the override `patch` (only the changed fields). Validates against the
  schema + (for scenarios) `runHockeyValidators` before allowing save.
- **Resolve the flag:** saving an edit can mark the `question_reports` row(s) resolved.

## 5. Ship / bake-back

Overrides are already "shipped" (read at runtime). To keep the **source canonical and
version-controlled**, a `scripts/bake-overrides.mjs` merges each override patch into its
seed/bank entry, clears the override row, and leaves a git commit. I run it periodically;
nothing the user does waits on it. Optionally the dashboard shows "N live overrides not yet
baked" so we know what's pending.

## 6. Phases

- **Phase 1 — Find + View, unified (delivers the core ask):**
  1. `questionsData.js` normalizer over seeds + bank.
  2. Grid renders text cards for non-board questions; `questionTypeLabel` extended.
  3. **Player-flagged** filter from `question_reports` (+ show the report reason on open).
  4. Owner read path for all reports (policy or pull).
- **Phase 2 — Edit in place + overrides (live):**
  5. `question_overrides` table + `applyOverride` reads the DB.
  6. Edit form (text fields) → upsert override → live; validate before save; resolve flags.
  7. `bake-overrides.mjs` + a "pending overrides" indicator.
- **Phase 3 — Richer editing:** drag actors / geometry edits for boards; bulk resolve;
  the generator + request queue feed straight into the dashboard.

## 7. Non-goals (for now)

- Moving ALL questions into the DB (we keep bundled seeds/bank as the base; overrides layer
  on top — chosen over the full-DB rebuild).
- A separate public admin app — this lives in the existing owner-gated `#browse`.
- Editing curriculum/node structure.

## 8. Open questions

1. Reading all `question_reports` as owner: add a `select using (email = owner)` policy, or
   pull server-side into a worklist? (Policy is cleaner for a live dashboard.)
2. Do flagged **bank** questions and flagged **scenario** questions both report into
   `question_reports` today, or only one? (Determines Phase 1 coverage — verify the
   `question_id`s players actually report.)
3. Should an edit that fails validation be blocked, or saved as a draft override that's
   flagged invalid? (Lean: block save, show the validator errors inline.)
