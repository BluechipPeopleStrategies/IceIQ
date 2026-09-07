import test from 'node:test';
import assert from 'node:assert/strict';
import { journeyStops, missionProgressKey, readVisitedMissionIds, recordMissionVisit, summarizeMissionProgress } from './worldMissionProgress.js';

function storage() {
  const data = new Map();
  return { data, getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
}

const missions = [{ id: 'one', title: 'First' }, { id: 'two', title: 'Second' }, { id: 'three', title: 'Third' }];

test('progress keys isolate player, age and world while storing only explicit mission visits', () => {
  const store = storage();
  const scope = { playerId: 'player/1', ageBand: 'U11', worldId: 'puck-skills' };
  assert.match(missionProgressKey(scope), /player%2F1/);
  assert.deepEqual(readVisitedMissionIds(store, scope), []);
  assert.deepEqual(recordMissionVisit(store, scope, 'two'), ['two']);
  assert.deepEqual(recordMissionVisit(store, scope, 'two'), ['two']);
  assert.deepEqual(readVisitedMissionIds(store, { ...scope, worldId: 'hockey-sense' }), []);
  assert.deepEqual(readVisitedMissionIds(store, { ...scope, ageBand: 'U13' }), []);
  assert.deepEqual(readVisitedMissionIds(store, { ...scope, playerId: 'other' }), []);
});

test('summary filters stale ids and suggests the first unvisited stop without mastery language', () => {
  assert.deepEqual(summarizeMissionProgress(missions, ['two', 'stale']), { visitedIds: ['two'], visitedCount: 1, totalCount: 3, suggestedMissionId: 'one' });
  assert.equal(summarizeMissionProgress(missions, ['one', 'two', 'three']).suggestedMissionId, null);
});

test('journey stops alternate sides with a legible minimum target rhythm', () => {
  const stops = journeyStops(missions);
  assert.deepEqual(stops.map(stop => [stop.x, stop.y, stop.side]), [[64, 58, 'right'], [256, 146, 'left'], [64, 234, 'right']]);
  assert.equal(new Set(stops.map(stop => stop.mission.id)).size, missions.length);
});

