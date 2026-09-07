import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const path = fileURLToPath(new URL('./PracticeHub.jsx', import.meta.url));
const output = new URL('../../node_modules/.cache/practice-hub/component.mjs', import.meta.url);
mkdirSync(new URL('./', output), { recursive: true });
await build({ entryPoints: [path], outfile: fileURLToPath(output), bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' }, logLevel: 'silent', plugins: [{ name: 'hub-navigation-tests', setup(api) {
  api.onResolve({ filter: /^react$/ }, () => ({ path: 'hooks', namespace: 'hub-hooks' }));
  api.onLoad({ filter: /.*/, namespace: 'hub-hooks' }, () => ({ contents: `export const useState=(...args)=>globalThis.__hubHooks.useState(...args); export const Suspense=()=>null; export const lazy=load=>Object.assign(()=>null,{load});` }));
  api.onResolve({ filter: /\.jsx$/ }, args => args.importer === path ? { path: args.path, namespace: 'hub-child' } : undefined);
  api.onLoad({ filter: /.*/, namespace: 'hub-child' }, args => ({ contents: `const Child=()=>null; Child.displayName=${JSON.stringify(args.path.split('/').at(-1).replace('.jsx', ''))}; export default Child; export const RinkReadsLogo=Child; export const draftFromPlay=x=>x;` }));
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

test('old SGS URLs retain their activity and discover opens the same foundation exercise under Learn', async () => {
  assert.ok(await mount('?arena=experimental').component('ExperimentalPractice'));
  assert.ok(await mount('?arena=worlds').component('LearningWorlds'));
  for (const search of ['?arena=sgs', '?arena=sgs&sgs=mixed', '?arena=sgs&sgs=position']) {
    const component = mount(search), workshop = await component.component('ScenarioWorkshop');
    assert.ok(workshop, search); assert.equal(workshop.props.playerId, 'nav-player'); assert.equal(workshop.props.hideDiscovery, true);
    assert.equal(initialHubNavigation(search).practice, 'position');
  }
  const discovery = mount('?arena=sgs&sgs=discover&age=U9');
  assert.ok(await discovery.component('RinkDiscovery')); assert.equal(await discovery.component('ScenarioWorkshop'), undefined);
  assert.equal(discovery.all(node => node.type === 'button' && node.props['aria-pressed'] && node.props.children === 'Learn the game').length, 1);
});

test('home world links keep the selected age and domain while unknown values use the active profile', async () => {
  const linked = await mount('?arena=worlds&age=U13&world=defensive-play').component('LearningWorlds');
  assert.equal(linked.props.ageBand, 'U13');
  assert.equal(linked.props.initialWorldId, 'defensive-play');
  const invalid = await mount('?arena=worlds&age=U99&world=made-up').component('LearningWorlds');
  assert.equal(invalid.props.ageBand, 'U11 / Atom');
  assert.equal(invalid.props.initialWorldId, undefined);
});

test('Practice and Learn contain purposeful choices and keep player identity through navigation without touching storage', async () => {
  const previous = globalThis.localStorage;
  globalThis.localStorage = { getItem() { throw Error('Navigation must not read attempt records'); }, setItem() { throw Error('Navigation must not write attempt records'); } };
  try {
    const component = mount(); assert.ok(await component.component('ReadSequence'));
    const nav = component.all(node => node.props['aria-label'] === 'RinkReads arena')[0];
    assert.deepEqual(nav.props.children.map(node => node.props.children), ['Practice', 'Learn the game', 'Play', 'Coach Lab', 'Brain Gym']);
    component.click('Find your position'); assert.ok(await component.component('ScenarioWorkshop'));
    component.click('Learn the game'); assert.ok(await component.component('LearningWorlds'));
    component.click('Guided lessons'); assert.ok(await component.component('GuidedCurriculum'));
    component.click('Lesson library'); const library = await component.component('PracticeLibrary'); assert.equal(library.props.playerId, 'nav-player'); assert.equal(library.props.ageBand, 'U11 / Atom');
    assert.doesNotMatch(component.text(), /Explore the rink/);
    component.click('Practice'); assert.ok(await component.component('ScenarioWorkshop')); component.click('Choose the play'); assert.ok(await component.component('ReadSequence'));
    assert.doesNotMatch(component.text(), /Scenario Lab|Your source library/);
    component.click('Coach Lab'); assert.ok(await component.component('CoachQuestionLab'));
    component.click('Animate a play'); assert.ok(await component.component('CoachLab'));
  } finally { if (previous === undefined) delete globalThis.localStorage; else globalThis.localStorage = previous; }
});

test('world actions open the selected existing lesson or concept at the chosen age', async () => {
  const component = mount(); component.click('Learn the game');
  const worlds = await component.component('LearningWorlds');
  assert.ok(worlds, 'the full worlds overview is the default Learn collection');
  worlds.props.onNavigate({ tab: 'learn', learn: 'guided', ageBand: 'U9', lessonId: 'practice-draft-u9-leave-shadow' }); component.render();
  const guided = await component.component('GuidedCurriculum');
  assert.equal(guided.props.initialLessonId, 'practice-draft-u9-leave-shadow');
  assert.equal(guided.props.ageBand, 'U9'); assert.equal(guided.props.playerId, 'nav-player');
  component.click('Your hockey worlds');
  (await component.component('LearningWorlds')).props.onNavigate({ tab: 'learn', learn: 'library', ageBand: 'U9', conceptId: 'passing' }); component.render();
  const library = await component.component('PracticeLibrary');
  assert.equal(library.props.initialConcept, 'passing'); assert.equal(library.props.ageBand, 'U9');
  for (const [target, child] of [[{ tab: 'practice', practice: 'choose' }, 'ReadSequence'], [{ tab: 'practice', practice: 'position' }, 'ScenarioWorkshop'], [{ tab: 'play' }, 'OneOnOne'], [{ tab: 'brain' }, 'CognitiveGym'], [{ tab: 'learn', learn: 'discover' }, 'RinkDiscovery']]) {
    component.click('Learn the game'); component.click('Your hockey worlds');
    (await component.component('LearningWorlds')).props.onNavigate(target); component.render();
    const activity = await component.component(child);
    assert.ok(activity, child);
    if (child === 'CognitiveGym') assert.equal(activity.props.ageBand, 'U9');
  }
});

test('player lesson surfaces do not render internal source/evidence disclosure or an authoring shortcut', () => {
  const source = readFileSync(new URL('./PracticeLibrary.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /<details|Lesson source|teaching context|Read your teaching notes|onOpenDraft|CONCEPT DOCUMENTS/);
  assert.match(source, /item\.source/); assert.match(source, /scoreLesson\(q,value\)/);
  const animated = readFileSync(new URL('../play/AnimatedPlay.jsx', import.meta.url), 'utf8').split('export function AnimatedPlayTest()')[0];
  assert.doesNotMatch(animated, /<details|sourceRef\?\.|evidenceBoundary/);
});

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


test('rink discovery is available only to U7 and U9, including old links', async () => {
 for (const age of ['U7','U9','U11','U13','U15','U18']) {
  const view=mount(`?arena=sgs&sgs=discover&age=${age}`);
  const eligible=['U7','U9'].includes(age);
  assert.equal(Boolean(await view.component('RinkDiscovery')),eligible,age);
  assert.equal(view.text().includes('Explore the rink'),eligible,age);
  if(!eligible) assert.ok(await view.component('LearningWorlds'),age);
 }
});
