# Shared 3D players and rinks

Date: September 6, 2026

Status: draft for Thomas's visual review. Planning and concept art only; no new model, animation clip, runtime integration or release is claimed.

## Owner request and outcome

Thomas asked to plan and create consistent, easy-to-read little players for animation, with all rinks and related physical scene elements in 3D. Treat this as a shared RinkReads asset system: a recognizable player should retain their body, uniform, equipment, handedness and identity across every camera, question and animation.

This request activates this visual design work. It does not resume the unrelated gameplay, learning, voice or training lanes in the September 5 paused handoff.

## What exists, checked in this checkout

- `src/visuals/ScenarioRink3D.jsx` uses `ScenarioSkater.jsx`, which calls `hockeyPlayerRig.js`. It follows actor position and facing but deliberately holds the body in a neutral stance.
- `src/one-on-one/PracticeScene.jsx` still imports the separate `Skater.jsx`, with its own procedural geometry and motion. These are two model implementations to reconcile during integration.
- `PracticeScene.jsx` also supplies shared arena, ice, goal and puck pieces. `src/scenario/three/Scenario3DStage.jsx` and Brain Gym have additional presentation paths to inventory.
- `docs/art/animation-pack/` already contains character references, a standard, animation specifications and acceptance criteria. The navy/gold sheets are references; they are not rigged models.
- `public/assets/3d/rink/rink-lowpoly.glb` and its manifest exist. Existence is not proof of runtime use, correct geometry or acceptance.
- The September 6 task list records nine actor/net footprint defects in the scene audit. Asset integration must address actual geometry; a new visual style does not resolve those findings by itself.

The existing saved rink screenshot was inspected as historical visual evidence, not as a live-browser verification of the current working tree. Substantial unrelated WIP is present and must remain separate.

## Appearance options

| Direction | Benefit | Tradeoff |
|---|---|---|
| **Simplified realism — recommended working proposal** | Believable hockey silhouettes, readable sticks and equipment, restrained surface detail | Needs careful modeling so simplification retains the important hockey cues |
| Detailed realism | Closest to the current character reference sheets in close-up | Small details may disappear at rink scale; more modeling and rendering work |
| More stylized proportions | Strong silhouettes and larger distinguishing shapes | Changes the character direction and needs an explicit owner choice |

No style selection has been recorded yet. The first concept sheet explores simplified realism. It is a visual proposal, not anatomy, rink-geometry or production approval.

## Player family

Start with one youth-medium skater master and one separate goalie master. Navy and gold are material variants of the same models, not independently generated characters. Preserve the current large dark/light uniform fields, full youth face protection and visible face. Use original equipment without third-party branding.

Keep realistic body proportions, a readable shoulder/waist silhouette, separated skates, clear bent knees and one continuous stick. Reduce fine wrinkles, tiny logos and high-frequency cage detail before changing anatomy. The small player must still show which way the body faces and which side the stick occupies.

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

Use the same scene for elevated three-quarter, rink-side, behind-net and genuine overhead views. Default to the angle that explains the question; keep the camera still during a decision. Overhead remains a view of the 3D scene. Camera thumbnails should eventually be captures of these real presets.

World/journey scenery follows `docs/design/world-art-style.md` and the preserved six-world image. Converting that world style to actual 3D environments is a separate later asset task. The current request supports dimensional consistency, but does not select new landmarks or a replacement world style.

## Implementation approach after design selection

Use an editable Blender master with skeleton, skin weights, equipment anchors, materials and named clips, exported to GLB for the existing Three/R3F browser stack. This is a production target; a concept image cannot supply those files automatically. If the first model requires specialist manual authoring to meet the current quality standard, report that need rather than promote a procedural stand-in as the finished master.

Use the current shared scene and a single player adapter as the integration boundary. Keep scoring, actor IDs, surface definitions, scenario timing and saved answers unchanged. Retire the duplicate player implementations only after each consuming flow uses the accepted adapter and passes its checks.

Three.js supports imported animation clips and controlled playback/blending; see the [official animation-system documentation](https://threejs.org/manual/en/animation-system.html), checked September 6, 2026. This supports the proposed technical route, not a claim that the assets already exist or will meet device budgets.

The migration inventory must cover connected questions, animated plays, source/scenario images, Coach Lab, guided practice, rink discovery, Brain Gym, recall/comparison, and legacy rink questions. Track each as inventoried, adapted, visually verified and accepted. Do not say "all rinks are 3D" until this inventory is complete.

Make 3D the normal presentation for these physical scenes. A graphics failure must pause the affected question and offer recovery; any existing accessible/static fallback needs explicit treatment and must not silently turn an unreadable scene into a graded attempt.

## Review and creation order

1. **Look:** review this proposal and the versioned concept sheet. Select the character direction, retaining or correcting the stated uniform/equipment details.
2. **One asset proof:** build one skater, its navy/gold variants, a goalie and a focused 3D rink. Inspect close-up, eight headings, side and overhead, then at actual phone/tablet size.
3. **One motion proof:** use an existing authored passing situation. Prove receive/pass contact, puck release, pause/seek and camera switching with the same assets.
4. **Shared integration:** replace the duplicate player paths and migrate the scene inventory in small verified groups.
5. **Expansion:** additional motion, handedness, body fits and environment props reuse the accepted masters.

## Acceptance evidence

- Record native source, exported asset, version, license/provenance, units, facing axis, root/feet/stick anchors, equipped bounds, clip names and hashes.
- Inspect the actual GLB and actual app rendering. A generated concept sheet or pipeline success message is not this proof.
- Check parallel neutral skates, two-hand grip, correct handedness, planted feet, continuous stick, goalie equipment side, collisions/occlusion and exact contact/release frames.
- Require stable identity, readable puck/labels/net and no answer cues before submission across every supported camera.
- Check actual footprint against goal/boards and preserve the scenario's geometry and scoring inputs.
- Verify pause, freeze, replay seek, reduced-motion operation, asset-load failure and WebGL context loss.
- Reuse the current performance targets: 60 fps desktop and stable 30 fps on a physical baseline iPad, measured with the specified multi-player scenes. These are targets, not verified results.
- Thomas reviews the exact candidate and its hash before production-asset acceptance. Hockey cue correctness and art acceptance remain separate judgments.

## Current deliverables and limits

This file is a draft design. The [companion concept and inspection notes](../../art/animation-pack/concepts/2026-09-06-shared-3d-v1/README.md) are saved in `docs/art/animation-pack/concepts/2026-09-06-shared-3d-v1/`. The concept has visible neutral-skate and team-demonstration limitations; it is useful for style selection only. Existing originals and runtime code are unchanged by this design task. No model, clip, production performance or complete 3D migration is claimed.

Local references: `AGENTS.md`, `CLAUDE.md`, `ROUTING.md`, `docs/roadmap/TASKS.md`, `docs/one-on-one/3d-question-template.md`, `docs/one-on-one/2026-09-05-paused-handoff.md`, `docs/art/animation-pack/STANDARD.md`, `docs/art/animation-pack/QUALITY-AND-INTEGRATION.md`, `docs/design/world-art-style.md` and the source files named above.
