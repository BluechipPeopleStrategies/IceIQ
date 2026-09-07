import { U11_READ_SEQUENCE, createReadSequenceSession, submitFirstRead, advanceSequencePlayback, currentSequenceState, clampSequencePoint } from './readSequenceCore.js';

const VERSION = 'rinkreads-defender-perspective-v1';
const INPUTS = ['rink', 'coordinates', 'hold'];
const clone = value => structuredClone(value);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const SOURCE_REFS = [
  { note: 'docs/library/odd-man-reads.md', use: 'Separate F1 and D1 decision perspectives after a visible change.' },
  { note: 'docs/library/gap-control.md', use: 'Discuss inside position, space and the dangerous middle lane.' },
];

export function canReadAsDefender(session) {
  return session?.scenarioId === U11_READ_SEQUENCE.id && session.first?.action === 'pass'
    && ['read-2', 'read-3', 'complete'].includes(session.phase);
}

function basis(first) {
  if (first?.action !== 'pass') throw new Error('This defender read follows a completed pass.');
  const pass = advanceSequencePlayback(submitFirstRead(createReadSequenceSession(U11_READ_SEQUENCE.id), first), 1);
  return {
    version: VERSION, scenarioId: U11_READ_SEQUENCE.id, first: clone(pass.first),
    actorId: 'D1', previousLearnerId: 'F1',
    beforeState: clone(U11_READ_SEQUENCE.initialState), sourceState: currentSequenceState(pass),
    point: null, reason: '', inputMethod: null, status: 'positioning', sourceRefs: clone(SOURCE_REFS),
  };
}

export function createDefenderPerspective(session) {
  if (!canReadAsDefender(session)) throw new Error('Watch the pass arrive before reading as D1.');
  return basis(session.first);
}

function assertAttempt(attempt) {
  const expected = basis(attempt?.first);
  for (const key of ['version', 'scenarioId', 'first', 'actorId', 'previousLearnerId', 'beforeState', 'sourceState', 'sourceRefs']) {
    if (!same(attempt[key], expected[key])) throw new Error('The defender read must retain its original pass and actors.');
  }
  if (!['positioning', 'saved-for-coach-discussion'].includes(attempt.status)) throw new Error('Unknown defender-read status.');
}

export function moveDefenderPerspective(attempt, actorId, point, inputMethod = 'rink') {
  assertAttempt(attempt);
  if (actorId !== attempt.actorId) throw new Error('Only D1 can move in this defender read.');
  if (!INPUTS.includes(inputMethod)) throw new Error('Choose a supported placement input.');
  const sourceActor = attempt.sourceState.actors.find(actor => actor.id === attempt.actorId);
  if (inputMethod === 'hold' && (point?.x !== sourceActor.x || point?.y !== sourceActor.y)) throw new Error('Staying must keep D1 at the exact starting spot.');
  return { ...clone(attempt), point: clampSequencePoint(point?.x, point?.y), inputMethod, reason: '', status: 'positioning' };
}

export function submitDefenderPerspective(attempt, reason = '') {
  assertAttempt(attempt);
  if (!attempt.point || !INPUTS.includes(attempt.inputMethod)) throw new Error('Place D1, or choose to stay here, before saving.');
  if (typeof reason !== 'string' || reason.trim().length > 600) throw new Error('Keep the optional explanation to 600 characters or fewer.');
  return { ...clone(attempt), reason: reason.trim(), status: 'saved-for-coach-discussion' };
}

/** Named-player perspective only. Source labels, teams, facing and puck stay in the record. */
export function defenderPerspectiveState(attempt) {
  assertAttempt(attempt);
  const state = clone(attempt.sourceState);
  state.actors = state.actors.map(actor => ({
    ...actor, label: actor.id === attempt.actorId ? 'D1' : actor.id === attempt.previousLearnerId ? 'F1' : actor.label,
    isLearner: false,
    ...(actor.id === attempt.actorId && attempt.point ? attempt.point : {}),
  }));
  return state;
}

export function restoreDefenderPerspective(raw, session = null) {
  try {
    const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!value || value.status !== 'saved-for-coach-discussion') return null;
    if (session && (!canReadAsDefender(session) || !same(value.first, session.first))) return null;
    let canonical = basis(value.first);
    canonical = moveDefenderPerspective(canonical, value.actorId, value.point, value.inputMethod);
    canonical = submitDefenderPerspective(canonical, value.reason);
    return same(canonical, value) ? canonical : null;
  } catch { return null; }
}

export function serializeDefenderPerspective(attempt) {
  const checked = restoreDefenderPerspective(attempt);
  if (!checked) throw new Error('Save a valid position before exporting the defender read.');
  return JSON.stringify(checked);
}

export function getDefenderPerspectiveStorageKey(playerId) {
  return `rinkreads_defender_perspective_v1:${encodeURIComponent(String(playerId || 'local').slice(0, 120))}:${U11_READ_SEQUENCE.id}`;
}
