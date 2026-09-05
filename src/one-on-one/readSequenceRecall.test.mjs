import test from 'node:test';
import assert from 'node:assert/strict';
import * as core from './readSequenceCore.js';
import * as recall from './readSequenceRecall.js';

const u9 = 'u9-connected-support-three-reads-v1';
const u11 = 'u11-connected-2v1-three-reads-v1';
const reason = 'I noticed the puck, defender and space.';
const paths = [
  [u9, 'pass', 'return-pass', ['F1', 'F2', 'F1'], 'F2', 18.5, -4],
  [u9, 'pass', 'carry-space', ['F1', 'F2', 'F2'], 'F1', 16, 4],
  [u9, 'carry', 'pass-teammate', ['F1', 'F1', 'F2'], 'F1', 17.5, 6],
  [u9, 'carry', 'keep-puck', ['F1', 'F1', 'F1'], 'F2', 18, -4],
  [u11, 'pass', 'return-lane', ['F1', 'F2', 'F1'], 'F2', 17.1, -3.5],
  [u11, 'pass', 'hold-wide', ['F1', 'F2', 'F2'], 'F1', 15.4, 2.3],
  [u11, 'pass', 'shoot-open', ['F1', 'F2', null], 'F1', 14.8, 2.5],
  [u11, 'shoot', 'rebound-space', ['F1', null, null], 'F1', 14.6, 2.4],
  [u11, 'shoot', 'high-support', ['F1', null, null], 'F1', 14.6, 2.5],
  [u11, 'carry', 'support-middle', ['F1', 'F1', 'F2'], 'F1', 18, 5.4],
  [u11, 'carry', 'attack-outside', ['F1', 'F1', 'F1'], 'F2', 15.4, -3.1],
];

function api(name) {
  assert.equal(typeof recall[name], 'function', `${name} must exist`);
  return recall[name];
}

function readThree([scenarioId, action, targetId]) {
  const first = core.submitFirstRead(core.createReadSequenceSession(scenarioId), { action, reason });
  return core.advanceSequencePlayback(core.selectSecondRead(core.advanceSequencePlayback(first, 1), targetId), 1);
}

function complete(path, point = { x: 12, y: 1 }) {
  return core.submitThirdRead(core.moveThirdReadActor(readThree(path), point), reason);
}

test('recall derives exactly three actual authored freezes with recall copy for all eleven paths', () => {
  const create = api('createReadSequenceRecall');
  for (const path of paths) {
    const [scenarioId, action, targetId, owners, actorId, x, y] = path;
    const session = complete(path);
    const result = create(session);
    const definition = core.getReadSequenceDefinition(scenarioId);
    const branch = definition.branches[action];
    const target = branch.read2.targets.find(item => item.id === targetId);
    assert.equal(result.scenarioId, scenarioId);
    assert.equal(result.pathId, `${scenarioId}:${action}:${targetId}`);
    assert.equal(result.ageBand, definition.ageBand);
    assert.equal(result.cards.length, 3);
    assert.equal(new Set(result.cards.map(card => card.id)).size, 3);
    assert.ok(result.cards.every(card => card.id.startsWith(`${result.pathId}:`)));
    assert.deepEqual(result.cards.map(card => card.state.puck.owner), owners);
    assert.deepEqual(result.cards[0].state, definition.initialState);
    assert.deepEqual(result.cards[1].state, branch.state);
    assert.deepEqual(result.cards[2].state, target.state);
    assert.equal(result.cards[2].state.actors.find(actor => actor.id === actorId).x, x);
    assert.equal(result.cards[2].state.actors.find(actor => actor.id === actorId).y, y);
    assert.ok(result.cards.every(card => typeof card.caption === 'string' && card.caption && typeof card.description === 'string' && card.description));
    assert.deepEqual(result.sourceRefs, definition.sourceRefs);
    assert.equal(result.fixedOpening, scenarioId === u9);
    const [a, b, c] = result.chronologicalIds;
    assert.deepEqual(result.cards.map(card => card.id), [a, b, c]);
    assert.deepEqual(result.initialOrder, scenarioId === u9 ? [a, c, b] : [b, c, a]);
    assert.notDeepEqual(result.initialOrder, result.chronologicalIds);
    assert.deepEqual(create(session), result, 'Creating recall again cannot reshuffle a rendered task');
  }
});

