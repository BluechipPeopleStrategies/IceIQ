import { HockeyPlayerArt } from "../visuals/HockeyPlayerArt.jsx";
import { useRef, useState, useCallback, useEffect } from "react";
import { drawHockeyPlayer, drawHockeyLabel } from "../visuals/hockeyArtCanvas.js";
import {
  createAdaptiveLevel,
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
import { makeFormation, scoreRead } from "./readNumbersCore";

// "Read the Numbers" — visual memory + selective recall.
// A formation of skaters, each wearing a distinct jersey NUMBER, flashes on
// the ice together. The numbers hide, one is called out ("Which one was
// #83?"), and the player taps where that skater was standing. Higher levels
// add skaters, shorten the look, and grow the numbers from one digit to two
// to three. You start each rep when you are ready.

const REPS = REPS_PER_SESSION;
const ANSWER_WINDOW_MS = 3200; // speed window: answer within this for full credit

export default function ReadNumbersDrill({ playerId = "default", onExit }) {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const sceneRef = useRef({});
  const timersRef = useRef([]);
  const rafRef = useRef(0);

  const [phase, setPhase] = useState("intro"); // intro | playing | done
  const [rep, setRep] = useState(0);
  const [hits, setHits] = useState(0);
  const [level, setLevel] = useState(() => getDrill(playerId, "readnumbers").level);
  const [points, setPoints] = useState(0);
  const pointsRef = useRef(0);
  const [stage, setStage] = useState("ready"); // ready | watch | pick | feedback
  const [target, setTarget] = useState(null); // the number the player must find
  const [last, setLast] = useState(null); // { success, repPoints, target, pickedNumber }
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

  // Draw a numbered skater: a jersey-coloured rounded marker. During "watch"
  // the number shows; during "pick" it goes blank so the player must recall
  // it from position alone. On "feedback" every number is shown again, with
  // the target ringed and the player's pick marked right/wrong by shape.
  function drawSkater(ctx, s, r, { showNumber, mark }) {
    ctx.save();
    drawHockeyPlayer(ctx, { ...s, r, team: "home" });
    ctx.strokeStyle = "#f2b705"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.stroke();
    if (showNumber) drawHockeyLabel(ctx, s.number, s.x, s.y, r, { scale: String(s.number).length >= 3 ? .8 : 1 });
    ctx.restore();

    if (mark === "target") {
      ctx.save();
      ctx.strokeStyle = "#1f9d55";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(s.x, s.y, r + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else if (mark === "wrongPick") {
      ctx.save();
      ctx.strokeStyle = "#e8590c";
      ctx.lineCap = "round";
      ctx.lineWidth = 3;
      const sSize = r * 0.6;
      ctx.beginPath();
      ctx.moveTo(s.x - sSize, s.y - r - 14);
      ctx.lineTo(s.x + sSize, s.y - r - 14 + sSize * 2);
      ctx.moveTo(s.x + sSize, s.y - r - 14);
      ctx.lineTo(s.x - sSize, s.y - r - 14 + sSize * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

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
    ctx.fillText("Read the Numbers", W / 2, H * 0.12);
    ctx.restore();

    if (!sc.skaters) return;
    sc.skaters.forEach((s, i) => {
      const showNumber = sc.stage === "watch" || sc.stage === "feedback";
      let mark = null;
      if (sc.stage === "feedback") {
        if (i === sc.targetIndex) mark = "target";
        else if (i === sc.pickedIndex) mark = "wrongPick";
      }
      drawSkater(ctx, s, sc.r, { showNumber, mark });
    });
  }, []);

  // Set up one rep: size the canvas, build the formation, scatter skaters on
  // the ice. Wait in "ready" until the player taps Watch. Nothing shows until
  // then.
  const startRep = useCallback((repIndex) => {
    const canvas = canvasRef.current;
    const host = rootRef.current;
    if (!canvas || !host) return;
    clearTimers();
    const { ctx, W, H } = setupCanvas(canvas, host);
    const lvl = engineRef.current.level;
    const formation = makeFormation(lvl, {});
    const r = Math.max(13, Math.round(W * 0.045));
    const pad = r + 12;
    const minGap = r * 2.4;
    // Action Rail: nothing you have to tap may sit under the Watch / Next rep
    // button, so skaters stop short of the rail band.
    const yMax = targetMaxY(H) - pad;

    // scatter non-overlapping spots for every skater across the ice
    const spots = [];
    let guard = 0;
    while (spots.length < formation.numbers.length && guard < 4000) {
      guard += 1;
      const x = pad + Math.random() * (W - 2 * pad);
      const y = pad + Math.random() * (yMax - pad);
      if (spots.every((p) => Math.hypot(p.x - x, p.y - y) >= minGap)) spots.push({ x, y });
    }
    while (spots.length < formation.numbers.length) {
      const i = spots.length;
      spots.push({
        x: pad + ((i + 1) / (formation.numbers.length + 1)) * (W - 2 * pad),
        y: H * (i % 2 === 0 ? 0.3 : 0.6),
      });
    }

    const skaters = formation.numbers.map((number, i) => ({ ...spots[i], number }));

    sceneRef.current = {
      ctx,
      W,
      H,
      skaters,
      targetIndex: formation.targetIndex,
      watchMs: formation.watchMs,
      r,
      stage: "ready",
      pickTs: null,
      pickedIndex: null,
      resolved: false,
      repIndex,
    };
    setStage("ready");
    setTarget(null);
    render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [render]);

  // Player tapped Watch: show the numbers, then hide them and open picking.
  function beginWatch() {
    const sc = sceneRef.current;
    if (!sc.ctx || sc.resolved || sc.stage !== "ready") return;
    sc.stage = "watch";
    setStage("watch");
    render();
    schedule(() => {
      sc.stage = "pick";
      sc.pickTs = performance.now();
      setStage("pick");
      setTarget(sc.skaters[sc.targetIndex].number);
      render();
    }, sc.watchMs);
  }

  const resolveRep = useCallback((success) => {
    pointsRef.current += sceneRef.current.repPoints || 0;
    setPoints(pointsRef.current);
    const lvl = engineRef.current.record(success);
    setLevel(lvl);
    if (success) setHits((h) => h + 1);
  }, []);

  // Feedback stays on screen until the player taps Next rep — nothing
  // auto-advances, so a miss can actually be studied.
  function advanceRep() {
    const next = sceneRef.current.repIndex + 1;
    if (next >= REPS) {
      setPhase("done");
    } else {
      setRep(next);
      startRep(next);
    }
  }

  // Which skater (if any) did the tap land on? Returns its index or -1.
  function hitSkater(tap) {
    const sc = sceneRef.current;
    let best = -1;
    let bestD = Infinity;
    sc.skaters.forEach((s, i) => {
      const d = Math.hypot(s.x - tap.x, s.y - tap.y);
      if (d <= sc.r * 1.4 && d < bestD) {
        best = i;
        bestD = d;
      }
    });
    return best;
  }

  function handleTap(evt) {
    const sc = sceneRef.current;
    if (phase !== "playing" || sc.resolved || sc.stage !== "pick") return;
    evt.preventDefault();
    const tap = pointerPos(evt, canvasRef.current);
    const idx = hitSkater(tap);
    if (idx < 0) return; // tapped empty ice; ignore, keep waiting
    const answerMs = sc.pickTs != null ? performance.now() - sc.pickTs : ANSWER_WINDOW_MS;
    const result = scoreRead(idx, sc.targetIndex, answerMs, ANSWER_WINDOW_MS);
    sc.resolved = true;
    sc.stage = "feedback";
    sc.pickedIndex = idx;
    sc.repPoints = result.points;
    clearTimers();
    setStage("feedback");
    setLast({
      success: result.success,
      repPoints: result.points,
      target: sc.skaters[sc.targetIndex].number,
      pickedNumber: sc.skaters[idx].number,
    });
    render();
    resolveRep(result.success);
  }

  // The level the player came in at, so the results card can show the move
  // rather than just the destination (S2-27).
  const startLevelRef = useRef(1);

  function start() {
    const d = getDrill(playerId, "readnumbers");
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
      const record = saveSession(playerId, "readnumbers", {
        score,
        points: pointsRef.current,
        level: engineRef.current.level,
        streak: { ups: engineRef.current.ups, downs: engineRef.current.downs },
      });
      setSaved(record);
      cue("fanfare");
    }
  }, [phase, saved, hits, playerId]);

  // Re-fit and redraw on resize without skipping the rep. Rescale skater spots
  // so the formation/result stays put.
  useEffect(() => {
    if (phase !== "playing") return;
    const onResize = () => {
      const canvas = canvasRef.current;
      const host = rootRef.current;
      const sc = sceneRef.current;
      if (!canvas || !host || !sc.skaters) return;
      const prevW = sc.W || 1;
      const prevH = sc.H || 1;
      const { ctx, W, H } = setupCanvas(canvas, host);
      const kx = W / prevW;
      const ky = H / prevH;
      sc.ctx = ctx;
      sc.W = W;
      sc.H = H;
      sc.r = Math.max(13, Math.round(W * 0.045));
      sc.skaters = sc.skaters.map((s) => ({ ...s, x: s.x * kx, y: s.y * ky }));
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
        beginWatch();
      } else if (stage === "feedback") {
        e.preventDefault();
        advanceRep();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, stage]);

  const hint = {
    ready: "Tap Watch, memorize the numbers, then find the one you're asked about.",
    watch: "Memorize the numbers.",
    pick: target != null ? `Which one was #${target}? Tap it.` : "",
    feedback: last
      ? last.success
        ? `Nice memory, that was #${last.target}. +${last.repPoints}`
        : `That was #${last.target}, you tapped #${last.pickedNumber}. Keep scanning the whole ice.`
      : "",
  }[stage];

  const bestLabel = phase === "done" && saved ? sessionRankLabel(saved.sessions, Math.round(points)) : null;

  return (
    <div className="gym-drill" ref={rootRef}>
      {phase !== "intro" && <h2 className="gym-drill-title">Read the Numbers</h2>}
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
          <h2>Read the Numbers</h2>
          <svg viewBox="0 0 280 130" width="100%" style={{ maxWidth: 280, display: "block", margin: "0 auto 14px", borderRadius: 10 }} aria-hidden="true">
            <rect width="280" height="130" rx="8" fill="#eaf4fb" />
            <g transform="translate(60,40)"><circle r="22" fill="#F5EFE6" stroke="#f2b705" strokeWidth="3" /><HockeyPlayerArt radius={20.68} team="home" /></g>
            <text x="60" y="41" fill="#f4f9fc" fontSize="18" fontWeight="800" textAnchor="middle" dominantBaseline="central" fontFamily="system-ui, sans-serif">4</text>
            <g transform="translate(150,70)"><circle r="22" fill="#F5EFE6" stroke="#f2b705" strokeWidth="3" /><HockeyPlayerArt radius={20.68} team="home" /></g>
            <text x="150" y="71" fill="#f4f9fc" fontSize="18" fontWeight="800" textAnchor="middle" dominantBaseline="central" fontFamily="system-ui, sans-serif">83</text>
            <g transform="translate(220,35)"><circle r="22" fill="#F5EFE6" stroke="#f2b705" strokeWidth="3" /><HockeyPlayerArt radius={20.68} team="home" /></g>
            <text x="220" y="36" fill="#f4f9fc" fontSize="18" fontWeight="800" textAnchor="middle" dominantBaseline="central" fontFamily="system-ui, sans-serif">17</text>
            <g transform="translate(105,100)"><circle r="22" fill="#F5EFE6" stroke="#f2b705" strokeWidth="3" /><HockeyPlayerArt radius={20.68} team="home" /></g>
            <text x="105" y="101" fill="#f4f9fc" fontSize="18" fontWeight="800" textAnchor="middle" dominantBaseline="central" fontFamily="system-ui, sans-serif">9</text>
          </svg>
          <p className="gym-goal"><strong>Your goal:</strong> remember each skater's number and spot.</p>
          <p>
            <strong>The game:</strong> tap Watch to see the numbered skaters.
            Their numbers hide, and a question asks for one number. Tap the skater
            who wore it. The skaters stay in place. Faster correct taps earn more
            points. Higher levels add skaters and longer numbers, with less time
            to look.
          </p>
          <div className="gym-trains">
            <strong>Talk hockey</strong>
            <span>
              What helped you link a number to a spot? When skaters move during
              hockey, what would you need to check again?
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
            <button className="gym-btn" onClick={beginWatch}>
              Watch
              <kbd className="gym-key">space</kbd>
            </button>
          </div>
        )}
        {phase === "playing" && stage === "feedback" && (
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
              trailing " New best." was a duplicate — and its `<=` printed it on
              a TIE. */}
          <SessionSummary
            from={startLevelRef.current}
            to={level}
            engine={engineRef.current}
            points={points}
            saved={saved}
          />
          <p>
            {points} points. {hits} of {REPS} numbers found.
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
