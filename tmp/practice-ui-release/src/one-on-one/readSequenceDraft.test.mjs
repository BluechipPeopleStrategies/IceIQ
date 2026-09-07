import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import {
  READ_SEQUENCE_CATALOG, createReadSequenceSession, submitFirstRead,
  advanceSequencePlayback, selectSecondRead, replayFirstConsequence,
  currentSequenceState,
} from './readSequenceCore.js';

// Exercise the real lesson state and effects without mounting a renderer or
// claiming browser focus/input coverage. Child components are opaque JSX.
const root = new URL('../../', import.meta.url);
const lessonPath = fileURLToPath(new URL('src/one-on-one/ReadSequence.jsx', root));
const cache = new URL('node_modules/.cache/rinkreads-sequence-draft/', root);
mkdirSync(cache, { recursive: true });
const output = new URL('lesson.mjs', cache);
const source = readFileSync(lessonPath, 'utf8').replace("from 'react';", "from 'test:lesson-hooks';") + '\nexport { ReadSequenceLesson as TestLesson };\n';
await build({
  stdin: { contents: source, resolveDir: fileURLToPath(new URL('src/one-on-one/', root)), sourcefile: lessonPath, loader: 'jsx' },
  outfile: fileURLToPath(output), bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' }, logLevel: 'silent',
  plugins: [{ name: 'lesson-state-harness', setup(api) {
    api.onResolve({ filter: /^test:lesson-hooks$/ }, () => ({ path: 'hooks', namespace: 'lesson-test' }));
    api.onResolve({ filter: /\.jsx$/ }, args => args.importer === lessonPath ? { path: args.path, namespace: 'lesson-child' } : undefined);
    api.onLoad({ filter: /.*/, namespace: 'lesson-test' }, () => ({ contents: ['useState', 'useEffect', 'useMemo', 'useRef', 'useId'].map(name => `export const ${name} = (...args) => globalThis.__rrLessonHooks.${name}(...args);`).join('\n') }));
    api.onLoad({ filter: /.*/, namespace: 'lesson-child' }, () => ({ contents: 'const Child = () => null; export default Child; export const HockeyPlayerArt = Child; export const AIReviewPanel = Child;' }));
  } }],
});
const { TestLesson } = await import(output.href);

const sameDeps = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
function mountLesson(props) {
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
      try { tree = TestLesson(props); } finally { delete globalThis.__rrLessonHooks; }
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

test('only a deliberately selected tactical board exposes its inspection control', () => withEnvironment(() => {
  const definition = READ_SEQUENCE_CATALOG[0];
  const session = createReadSequenceSession(definition.id);
  let scratch;
  const lesson = mountLesson({ definition, playerId: 'inspection-test', scratch: { session }, rememberDraft: draft => { scratch = draft; }, recallDraftAccess: { clear() {} } });
  const board = () => lesson.findElement(node => Boolean(node.props.fallbackBoard));
  try {
    assert.equal(board().props.view, '3d');
    assert.equal(board().props.fallbackBoard.props.inspectable, false, 'A temporary 3D loading board must not offer a fleeting inspector');
    board().props.onViewChange('board'); lesson.flush();
    assert.equal(board().props.fallbackBoard.props.inspectable, true);
    board().props.onViewChange('3d'); lesson.flush();
    assert.equal(board().props.fallbackBoard.props.inspectable, false);
    assert.deepEqual(scratch.session, session, 'Inspection availability must not alter the lesson');
  } finally { lesson.unmount(); }
}));
