# Report back to Codex — packet-09

Snapshot `rr-20260905-c8403be16748c919`, packet `packet-09`. Expected 5 scenarios / 30
questions; reviewed 30, retained 10, repaired 20, blocked 0, unreviewed 0. Completion:
`complete`.

All five scenarios (`exp26b-u9-003` through `exp26b-u9-007`, U9 age band) were covered
ONLY by the `combined-review.json` zero-finding pass and the `expansion/youth-first.json`
first-pass Luna review, with no real repair receipt — the exact pattern flagged in the
dispatch instructions as carrying a high real-defect rate in packets 04-08. That prior
held here too: 4 of the 5 scenarios needed a repair.

## Five highest-impact before/after examples

1. **`exp26b-u9-006` briefing + cues + Q2, Navy3 falsely placed "on the boards".**
   Navy3 sits at (9,-5), 7.95 m from the nearest boards — over half the ice's
   half-width away. The briefing, the cues, AND question 2's scored option text ("Navy3
   on the boards") all repeated this false absolute claim. Fixed all three to an
   accurate relative descriptor ("farther off to the side"). This is the most serious
   finding: a `basis: scene` graded answer choice asserted something the coordinates
   contradict.
2. **Confirmed +y/2D-board defect appears here too, in 4 questions across 3 scenes.**
   `exp26b-u9-004-q5` ("the lower side"), `exp26b-u9-006-q3` ("above the circle"),
   `exp26b-u9-007-q3` and `-q5` ("the lower side") all used y-relative language.
   Rewrote each camera-independently (named actors/landmarks instead), per the
   confirmed `rinkFrame.js` (+y = toward the bottom, matching the design spec) vs.
   ExperimentalBoard (draws +y at the top) rendering inconsistency.
3. **`exp26b-u9-004` briefing overclaimed two landmarks.** "Gold1 has just taken the
   puck at the attacking blue line" (Gold1 is actually 5.38 m past the blue line) and
   "YOU are behind the play near the boards" (YOU is 5.95 m off the boards). Softened
   both to accurate zone-level language ("in the attacking zone", "off to one side").
4. **`exp26b-u9-004` briefing grammar**: "the coach asks you to recover" used
   lower-case "you", the only place in the packet breaking this bank's YOU convention
   (every sibling scene and every question prompt capitalizes it). Fixed to "YOU".
5. **`exp26b-u9-003` briefing overclaimed corner proximity.** "A loose puck sits near
   the attacking corner" — the puck (22,-7) is actually 5.95 m from the nearest boards
   (measured against the 8.5344 m corner radius), not tight to the corner. Softened to
   "in the attacking zone, off to one side." None of the scene's own scored answers
   depended on the corner claim, so only the briefing changed.

`exp26b-u9-005` ("Keep the play in front while moving back") had no defects: all
distance/relative claims checked out exactly (e.g., Navy2 genuinely closer to centre
than YOU, facing 0 rad genuinely matches "facing the attacking end"), and it uses no
y-relative up/down language at all. All 6 questions retained.

## +y orientation sweep

Confirmed present: 4 questions across 3 scenarios (`exp26b-u9-004-q5`,
`exp26b-u9-006-q3`, `exp26b-u9-007-q3`, `exp26b-u9-007-q5`), all `basis: coaching`
hypothetical/position prompts, none of them scored `basis: scene` claims. All four
rewritten to name actual actors/landmarks instead of "lower"/"above". Verified the
underlying claim directly against `docs/factory/claude-project/validation/src/scenario-engine/rinkFrame.js`,
which states "+y: toward the bottom of the canonical top-down view" as the
design-spec-matching convention (the 3D camera side of the confirmed packet-05→08
finding).

## Scene/answer conflicts, uncertainty, visual checks not performed

- The one scene/answer-adjacent conflict found is `exp26b-u9-006-q2`'s option b (see
  above) — a scored scene-basis option whose descriptive text was geometrically wrong,
  though the correct choice to select was still right.
- No rule/system uncertainty beyond the standing "these are original experimental
  coaching syntheses, not source-certified" framing already in every scene's `sources`.
- Visual verification (actual rendered ExperimentalBoard / 3D camera screenshots) was
  NOT performed — no live app or browser access in this session. All geometry checks
  were done against the coordinate math and the project's own `isCoachRoutePoint` /
  `questionContentHash` / `validateExperimentalBank` helper code
  (`docs/factory/claude-project/validation/`), run directly with Node, not against a
  rendered view.

## Curriculum bindings

Not re-derived from scratch this packet — `curriculum-coverage.json`'s existing
`domainSignals` for these five scenarios (puck-skills/hockey-sense/offensive-play/
defensive-play/transition-compete, matched via keyword) were read and look like
reasonable planning signals consistent with each scenario's stated `topic`/`family`
(loose-puck-recovery, transition-defending, backward-skating-awareness,
reception-pressure, post-pass-support). No gap ranking was attempted for this packet;
that is better done in aggregate across more of the U9 band than five scenarios permit.

## Files, validation, next packet

- `docs/factory/claude-project/claude-output/review-packet-09.json`
- `docs/factory/claude-project/claude-output/REPORT-BACK-TO-CODEX-packet-09.md` (this file)
- Structural validator run: `node validation/validate-return.mjs claude-output/review-packet-09.json`
  → `{"errors":[],"warnings":[],"counts":{"assigned":30,"reviewed":30,"remaining":0,"repairedScenarios":4}}`.
  All `baseContentHash`/`baseScenarioHash` values and every replacement's `contentHash`
  were computed with the project's own `questionContentHash`/`scenarioSnapshotHash`
  functions (not hand-typed), and every replacement was run through
  `validateExperimentalBank`, `isCoachRoutePoint`, `positionSubjectIssue`, and
  `questionActorWarnings` before being included — all clean.
- Checks NOT run: no rendered/live-app visual check (see above); no independent
  second-model (Luna) review; no human coach approval. This review, the structural
  validator, and the source reads above are the only checks actually performed.
- Next packet to continue: packet-10 (not opened in this session — out of scope for
  this run per the dispatch instructions, which scoped this session to packet-09 only).
