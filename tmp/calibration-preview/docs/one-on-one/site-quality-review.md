# Site quality review — 2026-09-05

## Root resolution and browser follow-through

All concrete findings recorded below are now resolved. The independent observations below are retained as history, not current defects.

| Finding | Final resolution and evidence |
| --- | --- |
| Gold action contrast | Solid-gold actions use navy foreground, including the demo banner: approximately 7.24:1. |
| Radar series collision | Self is blue/solid/circles; Coach is gold/dashed/diamonds; legend matches. Code verified. |
| Shootout keyboard access | Browser five-shot keyboard game: 4 goals, 1 save, 3895 points. Six targets fit at 390 px. End-of-shot announcements report the result. |
| Facing and speed | U9 arrows and simple 45-degree turn buttons; U11+ degree input. Browser 180 to 225-degree turn verified. Unsupported frozen-board speed claim removed. |
| Team colours | Home navy/circle and Away gold/diamond across boards, rosters, legends and 3D. |
| Player identity | Active player passed through all persistent modules and SourceQuestion to ScenarioRenderer. Library starts at the player's age. |
| Empty/corrupt saved list | CoachLab resets to an empty list when the next scope has no valid records. Storage isolation tests pass. |
| React updater errors | Movement is computed synchronously inside try/catch before assignment. Missing inputs remain local messages. |

Additional corrections: canonical goalie placement in all examples; strict curriculum strand/net/age checks; branch-specific U11 continuity; curriculum focus handoff; lazy Gym loading; shootout target/puck alignment; and visible nested one-on-one navigation.

153 practice tests, the existing scenario-engine suite and production build passed. Actual browser coverage and limits: [verification.md](verification.md). Four navy/gold transparent references are ready for art-direction review; rigged animation remains open.

## Historical independent review before the root fixes

Scope: code-level review of the current working tree for Guided Curriculum, Brain Gym, Practice Hub, Coach Questions, Coach Lab, one-on-one practice, and the global BlueChip palette/font change. This review did not use a browser and does not make a visual-fidelity claim.

## Resolution ledger — final code recheck

| Earlier finding | Current status | Verification |
| --- | --- | --- |
| Solid `C.purple` action contrast | **Resolved in code** | The identified solid-gold actions now use `C.bg` foreground, including `src/App.jsx:1314`, `:2943`, `:4231`, and the Parent Assessment action near `:6210`. Browser contrast inspection is still pending. |
| Self and Coach radar series collision | **Resolved in code** | Self is blue with solid stroke/circle points; Coach is gold with dashed stroke/diamond points, with an explicit legend in `src/App.jsx:4521-4594`. |
| Shootout keyboard/screen-reader access | **Resolved in code** | Six DOM buttons call the existing cell-ID scoring authority at `src/cognitive-gym/ShootoutDrill.jsx:1019-1039`; keys 1–6 use the same IDs at `:820-824`. The 3D/canvas target geometry and shot core were not changed by this accessibility layer. Browser focus-order and phone-layout checks are pending. |
| Coach Question facing/speed mismatch | **Partially resolved; one U9 path remains** | Facing arrows, a degree input, shortest-angle comparison, and descriptive no-grade output now exist (`src/one-on-one/CoachQuestionLab.jsx:116, 208-210`; `src/one-on-one/coachQuestionCore.js:160-175`). Unsupported claims that a frozen board visibly proves speed were removed. The U9 exception is described below. |
| Home/Away colour reversal | **Resolved in code** | Question Board, Guided Curriculum, and Practice Scene consistently render Home navy/circles and Away gold/diamonds (`src/one-on-one/CoachQuestionLab.jsx:103-120`; `src/one-on-one/GuidedCurriculum.jsx:57-73`; `src/one-on-one/PracticeScene.jsx:135-137`). |
| Practice Arena profile/persistence wiring | **Mostly resolved; one nested scenario path remains** | The DEV arena is keyed to and receives the active player (`src/App.jsx:8641`), and Practice Hub propagates identity to Read Sequence, one-on-one, curriculum, library, Coach Questions, Coach Lab, and Brain Gym (`src/one-on-one/PracticeHub.jsx:22-26`). The remaining hard-coded scenario identity is described below. |

Guided Curriculum's focus handoff is coherent in code: submitting queues focus for the newly mounted feedback, retry/advance queues the next prompt, and the effect clears the pending request only after attempting the relevant ref (`src/one-on-one/GuidedCurriculum.jsx:86-120`). Its player-and-age key also forces a clean progress reload at the component boundary. Browser focus visibility and screen-reader announcement order remain pending.

Read Sequence now uses the canonical right goal line, labels the partly covered route as a shot lane, points the opening goalie toward the puck carrier, and gives the pass branch a genuinely different shoot-open second state. User handlers validate synchronously before calling `setSession` (`src/one-on-one/ReadSequence.jsx:237-267`), while the animation updaters guard the active phase before calling the throwing core (`:206-225`). Core tests confirm deterministic replay/restore and branch-specific geometry. Practice Hub currently mounts the sequence under a player-specific key (`src/one-on-one/PracticeHub.jsx:22`); integrated browser interaction remains pending.

