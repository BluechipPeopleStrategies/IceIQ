import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { createElement } from 'react';
import Reconciler from 'react-reconciler';

const cache = new URL('../../node_modules/.cache/rinkreads-tracking-session/', import.meta.url);
mkdirSync(cache, { recursive: true });
const output = new URL('TrackingDrill.mjs', cache);
await build({
  entryPoints: [fileURLToPath(new URL('./TrackingDrill.jsx', import.meta.url))],
  outfile: fileURLToPath(output), bundle: true, packages: 'external',
  platform: 'node', format: 'esm', jsx: 'automatic', logLevel: 'silent',
});
const { default: TrackingDrill } = await import(output.href);

// A small host renderer runs the actual React component, effects, event handlers,
// adaptive engine and storage. Only the browser drawing surface and clock are
// substituted. It does not inspect or change the drill's hook/ref state.
function mountDrill() {
  const noop = () => {};
  const context = new Proxy({
    measureText: text => ({ width: String(text).length * 7 }),
    createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }),
  }, { get: (target, key) => key in target ? target[key] : noop });
  const hostContext = {};
  const append = (parent, child) => { parent.children.push(child); };
  const remove = (parent, child) => { parent.children.splice(parent.children.indexOf(child), 1); };
  const insert = (parent, child, before) => { parent.children.splice(parent.children.indexOf(before), 0, child); };
  const renderer = Reconciler({
    now: () => performance.now(), supportsMutation: true, isPrimaryRenderer: true,
    getRootHostContext: () => hostContext, getChildHostContext: () => hostContext,
    getPublicInstance: instance => instance,
    prepareForCommit: () => null, resetAfterCommit: noop,
    createInstance: (type, props) => ({
      type, props, children: [], style: {}, clientWidth: 350,
      getContext: () => context,
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 350, height: 217 }),
    }),
    createTextInstance: text => ({ text }),
    appendInitialChild: append, appendChild: append, appendChildToContainer: append,
    removeChild: remove, removeChildFromContainer: remove,
    insertBefore: insert, insertInContainerBefore: insert,
    clearContainer: container => { container.children = []; },
    finalizeInitialChildren: () => false,
    shouldSetTextContent: () => false,
    prepareUpdate: () => true,
    commitUpdate: (instance, _payload, _type, _oldProps, props) => { instance.props = props; },
    commitTextUpdate: (instance, _oldText, text) => { instance.text = text; },
    resetTextContent: noop, detachDeletedInstance: noop,
    scheduleTimeout: setTimeout, cancelTimeout: clearTimeout, noTimeout: -1,
  });
  const container = { children: [] };
  const root = renderer.createContainer(container, 0, null, false, null, '', error => { throw error; }, null);
  const flush = action => {
    renderer.flushSync(action || noop);
    while (renderer.flushPassiveEffects()) { /* effects may update result state */ }
  };
  const contents = node => node.text ?? (node.children || []).map(contents).join('');
  const find = (predicate, node = container) => {
    if (predicate(node)) return node;
    for (const child of node.children || []) {
      const match = find(predicate, child);
      if (match) return match;
    }
    return null;
  };
  flush(() => renderer.updateContainer(createElement(TrackingDrill, { playerId: 'repeat-player', onExit: noop }), root, null));
  return {
    flush,
    click(label) {
      const button = find(node => node.type === 'button' && contents(node).trim().startsWith(label));
      assert.ok(button, `The actual ${label} control must be available`);
      flush(() => button.props.onClick());
    },
    text: () => contents(container),
    unmount: () => flush(() => renderer.updateContainer(null, root, null)),
  };
}

test('Baylor’s Pick records both completed sessions when Go again reuses the mounted drill', () => {
  const originals = Object.fromEntries(['window', 'localStorage', 'performance', 'requestAnimationFrame', 'cancelAnimationFrame']
    .map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const values = new Map();
  const listeners = new Map();
  const frames = new Map();
  let time = 1000, nextFrame = 0, app;
  Object.defineProperties(globalThis, {
    window: { configurable: true, value: {
      innerHeight: 844, devicePixelRatio: 1,
      addEventListener: (name, listener) => {
        if (!listeners.has(name)) listeners.set(name, new Set());
        listeners.get(name).add(listener);
      },
      removeEventListener: (name, listener) => listeners.get(name)?.delete(listener),
    } },
    localStorage: { configurable: true, value: {
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, String(value)),
    } },
    performance: { configurable: true, value: { now: () => time } },
    requestAnimationFrame: { configurable: true, value: fn => { frames.set(++nextFrame, fn); return nextFrame; } },
    cancelAnimationFrame: { configurable: true, value: id => frames.delete(id) },
  });
  const stored = () => JSON.parse(values.get('rinkreads_gym_v1') || '{}')['repeat-player']?.tracking;
  const step = ms => {
    time += ms;
    const pending = [...frames];
    pending.forEach(([id]) => frames.delete(id));
    app.flush(() => pending.forEach(([, fn]) => fn(time)));
  };
  const key = value => app.flush(() => {
    for (const listener of [...(listeners.get('keydown') || [])]) {
      listener({ key: value, code: `Digit${value}`, repeat: false, preventDefault() {} });
    }
  });
  const complete = () => {
    step(16); // start's scheduled canvas setup
    for (let shift = 0; shift < 5; shift++) {
      app.click('Start shift');
      step(3000); // actual watch -> tracking transition
      step(12000); // actual tracking -> pick transition
      for (const number of ['1', '2', '3']) key(number);
      app.click('Lock in');
      app.click(shift === 4 ? 'See the result' : 'Next shift');
    }
    assert.match(app.text(), /Session complete/);
  };
  try {
    app = mountDrill();
    app.click('Start');
    complete();
    assert.equal(stored().sessions.length, 1);
    const first = structuredClone(stored().sessions[0]);
    app.click('Go again');
    assert.equal(stored().sessions.length, 1, 'Starting again must not save an unfinished session');
    complete();
    assert.equal(stored().sessions.length, 2, 'The second completion must append a new session');
    assert.deepEqual(stored().sessions[0], first, 'The first completed session must remain unchanged');
    assert.ok(stored().sessions.every(session => Number.isFinite(session.points) && Number.isFinite(session.level)));
    app.flush();
    assert.equal(stored().sessions.length, 2, 'Result rerenders must not duplicate a completed session');
  } finally {
    app?.unmount();
    for (const [key, descriptor] of Object.entries(originals)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});
