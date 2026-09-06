# Remaining choice-quality review

This queue contains 78 lexical candidates from 69 scenes, divided into 14 packets of at most five full scenes. The five separately repaired U13 q5 items are excluded. Packet identities were refreshed after that repair; an unchanged question may therefore have a newer scene version than the original audit.

The review asks two separate questions: is the hockey/state claim supported, and does the question meaningfully assess its intended learning task? A correct coaching tip alone does not clear poor answer choices. Conversely, a simple U7 safety, social-learning or awareness contrast is not automatically defective because it is easy.

## Evidence and authority

- `packet-*.json`: exact targets plus full source scenes.
- `review-*.json`: advisory first pass. Original 08–14 blanket retentions were rejected by root for insufficient individual assessment. Their r2 replacements are proposals, not independent approval.
- `independent-*.json` and reconciliation files: qualified second-pass reasoning, with initial attempts and refinements preserved.
- `u9-restart-source-check.md`: live official evidence for the explicitly named Hockey Canada U9 model, resolving the unverified-rule concern without claiming universal local applicability.
- `root-adjudication.json` and `index.html`: final dispositions when reconciliation is complete. A rewrite disposition queues work; it does not mean a replacement has been applied.

No human-coach approval is claimed. Thomas may leave a thought through the question's existing feedback control but is not assigned the revision or quality-control work.

## Requirements for subsequent repairs

1. Read the whole scene, its named learning purpose, actual puck ownership, visible labels, and other questions before authoring. Distinguish frozen evidence from an explicitly hypothetical change.
2. Compare credible alternatives of the same kind. Do not make a sensible option compete only with carelessness, an impossible action, or a universal rule. Two genuine alternatives are preferable to an invented third receiver.
3. Preserve beginner teaching where appropriate. Do not call an introductory principle a validated tactical read, skating skill or mastery assessment.
4. Use the canonical `makeScene` puck position, including its owner offset. A player-centre line is not automatically the puck's passing or shooting line. Account for the first part of any proposed movement, not only its endpoint.
5. Explain what makes the choice useful and what still needs checking. Do not force a direction through an arbitrary goal that worsens pressure or unnecessarily lengthens a pass.
6. Freeze the exact payload and hashes. Obtain independent review of the replacement, followed by root adjudication. Apply through `tools/apply-reviewed-question-repairs.mjs` only after its dry-run passes. Role/identity fields are trusted process records, not authenticated credentials.
7. Refresh catalog, current identities and curriculum bindings; run meaningful checks and inspect the changed response flow before release. Preserve rejected drafts and reviews.

Historical checks to repeat: revision03 q003 moved into a tighter passing shadow; q011's owner offset initially moved the puck into the blocker line; q012 imposed unnecessary retreat. Revision04 q011 implied a previous shot that never occurred. See adjacent `choice-quality-rewrite-03`, `choice-quality-rewrite-04`, `choice-quality-rewrite-05` and `choice-quality-rewrite-independent-03` folders for exact evidence.
