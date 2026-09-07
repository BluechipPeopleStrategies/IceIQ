import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const directory = fileURLToPath(new URL('./', import.meta.url));
const source = readFileSync(new URL('./PracticeLibrary.jsx', import.meta.url), 'utf8');
const cache = new URL('../../node_modules/.cache/library-source-question/', import.meta.url);
mkdirSync(cache, { recursive: true });
const output = new URL('component.mjs', cache);
// Exercise the actual SourceQuestion body without starting the unrelated bank loader.
await build({ stdin: { contents: `import {useState,useRef,useCallback} from 'test-hooks';
import {TYPE_LABELS,questionOptions,scoreLesson} from './lessonCore.js';
const ScenarioImage=()=>null, CoachFeedback=()=>null, ScenarioRenderer=()=>null, RinkReadsRinkQuestion=()=>null;
const getCoachForQuestion=()=>null, coachReaction=()=>'';
${source.slice(source.indexOf('function SourceQuestion('), source.indexOf('export default function PracticeLibrary('))}
export default SourceQuestion;`, resolveDir: directory, sourcefile: 'SourceQuestion.jsx', loader: 'jsx' }, outfile: fileURLToPath(output), bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic', logLevel: 'silent', plugins: [{ name: 'source-question-hooks', setup(api) {
  api.onResolve({ filter: /^test-hooks$/ }, () => ({ path: 'hooks', namespace: 'test-hooks' }));
  api.onLoad({ filter: /.*/, namespace: 'test-hooks' }, () => ({ contents: ['useState', 'useRef', 'useCallback'].map(name => `export const ${name}=(...args)=>globalThis.__librarySourceHooks.${name}(...args);`).join('\n') }));
} }] });
const { default: SourceQuestion } = await import(output.href);

const libraryOutput = new URL('library.mjs', cache);
await build({ stdin: { contents: `import {useState,useEffect,useMemo} from 'library-hooks';
import {buildLibrary,TYPE_LABELS,creditLesson,libraryMasteryDescriptor} from './lessonCore.js';
import {createMasteryLedger,readMasteryLedger,recordMasteryAttempt,masteryProgress,masterySummary,masteryStorageKey} from './spacedMasteryCore.js';
import {savePracticeEvidence,readPracticeEvidence} from './practiceMasteryStorage.js';
const LEVELS=['U9 / Novice','U11 / Atom'], NOTES=[], ALL_ANIMATED_PLAYS=[];
const AnimatedPlay=()=>null,SourceQuestion=()=>null,SpacedMasteryProgress=()=>null,scenarioTitle=q=>q.title;
const loadQB=async()=>globalThis.__libraryFixture;
${source.slice(source.indexOf('const readProgress='), source.indexOf('function SourceQuestion('))}
${source.slice(source.indexOf('export default function PracticeLibrary('))}`, resolveDir: directory, sourcefile: 'PracticeLibrary.jsx', loader: 'jsx' }, outfile: fileURLToPath(libraryOutput), bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic', logLevel: 'silent', plugins: [{ name: 'library-navigation-hooks', setup(api) {
  api.onResolve({ filter: /^library-hooks$/ }, () => ({ path: 'hooks', namespace: 'library-navigation-hooks' }));
  api.onLoad({ filter: /.*/, namespace: 'library-navigation-hooks' }, () => ({ contents: ['useState', 'useEffect', 'useMemo'].map(name => `export const ${name}=(...args)=>globalThis.__libraryNavigationHooks.${name}(...args);`).join('\n') }));
} }] });
const { default: PracticeLibrary } = await import(libraryOutput.href);

