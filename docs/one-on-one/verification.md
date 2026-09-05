# Practice framework verification
September 5, 2026 · Shared phone preview and local production-build checks

## Automated checks
- `npm run test:practice`: 225 passing tests, zero failures, including Coach Lab route compilation and tap cancellation, public asset packaging, changed-cue reflections, branch-specific routes, age isolation, WebGL lifecycle, scoped coach controls and buffered coordinate editing.
- `npm run test:scenario-engine`: passed every existing component suite, including physics, canonical frames, compiled playback, factory state/promotion/recall and parameter-space generation.
- `npm run build`: passed. Existing large-chunk and mixed static/dynamic import warnings remain.
- `git diff --check`: no whitespace errors; Windows line-ending notices only.
- Judge tests use mocked provider responses. The real local status endpoint returns `configured: false`; no real model call or provider charge occurred.

## Actual browser coverage

### U11 player wording and recall labels, September 5

All seven U11 action/target combinations completed in isolated 390 px browser sessions. The current question, numbered-marker accessible labels, matching buttons, consequence summary and final puck description agree with the chosen branch. Production-preview normal-motion tablet playback accepted Pause/Resume; instrumented read-aloud text matched the visible question and three target labels. U9 retained its own opening prompt.

Full reload of the production preview restored an existing Carry/support-middle reflection under the new display label. Larger recall pictures, move/inspection labels and speech consistently use YOU with grammatical sentences. Both pre-existing read/recall localStorage values remained byte-identical; Download recall returned the exact canonical stored bytes. No overflow or page exceptions occurred in checked flows. The 225-test practice suite and production build pass, including the unchanged U11 golden fixture. These display changes do not modify branch states, stored definitions or the AI payload.

Evidence: `evidence/u11-player-copy-question-phone.png`, `evidence/u11-player-copy-recall-phone.png`; details: `u11-player-copy-review.md`. Deployed as `2b5ae75`, live verified at 04:30 Edmonton; `phone-preview.md` records old-save preservation and a fresh phone Pass/return/support/reload flow. Browser/speech instrumentation is not physical-device, device-voice-quality or child-comprehension validation.

### Coach Lab player routes, September 5

Seventeen new tests cover route timing/immutability, exact sampled Start, rounded boards, minimum intervals, possession, frozen/goalie rules and native pointer cancellation. Existing director and U9/U11 reflection tests remain green. The production build passes with the existing import/chunk warnings.

Browser checks at 320/390/1280 px covered captured nonzero Start, numeric negative coordinates, both 3D cameras, SVG board, normal-motion preview/pause, reduced-motion endpoint inspection, Apply, Cancel, Undo and invalidation of Undo after another edit. Whole-rink centre mapped to (0,0); broadcast centre mapped to (20,0), matching each camera's look-at point. Native touch input added board and 3D positions; a vertical canvas touch scroll moved the page without changing the point list. Controls outside the pending editor were disabled. Preview and rink both fit the 390 px viewport after explicit inspection.

Cancel exported byte-identical original JSON. Apply retained all other actor keys and puck ownership, replaced only the selected actor's remaining motion, and held a 6-second finish through 8 seconds. Applying from 2 seconds preserved the sampled anchor and earlier key. Animate play changed the player's sampled coordinates. Undo restored exact previous JSON; an intervening title edit removed Undo. Frozen players were blocked, an unfrozen goalie preview worked, and the final 7.95-to-8-second interval was accepted after fixing floating-point launch comparison.

The fresh production preview at 5185 accepted a touch waypoint and numeric waypoint, then Apply/Save/Export. Full reload and Reopen produced byte-identical JSON; the endpoint still held at 8 seconds. No page exceptions, failed requests or horizontal document overflow occurred in these checked flows. Independent review corrected preview visibility, inaccurate facing copy and the minimum-time launch guard. Evidence: `evidence/coach-route-phone.png`, `evidence/coach-route-desktop.png`. This is browser-generated touch/viewport evidence, not physical-device, skating-physics or coaching-validity certification. Live publication is recorded separately in `phone-preview.md`.

