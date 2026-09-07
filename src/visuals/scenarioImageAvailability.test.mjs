import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const entry=fileURLToPath(new URL('./ScenarioImage.jsx',import.meta.url)),cache=new URL('../../node_modules/.cache/source-image-availability/',import.meta.url);mkdirSync(cache,{recursive:true});
const output=new URL('image.mjs',cache);
await build({entryPoints:[entry],outfile:fileURLToPath(output),bundle:true,packages:'external',platform:'node',format:'esm',jsx:'automatic',loader:{'.css':'empty'},logLevel:'silent',plugins:[{name:'image-boundaries',setup(api){
  api.onResolve({filter:/^react$/},args=>args.importer===entry?{path:'hooks',namespace:'image-hooks'}:undefined);
  api.onLoad({filter:/.*/,namespace:'image-hooks'},()=>({contents:['useState','useEffect','useLayoutEffect','useMemo','useCallback','useRef','useId'].map(n=>`export const ${n}=(...a)=>globalThis.__imageHooks.${n}(...a);`).join('\n')}));
  api.onResolve({filter:/\.jsx$/},args=>args.importer===entry?{path:args.path,namespace:'image-child'}:undefined);
  api.onLoad({filter:/.*/,namespace:'image-child'},()=>({contents:'export default function Child(){return null;}export const OverlayLayer=()=>null;'}));
}}]});
const{default:Image}=await import(output.href);
function mount(initial){let props=initial,cursor=0,tree,effects=[];const slots=[],equal=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
 const hooks={useRef(v){return slots[cursor++]||={current:v};},useState(v){const s=slots[cursor++]||={value:typeof v==='function'?v():v};return[s.value,n=>{s.value=typeof n==='function'?n(s.value):n;}];},useMemo(fn,deps){const i=cursor++;if(!equal(slots[i]?.deps,deps))slots[i]={deps,value:fn()};return slots[i].value;},useCallback(fn,deps){return hooks.useMemo(()=>fn,deps);},useEffect(fn,deps){const i=cursor++;if(!equal(slots[i]?.deps,deps))effects.push(()=>{slots[i]?.cleanup?.();slots[i]={deps,cleanup:fn()};});},useId(){return hooks.useRef('image').current;}};hooks.useLayoutEffect=hooks.useEffect;
 function render(){cursor=0;effects=[];globalThis.__imageHooks=hooks;try{tree=Image(props);}finally{delete globalThis.__imageHooks;}effects.forEach(fn=>fn());}render();return{update(p){props=p;render();},scene(){return tree.props.children.find(n=>n?.props?.state);},tree:()=>tree,unmount(){slots.forEach(s=>s?.cleanup?.());}};
}
const questions=Object.values(JSON.parse(readFileSync(new URL('../data/bank.json',import.meta.url),'utf8'))).flat().filter(q=>q.media?.url);

test('a changed image/question remounts the3D boundary and invalidates old ready callbacks',()=>{
 const first=questions[0],second=questions.find(q=>q.media.url!==first.media.url),values=[];const props=q=>({questionId:q.id,media:q.media,overlays:q.overlays,onAvailabilityChange:v=>values.push(v)});
 const image=mount(props(first));assert.deepEqual(values,[false]);const initial=image.scene(),oldReady=initial.props.onAvailabilityChange;oldReady(true);assert.deepEqual(values,[false,true]);
 image.update(props(second));assert.equal(values.at(-1),false);assert.notEqual(image.scene().key,initial.key);oldReady(true);assert.equal(values.at(-1),false,'old source cannot unlock new question');
 image.scene().props.onAvailabilityChange(true);assert.equal(values.at(-1),true);const readyKey=image.scene().key;
 image.update({...props(second),media:{...second.media},overlays:structuredClone(second.overlays)});assert.equal(image.scene().key,readyKey);assert.equal(values.at(-1),true,'identical authored content does not reset readiness');
  image.update({...props(second),questionId:'another-question-same-art'});assert.notEqual(image.scene().key,readyKey);assert.equal(values.at(-1),false);
  image.update(props(first));oldReady(true);assert.equal(values.at(-1),false,'an old A callback cannot unlock a later A after visiting B');
 const unmountedReady=image.scene().props.onAvailabilityChange;image.unmount();unmountedReady(true);assert.equal(values.at(-1),false);
});

test('generic image source changes also reset readiness; absence of an image stays available',()=>{
 const values=[];const callback=v=>values.push(v);const image=mount({questionId:'a',media:{url:'/generic-a.png'},onAvailabilityChange:callback});assert.deepEqual(values,[false]);
 const old=image.tree();old.props.onAvailabilityChange(true);image.update({questionId:'b',media:{url:'/generic-b.png'},onAvailabilityChange:callback});assert.equal(values.at(-1),false);assert.notEqual(image.tree().key,old.key);old.props.onAvailabilityChange(true);assert.equal(values.at(-1),false);
 image.update({questionId:'text-only',onAvailabilityChange:callback});assert.equal(values.at(-1),true);image.unmount();
});
