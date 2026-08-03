// src/cognitive-gym/twoThingsCore.js
// Pure helpers for "Two Things at Once" (divided attention / dual task).
// Two tasks run at the same time and BOTH count. PRIMARY: a puck slides across
// the rink and you must tap it as it crosses the red center line (a timed window
// around the crossing). SECONDARY: while the puck is travelling, a SHAPE cue
// flashes briefly at the top and you must tap the matching shape button before
// the puck finishes. This module builds the round and grades both sub-tasks, plus
// combines them. No DOM, no canvas, so it is unit-testable in plain Node.
import { levelT, lerp } from "./gymEngine.js";
import { gradedPoints, MAX_REP } from "./gymPoints.js";

// The three cue shapes. Distinguishable by SHAPE alone (the UI never leans on
// color), so the player reads circle vs triangle vs square, not a colour.
export const SHAPES = ["circle", "triangle", "square"];

// How long the puck takes to slide all the way across the sheet, in ms. Shrinks
// hard with level so the whole rep happens faster and the two tasks crowd closer.
// Widened 2600/1300 -> 3200/1700 as part of the level-4 nerf (S2-25, "this game
// is way too hard at level four").
export const EASY_TRAVEL_MS = 3200;
export const HARD_TRAVEL_MS = 1700;

// The tap window around the center crossing, in ms. A tap counts as catching the
// crossing only if it lands within +/- half this window of the exact crossing
// time. Tightens hard with level so timing the puck gets genuinely harder.
// Widened from 520/200, then again from 650/320 (S2-25).
export const EASY_CROSS_WINDOW_MS = 900;
export const HARD_CROSS_WINDOW_MS = 420;

// How long the shape cue is shown / answerable, in ms. Shorter = harder: a
// shorter look at the shape and less time to pick it.
export const EASY_CUE_WINDOW_MS = 2200;
export const HARD_CUE_WINDOW_MS = 900;

// How many shape buttons are offered (the answer plus decoys). Climbs 2 -> 3 so
// there is a real choice to make at higher levels.
export const MIN_CHOICES = 2;
export const MAX_CHOICES = 3;

// A ramp exponent instead of a straight lerp. On the linear ramp level 4 already
// sat 16% of the way to the hardest setting, which is how a player ended up
// stuck there (S2-25). The exponent holds the low levels near the easy end and
// puts the real squeeze in the top third, where it has been earned. Same trick
// shootoutCore.holeOpenMs already uses.
export const RAMP_EXP = 1.6;
function ramp(level) {
  return Math.pow(levelT(level), RAMP_EXP);
}

// Puck travel time at a level (shorter = harder).
export function travelMs(level) {
  return Math.round(lerp(EASY_TRAVEL_MS, HARD_TRAVEL_MS, ramp(level)));
}

// Center-crossing tap window at a level (tighter = harder).
export function crossWindowMs(level) {
  return Math.round(lerp(EASY_CROSS_WINDOW_MS, HARD_CROSS_WINDOW_MS, ramp(level)));
}

// Shape-cue window at a level (shorter = harder).
export function cueWindowMs(level) {
  return Math.round(lerp(EASY_CUE_WINDOW_MS, HARD_CUE_WINDOW_MS, ramp(level)));
}

// How many shape choices to offer at a level: 2 early, 3 at the top.
export function shapeChoiceCount(level) {
  const t = ramp(level);
  const c = Math.floor(lerp(MIN_CHOICES, MAX_CHOICES + 0.999, t));
  return Math.min(MAX_CHOICES, Math.max(MIN_CHOICES, c));
}

// Where (as a fraction of travel) the shape cue fires. Early levels fire the cue
// well before the puck reaches center so the two tasks barely overlap; high
// levels fire it almost ON the crossing for maximum interference (you must read
// the shape and time the puck at nearly the same instant). The puck crosses
// center at the midpoint of its travel (frac 0.5), so easy cues fire early
// (~0.2 of travel) and hard cues fire right at the crossing (~0.48).
// At HARD_CUE_FRAC 0.48 the cue fired essentially ON the crossing (which is at
// frac 0.5), so the two jobs were physically impossible to do in sequence — you
// had to read a shape, find a button, and time a moving puck inside the same
// few hundred ms. 0.34 keeps real interference while leaving the cue readable
// before the crossing window opens (S2-25).
export const EASY_CUE_FRAC = 0.14;
export const HARD_CUE_FRAC = 0.34;

