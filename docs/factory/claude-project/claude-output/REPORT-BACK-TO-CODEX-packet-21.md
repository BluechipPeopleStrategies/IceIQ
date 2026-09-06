# Report back — packet-21

Snapshot `rr-20260905-c8403be16748c919`, packet `packet-21`. First mixed U11/U13 packet.
Split across three agents on different scenarios within the same packet, merged by the
controller. Two schema issues surfaced on the first validation pass — one a missing
required field, one a subtle serialization artifact — both fixed mechanically by the
controller, detailed in §5.

- **Part A:** `exp26b-u11-024`, `exp26b-u11-025` (12 questions)
- **Part B:** `exp26-u13-002`, `exp26-u13-003` (20 questions)
- **Part C:** `exp26-u13-004` (10 questions)

## 1. Counts

- Reviewed: 42 of 42 assigned questions. Completion: **complete**, `remainingQuestionIds: []`.
- Verdicts: 26 `retain`, 16 `repair`, 0 `blocked`.
- Repairs proposed: 3 scenario replacements, all v1→v2: `exp26b-u11-024`, `exp26-u13-002`,
  `exp26-u13-004`. `exp26b-u11-025` and `exp26-u13-003` were fully clean, no repairs.

## 2. Five highest-impact before/after examples

1. **`exp26b-u11-024-q1` — a keyed-answer flip, cross-checked against a sibling live
   scene.** The key said "toward centre ice," but YOU sits 2.38m on the attacking-zone
   side of the right blue line (x=10 vs x=7.62). Confirmed against the already-live
   `exp26-u11-024` (same family, identical x=10 coordinate), which keys its equivalent
   question the opposite way — the correct way. Fixed.
2. **`exp26b-u11-024-q4`** — the position reference moved YOU *farther* into the attack
   zone, the opposite of "reset behind the blue line" — its own explanation admitted the
   direction was wrong. Fixed to a genuinely neutral-zone point.
3. **`exp26-u13-002` briefing/cues — a rim-vs-open-ice-class defect.** Claimed "YOU have
   settled the puck below the goal line," but the computed carried-puck position is 2.91m
   in front of the actual goal line. Same defect class as the calibration's original rim
   mismatch. Fixed by rewording (no coordinates changed).
4. **`exp26-u13-004-q9` — an axis mismatch missed by every prior historical pass.**
   Claimed YOU's position was "below and inside W," but the reference point was actually
   *less* negative than W on the depth axis this scene uses everywhere else — meaning YOU
   stayed up-ice of W, not below. Every historical record for this hash said pass/no-
   finding. Fixed.
5. **`exp26-u13-003` and `exp26b-u11-025`** — both fully clean. Notably `-003`'s q1 claim
   ("Gold 1 blocks the direct lane") was independently verified numerically (0.066m
   off-line — essentially exact), not just accepted from the prompt.

Every scenario in this packet also had at least one instance of the recurring "YOU"
subject-verb-agreement defect, folded into the repairs above.

## 3. Scene/answer conflicts, rule/system uncertainty, visual checks not performed

- Two real scene/answer conflicts found and repaired (§2, items 1 and 4).
- No rule/system uncertainty encountered.
- One informational flag, not acted on: `exp26b-u11-024` looks like a near-duplicate of
  the already-live `exp26-u11-024` (same coordinates, same "reset behind blue line"
  concept). Flagged for the curriculum/gap-plan pass — merging or retiring a near-
  duplicate scenario is out of scope for a repair envelope.
- Visual/rendered-UI check: **not performed** across all three parts, consistent with
  every prior packet.

## 4. Proposed curriculum bindings and ranked gaps

Out of scope for this run's requested output shape. Part A suggests
`exp26b-u11-024`/`-025` map better to `u11.decision-making`/`u11.scanning` than their
current keyword-matched tags.

## 5. Files, structural validation, next packet

**Files:**
- `docs/factory/claude-project/claude-output/review-packet-21.json` — merged final
  envelope, schema-validated clean after two controller-applied fixes
- `review-packet-21-part-a.json`, `-part-b.json`, `-part-c.json` — the three source parts
  (parts A and C were modified post-hoc by the controller, see below)
- No part could write its own `.md` report file (same harness restriction as recent
  packets); each agent's full report content is folded into this combined report.

**Structural validation actually run:** first pass over the merged envelope failed with
two distinct issues, both fixed directly by the controller (mechanical, not content
judgment calls) rather than sent back to the agents:
- **Part A (`exp26b-u11-024`):** the repair object was missing `replacementReview`
  entirely. Constructed it properly — a `self-checked` review covering all 6 questions in
  the replacement, with real `questionContentHash` values computed via the project's own
  tooling, not invented.
- **Part C (`exp26-u13-004`):** the replacement's q7/q8/q10 objects were byte-different
  from the original (confirmed via deep-equality check: identical *values*, different key
  order — an artifact of the agent reconstructing those question objects rather than
  reusing them unchanged), which made the validator's hash comparison see them as
  "changed" even though nothing about them was meant to differ. Restored the exact
  original objects for those three questions (only q9 was the genuine, intended fix),
  then recomputed `affectedQuestionIds` and every `replacementReview.coverage` hash for
  real via the project's hash function. Confirmed only `q9`'s hash actually changed,
  matching the agent's original intent.

Re-ran after both fixes: `node validate-return.mjs ../claude-output/review-packet-21.json`
→ `{"errors":[],"warnings":[],"counts":{"assigned":42,"reviewed":42,"remaining":0,"repairedScenarios":3}}`.

**Checks not run:** no independent (Codex/Luna) second review of this packet's content;
no rendered-scene/live-app verification; no human coach approval.

**Next packet to continue:** packet-22.
