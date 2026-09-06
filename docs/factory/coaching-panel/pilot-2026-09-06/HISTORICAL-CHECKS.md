# RinkReads review correction: apply before the next packet

This supplements the frozen Claude project instructions. Keep the existing packet IDs, snapshot, original returns and hash baseline. Do not regenerate the project or restart packets 01–14. These lessons apply to Claude and Codex reviewers alike.

## What actually failed

Earlier pass labels missed real defects. In packet 12, the initial Luna independent review also passed a placement that moved farther from the puck and feedback that omitted a stoppage. Root found those defects and the amended content received a new independent check. Do not describe this as exclusively a Claude failure or imply that two AI passes establish correctness.

The application receipts for packets 12–14 contain concrete before/after evidence. The accompanying calibration files reproduce eight of those cases directly from the receipts, including their exact content hashes. Historical errors are examples to detect, not current unresolved defects: the repaired versions were deployed.

## Required checks for every question, including retained questions

1. **Resolve roles from the roster.** Record the focus actor, team, puck owner, defended end and any named communication recipient. Labels like D1 or F2 do not determine team membership. Trace every proposed receiver/support player to their actual team. In packet 13, away-team D2 was incorrectly described as a supporting outlet; in packet 14, a gold defender was told to give defensive instructions to opposing F1.
2. **Calculate the claimed relationship.** For each position question, record start, example and relevant target. If the instruction says closer, farther, inside or goal-side, compare the appropriate distances/coordinates before and after. Moving at least 0.1 m and remaining on ice are not sufficient. Packet 12's old reference increased puck distance from 8.06 m to 9.23 m. Account for a carried puck moving with its owner; do not treat it as a stationary target.
3. **Check landmarks in rink coordinates.** Use the actual geometry helpers for circles, rounded boards, blue lines and goal locations. Distinguish goal-side from lateral middle-side. Do not rationalize a hockey term such as “opposite point” into an unstated alternate meaning to rescue an answer. Use board/net/player relationships instead of screen-relative above/below.
4. **Separate states and transitions.** Arriving first is not controlling the puck. A carrier assignment does not establish successful pressure. Facing is not speed, gaze or reach. State possession changes, prior actions and hypothetical moves explicitly when the question depends on them. For a covered puck with an explicit whistle, stop play and prepare for the restart; do not instruct continued pressure on that puck.
5. **Audit the correct answer and feedback together.** Check every option, explanation and example, not just the prompt. An apparently sensible answer cannot pass if its feedback assigns an opponent a teammate's job. Preserve defensible alternatives and their conditions. A changed cue can require reassessment without always requiring a particular movement.
6. **Read grammar and comparisons aloud.** YOU takes are/do/see/have. Inspect prompts, distractors and explanations. Preserve the comparator when editing “closer than” questions. A simple verb correction must not remove “Compared with F1”. After changing the communication recipient, recheck the distractors for relevance.
7. **Prove the final payload.** Diff the actual replacement against the original. List what changed and what did not. Recompute final question hashes and affected-question closure. Read the serialized replacement again; a report saying a defect is fixed is not evidence that the JSON contains the fix.

Place concise, question-specific evidence in the existing `sceneEvidence` and `reason` fields. Do not change the return schema or create blanket pass rows. Geometry evidence can be shared by a named scene check, but each question must identify which relationship it uses. Mark unavailable source or visual checks honestly using the existing contract. Source topic support does not certify an exact tactical answer.

## Calibration before proceeding

Review all eight records in `claude-review-calibration/cases.json` without first opening the answer key. Write a verdict and specific evidence for each. Then compare with `answer-key.json`; explain any missed issue or disagreement before continuing. These are known-defect examples, so detecting them does not prove that the next packet is correct. Do not copy their replacement wording into unrelated scenes.

Continue with the next unfinished assigned packet using its existing baseline. Apply the seven checks to every retained and repaired question. Save an actual partial return and remaining IDs if you run out of context. Do not claim all content is fixed because a structural validator passes.

## Honest report wording

- Distinguish “50 questions reviewed” from “50 questions correct”. Report findings and limitations separately.
- “No further defects found in this pass” is scoped evidence, not proof of defect-free content.
- An initial pass later overturned must remain visible in the history, alongside who found the defect and the final recheck.
- Say exactly which rendered flows were checked. JSON inspection and an offline diagram are not app testing.
- AI review, human coach approval, curriculum admission and deployment are separate statuses.

## Message to use in Claude

Read this update before the next unfinished packet. Run the eight-case blind calibration, reconcile any misses against the answer key, then continue the existing assigned packets without regenerating the snapshot. Include concrete role, geometry and state evidence in each review, and verify the actual replacement payload before reporting a repair complete. Leave original completed returns unchanged. Return the next JSON and report to the existing claude-output folder.
