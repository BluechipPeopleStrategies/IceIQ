// src/cognitive-gym/readNumbersCore.js
// Pure helpers for "Read the Numbers" (dynamic visual acuity): a skater wearing
// a jersey NUMBER streaks across the rink and disappears. The player reads the
// number, then picks it from a set of choice buttons. This module builds the
// round (the true number, plausible decoys, travel time) and grades the read.
// No DOM, no canvas, so it is unit-testable in plain Node.
import { levelT, lerp } from "./gymEngine.js";
import { gradedPoints } from "./gymPoints.js";

// How long the skater is legible on screen, in ms. Shrinks hard with level so a
// faster player gives you a shorter look at the number.
export const EASY_TRAVEL_MS = 2200;
export const HARD_TRAVEL_MS = 700;

// How many digits the jersey number has. Climbs 1 -> 2 -> 3 across the levels:
// single digits early, two digits through the middle, three digits at the top.
export const MIN_DIGITS = 1;
export const MAX_DIGITS = 3;

// Number of answer choices shown (the true number plus decoys).
export const CHOICES = 4;

// How long the skater stays legible at a level, in ms (shorter = harder).
export function travelMs(level) {
  return Math.round(lerp(EASY_TRAVEL_MS, HARD_TRAVEL_MS, levelT(level)));
}

// Digit count for a level. levelT runs 0..1 across levels 1..20; map that onto
// 1, 2, or 3 digits so the number gets longer (and harder to read) as you climb.
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

// Count how many digit characters two numbers share, position-independent, as a
// multiset intersection. Used to prefer decoys that look like the answer.
function sharedDigits(a, b) {
  const counts = {};
  for (const ch of String(a)) counts[ch] = (counts[ch] || 0) + 1;
  let shared = 0;
  for (const ch of String(b)) {
    if (counts[ch] > 0) { shared += 1; counts[ch] -= 1; }
  }
  return shared;
}

// Build one round for a level. Returns:
//   { number, choices:[CHOICES numbers incl. the answer], answerIndex, travelMs }
// The answer appears exactly once. Decoys are distinct from each other and the
// answer, share the right digit count, and where possible share digits with the
// answer so a sloppy read is genuinely tempting. `rng` is injectable so tests
// are deterministic; in the game it defaults to Math.random.
export function makeRound(level, { rng = Math.random } = {}) {
  const digits = digitsForLevel(level);
  const { lo, hi } = rangeForDigits(digits);
  const span = hi - lo + 1;
  const randInt = () => lo + Math.floor(rng() * span);

  const number = randInt();

  // Generate a pool of distinct candidate decoys, then prefer the ones that
  // share the most digits with the answer (closer decoys at higher levels).
  const t = levelT(level);
  const used = new Set([number]);
  const pool = [];
  let guard = 0;
  // gather more candidates than needed so we can rank by shared digits
  const want = (CHOICES - 1) * 6;
  while (pool.length < want && guard < 2000) {
    guard += 1;
    const cand = randInt();
    if (used.has(cand)) continue;
    used.add(cand);
    pool.push(cand);
  }

  // rank: more shared digits first (so decoys look like the answer); at higher
  // levels we lean harder on look-alikes by weighting shared digits more.
  const weight = lerp(1, 3, t);
  pool.sort((a, b) => sharedDigits(b, number) * weight - sharedDigits(a, number) * weight);
  const decoys = pool.slice(0, CHOICES - 1);

  // safety: if the pool came up short (tiny ranges, unlucky rng), top up with
  // any distinct in-range numbers so we always return CHOICES distinct values.
  let next = lo;
  while (decoys.length < CHOICES - 1) {
    if (!used.has(next)) { used.add(next); decoys.push(next); }
    next += 1;
    if (next > hi) break;
  }

  // place the answer at a deterministic index within the choice list
  const answerIndex = Math.floor(rng() * CHOICES);
  const choices = decoys.slice();
  choices.splice(answerIndex, 0, number);

  return { number, choices, answerIndex, travelMs: travelMs(level) };
}

// Grade the player's read.
//   choiceIndex : index of the button they tapped (or -1 / null for no pick)
//   answerIndex : index of the true number among the choices
//   answerMs    : ms from the choices appearing to the tap
//   windowMs    : the window over which speed is rewarded (instant -> max)
// Success only when they picked the answer. Points reward a quick answer: feed
// gradedPoints a normalized value = answerMs/windowMs (0 = instant -> max). A
// wrong pick or no pick is a miss worth 0. Returns { success, points, norm }.
export function scoreRead(choiceIndex, answerIndex, answerMs, windowMs) {
  const norm = Math.min(Math.max(answerMs / (windowMs || 1), 0), 1);
  const success = choiceIndex === answerIndex && choiceIndex != null && choiceIndex >= 0;
  if (!success) return { success: false, points: 0, norm };
  return { success: true, points: gradedPoints(norm), norm };
}
