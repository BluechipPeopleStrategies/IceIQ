# Coach Auto-Revise — Design

- **Date:** 2026-06-13
- **Status:** Approved design, ready for implementation planning
- **Project:** IceIQ / RinkReads
- **Builds on:** `2026-06-12-coach-pre-review-design.md` (coach reviews + feedback_log + resolve loop),
  `2026-06-13-review-panel-accordion-neutral-verdict-design.md` (SP1; the accordion that renders the record)
- **Is:** SP2 of the review-loop work. SP1 (review-panel UX) shipped separately.

## Goal

Let the AI coaches' revisions go **live without the owner pre-approving them**, while keeping a
permanent record that reads exactly like an owner revision note, and resetting the board's verdict
so the owner re-decides on the new version. A coach REVISE becomes a real edit to the scenario
seed; a coach RETIRE archives the board. The owner is no longer the gate *before* a change ships;
they are a reviewer *after*, with a full audit trail.

Today the coaches only emit `{verdict, confidence, notes}` (`auditScenario` →
`tools/lib/coach-core.mjs:coachRow`). They never produce an edit. This builds the missing
edit-generation + safe-apply + record + reset loop. It is the "auto-revising boards" item
explicitly deferred in the coach-pre-review design.

## Decisions (locked)

| Decision | Choice |
|---|---|
| Edit generation | **Constrained structured edit (B).** The LLM returns only the fields it changes + a one-line change summary; deep-merge onto the original, then validate. |
| Unsafe edits | **Best-effort + mark.** Apply an edit only if it produces **zero hard validator errors**; warnings are allowed but the board is marked ⚠ in the report. Hard-error or ungeneratable fixes → leave the board flagged REVISE (nothing written). |
| RETIRE | **Auto.** A coach RETIRE archives the seed to `seeds/_retired/` (recorded + git-committed), no approval. |
| Trigger | **Separate step.** A new `npm run coach-revise` consumes boards already judged REVISE/RETIRE in `coach_reviews`. `coach-review` stays read-only (judging only). Re-runnable without paying to re-judge. |
| Record | Append a `feedback_log` row with `source: "coach"` (renders in the SP1 accordion identically to an owner note). |
| Reset | Delete the board's `coach_reviews` + `scenario_reviews` rows (same as `resolve-feedback`) so the verdict goes blank and the board re-enters the decision pool on its new version. |
| Retired exclusion | Free: the app globs `./scenario/seeds/*.json` (top-level only), so an archived board drops out of Browse/Triage entirely. No filter needed. |
| Git | Auto-commit the seed edits/retirements per run (one commit, affected ids listed). Never auto-push. |
| Safety preview | `--dry-run` previews diffs + validator results + the would-be report without writing, committing, or wiping. |

## Architecture

```
 npm run coach-revise [--dry-run] [--ids a,b] [--limit N]
   │
   ├─ load open coach_reviews where verdict ∈ {revise, retire}   (Supabase, service role)
   ├─ load the matching seeds from src/scenario/seeds/*.json      (loadSeeds, like gauntlet-audit)
   │
   └─ for each board:
        REVISE → buildRevisePrompt(scenario, ascii, node, concept, coachNotes)
                 → runAgent() → { change, edit }
                 → applyEdit(scenario, edit)                       (pure deep-merge)
                 → runHockeyValidators(edited) → { errs, warns }
                    • errs empty  → write seed file; warns → mark ⚠
                    • errs present→ retry once; still errs → leave flagged (skip)
        RETIRE → move seed file to src/scenario/seeds/_retired/
        applied/retired:
                 → append feedback_log { source:"coach", change, feedback:coachNotes }
                 → delete coach_reviews + scenario_reviews for the board   (RESET)
                 → record in run report
   │
   ├─ write docs/factory/coach-revise-<date>.md  (per-board: action, change, errs/warns, diff)
   └─ git add seeds + _retired; git commit "chore(seeds): coach auto-revise <date> (<ids>)"   (skip on --dry-run)
```

The loop stays closed: an edited board's `board_hash` changes and its coach row is wiped, so the
next `coach-review` re-judges the new version (its `--since` already keys on `board_hash`).

## Components

Split pure logic (node-testable, no Supabase / no fs) from the runnable script, mirroring how
`tools/lib/coach-core.mjs` is pure and `scripts/resolve-feedback.mjs` does I/O.

### New pure module — `tools/lib/auto-revise-core.mjs`
- `applyEdit(scenario, edit)` → a new scenario object. Deep-merges `edit` onto `scenario`:
  plain objects merge recursively; **arrays are replaced wholesale** (so to change one actor the
  LLM must return the full `actors` array); scalars overwrite. Never mutates the input. Pure.
- `decideApply({ errs, warns })` → `"apply" | "apply-marked" | "reject"`:
  `errs.length` > 0 → `reject`; else `warns.length` > 0 → `apply-marked`; else `apply`.
- `buildReviseLogRow({ scenario_id, node, change, coachNotes, priorMaxIteration })` → a single
  `feedback_log` row `{ scenario_id, node, iteration, source:"coach", feedback:coachNotes, change }`
  with `iteration = priorMaxIteration + 1`. (A coach-only analogue of `coach-core.buildLogRows`.)
- `reviseReport(entries)` → the markdown string for the run report (grouped/listed by board,
  each with action, change summary, errs/warns, and a unified-ish diff of changed fields).

### New prompt — `tools/gauntlet/revise-prompt.mjs` (or add to `visual-prompts.mjs`)
- `buildRevisePrompt({ scenario, ascii, node, concept, notes, errs, warns })` → the system+user
  prompt. Instructs: address ONLY what the coach notes raise; preserve voice and untouched fields;
  return strict JSON `{ "change": "<one-line summary>", "edit": { <only the changed top-level
  fields, full arrays where an array changes> } }`. Includes the scenario JSON, the ASCII rink, the
  node/concept, the coach notes, and the current validator errs/warns as context.

