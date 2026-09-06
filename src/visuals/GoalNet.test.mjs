import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const cache=new URL('../../node_modules/.cache/goal-net/',import.meta.url);
mkdirSync(cache,{recursive:true});
const output=new URL('net.mjs',cache);
await build({entryPoints:[fileURLToPath(new URL('./GoalNet.jsx',import.meta.url))],outfile:fileURLToPath(output),bundle:true,packages:'external',format:'esm',platform:'node',jsx:'automatic',logLevel:'silent'});
const {createGoalNetGeometry}=await import(output.href);
test('woven net stays behind the unchanged goal mouth and leaves the scoring opening clear',()=>{
  const goalX=27.432, geometry=createGoalNetGeometry(goalX);
  try {
    const {min,max}=geometry.boundingBox;
    assert.ok(min.x>=-.92&&max.x<=.92&&max.y<1.225&&min.y>0);
    assert.ok(min.z>=-goalX-1.105&&max.z<=-goalX+.003);
    const p=geometry.getAttribute('position');
    assert.ok(p.count>1000);
    for(let i=0;i<p.count;i++){
      const [x,y,z]=[p.getX(i),p.getY(i),p.getZ(i)];
      assert.ok([x,y,z].every(Number.isFinite));
      assert.ok(!(Math.abs(z+goalX)<.003&&Math.abs(x)<.8&&y<1.1),'No mesh can cover the open goal mouth');
    }
  } finally {geometry.dispose();}
});
