import test from 'node:test';
import assert from 'node:assert/strict';
import {
  U11_READ_SEQUENCE, U9_READ_SEQUENCE, createReadSequenceSession, submitFirstRead,
  advanceSequencePlayback, selectSecondRead, moveThirdReadActor, setThirdReadRoute,
  submitThirdRead, submitChangedCueRead, serializeReadSequence,
} from './readSequenceCore.js';

import * as storage from './readSequenceRecallStorage.js';
import * as recallApi from './readSequenceRecall.js';

function completed({ scenarioId = U11_READ_SEQUENCE.id, action = 'pass', targetId,
  point = { x: 12, y: 1 }, route, firstReason = 'I saw space across the ice.',
  thirdReason = 'This gives the puck carrier another option.' } = {}) {
  const target = targetId || (scenarioId === U9_READ_SEQUENCE.id ? 'return-pass' : 'hold-wide');
  let session = createReadSequenceSession(scenarioId);
  session = advanceSequencePlayback(submitFirstRead(session, { action, reason: firstReason }), 1);
  session = advanceSequencePlayback(selectSecondRead(session, target), 1);
  session = route ? setThirdReadRoute(session, route) : moveThirdReadActor(session, point);
  return submitThirdRead(session, thirdReason);
}

function attemptFixture(options) {
  assert.equal(typeof storage.serializeReadSequenceRecallAttempt, 'function');
  assert.equal(typeof storage.restoreReadSequenceRecallAttempt, 'function');
  assert.equal(typeof recallApi.createReadSequenceRecall, 'function');
  const session = completed(options);
  const recall = recallApi.createReadSequenceRecall(session);
  const order = [...recall.chronologicalIds];
  return { session, recall, order };
}

test('recall storage uses a separate key for each player and scenario without replacing reflection keys', () => {
  assert.equal(typeof storage.getReadSequenceRecallStorageKey, 'function');
  assert.equal(storage.getReadSequenceRecallStorageKey('a:b', 'u11-connected-2v1-three-reads-v1'), 'rinkreads_read_sequence_v1:a%3Ab:recall');
  assert.equal(storage.getReadSequenceRecallStorageKey(null, 'u9-connected-support-three-reads-v1'), 'rinkreads_read_sequence_v1:local:u9-connected-support-three-reads-v1:recall');
  assert.notEqual(storage.getReadSequenceRecallStorageKey('one'), storage.getReadSequenceRecallStorageKey('two'));
  assert.throws(() => storage.getReadSequenceRecallStorageKey('one', 'unknown'), /scenario/i);
});

test('a recall attempt round-trips optional discussion text and recomputes its match without storing a grade', () => {
  const { session, order } = attemptFixture();
  const raw = storage.serializeReadSequenceRecallAttempt(session, { order, reason: '  The puck moved first.  ', usedAnswer: true });
  const saved = JSON.parse(raw);
  assert.deepEqual(storage.restoreReadSequenceRecallAttempt(raw, session), {
    order, reason: 'The puck moved first.', usedAnswer: true, matchesPlay: true,
  });
  assert.deepEqual(Object.keys(saved).sort(), ['basis', 'order', 'reason', 'usedAnswer', 'version']);
  const defaults = storage.restoreReadSequenceRecallAttempt(storage.serializeReadSequenceRecallAttempt(session, { order }), session);
  assert.equal(defaults.reason, '');
  assert.equal(defaults.usedAnswer, false);
});

test('a valid different order remains a mismatch even if a saved record supplies a false grade', () => {
  const { session, order } = attemptFixture();
  const different = [order[2], order[0], order[1]];
  const saved = JSON.parse(storage.serializeReadSequenceRecallAttempt(session, { order: different }));
  saved.matchesPlay = true;
  const restored = storage.restoreReadSequenceRecallAttempt(saved, session);
  assert.deepEqual(restored.order, different);
  assert.equal(restored.matchesPlay, false);
});

test('invalid permutations and moving the U9 fixed opening cannot be saved or restored', () => {
  for (const scenarioId of [U11_READ_SEQUENCE.id, U9_READ_SEQUENCE.id]) {
    const { session, order } = attemptFixture({ scenarioId });
    const saved = JSON.parse(storage.serializeReadSequenceRecallAttempt(session, { order }));
    const invalid = [null, {}, [], order.slice(1), [...order, order[0]], [order[0], , order[2]], [order[0], order[0], order[2]], [order[0], order[1], 'unknown']];
    if (scenarioId === U9_READ_SEQUENCE.id) invalid.push([order[1], order[0], order[2]]);
    for (const badOrder of invalid) {
      assert.throws(() => storage.serializeReadSequenceRecallAttempt(session, { order: badOrder }));
      assert.equal(storage.restoreReadSequenceRecallAttempt({ ...saved, order: badOrder }, session), null);
    }
    const u9Swap = [order[0], order[2], order[1]];
    assert.equal(storage.restoreReadSequenceRecallAttempt(storage.serializeReadSequenceRecallAttempt(session, { order: u9Swap }), session).matchesPlay, false);
  }
});

test('discussion reason and answer-use fields require bounded strings and actual booleans', () => {
  const { session, order } = attemptFixture();
  const saved = JSON.parse(storage.serializeReadSequenceRecallAttempt(session, { order }));
  for (const reason of [null, 2, {}, [], 'x'.repeat(601)]) {
    assert.throws(() => storage.serializeReadSequenceRecallAttempt(session, { order, reason }));
    assert.equal(storage.restoreReadSequenceRecallAttempt({ ...saved, reason }, session), null);
  }
  for (const usedAnswer of [null, 0, 1, 'true', {}, []]) {
    assert.throws(() => storage.serializeReadSequenceRecallAttempt(session, { order, usedAnswer }));
    assert.equal(storage.restoreReadSequenceRecallAttempt({ ...saved, usedAnswer }, session), null);
  }
  for (const field of ['reason', 'usedAnswer']) {
    const missing = { ...saved };
    delete missing[field];
    assert.equal(storage.restoreReadSequenceRecallAttempt(missing, session), null);
  }
  const boundary = storage.serializeReadSequenceRecallAttempt(session, { order, reason: `  ${'x'.repeat(600)}  ` });
  assert.equal(storage.restoreReadSequenceRecallAttempt(boundary, session).reason.length, 600);
});

