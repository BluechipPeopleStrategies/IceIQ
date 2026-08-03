# Art QC — Auto-Learning Visual Quality Gate

Date: 2026-07-21
Status: approved direction from Thomas ("historical quality-control issue on
the art side; build it so it's auto-learning and not dependent on me").
Companion to `2026-07-21-play-kernel-engine-design.md`. Builds the G5/G6
(render + graphic-designer) gates from `docs/factory/SPEC.md` §15 that were
designed but never built, and gives `docs/play-kernel-standards.md` — today a
prose document enforced only by Thomas's eyeball — an enforcement engine.

## The problem, precisely

Hockey-logic QC already self-improves: `src/scenario/LESSONS.md` →
GOLDEN-RULES → ~47 permanent validator rules. Mistakes became code once and
never recurred. The VISUAL layer has no equivalent: nothing checks how a play
reads on screen (clutter, labels covering the play, freeze frames leaking the
answer, illegible spacing), so every batch re-spends Thomas's judgment in a
manual playtest — the exact dependence that caps throughput. Historically the
agent-only review was also too lenient (SPEC §1: 14/15 "passed", 9 survived a
human look), so the fix cannot be "trust an LLM critic more"; it must be
"convert human judgment into permanent machine checks, and calibrate the
critic against the human until trust is earned."

## Architecture — three layers, one learning loop

### Layer 1 — Deterministic art lint (`src/play/artLint.js`) — BUILT NOW

Most historical art failures are computable from play data plus the known
render geometry, in rink feet, with zero pixels and zero tokens. Every rule
carries an id, a severity (`block` | `warn`), and PROVENANCE (which standard
or ledger lesson it encodes). Initial rules, each traceable to
`docs/play-kernel-standards.md`:

- `token-overlap` — actors closer than ~6 ft at the freeze (unreadable pileup).
- `out-of-bounds` — any position/puck off the 200×85 sheet.
- `cue-covers-actor` — a cue/label sitting on top of an actor (Cue Label Size Rule).
- `cue-label-length` — rink labels too long for U13-and-under (Cue Label Size Rule).
- `answer-leak-arrow` — a pass/shot motion in the ask node pointing at the
  correct option's target before the learner answers (Answer-Reveal Rules).
- `answer-leak-cue` — a cue marker parked on the correct destination at the
  freeze (Route-Choice Neutrality Rule).
- `puck-adrift` — puck not readable as "on the decision" at the freeze
  (Freeze-Point Rules).

Runs everywhere, free: a `test:art-lint` gate over the whole live catalog
(zero blocks tolerated) and inside `report:kernel-expansion` so no kernel
candidate reaches the ready tray without being art-clean.

### Layer 2 — Rendered-frame critic (NEXT phase, spec only here)

For what geometry cannot judge (composition, color-alone distinction,
contrast, age-appropriate visual style): headless-render each tray survivor
to a still (the play-engine audit's parked "headless still exporter";
Playwright screenshot of the existing preview route), then a vision critic
scores it against a machine-readable rubric generated from
play-kernel-standards. Strict policy: the critic can only REJECT or QUEUE,
never auto-ship past Layer 1. Token cost is bounded: it runs only on novelty-
gate survivors (4 per 48 today, never the full space).

### Layer 3 — The learning loop (the actual answer to "not dependent on me")

`docs/factory/art-lessons.json` is the ledger. The protocol, applied every
time a human (or later the critic) rejects or fixes a visual:

1. **Capture** — one ledger entry: what looked wrong, on which play, seen by
   whom. Capturing is the only manual step and takes one minute.
2. **Promote** — the lesson becomes (a) a new deterministic `artLint` rule
   when computable — the strongly preferred path — or (b) a rubric line for
   the Layer-2 critic. The entry records `promotedTo`, so unpromoted lessons
   are visibly debt (`report` lists them).
3. **Pin** — the offending play/params becomes a golden case in
   `test:art-lint`: the class of mistake can never ship again. This is the
   same LESSONS→GOLDEN-RULES mechanic that already works for hockey logic.
4. **Calibrate** (with Layer 2) — every Thomas spot-check verdict is recorded
   against the critic's verdict per rule class. A class graduates
   review-all → sample-10% → auto only when the critic's precision proves out
   over N human agreements; a miss demotes it. Dependence on Thomas decays
   measurably, not by hope, and his remaining role — small random spot checks
   — is itself the training signal.

## What Thomas's role becomes

Not "review every batch": seed the first rubric by rejecting freely for a few
batches (each rejection permanently narrows what can fail again), then random
spot-checks at a sampling rate the calibration stats set. The system gets
stricter monotonically — rules and goldens only accumulate.

## Out of scope now

Layer-2 build (renderer + critic harness); auto-generating lint rules from
prose lessons via LLM (promotion stays a deliberate code change so the gate
stays trustworthy); applying artLint to the scenario-seed engine (different
renderer; same pattern later).
