import { useEffect, useMemo, useRef, useState } from 'react';
import ScenarioRinkView from '../visuals/ScenarioRinkView.jsx';
import { QuestionBoard } from './CoachQuestionLab.jsx';
import { stateToStaticDirectorDraft } from './readSequenceCore.js';
import { positioningState, positioningRead, positionChoicePoint, advancePositioningPlayback } from './positioningSequenceCore.js';
import { comprehensionReadContext, questionForRead, comprehensionFeedback } from './sgsComprehensionCore.js';
import { restoreMixedDraft, mixedStorageKey, startMixedDraft, recordMixedObservation, moveMixedPlayer, submitMixedPosition } from './sgsMixedDraft.js';

const PLAYBACK_MS = 2600;
const BOUNDS = Object.freeze({ minX: 0, maxX: 30.48, minY: -12.954, maxY: 12.954 });
const formatLabel = { 'actor-tap': 'Find the player', mc: 'Choose what you see', tf: 'True or false' };
const answerLabel = record => record.question.options.find(option => (option.value ?? option.id) === record.response)?.label || String(record.response);

function loadMixed(key, candidateId) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { draft: null, notice: '' };
    const draft = restoreMixedDraft(raw, candidateId);
    return { draft, notice: draft ? 'Your saved mix is ready. Its questions and feedback mode stay the same.' : 'This saved mix could not be read. Choose a mode to begin a fresh attempt.' };
  } catch { return { draft: null, notice: 'Browser saving is unavailable. A new mix can begin when browser saving is available.' }; }
}

