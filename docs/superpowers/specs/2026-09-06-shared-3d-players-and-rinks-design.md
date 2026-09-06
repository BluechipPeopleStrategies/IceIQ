# Shared 3D players and rinks

Date: September 6, 2026

Status: active design discussion, revised after Thomas's clarification. Planning and concept art only; no new model, animation clip, runtime integration or release is claimed.

## Owner request and outcome

Thomas asked to plan and create consistent, easy-to-read little players for animation, with all rinks and related physical scene elements in 3D. Treat this as a shared RinkReads asset system: a recognizable player should retain their body, uniform, equipment, handedness and identity across every camera, question and animation.

This request activates this visual design work. It does not resume the unrelated gameplay, learning, voice or training lanes in the September 5 paused handoff.

### Owner clarification, September 6

Thomas wants significantly higher-quality 3D characters, especially body shape, colors and animation; more animated presentation for younger ages; a more X's-and-O's treatment for older ages; high-quality first-person views; freely adjustable 3D viewpoints during authoring; and different questions attached to different viewpoints and decision points within one situation.

Two terms are awaiting clarification: whether "anime quality" means an anime-inspired art style or improved animated-model quality, and whether "Sensorina" refers to NHL Sense Arena. Do not lock an anime art direction or treat the first concept sheet as selected while these are open. The earlier simplified-realism recommendation is no longer the design's default assumption.

The target is one coherent 3D hockey situation with independently selectable character/tactical presentation, viewpoint, decision point and question. The current browser/tablet product remains the delivery baseline; first-person does not by itself add a VR-headset implementation requirement.

## What exists, checked in this checkout

- `src/visuals/ScenarioRink3D.jsx` uses `ScenarioSkater.jsx`, which calls `hockeyPlayerRig.js`. It follows actor position and facing but deliberately holds the body in a neutral stance.
- `src/one-on-one/PracticeScene.jsx` still imports the separate `Skater.jsx`, with its own procedural geometry and motion. These are two model implementations to reconcile during integration.
- `PracticeScene.jsx` also supplies shared arena, ice, goal and puck pieces. `src/scenario/three/Scenario3DStage.jsx` and Brain Gym have additional presentation paths to inventory.
- `docs/art/animation-pack/` already contains character references, a standard, animation specifications and acceptance criteria. The navy/gold sheets are references; they are not rigged models.
- `public/assets/3d/rink/rink-lowpoly.glb` and its manifest exist. Existence is not proof of runtime use, correct geometry or acceptance.
- The September 6 task list records nine actor/net footprint defects in the scene audit. Asset integration must address actual geometry; a new visual style does not resolve those findings by itself.

The existing saved rink screenshot was inspected as historical visual evidence, not as a live-browser verification of the current working tree. Substantial unrelated WIP is present and must remain separate.

## Character quality and appearance discussion

| Direction | Benefit | Tradeoff |
|---|---|---|
| Simplified realism — initial proposal only | Believable hockey silhouettes, readable sticks and equipment, restrained surface detail | Needs careful modeling so simplification retains the important hockey cues |
| Detailed realism | Closest to the current character reference sheets in close-up | Small details may disappear at rink scale; more modeling and rendering work |
| More stylized proportions | Strong silhouettes and larger distinguishing shapes | Changes the character direction and needs an explicit owner choice |

No precise style selection has been recorded yet. The first concept sheet explores simplified realism and remains discussion material. Thomas's clarified quality target requires strong body design, consistent color/material treatment and polished movement at both rink scale and close first-person distances. It is a visual proposal, not anatomy, rink-geometry or production approval.

## Age presentation and tactical mode

Owner direction: younger players should see more animated characters; older players should have a more X's-and-O's presentation. Proposed implementation: age-based defaults with a coach/learner override, rather than permanently removing either representation at a birthday. Exact age thresholds and access controls remain open.

- Character presentation uses the accepted skater/goalie assets and purposeful, readable hockey motion. Expressiveness must not alter action timing, exaggerate tactical reach or reveal which answer is correct.
- Tactical presentation uses clean X/O markers, stable identities and the heading/stick cues needed for that question, on the same real 3D rink. Whether this replaces the bodies or labels them is awaiting Thomas's preference.
- First-person uses the high-quality physical scene at every age. Older players can inspect tactical structure and then enter a player's eyes; switching representations does not change the scenario, possession or actor identity.
- A question that depends on a body, stick or goalie cue cannot be shown in a marker mode that removes that cue. Restore the relevant character detail or select an appropriate reviewed question.

