# First Hockey Authority calibration: failed

September 6, 2026. Actual Claude Code subscription-session invocation of the
project's `hockey-authority` agent completed successfully. Returned model ID:
`claude-opus-4-8[1m]`. Invocation success is separate from judgment quality.

The agent flagged four defects and incorrectly passed four among eight known
historical defects. This is not acceptable approval performance. The role is
unqualified for approval recommendations; it can research and report findings.
No scenario, tactical claim or animation was approved by this run.

## What was tested

The input supplied the eight historical cases and the existing correction
guide. All tools were disabled, making the exact answer key inaccessible.
The raw response was saved before the key was read. This is blind to the key
but explicitly guided, not an unaided or held-out expertise test. Since every
case contains a known defect, this set cannot measure false rejections of
correct items.

| Incorrect pass | Failure |
|---|---|
| exp26-u11-006-q7 | The agent acknowledged D1 did not occupy the puck-goal lane but excused the false spatial clause as approximate communication. It also accepted the unverified circle description. |
| exp26-u11-012-q7 | It accepted camera-dependent "below me" wording, despite the review requiring stable rink relationships. |
| exp26-u11-012-q5 | It substituted successful control for the prompt's arrival-first condition. |
| exp26-u11-016-q1 | It checked geometry but missed "where does YOU" grammar. |

It additionally guessed that three failed cases were retained controls. No
input justified that claim. A supposed test distribution must never substitute
for evidence. The four flagged cases covered a reference moving farther from
the puck, missing stoppage language and two opponent/teammate mistakes.

## Corrections and next evidence

The role and contract now require clause-by-clause review, mandatory treatment
of acknowledged contradictions as defects, explicit event/state separation,
language checks even when geometry passes, and no guesses about control cases.
Qualification remains failed while remediation runs. Correcting exposed cases
cannot erase the first result or establish qualification.

A separate synthetic transfer set includes valid and defective examples plus
missing evidence. Its expected labels are excluded from the model input. Even
a clean result will be a limited regression check, not a human-reviewed held-out
movement/teaching qualification. The existing owner review policy still applies.

## Evidence

- `blind-prompt.txt`: exact supplied text, including the correction guide.
- `run.json`: timing, source hashes, execution mode and raw-output hash.
- `blind-raw.json`: preserved CLI result envelope and original model answer.
- `blind-verdicts.json`: parsed original answer; unchanged by remediation.
- `codex-blind-review.md`: independent technical findings saved before key access.
- `comparison.json`: exact case IDs, expected issues and four false passes.

Codex flagged all eight for revision but did not calculate the first case's
circle membership during the blind pass; it marked that landmark unsupported.
That independent result is not Claude judgment or evidence of general expert
accuracy. Root's arithmetic check corrected a rounded decimal before key access.

No rendered hockey sequence, rulebook determination, human coaching review or
live-bank content change was performed by this calibration.
