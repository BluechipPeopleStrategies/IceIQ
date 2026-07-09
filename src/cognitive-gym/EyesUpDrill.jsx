import { useRef, useState, useCallback, useEffect } from "react";
import {
  createAdaptiveLevel,
  levelT,
  lerp,
  rand,
  setupCanvas,
  drawRink,
  pointerPos,
} from "./gymEngine";
import { getDrill, saveSession } from "./gymStorage";
import { cue, gymCueHooks } from "./gymAudio";
import { ScoreCount, ConfettiBurst } from "./gymFx";
import { sessionRankLabel } from "./gymProgressCore";
import { pickFlash, scoreTap, flashMs } from "./eyesUpCore";

// "Eyes Up" — peripheral vision.
// A puck sits at center ice the whole rep as a fixation point: keep your eyes on
// it. After a short random wait, one teammate marker flashes briefly out near the
// boards, then vanishes. Tap where it appeared. Closer to the real spot scores
// more; landing in the same region counts as a hit and drives leveling. Higher
// levels flash shorter, push farther into the periphery, and add more possible
// spots. Trains scanning and seeing the back-door without puck-watching.

const TRIALS = 12;
const FEEDBACK_HOLD_MS = 1400; // freeze the result so the player can study the miss

export default function EyesUpDrill({ playerId = "default", onExit }) {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const sceneRef = useRef({});
  const timersRef = useRef([]);
  const rafRef = useRef(0);

  const [phase, setPhase] = useState("intro"); // intro | ready | playing | done
  const [trial, setTrial] = useState(0);
  const [hits, setHits] = useState(0);
  const [level, setLevel] = useState(() => getDrill(playerId, "eyesup").level);
  const [points, setPoints] = useState(0);
  const pointsRef = useRef(0);
  const [last, setLast] = useState(null); // { success, distPx, repPoints }
  const [saved, setSaved] = useState(null);

  function clearTimers() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }
  function schedule(fn, ms) {
    timersRef.current.push(setTimeout(fn, ms));
  }

  // Draw the resting scene: rink, the center fixation puck, and (when set) the
  // flashed teammate marker and/or the marked-up result.
  const render = useCallback(() => {
    const sc = sceneRef.current;
    if (!sc.ctx) return;
    const { ctx, W, H } = sc;
    drawRink(ctx, W, H);

    // in-ice title watermark
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = "#0b1b2b";
    ctx.font = "700 30px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Eyes Up", W / 2, H * 0.16);
    ctx.restore();

    // center fixation puck — keep your eyes here the whole time
    const cx = W / 2;
    const cy = H / 2;
    ctx.fillStyle = "#0b1b2b";
    ctx.beginPath();
    ctx.arc(cx, cy, 9, 0, Math.PI * 2);
    ctx.fill();
    // a thin gold ring around it so the fixation point reads as "look here"
    ctx.strokeStyle = "#f2b705";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.stroke();

    // live flash: a teammate marker out in the periphery (ringed dot — shape, not
    // color alone). Drawn only while sc.showFlash is true.
    if (sc.showFlash && sc.flash) {
      drawTeammate(ctx, sc.flash.x, sc.flash.y);
    }

    // result hold: show where they tapped vs the true flash spot
    if (sc.result && sc.flash) {
      const f = sc.flash;
      // the true spot (ringed dot, gold center so "where it was" is unmistakable)
      ctx.fillStyle = "#f2b705";
      ctx.beginPath();
      ctx.arc(f.x, f.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#0b1b2b";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(f.x, f.y, 13, 0, Math.PI * 2);
      ctx.stroke();
      // the success window around the true spot, so "same region" is visible
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.setLineDash([4, 5]);
      ctx.strokeStyle = "#1b6cb0";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.hitR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      if (sc.tap) {
        // faint line from the tap to the true spot — "how close was I"
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.setLineDash([3, 4]);
        ctx.strokeStyle = "#0b1b2b";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sc.tap.x, sc.tap.y);
        ctx.lineTo(f.x, f.y);
        ctx.stroke();
        ctx.restore();

        // the tap marker — hit is a ringed circle, miss is an X (shape, not color)
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = sc.result.success ? "#1b6cb0" : "#e8590c";
        if (sc.result.success) {
          ctx.beginPath();
          ctx.arc(sc.tap.x, sc.tap.y, 9, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          const s = 8;
          ctx.beginPath();
          ctx.moveTo(sc.tap.x - s, sc.tap.y - s);
          ctx.lineTo(sc.tap.x + s, sc.tap.y + s);
          ctx.moveTo(sc.tap.x + s, sc.tap.y - s);
          ctx.lineTo(sc.tap.x - s, sc.tap.y + s);
          ctx.stroke();
        }
      }
    }
  }, []);

  // A teammate marker: a filled blue dot with a white ring, distinguishable by
  // shape (ringed) so it never relies on color alone.
  function drawTeammate(ctx, x, y) {
    ctx.fillStyle = "#1b6cb0";
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "#0b1b2b";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, 13.5, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Begin one trial: size the canvas, pick the flash spot, then wait a random
  // delay before flashing it for the level's flash duration.
  const startTrial = useCallback((trialIndex) => {
    const canvas = canvasRef.current;
    const host = rootRef.current;
    if (!canvas || !host) return;
    clearTimers();
    const { ctx, W, H } = setupCanvas(canvas, host);
    const flash = pickFlash(engineRef.current.level, W, H);
    sceneRef.current = {
      ctx,
      W,
      H,
      flash,
      showFlash: false,
      tap: null,
      result: null,
      resolved: false,
      armed: false, // becomes true once the flash has been shown (accepts taps)
      trialIndex,
    };
    render();

    // random wait, then flash, then hide
    schedule(() => {
      const sc = sceneRef.current;
      if (sc.resolved) return;
      sc.showFlash = true;
      sc.armed = true;
      render();
      schedule(() => {
        const s = sceneRef.current;
        if (s.resolved) return;
        s.showFlash = false;
        render();
      }, flash.flashMs);
    }, rand(800, 1900));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [render]);

  const resolveTrial = useCallback(
    (success) => {
      pointsRef.current += sceneRef.current.repPoints || 0;
      setPoints(pointsRef.current);
      const lvl = engineRef.current.record(success);
      setLevel(lvl);
      if (success) setHits((h) => h + 1);
      const next = sceneRef.current.trialIndex + 1;
      schedule(() => {
        if (next >= TRIALS) {
          setPhase("done");
        } else {
          setTrial(next);
          startTrial(next);
        }
      }, FEEDBACK_HOLD_MS);
    },
    [startTrial]
  );

  function handleTap(evt) {
    const sc = sceneRef.current;
    if (phase !== "playing" || !sc.flash || sc.resolved) return;
    // ignore taps before the flash has appeared (no peeking the answer)
    if (!sc.armed) return;
    evt.preventDefault();
    const tap = pointerPos(evt, canvasRef.current);
    const result = scoreTap(tap, sc.flash, sc.W, sc.H);
    sc.resolved = true;
    sc.showFlash = false;
    sc.tap = tap;
    sc.result = result;
    sc.repPoints = result.points;
    clearTimers();
    setLast({ success: result.success, distPx: Math.round(result.distPx), repPoints: result.points });
    render();
    resolveTrial(result.success);
  }

  function start() {
    const d = getDrill(playerId, "eyesup");
    engineRef.current = createAdaptiveLevel(d.level, {
      startUps: d.streak.ups,
      startDowns: d.streak.downs,
      ...gymCueHooks(),
    });
    setHits(0);
    setTrial(0);
    setLast(null);
    setSaved(null);
    pointsRef.current = 0;
    setPoints(0);
    setPhase("playing");
    requestAnimationFrame(() => startTrial(0));
  }

  useEffect(() => {
    if (phase === "done" && !saved) {
      const score = Math.round((hits / TRIALS) * 100);
      const record = saveSession(playerId, "eyesup", {
        score,
        points: pointsRef.current,
        level: engineRef.current.level,
        streak: { ups: engineRef.current.ups, downs: engineRef.current.downs },
      });
      setSaved(record);
      cue("fanfare");
    }
  }, [phase, saved, hits, playerId]);

  // Re-fit and redraw on resize without skipping to the next trial.
  useEffect(() => {
    if (phase !== "playing") return;
    const onResize = () => {
      const canvas = canvasRef.current;
      const host = rootRef.current;
      const sc = sceneRef.current;
      if (!canvas || !host || !sc.flash) return;
      const prevW = sc.W;
      const prevH = sc.H;
      const { ctx, W, H } = setupCanvas(canvas, host);
      sc.ctx = ctx;
      // rescale the stored positions so the play stays put
      const kx = W / (prevW || W);
      const ky = H / (prevH || H);
      sc.W = W;
      sc.H = H;
      sc.flash = { ...sc.flash, x: sc.flash.x * kx, y: sc.flash.y * ky, hitR: sc.flash.hitR * Math.min(kx, ky) };
      if (sc.tap) sc.tap = { x: sc.tap.x * kx, y: sc.tap.y * ky };
      render();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [phase, render]);

  useEffect(() => () => { clearTimers(); cancelAnimationFrame(rafRef.current); }, []);

  const lastFlashMs = engineRef.current ? flashMs(engineRef.current.level) : null;

  const bestLabel = phase === "done" && saved ? sessionRankLabel(saved.sessions, Math.round(points)) : null;

  return (
    <div className="gym-drill" ref={rootRef}>
      {phase !== "intro" && <h2 className="gym-drill-title">Eyes Up</h2>}
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
            Look {Math.min(trial + 1, TRIALS)} / {TRIALS}
          </span>
        )}
        {phase === "playing" && (
          <span className="gym-chip">
            {engineRef.current ? `${engineRef.current.toPromote} to level up` : ""}
          </span>
        )}
        {phase === "playing" && <span className="gym-chip">{points} pts</span>}
      </div>

      {phase === "intro" && (
        <div className="gym-card">
          <h2>Eyes Up</h2>
          <svg viewBox="0 0 280 110" width="100%" style={{ maxWidth: 280, display: "block", margin: "0 auto 14px", borderRadius: 10 }} aria-hidden="true">
            <rect width="280" height="110" rx="8" fill="#eaf4fb" />
            {/* center fixation puck with gold ring */}
            <circle cx="140" cy="55" r="8" fill="#0b1b2b" />
            <circle cx="140" cy="55" r="13" fill="none" stroke="#f2b705" strokeWidth="2" />
            {/* a teammate flashing off in the corner (ringed dot) */}
            <circle cx="244" cy="24" r="9" fill="#1b6cb0" stroke="#ffffff" strokeWidth="3" />
            <circle cx="244" cy="24" r="13" fill="none" stroke="#0b1b2b" strokeWidth="1.5" />
          </svg>
          <p className="gym-goal"><strong>Your goal:</strong> keep your eyes on the center puck and catch where a teammate flashes out of the corner of your eye.</p>
          <p>
            <strong>The game:</strong> keep your eyes on the center puck the whole
            time. After a short wait a teammate flashes for a split second out near
            the boards, then disappears. Tap the spot where it appeared. Landing in
            the same region counts, and the closer you are to the exact spot the
            more points you earn. As you level up the flash gets shorter, lands
            farther out toward the boards, and shows up in more places.
          </p>
          <div className="gym-trains">
            <strong>Why it matters</strong>
            <span>
              Hockey is played with your eyes up, not glued to the puck. Catching a
              teammate or a checker out of the corner of your eye is how you make
              the shoulder check, find the back-door option, and feel the play
              around you before you ever turn your head.
            </span>
          </div>
          <button className="gym-btn" onClick={start}>
            Start
          </button>
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="gym-canvas"
        style={{ display: phase === "playing" ? "block" : "none" }}
        onMouseDown={handleTap}
        onTouchStart={handleTap}
      />

      {phase === "playing" && (
        <p className="gym-hint" aria-live="polite">
          {last
            ? last.success
              ? `Eyes up, you caught it. +${last.repPoints} (off by ${last.distPx} px)`
              : `Missed that one, off by ${last.distPx} px. Keep your eyes on the center puck.`
            : "Eyes on the center puck. Tap where the teammate flashes."}
        </p>
      )}

      {phase === "done" && (
        <div className="gym-card">
          <h2>Session complete</h2>
          <ScoreCount value={points} />
          <ConfettiBurst fire={!!bestLabel} />
          {bestLabel && <p className="gym-best">{bestLabel}</p>}
          <p>
            {points} points. {hits} of {TRIALS} flashes caught in the right region.
            Level {level}.
            {saved && (saved.bestPoints || 0) <= points && points > 0
              ? " New best."
              : ""}
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
