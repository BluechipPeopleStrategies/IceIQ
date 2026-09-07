import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import {
  READ_SEQUENCE_CATALOG, createReadSequenceSession, submitFirstRead,
  advanceSequencePlayback, selectSecondRead, replayFirstConsequence,
  currentSequenceState, setThirdReadRoute, submitThirdRead, moveThirdReadActor,
} from './readSequenceCore.js';

// Exercise the real lesson state and effects without mounting a renderer or
// claiming browser focus/input coverage. Child components are opaque JSX.
const root = new URL('../../', import.meta.url);
const lessonPath = fileURLToPath(new URL('src/one-on-one/ReadSequence.jsx', root));
const cache = new URL('node_modules/.cache/rinkreads-sequence-draft/', root);
mkdirSync(cache, { recursive: true });
const output = new URL('lesson.mjs', cache);
const source = readFileSync(lessonPath, 'utf8').replace("from 'react';", "from 'test:lesson-hooks';") + '\nexport { ReadSequenceLesson as TestLesson, ChangedCueComparison as TestComparison };\n';
await build({
  stdin: { contents: source, resolveDir: fileURLToPath(new URL('src/one-on-one/', root)), sourcefile: lessonPath, loader: 'jsx' },
  outfile: fileURLToPath(output), bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' }, logLevel: 'silent',
  plugins: [{ name: 'lesson-state-harness', setup(api) {
    api.onResolve({ filter: /^test:lesson-hooks$/ }, () => ({ path: 'hooks', namespace: 'lesson-test' }));
    api.onResolve({ filter: /\.jsx$/ }, args => args.importer === lessonPath ? { path: args.path, namespace: 'lesson-child' } : undefined);
    api.onLoad({ filter: /.*/, namespace: 'lesson-test' }, () => ({ contents: ['useState', 'useEffect', 'useMemo', 'useRef', 'useId'].map(name => `export const ${name} = (...args) => globalThis.__rrLessonHooks.${name}(...args);`).join('\n') }));
    api.onLoad({ filter: /.*/, namespace: 'lesson-child' }, () => ({ contents: 'const Child = () => null; export default Child; export const HockeyPlayerArt = Child; export const AIReviewPanel = Child; export const SvgPlayerLocator = Child; export const SvgPuckLocator = Child; export const isFocusedActor = () => false;' }));
  } }],
});
const { TestLesson, TestComparison } = await import(output.href);

const boardOutput = new URL('board.mjs', cache);
const boardPath = fileURLToPath(new URL('src/one-on-one/ReadSequenceBoard.jsx', root));
const boardSource = readFileSync(boardPath, 'utf8').replace(/^import .* from 'react';/m, "import { Component, lazy, Suspense } from 'react';\nimport { useCallback, useId, useState } from 'test:board-hooks';");
await build({
  stdin: { contents: boardSource, resolveDir: fileURLToPath(new URL('src/one-on-one/', root)), sourcefile: boardPath, loader: 'jsx' },
  outfile: fileURLToPath(boardOutput), bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' }, logLevel: 'silent',
  plugins: [{ name: 'board-state-harness', setup(api) {
    api.onResolve({ filter: /^test:board-hooks$/ }, () => ({ path: 'hooks', namespace: 'board-test' }));
    api.onResolve({ filter: /ReadSequenceScene\.jsx$/ }, () => ({ path: 'scene', namespace: 'board-child' }));
    api.onLoad({ filter: /.*/, namespace: 'board-test' }, () => ({ contents: ['useCallback', 'useId', 'useState'].map(name => `export const ${name} = (...args) => globalThis.__rrLessonHooks.${name}(...args);`).join('\n') }));
    api.onLoad({ filter: /.*/, namespace: 'board-child' }, () => ({ contents: 'export default function Scene() { return null; }' }));
  } }],
});
const { default: TestBoard } = await import(boardOutput.href);

