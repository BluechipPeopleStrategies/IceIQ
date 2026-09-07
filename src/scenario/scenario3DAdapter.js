import { NHL_200X85_PROFILE } from '../scenario-engine/rinkFrame.js';
import { levelsOf, rinkRenderFor } from './youngRink.js';
import { resolveTarget } from './zones.js';

const PROFILE = NHL_200X85_PROFILE;
// Same edge-to-edge normalized frame as frameAdapters.js, without presentation
// rounding on the answer path: a near-boundary answer must keep its precision.
export const SCENARIO_3D_FRAME = Object.freeze({ source: 'normalized-0-1', destination: 'rink-frame', mirroring: 'none', answerRounding: 'none' });
export function toScenarioWorld(point) {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y) || point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) throw new Error('Scenario point must be finite and inside normalized ice');
  return { x: (point.x - .5) * PROFILE.lengthM, y: (point.y - .5) * PROFILE.widthM };
}
export function fromScenarioWorld(point) {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) throw new Error('Ice point must be finite');
  const normalized = { x: point.x / PROFILE.lengthM + .5, y: point.y / PROFILE.widthM + .5 };
  if (normalized.x < 0 || normalized.x > 1 || normalized.y < 0 || normalized.y > 1) throw new Error('Ice point is outside the source frame');
  return normalized;
}

const TITLES = {
  u11_oz_corner_lw_crash_v1: 'Help the attack from the corner',
  u11_dz_coverage_place_v1: 'Cover the open threat',
};
export function scenarioTitle(scenario) {
  return TITLES[scenario.id] || scenario.title || scenario.name || (scenario.cat ? `${scenario.cat.replaceAll('_', ' ')} practice` : 'Read the play');
}
export function scenarioPrompt(scenario) {
  if (scenario.id === 'u11_oz_corner_lw_crash_v1') return 'You have the puck in the corner. X1 is covering the slot. Where should LW move to help the attack?';
  return scenario.interaction?.prompt || 'Read the play.';
}

function actorLabel(actor, index) {
  if (actor.tag?.trim()) return actor.tag.trim();
  if (/^[a-z]\d+$/i.test(actor.id)) return actor.id.toUpperCase();
  if (actor.kind === 'goalie') return 'G';
  if (actor.kind === 'player') return 'YOU';
  return `${actor.kind === 'defender' ? 'D' : 'F'}${index + 1}`;
}

/** A render-only projection. No proximity-based possession or tactical grade. */
export function scenarioScene(scenario, { positions = {}, hiddenKinds = [] } = {}) {
  const source = scenario.actors || [], puckSource = source.find(actor => actor.kind === 'puck');
  const policy = rinkRenderFor(scenario.stage, levelsOf(scenario));
  const counts = { defender: 0, teammate: 0 };
  const actors = source.filter(actor => actor.kind !== 'puck' && !hiddenKinds.includes(actor.kind)).map(actor => {
    const index = counts[actor.kind] || 0;
    counts[actor.kind] = index + 1;
    const position = positions[actor.id] || actor, p = toScenarioWorld(position);
    const team = actor.kind === 'defender' || (actor.kind === 'goalie' && scenario.stage?.zone !== 'def-zone') ? 'away' : 'home';
    // Facing is not present in current seeds. Point toward the visible puck as
    // a presentation default; never use this inferred pose as scoring evidence.
    const facingPoint = actor.facing || puckSource || { x: actor.kind === 'goalie' ? .5 : team === 'home' ? 1 : 0, y: .5 };
    const target = toScenarioWorld(facingPoint);
    return { id: actor.id, label: actorLabel(actor, index), role: actor.kind === 'goalie' ? 'goalie' : 'skater', team, ...p,
      facing: Math.atan2(target.y - p.y, target.x - p.x), facingSource: actor.facing ? 'authored' : 'presentation-default', vx: 0, vy: 0 };
  });
  const puck = puckSource && !hiddenKinds.includes('puck') ? { ...toScenarioWorld(puckSource), owner: null, vx: 0, vy: 0 } : null;
  const items = scenario.interaction?.items || [];
  const focusActorId = items.length === 1 ? items[0] : scenario.interaction?.kind === 'path' ? scenario.interaction.from
    : source.find(actor => actor.kind === 'player')?.id || null;
  let bounds = { ...PROFILE.bounds };
  // Cropping changes the camera only. Source coordinates and grading never flip.
  // Use the complete opening layout, not dragged or scan-hidden actors, so
  // manipulating an answer or a memory cue cannot move the camera underneath it.
  const opening = source.map(toScenarioWorld);
  if (policy.view === 'right') bounds.minX = Math.min(0, ...opening.map(actor => actor.x - 1.5));
  if (policy.view === 'left') bounds.maxX = Math.max(0, ...opening.map(actor => actor.x + 1.5));
  return { state: { actors, puck }, bounds, focusActorId, showBothGoals: true, hideZoneLines: policy.hideZoneLines, labelledActors: true };
}

export function scenarioOverlays(scenario, { revealed = false, path = [], point = null, picked = [] } = {}) {
  const overlays = { polylines: [], regions: [], labels: [] };
  if (path.length > 1) overlays.polylines.push({ id: 'your-route', points: path.map(p => { const w = toScenarioWorld(p); return [w.x, w.y]; }), color: '#C9A24B', width: 3 });
  if (point) overlays.regions.push({ id: 'your-point', ...toScenarioWorld(point), radiusX: .35, radiusY: .35, color: '#C9A24B' });
  const actorById = Object.fromEntries((scenario.actors || []).map(actor => [actor.id, actor]));
  for (const [index, id] of picked.entries()) {
    const actor = actorById[id];
    if (actor) overlays.labels.push({ id: `pick-${id}`, ...toScenarioWorld(actor), label: scenario.interaction.kind === 'sequence' ? `${index + 1}` : 'Selected' });
  }
  const correct = scenario.correct;
  const guides = scenario.interaction?.kind === 'place' && scenario.interaction.showTargets;
  if (!correct || (!revealed && !guides)) return overlays;
  const targets = correct.kind === 'place' ? (correct.placements || []).map(p => ({ ...resolveTarget(p), actorId: p.id }))
    : correct.kind === 'point' ? [resolveTarget(correct)] : correct.kind === 'path' ? [resolveTarget(correct.end)] : [];
  for (const [index, target] of targets.entries()) {
    const p = toScenarioWorld(target);
    overlays.regions.push({ id: `answer-${index}`, ...p, radiusX: target.tolerance * PROFILE.lengthM, radiusY: target.tolerance * PROFILE.widthM, color: '#62CB99', opacity: revealed ? .22 : .09 });
    if (target.actorId) overlays.labels.push({ id: `answer-label-${index}`, ...p, label: actorById[target.actorId]?.tag || target.actorId });
  }
  if (revealed && (correct.kind === 'selection' || correct.kind === 'sequence')) for (const [index, id] of (correct.ids || []).entries()) {
    const actor = actorById[id];
    if (actor) overlays.labels.push({ id: `answer-${id}`, ...toScenarioWorld(actor), label: correct.kind === 'sequence' ? `${index + 1} · ✓` : '✓' });
  }
  return overlays;
}
