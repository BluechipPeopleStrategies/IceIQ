import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { playsForAge } from './playCatalog.js';
import { ANIMATED_PLAY_EVENT_KEY } from './telemetry.js';

const cache = new URL('../../node_modules/.cache/read-the-play-test/', import.meta.url);
mkdirSync(cache, { recursive: true });
const output = new URL('component.mjs', cache);
await build({ entryPoints: [fileURLToPath(new URL('./ReadThePlay.jsx', import.meta.url))], outfile: fileURLToPath(output), bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' }, logLevel: 'silent', plugins: [{ name: 'catalog-harness', setup(api) {
  api.onResolve({ filter: /^react$/ }, () => ({ path: 'hooks', namespace: 'catalog' }));
  api.onLoad({ filter: /hooks/, namespace: 'catalog' }, () => ({ contents: 'export const useState=(...a)=>globalThis.__catalogHooks.useState(...a); export const useMemo=(...a)=>globalThis.__catalogHooks.useMemo(...a);' }));
  api.onResolve({ filter: /shared\.jsx$/ }, () => ({ path: 'shared', namespace: 'catalog' }));
  api.onLoad({ filter: /shared/, namespace: 'catalog' }, () => ({ contents: 'export const FONT={body:"sans-serif",display:"serif"}; export const StickyHeader=()=>null; export const BackBtn=()=>null;' }));
  api.onResolve({ filter: /AnimatedPlay\.jsx$/ }, () => ({ path: 'play', namespace: 'catalog' }));
  api.onLoad({ filter: /play/, namespace: 'catalog' }, () => ({ contents: 'export default function Player(){return null;}' }));
} }] });
const { default: ReadThePlay, playCardDetails } = await import(output.href);
const text = node => typeof node === 'string' || typeof node === 'number' ? String(node) : Array.isArray(node) ? node.map(text).join('') : node?.props ? text(node.props.children) : '';
function mount(events = []) {
  let cursor = 0, dirty = true, tree; const slots = [], store = new Map([[ANIMATED_PLAY_EVENT_KEY, JSON.stringify(events)]]), writes = [];
  globalThis.localStorage = { getItem: key => store.get(key) ?? null, setItem: (key, value) => { store.set(key, value); writes.push(key); } };
  const hooks = {
    useState(initial) { const slot = slots[cursor++] ||= { value: typeof initial === 'function' ? initial() : initial }; return [slot.value, value => { slot.value = typeof value === 'function' ? value(slot.value) : value; dirty = true; }]; },
    useMemo(fn, deps) { const index = cursor++; if (!slots[index] || deps.some((dep, i) => !Object.is(dep, slots[index].deps[i]))) slots[index] = { deps, value: fn() }; return slots[index].value; },
  };
  function flush() { while (dirty) { dirty = false; cursor = 0; globalThis.__catalogHooks = hooks; tree = ReadThePlay({ player: { level: 'U13 / Peewee' }, onBack: () => {} }); delete globalThis.__catalogHooks; } }
  function all(predicate) { const found = []; function visit(node) { if (Array.isArray(node)) return node.forEach(visit); if (!node?.props) return; if (predicate(node)) found.push(node); visit(node.props.children); } visit(tree); return found; }
  flush(); return { all, flush, writes, text: () => text(tree), player: () => all(node => node.props.play)[0] };
}

test('catalog format cards are based on real question nodes and filtering retains the exact source play', () => {
  const previous = globalThis.localStorage;
  try {
    const plays = playsForAge('U13'), ui = mount();
    for (const play of plays) {
      const card = ui.all(node => node.props['data-play-id'] === play.id)[0];
      assert.ok(card); assert.ok(text(card).includes(play.title));
      assert.equal(playCardDetails(play).reads, Object.values(play.nodes).filter(node => node.ask && !node.terminal && !node.autoNext).length);
    }
    const wanted = plays.find(play => playCardDetails(play).format === 'Spot the mistake');
    ui.all(node => node.type === 'select')[0].props.onChange({ target: { value: playCardDetails(wanted).family } }); ui.flush();
    assert.ok(ui.all(node => node.props['data-play-id']).every(node => playCardDetails(plays.find(play => play.id === node.props['data-play-id'])).family === playCardDetails(wanted).family));
    ui.all(node => node.props['data-play-id'] === wanted.id)[0].props.onClick(); ui.flush();
    assert.deepEqual(ui.player().props.play, wanted);
    ui.player().props.onNext(); ui.flush();
    assert.deepEqual(ui.player()?.props.play ?? null, plays[plays.indexOf(wanted) + 1] ?? null, 'Next remains source catalog order, independent of the filter.');
    assert.deepEqual(ui.writes, [], 'Browsing never creates new progress or content keys.');
  } finally { globalThis.localStorage = previous; }
});

test('recent result cards refresh from existing events and do not invent lifetime mastery or points', () => {
  const previous = globalThis.localStorage;
  try {
    const [first, second] = playsForAge('U13'), ui = mount([{ playId: first.id, event: 'answer', ok: false }]);
    assert.match(text(ui.all(node => node.props['data-play-id'] === first.id)[0]), /Missed it/);
    assert.equal(ui.all(node => node.props['data-featured-play'])[0].props['data-featured-play'], second.id);
    ui.all(node => node.props['data-play-id'] === first.id)[0].props.onClick(); ui.flush();
    ui.player().props.onEvent({ playId: first.id, nodeId: first.start, event: 'answer', answerId: 'source-answer', ok: true });
    ui.all(node => typeof node.props.onClick === 'function' && node.type !== 'button')[0].props.onClick(); ui.flush();
    assert.match(text(ui.all(node => node.props['data-play-id'] === first.id)[0]), /1 of 2 correct/);
    assert.match(ui.text(), /Recent practice is saved on this device/);
    assert.doesNotMatch(ui.text(), /\bXP\b|mastered|lifetime/i);
    assert.deepEqual(ui.writes, [ANIMATED_PLAY_EVENT_KEY]);
  } finally { globalThis.localStorage = previous; }
});
