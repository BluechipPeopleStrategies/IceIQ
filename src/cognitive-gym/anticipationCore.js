// src/cognitive-gym/anticipationCore.js
// Pure helpers for Read the Pass: travel direction geometry and graded scoring.
import { gradedPoints } from "./gymPoints.js";

export const DIRECTIONS = ["lr", "rl", "tb", "bt"];

// Which axis the GUESS varies along. Horizontal travel (lr/rl) crosses a
// VERTICAL gold bar, so the guess varies in Y. Vertical travel (tb/bt) crosses
// a HORIZONTAL bar, so the guess varies in X.
export function guessAxis(dir) {
  return dir === "lr" || dir === "rl" ? "y" : "x";
}

// Grade one guess along the cross-line.
//   guess, cross : coordinate along the guess axis (px)
//   span         : rink size along that axis (px) used to normalize error
//   tolerance    : success window radius (px)
// Returns { success, error, points }.
export function scorePass(guess, cross, span, tolerance) {
  const error = Math.abs(guess - cross);
  const success = error <= tolerance;
  const points = gradedPoints(span > 0 ? error / span : 1);
  return { success, error, points };
}
