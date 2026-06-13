import { useRef, useState, useCallback, useEffect } from "react";
import { createAdaptiveLevel, setupCanvas, pointerPos } from "./gymEngine";
import { getDrill, saveSession } from "./gymStorage";
import { makeShot, scoreShot, cellRects, cellAtPoint } from "./shootoutCore";

// "Pick Your Spot" — read the open net and shoot it before the goalie covers it.
// The net is a 3x2 grid of cells. The goalie covers some at the start (saves);
// open cells show a target ring. Tap Go, then tap an open cell before the shot
// clock runs out. Higher levels cover more cells, close more holes mid-shot, and
// shrink the clock, so the open window gets smaller fast.

const REPS = 10;
const REVEAL_HOLD_MS = 1400;

export default function ShootoutDrill({ playerId = "default", onExit }) {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const sceneRef = useRef({});
  const timersRef = useRef([]);
  const rafRef = useRef(0);
  const pointsRef = useRef(0);

  const [phase, setPhase] = useState("intro"); // intro | playing | done
  const [rep, setRep] = useState(0);
  const [hits, setHits] = useState(0);
  const [level, setLevel] = useState(() => getDrill(playerId, "shootout").level);
  const [points, setPoints] = useState(0);
  const [stage, setStage] = useState("ready"); // ready | live | reveal
  const [last, setLast] = useState(null);
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

  function computeNet(W, H) {
    const w = W * 0.74;
    const h = H * 0.5;
    return { x: (W - w) / 2, y: H * 0.2, w, h };
  }

  // Covered at the given elapsed time? (covered-at-start, or closed since).
  function coveredNow(shot, id, elapsedMs) {
    if (shot.coveredAtStart.includes(id)) return true;
    const sc = shot.closeSchedule.find((c) => c.cellId === id);
    return !!(sc && elapsedMs >= sc.atMs);
  }

  // A covered cell: dark goalie pad with a "G" so it reads by shape + label.
  function drawGoalieCell(ctx, r) {
    ctx.save();
    ctx.fillStyle = "#2b3a47";
    ctx.fillRect(r.x + 3, r.y + 3, r.w - 6, r.h - 6);
    ctx.fillStyle = "#f4f9fc";
    ctx.font = `700 ${Math.round(Math.min(r.w, r.h) * 0.4)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("G", r.x + r.w / 2, r.y + r.h / 2);
    ctx.restore();
  }
  // An open cell: a target ring so it reads by shape, not color alone.
  function drawOpenCell(ctx, r) {
    ctx.save();
    ctx.strokeStyle = "#1f9d55";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(r.x + r.w / 2, r.y + r.h / 2, Math.min(r.w, r.h) * 0.28, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  const render = useCallback(() => {
    const sc = sceneRef.current;
    if (!sc.ctx) return;
    const { ctx, W, H, net, rects, shot } = sc;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#f4f9fc";
    ctx.fillRect(0, 0, W, H);
    // net frame
    ctx.strokeStyle = "#c8102e";
    ctx.lineWidth = 4;
    ctx.strokeRect(net.x, net.y, net.w, net.h);
    // grid lines
    ctx.strokeStyle = "rgba(11,27,43,0.12)";
    ctx.lineWidth = 1;
    for (let c = 1; c < 3; c += 1) {
      ctx.beginPath();
      ctx.moveTo(net.x + (net.w / 3) * c, net.y);
      ctx.lineTo(net.x + (net.w / 3) * c, net.y + net.h);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(net.x, net.y + net.h / 2);
    ctx.lineTo(net.x + net.w, net.y + net.h / 2);
    ctx.stroke();

    if (!shot) return;
    const elapsed =
      sc.stage === "live" && sc.startTs != null
        ? Math.min(performance.now() - sc.startTs, shot.shotClockMs)
        : sc.frozenElapsed != null
        ? sc.frozenElapsed
        : 0;

    rects.forEach((r) => {
      if (coveredNow(shot, r.id, elapsed)) drawGoalieCell(ctx, r);
      else drawOpenCell(ctx, r);
    });

    // reveal: mark the tapped cell with a check (goal) or X (save)
    if (sc.stage === "reveal" && sc.tappedId) {
      const r = rects.find((x) => x.id === sc.tappedId);
      if (r) {
        ctx.save();
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        if (sc.result && sc.result.success) {
          ctx.strokeStyle = "#1f9d55";
          ctx.beginPath();
          ctx.moveTo(r.x + r.w * 0.3, r.y + r.h * 0.55);
          ctx.lineTo(r.x + r.w * 0.45, r.y + r.h * 0.7);
          ctx.lineTo(r.x + r.w * 0.7, r.y + r.h * 0.32);
          ctx.stroke();
        } else {
          ctx.strokeStyle = "#c8102e";
          ctx.beginPath();
          ctx.moveTo(r.x + r.w * 0.32, r.y + r.h * 0.32);
          ctx.lineTo(r.x + r.w * 0.68, r.y + r.h * 0.68);
          ctx.moveTo(r.x + r.w * 0.68, r.y + r.h * 0.32);
          ctx.lineTo(r.x + r.w * 0.32, r.y + r.h * 0.68);
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    // live: a shrinking countdown bar under the net
    if (sc.stage === "live" && sc.startTs != null) {
      const frac = 1 - elapsed / shot.shotClockMs;
      ctx.fillStyle = "rgba(11,27,43,0.12)";
      ctx.fillRect(net.x, net.y + net.h + 10, net.w, 8);
      ctx.fillStyle = frac > 0.33 ? "#1b6cb0" : "#e8590c";
      ctx.fillRect(net.x, net.y + net.h + 10, net.w * Math.max(0, frac), 8);
    }
  }, []);

  const tick = useCallback(() => {
    const sc = sceneRef.current;
    if (sc.stage !== "live" || sc.resolved) return;
    render();
    if (performance.now() - sc.startTs >= sc.shot.shotClockMs) {
      resolveShot(null); // clock expired, no tap
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [render]);

  const startRep = useCallback((repIndex) => {
    const canvas = canvasRef.current;
    const host = rootRef.current;
    if (!canvas || !host) return;
    clearTimers();
    const { ctx, W, H } = setupCanvas(canvas, host);
    const net = computeNet(W, H);
    const shot = makeShot(engineRef.current.level);
    sceneRef.current = {
      ctx, W, H, net,
      rects: cellRects(net),
      shot,
      stage: "ready",
      startTs: null,
      resolved: false,
      tappedId: null,
      result: null,
      frozenElapsed: 0,
      repIndex,
    };
    setStage("ready");
    render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [render]);

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
      pointsRef.current += sceneRef.current.result ? sceneRef.current.result.points : 0;
      setPoints(pointsRef.current);
      const lvl = engineRef.current.record(success);
      setLevel(lvl);
      if (success) setHits((h) => h + 1);
      const next = sceneRef.current.repIndex + 1;
      schedule(() => {
        if (next >= REPS) setPhase("done");
        else {
          setRep(next);
          startRep(next);
        }
      }, REVEAL_HOLD_MS);
    },
    [startRep]
  );

  const resolveShot = useCallback(
    (cellId) => {
      const sc = sceneRef.current;
      if (sc.resolved || sc.stage !== "live") return;
      const elapsed = sc.startTs != null ? performance.now() - sc.startTs : sc.shot.shotClockMs + 1;
      const result = scoreShot(cellId, elapsed, sc.shot);
      sc.resolved = true;
      sc.stage = "reveal";
      sc.tappedId = cellId;
      sc.result = result;
      sc.frozenElapsed = Math.min(elapsed, sc.shot.shotClockMs);
      clearTimers();
      setStage("reveal");
      setLast({ success: result.success, repPoints: result.points, expired: cellId == null });
      render();
      resolveRep(result.success);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [render, resolveRep]
  );

  function onCanvasTap(evt) {
    const sc = sceneRef.current;
    if (sc.stage !== "live") return;
    const p = pointerPos(evt, canvasRef.current);
    const id = cellAtPoint(sc.rects, p.x, p.y);
    if (!id) return;
    resolveShot(id);
  }

  function start() {
    const d = getDrill(playerId, "shootout");
    engineRef.current = createAdaptiveLevel(d.level, {
      startUps: d.streak.ups,
      startDowns: d.streak.downs,
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
      const record = saveSession(playerId, "shootout", {
        score,
        points: pointsRef.current,
        level: engineRef.current.level,
        streak: { ups: engineRef.current.ups, downs: engineRef.current.downs },
      });
      setSaved(record);
    }
  }, [phase, saved, hits, playerId]);

  useEffect(() => {
    if (phase !== "playing") return;
    const onResize = () => {
      const canvas = canvasRef.current;
      const host = rootRef.current;
      const sc = sceneRef.current;
      if (!canvas || !host || !sc.shot) return;
      const { ctx, W, H } = setupCanvas(canvas, host);
      const net = computeNet(W, H);
      sc.ctx = ctx;
      sc.W = W;
      sc.H = H;
      sc.net = net;
      sc.rects = cellRects(net);
      render();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [phase, render]);

  useEffect(() => () => clearTimers(), []);

  const hint = {
    ready: "Tap Go, then tap an open spot (a target ring) before the goalie covers it.",
    live: "Shoot an open spot. The goalie covers the blocked ones and closes more.",
    reveal: last
      ? last.success
        ? `Goal! +${last.repPoints}`
        : last.expired
        ? "Too slow, the goalie covered it."
        : "Saved. That spot was covered. Read the open net."
      : "",
  }[stage];

  return (
    <div className="gym-drill" ref={rootRef}>
      {phase !== "intro" && <h2 className="gym-drill-title">Pick Your Spot</h2>}
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
            Shot {Math.min(rep + 1, REPS)} / {REPS}
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
          <h2>Pick Your Spot</h2>
          <svg viewBox="0 0 280 150" width="100%" style={{ maxWidth: 280, display: "block", margin: "0 auto 14px", borderRadius: 10 }} aria-hidden="true">
            <rect width="280" height="150" rx="8" fill="#eaf4fb" />
            <rect x="60" y="30" width="160" height="90" fill="none" stroke="#c8102e" strokeWidth="3" />
            <line x1="113" y1="30" x2="113" y2="120" stroke="#0b1b2b" strokeOpacity="0.15" />
            <line x1="166" y1="30" x2="166" y2="120" stroke="#0b1b2b" strokeOpacity="0.15" />
            <line x1="60" y1="75" x2="220" y2="75" stroke="#0b1b2b" strokeOpacity="0.15" />
            <rect x="63" y="33" width="47" height="39" fill="#2b3a47" />
            <circle cx="193" cy="52" r="13" fill="none" stroke="#1f9d55" strokeWidth="3" />
            <circle cx="140" cy="97" r="13" fill="none" stroke="#1f9d55" strokeWidth="3" />
          </svg>
          <p className="gym-goal"><strong>Your goal:</strong> shoot where the goalie is not. Tap an open part of the net before he covers it.</p>
          <p>
            <strong>The game:</strong> the net is split into spots. The goalie covers some of them
            (the dark pads), and the open spots have a target ring. Tap Go, then tap an open spot
            before the clock runs out. The higher your level, the more the goalie covers, the
            faster the open spots close, and the shorter the clock. Read the open net and pick your
            spot fast.
          </p>
          <div className="gym-trains">
            <strong>Why it matters</strong>
            <span>
              Goal scorers do not just shoot hard, they shoot where the goalie is not. Training
              your eyes to find the open part of the net fast is how you beat a goalie who is set,
              and how you get a shot off before the window closes.
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
        onPointerDown={onCanvasTap}
        style={{ display: phase === "playing" ? "block" : "none" }}
      />

      {phase === "playing" && stage === "ready" && (
        <div className="gym-row" style={{ marginBottom: 10 }}>
          <button className="gym-btn" onClick={go}>
            Go
          </button>
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
          <div className="gym-score">{points}</div>
          <p>
            {points} points. {hits} of {REPS} goals. Level {level}.
            {saved && (saved.bestPoints || 0) <= points && points > 0 ? " New best." : ""}
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