## Issues at the earlier checkpoint (resolved above)

### P2 — The U9 angling example still hides the facing cue that its reference teaches

`coach-example-u9-angle-wide` says the reference's body angle faces the carrier (`src/one-on-one/coach-question-examples.json:414, 548`). The board classifies both U7 and U9 as `young` (`src/one-on-one/CoachQuestionLab.jsx:198`), then suppresses both the facing arrow (`:116`) and degree control (`:210`) whenever `young` is true. The U9 learner therefore still cannot see or reproduce a stated part of this reference, even though the comparison table reports an angle difference.

**Action:** keep the simplified U7 treatment, but expose the direction arrow and facing control for the U9 angling question (or remove facing from that example's authored answer). Continue to present the angle as descriptive evidence rather than a correctness threshold.

### P2 — Practice Library scenario questions still write reaction data to the shared preview identity

Practice Hub supplies the real `playerId` to `PracticeLibrary` (`src/one-on-one/PracticeHub.jsx:24`), but `SourceQuestion` does not accept it and hard-codes `playerId="practice-preview"` when mounting `ScenarioRenderer` (`src/one-on-one/PracticeLibrary.jsx:16, 33, 38`). `ScenarioRenderer` records response timing under the passed identity (`src/scenario/ScenarioRenderer.jsx:151, 292`). Signed-in Practice Arena scenario attempts therefore accumulate in the preview reaction log rather than the active player's log, despite the library's own points using the correct scoped key.

**Action:** pass `playerId` through `PracticeLibrary` → `SourceQuestion` → `ScenarioRenderer`, and add a small integration test that two identities produce separate reaction records.

### P3 — Coach Lab can retain the previous player's saved-draft list when the new scope is empty or malformed

The load effect only calls `setSaved` when parsed storage is an array and silently catches errors (`src/one-on-one/CoachLab.jsx:46`). If `playerId` changes without remounting and the next key is absent, non-array, or corrupt, the prior `saved` state remains visible. The current DEV arena avoids this because `PracticeArena` is keyed by player, but `CoachLab`'s own player-aware contract does not clear stale state.

**Action:** make the effect always assign a filtered array, defaulting to `[]` on missing/invalid data and in `catch`. Cover a populated-player → empty-player transition.

### P3 — Coach Question's learner move catch does not cover errors thrown by the React updater

The learner branch wraps `setAttempt(...)` in `try/catch`, but `moveLearnerActor` is invoked inside the functional updater (`src/one-on-one/CoachQuestionLab.jsx:166`). React may execute that updater after the surrounding `try` has returned, so an invalid or stale attempt can reach the route error boundary instead of the local status notice. Normal board moves are validated and the current tests do not reproduce this state, but the error-handling promise is incomplete.

**Action:** compute the next attempt synchronously from the current rendered/ref value before `setAttempt`, as Read Sequence now does, or make the updater non-throwing and report validation separately.

## Findings

### P1 — Solid `C.purple` actions now fail text contrast after `purple` was aliased to gold

`src/shared.jsx:11-16` gives `C.gold` and `C.purple` the same `#C9A24B` value while `C.white` is `#F5EFE6` at `src/shared.jsx:29`. The resulting bone-on-gold contrast is approximately **2.10:1**, below WCAG AA for normal text and below the 3:1 threshold for large text. Several production controls still assume that `C.purple` is a dark fill and use `C.white` text, including “Submit Order” (`src/App.jsx:1314-1316`), “Next Question” (`src/App.jsx:2943-2945`), the SMART-goal next step (`src/App.jsx:4231-4233`), and “Start” Parent Assessment (`src/App.jsx:6196-6198`). The non-dev demo banner also uses the same failed pairing at `src/App.jsx:8851-8853` with 11 px text.

**Action:** introduce a distinct semantic action token with a tested foreground, or change every solid-gold action to `C.bg` text. Keep `C.purple` only as a compatibility alias if every call site is audited for whether it is used as text, fill, or a data-series identity.

### P1 — Self and Coach are the same series in the Skills Map

The token collapse above also removes the meaning of the two-series radar chart. The coach polygon and points use `C.gold` at `src/App.jsx:4535-4537` and `src/App.jsx:4547-4552`; the self polygon and points use `C.purple` at `src/App.jsx:4539-4545`. The legend repeats those now-identical fills at `src/App.jsx:4578-4585`. When the paths overlap, neither the marks nor the legend provide a non-colour distinction, so the chart can no longer communicate who supplied a rating.

**Action:** assign Self and Coach separate semantic series tokens and add a redundant distinction such as solid versus dashed stroke or different point shapes. Do not derive data-series identity from the single brand accent.

### P1 — Shootout cannot be completed with a keyboard or screen reader

The six scoring targets are Three.js meshes with only `onPointerDown` handlers (`src/cognitive-gym/ShootoutScene3D.jsx:109-120`). The DOM fallback is a canvas with mouse/touch handlers and no focus target (`src/cognitive-gym/GymVisualStage.jsx:40-49`). Shootout's global keyboard handler only supports Space for Go and Next (`src/cognitive-gym/ShootoutDrill.jsx:782-797`); during the live shot, every keyboard-only attempt must time out. The descriptive `aria-label` is placed on an otherwise generic wrapper and does not expose the six cells, their names, or their current open/covered state as operable controls.

**Action:** expose six labelled DOM buttons or equivalent focusable controls that call the existing `resolveShot(cellId)` authority. Provide the same open/covered text already used by the visual labels, visible keyboard shortcuts, and a live announcement when a cell closes. Keep the 3D hit meshes and six-cell geometry unchanged for pointer users.

### P2 — Three Coach Question references teach facing or speed that the board cannot show or edit

The ready-made examples explicitly describe body angle or stance at `src/one-on-one/coach-question-examples.json:548`, `:705`, and `:1216`; the U11 rubric additionally says the carrier “has speed” at `:717`. The stored initial/reference drafts do contain changed `facing` values, but `QuestionBoard` translates actors without rotating a direction mark (`src/one-on-one/CoachQuestionLab.jsx:112-116`). Its learner controls expose only X/Y coordinates (`src/one-on-one/CoachQuestionLab.jsx:209`), and comparison output reports only X/Y distance (`src/one-on-one/coachQuestionCore.js:160-171`; `src/one-on-one/CoachQuestionLab.jsx:207`). A learner therefore cannot see or reproduce the facing part of the authored answer; a single time-0 snapshot also has no visible velocity from which to infer speed.

**Action:** either render and label facing, expose a facing control, and include it descriptively in comparison, or remove facing-specific answer language. Replace “has speed” with a cue visible in the frozen positions unless an explicit route/speed indicator is added. Keep this descriptive rather than turning angle or speed into an automatic correctness threshold.

### P2 — The same team changes colour when a question opens in the full rink editor

Coach Questions define Home as gold circles and Away as navy diamonds in both the accessible description and marks (`src/one-on-one/CoachQuestionLab.jsx:102`, `:114-118`). Guided Curriculum uses the same home-gold mapping (`src/one-on-one/GuidedCurriculum.jsx:57-73`). The full 3D editor reverses it: Home is navy and Away is gold (`src/one-on-one/PracticeScene.jsx:135`). This is a direct workflow because the question screen opens its current draft in the director at `src/one-on-one/CoachQuestionLab.jsx:209`. The actor IDs remain correct, but the visual identity a learner or coach just used flips during the transition.

**Action:** centralize home/away presentation tokens and use one mapping in 2D boards, the 3D rink, legends, and roster controls. Retain a redundant team distinction in addition to colour.

### P2 — Practice Arena preview does not exercise real profile age or persistence boundaries

The dev route renders `PracticeArena` without its `player` prop (`src/App.jsx:8639-8640`). Practice Hub therefore stores Guided Curriculum, Practice Library, Coach Questions, and Brain Gym under the shared `practice-preview` fallback and seeds U11 (`src/one-on-one/PracticeHub.jsx:22-24`). Play/Read and the animation director receive no player identity at all (`src/one-on-one/PracticeHub.jsx:21-23`) and use device-global save keys (`src/one-on-one/OneOnOne.jsx:9`, `src/one-on-one/CoachLab.jsx:7`). This does not affect the existing production Cognitive Gym route, which passes the real player at `src/App.jsx:8889`, but it prevents profile-isolation QA in the integrated arena and would mix data if the arena route were enabled unchanged.

**Action:** pass the authenticated player into `PracticeArena`, propagate `playerId` to every persistent module, and scope player-owned saves. If the director library is intentionally coach/device-wide, label that boundary and keep it separate from learner progress.

## Verification

- `npm run build` passed against the final reviewed tree. Vite reported only its existing large-chunk/dynamic-import warnings.
- All 76 one-on-one/curriculum/coach-question/storage/director/read-sequence/replay/simulation tests passed.
- Brain Gym core, shootout, progression, phase-one, visual mapping, offside, zone, and points suites passed (including all 12-drill progression coverage and 29 shootout scoring tests).
- The tests confirm one-time curriculum credit, static-draft validation, shortest-angle comparison, example age/goalie contracts, player-key helpers, Read Sequence geometry/replay/restore, profile-keyed Gym storage, six-cell Shootout geometry, and hidden-tab timestamp shifting. Browser-only focus visibility, responsive layout, 3D hit testing, and screen-reader behavior remain pending with the root browser pass.
