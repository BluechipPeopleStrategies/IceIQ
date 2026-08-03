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

// Session progression: where you started, where you finished, and how far the
// next level is. The old card printed "Level 9. New best." and never showed the
// level the player came in at, so a level-up was indistinguishable from standing
// still (S2-27). Pure presentation — every value comes from state the drill
// already holds, so no storage change was needed.
export function LevelProgress({ from, to, toPromote, upStreak = 3 }) {
  const moved = to !== from;
  const filled = Math.max(0, upStreak - (toPromote ?? upStreak));
  return (
    <div className="gym-progress" aria-label={`Level ${from} to level ${to}`}>
      <div className="gym-progress-levels">
        <span className={moved ? "gym-progress-from was" : "gym-progress-from"}>Level {from}</span>
        {moved && (
          <span className="gym-progress-arrow" aria-hidden="true">
            →
          </span>
        )}
        {moved && <span className="gym-progress-to">Level {to}</span>}
      </div>
      {moved ? (
        <p className="gym-progress-note">
          {to > from ? "You moved up a level this session." : "You dropped a level this session."}
        </p>
      ) : (
        <>
          <div
            className="gym-progress-bar"
            role="img"
            aria-label={`${filled} of ${upStreak} clean reps toward level ${to + 1}`}
          >
            {Array.from({ length: upStreak }, (_, i) => (
              <span key={i} className={i < filled ? "gym-pip on" : "gym-pip"} />
            ))}
          </div>
          <p className="gym-progress-note">
            {toPromote} more clean rep{toPromote === 1 ? "" : "s"} to reach Level {to + 1}.
          </p>
        </>
      )}
    </div>
  );
}

// Points this session against the previous one. Returns null when there is no
// previous session, rather than a hollow "+0".
export function PointsDelta({ points, sessions }) {
  const all = sessions || [];
  if (all.length < 2) return null;
  const prev = all[all.length - 2].points || 0;
  const d = Math.round(points) - prev;
  if (d === 0) return <p className="gym-progress-note">Same as your last session.</p>;
  return (
    <p className="gym-progress-note">
      {d > 0 ? `${d} more` : `${Math.abs(d)} fewer`} than your last session ({prev}).
    </p>
  );
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
