import { HockeyPlayerArt } from "../visuals/HockeyPlayerArt.jsx";
import { useRef, useState, useCallback, useEffect } from "react";
import { drawHockeyPlayer, drawHockeyPuck, drawHockeyLabel } from "../visuals/hockeyArtCanvas.js";
import { createAdaptiveLevel, setupCanvas, pointerPos, drawRink, REPS_PER_SESSION } from "./gymEngine";
import { getDrill, saveSession } from "./gymStorage";
import { cue, gymCueHooks } from "./gymAudio";
import { ScoreCount, ConfettiBurst, SessionSummary } from "./gymFx";
import { sessionRankLabel } from "./gymProgressCore";
import {
  seqLen,
  skaterCount,
  stepMs,
  makeSkaters,
  makeSequence,
  skaterAtPoint,
  scoreRun,
} from "./runThePlayCore";

// "Run the Play" — Simon on ice. The coach calls a passing play: the puck
// moves skater to skater, each catch lights the skater up with its own note.
// Then it's your turn: run the play back by tapping the skaters in the same
// order. One wrong tap ends the rep (Simon rules); partial recall still pays
// points. Higher levels: longer plays, more skaters, faster playback.
//
// The play happens inside ONE end zone, attacking up the screen. It used to be
// laid out across a full 200-foot sheet, so the puck could travel the length of
// the rink and skaters sat on both sides of both blue lines with no puck
// established — every sequence was offside on paper, and the markers were tiny.
// Decision 1, docs/manual-playtest/2026-08-03-decisions-round3.md.

const REPS = REPS_PER_SESSION;
const ZONE_ASPECT = 21.3 / 30; // height / width of one end zone
const HOLD_AFTER_WATCH_MS = 350;

// Fixed jersey numbers by skater index, so the same skater keeps its number
// (and its note) all session.
const JERSEYS = [9, 16, 7, 29, 19, 87, 97];

