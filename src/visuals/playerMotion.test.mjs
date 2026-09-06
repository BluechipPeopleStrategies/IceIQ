import test from 'node:test';
import assert from 'node:assert/strict';
import { samplePlayerMotion } from './playerMotion.js';

const sample = (actor, time = 1) => samplePlayerMotion({ actor, time });
test('stationary, explicit glide and unauthored motion never churn', () => {
  for (const actor of [{}, { vx: 4 }, { vx: 4, motion: { mode: 'glide' } }]) {
    assert.equal(sample(actor).stride, 0);
    assert.equal(sample(actor).phase, 0);
  }
});
test('skating direction follows velocity relative to facing, never role', () => {
  assert.equal(sample({ vx: 4, facing: 0, role: 'defender', motion: { mode: 'skate' } }).mode, 'forward');
  assert.equal(sample({ vx: -4, facing: 0, motion: { mode: 'skate' } }).mode, 'backward');
  const lateral = sample({ vy: 3, facing: 0, motion: { mode: 'skate' } });
  assert.equal(lateral.mode, 'lateral');
  assert.equal(lateral.lateral, 1);
  assert.equal(sample({ vy: 3, facing: Math.PI / 2, motion: { mode: 'skate' } }).mode, 'forward');
});
test('rim preparation is explicit and continuous before pickup', () => {
  const actor = { vx: 3, motion: { mode: 'glide', action: { type: 'rim-pickup', phases: [
    { name: 'prepare', start: 1, end: 2, turn: .7, lookYaw: -.5 },
    { name: 'pickup', start: 2, end: 3, turn: .4, lookYaw: 0 },
    { name: 'continue', start: 3, end: 4, turn: 0 },
  ] } } };
  assert.equal(sample(actor, .5).action, null);
  assert.equal(sample(actor, 1.5).action.phase, 'prepare');
  assert.ok(sample(actor, 1.5).turn > 0);
  assert.ok(Math.abs(sample(actor, 2 - 1e-7).turn - sample(actor, 2).turn) < 1e-6);
  assert.ok(Math.abs(sample(actor, 3 - 1e-7).turn - sample(actor, 3).turn) < 1e-6);
  assert.equal(sample(actor, 8).action.phase, 'continue');
  assert.equal(sample(actor, 8).turn, 0);
});
test('seek and pause reproduce exactly without mutating source state', () => {
  const actor = { x: 8, y: 2, facing: .2, vx: 4, vy: 1, motion: { mode: 'skate' } };
  const before = structuredClone(actor);
  const pose = sample(actor, 3);
  sample(actor, 100); sample(actor, -1);
  assert.deepEqual(sample(actor, 3), pose);
  assert.deepEqual(actor, before);
});
test('nonfinite inputs yield a finite neutral pose', () => {
  const pose = samplePlayerMotion({ actor: { vx: Infinity, vy: NaN, facing: NaN, motion: { turn: Infinity, lean: NaN, lookYaw: Infinity } }, time: Infinity });
  for (const value of Object.values(pose)) if (typeof value === 'number') assert.ok(Number.isFinite(value));
  assert.equal(pose.stride, 0);
});
test('source motion phase provides cadence independent of renderer history', () => {
  const actor = { vx: 3, motion: { mode: 'skate', cycleRate: 1, phaseOffset: .5 } };
  assert.equal(sample(actor, 0).phase, .5);
  assert.ok(Math.abs(sample(actor, 1).phase - .5) < 1e-10);
});
test('authored head scan takes shortest angular path and stays within rig limits', () => {
  const actor = { motion: { lookYaw: 3.1, action: { phases: [{ name: 'scan', start: 0, end: 1, lookYaw: -3.1 }] } } };
  assert.ok(Math.abs(sample(actor, .5).lookYaw) > 3);
  assert.ok(Math.abs(sample(actor, 1).lookYaw + 3.1) < 1e-10);
});