test('world library links apply age and exact concept filters without crediting or replacing saved history', async () => {
  const previousStorage = globalThis.localStorage;
  const saved = JSON.stringify({ 'U11 / Atom:older-question': { firstCorrect: true, mastered: true, points: 100 } });
  const readKeys = [];
  globalThis.localStorage = { getItem(key) { readKeys.push(key); return saved; }, setItem() { throw Error('opening a collection cannot award or replace progress'); } };
  globalThis.__libraryFixture = {
    'U9 / Novice': [{ id: 'u9-pass', title: 'Passing at U9', conceptId: 'passing', type: 'mc', opts: ['A', 'B'], ok: 0 }, { id: 'u9-scan', title: 'Scanning at U9', conceptId: 'scanning', type: 'mc', opts: ['A', 'B'], ok: 0 }],
    'U11 / Atom': [{ id: 'u11-pass', title: 'Passing at U11', conceptId: 'passing', type: 'mc', opts: ['A', 'B'], ok: 0 }],
  };
  try {
    for (const [initialConcept, expectedTitles] of [['passing', ['Passing at U9']], ['', ['Passing at U9', 'Scanning at U9']]]) {
      const slots = []; let index = 0, effects = [], tree;
      const hooks = {
        useState(initial) { const slot = slots[index++] ||= { value: typeof initial === 'function' ? initial() : initial }; return [slot.value, value => { slot.value = typeof value === 'function' ? value(slot.value) : value; }]; },
        useMemo(fn) { return fn(); },
        useEffect(fn) { const slot = index++; if (!slots[slot]) { slots[slot] = {}; effects.push(fn); } },
      };
      function render() { index = 0; globalThis.__libraryNavigationHooks = hooks; try { tree = PracticeLibrary({ playerId: 'world-library', ageBand: 'U9', initialConcept }); } finally { delete globalThis.__libraryNavigationHooks; } }
      function find(predicate) { let found; const visit = node => { if (Array.isArray(node)) return node.forEach(visit); if (!node?.props) return; if (predicate(node)) found = node; visit(node.props.children); }; visit(tree); return found; }
      render(); effects.forEach(fn => fn()); await Promise.resolve(); await Promise.resolve(); render();
      assert.equal(find(node => node.props['aria-label'] === 'Age group').props.value, 'U9 / Novice');
      assert.equal(find(node => node.props['aria-label'] === 'Teaching concept').props.value, initialConcept);
      const list = find(node => node.props.className === 'pf-lesson-list');
      const buttons = list.props.children.flat(Infinity).filter(node => node?.type === 'button');
      assert.deepEqual(buttons.map(node => node.props.children.find(child => child.type === 'strong').props.children), expectedTitles);
    }
    assert.equal(readKeys.filter(key=>key==='rinkreads_practice_lessons_v1:world-library').length,2);
    assert.equal(readKeys.filter(key=>key==='rinkreads_spaced_mastery_v1:world-library').length,2);
  } finally { delete globalThis.__libraryFixture; if (previousStorage === undefined) delete globalThis.localStorage; else globalThis.localStorage = previousStorage; }
});

function mount(question) {
  const slots = [], credits = []; let index = 0, tree;
  const hooks = {
    useState(initial) { const slot = slots[index++] ||= { value: typeof initial === 'function' ? initial() : initial }; return [slot.value, value => { slot.value = typeof value === 'function' ? value(slot.value) : value; }]; },
    useRef(initial) { return slots[index++] ||= { current: initial }; },
    useCallback(fn) { return fn; },
  };
  const text = node => typeof node === 'string' || typeof node === 'number' ? String(node) : Array.isArray(node) ? node.map(text).join('') : node?.props ? text(node.props.children) : '';
  function render() { index = 0; globalThis.__librarySourceHooks = hooks; try { tree = SourceQuestion({ item: { source: question, type: question.type, age: 'U11 / Atom' }, onCredit: value => credits.push(value) }); } finally { delete globalThis.__librarySourceHooks; } }
  function all(predicate) { const result = []; const visit = node => { if (Array.isArray(node)) return node.forEach(visit); if (!node?.props) return; if (predicate(node)) result.push(node); visit(node.props.children); }; visit(tree); return result; }
  render();
  return { credits, render, all, button: label => all(node => node.type === 'button' && text(node) === label)[0], choices: () => all(node => node.type === 'button' && 'aria-pressed' in node.props), image: () => all(node => typeof node.props.onAvailabilityChange === 'function')[0], text: () => text(tree), ready(value) { this.image().props.onAvailabilityChange(value); render(); } };
}

test('source image answers wait for ready, synchronous failures block stale submit, and recovery never submits automatically', () => {
  for (const question of [{ type: 'mc', opts: ['Pass', 'Shoot'], ok: 1 }, { type: 'tf', ok: true }]) {
    const component = mount({ ...question, media: { url: '/source.png' } });
    assert.ok(component.choices().every(button => button.props.disabled));
    component.choices()[0].props.onClick(); component.render(); assert.deepEqual(component.credits, []);
    component.ready(true); const answer = component.choices()[question.type === 'tf' ? 0 : 1]; assert.equal(answer.props.disabled, false);
    component.image().props.onAvailabilityChange(false); answer.props.onClick(); component.render(); assert.deepEqual(component.credits, []);
    component.ready(true); assert.deepEqual(component.credits, []); component.choices()[question.type === 'tf' ? 0 : 1].props.onClick(); component.render(); assert.deepEqual(component.credits, [true]);
  }
});

