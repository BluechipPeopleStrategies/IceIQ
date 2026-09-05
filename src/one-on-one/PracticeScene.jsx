import { Component, memo, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import Skater from './Skater.jsx';
import PuckLocator3D from '../visuals/PuckLocator3D.jsx';
import { RINK, GOAL_X, makeIceTexture, roundedRinkShape } from './rinkMaterials.js';
import { isCoachRoutePoint, listenForCoachRouteTaps, worldPointToCoachRoute } from './coachRouteSurfaceInput.js';

class SceneBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div className="oo-render-error">The 3D rink could not start on this browser. Try reloading with hardware acceleration enabled. <a href="#">Back to RinkReads</a></div> : this.props.children; }
}

function Rail({ height, thickness, colour, inset = 0, clear = false }) {
  const geometry = useMemo(() => {
    const outer = roundedRinkShape(inset - .18), inner = roundedRinkShape(inset + .1);
    outer.holes.push(new THREE.Path(inner.getPoints(24).reverse()));
    return new THREE.ExtrudeGeometry(outer, { depth: thickness, bevelEnabled: false, steps: 1, curveSegments: 16 });
  }, [thickness, inset]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, height, 0]} receiveShadow={!clear} castShadow={!clear}><meshStandardMaterial color={colour} roughness={.6} transparent={clear} opacity={clear ? .08 : 1} depthWrite={!clear} /></mesh>;
}

function Ice({ hideZoneLines = false, clearBoards = false }) {
  const texture = useMemo(() => makeIceTexture({ hideZoneLines }), [hideZoneLines]);
  useEffect(() => () => texture.dispose(), [texture]);
  const geometry = useMemo(() => {
    const g = new THREE.ShapeGeometry(roundedRinkShape(.08), 28);
    const positions = g.getAttribute('position'), uv = g.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) uv.setXY(i, positions.getX(i) / RINK.widthM + .5, positions.getY(i) / RINK.lengthM + .5);
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <group>
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><meshStandardMaterial map={texture} roughness={.37} metalness={.12} color="#f2fbff" /></mesh>
    <Rail height={0} thickness={.18} colour="#d2a643" />
    <Rail height={.18} thickness={.92} colour="#e8ece8" clear={clearBoards} />
    <Rail height={1.1} thickness={.10} colour="#253646" clear={clearBoards} />
  </group>;
}

function Tube({ a, b, radius = .035, colour = '#bd3f49' }) {
  const mid = a.map((v, i) => (v + b[i]) / 2);
  const direction = new THREE.Vector3(...b).sub(new THREE.Vector3(...a));
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
  return <mesh position={mid} quaternion={q} castShadow><cylinderGeometry args={[radius, radius, direction.length(), 10]} /><meshStandardMaterial color={colour} roughness={.45} /></mesh>;
}

export function Goal() {
  const w = .9144, h = 1.2192, z = -GOAL_X;
  const lines = [
    [[-w, 0, z], [-w, h, z]], [[w, 0, z], [w, h, z]], [[-w, h, z], [w, h, z]],
    [[-w, .03, z], [-.74, .03, z - 1.1]], [[w, .03, z], [.74, .03, z - 1.1]],
    [[-.74, .03, z - 1.1], [.74, .03, z - 1.1]],
    [[-w, h, z], [-.6, .91, z - .85]], [[w, h, z], [.6, .91, z - .85]],
    [[-.6, .91, z - .85], [.6, .91, z - .85]],
  ];
  const net = [];
  for (let i = 0; i <= 12; i++) { const x = -.74 + i * 1.48 / 12; net.push([[x, .03, z - 1.1], [x * .81, .91, z - .85]]); }
  for (let i = 0; i <= 9; i++) { const y = .03 + i * .88 / 9, rw = .74 - i * .14 / 9, rz = z - 1.1 + i * .25 / 9; net.push([[-rw, y, rz], [rw, y, rz]]); }
  for (const side of [-1, 1]) for (let i = 0; i <= 8; i++) {
    const t = i / 8; net.push([[side * w, h * t, z], [side * (.74 - .14 * t), .03 + .88 * t, z - 1.1 + .25 * t]]);
  }
  return <group>{lines.map(([a, b], i) => <Tube key={i} a={a} b={b} />)}{net.map(([a, b], i) => <Tube key={`n${i}`} a={a} b={b} radius={.007} colour="#d7e0df" />)}</group>;
}

function Arena({ openView = false }) {
  return <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.18, 0]} receiveShadow><planeGeometry args={[100, 120]} /><meshStandardMaterial color="#0B1A33" roughness={.9} /></mesh>
    {!openView && <group>{[-1, 1].map(side => <group key={side}>
      {[0, 1, 2, 3, 4].map(row => <mesh key={row} position={[side * (15.4 + row * 1.1), .7 + row * .55, -1]} receiveShadow><boxGeometry args={[1.1, .35 + row * 1.08, 64]} /><meshStandardMaterial color={row % 2 ? '#292b2d' : '#202224'} /></mesh>)}
      <mesh position={[side * 13.3, 2.1, -5]}><boxGeometry args={[.04, .07, 43]} /><meshBasicMaterial color="#aacde2" /></mesh>
    </group>)}
    <mesh position={[0, 4.5, -35]}><boxGeometry args={[46, 10, 1]} /><meshStandardMaterial color="#1b1d20" /></mesh>
    <mesh position={[0, 4.2, -34.4]}><boxGeometry args={[11, 2.5, .2]} /><meshStandardMaterial color="#101214" /></mesh>
    <mesh position={[0, 2.4, -34.22]}><boxGeometry args={[26, .04, .08]} /><meshBasicMaterial color="#C9A24B" /></mesh></group>}
  </group>;
}

