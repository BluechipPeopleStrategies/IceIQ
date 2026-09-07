import test from 'node:test';
import assert from 'node:assert/strict';
import { createReadSequenceSession, submitFirstRead, advanceSequencePlayback, currentSequenceState, selectSecondRead, moveThirdReadActor, submitThirdRead, serializeReadSequence, U11_READ_SEQUENCE } from './readSequenceCore.js';
import { canReadAsDefender, createDefenderPerspective, moveDefenderPerspective, submitDefenderPerspective, defenderPerspectiveState, restoreDefenderPerspective, serializeDefenderPerspective, getDefenderPerspectiveStorageKey } from './defenderPerspectiveCore.js';

const passFreeze = () => advanceSequencePlayback(submitFirstRead(createReadSequenceSession(), { action: 'pass', reason: 'F2 is open across the ice.' }), 1);

test('defender handoff is available only after the real U11 pass has arrived', () => {
  const initial = createReadSequenceSession();
  const inFlight = advanceSequencePlayback(submitFirstRead(initial, { action: 'pass', reason: 'The pass is clear.' }), .5);
  assert.equal(currentSequenceState(inFlight).puck.owner, null);
  assert.equal(canReadAsDefender(initial), false);
  assert.equal(canReadAsDefender(inFlight), false);
  assert.throws(() => createDefenderPerspective(inFlight));
  const freeze = passFreeze();
  assert.equal(canReadAsDefender(freeze), true);
  const attempt = createDefenderPerspective(freeze);
  assert.deepEqual(attempt.sourceState, currentSequenceState(freeze));
  assert.equal(attempt.sourceState.puck.owner, 'F2');
  assert.deepEqual(attempt.beforeState, U11_READ_SEQUENCE.initialState);
  for (const action of ['shoot', 'carry']) assert.equal(canReadAsDefender(advanceSequencePlayback(submitFirstRead(initial, { action, reason: 'I see space.' }), 1)), false);
});

test('explicit defender view moves only D1 and preserves all original actors, facing and puck', () => {
  const session = passFreeze();
  const original = JSON.stringify(session);
  const attempt = createDefenderPerspective(session);
  const moved = moveDefenderPerspective(attempt, 'D1', { x: 20, y: -1 }, 'rink');
  assert.equal(attempt.point, null);
  assert.throws(() => moveDefenderPerspective(attempt, 'F2', { x: 20, y: -1 }, 'rink'));
  const shown = defenderPerspectiveState(moved);
  assert.equal(shown.actors.find(actor => actor.id === 'D1').label, 'D1');
  assert.deepEqual(shown.actors.filter(actor => actor.isLearner), [], 'Named focus does not assign the learner a first-person role.');
  assert.equal(shown.actors.find(actor => actor.id === 'F1').label, 'F1');
  assert.equal(moved.sourceState.actors.find(actor => actor.id === 'F1').label, 'YOU');
  assert.deepEqual(shown.puck, attempt.sourceState.puck);
  for (const actor of shown.actors) {
    const source = attempt.sourceState.actors.find(item => item.id === actor.id);
    assert.equal(actor.facing, source.facing);
    if (actor.id !== 'D1') assert.deepEqual([actor.x, actor.y], [source.x, source.y]);
  }
  assert.equal(JSON.stringify(session), original);
});

test('placement and optional reason round-trip together; no score, tactical verdict or original save changes', () => {
  const freeze = passFreeze();
  let original = advanceSequencePlayback(selectSecondRead(freeze, 'hold-wide'), 1);
  original = submitThirdRead(moveThirdReadActor(original, { x: 16, y: 2 }), 'Stay available.');
  const savedBefore = serializeReadSequence(original);
  const attempt = createDefenderPerspective(freeze);
  assert.throws(() => submitDefenderPerspective(attempt, 'Protect the middle.'));
  const placed = moveDefenderPerspective(attempt, 'D1', { x: 19, y: -.5 }, 'coordinates');
  const withoutReason = submitDefenderPerspective(placed, '   ');
  assert.equal(withoutReason.reason, '');
  assert.deepEqual(restoreDefenderPerspective(serializeDefenderPerspective(withoutReason)), withoutReason);
  assert.throws(() => submitDefenderPerspective(placed, 'x'.repeat(601)));
  const completed = submitDefenderPerspective(placed, 'I can see F2 and protect the route back across.');
  const serialized = serializeDefenderPerspective(completed);
  assert.deepEqual(restoreDefenderPerspective(serialized), completed);
  assert.deepEqual(restoreDefenderPerspective(serialized, freeze), completed);
  assert.equal(completed.inputMethod, 'coordinates');
  assert.equal(completed.status, 'saved-for-coach-discussion');
  assert.equal('score' in completed, false);
  assert.equal('verdict' in completed, false);
  assert.equal(serializeReadSequence(original), savedBefore);
  assert.notEqual(getDefenderPerspectiveStorageKey('one'), getDefenderPerspectiveStorageKey('two'));
});

test('restore rejects tampered freeze, wrong role, wrong action, off-ice point and mismatched parent read', () => {
  const freeze = passFreeze();
  const completed = submitDefenderPerspective(moveDefenderPerspective(createDefenderPerspective(freeze), 'D1', { x: 18, y: 0 }, 'rink'), 'Keep the middle covered.');
  for (const change of [
    value => { value.sourceState.puck.owner = 'F1'; },
    value => { value.sourceState.actors[0].x += 1; },
    value => { value.actorId = 'G'; },
    value => { value.first.action = 'shoot'; },
    value => { value.point.x = 500; },
    value => { value.reason = {}; },
    value => { value.inputMethod = 'automatic'; },
    value => { value.inputMethod = 'hold'; },
    value => { value.score = 100; },
  ]) {
    const copy = structuredClone(completed); change(copy);
    assert.equal(restoreDefenderPerspective(copy), null);
  }
  const different = advanceSequencePlayback(submitFirstRead(createReadSequenceSession(), { action: 'pass', reason: 'Different choice basis.' }), 1);
  assert.equal(restoreDefenderPerspective(completed, different), null);
});

test('stay records must use the exact source D1 position', () => {
  const attempt = createDefenderPerspective(passFreeze());
  const source = attempt.sourceState.actors.find(actor => actor.id === 'D1');
  assert.throws(() => moveDefenderPerspective(attempt, 'D1', { x: 18, y: 0 }, 'hold'));
  const completed = submitDefenderPerspective(moveDefenderPerspective(attempt, 'D1', { x: source.x, y: source.y }, 'hold'));
  assert.deepEqual(restoreDefenderPerspective(serializeDefenderPerspective(completed)), completed);
});
