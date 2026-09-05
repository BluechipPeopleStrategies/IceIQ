import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { createElement } from 'react';
import Reconciler from 'react-reconciler';

const modulePath = new URL('./rinkDiscoveryCore.js', import.meta.url);
const core = existsSync(modulePath) ? await import(modulePath.href) : {};
const requireCore = () => assert.equal(typeof core.checkRinkDiscoveryPoint, 'function', 'Rink discovery needs geometric feature checks');

test('faceoff identification accepts any painted circle, including its edge, but not a nearby neutral dot or empty ice', () => {
  requireCore();
  for (const centre of [{ x: 0, y: 0 }, ...[-20.7264, 20.7264].flatMap(x => [-6.7056, 6.7056].map(y => ({ x, y })))]) {
    assert.equal(core.checkRinkDiscoveryPoint('circle', centre), true);
    assert.equal(core.checkRinkDiscoveryPoint('circle', { x: centre.x + 4.572, y: centre.y }), true);
  }
  assert.equal(core.checkRinkDiscoveryPoint('circle', { x: 6, y: 6.7 }), false);
  assert.equal(core.checkRinkDiscoveryPoint('circle', { x: 12, y: 0 }), false);
});

test('blue-line checks use both actual painted lines and reject the centre and goal lines', () => {
  requireCore();
  for (const x of [-7.62, 7.62]) for (const y of [-12, 0, 12]) assert.equal(core.checkRinkDiscoveryPoint('blue-line', { x, y }), true);
  for (const x of [0, 5.8, 10, 26.91384]) assert.equal(core.checkRinkDiscoveryPoint('blue-line', { x, y: 0 }), false);
});

test('net checks include both rendered frames and the net volume behind the goal line, without treating the crease as the net', () => {
  requireCore();
  const goalX = core.RINK_DISCOVERY_GEOMETRY.goalX;
  for (const side of [-1, 1]) {
    assert.equal(core.checkRinkDiscoveryPoint('net', { x: side * goalX, y: .9144 }), true);
    assert.equal(core.checkRinkDiscoveryPoint('net', { x: side * (goalX + 1.7), y: 0 }), true, 'A raised net projects behind its ice footprint when tapped');
    assert.equal(core.checkRinkDiscoveryPoint('net', { x: side * (goalX - 2), y: 0 }), false);
    assert.equal(core.checkRinkDiscoveryPoint('net', { x: side * goalX, y: 3 }), false);
  }
});

test('puck checks use its actual position; invalid or out-of-rink points never earn a star', () => {
  requireCore();
  const puck = core.RINK_DISCOVERY_GEOMETRY.puck;
  assert.equal(core.checkRinkDiscoveryPoint('puck', puck), true);
  assert.equal(core.checkRinkDiscoveryPoint('puck', { x: puck.x + .7, y: puck.y + .3 }), true);
  assert.equal(core.checkRinkDiscoveryPoint('puck', { x: puck.x + 3, y: puck.y }), false);
  for (const point of [null, {}, { x: NaN, y: 0 }, { x: '7.62', y: 0 }, { x: Infinity, y: 0 }, { x: 7.62, y: 20 }, { x: 30.48, y: 12.954 }]) {
    for (const id of ['circle', 'blue-line', 'net', 'puck']) assert.equal(core.checkRinkDiscoveryPoint(id, point), false);
  }
  assert.equal(core.checkRinkDiscoveryPoint('unknown', puck), false);
});

test('wrong taps and retries preserve earned stars, and repeated correct taps cannot farm rewards', () => {
  requireCore();
  const original = core.createRinkDiscoverySession(), before = JSON.stringify(original);
  const wrong = core.answerRinkDiscovery(original, { x: 12, y: 0 });
  assert.equal(wrong.status, 'try-again');
  assert.deepEqual(wrong.found, []);
  assert.deepEqual(core.advanceRinkDiscovery(wrong), wrong, 'A question cannot be skipped without finding the feature');
  const found = core.answerRinkDiscovery(wrong, { x: 0, y: 0 });
  assert.equal(found.status, 'found');
  assert.deepEqual(found.found, ['circle']);
  for (let i = 0; i < 10; i++) assert.deepEqual(core.answerRinkDiscovery(found, { x: 0, y: 0 }), found);
  assert.equal(JSON.stringify(original), before, 'The input session is immutable');
  const next = core.advanceRinkDiscovery(found);
  const nextWrong = core.answerRinkDiscovery(next, { x: 0, y: 0 });
  assert.deepEqual(nextWrong.found, ['circle']);
  assert.equal(nextWrong.index, 1);
});