const sameDeps = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
function mountLesson(props, Component = TestLesson, rinkReady = true) {
  const slots = [];
  let cursor = 0, dirty = true, tree, pendingEffects = [];
  const hooks = {
    useState(initial) {
      const index = cursor++;
      if (!slots[index]) slots[index] = { value: typeof initial === 'function' ? initial() : initial };
      const slot = slots[index];
      slot.set ||= value => { const next = typeof value === 'function' ? value(slot.value) : value; if (!Object.is(next, slot.value)) { slot.value = next; dirty = true; } };
      return [slot.value, slot.set];
    },
    useRef(value) { const index = cursor++; return (slots[index] ||= { current: value }); },
    useMemo(factory, deps) { const index = cursor++; if (!sameDeps(slots[index]?.deps, deps)) slots[index] = { deps, value: factory() }; return slots[index].value; },
    useCallback(callback, deps) { return hooks.useMemo(() => callback, deps); },
    useId() { const index = cursor++; return `lesson-test-${index}`; },
    useEffect(effect, deps) {
      const index = cursor++;
      if (!sameDeps(slots[index]?.deps, deps)) pendingEffects.push(() => {
        slots[index]?.cleanup?.();
        slots[index] = { deps, cleanup: effect() };
      });
    },
  };
  function flush() {
    for (let turn = 0; dirty; turn++) {
      assert.ok(turn < 20, 'Lesson effects should settle');
      dirty = false; cursor = 0; pendingEffects = [];
      globalThis.__rrLessonHooks = hooks;
      try { tree = Component(props); } finally { delete globalThis.__rrLessonHooks; }
      for (const effect of pendingEffects) effect();
    }
  }
  function textOf(node) {
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(textOf).join('');
    return node?.props ? textOf(node.props.children) : '';
  }
  function findElement(predicate) {
    let found;
    function visit(node) {
      if (Array.isArray(node)) return node.forEach(visit);
      if (!node?.props) return;
      if (predicate(node)) found = node;
      visit(node.props.children);
    }
    visit(tree);
    return found;
  }
  const findButton = label => findElement(node => node.type === 'button' && textOf(node.props.children) === label);
  flush();
  if (Component === TestLesson && rinkReady) {
    findElement(node => typeof node.props.onAvailabilityChange === 'function')?.props.onAvailabilityChange(true);
    flush();
  }
  return { flush, findElement, hasButton: label => Boolean(findButton(label)), click(label) { const button = findButton(label); assert.ok(button, `Expected ${label} control`); button.props.onClick(); flush(); }, unmount() { for (const slot of slots) slot?.cleanup?.(); } };
}

function withEnvironment(run, { reducedMotion = false } = {}) {
  const names = ['window', 'document', 'localStorage', 'requestAnimationFrame', 'cancelAnimationFrame'];
  const original = Object.fromEntries(names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  const frames = new Map(); let frameId = 0;
  globalThis.window = { matchMedia: query => ({ matches: query === '(prefers-reduced-motion: reduce)' && reducedMotion, addEventListener() {}, removeEventListener() {} }) };
  globalThis.document = { activeElement: null };
  globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  globalThis.requestAnimationFrame = callback => { frames.set(++frameId, callback); return frameId; };
  globalThis.cancelAnimationFrame = id => frames.delete(id);
  try { run({ frames, tick(now) { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(now)); } }); }
  finally { for (const name of names) { if (original[name]) Object.defineProperty(globalThis, name, original[name]); else delete globalThis[name]; } }
}

function suspendedSessions(definition) {
  const action = definition.actions?.[0] || 'pass';
  const first = submitFirstRead(createReadSequenceSession(definition.id), { action, reason: 'I saw my teammate and the defender.' });
  const readTwo = advanceSequencePlayback(first, 1);
  const second = selectSecondRead(readTwo, definition.branches[action].read2.targets[0].id);
  const readThree = advanceSequencePlayback(second, 1);
  const secondReplay = advanceSequencePlayback(replayFirstConsequence(readThree), 1);
  return [first, second, replayFirstConsequence(readTwo), secondReplay].map(session => advanceSequencePlayback(session, .37));
}

