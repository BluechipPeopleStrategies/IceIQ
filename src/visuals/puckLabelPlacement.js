const QUADRANTS = [['se', 1, 1], ['sw', -1, 1], ['ne', 1, -1], ['nw', -1, -1]];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const intersection = (a, b) => Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x))
  * Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));

/** Project real actor footprints, bodies and conservative badge rectangles. */
export function puckLabelObstacles(actors, project) {
  const rectangles = [];
  for (const actor of actors) {
    if (!actor || ![actor.x, actor.y].every(Number.isFinite)) continue;
    let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
    // Include the ice ring as well as the body at low rink-side angles.
    for (const dx of [-.95, .95]) for (const dy of [-.95, .95]) for (const height of [0, 2.05]) {
      const point = project(actor.x + dx, actor.y + dy, height);
      left = Math.min(left, point.x); top = Math.min(top, point.y);
      right = Math.max(right, point.x); bottom = Math.max(bottom, point.y);
    }
    rectangles.push({ x: left - 3, y: top - 3, width: right - left + 6, height: bottom - top + 6 });
    if (actor.label) {
      const width = Math.max(36, Math.min(120, String(actor.label).length * 7 + 22));
      const head = project(actor.x, actor.y, actor.role === 'goalie' ? 1.95 : 2.12);
      const control = project(actor.x, actor.y, .9);
      // Static Html labels sit above the head; draggable labels sit above their
      // 58px control. Keeping both envelopes also covers legacy read badges.
      rectangles.push({ x: head.x - width / 2, y: head.y - 31, width, height: 31 });
      rectangles.push({ x: control.x - width / 2, y: control.y - 57, width, height: 29 });
    }
  }
  return rectangles;
}

/** Four bounded screen-space choices. This places a label, never the puck. */
export function placePuckLabel({ anchor, viewport, labelSize = { width: 43, height: 22 }, obstacles = [], previousQuadrant = null, anchorRadius = 0 }) {
  if (![anchor?.x, anchor?.y, viewport?.width, viewport?.height].every(Number.isFinite) || viewport.width < 20 || viewport.height < 20) return null;
  const margin = 5, gap = Math.max(18, anchorRadius + 7);
  const width = Math.min(labelSize.width, viewport.width - margin * 2), height = Math.min(labelSize.height, viewport.height - margin * 2);
  const nearby = obstacles.filter(rect => [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite))
    .map(rect => ({ x: rect.x - 5, y: rect.y - 5, width: rect.width + 10, height: rect.height + 10 }));
  const puckSpace = { x: anchor.x - 9, y: anchor.y - 9, width: 18, height: 18 };
  const candidates = QUADRANTS.map(([quadrant, dx, dy]) => {
    const x = clamp(anchor.x + (dx > 0 ? gap : -gap - width), margin, viewport.width - margin - width);
    const y = clamp(anchor.y + (dy > 0 ? gap : -gap - height), margin, viewport.height - margin - height);
    const rect = { x, y, width, height };
    const overlapArea = nearby.reduce((sum, obstacle) => sum + intersection(rect, obstacle), 0);
    // Protect the puck even if clamping near an edge collapses a candidate.
    const score = overlapArea + intersection(rect, puckSpace) * 4;
    return { ...rect, quadrant, overlapArea, score };
  });
  const best = candidates.reduce((chosen, candidate) => candidate.score < chosen.score - .01
    || (Math.abs(candidate.score - chosen.score) < .01 && candidate.quadrant === previousQuadrant) ? candidate : chosen);
  const endX = clamp(anchor.x, best.x, best.x + width), endY = clamp(anchor.y, best.y, best.y + height);
  const distance = Math.hypot(endX - anchor.x, endY - anchor.y);
  const startDistance = Math.min(Math.max(0, anchorRadius), distance);
  const leaderAngle = Math.atan2(endY - anchor.y, endX - anchor.x);
  return { x: best.x, y: best.y, width, height, quadrant: best.quadrant, overlapArea: best.overlapArea,
    offsetX: best.x - anchor.x, offsetY: best.y - anchor.y,
    leaderStartX: Math.cos(leaderAngle) * startDistance, leaderStartY: Math.sin(leaderAngle) * startDistance,
    leaderLength: distance - startDistance, leaderAngle };
}
