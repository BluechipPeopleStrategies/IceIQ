const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const overlap = (a, b) => Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x))
  * Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));

/** Move only the cue. The anchor continues to identify its authored actor. */
export function placeRinkActionCue({ anchor, viewport, labelSize, offset = [42, 0], obstacles = [] }) {
  if (![anchor?.x, anchor?.y, viewport?.width, viewport?.height].every(Number.isFinite)
    || viewport.width < 20 || viewport.height < 20) return null;
  const margin = 6, gap = 8;
  const width = Math.min(labelSize.width, viewport.width - margin * 2);
  const height = Math.min(labelSize.height, viewport.height - margin * 2);
  const occupied = obstacles.filter(rect => [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite));
  const centers = [[anchor.x + offset[0], anchor.y + offset[1]], [anchor.x - offset[0], anchor.y + offset[1]]];
  // Test each obstruction's outer edges as well as the preferred offset. That
  // permits a close camera to place a cue beyond the full projected body.
  for (const rect of occupied) centers.push(
    [rect.x + rect.width + gap + width / 2, anchor.y], [rect.x - gap - width / 2, anchor.y],
    [anchor.x, rect.y - gap - height / 2], [anchor.x, rect.y + rect.height + gap + height / 2],
  );
  const candidates = centers.map(([centerX, centerY]) => {
    const x = clamp(centerX - width / 2, margin, viewport.width - margin - width);
    const y = clamp(centerY - height / 2, margin, viewport.height - margin - height);
    const rect = { x, y, width, height };
    const overlapArea = occupied.reduce((sum, obstacle) => sum + overlap(rect, obstacle), 0);
    const preferenceDistance = Math.hypot(x + width / 2 - anchor.x - offset[0], y + height / 2 - anchor.y - offset[1]);
    const distance = Math.hypot(x + width / 2 - anchor.x, y + height / 2 - anchor.y);
    return { ...rect, overlapArea, distanceScore: distance + preferenceDistance * .01 };
  });
  const best = candidates.reduce((chosen, candidate) => candidate.overlapArea < chosen.overlapArea - .01
    || (Math.abs(candidate.overlapArea - chosen.overlapArea) < .01 && candidate.distanceScore < chosen.distanceScore) ? candidate : chosen);
  const endX = clamp(anchor.x, best.x, best.x + width), endY = clamp(anchor.y, best.y, best.y + height);
  return { ...best, offsetX: best.x + width / 2 - anchor.x, offsetY: best.y + height / 2 - anchor.y,
    leaderLength: Math.hypot(endX - anchor.x, endY - anchor.y), leaderAngle: Math.atan2(endY - anchor.y, endX - anchor.x) };
}