test('lesson playback shows the first arrival before continuing the selected second replay', () => withEnvironment(({ frames, tick }) => {
  const definition = READ_SEQUENCE_CATALOG.find(item => item.ageBand === 'U11');
  const first = submitFirstRead(createReadSequenceSession(definition.id), { action: 'pass', reason: 'I saw my teammate.' });
  const readThree = advanceSequencePlayback(selectSecondRead(advanceSequencePlayback(first, 1), 'return-lane'), 1);
  const session = advanceSequencePlayback(replayFirstConsequence(readThree), .37);
  let scratch;
  const lesson = mountLesson({ definition, playerId: 'two-replay-legs', scratch: { session }, rememberDraft: draft => { scratch = draft; }, recallDraftAccess: { clear() {} } });
  try {
    tick(1000); lesson.flush();
    tick(2103); lesson.flush();
    assert.equal(scratch.session.phase, 'replay-2');
    assert.equal(scratch.session.playbackProgress, 0);
    assert.deepEqual(currentSequenceState(scratch.session), definition.branches.pass.state);
    assert.ok(lesson.hasButton('Pause'));
    tick(3000); lesson.flush();
    tick(3625); lesson.flush();
    assert.equal(scratch.session.phase, 'replay-2');
    assert.equal(scratch.session.playbackProgress, .5);
    assert.equal(currentSequenceState(scratch.session).puck.owner, null, 'The return pass must visibly travel before F1 receives it');
    tick(4250); lesson.flush();
    assert.deepEqual(scratch.session, readThree);
    assert.equal(currentSequenceState(scratch.session).puck.owner, 'F1');
  } finally { lesson.unmount(); }
  assert.equal(frames.size, 0);
}));

test('paused consequences and replay stay paused after leaving and restoring every age draft', () => withEnvironment(({ frames }) => {
  for (const definition of READ_SEQUENCE_CATALOG) for (const session of suspendedSessions(definition)) {
    let scratch;
    const props = { definition, playerId: 'pause-test', scratch: { session }, rememberDraft: draft => { scratch = draft; }, recallDraftAccess: { clear() {} } };
    const first = mountLesson(props);
    assert.ok(first.hasButton('Pause'));
    first.click('Pause');
    assert.ok(first.hasButton('Resume'));
    first.unmount();
    assert.equal(frames.size, 0);
    assert.equal(scratch.paused, true, `${definition.ageBand} ${session.phase} must remember the pause`);
    const resumed = mountLesson({ ...props, scratch });
    assert.ok(resumed.hasButton('Resume'), `${definition.ageBand} ${session.phase} must wait for Resume`);
    assert.equal(frames.size, 0, 'A restored pause must not schedule playback');
    assert.equal(scratch.session.playbackProgress, .37);
    assert.deepEqual(currentSequenceState(scratch.session), currentSequenceState(session));
    resumed.unmount();
  }
}));

test('Resume continues a restored paused draft from its saved progress and keeps the original answer', () => withEnvironment(({ frames, tick }) => {
  const definition = READ_SEQUENCE_CATALOG.find(item => item.ageBand === 'U11');
  const session = suspendedSessions(definition)[0];
  let scratch;
  const lesson = mountLesson({ definition, playerId: 'resume-test', scratch: { session, paused: true }, rememberDraft: draft => { scratch = draft; }, recallDraftAccess: { clear() {} } });
  assert.ok(lesson.hasButton('Resume'));
  assert.equal(frames.size, 0);
  lesson.click('Resume');
  tick(1000); lesson.flush();
  assert.equal(scratch.session.playbackProgress, .37);
  tick(1175); lesson.flush();
  assert.equal(scratch.session.playbackProgress, .47);
  assert.deepEqual(scratch.session.first, session.first);
  lesson.unmount();
  assert.equal(frames.size, 0);
}));

