import { useCallback, useEffect, useRef, useState } from 'react';

/** Readiness belongs to this question and exact visual, never the previous canvas. */
export function useQuestionVisualGate(question, attempt = 0, enabled = true) {
  const requiresVisual = enabled && !!question?.media?.url && (!question.media.type || question.media.type === 'image');
  const key = JSON.stringify([question?.id || null, attempt, requiresVisual ? question.media : null, requiresVisual ? question.overlays || null : null]);
  const gate = useRef(null), mounted = useRef(true), [revision, refresh] = useState(0);
  if (gate.current?.key !== key) gate.current = { key, ready: !requiresVisual, elapsed: 0, since: !requiresVisual ? Date.now() : null };
  const currentGate = gate.current;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const onAvailabilityChange = useCallback(value => {
    if (!mounted.current || gate.current !== currentGate || typeof value !== 'boolean') return;
    const current = gate.current;
    if (current.ready === value) return;
    if (current.since !== null) current.elapsed += Math.max(0, Date.now() - current.since);
    current.ready = value; current.since = value ? Date.now() : null;
    refresh(value => value + 1);
  }, [key]);
  const canAnswer = () => mounted.current && gate.current === currentGate && gate.current.ready;
  const visibleMs = () => gate.current === currentGate ? gate.current.elapsed + (gate.current.since === null ? 0 : Math.max(0, Date.now() - gate.current.since)) : 0;
  return { key, requiresVisual, ready: gate.current.ready, revision, onAvailabilityChange, canAnswer, visibleMs, timerStartedAt: Date.now() - visibleMs() };
}
