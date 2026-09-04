# Blender 3D Renderer Integration Plan

**Date:** 2026-09-04
**Scope:** Implementation scoping only. This document plans a Blender/glTF/Three renderer as a presentation upgrade for the existing RinkReads scenario layer. It does not implement the renderer, add dependencies, or change package configuration.

## Goal

Add a Blender-authored, mobile-safe 3D rink renderer beside the current SVG `RinkStage.jsx`, while preserving the existing scenario data, validation, scoring, primitive contracts, and scenario-factory content pipeline.

The 3D track must not become the scenario-content scale answer. The 2026-09-04 scale diagnosis found the current bottleneck is approved tactical-claim and kernel/template authoring, not rendering. This plan therefore treats 3D as an alternate presentation layer over the same `ScenarioDefinition` / `CompiledTeachingPlay` and current flat `Scenario` data.

## Existing Contracts To Preserve

- `src/scenario/schema.js` owns the current flat `Scenario` shape. Actor coordinates are normalized `0-1`, with `x` left-to-right across the rink and `y` top-to-bottom.
- `src/scenario/ScenarioRenderer.jsx` validates a scenario, handles prompt/timer/preview-lock/reaction-time state, selects a primitive from `src/scenario/registry.js`, and renders it inside `RinkStage.jsx`.
- `src/scenario/RinkStage.jsx` wraps the legacy `RinkReadsRink.jsx` SVG board and provides the primitive layer with a coordinate helper that converts pointer events back to normalized `0-1` rink coordinates.
- `src/scenario/primitives/*-scorer.js` modules are the correctness authority for the four primary interactions: point, path, selection, and sequence. Current registry also includes `place`; it should be handled after the four primary primitives if any active scenarios require 3D parity.
- `src/scenario/zones.js` maps semantic zone IDs to normalized `0-1` centers and tolerances. Numeric coordinates win when supplied.
- `src/scenario/youngRink.js` owns U7/U9 half-ice rendering policy. The 3D renderer must use the same `levelsOf()` and `rinkRenderFor()` result as the 2D renderer.
- `src/OverlayLayer.jsx` establishes the cue rule: never color alone. Arrows, shapes, labels, rings, dashes, and glyphs must carry meaning even when hue is unavailable.
- `docs/superpowers/specs/2026-07-29-scenario-engine-design.md` says `ScenarioDefinition`, `SimulationTrace`, `DecisionEvaluation`, and `CompiledTeachingPlay` are renderer-independent artifacts. A 3D renderer consumes them or a compatible adapter output; it does not fork the data model.

## Non-Goals

- Do not replace `RinkStage.jsx` or the current SVG renderer.
- Do not create a 3D-only scenario schema.
- Do not duplicate or rewrite scoring logic.
- Do not make Blender/Three a prerequisite for scenario generation, tactical validation, promotion, or throughput benchmarking.
- Do not pursue photorealistic hockey players, full arenas, crowd detail, dynamic cloth/net simulation, postprocessing, shadows-heavy lighting, or real-time game physics in this track.
- Do not upgrade React as part of the first 3D renderer unless Thomas approves that as a separate dependency project.

## Architecture

### Recommended Shape

Introduce a renderer choice at the stage boundary:

- Keep `ScenarioRenderer.jsx` as the owner of validation, timers, preview locks, scan windows, result cards, reaction-time logging, and primitive selection.
- Add `Scenario3DStage.jsx` as a sibling of `RinkStage.jsx`.
- Add small shared adapter utilities under `src/scenario/renderers/` or `src/scenario/three/`:
  - `rink3dCoords.js`: normalized rink coordinates <-> Three world coordinates.
  - `rink3dCamera.js`: camera/frustum presets for `full`, `left`, `right`, and `neutral` views after `rinkRenderFor()`.
  - `rink3dActors.js`: actor kind -> mesh/glyph/label style mapping.
  - `rink3dInput.js`: raycast and plane-projection helpers.
- Add `ScenarioRenderer` mode selection later as a prop or feature flag, for example `renderer="2d" | "3d"`, defaulting to `"2d"` until parity is proven.

The important boundary is:

