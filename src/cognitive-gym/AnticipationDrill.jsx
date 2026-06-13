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

// "Read the Pass" — trajectory prediction.
// A puck launches across the ice and disappears partway. The player taps the
// gold line where they think it will cross. Trains anticipation: reading
// passes, picking off lanes, judging rims and bank passes off the boards.

const ROUNDS = 8;
const DT = 1 / 120; // physics timestep used to pre-sample the trajectory

// Pre-compute the full puck path for a round. Difficulty (level) raises speed
// and shrinks both the visible window and the hit tolerance.
function buildTrajectory(W, H, level) {
  const t = levelT(level);
  const speed = W * lerp(0.35, 0.9, t);
  const maxAngle = lerp(20, 50, t) * (Math.PI / 180);
  const angle = rand(-maxAngle, maxAngle);
  const r = 8; // puck radius
  const targetX = W - 36; // the gold crossing line
  let x = 24;
  let y = rand(H * 0.2, H * 0.8);
  let vx = Math.cos(angle) * speed;
  let vy = Math.sin(angle) * speed;
  let time = 0;
  const pts = [{ x, y, t: 0 }];

  while (x < targetX && time < 20) {
    x += vx * DT;
    y += vy * DT;
    time += DT;
    // bounce off the top / bottom boards
    if (y < r) {
      y = 2 * r - y;
      vy = -vy;
    } else if (y > H - r) {
      y = 2 * (H - r) - y;
      vy = -vy;
    }
    pts.push({ x, y, t: time });
  }

  return {
    pts,
    crossY: y,
    crossT: time,
    hideX: 24 + (targetX - 24) * lerp(0.55, 0.25, t), // puck vanishes here
    tolerance: H * lerp(0.16, 0.06, t),
    targetX,
    r,
  };
}

