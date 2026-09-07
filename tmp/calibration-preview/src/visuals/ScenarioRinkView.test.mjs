import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

// Run the real wrapper state, callbacks and JSX contract without a browser or
// WebGL. The suspended scene is opaque; its loading fallback is checked below.
const sourceFile = new URL('./ScenarioRinkView.jsx', import.meta.url);
const cache = new URL('../../node_modules/.cache/rinkreads-scenario-view/', import.meta.url);
mkdirSync(cache, { recursive: true });
const output = new URL('view.mjs', cache);
const source = readFileSync(sourceFile, 'utf8').replace(/^import .* from 'react';/m,
  "import { Component, lazy, Suspense } from 'react';\nimport { useCallback, useMemo, useRef, useState } from 'test:view-hooks';");
await build({
  stdin: { contents: source, resolveDir: fileURLToPath(new URL('.', sourceFile)), sourcefile: fileURLToPath(sourceFile), loader: 'jsx' },
  outfile: fileURLToPath(output), bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' }, logLevel: 'silent',
  plugins: [{ name: 'view-state-harness', setup(api) {
    api.onResolve({ filter: /^test:view-hooks$/ }, () => ({ path: 'hooks', namespace: 'view-test' }));
    api.onLoad({ filter: /.*/, namespace: 'view-test' }, () => ({ contents: ['useState', 'useMemo', 'useCallback', 'useRef'].map(name => `export const ${name} = (...args) => globalThis.__rrScenarioViewHooks.${name}(...args);`).join('\n') }));
    api.onResolve({ filter: /ScenarioRink3D\.jsx$/ }, () => ({ path: 'scene', namespace: 'view-test-scene' }));
    api.onLoad({ filter: /.*/, namespace: 'view-test-scene' }, () => ({ contents: 'export default function Scene() { return null; }' }));
  } }],
});
const { default: ScenarioRinkView } = await import(output.href);

const textOf = node => typeof node === 'string' || typeof node === 'number' ? String(node)
  : Array.isArray(node) ? node.map(textOf).join('') : node?.props ? textOf(node.props.children) : '';
function nodesOf(node, includeFallback = false) {
  if (Array.isArray(node)) return node.flatMap(value => nodesOf(value, includeFallback));
  if (!node?.props) return [];
  if (node.type?.displayName === 'CameraViewControls') return [node, ...nodesOf(node.type(node.props), includeFallback)];
  return [node, ...nodesOf(node.props.children, includeFallback), ...(includeFallback ? nodesOf(node.props.fallback, true) : [])];
}
function mountView(props) {
  const slots = [];
  let cursor, tree;
  const hooks = {
    useState(initial) {
      const index = cursor++;
      slots[index] ||= { value: typeof initial === 'function' ? initial() : initial };
      return [slots[index].value, value => { slots[index].value = typeof value === 'function' ? value(slots[index].value) : value; }];
    },
    useMemo(factory, deps) {
      const index = cursor++;
      if (!slots[index] || deps.some((value, i) => !Object.is(value, slots[index].deps[i]))) slots[index] = { value: factory(), deps };
      return slots[index].value;
    },
    useCallback(callback, deps) {
      const index = cursor++;
      if (!slots[index] || !deps.every((value, i) => Object.is(value, slots[index].deps[i]))) slots[index] = { callback, deps };
      return slots[index].callback;
    },
    useRef(initial) { const index = cursor++; return (slots[index] ||= { current: initial }); },
  };
  const render = () => {
    const previous = globalThis.__rrScenarioViewHooks;
    globalThis.__rrScenarioViewHooks = hooks; cursor = 0;
    try { tree = ScenarioRinkView(props); }
    finally { if (previous === undefined) delete globalThis.__rrScenarioViewHooks; else globalThis.__rrScenarioViewHooks = previous; }
  };
  const find = predicate => nodesOf(tree).find(predicate);
  const button = label => find(node => node.type === 'button' && (node.props['aria-label'] || textOf(node)) === label);
  render();
  return {
    render, find, button, text: () => textOf(tree), nodes: includeFallback => nodesOf(tree, includeFallback),
    click(label) { const node = button(label); assert.ok(node, `Expected ${label}`); node.props.onClick(); render(); },
    scene: () => find(node => node.props.state === props.state && typeof node.props.onFailure === 'function'),
  };
}
function sceneProps(extra = {}) {
  return {
    state: { time: .37, actors: [{ id: 'F1', label: 'F1', team: 'home', x: 10, y: 2 }, { id: 'D1', label: 'D1', team: 'away', x: 16, y: 0 }], puck: { x: 11, y: 2.4, owner: 'F1' } },
    selectedActorId: 'D1', focusActorId: 'F1', editableIds: ['D1'], onMove() {},
    fallback: { type: 'svg', props: { children: 'DEFERRED_TACTICAL_ARTIFACT' } },
    ...extra,
  };
}

test('initial and loading surfaces never expose a tactical board or its deferred artifact', () => {
  const view = mountView(sceneProps());
  assert.ok(view.scene());
  assert.equal(view.button('Tactical board'), undefined);
  const suspense = view.find(node => node.type === Symbol.for('react.suspense'));
  assert.ok(suspense);
  assert.match(textOf(suspense.props.fallback), /Preparing the rink/);
  for (const node of view.nodes(true)) assert.doesNotMatch(textOf(node), /Tactical board|DEFERRED_TACTICAL_ARTIFACT/);
  assert.equal(view.nodes(true).some(node => node.type === 'svg' && !node.props['aria-hidden']), false, 'Only decorative camera icons can be SVG; the rink remains 3D.');
});

