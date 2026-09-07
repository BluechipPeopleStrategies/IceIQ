# Scenario Engine Foundation — Implementation Plan

**Status:** Draft — NOT YET REVIEWED OR APPROVED by Thomas. This document plans
implementation; it does not authorize it. Only the 9 framework-fit decisions
and the original 5 owner decisions that feed this plan have been approved.
**Prepared:** 2026-07-29
**Branch:** `feature/shareable-beta` (or a local branch off it, per the
standing overnight-build guardrail)

## Authority

1. `docs/factory/SCENARIO-ENGINE-DECISIONS.md` — owner decisions. Wins on conflict.
2. `docs/superpowers/specs/2026-07-29-scenario-engine-design.md` — canonical architecture.
3. `docs/handoffs/2026-07-29-codex-scenario-engine-foundation-handoff.md` — framework-fit audit this plan operationalizes.
4. `docs/roadmap/TASKS.md` — sequence/priority only.

This plan does not reopen any of the 14 approved decisions. Where it must make
a call the source docs left open, it is flagged explicitly in **Judgment
Calls**, not silently resolved.

## Verified current state (checked directly against the repo before writing this plan)

- Branch `feature/shareable-beta`, ahead of origin by 3 doc commits, HEAD `a743700`.
- Uncommitted/untracked exactly as the handoff describes:
  `M docs/factory/SCENARIO-ENGINE-DECISIONS.md`,
  `M src/play/playCatalog.js`, `M src/play/playFamilies.js`,
  `?? docs/library/dz-breakout-retrieval-under-pressure.md`, `?? remotion/`,
  `?? src/play/plays/dzBreakoutEscapePressure.js`.
- The `playCatalog.js`/`playFamilies.js` diffs are exactly the breakout's
  wiring: one import + catalog registration, and a new `dz_breakout` family
  entry plus a concept-first classifier branch. Nothing else changed in those
  files.
- `.errors`-vs-`.errs` bug confirmed real: `validateAnimatedPlay()` in
  `src/play/validateAnimatedPlay.js` returns `{ ok, errs, warns }` (line 13-14).
  `scripts/report-kernel-expansion.mjs:33` reads `a.errors`;
  `scripts/test-play-kernels.mjs:36` asserts `result.errors`. Both silently see
  `undefined || []` and report clean regardless of actual errors.
- `remotion/` is confirmed disposable scaffolding only: `node_modules`,
  `package-lock.json`, `package.json` (React 19 dependency chain vs the app's
  React 18) — no composition/render source exists yet.
- No `config/` directory and no `src/data/tactics/` directory exist yet.
- `#scenarios` route confirmed reachable pre-authorization: in `src/App.jsx`
  it returns right after the `authReady` loading gate and before any `!profile`
  check (contrast lines ~8074 vs ~8092+).
- `profiles` RLS confirmed as the gap described: `for update using (auth.uid()
  = id)` (schema.sql) has no column-level restriction, so a signed-in user can
  write their own `tier` column via a normal client update.
- `question_overrides` RLS confirmed as described:
  `for insert/update ... using (auth.role() = 'authenticated')` — any signed-in
  user, not an owner/coach check.
- `ScenarioEditor.jsx` confirmed to expose a literal "Force save" button
  (line 254) calling `save(true)`, which passes `force: true` to a direct
  write endpoint.
- `AnimatedPlay.jsx` confirmed using a literal fixed `"transition: transform
  1.4s cubic-bezier(...)"` on both actor and puck groups (lines 469, 478) —
  not validated timing.
- All six named legacy freeze-list files exist on disk today:
  `tools/review-store.mjs`, `tools/scenario-author.mjs`,
  `scripts/generate-questions.mjs`, `scripts/batch-approve.mjs`,
  `tools/seed-editor-plugin.mjs`, `tools/scenario-engine-overnight.ps1`.
- Windows Task Scheduler confirmed live right now:
  `RinkReads-ScenarioEngine-Overnight` → `State: Disabled`.
- Reusable files confirmed present and sane as described:
  `src/play/kernels/twoOnOneKernel.js` (correct-by-construction kernel,
  asserts invariants, deterministic `mulberry32` RNG), `src/play/noveltyGate.js`
  (answer-target/signature logic), `src/play/rinkAnchors.js` (`RINK`,
  `ANCHORS`, `at()`, `mirrorX()`), `src/play/motionGeometry.js`
  (`motionPoints`, `motionPathD`, `motionTimings`, `visibleMotions`).

## What this plan sequences

Eleven phases. Phases 0-6 constitute the foundation and the one proven
breakout scenario — the explicit success bar from the handoff. Phases 7-10
(coach MVP design/build, runner proof, benchmark) are gated behind Phase 6
passing and are described here at the same rigor but must not start early.

---

## Phase 0 — Cheap, independent fixes and preservation (no architecture yet)

**Goal:** Remove the two known false-safety defects and permanently preserve
the breakout fixture's exact source state, before anything in this plan
touches either.

**Tasks:**
1. Fix `scripts/report-kernel-expansion.mjs:33` and
   `scripts/test-play-kernels.mjs:36` to read `.errs` instead of `.errors`.
2. Add one deliberately-invalid animated-play fixture (e.g. a node missing a
   required `pos` entry, or a duplicate actor id) to the kernel test data and
   assert the gate now actually fails on it — proving the fix, not just the
   rename.
3. Re-run `test:play-kernels` and regenerate
   `docs/factory/kernel-expansion-report.md`; record the new counts and
   explicitly annotate the report that the prior "48/48 clean" baseline was a
   false positive under the old property name.
4. Hash-and-record the breakout fixture's exact current source state before
   any other step in this plan touches it: `git hash-object` (already computed
   during planning verification — record permanently, do not just trust the
   number in this doc) for `src/play/plays/dzBreakoutEscapePressure.js` and
   `docs/library/dz-breakout-retrieval-under-pressure.md`, plus the current
   `git diff` of `src/play/playCatalog.js` and `src/play/playFamilies.js`
   against HEAD. Write this into a new, committed record — e.g.
   `docs/factory/breakout-fixture-provenance.md` — containing the four paths,
   their blob hashes (or diff hashes for the two modified files), the HEAD
   commit they're based on, and the date. This record is the reference point
   every later phase's "did we preserve the original prototype" check compares
   against.
