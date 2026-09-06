# Report back — packet-27

Snapshot `rr-20260905-c8403be16748c919`, packet `packet-27`. Five U13 scenarios. Split
across three agents, merged by the controller, validated clean on the first pass. The
packet-26 lesson (don't infer "house style" from error consistency, check sibling
precedent first) was baked into every dispatch this time and held: all three parts
correctly treated the "YOU is" pattern as a defect without hesitation.

- **Part A:** `exp26b-u13-006`, `exp26b-u13-007` (12 questions)
- **Part B:** `exp26b-u13-008`, `exp26b-u13-009` (12 questions)
- **Part C:** `exp26b-u13-010` (6 questions)

## 1. Counts

- Reviewed: 30 of 30 assigned questions. Completion: **complete**, `remainingQuestionIds: []`.
- Verdicts: all 30 questions ended up under repaired scenarios (every scenario in this
  packet had at least the "YOU is" scene-level grammar defect, which cascades to every
  linked question's hash even where the question text itself needed no change).
- Repairs proposed: 5 scenario replacements, all v2→v3: `exp26b-u13-006`, `-007`, `-008`,
  `-009`, `-010`.

## 2. Highest-impact findings

1. **The "YOU is" defect was present in all five scenarios this packet, no exceptions.**
   Every one of the five scenarios' briefings or cues carried the grammar error ("YOU is
   above the crease," "YOU is between D2 and Gold's goalie," "YOU is in front of the
   goalie," "YOU's..." possessive slip, "YOU controls the puck"). All three parts fixed it
   without treating the recurrence as evidence of intentional style, per the packet-26
   correction now baked into dispatch instructions.
2. **`exp26b-u13-008` — a scene/orientation mismatch, not just a grammar fix.** The
   briefing states "Gold 1 turns toward the puck," but Gold 1's stored facing angle
   pointed almost exactly away from the puck's actual computed bearing. Since the
   scenario's teaching premise depends on Gold 1 pressuring the puck, the reviewing agent
   corrected Gold 1's facing to match the stated narrative (rather than rewriting the
   narrative to match the wrong facing), and separately fixed a reversed depth claim in
   q4 (a position described as "slightly lower" than a reference actor was actually
   shallower by the scene's own depth convention).
3. **`exp26b-u13-009` — a joke/trivia distractor, the same class flagged once before in
   the calibration doc.** Option "The score from another game" was replaced with a real,
   on-roster, plausible-but-insufficient distractor. Also fixed a q4 position reference
   that claimed to move a player "closer to the wall" but left the relevant coordinate
   unchanged from the actor's actual starting position.
4. **`exp26b-u13-006` — the grammar defect also appeared inside q2's own answer options**
   ("YOU remains / YOU leaves / YOU stands"), not just the shared briefing, confirming the
   standing instruction to check the whole linked scene rather than stopping at the first
   instance found.
5. **All five scenarios' geometry, sources, and duplication checks were independently
   re-verified rather than trusting prior "no-open-ai-finding" historical labels** —
   carried-puck offsets recomputed from the actor/facing formula, collinearity checks
   recomputed against the actual shot/pass lines, and both scenarios' cited Hockey Canada
   /USA Hockey PDFs actually fetched and read (not just URL-checked) to confirm their
   content supports the scenario's stated teaching point.

## 3. Scene/answer conflicts, rule/system uncertainty, visual checks not performed

- Three real non-grammar scene/answer conflicts found and repaired: `exp26b-u13-008`'s
  facing mismatch and reversed depth claim, `exp26b-u13-009`'s unmoved position reference.
- No rule/system uncertainty encountered.
- One judgment call flagged, not silently resolved: `exp26b-u13-008`/`-009` cite Hockey
  Canada's U17 Program of Excellence material for a general team-support principle, an
  older/elite bracket than U13, already disclosed in the scenarios' own source-use text
  as an adaptation and not treated as disqualifying.
- One naming-convention note: the bank-wide `YOU's <noun>` possessive pattern (used 22x
  across the bank, present in scenarios 006/007) was correctly distinguished from the
  "YOU is/remains/leaves" verb-agreement defect and left alone as intentional style,
  since it is structurally different (a possessive, not a subject-verb mismatch) — this
  is the kind of precedent-check distinction the packet-26 correction was asking for.
- Visual/rendered-UI check: **not performed** across all three parts, consistent with
  every prior packet.

## 4. Proposed curriculum bindings and ranked gaps

Out of scope for this run's requested output shape. No new gaps identified.

## 5. Files, structural validation, next packet

**Files:**
- `docs/factory/claude-project/claude-output/review-packet-27.json` — merged final
  envelope, schema-validated clean on the first pass
- `review-packet-27-part-a.json`, `-part-b.json`, `-part-c.json` — the three source parts
- No part could write its own `.md` report file (same harness restriction as recent
  packets); each agent's full report content is folded into this combined report.

**Structural validation actually run:** `node validate-return.mjs
../claude-output/review-packet-27.json` →
`{"errors":[],"warnings":[],"counts":{"assigned":30,"reviewed":30,"remaining":0,"repairedScenarios":5}}`.
Zero errors, zero warnings.

**Process note:** the packet-26 correction (don't infer house style from error
consistency; check sibling/prior-packet precedent first) held cleanly across all three
parts this packet with no controller intervention needed — the fix generalized, same
pattern as packet-21's structuredClone lesson and packet-23's sceneEvidence-array lesson.

**Checks not run:** no independent (Codex/Luna) second review of this packet's content;
no rendered-scene/live-app verification; no human coach approval.

**Next packet to continue:** packet-28.
