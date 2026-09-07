import { HockeyPlayerArt } from "../visuals/HockeyPlayerArt.jsx";
import { useRef, useState, useCallback, useEffect } from "react";
import { drawHockeyPlayer, drawHockeyPuck, drawHockeyLabel } from "../visuals/hockeyArtCanvas.js";
import {
  createAdaptiveLevel,
  setupCanvas,
  drawRink,
  REPS_PER_SESSION,
} from "./gymEngine";
import { getDrill, saveSession } from "./gymStorage";
import { cue, gymCueHooks } from "./gymAudio";
import { ScoreCount, ConfettiBurst, SessionSummary } from "./gymFx";
import { sessionRankLabel } from "./gymProgressCore";
import { makeSituation, scoreChoice, OPTIONS } from "./bestOptionCore";
import GymVisualStage from "./GymVisualStage";
import BestOptionScene3D from "./BestOptionScene3D";
import useGymVisibilityPause from "./useGymVisibilityPause";

// "Best Option" — decision speed.
// A play freezes with the puck on YOUR stick. Three reads are offered as
// buttons: SHOOT, PASS, CARRY. Exactly one is the best call for the frozen
// picture, and the scene is generated so that call is visually defensible (a
// clear lane and a leaning goalie for shoot, an open back-door teammate for
// pass, open ice and far defenders for carry). Tap the best read before the
// clock (a shrinking ring around YOU) runs out. On reveal we highlight the right
// call and give a one-line reason, mark the pick right or wrong, and hold so the
// player can learn it. Higher levels shrink the clock and add bodies, and the
// second-best option gets more tempting. Trains reading shoot/pass/carry fast
// under pressure.

const REPS = REPS_PER_SESSION;

