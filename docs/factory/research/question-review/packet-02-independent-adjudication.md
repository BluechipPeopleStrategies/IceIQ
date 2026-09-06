# Packet 02 independent adjudication — 2026-09-05

This is an independent coaching/content adjudication of Claude’s packet-02
review. It does not approve, apply, or publish any question edit. The returned
JSON contains 50 coverage rows plus five full version-2 replacement scenarios;
the exact replacement payloads and self-check hashes were reviewed below.
My previous pass incorrectly inspected only the top-level `coverage` rows and
missed the sibling `repairs[].replacement` payloads; that was a review error,
not a missing-payload condition. This revision corrects it by inspecting all
five replacements and their `replacementReview.coverage` rows.

## Identity and evidence checks

- Packet: `packet-02`, snapshot `rr-20260905-c8403be16748c919`.
- Coverage: 50/50 questions, 35 retain and 15 repair findings across five U7
  scenarios; no blocked row is recorded by Claude.
- I recomputed the repository’s `questionContentHash` (scene without
  `questions`/`version`, plus the question). All 50 `baseContentHash` values
  match both `bank-snapshot.json` and the current composed experimental bank.
  All five replacement scenarios are version 2, every replacement-review
  coverage hash matches its exact replacement question (50/50), and each
  `affectedQuestionIds` list exactly matches the changed question hashes
  against the current version-1 composition (1, 3, 10, 2, and 5).
- No version-2 repair is present in current source; the packet remains a draft
  proposal and has not been applied.
- The packet’s geometry is offline source-level evidence, not rendered or
  player testing. I treat its measurements as useful when they address a
  direct scene/text contradiction, but not as proof of skating speed,
  interception, pass completion, safety, or a uniquely optimal route.
- The packet correctly applies the calibration lessons on possession ownership,
  rendered puck offset, credible distractors, sibling comparison, flexible
  tactics, and narrow approval claims.

## Flag adjudication

| Question | Decision | Independent finding |
|---|---|---|
| `exp26-u7-002-q5` | **Accept repair direction** | Blue-puck trivia is an unfair distractor in a possession-state question and can be correct knowledge for the wrong keyed choice. Replace it with a credible ownership/attention misconception; keep the hypothetical ownership change, key, and scene basis. Exact replacement is still blocked pending payload/hash review. |
| `exp26-u7-003-q8` | **Accept repair direction** | YOU owns the puck; assigning the pass decision to Navy2 is a material possession inversion, and the choices are not parallel. Repair should keep the two-player identification objective and return the decision to YOU. Do not add a claim that Gold1 is closing or that a lane will remain open unless explicitly hypothetical. |
| `exp26-u7-003-q9` | **Amend** | The duplicate-job and “around Gold1” concerns are valid. A new reference can teach a different support/lane job, but “the way stays open” is too strong from a static point and a distance-to-defender check. Phrase it as offering a lane/angle to inspect, with pressure and receiver position still requiring a read. |
| `exp26-u7-003-q10` | **Accept repair direction** | The prompt/explanation asks a puck carrier to demonstrate a receiver’s readiness. An explicit hypothetical such as “after YOU pass and Navy2 has it” preserves the teaching goal and removes the inversion. The final wording must remain coaching/reflection language, with no implied completed pass in the pictured scene. |
| `exp26-u7-004-q2` | **Accept repair direction** | The actor is inside the painted circle in v1 while the copy says outside/return to the middle. Moving the actor outside the ring is a direct scene repair. All sibling hashes must be regenerated because the setup changes. |
| `exp26-u7-004-q5` | **Accept repair direction** | “Stand on Navy2” is an impossible/giveaway action. “Skate to the middle anyway” is a plausible U7 misunderstanding of turn-taking and preserves the objective without invoking a contact rule. Keep the explanation about sharing space and waiting. |
| `exp26-u7-004-q7` | **Accept repair direction** | q5 and q7 duplicate the same waiting spot, premise, format, and key. Giving q7 the puck-management job while YOU waits is a worthwhile sibling distinction, provided the new copy does not impose one rigid position or invent a puck event. |
| `exp26-u7-004-q10` | **Accept with dependency** | The v1 question cannot describe crossing the circle line when the actor starts inside it. It is repairable by the q2 setup move, but only after the complete v2 scene and all ten affected hashes are supplied and rechecked. |
| `exp26-u7-005-q4` | **Amend before acceptance** | The exact distractor repair is sound, but the question is general skating knowledge under `basis: scene`; the still does not establish “stopping” versus “skating faster.” Change the basis to `coaching` (a useful general teaching check), or rewrite it around a visible/stated scene fact. This is an answer-contract amendment, not a reason to reject the whole scenario. |
| `exp26-u7-005-q5` | **Accept repair direction** | Navy2 is too far away and in a separate lane for “push Navy2 away” to be a credible alternative in this freeze. Starting before the coach finishes is a realistic practice error and retains the stop/listen objective. Keep the whistle interpretation local to this drill. |
| `exp26-u7-006-q2` | **Accept repair direction** | “Take two pucks” and “defend both goals” are impossible/absurd distractors for a one-puck partner activity. Receiver mistakes (taking the puck, turning away) are credible and age-appropriate. Preserve the actual partner-pass job. |
| `exp26-u7-006-q7` | **Accept repair direction** | Navy2 owns the puck; Gold1 is explicitly outside and not challenging. The original carrier/outlet question therefore contradicts both possession and briefing. A receiver-recovery question is the right direction, but must not imply a pass has occurred unless stated as a hypothetical. |
| `exp26-u7-006-q8` | **Accept repair direction** | The question assigns puck protection to the non-owner, keys a board that is not beside YOU, and labels an unstated relationship as scene fact. Replacing it with visible receiving cues is correct. The U7/U9 puck-protection ledger conflict is a separate curriculum decision, not a reason to retain this broken item. |
| `exp26-u7-006-q9` | **Accept repair direction** | The reference reverses “above,” “below,” and the forward-facing claim. A receiver waiting-position example is appropriate, but the final explanation should say what Navy2 can see/check, not promise a forward lane or successful pass from static geometry. |
| `exp26-u7-006-q10` | **Accept repair direction** | The explanation asks YOU to shield a puck owned by Navy2 from a Gold1 who is not challenging. Conditional “what would change if Gold1 joined?” reasoning is honest and preserves the useful pressure cue without inventing current pressure. |

