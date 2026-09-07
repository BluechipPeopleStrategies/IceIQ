// src/cognitive-gym/readNumbersCore.js
// Pure helpers for "Read the Numbers" (visual memory + selective recall): a
// formation of skaters, each wearing a distinct jersey NUMBER, flashes on the
// ice together. The numbers hide, one number is called out, and the player
// taps where that skater was standing. This module builds the roster (which
// numbers, which one gets asked about) and grades the tap. Positions are
// canvas-space and left to the renderer, so this stays geometry-free and
// unit-testable in plain Node.
import { levelT, lerp } from "./gymEngine.js";
import { gradedPoints } from "./gymPoints.js";

// How many numbered skaters are on the ice. Climbs with level so there is more
// to hold in memory at once.
export const EASY_SKATERS = 4;
export const HARD_SKATERS = 9;

// How long the numbers stay legible before hiding, in ms. Shrinks hard with
// level so there is less time to lock them in.
export const EASY_WATCH_MS = 2600;
export const HARD_WATCH_MS = 1000;

// How many digits each jersey number has. Climbs 1 -> 2 -> 3 across the
// levels: single digits early, two digits through the middle, three at the top.
export const MIN_DIGITS = 1;
export const MAX_DIGITS = 3;

// --- Scoring curve ----------------------------------------------------------
// The "error" this drill feeds gradedPoints is a REACTION TIME (answerMs over
// the 3200 ms answer window), not a spatial miss. On the gym-wide DECAY of 0.12
// that made a correct read at a normal 1.5 s reaction worth 20 points, at 2.4 s
// worth 2, and from ~2.9 s on worth exactly 0 — a right answer that pays
// nothing, and a "+2" that collides with the jersey numbers on screen (S2-24).
// A gentler decay plus a floor keeps the reward for speed (a bang-on read is
// still worth 5x a last-instant one) while a correct answer always scores.
export const ANSWER_DECAY = 0.62;
export const ANSWER_FLOOR = 150;

// Points for a CORRECT read taken `norm` of the way through the answer window.
// Split out from scoreRead so the curve itself is unit-testable.
export function answerPoints(norm) {
  return gradedPoints(norm, { decay: ANSWER_DECAY, floor: ANSWER_FLOOR });
}

// Number of skaters on the ice for a level.
export function skaterCount(level) {
  return Math.round(lerp(EASY_SKATERS, HARD_SKATERS, levelT(level)));
}

// How long the numbers stay visible, in ms, for a level (shorter = harder).
export function watchMs(level) {
  return Math.round(lerp(EASY_WATCH_MS, HARD_WATCH_MS, levelT(level)));
}

// Digit count for a level. levelT runs 0..1 across levels 1..20; map that onto
// 1, 2, or 3 digits so the numbers get longer (and harder to hold) as you climb.
export function digitsForLevel(level) {
  const t = levelT(level);
  const d = Math.floor(lerp(MIN_DIGITS, MAX_DIGITS + 0.999, t));
  return Math.min(MAX_DIGITS, Math.max(MIN_DIGITS, d));
}

// Smallest / largest number for a digit count. Jersey numbers start at 1 (no
// leading zeros), so 1 digit = 1..9, 2 = 10..99, 3 = 100..999.
function rangeForDigits(digits) {
  const lo = digits === 1 ? 1 : Math.pow(10, digits - 1);
  const hi = Math.pow(10, digits) - 1;
  return { lo, hi };
}

// Build a formation for a level: `skaterCount(level)` distinct jersey numbers
// (never repeats within a round) and which one the player will be asked about.
// Returns { numbers:[...], targetIndex, watchMs }. `rng` is injectable so
// tests are deterministic; in the game it defaults to Math.random.
export function makeFormation(level, { rng = Math.random } = {}) {
  const digits = digitsForLevel(level);
  const { lo, hi } = rangeForDigits(digits);
  const span = hi - lo + 1;
  const n = Math.min(skaterCount(level), span);

  const numbers = [];
  const used = new Set();
  let guard = 0;
  while (numbers.length < n && guard < 4000) {
    guard += 1;
    const cand = lo + Math.floor(rng() * span);
    if (used.has(cand)) continue;
    used.add(cand);
    numbers.push(cand);
  }

  const targetIndex = Math.floor(rng() * numbers.length);
  return { numbers, targetIndex, watchMs: watchMs(level) };
}

// Grade the player's tap.
//   pickedIndex : index of the skater tapped (or -1 / null for none / timeout)
//   targetIndex : index of the skater actually asked about
//   answerMs    : ms from the numbers hiding to the tap
//   windowMs    : the window over which speed is rewarded (instant -> max)
// Success only when the tap lands on the asked-about skater. Points reward a
// quick answer via answerPoints (see the scoring-curve note above): instant ->
// max, at the buzzer -> the floor. A wrong pick or no pick is a miss worth 0.
// Returns { success, points, norm }.
export function scoreRead(pickedIndex, targetIndex, answerMs, windowMs) {
  const norm = Math.min(Math.max(answerMs / (windowMs || 1), 0), 1);
  const success = pickedIndex === targetIndex && pickedIndex != null && pickedIndex >= 0;
  if (!success) return { success: false, points: 0, norm };
  return { success: true, points: answerPoints(norm), norm };
}
