import { useRef, useState, useCallback, useEffect } from "react";
import { createAdaptiveLevel, levelT, lerp, rand } from "./gymEngine";
import { getDrill, saveSession } from "./gymStorage";

// "Shoot or Hold" — go / no-go reaction time + inhibition.
// After a random delay the light flashes: blue = SHOOT (tap fast), orange =
// HOLD (don't touch). Tapping early, tapping on orange, or tapping too slow all
// count against you. The response window tightens as the level rises.
//
// Note: the README refers to this drill as "Green Light"; the shipped version
// uses blue/orange instead of green/red so the signal is not red/green alone.

const TRIALS = 16;

export default function ReactionDrill({ playerId = "default", onExit }) {
  const engineRef = useRef(null);
  const timersRef = useRef([]);
  const trialRef = useRef({});
  const rafRef = useRef(0); // kept for symmetry / future use

  const [phase, setPhase] = useState("intro"); // intro | playing | done
  const [trialIndex, setTrialIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [rts, setRts] = useState([]); // reaction times of successful "go" taps
  const [level, setLevel] = useState(() => getDrill(playerId, "reaction").level);
  const [light, setLight] = useState("wait");
  const [saved, setSaved] = useState(null);

  function clearTimers() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }

  function schedule(fn, ms) {
    timersRef.current.push(setTimeout(fn, ms));
  }

  const startTrial = useCallback((index) => {
    clearTimers();
    const t = levelT(engineRef.current.level);
    const windowMs = lerp(900, 450, t);
    const noGoProb = lerp(0.25, 0.4, t);
    const isGo = Math.random() > noGoProb;
    trialRef.current = {
      trialIndex: index,
      isGo,
      windowMs,
      shownAt: null,
      resolved: false,
    };
    setLight("wait");

    schedule(() => {
      trialRef.current.shownAt = performance.now();
      setLight(isGo ? "go" : "nogo");
      schedule(() => {
        const tr = trialRef.current;
        if (!tr.resolved) {
          tr.resolved = true;
          if (tr.isGo) {
            // shown SHOOT but never tapped
            setLight("miss");
            resolve(false);
          } else {
            // held through HOLD — correct
            setLight("held");
            setCorrect((c) => c + 1);
            resolve(true);
          }
        }
      }, windowMs);
    }, rand(700, 1800));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resolve = useCallback(
    (success) => {
      const lvl = engineRef.current.record(success);
      setLevel(lvl);
      const next = trialRef.current.trialIndex + 1;
      schedule(() => {
        if (next >= TRIALS) {
          setPhase("done");
        } else {
          setTrialIndex(next);
          startTrial(next);
        }
      }, 850);
    },
    [startTrial]
  );

  function handleTap() {
    const tr = trialRef.current;
    if (phase !== "playing" || tr.resolved === undefined) return;

    if (tr.shownAt === null) {
      // tapped before the light appeared
      if (tr.resolved) return;
      tr.resolved = true;
      clearTimers();
      setLight("early");
      resolve(false);
      return;
    }

    if (tr.resolved) return;

    if (tr.isGo) {
      tr.resolved = true;
      clearTimers();
      const rt = Math.round(performance.now() - tr.shownAt);
      if (rt <= tr.windowMs) {
        setRts((k) => [...k, rt]);
        setCorrect((k) => k + 1);
        setLight("hit");
        resolve(true);
      } else {
        setLight("miss");
        resolve(false);
      }
    } else {
      // tapped on HOLD
      tr.resolved = true;
      clearTimers();
      setLight("falseAlarm");
      resolve(false);
    }
  }

  function start() {
    engineRef.current = createAdaptiveLevel(getDrill(playerId, "reaction").level);
    setCorrect(0);
    setRts([]);
    setTrialIndex(0);
    setSaved(null);
    setPhase("playing");
    startTrial(0);
  }

  useEffect(() => {
    if (phase === "done" && !saved) {
      const avgRt = rts.length
        ? Math.round(rts.reduce((a, b) => a + b, 0) / rts.length)
        : null;
      const score = Math.round((correct / TRIALS) * 100);
      setSaved(
        saveSession(playerId, "reaction", {
          score,
          level: engineRef.current.level,
          meta: { avgRt },
        })
      );
    }
  }, [phase, saved, correct, rts, playerId]);

  useEffect(() => () => clearTimers(), []);

  const label = {
    wait: "Ready...",
    go: "SHOOT",
    nogo: "HOLD",
    early: "Too early",
    hit: rts.length ? `${rts[rts.length - 1]} ms` : "Hit",
    miss: "Too slow",
    held: "Good hold",
    falseAlarm: "That was a hold",
  }[light];

  const lightClass = {
    wait: "is-wait",
    go: "is-go",
    nogo: "is-nogo",
    early: "is-bad",
    hit: "is-good",
    miss: "is-bad",
    held: "is-good",
    falseAlarm: "is-bad",
  }[light];

  const avgRt = rts.length
    ? Math.round(rts.reduce((a, b) => a + b, 0) / rts.length)
    : null;

  return (
    <div className="gym-drill">
      {phase !== "intro" && <h2 className="gym-drill-title">Shoot or Hold</h2>}
      <div className="gym-drill-bar">
        <button className="gym-btn gym-btn-ghost" onClick={onExit}>
          Back
        </button>
        {phase === "playing" && (
          <button className="gym-btn gym-btn-ghost" onClick={start}>
            Restart
          </button>
        )}
        <span className="gym-chip">Level {level}</span>
        {phase === "playing" && (
          <span className="gym-chip">
            Shot {Math.min(trialIndex + 1, TRIALS)} / {TRIALS}
          </span>
        )}
      </div>

      {phase === "intro" && (
        <div className="gym-card">
          <h2>Shoot or Hold</h2>
          <p className="gym-goal"><strong>Your goal:</strong> fire on blue, stay still on orange, and beat the clock every time.</p>
          <p>
            <strong>The game:</strong> after a random delay the light flashes.{" "}
            <strong>
              Blue says SHOOT, tap as fast as you can. Orange says HOLD, don't
              touch.
            </strong>{" "}
            Tapping before the light, tapping on orange, or tapping too slow all
            count against you. The window gets tighter as you level up.
          </p>
          <div className="gym-trains">
            <strong>Why it matters</strong>
            <span>
              A faster release gets the puck off before the window closes, and
              the discipline to hold stops you from forcing a bad pass or jumping
              offside.
            </span>
          </div>
          <button className="gym-btn" onClick={start}>
            Start
          </button>
        </div>
      )}

      {phase === "playing" && (
        <button
          type="button"
          className={`gym-light ${lightClass}`}
          onMouseDown={handleTap}
          onTouchStart={(e) => {
            e.preventDefault();
            handleTap();
          }}
        >
          {label}
        </button>
      )}

      {phase === "done" && (
        <div className="gym-card">
          <h2>Session complete</h2>
          <div className="gym-score">{Math.round((correct / TRIALS) * 100)}</div>
          <p>
            {correct} of {TRIALS} correct calls.
            {avgRt ? ` Average reaction ${avgRt} ms.` : ""} Level {level}.
          </p>
          <div className="gym-row">
            <button className="gym-btn" onClick={start}>
              Go again
            </button>
            <button className="gym-btn gym-btn-ghost" onClick={onExit}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
