import test from 'node:test';
import assert from 'node:assert/strict';
import { getEventListeners } from 'node:events';

import * as input from './coachRouteSurfaceInput.js';

function pointer(target, type, extra = {}) {
  const event = new Event(type, { cancelable: true });
  Object.assign(event, { pointerId: 1, button: 0, isPrimary: true, clientX: 100, clientY: 200 }, extra);
  target.dispatchEvent(event);
}

test('world and portrait mappings preserve both rink halves and reject off-ice or nonfinite hits', () => {
  assert.equal(typeof input.worldPointToCoachRoute, 'function');
  assert.deepEqual(input.worldPointToCoachRoute({ x: -4, y: 0, z: 18 }), { x: -18, y: -4 });
  assert.deepEqual(input.worldPointToCoachRoute({ x: 5, y: 0, z: -23 }), { x: 23, y: 5 });
  assert.deepEqual(input.portraitPointToCoachRoute({ x: -4, y: 18 }), { x: -18, y: -4 });
  assert.deepEqual(input.portraitPointToCoachRoute({ x: 5, y: -23 }), { x: 23, y: 5 });
  for (const point of [null, {}, { x: NaN, z: 0 }, { x: Infinity, z: 0 }, { x: 14, z: 0 }, { x: 0, z: -31 }, { x: 12.9, z: 30.4 }]) {
    assert.equal(input.worldPointToCoachRoute(point), null);
  }
  assert.equal(input.isCoachRoutePoint({ x: -25, y: -6 }), true);
  assert.equal(input.isCoachRoutePoint({ x: -30.4, y: -12.9 }), false);
});

test('route points are emitted only for a completed primary tap at its release coordinates', () => {
  assert.equal(typeof input.listenForCoachRouteTaps, 'function');
  const target = new EventTarget();
  const taps = [];
  const cleanup = input.listenForCoachRouteTaps(target, event => taps.push([event.clientX, event.clientY]));
  pointer(target, 'pointerdown');
  assert.deepEqual(taps, []);
  pointer(target, 'pointerup', { clientX: 103, clientY: 202 });
  assert.deepEqual(taps, [[103, 202]]);
  pointer(target, 'pointerup');
  assert.equal(taps.length, 1);
  cleanup();
});

test('a drag that comes back to its start, cancellation and lost capture never become route taps', () => {
  assert.equal(typeof input.listenForCoachRouteTaps, 'function');
  const target = new EventTarget();
  let taps = 0;
  const cleanup = input.listenForCoachRouteTaps(target, () => taps++);
  pointer(target, 'pointerdown');
  pointer(target, 'pointermove', { clientX: 130 });
  pointer(target, 'pointermove');
  pointer(target, 'pointerup');
  for (const cancelled of ['pointercancel', 'lostpointercapture']) {
    pointer(target, 'pointerdown');
    pointer(target, cancelled);
    pointer(target, 'pointerup');
  }
  assert.equal(taps, 0);
  pointer(target, 'pointerdown');
  pointer(target, 'pointerup');
  assert.equal(taps, 1);
  cleanup();
});

test('secondary buttons and multi-pointer gestures are discarded until all pointers release', () => {
  assert.equal(typeof input.listenForCoachRouteTaps, 'function');
  const target = new EventTarget();
  let taps = 0;
  const cleanup = input.listenForCoachRouteTaps(target, () => taps++);
  pointer(target, 'pointerdown', { button: 2 });
  pointer(target, 'pointerup', { button: 2 });
  pointer(target, 'pointerdown');
  pointer(target, 'pointerdown', { pointerId: 2, isPrimary: false });
  pointer(target, 'pointerup', { pointerId: 2, isPrimary: false });
  pointer(target, 'pointerup');
  assert.equal(taps, 0);
  pointer(target, 'pointerdown');
  pointer(target, 'pointerup');
  assert.equal(taps, 1);
  cleanup();
});

test('cleanup removes native listeners and each surface keeps independent gesture state', () => {
  assert.equal(typeof input.listenForCoachRouteTaps, 'function');
  const first = new EventTarget(), second = new EventTarget();
  const taps = [];
  const clearFirst = input.listenForCoachRouteTaps(first, () => taps.push('first'));
  const clearSecond = input.listenForCoachRouteTaps(second, () => taps.push('second'));
  pointer(first, 'pointerdown');
  pointer(second, 'pointerdown');
  clearFirst();
  clearFirst();
  pointer(first, 'pointerup');
  pointer(second, 'pointerup');
  assert.deepEqual(taps, ['second']);
  for (const name of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'lostpointercapture']) {
    assert.equal(getEventListeners(first, name).length, 0);
    assert.equal(getEventListeners(second, name).length, 1);
  }
  clearSecond();
});
