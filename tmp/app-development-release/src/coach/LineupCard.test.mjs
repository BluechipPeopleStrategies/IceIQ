import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { getDepthChart, setAssignment } from '../utils/depthChart.js';

const file = fileURLToPath(new URL('./LineupCard.jsx', import.meta.url)), output = new URL('../../node_modules/.cache/lineup-card/component.mjs', import.meta.url);
mkdirSync(new URL('./', output), { recursive: true });
await build({ entryPoints: [file], outfile: fileURLToPath(output), bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' }, logLevel: 'silent', plugins: [{ name: 'lineup-card-hooks', setup(api) {
  api.onResolve({ filter: /^react$/ }, args => args.importer === file ? { path: 'hooks', namespace: 'lineup-hooks' } : undefined);
  api.onLoad({ filter: /.*/, namespace: 'lineup-hooks' }, () => ({ contents: ['useState', 'useEffect', 'useRef'].map(name => `export const ${name}=(...args)=>globalThis.__lineupHooks.${name}(...args);`).join('\n') }));
} }] });
const { default: LineupCard } = await import(output.href);
const roster = [{ id: 'a', name: 'Alex', position: 'Forward', iq: 72 }, { id: 'b', name: 'Blair', position: 'Defense', iq: 68 }, { id: 'c', name: 'Casey', position: 'Goalie', iq: 80 }];
const same = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
function environment(run) {
  const prior = { window: globalThis.window, document: globalThis.document }, storage = new Map(), listeners = new Map(); let target = null, fail = false;
  globalThis.window = { innerWidth: 390, addEventListener: (type, callback) => listeners.set(type, callback), removeEventListener: type => listeners.delete(type), localStorage: { getItem: key => storage.get(key) ?? null, setItem(key, value) { if (fail) throw Error('Quota'); storage.set(key, value); } } };
  globalThis.document = { elementFromPoint: () => target };
  try { run({ storage, listeners, fail(value) { fail = value; }, target(value, local = true) { target = value ? { dataset: { lineupDrop: value }, local, closest() { return this; } } : null; } }); }
  finally { for (const key of ['window', 'document']) { if (prior[key] === undefined) delete globalThis[key]; else globalThis[key] = prior[key]; } }
}
function mount(teamId = 'team') {
  const slots = [], changes = []; const props = { teamId, roster, onChange: () => changes.push(true) }; let index = 0, dirty = true, effects, tree;
  const hooks = {
    useState(initial) { const slot = slots[index++] ||= { value: typeof initial === 'function' ? initial() : initial }; return [slot.value, value => { slot.value = typeof value === 'function' ? value(slot.value) : value; dirty = true; }]; },
    useRef(initial) { return slots[index++] ||= { current: initial }; },
    useEffect(fn, deps) { const id = index++; if (!same(slots[id]?.deps, deps)) effects.push(() => { slots[id]?.cleanup?.(); slots[id] = { deps, cleanup: fn() }; }); },
  };
  const text = node => typeof node === 'string' || typeof node === 'number' ? String(node) : Array.isArray(node) ? node.map(text).join('') : node?.props ? text(node.props.children) : '';
  function flush() { for (let turns = 0; dirty; turns++) { assert.ok(turns < 30); dirty = false; index = 0; effects = []; globalThis.__lineupHooks = hooks; try { tree = LineupCard(props); tree.ref.current = { contains: target => target.local }; } finally { delete globalThis.__lineupHooks; } effects.forEach(fn => fn()); } }
  function find(predicate) { let found; const visit = node => { if (Array.isArray(node)) return node.forEach(visit); if (!node?.props) return; if (predicate(node)) found = node; visit(node.props.children); }; visit(tree); return found; }
  flush();
  return { changes, props, flush, find, text: () => text(tree), root: () => tree,
    click(label) { const button = find(node => node.type === 'button' && (node.props['aria-label'] || text(node)) === label); assert.ok(button, label); button.props.onClick({ stopPropagation() {} }); flush(); },
    select(value) { find(node => node.type === 'select').props.onChange({ target: { value } }); flush(); },
    start(playerId = 'a') { const captured = new Set(), element = { setPointerCapture: id => captured.add(id), hasPointerCapture: id => captured.has(id), releasePointerCapture: id => captured.delete(id) }; const event = values => ({ pointerId: 1, button: 0, buttons: 1, isPrimary: true, clientX: 10, clientY: 10, currentTarget: element, preventDefault() {}, stopPropagation() {}, ...values }); find(node => node.props['aria-label'] === `Move ${roster.find(player => player.id === playerId).name}`).props.onPointerDown(event({})); flush(); return { captured, event }; },
    changeTeam(id) { props.teamId = id; dirty = true; flush(); },
    unmount() { slots.forEach(slot => slot?.cleanup?.()); },
  };
}

