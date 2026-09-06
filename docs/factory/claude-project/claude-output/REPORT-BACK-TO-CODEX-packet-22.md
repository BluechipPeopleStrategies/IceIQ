# Report back — packet-22

Snapshot `rr-20260905-c8403be16748c919`, packet `packet-22`. All five U13 scenarios. Split
across three agents, merged by the controller, validated clean (0 errors) on the first
pass after adopting the packet-21 lesson (build replacements via `structuredClone` +
targeted mutation, verify `affectedQuestionIds` against real recomputed hashes before
finishing) — no schema fixes needed this time.

- **Part A:** `exp26-u13-005`, `exp26-u13-006` (20 questions)
- **Part B:** `exp26-u13-007`, `exp26-u13-008` (20 questions)
- **Part C:** `exp26-u13-009` (10 questions)

## 1. Counts

- Reviewed: 50 of 50 assigned questions. Completion: **complete**, `remainingQuestionIds: []`.
- Verdicts: 31 `retain`, 19 `repair`, 0 `blocked`.
- Repairs proposed: 5 scenario replacements, all v1→v2: `exp26-u13-005`, `-006`, `-007`,
  `-008`, `-009`.

## 2. Five highest-impact before/after examples

1. **`exp26-u13-009` — scene/briefing geometry contradiction, corroborated by its own
   source.** YOU sat 1.38m past the attacking-zone blue line while the briefing claimed
   "arriving through the neutral zone." Fixed by moving YOU back into the neutral zone —
   independently corroborated by the scenario's own cited Hockey Canada PDF, whose actual
   teaching point ("saves his ice in neutral zone... for timing purposes") confirms the
   intended position, not the depicted one.
2. **`exp26-u13-006-q9` — a defect found independently, contradicting the scenario's own
   teaching point.** The position example shared F1's exact y-coordinate, so the "middle
   support pocket" reference did NOT actually differ in height from F1 — directly
   undermining this same scenario's own q6/q10 lesson ("two players at the same height
   let one defender cover both"). Fixed to a point genuinely 6m different in height.
3. **`exp26-u13-008-q8` — a live stale-feedback bug from an earlier repair.** An earlier
   packet's fix swapped out a distractor option (the "bench" option), but the explanation
   was never updated and still refutes the removed option instead of the current one.
   Verified against the actual prior repair receipt (`u13-repairs.json`) before fixing.
4. **Two near-duplicate reflection questions** (`exp26-u13-007-q10` vs its own q6;
   `exp26-u13-008-q10` vs its own q6) — each near-duplicated its scenario's own earlier
   reflection almost word-for-word. Both retargeted to build on newer facts introduced
   later in their scenario instead of restating q6.
5. **`exp26-u13-007-q9`** duplicated q4's "move below D2" job at only 1.41m from the
   starting position (vs. q4's 6.40m) — retargeted to a genuine conditional instead of a
   near-copy.

Every scenario also had at least one grammar/self-contradiction fix (a "YOU supports"→
"support" grammar fix, an answer option that contradicted its own explanation, a lowercase
"you" inconsistency).

## 3. Scene/answer conflicts, rule/system uncertainty, visual checks not performed

- Three real scene/answer conflicts found and repaired (§2, items 1, 2, and the
  self-contradictory option in `exp26-u13-008-q1`).
- No rule/system uncertainty encountered.
- **Two benign validator warnings** (not errors): `exp26-u13-006-q1`/`-q2` trip the
  automated actor-name check on "F2," because the scenario's own briefing explicitly
  assigns YOU the role name "F2" — already investigated by the reviewing agent and
  confirmed as an intentional, benign naming choice, not a defect.
- One source age-band note: `exp26-u13-008`'s only cited source is confirmed (by directly
  reading the PDF) to be Hockey Canada's High-Performance/U15-U18 material, an older
  bracket than U13. The scenario's own `limits` field already discloses this as an
  adaptation, so not treated as disqualifying — flagged per standing instruction to check
  source age-match.
- Visual/rendered-UI check: **not performed** across all three parts, consistent with
  every prior packet.

## 4. Proposed curriculum bindings and ranked gaps

Out of scope for this run's requested output shape. Both `exp26-u13-007`/`-008` map
cleanly to existing `hockey-sense`/`off-puck-support-offense` ledger domains — no new gap
identified this packet.

## 5. Files, structural validation, next packet

**Files:**
- `docs/factory/claude-project/claude-output/review-packet-22.json` — merged final
  envelope, schema-validated clean on the first pass
- `review-packet-22-part-a.json`, `-part-b.json`, `-part-c.json` — the three source parts
- No part could write its own `.md` report file (same harness restriction as recent
  packets); each agent's full report content is folded into this combined report.

**Structural validation actually run:** `node validate-return.mjs
../claude-output/review-packet-22.json` →
`{"errors":[],"warnings":["exp26-u13-006-q1: F2 is not a displayed actor name...","exp26-u13-006-q2: F2 is not a displayed actor name..."],"counts":{"assigned":50,"reviewed":50,"remaining":0,"repairedScenarios":5}}`.
Zero errors — the two warnings are the already-investigated benign naming case above, not
a defect requiring a fix.

**Process note (packet-21 lesson confirmed working):** all three agents this packet built
their replacements via `structuredClone` + targeted mutation rather than reconstructing
question objects from scratch, and independently verified `affectedQuestionIds` against
real recomputed hash diffs before finishing. No serialization-artifact schema gaps
occurred this packet — the fix from packet-21 generalized successfully.

**Checks not run:** no independent (Codex/Luna) second review of this packet's content;
no rendered-scene/live-app verification; no human coach approval.

**Next packet to continue:** packet-23.
