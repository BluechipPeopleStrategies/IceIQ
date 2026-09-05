# RinkReads morning review
September 5, 2026 · Prepared for 7:00 a.m. Edmonton

The first integrated preview is ready for a walkthrough. Start with the U11 sequence, then review the coach tools, curriculum, Brain Gym and character references.

## Walkthrough

| Open locally | What to try |
| --- | --- |
| [Practice Arena](http://127.0.0.1:5184/#practice-arena) | Read the play: choose Pass, explain the defender cue, choose the open-shot target, then move the off-puck player and explain why. Repeat with Carry to see a different continuation. |
| Practice Arena → Coach Lab | Choose one of 12 examples across U7–U18. Move a player, explain, and compare with the separate coach reference. Switch to authoring to change the question and reference. |
| Practice Arena → Learn the game | Four guided lessons per age: 24 lessons and 48 questions. The original question bank, scenarios, animated plays and coach personas are also available. |
| Practice Arena → Play | Free play, Read & React and Set up a rep. Change the gap, start a rep, replay and save a setup. |
| Practice Arena → Coach Lab → Animate a play | Add/remove players, select a team template, freeze actors, place time keys, preview movement, save/reopen and import/export. |
| [Brain Gym](http://127.0.0.1:5184/#brain-gym) | All 12 games remain. Try Shootout with the mouse or the six keyboard targets; Best Option now has a 3D view as well. |
| [Shootout before](http://127.0.0.1:5184/#shootout-before) / [now](http://127.0.0.1:5184/#shootout-now) | Compare the old renderer with the upgraded rink, equipment, lighting and interaction. |
| [Character Studio](http://127.0.0.1:5184/docs/art/animation-pack/index.html) | Switch Skater/Goalie and Navy/Gold. Inspect actual transparent PNGs against light, dark and checker backgrounds. |

## What improved

- BlueChip navy, gold and bone; local Playfair Display and Inter; glass panels, consistent pills, readable gold actions and larger touch controls.
- The U11 sequence has three connected reads with different pass, carry and shoot consequences. It combines action/target choices, player movement and free explanations. A simulated goal or matching coordinates never certifies the reasoning.
- The source map covers all 12 substantive guiding notes, age progression, interaction choices, prerequisites and what is implemented versus planned.
- Coach references and learner attempts remain separate. U9 direction arrows and simple turn buttons make the angling cue visible.
- Practice persistence follows the active player. Empty or corrupt storage no longer retains another player's draft list. Curriculum rewards cannot be farmed by retrying.
- Brain Gym preserves its scoring and adaptive levels. Shootout has six accessible target buttons and keyboard shortcuts. Self/Coach radar series now differ by both colour and mark style.
- The initial production app no longer eagerly loads the new gym 3D code. The build entry fell from approximately 1,287 KB to 1,089 KB; the HTML does not preload the Three.js chunk.

## Verified

`npm run test:practice`: **153 tests passed**, including simulation, replay, director, curriculum, coach questions, storage, AI adapter mocks, Gym scoring/progression and shot geometry. `npm run test:scenario-engine` passed. Production build passed.

Actual browser checks covered all 12 Gym launch/back flows; full five-shot mouse and keyboard shootouts; sequence branch, replay, positioning, explanation and reload flows; coach drag/keyboard/save/reopen/compare; guided MC → TF completion/retry/focus; and desktop, 820 px tablet and 390 px phone layouts. Checked screens had no horizontal overflow. This is viewport testing, not a physical iPad performance test or a screen-reader user study.

[Detailed verification](verification.md) · [Independent review and fixes](site-quality-review.md) · [Source map](concept-interaction-map.md)

## What still needs work

1. **AI is connected to a local server adapter but has no configured key.** Both real UI paths report unavailable; no live AI judgment is claimed. The final U11 opinion reviews the final positioning only, not the whole sequence.
2. **The arena is a development preview.** Existing app styling and Gym improvements enter the production build; the new arena/comparison hash routes remain DEV-only. Cloud persistence and production judge deployment are not implemented.
3. **Character references are finished enough to review, not finished game models.** Four native 1254×1254 transparent navy/gold sheets exist, plus a 40-clip animation specification. Rigged models, animation clips and free-camera character assets remain to be produced. No purchase was made. [Free and paid paths](asset-shortlist.md).
4. **New content remains coach-review drafts.** The geometry, questions and answer alignment have been checked, but age-comprehension testing and curriculum admission remain open. The first three-read sequence is U11; other ages have lessons/examples and a mapped sequence framework.
5. Dedicated route drawing, richer prediction/recall sequences, whole-sequence AI review, actual iPad testing and production integration are the next feature gates. Existing feature surfaces remain; this pass did not verify every authenticated production workflow.

These improvements are substantial prototype and usability work. They are not NHL-level character animation or a completed commercial hockey simulation.
