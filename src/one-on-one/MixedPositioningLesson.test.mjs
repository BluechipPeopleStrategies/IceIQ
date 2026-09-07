import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { POSITIONING_TEMPLATES } from './positioningSequenceCore.js';
import { mixedStorageKey, mixedArchiveKey } from './sgsMixedDraft.js';
const directory = new URL('.', import.meta.url), path = fileURLToPath(new URL('MixedPositioningLesson.jsx', directory));
const output = new URL('../../node_modules/.cache/rinkreads-workshop/mixed.mjs', directory);
mkdirSync(fileURLToPath(new URL('.', output)), { recursive: true });
await build({ stdin: { contents: readFileSync(path, 'utf8').replace("from 'react';", "from 'test:hooks';"), resolveDir: fileURLToPath(directory), sourcefile: path, loader: 'jsx' }, outfile: fileURLToPath(output), bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' }, logLevel: 'silent', plugins: [{ name: 'hooks', setup(api) {
  api.onResolve({ filter: /^test:hooks$/ }, () => ({ path: 'hooks', namespace: 'hooks' }));
  api.onResolve({ filter: /\.jsx$/ }, args => args.importer === path ? { path: args.path, namespace: 'child' } : undefined);
  api.onLoad({ filter: /.*/, namespace: 'hooks' }, () => ({ contents: ['useState', 'useEffect', 'useMemo', 'useRef'].map(name => `export const ${name}=(...args)=>globalThis.__mixedHooks.${name}(...args);`).join('\n') }));
  api.onLoad({ filter: /.*/, namespace: 'child' }, () => ({ contents: 'const Child=()=>null; export default Child; export const QuestionBoard=Child;' }));
} }] });
const { default: MixedPositioningLesson } = await import(output.href);
const same = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
function mount(props) {
  const slots = []; let cursor = 0, dirty = true, effects = [], tree;
  const hooks = {
    useState(initial) { const i = cursor++; const slot = slots[i] ||= { value: typeof initial === 'function' ? initial() : initial }; slot.set ||= value => { const next = typeof value === 'function' ? value(slot.value) : value; if (!Object.is(next, slot.value)) { slot.value = next; dirty = true; } }; return [slot.value, slot.set]; },
    useRef(value) { return slots[cursor++] ||= { current: value }; },
    useMemo(fn, deps) { const i = cursor++; if (!same(slots[i]?.deps, deps)) slots[i] = { deps, value: fn() }; return slots[i].value; },
    useEffect(fn, deps) { const i = cursor++; if (!same(slots[i]?.deps, deps)) effects.push(() => { slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; }); },
  };
  const text = node => typeof node === 'string' || typeof node === 'number' ? String(node) : Array.isArray(node) ? node.map(text).join('') : node?.props ? text(node.props.children) : '';
  function flush() { for (let n = 0; dirty; n++) { assert.ok(n < 30); dirty = false; cursor = 0; effects = []; globalThis.__mixedHooks = hooks; try { tree = MixedPositioningLesson(props); } finally { delete globalThis.__mixedHooks; } effects.forEach(fn => fn()); } }
  function find(predicate) { let found; function visit(node) { if (Array.isArray(node)) return node.forEach(visit); if (!node?.props) return; if (predicate(node)) found = node; visit(node.props.children); } visit(tree); return found; }
  flush(); return { flush, find, text: () => text(tree), click(label) { const button = find(node => node.type === 'button' && text(node) === label); assert.ok(button, label); assert.ok(!button.props.disabled); button.props.onClick({ detail: 1 }); flush(); }, observe() { const button = find(node => node.type === 'button' && node.props['data-observation-option']); assert.ok(button); button.props.onClick({ detail: 1 }); flush(); }, reason(value) { find(node => node.type === 'textarea').props.onChange({ target: { value } }); flush(); }, unmount() { slots.forEach(slot => slot?.cleanup?.()); } };
}
function environment(run, reduced = true) {
  const names = ['window', 'document', 'localStorage', 'requestAnimationFrame', 'cancelAnimationFrame'];
  const prior = Object.fromEntries(names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  const saved = new Map(), frames = new Map(); let frame = 0;
  const events = { addEventListener() {}, removeEventListener() {} };
  globalThis.window = { ...events, matchMedia: () => ({ matches: reduced, ...events }) };
  globalThis.document = { ...events, visibilityState: 'visible' };
  globalThis.localStorage = { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value), removeItem: key => saved.delete(key) };
  globalThis.requestAnimationFrame = fn => { frames.set(++frame, fn); return frame; }; globalThis.cancelAnimationFrame = id => frames.delete(id);
  try { run(saved, { frames, tick(now) { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn(now)); } }); } finally { for (const name of names) { if (prior[name]) Object.defineProperty(globalThis, name, prior[name]); else delete globalThis[name]; } }
}
const template = POSITIONING_TEMPLATES.find(item => item.id === 'positioning-1v1-009-v1');
test('a fresh mixed lesson chooses a mode first, accepts actual actor selection without a move, and restores exact unanswered placement', () => environment(saved => {
  const key = mixedStorageKey('one', template.id), oldKey = `rinkreads_scenario_workshop_v1:one:${template.id}`;
  saved.set(oldKey, 'untouched original');
  const lesson = mount({ template, playerId: 'one' });
  assert.equal(saved.has(key), false);
  lesson.click('Start my mix');
  const scene = lesson.find(node => Array.isArray(node.props.selectableIds));
  assert.deepEqual(scene.props.editableIds, []);
  assert.ok(scene.props.selectableIds.length > 1);
  scene.props.onActorAnswer('F1', 'rink-tap'); lesson.flush();
  const observation = JSON.parse(saved.get(key));
  assert.equal(observation.comprehension.records[0].inputMethod, 'rink-tap');
  assert.equal(observation.positioning.session.point, null);
  assert.doesNotMatch(lesson.text(), /What the scene shows|Observation matched/);
  lesson.reason('A reason before I choose a position.'); lesson.unmount();
  const bytes = saved.get(key), reopened = mount({ template, playerId: 'one' });
  assert.equal(reopened.find(node => node.type === 'textarea').props.value, 'A reason before I choose a position.');
  reopened.unmount(); assert.equal(saved.get(key), bytes); assert.equal(saved.get(oldKey), 'untouched original');
}));
test('Learning pauses after each complete read, while Challenge hides all factual results until the final play', () => environment(saved => {
  for (const mode of ['Learning', 'Challenge']) {
    const lesson = mount({ template, playerId: mode });
    lesson.click(mode); lesson.click('Start my mix');
    for (let read = 0; read < 3; read++) {
      lesson.observe();
      assert.doesNotMatch(lesson.text(), /What the scene shows/);
      const scene = lesson.find(node => Array.isArray(node.props.editableIds));
      scene.props.onMove('D1', { x: 27, y: -6 }); lesson.flush();
      lesson.reason(`Reason ${read + 1}`);
      lesson.click(read === 2 ? 'Finish my three reads' : 'Save this read');
      const draft = JSON.parse(saved.get(mixedStorageKey(mode, template.id)));
      if (mode === 'Learning' || read === 2) assert.match(lesson.text(), /What the scene shows/);
      else assert.ok(!lesson.find(node => node.props['aria-label'] === 'Read feedback'));
      if (read < 2) { assert.equal(draft.positioning.paused, true); lesson.click('Go to next read'); }
    }
    lesson.unmount();
  }
}));
test('starting another mix advances the seed and freezes the chosen feedback mode across reload', () => environment(saved => {
  const props = { template, playerId: 'variety' }, key = mixedStorageKey('variety', template.id);
  let lesson = mount(props); lesson.click('Challenge'); lesson.click('Start my mix');
  const first = JSON.parse(saved.get(key));
  lesson.unmount(); lesson = mount(props);
  assert.match(lesson.text(), /Challenge mode/);
  lesson.click('Start another mix'); lesson.click('Learning'); lesson.click('Start my mix');
  const second = JSON.parse(saved.get(key));
  assert.equal(second.comprehension.seed, first.comprehension.seed + 1);
  assert.equal(second.comprehension.mode, 'learning');
  assert.notEqual(second.comprehension.attemptId, first.comprehension.attemptId);
  assert.deepEqual(JSON.parse(saved.get(mixedArchiveKey('variety', first.comprehension.attemptId))), first);
  lesson.unmount();
}));
test('failed archival keeps the active attempt and does not advance its seed', () => environment(saved => {
  const props = { template, playerId: 'quota' }, key = mixedStorageKey('quota', template.id);
  const lesson = mount(props); lesson.click('Start my mix'); lesson.observe();
  const before = saved.get(key), originalWrite = localStorage.setItem;
  localStorage.setItem = (name, value) => { if (name.startsWith('rinkreads_sgs_mixed_archive_v1:')) throw new Error('Quota'); originalWrite(name, value); };
  lesson.click('Start another mix'); lesson.click('Start my mix');
  assert.match(lesson.text(), /previous attempt could not be archived/);
  assert.equal(saved.get(key), before);
  lesson.click('Return to saved attempt');
  assert.ok(lesson.find(node => node.type === 'textarea'));
  lesson.unmount();
}));
test('comparison shows the exact prior opening and cannot answer or alter positions while looking back', () => environment(saved => {
  const props = { template, playerId: 'compare' }, key = mixedStorageKey('compare', template.id);
  const lesson = mount(props); lesson.click('Start my mix'); lesson.observe();
  let scene = lesson.find(node => Array.isArray(node.props.editableIds));
  scene.props.onMove('D1', { x: 27, y: -6 }); lesson.flush(); lesson.reason('I want room.'); lesson.click('Save this read'); lesson.click('Go to next read');
  const before = saved.get(key), priorOpening = JSON.parse(before).positioning.session.answers[0].beforeState;
  lesson.click('Compare previous freeze');
  scene = lesson.find(node => Array.isArray(node.props.selectableIds));
  assert.deepEqual(scene.props.state, priorOpening);
  assert.deepEqual(scene.props.fallback.props.snapshotState, priorOpening);
  assert.deepEqual(scene.props.selectableIds, []); assert.deepEqual(scene.props.editableIds, []);
  assert.match(scene.props.title, /before you chose a position/);
  assert.equal(lesson.find(node => node.props['data-observation-option']).props.disabled, true);
  scene.props.onActorAnswer('F1', 'rink-tap'); lesson.flush(); assert.equal(saved.get(key), before);
  lesson.click('Return to this read');
  const option = lesson.find(node => node.props['data-observation-option']);
  option.props.onClick({ detail: 0 }); lesson.flush();
  assert.equal(JSON.parse(saved.get(key)).comprehension.records[1].inputMethod, 'keyboard');
  lesson.unmount();
}));
test('Learning requires an explicit Watch next part after feedback even without reduced motion', () => environment(saved => {
  const props = { template, playerId: 'learning-motion' }, key = mixedStorageKey('learning-motion', template.id);
  const lesson = mount(props); lesson.click('Start my mix'); lesson.observe();
  const scene = lesson.find(node => Array.isArray(node.props.editableIds));
  scene.props.onMove('D1', { x: 27, y: -6 }); lesson.flush(); lesson.reason('Protect the middle.'); lesson.click('Save this read');
  assert.equal(JSON.parse(saved.get(key)).positioning.paused, true);
  assert.match(lesson.text(), /What the scene shows/); assert.match(lesson.text(), /Your answer:/);
  lesson.click('Watch next part');
  assert.equal(JSON.parse(saved.get(key)).positioning.paused, false);
  lesson.click('Pause'); lesson.unmount();
  const reopened = mount(props);
  assert.equal(JSON.parse(saved.get(key)).positioning.paused, true);
  assert.match(reopened.text(), /What the scene shows/);
  reopened.unmount();
}, false));