test('four finds finish the untimed session; replay creates a fresh local four-star session', () => {
  requireCore();
  let session = core.createRinkDiscoverySession();
  for (const point of [{ x: 0, y: 0 }, { x: 7.62, y: 0 }, { x: core.RINK_DISCOVERY_GEOMETRY.goalX, y: 0 }, core.RINK_DISCOVERY_GEOMETRY.puck]) {
    session = core.advanceRinkDiscovery(core.answerRinkDiscovery(session, point));
  }
  assert.equal(session.complete, true);
  assert.equal(session.found.length, 4);
  assert.deepEqual(core.answerRinkDiscovery(session, { x: 0, y: 0 }), session);
  assert.deepEqual(core.advanceRinkDiscovery(session), session);
  const replay = core.createRinkDiscoverySession();
  assert.equal(replay.complete, false);
  assert.deepEqual(replay.found, []);
  assert.equal('timer' in session, false);
  assert.equal('xp' in session, false);
});

test('the four numbered keyboard spots each select one different feature using the same geometric checker', () => {
  requireCore();
  assert.equal(core.RINK_DISCOVERY_SPOTS.length, 4);
  const ids = core.RINK_DISCOVERY_PROMPTS.map(prompt => prompt.id);
  const matches = core.RINK_DISCOVERY_SPOTS.map(spot => ids.filter(id => core.checkRinkDiscoveryPoint(id, spot)));
  assert.ok(matches.every(list => list.length === 1));
  assert.deepEqual(new Set(matches.flat()), new Set(ids));
});

