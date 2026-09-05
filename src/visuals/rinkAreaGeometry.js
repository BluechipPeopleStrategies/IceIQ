import { NHL_200X85_PROFILE } from '../scenario-engine/rinkFrame.js';

// Approximate coaching regions, not official scoring boundaries. Polygons are
// kept inside the rounded NHL profile so overlays never spill over the boards.
const END_REGIONS = [
  { suffix: 'crease', name: 'Crease', color: '#bc6170', polygon: [[24.65, -1.5], [26.55, -1.5], [26.55, 1.5], [24.65, 1.5]] },
  { suffix: 'slot', name: 'Slot', color: '#d9b35a', polygon: [[20.0, -4.6], [24.5, -4.6], [24.5, 4.6], [20.0, 4.6]] },
  { suffix: 'high-slot', name: 'High slot', color: '#d9b35a', polygon: [[14.1, -4.6], [19.6, -4.6], [19.6, 4.6], [14.1, 4.6]] },
  { suffix: 'point-top', name: 'Point', color: '#527c9a', polygon: [[7.95, -7.35], [12.5, -7.35], [12.5, -4.2], [7.95, -4.2]] },
  { suffix: 'half-wall-top', name: 'Half wall', color: '#527c9a', polygon: [[13.5, -12.6], [21.5, -12.6], [23.2, -11.9], [21.2, -9.7], [13.5, -10.5]] },
  { suffix: 'corner-top', name: 'Corner', color: '#527c9a', polygon: [[23.4, -12.2], [25.5, -11.8], [27.5, -10.2], [29.1, -8.0], [29.8, -5.1], [27.4, -5.1], [25.5, -8.0], [23.4, -9.5]] },
  { suffix: 'behind-net', name: 'Behind the net', color: '#527c9a', polygon: [[27.15, -2.25], [28.55, -2.25], [29.05, -1.7], [29.05, 1.7], [28.55, 2.25], [27.15, 2.25]] },
];

const mirror = polygon => polygon.map(([x, y]) => [-x, y]);
const mirrorWidth = polygon => polygon.map(([x, y]) => [x, -y]);
const region = (id, name, color, polygon) => ({ id, name, color, polygon });

const endRegions = END_REGIONS.flatMap(item => {
  const positive = region(`right-${item.suffix}`, item.name, item.color, item.polygon);
  const negative = region(`left-${item.suffix}`, item.name, item.color, mirror(item.polygon));
  if (!item.suffix.includes('top')) return [positive, negative];
  const positiveOtherSide = region(`right-${item.suffix.replace('-top', '-bottom')}`, item.name, item.color, mirrorWidth(item.polygon));
  const negativeOtherSide = region(`left-${item.suffix.replace('-top', '-bottom')}`, item.name, item.color, mirrorWidth(mirror(item.polygon)));
  return [positive, negative, positiveOtherSide, negativeOtherSide];
});

export const RINK_AREA_REGIONS = [
  region('neutral-zone', 'Neutral zone', '#2f8ea0', [[-7.62, -12.85], [7.62, -12.85], [7.62, 12.85], [-7.62, 12.85]]),
  ...endRegions,
];

const boundsOf = polygon => ({
  minX: Math.min(...polygon.map(point => point[0])),
  maxX: Math.max(...polygon.map(point => point[0])),
  minY: Math.min(...polygon.map(point => point[1])),
  maxY: Math.max(...polygon.map(point => point[1])),
});

export function rinkAreaRegionIntersectsBounds(regionDefinition, bounds = NHL_200X85_PROFILE.bounds) {
  const regionBounds = boundsOf(regionDefinition.polygon);
  return regionBounds.maxX >= bounds.minX && regionBounds.minX <= bounds.maxX
    && regionBounds.maxY >= bounds.minY && regionBounds.minY <= bounds.maxY;
}

export function rinkAreaPointInsideProfile([x, y], inset = 0.05) {
  const { minX, maxX, minY, maxY } = NHL_200X85_PROFILE.bounds;
  const radius = 8.5344 - inset;
  const left = minX + inset, right = maxX - inset, top = minY + inset, bottom = maxY - inset;
  const cornerX = left + radius, cornerRightX = right - radius;
  const cornerTopY = top + radius, cornerBottomY = bottom - radius;
  if (x >= cornerX && x <= cornerRightX && y >= top && y <= bottom) return true;
  if (y >= cornerTopY && y <= cornerBottomY && x >= left && x <= right) return true;
  const candidates = [
    [cornerX, cornerTopY], [cornerRightX, cornerTopY],
    [cornerX, cornerBottomY], [cornerRightX, cornerBottomY],
  ];
  return candidates.some(([cx, cy]) => Math.hypot(x - cx, y - cy) <= radius);
}
