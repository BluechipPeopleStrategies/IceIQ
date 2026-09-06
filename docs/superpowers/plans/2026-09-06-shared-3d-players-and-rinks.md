# Shared 3D players and rinks implementation plan

> **For agentic workers:** Use superpowers:subagent-driven-development. Implement the bounded tasks below, with focused tests and an integrated browser review.

**Goal:** Build the approved age-progressive player presentation, solid team uniforms, physically coherent hockey-motion presentation and optional question-entry viewpoints over the shared 3D scene.

**Architecture:** One player factory serves shared scenarios and practice. Scene state remains authoritative for positions, facing, time, puck and answers. A question-entry camera contract independently selects a true perspective player-eye camera or a saved external view. Shared presentation uses deterministic movement states rather than a generic forward-stride loop.

**Tech stack:** Existing React/Vite, Three.js, React Three Fiber, drei, Node tests and installed Blender 5.2. No new dependencies or paid services.

**Spec:** `docs/superpowers/specs/2026-09-06-shared-3d-players-and-rinks-design.md`; `docs/art/animation-pack/STANDARD.md`.

## Global constraints and rulings

- Owner said "Okay, go" after the shared requirements. Proceed with reversible implementation and verification, without another planning approval loop.
- Working defaults for the unselected details: smooth surfaces, three age stages (U7-U9 young, U11-U13 youth, U15-U18 older); first-person look-around stays anchored to the selected actor; tactical view is optional. These can be revised after actual visual review.
- Work in the current main checkout under the repository's explicit main-workflow direction. Preserve existing unrelated WIP. Snapshot touched files before editing; commit only owned clean-baseline paths or explicitly isolate owned hunks.
- Capture visual candidates as candidates. Neither procedural meshes, an exported GLB nor a passing software test automatically earns production-art or hockey-coach acceptance.
- Do not change questions, answer keys or physics coordinates to make a render appear plausible. A missing required action trace is reported, not hidden.
- No new gameplay, pricing, auth, data-storage or training work.
- The existing rink remains the shared 3D geometry source; camera/model changes must not move its landmarks.

## Task 1: Shared player family and uniform contract

**Own:** `src/one-on-one/hockeyPlayerRig.js`, new `src/visuals/characterPresentation.js`, corresponding focused tests, optional local asset-export tooling under `tools/blender/`.

**Produce:** `resolveCharacterStage(ageBand)` returns `young`, `youth` or `older`; `buildHockeyPlayerRig({goalie, colour, number, showStick, ageBand, stage})` retains `group` and `dispose()` and exposes `applyPose(pose)` for task 2. `pose` is deterministic presentation data; the factory never owns world translation, facing or puck state.

- [ ] Add tests for stage mapping, solid jersey/helmet material matching, finite model bounds, independent per-instance posing and disposal. Example: `assert.equal(resolveCharacterStage('U7'), 'young'); assert.equal(resolveCharacterStage('U18'), 'older')`.
- [ ] Run the new Node test before implementing; confirm the intended missing behavior fails.
- [ ] Implement distinct proportions and equipment fits, readable faces/cages and articulated motion capability. Retain handedness and world anchor conventions. Remove contrasting jersey bands; preserve semantic team distinction and neutral equipment details.
- [ ] Verify both colors and all stages, skater and goalie, with actual rendered front/side/overhead/player-eye proof. Export editable model candidates if the current tooling supports faithful export; record source and hashes.
- [ ] Report any body/art quality limitation as open, with the actual render.

## Task 2: Deterministic hockey movement and shared actor integration

**Own:** new `src/visuals/playerMotion.js`, `playerMotion.test.mjs`, `src/one-on-one/ScenarioSkater.jsx`, `src/one-on-one/Skater.jsx`.

**Produce:** `samplePlayerMotion({actor, time, previousActor, delta})` gives a repeatable pose with mode, phase, stride, backward, turn, lean, lookYaw and action data. Coordinate with task 1 on the exact `applyPose` fields before joint implementation. `actor.motion` may explicitly define the action phases; velocity/facing may support conservative direction classification, not invent puck contact.

