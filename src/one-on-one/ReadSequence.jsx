import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  READ_ACTIONS,
  U11_READ_SEQUENCE,
  advanceSequencePlayback,
  clampSequencePoint,
  createFinalReadJudgePayload,
  createReadSequenceSession,
  currentSequenceState,
  getChangedCueComparison,
  getReadTwoPrompt,
  getSelectedSecondTarget,
  getThirdReadRoute,
  moveThirdReadActor,
  replayFirstConsequence,
  restoreReadSequence,
  selectSecondRead,
  serializeReadSequence,
  setThirdReadRoute,
  sampleThirdReadRoute,
  submitChangedCueRead,
  submitFirstRead,
  submitThirdRead,
} from './readSequenceCore.js';
import { NHL_200X85_PROFILE } from '../scenario-engine/rinkFrame.js';
import { AIReviewPanel } from './CoachQuestionLab.jsx';
import RoutePlanner from './RoutePlanner.jsx';
import './ReadSequence.css';

const ACTION_COPY = {
  pass: { label: 'Pass', detail: 'Use F2 on the other side.' },
  shoot: { label: 'Shoot', detail: 'Put a low puck through the available window.' },
  carry: { label: 'Carry', detail: 'Attack outside D1’s shoulder with possession.' },
};

const { bounds: RINK_BOUNDS, landmarks: RINK_MARKS } = NHL_200X85_PROFILE;
const HALF_WIDTH = RINK_BOUNDS.maxY;
const GOAL_X = RINK_MARKS.goalLineRight[0];

