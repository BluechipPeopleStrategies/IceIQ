// qc-grid.mjs — render every pending scenario seed into one labeled grid image
// for quick visual QC (and self-review before sending). Each cell shows the
// board with the revealed answer (green ring = correct, gold arrow = the pass
// from the puck) plus the actual question prompt printed underneath.
//
// Usage: node scripts/qc-grid.mjs [seedDir] [outPng]
//   defaults: docs/ai-pipeline/_pending-seeds  →  C:/tmp/qc-grid.png

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { renderBoard } from "./board-svg.mjs";

const KIND = { player: "home", teammate: "home", defender: "opp", goalie: "goalie", puck: "puck" };
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function seedToSpec(s) {
  const byId = Object.fromEntries(s.actors.map(a => [a.id, a]));
  const actors = s.actors.map(a => ({ kind: KIND[a.kind] || "home", x: a.x, y: a.y, tag: a.tag }));
  const arrows = [], rings = [];
  const puck = s.actors.find(a => a.kind === "puck");
  if (s.interaction?.kind === "selection") {
    for (const id of (s.correct?.ids || [])) {
      const t = byId[id]; if (!t) continue;
      rings.push({ x: t.x, y: t.y, r: 0.05 });
      if (puck) arrows.push({ x1: puck.x, y1: puck.y, x2: t.x, y2: t.y, color: "#C9A24B" });
    }
  } else if (s.interaction?.kind === "point" && s.correct) {
    rings.push({ x: s.correct.x, y: s.correct.y, r: s.correct.tolerance || 0.06 });
  }
  const nets = s.stage?.zone === "off-zone" ? ["right"] : s.stage?.zone === "def-zone" ? ["left"] : [];
  return { actors, arrows, rings, nets };
}

function wrap(text, max) {
  const words = String(text).split(" "), lines = []; let cur = "";
  for (const w of words) { if ((cur + " " + w).trim().length > max) { lines.push(cur.trim()); cur = w; } else cur += " " + w; }
  if (cur.trim()) lines.push(cur.trim());
  return lines;
}

const seedDir = process.argv[2] || "docs/ai-pipeline/_pending-seeds";
const outPng = process.argv[3] || "C:/tmp/qc-grid.png";
const files = readdirSync(seedDir).filter(f => f.endsWith(".json")).sort();

const CW = 620, BH = 413, LH = 58, PH = 96;
const cells = [];
for (const f of files) {
  const s = JSON.parse(readFileSync(join(seedDir, f), "utf8"));
  const label = f.replace(/\.json$/, "");
  const curric = `${s.levels?.[0] || "?"}  ·  ${s.nodeId || "?"}  ·  difficulty ${s.difficulty}`;
  const board = await sharp(Buffer.from(renderBoard(seedToSpec(s)))).resize(CW, BH).toBuffer();
  const lines = wrap("Q: " + (s.interaction?.prompt || ""), 64);
  const tspans = lines.map((ln, i) => `<text x="12" y="${22 + i * 22}" font-family="Arial" font-size="17" fill="#0B1A33">${esc(ln)}</text>`).join("");
  const labelSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${CW}" height="${LH}"><rect width="${CW}" height="${LH}" fill="#0B1A33"/><text x="12" y="24" font-family="Arial" font-size="18" font-weight="700" fill="#C9A24B">${esc(label)}</text><text x="12" y="48" font-family="Arial" font-size="14" fill="#9fb6cc">${esc(curric)}</text></svg>`);
  const promptSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${CW}" height="${PH}"><rect width="${CW}" height="${PH}" fill="#eef2f6"/>${tspans}<text x="12" y="${PH - 10}" font-family="Arial" font-size="13" fill="#3a8">green ring = correct answer</text></svg>`);
  cells.push(await sharp({ create: { width: CW, height: LH + BH + PH, channels: 4, background: "#ffffff" } })
    .composite([{ input: labelSvg, top: 0, left: 0 }, { input: board, top: LH, left: 0 }, { input: promptSvg, top: LH + BH, left: 0 }]).png().toBuffer());
}

const COLS = 2, ROWS = Math.ceil(cells.length / COLS), CH = LH + BH + PH, GAP = 10;
const comp = cells.map((c, i) => ({ input: c, left: (i % COLS) * (CW + GAP), top: Math.floor(i / COLS) * (CH + GAP) }));
await sharp({ create: { width: COLS * CW + (COLS - 1) * GAP, height: ROWS * CH + (ROWS - 1) * GAP, channels: 4, background: "#cdd6df" } })
  .composite(comp).png().toFile(outPng);
console.log(`wrote ${files.length} boards → ${outPng}`);
