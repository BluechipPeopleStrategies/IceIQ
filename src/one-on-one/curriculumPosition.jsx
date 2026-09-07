import { useEffect, useMemo, useRef, useState } from 'react';
import ScenarioRinkView from '../visuals/ScenarioRinkView.jsx';
import RinkCoordinateInput from './RinkCoordinateInput.jsx';
import { getCurriculumPositionVariant, createCurriculumPositionAttempt, moveCurriculumPosition, setCurriculumPositionReason, checkCurriculumPosition, restoreCurriculumPosition, curriculumPositionState, curriculumPositionStorageKey } from './curriculumPositionCore.js';
import './curriculumPosition.css';

const BOUNDS = Object.freeze({ minX: 7, maxX: 30.48, minY: -12.954, maxY: 12.954 });
function load(key, question) {
  try {
    const raw = localStorage.getItem(key), saved = raw ? restoreCurriculumPosition(raw, question) : null;
    return { attempt: saved || createCurriculumPositionAttempt(question), notice: raw && !saved ? 'This saved placement could not be reopened. A fresh try is ready.' : '' };
  } catch { return { attempt: createCurriculumPositionAttempt(question), notice: 'Device saving is unavailable. You can still try the exercise.' }; }
}

function PositionAttempt({ question, playerId, variant, ageBand, startingView }) {
  const storageKey = curriculumPositionStorageKey(playerId, question);
  const [initial] = useState(() => load(storageKey, question));
  const [attempt, setAttempt] = useState(initial.attempt);
  const [notice, setNotice] = useState(initial.notice);
  const [available, setAvailable] = useState(false);
  const availableRef = useRef(false), feedbackRef = useRef(null), pendingFeedback = useRef(false);
  const onAvailabilityChange = useMemo(() => value => { availableRef.current = value === true; setAvailable(value === true); }, []);
  const state = useMemo(() => curriculumPositionState(attempt, question), [attempt, question]);
  const focus = state.actors.find(actor => actor.id === variant.focusActorId);
  const startingFocus = attempt.sourceState.actors.find(actor => actor.id === variant.focusActorId);

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(attempt)); }
    catch { setNotice('Your try is kept for this visit. Download it before leaving if device saving is unavailable.'); }
  }, [attempt, storageKey]);
  useEffect(() => {
    if (pendingFeedback.current && attempt.result) { feedbackRef.current?.focus({ preventScroll: true }); pendingFeedback.current = false; }
  }, [attempt.result]);

  function move(actorId, point, inputMethod = 'rink') {
    if (!availableRef.current) return;
    try { setAttempt(current => moveCurriculumPosition(current, question, actorId, point, inputMethod)); setNotice(''); }
    catch (error) { setNotice(error.message); }
  }
  function check() {
    if (!availableRef.current) return;
    try { setAttempt(current => checkCurriculumPosition(current, question)); pendingFeedback.current = true; setNotice(''); }
    catch (error) { setNotice(error.message); }
  }
  function updateReason(reason) {
    try { setAttempt(current => setCurriculumPositionReason(current, question, reason)); }
    catch (error) { setNotice(error.message); }
  }
  function download() {
    const payload = { variant, attempt };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = `${variant.id}-my-placement.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <section className="gc-position-exercise" aria-label="Move the player exercise">
    <div className="gc-play-area"><div>
      <ScenarioRinkView state={state} title={variant.prompt} bounds={BOUNDS} focusActorId={variant.focusActorId}
        ageBand={ageBand ?? question.ageBand ?? question.level} startingView={startingView ?? question.startingView} questionId={variant.id}
        selectedActorId={variant.focusActorId} editableIds={available ? [variant.focusActorId] : []} onSelect={() => {}} onMove={move}
        onAvailabilityChange={onAvailabilityChange} labelledActors hideZoneLines showBothGoals={false} />
      <p className="gc-position-caption">F1 has the puck. F2’s route is covered. Only the highlighted player moves.</p>
    </div><div className="gc-question-panel">
      <p className="gc-question-kind">MOVE THE PLAYER · U15</p><h3>{variant.prompt}</h3><p>{variant.instruction}</p>
      <button type="button" className="gc-position-stay" disabled={!available} onClick={() => move(variant.focusActorId, { x: startingFocus.x, y: startingFocus.y }, 'hold')}>Keep the starting position</button>
      <details className="gc-position-coordinates"><summary>Use coordinate controls</summary><div>{['x', 'y'].map(axis => <label key={axis}>Rink {axis === 'x' ? 'length' : 'width'}<RinkCoordinateInput resetKey={`${storageKey}:${axis}`} value={focus[axis]} step=".5" disabled={!available} aria-label={`Placement ${axis} coordinate`} onCommit={value => move(variant.focusActorId, { x: focus.x, y: focus.y, [axis]: value }, 'coordinates')} /></label>)}</div></details>
      <label className="gc-position-reason">Why would you be there? <span>(optional)</span><textarea maxLength={600} rows={3} value={attempt.reason} onChange={event => updateReason(event.target.value)} placeholder="What did you notice? You can leave this blank." /></label>
      <button type="button" className="gc-primary" disabled={!available || !attempt.point} onClick={check}>Check my position</button>
      {!available && <p className="gc-storage-notice" role="status">Wait for the rink before placing your player. If it could not load, use Retry 3D rink.</p>}
      {attempt.result && <div ref={feedbackRef} tabIndex={-1} className={`gc-position-feedback ${attempt.result.matchesDraft ? 'is-match' : ''}`} aria-label="Placement feedback">
        <h4>{attempt.result.matchesDraft ? 'Good area for this exercise' : 'Try another area'}</h4>
        <p>{attempt.result.matchesDraft ? 'F1 has a clear route to your player, with room to receive. You give F1 a different option from F2.' : 'Look again at the puck, the gold players and F2’s route. You can move your player and check again.'}</p>
        {!attempt.result.matchesDraft && <ul>{attempt.result.checks.filter(item => !item.matched).map(item => <li key={item.id}>{item.retry}</li>)}</ul>}
        <p className="gc-position-boundary">Different useful positions can work in this play.</p>
      </div>}
    </div></div>
    <div className="gc-position-save"><p role="status">{notice || 'Your placement saves separately on this device. It does not change your multiple-choice answer or points.'}</p><button type="button" onClick={download}>Download this try</button></div>
  </section>;
}

export default function CurriculumPositionExercise({ question, playerId, ageBand, startingView }) {
  const variant = getCurriculumPositionVariant(question);
  return variant ? <PositionAttempt key={`${playerId}:${variant.id}`} question={question} playerId={playerId} variant={variant} ageBand={ageBand} startingView={startingView} /> : null;
}
export { PositionAttempt };