```text
ScenarioRenderer
  validates scenario
  owns timer/preview/result/onAnswer
  resolves primitive from registry
  chooses stage renderer
    RinkStage       -> SVG drawing/input surface
    Scenario3DStage -> WebGL drawing/input surface
  primitive scorer modules remain shared
```

The 3D renderer should initially consume the current flat `Scenario` object because that is what the existing player path already renders. When the v2 scenario-engine path is active, it should consume `CompiledTeachingPlay` through an adapter that exposes the same render-ready actor samples, interaction prompt, correct answer, and primitive contract. It must not retime or reinterpret load-bearing motion that belongs to `CompiledTeachingPlay`.

### Coordinate Mapping

Use the existing rink dimensions as the presentation scale:

- Current 2D board: `600 x 300` SVG units, representing `60 m x 30 m`.
- Three world space: use metres directly for clarity.
- Ice plane: `y = 0`.
- Length axis: world `x`, from `-30` to `+30`.
- Width axis: world `z`, from `-15` to `+15`.
- Vertical axis: world `y`, positive upward.

Mapping:

- Normalized to world:
  - `worldX = (x - 0.5) * 60`
  - `worldZ = (y - 0.5) * 30`
  - `worldY = 0`
- World to normalized:
  - `x = worldX / 60 + 0.5`
  - `y = worldZ / 30 + 0.5`

Do not bake `stage.view` into the coordinate transform. The normalized frame always represents the full canonical rink. `stage.view`, U7/U9 half-ice policy, and neutral-zone crop affect camera framing, visible bounds, and optional input acceptance, not the scenario's stored coordinates.

For U7/U9, `rinkRenderFor(stage, levelsOf(scenario))` still decides `view` and `hideZoneLines`. The 3D renderer must draw the half-ice view from that result, not from `scenario.stage.view` alone.

### Tap And Drag Projection

The 3D canvas needs an invisible input plane that exactly matches the canonical ice plane. Pointer work should follow this path:

```text
browser pointer event
  -> R3F/Three raycaster
  -> intersect invisible ice plane
  -> world point on y=0
  -> normalized 0-1 point
  -> existing primitive scorer input
```

Rules:

- If the ray misses the ice plane, ignore the event.
- If the ray hits outside the canonical rink bounds, either return the out-of-bounds normalized point to the scorer or ignore it consistently per primitive. Do not silently clamp for point/path scoring because current SVG scorers can receive off-target coordinates and mark them wrong. `place` may keep its existing clamped drag-token behavior because `place.jsx` already clamps token positions.
- Path drawing should sample pointer moves on the plane and pass the resulting normalized point list to `scorePath()`.
- Selection and sequence should prefer actor hit meshes with `userData.actorId`, then pass actor IDs to `scoreSelection()` / `scoreSequence()`.
- Point should pass one normalized `{ x, y }` to `scorePoint()`.
- Any `CompiledTeachingPlay` playback samples should be adapted into world positions with the same normalized/world adapter. The renderer does not derive new tactics or scoring from animation.

### Primitive Logic Sharing

The current primitive React components are SVG-specific, but their correctness logic is already separated into pure scorer modules. The 3D implementation should preserve a single correctness path:

- Reuse `scorePoint()` from `point-scorer.js`.
- Reuse `scorePath()` from `path-scorer.js`, including defender interception checks.
- Reuse `scoreSelection()` from `selection-scorer.js`.
- Reuse `scoreSequence()` from `sequence-scorer.js`.
- Reuse `resolveTarget()` and `ZONES` from `zones.js`.
- Reuse `levelsOf()` and `rinkRenderFor()` from `youngRink.js`.

If interaction UI state begins to duplicate too much SVG logic, refactor before parity work continues:

- Extract renderer-neutral interaction controllers or reveal-planning helpers into plain `.js` modules.
- Keep renderer-specific files responsible only for drawing and pointer projection.
- Avoid a second independent registry of "3D primitives" with different behavior. If the registry grows, each primitive entry should still expose one kind, one scorer, and renderer-specific view adapters behind that entry.

### Integration Point

The least disruptive integration point is a feature-flagged renderer prop in the existing `ScenarioRenderer` path:

- `ScenarioRenderer` keeps default `renderer="2d"`.
- In prototype routes or dev-only surfaces, pass `renderer="3d"`.
- Later, if 3D earns parity, a user-facing toggle can switch between 2D and 3D for eligible scenarios.
- If WebGL initialization fails or the device is below the performance bar, automatically fall back to `RinkStage`.

Do not route 3D through `RinkReadsRink.jsx`. That file remains the legacy v2/SVG board and a visual comparison source, not the owner of 3D rendering.

## Blender Asset Pipeline

### What To Model First

Keep the asset set deliberately small and stylized.

**Rink surface**

- One low-poly ice mesh matching the canonical `60 m x 30 m` rink footprint.
- Rounded corners, boards outline, goal lines, blue lines, center red line, faceoff dots, and simple creases.
- Use simple materials or vertex colors for lines where possible. Avoid image textures unless the line work becomes too expensive as geometry.

**Boards and glass**

- Low-poly boards as simple extruded strips around the rink.
- Glass as a few transparent planes with low opacity.
- Boards/glass must be toggleable because they can occlude tactical reads on a mobile top-down/angled camera.

**Goals**

- Simple low-poly goal frames at the canonical goal-line positions.
- Netting should be simplified as a translucent plane or very low-detail grid. Avoid modeled net mesh in the first pass.

**Player and puck markers**

- Do not model full hockey players for v1.
- Use readable tactical markers:
  - player: raised disc/capsule with double ring and "YOU" label.
  - teammate: raised disc/capsule with team label/tag.
  - defender: dark disc/capsule with an X shape or crossed bars.
  - goalie: square/block silhouette or pad-like block.
  - puck: small black cylinder/disc.
- Labels should be rendered at runtime as DOM/billboard labels where possible, not baked into each mesh. That keeps assets reusable for `tag`, `label`, age style, and localization.

**Cues**

- Route/path: raised line or tube on the ice with arrowhead.
- Target: flat ring/ellipse on the ice, dashed where possible.
- Correct/wrong: check/X glyphs or DOM labels, never only green/red material changes.

### Export Settings

Use glTF binary `.glb` as the runtime export format.

Recommended Blender working conventions:

- Units: metres.
- Rink source dimensions: `60 x 30`.
- Origin: center ice.
- Apply transforms before export.
- Keep object names stable and semantic: `rink_surface`, `boards`, `glass`, `goal_left`, `goal_right`, `anchor_center`, `anchor_left_goal`, `anchor_right_goal`.
- Include four or more small anchor empties or marker objects for validation: center ice, left goal line, right goal line, top boards, bottom boards. The implementation can load the GLB and verify that those anchors match the coordinate adapter.
- Export only selected runtime objects, not lights/cameras unless there is a specific reason.
- Materials: simple PBR or unlit materials. Prefer flat color/vertex color. Avoid high-cost reflections.
- Geometry: triangulate on export or ensure Blender's glTF export produces stable geometry.
- Animations: none for v1. Runtime scenario motion comes from scenario data / `CompiledTeachingPlay`, not Blender animation clips.

Recommended export options:

- Format: `glTF Binary (.glb)`.
- Transform: apply modifiers and transforms; preserve real-world scale.
- Textures: embed only if needed; prefer no textures for prototype.
- Texture dimensions: maximum `1024 x 1024` for a shared atlas; `512 x 512` preferred. Avoid separate normal/roughness/emissive maps in v1.
- Compression: do not use Draco for the first prototype unless the uncompressed GLB exceeds the budget below. Draco can reduce mesh transfer size, but it adds decoder setup and client-side decode work. For a low-poly rink, the decode cost may not be worth it.

If Draco is used later:

- Use glTF Draco compression only for static geometry.
- Copy the matching Three Draco decoder files into a local public path such as `public/assets/3d/draco/`.
- Configure the loader to use that local decoder path. Do not depend on a remote decoder CDN for the app runtime.
- Re-copy decoder files whenever `three` is upgraded so the loader and decoder remain compatible.

### Repo Locations

Runtime assets:

- `public/assets/3d/rink/rink-lowpoly.glb`
- `public/assets/3d/rink/rink-lowpoly.manifest.json`
- `public/assets/3d/markers/marker-pack-lowpoly.glb`
- `public/assets/3d/draco/` only if Draco is adopted

Source assets:

- Keep `.blend` source files out of `public/`.
- Preferred repo path for small, non-sensitive source files: `assets/blender/rinkreads-rink-lowpoly.blend`.
- If `.blend` files become large or iterative, store them outside the repo and commit a manifest in `docs/factory/assets/` that records filename, hash, authoring date, export settings, and exported GLB hash. Do not let large binary source churn dominate normal app commits.

### File-Size Budget

The current app has no 3D dependencies. `package.json` only lists runtime dependencies on React, React DOM, and Supabase; Vite currently manual-chunks React, React DOM, Supabase, and a generic vendor chunk.

Mobile budget for the first 3D path:

- First prototype GLB rink: target `<= 250 KB`, hard cap `400 KB`, no Draco.
- Marker pack GLB: target `<= 100 KB`, hard cap `150 KB`.
- Any texture atlas: target `<= 256 KB`, hard cap `512 KB`; maximum dimensions `1024 x 1024`.
- Total 3D runtime asset transfer for first load of a 3D scenario: target `<= 700 KB`, hard cap `1.0 MB`.
- Total added JavaScript for the lazy 3D route/chunk after gzip: target `<= 250 KB`, hard cap `350 KB`.

If the prototype cannot stay near those numbers with stylized assets, stop and reassess before adding interaction parity.

## Runtime Dependencies

### Current App Baseline

Current runtime dependencies in `package.json`:

- `react@^18.2.0`
- `react-dom@^18.2.0`
- `@supabase/supabase-js@^2.103.0`

Current build tooling:

- Vite 5
- `@vitejs/plugin-react`
- Terser minification
- Rollup manual chunks for React, React DOM, Supabase, and other vendor code

No Three/WebGL dependency exists today.

### Recommended Package Set

Because the app is currently React 18, do not install the latest React Three Fiber major line blindly.

Recommended future install for a React 18 implementation:

```bash
npm install three@^0.185.1 @react-three/fiber@^8.18.0 @react-three/drei@^9.122.0
```

Dependency notes:

- `three` is the core WebGL/rendering library.
- `@react-three/fiber` provides the React renderer and `<Canvas>`.
- `@react-three/drei` is optional but practical for `useGLTF`, `<Html>`, helper controls, and preload utilities. Use it narrowly.
- `GLTFLoader` does not require a separate npm package. It comes from `three/addons/loaders/GLTFLoader.js`.
- `DRACOLoader` also comes from `three/addons/loaders/DRACOLoader.js`; the decoder files are static runtime assets if Draco compression is enabled.

React compatibility warning:

- Current `@react-three/fiber@9` pairs with React 19, not this repo's current React 18 app.
- Current `@react-three/drei@10` is the matching modern line for newer React/R3F stacks.
- Upgrading to React 19 is a separate project and should not be hidden inside the 3D renderer milestone.

### Bundle And Runtime Cost

Numbers to plan around before measurement:

- `three@0.185.1` package metadata reports about `23.17 MB` unpacked. Its CDN minified module build is about `357 KB` before gzip. Vite tree-shaking may reduce or reshape the actual chunk, but Three is still the dominant JavaScript cost.
- `@react-three/fiber@8.18.0` npm page reports about `423 KB` unpacked. Its runtime contribution is much smaller than Three, but still likely tens of KB after gzip.
- `@react-three/drei` is broad. The package exposes many helpers and has many dependencies. With careful ESM/named imports, a small `useGLTF`/`Html` subset should not pull the entire helper library, but this must be verified with the Vite build output. Avoid importing convenience features such as environment presets, heavy text systems, postprocessing, physics, or controls unless needed.
- Draco can reduce GLB mesh transfer size, but adds decoder JavaScript/WASM transfer and decode CPU time. For sub-400 KB low-poly assets, skip it until measurement proves it helps.

Required implementation guardrails:

- Lazy-load the 3D renderer so the main 2D app route does not pay the Three/R3F cost.
- Keep Three/R3F/Drei in their own vendor chunk if Vite's current generic vendor chunk does not split them cleanly.
- Run `npm.cmd run build` after dependency installation and record:
  - new chunk names,
  - raw sizes,
  - gzip sizes if Vite reports them,
  - whether the 2D-first route now pulls the 3D chunk.