function RinkStage({ state, targets = [], onTarget, moveActorId, onMove, showReadLanes = false, changedCue = false, route = null, onRoutePoint }) {
  const svg = useRef(null);
  const drag = useRef(null);
  const routeTap = useRef(null);
  const stageId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const puckCarrier = state.actors.find(actor => actor.id === state.puck.owner);
  const support = state.actors.find(actor => actor.id === 'F2');

  function eventPoint(event) {
    const matrix = svg.current?.getScreenCTM();
    if (!matrix) return null;
    const point = svg.current.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const mapped = point.matrixTransform(matrix.inverse());
    return clampSequencePoint(mapped.x, mapped.y);
  }

  function beginMove(event, actor) {
    if (!onMove || actor.id !== moveActorId || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    drag.current = { pointerId: event.pointerId };
    svg.current?.setPointerCapture(event.pointerId);
  }

  function finishMove(event) {
    if (routeTap.current?.pointerId === event.pointerId) {
      const tap = routeTap.current;
      routeTap.current = null;
      if (Math.hypot(event.clientX - tap.x, event.clientY - tap.y) < 8) {
        const point = eventPoint(event);
        if (point) onRoutePoint?.(point);
      }
    }
    if (drag.current && svg.current?.hasPointerCapture(event.pointerId)) svg.current.releasePointerCapture(event.pointerId);
    drag.current = null;
  }

  function moveWithKeyboard(event, actor) {
    if (!onMove || actor.id !== moveActorId) return;
    const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
    if (!direction) return;
    event.preventDefault();
    const step = event.shiftKey ? 0.1 : 0.5;
    onMove(clampSequencePoint(actor.x + direction[0] * step, actor.y + direction[1] * step));
  }

  return <div className="rs-stage-wrap">
    <svg ref={svg} className="rs-rink" viewBox="-1.5 -14.5 34 29" role="group" aria-label="Right half of the rink. Navy circles attack the right net; gold shapes defend."
      onPointerDown={event => {
        if (onRoutePoint && event.button === 0) { routeTap.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY }; svg.current?.setPointerCapture(event.pointerId); }
        else if (onMove && !event.target.closest?.('.rs-actor')) { const point = eventPoint(event); if (point) onMove(point); }
      }}
      onPointerMove={event => { if (drag.current?.pointerId === event.pointerId) { const point = eventPoint(event); if (point) onMove(point); } }}
      onPointerUp={finishMove} onPointerCancel={event => { routeTap.current = null; finishMove(event); }} onLostPointerCapture={() => { drag.current = null; routeTap.current = null; }}
      style={{ touchAction: onMove ? 'none' : onRoutePoint ? 'pan-y' : 'auto' }}>
      <title>U11 connected two-on-one</title>
      <desc>{changedCue ? 'Changed opening freeze: D1 is now on the pass line between the puck and F2. Every other player and the puck stayed in the same place.' : 'D1 partly covers the middle. F2 begins slightly flat on the weak side. The puck and positions update from the selected branch.'}</desc>
      <defs>
        <linearGradient id={`${stageId}-ice`} x1="0" x2="1" y1="0" y2="1"><stop stopColor="#fffdfa" /><stop offset="1" stopColor="#e8edf1" /></linearGradient>
        <filter id={`${stageId}-shadow`}><feDropShadow dx="0" dy=".16" stdDeviation=".18" floodOpacity=".28" /></filter>
        <marker id={`${stageId}-arrow`} markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto"><path d="M0 0 L4 2 L0 4 Z" fill="#C9A24B" /></marker>
      </defs>
      <path d="M 0 -12.954 H 21.9456 A 8.5344 8.5344 0 0 1 30.48 -4.4196 V 4.4196 A 8.5344 8.5344 0 0 1 21.9456 12.954 H 0 Z" fill={`url(#${stageId}-ice)`} stroke="#8793a1" strokeWidth=".22" />
      <g fill="none" strokeLinecap="round">
        <line x1={RINK_MARKS.blueLineRightMid[0]} x2={RINK_MARKS.blueLineRightMid[0]} y1={RINK_BOUNDS.minY} y2={RINK_BOUNDS.maxY} stroke="#5079a5" strokeWidth=".18" opacity=".52" />
        <line x1={GOAL_X} x2={GOAL_X} y1="-9" y2="9" stroke="#b55b60" strokeWidth=".16" opacity=".7" />
        <circle cx={RINK_MARKS.circleTopRight[0]} cy={RINK_MARKS.circleTopRight[1]} r="4.57" stroke="#a8b2bd" strokeWidth=".1" /><circle cx={RINK_MARKS.circleBottomRight[0]} cy={RINK_MARKS.circleBottomRight[1]} r="4.57" stroke="#a8b2bd" strokeWidth=".1" />
        <path d={`M ${GOAL_X} -1.05 H ${GOAL_X + 1.1} V 1.05 H ${GOAL_X}`} stroke="#7c5860" strokeWidth=".2" />
        <path d={`M ${GOAL_X} -1.829 A 1.829 1.829 0 0 0 ${GOAL_X} 1.829`} fill="#C9A24B12" stroke="#C9A24B" strokeWidth=".1" />
      </g>
      {showReadLanes && puckCarrier && support && <g fill="none" pointerEvents="none">
        <line x1={state.puck.x} y1={state.puck.y} x2={support.x} y2={support.y} stroke="#C9A24B" strokeWidth=".13" strokeDasharray=".35 .28" markerEnd={`url(#${stageId}-arrow)`} />
        <line x1={state.puck.x} y1={state.puck.y} x2={GOAL_X} y2="0" stroke="#0B1A33" strokeWidth=".12" strokeDasharray=".28 .3" opacity=".55" />
        <text x={changedCue ? 4 : 17.2} y={changedCue ? -7.5 : 3} fontSize=".55" fill="#0B1A33">{changedCue ? 'D1 IN THE PASS LINE' : 'SHOT LANE SHADED'}</text>
      </g>}
      {route && <g className="rs-planned-route" pointerEvents="none" aria-hidden="true">
        <polyline points={route.map(point => `${point.x},${point.y}`).join(' ')} />
        <text x={route[0].x} y={route[0].y - 1.6} textAnchor="middle">Start</text>
        {route.slice(1).map((point, index) => <g key={index} transform={`translate(${point.x} ${point.y})`}><circle r=".64" /><text y=".29" textAnchor="middle">{index + 1}</text></g>)}
      </g>}
      {targets.map((target, index) => <g key={target.id} className="rs-rink-target" transform={`translate(${target.x} ${target.y})`} role="button" tabIndex="0" aria-label={`Choose ${target.label}`}
        onClick={() => onTarget?.(target.id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onTarget?.(target.id); } }}>
        <circle r="1.75" /><text y=".2" textAnchor="middle">{index + 1}</text>
      </g>)}
      {state.actors.map(actor => {
        const movable = actor.id === moveActorId && Boolean(onMove);
        const transform = `translate(${actor.x} ${actor.y}) rotate(${actor.facing * 180 / Math.PI})`;
        return <g key={actor.id} transform={transform} style={{ filter: `url(#${stageId}-shadow)` }} className={`rs-actor ${actor.team} ${actor.role} ${movable ? 'movable' : ''}`}
          role={movable ? 'button' : undefined} tabIndex={movable ? 0 : undefined}
          aria-label={`${actor.label}, ${actor.team} ${actor.role}${movable ? '. Drag, tap the ice, or use arrow keys to move.' : ''}`}
          onPointerDown={event => beginMove(event, actor)} onKeyDown={event => moveWithKeyboard(event, actor)}>
          {actor.role === 'goalie' ? <path d="M-.72 -.9 H.72 V.9 H-.72 Z" /> : actor.team === 'home' ? <circle r=".78" /> : <path d="M 0 -1 L .86 0 L 0 1 L -.86 0 Z" />}
          <path className="rs-facing" d="M .25 0 H 1.18" />
          <text transform={`rotate(${-actor.facing * 180 / Math.PI})`} y="-1.22" textAnchor="middle">{actor.label}</text>
          {movable && <circle className="rs-move-ring" r="1.35" />}
        </g>;
      })}
      <g className="rs-puck" transform={`translate(${state.puck.x} ${state.puck.y})`}><circle r=".27" /><circle r=".53" /></g>
    </svg>
    <div className="rs-rink-legend"><span><i className="navy" /> Attack</span><span><i className="gold" /> Defend</span><span><i className="puck" /> Puck</span></div>
  </div>;
}

