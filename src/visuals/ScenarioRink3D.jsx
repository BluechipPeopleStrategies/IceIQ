import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import ScenarioCamera from './ScenarioCamera.jsx';
import Skater from '../one-on-one/Skater.jsx';
import { Arena, Ice, Goal, Puck } from '../one-on-one/PracticeScene.jsx';
import { createReadSceneFrame } from '../one-on-one/readSequenceVisuals.js';
import { listenForCoachRouteTaps, worldPointToCoachRoute } from '../one-on-one/coachRouteSurfaceInput.js';
import { watchWebglContextLoss } from '../cognitive-gym/webglLifecycle.js';

const world = (p, height = 0) => [p.y, height, -p.x];

function IceInput({ enabled, selectedActorId, editableIds, onMove, onIcePoint, framingSignature }) {
  const { gl, camera, size } = useThree();
  const callback = useRef({ selectedActorId, editableIds, onMove, onIcePoint });
  callback.current = { selectedActorId, editableIds, onMove, onIcePoint };
  useLayoutEffect(() => {
    if (!enabled) return undefined;
    const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
    return listenForCoachRouteTaps(gl.domElement, event => {
      const { selectedActorId: id, editableIds: ids, onMove: move, onIcePoint: pick } = callback.current;
      if (typeof pick !== 'function' && (!ids.includes(id) || typeof move !== 'function')) return;
      const rect = gl.domElement.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      ray.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2), camera);
      if (!ray.ray.intersectPlane(plane, hit)) return;
      const point = worldPointToCoachRoute(hit);
      if (point) { if (typeof pick === 'function') pick(point); else move(id, point); }
    });
  }, [gl, camera, enabled, framingSignature, size.width, size.height]);
  return null;
}

function ActorControl({ actor, selected, cameraAdjusting, labelledActors, onSelect, onMove, onDragStart, onDragEnd }) {
  const { camera, gl } = useThree();
  const gesture = useRef(null);
  const dragEnd = useRef(onDragEnd);
  dragEnd.current = onDragEnd;
  const cancelGesture = useCallback(() => {
    const active = gesture.current;
    if (!active) return;
    gesture.current = null;
    try { active.element.releasePointerCapture(active.id); } catch { /* The browser may already have cancelled capture. */ }
    dragEnd.current();
  }, []);
  useLayoutEffect(() => {
    const ownerDocument = gl.domElement.ownerDocument;
    const cancelForSecondTouch = event => {
      if (gesture.current && event.pointerType === 'touch' && event.pointerId !== gesture.current.id) cancelGesture();
    };
    const capture = { capture: true };
    // Capture phase sees a second finger even on another actor or toolbar.
    ownerDocument.addEventListener('pointerdown', cancelForSecondTouch, capture);
    return () => {
      ownerDocument.removeEventListener('pointerdown', cancelForSecondTouch, capture);
      cancelGesture();
    };
  }, [gl, actor.id, cancelGesture]);
  useLayoutEffect(() => { if (cameraAdjusting) cancelGesture(); }, [cameraAdjusting, cancelGesture]);
  const icePoint = event => {
    const rect = gl.domElement.getBoundingClientRect();
    const ray = new THREE.Raycaster(), hit = new THREE.Vector3();
    ray.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2), camera);
    return ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit) ? { x: -hit.z, y: hit.x } : null;
  };
  const label = actor.label === 'YOU' ? 'YOU' : labelledActors ? actor.label || actor.name || actor.id : '';
  const stop = event => event.stopPropagation();
  const release = event => {
    if (gesture.current?.id === event.pointerId) cancelGesture();
  };
  return <Html center position={world(actor, .9)} zIndexRange={[25, 15]} style={{ pointerEvents: cameraAdjusting ? 'none' : 'auto' }}>
    <button type="button" className="srv-actor-drag" disabled={cameraAdjusting} aria-label={`Move ${actor.label || actor.name || actor.id}`} aria-pressed={selected}
      onClick={event => { stop(event); if (!cameraAdjusting) onSelect(actor.id); }}
      onPointerDown={event => {
        stop(event);
        if (cameraAdjusting || event.button !== 0 || event.isPrimary === false || gesture.current) return;
        onSelect(actor.id);
        const grab = icePoint(event);
        if (!grab) return;
        gesture.current = { id: event.pointerId, element: event.currentTarget, x: event.clientX, y: event.clientY, offsetX: actor.x - grab.x, offsetY: actor.y - grab.y };
        event.currentTarget.setPointerCapture(event.pointerId);
        onDragStart();
      }}
      onPointerMove={event => {
        stop(event);
        if (cameraAdjusting || event.isPrimary === false) return;
        const active = gesture.current;
        if (!active || active.id !== event.pointerId || Math.hypot(event.clientX - active.x, event.clientY - active.y) < 8) return;
        const ground = icePoint(event);
        if (!ground) return;
        const point = worldPointToCoachRoute({ x: ground.y + active.offsetY, z: -(ground.x + active.offsetX) });
        if (point) onMove?.(actor.id, point);
      }}
      onPointerUp={event => { stop(event); release(event); }} onPointerCancel={event => { stop(event); release(event); }} onLostPointerCapture={release}>
      {label && <span className={`srv-actor-label ${actor.team}`}>{label}</span>}
      <span className="srv-drag-ring" aria-hidden="true" />
    </button>
  </Html>;
}