- Add a small script or manual check that fails the 3D rollout if the 3D code lands in the initial app bundle by accident.

Mobile runtime targets:

- Use `frameloop="demand"` for static/read-only/tap states.
- Switch to continuous rendering only during animation or active drag, then return to demand rendering.
- Use `dpr={[1, 1.5]}` on mobile unless testing proves `2` is safe.
- Disable postprocessing, dynamic shadows, environment maps, reflections, and expensive transparent layers in v1.
- Target fewer than `15,000` triangles and fewer than `100` draw calls in the first interactive prototype.
- Acceptance target: stable `>= 30 fps` on a representative mid-range mobile device during drag/path interaction; `60 fps` is nice but not the gate.
- Provide a WebGL failure fallback to the existing 2D `RinkStage`.

## Accessibility And Interaction Parity

### Visual Cue Rules In 3D

3D must keep the existing "never color alone" rule:

- Player identity: double ring plus "YOU" label, not just blue.
- Teammates: round marker plus tag/label.
- Defenders: X/cross shape or striped/dark marker, not just black/red.
- Goalies: square/block silhouette plus "G" label.
- Puck: small disc with high-contrast outline.
- Correct target: dashed ring/ellipse plus label or glyph.
- Wrong pick/path: X glyph and/or dashed reveal, not just red.
- Correct pick/path: check glyph and/or solid reveal, not just green.
- Movement/read: arrowhead plus dashed route/tube and label where needed.

Labels should stay crisp on mobile. Prefer DOM labels projected over the canvas or Drei `<Html>` labels for prompt-critical text. Do not rely on small 3D text meshes for tactical meaning in the first pass.

### DOM Accessibility

The current prompt, hint, timer, result, feedback, and read-aloud surfaces are DOM. Preserve that.

Canvas accessibility limits are real:

- A WebGL canvas is not a good screen-reader interface by itself.
- Keep the 2D renderer as fallback and parity reference.
- For selection and sequence, expose candidate actor labels as DOM buttons or an equivalent keyboard/screen-reader path if those interactions become user-facing in 3D.
- For point/path drawing, document the remaining keyboard accessibility gap before enabling 3D as the default. A coordinate-based keyboard alternative is possible but should not be invented casually.

### Primitive Translation

**Point**

- Raycast pointer tap to the ice plane.
- Convert hit point to normalized `{ x, y }`.
- Call `scorePoint(userPoint, correct)`.
- Reveal target as a ring/ellipse on the ice after answer, using the same normalized tolerance semantics. Because the scorer measures normalized distance, a visible target may need non-square scaling in world space just as SVG uses an ellipse.

**Path**

- Start only when pointer down begins within the same normalized start-ring radius used by the 2D primitive.
- Sample pointer move hits on the ice plane into a normalized point list.
- Call `scorePath(userPath, correct, { defenders })`.
- Draw the user's path as a line/tube on the ice, with the same verb styling concepts: skate/carry/pass/shoot/screen/check/backcheck.
- Preserve defender interception feedback by highlighting `intercepterId`.
- This is the hardest interaction because camera angle, pointer raycasting, touch sampling, and path smoothing all affect perceived accuracy.

**Selection**

- Add invisible or slightly larger hit meshes around candidate actors.
- Pointer/touch on actor mesh yields `actor.id`.
- Call `scoreSelection(pickedIds, correct.ids, { ordered: interaction.order === "ordered" })`.
- Reveal chosen-correct, chosen-wrong, and missed-correct with rings/glyphs/labels.
- Provide DOM candidate buttons before default release if keyboard/screen-reader parity is required.

**Sequence**

- Same actor hit-target mechanism as selection.
- Maintain ordered picks in `ScenarioRenderer`/primitive state, then call `scoreSequence(pickedIds, correct.ids)`.
- Draw numbered badges as DOM or billboards over selected actors.
- Preserve reset/progress UI as DOM, not tiny in-scene text.

**Place**

- Current registry includes `place` even though the prompt names four primary primitives. Do not make 3D default for scenarios that use `place` until it has parity.
- When scoped, reuse `scorePlace()` and `revealPlan()`.
- Drag tokens across the same ice-plane raycast adapter.
- Keep target reveal semantics from `place-reveal.js`: the target is the answer, never the error.

