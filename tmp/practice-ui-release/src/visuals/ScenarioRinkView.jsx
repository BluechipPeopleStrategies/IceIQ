import { Component, lazy, Suspense, useCallback, useMemo, useRef, useState } from 'react';
import { actorDisplayName } from './actorLabel.js';
import CameraViewControls from './CameraViewControls.jsx';
import { RINK_AREAS, scenarioFocusBounds } from './rinkAreaNames.js';
import './ScenarioRinkView.css';

const ScenarioRink3D = lazy(() => import('./ScenarioRink3D.jsx'));

class RinkBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

/** A presentation adapter. All answers and positions remain owned by the lesson. */
export default function ScenarioRinkView({ fallback: deferredBoard, title = 'Read the ice', teamLabels = { home: 'Your team', away: 'Opponents' }, focusActorId, focusKey = null, focusPoints = [], puckPresentation = 'highlighted', onAvailabilityChange, onViewUsage, ...scene }) {
  const [failed, setFailed] = useState(false);
  const [renderAttempt, setRenderAttempt] = useState(0);
  const [cameraPreset, setCameraPreset] = useState('broadcast');
  const [cameraAdjusting, setCameraAdjusting] = useState(false);
  const [cameraPanMode, setCameraPanMode] = useState(false);
  const [cameraResetToken, setCameraResetToken] = useState(0);
  const [cameraCommand, setCameraCommand] = useState(null);
  const [framing,setFraming]=useState('focus'),[showRinkAreas,setShowRinkAreas]=useState(false);
  // A position answer changes scene.state while the learner drags. Keep the
  // opening composition until the question/scenario identity changes, so the
  // camera does not jump under an active placement or after an answer.
  const openingIdentity = focusKey ?? scene.id ?? title;
  const focusBounds = useMemo(() => scenarioFocusBounds(scene.state, { focusPoints }), [openingIdentity]);
  const availabilityCallback = useRef(onAvailabilityChange);
  availabilityCallback.current = onAvailabilityChange;
  const fail = useCallback(() => { setFailed(true); setCameraAdjusting(false); availabilityCallback.current?.(false); }, []);
  const ready = useCallback(() => { availabilityCallback.current?.(true); }, []);
  const show3d = !failed;
  const selected = scene.state.actors.find(actor => actor.id === scene.selectedActorId);
  const canMove = selected && scene.editableIds?.includes(selected.id) && typeof scene.onMove === 'function';
  const retry = () => { setRenderAttempt(value => value + 1); setFailed(false); };
  const unavailable = <div className="srv-fallback" role="status"><p>The rink could not load. Try opening it again. If it still will not open, reload the page.</p><button type="button" onClick={retry}>Retry 3D rink</button></div>;
  return <section className="scenario-rink-view" aria-label={title}>
    <div className="srv-quick-controls"><div role="group" aria-label="Rink framing"><button type="button" aria-pressed={framing==='focus'} onClick={()=>{setFraming('focus');onViewUsage?.('focus-change');}}>Focus on the play</button><button type="button" aria-pressed={framing==='full'} onClick={()=>{setFraming('full');onViewUsage?.('camera-full');}}>Full rink</button></div><button type="button" aria-pressed={showRinkAreas} onClick={()=>{setShowRinkAreas(value=>!value);onViewUsage?.(showRinkAreas?'labels-off':'labels-on');}}>{showRinkAreas?'Hide labels':'Show labels'}</button></div>
    {show3d && <CameraViewControls preset={cameraPreset} onPresetChange={value=>{setCameraPreset(value);onViewUsage?.(`camera-${value}`);}}
      adjusting={cameraAdjusting} onAdjustingChange={setCameraAdjusting} panMode={cameraPanMode} onPanModeChange={setCameraPanMode}
      onCameraCommand={setCameraCommand} onReset={() => setCameraResetToken(value => value + 1)} instruction={canMove ? `Select ${actorDisplayName(selected)}, then tap the ice to place them.` : ''} />}
    {show3d ? <RinkBoundary key={renderAttempt} onFailure={fail} fallback={unavailable}>
      <Suspense fallback={<div className="srv-loading"><p role="status">Preparing the rink…</p></div>}>
        <ScenarioRink3D {...scene} bounds={framing==='full'?{minX:-30.48,maxX:30.48,minY:-12.954,maxY:12.954}:focusBounds} showRinkAreas={showRinkAreas} focusActorId={focusActorId} puckPresentation={puckPresentation} cameraPreset={cameraPreset} cameraAdjusting={cameraAdjusting} cameraPanMode={cameraPanMode} cameraResetToken={cameraResetToken} cameraCommand={cameraCommand} onFailure={fail} onReady={ready} />
      </Suspense>
    </RinkBoundary> : unavailable}
    {show3d && scene.state.actors.length > 0 && <div className="srv-legend"><span><i className="home" />{teamLabels.home}{teamLabels.home?.toLowerCase()!=="navy"&&" · navy"}</span><span><i className="away" />{teamLabels.away}{teamLabels.away?.toLowerCase()!=="gold"&&" · gold"}</span>{puckPresentation === 'highlighted' && scene.state.puck && <span><i className="puck" />Puck</span>}</div>}
    {show3d&&<p className="srv-gesture-help">Drag ice to turn · Right-drag to move · Ctrl/⌘ + scroll to zoom · Two fingers to move and zoom</p>}
    {showRinkAreas&&<details className="srv-area-key"><summary>What the area names mean</summary>{RINK_AREAS.filter((area,index,list)=>list.findIndex(a=>a.name===area.name)===index).map(area=><p key={area.id}><b>{area.name}:</b> {area.description}</p>)}<p>Coaching terms describe approximate areas, not exact scoring boundaries.</p></details>}
  </section>;
}
