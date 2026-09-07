import { useCallback, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Vector3 } from 'three';
import { placePuckLabel, puckLabelObstacles } from './puckLabelPlacement.js';
import './PuckLocator3D.css';

export function placePuckLocator(object, puck) {
  if (!object) return;
  object.visible = Boolean(puck && Number.isFinite(puck.x) && Number.isFinite(puck.y));
  if (object.visible) object.position.set(puck.y, .075, -puck.x);
}

export function puckLocatorRadius(worldUnitsPerPixel) {
  return Math.max(.2, Math.min(.42, 4 * worldUnitsPerPixel));
}

export function alignPuckHalo(halo, camera) {
  if (halo) halo.quaternion.copy(camera.quaternion);
}

/** Legibility overlay centered on the actual puck, including during flight. */
export default function PuckLocator3D({ puck, frameRef, showLabel = false }) {
  const holder = useRef(null), marker = useRef(null), halo = useRef(null);
  const tag = useRef(null), previousQuadrant = useRef(null);
  const projected = useMemo(() => new Vector3(), []);
  const { invalidate } = useThree();
  const attachTag = useCallback(node => { tag.current = node; if (node) invalidate(); }, [invalidate]);
  const initialPuck = frameRef ? frameRef.current?.puck : puck;
  const initiallyVisible = Boolean(initialPuck && Number.isFinite(initialPuck.x) && Number.isFinite(initialPuck.y));
  useFrame(({ camera, size }) => {
    const current = frameRef ? frameRef.current?.puck : puck;
    placePuckLocator(holder.current, current);
    if (!holder.current?.visible || !marker.current) { if (tag.current) tag.current.style.visibility = 'hidden'; return; }
    camera.updateMatrixWorld();
    const unitsPerPixel = camera.isOrthographicCamera
      ? (camera.top - camera.bottom) / camera.zoom / Math.max(1, size.height)
      : 2 * Math.hypot(camera.position.x - current.y, camera.position.y, camera.position.z + current.x) * Math.tan(camera.fov * Math.PI / 360) / Math.max(1, size.height);
    marker.current.scale.setScalar(puckLocatorRadius(unitsPerPixel) / .28);
    alignPuckHalo(halo.current, camera);
    if (!tag.current) return;
    const project = (x, y, height) => {
      projected.set(y, height, -x).project(camera);
      return { x: (projected.x + 1) * size.width / 2, y: (1 - projected.y) * size.height / 2 };
    };
    const anchor = project(current.x, current.y, .075);
    if (anchor.x < 0 || anchor.x > size.width || anchor.y < 0 || anchor.y > size.height) { tag.current.style.visibility = 'hidden'; return; }
    const frame = frameRef?.current;
    const actors = frame?.actors || [frame?.attacker, frame?.defender, frame?.goalie];
    const placement = placePuckLabel({ anchor, viewport: size, labelSize: { width: 44, height: 22 },
      anchorRadius: .5 * marker.current.scale.x / unitsPerPixel,
      obstacles: puckLabelObstacles(actors, project), previousQuadrant: previousQuadrant.current });
    if (!placement) { tag.current.style.visibility = 'hidden'; return; }
    previousQuadrant.current = placement.quadrant;
    const style = tag.current.style;
    style.visibility = 'visible';
    style.setProperty('--pl-label-x', `${placement.offsetX.toFixed(1)}px`);
    style.setProperty('--pl-label-y', `${placement.offsetY.toFixed(1)}px`);
    style.setProperty('--pl-label-width', `${placement.width}px`);
    style.setProperty('--pl-label-height', `${placement.height}px`);
    style.setProperty('--pl-leader-length', `${placement.leaderLength.toFixed(1)}px`);
    style.setProperty('--pl-leader-angle', `${placement.leaderAngle.toFixed(4)}rad`);
    style.setProperty('--pl-leader-x', `${placement.leaderStartX.toFixed(1)}px`);
    style.setProperty('--pl-leader-y', `${placement.leaderStartY.toFixed(1)}px`);
  }, -1);
  return <group ref={holder} name="puck-locator" visible={initiallyVisible} position={initiallyVisible ? [initialPuck.y, .075, -initialPuck.x] : [0, .075, 0]}>
    <group ref={marker}>
      {/* The outline is a legibility overlay; the puck below stays on the ice. */}
      <group ref={halo}>
        <mesh renderOrder={98}><ringGeometry args={[.30, .45, 40]} /><meshBasicMaterial color="#FFFFFF" depthTest={false} depthWrite={false} toneMapped={false} /></mesh>
        <mesh renderOrder={99}><ringGeometry args={[.44, .5, 40]} /><meshBasicMaterial color="#0B1A33" depthTest={false} depthWrite={false} toneMapped={false} /></mesh>
      </group>
      <mesh renderOrder={100}><cylinderGeometry args={[.28, .28, .055, 24]} /><meshBasicMaterial color="#080D16" depthTest={false} depthWrite={false} toneMapped={false} /></mesh>
    </group>
    {showLabel && <Html center position={[0, 0, 0]} zIndexRange={[14, 4]} style={{ pointerEvents: 'none' }}>
      <span ref={attachTag} className="pl-screen-marker" aria-hidden="true"><span className="pl-screen-leader" /><span className="pl-screen-label">PUCK</span></span>
    </Html>}
  </group>;
}

export function SvgPuckLocator({ x = 0, y = 0, showLabel = false }) {
  return <g data-puck-locator="true" transform={`translate(${x} ${y})`} pointerEvents="none">
    <circle r=".56" fill="#FFFFFF" stroke="#0B1A33" strokeWidth=".09" />
    <circle r=".3" fill="#080D16" />
    {showLabel && <><path d="M .4 .35 L 1.05 1.05" stroke="#0B1A33" strokeWidth=".08" />
      <rect x=".86" y=".9" width="2.58" height="1.04" rx=".24" fill="#0B1A33" stroke="#FFFFFF" strokeWidth=".09" />
      <text x="2.15" y="1.63" textAnchor="middle" fill="#FFFFFF" fontFamily="Inter,Arial,sans-serif" fontWeight="800" fontSize=".66">PUCK</text></>}
  </g>;
}