function CameraRig({ cameraMode, axesRef }) {
  const { camera, size } = useThree();
  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height);
    if (cameraMode === 'full') { const horizontal=aspect>1.2;camera.position.set(0, horizontal?48:74, 0);camera.up.set(...(horizontal?[-1,0,0]:[0,0,-1]));camera.lookAt(0,0,0);camera.fov=horizontal?42:51;if(axesRef)axesRef.current=horizontal?'horizontal':'vertical'; }
    else if (cameraMode === 'tactical') { camera.position.set(0, 34, -18); camera.up.set(0, 0, -1); camera.lookAt(0, 0, -18); camera.fov = aspect < 1 ? 60 : 43; }
    else { camera.up.set(0, 1, 0); camera.position.set(12, 16, -1); camera.lookAt(0, 0, -20); camera.fov = aspect < 1 ? 69 : 46; }
    camera.updateProjectionMatrix();
  }, [camera, cameraMode, size.width, size.height]);
  return null;
}

function Puck({ frameRef, showLabel = false }) {
  return <PuckLocator3D frameRef={frameRef} showLabel={showLabel} />;
}

function Guides({ frameRef, visible }) {
  const gap = useRef();
  useFrame(() => {
    if (!gap.current) return;
    const f = frameRef.current; if (!f) return;
    const a = f.attacker, d = f.defender;
    const mid = [(a.y + d.y) / 2, .025, -(a.x + d.x) / 2];
    gap.current.position.set(...mid);
    const dir = new THREE.Vector3(d.y - a.y, 0, a.x - d.x);
    gap.current.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    gap.current.scale.y = Math.max(.001, dir.length());
  });
  return <group visible={visible}>
    <mesh ref={gap}><cylinderGeometry args={[.026, .026, 1, 8]} /><meshBasicMaterial color="#d79d46" transparent opacity={.7} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .012, -18]}><planeGeometry args={[3.8, 14]} /><meshBasicMaterial color="#5aabb0" transparent opacity={.045} depthWrite={false} /></mesh>
  </group>;
}

function RouteTapInput({ onPoint }) {
  const { gl, camera } = useThree();
  const callback = useRef(onPoint);
  callback.current = onPoint;
  useEffect(() => {
    const canvas = gl.domElement;
    const raycaster = new THREE.Raycaster();
    const ice = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hit = new THREE.Vector3();
    return listenForCoachRouteTaps(canvas, event => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height || event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return;
      const pointer = new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2);
      camera.updateMatrixWorld();
      raycaster.setFromCamera(pointer, camera);
      if (!raycaster.ray.intersectPlane(ice, hit)) return;
      const point = worldPointToCoachRoute(hit);
      if (point) callback.current(point);
    });
  }, [gl, camera]);
  return null;
}

