// Geometry and phase gates shared by the cognitive-gym WebGL feedback scenes.
// These helpers keep 3D overlays tied to the same regulation-rink units used
// by the canvas scoring cores.
export const RINK_LENGTH_M = 60.96;
export const RINK_WIDTH_M = 25.908;

export function trackingTargetVisible(stage, isTarget) {
  return !!isTarget && (stage === "watch" || stage === "feedback");
}

// Convert a canvas hit radius measured in pixels to physical radii on the
// canonical rink axes. The canvas can be a different aspect ratio from the
// regulation sheet, so a circle in pixels becomes an ellipse in metres.
export function pixelHitRadii(hitPx, width, height) {
  if (!(hitPx >= 0) || !(width > 0) || !(height > 0)) return null;
  return {
    x: hitPx * RINK_LENGTH_M / width,
    z: hitPx * RINK_WIDTH_M / height,
  };
}

// A real-foot tolerance along the answer axis, used by Read the Pass. The
// returned metre radius is independent of the current canvas dimensions.
export function feetToMetres(feet) {
  return feet >= 0 ? feet * 0.3048 : null;
}

// Presentation gates for the drills' player-facing overlays. These mirror the
// canvas phases so a 3D shell cannot leak a number or answer before the drill
// asks the player to use it.
export function readNumbersLabelsVisible(stage) {
  return stage === "watch" || stage === "feedback";
}

export function lateReadCueIndex(scene, now) {
  if (!scene?.tr || !['live', 'reveal'].includes(scene.stage)) return null;
  if (scene.stage === 'reveal') return scene.tr.finalIndex;
  const changed = scene.tr.changes && scene.startTs != null && now - scene.startTs >= scene.tr.changeAtMs;
  return changed ? scene.tr.finalIndex : scene.tr.firstIndex;
}

export function countdownRingScale(fraction) {
  if (!Number.isFinite(fraction)) return 0;
  return Math.max(0.01, Math.min(1, Math.max(0, fraction)));
}

export function runPlayStepIndex(elapsedMs, stepMs, sequenceLength) {
  if (!(stepMs > 0) || !(sequenceLength > 0) || !Number.isFinite(elapsedMs)) return -1;
  return Math.min(Math.floor(Math.max(0, elapsedMs) / stepMs), sequenceLength - 1);
}

export function runPlayCatchFraction(elapsedMs, stepMs) {
  if (!(stepMs > 0) || !Number.isFinite(elapsedMs)) return 0;
  const withinStep = Math.max(0, elapsedMs) % stepMs;
  return Math.min(1, Math.max(0, withinStep / stepMs / 0.85));
}