test('older in-memory drafts without a pause field retain normal playback', () => withEnvironment(({ frames }) => {
  const definition = READ_SEQUENCE_CATALOG[0];
  const session = suspendedSessions(definition)[0];
  const lesson = mountLesson({ definition, playerId: 'old-draft', scratch: { session }, rememberDraft() {}, recallDraftAccess: { clear() {} } });
  assert.ok(lesson.hasButton('Pause'));
  assert.ok(frames.size > 0);
  lesson.unmount();
  assert.equal(frames.size, 0);
}));

test('a restored pause waits for Resume in reduced motion, then reaches the next freeze without animation', () => withEnvironment(({ frames, tick }) => {
  for (const definition of READ_SEQUENCE_CATALOG) for (const session of suspendedSessions(definition)) {
    let scratch;
    const lesson = mountLesson({ definition, playerId: 'reduced-pause-test', scratch: { session, paused: true }, rememberDraft: draft => { scratch = draft; }, recallDraftAccess: { clear() {} } });
    try {
      assert.equal(scratch.paused, true);
      assert.deepEqual(scratch.session, session, 'Reduced motion must preserve the pause until the child continues');
      assert.equal(frames.size, 0);
      assert.ok(lesson.hasButton('Resume'), `${definition.ageBand} ${session.phase} must offer a way to continue`);
      lesson.click('Resume');
      assert.deepEqual(scratch.session, advanceSequencePlayback(session, 1), 'Resume must reach the authored freeze immediately');
      assert.deepEqual(scratch.session.first, session.first);
      assert.equal(scratch.paused, false);
      tick(1000); lesson.flush(); // only the phase-heading focus frame may remain
      assert.equal(frames.size, 0, 'No animation loop should run after the reduced-motion transition');
    } finally { lesson.unmount(); }
  }
}, { reducedMotion: true }));

test('the lesson offers only 3D and camera changes preserve the current read', () => withEnvironment(() => {
  const definition = READ_SEQUENCE_CATALOG[0];
  const session = createReadSequenceSession(definition.id);
  let scratch;
  const lesson = mountLesson({ definition, playerId: 'inspection-test', scratch: { session }, rememberDraft: draft => { scratch = draft; }, recallDraftAccess: { clear() {} } });
  const board = () => lesson.findElement(node => node.props.state && node.props.definition && Object.hasOwn(node.props, 'cameraPreset'));
  try {
    assert.equal(board().props.fallbackBoard, undefined);
    assert.equal(board().props.onViewChange, undefined);
    const camera = lesson.findElement(node => typeof node.props.onPresetChange === 'function');
    camera.props.onPresetChange('overhead'); lesson.flush();
    assert.equal(board().props.cameraPreset, 'overhead');
    assert.deepEqual(scratch.session, session, 'Camera changes must not alter the lesson');
  } finally { lesson.unmount(); }
}));

test('3D failure pauses a live sequence at its exact progress and preserves its answer', () => withEnvironment(({ frames, tick }) => {
  const definition = READ_SEQUENCE_CATALOG.find(item => item.ageBand === 'U11');
  const session = suspendedSessions(definition)[0];
  let scratch;
  const lesson = mountLesson({ definition, playerId: 'failed-rink', scratch: { session }, rememberDraft: draft => { scratch = draft; }, recallDraftAccess: { clear() {} } });
  try {
    const board = lesson.findElement(node => node.props.state && node.props.definition && Object.hasOwn(node.props, 'cameraPreset'));
    assert.equal(typeof board.props.onUnavailable, 'function');
    board.props.onUnavailable(); lesson.flush();
    tick(5000); lesson.flush();
    assert.deepEqual(scratch.session, session);
    assert.equal(scratch.paused, true);
    assert.equal(frames.size, 0);
  } finally { lesson.unmount(); }
}));

