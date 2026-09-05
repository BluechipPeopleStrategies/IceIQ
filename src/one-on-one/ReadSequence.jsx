import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  READ_ACTIONS,
  READ_SEQUENCE_CATALOG,
  U11_READ_SEQUENCE,
  advanceSequencePlayback,
  clampSequencePoint,
  createFinalReadJudgePayload,
  createReadSequenceSession,
  currentSequenceState,
  getChangedCueComparison,
  getReadTwoPrompt,
  getReadSequenceDefinition,
  getReadSequenceStorageKey,
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
import RinkCoordinateInput from './RinkCoordinateInput.jsx';
import ReadSequenceRecall from './ReadSequenceRecall.jsx';
import ReadSequenceBoard from './ReadSequenceBoard.jsx';
import { U11_PLAYER_COPY } from './readSequencePlayerCopy.js';
import { getReadSequenceRecallStorageKey } from './readSequenceRecallStorage.js';
import { speakParts, stopSpeaking, ttsSupported } from '../speak.js';
import './ReadSequence.css';

const ACTION_COPY = {
  pass: { label: 'Pass', detail: 'Use F2 on the other side.' },
  shoot: { label: 'Shoot', detail: 'Put a low puck through the available window.' },
  carry: { label: 'Carry', detail: 'Attack outside D1’s shoulder with possession.' },
};

const { bounds: RINK_BOUNDS, landmarks: RINK_MARKS } = NHL_200X85_PROFILE;
const HALF_WIDTH = RINK_BOUNDS.maxY;
const GOAL_X = RINK_MARKS.goalLineRight[0];

function RinkStage({ state, definition = U11_READ_SEQUENCE, description, targets = [], onTarget, moveActorId, onMove, showReadLanes = false, changedCue = false, route = null, onRoutePoint }) {
  const svg = useRef(null);
  const drag = useRef(null);
  const routeTap = useRef(null);
  const stageId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const puckCarrier = state.actors.find(actor => actor.id === state.puck.owner);
  const carrierName = puckCarrier?.label || puckCarrier?.name || puckCarrier?.id;
  const puckDescription = carrierName === 'YOU' ? 'You have the puck.' : carrierName ? `${carrierName} has the puck.` : 'No player has the puck.';
  const support = state.actors.find(actor => actor.id === 'F2');

  function targetBadge(target) {
    const occupied = state.actors.flatMap(actor => [actor, ...(actor.label ? [{ x: actor.x, y: actor.y - 1.22 }] : [])]);
    const corners = [{ x: 1.45, y: -1.3 }, { x: -1.45, y: -1.3 }, { x: 1.45, y: 1.3 }, { x: -1.45, y: 1.3 }];
    const clearance = corner => Math.min(...occupied.map(point => Math.hypot(target.x + corner.x - point.x, target.y + corner.y - point.y)));
    return corners.reduce((best, corner) => clearance(corner) > clearance(best) ? corner : best);
  }

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
      <title>{definition.ageBand} connected two-on-one</title>
      <desc>{description || (changedCue ? 'Changed opening freeze: D1 is now on the pass line between the puck and F2. Every other player and the puck stayed in the same place.' : `${definition.ui?.stageDescription || 'Navy circles attack the right net. Gold shapes defend.'} ${puckDescription}`)}</desc>
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
        <text x={changedCue ? 4 : 17.2} y={changedCue ? -7.5 : 3} fontSize=".55" fill="#0B1A33">{changedCue ? 'D1 IN THE PASS LINE' : 'D1 NEAR SHOT LINE'}</text>
      </g>}
      {route && <g className="rs-planned-route" pointerEvents="none" aria-hidden="true">
        <polyline points={route.map(point => `${point.x},${point.y}`).join(' ')} />
        <text x={route[0].x} y={route[0].y - 1.6} textAnchor="middle">Start</text>
        {route.slice(1).map((point, index) => <g key={index} transform={`translate(${point.x} ${point.y})`}><circle r=".64" /><text y=".29" textAnchor="middle">{index + 1}</text></g>)}
      </g>}
      {state.actors.map(actor => {
        const selected = actor.id === moveActorId;
        const movable = actor.id === moveActorId && Boolean(onMove);
        const transform = `translate(${actor.x} ${actor.y}) rotate(${actor.facing * 180 / Math.PI})`;
        return <g key={actor.id} transform={transform} style={{ filter: `url(#${stageId}-shadow)` }} className={`rs-actor ${actor.team} ${actor.role} ${movable ? 'movable' : ''}`}
          role={movable ? 'button' : undefined} tabIndex={movable ? 0 : undefined}
          aria-label={`${actor.label || actor.name}, ${actor.team} ${actor.role}${movable ? '. Drag, tap the ice, or use arrow keys to move.' : ''}`}
          onPointerDown={event => beginMove(event, actor)} onKeyDown={event => moveWithKeyboard(event, actor)}>
          {actor.role === 'goalie' ? <path d="M-.72 -.9 H.72 V.9 H-.72 Z" /> : actor.team === 'home' ? <circle r=".78" /> : <path d="M 0 -1 L .86 0 L 0 1 L -.86 0 Z" />}
          <path className="rs-facing" d="M .25 0 H 1.18" />
          <text transform={`rotate(${-actor.facing * 180 / Math.PI})`} y="-1.22" textAnchor="middle">{actor.label}</text>
          {selected && <circle className="rs-move-ring" r="1.35" />}
        </g>;
      })}
      {targets.map((target, index) => { const badge = targetBadge(target); return <g key={target.id} className="rs-rink-target" transform={`translate(${target.x} ${target.y})`} role="button" tabIndex="0" aria-label={`Choose ${target.label}`}
        onClick={() => onTarget?.(target.id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onTarget?.(target.id); } }}>
        <circle className="rs-target-area" r="1.75" /><circle className="rs-target-number" cx={badge.x} cy={badge.y} r=".75" /><text x={badge.x} y={badge.y + .35} textAnchor="middle">{index + 1}</text>
      </g>; })}
      <g className="rs-puck" pointerEvents="none" transform={`translate(${state.puck.x} ${state.puck.y})`}><circle r=".27" /><circle r=".53" /></g>
    </svg>
    <div className="rs-rink-legend"><span><i className="navy" /> Attack</span><span><i className="gold" /> Defend</span><span><i className="puck" /> Puck</span></div>
  </div>;
}

