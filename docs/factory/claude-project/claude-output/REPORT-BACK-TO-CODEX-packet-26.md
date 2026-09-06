# Report back — packet-26

Snapshot `rr-20260905-c8403be16748c919`, packet `packet-26`. Five U13 scenarios. Split
across three agents, merged by the controller. One process finding this packet, not a
schema bug: Part B's own draft reached a wrong conclusion on a grammar defect and required
a substantive correction (not a mechanical fix), detailed in §2.

- **Part A:** `exp26b-u13-001`, `exp26b-u13-002` (12 questions)
- **Part B:** `exp26b-u13-003`, `exp26b-u13-004` (12 questions)
- **Part C:** `exp26b-u13-005` (6 questions)

## 1. Counts

- Reviewed: 30 of 30 assigned questions. Completion: **complete**, `remainingQuestionIds: []`.
- Verdicts: 24 `retain`, 6 `repair`, 0 `blocked`.
- Repairs proposed: 4 scenario replacements, all v1→v2/v3: `exp26b-u13-002`, `-003`, `-004`,
  `-005`. `exp26b-u13-001` was fully clean.

## 2. Named finding: an agent talked itself into treating a defect as house style, and was corrected against precedent

This packet's most important result is a process failure, not a content one.

Part B, reviewing `exp26b-u13-004`, found the "YOU is [role]" / "YOU's" subject-verb
pattern in its own scenario (present in all 6 questions via the shared briefing). Instead
of flagging it as the same defect every prior packet in this project has treated as a
grammar error, Part B grepped the packet and found the identical pattern recurring
"consistently... dozens of times across the whole packet," and concluded from that
consistency that it was **deliberate house style**. It marked all 6 rows
`grammar: pass` / `verdict: retain` and explicitly declined to fix it.

This was wrong, and demonstrably so from evidence available inside the same packet:

- **Sibling agents in the same packet had just fixed the identical pattern.** Part A had
  already repaired "YOU is" in `exp26b-u13-002`; Part C had already repaired it in
  `exp26b-u13-005`. Both are in the same `exp26b-u13-*` family as Part B's own scenario.
- **25 prior packets treat this pattern as a defect with zero exceptions.**
- **The calibration-adjudication document itself fixes this exact pattern** ("Correct 'Why
  is YOU' to 'Why are YOU'"), which every dispatch in this project is instructed to apply.

The controller caught this by independently grepping Part B's own output JSON (not just
trusting its self-report), confirmed 6 unfixed "YOU is"/"YOU's" instances all marked
pass/retain, and sent Part B a detailed correction: the grammar rule, the sibling-agent
precedent inside its own packet, the calibration doc's own decision, and the reasoning
that "consistency of an error across a batch is exactly what you'd expect from a
baked-in authoring mistake, not evidence of intent."

Part B accepted the correction, re-reviewed, and found the pattern was narrower than its
first pass had claimed: exactly 2 real instances in `exp26b-u13-004`, not "dozens" —
briefing "YOU is wide left" → "YOU are wide left" (shared scene text, cascades to all 6
questions' hashes), and q2 "Which two jobs fit YOU's wide support?" → "your wide support"
(question-specific). It rebuilt the replacement via `structuredClone` + targeted mutation,
recomputed all 6 question hashes for real (confirmed changed, since the briefing is shared
scene data), and flipped all 6 coverage rows from `retain`/`grammar: pass` to
`repair`/`grammar: fail`.

**Standing lesson for all future dispatches, now added:** an agent's own pattern-matching
across a batch is not evidence a pattern is intentional — the more consistently an error
recurs, the more it looks like a single baked-in authoring mistake propagated by
copy/paste, not a style choice. Precedent (sibling scenarios in the same packet, prior
packets, the calibration doc) settles this question; a agent should check precedent before
concluding "this must be deliberate," not after.

## 3. Other repairs this packet

- **`exp26b-u13-002`** — briefing grammar fix ("YOU is" family), isolated to shared scene
  text.
- **`exp26b-u13-003`** — a genuine geometry defect (a distance/direction reference,
  independently computed) plus a weak/unverified q5 distractor, bundled into one
  replacement.
- **`exp26b-u13-005`** — a geometry outlier confirmed by cross-referencing 18 other
  "half wall" scenes bank-wide (this scene's reference point was measurably off the
  pattern every other instance follows), plus 2 grammar fixes, bundled into one
  replacement.

## 4. Scene/answer conflicts, rule/system uncertainty, visual checks not performed

- Two real scene/geometry conflicts found and repaired (`-003`, `-005`), beyond the
  grammar-class fixes.
- No rule/system uncertainty encountered.
- No source age-band issues flagged this packet.
- Visual/rendered-UI check: **not performed** across all three parts, consistent with
  every prior packet.

## 5. Proposed curriculum bindings and ranked gaps

Out of scope for this run's requested output shape. No new gaps identified.

## 6. Files, structural validation, next packet

**Files:**
- `docs/factory/claude-project/claude-output/review-packet-26.json` — merged final
  envelope, schema-validated clean after Part B's content correction (no schema/mechanical
  fixes were needed at merge time)
- `review-packet-26-part-a.json`, `-part-b.json` (corrected), `-part-c.json` — the three
  source parts
- No part could write its own `.md` report file (same harness restriction as recent
  packets); each agent's full report content is folded into this combined report.

**Structural validation actually run:** `node validate-return.mjs
../claude-output/review-packet-26.json` →
`{"errors":[],"warnings":[],"counts":{"assigned":30,"reviewed":30,"remaining":0,"repairedScenarios":4}}`.
Zero errors, zero warnings.

**Checks not run:** no independent (Codex/Luna) second review of this packet's content;
no rendered-scene/live-app verification; no human coach approval.

**Recommendation for Codex:** the §2 finding is worth reading as a process-quality signal
about parallel review generally — an individually reasonable-sounding inference ("this
error is too consistent to be an accident, therefore it's intentional") produced the wrong
verdict, and was only caught because the controller independently verified the sibling
agents' output rather than trusting each part's self-report. Worth considering whether
future dispatches should explicitly instruct agents to check sibling/precedent findings
before concluding a recurring pattern is deliberate.

**Next packet to continue:** packet-27.