### Earlier integrated checks

| Surface | Verified action/result |
| --- | --- |
| U11 three reads | Pass → shoot-open → reposition → explanation → completion; Carry → keep outside → reposition; first-choice replay preserves answers; completed reflection survives reload. Missing action/reason/move stays in a local message. |
| U11 changed cue | Optional comparison moves only D1 into the actual puck-to-F2 pass line. Original Pass and revised Shoot/reason remain separate. Save, first-choice replay and downloaded JSON retain both answers. Production-preview reload restores the same reflection at 390 px; reduced-motion mode reaches each next freeze. Original/changed boards stack at 390 px and sit side-by-side at 820 px without overflow. |
| U11 support route | Touch-event taps add actual waypoints; vertical touch scrolling adds no accidental point. Coordinate blanks are rejected. Undo/Clear work; a cleared route cannot finish. Mode toggles preserve the temporary route until direct placement actually changes the player. Preview/progress changes only the selected support actor, preserving puck and all other transforms. Pause and manual reduced-motion inspection work. Completed route, first branch, free reason and changed-cue answer survive replay, JSON download and production-preview reload. Route reflections hide the final-position AI panel. |
| Coach Questions | Pointer drag, keyboard movement, U9 turn 180° → 225°, explanation, independent reference comparison, save/reopen, real unavailable-AI response, 390 px layout. |
| Guided Curriculum | U7 multiple choice → true/false → completion; retry preserves earned-credit limit; feedback and next/completion headings receive focus; 820 px layout. |
| One-on-one | Free play, Read & React, setup controls, rep/replay and local save. The nested mode navigation is visible again. |
| Director | 3v3 → 4v3, placement/time keys/freeze, playback, save/reopen and existing 2v1 import. |
| Brain Gym | All 12 games start/render/back. Mouse five-shot game: 3 goals/2 saves. Keyboard five-shot game: 4 goals/1 save, 3895 points, level 6 → 7; 1–6 targets and focus/Enter use the same scorer. |
| Brain Gym teaching copy | Eleven non-Shootout introductions and hub descriptions were checked against their render/input code. Read the Numbers and Two Things at Once introductions/start/back checked again at 390 px; instructions now identify stationary numbers and the shape above the buttons. Updated hub screenshot captured from the production build. Scoring is unchanged. |
| Mobile graphics lifecycle | Actual `WEBGL_lose_context` extension forced loss during Shootout. The WebGL layer detached and the existing 2D canvas became visible/pointer-active; a five-shot session completed and a later open-target goal still scored. Failure stays in 2D on Rematch within the same mount. Best Option had zero WebGL layers in intro, one during play, zero after five-read completion and one after Go again. No invisible completed-game WebGL layer remains. |
| Main app | Landing and U11 local sample demo at 390 px; existing feature tiles retained. Goals and Skills reviewed after shared secondary-text contrast increase (4.90–5.76:1 on the three shared navy surfaces). No real account changes. |
| Character Studio | Navy/gold skater and goalie PNG loading; character/uniform controls; native 1254 px images; 1440/390 px layouts, backdrop controls 44 px overall. |

No page runtime errors occurred in the final checked app flows. Expected unavailable-judge 503 responses are rendered as local messages. Three.js Clock deprecation and unused splash-preload warnings remain. Full reload was used after development hot updates.

## Screenshot evidence
Final BlueChip captures:
- `evidence/u11-three-reads-desktop.png`
- `evidence/u11-three-reads-tablet.png`
- `evidence/u11-three-reads-complete-desktop.png`
- `evidence/brain-gym-bluechip-desktop.png`
- `evidence/shootout-bluechip-desktop.png`
- `evidence/character-studio-gold-goalie-desktop.png`
- `evidence/character-studio-navy-skater-phone.png`
- `evidence/u11-changed-cue-phone.png`
- `evidence/u11-changed-cue-tablet.png`
- `evidence/goals-bluechip-readable-phone.png`
- `evidence/skills-bluechip-readable-phone.png`
- `evidence/u11-route-planner-phone.png`
- `evidence/u11-route-planner-tablet.png`
- `evidence/u11-route-saved-phone.png`