function Progress({ session, labels = ['Choose from the cue', 'Re-scan the change', 'Move without the puck'] }) {
  const phase = session.phase === 'replay-1' ? session.replayReturnPhase : session.phase;
  const current = phase === 'read-1' || phase === 'consequence-1' ? 1 : phase === 'read-2' || phase === 'consequence-2' ? 2 : 3;
  return <ol className="rs-progress" aria-label={`Read ${current} of 3`}>
    {labels.map((label, index) => <li key={label} className={index + 1 === current ? 'active' : index + 1 < current ? 'done' : ''}><span>{index + 1}</span>{label}</li>)}
  </ol>;
}

function SourceNotes({ definition }) {
  return <details className="rs-sources"><summary>Teaching sources and evidence boundary</summary>
    <ul>{definition.sourceRefs.map(source => <li key={source.note}><code>{source.note}</code><span>{source.use}</span></li>)}</ul>
    <p>{definition.evidenceBoundary}</p>
  </details>;
}

function ReadAloudControls({ parts, rate }) {
  if (!parts || !ttsSupported()) return null;
  return <div className="rs-audio-controls" role="group" aria-label="Read aloud controls"><button type="button" onClick={() => speakParts(parts, { rate })}>Read aloud</button><button type="button" onClick={stopSpeaking}>Stop reading</button></div>;
}

function loadSavedSequence(storageKey, scenarioId) {
  if (typeof localStorage === 'undefined') return null;
  try { return restoreReadSequence(localStorage.getItem(storageKey), scenarioId); }
  catch { return null; }
}