test('a failed 3D board retries the same frame without mounting any tactical fallback', () => {
  const state = currentSequenceState(createReadSequenceSession(READ_SEQUENCE_CATALOG[0].id));
  const before = structuredClone(state);
  let failures = 0;
  const board = mountLesson({ state, cameraPreset: 'overhead', onUnavailable: () => failures++, fallbackBoard: 'REJECTED_TACTICAL_BOARD' }, TestBoard);
  const scene = () => board.findElement(node => node.props.state === state && typeof node.props.onFailure === 'function');
  try {
    assert.equal(board.hasButton('Tactical board'), false);
    assert.ok(scene());
    board.click('Show more ice');
    scene().props.onFailure(); board.flush();
    assert.equal(failures, 1);
    assert.equal(scene(), undefined);
    assert.ok(board.hasButton('Retry 3D rink'));
    assert.equal(board.findElement(node => node.props.children === 'REJECTED_TACTICAL_BOARD'), undefined);
    board.click('Retry 3D rink');
    assert.ok(scene());
    assert.equal(scene().props.wide, true);
    assert.equal(scene().props.cameraPreset, 'overhead');
    assert.deepEqual(scene().props.state, before);
  } finally { board.unmount(); }
});

test('a young player sees the pass immediately, then confirms the preview with a blank note', () => withEnvironment(({ tick }) => {
  const definition = READ_SEQUENCE_CATALOG.find(item => item.ageBand === 'U9');
  let scratch;
  const lesson = mountLesson({ definition, playerId: 'blank-pass', rememberDraft: draft => { scratch = draft; }, recallDraftAccess: { clear() {} } });
  const board = () => lesson.findElement(node => node.props.state && node.props.onAvailabilityChange);
  try {
    board().props.onFirstAction('pass'); lesson.flush();
    assert.equal(scratch.session.phase, 'read-1', 'a tap previews without submitting');
    tick(0); lesson.flush(); tick(875); lesson.flush();
    assert.equal(scratch.session.phase, 'read-1', 'preview remains unsubmitted');
    assert.equal(board().props.state.puck.owner, null, 'puck is between players during the pass');
    assert.notDeepEqual(board().props.state.puck, definition.initialState.puck);
    tick(1750); lesson.flush();
    assert.equal(scratch.session.phase, 'read-1');
    lesson.click('Confirm and continue');
    assert.equal(scratch.session.phase, 'read-2');
    assert.equal(scratch.session.first.reason, '');
    assert.equal(board().props.state.puck.owner, definition.branches.pass.state.puck.owner);
  } finally { lesson.unmount(); }
}));

test('choosing a different first action swaps the preview before confirmation', () => withEnvironment(({ tick }) => {
  const definition = READ_SEQUENCE_CATALOG.find(item => item.ageBand === 'U9');
  let scratch;
  const lesson = mountLesson({ definition, playerId: 'swap-preview', rememberDraft: draft => { scratch = draft; }, recallDraftAccess: { clear() {} } });
  const board = () => lesson.findElement(node => node.props.state && node.props.onAvailabilityChange);
  try {
    board().props.onFirstAction('pass');
    tick(500);
    lesson.flush();
    assert.equal(scratch.session.phase, 'read-1', 'a tap previews without submitting');
    assert.equal(scratch.chosenAction, 'pass');

    board().props.onFirstAction('carry');
    lesson.flush();
    tick(0);
    assert.equal(scratch.chosenAction, 'carry');
    assert.equal(scratch.session.phase, 'read-1', 'changing the selection stays in read-1');
    assert.equal(!!scratch.session.first, false, 'no first action is committed before confirmation');

    tick(1750);
    lesson.flush();
    lesson.click('Confirm and continue');
    assert.equal(scratch.session.phase, 'read-2');
    assert.equal(scratch.session.first.action, 'carry');
    assert.equal(scratch.session.first.reason, '');
    assert.equal(board().props.state.puck.owner, definition.branches.carry.state.puck.owner);
  } finally { lesson.unmount(); }
}));

