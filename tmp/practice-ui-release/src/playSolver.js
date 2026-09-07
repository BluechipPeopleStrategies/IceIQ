// Deterministic read-solver. Computes the correct answer key from geometry, so
// it is correct BY CONSTRUCTION — an LLM never decides is_correct (it only writes
// rationale prose from `breakdown`). Coordinate space: 200 x 85 (NHL proportions),
// offensive net near x=185. Pure functions, no deps — importable by the app and
// by node golden tests (tools/solver-golden.mjs).

export const SOLVER_CONFIG = {
  POST_HALF: 3.0, GOALIE_WIDTH: 4.5,
  PASS_LANE_RADIUS: 3.5, SHOT_LANE_RADIUS: 3.0, SKATE_LANE_RADIUS: 4.0,
  MIN_SHOT_ANGLE: 4, COMMIT_ANGLE: 35, COMMIT_DIST: 12,
  GAP_TIGHT_THRESHOLD: 7, PRESSURE_RADIUS: 15,
  TIE_MARGIN: 0.08, DISTRACTOR_MARGIN: 0.10, MIN_PLAYER_SEP: 3.0, STRUCT_HASH_RES: 5,
};
const C = SOLVER_CONFIG;
const clamp = v => Math.max(0, Math.min(1, v));

// ── Geometry primitives ──────────────────────────────────────
export function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
export function pointToSegDist(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return dist(p, a);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  return dist(p, { x: a.x + t * dx, y: a.y + t * dy });
}
export function isLaneOpen(from, to, blockers, radius = C.PASS_LANE_RADIUS) {
  return !blockers.some(b => pointToSegDist(b, from, to) < radius);
}

// ── Core predicates ──────────────────────────────────────────
export function shotLive(carrier, net, goalie, blockers) {
  // Lane check excludes the goalie (he's accounted for in the angle below);
  // only other skaters can block a shot lane.
  if (!isLaneOpen(carrier, net, blockers, C.SHOT_LANE_RADIUS)) return { live: false, angle: 0 };
  const lp = { x: net.x, y: net.y - C.POST_HALF }, rp = { x: net.x, y: net.y + C.POST_HALF };
  const aL = Math.atan2(lp.y - carrier.y, lp.x - carrier.x);
  const aR = Math.atan2(rp.y - carrier.y, rp.x - carrier.x);
  const totalDeg = Math.abs(aL - aR) * 180 / Math.PI;
  const goalieDeg = 2 * Math.atan2(C.GOALIE_WIDTH / 2, dist(carrier, goalie)) * 180 / Math.PI;
  const openAngle = Math.max(0, totalDeg - goalieDeg);
  return { live: openAngle > C.MIN_SHOT_ANGLE, angle: openAngle };
}
export function defenderCommitted(defender, carrier) {
  if (dist(defender, carrier) > C.COMMIT_DIST) return false;
  const speed = Math.hypot(defender.vx || 0, defender.vy || 0);
  if (speed < 0.1) return false;
  const tx = carrier.x - defender.x, ty = carrier.y - defender.y;
  const dot = (defender.vx * tx + defender.vy * ty);
  const deg = Math.acos(Math.min(1, dot / (speed * Math.hypot(tx, ty)))) * 180 / Math.PI;
  return deg < C.COMMIT_ANGLE;
}
export function gapTight(defenders, carrier) {
  const closest = defenders.length ? Math.min(...defenders.map(d => dist(d, carrier))) : Infinity;
  return { tight: closest < C.GAP_TIGHT_THRESHOLD, closestDist: closest };
}
export function pressureIndex(defenders, carrier) {
  const near = defenders.filter(d => dist(d, carrier) < C.PRESSURE_RADIUS);
  if (!near.length) return 0;
  return Math.min(1, near.reduce((s, d) => s + (1 - dist(d, carrier) / C.PRESSURE_RADIUS), 0) / 2);
}

