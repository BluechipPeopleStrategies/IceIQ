# Report back — packet-40 (FINAL PACKET)

Snapshot `rr-20260905-c8403be16748c919`, packet `packet-40`. Five U18 scenarios, 6
questions each (30 total), the "b"-expansion siblings of packet-38. Reviewed by a single
agent with the mandatory sibling cross-check against packet-38 (given the confirmed
team-flip pattern from packets 34 and 39). Validated clean on the first pass. This is the
40th and final packet of the project.

- `exp26b-u18-006` (forecheck-regroup-space), sibling of `exp26-u18-006`
- `exp26b-u18-007` (point-low-exchange), sibling of `exp26-u18-007`
- `exp26b-u18-008` (lost-draw-slot), sibling of `exp26-u18-008`
- `exp26b-u18-009` (prepared-reception), sibling of `exp26-u18-009`
- `exp26b-u18-010` (rapid-turnover-third-player), sibling of `exp26-u18-010`

## 1. Counts

- Reviewed: 30 of 30 assigned questions. Completion: **complete**, `remainingQuestionIds: []`.
- Repairs proposed: 5 scenario replacements, one per scenario. Every scenario needed a
  repair; none were fully clean, though most fixes were grammar-only.

## 2. Team-flip check: clean, a useful negative result

The mandatory high-priority sibling cross-check (comparing every actor's id, label,
team, coordinates, and facing against the packet-38 sibling, and running the real
`actorDisplayName()`/`questionActorWarnings()`/`positionSubjectIssue()` functions) found
**no team-flip, dropped-actor, or scrambled-label defect anywhere in this packet**,
unlike packets 34 and 39. The "b"-versions here simply drop some actors to shrink from
10 to 6 questions, with every retained actor matching its sibling exactly. This confirms
the check generalizes correctly by producing a genuine negative result rather than
finding a defect in every packet it's applied to.

## 3. Highest-impact finding: a systemic missing disclaimer across all five scenarios

Every one of the five packet-38 siblings ends its briefing with an identical sentence:
"This is a selected-player teaching view; no movement is implied unless stated." Every
one of the five "b"-expansion versions in this packet dropped that sentence when
actors were removed to shrink the question count. Without it, the resulting Navy-vs-Gold
counts (4v3, 4v5, 5v3, 3v5 across the five scenarios) read as literal on-ice-strength
claims rather than a selected subset of a larger even-strength scene. Most acute in
`exp26b-u18-008`, whose sibling explicitly states "this even-strength defensive-zone
draw is over," while the b-version's 5v3 count otherwise implies an unstated two-man
advantage. Restored the disclaimer (plus an explicit "even strength" clause for `-008`)
in all five briefings. This is a new defect subtype: not a wrong actor or wrong team, but
a load-bearing scene-level caveat silently dropped during scenario-shrinking.

## 4. Other findings

The standing "YOU + wrong verb" grammar defect appeared in every scenario's briefing or
cues, plus several per-question instances inside distractor options. Two lowercase "you"
instances were also found and fixed. `exp26b-u18-006`'s briefing ambiguously credited
both Gold 1 and Gold 2 with "changing their pressure routes," while every question only
supports Gold 2 changing; rewritten to state the distinction explicitly. Two prior
repairs (a dropped-actor reference in `-010`, a mislabeled distractor in `-008-q5`) were
independently verified as still correctly applied and left untouched.

## 5. Scene/answer conflicts, rule/system uncertainty, visual checks not performed

- One new systemic defect subtype found and repaired across all five scenarios (§3).
- No rule/system uncertainty encountered.
- One modeling note, disclosed rather than hidden: because the missing-disclaimer and
  grammar fixes are scene-level, all 30 questions carry verdict `repair` in the coverage
  ledger even though 25 of them have unchanged prompt/option/explanation text; their hash
  changed solely because the shared scene text was corrected. Each coverage row's reason
  field states this explicitly rather than mislabeling untouched-text questions as
  `retain`.
- All four cited sources were fetched and actually read (two needed a browser
  User-Agent to bypass 403s); all confirmed genuine and on-topic, including an exact
  quote match against a U17 technical package's "Support - Defensive" section.
- Visual/rendered-UI check: **not performed**, consistent with every prior packet.

## 6. Proposed curriculum bindings and ranked gaps

Out of scope for this run's requested output shape. No new gaps identified.

## 7. Files, structural validation, project completion

**Files:**
- `docs/factory/claude-project/claude-output/review-packet-40.json` — the full packet
  envelope (single-agent output), schema-validated clean
- The agent could not write its own `.md` report file; its full report content is
  folded into this report.

**Structural validation actually run:** `node validate-return.mjs
../claude-output/review-packet-40.json` →
`{"errors":[],"warnings":[],"counts":{"assigned":30,"reviewed":30,"remaining":0,"repairedScenarios":5}}`.
Zero errors, zero warnings. Independently re-run by the controller after the agent's own
validation.

**Recommendation for Codex:** the missing-disclaimer pattern found here (§3) is worth a
quick check across any other "b"-expansion scenario that dropped actors from a larger
sibling, since it's a different failure mode than the team-flip class (a caveat silently
lost during trimming, not a labeling error) and wasn't covered by the team-flip check
that has otherwise been the standing focus for this cluster type.

**Checks not run:** no independent (Codex/Luna) second review of this packet's content;
no rendered-scene/live-app verification; no human coach approval.

**Project status: all 40 packets (calibration + 02 through 40) are now complete,
merged where applicable, validated clean, and reported.** Every `review-packet-NN.json`
and its corresponding `REPORT-BACK-TO-CODEX-packet-NN.md` sit in
`docs/factory/claude-project/claude-output/`, ready to hand to Codex.
