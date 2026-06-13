// src/cognitive-gym/bestOptionCore.js
// Pure helpers for Best Option (decision speed): freeze a play with the puck on
// YOUR stick and build a scene where exactly one of three reads (shoot / pass /
// carry) is the best call, made visually defensible by where the net, goalie,
// teammate, and defenders sit. Then grade the choice for speed.
// No DOM, no canvas, so it is unit-testable in plain Node.
import { levelT, lerp } from "./gymEngine.js";
import { gradedPoints } from "./gymPoints.js";

// The three reads the player chooses between. Exactly one is best per scene.
export const OPTIONS = ["shoot", "pass", "carry"];

// How long the play stays frozen before the read closes, in ms. The player must
// tap the best option before the clock expires. Tightens hard with level so the
// decision has to come faster the better you get.
export const EASY_CLOCK_MS = 3500;
export const HARD_CLOCK_MS = 1400;

// Defenders and teammates on the ice. More bodies = a busier picture to read at
// higher levels. Teammates climb a little; defenders climb more (pressure).
export const EASY_TEAMMATES = 1;
export const HARD_TEAMMATES = 3;
export const EASY_DEFENDERS = 1;
export const HARD_DEFENDERS = 4;

// How long the play stays frozen, in ms, for a level.
export function clockMs(level) {
  return Math.round(lerp(EASY_CLOCK_MS, HARD_CLOCK_MS, levelT(level)));
}

// Number of teammates on the ice for a level (the best-pass option always has at
// least one; this is the on-ice count, including the open target when relevant).
export function teammateCount(level) {
  return Math.round(lerp(EASY_TEAMMATES, HARD_TEAMMATES, levelT(level)));
}

// Number of defenders for a level.
export function defenderCount(level) {
  return Math.round(lerp(EASY_DEFENDERS, HARD_DEFENDERS, levelT(level)));
}

// One-line reasons shown on reveal, keyed by the best read. Kept short, warm,
// kid-friendly, and free of em dashes.
export const REASONS = {
  shoot: "You are in tight with a clear lane and the goalie is leaning. Shoot.",
  pass: "A teammate is wide open in a better spot. Slide it over for the tap-in.",
  carry: "No shot and no open teammate, but open ice ahead. Carry and make a play.",
};

// Shortest distance from a point p to the line SEGMENT a-b. Standard
// point-to-segment projection clamped to the segment ends.
export function pointSegmentDist(p, a, b) {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const len2 = abx * abx + aby * aby;
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = a.x + t * abx;
  const cy = a.y + t * aby;
  return Math.hypot(p.x - cx, p.y - cy);
}

