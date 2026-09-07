import { Component, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import Skater from './Skater.jsx';
import FirstPersonEquipment from '../visuals/FirstPersonEquipment.jsx';
import { isFocusedActor } from '../visuals/PlayerLocator.jsx';
import { compactActorLabel } from '../visuals/actorLabel.js';
import { Ice, Arena, Goal, Puck } from './PracticeScene.jsx';
import { createReadSceneFrame, getReadSceneBounds, clampReadSceneTargetCenter } from './readSequenceVisuals.js';
import ScenarioCamera from '../visuals/ScenarioCamera.jsx';
import { parseStartingView, resolvePlayerEye } from '../visuals/questionCamera.js';
import { characterProportions } from '../visuals/characterPresentation.js';
import RinkActorAnswer from '../visuals/RinkActorAnswer.jsx';
import RinkGoalAnswer from '../visuals/RinkGoalAnswer.jsx';
import RinkActionCue from '../visuals/RinkActionCue.jsx';
import { isCoachRoutePoint, listenForCoachRouteTaps, worldPointToCoachRoute } from './coachRouteSurfaceInput.js';
import { watchWebglContextLoss } from '../cognitive-gym/webglLifecycle.js';
import './ReadSequenceScene.css';

const JERSEY_NUMBERS = { F1: '17', F2: '9', D1: '4', G: '1' };
const BADGE_CORNERS = [[29, -29], [-29, -29], [29, 29], [-29, 29]];
const world = (point, height = 0) => [point.y, height, -point.x];
const chipLift = screenY => Math.min(8, Math.max(0, screenY - 14));

class ReadSceneBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { this.props.onFailure?.(error); }
  render() { return this.state.failed ? null : this.props.children; }
}

function CompletedIceTap({ onPoint, bounds, cameraPreset, cameraResetToken }) {
  const { gl, camera, size } = useThree();
  const callback = useRef(onPoint);
  callback.current = onPoint;
  useLayoutEffect(() => {
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
      if (point && point.x >= 0) callback.current(point);
    });
  }, [gl, camera, bounds, cameraPreset, cameraResetToken, size.width, size.height]);
  return null;
}

function PlannedRoute({ route }) {
  const points = useMemo(() => (route || []).filter(isCoachRoutePoint), [route]);
  const line = useMemo(() => points.map(point => world(point, .055)), [points]);
  return <group>
    {line.length > 1 && <><Line points={line} color="#183449" lineWidth={5} /><Line points={line} color="#e2b949" lineWidth={2} /></>}
    {points.map((point, index) => <mesh key={index} position={world(point, .07)} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={index === 0 ? [.39, .52, 32] : [.22, .34, 32]} /><meshBasicMaterial color="#183449" />
    </mesh>)}
  </group>;
}

function ActorChip({ actor, labelledActors, movable, focused }) {
  const chip = useRef(null);
  const { invalidate } = useThree();
  const attachChip = useCallback(node => {
    chip.current = node;
    // Html commits through a separate DOM root, possibly after the demand frame.
    if (node) invalidate();
  }, [invalidate]);
  const project = useMemo(() => new THREE.Vector3(), []);
  const label = focused || labelledActors ? compactActorLabel(actor) : '';
  const height = actor.role === 'goalie' ? 1.9 : 2.05;
  useFrame(({ camera, size }) => {
    if (!chip.current) return;
    project.set(...world(actor, height)).project(camera);
    const screenY = (1 - project.y) * size.height / 2;
    chip.current.style.transform = `translateY(-${chipLift(screenY)}px)`;
  });
  if (!label) return null;
  return <Html center position={world(actor, height)} zIndexRange={[20, 10]} style={{ pointerEvents: 'none' }}>
    <span ref={attachChip} className={`rs-scene-player-chip ${actor.team === 'home' ? 'home' : 'away'}${movable ? ' movable' : ''}`}>{label}</span>
  </Html>;
}