// ── Per-read scorers ─────────────────────────────────────────
function scoreShoot(s) {
  const shot = shotLive(s.carrier, s.net, s.goalie, s.defenders);
  if (!shot.live) return { score: 0.05, breakdown: { reason: "blocked/covered", angle: shot.angle } };
  const angleScore = Math.min(1, shot.angle / 20);
  const d = dist(s.carrier, s.net);
  const distScore = d < 10 ? 0.5 : d < 25 ? 1.0 : Math.max(0, 1 - (d - 25) / 40);
  const pressure = pressureIndex(s.defenders, s.carrier);
  return { score: clamp(0.45 * angleScore + 0.35 * distScore + 0.20 * (1 - pressure)), breakdown: { angleScore, distScore, pressure, angle: shot.angle } };
}
function scorePass(toId, s) {
  const target = s.teammates.find(t => t.id === toId);
  if (!target) return { score: 0, breakdown: { reason: "teammate not found" } };
  if (!isLaneOpen(s.carrier, target, s.defenders, C.PASS_LANE_RADIUS)) return { score: 0.05, breakdown: { reason: "pass lane blocked" } };
  const rShot = shotLive(target, s.net, s.goalie, s.defenders);
  const rDist = dist(target, s.net);
  const idealDist = rDist < 30 ? 1.0 : Math.max(0, 1 - (rDist - 30) / 40);
  const committedBeaten = s.defenders.some(d => defenderCommitted(d, s.carrier)) ? 0.3 : 0.0;
  const pressure = pressureIndex(s.defenders, s.carrier);
  const positionScore = rShot.live ? 0.8 + 0.2 * Math.min(1, rShot.angle / 20) : idealDist;
  return { score: clamp(0.30 + 0.40 * positionScore + 0.15 * committedBeaten + 0.15 * pressure), breakdown: { positionScore, committedBeaten, pressure, receiverShotLive: rShot.live } };
}
function scoreSkate(toX, toY, s) {
  const dest = { x: toX, y: toY };
  const pathOpen = isLaneOpen(s.carrier, dest, s.defenders, C.SKATE_LANE_RADIUS);
  const pressure = pressureIndex(s.defenders, s.carrier);
  if (!pathOpen) return { score: 0.10 + 0.05 * pressure, breakdown: { reason: "path blocked" } };
  const netGain = (dist(s.carrier, s.net) - dist(dest, s.net)) / dist(s.carrier, s.net);
  const escapes = pressure > 0.5 ? 0.3 : 0.0;
  return { score: clamp(0.40 * Math.max(0, netGain) + 0.35 + 0.25 * escapes), breakdown: { netGain, escapes } };
}
function scoreContain(s) {
  const gap = gapTight(s.defenders, s.carrier);
  const pressure = pressureIndex(s.defenders, s.carrier);
  const anyCommitted = s.defenders.some(d => defenderCommitted(d, s.carrier));
  const bait = gap.tight && !anyCommitted ? 0.9 : 0.3;
  return { score: clamp(0.60 * bait + 0.40 * (1 - pressure)), breakdown: { bait, pressure, anyCommitted, closestDist: gap.closestDist } };
}
function scoreDeke(dir, s) {
  const committed = s.defenders.filter(d => defenderCommitted(d, s.carrier));
  const gap = gapTight(s.defenders, s.carrier);
  if (committed.length === 0) return { score: 0.15, breakdown: { reason: "no committed defender" } };
  if (committed.length > 1) return { score: 0.20, breakdown: { reason: "outnumbered" } };
  const idealGap = gap.closestDist >= 3 && gap.closestDist <= 9;
  return { score: clamp(0.70 * (idealGap ? 1.0 : 0.4) + 0.30), breakdown: { idealGap, closestDist: gap.closestDist } };
}
export function scoreRead(read, s) {
  switch (read.type) {
    case "SHOOT": return scoreShoot(s);
    case "PASS": return scorePass(read.toId, s);
    case "SKATE": return scoreSkate(read.toX, read.toY, s);
    case "CONTAIN": return scoreContain(s);
    case "DEKE": return scoreDeke(read.direction, s);
    default: return { score: 0, breakdown: { reason: "unknown read" } };
  }
}

// ── Solve + validate ─────────────────────────────────────────
export function solve(scene, candidateReads) {
  const scored = candidateReads.map(read => ({ read, ...scoreRead(read, scene) }));
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0].score;
  const topGroup = scored.filter(s => best - s.score <= C.TIE_MARGIN);
  return { ranked: scored, topGroup, answerKey: topGroup.map(s => s.read.type + (s.read.toId ? `:${s.read.toId}` : "")) };
}
function allActors(s) { return [s.carrier, ...s.teammates, ...s.defenders, s.goalie].filter(Boolean); }
export function structuralHash(scene, answerKey) {
  const q = v => Math.round(v / C.STRUCT_HASH_RES) * C.STRUCT_HASH_RES;
  const pos = allActors(scene).slice().sort((a, b) => a.id.localeCompare(b.id)).map(a => `${a.id}:${q(a.x)},${q(a.y)}`).join("|");
  return `${pos}__${[...answerKey].sort().join(",")}`;
}
export function validateItem(item, scene) {
  const result = solve(scene, item.candidateReads);
  const errors = [];
  if (result.topGroup.length > 1 && !item.allowTie) errors.push({ code: "AMBIGUOUS_TOP_READ", detail: result.topGroup.map(s => s.read.type).join(", ") });
  const top = result.ranked[0].score;
  for (const d of result.ranked.slice(result.topGroup.length)) {
    if (top - d.score < C.DISTRACTOR_MARGIN) errors.push({ code: "DISTRACTOR_TOO_CLOSE", detail: `${d.read.type} ${d.score.toFixed(3)} vs ${top.toFixed(3)}` });
  }
  const acts = allActors(scene);
  for (const a of acts) if (a.x < 0 || a.x > (scene.rinkW || 200) || a.y < 0 || a.y > (scene.rinkH || 85)) errors.push({ code: "OUT_OF_BOUNDS", detail: a.id });
  for (let i = 0; i < acts.length; i++) for (let j = i + 1; j < acts.length; j++) if (dist(acts[i], acts[j]) < C.MIN_PLAYER_SEP) errors.push({ code: "PLAYER_OVERLAP", detail: `${acts[i].id}/${acts[j].id}` });
  return { valid: errors.length === 0, errors, structuralHash: structuralHash(scene, result.answerKey), result };
}