5. Commit Phase 0 work as its own commit(s), separate from anything else in
   this plan and separate from the breakout adaptation work in later phases.

**Files touched:**
- `scripts/report-kernel-expansion.mjs` (modify)
- `scripts/test-play-kernels.mjs` (modify)
- `docs/factory/kernel-expansion-report.md` (regenerate)
- `docs/factory/breakout-fixture-provenance.md` (create)

**Exit gate:** `test:play-kernels` fails against the new deliberately-invalid
fixture before the property-name fix and passes (correctly, i.e. fails the bad
fixture and passes the good ones) after it. The provenance record exists,
committed, with real hashes recorded, and no other file in this plan has
touched the four breakout-related paths yet.

---

## Phase 1 — Canonical artifact schemas, `RinkFrame`, and presentation adapters

**Goal:** Define the shared, versioned, content-addressed bundle
(`ScenarioDefinition` → `SimulationTrace` → `DecisionEvaluation` →
`CompiledTeachingPlay`) and the physical coordinate frame, per the spec's
"Canonical scenario bundle" and "Physical coordinate frame" sections. No
physics or tactics logic yet — this phase is schema, hashing, and coordinate
math only.

**Tasks:**
1. Choose and document the on-disk home for these schemas/modules. Recommend
   `src/scenario-engine/` (new directory, parallel to `src/play/` and
   `src/scenario/`, explicitly not inside either legacy tree) for schema
   definitions and pure functions consumed by both factory tooling and (later)
   product code; factory-only data (tactics claims, run ledgers) stays outside
   `src/` per decision 3 (see Phase 4).
2. Implement `RinkFrame`: metres/seconds, centre-ice origin, explicit
   attack-direction (`+x`/`-x`), versioned rink profile (boards, lines, goals,
   crease, playable bounds) sourced from real dimensions (NHL/IIHF-scale or
   youth-scale as appropriate — see Judgment Call: physics parameter sourcing).
3. Implement canonical serialization + content-addressed hashing shared by all
   four artifact types: deterministic key ordering, stable hash function,
   version field convention.
4. Implement `ScenarioDefinition` as a pure data schema + validator: schema
   version, scenario ID, immutable version, content hash, family, tactical
   claim version, proof mode, age/skill profile, sources, `RinkFrame`
   reference, initial actor/puck state, time-ordered intended actions, decision
   freeze, observable cues, `declaredRead`, question-kind variants,
   generation parameters, dependency versions.
5. Implement presentation-frame adapters: normalized `0..1` ↔ `RinkFrame`,
   current `200x85` play space ↔ `RinkFrame`, legacy `600x300` ↔ `RinkFrame`.
   Each adapter declares source/destination frame, mirroring, precision, and
   round-trip tolerance explicitly. Adapters may reject invalid coordinates but
   must never clamp a physics failure into legal bounds (write a test that
   proves this directly: an out-of-bounds physics coordinate must fail the
   adapter, not get silently clamped back in-bounds).
6. Write golden round-trip fixtures: convert a handful of real `200x85`
   breakout-fixture-shaped coordinates to `RinkFrame` and back, asserting
   round-trip within the declared tolerance.

**Files touched/created:**
- `src/scenario-engine/rinkFrame.js` (create)
- `src/scenario-engine/scenarioDefinition.js` (create — schema + validator)
- `src/scenario-engine/canonicalHash.js` (create — shared hashing/serialization)
- `src/scenario-engine/frameAdapters.js` (create)
- `src/scenario-engine/*.test.mjs` (create, one per module, following the
  project's plain pass/fail `node` script convention seen in
  `tools/gauntlet/*.test.mjs`)

**Exit gate:** Schemas and adapters are pure, unit-tested, importable modules
with zero product-code consumers yet. Round-trip fixtures pass within declared
tolerance. A test proves an out-of-bounds coordinate cannot round-trip back
into legal bounds. Nothing in this phase writes to `src/data/`, `src/play/`,
or `src/scenario/` — it is purely additive, new-directory work.

---

## Phase 2 — Sourced physics profiles and the Level-1 deterministic simulator

**Goal:** Build the fast, deterministic, headless hockey-kinematics simulator
the spec calls Fidelity Level 1, with versioned, sourced physics profiles per
age/skill band, and the structured-finding format.

**Tasks:**
1. Research and record sourced skater/puck parameter ranges per age/skill
   profile (acceleration, top speed, turning radius, stopping distance,
   reaction delay; puck release/travel/deceleration/reception physics). Cite
   sources explicitly in the profile file (this is Judgment Call #1 below —
   flagged, not silently invented).
2. Implement the physics-profile schema: one independently versioned document
   per {rink/rules geometry, player envelopes, skating performance, puck/ice/
   board/net parameters, age band, optional skill tier}.
3. Implement the deterministic simulator core: given a `ScenarioDefinition`,
   resolve a `SimulationTrace` — timestamped actor/puck/possession/event
   states — using a pinned solver contract (RNG algorithm+version+seed
   consumption order, fixed-step or event ordering with stable tie-breaking,
   floating-point/quantization policy, coordinate-adapter precision,
   content-addressed candidate-ID derivation, canonical trace hash).
4. Implement the structured-finding format exactly per spec: validator
   code+version, actor/puck/action IDs, event time/interval, measured value,
   threshold/range, margin, units, profile/source versions, assumptions,
   solver version, severity, `answerImpact` (`none`/`possible`/
   `changes-answer`), human explanation.
5. Implement hard-failure detectors: teleportation, impossible
   acceleration/turning/stopping, unreachable passes, illegal bounds,
   inconsistent possession, impossible event ordering, claimed-open-lane
   physically intercepted before puck arrival.
6. Implement the `UNSUPPORTED_MODEL` result path for phenomena not yet
   modeled (saucer passes, deflections, contact model) — must never fall
   through to a guessed pass/fail.
7. Write golden fixtures at just-inside/just-outside boundaries for speed,
   turning, reach, interception, board contact, and adapter precision —
   independent of the breakout fixture, general-purpose boundary fixtures for
   the simulator itself.
8. Write a determinism test: same seed + same pinned versions →
   byte-identical canonical trace hash, run twice.