// Build one round for a level. Returns:
//   { travelMs, crossWindowMs, crossAtMs, cueShape, cueChoices, cueAnswerIndex,
//     cueAtMs, cueWindowMs }
// crossAtMs is the exact moment (ms from launch) the puck crosses center: the
// midpoint of its travel. cueAtMs (when the shape cue appears) sits within the
// travel. cueChoices are distinct shapes including the answer exactly once.
// `rng` is injectable so tests are deterministic; in the game it defaults to
// Math.random.
export function makeRound(level, { rng = Math.random } = {}) {
  const travel = travelMs(level);
  const crossWin = crossWindowMs(level);
  const cueWin = cueWindowMs(level);
  const choiceCount = shapeChoiceCount(level);

  // The puck crosses the red center line at the midpoint of its straight travel.
  const crossAtMs = travel / 2;

  // The shape cue fires at a fraction of travel that creeps toward the crossing
  // as the level climbs (more interference). Clamp into (0, travel) so the cue
  // always appears while the puck is still on the ice.
  const cueFrac = lerp(EASY_CUE_FRAC, HARD_CUE_FRAC, ramp(level));
  let cueAtMs = Math.round(travel * cueFrac);
  cueAtMs = Math.min(travel - 1, Math.max(1, cueAtMs));

  // Pick the answer shape, then build a distinct set of choices that includes it
  // exactly once. We shuffle the shape list with the injected rng and take the
  // first `choiceCount`, guaranteeing the answer is present and all distinct.
  const cueShape = SHAPES[Math.floor(rng() * SHAPES.length)];
  const others = SHAPES.filter((s) => s !== cueShape);
  // shuffle the decoy pool deterministically with rng
  for (let i = others.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = others[i];
    others[i] = others[j];
    others[j] = tmp;
  }
  const decoys = others.slice(0, choiceCount - 1);

  // place the answer at a deterministic index among the choices
  const cueAnswerIndex = Math.floor(rng() * choiceCount);
  const cueChoices = decoys.slice();
  cueChoices.splice(cueAnswerIndex, 0, cueShape);

  return {
    travelMs: travel,
    crossWindowMs: crossWin,
    crossAtMs,
    cueShape,
    cueChoices,
    cueAnswerIndex,
    cueAtMs,
    cueWindowMs: cueWin,
  };
}

// Grade the PRIMARY task: did the player tap as the puck crossed center?
//   tapMs          : ms from launch when they tapped the puck (null = no tap)
//   crossAtMs      : the exact crossing moment
//   crossWindowMs  : the full tap window; a tap within +/- half of this counts
// Success only when the tap lands inside the window. Points reward closeness to
// the exact crossing: feed gradedPoints a normalized value = (off / half-window),
// so bang-on the crossing = max, edge of the window = near 0. Primary is worth up
// to half a rep's points (the other half is the shape). Returns { hit, points }.
export function scorePrimary(tapMs, crossAtMs, crossWindowMs) {
  if (tapMs == null) return { hit: false, points: 0 };
  const half = (crossWindowMs || 0) / 2;
  const off = Math.abs(tapMs - crossAtMs);
  const hit = off <= half;
  if (!hit) return { hit: false, points: 0 };
  const norm = half > 0 ? off / half : 0;
  // half a rep's worth: scale the graded curve by 0.5
  const points = Math.round(gradedPoints(norm) * 0.5);
  return { hit: true, points };
}

// Grade the SECONDARY task: did the player pick the matching shape, in time?
//   choiceIndex  : index of the shape button tapped (or -1 / null for no pick)
//   answerIndex  : index of the matching shape among the choices
//   answerMs     : ms from the cue appearing to the tap
//   cueWindowMs  : the window over which the answer is accepted / speed rewarded
// Success only when they picked the answer AND answered within the window. Points
// reward a quick answer: gradedPoints over answerMs/cueWindowMs (0 = instant ->
// max). Secondary is worth up to half a rep's points. A wrong pick, no pick, or
// an answer past the window is a miss worth 0. Returns { hit, points }.
export function scoreSecondary(choiceIndex, answerIndex, answerMs, cueWindowMs) {
  const inTime = answerMs != null && answerMs <= (cueWindowMs || 0);
  const picked = choiceIndex === answerIndex && choiceIndex != null && choiceIndex >= 0;
  const hit = picked && inTime;
  if (!hit) return { hit: false, points: 0 };
  const norm = Math.min(Math.max(answerMs / (cueWindowMs || 1), 0), 1);
  const points = Math.round(gradedPoints(norm) * 0.5);
  return { hit: true, points };
}

// Combine the two sub-tasks into a round result. Success (which drives leveling)
// only when BOTH sub-tasks were hit, so doing one well is not enough. Points are
// always the sum of both sub-scores, so doing both well beats doing one well.
// Returns { success, points }.
export function combine(primary, secondary) {
  const success = !!(primary.hit && secondary.hit);
  const points = (primary.points || 0) + (secondary.points || 0);
  return { success, points };
}

// The most a single rep can be worth (both sub-tasks bang-on), for any UI that
// wants to show a max. primary 0.5*MAX + secondary 0.5*MAX = MAX_REP.
export const MAX_REP_TWO_THINGS = MAX_REP;
