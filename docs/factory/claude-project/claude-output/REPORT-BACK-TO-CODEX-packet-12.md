# Report back to Codex — packet-12

**Snapshot:** `rr-20260905-c8403be16748c919`. **Packet:** `packet-12`.
Scope: `exp26-u11-004` through `exp26-u11-008` (5 scenarios, 50 questions).

## 1. Counts

- Assigned: 50 (5 scenarios x 10 questions). Reviewed: 50. Retained: 49. Repaired: 1
  (scenario, 1 question inside it). Blocked: 0. Unreviewed: 0. `completion: "complete"`.
- Every `baseContentHash`/`baseScenarioHash` in `review-packet-12.json` was recomputed
  with the real `questionContentHash`/`scenarioSnapshotHash` functions from
  `validation/tools/*.mjs` against the packet's own scenario JSON and matches the
  manifest exactly (no stale-baseline drift).

## 2. Highest-impact findings

1. **Repair — `exp26-u11-006-q7` (rebound-awareness, U11), the only real defect found.**
   The scored "correct" option read *"Puck below the circle; D1 is between it and the
   net."* Checked against the actual render source
   (`ExperimentalBoard` in `src/one-on-one/ExperimentalPractice.jsx`: faceoff circles at
   (±20.7,±6.7), r=4.572) and the scene's own coordinates: the loose puck (23,5) is
   2.86 m from the nearest circle centre (20.7,6.7) — i.e. **inside** the 4.572 m circle,
   not below/outside it — and ordered along x, D1 (22) < puck (23) < goalie/net (~26),
   meaning D1 sits **between centre ice and the puck**, not between the puck and the
   net. Both clauses of the "correct" answer misdescribed the actual scene — the same
   class of defect the project's own historical checks call out ("a skater described as
   on a blue line when the coordinates placed them inside the zone"). This was only
   ever covered by clean passes (`catalog-review.json`, `expansion/u11-first.json`), no
   repair receipt, matching the "zero-finding-only" scrutiny prior. Repaired to *"Puck
   inside the circle; D1 is positioned closer to centre ice than the puck,"* version
   bumped 1→2, `affectedQuestionIds: ["exp26-u11-006-q7"]`, self-checked and rehashed.
2. **Confirmed clean — `exp26-u11-005-q1` and `exp26-u11-006-q1`** (both `basis:scene`,
   ahead/behind and puck-location claims): verified numerically against real coordinates
   (YOU x=18 > F1 x=17 with navy attacking +x; puck (23,5) is 2.86 m off-goalie, neither
   centre ice nor held). Both correct as written.
3. **Confirmed clean — three previously-flagged sequence questions**
   (`exp26-u11-006-q3`, `exp26-u11-007-q3`, `exp26-u11-008-q3`): each carried a P3
   "teaching" flag in `catalog-review.json` about rigid ordering. Independently
   re-verified: each question's own explanation already hedges the order as conditional
   ("An immediate touch could be appropriate if..."), and `followup/mixed-proposals.json`
   already resolved these as "keep" with reasoning tied to the sibling q5/q6 in the same
   scene. Retained; no further change needed.
4. **Confirmed clean — the two already-repaired position questions**
   (`exp26-u11-005-q9`, `exp26-u11-006-q9`): both went through two real repair rounds
   (`u11-actor-repairs.json`, `u11-repairs.json`, actorId fixes + wording) and multiple
   independent rechecks, all "pass." Re-verified independently here (on-ice, real
   distance moved, correct actor bound to "YOU") rather than trusting the historical
   pass label at face value.
5. **Actor-centre collinearity in `exp26-u11-004`, not a defect.** D1 (12,0.5) sits
   exactly on the straight segment between YOU's old position (10,4) and F2 (14,-3) —
   an exact geometric collinearity. This matches calibration lesson 3 (collinearity is a
   warning, not proof of a blocked pass) and the briefing only states it as a soft
   "shades the old return line" cue, never a guaranteed block. Retained.

## 3. Scene/answer conflicts, uncertainty, visual checks not performed

- No other scene/answer conflicts found across the 50 questions after checking every
  landmark-referencing phrase (circle, boards, wall, net, centre ice, blue line) in
  every option/explanation for a geometric claim against real coordinates.
- No absent-roster or wrong-actor references found (`questionActorWarnings` /
  `positionSubjectIssue` from the real validator core returned nothing across all 50
  questions and the repaired replacement).
- No "YOU is/has/was" grammar defects found (regex-scanned every prompt, option and
  explanation).
- +y orientation: computed directly from the real render source
  (`ExperimentalBoard`, `translate(a.x,-a.y)` / `cy={-scene.puck.y}`), confirming +y is
  up-screen. No question in this packet uses screen-relative "upper/lower/above/below"
  language on a `scene`-basis claim, so this check found **zero orientation defects** in
  packet-12 (the one geometry defect found was a distance/betweenness error, not an
  orientation error).
- Visual/rendered-app check: **not performed** — no live app/browser access from this
  session; all geometry was verified against the real coordinate math and render-source
  constants only, not a rendered screenshot.
- Human coach approval, app testing, and publication: **not claimed**, per the
  standing rule.

## 4. Curriculum bindings (planning signal only)

- `exp26-u11-004` (pass-and-support/Passing) and `exp26-u11-005`
  (reset-support/Support) map to Hockey Canada's U11 Skills Matrix "Moving Passing &
  Receiving" and "Team Play" rows (confirmed read, PDF page 22).
- `exp26-u11-006` (rebound-awareness/Shooting), `exp26-u11-007`
  (puck-protection/Puck control) and `exp26-u11-008` (change-of-pace/Puck control) map
  to USA Hockey's 10-and-Under "off rebound," "puck protection" and "change of pace"
  items (confirmed read, PDF pages 23-25 = printed 17-19). This is a USA source adapted
  for Canadian U11 use; the scenarios' own `sources[].use` field already discloses that
  adaptation, so this is not a new age/jurisdiction gap — just confirmation the existing
  disclosure is accurate.
- These are keyword/topic matches, not approved curriculum assignments — Codex's
  ledger reconciliation still governs actual binding decisions.

## 5. Files, validation, next packet

- `docs/factory/claude-project/claude-output/review-packet-12.json`
- `docs/factory/claude-project/claude-output/REPORT-BACK-TO-CODEX-packet-12.md` (this file)
- Validator run: `node validation/validate-return.mjs claude-output/review-packet-12.json`
  → `{"errors":[],"warnings":[],"counts":{"assigned":50,"reviewed":50,"remaining":0,"repairedScenarios":1}}`.
  Structure/stale-baseline checks only, per its own stated limits; independent hockey
  review and rendered-scene verification remain required before any integration.
- Checks not run: no live app/browser rendering check (no app access this session);
  no independent second-reviewer pass (that remains Codex/Luna's role per the project
  contract — this is one full independent review, not two).
- Next packet to continue: packet-13 (not yet opened this session).
