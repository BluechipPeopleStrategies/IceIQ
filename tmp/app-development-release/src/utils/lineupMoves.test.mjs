import test from 'node:test';
import assert from 'node:assert/strict';
import { moveLineupPlayer } from './lineupMoves.js';
import { DEPTH_SLOTS, getDepthChart, moveAssignment, setAssignment } from './depthChart.js';

const slotIds = DEPTH_SLOTS.map(slot => slot.id), rosterIds = Array.from({ length: 20 }, (_, index) => `player-${index}`);
const chart = Object.fromEntries(slotIds.map((slot, index) => [rosterIds[index], slot]));
const context = { slotIds, rosterIds };
test('every roster player can move to every slot or bench without duplicate positions or disappearing from roster accounting', () => {
  const before = JSON.stringify(chart);
  for (const playerId of rosterIds) for (const target of [...slotIds, null]) {
    const result = moveLineupPlayer(chart, playerId, target, context), assigned = Object.values(result.chart).filter(slot => slotIds.includes(slot));
    assert.equal(new Set(assigned).size, assigned.length);
    assert.equal(result.chart[playerId] || null, target);
    assert.equal(rosterIds.filter(id => slotIds.includes(result.chart[id])).length + rosterIds.filter(id => !slotIds.includes(result.chart[id])).length, rosterIds.length);
    if (result.displacedId) assert.equal(result.chart[result.displacedId] || null, chart[playerId] || null);
    for (const id of rosterIds.filter(id => id !== playerId && id !== result.displacedId)) assert.equal(result.chart[id], chart[id]);
  }
  assert.equal(JSON.stringify(chart), before);
});

test('empty positions, same-slot drops, bench replacements and stale roster/target failures are explicit', () => {
  const empty = moveLineupPlayer({ a: '1-LW' }, 'a', '1-C', { slotIds, rosterIds: ['a', 'b'] }); assert.deepEqual(empty.chart, { a: '1-C' });
  assert.equal(moveLineupPlayer(empty.chart, 'a', '1-C', { slotIds, rosterIds: ['a', 'b'] }).changed, false);
  assert.deepEqual(moveLineupPlayer(empty.chart, 'b', '1-C', { slotIds, rosterIds: ['a', 'b'] }).chart, { b: '1-C' });
  assert.throws(() => moveLineupPlayer(chart, 'unknown', '1-C', context), /no longer/);
  assert.throws(() => moveLineupPlayer(chart, rosterIds[0], 'invalid', context), /Choose/);
  assert.throws(() => moveLineupPlayer({ a: '1-C', b: '1-C' }, 'a', '1-LW', { slotIds, rosterIds: ['a', 'b'] }), /share/);
  assert.deepEqual(moveLineupPlayer({ a: '1-C', b: '1-C' }, 'a', null, { slotIds, rosterIds: ['a', 'b'] }).chart, { b: '1-C' });
});

test('a swap persists once in the existing chart store, preserves other teams and the existing API, and quota failure retains original bytes', () => {
  const previous = globalThis.window, saved = new Map(), writes = []; let fail = false;
  globalThis.window = { localStorage: { getItem: key => saved.get(key) ?? null, setItem(key, value) { if (fail && key === 'rinkreads_depth_charts_v1') throw Error('Quota'); saved.set(key, value); writes.push(key); } } };
  try {
    setAssignment('other-team', 'other', 'G-S');
    setAssignment('team', 'a', '1-LW'); setAssignment('team', 'b', '1-C'); writes.length = 0;
    const result = moveAssignment('team', 'a', '1-C', ['a', 'b']);
    assert.equal(result.ok, true); assert.deepEqual(getDepthChart('team'), { a: '1-C', b: '1-LW' }); assert.deepEqual(getDepthChart('other-team'), { other: 'G-S' });
    assert.equal(writes.filter(key => key === 'rinkreads_depth_charts_v1').length, 1); assert.equal(saved.get('rinkreads_depth_chart_set_v1'), '1');
    const before = saved.get('rinkreads_depth_charts_v1'); fail = true;
    const failed = moveAssignment('team', 'a', 'G-B', ['a', 'b']); assert.equal(failed.ok, false); assert.match(failed.message, /could not be saved/);
    assert.equal(saved.get('rinkreads_depth_charts_v1'), before); assert.deepEqual(getDepthChart('team'), { a: '1-C', b: '1-LW' });
  } finally { if (previous === undefined) delete globalThis.window; else globalThis.window = previous; }
});
