import { useState } from 'react';
import { MAX_THIRD_ROUTE_POINTS } from './readSequenceCore.js';

export default function RoutePlanner({ route, origin, actorLabel, onChange, onAddPoint, progress, playing, reducedMotion, onPreview, onPause, onProgress, readOnly = false }) {
  const [x, setX] = useState('');
  const [y, setY] = useState('');
  const [notice, setNotice] = useState('');
  const count = route ? route.length - 1 : 0;

  function change(points) {
    try { onChange(points); setNotice(''); }
    catch (error) { setNotice(error.message); }
  }

  function addPoint(event) {
    event.preventDefault();
    if (!x.trim() || !y.trim() || ![Number(x), Number(y)].every(Number.isFinite)) {
      setNotice('Enter both coordinates before adding a point.');
      return;
    }
    try {
      onAddPoint({ x: Number(x), y: Number(y) });
      setNotice(`Point ${count + 1} added. You can add another or preview the route.`);
      setX(''); setY('');
    } catch (error) { setNotice(error.message); }
  }

  return <section className="rs-route-tools" aria-label="Support route controls">
    <div className="rs-route-heading"><b>{readOnly ? 'Your saved support route' : `Plan ${actorLabel}’s route`}</b><span>{count}/{MAX_THIRD_ROUTE_POINTS} points</span></div>
    {!readOnly && <p className="rs-hint">Start at {actorLabel}. Tap points along the path you want them to take. Your last point is where they finish.</p>}
    {origin && <p className="rs-route-origin">Start: {actorLabel} · {origin.x.toFixed(1)}, {origin.y.toFixed(1)} metres</p>}
    {route && <ol className="rs-route-points" aria-label="Route points in order">{route.slice(1).map((point, index) => <li key={index}><span>{index + 1}</span><span>{point.x.toFixed(1)}, {point.y.toFixed(1)} m</span></li>)}</ol>}
    {!readOnly && <>
      <div className="rs-route-actions"><button type="button" disabled={!route} onClick={() => change(route.slice(1, -1))}>Undo last point</button><button type="button" disabled={!route} onClick={() => change([])}>Clear route</button></div>
      <details className="rs-route-numeric"><summary>Add a point with coordinates</summary><form onSubmit={addPoint} noValidate>
        <div className="rs-coordinate-row"><label>Next point · rink length<input type="number" step=".5" inputMode="decimal" value={x} onChange={event => setX(event.target.value)} /></label><label>Next point · rink width<input type="number" step=".5" inputMode="decimal" value={y} onChange={event => setY(event.target.value)} /></label></div>
        <button type="submit" disabled={count >= MAX_THIRD_ROUTE_POINTS}>Add point</button>
      </form></details>
    </>}
    <div className="rs-route-preview">
      <div className="rs-route-actions"><button type="button" className="rs-primary" disabled={!route || playing} onClick={onPreview}>{reducedMotion ? 'Inspect my route' : 'Preview my route'}</button>{playing && <button type="button" onClick={onPause}>Pause route</button>}</div>
      <p className="rs-hint">Only {actorLabel} follows your line. The puck and other players stay still. This shows your plan, not how a defender will react.</p>
      {progress != null && route && <label className="rs-route-progress">{reducedMotion ? 'Move through your plan' : 'Route preview'} · {Math.round(progress * 100)}%<input type="range" min="0" max="100" step="1" value={Math.round(progress * 100)} onChange={event => onProgress(Number(event.target.value) / 100)} aria-label="Route preview progress" /></label>}
    </div>
    {notice && <p className="rs-notice" role="status">{notice}</p>}
  </section>;
}
