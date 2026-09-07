import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import examples from './coach-question-examples.json';
import { createDraft, sampleDraft } from './director.js';
import { actorDisplayName } from '../visuals/actorLabel.js';
import { resizeQuestionTeam, setQuestionGoalie, setQuestionPuckOwner } from './coachQuestionSetup.js';
import { NHL_200X85_PROFILE } from '../scenario-engine/rinkFrame.js';
import { HockeyPlayerArt } from '../visuals/HockeyPlayerArt.jsx';
import BoardInspection from '../visuals/BoardInspection.jsx';
import ScenarioRinkView from '../visuals/ScenarioRinkView.jsx';
import RinkActorAnswer from '../visuals/RinkActorAnswer.jsx';
import { isFocusedActor, SvgPlayerLocator } from '../visuals/PlayerLocator.jsx';
import { SvgPuckLocator } from '../visuals/PuckLocator3D.jsx';
import { judgePracticeAttempt } from './judgeClient.js';
import { COACH_ACTIONS, COACH_AGES, clampCoachPoint, coachReferenceReady, compareCoachAttempt, createCoachQuestion, createLearnerAttempt, editQuestionActor, moveLearnerActor, readSavedCoachQuestions, reviseCoachQuestion, saveCoachReference, submitLearnerAttempt, validateCoachQuestion } from './coachQuestionCore.js';
import './CoachQuestionLab.css';
const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

const READY_EXAMPLES = examples.filter(question => validateCoachQuestion(question).length === 0);
const ACTION_LABELS = { shoot: 'Shoot', pass: 'Pass', carry: 'Carry' };
const REASONS = ['Protect the middle.', 'Create a clear passing option.', 'Use the open space.', 'Keep possession.'];
const PRESETS = [
  { label: 'Protect the middle', prompt: 'Where would you put your players to protect the middle?' },
  { label: 'Offer support', prompt: 'Where would you move to give the puck carrier a clear option?' },
  { label: 'Choose the next action', prompt: 'Would you shoot, pass or carry here? Explain your choice.', type: 'action' },
];
const copy = value => structuredClone(value);
const goalX = NHL_200X85_PROFILE.landmarks.goalLineRight[0];
const HALF_RINK = 'M 0 -12.954 H 21.9456 A 8.5344 8.5344 0 0 1 30.48 -4.4196 V 4.4196 A 8.5344 8.5344 0 0 1 21.9456 12.954 H 0 Z';

// A display crop only: retain both snapshots, the attempt, full rink width and goal context.
function questionBoardBounds(drafts, half) {
  const frames = drafts.filter(Boolean).map(draft => sampleDraft(draft, 0));
  const actors = frames.flatMap(frame => frame.actors);
  const goalies = actors.filter(actor => actor.role === 'goalie');
  if (!half && !goalies.length) return [-32, -14.5, 64, 29];
  const points = [...actors, ...frames.map(frame => frame.puck)];
  let left = Math.min(...points.map(point => point.x)) - 3.5;
  let right = Math.max(...points.map(point => point.x)) + 3.5;
  if (half || goalies.some(actor => actor.x >= 0)) { right = 32; left = Math.min(left, 7.2); }
  if (!half && goalies.some(actor => actor.x < 0)) { left = -32; right = Math.max(right, -7.2); }
  left = Math.max(half ? -1.5 : -32, Math.min(left, right - 27));
  right = Math.min(32, right);
  return [left, -14.5, right - left, 29];
}

function questionBoardLabels(actors, puck, bounds, young, focusActorId) {
  const labels = [], fontSize = Math.max(1.16, bounds[2] * .044);
  const overlaps = (a, b) => Math.abs(a.x - b.x) < (a.width + b.width) / 2 + .2 && Math.abs(a.y - b.y) < (a.height + b.height) / 2 + .2;
  for (const actor of actors) {
    if (young && !isFocusedActor(actor, focusActorId)) continue;
    const text = actor.label;
    const width = Math.max(2.1, text.length * fontSize * .62 + .65), height = fontSize * 1.4;
    const offsets = [[0, -2.2], [0, 2.2], [-width / 2 - 1.65, 0], [width / 2 + 1.65, 0], [0, -4], [0, 4], [-3, -3.5], [3, 3.5], [-3, 3.5], [3, -3.5]];
    const candidates = offsets.map(([dx, dy]) => ({ x: Math.max(bounds[0] + width / 2 + .25, Math.min(bounds[0] + bounds[2] - width / 2 - .25, actor.x + dx)), y: Math.max(-13.7 + height / 2, Math.min(13.7 - height / 2, actor.y + dy)), width, height }));
    const obstacles = [...labels, ...actors.map(item => ({ ...item, width: young ? 3.5 : 2.5, height: young ? 3.5 : 2.5 })), { ...puck, width: 1.2, height: 1.2 }];
    const score = candidate => obstacles.reduce((sum, obstacle) => sum + (overlaps(candidate, obstacle) ? 1 : 0), 0);
    const box = candidates.reduce((best, candidate) => score(candidate) < score(best) ? candidate : best);
    const distance = Math.hypot(box.x - actor.x, box.y - actor.y) || 1;
    const edge = Math.min(1, (young ? 1.85 : 1.35) / distance);
    labels.push({ ...box, id: actor.id, text, actor, fontSize, leaderX: actor.x + (box.x - actor.x) * edge, leaderY: actor.y + (box.y - actor.y) * edge });
  }
  return labels;
}

