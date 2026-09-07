// src/cognitive-gym/findLaneCore.js
// Pure helpers for Find the Lane (spatial pattern recognition): build a
// formation where you carry the puck, teammates spread out as targets, and
// defenders clog the ice so that EXACTLY one teammate has a clean passing lane.
// Then grade the tap. No DOM, no canvas, so it is unit-testable in plain Node.
import { levelT, lerp } from "./gymEngine.js";
import { gradedPoints } from "./gymPoints.js";

// How many receivers (open teammates to read) and defenders (clutter) are on the
// ice. Climbs meaningfully with level: a busier picture with more lanes to
// reject. The open lane gets rarer as more bodies fill the seams.
export const EASY_RECEIVERS = 2;
export const HARD_RECEIVERS = 5;
export const EASY_DEFENDERS = 2;
export const HARD_DEFENDERS = 7;

// The open lane's clearance margin, in pixels-equivalent fraction of min(W, H).
// A lane counts as "open" when no defender sits within `margin` of the straight
// segment from YOU to the receiver. We require the open lane to clear this
// margin and every blocked lane to fail it. Tighter at higher levels so the
// open seam is harder to spot. (Used both to generate and to verify.)
export const EASY_MARGIN_FRAC = 0.12;
export const HARD_MARGIN_FRAC = 0.055;

// How long the lane stays open before it closes, in ms. The player must tap the
// open teammate before the countdown expires. Faster at higher levels.
export const EASY_CLOSE_MS = 4000;
export const HARD_CLOSE_MS = 1500;

// Number of receivers for a level.
export function receiverCount(level) {
  return Math.round(lerp(EASY_RECEIVERS, HARD_RECEIVERS, levelT(level)));
}

// Number of defenders for a level.
export function defenderCount(level) {
  return Math.round(lerp(EASY_DEFENDERS, HARD_DEFENDERS, levelT(level)));
}

// Open-lane clearance margin in pixels for a level on a given canvas.
export function laneMargin(level, W, H) {
  return Math.min(W, H) * lerp(EASY_MARGIN_FRAC, HARD_MARGIN_FRAC, levelT(level));
}

// How long the lane stays open, in ms, for a level.
export function closeMs(level) {
  return Math.round(lerp(EASY_CLOSE_MS, HARD_CLOSE_MS, levelT(level)));
}

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

// A passing lane from `you` to `receiver` is clear when NO defender sits within
// `margin` of the straight segment between them. Pure geometry; returns boolean.
export function laneClear(you, receiver, defenders, margin) {
  return defenders.every((d) => pointSegmentDist(d, you, receiver) > margin);
}