- [ ] Write failing tests for forward travel, backward defending, lateral movement, explicit glide, a prepared rim-pickup turn, paused/replayed time and non-finite input.
- [ ] Implement motion classification independent of team/role. An unspecified stationary/gliding actor must not churn. Explicit preparation precedes pickup; no automatic right-answer cues or movement beyond the source trace.
- [ ] Connect the shared rig to the actual frame time and actor metadata, preserving world position/facing ownership and existing prop compatibility.
- [ ] Replace the duplicate practice actor implementation with the shared adapter where compatible. Preserve no-stick behavior, labels, focus and goalie handedness requirements.
- [ ] Verify no mutation of scenario state, no cumulative pose drift on replay and no per-frame geometry allocation.

## Task 3: Optional question starting view and true player-eye camera

**Own:** `src/visuals/ScenarioCamera.jsx`, `ScenarioRinkView.jsx`, `ScenarioRink3D.jsx`, `CameraViewControls.jsx`, new pure camera contract/helper and focused tests. Coordinate any shared new props with root.

**Produce:** optional `startingView` and stable question identity at the shared scene boundary. A saved view selects a preset, explicit external perspective view or `{type:'first-person', actorId, ...}`. Absence preserves existing behavior. Export parsing/resolution helpers for root's authoring preview.

- [ ] Write failing tests for saved view resolution, missing/invalid observer, coordinate/facing conversion, question-entry reset versus ordinary rerender, no saved setting, and external/first-person projection switching.
- [ ] Add a true perspective camera for player-eye/external perspective modes. Keep player-eye position tied to the actor with independent look direction; render readiness must follow the configured view.
- [ ] Apply saved view on question entry/re-entry. Do not reapply it on every state update or learner adjustment. Preserve separate playback and answer controls.
- [ ] Add actual camera options and actor selection to the shared controls, with reversible return to broadcast/overhead. Prevent controls from altering scene state. Hide the camera-intersecting own model as needed, without hiding other players or disclosing answers.
- [ ] Verify both default and configured paths; include question transitions, resize, retry, look-around and camera reset.

## Task 4: Integration, inspectable proof and coverage

**Root owns:** adapter inventory, authored local demonstration, entry point for a real browser proof, age/motion/camera metadata preservation, integration with dirty-baseline consumers as narrowly as possible, test/build evidence and design/task updates.

- [ ] Inventory each use of shared rigs, scene wrappers and camera controls. Record support/remaining gaps for connected reads, animated plays, source scenes, Coach Lab, guided practice, rink discovery, gym and recall.
- [ ] Build an inspectable local proof using the actual shared renderer and accepted new interfaces: age/color switch, tactical/character display where supported, first-person observer switch, question starting-view demo, forward/backward/glide and rim-pickup examples. Clearly label motion examples and unreviewed teaching content.
- [ ] Verify deterministic saved-view restoration, no answer/state changes from camera actions, solid matching colors, age proportions and readable first-person cues.
- [ ] Run targeted Node tests and production build, then actual browser checks at phone and desktop widths. Check errors, context loss/retry, timeline pause/seek and relevant UI overlap. Record physical-iPad testing as pending unless actually performed.
- [ ] Independently review task diffs and final integrated behavior. Repair load-bearing findings before claiming completion.
- [ ] Commit only scoped owned changes. Record what is implemented versus candidate/remaining. Do not describe one proof scene as a completed all-scenario physics or production-character migration.

## Execution ledger

- Preflight: current main checkout contains substantial existing WIP; owned base files for rig and camera are currently clean. Blender 5.2 is installed. Existing Three/R3F stack is present. No new dependencies needed.
- In progress: baseline snapshots and targeted tests, followed by the three bounded implementation lanes.


## Resumed implementation result

- User pause honored; all agents interrupted. Resumed only after explicit owner instruction.
- Tasks 1-3 have tested local implementations; Task 1 remains an art candidate, not final sculpture/weights or accepted hockey clips. Task 4 local lab, consumer bridges, browser proof and build are implemented.
- Ruling: preserve existing unrelated WIP and keep this below-reference candidate out of deployment. Do not sweep prior untracked consumers into the core commit.
- Ruling: absent authored velocity never authorizes inferred skating. Saved camera entry is separate from playback; an unsaved next question returns to an external preset.
- Ruling: root-plus-age eye camera with independent look is currently explicit; exact posed eye socket and first-person own hands are later asset work.
- Final local checks: 102 targeted tests passed; production build passed; actual desktop/phone camera and model renders inspected. Render readiness now follows the configured camera scene render.
- See docs/art/animation-pack/2026-09-06-implementation-review.md for exact coverage, source manifests and outstanding acceptance work. Unchecked art/corpus items above remain open.
