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
import { getDrill, saveSession, getUnit, setUnit as saveUnit } from "./gymStorage";
import { DIRECTIONS, guessAxis, scorePass, feetPerPixel, formatDistance, rateMiss } from "./anticipationCore";

// "Read the Pass" — trajectory prediction.
// A puck launches across the ice from any side and disappears partway. The
// player taps the gold bar where they think it will cross. Trains anticipation:
// reading passes, picking off lanes, judging rims and bank passes off the boards.

const ROUNDS = 8;
const DT = 1 / 120; // physics timestep used to pre-sample the trajectory
const BAR = 22; // gold bar thickness in px (was a 4px line) — bigger target

function pickDirection() {
  return DIRECTIONS[Math.floor(rand(0, DIRECTIONS.length))];
}

// Build the full puck path for a round in a random direction. `motion` is the
// travel axis; the gold bar sits on the exit edge; the guess varies along the
// other axis. Difficulty raises speed, hides earlier, and shrinks tolerance.
function buildTrajectory(W, H, level, dir = pickDirection()) {
  const t = levelT(level);
  const r = 8; // puck radius
  const motion = dir === "lr" || dir === "rl" ? "x" : "y";
  const motionSpan = motion === "x" ? W : H;
  const crossSpan = motion === "x" ? H : W;
  const speed = motionSpan * lerp(0.35, 0.9, t);
  const maxAngle = lerp(20, 50, t) * (Math.PI / 180);
  const angle = rand(-maxAngle, maxAngle);

  // start/exit positions along the motion axis
  const lo = 24;
  const hi = motionSpan - 36;
  const forward = dir === "lr" || dir === "tb";
  let m = forward ? lo : hi; // motion coord
  let c = rand(crossSpan * 0.2, crossSpan * 0.8); // cross coord
  const exitM = forward ? hi : lo;
  const vMotion = (forward ? 1 : -1) * Math.cos(angle) * speed;
  let vCross = Math.sin(angle) * speed;

  let time = 0;
  const pts = [];
  const push = () => {
    // map (m, c) back to absolute (x, y)
    const x = motion === "x" ? m : c;
    const y = motion === "x" ? c : m;
    pts.push({ x, y, t: time });
  };
  push();
  const done = () => (forward ? m >= exitM : m <= exitM);
  while (!done() && time < 20) {
    m += vMotion * DT;
    c += vCross * DT;
    time += DT;
    // bounce off the boards parallel to travel
    if (c < r) {
      c = 2 * r - c;
      vCross = -vCross;
    } else if (c > crossSpan - r) {
      c = 2 * (crossSpan - r) - c;
      vCross = -vCross;
    }
    push();
  }

  const hideFrac = lerp(0.55, 0.25, t); // fraction of the path still visible
  const axis = guessAxis(dir);
  const ftPerPx = feetPerPixel(axis, W, H);
  const toleranceFt = lerp(6, 1.5, t); // success window in REAL feet — same for every direction
  return {
    pts,
    motion, // "x" | "y"
    axis, // "y" | "x" — where the guess varies
    exitM, // motion-axis coordinate of the gold bar
    crossPos: c, // guess-axis coordinate of the true crossing
    crossT: time,
    hideM: forward ? lo + (hi - lo) * hideFrac : hi - (hi - lo) * hideFrac,
    forward,
    ftPerPx, // feet per pixel along the guess axis
    toleranceFt, // success window in feet
    tolerancePx: toleranceFt / ftPerPx, // same window, in px, for drawing
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
  const [points, setPoints] = useState(0);
  const pointsRef = useRef(0);
  const [saved, setSaved] = useState(null);
  const [unit, setUnit] = useState(() => getUnit());
  const unitRef = useRef(unit);
  useEffect(() => { unitRef.current = unit; }, [unit]);

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
      guessC: null,
      result: null,
      repPoints: 0,
      revealStart: null,
      settled: false,
      roundIndex,
    };
    loop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resolveRound = useCallback(
    (success) => {
      pointsRef.current += sceneRef.current.repPoints || 0;
      setPoints(pointsRef.current);
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

      const horiz = traj.motion === "x";

      // gold crossing BAR on the exit edge (thick, more target area)
      ctx.fillStyle = "#f2b705";
      if (horiz) ctx.fillRect(traj.exitM - BAR / 2, 0, BAR, H);
      else ctx.fillRect(0, traj.exitM - BAR / 2, W, BAR);

      // absolute coords of the true crossing on the bar
      const trueX = horiz ? traj.exitM : traj.crossPos;
      const trueY = horiz ? traj.crossPos : traj.exitM;

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

        // the exact crossing — landing on this gold dot is a "Perfect" read
        ctx.fillStyle = "#f2b705";
        ctx.beginPath();
        ctx.arc(trueX, trueY, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#0b1b2b";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        if (sc.guessC !== null) {
          const gx = horiz ? traj.exitM : sc.guessC;
          const gy = horiz ? sc.guessC : traj.exitM;
          // faint guess-to-truth line — "how close was I"
          ctx.save();
          ctx.globalAlpha = 0.5;
          ctx.setLineDash([3, 4]);
          ctx.strokeStyle = "#0b1b2b";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(gx, gy);
          ctx.lineTo(trueX, trueY);
          ctx.stroke();
          ctx.restore();

          ctx.fillStyle = sc.result === "hit" ? "#1b6cb0" : "#e8590c";
          ctx.beginPath();
          ctx.arc(gx, gy, 10, 0, Math.PI * 2);
          ctx.fill();

          // per-rep feedback near the guess marker: quality + distance + points
          const rate = rateMiss(sc.errorFt || 0, traj.toleranceFt);
          ctx.save();
          ctx.fillStyle =
            rate.tier === "perfect" ? "#f2b705" : rate.tier === "miss" ? "#e8590c" : "#1b6cb0";
          ctx.font = "600 14px system-ui, sans-serif";
          ctx.textBaseline = "middle";
          const label = `${rate.label} · ${formatDistance(sc.errorFt || 0, unitRef.current)}  +${sc.repPoints || 0}`;
          const labelX = Math.min(gx + 14, W - 200);
          ctx.fillText(label, labelX, gy);
          ctx.restore();
        }

        if (revIdx >= traj.pts.length - 1 && !sc.settled) {
          sc.settled = true;
          // show the tolerance window around the true crossing, along the bar
          ctx.strokeStyle = "#0b1b2b";
          ctx.lineWidth = 2;
          ctx.beginPath();
          if (horiz) {
            ctx.moveTo(trueX, trueY - traj.tolerancePx);
            ctx.lineTo(trueX, trueY + traj.tolerancePx);
          } else {
            ctx.moveTo(trueX - traj.tolerancePx, trueY);
            ctx.lineTo(trueX + traj.tolerancePx, trueY);
          }
          ctx.stroke();
          resolveRound(sc.result === "hit");
          return;
        }
      } else {
        // live phase — puck visible until hideM along motion, then masked
        const m = horiz ? pt.x : pt.y;
        const past = traj.forward ? m > traj.hideM : m < traj.hideM;
        if (!past) {
          drawPuck(ctx, pt.x, pt.y, traj.r);
        } else {
          // faint mask band over the hidden stretch, oriented by motion
          ctx.save();
          ctx.globalAlpha = 0.06;
          ctx.fillStyle = "#0b1b2b";
          if (horiz) {
            const x0 = traj.forward ? traj.hideM : traj.exitM;
            const x1 = traj.forward ? traj.exitM : traj.hideM;
            ctx.fillRect(Math.min(x0, x1), 0, Math.abs(x1 - x0), H);
          } else {
            const y0 = traj.forward ? traj.hideM : traj.exitM;
            const y1 = traj.forward ? traj.exitM : traj.hideM;
            ctx.fillRect(0, Math.min(y0, y1), W, Math.abs(y1 - y0));
          }
          ctx.restore();
        }
        // no tap in time -> automatic miss
        if (t > traj.crossT + 1.2) {
          sc.guessC = null;
          sc.result = "miss";
          sc.repPoints = 0;
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
    const traj = sc.traj;
    const idx = Math.min(
      Math.floor((performance.now() - sc.startedAt) / 1000 / DT),
      traj.pts.length - 1
    );
    const guessC =
      traj.axis === "y"
        ? Math.min(Math.max(pos.y, 0), sc.H)
        : Math.min(Math.max(pos.x, 0), sc.W);
    const { success, errorFt, points } = scorePass(
      guessC,
      traj.crossPos,
      traj.ftPerPx,
      traj.toleranceFt
    );
    sc.guessC = guessC;
    sc.result = success ? "hit" : "miss";
    sc.errorFt = errorFt;
    sc.repPoints = points;
    sc.frozenIdx = idx;
    sc.revealStart = performance.now();
  }

  function start() {
    const d = getDrill(playerId, "anticipation");
    engineRef.current = createAdaptiveLevel(d.level, {
      startUps: d.streak.ups,
      startDowns: d.streak.downs,
    });
    setHits(0);
    setRound(0);
    setSaved(null);
    pointsRef.current = 0;
    setPoints(0);
    setPhase("playing");
    requestAnimationFrame(() => startRound(0));
  }

  useEffect(() => {
    if (phase === "done" && !saved) {
      const score = Math.round((hits / ROUNDS) * 100);
      const record = saveSession(playerId, "anticipation", {
        score,
        points: pointsRef.current,
        level: engineRef.current.level,
        streak: { ups: engineRef.current.ups, downs: engineRef.current.downs },
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
        {phase === "playing" && (
          <span className="gym-chip">
            {engineRef.current ? `${engineRef.current.toPromote} to level up` : ""}
          </span>
        )}
        {phase === "playing" && <span className="gym-chip">{points} pts</span>}
        {phase === "playing" && (
          <button
            className="gym-chip"
            style={{ cursor: "pointer" }}
            onClick={() => { const u = unit === "ft" ? "m" : "ft"; setUnit(u); saveUnit(u); }}
            title="Toggle feet / meters"
          >
            {unit}
          </button>
        )}
      </div>

      {phase === "intro" && (
        <div className="gym-card">
          <h2>Read the Pass</h2>
          <p className="gym-goal"><strong>Your goal:</strong> call where the puck is going before it gets there.</p>
          <p>
            <strong>The game:</strong> a puck launches across the ice, then
            disappears partway. Track its angle and speed in your head, then tap
            the gold bar where it will cross. It can come from any side. After
            you tap, the gold dot shows the exact crossing: land on it for a
            Perfect read, inside the short window still counts, outside is a miss.
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
          <div className="gym-score">{points}</div>
          <p>
            {points} points. {hits} of {ROUNDS} reads inside the window. Level{" "}
            {level}.
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
