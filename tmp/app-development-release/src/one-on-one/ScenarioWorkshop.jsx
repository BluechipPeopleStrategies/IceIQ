import { useEffect, useMemo, useRef, useState } from 'react';
import ScenarioRinkView from '../visuals/ScenarioRinkView.jsx';
import { QuestionBoard } from './CoachQuestionLab.jsx';
import RinkCoordinateInput from './RinkCoordinateInput.jsx';
import RinkDiscovery from './RinkDiscovery.jsx';
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
const MODES = ['position', 'explore'];
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
  const latest = useRef(draft), savedText = useRef(null), heading = useRef(null), lastRead = useRef(draft.session.readIndex);
  latest.current = draft;
  const reduced = useReducedMotion();
  const { session, reason, paused } = draft;
  const state = useMemo(() => positioningState(session), [session]);
  const read = useMemo(() => positioningRead(session), [session]);
  const focus = state.actors.find(actor => actor.id === template.focusActorId);
  const reading = session.phase === 'read';
  const playing = session.phase === 'playback' && !paused && !reduced;

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
      if (stopped) return;
      if (start === null) start = now;
      const progress = Math.min(1, startProgress + (now - start) / PLAYBACK_MS);
      setDraft(current => {
        if (current.session.phase !== 'playback' || current.paused) return current;
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
    if (!reading || id !== template.focusActorId) return;
    try {
      setDraft({ ...draft, session: movePositioningPlayer(session, point) });
      setNotice('');
    } catch (error) { setNotice(error.message); }
  }
  function choose(choice) { move(template.focusActorId, positionChoicePoint(session, choice)); }
  function submit() {
    try {
      const next = submitPositioningRead(session, reason);
      setDraft({ ...draft, session: next, reason: '', paused: reduced });
      setNotice(next.phase === 'complete' ? 'Your three positions and explanations are saved for discussion.' : 'Your position stays in the next part of the play.');
    } catch (error) { setNotice(`${error.message} Your position and explanation are still here. This illustration limit is not a tactical grade.`); }
  }
  function seek(progress) {
    if (session.phase !== 'playback' || !Number.isFinite(progress)) return;
    setDraft({ ...draft, session: advancePositioningPlayback(session, progress), paused: progress < 1, reason: '' });
    setNotice('');
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
      setNotice('Downloaded your actual positions, explanations and draft scene.');
    } catch (error) { setNotice(error.message); }
  }

  const fallbackDraft = useMemo(() => stateToStaticDirectorDraft(state, template.title), [state, template.title]);
  const fallback = <QuestionBoard draft={fallbackDraft} snapshotState={state} title={read.prompt} selected={template.focusActorId}
    onSelect={() => {}} onMove={reading ? move : undefined} editableTeam={focus.team}
    allowedActorIds={reading ? [template.focusActorId] : []} view="half-right" initialFraming="whole" young={false} showFacing />;
  return <section className="sw-lesson" aria-label={`${template.teamSize} versus ${template.teamSize} positioning situation`}>
    <header className="sw-read-header">
      <div className="sw-read-steps" aria-label="Three connected reads">{[1, 2, 3].map(number => <span key={number} aria-current={number === read.number ? 'step' : undefined} className={number <= session.answers.length ? 'is-saved' : ''}>Read {number}{number <= session.answers.length ? ' · saved' : ''}</span>)}</div>
      <h2 ref={heading} tabIndex={-1}>{read.prompt}</h2>
      <p>{session.phase === 'playback' ? 'Watch the authored continuation from your chosen position.' : read.cue}</p>
    </header>
    {session.phase === 'playback' && <div className="sw-playback">
      <div className="sw-playback-actions">{!reduced && <button type="button" onClick={() => setDraft({ ...draft, paused: !paused })}>{paused ? 'Resume' : 'Pause'}</button>}<span>{Math.round(session.playbackProgress * 100)}% of this continuation</span><button type="button" className="sw-primary" onClick={() => seek(1)}>Go to next read</button></div>
      {(paused || reduced) && <label>Review this continuation<input type="range" min="0" max="1" step="0.01" aria-label="Continuation progress" value={session.playbackProgress} onChange={event => seek(Number(event.target.value))} /></label>}
      {reduced && <p>Reduced motion is on. Use the progress control or go to the next frozen read.</p>}
    </div>}
    <ScenarioRinkView state={state} title={read.prompt} fallback={fallback} bounds={POSITIONING_BOUNDS} selectedActorId={template.focusActorId}
      editableIds={reading ? [template.focusActorId] : []} onSelect={() => {}} onMove={move}
      playing={playing} time={session.playbackProgress * PLAYBACK_MS / 1000} hideZoneLines={false} showBothGoals={false} labelledActors
      teamLabels={template.teamSize === 1 ? { home: 'Attackers', away: 'Your team' } : { home: 'Your team', away: 'Defenders' }} />
    {reading && <div className="sw-answer">
      <p className="sw-player-focus"><strong>YOU · {template.focusActorId}</strong> Only your player moves while you answer. Drag YOU in either view, or select YOU and tap the ice. Use Adjust camera when you want to turn or zoom the 3D view.</p>
      <div className="sw-choices" role="group" aria-label="Choose a position">{[['stay', 'Stay here'], ['back', 'Move back'], ['forward', 'Move forward']].map(([id, label]) => {
        const point = positionChoicePoint(session, id), selected = !!session.point && Math.hypot(session.point.x - point.x, session.point.y - point.y) < 1e-8;
        return <button key={id} type="button" aria-pressed={selected} onClick={() => choose(id)}><strong>{label}</strong><span>{read.choiceHints[id]}</span></button>;
      })}</div>
      <p className="sw-direction">{read.directionExplanation}</p>
      <details className="sw-coordinates"><summary>Use exact coordinates</summary><p>Metres on the rink. Positive x points toward the goal shown; positive y points across the ice.</p><div>{['x', 'y'].map(axis => <label key={axis}>YOU {axis.toUpperCase()}<RinkCoordinateInput resetKey={`${template.id}:${session.readIndex}:${axis}`} value={focus[axis]} onCommit={value => move(template.focusActorId, { x: focus.x, y: focus.y, [axis]: value })} aria-label={`YOU ${axis} coordinate`} step="0.5" /></label>)}</div></details>
      <label className="sw-reason">Why would you be there?<textarea rows="3" maxLength={600} value={reason} onChange={event => setDraft({ ...draft, reason: event.target.value })} placeholder="Tell your coach what you noticed about the puck, the players or the space." /></label>
      <div className="sw-submit"><span>{session.point ? `Position chosen · x ${session.point.x.toFixed(1)}, y ${session.point.y.toFixed(1)} m` : 'Choose Stay, Back, Forward or a spot on the rink.'}</span><button type="button" className="sw-primary" disabled={!session.point || !reason.trim()} onClick={submit}>{session.readIndex === 2 ? 'Save my three reads' : 'See what happens next'}</button></div>
    </div>}
    {session.phase === 'complete' && <div className="sw-complete"><h3>Your three reads</h3><p>Talk through your choices with a coach. Different positions can support different ideas; this draft does not score your answer.</p><ol>{session.answers.map(answer => <li key={answer.number}><strong>Read {answer.number} · YOU at {answer.point.x.toFixed(1)}, {answer.point.y.toFixed(1)} m</strong><p>{answer.reason}</p></li>)}</ol>{onNextCandidate && <button type="button" className="sw-primary" onClick={onNextCandidate}>Try the next situation</button>}</div>}
    <p className="sw-notice" role="status" aria-live="polite">{notice}</p>
    <div className="sw-saved"><p>{saveError ? 'Browser saving is unavailable. Download your attempt before leaving.' : 'Progress saves on this browser for this player and situation.'}</p><div><button type="button" onClick={download}>Download my attempt</button><button type="button" onClick={restart}>Start this situation over</button></div></div>
    <details className="sw-source"><summary>Coach-review draft · sources and limits</summary><p>{template.evidenceBoundary}</p><p>This is an authored illustration for positioning discussion. A drawn overlap can stop a continuation; that is a limitation of this draft, not a right-or-wrong positioning judgment.</p><p className="sw-id">{template.id}</p><ul>{template.sourceRefs.map(source => <li key={source.note}><strong>{source.note.split('/').pop().replace('.md', '').replaceAll('-', ' ')}</strong> — {source.use}</li>)}</ul><details><summary>Situation parameters</summary><dl>{Object.entries(template.parameters).map(([name, value]) => <div key={name}><dt>{name.replace(/([A-Z])/g, ' $1')}</dt><dd>{value}</dd></div>)}</dl></details></details>
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
    else if (query.get('arena') === 'sgs') fallback.mode = 'position';
  }
  return fallback;
}

