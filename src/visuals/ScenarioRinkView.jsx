import { Component, lazy, Suspense, useCallback, useState } from 'react';
import './ScenarioRinkView.css';

const ScenarioRink3D = lazy(() => import('./ScenarioRink3D.jsx'));

class RinkBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

/** A presentation adapter. All answers and positions remain owned by the lesson. */
export default function ScenarioRinkView({ fallback, title = 'Read the ice', teamLabels = { home: 'Your team', away: 'Opponents' }, ...scene }) {
  const [view, setView] = useState('3d');
  const [failed, setFailed] = useState(false);
  const [cameraPreset, setCameraPreset] = useState('broadcast');
  const [cameraAdjusting, setCameraAdjusting] = useState(false);
  const fail = useCallback(() => { setFailed(true); setView('board'); setCameraAdjusting(false); }, []);
  const show3d = view === '3d' && !failed;
  const selected = scene.state.actors.find(actor => actor.id === scene.selectedActorId);
  const canMove = selected && scene.editableIds?.includes(selected.id) && typeof scene.onMove === 'function';
  const chooseView = value => { setCameraAdjusting(false); setView(value); };
  return <section className="scenario-rink-view" aria-label={title}>
    <div className="srv-toolbar">
      <div className="srv-pill" role="group" aria-label="Rink presentation">
        <button type="button" disabled={failed} aria-pressed={show3d} onClick={() => chooseView('3d')}>3D rink</button>
        <button type="button" aria-pressed={!show3d} onClick={() => chooseView('board')}>Tactical board</button>
      </div>
      {show3d && <div className="srv-pill srv-angles" role="group" aria-label="Camera angle">
        {[['broadcast', 'Broadcast'], ['behind-net', 'Behind net'], ['overhead', 'Overhead']].map(([value, label]) => <button type="button" key={value} aria-pressed={cameraPreset === value} onClick={() => { setCameraPreset(value); setCameraAdjusting(false); }}>{label}</button>)}
      </div>}
    </div>
    {show3d && <div className="srv-camera-mode">
      <p>{cameraAdjusting ? 'Drag to turn the camera. Pinch or scroll to zoom. Finish adjusting to answer.' : canMove ? `Select ${selected.label || selected.name || selected.id}, then tap the ice to place them.` : 'Choose an angle to see the same play from another side.'}</p>
      <button type="button" aria-pressed={cameraAdjusting} onClick={() => setCameraAdjusting(value => !value)}>{cameraAdjusting ? 'Done adjusting' : 'Adjust camera'}</button>
    </div>}
    {failed && <p role="status" className="srv-fallback">The 3D view is unavailable here. Continue with the tactical board.</p>}
    {show3d ? <RinkBoundary onFailure={fail} fallback={fallback}>
      <Suspense fallback={<div className="srv-loading"><p role="status">Preparing the rink…</p>{fallback}</div>}>
        <ScenarioRink3D {...scene} cameraPreset={cameraPreset} cameraAdjusting={cameraAdjusting} onFailure={fail} />
      </Suspense>
    </RinkBoundary> : fallback}
    {show3d && <div className="srv-legend"><span><i className="home" />{teamLabels.home} · navy</span><span><i className="away" />{teamLabels.away} · gold</span><span><i className="puck" />Puck</span></div>}
  </section>;
}
