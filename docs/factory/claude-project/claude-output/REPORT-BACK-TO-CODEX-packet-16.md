# Report back — packet-16

Snapshot `rr-20260905-c8403be16748c919`, packet `packet-16`. This packet was split across
three agents working in parallel on different scenarios within the same packet, then
merged by the controller into one envelope and validated. Scenario ownership:

- **Part A:** `exp26-u11-024`, `exp26-u11-025` (20 questions)
- **Part B:** `exp26b-u11-001`, `exp26b-u11-002` (12 questions)
- **Part C:** `exp26b-u11-003` (6 questions)

## 1. Counts

- Reviewed: 38 of 38 assigned questions. Completion: **complete**, `remainingQuestionIds: []`.
- Verdicts: 20 `retain`, 18 `repair`, 0 `blocked`.
- Repairs proposed: 4 scenario replacements (one per scenario touched: `exp26-u11-024`,
  `exp26b-u11-001`, `exp26b-u11-002`, `exp26b-u11-003`), all version 1→2.
  `exp26-u11-025` needed no repair — fully retained clean.

Most affected-question counts look larger than the number of substantively rewritten
questions: per the project's own rule, a scenario-level briefing/setup fix changes every
linked question's content hash even when the question text itself is untouched. Only 6 of
the 38 questions actually have their own wording changed; the rest moved to `repair`
purely because their shared scene briefing was corrected.

## 2. Five highest-impact before/after examples

1. **`exp26b-u11-003` briefing** (Part C): "F1 has the puck near the middle; YOU **is** to
   the right, but D1 occupies the direct line." → "...YOU **are** to the right...". Cascades
   to all 6 linked question hashes (5 of 6 question texts otherwise byte-identical to
   version 1; q2 was already at its prior-repaired content).
2. **`exp26b-u11-001` briefing** (Part B): "YOU **approaches** a loose puck beside the left
   wall" → "YOU **approach**...". Same subject-verb-agreement class.
3. **`exp26b-u11-001-q1` explanation** (Part B): "YOU **is** beside the puck" → "YOU **are**
   beside the puck." Underlying claim independently re-verified as geometrically correct
   (1.414 m vs. 10.63 m / 10.44 m for F2/D1) — only the grammar was wrong.
4. **`exp26b-u11-002` briefing** (Part B): "YOU **is** open to the right" → "YOU **are** open
   to the right." No repair receipt existed for this scenario at all; closer scrutiny of an
   unreceipted scene is what surfaced it.
5. **`exp26-u11-024-q1`/`-q2`** (Part A): prompt "Where **is** YOU..." → "Where **are**
   YOU..."; option "**YOU's** location" → "**Your** location" (non-standard possessive
   corrected to the contract's "your" convention). Notably, both prior AI passes
   (`catalog-review.json`, `combined-review.json`) had already marked this exact hash
   "no-open-ai-finding" — missed twice before this pass caught it.

No roster, geometry, answer-key, or age-mismatch defects were found anywhere in this
packet — every repair in packet-16 is a subject-verb-agreement grammar fix on "YOU," the
single most recurring defect class across the whole assignment so far.

## 3. Scene/answer conflicts, rule/system uncertainty, visual checks not performed

- No scene/answer conflicts found in any of the five scenarios.
- No rule/system uncertainty encountered.
- One descriptive-imprecision note, flagged but **not** repaired (no answer key depends on
  it): `exp26b-u11-002`'s briefing places F1 "near the left hash marks," but F1's actual
  coordinate is roughly 4-5 m outside the nearest faceoff-circle edge. Coach-narration
  color, not a claim any question keys off.
- One quality nit, flagged but **not** force-repaired (Part A, per calibration lesson 5 —
  don't invent a scenario change for a small wording issue): `exp26-u11-024-q8`'s "the blue
  line is painted" distractor is weak/trivia-adjacent but not false or unsafe.
- Visual/rendered-UI check: **not performed** across all three parts. No runtime/browser
  access this session; all geometry (actor positions, carried-puck offsets, distances,
  betweenness, on-ice checks) was verified offline against the project's own coordinate/
  hash tooling (`questionContentHash`, `scenarioSnapshotHash`, `isCoachRoutePoint`,
  `makeScene`, `validateExperimentalBank`, `positionSubjectIssue`, `questionActorWarnings`),
  not a live render. No app testing, coach approval, or publication is claimed anywhere in
  this packet.

## 4. Proposed curriculum bindings and ranked gaps

Out of scope for this run's requested output shape (scoped to
`coverage`/`repairs`/`sourceChecks`/`remainingQuestionIds` only, split three ways for
parallel review). `curriculum-coverage.json` already carries planning-signal keyword
matches for the scenarios in this packet — those are signals only, not approved bindings,
per the assignment's own caveat that keyword matches are not curriculum assignments.

## 5. Files, structural validation, next packet

**Files:**
- `docs/factory/claude-project/claude-output/review-packet-16.json` — merged final
  envelope (controller-assembled from the three parts below, schema-validated clean)
- `docs/factory/claude-project/claude-output/review-packet-16-part-a.json` (source: Part A)
- `docs/factory/claude-project/claude-output/review-packet-16-part-b.json` (source: Part B)
- `docs/factory/claude-project/claude-output/review-packet-16-part-c.json` (source: Part C)
- `docs/factory/claude-project/claude-output/REPORT-PART-packet-16-b.md` (Part B's own
  detailed report; Parts A and C could not write their own report files — a harness
  restriction blocked subagent-authored `.md` report files for those two — so their content
  is folded into this combined report instead)
- This file: `REPORT-BACK-TO-CODEX-packet-16.md`

**Structural validation actually run:** `node validate-return.mjs
../claude-output/review-packet-16.json` against the merged envelope →
`{"errors":[],"warnings":[],"counts":{"assigned":38,"reviewed":38,"remaining":0,"repairedScenarios":4}}`.
Two schema-completeness gaps surfaced on the first validation pass (Part C's coverage rows
claimed a `sources: pass` check without a `sourceUrls` entry pointing at the already-read
`hc-vision-2024` source check, and Part C's repair `reasons` entry was missing the required
`evidence` field) — both were mechanical field-completion fixes using facts already
documented by that agent (the source was genuinely read and recorded in `sourceChecks`;
the before/after briefing text and hash-verification method were already stated in the
`change` field), not new judgment calls, and the merged file now validates clean.

**Checks not run:** no independent (Codex/Luna) second review of this packet's content;
no rendered-scene/live-app verification; no human coach approval.

**Next packet to continue:** packet-17.
