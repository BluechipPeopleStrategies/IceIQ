// Pure scorer for the point primitive. User produces a single (x,y) on
// the rink; we compare to a target (point or zone) within tolerance.

import { resolveTarget } from "../zones.js";

export function scorePoint(userPoint, correct) {
  if (!userPoint || typeof userPoint.x !== "number" || typeof userPoint.y !== "number") {
    return { ok: false, reason: "noPoint" };
  }
  // correct.kind === "point" + (zoneId OR x,y) + tolerance
  let target;
  try { target = resolveTarget(correct); }
  catch (e) { return { ok: false, reason: "badTarget", message: e.message }; }
  const dx = userPoint.x - target.x;
  const dy = userPoint.y - target.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return {
    ok: distance <= target.tolerance,
    reason: distance <= target.tolerance ? "ok" : "offTarget",
    distance, target,
  };
}
