import test from 'node:test';
import assert from 'node:assert/strict';
import * as core from './readSequenceCore.js';
import { createReadSequenceRecall, checkReadSequenceRecallOrder } from './readSequenceRecall.js';
import { getReadSequenceRecallStorageKey, serializeReadSequenceRecallAttempt, restoreReadSequenceRecallAttempt } from './readSequenceRecallStorage.js';
import { NHL_200X85_PROFILE } from '../scenario-engine/rinkFrame.js';

const id = 'u13-lane-switch-three-reads-v1';
const reason = 'I noticed D1, the goalie and the space across the ice.';
const paths = [
  ['carry', 'pass-f2', 'F2', 'F1', 21, 5, [[21, 5], [22, -4.5], [24, 3], [25, -0.4]]],
  ['carry', 'outside-space', 'F1', 'F2', 22, -4, [[22, 6.5], [22, -4], [24, 3.5], [25, 2]]],
  ['shoot', 'inside-support', null, 'F1', 19, 4.6, [[19, 4.6], [22, -1], [20, 0.4], [25, 2]]],
  ['shoot', 'wide-support', null, 'F1', 19, 4.6, [[19, 4.6], [20, -5], [20, 0.4], [25, 2]]],
];

function definition() {
  assert.ok(core.U13_READ_SEQUENCE, 'A separate U13 scenario must be exported');
  return core.U13_READ_SEQUENCE;
}

function reachReadTwo(action, scenarioId = id) {
  return core.advanceSequencePlayback(core.submitFirstRead(core.createReadSequenceSession(scenarioId), { action, reason }), 1);
}

function reachReadThree(action, targetId, scenarioId = id) {
  return core.advanceSequencePlayback(core.selectSecondRead(reachReadTwo(action, scenarioId), targetId), 1);
}

function complete(action, targetId, scenarioId = id) {
  return core.submitThirdRead(core.moveThirdReadActor(reachReadThree(action, targetId, scenarioId), { x: 18, y: 7 }), reason);
}

