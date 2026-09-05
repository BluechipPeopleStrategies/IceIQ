import { DRAFT_VERSION, validateDraft } from './director.js';
import { U11_READ_SEQUENCE, CHANGED_CUE_ID, CHANGED_CUE_STATE } from './readSequenceU11.js';
import { U9_READ_SEQUENCE } from './readSequenceU9.js';
import { U13_READ_SEQUENCE } from './readSequenceU13.js';

export { U11_READ_SEQUENCE, U9_READ_SEQUENCE, U13_READ_SEQUENCE };
export const READ_ACTIONS = Object.freeze(['shoot', 'pass', 'carry']);
export const MAX_THIRD_ROUTE_POINTS = 12;
export const READ_SEQUENCE_CATALOG = Object.freeze([U9_READ_SEQUENCE, U11_READ_SEQUENCE, U13_READ_SEQUENCE]);
const HALF_LENGTH = 30.48;
const HALF_WIDTH = 12.954;
const CORNER_RADIUS = 8.5344;

function clone(value) {
  return structuredClone(value);
}

export function getReadSequenceDefinition(id = U11_READ_SEQUENCE.id) {
  const definition = typeof id === 'string' && READ_SEQUENCE_CATALOG.find(item => item.id === id);
  if (!definition) throw new RangeError('Choose a known connected-read scenario.');
  return definition;
}

function definitionForSession(session) {
  if (typeof session?.scenarioId !== 'string') throw new TypeError('The session needs a valid scenario ID.');
  return getReadSequenceDefinition(session.scenarioId);
}

export function getReadSequenceStorageKey(playerId, id = U11_READ_SEQUENCE.id) {
  const definition = getReadSequenceDefinition(id);
  const legacyKey = `rinkreads_read_sequence_v1:${encodeURIComponent(String(playerId || 'local').slice(0, 120))}`;
  return definition.id === U11_READ_SEQUENCE.id ? legacyKey : `${legacyKey}:${encodeURIComponent(definition.id)}`;
}

function boundedReason(value, label = 'reason') {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`Add a short ${label} for the read.`);
  const text = value.trim();
  if (text.length > 600) throw new RangeError(`${label} must be 600 characters or fewer.`);
  return text;
}

function branchFor(action, session) {
  const definition = definitionForSession(session);
  const actions = definition.actions || Object.keys(definition.branches);
  if (!actions.includes(action)) throw new RangeError(definition.id === U11_READ_SEQUENCE.id ? 'Choose Shoot, Pass or Carry.' : 'Choose an action offered by this scenario.');
  return definition.branches[action];
}

function targetFor(action, targetId, session) {
  const target = branchFor(action, session).read2.targets.find(item => item.id === targetId);
  if (!target) throw new RangeError('That target is not available in the current branch.');
  return target;
}

export function createReadSequenceSession(id = U11_READ_SEQUENCE.id) {
  const definition = getReadSequenceDefinition(id);
  return {
    version: 'rinkreads-read-sequence-session-v1',
    scenarioId: definition.id,
    phase: 'read-1',
    playbackProgress: 0,
    replayReturnPhase: null,
    first: null,
    second: null,
    third: null,
    changedCue: null,
    availableSecondTargets: [],
    localEvidence: null,
    reviewStatus: 'in-progress',
  };
}

export function submitFirstRead(session, { action, reason }) {
  definitionForSession(session);
  if (session?.phase !== 'read-1') throw new Error('The first read is already locked for this attempt.');
  branchFor(action, session);
  const next = clone(session);
  next.first = { action, reason: boundedReason(reason) };
  next.phase = 'consequence-1';
  next.playbackProgress = 0;
  return next;
}