### Timer, Preview, And Scan Windows

The 3D renderer must support existing cognitive-training props:

- `preview.lockMs`: 3D interactions are visually readable but non-interactive until the lock lifts. Reaction-time clock remains owned by `ScenarioRenderer`.
- `timer.duration`: timer stays DOM and locks the 3D primitive through the same `locked` prop.
- `scanWindow`: hide actor kinds after `showMs` just as `RinkStage` filters visible actors.

## Staged Build Plan

### Milestone 1: Static 3D Read-Only Prototype

**Goal:** Prove Blender -> GLB -> Vite static asset -> R3F Canvas -> normalized actors on a rink.

**Files expected in implementation:**

- Create `public/assets/3d/rink/rink-lowpoly.glb`.
- Create `public/assets/3d/rink/rink-lowpoly.manifest.json`.
- Create `src/scenario/three/rink3dCoords.js`.
- Create `src/scenario/three/Scenario3DStage.jsx`.
- Create a dev-only route or story surface that renders one known flat `Scenario` with `Scenario3DStage`.
- Modify `ScenarioRenderer.jsx` only if a renderer flag is needed for the prototype; otherwise keep the prototype isolated.

**Acceptance:**

- One existing scenario renders the rink, goals, actor markers, puck, labels, and zone/end orientation in 3D.
- No scoring or interaction yet.
- 2D scenario rendering remains unchanged.
- 3D is lazy-loaded or isolated so normal routes do not load Three.
- Mobile portrait and desktop screenshots show non-overlapping labels and a readable tactical picture.
- WebGL unsupported path falls back to 2D or a clear non-crashing message.

**Effort:** 1-2 focused sessions if a simple GLB is ready; 2-3 days if Blender setup and export conventions are being learned at the same time.

### Milestone 2: Coordinate, Camera, And Visual Parity Harness

**Goal:** Lock the adapter before interaction work depends on it.

**Files expected in implementation:**

- Expand `rink3dCoords.js` with round-trip helpers and view-bound helpers.
- Add a small test file for normalized -> world -> normalized round trips.
- Add camera presets for `full`, `left`, `right`, and `neutral`.
- Add U7/U9 camera behavior using `rinkRenderFor()`.
- Add a visual test fixture with actors at corners, goal lines, slot, half-wall, and neutral-zone positions.

**Acceptance:**

- Round-trip coordinate error is `<= 0.005` normalized units for representative points.
- Zone centers from `ZONES` land visibly where the 2D renderer would put them.
- U7/U9 scenarios show half-ice and suppress blue/neutral-zone markings in the same cases as 2D.
- Boards/glass can be hidden if they block the read.
- Vite build output records actual 3D chunk sizes after dependencies are installed.

**Effort:** 1-2 days.

### Milestone 3: Tap-Based Interaction Parity

**Goal:** Make point, selection, and sequence work in 3D through the existing scorers.

**Files expected in implementation:**

- Add 3D input helpers for raycast-to-rink normalized coordinates.
- Add renderer adapters for point, selection, and sequence.
- Keep prompt, hint, timer, preview lock, result card, and feedback in `ScenarioRenderer`.
- Add regression tests for scorer calls and answer payload shape.
- Add mobile touch tests for tap accuracy.

**Acceptance:**

- Point answers call `scorePoint()` with normalized coordinates.
- Selection answers call `scoreSelection()` with actor IDs.
- Sequence answers call `scoreSequence()` with actor IDs in order.
- `onAnswer` payloads match the 2D path closely enough that reaction-time logging and result cards need no special 3D branch.
- Colorblind-safe reveal channels are present in each interaction.
- DOM or fallback controls exist for selection/sequence if 3D is exposed beyond a dev prototype.

**Effort:** 2-4 sessions, likely 2-3 days with testing.

### Milestone 4: Path Drag Parity

**Goal:** Bring the hardest current primitive into 3D without changing `scorePath()`.

**Files expected in implementation:**

- Add 3D path drawing adapter.
- Add normalized start-ring logic shared with the 2D constant or extracted to a plain helper.
- Add sampled path smoothing/rendering for visual feedback.
- Add defender interception highlight using `intercepterId`.
- Add touch-drag tests on mobile viewport.