function Progress({ session }) {
  const phase = session.phase === 'replay-1' ? session.replayReturnPhase : session.phase;
  const current = phase === 'read-1' || phase === 'consequence-1' ? 1 : phase === 'read-2' || phase === 'consequence-2' ? 2 : 3;
  return <ol className="rs-progress" aria-label={`Read ${current} of 3`}>
    {['Choose from the cue', 'Re-scan the change', 'Move without the puck'].map((label, index) => <li key={label} className={index + 1 === current ? 'active' : index + 1 < current ? 'done' : ''}><span>{index + 1}</span>{label}</li>)}
  </ol>;
}

function SourceNotes() {
  return <details className="rs-sources"><summary>Teaching sources and evidence boundary</summary>
    <ul>{U11_READ_SEQUENCE.sourceRefs.map(source => <li key={source.note}><code>{source.note}</code><span>{source.use}</span></li>)}</ul>
    <p>{U11_READ_SEQUENCE.evidenceBoundary}</p>
  </details>;
}

function storageKeyFor(playerId) {
  return `rinkreads_read_sequence_v1:${encodeURIComponent(String(playerId || 'local').slice(0, 120))}`;
}

function loadSavedSequence(storageKey) {
  if (typeof localStorage === 'undefined') return null;
  try { return restoreReadSequence(localStorage.getItem(storageKey)); }
  catch { return null; }
}