export function selectSecondRead(session, targetId) {
  definitionForSession(session);
  if (session?.phase !== 'read-2' || !session.first) throw new Error('Finish the first consequence before making read two.');
  const target = targetFor(session.first.action, targetId, session);
  const next = clone(session);
  next.second = { targetId: target.id };
  next.phase = 'consequence-2';
  next.playbackProgress = 0;
  return next;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function clampSequencePoint(rawX, rawY) {
  if (![rawX, rawY].every(Number.isFinite)) throw new TypeError('The player position must use finite rink coordinates.');
  let x = clamp(rawX, 0.65, HALF_LENGTH - 0.65);
  let y = clamp(rawY, -HALF_WIDTH + 0.65, HALF_WIDTH - 0.65);
  const cornerX = HALF_LENGTH - CORNER_RADIUS;
  const cornerY = Math.sign(y || 1) * (HALF_WIDTH - CORNER_RADIUS);
  if (x > cornerX && Math.abs(y) > HALF_WIDTH - CORNER_RADIUS) {
    const dx = x - cornerX;
    const dy = y - cornerY;
    const maxRadius = CORNER_RADIUS - 0.65;
    const distance = Math.hypot(dx, dy);
    if (distance > maxRadius) {
      x = cornerX + dx * maxRadius / distance;
      y = cornerY + dy * maxRadius / distance;
    }
  }
  return { x, y };
}

export function moveThirdReadActor(session, point) {
  definitionForSession(session);
  if (session?.phase !== 'read-3' || !session.third) throw new Error('Reach read three before moving the support player.');
  const next = clone(session);
  next.third.point = clampSequencePoint(point?.x, point?.y);
  next.third.route = null;
  return next;
}

function sameRoutePoint(a, b) {
  return Boolean(a && b && Math.hypot(a.x - b.x, a.y - b.y) <= 1e-9);
}

function thirdRouteOrigin(session) {
  const target = targetFor(session.first.action, session.second.targetId, session);
  if (session.third?.actorId !== target.moveActorId) throw new Error('The route must use the current off-puck support player.');
  const actor = target.state.actors.find(item => item.id === target.moveActorId);
  return { x: actor.x, y: actor.y };
}

export function setThirdReadRoute(session, waypoints) {
  definitionForSession(session);
  if (session?.phase !== 'read-3' || !session.third) throw new Error('Reach read three before planning a support route.');
  if (!Array.isArray(waypoints)) throw new TypeError('A route needs an array of rink waypoints.');
  if (waypoints.length > MAX_THIRD_ROUTE_POINTS) throw new RangeError(`Use up to ${MAX_THIRD_ROUTE_POINTS} route waypoints.`);
  const route = [thirdRouteOrigin(session)];
  for (const waypoint of waypoints) {
    const point = clampSequencePoint(waypoint?.x, waypoint?.y);
    if (sameRoutePoint(point, route.at(-1))) throw new RangeError('Move each route point away from the previous point.');
    route.push(point);
  }
  const next = clone(session);
  next.third.route = waypoints.length ? route : null;
  next.third.point = waypoints.length ? { ...route.at(-1) } : null;
  return next;
}

export function getThirdReadRoute(session) {
  definitionForSession(session);
  if (!['read-3', 'complete'].includes(session?.phase) || !session.third?.route) return null;
  return clone(session.third.route);
}

export function sampleThirdReadRoute(session, rawProgress) {
  definitionForSession(session);
  if (!Number.isFinite(rawProgress)) throw new TypeError('Route preview progress must be finite.');
  const route = getThirdReadRoute(session);
  if (!route) throw new Error('Plan a support route before previewing it.');
  // Distance-normalized illustration only; this is not validated skating physics.
  const lengths = route.slice(1).map((point, index) => Math.hypot(point.x - route[index].x, point.y - route[index].y));
  let remaining = clamp(rawProgress, 0, 1) * lengths.reduce((sum, length) => sum + length, 0);
  let segment = 0;
  while (segment < lengths.length - 1 && remaining > lengths[segment]) {
    remaining -= lengths[segment];
    segment += 1;
  }
  const from = route[segment];
  const to = route[segment + 1];
  const progress = clamp(remaining / lengths[segment], 0, 1);
  const state = clone(targetFor(session.first.action, session.second.targetId, session).state);
  const actor = state.actors.find(item => item.id === session.third.actorId);
  actor.x = progress === 1 ? to.x : lerp(from.x, to.x, progress);
  actor.y = progress === 1 ? to.y : lerp(from.y, to.y, progress);
  actor.facing = Math.atan2(to.y - from.y, to.x - from.x);
  return state;
}

function restoreThirdRoute(session, third) {
  const route = third.route;
  if (!Array.isArray(route) || route.length < 2 || route.length > MAX_THIRD_ROUTE_POINTS + 1) throw new TypeError('The saved route has an invalid waypoint count.');
  for (const point of route) {
    const bounded = clampSequencePoint(point?.x, point?.y);
    if (!sameRoutePoint(point, bounded)) throw new RangeError('The saved route must stay inside the rink.');
  }
  if (!sameRoutePoint(route[0], thirdRouteOrigin(session))) throw new Error('The saved route must start at the read-two support position.');
  if (![third.point?.x, third.point?.y].every(Number.isFinite) || !sameRoutePoint(route.at(-1), third.point)) throw new Error('The saved route must end at the final support position.');
  return setThirdReadRoute(session, route.slice(1));
}

function placementEvidence(session) {
  const base = targetFor(session.first.action, session.second.targetId, session).state;
  const original = base.actors.find(actor => actor.id === session.third.actorId);
  const actorName = original.name || original.label;
  const defender = base.actors.find(actor => actor.id === 'D1');
  const defenderName = defender.name ? defender.name[0].toLowerCase() + defender.name.slice(1) : defender.label;
  const point = session.third.point;
  const widthChange = Math.abs(point.y) - Math.abs(original.y);
  const depthChange = point.x - original.x;
  return {
    heading: 'What changed on the board',
    observations: [
      Math.abs(widthChange) < 0.35 ? `${actorName} stayed in a similar width lane.` : widthChange < 0 ? `${actorName} moved toward the middle lane.` : `${actorName} moved toward wider ice.`,
      Math.abs(depthChange) < 0.35 ? `${actorName} kept similar attack depth.` : depthChange > 0 ? `${actorName} moved deeper toward the attacking end.` : `${actorName} moved back toward centre ice.`,
      `Compare the new puck line, ${defenderName}’s position and separation before deciding whether this support remains useful.`,
    ],
    note: 'These are visible spatial changes, not an automatic tactical grade.',
  };
}

export function submitThirdRead(session, reason) {
  definitionForSession(session);
  if (session?.phase !== 'read-3' || !session.third?.point) throw new Error('Move the highlighted off-puck player before finishing read three.');
  const next = clone(session);
  next.third.reason = boundedReason(reason, 'reason');
  next.phase = 'complete';
  next.reviewStatus = 'draft-for-coach-review';
  next.localEvidence = placementEvidence(next);
  return next;
}

export function getChangedCueComparison(session) {
  const definition = definitionForSession(session);
  if (definition.id !== U11_READ_SEQUENCE.id) throw new Error('This scenario does not include a changed-cue comparison.');
  if (session?.phase !== 'complete' || !session.third?.reason) throw new Error('Finish all three reads before comparing the changed cue.');
  return {
    id: CHANGED_CUE_ID,
    originalState: clone(definition.initialState),
    changedState: clone(CHANGED_CUE_STATE),
    originalAnswer: clone(session.first),
    revisedAnswer: session.changedCue ? clone(session.changedCue) : null,
    cue: 'D1 moved from part of the shot lane into the pass line between the puck and F2. The attackers, goalie and puck stayed in the same places.',
    sourceRef: { note: 'docs/library/two-on-one-pass-lane-removed.md' },
  };
}

export function submitChangedCueRead(session, { action, reason }) {
  getChangedCueComparison(session);
  branchFor(action, session);
  const next = clone(session);
  next.changedCue = { id: CHANGED_CUE_ID, action, reason: boundedReason(reason) };
  return next;
}

export function serializeReadSequence(session) {
  const definition = definitionForSession(session);
  if (session?.phase !== 'complete' || !session.first || !session.second || !session.third?.point || !session.third?.reason) {
    throw new Error('Finish all three reads before saving this reflection.');
  }
  const selected = targetFor(session.first.action, session.second.targetId, session);
  if (session.third.actorId !== selected.moveActorId) throw new Error('The final support actor does not belong to this scenario branch.');
  if (session.changedCue && definition.id !== U11_READ_SEQUENCE.id) throw new Error('This scenario does not include a changed-cue comparison.');
  return JSON.stringify({
    version: 'rinkreads-read-sequence-reflection-v1',
    scenarioId: definition.id,
    first: { action: session.first.action, reason: session.first.reason },
    second: { targetId: session.second.targetId },
    third: {
      point: { x: session.third.point.x, y: session.third.point.y },
      reason: session.third.reason,
      ...(session.third.route ? { route: session.third.route.map(({ x, y }) => ({ x, y })) } : {}),
    },
    ...(session.changedCue ? { changedCue: { id: CHANGED_CUE_ID, action: session.changedCue.action, reason: session.changedCue.reason } } : {}),
    reviewStatus: 'draft-for-coach-review',
  });
}

export function restoreReadSequence(raw, expectedId = U11_READ_SEQUENCE.id) {
  try {
    const expected = getReadSequenceDefinition(expectedId);
    const saved = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!saved || saved.version !== 'rinkreads-read-sequence-reflection-v1' || saved.scenarioId !== expected.id || saved.reviewStatus !== 'draft-for-coach-review') return null;
    let session = createReadSequenceSession(expected.id);
    session = advanceSequencePlayback(submitFirstRead(session, saved.first), 1);
    session = advanceSequencePlayback(selectSecondRead(session, saved.second?.targetId), 1);
    session = saved.third && Object.hasOwn(saved.third, 'route')
      ? restoreThirdRoute(session, saved.third)
      : moveThirdReadActor(session, saved.third?.point);
    session = submitThirdRead(session, saved.third?.reason);
    if (saved.changedCue != null) {
      if (saved.changedCue.id !== CHANGED_CUE_ID) return null;
      session = submitChangedCueRead(session, saved.changedCue);
    }
    return session;
  } catch {
    return null;
  }
}