function RouteOverlay({ points }) {
  const validPoints = useMemo(() => (points || []).filter(isCoachRoutePoint), [points]);
  const linePoints = useMemo(() => validPoints.map(point => [point.y, .06, -point.x]), [validPoints]);
  return <group>
    {/* Drei Line disposes its line geometry and material when points change or it unmounts. */}
    {linePoints.length > 1 && <Line points={linePoints} color="#153a50" lineWidth={3} />}
    {validPoints.map((point, index) => <mesh key={index} rotation={[-Math.PI / 2, 0, 0]} position={[point.y, .075, -point.x]}>
      <ringGeometry args={index === 0 ? [.38, .52, 24] : [.2, .38, 24]} /><meshBasicMaterial color={index === 0 ? '#153a50' : '#886714'} side={THREE.DoubleSide} />
    </mesh>)}
  </group>;
}

function Content({ frameRef, camera, onPlace, selectedActor, showGuides, roster, onSelect, axesRef, routePoints, onRoutePoint }) {
  const state = frameRef.current;
  const dragging = useRef(null);
  const routing = typeof onRoutePoint === 'function';
  useEffect(() => { dragging.current = null; }, [routing]);
  function pointerDown(e) {
    e.stopPropagation();
    const point={x:-e.point.z,y:e.point.x};
    const nearest=frameRef.current.actors?.map(a=>({id:a.id,d:Math.hypot(a.x-point.x,a.y-point.y)})).sort((a,b)=>a.d-b.d)[0];
    const id=nearest?.d<1.8?nearest.id:selectedActor;
    dragging.current=id;onSelect?.(id);e.target.setPointerCapture(e.pointerId);onPlace(point,id);
  }
  function release(e){dragging.current=null;if(e.target.hasPointerCapture?.(e.pointerId))e.target.releasePointerCapture(e.pointerId);}
  return <>
    <color attach="background" args={['#0B1A33']} /><fog attach="fog" args={['#0B1A33', 68, 140]} />
    <ambientLight intensity={.95} color="#dfedf5" />
    <hemisphereLight args={['#f5fbff', '#486479', 1.35]} />
    <directionalLight position={[-10, 27, 0]} intensity={2.25} color="#fff9ed" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-35} shadow-camera-right={35} shadow-camera-top={38} shadow-camera-bottom={-38} shadow-camera-near={1} shadow-camera-far={75} shadow-bias={-.00015} shadow-normalBias={.025} />
    <CameraRig cameraMode={camera} axesRef={axesRef}/><Arena /><Ice /><Goal />
    {roster ? roster.map((a,i)=><Skater key={a.id} frameRef={frameRef} actorKey={a.id} colour={a.team==='home'?'#0B1A33':'#C9A24B'} number={a.label||String(i+1)} goalie={a.role==='goalie'} selected={selectedActor===a.id}/>) : <><Skater frameRef={frameRef} actorKey="attacker" colour="#0B1A33" number="17" selected={selectedActor === 'attacker' || (!selectedActor && state?.setup?.role !== 'defender')} />
    <Skater frameRef={frameRef} actorKey="defender" colour="#C9A24B" number="8" selected={selectedActor === 'defender' || (!selectedActor && state?.setup?.role === 'defender')} />
    <Skater frameRef={frameRef} actorKey="goalie" colour="#0B1A33" number="1" goalie /></>}
    {roster&&<group rotation={[0,Math.PI,0]}><Goal/></group>}
    <Puck frameRef={frameRef} />{!roster&&<Guides frameRef={frameRef} visible={showGuides} />}
    {routePoints && <RouteOverlay points={routePoints} />}
    {routing && <RouteTapInput onPoint={onRoutePoint} />}
    {onPlace && !routing && <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .015, 0]} onPointerDown={pointerDown} onPointerMove={e=>{if(dragging.current){e.stopPropagation();onPlace({x:-e.point.z,y:e.point.x},dragging.current);}}} onPointerUp={release} onPointerCancel={release}><planeGeometry args={[RINK.widthM, RINK.lengthM]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>}
  </>;
}

function PracticeScene(props) {
  return <SceneBoundary><Canvas aria-label="Interactive one-on-one hockey practice rink" style={typeof props.onRoutePoint === 'function' ? { touchAction: 'pan-y' } : undefined} shadows={{ type: THREE.PCFShadowMap }} dpr={[1, 1.5]} camera={{ position: [12, 16, -1], fov: 46, near: .1, far: 160 }} gl={{ antialias: true, powerPreference: 'high-performance', alpha: false }} fallback={<div className="oo-render-error">This browser cannot display the 3D rink. <a href="#">Back to RinkReads</a></div>}>
    <Content {...props} />
  </Canvas></SceneBoundary>;
}

export { Ice, Arena, Puck };
export default memo(PracticeScene);
