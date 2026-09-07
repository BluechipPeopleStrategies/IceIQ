# Provisional overhead equipment artwork

Thomas requested navy and gold jerseys and helmets, clearer equipment, lighter visible skin and transparent images. GPT Image produced the reference atlas in this folder. Because the generated background was not true transparency, the explicitly authorized local background-removal pass produced an RGBA atlas using the recorded ONNX model. Exact source, model and output hashes are in `alpha-report.json`.

The four cropped runtime bodies and their hashes are in `public/assets/characters/top-down-v2/manifest.json`. These are bodies only. Renderers remain responsible for authoritative facing, stick directions, puck attachment and teaching cues. Guided curriculum now supplies explicit poses and sticks; contexts with their own stick geometry keep it.

The reference and alpha proof were visually inspected during development. The art is provisionally used in the review build; it has not been approved by Thomas as final character art. `runtimeApproved: false` in the original removal report means no final owner approval was recorded, not that this review build avoids the asset. These PNGs are not rigged models or interchangeable free-camera frames.

Original generation output: `exec-7860b3d7-534b-4d62-991e-6dcdaa7c8a39.png` in the current Codex generated-image session. The committed source atlas is the reproducible input for this runtime crop set.
