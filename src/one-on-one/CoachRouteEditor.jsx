import { useEffect, useMemo, useRef, useState } from 'react';
import { sampleDraft } from './director.js';
import { createDirectorRoutePlan } from './directorRoutes.js';
import PracticeScene from './PracticeScene.jsx';
import CoachRouteBoard from './CoachRouteBoard.jsx';
import './CoachRouteEditor.css';

export default function CoachRouteEditor({ draft, actorId, startTime, onApply, onCancel }) {
  const actor = draft.actors.find(item => item.id === actorId);
  const originalFrame = useMemo(() => sampleDraft(draft, startTime), [draft, startTime]);
  const origin = originalFrame.actors.find(item => item.id === actorId);
  const [points, setPoints] = useState([]);
  const [finish, setFinish] = useState(String(draft.duration));
  const [facingMode, setFacingMode] = useState('keep');
  const [view, setView] = useState('3d');
  const [camera, setCamera] = useState('full');
  const [x, setX] = useState('');
  const [y, setY] = useState('');
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [notice, setNotice] = useState('');
  const [reducedMotion, setReducedMotion] = useState(false);
  const heading = useRef(null);
  const previewControls = useRef(null);
  const frameRef = useRef(originalFrame);
  const clock = useRef({ progress: 0, last: 0 });
  const preview = useMemo(() => {
    if (!points.length) return { plan: null, error: '' };
    try {
      if (!finish.trim()) throw new Error('Choose when this player should finish the route.');
      return { plan: createDirectorRoutePlan(draft, { actorId, startTime, endTime: Number(finish), points, facingMode }), error: '' };
    } catch (error) { return { plan: null, error: error.message }; }
  }, [draft, actorId, startTime, finish, points, facingMode]);
  const plan = preview.plan;
  const previewTime = plan ? startTime + (plan.endTime - startTime) * progress : startTime;
  const frame = useMemo(() => plan ? sampleDraft(plan.draft, previewTime) : originalFrame, [plan, previewTime, originalFrame]);
  frameRef.current = frame;
  const routePoints = [{ x: origin.x, y: origin.y }, ...points];
  const canTap = !playing && progress === 0;

  useEffect(() => {
    heading.current?.scrollIntoView({ block: 'start', behavior: 'auto' });
    heading.current?.focus({ preventScroll: true });
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { setReducedMotion(media.matches); if (media.matches) setPlaying(false); };
    update(); media.addEventListener('change', update);
    const pause = () => setPlaying(false);
    window.addEventListener('blur', pause);
    document.addEventListener('visibilitychange', pause);
    return () => { media.removeEventListener('change', update); window.removeEventListener('blur', pause); document.removeEventListener('visibilitychange', pause); };
  }, []);

  useEffect(() => {
    if (!playing || !plan || reducedMotion) return;
    let raf;
    clock.current.last = 0;
    function tick(now) {
      const elapsed = clock.current.last ? Math.min(.1, (now - clock.current.last) / 1000) : 0;
      clock.current.last = now;
      clock.current.progress = Math.min(1, clock.current.progress + elapsed / (plan.endTime - startTime));
      setProgress(clock.current.progress);
      if (clock.current.progress >= 1) setPlaying(false);
      else raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, plan, reducedMotion, startTime]);

  function resetPreview() { setPlaying(false); setProgress(0); clock.current.progress = 0; }
  function changePoints(next) { resetPreview(); setPoints(next); setNotice(''); }
  function addPoint(point) {
    try {
      if (!finish.trim()) throw new Error('Choose the finish time before adding points.');
      createDirectorRoutePlan(draft, { actorId, startTime, endTime: Number(finish), points: [...points, point], facingMode });
      changePoints([...points, { x: point.x, y: point.y }]);
      setNotice(`Point ${points.length + 1} added. The saved play has not changed yet.`);
      return true;
    } catch (error) { setNotice(error.message); return false; }
  }
  function addCoordinates(event) {
    event.preventDefault();
    if (!x.trim() || !y.trim() || ![Number(x), Number(y)].every(Number.isFinite)) { setNotice('Enter both rink coordinates before adding a point.'); return; }
    if (addPoint({ x: Number(x), y: Number(y) })) { setX(''); setY(''); }
  }
  function startPreview() {
    if (!plan) return;
    requestAnimationFrame(() => previewControls.current?.scrollIntoView({ block: 'start', behavior: 'auto' }));
    if (reducedMotion) { setProgress(1); clock.current.progress = 1; return; }
    clock.current.progress = progress >= 1 ? 0 : progress;
    setProgress(clock.current.progress); setPlaying(true);
  }
  function apply() {
    if (!plan) return;
    setPlaying(false);
    try { onApply(plan); } catch (error) { setNotice(error.message); }
  }

  return <section className="pf-route-editor" aria-label="Plan player route">
    <div className="pf-route-heading"><div><p className="oo-eyebrow">COACH LAB · PLAN MOVEMENT</p><h2 ref={heading} tabIndex="-1">Plan {actor.label}’s route.</h2><p>Tap points on the ice, or enter their coordinates. Apply when the route looks right for your question.</p></div><button type="button" onClick={onCancel}>Cancel route</button></div>
    <div className="pf-route-summary"><span><b>Start</b> {startTime.toFixed(2)} s · {origin.x.toFixed(1)}, {origin.y.toFixed(1)} m</span><span><b>Finish</b> {plan ? `${plan.endTime.toFixed(2)} s` : 'Choose below'}</span><span>{points.length}/12 points</span></div>
    <div className="pf-route-views" role="group" aria-label="Route planning view"><button type="button" aria-pressed={view === '3d'} onClick={() => setView('3d')}>3D rink</button><button type="button" aria-pressed={view === 'board'} onClick={() => setView('board')}>Rink board</button>{view === '3d' && <button type="button" onClick={() => setCamera(value => value === 'full' ? 'broadcast' : 'full')}>{camera === 'full' ? 'Use rink camera' : 'Show whole rink'}</button>}</div>
    {plan && <div ref={previewControls} className="pf-route-inspect"><div className="pf-route-tools"><button type="button" className="oo-secondary" onClick={playing ? () => setPlaying(false) : startPreview}>{playing ? 'Pause route preview' : reducedMotion ? 'Inspect route finish' : 'Preview planned movement'}</button><span>{previewTime.toFixed(2)} s · {plan.distanceM.toFixed(1)} m planned</span></div><label>Move through the preview<input aria-label="Coach route preview progress" type="range" min="0" max="100" step="1" value={progress * 100} onChange={event => { setPlaying(false); const value = Number(event.target.value) / 100; clock.current.progress = value; setProgress(value); }} /></label></div>}
    <div className={`pf-director-canvas pf-route-rink ${view === 'board' ? 'pf-route-flat' : ''}`}>
      {view === 'board' ? <CoachRouteBoard frame={frame} actorId={actorId} points={routePoints} onPoint={canTap ? addPoint : undefined} /> : <PracticeScene frameRef={frameRef} roster={draft.actors} selectedActor={actorId} camera={camera} routePoints={routePoints} onRoutePoint={canTap ? addPoint : undefined} />}
    </div>
    <p className="pf-route-caption">{canTap ? 'Start is fixed at the paused moment. Tap inside the boards to add a point.' : 'Inspecting planned movement. Return to Start to add points on the ice.'} The rink board also works without 3D graphics.</p>
    <div className="pf-route-tools"><button type="button" disabled={!points.length} onClick={() => changePoints(points.slice(0, -1))}>Undo last point</button><button type="button" disabled={!points.length} onClick={() => changePoints([])}>Clear points</button><button type="button" disabled={progress === 0 && !playing} onClick={resetPreview}>Return to Start</button></div>
    {plan && <ol className="pf-route-points" aria-label="Planned route positions">{plan.timedPoints.map((point, index) => <li key={index}><b>{index + 1}</b><span>{point.x.toFixed(1)}, {point.y.toFixed(1)} m</span><span>{point.time.toFixed(2)} s{index === plan.timedPoints.length - 1 ? ' · Finish' : ''}</span></li>)}</ol>}
    <div className="pf-route-settings"><label>Finish route at (seconds)<input aria-label="Route finish time" type="number" inputMode="decimal" min={startTime + .05} max={draft.duration} step=".05" value={finish} onFocus={() => setPlaying(false)} onChange={event => { resetPreview(); setFinish(event.target.value); }} /></label><label>Facing<select aria-label="Facing along route" value={facingMode} onChange={event => { resetPreview(); setFacingMode(event.target.value); }}><option value="keep">Keep the current facing direction</option><option value="travel">Turn toward each segment's direction</option></select></label></div>
    <details className="pf-route-coordinates"><summary>Add a point with coordinates</summary><form onSubmit={addCoordinates} noValidate><div className="pf-route-settings"><label>Next point · rink length<input aria-label="Route point rink length" type="number" inputMode="decimal" step=".25" value={x} onFocus={() => setPlaying(false)} onChange={event => setX(event.target.value)} /></label><label>Next point · rink width<input aria-label="Route point rink width" type="number" inputMode="decimal" step=".25" value={y} onFocus={() => setPlaying(false)} onChange={event => setY(event.target.value)} /></label></div><button type="submit" disabled={points.length >= 12}>Add route point</button></form></details>
    {preview.error && <p role="alert" className="oo-notice">{preview.error}</p>}
    <div className="pf-route-apply"><p>{plan ? `Apply replaces ${actor.label}’s remaining movement from ${startTime.toFixed(2)} s with this route (${plan.replacedKeys} existing position ${plan.replacedKeys === 1 ? 'key' : 'keys'}). The player holds the finish position through ${draft.duration.toFixed(2)} s.` : 'Add at least one point to prepare the route.'}</p><button type="button" className="oo-primary" disabled={!plan} onClick={apply}>Apply player route</button></div>
    <p className="oo-notice" role="status">{notice || 'This route is a draft until you apply it.'}</p>
    <details className="pf-route-boundary"><summary>About this preview</summary><p>The preview joins the positions you plan with straight segments. Other players follow their own saved movement; the puck follows its current carrier. Keep facing holds one direction. Turn toward each segment blends from the previous facing to that segment's direction as the player moves; it does not track the puck.</p><p>This shows your positions and timing. Discuss the space and passing lanes with a coach; it does not judge the route or demonstrate skating technique. Animate play follows these routes. Live practice starts from the initial setup and uses its own movement.</p></details>
  </section>;
}