function TargetMarker({ target, index, targets, actors, puck, labelledActors, onTarget, disabled }) {
  const button = useRef(null);
  const { invalidate } = useThree();
  const attachButton = useCallback(node => {
    button.current = node;
    if (node) invalidate();
  }, [invalidate]);
  const connector = useRef(null);
  const project = useMemo(() => new THREE.Vector3(), []);
  const screenPoint = (point, height, camera, size) => {
    project.set(...world(point, height)).project(camera);
    return [(project.x + 1) * size.width / 2, (1 - project.y) * size.height / 2];
  };
  useFrame(({ camera, size }) => {
    if (!button.current) return;
    const occupied = actors.flatMap(actor => {
      const points = [screenPoint(actor, .9, camera, size)];
      if (actor.label === 'YOU' || labelledActors) {
        const label = screenPoint(actor, actor.role === 'goalie' ? 1.9 : 2.05, camera, size);
        label[1] -= chipLift(label[1]);
        points.push(label);
      }
      return points;
    });
    const puckPoint = screenPoint(puck, .075, camera, size);
    const anchors = targets.map(point => screenPoint(point, .1, camera, size));
    const placed = [];
    let center;
    // Choose in target order so every marker agrees on the earlier buttons'
    // positions. The complete 44px hit area moves with its visible number.
    for (let targetIndex = 0; targetIndex <= index; targetIndex++) {
      const anchor = anchors[targetIndex];
      const candidates = BADGE_CORNERS.map(([dx, dy]) => clampReadSceneTargetCenter([anchor[0] + dx, anchor[1] + dy], size));
      const clearance = ([x, y]) => {
        return Math.min(x - 28, size.width - x - 28, y - 28, size.height - y - 28,
          Math.hypot(x - puckPoint[0], y - puckPoint[1]) - 31,
          ...occupied.map(point => Math.hypot(x - point[0], y - point[1]) - 35),
          ...anchors.filter((_, otherIndex) => otherIndex !== targetIndex).map(point => Math.hypot(x - point[0], y - point[1]) - 24),
          ...placed.map(point => Math.max(Math.abs(x - point[0]), Math.abs(y - point[1])) - 46));
      };
      center = candidates.reduce((best, candidate) => clearance(candidate) > clearance(best) ? candidate : best);
      placed.push(center);
    }
    const offset = [center[0] - anchors[index][0], center[1] - anchors[index][1]];
    button.current.style.transform = `translate(${offset[0]}px, ${offset[1]}px)`;
    if (connector.current) {
      connector.current.style.transform = `rotate(${Math.atan2(offset[1], offset[0])}rad)`;
      connector.current.style.width = `${Math.hypot(...offset)}px`;
    }
  });
  const stop = event => event.stopPropagation();
  return <>
    <mesh position={world(target, .06)} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[.7, .8, 40]} /><meshBasicMaterial color="#876114" transparent opacity={.9} depthWrite={false} />
    </mesh>
    <Html center position={world(target, .1)} zIndexRange={[40, 30]} style={{ pointerEvents: disabled ? 'none' : 'auto' }}>
      <span className="rs-scene-target-connector" ref={connector} aria-hidden="true" />
      <button ref={attachButton} type="button" className="rs-scene-target" disabled={disabled} style={{ pointerEvents: disabled ? 'none' : 'auto' }} aria-label={`Choose ${target.label}`} title={`${index + 1}. ${target.label}`}
        onPointerDown={stop} onPointerMove={stop} onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop}
        onClick={event => { event.stopPropagation(); if (!disabled) onTarget?.(target.id); }}>
        <span className="rs-scene-target-number" aria-hidden="true">{index + 1}</span>
        <span className="rs-scene-sr-only">{target.label}</span>
      </button>
    </Html>
  </>;
}

