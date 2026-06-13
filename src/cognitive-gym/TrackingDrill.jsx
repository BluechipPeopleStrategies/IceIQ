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

// "Head on a Swivel" — multi-object tracking (divided attention / awareness).
// Three teammates flash gold, then every skater turns white and starts moving.
// When play stops, the player taps the three they were tracking. Trains rink
// awareness without puck-watching.

const SHIFTS = 6;
const TARGETS = 3;
const FEEDBACK_HOLD_MS = 2800; // hold the marked-up result so the player can see which they missed

// Build a field of non-overlapping skaters with random velocities. Difficulty
// ramps hard with level: more skaters (5 -> 16), faster movement, a longer
// tracking phase, and a shorter look at the gold teammates.
function makeDots(W, H, level) {
  const t = levelT(level);
  const count = 5 + Math.round(lerp(0, 11, t)); // 5 .. 16 skaters
  const speed = W * lerp(0.16, 0.78, t);
  const r = Math.max(11, Math.round(W * 0.024));
  const dots = [];
  let guard = 0;

  while (dots.length < count && guard < 1500) {
    guard += 1;
    const dot = { x: rand(r + 6, W - r - 6), y: rand(r + 6, H - r - 6), r };
    if (dots.every((o) => Math.hypot(o.x - dot.x, o.y - dot.y) > r * 2.3)) {
      const ang = rand(0, Math.PI * 2);
      dot.vx = Math.cos(ang) * speed;
      dot.vy = Math.sin(ang) * speed;
      dots.push(dot);
    }
  }

  return {
    dots,
    targetIdx: new Set([0, 1, 2]),
    moveMs: lerp(4500, 10000, t),
    watchMs: lerp(2000, 800, t), // shorter look at higher levels
  };
}

