# Acceptance and integration checklist

This checklist is a concrete quality contract for the requested pack. No checkbox is considered passed merely because its prompt asks for it.

## Initial references

Inspect returned native-size files and small proofs on light ice, black, and an actual compositing checker. A checker used **behind** a PNG in a proof is different from a checker painted into its pixels. Record original file path, native dimensions, RGBA mode, alpha histogram/transparent-pixel ratio, SHA-256, prompt ID, references and generation date. Do not invent seeds or provider settings that the tool did not return. Retain rejected outputs as evidence with a reason.

Check complete silhouette, cage, two legs/skates, two arms/gloves, one continuous stick, grip contact, correct handedness, sensible equipment proportions and realistic materials. Check every angle for changed stripes, missing blades, duplicated front pad faces in rear view, wrong mask, changed body or swapped catcher/blocker. A four-view sheet only passes as a reference if all four are coherent; one attractive panel does not make a complete pack.

## Individual sprite candidates

1. Validate metadata using `sprite-frame.schema.json`; compute file measurements rather than filling estimates into measured fields.
2. Inspect at full size, 160 px character height and actual in-game sizes. A readable helmet and stick at 160 px does not guarantee readability at a 25 px full-rink size; retain selectable labels and marker shapes.
3. Verify true alpha, no matte fringe on light/dark backgrounds, clear negative space through limbs/cage where visible, no clipped blade or equipment, and ≥8% clear canvas margin unless an atlas records padding separately.
4. Measure root/feet/stick pivots. Composite onto the actual camera/rink and confirm skate contact, projected scale, facing, stick-side handedness and no floating torso.
5. Reject synthetic top views that merely rotate a frontal cutout. Inspect helmet top, shoulder planes and foot/torso overlap. Test all permitted camera buckets and screen rotations.
6. Obtain a recorded art decision for each candidate: `reference-only`, `candidate`, `accepted-for-preview`, `rejected`, or later `production-approved`. Never use “approved” without a named decision and date.

## Motion sequences and real models

- Scrub every frame at full size and play at normal/quarter speed. Check feet for sliding, ground penetration and unexplained V-strides; hand/stick continuity; pad attachment; no silhouette growth, gear swaps or alpha flicker.
- Ready/glide loops must return smoothly with no duplicated extra endpoint. All frames share a fixed view, root and crop coordinate system. Sample durations match the manifest.
- Confirm every authored action transition both with and without possession, left/right turn/poke, goalie save and recover. Reject transitions that shift root, swap hands or let the puck remain attached after authoritative release.
- Pause, actor-freeze, replay seek, reverse scrub and a camera switch hold or restore exactly the intended pose. Hidden-tab pause must not consume a play.
- Test front, side, broadcast and genuine overhead views. Inspect both uniforms simultaneously, opponent identity and labels, glove/blocker targets and the 2D fallback. Same scoring inputs must produce the same result with either renderer.
- Measure actual browser performance on desktop and a physical baseline iPad with 1v1, 3v3 and 6v6 plus goalies. Profile loaded texture memory and first interaction, not only a desktop still. Targets: 60 fps desktop, stable 30 fps baseline tablet; status stays unverified until measured.

## Integration sequence

1. Generate and display the initial skater and goalie reference sheets for review; record real results under the manifest's generation jobs. They may be shown in an art review surface without replacing gameplay actors.
2. Produce one isolated ready skater at the elevated broadcast view and one frontal standard goalie, using the selected sheets as references. Measure pivots/alpha and composite proofs. Stop multiplying views if identity or anatomy drifts; use those stills as a controlled modeling brief instead.
3. Add a development-only asset adapter with graceful procedural/2D fallback. It reads the same actor transform and simulation time; it cannot grade answers. Do not merge candidate images directly into all camera routes.
4. If the sprite approach is chosen, lock supported cameras and author/validate the finite matching views. If arbitrary cameras remain required, build/commission a rigged master from the approved style and export GLB plus named clips. A generated sheet is useful reference but is not an automatic 3D reconstruction.
5. Validate the goalie handedness mapping described in `STANDARD.md` before replacing the full-right Shootout character with the standard left-catching pack. Keep anatomical core IDs stable.
6. Complete motion, device, provenance and visual review before production promotion. Review the actual final artifacts, not a separately recreated mock-up.

## File organization when real assets exist

Generated references: `docs/art/animation-pack/generated/` or a recorded absolute output path if outputs are large. Review proofs: `docs/art/animation-pack/evidence/`. Accepted runtime sprite frames/atlases: `public/assets/characters/{packVersion}/sprites/`. Accepted runtime models: `public/assets/characters/{packVersion}/models/`. Native editable sources: a recorded non-public location plus hash. Do not create empty binary placeholders or declare these folders populated before outputs exist.

File naming: `rr_{characterId}_{uniformId}_{handedness}_{viewId}_az{000}_{clipId}_f{0000}_v{001}.png`. A single ready image uses frame `0000`. Per-frame metadata uses the same stem plus `.json`. Atlas files include character, uniform, view and clip; manifest rectangles/pivots preserve each original frame. Version changes produce a new artifact name and hash rather than silently replacing a reviewed file.