function lerp(from, to, progress) {
  return from + (to - from) * progress;
}

function lerpAngle(from, to, progress) {
  const delta = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + delta * progress;
}

function interpolateState(from, to, progress, keepOwner = null) {
  const p = clamp(progress, 0, 1);
  return {
    actors: from.actors.map(actor => {
      const target = to.actors.find(item => item.id === actor.id);
      return { ...actor, x: lerp(actor.x, target.x, p), y: lerp(actor.y, target.y, p), facing: lerpAngle(actor.facing, target.facing, p) };
    }),
    puck: {
      owner: p >= 1 ? to.puck.owner : keepOwner,
      x: lerp(from.puck.x, to.puck.x, p),
      y: lerp(from.puck.y, to.puck.y, p) + Math.sin(Math.PI * p) * (keepOwner ? 0 : 0.35),
    },
  };
}

function applyThirdPoint(state, third) {
  if (!third?.point) return clone(state);
  const next = clone(state);
  const actor = next.actors.find(item => item.id === third.actorId);
  actor.x = third.point.x;
  actor.y = third.point.y;
  return next;
}

export function currentSequenceState(session) {
  const definition = definitionForSession(session);
  if (!session?.first) return clone(definition.initialState);
  const branch = branchFor(session.first.action, session);
  if (session.phase === 'consequence-1' || session.phase === 'replay-1') {
    const owner = session.first.action === 'carry' ? 'F1' : null;
    return interpolateState(definition.initialState, branch.state, session.playbackProgress, owner);
  }
  if (!session.second || session.phase === 'read-2') return clone(branch.state);
  const target = targetFor(session.first.action, session.second.targetId, session);
  if (session.phase === 'consequence-2') {
    const retainedOwner = branch.state.puck.owner && branch.state.puck.owner === target.state.puck.owner ? branch.state.puck.owner : null;
    return interpolateState(branch.state, target.state, session.playbackProgress, retainedOwner);
  }
  return applyThirdPoint(target.state, session.third);
}

