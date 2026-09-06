# Report back — packet-35

Snapshot `rr-20260905-c8403be16748c919`, packet `packet-35`. Five U15 scenarios, 6
questions each (30 total). Split across three agents, merged by the controller, validated
clean on the first pass. The packet-34 team-flip/dropped-actor check was applied to
every scenario this packet; none showed that specific defect (this cluster uses a
uniform 3v3, no-goalie design, confirmed against each scenario's packet-32 sibling).

- **Part A:** `exp26b-u15-006` (backcheck-handoff-recovery), `exp26b-u15-007`
  (neutral-regroup-angle) (12 questions)
- **Part B:** `exp26b-u15-008` (behind-net-communication), `exp26b-u15-009`
  (cycle-high-outlet) (12 questions)
- **Part C:** `exp26b-u15-010` (point-release-traffic) (6 questions)

## 1. Counts

- Reviewed: 30 of 30 assigned questions. Completion: **complete**, `remainingQuestionIds: []`.
- Repairs proposed: 4 scenario replacements, all v1→v2: `exp26b-u15-006`, `-007`, `-008`,
  `-010`. `exp26b-u15-009` was independently re-verified against its own prior repair and
  found fully clean, no new repair needed.

## 2. Highest-impact findings

1. **`exp26b-u15-006-q1` and `exp26b-u15-007-q1` — the same category-mismatch distractor
   defect, independently found in both scenarios.** One asked "which attacker" but
   offered a Navy teammate as a candidate; the other asked "which Navy player" but
   offered a Gold opponent as a candidate. Both are the same class of trivially
   eliminable giveaway. Fixed by swapping in real same-category roster members in both.
2. **`exp26b-u15-006-q4` — a reversed "net-side" geometry claim.** The reference point
   was actually shallower than the comparison actor, the wrong side relative to Navy's
   own net, the opposite of the claim. Fixed to a point independently confirmed
   genuinely net-side.
3. **`exp26b-u15-010-q5` — an invented-actor reference, a new defect subtype.** A
   distractor referenced "the goalie" in a scene whose `setup.actors` has no goalie at
   all, confirmed by comparing against this scenario's packet-32 sibling, which does
   model a goalie and only then references one. Reworded to remove the phantom actor
   while preserving the same distractor logic.
4. **`exp26b-u15-010-q4` — a geometry-contradicted claim.** A prompt claimed a move
   "separates the release from F1," but independently computing both shot lines showed
   the screen distance was essentially unchanged, no real separation achieved. Kept the
   same coordinates and reworded the claim to match what the geometry actually shows.
5. **`exp26b-u15-008` — a grammar defect surviving a "no-open-ai-finding" label**, the
   same pattern now confirmed in nearly every packet since 29. `exp26b-u15-009`, by
   contrast, was independently re-verified clean against its own prior repair record
   (geometry, puck ownership, actor counts, and grammar all re-checked from scratch, not
   accepted on the label's word) and needed no further changes.

## 3. Scene/answer conflicts, rule/system uncertainty, visual checks not performed

- Real non-grammar scene/geometry conflicts found and repaired in three of five
  scenarios (§2, items 2, 3, 4).
- No rule/system uncertainty encountered.
- Two judgment calls flagged, not silently resolved: `exp26b-u15-007`'s q4-q6 position/
  coaching descriptions ("near the neutral-zone boards," "inside support") are loose but
  defensible coaching language rather than hard geometric claims, flagged as a close
  call; and the "all 12 rows verdict `repair` when only some questions had their own
  content changed" modeling choice was applied consistently within Part A's own output
  (a scene-level grammar cascade fails the grammar check for every linked question, per
  a strict reading of "retain requires all seven checks to pass").
- All cited sources were fetched and actually read; all confirmed to genuinely support
  their scenarios' stated sections, not just topically adjacent.
- Visual/rendered-UI check: **not performed** across all three parts, consistent with
  every prior packet.

## 4. Proposed curriculum bindings and ranked gaps

Out of scope for this run's requested output shape. No new gaps identified.

## 5. Files, structural validation, next packet

**Files:**
- `docs/factory/claude-project/claude-output/review-packet-35.json` — merged final
  envelope, schema-validated clean on the first pass
- `review-packet-35-part-a.json`, `-part-b.json`, `-part-c.json` — the three source parts
- No part could write its own `.md` report file (same harness restriction as recent
  packets); each agent's full report content is folded into this combined report.

**Structural validation actually run:** `node validate-return.mjs
../claude-output/review-packet-35.json` →
`{"errors":[],"warnings":[],"counts":{"assigned":30,"reviewed":30,"remaining":0,"repairedScenarios":4}}`.
Zero errors, zero warnings.

**Process note:** the packet-34 team-flip/dropped-actor lesson was checked in every
dispatch this packet and confirmed absent, a useful negative result showing the check
generalizes correctly (applied without finding a false positive) rather than only ever
confirming itself.

**Checks not run:** no independent (Codex/Luna) second review of this packet's content;
no rendered-scene/live-app verification; no human coach approval.

**Next packet to continue:** packet-36 (35 of 40 complete).
