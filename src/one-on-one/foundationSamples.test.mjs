import test from 'node:test';import assert from 'node:assert/strict';
import {holdingPose,HELMET_PARTS} from './foundationSamples.js';
test('holding demonstration preserves arm lengths throughout the raise',()=>{
  const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
  for(let i=0;i<=100;i++)for(const arm of holdingPose(i/100)){
    assert.ok(Math.abs(distance(arm.shoulder,arm.elbow)-.57)<1e-9);
    assert.ok(Math.abs(distance(arm.elbow,arm.wrist)-.55)<1e-9);
    assert.ok([...arm.elbow,...arm.wrist].every(Number.isFinite));
  }
});
test('pose is clamped and ends with hands together in front of chest',()=>{
  assert.deepEqual(holdingPose(-1),holdingPose(0));assert.deepEqual(holdingPose(2),holdingPose(1));
  const [a,b]=holdingPose(1);assert.ok(Math.hypot(...a.wrist.map((x,i)=>x-b.wrist[i]))<.15);
  assert.ok(a.wrist[2]>.5&&b.wrist[2]>.5);
  assert.deepEqual(HELMET_PARTS.map(x=>x.id),['shell','cage','strap']);
});