test('mixed reads require an observation and chosen position but accept no explanation through completion and reload', () => environment(saved => {
  const props = { template, playerId: 'optional-mixed' }, key = mixedStorageKey('optional-mixed', template.id);
  let lesson = mount(props); lesson.click('Challenge'); lesson.click('Start my mix');
  for (let read = 0; read < 3; read++) {
    assert.ok(!lesson.find(node => node.type === 'textarea'), 'the observation still comes first');
    lesson.observe();
    assert.match(lesson.text(), /Why would you be there\? \(optional\)/);
    const scene = lesson.find(node => Array.isArray(node.props.editableIds));
    scene.props.onMove('D1', { x: 27, y: -6 }); lesson.flush();
    lesson.click(read === 2 ? 'Finish my three reads' : 'Save this read');
    assert.equal(JSON.parse(saved.get(key)).positioning.session.answers[read].reason, '');
    if (read < 2) { lesson.unmount(); lesson = mount(props); lesson.click('Go to next read'); }
  }
  const bytes = saved.get(key); lesson.unmount(); lesson = mount(props);
  assert.match(lesson.text(), /What the scene shows/);
  lesson.unmount(); assert.equal(saved.get(key), bytes);
  assert.deepEqual(JSON.parse(bytes).positioning.session.answers.map(answer => answer.reason), ['', '', '']);
}));