test('connected playback waits for a rendered rink rather than finishing unseen during load', () => withEnvironment(({ tick }) => {
  const definition = READ_SEQUENCE_CATALOG.find(item => item.ageBand === 'U9');
  const session = submitFirstRead(createReadSequenceSession(definition.id), { action: 'pass', reason: '' });
  let scratch;
  const lesson = mountLesson({ definition, playerId: 'loading-pass', scratch: { session }, rememberDraft: draft => { scratch = draft; }, recallDraftAccess: { clear() {} } }, TestLesson, false);
  try {
    tick(0); lesson.flush(); tick(5000); lesson.flush();
    assert.equal(scratch.session.playbackProgress, 0);
    lesson.findElement(node => node.props.onAvailabilityChange).props.onAvailabilityChange(true); lesson.flush();
    tick(6000); lesson.flush(); tick(6875); lesson.flush();
    assert.equal(scratch.session.playbackProgress, .5);
  } finally { lesson.unmount(); }
}));

const readThreeSession = definition => {
  const session = advanceSequencePlayback(selectSecondRead(advanceSequencePlayback(submitFirstRead(createReadSequenceSession(definition.id), { action: 'pass', reason: '' }), 1), 'return-lane'), 1);
  const actor = currentSequenceState(session).actors.find(item => item.id === session.third.actorId);
  return moveThirdReadActor(session, { x: actor.x + 1, y: actor.y });
};

test('context loss rejects a queued first rink tap without changing the saved selection', () => withEnvironment(() => {
  const definition = READ_SEQUENCE_CATALOG.find(item => item.ageBand === 'U11');
  let scratch;
  const lesson = mountLesson({ definition, playerId: 'queued-tap', rememberDraft: value => { scratch = value; }, recallDraftAccess: { clear() {} } });
  try {
    const board = lesson.findElement(node => node.props.state && node.props.onAvailabilityChange);
    board.props.onFirstAction('pass'); lesson.flush();
    board.props.onUnavailable();
    board.props.onFirstAction('shoot');
    lesson.flush();
    assert.equal(scratch.chosenAction, 'pass');
    assert.equal(scratch.session.phase, 'read-1');
    assert.equal(lesson.findElement(node => node.type === 'button' && node.props.children === 'Confirm and continue').props.disabled, true);
  } finally { lesson.unmount(); }
}));

test('read three cannot finish an unseen position and retry preserves the blank optional note', () => withEnvironment(() => {
  const definition = READ_SEQUENCE_CATALOG.find(item => item.ageBand === 'U11'), session = readThreeSession(definition);
  let scratch;
  const lesson = mountLesson({ definition, playerId: 'finish-ready', scratch: { session }, rememberDraft: value => { scratch = value; }, recallDraftAccess: { clear() {} } });
  const board = () => lesson.findElement(node => node.props.state && node.props.onAvailabilityChange);
  const finish = () => lesson.findElement(node => node.type === 'button' && node.props.children === 'Finish the three reads →');
  try {
    const pendingFinish = finish().props.onClick;
    board().props.onUnavailable(); pendingFinish(); lesson.flush();
    assert.equal(finish().props.disabled, true);
    assert.deepEqual(scratch.session, session);
    board().props.onAvailabilityChange(true); lesson.flush();
    assert.equal(finish().props.disabled, false);
    lesson.click('Finish the three reads →');
    assert.equal(scratch.session.phase, 'complete');
    assert.equal(scratch.session.third.reason, '');
    assert.deepEqual(scratch.session.first, session.first);
    assert.deepEqual(scratch.session.second, session.second);
  } finally { lesson.unmount(); }
}));

