import test from 'node:test';
import assert from 'node:assert/strict';
import { CAMERA_LIMITS, foundationCamera, foundationPixelToWorld } from './foundationCamera.js';
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