function downloadReflection(session) {
  const blob = new Blob([serializeReadSequence(session)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `rinkreads-${getReadSequenceDefinition(session.scenarioId).ageBand.toLowerCase()}-three-read-reflection.json`;
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
    <p>Look at the start again. Only D1 has moved. Would you keep your first choice or try something else?</p>
    <button type="button" aria-expanded={open} aria-controls={contentId} onClick={() => setOpen(value => !value)}>{open ? 'Hide comparison' : session.changedCue ? 'View my changed-cue comparison' : 'Try one changed cue'}</button>
    {open && <div id={contentId} className="rs-comparison-content">
      <div className="rs-comparison-boards">
        <figure><figcaption><b>Original freeze</b><span>D1 is near the line from the puck to the net.</span></figcaption><RinkStage state={comparison.originalState} showReadLanes /></figure>
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

function ReadSequenceLesson({ playerId, definition, scratch, rememberDraft, recallDraftAccess }) {
  const storageKey = getReadSequenceStorageKey(playerId, definition.id);
  const isU11 = definition.id === U11_READ_SEQUENCE.id;
  const isYoung = definition.ageBand === 'U9';
  const copy = isU11 ? U11_PLAYER_COPY : definition.ui || {};
  const firstPrompt = copy.firstPrompt || definition.firstPrompt;
  const actions = definition.actions || READ_ACTIONS;
  const actionCopy = copy.actionCopy || ACTION_COPY;
  const [session, setSession] = useState(() => scratch?.session || loadSavedSequence(storageKey, definition.id) || createReadSequenceSession(definition.id));
  const [chosenAction, setChosenAction] = useState(() => scratch?.chosenAction ?? session.first?.action ?? null);
  const [firstReason, setFirstReason] = useState(() => scratch?.firstReason ?? session.first?.reason ?? '');
  const [thirdReason, setThirdReason] = useState(() => scratch?.thirdReason ?? session.third?.reason ?? '');
  const [paused, setPaused] = useState(false);
  const [boardView, setBoardView] = useState('3d');
  const [notice, setNotice] = useState(() => session.phase === 'complete' ? 'Your saved three-read reflection is open.' : '');
  const [reducedMotion, setReducedMotion] = useState(false);
  const [routeMode, setRouteMode] = useState(scratch?.routeMode ?? Boolean(session.third?.route));
  const [routeDraft, setRouteDraft] = useState(scratch?.routeDraft || null);
  const [routeProgress, setRouteProgress] = useState(null);
  const [routePlaying, setRoutePlaying] = useState(false);
  const phaseHeading = useRef(null);
  const boardHeading = useRef(null);
  const boardPanel = useRef(null);
  const readPanel = useRef(null);
  const navigationFrame = useRef(null);
  const previousPhase = useRef(session.phase);
  const route = useMemo(() => getThirdReadRoute(session), [session]);
  const state = useMemo(() => route && routeProgress != null ? sampleThirdReadRoute(session, routeProgress) : currentSequenceState(session), [session, route, routeProgress]);
  const activePlayback = ['consequence-1', 'consequence-2', 'replay-1'].includes(session.phase);
  const canonicalReadTwo = session.first ? getReadTwoPrompt(session) : null;
  const branchCopy = copy.branches?.[session.first?.action];
  const readTwo = canonicalReadTwo && { ...canonicalReadTwo, prompt: branchCopy?.prompt || canonicalReadTwo.prompt, cue: branchCopy?.cue || canonicalReadTwo.cue };
  const displayTargets = session.availableSecondTargets.map(target => ({ ...target, label: branchCopy?.targets?.[target.id]?.label || target.label }));
  const selectedTarget = getSelectedSecondTarget(session);
  const selectedText = selectedTarget && { label: branchCopy?.targets?.[selectedTarget.id]?.label || selectedTarget.label, summary: branchCopy?.targets?.[selectedTarget.id]?.summary || selectedTarget.summary };
  const finalJudgePayload = useMemo(() => isU11 && session.phase === 'complete' && !session.third?.route ? createFinalReadJudgePayload(session) : null, [session, isU11]);

  useEffect(() => {
    rememberDraft({ session, chosenAction, firstReason, thirdReason, routeMode, routeDraft });
  }, [session, chosenAction, firstReason, thirdReason, routeMode, routeDraft, rememberDraft]);

  useEffect(() => { stopSpeaking(); return stopSpeaking; }, [session.phase]);

  useEffect(() => () => cancelAnimationFrame(navigationFrame.current), []);

  function returnToContent(destination = 'board') {
    if (!window.matchMedia('(max-width: 1000px)').matches) return;
    // User-action navigation only. Playback, dragging and route updates never call this.
    if (document.activeElement?.matches('input, textarea')) document.activeElement.blur();
    cancelAnimationFrame(navigationFrame.current);
    navigationFrame.current = requestAnimationFrame(() => {
      navigationFrame.current = null;
      if (!window.matchMedia('(max-width: 1000px)').matches) return;
      // Reduced-motion replay may already be back at the reflection by this frame.
      const toBoard = destination === 'board' && Boolean(boardHeading.current);
      const panel = toBoard ? boardPanel.current : readPanel.current;
      const heading = toBoard ? boardHeading.current : phaseHeading.current;
      if (!panel) return;
      const top = panel.getBoundingClientRect().top;
      const end = toBoard ? panel.querySelector('.rs-visual-board, .rs-stage-wrap') : heading;
      const bottom = end?.getBoundingClientRect().bottom ?? top;
      const visibleHeight = window.visualViewport?.height || window.innerHeight;
      if (top < 8 || bottom > visibleHeight - 8) {
        window.scrollTo({ top: Math.max(0, window.scrollY + top - 12), behavior: 'auto' });
      }
      heading?.focus({ preventScroll: true });
    });
  }

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!media) return undefined;
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  useEffect(() => {
    if (session.phase === 'complete' && typeof localStorage !== 'undefined') {
      try { localStorage.setItem(storageKey, serializeReadSequence(session)); }
      catch { setNotice('The reflection is complete, but this browser could not save it for reopening.'); }
    }
  }, [session, storageKey]);

  useEffect(() => {
    if (previousPhase.current === session.phase) return undefined;
    previousPhase.current = session.phase;
    const frame = requestAnimationFrame(() => {
      const heading = session.phase !== 'complete' && window.matchMedia('(max-width: 1000px)').matches ? boardHeading.current : phaseHeading.current;
      heading?.focus({ preventScroll: true });
    });
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
    stopSpeaking();
    setSession(createReadSequenceSession(definition.id));
    setChosenAction(null);
    setFirstReason('');
    setThirdReason('');
    setPaused(false);
    setRouteMode(false);
    setRouteDraft(null);
    setRouteProgress(null);
    setRoutePlaying(false);
    setNotice('Fresh sequence ready.');
    recallDraftAccess.clear();
    for (const key of [storageKey, getReadSequenceRecallStorageKey(playerId, definition.id)]) {
      try { localStorage.removeItem(key); } catch { /* Device storage is optional. */ }
    }
    returnToContent();
  }

  function submitReadOne() {
    try {
      const next = submitFirstRead(session, { action: chosenAction, reason: firstReason });
      setPaused(false);
      setSession(next);
      setNotice('');
      returnToContent();
    } catch (error) { setNotice(error.message); }
  }

  function chooseTarget(targetId) {
    try {
      const next = selectSecondRead(session, targetId);
      setPaused(false);
      setSession(next);
      setNotice('');
      returnToContent();
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
    try { setSession(submitThirdRead(session, thirdReason)); setRouteProgress(null); setRoutePlaying(false); setNotice(''); returnToContent('reflection'); }
    catch (error) { setNotice(error.message); }
  }

  function replay() {
    try { setPaused(false); setRouteProgress(null); setRoutePlaying(false); setSession(replayFirstConsequence(session)); setNotice('Replaying the action you selected.'); returnToContent(); }
    catch (error) { setNotice(error.message); }
  }

  const branch = session.first ? definition.branches[session.first.action] : null;
  const consequenceText = branchCopy?.consequence || branch?.consequence;
  const actionNoun = session.first?.action === 'shoot' ? 'shot' : branch?.actionLabel?.toLowerCase() || 'choice';
  const movingActor = session.third ? state.actors.find(actor => actor.id === session.third.actorId) : null;
  const movingLabel = isYoung ? movingActor?.name : movingActor?.label || movingActor?.name;
  const routeLabel = isYoung ? 'the highlighted player' : movingLabel;
  const thirdPrompt = !isYoung
    ? routeMode ? `${movingLabel === 'YOU' ? 'Plan your path.' : `Plan a path for ${movingLabel}.`} What space do you want to use?` : `${movingLabel === 'YOU' ? 'Where would you move to help?' : `Where should ${movingLabel} move to help?`} Show your idea and explain it.`
    : routeMode ? 'Plan a path for the highlighted player. How will it help?' : 'Move the highlighted player to help the player with the puck.';
  const thirdCue = copy.thirdCue || `The puck is ${state.puck.owner ? `with ${state.actors.find(actor => actor.id === state.puck.owner)?.label || state.puck.owner}` : 'still loose'}. Look at D1 and the space around the puck.`;
  const firstReasonLabel = copy.firstReasonLabel || 'What did you notice?';
  const spokenParts = session.phase === 'read-1'
    ? [firstPrompt, ...actions.map(action => actionCopy[action].label), firstReasonLabel]
    : session.phase === 'read-2'
      ? [readTwo.prompt, readTwo.cue, ...displayTargets.map((target, index) => `${index + 1}. ${target.label}`)]
      : session.phase === 'read-3' ? [thirdPrompt, thirdCue, 'Why does this help?'] : null;
  const boardCopy = session.phase === 'read-1'
    ? { step: 'READ 1 · LOOK, THEN CHOOSE', prompt: firstPrompt, cue: copy.openingBoardCue || (isYoung ? 'Find your teammate, the defender and the space between them.' : 'Notice the defender, teammate and goalie before you choose.') }
    : session.phase === 'read-2'
      ? { step: 'READ 2 · LOOK AGAIN', prompt: readTwo.prompt, cue: readTwo.cue }
      : session.phase === 'read-3'
        ? { step: 'READ 3 · HELP WITHOUT THE PUCK', prompt: thirdPrompt, cue: thirdCue }
        : session.phase === 'consequence-2'
          ? { step: 'WATCH YOUR NEXT CHOICE', prompt: selectedText.label, cue: selectedText.summary }
          : { step: session.phase === 'replay-1' ? 'REPLAY YOUR FIRST CHOICE' : 'WATCH YOUR CHOICE', prompt: `Your ${actionNoun} changes the play.`, cue: consequenceText };

  const boardProps = {
    state, definition,
    targets: session.phase === 'read-2' ? displayTargets : [],
    onTarget: session.phase === 'read-2' ? chooseTarget : undefined,
    moveActorId: session.phase === 'read-3' ? session.third.actorId : null,
    onMove: session.phase === 'read-3' && !routeMode ? moveActor : undefined,
    route,
    onRoutePoint: session.phase === 'read-3' && routeMode ? point => { try { addRoutePoint(point); } catch (error) { setNotice(error.message); } } : undefined,
  };
  const visualPlaying = (activePlayback && !paused && !reducedMotion) || (routePlaying && !reducedMotion);
  const visualTime = activePlayback ? session.playbackProgress * (session.phase === 'consequence-2' ? 1.25 : 1.75) : (routeProgress || 0) * 3.2;

  return <section className="rs-lesson" aria-label={`${definition.ageBand} connected read sequence`} data-player-scope={playerId ? 'player' : 'local'}>
    <header className="rs-hero"><div><p className="rs-kicker">{definition.ageBand} · {copy.kicker || 'ODD-MAN READS'} · COACH-REVIEW DRAFT</p><h1>Three reads.<br /><em>{copy.heroAccent || 'One shifting 2-on-1.'}</em></h1><p>{copy.intro || 'Choose from what you see. Watch your choice change the play. Then read the ice again.'}</p></div><div className="rs-hero-note"><b>Short and untimed</b><span>{copy.note || 'Your explanation matters more than matching one drawing.'}</span></div></header>
    <Progress session={session} labels={copy.progressLabels} />
    <div className="rs-workspace">
      <div ref={boardPanel} className="rs-board-panel">
        {session.phase !== 'complete' && <div className="rs-board-prompt"><p className="rs-step">{boardCopy.step}</p><h2 ref={boardHeading} tabIndex="-1">{boardCopy.prompt}</h2><p className="rs-board-cue">{boardCopy.cue}</p><ReadAloudControls parts={spokenParts} rate={isYoung ? .88 : .95} /></div>}
        {session.phase === 'read-3' && <div className="rs-move-modes" role="group" aria-label="How to show your support"><button type="button" aria-pressed={!routeMode} onClick={() => changeMoveMode(false)}>Move player</button><button type="button" aria-pressed={routeMode} onClick={() => changeMoveMode(true)}>Plan route</button></div>}
        <ReadSequenceBoard {...boardProps} view={boardView} onViewChange={setBoardView}
          playing={visualPlaying} time={visualTime} supportPoint={session.third?.point || null}
          fallbackBoard={<RinkStage {...boardProps} showReadLanes={isU11 && session.phase === 'read-1'} />} />
        {((session.phase === 'read-3' && routeMode) || (session.phase === 'complete' && route)) && <RoutePlanner key={`${storageKey}:${session.phase}`} route={route} origin={selectedTarget?.state.actors.find(actor => actor.id === session.third.actorId)} actorLabel={routeLabel} onChange={updateRoute} onAddPoint={addRoutePoint} progress={routeProgress} playing={routePlaying} reducedMotion={reducedMotion} onPreview={previewRoute} onPause={() => setRoutePlaying(false)} onProgress={progress => { setRoutePlaying(false); setRouteProgress(progress); }} readOnly={session.phase === 'complete'} />}
        <div className="rs-playback-bar">
          <span>{activePlayback ? `${branch?.actionLabel || 'Selected'} consequence · ${Math.round(session.playbackProgress * 100)}%` : session.phase === 'read-1' ? 'Freeze · read 1' : session.phase === 'read-2' ? 'Freeze · read 2' : session.phase === 'read-3' ? 'Freeze · read 3' : 'Sequence reflection'}</span>
          <div>{activePlayback && !reducedMotion && <button type="button" onClick={() => setPaused(value => !value)}>{paused ? 'Resume' : 'Pause'}</button>}
            {session.first && ['read-2', 'read-3', 'complete'].includes(session.phase) && <button type="button" onClick={replay}>Replay my first choice</button>}
            <button type="button" onClick={reset}>Start over</button></div>
        </div>
      </div>

      <aside ref={readPanel} className={`rs-read-panel ${session.phase === 'complete' ? 'rs-complete-panel' : ''}`} data-phase={session.phase}>
        <ReadAloudControls parts={spokenParts} rate={isYoung ? .88 : .95} />
        {session.phase === 'read-1' && <>
          <p className="rs-step">READ 1 · {isYoung ? 'LOOK, THEN CHOOSE' : 'IDENTIFY THE CUE'}</p><h2 ref={phaseHeading} tabIndex="-1">{firstPrompt}</h2>
          <div className="rs-cue-card"><b>{isYoung ? 'Find your team' : 'Look at the ice'}</b><ul>{(copy.firstCues || ['D1 partly shades the shot route but does not erase every option.', 'F2 is open enough to consider, but slightly flat.', 'The goalie starts nearer the middle while the puck begins off-centre.']).map(cue => <li key={cue}>{cue}</li>)}</ul></div>
          <fieldset className="rs-actions"><legend>What would you do?</legend>{actions.map(action => <button type="button" key={action} aria-pressed={chosenAction === action} onClick={() => setChosenAction(action)}><b>{actionCopy[action].label}</b><span>{actionCopy[action].detail}</span></button>)}</fieldset>
          <label className="rs-reason">{firstReasonLabel}<textarea rows={isYoung ? 2 : 4} maxLength="600" value={firstReason} onChange={event => setFirstReason(event.target.value)} placeholder={copy.firstReasonPlaceholder || 'Name the defender, lane, support or goalie cue that shaped your choice.'} /><small>{firstReason.length}/600</small></label>
          {isYoung && <p className="rs-hint">A few words are enough. You can say your reason to a coach and have them type it.</p>}
          <button type="button" className="rs-primary" onClick={submitReadOne}>Play my choice →</button>
          <details className="rs-rubric"><summary>For the coach</summary><p>{copy.firstDiscussion || 'The shot route is only partly covered and F2’s alignment is not perfect. Timing and the reason can make different actions defensible. A pass just because it is a 2-on-1, or a shot treated as a guaranteed goal, misses the read.'}</p></details>
        </>}

        {(session.phase === 'consequence-1' || session.phase === 'replay-1') && <div className="rs-playing" role="status"><p className="rs-step">YOUR {actionNoun.toUpperCase()} IS CHANGING THE PLAY</p><h2 ref={phaseHeading} tabIndex="-1">Watch where the players and puck move.</h2><p>{consequenceText}</p>{reducedMotion && <small>Reduced-motion mode moves directly to the next freeze.</small>}</div>}

        {session.phase === 'read-2' && <>
          <p className="rs-step">READ 2 · {isYoung ? 'LOOK AGAIN' : 'TIMING & SPACE'}</p><h2 ref={phaseHeading} tabIndex="-1">{readTwo.prompt}</h2><div className="rs-cue-card"><b>{isYoung ? 'What changed?' : 'Re-scan now'}</b><p>{readTwo.cue}</p></div>
          <div className="rs-target-list">{displayTargets.map((target, index) => <button type="button" key={target.id} onClick={() => chooseTarget(target.id)}><span>{index + 1}</span><b>{target.label}</b><small>{target.kind === 'receiver' ? 'Tap receiver' : 'Tap space'}</small></button>)}</div>
          <p className="rs-hint">Tap a numbered marker on the rink or use these matching buttons.</p>
        </>}

        {session.phase === 'consequence-2' && <div className="rs-playing" role="status"><p className="rs-step">WATCH YOUR NEXT CHOICE</p><h2 ref={phaseHeading} tabIndex="-1">{selectedText?.label}</h2><p>{selectedText?.summary}</p></div>}

        {session.phase === 'read-3' && <>
          <p className="rs-step">READ 3 · HELP WITHOUT THE PUCK</p><h2 ref={phaseHeading} tabIndex="-1">{thirdPrompt}</h2>
          <div className="rs-cue-card"><b>{isYoung ? 'Help your team' : 'Keep the whole picture'}</b><p>{thirdCue}</p></div>
          <p className="rs-hint">{routeMode ? 'Use the route controls below the rink to add points, undo a turn, or preview your plan.' : boardView === '3d' ? 'Tap the ice where the highlighted player should go, or use the position controls below. The tactical board also supports dragging and arrow keys.' : 'Drag the highlighted player, tap the ice, use arrow keys, or adjust the coordinates.'}</p>
          {movingActor && !routeMode && <div className="rs-coordinate-row"><label>Rink length<RinkCoordinateInput step=".5" value={Number(movingActor.x.toFixed(1))} resetKey={`${session.scenarioId}:${session.second.targetId}:${movingActor.id}`} onCommit={x => moveActor({ x, y: movingActor.y })} /></label><label>Rink width<RinkCoordinateInput step=".5" value={Number(movingActor.y.toFixed(1))} resetKey={`${session.scenarioId}:${session.second.targetId}:${movingActor.id}`} onCommit={y => moveActor({ x: movingActor.x, y })} /></label></div>}
          <label className="rs-reason">{routeMode ? 'What lane or space are you trying to use?' : 'Why does this position help?'}<textarea rows={isYoung ? 2 : 4} maxLength="600" value={thirdReason} onChange={event => setThirdReason(event.target.value)} placeholder={copy.thirdReasonPlaceholder || 'Explain the lane or space this creates, protects or keeps available.'} /><small>{thirdReason.length}/600</small></label>
          <button type="button" className="rs-primary" onClick={finish}>Finish the three reads →</button>
        </>}

        {session.phase === 'complete' && <>
          <p className="rs-step">THREE READS COMPLETE · DRAFT FOR COACH REVIEW</p><h2 ref={phaseHeading} tabIndex="-1">Your three reads</h2>
          <div className="rs-summary"><section><span>1</span><div><b>{actionCopy[session.first.action].label}</b><p>{session.first.reason}</p></div></section><section><span>2</span><div><b>{selectedText.label}</b><p>{selectedText.summary}</p></div></section><section><span>3</span><div><b>{movingLabel} moved</b><p>{session.third.reason}</p></div></section></div>
          <div className="rs-evidence"><b>{session.localEvidence.heading}</b><ul>{session.localEvidence.observations.map(observation => <li key={observation}>{observation}</li>)}</ul><p>{session.localEvidence.note}</p></div>
          {finalJudgePayload && <section className="rs-final-ai"><p className="rs-step">OPTIONAL AI OPINION · FINAL READ ONLY</p><h3>Review my final positioning</h3><p>The AI coach reviews only the board after read two, your final support move and your explanation. It runs only when you press the button.</p><AIReviewPanel key={`${session.first.action}:${session.second.targetId}:${session.third.point.x}:${session.third.point.y}`} question={finalJudgePayload.question} attempt={finalJudgePayload.attempt} /></section>}
          {route && <p className="rs-hint">Your route and explanation are saved for a coach discussion. There is no automatic route grade or AI route review.</p>}
          <p className="rs-saved-note">Saved on this device for this player scope. No score or mastery mark was added.</p>
          <div className="rs-complete-actions"><button type="button" className="rs-primary" onClick={replay}>Replay my first choice</button><button type="button" onClick={() => { try { downloadReflection(session); setNotice('Reflection downloaded without a player identity or score.'); } catch (error) { setNotice(error.message); } }}>Download reflection</button><button type="button" onClick={reset}>Try a new branch</button></div>
        </>}
        {notice && <p className="rs-notice" role="status">{notice}</p>}
      </aside>
    </div>
    {session.phase === 'complete' && <ReadSequenceRecall key={`${storageKey}:recall`} session={session} playerId={playerId} draftAccess={recallDraftAccess} renderBoard={(state, description) => <RinkStage state={state} definition={definition} description={description} />} />}
    {isU11 && session.phase === 'complete' && <ChangedCueComparison key={storageKey} session={session} onSave={setSession} />}
    <SourceNotes definition={definition} />
  </section>;
}

export default function ReadSequence({ playerId = null } = {}) {
  const [scenarioId, setScenarioId] = useState(U11_READ_SEQUENCE.id);
  const drafts = useRef(new Map());
  const recallDrafts = useRef(new Map());
  const draftKey = getReadSequenceStorageKey(playerId, scenarioId);
  const rememberDraft = useMemo(() => draft => drafts.current.set(draftKey, draft), [draftKey]);
  const recallDraftAccess = useMemo(() => ({ get: () => recallDrafts.current.get(draftKey), remember: draft => recallDrafts.current.set(draftKey, draft), clear: () => recallDrafts.current.delete(draftKey) }), [draftKey]);
  const definition = getReadSequenceDefinition(scenarioId);
  return <div className="rs-root" data-age={definition.ageBand}>
    <nav className="rs-age-picker" aria-label="Connected reads age group"><span>CHOOSE YOUR READ</span><div>{READ_SEQUENCE_CATALOG.map(item => <button type="button" key={item.id} aria-pressed={scenarioId === item.id} aria-label={`${item.ageBand} connected reads`} onClick={() => setScenarioId(item.id)}>{item.ageBand}<small>{item.ui?.ageLabel || (item.ageBand === 'U9' ? 'Find space' : 'Read the pressure')}</small></button>)}</div><p>Completed reflections save separately for each age on this device.</p></nav>
    <ReadSequenceLesson key={draftKey} playerId={playerId} definition={definition} scratch={drafts.current.get(draftKey)} rememberDraft={rememberDraft} recallDraftAccess={recallDraftAccess} />
  </div>;
}
