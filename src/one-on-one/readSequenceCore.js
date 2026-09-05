import { DRAFT_VERSION, sampleDraft, validateDraft } from './director.js';

export const READ_ACTIONS = Object.freeze(['shoot', 'pass', 'carry']);
export const MAX_THIRD_ROUTE_POINTS = 12;
const HALF_LENGTH = 30.48;
const HALF_WIDTH = 12.954;
const CORNER_RADIUS = 8.5344;

const BASE_ACTORS = Object.freeze([
  { id: 'F1', label: 'YOU', team: 'home', role: 'skater' },
  { id: 'F2', label: 'F2', team: 'home', role: 'skater' },
  { id: 'D1', label: 'D1', team: 'away', role: 'skater' },
  { id: 'G', label: 'G', team: 'away', role: 'goalie' },
]);

function pose(x, y, facing) {
  return { x, y, facing };
}

function layout(F1, F2, D1, G) {
  return { F1, F2, D1, G };
}

function stateFromLayout(positions, { owner, looseAt = null } = {}) {
  const draft = {
    version: DRAFT_VERSION,
    title: 'U11 connected 2v1 authored state',
    duration: 1,
    actors: BASE_ACTORS.map(actor => ({
      ...actor,
      frozen: false,
      fixedPose: null,
      keys: [{ time: 0, ...positions[actor.id] }],
    })),
    puck: { owner: owner ?? null },
    sourceRef: { note: 'docs/library/odd-man-reads.md' },
    status: 'development-not-validated',
  };
  const checked = validateDraft(draft);
  if (!checked.ok) throw new Error(`Invalid authored read-sequence geometry: ${checked.errs.join('; ')}`);
  const frame = sampleDraft(draft, 0);
  return {
    actors: frame.actors.map(({ id, label, team, role, x, y, facing }) => ({ id, label, team, role, x, y, facing })),
    puck: looseAt ? { owner: null, x: looseAt.x, y: looseAt.y } : { owner: frame.puck.owner, x: frame.puck.x, y: frame.puck.y },
  };
}

const INITIAL_STATE = stateFromLayout(layout(
  pose(10, 4, 0),
  pose(13.1, -4.5, 0),
  pose(16.1, 1.5, Math.PI),
  pose(25.1, 0.4, Math.atan2(4 - 0.4, 10 - 25.1)),
), { owner: 'F1' });

const CHANGED_CUE_ID = 'd1-pass-lane-v1';
// A separate opening freeze, not the next state of any chosen branch.
// Only D1's position changes: the midpoint of the visible puck-to-F2 line.
const CHANGED_CUE_STATE = stateFromLayout(Object.fromEntries(INITIAL_STATE.actors.map(actor => [
  actor.id,
  actor.id === 'D1' ? pose(12.05, 0.1, actor.facing) : pose(actor.x, actor.y, actor.facing),
])), { owner: 'F1' });