test('route failure freezes the shown frame and blocks queued edits, scrub, preview and finish until ready', () => withEnvironment(({ tick }) => {
  const definition = READ_SEQUENCE_CATALOG.find(item => item.ageBand === 'U11');
  let session = readThreeSession(definition);
  const actor = currentSequenceState(session).actors.find(item => item.id === session.third.actorId);
  session = setThirdReadRoute(session, [{ x: actor.x + 1, y: actor.y + 1 }, { x: actor.x + 2, y: actor.y + 1 }]);
  let scratch;
  const lesson = mountLesson({ definition, playerId: 'route-ready', scratch: { session, routeMode: true }, rememberDraft: value => { scratch = value; }, recallDraftAccess: { clear() {} } });
  const route = () => lesson.findElement(node => typeof node.props.onAddPoint === 'function');
  const board = () => lesson.findElement(node => node.props.state && node.props.onAvailabilityChange);
  try {
    route().props.onPreview(); lesson.flush(); tick(1000); lesson.flush(); tick(1800); lesson.flush();
    assert.equal(route().props.progress, .25);
    const pending = route().props, frozenFrame = structuredClone(board().props.state);
    const pendingFinish = lesson.findElement(node => node.type === 'button' && node.props.children === 'Finish the three reads →').props.onClick;
    board().props.onUnavailable();
    tick(2600); pending.onChange([]); pending.onAddPoint({ x: actor.x + 3, y: actor.y }); pending.onPreview(); pending.onProgress(.9); pendingFinish();
    lesson.flush();
    assert.deepEqual(scratch.session, session);
    assert.deepEqual(board().props.state, frozenFrame);
    assert.equal(route().props.progress, .25);
    assert.equal(route().props.playing, false);
    assert.equal(lesson.findElement(node => node.type === 'fieldset' && node.props['aria-label'] === 'Route controls').props.disabled, true);
    board().props.onAvailabilityChange(true); lesson.flush(); tick(8000); lesson.flush();
    assert.equal(route().props.progress, .25, 'Retry must not replay or discard the route preview');
    assert.deepEqual(board().props.state, frozenFrame);
    assert.equal(lesson.findElement(node => node.type === 'fieldset' && node.props['aria-label'] === 'Route controls').props.disabled, false);
  } finally { lesson.unmount(); }
}));

test('changed-cue comparison requires both visible boards and reacquires readiness after reopening', () => withEnvironment(() => {
  const definition = READ_SEQUENCE_CATALOG.find(item => item.ageBand === 'U11');
  const session = submitThirdRead(readThreeSession(definition), '');
  const saved = [];
  const lesson = mountLesson({ session, onSave: value => saved.push(value) }, TestComparison);
  const board = title => lesson.findElement(node => node.props.title === title && node.props.state);
  const actionButtons = () => lesson.findElement(node => node.type === 'fieldset' && node.props.className === 'rs-actions rs-comparison-actions');
  const save = () => lesson.findElement(node => node.type === 'button' && node.props.children === 'Save my comparison');
  try {
    lesson.click('Try one changed cue');
    assert.equal(save().props.disabled, true);
    board('Original opening freeze').props.onAvailabilityChange(true); lesson.flush();
    assert.equal(actionButtons().props.disabled, true);
    board('Changed opening freeze: only D1 moved').props.onAvailabilityChange(true); lesson.flush();
    assert.equal(actionButtons().props.disabled, false);
    lesson.click('Shoot');
    const pendingSave = save().props.onClick;
    board('Changed opening freeze: only D1 moved').props.onAvailabilityChange(false); pendingSave(); lesson.flush();
    assert.equal(saved.length, 0);
    assert.equal(save().props.disabled, true);
    board('Changed opening freeze: only D1 moved').props.onAvailabilityChange(true); lesson.flush();
    lesson.click('Save my comparison');
    assert.equal(saved.length, 1);
    assert.equal(saved[0].changedCue.reason, '');
    assert.deepEqual(saved[0].first, session.first);
    lesson.click('Hide comparison'); lesson.click('Try one changed cue');
    assert.equal(save().props.disabled, true);
    board('Changed opening freeze: only D1 moved').props.onAvailabilityChange(true); lesson.flush();
    assert.equal(save().props.disabled, true, 'Original board needs its new onReady too');
  } finally { lesson.unmount(); }
}));
