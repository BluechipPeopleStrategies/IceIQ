import test from 'node:test';
import assert from 'node:assert/strict';
import { createDraft, putKey, sampleDraft, setFrozen, validateDraft } from './director.js';
import { NHL_200X85_PROFILE } from '../scenario-engine/rinkFrame.js';
import * as routes from './directorRoutes.js';

const actorId = 'home-skater-1';

function routeApi() {
  assert.equal(typeof routes.createDirectorRoutePlan, 'function', 'createDirectorRoutePlan must exist');
  return routes.createDirectorRoutePlan;
}

function actorAt(draft, time, id = actorId) {
  return sampleDraft(draft, time).actors.find(actor => actor.id === id);
}

function close(actual, expected, message = '') {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${message}: ${actual} != ${expected}`);
}

function movingDraft() {
  let draft = { ...createDraft(1, 1), duration: 12 };
  for (const [time, x] of [[0, 0], [4, 4], [8, 8], [12, 12]]) {
    draft = putKey(draft, actorId, time, { x, y: 0, facing: 0 });
  }
  return draft;
}

test('route timing follows unequal segment distances and replaces all later keys with an endpoint hold', () => {
  const plan = routeApi();
  const draft = movingDraft();
  const result = plan(draft, { actorId, startTime: 2, endTime: 9, points: [{ x: 5, y: 0 }, { x: 5, y: 4 }] });
  assert.deepEqual(result.origin, { x: 2, y: 0, facing: 0 });
  assert.deepEqual(result.timedPoints, [{ time: 5, x: 5, y: 0, facing: 0 }, { time: 9, x: 5, y: 4, facing: 0 }]);
  assert.equal(result.distanceM, 7);
  assert.equal(result.replacedKeys, 3);
  assert.equal(result.actorLabel, 'H1');
  assert.equal(result.startTime, 2);
  assert.equal(result.endTime, 9);
  assert.deepEqual(result.draft.actors[0].keys.map(key => key.time), [0, 2, 5, 9]);
  for (const [time, x, y] of [[3, 3, 0], [6, 5, 1], [8, 5, 3], [9, 5, 4], [10, 5, 4], [12, 5, 4]]) {
    const actor = actorAt(result.draft, time);
    close(actor.x, x); close(actor.y, y);
    if (time >= 9) assert.deepEqual([actor.vx, actor.vy], [0, 0]);
  }
  assert.deepEqual(result.draft.actors[0].keys[0], draft.actors[0].keys[0]);
  assert.equal(validateDraft(result.draft).ok, true);
});

test('an exact sampled start anchor preserves every earlier position, velocity and facing during existing motion', () => {
  const plan = routeApi();
  let draft = createDraft(1, 1);
  draft = putKey(draft, actorId, 0, { x: -8, y: -3, facing: 350 * Math.PI / 180 });
  draft = putKey(draft, actorId, 6, { x: 10, y: 3, facing: 30 * Math.PI / 180 });
  for (const facingMode of ['keep', 'travel']) {
    const result = plan(draft, { actorId, startTime: 2.5, endTime: 7, points: [{ x: 4, y: 4 }, { x: -2, y: 6 }], facingMode });
    const original = actorAt(draft, 2.5);
    assert.deepEqual(result.origin, { x: original.x, y: original.y, facing: original.facing });
    assert.deepEqual(result.draft.actors[0].keys.find(key => key.time === 2.5), { time: 2.5, ...result.origin });
    for (let tick = 0; tick < 250; tick++) {
      const time = tick / 100;
      const before = actorAt(draft, time);
      const after = actorAt(result.draft, time);
      for (const field of ['x', 'y', 'vx', 'vy', 'facing']) close(after[field], before[field], `${field} at ${time}`);
      const oldPuck = sampleDraft(draft, time).puck;
      const newPuck = sampleDraft(result.draft, time).puck;
      for (const field of ['x', 'y', 'vx', 'vy']) close(newPuck[field], oldPuck[field], `puck ${field}`);
    }
  }
});

test('held first and held last poses remain still before the route, including non-normalized existing facing', () => {
  const plan = routeApi();
  for (const keys of [
    [{ time: 5, x: 3, y: 1, facing: 7 }],
    [{ time: 0, x: -2, y: 1, facing: 0 }, { time: 1, x: 3, y: 1, facing: 7 }],
  ]) {
    const draft = createDraft(1, 1);
    draft.actors[0].keys = keys;
    const result = plan(draft, { actorId, startTime: 2, endTime: 4, points: [{ x: 6, y: 2 }] });
    assert.equal(result.origin.facing, 7);
    for (let tick = 0; tick < 200; tick++) {
      const before = actorAt(draft, tick / 100);
      const after = actorAt(result.draft, tick / 100);
      for (const field of ['x', 'y', 'vx', 'vy']) close(after[field], before[field], `${field} at ${tick / 100}`);
      // Director normalizes interpolated angles but leaves held imported keys
      // raw. Their represented direction must remain exactly equivalent.
      close(Math.atan2(Math.sin(after.facing - before.facing), Math.cos(after.facing - before.facing)), 0);
    }
  }
});

test('keep preserves facing while travel uses incoming segment bearings after the exact start anchor', () => {
  const plan = routeApi();
  const draft = putKey(createDraft(1, 1), actorId, 0, { x: 0, y: 0, facing: Math.PI });
  const options = { actorId, startTime: 1, endTime: 7, points: [{ x: 3, y: 0 }, { x: 3, y: 3 }, { x: 0, y: 3 }] };
  const keep = plan(draft, options);
  assert.ok(keep.timedPoints.every(point => point.facing === Math.PI));
  const travel = plan(draft, { ...options, facingMode: 'travel' });
  assert.equal(travel.origin.facing, Math.PI);
  assert.deepEqual(travel.timedPoints.map(point => point.facing), [0, Math.PI / 2, Math.PI]);
  assert.equal(actorAt(travel.draft, 8).facing, Math.PI);
});

test('nonadjacent loopbacks remain valid and maximum-size routes stay at their final point', () => {
  const plan = routeApi();
  const draft = putKey(createDraft(1, 1), actorId, 0, { x: 0, y: 0, facing: 0 });
  const points = Array.from({ length: 12 }, (_, index) => ({ x: index % 2 ? 0 : 1, y: 0 }));
  const result = plan(draft, { actorId, startTime: 0, endTime: 6, points });
  assert.equal(result.distanceM, 12);
  assert.equal(result.timedPoints.length, 12);
  assert.equal(result.replacedKeys, 1);
  assert.equal(result.timedPoints[0].time, 0.5);
  assert.equal(result.timedPoints.at(-1).time, 6);
  assert.deepEqual([actorAt(result.draft, 8).x, actorAt(result.draft, 8).y], [0, 0]);
});

test('routing a carrier preserves possession and attachment while a non-owner route leaves puck playback untouched', () => {
  const plan = routeApi();
  const draft = movingDraft();
  for (const id of [actorId, 'away-skater-1']) {
    const result = plan(draft, { actorId: id, startTime: 2, endTime: 6, points: [{ x: 5, y: 5 }], facingMode: 'travel' });
    assert.deepEqual(result.draft.puck, draft.puck);
    for (const time of [0, 1, 2, 3, 6, 10, 12]) {
      const frame = sampleDraft(result.draft, time);
      if (id !== actorId) assert.deepEqual(frame.puck, sampleDraft(draft, time).puck);
      else {
        const owner = frame.actors.find(actor => actor.id === frame.puck.owner);
        close(frame.puck.x, owner.x + Math.cos(owner.facing) - Math.sin(owner.facing) * 0.7);
        close(frame.puck.y, owner.y + Math.sin(owner.facing) + Math.cos(owner.facing) * 0.7);
        assert.equal(frame.puck.owner, actorId);
      }
      assert.deepEqual(result.draft.actors.filter(actor => actor.id !== id), draft.actors.filter(actor => actor.id !== id));
    }
  }
});

test('unfrozen goalie routes use existing movement rules while frozen actors require explicit unfreezing', () => {
  const plan = routeApi();
  const draft = createDraft(1, 1);
  for (const id of [actorId, 'home-goalie-1']) {
    const options = { actorId: id, startTime: 1, endTime: 3, points: [{ x: -20, y: 2 }] };
    const result = plan(draft, options);
    assert.equal(validateDraft(result.draft).ok, true);
    assert.deepEqual(result.draft.puck, draft.puck);
    const frozen = setFrozen(draft, id, true, 1);
    const before = structuredClone(frozen);
    assert.throws(() => plan(frozen, options), /unfreeze|frozen/i);
    assert.deepEqual(frozen, before);
    assert.equal(plan(setFrozen(frozen, id, false), options).draft.actors.find(actor => actor.id === id).frozen, false);
  }
});

test('malformed, sparse, duplicate and off-rink destinations are rejected without silently clamping', () => {
  const plan = routeApi();
  const draft = putKey(createDraft(1, 1), actorId, 0, { x: 0, y: 0, facing: 0 });
  const { maxX, maxY } = NHL_200X85_PROFILE.bounds;
  const invalid = [null, {}, [], Array(2), [{ x: 1, y: 1 }, , { x: 3, y: 3 }], [null], [[1, 2]], [{ x: '1', y: 1 }], [{ x: 1 }],
    [{ x: NaN, y: 0 }], [{ x: 0, y: Infinity }], [{ x: maxX + 1, y: 0 }], [{ x: maxX, y: maxY }],
    [{ x: 0, y: 0 }], [{ x: 1, y: 1 }, { x: 1, y: 1 }], Array.from({ length: 13 }, (_, index) => ({ x: index % 2, y: 1 }))];
  for (const points of invalid) assert.throws(() => plan(draft, { actorId, startTime: 0, endTime: 4, points }));
  const boundary = plan(draft, { actorId, startTime: 0, endTime: 4, points: [{ x: maxX, y: 0 }] });
  assert.equal(boundary.timedPoints[0].x, maxX);
  assert.deepEqual(draft.actors[0].keys, [{ time: 0, x: 0, y: 0, facing: 0 }]);
});

test('invalid times and facing modes fail while the editorial minimum interval is accepted', () => {
  const plan = routeApi();
  const draft = createDraft(1, 1);
  const valid = { actorId, startTime: 0, endTime: 1, points: [{ x: 0, y: 0 }] };
  for (const [startTime, endTime] of [[-1, 1], [0, 9], [1, 1], [2, 1], [0, 0.049], [NaN, 1], [0, Infinity], ['0', 1], [0, '1']]) {
    assert.throws(() => plan(draft, { ...valid, startTime, endTime }));
  }
  for (const facingMode of ['other', null, false, 0]) assert.throws(() => plan(draft, { ...valid, facingMode }));
  assert.equal(plan(draft, { ...valid, endTime: 0.05 }).timedPoints[0].time, 0.05);
  assert.equal(plan(draft, { ...valid, startTime: 1.1, endTime: 1.15 }).timedPoints[0].time, 1.15);
  assert.equal(plan(draft, { ...valid, startTime: 7, endTime: 8 }).endTime, 8);
});

test('nanosecond destination and anchor collisions are rejected instead of silently merging keys', () => {
  const plan = routeApi();
  const draft = putKey(createDraft(1, 1), actorId, 0, { x: 0, y: 0, facing: 0 });
  assert.throws(() => plan(draft, { actorId, startTime: 0, endTime: 1, points: [{ x: 1e-12, y: 0 }, { x: 1, y: 0 }] }), /time|short|close/i);
  assert.throws(() => plan(draft, { actorId, startTime: 0, endTime: 1, points: [{ x: 1, y: 0 }, { x: 1 + 1e-12, y: 0 }] }), /time|short|close/i);
  assert.throws(() => plan(draft, { actorId, startTime: 5e-10, endTime: 1, points: [{ x: 1, y: 0 }] }), /time|short|close/i);
});

test('invalid draft identity, actors and key limits fail before producing a route plan', () => {
  const plan = routeApi();
  const draft = createDraft(1, 1);
  const options = { actorId, startTime: 1, endTime: 3, points: [{ x: 0, y: 0 }] };
  for (const bad of [null, {}, { ...draft, version: 'other' }, { ...draft, puck: { owner: 'home-goalie-1' } }]) assert.throws(() => plan(bad, options));
  assert.throws(() => plan(draft, { ...options, actorId: 'unknown' }));
  const crowded = createDraft(1, 1);
  crowded.actors[0].keys = Array.from({ length: 2401 }, (_, index) => ({ time: index / 1000, x: 0, y: 0, facing: 0 }));
  assert.equal(validateDraft(crowded).ok, true);
  assert.throws(() => plan(crowded, { ...options, startTime: 3, endTime: 4, points: [{ x: 1, y: 0 }] }), /2401|keys/i);
});

test('plans, summaries and JSON round-trips do not alias the source draft, points or each other', () => {
  const plan = routeApi();
  const draft = movingDraft();
  draft.sourceRef = { id: 'source-play', nodeId: 'choice', note: 'Coach-authored example', extra: { notes: ['keep'] } };
  const before = structuredClone(draft);
  const points = [{ x: 5, y: 0 }, { x: 5, y: 4 }];
  const result = plan(draft, { actorId, startTime: 2, endTime: 9, points });
  assert.deepEqual(draft, before);
  assert.deepEqual(result.draft.sourceRef, draft.sourceRef);
  assert.equal(result.draft.status, 'development-not-validated');
  const restored = JSON.parse(JSON.stringify(result.draft));
  assert.equal(validateDraft(restored).ok, true);
  for (const time of [0, 1, 2, 3, 5, 7, 9, 12]) assert.deepEqual(sampleDraft(restored, time), sampleDraft(result.draft, time));
  result.origin.x = 99;
  result.timedPoints[0].x = 99;
  result.draft.sourceRef.extra.notes.push('changed');
  result.draft.actors[1].keys[0].x = 99;
  points[1].y = 99;
  assert.deepEqual(draft, before);
  assert.equal(result.draft.actors[0].keys.find(key => key.time === 2).x, 2);
  assert.equal(result.draft.actors[0].keys.find(key => key.time === 5).x, 5);
  assert.equal(result.draft.actors[0].keys.at(-1).y, 4);
});
