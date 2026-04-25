// Pure scorer for the path primitive. Lives in a non-JSX module so it
// can be imported from Node-side tools (CLI authoring, validators) as
// well as from the React component.

import { resolveTarget } from "../zones.js";

const INTERCEPT_RADIUS = 0.035;

function distance(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function minDistanceToPath(pt, path) {
  let best = Infinity;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    const dx = b.x - a.x, dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    let t = 0;
    if (len2 > 0) {
      t = ((pt.x - a.x) * dx + (pt.y - a.y) * dy) / len2;
      t = Math.max(0, Math.min(1, t));
    }
    const px = a.x + t * dx, py = a.y + t * dy;
    const d = Math.sqrt((pt.x - px) ** 2 + (pt.y - py) ** 2);
    if (d < best) best = d;
  }
  return best;
}

export function scorePath(userPath, correct, opts = {}) {
  if (!userPath || userPath.length < 2) return { ok: false, reason: "tooShort" };
  const target = resolveTarget(correct.end);
  const endPoint = userPath[userPath.length - 1];
  const d = distance(endPoint, target);
  const defenders = Array.isArray(opts.defenders) ? opts.defenders : [];
  for (const def of defenders) {
    if (minDistanceToPath(def, userPath) < INTERCEPT_RADIUS) {
      return {
        ok: false, reason: "intercepted",
        endPoint, target,
        intercepterId: def.id || null,
      };
    }
  }
  return {
    ok: d <= target.tolerance,
    reason: d <= target.tolerance ? "ok" : "offTarget",
    distance: d, endPoint, target,
  };
}
