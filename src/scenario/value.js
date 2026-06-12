// value.js — deterministic proxemics/value model (zero-token, no ML, no data
// dependency; calibratable with public tracking data later). This is the
// "intelligence layer": it scores every candidate answer so correctness becomes
// PROVABLE (the right read is the highest-value action) and answer cardinality
// becomes COUNTABLE (how many options clear the bar). Built to score scenarios in
// canonical view:"right" space (offensive net at x≈0.918, y=0.5).
//
// Three primitives, composed:
//   shotValue(p)              — xG-like value of having the puck at p (close +
//                               central = high).
//   passSuccess(from,to,defs) — completion probability of a pass through traffic.
//   passValue(from,to,defs)   — passSuccess × shotValue(to): value of the option.
// Plus controlAt() (pitch-control-lite) and rankers used by the cardinality check.

const NET_RIGHT = { x: 0.918, y: 0.5 };
const NET_LEFT = { x: 0.082, y: 0.5 };

function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

// Perpendicular distance from point c to segment a→b (clamped to the segment).
function pointToSegmentDist(a, b, c) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  let t = len2 > 0 ? ((c.x - a.x) * dx + (c.y - a.y) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(c.x - (a.x + t * dx), c.y - (a.y + t * dy));
}

function netFor(view) { return view === "left" ? NET_LEFT : NET_RIGHT; }

// Danger of holding the puck at p relative to a net: decays with distance and
// with angle off the central axis (the slot is gold; the boards are not). 0..1.
function dangerAt(p, net) {
  const d = dist(p, net);
  const distTerm = Math.max(0, 1 - d / 0.55);                 // ~0 by 0.55 out
  const angle = Math.atan2(Math.abs(p.y - net.y), Math.abs(net.x - p.x)); // 0..π/2
  const angleTerm = Math.max(0, 1 - angle / (Math.PI / 2));   // 1 dead-center
  return +(distTerm * (0.45 + 0.55 * angleTerm)).toFixed(3);
}

// xG-like value of YOUR puck at p (toward the attacking net).
export function shotValue(p, view = "right") { return dangerAt(p, netFor(view)); }

// Threat an OPPONENT at p poses to the net you're defending — for coverage reads
// ("which opponent do you take?"). Cover the highest-threat one.
export function threatValue(p, ourNet) { return dangerAt(p, ourNet); }

// Completion probability of a pass from→to through defenders. Driven by the
// closest defender's perpendicular distance to the lane (reuses the same lane
// geometry as validators.lineHitsCircle). 0.05..0.95.
export function passSuccess(from, to, defenders = [], laneR = 0.06) {
  if (!defenders.length) return 0.95;
  let nearest = Infinity;
  for (const d of defenders) nearest = Math.min(nearest, pointToSegmentDist(from, to, d));
  return +Math.max(0.05, Math.min(0.95, nearest / (2 * laneR))).toFixed(3);
}

// Value of a pass option = how likely it completes × how dangerous the receiver's
// ice is. This is what ranks selection/pass options.
export function passValue(from, to, defenders = [], view = "right") {
  return +(passSuccess(from, to, defenders) * shotValue(to, view)).toFixed(3);
}

// Pitch-control-lite: which team owns a point (nearest non-puck skater wins).
export function controlAt(p, actors = []) {
  let ours = Infinity, theirs = Infinity;
  for (const a of actors) {
    if (a.kind === "puck") continue;
    const dd = dist(p, a);
    if (a.kind === "player" || a.kind === "teammate") ours = Math.min(ours, dd);
    else theirs = Math.min(theirs, dd);
  }
  if (ours < theirs) return "ours";
  if (theirs < ours) return "theirs";
  return "contested";
}

// ── PRESSURE-ESCAPE MODEL (breakouts / defensive-zone reads) ───────────────
// The offensive model above values reaching dangerous ice near the ATTACKING
// net. Under pressure in your OWN end, value is the opposite: get the puck to a
// supported teammate with time, completing the pass, moving AWAY from your net.

// How contested a point is by opponents (nearest-defender pressure). 0..1.
export function pressureAt(p, opponents = []) {
  if (!opponents.length) return 0;
  let nearest = Infinity;
  for (const o of opponents) nearest = Math.min(nearest, dist(p, o));
  return +Math.max(0, Math.min(1, 1 - nearest / 0.25)).toFixed(3); // within ~0.25 = pressured
}

