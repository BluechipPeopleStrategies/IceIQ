# Blender player production and interactive review

Status: working implementation and editable art candidates. Production character art and hockey-motion acceptance are open.

## Ownership and file flow

Blender is the editable source for the finished character: body topology, face, fitted hockey equipment, skeleton, skin weights, materials and animation clips. Export GLB for the existing Three/React Three Fiber renderer. Keep the native source, exported asset and source hash together. An exported procedural rig is editable, but is not evidence of a finished sculpt.

Moshey's current BlueChip brief is for Remotion animation and transparent overlays. Use a separate RinkReads brief if assigning it hockey work. Its useful role here is repeatable motion/camera review videos from the same assets, with frame-controlled timing. The interactive application remains responsible for question entry, camera manipulation, playback, answers and source-state preservation. Do not import BlueChip's branding, vertical-video constraints or publishing workflow into this product.

Current editable candidates live in `tmp/shared-3d-20260906/player-candidates/`. The `manifest.json` records GLB hashes and exact source snapshots; `blender/verification.json` records native-file hashes, skeleton counts and native reopen verification. `blender/age-family-review.blend` is an inspection stage, not an accepted player master. The 12 individual files cover three ages, two teams and skater/goalie variants. The only exported clip is explicitly an inspection head scan, not accepted skating.

## First finished character

Finish one youth skater before deriving the full family. Review the youngest rounded variant alongside it so age progression is deliberate rather than uniform scaling.

- Replace slab shoulders and boxlike torso with continuous fitted clothing over rounded shoulder pads, a believable chest/waist and natural arm transitions.
- Preserve a readable face behind a complete youth cage. The youngest needs a friendly expression and larger head/eyes; the older character needs regular athletic features.
- Keep solid gold jersey/gold helmet and solid navy jersey/navy helmet. Use the same body and material slots for both teams. Neutral equipment must not overwhelm team recognition.
- Keep actual stick handedness, two hand contact, equipment attachments, plausible knee bend and consistent skate contact. Do not fix a pose by moving the camera or mirroring the player.
- Separate presentation proportions from scenario coordinates and camera controls. Refit equipment and eye anchors for each age; do not stretch an exported character indiscriminately.

The September 6 render corrected flattened normals and head/torso yaw direction. Smooth helmets, faces and sleeves now survive export. Root inspection still found the default torso and shoulders below the supplied references. A separate `rounded-study` finish replaces the slab shoulders and stacked torso with continuous curved geometry. Its 12 GLBs, native Blender files and source manifest live in `tmp/shared-3d-20260906/rounded-study/`. The review lab defaults to this study; the shared production factory does not. Root inspected both renders: the rounded silhouette improves, while equipment transitions and facial expression still need refinement.

## Review from the views used by questions

Inspect front, rear, both profiles, both three-quarter views, overhead, rink-side and player-eye views. Test the same world pose while moving only the camera. Viewpoint must change apparent size, silhouette, overlap and visibility without changing the player's position, handedness, body heading or puck state.

In player-eye view, inspect nearby pressure, distant teammates, sticks, goalie coverage and puck visibility at actual desktop and narrow-screen sizes. Own head/body and camera-intersecting sleeves are hidden; the observer retains actual world-anchored gloves and stick from the shared rig. Raised finger pads and thumb contours are visible in the reviewed phone/desktop view. Player-eye view uses age-dependent eye height, full boards and a neutral 3D enclosure with walls, stands, roof and beams. This replaces the dark void seen in the earlier phone review, but is not Sense Arena art parity. The current eye camera is anchored to the actor root with independent look direction; it does not track the deformed eye socket or automatically follow authored head scans.

Optional X/O presentation belongs to external tactical views. First-person continues to show real character bodies so learners can read hockey cues. Changing presentation does not change team, actor IDs or question answers.

## Motion authoring

Create and review clips for ready stance, glide, forward pushes, backward C-cuts, lateral movement, edge turns, pivots, stopping, head scans and action-specific preparation/contact/recovery. A rim pickup must be reviewed as a complete approach/turn/contact/exit sequence with the authoritative puck trace. Generic skating cannot certify it.

The runtime pose sampler uses source time, source velocity/facing and explicit motion metadata. It must reproduce the same pose at the same timestamp after playing, pausing, seeking or replaying. Missing velocity does not authorize invented strides. Existing scenarios still require authored and reviewed motion traces; shared support does not establish catalog-wide physical realism.

## Question camera contract

`startingView` is optional. Supported forms are:

```js
{type: 'preset', preset: 'overhead'}
{type: 'perspective', position: [8, 2.2, -16], target: [0, 1, -16], fov: 70}
{type: 'first-person', actorId: 'N1', lookYaw: 0, lookPitch: 0, fov: 70}
```

External coordinates are Three world metres `[rinkY, height, -rinkX]`; look angles are radians. Bind the entry to `questionId` and optional `questionEntryToken`. Apply the saved view once on entry/re-entry. Ordinary rerenders and playback must not reset the learner's adjustment. A question without a saved view returns to a normal external preset instead of inheriting another question's player-eye observer. An explicitly configured missing observer is an error, not permission to show a different player's view.

The local review page can capture an external perspective or player-eye look and restore it as a question's start. Adjusted orthographic cameras are not saved as exact arbitrary views; broadcast/overhead use named presets. The review page does not publish changes to question banks.

Readiness now follows a one-shot `scene.onAfterRender` for the configured camera. Wrong-camera renders do not unlock the question; cleanup cancels stale readiness and preserves prior render hooks. This confirms a scene render, not GPU completion or successful display on every device. Verify actual rendered output and availability behavior independently.

## Reproduce the local assets and proof

From the IceIQ root:

```powershell
node tools/blender/export-player-candidates.mjs
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --python-exit-code 1 --python tools/blender/import-player-candidates.py -- "$PWD\tmp\shared-3d-20260906\player-candidates"
npm run dev -- --host 127.0.0.1 --port 5198
```

Open `/player-lab.html` on that local server. The page uses the actual shared rink, camera and player implementation. It is a development review entry and is not part of the normal production bundle.

Review gates remaining: final character sculpture/weights, complete skating and puck-contact clips, cue readability for real graded questions, scenario-by-scenario trace coverage, physical tablet testing and a coherent release verification against the repository's other in-progress changes.
