// src/cognitive-gym/eyesUpCore.js
// Pure helpers for Eyes Up (peripheral vision): pick where a teammate flashes in
// the periphery, and grade a tap against the true flash spot. No DOM, no canvas,
// so it is unit-testable in plain Node.
import { levelT, lerp } from "./gymEngine.js";
import { gradedPoints } from "./gymPoints.js";

// Possible flash positions live on a ring of evenly spaced angles around the
// center. Higher levels add more angles (more spots to be unsure about) and push
// the flash farther into the periphery (closer to the boards). The success
// window also tightens, so a level genuinely gets harder.
export const MIN_SLOTS = 4; // easy: corners-ish, few choices
export const MAX_SLOTS = 12; // hard: many possible spots

// How far out (as a fraction of the max usable radius) the flash sits. 0 = at
// the center, 1 = right at the boards. Easy flashes are closer in; hard flashes
// hug the boards where peripheral vision is weakest.
export const EASY_PERIPHERY = 0.55;
export const HARD_PERIPHERY = 0.92;

// Success window radius as a fraction of the canvas min(W,H). A tap within this
// distance of the true flash counts as the same region (a leveling "hit").
// Tightens with level.
export const EASY_HIT_FRAC = 0.18;
export const HARD_HIT_FRAC = 0.08;

// Flash duration in ms: how long the teammate marker is shown. Shorter = harder.
export const EASY_FLASH_MS = 520;
export const HARD_FLASH_MS = 180;

// Number of evenly spaced slots on the ring for a level.
export function slotCount(level) {
  return Math.round(lerp(MIN_SLOTS, MAX_SLOTS, levelT(level)));
}

// How long the flash is shown, in ms, for a level.
export function flashMs(level) {
  return Math.round(lerp(EASY_FLASH_MS, HARD_FLASH_MS, levelT(level)));
}

// Success-window radius in pixels for a level on a given canvas.
export function hitRadius(level, W, H) {
  return Math.min(W, H) * lerp(EASY_HIT_FRAC, HARD_HIT_FRAC, levelT(level));
}

// The usable half-extents from center to just inside the boards. We inset so the
// flash never lands on the boards themselves.
function extents(W, H) {
  const inset = 0.08; // keep the flash off the very edge
  return { ex: (W / 2) * (1 - inset), ey: (H / 2) * (1 - inset) };
}

// Pick a flash position for a level. `slot` (0..slots-1) and `rng` are injectable
// so tests are deterministic; in the game they default to random.
// Returns { x, y, slot, slots, peripheryFrac, flashMs, hitR }.
export function pickFlash(level, W, H, { slot, rng = Math.random } = {}) {
  const slots = slotCount(level);
  const chosen = slot == null ? Math.floor(rng() * slots) : ((slot % slots) + slots) % slots;
  // Spread angles around the ring, offset so spots favor the boards/corners
  // rather than always landing dead-center on an axis.
  const angle = (chosen / slots) * Math.PI * 2 + Math.PI / slots;
  const peripheryFrac = lerp(EASY_PERIPHERY, HARD_PERIPHERY, levelT(level));
  const { ex, ey } = extents(W, H);
  const cx = W / 2;
  const cy = H / 2;
  const x = cx + Math.cos(angle) * ex * peripheryFrac;
  const y = cy + Math.sin(angle) * ey * peripheryFrac;
  return {
    x,
    y,
    slot: chosen,
    slots,
    peripheryFrac,
    flashMs: flashMs(level),
    hitR: hitRadius(level, W, H),
  };
}

// Grade a tap against the true flash spot.
//   tap   : { x, y } where the player tapped
//   flash : { x, y, hitR } the true flash (hitR = success window in px)
//   W, H  : canvas size, used to normalize the error for points
// Success when the tap is within the success window (same region as the flash).
// normError is the straight-line miss normalized by the canvas diagonal (0 =
// exact), so points reward landing right on the spot, not just inside the ring.
// Returns { success, normError, distPx, points }.
export function scoreTap(tap, flash, W, H) {
  const dx = tap.x - flash.x;
  const dy = tap.y - flash.y;
  const distPx = Math.sqrt(dx * dx + dy * dy);
  const success = distPx <= flash.hitR;
  const diag = Math.sqrt(W * W + H * H) || 1;
  const normError = distPx / diag;
  const points = gradedPoints(normError);
  return { success, normError, distPx, points };
}
