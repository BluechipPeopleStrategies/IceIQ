# U11 player copy review

**Status:** Local UI copy slice, pending deployment. The lesson remains a coach-review draft.
**Date:** 2026-09-05.

The U11 connected-read screens now use shorter, more concrete player-facing prompts.
This changes how the existing play is described, not the play, its decisions or saved evidence.

## What changed

- The opening asks: "Look at D1, F2 and the goalie. Would you pass, shoot or carry? What helped you decide?"
- The cue list describes visible positions: D1 near the shooting line, F2 across the ice and slightly nearer the net, and the goalie nearer the middle.
- Progress reads "Look and choose", "Look again" and "Help without the puck".
- Action descriptions use direct verbs: send the puck, shoot toward the net, or keep it and skate toward the boards.
- Consequences identify who receives or keeps the puck. Loose-puck branches do not claim that a player has recovered it.
- Read three uses "Where would you move to help?" or "Plan your path" when the moving player is YOU, and names F2 when F2 moves.
- The rink's possession description says "You have the puck", avoiding third-person grammar for YOU.

The second-read choices now use the following display labels. Their canonical target IDs are unchanged.

| First choice | Target ID | Player-facing label |
|---|---|---|
| Pass | `return-lane` | Pass back to YOU |
| Pass | `hold-wide` | Carry into the wide space |
| Pass | `shoot-open` | Shoot toward the net |
| Shoot | `rebound-space` | Move toward the loose puck |
| Shoot | `high-support` | Space behind the puck |
| Carry | `support-middle` | Pass to F2 in the middle |
| Carry | `attack-outside` | Keep carrying outside |

The numbered rink targets, their accessible labels, the target buttons and read-aloud text consume the same display-target mapping. Selecting any of them still submits the original target ID.

Recall display captions and descriptions use YOU consistently with the rink marker. Fixed phrases such as "F1 has", "F1 is" and "F1 carries" become "You have", "You are" and "You carry". The same display descriptions feed read-aloud and the larger rink inspection.

## Data and behavior boundary

[readSequencePlayerCopy.js](../../src/one-on-one/readSequencePlayerCopy.js) holds presentation copy only.
[ReadSequence.jsx](../../src/one-on-one/ReadSequence.jsx) applies it to U11 display text without writing those labels into sessions.
[ReadSequenceRecall.jsx](../../src/one-on-one/ReadSequenceRecall.jsx) creates display-card copies while retaining the canonical recall object for checking, persistence and export.

Canonical scenario and target IDs, definitions, branch geometry/outcomes, reflections, AI payloads and recall JSON remain unchanged. U9 retains its own original prompt and copy. The slice introduces no new grading, AI capability, storage migration or claim that an authored outcome proves a choice correct.

## Verification recorded for this slice

The implementing agent reported the following checks; this review note was prepared from the current source files.

- All seven U11 branches checked in a 390 px browser viewport.
- Normal-motion tablet browser playback checked through pause/resume; read-aloud text checked against displayed prompts and choices.
- U9's original prompt confirmed after the U11 changes.
- Two existing local-storage values remained byte-identical; downloaded recall matched the exact canonical serialized bytes.
- Current 225 practice tests and production build passed; the canonical golden remained unchanged.

Evidence: [U11 question at phone width](evidence/u11-player-copy-question-phone.png) and [U11 recall at phone width](evidence/u11-player-copy-recall-phone.png).

These are browser checks, not physical phone/iPad testing, voice-quality assessment or evidence of child comprehension. Simpler copy still needs coach and player review. The new wording is local-only until publication is separately recorded.

## Separate next proposal

[U13 lane-switch design](u13-lane-switch-design.md) is an unimplemented coach-review proposal. It is not part of this U11 copy slice. Its worked Shoot/Carry comparison explicitly separates Carry's lane-switch objective from Shoot's loose-puck support continuation.
