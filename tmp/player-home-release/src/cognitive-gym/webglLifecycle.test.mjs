import test from 'node:test';
import assert from 'node:assert/strict';
import { getEventListeners } from 'node:events';
import { watchWebglContextLoss } from './webglLifecycle.js';

test('context loss selects fallback once and removes its listener', () => {
  const canvas = new EventTarget();
  let fallbackCalls = 0;
  const cleanup = watchWebglContextLoss(canvas, () => { fallbackCalls += 1; });
  assert.equal(getEventListeners(canvas, 'webglcontextlost').length, 1);
  const loss = new Event('webglcontextlost', { cancelable: true });
  canvas.dispatchEvent(loss);
  assert.equal(fallbackCalls, 1);
  assert.equal(loss.defaultPrevented, true);
  assert.equal(getEventListeners(canvas, 'webglcontextlost').length, 0);
  canvas.dispatchEvent(new Event('webglcontextrestored'));
  canvas.dispatchEvent(new Event('webglcontextlost'));
  cleanup();
  assert.equal(fallbackCalls, 1);
});

test('unmount cleanup removes the listener before a later context loss', () => {
  const canvas = new EventTarget();
  let fallbackCalls = 0;
  const cleanup = watchWebglContextLoss(canvas, () => { fallbackCalls += 1; });
  assert.equal(getEventListeners(canvas, 'webglcontextlost').length, 1);
  cleanup();
  cleanup();
  assert.equal(getEventListeners(canvas, 'webglcontextlost').length, 0);
  canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
  assert.equal(fallbackCalls, 0);
});

test('loss and cleanup stay isolated between mounts', () => {
  const firstCanvas = new EventTarget();
  const secondCanvas = new EventTarget();
  const calls = [];
  const firstCleanup = watchWebglContextLoss(firstCanvas, () => calls.push('first'));
  const secondCleanup = watchWebglContextLoss(secondCanvas, () => calls.push('second'));
  firstCanvas.dispatchEvent(new Event('webglcontextlost'));
  assert.deepEqual(calls, ['first']);
  assert.equal(getEventListeners(secondCanvas, 'webglcontextlost').length, 1);
  firstCleanup();
  const remountCleanup = watchWebglContextLoss(firstCanvas, () => calls.push('remount'));
  firstCanvas.dispatchEvent(new Event('webglcontextlost'));
  secondCanvas.dispatchEvent(new Event('webglcontextlost'));
  assert.deepEqual(calls, ['first', 'remount', 'second']);
  secondCleanup();
  remountCleanup();
  assert.equal(getEventListeners(firstCanvas, 'webglcontextlost').length, 0);
  assert.equal(getEventListeners(secondCanvas, 'webglcontextlost').length, 0);
});