**Files touched/created:**
- `src/scenario-engine/physics/profiles/<ageband>.json` (create, one or more)
- `src/scenario-engine/physics/simulator.js` (create)
- `src/scenario-engine/physics/findings.js` (create — structured finding
  builder/formatter)
- `src/scenario-engine/physics/*.test.mjs` (create)
- `docs/scenario-engine/physics-sourcing.md` (create — cites every sourced
  parameter range; this is the flagged-not-silently-invented record)

**Exit gate:** Determinism test passes (identical hash across repeated runs
with the same pinned versions). Boundary fixtures pass/fail exactly as
expected (just-inside passes, just-outside fails with a specific structured
finding, not a generic error). `UNSUPPORTED_MODEL` path has at least one test
proving it never masquerades as pass or fail. No physics constant in the
profile file lacks a cited source or an explicit "engineering estimate,
pending source" marker.

---

## Phase 3 — Declared/derived read evaluation and timing-faithful compiled playback

**Goal:** Implement `DecisionEvaluation` (tactical evaluator over a
physics-clean trace) and `CompiledTeachingPlay` (the canonical playback
artifact), plus the player/coach/video-shared deterministic clock — decision 1
from the framework-fit list.

**Tasks:**
1. Implement `DecisionEvaluation`: given a clean `SimulationTrace` plus
   whatever tactical claim(s)/kernel invariants apply (a placeholder/stub
   claim interface is fine here — Phase 4 builds the real claims store),
   compute `derivedRead`, all viable candidates, and the proof chain.
2. Implement the `declaredRead` vs `derivedRead` comparison: agreement passes
   through; a disproven declared read is a hard failure (not silently
   resolved); missing evidence or multiple unresolved reads route to
   `review-required` with the mismatch and explanation preserved on the draft.
3. Implement `CompiledTeachingPlay`: combine an approved definition, trace,
   and decision evaluation into the immutable playback artifact — resolved
   keyframes/samples, event times, question freezes, answer proof, dependency
   hashes.
4. Implement the canonical playback clock as a small, dependency-free
   module consumed by (a) a new headless/test renderer used for automated
   parity checks, and (b) — per decision 1 — a thin adapter that lets the
   existing `AnimatedPlay.jsx` (kept as-is, 1.4s CSS transitions untouched)
   optionally consume `CompiledTeachingPlay` output for new content, without
   any rewrite of the live v1 renderer. The adapter is additive; v1 legacy
   plays keep rendering exactly as they do today.
5. Write a preview/export parity test: the same `CompiledTeachingPlay`
   artifact, walked by the shared clock, produces identical position/timing
   samples regardless of which consumer (test-renderer stand-in for
   player-preview, coach-preview, or video-export) walks it — this is the
   "same deterministic clock" proof the framework-fit decision requires,
   proven here in isolation before Phase 7's real coach/video consumers exist.

**Files touched/created:**
- `src/scenario-engine/decisionEvaluation.js` (create)
- `src/scenario-engine/compiledTeachingPlay.js` (create)
- `src/scenario-engine/playbackClock.js` (create — the shared deterministic
  clock)
- `src/play/animatedPlayV2Adapter.js` (create — thin, optional; `AnimatedPlay.jsx`
  itself is NOT modified in this phase)
- `src/scenario-engine/*.test.mjs` (create)

**Exit gate:** A synthetic (non-breakout) fixture proves: physics-clean trace
→ derived read computed → declared/derived agreement enforced (both the
agree-and-pass and the disagree-and-fail paths have tests) →
`CompiledTeachingPlay` produced → shared clock produces identical samples
across two independent "consumers" in the test harness. `AnimatedPlay.jsx`
has zero diff in this phase; the adapter is new, opt-in code only.

---

## Phase 4 — Machine-readable tactical claims store and validator

**Goal:** Stand up the versioned, machine-readable tactical-knowledge layer
outside `src/` (framework-fit decision 3), with schema validation, approval
status, conflict detection, and the `test:tactics` command.

**Tasks:**
1. Choose and document the factory-only directory (outside `src/`, not shipped
   in the browser bundle) — recommend `docs/factory/tactics/claims/<claim-id>.json`
   with a generated `docs/factory/tactics/index.json`, mirroring the spec's
   provisional `src/data/tactics/...` path but relocated per decision 3. Record
   this choice explicitly since the spec left the exact path open for the
   plan to refine (Judgment Call, see below).
2. Implement the claim schema exactly per spec: stable claim ID + version,
   schema version, status (`draft`/`review-required`/`approved`/`retired`/
   `superseded`), proof mode (`kernel-derived`/`approved-claim-derived`),
   family + phase of play, age/skill applicability, observable cues +
   conditions, preferred read, invalidated reads, exceptions, source
   references + evidence confidence, linked kernel/validator IDs, approval
   status + approving authority, `supersedes` reference, dependency key.
3. Implement `npm run test:tactics`: schema validation, source-reference
   validity, status/approval-role checks (only Thomas or a named human
   reviewer can move a claim to `approved` — enforce this as a data check,
   e.g. an `approvedBy` allowlist), version-lineage integrity, hash stability,
   conflict detection (two approved claims with overlapping conditions and
   incompatible reads → conflict record, both ineligible for generation),
   linked-validator existence.
4. Author the first real tactical claim(s) needed for the breakout family
   (defensive-zone retrieval under pressure), sourced from
   `docs/library/dz-breakout-retrieval-under-pressure.md` and existing
   knowledge-base lessons (`src/scenario/LESSONS.md`,
   `src/scenario/GOLDEN-RULES-2026-06-11.md`), marked `review-required` until
   Thomas (or a named reviewer) explicitly approves them — this plan does not
   pre-approve any claim on Thomas's behalf.
5. Wire the `DecisionEvaluation` module from Phase 3 to consume real approved
   claims instead of the Phase 3 placeholder interface.

**Files touched/created:**
- `docs/factory/tactics/claims/<claim-id>.json` (create, at least one for the
  breakout family)
- `docs/factory/tactics/index.json` (create, generated)
- `scripts/test-tactics.mjs` (create) + `package.json` `test:tactics` script
- `src/scenario-engine/decisionEvaluation.js` (modify — consume real claims)

