import { NHL_200X85_PROFILE } from "../scenario-engine/rinkFrame.js";

// Eyes Up keeps its historical canvas contract (pixels, with x along the
// rink's long axis and y across it). The 3D scene uses the canonical rink
// frame in metres, so the visual and the score use the same physical scale.
export const EYES_UP_RINK = NHL_200X85_PROFILE;
const { bounds } = EYES_UP_RINK;

export function pixelToRinkPoint(point, width, height) {
  if (!point || !(width > 0) || !(height > 0)) return null;
  const x = bounds.minX + (point.x / width) * (bounds.maxX - bounds.minX);
  const y = bounds.minY + (point.y / height) * (bounds.maxY - bounds.minY);
  return { x, y };
}

// PracticeScene's world convention is [canonical y, height, -canonical x].
export function pixelToWorldPoint(point, width, height, surfaceHeight = 0.08) {
  const rink = pixelToRinkPoint(point, width, height);
  return rink ? { x: rink.y, y: surfaceHeight, z: -rink.x } : null;
}

export function rinkPointToPixel(point, width, height) {
  if (!point || !(width > 0) || !(height > 0)) return null;
  return {
    x: ((point.x - bounds.minX) / (bounds.maxX - bounds.minX)) * width,
    y: ((point.y - bounds.minY) / (bounds.maxY - bounds.minY)) * height,
  };
}

export function worldPointToPixel(point, width, height) {
  if (!point) return null;
  return rinkPointToPixel({ x: -point.z, y: point.x }, width, height);
}

export function isRinkPointOnIce(point, inset = 0) {
  if (!point) return false;
  const x = point.x;
  const y = point.y;
  const minX = bounds.minX + inset;
  const maxX = bounds.maxX - inset;
  const minY = bounds.minY + inset;
  const maxY = bounds.maxY - inset;
  if (x < minX || x > maxX || y < minY || y > maxY) return false;

  // NHL_200X85_PROFILE is a rounded rectangle. Keep the transparent hit
  // surface honest at its four corners instead of making the rectangular
  // plane clickable beyond the boards.
  const radius = 8.5344 - inset;
  const cornerX = Math.max(minX + radius, Math.min(maxX - radius, x));
  const cornerY = Math.max(minY + radius, Math.min(maxY - radius, y));
  const inCorner = (x < minX + radius || x > maxX - radius)
    && (y < minY + radius || y > maxY - radius);
  return !inCorner || Math.hypot(x - cornerX, y - cornerY) <= radius;
}

export function worldPointToEyesUpTap(point, width, height) {
  if (!point) return null;
  const rink = { x: -point.z, y: point.x };
  return isRinkPointOnIce(rink) ? rinkPointToPixel(rink, width, height) : null;
}

// Preserve a live look during a resize. The trial stage, armed flag, and
// result are deliberately copied unchanged: resizing is presentation work,
// never a free restart or an answer reveal.
export function resizeEyesUpTrial(trial, width, height) {
  if (!trial || !(width > 0) || !(height > 0)) return trial;
  const prevW = trial.W || width;
  const prevH = trial.H || height;
  const sx = width / prevW;
  const sy = height / prevH;
  const scale = (point) => point ? { ...point, x: point.x * sx, y: point.y * sy } : point;
  return {
    ...trial,
    W: width,
    H: height,
    flash: trial.flash ? { ...trial.flash, x: trial.flash.x * sx, y: trial.flash.y * sy, hitR: trial.flash.hitR * Math.min(sx, sy) } : trial.flash,
    tap: scale(trial.tap),
  };
}
