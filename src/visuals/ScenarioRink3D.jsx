import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import ScenarioCamera from './ScenarioCamera.jsx';
import RinkAreaLabels from './RinkAreaLabels.jsx';
import RinkActorAnswer from './RinkActorAnswer.jsx';
import RinkGoalAnswer from './RinkGoalAnswer.jsx';
import RinkActionCue from './RinkActionCue.jsx';
import Skater from '../one-on-one/ScenarioSkater.jsx';
import { isFocusedActor } from './PlayerLocator.jsx';
import { compactActorLabel, actorDisplayName, actorJerseyNumber } from './actorLabel.js';
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

function ActorControl({ actor, selected, focused, cameraAdjusting, labelledActors, onSelect, onMove, onDragStart, onDragEnd }) {
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
  const label = focused || labelledActors ? compactActorLabel(actor) : '';
  const stop = event => event.stopPropagation();
  const release = event => {
    if (gesture.current?.id === event.pointerId) cancelGesture();
  };
  return <Html center position={world(actor, .9)} zIndexRange={[25, 15]} style={{ pointerEvents: cameraAdjusting ? 'none' : 'auto' }}>
    <button type="button" className="srv-actor-drag" disabled={cameraAdjusting} aria-label={`Move ${actorDisplayName(actor)}`} aria-pressed={selected}
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
      {label && <span className={`srv-actor-label ${actor.team}${/^\d+$/.test(label) ? ' srv-jersey-number' : ''}`}>{label}</span>}
      <span className="srv-drag-ring" aria-hidden="true" />
    </button>
  </Html>;
}

function Markings({ overlays, onIcePoint, enabled }) {
  const canChoose = enabled && typeof onIcePoint === 'function';
  return <group>
    {(overlays.cells || []).map(c=><mesh key={`area:${c.x}:${c.y}`} position={world(c,.035)} rotation={[-Math.PI/2,0,0]} raycast={()=>null}><planeGeometry args={[c.size,c.size]}/><meshBasicMaterial color={c.band==='strong'?'#167b70':'#b47c13'} transparent opacity={c.band==='strong'?.35:.22} depthWrite={false}/></mesh>)}
    {(overlays.polylines || []).map(line => {
      const points = (line.points || []).filter(point => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite));
      if (points.length < 2) return null;
      return <Line key={line.id} points={points.map(([x, y]) => world({ x, y }, .055))} color={line.color || '#C9A24B'} lineWidth={line.width || 2} transparent opacity={line.opacity ?? .8} dashed={!!line.dashed} dashSize={.45} gapSize={.3} />;
    })}
    {(overlays.labels || []).filter(label => Number.isFinite(label.x) && Number.isFinite(label.y)).map(label => <Html key={label.id} center position={world(label, .14)} zIndexRange={[12, 2]} style={{ pointerEvents: 'none' }}><span className="srv-arrow-label">{label.label}</span></Html>)}
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

