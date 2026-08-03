// src/cognitive-gym/snapshotCore.js
// Pure helpers for Snapshot (glance memory / perception span): build a formation
// of skaters that flashes for a moment, then grade where the player taps for the
// open teammate. No DOM, no canvas, so it is unit-testable in plain Node.
import { levelT, lerp, targetMaxY } from "./gymEngine.js";
import { gradedPoints } from "./gymPoints.js";
import { RINK_LENGTH_FT, RINK_WIDTH_FT } from "./anticipationCore.js";

// How long the whole formation is shown, in ms, before it hides. Shorter is
// harder: the player gets a quicker glance to take their mental snapshot.
export const EASY_FLASH_MS = 700;
export const HARD_FLASH_MS = 280;

// How many markers are on the ice (clutter to read past). The open teammate is
// always one of these. More markers = a busier picture to scan in one look.
export const EASY_MARKERS = 4;
export const HARD_MARKERS = 12;

// Success-window radius as a fraction of min(W, H). Legacy: the window was a
// pixel circle, but a pixel is a different number of feet on each axis (the
// canvas is not rink-proportioned), so a horizontal miss was ~1.5x harder than
// an identical-looking vertical one and the reported footage disagreed with the
// pass/fail. Kept only for callers that still pass a pixel window.
export const EASY_HIT_FRAC = 0.16;
export const HARD_HIT_FRAC = 0.06;

// The window as a REAL DISTANCE ON THE ICE, which means the same thing whatever
// shape the canvas is (S2-26: "have the answers be consistent with the rink
// dimensions ... make sure that we are capturing the distance").
export const EASY_HIT_FT = 18; // "same spot" for a U7 — about a faceoff circle
export const HARD_HIT_FT = 6;  // "same spot" for a U18 — a stick length
export const REFERENCE_FT = 40; // matches anticipationCore: ONE distance scale

export function hitRadiusFt(level) {
  return lerp(EASY_HIT_FT, HARD_HIT_FT, levelT(level));
}

// Pixels per foot on each axis. Exported so the renderer can draw the window as
// the ELLIPSE it really is while the canvas is not rink-proportioned.
export function pxPerFoot(W, H) {
  return { x: (W || 1) / RINK_LENGTH_FT, y: (H || 1) / RINK_WIDTH_FT };
}

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
  // Action Rail: the open teammate must never be under the Show me / Next look
  // button, so no marker is placed in the rail band.
  const yMax = targetMaxY(H) - pad;

  while (markers.length < count && guard < 4000) {
    guard += 1;
    const x = pad + rng() * (W - 2 * pad);
    const y = pad + rng() * (yMax - pad);
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
    hitFt: hitRadiusFt(level),
    hitR: hitRadius(level, W, H), // legacy pixel window, kept for drawing fallbacks
    r,
  };
}

// Grade a tap against the open teammate's true position.
//   tap     : { x, y } where the player tapped
//   openPos : { x, y, hitFt } the true spot (hitFt = success window in FEET)
//   W, H    : canvas size, used to convert pixels to feet
// Both the pass/fail and the points are measured in real feet, so a miss of a
// given distance on the ice scores the same in every direction. The old pixel
// window was a circle on screen but an ellipse on the ice.
//
// `openPos.hitR` (a pixel window) is still honoured when no hitFt is supplied,
// so older callers keep working. Returns { success, normError, distPx, distFt,
// points }.
export function scoreTap(tap, openPos, W, H) {
  const dx = tap.x - openPos.x;
  const dy = tap.y - openPos.y;
  const distPx = Math.sqrt(dx * dx + dy * dy);
  const s = pxPerFoot(W, H);
  const distFt = Math.hypot(dx / s.x, dy / s.y);
  const feetMode = openPos.hitFt != null;
  const success = feetMode ? distFt <= openPos.hitFt : distPx <= openPos.hitR;
  const diag = Math.sqrt(W * W + H * H) || 1;
  const normError = feetMode ? Math.min(1, distFt / REFERENCE_FT) : distPx / diag;
  const points = gradedPoints(normError);
  return { success, normError, distPx, distFt, points };
}