function distanceToSegment(point, from, to) {
  const dx = to.x - from.x, dy = to.y - from.y;
  const progress = Math.max(0, Math.min(1, ((point.x - from.x) * dx + (point.y - from.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(point.x - from.x - progress * dx, point.y - from.y - progress * dy);
}

test('U13 registers its own Shoot/Carry worked comparison and retains the U11 default', () => {
  const u13 = definition();
  assert.equal(u13.id, id);
  assert.equal(u13.ageBand, 'U13');
  assert.equal(u13.status, 'draft-for-coach-review');
  assert.deepEqual(u13.actions, ['shoot', 'carry']);
  assert.deepEqual(Object.keys(u13.branches).sort(), ['carry', 'shoot']);
  assert.strictEqual(core.getReadSequenceDefinition(id), u13);
  assert.strictEqual(core.getReadSequenceDefinition(), core.U11_READ_SEQUENCE);
  assert.deepEqual(core.READ_SEQUENCE_CATALOG.map(item => item.ageBand), ['U9', 'U11', 'U13']);
  assert.equal(u13.ui.ageLabel, 'Read the lane switch');
  assert.match(u13.ui.intro, /example|compare/i);
  assert.match(u13.ui.intro, /shoot[\s\S]*loose|loose[\s\S]*shoot/i);
  assert.match(u13.ui.intro, /carry[\s\S]*lane|lane[\s\S]*carry/i);
  assert.match(u13.ui.note, /shoot/i);
  assert.match(u13.ui.note, /carry/i);
  assert.deepEqual(Object.keys(u13.ui.actionCopy).sort(), ['carry', 'shoot']);
  assert.deepEqual(u13.sourceRefs.map(source => source.note), [
    'docs/library/odd-man-reads.md', 'docs/library/two-on-one-pass-lane-removed.md',
    'docs/library/two-on-one-support-too-flat.md', 'docs/library/off-puck-support-offense.md',
    'src/data/curriculum-ledger.json',
  ]);
});

test('the actual offset puck shows D1 switching from the pass lane to the shot lane after Carry', () => {
  const u13 = definition();
  const opening = u13.initialState;
  const carry = u13.branches.carry.state;
  const goal = { x: NHL_200X85_PROFILE.landmarks.goalLineRight[0], y: 0 };
  assert.deepEqual(opening.puck, { owner: 'F1', x: 18, y: 5.7 });
  assert.deepEqual(carry.puck, { owner: 'F1', x: 21, y: 5.7 });
  const actor = (state, actorId) => state.actors.find(item => item.id === actorId);
  assert.ok(distanceToSegment(actor(opening, 'D1'), opening.puck, actor(opening, 'F2')) < 1e-9);
  assert.ok(distanceToSegment(actor(opening, 'D1'), opening.puck, goal) > 4.5);
  assert.ok(distanceToSegment(actor(carry, 'D1'), carry.puck, goal) < 0.5);
  assert.ok(distanceToSegment(actor(carry, 'D1'), carry.puck, actor(carry, 'F2')) > 2.5);
  assert.ok(actor(carry, 'F2').x > actor(opening, 'F2').x + 4);
  assert.ok(actor(carry, 'G').y > actor(opening, 'G').y + 2);
  assert.deepEqual(opening.actors.map(item => item.label), ['YOU', 'F2', 'D1', 'G']);
  for (const state of [opening, ...Object.values(u13.branches).flatMap(branch => [branch.state, ...branch.read2.targets.map(target => target.state)])]) {
    assert.ok(state.actors.every(item => item.x > NHL_200X85_PROFILE.landmarks.blueLineRightMid[0]));
    assert.doesNotThrow(() => core.stateToStaticDirectorDraft(state));
    const goalie = actor(state, 'G');
    assert.equal(goalie.facing, Math.atan2(state.puck.y - goalie.y, state.puck.x - goalie.x));
  }
});

test('all four branches preserve their own authored states, puck context and final support actor', () => {
  definition();
  for (const [action, targetId, owner, mover, x, y, positions] of paths) {
    const readThree = reachReadThree(action, targetId);
    const state = core.currentSequenceState(readThree);
    assert.deepEqual(state.actors.map(actor => [actor.x, actor.y]), positions);
    assert.equal(state.puck.owner, owner);
    assert.equal(readThree.third.actorId, mover);
    assert.deepEqual(core.getSelectedSecondTarget(readThree).state, state);
    if (owner === null) assert.deepEqual(state.puck, { owner: null, x: 23.2, y: 3.2 });
    const before = structuredClone(readThree);
    const moved = core.moveThirdReadActor(readThree, { x: 18, y: 7 });
    const after = core.currentSequenceState(moved);
    assert.deepEqual(readThree, before);
    assert.deepEqual(after.puck, state.puck);
    assert.deepEqual(after.actors.filter(actor => actor.id !== mover), state.actors.filter(actor => actor.id !== mover));
    const route = core.getThirdReadRoute(core.setThirdReadRoute(readThree, [{ x: x + 1, y }, { x: x + 1, y: y - 1 }]));
    assert.deepEqual(route[0], { x, y });
  }
});

test('opening Pass and targets from other branches or age scenarios fail closed', () => {
  definition();
  const opening = core.createReadSequenceSession(id);
  const before = structuredClone(opening);
  for (const action of ['pass', 'unknown', null]) assert.throws(() => core.submitFirstRead(opening, { action, reason }));
  assert.deepEqual(opening, before);
  for (const [action, wrongTargets] of [['carry', ['inside-support', 'wide-support', 'return-lane']], ['shoot', ['pass-f2', 'outside-space', 'rebound-space']]]) {
    const session = reachReadTwo(action);
    for (const target of wrongTargets) assert.throws(() => core.selectSecondRead(session, target));
  }
});

test('Carry retains possession and its pass clears D1 visually while Shoot stays short of the goalie', () => {
  const u13 = definition();
  const shotCopy = [u13.branches.shoot.consequence, ...u13.branches.shoot.read2.targets.map(target => target.summary)].join(' ');
  assert.doesNotMatch(shotCopy, /\b(goal|scored|save[ds]?|rebound\w*|recover\w*)\b/i);
  assert.match(shotCopy, /short of the goalie/i);
  const first = action => core.submitFirstRead(core.createReadSequenceSession(id), { action, reason });
  const carry = first('carry');
  const shot = first('shoot');
  const pass = core.selectSecondRead(reachReadTwo('carry'), 'pass-f2');
  for (let step = 0; step <= 100; step++) {
    const progress = step / 100;
    assert.equal(core.currentSequenceState(core.advanceSequencePlayback(carry, progress)).puck.owner, 'F1');
    const shotState = core.currentSequenceState(core.advanceSequencePlayback(shot, progress));
    assert.equal(shotState.puck.owner, null);
    assert.ok(shotState.puck.x < shotState.actors.find(actor => actor.id === 'G').x);
    const passState = core.currentSequenceState(core.advanceSequencePlayback(pass, progress));
    const defender = passState.actors.find(actor => actor.id === 'D1');
    assert.ok(Math.hypot(passState.puck.x - defender.x, passState.puck.y - defender.y) > 2);
  }
});

test('U13 route and point reflections restore only in their own scenario and replay leaves answers intact', () => {
  definition();
  for (const [action, targetId, , , x, y] of paths) {
    const third = reachReadThree(action, targetId);
    const routed = core.submitThirdRead(core.setThirdReadRoute(third, [{ x: x + 1, y }, { x: x + 1, y: y - 1 }]), reason);
    for (const session of [complete(action, targetId), routed]) {
      const raw = core.serializeReadSequence(session);
      const restored = core.restoreReadSequence(raw, id);
      assert.deepEqual(restored, session);
      assert.equal(core.restoreReadSequence(raw), null);
      assert.equal(core.restoreReadSequence(raw, core.U9_READ_SEQUENCE.id), null);
      assert.equal(core.serializeReadSequence(core.advanceSequencePlayback(core.replayFirstConsequence(restored), 1)), raw);
      assert.equal(JSON.parse(raw).scenarioId, id);
      assert.deepEqual(JSON.parse(raw).first, { action, reason });
    }
    const malformed = JSON.parse(core.serializeReadSequence(routed));
    malformed.third.route[0].x += 1;
    assert.equal(core.restoreReadSequence(malformed, id), null);
    malformed.third.route[0].x -= 1;
    malformed.third.point.y += 1;
    assert.equal(core.restoreReadSequence(malformed, id), null);
  }
  assert.equal(core.restoreReadSequence(core.serializeReadSequence(complete('pass', 'return-lane', core.U11_READ_SEQUENCE.id)), id), null);
  assert.equal(core.restoreReadSequence(core.serializeReadSequence(complete('pass', 'return-pass', core.U9_READ_SEQUENCE.id)), id), null);
});

test('U13 recall reconstructs the actual three freezes, never substitutes Carry for Shoot, and uses YOU grammar', () => {
  const u13 = definition();
  for (const [action, targetId, owner] of paths) {
    const session = complete(action, targetId);
    const raw = core.serializeReadSequence(session);
    const recall = createReadSequenceRecall(session);
    const target = u13.branches[action].read2.targets.find(item => item.id === targetId);
    assert.equal(recall.scenarioId, id);
    assert.equal(recall.ageBand, 'U13');
    assert.equal(recall.fixedOpening, false);
    assert.deepEqual(recall.cards.map(card => card.state), [u13.initialState, u13.branches[action].state, target.state]);
    assert.deepEqual(recall.cards.map(card => card.state.puck.owner), ['F1', action === 'carry' ? 'F1' : null, owner]);
    for (const card of recall.cards) {
      assert.doesNotMatch(`${card.caption} ${card.description}`, /\b(F1|before|first|second|final|next|goal|scored|save[ds]?|rebound\w*|recover\w*)\b/i);
      assert.doesNotMatch(`${card.caption} ${card.description}`, /\bYOU (has|is|carries)\b/);
      if (card.state.puck.owner === null) assert.match(card.description, /loose/i);
    }
    const [a, b, c] = recall.chronologicalIds;
    for (const order of [[a,b,c], [a,c,b], [b,a,c], [b,c,a], [c,a,b], [c,b,a]]) {
      assert.deepEqual(checkReadSequenceRecallOrder(recall, order), { matchesPlay: order[0] === a && order[1] === b });
    }
    const saved = serializeReadSequenceRecallAttempt(session, { order: recall.initialOrder, reason: 'My recall note', usedAnswer: true });
    assert.deepEqual(restoreReadSequenceRecallAttempt(saved, core.restoreReadSequence(raw, id)), { order: recall.initialOrder, reason: 'My recall note', usedAnswer: true, matchesPlay: false });
    assert.equal(restoreReadSequenceRecallAttempt(saved, complete('pass', 'return-lane', core.U11_READ_SEQUENCE.id)), null);
    assert.equal(core.serializeReadSequence(session), raw);
    assert.deepEqual(createReadSequenceRecall(core.advanceSequencePlayback(core.replayFirstConsequence(session), 1)), recall);
  }
});

test('U13 storage is age-separated and optional AI or changed-cue reviews remain unavailable', () => {
  definition();
  const session = complete('carry', 'pass-f2');
  const keys = core.READ_SEQUENCE_CATALOG.map(item => core.getReadSequenceStorageKey('same player', item.id));
  assert.equal(new Set(keys).size, 3);
  assert.equal(core.getReadSequenceStorageKey('same player', id), `rinkreads_read_sequence_v1:same%20player:${id}`);
  assert.equal(getReadSequenceRecallStorageKey('same player', id), `rinkreads_read_sequence_v1:same%20player:${id}:recall`);
  assert.throws(() => core.createFinalReadJudgePayload(session), /not supported/i);
  assert.throws(() => core.getChangedCueComparison(session), /does not include/i);
  assert.throws(() => core.submitChangedCueRead(session, { action: 'carry', reason }), /does not include/i);
  const saved = JSON.parse(core.serializeReadSequence(session));
  saved.changedCue = { id: 'd1-pass-lane-v1', action: 'carry', reason };
  assert.equal(core.restoreReadSequence(saved, id), null);
});
