import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { framesOf } from './branching.js';
import { resolveTarget } from './zones.js';
import { scorePoint } from './primitives/point-scorer.js';
import { scorePlace } from './primitives/place-scorer.js';
import { scorePath } from './primitives/path-scorer.js';
import { toScenarioWorld, fromScenarioWorld, scenarioScene, scenarioOverlays, scenarioTitle, scenarioPrompt } from './scenario3DAdapter.js';

const seeds = readdirSync(new URL('./seeds/', import.meta.url)).filter(name => name.endsWith('.json')).map(name => JSON.parse(readFileSync(new URL(`./seeds/${name}`, import.meta.url))));

test('all source frames retain actor identities and exact source answers through the 3D adapter', () => {
  for (const seed of seeds) for (const frame of framesOf(seed)) {
    const snapshot = structuredClone(frame), scene = scenarioScene(frame);
    assert.deepEqual(scene.state.actors.map(actor => actor.id), frame.actors.filter(actor => actor.kind !== 'puck').map(actor => actor.id));
    for (const actor of frame.actors) {
      const point = fromScenarioWorld(toScenarioWorld(actor));
      assert.ok(Math.abs(point.x - actor.x) < 1e-12 && Math.abs(point.y - actor.y) < 1e-12, `${seed.id}/${actor.id}`);
    }
    assert.deepEqual(frame, snapshot);
    assert.equal(scene.state.puck?.owner, null);
    assert.ok(scene.state.actors.every(actor => ['home', 'away'].includes(actor.team)));
  }
});

test('world conversion rejects invalid coordinates and never rounds near the grading boundary', () => {
  for (const p of [{ x: NaN, y: .5 }, { x: 1.01, y: .5 }]) assert.throws(() => toScenarioWorld(p));
  assert.throws(() => fromScenarioWorld({ x: 40, y: 0 }));
  const target = { x: .7, y: .5, tolerance: .08 };
  for (const dx of [.08 - 1e-8, .08 + 1e-8]) {
    const p = { x: target.x + dx, y: target.y };
    assert.equal(scorePoint(fromScenarioWorld(toScenarioWorld(p)), target).ok, scorePoint(p, target).ok);
  }
});

test('authored normalized target circles become unequal metric ellipse axes', () => {
  const seed = seeds.find(seed => seed.id === 'u11_oz_corner_lw_crash_v1');
  assert.deepEqual(scenarioOverlays(seed), { polylines: [], regions: [], labels: [] });
  const reveal = scenarioOverlays(seed, { revealed: true });
  const target = resolveTarget(seed.correct.placements[0]), region = reveal.regions[0];
  assert.ok(Math.abs(region.radiusX / region.radiusY - 200 / 85) < 1e-10);
  const good = { x: target.x, y: target.y + target.tolerance - 1e-8 };
  const bad = { x: target.x, y: target.y + target.tolerance + 1e-8 };
  for (const p of [good, bad]) assert.equal(scorePlace({ slot_lw: fromScenarioWorld(toScenarioWorld(p)) }, seed.correct).ok, scorePlace({ slot_lw: p }, seed.correct).ok);
});

test('path projection preserves the existing interception and endpoint judgments', () => {
  const correct = { kind: 'path', end: { x: .8, y: .5, tolerance: .05 } };
  const defenders = [{ id: 'D1', x: .5, y: .5 }];
  for (const route of [[{ x: .2, y: .5 }, { x: .8, y: .5 }], [{ x: .2, y: .5 }, { x: .5, y: .2 }, { x: .8, y: .5 }]]) {
    const roundTrip = route.map(point => fromScenarioWorld(toScenarioWorld(point)));
    assert.equal(scorePath(roundTrip, correct, { defenders }).reason, scorePath(route, correct, { defenders }).reason);
  }
});

test('defending and attacking ends retain goalies, teams and named placement focus', () => {
  const attack = seeds.find(seed => seed.id === 'u11_oz_corner_lw_crash_v1');
  const defence = seeds.find(seed => seed.id === 'u11_dz_coverage_place_v1');
  const a = scenarioScene(attack), d = scenarioScene(defence);
  assert.equal(a.focusActorId, 'slot_lw');
  assert.equal(a.state.actors.find(actor => actor.id === 'slot_lw').label, 'LW');
  assert.equal(a.state.actors.find(actor => actor.id === 'x1').label, 'X1');
  assert.equal(a.state.actors.find(actor => actor.role === 'goalie').team, 'away');
  assert.equal(d.state.actors.find(actor => actor.role === 'goalie').team, 'home');
  assert.ok(a.bounds.maxX >= 30 && d.bounds.minX <= -30);
  assert.equal(a.showBothGoals, true);
  assert.doesNotMatch(scenarioTitle(attack), /_v1|u11_/);
  assert.doesNotMatch(scenarioPrompt(attack), /highest-value/);
  assert.deepEqual(scenarioScene(attack, { positions: { slot_lw: { x: .2, y: .5 } }, hiddenKinds: ['defender'] }).bounds, a.bounds, 'Answer movement and hiding pressure cannot move the camera');
});
