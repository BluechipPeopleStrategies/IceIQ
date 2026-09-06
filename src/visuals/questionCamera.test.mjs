import {PerspectiveCamera,Vector3} from 'three';
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseStartingView, resolvePlayerEye, questionViewEntry } from './questionCamera.js';
test('saved views require explicit valid projection and observer', () => {
 assert.equal(parseStartingView(null), null);
 assert.deepEqual(parseStartingView('overhead'), {type:'preset',preset:'overhead'});
 assert.throws(()=>parseStartingView({type:'first-person'}), /actorId/);
 assert.throws(()=>parseStartingView({type:'perspective',position:[0,0,0],target:[0,0,0]}), /distinct/);
 assert.throws(()=>resolvePlayerEye({type:'first-person',actorId:'missing'}, []), /observer/);
});
test('actor eye mapping follows body direction but look does not mutate body', () => {
 const actor=Object.freeze({id:'D1',x:10,y:3,facing:0});
 const view={type:'first-person',actorId:'D1',eyeHeight:1.5};
 assert.deepEqual(resolvePlayerEye(view,[actor]).position,[3,1.5,-10]);
 assert.deepEqual(resolvePlayerEye(view,[actor]).target,[3,1.5,-11]);
 const side=resolvePlayerEye(view,[actor],{yaw:Math.PI/2,pitch:0});
 assert.ok(Math.abs(side.target[0]-4)<1e-9); assert.equal(actor.facing,0);
 assert.throws(()=>resolvePlayerEye(view,[{...actor,facing:NaN}]), /facing/);
});
test('question entry applies once, re-entry restores, absent setting retains current view', () => {
 const current={type:'preset',preset:'rink-side'};
 assert.equal(questionViewEntry('a','a','overhead',current),current);
 assert.equal(questionViewEntry('a','b',null,current),current);
 assert.deepEqual(questionViewEntry('b','a','overhead',current),{type:'preset',preset:'overhead'});
});

test('true perspective changes apparent size and visibility from different eyes without moving players',()=>{
 const actors=Object.freeze([Object.freeze({id:'D',x:0,y:0,facing:0}),Object.freeze({id:'F',x:8,y:2,facing:Math.PI})]);
 const camera=new PerspectiveCamera(70,1,.04,180),view=resolvePlayerEye({actorId:'D',eyeHeight:1.5},actors);
 camera.position.set(...view.position);camera.lookAt(...view.target);camera.updateMatrixWorld();
 const heightAt=x=>new Vector3(0,2,-x).project(camera).y-new Vector3(0,0,-x).project(camera).y;
 assert.ok(heightAt(4)>heightAt(8)*1.9,'near players appear larger in real perspective');
 const first=new Vector3(2,1,-8).project(camera);
 const turned=resolvePlayerEye({actorId:'D',eyeHeight:1.5},actors,{yaw:Math.PI/2,pitch:0});camera.lookAt(...turned.target);camera.updateMatrixWorld();
 const second=new Vector3(2,1,-8).project(camera);assert.notEqual(first.x,second.x);assert.equal(actors[1].x,8);assert.equal(actors[0].facing,0);
});
