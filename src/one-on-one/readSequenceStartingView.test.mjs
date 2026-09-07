import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {readFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {U11_READ_SEQUENCE} from './readSequenceCore.js';
import {characterProportions} from '../visuals/characterPresentation.js';
const source=new URL('./ReadSequenceScene.jsx',import.meta.url), cache=new URL('../../node_modules/.cache/read-starting-view/',import.meta.url);
mkdirSync(cache,{recursive:true});
const output=new URL('scene.mjs',cache);
await build({stdin:{contents:readFileSync(source,'utf8').replace("from 'react';","from 'test:hooks';")+'\nexport {ReadScene,SceneContents};',resolveDir:fileURLToPath(new URL('.',source)),loader:'jsx'},outfile:fileURLToPath(output),bundle:true,packages:'external',platform:'node',format:'esm',jsx:'automatic',loader:{'.css':'empty'},logLevel:'silent',plugins:[{name:'hooks',setup(api){
 api.onResolve({filter:/^@react-three\/fiber$/},()=>({path:'fiber',namespace:'fiber'}));
 api.onLoad({filter:/.*/,namespace:'fiber'},()=>({contents:'export const Canvas=()=>null,useFrame=()=>{},useThree=()=>({invalidate:()=>{}});'}));
 api.onResolve({filter:/^test:hooks$/},()=>({path:'hooks',namespace:'hooks'}));
 api.onLoad({filter:/.*/,namespace:'hooks'},()=>({contents:'export class Component {}\n'+['useState','useRef','useMemo','useCallback','useEffect','useLayoutEffect'].map(name=>`export const ${name}=(...args)=>globalThis.__readHooks.${name}(...args);`).join('\n')}));
 api.onResolve({filter:/\.jsx$/},args=>({path:args.path,namespace:'child'}));
 api.onLoad({filter:/.*/,namespace:'child'},()=>({contents:'export default function Child(){}; export const Ice=()=>null,Arena=()=>null,Goal=()=>null,Puck=()=>null;export const isFocusedActor=()=>false;'}));
}}]});
const {ReadScene,SceneContents}=await import(output.href);
const same=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
function mount(initial){
 let props=initial,cursor=0,dirty=true,tree,effects=[];const slots=[];
 const hooks={
 useState(initial){const s=slots[cursor++]||={value:typeof initial==='function'?initial():initial};return[s.value,value=>{s.value=typeof value==='function'?value(s.value):value;dirty=true;}];},
 useRef(value){return slots[cursor++]||={current:value};},
 useMemo(fn,deps){const i=cursor++;if(!same(slots[i]?.deps,deps))slots[i]={value:fn(),deps};return slots[i].value;},
 useCallback(fn,deps){return hooks.useMemo(()=>fn,deps);},
 useEffect(fn,deps){const i=cursor++;if(!same(slots[i]?.deps,deps))effects.push(()=>{slots[i]={deps};fn();});},
 useLayoutEffect(fn,deps){hooks.useEffect(fn,deps);},
 };
 function flush(){for(let count=0;dirty;count++){assert.ok(count<10);dirty=false;cursor=0;effects=[];globalThis.__readHooks=hooks;try{tree=ReadScene(props);}finally{delete globalThis.__readHooks;}if(!dirty)effects.forEach(fn=>fn());}}
 flush();return{scene:()=>tree.props.children.props.children.props,canvas:()=>tree.props.children.props,update(next){props={...props,...next};dirty=true;flush();}};
}
function fixture(extra={}){return{state:structuredClone(U11_READ_SEQUENCE.initialState),definition:U11_READ_SEQUENCE,questionId:'read1',...extra};}

test('connected read binds saved player-eye view once, uses stage eye height, and waits for camera configuration',()=>{
 const events=[];const props=fixture({startingView:{type:'first-person',actorId:'F1'},onPending:()=>events.push('pending'),onReady:()=>events.push('ready')});
 const before=structuredClone(props.state),screen=mount(props);
 assert.equal(screen.scene().cameraView.type,'first-person');
 assert.equal(screen.scene().cameraView.eyeHeight,characterProportions('U11').eyeHeight);
 assert.deepEqual(events,['pending']);
 screen.canvas().onCreated({gl:{domElement:{addEventListener(){},removeEventListener(){}}}});
 assert.deepEqual(events,['pending'],'Canvas creation alone cannot unlock the question');
 screen.scene().onReady();assert.deepEqual(events,['pending','ready']);
 screen.update({time:1.2,playing:true});assert.deepEqual(events,['pending','ready']);
 assert.equal(screen.scene().cameraView.actorId,'F1');assert.deepEqual(props.state,before);
 screen.update({cameraPreset:'broadcast',cameraPresetVersion:1});assert.equal(screen.scene().cameraView.type,'preset');
 screen.update({questionId:'read2',startingView:{type:'first-person',actorId:'D1'}});assert.equal(screen.scene().cameraView.actorId,'D1');
 screen.update({questionId:'read3',startingView:undefined});assert.equal(screen.scene().cameraView.type,'preset');
});
test('explicit missing observer fails instead of silently substituting a different view',()=>{
 assert.throws(()=>mount(fixture({startingView:{type:'first-person',actorId:'missing'}})),/observer missing is missing/);
});
test('player-eye scene removes its observer mesh, label and overlapping pass control',()=>{
 const screen=mount(fixture({startingView:{type:'first-person',actorId:'F2'}}));
 let tree;globalThis.__readHooks={useLayoutEffect:()=>{}};
 try{tree=SceneContents({...screen.scene(),onFirstAction:()=>{}});}finally{delete globalThis.__readHooks;}
 const nodes=[];function visit(node){if(Array.isArray(node))return node.forEach(visit);if(!node?.props)return;nodes.push(node);visit(node.props.children);}visit(tree);
 const observer=nodes.find(node=>node.props.actorKey==='F2');assert.equal(observer.props.visible,false);
 assert.ok(nodes.some(node=>node.props.actorKey==='F1'&&node.props.visible));
 assert.ok(!nodes.some(node=>node.type?.name==='ActorChip'&&node.props.actor.id==='F2'));
 assert.ok(!nodes.some(node=>node.props.action==='pass'));
 assert.ok(nodes.some(node=>node.props.playerEye===true));
});
