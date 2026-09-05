# RinkReads morning review
September 5, 2026 · Prepared for 7:00 a.m. Edmonton

The integrated preview is ready for a walkthrough. Start with the U11 sequence, then try the simpler U9 reads and review the coach tools, curriculum, Brain Gym and character references.

**Live phone review:** [Open the shared review](https://ice-iq.vercel.app/review/). Phone access deployed in `019e8d9` and was verified on the public HTTPS site. It works without the desktop's server or Wi-Fi network. [Phone-preview.md](phone-preview.md) records the deployment and checks.

**Follow-up quality pass is live:** `98809ec` deployed successfully and was verified at 00:43 Edmonton. The optional changed-cue comparison, eleven revised Gym introductions and secondary-text contrast fixes are included. **158 practice tests and the production build pass.** The live phone flow completed three reads, saved an original Pass and revised Carry explanation, and restored both after reload with no overflow, failed requests or page exceptions.

**Route/mobile pass is live:** `a046ea6` deployed and verified at 01:25 Edmonton. Read three now supports tapping a support route with preview, undo, keyboard coordinates and saved explanations. Shootout/Best Option recover to 2D after graphics-context loss and stop hidden WebGL rendering after completion. That release passed **167 tests**; production build and touch-event browser flows pass. On the live phone-sized HTTPS view, the route and reason from the Shoot branch survive reload. A forced graphics loss also left the live 2D Shootout playable, with a subsequent shot scored.

**Phone/coach editing pass is live:** `cabeee0` deployed and was verified at 02:46 Edmonton. Questions stay with the rink on stacked layouts. Coach coordinate editing stops playback and preserves negative decimals; Resume keeps the paused frame. The public U9 completion restored after reload and the older U11 save stayed unchanged. Reduced-motion replay focuses its visible reflection. **189 practice tests and build pass.**

## Walkthrough

**Play recall is live:** `8a2a5e9` deployed and was verified at 03:17 Edmonton. Finish a U9 or U11 sequence, then open **Try play recall**. The phone flow used touch to correct the order, saved/reopened its note, and preserved the help flag and original hockey reflection. **208 practice tests and build pass.**

**U9 is live:** `304848c` deployed and was verified at 02:00 Edmonton. Select **U9 / Find space** in Read the play: choose Pass or Carry, make the next puck decision, then move the highlighted player or plan a route and give a short reason. Read aloud is optional. The live phone-sized flow accepted a receiver touch and route point, saved and reopened the U9 reflection, and left the older U11 saved JSON unchanged. U9 and U11 save separately; switching between them preserves unfinished work while this view stays open.

| Open the hosted preview | What to try |
| --- | --- |
| [Practice Arena](https://ice-iq.vercel.app/#practice-arena) | Choose Pass, explain the defender cue, choose the next target, then move the off-puck player or choose **Plan route** and explain why. Repeat with Carry to see a different continuation. Finish a sequence and try **One thing changes**: compare the original freeze with D1 in the pass lane, then save a new action and reason. |
| Practice Arena → Coach Lab | Choose one of 12 examples across U7–U18. Move a player, explain, and compare with the separate coach reference. Switch to authoring to change the question and reference. |
| Practice Arena → Learn the game | Four guided lessons per selected age: 24 lessons and 48 questions. The source library also exposes the original question bank, scenarios, animated plays and coach personas. Age-scoped selection is implemented; child comprehension and curriculum admission remain open. |
| Practice Arena → Play | Free play, Read & React and Set up a rep. Change the gap, start a rep, replay and save a setup. |
| Practice Arena → Coach Lab → Animate a play | Add/remove players, select a team template, freeze actors, then **Plan player route** from a paused moment. Tap the 3D rink or Rink board, preview, Apply and Animate play. Cancel, Undo route, save/reopen and import/export are available. |
| [Brain Gym](https://ice-iq.vercel.app/#brain-gym) | All 12 games remain. Try Shootout with the pointer or six keyboard targets; Best Option also has a 3D view. The follow-up revises the other eleven introductions to describe their actual tasks and controls. |
| [Shootout before](https://ice-iq.vercel.app/#shootout-before) / [now](https://ice-iq.vercel.app/#shootout-now) | Compare the old renderer with the upgraded rink, equipment, lighting and interaction. |
| [Character Studio](https://ice-iq.vercel.app/review/characters/) | Switch Skater/Goalie and Navy/Gold. Inspect actual transparent PNGs against light, dark and checker backgrounds. |

## What improved

- **Coach Lab skating routes** turn 1–12 tapped or entered positions into ordinary movement keys from the exact paused moment. Preview stays separate until Apply; Cancel preserves the draft and Undo restores the previous movement. Both 3D cameras and a full-rink board support planning. Finish time, default fixed facing, optional blended turning, phone controls and saved routes are implemented. This does not add pass-transfer authoring or an AI route grade. [Route behavior and source uses](coach-skating-routes.md).

- **Play recall** adds another way to show comprehension after a completed sequence. U9 starts with the opening fixed; U11 reorders three actual moments. Captions, larger pictures, touch/keyboard controls, optional reasons and device saves/downloads support discussion. Feedback checks the shown chronology and records help without claiming a tactical grade. [Recall design and boundaries](connected-read-recall.md).

- The current mobile read question and its cue now sit directly above the rink. Successful decisions return to that view without jumping during player or route edits. Coach Lab releases game keys when paused or outside its rink, resumes from the paused frame, and pauses when coordinate editing begins. Blank fields and incomplete negative numbers no longer move a player to zero.

- BlueChip navy, gold and bone; local Playfair Display and Inter; glass panels, consistent pills, readable gold actions and larger touch controls.
- The U11 sequence has three connected reads with different pass, carry and shoot consequences. It combines action/target choices, player movement and free explanations. A simulated goal or matching coordinates never certifies the reasoning.
- The U9 draft adds four simpler connected paths, only YOU tagged on the ice, short reasons and optional device read-aloud. Numbered receiver targets now sit above player markers and accept taps directly on the receiver. U11 data, seven branch outputs, route saves and AI payloads remain byte-identical to the previous version. [U9 draft](u9-read-sequence.md).
- The follow-up adds an optional **One thing changes** comparison after completion. Only D1 moves, from partial shot coverage onto the visible puck-to-F2 pass line. The learner records a retained or revised action and a reason; the original answers and replay remain intact. The saved comparison is an optional field in the existing v1 reflection and its download. No new outcome, tactical grade or AI opinion is generated.
- The source map covers all 12 substantive guiding notes, age progression, interaction choices, prerequisites and what is implemented versus planned.
- Coach references and learner attempts remain separate. U9 direction arrows and simple turn buttons make the angling cue visible.
- Hosted practice saves use a fixed preview identity on that device; development follows the active player. Saves do not sync between devices. Existing animated-play telemetry remains a device-global local log. Empty or corrupt player-scoped storage no longer retains another player's draft list. Curriculum rewards cannot be farmed by retrying.
- Brain Gym preserves its scoring and adaptive levels. Shootout has six accessible target buttons and keyboard shortcuts. Self/Coach radar series now differ by both colour and mark style.
- All eleven non-Shootout Gym introductions were audited against their stimuli and input code. Revised task descriptions remove unsupported automatic hockey-transfer claims, scolding language and stale instructions; **Talk hockey** prompts invite discussion. Scoring, timers and adaptation are unchanged. [Copy review](brain-gym-copy-review.md).
- Shared small secondary text now measures at least **4.9:1 contrast on the three shared navy surfaces**. Goals and skills were reviewed in local sample state, including phone-sized layouts. This does not establish contrast for every possible background or validate every authenticated journey.
- The initial app no longer eagerly loads the new Gym Three.js code.

## Verified

Current follow-up: `npm run test:practice` reports **225 tests passed**, including simulation, replay, director, curriculum, coach questions, storage, AI adapter mocks, Gym scoring/progression, shot geometry, phone-review packaging, changed-cue comparison, branch-specific support routes, WebGL context-loss lifecycle and age-scoped U9/U11 saves. Production build passed. The latest Coach Lab pass adds 17 route/tap tests and browser checks for 3D/SVG touch input, scroll cancellation, nonzero Start, preview/pause, scoped Apply/Undo, frozen players and exact save/reload. Prior phone checks cover negative decimals, paused keyboard navigation, same-frame resume, prompt/rink visibility, reduced-motion replay, and 390/820/1280 px layouts. All four U9 paths completed in a 390 px browser; actual touch events selected a receiver and added a route. Keyboard age selection retains focus, and switching/reload/export preserve the appropriate answers. Speech invocation and cancellation were instrumented; device voice quality was not evaluated. The prior integrated scenario-engine run passed; this slice did not modify that engine.

The earlier integrated browser checks covered all 12 Gym launch/back flows; full five-shot mouse and keyboard shootouts; sequence branch, replay, positioning, explanation and reload flows; coach drag/keyboard/save/reopen/compare; guided MC → TF completion/retry/focus; and desktop, 820 px tablet and 390 px phone layouts. The public phone release was also checked on its live HTTPS origin. Follow-up checks include changed-cue phone/tablet layouts and sample goals/skills; comparison replay/download and production-preview reload preserve both answers, as recorded in [verification.md](verification.md).

These are browser viewport checks. No physical phone or iPad test, full screen-reader user study, or authenticated production journey audit is claimed.

[Detailed verification](verification.md) · [Independent review and fixes](site-quality-review.md) · [Source map](concept-interaction-map.md)

## What still needs work

1. **AI has no configured live key.** Hosted review returns unavailable before sending an AI request; the local server adapter is also unconfigured. No live AI judgment is claimed. The final U11 opinion, if configured in future, concerns final positioning only. The changed-cue comparison adds no AI request.
2. **The arena is a hosted prototype.** Phone access and the current follow-up are live and verified. Cloud practice persistence, a production judge and main-app Arena navigation are not implemented.
3. **Character references are finished enough to review, not finished game models.** Four native 1254×1254 transparent navy/gold sheets exist, plus a 40-clip animation specification. Rigged models, animation clips and free-camera character assets remain to be produced. No purchase was made. [Free and paid paths](asset-shortlist.md).
4. **Age policy and age validation remain open.** The original quiz still uses the existing `ALL_AGES_MODE` mixed-age policy; this quality pass does not resolve that policy. The new guided curriculum and connected U9/U11 reads select content by age, but that is not evidence of child comprehension. New geometry, prompts and answer alignment need coach/player review before curriculum admission. U9 has no AI or changed-cue exercise; the optional comparison remains a U11 draft.
5. U9 and U11 support-route planning, actual-branch recall and Coach Lab skating-route authoring are implemented. Other ages, timed coach pass transfers, richer prediction sequences, whole-sequence AI review, physical phone/iPad testing and further production integration remain future work. Existing feature surfaces remain; this pass did not verify every authenticated production workflow.

These improvements are substantial prototype and usability work. They are not NHL-level character animation or a completed commercial hockey simulation.
