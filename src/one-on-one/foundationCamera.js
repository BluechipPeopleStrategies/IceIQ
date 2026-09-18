export const CAMERA_LIMITS = { azimuth: .38, minPolar: .04, maxPolar: .95, minDistance: 46, maxDistance: 110 };
// Keep the drawing clear of the beveled base even on lower-precision depth buffers.
export const RINK_SURFACES = {baseY: -1.05, depth: .8, bevelThickness: .12, drawingY: .025};
export const CAMERA_CLIP = {near: 5, far: 250};
export function foundationCamera(view = 'perspective') {
  return view === 'overhead' ? [0, 88, .1] : [8, 64, 56];
}
// Original SVG pixels map to the same metre-based plane used by the board geometry.
export function foundationPixelToWorld(x, y) { return [(x - 350) / 9.7, RINK_SURFACES.drawingY, (y - 190) / 9.7]; }
export function fitRinkZoom(camera,scale=1){
  camera.zoom=1;camera.updateProjectionMatrix();camera.updateMatrixWorld();
  let extent=0;
  for(const x of [-31.1,31.1])for(const z of [-16.9,13.6])for(const y of [-1.1,1.1]){
    const p=new Vector3(x,y,z).project(camera);extent=Math.max(extent,Math.abs(p.x),Math.abs(p.y));
  }
  camera.zoom=scale*.89/Math.max(extent,.01);camera.updateProjectionMatrix();
}
import {Vector3} from 'three';