// Build a formation for a level: YOU (the puck carrier) at lower middle,
// `receiverCount(level)` teammates spread around the offensive zone, and
// `defenderCount(level)` defenders placed so that EXACTLY one receiver has a
// clean lane and every other lane is blocked.
//
// Strategy (deterministic given an injected rng):
//   1. Place YOU at a fixed lower-middle spot.
//   2. Scatter receivers (non-overlapping, in-bounds, upper part of the ice).
//   3. Pick one receiver to be the open one.
//   4. Place defenders one at a time: each defender must block at least one of
//      the still-open NON-target lanes while never coming within `margin` of the
//      target lane. Keep going until every non-target lane is blocked.
//   5. If after a budget we cannot block them all, drop a defender right onto a
//      stubborn lane (away from the target lane). This guarantees the invariant.
//
// `rng` is injectable so tests are deterministic; in the game it defaults to
// Math.random. Returns
// { you, receivers:[{x,y}], defenders:[{x,y}], openIndex, margin, closeMs, r }.
export function makeFormation(level, W, H, { rng = Math.random } = {}) {
  const nRecv = receiverCount(level);
  const nDef = defenderCount(level);
  const margin = laneMargin(level, W, H);
  const r = Math.max(11, Math.round(W * 0.026)); // marker radius
  const pad = r + 10; // keep markers off the boards
  const minGap = r * 2.6; // center-to-center spacing so markers do not overlap

  // 1. YOU: lower middle, the puck carrier.
  //    Action Rail: 0.86H is exactly the rail-band edge (GYM_TARGET_MAX_Y), so
  //    the countdown ring drawn around YOU — the only clock in the drill — would
  //    sit half-under the Read it / Next rep button. YOU moves up to 0.80H.
  //    Receivers already seed above 0.6H, so nothing you tap is in the band.
  const you = { x: W / 2, y: H * 0.8 };

  // helper: a random in-bounds point that does not overlap existing points or YOU
  function freeSpot(existing, yMin, yMax, guardMax = 600) {
    let guard = 0;
    while (guard < guardMax) {
      guard += 1;
      const x = pad + rng() * (W - 2 * pad);
      const y = yMin + rng() * (yMax - yMin);
      const okExisting = existing.every((o) => Math.hypot(o.x - x, o.y - y) >= minGap);
      const okYou = Math.hypot(you.x - x, you.y - y) >= minGap;
      if (okExisting && okYou) return { x, y };
    }
    return null;
  }

  // 2. Receivers spread across the upper/offensive part of the sheet so the
  //    lanes from YOU run up the ice.
  const receivers = [];
  let rGuard = 0;
  while (receivers.length < nRecv && rGuard < 4000) {
    rGuard += 1;
    const spot = freeSpot(receivers, pad, H * 0.6);
    if (spot) receivers.push(spot);
  }
  // Fallback if scattering ran out (very small canvas): spread evenly.
  while (receivers.length < nRecv) {
    const i = receivers.length;
    receivers.push({ x: pad + ((i + 1) / (nRecv + 1)) * (W - 2 * pad), y: H * 0.3 });
  }

  // 3. The open receiver.
  const openIndex = Math.floor(rng() * receivers.length);
  const target = receivers[openIndex];

  // Defenders so far, plus a tracker of which non-target lanes are still open.
  const defenders = [];
  const blocked = receivers.map((_, i) => i === openIndex); // open target counts as "fine"

  // A candidate defender is valid if it stays clear of the TARGET lane (so the
  // target stays open) and does not overlap existing bodies.
  function validDefender(p) {
    if (pointSegmentDist(p, you, target) <= margin) return false;
    if (Math.hypot(p.x - you.x, p.y - you.y) < minGap) return false;
    if (receivers.some((rc) => Math.hypot(rc.x - p.x, rc.y - p.y) < minGap)) return false;
    if (defenders.some((d) => Math.hypot(d.x - p.x, d.y - p.y) < minGap)) return false;
    return true;
  }

  // 4. Place defenders, preferring ones that newly block an open non-target lane.
  let dGuard = 0;
  while (defenders.length < nDef && dGuard < 5000) {
    dGuard += 1;
    const spot = freeSpot([...receivers, ...defenders], pad, H * 0.78);
    if (!spot || !validDefender(spot)) continue;
    // does this defender block any currently-open non-target lane?
    let blocksSomething = false;
    receivers.forEach((rc, i) => {
      if (blocked[i]) return;
      if (pointSegmentDist(spot, you, rc) <= margin) blocksSomething = true;
    });
    // accept if it blocks something, or if we still need bodies for clutter
    const stillNeedBlockers = blocked.some((b) => !b);
    if (blocksSomething || !stillNeedBlockers) {
      defenders.push(spot);
      receivers.forEach((rc, i) => {
        if (!blocked[i] && pointSegmentDist(spot, you, rc) <= margin) blocked[i] = true;
      });
    }
  }

  // 5. Guarantee: any non-target lane still open gets a defender dropped on its
  //    midpoint (nudged toward YOU's side so it stays off the target lane).
  receivers.forEach((rc, i) => {
    if (blocked[i]) return;
    // midpoint of the lane, then nudge until it is off the target lane.
    let placed = false;
    for (let frac = 0.5, tries = 0; tries < 12 && !placed; tries += 1, frac += 0.04) {
      const p = { x: you.x + (rc.x - you.x) * frac, y: you.y + (rc.y - you.y) * frac };
      if (pointSegmentDist(p, you, target) > margin) {
        defenders.push(p);
        blocked[i] = true;
        placed = true;
      }
    }
    if (!placed) {
      // Nothing ON the lane clears the target lane, so step off it sideways at
      // the receiver's end, AWAY from the target lane. Anything within `margin`
      // of the segment still blocks this receiver, and moving perpendicular is
      // the only direction that gains distance from the target lane.
      //
      // This matters because the old fallback below dropped a body a fixed
      // `r` above the receiver with no check at all, and when two receivers sat
      // nearly in line from YOU that body covered the target lane too — leaving
      // the rep with NO open receiver, which breaks the drill's one invariant.
      // It went unnoticed because the geometry only lines up on some seeds; it
      // surfaced when YOU moved up out of the Action Rail band.
      const dx = rc.x - you.x;
      const dy = rc.y - you.y;
      const len = Math.hypot(dx, dy) || 1;
      let nx = -dy / len;
      let ny = dx / len;
      // point the normal at whichever side is farther from the target lane
      const a = pointSegmentDist({ x: rc.x + nx, y: rc.y + ny }, you, target);
      const b = pointSegmentDist({ x: rc.x - nx, y: rc.y - ny }, you, target);
      if (b > a) {
        nx = -nx;
        ny = -ny;
      }
      for (const off of [margin * 0.5, margin * 0.75, margin * 0.95]) {
        const p = { x: rc.x + nx * off, y: rc.y + ny * off };
        if (pointSegmentDist(p, you, target) > margin) {
          defenders.push(p);
          blocked[i] = true;
          placed = true;
          break;
        }
      }
    }
    if (!placed) {
      // last resort: sit right on the receiver-side end of the lane
      defenders.push({ x: rc.x, y: rc.y - r });
      blocked[i] = true;
    }
  });

  return {
    you,
    receivers,
    defenders,
    openIndex,
    margin,
    closeMs: closeMs(level),
    r,
  };
}

// Grade a tap (by receiver index) against the open lane.
//   tappedIndex : index of the receiver the player tapped, or -1 if none / timeout
//   openIndex   : index of the truly-open receiver
//   elapsedMs   : ms from lane-open to the tap
//   closeMs     : ms the lane stayed open
// Success only when the player tapped the open receiver before the lane closed.
// Points reward speed: feed gradedPoints a normalized value = elapsedMs/closeMs
// (0 = instant -> max points). A wrong pick, no pick, or an expired countdown is
// a miss worth 0 points. Returns { success, points, normElapsed }.
export function scoreLane(tappedIndex, openIndex, elapsedMs, closeMs) {
  const inTime = elapsedMs <= closeMs;
  const success = tappedIndex === openIndex && inTime;
  if (!success) return { success: false, points: 0, normElapsed: Math.min(Math.max(elapsedMs / (closeMs || 1), 0), 1) };
  const normElapsed = Math.min(Math.max(elapsedMs / (closeMs || 1), 0), 1);
  return { success: true, points: gradedPoints(normElapsed), normElapsed };
}
