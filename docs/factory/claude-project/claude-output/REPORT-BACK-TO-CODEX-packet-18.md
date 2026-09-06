# Report back — packet-18

Snapshot `rr-20260905-c8403be16748c919`, packet `packet-18`. Split across three agents on
different scenarios within the same packet, merged by the controller. First validation
pass found 10 coverage rows missing a required `alternative` field (coaching-basis
questions); sent back to the owning agent for a genuine per-question fix, then re-merged
and validated clean.

- **Part A:** `exp26b-u11-009`, `exp26b-u11-010` (12 questions)
- **Part B:** `exp26b-u11-011`, `exp26b-u11-012` (12 questions)
- **Part C:** `exp26b-u11-013` (6 questions)

## 1. Counts

- Reviewed: 30 of 30 assigned questions. Completion: **complete**, `remainingQuestionIds: []`.
- Verdicts: 12 `retain`, 18 `repair`, 0 `blocked`.
- Repairs proposed: 5 scenario replacements, all v1→v2: `exp26b-u11-009`, `-010`, `-011`,
  `-012`, `-013`. Every scenario in this packet needed at least a grammar fix.

## 2. Five highest-impact before/after examples

1. **`exp26b-u11-010-q4` — a real geometry defect, not just grammar.** The position
   reference (5.8,-4.4) was intended to move YOU *farther* from D1, but computed distance
   was actually 4.05 m — closer than YOU's original spot (4.47 m), directly contradicting
   the prompt's explicit "separate from D1" instruction. Repaired to (5.8,-5.5) → 5.01 m,
   genuinely farther, confirmed on-ice.
2. **`exp26b-u11-013` briefing**: "YOU **controls** the puck high in the right-side
   lane..." → "YOU **control**..." Confirmed via the actual render source
   (`ExperimentalPractice.jsx`) that this briefing renders verbatim above every question,
   so it's genuinely player-facing.
3. **`exp26b-u11-011` briefing + cue**: "YOU **is** nearer the boards" → "YOU **are**...";
   "YOU **is** near the wall beyond D1" → "YOU **are**..." Both in the same scenario,
   cascading to all 6 linked question hashes.
4. **`exp26b-u11-009` briefing**: "YOU **carries**" → "YOU **carry**"; plus a
   capitalization-only fix in q5 (lowercase "you" → "YOU", not a grammar defect, a house-
   style consistency fix).
5. **`exp26b-u11-012-q5`**: "YOU still **owns** the pass" → "YOU still **own** the pass" —
   a question-only fix; q1-q4/q6 in that scenario are fully clean and retained.

Both scenarios in Part A carried an incorrect `curriculum-coverage.json` keyword-match tag
(`defensive-play`, a false positive from "defend"/"angle" tokens on scenarios that are
actually offensive reads) — flagged for Codex as a planning-signal correction, not
repaired as content since curriculum bindings are out of this packet's scope.

## 3. Scene/answer conflicts, rule/system uncertainty, visual checks not performed

- One real scene/answer conflict found and repaired: `exp26b-u11-010-q4` above.
- No rule/system uncertainty encountered.
- One low-stakes ambiguity noted but not repaired: `exp26b-u11-011`'s cue "D2 is above the
  play" could read as screen-relative or hockey vernacular; D2 isn't referenced by any
  question's answer key, so it doesn't affect correctness.
- Visual/rendered-UI check: **not performed** across all three parts, consistent with
  every prior packet. All geometry verified offline via the project's own tooling.

## 4. Proposed curriculum bindings and ranked gaps

Out of scope for this run's requested output shape. One correction flagged: Part A
recommends re-tagging `exp26b-u11-009` as `agility-mobility`/`puck-carrier-options`/
`scanning` and `exp26b-u11-010` as `receiving`/`off-puck-support-offense`, replacing the
current `defensive-play` false-positive match on both.

## 5. Files, structural validation, next packet

**Files:**
- `docs/factory/claude-project/claude-output/review-packet-18.json` — merged final
  envelope, schema-validated clean after one fix round
- `review-packet-18-part-a.json`, `-part-b.json`, `-part-c.json` — the three source parts
- No part could write its own `.md` report file (same harness restriction as packet-17);
  each agent's full report content is folded into this combined report.

**Structural validation actually run:** First pass over the merged envelope failed with 10
`"Conditional alternative required"` errors — Part B's coverage rows for
`exp26b-u11-011-q2` through `-q6` and `exp26b-u11-012-q2` through `-q6` (all `basis:
coaching`) were missing the required `alternative` field. Sent back to the owning agent,
which added a genuine, question-specific alternative reading to each of the 10 rows (not
a placeholder) and confirmed valid JSON. Re-merged and re-ran: `node validate-return.mjs
../claude-output/review-packet-18.json` →
`{"errors":[],"warnings":[],"counts":{"assigned":30,"reviewed":30,"remaining":0,"repairedScenarios":5}}`.

**Checks not run:** no independent (Codex/Luna) second review of this packet's content;
no rendered-scene/live-app verification; no human coach approval.

**Next packet to continue:** packet-19.
