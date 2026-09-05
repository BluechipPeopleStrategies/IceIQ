import { drawHockeyPuck } from "../visuals/hockeyArtCanvas.js";
import { useRef, useState, useCallback, useEffect } from "react";
import {
  createAdaptiveLevel,
  setupCanvas,
  drawRink,
  pointerPos,
  GYM_TARGET_MAX_Y,
  REPS_PER_SESSION,
} from "./gymEngine";
import { getDrill, saveSession } from "./gymStorage";
import { cue, gymCueHooks } from "./gymAudio";
import { ScoreCount, ConfettiBurst, SessionSummary } from "./gymFx";
import { sessionRankLabel } from "./gymProgressCore";
import {
  makeRound,
  scorePrimary,
  scoreSecondary,
  combine,
} from "./twoThingsCore";
import GymVisualStage from "./GymVisualStage";
import RemainingDrillsScene3D from "./RemainingDrillsScene3D";

// "Two Things at Once" — divided attention / dual task.
// Two tasks run at the same time and BOTH count. PRIMARY: a puck slides across
// the rink and you tap it as it crosses the red center line (a timed window
// around the crossing). SECONDARY: while the puck travels, a SHAPE cue flashes
// briefly at the top (circle / triangle / square) and you tap the matching shape
// button before the puck leaves the ice. Per rep: a ready stage (rink shown, a Go
// button), then on tap the puck enters one side and slides across; partway along,
// the shape cue flashes and the shape buttons enable. The round is a success only
// if you BOTH catch the crossing in its window AND pick the right shape. Points
// give partial credit so doing both well beats doing one. Higher levels speed the
// puck (a tighter crossing window), shorten the cue, fire the cue closer to the
// crossing (more interference), and add a third shape choice. You start each rep
// when you are ready.

const REPS = REPS_PER_SESSION;
const REVEAL_HOLD_MS = 1800; // hold both results so the player can learn from them