Age presentation, camera viewpoint, Frozen/Continuous pacing and Learning/Challenge feedback are separate settings. A simpler tactical appearance does not automatically mean harder questions, less hockey motion or a different scoring system.

## Player family

Start with one youth-medium skater master and one separate goalie master. Navy and gold are material variants of the same models, not independently generated characters. Preserve the current large dark/light uniform fields, full youth face protection and visible face. Use original equipment without third-party branding.

Keep credible hockey anatomy, a readable shoulder/waist silhouette, separated skates, clear bent knees and one continuous stick. Exact stylization is pending Thomas's answer. Avoid fine detail that obscures the larger forms; a first-person close-up also needs convincing materials and complete equipment. The small player must still show which way the body faces and which side the stick occupies.

First prototype: one right-shot skater, as requested in the existing authored-asset standard. The current generated skater reference is observed left-shot; do not copy its grip and label it right-shot. Build and verify a separate left-shot variant after the first master works. Never mirror a character image or use negative scale to fake handedness.

Goalie: a distinct body/equipment silhouette, pads, blocker, catcher, goalie stick and separate motion. Start with standard left-catching. The legacy Shootout is full-right; preserve its current anatomical scoring mapping until model, labels, hit targets and scoring adapters can be changed and verified together.

Keep body/equipment variation separate from team identity. Future youth-small and youth-tall versions need appropriate proportions and equipment fits, rather than scaling one body to imply every age.

## Readability and identity

| Meaning | Presentation rule |
|---|---|
| Team | Navy/gold large fields plus a consistent marker shape; never color alone |
| Player identity | Stable short actor label/number; jersey number supports close views |
| Question focus | One distinct focus marker, independent of possession and selection |
| Selected actor | Separate selection outline; choosing an actor does not imply a correct answer |
| Possession | The authoritative puck location/contact and a restrained locator when needed |
| Correct/incorrect feedback | Appears only when the question flow permits it; team colors do not grade answers |

Labels remain upright, avoid covering the body, blade, puck or goal, and declutter when space is tight. Do not add a jersey number, floating role and long name simultaneously by default. At full-rink scale, labels and markers provide identity; fine uniform detail cannot do that job.

Test actual scene scale, not only attractive close-ups: 160 px character proofs, the real smallest on-ice footprint, narrow phone, tablet and desktop. Check grayscale as well as the normal palette. Frame the relevant situation more closely when needed rather than enlarging characters into passing lanes or nets.

## First movement slice

Create a small reusable motion set before expanding the existing larger animation wishlist:

1. Skater ready/neutral two-foot glide.
2. Forward skating into glide and a controlled stop.
3. Left/right turn; backward skate and pivot as the next extension.
4. Receive, carry, forehand pass and wrist shot, with explicit contact/release timing.
5. Goalie ready stance, lateral shuffle, butterfly and recovery.

For the very first proof, only ready/glide, receive/pass and goalie ready/shuffle are required. The other clips follow after that proof is accepted. Do not imply that a neutral model expresses a head scan, shooting deception, stick pressure or another pose-dependent teaching cue.

The scenario owns root position, facing, puck ownership and release time. Animation adds body movement around those facts. A skating cycle must not move the player twice; a pass animation must not keep the puck attached after release. Pause, seek, replay, actor-freeze and camera changes must reproduce the same pose at the same scenario time.

## One 3D rink family

Build a shared rink kit: ice surface and markings, curved boards, glass, crease, goals with depth and netting, puck, and optional practice dividers/cones. Full ice, half ice and cross ice should be configurations of a surface model with explicit dimensions and landmark positions.

Read dimensions and transforms from each scenario's authoritative surface/coordinate adapter. Existing paths include normalized coordinates and centred metres; do not silently stretch one into another or assume every view uses the same rink dimensions. A crop of full ice is a camera crop, not automatically a separate half-ice playing surface.

Visual proposal: pale textured ice, restrained reflections, soft contact shadows, quiet surroundings, crisp lines, light netting and enough board depth to read as 3D. Reduce near-side board/glass obstruction as a presentation treatment so feet, puck and lanes remain visible. Decorative geometry cannot move the playable boundary.

Use the same scene for elevated three-quarter, rink-side, behind-net, genuine overhead and player-eye views. Overhead remains a view of the 3D scene. Camera thumbnails should eventually be captures of these real presets. During a decision, permit only the camera movement defined by that question's viewing policy; the first-person scan policy is still being discussed.

World/journey scenery follows `docs/design/world-art-style.md` and the preserved six-world image. Converting that world style to actual 3D environments is a separate later asset task. The current request supports dimensional consistency, but does not select new landmarks or a replacement world style.

