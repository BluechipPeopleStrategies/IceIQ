import { HockeyPlayerArt } from "../visuals/HockeyPlayerArt.jsx";
import { useRef, useState, useCallback, useEffect } from "react";
import { drawHockeyPlayer, drawHockeyPuck, drawHockeyLabel } from "../visuals/hockeyArtCanvas.js";
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
import { makeTrial, scoreTrial } from "./lateReadCore";
import GymVisualStage from "./GymVisualStage";
import RemainingDrillsScene3D from "./RemainingDrillsScene3D";

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

const REPS = REPS_PER_SESSION;

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

  // YOU keeps the gold task cue, dark ring and exact adjacent puck position.
  function drawYou(ctx, p, r) {
    drawHockeyPlayer(ctx, { ...p, r, jersey: "#f2b705" });
    ctx.strokeStyle = "#0B1A33"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.stroke();
    drawHockeyPuck(ctx, p.x + r * .9, p.y + r * .7, Math.max(4, r * .32));
    drawHockeyLabel(ctx, "YOU", p.x, p.y, r, { ink: "#0B1A33", plate: "#f2b705" });
  }

  // A navy teammate keeps the light ring at the original target radius.
  function drawTeammate(ctx, p, r) {
    drawHockeyPlayer(ctx, { ...p, r, team: "home" });
    ctx.strokeStyle = "#F5EFE6"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.stroke();
  }

  // A gold defender keeps the X mark, so the role is not conveyed by colour alone.
  function drawDefender(ctx, p, r) {
    drawHockeyPlayer(ctx, { ...p, r, team: "away" });
    ctx.strokeStyle = "#5B6675"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = "#0B1A33"; ctx.lineWidth = 2.5; ctx.lineCap = "round";
    const s = r * .6;
    ctx.beginPath(); ctx.moveTo(p.x - s, p.y - s); ctx.lineTo(p.x + s, p.y + s);
    ctx.moveTo(p.x + s, p.y - s); ctx.lineTo(p.x - s, p.y + s); ctx.stroke();
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
    drawRink(ctx, W, H, { orientation: "portrait" });

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

  const resolveRep = useCallback((success) => {
    pointsRef.current += sceneRef.current.repPoints || 0;
    setPoints(pointsRef.current);
    const lvl = engineRef.current.record(success);
    setLevel(lvl);
    if (success) setHits((h) => h + 1);
  }, []);

  // The reveal holds until the player taps Next rep. A late read is the hardest
  // thing in the gym to see after the fact, and the old fixed 2 s hold cleared
  // the green line before it could be studied — it also left the rail empty on
  // the one stage where a control is wanted (Action Rail rule 1).
  function advanceRep() {
    const next = sceneRef.current.repIndex + 1;
    if (next >= REPS) {
      setPhase("done");
    } else {
      setRep(next);
      startRep(next);
    }
  }

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

  function handleTapAt(tap) {
    const sc = sceneRef.current;
    if (phase !== "playing" || !sc.tr || sc.resolved || sc.stage !== "live") return;
    const idx = hitTeammate(tap);
    if (idx >= 0) resolveTap(idx);
  }

  // The level the player came in at, so the results card can show the move
  // rather than just the destination (S2-27).
  const startLevelRef = useRef(1);

  function start() {
    const d = getDrill(playerId, "lateread");
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
      const record = saveSession(playerId, "lateread", {
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

  const bestLabel = phase === "done" && saved ? sessionRankLabel(saved.sessions, Math.round(points)) : null;

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
            <g transform="translate(99,70)"><circle r="11" fill="#F5EFE6" stroke="#5b7587" strokeWidth="2" /><HockeyPlayerArt radius={10.34} team="away" /></g>
            <path d="M94 65 l10 10 M104 65 l-10 10" stroke="#3d5061" strokeWidth="2.5" strokeLinecap="round" />
            {/* the new read: a solid gold arrow to teammate B */}
            <line x1="140" y1="108" x2="222" y2="34" stroke="#f2b705" strokeWidth="3.5" />
            <path d="M222 34 l-10 1 M222 34 l-2 10" stroke="#f2b705" strokeWidth="3.5" strokeLinecap="round" fill="none" />
            {/* YOU, the puck carrier */}
            <g transform="translate(140,108)"><circle r="13" fill="#F5EFE6" stroke="#0b1b2b" strokeWidth="3" /><HockeyPlayerArt radius={12.22} team="away" /></g>
            <circle cx="151" cy="116" r="4" fill="#0b1b2b" />
            {/* teammate A, the first read (now covered) */}
            <g transform="translate(60,32)"><circle r="11" fill="#F5EFE6" stroke="#cfe6f6" strokeWidth="2.5" /><HockeyPlayerArt radius={10.34} team="home" /></g>
            {/* teammate B, the new open read (gold ring) */}
            <g transform="translate(224,30)"><circle r="11" fill="#F5EFE6" stroke="#cfe6f6" strokeWidth="2.5" /><HockeyPlayerArt radius={10.34} team="home" /></g>
            <circle cx="224" cy="30" r="16" fill="none" stroke="#f2b705" strokeWidth="3" />
          </svg>
          <p className="gym-goal"><strong>Your goal:</strong> tap the cued teammate and watch for a late change.</p>
          <p>
            <strong>The game:</strong> tap Read it. A gold arrow and ring mark a
            teammate. Sometimes a defender steps into that lane and the cue moves
            to someone else. Tap the teammate the arrow points to now, before the
            countdown ring empties. Then check the revealed pass. Faster correct
            taps earn more points.
          </p>
          <div className="gym-trains">
            <strong>Talk hockey</strong>
            <span>
              What changed before your tap? Describe how the defender's position
              affected the pass you were considering.
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

      <div style={{ display: phase === "playing" ? "block" : "none" }}>
        <GymVisualStage
          active={phase === "playing"}
          canvasRef={canvasRef}
          onCanvasPointer={handleTap}
          inputLayer="webgl"
          ariaLabel="Three-dimensional rink where a late defensive change moves the best passing read."
          camera={{ position: [0, 86, 0], fov: 40, near: 0.1, far: 180 }}
          scene3d={<RemainingDrillsScene3D mode="lateread" sceneRef={sceneRef} onTap={handleTapAt} />}
        >

        {/* Rule 1: exactly one primary action, in the same place every stage.
            "Read it" was the control S2-23 asked to move into the middle of the
            page; the rail is where it lives now. */}
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
        </GymVisualStage>
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
            {points} points. {hits} of {REPS} reads right.
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
