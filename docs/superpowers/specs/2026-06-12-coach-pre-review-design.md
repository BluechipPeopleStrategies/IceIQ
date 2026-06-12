# Coach Pre-Review + Resolve/Pass-Log Loop — Design

- **Date:** 2026-06-12
- **Status:** Approved design, ready for implementation planning
- **Project:** IceIQ / RinkReads
- **Builds on:** `2026-06-11-mobile-scenario-review-design.md` (the `/#triage` deck)

## Goal

Put the **judgment coaches in front of the human reviewer.** The non-deterministic LLM coach
lenses (head coach + spatial / antagonistic / kid-clarity / hockey panels) pre-review every
visual board and leave verdict + notes, so the owner is the *final* gate on coach-screened
boards instead of the first line of defense. Then close the loop: when feedback is implemented,
**wipe** the board's open feedback but **append** what was incorporated to a permanent,
iteration-aware **pass log** keyed by question type — so nothing the owner said is ever lost and
the record feeds the generator's learning.

## Decisions (locked)

| Decision | Choice |
|---|---|
| Deck behavior | **Both**: coach verdict + notes inline, coach verdict pre-selected as a *suggestion*, plus a "flagged-only" toggle. |
| Storage / delivery | **Supabase** tables (deck reads them live on the phone; re-runnable without a redeploy). |
| What the coaches see | Scenario **JSON + ASCII rink** (reuse `asciiRink`); **no image rendering**. |
| Coach engine | Reuse the existing gauntlet (`auditScenario` + panels) via the **`claude` CLI** wrapper (`tools/lib/claude-agent.mjs`). No new AI, no new dependency. |
| Pass log | **Append-only**, keyed by question type (`nodeId`/concept), iteration-aware. Wipe clears only the *open* feedback, never the log. |
| Scope | Visual board scenarios (the deck's set). Text-MC retro-audit deferred. |

## Architecture

```
 DESK
   npm run coach-review ──(claude CLI: head coach → convene panels)──► verdict+confidence+notes
        │                                                                     │
        └── reuses tools/gauntlet-audit.mjs internals (asciiRink, auditScenario, node/concept)
                                                                              ▼
                                                       Supabase: coach_reviews  (open coach take)
 PHONE / DECK  (/#triage)
   fetch coach_reviews + scenario_reviews + feedback_log
     ├─ 🤖 Coaches panel (verdict + notes), coach verdict pre-selected as suggestion
     ├─ "Previously incorporated" panel  ◄── feedback_log (per scenario_id, all iterations)
     └─ "flagged-only" toggle
   you confirm/override ─► scenario_reviews (open human take)

 IMPLEMENT  (desk: I fix the JSON; golden-test validators gate it)
   npm run resolve-feedback --ids <fixed boards>
     ├─ append to feedback_log {scenario_id, node, iteration, date, source, feedback, change}  (PERMANENT)
     └─ delete the board's rows in scenario_reviews + coach_reviews  (WIPE the open flag)
   npm run render-pass-log ─► docs/factory/feedback-pass-log.md  +  folds into visual-lessons.json
```

The loop: **flag (coaches + you) → implement → wipe open / append pass log → log feeds lessons →
coaches + generator sharpen.** A board's feedback is single-use; the lesson is permanent.

## Phase A — Coach pre-review

### A1. The run — `npm run coach-review`
Extend `tools/gauntlet-audit.mjs` with a `--sink supabase` flag (and add the `coach-review`
package script pointed at the deck's board set). It already loads `src/scenario/seeds/*.json`,
resolves `node`/`concept` from `nodeId`, builds the ASCII rink, and runs `auditScenario(...)`
→ `{ verdict: KEEP|REVISE|RETIRE, confidence, notes[], convened }`. The new sink **upserts**
each result into `coach_reviews` with a `board_hash` (from `reviewCore.boardHash`) so we know
which board version was judged. Flags: `--ids`, `--limit`, `--band`, `--since` (only re-judge
boards whose `board_hash` changed since their last coach review).

### A2. Table — `coach_reviews`
`scenario_id` (unique) · `verdict` (`keep|revise|retire`) · `confidence` (real) · `notes` (text) ·
`convened` (bool) · `board_hash` (text) · `model` (text) · `reviewed_at` (timestamptz).
RLS: readable by the owner allowlist (same pattern as `scenario_reviews`); written via the
service-role key by the script (not the client).

### A3. Deck integration (`ReviewScreen` / `ReviewBoard`)
- **🤖 Coaches panel** under each board: verdict badge + the coach notes.
- **Pre-select**: if you have no saved verdict yet, the coach's verdict button shows a
  *suggested* treatment (outline + "suggested" label) — distinct from the solid ✓ of your own
  saved verdict, so it stays clear without relying on color.
- **Flagged-only toggle** in the header: limit the deck to boards where the coach verdict ≠ keep.
- **Stale flag**: if `coach_reviews.board_hash` ≠ the board's current hash (you edited it since),
  show "coach review out of date — re-run `coach-review`."

## Phase B — Resolve + pass log

### B1. Table — `feedback_log` (append-only, permanent)
`id` (uuid) · `scenario_id` · `node` (text, the question type) · `iteration` (int — per resolve
event, shared by all rows from the same resolve) · `source` (`owner|coach`) · `feedback` (text —
what was raised) · `change` (text — what was done) · `created_at`. Never deleted.
`iteration` = (max prior `iteration` for that `scenario_id`) + 1.

### B2. Resolve — `npm run resolve-feedback --ids <list>`
For each fixed board: (1) read its open `scenario_reviews` (owner note) + `coach_reviews`
(coach notes); (2) **append** a `feedback_log` row **per source** (owner and/or coach) that had
open feedback — all sharing one iteration number — each capturing its feedback + a one-line
`change` summary; (3) **delete** the board's `scenario_reviews` + `coach_reviews` rows (wipe the
open flag). The board thus drops out of the deck/worklist as outstanding, but its
history is preserved.

### B3. Deck — "Previously incorporated" panel
On any board with `feedback_log` rows, show them above the note field:
`Previously incorporated (iteration 1, 2026-06-12): "only one option" → added a second read.`
This is the "don't lose what I put in" guarantee — on the second iteration you see what round one
already addressed, so new feedback builds on it.

### B4. Learning bridge — `npm run render-pass-log`
Renders `feedback_log` → `docs/factory/feedback-pass-log.md` grouped by question type, and folds
new entries into the gauntlet's `tools/gauntlet/visual-lessons.json` so the coaches + generator
improve at that question type. (Manual/opt-in trigger in v1; not automatic.)

## Data model summary

| Store | Meaning | Lifecycle |
|---|---|---|
| `scenario_reviews` | Owner's **open** verdict + note | wiped on resolve |
| `coach_reviews` | Coaches' **open** verdict + notes | wiped on resolve; regenerated by re-running coach-review |
| `feedback_log` | **Permanent** record of incorporated feedback, by type, by iteration | append-only, never wiped |

"Open feedback" = a row in `scenario_reviews` or `coach_reviews`. "Wipe" = delete those open
rows for a resolved board. The pass log is the only durable record and the only thing that feeds
lessons.

## Error handling
- Coach run: `runAgent` already retries the `claude` CLI (3×, backoff). A board that still
  errors is recorded `verdict=revise, notes=["coach error: …"]` rather than skipped.
- Supabase write failure in a script: log the id, continue, exit non-zero so it's visible.
- Deck: missing coach review for a board → no coach panel (graceful); missing `feedback_log` → no
  prior panel. Never blocks review.
- `resolve-feedback` is idempotent: re-running on an already-resolved id appends nothing new if
  there are no open rows.

## Testing
- **Unit (node golden):** `iteration` numbering; the resolve transform (open rows → log entry +
  delete set); the `--since` board_hash diff; pass-log markdown grouping by node.
- **Migrations** apply clean; RLS denies cross-user reads.
- **Manual smoke:** `coach-review --ids <3 boards>` → rows in `coach_reviews`; open the deck →
  coach panel + pre-select + flagged toggle; fix one board, `resolve-feedback` → `feedback_log`
  row appears, open rows gone, deck shows "previously incorporated."

## Scope (YAGNI)
**In v1:** coach-review run → `coach_reviews`; deck coach panel + pre-select + flagged toggle +
stale flag; `feedback_log` + `resolve-feedback` (wipe + append); "previously incorporated" panel;
`render-pass-log` → markdown + lessons fold.
**Deferred:** auto-revising boards (coaches editing JSON unattended); per-lens breakdown in the
deck (v1 shows the aggregated head-coach verdict + notes, panel notes included when convened);
fully automatic lesson consolidation; text-MC retro-audit.

## First run = your 20
Point `coach-review` at the current bank, then open the deck: do the coaches independently catch
the same things you flagged on those 20? Each board where you and the coaches agree is calibration;
each disagreement is the richest training signal for the rubric.

## Open items / to confirm during implementation
- Resolving `node`/`concept` for every seed from `nodeId` (reuse the audit's existing resolver;
  confirm coverage for all deck boards).
- Whether `resolve-feedback` runs standalone or is folded into the step that applies a fix.
- Reuse `pull-reviews`' `.env` loader for the new scripts' service-role key.
