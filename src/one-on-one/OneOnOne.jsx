import { practiceStorageKey, readPracticeValue } from './practiceStorage.js';
import { useCallback, useEffect, useRef, useState } from 'react';
import PracticeScene from './PracticeScene.jsx';
import { createGame, stepGame, normalizeSetup, DEFAULT_SETUP, DT, describeRep } from './simulation.js';
import { branchFrames, validateReplay, REPLAY_VERSION } from './replay.js';
import { useGameAudio } from './useGameAudio.js';
import './oneOnOne.css';
import './practiceGlass.css';

const PRESSURES = { contain: 'Protect the middle', pressure: 'Close the gap', passive: 'Give space' };
const MODES = [{ id: 'play', label: 'Free play', hint: 'Make the move.' }, { id: 'read', label: 'Read & React', hint: 'See it. Then play it.' }, { id: 'coach', label: 'Set up a rep', hint: 'Set the situation.' }];
const seconds = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

function download(value) {
  validateReplay(value);
  const url = URL.createObjectURL(new Blob([JSON.stringify(value)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'rinkreads-practice-replay.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function OneOnOne({initialMode='play',playerId='practice-preview'}) {
  const saveKey = practiceStorageKey('rinkreads_one_on_one_coach_v1', playerId);
  const [mode, setMode] = useState(initialMode);
  const [setup, setSetup] = useState(() => ({ ...DEFAULT_SETUP }));
  const initial = useRef(null);
  if (!initial.current) initial.current = createGame(DEFAULT_SETUP, 7);
  const frameRef = useRef(initial.current), frames = useRef([initial.current]), cursor = useRef(0);
  const input = useRef({ right: 0, up: 0, action: false });
  const keys = useRef(new Set());
  const runningRef = useRef(false), replayRef = useRef(false), modeRef = useRef(initialMode), cameraRef = useRef('broadcast');
  const choiceRef = useRef(null), freezeDone = useRef(false), directControl = useRef(false), speedRef = useRef(1);
  const [running, setRunning] = useState(false), [frame, setFrame] = useState(initial.current);
  const audio = useGameAudio(frame);
  const [camera, setCamera] = useState('broadcast'), [speed, setSpeed] = useState(1), [guides, setGuides] = useState(true);
  const [readPause, setReadPause] = useState(false), [selectedActor, setSelectedActor] = useState('attacker');
  const [notice, setNotice] = useState(''), [joystick, setJoystick] = useState({ x: 0, y: 0 });
  const [replay, setReplay] = useState(false), [rep, setRep] = useState(1);
  const seed = useRef(7), joystickId = useRef(null);

  const stop = useCallback(() => { runningRef.current = false; setRunning(false); }, []);
  const clearInput = useCallback(() => { keys.current.clear(); input.current = { right: 0, up: 0, action: false }; joystickId.current = null; setJoystick({ x: 0, y: 0 }); }, []);
  const reset = useCallback((nextSetup = setup, nextMode = mode, nextSeed = seed.current) => {
    const s = createGame(nextSetup, nextSeed);
    stop(); clearInput(); frameRef.current = s; frames.current = [s]; cursor.current = 0; setFrame(s);
    replayRef.current = false; setReplay(false); freezeDone.current = false; directControl.current = false; choiceRef.current = null; setReadPause(false); modeRef.current = nextMode; setNotice('');
  }, [setup, mode, stop, clearInput]);

  useEffect(() => {
    let raf, last = 0, accumulator = 0, painted = 0;
    const tick = now => {
      raf = requestAnimationFrame(tick);
      const elapsed = last ? Math.min((now - last) / 1000, .1) : 0; last = now;
      if (!runningRef.current) { accumulator = 0; return; }
      accumulator = Math.min(accumulator + elapsed * speedRef.current, .2);
      while (accumulator >= DT && runningRef.current) {
        accumulator -= DT;
        if (replayRef.current) {
          if (cursor.current >= frames.current.length - 1) { stop(); break; }
          frameRef.current = frames.current[++cursor.current];
        } else {
          const down = keys.current;
          const right = input.current.right + (down.has('arrowright') || down.has('d') ? 1 : 0) - (down.has('arrowleft') || down.has('a') ? 1 : 0);
          const up = input.current.up + (down.has('arrowup') || down.has('w') ? 1 : 0) - (down.has('arrowdown') || down.has('s') ? 1 : 0);
          const tactical = cameraRef.current === 'tactical';
          const auto = modeRef.current === 'coach' || (modeRef.current === 'read' && !directControl.current);
          const command = { moveX: tactical ? up : up * .8455 + right * .534, moveY: tactical ? right : right * .8455 - up * .534, action: input.current.action, auto, choice: choiceRef.current };
          input.current.action = false;
          const next = stepGame(frameRef.current, command, DT);
          frameRef.current = next; frames.current.push(next); cursor.current = frames.current.length - 1;
          if (modeRef.current === 'read' && !freezeDone.current && next.time >= 1.1 && !next.outcome) {
            freezeDone.current = true; setReadPause(true); stop();
          }
          if (next.outcome || frames.current.length >= 2401) stop();
        }
      }
      if (now - painted > 60 || !runningRef.current) { setFrame(frameRef.current); painted = now; }
    };
    raf = requestAnimationFrame(tick);
    const keyDown = e => {
      if (/INPUT|TEXTAREA|SELECT/.test(e.target?.tagName)) return;
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', ' ', 'x'].includes(k)) {
        e.preventDefault(); keys.current.add(k); if ((k === ' ' || k === 'x') && !e.repeat) input.current.action = true;
      }
      if (k === 'escape') stop();
    };
    const keyUp = e => keys.current.delete(e.key.toLowerCase());
    const suspend = () => { stop(); clearInput(); };
    const hidden = () => { if (document.hidden) suspend(); };
    window.addEventListener('keydown', keyDown); window.addEventListener('keyup', keyUp); window.addEventListener('blur', suspend); document.addEventListener('visibilitychange', hidden);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('keydown', keyDown); window.removeEventListener('keyup', keyUp); window.removeEventListener('blur', suspend); document.removeEventListener('visibilitychange', hidden); };
  }, [stop, clearInput]);

  function start() {
    audio.unlock();
    if (frameRef.current.outcome && !replayRef.current) { reset(); }
    setNotice(''); runningRef.current = true; setRunning(true);
  }
  function switchMode(value) {
    const next = value === 'read' ? { ...setup, role: 'attacker' } : setup;
    setSetup(next); setMode(value); reset(next, value);
  }
  function changeSetup(key, value) {
    try {
      const candidate = { ...setup, [key]: value };
      if (key === 'gap') delete candidate.defenderX;
      const next = normalizeSetup(candidate); setSetup(next); reset(next);
    }
    catch (e) { setNotice(e.message); }
  }
  function scrub(index) { stop(); clearInput(); cursor.current = index; frameRef.current = frames.current[index]; setFrame(frameRef.current); replayRef.current = true; setReplay(true); setReadPause(false); }
  function takeControl() {
    if (frameRef.current.outcome) { setNotice('Scrub to a moment before the rep ended to take control.'); return; }
    frames.current = branchFrames(frames.current, cursor.current); replayRef.current = false; setReplay(false); setReadPause(false);
    directControl.current = true; freezeDone.current = true; choiceRef.current = null;
    if (modeRef.current === 'coach') { modeRef.current = 'play'; setMode('play'); }
    clearInput(); start();
  }
  function choose(value) { choiceRef.current = value; setReadPause(false); clearInput(); start(); }
  function nextRep() { seed.current += 1; setRep(v => v + 1); reset(setup, mode, seed.current); }
  function saveSetup() {
    try { localStorage.setItem(saveKey, JSON.stringify({ version: 1, setup: normalizeSetup(setup) })); setNotice('Setup saved on this device.'); }
    catch { setNotice('This browser could not save the setup.'); }
  }
  function loadSetup() {
    try {
      const value = JSON.parse(readPracticeValue(localStorage, 'rinkreads_one_on_one_coach_v1', playerId));
      if (value?.version !== 1) throw new Error('No saved setup on this device.');
      const next = normalizeSetup(value.setup); setSetup(next); reset(next); setNotice('Saved setup reopened.');
    } catch (e) { setNotice(e.message || 'The saved setup could not be opened.'); }
  }
  function place({ x, y }) {
    try {
      const next = normalizeSetup({ ...setup, [`${selectedActor}X`]: x, [`${selectedActor}Y`]: y });
      setSetup(next); reset(next);
    } catch (e) { setNotice(e.message); }
  }
  function moveStick(e) {
    if (joystickId.current !== e.pointerId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    let x = (e.clientX - rect.left - rect.width / 2) / 34, y = (e.clientY - rect.top - rect.height / 2) / 34;
    const l = Math.max(1, Math.hypot(x, y)); x /= l; y /= l;
    input.current.right = x; input.current.up = -y; setJoystick({ x: x * 29, y: y * 29 });
  }
  function releaseStick() { joystickId.current = null; input.current.right = 0; input.current.up = 0; setJoystick({ x: 0, y: 0 }); }

  const gap = Math.hypot(frame.attacker.x - frame.defender.x, frame.attacker.y - frame.defender.y);
  const feedback = frame.outcome ? describeRep(frame) : null;
  const isLiveControl = mode === 'play' || (mode === 'read' && directControl.current);
  return <main className="oo-app">
    <header className="oo-header">
      <a className="oo-brand" href="#"><span className="oo-brand-mark">R<span>R</span></span><span>RINKREADS<small>THE PRACTICE RINK</small></span></a>
      <nav className="oo-tabs" aria-label="Practice mode">{MODES.map(m => <button key={m.id} className={mode === m.id ? 'active' : ''} onClick={() => switchMode(m.id)} aria-pressed={mode === m.id}>{m.label}</button>)}</nav>
      <span className="oo-preview-tag"><i /> DEVELOPMENT PREVIEW</span>
    </header>
    <div className="oo-title-row"><div><p className="oo-eyebrow">ONE ON ONE <span>/</span> {MODES.find(m => m.id === mode).hint}</p><h1>Win the next moment.</h1></div><p className="oo-title-note">A little space.<br /><strong>A better decision.</strong></p></div>
    <div className="oo-layout">
      <section className="oo-rink-panel" aria-label="Game and replay">
        <div className="oo-rink-toolbar"><div><span className="oo-live-dot" data-running={running} />{readPause ? 'MAKE YOUR READ' : replay ? 'REPLAY' : running ? 'ON THE ICE' : frame.outcome ? 'REP COMPLETE' : 'READY WHEN YOU ARE'}</div><span>REP {String(rep).padStart(2, '0')}<b>{seconds(frame.time)}</b></span></div>
        <div className="oo-canvas-wrap">
          <PracticeScene frameRef={frameRef} camera={camera} onPlace={mode === 'coach' && !running && frame.time === 0 ? place : undefined} selectedActor={mode === 'coach' ? selectedActor : undefined} showGuides={guides} />
          <div className="oo-on-ice"><span className="oo-player-dot" />{setup.role === 'defender' ? 'YOU DEFEND' : 'YOU ATTACK'}<small>{PRESSURES[setup.pressure]}</small></div>
          <div className="oo-camera-controls"><button aria-label="Toggle camera view" onClick={() => { const next = camera === 'broadcast' ? 'tactical' : 'broadcast'; setCamera(next); cameraRef.current = next; }}>{camera === 'broadcast' ? 'Tactical view' : 'Rink view'}</button><button aria-pressed={guides} onClick={() => setGuides(v => !v)}>Guides {guides ? 'on' : 'off'}</button><button aria-pressed={!audio.muted} onClick={audio.toggle}>Sound {audio.muted ? 'off' : 'on'}</button></div>
          {mode === 'coach' && !running && frame.time === 0 && <div className="oo-place-hint">Tap the ice to place the {selectedActor}.</div>}
          {isLiveControl && !readPause && <div className="oo-touch-controls">
            <div role="group" aria-label="Touch skating control" className="oo-stick" onPointerDown={e => { e.preventDefault(); joystickId.current = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId); moveStick(e); }} onPointerMove={moveStick} onPointerUp={releaseStick} onPointerCancel={releaseStick} onLostPointerCapture={releaseStick}><span style={{ transform: `translate(${joystick.x}px,${joystick.y}px)` }} /><small>SKATE</small></div>
            <button className="oo-action" disabled={!running || replay} onPointerDown={e => { e.preventDefault(); input.current.action = true; }} onClick={e => { if (e.detail === 0) input.current.action = true; }}>{setup.role === 'defender' ? 'POKE' : 'SHOOT'}<small>{setup.role === 'defender' ? 'TAKE THE PUCK' : 'FIND YOUR SHOT'}</small></button>
          </div>}
          {!running && frame.time === 0 && mode !== 'coach' && <button className="oo-ice-start" onClick={start}><span>▶</span>{mode === 'read' ? 'Watch the rush' : 'Step onto the ice'}</button>}
          <span className="oo-art-label">Player art is provisional · Animation & gameplay prototype</span>
        </div>
        <div className="oo-transport">
          <button className="oo-play-button" onClick={running ? stop : start} disabled={readPause}>{running ? 'Ⅱ Pause' : replay ? '▶ Play replay' : frame.outcome ? '↻ Try again' : '▶ Start rep'}</button>
          <div className="oo-timeline"><label htmlFor="oo-timeline">{replay ? 'REPLAY TIMELINE' : 'YOUR REP'} <span>{frame.time.toFixed(1)}s / {(frames.current.at(-1)?.time || 0).toFixed(1)}s</span></label><input id="oo-timeline" aria-label="Replay timeline" type="range" min="0" max={Math.max(0, frames.current.length - 1)} value={cursor.current} onChange={e => scrub(Number(e.target.value))} disabled={frames.current.length < 2} /></div>
          <select aria-label="Playback speed" value={speed} onChange={e => { const v = Number(e.target.value); setSpeed(v); speedRef.current = v; }}><option value={.25}>¼ speed</option><option value={.5}>½ speed</option><option value={1}>1× speed</option></select>
          <button className="oo-reset" onClick={() => reset()} aria-label="Reset repetition">↺</button>
        </div>
        <div className="oo-rink-footer"><span><kbd>W A S D</kbd> or arrow keys to skate <kbd>SPACE</kbd> to {setup.role === 'defender' ? 'poke' : 'shoot'}</span><button onClick={() => { if (frames.current.length > 1) scrub(0); }} disabled={frames.current.length < 2}>Watch my rep ↗</button></div>
      </section>
      <aside className="oo-sidebar">
        <div className="oo-lesson-heading"><span>01</span><p>THE CONCEPT<strong>{setup.role === 'defender' ? 'Own the middle.' : 'Find your space.'}</strong></p></div>
        {readPause ? <section className="oo-read-card" aria-live="polite"><p className="oo-eyebrow">THE MOMENT IS YOURS</p><h2>What is opening up?</h2><p>Read the defender’s position. Choose a move and watch what happens.</p><button onClick={() => choose('inside')}>Cut toward the middle <span>↗</span></button><button onClick={() => choose('outside')}>Use the outside lane <span>↖</span></button><button onClick={() => choose('shoot')}>Take the shot <span>→</span></button><button className="oo-text-button" onClick={takeControl}>I want to skate it myself</button></section>
        : feedback ? <section className="oo-feedback" aria-live="polite"><span className="oo-eyebrow">{String(frame.outcome).toUpperCase()} · REP REVIEW</span><h2>{feedback.title}</h2><p>{feedback.detail}</p><button className="oo-primary" onClick={nextRep}>Another rep <span>→</span></button><button className="oo-secondary" onClick={() => scrub(0)}>Replay this moment</button></section>
        : <div className="oo-lesson-copy"><h2>{mode === 'coach' ? 'One setup. New possibilities.' : mode === 'read' ? 'Look before you move.' : setup.role === 'defender' ? 'Stay in the play.' : 'The defender gives you a clue.'}</h2><p>{mode === 'coach' ? 'Change the gap, the pressure, or the starting position. Run the rush and explore what changes.' : mode === 'read' ? 'Watch the rush. We’ll pause it while you still have time to decide. Then try your read on the ice.' : setup.role === 'defender' ? 'Match the attacker’s movement. Notice when chasing the puck opens a route to the net.' : 'Notice the gap and where the defender is moving. Try a route, protect the puck, and see what happens.'}</p></div>}
        <div className="oo-gap-stat"><div><small>LIVE GAP</small><strong>{gap.toFixed(1)}<span>m</span></strong></div><p>Between attacker<br />and defender</p></div>
        <div className="oo-settings"><label>YOUR SIDE<select aria-label="Your side" value={setup.role} disabled={mode === 'read'} onChange={e => changeSetup('role', e.target.value)}><option value="attacker">Attack · navy #17</option><option value="defender">Defend · gold #8</option></select>{mode === 'read' && <small className="oo-setting-hint">First lesson: attacking reads. Defend in Play mode.</small>}</label><label>DEFENDER BEHAVIOUR<select aria-label="Defender behaviour" value={setup.pressure} onChange={e => changeSetup('pressure', e.target.value)}>{Object.entries(PRESSURES).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select></label>
          {mode === 'coach' && <>
            <label>FORWARD GAP <span>{setup.gap} m</span><input aria-label="Starting gap" type="range" min="2" max="9" step=".5" value={setup.gap} onChange={e => changeSetup('gap', Number(e.target.value))} /></label>
            <label>STARTING SPEED <span>{setup.speed} m/s</span><input aria-label="Starting speed" type="range" min="1" max="6" step=".5" value={setup.speed} onChange={e => changeSetup('speed', Number(e.target.value))} /></label>
            <label>PLACE ON ICE<select aria-label="Player to place" value={selectedActor} onChange={e => setSelectedActor(e.target.value)}><option value="attacker">Attacker</option><option value="defender">Defender</option></select></label>
            <div className="oo-save-row"><button onClick={saveSetup}>Save setup</button><button onClick={loadSetup}>Reopen</button></div>
          </>}
        </div>
        {replay && <button className="oo-primary" onClick={takeControl} disabled={!!frame.outcome}>Play from here <span>→</span></button>}
        {mode === 'coach' && <button className="oo-secondary" disabled={frames.current.length < 2} onClick={() => { try { download({ version: REPLAY_VERSION, mode, status: 'development-not-validated', setup, frames: frames.current }); setNotice('Replay downloaded.'); } catch (e) { setNotice(e.message); } }}>Download replay</button>}
        {notice && <p className="oo-notice" role="status">{notice}</p>}
        <div className="oo-coach-note"><span>↳</span><p><strong>A goal is only part of the story.</strong>Replay the decision, not just the result.</p></div>
      </aside>
    </div>
    <footer className="oo-page-footer"><span>RINKREADS / ONE-ON-ONE LAB</span><p>Development scenarios · Awaiting coach validation and production player art</p></footer>
  </main>;
}
