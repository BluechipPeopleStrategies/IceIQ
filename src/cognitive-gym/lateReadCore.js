// src/cognitive-gym/lateReadCore.js
// Pure helpers for Late Read (cognitive flexibility / inhibition): you carry the
// puck, a teammate is cued as the play, and on SOME reps a defender steps up late
// so the cue switches to a DIFFERENT open teammate. The player must read the
// change and hit the teammate that is correct RIGHT NOW, not the one they first
// locked onto. No DOM, no canvas, so it is unit-testable in plain Node.
import { levelT, lerp } from "./gymEngine.js";
import { gradedPoints } from "./gymPoints.js";

// How often a rep is a CHANGE rep (the late switch fires). Rises with level so
// the better you get, the more often you have to inhibit your first read and
// adapt. A fraction in [0, 1].
export const EASY_CHANGE_PROB = 0.3;
export const HARD_CHANGE_PROB = 0.65;

// On a change rep, how long after the cue first appears the switch fires, as a
// FRACTION of the clock. Later at higher levels so you get less time to react to
// the new read after committing.
export const EASY_CHANGE_FRAC = 0.32;
export const HARD_CHANGE_FRAC = 0.62;

// How long the rep stays live before it counts as a miss, in ms. Shorter at
// higher levels so the whole read has to come faster.
export const EASY_CLOCK_MS = 4200;
export const HARD_CLOCK_MS = 1800;

// How many teammates (options to read) and defenders (clutter / the one that
// steps up) are on the ice. More bodies at higher levels = a busier picture.
export const EASY_TEAMMATES = 3;
export const HARD_TEAMMATES = 5;
export const EASY_DEFENDERS = 2;
export const HARD_DEFENDERS = 5;

// Probability that a rep is a change rep, for a level.
export function changeProb(level) {
  return lerp(EASY_CHANGE_PROB, HARD_CHANGE_PROB, levelT(level));
}

// How long the rep stays live before expiry, in ms, for a level.
export function clockMs(level) {
  return Math.round(lerp(EASY_CLOCK_MS, HARD_CLOCK_MS, levelT(level)));
}

// When the late change fires, in ms from the cue appearing, for a level on a
// given clock. Later (a larger fraction of the clock) at higher levels.
export function changeDelay(level, clock = clockMs(level)) {
  return Math.round(clock * lerp(EASY_CHANGE_FRAC, HARD_CHANGE_FRAC, levelT(level)));
}

// Number of teammates on the ice for a level.
export function teammateCount(level) {
  return Math.round(lerp(EASY_TEAMMATES, HARD_TEAMMATES, levelT(level)));
}

// Number of defenders for a level.
export function defenderCount(level) {
  return Math.round(lerp(EASY_DEFENDERS, HARD_DEFENDERS, levelT(level)));
}

