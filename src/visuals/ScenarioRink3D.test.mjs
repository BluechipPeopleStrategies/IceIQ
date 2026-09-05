import test from 'node:test';
import assert from 'node:assert/strict';
import { getEventListeners } from 'node:events';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { OrthographicCamera, Vector3 } from 'three';
import { createElement } from 'react';
import Reconciler from 'react-reconciler';
import { RINK_DISCOVERY_SPOTS, checkRinkDiscoveryPoint } from '../one-on-one/rinkDiscoveryCore.js';

const source = new URL('./ScenarioRink3D.jsx', import.meta.url);
const cache = new URL('../../node_modules/.cache/rinkreads-rink-input/', import.meta.url);
mkdirSync(cache, { recursive: true });
const output = new URL('input.mjs', cache);
await build({
  stdin: { contents: `${readFileSync(source, 'utf8')}\nexport { ActorControl, Content };`, resolveDir: fileURLToPath(new URL('.', source)), loader: 'jsx' },
  outfile: fileURLToPath(output), bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic', logLevel: 'silent',
  plugins: [{ name: 'scene-input-host', setup(api) {
    api.onResolve({ filter: /^react$/ }, () => ({ path: 'react', external: true }));
    api.onResolve({ filter: /^@react-three\/(fiber|drei)$/ }, args => ({ path: args.path, namespace: 'input-host' }));
    api.onLoad({ filter: /.*/, namespace: 'input-host' }, args => ({ contents: args.path.endsWith('fiber')
      ? 'export const useThree = () => globalThis.__rrRinkInputContext; export const Canvas = () => null;'
      : 'import { createElement } from "react"; export const Html = ({ children }) => createElement("html-host", null, children); export const Line = () => null;' }));
    api.onResolve({ filter: /(ScenarioCamera\.jsx|Skater\.jsx|PracticeScene\.jsx)$/ }, () => ({ path: 'visual-hosts', namespace: 'scene-host' }));
    api.onLoad({ filter: /.*/, namespace: 'scene-host' }, () => ({ contents: 'export default function Host() { return null; } export const Arena = Host, Ice = Host, Goal = Host, Puck = Host;' }));
  } }],
});
const { ActorControl, Content } = await import(output.href);

function surface() {
  const target = new EventTarget();
  target.ownerDocument = new EventTarget();
  target.captured = new Set(); target.released = [];
  target.setPointerCapture = id => target.captured.add(id);
  target.hasPointerCapture = id => target.captured.has(id);
  target.releasePointerCapture = id => { target.captured.delete(id); target.released.push(id); };
  target.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 400 });
  return target;
}

function harness(Component) {
  const noop = () => {}, host = {}, instances = [], canvas = surface();
  const camera = new OrthographicCamera(-10, 10, 10, -10, .1, 100);
  camera.position.set(0, 20, -15); camera.up.set(0, 0, -1); camera.lookAt(0, 0, -15); camera.updateMatrixWorld();
  const previous = globalThis.__rrRinkInputContext;
  const context = { camera, gl: { domElement: canvas }, size: { width: 400, height: 400 }, invalidate: noop };
  globalThis.__rrRinkInputContext = context;
  const renderer = Reconciler({
    now: () => performance.now(), supportsMutation: true, isPrimaryRenderer: true,
    getRootHostContext: () => host, getChildHostContext: () => host, getPublicInstance: value => value,
    prepareForCommit: () => null, resetAfterCommit: noop,
    createInstance: (type, props) => { const node = Object.assign(surface(), { type, props }); node.ownerDocument = canvas.ownerDocument; instances.push(node); return node; },
    createTextInstance: text => ({ text }), appendInitialChild: noop, appendChild: noop, appendChildToContainer: noop,
    removeChild: noop, removeChildFromContainer: noop, insertBefore: noop, insertInContainerBefore: noop, clearContainer: noop,
    finalizeInitialChildren: () => false, shouldSetTextContent: () => false,
    prepareUpdate: () => true, commitUpdate: (node, payload, type, oldProps, props) => { node.props = props; },
    commitTextUpdate: noop, resetTextContent: noop, detachDeletedInstance: noop,
    scheduleTimeout: setTimeout, cancelTimeout: clearTimeout, noTimeout: -1,
  });
  const root = renderer.createContainer({}, 0, null, false, null, '', error => { throw error; }, null);
  const render = props => renderer.flushSync(() => renderer.updateContainer(props ? createElement(Component, props) : null, root, null));
  const button = () => instances.find(node => node.type === 'button');
  const act = (name, extra = {}) => {
    const node = button();
    renderer.flushSync(() => node.props[name]({ pointerId: 1, pointerType: 'touch', button: 0, isPrimary: true, clientX: 200, clientY: 200, currentTarget: node, stopPropagation: noop, ...extra }));
  };
  return { canvas, context, camera, render, button, act, instances,
    dispose() { render(null); renderer.flushPassiveEffects(); if (previous === undefined) delete globalThis.__rrRinkInputContext; else globalThis.__rrRinkInputContext = previous; },
  };
}
function emit(target, type, extra = {}) {
  const event = new Event(type, { cancelable: true });
  Object.assign(event, { pointerId: 1, pointerType: 'touch', button: 0, isPrimary: true, clientX: 200, clientY: 200, ...extra });
  target.dispatchEvent(event);
}
function actorProps(overrides = {}) {
  return { actor: { id: 'F2', label: 'YOU', team: 'home', x: 16, y: 2 }, selected: true, cameraAdjusting: false, labelledActors: true,
    onSelect() {}, onMove() {}, onDragStart() {}, onDragEnd() {}, ...overrides };
}
function contentProps(overrides = {}) {
  return { frame: { actors: [], puck: null }, frameRef: { current: { actors: [], puck: null } }, bounds: { minX: 0, maxX: 30, minY: -12, maxY: 12 },
    cameraPreset: 'broadcast', cameraAdjusting: false, selectedActorId: 'F2', editableIds: ['F2'], labelledActors: true, overlays: {}, onIcePoint() {}, ...overrides };
}