export default function RunThePlayDrill({ playerId = "default", onExit }) {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const sceneRef = useRef({});
  const rafRef = useRef(0);
  const timersRef = useRef([]);
  const pointsRef = useRef(0);

  const [phase, setPhase] = useState("intro"); // intro | playing | done
  const [rep, setRep] = useState(0);
  const [hits, setHits] = useState(0);
  const [level, setLevel] = useState(() => getDrill(playerId, "runtheplay").level);
  const [points, setPoints] = useState(0);
  const [stage, setStage] = useState("ready"); // ready | watch | recall | reveal
  const [last, setLast] = useState(null);
  const [saved, setSaved] = useState(null);
  const [combo, setCombo] = useState(0);
  const [tapCount, setTapCount] = useState(0);

  function clearTimers() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
  }
  function schedule(fn, ms) {
    timersRef.current.push(setTimeout(fn, ms));
  }

  function drawSkater(ctx, s, idx, { lit = false, wrong = false, dim = false } = {}) {
    ctx.save(); ctx.globalAlpha = dim ? .45 : 1;
    const jersey = wrong ? "#c8102e" : lit ? "#f2b705" : "#0B1A33";
    drawHockeyPlayer(ctx, { ...s, r: s.r * (lit ? 1.15 : 1), jersey });
    ctx.strokeStyle = "#0B1A33"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r * (lit ? 1.15 : 1), 0, Math.PI * 2); ctx.stroke();
    if (lit) {
      ctx.strokeStyle = "#f2b705"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 1.5, 0, Math.PI * 2); ctx.stroke();
    }
    drawHockeyLabel(ctx, JERSEYS[idx % JERSEYS.length], s.x, s.y, s.r,
      { ink: lit ? "#0B1A33" : "#F5EFE6", plate: jersey, scale: .85 });
    ctx.restore();
  }

  function drawPuck(ctx, x, y, r) {
    drawHockeyPuck(ctx, x, y, r, { ringWidth: Math.max(1.5, r * .35), ringColour: "#ffffff" });
  }

  const render = useCallback(() => {
    const sc = sceneRef.current;
    if (!sc.ctx) return;
    const { ctx, W, H, skaters, seq } = sc;
    ctx.clearRect(0, 0, W, H);
    drawRink(ctx, W, H, { orientation: "portrait", zone: "end" });
    if (!skaters) return;

    if (sc.stage === "watch") {
      const elapsed = performance.now() - sc.watchStart;
      const step = Math.min(Math.floor(elapsed / sc.stepMs), seq.length - 1);
      const frac = Math.min((elapsed - step * sc.stepMs) / sc.stepMs, 1);
      // sound the catch once per step
      if (step !== sc.lastCuedStep && frac > 0.15) {
        sc.lastCuedStep = step;
        cue(`note${seq[step]}`);
      }
      skaters.forEach((s, i) => {
        const lit = i === seq[step] && frac > 0.15;
        drawSkater(ctx, s, i, { lit });
      });
      // the puck travelling into the current catch
      const to = skaters[seq[step]];
      const from = step === 0 ? { x: W / 2, y: H + 20 } : skaters[seq[step - 1]];
      const f = Math.min(frac / 0.85, 1);
      drawPuck(ctx, from.x + (to.x - from.x) * f, from.y + (to.y - from.y) * f, Math.max(5, W * 0.012));
    } else if (sc.stage === "recall") {
      skaters.forEach((s, i) => {
        const lit = sc.taps.length > 0 && i === sc.taps[sc.taps.length - 1] && performance.now() - sc.lastTapTs < 260;
        drawSkater(ctx, s, i, { lit });
      });
    } else if (sc.stage === "reveal") {
      // the true play: dashed pass lines with order badges
      ctx.save();
      ctx.strokeStyle = "#1f9d55";
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 6]);
      for (let i = 1; i < seq.length; i += 1) {
        const a = skaters[seq[i - 1]];
        const b = skaters[seq[i]];
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      ctx.restore();
      skaters.forEach((s, i) => drawSkater(ctx, s, i, { dim: !seq.includes(i), wrong: i === sc.wrongTap }));
      // order badges along the play
      seq.forEach((skIdx, i) => {
        const s = skaters[skIdx];
        const bx = s.x + s.r * 1.15;
        const by = s.y - s.r * 1.15;
        ctx.save();
        ctx.fillStyle = i < sc.result.correctPrefix ? "#1f9d55" : "#e8590c";
        ctx.beginPath();
        ctx.arc(bx, by, Math.max(8, s.r * 0.55), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = `700 ${Math.max(9, Math.round(s.r * 0.6))}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(i + 1), bx, by);
        ctx.restore();
      });
    } else {
      skaters.forEach((s, i) => drawSkater(ctx, s, i));
    }
  }, []);

  const tick = useCallback(() => {
    const sc = sceneRef.current;
    if (sc.stage === "watch") {
      render();
      const total = sc.seq.length * sc.stepMs + HOLD_AFTER_WATCH_MS;
      if (performance.now() - sc.watchStart >= total) {
        sc.stage = "recall";
        sc.taps = [];
        setStage("recall");
        setTapCount(0);
        render();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    } else if (sc.stage === "recall") {
      render();
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [render]);

  const startRep = useCallback((repIndex) => {
    const canvas = canvasRef.current;
    const host = rootRef.current;
    if (!canvas || !host) return;
    clearTimers();
    // A zone is 21.3 m deep by 30 m wide, so the canvas takes that aspect
    // rather than the gym's default 0.62 — otherwise the ice is drawn to scale
    // on a surface that is not, and the crease comes out oval.
    const { ctx, W, H } = setupCanvas(canvas, host, ZONE_ASPECT);
    const lvl = engineRef.current.level;
    const skaters = makeSkaters(skaterCount(lvl), W, H);
    const seq = makeSequence(skaters.length, seqLen(lvl));
    sceneRef.current = {
      ctx, W, H, skaters, seq,
      stepMs: stepMs(lvl),
      stage: "ready",
      watchStart: null,
      lastCuedStep: -1,
      taps: [],
      lastTapTs: 0,
      wrongTap: null,
      result: null,
      repIndex,
    };
    setStage("ready");
    setTapCount(0);
    render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [render]);

  function go() {
    const sc = sceneRef.current;
    if (!sc.ctx || sc.stage !== "ready") return;
    cue("go");
    sc.stage = "watch";
    sc.watchStart = performance.now();
    setStage("watch");
    rafRef.current = requestAnimationFrame(tick);
  }

  const resolveRep = useCallback((result, wrongTap) => {
    const sc = sceneRef.current;
    sc.stage = "reveal";
    sc.result = result;
    sc.wrongTap = wrongTap;
    clearTimers();
    setStage("reveal");
    pointsRef.current += result.points;
    setPoints(pointsRef.current);
    const lvl = engineRef.current.record(result.success);
    setLevel(lvl);
    setCombo(engineRef.current.combo);
    if (result.success) setHits((h) => h + 1);
    setLast(result);
    render();
  }, [render]);

  function onCanvasTap(evt) {
    const sc = sceneRef.current;
    if (sc.stage !== "recall") return;
    const p = pointerPos(evt, canvasRef.current);
    const idx = skaterAtPoint(sc.skaters, p.x, p.y);
    if (idx < 0) return;
    const expected = sc.seq[sc.taps.length];
    sc.taps.push(idx);
    sc.lastTapTs = performance.now();
    setTapCount(sc.taps.length);
    if (idx !== expected) {
      resolveRep(scoreRun(sc.taps, sc.seq), idx);
      return;
    }
    cue(`note${idx}`);
    if (sc.taps.length === sc.seq.length) {
      resolveRep(scoreRun(sc.taps, sc.seq), null);
    }
  }

  function advanceRep() {
    const next = sceneRef.current.repIndex + 1;
    if (next >= REPS) {
      setPhase("done");
    } else {
      setRep(next);
      startRep(next);
    }
  }

  // The level the player came in at, so the results card can show the move
  // rather than just the destination (S2-27).
  const startLevelRef = useRef(1);

  function start() {
    const d = getDrill(playerId, "runtheplay");
    startLevelRef.current = d.level;
    engineRef.current = createAdaptiveLevel(d.level, {
      startUps: d.streak.ups,
      startDowns: d.streak.downs,
      ...gymCueHooks(),
    });
    setHits(0);
    setRep(0);
    setLast(null);
    setSaved(null);
    setCombo(0);
    pointsRef.current = 0;
    setPoints(0);
    setPhase("playing");
    requestAnimationFrame(() => startRep(0));
  }

  useEffect(() => {
    if (phase === "done" && !saved) {
      const score = Math.round((hits / REPS) * 100);
      const record = saveSession(playerId, "runtheplay", {
        score,
        points: pointsRef.current,
        level: engineRef.current.level,
        streak: { ups: engineRef.current.ups, downs: engineRef.current.downs },
        meta: { bestCombo: engineRef.current.bestCombo },
      });
      setSaved(record);
      cue("fanfare");
    }
  }, [phase, saved, hits, playerId]);

  useEffect(() => () => clearTimers(), []);

  // Action Rail rule 7: Space fires the one primary rail action, everywhere in
  // the gym. Nothing here is reachable only by pointer.
  useEffect(() => {
    if (phase !== "playing") return undefined;
    const onKey = (e) => {
      if (e.code !== "Space" && e.key !== " ") return;
      if (stage === "ready") {
        e.preventDefault();
        go();
      } else if (stage === "reveal") {
        e.preventDefault();
        advanceRep();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, stage]);

  const sc = sceneRef.current;
  const hint = {
    ready: "Tap Go and watch the coach's play. Every pass has its own sound.",
    watch: "Watch the play. Remember the order.",
    recall: `Your turn: run it back. Pass ${Math.min(tapCount + 1, sc.seq ? sc.seq.length : 1)} of ${sc.seq ? sc.seq.length : ""}.`,
    reveal: last
      ? last.success
        ? `Play ran clean! +${last.points}${combo >= 2 ? ` — ${combo} in a row` : ""}`
        : `You held ${last.correctPrefix} of ${sc.seq ? sc.seq.length : 0} passes. +${last.points}. Watch the numbers.`
      : "",
  }[stage];

  const bestLabel = phase === "done" && saved ? sessionRankLabel(saved.sessions, Math.round(points)) : null;

  return (
    <div className="gym-drill" ref={rootRef}>
      {phase !== "intro" && <h2 className="gym-drill-title">Run the Play</h2>}
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
            Play {Math.min(rep + 1, REPS)} / {REPS}
          </span>
        )}
        {phase === "playing" && sc.seq && <span className="gym-chip">{sc.seq.length} passes</span>}
        {phase === "playing" && combo >= 2 && <span className="gym-chip">🔥 x{combo}</span>}
        {phase === "playing" && <span className="gym-chip">{points} pts</span>}
      </div>

      {phase === "intro" && (
        <div className="gym-card">
          <h2>Run the Play</h2>
          <svg viewBox="0 0 280 150" width="100%" style={{ maxWidth: 280, display: "block", margin: "0 auto 14px", borderRadius: 10 }} aria-hidden="true">
            <rect width="280" height="150" rx="8" fill="#eaf4fb" />
            <line x1="60" y1="98" x2="140" y2="40" stroke="#1f9d55" strokeWidth="2.5" strokeDasharray="6 6" />
            <line x1="140" y1="40" x2="215" y2="88" stroke="#1f9d55" strokeWidth="2.5" strokeDasharray="6 6" />
            <g transform="translate(60,98)"><circle r="16" fill="#F5EFE6" stroke="#0b1b2b" strokeWidth="2.5" /><HockeyPlayerArt radius={15.04} team="home" /></g>
            <g transform="translate(140,40)"><circle r="16" fill="#F5EFE6" stroke="#0b1b2b" strokeWidth="2.5" /><HockeyPlayerArt radius={15.04} team="away" /></g>
            <g transform="translate(215,88)"><circle r="16" fill="#F5EFE6" stroke="#0b1b2b" strokeWidth="2.5" /><HockeyPlayerArt radius={15.04} team="home" /></g>
            <text x="60" y="103" textAnchor="middle" fontSize="13" fontWeight="700" fill="#f4f9fc" fontFamily="system-ui, sans-serif">9</text>
            <text x="140" y="45" textAnchor="middle" fontSize="13" fontWeight="700" fill="#0b1b2b" fontFamily="system-ui, sans-serif">16</text>
            <text x="215" y="93" textAnchor="middle" fontSize="13" fontWeight="700" fill="#f4f9fc" fontFamily="system-ui, sans-serif">7</text>
            <circle cx="75" cy="112" r="7" fill="#0b1b2b" stroke="#ffffff" strokeWidth="2" />
            <circle cx="163" cy="30" r="10" fill="none" stroke="#1f9d55" strokeWidth="2.5" />
            <text x="163" y="34" textAnchor="middle" fontSize="11" fontWeight="700" fill="#1f9d55" fontFamily="system-ui, sans-serif">2</text>
          </svg>
          <p className="gym-goal"><strong>Your goal:</strong> watch the passing order, then tap it back.</p>
          <p>
            <strong>The game:</strong> tap Go and watch which skaters light up
            as the puck moves. Then tap them in the same order. A different tap
            ends the round; the steps you matched still earn points. Higher
            levels have longer sequences and faster passes.
          </p>
          <div className="gym-trains">
            <strong>Talk hockey</strong>
            <span>
              Tell a coach who received the puck first, next, and last. Which
              part of a passing play would you like to see again?
            </span>
          </div>
          <button className="gym-btn" onClick={start}>
            Start
          </button>
        </div>
      )}

      <div className="gym-stage" style={{ display: phase === "playing" ? "block" : "none" }}>
        <canvas
          ref={canvasRef}
          className="gym-canvas"
          onPointerDown={onCanvasTap}
        />

        {/* Action Rail: exactly one primary action, in the same place every
            stage, inside the play surface. makeSkaters keeps skaters out of
            this band so a control never lands on a tap target. */}
        {phase === "playing" && stage === "ready" && (
          <div className="gym-rail">
            <button className="gym-btn" onClick={go}>
              Go
              <kbd className="gym-key">space</kbd>
            </button>
          </div>
        )}
        {phase === "playing" && stage === "reveal" && (
          <div className="gym-rail">
            <button className="gym-btn" onClick={advanceRep}>
              {rep + 1 >= REPS ? "See the result" : "Next play"}
              <kbd className="gym-key">space</kbd>
            </button>
          </div>
        )}
      </div>

      {phase === "playing" && (
        <p className="gym-hint" aria-live="polite">
          {hint}
        </p>
      )}

      {phase === "done" && (
        <div className="gym-card">
          <h2>Session complete</h2>
          <ScoreCount value={points} />
          <ConfettiBurst fire={!!bestLabel} />
          {bestLabel && <p className="gym-best">{bestLabel}</p>}
          {/* sessionRankLabel above already says "Personal best!", so the old
              trailing " New best." said it twice — and its `<=` printed it on a
              TIE. The level now lives in SessionSummary. */}
          <SessionSummary
            from={startLevelRef.current}
            to={level}
            engine={engineRef.current}
            points={points}
            saved={saved}
          />
          <p>
            {points} points. {hits} of {REPS} plays run clean.
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