export default function BestOptionDrill({ playerId = "default", onExit }) {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const sceneRef = useRef({});
  const timersRef = useRef([]);
  const rafRef = useRef(0);

  const [phase, setPhase] = useState("intro"); // intro | playing | done
  const [rep, setRep] = useState(0);
  const [hits, setHits] = useState(0);
  const [level, setLevel] = useState(() => getDrill(playerId, "bestoption").level);
  const [points, setPoints] = useState(0);
  const pointsRef = useRef(0);
  const [stage, setStage] = useState("ready"); // ready | live | reveal
  const [last, setLast] = useState(null); // { success, repPoints, expired, best }

  const [saved, setSaved] = useState(null);

  useGymVisibilityPause(sceneRef, phase === "playing", rootRef);

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

  // A navy teammate keeps the light ring at the original target radius. Open teammates get a small
  // gold notch label so "open" reads by shape, not color alone.
  function drawTeammate(ctx, p, r, open) {
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

  // The net + goalie at the left end. Net is a small goal frame; goalie is a
  // dark pad-shape so it reads distinct from the round skaters.
  function drawNet(ctx, net, r) {
    const w = r * 1.5, h = r * 2.2;
    const left = net.x - w * .4, top = net.y - h / 2;
    ctx.save(); ctx.fillStyle = "rgba(245,239,230,.6)"; ctx.fillRect(left, top, w, h);
    ctx.strokeStyle = "#5B6675"; ctx.lineWidth = .7;
    for (let step = 1; step < 5; step++) {
      ctx.beginPath(); ctx.moveTo(left + w * step / 5, top); ctx.lineTo(left + w * step / 5, top + h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(left, top + h * step / 5); ctx.lineTo(left + w, top + h * step / 5); ctx.stroke();
    }
    ctx.strokeStyle = "#c8102e"; ctx.lineWidth = 3; ctx.strokeRect(left, top, w, h); ctx.restore();
  }
  function drawGoalie(ctx, g, r) {
    drawHockeyPlayer(ctx, { ...g, r: r * .85, team: "away", goalie: true });
    ctx.strokeStyle = "#F5EFE6"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(g.x, g.y, r * .85, 0, Math.PI * 2); ctx.stroke();
    drawHockeyLabel(ctx, "G", g.x, g.y, r, { ink: "#0B1A33", plate: "#F5EFE6", scale: .7 });
  }

  // Render the scene. During "live" we draw the frozen play plus a shrinking
  // countdown ring around YOU. On "reveal" we draw the best call (a clear line /
  // arc / arrow with a label) so the player learns the read.
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
    ctx.fillText("Best Option", W / 2, H * 0.16);
    ctx.restore();

    if (!sc.sit) return;
    const sit = sc.sit;

    // reveal: draw the best-call cue UNDER the markers so it does not hide them.
    if (sc.result) {
      ctx.save();
      ctx.strokeStyle = "#1f9d55";
      ctx.fillStyle = "#1f9d55";
      ctx.lineWidth = 3.5;
      ctx.lineCap = "round";
      if (sit.best === "shoot") {
        // a clear line YOU -> net (the shot)
        ctx.beginPath();
        ctx.moveTo(sit.you.x, sit.you.y);
        ctx.lineTo(sit.net.x, sit.net.y);
        ctx.stroke();
      } else if (sit.best === "pass") {
        // a line YOU -> open teammate (the pass)
        const open = sit.teammates.find((m) => m.open) || sit.teammates[0];
        if (open) {
          ctx.beginPath();
          ctx.moveTo(sit.you.x, sit.you.y);
          ctx.lineTo(open.x, open.y);
          ctx.stroke();
          // a ring on the open teammate
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(open.x, open.y, sc.r + 6, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else {
        // carry: an arrow into the open ice ahead (toward the net side)
        const dx = sit.net.x - sit.you.x;
        const dy = sit.net.y - sit.you.y;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len;
        const uy = dy / len;
        const reach = Math.min(len * 0.55, W * 0.22);
        const tipX = sit.you.x + ux * reach;
        const tipY = sit.you.y + uy * reach;
        ctx.beginPath();
        ctx.moveTo(sit.you.x, sit.you.y);
        ctx.lineTo(tipX, tipY);
        ctx.stroke();
        // arrowhead
        const ah = sc.r * 0.7;
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(tipX - ux * ah - uy * ah * 0.6, tipY - uy * ah + ux * ah * 0.6);
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(tipX - ux * ah + uy * ah * 0.6, tipY - uy * ah - ux * ah * 0.6);
        ctx.stroke();
      }
      ctx.restore();
    }

    // bodies: net + goalie, defenders, teammates, then YOU on top.
    drawNet(ctx, sit.net, sc.r);
    drawGoalie(ctx, sit.goalie, sc.r);
    sit.defenders.forEach((d) => drawDefender(ctx, d, sc.r));
    sit.teammates.forEach((m) => drawTeammate(ctx, m, sc.r, m.open));
    drawYou(ctx, sit.you, sc.r);

    // live: a shrinking countdown ring around YOU shows the read closing.
    if (sc.stage === "live" && sc.startTs != null) {
      const elapsed = Math.min(performance.now() - sc.startTs, sit.clockMs);
      const frac = 1 - elapsed / sit.clockMs; // 1 -> 0
      ctx.save();
      ctx.strokeStyle = "rgba(11,27,43,0.18)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(sit.you.x, sit.you.y, sc.r + 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = frac > 0.33 ? "#1b6cb0" : "#e8590c";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(
        sit.you.x,
        sit.you.y,
        sc.r + 12,
        -Math.PI / 2,
        -Math.PI / 2 + frac * Math.PI * 2
      );
      ctx.stroke();
      ctx.restore();
    }
  }, []);

  // The live animation loop: redraw the shrinking ring; when it expires with no
  // pick, it is a miss.
  const tick = useCallback(() => {
    const sc = sceneRef.current;
    if (sc.stage !== "live" || sc.resolved) return;
    render();
    if (performance.now() - sc.startTs >= sc.sit.clockMs) {
      resolveChoice(null); // clock expired, no pick
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [render]);

  // Set up one rep: size the canvas, build the situation, wait in "ready" until
  // the player taps Read it. Nothing closes until then.
  const startRep = useCallback((repIndex) => {
    const canvas = canvasRef.current;
    const host = rootRef.current;
    if (!canvas || !host) return;
    clearTimers();
    const { ctx, W, H } = setupCanvas(canvas, host);
    const sit = makeSituation(engineRef.current.level, W, H);
    sceneRef.current = {
      ctx,
      W,
      H,
      sit,
      r: Math.max(11, Math.round(W * 0.026)),
      stage: "ready",
      startTs: null,
      choice: null,
      result: null,
      resolved: false,
      repIndex,
    };
    setStage("ready");
    render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [render]);

  // Player tapped Read it: reveal the frozen play and start the clock.
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
    },
    []
  );

  // Reveal stays on screen (right or wrong) until the player taps Next rep —
  // nothing auto-advances, so a miss can actually be studied.
  function advanceRep() {
    const next = sceneRef.current.repIndex + 1;
    if (next >= REPS) {
      setPhase("done");
    } else {
      setRep(next);
      startRep(next);
    }
  }

  // Resolve a rep from a chosen option (or null for clock expiry / no pick).
  const resolveChoice = useCallback(
    (choice) => {
      const sc = sceneRef.current;
      if (sc.resolved || sc.stage !== "live") return;
      const elapsed = sc.startTs != null ? performance.now() - sc.startTs : sc.sit.clockMs + 1;
      const result = scoreChoice(choice, sc.sit.best, elapsed, sc.sit.clockMs);
      sc.resolved = true;
      sc.stage = "reveal";
      sc.choice = choice;
      sc.result = result;
      sc.repPoints = result.points;
      clearTimers();
      setStage("reveal");
      setLast({
        success: result.success,
        repPoints: result.points,
        expired: choice == null,
        best: sc.sit.best,
        reason: sc.sit.reason,
        choice,
      });
      render();
      resolveRep(result.success);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [render, resolveRep]
  );

  // The level the player came in at, so the results card can show the move
  // rather than just the destination (S2-27).
  const startLevelRef = useRef(1);

  function start() {
    const d = getDrill(playerId, "bestoption");
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
      const record = saveSession(playerId, "bestoption", {
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
  // positions so the frozen play / result stays put. The live countdown keeps
  // its own clock (startTs), so resizing never restarts it.
  useEffect(() => {
    if (phase !== "playing") return;
    const onResize = () => {
      const canvas = canvasRef.current;
      const host = rootRef.current;
      const sc = sceneRef.current;
      if (!canvas || !host || !sc.sit) return;
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
      const sit = sc.sit;
      sc.sit = {
        ...sit,
        you: scaleP(sit.you),
        net: scaleP(sit.net),
        goalie: scaleP(sit.goalie),
        teammates: sit.teammates.map(scaleP),
        defenders: sit.defenders.map(scaleP),
      };
      render();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [phase, render]);

  useEffect(() => () => clearTimers(), []);

  // Action Rail rule 7: Space fires the one primary rail action, everywhere in
  // the gym; while the clock runs the primary action is the read itself, so
  // S / P / C pick it. Nothing here is reachable only by pointer.
  useEffect(() => {
    if (phase !== "playing") return undefined;
    const onKey = (e) => {
      if (e.code === "Space" || e.key === " ") {
        if (stage === "ready") {
          e.preventDefault();
          readIt();
        } else if (stage === "reveal") {
          e.preventDefault();
          advanceRep();
        }
        return;
      }
      if (stage !== "live") return;
      const k = e.key.toLowerCase();
      const opt = OPTIONS.find((o) => o[0] === k);
      if (!opt) return;
      e.preventDefault();
      resolveChoice(opt);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, stage]);

  const optionLabel = { shoot: "SHOOT", pass: "PASS", carry: "CARRY" };
  // Rule 7: every rail control has a keyboard binding, shown as a key cap. The
  // three reads take their own initial rather than 1/2/3 so the key means
  // something under time pressure.
  const optionKey = { shoot: "s", pass: "p", carry: "c" };

  const hint = {
    ready: "Tap Read it, then pick the best read (shoot, pass, or carry) before the clock runs out.",
    live: "Read the play. Tap SHOOT, PASS, or CARRY before the ring runs out.",
    reveal: last
      ? last.success
        ? `Good read. ${last.reason} +${last.repPoints}`
        : last.expired
        ? `Too slow, the read closed. Best call was ${optionLabel[last.best]}. ${last.reason}`
        : `Not the best read here. The right call was ${optionLabel[last.best]}. ${last.reason}`
      : "",
  }[stage];

  const bestLabel = phase === "done" && saved ? sessionRankLabel(saved.sessions, Math.round(points)) : null;

  return (
    <div className="gym-drill" ref={rootRef}>
      {phase !== "intro" && <h2 className="gym-drill-title">Best Option</h2>}
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
          <h2>Best Option</h2>
          <svg viewBox="0 0 280 130" width="100%" style={{ maxWidth: 280, display: "block", margin: "0 auto 14px", borderRadius: 10 }} aria-hidden="true">
            <rect width="280" height="130" rx="8" fill="#eaf4fb" />
            {/* the net at the left */}
            <rect x="14" y="50" width="14" height="30" fill="none" stroke="#c8102e" strokeWidth="3" />
            <g transform="translate(36,65)"><circle r="9" fill="#F5EFE6" stroke="#f4f9fc" strokeWidth="2" /><HockeyPlayerArt radius={8.5} team="away" goalie /></g>
            {/* YOU, the puck carrier, on the right */}
            <g transform="translate(190,92)"><circle r="13" fill="#F5EFE6" stroke="#0b1b2b" strokeWidth="3" /><HockeyPlayerArt radius={12.22} team="away" /></g>
            <circle cx="201" cy="100" r="4" fill="#0b1b2b" />
            {/* the shot option: a line to the net */}
            <line x1="190" y1="92" x2="40" y2="68" stroke="#1f9d55" strokeWidth="2.5" />
            {/* the pass option: a line to an open teammate (back door) */}
            <line x1="190" y1="92" x2="70" y2="30" stroke="#1b6cb0" strokeWidth="2.5" strokeDasharray="5 4" />
            <g transform="translate(70,30)"><circle r="10" fill="#F5EFE6" stroke="#cfe6f6" strokeWidth="2.5" /><HockeyPlayerArt radius={9.4} team="home" /></g>
            {/* the carry option: an arrow into open ice */}
            <line x1="190" y1="92" x2="150" y2="55" stroke="#0b1b2b" strokeWidth="2.5" />
            <path d="M150 55 l9 3 M150 55 l1 9" stroke="#0b1b2b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            {/* a defender pressuring */}
            <g transform="translate(135,80)"><circle r="10" fill="#F5EFE6" stroke="#5b7587" strokeWidth="2" /><HockeyPlayerArt radius={9.4} team="away" /></g>
            <path d="M130 75 l10 10 M140 75 l-10 10" stroke="#3d5061" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <p className="gym-goal"><strong>Your goal:</strong> look at the lanes, then choose shoot, pass, or carry.</p>
          <p>
            <strong>The game:</strong> tap Read it. Find YOU with the puck, then
            look at the net, teammates, defenders, and blue line. Choose SHOOT,
            PASS, or CARRY before the countdown ring empties. Each scene has one
            scored answer. After choosing, check the shown route and reason.
            Faster matching answers earn more points.
          </p>
          <div className="gym-trains">
            <strong>Talk hockey</strong>
            <span>
              Which player or lane helped you choose? Show a coach what you saw
              and discuss whether another choice could work.
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
          inputLayer="none"
          ariaLabel="Frozen offensive-zone decision scene with labelled puck carrier, teammates, defenders, goalie, and reveal route."
          camera={{ position: [0, 7.4, 6.6], fov: 42, near: 0.1, far: 40 }}
          scene3d={<BestOptionScene3D sceneRef={sceneRef} />}
        >

        {/* Rule 1: exactly one primary action, in the same place every stage.
            Rule 4: the three reads are that action while the clock runs — they
            belong IN the rail, not in a row under the canvas, because the eye
            is on the frozen play and the clock is one to three seconds. */}
        {phase === "playing" && stage === "ready" && (
          <div className="gym-rail">
            <button className="gym-btn" onClick={readIt}>
              Read it
              <kbd className="gym-key">space</kbd>
            </button>
          </div>
        )}
        {phase === "playing" && stage === "live" && (
          <div className="gym-rail">
            {OPTIONS.map((opt) => (
              <button key={opt} className="gym-btn" onClick={() => resolveChoice(opt)}>
                {optionLabel[opt]}
                <kbd className="gym-key">{optionKey[opt]}</kbd>
              </button>
            ))}
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
