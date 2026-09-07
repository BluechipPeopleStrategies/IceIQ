# Goalie equipment cutouts

Provisional navy/gold game art, September 5, 2026. Thomas requested realistic goalie imagery and previously explicitly authorized local transparent-PNG/background-removal processing.

The built-in GPT Image tool generated the [source atlas](goalie-equipment-atlas-v1.png) with the exact [saved prompt](generation-prompt.txt), without reference images. It returned a 1774 × 887 **RGB image with a painted checkerboard**, rather than genuine transparency. The unequal object spacing was inspected before selecting individual crop bounds. The original generation output, `exec-3f626a1e-5dc2-480c-a133-124e65e65752.png`, remains unchanged in the Codex generated-image folder.

The runtime assets live in `public/assets/goalie/realistic-v1/`: torso, helmet, catcher, blocker, left/right pads, sleeve and pants. Every output is an RGBA PNG with four transparent pixels of padding. The torso retains its original framing after the sleeve cut described below so its runtime scale does not change. [The runtime manifest](../../../../public/assets/goalie/realistic-v1/manifest.json) records source/model/output hashes, crops, dimensions and alpha fractions.

## Local processing and verification

[The extraction script](../../../../tools/extract-goalie-atlas.py) uses the already available ONNX Runtime, Pillow and NumPy, and the previously checksum-verified official IS-Net model. Processing is entirely local CPU inference: no image upload, API key, new paid service or model installation.

The first segmentation pass incorrectly made some white pad leather translucent. [Source-bound refinements](alpha-refinements.json) restore the inspected pad silhouettes, with antialiased edges, and remove the painted background only inside the catcher's web apertures. There is **no global white-colour threshold**. White leather, facial detail, navy/gold trim and cage bars remain part of the images.

The first in-game composition also showed four arms: the generated torso had hanging sleeves while the rig independently moved its sleeve layers. A source-bound antialiased clip now removes those fixed sleeves, retaining the collar, chest, hem and shoulder caps. Its original 489 × 400 texture framing is preserved, and the renderer's shoulder pivots, hand travel and shot coverage remain unchanged. The navy/gold pants layer replaces the visible lower-body capsules behind the pads.

The final [dark-background contact sheet](evidence/goalie-parts-dark-contact.png) was visually inspected after those corrections. The [alpha verification](evidence/alpha-verification.json) checks actual alpha ranges, transparent padding, source/output hashes, opaque white-pad sample points and transparent catcher-web sample points. Visual review found no remaining checkerboard around the parts or white-pad interior transparency in that contact sheet. This is development review, not final owner approval.

Reproduce with the same local model:

```powershell
python tools/extract-goalie-atlas.py `
  --source docs/art/goalie/realistic-v1/goalie-equipment-atlas-v1.png `
  --model C:/Users/mtsli/AppData/Local/Temp/rinkreads-one-on-one-20260904/isnet-general-use.onnx `
  --output public/assets/goalie/realistic-v1 `
  --evidence docs/art/goalie/realistic-v1/evidence `
  --refinements docs/art/goalie/realistic-v1/alpha-refinements.json
```

Model MD5: `fc16ebd8b0c10d971d3513d564d01e29`. Model SHA-256: `60920e99c45464f2ba57bee2ad08c919a52bbf852739e96947fbb4358c0d964a`. The model is not committed or shipped to browsers. Its earlier provenance is documented in [the animation-pack extraction notes](../../animation-pack/ALPHA-EXTRACTION.md).

## Runtime boundary

These are front-view raster layers intended for articulated compositing. They are not a rigged mesh, a multi-angle character pack or evidence of true free-camera character geometry. The renderer still owns player position, motion, facing, puck state and teaching behavior. No tactical, physics or curriculum authority comes from the artwork. Integration and browser checks belong to the consuming renderer's change.
