// src/cognitive-gym/anticipationCore.js
// Pure helpers for Read the Pass: travel direction geometry and graded scoring.
// Scoring is in REAL feet on a regulation rink so the result is the same for a
// given physical miss no matter which direction the puck travels (the old
// per-axis-pixel normalization made top/bottom passes far more forgiving).
import { gradedPoints } from "./gymPoints.js";

export const DIRECTIONS = ["lr", "rl", "tb", "bt"];

// Regulation rink, used to turn a pixel miss into a real distance.
export const RINK_LENGTH_FT = 200; // along the long (x) axis
export const RINK_WIDTH_FT = 85; //   across the short (y) axis
export const M_PER_FT = 0.3048;

// Error (in feet) at which a rep scores ~0 points. Tunable.
const REFERENCE_FT = 40;

// Which axis the GUESS varies along. Horizontal travel (lr/rl) crosses a
// VERTICAL gold bar, so the guess varies in Y. Vertical travel (tb/bt) crosses
// a HORIZONTAL bar, so the guess varies in X.
export function guessAxis(dir) {
  return dir === "lr" || dir === "rl" ? "y" : "x";
}

// Feet per pixel along the guess axis. A guess in Y measures across the rink
// WIDTH (85 ft over H px); a guess in X measures along the rink LENGTH (200 ft
// over W px). This is what makes the score consistent across orientations.
export function feetPerPixel(axis, W, H) {
  return axis === "y" ? RINK_WIDTH_FT / H : RINK_LENGTH_FT / W;
}

// Grade one guess in real feet.
//   guessPx, crossPx : pixel coordinates along the guess axis
//   ftPerPx          : from feetPerPixel(axis, W, H)
//   toleranceFt      : success window in feet (drives leveling)
// Returns { success, errorFt, points }.
export function scorePass(guessPx, crossPx, ftPerPx, toleranceFt) {
  const errorFt = Math.abs(guessPx - crossPx) * ftPerPx;
  const success = errorFt <= toleranceFt;
  const points = gradedPoints(errorFt / REFERENCE_FT);
  return { success, errorFt, points };
}

// Human-readable miss distance in the player's chosen unit. Under half a foot
// reads as a clean "bang on". unit: "ft" | "m".
export function formatDistance(errorFt, unit = "ft") {
  if (!(errorFt > 0.5)) return "bang on";
  if (unit === "m") return `off by ${(errorFt * M_PER_FT).toFixed(1)} m`;
  return `off by ${errorFt.toFixed(1)} ft`;
}
