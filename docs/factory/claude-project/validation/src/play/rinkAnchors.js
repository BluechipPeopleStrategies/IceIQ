// Named rink landmarks for the 200x85 play space, matched to the drawn
// backdrop in AnimatedPlay.jsx (goal lines x=11.7/188.3, blue lines
// x=74-76/124-126, right-zone circles at [169,22]/[169,63], net x=189-193).
//
// Anchors are an AUTHORING/GENERATION vocabulary: use `at()` while writing a
// play (or in a batch generator) so "the slot" is the same spot in every
// play. The resolved data stays plain [x,y] — renderer and validators are
// untouched. Mirror with `mirrorX` to author half-left plays from the same
// vocabulary.

export const RINK = { length: 200, width: 85, midY: 42.5 };

export const ANCHORS = {
  // Right (attacking-right) zone
  goalieRight: [187, 42],
  goalLineRight: [188.3, 42.5],
  netFrontRight: [184.5, 42.5],
  behindNetRight: [192.5, 42.5],
  slotRight: [176, 42.5],
  highSlotRight: [166, 42.5],
  circleTopRight: [169, 22],
  circleBottomRight: [169, 63],
  cornerTopRight: [184, 17],
  cornerBottomRight: [184, 68],
  wallTopRight: [168, 14],
  wallBottomRight: [168, 71],
  pointTopRight: [131, 22],
  pointBottomRight: [131, 63],
  blueLineRightMid: [126, 42.5],

  // Neutral ice
  centerIce: [100, 42.5],
  neutralTop: [100, 20],
  neutralBottom: [100, 65],
};

export const ANCHOR_NAMES = Object.keys(ANCHORS);

// at("slotRight")            -> [176, 42.5]
// at("netFrontRight", -6, 2) -> [178.5, 44.5]
export function at(name, dx = 0, dy = 0) {
  const base = ANCHORS[name];
  if (!base) throw new Error(`unknown rink anchor: ${name}`);
  return [Math.round((base[0] + dx) * 10) / 10, Math.round((base[1] + dy) * 10) / 10];
}

// Reflect a point (or an at() result) across center ice for half-left plays.
export function mirrorX(point) {
  return [Math.round((RINK.length - point[0]) * 10) / 10, point[1]];
}

// Line-segment landmarks: a wall/boards run has length along the ice, so
// "near the wall" is a point-to-segment question, not point-to-point (see
// docs/superpowers/specs/2026-07-30-anchor-fidelity-validator-design.md and
// docs/superpowers/specs/2026-07-30-wall-anchor-investigation.md).
// IMPORTANT: pair each wall anchor with the CORNER anchor on the SAME side,
// never with the opposite-side wall anchor. wallTopRight/wallBottomRight are
// mirror images across midY (same pattern as circleTopRight/circleBottomRight
// and cornerTopRight/cornerBottomRight) — they sit on opposite side-boards, so
// a line between them would cut straight across the ice through the slot, not
// run along any boards.
export const WALL_SEGMENTS = {
  right: {
    bottom: [ANCHORS.wallBottomRight, ANCHORS.cornerBottomRight], // [168,71] -> [184,68]
    top: [ANCHORS.wallTopRight, ANCHORS.cornerTopRight], // [168,14] -> [184,17]
  },
};
WALL_SEGMENTS.left = {
  bottom: [mirrorX(ANCHORS.wallBottomRight), mirrorX(ANCHORS.cornerBottomRight)],
  top: [mirrorX(ANCHORS.wallTopRight), mirrorX(ANCHORS.cornerTopRight)],
};

// Flat, string-keyed lookup so validators can resolve a segment by name the
// same way ANCHORS resolves a point by name.
export const WALL_SEGMENT_NAMES = {
  wallSegmentRightBottom: WALL_SEGMENTS.right.bottom,
  wallSegmentRightTop: WALL_SEGMENTS.right.top,
  wallSegmentLeftBottom: WALL_SEGMENTS.left.bottom,
  wallSegmentLeftTop: WALL_SEGMENTS.left.top,
};

// Closest point on segment [a,b] to p — clamped-t projection, the standard
// point-to-segment primitive (realtimecollisiondetection.net).
export function nearestPointOnSegment(p, a, b) {
  const abx = b[0] - a[0];
  const aby = b[1] - a[1];
  const lenSq = abx * abx + aby * aby;
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1,
    ((p[0] - a[0]) * abx + (p[1] - a[1]) * aby) / lenSq));
  return [a[0] + abx * t, a[1] + aby * t];
}

export function distanceToSegment(p, a, b) {
  const [qx, qy] = nearestPointOnSegment(p, a, b);
  return Math.hypot(p[0] - qx, p[1] - qy);
}