export default function AnticipationDrill({ playerId = "default", onExit }) {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const sceneRef = useRef({});
  const rafRef = useRef(0);

  const [phase, setPhase] = useState("intro"); // intro | playing | done
  const [round, setRound] = useState(0);
  const [hits, setHits] = useState(0);
  const [level, setLevel] = useState(() => getDrill(playerId, "anticipation").level);
  const [saved, setSaved] = useState(null);

  const startRound = useCallback((roundIndex) => {
    const canvas = canvasRef.current;
    const host = rootRef.current;
    if (!canvas || !host) return;
    const { ctx, W, H } = setupCanvas(canvas, host);
    const traj = buildTrajectory(W, H, engineRef.current.level);
    sceneRef.current = {
      ctx,
      W,
      H,
      traj,
      startedAt: performance.now(),
      guessY: null,
      result: null,
      revealStart: null,
      roundIndex,
    };
    loop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resolveRound = useCallback(
    (success) => {
      const lvl = engineRef.current.record(success);
      setLevel(lvl);
      if (success) setHits((h) => h + 1);
      const next = sceneRef.current.roundIndex + 1;
      setTimeout(() => {
        if (next >= ROUNDS) {
          setPhase("done");
        } else {
          setRound(next);
          startRound(next);
        }
      }, 900);
    },
    [startRound]
  );

  function drawPuck(ctx, x, y, r) {
    ctx.fillStyle = "#0b1b2b";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function loop() {
    cancelAnimationFrame(rafRef.current);
    const frame = () => {
      const sc = sceneRef.current;
      if (!sc.ctx) return;
      const { ctx, W, H, traj } = sc;
      const t = (performance.now() - sc.startedAt) / 1000;

      drawRink(ctx, W, H);

      // gold crossing line
      ctx.strokeStyle = "#f2b705";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(traj.targetX, 0);
      ctx.lineTo(traj.targetX, H);
      ctx.stroke();

      const idx = Math.min(Math.floor(t / DT), traj.pts.length - 1);
      const pt = traj.pts[idx];

      if (sc.revealStart !== null) {
        // reveal phase — replay the hidden path 3x speed from where it vanished
        const rt = (performance.now() - sc.revealStart) / 1000;
        const revIdx = Math.min(
          traj.pts.length - 1,
          Math.floor(sc.frozenIdx + (rt * 3) / DT)
        );

        ctx.setLineDash([4, 6]);
        ctx.strokeStyle = "#1b6cb0";
        ctx.lineWidth = 2;
        ctx.beginPath();
        traj.pts.slice(0, revIdx + 1).forEach((p, i) => {
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
        ctx.setLineDash([]);

        const head = traj.pts[revIdx];
        drawPuck(ctx, head.x, head.y, traj.r);

        if (sc.guessY !== null) {
          ctx.fillStyle = sc.result === "hit" ? "#1b6cb0" : "#e8590c";
          ctx.beginPath();
          ctx.arc(traj.targetX, sc.guessY, 10, 0, Math.PI * 2);
          ctx.fill();
        }

        if (revIdx >= traj.pts.length - 1 && !sc.settled) {
          sc.settled = true;
          // show the tolerance ring around the true crossing
          ctx.strokeStyle = "#0b1b2b";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(traj.targetX, traj.crossY, traj.tolerance, 0, Math.PI * 2);
          ctx.stroke();
          resolveRound(sc.result === "hit");
          return;
        }
      } else {
        // live phase — puck visible until hideX, then masked
        if (pt.x <= traj.hideX) {
          drawPuck(ctx, pt.x, pt.y, traj.r);
        } else {
          ctx.save();
          ctx.globalAlpha = 0.06;
          ctx.fillStyle = "#0b1b2b";
          ctx.fillRect(traj.hideX, 0, traj.targetX - traj.hideX, H);
          ctx.restore();
        }
        // no tap in time -> automatic miss
        if (t > traj.crossT + 1.2) {
          sc.guessY = null;
          sc.result = "miss";
          sc.frozenIdx = idx;
          sc.revealStart = performance.now();
        }
      }

      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
  }

  function handleGuess(evt) {
    const sc = sceneRef.current;
    if (phase !== "playing" || !sc.traj || sc.revealStart !== null) return;
    evt.preventDefault();
    const pos = pointerPos(evt, canvasRef.current);
    const idx = Math.min(
      Math.floor((performance.now() - sc.startedAt) / 1000 / DT),
      sc.traj.pts.length - 1
    );
    sc.guessY = Math.min(Math.max(pos.y, 0), sc.H);
    sc.result =
      Math.abs(sc.guessY - sc.traj.crossY) <= sc.traj.tolerance ? "hit" : "miss";
    sc.frozenIdx = idx;
    sc.revealStart = performance.now();
  }

  function start() {
    engineRef.current = createAdaptiveLevel(getDrill(playerId, "anticipation").level);
    setHits(0);
    setRound(0);
    setSaved(null);
    setPhase("playing");
    requestAnimationFrame(() => startRound(0));
  }

  useEffect(() => {
    if (phase === "done" && !saved) {
      const score = Math.round((hits / ROUNDS) * 100);
      const record = saveSession(playerId, "anticipation", {
        score,
        level: engineRef.current.level,
      });
      setSaved(record);
    }
  }, [phase, saved, hits, playerId]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  return (
    <div className="gym-drill" ref={rootRef}>
      <div className="gym-drill-bar">
        <button className="gym-btn gym-btn-ghost" onClick={onExit}>
          Back
        </button>
        <span className="gym-chip">Level {level}</span>
        {phase === "playing" && (
          <span className="gym-chip">
            Rep {Math.min(round + 1, ROUNDS)} / {ROUNDS}
          </span>
        )}
      </div>

      {phase === "intro" && (
        <div className="gym-card">
          <h2>Read the Pass</h2>
          <p className="gym-goal"><strong>Your goal:</strong> call where the puck is going before it gets there.</p>
          <p>
            <strong>The game:</strong> a puck launches across the ice, then
            disappears partway. Track its angle and speed in your head, then tap
            the gold bar where it will cross. It can come from any side. Blue
            marker means you read it, orange means you missed.
          </p>
          <div className="gym-trains">
            <strong>Why it matters</strong>
            <span>
              Reading a pass early is how you pick off a lane, beat a player to
              the spot, and arrive where the puck will be instead of chasing
              where it was.
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
        onMouseDown={handleGuess}
        onTouchStart={handleGuess}
      />

      {phase === "done" && (
        <div className="gym-card">
          <h2>Session complete</h2>
          <div className="gym-score">{Math.round((hits / ROUNDS) * 100)}</div>
          <p>
            {hits} of {ROUNDS} reads on target. Level {level}.
            {saved && saved.best <= Math.round((hits / ROUNDS) * 100)
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
