import { useRef, useState, useCallback, useEffect } from "react";
import {
  createAdaptiveLevel,
  levelT,
  lerp,
  rand,
  setupCanvas,
  drawRink,
  pointerPos,
  targetMaxY,
  REPS_PER_SESSION,
} from "./gymEngine";
import { getDrill, saveSession } from "./gymStorage";
import { cue, gymCueHooks } from "./gymAudio";
import { ScoreCount, ConfettiBurst, SessionSummary } from "./gymFx";
import { sessionRankLabel } from "./gymProgressCore";
import { shiftPoints } from "./trackingCore";

// "Head on a Swivel" — multi-object tracking (divided attention / awareness).
// Three teammates flash gold, then every skater turns white and starts moving.
// When play stops, the player taps the three they were tracking. Trains rink
// awareness without puck-watching.

const SHIFTS = REPS_PER_SESSION;
const TARGETS = 3;

// Reading order for the keyboard bindings: left-to-right, then top-to-bottom,
// with dots on roughly the same row treated as one row.
function readingOrder(dots) {
  const rowTol = (dots[0] ? dots[0].r : 12) * 2;
  return dots
    .map((d, i) => ({ i, x: d.x, y: d.y }))
    .sort((a, b) => (Math.abs(a.y - b.y) > rowTol ? a.y - b.y : a.x - b.x));
}

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
    // Action Rail: keep every skater out of the rail band so the Lock in pill
    // never sits on top of a dot you have to tap (S2-28).
    const dot = { x: rand(r + 6, W - r - 6), y: rand(r + 6, targetMaxY(H) - r - 6), r };
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
    ballIdx: Math.floor(rand(0, 3)), // which target (0..2) carries the soccer ball
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
  const [shiftResult, setShiftResult] = useState(null); // correct count for the shift just finished
  const [bonus, setBonus] = useState(0); // soccer balls caught this session
  const [points, setPoints] = useState(0); // graded 0-1000 per shift (trackingCore)
  const [gotBall, setGotBall] = useState(false); // got the soccer ball on the last shift
  const [ballCall, setBallCall] = useState(null); // which pick you double-tapped as the ⚽

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
      ballCall: null,
      roundIndex,
    };
    setStage("ready");
    setRemaining(TARGETS);
    setShiftResult(null);
    setGotBall(false);
    setBallCall(null);
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
      const got =
        sceneRef.current.ballCall != null &&
        sceneRef.current.ballCall === sceneRef.current.ballIdx;
      setGotBall(got);
      if (got) setBonus((b) => b + 1);
      setPoints((p) => p + shiftPoints(correctCount, TARGETS, got));
      setShiftResult(correctCount);
      setCorrect((c) => c + correctCount);
      const lvl = engineRef.current.record(correctCount === TARGETS);
      setLevel(lvl);
      setLevelUpIn(engineRef.current.toPromote);
    },
    []
  );

  // Feedback stays on screen until the player taps Next shift — nothing
  // auto-advances, so they can actually look at what they missed.
  function advanceShift() {
    const next = sceneRef.current.roundIndex + 1;
    if (next >= SHIFTS) {
      setPhase("done");
    } else {
      setShift(next);
      startShift(next);
    }
  }

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
          // skaters bounce off the rail band, not the canvas edge — otherwise a
          // dot drifts under the Lock in pill mid-shift
          const yFloor = targetMaxY(H) - d.r;
          if (d.y > yFloor) {
            d.y = yFloor;
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

      // mascots in the middle — Baylor's bunny and bear cheer the play on
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.font = `${Math.round(H * 0.26)}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("🐰", W * 0.5 - H * 0.2, H * 0.5);
      ctx.fillText("🐻", W * 0.5 + H * 0.2, H * 0.5);
      ctx.restore();

      // faint game title across the top of the rink
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = "#0b1b2b";
      ctx.font = `800 ${Math.round(H * 0.11)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText("Baylor's Pick", W * 0.5, 6);
      ctx.restore();

      // Keyboard index labels. Computed once a frame and drawn ONLY at "pick",
      // i.e. after the skaters have stopped, so a number can never help you
      // follow a dot during the tracking phase (S2-28).
      let keyRank = null;
      if (sc.stage === "pick") {
        keyRank = new Map();
        readingOrder(sc.dots).forEach((o, n) => keyRank.set(o.i, n + 1));
      }

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
            fill = "#d6336c";
            stroke = "#a61e4d";
            mark = "cross";
          }
        } else if (sc.ballCall === idx) {
          // your soccer-ball call (the second tap) — gold so the double-tap reads
          fill = "#f2b705";
          stroke = "#9a7400";
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

        // the digit that selects this skater from the keyboard
        if (keyRank && keyRank.has(idx) && keyRank.get(idx) <= 9) {
          ctx.fillStyle = isPicked ? "#f4f9fc" : "#0b1b2b";
          ctx.font = `700 ${Math.round(d.r * 0.9)}px system-ui, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(keyRank.get(idx)), d.x, d.y);
        }

        // soccer ball on the ball-carrier — shown while memorizing and on reveal
        if (idx === sc.ballIdx && (sc.stage === "watch" || sc.stage === "feedback")) {
          ctx.font = `${Math.round(d.r * 1.6)}px serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("⚽", d.x, d.y);
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
    // nearest dot under the tap, whether or not it is already picked
    let best = -1;
    let bestDist = Infinity;
    sc.dots.forEach((d, idx) => {
      const dist = Math.hypot(d.x - pos.x, d.y - pos.y);
      if (dist <= d.r + 8 && dist < bestDist) {
        bestDist = dist;
        best = idx;
      }
    });
    if (best === -1) return;

    if (sc.picks.has(best)) {
      const now = performance.now();
      if (sc.lastTapIdx === best && now - (sc.lastTapTime || 0) < 350) {
        // double-tap → call this pick the soccer ball (cancel the pending deselect)
        clearTimeout(sc.tapTimer);
        sc.lastTapIdx = null;
        sc.ballCall = best;
        setBallCall(best);
        return;
      }
      // single tap → deselect it (after a short wait in case a 2nd tap is coming)
      sc.lastTapIdx = best;
      sc.lastTapTime = now;
      clearTimeout(sc.tapTimer);
      const scene = sc;
      sc.tapTimer = setTimeout(() => {
        if (sceneRef.current !== scene) return; // shift moved on
        scene.picks.delete(best);
        if (scene.ballCall === best) {
          scene.ballCall = null;
          setBallCall(null);
        }
        scene.lastTapIdx = null;
        setRemaining(TARGETS - scene.picks.size);
      }, 350);
      return;
    }
    if (sc.picks.size >= TARGETS) return; // already tapped your three
    sc.picks.add(best);
    setRemaining(TARGETS - sc.picks.size);
  }

  // Lock in the three picks (and any soccer-ball call) and grade the shift.
  function lockIn() {
    const sc = sceneRef.current;
    if (phase !== "playing" || sc.stage !== "pick" || sc.picks.size !== TARGETS) return;
    clearTimeout(sc.tapTimer); // don't let a pending deselect fire after locking in
    sc.stage = "feedback";
    setStage("feedback");
    const correctCount = [...sc.picks].filter((idx) => sc.targetIdx.has(idx)).length;
    resolveShift(correctCount);
  }

  // The level the player came in at, for the results card (S2-27).
  const startLevelRef = useRef(1);

  function start() {
    const d = getDrill(playerId, "tracking");
    startLevelRef.current = d.level;
    engineRef.current = createAdaptiveLevel(d.level, {
      startUps: d.streak.ups,
      startDowns: d.streak.downs,
      ...gymCueHooks(),
    });
    setCorrect(0);
    setShift(0);
    setBonus(0);
    setPoints(0);
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
          points,
          meta: { ballPickups: bonus },
          streak: { ups: engineRef.current.ups, downs: engineRef.current.downs },
        })
      );
      cue("fanfare");
    }
  }, [phase, saved, correct, points, playerId]);

  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(sceneRef.current && sceneRef.current.tapTimer);
    },
    []
  );

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

  // Keyboard control (S2-28, "if there's a way we can have a keyboard piece in
  // here that would be ideal"). Digits index the skaters in reading order, which
  // is stable within a shift because the dots have stopped by the "pick" stage.
  useEffect(() => {
    if (phase !== "playing") return undefined;
    const onKey = (e) => {
      const sc = sceneRef.current;
      if (!sc || !sc.dots) return;

      if (e.code === "Space" || e.key === " ") {
        if (stage === "ready") {
          e.preventDefault();
          beginWatch();
        } else if (stage === "feedback") {
          e.preventDefault();
          advanceShift();
        }
        return;
      }
      if (stage !== "pick") return;

      if (e.key === "Enter") {
        e.preventDefault();
        lockIn();
        return;
      }
      if (e.key === "Backspace") {
        e.preventDefault();
        const last = [...sc.picks].pop();
        if (last == null) return;
        sc.picks.delete(last);
        if (sc.ballCall === last) {
          sc.ballCall = null;
          setBallCall(null);
        }
        setRemaining(TARGETS - sc.picks.size);
        return;
      }

      const n = parseInt(e.key, 10);
      if (!Number.isInteger(n) || n < 1) return;
      const target = readingOrder(sc.dots)[n - 1];
      if (!target) return;
      e.preventDefault();
      const idx = target.i;
      if (sc.picks.has(idx)) {
        // pressing the same digit again is the soccer-ball call, mirroring the
        // double-tap the pointer already has
        sc.ballCall = idx;
        setBallCall(idx);
        return;
      }
      if (sc.picks.size >= TARGETS) return;
      sc.picks.add(idx);
      setRemaining(TARGETS - sc.picks.size);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, stage]);

  const hint = {
    ready: shift < 3 ? "Take a deep breath, then tap Start shift" : "",
    watch: "Memorize the gold teammates",
    track: "Track them",
    pick:
      remaining > 0
        ? `Tap your ${remaining} teammate${remaining === 1 ? "" : "s"} (double-tap the ⚽ one, or press its number twice)`
        : "Double-tap your soccer-ball guess, then Lock in (Enter)",
    feedback:
      shiftResult === null
        ? ""
        : `You got ${shiftResult} of ${TARGETS} right${gotBall ? " · soccer ball +1 ⚽" : ""}`,
  }[stage];

  const bestLabel = phase === "done" && saved ? sessionRankLabel(saved.sessions, Math.round(points)) : null;

  return (
    <div className="gym-drill">
      {phase !== "intro" && <h2 className="gym-drill-title">Baylor's Pick</h2>}
      <div className="gym-track-layout">
        <aside className="gym-guide">
          <h3>How you level up</h3>
          <ul>
            <li>Tag all 3 teammates to bank a clean shift.</li>
            <li>3 clean shifts in a row moves you up a level.</li>
            <li>2 missed shifts in a row moves you down.</li>
            <li>Higher levels add more skaters, more speed, and a shorter look.</li>
            <li>One teammate has a soccer ball ⚽. Tag them for a bonus point.</li>
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
            {phase === "playing" && <span className="gym-chip">{points} pts</span>}
          </div>

          {phase === "intro" && (
            <div className="gym-card">
              <h2>Baylor's Pick</h2>
              <svg viewBox="0 0 280 110" width="100%" style={{ maxWidth: 280, display: "block", margin: "0 auto 14px", borderRadius: 10 }} aria-hidden="true">
                <rect width="280" height="110" rx="8" fill="#eaf4fb" />
                <circle cx="60" cy="40" r="14" fill="#f2b705" stroke="#9a7400" strokeWidth="2" />
                <circle cx="150" cy="70" r="14" fill="#f2b705" stroke="#9a7400" strokeWidth="2" />
                <circle cx="210" cy="35" r="14" fill="#f2b705" stroke="#9a7400" strokeWidth="2" />
                <circle cx="105" cy="82" r="14" fill="#ffffff" stroke="#5b7587" strokeWidth="2" />
                <circle cx="240" cy="82" r="14" fill="#ffffff" stroke="#5b7587" strokeWidth="2" />
                <text x="150" y="77" fontSize="18" textAnchor="middle">⚽</text>
              </svg>
              <p className="gym-goal"><strong>Your goal:</strong> follow the three marked teammates as they move.</p>
              <p>
                <strong>The game:</strong> tap Start shift. Three teammates flash
                gold, then all skaters look alike and move. When they stop, tap
                your three teammates and Lock in. To change a pick, tap it again.
                Bonus: double-tap a selected teammate to call who had the soccer
                ball. Check marks and crosses show your result.
              </p>
              <div className="gym-trains">
                <strong>Talk hockey</strong>
                <span>
                  Which teammate was hardest to follow through traffic? Describe
                  where you last saw them, as you would when talking through a play.
                </span>
              </div>
              <button className="gym-btn" onClick={start}>
                Start
              </button>
            </div>
          )}

          {phase === "playing" && <p className="gym-hint">{hint}</p>}

          {/* Action Rail. This drill used to render its controls BEFORE the
              canvas, so after tapping three dots on the ice the hand travelled
              up and out of the play surface — the longest control travel in the
              gym (S2-28). Now every control floats inside the rink, in the band
              the skaters are kept out of. */}
          <div className="gym-stage" style={{ display: phase === "playing" ? "block" : "none" }}>
            <canvas
              ref={canvasRef}
              className="gym-canvas"
              onMouseDown={handlePick}
              onTouchStart={handlePick}
            />

            {phase === "playing" && stage === "ready" && (
              <div className="gym-rail">
                <button className="gym-btn" onClick={beginWatch}>
                  Start shift
                  <kbd className="gym-key">space</kbd>
                </button>
              </div>
            )}

            {phase === "playing" && stage === "pick" && remaining === 0 && (
              <div className="gym-rail">
                <button className="gym-btn" onClick={lockIn}>
                  Lock in
                  <kbd className="gym-key">enter</kbd>
                </button>
              </div>
            )}

            {phase === "playing" && stage === "feedback" && (
              <div className="gym-rail">
                <button className="gym-btn" onClick={advanceShift}>
                  {shift + 1 >= SHIFTS ? "See the result" : "Next shift"}
                  <kbd className="gym-key">space</kbd>
                </button>
              </div>
            )}
          </div>

          {phase === "done" && (
            <div className="gym-card">
              <h2>Session complete</h2>
              <ScoreCount value={points} />
              <ConfettiBurst fire={!!bestLabel} />
              {bestLabel && <p className="gym-best">{bestLabel}</p>}
              <SessionSummary
                from={startLevelRef.current}
                to={level}
                engine={engineRef.current}
                points={points}
                saved={saved}
              />
              <p>
                {points} points. {correct} of {SHIFTS * TARGETS} teammates tracked.
                {bonus > 0 ? ` ${bonus} soccer ball${bonus === 1 ? "" : "s"} ⚽` : ""}
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