**Exit gate:** `npm run test:tactics` passes on the seeded claim set and fails
against a deliberately-broken fixture (bad reference, missing approver,
conflicting pair). At least one claim exists in `review-required` status
covering the breakout scenario's tactical read, with its source reference
traceable to `docs/library/dz-breakout-retrieval-under-pressure.md`. No claim
in the store is marked `approved` without a recorded human approver — this
plan explicitly does not self-approve.

---

## Phase 5 — Immutable factory run envelope, one family, one coach-declared fixture

**Goal:** Build the resumable, idempotent, content-addressed run/event
ledger (framework-fit decision 2), and run the breakout family plus one
coach-declared fixture through it end to end — physics, tactics, and compiled
output, but not yet hockey/pedagogy judgment or promotion (that's Phase 6's
gate 8). **Amendment (2026-07-29, post-plan):** gate 5 (novelty) is no longer
purely deterministic as originally assumed here — the judge-panel-verified
design in `docs/superpowers/specs/2026-07-29-scenario-family-templating-FINAL-viable-design.md`
(Semantic Sibling Review, "SSR") resolves novelty via ONE batched Claude call
per family run, distinct in kind and authority from gate 8's hockey-correctness
judgment: an SSR verdict can only classify a candidate as novel/redundant/
off-claim, never substitute for or lighten gate 8's independent per-instance
check. This phase's "not yet Claude judgment" framing is amended to mean "not
yet hockey-correctness judgment" specifically — flagged explicitly rather than
silently smoothed over, since the original framing predates that design.

**Tasks:**
1. Design and implement the on-disk run envelope: immutable `start.json`
   manifest created before any candidate; append-only `events.jsonl`;
   content-addressed hashed blobs for each artifact version; generated
   indexes; atomic writes; a single-instance lock file per run. Recommend
   `docs/factory/runs/<run-id>/` as the filesystem home (factory-only,
   outside `src/`, consistent with decision 3's spirit and decision 2's
   content-addressed-catalog direction).
2. Implement run-start manifest contents per spec: run ID, start/end time,
   branch, engine commit, working-tree state + config hashes, tactical/
   physics/policy/validator versions, family/kernel/parameter-space/seeds/
   requested counts.
