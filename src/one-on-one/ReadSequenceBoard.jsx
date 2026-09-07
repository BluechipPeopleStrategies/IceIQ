import { Component, lazy, Suspense, useCallback, useId, useState } from 'react';
import './ReadSequenceBoard.css';

const ReadSequenceScene = lazy(() => import('./ReadSequenceScene.jsx'));

class VisualBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export default function ReadSequenceBoard({ fallbackBoard: deferredBoard, onUnavailable, onAvailabilityChange, ...scene }) {
  const [failed, setFailed] = useState(false);
  const [renderAttempt, setRenderAttempt] = useState(0);
  const [wide, setWide] = useState(false);
  const descriptionId = useId();
  const fail = useCallback(() => {
    setFailed(true);
    onAvailabilityChange?.(false);
    onUnavailable?.();
  }, [onUnavailable, onAvailabilityChange]);
  const retry = () => { setRenderAttempt(value => value + 1); setFailed(false); };
  const show3d = !failed;
  const unavailable = <div className="rs-visual-fallback" role="status"><p>The rink could not load. Your choices are still here. Try opening the rink again.</p><button type="button" onClick={retry}>Retry 3D rink</button></div>;
  const carrier = scene.state.actors.find(actor => actor.id === scene.state.puck.owner);
  const carrierName = carrier?.label || carrier?.name || carrier?.id;
  const possession = carrierName === 'YOU' ? 'You have the puck.' : carrierName ? `${carrierName} has the puck.` : scene.playing ? 'Watch the puck as the play continues.' : 'The puck is loose. No player has possession.';

  return <div className="rs-visual-board" aria-describedby={descriptionId}>
    <div className="rs-view-bar">
      <span>3D rink</span>
      {show3d && <button type="button" className="rs-view-fit" aria-pressed={wide} onClick={() => setWide(value => !value)}>{wide ? 'Focus on the play' : 'Show more ice'}</button>}
    </div>
    {show3d
      ? <VisualBoundary key={renderAttempt} onFailure={fail} fallback={unavailable}>
          <Suspense fallback={<div className="rs-visual-loading"><p role="status">Preparing the rink…</p></div>}>
            <ReadSequenceScene {...scene} wide={wide} onFailure={fail} onPending={() => onAvailabilityChange?.(false)} onReady={() => onAvailabilityChange?.(true)} />
          </Suspense>
        </VisualBoundary>
      : unavailable}
    {show3d && <div className="rs-scene-legend" aria-hidden="true"><span><i className="home" />Attack</span><span><i className="away" />Defend</span><span><i className="puck" />Puck</span></div>}
    <p id={descriptionId} className="rs-visual-description">{possession} Attack toward the net.</p>
  </div>;
}
