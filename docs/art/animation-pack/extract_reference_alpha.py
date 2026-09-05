"""Local, non-destructive alpha extraction for the four-view concept sheets.

Requires Pillow, NumPy and onnxruntime. No API, credentials or image upload.
The caller supplies the official IS-Net ONNX model and its verified checksum.
Original RGB files are never overwritten. Outputs remain concept references.
"""

import argparse
import hashlib
import json
import re
from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image, ImageDraw


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def predict_alpha(session, image):
    """Match rembg v2.0.67 IS-Net preprocessing; use local CPU inference."""
    rgb = np.asarray(image.convert("RGB").resize((1024, 1024), Image.Resampling.LANCZOS))
    data = rgb.astype(np.float32) / max(float(rgb.max()), 1e-6)
    data = (data - 0.5).transpose((2, 0, 1))[None, ...]
    output = session.run(None, {session.get_inputs()[0].name: data})[0]
    mask = output[0, 0]
    mask = (mask - mask.min()) / max(float(mask.max() - mask.min()), 1e-6)
    alpha = Image.fromarray((np.clip(mask, 0, 1) * 255).astype(np.uint8))
    return alpha.resize(image.size, Image.Resampling.LANCZOS)


def proof_image(rgba, title, size=680):
    display = rgba.copy()
    display.thumbnail((size, size), Image.Resampling.LANCZOS)
    width, height = display.size
    proof = Image.new("RGB", (width * 2, height + 38), "#1b1b1b")
    draw = ImageDraw.Draw(proof)
    draw.text((12, 12), title + " | BLACK / WHITE COMPOSITES", fill="white")
    for index, color in enumerate(("#090909", "#ffffff")):
        background = Image.new("RGBA", display.size, color)
        background.alpha_composite(display)
        proof.paste(background.convert("RGB"), (index * width, 38))
    return proof


def process(session, source, proof_dir, model_hash, row_cut=None, refinement_path=None):
    original = Image.open(source)
    rgb = original.convert("RGB")
    width, height = rgb.size
    row_cut = row_cut or height // 2
    if not 0 < row_cut < height:
        raise ValueError("row_cut must lie inside the source canvas")
    row_edges = (0, row_cut, height)
    # Each isolated character receives the full model resolution. Four-view
    # sheets are not runtime atlases: this only preserves the original layout.
    alpha = Image.new("L", rgb.size, 0)
    tile_stats = []
    for row in range(2):
        for col in range(2):
            box = (col * width // 2, row_edges[row],
                   (col + 1) * width // 2, row_edges[row + 1])
            predicted = predict_alpha(session, rgb.crop(box))
            # Remove numerical model noise and make high-confidence subject
            # interiors fully opaque. Do not threshold by RGB/white brightness.
            a = np.asarray(predicted).copy()
            a[a <= 3] = 0
            a[a >= 252] = 255
            alpha.paste(Image.fromarray(a), box[:2])
            tile_stats.append({"row": row, "column": col,
                               "transparentFraction": round(float((a == 0).mean()), 6)})
            print(source.name, "tile", row, col, "processed", flush=True)
    refinement_pixels = 0
    if refinement_path:
        config = json.loads(refinement_path.read_text(encoding="utf-8"))
        if config["sourceSha256"] != sha256(source):
            raise ValueError("The local refinement polygons belong to a different source")
        region = Image.new("L", rgb.size, 0)
        draw = ImageDraw.Draw(region)
        for polygon in config["polygons"]:
            draw.polygon([tuple(point) for point in polygon], fill=255)
        pixels = np.asarray(rgb).astype(np.float32)
        a = np.asarray(alpha).copy()
        inside = (np.asarray(region) > 0) & ((pixels.max(axis=2) - pixels.min(axis=2)) <= config["neutralChannelSpreadMax"])
        # This refinement applies only to inspected, source-hash-bound catcher
        # web apertures. It is not a global white-background color key.
        hole_alpha = np.clip((config["brightTransparent"] - pixels.min(axis=2)) /
                             (config["brightTransparent"] - config["brightStart"]), 0, 1) * 255
        changed = inside & (hole_alpha < a)
        refinement_pixels = int(changed.sum())
        a[inside] = np.minimum(a[inside], hole_alpha[inside]).astype(np.uint8)
        alpha = Image.fromarray(a)
    output = rgb.copy()
    output.putalpha(alpha)
    out_path = source.with_name(re.sub(r"-reference-v(\d+)$", r"-transparent-v\1", source.stem) + ".png")
    if out_path == source:
        raise ValueError("Refusing to overwrite original")
    output.save(out_path, optimize=True)
    proof_dir.mkdir(parents=True, exist_ok=True)
    proof_path = proof_dir / (source.stem + "-alpha-proof-v1.png")
    proof_image(output, source.stem).save(proof_path)
    a = np.asarray(alpha)
    entry = {
        "sourcePath": str(source.resolve()), "sourceSha256": sha256(source),
        "sourceMode": original.mode, "sourceNativeSize": [width, height],
        "outputPath": str(out_path.resolve()), "outputSha256": sha256(out_path),
        "outputMode": output.mode, "outputSize": [width, height],
        "alphaMin": int(a.min()), "alphaMax": int(a.max()),
        "transparentPixelFraction": round(float((a == 0).mean()), 6),
        "partialAlphaPixelFraction": round(float(((a > 0) & (a < 255)).mean()), 6),
        "opaquePixelFraction": round(float((a == 255).mean()), 6),
        "alphaBounds": alpha.getbbox(), "tileStats": tile_stats,
        "proofPath": str(proof_path.resolve()),
        "model": "isnet-general-use", "modelSha256": model_hash,
        "method": "local CPU ONNX inference, per isolated character; no global RGB color-keying" +
                  ("; inspected catcher-web aperture alpha refinement" if refinement_path else ""),
        "rowSplitPx": row_cut,
        "refinementFile": str(refinement_path) if refinement_path else None,
        "refinementPixels": refinement_pixels,
        "reviewStatus": "requires-visual-review",
        "runtimeApproved": False,
    }
    return entry


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("sources", nargs="+", type=Path)
    parser.add_argument("--model", required=True, type=Path)
    parser.add_argument("--proof-dir", required=True, type=Path)
    parser.add_argument("--report", required=True, type=Path)
    parser.add_argument("--row-cut", type=int, help="Split in the empty gutter between the two character rows")
    parser.add_argument("--refinements", type=Path, help="Optional source-hash-bound local web-aperture refinements")
    args = parser.parse_args()
    model_bytes = args.model.read_bytes()
    if hashlib.md5(model_bytes).hexdigest() != "fc16ebd8b0c10d971d3513d564d01e29":
        raise ValueError("IS-Net model does not match the official rembg checksum")
    options = ort.SessionOptions()
    options.intra_op_num_threads = 4
    session = ort.InferenceSession(str(args.model), sess_options=options,
                                   providers=["CPUExecutionProvider"])
    entries = [process(session, source, args.proof_dir,
                       hashlib.sha256(model_bytes).hexdigest(), args.row_cut,
                       args.refinements) for source in args.sources]
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps({"assets": entries}, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(entries, indent=2), flush=True)


if __name__ == "__main__":
    main()
