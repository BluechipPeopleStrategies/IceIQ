# Report back — packet-30

Snapshot `rr-20260905-c8403be16748c919`, packet `packet-30`. Five U13 scenarios. Split
across three agents, merged by the controller, validated clean on the first pass. All
five scenarios were repaired, all five carried the standing grammar defect surviving a
prior "no-open-ai-finding" label, confirming lesson 4's warning at scale.

- **Part A:** `exp26b-u13-021`, `exp26b-u13-022` (12 questions)
- **Part B:** `exp26b-u13-023`, `exp26b-u13-024` (12 questions)
- **Part C:** `exp26b-u13-025` (6 questions)

## 1. Counts

- Reviewed: 30 of 30 assigned questions. Completion: **complete**, `remainingQuestionIds: []`.
- Repairs proposed: 5 scenario replacements, all v2→v3: `exp26b-u13-021`, `-022`, `-023`,
  `-024`, `-025`. Every scenario in this packet needed a repair.

## 2. Highest-impact findings

1. **`exp26b-u13-021-q1` — the exact phrasing the original project brief names as
   unacceptable, found live in the bank.** "Where is YOU with the puck?" → "Where are
   YOU with the puck?" This is the textbook instance of the grammar defect class, not a
   subtler variant.
2. **`exp26b-u13-022` — a wrong-landmark defect, the same class the calibration doc
   already adjudicated once.** The briefing named "the left blue line" (x≈-7.62) as a
   crossing point, but every actor and the puck sit at x=9-23, deep in the offensive zone
   near Gold's own goal line. The carried-puck offset formula for the puck-carrier
   matched exactly, confirming only the landmark label was wrong, not the coordinates.
   Fixed by rewording to "the offensive zone" rather than relocating actors, preserving
   the scene's actual (self-consistent) geometry.
3. **`exp26b-u13-025-q4` — a genuine off-line position reference.** A prompt claimed to
   move D1 "between Gold 1 and the Navy net," but the computed line from Gold 1 to the
   net showed the given reference point sitting on the opposite side of the net's
   centreline from the claim, off the direct lane by roughly 2.6m. Fixed to a point that
   recomputes as genuinely closer to the net than Gold 1.
4. **All five scenarios carried the standing "YOU is/has/controls/reads/attacks/
   recovers" grammar defect in briefings, cues, or question text, and all five had a
   prior "no-open-ai-finding" historical label at their current hash** — the fourth
   packet in a row (following 017, 023, 024 in packet-29) to confirm that a clean
   historical label does not guarantee this defect's absence, especially where an
   earlier repair pass fixed a different issue (usually the attack-direction wording) in
   the same briefing sentence and left the grammar untouched.
5. Part A caught and corrected its own transcription error before finishing: 8 of 12
   `baseContentHash` values were initially copied from the wrong column of a prior repair
   receipt (the v1→v2 "before" hash rather than the current v2 hash). Running the real
   validator against its own draft caught this, and it was fixed before the report was
   finalized, the same self-correcting pattern first seen in packet-23.

## 3. Scene/answer conflicts, rule/system uncertainty, visual checks not performed

- Two real non-grammar scene/geometry conflicts found and repaired (`-022`'s wrong
  landmark, `-025`'s off-line position reference).
- No rule/system uncertainty encountered.
- One judgment call flagged, not silently resolved: `-025`'s loose puck sits
  approximately 5.35m from the actual boards/corner arc, not literally touching them;
  treated as a defensible zone description ("loose along the wall") rather than a
  literal-contact claim, distinguished from the calibration packet's more blatant
  rim/open-ice contradiction, and flagged in `sceneEvidence.unproven` for Codex's own
  read.
- Source age-band notes, all disclosed adaptations, not treated as disqualifying: several
  scenarios cite Hockey Canada's U15/U18 or U17 material for general-principle support
  above U13.
- Visual/rendered-UI check: **not performed** across all three parts, consistent with
  every prior packet.

## 4. Proposed curriculum bindings and ranked gaps

Out of scope for this run's requested output shape. No new gaps identified.

## 5. Files, structural validation, next packet

**Files:**
- `docs/factory/claude-project/claude-output/review-packet-30.json` — merged final
  envelope, schema-validated clean on the first pass
- `review-packet-30-part-a.json`, `-part-b.json`, `-part-c.json` — the three source parts
- No part could write its own `.md` report file (same harness restriction as recent
  packets); each agent's full report content is folded into this combined report.

**Structural validation actually run:** `node validate-return.mjs
../claude-output/review-packet-30.json` →
`{"errors":[],"warnings":[],"counts":{"assigned":30,"reviewed":30,"remaining":0,"repairedScenarios":5}}`.
Zero errors, zero warnings.

**Checks not run:** no independent (Codex/Luna) second review of this packet's content;
no rendered-scene/live-app verification; no human coach approval.

**Next packet to continue:** packet-31 (30 of 40 complete).