test('recall text does not reveal phase order, ask for a fresh move or invent a puck outcome', () => {
  for (const path of paths) {
    const result = recall.createReadSequenceRecall(complete(path));
    for (const card of result.cards) {
      const text = `${card.caption} ${card.description}`;
      assert.doesNotMatch(text, /\b(before|first|second|final|now|next)\b/i, card.id);
      assert.doesNotMatch(text, /\b(move|tap|choose|select|place)\s+(your|the|a)\b/i, card.id);
      assert.doesNotMatch(text, /\b(goal|scored|save[ds]?|recover\w*|rebound\w*)\b/i, card.id);
      if (path[0] === u9) assert.doesNotMatch(text, /\b(F1|F2|D1|G)\b/, card.id);
      if (card.state.puck.owner === null) assert.match(text, /\bloose\b/i, card.id);
    }
  }
});

test('recall rejects incomplete, replaying, corrupt and cross-scenario sessions', () => {
  const create = api('createReadSequenceRecall');
  const good = complete(paths[0]);
  const first = core.submitFirstRead(core.createReadSequenceSession(u9), { action: 'pass', reason });
  const second = core.advanceSequencePlayback(first, 1);
  const candidates = [
    null, {}, core.createReadSequenceSession(u9), first, second,
    core.selectSecondRead(second, 'return-pass'), readThree(paths[0]),
    core.replayFirstConsequence(good),
    core.advanceSequencePlayback(core.replayFirstConsequence(good), 0.5),
    { ...good, scenarioId: 'unknown' }, { ...good, scenarioId: null },
    { ...good, scenarioId: u11 }, { ...good, version: 'unknown' },
    { ...good, first: { action: 'shoot', reason } },
    { ...good, second: { targetId: 'keep-puck' } },
    { ...good, third: { ...good.third, reason: '' } },
    { ...good, third: { ...good.third, actorId: 'D1' } },
    { ...good, third: { ...good.third, route: [] } },
  ];
  for (const candidate of candidates) assert.throws(() => create(candidate));
});

test('only chronological permutations match and U9 keeps the opening fixed across every path', () => {
  const create = api('createReadSequenceRecall');
  const check = api('checkReadSequenceRecallOrder');
  for (const path of paths) {
    const result = create(complete(path));
    const [a, b, c] = result.chronologicalIds;
    for (const order of [[a, b, c], [a, c, b], [b, a, c], [b, c, a], [c, a, b], [c, b, a]]) {
      if (result.fixedOpening && order[0] !== a) assert.throws(() => check(result, order), /opening/i);
      else assert.deepEqual(check(result, order), { matchesPlay: order[0] === a && order[1] === b && order[2] === c });
    }
  }
});

test('order checking rejects duplicate, missing, foreign and forged path IDs instead of marking them as a recall answer', () => {
  const create = api('createReadSequenceRecall');
  const check = api('checkReadSequenceRecallOrder');
  const result = create(complete(paths[4]));
  const [a, b, c] = result.chronologicalIds;
  const other = create(complete(paths[5]));
  const sparseOrder = [a, b, c];
  delete sparseOrder[2];
  for (const order of [null, {}, [], [a, b], [a, b, c, a], [a, a, c], [a, b, null], [a, b, 'unknown'], sparseOrder, other.chronologicalIds]) {
    assert.throws(() => check(result, order));
  }
  assert.throws(() => check({ ...result, pathId: other.pathId }, [a, b, c]));
  assert.throws(() => check({ ...result, chronologicalIds: [b, a, c] }, [b, a, c]));
  assert.throws(() => check({ ...result, scenarioId: u9 }, [a, b, c]));
  assert.throws(() => check({ ...result, ageBand: 'U9' }, [a, b, c]));
  assert.throws(() => check({ ...result, fixedOpening: true }, [a, b, c]));
  assert.throws(() => check({ ...result, cards: [result.cards[0], result.cards[0], result.cards[2]] }, [a, b, c]));
  const sparseCards = [...result.cards];
  delete sparseCards[1];
  assert.throws(() => check({ ...result, cards: sparseCards }, [a, b, c]));
  assert.throws(() => check({ ...result, chronologicalIds: sparseOrder }, [a, b, c]));
});

