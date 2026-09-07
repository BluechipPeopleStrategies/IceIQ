# Character, camera and animation standard

Version `rinkreads-character-pack-v1`, drafted 2026-09-04.

**Current brand direction:** BlueChip navy `#0B1A33`, gold `#C9A24B`, bone `#F5EFE6`; headings Playfair Display, body Inter. Four current concept sheets show navy and gold jerseys for both skater and goalie. This supersedes the earlier black/yellow art direction. Existing black/yellow filenames and source prompts remain accurate historical provenance; see [the measured navy/gold review](NAVY-GOLD-REVIEW.md). Values below are proposed production contracts and budgets unless labeled as current code. They are not measurements of generated images or completed assets.

## Character identity

The authored target started as one youth-medium right-shot skater and one youth-medium goalie. Right-shot means anatomical left hand at the stick's top, right hand lower on the shaft. **The generated concept actually shows a left-shot skater** (right hand at top, left hand lower, blade to anatomical left); the inventory records observed handedness and does not relabel or mirror pixels to hide the mismatch. A future authored right-shot asset remains separate. The goalie is standard left-catching: left catcher, right blocker and stick. Distinct youth-small and youth-tall body/equipment fits can follow; uniform scaling alone does not turn an adolescent model into a young child's proportions. Camera art does not establish age curriculum eligibility.

Thomas clarified that “white” meant lighter skin visible inside the helmet, not a white jersey. The featured skater has a visible lighter-complexion human face behind its complete cage in the new navy/gold uniforms. Keep that correction in future prompts; do not hide the face behind an opaque black mask. The white-jersey generated variant is rejected as a misunderstanding, not an approved away uniform.

Home wears a deep navy jersey with gold bands. Away uses a gold jersey with navy shoulder/cuff panels; pants and helmets stay dark/navy, with bone separators. The uniforms have distinct large light/dark fields as well as trim. Add runtime player number, team shape and selection cue; do not rely on color alone or bake question-specific labels into the character. No real person likeness or third-party sports/equipment branding is required.

The goalie has a separate silhouette, mask, stick, catching glove, blocker, pads and motion set. Enlarging a skater's knees is not a goalie model. Both characters require complete youth face protection and real equipment contact points. Neutral glides have two parallel skate axes; purposeful edge/stride clips may diverge only as authored.

## Deliverable layers

1. **Reference sheet:** ChatGPT-created multiview identity/shape proposal. Real alpha desired; no automatic runtime import. View errors and inconsistent gear can occur and must be recorded.
2. **Individual candidate image:** one character, pose and view with measured bounds, pivot and handedness. A 3D-looking still is a 2D asset.
3. **Accepted sprite sequence:** consistent images exported from a controlled master or individually verified sequence, exact frame count and timebase, fixed camera. This can animate at an approved discrete view.
4. **Rigged 3D master:** original editable source, mesh, skeleton, skin weights, materials, props and animation clips exported as GLB. This supports arbitrary rink cameras and actual lighting/occlusion. No rigged master is included in the initial image generation.

Do not manufacture a hidden side by flipping a sprite or stretch one view to approximate another. Avoid crossfading unmatched headings: the resulting two sticks or limbs are especially misleading during a teaching read.

## Coordinates and camera views

The current practice simulation uses centred metres: `(x,y)` in the rink becomes Three world `(y, height, -x)`. Facing zero means attacking canonical `+x`, which points along world `-Z`. A future asset master should use local `+Y` up, `-Z` forward, `+X` anatomical right, matching the current procedural rig. Apply `rotationY = -facing` once; do not apply it again inside the asset. Scene and model adapters must be explicit if an importer uses another forward axis.

Define **relative view azimuth** around the actor as 0° front, 90° anatomical-right profile, 180° back and 270° anatomical-left profile. With camera-minus-actor vector transformed into the actor's local frame, `azimuth = atan2(localCamera.x, -localCamera.z)` normalized to 0–360°. Elevation is `atan2(localCamera.y, hypot(localCamera.x, localCamera.z))`. This measures the camera's view of the body, not the player's rink heading.

