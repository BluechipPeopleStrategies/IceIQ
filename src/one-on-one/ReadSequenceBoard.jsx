import { Component, lazy, Suspense, useCallback, useId, useState } from 'react';
import './ReadSequenceBoard.css';

const ReadSequenceScene = lazy(() => import('./ReadSequenceScene.jsx'));

class VisualBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export default function ReadSequenceBoard({ view, onViewChange, fallbackBoard, ...scene }) {
  const [failed, setFailed] = useState(false);
  const [wide, setWide] = useState(false);
  const descriptionId = useId();
  const fail = useCallback(() => {
    setFailed(true);
    onViewChange('board');
  }, [onViewChange]);
  const show3d = view === '3d' && !failed;
  const carrier = scene.state.actors.find(actor => actor.id === scene.state.puck.owner);
  const carrierName = carrier?.label || carrier?.name || carrier?.id;
  const possession = carrierName === 'YOU' ? 'You have the puck.' : carrierName ? `${carrierName} has the puck.` : scene.playing ? 'Watch the puck as the play continues.' : 'The puck is loose. No player has possession.';

  return <div className="rs-visual-board" aria-describedby={descriptionId}>
    <div className="rs-view-bar">
      <div role="group" aria-label="Rink presentation">
        <button type="button" aria-pressed={show3d} disabled={failed} onClick={() => onViewChange('3d')}>3D rink</button>
        <button type="button" aria-pressed={!show3d} onClick={() => onViewChange('board')}>Tactical board</button>
      </div>
      {show3d && <button type="button" className="rs-view-fit" aria-pressed={wide} onClick={() => setWide(value => !value)}>{wide ? 'Focus on the play' : 'Show more ice'}</button>}
    </div>
    {failed && <p className="rs-visual-fallback" role="status">The 3D view is unavailable in this browser. You can continue on the tactical board.</p>}
    {show3d
      ? <VisualBoundary onFailure={fail} fallback={fallbackBoard}>
          <Suspense fallback={<div className="rs-visual-loading"><p role="status">Preparing the rink…</p>{fallbackBoard}</div>}>
            <ReadSequenceScene {...scene} wide={wide} onFailure={fail} />
          </Suspense>
        </VisualBoundary>
      : fallbackBoard}
    {show3d && <div className="rs-scene-legend" aria-hidden="true"><span><i className="home" />Attack</span><span><i className="away" />Defend</span><span><i className="puck" />Puck</span></div>}
    <p id={descriptionId} className="rs-visual-description">{possession} Attack toward the net.</p>
  </div>;
}
