import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { createReadSequenceSession, submitFirstRead, advanceSequencePlayback, stateToStaticDirectorDraft } from './readSequenceCore.js';
import { createDefenderPerspective, defenderPerspectiveState } from './defenderPerspectiveCore.js';

const cache = new URL('../../node_modules/.cache/coach-availability/', import.meta.url);
mkdirSync(cache, { recursive: true });
const modules = {};
for (const name of ['CoachQuestionLab', 'DefenderPerspective']) {
  const entry = fileURLToPath(new URL(`./${name}.jsx`, import.meta.url)), output = new URL(`${name}.mjs`, cache);
  await build({ entryPoints: [entry], outfile: fileURLToPath(output), bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' }, logLevel: 'silent', plugins: [{ name: 'coach-test-boundaries', setup(api) {
    api.onResolve({ filter: /^react$/ }, args => args.importer === entry ? { path: 'hooks', namespace: 'coach-hooks' } : undefined);
    api.onLoad({ filter: /.*/, namespace: 'coach-hooks' }, () => ({ contents: ['useState','useEffect','useLayoutEffect','useMemo','useCallback','useRef','useId'].map(n => `export const ${n}=(...a)=>globalThis.__coachHooks.${n}(...a);`).join('\n') }));
    api.onResolve({ filter: /\.jsx$/ }, args => args.importer === entry ? { path: args.path, namespace: 'coach-child' } : undefined);
    api.onLoad({ filter: /.*/, namespace: 'coach-child' }, () => ({ contents: 'const Child=()=>null;export default Child;export const QuestionBoard=Child,HockeyPlayerArt=Child,SvgPlayerLocator=Child,SvgPuckLocator=Child;export const isFocusedActor=(a,id)=>id===undefined?a.label==="YOU":a.id===id;' }));
  } }] });
  modules[name] = await import(output.href);
}
const equalDeps = (a,b) => Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((x,i)=>Object.is(x,b[i]));
const text = node => ['string','number'].includes(typeof node)?String(node):Array.isArray(node)?node.map(text).join(''):node?.props?text(node.props.children):'';
function mount(Component, initialProps) {
  let props=initialProps,cursor=0,dirty=true,tree,effects=[];const slots=[];
  const hooks={useState(initial){const s=slots[cursor++]||={value:typeof initial==='function'?initial():initial};s.set||=v=>{const next=typeof v==='function'?v(s.value):v;if(!Object.is(next,s.value)){s.value=next;dirty=true;}};return[s.value,s.set];},useRef(v){return slots[cursor++]||={current:v};},useId(){return hooks.useRef('coach-availability').current;},useMemo(fn,deps){const i=cursor++;if(!equalDeps(slots[i]?.deps,deps))slots[i]={deps,value:fn()};return slots[i].value;},useCallback(fn,deps){return hooks.useMemo(()=>fn,deps);},useEffect(fn,deps){const i=cursor++;if(!equalDeps(slots[i]?.deps,deps))effects.push(()=>{slots[i]?.cleanup?.();slots[i]={deps,cleanup:fn()};});}};
  hooks.useLayoutEffect=hooks.useEffect;
  function flush(){for(let n=0;dirty;n++){assert.ok(n<35);dirty=false;cursor=0;effects=[];globalThis.__coachHooks=hooks;try{tree=Component(props);}finally{delete globalThis.__coachHooks;}effects.forEach(fn=>fn());}}
  function find(predicate){let found;function visit(node){if(Array.isArray(node))return node.forEach(visit);if(!node?.props)return;if(predicate(node))found=node;visit(node.props.children);}visit(tree);return found;}
  flush();return{flush,find,tree:()=>tree,text:()=>text(tree),board:()=>find(n=>n.props.sceneView===true&&n.props.draft),button:label=>find(n=>n.type==='button'&&text(n)===label),update(next){props=next;dirty=true;flush();},unmount(){slots.forEach(s=>s?.cleanup?.());}};
}
function storage(run){const old=globalThis.localStorage,saved=new Map();globalThis.localStorage={getItem:key=>saved.get(key)??null,setItem:(k,v)=>saved.set(k,v)};try{run(saved);}finally{if(old===undefined)delete globalThis.localStorage;else globalThis.localStorage=old;}}
const freeze=advanceSequencePlayback(submitFirstRead(createReadSequenceSession(),{action:'pass',reason:''}),1);

