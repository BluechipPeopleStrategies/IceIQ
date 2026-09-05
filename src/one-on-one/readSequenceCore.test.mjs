import test from 'node:test';
import assert from 'node:assert/strict';
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
