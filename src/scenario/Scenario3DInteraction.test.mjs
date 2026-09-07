import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { toScenarioWorld, fromScenarioWorld } from './scenario3DAdapter.js';
import { resolveTarget } from './zones.js';

const source = new URL('./Scenario3DInteraction.jsx', import.meta.url);
const cache = new URL('../../node_modules/.cache/scenario-interaction-3d/', import.meta.url);
mkdirSync(cache, { recursive: true });
const output = new URL('interaction.mjs', cache);
await build({ stdin: { contents: readFileSync(source, 'utf8').replace("from 'react';", "from 'test:scenario-hooks';"), resolveDir: fileURLToPath(new URL('.', source)), sourcefile: fileURLToPath(source), loader: 'jsx' }, outfile: fileURLToPath(output), bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' }, logLevel: 'silent', plugins: [{ name: 'scenario-controls', setup(api) {
  api.onResolve({ filter: /^test:scenario-hooks$/ }, () => ({ path: 'hooks', namespace: 'hooks' }));
  api.onLoad({ filter: /.*/, namespace: 'hooks' }, () => ({ contents: ['useState', 'useRef', 'useEffect', 'useMemo'].map(name => `export const ${name}=(...args)=>globalThis.__scenarioControlHooks.${name}(...args);`).join('\n') }));
  api.onResolve({ filter: /ScenarioRinkView\.jsx$/ }, () => ({ path: 'scene', namespace: 'scene' }));
  api.onLoad({ filter: /.*/, namespace: 'scene' }, () => ({ contents: 'export default function Scene(){return null;}' }));
} }] });
const { default: Interaction } = await import(output.href);
const same = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
function mount(scenario, extra = {}) {
  const answers = [], slots = []; let cursor = 0, dirty = true, tree, effects = [];
  const props = { scenario, onAnswer: answer => answers.push(answer), ...extra };
  const hooks = {
    useState(initial) { const slot = slots[cursor++] ||= { value: typeof initial === 'function' ? initial() : initial }; slot.set ||= value => { const next = typeof value === 'function' ? value(slot.value) : value; if (!Object.is(next, slot.value)) { slot.value = next; dirty = true; } }; return [slot.value, slot.set]; },
    useRef(initial) { return slots[cursor++] ||= { current: initial }; },
    useMemo(fn, deps) { const i = cursor++; if (!same(slots[i]?.deps, deps)) slots[i] = { value: fn(), deps }; return slots[i].value; },
    useEffect(fn, deps) { const i = cursor++; if (!same(slots[i]?.deps, deps)) effects.push(() => { slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; }); },
  };
  const text = node => typeof node === 'string' || typeof node === 'number' ? String(node) : Array.isArray(node) ? node.map(text).join('') : node?.props ? text(node.props.children) : '';
  const nodes = node => Array.isArray(node) ? node.flatMap(nodes) : node?.props ? [node, ...nodes(node.props.children)] : [];
  function flush() { for (let i = 0; dirty; i++) { assert.ok(i < 30); dirty = false; cursor = 0; effects = []; globalThis.__scenarioControlHooks = hooks; try { tree = Interaction(props); } finally { delete globalThis.__scenarioControlHooks; } effects.forEach(run => run()); } }
  const find = fn => nodes(tree).find(fn);
  const scene = () => find(node => node.props.state && node.props.onAvailabilityChange);
  flush();
  return { answers, scene, flush, find, text: () => text(tree), nodes: () => nodes(tree),
    ready(value = true) { scene().props.onAvailabilityChange(value); flush(); },
    update(next) { Object.assign(props, next); dirty = true; flush(); },
    click(label) { const button = find(node => node.type === 'button' && text(node) === label); assert.ok(button, label); assert.ok(!button.props.disabled, `${label} is disabled`); button.props.onClick(); flush(); },
    unmount() { slots.forEach(slot => slot?.cleanup?.()); },
  };
}
const seed = id => JSON.parse(readFileSync(new URL(`./seeds/${id}.json`, import.meta.url)));
const base = kind => ({ id: `test-${kind}`, level: 'U11', stage: { view: 'right', zone: 'off-zone' }, actors: [{ id: 'you', kind: 'player', tag: 'YOU', x: .55, y: .5 }, { id: 'f2', kind: 'teammate', tag: 'F2', x: .8, y: .2 }, { id: 'f3', kind: 'teammate', tag: 'F3', x: .8, y: .8 }, { id: 'd1', kind: 'defender', tag: 'D1', x: .65, y: .5 }], interaction: { kind, prompt: 'Read the play.', from: ['f2', 'f3'] }, correct: { kind, ids: ['f3'] } });