### New script — `scripts/coach-revise.mjs`
Owns Supabase (service-role, reuse the `.env` loader from `resolve-feedback.mjs`), seed-file
load/write/move, `runAgent` calls, the report write, and the git commit. Flags: `--dry-run`,
`--ids <csv>`, `--limit <n>`. Orchestration only — all transforms come from `auto-revise-core.mjs`.

### Reused as-is
`runAgent` (`tools/lib/claude-agent.mjs`), `runHockeyValidators` (`src/scenario/validators.js`),
`asciiRink` + `loadSeeds` + node/concept resolution (`tools/gauntlet-audit.mjs` internals),
`boardHash` (`src/review/reviewCore.js`), the `coach_reviews` / `scenario_reviews` / `feedback_log`
tables, and the SP1 accordion that renders the `source:"coach"` row.

### New npm script
`"coach-revise": "node scripts/coach-revise.mjs"` in `package.json`.

## Data flow & ordering (atomicity)

Per board, do the destructive steps **only after** the durable one succeeds, so a mid-failure never
leaves a board both un-edited and un-flagged:

- **REVISE applied:** (1) write the seed file; (2) append `feedback_log`; (3) delete
  `coach_reviews` + `scenario_reviews`. If (1) fails → leave flagged, record error. If (2)/(3) fail
  → record error, exit non-zero (the seed is written; the open rows simply remain, so a re-run is
  safe).
- **RETIRE:** (1) move the seed into `_retired/`; (2) append `feedback_log`; (3) delete the open
  rows. Move first so a failure can't wipe the verdict while leaving the board live (which would
  surface it as "unreviewed").
- **REVISE rejected (hard errors after retry):** write nothing, keep the `coach_reviews` row, record
  it flagged.

Idempotent: the script only acts on boards that still have an open `coach_reviews` REVISE/RETIRE
row; applying wipes that row, so a re-run is a no-op for already-handled boards.

## Retired-pool visibility

Retired seeds are **moved, not deleted** — recoverable from `seeds/_retired/`, the per-run report
(`docs/factory/coach-revise-<date>.md`), and git history. That satisfies "let me dig into the
retired pool later." A dedicated in-app retired-pool view is **deferred** (a future Browse filter
that globs `_retired` could surface it; out of scope for v1).

**Cache caveat:** `loadQB` caches the composed bank in `sessionStorage` (`rinkreads_qb_cache_v27`).
A retire only disappears from a running tab after the next app reload (dev HMR rebuilds the glob; a
returning session reads its cached bank until then). Operationally fine for desk use; if it becomes
annoying, bump the cache key when seeds change. Not a build item for v1.

## Error handling

- `runAgent` already retries the `claude` CLI 3× with backoff. If it still fails or returns
  unparseable JSON for a board → leave flagged, record the error, continue, exit non-zero.
- Edit fails hard validators → one regeneration attempt; still failing → leave flagged.
- Supabase or fs write failure for a board → record the id, continue other boards, exit non-zero so
  it's visible.
- `--dry-run` performs every read + generation + validation but no writes, no git, no wipes; it
  prints/writes the report to a `*.dryrun.md` name so a preview never clobbers a real report.

## Testing

- **Unit (node, new `scripts/test-auto-revise.mjs`, plain `check()` harness like `test-browse.mjs`):**
  - `applyEdit`: replaces a named scalar, deep-merges a nested object, replaces an array wholesale,
    leaves untouched fields intact, does not mutate the input.
  - `decideApply`: errs → reject; warns only → apply-marked; clean → apply.
  - `buildReviseLogRow`: iteration = prior+1; `source:"coach"`; feedback = coach notes; change set.
- **Validators are the gate, already covered** by `src/scenario/validators.js`; the test asserts
  `decideApply` consumes their `{errs,warns}` shape correctly (fixture in/out), not the rules.
- **Manual smoke:**
  1. `coach-review` a few boards to seed REVISE/RETIRE rows.
  2. `npm run coach-revise -- --dry-run --limit 3` → report shows proposed diffs + validator results;
     no files/commits/wipes.
  3. `npm run coach-revise -- --limit 3` → seed files updated / one moved to `_retired/`;
     `feedback_log` rows appear; open `#browse` on an edited board → SP1 accordion shows the
     `Coach:` entry, verdict is blank; the retired board no longer loads after reload; one git commit
     lists the affected ids; report written.

## Scope (YAGNI)

**In v1:** `coach-revise` step; constrained-edit generation (B); validator-gated best-effort apply
with ⚠ marking; auto-RETIRE archive; `feedback_log` record (`source:"coach"`); verdict reset;
per-run markdown report; per-run git auto-commit; `--dry-run` / `--ids` / `--limit`.

**Deferred:** in-app retired-pool view; per-lens edit rationale; multi-iteration auto-revise in one
run (v1 does one edit per board per run — the next `coach-review`/`coach-revise` cycle handles the
next pass); folding revise outcomes back into `visual-lessons.json` (the existing `render-pass-log`
already bridges `feedback_log` → lessons); auto-push.

## Open items / confirm during implementation
- Exact shape the LLM must emit for `edit` on each interaction kind (place/point/selection/path/mc) —
  pin in the prompt with one example per kind so deep-merge + arrays-wholesale behaves.
- Whether `coach-revise` should also act on boards whose coach REVISE has no actionable notes
  (e.g. notes are praise) — default: if generation yields an empty/no-op `edit`, leave flagged.
- Reuse `gauntlet-audit`'s node/concept resolver for every board id (confirm coverage).
