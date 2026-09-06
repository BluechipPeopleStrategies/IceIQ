# Shared 3D implementation review

Local review: `http://127.0.0.1:5198/player-lab.html?view=eyes&age=U18`.

This is a working interaction and editable-model candidate. Final character art, complete hockey clips and catalog-wide physical/cue acceptance are not complete. No deployment was performed for this implementation.

## Delivered locally

- Shared articulated three-stage player family; solid navy/gold jerseys with matching helmets; independent deterministic poses; smooth normals preserved through export.
- Optional rounded body study with continuous torso and rounded shoulders. It is the review-lab default, not an accepted production-art replacement.
- Actual ice-plane X/O display; player-eye views retain physical character bodies.
- True player-eye and external perspective cameras plus normal rink presets. Saved per-question views apply once on entry/re-entry. Camera manipulation preserves source time and world positions.
- Age-dependent eye height, explicit invalid-observer handling, hidden own model/label, normal-view restoration for unsaved questions, saved perspective pan/look round trips.
- Readiness after a matching-camera scene render, with cancellation and render-hook preservation. This is not a GPU-completion fence.
- Source-only authored velocity/motion for consistent play/pause/seek poses. Unauthored movement cannot invent forward strides.
- Low-view enclosure with physical walls, stands, ceiling and beams, using the same rink geometry/landmarks.
- Two separate Blender-export families: 24 GLBs and 24 individual native models total, plus two native review stages/renders. Both families retain source snapshots and SHA-256 manifests; native reopening was checked.

## Integration coverage and boundaries

| Surface | Local integration |
|---|---|
| Shared ScenarioRinkView / ScenarioRink3D | Age, optional view/entry identity, motion, tactical/character presentation and candidate finish |
| Experimental scenario questions | Scenario age, per-question starting view and stable question identity |
| Animated plays | Current age, decision-node view, replay entry and stable node identity |
| Authored source-image scenes | Shared 3D source adapter receives question age/view/identity; learner quiz shells forward player age |
| Guided curriculum and placement | Current age, optional question view and stable board/variant identity |
| Coach question lab and workshop | Available age/view/identity forwarded; no saved settings invented for existing questions |
| Connected reads | Optional saved views for each authored read, source-only motion, own-observer suppression and render readiness; comparison/recall ages and identities |
| Rink discovery | U7 player presentation and question identity |
| Standalone practice and cognitive gym | Shared rig and optional age/stage forwarding; their specialized gameplay camera systems are not replaced |

The working tree already contained substantial unrelated modifications and untracked consumers. Those are preserved. Core candidate files can be committed independently; bridges mixed with earlier work require a coherent joint release rather than sweeping that work into this change. The local production build verifies the working tree, not a claim that a separately selected commit contains all of that earlier work.

## Verification

- Final targeted run: **102 tests passed**. Log: `tmp/shared-3d-20260906/verified-tests.txt`.
- The earlier broad run including the expensive six legacy rig checks passed **103 tests**; those counts overlap and must not be added. Subsequent normals, candidate geometry and signed-turn changes passed their final eight focused model tests.
- Production build passed; logs are in `tmp/shared-3d-20260906/verified-build.txt`. Existing chunk-size and mixed-import warnings remain.
- Isolated browser sessions exercised actual first-person entry/re-entry, external panning, saved-view restoration, play/pause/seek, age/finish changes, tactical display and forced bodies in first-person. Desktop and 390px narrow viewport screenshots were inspected. Fresh sessions reported no page errors; an existing Three.Clock deprecation warning remains.
- Final camera readiness was checked in a fresh browser session after the render-hook fix.
- Independent review found no new critical/high functional regressions. Readiness was subsequently strengthened to follow an actual matching-camera render. Eye-socket tracking remains a documented limitation.

## Exact review artifacts

- `tmp/shared-3d-20260906/rounded-study/blender/age-family-review.blend`
- `tmp/shared-3d-20260906/rounded-study/blender/age-family-review.png`
- `tmp/shared-3d-20260906/rounded-study/manifest.json`
- `tmp/shared-3d-20260906/rounded-study/blender/verification.json`
- `tmp/shared-3d-20260906/browser/eyes-enclosed-final-desktop.png`
- `tmp/shared-3d-20260906/browser/eyes-enclosed-final-phone.png`
- `tmp/shared-3d-20260906/browser/eyes-render-ready-desktop.png`
- `tmp/shared-3d-20260906/browser/tactical-older-desktop-labels.png`

## Remaining quality work

The rounded study improves the silhouette but does not meet the supplied professional character references. Equipment transitions, expressive faces, organic skin weights and a deliberately finished character still need an art pass. First-person foreground hands/stick and a posed eye-socket camera are not delivered. Physical tablet testing has not run. Narrow-screen field of view can exclude off-axis players until the learner looks around, so each graded viewpoint requires cue review. The rim example is a preparation pose study, not a validated pickup/contact sequence. All-scenario physics and visual acceptance require authored trace and question coverage, not just a shared renderer.

Next production step: refine one Blender master and validate its neutral pose plus one complete approach/turn/pickup sequence in the actual rink before deriving the entire approved family. See [production workflow](2026-09-06-blender-production-workflow.md).