function Content({ frame, frameRef, bounds, cameraPreset, cameraAdjusting, cameraPanMode, cameraCommand, cameraResetToken, hideZoneLines, selectedActorId, focusActorId, onSelect, onMove, onIcePoint, editableIds, selectableIds = [], passActorIds = [], onActorAnswer, onGoalAnswer, goalAnswerSides = ['right'], labelledActors, overlays, showBothGoals, showRinkAreas, puckPresentation = 'highlighted' }) {
  const { invalidate } = useThree();
  const dragBounds = useRef(null);
  const [dragging, setDragging] = useState(false);
  const startDrag = () => { dragBounds.current = { ...bounds }; setDragging(true); };
  const endDrag = () => { setDragging(false); dragBounds.current = null; };
  useLayoutEffect(() => { invalidate(); }, [frame, overlays, selectedActorId, focusActorId, invalidate]);
  return <>
    <color attach="background" args={['#182d40']} />
    <ambientLight intensity={.9} color="#e4edf5" /><hemisphereLight args={['#f8fcff', '#64778c', 1.4]} />
    <directionalLight position={[-10, 27, -12]} intensity={2.4} color="#fff8e8" castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-25} shadow-camera-right={25} shadow-camera-top={38} shadow-camera-bottom={-38} shadow-camera-near={1} shadow-camera-far={90} shadow-bias={-.00015} shadow-normalBias={.025} />
    <directionalLight position={[12, 14, -30]} intensity={.7} color="#d8eaff" />
    <ScenarioCamera cameraDirect={!dragging} bounds={dragging ? dragBounds.current : bounds} {...{ cameraPreset, cameraAdjusting, cameraPanMode, cameraCommand, cameraResetToken }} />
    {showRinkAreas&&<RinkAreaLabels bounds={bounds}/>}
    <Arena openView /><Ice clearBoards hideZoneLines={hideZoneLines} /><Goal />{showBothGoals && <group rotation={[0, Math.PI, 0]}><Goal /></group>}
    {typeof onGoalAnswer === 'function' && goalAnswerSides.filter(side => side === 'right' || (side === 'left' && showBothGoals)).map(side => <RinkGoalAnswer key={side} side={side} onAnswer={onGoalAnswer} enabled={!cameraAdjusting && !dragging} />)}
    {typeof onActorAnswer === 'function' && frame.actors.filter(actor => passActorIds.includes(actor.id)).map(actor => <RinkActionCue key={`pass-${actor.id}`} action="pass" point={actor} actors={frame.actors} puck={frame.puck} enabled={!cameraAdjusting && !dragging} onAnswer={(_, method) => onActorAnswer(actor.id, method)} label={`Select pass to ${compactActorLabel(actor)}`} />)}
    <Markings overlays={overlays} onIcePoint={onIcePoint} enabled={!cameraAdjusting && !dragging} />
    {frame.actors.map((actor, index) => <Skater showHeading={cameraPreset === 'overhead'} key={actor.id} frameRef={frameRef} actorKey={actor.id} colour={actor.team === 'home' ? '#0B1A33' : '#C9A24B'} number={actorJerseyNumber(actor, index + 1)} goalie={actor.role === 'goalie'} selected={actor.id === selectedActorId} isLearner={isFocusedActor(actor, focusActorId)} showStick={Number.isFinite(actor.facing)} />)}
    {frame.puck && puckPresentation !== 'hidden' && <Puck frameRef={frameRef} showLabel={false} />}
    {frame.actors.map(actor => {
      const focused = isFocusedActor(actor, focusActorId);
      const label = focused || labelledActors ? compactActorLabel(actor) : '';
      const editable = editableIds.includes(actor.id) && typeof onSelect === 'function';
      if (selectableIds.includes(actor.id) && typeof onActorAnswer === 'function') return <Html key={actor.id} center position={world(actor, .9)} zIndexRange={[25, 15]} style={{ pointerEvents: cameraAdjusting || dragging ? 'none' : 'auto' }}>
        <RinkActorAnswer actorId={actor.id} onAnswer={onActorAnswer} enabled={!cameraAdjusting && !dragging} className="srv-actor-drag" aria-label={`Choose ${actorDisplayName(actor)} on rink`}>
          <span className={`srv-actor-label ${actor.team}${/^\d+$/.test(label) ? ' srv-jersey-number' : ''}`}>{label || actor.id}</span><span className="srv-drag-ring" aria-hidden="true" />
        </RinkActorAnswer>
      </Html>;
      if (!label && !editable) return null;
      if (editable) return <ActorControl key={actor.id} actor={actor} focused={focused} selected={selectedActorId === actor.id} {...{ cameraAdjusting, labelledActors, onSelect, onMove }} onDragStart={startDrag} onDragEnd={endDrag} />;
      const badge = <span className={`srv-actor-label srv-static-label ${actor.team}${/^\d+$/.test(label) ? ' srv-jersey-number' : ''}`}>{label}</span>;
      return <Html key={actor.id} center position={world(actor, actor.role === 'goalie' ? 1.95 : 2.12)} zIndexRange={[20, 10]} style={{ pointerEvents: editable && !cameraAdjusting ? 'auto' : 'none' }}>
        {editable ? <button type="button" className="srv-actor-select" disabled={cameraAdjusting} aria-label={`Select ${actorDisplayName(actor)}`} aria-pressed={selectedActorId === actor.id} onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); if (!cameraAdjusting) onSelect(actor.id); }}>{badge}</button> : badge}
      </Html>;
    })}
    <IceInput enabled={!cameraAdjusting && !dragging && Boolean(onMove || onIcePoint)} framingSignature={[cameraPreset, cameraResetToken, bounds.minX, bounds.maxX, bounds.minY, bounds.maxY].join(':')} {...{ selectedActorId, editableIds, onMove, onIcePoint }} />
  </>;
}

export default function ScenarioRink3D({ state, bounds, hideZoneLines = false, selectedActorId = null, focusActorId, onSelect, onMove, onIcePoint, editableIds = [], selectableIds = [], passActorIds = [], onActorAnswer, onGoalAnswer, goalAnswerSides, labelledActors = true, overlays = {}, showBothGoals = true, showRinkAreas = false, puckPresentation = 'highlighted', cameraPreset, cameraAdjusting, cameraPanMode = false, cameraCommand = null, cameraResetToken = 0, onFailure, onReady, playing = false, time = 0 }) {
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
  return <div className="srv-canvas" data-camera-preset={cameraPreset} role="group" aria-label="Three-dimensional hockey scenario">
    <Canvas orthographic frameloop="demand" dpr={[1.5, 2]} shadows={{ type: THREE.PCFShadowMap }} style={{ touchAction: cameraAdjusting ? 'none' : 'pan-y' }}
      camera={{ position: [16, 28, -8], left: -20, right: 20, top: 20, bottom: -20, near: .1, far: 160 }}
      gl={{ antialias: true, powerPreference: 'high-performance', alpha: false }}
      fallback="This browser cannot display the 3D rink." onCreated={({ gl }) => { cleanup.current?.(); cleanup.current = watchWebglContextLoss(gl.domElement, fail); onReady?.(); }}>
      <Content {...{ frame, frameRef, cameraPreset, cameraAdjusting, cameraPanMode, cameraCommand, cameraResetToken, hideZoneLines, selectedActorId, focusActorId, onSelect, onMove, onIcePoint, editableIds, selectableIds, passActorIds, onActorAnswer, onGoalAnswer, goalAnswerSides, labelledActors, overlays, showBothGoals, showRinkAreas, puckPresentation }} bounds={viewBounds} />
    </Canvas>
  </div>;
}