function Markings({ overlays, onIcePoint, enabled }) {
  const canChoose = enabled && typeof onIcePoint === 'function';
  return <group>
    {(overlays.targets || []).map(point => {
      const badge = { x: point.x - 1, y: point.y + 1 };
      return <group key={point.id}>
        <Line points={[world(point, .06), world(badge, .25)]} color="#0B1A33" lineWidth={2} />
        <mesh position={world(point, .045)} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[.45, .6, 40]} /><meshBasicMaterial color="#0B1A33" depthWrite={false} />
        </mesh>
        <Html center position={world(badge, .25)} zIndexRange={[15, 5]} style={{ pointerEvents: canChoose ? 'auto' : 'none' }}>
          <button type="button" className="srv-arrow-label" disabled={!canChoose} aria-label={`Choose spot ${point.label} on rink`}
            style={{ width: 32, height: 32, minWidth: 32, minHeight: 32, padding: 0, border: '2px solid #F5EFE6', borderRadius: '50%', background: '#0B1A33', color: '#FFFFFF', fontSize: 14 }}
            onPointerDown={event => event.stopPropagation()}
            onClick={event => { event.stopPropagation(); if (canChoose) onIcePoint({ x: point.x, y: point.y }); }}>
            {point.label}
          </button>
        </Html>
      </group>;
    })}
    {(overlays.arrows || []).map((arrow, index) => {
      const from = { x: arrow.from[0], y: arrow.from[1] }, to = { x: arrow.to[0], y: arrow.to[1] };
      const dx = to.x - from.x, dy = to.y - from.y, length = Math.hypot(dx, dy);
      if (!length) return null;
      const back = { x: to.x - dx / length * .7, y: to.y - dy / length * .7 };
      const head = [{ x: back.x - dy / length * .3, y: back.y + dx / length * .3 }, to, { x: back.x + dy / length * .3, y: back.y - dx / length * .3 }];
      return <group key={index}>
        <Line points={[world(from, .05), world(to, .05)]} color="#aa791e" lineWidth={3} dashed dashSize={.35} gapSize={.2} />
        <Line points={head.map(p => world(p, .05))} color="#aa791e" lineWidth={3} />
        <Html center position={world({ x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }, .12)} style={{ pointerEvents: 'none' }}><span className="srv-arrow-label">{index + 1}</span></Html>
      </group>;
    })}
    {(overlays.ghosts || []).map((point, index) => <Line key={point.id || index} points={Array.from({ length: 49 }, (_, i) => world({ x: point.x + Math.cos(i * Math.PI / 24) * .65, y: point.y + Math.sin(i * Math.PI / 24) * .65 }, .04))} color="#5f738b" lineWidth={2} dashed dashSize={.16} gapSize={.13} />)}
  </group>;
}

