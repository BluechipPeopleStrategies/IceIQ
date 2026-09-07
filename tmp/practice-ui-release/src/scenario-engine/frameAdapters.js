// Presentation-frame adapters, per the spec: "Normalized 0..1, the current
// 200x85 play space, and the legacy 600x300 space are presentation frames.
// Pure adapters declare source/destination frame, mirroring, precision, and
// round-trip tolerance. Adapters may reject bad coordinates but may never
// clamp a physics failure into legal bounds."
//
// Three real relationships exist in this codebase today, not three
// independent siblings:
//   - 200x85 (feet, src/play/*) is the live animated-play catalog's own
//     space, anchored to real rink landmarks (src/play/rinkAnchors.js).
//   - 600x300 (legacy SVG px, src/RinkReadsRinkQuestion.jsx) is a separate,
//     independently-drawn schematic with a different aspect ratio (2.0 vs
//     200x85's ~2.353) -- a presentation stretch, not a proportionally
//     accurate second rendering of the same rink.
//   - normalized 0..1 is defined AS a fraction of the 600x300 canvas
//     specifically (confirmed in RinkReadsRinkQuestion.jsx's own
//     scaleNormalizedCoordsForRender: x*600, y*300, no offset) -- so 0..1's
//     relationship to RinkFrame is composed through 600x300, not derived
//     independently.
// This is a documented assumption for the 600x300/0..1 pair specifically:
// they map onto RinkFrame's real playable bounds by linear scale, NOT
// preserving aspect ratio, since the legacy canvas itself does not preserve
// the real rink's aspect ratio. If that canvas turns out to draw with
// margins/padding around the ice rather than edge-to-edge, this mapping
// needs recalibration -- flagged here rather than silently assumed perfect.

import { NHL_200X85_PROFILE, feetPointToRinkFrame, rinkFramePointToFeet, isWithinBounds } from "./rinkFrame.js";

export class FrameAdapterError extends Error {
  constructor(adapterName, input, reason) {
    super(`${adapterName}: rejected ${JSON.stringify(input)} -- ${reason}`);
    this.name = "FrameAdapterError";
    this.adapterName = adapterName;
    this.input = input;
  }
}

function round(n, decimals) {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

// ---- 200x85 play space (feet) <-> RinkFrame (metres) ----------------------

export const PLAY_SPACE_200X85_ADAPTER = Object.freeze({
  source: "play-space-200x85",
  destination: "rink-frame",
  mirroring: "none",
  precision: 1, // matches rinkAnchors.js's own at() rounding
  roundTripToleranceM: 0.01,
});

export function playSpaceToRinkFrame(point, profile = NHL_200X85_PROFILE) {
  const [x, y] = point;
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new FrameAdapterError("playSpaceToRinkFrame", point, "non-finite coordinate");
  }
  const converted = feetPointToRinkFrame(point);
  if (!isWithinBounds(converted, profile)) {
    throw new FrameAdapterError("playSpaceToRinkFrame", point, "outside playable bounds after conversion");
  }
  return converted;
}

// Converting a RinkFrame (physics-truth) point OUT to a presentation frame
// is exactly where a physics failure could get silently hidden by clamping.
// This throws instead -- the caller sees the failure, it never renders as a
// legal-looking coordinate.
export function rinkFrameToPlaySpace(point, profile = NHL_200X85_PROFILE) {
  const [x, y] = point;
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new FrameAdapterError("rinkFrameToPlaySpace", point, "non-finite coordinate");
  }
  if (!isWithinBounds(point, profile)) {
    throw new FrameAdapterError("rinkFrameToPlaySpace", point, "outside playable bounds -- refusing to render an illegal physics result as if it were legal");
  }
  const [xFt, yFt] = rinkFramePointToFeet(point);
  return [round(xFt, PLAY_SPACE_200X85_ADAPTER.precision), round(yFt, PLAY_SPACE_200X85_ADAPTER.precision)];
}

// ---- Legacy 600x300 (px) <-> RinkFrame (metres) ----------------------------

const LEGACY_CANVAS = { width: 600, height: 300 };

export const LEGACY_600X300_ADAPTER = Object.freeze({
  source: "legacy-600x300",
  destination: "rink-frame",
  mirroring: "none",
  precision: 1,
  roundTripToleranceM: 0.05, // looser: independent x/y scale factors, more accumulated rounding
});

function legacyScaleFactors(profile) {
  return {
    sx: LEGACY_CANVAS.width / profile.lengthM,
    sy: LEGACY_CANVAS.height / profile.widthM,
  };
}

export function legacy600x300ToRinkFrame([xPx, yPx], profile = NHL_200X85_PROFILE) {
  if (!Number.isFinite(xPx) || !Number.isFinite(yPx)) {
    throw new FrameAdapterError("legacy600x300ToRinkFrame", [xPx, yPx], "non-finite coordinate");
  }
  const { sx, sy } = legacyScaleFactors(profile);
  const point = [
    round(xPx / sx - profile.lengthM / 2, 6),
    round(yPx / sy - profile.widthM / 2, 6),
  ];
  if (!isWithinBounds(point, profile)) {
    throw new FrameAdapterError("legacy600x300ToRinkFrame", [xPx, yPx], "outside playable bounds after conversion");
  }
  return point;
}

export function rinkFrameToLegacy600x300(point, profile = NHL_200X85_PROFILE) {
  if (!isWithinBounds(point, profile)) {
    throw new FrameAdapterError("rinkFrameToLegacy600x300", point, "outside playable bounds -- refusing to render an illegal physics result as if it were legal");
  }
  const { sx, sy } = legacyScaleFactors(profile);
  const [x, y] = point;
  return [
    round((x + profile.lengthM / 2) * sx, LEGACY_600X300_ADAPTER.precision),
    round((y + profile.widthM / 2) * sy, LEGACY_600X300_ADAPTER.precision),
  ];
}

// ---- Normalized 0..1 <-> RinkFrame (composed through 600x300) -------------

export const NORMALIZED_ADAPTER = Object.freeze({
  source: "normalized-0-1",
  destination: "rink-frame",
  mirroring: "none",
  precision: 4,
  roundTripToleranceM: 0.05,
});

export function normalizedToRinkFrame([nx, ny], profile = NHL_200X85_PROFILE) {
  if (!Number.isFinite(nx) || !Number.isFinite(ny) || nx < 0 || nx > 1 || ny < 0 || ny > 1) {
    throw new FrameAdapterError("normalizedToRinkFrame", [nx, ny], "must be finite and within 0..1");
  }
  return legacy600x300ToRinkFrame([nx * LEGACY_CANVAS.width, ny * LEGACY_CANVAS.height], profile);
}

export function rinkFrameToNormalized(point, profile = NHL_200X85_PROFILE) {
  const [xPx, yPx] = rinkFrameToLegacy600x300(point, profile);
  return [
    round(xPx / LEGACY_CANVAS.width, NORMALIZED_ADAPTER.precision),
    round(yPx / LEGACY_CANVAS.height, NORMALIZED_ADAPTER.precision),
  ];
}
