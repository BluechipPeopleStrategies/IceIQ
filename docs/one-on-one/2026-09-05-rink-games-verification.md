# Rink games 3D release verification — 2026-09-05

This records a scoped local 3D game release. Scenario/question data and App routing are unchanged.

## Release closure from current HEAD

Baseline HEAD: `8428bf7`.

The focused 3D change set currently visible against that baseline is:

- `src/cognitive-gym/BestOptionScene3D.jsx` — passes explicit `isLearner` to
  the learner skater.
- `src/cognitive-gym/ShootoutScene3D.jsx` — loads the eight provisional goalie
  art parts as one all-or-fallback texture set while retaining the existing
  articulated rig, movement, coverage, and hit-region logic.
- `src/one-on-one/Skater.jsx` — restored articulated rig animation, carries the
  learner locator, and supports authored heading/stick presentation.
- `public/assets/goalie/realistic-v1/manifest.json` and its eight PNG parts —
  untracked runtime assets required by `ShootoutScene3D.jsx`:
  `torso.png`, `helmet.png`, `catcher.png`, `blocker.png`,
  `pad-left.png`, `pad-right.png`, `sleeve.png`, and `pants.png`.

The `Skater.jsx` import of `src/visuals/PlayerLocator.jsx` is already present at
HEAD; it is not an additional dependency beyond the current baseline. The
focused JSX files have no unresolved imports, and the goalie asset paths match
the manifest URLs.

## Rink-background game inventory

The 12 Brain Gym entries in `src/cognitive-gym/CognitiveGym.jsx` divide as
follows:

| Game | 3D scene path | Status |
|---|---|---|
| Read the Pass | `AnticipationScene3D` → `GymRinkScene3D` | 3D WebGL route |
| Baylor's Pick | `TrackingScene3D` → `GymRinkScene3D` | 3D WebGL route |
| Eyes Up | `EyesUpScene3D` → `GymRinkScene3D` | 3D WebGL route |
| Snapshot | `SnapshotScene3D` → `GymRinkScene3D` | 3D WebGL route |
| Find the Lane | `RemainingDrillsScene3D(mode="findlane")` | 3D WebGL route |
| Best Option | `BestOptionScene3D` | 3D WebGL route |
| Read the Numbers | `RemainingDrillsScene3D(mode="readnumbers")` | 3D WebGL route |
| Late Read | `RemainingDrillsScene3D(mode="lateread")` | 3D WebGL route |
| Two Things at Once | `RemainingDrillsScene3D(mode="twothings")` | 3D WebGL route |
| Shootout | `ShootoutScene3D` | 3D WebGL route |
| Run the Play | `RemainingDrillsScene3D(mode="runtheplay")` | 3D WebGL route |
| Shoot or Hold | none | cue game; no rink background |

Every rink-background drill mounts `GymVisualStage` with a concrete `scene3d`
child. `GymVisualStage` intentionally keeps the existing canvas underneath as
a no-regression fallback and fades it out after WebGL becomes ready
(`.gym-visual-stage.has-webgl .gym-fallback-canvas`). Therefore the release
route is 3D-first; a flat canvas still exists only for WebGL failure or before
readiness. This was verified from the actual component and CSS, not a browser
visual claim.

The separate one-on-one and scenario routes also use the shared 3D surfaces:
`PracticeScene`, `ReadSequenceScene`, `ScenarioRink3D`, and
`ScenarioImage`/`ScenarioRinkView`. No focused change introduces a new flat-rink
renderer or bypasses those surfaces.

## Verification commands and results

Passed in the current worktree:

- `npm.cmd run test:gym` — all gym core checks passed.
- `npm.cmd run test:shootout` — 29/29 passed, including six-cell geometry,
  coverage timing, deterministic shots, and goalie target alignment.
- `npm.cmd run test:art-lint` — 15/15 passed.
- `npm.cmd run test:practice` — 576/576 passed, including rig/scene,
  camera, player identity/locator, puck, visual-gate, 3D image, and animated
  play checks. This required escalated execution because esbuild cannot resolve
  JSX imports under the sandbox ancestor restriction.
- `npm.cmd run build` — Vite production build succeeded; it emitted only the
  existing large-chunk and dynamic-import advisory warnings.
- `git diff --check --` on the focused JSX files — no whitespace errors.

## Browser verification

The isolated development candidate at port 5180 mounted a ready WebGL surface for all eleven rink-background games. Eyes Up initially threw `ReferenceError: roundedRinkShape is not defined`, causing a silent flat-canvas fallback. The missing import is now fixed. A Babel binding regression check covers all nine renderer modules, including the shared Skater.

Eyes Up accepted an actual pointer response and displayed distance/score feedback. Shootout displayed its complete detailed goalie artwork. Eyes Up and Shootout were inspected at 390px width with no document overflow. Simulating a WebGL context-loss event removed the WebGL layer, retained the action button and fallback canvas, and remained stable without a restart loop.

These checks establish renderer startup and selected interactions, not a full coaching or device-performance certification. Best Option still uses its simpler rectangular training pad, and the goalie artwork is provisional front-view textured planes on the articulated rig. Further visual refinement remains available without changing scoring geometry.

The original six-world reference sheet was unchanged. This release has not been pushed or deployed.
