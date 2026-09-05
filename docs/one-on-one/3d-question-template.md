# 3D question scenario template

**Status: retained design reference only.** Thomas confirmed on September 5, 2026 that the 3D scenarios for questions are the main template to preserve. Broader gameplay is inspiration to consider where it fits naturally, not a requirement to recreate a whole game. Implementation remains paused.

## Reusable question layout

1. Show a clear 3D hockey situation with only the ice needed to make the decision. Keep the net, puck and relevant players visible.
2. Present one understandable question. Use consistent small player labels and distinguish the learner's focus from possession or selection.
3. Let the player choose through the rink or matching answer buttons. Give Pass, Shoot and Carry equal visual treatment when those actions are offered.
4. Preview the selected action so the player can see its consequence before confirming. Keep the preview separate from a submitted answer. This behavior is still work in progress and needs verification.
5. Allow an optional “What did you see?” explanation, then connect feedback to the visible situation.
6. Where useful, compare the same situation with one changed cue, such as the goalie's position. The question, geometry and feedback must agree.

Keep the scene prominent, camera controls compact, buttons consistent and motion easy to follow. Source notes and evaluation machinery belong outside the player-facing question.

## Existing implementation references

- [Shared 3D rink](../../src/visuals/ScenarioRink3D.jsx)
- [Connected question scene](../../src/one-on-one/ReadSequenceScene.jsx)
- [Choice, preview and confirmation flow](../../src/one-on-one/ReadSequence.jsx)
- [Matching action cues](../../src/visuals/RinkActionCue.jsx)
- [Camera controls](../../src/visuals/CameraViewControls.jsx)

These links point to the current working implementation, which is not a finished or independently released template package. Preserve it and consult the [paused handoff](2026-09-05-paused-handoff.md) for incomplete work and verification limits.

## Optional gameplay inspiration

Future gameplay can reuse the clear camera framing, direct rink interactions, visible action consequences and replayable decisions if they help hockey learning. Treat worlds, rewards and broader game mechanics as optional candidates. Keep a mechanic only when it improves understanding or gives the player a meaningful reason to practice; do not add it simply to match a reference game.

No specific external gameplay reference was identified. The journey artwork and rank proposals remain separate proposals; this note does not approve their integration or resume the paused build.