test('the actual tour supports wrong answers, keyboard and ice answers, completion, replay and cleanup without a profile write', async () => {
  const cache = new URL('../../node_modules/.cache/rink-discovery-test/', import.meta.url);
  mkdirSync(cache, { recursive: true });
  const output = new URL('tour.mjs', cache);
  await build({
    entryPoints: [fileURLToPath(new URL('./RinkDiscovery.jsx', import.meta.url))], outfile: fileURLToPath(output), bundle: true,
    packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' }, logLevel: 'silent',
    plugins: [{ name: 'tour-scene-boundary', setup(api) {
      api.onResolve({ filter: /^react$/ }, () => ({ path: 'react', external: true }));
      api.onResolve({ filter: /ScenarioRinkView\.jsx$/ }, () => ({ path: 'scene', namespace: 'tour-test' }));
      api.onLoad({ filter: /.*/, namespace: 'tour-test' }, () => ({ contents: "import {createElement} from 'react'; export default function Scene(props){return createElement('rink-scene',props)}" }));
    } }],
  });
  const { default: Tour } = await import(output.href);
  const globals = ['requestAnimationFrame', 'cancelAnimationFrame', 'localStorage', 'fetch'];
  const prior = Object.fromEntries(globals.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  const frames = new Map(); let frameId = 0, exited = 0, focused = 0;
  globalThis.requestAnimationFrame = callback => { frames.set(++frameId, callback); return frameId; };
  globalThis.cancelAnimationFrame = id => frames.delete(id);
  globalThis.localStorage = { getItem() { throw new Error('The tour must not read a player profile'); }, setItem() { throw new Error('The tour must not write a player profile'); } };
  globalThis.fetch = () => { throw new Error('The tour must not request AI or save to a server'); };
  const noop = () => {}, hostContext = {}, container = { children: [] };
  const append = (parent, child) => parent.children.push(child);
  const remove = (parent, child) => parent.children.splice(parent.children.indexOf(child), 1);
  const renderer = Reconciler({
    now: () => performance.now(), supportsMutation: true, isPrimaryRenderer: true,
    getRootHostContext: () => hostContext, getChildHostContext: () => hostContext, getPublicInstance: value => value,
    prepareForCommit: () => null, resetAfterCommit: noop,
    createInstance: (type, props) => ({ type, props, children: [], focus: () => { focused++; }, scrollIntoView: noop }),
    createTextInstance: text => ({ text }), appendInitialChild: append, appendChild: append, appendChildToContainer: append,
    removeChild: remove, removeChildFromContainer: remove,
    insertBefore: (parent, child, before) => parent.children.splice(parent.children.indexOf(before), 0, child),
    insertInContainerBefore: (parent, child, before) => parent.children.splice(parent.children.indexOf(before), 0, child),
    clearContainer: parent => { parent.children = []; }, finalizeInitialChildren: () => false, shouldSetTextContent: () => false,
    prepareUpdate: () => true, commitUpdate: (node, _payload, _type, _old, props) => { node.props = props; },
    commitTextUpdate: (node, _old, text) => { node.text = text; }, resetTextContent: noop, detachDeletedInstance: noop,
    scheduleTimeout: setTimeout, cancelTimeout: clearTimeout, noTimeout: -1,
  });
  const root = renderer.createContainer(container, 0, null, false, null, '', error => { throw error; }, null);
  const flush = action => { renderer.flushSync(action || noop); while (renderer.flushPassiveEffects()) { /* settle effects */ } };
  const textOf = node => node.text ?? (node.children || []).map(textOf).join('');
  const find = (predicate, node = container) => { if (predicate(node)) return node; for (const child of node.children || []) { const match = find(predicate, child); if (match) return match; } return null; };
  const button = label => find(node => node.type === 'button' && textOf(node) === label);
  const click = label => { const item = button(label); assert.ok(item, `${label} must be reachable`); assert.notEqual(item.props.disabled, true); flush(item.props.onClick); };
  const scene = () => find(node => node.type === 'rink-scene');
  try {
    flush(() => renderer.updateContainer(createElement(Tour, { onBack: () => { exited++; } }), root, null));
    assert.equal(scene().props.hideZoneLines, false);
    assert.equal(scene().props.showBothGoals, true);
    assert.equal(scene().props.labelledActors, false);
    assert.deepEqual(scene().props.bounds, core.RINK_DISCOVERY_GEOMETRY.bounds);
    click('Show a hint'); assert.match(textOf(container), /big circle painted/);
    click('1'); assert.match(textOf(container), /Keep looking/);
    click('Try again'); assert.ok(!textOf(container).includes('Keep looking'));
    const originalCircleClick = button('3').props.onClick;
    click('3'); assert.match(textOf(container), /1 \/ 4/);
    flush(originalCircleClick); assert.match(textOf(container), /1 \/ 4/);
    assert.equal(scene().props.onIcePoint, undefined, 'Solved prompts stop accepting scene taps');
    assert.equal(scene().props.fallback.props.onPoint, undefined);
    click('Next find'); assert.match(textOf(container), /Where is a blue line/);
    assert.ok(!textOf(container).includes('big circle painted'), 'Hints reset for a new feature');
    flush(() => scene().props.onIcePoint({ x: -7.62, y: 4 }));
    click('Next find'); click('2'); click('Next find'); click('4'); click('See my stars');
    assert.equal(scene(), null, 'Completion releases the drawing surface');
    assert.match(textOf(container), /4 \/ 4/);
    assert.match(textOf(container), /You explored the rink/);
    for (const callback of frames.values()) callback(); frames.clear();
    assert.equal(focused, 1, 'Only the latest explicit navigation requests focus');
    click('Play again'); assert.match(textOf(container), /0 \/ 4/);
    assert.equal(typeof scene().props.onIcePoint, 'function');
    click('Back to practice'); assert.equal(exited, 1);
  } finally {
    flush(() => renderer.updateContainer(null, root, null));
    assert.equal(frames.size, 0, 'Unmount cancels pending navigation work');
    for (const name of globals) { if (prior[name]) Object.defineProperty(globalThis, name, prior[name]); else delete globalThis[name]; }
  }
});