const FIRST_BRANCHES = {
  pass: {
    actionLabel: 'Pass',
    consequence: 'Your pass reaches F2 before D1 can turn into the lane. D1 and the goalie shift toward the new puck side.',
    state: stateFromLayout(layout(
      pose(12.2, 3.2, 0), pose(16.8, -4.1, 0.15), pose(15.4, 0.7, -2.7), pose(24.8, -1.3, Math.PI),
    ), { owner: 'F2' }),
    read2: {
      prompt: 'F2 has the puck and D1 and the goalie have shifted. Tap the next receiver or space you want to use before the window changes.',
      cue: 'Read the new puck side, D1’s stick line, and whether F1 is still available inside.',
      targets: [
        {
          id: 'return-lane', label: 'F1 return lane', kind: 'receiver', x: 17.3, y: 1.2,
          summary: 'You use F1 as a return option while D1 is still turning. The pass is authored to arrive; it is not a universal promise that this lane stays open.',
          moveActorId: 'F2',
          state: stateFromLayout(layout(
            pose(17.3, 1.2, 0), pose(17.1, -3.5, 0.3), pose(17.2, -0.8, -2.7), pose(24.3, -1.1, Math.PI),
          ), { owner: 'F1' }),
        },
        {
          id: 'hold-wide', label: 'Hold the wide space', kind: 'space', x: 19, y: -5.5,
          summary: 'F2 carries into the wide lane while F1 stays inside as support.',
          moveActorId: 'F1',
          state: stateFromLayout(layout(
            pose(15.4, 2.3, 0), pose(18.9, -5.4, 0.1), pose(17.2, -1, -2.8), pose(24.4, -1.7, Math.PI),
          ), { owner: 'F2' }),
        },
        {
          id: 'shoot-open', label: 'Shoot through the open lane', kind: 'space', x: 23.2, y: -1.3,
          summary: 'F2 shoots through the lane that opened after D1 shifted. The puck finishes loose, so the next support read still matters.',
          moveActorId: 'F1',
          state: stateFromLayout(layout(
            pose(14.8, 2.5, 0), pose(18.1, -3.5, 0.2), pose(16.4, 0.2, -2.8), pose(25.3, -1.4, 2.95),
          ), { owner: null, looseAt: { x: 23.2, y: -0.9 } }),
        },
      ],
    },
  },
  shoot: {
    actionLabel: 'Shoot',
    consequence: 'Your low shot reaches the net area through partial coverage and leaves a loose puck in visible space. No goal is assumed.',
    state: stateFromLayout(layout(
      pose(13, 3.4, 0), pose(15.2, -4.1, 0), pose(17, 1, Math.PI), pose(24.6, -0.2, Math.PI),
    ), { owner: null, looseAt: { x: 21.2, y: -2.1 } }),
    read2: {
      prompt: 'The puck is loose after the authored shot. Tap the space you want your group to support next.',
      cue: 'Notice the loose puck, F2’s route, and which side of D1 remains reachable.',
      targets: [
        {
          id: 'rebound-space', label: 'Loose-puck side', kind: 'space', x: 20.4, y: -2.2,
          summary: 'F2 closes toward the loose-puck side while the puck remains unclaimed.',
          moveActorId: 'F1',
          state: stateFromLayout(layout(
            pose(14.6, 2.4, 0), pose(19.7, -2.3, 0.2), pose(18.1, 0.3, -2.8), pose(24.4, -0.8, Math.PI),
          ), { owner: null, looseAt: { x: 21.2, y: -2.1 } }),
        },
        {
          id: 'high-support', label: 'High support lane', kind: 'space', x: 16.1, y: -5,
          summary: 'F2 stays above the loose puck as a safety and passing option if possession is recovered.',
          moveActorId: 'F1',
          state: stateFromLayout(layout(
            pose(14.6, 2.5, 0), pose(16.1, -5, 0), pose(18, 0.5, -2.8), pose(24.4, -0.7, Math.PI),
          ), { owner: null, looseAt: { x: 21.2, y: -2.1 } }),
        },
      ],
    },
  },
  carry: {
    actionLabel: 'Carry',
    consequence: 'You carry outside D1’s shoulder. D1 turns with you and F2 stays available away from the puck.',
    state: stateFromLayout(layout(
      pose(16.1, 5.8, 0.1), pose(14.5, -3.8, 0), pose(17.1, 2.2, -2.9), pose(24.8, 0.7, Math.PI),
    ), { owner: 'F1' }),
    read2: {
      prompt: 'You carried outside and D1 turned. Tap the teammate or open lane you want to use next.',
      cue: 'Read whether F2 has become available inside and how much outside ice remains.',
      targets: [
        {
          id: 'support-middle', label: 'F2 in the middle seam', kind: 'receiver', x: 17.2, y: -1.5,
          summary: 'You connect with F2 in the middle seam as D1 continues outside. F1 becomes the off-puck support for the final read.',
          moveActorId: 'F1',
          state: stateFromLayout(layout(
            pose(18, 5.4, 0.1), pose(17.2, -1.5, 0.1), pose(18, 2.8, -2.9), pose(24.6, 0.2, Math.PI),
          ), { owner: 'F2' }),
        },
        {
          id: 'attack-outside', label: 'Keep the outside lane', kind: 'space', x: 18.7, y: 6,
          summary: 'F1 keeps possession in the outside lane. The next read is how F2 can stay useful as pressure closes.',
          moveActorId: 'F2',
          state: stateFromLayout(layout(
            pose(18.7, 6, 0.1), pose(15.4, -3.1, 0), pose(18, 3, -2.9), pose(24.6, 0.7, Math.PI),
          ), { owner: 'F1' }),
        },
      ],
    },
  },
};

