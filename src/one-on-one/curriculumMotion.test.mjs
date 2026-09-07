import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
const source = new URL('./curriculumMotion.jsx', import.meta.url);
const cache = new URL('../../node_modules/.cache/curriculum-motion/', import.meta.url);
mkdirSync(cache, { recursive: true });
const output = new URL('motion.mjs', cache);
await build({ stdin: { contents: readFileSync(source, 'utf8').replace("from 'react';", "from 'test:motion-hooks';"), resolveDir: fileURLToPath(new URL('.', source)), sourcefile: fileURLToPath(source), loader: 'jsx' },
  outfile: fileURLToPath(output), bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' }, logLevel: 'silent',
  plugins: [{ name: 'motion-hooks', setup(api) {
    api.onResolve({ filter: /^test:motion-hooks$/ }, () => ({ path: 'hooks', namespace: 'hooks' }));
    api.onLoad({ filter: /.*/, namespace: 'hooks' }, () => ({ contents: ['useState', 'useEffect', 'useMemo', 'useCallback'].map(name => `export const ${name}=(...args)=>globalThis.__curriculumMotionHooks.${name}(...args);`).join('\n') }));
  } }],
});
const { useCurriculumMotion } = await import(output.href);
const questions = JSON.parse(readFileSync(new URL('./curriculum-draft.json', import.meta.url))).lessons.flatMap(lesson => lesson.questions);
const question = questions.find(item => item.id === 'practice-draft-u18-support-change-mc');
const same = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));

function mount(initialQuestion) {
  let currentQuestion = initialQuestion, cursor = 0, dirty = true, effects = [], result;
  const slots = [];
  const hooks = {
    useState(initial) { const slot = slots[cursor++] ||= { value: typeof initial === 'function' ? initial() : initial }; slot.set ||= value => { const next = typeof value === 'function' ? value(slot.value) : value; if (!Object.is(next, slot.value)) { slot.value = next; dirty = true; } }; return [slot.value, slot.set]; },
    useMemo(fn, deps) { const i = cursor++; if (!same(slots[i]?.deps, deps)) slots[i] = { deps, value: fn() }; return slots[i].value; },
    useCallback(fn, deps) { return hooks.useMemo(() => fn, deps); },
    useEffect(fn, deps) { const i = cursor++; if (!same(slots[i]?.deps, deps)) effects.push(() => { slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; }); },
  };
  function flush() { for (let count = 0; dirty; count++) { assert.ok(count < 20); dirty = false; cursor = 0; effects = []; globalThis.__curriculumMotionHooks = hooks; try { result = useCurriculumMotion(currentQuestion); } finally { delete globalThis.__curriculumMotionHooks; } effects.forEach(fn => fn()); } return result; }
  flush();
  return { get current() { return result; }, flush, setQuestion(value) { currentQuestion = value; dirty = true; return flush(); }, unmount() { slots.forEach(slot => slot.cleanup?.()); } };
}

function environment(run, reducedMotion = false) {
  const keys = ['window', 'requestAnimationFrame', 'cancelAnimationFrame'];
  const prior = Object.fromEntries(keys.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const frames = new Map(); let frameId = 0;
  globalThis.window = { matchMedia: () => ({ matches: reducedMotion, addEventListener() {}, removeEventListener() {} }) };
  globalThis.requestAnimationFrame = fn => { frames.set(++frameId, fn); return frameId; };
  globalThis.cancelAnimationFrame = id => frames.delete(id);
  try { run({ frames, tick(now) { const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(now)); } }); }
  finally { for (const key of keys) { if (prior[key]) Object.defineProperty(globalThis, key, prior[key]); else delete globalThis[key]; } }
}

test('actual hook animates, pauses, resumes and replays without exposing answers before the final frame', () => environment(({ tick, frames }) => {
  const component = mount(question);
  assert.equal(component.current.canAnswer, false);
  tick(0); component.flush(); tick(900); component.flush();
  assert.equal(component.current.progress, .5);
  component.current.pause(); component.flush();
  assert.equal(frames.size, 0);
  assert.equal(component.current.canAnswer, false);
  component.current.play(); component.flush(); tick(1000); component.flush(); tick(1900); component.flush();
  assert.equal(component.current.canAnswer, true);
  assert.deepEqual(component.current.visual.actors, question.visual.actors);
  component.current.replay(); component.flush();
  assert.equal(component.current.progress, 0);
  assert.equal(component.current.canAnswer, false);
  component.unmount(); assert.equal(frames.size, 0);
}));

test('switching questions cancels the old clock and starts the new authored opening', () => environment(({ tick, frames }) => {
  const component = mount(question);
  tick(0); component.flush(); tick(900); component.flush();
  const next = questions.find(item => item.id === 'practice-draft-u13-refresh-picture-mc');
  component.setQuestion(next);
  assert.equal(component.current.questionId, next.id);
  assert.equal(component.current.progress, 0);
  assert.equal(component.current.canAnswer, false);
  assert.equal(component.current.visual.actors.find(actor => actor.id === 'D1').y, -3);
  assert.equal(frames.size, 1);
  component.unmount(); assert.equal(frames.size, 0);
}));

test('reduced-motion hook waits for Play and never schedules timed animation', () => environment(({ frames }) => {
  const component = mount(question);
  assert.equal(component.current.phase, 'ready');
  assert.equal(component.current.canAnswer, false);
  assert.equal(frames.size, 0);
  component.current.play(); component.flush();
  assert.equal(component.current.canAnswer, true);
  assert.deepEqual(component.current.visual.actors, question.visual.actors);
  component.current.replay(); component.flush();
  assert.equal(frames.size, 0);
  component.unmount();
}, true));
