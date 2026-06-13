// src/cognitive-gym/shootoutCore.js
// Pure helpers for the Shootout drill ("Pick Your Spot"): read the open part of
// the net and shoot it before the goalie covers it. No DOM, no canvas, so it is
// unit-testable in plain Node (mirrors bestOptionCore.js).
import { levelT, lerp } from "./gymEngine.js";
import { gradedPoints } from "./gymPoints.js";

// Per-shot clock (ms): even an open cell must be hit before this expires.
export const EASY_CLOCK_MS = 2600;
export const HARD_CLOCK_MS = 900;
// How long a CLOSING hole stays open (ms) before the goalie covers it. The pow
// curve below makes this shrink slowly early and fast at high levels, so the
// goalie effectively gets bigger faster the better you get.
export const EASY_HOLE_MS = 2200;
export const HARD_HOLE_MS = 550;
// Cells the goalie covers at the start of the shot (out of 6).
export const EASY_COVERED = 1;
export const HARD_COVERED = 4;
// Additional cells that close DURING the shot.
export const EASY_CLOSES = 0;
export const HARD_CLOSES = 2;

export function shotClockMs(level) {
  return Math.round(lerp(EASY_CLOCK_MS, HARD_CLOCK_MS, levelT(level)));
}
export function coveredAtStartCount(level) {
  return Math.round(lerp(EASY_COVERED, HARD_COVERED, levelT(level)));
}
export function closesDuringShotCount(level) {
  return Math.round(lerp(EASY_CLOSES, HARD_CLOSES, levelT(level)));
}
export function holeOpenMs(level) {
  return Math.round(lerp(EASY_HOLE_MS, HARD_HOLE_MS, Math.pow(levelT(level), 1.5)));
}

// The net is a 3-column by 2-row grid of tap targets. Big, forgiving cells.
export const CELL_LAYOUT = [
  { id: "gloveHi", col: 0, row: 0 },
  { id: "midHi",   col: 1, row: 0 },
  { id: "blkrHi",  col: 2, row: 0 },
  { id: "gloveLo", col: 0, row: 1 },
  { id: "fiveHole", col: 1, row: 1 },
  { id: "blkrLo",  col: 2, row: 1 },
];
export const CELL_IDS = CELL_LAYOUT.map((c) => c.id);
const COLS = 3;
const ROWS = 2;

// Pixel rects for each cell given a net rectangle { x, y, w, h }.
export function cellRects(net) {
  const cw = net.w / COLS;
  const ch = net.h / ROWS;
  return CELL_LAYOUT.map((c) => ({
    id: c.id,
    x: net.x + c.col * cw,
    y: net.y + c.row * ch,
    w: cw,
    h: ch,
  }));
}

// Which cell id contains the point, or null if none.
export function cellAtPoint(rects, px, py) {
  for (const r of rects) {
    if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return r.id;
  }
  return null;
}

// Deterministic pick of n distinct items from arr using rng.
export function pickN(arr, n, rng = Math.random) {
  const pool = arr.slice();
  const out = [];
  const k = Math.max(0, Math.min(n, pool.length));
  for (let i = 0; i < k; i += 1) {
    const idx = Math.floor(rng() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

// Build a shot for a level. `rng` is injectable so tests (and the head-to-head
// challenge link) are deterministic. Returns:
// { level, coveredAtStart:[id], openAtStart:[id], closeSchedule:[{cellId,atMs}], shotClockMs }
// Invariant: at least one cell is never covered, so a goal is always possible.
export function makeShot(level, { rng = Math.random } = {}) {
  const covered = pickN(CELL_IDS, coveredAtStartCount(level), rng);
  const open = CELL_IDS.filter((id) => !covered.includes(id));
  const closesN = Math.min(closesDuringShotCount(level), Math.max(0, open.length - 1));
  const closing = pickN(open, closesN, rng);
  const clock = shotClockMs(level);
  const hole = holeOpenMs(level);
  const closeSchedule = closing.map((cellId, i) => ({
    cellId,
    atMs: Math.round(closesN <= 1 ? hole : lerp(hole, clock * 0.9, i / (closesN - 1))),
  }));
  return { level, coveredAtStart: covered, openAtStart: open, closeSchedule, shotClockMs: clock };
}