test('source placement uses 3D input and unchanged normalized grades, including failure and retry', () => {
  const scenario = seed('u11_oz_corner_lw_crash_v1'), view = mount(scenario);
  assert.deepEqual(view.scene().props.editableIds, []);
  assert.equal(view.nodes().some(node => node.type === 'svg'), false);
  view.ready();
  const target = resolveTarget(scenario.correct.placements[0]);
  view.scene().props.onMove('slot_lw', toScenarioWorld(target)); view.flush();
  const snapshot = structuredClone(view.scene().props.state), oldScene = view.scene();
  const check = view.find(node => node.type === 'button' && node.props.children === 'Check positions');
  oldScene.props.onAvailabilityChange(false);
  oldScene.props.onMove('slot_lw', toScenarioWorld({ x: .6, y: .9 })); check.props.onClick(); view.flush();
  assert.equal(view.answers.length, 0); assert.deepEqual(view.scene().props.state, snapshot);
  view.ready(); view.click('Check positions');
  assert.equal(view.answers.length, 1); assert.equal(view.answers[0].ok, true);
  assert.deepEqual(view.answers[0].positions.slot_lw, fromScenarioWorld(toScenarioWorld(target)));
  view.update({ revealed: true });
  assert.ok(view.scene().props.overlays.polylines.some(line => line.id === 'answer-0'));
  view.unmount();
});

test('point input remains exact and keyboard choice submits through the same scorer once', () => {
  const scenario = { ...base('point'), interaction: { kind: 'point', prompt: 'Choose a spot.' }, correct: { kind: 'point', x: .51, y: .5, tolerance: .001 } };
  const view = mount(scenario); view.ready();
  view.find(node => node.props['aria-label'] === 'Move right').props.onClick(); view.flush();
  view.click('Choose this spot');
  assert.equal(view.answers[0].ok, true); assert.equal(view.answers[0].point.x, .51);
  assert.equal(view.answers.length, 1); view.unmount();
});

test('single and multiple selection retain ID keys; failures block stale actor callbacks', () => {
  const single = mount(base('selection')); single.ready();
  const scene = single.scene(); scene.props.onAvailabilityChange(false); scene.props.onActorAnswer('f3'); single.flush();
  assert.equal(single.answers.length, 0); single.ready(); single.scene().props.onActorAnswer('f3'); single.flush();
  assert.deepEqual(single.answers[0].picked, ['f3']); assert.equal(single.answers[0].ok, true); single.unmount();
  const scenario = base('selection'); scenario.correct.ids = ['f2', 'f3']; const multi = mount(scenario); multi.ready();
  multi.click('F3'); multi.click('F2'); assert.equal(multi.answers.length, 0); multi.click('Check choices');
  assert.deepEqual(multi.answers[0].picked, ['f3', 'f2']); assert.equal(multi.answers[0].ok, true); multi.unmount();
});

test('ordered questions keep order and do not grade a duplicate click as the next actor', () => {
  const scenario = base('sequence'); scenario.correct.ids = ['f3', 'f2'];
  const view = mount(scenario); view.ready(); view.scene().props.onActorAnswer('f3'); view.flush();
  view.scene().props.onActorAnswer('f3'); view.flush(); assert.equal(view.answers.length, 0);
  view.click('F2'); assert.deepEqual(view.answers[0].picked, ['f3', 'f2']); assert.equal(view.answers[0].ok, true); view.unmount();
});

test('waypoint path begins at authored actor and preserves interception and undo', () => {
  const scenario = base('path'); scenario.interaction.from = 'you'; scenario.correct = { kind: 'path', end: { x: .8, y: .5, tolerance: .03 } };
  const view = mount(scenario); view.ready();
  view.scene().props.onIcePoint(toScenarioWorld({ x: .8, y: .5 })); view.flush();
  view.click('Undo last point'); assert.equal(view.scene().props.overlays.polylines.some(line => line.id === 'your-route'), false);
  view.scene().props.onIcePoint(toScenarioWorld({ x: .8, y: .5 })); view.flush(); view.click('Check route');
  assert.deepEqual(view.answers[0].userPath[0], { x: .55, y: .5 }); assert.equal(view.answers[0].reason, 'intercepted'); assert.equal(view.answers[0].intercepterId, 'd1'); view.unmount();
});

test('MC scene never enables a hidden interactive answer path or reveals keys before an answer', () => {
  const view = mount(seed('u11_dz_coverage_place_v1'), { interactive: false }); view.ready();
  assert.deepEqual(view.scene().props.editableIds, []); assert.equal(view.scene().props.onIcePoint, undefined);
  assert.deepEqual(view.scene().props.overlays.polylines, []);
  assert.doesNotMatch(view.text(), /Check positions|Move with buttons/); view.unmount();
});