export function advanceSequencePlayback(session, rawProgress) {
  definitionForSession(session);
  if (!['consequence-1', 'consequence-2', 'replay-1'].includes(session?.phase)) throw new Error('No sequence consequence is active.');
  if (!Number.isFinite(rawProgress)) throw new TypeError('Playback progress must be finite.');
  const next = clone(session);
  next.playbackProgress = clamp(rawProgress, 0, 1);
  if (next.playbackProgress < 1) return next;
  if (next.phase === 'consequence-1') {
    next.phase = 'read-2';
    next.availableSecondTargets = clone(branchFor(next.first.action, next).read2.targets.map(({ id, label, kind, x, y }) => ({ id, label, kind, x, y })));
  } else if (next.phase === 'consequence-2') {
    const target = targetFor(next.first.action, next.second.targetId, next);
    next.phase = 'read-3';
    next.third = { actorId: target.moveActorId, point: null, reason: '', route: null };
  } else {
    next.phase = next.replayReturnPhase;
    next.replayReturnPhase = null;
  }
  return next;
}

export function replayFirstConsequence(session) {
  definitionForSession(session);
  if (!session?.first || !['read-2', 'read-3', 'complete'].includes(session.phase)) throw new Error('Finish the first read before replaying its consequence.');
  const next = clone(session);
  next.replayReturnPhase = session.phase;
  next.phase = 'replay-1';
  next.playbackProgress = 0;
  return next;
}

