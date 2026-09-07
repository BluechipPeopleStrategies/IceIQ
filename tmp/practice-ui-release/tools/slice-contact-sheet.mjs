#!/usr/bin/env node
// Slices a 5-column x 3-row contact sheet (tiles numbered 10..24 left-to-right,
// top-to-bottom) into individual tile images for the content factory.
// Outputs public/assets/images/<run>/tile-<n>.png — the paths factoryQuestions.json
// (via factory-to-bank.mjs) points its media.url at.
//
// Usage: node tools/slice-contact-sheet.mjs <contactSheetImage> [run]
//   e.g. node tools/slice-contact-sheet.mjs ./contact-sheet.png factory-run-01

import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const sheetPath = process.argv[2];
const run = process.argv[3] || "factory-run-01";
if (!sheetPath) {
  console.error("Usage: node tools/slice-contact-sheet.mjs <contactSheetImage> [run]");
  process.exit(1);
}

const COLS = 5, ROWS = 3, FIRST_TILE = 10;
const outDir = resolve(ROOT, "public/assets/images", run);
mkdirSync(outDir, { recursive: true });

const src = resolve(process.cwd(), sheetPath);
const img = sharp(src);
const meta = await img.metadata();
const cellW = Math.floor(meta.width / COLS);
const cellH = Math.floor(meta.height / ROWS);

let n = 0;
for (let idx = 0; idx < COLS * ROWS; idx++) {
  const r = Math.floor(idx / COLS), c = idx % COLS;
  const tile = FIRST_TILE + idx;
  const left = Math.min(c * cellW, meta.width - cellW);
  const top = Math.min(r * cellH, meta.height - cellH);
  await sharp(src)
    .extract({ left, top, width: cellW, height: cellH })
    .png()
    .toFile(resolve(outDir, `tile-${tile}.png`));
  n++;
}
console.log(`Sliced ${n} tiles (${cellW}x${cellH} each) -> ${outDir}`);
console.log("Run `npm run dev` and the factory questions will show their images.");
