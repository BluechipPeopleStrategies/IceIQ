import { useEffect, useRef, useState } from "react";

// Shared celebration FX for drill results cards. Pure presentation: no
// storage, no audio (gymAudio owns sound), safe to render anywhere.

// Counts up from 0 to `value` over ~700ms with an ease-out curve.
export function ScoreCount({ value }) {
  const [shown, setShown] = useState(0);
  const rafRef = useRef(0);
  useEffect(() => {
    const target = Math.max(0, Math.round(value || 0));
    const t0 = performance.now();
    const dur = 700;
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      const eased = 1 - (1 - t) * (1 - t);
      setShown(Math.round(target * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);
  return <div className="gym-score gym-score-pop">{shown}</div>;
}

// A one-shot burst of 14 CSS-animated flecks in the brand gold/blue.
const FLECKS = Array.from({ length: 14 }, (_, i) => i);
export function ConfettiBurst({ fire }) {
  if (!fire) return null;
  return (
    <div className="gym-confetti" aria-hidden="true">
      {FLECKS.map((i) => (
        <span
          key={i}
          className="gym-fleck"
          style={{
            left: `${6 + i * 6.5}%`,
            background: i % 3 === 0 ? "#f2b705" : i % 3 === 1 ? "#1b6cb0" : "#ffffff",
            animationDelay: `${(i % 5) * 60}ms`,
          }}
        />
      ))}
    </div>
  );
}