// Build a trial for a level. YOU carry the puck at lower middle; teammates spread
// across the offensive zone as options; defenders clutter the ice. One teammate
// is cued first (firstIndex). On a CHANGE rep the cue later jumps to a different
// teammate (finalIndex !== firstIndex); on a no-change rep firstIndex ===
// finalIndex. Both cued teammates are real, in-bounds positions.
//
// `rng` is injectable so tests are deterministic; in the game it defaults to
// Math.random. Returns:
// { you, teammates:[{x,y}], defenders:[{x,y}], firstIndex, finalIndex, changes,
//   changeAtMs, clockMs }
// with every position strictly in-bounds (0 < x < W, 0 < y < H).
export function makeTrial(level, W, H, { rng = Math.random } = {}) {
  const nMate = Math.max(2, teammateCount(level)); // need at least two to switch between
  const nDef = defenderCount(level);
  const r = Math.max(11, Math.round(W * 0.026)); // marker radius (matches drills)
  const pad = r + 12; // keep markers off the boards
  const minGap = r * 2.6; // center-to-center spacing so markers do not overlap
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const cx = (v) => clamp(v, pad, W - pad);
  const cy = (v) => clamp(v, pad, H - pad);

  // 1. YOU: lower middle, the puck carrier.
  const you = { x: W / 2, y: H * 0.86 };

  // helper: a random in-bounds point not overlapping existing points or YOU.
  function freeSpot(existing, yMin, yMax, guardMax = 600) {
    let guard = 0;
    while (guard < guardMax) {
      guard += 1;
      const x = cx(pad + rng() * (W - 2 * pad));
      const y = cy(yMin + rng() * (yMax - yMin));
      const okExisting = existing.every((o) => Math.hypot(o.x - x, o.y - y) >= minGap);
      const okYou = Math.hypot(you.x - x, you.y - y) >= minGap;
      if (okExisting && okYou) return { x, y };
    }
    return null;
  }

  // 2. Teammates spread across the upper / offensive part of the sheet so the
  //    cue arrows from YOU run up the ice.
  const teammates = [];
  let tGuard = 0;
  while (teammates.length < nMate && tGuard < 4000) {
    tGuard += 1;
    const spot = freeSpot(teammates, pad, H * 0.62);
    if (spot) teammates.push(spot);
  }
  // Fallback if scattering ran out (very small canvas): spread evenly.
  while (teammates.length < nMate) {
    const i = teammates.length;
    teammates.push({ x: cx(pad + ((i + 1) / (nMate + 1)) * (W - 2 * pad)), y: cy(H * 0.3) });
  }

  // 3. The first cued teammate (the one you lock onto).
  const firstIndex = Math.floor(rng() * teammates.length);

  // 4. Is this a change rep? Compare a draw to the level's change probability.
  const changes = rng() < changeProb(level);

  // 5. The final cued teammate. On a change rep it is a DIFFERENT teammate; on a
  //    no-change rep it is the same one.
  let finalIndex = firstIndex;
  if (changes && teammates.length > 1) {
    // pick any other teammate as the new open option
    const offset = 1 + Math.floor(rng() * (teammates.length - 1));
    finalIndex = (firstIndex + offset) % teammates.length;
  }

  const clock = clockMs(level);
  const changeAtMs = changes && finalIndex !== firstIndex ? changeDelay(level, clock) : null;

  // 6. Defenders as clutter. On a change rep, the first defender is the one that
  //    "steps up": park it on the OLD lane (YOU -> firstIndex teammate) so the
  //    picture justifies the switch. The rest scatter as clutter, kept off the
  //    final lane so the new read stays open.
  const defenders = [];
  const finalMate = teammates[finalIndex];
  const firstMate = teammates[firstIndex];

  if (changes && finalIndex !== firstIndex && nDef > 0) {
    // a defender on the old lane, roughly two-thirds of the way out from YOU
    const onLaneT = 0.62;
    defenders.push({
      x: cx(you.x + (firstMate.x - you.x) * onLaneT),
      y: cy(you.y + (firstMate.y - you.y) * onLaneT),
    });
  }

  // segment distance helper for keeping clutter off the final (correct) lane.
  function segDist(p, a, b) {
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const len2 = abx * abx + aby * aby;
    if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
    let t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (a.x + t * abx), p.y - (a.y + t * aby));
  }

  let dGuard = 0;
  while (defenders.length < nDef && dGuard < 800) {
    dGuard += 1;
    const x = cx(pad + rng() * (W - 2 * pad));
    const y = cy(pad + rng() * (H - 2 * pad));
    const p = { x, y };
    // keep the final (correct) lane open and do not stack on bodies / YOU
    if (segDist(p, you, finalMate) < r * 2.4) continue;
    if (Math.hypot(p.x - you.x, p.y - you.y) < minGap) continue;
    if (teammates.some((m) => Math.hypot(m.x - p.x, m.y - p.y) < minGap)) continue;
    if (defenders.some((d) => Math.hypot(d.x - p.x, d.y - p.y) < minGap)) continue;
    defenders.push(p);
  }
  // top up with safe clutter low on the sheet if the budget ran out
  while (defenders.length < nDef) {
    defenders.push({ x: cx(W * (defenders.length % 2 ? 0.25 : 0.75)), y: cy(H * 0.7) });
  }

  return {
    you,
    teammates: teammates.map((m) => ({ x: cx(m.x), y: cy(m.y) })),
    defenders: defenders.map((d) => ({ x: cx(d.x), y: cy(d.y) })),
    firstIndex,
    finalIndex,
    changes: finalIndex !== firstIndex,
    changeAtMs,
    clockMs: clock,
  };
}

// Grade a tap against the FINAL cued teammate.
//   tappedIndex : index of the teammate tapped, or -1 / null if none / timeout
//   finalIndex  : index of the truly-correct (final) teammate
//   tapMs       : ms from the cue first appearing to the tap
//   settleMs    : ms at which the final cue settled (0 on no-change reps; the
//                 changeAtMs on change reps). Points reward speed AFTER the read
//                 is settled, so a change rep is not punished for the time before
//                 the switch.
//   clockMs     : ms the rep stayed live
// Success only when the player tapped the FINAL teammate before the clock
// expired. Tapping the pre-change teammate (or any wrong one), no tap, or an
// expired clock is a miss worth 0. Points reward a quick read after the cue
// settles: gradedPoints((tapMs - settleMs) / (clockMs - settleMs)), so an instant
// post-settle tap is max points. Returns { success, points, normElapsed }.
export function scoreTrial(tappedIndex, finalIndex, tapMs, settleMs, clockMs) {
  const span = Math.max(1, clockMs - settleMs);
  const norm = Math.min(Math.max((tapMs - settleMs) / span, 0), 1);
  const inTime = tapMs <= clockMs;
  const success = tappedIndex === finalIndex && inTime;
  if (!success) return { success: false, points: 0, normElapsed: norm };
  return { success: true, points: gradedPoints(norm), normElapsed: norm };
}
