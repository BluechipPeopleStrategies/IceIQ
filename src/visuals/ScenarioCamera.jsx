import { useLayoutEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { MOUSE, TOUCH } from 'three';
import { OrbitControls } from 'three-stdlib';
import { getReadSceneCamera } from '../one-on-one/readSequenceVisuals.js';

/** Native camera input exists only during explicit adjustment. No damping,
 * autoplay, pan, answer callbacks or independently scheduled frames. */
export function connectScenarioCameraControls(camera, element, target, invalidate) {
  const previousTouchAction = element.style.touchAction || 'pan-y';
  const previousTabIndex = element.getAttribute('tabindex');
  const previousLabel = element.getAttribute('aria-label');
  element.setAttribute('tabindex', '0');
  element.setAttribute('aria-label', 'Adjust camera. Drag or use arrow keys to rotate. Pinch, scroll, or use plus and minus to zoom.');
  const controls = new OrbitControls(camera, element);
  controls.target.set(...target);
  controls.enablePan = false;
  controls.enableDamping = false;
  controls.autoRotate = false;
  controls.minPolarAngle = .0001;
  controls.maxPolarAngle = Math.PI * .4;
  controls.minZoom = .65;
  controls.maxZoom = 2.5;
  controls.rotateSpeed = .65;
  controls.zoomSpeed = .85;
  controls.mouseButtons = { LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: -1 };
  controls.touches = { ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_ROTATE };
  const requestFrame = () => invalidate();
  controls.addEventListener('change', requestFrame);
  controls.update();
  const keyboard = event => {
    const angle = Math.PI / 30;
    if (event.key === 'ArrowLeft') controls.setAzimuthalAngle(controls.getAzimuthalAngle() + angle);
    else if (event.key === 'ArrowRight') controls.setAzimuthalAngle(controls.getAzimuthalAngle() - angle);
    else if (event.key === 'ArrowUp') controls.setPolarAngle(Math.max(controls.minPolarAngle, controls.getPolarAngle() - angle));
    else if (event.key === 'ArrowDown') controls.setPolarAngle(Math.min(controls.maxPolarAngle, controls.getPolarAngle() + angle));
    else if (['+', '=', '-', '_'].includes(event.key)) {
      camera.zoom = Math.max(controls.minZoom, Math.min(controls.maxZoom, camera.zoom * (event.key === '+' || event.key === '=' ? 1.12 : 1 / 1.12)));
      camera.updateProjectionMatrix();
      controls.update();
      invalidate();
    } else return;
    event.preventDefault();
  };
  element.addEventListener('keydown', keyboard);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    element.removeEventListener('keydown', keyboard);
    controls.removeEventListener('change', requestFrame);
    controls.dispose();
    element.style.touchAction = previousTouchAction;
    for (const [name, value] of [['tabindex', previousTabIndex], ['aria-label', previousLabel]]) {
      if (value == null) element.removeAttribute(name);
      else element.setAttribute(name, value);
    }
  };
}

/** Camera fitting depends on the framing values, not per-frame object identity.
 * Leaving adjustment retains the chosen angle and zoom for answering. */
export default function ScenarioCamera({ bounds, cameraPreset = 'broadcast', cameraAdjusting = false }) {
  const { camera, gl, size, invalidate } = useThree();
  const target = useRef([0, 0, 0]);
  const { minX, maxX, minY, maxY } = bounds;
  useLayoutEffect(() => {
    const view = getReadSceneCamera({ minX, maxX, minY, maxY }, size.width / Math.max(1, size.height), cameraPreset);
    target.current = view.target;
    camera.position.set(...view.position);
    camera.up.set(0, 1, 0);
    camera.zoom = 1;
    camera.lookAt(...view.target);
    for (const key of ['left', 'right', 'top', 'bottom', 'near', 'far']) camera[key] = view[key];
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    invalidate();
  }, [minX, maxX, minY, maxY, cameraPreset, camera, size.width, size.height, invalidate]);

  useLayoutEffect(() => {
    if (!cameraAdjusting) return undefined;
    return connectScenarioCameraControls(camera, gl.domElement, target.current, invalidate);
  }, [cameraAdjusting, minX, maxX, minY, maxY, cameraPreset, camera, gl, size.width, size.height, invalidate]);
  return null;
}
