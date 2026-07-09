import { useRef, useState, useCallback, useEffect } from "react";
import {
  createAdaptiveLevel,
  levelT,
  lerp,
  setupCanvas,
  drawRink,
} from "./gymEngine";
import { getDrill, saveSession } from "./gymStorage";
import { cue, gymCueHooks } from "./gymAudio";
import { ScoreCount, ConfettiBurst } from "./gymFx";
import { sessionRankLabel } from "./gymProgressCore";
import { makeRound, scoreRead } from "./readNumbersCore";

// "Read the Numbers" — dynamic visual acuity.
// A skater wearing a jersey NUMBER streaks across the rink and disappears. The
// player reads the number, then picks it from four choice buttons (the true
// number plus plausible look-alike decoys). Per rep: a ready stage (rink shown,
// a Go button), then on tap the numbered skater slides quickly across the sheet
// (entering one side, exiting the other) and is only legible for a short window,
// then on exit four number buttons turn on. Tap your read, we reveal the right
// number, mark it right or wrong, and hold so the player can learn it. Points
// reward reading it right AND answering fast. Higher levels travel faster (a
// shorter look), add digits (1 -> 2 -> 3), use closer decoys, and shrink the
// jersey a touch. Trains reading a number on a fast-moving player and finding
// the open man on the rush. You start each rep when you are ready.

const REPS = 10;
const REVEAL_HOLD_MS = 1600; // hold the reveal so the player can learn the read
const ANSWER_WINDOW_MS = 2600; // speed window: answer within this for full credit

// Jersey marker radius for a level (a touch smaller at high levels so the number
// is harder to read on a fast, smaller target).
function jerseyR(level, W) {
  return Math.max(13, Math.round(W * lerp(0.05, 0.038, levelT(level))));
}