test('QuestionBoard inspection stays in3D and stale renderer callbacks cannot move while unavailable',()=>{
  const state=defenderPerspectiveState(createDefenderPerspective(freeze)),moves=[],availability=[];
  const board=mount(modules.CoachQuestionLab.QuestionBoard,{draft:stateToStaticDirectorDraft(state),snapshotState:state,selected:'D1',focusActorId:'D1',editableTeam:'away',allowedActorIds:['D1'],onMove:(...a)=>moves.push(a),sceneView:true,inspectable:true,onAvailabilityChange:v=>availability.push(v)});
  const scene=()=>board.find(n=>n.props.state&&n.props.teamLabels);
  assert.equal(typeof scene().props.onAvailabilityChange,'function');
  const staleMove=scene().props.onMove;staleMove('D1',{x:18,y:0});assert.equal(moves.length,0);
  scene().props.onAvailabilityChange(true);board.flush();scene().props.onMove('D1',{x:18,y:0});assert.equal(moves.length,1);
  scene().props.onAvailabilityChange(false);staleMove('D1',{x:19,y:0});board.flush();assert.equal(moves.length,1);
  const inspector=board.find(n=>typeof n.props.renderBoard==='function').props.renderBoard();
  assert.equal(inspector.props.sceneView,true);assert.equal(inspector.props.focusActorId,'D1');assert.equal(inspector.props.onMove,undefined);
  assert.deepEqual(availability,[false,true,false]);board.unmount();
});

test('CoachQuestionLab requires the learner rink before move/turn/compare and retains the draft on failure',()=>storage(saved=>{
  const lab=mount(modules.CoachQuestionLab.default,{playerId:'availability'});
  const before=JSON.stringify(lab.board().props.draft),actor=lab.board().props.selected;
  assert.equal(lab.button('Compare with coach reference →').props.disabled,true);
  lab.board().props.onMove(actor,{x:5,y:0});lab.flush();assert.equal(JSON.stringify(lab.board().props.draft),before);
  lab.board().props.onAvailabilityChange(true);lab.flush();lab.board().props.onMove(actor,{x:5,y:0});lab.flush();
  const moved=JSON.stringify(lab.board().props.draft),staleMove=lab.board().props.onMove,staleCompare=lab.button('Compare with coach reference →').props.onClick;
  assert.notEqual(moved,before);lab.board().props.onAvailabilityChange(false);staleMove(actor,{x:8,y:1});staleCompare();lab.flush();
  assert.equal(JSON.stringify(lab.board().props.draft),moved);assert.equal(saved.size,0);assert.equal(lab.button('Compare with coach reference →').props.disabled,true);
  lab.board().props.onAvailabilityChange(true);lab.flush();lab.button('Compare with coach reference →').props.onClick();lab.flush();
  assert.equal(JSON.parse(saved.get('rinkreads_coach_attempts_v1:availability')).length,1);lab.unmount();
}));

test('DefenderPerspective gates initial/failing move and save without altering original source or optional reason',()=>storage(saved=>{
  const sourceBytes=JSON.stringify(freeze),panel=mount(modules.DefenderPerspective.default,{session:freeze,playerId:'availability'});
  panel.button('Read D1’s next move →').props.onClick();panel.flush();
  assert.equal(panel.button('Save D1’s position').props.disabled,true);assert.equal(panel.button('Stay at the starting spot').props.disabled,true);
  const initial=JSON.stringify(panel.board().props.snapshotState);panel.board().props.onMove('D1',{x:18,y:0});panel.flush();assert.equal(JSON.stringify(panel.board().props.snapshotState),initial);
  panel.board().props.onAvailabilityChange(true);panel.flush();panel.board().props.onMove('D1',{x:18,y:0});panel.flush();
  const moved=JSON.stringify(panel.board().props.snapshotState),staleSave=panel.button('Save D1’s position').props.onClick,staleMove=panel.board().props.onMove;
  panel.board().props.onAvailabilityChange(false);staleMove('D1',{x:20,y:0});staleSave();panel.flush();assert.equal(saved.size,0);assert.equal(JSON.stringify(panel.board().props.snapshotState),moved);
  panel.board().props.onAvailabilityChange(true);panel.flush();panel.button('Save D1’s position').props.onClick();panel.flush();
  assert.equal(saved.size,1);assert.equal([...saved.values()].map(JSON.parse)[0].reason,'');assert.equal(JSON.stringify(freeze),sourceBytes);panel.unmount();
}));
