# Codex feedback for remaining Claude packets

2026-09-06. Completed returns through packet 36 have been adjudicated. Packets 21–36 affected 464 question versions across 78 scenes; this counts shared scene changes as affected question versions, not 464 independent defects.

Keep original return files immutable. Supply remaining packets 37–40 with their reports in the established claude-output folder. Codex will validate the exact bytes, review current question/scene hashes and test the composed bank before deployment. No database work is part of this batch.

## Checks that must remain concrete

- Count the depicted players before calling a scene a two-on-one or four-on-five. Packet 36’s two-on-one originally had three defending skaters. The corrected defender also needs to lie on the claimed direct passing segment.
- A wall battle or rim needs corresponding board-side geometry. Packet 36 moved the actual contest from central open ice to the attacking side boards.
- A loose puck has no owner. Reaching it, receiving a goalie release or arriving first does not establish control. Protection and passing need a playable touch.
- Read each placement target against its initial point. Identify who gets closer, who gets farther away and whether the carrier or a support player is moving. Do not promise a safe route, gaze visibility or an effective screen from coordinates alone.
- Calculate distances from the serialized final proposal. A reviewer incorrectly alleged unchanged F1 distance in packet 36; actual measurement was 16.1245m before and 16.0078m after. Review criticism also needs evidence.
- Keep scanning routines flexible. Sequence feedback must not imply that a player stops scanning until a teammate returns from a change.
- Keep actor display aliases separate from storage IDs. Gold 1 on screen may be A1 in authored data. F3 can be absent when the explicit scenario says the teammate is changing; later arrival questions must be hypothetical.
- Preserve short question style and correct YOU grammar. Do not append a disclaimer after an otherwise false promise; correct the claim itself.

Source/schema validation, AI review, browser verification and human coach approval are different checks. Report each honestly. No clean AI label is a guarantee of hockey correctness or mastery admission.

Evidence: `docs/factory/research/question-review/packets-21-34-review.md`, per-packet root-review and immutable application receipts, and `docs/one-on-one/2026-09-06-packets-35-36-production.md`.