test('actor drag preserves the grabbed offset and only its matching pointer may finish it', () => {
  const h = harness(ActorControl), moves = []; let ends = 0;
  try {
    h.render(actorProps({ onMove: (id, point) => moves.push({ id, point }), onDragEnd: () => ends++ }));
    h.act('onPointerDown');
    for (const handler of ['onPointerUp', 'onPointerCancel', 'onLostPointerCapture']) h.act(handler, { pointerId: 2, isPrimary: false });
    assert.equal(ends, 0, 'An unrelated release must not end the primary drag');
    assert.deepEqual(h.button().released, []);
    h.act('onPointerMove', { clientX: 240, clientY: 180 });
    assert.equal(moves.length, 1);
    assert.equal(moves[0].id, 'F2');
    assert.ok(Math.abs(moves[0].point.x - 17) < 1e-8);
    assert.ok(Math.abs(moves[0].point.y - 4) < 1e-8, 'The 2 m initial offset from the label grab must remain');
    h.act('onPointerUp'); h.act('onLostPointerCapture');
    assert.equal(ends, 1); assert.deepEqual(h.button().released, [1]);
  } finally { h.dispose(); }
});

test('camera adjustment and actor unmount cancel captured drags exactly once', () => {
  for (const interruption of ['camera', 'unmount']) {
    const h = harness(ActorControl), moves = []; let ends = 0;
    const props = actorProps({ onMove: (id, point) => moves.push(point), onDragEnd: () => ends++ });
    try {
      h.render(props); h.act('onPointerDown');
      h.render(interruption === 'camera' ? { ...props, cameraAdjusting: true } : null);
      assert.equal(ends, 1, `${interruption} must release Content's dragging state`);
      assert.deepEqual(h.button().released, [1]);
      h.act('onPointerMove', { clientX: 260 });
      h.act('onPointerUp');
      assert.equal(moves.length, 0); assert.equal(ends, 1);
    } finally { h.dispose(); }
    assert.equal(getEventListeners(h.canvas.ownerDocument, 'pointerdown').length, 0);
  }
});

test('a second finger anywhere cancels an actor drag and its later primary movement', () => {
  const h = harness(ActorControl), moves = []; let ends = 0;
  const props = actorProps({ onMove: (id, point) => moves.push(point), onDragEnd: () => ends++ });
  try {
    h.render(props); h.act('onPointerDown');
    // This event is outside the actor and does not call its React handler.
    emit(h.canvas.ownerDocument, 'pointerdown', { pointerId: 2, isPrimary: false });
    assert.equal(ends, 1); assert.deepEqual(h.button().released, [1]);
    h.act('onPointerMove', { clientX: 260 }); h.act('onPointerUp');
    assert.equal(moves.length, 0); assert.equal(ends, 1);
    // Rendering another animation frame must not cancel a new deliberate drag.
    h.act('onPointerDown', { pointerId: 3 });
    h.render({ ...props, actor: { ...props.actor }, onDragEnd: () => ends++ });
    h.act('onPointerMove', { pointerId: 3, clientX: 220 });
    assert.equal(moves.length, 1);
    h.act('onPointerUp', { pointerId: 3 }); assert.equal(ends, 2);
  } finally { h.dispose(); }
  assert.equal(getEventListeners(h.canvas.ownerDocument, 'pointerdown').length, 0);
});