**Acceptance:**

- Drag must start only near `interaction.from`.
- User path samples are normalized and passed to `scorePath()` unchanged.
- Correct/off-target/intercepted outcomes match 2D for golden fixtures.
- Path rendering remains readable at the chosen camera angle.
- Drag feels stable on mobile: no lost pointer capture, no jumpy projection, no accidental scroll.

**Effort:** 3-5 days.

**Riskiest milestone:** Milestone 4. It combines camera perspective, raycast projection, mobile pointer events, path smoothing, and scorer tolerance. If this feels inaccurate, users will blame the hockey answer even when the scorer is correct.

### Milestone 5: Full Scenario Renderer Gate And Optional Place Parity

**Goal:** Decide whether 3D can be available to real users for a narrow scenario set.

**Files expected in implementation:**

- Add renderer eligibility checks.
- Add fallback logic per scenario/primitive/device.
- Add `place` parity only if required for the scenario set Thomas wants in 3D.
- Add visual QA fixtures and Playwright screenshots for desktop and narrow mobile.
- Add bundle/perf budget reporting.

**Acceptance:**

- 3D is enabled only for primitives that have parity.
- Unsupported primitives automatically use 2D.
- Test and manual playtest gates compare the same scenario in 2D and 3D.
- The 3D path does not degrade first load of the default 2D app.
- Thomas can review a small set of 3D-enabled scenarios before any broader release.

**Effort:** 2-4 days, depending on whether `place` is included.

### Later: CompiledTeachingPlay Playback

Once the scenario-engine compiled playback path is active, add a separate milestone:

- Consume `CompiledTeachingPlay` samples/keyframes directly.
- Do not retime motion in the renderer.
- Compare 2D/3D/video-export playback against the same compiled artifact.
- Keep this separate from the flat-scenario interaction parity work so the 3D renderer does not become a blocker for content generation.

## Testing And Verification Plan For Implementation

Use `npm.cmd` on Windows, matching the repo guidance.

Future implementation should verify:

- Coordinate unit tests for `rink3dCoords.js`.
- Existing primitive scorer tests, or focused new tests that prove 3D adapters call the existing scorer modules.
- `npm.cmd run test:young-rink-view` for U7/U9 rendering policy.
- `npm.cmd run test:colorblind` or equivalent colorblind cue coverage after 3D cues are added.
- Relevant scenario primitive tests for point/path/selection/sequence/place as they gain 3D adapters.
- `npm.cmd run build` after dependencies are installed.
- Manual or Playwright visual checks:
  - desktop,
  - narrow mobile portrait,
  - 3D read-only,
  - each enabled primitive,
  - WebGL fallback.
- Bundle report:
  - initial route chunk sizes,
  - lazy 3D chunk sizes,
  - GLB/texture transfer sizes.
- Mobile performance pass:
  - static scene idle,
  - tap interaction,
  - path drag,
  - scanWindow hide,
  - result reveal.

Do not claim parity until 2D and 3D produce the same scorer outcomes on the same golden scenarios.

## Honest Risks And Stop Conditions

### Mobile Performance

Risk: Three, R3F, Drei, GLBs, textures, and WebGL context overhead may be too expensive for a mobile-first training app, especially if 3D leaks into the initial bundle.

Mitigation:

- Lazy-load 3D.
- Keep assets low-poly and texture-light.
- Use demand rendering.
- Cap DPR on mobile.
- Avoid postprocessing and shadows.

Stop condition:

- The normal 2D app pays the 3D JavaScript cost on first load.
- The lazy 3D chunk exceeds the hard budget without a clear path down.
- Representative mobile drag cannot stay around `30 fps`.
- WebGL context loss or battery/thermal behavior is bad enough that 2D feels materially better for the training job.

### Blender Learning Curve And Asset Churn

Risk: Asset production can quietly become the project. Scale, axes, materials, compression, source control, and visual iteration all add overhead.

Mitigation:

- Start with a rink and tactical markers only.
- Use stable named anchors in the GLB.
- Record export settings and hashes in a manifest.
- Avoid large `.blend` churn in normal app commits.

Stop condition:

- Each small visual change requires more than a day of Blender/export/debug work.
- The GLB source/export process cannot be repeated by Thomas or Claude without fragile manual steps.
- Asset files become too large for routine repo work.

### Interaction Projection Complexity

Risk: Taps and drags in a perspective 3D scene can feel imprecise, especially on mobile. The user may see one target but the raycast maps to a slightly different normalized point.

Mitigation:

- Use a constrained camera, likely orthographic or shallow perspective.
- Keep the input plane flat and invisible.
- Add debug mode showing projected normalized coordinates.
- Test full, left, right, neutral, and U7/U9 views.
- Keep the 2D renderer as fallback for hard interactions.

Stop condition:

- Point/path parity cannot meet a `<= 0.005` normalized adapter tolerance.
- Users repeatedly miss due to projection/camera ambiguity rather than hockey judgment.
- Path drag feels worse than the current SVG interaction.

### Maintaining Two Renderers

Risk: Every primitive, reveal rule, scan/timer behavior, age policy, and visual cue now has two drawing implementations.

Mitigation:

- Keep scoring and target resolution single-source.
- Extract renderer-neutral helper logic before duplicating behavior.
- Enable 3D per primitive only after parity.
- Keep 2D as canonical until 3D earns parity.

Stop condition:

- Bug fixes begin landing in one renderer but not the other.
- Adding a new primitive requires duplicating large amounts of state logic.
- QA time for two renderers blocks the more important content pipeline work.

### Accessibility Regression

Risk: Canvas content can reduce keyboard and screen-reader access even if colorblind visual rules are preserved.

Mitigation:

- Keep prompt, hints, timers, results, and feedback in DOM.
- Add DOM candidate controls for selection and sequence if user-facing.
- Keep 2D fallback available.
- Do not make 3D the default for interactions with no accessible fallback.

Stop condition:

- 3D cannot preserve the existing colorblind-safe cue rules.
- 3D becomes the only available path for a scenario interaction without an accessible fallback.

### Content Pipeline Distraction

Risk: The 3D renderer absorbs sessions that should be spent on tactical claims, kernels, parameter-space generation, and promotion gates.

Mitigation:

- Cap the first prototype at static read-only.
- Require a milestone review before interaction parity.
- Keep factory throughput work independent.

Stop condition:

- 3D work delays the scenario-engine Phase 9/10 path or tactical-claim authoring.
- The renderer is being used to imply content scale progress that has not actually happened.

## Recommendation

Proceed, but keep the scope tight:

1. Build one static read-only 3D scenario behind a dev-only flag.
2. Prove coordinate/camera parity and bundle isolation.
3. Add tap interactions before path drag.
4. Treat path drag as the real go/no-go for interactive 3D.
5. Keep 3D out of the default player path until bundle, performance, interaction, and colorblind/a11y checks pass.

The first prototype should answer one question only: can a low-poly Blender rink and runtime actor markers render the same scenario data clearly on mobile without pulling the 3D cost into the normal app? If yes, continue to tap primitives. If no, stop before building a second renderer surface that the app has to maintain.

## External References Checked

- Three.js GLTFLoader documentation: https://threejs.org/docs/#examples/en/loaders/GLTFLoader
- Three.js DRACOLoader documentation: https://threejs.org/docs/pages/DRACOLoader.html
- Three.js loading 3D models guide: https://threejs.org/manual/en/loading-3d-models.html
- Khronos glTF overview: https://www.khronos.org/gltf/
- Khronos glTF 2.0 specification: https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html
- React Three Fiber installation docs: https://r3f.docs.pmnd.rs/getting-started/installation
- React Three Fiber Canvas docs: https://r3f.docs.pmnd.rs/api/canvas
- React Three Fiber scaling/performance docs: https://r3f.docs.pmnd.rs/advanced/scaling-performance
- Drei `useGLTF` docs: https://drei.docs.pmnd.rs/loaders/gltf-use-gltf
- npm `three` package metadata: https://www.npmjs.com/package/three
- npm `@react-three/fiber@8.18.0` package metadata: https://www.npmjs.com/package/@react-three/fiber/v/8.18.0
- npm `@react-three/drei` package metadata: https://www.npmjs.com/package/@react-three/drei