export const U11_READ_SEQUENCE = Object.freeze({
  id: 'u11-connected-2v1-three-reads-v1',
  title: 'Three reads. One shifting 2-on-1.',
  ageBand: 'U11',
  status: 'draft-for-coach-review',
  sourceRefs: Object.freeze([
    { note: 'docs/library/odd-man-reads.md', use: 'Read visible defender commitment before choosing an action.' },
    { note: 'docs/library/two-on-one-pass-lane-removed.md', use: 'A 2-on-1 does not automatically require a pass.' },
    { note: 'docs/library/two-on-one-support-too-flat.md', use: 'Support alignment affects whether the pass is useful.' },
    { note: 'docs/library/off-puck-support-offense.md', use: 'Off-puck support needs both space and a usable lane.' },
  ]),
  evidenceBoundary: 'Positions, transitions, puck outcomes and timing are newly authored illustrative states for coach review. They do not promise a goal, certify a choice, or add movement that the selected branch did not make.',
  firstPrompt: 'D1 partly shades your shot lane and F2 is slightly flat. What do you do, and what visible cue matters most?',
  firstRubric: Object.freeze({
    mode: 'open',
    mustNotice: Object.freeze(['D1 partly covers the shot route rather than removing every option.', 'F2 is available but slightly flat, so pass timing and support alignment matter.', 'The goalie starts nearer the middle while the puck begins off-centre.']),
    acceptableActions: Object.freeze(['pass', 'shoot', 'carry']),
    avoid: Object.freeze(['Pass only because the rush is a 2-on-1.', 'Treat a shot as a guaranteed goal.', 'Match a fixed coordinate instead of explaining the visible lane.']),
    followUpCue: 'After the play changes, re-scan the puck side, defender and usable support.',
  }),
  initialState: INITIAL_STATE,
  branches: FIRST_BRANCHES,
});

function clone(value) {
  return structuredClone(value);
}

function boundedReason(value, label = 'reason') {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`Add a short ${label} for the read.`);
  const text = value.trim();
  if (text.length > 600) throw new RangeError(`${label} must be 600 characters or fewer.`);
  return text;
}

function branchFor(action) {
  if (!READ_ACTIONS.includes(action)) throw new RangeError('Choose Shoot, Pass or Carry.');
  return U11_READ_SEQUENCE.branches[action];
}

function targetFor(action, targetId) {
  const target = branchFor(action).read2.targets.find(item => item.id === targetId);
  if (!target) throw new RangeError('That target is not available in the current branch.');
  return target;
}