export function getReadTwoPrompt(session) {
  return branchFor(session.first?.action, session).read2;
}

export function getSelectedSecondTarget(session) {
  definitionForSession(session);
  return session?.second ? targetFor(session.first.action, session.second.targetId, session) : null;
}

export function stateToStaticDirectorDraft(state, title = 'Connected-read baseline') {
  if (!state || !Array.isArray(state.actors) || !state.puck) throw new TypeError('A visible sequence state is required.');
  const draft = {
    version: DRAFT_VERSION,
    title,
    duration: 8,
    actors: state.actors.map(actor => ({
      id: actor.id,
      label: actor.label || actor.name,
      team: actor.team,
      role: actor.role,
      frozen: false,
      fixedPose: null,
      keys: [{ time: 0, x: actor.x, y: actor.y, facing: actor.facing }],
    })),
    puck: { owner: state.puck.owner, x: state.puck.x, y: state.puck.y },
    sourceRef: { note: 'docs/library/off-puck-support-offense.md' },
    status: 'development-not-validated',
  };
  const checked = validateDraft(draft);
  if (!checked.ok) throw new TypeError(`The final read state is not a valid director snapshot: ${checked.errs.join('; ')}`);
  return draft;
}

export function createFinalReadJudgePayload(session) {
  const definition = definitionForSession(session);
  if (definition.id !== U11_READ_SEQUENCE.id) throw new Error('Final-position AI review is not supported for this scenario.');
  if (session?.phase !== 'complete' || !session.first || !session.second || !session.third?.point || !session.third?.reason) {
    throw new Error('Finish all three reads before asking for a final-position review.');
  }
  const selected = targetFor(session.first.action, session.second.targetId, session);
  const baseline = stateToStaticDirectorDraft(selected.state, 'State after read two · comparison baseline, not an ideal answer');
  const finalState = currentSequenceState(session);
  const attemptDraft = stateToStaticDirectorDraft(finalState, 'Player final support position');
  const movingActor = finalState.actors.find(actor => actor.id === session.third.actorId);
  const puckCue = finalState.puck.owner
    ? `The puck is with ${finalState.puck.owner}.`
    : 'The puck remains loose on F2’s side, ahead of D1 and before the goalie after the selected second read.';
  return {
    question: {
      prompt: `After ${selected.label}, where should ${movingActor.label} move to stay helpful without the puck, and why?`,
      ageBand: 'U11',
      sourceRef: { note: 'docs/library/off-puck-support-offense.md' },
      coachExplanation: 'The read-two state is repeated as a comparison baseline only. It is not an ideal coach answer. Discuss whether the final placement creates or preserves useful space, a visible puck line, and separation from D1 without grading a fixed coordinate.',
      expectedAction: null,
      type: 'position',
      initialDraft: baseline,
      referenceDraft: clone(baseline),
      rubric: {
        mode: 'open',
        mustNotice: [puckCue, 'D1 and the goalie remain where the selected read-two branch placed them.', `${movingActor.label} is the off-puck attacker being repositioned.`],
        acceptableActions: [],
        avoid: ['Treating the unchanged baseline as an ideal position.', 'Matching one coordinate instead of explaining the visible support relationship.', 'Claiming that the placement guarantees possession or a goal.'],
        followUpCue: 'If D1 moves toward that support lane, where could the off-puck attacker re-offer?',
      },
    },
    attempt: { draft: attemptDraft, reason: session.third.reason, action: null },
  };
}
