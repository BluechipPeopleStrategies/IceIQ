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