test('actual lineup pointer handlers show a ghost and target, swap occupied slots, and save/reload the existing chart', () => environment(env => {
  setAssignment('team', 'a', '1-LW'); setAssignment('team', 'b', '1-C');
  const view = mount(), gesture = view.start(); env.target('1-C'); view.root().props.onPointerMove(gesture.event({ clientX: 60 })); view.flush();
  assert.ok(view.find(node => node.props.className === 'lc-drag-ghost'));
  assert.match(view.find(node => node.props['data-lineup-drop'] === '1-C').props.className, /is-drop-target/);
  view.root().props.onPointerUp(gesture.event({ clientX: 60 })); view.flush();
  assert.deepEqual(getDepthChart('team'), { a: '1-C', b: '1-LW' }); assert.equal(view.changes.length, 1); assert.equal(gesture.captured.size, 0);
  assert.equal(view.find(node => node.props.className === 'lc-drag-ghost'), undefined); assert.match(view.text(), /Alex and Blair swapped places/);
  view.unmount(); const restored = mount(); assert.ok(restored.find(node => node.props['aria-label'] === 'Line 1 · C: Alex. Choose a player.')); restored.unmount();
}));

test('bench remains a drop target when empty, keyboard pickers swap and unassign, and quota failure preserves the shown lineup', () => environment(env => {
  setAssignment('team', 'a', '1-LW'); setAssignment('team', 'b', '1-C'); setAssignment('team', 'c', 'G-S');
  const view = mount(); assert.ok(view.find(node => node.props['data-lineup-drop'] === 'bench'));
  view.click('Line 1 · LW: Alex. Choose a player.'); view.select('b'); view.click('Save position');
  assert.deepEqual(getDepthChart('team'), { a: '1-C', b: '1-LW', c: 'G-S' });
  view.click('Move Alex'); view.select('bench'); view.click('Save position'); assert.deepEqual(getDepthChart('team'), { b: '1-LW', c: 'G-S' });
  const gesture = view.start('a'); env.target('2-LW'); view.root().props.onPointerMove(gesture.event({ clientX: 70 })); view.flush(); env.fail(true);
  view.root().props.onPointerUp(gesture.event({ clientX: 70 })); view.flush();
  assert.match(view.text(), /could not be saved/); assert.ok(view.find(node => node.props['aria-label'] === 'Choose a position for Alex'));
  assert.ok(view.find(node => node.props['aria-label'] === 'Line 2 · LW: Empty. Choose a player.')); assert.deepEqual(getDepthChart('team'), { b: '1-LW', c: 'G-S' }); view.unmount();
}));

test('outside-team drops, Escape, team changes and unmount cancel active gestures without writes', () => environment(env => {
  setAssignment('team', 'a', '1-LW'); setAssignment('other', 'a', 'G-B'); const before = env.storage.get('rinkreads_depth_charts_v1');
  const view = mount(); let gesture = view.start(); env.target('1-C', false); view.root().props.onPointerMove(gesture.event({ clientX: 80 })); view.flush(); view.root().props.onPointerUp(gesture.event({ clientX: 80 })); view.flush();
  assert.equal(env.storage.get('rinkreads_depth_charts_v1'), before);
  gesture = view.start(); env.target('1-C'); view.root().props.onPointerMove(gesture.event({ clientX: 80 })); view.flush(); view.root().props.onKeyDown({ key: 'Escape' }); view.flush(); view.root().props.onPointerUp(gesture.event({ clientX: 80 })); view.flush(); assert.equal(view.changes.length, 0);
  gesture = view.start(); view.changeTeam('other'); view.root().props.onPointerUp(gesture.event({ clientX: 80 })); view.flush(); assert.equal(env.storage.get('rinkreads_depth_charts_v1'), before);
  gesture = view.start(); view.root().props.onPointerMove(gesture.event({ clientX: 80 })); view.flush(); view.unmount(); assert.equal(gesture.captured.size, 0); assert.equal(env.listeners.size, 0);
}));

test('App uses the extracted lineup component without changing its team/roster/onChange integration', () => {
  const app = readFileSync(new URL('../App.jsx', import.meta.url), 'utf8');
  assert.match(app, /import DepthChartSection from "\.\/coach\/LineupCard\.jsx"/);
  assert.match(app, /<DepthChartSection teamId=\{t\.id\} roster=\{roster\} onChange=\{onBumpQuestFlags\}/);
  assert.doesNotMatch(app, /function DepthChartSection\(/);
});