test('malformed records and mismatched versions or recall basis are ignored', () => {
  const { session, order } = attemptFixture();
  const saved = JSON.parse(storage.serializeReadSequenceRecallAttempt(session, { order }));
  for (const raw of ['{bad json', 'null', '[]', null, undefined, true, 1, {}, [], { ...saved, version: 'old' }, { ...saved, basis: null }]) {
    assert.equal(storage.restoreReadSequenceRecallAttempt(raw, session), null);
  }
  const differentCaption = structuredClone(saved);
  differentCaption.basis.cards[1].caption += ' Stale content.';
  assert.equal(storage.restoreReadSequenceRecallAttempt(differentCaption, session), null);
  const differentSnapshot = structuredClone(saved);
  differentSnapshot.basis.cards[1].state.puck.x += 1;
  assert.equal(storage.restoreReadSequenceRecallAttempt(differentSnapshot, session), null);
  const differentPath = structuredClone(saved);
  differentPath.basis.pathId = 'another-path';
  assert.equal(storage.restoreReadSequenceRecallAttempt(differentPath, session), null);
});

test('attempts are bound to scenario, branch, support placement and both original explanations', () => {
  const { session, order } = attemptFixture();
  const raw = storage.serializeReadSequenceRecallAttempt(session, { order });
  const changedSessions = [
    completed({ scenarioId: U9_READ_SEQUENCE.id }),
    completed({ targetId: 'return-lane' }),
    completed({ action: 'carry', targetId: 'attack-outside' }),
    completed({ point: { x: 13, y: 1 } }),
    completed({ firstReason: 'A different first explanation.' }),
    completed({ thirdReason: 'A different support explanation.' }),
  ];
  for (const changed of changedSessions) assert.equal(storage.restoreReadSequenceRecallAttempt(raw, changed), null);
});

test('a route change invalidates recall even when the final support position is identical', () => {
  const { session, order } = attemptFixture({ route: [{ x: 12, y: 0 }, { x: 13, y: 1 }] });
  const raw = storage.serializeReadSequenceRecallAttempt(session, { order });
  const changed = completed({ route: [{ x: 14, y: 0 }, { x: 13, y: 1 }] });
  assert.deepEqual(changed.third.point, session.third.point);
  assert.equal(storage.restoreReadSequenceRecallAttempt(raw, changed), null);
});

test('the separate changed-cue answer does not invalidate or mutate the watched-play binding', () => {
  const { session, order } = attemptFixture();
  const before = serializeReadSequence(session);
  const raw = storage.serializeReadSequenceRecallAttempt(session, { order });
  const compared = submitChangedCueRead(session, { action: 'carry', reason: 'The defender moved into the pass line.' });
  const comparedBefore = serializeReadSequence(compared);
  assert.equal(storage.serializeReadSequenceRecallAttempt(compared, { order }), raw);
  assert.equal(storage.restoreReadSequenceRecallAttempt(raw, compared).matchesPlay, true);
  assert.equal(serializeReadSequence(session), before);
  assert.equal(serializeReadSequence(compared), comparedBefore);
  assert.equal(Object.hasOwn(JSON.parse(raw).basis.reflection, 'changedCue'), false);
});

test('saved basis includes the actual recalled snapshots and captions without sharing caller objects', () => {
  const { session, recall, order } = attemptFixture();
  const before = serializeReadSequence(session);
  const raw = storage.serializeReadSequenceRecallAttempt(session, { order });
  const saved = JSON.parse(raw);
  assert.equal(saved.basis.scenarioId, session.scenarioId);
  assert.equal(saved.basis.pathId, recall.pathId);
  assert.deepEqual(saved.basis.cards, recall.cards.map(({ id, state, caption, description }) => ({ id, state, caption, description })));
  assert.deepEqual(saved.basis.reflection, JSON.parse(before));
  const restored = storage.restoreReadSequenceRecallAttempt(saved, session);
  order.reverse();
  saved.order[0] = 'changed outside';
  assert.deepEqual(restored.order, recall.chronologicalIds);
  restored.order[1] = 'changed after restore';
  assert.deepEqual(storage.restoreReadSequenceRecallAttempt(raw, session).order, recall.chronologicalIds);
  assert.equal(serializeReadSequence(session), before);
});

test('unfinished or malformed completed sessions cannot create or reopen an attempt', () => {
  const { session, order } = attemptFixture();
  const raw = storage.serializeReadSequenceRecallAttempt(session, { order });
  const malformed = [createReadSequenceSession(), { ...session, scenarioId: 'unknown' }];
  for (const change of [
    draft => { draft.first.reason = ''; },
    draft => { draft.third.reason = 'x'.repeat(601); },
    draft => { draft.third.actorId = 'G'; },
    draft => { draft.third.point.x = 99; },
  ]) {
    const draft = structuredClone(session);
    change(draft);
    malformed.push(draft);
  }
  for (const draft of malformed) {
    assert.throws(() => storage.serializeReadSequenceRecallAttempt(draft, { order }));
    assert.equal(storage.restoreReadSequenceRecallAttempt(raw, draft), null);
  }
});
