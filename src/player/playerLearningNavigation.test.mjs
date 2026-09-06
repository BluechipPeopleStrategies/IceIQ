import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const path = fileURLToPath(new URL('../one-on-one/PracticeHub.jsx', import.meta.url));
const output = new URL('../../node_modules/.cache/practice-hub/component.mjs', import.meta.url);
mkdirSync(new URL('./', output), { recursive: true });
await build({ entryPoints: [path], outfile: fileURLToPath(output), bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' }, logLevel: 'silent', plugins: [{ name: 'hub-navigation-tests', setup(api) {
  api.onResolve({ filter: /^react$/ }, () => ({ path: 'hooks', namespace: 'hub-hooks' }));
  api.onLoad({ filter: /.*/, namespace: 'hub-hooks' }, () => ({ contents: `export const useState=(...args)=>globalThis.__hubHooks.useState(...args); export const Suspense=()=>null; export const lazy=load=>Object.assign(()=>null,{load});` }));
  api.onResolve({ filter: /\.jsx$/ }, args => args.importer === path ? { path: args.path, namespace: 'hub-child' } : undefined);
  api.onLoad({ filter: /.*/, namespace: 'hub-child' }, args => ({ contents: `const Child=()=>null; Child.displayName=${JSON.stringify(args.path.split('/').at(-1).replace('.jsx', ''))}; export default Child; export const RinkReadsLogo=Child; export const draftFromPlay=value=>value;` }));
} }] });
const { default: PracticeHub, initialHubNavigation } = await import(output.href);

function mount(search = '', props = {}) {
  const slots = []; let index = 0, tree;
  const previous = globalThis.window; globalThis.window = { location: { search } };
  const hooks = { useState(initial) { const slot = slots[index++] ||= { value: typeof initial === 'function' ? initial() : initial }; return [slot.value, value => { slot.value = typeof value === 'function' ? value(slot.value) : value; }]; } };
  const text = node => typeof node === 'string' || typeof node === 'number' ? String(node) : Array.isArray(node) ? node.map(text).join('') : node?.props ? text(node.props.children) : '';
  function render() { index = 0; globalThis.__hubHooks = hooks; try { tree = PracticeHub({ player: { id: 'nav-player', level: 'U11 / Atom' }, ...props }); } finally { delete globalThis.__hubHooks; } }
  function all(predicate) { const found = []; const visit = node => { if (Array.isArray(node)) return node.forEach(visit); if (!node?.props) return; if (predicate(node)) found.push(node); visit(node.props.children); }; visit(tree); return found; }
  render(); if (previous === undefined) delete globalThis.window; else globalThis.window = previous;
  return { all, render, text: () => text(tree), click(label) { const button = all(node => node.type === 'button' && text(node) === label)[0]; assert.ok(button, label); button.props.onClick(); render(); }, async component(name) { for (const node of all(node => typeof node.type === 'function')) { const displayName = node.type.load ? (await node.type.load()).default.displayName : node.type.displayName; if (name === displayName) return node; } } };
}

 test('player session entry overrides public URL and returns home without a reload', async()=>{
 let returned=0;
 const view=mount('?arena=experimental', {initialSearch:'?arena=library&age=U13',onBack:()=>returned++});
 const library=await view.component('PracticeLibrary');
 assert.ok(library);
 assert.equal(library.props.ageBand,'U13');
 assert.equal(library.props.playerId,'nav-player');
 view.click('Back to Home');
 assert.equal(returned,1);
 });

test('world entry keeps the requested age and domain in the player session',async()=>{
 const view=mount('',{initialSearch:'arena=worlds&age=U13&world=offensive-play'});
 const worlds=await view.component('LearningWorlds');
 assert.equal(worlds.props.ageBand,'U13');
 assert.equal(worlds.props.initialWorldId,'offensive-play');
});
