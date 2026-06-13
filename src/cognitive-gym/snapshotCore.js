// src/cognitive-gym/snapshotCore.js
// Pure helpers for Snapshot (glance memory / perception span): build a formation
// of skaters that flashes for a moment, then grade where the player taps for the
// open teammate. No DOM, no canvas, so it is unit-testable in plain Node.
import { levelT, lerp } from "./gymEngine.js";
import { gradedPoints } from "./gymPoints.js";

// How long the whole formation is shown, in ms, before it hides. Shorter is
// harder: the player gets a quicker glance to take their mental snapshot.
export const EASY_FLASH_MS = 700;
export const HARD_FLASH_MS = 280;

// How many markers are on the ice (clutter to read past). The open teammate is
// always one of these. More markers = a busier picture to scan in one look.
export const EASY_MARKERS = 4;
export const HARD_MARKERS = 12;

// Success-window radius as a fraction of min(W, H). A tap within this distance of
// the open teammate's true spot counts as a hit (drives leveling). Tightens with
// level so a higher level is genuinely harder.
export const EASY_HIT_FRAC = 0.16;
export const HARD_HIT_FRAC = 0.06;

// How long the formation flashes, in ms, for a level.
export function flashMs(level) {
  return Math.round(lerp(EASY_FLASH_MS, HARD_FLASH_MS, levelT(level)));
}

// How many markers are on the ice for a level (open teammate included).
export function markerCount(level) {
  return Math.round(lerp(EASY_MARKERS, HARD_MARKERS, levelT(level)));
}

// Success-window radius in pixels for a level on a given canvas.
export function hitRadius(level, W, H) {
  return Math.min(W, H) * lerp(EASY_HIT_FRAC, HARD_HIT_FRAC, levelT(level));
}

// Build a formation for a level: a set of non-overlapping, in-bounds markers,
// exactly one of which is the OPEN teammate. The rest alternate between
// teammates and defenders for visual clutter (kinds: "open" | "teammate" |
// "defender"). `rng` is injectable so tests are deterministic; in the game it
// defaults to Math.random.
// Returns { markers:[{ x, y, kind }], openIndex, flashMs, hitR }.
export function makeFormation(level, W, H, { rng = Math.random } = {}) {
  const count = markerCount(level);
  const r = Math.max(11, Math.round(W * 0.026)); // marker radius
  const pad = r + 8; // keep markers off the boards
  const minGap = r * 2.4; // center-to-center spacing so none overlap
  const markers = [];
  let guard = 0;

  while (markers.length < count && guard < 4000) {
    guard += 1;
    const x = pad + rng() * (W - 2 * pad);
    const y = pad + rng() * (H - 2 * pad);
    if (markers.every((o) => Math.hypot(o.x - x, o.y - y) >= minGap)) {
      markers.push({ x, y, kind: "teammate" });
    }
  }

  // Pick the open teammate, then make every other marker alternate
  // teammate/defender so the clutter is a mix to read past.
  const openIndex = Math.floor(rng() * markers.length);
  markers.forEach((mk, i) => {
    if (i === openIndex) mk.kind = "open";
    else mk.kind = i % 2 === 0 ? "defender" : "teammate";
  });

  return {
    markers,
    openIndex,
    flashMs: flashMs(level),
    hitR: hitRadius(level, W, H),
    r,
  };
}

// Grade a tap against the open teammate's true position.
//   tap     : { x, y } where the player tapped
//   openPos : { x, y, hitR } the true open-teammate spot (hitR = window in px)
//   W, H    : canvas size, used to normalize the error for points
// Success when the tap is within the success window (same spot as the open
// teammate). normError is the straight-line miss normalized by the canvas
// diagonal (0 = exact), so points reward landing dead-on, not just inside the
// ring. Returns { success, normError, distPx, points }.
export function scoreTap(tap, openPos, W, H) {
  const dx = tap.x - openPos.x;
  const dy = tap.y - openPos.y;
  const distPx = Math.sqrt(dx * dx + dy * dy);
  const success = distPx <= openPos.hitR;
  const diag = Math.sqrt(W * W + H * H) || 1;
  const normError = distPx / diag;
  const points = gradedPoints(normError);
  return { success, normError, distPx, points };
}
