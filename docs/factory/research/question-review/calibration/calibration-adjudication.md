# Calibration feedback for Claude

Packet: `packet-01-calibration`. Baseline: `rr-20260905-c8403be16748c919`.
September 5, 2026. Prepared by Codex with independent GPT-5.6 Luna review.

The returned files were found in the repository and passed the return validator:
50 of 50 assigned questions accounted for, no format or stale-baseline errors.
Claude recorded 35 retains, 14 repair proposals and one blocked question. That
validation established complete review records, not hockey or release approval.

The adjudicated repair changes five experimental scenarios and 28 question hashes.
Briefing and setup changes affect every linked question, including unchanged text.
The authoring bank remains 200 scenarios / 1,600 questions; regular practice remains
1,500 questions with 200 optional reflections. No mastery admission is added.

## Decisions

| Question | Decision | Reason and final treatment |
|---|---|---|
| U7-001 q5 | Amend | Replace the implausible eyes-closed distractor. Change Claude's guaranteed-turnover feedback to a possible consequence: sending the puck away before looking can give Gold1 a chance to get it. |
| U7-001 q9 | Accept as an illustration improvement | Use (-6,2) for a more distinct passing angle. A small movement is not inherently wrong, and the reference is not the only correct spot. |
| U7-001 q10 | Accept | Explicitly imagine Gold1 moving closer; the static scene does not show that movement. |
| U9-006 q5 | Amend | Replace puck-colour trivia with plausible missed-scan choices. Ask which side Gold1 is coming from in language a young player can understand. |
| U9-006 q7 | Accept | Correct “YOU still checks” to “YOU still check.” |
| U11-002 q4 | Accept | Move the example to (-7,8.5), separated from the defender on the board side. |
| U11-002 q8 | Accept scene correction | D1 at (-3,6) was board-side of YOU at (-6,5), conflicting with the inside cue. D1 now stands at (-3,2). All ten linked questions were rechecked. |
| U11-002 q9 | Accept | Use (-4,8) as a separate receiving offer with D1 inside. This is a coaching example, not a mandatory route or distance. |
| U13-001 q2 | Amend | Remove scoring trivia. Claude's future-location distractor could itself be useful planning information, so the final distractor is an unjustified guaranteed pass to W. Replace “D2 behind the puck” in the scene with the accurate far-side outlet description. |
| U13-001 q7 | Amend | Correct D2's location and YOU grammar, and use coaching basis for the changed-fact hypothetical. Ask players to reassess possession, reach and support without prescribing one universal response. |
| U13-001 q9 | Revise to a distinct job | Do not import Claude's opponent-possession containment branch. After independent review flagged the repeated approach task, change this question to moving W closer along the boards if YOU gain control. Target W, example (-16,11). The pass still depends on control and an open lane. |
| U13-010 q3 | Clarify; no longer blocked | Keep the explicitly possible preparation routine. Explain that watching, moving and offering the stick overlap. The coaching response is not an objectively scored timeline. |
| U13-010 q7 | Accept | Correct “Why is YOU” to “Why are YOU.” |
| U13-010 q8 | Decline replacement | Retain the existing carrier-view cue comparison. Its optional reflection counterpart is not automatically a duplicate. The proposed goalie-separation replacement adds unnecessary contact/safety claims without a verified rule source. |
| U13-010 q9 | Amend | Use (24,4.5) to offer a clearer angle away from Gold1. Remove guaranteed crease/safe-pass/back-side conclusions; the learner must check another pocket or higher outlet if the defender moves. |

The rim puck remains at (-23,12.2), near the rounded boards. Its earlier valid
geometry repair is preserved. No new rim-puck correction is necessary.

## What to change in future Claude packets

1. **Use the newest applicable receipt.** `combined-review.json` is the current
   reconciled AI status. Earlier catalogs and sequence flags remain valuable
   history but cannot be reported as still open without checking later decisions.
2. **Validate grammar across the whole scene.** The earlier q1 YOU correction
   did not fix q7. Check all linked prompts, options and feedback for subject/verb
   agreement instead of copying a prior pass label.
3. **Check the depicted puck position.** Passing geometry starts at the rendered
   carry offset, not automatically at the actor's centre. Actor-centre collinearity
   is a warning; it is not proof of a simulated interception or blocked pass.
4. **Separate geometry from coaching.** A point can be on ice but teach an unclear
   job. A short move can open an angle. Give the actual lane, pressure, support and
   learning-purpose evidence; do not invent a universal minimum movement distance.
5. **Preserve the teaching objective unless a change is justified.** A proposed
   replacement must solve the demonstrated defect. Avoid turning a small wording
   issue into an unsupported possession, contact or system scenario.
6. **Use credible distractors.** Prefer a missed cue or outdated plan over absurd
   actions or unrelated trivia. Do not make a defensible alternative wrong merely
   to preserve a two-option key. Keep wording short and suitable for the age.
7. **Explain the conditions.** Reject certainty about pass completion, a universally
   better pocket or guaranteed turnovers. State what is visible, what is supplied
   by the prompt and what remains unknown.
8. **Distinguish repeated learning from duplicate work.** Different formats can
   support the same learning objective. Flag redundancy when the later item adds
   no useful cue, decision, actor responsibility or retrieval practice. Explain why.
9. **Keep tactics flexible.** Prioritize puck management, fundamentals, time,
   space, scanning and support. Role labels do not establish rigid position rules
   or one universally correct system. Identify age and jurisdiction limits.
10. **Keep approval claims narrow.** JSON validation, self-review, independent AI
    review, rendered checking and human coaching approval are separate. Never
    convert one into another. Preserve before/after hashes and all earlier flags.

## Sources and limits

Hockey Canada's 2020–21 [Developing Skilled Defencemen](https://cdn.hockeycanada.ca/hockey-canada/Hockey-Programs/Players/Downloads/2020/developing-defence-overview-e.pdf),
PDF pages 12–13, supports checking pressure and support on retrievals and choosing
an outlet in response to possession quality. It supports those teaching principles,
not these exact coordinates or guaranteed outcomes. Its age-development discussion
also discourages early position specialization. This is a dated development source,
not current playing-rule verification.

See the independent review JSON for the other source reads and their limits.
No paid book pages or proprietary diagrams were reproduced. No goalie-contact
rule, on-ice safety, skating physics or human-coach certification is claimed.

## Evidence and continuation

- `candidate-scenes-v1.json`, `proposed-repairs-v1.json` and
  `independent-recheck-v1.json` preserve the first adjudication and the remaining
  rim-question finding. The unmodified original Claude return remains under
  `docs/factory/claude-project/claude-output/`.
- `candidate-scenes.json` and `proposed-repairs.json` contain the amended proposal.
  `independent-recheck.json` is the independent review of those exact hashes.
- After application, `../repairs/claude-calibration-repairs.json` records the
  before/after scenes and `../followup/calibration-final-recheck.json` supplies
  the current hash receipts to the audits.
- The original project ZIP and bank snapshot remain frozen. Do not replace that
  historical baseline to make a stale return pass validation. Packet 01 is closed
  after integration; resubmission against the changed live scenes must fail.
- Continue with packet 02 from the original project, applying these calibration
  lessons. The other 195 scenes are unchanged. Return one packet at a time with
  its JSON review, report, unresolved IDs and source reads. A current-hash check
  is still required before integration.

## Verification status

Final independent review, application and audit results are recorded in
`verification.json`. Browser checks cover the actual experimental UI and selected
placement/feedback flows. They do not cover every camera, physical device or game
state. Public deployment is separate from this local content repair.
