import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {PerspectiveCamera,Vector3} from 'three';
const output=new URL('../../node_modules/.cache/question-camera/control.mjs',import.meta.url);mkdirSync(new URL('./',output),{recursive:true});
await build({entryPoints:[fileURLToPath(new URL('./ScenarioCamera.jsx',import.meta.url))],outfile:fileURLToPath(output),bundle:true,packages:'external',platform:'node',format:'esm',jsx:'automatic',logLevel:'silent'});
const {connectPlayerEyeControls,connectScenarioCameraControls}=await import(output.href);
const surface=()=>{const element=new EventTarget(),attrs=new Map();element.style={touchAction:'pan-y'};element.setAttribute=(k,v)=>attrs.set(k,v);element.getAttribute=k=>attrs.get(k)??null;element.removeAttribute=k=>attrs.delete(k);element.setPointerCapture=()=>{};element.ownerDocument=new EventTarget();element.clientWidth=400;element.clientHeight=400;return element;};
const emit=(element,type,data)=>{const e=new Event(type,{cancelable:true});Object.assign(e,data);element.dispatchEvent(e);};
test('first-person drag and buttons rotate sight at a fixed eye position, release stops input',()=>{
 const camera=new PerspectiveCamera(70,1,.04,180);camera.position.set(3,1.5,-10);const start=camera.position.clone(),canvas=surface(),look={yaw:0,pitch:0};let applied=0;
 const apply=()=>{applied++;camera.lookAt(camera.position.clone().add(new Vector3(Math.sin(look.yaw)*Math.cos(look.pitch),Math.sin(look.pitch),-Math.cos(look.yaw)*Math.cos(look.pitch))));};apply();
 const before=camera.quaternion.clone(),release=connectPlayerEyeControls(camera,canvas,look,apply,()=>{});
 emit(canvas,'pointerdown',{button:0,pointerId:1,clientX:0,clientY:0});emit(canvas,'pointermove',{pointerId:1,clientX:70,clientY:30});
 assert.ok(camera.quaternion.angleTo(before)>.1);assert.deepEqual(camera.position,start);
 release.command({type:'pan-x',direction:1});assert.deepEqual(camera.position,start);
 for(let i=0;i<100;i++)release.command({type:'tilt',direction:1});assert.equal(look.pitch,-1.2);
 const count=applied;release();emit(canvas,'keydown',{key:'ArrowLeft'});release.command({type:'rotate',direction:1});assert.equal(applied,count);assert.equal(canvas.style.touchAction,'pan-y');
});
test('external perspective orbit and pan preserve finite camera coordinates',()=>{
 const camera=new PerspectiveCamera(70,1,.04,180);camera.position.set(8,4,8);camera.lookAt(0,1,0);camera.updateMatrixWorld();
 const release=connectScenarioCameraControls(camera,surface(),[0,1,0],()=>{});
 release.command({type:'pan-x',direction:1});release.command({type:'rotate',direction:1});assert.ok(camera.position.toArray().every(Number.isFinite));release();
});