function downloadReflection(session) {
  const blob = new Blob([serializeReadSequence(session)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'rinkreads-u11-three-read-reflection.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function ChangedCueComparison({ session, onSave }) {
  const comparison = useMemo(() => getChangedCueComparison(session), [session]);
  const [open, setOpen] = useState(Boolean(session.changedCue));
  const [action, setAction] = useState(session.changedCue?.action || null);
  const [reason, setReason] = useState(session.changedCue?.reason || '');
  const [notice, setNotice] = useState('');
  const contentId = useId();

  function save() {
    try {
      onSave(submitChangedCueRead(session, { action, reason }));
      setNotice('Comparison recorded. Your reflection download now includes both answers.');
    } catch (error) { setNotice(error.message); }
  }

  return <section className="rs-comparison" aria-label="Optional changed-cue comparison">
    <p className="rs-step">OPTIONAL · RETURN TO THE FIRST FREEZE</p>
    <h2>One thing changes.</h2>
    <p>Go back to the start. Move only D1. Would you keep your first choice or try something else?</p>
    <button type="button" aria-expanded={open} aria-controls={contentId} onClick={() => setOpen(value => !value)}>{open ? 'Hide comparison' : session.changedCue ? 'View my changed-cue comparison' : 'Try one changed cue'}</button>
    {open && <div id={contentId} className="rs-comparison-content">
      <div className="rs-comparison-boards">
        <figure><figcaption><b>Original freeze</b><span>D1 shades part of the shot lane.</span></figcaption><RinkStage state={comparison.originalState} showReadLanes /></figure>
        <figure><figcaption><b>Only D1 moved</b><span>D1 is now between the puck and F2.</span></figcaption><RinkStage state={comparison.changedState} showReadLanes changedCue /></figure>
      </div>
      <div className="rs-cue-card"><b>What changed?</b><p>{comparison.cue}</p></div>
      <div className="rs-comparison-response">
        <div>
          <h3>Your first answer</h3><div className="rs-comparison-answer"><b>{ACTION_COPY[comparison.originalAnswer.action].label}</b><p>{comparison.originalAnswer.reason}</p></div>
          {comparison.revisedAnswer && <><h3>Your saved answer with D1 moved</h3><div className="rs-comparison-answer"><b>{ACTION_COPY[comparison.revisedAnswer.action].label}</b><p>{comparison.revisedAnswer.reason}</p></div></>}
          <p className="rs-hint">This is a new look at the opening freeze. Your three-read play stays as you made it. This comparison does not play a new outcome.</p>
        </div>
        <div>
          <fieldset className="rs-actions rs-comparison-actions"><legend>With D1 here, what would you do?</legend>{READ_ACTIONS.map(choice => <button type="button" key={choice} aria-pressed={action === choice} onClick={() => setAction(choice)}>{ACTION_COPY[choice].label}</button>)}</fieldset>
          <label className="rs-reason">Why keep or change your choice?<textarea rows="4" maxLength="600" value={reason} onChange={event => setReason(event.target.value)} placeholder="I would… because D1 is now…" /><small>{reason.length}/600</small></label>
          <button type="button" className="rs-primary" onClick={save}>Save my comparison</button>
          <p className="rs-hint">Explain how your choice fits the new lane or space. Different choices can be discussed when the reason fits. No automatic grade or AI opinion is added here.</p>
          {notice && <p className="rs-notice" role="status">{notice}</p>}
        </div>
      </div>
    </div>}
  </section>;
}

export default function ReadSequence({ playerId = null } = {}) {
  const storageKey = useMemo(() => storageKeyFor(playerId), [playerId]);
  const [session, setSession] = useState(() => loadSavedSequence(storageKey) || createReadSequenceSession());
  const [chosenAction, setChosenAction] = useState(() => session.first?.action || null);
  const [firstReason, setFirstReason] = useState(() => session.first?.reason || '');
  const [thirdReason, setThirdReason] = useState(() => session.third?.reason || '');
  const [paused, setPaused] = useState(false);
  const [notice, setNotice] = useState(() => session.phase === 'complete' ? 'Your saved three-read reflection is open.' : '');
  const [reducedMotion, setReducedMotion] = useState(false);
  const [routeMode, setRouteMode] = useState(Boolean(session.third?.route));
  const [routeDraft, setRouteDraft] = useState(null);
  const [routeProgress, setRouteProgress] = useState(null);
  const [routePlaying, setRoutePlaying] = useState(false);
  const phaseHeading = useRef(null);
  const previousPhase = useRef(session.phase);
  const previousStorageKey = useRef(storageKey);
  const route = useMemo(() => getThirdReadRoute(session), [session]);
  const state = useMemo(() => route && routeProgress != null ? sampleThirdReadRoute(session, routeProgress) : currentSequenceState(session), [session, route, routeProgress]);
  const activePlayback = ['consequence-1', 'consequence-2', 'replay-1'].includes(session.phase);
  const readTwo = session.first ? getReadTwoPrompt(session) : null;
  const selectedTarget = getSelectedSecondTarget(session);
  const finalJudgePayload = useMemo(() => session.phase === 'complete' && !session.third?.route ? createFinalReadJudgePayload(session) : null, [session]);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!media) return undefined;
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  useEffect(() => {
    if (previousStorageKey.current === storageKey) return;
    previousStorageKey.current = storageKey;
    const restored = loadSavedSequence(storageKey);
    const next = restored || createReadSequenceSession();
    setSession(next);
    setChosenAction(next.first?.action || null);
    setFirstReason(next.first?.reason || '');
    setThirdReason(next.third?.reason || '');
    setRouteMode(Boolean(next.third?.route));
    setRouteDraft(null);
    setRouteProgress(null);
    setRoutePlaying(false);
    setNotice(restored ? 'This player’s saved three-read reflection is open.' : 'Fresh sequence ready for this player.');
  }, [storageKey]);

  useEffect(() => {
    if (session.phase === 'complete' && typeof localStorage !== 'undefined') {
      try { localStorage.setItem(storageKey, serializeReadSequence(session)); }
      catch { setNotice('The reflection is complete, but this browser could not save it for reopening.'); }
    }
  }, [session, storageKey]);

  useEffect(() => {
    if (previousPhase.current === session.phase) return undefined;
    previousPhase.current = session.phase;
    const frame = requestAnimationFrame(() => phaseHeading.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [session.phase]);

  useEffect(() => {
    if (!activePlayback || paused) return undefined;
    if (reducedMotion) {
      setSession(current => ['consequence-1', 'consequence-2', 'replay-1'].includes(current.phase) ? advanceSequencePlayback(current, 1) : current);
      return undefined;
    }
    const phase = session.phase;
    const startProgress = session.playbackProgress;
    const duration = phase === 'consequence-2' ? 1_250 : 1_750;
    let frame;
    let started;
    const tick = now => {
      if (started == null) started = now;
      const progress = Math.min(1, startProgress + (now - started) / duration);
      setSession(current => current.phase === phase ? advanceSequencePlayback(current, progress) : current);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [session.phase, paused, reducedMotion]); // playback progress advances inside one phase without restarting its clock

  useEffect(() => {
    if (!routePlaying || !route || reducedMotion) return undefined;
    let frame;
    let started;
    const tick = now => {
      if (started == null) started = now;
      const progress = Math.min(1, (now - started) / 3200);
      setRouteProgress(progress);
      if (progress < 1) frame = requestAnimationFrame(tick);
      else setRoutePlaying(false);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [routePlaying, route, reducedMotion]);

  useEffect(() => {
    if (reducedMotion) setRoutePlaying(false);
  }, [reducedMotion]);

  function reset() {
    setSession(createReadSequenceSession());
    setChosenAction(null);
    setFirstReason('');
    setThirdReason('');
    setPaused(false);
    setRouteMode(false);
    setRouteDraft(null);
    setRouteProgress(null);
    setRoutePlaying(false);
    setNotice('Fresh sequence ready.');
    try { localStorage.removeItem(storageKey); } catch { /* Device storage is optional. */ }
  }

  function submitReadOne() {
    try {
      const next = submitFirstRead(session, { action: chosenAction, reason: firstReason });
      setPaused(false);
      setSession(next);
      setNotice('');
    } catch (error) { setNotice(error.message); }
  }

  function chooseTarget(targetId) {
    try {
      const next = selectSecondRead(session, targetId);
      setPaused(false);
      setSession(next);
      setNotice('');
    } catch (error) { setNotice(error.message); }
  }

  function moveActor(point) {
    try { setSession(moveThirdReadActor(session, point)); setRouteDraft(null); setRouteProgress(null); setRoutePlaying(false); setNotice(''); }
    catch (error) { setNotice(error.message); }
  }

  function updateRoute(waypoints) {
    const next = setThirdReadRoute(session, waypoints);
    setSession(next);
    setRouteDraft(null);
    setRouteProgress(null);
    setRoutePlaying(false);
    setNotice('');
  }

  function addRoutePoint(point) {
    updateRoute([...(route?.slice(1) || []), point]);
  }

  function changeMoveMode(planRoute) {
    if (planRoute === routeMode) return;
    setRouteMode(planRoute);
    if (planRoute) updateRoute(routeDraft || []);
    else {
      setRouteDraft(route?.slice(1) || null);
      if (session.third?.point) setSession(moveThirdReadActor(session, session.third.point));
    }
    setRouteProgress(null);
    setRoutePlaying(false);
  }

  function previewRoute() {
    setRouteProgress(0);
    setRoutePlaying(!reducedMotion);
  }

  function finish() {
    try { setSession(submitThirdRead(session, thirdReason)); setRouteProgress(null); setRoutePlaying(false); setNotice(''); }
    catch (error) { setNotice(error.message); }
  }

  function replay() {
    try { setPaused(false); setRouteProgress(null); setRoutePlaying(false); setSession(replayFirstConsequence(session)); setNotice('Replaying the action you selected.'); }
    catch (error) { setNotice(error.message); }
  }

  const branch = session.first ? U11_READ_SEQUENCE.branches[session.first.action] : null;
  const movingActor = session.third ? state.actors.find(actor => actor.id === session.third.actorId) : null;

  return <section className="rs-root" aria-label="U11 connected read sequence" data-player-scope={playerId ? 'player' : 'local'}>
    <header className="rs-hero"><div><p className="rs-kicker">U11 · ODD-MAN READS · COACH-REVIEW DRAFT</p><h1>Three reads.<br /><em>One shifting 2-on-1.</em></h1><p>Choose from what you see. Watch your choice change the play. Then read the ice again.</p></div><div className="rs-hero-note"><b>Short and untimed</b><span>Your explanation matters more than matching one drawing.</span></div></header>
    <Progress session={session} />
    <div className="rs-workspace">
      <div className="rs-board-panel">
        {session.phase === 'read-3' && <div className="rs-move-modes" role="group" aria-label="How to show your support"><button type="button" aria-pressed={!routeMode} onClick={() => changeMoveMode(false)}>Move player</button><button type="button" aria-pressed={routeMode} onClick={() => changeMoveMode(true)}>Plan route</button></div>}
        <RinkStage state={state}
          showReadLanes={session.phase === 'read-1'}
          targets={session.phase === 'read-2' ? session.availableSecondTargets : []}
          onTarget={session.phase === 'read-2' ? chooseTarget : undefined}
          moveActorId={session.phase === 'read-3' && !routeMode ? session.third.actorId : null}
          onMove={session.phase === 'read-3' && !routeMode ? moveActor : undefined}
          route={route}
          onRoutePoint={session.phase === 'read-3' && routeMode ? point => { try { addRoutePoint(point); } catch (error) { setNotice(error.message); } } : undefined} />
        {((session.phase === 'read-3' && routeMode) || (session.phase === 'complete' && route)) && <RoutePlanner key={`${storageKey}:${session.phase}`} route={route} origin={selectedTarget?.state.actors.find(actor => actor.id === session.third.actorId)} actorLabel={movingActor?.label} onChange={updateRoute} onAddPoint={addRoutePoint} progress={routeProgress} playing={routePlaying} reducedMotion={reducedMotion} onPreview={previewRoute} onPause={() => setRoutePlaying(false)} onProgress={progress => { setRoutePlaying(false); setRouteProgress(progress); }} readOnly={session.phase === 'complete'} />}
        <div className="rs-playback-bar">
          <span>{activePlayback ? `${branch?.actionLabel || 'Selected'} consequence · ${Math.round(session.playbackProgress * 100)}%` : session.phase === 'read-1' ? 'Freeze · read 1' : session.phase === 'read-2' ? 'Freeze · read 2' : session.phase === 'read-3' ? 'Freeze · read 3' : 'Sequence reflection'}</span>
          <div>{activePlayback && !reducedMotion && <button type="button" onClick={() => setPaused(value => !value)}>{paused ? 'Resume' : 'Pause'}</button>}
            {session.first && ['read-2', 'read-3', 'complete'].includes(session.phase) && <button type="button" onClick={replay}>Replay my first choice</button>}
            <button type="button" onClick={reset}>Start over</button></div>
        </div>
      </div>

      <aside className="rs-read-panel">
        {session.phase === 'read-1' && <>
          <p className="rs-step">READ 1 · IDENTIFY THE CUE</p><h2 ref={phaseHeading} tabIndex="-1">{U11_READ_SEQUENCE.firstPrompt}</h2>
          <div className="rs-cue-card"><b>Visible before the freeze</b><ul><li>D1 partly shades the shot route but does not erase every option.</li><li>F2 is open enough to consider, but slightly flat.</li><li>The goalie starts nearer the middle while the puck begins off-centre.</li></ul></div>
          <fieldset className="rs-actions"><legend>What would you do?</legend>{READ_ACTIONS.map(action => <button type="button" key={action} aria-pressed={chosenAction === action} onClick={() => setChosenAction(action)}><b>{ACTION_COPY[action].label}</b><span>{ACTION_COPY[action].detail}</span></button>)}</fieldset>
          <label className="rs-reason">What did you notice?<textarea rows="4" maxLength="600" value={firstReason} onChange={event => setFirstReason(event.target.value)} placeholder="Name the defender, lane, support or goalie cue that shaped your choice." /><small>{firstReason.length}/600</small></label>
          <button type="button" className="rs-primary" onClick={submitReadOne}>Play my choice →</button>
          <details className="rs-rubric"><summary>Why more than one choice can be discussed</summary><p>The shot route is only partly covered and F2’s alignment is not perfect. Timing and the reason can make different actions defensible. A pass just because it is a 2-on-1, or a shot treated as a guaranteed goal, misses the read.</p></details>
        </>}

        {(session.phase === 'consequence-1' || session.phase === 'replay-1') && <div className="rs-playing" role="status"><p className="rs-step">YOUR {branch.actionLabel.toUpperCase()} IS CHANGING THE PLAY</p><h2 ref={phaseHeading} tabIndex="-1">Stay with the branch you chose.</h2><p>{branch.consequence}</p>{reducedMotion && <small>Reduced-motion mode moves directly to the next freeze.</small>}</div>}

        {session.phase === 'read-2' && <>
          <p className="rs-step">READ 2 · TIMING & SPACE</p><h2 ref={phaseHeading} tabIndex="-1">{readTwo.prompt}</h2><div className="rs-cue-card"><b>Re-scan now</b><p>{readTwo.cue}</p></div>
          <div className="rs-target-list">{session.availableSecondTargets.map((target, index) => <button type="button" key={target.id} onClick={() => chooseTarget(target.id)}><span>{index + 1}</span><b>{target.label}</b><small>{target.kind === 'receiver' ? 'Tap receiver' : 'Tap space'}</small></button>)}</div>
          <p className="rs-hint">Tap a numbered marker on the rink or use these matching buttons.</p>
        </>}

        {session.phase === 'consequence-2' && <div className="rs-playing" role="status"><p className="rs-step">THE SECOND READ CHANGES THE SHAPE</p><h2 ref={phaseHeading} tabIndex="-1">{selectedTarget?.label}</h2><p>{selectedTarget?.summary}</p></div>}

        {session.phase === 'read-3' && <>
          <p className="rs-step">READ 3 · HELP WITHOUT THE PUCK</p><h2 ref={phaseHeading} tabIndex="-1">{routeMode ? `Plan how ${movingActor?.label} gets to useful space. Then explain the route.` : `Move ${movingActor?.label} to a helpful next position. Then explain the support.`}</h2>
          <div className="rs-cue-card"><b>Keep the whole picture</b><p>The puck is {state.puck.owner ? `with ${state.actors.find(actor => actor.id === state.puck.owner)?.label || state.puck.owner}` : 'still loose'}. Read D1, the puck line and separation. There is no one coordinate to match.</p></div>
          <p className="rs-hint">{routeMode ? 'Use the route controls below the rink to add points, undo a turn, or preview your plan.' : 'Drag the highlighted player, tap the ice, use arrow keys, or adjust the coordinates.'}</p>
          {movingActor && !routeMode && <div className="rs-coordinate-row"><label>Rink length<input type="number" step=".5" value={Number(movingActor.x.toFixed(1))} onChange={event => { const x = event.target.valueAsNumber; if (Number.isFinite(x)) moveActor({ x, y: movingActor.y }); }} /></label><label>Rink width<input type="number" step=".5" value={Number(movingActor.y.toFixed(1))} onChange={event => { const y = event.target.valueAsNumber; if (Number.isFinite(y)) moveActor({ x: movingActor.x, y }); }} /></label></div>}
          <label className="rs-reason">{routeMode ? 'What lane or space are you trying to use?' : 'Why does this position help?'}<textarea rows="4" maxLength="600" value={thirdReason} onChange={event => setThirdReason(event.target.value)} placeholder="Explain the lane or space this creates, protects or keeps available." /><small>{thirdReason.length}/600</small></label>
          <button type="button" className="rs-primary" onClick={finish}>Finish the three reads →</button>
        </>}

        {session.phase === 'complete' && <>
          <p className="rs-step">THREE READS COMPLETE · DRAFT FOR COACH REVIEW</p><h2 ref={phaseHeading} tabIndex="-1">Your choices stayed connected.</h2>
          <div className="rs-summary"><section><span>1</span><div><b>{ACTION_COPY[session.first.action].label}</b><p>{session.first.reason}</p></div></section><section><span>2</span><div><b>{selectedTarget.label}</b><p>{selectedTarget.summary}</p></div></section><section><span>3</span><div><b>{state.actors.find(actor => actor.id === session.third.actorId)?.label} moved</b><p>{session.third.reason}</p></div></section></div>
          <div className="rs-evidence"><b>{session.localEvidence.heading}</b><ul>{session.localEvidence.observations.map(observation => <li key={observation}>{observation}</li>)}</ul><p>{session.localEvidence.note}</p></div>
          {finalJudgePayload && <section className="rs-final-ai"><p className="rs-step">OPTIONAL AI OPINION · FINAL READ ONLY</p><h3>Review my final positioning</h3><p>The AI coach reviews only the board after read two, your final support move and your explanation. It runs only when you press the button.</p><AIReviewPanel key={`${session.first.action}:${session.second.targetId}:${session.third.point.x}:${session.third.point.y}`} question={finalJudgePayload.question} attempt={finalJudgePayload.attempt} /></section>}
          {route && <p className="rs-hint">Your route and explanation are saved for a coach discussion. There is no automatic route grade or AI route review.</p>}
          <p className="rs-saved-note">Saved on this device for this player scope. No score or mastery mark was added.</p>
          <div className="rs-complete-actions"><button type="button" className="rs-primary" onClick={replay}>Replay my first choice</button><button type="button" onClick={() => { try { downloadReflection(session); setNotice('Reflection downloaded without a player identity or score.'); } catch (error) { setNotice(error.message); } }}>Download reflection</button><button type="button" onClick={reset}>Try a new branch</button></div>
        </>}
        {notice && <p className="rs-notice" role="status">{notice}</p>}
      </aside>
    </div>
    {session.phase === 'complete' && <ChangedCueComparison key={storageKey} session={session} onSave={setSession} />}
    <SourceNotes />
  </section>;
}
