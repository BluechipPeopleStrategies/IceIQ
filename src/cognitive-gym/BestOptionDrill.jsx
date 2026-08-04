import { useRef, useState, useCallback, useEffect } from "react";
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

  // A teammate: a filled blue dot with a light ring. Open teammates get a small
  // gold notch label so "open" reads by shape, not color alone.
  function drawTeammate(ctx, p, r, open) {
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

  // The net + goalie at the left end. Net is a small goal frame; goalie is a
  // dark pad-shape so it reads distinct from the round skaters.
  function drawNet(ctx, net, r) {
    const w = r * 1.5;
    const h = r * 2.2;
    ctx.save();
    ctx.strokeStyle = "#c8102e";
    ctx.lineWidth = 3;
    ctx.strokeRect(net.x - w * 0.4, net.y - h / 2, w, h);
    ctx.restore();
  }
  function drawGoalie(ctx, g, r) {
    ctx.save();
    ctx.fillStyle = "#2b3a47";
    ctx.beginPath();
    ctx.arc(g.x, g.y, r * 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#f4f9fc";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(g.x, g.y, r * 0.85, 0, Math.PI * 2);
    ctx.stroke();
    // a "G" so the goalie reads by label too
    ctx.fillStyle = "#f4f9fc";
    ctx.font = `700 ${Math.round(r * 0.7)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("G", g.x, g.y);
    ctx.textBaseline = "alphabetic";
    ctx.restore();
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
            <circle cx="36" cy="65" r="9" fill="#2b3a47" stroke="#f4f9fc" strokeWidth="2" />
            {/* YOU, the puck carrier, on the right */}
            <circle cx="190" cy="92" r="13" fill="#f2b705" stroke="#0b1b2b" strokeWidth="3" />
            <circle cx="201" cy="100" r="4" fill="#0b1b2b" />
            {/* the shot option: a line to the net */}
            <line x1="190" y1="92" x2="40" y2="68" stroke="#1f9d55" strokeWidth="2.5" />
            {/* the pass option: a line to an open teammate (back door) */}
            <line x1="190" y1="92" x2="70" y2="30" stroke="#1b6cb0" strokeWidth="2.5" strokeDasharray="5 4" />
            <circle cx="70" cy="30" r="10" fill="#1b6cb0" stroke="#cfe6f6" strokeWidth="2.5" />
            {/* the carry option: an arrow into open ice */}
            <line x1="190" y1="92" x2="150" y2="55" stroke="#0b1b2b" strokeWidth="2.5" />
            <path d="M150 55 l9 3 M150 55 l1 9" stroke="#0b1b2b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            {/* a defender pressuring */}
            <circle cx="135" cy="80" r="10" fill="#cdd9e1" stroke="#5b7587" strokeWidth="2" />
            <path d="M130 75 l10 10 M140 75 l-10 10" stroke="#3d5061" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <p className="gym-goal"><strong>Your goal:</strong> read the frozen play and pick the best option, shoot, pass, or carry, before the clock runs out.</p>
          <p>
            <strong>The game:</strong> you have the puck (the gold YOU marker) and
            the net is at the far end. Tap Read it, the play freezes and a
            countdown ring starts shrinking around you, and three buttons turn on:
            SHOOT, PASS, and CARRY. Exactly one is the best read. Maybe you have a
            clear lane and a leaning goalie (shoot), maybe a teammate is wide open
            back door while a defender blocks you (pass), or maybe there is no shot
            and no open teammate but open ice ahead (carry). Tap the best call
            before the ring runs out. The faster you read it right, the more points
            you earn. As you level up the clock gets shorter, more bodies fill the
            ice, and the second-best option gets more tempting. You start each rep
            when you are ready.
          </p>
          <div className="gym-trains">
            <strong>Why it matters</strong>
            <span>
              When you get the puck in the offensive zone you have a heartbeat to
              decide: shoot it, move it, or take it. Good players make that read
              fast and make it right, so they get the shot off before the lane
              closes, find the open teammate before the defender slides over, or
              keep their feet moving when nothing is there yet. Training that
              shoot, pass, or carry decision is how you stop freezing with the puck
              and start making the play the ice is giving you.
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
        <canvas ref={canvasRef} className="gym-canvas" />

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
