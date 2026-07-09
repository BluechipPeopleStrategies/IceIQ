import { useRef, useState, useCallback, useEffect } from "react";
import {
  createAdaptiveLevel,
  setupCanvas,
  drawRink,
  pointerPos,
} from "./gymEngine";
import { getDrill, saveSession } from "./gymStorage";
import { cue, gymCueHooks } from "./gymAudio";
import { ScoreCount, ConfettiBurst } from "./gymFx";
import { sessionRankLabel } from "./gymProgressCore";
import { makeFormation, scoreTap } from "./snapshotCore";

// "Snapshot" — glance memory / perception span.
// A formation of skaters flashes on the rink for a short window, then everything
// hides. The player taps WHERE THE OPEN TEAMMATE WAS. The open teammate is a
// gold double-ringed marker; the rest are teammates (light-ringed dots) and
// defenders (a dot with an X through it) for clutter. Closer to the true spot
// scores more; landing in the success window counts as a hit and drives
// leveling. Higher levels flash shorter, add more clutter, and tighten the
// window. Trains reading the ice in one heads-up look before the puck arrives.

const REPS = 8;
const REVEAL_HOLD_MS = 2400; // freeze the result so the player can study where the open man was

export default function SnapshotDrill({ playerId = "default", onExit }) {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const sceneRef = useRef({});
  const timersRef = useRef([]);

  const [phase, setPhase] = useState("intro"); // intro | playing | done
  const [rep, setRep] = useState(0);
  const [hits, setHits] = useState(0);
  const [level, setLevel] = useState(() => getDrill(playerId, "snapshot").level);
  const [points, setPoints] = useState(0);
  const pointsRef = useRef(0);
  const [stage, setStage] = useState("ready"); // ready | flash | recall | reveal
  const [last, setLast] = useState(null); // { success, distFt, repPoints }
  const [saved, setSaved] = useState(null);

  function clearTimers() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }
  function schedule(fn, ms) {
    timersRef.current.push(setTimeout(fn, ms));
  }

  // Draw a single marker by kind. Shape carries the meaning so nothing relies on
  // color alone: open = gold double ring, teammate = filled dot with a light
  // ring, defender = dot with an X through it.
  function drawMarker(ctx, mk, r) {
    if (mk.kind === "open") {
      ctx.fillStyle = "#f2b705";
      ctx.beginPath();
      ctx.arc(mk.x, mk.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#9a7400";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(mk.x, mk.y, r, 0, Math.PI * 2);
      ctx.stroke();
      // outer double ring so the open teammate is unmistakable by shape
      ctx.strokeStyle = "#0b1b2b";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(mk.x, mk.y, r + 5, 0, Math.PI * 2);
      ctx.stroke();
      return;
    }
    if (mk.kind === "defender") {
      ctx.fillStyle = "#cdd9e1";
      ctx.beginPath();
      ctx.arc(mk.x, mk.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#5b7587";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(mk.x, mk.y, r, 0, Math.PI * 2);
      ctx.stroke();
      // an X through the dot marks a defender (shape, not color)
      ctx.strokeStyle = "#3d5061";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      const s = r * 0.6;
      ctx.beginPath();
      ctx.moveTo(mk.x - s, mk.y - s);
      ctx.lineTo(mk.x + s, mk.y + s);
      ctx.moveTo(mk.x + s, mk.y - s);
      ctx.lineTo(mk.x - s, mk.y + s);
      ctx.stroke();
      return;
    }
    // teammate: filled blue dot with a light ring
    ctx.fillStyle = "#1b6cb0";
    ctx.beginPath();
    ctx.arc(mk.x, mk.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#cfe6f6";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(mk.x, mk.y, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Render the rink plus, depending on the stage: the whole formation (flash),
  // a puck dot, or the marked-up reveal (true open spot, the tap, the window,
  // and the line between them).
  const render = useCallback(() => {
    const sc = sceneRef.current;
    if (!sc.ctx) return;
    const { ctx, W, H } = sc;
    drawRink(ctx, W, H);

    // faint in-ice title watermark across the top
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = "#0b1b2b";
    ctx.font = "700 30px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Snapshot", W / 2, H * 0.16);
    ctx.restore();

    // a puck near center, a small nod to a live play
    if (sc.puck) {
      ctx.fillStyle = "#0b1b2b";
      ctx.beginPath();
      ctx.arc(sc.puck.x, sc.puck.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // the flash: show the whole formation for the glance window
    if (sc.showFormation && sc.markers) {
      sc.markers.forEach((mk) => drawMarker(ctx, mk, sc.r));
    }

    // the reveal: where the open teammate really was, the player's tap, the
    // success window, and a line showing how close they came.
    if (sc.result && sc.open) {
      const o = sc.open;
      // success window around the true spot
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.setLineDash([4, 5]);
      ctx.strokeStyle = "#1b6cb0";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.hitR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // the true open teammate (gold double ring)
      drawMarker(ctx, { x: o.x, y: o.y, kind: "open" }, sc.r);

      if (sc.tap) {
        // faint line from the tap to the true spot
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.setLineDash([3, 4]);
        ctx.strokeStyle = "#0b1b2b";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sc.tap.x, sc.tap.y);
        ctx.lineTo(o.x, o.y);
        ctx.stroke();
        ctx.restore();

        // the tap marker: hit is a ringed circle, miss is an X (shape, not color)
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

  // Set up one rep: size the canvas, build the formation, and wait in "ready"
  // until the player taps Show me. Nothing flashes until then.
  const startRep = useCallback((repIndex) => {
    const canvas = canvasRef.current;
    const host = rootRef.current;
    if (!canvas || !host) return;
    clearTimers();
    const { ctx, W, H } = setupCanvas(canvas, host);
    const form = makeFormation(engineRef.current.level, W, H);
    const open = {
      x: form.markers[form.openIndex].x,
      y: form.markers[form.openIndex].y,
      hitR: form.hitR,
    };
    sceneRef.current = {
      ctx,
      W,
      H,
      markers: form.markers,
      open,
      r: form.r,
      flashMs: form.flashMs,
      puck: { x: W / 2, y: H / 2 },
      showFormation: false,
      armed: false, // becomes true once the formation has been shown (accepts taps)
      tap: null,
      result: null,
      resolved: false,
      repIndex,
    };
    setStage("ready");
    render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [render]);

  // Player tapped Show me: flash the formation for the glance window, then hide.
  function showFormation() {
    const sc = sceneRef.current;
    if (!sc.ctx || sc.resolved || sc.armed) return;
    sc.showFormation = true;
    setStage("flash");
    render();
    schedule(() => {
      const s = sceneRef.current;
      if (s.resolved) return;
      s.showFormation = false;
      s.armed = true; // now the recall window is open; taps count
      setStage("recall");
      render();
    }, sc.flashMs);
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

  function handleTap(evt) {
    const sc = sceneRef.current;
    if (phase !== "playing" || !sc.open || sc.resolved) return;
    // ignore taps before the formation has flashed and hidden (no peeking)
    if (!sc.armed) return;
    evt.preventDefault();
    const tap = pointerPos(evt, canvasRef.current);
    const result = scoreTap(tap, sc.open, sc.W, sc.H);
    sc.resolved = true;
    sc.tap = tap;
    sc.result = result;
    sc.repPoints = result.points;
    setStage("reveal");
    clearTimers();
    setLast({ success: result.success, distFt: Math.round(result.distFt), repPoints: result.points });
    render();
    resolveRep(result.success);
  }

  function start() {
    const d = getDrill(playerId, "snapshot");
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
      const record = saveSession(playerId, "snapshot", {
        score,
        points: pointsRef.current,
        level: engineRef.current.level,
        streak: { ups: engineRef.current.ups, downs: engineRef.current.downs },
      });
      setSaved(record);
      cue("fanfare");
    }
  }, [phase, saved, hits, playerId]);

  // Re-fit and redraw on resize without skipping to the next rep. Rescale the
  // stored positions so the formation/result stays put.
  useEffect(() => {
    if (phase !== "playing") return;
    const onResize = () => {
      const canvas = canvasRef.current;
      const host = rootRef.current;
      const sc = sceneRef.current;
      if (!canvas || !host || !sc.open) return;
      const prevW = sc.W || 1;
      const prevH = sc.H || 1;
      const { ctx, W, H } = setupCanvas(canvas, host);
      const kx = W / prevW;
      const ky = H / prevH;
      const k = Math.min(kx, ky);
      sc.ctx = ctx;
      sc.W = W;
      sc.H = H;
      sc.r = Math.max(11, Math.round(W * 0.026));
      sc.markers = sc.markers.map((m) => ({ ...m, x: m.x * kx, y: m.y * ky }));
      sc.open = { x: sc.open.x * kx, y: sc.open.y * ky, hitR: sc.open.hitR * k };
      if (sc.puck) sc.puck = { x: sc.puck.x * kx, y: sc.puck.y * ky };
      if (sc.tap) sc.tap = { x: sc.tap.x * kx, y: sc.tap.y * ky };
      render();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [phase, render]);

  useEffect(() => () => clearTimers(), []);

  const hint = {
    ready: "Tap Show me, then take one quick snapshot of the ice.",
    flash: "Snapshot. Find the open teammate (gold).",
    recall: "Now tap where the open teammate was.",
    reveal: last
      ? last.success
        ? `Found the open man! +${last.repPoints} (${last.distFt} ft off)`
        : `Not quite, ${last.distFt} ft away. The gold ring shows where he was.`
      : "",
  }[stage];

  const bestLabel = phase === "done" && saved ? sessionRankLabel(saved.sessions, Math.round(points)) : null;

  return (
    <div className="gym-drill" ref={rootRef}>
      {phase !== "intro" && <h2 className="gym-drill-title">Snapshot</h2>}
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
            Look {Math.min(rep + 1, REPS)} / {REPS}
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
          <h2>Snapshot</h2>
          <svg viewBox="0 0 280 110" width="100%" style={{ maxWidth: 280, display: "block", margin: "0 auto 14px", borderRadius: 10 }} aria-hidden="true">
            <rect width="280" height="110" rx="8" fill="#eaf4fb" />
            {/* a puck near the middle */}
            <circle cx="140" cy="58" r="5" fill="#0b1b2b" />
            {/* teammates */}
            <circle cx="70" cy="34" r="11" fill="#1b6cb0" stroke="#cfe6f6" strokeWidth="2.5" />
            <circle cx="215" cy="78" r="11" fill="#1b6cb0" stroke="#cfe6f6" strokeWidth="2.5" />
            {/* a defender (dot with an X) */}
            <circle cx="105" cy="84" r="11" fill="#cdd9e1" stroke="#5b7587" strokeWidth="2" />
            <path d="M99 78 l12 12 M111 78 l-12 12" stroke="#3d5061" strokeWidth="2.5" strokeLinecap="round" />
            {/* the open teammate (gold double ring) */}
            <circle cx="205" cy="30" r="11" fill="#f2b705" stroke="#9a7400" strokeWidth="2.5" />
            <circle cx="205" cy="30" r="16" fill="none" stroke="#0b1b2b" strokeWidth="2" />
          </svg>
          <p className="gym-goal"><strong>Your goal:</strong> take one quick snapshot of the ice and remember where the open teammate was.</p>
          <p>
            <strong>The game:</strong> tap Show me and the whole formation flashes
            for a split second, then hides. One teammate is clearly the open one
            (a gold double-ringed marker). The rest are teammates and defenders
            (a dot with an X) to read past. After it hides, tap the spot where the
            open teammate was. Landing in the same spot counts, and the closer you
            are the more points you earn. As you level up the flash gets shorter,
            the ice gets busier, and the window tightens. You start each look when
            you are ready.
          </p>
          <div className="gym-trains">
            <strong>Why it matters</strong>
            <span>
              Good players read the ice in one heads-up look before the pass
              arrives, so they already know their options the moment they get the
              puck. Training that one-glance snapshot is how you make a quick play
              under pressure instead of stickhandling with your head down looking
              for help.
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

      {phase === "playing" && stage === "ready" && (
        <div className="gym-row" style={{ marginBottom: 10 }}>
          <button className="gym-btn" onClick={showFormation}>
            Show me
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
          <ScoreCount value={points} />
          <ConfettiBurst fire={!!bestLabel} />
          {bestLabel && <p className="gym-best">{bestLabel}</p>}
          <p>
            {points} points. {hits} of {REPS} open teammates found. Level {level}.
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
