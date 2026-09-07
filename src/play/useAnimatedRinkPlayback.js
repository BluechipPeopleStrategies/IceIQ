import { useEffect, useState } from 'react';
import { animatedEntryDuration } from './animatedRinkAdapter.js';
import { motionTimings, visibleMotions } from './motionGeometry.js';

/** One visible opening, then a stable decision freeze. No clock runs offscreen. */
export function useAnimatedRinkPlayback(node, key, available, paused, availabilityRef) {
  const [stored, setStored] = useState({ key, elapsed: 0 });
  const [reducedMotion] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true);
  const elapsed = stored.key === key ? stored.elapsed : 0;
  const entryDuration = animatedEntryDuration(node);
  const routeDuration = Math.max(0, ...motionTimings(visibleMotions(node).map(item => item.motion)).map(timing => timing.delayMs + 500));
  const duration = Math.max(entryDuration, routeDuration, node.autoNext ? node.autoNext.ms ?? 2600 : 0);
  useEffect(() => { setStored({ key, elapsed: 0 }); }, [key]);
  useEffect(() => {
    if (!available || paused || reducedMotion || elapsed >= duration) return undefined;
    let frame, start = null, stopped = false;
    const initialElapsed = elapsed;
    const tick = now => {
      if (stopped || availabilityRef?.current === false) return;
      if (start === null) start = now;
      const next = Math.min(duration, initialElapsed + now - start);
      setStored(current => !stopped && availabilityRef?.current !== false && current.key === key ? { key, elapsed: next } : current);
      if (next < duration) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => { stopped = true; cancelAnimationFrame(frame); };
  }, [key, available, paused, reducedMotion, duration, availabilityRef]);
  return {
    elapsed, duration, reducedMotion,
    progress: entryDuration ? Math.min(1, elapsed / entryDuration) : 1,
    playing: available && !paused && !reducedMotion && elapsed < duration,
    canAnswer: available && !paused && elapsed >= entryDuration,
    watchFinished: !!node.autoNext && elapsed >= (node.autoNext.ms || 2600),
    finish: () => { if (available) setStored({ key, elapsed: duration }); },
  };
}
