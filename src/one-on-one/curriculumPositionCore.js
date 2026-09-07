import registeredSource from './curriculumPositionSource.json' with { type: 'json' };
import { canonicalStringify } from '../scenario-engine/canonicalHash.js';
import { insideCurriculumRink } from './curriculumCore.js';

const VERSION = 'rinkreads-curriculum-position-v1';
const clone = value => structuredClone(value);
const same = (a, b) => canonicalStringify(a) === canonicalStringify(b);
const inputs = ['rink', 'coordinates', 'hold'];
const SOURCE_BINDING = canonicalStringify(registeredSource);
const VARIANT = {
  id: 'practice-draft-u15-two-angles-position-v1', questionId: registeredSource.id,
  status: 'draft-for-coach-review', focusActorId: 'YOU',
  prompt: 'Where can you give F1 a clear pass, away from F2’s covered route?',
  instruction: 'Move the highlighted player to a useful spot, or keep the starting position. The other players stay still.',
  sourceRefs: [
    { note: 'src/one-on-one/curriculum-draft.json#practice-draft-u15-two-angles-mc', use: 'Exact frozen scene and separate lower outlet.' },
    { note: 'docs/library/off-puck-support-offense.md', use: 'Open receiving space and a clear passing lane.' },
  ],
  evidenceBoundary: 'New coach-review exercise. The area, edge tolerance and clearance values are authored for this frozen example, not universal hockey distances or an approved tactical grade. No movement timing is assessed.',
  rubric: {
    units: 'metres', regions: [{ type: 'polygon', points: [[16, 3], [23, 3], [23, 9], [16, 9]] }],
    edgeToleranceM: .6, laneClearanceM: 1.25, receivingClearanceM: 2,
    carrierClearanceM: 3, referenceActorId: 'F2', separateAngleDegrees: 30,
  },
};

/** The snapshot is a drift guard, never a fallback source or replacement MC. */
export function getCurriculumPositionVariant(question) {
  return question && canonicalStringify(question) === SOURCE_BINDING ? clone(VARIANT) : null;
}
function variantFor(question) {
  const variant = getCurriculumPositionVariant(question);
  if (!variant) throw new Error('This placement exercise needs its original reviewed source scene.');
  return variant;
}
function validPoint(point) {
  return !!point && Number.isFinite(point.x) && Number.isFinite(point.y) && point.x >= 0 && insideCurriculumRink(point.x, point.y);
}
function segmentDistance(point, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared ? Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared)) : 0;
  return Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy);
}
function polygonContains(point, points, tolerance) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = { x: points[j][0], y: points[j][1] }, b = { x: points[i][0], y: points[i][1] };
    if (segmentDistance(point, a, b) <= tolerance + 1e-9) return true;
    if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
function assertRubric(rubric) {
  if (rubric?.units !== 'metres' || !Array.isArray(rubric.regions) || !rubric.regions.length
    || rubric.regions.some(region => region.type !== 'polygon' || !Array.isArray(region.points) || region.points.length < 3
      || region.points.some(point => !Array.isArray(point) || point.length !== 2 || !point.every(Number.isFinite)))) throw new Error('Use explicit world-metre polygons for the placement area.');
  for (const name of ['edgeToleranceM', 'laneClearanceM', 'receivingClearanceM', 'carrierClearanceM', 'separateAngleDegrees']) {
    if (!Number.isFinite(rubric[name]) || rubric[name] < 0) throw new Error('Placement tolerances must be explicit finite values.');
  }
}

