import { useEffect, useMemo, useRef, useState } from 'react';
import ScenarioRinkView from '../visuals/ScenarioRinkView.jsx';
import { QuestionBoard } from './CoachQuestionLab.jsx';
import RinkDiscovery from './RinkDiscovery.jsx';
import MixedPositioningLesson from './MixedPositioningLesson.jsx';
import { stateToStaticDirectorDraft } from './readSequenceCore.js';
import {
  POSITIONING_TEMPLATES, createPositioningSession, positioningState,
  positioningRead, movePositioningPlayer, positionChoicePoint,
  submitPositioningRead, advancePositioningPlayback, restorePositioningSession,
} from './positioningSequenceCore.js';
import './ScenarioWorkshop.css';

const DRAFT_VERSION = 'rinkreads-positioning-workshop-v1';
const PLAYBACK_MS = 2600;
// Cover every legal placement without changing the camera fit after a move.
const POSITIONING_BOUNDS = Object.freeze({ minX: 0, maxX: 30.48, minY: -12.954, maxY: 12.954 });
const MODES = ['position', 'explore', 'mixed'];
// Candidate009 is the first 1v1 configuration whose 27 three-button paths all
// pass the illustration guards. This selects a usable demo, not a correct tactic;
// it neither reorders the catalog nor alters its guards or saved candidates.
const firstTemplate = size => POSITIONING_TEMPLATES.find(item => size === 1 ? item.id === 'positioning-1v1-009-v1' : item.teamSize === size);
export const workshopStorageKey = (playerId, templateId) => `rinkreads_scenario_workshop_v1:${encodeURIComponent(playerId)}:${templateId}`;
export const createWorkshopDraft = templateId => ({ version: DRAFT_VERSION, session: createPositioningSession(templateId), reason: '', paused: false });

export function restoreWorkshopDraft(raw, expectedId) {
  try {
    const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!value || value.version !== DRAFT_VERSION || Object.keys(value).sort().join(',') !== 'paused,reason,session,version'
      || typeof value.reason !== 'string' || value.reason.length > 600 || typeof value.paused !== 'boolean') return null;
    const session = restorePositioningSession(value.session);
    if (!session || session.templateId !== expectedId) return null;
    // Opening a saved animation always waits for an explicit Resume.
    return { version: DRAFT_VERSION, session, reason: value.reason, paused: session.phase === 'playback' || value.paused };
  } catch { return null; }
}

function loadDraft(key, templateId) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { draft: createWorkshopDraft(templateId), notice: '' };
    const draft = restoreWorkshopDraft(raw, templateId);
    return draft ? { draft, notice: draft.session.phase === 'playback' ? 'Your saved scene is paused. Resume when you are ready.' : 'Your saved position and explanation are ready.' }
      : { draft: createWorkshopDraft(templateId), notice: 'This saved attempt could not be read. A fresh attempt is ready.' };
  } catch { return { draft: createWorkshopDraft(templateId), notice: 'Browser saving is unavailable. You can still use this situation and download your answers.' }; }
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!media) return;
    const change = () => setReduced(media.matches);
    change(); media.addEventListener?.('change', change);
    return () => media.removeEventListener?.('change', change);
  }, []);
  return reduced;
}

