# Report back — packet-16, part B (exp26b-u11-001, exp26b-u11-002)

Snapshot `rr-20260905-c8403be16748c919`, packet `packet-16`. This is a partial
slice of packet-16: I own only `exp26b-u11-001` and `exp26b-u11-002` (12
questions total). Two other agents own `exp26-u11-024`/`-025` and
`exp26b-u11-003` in the same packet; I did not touch those scenarios, their
questions, or their output files.

## 1. Counts

- Reviewed: 12 of 12 assigned questions (6 + 6). Completion: **complete**.
- Verdicts: 12 `repair`, 0 `retain`, 0 `blocked`.
- Repairs proposed: 2 (one per scenario, version 1 -> 2).

Every question in both scenarios ends up with verdict `repair`, but only two
questions have their *own* wording changed (see below) — the other ten are
swept into `repair` because a scenario-level briefing fix changes every
linked question's content hash, per the project's own rule that "briefing
and setup changes affect every linked question, including unchanged text."

## 2. What was actually wrong

Both defects are the exact recurring class this assignment calls out:
subject-verb agreement on "YOU." I ran a regex scan (`YOU\s+(is|has|was|...)`)
across every prompt, option, explanation, briefing, cue and limits field in
both scenarios, cross-checked by hand.

1. **exp26b-u11-001 briefing:** "YOU approaches a loose puck beside the left
   wall" -> "YOU approach a loose puck beside the left wall."
2. **exp26b-u11-001-q1 explanation:** "YOU is beside the puck" -> "YOU are
   beside the puck." (The underlying claim — YOU is nearest the loose puck —
   is independently geometry-verified as correct: 1.414 m vs 10.63 m/10.44 m
   for F2/D1.)
3. **exp26b-u11-002 briefing:** "YOU is open to the right" -> "YOU are open
   to the right."

No other grammar, roster, geometry, answer, feedback, age or source defect
was found in either scenario. `exp26b-u11-001-q5` already carries an applied
repair (`u11-repairs.json`, finding `u11-p2-dummy-distractors`) replacing an
earlier unsafe distractor; the current baseContentHash already matches that
fixed text, so I proposed no further change to that question's own content.

## 3. Verification method (not just reading JSON)

- Computed every `baseContentHash` and `baseScenarioHash` with the project's
  own `questionContentHash`/`scenarioSnapshotHash` functions
  (`validation/tools/question-batch-core.mjs`,
  `validation/tools/claude-return-core.mjs`) — all 12 matched the packet
  manifest exactly before any edit.
- Ran `isCoachRoutePoint` (`validation/src/one-on-one/coachRouteSurfaceInput.js`)
  on every actor, the loose/carried puck, and every `position` question's
  reference point — all on ice.
- Rebuilt each scene with `makeScene()` (including the moved-actor variant for
  both `position` questions) to confirm the puck does not silently move when
  a non-owning actor is repositioned (it doesn't, in either scenario — YOU
  never owns the puck in either scene).
- Computed real distances: puck-proximity for `exp26b-u11-001-q1`; the actor
  displacement and D1-separation deltas for both `position` questions;
  the perpendicular distance from D1 to the F1-YOU line in
  `exp26b-u11-002` (~3.55 m) to check the "D1 between the lane and the
  boards" framing — close enough to be a defensible coaching description, not
  a contradiction.
- Ran `validateExperimentalBank` and `positionSubjectIssue`/
  `questionActorWarnings` against both scenarios: zero structural or
  actor-mismatch findings.
- Read `hc-vision-2024` (Hockey Canada "7 Principles for Coaches: Vision &
  Scanning") via a browser-UA curl fetch after a plain WebFetch returned
  HTTP 403, confirming the known hockeycanada.ca UA-sensitivity noted in the
  brief. Its "Key Information to Identify" and "Drill #3 — Reading Pressure /
  Corner Situations" sections support the general pressure/support-scanning
  principle behind both scenes, not any specific coordinate or answer key.
- Checked `docs/factory/research/question-review/repairs/` for prior receipts
  touching these two scenarios: only `u11-repairs.json` (already reflected in
  the current baseContentHash for `exp26b-u11-001-q5`). No receipt exists for
  `exp26b-u11-002` at all — treated as a reason for closer scrutiny, which
  is what turned up the briefing defect there.

## 4. Scene/answer conflicts, uncertainty, visual checks not performed

- No scene/answer conflict found in either scenario.
- Minor descriptive imprecision, noted but **not** treated as a defect
  requiring repair (no answer key depends on it): `exp26b-u11-002`'s briefing
  places F1 "near the left hash marks," but F1's coordinate is roughly 4-5 m
  outside the nearest faceoff-circle edge — closer to the neutral-zone/
  attacking-zone entry than the hash marks proper. Flagging for awareness,
  not proposing a change, since the wording is coach-narration color, not a
  claim any question keys off.
- No rule/system uncertainty encountered (neither scenario makes a rules
  claim).
- Visual/rendered-UI check: **not performed**. I have no runtime/browser
  access in this task; all geometry was verified offline against the
  coordinate/hash tooling, not a live render. No app testing, coach approval,
  or publication is claimed.

## 5. Curriculum bindings

Out of scope for this partial run — the assignment's per-scenario curriculum
binding/gap-plan section is not part of this packet's requested output shape
(scoped strictly to `coverage`/`repairs`/`sourceChecks`/
`remainingQuestionIds`). For reference, `curriculum-coverage.json` already
carries planning-signal domain matches for both scenarios (`puck-skills`,
`hockey-sense`, `defensive-play` for `exp26b-u11-001`; `puck-skills`,
`offensive-play`, `defensive-play` for `exp26b-u11-002`) — keyword matches
only, not approved bindings.

## 6. Files

- `docs/factory/claude-project/claude-output/review-packet-16-part-b.json` —
  this partial envelope (`scenariosOwned`, `completion: complete`, 12
  coverage rows, 2 repairs, 1 source check, empty `remainingQuestionIds`).
- This report.

**Structural validation:** `validate-return.mjs` was **not** run, per the
assignment for this split run — it validates a complete packet envelope and
my output is a scoped partial slice; the controller runs it after merging all
three agents' outputs.

**Next:** nothing remains unreviewed in my two scenarios. The controller
should merge this file with the other two agents' partial envelopes for
`exp26-u11-024`/`-025` and `exp26b-u11-003` before running
`validate-return.mjs` against the combined packet-16 review.
