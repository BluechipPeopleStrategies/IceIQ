import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const output = new URL('../../node_modules/.cache/player-learning-home/component.mjs', import.meta.url);
mkdirSync(new URL('./', output), { recursive: true });
await build({ entryPoints: [fileURLToPath(new URL('./PlayerLearningHome.jsx', import.meta.url))], outfile: fileURLToPath(output), bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' }, logLevel: 'silent', plugins: [{ name: 'home-view-tests', setup(api) {
  api.onResolve({ filter: /^react$/ }, () => ({ path: 'hooks', namespace: 'home-hooks' }));
  api.onLoad({ filter: /.*/, namespace: 'home-hooks' }, () => ({ contents: ['useState', 'useEffect', 'useId'].map(name => `export const ${name}=(...args)=>globalThis.__homeHooks.${name}(...args);`).join('\n') }));
  api.onResolve({ filter: /qbLoader\.js$/ }, () => ({ path: 'catalog', namespace: 'home-bank' }));
  api.onLoad({ filter: /.*/, namespace: 'home-bank' }, () => ({ contents: 'export const loadQB=()=>globalThis.__homeBank();' }));
} }] });
const { default: PlayerLearningHome, PlayerLearningHomeView } = await import(output.href);

function mount(props = {}, Component = PlayerLearningHomeView) {
  const slots = [], navigations = []; let cursor = 0, tree, effects = [];
  const hooks = {
    useState(initial) { const slot = slots[cursor++] ||= { value: typeof initial === 'function' ? initial() : initial }; return [slot.value, value => { slot.value = typeof value === 'function' ? value(slot.value) : value; }]; },
    useId() { return 'home-test'; },
    useEffect(run, deps) { const index = cursor++, old = slots[index]; if (!old || deps.some((v, i) => !Object.is(v, old.deps[i]))) { old?.cleanup?.(); const current = slots[index] = { deps }; effects.push(() => { current.cleanup = run(); }); } },
  };
  let current = { player: { id: 'home-a', level: 'U13 / Peewee', quizHistory: [{}, {}] }, onNavigate: action => navigations.push(action), ...props };
  const text = node => typeof node === 'string' || typeof node === 'number' ? String(node) : Array.isArray(node) ? node.map(text).join('') : node?.props ? text(node.props.children) : '';
  function render() { cursor = 0; effects = []; globalThis.__homeHooks = hooks; try { tree = Component(current); } finally { delete globalThis.__homeHooks; } effects.forEach(effect => effect()); }
  function all(predicate) { const found = []; const visit = node => { if (Array.isArray(node)) return node.forEach(visit); if (!node?.props) return; if (predicate(node)) found.push(node); visit(node.props.children); }; visit(tree); return found; }
  render();
  return { all, navigations, render, tree: () => tree, text: () => text(tree), setProps(next) { current = { ...current, ...next }; render(); }, clickWhere(predicate) { const button = all(node => node.type === 'button' && predicate(node))[0]; assert.ok(button); button.props.onClick(); render(); }, dispose() { slots.forEach(slot => slot?.cleanup?.()); } };
}

test('home exposes six worlds, real mission names and all six main navigation actions without awarding credit', () => {
  const saved = globalThis.localStorage;
  globalThis.localStorage = { getItem() { throw Error('View must not read storage'); }, setItem() { throw Error('View must not write storage'); } };
  try {
    const view = mount();
    assert.equal(view.all(node => node.props['data-world-id']).length, 6);
    assert.equal(view.all(node => node.props['data-home-action']).length, 6);
    view.clickWhere(node => node.props['data-world-id'] === 'defensive-play');
    assert.match(view.text(), /Manage the space in front/);
    view.clickWhere(node => node.props['data-action'] === 'world');
    assert.deepEqual(view.navigations.at(-1), { id: 'learn', ageBand: 'U13', worldId: 'defensive-play' });
    for (const id of ['learn', 'practice', 'experimental', 'goals', 'training', 'progress']) view.clickWhere(node => node.props['data-home-action'] === id);
    assert.deepEqual(view.navigations.slice(1).map(action => action.id), ['learn', 'practice', 'experimental', 'goals', 'training', 'progress']);
    assert.match(view.text(), /Activity history · 2 quiz sessions/);
    assert.doesNotMatch(view.text(), /64 levels|Unlocked|Path complete|\bXP\b|Captain|review due|Mastered/);
  } finally { if (saved === undefined) delete globalThis.localStorage; else globalThis.localStorage = saved; }
});

test('age and profile changes retain correct curriculum and never show another scope’s practice totals', () => {
  const view = mount({ masteryState: { playerId: 'home-a', ageBand: 'U13', status: 'ready', summary: { groups: [{ ageBand: 'U13', eligibleAvailable: 8, distinctQuestions: 8, mastered: true }] } } });
  assert.match(view.text(), /Groups practised1/);
  view.clickWhere(node => node.props['data-world-id'] === 'defensive-play');
  view.setProps({ ageBand: 'U7' });
  assert.match(view.text(), /No separate curriculum missions for U7/);
  assert.match(view.text(), /Loading this player’s practice record/);
  assert.doesNotMatch(view.text(), /Groups practised1/);
  view.setProps({ player: { id: 'home-b', level: 'U18' }, ageBand: 'U18' });
  assert.equal(view.all(node => node.props['data-world-id'] === 'hockey-sense' && node.props['aria-pressed']).length, 1);
  view.clickWhere(node => node.props['data-home-action'] === 'practice');
  assert.deepEqual(view.navigations.at(-1), { id: 'practice', ageBand: 'U18' });
});

test('a late catalog result after switching profiles neither reads the old ledger nor replaces current state', async () => {
  const previousWindow = globalThis.window, previousStorage = globalThis.localStorage;
  const pending = [], reads = [];
  globalThis.window = { addEventListener() {}, removeEventListener() {} };
  globalThis.localStorage = { getItem(key) { reads.push(key); return null; }, setItem() { throw Error('Home cannot award progress'); } };
  globalThis.__homeBank = () => new Promise(resolve => pending.push(resolve));
  const settle = () => new Promise(resolve => setImmediate(resolve));
  let home;
  try {
    home = mount({}, PlayerLearningHome);
    home.setProps({ player: { id: 'home-b', level: 'U9' } });
    pending[0]({}); await settle(); home.render();
    assert.equal(reads.length, 0);
    assert.equal(home.tree().props.masteryState.status, 'loading');
    pending[1]({}); await settle(); home.render();
    assert.deepEqual(reads, ['rinkreads_spaced_mastery_v1:home-b']);
    assert.equal(home.tree().props.masteryState.playerId, 'home-b');
    assert.equal(home.tree().props.masteryState.ageBand, 'U9');
    assert.equal(home.tree().props.masteryState.status, 'ready');
  } finally {
    home?.dispose(); delete globalThis.__homeBank;
    if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow;
    if (previousStorage === undefined) delete globalThis.localStorage; else globalThis.localStorage = previousStorage;
  }
});
