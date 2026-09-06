import test from 'node:test';
import assert from 'node:assert/strict';
import { Box3, Vector3 } from 'three';
import { buildHockeyPlayerRig } from '../one-on-one/hockeyPlayerRig.js';
let presentation = {};
try { presentation = await import('./characterPresentation.js'); } catch {}
test('age stages change head/body proportions, not uniform scale', () => {
 assert.equal(typeof presentation.resolveCharacterStage, 'function');
 for(const [age,stage] of [['U7','young'],['U9 / Novice','young'],['U13','youth'],['U18','older'],[undefined,'youth']]) assert.equal(presentation.resolveCharacterStage(age),stage);
 const rigs=['young','youth','older'].map(stage=>buildHockeyPlayerRig({stage}));
 try { const heights=rigs.map(r=>new Box3().setFromObject(r.group).getSize(new Vector3()).y); assert.ok(heights[0]<heights[1]&&heights[1]<heights[2]); assert.ok(rigs[0].group.userData.proportions.headScale>rigs[2].group.userData.proportions.headScale); } finally { rigs.forEach(r=>r.dispose()); }
});
test('all age/team bodies are dimensional, solid uniforms with no contrasting trim and retain contact',()=>{
 for(const stage of ['young','youth','older']) for(const colour of ['#0B1A33','#C9A24B']) for(const goalie of [false,true]) {
 const rig=buildHockeyPlayerRig({stage,colour,goalie}); try {
 assert.equal(rig.group.userData.palette.trim,colour);
 const size=new Box3().setFromObject(rig.group).getSize(new Vector3()); assert.ok(size.toArray().every(Number.isFinite)); assert.ok(size.z>.4&&size.x>.4);
 assert.deepEqual(rig.group.userData.carryContact,{x:.7,y:.052,z:-1});
 }finally{rig.dispose();}}
});
test('poses articulate geometry independently and reset exactly without moving world root',()=>{
 const a=buildHockeyPlayerRig(),b=buildHockeyPlayerRig(); try {
 assert.equal(typeof a.applyPose,'function');
 const bones=()=>a.group.children[0].skeleton.bones.map(b=>b.matrix.toArray());
 const ready=bones(); a.applyPose({mode:'forward',phase:1.1,stride:.8,lean:.3,lookYaw:.2}); assert.notDeepEqual(bones(),ready);
 assert.deepEqual(b.group.children[0].skeleton.bones.map(b=>b.matrix.toArray()),ready);
 assert.deepEqual(a.group.position.toArray(),[0,0,0]); a.applyPose({});assert.deepEqual(bones(),ready);
 }finally{a.dispose();b.dispose();}
});
test('backward and lateral feet differ from forward; replay keeps mesh resources and finite bones',()=>{
 const rig=buildHockeyPlayerRig();try{
 const resources=[];rig.group.traverse(o=>{if(o.isMesh) resources.push(o.geometry);});
 const snapshot=()=>rig.group.children[0].skeleton.bones.map(b=>b.matrix.toArray());
 rig.applyPose({mode:'forward',phase:1,stride:.8});const forward=snapshot();
 rig.applyPose({mode:'backward',backward:true,phase:1,stride:.8});assert.notDeepEqual(snapshot(),forward);
 assert.equal(rig.group.getObjectByName('left-skate').position.y,0,'Backward C-cut stays grounded.');
 rig.applyPose({mode:'lateral',lateral:-1,phase:1,stride:.8});assert.notDeepEqual(snapshot(),forward);
 for(const phase of [0,.5,1,2,0,NaN]) rig.applyPose({mode:'forward',phase,stride:.8,lean:.2,turn:.5,lookYaw:Infinity});
 assert.ok(snapshot().flat().every(Number.isFinite));
 const after=[];rig.group.traverse(o=>{if(o.isMesh) after.push(o.geometry);});assert.deepEqual(after,resources);
 assert.ok(rig.group.children[0].skeleton.bones.every(b=>b.scale.equals(new Vector3(1,1,1))),'Segments must not stretch during presentation.');
 }finally{rig.dispose();}
});
test('positive head yaw agrees with player-eye rightward rink direction',()=>{
 for(const stage of ['young','youth','older']) {
 const rig=buildHockeyPlayerRig({stage});try{
 rig.applyPose({lookYaw:.55});
 const direction=new Vector3(0,0,-1).applyQuaternion(rig.group.getObjectByName('head').quaternion);
 assert.ok(direction.x>0,'Positive lookYaw must look toward positive rink Y / Three X.');
 assert.ok(Math.abs(direction.x-Math.sin(.55))<1e-8);
 }finally{rig.dispose();}}
});
test('helmet retains smooth vertex normals after merged equipment assembly',()=>{
 const rig=buildHockeyPlayerRig();try{
 const normals=rig.group.getObjectByName('equipment-helmet').geometry.getAttribute('normal');
 let smoothTriangles=0;
 for(let i=0;i<normals.count;i+=3){const a=new Vector3().fromBufferAttribute(normals,i),b=new Vector3().fromBufferAttribute(normals,i+1);if(a.distanceTo(b)>.01)smoothTriangles++;}
 assert.ok(smoothTriangles>100,'Rounded helmet surfaces require interpolated normals, not flat triangle normals.');
 }finally{rig.dispose();}
});
test('rounded study is opt-in and replaces stacked torso/yoke with continuous geometry',()=>{
 const regular=buildHockeyPlayerRig(),study=buildHockeyPlayerRig({finish:'rounded-study',stage:'young'});
 try{assert.ok(regular.group.userData.parts.includes('shoulder-yoke'));assert.equal(study.group.userData.parts.includes('shoulder-yoke'),false);assert.ok(study.group.userData.parts.includes('continuous-rounded-jersey'));assert.ok(study.group.userData.parts.includes('friendly-smile'));assert.deepEqual(study.group.userData.carryContact,regular.group.userData.carryContact);study.applyPose({lookYaw:.4,turn:.3});assert.ok(new Box3().setFromObject(study.group).getSize(new Vector3()).toArray().every(Number.isFinite));}finally{regular.dispose();study.dispose();}
});
test('positive preparation turn agrees with positive head yaw and lateral direction',()=>{
 const rig=buildHockeyPlayerRig();try{
 rig.applyPose({turn:.8});
 const direction=new Vector3(0,0,-1).applyQuaternion(rig.group.getObjectByName('torso').quaternion);
 assert.ok(direction.x>0,'Positive torso turn must face toward local +X.');
 }finally{rig.dispose();}
});