// Time and space at a point = inverse pressure.
export function opennessAt(p, opponents = []) { return +(1 - pressureAt(p, opponents)).toFixed(3); }

// Value of moving the puck from→to to escape pressure, defending `ownNet`.
// Rewards: the pass completing, the receiver being open (time/space), and
// progressing away from your own net (up ice, out of the zone).
export function escapeValue(from, to, opponents = [], ownNet = NET_LEFT) {
  const complete = passSuccess(from, to, opponents);
  const open = opennessAt(to, opponents);
  // progress: target farther from own net than the puck → out of danger
  const prog = Math.max(0, Math.min(1, (dist(to, ownNet) - dist(from, ownNet)) / 0.4 + 0.3));
  return +(complete * (0.35 + 0.35 * open + 0.30 * prog)).toFixed(3);
}

// Rank a breakout/def-zone selection by escape value from the carrier.
export function rankEscapeOptions(scenario) {
  const goalie = scenario.actors.find((a) => a.kind === "goalie");
  const ownNet = goalie ? { x: goalie.x, y: goalie.y } : (scenario.stage?.view === "left" ? NET_LEFT : NET_RIGHT);
  const puck = scenario.actors.find((a) => a.kind === "puck") || scenario.actors.find((a) => a.kind === "player");
  const opponents = scenario.actors.filter((a) => a.kind === "defender");
  const byId = Object.fromEntries(scenario.actors.map((a) => [a.id, a]));
  return (scenario.interaction?.from || [])
    .map((id) => ({ id, value: byId[id] ? escapeValue(puck, byId[id], opponents, ownNet) : 0 }))
    .sort((a, b) => b.value - a.value);
}

// Coverage read: candidates are OPPONENTS; rank by the threat each poses to the
// net we defend. Cover the most dangerous.
export function rankCoverageOptions(scenario) {
  const goalie = scenario.actors.find((a) => a.kind === "goalie");
  const ourNet = goalie ? { x: goalie.x, y: goalie.y } : (scenario.stage?.view === "left" ? NET_LEFT : NET_RIGHT);
  const byId = Object.fromEntries(scenario.actors.map((a) => [a.id, a]));
  return (scenario.interaction?.from || [])
    .map((id) => ({ id, value: byId[id] ? threatValue(byId[id], ourNet) : 0 }))
    .sort((a, b) => b.value - a.value);
}

// Pick the right value model from the read's shape:
//  - candidates are opponents → coverage (cover the biggest threat)
//  - def-zone pass read       → escape (breakout)
//  - otherwise                → offensive (best scoring option)
export function rankByZone(scenario) {
  const from = scenario.interaction?.from || [];
  const byId = Object.fromEntries(scenario.actors.map((a) => [a.id, a]));
  if (byId[from[0]]?.kind === "defender") return rankCoverageOptions(scenario);
  if (scenario.stage?.zone === "def-zone") return rankEscapeOptions(scenario);
  return rankSelectionOptions(scenario);
}

// Rank a selection scenario's candidates by pass value from the carrier. Returns
// [{id, value}] sorted high→low.
export function rankSelectionOptions(scenario) {
  const view = scenario.stage?.view || "right";
  const carrier = scenario.actors.find(a => a.kind === "player");
  const puck = scenario.actors.find(a => a.kind === "puck") || carrier;
  const defenders = scenario.actors.filter(a => a.kind === "defender");
  const byId = Object.fromEntries(scenario.actors.map(a => [a.id, a]));
  return (scenario.interaction?.from || [])
    .map(id => ({ id, value: byId[id] ? passValue(puck, byId[id], defenders, view) : 0 }))
    .sort((a, b) => b.value - a.value);
}

// The correct-answer SET implied by the value model: every option within
// `margin` of the top score. Cardinality = correctSet.length. The caller asserts
// this against the instance's expectCorrect.
export function correctSet(ranked, margin = 0.06) {
  if (!ranked.length) return [];
  const top = ranked[0].value;
  return ranked.filter(o => top - o.value <= margin).map(o => o.id);
}
