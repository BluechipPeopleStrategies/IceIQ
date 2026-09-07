# Transparent concept references — actual results

**Historical extraction record:** this page documents the earlier black/yellow source pass. The current featured navy/gold files, their actual hashes and visual checks are recorded in [NAVY-GOLD-REVIEW.md](NAVY-GOLD-REVIEW.md).

Prepared 2026-09-04 after Thomas expressly authorized local background removal and clarified that the player should have **lighter visible skin, with black/yellow equipment**. The white-jersey generation was a misunderstanding and is retained only as rejected provenance.

## Delivered PNGs

| Concept sheet | Native pixels | Mode | Fully transparent pixels | Partially transparent pixels |
|---|---:|---|---:|---:|
| [Skater, black/yellow, visible face](references/skater-black-light-skin-transparent-v2.png) | 1254 × 1254 | RGBA | 82.0979% | 1.6054% |
| [Goalie, black/yellow](references/goalie-black-transparent-v1.png) | 1254 × 1254 | RGBA | 68.3254% | 3.9056% |

Both files contain actual alpha from 0 to 255. The generated RGB originals remain beside them and are unchanged. No image was upscaled; a 4096-pixel prompt request did not produce 4096 native pixels. Every RGB pixel is preserved exactly in the derived file; only its alpha channel was added. No pose was mirrored, redrawn or relabeled during extraction.

SHA-256:

```text
skater-black-light-skin-transparent-v2.png
d846e2cd4bfeba3594bdb8fd7289dcbcdf451427da55fedbe917107d5189b081

goalie-black-transparent-v1.png
b4931100bed31dc9cc9e23ed7d80e0f89758155da6506dfea7f7bb3b00cd9150
```

## Local method and verification

The original built-in GPT images were RGB and contained a painted checkerboard. ONNX Runtime 1.26.0, Pillow and NumPy were already present locally. The extraction downloaded the official `isnet-general-use.onnx` model once and ran it locally on CPU; the images were not uploaded to an outside segmentation service, and no API key or purchase was used. The model's expected checksum and preprocessing are documented in [rembg's versioned IS-Net session](https://github.com/danielgatis/rembg/blob/v2.0.67/rembg/sessions/dis_general_use.py).

Model MD5: `fc16ebd8b0c10d971d3513d564d01e29` (matched the official value). Model SHA-256: `60920e99c45464f2ba57bee2ad08c919a52bbf852739e96947fbb4358c0d964a`. The 178,648,008-byte model stays in local temporary working storage and is not included in this pack or runtime.

Each character view was processed separately at the model's 1024 input resolution. The skater's empty row gutter is y=575, so the final extraction uses that boundary rather than cutting through the lower helmets at the canvas midpoint. The final skater proof shows all four complete helmets. This is layout-aware extraction, not automatic animation-frame slicing.

No global white or grey color key was used. The white goalie pads, catcher, blocker and skate holders were preserved. Two small, inspected catcher-web regions retained bright background pixels; [source-hash-bound local polygons](goalie-web-refinements-v1.json) refine those apertures only, changing 497 alpha values. They never touch the large white equipment panels. The original colors remain unchanged.

Viewed black and white composites of the actual final PNGs:

- [Skater composite proof](evidence/skater-black-light-skin-reference-v2-alpha-proof-v1.png)
- [Goalie composite proof](evidence/goalie-black-reference-v1-alpha-proof-v1.png)
- [Goalie catcher detail](evidence/goalie-glove-alpha-detail-v1.png)
- [Machine checks: alpha, preserved RGB and sampled helmet/face/pad points](evidence/alpha-verification-v1.json)

The machine checks confirm real transparency, untouched RGB pixels, intact sampled helmet/face regions and nonzero alpha on sampled white pad/blocker regions. Those checks do not certify every cage wire or equipment seam. At high magnification, fine light fringes remain around some catcher-web apertures and some anti-aliased cage edges; these references are **not production sprite mattes**. No opaque checkerboard remains around the full character silhouettes in the inspected composites.

## Handedness and current acceptance

The skater was requested as right-shot but the returned art is visibly **left-shot**: right hand at the top, left hand lower, blade on anatomical left. The lighter-skin edit preserved that pose. Inventory records `skater_ym_l_concept` and never passes it off as a corrected right-shot runtime character. The separately specified right-shot master remains planned.

The goalie has standard anatomical-left catching equipment. The current Shootout renderer's full-right arrangement must be explicitly mapped if a future standard-catching model replaces it; this image does not change scoring or target IDs.

Both sheets are selected **concept references**, suitable for the local art review page and as a modeling brief. They do not supply skeletal geometry, arbitrary camera views, a completed animation sequence or an approved gameplay asset. The 40 clips in the manifest remain planned. Their four views are illustrated approximations, not calibrated camera renders.

## Reproduce locally

Supply the checked local ONNX model. This script never writes over the source RGB image. From the repository root:

```powershell
python docs/art/animation-pack/extract_reference_alpha.py `
  docs/art/animation-pack/references/skater-black-light-skin-reference-v2.png `
  --model 'C:\Users\mtsli\AppData\Local\Temp\rinkreads-one-on-one-20260904\isnet-general-use.onnx' `
  --proof-dir docs/art/animation-pack/evidence `
  --report docs/art/animation-pack/evidence/skater-alpha-report-v2.json `
  --row-cut 575

python docs/art/animation-pack/extract_reference_alpha.py `
  docs/art/animation-pack/references/goalie-black-reference-v1.png `
  --model 'C:\Users\mtsli\AppData\Local\Temp\rinkreads-one-on-one-20260904\isnet-general-use.onnx' `
  --proof-dir docs/art/animation-pack/evidence `
  --report docs/art/animation-pack/evidence/goalie-alpha-report-v1.json `
  --refinements docs/art/animation-pack/goalie-web-refinements-v1.json
```

The original prompts are preserved as historical generation briefs. The later skin-visibility request changes the face presentation while preserving the black/yellow uniform; it does not retroactively make the initial prompt's requested handedness or transparency successful.