Other screenshots record earlier iterations or specific QA states. Files named glass/initial/v2/before must not be presented as final navy/gold screenshots without checking their actual pixels.

## U9 age expansion — September 5, 2026, 01:55 Edmonton

- `npm run test:practice`: **176 passed, zero failures**. The connected-read core has 30 passing tests, including all 21 previous tests, a pre-refactor SHA256 fixture over U11 definition/seven branch outputs/routes/saves/comparison/AI, U9 state ownership and four route origins, cross-scenario rejection, separate storage, generic director labels and unsupported U9 AI/comparison boundaries. This is regression evidence, not tactical validation.
- `npm run build` passed. Existing dynamic/static import and large-chunk warnings remain. The final production preview was loaded from port 5185 after a full reload, at 1280 × 900 with normal motion. U11 Pass → return receiver → keyboard placement → explanation completed, then U9 Carry → teammate pass → keyboard placement → explanation completed. Switching back preserved U11, and reload plus selecting U9 restored its completed reflection. U11 retained Shoot/Pass/Carry order and all three Pass follow-ups.
- At 390 × 844, all four U9 action/target paths completed with numeric route input and a short reason. Recorded route origins matched `(18.5,-4)`, `(16,4)`, `(17.5,6)`, `(18,-4)` respectively. None exposed U11 AI/comparison or produced a page exception or horizontal overflow. Reload restored the completed U9 attempt.
- Actual Chromium touch events added `(15,1)` and `(15,-2)` route points after Pass → carry space. Switching U9 → U11 → U9 retained both waypoints. Reduced-motion inspection accepted 50% progress; completion exported `rinkreads-u9-three-read-reflection.json` with the correct age, choices, route and explanations. Short first-choice text and selection also survived an unfinished age switch.
- The first receiver target was initially drawn underneath its player: the number was hidden and a centre tap hit the player instead. The overlay now draws a transparent hit ring and offset number above actors. `elementFromPoint` resolves the receiver target, and an actual touch at the receiver centre advances to read three. The age picker now remains mounted; keyboard Enter retains focus on the selected age button.
- Read-aloud was instrumented at the existing speech helper boundary. A user click queued the U9 prompt, Pass, Carry and short-reason prompt at rate 0.88; phase changes, age changes and explicit stop cancel speech. No actual audio quality or physical-device voice result is claimed.
- Independent content/core review sampled all authored consequence frames and found no pass/defender-marker overlap after widening three illustrated passing paths. Physics, timing feasibility and age comprehension remain unvalidated coach-review boundaries. No source bank admission, real account mutation or AI request occurred.

Evidence: `evidence/u9-first-read-phone.png`, `u9-target-phone-before-fix.png`, `u9-target-phone.png`, `u9-route-phone.png`, `u9-sequence-desktop.png`, and the actual `u9-route-reflection.json` export. Final review also caught a badge over the U11 goalie label: badges now choose a corner away from nearby actors and their visible labels; `u11-target-badges-phone.png` verifies the corrected layout. U9 normal-motion replay retained its completed summary. Public-origin verification is recorded in `phone-preview.md` after deployment.

## Continuing verification limits
No physical iPad, sustained low-power GPU benchmark, full screen-reader audit, authenticated production journey audit, live AI judgment, production judge deployment, source-content promotion or rigged character acceptance is claimed. New arena routes are available in the shared public review with device-local saves; hosted AI makes no network request. See `phone-preview.md` for live deployment evidence and `morning-review.md` for remaining feature gates. The original quiz still has its existing `ALL_AGES_MODE` mixed-age policy; this pass does not certify that bank as age-filtered. The new Guided Curriculum is explicitly age-scoped.


