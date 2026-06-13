import { useRef, useState, useCallback, useEffect } from "react";
import {
  createAdaptiveLevel,
  setupCanvas,
  drawRink,
  pointerPos,
} from "./gymEngine";
import { getDrill, saveSession } from "./gymStorage";
import { makeTrial, scoreTrial } from "./lateReadCore";

// "Late Read" — cognitive flexibility / inhibition.
// You carry the puck (YOU, lower middle). A teammate is cued as the play (a gold
// arrow + ring from YOU to teammate A). On SOME reps a defender steps up late and
// the cue jumps to a DIFFERENT open teammate (B): you must read the change and
// hit the NEW open teammate, not the one you first locked onto. On the other reps
// nothing changes and the first read stays correct. Tap the teammate that is
// correct RIGHT NOW before the clock runs out. On reveal we draw the final clear
// lane and mark the pick right or wrong, then hold so the player can learn it.
// Higher levels make more reps change, fire the change LATER (less reaction
// time), shorten the clock, and add bodies. Trains not committing too early and
// switching when the ice changes.

const REPS = 9;
const REVEAL_HOLD_MS = 2000; // freeze the marked-up result so the player can study the read

export default function LateReadDrill({ playerId = "default", onExit }) {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const sceneRef = useRef({});
  const timersRef = useRef([]);
  const rafRef = useRef(0);

  const [phase, setPhase] = useState("intro"); // intro | playing | done
  const [rep, setRep] = useState(0);
  const [hits, setHits] = useState(0);
  const [level, setLevel] = useState(() => getDrill(playerId, "lateread").level);
  const [points, setPoints] = useState(0);
  const pointsRef = useRef(0);
  const [stage, setStage] = useState("ready"); // ready | live | reveal
  const [last, setLast] = useState(null); // { success, repPoints, expired, changed }
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

  // The puck carrier (YOU): a gold dot with a dark ring and a small puck beside
  // it so the carrier is distinct by shape, not color alone.
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
    ctx.fillStyle = "#0b1b2b";
    ctx.beginPath();
    ctx.arc(p.x + r * 0.9, p.y + r * 0.7, Math.max(4, r * 0.32), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0b1b2b";
    ctx.font = `700 ${Math.round(r * 0.8)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("YOU", p.x, p.y);
    ctx.textBaseline = "alphabetic";
  }

  // A teammate: a filled blue dot with a light ring.
  function drawTeammate(ctx, p, r) {
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

  // Draw the gold cue arrow + ring from YOU to the currently-correct teammate.
  function drawCue(ctx, from, to, r, color = "#f2b705") {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    // start/end pulled to the marker edges so the arrow does not bury the dots
    const sx = from.x + ux * (r + 2);
    const sy = from.y + uy * (r + 2);
    const ex = to.x - ux * (r + 6);
    const ey = to.y - uy * (r + 6);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    // arrowhead
    const ah = r * 0.8;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - ux * ah - uy * ah * 0.6, ey - uy * ah + ux * ah * 0.6);
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - ux * ah + uy * ah * 0.6, ey - uy * ah - ux * ah * 0.6);
    ctx.stroke();
    // a ring on the cued teammate
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(to.x, to.y, r + 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Whether the late change has fired yet (live stage, change rep, past changeAt).
  function changeFired(sc) {
    return (
      sc.tr.changes &&
      sc.startTs != null &&
      performance.now() - sc.startTs >= sc.tr.changeAtMs
    );
  }

  // Render the scene. During "live" the cue points at the currently-correct
  // teammate (first, then the new one once the change fires) and a defender slides
  // onto the old lane. A shrinking countdown ring sits around YOU. On "reveal" we
  // draw the final clear lane and mark the player's pick.
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
    ctx.fillText("Late Read", W / 2, H * 0.16);
    ctx.restore();

    if (!sc.tr) return;
    const tr = sc.tr;
    const fired = sc.stage === "reveal" ? tr.changes : changeFired(sc);
    // which teammate the cue currently points at
    const cueIndex = sc.stage === "reveal" ? tr.finalIndex : fired ? tr.finalIndex : tr.firstIndex;

    // reveal: draw the final clear lane UNDER the markers so it does not hide them.
    if (sc.result) {
      const finalMate = tr.teammates[tr.finalIndex];
      ctx.save();
      ctx.strokeStyle = "#1f9d55";
      ctx.lineWidth = 3.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(tr.you.x, tr.you.y);
      ctx.lineTo(finalMate.x, finalMate.y);
      ctx.stroke();
      ctx.restore();
    }

    // the late defender that stepped up onto the OLD lane: nudge it onto the
    // YOU->first segment once the change has fired (live) or on reveal.
    let movedDefenders = tr.defenders;
    if (tr.changes && fired && tr.defenders.length > 0) {
      const firstMate = tr.teammates[tr.firstIndex];
      const stepUp = {
        x: tr.you.x + (firstMate.x - tr.you.x) * 0.6,
        y: tr.you.y + (firstMate.y - tr.you.y) * 0.6,
      };
      movedDefenders = [stepUp, ...tr.defenders.slice(1)];
    }

    // bodies: defenders, teammates, then YOU on top.
    movedDefenders.forEach((d) => drawDefender(ctx, d, sc.r));
    tr.teammates.forEach((m) => drawTeammate(ctx, m, sc.r));
    drawYou(ctx, tr.you, sc.r);

    // the cue arrow + ring (live and reveal both show where the read is now).
    if (sc.stage === "live" || sc.result) {
      const cueColor = sc.result ? "#1f9d55" : "#f2b705";
      drawCue(ctx, tr.you, tr.teammates[cueIndex], sc.r, cueColor);
    }

    // reveal: mark the player's pick right or wrong (shape, not color alone).
    if (sc.result && sc.tappedIndex != null && sc.tappedIndex >= 0) {
      const picked = tr.teammates[sc.tappedIndex];
      ctx.save();
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      if (sc.result.success) {
        // correct pick: a tick on the chosen teammate
        ctx.strokeStyle = "#1f9d55";
        ctx.beginPath();
        ctx.moveTo(picked.x - sc.r * 0.4, picked.y);
        ctx.lineTo(picked.x - sc.r * 0.1, picked.y + sc.r * 0.4);
        ctx.lineTo(picked.x + sc.r * 0.45, picked.y - sc.r * 0.4);
        ctx.stroke();
      } else {
        // wrong pick: an X on the chosen teammate
        ctx.strokeStyle = "#e8590c";
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

    // live: a shrinking countdown ring around YOU shows the read closing.
    if (sc.stage === "live" && sc.startTs != null) {
      const elapsed = Math.min(performance.now() - sc.startTs, tr.clockMs);
      const frac = 1 - elapsed / tr.clockMs; // 1 -> 0
      ctx.save();
      ctx.strokeStyle = "rgba(11,27,43,0.18)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(tr.you.x, tr.you.y, sc.r + 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = frac > 0.33 ? "#1b6cb0" : "#e8590c";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(
        tr.you.x,
        tr.you.y,
        sc.r + 12,
        -Math.PI / 2,
        -Math.PI / 2 + frac * Math.PI * 2
      );
      ctx.stroke();
      ctx.restore();
    }
  }, []);

  // The live animation loop: redraw (so the late change and the shrinking ring
  // animate); when the clock expires with no tap, it is a miss.
  const tick = useCallback(() => {
    const sc = sceneRef.current;
    if (sc.stage !== "live" || sc.resolved) return;
    render();
    if (performance.now() - sc.startTs >= sc.tr.clockMs) {
      resolveTap(-1); // clock expired, no tap
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [render]);

  // Set up one rep: size the canvas, build the trial, wait in "ready" until the
  // player taps Read it. Nothing moves until then.
  const startRep = useCallback((repIndex) => {
    const canvas = canvasRef.current;
    const host = rootRef.current;
    if (!canvas || !host) return;
    clearTimers();
    const { ctx, W, H } = setupCanvas(canvas, host);
    const tr = makeTrial(engineRef.current.level, W, H);
    sceneRef.current = {
      ctx,
      W,
      H,
      tr,
      r: Math.max(11, Math.round(W * 0.026)),
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

  // Player tapped Read it: show the play + first cue and start the clock.
  function readIt() {
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

  // Resolve a rep from a tapped teammate index (or -1 for timeout / off-target).
  const resolveTap = useCallback(
    (tappedIndex) => {
      const sc = sceneRef.current;
      if (sc.resolved || sc.stage !== "live") return;
      const tr = sc.tr;
      const tapMs = sc.startTs != null ? performance.now() - sc.startTs : tr.clockMs + 1;
      // the read settles at the change (on change reps) or immediately (no-change)
      const settleMs = tr.changes ? tr.changeAtMs : 0;
      const result = scoreTrial(tappedIndex, tr.finalIndex, tapMs, settleMs, tr.clockMs);
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
        expired: tappedIndex === -1,
        changed: tr.changes,
        pickedFirst: tappedIndex === tr.firstIndex && tr.changes,
      });
      render();
      resolveRep(result.success);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [render, resolveRep]
  );

  // Which teammate (if any) did the tap land on? Returns its index or -1.
  function hitTeammate(tap) {
    const sc = sceneRef.current;
    let best = -1;
    let bestD = Infinity;
    sc.tr.teammates.forEach((m, i) => {
      const d = Math.hypot(m.x - tap.x, m.y - tap.y);
      if (d <= sc.r * 1.5 && d < bestD) {
        best = i;
        bestD = d;
      }
    });
    return best;
  }

  function handleTap(evt) {
    const sc = sceneRef.current;
    if (phase !== "playing" || !sc.tr || sc.resolved) return;
    if (sc.stage !== "live") return; // taps only count once the read is live
    evt.preventDefault();
    const tap = pointerPos(evt, canvasRef.current);
    const idx = hitTeammate(tap);
    if (idx < 0) return; // tapped empty ice; ignore, keep the clock running
    resolveTap(idx);
  }

  function start() {
    const d = getDrill(playerId, "lateread");
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
      const record = saveSession(playerId, "lateread", {
        score,
        points: pointsRef.current,
        level: engineRef.current.level,
        streak: { ups: engineRef.current.ups, downs: engineRef.current.downs },
      });
      setSaved(record);
    }
  }, [phase, saved, hits, playerId]);

  // Re-fit and redraw on resize without skipping to the next rep. Rescale stored
  // positions so the play / result stays put. The live clock keeps its own clock
  // (startTs), so resizing never restarts it.
  useEffect(() => {
    if (phase !== "playing") return;
    const onResize = () => {
      const canvas = canvasRef.current;
      const host = rootRef.current;
      const sc = sceneRef.current;
      if (!canvas || !host || !sc.tr) return;
      const prevW = sc.W || 1;
      const prevH = sc.H || 1;
      const { ctx, W, H } = setupCanvas(canvas, host);
      const kx = W / prevW;
      const ky = H / prevH;
      sc.ctx = ctx;
      sc.W = W;
      sc.H = H;
      sc.r = Math.max(11, Math.round(W * 0.026));
      const scaleP = (p) => ({ ...p, x: p.x * kx, y: p.y * ky });
      const tr = sc.tr;
      sc.tr = {
        ...tr,
        you: scaleP(tr.you),
        teammates: tr.teammates.map(scaleP),
        defenders: tr.defenders.map(scaleP),
      };
      render();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [phase, render]);

  useEffect(() => () => clearTimers(), []);

  const hint = {
    ready: "Tap Read it, then hit the teammate the gold arrow points to. Watch for a late change.",
    live: "Pass to the teammate the gold arrow points to. If a defender steps up and the cue jumps, hit the new open teammate instead.",
    reveal: last
      ? last.success
        ? last.changed
          ? `Nice read, you switched to the new open teammate. +${last.repPoints}`
          : `Good, the first read held and you hit it. +${last.repPoints}`
        : last.expired
        ? "Too slow, the read closed. The green line shows the open teammate."
        : last.pickedFirst
        ? "A defender stepped up and the play changed. You hit your first read, not the new open one. The green line shows who was open."
        : "Not that teammate. The green line shows who was open."
      : "",
  }[stage];

  return (
    <div className="gym-drill" ref={rootRef}>
      {phase !== "intro" && <h2 className="gym-drill-title">Late Read</h2>}
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
          <h2>Late Read</h2>
          <svg viewBox="0 0 280 130" width="100%" style={{ maxWidth: 280, display: "block", margin: "0 auto 14px", borderRadius: 10 }} aria-hidden="true">
            <rect width="280" height="130" rx="8" fill="#eaf4fb" />
            {/* the first read: a faded, redirected gold arrow to teammate A (now covered) */}
            <line x1="140" y1="108" x2="66" y2="36" stroke="#f2b705" strokeWidth="3" strokeDasharray="5 5" opacity="0.4" />
            {/* a defender stepping up onto the first lane */}
            <circle cx="99" cy="70" r="11" fill="#cdd9e1" stroke="#5b7587" strokeWidth="2" />
            <path d="M94 65 l10 10 M104 65 l-10 10" stroke="#3d5061" strokeWidth="2.5" strokeLinecap="round" />
            {/* the new read: a solid gold arrow to teammate B */}
            <line x1="140" y1="108" x2="222" y2="34" stroke="#f2b705" strokeWidth="3.5" />
            <path d="M222 34 l-10 1 M222 34 l-2 10" stroke="#f2b705" strokeWidth="3.5" strokeLinecap="round" fill="none" />
            {/* YOU, the puck carrier */}
            <circle cx="140" cy="108" r="13" fill="#f2b705" stroke="#0b1b2b" strokeWidth="3" />
            <circle cx="151" cy="116" r="4" fill="#0b1b2b" />
            {/* teammate A, the first read (now covered) */}
            <circle cx="60" cy="32" r="11" fill="#1b6cb0" stroke="#cfe6f6" strokeWidth="2.5" />
            {/* teammate B, the new open read (gold ring) */}
            <circle cx="224" cy="30" r="11" fill="#1b6cb0" stroke="#cfe6f6" strokeWidth="2.5" />
            <circle cx="224" cy="30" r="16" fill="none" stroke="#f2b705" strokeWidth="3" />
          </svg>
          <p className="gym-goal"><strong>Your goal:</strong> hit the teammate the play is going to right now, and switch if a defender steps up and the read changes late.</p>
          <p>
            <strong>The game:</strong> you have the puck (the gold YOU marker) and
            a teammate is cued as the play, a gold arrow and ring from you to them.
            Tap Read it, the play appears and a countdown ring starts shrinking
            around you. On some reps nothing changes and your first read is right,
            so hit that teammate. On other reps a defender steps up late and the
            cue jumps to a different open teammate. When that happens you have to
            read the change and hit the NEW open teammate, not the one you first
            locked onto. Tap the teammate the gold arrow points to right now,
            before the ring runs out. The quicker you settle on the right read, the
            more points you earn. As you level up more reps change, the change
            fires later so you get less time to react, the clock gets shorter, and
            there are more bodies on the ice. You start each rep when you are ready.
          </p>
          <div className="gym-trains">
            <strong>Why it matters</strong>
            <span>
              The play you saw a second ago is not always the play that is there
              now. A defender steps up, a lane closes, and the right pass becomes
              the wrong one. Good players do not force their first idea once the ice
              changes. They keep their head up, read the defender stepping into the
              lane, and switch to the teammate who is open now. Training that, not
              committing too early and adjusting when the picture changes, is how
              you stop throwing pucks into trouble and start making the play the ice
              is actually giving you.
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
          <button className="gym-btn" onClick={readIt}>
            Read it
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
            {points} points. {hits} of {REPS} reads right. Level {level}.
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