function Content({ frame, frameRef, bounds, cameraPreset, cameraAdjusting, hideZoneLines, selectedActorId, onSelect, onMove, onIcePoint, editableIds, labelledActors, overlays, showBothGoals }) {
  const { invalidate } = useThree();
  const dragBounds = useRef(null);
  const [dragging, setDragging] = useState(false);
  const startDrag = () => { dragBounds.current = { ...bounds }; setDragging(true); };
  const endDrag = () => { setDragging(false); dragBounds.current = null; };
  useLayoutEffect(() => { invalidate(); }, [frame, overlays, selectedActorId, invalidate]);
  return <>
    <color attach="background" args={['#182d40']} />
    <ambientLight intensity={.9} color="#e4edf5" /><hemisphereLight args={['#f8fcff', '#64778c', 1.4]} />
    <directionalLight position={[-10, 27, -12]} intensity={2.4} color="#fff8e8" castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-25} shadow-camera-right={25} shadow-camera-top={38} shadow-camera-bottom={-38} shadow-camera-near={1} shadow-camera-far={90} shadow-bias={-.00015} shadow-normalBias={.025} />
    <directionalLight position={[12, 14, -30]} intensity={.7} color="#d8eaff" />
    <ScenarioCamera bounds={dragging ? dragBounds.current : bounds} {...{ cameraPreset, cameraAdjusting }} />
    <Arena /><Ice hideZoneLines={hideZoneLines} /><Goal />{showBothGoals && <group rotation={[0, Math.PI, 0]}><Goal /></group>}
    <Markings overlays={overlays} onIcePoint={onIcePoint} enabled={!cameraAdjusting && !dragging} />
    {frame.actors.map((actor, index) => <Skater key={actor.id} frameRef={frameRef} actorKey={actor.id} colour={actor.team === 'home' ? '#0B1A33' : '#C9A24B'} number={String(index + 1)} goalie={actor.role === 'goalie'} selected={actor.id === selectedActorId} showStick={Number.isFinite(actor.facing)} />)}
    {frame.puck && <><Puck frameRef={frameRef} /><mesh position={world(frame.puck, .04)} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.23, .36, 40]} /><meshBasicMaterial color="#fffcf0" depthWrite={false} /></mesh></>}
    {frame.actors.map(actor => {
      const label = actor.label === 'YOU' ? 'YOU' : labelledActors ? actor.label || actor.name || actor.id : '';
      const editable = editableIds.includes(actor.id) && typeof onSelect === 'function';
      if (!label && !editable) return null;
      if (editable) return <ActorControl key={actor.id} actor={actor} selected={selectedActorId === actor.id} {...{ cameraAdjusting, labelledActors, onSelect, onMove }} onDragStart={startDrag} onDragEnd={endDrag} />;
      const badge = <span className={`srv-actor-label srv-static-label ${actor.team}`}>{label}</span>;
      return <Html key={actor.id} center position={world(actor, actor.role === 'goalie' ? 1.95 : 2.12)} zIndexRange={[20, 10]} style={{ pointerEvents: editable && !cameraAdjusting ? 'auto' : 'none' }}>
        {editable ? <button type="button" className="srv-actor-select" disabled={cameraAdjusting} aria-label={`Select ${actor.label || actor.name || actor.id}`} aria-pressed={selectedActorId === actor.id} onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); if (!cameraAdjusting) onSelect(actor.id); }}>{badge}</button> : badge}
      </Html>;
    })}
    <IceInput enabled={!cameraAdjusting && !dragging && Boolean(onMove || onIcePoint)} framingSignature={[cameraPreset, bounds.minX, bounds.maxX, bounds.minY, bounds.maxY].join(':')} {...{ selectedActorId, editableIds, onMove, onIcePoint }} />
  </>;
}

export default function ScenarioRink3D({ state, bounds, hideZoneLines = false, selectedActorId = null, onSelect, onMove, onIcePoint, editableIds = [], labelledActors = true, overlays = {}, showBothGoals = true, cameraPreset, cameraAdjusting, onFailure, playing = false, time = 0 }) {
  const previous = useRef(null);
  const frame = useMemo(() => {
    const last = previous.current, dt = time - (last?.time ?? time), velocityById = {};
    if (playing && last?.playing && dt > 0 && dt <= .25) for (const actor of state.actors) {
      const prior = last.state.actors.find(item => item.id === actor.id);
      if (prior) velocityById[actor.id] = { vx: (actor.x - prior.x) / dt, vy: (actor.y - prior.y) / dt };
    }
    return createReadSceneFrame(state, { time, velocityById });
  }, [state, playing, time]);
  useLayoutEffect(() => { previous.current = { state, playing, time }; }, [state, playing, time]);
  const frameRef = useRef(frame); frameRef.current = frame;
  const viewBounds = bounds || { minX: -30.48, maxX: 30.48, minY: -12.954, maxY: 12.954 };
  const cleanup = useRef(null);
  const fail = useCallback(() => { cleanup.current?.(); cleanup.current = null; onFailure?.(); }, [onFailure]);
  useEffect(() => () => cleanup.current?.(), []);
  return <div className="srv-canvas" role="group" aria-label="Three-dimensional hockey scenario">
    <Canvas orthographic frameloop="demand" dpr={[1, 1.5]} shadows={{ type: THREE.PCFShadowMap }} style={{ touchAction: cameraAdjusting ? 'none' : 'pan-y' }}
      camera={{ position: [16, 28, -8], left: -20, right: 20, top: 20, bottom: -20, near: .1, far: 160 }}
      gl={{ antialias: true, powerPreference: 'high-performance', alpha: false }}
      fallback="This browser cannot display the 3D rink. Choose Tactical board to continue." onCreated={({ gl }) => { cleanup.current?.(); cleanup.current = watchWebglContextLoss(gl.domElement, fail); }}>
      <Content {...{ frame, frameRef, cameraPreset, cameraAdjusting, hideZoneLines, selectedActorId, onSelect, onMove, onIcePoint, editableIds, labelledActors, overlays, showBothGoals }} bounds={viewBounds} />
    </Canvas>
  </div>;
}