test('multi and sequence choices persist through a failed rink without accepting hidden edits or checks', () => {
  const multi = mount({ type: 'multi', opts: ['Pass', 'Shoot'], correct_indices: [1], media: { type: 'image', url: '/source.png' } });
  multi.ready(true); multi.choices()[1].props.onClick(); multi.render(); const staleChoice = multi.choices()[0], staleCheck = multi.button('Check my choices');
  multi.image().props.onAvailabilityChange(false); staleChoice.props.onClick(); staleCheck.props.onClick(); multi.render(); assert.deepEqual(multi.credits, []);
  assert.equal(multi.choices()[1].props['aria-pressed'], true); assert.equal(multi.choices()[0].props['aria-pressed'], false);
  multi.ready(true); multi.button('Check my choices').props.onClick(); multi.render(); assert.deepEqual(multi.credits, [true]);
  const sequence = mount({ type: 'seq', items: ['Receive', 'Pass'], correct_order: [1, 0], media: { url: '/source.png' } });
  sequence.ready(true); const down = sequence.all(node => node.props['aria-label'] === 'Move step 1 down')[0]; down.props.onClick(); sequence.render();
  const staleUp = sequence.all(node => node.props['aria-label'] === 'Move step 2 up')[0], check = sequence.button('Check the sequence');
  sequence.image().props.onAvailabilityChange(false); staleUp.props.onClick(); check.props.onClick(); sequence.render(); assert.deepEqual(sequence.credits, []);
  sequence.ready(true); sequence.button('Check the sequence').props.onClick(); sequence.render(); assert.deepEqual(sequence.credits, [true]);
});

test('text-only questions remain usable without a rink callback', () => {
  const component = mount({ type: 'mc', opts: ['Pass', 'Shoot'], ok: 0 });
  assert.equal(component.choices()[0].props.disabled, false); component.choices()[0].props.onClick(); component.render(); assert.deepEqual(component.credits, [true]);
  assert.doesNotMatch(component.text(), /Read mastered|100 practice points/);
});

test('library credit saves daily evidence, preserves legacy points, restores retries and isolates players',async()=>{
 const previousStorage=globalThis.localStorage;
 const saved=new Map([['rinkreads_practice_lessons_v1:first',JSON.stringify({'U9 / Novice:old':{firstCorrect:true,mastered:true,points:100}})]]);
 globalThis.localStorage={getItem:key=>saved.get(key)??null,setItem:(key,value)=>saved.set(key,value)};
 globalThis.__libraryFixture={'U9 / Novice':[{id:'live-pass',type:'mc',conceptId:'passing',title:'Pass read',opts:['A','B'],ok:0}]};
 async function open(playerId){
  const slots=[];let index=0,tree;const effects=[];
  const hooks={useState(initial){const slot=slots[index++]||=( {value:typeof initial==='function'?initial():initial} );return [slot.value,value=>{slot.value=typeof value==='function'?value(slot.value):value}];},useMemo:fn=>fn(),useEffect(fn){const i=index++;if(!slots[i]){slots[i]={};effects.push(fn);}}};
  function render(){index=0;globalThis.__libraryNavigationHooks=hooks;try{tree=PracticeLibrary({playerId,ageBand:'U9'});}finally{delete globalThis.__libraryNavigationHooks;}}
  function find(predicate){let found;const visit=node=>{if(Array.isArray(node))return node.forEach(visit);if(!node?.props)return;if(predicate(node))found=node;visit(node.props.children);};visit(tree);return found;}
  render();effects.forEach(fn=>fn());await Promise.resolve();await Promise.resolve();render();
  const list=find(node=>node.props.className==='pf-lesson-list');const button=list.props.children.flat(Infinity).find(node=>node?.type==='button');button.props.onClick();render();
  return {answer(correct){find(node=>typeof node.props.onCredit==='function').props.onCredit(correct);render();},progress:()=>find(node=>node.props.progress&&'eligible' in node.props).props.progress};
 }
 try{
  let view=await open('first');view.answer(false);view.answer(true);
  assert.equal(view.progress().distinctQuestions,1);assert.equal(view.progress().accuracy,0);assert.equal(view.progress().points,0);
  let ledger=JSON.parse(saved.get('rinkreads_spaced_mastery_v1:first'));assert.equal(ledger.attempts.length,1);assert.equal(ledger.attempts[0].correct,false);
  const history=JSON.parse(saved.get('rinkreads_practice_lessons_v1:first'));assert.equal(history['U9 / Novice:old'].points,100);assert.equal(history['U9 / Novice:live-pass'].points,0);
  view=await open('first');assert.equal(view.progress().distinctQuestions,1);view.answer(true);assert.equal(view.progress().accuracy,0);
  const firstBytes=saved.get('rinkreads_spaced_mastery_v1:first');
  view=await open('second');assert.equal(view.progress().distinctQuestions,0);view.answer(true);
  assert.equal(view.progress().accuracy,1);assert.equal(saved.get('rinkreads_spaced_mastery_v1:first'),firstBytes);
  assert.equal(JSON.parse(saved.get('rinkreads_spaced_mastery_v1:second')).attempts.length,1);
 }finally{delete globalThis.__libraryFixture;if(previousStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=previousStorage;}
});