test('post-archive save failure keeps the original UI and permits continuing it before a successful new mix', () => environment(saved => {
  const props = { template, playerId: 'active-quota' }, key = mixedStorageKey('active-quota', template.id);
  const lesson = mount(props); lesson.click('Start my mix'); lesson.observe();
  const original = JSON.parse(saved.get(key)), bytes = saved.get(key), archiveKey = mixedArchiveKey('active-quota', original.comprehension.attemptId);
  const originalWrite = localStorage.setItem;
  localStorage.setItem = (name, value) => { if (name === key && JSON.parse(value).comprehension.seed === 1) throw new Error('Quota'); originalWrite(name, value); };
  lesson.click('Start another mix'); lesson.click('Start my mix');
  assert.match(lesson.text(), /new mix could not be saved/i);
  assert.equal(saved.get(key), bytes); assert.equal(saved.has(archiveKey), false);
  lesson.click('Return to saved attempt'); lesson.reason('I can continue my original attempt.');
  const continued = saved.get(key); assert.notEqual(continued, bytes);
  localStorage.setItem = originalWrite;
  lesson.click('Start another mix'); lesson.click('Start my mix');
  assert.equal(JSON.parse(saved.get(key)).comprehension.seed, 1);
  assert.equal(saved.get(archiveKey), continued);
  assert.ok(!lesson.find(node => node.type === 'textarea'), 'the new mix starts at its observation');
  lesson.unmount();
}));

