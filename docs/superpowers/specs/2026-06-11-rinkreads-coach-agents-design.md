# RinkReads Coach Agents — Fable-5 Judgment Panel (gauntlet extension)

**Status:** design, ready for review · **Date:** 2026-06-11
**Extends:** the existing `tools/gauntlet/` coach harness and
`docs/factory/2026-06-04-gauntlet-v2-design.md` (G7 panel, G7.5 Head Coach).
**Goal:** Make the coaches that already live in `tools/gauntlet` (a) run on
`claude-fable-5`, (b) escalate solo-first under a Head Coach who gates the room, and (c) gain
a retroactive `audit` mode that assesses the recent post-wipe seeds. Low token, high payoff,
non-deterministic judgment.

---

## 1. What already exists (and what we are NOT rebuilding)

`tools/gauntlet/` already implements the coach group as prompt-driven lenses run through
`tools/lib/claude-agent.mjs` (which shells to the `claude` CLI with a `--model` flag,
defaulting to `"sonnet"`). Present and reused as-is:

- **3-coach panel** debating to unanimous PASS, plus a **Head Coach** APPROVE gate
  (`gauntlet-run.mjs`, `runPanel` + the head-coach gate). Text track and visual track.
- **`ascii-rink.mjs`** — how a coach "sees" the board (text, phone-safe).
- **`pool.mjs`** — parallel coach calls.
- **`lessons.mjs` / `lessons.json` / `visual-lessons.json`** — drop-and-learn loop.
- **`rubric.json` / `visual-rubric.json`, `prompts.mjs`, `visual-prompts.mjs`,
  `validate-mc.mjs`, `select-targets.mjs`.**

We do NOT build a parallel `.claude/agents` system. We extend this harness.

The gap between what exists and what was asked is exactly three things, which this spec adds:

1. The panel runs **every time**; we want **Head Coach solo-first**, convening the room only
   on genuine judgment calls.
2. It defaults to **sonnet**; we want **Fable 5** for the cheap, high-volume judgment passes.
3. There is **no retroactive audit** of already-shipped content; we add one.

---

## 2. Two constraints that shape everything

1. **Non-deterministic judgment.** The coaches are professionals, not rubric-fillers. The
   plumbing is fixed; the verdicts are theirs. We never script what they decide.
2. **Low token, high payoff.** Fable 5 for every coach call; the panel sits downstream of the
   free deterministic checks (lint / validate / solver); solo-first escalation so most items
   cost roughly one call.

---

## 3. The escalation model — "Head Coach gates the room"

This is a new orchestration path layered over the existing panel functions.

```text
item packet (ascii-rink board + answer/breakdown + age + curriculum tag)
  -> head-coach reviews SOLO (1 Fable-5 call)
       her first judgment: do I need the room?
         clear  -> her verdict stands           (done, ~1 call)
         unsure -> convene the existing panel:
                     reuse runPanel (text) / hockey + visual panels (geometry)
                   -> head-coach reconciles      -> final verdict
```

- The Head Coach decides whether to convene. That decision is itself a coaching judgment, so
  the escalation stays non-deterministic.
- When convened, we reuse the existing `runPanel` / visual-panel functions unchanged, so the
  specialists, the ascii-rink view, and the parallel `pool` all come for free.
- Reconciliation follows the existing Head Coach behavior: she weighs a lone nitpick against
  passes rather than averaging.

---

## 4. Fable 5 wiring

`claude-agent.mjs` already takes `model`. We thread a single configurable default so the coach
calls use `claude-fable-5` (CLI alias confirmed at build time; fall back to the full id if the
short alias is not accepted). A `--model` / env override stays available for A/B and for
pinning the Head Coach higher than the specialists if ever wanted. No other call-site changes:
the harness, retries, and JSON-unwrapping are untouched.

---

## 5. Audit mode — retroactive pass over recent seeds

A new entry `tools/gauntlet-audit.mjs` (`npm run gauntlet:audit`). It reuses the same coaches
and the same Head-Coach-gates escalation; only the input source and the verdict verb differ.

