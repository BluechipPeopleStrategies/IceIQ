# Report back — packet-31

Snapshot `rr-20260905-c8403be16748c919`, packet `packet-31`. First U15 packet and RinkReads'
first special-teams content (power play, penalty kill). Five scenarios, 10 questions each
(50 total, larger than the U13 packets' 6-question scenarios). Split across three agents,
merged by the controller, validated clean on the first pass.

- **Part A:** `exp26-u15-001` (supported-pinch), `exp26-u15-002` (power-play-local-advantage)
  (20 questions)
- **Part B:** `exp26-u15-003` (penalty-kill-shift), `exp26-u15-004` (power-play-faceoff-recovery)
  (20 questions)
- **Part C:** `exp26-u15-005` (entry-role-replacement) (10 questions)

## 1. Counts

- Reviewed: 50 of 50 assigned questions. Completion: **complete**, `remainingQuestionIds: []`.
- Repairs proposed: 3 scenario replacements, all v1→v2: `exp26-u15-002`, `-003`, `-005`.
  `exp26-u15-001` and `-004` were fully clean.

## 2. Highest-impact findings

1. **`exp26-u15-002-q10` — a lowercase "you" that survived a second-reviewed historical
   pass.** House style mandates all-caps "YOU"; this question used lowercase "you," a
   defect distinct from the grammar-agreement class but the same family of authoring
   slip, and it had a `secondReviewed: true` historical label attached. Fixed.
2. **`exp26-u15-003-q9` — a genuine zone-depth mislabel.** The prompt claimed a "central
   low-slot cover" position, but the given reference point actually sat in the high-slot
   band (between the defensive faceoff dot and the blue line), not the low slot (between
   the goal line and the faceoff dot). Fixed to a point genuinely in the low slot,
   distinct from a nearby sibling question's own reference.
3. **`exp26-u15-003-q8` — an absolutist giveaway distractor.** Option text used "forever,"
   the exact tell both the authoring contract and project instructions warn against.
   Reworded to keep the same false claim testable without the tell.
4. **`exp26-u15-005-q9` — a reversed depth claim, the same defect class as prior packets'
   findings.** A reference point was 1.5m deeper (closer to the opponent's net) than the
   puck carrier it was supposedly supporting from "high," directly contradicting the
   "high-slot support" language used throughout the scene. Fixed to a point genuinely
   shallower than the carrier.
5. **Special-teams roster/geometry checks all passed on first review**: 5-on-4 and 4-on-5
   skater counts were verified against actual actor lists in every special-teams
   scenario, and faceoff-dot positioning in `exp26-u15-004` was confirmed within 1m of the
   real offensive-zone faceoff circle. One notable finding worth flagging: the cited USA
   Hockey source for `-003` explicitly recommends against detailed special-teams
   instruction below the 14U bracket, supporting the project's own choice to introduce
   PK/PP content starting at U15.

## 3. Process note: a coverage-verdict convention difference worth naming

Part B modeled `exp26-u15-003`'s coverage rows differently from the convention used in
every prior packet's repaired scenarios: rather than marking all 10 linked questions
`verdict: "repair"` (the pattern used everywhere a scene-level edit cascades every
question's hash), it marked only the 3 questions with genuine content defects (`q1`, `q8`,
`q9`) as `repair` and the other 7 as `retain`, while still correctly listing all 10 in the
repair's `affectedQuestionIds` and covering all 10 with real recomputed hashes in
`replacementReview`. Both conventions validate cleanly; nothing here is a defect. The
controller did not request rework, since this arguably reports more precisely which
questions have their own content issues versus which are only swept along by a shared
scene fix. Flagging it so Codex is aware the top-level `coverage.verdict` field does not
carry a single fixed meaning across every packet in this project when a scene-level
edit is in play.

## 4. Scene/answer conflicts, rule/system uncertainty, visual checks not performed

- Three real non-grammar scene/geometry conflicts found and repaired (§2, items 2 and 4,
  plus the distractor fix in item 3).
- No rule/system uncertainty encountered.
- One judgment call flagged, not silently resolved: `exp26-u15-002-q7`'s "between" claim
  was judged on a softer "verbal coaching call" standard rather than strict line
  geometry, since the actual point sits about 2.7m off the direct line; the reviewing
  agent explicitly flagged this reasoning in case Codex wants a stricter bar.
- Both special-teams sources and all other cited sources were fetched and actually read,
  not just URL-checked.
- Visual/rendered-UI check: **not performed** across all three parts, consistent with
  every prior packet.

## 5. Proposed curriculum bindings and ranked gaps

Out of scope for this run's requested output shape. No new gaps identified.

## 6. Files, structural validation, next packet

**Files:**
- `docs/factory/claude-project/claude-output/review-packet-31.json` — merged final
  envelope, schema-validated clean on the first pass
- `review-packet-31-part-a.json`, `-part-b.json`, `-part-c.json` — the three source parts
- No part could write its own `.md` report file (same harness restriction as recent
  packets); each agent's full report content is folded into this combined report.

**Structural validation actually run:** `node validate-return.mjs
../claude-output/review-packet-31.json` →
`{"errors":[],"warnings":[],"counts":{"assigned":50,"reviewed":50,"remaining":0,"repairedScenarios":3}}`.
Zero errors, zero warnings.

**Checks not run:** no independent (Codex/Luna) second review of this packet's content;
no rendered-scene/live-app verification; no human coach approval.

**Next packet to continue:** packet-32.