export default function ScenarioWorkshop({ playerId = 'practice-preview' }) {
  const [preferences, setPreferences] = useState(() => loadPreferences(playerId));
  const template = POSITIONING_TEMPLATES.find(item => item.id === preferences.templateId) || firstTemplate(1);
  const candidates = useMemo(() => POSITIONING_TEMPLATES.filter(item => item.teamSize === template.teamSize), [template.teamSize]);
  const index = candidates.findIndex(item => item.id === template.id);
  useEffect(() => { try { localStorage.setItem(`rinkreads_scenario_workshop_ui_v1:${encodeURIComponent(playerId)}`, JSON.stringify(preferences)); } catch { /* Lesson reports attempt save failures separately. */ } }, [preferences, playerId]);
  const next = () => setPreferences(current => ({ ...current, templateId: candidates[(index + 1) % candidates.length].id }));
  return <section className="scenario-workshop">
    <header className="sw-intro"><p className="sw-eyebrow">SCENARIO LAB · LOCAL REVIEW DRAFT</p>{preferences.mode === 'explore' ? <><h1>Find your way.<br /><em>Explore the rink.</em></h1><p>Find a faceoff circle, a blue line, a net and the puck. Take your time; every new find earns a star.</p></> : <><h1>One player.<br /><em>Three connected reads.</em></h1><p>Start with 1v1, then add players. Choose where YOU should be, explain why, and see the next part of the play from that position.</p></>}</header>
    <nav className="sw-mode" aria-label="Scenario Lab exercise"><button type="button" aria-pressed={preferences.mode === 'position'} onClick={() => setPreferences({ ...preferences, mode: 'position' })}>U11 · Position & explain</button><button type="button" aria-pressed={preferences.mode === 'explore'} onClick={() => setPreferences({ ...preferences, mode: 'explore' })}>U7 · Explore the rink</button></nav>
    {preferences.mode === 'explore' ? <RinkDiscovery onBack={() => setPreferences({ ...preferences, mode: 'position' })} /> : <>
      <section className="sw-picker" aria-label="Choose a draft situation"><div className="sw-formats" role="group" aria-label="Players on each team">{[1, 2, 3, 4, 5].map(size => <button type="button" key={size} aria-pressed={template.teamSize === size} onClick={() => setPreferences({ ...preferences, templateId: firstTemplate(size).id })}>{size}v{size}</button>)}</div><div className="sw-situation"><label>Situation<select value={template.id} onChange={event => setPreferences({ ...preferences, templateId: event.target.value })}>{candidates.map((candidate, i) => <option key={candidate.id} value={candidate.id}>{String(i + 1).padStart(3, '0')} · {candidate.title}</option>)}</select></label><button type="button" onClick={next}>Next situation →</button></div><p>{candidates.length} draft configurations in this format · {POSITIONING_TEMPLATES.length} across five formats. These are coach-review drafts, not approved lessons.</p></section>
      <PositioningLesson key={`${playerId}:${template.id}`} playerId={playerId} template={template} onNextCandidate={next} />
    </>}
  </section>;
}