export function PositioningLesson({ template, playerId, onNextCandidate }) {
  const storageKey = workshopStorageKey(playerId, template.id);
  const [initial] = useState(() => loadDraft(storageKey, template.id));
  const [draft, setDraft] = useState(initial.draft);
  const [notice, setNotice] = useState(initial.notice);
  const [saveError, setSaveError] = useState(false);
  const [rinkAvailable, setRinkAvailable] = useState(true);
  const availableRef = useRef(true);
  const latest = useRef(draft), savedText = useRef(null), heading = useRef(null), lastRead = useRef(draft.session.readIndex);
  latest.current = draft;
  const reduced = useReducedMotion();
  const { session, reason, paused } = draft;
  const state = useMemo(() => positioningState(session), [session]);
  const read = useMemo(() => positioningRead(session), [session]);
  const focus = state.actors.find(actor => actor.id === template.focusActorId);
  const reading = session.phase === 'read';
  const canPosition = reading && rinkAvailable;
  const playing = session.phase === 'playback' && !paused && !reduced && rinkAvailable;

  function persist(report = true) {
    try {
      const current = latest.current;
      if (!restoreWorkshopDraft(current, template.id)) throw new Error('Invalid positioning draft');
      const text = JSON.stringify(current);
      if (savedText.current !== text) localStorage.setItem(storageKey, text);
      savedText.current = text;
      if (report) setSaveError(false);
    } catch { if (report) setSaveError(true); }
  }

  const onAvailabilityChange = useMemo(() => available => {
    if (typeof available !== 'boolean') return;
    // Stop a queued animation or input event before React commits the disabled UI.
    availableRef.current = available;
    setRinkAvailable(available);
    if (!available && latest.current.session.phase === 'playback') {
      const next = { ...latest.current, paused: true };
      latest.current = next; setDraft(next); persist(false);
    }
    // Recovery restores the controls, but only Resume starts the clock again.
  }, [storageKey]);

  // Save every edit and pause immediately. Playback is checkpointed and flushed
  // on navigation/page hide without making storage a per-animation-frame task.
  useEffect(() => { persist(); }, [reason, paused, session.phase, session.readIndex, session.point, session.answers.length]);
  useEffect(() => {
    if (session.phase !== 'playback') return;
    const timer = setInterval(() => persist(), 300);
    return () => clearInterval(timer);
  }, [session.phase]);
  useEffect(() => {
    const pageHide = () => persist(false);
    const visibility = () => {
      if (document.visibilityState === 'hidden') {
        setDraft(current => {
          const next = current.session.phase === 'playback' ? { ...current, paused: true } : current;
          latest.current = next;
          return next;
        });
        persist(false);
      }
    };
    window.addEventListener('pagehide', pageHide);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('pagehide', pageHide);
      document.removeEventListener('visibilitychange', visibility);
      persist(false);
    };
  }, [storageKey]);

  useEffect(() => {
    if (!playing) return;
    let frame, start = null, stopped = false;
    const startProgress = latest.current.session.playbackProgress;
    function tick(now) {
      if (stopped || !availableRef.current) return;
      if (start === null) start = now;
      const progress = Math.min(1, startProgress + (now - start) / PLAYBACK_MS);
      setDraft(current => {
        if (!availableRef.current || current.session.phase !== 'playback' || current.paused) return current;
        return { ...current, session: advancePositioningPlayback(current.session, progress), paused: progress === 1 ? false : current.paused };
      });
      if (progress < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => { stopped = true; cancelAnimationFrame(frame); };
  }, [playing, session.readIndex]);

  useEffect(() => {
    if (session.readIndex !== lastRead.current || session.phase === 'complete') {
      heading.current?.focus({ preventScroll: true });
      lastRead.current = session.readIndex;
    }
  }, [session.readIndex, session.phase]);

  function move(id, point) {
    if (!availableRef.current || !reading || id !== template.focusActorId) return;
    try {
      setDraft({ ...draft, session: movePositioningPlayer(session, point) });
      setNotice('');
    } catch (error) { setNotice(error.message); }
  }
  function choose(choice) { move(template.focusActorId, positionChoicePoint(session, choice)); }
  function submit() {
    if (!availableRef.current || !reading) return;
    try {
      const next = submitPositioningRead(session, reason);
      setDraft({ ...draft, session: next, reason: '', paused: reduced });
      setNotice(next.phase === 'complete' ? 'Your three positions are saved for discussion.' : 'Your position stays in the next part of the play.');
    } catch (error) { setNotice('The next part could not play from here. Try a nearby spot. Your position and note are still here.'); }
  }
  function seek(progress) {
    if (!availableRef.current || session.phase !== 'playback' || !Number.isFinite(progress)) return;
    setDraft({ ...draft, session: advancePositioningPlayback(session, progress), paused: progress < 1, reason: '' });
    setNotice('');
  }
  function togglePlayback() {
    if (!availableRef.current) return;
    setDraft(current => ({ ...current, paused: !current.paused }));
  }
  function restart() {
    const next = createWorkshopDraft(template.id);
    latest.current = next;
    setDraft(next); setNotice('A fresh attempt is ready for this situation.');
  }
  function download() {
    try {
      const checked = restoreWorkshopDraft(latest.current, template.id);
      if (!checked) throw new Error('This attempt could not be exported.');
      const payload = { exercise: 'position-and-explain', status: template.status, templateId: template.id,
        teamSize: template.teamSize, sourceRefs: template.sourceRefs, evidenceBoundary: template.evidenceBoundary, draft: latest.current };
      const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${template.id}-my-reads.json`; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice('Your play and notes have been downloaded.');
    } catch (error) { setNotice(error.message); }
  }

  const fallbackDraft = useMemo(() => stateToStaticDirectorDraft(state, template.title), [state, template.title]);
  const fallback = <QuestionBoard draft={fallbackDraft} snapshotState={state} title={read.prompt} selected={template.focusActorId}
    onSelect={() => {}} onMove={canPosition ? move : undefined} editableTeam={focus.team}
    allowedActorIds={canPosition ? [template.focusActorId] : []} view="half-right" initialFraming="whole" young={false} showFacing />;
  return <section className="sw-lesson" aria-label={`${template.teamSize} versus ${template.teamSize} positioning situation`}>
    <header className="sw-read-header">
      <div className="sw-read-steps" aria-label="Three connected reads">{[1, 2, 3].map(number => <span key={number} aria-current={number === read.number ? 'step' : undefined} className={number <= session.answers.length ? 'is-saved' : ''}>Read {number}{number <= session.answers.length ? ' · saved' : ''}</span>)}</div>
      <h2 ref={heading} tabIndex={-1}>{read.prompt}</h2>
      <p>{session.phase === 'playback' ? 'Watch what happens from your chosen position.' : read.cue}</p>
    </header>
    {session.phase === 'playback' && <div className="sw-playback">
      <div className="sw-playback-actions">{!reduced && <button type="button" disabled={!rinkAvailable} onClick={togglePlayback}>{paused ? 'Resume' : 'Pause'}</button>}<span>{Math.round(session.playbackProgress * 100)}% of this continuation</span><button type="button" className="sw-primary" disabled={!rinkAvailable} onClick={() => seek(1)}>Go to next read</button></div>
      {(paused || reduced) && <label>Review this continuation<input type="range" min="0" max="1" step="0.01" aria-label="Continuation progress" disabled={!rinkAvailable} value={session.playbackProgress} onChange={event => seek(Number(event.target.value))} /></label>}
      {reduced && <p>Reduced motion is on. Use the progress control or go to the next frozen read.</p>}
    </div>}
    <ScenarioRinkView ageBand={template.ageBand} startingView={read.startingView} questionId={`${template.id}:${session.readIndex}:${session.phase}`} state={state} title={read.prompt} fallback={fallback} bounds={POSITIONING_BOUNDS} selectedActorId={template.focusActorId}
      editableIds={canPosition ? [template.focusActorId] : []} onSelect={() => {}} onMove={move} onAvailabilityChange={onAvailabilityChange}
      playing={playing} time={session.playbackProgress * PLAYBACK_MS / 1000} hideZoneLines={false} showBothGoals={false} labelledActors
      teamLabels={template.teamSize === 1 ? { home: 'Attackers', away: 'Your team' } : { home: 'Your team', away: 'Defenders' }} />
    {!rinkAvailable && <p className="sw-notice" role="status">The rink is unavailable. Your scene and answers are kept here. Retry the view to continue.</p>}
    {reading && <div className="sw-answer">
      <p className="sw-player-focus"><strong>YOU · {template.focusActorId}</strong> Only your player moves while you answer. Drag YOU, or select YOU and tap the ice. Use Adjust camera when you want to turn or zoom the 3D view.</p>
      <div className="sw-choices" role="group" aria-label="Choose a position">{[['stay', 'Stay here'], ['back', 'Move back'], ['forward', 'Move forward']].map(([id, label]) => {
        const point = positionChoicePoint(session, id), selected = !!session.point && Math.hypot(session.point.x - point.x, session.point.y - point.y) < 1e-8;
        return <button key={id} type="button" aria-pressed={selected} disabled={!canPosition} onClick={() => choose(id)}><strong>{label}</strong><span>{read.choiceHints[id]}</span></button>;
      })}</div>
      <p className="sw-direction">{read.directionExplanation}</p>
      <div className="sw-nudge" role="group" aria-label="Adjust player position">{[['Back a little', -.5, 0], ['Forward a little', .5, 0], ['Across the ice ←', 0, -.5], ['Across the ice →', 0, .5]].map(([label, dx, dy]) => <button type="button" key={label} disabled={!canPosition} onClick={() => move(template.focusActorId, { x: focus.x + dx, y: focus.y + dy })}>{label}</button>)}</div>
      <label className="sw-reason">Why would you be there? (optional)<textarea rows="3" maxLength={600} value={reason} onChange={event => setDraft({ ...draft, reason: event.target.value })} placeholder="Add what you noticed, or leave this blank and keep playing." /></label>
      <div className="sw-submit"><span>{session.point ? 'Position chosen' : 'Choose Stay, Back, Forward or a spot on the rink.'}</span><button type="button" className="sw-primary" disabled={!session.point || !canPosition} onClick={submit}>{session.readIndex === 2 ? 'Save my three reads' : 'See what happens next'}</button></div>
    </div>}
    {session.phase === 'complete' && <div className="sw-complete"><h3>Your three reads</h3><p>Look back at your three positions. What changed each time?</p><ol>{session.answers.map(answer => <li key={answer.number}><strong>Read {answer.number} · Your position</strong><p>{answer.reason}</p></li>)}</ol>{onNextCandidate && <button type="button" className="sw-primary" onClick={onNextCandidate}>Try the next situation</button>}</div>}
    <p className="sw-notice" role="status" aria-live="polite">{notice}</p>
    <div className="sw-saved"><p>{saveError ? 'Browser saving is unavailable. Download your attempt before leaving.' : 'Progress saves on this browser for this player and situation.'}</p><div><button type="button" onClick={download}>Download my attempt</button><button type="button" onClick={restart}>Start this situation over</button></div></div>
  </section>;
}

function loadPreferences(playerId) {
  const fallback = { templateId: firstTemplate(1).id, mode: 'position' };
  try {
    const saved = JSON.parse(localStorage.getItem(`rinkreads_scenario_workshop_ui_v1:${encodeURIComponent(playerId)}`));
    const template = POSITIONING_TEMPLATES.find(item => item.id === saved?.templateId);
    if (template) fallback.templateId = template.id;
    if (MODES.includes(saved?.mode)) fallback.mode = saved.mode;
  } catch { /* A missing or malformed preference does not affect attempts. */ }
  if (typeof window !== 'undefined') {
    const query = new URLSearchParams(window.location?.search || '');
    if (query.get('sgs') === 'discover') fallback.mode = 'explore';
    else if (query.get('sgs') === 'mixed') fallback.mode = 'mixed';
    else if (query.get('arena') === 'sgs') fallback.mode = 'position';
  }
  return fallback;
}

export default function ScenarioWorkshop({ playerId = 'practice-preview', hideDiscovery = false }) {
  const [preferences, setPreferences] = useState(() => loadPreferences(playerId));
  const mode = hideDiscovery && preferences.mode === 'explore' ? 'position' : preferences.mode;
  const template = POSITIONING_TEMPLATES.find(item => item.id === preferences.templateId) || firstTemplate(1);
  const candidates = useMemo(() => POSITIONING_TEMPLATES.filter(item => item.teamSize === template.teamSize), [template.teamSize]);
  const index = candidates.findIndex(item => item.id === template.id);
  useEffect(() => { try { localStorage.setItem(`rinkreads_scenario_workshop_ui_v1:${encodeURIComponent(playerId)}`, JSON.stringify(preferences)); } catch { /* Lesson reports attempt save failures separately. */ } }, [preferences, playerId]);
  const next = () => setPreferences(current => ({ ...current, templateId: candidates[(index + 1) % candidates.length].id }));
  return <section className="scenario-workshop">
    <header className="sw-intro"><p className="sw-eyebrow">FIND YOUR POSITION</p>{mode === 'explore' ? <><h1>Find your way.<br /><em>Explore the rink.</em></h1><p>Find a faceoff circle, a blue line, a net and the puck. Take your time; every new find earns a star.</p></> : mode === 'mixed' ? <><h1>One play.<br /><em>A different way to read it.</em></h1><p>Notice what is happening and choose your position. You can explain why if you want. Each new mix changes what you look for across three connected reads.</p></> : <><h1>One player.<br /><em>Three connected reads.</em></h1><p>Start with 1v1, then add players. Choose where YOU should be and see what happens next. You can explain your choice if you want.</p></>}</header>
    <nav className="sw-mode" aria-label="Positioning activity"><button type="button" aria-pressed={mode === 'mixed'} onClick={() => setPreferences({ ...preferences, mode: 'mixed' })}>U11 · Mixed reads</button><button type="button" aria-pressed={mode === 'position'} onClick={() => setPreferences({ ...preferences, mode: 'position' })}>U11 · Position & explain</button>{!hideDiscovery && <button type="button" aria-pressed={mode === 'explore'} onClick={() => setPreferences({ ...preferences, mode: 'explore' })}>U7 · Explore the rink</button>}</nav>
    {mode === 'explore' ? <RinkDiscovery onBack={() => setPreferences({ ...preferences, mode: 'position' })} /> : <>
      <section className="sw-picker" aria-label="Choose a situation"><div className="sw-formats" role="group" aria-label="Players on each team">{[1, 2, 3, 4, 5].map(size => <button type="button" key={size} aria-pressed={template.teamSize === size} onClick={() => setPreferences({ ...preferences, templateId: firstTemplate(size).id })}>{size}v{size}</button>)}</div><div className="sw-situation"><label>Situation<select value={template.id} onChange={event => setPreferences({ ...preferences, templateId: event.target.value })}>{candidates.map((candidate, i) => <option key={candidate.id} value={candidate.id}>{String(i + 1).padStart(3, '0')} · {candidate.title}</option>)}</select></label><button type="button" onClick={next}>Next situation →</button></div></section>
      {mode === 'mixed' ? <MixedPositioningLesson key={`${playerId}:${template.id}`} playerId={playerId} template={template} onNextCandidate={next} /> : <PositioningLesson key={`${playerId}:${template.id}`} playerId={playerId} template={template} onNextCandidate={next} />}
    </>}
  </section>;
}