export default function TwoThingsDrill({ playerId = "default", onExit }) {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const sceneRef = useRef({});
  const timersRef = useRef([]);
  const rafRef = useRef(0);

  const [phase, setPhase] = useState("intro"); // intro | playing | done
  const [rep, setRep] = useState(0);
  const [hits, setHits] = useState(0);
  const [level, setLevel] = useState(() => getDrill(playerId, "twothings").level);
  const [points, setPoints] = useState(0);
  const pointsRef = useRef(0);
  const [stage, setStage] = useState("ready"); // ready | live | reveal
  const [cueActive, setCueActive] = useState(false); // shape buttons enabled
  const [last, setLast] = useState(null); // { success, repPoints, primaryHit, secondaryHit, cueShape, picked }
  const [saved, setSaved] = useState(null);
  // force re-render of the live shape cue / buttons without touching the scene ref
  const [, setTickN] = useState(0);

  function clearTimers() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
  }
  function schedule(fn, ms) {
    timersRef.current.push(setTimeout(fn, ms));
  }

  // Draw the puck: a dark dot with a white ring (distinct by shape, not color),
  // travelling its straight lane.
  function drawPuck(ctx, x, y, r) {
    drawHockeyPuck(ctx, x, y, r, { ringWidth: Math.max(2, r * 0.35), ringColour: "#ffffff" });
  }

  // Draw a shape glyph centered at (x, y) with half-size s, stroked navy. Shapes
  // are distinguished by SHAPE alone (circle / triangle / square), never color.
  function drawShape(ctx, shape, x, y, s, opts = {}) {
    ctx.save();
    ctx.lineWidth = opts.lineWidth || 3;
    ctx.strokeStyle = opts.stroke || "#0b1b2b";
    ctx.fillStyle = opts.fill || "rgba(27,108,176,0.18)";
    ctx.beginPath();
    if (shape === "circle") {
      ctx.arc(x, y, s, 0, Math.PI * 2);
    } else if (shape === "square") {
      ctx.rect(x - s, y - s, s * 2, s * 2);
    } else {
      // triangle (point up)
      ctx.moveTo(x, y - s);
      ctx.lineTo(x + s, y + s);
      ctx.lineTo(x - s, y + s);
      ctx.closePath();
    }
    if (opts.fill !== "none") ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // Render the scene. In "ready" we show the rink + watermark. In "live" we draw
  // the puck along its lane, pulse the red center line while the puck is in the
  // tap window, and flash the shape cue near the top while it is showing. In
  // "reveal" we mark the puck's crossing spot and the cue result.
  const render = useCallback(() => {
    const sc = sceneRef.current;
    if (!sc.ctx) return;
    const { ctx, W, H } = sc;
    drawRink(ctx, W, H);

    // faint in-ice title watermark across the top
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = "#0b1b2b";
    ctx.font = "700 26px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Two Things at Once", W / 2, H * 0.16);
    ctx.restore();

    if (!sc.round) return;

    const cx = W / 2;

    // pulse the red center line while the puck is inside the tap window: a thicker,
    // brighter band so "tap now" is visible. (Color is paired with the obvious
    // moving puck and the band thickening, not color alone.)
    if (sc.stage === "live" && sc.inWindow) {
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = "#c8102e";
      ctx.fillRect(cx - 5, 4, 10, H - 8);
      ctx.restore();
    }

    // the shape cue, flashed near the top while showing
    if (sc.stage === "live" && sc.cueShowing) {
      // The cue flashes directly above the shape buttons instead of at the far
      // end of the rink from them. It used to sit at H*0.2 while the buttons sat
      // below the canvas — roughly 500px apart on a phone, in a drill that gives
      // you 600ms to use both. That was a motor-travel problem wearing a
      // cognitive-load costume (S2-25).
      const cueY = H * (GYM_TARGET_MAX_Y - 0.08);
      drawShape(ctx, sc.round.cueShape, cx, cueY, Math.max(16, H * 0.07), {
        fill: "rgba(242,183,5,0.22)",
        stroke: "#0b1b2b",
        lineWidth: 4,
      });
    }

    // live puck travelling its lane
    if (sc.stage === "live" && sc.pos) {
      drawPuck(ctx, sc.pos.x, sc.pos.y, sc.r);
    }

    // reveal: show where the puck crossed center and where the player tapped.
    if (sc.stage === "reveal") {
      // the exact crossing spot on the center line (gold dot = where to time it)
      ctx.fillStyle = "#f2b705";
      ctx.beginPath();
      ctx.arc(cx, sc.laneY, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#0b1b2b";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, sc.laneY, 12, 0, Math.PI * 2);
      ctx.stroke();
      // the puck's resting spot at the exit
      if (sc.pos) drawPuck(ctx, sc.pos.x, sc.pos.y, sc.r);
      // mark the primary result by shape: a ring for a catch, an X for a miss
      if (sc.tapPos) {
        ctx.lineWidth = 3;
        ctx.strokeStyle = sc.result.primaryHit ? "#1b6cb0" : "#e8590c";
        if (sc.result.primaryHit) {
          ctx.beginPath();
          ctx.arc(sc.tapPos.x, sc.tapPos.y, 11, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          const s = 9;
          ctx.beginPath();
          ctx.moveTo(sc.tapPos.x - s, sc.tapPos.y - s);
          ctx.lineTo(sc.tapPos.x + s, sc.tapPos.y + s);
          ctx.moveTo(sc.tapPos.x + s, sc.tapPos.y - s);
          ctx.lineTo(sc.tapPos.x - s, sc.tapPos.y + s);
          ctx.stroke();
        }
      }
    }
  }, []);

  // The live travel loop: move the puck along its straight lane at the level's
  // speed. Tracks whether the puck is in the center tap window (pulses the line),
  // when the shape cue should be showing, and finishes the rep when the puck
  // exits (auto-resolving any sub-task the player left undone). startTs anchors
  // the clock so a resize never restarts the travel.
  const tick = useCallback(() => {
    const sc = sceneRef.current;
    if (sc.stage !== "live" || sc.resolved) return;
    const t = performance.now() - sc.startTs; // ms since launch
    const round = sc.round;
    const frac = t / round.travelMs;

    if (frac >= 1) {
      // puck has exited: the rep is over. Resolve with whatever the player did.
      finishRep();
      return;
    }

    sc.pos = {
      x: sc.from.x + (sc.to.x - sc.from.x) * frac,
      y: sc.laneY,
    };
    // primary tap window: within +/- half the cross window of the crossing time.
    const half = round.crossWindowMs / 2;
    sc.inWindow = Math.abs(t - round.crossAtMs) <= half;

    // shape cue showing: from cueAtMs for cueWindowMs (and while puck is on ice).
    const cueEnd = round.cueAtMs + round.cueWindowMs;
    const showing = t >= round.cueAtMs && t <= cueEnd;
    if (showing && !sc.cueOpenedTs) {
      sc.cueOpenedTs = sc.startTs + round.cueAtMs; // anchor the answer clock
    }
    const wasShowing = sc.cueShowing;
    sc.cueShowing = showing;
    // shape buttons stay enabled once the cue has opened until the cue window ends
    // or the player answers (so they can answer right as it flashes).
    const active = t >= round.cueAtMs && t <= cueEnd && sc.secondaryChoice == null;
    if (active !== sc.cueActive || wasShowing !== showing) {
      sc.cueActive = active;
      setCueActive(active);
    }

    render();
    rafRef.current = requestAnimationFrame(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [render]);

  // Set up one rep: size the canvas, build the round, pick a horizontal lane and a
  // direction. Wait in "ready" until the player taps Go. Nothing moves until then.
  const startRep = useCallback((repIndex) => {
    const canvas = canvasRef.current;
    const host = rootRef.current;
    if (!canvas || !host) return;
    clearTimers();
    const { ctx, W, H } = setupCanvas(canvas, host);
    const lvl = engineRef.current.level;
    const round = makeRound(lvl, {});
    const r = Math.max(8, Math.round(W * 0.018));

    // a horizontal lane in the mid band so the puck crosses the center line; the
    // crossing happens at x = W/2 by construction (crossAtMs = travel/2).
    const laneY = H * (0.35 + Math.random() * 0.3);
    const leftToRight = repIndex % 2 === 0;
    const from = { x: leftToRight ? -r * 2 : W + r * 2, y: laneY };
    const to = { x: leftToRight ? W + r * 2 : -r * 2, y: laneY };

    sceneRef.current = {
      ctx,
      W,
      H,
      round,
      r,
      from,
      to,
      laneY,
      pos: null,
      stage: "ready",
      startTs: null,
      cueOpenedTs: null,
      cueShowing: false,
      cueActive: false,
      inWindow: false,
      primaryTapMs: null, // ms from launch the player tapped the puck (once)
      tapPos: null,
      secondaryChoice: null, // index the player picked for the shape
      secondaryMs: null,
      resolved: false,
      repIndex,
    };
    setStage("ready");
    setCueActive(false);
    render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [render]);

  // Player tapped Go: launch the puck.
  function go() {
    const sc = sceneRef.current;
    if (!sc.ctx || sc.resolved || sc.stage !== "ready") return;
    sc.stage = "live";
    sc.startTs = performance.now();
    setStage("live");
    rafRef.current = requestAnimationFrame(tick);
  }

  // Tap on the canvas: register the PRIMARY tap (catch the crossing). Only the
  // first tap counts; we record the moment it landed for scoring at the end.
  function handleCanvasTap(evt) {
    const sc = sceneRef.current;
    if (phase !== "playing" || sc.stage !== "live" || sc.resolved) return;
    if (sc.primaryTapMs != null) return; // only the first puck tap counts
    evt.preventDefault();
    sc.primaryTapMs = performance.now() - sc.startTs;
    sc.tapPos = pointerPos(evt, canvasRef.current);
    setTickN((n) => n + 1);
  }

  function handleTapAt(tap) {
    const sc = sceneRef.current;
    if (phase !== "playing" || sc.stage !== "live" || sc.resolved || sc.primaryTapMs != null) return;
    sc.primaryTapMs = performance.now() - sc.startTs;
    sc.tapPos = tap;
    setTickN((n) => n + 1);
  }

  // Tap a shape button: register the SECONDARY answer (only the first counts).
  function pickShape(choiceIndex) {
    const sc = sceneRef.current;
    if (phase !== "playing" || sc.stage !== "live" || sc.resolved) return;
    if (!sc.cueActive || sc.secondaryChoice != null) return;
    sc.secondaryChoice = choiceIndex;
    sc.secondaryMs = sc.cueOpenedTs != null ? performance.now() - sc.cueOpenedTs : null;
    sc.cueActive = false;
    setCueActive(false);
  }

  // The puck has exited (or we are wrapping up): grade both sub-tasks, reveal,
  // hold, then advance.
  function finishRep() {
    const sc = sceneRef.current;
    if (sc.resolved) return;
    sc.resolved = true;
    sc.stage = "reveal";
    clearTimers();

    const round = sc.round;
    const primary = scorePrimary(sc.primaryTapMs, round.crossAtMs, round.crossWindowMs);
    const secondary = scoreSecondary(
      sc.secondaryChoice,
      round.cueAnswerIndex,
      sc.secondaryMs,
      round.cueWindowMs
    );
    const result = combine(primary, secondary);

    sc.result = {
      primaryHit: primary.hit,
      secondaryHit: secondary.hit,
      success: result.success,
      points: result.points,
    };
    sc.repPoints = result.points;
    // park the puck at the exit so the reveal shows where it went
    sc.pos = { x: sc.to.x, y: sc.laneY };

    setStage("reveal");
    setCueActive(false);
    setLast({
      success: result.success,
      repPoints: result.points,
      primaryHit: primary.hit,
      secondaryHit: secondary.hit,
      cueShape: round.cueShape,
      picked: sc.secondaryChoice != null ? round.cueChoices[sc.secondaryChoice] : null,
    });
    render();

    pointsRef.current += result.points;
    setPoints(pointsRef.current);
    const lvl = engineRef.current.record(result.success);
    setLevel(lvl);
    if (result.success) setHits((h) => h + 1);

    const next = sc.repIndex + 1;
    schedule(() => {
      if (next >= REPS) {
        setPhase("done");
      } else {
        setRep(next);
        startRep(next);
      }
    }, REVEAL_HOLD_MS);
  }

  // The level the player came in at, for the results card (S2-27).
  const startLevelRef = useRef(1);

  function start() {
    const d = getDrill(playerId, "twothings");
    startLevelRef.current = d.level;
    engineRef.current = createAdaptiveLevel(d.level, {
      // Dual-task load saturates well before the generic 20-level ceiling, and
      // two bad reps in a row is a harsh relegation on a drill this demanding —
      // that is the spiral that put a U13 player at level 4 (S2-25).
      maxLevel: 12,
      downStreak: 3,
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
      const record = saveSession(playerId, "twothings", {
        score,
        points: pointsRef.current,
        level: engineRef.current.level,
        streak: { ups: engineRef.current.ups, downs: engineRef.current.downs },
      });
      setSaved(record);
      cue("fanfare");
    }
  }, [phase, saved, hits, playerId]);

  // Re-fit and redraw on resize without skipping the rep. Rescale the lane and
  // current position; the travel clock (startTs) keeps running so resizing never
  // restarts the puck.
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
      sc.r = Math.max(8, Math.round(W * 0.018));
      sc.laneY = sc.laneY * ky;
      const scaleP = (p) => (p ? { x: p.x * kx, y: sc.laneY } : p);
      sc.from = sc.from ? { x: sc.from.x * kx, y: sc.laneY } : sc.from;
      sc.to = sc.to ? { x: sc.to.x * kx, y: sc.laneY } : sc.to;
      sc.pos = scaleP(sc.pos);
      if (sc.tapPos) sc.tapPos = { x: sc.tapPos.x * kx, y: sc.tapPos.y * ky };
      render();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [phase, render]);

  useEffect(() => () => clearTimers(), []);

  // Action Rail rule 7: Space fires the one primary rail action. This drill
  // auto-advances after the reveal hold, so `Go` at the ready stage is the only
  // primary action there is — the shape buttons are the answer, not progression,
  // and binding a key to them would hand a keyboard player a faster input than
  // the tap the drill is actually timing.
  useEffect(() => {
    if (phase !== "playing" || stage !== "ready") return undefined;
    const onKey = (e) => {
      if (e.code !== "Space" && e.key !== " ") return;
      e.preventDefault();
      go();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, stage]);

  const choices = sceneRef.current.round ? sceneRef.current.round.cueChoices : [];
  const answerIndex = sceneRef.current.round ? sceneRef.current.round.cueAnswerIndex : -1;
  const pickedIndex = sceneRef.current.secondaryChoice;

  // small inline SVG glyph for a shape button (matches the canvas shapes)
  function ShapeGlyph({ shape, size = 26 }) {
    const s = size / 2 - 3;
    const c = size / 2;
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        {shape === "circle" && (
          <circle cx={c} cy={c} r={s} fill="rgba(27,108,176,0.18)" stroke="#0b1b2b" strokeWidth="2.5" />
        )}
        {shape === "square" && (
          <rect x={c - s} y={c - s} width={s * 2} height={s * 2} fill="rgba(27,108,176,0.18)" stroke="#0b1b2b" strokeWidth="2.5" />
        )}
        {shape === "triangle" && (
          <polygon points={`${c},${c - s} ${c + s},${c + s} ${c - s},${c + s}`} fill="rgba(27,108,176,0.18)" stroke="#0b1b2b" strokeWidth="2.5" />
        )}
      </svg>
    );
  }

  const hint = {
    ready: "Tap Go. Tap the puck at the red center line and match the shape above the buttons.",
    live: "Tap the puck right as it hits center, and pick the shape that just flashed. Both count.",
    reveal: last
      ? last.success
        ? `Both at once, nice. +${last.repPoints}`
        : `${last.primaryHit ? "Caught the crossing" : "Missed the crossing"}, ${last.secondaryHit ? "right shape" : "wrong shape"}. Try to land both. +${last.repPoints}`
      : "",
  }[stage];

  const shapeWord = { circle: "circle", triangle: "triangle", square: "square" };

  const bestLabel = phase === "done" && saved ? sessionRankLabel(saved.sessions, Math.round(points)) : null;

  return (
    <div className="gym-drill" ref={rootRef}>
      {phase !== "intro" && <h2 className="gym-drill-title">Two Things at Once</h2>}
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
          <h2>Two Things at Once</h2>
          <svg viewBox="0 0 280 130" width="100%" style={{ maxWidth: 280, display: "block", margin: "0 auto 14px", borderRadius: 10 }} aria-hidden="true">
            <rect width="280" height="130" rx="8" fill="#eaf4fb" />
            {/* red center line + a puck crossing it */}
            <rect x="137" y="40" width="6" height="80" fill="#c8102e" opacity="0.85" />
            <line x1="60" y1="80" x2="120" y2="80" stroke="#9fc3df" strokeWidth="4" strokeLinecap="round" />
            <circle cx="140" cy="80" r="11" fill="#0b1b2b" stroke="#ffffff" strokeWidth="4" />
            {/* a shape cue flashing up top */}
            <polygon points="140,12 152,34 128,34" fill="rgba(242,183,5,0.3)" stroke="#0b1b2b" strokeWidth="2.5" />
            {/* two shape buttons */}
            <circle cx="206" cy="100" r="11" fill="rgba(27,108,176,0.18)" stroke="#0b1b2b" strokeWidth="2.5" />
            <rect x="236" y="89" width="22" height="22" fill="rgba(27,108,176,0.18)" stroke="#0b1b2b" strokeWidth="2.5" />
          </svg>
          <p className="gym-goal"><strong>Your goal:</strong> time the puck crossing and match the flashed shape in each round.</p>
          <p>
            <strong>The game:</strong> tap Go. Tap the puck as it crosses the red
            center line. A shape also flashes just above the buttons. Tap the
            matching shape button before the puck leaves the ice. Make both taps
            during the round; they do not have to happen at the same instant.
            Both answers must match for a successful round.
          </p>
          <div className="gym-trains">
            <strong>Talk hockey</strong>
            <span>
              Which cue did you notice first? Talk with a coach about a moment
              when you wanted to watch the puck and another player.
            </span>
          </div>
          <button className="gym-btn" onClick={start}>
            Start
          </button>
        </div>
      )}

      <div style={{ display: phase === "playing" ? "block" : "none" }}>
        <GymVisualStage
          active={phase === "playing"}
          canvasRef={canvasRef}
          onCanvasPointer={handleCanvasTap}
          inputLayer="webgl"
          ariaLabel="Three-dimensional rink with a moving puck and a second shape cue."
          camera={{ position: [0, 86, 0], fov: 40, near: 0.1, far: 180 }}
          scene3d={<RemainingDrillsScene3D mode="twothings" sceneRef={sceneRef} onTap={handleTapAt} />}
        >

        {/* Action Rail. Rule 4 — multi-choice controls use the same rail, and
            this drill is the reason that rule exists: the shape cue flashed at
            the top of the rink while the shape buttons sat below the canvas,
            roughly 500px apart on a phone, in a drill that gives you 600ms to
            use both. The cue already moved to just above the rail; this puts
            the buttons there too, so the cue and its answer are adjacent. */}
        {phase === "playing" && stage === "ready" && (
          <div className="gym-rail">
            <button className="gym-btn" onClick={go}>
              Go
              <kbd className="gym-key">space</kbd>
            </button>
          </div>
        )}

        {phase === "playing" && (stage === "live" || stage === "reveal") && (
          <div className="gym-rail">
            {choices.map((shape, i) => {
              const isAnswer = i === answerIndex;
              const isPicked = pickedIndex === i;
              // On reveal, mark the matching shape (check) and a wrong pick (cross)
              // by label so feedback never rides on color alone.
              let suffix = "";
              if (stage === "reveal") {
                if (isAnswer) suffix = " ✓";
                else if (isPicked) suffix = " ✗";
              }
              return (
                <button
                  key={i}
                  className="gym-btn"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                  disabled={stage === "reveal" || !cueActive || pickedIndex != null}
                  onClick={() => pickShape(i)}
                  aria-label={shapeWord[shape]}
                >
                  <ShapeGlyph shape={shape} />
                  <span>{shapeWord[shape]}{suffix}</span>
                </button>
              );
            })}
          </div>
        )}
        </GymVisualStage>
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
            {points} points. {hits} of {REPS} rounds with both the crossing and the
            shape.
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
