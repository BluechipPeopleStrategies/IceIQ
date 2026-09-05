import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createReadSequenceRecall, checkReadSequenceRecallOrder, moveReadSequenceRecallCard } from './readSequenceRecall.js';
import { getReadSequenceRecallStorageKey, restoreReadSequenceRecallAttempt, serializeReadSequenceRecallAttempt } from './readSequenceRecallStorage.js';
import { speakParts, stopSpeaking, ttsSupported } from '../speak.js';
import './ReadSequenceRecall.css';

function loadAttempt(key, session) {
  try { return restoreReadSequenceRecallAttempt(localStorage.getItem(key), session); }
  catch { return null; }
}

export default function ReadSequenceRecall({ session, playerId, renderBoard, draftAccess }) {
  const recall = useMemo(() => createReadSequenceRecall(session), [session]);
  const storageKey = getReadSequenceRecallStorageKey(playerId, session.scenarioId);
  const [initial] = useState(() => {
    const draft = draftAccess?.get();
    const attempt = draft && restoreReadSequenceRecallAttempt(draft.serialized, session);
    if (attempt) return { saved: attempt, checked: draft.checked, savedHere: draft.savedHere, open: draft.open };
    const saved = loadAttempt(storageKey, session);
    return { saved, checked: Boolean(saved), savedHere: Boolean(saved), open: false };
  });
  const saved = initial.saved;
  const [open, setOpen] = useState(initial.open);
  const [order, setOrder] = useState(() => saved?.order || recall.initialOrder);
  const [reason, setReason] = useState(saved?.reason || '');
  const [usedAnswer, setUsedAnswer] = useState(saved?.usedAnswer || false);
  const [result, setResult] = useState(initial.checked ? { matchesPlay: saved.matchesPlay } : null);
  const [notice, setNotice] = useState(initial.savedHere ? 'Your saved order and note are open.' : saved ? 'Your unfinished recall is open. Check to save your order and note.' : '');
  const [inspecting, setInspecting] = useState(null);
  const [savedHere, setSavedHere] = useState(initial.savedHere);
  const heading = useRef(null);
  const inspectionHeading = useRef(null);
  const feedbackHeading = useRef(null);
  const cardButtons = useRef(new Map());
  const lastInspectButton = useRef(null);
  const pendingFocus = useRef(null);
  const contentId = useId();
  const isYoung = recall.fixedOpening;
  const title = isYoung ? 'Put your play in order.' : 'Rebuild the play you watched.';
  const prompt = isYoung ? 'The first picture is in place. Put the other two in the order you watched.' : 'Put these three moments in order. Follow the puck and the players.';
  const inspectedCard = recall.cards.find(card => card.id === inspecting);

  useEffect(() => () => { stopSpeaking(); cancelAnimationFrame(pendingFocus.current); }, []);
  useEffect(() => {
    draftAccess?.remember({ serialized: serializeReadSequenceRecallAttempt(session, { order, reason, usedAnswer }), checked: Boolean(result), savedHere, open });
  }, [session, order, reason, usedAnswer, result, savedHere, open, draftAccess]);

  function focusAfterRender(ref, scroll = false) {
    cancelAnimationFrame(pendingFocus.current);
    pendingFocus.current = requestAnimationFrame(() => {
      const element = typeof ref === 'function' ? ref() : ref.current;
      if (!element) return;
      if (scroll) element.scrollIntoView({ block: 'start', behavior: 'auto' });
      element.focus({ preventScroll: true });
    });
  }

  function toggle() {
    stopSpeaking();
    setOpen(value => !value);
    if (!open) focusAfterRender(heading, true);
  }

  function move(card, direction) {
    stopSpeaking();
    try {
      const next = moveReadSequenceRecallCard(recall, order, card.id, direction);
      setOrder(next);
      setResult(null);
      setSavedHere(false);
      setNotice(`${card.caption} is now in place ${next.indexOf(card.id) + 1}. Check your order when you are ready.`);
      // Keep focus with the same card even when its move button becomes disabled.
      focusAfterRender(() => cardButtons.current.get(card.id));
    } catch (error) { setNotice(error.message); }
  }

  function inspect(card, button) {
    stopSpeaking();
    lastInspectButton.current = button;
    setInspecting(card.id);
    focusAfterRender(inspectionHeading, true);
  }

  function closeInspection() {
    stopSpeaking();
    setInspecting(null);
    focusAfterRender(() => lastInspectButton.current, true);
  }

  function check() {
    try {
      const checked = checkReadSequenceRecallOrder(recall, order);
      const serialized = serializeReadSequenceRecallAttempt(session, { order, reason, usedAnswer });
      setResult(checked);
      try {
        localStorage.setItem(storageKey, serialized);
        setSavedHere(true);
        setNotice('Your order and note are saved on this device.');
      } catch {
        setSavedHere(false);
        setNotice('Your order was checked, but this browser could not save it. Keep this page open to discuss it.');
      }
      focusAfterRender(feedbackHeading, true);
    } catch (error) { setNotice(error.message); }
  }

  function showOrder() {
    stopSpeaking();
    setOrder([...recall.chronologicalIds]);
    setUsedAnswer(true);
    setResult(null);
    try {
      localStorage.setItem(storageKey, serializeReadSequenceRecallAttempt(session, { order: recall.chronologicalIds, reason, usedAnswer: true }));
      setSavedHere(true);
      setNotice('The play order is showing. This order and your use of help are saved on this device.');
    } catch {
      setSavedHere(false);
      setNotice('The play order is showing. This browser could not save your use of help; keep this page open to discuss it.');
    }
    focusAfterRender(heading, true);
  }

  function retry() {
    stopSpeaking();
    setOrder([...recall.initialOrder]);
    setResult(null);
    setSavedHere(false);
    setNotice(usedAnswer ? 'The pictures are mixed again. Your reflection will still say you used Show the order.' : 'The pictures are mixed again. Follow what changed.');
    focusAfterRender(heading, true);
  }

  function download() {
    try {
      const blob = new Blob([serializeReadSequenceRecallAttempt(session, { order, reason, usedAnswer })], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rinkreads-${recall.ageBand.toLowerCase()}-play-recall.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (error) { setNotice(error.message); }
  }

  return <section className="rs-recall" aria-label="Optional play recall">
    <div className="rs-recall-intro"><div><p className="rs-step">OPTIONAL · REMEMBER THE PLAY</p><h2>{title}</h2><p>Look back at the moments from the play you made.</p></div><span className="rs-recall-pill">{isYoung ? 'U9 · Two pictures to place' : 'U11 · Three moments'}</span></div>
    <button type="button" aria-expanded={open} aria-controls={contentId} onClick={toggle}>{open ? 'Close play recall' : savedHere ? 'Open my saved recall' : 'Try play recall'}</button>
    {open && <div id={contentId} className="rs-recall-body">
      <div className="rs-recall-task"><h3 ref={heading} tabIndex="-1">{prompt}</h3><p>Use Earlier and Later to change your order. Open any rink picture for a closer look.</p>
        {ttsSupported() && <div className="rs-recall-tools"><button type="button" onClick={() => speakParts([prompt, ...order.map(id => recall.cards.find(card => card.id === id).description)], { rate: isYoung ? .88 : .95 })}>Read the moments aloud</button><button type="button" onClick={stopSpeaking}>Stop reading moments</button></div>}
      </div>
      {inspectedCard && <section className="rs-recall-inspection" aria-label="Full rink picture">
        <div className="rs-recall-inspection-title"><h3 ref={inspectionHeading} tabIndex="-1">{inspectedCard.caption}</h3><button type="button" onClick={closeInspection}>Back to my order</button></div>
        <p>{inspectedCard.description}</p>
        {renderBoard(inspectedCard.state, inspectedCard.description)}
      </section>}
      <ol className="rs-recall-order" aria-label="Your play order">
        {order.map((id, index) => {
          const card = recall.cards.find(item => item.id === id);
          const locked = isYoung && index === 0;
          return <li key={id} className={locked ? 'rs-recall-fixed' : ''}>
            <div className="rs-recall-card-head"><span className="rs-recall-place">{index + 1}</span><span>{locked ? 'Opening · in place' : 'Your order'}</span></div>
            <button type="button" className="rs-recall-picture" ref={element => element ? cardButtons.current.set(id, element) : cardButtons.current.delete(id)} aria-label={`Open rink picture: ${card.caption}`} onClick={event => inspect(card, event.currentTarget)}>
              <div aria-hidden="true" className="rs-recall-thumbnail">{renderBoard(card.state, card.description)}</div><span>Look closer ↗</span>
            </button>
            <h4>{card.caption}</h4><p>{card.description}</p>
            {locked ? <p className="rs-recall-locked">Start here. Place the next two moments.</p> : <div className="rs-recall-moves"><button type="button" disabled={index <= (isYoung ? 1 : 0)} aria-label={`Move ${card.caption} earlier`} onClick={() => move(card, -1)}>↑ Earlier</button><button type="button" disabled={index === order.length - 1} aria-label={`Move ${card.caption} later`} onClick={() => move(card, 1)}>↓ Later</button></div>}
          </li>;
        })}
      </ol>
      <label className="rs-reason rs-recall-reason">{isYoung ? 'Who had the puck next? (Optional)' : 'What changed between the pictures? (Optional)'}<textarea rows="3" maxLength="600" value={reason} onChange={event => { setReason(event.target.value); setSavedHere(false); setNotice('Your note changed. Check again to save the edited note.'); }} placeholder={isYoung ? 'The puck went…' : 'I noticed…'} /><small>{reason.length}/600</small></label>
      <div className="rs-recall-tools"><button type="button" className="rs-primary" onClick={check}>Check my order</button><button type="button" onClick={showOrder}>Show the order</button><button type="button" onClick={retry}>Mix the pictures again</button></div>
      {result && <div className="rs-recall-feedback" data-matches={result.matchesPlay}>
        <h3 ref={feedbackHeading} tabIndex="-1">{result.matchesPlay ? 'That matches the order you watched.' : 'Take another look at what changed.'}</h3>
        <p>{result.matchesPlay ? 'Now tell a coach what changed from one moment to the next.' : 'These moments appeared in a different order in your play. Use the captions and larger pictures, or Show the order for help.'}</p>
        {usedAnswer && <p>You used Show the order. Your recall records this help.</p>}
        <p className="rs-hint">This checks the order shown. Discuss your hockey choices and support plan with a coach.</p>
        <button type="button" onClick={download}>Download recall</button>
      </div>}
      <p className="rs-notice" role="status">{notice || 'Your order and optional note save on this device when you check.'}</p>
      <details className="rs-recall-boundary"><summary>For the coach</summary><p>The three pictures are the opening and the results of the first two chosen actions. The final support plan stays in the main reflection: it can finish in the same position and is not another ordering card. This exercise checks chronology, not tactical correctness, scanning skill or on-ice transfer. No score, mastery mark or AI opinion is added.</p><p>Teaching basis: scanning before and after receiving; noticing support and pressure again as the puck changes. New recall content remains a coach-review draft.</p></details>
    </div>}
  </section>;
}
