import { isCellOpenAt } from "./shootoutCore.js";

// The visual layer deliberately mirrors shootoutCore.CELL_LAYOUT. Keeping the
// normalized centres here makes the WebGL scene independent of canvas pixels,
// while tests pin the IDs/order that scoreShot accepts.
export const SHOOTOUT_CELL_LAYOUT = Object.freeze([
  Object.freeze({ id: "gloveHi", column: 0, row: 0, x: -1.28, y: 0.54 }),
  Object.freeze({ id: "midHi", column: 1, row: 0, x: 0, y: 0.54 }),
  Object.freeze({ id: "blkrHi", column: 2, row: 0, x: 1.28, y: 0.54 }),
  Object.freeze({ id: "gloveLo", column: 0, row: 1, x: -1.28, y: -0.62 }),
  Object.freeze({ id: "fiveHole", column: 1, row: 1, x: 0, y: -0.62 }),
  Object.freeze({ id: "blkrLo", column: 2, row: 1, x: 1.28, y: -0.62 }),
]);

export function goalieTargetForCell(cellId) {
  return SHOOTOUT_CELL_LAYOUT.find(({ id }) => id === cellId) || { x: 0, y: 0 };
}

export const SHOOTOUT_MOUTH = Object.freeze({ left: -2.05, right: 2.05, bottom: -1.32, top: 1.32 });
export function shootoutHitRegion(cell) {
  const width = (SHOOTOUT_MOUTH.right - SHOOTOUT_MOUTH.left) / 3;
  const height = (SHOOTOUT_MOUTH.top - SHOOTOUT_MOUTH.bottom) / 2;
  return { x: SHOOTOUT_MOUTH.left + (cell.column + .5) * width, y: SHOOTOUT_MOUTH.top - (cell.row + .5) * height, width, height };
}

// The normalized actor adapter spans 9.4 world units. These lines must use
// the same coordinate frame as the offside scorer's .375/.625 boundaries.
export const BEST_OPTION_BLUE_LINES = Object.freeze([-.125 * 9.4, .125 * 9.4]);

export function describeShootoutCells(shot, elapsedMs) {
  return SHOOTOUT_CELL_LAYOUT.map((cell) => {
    const open = isCellOpenAt(shot, cell.id, elapsedMs);
    return { ...cell, state: open ? "open" : "covered", cue: open ? "OPEN" : "COVERED" };
  });
}

export function coverageReach(shot, cellId, elapsedMs, reachMs = 420) {
  if (shot.coveredAtStart.includes(cellId)) return 1;
  const closing = shot.closeSchedule.find(({ cellId: id }) => id === cellId);
  if (!closing) return 0;
  const start = closing.atMs - reachMs;
  if (elapsedMs <= start) return 0;
  if (elapsedMs >= closing.atMs) return 1;
  return (elapsedMs - start) / reachMs;
}

export function shiftPausedTimestamp(value, pausedMs) {
  return value == null ? value : value + Math.max(0, pausedMs || 0);
}

export function normalizedRinkPoint(point, width, height) {
  return {
    x: (point.x / Math.max(1, width) - 0.5) * 9.4,
    z: (point.y / Math.max(1, height) - 0.5) * 4,
  };
}