**Scope (locked):** all post-wipe seeds in `src/scenario/seeds/*.json` (~23 as of
2026-06-11). **Excluded:** the 148-question `bank.json` (the bulk old bank) and
`povQuestions.json` (dated 2026-05-02). A `--since DATE` / `--band` / `--limit` flag can narrow
a run.

**Flow per seed:**

1. Load the seed; build the standard coach packet via `ascii-rink.mjs` (+ the solver answer /
   `breakdown` where the seed is geometric).
2. Run the Head-Coach-gates escalation (§3).
3. Head Coach returns an assessment verb instead of a ship verb:
   - **KEEP** — sound as is.
   - **REVISE** — fixable; the note says what (wording, distractor, wrong/absent diagram,
     age-fit). The visual panel may attach a concrete geometry fix.
   - **RETIRE** — not salvageable for this band.

**Outputs:**

- One report `docs/factory/coach-runs/audit-YYYY-MM-DD.md`, grouped by age band: each seed's
  verb, confidence, the reconciliation note, and whether the room was convened.
- REVISE and RETIRE items routed to the existing founder review queue (the `#review`
  store / `review-queue.json`), so fixes land where Thomas already triages.
- Nothing is auto-edited or auto-deleted; the audit only assesses and queues.

---

## 6. Implementation surface

- `tools/lib/claude-agent.mjs` — default model -> `claude-fable-5` (configurable; small change).
- `tools/gauntlet-run.mjs` — add the Head-Coach-solo-first gate function and a flag to use it
  (the existing always-panel path stays available).
- `tools/gauntlet-audit.mjs` — NEW. Enumerates post-wipe seeds, builds packets, runs the
  escalation, writes the report, routes REVISE/RETIRE to the review queue.
- `package.json` — `gauntlet:audit` script.
- `docs/factory/coach-runs/` — report output directory (new).
- Reuses: `ascii-rink.mjs`, `pool.mjs`, `lessons.mjs`, `rubric.json`, `prompts.mjs`,
  `visual-prompts.mjs`, the `#review` queue store. No schema changes.

---

## 7. Testing and validation

- **Escalation unit test:** a clear-pass seed resolves solo (no panel call); a deliberately
  weak seed convenes the room. Assert the Head Coach convened only on the hard one (mock the
  agent layer as the existing `*.test.mjs` files already do via `opts.mockFail`).
- **Audit smoke run:** run `gauntlet:audit --limit 2` against two real seeds on Fable 5,
  confirm a grouped report is written and REVISE/RETIRE items reach the queue.
- **No change to existing tests:** the panel, ascii-rink, pool, lessons, and validator tests
  stay green; the new gate is additive.
- Keep the run cheap: Fable 5 + solo-first means ~23 seeds is roughly 23 calls plus a few
  convened panels.

---

## 8. Out of scope (this spec)

- The 148-question `bank.json` and `povQuestions.json` (the old content) — explicitly not
  audited per Thomas (2026-06-11).
- Other gauntlet gates not already built (misconception distractors, kinematic solver,
  diversity / reading-level gates, telemetry loop G10).
- Auto-applying fixes. The audit assesses and queues; a human (or a later pass) edits.

---

## 9. Decisions locked (2026-06-11)

- **Build approach:** extend the existing `tools/gauntlet` harness; do not build a parallel
  `.claude/agents` panel.
- **Model:** coaches run on `claude-fable-5` (configurable default in `claude-agent.mjs`).
- **Escalation:** Head Coach gates the room — solo-first, convene the existing panel only on a
  genuine judgment call, then reconcile.
- **Audit scope:** all post-wipe seeds (~23) in `src/scenario/seeds/`; KEEP / REVISE / RETIRE;
  report to `docs/factory/coach-runs/`, REVISE/RETIRE to the review queue. Old bank and
  povQuestions excluded.
- **Judgment:** non-deterministic; the harness is fixed, the verdicts are the coaches'.
