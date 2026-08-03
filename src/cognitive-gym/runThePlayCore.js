// src/cognitive-gym/runThePlayCore.js
// Pure helpers for "Run the Play" (sequence memory, Simon-style): watch the
// coach's passing play light up skater by skater, then run it back by tapping
// the skaters in the same order. No DOM, no canvas, so it is unit-testable in
// plain Node (mirrors snapshotCore.js).
import { levelT, lerp, targetMaxY, endZoneNet } from "./gymEngine.js";
import { gradedPoints } from "./gymPoints.js";

// Passes in the play. The classic Simon curve: short and readable early,
// genuinely hard to hold by the top.
export const EASY_SEQ = 3;
export const HARD_SEQ = 8;
// Skaters on the ice (tap targets AND memory clutter).
export const EASY_SKATERS = 4;
export const HARD_SKATERS = 7;
// Playback tempo per pass (ms). Faster playback = less time to encode.
export const EASY_STEP_MS = 900;
export const HARD_STEP_MS = 420;

export function seqLen(level) {
  return Math.round(lerp(EASY_SEQ, HARD_SEQ, levelT(level)));
}
export function skaterCount(level) {
  return Math.round(lerp(EASY_SKATERS, HARD_SKATERS, levelT(level)));
}
export function stepMs(level) {
  return Math.round(lerp(EASY_STEP_MS, HARD_STEP_MS, levelT(level)));
}

// Non-overlapping, in-bounds skater spots for the canvas. Same rejection
// sampling as snapshotCore.makeFormation, but every marker is a teammate
// (they are the Simon buttons).
//
// The whole canvas is ONE end zone (decision 1,
// docs/manual-playtest/2026-08-03-decisions-round3.md), so "in bounds" now also
// means: not standing in the crease, and not under the Action Rail. Before
// this, skaters were sampled across a full 200-foot sheet, which is what made
// every sequence read as an illegal, rink-length play.
export function makeSkaters(count, W, H, { rng = Math.random } = {}) {
  const r = Math.max(13, Math.round(W * 0.032));
  const pad = r + 8;
  const minGap = r * 2.8;
  const yMax = targetMaxY(H) - pad;      // controls own the bottom band
  const net = endZoneNet(W, H, "portrait");
  const netKeepOut = net.keepOut + r;    // no one stands in the paint or on the net
  const skaters = [];
  let guard = 0;
  while (skaters.length < count && guard < 4000) {
    guard += 1;
    const x = pad + rng() * (W - 2 * pad);
    const y = pad + rng() * (yMax - pad);
    if (Math.hypot(net.x - x, net.y - y) < netKeepOut) continue;
    if (skaters.every((o) => Math.hypot(o.x - x, o.y - y) >= minGap)) {
      skaters.push({ x, y, r });
    }
  }
  return skaters;
}

// The passing sequence: indices into the skater list, never the same skater
// twice in a row (a pass has to go somewhere). Deterministic given rng.
export function makeSequence(count, len, rng = Math.random) {
  const seq = [];
  for (let i = 0; i < len; i += 1) {
    let next = Math.floor(rng() * count);
    if (i > 0 && next === seq[i - 1]) next = (next + 1) % count;
    seq.push(next);
  }
  return seq;
}

// Which skater a tap landed on, or -1. The tap circle is padded a little
// beyond the drawn radius (young thumbs).
export function skaterAtPoint(skaters, x, y, slack = 1.35) {
  for (let i = 0; i < skaters.length; i += 1) {
    const s = skaters[i];
    if (Math.hypot(s.x - x, s.y - y) <= s.r * slack) return i;
  }
  return -1;
}

// Grade a run. Simon rules: the rep ends at the first wrong tap. Success (for
// the adaptive level) only when the whole sequence came back; points reward
// partial recall so a long run that dies late still pays.
// Returns { success, correctPrefix, points, normError }.
export function scoreRun(taps, seq) {
  let correctPrefix = 0;
  for (let i = 0; i < Math.min(taps.length, seq.length); i += 1) {
    if (taps[i] === seq[i]) correctPrefix += 1;
    else break;
  }
  const success = correctPrefix === seq.length && taps.length >= seq.length;
  const normError = 1 - correctPrefix / seq.length;
  return { success, correctPrefix, points: gradedPoints(normError), normError };
}