export function AIReviewPanel({ question, attempt }) {
  const [busy, setBusy] = useState(false), [review, setReview] = useState(null);
  const controller = useRef(null), resultRef = useRef(null);
  useEffect(() => { if (review) resultRef.current?.focus({ preventScroll: true }); }, [review]);
  useEffect(() => () => controller.current?.abort(), []);
  async function requestReview() {
    controller.current?.abort(); controller.current = new AbortController();
    setBusy(true); setReview(null);
    const result = await judgePracticeAttempt({
      question: { prompt: question.prompt, ageBand: question.ageBand, sourceRef: { note: question.sourceRef.note }, coachExplanation: question.coachExplanation, expectedAction: question.expectedAction, type: question.type, initialDraft: question.initialDraft, referenceDraft: question.referenceDraft, ...(question.rubric ? { rubric: question.rubric } : {}) },
      attempt: { draft: attempt.draft, reason: attempt.reason, action: attempt.action },
    }, { signal: controller.current.signal });
    if (controller.current.signal.aborted) return;
    setReview(result); setBusy(false);
  }
  const judgment = review?.ok ? review.judgment : null;
  const verdict = { sound: 'Sound reasoning', 'needs-work': 'Revisit this cue', 'plausible-alternative': 'A plausible alternative', 'needs-coach-review': 'Coach review needed' }[judgment?.verdict];
  return <section className="cq-ai-review"><h4>A second look at the reasoning</h4><p>Ask the AI coach for another look at your choice and what you noticed.</p><button onClick={requestReview} disabled={busy}>{busy ? 'Reviewing the read…' : 'Ask AI coach'}</button>
    {review && <div role="status" ref={resultRef} tabIndex={-1}>{judgment ? <><p className="cq-eyebrow">AI COACH · {verdict || 'REVIEW'}</p><strong>{typeof judgment.headline === 'string' ? judgment.headline : ''}</strong><p>{typeof judgment.explanation === 'string' ? judgment.explanation : ''}</p><p><b>Key cue:</b> {typeof judgment.cue === 'string' ? judgment.cue : ''}</p><p><b>Next question:</b> {typeof judgment.nextQuestion === 'string' ? judgment.nextQuestion : ''}</p></> : <p>{'The AI coach cannot review this right now. Your choice is still here.'}</p>}</div>}
  </section>;
}

function RubricEditor({ question, onChange }) {
  const rubric = question.rubric;
  const update = patch => onChange({ ...rubric, ...patch });
  return <details className="cq-rubric-editor"><summary>Observation criteria · optional</summary><p>Give the coach or AI reviewer the cues that matter. Open reads can support more than one action.</p>{rubric ? <>
    <label>READ TYPE<select value={rubric.mode} onChange={event => update({ mode: event.target.value })}><option value="forced">One constrained read</option><option value="open">More than one defensible read</option></select></label>
    <label>WHAT SHOULD THE PLAYER NOTICE? · ONE CUE PER LINE<textarea rows="3" value={rubric.mustNotice.join('\n')} onChange={event => update({ mustNotice: event.target.value.split('\n') })} /></label>
    {question.type === 'action' && <div><p className="cq-eyebrow">ACTIONS WORTH DISCUSSING · SELECT ALL THAT APPLY</p><div className="cq-action-choices">{COACH_ACTIONS.map(action => <button key={action} aria-pressed={rubric.acceptableActions.includes(action)} onClick={() => update({ acceptableActions: rubric.acceptableActions.includes(action) ? rubric.acceptableActions.filter(value => value !== action) : [...rubric.acceptableActions, action] })}>{ACTION_LABELS[action]}</button>)}</div></div>}
    <label>REASONING TO REVISIT · ONE CUE PER LINE<textarea rows="2" value={rubric.avoid.join('\n')} onChange={event => update({ avoid: event.target.value.split('\n') })} /></label>
    <label>WHAT SHOULD THE PLAYER READ NEXT?<input value={rubric.followUpCue} onChange={event => update({ followUpCue: event.target.value })} /></label><button onClick={() => onChange(undefined)}>Remove observation criteria</button>
  </> : <button onClick={() => onChange({ mode: 'open', mustNotice: [], acceptableActions: question.type === 'action' && question.expectedAction ? [question.expectedAction] : [], avoid: [], followUpCue: '' })}>Add observation criteria</button>}</details>;
}