## Phone read flow and Coach Lab input — September 5, 2026, 02:37 Edmonton

- Final practice suite: **189 passed, zero failures**. Production build passes with the same existing import/chunk warnings. Thirteen new focused cases cover game-key ownership/release, transport state and coordinate parsing. Independent read-only reviewers identified the reduced-motion navigation race and active-coordinate remount; both fixes were browser-checked.
- At 390 × 844, the baseline U11 next-read rink started at -17.27 px while its question started at 484.48 px. The revised view puts the question at 56.08–151.77 px and rink at 264.70–545.31 px, with one visible current heading and no horizontal overflow. Evidence: `evidence/connected-read-scroll-before.png` and `evidence/connected-read-scroll-after.png`.
- Instrumented reduced-motion U9 flow: validation error caused zero app scroll calls; successful first submission caused one. Receiver selection, keyboard player movement and route Add caused no further app scroll. Completion remained at its reflection; replay with reduced motion focused the visible reflection after the board prompt disappeared.
- Production-preview desktop U11 Shoot → pause/resume → loose-puck support → movement/reason → complete/reload passed. The desktop uses its adjacent heading; the 820 × 1180 U9 flow shows the question and full rink together, without overflow. Evidence: `evidence/connected-read-tablet.png`.
- Native coordinate keystrokes: blank and incomplete minus preserved the original actor pose; typing -4 then -0.5 updated the actual coordinate and retained the negative decimal after blur. Coach JSON exported through the UI was byte-identical before/after clearing an input, and the final exported key recorded -0.5 without an extra key. Switching actors discarded incomplete text.
- Coach keyboard flow: running rink Tab switches players, Escape pauses, paused Tab navigates normally. Space on the camera button activates the button rather than shooting. Window blur clears input and pauses. Resume advanced from 1.3 s to 1.5 s without resetting to zero. Evidence: `evidence/coach-paused-input-phone.png`.
- Focusing a coordinate during live practice and during director animation stopped the clock and retained the same focused DOM input across animation frames. Negative-decimal typing then worked. The final production build repeated the live-focus check with no overflow or page exceptions.
- These checks use browser viewports and browser-generated touch/keyboard events. Physical phone keyboard, speech voice quality, sustained GPU performance and child comprehension have not been tested.


## Actual-branch recall — September 5, 2026, 03:10 Edmonton

- **208 practice tests pass; production build passes.** Nineteen recall/storage cases cover eleven U9/U11 paths, 66 permutations, sparse/foreign/malformed IDs, fixed U9 openings, support unchanged/loop cases, strict local basis, legacy/replay equivalence and unchanged original reflection/AI data.
- U11 Shoot/high-support: wrong order → keyboard/button reorder → matching order → optional explanation → real JSON download. The downloaded path/card order, note and help flag matched the checked attempt. Larger-picture focus returns to the same card. The visible picture description matches its accessible SVG description.
- An unchecked note survived first-action replay and U9/U11 switching. An edited saved note was correctly marked as needing another check. Show the order → Mix again → Check retained both mismatch feedback and the help flag; reload preserved that assisted mismatch. The original sequence JSON stayed byte-identical.
- Instrumented speech was cancelled on an order change. No device voice quality claim is made.
- At 390 × 844, a native touch event on the 134.5 × 44 px Earlier button reordered the U9 pass/return pair. Its opening had no movement controls; the correct chronology and note saved. Reset removed only U9 sequence/recall state; repeating exactly the same answers produced a fresh, unchecked recall with an empty note, while U11 storage remained unchanged.
- Evidence: `evidence/recall-u11-desktop.png`, `evidence/recall-u9-phone.png`, `evidence/recall-large-rink-phone.png`. A duplicate sibling key warning found in the first development check was fixed; subsequent checked flows had no console errors.
- New teaching content remains a coach-review draft. These browser checks do not demonstrate physical-device performance, screen-reader user comprehension, memory/scanning improvement or tactical correctness.

