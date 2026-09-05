# RinkReads 1v1 character-asset shortlist

Checked 2026-09-04 against the linked creator/store pages. Prices are the storefront prices visible during this review, before tax. No asset was bought, downloaded, or installed, so every animation, rig, material, and browser-performance statement below remains a storefront claim until the delivered files are inspected.

## Recommendation

Use **CGTrader Ice Hockey Actions** as the first paid import test, subject to a final price check. It is the only reviewed single purchase that claims both player and goalie models plus enough hockey-specific clip breadth to explore a 1v1. Treat its current adult/mobile-game appearance as a motion-and-rig starting point: RinkReads would still need original, unbranded youth proportions, uniforms, colours, faces, and likely animation cleanup.

If its preview quality is unacceptable, use the **matched Code This Lab Unity player + goalie pair** as a technically simpler fallback and budget custom animation work immediately. Do not buy the TurboSquid skater for the current Three.js build unless TurboSquid first approves that custom WebGL use in writing.

| Rank | Candidate | Visible price | Supplied formats | Storefront animation claim | RinkReads fit |
|---|---|---:|---|---|---|
| 1 | [Ice Hockey Actions, sportsactionsteam — CGTrader](https://www.cgtrader.com/3d-models/sports/game/ice-hockey-action-animation) | **$60.00**; page text does not expose a currency code | FBX (3 files, 1.01 GB), Unity package, MAT, textures | “160 animations”; player and keeper | Best coverage-to-cost ratio; still needs a real import/playback and visual-quality gate |
| 2 | [Hockey Player Animated](https://assetstore.unity.com/packages/2d/characters/hockey-player-animated-197149) + [Hockey Goalie Animated](https://marketplace.unity.com/packages/3d/characters/hockey-goalie-animated-199878), Code This Lab — Unity Asset Store | **US$19 each / US$38 total** | Unity packages containing FBX animation/T-pose files, prefabs, materials and TGA textures | Player 14 clips; goalie 18 clips | Coherent pair and explicit humanoid rigs, but action vocabulary is thin |
| 3, conditional | [Real-Time Hockey Player, Code This Lab — TurboSquid](https://www.turbosquid.com/3d-models/hockey-player-real-time-1083637) | **$79**; page text does not expose a currency code | 3ds Max 2016 and FBX 2016; TGA textures | Eight in-place clips, including one shooting and three skating variants | Skater only; inadequate clip set and a licence hold for custom WebGL |

### 1. CGTrader Ice Hockey Actions

The seller lists a 70-joint rig, PBR texture sets, 9,544 vertices / 18,271 triangles for the complete player mesh, humanoid and generic animation variants, and mobile-game optimization. The store also says its FBX passed CGTrader's technical/visual checks for file structure, geometry, PBR maps, materials, UVs, and naming. That check does **not** prove that the advertised clips look correct, blend cleanly, preserve skate contact, or work in Three.js.

The named clips span forward/lateral skating, starts/loops/turns/stops, backward movement, many directional shots, falls/hits, celebrations, and at least ten explicitly prefixed keeper actions such as ready, idle, block left/middle/right, and sit-to-stand. This is broad enough to justify an import trial.

The deficiencies are material for a 1v1: the list has no clearly named puck-carry/stickhandle, deke, poke-check, pass, goalie shuffle, rebound recovery, or separate upper-body layer. Many clips are generic running, walking, jumping, or melee-hit motions. The seller says the pack works with every Unity version, but does not claim glTF/GLB or Three.js support. Youth body proportions, handedness switching, two-hand stick continuity, puck-to-blade alignment, root motion, clip transitions, and animation-loop seams are unknown.

Licence: the listing says **Royalty Free License**. [CGTrader's current terms, section 21A](https://www.cgtrader.com/pages/terms-and-conditions) permit use and distribution as an incorporated product and prohibit redistribution of the source asset. RinkReads must ship the converted files as protected application content rather than an extractable asset library.

### 2. Code This Lab matched Unity pair

The player listing's official page data names 14 handcrafted, in-place humanoid clips: Idle, Shooting, and backward/forward/left/right skating, each with start and stop variants. The goalie has 18 handcrafted, in-place humanoid clips: Butterfly Save, Down Left/Right Save, Glove Blocker/Trapper Save, Idle, and backward/forward/left/right skating, again with start and stop variants. The publisher says both were authored in 3ds Max 2018 and imported through FBX 2018; the packages contain FBX animations, T-pose files, prefabs, materials, and textures.

This pair supplies a consistent player/goalie art family and basic locomotion. It lacks explicit player puck carry, glide, crossover, turn/pivot, stop style, deke, forehand/backhand releases, and poke-check clips. The goalie set has no explicitly named set stance, shuffle, recover, post integration, or rebound reaction. Because the animations are in place, the simulation would drive translation; foot sliding and turn matching therefore need careful blending. A 2025 Unity forum report about stick separation during transitions on the player asset is not primary product evidence, but it reinforces the need to test prop bones rather than assume that the preview clips blend.

Licence: each page shows a **Single Entity** licence under the [Standard Unity Asset Store EULA](https://unity.com/legal/as-terms). Unity's [EULA FAQ](https://assetstore.unity.com/browse/eula-faq) allows non-SDK assets to be modified and included in a larger game/digital product when users cannot extract the asset separately. Confirm who needs seats before sharing source assets with outside contractors.

### 3. TurboSquid Real-Time Hockey Player — conditional only

The seller claims eight handcrafted, in-place animations but names only seven: idle, idle loser, idle winner, shooting, skating, skating loser, and skating winner; it also supplies a T-pose and a file that sequences the animations. That count discrepancy needs binary inspection. The model has 5,791 polygons / 6,107 vertices, a 3ds Max Biped rig, and three colour textures. The FBX export converts the Max biped bones to dummies, which increases retargeting uncertainty. There is no goalie and no directional locomotion, start/stop, puck carry, deke, turn, release variety, poke-check, or defensive animation.

Licence: the listing shows TurboSquid's Standard License, but [TurboSquid's current licence guide](https://www.turbosquid.com/licensing) specifically allows browser WebGL use in Unity, Unreal, and Lumberyard and says other WebGL applications may need case-by-case approval. RinkReads is a custom React/Three.js application, so this candidate is on hold unless TurboSquid approves that use. The same licence also requires the model files to be protected from end-user extraction.

## Free, commercially usable routes

### Best free ownership route: original RinkReads models from Blender's CC0 bases

[Blender's official Human Base Meshes v1.4.1](https://www.blender.org/download/demo-files/) is a 49 MB, **CC0** bundle for Blender 4.2 LTS or newer. It includes realistic and planar starting meshes with topology, UVs and sculpting features; Blender's [asset-bundle guidelines](https://developer.blender.org/docs/features/asset_system/asset_bundles/guidelines/) confirm that accepted bundle assets are CC0. This is the cleanest zero-asset-fee path to original, unbranded, youth-proportioned RinkReads skaters and a separately built goalie.

It is a base-mesh library, not a hockey character pack. The work still includes age-appropriate resculpting, game retopology, hockey and goalie equipment, textures, skeletons, skin weights, left/right stick rigs, all skating/action clips, LODs, and export. It offers the best long-term ownership and visual coherence, but the largest schedule and specialist-animation cost. “Free” applies to the source asset, not production labour.

### Fast free technical smoke test: Sketchfab Hockey dancer

[Hockey dancer by 7301965](https://sketchfab.com/3d-models/hockey-dancer-700c26325c5544fbabd8a9ca2bbe134d) is a downloadable Blender-uploaded hockey character with one dance loop, 2,700 triangles, and a **CC BY** licence. It is useful only to prove the free animated-model ingestion path and attribution handling. The source page does not expose a guaranteed download format, skeleton specification, or other clips, and the asset is a stylized dancer rather than a player/goalie 1v1 set. Do not present it as production art.

The current developer-built `src/one-on-one/Skater.jsx` articulated player is also a legitimate zero-purchase functional-preview route because it is original and already follows simulation state. It remains provisional geometry with procedural limb motion; it is not a rigged production asset and is not comparable to an NHL-quality character system.

## Required import gate before any production choice

For one approved test purchase or free prototype asset:

1. Archive the original download, listing receipt, licence, version, and SHA-256 hashes. Do not use a mirror; `free3d.online` is not the rights-holding seller and its “free” copy of a paid CGTrader model is excluded.
2. Open the actual FBX/Unity content in a clean staging project or Blender. Enumerate meshes, bones, skin weights, embedded/external textures, animation clips, frame ranges, root motion, prop bones, and left/right-handed variants.
3. Convert a copy to glTF/GLB and load it through Three.js `GLTFLoader`/`AnimationMixer`. A Unity package claim is not browser verification.
4. Test forward/backward glide, turns, stop/pivot, puck carry, release and poke; goalie set, shuffle, save and recover. View every transition from front, side, and the real gameplay camera at normal speed and slow motion. Reject skate sliding, knee collapse, stick detachment, hand popping, puck teleporting, or broken loop seams.
5. Retarget one skater and one goalie to proposed U11/U13 proportions, replace all branding with original RinkReads uniforms, and verify cage/pads/stick readability. “NHL-inspired” may guide finish and motion quality; no NHL/team marks or copied player likenesses should ship.
6. Measure the real GLB, textures, draw calls, animation CPU cost, memory, and frame time on desktop plus the chosen baseline physical iPad. The storefront's “mobile optimized” label is not performance evidence.

The paid shortlist reduces rigging and clip-authoring work, but none of these listings closes the production-art gate on its own. The most defensible route is one bounded CGTrader import test followed by a keep/reject decision against the checklist above; if rejected, invest in original Blender-based youth characters rather than stacking more unverified stock purchases.
