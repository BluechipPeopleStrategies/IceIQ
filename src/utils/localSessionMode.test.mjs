import test from 'node:test';
import assert from 'node:assert/strict';
import { setLocalSessionMode } from './localSessionMode.js';

test('local preview blocks auth callbacks before the queued render commits', () => {
  const ref = { current: false };
  let profile = 'preview';
  const queued = [];
  setLocalSessionMode(ref, value => {
    queued.push(value);
    // INITIAL_SESSION arrives in the same batch, before a React render.
    if (!ref.current) profile = null;
  }, true);
  assert.equal(profile, 'preview');
  assert.deepEqual(queued, [true]);
});

test('exiting local preview restores auth handling immediately', () => {
  const ref = { current: true };
  setLocalSessionMode(ref, value => {
    assert.equal(ref.current, false);
    assert.equal(value, false);
  }, false);
});