export function createReadSequenceSession() {
  return {
    version: 'rinkreads-read-sequence-session-v1',
    scenarioId: U11_READ_SEQUENCE.id,
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
  if (session?.phase !== 'read-1') throw new Error('The first read is already locked for this attempt.');
  branchFor(action);
  const next = clone(session);
  next.first = { action, reason: boundedReason(reason) };
  next.phase = 'consequence-1';
  next.playbackProgress = 0;
  return next;
}

export function selectSecondRead(session, targetId) {
  if (session?.phase !== 'read-2' || !session.first) throw new Error('Finish the first consequence before making read two.');
  const target = targetFor(session.first.action, targetId);
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
  const target = targetFor(session.first.action, session.second.targetId);
  if (session.third?.actorId !== target.moveActorId) throw new Error('The route must use the current off-puck support player.');
  const actor = target.state.actors.find(item => item.id === target.moveActorId);
  return { x: actor.x, y: actor.y };
}

export function setThirdReadRoute(session, waypoints) {
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
  if (!['read-3', 'complete'].includes(session?.phase) || !session.third?.route) return null;
  return clone(session.third.route);
}

export function sampleThirdReadRoute(session, rawProgress) {
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
  const state = clone(targetFor(session.first.action, session.second.targetId).state);
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
  const base = targetFor(session.first.action, session.second.targetId).state;
  const original = base.actors.find(actor => actor.id === session.third.actorId);
  const point = session.third.point;
  const widthChange = Math.abs(point.y) - Math.abs(original.y);
  const depthChange = point.x - original.x;
  return {
    heading: 'What changed on the board',
    observations: [
      Math.abs(widthChange) < 0.35 ? `${original.label} stayed in a similar width lane.` : widthChange < 0 ? `${original.label} moved toward the middle lane.` : `${original.label} moved toward wider ice.`,
      Math.abs(depthChange) < 0.35 ? `${original.label} kept similar attack depth.` : depthChange > 0 ? `${original.label} moved deeper toward the attacking end.` : `${original.label} moved back toward centre ice.`,
      'Compare the new puck line, D1’s position and separation before deciding whether this support remains useful.',
    ],
    note: 'These are visible spatial changes, not an automatic tactical grade.',
  };
}

export function submitThirdRead(session, reason) {
  if (session?.phase !== 'read-3' || !session.third?.point) throw new Error('Move the highlighted off-puck player before finishing read three.');
  const next = clone(session);
  next.third.reason = boundedReason(reason, 'reason');
  next.phase = 'complete';
  next.reviewStatus = 'draft-for-coach-review';
  next.localEvidence = placementEvidence(next);
  return next;
}

export function getChangedCueComparison(session) {
  if (session?.phase !== 'complete' || !session.third?.reason) throw new Error('Finish all three reads before comparing the changed cue.');
  return {
    id: CHANGED_CUE_ID,
    originalState: clone(INITIAL_STATE),
    changedState: clone(CHANGED_CUE_STATE),
    originalAnswer: clone(session.first),
    revisedAnswer: session.changedCue ? clone(session.changedCue) : null,
    cue: 'D1 moved from part of the shot lane into the pass line between the puck and F2. The attackers, goalie and puck stayed in the same places.',
    sourceRef: { note: 'docs/library/two-on-one-pass-lane-removed.md' },
  };
}

export function submitChangedCueRead(session, { action, reason }) {
  getChangedCueComparison(session);
  branchFor(action);
  const next = clone(session);
  next.changedCue = { id: CHANGED_CUE_ID, action, reason: boundedReason(reason) };
  return next;
}

export function serializeReadSequence(session) {
  if (session?.phase !== 'complete' || !session.first || !session.second || !session.third?.point || !session.third?.reason) {
    throw new Error('Finish all three reads before saving this reflection.');
  }
  return JSON.stringify({
    version: 'rinkreads-read-sequence-reflection-v1',
    scenarioId: U11_READ_SEQUENCE.id,
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

export function restoreReadSequence(raw) {
  try {
    const saved = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!saved || saved.version !== 'rinkreads-read-sequence-reflection-v1' || saved.scenarioId !== U11_READ_SEQUENCE.id || saved.reviewStatus !== 'draft-for-coach-review') return null;
    let session = createReadSequenceSession();
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
  if (!session?.first) return clone(INITIAL_STATE);
  const branch = branchFor(session.first.action);
  if (session.phase === 'consequence-1' || session.phase === 'replay-1') {
    const owner = session.first.action === 'carry' ? 'F1' : null;
    return interpolateState(INITIAL_STATE, branch.state, session.playbackProgress, owner);
  }
  if (!session.second || session.phase === 'read-2') return clone(branch.state);
  const target = targetFor(session.first.action, session.second.targetId);
  if (session.phase === 'consequence-2') {
    const retainedOwner = branch.state.puck.owner && branch.state.puck.owner === target.state.puck.owner ? branch.state.puck.owner : null;
    return interpolateState(branch.state, target.state, session.playbackProgress, retainedOwner);
  }
  return applyThirdPoint(target.state, session.third);
}

export function advanceSequencePlayback(session, rawProgress) {
  if (!['consequence-1', 'consequence-2', 'replay-1'].includes(session?.phase)) throw new Error('No sequence consequence is active.');
  if (!Number.isFinite(rawProgress)) throw new TypeError('Playback progress must be finite.');
  const next = clone(session);
  next.playbackProgress = clamp(rawProgress, 0, 1);
  if (next.playbackProgress < 1) return next;
  if (next.phase === 'consequence-1') {
    next.phase = 'read-2';
    next.availableSecondTargets = clone(branchFor(next.first.action).read2.targets.map(({ id, label, kind, x, y }) => ({ id, label, kind, x, y })));
  } else if (next.phase === 'consequence-2') {
    const target = targetFor(next.first.action, next.second.targetId);
    next.phase = 'read-3';
    next.third = { actorId: target.moveActorId, point: null, reason: '', route: null };
  } else {
    next.phase = next.replayReturnPhase;
    next.replayReturnPhase = null;
  }
  return next;
}

export function replayFirstConsequence(session) {
  if (!session?.first || !['read-2', 'read-3', 'complete'].includes(session.phase)) throw new Error('Finish the first read before replaying its consequence.');
  const next = clone(session);
  next.replayReturnPhase = session.phase;
  next.phase = 'replay-1';
  next.playbackProgress = 0;
  return next;
}

export function getReadTwoPrompt(session) {
  return branchFor(session.first?.action).read2;
}

export function getSelectedSecondTarget(session) {
  return session?.second ? targetFor(session.first.action, session.second.targetId) : null;
}

export function stateToStaticDirectorDraft(state, title = 'Connected-read baseline') {
  if (!state || !Array.isArray(state.actors) || !state.puck) throw new TypeError('A visible sequence state is required.');
  const draft = {
    version: DRAFT_VERSION,
    title,
    duration: 8,
    actors: state.actors.map(actor => ({
      id: actor.id,
      label: actor.label,
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
  if (session?.phase !== 'complete' || !session.first || !session.second || !session.third?.point || !session.third?.reason) {
    throw new Error('Finish all three reads before asking for a final-position review.');
  }
  const selected = targetFor(session.first.action, session.second.targetId);
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