## Retains and cross-question risks

The 35 retains are reasonable on the supplied evidence. In particular, I agree
with not reopening q3/q5 absolute-word distractors merely because they contain
“never,” the short illustrative moves in `exp26-u7-003-q7`, `-004-q9`, and
`-005-q9`, and the reflection-style alternatives where a different answer can
still be coached. Those are consistent with the calibration rule against
inventing minimum movement distances or rigid position dogma.

The important sibling impacts are:

- `exp26-u7-003-q8/q9/q10`: the carrier/receiver correction must be reviewed
  together with q7 so a new hypothetical does not contradict q7’s carrier
  responsibility.
- `exp26-u7-004` q2/q10 and every retained question: moving YOU changes all ten
  scene hashes. The six retained texts are not independently approved until
  their v2 hashes and scene relationships are checked.
- `exp26-u7-004-q5/q7`: the revised q7 must be a distinct puck-management or
  scanning job, not another “wait outside the circle” question.
- `exp26-u7-006-q7/q8/q9/q10`: all four must agree that Navy2 owns the puck,
  YOU is the receiver, and Gold1 is not currently challenging. No explanation
  may silently switch ownership or convert a hypothetical into a pictured fact.

## Exact replacement review

The replacement payloads are substantively aligned with the findings, with
these exact-edit notes:

- `exp26-u7-002-q5` now has credible options and the ownership event is clearly
  hypothetical. Its explanation still begins “The answer follows the stated
  new ownership event”; amend this to teach the distinction directly (a puck is
  loose until a player controls it), rather than relying on answer-key prose.
- `exp26-u7-003-q9` is a coaching placement with alternatives explicitly
  allowed. “Keeps the way ... open” is acceptable as an illustrative coaching
  criterion, but should not be read as a physics guarantee; retain the later
  “check the way again” condition.
- `exp26-u7-004` v2 correctly moves YOU outside the painted circle and makes
  q10’s line-crossing prompt true. q7’s new puck-management job is distinct
  from q5. The ten affected hashes are all accounted for, including retained
  text whose scene changed.
- `exp26-u7-005-q4` is the only concrete contract issue in the replacement
  payload. Its answer and feedback are otherwise suitable after the basis
  amendment. q5’s “safe for both players” can be softened to “clear for both
  players” if the owner wants to avoid implying a safety conclusion from this
  static drill.
- `exp26-u7-006` v2 consistently makes Navy2 the puck owner and YOU the
  receiver across q2/q7/q8/q9/q10. q10 correctly makes Gold1 hypothetical;
  q8 keys only cues visible in the scene; q9 describes an open waiting spot,
  not a guaranteed pass.

## Release disposition

The substantive defects are real and mostly high-risk possession, scene-copy,
or distractor failures. I accept the five replacement scenarios as materially
sound repair proposals, subject to the two small amendments above:
`exp26-u7-002-q5` feedback should teach the ownership rule, and
`exp26-u7-005-q4` must move to coaching basis or become a genuinely visible
scene question. Nothing is blocked after those concrete amendments. The
packet’s self-check and this adjudication remain independent review artifacts,
not human coach approval or production admission.

No production bank or scenario file was changed by this adjudication.