- Final production preview at 820 × 1180 with normal motion: U11 Carry → F2 in the middle seam → support/reason → recalled order/note → larger picture → save/reload passed. The SVG description matched the pictured F2 possession and F1 support state, focus returned to its card, and the restored order/note matched without overflow. Evidence: `evidence/recall-u11-tablet.png`.

## Connected-read 3D visuals — September 5, 2026, local only

This quality pass is verified locally and has **not yet been deployed**. The production-build browser checks below used the local preview on port 5185; they are not evidence that the public phone preview contains these changes.

- **243 practice tests pass; the production build passes.** Rendering uses the existing navy/gold skater rigs, rink and net with a fixed camera for each viewport orientation. The lesson's authored coordinates, choices, possession, explanations and storage contracts remain the source of truth. Frozen views render on demand. The tactical board remains available.
- Fresh production-preview checks at 390 px with reduced motion covered all **15 action/target paths: four U9, seven U11 and four U13**. Every numbered 3D target had a 44 × 44 px button with its visible number inside that button. U9 showed only YOU; U11/U13 showed their four player labels. Route mode retained exactly one selected-player ring on the SVG board. These fresh production runs had no horizontal overflow, page exceptions or failed requests.
- Normal-motion U11 Pass playback paused at 1%; progress and the actual canvas PNG bytes stayed unchanged across a 220 ms check, then Resume continued playback. A support-route preview paused at 14%; its progress and canvas PNG bytes stayed unchanged across 180 ms. Switching to the board showed F2 at the interpolated `(17.36125, -3.84375)` position while the other players remained frozen.
- In the development build, a native touch on the U13 receiver target reached read three. After the floor listener was changed to attach during the layout effect and discard pending gestures when bounds or viewport size change, a native floor tap added route point `(20.8, 1.1)` from origin `(21, 5)`. A vertical swipe scrolled 128 px without adding a point. Wide framing and switches between the tactical board and 3D retained the exact route.
- A real `WEBGL_lose_context` call removed the WebGL canvas and exposed the SVG fallback. The route was retained, its explanation could be completed, and a full reload restored the exact saved reflection. An earlier effectful Canvas fallback had incorrectly fired even with WebGL available; it was replaced with plain fallback text before these successful checks. Startup/render errors and context loss continue through the explicit fallback handlers.
- Independent review also corrected the target hit area moving separately from its number, player labels covering helmets, and the route mode clearing the selected-player highlight. The final input setup keeps its callback in a ref, attaches before paint, and cleans up on input mode, camera bounds or viewport-size changes. An isolated native `EventTarget` check confirmed that cleanup/rebind discards a held tap and accepts the next completed tap once.
- A download was initiated during this 3D pass, but the comparison was interrupted by a selector failure. **Exact download contents were not verified in this pass.** Earlier U13 download verification from before the 3D changes remains separate evidence. Likewise, an earlier development navigation produced an aborted request; the zero-failed-request result above applies only to the fresh production-preview runs.
- These are browser viewport, generated touch and local graphics-lifecycle checks. No physical phone/iPad, device voice quality, sustained GPU benchmark, child comprehension or tactical/age-validity acceptance is claimed. The connected sequences remain coach-review drafts, and these visual changes add no live AI key or model request.

- **Final narrow-screen fixes:** At 320 px, the canvas initially held its former grid width after a resize; zero-minimum grid columns/panels now shrink correctly. A U13 Carry target was partly clipped; all candidate button centres now clamp to a 28 px inset before obstacle scoring, and connectors follow the actual offset. Browser checks show both 44 px targets fully inside the 261 px canvas with no document overflow. A new failing-first regression covers every authored target/candidate at six canvas widths; 243 tests pass. Label and target portal mounts request one render and chips have a default lift, preventing delayed initial label placement without adding an animation loop.
