# Mobile Scenario Review Tool — Design

- **Date:** 2026-06-11
- **Status:** Approved design, ready for implementation planning
- **Project:** IceIQ / RinkReads (youth-hockey decision trainer)
- **Author:** Thomas Slifka (with Claude)

## Goal

Let the owner review scenarios *en masse from a phone* — see each board's diagram,
give a fast verdict plus an optional spoken note, and feed that back into the repo so
the scenarios get better over time. Today there is no UI for collecting human feedback
on boards; the gauntlet only hears internal coach audits.

## Decisions (locked)

| Decision | Choice |
|---|---|
| Scope | **Visual board scenarios only** (boards that render a rink diagram), not the text-only MC bank. |
| Feedback captured | **Triage:** `Keep` / `Revise` / `Retire` + an optional note (phone keyboard mic = voice). |
| Sync / storage | **Supabase** table; a dev script pulls feedback into the repo. |
| Architecture | **Approach A:** a lazy `/review` route inside the existing React app, rendering each board **live** from JSON via the real `RinkStage` renderer (no pre-baking, no staleness). |

Rejected: a standalone `public/review.html` (can't reuse the React renderer → drift/staleness)
and pre-baked SVG review (re-bake needed after every edit).

## Architecture overview

```
 Phone (ice-iq.vercel.app/review)
   └─ ReviewDeck (owner-gated)
        ├─ reviewData.js   → qbLoader → filter hasBoard() → ordered list
        ├─ ReviewBoard     → RinkStage (read-only, correct answer annotated)
        └─ triage buttons + note
              └─ reviewQueue.js → localStorage queue → Supabase `scenario_reviews`
                                                          │
 Dev machine                                              ▼
   └─ npm run pull-reviews  → reads table (service role)
        ├─ docs/ai-pipeline/_review-feedback.json   (machine fix-list)
        └─ docs/ai-pipeline/_review-worklist.md      (human worklist)
              └─ edit seed/bank JSON → golden-test validators gate the fix → board updates live
```

The loop closes on the validators added 2026-06-11: when a `Revise` is acted on, the
edited scenario must still pass `runHockeyValidators` before it ships.

## Components

### 1. `src/review/reviewData.js` — what to review, in what order
- `hasBoard(s)`: a scenario has a board if `s.type === "scenario"` and it has a `stage`
  and a non-empty `actors` array. (Bank text-MC entries without actors are excluded.)
- `loadReviewScenarios()`: calls the existing `qbLoader.loadQB()`, flattens across age
  levels, filters by `hasBoard`, returns a stable list.
- Ordering: **unreviewed-first**, then by level then `nodeId` (stable, deterministic).
  "Reviewed" = present in the reviewer's Supabase rows (or local queue).
- Optional filter: by level and/or `nodeId` for a focused session.

### 2. `src/review/ReviewBoard.jsx` — read-only live board
- Thin wrapper over `RinkStage` / `RinkReadsRink` that renders rink + actors + overlays
  **without** interaction or scoring.
- Annotates the declared correct answer so it can be judged at a glance:
  - `selection` → ring the `correct.ids` actor(s).
  - `path` → draw the correct path arrow to `correct.end`.
  - `point` → mark the target.
- Renders the copy under the board: `interaction.prompt`, `feedback.right`, and
  `tip` / `why` (tap to expand) so wording is reviewable too, not just geometry.
- Render failure (bad JSON) → show the raw scenario JSON + an error banner so the board
  can still be triaged (typically `Retire`/`Revise`).

### 3. `src/review/ReviewDeck.jsx` — the route + triage UX
- One board at a time. Header: progress (`12 / 137`) + skip.
- Body: `ReviewBoard` + age/node chips.
- Footer: a note text field (phone keyboard mic for voice) + three buttons
  `KEEP` / `REVISE` / `RETIRE`. Tapping a verdict saves and auto-advances.
- Swipe left/right = prev/next; a verdict can be changed by going back (upsert).
- Lazy-loaded route so it stays out of the main quiz bundle.

### 4. `src/review/reviewQueue.js` — resilient writes
- Verdicts are written to a `localStorage` queue first, then flushed to Supabase.
- Flush on save, on app focus, and on reconnect. Dedupe by `scenario_id` (latest wins).
- A small "N pending sync" indicator; nothing is lost on a flaky mobile connection.
- Exposes `getReviewedIds()` so the deck can compute unreviewed-first ordering offline.

### 5. Auth / gating (`src/review/reviewAuth.js` or reuse existing)
- `/review` reads the Supabase auth session (OAuth already wired in `src/supabase.js`).
- Allowlist of owner email(s) (env `VITE_REVIEW_OWNERS`, comma-separated). Not on the
  list → "not authorized" screen. Sign in once on the phone; session persists.

### 6. `scripts/pull-reviews.mjs` — phone → repo
- Node script, **service-role key** (server-side only), reads `scenario_reviews`.
- Emits:
  - `docs/ai-pipeline/_review-feedback.json` — `{ keep:[ids], revise:[{id,note,board_hash,stale}], retire:[{id,note}] }`.
  - `docs/ai-pipeline/_review-worklist.md` — a human-readable checklist grouped by verdict, newest first.
- `stale` flag set when the current scenario's `board_hash` differs from the reviewed one
  (the board changed since you reviewed it).
- Appending revise/retire notes into `tools/gauntlet/visual-lessons.json` is **manual/opt-in**
  for v1 (a `--learn` flag), not automatic.
- Added to `package.json`: `"pull-reviews": "node scripts/pull-reviews.mjs"`.

## Data model — Supabase `scenario_reviews`

New migration `supabase/migrations/<next>_scenario_reviews.sql` (current max migration is `0012`, so likely `0013`):

| column | type | notes |
|---|---|---|
| `id` | uuid PK | `default gen_random_uuid()` |
| `scenario_id` | text not null | the board id |
| `reviewer_email` | text not null | from `auth.jwt()` email |
| `verdict` | text not null | check in (`keep`,`revise`,`retire`) |
| `note` | text | optional |
| `board_hash` | text | hash of board-relevant fields at review time |
| `created_at` | timestamptz default now() | |
| `updated_at` | timestamptz default now() | |

- **Unique** `(scenario_id, reviewer_email)`; client upserts on that key (re-review overwrites).
- **RLS:** enable; policy allows `insert`/`update`/`select` only where
  `reviewer_email = auth.jwt() ->> 'email'`. No deletes from the client.
- `board_hash`: stable hash of `JSON.stringify` over sorted keys of
  `{actors, stage, interaction, correct}` (shared helper used by client + pull script).

## Data flow

1. Owner opens `/review` on phone, signs in (once).
2. Deck loads visual scenarios, unreviewed-first; renders each board live.
3. Owner taps `Keep`/`Revise`/`Retire` (+ optional spoken note) → queued locally → upserted to Supabase.
4. At the desk, `npm run pull-reviews` writes the fix-list + worklist.
5. Owner/Claude edits the flagged scenario JSON; **golden-test validators gate the change**;
   the live board reflects the fix immediately; re-review if desired.

## Error handling

- Supabase write failure → stays in the local queue, retried on focus/reconnect.
- Board render error → raw JSON + error banner, still triageable.
- Not authorized → explicit screen, no silent failure.
- `pull-reviews` with missing service-role env → clear error, exits non-zero.

## Testing

- **Unit:** `hasBoard` predicate; `boardHash` stability (same board → same hash, reordered
  keys → same hash); `reviewQueue` enqueue/flush/dedupe; `pull-reviews` grouping + `stale` logic.
- **Migration:** applies cleanly; RLS denies cross-user reads (quick policy test).
- **Manual smoke:** triage several boards on a phone, run `pull-reviews`, confirm the
  worklist matches the verdicts and notes.

## Scope

**In (v1):** `/review` deck, live read-only board with annotated answer, triage + note,
Supabase table + RLS, offline queue, `pull-reviews` script + worklist.

**Deferred:** per-lens scoring, multiple coach reviewers, automatic regeneration, dedicated
audio recording (beyond the keyboard mic), in-app inline editing of scenarios.

## Open items / to confirm during implementation

- The app's router setup (where to register the lazy `/review` route) — confirm in `src/`.
- Supabase env on Vercel: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` for the client;
  `SUPABASE_SERVICE_ROLE_KEY` for the pull script (server-side only, never shipped).
- Owner allowlist is env (`VITE_REVIEW_OWNERS`) for v1; could graduate to an `admin`-style table later.