export default function MixedPositioningLesson({ template, playerId, onNextCandidate }) {
  const storageKey = mixedStorageKey(playerId, template.id);
  const [initial] = useState(() => loadMixed(storageKey, template.id));
  const [draft, setDraft] = useState(initial.draft);
  const [choosingMode, setChoosingMode] = useState(!initial.draft);
  const [nextMode, setNextMode] = useState(initial.draft?.comprehension.mode || 'learning');
  const [notice, setNotice] = useState(initial.notice);
  const [saveError, setSaveError] = useState(false);
  const [rinkAvailable, setRinkAvailable] = useState(true);
  const availableRef = useRef(true);
  const [comparePrevious, setComparePrevious] = useState(false);
  const [reduced, setReduced] = useState(() => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const latest = useRef(draft), savedText = useRef(null), heading = useRef(null), lastRead = useRef(draft?.positioning.session.readIndex);
  latest.current = draft;
  const session = draft?.positioning.session;
  const state = useMemo(() => session ? positioningState(session) : null, [session]);
  const read = useMemo(() => session ? positioningRead(session) : null, [session]);
  const context = useMemo(() => session?.phase === 'read' ? comprehensionReadContext(session, session.readIndex) : null, [session]);
  const question = useMemo(() => context ? questionForRead({ attempt: draft.comprehension, readIndex: session.readIndex, ...context }) : null, [context, draft?.comprehension]);
  const feedback = useMemo(() => draft ? comprehensionFeedback(draft.comprehension, { positioningSession: session }) : { available: false, results: [] }, [draft]);
  const reading = session?.phase === 'read', observed = !!draft?.comprehension.records[session?.readIndex];
  const observing = reading && !observed, positioning = reading && observed;
  const canPosition = positioning && rinkAvailable;
  const showingPrevious = observing && comparePrevious && !!context?.previousState;
  const playing = session?.phase === 'playback' && !draft.positioning.paused && !reduced && !choosingMode && rinkAvailable;

  function persist(report = true) {
    if (!latest.current) return;
    try {
      if (!restoreMixedDraft(latest.current, template.id)) throw new Error('Invalid mixed attempt');
      const text = JSON.stringify(latest.current);
      if (savedText.current !== text) localStorage.setItem(storageKey, text);
      savedText.current = text;
      if (report) setSaveError(false);
    } catch { if (report) setSaveError(true); }
  }
  const onAvailabilityChange = useMemo(() => available => {
    if (typeof available !== 'boolean') return;
    // Block already queued input and animation before the disabled UI commits.
    availableRef.current = available;
    setRinkAvailable(available);
    if (!available && latest.current?.positioning.session.phase === 'playback') {
      const current = latest.current;
      const next = { ...current, positioning: { ...current.positioning, paused: true } };
      latest.current = next; setDraft(next); persist(false);
    }
    // A recovered view still waits for the learner to press Watch next part.
  }, [storageKey]);
  useEffect(() => { persist(); }, [draft?.comprehension, draft?.positioning.reason, draft?.positioning.paused, session?.phase, session?.readIndex, session?.point, session?.answers.length]);
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!media) return;
    const change = () => setReduced(media.matches);
    media.addEventListener?.('change', change);
    return () => media.removeEventListener?.('change', change);
  }, []);
  useEffect(() => {
    if (session?.phase !== 'playback') return;
    const timer = setInterval(() => persist(), 300);
    return () => clearInterval(timer);
  }, [session?.phase]);
  useEffect(() => {
    const hide = () => persist(false);
    const visibility = () => {
      if (document.visibilityState !== 'hidden') return;
      const current = latest.current;
      if (current?.positioning.session.phase === 'playback') {
        const next = { ...current, positioning: { ...current.positioning, paused: true } };
        latest.current = next; setDraft(next);
      }
      persist(false);
    };
    window.addEventListener('pagehide', hide); document.addEventListener('visibilitychange', visibility);
    return () => { window.removeEventListener('pagehide', hide); document.removeEventListener('visibilitychange', visibility); persist(false); };
  }, [storageKey]);
  useEffect(() => {
    if (!playing) return;
    let frame, start = null, stopped = false;
    const from = latest.current.positioning.session.playbackProgress;
    function tick(now) {
      if (stopped || !availableRef.current) return;
      if (start === null) start = now;
      const progress = Math.min(1, from + (now - start) / PLAYBACK_MS);
      setDraft(current => {
        if (!availableRef.current || current.positioning.paused || current.positioning.session.phase !== 'playback') return current;
        return { ...current, positioning: { ...current.positioning, session: advancePositioningPlayback(current.positioning.session, progress), paused: false } };
      });
      if (progress < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => { stopped = true; cancelAnimationFrame(frame); };
  }, [playing, session?.readIndex]);
  useEffect(() => {
    if (session?.readIndex !== lastRead.current || session?.phase === 'complete') {
      heading.current?.focus({ preventScroll: true }); lastRead.current = session?.readIndex;
    }
  }, [session?.readIndex, session?.phase]);
  useEffect(() => { setComparePrevious(false); }, [session?.readIndex, draft?.comprehension.attemptId]);

  function start() {
    try {
      const result = startMixedDraft(localStorage, playerId, { candidateId: template.id, mode: nextMode, previousDraft: latest.current });
      latest.current = result.draft; savedText.current = JSON.stringify(result.draft);
      setDraft(result.draft); setSaveError(false); setChoosingMode(false);
      setNotice(result.warning || 'A fresh mix is ready. First notice the ice, then choose your position.');
    } catch (error) { setNotice(error.message); }
  }
  function observe(response, inputMethod) {
    if (!availableRef.current || !observing || showingPrevious) return;
    try { setDraft(recordMixedObservation(draft, { response, inputMethod })); setNotice('Observation saved. Now choose where YOU would be. Add a reason if you want.'); }
    catch (error) { setNotice(error.message); }
  }
  function move(id, point) {
    if (!availableRef.current || !canPosition || id !== template.focusActorId) return;
    try { setDraft(moveMixedPlayer(draft, point)); setNotice(''); } catch (error) { setNotice(error.message); }
  }
  function submit() {
    if (!availableRef.current || !canPosition) return;
    try { setDraft(submitMixedPosition(draft, reduced)); setNotice(draft.comprehension.mode === 'learning' ? 'Read saved. Review what the scene shows before continuing.' : 'Read saved. Your feedback will appear after the full play.'); }
    catch (error) { setNotice('The next part could not play from here. Try a nearby spot. Your choices are still here.'); }
  }
  function seek(progress) {
    if (!availableRef.current || session?.phase !== 'playback' || !Number.isFinite(progress)) return;
    setDraft({ ...draft, positioning: { ...draft.positioning, session: advancePositioningPlayback(session, progress), paused: progress < 1 } });
    setNotice('');
  }
  function togglePlayback() {
    if (!availableRef.current) return;
    setDraft(current => ({ ...current, positioning: { ...current.positioning, paused: !current.positioning.paused } }));
  }
  function download() {
    try {
      if (!restoreMixedDraft(latest.current, template.id)) throw new Error('This attempt could not be exported.');
      const payload = { exercise: 'mixed-observation-position-explain', status: template.status, sourceRefs: template.sourceRefs, evidenceBoundary: template.evidenceBoundary, draft: latest.current };
      const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${template.id}-mixed-reads.json`; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000); setNotice('Downloaded the questions, responses, frozen scenes, positions and reasons from this attempt.');
    } catch (error) { setNotice(error.message); }
  }

  if (choosingMode || !draft) return <section className="sw-lesson sw-mixed-start" aria-label="Choose feedback mode">
    <p className="sw-eyebrow">A NEW MIX EACH TIME</p><h2>Notice. Decide. Explain.</h2>
    <p>Each of the three reads starts with a different way to show what you see: tap a player, choose an observation, or test a true-or-false claim. Then move YOU. You can add a reason if you want.</p>
    <div className="sw-feedback-modes" role="group" aria-label="Feedback mode"><button type="button" aria-pressed={nextMode === 'learning'} onClick={() => setNextMode('learning')}>Learning</button><button type="button" aria-pressed={nextMode === 'challenge'} onClick={() => setNextMode('challenge')}>Challenge</button></div>
    <p>{nextMode === 'learning' ? 'Get feedback after each observation and position. Written explanations are optional.' : 'Make all three reads before seeing feedback. Your answers stay independent of earlier coaching.'}</p>
    <p className="sw-mixed-note">Your questions stay the same until you start another mix. Earlier attempts are saved on this device.</p>
    <div className="sw-mixed-start-actions"><button type="button" className="sw-primary" onClick={start}>Start my mix</button>{draft && <button type="button" onClick={() => setChoosingMode(false)}>Return to saved attempt</button>}</div>
    <p className="sw-notice" role="status">{notice}</p>
  </section>;

  const focus = state.actors.find(actor => actor.id === template.focusActorId);
  const selectableIds = rinkAvailable && observing && !showingPrevious && question.format === 'actor-tap' ? question.options.map(option => option.id) : [];
  const currentRecord = draft.comprehension.records[session.readIndex];
  const shownResults = session.phase === 'complete' ? feedback.results : session.phase === 'playback' ? feedback.results.filter(result => result.readIndex === session.readIndex) : [];
  const boardTitle = observing ? question.prompt : read.prompt;
  const displayedState = showingPrevious ? context.previousState : state;
  const displayedTitle = showingPrevious ? `Opening of read ${session.readIndex}, before you chose a position` : boardTitle;
  const fallback = <QuestionBoard draft={stateToStaticDirectorDraft(displayedState, template.title)} snapshotState={displayedState} title={displayedTitle}
    selected={canPosition ? template.focusActorId : undefined} onSelect={() => {}} onMove={canPosition ? move : undefined} editableTeam={focus.team}
    allowedActorIds={canPosition ? [template.focusActorId] : []} selectableIds={selectableIds} onActorAnswer={observe}
    view="half-right" initialFraming="whole" young={false} showFacing />;

  return <section className="sw-lesson sw-mixed-lesson" aria-label={`${template.teamSize} versus ${template.teamSize} mixed reads`}>
    <header className="sw-read-header"><div className="sw-mixed-mode"><span>{draft.comprehension.mode === 'learning' ? 'Learning mode' : 'Challenge mode'}</span><span>Mix {draft.comprehension.seed + 1}</span></div>
      <div className="sw-read-steps" aria-label="Three connected reads">{[1, 2, 3].map(number => <span key={number} aria-current={number === read.number ? 'step' : undefined} className={number <= session.answers.length ? 'is-saved' : ''}>Read {number}{number <= session.answers.length ? ' · saved' : ''}</span>)}</div>
      <h2 ref={heading} tabIndex={-1}>{boardTitle}</h2><p>{observing ? question.instruction : session.phase === 'playback' ? 'Watch what changes from your chosen position before the next read.' : read.cue}</p>
    </header>
    {shownResults.length > 0 && <div className="sw-observation-feedback" aria-label="Read feedback"><h3>What the scene shows</h3>{shownResults.map(result => {
      const record = draft.comprehension.records[result.readIndex];
      return <div key={result.questionId}><strong>Read {result.readIndex + 1} · {result.matchesFact ? 'Observation matched' : 'Look again'}</strong><p className="sw-feedback-question">{record.question.prompt}</p><p>Your answer: <strong>{answerLabel(record)}</strong></p><p>{result.feedback}</p></div>;
    })}<p className="sw-mixed-note">This checks what was visible. Your positioning and reasoning still need a coaching discussion.</p></div>}
    {session.phase === 'playback' && <div className="sw-playback"><div className="sw-playback-actions">{!reduced && <button type="button" disabled={!rinkAvailable} onClick={togglePlayback}>{draft.positioning.paused ? 'Watch next part' : 'Pause'}</button>}<span>{Math.round(session.playbackProgress * 100)}% of this continuation</span><button type="button" disabled={!rinkAvailable} onClick={() => seek(1)}>Go to next read</button></div>{(draft.positioning.paused || reduced) && <label>Review this continuation<input aria-label="Continuation progress" type="range" min="0" max="1" step="0.01" disabled={!rinkAvailable} value={session.playbackProgress} onChange={event => seek(Number(event.target.value))} /></label>}{reduced && <p>Reduced motion is on. Use the progress control or go to the next frozen read.</p>}</div>}
    {observing && context.previousState && <div className="sw-compare-freeze"><button type="button" aria-pressed={showingPrevious} onClick={() => setComparePrevious(!showingPrevious)}>{showingPrevious ? 'Return to this read' : 'Compare previous freeze'}</button><p>{showingPrevious ? `You are viewing the opening of read ${session.readIndex}, before you chose that position. Return to the current read to answer.` : 'Compare with the previous read’s opening, before you chose that position.'}</p></div>}
    <ScenarioRinkView state={displayedState} title={displayedTitle} fallback={fallback} bounds={BOUNDS} selectedActorId={canPosition ? template.focusActorId : undefined}
      ageBand={template.ageBand} startingView={(observing ? question.startingView : read.startingView) ?? template.startingView}
      questionId={observing ? question.id : `${template.id}:position:${session.readIndex}`}
      editableIds={canPosition ? [template.focusActorId] : []} onSelect={() => {}} onMove={move} selectableIds={selectableIds} onActorAnswer={observe} onAvailabilityChange={onAvailabilityChange}
      playing={playing} time={session.playbackProgress * PLAYBACK_MS / 1000} labelledActors hideZoneLines={false} showBothGoals={false}
      teamLabels={template.teamSize === 1 ? { home: 'Attackers', away: 'Your team' } : { home: 'Your team', away: 'Defenders' }} />
    {!rinkAvailable && <p className="sw-notice" role="status">The rink is unavailable. Your scene and answers are kept here. Retry the view to continue.</p>}
    {observing && <section className="sw-observation" aria-label="Observation question"><p className="sw-eyebrow">FIRST · {formatLabel[question.format]}</p><p>{question.format === 'actor-tap' ? 'Tap a player on the rink, or choose the same player below. Players stay still while you answer.' : question.instruction}</p><div className="sw-observation-options" role="group" aria-label={question.prompt}>{question.options.map(option => <button type="button" key={option.id} disabled={showingPrevious || !rinkAvailable} data-observation-option={option.id} onClick={event => observe(option.value ?? option.id, event.detail === 0 ? 'keyboard' : 'button')}>{option.label}</button>)}</div></section>}
    {positioning && <div className="sw-answer"><div className="sw-observation-saved"><strong>Observation saved</strong><span>{currentRecord.question.prompt} Your answer: {answerLabel(currentRecord)}.</span></div>
      <p className="sw-player-focus"><strong>NOW · POSITION & EXPLAIN</strong> Drag YOU, or select YOU and tap the ice. The other players stay frozen. Use Adjust camera to turn the view.</p>
      <div className="sw-choices" role="group" aria-label="Choose a position">{[['stay', 'Stay here'], ['back', 'Move back'], ['forward', 'Move forward']].map(([id, label]) => {
        const point = positionChoicePoint(session, id), selected = !!session.point && Math.hypot(session.point.x - point.x, session.point.y - point.y) < 1e-8;
        return <button key={id} type="button" aria-pressed={selected} disabled={!canPosition} onClick={() => move(template.focusActorId, point)}><strong>{label}</strong><span>{read.choiceHints[id]}</span></button>;
      })}</div><p className="sw-direction">{read.directionExplanation}</p>
      <div className="sw-nudge" role="group" aria-label="Adjust player position">{[['Back a little', -.5, 0], ['Forward a little', .5, 0], ['Across the ice ←', 0, -.5], ['Across the ice →', 0, .5]].map(([label, dx, dy]) => <button type="button" key={label} disabled={!canPosition} onClick={() => move(template.focusActorId, { x: focus.x + dx, y: focus.y + dy })}>{label}</button>)}</div>
      <label className="sw-reason">Why would you be there? (optional)<textarea rows="3" maxLength={600} value={draft.positioning.reason} onChange={event => setDraft({ ...draft, positioning: { ...draft.positioning, reason: event.target.value } })} placeholder="Add what you noticed, or leave this blank and keep playing." /></label>
      <div className="sw-submit"><span>{session.point ? 'Position chosen' : 'Choose Stay, Back, Forward or a spot on the rink.'}</span><button type="button" className="sw-primary" disabled={!session.point || !canPosition} onClick={submit}>{session.readIndex === 2 ? 'Finish my three reads' : 'Save this read'}</button></div>
    </div>}
    {session.phase === 'complete' && <div className="sw-complete"><h3>Your three reads</h3><p>You read the scene and chose a position three times. What changed each time?</p><ol>{session.answers.map(answer => <li key={answer.number}><strong>Read {answer.number} · Your position</strong>{answer.reason && <p>{answer.reason}</p>}</li>)}</ol>{onNextCandidate && <button type="button" className="sw-primary" onClick={onNextCandidate}>Try the next situation</button>}</div>}
    <p className="sw-notice" role="status" aria-live="polite">{notice}</p>
    <div className="sw-saved"><p>{saveError ? 'Browser saving is unavailable. Download before leaving.' : 'This exact mix and your responses save on this browser for this player.'}</p><div><button type="button" onClick={download}>Download my attempt</button><button type="button" onClick={() => { if (session.phase === 'playback') setDraft({ ...draft, positioning: { ...draft.positioning, paused: true } }); setChoosingMode(true); }}>Start another mix</button></div></div>
  </section>;
}
