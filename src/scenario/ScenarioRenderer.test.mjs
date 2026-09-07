import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
const cache = new URL('../../node_modules/.cache/scenario-renderer-tests/', import.meta.url);
mkdirSync(cache, { recursive: true });
const plugins = [{ name: 'renderer-harness', setup(api) {
  api.onLoad({ filter: /(?:ScenarioRenderer|MultiStepPlayer)\.jsx$/ }, args => ({ contents: readFileSync(args.path, 'utf8').replace(/from "react";/, 'from "test:hooks";') + (args.path.endsWith('ScenarioRenderer.jsx') ? '\nexport { FlatScenario, BoardMC };' : ''), loader: 'jsx' }));
  api.onResolve({ filter: /^test:hooks$/ }, () => ({ path: 'hooks', namespace: 'hooks' }));
  api.onLoad({ filter: /.*/, namespace: 'hooks' }, () => ({ contents: ['useState', 'useRef', 'useEffect'].map(name => `export const ${name}=(...args)=>globalThis.__rendererHooks.${name}(...args);`).join('\n') }));
  api.onResolve({ filter: /(?:Scenario3DInteraction\.jsx|shared\.jsx|registry\.js|reactionTime\.js|speak\.js)$/ }, args => ({ path: args.path, namespace: 'stub' }));
  api.onLoad({ filter: /.*/, namespace: 'stub' }, args => ({ contents: args.path.endsWith('registry.js') ? 'export const getPrimitive=()=>({});' : args.path.endsWith('reactionTime.js') ? 'export const logReactionTime=(...args)=>globalThis.__reactionRecords?.push(args);' : args.path.endsWith('speak.js') ? 'export const ttsSupported=()=>false; export const speakParts=()=>{}; export const stopSpeaking=()=>{}; export const getReadAloud=()=>false;' : args.path.endsWith('shared.jsx') ? 'export const C={},FONT={};export function Card(){return null;}' : 'export default function Scene(){return null;}' }));
} }];
for (const name of ['ScenarioRenderer', 'MultiStepPlayer']) await build({ entryPoints: [fileURLToPath(new URL(`./${name}.jsx`, import.meta.url))], outfile: fileURLToPath(new URL(`${name}.mjs`, cache)), bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic', logLevel: 'silent', plugins });
const { default: Renderer, FlatScenario, BoardMC } = await import(new URL('ScenarioRenderer.mjs', cache));
const { default: MultiStepPlayer } = await import(new URL('MultiStepPlayer.mjs', cache));
const same = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
const text = node => typeof node === 'string' || typeof node === 'number' ? String(node) : Array.isArray(node) ? node.map(text).join('') : node?.props ? text(node.props.children) : '';
function mount(Component, props) {
  const slots = []; let cursor = 0, tree, dirty = true, effects = [];
  const hooks = {
    useState(initial) { const slot = slots[cursor++] ||= { value: typeof initial === 'function' ? initial() : initial }; slot.set ||= value => { const next = typeof value === 'function' ? value(slot.value) : value; if (!Object.is(slot.value, next)) { slot.value = next; dirty = true; } }; return [slot.value, slot.set]; },
    useRef(value) { return slots[cursor++] ||= { current: value }; },
    useEffect(fn, deps) { const i = cursor++; if (!same(slots[i]?.deps, deps)) effects.push(() => { slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; }); },
  };
  const nodes = node => Array.isArray(node) ? node.flatMap(nodes) : node?.props ? [node, ...nodes(node.props.children)] : [];
  function flush() { for (let i = 0; dirty; i++) { assert.ok(i < 30); dirty = false; cursor = 0; effects = []; globalThis.__rendererHooks = hooks; try { tree = Component(props); } finally { delete globalThis.__rendererHooks; } effects.forEach(fn => fn()); } }
  const find = fn => nodes(tree).find(fn); flush();
  return { flush, find, tree: () => tree, text: () => text(tree), scene: () => find(node => node.props.onAvailabilityChange),
    click(label) { const button = find(node => node.type === 'button' && text(node) === label); assert.ok(button, label); assert.ok(!button.props.disabled); button.props.onClick(); flush(); },
    unmount() { slots.forEach(slot => slot?.cleanup?.()); },
  };
}
function fakeClock(run) {
  const original = { now: Date.now, setInterval, clearInterval }; let now = 0, next = 0; const intervals = new Map();
  Date.now = () => now; globalThis.setInterval = callback => { intervals.set(++next, callback); return next; }; globalThis.clearInterval = id => intervals.delete(id);
  try { run(ms => { now += ms; [...intervals.values()].forEach(callback => callback()); }); }
  finally { Date.now = original.now; globalThis.setInterval = original.setInterval; globalThis.clearInterval = original.clearInterval; }
}
const seed = JSON.parse(readFileSync(new URL('./seeds/u11_oz_corner_lw_crash_v1.json', import.meta.url)));

test('the player renderer contains no RinkStage or SVG fallback and mounts a fresh flat identity', () => {
  const source = readFileSync(new URL('./ScenarioRenderer.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /<RinkStage|<svg|Tactical board/);
  const a = Renderer({ scenario: seed }), b = Renderer({ scenario: { ...seed, id: 'next-question' } });
  assert.notEqual(a.key, b.key);
});

test('loading and failed-rink time never count; answer and timeout races emit once', () => fakeClock(advance => {
  const answers = [], view = mount(FlatScenario, { scenario: seed, onAnswer: answer => answers.push(answer) });
  advance(5000); view.flush(); assert.equal(answers.length, 0);
  view.scene().props.onAvailabilityChange(true); view.flush(); advance(400); view.flush();
  const stale = view.scene(); stale.props.onAvailabilityChange(false); stale.props.onAnswer({ ok: true }); view.flush();
  advance(5000); view.flush(); assert.equal(answers.length, 0);
  view.scene().props.onAvailabilityChange(true); view.flush(); advance(300); view.flush();
  const answer = view.scene().props.onAnswer; answer({ ok: true, reason: 'ok' }); answer({ ok: false, reason: 'timeout' }); view.flush();
  assert.equal(answers.length, 1); assert.equal(answers[0].ms, 700); assert.equal(answers[0].ok, true); view.unmount();
}));

test('preview time and decision deadline both pause on actual 3D unavailability', () => fakeClock(advance => {
  const answers = [], scenario = { ...seed, difficulty: 3, preview: { lockMs: 1000 }, timer: { duration: 800 } };
  const view = mount(FlatScenario, { scenario, onAnswer: answer => answers.push(answer) });
  advance(5000); view.flush(); assert.equal(view.scene().props.locked, true);
  view.scene().props.onAvailabilityChange(true); view.flush(); advance(600); view.flush();
  view.scene().props.onAvailabilityChange(false); view.flush(); advance(5000); view.flush();
  view.scene().props.onAvailabilityChange(true); view.flush(); advance(500); view.flush();
  assert.equal(view.scene().props.locked, false); assert.equal(answers.length, 0);
  advance(700); view.flush(); assert.equal(answers.length, 1); assert.equal(answers[0].reason, 'timeout'); assert.equal(answers[0].ms, 800);
  advance(3000); view.flush(); assert.equal(answers.length, 1); view.unmount();
}));

test('MC keeps original option indices and cannot submit while unavailable', () => fakeClock(advance => {
  const answers = [], scenario = { ...seed, mc: { opts: ['First choice', 'Second choice'], ok: 1 } };
  const view = mount(BoardMC, { scenario, onAnswer: answer => answers.push(answer) });
  assert.equal(view.find(node => node.type === 'button' && text(node).includes('Second choice')).props.disabled, true);
  view.scene().props.onAvailabilityChange(true); view.flush(); advance(600); view.flush();
  const stale = view.find(node => node.type === 'button' && text(node).includes('Second choice'));
  view.scene().props.onAvailabilityChange(false); stale.props.onClick(); view.flush(); assert.equal(answers.length, 0);
  view.scene().props.onAvailabilityChange(true); view.flush();
  view.find(node => node.type === 'button' && text(node).includes('Second choice')).props.onClick(); view.flush();
  assert.deepEqual(answers[0], { ok: true, reason: 'ok', ms: 600, picked: 1 }); assert.equal(view.scene().props.revealed, true); view.unmount();
}));

test('a continuation remounts answer state and emits one complete play result after per-read events', () => {
  const answers = [], scenario = { type: 'scenario', stage: seed.stage, id: 'two-reads', steps: [{ actors: seed.actors, interaction: seed.interaction, correct: seed.correct, feedback: seed.feedback }, { actors: seed.actors, interaction: seed.interaction, correct: seed.correct, feedback: seed.feedback }] };
  const view = mount(MultiStepPlayer, { scenario, onAnswer: answer => answers.push(answer) });
  const frame = () => view.find(node => node.props.scenario && node.props.onAnswer);
  const firstKey = frame().key; frame().props.onAnswer({ ok: true, ms: 200 }); view.flush(); view.click('Continue →');
  assert.notEqual(frame().key, firstKey); assert.equal(answers[0].complete, false);
  frame().props.onAnswer({ ok: false, ms: 300 }); view.flush(); view.click('See result →');
  assert.equal(answers.length, 3); assert.equal(answers[1].complete, false); assert.equal(answers[2].complete, true); assert.equal(answers[2].ok, false); view.unmount();
});
