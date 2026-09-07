import { useCallback, useEffect, useMemo, useState } from 'react';
import { createCurriculumMotion, advanceCurriculumMotion, pauseCurriculumMotion, playCurriculumMotion, sampleCurriculumOpening, curriculumMotionCanAnswer } from './curriculumMotionCore.js';
import './curriculumMotion.css';

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

/** Question-ID scoped presentation state; never writes answers or progress. */
export function useCurriculumMotion(question, availabilityRef) {
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion);
  const [stored, setStored] = useState(() => createCurriculumMotion(question, { reducedMotion }));
  // A new question must be gated on its very first render, before effects run.
  const state = stored.questionId === question.id ? stored : createCurriculumMotion(question, { reducedMotion });
  const available = availabilityRef?.current !== false;
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!media) return undefined;
    const update = () => setReducedMotion(media.matches);
    update(); media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);
  useEffect(() => { setStored(createCurriculumMotion(question, { reducedMotion })); }, [question.id, reducedMotion]);
  useEffect(() => {
    if (state.phase !== 'playing' || reducedMotion || !available) return undefined;
    let frame, start = null, stopped = false;
    const startProgress = state.progress, id = question.id, duration = state.durationMs;
    const tick = now => {
      if (stopped || availabilityRef?.current === false) return;
      if (start === null) start = now;
      const progress = Math.min(1, startProgress + (now - start) / duration);
      setStored(current => !stopped && availabilityRef?.current !== false && current.questionId === id && current.phase === 'playing' ? advanceCurriculumMotion(current, progress) : current);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => { stopped = true; cancelAnimationFrame(frame); };
  }, [question.id, state.phase, reducedMotion, available]);

  const play = useCallback(() => setStored(current => playCurriculumMotion(current.questionId === question.id ? current : createCurriculumMotion(question, { reducedMotion }), { reducedMotion })), [question, reducedMotion]);
  const pause = useCallback(() => setStored(current => current.questionId === question.id ? pauseCurriculumMotion(current) : current), [question.id]);
  const replay = useCallback(() => setStored(current => playCurriculumMotion(current.questionId === question.id ? current : createCurriculumMotion(question, { reducedMotion }), { replay: true, reducedMotion })), [question, reducedMotion]);
  const visual = useMemo(() => sampleCurriculumOpening(question, state.progress), [question, state.progress]);
  return { ...state, visual, playing: state.phase === 'playing', time: state.progress * state.durationMs / 1000,
    canAnswer: curriculumMotionCanAnswer(state), reducedMotion, play, pause, replay };
}

export function CurriculumMotionControls({ motion }) {
  if (!motion.supported) return null;
  const actor = motion.actorId;
  return <div className="gc-motion" aria-label="Opening movement controls">
    <p role="status">{motion.phase === 'ready' ? `Play ${actor}’s move before choosing an answer.` : motion.phase === 'playing' ? `Watch ${actor} move. The play will pause for your answer.` : motion.phase === 'paused' ? 'Movement paused. Continue to see the full change.' : 'The play is paused. Make your read.'}</p>
    <div>{motion.playing ? <button type="button" onClick={motion.pause}>Pause movement</button>
      : motion.phase === 'complete' ? <button type="button" onClick={motion.replay}>Replay {actor}’s move</button>
        : <button type="button" onClick={motion.play}>{motion.phase === 'paused' ? 'Continue movement' : `Play ${actor}’s move`}</button>}</div>
    {motion.reducedMotion && <small>Reduced motion: Play shows the final position without timed animation.</small>}
  </div>;
}