export default function ReadNumbersDrill({ playerId = "default", onExit }) {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const sceneRef = useRef({});
  const timersRef = useRef([]);
  const rafRef = useRef(0);

  const [phase, setPhase] = useState("intro"); // intro | playing | done
  const [rep, setRep] = useState(0);
  const [hits, setHits] = useState(0);
  const [level, setLevel] = useState(() => getDrill(playerId, "readnumbers").level);
  const [points, setPoints] = useState(0);
  const pointsRef = useRef(0);
  const [stage, setStage] = useState("ready"); // ready | live | choose | reveal
  const [last, setLast] = useState(null); // { success, repPoints, number, picked }
  const [saved, setSaved] = useState(null);

  function clearTimers() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
  }
  function schedule(fn, ms) {
    timersRef.current.push(setTimeout(fn, ms));
  }

  // Draw a numbered skater: a jersey-coloured rounded marker with the number
  // centered on it in bold. Distinct by shape (a ringed pill) plus the number
  // itself, so it never reads by color alone.
  function drawSkater(ctx, x, y, r, number) {
    ctx.save();
    // jersey body (navy, gold ring), drawn as a rounded marker
    ctx.fillStyle = "#0b1b2b";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#f2b705";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    // the number, bold and centered
    ctx.fillStyle = "#f4f9fc";
    const fs = Math.round(r * (String(number).length >= 3 ? 0.82 : 1.02));
    ctx.font = `800 ${fs}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(number), x, y);
    ctx.textBaseline = "alphabetic";
    ctx.restore();
  }

  // Render the scene. In "ready" we show the rink and watermark. In "live" we
  // draw the skater at its current position. In "reveal" (during choose/reveal)
  // the ice is clear so the player must rely on the read, not a frozen picture.
  const render = useCallback(() => {
    const sc = sceneRef.current;
    if (!sc.ctx) return;
    const { ctx, W, H } = sc;
    drawRink(ctx, W, H);

    // faint in-ice title watermark across the top
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = "#0b1b2b";
    ctx.font = "700 28px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Read the Numbers", W / 2, H * 0.16);
    ctx.restore();

    if (!sc.round) return;

    // live: the numbered skater is somewhere along its path and legible.
    if (sc.stage === "live" && sc.pos) {
      drawSkater(ctx, sc.pos.x, sc.pos.y, sc.r, sc.round.number);
    }
  }, []);

  // The live travel loop: move the skater along a straight line across the sheet
  // at the level's speed. Once it exits the far side, switch to the choose stage
  // (buttons turn on). startTs anchors the clock so a resize never restarts it.
  const tick = useCallback(() => {
    const sc = sceneRef.current;
    if (sc.stage !== "live" || sc.resolved) return;
    const elapsed = performance.now() - sc.startTs;
    const frac = elapsed / sc.travelMs; // 0 -> 1 across the sheet
    if (frac >= 1) {
      // skater has exited: open the choices and start the answer clock.
      sc.stage = "choose";
      sc.chooseTs = performance.now();
      render();
      setStage("choose");
      return;
    }
    sc.pos = {
      x: sc.from.x + (sc.to.x - sc.from.x) * frac,
      y: sc.from.y + (sc.to.y - sc.from.y) * frac,
    };
    render();
    rafRef.current = requestAnimationFrame(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [render]);

  // Set up one rep: size the canvas, build the round, pick a straight path that
  // enters one side and exits the other. Wait in "ready" until the player taps
  // Go. Nothing moves until then.
  const startRep = useCallback((repIndex) => {
    const canvas = canvasRef.current;
    const host = rootRef.current;
    if (!canvas || !host) return;
    clearTimers();
    const { ctx, W, H } = setupCanvas(canvas, host);
    const lvl = engineRef.current.level;
    const round = makeRound(lvl, {});
    const r = jerseyR(lvl, W);

    // Pick a travel path across the sheet. Horizontal lanes read most naturally
    // (a skater streaking across), entering off one side and exiting the other,
    // with the lane y chosen in the middle band so the number stays clear of the
    // boards. Direction (L->R or R->L) alternates with rep for variety.
    const laneY = lerp(H * 0.3, H * 0.7, Math.random());
    const leftToRight = repIndex % 2 === 0;
    const from = { x: leftToRight ? -r * 1.4 : W + r * 1.4, y: laneY };
    const to = { x: leftToRight ? W + r * 1.4 : -r * 1.4, y: laneY };

    sceneRef.current = {
      ctx,
      W,
      H,
      round,
      r,
      from,
      to,
      pos: null,
      stage: "ready",
      startTs: null,
      chooseTs: null,
      travelMs: round.travelMs,
      resolved: false,
      repIndex,
    };
    setStage("ready");
    render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [render]);

  // Player tapped Go: send the skater across.
  function go() {
    const sc = sceneRef.current;
    if (!sc.ctx || sc.resolved || sc.stage !== "ready") return;
    sc.stage = "live";
    sc.startTs = performance.now();
    setStage("live");
    rafRef.current = requestAnimationFrame(tick);
  }

  const resolveRep = useCallback(
    (success) => {
      pointsRef.current += sceneRef.current.repPoints || 0;
      setPoints(pointsRef.current);
      const lvl = engineRef.current.record(success);
      setLevel(lvl);
      if (success) setHits((h) => h + 1);
      const next = sceneRef.current.repIndex + 1;
      schedule(() => {
        if (next >= REPS) {
          setPhase("done");
        } else {
          setRep(next);
          startRep(next);
        }
      }, REVEAL_HOLD_MS);
    },
    [startRep]
  );

  // Resolve a rep from a tapped choice index.
  const resolveChoice = useCallback(
    (choiceIndex) => {
      const sc = sceneRef.current;
      if (sc.resolved || sc.stage !== "choose") return;
      const answerMs = sc.chooseTs != null ? performance.now() - sc.chooseTs : ANSWER_WINDOW_MS;
      const result = scoreRead(choiceIndex, sc.round.answerIndex, answerMs, ANSWER_WINDOW_MS);
      sc.resolved = true;
      sc.stage = "reveal";
      sc.picked = choiceIndex;
      sc.repPoints = result.points;
      clearTimers();
      setStage("reveal");
      setLast({
        success: result.success,
        repPoints: result.points,
        number: sc.round.number,
        picked: sc.round.choices[choiceIndex],
      });
      render();
      resolveRep(result.success);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [render, resolveRep]
  );

  function start() {
    const d = getDrill(playerId, "readnumbers");
    engineRef.current = createAdaptiveLevel(d.level, {
      startUps: d.streak.ups,
      startDowns: d.streak.downs,
      ...gymCueHooks(),
    });
    setHits(0);
    setRep(0);
    setLast(null);
    setSaved(null);
    pointsRef.current = 0;
    setPoints(0);
    setPhase("playing");
    requestAnimationFrame(() => startRep(0));
  }

  useEffect(() => {
    if (phase === "done" && !saved) {
      const score = Math.round((hits / REPS) * 100);
      const record = saveSession(playerId, "readnumbers", {
        score,
        points: pointsRef.current,
        level: engineRef.current.level,
        streak: { ups: engineRef.current.ups, downs: engineRef.current.downs },
      });
      setSaved(record);
      cue("fanfare");
    }
  }, [phase, saved, hits, playerId]);

  // Re-fit and redraw on resize without skipping the rep. Rescale the path and
  // current position so a live skater keeps its lane; the travel clock (startTs)
  // keeps running so resizing never restarts the streak.
  useEffect(() => {
    if (phase !== "playing") return;
    const onResize = () => {
      const canvas = canvasRef.current;
      const host = rootRef.current;
      const sc = sceneRef.current;
      if (!canvas || !host || !sc.round) return;
      const prevW = sc.W || 1;
      const prevH = sc.H || 1;
      const { ctx, W, H } = setupCanvas(canvas, host);
      const kx = W / prevW;
      const ky = H / prevH;
      sc.ctx = ctx;
      sc.W = W;
      sc.H = H;
      sc.r = jerseyR(engineRef.current.level, W);
      const scaleP = (p) => (p ? { x: p.x * kx, y: p.y * ky } : p);
      sc.from = scaleP(sc.from);
      sc.to = scaleP(sc.to);
      sc.pos = scaleP(sc.pos);
      render();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [phase, render]);

  useEffect(() => () => clearTimers(), []);

  const choices = sceneRef.current.round ? sceneRef.current.round.choices : [];

  const hint = {
    ready: "Tap Go, watch the skater streak across, and read the number on the jersey.",
    live: "Read the number on the jersey before the skater leaves the ice.",
    choose: "Which number was it? Tap your read. The faster you call it, the more points.",
    reveal: last
      ? last.success
        ? `Nice read, it was ${last.number}. +${last.repPoints}`
        : `That one was ${last.number}, you read ${last.picked}. Keep your eyes on the jersey.`
      : "",
  }[stage];

  const bestLabel = phase === "done" && saved ? sessionRankLabel(saved.sessions, Math.round(points)) : null;

  return (
    <div className="gym-drill" ref={rootRef}>
      {phase !== "intro" && <h2 className="gym-drill-title">Read the Numbers</h2>}
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
            Rep {Math.min(rep + 1, REPS)} / {REPS}
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
          <h2>Read the Numbers</h2>
          <svg viewBox="0 0 280 130" width="100%" style={{ maxWidth: 280, display: "block", margin: "0 auto 14px", borderRadius: 10 }} aria-hidden="true">
            <rect width="280" height="130" rx="8" fill="#eaf4fb" />
            {/* motion lines trailing the skater */}
            <line x1="70" y1="58" x2="120" y2="58" stroke="#9fc3df" strokeWidth="4" strokeLinecap="round" />
            <line x1="74" y1="74" x2="118" y2="74" stroke="#9fc3df" strokeWidth="4" strokeLinecap="round" />
            <line x1="80" y1="90" x2="116" y2="90" stroke="#9fc3df" strokeWidth="4" strokeLinecap="round" />
            {/* the numbered jersey marker */}
            <circle cx="165" cy="72" r="26" fill="#0b1b2b" stroke="#f2b705" strokeWidth="4" />
            <text x="165" y="72" fill="#f4f9fc" fontSize="26" fontWeight="800" textAnchor="middle" dominantBaseline="central" fontFamily="system-ui, sans-serif">17</text>
          </svg>
          <p className="gym-goal"><strong>Your goal:</strong> read the number on the jersey of a skater streaking across the ice, then pick it before it slips your mind.</p>
          <p>
            <strong>The game:</strong> tap Go and a skater wearing a jersey number
            streaks across the rink, on one side and off the other, and you only
            get a quick look. Once they leave the ice, four numbers light up: the
            real one and three look-alikes. Tap the number you read. The faster you
            call it right, the more points you earn. As you level up the skater
            travels faster (a shorter look), the number grows from one digit to two
            to three, and the wrong choices start to look more like the answer. You
            start each rep when you are ready.
          </p>
          <div className="gym-trains">
            <strong>Why it matters</strong>
            <span>
              On the ice the play never holds still. Picking a teammate's number off
              a jersey as they fly up the wing, or clocking a number on the rush, is
              how you find the open man and put the puck on the right tape instead of
              guessing. Training your eyes to lock onto a small, fast-moving target
              is the same skill that helps you track the puck and read bodies at full
              speed.
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
      />

      {phase === "playing" && stage === "ready" && (
        <div className="gym-row" style={{ marginBottom: 10 }}>
          <button className="gym-btn" onClick={go}>
            Go
          </button>
        </div>
      )}

      {phase === "playing" && (stage === "choose" || stage === "reveal") && (
        <div className="gym-row" style={{ marginBottom: 10 }}>
          {choices.map((num, i) => {
            const isAnswer = sceneRef.current.round && i === sceneRef.current.round.answerIndex;
            const isPicked = last && sceneRef.current.picked === i;
            // On reveal, mark the answer (check) and a wrong pick (cross) by
            // label so feedback never rides on color alone.
            let suffix = "";
            if (stage === "reveal") {
              if (isAnswer) suffix = " ✓"; // check on the correct number
              else if (isPicked) suffix = " ✗"; // cross on a wrong pick
            }
            return (
              <button
                key={i}
                className="gym-btn"
                disabled={stage !== "choose"}
                onClick={() => resolveChoice(i)}
              >
                {num}{suffix}
              </button>
            );
          })}
        </div>
      )}

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
          <p>
            {points} points. {hits} of {REPS} numbers read right. Level {level}.
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
