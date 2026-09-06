import test from 'node:test';
import assert from 'node:assert/strict';
import { afterScenarioCameraRender } from './cameraRenderReady.js';
test('camera readiness waits for actual matching render, chains existing callback and fires once',()=>{
 const previousCalls=[],ready=[],camera={},wrong={},scene={onAfterRender(...args){previousCalls.push(args);}};
 const previous=scene.onAfterRender;let requested=0;
 const release=afterScenarioCameraRender(scene,camera,()=>ready.push('ready'),()=>requested++);
 assert.equal(requested,1);assert.deepEqual(ready,[]);
 scene.onAfterRender('renderer',scene,wrong);assert.deepEqual(ready,[]);assert.equal(previousCalls.length,1);
 scene.onAfterRender('renderer',scene,camera);assert.deepEqual(ready,['ready']);assert.equal(scene.onAfterRender,previous);
 scene.onAfterRender('renderer',scene,camera);assert.deepEqual(ready,['ready']);release();assert.equal(scene.onAfterRender,previous);
});
test('unmount cancels pending readiness and never overwrites a later renderer hook',()=>{
 const camera={},scene={onAfterRender(){}};const previous=scene.onAfterRender;let ready=0;
 const release=afterScenarioCameraRender(scene,camera,()=>ready++,()=>{}),pending=scene.onAfterRender;
 const later=(...args)=>pending(...args);scene.onAfterRender=later;release();assert.equal(scene.onAfterRender,later);
 scene.onAfterRender(null,scene,camera);assert.equal(ready,0);
 scene.onAfterRender=previous;const cleanup=afterScenarioCameraRender(scene,camera,()=>ready++,()=>{});cleanup();assert.equal(scene.onAfterRender,previous);
});
