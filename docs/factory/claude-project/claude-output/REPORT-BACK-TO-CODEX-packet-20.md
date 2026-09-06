# Report back — packet-20

Snapshot `rr-20260905-c8403be16748c919`, packet `packet-20`. Split across three agents on
different scenarios within the same packet, merged by the controller, validated clean on
the first pass. This packet closes out the `exp26b-u11-019` goalie-family flag carried
over from packet-19.

- **Part A:** `exp26b-u11-019`, `exp26b-u11-020` (12 questions)
- **Part B:** `exp26b-u11-021`, `exp26b-u11-022` (12 questions)
- **Part C:** `exp26b-u11-023` (6 questions)

## 1. Counts

- Reviewed: 30 of 30 assigned questions. Completion: **complete**, `remainingQuestionIds: []`.
- Verdicts: 0 `retain`, 30 `repair`, 0 `blocked`. Every scenario in this packet needed at
  least a grammar fix; two also needed real content fixes.

## 2. Five highest-impact before/after examples

1. **`exp26b-u11-019` — goalie-family defect resolved (Theory 1 confirmed again).** This
   scenario does carry the cross-cutting defect flagged from packet-19: a "home" (Navy)
   goalie placed at `x=26` when Navy always attacks `+x`. Resolved via Theory 1 (reposition
   to `x=-26`, keep `team: "home"`) based on this scene's own briefing: "Gold now attacks
   -x toward the left net" — pure defensive-recovery framing, no offensive content that
   would support Theory 2. Unlike `-015` in packet-19, the rest of the actor layout did
   NOT need repositioning here (checked numerically), so no `blocked` verdict was needed —
   this scenario closed out fully clean.
2. **`exp26b-u11-019-q4`**: a separate, unrelated overclaim — the prompt said the position
   reference was "between F2 and the left net," but computed perpendicular distance from
   that line was 8.7 m. Fixed by rewording the prompt (the explanation was already
   accurate; only the prompt overclaimed).
3. **`exp26b-u11-021`/`-022`/`-020` briefings**: three more instances of the recurring
   "YOU" subject-verb-agreement class ("YOU carries"→"carry", "YOU is above the dot"→"are",
   "YOU forechecks"/"YOU approaches"→"forecheck"/"approach"), each cascading to all 6
   linked question hashes in their scenario.
4. **`exp26b-u11-023` briefing and cues**: the same defect class, missed by every prior
   review including both Luna passes and `historical-checks.json` ("YOU is above the
   play"→"are"; "YOU is above the corner"→"are"), plus q1's "Why does YOU have"→"do" and
   "YOU owns"→"own".
5. **Two scenarios independently confirmed clean of the goalie defect**: `exp26b-u11-021`'s
   away goalie at x=26 correctly guards the net Navy attacks (no mismatch); `-020`,
   `-022`, and `-023` have no goalie actor at all. Both Part A and Part B independently
   checked and cross-flagged `-019` before either had seen the other's confirmation —
   good convergent evidence the defect check itself is working as intended.

## 3. Scene/answer conflicts, rule/system uncertainty, visual checks not performed

- One real scene/answer conflict found and repaired (`-019-q4`'s overclaimed betweenness
  claim, §2).
- No rule/system uncertainty encountered.
- No unresolved ambiguity requiring a `blocked` verdict this packet — a change from
  packet-19, where the same defect family produced one `blocked` question in `-015`.
- Visual/rendered-UI check: **not performed** across all three parts, consistent with
  every prior packet.

## 4. Proposed curriculum bindings and ranked gaps

Out of scope for this run's requested output shape, same as prior packets.

## 5. Files, structural validation, next packet

**Files:**
- `docs/factory/claude-project/claude-output/review-packet-20.json` — merged final
  envelope, schema-validated clean on the first pass
- `review-packet-20-part-a.json`, `-part-b.json`, `-part-c.json` — the three source parts
- No part could write its own `.md` report file (same harness restriction as recent
  packets); each agent's full report content is folded into this combined report.

**Structural validation actually run:** `node validate-return.mjs
../claude-output/review-packet-20.json` →
`{"errors":[],"warnings":[],"counts":{"assigned":30,"reviewed":30,"remaining":0,"repairedScenarios":5}}`.
No schema-completeness gaps.

**Checks not run:** no independent (Codex/Luna) second review of this packet's content;
no rendered-scene/live-app verification; no human coach approval.

**Follow-up closed:** the `exp26b-u11-019` goalie-family flag from packet-19's report is
now resolved — confirmed present, correctly fixed via Theory 1 (matching `-015`'s
resolution, not `-018`'s), and did not require a `blocked` verdict. No further scenarios in
this family remain unreviewed.

**Next packet to continue:** packet-21.
