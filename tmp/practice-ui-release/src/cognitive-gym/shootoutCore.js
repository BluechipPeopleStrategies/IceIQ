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
  // Inclusive edges: a point on a shared seam maps to the first matching
  // cell in layout order. Deliberate, so there is no dead zone between cells.
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

// Weighted pick of n distinct items. `weights` maps item -> relative weight
// (missing = 1). Heavier items are chosen more often. Falls back to uniform
// when weights is null so callers can pass a profile's weights or nothing.
export function weightedPickN(arr, n, weights, rng = Math.random) {
  if (!weights) return pickN(arr, n, rng);
  const pool = arr.slice();
  const out = [];
  const k = Math.max(0, Math.min(n, pool.length));
  for (let i = 0; i < k; i += 1) {
    let total = 0;
    for (const item of pool) total += weights[item] > 0 ? weights[item] : 1;
    let roll = rng() * total;
    let idx = pool.length - 1;
    for (let j = 0; j < pool.length; j += 1) {
      roll -= weights[pool[j]] > 0 ? weights[pool[j]] : 1;
      if (roll < 0) { idx = j; break; }
    }
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

// Session goalie tendencies (Punch-Out-style pattern reads). The report line
// is honest: the weights genuinely bias which cells the goalie covers, so a
// player who uses the scouting report scores more. Weight 3 vs 1 makes the
// named cells roughly 3x as likely to be covered.
export const GOALIE_PROFILES = [
  {
    id: "gloveHugger",
    report: "Hugs the glove side. The blocker side opens up.",
    weights: { gloveHi: 3, gloveLo: 3, midHi: 1, fiveHole: 1, blkrHi: 1, blkrLo: 1 },
  },
  {
    id: "blockerWall",
    report: "Leans on the blocker. Look glove side.",
    weights: { blkrHi: 3, blkrLo: 3, midHi: 1, fiveHole: 1, gloveHi: 1, gloveLo: 1 },
  },
  {
    id: "earlyButterfly",
    report: "Drops into the butterfly early. Shoot high.",
    weights: { gloveLo: 3, fiveHole: 3, blkrLo: 3, gloveHi: 1, midHi: 1, blkrHi: 1 },
  },
  {
    id: "standTall",
    report: "Stays tall and covers up top. Keep it low.",
    weights: { gloveHi: 3, midHi: 3, blkrHi: 3, gloveLo: 1, fiveHole: 1, blkrLo: 1 },
  },
];

// Pick this session's goalie. Deterministic given rng.
export function makeGoalieProfile(rng = Math.random) {
  return GOALIE_PROFILES[Math.floor(rng() * GOALIE_PROFILES.length)];
}

// Forgiving aim: the cell whose rect is nearest the point, if the point is
// within `slackFrac` of a cell dimension from that rect (young thumbs, small
// far-away net). A point inside a rect is distance 0, so this is a strict
// superset of cellAtPoint.
export function nearestCellWithin(rects, px, py, slackFrac = 0.6) {
  let best = null;
  let bestDist = Infinity;
  for (const r of rects) {
    const dx = Math.max(r.x - px, 0, px - (r.x + r.w));
    const dy = Math.max(r.y - py, 0, py - (r.y + r.h));
    const d = Math.hypot(dx, dy);
    if (d < bestDist) { bestDist = d; best = r; }
  }
  if (!best) return null;
  const slack = slackFrac * Math.min(best.w, best.h);
  return bestDist <= slack ? best.id : null;
}

// Build a shot for a level. `rng` is injectable so tests (and the head-to-head
// challenge link) are deterministic. `weights` (optional, from a goalie
// profile) biases which cells the goalie covers; omitted = uniform. Returns:
// { level, coveredAtStart:[id], openAtStart:[id], closeSchedule:[{cellId,atMs}], shotClockMs }
// Invariant: at least one cell is never covered, so a goal is always possible.
export function makeShot(level, { rng = Math.random, weights = null } = {}) {
  const covered = weightedPickN(CELL_IDS, coveredAtStartCount(level), weights, rng);
  const open = CELL_IDS.filter((id) => !covered.includes(id));
  const closesN = Math.min(closesDuringShotCount(level), Math.max(0, open.length - 1));
  const closing = weightedPickN(open, closesN, weights, rng);
  const clock = shotClockMs(level);
  const hole = holeOpenMs(level);
  const closeSchedule = closing.map((cellId, i) => ({
    cellId,
    atMs: Math.round(closesN <= 1 ? hole : lerp(hole, clock * 0.9, i / (closesN - 1))), // ternary avoids divide-by-zero when closesN <= 1
  }));
  return { level, coveredAtStart: covered, openAtStart: open, closeSchedule, shotClockMs: clock };
}

// Is the cell open (scorable) at tapMs? Covered-at-start cells are never open;
// a closing cell is open only before its atMs.
export function isCellOpenAt(shot, cellId, tapMs) {
  if (!CELL_IDS.includes(cellId)) return false;
  if (shot.coveredAtStart.includes(cellId)) return false;
  const sched = shot.closeSchedule.find((c) => c.cellId === cellId);
  if (sched && tapMs >= sched.atMs) return false;
  return true;
}

// Score a tap. Goal only when an open cell is tapped in time. Points reward
// speed: feed gradedPoints a normalized value tapMs/shotClockMs (0 = instant ->
// max). A covered/closed cell, a miss, or an expired clock is 0.
// Returns { success, points, normElapsed }.
export function scoreShot(cellId, tapMs, shot) {
  const clock = shot.shotClockMs || 1;
  const norm = Math.min(Math.max(tapMs / clock, 0), 1);
  const inTime = tapMs <= clock;
  const success = cellId != null && inTime && isCellOpenAt(shot, cellId, tapMs);
  if (!success) return { success: false, points: 0, normElapsed: norm };
  return { success: true, points: gradedPoints(norm), normElapsed: norm };
}