/** Geometry for an explicitly authored frozen-support rubric; no inferred tactics. */
export function evaluatePositionRubric({ state, focusActorId, point, rubric }) {
  if (!validPoint(point)) throw new Error('Choose a finite position inside the rounded rink.');
  assertRubric(rubric);
  const focus = state?.actors?.find(actor => actor.id === focusActorId);
  const carrier = state?.actors?.find(actor => actor.id === state.puck?.owner);
  const reference = state?.actors?.find(actor => actor.id === rubric.referenceActorId);
  if (!focus || !carrier || !reference || carrier.id === focusActorId || !validPoint(state.puck)
    || state.actors.some(actor => !validPoint(actor))) throw new Error('The support rubric needs its actual off-puck focus, carrier and reference player.');
  const defenders = state.actors.filter(actor => actor.team !== focus.team);
  const otherActors = state.actors.filter(actor => actor.id !== focusActorId);
  const laneDistance = Math.min(...defenders.map(actor => segmentDistance(actor, state.puck, point)));
  const receivingDistance = Math.min(...otherActors.map(actor => Math.hypot(actor.x - point.x, actor.y - point.y)));
  const carrierDistance = Math.hypot(carrier.x - point.x, carrier.y - point.y);
  const angle = Math.abs(Math.atan2(Math.sin(Math.atan2(point.y - state.puck.y, point.x - state.puck.x) - Math.atan2(reference.y - state.puck.y, reference.x - state.puck.x)), Math.cos(Math.atan2(point.y - state.puck.y, point.x - state.puck.x) - Math.atan2(reference.y - state.puck.y, reference.x - state.puck.x)))) * 180 / Math.PI;
  const checks = [
    { id: 'area', matched: rubric.regions.some(region => polygonContains(point, region.points, rubric.edgeToleranceM)), label: 'A separate area to support F1', retry: 'Look for space on the other side of F1 from F2’s covered route.' },
    { id: 'passing-lane', matched: laneDistance >= rubric.laneClearanceM, label: 'A clear route for the pass', retry: 'A gold player is close to the pass. Find a clearer route from the puck to your stick.' },
    { id: 'receiving-space', matched: receivingDistance >= rubric.receivingClearanceM, label: 'Room to receive', retry: 'Leave more room around your player to receive the puck.' },
    { id: 'carrier-space', matched: carrierDistance >= rubric.carrierClearanceM, label: 'Space away from the puck carrier', retry: 'Give F1 some space instead of standing beside the puck.' },
    { id: 'separate-angle', matched: angle >= rubric.separateAngleDegrees, label: 'A different passing angle from F2', retry: 'Move off F2’s route so F1 has a different passing option.' },
  ];
  return { matchesDraft: checks.every(check => check.matched), checks,
    metrics: { laneClearanceM: laneDistance, receivingClearanceM: receivingDistance, carrierDistanceM: carrierDistance, separateAngleDegrees: angle } };
}

export function createCurriculumPositionAttempt(question) {
  const variant = variantFor(question), owner = question.visual.actors.find(actor => actor.hasPuck);
  return { version: VERSION, variantId: variant.id, sourceQuestionId: question.id,
    sourceState: { actors: clone(question.visual.actors), puck: { owner: owner.id, x: owner.x + 1, y: owner.y + .58 } },
    point: null, inputMethod: null, reason: '', result: null };
}
function assertAttempt(attempt, question) {
  const source = createCurriculumPositionAttempt(question);
  if (!attempt || Object.keys(attempt).sort().join(',') !== Object.keys(source).sort().join(',')
    || ['version', 'variantId', 'sourceQuestionId', 'sourceState'].some(key => !same(attempt[key], source[key]))
    || typeof attempt.reason !== 'string' || attempt.reason.length > 600) throw new Error('Keep the original scene with this placement answer.');
  if (attempt.point !== null) {
    if (!validPoint(attempt.point) || Object.keys(attempt.point).sort().join(',') !== 'x,y' || !inputs.includes(attempt.inputMethod)) throw new Error('Invalid placement evidence.');
    const focus = source.sourceState.actors.find(actor => actor.id === VARIANT.focusActorId);
    if (attempt.inputMethod === 'hold' && (attempt.point.x !== focus.x || attempt.point.y !== focus.y)) throw new Error('Staying must keep the starting position.');
  } else if (attempt.inputMethod !== null || attempt.result !== null) throw new Error('Choose a position before checking.');
  if (attempt.result !== null && !same(attempt.result, evaluateCurriculumPosition(question, attempt.point))) throw new Error('The saved placement result no longer matches the scene.');
}
export function evaluateCurriculumPosition(question, point) {
  const variant = variantFor(question), attempt = createCurriculumPositionAttempt(question);
  return evaluatePositionRubric({ state: attempt.sourceState, focusActorId: variant.focusActorId, point, rubric: variant.rubric });
}
export function moveCurriculumPosition(attempt, question, actorId, point, inputMethod = 'rink') {
  assertAttempt(attempt, question);
  if (actorId !== VARIANT.focusActorId) throw new Error('Only the highlighted player moves for this question.');
  const next = { ...clone(attempt), point: { x: point?.x, y: point?.y }, inputMethod, result: null };
  assertAttempt(next, question);
  return next;
}
export function setCurriculumPositionReason(attempt, question, reason) {
  assertAttempt(attempt, question);
  const next = { ...clone(attempt), reason };
  assertAttempt(next, question); return next;
}
export function checkCurriculumPosition(attempt, question) {
  assertAttempt(attempt, question);
  if (!attempt.point) throw new Error('Choose a position or keep the starting spot first.');
  return { ...clone(attempt), result: evaluateCurriculumPosition(question, attempt.point) };
}
export function curriculumPositionState(attempt, question) {
  assertAttempt(attempt, question);
  const state = clone(attempt.sourceState);
  if (attempt.point) Object.assign(state.actors.find(actor => actor.id === VARIANT.focusActorId), attempt.point);
  return state;
}
export function restoreCurriculumPosition(raw, question) {
  try {
    const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
    assertAttempt(value, question); return clone(value);
  } catch { return null; }
}
export function curriculumPositionStorageKey(playerId, question) {
  return `rinkreads_curriculum_position_v1:${encodeURIComponent(playerId)}:${variantFor(question).id}`;
}
