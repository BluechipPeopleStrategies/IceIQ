#!/usr/bin/env node
// Extracts individual posed sprites from the Downloads sprite sheets into
// public/sprites/ so we can mock up sprite-composited scenes in the browser.
// Sheets are transparent-background grids: black skaters 4x2, goalies 4x4.

import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DL = "C:/Users/mtsli/Downloads";
const out = resolve(ROOT, "public/sprites");
mkdirSync(out, { recursive: true });

async function cell(file, cols, rows, c, r, name) {
  const img = sharp(file);
  const m = await img.metadata();
  const cw = Math.floor(m.width / cols), ch = Math.floor(m.height / rows);
  await sharp(file)
    .extract({ left: c * cw, top: r * ch, width: cw, height: ch })
    .trim()
    .png()
    .toFile(resolve(out, name + ".png"));
  console.log("wrote", name);
}

const BLACK = `${DL}/Player Black Sheet.png`;
const GOALIE = `${DL}/Goalie Sheet.png`;

// Black skaters: 4 cols x 2 rows
await cell(BLACK, 4, 2, 0, 0, "black-back");   // back view — breakaway POV
await cell(BLACK, 4, 2, 3, 0, "black-drive");  // 3/4 forward, carrying
await cell(BLACK, 4, 2, 2, 1, "black-handle"); // front handling
// Goalies: 4 cols x 4 rows (top two rows are yellow, transparent bg)
await cell(GOALIE, 4, 4, 3, 0, "goalie-front"); // yellow, front square
await cell(GOALIE, 4, 4, 2, 0, "goalie-ready"); // yellow, ready
await cell(GOALIE, 4, 4, 1, 1, "goalie-butterfly");

console.log("done -> public/sprites/");
