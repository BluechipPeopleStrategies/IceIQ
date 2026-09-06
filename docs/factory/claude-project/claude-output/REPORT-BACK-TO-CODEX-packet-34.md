# Report back — packet-34

Snapshot `rr-20260905-c8403be16748c919`, packet `packet-34`. Five U15 scenarios, 6
questions each (30 total). Split across three agents, merged by the controller, validated
clean on the first pass. Part B's finding (§2) is the most significant single defect
discovered in this project so far.

- **Part A:** `exp26b-u15-001` (pinch-cover-read), `exp26b-u15-002` (powerplay-draw-out)
  (12 questions)
- **Part B:** `exp26b-u15-003` (pk-side-shift), `exp26b-u15-004`
  (powerplay-draw-recovery) (12 questions)
- **Part C:** `exp26b-u15-005` (entry-support-replace) (6 questions)

## 1. Counts

- Reviewed: 30 of 30 assigned questions. Completion: **complete**, `remainingQuestionIds: []`.
- Repairs proposed: 5 scenario replacements, all v1→v2 (except `-005`, already v2, now
  v3): `exp26b-u15-001`, `-002`, `-003`, `-004`, `-005`. Every scenario in this packet
  needed a repair.

## 2. Named finding: two special-teams scenarios had actors mislabeled to the wrong team, producing illegal on-ice strength situations

Both `exp26b-u15-003` (a penalty-kill scenario) and `exp26b-u15-004` (a power-play
scenario) are near-exact copies of validated predecessor scenarios in packet-31
(`exp26-u15-003`/`004`), but during generation one or more home-team actors had their
`team` field flipped to `"away"`, and one or two actors were dropped entirely. The
result:

- **`exp26b-u15-003`** showed 2 Navy skaters against 5 Gold skaters, an illegal
  situation: a penalty kill can only ever reach 5-on-3 shorthanded, never 5-on-2. The two
  "missing" Navy players (F1, F2) were sitting right in the data, mislabeled
  `team:"away"`, with coordinates matching the packet-31 sibling's home F1/F2 almost to
  the decimal, confirming this was a labeling defect, not a deliberate design. Separately,
  the briefing said "Gold 1 has the puck," but the puck was actually attached to the
  actor labeled "F1," and the bank's own display-name logic resolves "Gold 1" only to an
  actor literally labeled "A1" — a second, independent roster-consistency defect on top
  of the team-flip. Fixed by restoring F1/F2 to home, reassigning puck ownership to the
  actual A1 actor, and adding two more Navy skaters to reach a legal 4-on-5.
- **`exp26b-u15-004`** called itself "a power play" while showing 3 Navy against 3 Gold,
  even strength, a direct contradiction of its own framing. The away-tagged "D1" actor
  matched the packet-31 sibling's home defenseman almost to the decimal. Restored it to
  home and added one more Navy and two more Gold skaters to reach a legal 5-on-4.

Both fixes were independently verified by recomputing actual on-ice skater counts per
team after the repair, not just asserted. This defect class, silent team-field corruption
during scenario expansion producing an illegal special-teams strength situation, has not
been seen in any of the 33 prior packets and is worth a dedicated sweep of any other
`exp26b-u15-*` special-teams scenarios (power-play or penalty-kill families) for the same
pattern, since it evaded whatever process generated these two scenes without being
caught until this review.

## 3. Other repairs this packet

`exp26b-u15-001`'s briefing claimed "F1 carries below" while the stored puck was actually
loose, an invented-possession contradiction (the same failure class flagged for
`exp26-u7-001-q7/-q8` in an earlier review); fixed by rewording rather than assigning
possession that wasn't there. The same scenario's "two defenders between the puck and
net" claim was only true for one of the two named defenders on independent computation;
fixed by moving the second defender's coordinates to make the claim literally true,
preserving the tactical teaching point rather than diluting it. Every scenario in the
packet also carried at least one instance of the standing "YOU is"/lowercase-"you"
grammar defect, and three scenarios (`-002`'s sequence, `-004`'s sequence, `-005`'s
sequence) had forced-order sequence-question explanations, all resolved the same way as
prior packets: keep the sequence/answer key, disclose the overlap in the explanation.

## 4. Scene/answer conflicts, rule/system uncertainty, visual checks not performed

- Two major roster/strength-integrity defects found and repaired (§2), plus one
  invented-possession contradiction and one defender-count geometry fix (§3).
- No rule/system uncertainty encountered.
- One judgment call flagged, not silently resolved: `exp26b-u15-004`'s "closes from
  above" phrasing is a soft geometric description the reviewing agent couldn't fully
  verify against the relevant actor's exact position; treated as a caution rather than a
  provable defect, per the standing facing-angle precedent, and noted in the coverage row
  rather than repaired.
- All cited sources were fetched and actually read; the USA Hockey source for the
  special-teams scenarios states USA Hockey's own 14U+ floor for special-teams
  instruction, supporting the U15 age placement.
- Visual/rendered-UI check: **not performed** across all three parts, consistent with
  every prior packet.

## 5. Proposed curriculum bindings and ranked gaps

Out of scope for this run's requested output shape. No new gaps identified.

## 6. Files, structural validation, next packet

**Files:**
- `docs/factory/claude-project/claude-output/review-packet-34.json` — merged final
  envelope, schema-validated clean on the first pass
- `review-packet-34-part-a.json`, `-part-b.json`, `-part-c.json` — the three source parts
- No part could write its own `.md` report file (same harness restriction as recent
  packets); each agent's full report content is folded into this combined report.

**Structural validation actually run:** `node validate-return.mjs
../claude-output/review-packet-34.json` →
`{"errors":[],"warnings":[],"counts":{"assigned":30,"reviewed":30,"remaining":0,"repairedScenarios":5}}`.
Zero errors, zero warnings.

**Recommendation for Codex:** given that this team-flip/dropped-actor defect class
evaded detection until this review and directly breaks the stated special-teams premise
of two scenarios, worth a targeted sweep of every other special-teams-family scenario in
the `exp26b-*` and `exp26-*` clusters (power-play, penalty-kill, any man-advantage
framing) checking actual on-ice skater counts per team against the scenario's own stated
situation, rather than relying on it surfacing incidentally packet by packet.

**Checks not run:** no independent (Codex/Luna) second review of this packet's content;
no rendered-scene/live-app verification; no human coach approval.

**Next packet to continue:** packet-35 (34 of 40 complete).
