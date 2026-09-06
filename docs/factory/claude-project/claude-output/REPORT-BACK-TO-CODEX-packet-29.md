# Report back — packet-29

Snapshot `rr-20260905-c8403be16748c919`, packet `packet-29`. Five U13 scenarios. Split
across three agents, merged by the controller, validated clean on the first pass. The
packet-28 zone-placement lesson was baked into every dispatch and applied correctly
(judged per-scenario against family/topic, not pattern-matched to the numbered cluster).

- **Part A:** `exp26b-u13-016`, `exp26b-u13-017` (12 questions)
- **Part B:** `exp26b-u13-018`, `exp26b-u13-019` (12 questions)
- **Part C:** `exp26b-u13-020` (6 questions)

## 1. Counts

- Reviewed: 30 of 30 assigned questions. Completion: **complete**, `remainingQuestionIds: []`.
- Repairs proposed: 4 scenario replacements, all v2→v3: `exp26b-u13-017`, `-018`, `-019`,
  `-020`. `exp26b-u13-016` was fully clean.

## 2. Highest-impact findings

1. **`exp26b-u13-017` — a grammar defect that survived an earlier repair pass, again.**
   `historical-checks.json` labeled all six of this scenario's questions
   `no-open-ai-finding`. A direct scan turned up five instances of the "YOU is/knows/
   confirms" subject-verb defect across the briefing, an explanation, an answer option,
   and a second explanation. An earlier v1→v2 repair had touched the same briefing
   sentence for an unrelated attack-direction fix and left the grammar error standing.
   Fixed all five instances.
2. **`exp26b-u13-018` — a genuine wording/geometry mismatch, not just grammar.** q1 asked
   "What is D1 doing at the blue line?" but D1's stored position is 13.38m past the blue
   line and only 6.13m from the goal line, deep in the attacking zone, not at the blue
   line. Reworded the prompt to match the actual position ("after pinching down from the
   blue line") and replaced a non-sequitur distractor ("Taking a faceoff") with a credible
   competing read. The same scenario's q4 position reference also contradicted its own
   prompt: called "slightly inside YOU" but was actually farther from centre ice, the
   opposite of inside; corrected.
3. **`exp26b-u13-020` — correctly declined a facing-geometry non-issue by checking
   cluster precedent.** All five actors' facing values clustered near π, which initially
   looked like a defect (a carrier facing backward while described as moving forward).
   The reviewing agent found that `exp26b-u13-015`'s repair (from packet-28) had already
   reviewed the identical pattern and explicitly declined to change it, citing the
   authoring contract's own note that facing is a rendering cue, not a movement/gaze
   claim. Followed that precedent for consistency rather than re-litigating it, and
   flagged both scenarios together for Codex if the precedent itself is ever revisited.
4. **Zone-placement lesson applied correctly, not over-applied.** `exp26b-u13-017`'s and
   `-018`'s actors sit at positive x despite being framed as defensive/pinch-adjacent
   action; both were judged as legitimate transition-in-progress or offensive-zone pinch
   scenes (matching the family/topic test from packet-28) rather than flagged as
   zone-flip defects. `exp26b-u13-019`, by contrast, is a genuine defensive-zone breakout
   scene and its goalie/D1/D2 positions were independently verified correct at x≈-27,
   confirming the rule applies precisely where the family/topic says it should and not
   elsewhere.
5. Every repaired scenario also carried at least one instance of the "YOU is" family
   grammar defect in its briefing or cues, fixed as part of the same replacement.

## 3. Scene/answer conflicts, rule/system uncertainty, visual checks not performed

- Two real non-grammar scene/wording/geometry conflicts found and repaired
  (`exp26b-u13-018`'s q1 and q4).
- No rule/system uncertainty encountered.
- One precedent-following judgment call, not silently resolved: `exp26b-u13-020`'s
  facing/geometry pattern, matched against `exp26b-u13-015`'s prior repair decision (§2,
  item 3) — flagged for Codex to revisit both together if the underlying precedent is
  ever reconsidered.
- Source age-band notes, all disclosed adaptations, not treated as disqualifying: several
  scenarios cite USA Hockey 14U material or Hockey Canada's U17 Program of Excellence for
  general-principle support one to four age bands above U13.
- Visual/rendered-UI check: **not performed** across all three parts, consistent with
  every prior packet.

## 4. Proposed curriculum bindings and ranked gaps

Out of scope for this run's requested output shape. No new gaps identified.

## 5. Files, structural validation, next packet

**Files:**
- `docs/factory/claude-project/claude-output/review-packet-29.json` — merged final
  envelope, schema-validated clean on the first pass
- `review-packet-29-part-a.json`, `-part-b.json`, `-part-c.json` — the three source parts
- No part could write its own `.md` report file (same harness restriction as recent
  packets); each agent's full report content is folded into this combined report.

**Structural validation actually run:** `node validate-return.mjs
../claude-output/review-packet-29.json` →
`{"errors":[],"warnings":[],"counts":{"assigned":30,"reviewed":30,"remaining":0,"repairedScenarios":4}}`.
Zero errors, zero warnings.

**Process note:** the packet-28 zone-placement lesson generalized correctly on its first
outing in a new packet, same pattern as packet-22's confirmation of the packet-21
structuredClone lesson and packet-27's confirmation of the packet-26 house-style
correction — each of these standing lessons has now been independently re-applied
correctly in the packet immediately following its discovery.

**Checks not run:** no independent (Codex/Luna) second review of this packet's content;
no rendered-scene/live-app verification; no human coach approval.

**Next packet to continue:** packet-30 (three-quarters point — 29 of 40 complete).
