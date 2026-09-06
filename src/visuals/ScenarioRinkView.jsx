import { Component, lazy, Suspense, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { characterProportions } from './characterPresentation.js';
import { parseStartingView, resolvePlayerEye, questionViewEntry } from './questionCamera.js';
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
export default function ScenarioRinkView({ fallback: deferredBoard, title = 'Read the ice', teamLabels = { home: 'Your team', away: 'Opponents' }, focusActorId, focusKey = null, questionId, questionEntryToken = 0, startingView, focusPoints = [], puckPresentation = 'highlighted', onAvailabilityChange, onViewUsage, onCameraViewChange, ...scene }) {
  const [failed, setFailed] = useState(false);
  const [renderAttempt, setRenderAttempt] = useState(0);
  const entryIdentity = `${questionId ?? focusKey ?? scene.id ?? title}:${questionEntryToken}`;
  const [viewState, setViewState] = useState({ identity: null, view: {type:'preset',preset:'broadcast'}, error: null });
  let active = viewState;
  if (viewState.identity !== entryIdentity) {
    try { active={identity:entryIdentity,view:questionViewEntry(viewState.identity,entryIdentity,startingView,viewState.view),error:null}; }
    catch(error) { active={identity:entryIdentity,view:viewState.view,error:error.message}; }
    // An absent saved view must not carry a missing observer into another lesson.
    // Explicitly saved invalid observers still fail below rather than changing the question.
    if (startingView == null && active.view.type === 'first-person') {
      try { resolvePlayerEye(active.view, scene.state.actors); }
      catch { active = { ...active, view: {type:'preset',preset:'broadcast'} }; }
    }
    setViewState(active);
  }
  const observer=scene.state.actors.find(actor=>actor.id===active.view.actorId);
  const cameraView=active.view.type==='first-person'?{...active.view,eyeHeight:active.view.eyeHeight??characterProportions(scene.ageBand??observer?.ageBand,scene.stage??observer?.stage).eyeHeight}:active.view;
  const cameraPreset=cameraView.type==='preset'?cameraView.preset:cameraView.type;
  let viewError=active.error;
  if(!viewError && cameraView.type==='first-person') {try {resolvePlayerEye(cameraView,scene.state.actors);}catch(error){viewError=error.message;}}
  const setCameraView=view=>{const parsed=parseStartingView(view);setViewState({identity:entryIdentity,view:parsed,error:null});onCameraViewChange?.(parsed);};
  const setCameraPreset=preset=>setCameraView({type:'preset',preset});
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
  useLayoutEffect(() => { if(startingView || viewError) availabilityCallback.current?.(false); setCameraAdjusting(false); }, [entryIdentity, viewError]);
  const show3d = !failed && !viewError;
  const selected = scene.state.actors.find(actor => actor.id === scene.selectedActorId);
  const canMove = selected && scene.editableIds?.includes(selected.id) && typeof scene.onMove === 'function';
  const retry = () => { setRenderAttempt(value => value + 1); setFailed(false); };
  const unavailable = viewError ? <div className="srv-fallback" role="alert"><p>Question camera unavailable: {viewError}. Correct the saved viewpoint before answering.</p></div> : <div className="srv-fallback" role="status"><p>The rink could not load. Try opening it again. If it still will not open, reload the page.</p><button type="button" onClick={retry}>Retry 3D rink</button></div>;
  return <section className="scenario-rink-view" aria-label={title}>
    <div className="srv-quick-controls"><div role="group" aria-label="Rink framing"><button type="button" aria-pressed={framing==='focus'} onClick={()=>{setFraming('focus');onViewUsage?.('focus-change');}}>Focus on the play</button><button type="button" aria-pressed={framing==='full'} onClick={()=>{setFraming('full');onViewUsage?.('camera-full');}}>Full rink</button></div><button type="button" aria-pressed={showRinkAreas} onClick={()=>{setShowRinkAreas(value=>!value);onViewUsage?.(showRinkAreas?'labels-off':'labels-on');}}>{showRinkAreas?'Hide labels':'Show labels'}</button></div>
    {show3d && <CameraViewControls actors={scene.state.actors} observerId={cameraView.actorId} onObserverChange={actorId=>{setCameraView({type:"first-person",actorId});onViewUsage?.("camera-first-person");}} preset={cameraPreset} onPresetChange={value=>{setCameraPreset(value);onViewUsage?.(`camera-${value}`);}}
      adjusting={cameraAdjusting} onAdjustingChange={setCameraAdjusting} panMode={cameraPanMode} onPanModeChange={setCameraPanMode}
      onCameraCommand={setCameraCommand} onReset={() => { if(startingView) setCameraView(startingView); setCameraResetToken(value => value + 1); }} instruction={canMove ? `Select ${actorDisplayName(selected)}, then tap the ice to place them.` : ''} />}
    {show3d ? <RinkBoundary key={renderAttempt} onFailure={fail} fallback={unavailable}>
      <Suspense fallback={<div className="srv-loading"><p role="status">Preparing the rink…</p></div>}>
        <ScenarioRink3D {...scene} bounds={framing==='full'?{minX:-30.48,maxX:30.48,minY:-12.954,maxY:12.954}:focusBounds} showRinkAreas={showRinkAreas} focusActorId={focusActorId} puckPresentation={puckPresentation} onCameraViewChange={onCameraViewChange} cameraView={cameraView} cameraEntryKey={entryIdentity} cameraPreset={cameraPreset} cameraAdjusting={cameraAdjusting} cameraPanMode={cameraPanMode} cameraResetToken={cameraResetToken} cameraCommand={cameraCommand} onFailure={fail} onReady={ready} />
      </Suspense>
    </RinkBoundary> : unavailable}
    {show3d && scene.state.actors.length > 0 && <div className="srv-legend"><span><i className="home" />{teamLabels.home}{teamLabels.home?.toLowerCase()!=="navy"&&" · navy"}</span><span><i className="away" />{teamLabels.away}{teamLabels.away?.toLowerCase()!=="gold"&&" · gold"}</span>{puckPresentation === 'highlighted' && scene.state.puck && <span><i className="puck" />Puck</span>}</div>}
    {show3d&&cameraView.type!=='first-person'&&<p className="srv-gesture-help">Drag ice to turn · Right-drag to move · Ctrl/⌘ + scroll to zoom · Two fingers to move and zoom</p>}
    {showRinkAreas&&<details className="srv-area-key"><summary>What the area names mean</summary>{RINK_AREAS.filter((area,index,list)=>list.findIndex(a=>a.name===area.name)===index).map(area=><p key={area.id}><b>{area.name}:</b> {area.description}</p>)}<p>Coaching terms describe approximate areas, not exact scoring boundaries.</p></details>}
  </section>;
}
