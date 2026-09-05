# Practice framework verification
September 5, 2026 · Shared phone preview and local production-build checks

## Automated checks
- `npm run test:practice`: 167 passing tests, zero failures, including the public asset packaging, changed-cue reflections, seven branch-specific route origins and WebGL lifecycle paths.
- `npm run test:scenario-engine`: passed every existing component suite, including physics, canonical frames, compiled playback, factory state/promotion/recall and parameter-space generation.
- `npm run build`: passed. Existing large-chunk and mixed static/dynamic import warnings remain.
- `git diff --check`: no whitespace errors; Windows line-ending notices only.
- Judge tests use mocked provider responses. The real local status endpoint returns `configured: false`; no real model call or provider charge occurred.

## Actual browser coverage
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