test('unavailable mixed rink blocks stale observation and placement handlers without changing saved evidence', () => environment(saved => {
  const key = mixedStorageKey('unavailable', template.id), lesson = mount({ template, playerId: 'unavailable' });
  lesson.click('Start my mix');
  let scene = lesson.find(node => Array.isArray(node.props.editableIds));
  const original = saved.get(key), option = lesson.find(node => node.props['data-observation-option']);
  scene.props.onAvailabilityChange(false);
  option.props.onClick({ detail: 1 }); scene.props.onActorAnswer('F1', 'rink-tap'); lesson.flush();
  assert.equal(saved.get(key), original, 'failed renderer cannot record an unseen observation');
  assert.equal(lesson.find(node => node.props['data-observation-option']).props.disabled, true);
  scene = lesson.find(node => Array.isArray(node.props.editableIds));
  assert.deepEqual(scene.props.selectableIds, []); assert.deepEqual(scene.props.editableIds, []);
  scene.props.onAvailabilityChange(true); lesson.flush(); lesson.observe();
  scene = lesson.find(node => Array.isArray(node.props.editableIds));
  scene.props.onMove('D1', { x: 27, y: -6 }); lesson.flush(); lesson.reason('Keep this optional thought.');
  scene = lesson.find(node => Array.isArray(node.props.editableIds));
  const beforePosition = saved.get(key), submit = lesson.find(node => node.type === 'button' && node.props.className === 'sw-primary' && !node.props.disabled);
  scene.props.onAvailabilityChange(false); scene.props.onMove('D1', { x: 26, y: -6 }); submit.props.onClick(); lesson.flush();
  assert.equal(saved.get(key), beforePosition);
  assert.equal(lesson.find(node => node.type === 'textarea').props.value, 'Keep this optional thought.');
  assert.equal(lesson.find(node => node.type === 'button' && node.props.className === 'sw-primary').props.disabled, true);
  assert.deepEqual(lesson.find(node => Array.isArray(node.props.editableIds)).props.fallback.props.allowedActorIds, []);
  lesson.unmount();
}));

test('mixed renderer failure pauses the exact flight frame and recovery waits for an explicit Watch', () => environment((saved, { frames, tick }) => {
  const key = mixedStorageKey('lost-flight', template.id), lesson = mount({ template, playerId: 'lost-flight' });
  lesson.click('Challenge'); lesson.click('Start my mix'); lesson.observe();
  lesson.find(node => Array.isArray(node.props.editableIds)).props.onMove('D1', { x: 27, y: -6 }); lesson.flush(); lesson.click('Save this read');
  tick(1000); lesson.flush(); tick(1962); lesson.flush();
  let scene = lesson.find(node => Array.isArray(node.props.editableIds));
  const exactFrame = structuredClone(scene.props.state), answers = JSON.parse(saved.get(key)).positioning.session.answers;
  const skip = lesson.find(node => node.type === 'button' && node.props.children === 'Go to next read');
  scene.props.onAvailabilityChange(false); skip.props.onClick(); tick(9000); lesson.flush();
  const stopped = JSON.parse(saved.get(key));
  assert.ok(Math.abs(stopped.positioning.session.playbackProgress - .37) < 1e-9);
  assert.equal(stopped.positioning.paused, true); assert.deepEqual(stopped.positioning.session.answers, answers);
  scene = lesson.find(node => Array.isArray(node.props.editableIds));
  assert.deepEqual(scene.props.state, exactFrame); assert.equal(frames.size, 0);
  assert.equal(lesson.find(node => node.props['aria-label'] === 'Continuation progress').props.disabled, true);
  scene.props.onAvailabilityChange(true); lesson.flush(); tick(12000); lesson.flush();
  assert.equal(saved.get(key), JSON.stringify(stopped)); assert.equal(frames.size, 0);
  lesson.click('Watch next part'); tick(15000); lesson.flush(); tick(15260); lesson.flush(); lesson.click('Pause');
  assert.ok(Math.abs(JSON.parse(saved.get(key)).positioning.session.playbackProgress - .47) < 1e-9);
  lesson.unmount();
}, false));
