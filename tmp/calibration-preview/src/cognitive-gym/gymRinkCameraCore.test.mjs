import test from 'node:test';
import assert from 'node:assert/strict';
import {OrthographicCamera,Vector3} from 'three';
import {gymRinkCamera} from './gymRinkCameraCore.js';
import {worldPointToEyesUpTap,pixelToWorldPoint} from './eyesUpScene3DCore.js';

test('tilted game camera keeps rink and skaters visible on phone and desktop',()=>{
 for(const aspect of [.65,1,1.5,2]){
  const c=gymRinkCamera(aspect),camera=new OrthographicCamera(c.left,c.right,c.top,c.bottom,c.near,c.far);
  camera.position.set(...c.position);camera.lookAt(...c.target);camera.updateMatrixWorld();
  assert.ok(Math.hypot(c.position[0]-c.target[0],c.position[2]-c.target[2])>10,'camera must show depth');
  for(const x of [-30.48,30.48])for(const y of [-12.954,12.954])for(const h of [0,2]){
   const p=new Vector3(y,h,-x).project(camera);assert.ok(Math.abs(p.x)<1&&Math.abs(p.y)<1&&Math.abs(p.z)<1,`${aspect}: rink corner clipped`);
  }
  const point=pixelToWorldPoint({x:200,y:120},900,500,0);
  const projected=new Vector3(point.x,point.y,point.z).project(camera),restored=projected.unproject(camera);
  const tap=worldPointToEyesUpTap(restored,900,500);assert.ok(Math.abs(tap.x-200)<1e-7&&Math.abs(tap.y-120)<1e-7);
 }
});
