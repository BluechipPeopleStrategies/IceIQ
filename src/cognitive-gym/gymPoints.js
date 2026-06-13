// src/cognitive-gym/gymPoints.js
// Graded scoring for the Cognitive Gym, GeoGuessr-style: closer is worth more.
// Pure and dependency-free so it is unit-testable without a browser.

export const MAX_REP = 1000; // points for a perfect, bang-on rep
export const DECAY = 0.12;   // smaller = points fall off faster with error

// Points for one rep given a NORMALIZED error in [0, 1] (0 = exact).
// Exponential decay: exact -> MAX_REP, larger error -> smoothly toward 0.
export function gradedPoints(normError, { maxRep = MAX_REP, decay = DECAY } = {}) {
  const e = Math.min(Math.max(normError, 0), 1);
  return Math.round(maxRep * Math.exp(-e / decay));
}
