import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { OrthographicCamera, Vector3 } from 'three';
import { createElement } from 'react';
import Reconciler from 'react-reconciler';
import { getReadSceneCamera } from '../one-on-one/readSequenceVisuals.js';

const source = new URL('./ScenarioCamera.jsx', import.meta.url);
const cache = new URL('../../node_modules/.cache/rinkreads-camera/', import.meta.url);
mkdirSync(cache, { recursive: true });
const output = new URL('camera.mjs', cache);
let cameraModule = {};
if (existsSync(source)) {
  await build({ entryPoints: [fileURLToPath(source)], outfile: fileURLToPath(output), bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic', logLevel: 'silent', plugins: [{ name: 'camera-canvas-context', setup(api) {
    api.onResolve({ filter: /^@react-three\/fiber$/ }, () => ({ path: 'context', namespace: 'camera-test' }));
    api.onLoad({ filter: /.*/, namespace: 'camera-test' }, () => ({ contents: 'export const useThree = () => globalThis.__rrScenarioCameraContext;' }));
  } }] });
  cameraModule = await import(output.href);
}

function surface() {
  const canvas = new EventTarget();
  const attributes = new Map();
  canvas.getAttribute = name => attributes.get(name) ?? null;
  canvas.setAttribute = (name, value) => attributes.set(name, String(value));
  canvas.removeAttribute = name => attributes.delete(name);
  canvas.ownerDocument = new EventTarget();
  canvas.style = { touchAction: 'pan-y' };
  canvas.clientWidth = 350; canvas.clientHeight = 420;
  canvas.setPointerCapture = () => {};
  canvas.releasePointerCapture = () => {};
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 350, height: 420 });
  return canvas;
}
function emit(target, type, extra = {}) {
  const event = new Event(type, { cancelable: true });
  Object.assign(event, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 100, clientY: 160, pageX: 100, pageY: 160, deltaY: 0, ...extra });
  target.dispatchEvent(event);
}
function camera() {
  const value = new OrthographicCamera(-12, 12, 15, -15, .1, 120);
  value.position.set(14, 24, -8); value.lookAt(0, 1, -18); value.updateMatrixWorld();
  return value;
}

test('camera adjustment owns drag/zoom only until cleanup, without an inertial animation loop', () => {
  assert.equal(typeof cameraModule.connectScenarioCameraControls, 'function', 'Camera adjustment must have a scoped native-input lifecycle');
  const canvas = surface(), view = camera(), target = [0, 1, -18];
  let changes = 0;
  const release = cameraModule.connectScenarioCameraControls(view, canvas, target, () => { changes++; });
  assert.equal(canvas.style.touchAction, 'none');
  assert.equal(canvas.getAttribute('tabindex'), '0', 'The actual canvas must be keyboard-focusable while adjusting');
  const initial = view.position.clone();
  emit(canvas, 'pointerdown');
  emit(canvas.ownerDocument, 'pointermove', { clientX: 155 });
  emit(canvas.ownerDocument, 'pointerup', { clientX: 155 });
  assert.ok(view.position.distanceTo(initial) > .1, 'Dragging must move the real Three camera');
  const zoom = view.zoom;
  emit(canvas, 'wheel', { deltaY: -120 });
  assert.ok(view.zoom > zoom, 'Wheel zoom must affect the real projection');
  assert.ok(changes > 0, 'Camera changes must request a demand frame');
  // Dispose even with an unfinished pointer: neither its release nor later
  // gestures may alter the camera or leave scrolling disabled.
  emit(canvas, 'pointerdown');
  release();
  assert.equal(canvas.style.touchAction, 'pan-y');
  assert.equal(canvas.getAttribute('tabindex'), null);
  const stopped = view.position.clone(), stoppedZoom = view.zoom, stoppedChanges = changes;
  emit(canvas.ownerDocument, 'pointermove', { clientX: 220 });
  emit(canvas.ownerDocument, 'pointerup', { clientX: 220 });
  emit(canvas, 'wheel', { deltaY: -120 });
  assert.deepEqual(view.position.toArray(), stopped.toArray());
  assert.equal(view.zoom, stoppedZoom);
  assert.equal(changes, stoppedChanges);
  assert.deepEqual(target, [0, 1, -18]);
});

test('independent camera surfaces retain separate controls and canvas keyboard adjustment', () => {
  assert.equal(typeof cameraModule.connectScenarioCameraControls, 'function');
  const first = surface(), second = surface(), a = camera(), b = camera();
  const releaseA = cameraModule.connectScenarioCameraControls(a, first, [0, 1, -18], () => {});
  const releaseB = cameraModule.connectScenarioCameraControls(b, second, [0, 1, -18], () => {});
  try {
    const oldA = a.position.clone(), oldB = b.position.clone();
    emit(first, 'keydown', { key: 'ArrowLeft' });
    assert.ok(a.position.distanceTo(oldA) > .1);
    assert.deepEqual(b.position.toArray(), oldB.toArray());
    releaseA();
    emit(second, 'keydown', { key: '+' });
    assert.ok(b.zoom > 1);
    assert.ok(new Vector3(...b.position.toArray()).toArray().every(Number.isFinite));
  } finally { releaseA(); releaseB(); }
});

