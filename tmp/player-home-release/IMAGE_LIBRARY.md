# RinkReads Image Library — U11 Scene Set v1

**Generated:** 2026-07-08 by `tools/scene-forge.mjs` · **Style:** `top-down-diagram-v1`
**Coverage:** 37 scenes → 129 of 156 U11 questions image-backed (27 pure-conceptual questions stay text-first by design).

---

## What this library is

Reusable **scene archetypes**, not one image per question. Each scene depicts one teachable situation (a 2-on-1, a breakout under forecheck, a corner shield) and serves every question that tests a read inside that situation. This is the factory SPEC's visual direction executed: clean diagram scenes that annotation overlays sit on top of, instead of mushy photoreal art.

## The one rule that matters

**Scenes show the SITUATION. Overlays show the ANSWER.**
No gold arrow, no green ring, no "OPEN" label is ever baked into a scene image — otherwise the picture telegraphs the correct option before the kid answers. The read ships as data instead: every scene's manifest entry carries `lane` (the correct-play arrow) and `openTarget` (the ring) in normalized 0–1 coords, ready to attach as `q.overlays[]` once the arrow/ring OverlayLayer extensions land (SPEC §2).

## Visual grammar (colorblind-safe: shape + color, never color alone)

| Element | Meaning |
|---|---|
| Yellow **circles** | Your team |
| Black **squares** | Opponents |
| Orange ring + "YOU" | The point-of-view player |
| Stick wedge on each player | Which way they're facing |
| Black dot + orange glow | The puck |
| Gray **dashed** arrow | Skating direction — situation context, never the answer |
| Gray **dotted** thin line | A pass in flight |

Rink: IIHF top-down matching `RinkReadsRink.jsx` geometry (600×300 units; goal lines x=40/560, blue x=213/387). Palette from the renderer: lines `#CC1F2B`/`#185FA5`, teams `#EF9F27`/`#2C2C2A`, ice `#eef6fb`. Attack is always → right net; defend is always ← left net.

## Views & sizes

| view | slice | output | used for |
|---|---|---|---|
| `full` | whole rink | 1248×648 | rushes, gaps, transition, backcheck |
| `oz` | right end zone | 1086×972 | offensive-zone reads |
| `dz` | left end zone | 1086×972 | defensive-zone reads, breakouts |

## Files

- Images: `public/assets/scenes-u11/<scene-id>.png` (URL `/assets/scenes-u11/…`)
- Manifest: `src/data/scene-manifest.json` — per scene: `file`, `alt`, normalized `puck`, `actors[]` (role/team/you/goalie/x/y), `lane`, `openTarget`, `serves[]` (question ids)
- Generator: `tools/scene-forge.mjs` — scenes are data definitions; edit coordinates or add scenes and re-run `node tools/scene-forge.mjs`. Uses `sharp` (already a devDep). The script re-writes bank `media` bindings are applied separately (see below).

## How questions bind

Each bound question carries `media: { type:"image", url, alt, sceneId }`. The `alt` is the scene description (accessibility + the coord-picker tool). One scene serves 1–7 questions; the manifest is the single source of truth for the mapping — never hand-edit `media` in bank.json without updating `serves[]`.

## Regeneration / extension workflow

1. Add or edit a scene object in `tools/scene-forge.mjs` (rink coords, actors, motions, lane/openTarget, serves)
2. `node tools/scene-forge.mjs` → PNGs + manifest
3. Re-apply media bindings to the bank (one-liner in the tool header comment, or ask Claude Code)
4. `npm run build` — Vite copies `public/` through

## Upgrade path (matches factory SPEC stages)

- **Now:** diagram scenes (this set) — legible, deterministic, coordinate-exact
- **Next:** OverlayLayer `arrow`/`ring` extensions read `lane`/`openTarget` straight from the manifest → post-answer "here's the read" reveal with zero hand placement
- **Later:** swap any scene's PNG for factory art (sprites-on-background or approved AI art) without touching questions — the id, URL, and coords stay stable. The manifest IS the contract.

## Scene index

Run `node -e "const m=require('./src/data/scene-manifest.json'); m.scenes.forEach(s=>console.log(s.id, '→', s.serves.length))"` for the live list. Highlights: `rush-2v1` (7 questions — the highest-frequency scoring read), `dz-breakout-forecheck`, `oz-corner-shield`, `wall-angle-steer`, `dz-netside-coverage`, `oz-cycle-low`.