export default function TrackingDrill({ playerId = "default", onExit }) {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const sceneRef = useRef({});
  const rafRef = useRef(0);

  const [phase, setPhase] = useState("intro"); // intro | playing | done
  const [shift, setShift] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [level, setLevel] = useState(() => getDrill(playerId, "tracking").level);
  const [remaining, setRemaining] = useState(TARGETS);
  const [stage, setStage] = useState("ready"); // ready | watch | track | pick | feedback
  const [saved, setSaved] = useState(null);
  const [levelUpIn, setLevelUpIn] = useState(3); // clean shifts still needed to move up

  const startShift = useCallback((roundIndex) => {
    const canvas = canvasRef.current;
    const host = rootRef.current;
    if (!canvas || !host) return;
    const { ctx, W, H } = setupCanvas(canvas, host);
    const scene = makeDots(W, H, engineRef.current.level);
    sceneRef.current = {
      ctx,
      W,
      H,
      ...scene,
      stage: "ready",
      stageStart: performance.now(),
      lastFrame: performance.now(),
      picks: new Set(),
      roundIndex,
    };
    setStage("ready");
    setRemaining(TARGETS);
    loop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A shift waits in "ready" until the player taps Start shift; only then does
  // the gold flash (watch) begin. Nothing auto-runs.
  function beginWatch() {
    const sc = sceneRef.current;
    if (!sc || sc.stage !== "ready") return;
    sc.stage = "watch";
    sc.stageStart = performance.now();
    setStage("watch");
  }

  const resolveShift = useCallback(
    (correctCount) => {
      setCorrect((c) => c + correctCount);
      const lvl = engineRef.current.record(correctCount === TARGETS);
      setLevel(lvl);
      setLevelUpIn(engineRef.current.toPromote);
      const next = sceneRef.current.roundIndex + 1;
      setTimeout(() => {
        if (next >= SHIFTS) {
          setPhase("done");
        } else {
          setShift(next);
          startShift(next);
        }
      }, FEEDBACK_HOLD_MS);
    },
    [startShift]
  );

  function loop() {
    cancelAnimationFrame(rafRef.current);
    const frame = () => {
      const sc = sceneRef.current;
      if (!sc.ctx) return;
      const now = performance.now();
      const dt = Math.min((now - sc.lastFrame) / 1000, 0.05);
      sc.lastFrame = now;
      const { ctx, W, H } = sc;

      // stage transitions
      if (sc.stage === "watch" && now - sc.stageStart > sc.watchMs) {
        sc.stage = "track";
        sc.stageStart = now;
        setStage("track");
      } else if (sc.stage === "track" && now - sc.stageStart > sc.moveMs) {
        sc.stage = "pick";
        sc.stageStart = now;
        setStage("pick");
      }

      if (sc.stage === "track") {
        // integrate + bounce off boards
        sc.dots.forEach((d) => {
          d.x += d.vx * dt;
          d.y += d.vy * dt;
          if (d.x < d.r) {
            d.x = d.r;
            d.vx = -d.vx;
          }
          if (d.x > W - d.r) {
            d.x = W - d.r;
            d.vx = -d.vx;
          }
          if (d.y < d.r) {
            d.y = d.r;
            d.vy = -d.vy;
          }
          if (d.y > H - d.r) {
            d.y = H - d.r;
            d.vy = -d.vy;
          }
        });

        // elastic skater-skater collisions (equal mass)
        for (let i = 0; i < sc.dots.length; i += 1) {
          for (let j = i + 1; j < sc.dots.length; j += 1) {
            const a = sc.dots[i];
            const b = sc.dots[j];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = Math.hypot(dx, dy) || 0.001;
            const minD = a.r + b.r;
            if (dist < minD) {
              const nx = dx / dist;
              const ny = dy / dist;
              const overlap = (minD - dist) / 2;
              a.x -= nx * overlap;
              a.y -= ny * overlap;
              b.x += nx * overlap;
              b.y += ny * overlap;
              const va = a.vx * nx + a.vy * ny;
              const vb = b.vx * nx + b.vy * ny;
              if (va - vb > 0) {
                a.vx += (vb - va) * nx;
                a.vy += (vb - va) * ny;
                b.vx += (va - vb) * nx;
                b.vy += (va - vb) * ny;
              }
            }
          }
        }
      }

      drawRink(ctx, W, H);
      sc.dots.forEach((d, idx) => {
        const isTarget = sc.targetIdx.has(idx);
        const isPicked = sc.picks.has(idx);
        let fill = "#ffffff";
        let stroke = "#5b7587";
        let mark = null;

        if (sc.stage === "watch" && isTarget) {
          fill = "#f2b705";
          stroke = "#9a7400";
        } else if (sc.stage === "feedback") {
          if (isTarget && isPicked) {
            fill = "#1b6cb0";
            stroke = "#0f4a7d";
            mark = "check";
          } else if (isTarget) {
            fill = "#f2b705";
            stroke = "#9a7400";
          } else if (isPicked) {
            fill = "#e8590c";
            stroke = "#8a3a09";
            mark = "cross";
          }
        } else if (isPicked) {
          fill = "#1b6cb0";
          stroke = "#0f4a7d";
        }

        ctx.fillStyle = fill;
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // check / cross glyph (shape, not color alone, for accessibility)
        if (mark) {
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 3;
          ctx.lineCap = "round";
          const s = d.r * 0.45;
          ctx.beginPath();
          if (mark === "check") {
            ctx.moveTo(d.x - s, d.y);
            ctx.lineTo(d.x - s * 0.2, d.y + s * 0.8);
            ctx.lineTo(d.x + s, d.y - s * 0.6);
          } else {
            ctx.moveTo(d.x - s, d.y - s);
            ctx.lineTo(d.x + s, d.y + s);
            ctx.moveTo(d.x + s, d.y - s);
            ctx.lineTo(d.x - s, d.y + s);
          }
          ctx.stroke();
        }
      });

      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
  }

  function handlePick(evt) {
    const sc = sceneRef.current;
    if (phase !== "playing" || sc.stage !== "pick") return;
    evt.preventDefault();
    const pos = pointerPos(evt, canvasRef.current);
    let best = -1;
    let bestDist = Infinity;
    sc.dots.forEach((d, idx) => {
      if (sc.picks.has(idx)) return;
      const dist = Math.hypot(d.x - pos.x, d.y - pos.y);
      if (dist <= d.r + 8 && dist < bestDist) {
        bestDist = dist;
        best = idx;
      }
    });
    if (best === -1) return;

    sc.picks.add(best);
    const left = TARGETS - sc.picks.size;
    setRemaining(left);
    if (left === 0) {
      sc.stage = "feedback";
      setStage("feedback");
      const correctCount = [...sc.picks].filter((idx) =>
        sc.targetIdx.has(idx)
      ).length;
      resolveShift(correctCount);
    }
  }

  function start() {
    const d = getDrill(playerId, "tracking");
    engineRef.current = createAdaptiveLevel(d.level, {
      startUps: d.streak.ups,
      startDowns: d.streak.downs,
    });
    setCorrect(0);
    setShift(0);
    setLevelUpIn(engineRef.current.toPromote);
    setPhase("playing");
    requestAnimationFrame(() => startShift(0));
  }

  useEffect(() => {
    if (phase === "done" && !saved) {
      const score = Math.round((correct / (SHIFTS * TARGETS)) * 100);
      setSaved(
        saveSession(playerId, "tracking", {
          score,
          level: engineRef.current.level,
          streak: { ups: engineRef.current.ups, downs: engineRef.current.downs },
        })
      );
    }
  }, [phase, saved, correct, playerId]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  // Keep the rink fitted to the window when it resizes mid-shift. Re-fit the
  // canvas and rescale the skaters' positions/velocities/radius proportionally
  // so resizing actually re-sizes the rink instead of doing nothing — and
  // without resetting the shift or regenerating the field.
  useEffect(() => {
    if (phase !== "playing") return;
    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const canvas = canvasRef.current;
        const host = rootRef.current;
        const sc = sceneRef.current;
        if (!canvas || !host || !sc.ctx) return;
        const oldW = sc.W || 1;
        const oldH = sc.H || 1;
        const { ctx, W, H } = setupCanvas(canvas, host);
        const sx = W / oldW;
        const sy = H / oldH;
        const r = Math.max(11, Math.round(W * 0.024));
        sc.dots.forEach((d) => {
          d.x *= sx;
          d.y *= sy;
          d.vx *= sx;
          d.vy *= sy;
          d.r = r;
        });
        sc.ctx = ctx;
        sc.W = W;
        sc.H = H;
      });
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
    };
  }, [phase]);

  const hint = {
    ready: "Take a breath, then tap Start shift",
    watch: "Memorize the gold teammates",
    track: "Track them",
    pick: `Tap your ${remaining} teammate${remaining === 1 ? "" : "s"}`,
    feedback: "",
  }[stage];

  return (
    <div className="gym-drill">
      {phase !== "intro" && <h2 className="gym-drill-title">Head on a Swivel</h2>}
      <div className="gym-track-layout">
        <aside className="gym-guide">
          <h3>How you level up</h3>
          <ul>
            <li>Tag all 3 teammates to bank a clean shift.</li>
            <li>3 clean shifts in a row moves you up a level.</li>
            <li>2 missed shifts in a row moves you down.</li>
            <li>Higher levels add more skaters, more speed, and a shorter look.</li>
          </ul>
          {phase === "playing" && (
            <p className="gym-guide-now">
              Level {level} · {levelUpIn} clean shift{levelUpIn === 1 ? "" : "s"} to move up
            </p>
          )}
        </aside>

        <div className="gym-track-main" ref={rootRef}>
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
                Shift {Math.min(shift + 1, SHIFTS)} / {SHIFTS}
              </span>
            )}
          </div>

          {phase === "intro" && (
            <div className="gym-card">
              <h2>Head on a Swivel</h2>
              <p className="gym-goal"><strong>Your goal:</strong> keep track of all three teammates at once, even while the play is moving.</p>
              <p>
                <strong>The game:</strong> three teammates flash gold, then every
                skater turns white and starts moving. Keep tabs on all three at once
                without staring at any one of them. When play stops, tap your three
                teammates. You start each shift when you are ready. Blue check means
                right, orange cross means wrong.
              </p>
              <div className="gym-trains">
                <strong>Why it matters</strong>
                <span>
                  Knowing where your options are without staring at the puck is how
                  you find the open man, break out cleanly, and see the check before
                  it arrives.
                </span>
              </div>
              <button className="gym-btn" onClick={start}>
                Start
              </button>
            </div>
          )}

          {phase === "playing" && <p className="gym-hint">{hint}</p>}

          {phase === "playing" && stage === "ready" && (
            <div className="gym-row" style={{ marginBottom: 10 }}>
              <button className="gym-btn" onClick={beginWatch}>
                Start shift
              </button>
            </div>
          )}

          <canvas
            ref={canvasRef}
            className="gym-canvas"
            style={{ display: phase === "playing" ? "block" : "none" }}
            onMouseDown={handlePick}
            onTouchStart={handlePick}
          />

          {phase === "done" && (
            <div className="gym-card">
              <h2>Session complete</h2>
              <div className="gym-score">
                {Math.round((correct / (SHIFTS * TARGETS)) * 100)}
              </div>
              <p>
                {correct} of {SHIFTS * TARGETS} teammates tracked. Level {level}.
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
      </div>
    </div>
  );
}