test('scene failure and retry remount only 3D and retain exact state, selection, focus and camera', () => {
  const props = sceneProps(), snapshot = structuredClone(props.state), view = mountView(props);
  view.click('Overhead'); view.click('Adjust camera'); view.click('Move view');
  const originalBoundary = view.find(node => node.props.onFailure && node.props.fallback);
  const failure = view.scene().props.onFailure;
  failure(); view.render();
  assert.equal(view.scene(), undefined);
  assert.ok(view.button('Retry 3D rink'));
  assert.doesNotMatch(view.text(), /Tactical board|DEFERRED_TACTICAL_ARTIFACT/);
  view.click('Retry 3D rink');
  const scene = view.scene(), newBoundary = view.find(node => node.props.onFailure && node.props.fallback);
  assert.ok(scene);
  assert.notEqual(newBoundary.key, originalBoundary.key, 'Retry must clear the failed boundary and remount its scene');
  assert.strictEqual(scene.props.state, props.state);
  assert.deepEqual(props.state, snapshot);
  assert.equal(scene.props.selectedActorId, 'D1');
  assert.equal(scene.props.focusActorId, 'F1');
  assert.equal(scene.props.cameraPreset, 'overhead');
  assert.equal(scene.props.cameraAdjusting, false);
  assert.strictEqual(scene.props.onMove, props.onMove);
});

test('render-boundary errors offer the same retry without mounting any deferred board', () => {
  const view = mountView(sceneProps());
  const node = view.find(item => item.props.onFailure && item.props.fallback);
  const boundary = new node.type(node.props);
  boundary.state = node.type.getDerivedStateFromError(new Error('WebGL setup failed'));
  assert.match(textOf(boundary.render()), /Retry 3D rink/);
  assert.doesNotMatch(textOf(boundary.render()), /Tactical board|DEFERRED_TACTICAL_ARTIFACT/);
  boundary.componentDidCatch(); view.render();
  assert.ok(view.button('Retry 3D rink'));
});

test('availability reports failure immediately and reports recovery only after the retried scene is ready', () => {
  const events = [], props = sceneProps({ onAvailabilityChange: available => events.push(available) });
  const view = mountView(props);
  assert.deepEqual(events, [], 'Initial loading must not claim a ready scene');
  view.scene().props.onReady(); view.render();
  assert.deepEqual(events, [true]);
  view.scene().props.onFailure(); view.render();
  assert.deepEqual(events, [true, false]);
  view.click('Retry 3D rink');
  assert.deepEqual(events, [true, false], 'Pressing Retry must not re-enable lesson controls before WebGL is ready');
  view.scene().props.onReady(); view.render();
  assert.deepEqual(events, [true, false, true]);
  assert.strictEqual(view.scene().props.state, props.state);
});

test('ready and failure callbacks notify the current caller after a parent update', () => {
  const oldEvents = [], newEvents = [];
  const props = sceneProps({ onAvailabilityChange: value => oldEvents.push(value) });
  const view = mountView(props), oldSceneReady = view.scene().props.onReady;
  props.onAvailabilityChange = value => newEvents.push(value);
  view.render();
  oldSceneReady();
  view.scene().props.onFailure(); view.render();
  assert.deepEqual(oldEvents, []);
  assert.deepEqual(newEvents, [true, false]);
});

test('hidden and unlabelled puck policies reach the scene and do not name the answer in the legend', () => {
  for (const puckPresentation of ['hidden', 'unlabelled']) {
    const props = sceneProps({ puckPresentation }), view = mountView(props);
    assert.equal(view.scene().props.puckPresentation, puckPresentation);
    assert.strictEqual(view.scene().props.state.puck, props.state.puck, 'Presentation must not remove or alter canonical puck state');
    const legend = view.find(node => node.props.className === 'srv-legend');
    assert.ok(legend);
    assert.doesNotMatch(textOf(legend), /puck/i);
  }
  const highlighted = mountView(sceneProps({ puckPresentation: 'highlighted' }));
  assert.match(textOf(highlighted.find(node => node.props.className === 'srv-legend')), /Puck/);
});

test('all four camera angles show the same scenario and reset only the camera', () => {
  const props = sceneProps(), view = mountView(props);
  for (const [label, preset] of [['Broadcast', 'broadcast'], ['Rink side', 'rink-side'], ['Behind net', 'behind-net'], ['Overhead', 'overhead']]) {
    view.click(label);
    assert.equal(view.button(label).props['aria-pressed'], true);
    assert.equal(view.scene().props.cameraPreset, preset);
    assert.strictEqual(view.scene().props.state, props.state);
  }
  const token = view.scene().props.cameraResetToken;
  view.click('Reset view');
  assert.equal(view.scene().props.cameraResetToken, token + 1);
  assert.equal(view.scene().props.selectedActorId, props.selectedActorId);
  assert.equal(view.scene().props.focusActorId, props.focusActorId);
});

test('Canvas native fallback remains inert text, never a mount effect that reports failure', () => {
  // Fiber 8 mounts native canvas fallback children even on supported browsers.
  // An effect component here would fail every healthy rink on its first mount.
  for (const relative of ['./ScenarioRink3D.jsx', '../one-on-one/ReadSequenceScene.jsx']) {
    const source = readFileSync(new URL(relative, import.meta.url), 'utf8');
    const canvasOpening = source.match(/<Canvas\b[\s\S]*?\bfallback=("[^"]*"|'[^']*'|\{)/);
    assert.ok(canvasOpening, `${relative} must retain native canvas fallback text`);
    assert.notEqual(canvasOpening[1], '{', `${relative}: no effect component in native canvas fallback`);
    // ReadSequence still offers its existing tactical-board route. The shared
    // scenario view uses retry-only recovery and must not promise that route.
    if (relative === './ScenarioRink3D.jsx') assert.doesNotMatch(canvasOpening[1], /Tactical board/);
  }
});
