import { useRef, useState, useCallback, useEffect } from "react";
import {
  createAdaptiveLevel,
  setupCanvas,
  drawRink,
  pointerPos,
  REPS_PER_SESSION,
} from "./gymEngine";
import { getDrill, saveSession } from "./gymStorage";
import { cue, gymCueHooks } from "./gymAudio";
import { ScoreCount, ConfettiBurst, SessionSummary } from "./gymFx";
import { sessionRankLabel } from "./gymProgressCore";
import { makeFormation, scoreLane } from "./findLaneCore";

// "Find the Lane" — spatial pattern recognition.
// You carry the puck (YOU, lower middle). Several teammates spread out as open
// targets; defenders clog the ice. EXACTLY one teammate has a clean passing
// lane. Tap that teammate before the lane closes (a shrinking countdown ring).
// On reveal, the open lane is drawn as a clear line to the right teammate and
// the blocked lanes are faded with an X, so the player learns the read. Higher
// levels add receivers and defenders, tighten the open seam, and close faster.
// Trains seeing the open seam and threading the pass before it disappears.

const REPS = REPS_PER_SESSION;

export default function FindLaneDrill({ playerId = "default", onExit }) {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const sceneRef = useRef({});
  const timersRef = useRef([]);
  const rafRef = useRef(0);

  const [phase, setPhase] = useState("intro"); // intro | playing | done
  const [rep, setRep] = useState(0);
  const [hits, setHits] = useState(0);
  const [level, setLevel] = useState(() => getDrill(playerId, "findlane").level);
  const [points, setPoints] = useState(0);
  const pointsRef = useRef(0);
  const [stage, setStage] = useState("ready"); // ready | live | reveal
  const [last, setLast] = useState(null); // { success, repPoints, expired }
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

  // Draw the puck carrier (YOU): a gold dot with a dark ring and a small puck
  // beside it so the carrier is distinct by shape, not color alone.
  function drawYou(ctx, p, r) {
    ctx.fillStyle = "#f2b705";
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#0b1b2b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.stroke();
    // the puck, tucked at the carrier's feet
    ctx.fillStyle = "#0b1b2b";
    ctx.beginPath();
    ctx.arc(p.x + r * 0.9, p.y + r * 0.7, Math.max(4, r * 0.32), 0, Math.PI * 2);
    ctx.fill();
    // "YOU" label
    ctx.fillStyle = "#0b1b2b";
    ctx.font = `700 ${Math.round(r * 0.8)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("YOU", p.x, p.y);
    ctx.textBaseline = "alphabetic";
  }

  // A teammate (receiver): a filled blue dot with a light ring.
  function drawReceiver(ctx, p, r) {
    ctx.fillStyle = "#1b6cb0";
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#cfe6f6";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // A defender: a grey dot with an X through it (shape, not color alone).
  function drawDefender(ctx, p, r) {
    ctx.fillStyle = "#cdd9e1";
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#5b7587";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "#3d5061";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    const s = r * 0.6;
    ctx.beginPath();
    ctx.moveTo(p.x - s, p.y - s);
    ctx.lineTo(p.x + s, p.y + s);
    ctx.moveTo(p.x + s, p.y - s);
    ctx.lineTo(p.x - s, p.y + s);
    ctx.stroke();
  }

  // Render the scene. During "live" we draw the formation plus a shrinking
  // countdown ring around YOU. On "reveal" we draw the open lane (clear green
  // line), the blocked lanes (faded, with an X), and mark the player's pick.
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
    ctx.fillText("Find the Lane", W / 2, H * 0.16);
    ctx.restore();

    if (!sc.you) return;

    // reveal: draw lanes first (under the markers)
    if (sc.result) {
      sc.receivers.forEach((rc, i) => {
        const isOpen = i === sc.openIndex;
        ctx.save();
        if (isOpen) {
          // the open lane: a clear, solid line (also dotted so it reads without color)
          ctx.strokeStyle = "#1f9d55";
          ctx.lineWidth = 3.5;
          ctx.globalAlpha = 0.95;
          ctx.beginPath();
          ctx.moveTo(sc.you.x, sc.you.y);
          ctx.lineTo(rc.x, rc.y);
          ctx.stroke();
        } else {
          // a blocked lane: faded line with an X at its midpoint
          ctx.strokeStyle = "#8a98a3";
          ctx.lineWidth = 1.5;
          ctx.globalAlpha = 0.4;
          ctx.setLineDash([4, 5]);
          ctx.beginPath();
          ctx.moveTo(sc.you.x, sc.you.y);
          ctx.lineTo(rc.x, rc.y);
          ctx.stroke();
          ctx.setLineDash([]);
          const mx = (sc.you.x + rc.x) / 2;
          const my = (sc.you.y + rc.y) / 2;
          ctx.globalAlpha = 0.7;
          ctx.strokeStyle = "#3d5061";
          ctx.lineWidth = 2.5;
          ctx.lineCap = "round";
          const s = 7;
          ctx.beginPath();
          ctx.moveTo(mx - s, my - s);
          ctx.lineTo(mx + s, my + s);
          ctx.moveTo(mx + s, my - s);
          ctx.lineTo(mx - s, my + s);
          ctx.stroke();
        }
        ctx.restore();
      });
    }

    // defenders
    sc.defenders.forEach((d) => drawDefender(ctx, d, sc.r));
    // receivers
    sc.receivers.forEach((rc) => drawReceiver(ctx, rc, sc.r));
    // the puck carrier
    drawYou(ctx, sc.you, sc.r);

    // reveal: mark the correct open teammate and the player's pick
    if (sc.result) {
      const open = sc.receivers[sc.openIndex];
      // a green ring on the correct open teammate
      ctx.save();
      ctx.strokeStyle = "#1f9d55";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(open.x, open.y, sc.r + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      if (sc.tappedIndex != null && sc.tappedIndex >= 0) {
        const picked = sc.receivers[sc.tappedIndex];
        ctx.save();
        ctx.lineWidth = 3;
        if (sc.result.success) {
          // correct pick: a check-style ring (already green above); add a tick
          ctx.strokeStyle = "#1f9d55";
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(picked.x - sc.r * 0.4, picked.y);
          ctx.lineTo(picked.x - sc.r * 0.1, picked.y + sc.r * 0.4);
          ctx.lineTo(picked.x + sc.r * 0.45, picked.y - sc.r * 0.4);
          ctx.stroke();
        } else {
          // wrong pick: an X on the chosen teammate (shape, not color alone)
          ctx.strokeStyle = "#e8590c";
          ctx.lineCap = "round";
          const s = sc.r * 0.55;
          ctx.beginPath();
          ctx.moveTo(picked.x - s, picked.y - s);
          ctx.lineTo(picked.x + s, picked.y + s);
          ctx.moveTo(picked.x + s, picked.y - s);
          ctx.lineTo(picked.x - s, picked.y + s);
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    // live: a shrinking countdown ring around YOU shows the lane closing
    if (sc.stage === "live" && sc.startTs != null) {
      const elapsed = Math.min(performance.now() - sc.startTs, sc.closeMs);
      const frac = 1 - elapsed / sc.closeMs; // 1 -> 0
      ctx.save();
      // track
      ctx.strokeStyle = "rgba(11,27,43,0.18)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(sc.you.x, sc.you.y, sc.r + 12, 0, Math.PI * 2);
      ctx.stroke();
      // remaining arc (gold), drawn clockwise from the top, shrinking
      ctx.strokeStyle = frac > 0.33 ? "#1b6cb0" : "#e8590c";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(
        sc.you.x,
        sc.you.y,
        sc.r + 12,
        -Math.PI / 2,
        -Math.PI / 2 + frac * Math.PI * 2
      );
      ctx.stroke();
      ctx.restore();
    }
  }, []);

  // The live animation loop: redraw the shrinking ring; when it expires with no
  // tap, it is a miss.
  const tick = useCallback(() => {
    const sc = sceneRef.current;
    if (sc.stage !== "live" || sc.resolved) return;
    render();
    if (performance.now() - sc.startTs >= sc.closeMs) {
      // countdown expired with no tap -> a miss
      resolveTap(-1);
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [render]);

  // Set up one rep: size the canvas, build the formation, wait in "ready" until
  // the player taps Read it. Nothing closes until then.
  const startRep = useCallback((repIndex) => {
    const canvas = canvasRef.current;
    const host = rootRef.current;
    if (!canvas || !host) return;
    clearTimers();
    const { ctx, W, H } = setupCanvas(canvas, host);
    const form = makeFormation(engineRef.current.level, W, H);
    sceneRef.current = {
      ctx,
      W,
      H,
      you: form.you,
      receivers: form.receivers,
      defenders: form.defenders,
      openIndex: form.openIndex,
      margin: form.margin,
      closeMs: form.closeMs,
      r: form.r,
      stage: "ready",
      startTs: null,
      tappedIndex: null,
      result: null,
      resolved: false,
      repIndex,
    };
    setStage("ready");
    render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [render]);

  // Player tapped Read it: reveal the formation and start the countdown.
  function readIt() {
    const sc = sceneRef.current;
    if (!sc.ctx || sc.resolved || sc.stage !== "ready") return;
    sc.stage = "live";
    sc.startTs = performance.now();
    setStage("live");
    rafRef.current = requestAnimationFrame(tick);
  }

  const resolveRep = useCallback((success) => {
    pointsRef.current += sceneRef.current.repPoints || 0;
    setPoints(pointsRef.current);
    const lvl = engineRef.current.record(success);
    setLevel(lvl);
    if (success) setHits((h) => h + 1);
  }, []);

  // The reveal holds until the player taps Next rep. It used to clear itself
  // after a fixed 2 s, which is not long enough to actually study a blocked
  // lane, and it meant the rail was empty exactly when the player wanted a
  // control (Action Rail rule 1).
  function advanceRep() {
    const next = sceneRef.current.repIndex + 1;
    if (next >= REPS) {
      setPhase("done");
    } else {
      setRep(next);
      startRep(next);
    }
  }

  // Resolve a rep from a tapped receiver index (or -1 for timeout / off-target).
  const resolveTap = useCallback(
    (tappedIndex) => {
      const sc = sceneRef.current;
      if (sc.resolved) return;
      const elapsed = sc.startTs != null ? performance.now() - sc.startTs : sc.closeMs + 1;
      const result = scoreLane(tappedIndex, sc.openIndex, elapsed, sc.closeMs);
      sc.resolved = true;
      sc.stage = "reveal";
      sc.tappedIndex = tappedIndex;
      sc.result = result;
      sc.repPoints = result.points;
      clearTimers();
      setStage("reveal");
      setLast({
        success: result.success,
        repPoints: result.points,
        expired: tappedIndex >= 0 ? elapsed > sc.closeMs : tappedIndex === -1,
      });
      render();
      resolveRep(result.success);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [render, resolveRep]
  );

  // Which receiver (if any) did the tap land on? Returns its index or -1.
  function hitReceiver(tap) {
    const sc = sceneRef.current;
    let best = -1;
    let bestD = Infinity;
    sc.receivers.forEach((rc, i) => {
      const d = Math.hypot(rc.x - tap.x, rc.y - tap.y);
      if (d <= sc.r * 1.4 && d < bestD) {
        best = i;
        bestD = d;
      }
    });
    return best;
  }

  function handleTap(evt) {
    const sc = sceneRef.current;
    if (phase !== "playing" || !sc.you || sc.resolved) return;
    if (sc.stage !== "live") return; // taps only count once the lane is live
    evt.preventDefault();
    const tap = pointerPos(evt, canvasRef.current);
    const idx = hitReceiver(tap);
    if (idx < 0) return; // tapped empty ice; ignore, keep the countdown running
    resolveTap(idx);
  }

  // The level the player came in at, so the results card can show the move
  // rather than just the destination (S2-27).
  const startLevelRef = useRef(1);

  function start() {
    const d = getDrill(playerId, "findlane");
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
    pointsRef.current = 0;
    setPoints(0);
    setPhase("playing");
    requestAnimationFrame(() => startRep(0));
  }

  useEffect(() => {
    if (phase === "done" && !saved) {
      const score = Math.round((hits / REPS) * 100);
      const record = saveSession(playerId, "findlane", {
        score,
        points: pointsRef.current,
        level: engineRef.current.level,
        streak: { ups: engineRef.current.ups, downs: engineRef.current.downs },
      });
      setSaved(record);
      cue("fanfare");
    }
  }, [phase, saved, hits, playerId]);

  // Re-fit and redraw on resize without skipping to the next rep. Rescale stored
  // positions so the formation/result stays put. The live countdown keeps its
  // own clock (startTs), so resizing never restarts it.
  useEffect(() => {
    if (phase !== "playing") return;
    const onResize = () => {
      const canvas = canvasRef.current;
      const host = rootRef.current;
      const sc = sceneRef.current;
      if (!canvas || !host || !sc.you) return;
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
      sc.margin = sc.margin * k;
      sc.you = { x: sc.you.x * kx, y: sc.you.y * ky };
      sc.receivers = sc.receivers.map((m) => ({ x: m.x * kx, y: m.y * ky }));
      sc.defenders = sc.defenders.map((m) => ({ x: m.x * kx, y: m.y * ky }));
      render();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [phase, render]);

  useEffect(() => () => clearTimers(), []);

  // Action Rail rule 7: Space fires the one primary rail action, everywhere in
  // the gym. Nothing here is reachable only by pointer.
  useEffect(() => {
    if (phase !== "playing") return undefined;
    const onKey = (e) => {
      if (e.code !== "Space" && e.key !== " ") return;
      if (stage === "ready") {
        e.preventDefault();
        readIt();
      } else if (stage === "reveal") {
        e.preventDefault();
        advanceRep();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, stage]);

  const hint = {
    ready: "Tap Read it, then find the teammate with a clean lane before it closes.",
    live: "One teammate has an open lane. Tap them before the ring runs out.",
    reveal: last
      ? last.success
        ? `Good seam, you threaded it. +${last.repPoints}`
        : last.expired && (sceneRef.current.tappedIndex === -1)
        ? "Too slow, the lane closed. The green line shows the open seam."
        : "Not that one, that lane was blocked. The green line shows the open seam."
      : "",
  }[stage];

  const bestLabel = phase === "done" && saved ? sessionRankLabel(saved.sessions, Math.round(points)) : null;

  return (
    <div className="gym-drill" ref={rootRef}>
      {phase !== "intro" && <h2 className="gym-drill-title">Find the Lane</h2>}
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
          <h2>Find the Lane</h2>
          <svg viewBox="0 0 280 130" width="100%" style={{ maxWidth: 280, display: "block", margin: "0 auto 14px", borderRadius: 10 }} aria-hidden="true">
            <rect width="280" height="130" rx="8" fill="#eaf4fb" />
            {/* the open lane: a clear green line from YOU to the open teammate */}
            <line x1="140" y1="108" x2="225" y2="30" stroke="#1f9d55" strokeWidth="3.5" />
            {/* a blocked lane: faded with an X */}
            <line x1="140" y1="108" x2="60" y2="34" stroke="#8a98a3" strokeWidth="1.5" strokeDasharray="4 5" opacity="0.5" />
            <path d="M94 64 l10 10 M104 64 l-10 10" stroke="#3d5061" strokeWidth="2.5" strokeLinecap="round" />
            {/* YOU, the puck carrier */}
            <circle cx="140" cy="108" r="13" fill="#f2b705" stroke="#0b1b2b" strokeWidth="3" />
            <circle cx="151" cy="116" r="4" fill="#0b1b2b" />
            {/* a defender clogging a lane */}
            <circle cx="99" cy="69" r="11" fill="#cdd9e1" stroke="#5b7587" strokeWidth="2" />
            {/* the open teammate (green ring) */}
            <circle cx="225" cy="30" r="11" fill="#1b6cb0" stroke="#cfe6f6" strokeWidth="2.5" />
            <circle cx="225" cy="30" r="16" fill="none" stroke="#1f9d55" strokeWidth="3" />
            {/* a covered teammate */}
            <circle cx="60" cy="34" r="11" fill="#1b6cb0" stroke="#cfe6f6" strokeWidth="2.5" />
          </svg>
          <p className="gym-goal"><strong>Your goal:</strong> tap the teammate with a clear passing lane before time runs out.</p>
          <p>
            <strong>The game:</strong> tap Read it. Find YOU with the puck and
            look for a path to a teammate without a defender in the way.
            Defenders have an X. Each round has one clear lane. Tap that teammate
            before the countdown ring empties, then check the revealed pass.
            Faster correct taps earn more points.
          </p>
          <div className="gym-trains">
            <strong>Talk hockey</strong>
            <span>
              Point out the defender beside a blocked lane. What would have to
              change for that pass to become an option?
            </span>
          </div>
          <button className="gym-btn" onClick={start}>
            Start
          </button>
        </div>
      )}

      {/* Action Rail rule 6: the hint sits ABOVE the play surface so the rail is
          the last thing on screen and no control is ever below the fold. */}
      {phase === "playing" && (
        <p className="gym-hint" aria-live="polite">
          {hint}
        </p>
      )}

      <div className="gym-stage" style={{ display: phase === "playing" ? "block" : "none" }}>
        <canvas
          ref={canvasRef}
          className="gym-canvas"
          onMouseDown={handleTap}
          onTouchStart={handleTap}
        />

        {/* Rule 1: exactly one primary action, in the same place every stage. */}
        {phase === "playing" && stage === "ready" && (
          <div className="gym-rail">
            <button className="gym-btn" onClick={readIt}>
              Read it
              <kbd className="gym-key">space</kbd>
            </button>
          </div>
        )}
        {phase === "playing" && stage === "reveal" && (
          <div className="gym-rail">
            <button className="gym-btn" onClick={advanceRep}>
              {rep + 1 >= REPS ? "See the result" : "Next rep"}
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
            {points} points. {hits} of {REPS} lanes found.
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
