import { useLayoutEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { MOUSE, TOUCH, Vector3 } from 'three';
import { OrbitControls } from 'three-stdlib';
import { getReadSceneCamera } from '../one-on-one/readSequenceVisuals.js';

/** Native camera input exists only during explicit adjustment. No damping,
 * autoplay, answer callbacks or independently scheduled frames. Pan is explicit. */
export function connectScenarioCameraControls(camera, element, target, invalidate, { panMode = false, directInput = false, bounds, onTargetChange } = {}) {
  const previousTouchAction = element.style.touchAction || 'pan-y';
  const previousTabIndex = element.getAttribute('tabindex');
  const previousLabel = element.getAttribute('aria-label');
  element.setAttribute('tabindex', '0');
  element.setAttribute('aria-label', `Adjust camera. Drag or use arrow keys to ${panMode ? 'move the view across the rink' : 'rotate'}. Pinch, scroll, or use plus and minus to zoom.`);
  const wheelGuard = event => { if (directInput && !event.ctrlKey && !event.metaKey) event.stopImmediatePropagation(); };
  element.addEventListener('wheel',wheelGuard,{capture:true});
  const controls = new OrbitControls(camera, element);
  controls.target.set(...target);
  controls.enablePan = panMode || directInput;
  controls.enableRotate = !panMode;
  controls.screenSpacePanning = false;
  controls.enableDamping = false;
  controls.autoRotate = false;
  controls.minPolarAngle = .0001;
  controls.maxPolarAngle = Math.PI * .4;
  controls.minZoom = .65;
  controls.maxZoom = 2.5;
  controls.rotateSpeed = .65;
  controls.zoomSpeed = .85;
  controls.mouseButtons = { LEFT: panMode ? MOUSE.PAN : MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: directInput ? MOUSE.PAN : -1 };
  controls.touches = { ONE: panMode ? TOUCH.PAN : TOUCH.ROTATE, TWO: panMode || directInput ? TOUCH.DOLLY_PAN : TOUCH.DOLLY_ROTATE };
  // Direct dragging is available without opening the button panel. Modified
  // wheel zoom avoids trapping normal page scrolling over a large rink.
  let clamping = false;
  const requestFrame = () => {
    if (clamping) return;
    // Retain enough surrounding ice for useful composition without losing the
    // rink altogether. Moving a view never changes any canonical actor data.
    if (bounds) {
      const bounded = new Vector3(
        Math.max(bounds.minY - 4, Math.min(bounds.maxY + 4, controls.target.x)),
        target[1],
        Math.max(-bounds.maxX - 4, Math.min(-bounds.minX + 4, controls.target.z)),
      );
      const correction = bounded.clone().sub(controls.target);
      if (correction.lengthSq() > 1e-16) {
        controls.target.copy(bounded);
        camera.position.add(correction);
        clamping = true; controls.update(); clamping = false;
      }
    }
    onTargetChange?.(controls.target.toArray());
    invalidate();
  };
  controls.addEventListener('change', requestFrame);
  controls.update();
  const keyboard = event => {
    const angle = Math.PI / 30;
    if (panMode && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      const step = (camera.top - camera.bottom) / Math.max(1, camera.zoom) * .035;
      const right = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0).normalize();
      const up = new Vector3().crossVectors(camera.up, right).normalize();
      const offset = (event.key === 'ArrowLeft' || event.key === 'ArrowRight' ? right : up)
        .multiplyScalar(step * (event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? -1 : 1));
      camera.position.add(offset); controls.target.add(offset); controls.update();
    } else if (event.key === 'ArrowLeft') controls.setAzimuthalAngle(controls.getAzimuthalAngle() + angle);
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
  const release = () => {
    if (released) return;
    released = true;
    element.removeEventListener('keydown', keyboard);
    element.removeEventListener('wheel',wheelGuard,{capture:true});
    controls.removeEventListener('change', requestFrame);
    controls.dispose();
    element.style.touchAction = previousTouchAction;
    for (const [name, value] of [['tabindex', previousTabIndex], ['aria-label', previousLabel]]) {
      if (value == null) element.removeAttribute(name);
      else element.setAttribute(name, value);
    }
  };
  // Accessible buttons use the same live controls as drag/touch. Commands never
  // enter the lesson model, and a disposed session rejects delayed clicks.
  release.command = ({ type, direction }) => {
    if (released || ![-1, 1].includes(direction)) return;
    if (type === 'zoom') {
      camera.zoom = Math.max(controls.minZoom, Math.min(controls.maxZoom, camera.zoom * 1.12 ** direction));
      camera.updateProjectionMatrix();
    } else if (type === 'rotate') controls.setAzimuthalAngle(controls.getAzimuthalAngle() + direction * Math.PI / 12);
    else if (type === 'tilt') controls.setPolarAngle(Math.max(controls.minPolarAngle, Math.min(controls.maxPolarAngle, controls.getPolarAngle() + direction * Math.PI / 24)));
    else if (type === 'pan-x' || type === 'pan-y') {
      const right = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0).normalize();
      const axis = type === 'pan-x' ? right : new Vector3().crossVectors(camera.up, right).normalize();
      const offset = axis.multiplyScalar((camera.top - camera.bottom) / camera.zoom * .06 * direction);
      camera.position.add(offset); controls.target.add(offset);
    } else return;
    controls.update(); requestFrame();
  };
  return release;
}

/** Camera fitting depends on the framing values, not per-frame object identity.
 * Leaving adjustment retains the chosen angle and zoom for answering. */
export default function ScenarioCamera({ bounds, cameraPreset = 'broadcast', cameraAdjusting = false, cameraPanMode = false, cameraResetToken = 0, cameraCommand = null, cameraDirect = false }) {
  const { camera, gl, size, invalidate } = useThree();
  const target = useRef([0, 0, 0]);
  const session = useRef(null), handledCommand = useRef(cameraCommand);
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
  }, [minX, maxX, minY, maxY, cameraPreset, cameraResetToken, camera, size.width, size.height, invalidate]);

  useLayoutEffect(() => {
    if (!cameraAdjusting && !cameraDirect) return undefined;
    const release = connectScenarioCameraControls(camera, gl.domElement, target.current, invalidate, {
      panMode: cameraAdjusting && cameraPanMode, directInput: cameraDirect && !cameraAdjusting, bounds: { minX, maxX, minY, maxY }, onTargetChange: value => { target.current = value; },
    });
    session.current = release;
    return () => { release(); session.current = null; };
  }, [cameraAdjusting, cameraDirect, cameraPanMode, cameraResetToken, minX, maxX, minY, maxY, cameraPreset, camera, gl, size.width, size.height, invalidate]);
  useLayoutEffect(() => {
    if (cameraCommand === handledCommand.current) return;
    handledCommand.current = cameraCommand;
    if (cameraAdjusting && cameraCommand) session.current?.command(cameraCommand);
  }, [cameraCommand, cameraAdjusting]);
  return null;
}
