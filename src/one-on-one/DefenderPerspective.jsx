import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { QuestionBoard } from './CoachQuestionLab.jsx';
import RinkCoordinateInput from './RinkCoordinateInput.jsx';
import { stateToStaticDirectorDraft } from './readSequenceCore.js';
import { canReadAsDefender, createDefenderPerspective, moveDefenderPerspective, submitDefenderPerspective, defenderPerspectiveState, restoreDefenderPerspective, serializeDefenderPerspective, getDefenderPerspectiveStorageKey } from './defenderPerspectiveCore.js';
import './DefenderPerspective.css';

function loadSaved(key) {
  try { return restoreDefenderPerspective(localStorage.getItem(key)); } catch { return null; }
}

export default function DefenderPerspective({ session, playerId, onActiveChange }) {
  const storageKey = getDefenderPerspectiveStorageKey(playerId);
  const [saved, setSaved] = useState(() => loadSaved(storageKey));
  const [attempt, setAttempt] = useState(null);
  const [reason, setReason] = useState('');
  const [notice, setNotice] = useState('');
  const [rinkAvailable, setRinkAvailable] = useState(false), [boardVersion, setBoardVersion] = useState(0);
  const rinkAvailableRef = useRef(false), boardVersionRef = useRef(boardVersion);
  boardVersionRef.current = boardVersion;
  const onRinkAvailability = useCallback(value => {
    if (boardVersionRef.current !== boardVersion) return;
    rinkAvailableRef.current = value === true; setRinkAvailable(value === true);
  }, [boardVersion]);
  const heading = useRef(null);
  const available = canReadAsDefender(session);
  const state = useMemo(() => attempt ? defenderPerspectiveState(attempt) : null, [attempt]);
  const draft = useMemo(() => state ? stateToStaticDirectorDraft(state, 'Defender perspective after the pass') : null, [state]);
  const defender = state?.actors.find(actor => actor.id === 'D1');
  const sourceDefender = attempt?.sourceState.actors.find(actor => actor.id === 'D1');
  const complete = attempt?.status === 'saved-for-coach-discussion' && reason.trim() === attempt.reason;

  useEffect(() => { if (attempt) heading.current?.focus({ preventScroll: true }); }, [Boolean(attempt)]);

  function open(previous = false) {
    try {
      const next = previous ? saved : createDefenderPerspective(session);
      if (!next) return;
      rinkAvailableRef.current = false; setRinkAvailable(false); setBoardVersion(value => value + 1);
      setAttempt(next); setReason(next.reason); setNotice(previous ? 'Your saved defender reflection is open.' : 'The ring highlights D1 for this question. F1 is the original passer.');
      onActiveChange?.(true);
    } catch (error) { setNotice(error.message); }
  }

  function close() { rinkAvailableRef.current = false; setRinkAvailable(false); setBoardVersion(value => value + 1); setAttempt(null); setNotice(''); onActiveChange?.(false); }

  function move(id, point, inputMethod = 'rink') {
    if (!rinkAvailableRef.current) return;
    try { setAttempt(current => rinkAvailableRef.current ? moveDefenderPerspective(current, id, point, inputMethod) : current); setNotice(''); }
    catch (error) { setNotice(error.message); }
  }

  function save() {
    if (!rinkAvailableRef.current) return;
    try {
      const completed = submitDefenderPerspective(attempt, reason);
      setAttempt(completed); setSaved(completed);
      try { localStorage.setItem(storageKey, serializeDefenderPerspective(completed)); setNotice('Your D1 position and optional note are saved on this device.'); }
      catch { setNotice('Your reflection is ready, but device storage is unavailable. Download it to keep a copy.'); }
    } catch (error) { setNotice(error.message); }
  }

  function download() {
    try {
      const url = URL.createObjectURL(new Blob([serializeDefenderPerspective(attempt)], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = 'rinkreads-u11-defender-after-pass.json'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { setNotice(error.message); }
  }

  if (!available && !saved && !attempt) return null;
  return <section className="dp-read" aria-label="Defender perspective after the pass">
    <p className="rs-step">{attempt ? 'DEFENDER PERSPECTIVE · FOCUS ON D1' : available ? session.phase === 'read-2' ? 'PASS COMPLETE · F2 HAS THE PUCK' : 'REVISIT THE COMPLETED PASS' : 'SAVED DEFENDER PERSPECTIVE'}</p>
    <h2 ref={heading} tabIndex="-1">{attempt || available ? 'Where should D1 go now?' : 'Return to your defender read.'}</h2>
    {!attempt ? <>
      <p>{available ? 'The puck moved from F1 to F2. Switch to the defender’s view and place D1. You can add why if you want.' : 'Reopen the position and optional note you saved after your earlier pass.'}</p>
      <div className="dp-actions">{available && <button type="button" className="rs-primary" onClick={() => open()}>Read D1’s next move →</button>}{saved && <button type="button" onClick={() => open(true)}>Reopen saved defender read</button>}</div>
    </> : <>
      <p>F2 has received the pass. D1 defends the right net with the gold goalie. Where should D1 be now? Move the highlighted player, or choose to keep D1 in place.</p>
      <div className="dp-layout">
        <QuestionBoard key={boardVersion} draft={draft} snapshotState={state} title="Focus on D1 · F2 has the puck" focusActorId="D1" selected="D1" onSelect={() => {}} onMove={move} onAvailabilityChange={onRinkAvailability} editableTeam="away" allowedActorIds={['D1']} view="half-right" sceneView />
        <div className="dp-response">
          <div className="rs-cue-card"><b>Look again</b><p>Where is F2 now? Where is F1? What space can D1 protect while still seeing the puck?</p></div>
          {!rinkAvailable && <p role="status">Open the rink before moving D1 or saving. Your position and note stay here while it reloads.</p>}
          <button type="button" disabled={!rinkAvailable} onClick={() => move('D1', { x: sourceDefender.x, y: sourceDefender.y }, 'hold')}>Stay at the starting spot</button>
          <div className="rs-coordinate-row"><label>Rink length<RinkCoordinateInput disabled={!rinkAvailable} step=".5" value={Number(defender.x.toFixed(1))} resetKey={storageKey} onCommit={x => move('D1', { x, y: defender.y }, 'coordinates')} /></label><label>Rink width<RinkCoordinateInput disabled={!rinkAvailable} step=".5" value={Number(defender.y.toFixed(1))} resetKey={storageKey} onCommit={y => move('D1', { x: defender.x, y }, 'coordinates')} /></label></div>
          <label className="rs-reason">Why did you choose that spot? <small>Optional</small><textarea maxLength="600" rows="3" value={reason} onChange={event => setReason(event.target.value)} placeholder="I put D1 here because…" /><small>{reason.length}/600 · You can leave this blank.</small></label>
          <div className="dp-actions"><button type="button" disabled={!rinkAvailable} className="rs-primary" onClick={save}>Save D1’s position</button>{complete && <button type="button" onClick={download}>Download defender reflection</button>}</div>
          {complete && <p className="rs-hint">Ready to discuss with your coach. This position has not received a tactical grade.</p>}
        </div>
      </div>
      <p className="dp-boundary">This defender reflection uses the freeze after your pass. Returning resumes the original attacking play; D1’s placement here does not change that continuation.</p>
      <button type="button" onClick={close}>Return to original attacking play →</button>
    </>}
    {notice && <p className="rs-notice" role="status">{notice}</p>}
  </section>;
}