export function QuestionBoard({ draft, snapshotState, title, selected, focusActorId, onSelect, onMove, editableTeam, allowedActorIds, selectableIds = [], onActorAnswer, onAvailabilityChange, view = 'full', young = false, showFacing = !young, ghostDraft, framingDrafts = [], initialFraming = 'closer', inspectable = false, sceneView = false }) {
  const svg = useRef(null), drag = useRef(null);
  const available = useRef(!sceneView), mounted = useRef(true), availabilityCallback = useRef(onAvailabilityChange);
  availabilityCallback.current = onAvailabilityChange;
  const [sceneAvailable, setSceneAvailable] = useState(!sceneView);
  const reportAvailability = useCallback(value => { if (!mounted.current) return; available.current = value === true; setSceneAvailable(value === true); availabilityCallback.current?.(value === true); }, []);
  useBrowserLayoutEffect(() => { mounted.current = true; reportAvailability(!sceneView); return () => { mounted.current = false; available.current = false; }; }, [sceneView, reportAvailability]);
  const [framing, setFraming] = useState(initialFraming), [dragBounds, setDragBounds] = useState(null);
  const instance = useId().replaceAll(':', '');
  // Snapshot callers already own exact actor/puck coordinates, including an
  // unowned puck in flight. Ordinary authoring still samples the director.
  const frame = snapshotState ?? sampleDraft(draft, 0);
  const half = view === 'half-right';
  const bounds = dragBounds || (framing === 'whole' ? [half ? -1.5 : -32, -14.5, half ? 34 : 64, 29] : questionBoardBounds([draft, ghostDraft, ...framingDrafts], half));
  const labels = questionBoardLabels(frame.actors, frame.puck, bounds, young, focusActorId);
  const canMove = actor => !!onMove && (!sceneView || available.current) && (!allowedActorIds || allowedActorIds.includes(actor.id)) && (editableTeam === 'all' || actor.team === editableTeam);
  function point(event) {
    const matrix = svg.current?.getScreenCTM();
    if (!matrix) return null;
    const p = svg.current.createSVGPoint(); p.x = event.clientX; p.y = event.clientY;
    const mapped = p.matrixTransform(matrix.inverse());
    return clampCoachPoint(half ? Math.max(.65, mapped.x) : mapped.x, mapped.y);
  }
  function begin(event, actor) {
    if (!canMove(actor) || event.button !== 0) return;
    event.preventDefault(); event.stopPropagation(); onSelect?.(actor.id);
    setDragBounds(bounds);
    drag.current = { id: actor.id, pointerId: event.pointerId };
    svg.current.setPointerCapture(event.pointerId);
  }
  function stop(event) {
    if (drag.current && svg.current?.hasPointerCapture(event.pointerId)) svg.current.releasePointerCapture(event.pointerId);
    drag.current = null;
    setDragBounds(null);
  }
  function keyboard(event, actor) {
    if (!canMove(actor)) return;
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect?.(actor.id); return; }
    const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
    if (!direction) return;
    event.preventDefault(); onSelect?.(actor.id);
    const increment = event.shiftKey ? .1 : .5;
    const x = actor.x + direction[0] * increment;
    onMove(actor.id, clampCoachPoint(half ? Math.max(.65, x) : x, actor.y + direction[1] * increment));
  }
  const tacticalBoard = <>
    {inspectable && <div className="cq-board-framing" role="group" aria-label={`${title} framing`}><button type="button" aria-pressed={framing === 'closer'} onClick={() => setFraming('closer')}>Closer view</button><button type="button" aria-pressed={framing === 'whole'} onClick={() => setFraming('whole')}>{half ? 'Whole half rink' : 'Whole rink'}</button></div>}
    <svg ref={svg} viewBox={bounds.join(' ')} role={onMove || onActorAnswer ? 'group' : 'img'} aria-label={title}
      onPointerDown={event => { const actor = frame.actors.find(item => item.id === selected); if (actor && canMove(actor)) { const p = point(event); if (p) onMove(actor.id, p); } }}
      onPointerMove={event => { if (drag.current?.pointerId === event.pointerId) { const p = point(event); if (p) onMove?.(drag.current.id, p); } }}
      onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={() => { drag.current = null; setDragBounds(null); }} style={{ touchAction: onMove ? 'none' : 'auto' }}>
      <title>{title}</title><desc>Navy players are home. Gold players are away. The puck is the small dark dot. {onMove ? 'Choose a player and use arrow keys to move, or use the labelled coordinate controls.' : ''}</desc>
      <defs>
        <linearGradient id={`cq-ice-${instance}`} x1="0" x2="1" y1="0" y2="1"><stop stopColor="#F7FCFF" /><stop offset="1" stopColor="#EAF5FC" /></linearGradient>
        <filter id={`cq-depth-${instance}`} x="-10%" y="-15%" width="120%" height="135%"><feDropShadow dx="0" dy=".3" stdDeviation=".2" floodColor="#071528" floodOpacity=".5" /></filter>
        {half ? <path id={`cq-surface-${instance}`} d={HALF_RINK} /> : <rect id={`cq-surface-${instance}`} x="-30.48" y="-12.954" width="60.96" height="25.908" rx="8.5344" />}
      </defs>
      <g pointerEvents="none" filter={`url(#cq-depth-${instance})`}>
        <use href={`#cq-surface-${instance}`} fill="#F7FCFF" stroke="#0B1A33" strokeWidth=".78" />
        <use href={`#cq-surface-${instance}`} fill="none" stroke="#B6CDE0" strokeWidth=".35" />
        <use href={`#cq-surface-${instance}`} fill={`url(#cq-ice-${instance})`} stroke="#FFFFFF" strokeWidth=".12" />
      </g>
      <g stroke="#D3233E" strokeWidth=".09" fill="none" pointerEvents="none">{(half ? [1] : [-1, 1]).map(side => <g key={side} transform={`scale(${side} 1)`}>
        {[-6.2484, 6.2484].map(y => <g key={y}><circle cx="21.0312" cy={y} r="4.57" /><circle cx="21.0312" cy={y} r=".18" fill="#D3233E" /></g>)}
        <line x1={goalX} y1="-10" x2={goalX} y2="10" /><path d={`M ${goalX} -1.829 A 1.829 1.829 0 0 0 ${goalX} 1.829 Z`} fill="#8DC5ED" fillOpacity=".65" stroke="#1E63B5" />
        <path d={`M ${goalX} -1.05 H ${goalX + 1.05} V 1.05 H ${goalX}`} fill="#FFFFFF99" stroke="#D3233E" strokeWidth=".17" />
        <path d={`M ${goalX + .35} -1 V 1 M ${goalX + .7} -1 V 1 M ${goalX} -.5 H ${goalX + 1.05} M ${goalX} .5 H ${goalX + 1.05}`} stroke="#7893A8" strokeWidth=".045" />
      </g>)}{!young && !half && <><line x1="0" y1="-12.954" x2="0" y2="12.954" strokeWidth=".15" /><circle r="4.57" stroke="#1E63B5" />{[-7.9248, 7.9248].map(x => <line key={x} x1={x} x2={x} y1="-12.954" y2="12.954" stroke="#1E63B5" strokeWidth=".22" />)}</>}</g>
      {ghostDraft && sampleDraft(ghostDraft, 0).actors.filter(actor => editableTeam === 'all' || actor.team === editableTeam).map(actor => <g key={`ghost-${actor.id}`} transform={`translate(${actor.x} ${actor.y})`} opacity=".65" pointerEvents="none"><circle r="1.06" stroke="#957322" fill="none" strokeWidth=".19" strokeDasharray=".23 .16" /><path d="M -.35 0 H .35 M 0 -.35 V .35" stroke="#957322" strokeWidth=".12" /></g>)}
      {frame.actors.map(actor => {
        const selectable = selectableIds.includes(actor.id) && typeof onActorAnswer === 'function';
        const Target = selectable ? RinkActorAnswer : 'g';
        return <Target key={actor.id} {...(selectable ? { as: 'g', actorId: actor.id, onAnswer: onActorAnswer } : {})} transform={`translate(${actor.x} ${actor.y})`} role={canMove(actor) ? 'button' : undefined} tabIndex={canMove(actor) ? 0 : undefined} aria-label={selectable ? `Choose ${actor.label || actor.id} on rink` : `${actor.label}, ${actor.team} ${actor.role}${canMove(actor) ? '. Arrow keys move this player.' : ''}`} onFocus={() => canMove(actor) && onSelect?.(actor.id)} onKeyDown={event => keyboard(event, actor)} onPointerDown={event => { event.stopPropagation(); begin(event, actor); }} className={canMove(actor) || selectable ? 'cq-movable' : ''}>
        {isFocusedActor(actor, focusActorId) ? <SvgPlayerLocator radius={young ? 1.95 : 1.5} label={actor.label || actor.id} /> : actor.id === selected && <circle r={young ? 1.9 : 1.45} fill="none" stroke="#6D91AC" strokeWidth=".12" strokeDasharray=".22 .14" />}
        <circle r={young ? 1.75 : 1.25} fill="transparent" />
        <HockeyPlayerArt radius={young ? 1.65 : 1.16} team={actor.team} goalie={actor.role === 'goalie'} facing={showFacing ? actor.facing * 180 / Math.PI : null} />
        {showFacing && <path d="M .25 0 H 1.28 M .97 -.19 L 1.28 0 L .97 .19" transform={`rotate(${actor.facing * 180 / Math.PI})`} fill="none" stroke={actor.team === 'home' ? '#f5efe6' : '#0B1A33'} strokeWidth=".15" pointerEvents="none" />}
      </Target>; })}
      {labels.map(label => <g key={`label-${label.id}`} pointerEvents="none" className="cq-actor-label">
        <line x1={label.leaderX} y1={label.leaderY} x2={label.x} y2={label.y} stroke="#0B1A33" strokeOpacity=".5" strokeWidth=".07" />
        <rect x={label.x - label.width / 2} y={label.y - label.height / 2} width={label.width} height={label.height} rx=".35" fill={label.text === 'YOU' ? '#0B1A33' : '#F7FCFF'} stroke={label.actor.team === 'away' ? '#B98C30' : '#0B1A33'} strokeWidth=".07" />
        <text x={label.x} y={label.y} dy=".35em" textAnchor="middle" fontSize={label.fontSize} fontWeight="800" fill={label.text === 'YOU' ? '#FFFFFF' : '#0B1A33'}>{label.text}</text>
      </g>)}
      <SvgPuckLocator x={frame.puck.x} y={frame.puck.y} />
    </svg></>;
  const editableIds = frame.actors.filter(canMove).map(actor => actor.id);
  const sceneState = { actors: frame.actors.map(actor => ({ ...actor, name: actor.label, facing: showFacing ? actor.facing : null })), puck: frame.puck };
  return <figure className="cq-board"><figcaption><strong>{title}</strong><span>{onMove ? sceneView ? 'Select a player · tap ice · coordinate controls' : 'Drag · select and tap ice · arrow keys' : 'Authored snapshot'}</span></figcaption>
    {sceneView ? <ScenarioRinkView state={sceneState} focusActorId={focusActorId} title={title} onAvailabilityChange={reportAvailability}
      bounds={{ minX: bounds[0], maxX: bounds[0] + bounds[2], minY: bounds[1], maxY: bounds[1] + bounds[3] }}
      teamLabels={{ home: 'Home', away: 'Away' }} hideZoneLines={young} labelledActors={!young} showBothGoals={!half} selectedActorId={selected} editableIds={editableIds}
      selectableIds={sceneAvailable ? selectableIds : []} onActorAnswer={onActorAnswer ? (...args) => { if (available.current) onActorAnswer(...args); } : undefined}
      onSelect={onSelect ? id => { if (available.current && editableIds.includes(id)) onSelect(id); } : undefined}
      onMove={onMove ? (id, point) => { const actor = frame.actors.find(item => item.id === id); if (actor && canMove(actor)) onMove(id, clampCoachPoint(half ? Math.max(.65, point.x) : point.x, point.y)); } : undefined}
      overlays={{ ghosts: ghostDraft ? sampleDraft(ghostDraft, 0).actors.filter(actor => editableTeam === 'all' || actor.team === editableTeam).map(({ id, x, y }) => ({ id, x, y })) : [] }} /> : tacticalBoard}
    <div className="cq-legend"><span><i className="cq-home-mark" />Home · navy</span><span><i className="cq-away-mark" />Away · gold</span><span>● Puck</span>{ghostDraft && <span>◌ Dashed rings · coach reference</span>}</div>
    {inspectable && <BoardInspection title={title} renderBoard={() => <QuestionBoard sceneView draft={draft} snapshotState={snapshotState} title={title} selected={selected} focusActorId={focusActorId} editableTeam={editableTeam} view={view} young={young} showFacing={showFacing} ghostDraft={ghostDraft} framingDrafts={framingDrafts} initialFraming={framing} />} />}
  </figure>;
}

