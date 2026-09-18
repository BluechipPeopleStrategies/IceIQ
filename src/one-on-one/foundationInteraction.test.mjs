import test from 'node:test';
import assert from 'node:assert/strict';
import data from './foundationContent.json' with {type:'json'};
import {rinkLandmarks,rinkRole,initialRolePositions,clampRinkPoint} from './foundationInteraction.js';
test('every named landmark is reachable at its teaching location',()=>{
  for(const [id,, ,x,y] of data.spots) assert.ok(rinkLandmarks(x,y).includes(id),`${id} at ${x},${y}: ${rinkLandmarks(x,y)}`);
});
test('both ends, long boards, benches and overlapping net-front areas can be selected',()=>{
  for(const sign of [-1,1]){assert.ok(rinkLandmarks(sign*7.9248,9).includes('blue'));assert.ok(rinkLandmarks(sign*27.8,0).includes('net'));assert.ok(rinkLandmarks(sign*30.48,0).includes('boards'));}
  assert.deepEqual(rinkLandmarks(4,-15.7),['benches']);
  assert.ok(rinkLandmarks(25,0).includes('crease'));assert.ok(rinkLandmarks(25,0).includes('netfront'));
  assert.deepEqual(rinkLandmarks(34,17),[]);assert.deepEqual(rinkLandmarks(NaN,0),[]);
});
test('role selection follows moved markers and practice placement stays inside rounded ice',()=>{
  const positions=initialRolePositions();positions.C={x:18,y:2};
  assert.equal(rinkRole(18,2,positions),'C');assert.equal(rinkRole(-1.1,0,positions),null);
  for(const x of [-99,99])for(const y of [-99,99]){const p=clampRinkPoint(x,y);assert.ok(Math.hypot(Math.abs(p.x)-23.78,Math.abs(p.y)-6.254)<=5.70001);}
  assert.deepEqual(clampRinkPoint(NaN,Infinity),{x:0,y:0});
});