// Build a frozen situation for a level. The net + goalie sit at the LEFT end
// (x small); YOU attack toward them from the right side of the sheet. The scene
// is generated to justify `best`:
//   - "shoot": YOU are in tight with a clear lane to the net (no defender on the
//     YOU->net segment) and the goalie is off to one side.
//   - "pass":  a teammate is open in a better scoring spot (back door, near the
//     net on the far side) while a defender pressures YOU and blocks your shot.
//   - "carry": open ice ahead of YOU, no clean shot and no open teammate, and
//     the nearest defender is far away.
//
// `rng` is injectable so tests are deterministic; in the game it defaults to
// Math.random. Returns:
// { best, you, net, goalie, teammates:[{x,y,open}], defenders:[{x,y}], reason, clockMs }
// with every position in-bounds (strictly inside 0..W, 0..H).
export function makeSituation(level, W, H, { rng = Math.random } = {}) {
  const t = levelT(level);
  const nDef = defenderCount(level);
  const nMate = teammateCount(level);
  const r = Math.max(11, Math.round(W * 0.026)); // marker radius (matches drills)
  const pad = r + 12; // keep markers off the boards
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const cx = (v) => clamp(v, pad, W - pad);
  const cy = (v) => clamp(v, pad, H - pad);
  // small jitter so repeated scenes are not pixel-identical; deterministic via rng
  const jitter = (span) => (rng() - 0.5) * span;

  // Net + goalie at the left end (attacking left). The goalie sits in/near the
  // crease; how far "out of position" it leans is part of the read.
  const net = { x: cx(W * 0.08), y: cy(H * 0.5) };

  // Pick the best read. Even split, deterministic given rng.
  const best = OPTIONS[Math.floor(rng() * OPTIONS.length)];

  const teammates = [];
  const defenders = [];
  let you;
  let goalie;

  // A defender's tempting-margin: at high levels the second-best option is more
  // tempting, so we let the "wrong" bodies sit a touch closer to the ideal line.
  // (Used only to flavor placement, not to change which option is best.)
  const tempt = lerp(1, 0.55, t);

  // helper: scatter the remaining (non-essential) bodies as clutter, in-bounds,
  // away from a forbidden segment so they never accidentally flip the best read.
  function scatterClutter(arr, count, forbid) {
    let guard = 0;
    while (arr.length < count && guard < 400) {
      guard += 1;
      const p = {
        x: cx(pad + rng() * (W - 2 * pad)),
        y: cy(pad + rng() * (H - 2 * pad)),
      };
      // keep clutter off the protected segment and not stacked on YOU/net
      if (forbid && pointSegmentDist(p, forbid.a, forbid.b) < r * 2.4) continue;
      if (Math.hypot(p.x - you.x, p.y - you.y) < r * 2.8) continue;
      if (Math.hypot(p.x - net.x, p.y - net.y) < r * 2.8) continue;
      arr.push(p);
    }
  }

  if (best === "shoot") {
    // YOU are in tight, slightly off-center, with a clean lane to the net.
    you = {
      x: cx(W * 0.3 + jitter(W * 0.06)),
      y: cy(H * 0.5 + (rng() < 0.5 ? -1 : 1) * H * 0.12 + jitter(H * 0.04)),
    };
    // Goalie leaning to one side of the crease (out of position), so the far
    // side is open. Lean toward YOU's side so the opposite side is exposed.
    const youHigh = you.y < net.y;
    goalie = {
      x: cx(net.x + r * 1.6),
      y: cy(net.y + (youHigh ? -1 : 1) * H * 0.06),
    };
    // The shooting lane YOU -> net stays clear; clutter defenders sit AWAY from
    // it (behind YOU or off to the strong side). No teammate is in a better spot,
    // so passing is not the call: teammates sit low / behind the play.
    for (let i = 0; i < nMate; i += 1) {
      teammates.push({
        x: cx(you.x + W * 0.12 + jitter(W * 0.08)),
        y: cy(H * (i % 2 === 0 ? 0.78 : 0.22) + jitter(H * 0.05)),
        open: false,
      });
    }
    // defenders are beaten: behind YOU (higher x) and off the shooting line
    for (let i = 0; i < nDef; i += 1) {
      defenders.push({
        x: cx(you.x + W * (0.14 + 0.06 * i) + jitter(W * 0.04)),
        y: cy(you.y + (i % 2 === 0 ? 1 : -1) * H * (0.16 + 0.04 * i)),
      });
    }
  } else if (best === "pass") {
    // A defender pressures YOU and blocks the shot; a teammate is open back door.
    you = {
      x: cx(W * 0.38 + jitter(W * 0.05)),
      y: cy(H * (rng() < 0.5 ? 0.34 : 0.66) + jitter(H * 0.04)),
    };
    // Goalie square to YOU (covering YOUR angle), which is exactly why the cross
    // ice teammate is the better look.
    goalie = { x: cx(net.x + r * 1.6), y: cy(net.y + jitter(H * 0.03)) };
    // The open teammate: back door, near the net on the OPPOSITE side from YOU,
    // a far better scoring spot. Marked open.
    const youHigh = you.y < net.y;
    teammates.push({
      x: cx(W * 0.2 + jitter(W * 0.04)),
      y: cy(net.y + (youHigh ? 1 : -1) * H * 0.16 + jitter(H * 0.03)),
      open: true,
    });
    // A defender sits squarely on YOUR shooting lane (YOU -> net) so the shot is
    // blocked. Place it on the segment, nudged a little less perfectly at higher
    // levels so the block is subtler (more tempting to shoot anyway).
    const onLaneT = 0.45;
    defenders.push({
      x: cx(you.x + (net.x - you.x) * onLaneT),
      y: cy(you.y + (net.y - you.y) * onLaneT + jitter(r * 1.2 * tempt)),
    });
    // Extra teammates (not open) and extra defenders as clutter, off the pass
    // lane so they do not cover the open teammate.
    const open = teammates[0];
    while (teammates.length < nMate) {
      teammates.push({
        x: cx(you.x + W * 0.08 + jitter(W * 0.08)),
        y: cy(H * 0.8 + jitter(H * 0.08)),
        open: false,
      });
    }
    // defenders: keep them off the YOU->open teammate segment so the back door
    // truly stays open.
    let guard = 0;
    while (defenders.length < nDef && guard < 400) {
      guard += 1;
      const p = {
        x: cx(pad + rng() * (W - 2 * pad)),
        y: cy(pad + rng() * (H - 2 * pad)),
      };
      if (pointSegmentDist(p, you, open) < r * 2.6) continue; // protect the pass
      if (Math.hypot(p.x - open.x, p.y - open.y) < r * 3) continue; // open stays open
      if (Math.hypot(p.x - you.x, p.y - you.y) < r * 2.8) continue;
      defenders.push(p);
    }
    // if the budget ran out, top up with safe clutter low on the sheet
    while (defenders.length < nDef) {
      defenders.push({ x: cx(you.x + W * 0.16), y: cy(H * 0.85) });
    }
  } else {
    // best === "carry": open ice ahead, no shot, no open teammate, nearest
    // defender far. YOU are farther out (high x) with room in front.
    you = {
      x: cx(W * 0.6 + jitter(W * 0.05)),
      y: cy(H * 0.5 + jitter(H * 0.1)),
    };
    // Goalie square and set, no juicy opening from this distance.
    goalie = { x: cx(net.x + r * 1.6), y: cy(net.y + jitter(H * 0.02)) };
    // Teammates are all covered / behind the play (not open), so passing is not
    // the call. Tuck them high/low and back.
    for (let i = 0; i < nMate; i += 1) {
      teammates.push({
        x: cx(you.x + W * (0.06 + 0.05 * i) + jitter(W * 0.05)),
        y: cy(H * (i % 2 === 0 ? 0.2 : 0.8) + jitter(H * 0.05)),
        open: false,
      });
    }
    // Defenders kept FAR from YOU (nearest is far) and out of the lane ahead, so
    // there is genuinely open ice in front. Park them deep / behind.
    let guard = 0;
    const minFar = Math.min(W, H) * lerp(0.38, 0.26, t); // shrinks with level
    while (defenders.length < nDef && guard < 400) {
      guard += 1;
      const p = {
        x: cx(pad + rng() * (W - 2 * pad)),
        y: cy(pad + rng() * (H - 2 * pad)),
      };
      if (Math.hypot(p.x - you.x, p.y - you.y) < minFar) continue; // stay far
      defenders.push(p);
    }
    while (defenders.length < nDef) {
      defenders.push({ x: cx(W * 0.2), y: cy(H * (defenders.length % 2 ? 0.3 : 0.7)) });
    }
  }

  // Final in-bounds safety pass on the marquee actors.
  you = { x: cx(you.x), y: cy(you.y) };
  goalie = { x: cx(goalie.x), y: cy(goalie.y) };

  return {
    best,
    you,
    net,
    goalie,
    teammates: teammates.map((m) => ({ x: cx(m.x), y: cy(m.y), open: !!m.open })),
    defenders: defenders.map((d) => ({ x: cx(d.x), y: cy(d.y) })),
    reason: REASONS[best],
    clockMs: clockMs(level),
  };
}

// Grade the player's choice against the best read.
//   choice    : "shoot" | "pass" | "carry" | null (no pick / timeout)
//   best      : the correct read
//   elapsedMs : ms from the clock starting to the tap
//   clockMs   : ms the play stayed frozen
// Success only when the player picked the best option before the clock expired.
// Points reward speed: feed gradedPoints a normalized value = elapsedMs/clockMs
// (0 = instant -> max points). A wrong pick, no pick, or an expired clock is a
// miss worth 0 points. Returns { success, points, normElapsed }.
export function scoreChoice(choice, best, elapsedMs, clockMs) {
  const norm = Math.min(Math.max(elapsedMs / (clockMs || 1), 0), 1);
  const inTime = elapsedMs <= clockMs;
  const success = choice === best && inTime;
  if (!success) return { success: false, points: 0, normElapsed: norm };
  return { success: true, points: gradedPoints(norm), normElapsed: norm };
}