| View | Current camera contract or proposed capture | Use |
|---|---|---|
| `broadcast-35` | Current `PracticeScene`: world camera `[12,16,-1]`, target `[0,0,-20]`, vertical FOV 46° landscape / 69° portrait. Elevation at target is about 35.45°; it varies by actor position. | Eight proposed 45° relative-heading captures at 35° elevation for a restricted sprite preview; use a true model for exact perspective across the entire ice. |
| `tactical-90` | Current tactical camera `[0,34,-18]`, target `[0,0,-18]`, up `[0,0,-1]`, FOV 43° / 60° portrait. | Genuine overhead capture, helmet/shoulder tops visible. Sprite-only exactness requires a top-down orthographic preview; current perspective produces off-centre view variation. |
| `full-landscape-90` | Current full-rink camera `[0,48,0]`, target origin, up `[-1,0,0]`, FOV 42°. | Overhead assets with camera roll transformed consistently with labels/controls. |
| `full-portrait-90` | Current full-rink camera `[0,74,0]`, target origin, up `[0,0,-1]`, FOV 51°. | Same overhead master with verified screen rotation. |
| `shootout-front` | Current Shootout camera `[0,.22,7.4]`, target origin, FOV 46°. Scene is a separate, exaggerated display-space model; its floor is `y=-1.4`, goal width roughly 4.16 scene units. | Frontal goalie image; retain explicit display-space adapter. Do not treat this model scale as rink metres. |
| `front-0`, `right-0`, `back-0` | Proposed weak-perspective character-reference views at 0° elevation. | Review identity and anatomy, not top-down game rendering. |

For a sprite preview, restrict view selection to the manifest's camera bucket and tested heading tolerance. Outside its supported tolerance, choose the existing 3D renderer; never imply an arbitrary camera can be satisfied by one cutout. At a perfect overhead view, azimuth becomes numerically undefined. Use a dedicated overhead texture plus the actor's rink heading and the camera's screen-right/up vectors; do not infer a random front/profile view from a zero horizontal camera vector.

Current code references: `src/one-on-one/PracticeScene.jsx`, `Skater.jsx`, `src/cognitive-gym/ShootoutDrill.jsx`, `ShootoutScene3D.jsx`, `src/scenario-engine/rinkFrame.js`. The manifest records this snapshot; refresh it if camera code changes.

## Images, pivots and projected size

- Request 2048×2048 RGBA PNG masters for individual frames. Reference sheets may request 4096×4096. Record native output dimensions; never report an upscale as native detail. Keep original output and SHA-256.
- Genuine alpha: transparent outside the silhouette and through visible gaps. No baked checkerboard, white matte, floor, puck, contact shadow, rink, target or label. A source with no alpha or opaque background is rejected as a transparent runtime asset, even if its art is useful reference.
- Document source PNG pixels with top-left origin. `rootPivotPx` is the projection of the actor root on the ice, conventionally midway between the skate-contact anchors in a neutral pose. It is **not** necessarily bottom-center; the stick can extend below or beyond it. Store `leftSkateContactPx`, `rightSkateContactPx`, `stickBladeContactPx`, `opaqueBoundsPx` and the projected standing-height calibration.
- Keep one untrimmed canvas coordinate system per view/clip. If atlasing trims empty pixels, store the trim rectangle and original pivot. Add transparent atlas padding and color-edge extrusion to prevent neighboring frames bleeding. Do not move each frame to its bounding-box centre; that makes stationary actors slide.
- A candidate's physical body-height target is metadata, proposed 1.55 m for the youth-medium skater before helmet/skate allowance and 1.55 m for the goalie body before gear. These are art targets, not population averages. Calibrate an actual accepted model and document its full equipped height separately.
- For rendering, project a known world-space height with the actual camera. Use its pixel length and the same reference points measured in the source frame to compute the image scale. Apply the scale to the whole untrimmed frame around its measured ice-root pivot. Never use constant screen size in a perspective rink. For an overhead body image, use a recorded projected ground-plane rectangle; standing-height projection approaches zero and cannot calibrate it.
- Shadows, puck, player markers, team labels, freeze indicators and tactical annotations are separate layers. Three.js sprites do not cast shadows automatically; a separate authored contact-shadow layer must not move independently of the root. Depth/occlusion around sticks, goals and boards needs a tested ordering approach or the rigged renderer.

