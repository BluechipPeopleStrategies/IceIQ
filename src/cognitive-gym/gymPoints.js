// src/cognitive-gym/gymPoints.js
// Graded scoring for the Cognitive Gym, GeoGuessr-style: closer is worth more.
// Pure and dependency-free so it is unit-testable without a browser.

export const MAX_REP = 1000; // points for a perfect, bang-on rep
export const DECAY = 0.12;   // smaller = points fall off faster with error

// Points for one rep given a NORMALIZED error in [0, 1] (0 = exact).
// Exponential decay: exact -> MAX_REP, larger error -> smoothly toward 0.
//
// `decay` and `floor` are per-call so a drill whose "error" is really a
// REACTION TIME can use a gentler curve than one whose error is a spatial miss.
// At the default DECAY a correct-but-unhurried answer rounds to single digits
// and then to zero, which reads as a bug to the player rather than as scoring
// (S2-24: "'number two' and then '+2' just looks amateurish"). `floor` is
// opt-in and defaults to 0, so the spatial drills are unchanged.
export function gradedPoints(normError, { maxRep = MAX_REP, decay = DECAY, floor = 0 } = {}) {
  const e = Math.min(Math.max(normError, 0), 1);
  return Math.max(floor, Math.round(maxRep * Math.exp(-e / decay)));
}
