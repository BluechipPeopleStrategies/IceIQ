# Practice framework verification
September 5, 2026 · Shared phone preview and local production-build checks

## Automated checks
- `npm run test:practice`: 158 passing tests, zero failures, including the public asset packaging and changed-cue reflection paths.
- `npm run test:scenario-engine`: passed every existing component suite, including physics, canonical frames, compiled playback, factory state/promotion/recall and parameter-space generation.
- `npm run build`: passed. Existing large-chunk and mixed static/dynamic import warnings remain.
- `git diff --check`: no whitespace errors; Windows line-ending notices only.
- Judge tests use mocked provider responses. The real local status endpoint returns `configured: false`; no real model call or provider charge occurred.

## Actual browser coverage
| Surface | Verified action/result |
| --- | --- |
| U11 three reads | Pass → shoot-open → reposition → explanation → completion; Carry → keep outside → reposition; first-choice replay preserves answers; completed reflection survives reload. Missing action/reason/move stays in a local message. |
| U11 changed cue | Optional comparison moves only D1 into the actual puck-to-F2 pass line. Original Pass and revised Shoot/reason remain separate. Save, first-choice replay and downloaded JSON retain both answers. Production-preview reload restores the same reflection at 390 px; reduced-motion mode reaches each next freeze. Original/changed boards stack at 390 px and sit side-by-side at 820 px without overflow. |
| Coach Questions | Pointer drag, keyboard movement, U9 turn 180° → 225°, explanation, independent reference comparison, save/reopen, real unavailable-AI response, 390 px layout. |
| Guided Curriculum | U7 multiple choice → true/false → completion; retry preserves earned-credit limit; feedback and next/completion headings receive focus; 820 px layout. |
| One-on-one | Free play, Read & React, setup controls, rep/replay and local save. The nested mode navigation is visible again. |
| Director | 3v3 → 4v3, placement/time keys/freeze, playback, save/reopen and existing 2v1 import. |
| Brain Gym | All 12 games start/render/back. Mouse five-shot game: 3 goals/2 saves. Keyboard five-shot game: 4 goals/1 save, 3895 points, level 6 → 7; 1–6 targets and focus/Enter use the same scorer. |
| Brain Gym teaching copy | Eleven non-Shootout introductions and hub descriptions were checked against their render/input code. Read the Numbers and Two Things at Once introductions/start/back checked again at 390 px; instructions now identify stationary numbers and the shape above the buttons. Updated hub screenshot captured from the production build. Scoring is unchanged. |
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

Other screenshots record earlier iterations or specific QA states. Files named glass/initial/v2/before must not be presented as final navy/gold screenshots without checking their actual pixels.

## Limits
No physical iPad, sustained low-power GPU benchmark, full screen-reader audit, authenticated production journey audit, live AI judgment, production judge deployment, source-content promotion or rigged character acceptance is claimed. New arena routes are available in the shared public review with device-local saves; hosted AI makes no network request. See `phone-preview.md` for live deployment evidence and `morning-review.md` for remaining feature gates. The original quiz still has its existing `ALL_AGES_MODE` mixed-age policy; this pass does not certify that bank as age-filtered. The new Guided Curriculum is explicitly age-scoped.
