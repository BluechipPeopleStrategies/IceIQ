// Parametric geometry constructors for formations. These are the INVERSE of the
// hockey validators in ../validators.js: where the validator checks "is a
// defender on this pass lane?" (lineHitsCircle), these BUILD a defender on that
// lane. A compiled formation therefore passes lintScenario by construction.
//
// All coordinates are normalized 0..1 in canonical view:"right" space (attack
// toward the right net at x≈0.918). Left-view formations mirror at the end.

export const CREASE_RIGHT = { x: 0.918, y: 0.5 };
export const CREASE_LEFT = { x: 0.082, y: 0.5 };

// A wide-forward y for a given side. side === "right" → bottom half (y>0.5),
// "left" → top half (y<0.5). Flipping `side` is the entire strong/weak mirror.
export function wideY(side, spread) {
  return 0.5 + (side === "right" ? spread : -spread);
}

// Point a fraction t along segment a→b.
export function pointOnSegment(a, b, t) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

// A defender sitting ON the a→b lane (so lineHitsCircle(a,b,d,0.035) is true by
// construction). t small keeps it nearer the carrier (more central / goal-side);
// t large pushes it toward the receiver. biasTowardNet nudges x toward netX.
export function onLane(a, b, { t = 0.45, biasTowardNet = 0, netX = CREASE_RIGHT.x } = {}) {
  const p = pointOnSegment(a, b, t);
  const dir = netX > p.x ? 1 : -1;
  return { x: p.x + dir * biasTowardNet, y: p.y };
}

// A point goal-side of a threat: `depth` fraction along threat→net. Twin of the
// defenderGoalSide validator.
export function goalSide(threat, net, { depth = 0.4 } = {}) {
  return pointOnSegment(threat, net, depth);
}

// Mirror a coordinate across center ice for a left-view formation.
export function mirrorView(p) {
  return { x: 1 - p.x, y: p.y };
}
