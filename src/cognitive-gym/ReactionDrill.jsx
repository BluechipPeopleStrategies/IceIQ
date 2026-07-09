import { useRef, useState, useCallback, useEffect } from "react";
import { createAdaptiveLevel, levelT, lerp, rand } from "./gymEngine";
import { getDrill, saveSession } from "./gymStorage";
import { cue, gymCueHooks } from "./gymAudio";
import { ScoreCount, ConfettiBurst } from "./gymFx";
import { sessionRankLabel } from "./gymProgressCore";
import { reactionPoints } from "./reactionCore";

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
  const [points, setPoints] = useState(0); // graded 0-1000 per trial (reactionCore)
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
      if (isGo) cue("go");
      schedule(() => {
        const tr = trialRef.current;
        if (!tr.resolved) {
          tr.resolved = true;
          if (tr.isGo) {
            // shown SHOOT but never tapped
            setLight("miss");
            setPoints((p) => p + reactionPoints({ kind: "missedGo" }));
            resolve(false);
          } else {
            // held through HOLD — correct
            setLight("held");
            setCorrect((c) => c + 1);
            setPoints((p) => p + reactionPoints({ kind: "hold" }));
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
      setPoints((p) => p + reactionPoints({ kind: "early" }));
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
        setPoints((p) => p + reactionPoints({ kind: "hit", rt, windowMs: tr.windowMs }));
        setLight("hit");
        resolve(true);
      } else {
        setLight("miss");
        setPoints((p) => p + reactionPoints({ kind: "slow" }));
        resolve(false);
      }
    } else {
      // tapped on HOLD (orange) — a turnover; earns nothing
      tr.resolved = true;
      clearTimers();
      setLight("falseAlarm");
      setPoints((p) => p + reactionPoints({ kind: "falseAlarm" }));
      resolve(false);
    }
  }

  // Space bar works the same as a tap/click, so you can play one-handed.
  const handleTapRef = useRef(handleTap);
  useEffect(() => {
    handleTapRef.current = handleTap;
  });
  useEffect(() => {
    if (phase !== "playing") return;
    const onKey = (e) => {
      if ((e.code === "Space" || e.key === " ") && !e.repeat) {
        e.preventDefault();
        handleTapRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  function start() {
    engineRef.current = createAdaptiveLevel(getDrill(playerId, "reaction").level, { ...gymCueHooks() });
    setCorrect(0);
    setRts([]);
    setTrialIndex(0);
    setPoints(0);
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
          points,
          level: engineRef.current.level,
          meta: { avgRt },
        })
      );
      cue("fanfare");
    }
  }, [phase, saved, correct, rts, points, playerId]);

  useEffect(() => () => clearTimers(), []);

  const label = {
    wait: "Ready...",
    go: "SHOOT",
    nogo: "HOLD",
    early: "Jumped early",
    hit: rts.length ? `${rts[rts.length - 1]} ms — shot away!` : "Shot away!",
    miss: "Too slow, window closed",
    held: "Good hold",
    falseAlarm: "Turnover! That was a HOLD",
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

  const bestLabel = phase === "done" && saved ? sessionRankLabel(saved.sessions, Math.round(points)) : null;

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
        {phase === "playing" && <span className="gym-chip">{points} pts</span>}
      </div>

      {phase === "intro" && (
        <div className="gym-card">
          <h2>Shoot or Hold</h2>
          <svg viewBox="0 0 280 110" width="100%" style={{ maxWidth: 280, display: "block", margin: "0 auto 14px", borderRadius: 10 }} aria-hidden="true">
            <rect width="280" height="110" rx="8" fill="#eaf4fb" />
            <circle cx="90" cy="55" r="34" fill="#2e9fe6" />
            <text x="90" y="60" fontSize="13" fontWeight="700" textAnchor="middle" fill="#06283d">SHOOT</text>
            <circle cx="200" cy="55" r="34" fill="#e8590c" />
            <text x="200" y="60" fontSize="14" fontWeight="700" textAnchor="middle" fill="#ffffff">HOLD</text>
          </svg>
          <p className="gym-goal"><strong>Your goal:</strong> fire on blue, stay still on orange, and beat the clock every time.</p>
          <p>
            <strong>The game:</strong> after a random delay the light flashes.{" "}
            <strong>
              Blue says SHOOT, hit the space bar or tap as fast as you can.
              Orange says HOLD, don't touch.
            </strong>{" "}
            Tapping on orange is a turnover and earns nothing. Fast, clean shots
            earn the big points. The window gets tighter as you level up.
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
          <ScoreCount value={points} />
          <ConfettiBurst fire={!!bestLabel} />
          {bestLabel && <p className="gym-best">{bestLabel}</p>}
          <p>
            {correct} of {TRIALS} correct calls. {points} points.
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
