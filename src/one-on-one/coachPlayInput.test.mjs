import test from 'node:test';
import assert from 'node:assert/strict';
import { handleCoachPlayKeyDown, releaseCoachPlayInput, resumeCoachPlay } from './coachPlayInput.js';
import { createDraft } from './director.js';
import { createTeamGame, stepTeamGame } from './teamSimulation.js';

const makeInput = () => ({ keys: { current: new Set() }, action: { current: null }, stick: { current: { x: 0, y: 0 } } });
const rink = {};
function keyEvent(key, { target = rink, repeat = false } = {}) {
  return { key, target, currentTarget: rink, repeat, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
}

test('paused live play leaves Tab, Space and arrows available to the page', () => {
  const input = makeInput();
  for (const key of ['Tab', ' ', 'ArrowUp']) {
    const event = keyEvent(key);
    assert.equal(handleCoachPlayKeyDown(event, { running: false, live: true, input }), false);
    assert.equal(event.defaultPrevented, false);
  }
  assert.equal(input.keys.current.size, 0);
  assert.equal(input.action.current, null);
});

test('running practice does not take keys from a focused control inside the rink', () => {
  const input = makeInput();
  const button = {};
  for (const key of ['Tab', ' ', 'ArrowUp']) {
    const event = keyEvent(key, { target: button });
    assert.equal(handleCoachPlayKeyDown(event, { running: true, live: true, input }), false);
    assert.equal(event.defaultPrevented, false);
  }
  assert.equal(input.keys.current.size, 0);
  assert.equal(input.action.current, null);
});

test('focused live rink receives movement and deliberate pass, shoot and player-switch keys', () => {
  for (const [key, wantKey, wantAction] of [['W', 'w', null], ['ArrowLeft', 'arrowleft', null], ['P', 'p', 'pass'], [' ', ' ', 'shoot'], ['Tab', 'tab', 'switch']]) {
    const input = makeInput();
    const event = keyEvent(key);
    assert.equal(handleCoachPlayKeyDown(event, { running: true, live: true, input }), true);
    assert.equal(event.defaultPrevented, true);
    assert.deepEqual([...input.keys.current], [wantKey]);
    assert.equal(input.action.current, wantAction);
  }
});

test('animation playback never takes game keys', () => {
  const input = makeInput();
  const event = keyEvent('Tab');
  assert.equal(handleCoachPlayKeyDown(event, { running: true, live: false, input }), false);
  assert.equal(event.defaultPrevented, false);
  assert.equal(input.keys.current.size, 0);
});

test('holding an action key does not queue repeated shots', () => {
  const input = makeInput();
  const event = keyEvent(' ', { repeat: true });
  handleCoachPlayKeyDown(event, { running: true, live: true, input });
  assert.equal(event.defaultPrevented, true);
  assert.equal(input.action.current, null);
});

test('releasing play input clears held keyboard, touch movement and queued action', () => {
  const input = makeInput();
  input.keys.current.add('w');
  input.keys.current.add('arrowright');
  input.action.current = 'shoot';
  input.stick.current = { x: 1, y: -1 };
  releaseCoachPlayInput(input);
  assert.deepEqual([...input.keys.current], []);
  assert.equal(input.action.current, null);
  assert.deepEqual(input.stick.current, { x: 0, y: 0 });
});

test('Escape stops focused live play, releases movement, and permits the next Tab', () => {
  const input = makeInput();
  input.keys.current.add('w');
  input.action.current = 'pass';
  input.stick.current = { x: 1, y: 0 };
  const state = { running: true, live: true, input, stop() { state.running = false; releaseCoachPlayInput(input); } };
  const escape = keyEvent('Escape');
  assert.equal(handleCoachPlayKeyDown(escape, state), true);
  assert.equal(escape.defaultPrevented, true);
  assert.equal(state.running, false);
  assert.deepEqual([...input.keys.current], []);
  assert.equal(input.action.current, null);
  assert.deepEqual(input.stick.current, { x: 0, y: 0 });
  const tab = keyEvent('Tab');
  assert.equal(handleCoachPlayKeyDown(tab, state), false);
  assert.equal(tab.defaultPrevented, false);
});

test('resuming live practice keeps the current frame and clock while clearing stale inputs', () => {
  const input = makeInput();
  input.keys.current.add('w');
  input.action.current = 'shoot';
  input.stick.current = { x: 1, y: 0 };
  const frameRef = { current: stepTeamGame(createTeamGame(createDraft(2, 2)), { moveX: 1, moveY: 0 }, 0.1) };
  const pausedFrame = frameRef.current;
  const pausedSnapshot = structuredClone(pausedFrame);
  const runRef = { current: false };
  assert.equal(resumeCoachPlay({ liveRef: { current: true }, frameRef, runRef, input }), true);
  assert.equal(runRef.current, true);
  assert.equal(frameRef.current, pausedFrame);
  assert.deepEqual(frameRef.current, pausedSnapshot);
  assert.deepEqual([...input.keys.current], []);
  assert.equal(input.action.current, null);
  assert.deepEqual(input.stick.current, { x: 0, y: 0 });
});

test('resume cannot start a director timeline or an already-finished live frame', () => {
  for (const [live, outcome] of [[false, null], [true, 'goal']]) {
    const frameRef = { current: { ...createTeamGame(createDraft(2, 2)), outcome } };
    const runRef = { current: false };
    assert.equal(resumeCoachPlay({ liveRef: { current: live }, frameRef, runRef, input: makeInput() }), false);
    assert.equal(runRef.current, false);
  }
});
