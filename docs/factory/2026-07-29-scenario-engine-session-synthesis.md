# Scenario Engine — 2026-07-29 Session Synthesis

One night's work, four parallel research/design tracks plus one applied fix
pass. This file is the index — read this first, then follow the links for
depth. Nothing described here has been committed to git; nothing described
as a "recommendation" has been approved.

## What actually changed on disk (code, verified)

**Phase 0 of the implementation plan, done and test-verified:**

- Fixed a `.errors`/`.errs` property-mismatch bug in **three** places (the
  plan only knew about two): `scripts/report-kernel-expansion.mjs`,
  `scripts/test-play-kernels.mjs`, and `scripts/test-play-engine.mjs`
  (found during the fix pass, not in the original audit). The bug made every
  "validator-clean" check an unfalsifiable false positive — confirmed live:
  a broken play produces 13 real validator errors, but the old code read
  `undefined → []` regardless. 14/14, 25/25, 3/3 tests pass across the three
  affected suites after the fix.
- Added a proving fixture to `test-play-kernels.mjs` (duplicate actor ID)
  that locks the fix in permanently.
- Regenerated and annotated `docs/factory/kernel-expansion-report.md` — the
  48-candidates/4-survive numbers are unchanged, but now verified rather than
  unfalsifiable.
- Hashed and recorded the uncommitted defensive-zone breakout fixture's exact
  source state in `docs/factory/breakout-fixture-provenance.md`, before
  anything else touches it.

Nothing else in the plan has been built. Nothing has been committed.

## What was decided (approved by Thomas tonight)

`docs/factory/SCENARIO-ENGINE-DECISIONS.md` now holds two decision sets:

1. The original 5 design decisions (free-only Claude/Ollama split, coach-
   authoring MVP scope, tiered auto-approve, physics-as-truth, shared-core/
   separate-runtimes).
2. **9 new framework-fit decisions**, approved verbatim "Approve 1-9": canonical
   playback via `CompiledTeachingPlay`, content-addressed promoted catalog +
   append-only ledger, tactical claims stored outside `src/`, coach MVP inside
   the existing dashboard, server-owned RLS auth, Supabase-stored coach drafts,
   isolated Remotion export, Claude judgment from an attended session only,
   and a freeze list of legacy direct-write tools.

## What was planned

`docs/superpowers/plans/2026-07-29-scenario-engine-foundation-plan.md` — an
11-phase implementation plan, verified against the live repo (not guessed):
Phase 0 (done, see above) → Phases 1-3 (schemas/physics/playback, zero product
impact) → Phase 4 (tactical claims store) → Phase 5 (run envelope + one
breakout scenario through physics/tactics) → **Phase 6, the plan's central
gate: prove that one scenario end-to-end — reproducible, physically valid,
tactically justified, timing-faithful, staged safely, recallable — before any
throughput claim** → Phases 7-8 (coach MVP design, then build) → Phase 9
(compliant scheduled runner, built but left disabled) → Phase 10 (the one
measured throughput benchmark).

Seven judgment calls are flagged in the plan rather than silently resolved
(physics-parameter sourcing, exact file paths, the novelty-signature schema,
checkpoint granularity, holdout-audit mechanics, the `remotion/` scaffold's
fate, the literal coach-dashboard mount point).

## What was researched — three tracks, run in parallel tonight

### 1. Grounded inventory of what RinkReads already has

`docs/factory/rinkreads-capability-inventory-2026-07-29.md` — read-only audit
of the actual codebase. Headline finding: the free-only Claude/Ollama split
(Decision 1) assumes Ollama already does mechanical work — it doesn't. Zero
`localhost:11434` references exist anywhere in `src/` or `tools/`; every one
is in documentation. Meanwhile a real headless-Claude subprocess pattern
(`tools/lib/claude-agent.mjs`) has already run for real on 114 transcripts.
Also: per-player telemetry (an EWMA "Hockey IQ Score") and Brain Gym's
adaptive-difficulty engine both exist and are proven independently, but
nothing currently connects them to which scenario a player sees next.

### 2. Ambitious vision — what this could become

`docs/superpowers/specs/2026-07-29-rinkreads-scenario-engine-ambitious-vision.md`
— public-source research into adaptive learning engines (Duolingo, chess.com,
lichess), generative content flywheels (Mario Maker), self-improving
knowledge bases, and sports-training literature, mapped into 8 named stretch
capabilities. Standout: because Decision 2 already makes a coach's authored
play compile to the same `CompiledTeachingPlay` format as a generated
scenario, a proven coach play can graduate into a reusable template — "Course
World for hockey" — using the existing kernel-graduation bar, no new
pipeline. Paired with a "calibrated promotion ledger" that gives the
already-committed review-queue calibration a concrete mechanism. Both ride
directly on tonight's foundation work.

### 3. The templating/family-generation design (deep research workflow)

`docs/superpowers/specs/2026-07-29-scenario-family-templating-design.md` —
the piece every prior scenario-engine attempt (2026-06-04 through 2026-07-21,
five design docs, all superseded wholesale rather than iterated on) left
underspecified: how does one proven scenario become a validated family of
siblings? Built via a 9-agent research-and-critique pipeline (5 parallel
research areas, synthesis, adversarial critique, revision) rather than a
single pass.

**Key finding:** the two-on-one kernel's own source comments already say
`commit` decides the correct answer and `shape` moves it ~30ft — these are
the two *radical* (answer-determining) axes; `depth`/`mirror`/`seed`-jitter
are *incidental* (decorative). The measured "48 candidates → 4 survive"
result is the signature of exactly this problem: blind Cartesian expansion
over both kinds of axes, rescued after the fact by a coarse filter — the
same failure mode ETS documented in standardized-test item cloning (their own
48-variant benchmark had ~0.10 correlation between expert-assumed and actual
difficulty drivers).

**Concrete deliverables:** a `parameterRole` tagging scheme, a full
`NoveltySignature` schema (5-dimension MAP-Elites-style behavior grid +
continuous tiebreak fields, replacing the current per-signature cap-of-3
rule), and a new `KernelTaskModel` artifact — a versioned, reviewed-once
"family contract" sitting upstream of generation, reconciling with (not
replacing) the existing `docs/scenario-family-standards.md` and
`playFamilies.js`'s `SCENARIO_FAMILIES` registry.

**Its recommendation, requiring your approval, clearly flagged in its own
section:** keep Phase 6's gate at "prove one scenario" — do not require
proof of N-sibling generation before Phase 7 starts — but stop leaving the
family-design work to "whoever implements Phase 5" with no concrete shape;
make this document's schema/task-model design an explicit, named Phase 5
deliverable instead. The document argues the conservative "wrong answer
reaching a child" protection is fully intact either way, since every sibling
still runs through the identical per-item pipeline — what was actually
undisciplined in prior attempts was the design of templating, not the
validation of its output.

## What needs your decision now

1. **The templating design's sequencing recommendation** (above) — approve,
   amend, or reject.
2. **Which ambitious-vision capabilities (if any) to prioritize** — the
   vision doc names the coach-play-to-template flywheel and the calibrated
   promotion ledger as the two highest-leverage starting points, since both
   ride on the foundation already planned rather than requiring new surfaces.
3. **Whether to fold the templating design's Phase 5 sub-tasks into the
   implementation plan** — if you approve #1, the plan file should get an
   explicit edit naming this document, which hasn't been done (by design —
   this document doesn't self-authorize).

Nothing here is committed. Nothing here is an authorization to start Phase 1.
