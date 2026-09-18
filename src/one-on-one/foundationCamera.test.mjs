import test from 'node:test';
import assert from 'node:assert/strict';
import { CAMERA_LIMITS, CAMERA_CLIP, RINK_SURFACES, foundationCamera, foundationPixelToWorld,fitRinkZoom } from './foundationCamera.js';
import {Shape, ExtrudeGeometry,PerspectiveCamera,Vector3} from 'three';
test('rink texture coordinates preserve centre and attack-right orientation', () => {
  assert.deepEqual(foundationPixelToWorld(350,190),[0,.025,0]);
  assert.ok(Math.abs(foundationPixelToWorld(350+26.91384*9.7,190)[0]-26.91384)<1e-10);
  assert.ok(foundationPixelToWorld(350,190-6.25*9.7)[2]<0);
});
test('inspection camera stays above ice and cannot reverse attacking ends', () => {
  assert.ok(CAMERA_LIMITS.azimuth<Math.PI/2);
  assert.ok(CAMERA_LIMITS.maxPolar<Math.PI/2);
  for(const mode of ['perspective','overhead'])assert.ok(foundationCamera(mode)[1]>0);
  assert.ok(CAMERA_LIMITS.minDistance>0);
});
test('beveled base stays visibly below ice across the permitted camera depth range', () => {
  const shape = new Shape();
  shape.moveTo(-30,-13);shape.lineTo(30,-13);shape.lineTo(30,13);shape.lineTo(-30,13);shape.closePath();
  const geometry = new ExtrudeGeometry(shape,{depth:RINK_SURFACES.depth,bevelEnabled:true,bevelSize:.18,bevelThickness:RINK_SURFACES.bevelThickness,bevelSegments:3,steps:1});
  geometry.computeBoundingBox();
  const baseTop = RINK_SURFACES.baseY + geometry.boundingBox.max.z;
  const gap = foundationPixelToWorld(350,190)[1] - baseTop;
  const farthestSurface = CAMERA_LIMITS.maxDistance + 36;
  // Perspective depth quantization at a conservative 16-bit depth buffer.
  const depthStep = farthestSurface ** 2 * (CAMERA_CLIP.far - CAMERA_CLIP.near) / (CAMERA_CLIP.far * CAMERA_CLIP.near * (2 ** 16 - 1));
  assert.ok(gap * Math.cos(CAMERA_LIMITS.maxPolar) > depthStep, 'ice and base need distinct depth values at the furthest allowed view');
  assert.ok(CAMERA_CLIP.near < CAMERA_LIMITS.minDistance - 36, 'near plane must not cut the rink at closest zoom');
  geometry.dispose();
});
test('automatic fit preserves all rink and bench corners at phone and desktop aspects',()=>{
  for(const aspect of [.85,1.4,3.2])for(const azimuth of [-.38,0,.38])for(const polar of [.04,.95]){
    const camera=new PerspectiveCamera(42,aspect,CAMERA_CLIP.near,CAMERA_CLIP.far);
    camera.position.set(85*Math.sin(polar)*Math.sin(azimuth),85*Math.cos(polar),85*Math.sin(polar)*Math.cos(azimuth));camera.lookAt(0,0,0);fitRinkZoom(camera);
    for(const x of [-31.1,31.1])for(const z of [-16.9,13.6])for(const y of [-1.1,1.1]){const point=new Vector3(x,y,z).project(camera);assert.ok(Math.abs(point.x)<=.90001&&Math.abs(point.y)<=.90001);assert.ok(point.z>-1&&point.z<1);}
  }
});
