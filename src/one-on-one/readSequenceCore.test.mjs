import test from 'node:test';
import assert from 'node:assert/strict';
import * as sequenceCore from './readSequenceCore.js';
import {
  U11_READ_SEQUENCE,
  advanceSequencePlayback,
  createFinalReadJudgePayload,
  createReadSequenceSession,
  currentSequenceState,
  moveThirdReadActor,
  replayFirstConsequence,
  restoreReadSequence,
  selectSecondRead,
  serializeReadSequence,
  submitFirstRead,
  submitThirdRead,
} from './readSequenceCore.js';
import { createPracticeJudge, validateJudgeRequest } from '../../tools/practice-judge.mjs';

const reason = 'I noticed D1 shades the middle while our support is available but slightly flat.';

function distanceToSegment(point, from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const projection = Math.max(0, Math.min(1, ((point.x - from.x) * dx + (point.y - from.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(point.x - (from.x + projection * dx), point.y - (from.y + projection * dy));
}

function reachReadTwo(action) {
  return advanceSequencePlayback(submitFirstRead(createReadSequenceSession(), { action, reason }), 1);
}

function reachReadThree(action, targetId) {
  return advanceSequencePlayback(selectSecondRead(reachReadTwo(action), targetId), 1);
}

test('each first action produces its own authored consequence and puck context', () => {
  const expected = { pass: 'F2', carry: 'F1', shoot: null };
  for (const action of ['pass', 'shoot', 'carry']) {
    const session = reachReadTwo(action);
    assert.equal(session.phase, 'read-2');
    assert.equal(session.first.action, action);
    assert.equal(currentSequenceState(session).puck.owner, expected[action]);
    assert.match(U11_READ_SEQUENCE.branches[action].consequence, new RegExp(action === 'pass' ? 'pass' : action === 'carry' ? 'carry' : 'shot', 'i'));
  }
  assert.doesNotMatch(U11_READ_SEQUENCE.branches.carry.consequence, /you passed|your pass/i);
  assert.doesNotMatch(U11_READ_SEQUENCE.branches.shoot.consequence, /you scored|goal!/i);
  assert.match(U11_READ_SEQUENCE.branches.shoot.consequence, /no goal is assumed/i);
});

test('the opening geometry visibly shades the shot route rather than the F1-to-F2 pass', () => {
  const actors = Object.fromEntries(U11_READ_SEQUENCE.initialState.actors.map(actor => [actor.id, actor]));
  const net = { x: 26.91384, y: 0 };
  assert.ok(actors.D1.x > actors.F2.x, 'D1 must remain beyond the short F1-to-F2 segment');
  assert.ok(distanceToSegment(actors.D1, actors.F1, net) < 1.2, 'D1 must visibly shade part of the shot route');
  assert.ok(distanceToSegment(actors.D1, actors.F1, actors.F2) > 4, 'D1 must not be described as closing the pass segment');
  assert.match(U11_READ_SEQUENCE.firstPrompt, /shot lane/i);
});

test('read two choices are branch-specific and carry their resulting state forward', () => {
  const pass = reachReadTwo('pass');
  assert.deepEqual(pass.availableSecondTargets.map(target => target.id), ['return-lane', 'hold-wide', 'shoot-open']);
  assert.throws(() => selectSecondRead(pass, 'attack-outside'), /not available/);
  const afterReturn = reachReadThree('pass', 'return-lane');
  assert.equal(afterReturn.phase, 'read-3');
  assert.equal(afterReturn.second.targetId, 'return-lane');
  assert.equal(currentSequenceState(afterReturn).puck.owner, 'F1');
  assert.equal(afterReturn.third.actorId, 'F2');

  const passShot = reachReadThree('pass', 'shoot-open');
  assert.equal(currentSequenceState(passShot).puck.owner, null);
  assert.equal(passShot.third.actorId, 'F1');

  const carry = reachReadThree('carry', 'support-middle');
  assert.equal(currentSequenceState(carry).puck.owner, 'F2');
  assert.equal(carry.third.actorId, 'F1');
});

test('continuous carries retain possession during the second animation while passes and shots stay loose in transit', () => {
  const passHold = selectSecondRead(reachReadTwo('pass'), 'hold-wide');
  assert.equal(currentSequenceState(advanceSequencePlayback(passHold, 0.5)).puck.owner, 'F2');
  const carryOutside = selectSecondRead(reachReadTwo('carry'), 'attack-outside');
  assert.equal(currentSequenceState(advanceSequencePlayback(carryOutside, 0.5)).puck.owner, 'F1');
  const passReturn = selectSecondRead(reachReadTwo('pass'), 'return-lane');
  assert.equal(currentSequenceState(advanceSequencePlayback(passReturn, 0.5)).puck.owner, null);
  const passShot = selectSecondRead(reachReadTwo('pass'), 'shoot-open');
  assert.equal(currentSequenceState(advanceSequencePlayback(passShot, 0.5)).puck.owner, null);
});

test('first-read input is bounded and never changes the prior session on failure', () => {
  const initial = createReadSequenceSession();
  assert.throws(() => submitFirstRead(initial, { action: 'teleport', reason }), /Shoot, Pass or Carry/);
  assert.throws(() => submitFirstRead(initial, { action: 'pass', reason: '   ' }), /reason/);
  assert.throws(() => submitFirstRead(initial, { action: 'pass', reason: 'x'.repeat(601) }), /600/);
  assert.equal(initial.phase, 'read-1');
  assert.equal(initial.first, null);
});

test('read three moves only the named off-puck actor inside the canonical rounded rink', () => {
  const session = reachReadThree('shoot', 'rebound-space');
  const before = currentSequenceState(session);
  const moved = moveThirdReadActor(session, { x: 99, y: 99 });
  const after = currentSequenceState(moved);
  assert.equal(moved.third.actorId, 'F1');
  assert.notDeepEqual(after.actors.find(actor => actor.id === 'F1'), before.actors.find(actor => actor.id === 'F1'));
  for (const actor of after.actors.filter(actor => actor.id !== 'F1')) {
    assert.deepEqual(actor, before.actors.find(item => item.id === actor.id));
  }
  const point = moved.third.point;
  assert.ok(point.x <= 30.48 && point.y <= 12.954);
  assert.ok(Math.hypot(point.x - (30.48 - 8.5344), point.y - (12.954 - 8.5344)) <= 8.5344 + 1e-9);
});

test('third explanation completes a draft for coach review without automatic scoring', () => {
  const session = moveThirdReadActor(reachReadThree('carry', 'attack-outside'), { x: 17, y: -1.8 });
  assert.throws(() => submitThirdRead(session, ''), /reason/);
  const complete = submitThirdRead(session, 'I moved into a middle support lane where F1 can still see me.');
  assert.equal(complete.phase, 'complete');
  assert.equal(complete.reviewStatus, 'draft-for-coach-review');
  assert.equal(complete.score, undefined);
  assert.doesNotMatch(JSON.stringify(complete.localEvidence), /correct|percent|pass mark/i);
});

test('placement evidence describes depth direction without guessing a puck relationship', () => {
  const session = reachReadThree('carry', 'attack-outside');
  const complete = submitThirdRead(moveThirdReadActor(session, { x: 10, y: -1.8 }), 'I moved back to keep a second layer available.');
  assert.ok(complete.localEvidence.observations.some(item => /toward centre ice/i.test(item)));
  assert.doesNotMatch(JSON.stringify(complete.localEvidence), /underneath the puck/i);
});

test('replay is deterministic and never changes either submitted answer', () => {
  const answered = submitThirdRead(
    moveThirdReadActor(reachReadThree('pass', 'hold-wide'), { x: 18, y: 1.5 }),
    'I filled behind the puck so the carrier keeps a second option.',
  );
  const snapshot = structuredClone(answered);
  const replaying = replayFirstConsequence(answered);
  assert.equal(replaying.phase, 'replay-1');
  assert.equal(replaying.replayReturnPhase, 'complete');
  assert.equal(replaying.first.action, 'pass');
  assert.equal(replaying.second.targetId, 'hold-wide');
  const finished = advanceSequencePlayback(replaying, 1);
  assert.equal(finished.phase, 'complete');
  assert.deepEqual(finished.first, snapshot.first);
  assert.deepEqual(finished.second, snapshot.second);
  assert.deepEqual(finished.third, snapshot.third);
  assert.deepEqual(answered, snapshot);
});

test('a completed reflection round-trips without identity or score and corrupt saves are ignored', () => {
  const complete = submitThirdRead(
    moveThirdReadActor(reachReadThree('pass', 'shoot-open'), { x: 17.2, y: 1.4 }),
    'I stayed under the loose puck so F2 still has support.',
  );
  const raw = serializeReadSequence(complete);
  assert.doesNotMatch(raw, /playerId|score|percent/i);
  const restored = restoreReadSequence(raw);
  assert.deepEqual(restored.first, complete.first);
  assert.deepEqual(restored.second, complete.second);
  assert.deepEqual(restored.third, complete.third);
  assert.equal(restored.phase, 'complete');
  assert.equal(restoreReadSequence('{bad json'), null);
  assert.equal(restoreReadSequence({ version: 'rinkreads-read-sequence-reflection-v1', scenarioId: U11_READ_SEQUENCE.id, reviewStatus: 'draft-for-coach-review', first: { action: 'carry', reason }, second: { targetId: 'return-lane' }, third: { point: { x: 10, y: 0 }, reason } }), null);
});

test('the optional AI request reviews only the actual final support state against a non-ideal baseline', async () => {
  const complete = submitThirdRead(
    moveThirdReadActor(reachReadThree('pass', 'shoot-open'), { x: 17.2, y: 1.4 }),
    'I stayed behind the loose puck so F2 still has a visible support option.',
  );
  const payload = createFinalReadJudgePayload(complete);
  assert.deepEqual(payload.question.initialDraft, payload.question.referenceDraft);
  assert.notStrictEqual(payload.question.initialDraft, payload.question.referenceDraft);
  assert.match(payload.question.coachExplanation, /baseline only|not an ideal coach answer/i);
  assert.equal(payload.question.sourceRef.note, 'docs/library/off-puck-support-offense.md');
  assert.equal(payload.question.type, 'position');
  assert.equal(payload.question.expectedAction, null);
  assert.equal(payload.attempt.reason, complete.third.reason);
  assert.ok(payload.question.rubric.mustNotice.some(cue => /loose on F2.s side, ahead of D1 and before the goalie/i.test(cue)));
  assert.doesNotMatch(JSON.stringify(payload), /playerId|mastery|telemetry/i);
  assert.doesNotThrow(() => validateJudgeRequest(payload));

  let providerCalled = false;
  const judge = createPracticeJudge({
    apiKey: 'server-test-key',
    rootDir: process.cwd(),
    fetchImpl: async () => {
      providerCalled = true;
      const judgment = { verdict: 'plausible-alternative', headline: 'A support option to discuss', explanation: 'The move changes the support lane while keeping the loose-puck context visible.', cue: 'Keep checking D1 and the puck line.', nextQuestion: 'Where could you re-offer if D1 follows?', confidence: 'medium' };
      return new Response(JSON.stringify({ output_text: JSON.stringify(judgment) }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    },
  });
  const result = await judge.judge(payload);
  assert.equal(providerCalled, true);
  assert.equal(result.ok, true);
  assert.equal(result.judgment.verdict, 'plausible-alternative');
});

test('the three reads cite exact local teaching notes and remain explicitly illustrative', () => {
  assert.deepEqual(U11_READ_SEQUENCE.sourceRefs.map(source => source.note), [
    'docs/library/odd-man-reads.md',
    'docs/library/two-on-one-pass-lane-removed.md',
    'docs/library/two-on-one-support-too-flat.md',
    'docs/library/off-puck-support-offense.md',
  ]);
  assert.equal(U11_READ_SEQUENCE.status, 'draft-for-coach-review');
  assert.match(U11_READ_SEQUENCE.evidenceBoundary, /illustrative|authored/i);
});

function completeSequence() {
  return submitThirdRead(
    moveThirdReadActor(reachReadThree('pass', 'hold-wide'), { x: 18, y: 1.5 }),
    'I stayed available behind the puck.',
  );
}

test('changed-cue comparison moves only D1 onto the actual pass line, leaving the original freeze intact', () => {
  assert.equal(typeof sequenceCore.getChangedCueComparison, 'function');
  const initialBefore = structuredClone(U11_READ_SEQUENCE.initialState);
  const complete = completeSequence();
  const before = structuredClone(complete);
  const comparison = sequenceCore.getChangedCueComparison(complete);
  assert.deepEqual(comparison.originalState, initialBefore);
  assert.deepEqual(comparison.originalAnswer, complete.first);
  const originalD1 = comparison.originalState.actors.find(actor => actor.id === 'D1');
  const changedD1 = comparison.changedState.actors.find(actor => actor.id === 'D1');
  const support = comparison.changedState.actors.find(actor => actor.id === 'F2');
  const puck = comparison.changedState.puck;
  assert.ok(distanceToSegment(originalD1, puck, support) > 4, 'The original defender stays outside the pass line');
  assert.ok(distanceToSegment(changedD1, puck, support) < 0.05, 'The changed defender visibly occupies the actual puck-to-F2 pass');
  assert.ok(distanceToSegment(changedD1, puck, { x: 26.91384, y: 0 }) > 3, 'The changed defender no longer shades the shot line');
  assert.ok(Math.hypot(changedD1.x - originalD1.x, changedD1.y - originalD1.y) > 3, 'A meaningful cue change, not cosmetic jitter');
  assert.equal(changedD1.facing, originalD1.facing);
  assert.deepEqual(comparison.changedState.puck, comparison.originalState.puck);
  for (const actor of comparison.changedState.actors.filter(actor => actor.id !== 'D1')) {
    assert.deepEqual(actor, comparison.originalState.actors.find(item => item.id === actor.id));
  }
  comparison.changedState.actors[0].x = 99;
  comparison.originalState.actors[0].x = 99;
  comparison.originalAnswer.reason = 'mutated';
  assert.deepEqual(complete, before);
  assert.deepEqual(U11_READ_SEQUENCE.initialState, initialBefore);
});

test('comparison accepts revised or retained actions with reasons without changing the three-read result or AI request', () => {
  assert.equal(typeof sequenceCore.submitChangedCueRead, 'function');
  const complete = completeSequence();
  const before = structuredClone(complete);
  for (const action of ['shoot', 'carry', 'pass']) {
    const updated = sequenceCore.submitChangedCueRead(complete, { action, reason: 'I noticed D1 is now between the puck and F2, so my timing would matter.' });
    assert.equal(updated.phase, 'complete');
    assert.equal(updated.changedCue.action, action);
    assert.deepEqual(updated.first, complete.first);
    assert.deepEqual(updated.second, complete.second);
    assert.deepEqual(updated.third, complete.third);
    assert.deepEqual(currentSequenceState(updated), currentSequenceState(complete));
    assert.deepEqual(createFinalReadJudgePayload(updated), createFinalReadJudgePayload(complete));
    assert.equal(updated.changedCue.score, undefined);
    assert.equal(updated.changedCue.verdict, undefined);
    assert.deepEqual(advanceSequencePlayback(replayFirstConsequence(updated), 1).changedCue, updated.changedCue);
  }
  assert.deepEqual(complete, before);
  assert.throws(() => sequenceCore.submitChangedCueRead(complete, { action: 'shoot', reason: ' ' }), /reason/);
  assert.throws(() => sequenceCore.submitChangedCueRead(complete, { action: 'shoot', reason: 'x'.repeat(601) }), /600/);
  assert.throws(() => sequenceCore.submitChangedCueRead(complete, { action: 'teleport', reason }), /Shoot, Pass or Carry/);
  assert.throws(() => sequenceCore.submitChangedCueRead(createReadSequenceSession(), { action: 'shoot', reason }), /three reads/i);
  assert.throws(() => sequenceCore.getChangedCueComparison(reachReadTwo('shoot')), /three reads/i);
});

test('saved comparison round-trips separately from original answers and legacy reflections still restore', () => {
  assert.equal(typeof sequenceCore.submitChangedCueRead, 'function');
  const complete = completeSequence();
  const legacy = JSON.parse(serializeReadSequence(complete));
  delete legacy.changedCue;
  assert.deepEqual(restoreReadSequence(legacy).first, complete.first);
  assert.equal(restoreReadSequence(legacy).changedCue, null);
  const updated = sequenceCore.submitChangedCueRead(complete, { action: 'shoot', reason: 'D1 moved into the pass line, so I would use the shot space.' });
  const raw = serializeReadSequence(updated);
  assert.doesNotMatch(raw, /playerId|score|verdict/i);
  const restored = restoreReadSequence(raw);
  assert.deepEqual(restored.changedCue, updated.changedCue);
  assert.deepEqual(restored.first, complete.first);
  assert.deepEqual(sequenceCore.getChangedCueComparison(restored).revisedAnswer, updated.changedCue);
  const corrupt = JSON.parse(raw);
  corrupt.changedCue.action = 'teleport';
  assert.equal(restoreReadSequence(corrupt), null);
  corrupt.changedCue = { ...updated.changedCue, id: 'unrecognized-cue' };
  assert.equal(restoreReadSequence(corrupt), null);
});

const routeOrigins = [
  ['pass', 'return-lane', 'F2', 17.1, -3.5],
  ['pass', 'hold-wide', 'F1', 15.4, 2.3],
  ['pass', 'shoot-open', 'F1', 14.8, 2.5],
  ['shoot', 'rebound-space', 'F1', 14.6, 2.4],
  ['shoot', 'high-support', 'F1', 14.6, 2.5],
  ['carry', 'support-middle', 'F1', 18, 5.4],
  ['carry', 'attack-outside', 'F2', 15.4, -3.1],
];

test('routes begin at the actual off-puck actor in each of the seven read-two results', () => {
  assert.equal(typeof sequenceCore.setThirdReadRoute, 'function');
  for (const [action, targetId, actorId, x, y] of routeOrigins) {
    const session = reachReadThree(action, targetId);
    const snapshot = structuredClone(session);
    const waypoints = [{ x: 12, y: -1 }, { x: 13, y: 0 }];
    const routed = sequenceCore.setThirdReadRoute(session, waypoints);
    assert.equal(routed.third.actorId, actorId);
    assert.deepEqual(routed.third.route, [{ x, y }, { x: 12, y: -1 }, { x: 13, y: 0 }]);
    assert.deepEqual(routed.third.point, { x: 13, y: 0 });
    const exposed = sequenceCore.getThirdReadRoute(routed);
    exposed[0].x = 99;
    waypoints[1].x = 99;
    assert.deepEqual(routed.third.route, [{ x, y }, { x: 12, y: -1 }, { x: 13, y: 0 }]);
    assert.deepEqual(session, snapshot);
    const start = sequenceCore.sampleThirdReadRoute(routed, 0);
    assert.equal(start.actors.find(actor => actor.id === actorId).x, x);
    assert.equal(start.actors.find(actor => actor.id === actorId).y, y);
  }
});

test('route sampling follows distance along every segment rather than cutting across the corner', () => {
  assert.equal(typeof sequenceCore.sampleThirdReadRoute, 'function');
  const session = reachReadThree('pass', 'hold-wide');
  const baseline = currentSequenceState(session);
  const routed = sequenceCore.setThirdReadRoute(session, [{ x: 19.4, y: 2.3 }, { x: 19.4, y: -0.7 }]);
  const snapshot = structuredClone(routed);
  for (const [progress, x, y, facing] of [[-1, 15.4, 2.3, 0], [2 / 7, 17.4, 2.3, 0], [3.5 / 7, 18.9, 2.3, 0], [5.5 / 7, 19.4, 0.8, -Math.PI / 2], [2, 19.4, -0.7, -Math.PI / 2]]) {
    const sampled = sequenceCore.sampleThirdReadRoute(routed, progress);
    const mover = sampled.actors.find(actor => actor.id === 'F1');
    assert.ok(Math.abs(mover.x - x) < 1e-9);
    assert.ok(Math.abs(mover.y - y) < 1e-9);
    assert.ok(Math.abs(mover.facing - facing) < 1e-9);
    assert.deepEqual(sampled.puck, baseline.puck);
    assert.deepEqual(sampled.actors.filter(actor => actor.id !== 'F1'), baseline.actors.filter(actor => actor.id !== 'F1'));
    sampled.puck.x = 99;
    sampled.actors[0].x = 99;
  }
  assert.deepEqual(routed, snapshot);
  for (const value of [NaN, Infinity, undefined, '0.5']) assert.throws(() => sequenceCore.sampleThirdReadRoute(routed, value), /finite/);
  assert.throws(() => sequenceCore.sampleThirdReadRoute(session, 0.5), /route/i);
});

test('routes bound finite waypoints and reject excess or zero-length segments without mutating the prior session', () => {
  assert.equal(typeof sequenceCore.setThirdReadRoute, 'function');
  const session = reachReadThree('pass', 'hold-wide');
  const snapshot = structuredClone(session);
  const routed = sequenceCore.setThirdReadRoute(session, [{ x: 99, y: 99 }]);
  const point = routed.third.point;
  assert.ok(point.x <= 30.48 && point.y <= 12.954);
  assert.ok(Math.hypot(point.x - 21.9456, point.y - 4.4196) <= 8.5344 - 0.65 + 1e-9);
  const twelve = Array.from({ length: 12 }, (_, index) => ({ x: 5 + index, y: 0 }));
  assert.equal(sequenceCore.setThirdReadRoute(session, twelve).third.route.length, 13);
  assert.equal(sequenceCore.MAX_THIRD_ROUTE_POINTS, 12);
  assert.throws(() => sequenceCore.setThirdReadRoute(session, [...twelve, { x: 20, y: 0 }]), /12/);
  for (const invalid of [null, {}, [{ x: NaN, y: 0 }], [{ x: 1, y: Infinity }], [null], [{ x: '1', y: 0 }], [{ x: 15.4, y: 2.3 }], [{ x: 12, y: 0 }, { x: 12, y: 0 }], [{ x: 99, y: 99 }, { x: 99, y: 99 }]]) {
    assert.throws(() => sequenceCore.setThirdReadRoute(session, invalid));
  }
  assert.deepEqual(session, snapshot);
  assert.throws(() => sequenceCore.setThirdReadRoute(reachReadTwo('pass'), twelve), /read three/i);
  assert.throws(() => sequenceCore.setThirdReadRoute(completeSequence(), twelve), /read three/i);
});

test('clearing a route requires a fresh placement and a direct placement removes stale route playback', () => {
  assert.equal(typeof sequenceCore.setThirdReadRoute, 'function');
  const session = reachReadThree('carry', 'attack-outside');
  assert.equal(sequenceCore.getThirdReadRoute(session), null);
  const routed = sequenceCore.setThirdReadRoute(session, [{ x: 17, y: 1 }]);
  const cleared = sequenceCore.setThirdReadRoute(routed, []);
  assert.equal(cleared.third.point, null);
  assert.equal(sequenceCore.getThirdReadRoute(cleared), null);
  assert.throws(() => submitThirdRead(cleared, reason), /Move/);
  const placed = moveThirdReadActor(routed, { x: 15, y: 2 });
  assert.equal(sequenceCore.getThirdReadRoute(placed), null);
  assert.deepEqual(placed.third.point, { x: 15, y: 2 });
  assert.equal(sequenceCore.getThirdReadRoute(createReadSequenceSession()), null);
  assert.equal(sequenceCore.getThirdReadRoute(replayFirstConsequence(routed)), null);
  assert.deepEqual(sequenceCore.getThirdReadRoute(advanceSequencePlayback(replayFirstConsequence(routed), 1)), routed.third.route);
});

test('completed route reflections restore alongside comparisons, preserve replay and send only the final position to AI', () => {
  assert.equal(typeof sequenceCore.setThirdReadRoute, 'function');
  const session = reachReadThree('pass', 'return-lane');
  const routed = sequenceCore.setThirdReadRoute(session, [{ x: 19, y: -3.5 }, { x: 19, y: 1 }]);
  const complete = sequenceCore.submitChangedCueRead(submitThirdRead(routed, reason), { action: 'carry', reason });
  const raw = serializeReadSequence(complete);
  assert.deepEqual(JSON.parse(raw).third.route, [{ x: 17.1, y: -3.5 }, { x: 19, y: -3.5 }, { x: 19, y: 1 }]);
  const restored = restoreReadSequence(raw);
  assert.deepEqual(restored.third, complete.third);
  assert.deepEqual(restored.changedCue, complete.changedCue);
  assert.deepEqual(sequenceCore.getThirdReadRoute(restored), complete.third.route);
  const replayed = advanceSequencePlayback(replayFirstConsequence(restored), 1);
  assert.deepEqual(replayed.third, complete.third);
  const direct = submitThirdRead(moveThirdReadActor(session, { x: 19, y: 1 }), reason);
  assert.deepEqual(createFinalReadJudgePayload(complete), createFinalReadJudgePayload(direct));
  assert.doesNotMatch(JSON.stringify(createFinalReadJudgePayload(complete)), /third\.route|waypoints/);
  const legacy = JSON.parse(raw);
  delete legacy.third.route;
  assert.deepEqual(restoreReadSequence(legacy).third.point, { x: 19, y: 1 });
  assert.equal(sequenceCore.getThirdReadRoute(restoreReadSequence(legacy)), null);
});

test('restore rejects malformed routes, altered origins, endpoints, off-ice positions and empty segments', () => {
  assert.equal(typeof sequenceCore.setThirdReadRoute, 'function');
  const complete = submitThirdRead(sequenceCore.setThirdReadRoute(reachReadThree('pass', 'hold-wide'), [{ x: 19.4, y: 2.3 }, { x: 19.4, y: -0.7 }]), reason);
  const valid = JSON.parse(serializeReadSequence(complete));
  const invalidRoutes = [null, {}, [], [{ x: 15.4, y: 2.3 }], [{ x: 15.5, y: 2.3 }, ...valid.third.route.slice(1)], [valid.third.route[0], { x: 19.4, y: 2.3 }, { x: 19.4, y: -0.8 }], [valid.third.route[0], { x: 99, y: 99 }, valid.third.point], [valid.third.route[0], { x: '19', y: 0 }, valid.third.point], [valid.third.route[0], { x: NaN, y: 0 }, valid.third.point], [valid.third.route[0], valid.third.route[0], valid.third.point], [valid.third.route[0], ...Array.from({ length: 13 }, (_, i) => ({ x: 5 + i, y: 0 }))]];
  for (const route of invalidRoutes) {
    const malformed = structuredClone(valid);
    malformed.third.route = route;
    assert.equal(restoreReadSequence(malformed), null, `Must reject ${JSON.stringify(route)}`);
  }
  const changedPoint = structuredClone(valid);
  changedPoint.third.point.x += 0.1;
  assert.equal(restoreReadSequence(changedPoint), null);
});