function download(question) {
  const errors = validateCoachQuestion(question);
  if (errors.length) throw new Error(errors.join('; '));
  const url = URL.createObjectURL(new Blob([JSON.stringify(question, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = `${question.id.replace(/[^a-z0-9-]/gi, '-')}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function CoachQuestionLab({ initialDraft, onOpenDirector, playerId = 'practice-preview' }) {
  const initialQuestion = () => initialDraft ? createCoachQuestion(initialDraft) : copy(READY_EXAMPLES.find(question => question.ageBand === 'U11') || createCoachQuestion());
  const [question, setQuestion] = useState(initialQuestion);
  const questionRef = useRef(question), incoming = useRef(initialDraft);
  const [age, setAge] = useState(question.ageBand), [snapshot, setSnapshot] = useState('referenceDraft');
  const [phase, setPhase] = useState(() => coachReferenceReady(question) ? 'learn' : 'coach');
  const [attempt, setAttempt] = useState(() => coachReferenceReady(question) ? createLearnerAttempt(question) : null);
  const [selected, setSelected] = useState(question.initialDraft.actors.find(actor => actor.team === question.controlledTeam)?.id);
  const [notice, setNotice] = useState(''), [ghost, setGhost] = useState(false), [saved, setSaved] = useState([]);
  const [rinkAvailable, setRinkAvailable] = useState(false), [boardVersion, setBoardVersion] = useState(0);
  const rinkAvailableRef = useRef(false);
  const boardIdentity = `${question.id}:${phase}:${snapshot}:${boardVersion}`;
  const boardIdentityRef = useRef(boardIdentity); boardIdentityRef.current = boardIdentity;
  const onRinkAvailability = useCallback(value => {
    if (boardIdentityRef.current !== boardIdentity) return;
    rinkAvailableRef.current = value === true; setRinkAvailable(value === true);
  }, [boardIdentity]);
  const invalidateRink = useCallback(() => { rinkAvailableRef.current = false; setRinkAvailable(false); setBoardVersion(value => value + 1); }, []);
  const promptHeading = useRef(null);
  const saveKey = `rinkreads_coach_questions_v1:${playerId}`;
  const attemptKey = `rinkreads_coach_attempts_v1:${playerId}`;
  const previousPlayer = useRef(playerId);
  const loadQuestion = useCallback((next, learner = false) => {
    const errors = validateCoachQuestion(next, { requireReady: false });
    if (errors.length) throw new Error(errors.join('; '));
    invalidateRink();
    const value = copy(next); questionRef.current = value; setQuestion(value); setAge(value.ageBand);
    setSelected(value.initialDraft.actors.find(actor => actor.team === value.controlledTeam)?.id);
    setSnapshot(learner ? 'referenceDraft' : 'initialDraft'); setGhost(false); setNotice('');
    setAttempt(learner && coachReferenceReady(value) ? createLearnerAttempt(value) : null);
    setPhase(learner && coachReferenceReady(value) ? 'learn' : 'coach');
  }, [invalidateRink]);
  useEffect(() => { try { setSaved(readSavedCoachQuestions(localStorage.getItem(saveKey))); } catch { setSaved([]); } }, [saveKey]);
  useEffect(() => { if (incoming.current !== initialDraft && initialDraft) { incoming.current = initialDraft; loadQuestion(createCoachQuestion(initialDraft)); } }, [initialDraft, loadQuestion]);
  useEffect(() => { if (previousPlayer.current !== playerId) { previousPlayer.current = playerId; setAttempt(null); setPhase('coach'); } }, [playerId]);
  useEffect(() => { if (phase !== 'coach') promptHeading.current?.focus(); }, [phase]);

  function mutate(fn) {
    try { const next = fn(questionRef.current); questionRef.current = next; setQuestion(next); setAttempt(null); setPhase('coach'); setNotice(''); }
    catch (error) { setNotice(error.message); }
  }
  function patch(values) { mutate(current => reviseCoachQuestion(current, values)); }
  function configureSetup(update) {
    mutate(update);
    setSnapshot('initialDraft');
    if (!questionRef.current.initialDraft.actors.some(actor => actor.id === selected)) setSelected(questionRef.current.initialDraft.actors[0]?.id);
  }
  function moveActor(id, point) {
    if (!rinkAvailableRef.current) return;
    const bounded = { ...clampCoachPoint(question.view === 'half-right' ? Math.max(.65, point.x) : point.x, point.y), ...(Number.isFinite(point.facing) ? { facing: point.facing } : {}) };
    if (phase === 'coach') mutate(current => editQuestionActor(current, snapshot, id, bounded));
    else try { setAttempt(moveLearnerActor(questionRef.current, attempt, id, bounded)); setNotice(''); } catch (error) { setNotice(error.message); }
  }
  function beginAttempt() {
    try { const next = createLearnerAttempt(questionRef.current); invalidateRink(); setAttempt(next); setSelected(question.initialDraft.actors.find(actor => actor.team === question.controlledTeam)?.id); setPhase('learn'); setNotice(''); }
    catch (error) { setNotice(error.message); }
  }
  function saveReference() {
    try {
      const next = saveCoachReference(questionRef.current); questionRef.current = next; setQuestion(next);
      const records = [next, ...saved.filter(item => item.id !== next.id)].slice(0, 40);
      setSaved(records); localStorage.setItem(saveKey, JSON.stringify(records)); setNotice('Coach reference saved on this device. The learner can now try the question.');
    } catch (error) { setNotice(error.message); }
  }
  function compare() {
    if (!rinkAvailableRef.current) return;
    try {
      const submitted = submitLearnerAttempt(question, attempt); setAttempt(submitted); setPhase('compare'); setNotice('');
      try { const raw = JSON.parse(localStorage.getItem(attemptKey)); const records = Array.isArray(raw) ? raw.filter(item => item?.version === 'rinkreads-coach-attempt-v1') : []; localStorage.setItem(attemptKey, JSON.stringify([submitted, ...records].slice(0, 40))); }
      catch { setNotice('Your comparison is available now; this browser could not save the attempt for later.'); }
    } catch (error) { setNotice(error.message); }
  }
  async function importQuestion(event) {
    const input = event.target;
    try { const file = input.files?.[0]; if (!file) return; if (file.size > 1_000_000) throw new Error('Choose a question file smaller than 1 MB.'); const value = JSON.parse(await file.text()); const errors = validateCoachQuestion(value); if (errors.length) throw new Error(errors.join('; ')); loadQuestion(value, coachReferenceReady(value)); setNotice('Question imported. Its source and reference status were preserved.'); }
    catch (error) { setNotice(error.message); } finally { input.value = ''; }
  }
  const ready = coachReferenceReady(question);
  const activeDraft = phase === 'coach' ? question[snapshot] : attempt?.draft || question.initialDraft;
  const selectedActor = activeDraft.actors.find(actor => actor.id === selected);
  const editableTeam = phase === 'coach' && snapshot === 'initialDraft' ? 'all' : question.controlledTeam;
  const editableActors = activeDraft.actors.filter(actor => editableTeam === 'all' || actor.team === editableTeam);
  const matchedReference = question.initialDraft.actors.every(actor => JSON.stringify(actor.keys) === JSON.stringify(question.referenceDraft.actors.find(item => item.id === actor.id)?.keys));
  const comparison = phase === 'compare' && attempt?.submitted ? compareCoachAttempt(question, attempt) : null;
  const young = ['U7', 'U9'].includes(question.ageBand);
  const examplesForAge = READY_EXAMPLES.filter(item => item.ageBand === age);
  const framingDrafts = [question.initialDraft, question.referenceDraft, attempt?.draft].filter(Boolean);

  return <section className="cq-root" aria-label="Coach questions">
    <header className="cq-header"><div><p className="cq-eyebrow">RINKREADS / COACH & PLAYER</p><h1>A question.<br /><em>Your read of the ice.</em></h1><p>Move the players. Explain the choice.<br />Compare your thinking with the coach’s reference.</p></div><button className="cq-primary" onClick={() => loadQuestion(createCoachQuestion(initialDraft || createDraft(5, 5), { ageBand: age }))}>+ Create a coach question</button></header>
    <div className="cq-library"><div className="cq-age-pills" aria-label="Scenario age">{COACH_AGES.map(value => <button key={value} aria-pressed={age === value} onClick={() => setAge(value)}>{value}</button>)}</div><div className="cq-example-cards">{examplesForAge.map(item => <button key={item.id} className={question.id === item.id ? 'active' : ''} onClick={() => loadQuestion(item, true)}><small>{item.type === 'position' ? 'MOVE THE PLAYERS' : 'CHOOSE THE ACTION'}</small><strong>{item.title}</strong><span>Try the scenario →</span></button>)}</div><div className="cq-library-tools"><label>YOUR SAVED QUESTIONS<select value="" aria-label="Reopen saved coach question" onChange={event => { const found = saved.find(item => item.id === event.target.value); if (found) loadQuestion(found, true); }}><option value="">Choose a saved question…</option>{saved.map(item => <option key={item.id} value={item.id}>{item.ageBand} · {item.title}</option>)}</select></label><label className="cq-import">Import question<input type="file" accept="application/json,.json" onChange={importQuestion} /></label></div></div>
    <div className="cq-workspace">
      <div className="cq-phase-bar"><div className="cq-phases"><span className={phase === 'coach' ? 'active' : ''}>1 · Coach question</span><span className={phase === 'learn' ? 'active' : ''}>2 · My attempt</span><span className={phase === 'compare' ? 'active' : ''}>3 · Compare</span></div><div>{phase !== 'coach' && <button onClick={() => { setPhase('coach'); setSelected(question.referenceDraft.actors.find(actor => actor.team === question.controlledTeam)?.id); }}>Edit coach question</button>}{phase === 'coach' && <button disabled={!ready} onClick={beginAttempt}>Try as the player →</button>}</div></div>
      <div className="cq-question-heading"><p className="cq-eyebrow">{question.ageBand} · {question.type === 'position' ? 'POSITIONING QUESTION' : 'ACTION QUESTION'}</p><h2 ref={promptHeading} tabIndex="-1">{phase === 'coach' ? question.title : question.prompt}</h2>{phase === 'coach' && <p className="cq-status">{question.status === 'example-for-coach-review' ? 'Ready-made example · editable reference awaiting coach review' : ready ? 'Coach-authored reference · not independently certified' : 'Coach draft · save the answer and explanation before a player starts'}</p>}</div>
      {phase === 'coach' && <div className="cq-author-fields"><label>QUESTION TITLE<input value={question.title} onChange={event => patch({ title: event.target.value })} /></label><label>AGE GROUP<select value={question.ageBand} onChange={event => { setAge(event.target.value); patch({ ageBand: event.target.value }); }}>{COACH_AGES.map(value => <option key={value}>{value}</option>)}</select></label><label>QUESTION TYPE<select value={question.type} onChange={event => patch({ type: event.target.value, expectedAction: null, rubric: undefined })}><option value="position">Where should the players go?</option><option value="action">Shoot, pass or carry?</option></select></label><label>PLAYER CONTROLS<select value={question.controlledTeam} onChange={event => { const team = event.target.value; patch({ controlledTeam: team, referenceDraft: copy(question.initialDraft) }); setSelected(question.initialDraft.actors.find(actor => actor.team === team)?.id); setNotice('Reference reset to the starting layout for the new controlled team.'); }}><option value="home">Home team · navy</option><option value="away">Away team · gold</option></select></label><label className="cq-wide">ASK A SIMPLE QUESTION<textarea rows="2" value={question.prompt} onChange={event => patch({ prompt: event.target.value })} /></label><div className="cq-prompt-presets"><span>Wording starters:</span>{PRESETS.map(preset => <button key={preset.label} onClick={() => patch({ prompt: preset.prompt, type: preset.type || 'position', expectedAction: null, rubric: undefined })}>{preset.label}</button>)}<small>These change the wording, not the answer.</small></div></div>}
      {phase === 'coach' && <section className="cq-setup" aria-label="Set up the ice">
        <div className="cq-setup-heading"><div><h3>Set up the ice</h3><p>Place every player, choose who has the puck, then build your question.</p></div><span>{question.initialDraft.actors.filter(actor => actor.role === 'skater').length} skaters · {question.initialDraft.actors.filter(actor => actor.role === 'goalie').length} goalies</span></div>
        <div className="cq-setup-fields">{[['home', 'Home · navy'], ['away', 'Away · gold']].map(([team, label]) => <div key={team}><label>{label}<select aria-label={`${team === 'home' ? 'Home' : 'Away'} skaters`} value={question.initialDraft.actors.filter(actor => actor.team === team && actor.role === 'skater').length} onChange={event => configureSetup(current => resizeQuestionTeam(current, team, Number(event.target.value)))}>{[1, 2, 3, 4, 5, 6].map(count => <option key={count} value={count}>{count} skater{count === 1 ? '' : 's'}</option>)}</select></label><label className="cq-goalie-toggle"><input type="checkbox" checked={question.initialDraft.actors.some(actor => actor.team === team && actor.role === 'goalie')} onChange={event => configureSetup(current => setQuestionGoalie(current, team, event.target.checked))} />Include {team} goalie</label></div>)}
          <label>Starts with the puck<select aria-label="Starts with the puck" value={question.initialDraft.puck.owner || ''} onChange={event => configureSetup(current => setQuestionPuckOwner(current, event.target.value))}>{!question.initialDraft.puck.owner && <option value="" disabled>Choose a skater</option>}{question.initialDraft.actors.filter(actor => actor.role === 'skater').map(actor => <option key={actor.id} value={actor.id}>{actorDisplayName(actor)}</option>)}</select></label>
        </div>
        <div className="cq-setup-actions"><button type="button" aria-pressed={snapshot === 'initialDraft'} onClick={() => setSnapshot('initialDraft')}>Position all players</button><button type="button" onClick={() => { mutate(current => reviseCoachQuestion(current, { referenceDraft: copy(current.initialDraft) })); setSnapshot('referenceDraft'); }}>Use this layout as reference →</button></div>
      </section>}
      {comparison ? <div className="cq-comparison"><div className="cq-compare-intro"><div><h3>Two positions. A conversation.</h3><p>Compare the two positions. What space or passing option does each one create?</p></div><label><input type="checkbox" checked={ghost} onChange={event => setGhost(event.target.checked)} /> Show reference rings on my board</label></div><div className="cq-side-by-side"><QuestionBoard inspectable sceneView framingDrafts={framingDrafts} draft={attempt.draft} title="My position" selected={null} view={question.view} young={young} showFacing={question.ageBand!=='U7'} editableTeam={question.controlledTeam} ghostDraft={ghost ? question.referenceDraft : undefined} /><QuestionBoard inspectable sceneView framingDrafts={framingDrafts} draft={question.referenceDraft} title="Coach reference" selected={null} view={question.view} young={young} showFacing={question.ageBand!=='U7'} /></div><div className="cq-reasons-compare"><section><p className="cq-eyebrow">MY THINKING</p>{question.type === 'action' && <h4>{ACTION_LABELS[comparison.learnerAction]}</h4>}<p>{comparison.learnerReason}</p></section><section><p className="cq-eyebrow">COACH REFERENCE</p>{question.type === 'action' && <h4>{ACTION_LABELS[comparison.referenceAction] || 'Consider the available actions'}</h4>}<p>{comparison.coachExplanation}</p></section></div><AIReviewPanel key={`${question.id}:${question.revision || 0}`} question={question} attempt={attempt} /><div className="cq-actions"><button className="cq-primary" onClick={beginAttempt}>Try a fresh attempt</button><button onClick={() => setPhase('coach')}>Edit the reference</button></div></div> : <>
        {phase === 'coach' && <div className="cq-snapshot-tabs" aria-label="Editable snapshot"><button aria-pressed={snapshot === 'initialDraft'} onClick={() => { setSnapshot('initialDraft'); }}>Starting positions</button><button aria-pressed={snapshot === 'referenceDraft'} onClick={() => { setSnapshot('referenceDraft'); setSelected(question.referenceDraft.actors.find(actor => actor.team === question.controlledTeam)?.id); }}>Coach reference</button><span>{snapshot === 'initialDraft' ? 'Set the situation. Other-team positions stay shared with the reference.' : 'Move the controlled team to your intended answer.'}</span></div>}
        {!rinkAvailable && <p role="status">Open the rink before moving players or comparing your answer. Your work stays here while it reloads.</p>}<div className="cq-edit-layout"><div><QuestionBoard key={boardIdentity} onAvailabilityChange={onRinkAvailability} inspectable sceneView initialFraming={phase === 'coach' && snapshot === 'initialDraft' ? 'whole' : 'closer'} framingDrafts={framingDrafts} draft={activeDraft} title={phase === 'coach' ? snapshot === 'initialDraft' ? 'Starting layout' : 'Coach’s reference answer' : 'My attempt · starting layout'} selected={selected} onSelect={setSelected} onMove={moveActor} editableTeam={editableTeam} view={question.view} young={young} showFacing={question.ageBand!=='U7'} />{phase === 'learn' && <p className="cq-help">Move the {question.controlledTeam} team. The other team stays in place. Select a player, then tap the ice, drag, or use the arrow keys.</p>}{phase === 'coach' && snapshot === 'referenceDraft' && matchedReference && <p className="cq-help">Your reference currently matches the starting layout. Move players, or explain why holding these positions is the intended answer.</p>}</div><aside className="cq-player-panel"><p className="cq-eyebrow">SELECT A PLAYER</p><div className="cq-roster">{editableActors.map(actor => <button key={actor.id} aria-pressed={selected === actor.id} onClick={() => setSelected(actor.id)}><i className={actor.team === 'home' ? 'cq-home-mark' : 'cq-away-mark'} /><span>{actorDisplayName(actor)}<small>{actor.team} · {actor.role}</small></span></button>)}</div>{phase === 'learn' && selectedActor && editableActors.some(actor => actor.id === selected) && <div className="cq-turn-controls" role="group" aria-label="Adjust your player" onKeyDown={event => { const delta = { ArrowLeft: [-.5, 0], ArrowRight: [.5, 0], ArrowUp: [0, -.5], ArrowDown: [0, .5] }[event.key]; if (delta) { event.preventDefault(); moveActor(selected, { x: selectedActor.keys[0].x + delta[0], y: selectedActor.keys[0].y + delta[1] }); } }}>{[['Back a little', -.5, 0], ['Forward a little', .5, 0], ['Across the ice ←', 0, -.5], ['Across the ice →', 0, .5]].map(([label, dx, dy]) => <button key={label} type="button" disabled={!rinkAvailable} onClick={() => moveActor(selected, { x: selectedActor.keys[0].x + dx, y: selectedActor.keys[0].y + dy })}>{label}</button>)}{question.ageBand === 'U9' && <><button type="button" disabled={!rinkAvailable} onClick={() => moveActor(selected, { ...selectedActor.keys[0], facing: selectedActor.keys[0].facing - Math.PI / 4 })}>Turn left ↶</button><button type="button" disabled={!rinkAvailable} onClick={() => moveActor(selected, { ...selectedActor.keys[0], facing: selectedActor.keys[0].facing + Math.PI / 4 })}>Turn right ↷</button></>}</div>}{phase === 'coach' && selectedActor && editableActors.some(actor => actor.id === selected) && <div className="cq-coordinates"><label>X · RINK LENGTH (m)<input disabled={!rinkAvailable} type="number" step=".5" value={Number(selectedActor.keys[0].x.toFixed(2))} onChange={event => { if (event.target.value !== '' && Number.isFinite(Number(event.target.value))) moveActor(selected, { x: Number(event.target.value), y: selectedActor.keys[0].y }); }} /></label><label>Y · RINK WIDTH (m)<input disabled={!rinkAvailable} type="number" step=".5" value={Number(selectedActor.keys[0].y.toFixed(2))} onChange={event => { if (event.target.value !== '' && Number.isFinite(Number(event.target.value))) moveActor(selected, { x: selectedActor.keys[0].x, y: Number(event.target.value) }); }} /></label>{!young && <label>FACING · DEGREES<input disabled={!rinkAvailable} type="number" min="0" max="359" step="15" value={Math.round(((selectedActor.keys[0].facing * 180 / Math.PI) % 360 + 360) % 360)} onChange={event => { if(event.target.value !== '' && Number.isFinite(Number(event.target.value))) moveActor(selected, { ...selectedActor.keys[0], facing: ((Number(event.target.value) % 360 + 360) % 360) * Math.PI / 180 }); }} /></label>}{question.ageBand === 'U9' && <div className="cq-turn-controls"><span>TURN YOUR PLAYER</span><button disabled={!rinkAvailable} onClick={() => moveActor(selected, { ...selectedActor.keys[0], facing: selectedActor.keys[0].facing - Math.PI / 4 })}>↶ Turn left</button><button disabled={!rinkAvailable} onClick={() => moveActor(selected, { ...selectedActor.keys[0], facing: selectedActor.keys[0].facing + Math.PI / 4 })}>Turn right ↷</button><small>The small arrow shows which way you face.</small></div>}<small>Arrow keys move 0.5 m; Shift + arrow makes a smaller adjustment.{!young && ' The small arrow shows facing: 0° right, 90° down, 180° left, 270° up.'}</small></div>}{phase === 'coach' && <><button onClick={() => mutate(current => reviseCoachQuestion(current, { referenceDraft: copy(current.initialDraft) }))}>Reset reference to start</button>{onOpenDirector && <button onClick={() => onOpenDirector(copy(question[snapshot]))}>Open full rink editor ↗</button>}</>}</aside></div>
        {phase === 'coach' ? <div className="cq-answer-author">{question.type === 'action' && <div><p className="cq-eyebrow">COACH’S ACTION ANSWER</p><div className="cq-action-choices">{COACH_ACTIONS.map(action => <button key={action} aria-pressed={question.expectedAction === action} onClick={() => patch({ expectedAction: action })}>{ACTION_LABELS[action]}</button>)}</div></div>}<label>WHY IS THIS YOUR REFERENCE ANSWER?<textarea rows="3" value={question.coachExplanation} onChange={event => patch({ coachExplanation: event.target.value })} placeholder="Explain the space, pressure or passing option that matters." /></label><RubricEditor question={question} onChange={rubric => patch({ rubric })} /><div className="cq-actions"><button className="cq-primary" onClick={saveReference}>Save coach answer & explanation</button><button disabled={!ready} onClick={beginAttempt}>Try as the player →</button><button disabled={!ready} onClick={() => { try { download(question); setNotice('Question exported with its two snapshots and provenance.'); } catch (error) { setNotice(error.message); } }}>Export question</button></div></div> : <div className="cq-learner-reason">{question.type === 'action' && <div><p className="cq-eyebrow">WHAT WOULD YOU DO?</p><div className="cq-action-choices">{COACH_ACTIONS.map(action => <button key={action} disabled={!rinkAvailable} aria-pressed={attempt.action === action} onClick={() => { if (rinkAvailableRef.current) setAttempt(current => ({ ...current, action })); }}>{ACTION_LABELS[action]}</button>)}</div></div>}<label>WHY DID YOU CHOOSE THIS? (optional)<textarea rows="2" maxLength={600} value={attempt?.reason || ''} onChange={event => setAttempt(current => ({ ...current, reason: event.target.value }))} placeholder="Tell the coach what you noticed." /></label><div className="cq-reason-starters">{REASONS.map(reason => <button key={reason} aria-pressed={attempt?.reason === reason} onClick={() => setAttempt(current => ({ ...current, reason }))}>{reason}</button>)}</div><div className="cq-actions"><button className="cq-primary" disabled={!rinkAvailable} onClick={compare}>Compare with coach reference →</button><button onClick={beginAttempt}>Reset my attempt</button></div></div>}
      </>}
      {phase === 'coach' && <details className="cq-source"><summary>Source & reference status</summary><p>{question.sourceRef.note}</p>{question.sourceRef.url && <a href={question.sourceRef.url} target="_blank" rel="noreferrer">Open source reference ↗</a>}<p>These snapshots preserve the starting source separately. Coach edits do not rewrite its answer. The comparison contains no automatic tactical grade, goal/save grade or certification.</p></details>}
    </div>{notice && <p className="cq-notice" role="status">{notice}</p>}
  </section>;
}