test('removing the editable actor releases dragging so fresh ice taps still work', () => {
  const h = harness(Content), points = [];
  const props = contentProps({ frame: { actors: [actorProps().actor], puck: null }, onSelect() {}, onIcePoint: point => points.push(point) });
  try {
    h.render(props); h.act('onPointerDown');
    h.render({ ...props, editableIds: [] });
    assert.deepEqual(h.button().released, [1]);
    emit(h.canvas, 'pointerdown'); emit(h.canvas, 'pointerup');
    assert.equal(points.length, 1, 'Actor removal must not strand the parent in dragging mode');
  } finally { h.dispose(); }
});

test('ice taps cannot cross a preset, scalar bounds or viewport change, while equivalent frame bounds preserve a tap', () => {
  for (const change of ['preset', 'minX', 'maxX', 'minY', 'maxY', 'width', 'height']) {
    const h = harness(Content), points = [];
    const props = contentProps({ onIcePoint: point => points.push(point) });
    try {
      h.render(props); emit(h.canvas, 'pointerdown');
      const next = { ...props, bounds: { ...props.bounds } };
      if (change === 'preset') next.cameraPreset = 'behind-net';
      else if (change === 'width' || change === 'height') h.context.size = { ...h.context.size, [change]: 500 };
      else next.bounds[change] += 1;
      h.render(next); emit(h.canvas, 'pointerup');
      assert.equal(points.length, 0, `A pending tap must be cancelled when ${change} changes`);
      assert.deepEqual(h.canvas.released, [1]);
      emit(h.canvas, 'pointerdown');
      h.render({ ...next, bounds: { ...next.bounds } });
      emit(h.canvas, 'pointerup');
      assert.equal(points.length, 1, 'A fresh tap must survive equivalent bounds in a new frame object');
      assert.ok(new Vector3(points[0].x, 0, points[0].y).toArray().every(Number.isFinite));
    } finally { h.dispose(); }
    assert.equal(getEventListeners(h.canvas, 'pointerdown').length, 0);
  }
});

test('numbered rink badges choose the exact marked feature and stop when found or adjusting the camera', () => {
  const h = harness(Content), points = [], stopped = [];
  const props = contentProps({ overlays: { targets: RINK_DISCOVERY_SPOTS }, onIcePoint: point => points.push(point) });
  try {
    h.render(props);
    const badges = h.instances.filter(node => node.type === 'button');
    assert.equal(badges.length, 4, 'Every offset number needs an actual keyboard and touch button');
    for (const [index, badge] of badges.entries()) {
      assert.equal(badge.props['aria-label'], `Choose spot ${index + 1} on rink`);
      assert.equal(badge.props.disabled, false);
      badge.props.onPointerDown({ stopPropagation: () => stopped.push('down') });
      badge.props.onClick({ stopPropagation: () => stopped.push('click') });
      assert.deepEqual(points[index], { x: RINK_DISCOVERY_SPOTS[index].x, y: RINK_DISCOVERY_SPOTS[index].y });
    }
    assert.equal(checkRinkDiscoveryPoint('blue-line', points[0]), true, 'Badge 1 must choose the blue line, not its offset screen location');
    assert.equal(checkRinkDiscoveryPoint('puck', points[3]), true, 'Badge 4 must choose the puck, not its offset screen location');
    assert.equal(stopped.length, 8);
    for (const disabled of [{ ...props, onIcePoint: undefined }, { ...props, cameraAdjusting: true }]) {
      h.render(disabled);
      for (const badge of badges) {
        assert.equal(badge.props.disabled, true);
        badge.props.onClick({ stopPropagation() {} });
      }
    }
    assert.equal(points.length, 4, 'Found/read-only and camera-adjusting views must not answer');
  } finally { h.dispose(); }
});