test('touch rotation and pinch use the same scoped camera lifecycle and cancel cleanly', () => {
  const canvas = surface(), view = camera();
  const release = cameraModule.connectScenarioCameraControls(view, canvas, [0, 1, -18], () => {});
  const touch = (target, type, id, x, y = 160) => emit(target, type, { pointerType: 'touch', pointerId: id, pageX: x, clientX: x, pageY: y, clientY: y });
  try {
    const before = view.position.clone();
    touch(canvas, 'pointerdown', 1, 100);
    touch(canvas.ownerDocument, 'pointermove', 1, 145);
    assert.ok(view.position.distanceTo(before) > .1, 'One finger must rotate');
    touch(canvas, 'pointercancel', 1, 145);
    const cancelled = view.position.clone();
    touch(canvas.ownerDocument, 'pointermove', 1, 220);
    assert.deepEqual(view.position.toArray(), cancelled.toArray(), 'Cancelled touch must stop changing the camera');
    touch(canvas, 'pointerdown', 2, 100);
    touch(canvas, 'pointerdown', 3, 200);
    const zoom = view.zoom;
    touch(canvas.ownerDocument, 'pointermove', 3, 240);
    assert.ok(view.zoom > zoom, 'Spreading two fingers must zoom in');
    release();
    assert.equal(canvas.style.touchAction, 'pan-y');
    const ended = view.position.clone(), endedZoom = view.zoom;
    touch(canvas.ownerDocument, 'pointermove', 3, 300);
    touch(canvas.ownerDocument, 'pointerup', 2, 100);
    touch(canvas.ownerDocument, 'pointerup', 3, 300);
    assert.deepEqual(view.position.toArray(), ended.toArray());
    assert.equal(view.zoom, endedZoom);
  } finally { release(); }
});

test('the real camera component preserves an adjusted view across new frame objects and mode changes, fitting only changed framing', () => {
  assert.equal(typeof cameraModule.default, 'function');
  const canvas = surface(), view = camera(), noop = () => {}, host = {};
  const priorContext = globalThis.__rrScenarioCameraContext;
  globalThis.__rrScenarioCameraContext = { camera: view, gl: { domElement: canvas }, size: { width: 350, height: 420 }, invalidate: noop };
  // React runs the component's real layout effects. Only the surrounding R3F
  // Canvas context is supplied directly; this component has no host children.
  const renderer = Reconciler({
    now: () => performance.now(), supportsMutation: true, isPrimaryRenderer: true,
    getRootHostContext: () => host, getChildHostContext: () => host, getPublicInstance: value => value,
    prepareForCommit: () => null, resetAfterCommit: noop, createInstance: () => ({}), createTextInstance: () => ({}),
    appendInitialChild: noop, appendChild: noop, appendChildToContainer: noop, removeChild: noop, removeChildFromContainer: noop,
    insertBefore: noop, insertInContainerBefore: noop, clearContainer: noop, finalizeInitialChildren: () => false,
    shouldSetTextContent: () => false, prepareUpdate: () => null, commitUpdate: noop, commitTextUpdate: noop,
    resetTextContent: noop, detachDeletedInstance: noop, scheduleTimeout: setTimeout, cancelTimeout: clearTimeout, noTimeout: -1,
  });
  const root = renderer.createContainer({}, 0, null, false, null, '', error => { throw error; }, null);
  const render = props => renderer.flushSync(() => renderer.updateContainer(props ? createElement(cameraModule.default, props) : null, root, null));
  const bounds = { minX: 10, maxX: 29, minY: -8, maxY: 8 };
  try {
    render({ bounds });
    const fit = view.position.clone();
    render({ bounds, cameraAdjusting: true });
    assert.ok(view.position.distanceTo(fit) < 1e-9, 'Entering adjustment must not move the camera');
    emit(canvas, 'pointerdown'); emit(canvas.ownerDocument, 'pointermove', { clientX: 145 }); emit(canvas.ownerDocument, 'pointerup');
    emit(canvas, 'wheel', { deltaY: -120 });
    const adjusted = view.position.clone(), adjustedZoom = view.zoom;
    assert.ok(adjusted.distanceTo(fit) > .1);
    for (let frame = 0; frame < 6; frame++) render({ bounds: { ...bounds }, cameraAdjusting: true });
    assert.ok(view.position.distanceTo(adjusted) < 1e-9, 'Equivalent bounds from animation frames must not refit the camera');
    assert.equal(view.zoom, adjustedZoom);
    render({ bounds: { ...bounds }, cameraAdjusting: false });
    assert.ok(view.position.distanceTo(adjusted) < 1e-9, 'Returning to answering retains the adjusted angle');
    assert.equal(view.zoom, adjustedZoom);
    assert.equal(canvas.style.touchAction, 'pan-y');
    render({ bounds, cameraPreset: 'behind-net' });
    assert.deepEqual(view.position.toArray(), getReadSceneCamera(bounds, 350 / 420, 'behind-net').position);
    const wider = { ...bounds, minX: 0 };
    render({ bounds: wider, cameraPreset: 'behind-net' });
    assert.deepEqual(view.position.toArray(), getReadSceneCamera(wider, 350 / 420, 'behind-net').position);
    assert.equal(view.zoom, 1);
  } finally { render(null); if (priorContext === undefined) delete globalThis.__rrScenarioCameraContext; else globalThis.__rrScenarioCameraContext = priorContext; }
});
