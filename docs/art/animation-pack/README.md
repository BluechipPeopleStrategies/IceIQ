# RinkReads character and animation pack

**Current direction:** BlueChip navy `#0B1A33`, gold `#C9A24B`, bone `#F5EFE6`, local Playfair Display headings and Inter body. Both navy and gold jersey variants are now generated for the skater and goalie, with genuine-alpha PNGs.

Drafted 2026-09-04 for Thomas's request for transparent ChatGPT-created skaters, a goalie, different rink views and a reusable animation standard.

**Current delivery:** four actual transparent four-view concept sheets, an interactive local [character review](index.html), art direction, generation prompts, a machine-readable pack manifest, a frame schema, and acceptance/integration rules. The skater has a lighter human face visible behind its complete cage, preserved in the navy/gold palette. These references are not accepted runtime animations or 3D models.

The current downloads are [navy skater](references/skater-navy-transparent-v1.png), [gold skater](references/skater-gold-transparent-v1.png), [navy goalie](references/goalie-navy-transparent-v1.png) and [gold goalie](references/goalie-gold-transparent-v1.png), all genuine RGBA at their native 1254×1254 resolution. Their generated originals had an opaque painted checkerboard. Local, explicitly authorized segmentation removed that background without changing pose, uniform, face or handedness. See [current palette evidence](NAVY-GOLD-REVIEW.md) for hashes, method and limits; [the earlier extraction record](ALPHA-EXTRACTION.md) remains historical provenance. The white-jersey detour is retained as rejected provenance and is not featured in the pack.

The intended look is premium, realistic sports-game equipment in navy and gold: detailed cloth and pads, credible skates and stick handling, readable silhouettes and complete youth face protection. Images can depict three-dimensional characters. Transparent PNGs themselves are flat; they do not contain a skeleton, geometry or hidden sides. A finite set of matching views supports a fixed-view sprite renderer. Arbitrary moving cameras and natural blended skating need a real rigged model. Three.js documents its [sprites as camera-facing planes](https://threejs.org/docs/pages/Sprite.html) and provides a separate [animation system for rigged models and clips](https://threejs.org/manual/en/animation-system.html).

## Files and first batch

| File | Purpose |
|---|---|
| `01-skater-reference.prompt.md` | Original right-shot generation brief; the returned skater is visibly left-shot, recorded as such. |
| `02-goalie-reference.prompt.md` | Four-view standard left-catching goalie reference sheet; second image request. |
| `03-individual-ready-poses.prompt.md` | Individual transparent skater and goalie ready poses after a reference is selected. |
| `04-light-skin-edit.prompt.md` | Recovered historical skin-edit prompt, with attribution to retained root history. |
| `05`–`08` prompt files | Exact submitted navy/gold skater and goalie edits. |
| `NAVY-GOLD-REVIEW.md` | Current four-asset review, hashes, alpha measurements and limits. |
| `pack-manifest.json` | Characters, uniform variants, camera presets, clip names, timings and generation jobs. |
| `sprite-frame.schema.json` | Required per-frame measurements and provenance for a candidate sprite. |
| `STANDARD.md` | Camera, scale, alpha, pose, handedness and runtime contracts. |
| `QUALITY-AND-INTEGRATION.md` | Concrete accept/reject checks and integration sequence. |
| `ALPHA-EXTRACTION.md` | Local removal method, actual transparency evidence and remaining concept-art limits. |
| `extract_reference_alpha.py` | Reproducible CPU-only extraction with explicit local model and source files. |

The first two sheets establish character identity and reveal anatomy/handedness problems. They are not an animation atlas. Record each returned file's actual pixel dimensions and alpha properties; a requested 4096-pixel canvas is not proof that the generator delivered that size. Keep every original generation intact. Do not erase background defects by calling the source “transparent.”

## Current direction and older evidence

This is a new, expressly requested September transparent-image exploration. It does not rename, resurrect or promote the previously rejected R15–R18 attempts. The paused R19 direction remains useful for the future controllable rigged master; this packet does not claim that master has been built or that these new images satisfy its production gate. The user can inspect the new artwork without it silently replacing the current game or teaching assets.

The simulation, scenario geometry, correct answers, puck and teaching overlays remain separately authored. An attractive render cannot establish that a hockey decision is correct. See the current [practice design](../../superpowers/specs/2026-09-04-one-on-one-practice-rink-design.md) and [scenario-engine decisions](../../factory/SCENARIO-ENGINE-DECISIONS.md).

## Free-first route

Use the ChatGPT image tool already requested by Thomas for these candidate references, without buying stock or introducing a paid API. This does not promise unlimited or universally free image generation. For controllable 3D, create original equipment and motion around an appropriately licensed base in Blender, retaining source files and license receipts. The current [asset shortlist](../../one-on-one/asset-shortlist.md) records the free CC0 base-mesh option and paid alternatives; no purchase is part of this packet. A free base or reference image still leaves modeling, rigging, skinning and hockey-motion work to complete.
