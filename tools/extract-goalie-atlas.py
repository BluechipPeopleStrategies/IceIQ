"""Extract source-bound goalie parts with local IS-Net alpha, without image uploads.

Pillow, NumPy and ONNX Runtime are required. The model is kept outside the repo.
Source RGB is never changed; no global white-keying is used on white equipment.
"""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image, ImageDraw

MODEL_MD5 = "fc16ebd8b0c10d971d3513d564d01e29"
PARTS = {
    "torso": (10, 10, 540, 443),
    "helmet": (574, 6, 912, 443),
    "catcher": (923, 14, 1360, 443),
    "blocker": (1403, 21, 1735, 443),
    "pad-left": (130, 443, 364, 877),
    "pad-right": (583, 443, 814, 877),
    "sleeve": (1000, 441, 1190, 877),
    "pants": (1338, 438, 1728, 878),
}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def alpha_from_model(session, image):
    rgb = np.asarray(image.convert("RGB").resize((1024, 1024), Image.Resampling.LANCZOS))
    values = rgb.astype(np.float32) / max(float(rgb.max()), 1e-6)
    values = (values - .5).transpose((2, 0, 1))[None, ...]
    output = session.run(None, {session.get_inputs()[0].name: values})[0][0, 0]
    output = (output - output.min()) / max(float(output.max() - output.min()), 1e-6)
    mask = Image.fromarray((np.clip(output, 0, 1) * 255).astype(np.uint8))
    pixels = np.asarray(mask.resize(image.size, Image.Resampling.LANCZOS)).copy()
    pixels[pixels <= 3] = 0
    pixels[pixels >= 252] = 255
    return Image.fromarray(pixels)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--model", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--evidence", required=True, type=Path)
    parser.add_argument("--refinements", type=Path)
    args = parser.parse_args()
    original = Image.open(args.source)
    if original.size != (1774, 887):
        raise ValueError("This crop recipe belongs to the inspected 1774 x 887 atlas.")
    model_bytes = args.model.read_bytes()
    if hashlib.md5(model_bytes).hexdigest() != MODEL_MD5:
        raise ValueError("Model differs from the previously verified official IS-Net model.")
    options = ort.SessionOptions()
    options.intra_op_num_threads = 4
    session = ort.InferenceSession(str(args.model), sess_options=options, providers=["CPUExecutionProvider"])
    args.output.mkdir(parents=True, exist_ok=True)
    args.evidence.mkdir(parents=True, exist_ok=True)
    refinements = json.loads(args.refinements.read_text()) if args.refinements else None
    if refinements and refinements["sourceSha256"] != digest(args.source):
        raise ValueError("Refinement masks belong to another source.")
    entries, displays = {}, {}
    for name, box in PARTS.items():
        crop = original.convert("RGB").crop(box)
        alpha = alpha_from_model(session, crop)
        original_bounds = alpha.getbbox()
        refinement_pixels = 0
        if refinements and name in refinements["parts"]:
            # Only manually inspected, source-bound polygons are editable here.
            # This never globally colour-keys white pads or jersey details.
            settings = refinements["parts"][name]
            a = np.asarray(alpha).copy()
            original_alpha = a.copy()
            if settings.get("silhouettePolygon"):
                # Opaque equipment can be traced at source resolution when
                # segmentation mistakes bright leather for background. Render
                # its inspected contour at 4x for a clean antialiased edge.
                silhouette = Image.new("L", (crop.width * 4, crop.height * 4), 0)
                ImageDraw.Draw(silhouette).polygon(
                    [((x - box[0]) * 4, (y - box[1]) * 4) for x, y in settings["silhouettePolygon"]], fill=255)
                a = np.asarray(silhouette.resize(crop.size, Image.Resampling.LANCZOS)).copy()
                a[a <= 3] = 0
                a[a >= 252] = 255
            if settings.get("clipPolygon"):
                # Articulated equipment uses its own animated sleeve layers.
                # Clip only the inspected fixed sleeve silhouette from the
                # torso, leaving source RGB and its texture framing unchanged.
                clip = Image.new("L", (crop.width * 4, crop.height * 4), 0)
                ImageDraw.Draw(clip).polygon(
                    [((x - box[0]) * 4, (y - box[1]) * 4) for x, y in settings["clipPolygon"]], fill=255)
                clip = np.asarray(clip.resize(crop.size, Image.Resampling.LANCZOS))
                a = np.minimum(a, clip)
                a[a <= 3] = 0
            def polygon_region(polygons):
                region = Image.new("L", crop.size, 0)
                draw = ImageDraw.Draw(region)
                for polygon in polygons:
                    draw.polygon([(x - box[0], y - box[1]) for x, y in polygon], fill=255)
                return np.asarray(region) == 255
            a[polygon_region(settings.get("transparentPolygons", []))] = 0
            a[polygon_region(settings.get("opaquePolygons", []))] = 255
            neutral = settings.get("neutralRemoval")
            if neutral:
                pixels = np.asarray(crop).astype(np.float32)
                region = polygon_region(neutral["polygons"])
                region &= (pixels.max(axis=2) - pixels.min(axis=2)) <= neutral["channelSpreadMax"]
                hole_alpha = np.clip((neutral["brightTransparent"] - pixels.min(axis=2)) /
                                    (neutral["brightTransparent"] - neutral["brightStart"]), 0, 1) * 255
                a[region] = np.minimum(a[region], hole_alpha[region]).astype(np.uint8)
            refinement_pixels = int((original_alpha != a).sum())
            alpha = Image.fromarray(a)
        preserve_bounds = bool(refinements and refinements["parts"].get(name, {}).get("preserveOriginalBounds"))
        bounds = original_bounds if preserve_bounds else alpha.getbbox()
        if not bounds:
            raise ValueError(f"No subject found for {name}.")
        part = crop.copy()
        part.putalpha(alpha)
        part = part.crop(bounds)
        result = Image.new("RGBA", (part.width + 8, part.height + 8), (0, 0, 0, 0))
        result.alpha_composite(part, (4, 4))
        path = args.output / f"{name}.png"
        result.save(path, optimize=True)
        a = np.asarray(result.getchannel("A"))
        entries[name] = {
            "url": f"/assets/goalie/realistic-v1/{name}.png", "sha256": digest(path),
            "width": result.width, "height": result.height, "mode": result.mode,
            "sourceCrop": box, "subjectBoundsInCrop": bounds, "transparentPaddingPx": 4,
            "alphaMin": int(a.min()), "alphaMax": int(a.max()),
            "transparentFraction": round(float((a == 0).mean()), 6),
            "partialAlphaFraction": round(float(((a > 0) & (a < 255)).mean()), 6),
            "opaqueFraction": round(float((a == 255).mean()), 6),
            "refinementPixels": refinement_pixels,
            "preserveOriginalBounds": preserve_bounds,
        }
        displays[name] = result
        print(name, result.size, entries[name]["transparentFraction"], flush=True)
    manifest = {
        "version": "rinkreads-goalie-realistic-parts-v1", "status": "provisional-game-art",
        "ownerFinalApproval": False, "source": "docs/art/goalie/realistic-v1/goalie-equipment-atlas-v1.png",
        "sourceSha256": digest(args.source), "sourceSize": original.size, "sourceMode": original.mode,
        "generator": "built-in GPT Image", "method": "local CPU IS-Net per isolated equipment part plus inspected source-bound pad contours and catcher apertures; no global white colour key",
        "model": "isnet-general-use", "modelSha256": hashlib.sha256(model_bytes).hexdigest(),
        "refinementFile": args.refinements.name if args.refinements else None,
        "parts": entries,
        "limitations": ["Front-view raster parts, not rigged meshes or free-angle geometry.", "Catcher web and white pad interiors use inspected source-bound alpha refinements.", "No tactical or physics authority is encoded in these images."],
    }
    (args.output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    sheet = Image.new("RGB", (1280, 980), "#071425")
    draw = ImageDraw.Draw(sheet)
    for index, (name, image) in enumerate(displays.items()):
        x, y = (index % 4) * 320, (index // 4) * 490
        draw.text((x + 15, y + 14), name.upper(), fill="#D8B45A")
        display = image.copy()
        display.thumbnail((294, 435), Image.Resampling.LANCZOS)
        sheet.paste(display, (x + (320 - display.width) // 2, y + 42), display)
    sheet.save(args.evidence / "goalie-parts-dark-contact.png", optimize=True)
    print(json.dumps(manifest, indent=2), flush=True)


if __name__ == "__main__":
    main()
