import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { getCurriculumPositionVariant, curriculumPositionStorageKey } from './curriculumPositionCore.js';
const source = new URL('./curriculumPosition.jsx', import.meta.url), cache = new URL('../../node_modules/.cache/curriculum-position/', import.meta.url);
mkdirSync(cache, { recursive: true });
const output = new URL('position.mjs', cache);
await build({ stdin: { contents: readFileSync(source, 'utf8').replace("from 'react';", "from 'test:position-hooks';"), resolveDir: fileURLToPath(new URL('.', source)), sourcefile: fileURLToPath(source), loader: 'jsx' }, outfile: fileURLToPath(output), bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' }, logLevel: 'silent', plugins: [{ name: 'position-hooks', setup(api) {
  api.onResolve({ filter: /^test:position-hooks$/ }, () => ({ path: 'hooks', namespace: 'hooks' }));
  api.onLoad({ filter: /.*/, namespace: 'hooks' }, () => ({ contents: ['useState', 'useEffect', 'useMemo', 'useRef'].map(name => `export const ${name}=(...args)=>globalThis.__positionHooks.${name}(...args);`).join('\n') }));
  api.onResolve({ filter: /\.jsx$/ }, args => args.importer === fileURLToPath(source) ? { path: args.path, namespace: 'child' } : undefined);
  api.onLoad({ filter: /.*/, namespace: 'child' }, () => ({ contents: 'export default function Child(){return null;}' }));
} }] });
const { PositionAttempt } = await import(output.href);
const question = JSON.parse(readFileSync(new URL('./curriculum-draft.json', import.meta.url))).lessons.flatMap(lesson => lesson.questions).find(q => q.id === 'practice-draft-u15-two-angles-mc');
const same = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
function mount(playerId) {
  const slots = []; let cursor = 0, dirty = true, effects = [], tree;
  const hooks = {
    useState(initial) { const slot = slots[cursor++] ||= { value: typeof initial === 'function' ? initial() : initial }; slot.set ||= value => { const next = typeof value === 'function' ? value(slot.value) : value; if (!Object.is(next, slot.value)) { slot.value = next; dirty = true; } }; return [slot.value, slot.set]; },
    useRef(value) { return slots[cursor++] ||= { current: value }; },
    useMemo(fn, deps) { const index = cursor++; if (!same(slots[index]?.deps, deps)) slots[index] = { value: fn(), deps }; return slots[index].value; },
    useEffect(fn, deps) { const index = cursor++; if (!same(slots[index]?.deps, deps)) effects.push(() => { slots[index]?.cleanup?.(); slots[index] = { deps, cleanup: fn() }; }); },
  };
  function flush() { for (let count = 0; dirty; count++) { assert.ok(count < 20); dirty = false; cursor = 0; effects = []; globalThis.__positionHooks = hooks; try { tree = PositionAttempt({ question, playerId, variant: getCurriculumPositionVariant(question) }); } finally { delete globalThis.__positionHooks; } effects.forEach(fn => fn()); } }
  const text = node => typeof node === 'string' || typeof node === 'number' ? String(node) : Array.isArray(node) ? node.map(text).join('') : node?.props ? text(node.props.children) : '';
  function find(predicate) { let found; function visit(node) { if (Array.isArray(node)) return node.forEach(visit); if (!node?.props) return; if (predicate(node)) found = node; visit(node.props.children); } visit(tree); return found; }
  flush(); return { flush, find, text: () => text(tree), scene: () => find(node => Array.isArray(node.props.editableIds)), click(label) { const button = find(node => node.type === 'button' && text(node) === label); assert.ok(button, label); assert.ok(!button.props.disabled); button.props.onClick(); flush(); }, unmount() { slots.forEach(slot => slot?.cleanup?.()); } };
}
function environment(run) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage'), saved = new Map();
  globalThis.localStorage = { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) };
  try { run(saved); } finally { if (previous) Object.defineProperty(globalThis, 'localStorage', previous); else delete globalThis.localStorage; }
}

test('the actual placement screen waits for visible ice, checks explicit placements and reloads without changing MC records', () => environment(saved => {
  const key = curriculumPositionStorageKey('player', question), mcKey = 'rinkreads_guided_curriculum_v1:player';
  saved.set(mcKey, 'existing MC history');
  let screen = mount('player');
  assert.doesNotMatch(screen.text(), /Coach notes|accepted polygon|edge tolerance|draft area/);
  assert.deepEqual(screen.scene().props.editableIds, []);
  assert.equal(screen.scene().props.focusActorId, 'YOU');
  const initial = saved.get(key);
  screen.scene().props.onMove('YOU', { x: 20, y: -5 }); screen.flush(); assert.equal(saved.get(key), initial);
  screen.scene().props.onAvailabilityChange(true); screen.flush(); screen.click('Keep the starting position');
  assert.equal(JSON.parse(saved.get(key)).result, null);
  screen.click('Check my position'); assert.match(screen.text(), /Good area for this exercise/);
  assert.equal(JSON.parse(saved.get(key)).reason, '');
  screen.scene().props.onMove('YOU', { x: 20, y: -5 }); screen.flush();
  assert.equal(screen.find(node => node.props['aria-label'] === 'Placement feedback'), undefined);
  screen.click('Check my position'); assert.match(screen.text(), /Try another area/);
  assert.equal(screen.scene().props.state.puck.owner, 'F1');
  const bytes = saved.get(key); screen.unmount(); screen = mount('player');
  assert.equal(saved.get(key), bytes); assert.match(screen.text(), /Try another area/);
  assert.equal(saved.get(mcKey), 'existing MC history'); screen.unmount();
}));

test('failed rendering blocks stale move and check events without losing an optional reason or point', () => environment(saved => {
  const key = curriculumPositionStorageKey('lost-view', question), screen = mount('lost-view');
  screen.scene().props.onAvailabilityChange(true); screen.flush();
  screen.scene().props.onMove('YOU', { x: 17, y: 4 }); screen.flush();
  screen.find(node => node.type === 'textarea').props.onChange({ target: { value: 'Keep another route open.' } }); screen.flush();
  const scene = screen.scene(), check = screen.find(node => node.type === 'button' && node.props.children === 'Check my position'), bytes = saved.get(key);
  scene.props.onAvailabilityChange(false); scene.props.onMove('YOU', { x: 20, y: -5 }); check.props.onClick(); screen.flush();
  assert.equal(saved.get(key), bytes); assert.deepEqual(screen.scene().props.editableIds, []);
  assert.equal(screen.find(node => node.type === 'button' && node.props.children === 'Check my position').props.disabled, true);
  scene.props.onAvailabilityChange(true); screen.flush(); assert.equal(saved.get(key), bytes);
  screen.click('Check my position'); assert.match(screen.text(), /Good area for this exercise/);
  assert.equal(JSON.parse(saved.get(key)).reason, 'Keep another route open.'); screen.unmount();
}));
