import test from 'node:test';
import assert from 'node:assert/strict';
import {PerspectiveCamera,Vector3} from 'three';
import {buildHockeyPlayerRig} from '../one-on-one/hockeyPlayerRig.js';
import {CHARACTER_STAGES} from './characterPresentation.js';
import {parseStartingView} from './questionCamera.js';

test('real first-person glove and stick surfaces are visible at neutral desktop and phone entry',()=>{
 for(const stage of ['young','youth','older'])for(const aspect of [16/9,.6]) for(const goalie of [false,true]) {
 const rig=buildHockeyPlayerRig({view:'first-person',stage,goalie});try{
 const entry=parseStartingView({type:'first-person',actorId:'observer'});
 const camera=new PerspectiveCamera(entry.fov,aspect,.04,180),pitch=entry.lookPitch;
 camera.position.set(0,CHARACTER_STAGES[stage].eyeHeight,0);camera.lookAt(0,camera.position.y+Math.sin(pitch),-Math.cos(pitch));camera.updateMatrixWorld();
 for(const name of [goalie?'equipment-cream':'equipment-pants','equipment-carbon']){
  const mesh=rig.group.getObjectByName(name),positions=mesh.geometry.getAttribute('position');let visible=0;
  for(let i=0;i<positions.count;i++){const point=new Vector3().fromBufferAttribute(positions,i).project(camera);if(Math.abs(point.x)<1&&Math.abs(point.y)<1&&point.z>-1&&point.z<1)visible++;}
  assert.ok(visible>30,`${stage}/${aspect}: ${name} must have actual surfaces in entry frustum, got${visible}`);
 }
 }finally{rig.dispose();}}
});
test('first-person equipment uses the exact full-world vertices rather than a head-locked enlarged prop',()=>{
 const world=buildHockeyPlayerRig({stage:'young'}),eye=buildHockeyPlayerRig({view:'first-person',stage:'young'});
 try{for(const name of ['equipment-pants','equipment-carbon']){
 const points=world.group.getObjectByName(name).geometry.getAttribute('position'),subset=eye.group.getObjectByName(name).geometry.getAttribute('position');
 const key=(p,i)=>`${p.getX(i)},${p.getY(i)},${p.getZ(i)}`,set=new Set(Array.from({length:points.count},(_,i)=>key(points,i)));
 for(let i=0;i<subset.count;i++)assert.ok(set.has(key(subset,i)));
 }}finally{world.dispose();eye.dispose();}
});