3. Implement resumability: re-running a completed step must not duplicate
   candidates; a failed run preserves evidence and stops at the failing gate;
   generation may run in a dirty tree for exploration only if output is
   isolated (this run store is inherently isolated by construction, so this
   should be true by default — write a test proving a dirty working tree does
   not contaminate a run's recorded source-state hash).
4. Adapt the (now-preserved-and-hashed, per Phase 0) breakout prototype into
   a real `ScenarioDefinition` targeting one concrete age/skill profile. This
   is the first point in the whole plan the breakout content itself is
   touched — after Phase 0's hash-and-record step, never before.
5. Run the breakout `ScenarioDefinition` through: physics simulation (Phase
   2) → decision evaluation against the approved-or-review-required claim
   (Phase 4) → `CompiledTeachingPlay` (Phase 3). Record every step as run
   events.
6. Create deliberately-impossible variants of the breakout fixture (bad
   skating speed, impossible turn, mistimed pass, closed-lane-claimed-open)
   and run them through the same pipeline, asserting each fails with a
   specific structured finding, not a generic rejection.
7. Author one coach-declared fixture (a second, simpler scenario with a
   human-supplied `declaredRead`, distinct from the breakout, to prove the
   declared/derived comparison on non-kernel-derived input) and run it
   through the same envelope.
8. Wire the gate order from the spec (environment/provenance → schema/domain
   → physics → tactical invariants → novelty → question/age standards →
   visual validation) up through gate 7 in this phase; gates 8-10 (Claude
   judgment, promotion policy, app gate) are Phase 6.
9. **Gate 5 (novelty) implementation — per the FINAL viable design, supersedes
   the original "reuse noveltyGate.js, extended" framing:**
   a. Implement `loadClaimText(claimId)` reading `docs/library/odd-man-reads.md`'s
      real claim prose today, pinning its content hash into the judgment-record
      prompt manifest; document the future switch to
      `src/data/tactics/claims/<claim-id>.json`.
   b. Add `buildCandidateDigest(play)` / `buildArchiveDigest(sibling)` to
      `noveltyGate.js` (additive — no existing export changes); unit-test
      against the two real hand-authored survivor plays and the four real
      kernel survivors from `kernel-expansion-report.md`.
   c. Write and hash the fixed rubric text (`semantic-novelty-v1`), embedding
      `docs/scenario-family-standards.md`'s real "Variant Rules" section
      verbatim (unaffected by the 2026-07-29 curriculum-precedence edit to
      that file, which only touched "Family Completion"/"Recommended
      Development Order").
   d. Implement the `SiblingReviewVerdict` schema, its strict validator, and
      the deterministic `claimQuote` substring-verification check.
   e. Implement `reviewFamilyBatch()` (≤40-candidate batches, sequential
      chunking) and `applySemanticNoveltyGate()` — the gate-5 call-site
      replacement for `filterNovel()` — including the veto-only geometric
      backstop (the existing, unmodified `filterNovel()` can move an
      admission to `needsHuman`, never promote a semantic rejection).
   f. Implement `coverageLedger.js`; seed `docs/factory/coverage/two_on_one.json`
      by calling the **real** `answerSignature()`/`answerTarget()` against the
      real 4 kernel survivors + 2 hand-authored catalog plays — never a
      hand-assumed band value (the specific bug this rule exists to prevent
      is documented in the FINAL design doc's "Where this came from" section).
   g. Wire `report-kernel-expansion.mjs`: swap `filterNovel()` for
      `applySemanticNoveltyGate()`; keep `validateAnimatedPlay`/
      `validateFactoryStandards`/`artLint` call sites verbatim; add a
      "Teaching-arc coverage" report section from the ledger.
   h. Wire `newArcSlotProposed` verdicts into the existing review-required/
      human-queue path as an explicit "possible new arc slot" note.

**Files touched/created:**
- `docs/factory/runs/<run-id>/start.json`, `events.jsonl`, blob store (create,
  generated — not hand-authored)
- `src/scenario-engine/factoryRun.js` (create — run envelope
  read/write/lock/resume logic)
- `src/scenario-engine/gates/*.js` (create — gates 1, 2, 3, 4, 6, 7, reusing
  `noveltyGate.js` patterns where applicable; gate 5 is the files below, not
  a generic gates file)
- `src/play/tactics/claimText.js` (create — `loadClaimText`)
- `src/play/semanticNoveltyGate.js` (create — `reviewFamilyBatch`,
  `applySemanticNoveltyGate`, verdict schema + validator)
- `src/play/coverageLedger.js` (create — `loadLedger`/`saveLedger`/
  `admitToLedger`/`arcCoverageReport`)
- `docs/factory/coverage/<familyId>.json` (create per family)
- `docs/factory/coverage-runs/<familyId>-<date>.md` (create per run)
- `src/play/noveltyGate.js` (modify — add `buildCandidateDigest`/
  `buildArchiveDigest` only; all existing exports unchanged)
- `scripts/report-kernel-expansion.mjs` (modify — one call-site swap, per 9g)
- `src/scenario-engine/*.test.mjs` (create)
- (breakout content itself: no path changes beyond what Phase 0 already
  recorded as the starting hash; adaptation happens as new
  `ScenarioDefinition` artifacts inside the run store, not by editing
  `src/play/plays/dzBreakoutEscapePressure.js` in place)

**Exit gate — this is the single most important gate in the plan:**
- The same seed and pinned versions reproduce identical positions, motion,
  puck timing, and the canonical trace hash across two independent runs.
- The physically-possible breakout variant passes gates 1-7.
- Every deliberately-impossible variant (skating, passing, turning, timing)
  fails with a specific, structured explanation.
- The tactical read remains provable after physics validation (decision
  evaluation output cites the specific claim/kernel invariant).
- `declaredRead`/`derivedRead` agreement is enforced on both the breakout
  fixture and the coach-declared fixture (including a test where they
  deliberately disagree, proving the hard-fail path, not just the happy path).
- An interrupted-and-resumed run does not duplicate candidates.
- No step in this phase writes to `src/data/bank.json`, `src/scenario/seeds/`,
  or `src/play/playCatalog.js`/`playFamilies.js` outside the Phase-0-recorded
  starting state.
- **Gate-5 calibration smoke test (per the FINAL viable design):** the real
  48-candidate `two_on_one` expansion run through `applySemanticNoveltyGate()`
  end to end, with its kept/rejected/needsHuman sets diffed against today's
  real `filterNovel()` output (4 kept, 44 rejected, verified in
  `kernel-expansion-report.md`) and that diff recorded in the run envelope
  before the gate is relied on for anything else. This is a smoke test, not
  the full calibration bar — that bar (≥50 reviewed decisions, ≥20 per
  template class, ≥20% holdout) is Phase 6's responsibility, added below.

---

## Phase 6 — Claude/Ollama judgment records, event state machine, dependency recall, conservative staged promotion

**Goal:** Complete the state machine (`generated → validated → judged →
promotion-eligible → staged → promoted/recalled`), the judgment-record
format, the dependency index, and the promoted-catalog format (framework-fit
decision 2), then prove the whole loop — including one recall — on the
breakout fixture. This closes the "prove it end-to-end" gate.

**Tasks:**
1. Implement the append-only event state machine over the run envelope from
   Phase 5: `generated`, `validated|rejected`, `judged|review-required|
   rejected`, `promotion-eligible|review-required`, `staged`,
   `promoted`, `recalled|retired`. Each transition is an append-only event
   referencing an artifact hash, never a mutation of the artifact itself.
2. Implement the judgment record format: Claude provider/session identifier,
   model+version when exposed, reasoning configuration when exposed, rubric
   hash, prompt/context manifest, tool manifest, engine commit,
   calibration-corpus version. Missing/unavailable metadata is recorded
   explicitly and disables auto-promotion for that run (never silently
   defaulted).
3. Implement the versioned promotion-policy artifact — recommend
   `docs/factory/scenario-promotion-policy.json` (factory-only location,
   consistent with decision 3, rather than the spec's provisional `config/`
   path, since no `config/` directory exists yet and this is factory-internal
   policy, not shipped app config — flagged as a Judgment Call below).
4. Implement the dependency index: maps each promoted artifact version to its
   tactical claim, physics profile, kernel/template, renderer, rubric/judge
   stack, promotion-policy version, calibration-corpus version, source
   versions.
5. Implement dependency-based recall: given a changed/retired dependency,
   enumerate every affected promoted item and produce a reviewable
   removal/rollback patch touching only affected items.
6. Implement the content-addressed promoted-artifact format + generated
   manifest (decision 2): promoted JSON artifacts plus a deterministic,
   regeneratable index. `playCatalog.js` and `bank.json` are never hand-edited
   by this pipeline; implement one idempotent promotion script that is the
   only writer, and prove idempotency with a test (running promotion twice
   produces no duplicate entries and no diff on the second run).
7. Implement the Claude-judgment call itself for this phase as an
   attended-session-only call (framework-fit decision 8): the judgment step
   must be invoked from within an active, supported Claude Code session
   context available in this implementation session, not a headless
   subprocess pretending to be one. Record its metadata per step 2. Ollama's
   role in this phase is limited to mechanical work only (e.g. prose variant
   dedupe on the coach-declared fixture's copy, if any) — never hockey
   correctness.
8. Run the full loop on the breakout fixture: generated → validated → judged
   (real attended-session Claude judgment, not mocked) → promotion-eligible →
   staged. Given this is the very first template class, per the spec's
   "New kernel and template classes remain manual" rule, do NOT auto-promote
   even if the policy math would allow it — manually promote via the
   idempotent promotion script with an explicit human/Claude-attended
   decision, exactly as the existing three-play/manual-playtest standard
   requires until graduation criteria (Phase 10 territory) are met.
9. Recall proof: retire or version-bump one dependency (e.g. bump the physics
   profile version) and prove the recall patch correctly identifies and
   would remove the one promoted breakout item without touching unrelated
   content (a second, unrelated staged/promoted test fixture must survive
   untouched).
10. Run the existing app/manual-playtest gate against the promoted breakout
    item using the current animated-play test harness
    (`test:animated-play`, `test:play-engine`) plus a manual playtest pass in
    the running app, satisfying the spec's "animated fixture passes the
    existing app/manual playtest gate" requirement.
11. Extend the Conservative Promotion calibration bar (≥50 reviewed decisions,
    ≥20 per template class, ≥20% holdout with ≥10 decisions for the template
    class, zero wrong-answer false approvals) to also cover gate 5's SSR
    admit/reject/needsHuman calls, not just gate 8's hockey-correctness
    judgment — per the FINAL viable design's own task list, since both are now
    real Claude judgment calls this phase's calibration machinery must gate
    before either runs unattended.

**Files touched/created:**
- `src/scenario-engine/stateMachine.js` (create)
- `src/scenario-engine/judgmentRecord.js` (create)
- `docs/factory/scenario-promotion-policy.json` (create)
- `src/scenario-engine/dependencyIndex.js` (create)
- `src/scenario-engine/recall.js` (create)
- `scripts/promote-scenario.mjs` (create — the single idempotent promoter;
  this is the only script ever allowed to touch `src/play/playCatalog.js`/
  `src/play/playFamilies.js`/`src/data/bank.json` for engine-originated
  content, and it must do so via a generated, reviewable diff, not silent
  direct writes)
- `src/scenario-engine/*.test.mjs` (create)

**Exit gate (this is the spec's full "Acceptance gates before scaling" list,
proven concretely on the breakout fixture — the success condition the handoff
states explicitly, not hundreds of items):**
- Reproducibility, physics validity, deliberately-impossible-variant failures,
  and declared/derived agreement all still hold (carried from Phase 5).
- Claude can approve or reject hockey/teaching quality from a real attended
  session, with a complete judgment record (or an explicit
  unavailable-metadata marker that disables auto-promotion).
- Ollama involvement, if any, is provably limited to mechanical work (a test
  or an audit note confirms no Ollama output touched the correctness of the
  answer).
- No generation step writes directly to the live bank; the one idempotent
  promoter is the only writer, proven idempotent by test.
- The promoted breakout item traces to its tactical claim, physics profile,
  seed, validators, and judgment via the dependency index.
- The promoted item can be recalled without affecting an unrelated second
  fixture.
- The animated fixture passes the existing app/manual playtest gate.
- Player preview, coach-preview-stand-in, and video-export-stand-in (Phase 3's
  shared-clock consumers) all read the same `CompiledTeachingPlay` and produce
  identical timing.
- **At this point, and only at this point, the plan's central gate is
  satisfied: one source-backed breakout scenario, reproducible, physically
  valid, tactically justified, timing-faithful, staged safely, and
  individually recallable.** No phase before this claims throughput. No phase
  after this proceeds without this gate holding.

---

## Phase 7 — Dedicated coach-authoring/video-export design (design only, no code)

**Goal:** Per the spec's explicit sequencing ("a dedicated coach-authoring
design is written after the shared record and first compiler fixture, and
before the throughput benchmark"), write and get reviewed a focused design doc
covering everything the spec and handoff defer to it: editor UX, permissions,
draft storage, export format, rendering architecture, share links, retention,
team/catalog distribution.

**Tasks:**
1. Write `docs/superpowers/specs/<date>-coach-authoring-video-export-design.md`
   settling, at minimum:
   - Editor surface: confirm it lives inside the existing coach-facing
     dashboard surfaces (`coachAnalytics.jsx`, `trainingLogCoach.jsx`,
     `teamChallenges.jsx`, `assignments.jsx` are the actual existing files —
     "TEAM dashboard" in the decisions doc is a conceptual name, not a literal
     component; the design must name the actual mount point).
   - Editor interaction model: top-down schematic editor — place actors/
     goalie/puck, draw routes/passes/shots, set timing/freeze, name options,
     set declared read (per decision 6).
   - Storage: Supabase-backed drafts with optimistic hash/revision checks,
     immutable saved/finalized versions, local autosave for crash recovery
     only (per decision 6).
   - Auth/ownership: server-owned active TEAM entitlement check + coach role +
     team ownership + dedicated RLS, replacing reliance on the currently
     client-writable `profile.tier` and the currently open
     `question_overrides` policies (per decision 5). One owning coach, one
     team per draft for MVP; assistant-coach collaboration explicitly
     deferred.
   - Export: isolated Remotion/Node worker consuming the exact compiled
     artifact; first output a private 1080p 16:9 MP4 behind signed team-only
     links, no anonymous public export (per decision 7). Explicitly decide
     whether to salvage the existing untracked `remotion/` scaffolding
     (currently just `package.json`/lockfile/`node_modules`, React 19) or
     start clean given the React 18/19 mismatch with the main app — this
     design doc is where that call gets made, not this plan.
   - Draft/export safety boundary: hard-failed drafts preview-only; diagnostic
     exports carry an unavoidable `DRAFT - NOT VALIDATED` watermark plus
     failed checks; unwatermarked/team/public distribution requires the
     validation tier.
2. Get this design reviewed (by Thomas) before Phase 8 starts building. This
   plan does not pre-approve it.

**Files touched/created:**
- `docs/superpowers/specs/<date>-coach-authoring-video-export-design.md` (create)

**Exit gate:** The design doc exists, is internally consistent with the
9 approved framework-fit decisions, and is reviewed/approved by Thomas.
Nothing in Phase 8 starts before that approval.

---

## Phase 8 — Protected coach MVP build

**Goal:** Build the minimal slice per the approved Phase 7 design: place
players/puck, draw routes, set timing/freeze/declared-read, receive physics/
tactical feedback, save/reopen, preview through the shared clock, validate,
export one protected watermarked-or-clean animation — without editing JSON.

**Tasks (concrete, but final shape depends on Phase 7's approved design —
listed here at the granularity the spec commits to, not finer):**
1. Migration: server-owned TEAM entitlement check, coach role, team
   ownership, dedicated RLS policies for coach drafts — replacing reliance on
   client-writable `profile.tier` and open `question_overrides` writes for
   this new surface. This is a real Supabase migration file
   (`supabase/migration_00XX_coach_draft_auth.sql`), not a doc note.
2. New Supabase table(s) for coach drafts (immutable finalized versions,
   optimistic hash/revision checks on in-progress drafts).
3. New coach-editor UI component(s), mounted inside the existing coach
   dashboard surface named by Phase 7, gated to an allowlist of coaches
   initially (per decision 4).
4. Wire the editor's "compile" action through the Phase 1-6 pipeline: coach
   draft → `ScenarioDefinition` (declared read set by the coach) → physics →
   decision evaluation (derived read) → `CompiledTeachingPlay`, surfacing any
   declared/derived disagreement in the UI per the spec's explicit
   requirement ("editor may explain and preserve a mismatch, but it may not
   turn the declared answer into validated truth").
5. Wire preview to consume `CompiledTeachingPlay` through the Phase 3 shared
   clock.
6. Build the isolated Remotion/Node export worker per the Phase 7 design,
   consuming the compiled artifact, producing the first private signed MP4.
7. Implement the draft/export safety boundary: hard-failed drafts
   preview-only in the editor; diagnostic export watermarked
   `DRAFT - NOT VALIDATED` with failed checks listed; unwatermarked/team/
   public links disabled until validation tier is met.
8. Retire/replace `#scenarios`' pre-auth reachability and `ScenarioEditor.jsx`
   `Force save` as part of this work — new coach-facing surfaces must not
   inherit either gap (see Phase 9 for the formal freeze mechanism, but this
   phase should not add a second unprotected route/save-path alongside it).

**Files touched/created:**
- `supabase/migration_00XX_coach_draft_auth.sql` (create)
- New coach-editor component(s) inside the mount point Phase 7 names (create)
- `remotion/` — either replaced with a clean, isolated package/workspace
  boundary per Phase 7's decision, or the existing scaffold upgraded in place
  (create/modify per Phase 7's call)
- `src/scenario-engine/*` (extend as needed for coach-draft-specific
  compilation entry points)

**Exit gate:** A coach (allowlisted test account) can place players/puck,
draw a route, set timing and declared read, see physics/tactical feedback,
save and reopen the draft, preview it via the shared clock, and export one
validated animation end to end without touching JSON. A deliberately-invalid
coach draft is provably blocked from unwatermarked export. `profile.tier` and
`question_overrides` are no longer load-bearing for this new surface's
authorization.

---

## Phase 9 — Compliant scheduled-runner proof (late-stage, explicitly gated)

**Goal:** Build and prove a compliant replacement for
`tools/scenario-engine-overnight.ps1`, satisfying every requirement in the
spec's "Scheduled runner boundary" section — but only after Phases 0-8 all
hold. The Windows task stays `Disabled` throughout this phase; enabling it is
a separate, later, explicit Thomas decision this plan does not authorize.

**Tasks:**
1. Formally freeze the legacy direct-writers named in framework-fit decision
   9 as a concrete mechanism, not a doc note: add a runtime guard (e.g. a
   shared `assertNotFrozen(toolName)` check at the top of each frozen script
   that throws immediately with a pointer to this plan) to `ScenarioEditor`'s
   force-save path, `tools/seed-editor-plugin.mjs`'s `force` flag,
   `tools/review-store.mjs`, `tools/scenario-author.mjs`,
   `scripts/generate-questions.mjs`, `scripts/batch-approve.mjs`, and
   `tools/scenario-engine-overnight.ps1` (a top-of-script `exit 1` with a
   message, since it's PowerShell). This makes the freeze enforced, not just
   documented — satisfying the requirement that decision 9's freeze be "an
   actual list of files to lock/deprecate with a mechanism."
2. Build a new orchestrator from scratch (not a patch of the existing
   script): single-instance lock, immutable run envelope created first
   (reusing Phase 5's run-envelope module), isolated recorded source state,
   full preflight (dependency, disk, configuration, Ollama, destination),
   required supported-Claude-session handshake for judgment steps, recorded
   available session/model/tool metadata, stop-or-stage-only behavior when
   Claude is unavailable, timeouts, resumable checkpoints (granularity is a
   Judgment Call, flagged below), idempotent promotion via Phase 6's promoter,
   no push/deploy/publish/bypass of manual enablement.
3. Prove every required behavior explicitly with tests/dry-runs: preflight
   failure paths, single-instance lock contention, interruption+resume with
   no duplicate candidates/promotions, Claude-unavailable → staged-not-promoted,
   and a full successful dry run against the breakout family (or a second
   proven family) with the Windows task still `Disabled`.
4. Leave the Windows Task Scheduler entry `Disabled`. Enabling it is
   explicitly out of this plan's authorization — record that as a follow-up
   decision for Thomas, separate from this implementation.

**Files touched/created:**
- New orchestrator script(s) (e.g. `tools/scenario-engine-runner.mjs`,
  replacing the `.ps1` in function, not patching it) (create)
- Guard additions to the six frozen legacy tools (modify, minimal — a
  top-of-file check, not a rewrite)
- `tools/scenario-engine-overnight.ps1` (modify — add the same guard, or
  replace entirely if the new orchestrator supersedes it outright; either way
  it must refuse to run)

**Exit gate:** All required safety behaviors are demonstrated by tests/dry
runs. The six legacy tools now refuse to run (verified by attempting to
invoke each and observing the guard fire). The Windows task remains
`Disabled`. No dry run pushes, deploys, publishes, or writes live content.

---

## Phase 10 — Measured throughput benchmark

**Goal:** Only after Phase 8 (coach MVP) and Phase 9 (runner proof) both
hold, run the one controlled benchmark the spec defines, and report honestly.

**Tasks:**
1. Expand one additional family (or the same breakout family with real
   parameter-space coverage) through the full pipeline.
2. Count and report separately, per the spec: raw parameter combinations,
   validator-clean candidates, meaningfully distinct scenario states (using
   the versioned novelty signature — see Judgment Call below), question
   variants, Claude-approved items, promotion-ready items, manual-review
   items, rejected items by gate, recalled items.
3. Run within the stated bounds: ≤24 elapsed hours, ≤60 minutes hands-on
   human input during the run itself (setup time reported separately, not
   folded in).
4. Meet or honestly fall short of: ≥200 meaningfully distinct physics-clean
   scenario states, ≥200 promotion-ready items.
5. Audit the promotion-ready cohort per the spec's sampling rule (all items
   if <60, else a random sample of ≥60 or 10%, whichever is greater), zero
   wrong-answer false approvals or the benchmark fails outright and triggers
   dependency-based recall of the affected class.
6. Publish the report stating measured yield. Do not claim "hundreds per day"
   until the full bar passes.

**Files touched/created:**
- `docs/factory/benchmark-<date>.md` (create — the report)

**Exit gate:** The report exists and is honest about whether the bar was met.
If not met, the report states exactly which numbers fell short and why,
without weakening any gate to force a pass.

---

## What this plan does NOT cover / explicitly defers

- Bulk batch 002 and any subsequent bulk content generation — blocked by this
  plan's Phase 6 gate per `docs/roadmap/TASKS.md`, and this plan does not
  sequence that work; it belongs to a separate plan once Phase 6 (and ideally
  Phase 10) hold.
- Migrating any existing scenario/play content to the new schema — the spec
  explicitly says existing content does not need to migrate before the first
  vertical slice, and this plan does not propose it.
- A real-time arcade hockey game (Fidelity Level 2) — explicitly out of scope
  per the spec's non-goals; "a dedicated coach-authoring design is written...
  a separate arcade design only when that project is promoted."
- Assistant-coach collaboration on shared drafts — explicitly deferred by
  decision 5 to post-MVP.
- Enabling the Windows scheduled task — Phase 9 proves the orchestrator is
  compliant and safe to enable; it does not enable it. That is a distinct,
  later, explicit Thomas decision.
- Production-grade rendering/collaboration infrastructure beyond the minimal
  author/preview/export slice — explicitly out of scope per the spec's
  non-goals list.
- A paid model API of any kind, at any point — hard-blocked by decision 1 and
  not reconsidered anywhere in this plan.
- Any push, deploy, merge to `master`/`main`, or public/team sharing beyond
  the explicitly protected, signed, private links described in Phase 8 — all
  such actions remain subject to Thomas's morning/explicit review per the
  standing overnight-build guardrails, regardless of which phase of this plan
  is executing.
- Full family-coverage expansion decisions ("which tactical families to seed
  after the breakout calibration fixture") — the owner-decisions doc
  explicitly defers this to a regenerated family-coverage report at
  implementation time, not to this plan.

---

## Judgment calls flagged (ambiguous in the source docs, not silently resolved)

1. **Physics parameter sourcing (Phase 2).** The spec requires sourced,
   defensible per-age/skill performance ranges and explicitly forbids
   inventing one universal speed for every age, but does not name the actual
   source documents/datasets to cite. This plan requires Phase 2 to produce
   `docs/scenario-engine/physics-sourcing.md` citing real sources (e.g.
   USA Hockey ADM / Hockey Canada LTPD skill benchmarks, published youth
   skating-speed studies), but the exact source set is a research task within
   Phase 2, not pre-decided here.
2. **Exact on-disk location for factory-only artifacts (Phases 4 and 6).**
   The spec proposes `src/data/tactics/claims/<claim-id>.json` and
   `config/scenario-promotion-policy.json` as "provisional" paths and
   explicitly says "the implementation plan may refine the path." Given
   decision 3 (tactical claims must live outside `src/`) and the fact that no
   `config/` directory currently exists in the repo, this plan relocates both
   to `docs/factory/tactics/...` and `docs/factory/scenario-promotion-policy.json`
   respectively. This is a plan-level judgment call the spec explicitly
   invited, not a silent deviation — flagging it here so Thomas can override
   the exact path if he prefers a different location (e.g. a new top-level
   `factory/` directory instead of nesting under `docs/factory/`).
3. **Novelty-signature schema (Phase 5 and Phase 10).** The spec requires
   "each template registers a versioned novelty signature covering tactical
   claim, decision/cue topology, answer, and minimum geometry/time distance,"
   and that the benchmark "publishes the signature distribution and all
   thresholds," but does not define the concrete schema or distance metric.
   `src/play/noveltyGate.js`'s existing `answerSignature()` (correct option +
   coarse vertical-third band) is a reasonable starting point but is coarser
   than what the spec seems to want (it has no explicit geometry/time-distance
   dimension). This plan treats the exact novelty-signature schema as a
   design decision to make concretely during Phase 5, informed by but not
   limited to the existing `noveltyGate.js` shape — not silently assumed to be
   "whatever `noveltyGate.js` already does."
4. **Checkpoint granularity for resumable runs (Phase 5 and Phase 9).** The
   spec requires "resumable checkpoints" and "runs must be resumable and
   idempotent" but does not specify whether checkpoints are per-candidate,
   per-gate, or per-batch-chunk. This plan defaults to per-candidate-per-gate
   granularity (the finest reasonable unit, since it's the cheapest to make
   provably non-duplicating) as the Phase 5 implementation target, but flags
   that a coarser granularity (e.g. per-batch-chunk) might be adopted instead
   if per-candidate proves too slow in practice — that trade-off is left to
   Phase 5's implementer to resolve with evidence, not pre-decided here.
5. **Exact holdout-audit mechanics (Phase 10, and the later graduation
   process beyond this plan's scope).** The spec is precise about the
   *numbers* (≥50 Thomas-reviewed decisions overall, ≥20 per template class,
   ≥20% holdout with ≥10 class decisions, zero wrong-answer false approvals)
   but not the *mechanics* of how Thomas's review decisions are captured,
   stored, or fed back as calibration-corpus versions. This plan's Phase 6
   builds the judgment-record and dependency-index machinery that such an
   audit would consume, but the actual review-capture workflow (a new
   dashboard view? a CLI prompt? a spreadsheet import?) is left unresolved
   here — it's graduation-process work that only matters once a template
   class is actually seeking graduation, which is explicitly beyond this
   plan's one-breakout-scenario scope.
6. **Whether to salvage or discard the existing `remotion/` scaffold (Phase
   7/8).** The scaffold has real dependencies installed but zero composition
   source, and pulls React 19 against the main app's React 18. The spec and
   handoff both treat this as "disposable... until Thomas approves" a set of
   architecture questions, but neither commits to keep-vs-discard. This plan
   defers that call explicitly to Phase 7's design doc rather than deciding
   it here.
7. **Exact coach-dashboard mount point (Phase 7/8).** The owner-decisions doc
   says "inside the existing TEAM coach dashboard," but no single file
   literally named a "TEAM dashboard" exists — the closest real candidates are
   `src/coachAnalytics.jsx`, `src/trainingLogCoach.jsx`,
   `src/teamChallenges.jsx`, and `src/assignments.jsx`. This plan flags that
   Phase 7's design doc must name the actual concrete mount point/component
   tree, rather than this plan guessing which of those four (or a new
   sibling) is the right home.