## Animation timing and authority

The manifest defines 24 fps authoring clips. Runtime skeletal animation samples continuously; a sprite preview may sample the same timeline at 12 fps. For an `N`-frame loop, unique samples are `0 ... N-1`, duration `N / 24` seconds; do not repeat the first frame as an extra hold. Non-looping actions explicitly hold their last sample or transition to the next state. Every clip is in place; simulation owns movement and speed. Start with ready/glide, forward/backward skate, carry, pass, receive, shot, poke and goalie set/shuffle/butterfly/save/recover.

`contactFrame` and `releaseFrame` entries are proposed authoring markers. They do not delay, rerun or override game-core possession, scoring, coverage or shot-clock events. The runtime chooses and phases a clip around an existing authoritative event. If the current game releases instantly, do not show a long wind-up with a puck visibly attached after release; author a short compatible release or make the simulation/animation event contract explicit in a separate gameplay change.

Freeze means hold the exact actor pose, limb animation sample and root until unfreezing. Playback/scrubbing uses scenario or replay time, never the wall clock. Store action start time, clip ID, normalized time and transition state in a replay-compatible presentation record. Speed-dependent foot cadence must follow speed without translating the mesh root. Smooth clip transitions cannot change handedness, create new puck possession or invent a successful save.

## Minimum rig contract for the later 3D master

GLB in metres with applied transforms and positive scales. Root on ice midway between a neutral pair of skates, local `-Z` forward. Separate skinned body/equipment material slots and a rigid stick attached to a stable hand/prop chain. Required bones or sockets: root, pelvis, spine/chest, neck/head, left/right upper arm, forearm, hand, thigh, shin, foot; `stick_grip_top`, `stick_grip_lower`, `stick_blade`, `skate_contact_l`, `skate_contact_r`. Goalie adds catcher and blocker sockets and pad attachment controls. Bone names can differ only through a checked mapping file.

Export named clips from the manifest, in-place, with no extra root translation. Keep two-hand stick corrections and goalie pad/skate contacts inspectable. Suggested starting budgets: skater ≤25k triangles, goalie ≤35k, ≤70 deform bones each, shared 2K texture sets; target loaded character assets below 20 MB for the initial two-team plus goalie scene. These are starting budgets to profile on the actual baseline tablet, not achieved performance claims. Review normal maps, mipmaps, alpha and compression before adding complexity. Source `.blend` files and licenses remain outside `public/`; only accepted runtime exports belong in `public/assets/characters/`.

## Handedness migration

The current Shootout drawing is **full-right**: its glove is screen-left and blocker/stick screen-right. This new pack is **standard left-catching**, the opposite. Neither is a labeling error if the full character is internally consistent. The pack must not silently replace that mesh or horizontally flip the generated image.

Choose an explicit avatar handedness at integration. For standard front view, map `gloveHi/gloveLo` to viewer-right targets and `blkrHi/blkrLo` to viewer-left; for legacy full-right, preserve the existing mapping. `midHi` and `fiveHole` remain central. Keep core IDs anatomical, not defined by screen columns. Update target positions, labels, goalie limbs, hit areas, 2D fallback and animation lookup together. Test both handedness variants against identical open/covered IDs and scoring. Screenshots alone cannot prove this mapping. The initial generation has no permission to alter the scoring core.
