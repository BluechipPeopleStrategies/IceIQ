// Pure scoring for the Shoot or Hold drill, on the gym's shared 0-1000 scale.
// A hit is graded by reaction time (faster = more, like the other speed
// drills); a clean hold earns a flat reward; every error kind earns 0 so a
// session can never go negative (kid-safe scoring, no -3 turnovers).

import { gradedPoints } from "./gymPoints.js";

export const RT_FLOOR_MS = 180; // ~human floor; taps at/below it score max
export const HOLD_POINTS = 350;
export const DECOY_HOLD_POINTS = 400; // ignoring the fake-out is a harder call than a plain hold

export function reactionPoints({ kind, rt = 0, windowMs = 900 }) {
  if (kind === "hit") {
    const e = Math.max(0, rt - RT_FLOOR_MS) / Math.max(1, windowMs);
    return gradedPoints(e);
  }
  if (kind === "hold") return HOLD_POINTS;
  if (kind === "decoyHold") return DECOY_HOLD_POINTS;
  return 0;
}