function SceneContents({ frame, frameRef, bounds, definition, targets, onTarget, moveActorId, focusActorId, onMove, onRoutePoint, onFirstAction, route, playing, cameraPreset, cameraAdjusting, cameraPanMode, cameraCommand, cameraResetToken, cameraView, cameraEntryKey, onReady }) {
  const { invalidate } = useThree();
  // A frozen read has no independent animation loop; every authored frame or
  // user edit requests one render, and Skater receives the finite lesson clock.
  useLayoutEffect(() => { invalidate(); }, [frame, bounds, targets, route, moveActorId, focusActorId, invalidate]);
  const labelledActors = definition.ui?.labelledActors !== false && definition.ageBand !== 'U9';
  const answering = !playing && !cameraAdjusting;
  const movable = answering && moveActorId && frame.actors.some(actor => actor.id === moveActorId) && typeof onMove === 'function';
  const firstActions = typeof onFirstAction === 'function' ? Object.keys(definition.branches) : [];
  const passReceiver = firstActions.includes('pass') ? frame.actors.find(actor => actor.id === definition.branches.pass.state.puck.owner) : null;
  const carrier = firstActions.includes('carry') ? frame.actors.find(actor => actor.id === frame.puck?.owner) : null;
  const tap = answering && targets.length === 0 ? typeof onRoutePoint === 'function' ? onRoutePoint : movable ? onMove : firstActions.includes('carry') ? () => onFirstAction('carry') : null : null;
  return <>
    <color attach="background" args={['#182d40']} />
    <ambientLight intensity={.9} color="#e4edf5" />
    <hemisphereLight args={['#f8fcff', '#64778c', 1.4]} />
    <directionalLight position={[-10, 27, -12]} intensity={2.4} color="#fff8e8" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-24} shadow-camera-right={24} shadow-camera-top={36} shadow-camera-bottom={-36} shadow-camera-near={1} shadow-camera-far={75} shadow-bias={-.00015} shadow-normalBias={.025} />
    <directionalLight position={[12, 14, -30]} intensity={.7} color="#d8eaff" />
    <ScenarioCamera key={cameraEntryKey} cameraDirect bounds={bounds} frame={frame} cameraView={cameraView} onReady={onReady} cameraPreset={cameraPreset} cameraAdjusting={cameraAdjusting} cameraPanMode={cameraPanMode} cameraCommand={cameraCommand} cameraResetToken={cameraResetToken} /><Arena playerEye={cameraView?.type === 'first-person'} openView={cameraView?.type !== 'first-person'} /><Ice clearBoards={cameraView?.type !== 'first-person'} hideZoneLines={definition.ui?.hideZoneLines === true || definition.ageBand === 'U9'} /><Goal />
    <PlannedRoute route={route} />
    {frame.actors.filter(actor=>cameraView?.type==='first-person' && actor.id===cameraView.actorId).map(actor=><FirstPersonEquipment key={`equipment-${actor.id}`} frameRef={frameRef} actorId={actor.id} colour={actor.team==='home'?'#0B1A33':'#C9A24B'} goalie={actor.role==='goalie'} ageBand={definition.ageBand}/>)}
    {frame.actors.map(actor => <Skater visible={cameraView?.type !== 'first-person' || actor.id !== cameraView.actorId} ageBand={definition.ageBand} showHeading={cameraPreset === 'overhead'} key={actor.id} frameRef={frameRef} actorKey={actor.id} colour={actor.team === 'home' ? '#0B1A33' : '#C9A24B'} number={JERSEY_NUMBERS[actor.id] || '8'} goalie={actor.role === 'goalie'} selected={actor.id === moveActorId} isLearner={isFocusedActor(actor, focusActorId)} />)}
    <Puck frameRef={frameRef} />
    {passReceiver && (cameraView?.type !== 'first-person' || passReceiver.id !== cameraView.actorId) && <Html center position={world(passReceiver, .9)} zIndexRange={[25, 15]} style={{ pointerEvents: answering ? 'auto' : 'none' }}><RinkActorAnswer actorId={passReceiver.id} onAnswer={() => onFirstAction('pass')} enabled={answering} className="rs-first-action-hit" aria-label={labelledActors ? `Pass to ${compactActorLabel(passReceiver)}` : 'Pass to your teammate'}><span className="rs-scene-sr-only">Pass</span></RinkActorAnswer></Html>}
    {passReceiver && (cameraView?.type !== 'first-person' || passReceiver.id !== cameraView.actorId) && <RinkActionCue action="pass" point={passReceiver} actors={frame.actors} puck={frame.puck} onAnswer={() => onFirstAction('pass')} enabled={answering} label={labelledActors ? `Select pass to ${compactActorLabel(passReceiver)}` : 'Select pass to your teammate'} />}
    {carrier && (cameraView?.type !== 'first-person' || carrier.id !== cameraView.actorId) && <RinkActionCue action="carry" point={carrier} actors={frame.actors} puck={frame.puck} offset={[-46, 0]} onAnswer={() => onFirstAction('carry')} enabled={answering} label="Carry the puck into space" />}
    {firstActions.includes('shoot') && <RinkGoalAnswer onAnswer={() => onFirstAction('shoot')} enabled={answering} />}
    {frame.actors.filter(actor => cameraView?.type !== 'first-person' || actor.id !== cameraView.actorId).map(actor => <ActorChip key={actor.id} actor={actor} focused={isFocusedActor(actor, focusActorId)} labelledActors={labelledActors} movable={movable && actor.id === moveActorId} />)}
    {targets.map((target, index) => <TargetMarker key={target.id} target={target} index={index} targets={targets} actors={frame.actors} puck={frame.puck} labelledActors={labelledActors} onTarget={onTarget} disabled={!answering || typeof onTarget !== 'function'} />)}
    {tap && <CompletedIceTap key={typeof onRoutePoint === 'function' ? 'route' : `move-${moveActorId}`} onPoint={tap} bounds={bounds} cameraPreset={cameraPreset} cameraResetToken={cameraResetToken} />}
  </>;
}