## High-quality first-person and camera authoring

First-person means a perspective camera at an actor's eye position, with authored head/look orientation and body posture. It is not an overhead orbit camera lowered toward the ice. The inspected `ScenarioCamera.jsx` currently provides bounded orbit/pan adjustment; that does not establish the requested player-eye system.

Proposed camera modes:

| Mode | Purpose | What can change |
|---|---|---|
| Coach/author free camera | Inspect the scene and create decision viewpoints | Orbit, move, change height, frame, choose a player and scrub/pause time |
| Player-eye camera | Read a situation from one actor's available position | Proposed: scan with head yaw/pitch while the eye remains anchored to that actor; policy awaiting owner choice |
| Guided replay camera | Explain another participant's read | Switch to a saved viewpoint at a known scene time, with actor identity made clear |
| Tactical camera | Study spacing, routes and responsibilities | Adjust the 3D overhead/elevated view without changing world geometry |

Looking around must not rotate the actor's skates, body or stick unless the authored play actually turns them. A camera switch must not advance time, move players, trigger a response or silently submit an answer. Pointer/touch gestures for looking and choosing need distinct, tested behavior.

Close-range acceptance includes complete 360-degree equipment/body geometry, convincing proportions and materials, readable teammate/opponent silhouettes, correctly placed own hands/stick where visible, clear puck/net, stable near clipping and correct occlusion. Hide only the selected avatar's camera-intersecting head geometry where necessary; retain its world body/occlusion for other views. Avoid camera travel through boards or heads, exaggerated wide-angle distortion and involuntary head bob. Actual eye height, field of view and equipment visibility need review in the first live prototype.