test('moving recall cards swaps adjacent positions, clamps boundaries and never moves the fixed U9 opening', () => {
  const create = api('createReadSequenceRecall');
  const move = api('moveReadSequenceRecallCard');
  for (const path of paths) {
    const result = create(complete(path));
    const [a, b, c] = result.chronologicalIds;
    const start = result.initialOrder;
    const snapshot = structuredClone(result);
    if (result.fixedOpening) {
      assert.deepEqual(move(result, start, b, -1), [a, b, c]);
      assert.deepEqual(move(result, start, c, -1), start);
      assert.deepEqual(move(result, start, a, 1), start);
      assert.deepEqual(move(result, start, a, -1), start);
    } else {
      assert.deepEqual(move(result, [a, b, c], a, 1), [b, a, c]);
      assert.deepEqual(move(result, [a, b, c], c, -1), [a, c, b]);
      assert.deepEqual(move(result, [a, b, c], a, -1), [a, b, c]);
    }
    assert.deepEqual(move(result, [a, b, c], c, 1), [a, b, c]);
    assert.notStrictEqual(move(result, start, start.at(-1), 1), start);
    assert.deepEqual(result, snapshot);
    for (const direction of [0, 2, -2, null, '-1']) assert.throws(() => move(result, start, b, direction));
    assert.throws(() => move(result, start, 'unknown', -1));
    assert.throws(() => move(result, [a, a, c], a, 1));
  }
});

test('recall outputs are independent clones and cannot alter sessions, other cards or source definitions', () => {
  const create = api('createReadSequenceRecall');
  for (const path of paths) {
    const session = complete(path);
    const before = structuredClone(session);
    const definition = core.getReadSequenceDefinition(session.scenarioId);
    const sourceBefore = structuredClone(definition);
    const result = create(session);
    const untouched = structuredClone(result.cards[1]);
    result.cards[0].state.actors[0].x = 999;
    result.cards[0].state.puck.x = 999;
    result.sourceRefs[0].note = 'changed';
    result.initialOrder[0] = 'changed';
    assert.deepEqual(session, before);
    assert.deepEqual(definition, sourceBefore);
    assert.deepEqual(result.cards[1], untouched);
    assert.equal(result.chronologicalIds[0], result.cards[0].id);
    assert.deepEqual(create(session).cards[0].state, definition.initialState);
  }
});

test('unchanged support, loop routes, changed cues and replay never become extra chronology or alter existing saved and AI data', () => {
  const create = api('createReadSequenceRecall');
  const check = api('checkReadSequenceRecallOrder');
  const move = api('moveReadSequenceRecallCard');
  for (const path of paths) {
    const [, , , , actorId, x, y] = path;
    const third = readThree(path);
    const unchanged = complete(path, { x, y });
    const loop = core.submitThirdRead(core.setThirdReadRoute(third, [{ x: x + 1, y }, { x, y }]), reason);
    const versions = [unchanged, complete(path), loop];
    if (path[0] === u11) versions.push(core.submitChangedCueRead(loop, { action: 'carry', reason }));
    const expected = create(unchanged);
    for (const session of versions) {
      const raw = core.serializeReadSequence(session);
      const ai = path[0] === u11 ? core.createFinalReadJudgePayload(session) : null;
      const result = create(session);
      assert.deepEqual(result, expected);
      assert.equal(result.cards[2].state.actors.find(actor => actor.id === actorId).x, x);
      assert.equal(result.cards[2].state.actors.find(actor => actor.id === actorId).y, y);
      check(result, result.chronologicalIds);
      move(result, result.initialOrder, result.initialOrder.at(-1), -1);
      assert.equal(core.serializeReadSequence(session), raw);
      if (ai) assert.deepEqual(core.createFinalReadJudgePayload(session), ai);
      else assert.throws(() => core.createFinalReadJudgePayload(session), /not supported/);
      const restored = core.restoreReadSequence(raw, session.scenarioId);
      assert.deepEqual(create(restored), result);
      const firstReplay = core.advanceSequencePlayback(core.replayFirstConsequence(restored), 1);
      assert.deepEqual(create(core.advanceSequencePlayback(firstReplay, 1)), result);
    }
    const legacy = JSON.parse(core.serializeReadSequence(loop));
    delete legacy.third.route;
    assert.deepEqual(create(core.restoreReadSequence(legacy, path[0])), expected);
  }
});
