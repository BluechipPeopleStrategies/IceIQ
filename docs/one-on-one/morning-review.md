# RinkReads morning review
September 5, 2026 · Prepared for 7:00 a.m. Edmonton

The first integrated preview is ready for a walkthrough. Start with the U11 sequence, then review the coach tools, curriculum, Brain Gym and character references.

**Live phone review:** [Open the shared review](https://ice-iq.vercel.app/review/). Phone access deployed in `019e8d9` and was verified on the public HTTPS site. It works without the desktop's server or Wi-Fi network. [Phone-preview.md](phone-preview.md) records the deployment and checks.

**Follow-up quality pass is live:** `98809ec` deployed successfully and was verified at 00:43 Edmonton. The optional changed-cue comparison, eleven revised Gym introductions and secondary-text contrast fixes are included. **158 practice tests and the production build pass.** The live phone flow completed three reads, saved an original Pass and revised Carry explanation, and restored both after reload with no overflow, failed requests or page exceptions.

## Walkthrough

| Open the hosted preview | What to try |
| --- | --- |
| [Practice Arena](https://ice-iq.vercel.app/#practice-arena) | Choose Pass, explain the defender cue, choose the next target, then move the off-puck player and explain why. Repeat with Carry to see a different continuation. Finish a sequence and try **One thing changes**: compare the original freeze with D1 in the pass lane, then save a new action and reason. |
| Practice Arena → Coach Lab | Choose one of 12 examples across U7–U18. Move a player, explain, and compare with the separate coach reference. Switch to authoring to change the question and reference. |
| Practice Arena → Learn the game | Four guided lessons per selected age: 24 lessons and 48 questions. The source library also exposes the original question bank, scenarios, animated plays and coach personas. Age-scoped selection is implemented; child comprehension and curriculum admission remain open. |
| Practice Arena → Play | Free play, Read & React and Set up a rep. Change the gap, start a rep, replay and save a setup. |
| Practice Arena → Coach Lab → Animate a play | Add/remove players, select a team template, freeze actors, place time keys, preview movement, save/reopen and import/export. |
| [Brain Gym](https://ice-iq.vercel.app/#brain-gym) | All 12 games remain. Try Shootout with the pointer or six keyboard targets; Best Option also has a 3D view. The follow-up revises the other eleven introductions to describe their actual tasks and controls. |
| [Shootout before](https://ice-iq.vercel.app/#shootout-before) / [now](https://ice-iq.vercel.app/#shootout-now) | Compare the old renderer with the upgraded rink, equipment, lighting and interaction. |
| [Character Studio](https://ice-iq.vercel.app/review/characters/) | Switch Skater/Goalie and Navy/Gold. Inspect actual transparent PNGs against light, dark and checker backgrounds. |

## What improved

- BlueChip navy, gold and bone; local Playfair Display and Inter; glass panels, consistent pills, readable gold actions and larger touch controls.
- The U11 sequence has three connected reads with different pass, carry and shoot consequences. It combines action/target choices, player movement and free explanations. A simulated goal or matching coordinates never certifies the reasoning.
- The follow-up adds an optional **One thing changes** comparison after completion. Only D1 moves, from partial shot coverage onto the visible puck-to-F2 pass line. The learner records a retained or revised action and a reason; the original answers and replay remain intact. The saved comparison is an optional field in the existing v1 reflection and its download. No new outcome, tactical grade or AI opinion is generated.
- The source map covers all 12 substantive guiding notes, age progression, interaction choices, prerequisites and what is implemented versus planned.
- Coach references and learner attempts remain separate. U9 direction arrows and simple turn buttons make the angling cue visible.
- Hosted practice saves use a fixed preview identity on that device; development follows the active player. Saves do not sync between devices. Existing animated-play telemetry remains a device-global local log. Empty or corrupt player-scoped storage no longer retains another player's draft list. Curriculum rewards cannot be farmed by retrying.
- Brain Gym preserves its scoring and adaptive levels. Shootout has six accessible target buttons and keyboard shortcuts. Self/Coach radar series now differ by both colour and mark style.
- All eleven non-Shootout Gym introductions were audited against their stimuli and input code. Revised task descriptions remove unsupported automatic hockey-transfer claims, scolding language and stale instructions; **Talk hockey** prompts invite discussion. Scoring, timers and adaptation are unchanged. [Copy review](brain-gym-copy-review.md).
- Shared small secondary text now measures at least **4.9:1 contrast on the three shared navy surfaces**. Goals and skills were reviewed in local sample state, including phone-sized layouts. This does not establish contrast for every possible background or validate every authenticated journey.
- The initial app no longer eagerly loads the new Gym Three.js code.

## Verified

Current follow-up: `npm run test:practice` reports **158 tests passed**, including simulation, replay, director, curriculum, coach questions, storage, AI adapter mocks, Gym scoring/progression, shot geometry, phone-review packaging and the changed-cue comparison. Production build passed. The comparison checks cover actual puck-offset geometry, original-answer/replay immutability, save/restore and older v1 reflections. The prior integrated `npm run test:scenario-engine` run passed; see the detailed verification record for the final rerun status.

The earlier integrated browser checks covered all 12 Gym launch/back flows; full five-shot mouse and keyboard shootouts; sequence branch, replay, positioning, explanation and reload flows; coach drag/keyboard/save/reopen/compare; guided MC → TF completion/retry/focus; and desktop, 820 px tablet and 390 px phone layouts. The public phone release was also checked on its live HTTPS origin. Follow-up checks include changed-cue phone/tablet layouts and sample goals/skills; comparison replay/download and production-preview reload preserve both answers, as recorded in [verification.md](verification.md).

These are browser viewport checks. No physical phone or iPad test, full screen-reader user study, or authenticated production journey audit is claimed.

[Detailed verification](verification.md) · [Independent review and fixes](site-quality-review.md) · [Source map](concept-interaction-map.md)

## What still needs work

1. **AI has no configured live key.** Hosted review returns unavailable before sending an AI request; the local server adapter is also unconfigured. No live AI judgment is claimed. The final U11 opinion, if configured in future, concerns final positioning only. The changed-cue comparison adds no AI request.
2. **The arena is a hosted prototype.** Phone access and the current follow-up are live and verified. Cloud practice persistence, a production judge and main-app Arena navigation are not implemented.
3. **Character references are finished enough to review, not finished game models.** Four native 1254×1254 transparent navy/gold sheets exist, plus a 40-clip animation specification. Rigged models, animation clips and free-camera character assets remain to be produced. No purchase was made. [Free and paid paths](asset-shortlist.md).
4. **Age policy and age validation remain open.** The original quiz still uses the existing `ALL_AGES_MODE` mixed-age policy; this quality pass does not resolve that policy. The new guided curriculum explicitly selects lessons for the chosen age, but that is not evidence of age comprehension. New geometry, prompts and answer alignment need coach/player review before curriculum admission. The three-read sequence and its changed-cue comparison are U11 drafts.
5. Dedicated route drawing, richer prediction/recall sequences, whole-sequence AI review, physical phone/iPad testing and further production integration remain future work. Existing feature surfaces remain; this pass did not verify every authenticated production workflow.

These improvements are substantial prototype and usability work. They are not NHL-level character animation or a completed commercial hockey simulation.