The likely reference, [NHL Sense Arena's official player page](https://hockey.sensearena.com/players), checked September 6, describes VR training around scanning, reading opponents and pre-scan practice with 3D replay. Reference identity is still unconfirmed. Use it to discuss the desired experience; this source does not establish equivalent RinkReads visual quality or learning outcomes.

## One scene, multiple viewpoint questions

Extend the existing [multi-perspective play proposal](2026-09-05-multi-perspective-play-sequences.md). Preserve its stable actors, world coordinates, known decision moments and independent pacing/feedback settings.

Proposed author workflow: open a scenario, scrub/freeze at a decision point, select an actor or move the author camera, save that view, choose the learning objective, attach a question and supported answer/feedback, then preview exactly what the learner can see. A second perspective becomes a separately reviewed question variant linked to the same world state, rather than an arbitrary rewrite of the original answer.

### Confirmed option: starting view per question

Thomas clarified: "when a question pops up, it auto-starts at that angle. Just as an option."

- A question can optionally save a starting camera view: an authored external angle or a named player's first-person view.
- Entering that question automatically applies its saved view before the question becomes answerable. The learner does not have to find the angle manually.
- A question without a saved view uses the normal lesson camera behavior. Existing questions do not require new camera settings.
- Apply the starting view on question entry, not on every render; this must not fight any permitted camera adjustment afterward.
- Starting view and permission to look around afterward are separate settings. This clarification does not settle scan/free-camera access.
- "Auto-starts" refers to camera initialization; playback, decision time and answer state keep their own existing controls.
- Verify question-to-question transitions and re-entry with and without a saved view, including first-person actor binding and readiness. No temporary wrong-angle frame should become an answerable question.

This is an accepted design requirement, not an implemented feature.

Illustrative prompts for one frozen 2-on-1:

| View | Possible learning question |
|---|---|
| Carrier's eyes | Which passing lane can you actually see from here? |
| Defender's eyes | Which threat do you need to take away? |
| Receiver's eyes | Where could you move to become an available option? |
| Elevated tactical view | How do the players' positions create or close space? |

These are discussion examples, not graded content or asserted correct answers. Not every scenario supports every perspective or question.

Each question variant needs a stable ID and version bound to scene version, exact event/time, observer actor, camera pose or player-eye binding, permitted scan/exploration, presentation mode, visible/previously observed cues, objective, response format, supported answer and feedback. Camera pose includes projection, eye/target or orientation, and field of view/zoom; an actor name alone is not a reproducible viewpoint.

Visibility is part of question validity: test line of sight, occlusion, readability and cues seen earlier in the sequence. Do not grade a learner using information available only to the author camera. A hidden cue may be intentionally discoverable by scanning, but the viewing policy must allow it. If a new camera or tactical-marker presentation conceals a necessary cue, the variant needs review before it can be scored.

Moving the same camera around a question leaves its world facts and answer authority intact. Selecting a different observer/objective intentionally selects a different versioned question. In free exploration, offer compatible reviewed variants; do not claim that a live AI can invent a valid answer for every arbitrary angle.

Retain prior feedback/exposure when replaying another viewpoint: a learner who has already seen the answer is doing review, not a fresh independent assessment. Multiple perspectives increase learning opportunities but are still one underlying tactical situation, not several new scenario families.

## Implementation approach after design selection

Use an editable Blender master with skeleton, skin weights, equipment anchors, materials and named clips, exported to GLB for the existing Three/R3F browser stack. This is a production target; a concept image cannot supply those files automatically. If the first model requires specialist manual authoring to meet the current quality standard, report that need rather than promote a procedural stand-in as the finished master.

Use the current shared scene and a single player adapter as the integration boundary. Keep scoring, actor IDs, surface definitions, scenario timing and saved answers unchanged. Retire the duplicate player implementations only after each consuming flow uses the accepted adapter and passes its checks.

Three.js supports imported animation clips and controlled playback/blending; see the [official animation-system documentation](https://threejs.org/manual/en/animation-system.html), checked September 6, 2026. This supports the proposed technical route, not a claim that the assets already exist or will meet device budgets.

The migration inventory must cover connected questions, animated plays, source/scenario images, Coach Lab, guided practice, rink discovery, Brain Gym, recall/comparison, and legacy rink questions. Track each as inventoried, adapted, visually verified and accepted. Do not say "all rinks are 3D" until this inventory is complete.

Make 3D the normal presentation for these physical scenes. A graphics failure must pause the affected question and offer recovery; any existing accessible/static fallback needs explicit treatment and must not silently turn an unreadable scene into a graded attempt.

## Review and creation order

1. **Look and interaction:** resolve the meaning of "anime," the reference product, character-versus-marker presentation and first-person scan/author permissions. The existing concept is discussion material, not the selected visual target.
2. **One asset and viewpoint proof:** build one skater, its navy/gold variants, a goalie and a focused 3D rink. Inspect close-up, eight headings, side, overhead and true player-eye views, then at actual phone/tablet size. Compare character and tactical modes using the same actors.
3. **One motion and teaching proof:** use one existing authored passing situation. Prove receive/pass contact, puck release, pause/seek and camera switching. Demonstrate several reviewed observer questions at one decision point with exact saved camera/state restoration and honest visibility limits.
4. **Shared integration:** replace the duplicate player paths and migrate the scene inventory in small verified groups.
5. **Expansion:** additional motion, handedness, body fits and environment props reuse the accepted masters.

## Acceptance evidence

- Record native source, exported asset, version, license/provenance, units, facing axis, root/feet/stick anchors, equipped bounds, clip names and hashes.
- Inspect the actual GLB and actual app rendering. A generated concept sheet or pipeline success message is not this proof.
- Check parallel neutral skates, two-hand grip, correct handedness, planted feet, continuous stick, goalie equipment side, collisions/occlusion and exact contact/release frames.
- Require stable identity, readable puck/labels/net and no answer cues before submission across every supported camera.
- Check actual footprint against goal/boards and preserve the scenario's geometry and scoring inputs.
- Verify pause, freeze, replay seek, reduced-motion operation, asset-load failure and WebGL context loss.
- Verify independent head scan and body facing, no time advance on camera switches, true player-eye perspective, correct occlusion, stable near clipping and exact viewpoint restoration.
- Verify each observer question's visible cues, supported response and exposure history; marker mode must not remove a cue required for grading.
- Reuse the current performance targets: 60 fps desktop and stable 30 fps on a physical baseline iPad, measured with the specified multi-player scenes. These are targets, not verified results.
- Thomas reviews the exact candidate and its hash before production-asset acceptance. Hockey cue correctness and art acceptance remain separate judgments.

## Current deliverables and limits

This file is a draft design. The [companion concept and inspection notes](../../art/animation-pack/concepts/2026-09-06-shared-3d-v1/README.md) are saved in `docs/art/animation-pack/concepts/2026-09-06-shared-3d-v1/`. The concept has visible neutral-skate and team-demonstration limitations; it is useful for style selection only. Existing originals and runtime code are unchanged by this design task. No model, clip, production performance or complete 3D migration is claimed.

Local references: `AGENTS.md`, `CLAUDE.md`, `ROUTING.md`, `docs/roadmap/TASKS.md`, `docs/one-on-one/3d-question-template.md`, `docs/one-on-one/2026-09-05-paused-handoff.md`, `docs/art/animation-pack/STANDARD.md`, `docs/art/animation-pack/QUALITY-AND-INTEGRATION.md`, `docs/design/world-art-style.md` and the source files named above.