function ReadScene({ state, definition, playing = false, time = 0, supportPoint = null, route = null, wide = false, targets = [], onTarget, moveActorId = null, focusActorId, onMove, onRoutePoint, onFirstAction, onFailure, onReady, onPending, startingView, questionId, cameraPresetVersion = 0, cameraPreset = 'broadcast', cameraAdjusting = false, cameraPanMode = false, cameraCommand = null, cameraResetToken = 0 }) {
  const cameraEntryKey = questionId ?? definition.id;
  const [viewState, setViewState] = useState({ identity: null, preset: cameraPreset, presetVersion: cameraPresetVersion, view: null });
  let active = viewState;
  if (viewState.identity !== cameraEntryKey || viewState.preset !== cameraPreset || viewState.presetVersion !== cameraPresetVersion) {
    active = { identity: cameraEntryKey, preset: cameraPreset, presetVersion: cameraPresetVersion,
      view: viewState.identity !== cameraEntryKey ? parseStartingView(startingView) ?? {type:'preset',preset:cameraPreset} : {type:'preset',preset:cameraPreset} };
    setViewState(active);
  }
  const observer = state.actors.find(actor => actor.id === active.view?.actorId);
  const cameraView = active.view?.type === 'first-person'
    ? {...active.view,eyeHeight:active.view.eyeHeight ?? characterProportions(definition.ageBand ?? observer?.ageBand,observer?.stage).eyeHeight}
    : active.view;
  if (cameraView?.type === 'first-person') resolvePlayerEye(cameraView,state.actors);
  const selectedPreset = cameraView?.type === 'preset' ? cameraView.preset : cameraPreset;
  const frameRef = useRef(null);
  const lossCleanup = useRef(null);
  const failed = useRef(false);
  const failureCallback = useRef(onFailure);
  failureCallback.current = onFailure;
  const fail = useCallback(() => {
    if (failed.current) return;
    failed.current = true;
    lossCleanup.current?.();
    lossCleanup.current = null;
    failureCallback.current?.();
  }, []);
  const frame = useMemo(() => createReadSceneFrame(state, {time,preserveActorVelocity:true}), [state,time]);
  frameRef.current = frame;
  const pendingCallback = useRef(onPending); pendingCallback.current = onPending;
  useLayoutEffect(() => { pendingCallback.current?.(); }, [cameraEntryKey,active.view,cameraResetToken]);
  useEffect(() => () => { lossCleanup.current?.(); lossCleanup.current = null; }, []);
  const bounds = useMemo(() => getReadSceneBounds(definition, { supportPoint, route, wide }), [definition, supportPoint, route, wide]);
  return <div className="rs-scene3d" role="group" aria-label={`${definition.ageBand} connected read. Three-dimensional rink. Navy players attack; gold players defend.`}>
    <Canvas orthographic frameloop="demand" aria-label={cameraAdjusting ? 'Adjust hockey camera. Drag or use arrow keys to rotate; pinch, scroll or use plus and minus to zoom.' : 'Hockey play with labelled players, puck and net'} style={{ touchAction: cameraAdjusting ? 'none' : 'pan-y' }} shadows={{ type: THREE.PCFShadowMap }} dpr={[1.5, 2]}
      camera={{ position: [16, 28, -8], left: -20, right: 20, top: 20, bottom: -20, near: .1, far: 160 }}
      gl={{ antialias: true, powerPreference: 'high-performance', alpha: false }} fallback="The 3D rink could not load. Use Retry 3D rink to open it again."
      onCreated={({ gl }) => { lossCleanup.current?.(); lossCleanup.current = watchWebglContextLoss(gl.domElement, fail); }}>
      <SceneContents {...{ frame, frameRef, bounds, definition, targets, onTarget, moveActorId, focusActorId, onMove, onRoutePoint, onFirstAction, route, playing, cameraAdjusting, cameraPanMode, cameraCommand, cameraResetToken, cameraView, cameraEntryKey, onReady }} cameraPreset={selectedPreset} />
    </Canvas>
  </div>;
}

export default function ReadSequenceScene(props) {
  return <ReadSceneBoundary onFailure={props.onFailure}><ReadScene {...props} /></ReadSceneBoundary>;
}
