import { useRef, useState, useCallback, useEffect } from "react";
import { createAdaptiveLevel, setupCanvas, pointerPos } from "./gymEngine";
import { getDrill, saveSession } from "./gymStorage";
import { cue, gymCueHooks } from "./gymAudio";
import { ScoreCount, ConfettiBurst } from "./gymFx";
import { sessionRankLabel } from "./gymProgressCore";
import { makeShot, scoreShot, isCellOpenAt, cellRects, cellAtPoint } from "./shootoutCore";

// "Pick Your Spot" — read the open net and shoot it before the goalie covers
// it, then watch the shot happen. The net is a 3x2 grid of cells; the goalie
// covers some at the start (saves) and closes more mid-read. Open cells show
// a target ring. Tap Go, then tap an open cell before the shot clock runs
// out. Once you commit, the shooter releases, the puck travels, and the
// goalie dives toward your spot: it's a goal if the puck beats the pad, a
// save if the goalie gets there first. Higher levels cover more cells, close
// more holes mid-read, and shrink the clock, so the open window gets smaller
// fast.

const REPS = 10;
const SHOOT_ANIM_MS = 480; // puck-release-to-outcome animation length

export default function ShootoutDrill({ playerId = "default", onExit }) {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const sceneRef = useRef({});
  const timersRef = useRef([]);
  const rafRef = useRef(0);
  const pointsRef = useRef(0);

  const [phase, setPhase] = useState("intro"); // intro | playing | done
  const [rep, setRep] = useState(0);
  const [hits, setHits] = useState(0);
  const [level, setLevel] = useState(() => getDrill(playerId, "shootout").level);
  const [points, setPoints] = useState(0);
  const [stage, setStage] = useState("ready"); // ready | live | shooting | reveal
  const [last, setLast] = useState(null);
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

  function computeNet(W, H) {
    const w = W * 0.74;
    const h = H * 0.46;
    return { x: (W - w) / 2, y: H * 0.14, w, h };
  }

  // Each net cell maps to the goalie body part that covers it.
  const CELL_PART = {
    gloveHi: "glove",   // top-left: round trapper
    midHi: "head",      // top-mid: head + shoulders up
    blkrHi: "blocker",  // top-right: square blocker
    gloveLo: "padL",    // bottom-left: left leg pad
    fiveHole: "stick",  // bottom-mid: stick + closed pads
    blkrLo: "padR",     // bottom-right: right leg pad
  };

  // How far the goalie has reached into a cell at the given time: 0 (open) to 1
  // (fully covered). Start-covered cells are always 1. A closing cell stays open,
  // then the limb sweeps in over the last REACH_MS before atMs and slams shut.
  const REACH_MS = 420;
  function cellReach(shot, id, elapsedMs) {
    if (shot.coveredAtStart.includes(id)) return 1;
    const sc = shot.closeSchedule.find((c) => c.cellId === id);
    if (!sc) return 0;
    const start = sc.atMs - REACH_MS;
    if (elapsedMs <= start) return 0;
    if (elapsedMs >= sc.atMs) return 1;
    return (elapsedMs - start) / REACH_MS;
  }

  // An open cell: a target ring so it reads by shape, not color alone.
  function drawOpenCell(ctx, r) {
    ctx.save();
    ctx.strokeStyle = "#1f9d55";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(r.x + r.w / 2, r.y + r.h / 2, Math.min(r.w, r.h) * 0.28, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // The goalie's core: chest + mask. Takes a `core` center so a dive toward a
  // cell can slide the whole body, not just reach a limb.
  function drawGoalieCore(ctx, cx, cy, u) {
    ctx.save();
    ctx.fillStyle = "#2b3a47";
    // chest
    ctx.beginPath();
    ctx.ellipse(cx, cy + u * 0.15, u * 0.7, u * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
    // mask
    ctx.beginPath();
    ctx.arc(cx, cy - u * 0.55, u * 0.48, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#f4f9fc";
    ctx.lineWidth = 2;
    ctx.stroke();
    // cage lines so the mask reads as a goalie head
    ctx.beginPath();
    ctx.moveTo(cx - u * 0.3, cy - u * 0.55);
    ctx.lineTo(cx + u * 0.3, cy - u * 0.55);
    ctx.moveTo(cx, cy - u * 0.9);
    ctx.lineTo(cx, cy - u * 0.2);
    ctx.stroke();
    ctx.restore();
  }

  // One save piece reaching from the core into a covered cell. `reach` (0..1)
  // animates its position (core -> cell center) and size (small -> cell-filling).
  function drawSavePiece(ctx, part, cell, core, reach, u) {
    const tx = cell.x + cell.w / 2;
    const ty = cell.y + cell.h / 2;
    const x = core.x + (tx - core.x) * reach;
    const y = core.y + (ty - core.y) * reach;
    const s = Math.min(cell.w, cell.h) * (0.16 + 0.26 * reach);
    ctx.save();
    // arm / leg connector from the core to the piece
    ctx.strokeStyle = "#2b3a47";
    ctx.lineWidth = Math.max(3, u * 0.45);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(core.x, core.y);
    ctx.lineTo(x, y);
    ctx.stroke();

    ctx.fillStyle = "#2b3a47";
    ctx.strokeStyle = "#f4f9fc";
    ctx.lineWidth = 2;
    if (part === "glove") {
      ctx.beginPath();
      ctx.arc(x, y, s, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, s * 0.5, 0, Math.PI * 2);
      ctx.stroke();
    } else if (part === "blocker") {
      ctx.beginPath();
      ctx.rect(x - s, y - s, s * 2, s * 2);
      ctx.fill();
      ctx.stroke();
    } else if (part === "head") {
      ctx.beginPath();
      ctx.rect(x - s * 1.1, y - s * 0.85, s * 2.2, s * 1.7);
      ctx.fill();
      ctx.stroke();
    } else if (part === "stick") {
      ctx.beginPath();
      ctx.rect(x - s * 1.2, y - s * 0.7, s * 2.4, s * 1.4);
      ctx.fill();
      ctx.stroke();
    } else {
      // leg pad (padL / padR): a tall rounded rectangle with straps
      const pw = s * 1.3;
      const ph = s * 2;
      const rr = s * 0.4;
      const px = x - pw / 2;
      const py = y - ph / 2;
      ctx.beginPath();
      ctx.moveTo(px + rr, py);
      ctx.arcTo(px + pw, py, px + pw, py + ph, rr);
      ctx.arcTo(px + pw, py + ph, px, py + ph, rr);
      ctx.arcTo(px, py + ph, px, py, rr);
      ctx.arcTo(px, py, px + pw, py, rr);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(px, py + ph * 0.34);
      ctx.lineTo(px + pw, py + ph * 0.34);
      ctx.moveTo(px, py + ph * 0.67);
      ctx.lineTo(px + pw, py + ph * 0.67);
      ctx.stroke();
    }
    ctx.restore();
  }

  // The shooter (YOU), waiting below the net with the puck at your feet. A
  // brief stick kick-back sells the release when the shot goes.
  function drawShooter(ctx, p, r, { windUp }) {
    ctx.save();
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
    ctx.font = `700 ${Math.round(r * 0.75)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("YOU", p.x, p.y);
    ctx.textBaseline = "alphabetic";
    const kick = windUp ? -0.35 : 0;
    ctx.strokeStyle = "#5b3a1e";
    ctx.lineWidth = Math.max(2, r * 0.22);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(p.x + r * 0.7, p.y + r * 0.2);
    ctx.lineTo(p.x + r * (1.6 + kick), p.y - r * (1.1 - kick));
    ctx.stroke();
    ctx.restore();
  }

  // The puck: a dark dot with a white ring, distinct by shape, not color.
  function drawPuck(ctx, x, y, r) {
    ctx.save();
    ctx.fillStyle = "#0b1b2b";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = Math.max(1.5, r * 0.35);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  const render = useCallback(() => {
    const sc = sceneRef.current;
    if (!sc.ctx) return;
    const { ctx, W, H, net, rects, shot } = sc;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#f4f9fc";
    ctx.fillRect(0, 0, W, H);
    // net frame
    ctx.strokeStyle = "#c8102e";
    ctx.lineWidth = 4;
    ctx.strokeRect(net.x, net.y, net.w, net.h);
    // grid lines
    ctx.strokeStyle = "rgba(11,27,43,0.12)";
    ctx.lineWidth = 1;
    for (let c = 1; c < 3; c += 1) {
      ctx.beginPath();
      ctx.moveTo(net.x + (net.w / 3) * c, net.y);
      ctx.lineTo(net.x + (net.w / 3) * c, net.y + net.h);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(net.x, net.y + net.h / 2);
    ctx.lineTo(net.x + net.w, net.y + net.h / 2);
    ctx.stroke();

    if (!shot) return;

    const isAnimating = sc.stage === "shooting";
    const isReveal = sc.stage === "reveal";
    const elapsed =
      sc.stage === "live" && sc.startTs != null
        ? Math.min(performance.now() - sc.startTs, shot.shotClockMs)
        : sc.frozenElapsed != null
        ? sc.frozenElapsed
        : 0;

    // shot animation progress (0..1), held at its final value through reveal
    let animFrac = 0;
    if (isAnimating && sc.shotAnimStart != null) {
      animFrac = Math.min(1, (performance.now() - sc.shotAnimStart) / SHOOT_ANIM_MS);
    } else if (isReveal && sc.shotAnimTarget) {
      animFrac = 1;
    }
    const eased = 1 - Math.pow(1 - animFrac, 2);
    const isSave = !!(sc.result && !sc.result.success && sc.shotAnimTarget);
    const diveCap = sc.shotAnimTarget ? (isSave ? 1 : 0.55) : 0;
    const diveFrac = eased * diveCap;

    const u = Math.min(net.w / 3, net.h / 2) * 0.36; // goalie unit size
    const coreBase = { x: net.x + net.w / 2, y: net.y + net.h / 2 };
    let core = coreBase;
    if (sc.shotAnimTarget) {
      const t = sc.shotAnimTarget;
      const tCenter = { x: t.x + t.w / 2, y: t.y + t.h / 2 };
      core = {
        x: coreBase.x + (tCenter.x - coreBase.x) * diveFrac * 0.7,
        y: coreBase.y + (tCenter.y - coreBase.y) * diveFrac * 0.4,
      };
    }

    // open-cell rings (skip the target cell once the dive is underway)
    rects.forEach((r) => {
      if (sc.shotAnimTarget && r.id === sc.shotAnimTarget.id) return;
      if (isCellOpenAt(shot, r.id, elapsed)) drawOpenCell(ctx, r);
    });

    drawGoalieCore(ctx, core.x, core.y, u);

    rects.forEach((r) => {
      if (sc.shotAnimTarget && r.id === sc.shotAnimTarget.id) return;
      const reach = cellReach(shot, r.id, elapsed);
      if (reach > 0.01) drawSavePiece(ctx, CELL_PART[r.id], r, coreBase, reach, u);
    });
    if (sc.shotAnimTarget && diveFrac > 0.01) {
      drawSavePiece(ctx, CELL_PART[sc.shotAnimTarget.id], sc.shotAnimTarget, core, diveFrac, u);
    }

    // the shooter, waiting below the net
    drawShooter(ctx, sc.shooterPos, sc.shooterR, { windUp: isAnimating && animFrac < 0.18 });

    // the puck: at the shooter's feet before the shot, travelling toward the
    // net during "shooting", resting at its outcome spot on reveal
    if (sc.shotAnimTarget) {
      const t = sc.shotAnimTarget;
      const tCenter = { x: t.x + t.w / 2, y: t.y + t.h / 2 };
      const puckCap = isSave ? 0.82 : 1;
      const puckFrac = Math.min(eased, puckCap);
      const px = sc.shooterPos.x + (tCenter.x - sc.shooterPos.x) * puckFrac;
      const py = sc.shooterPos.y + (tCenter.y - sc.shooterPos.y) * puckFrac;
      drawPuck(ctx, px, py, Math.max(5, u * 0.22));
    } else if (sc.stage === "ready" || sc.stage === "live") {
      drawPuck(ctx, sc.shooterPos.x, sc.shooterPos.y - sc.shooterR * 0.9, Math.max(5, u * 0.22));
    }

    // reveal: a GOAL / SAVED banner, plus a check/X on the target cell
    if (isReveal && sc.tappedId) {
      const r = rects.find((x) => x.id === sc.tappedId);
      if (r) {
        ctx.save();
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        if (sc.result && sc.result.success) {
          ctx.strokeStyle = "#1f9d55";
          ctx.beginPath();
          ctx.moveTo(r.x + r.w * 0.3, r.y + r.h * 0.55);
          ctx.lineTo(r.x + r.w * 0.45, r.y + r.h * 0.7);
          ctx.lineTo(r.x + r.w * 0.7, r.y + r.h * 0.32);
          ctx.stroke();
        } else {
          ctx.strokeStyle = "#c8102e";
          ctx.beginPath();
          ctx.moveTo(r.x + r.w * 0.32, r.y + r.h * 0.32);
          ctx.lineTo(r.x + r.w * 0.68, r.y + r.h * 0.68);
          ctx.moveTo(r.x + r.w * 0.68, r.y + r.h * 0.32);
          ctx.lineTo(r.x + r.w * 0.32, r.y + r.h * 0.68);
          ctx.stroke();
        }
        ctx.restore();
      }
      ctx.save();
      ctx.fillStyle = sc.result && sc.result.success ? "#1f9d55" : "#c8102e";
      ctx.font = "800 26px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(sc.result && sc.result.success ? "GOAL!" : "SAVED", W / 2, Math.max(24, net.y - 14));
      ctx.restore();
    }

    // live: a shrinking countdown bar under the net
    if (sc.stage === "live" && sc.startTs != null) {
      const frac = 1 - elapsed / shot.shotClockMs;
      ctx.fillStyle = "rgba(11,27,43,0.12)";
      ctx.fillRect(net.x, net.y + net.h + 10, net.w, 8);
      ctx.fillStyle = frac > 0.33 ? "#1b6cb0" : "#e8590c";
      ctx.fillRect(net.x, net.y + net.h + 10, net.w * Math.max(0, frac), 8);
    }
  }, []);

  const tick = useCallback(() => {
    const sc = sceneRef.current;
    if (sc.stage === "live") {
      render();
      if (performance.now() - sc.startTs >= sc.shot.shotClockMs) {
        resolveShot(null); // clock expired, no tap
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    } else if (sc.stage === "shooting") {
      render();
      const frac = sc.shotAnimStart != null ? (performance.now() - sc.shotAnimStart) / SHOOT_ANIM_MS : 1;
      if (frac >= 1) {
        finishShotAnim();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [render]);

  const startRep = useCallback((repIndex) => {
    const canvas = canvasRef.current;
    const host = rootRef.current;
    if (!canvas || !host) return;
    clearTimers();
    const { ctx, W, H } = setupCanvas(canvas, host);
    const net = computeNet(W, H);
    const shot = makeShot(engineRef.current.level);
    const shooterR = Math.max(11, Math.round(W * 0.032));
    const shooterPos = {
      x: net.x + net.w / 2,
      y: Math.min(H - shooterR - 6, net.y + net.h + Math.max(48, H * 0.16)),
    };
    sceneRef.current = {
      ctx, W, H, net,
      rects: cellRects(net),
      shot,
      stage: "ready",
      startTs: null,
      resolved: false,
      tappedId: null,
      result: null,
      frozenElapsed: 0,
      shotAnimStart: null,
      shotAnimTarget: null,
      shooterPos,
      shooterR,
      repIndex,
    };
    setStage("ready");
    render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [render]);

  function go() {
    const sc = sceneRef.current;
    if (!sc.ctx || sc.resolved || sc.stage !== "ready") return;
    sc.stage = "live";
    sc.startTs = performance.now();
    setStage("live");
    rafRef.current = requestAnimationFrame(tick);
  }

  const resolveRep = useCallback((success) => {
    pointsRef.current += sceneRef.current.result ? sceneRef.current.result.points : 0;
    setPoints(pointsRef.current);
    const lvl = engineRef.current.record(success);
    setLevel(lvl);
    if (success) setHits((h) => h + 1);
  }, []);

  // Reveal stays on screen (goal or save) until the player taps Next shot —
  // nothing auto-advances, so the outcome can actually be studied.
  function advanceRep() {
    const next = sceneRef.current.repIndex + 1;
    if (next >= REPS) {
      setPhase("done");
    } else {
      setRep(next);
      startRep(next);
    }
  }

  const resolveShot = useCallback(
    (cellId) => {
      const sc = sceneRef.current;
      if (sc.resolved || sc.stage !== "live") return;
      const elapsed = sc.startTs != null ? performance.now() - sc.startTs : sc.shot.shotClockMs + 1;
      const result = scoreShot(cellId, elapsed, sc.shot);
      sc.resolved = true;
      sc.tappedId = cellId;
      sc.result = result;
      sc.frozenElapsed = Math.min(elapsed, sc.shot.shotClockMs);
      clearTimers();

      if (cellId == null) {
        // no shot got off: nothing to animate, straight to the reveal
        sc.stage = "reveal";
        setStage("reveal");
        setLast({ success: false, repPoints: 0, expired: true });
        render();
        resolveRep(false);
        return;
      }

      sc.shotAnimTarget = sc.rects.find((r) => r.id === cellId) || null;
      sc.shotAnimStart = performance.now();
      sc.stage = "shooting";
      setStage("shooting");
      rafRef.current = requestAnimationFrame(tick);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [render, resolveRep]
  );

  function finishShotAnim() {
    const sc = sceneRef.current;
    sc.stage = "reveal";
    setStage("reveal");
    setLast({ success: sc.result.success, repPoints: sc.result.points, expired: false });
    render();
    resolveRep(sc.result.success);
  }

  function onCanvasTap(evt) {
    const sc = sceneRef.current;
    if (sc.stage !== "live") return;
    const p = pointerPos(evt, canvasRef.current);
    const id = cellAtPoint(sc.rects, p.x, p.y);
    if (!id) return;
    resolveShot(id);
  }

  function start() {
    const d = getDrill(playerId, "shootout");
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
      const record = saveSession(playerId, "shootout", {
        score,
        points: pointsRef.current,
        level: engineRef.current.level,
        streak: { ups: engineRef.current.ups, downs: engineRef.current.downs },
      });
      setSaved(record);
      cue("fanfare");
    }
  }, [phase, saved, hits, playerId]);

  useEffect(() => {
    if (phase !== "playing") return;
    const onResize = () => {
      const canvas = canvasRef.current;
      const host = rootRef.current;
      const sc = sceneRef.current;
      if (!canvas || !host || !sc.shot) return;
      const { ctx, W, H } = setupCanvas(canvas, host);
      const net = computeNet(W, H);
      sc.ctx = ctx;
      sc.W = W;
      sc.H = H;
      sc.net = net;
      sc.rects = cellRects(net);
      sc.shooterR = Math.max(11, Math.round(W * 0.032));
      sc.shooterPos = {
        x: net.x + net.w / 2,
        y: Math.min(H - sc.shooterR - 6, net.y + net.h + Math.max(48, H * 0.16)),
      };
      if (sc.tappedId) sc.shotAnimTarget = sc.rects.find((r) => r.id === sc.tappedId) || null;
      render();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [phase, render]);

  useEffect(() => () => clearTimers(), []);

  const hint = {
    ready: "Tap Go, then tap an open spot (a target ring) before the goalie covers it.",
    live: "Shoot an open spot. The goalie covers the blocked ones and closes more.",
    shooting: "",
    reveal: last
      ? last.success
        ? `Goal! +${last.repPoints}`
        : last.expired
        ? "Too slow, never got the shot off."
        : "Saved. The goalie got there first. Read the open net."
      : "",
  }[stage];

  const bestLabel = phase === "done" && saved ? sessionRankLabel(saved.sessions, Math.round(points)) : null;

  return (
    <div className="gym-drill" ref={rootRef}>
      {phase !== "intro" && <h2 className="gym-drill-title">Pick Your Spot</h2>}
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
            Shot {Math.min(rep + 1, REPS)} / {REPS}
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
          <h2>Pick Your Spot</h2>
          <svg viewBox="0 0 280 150" width="100%" style={{ maxWidth: 280, display: "block", margin: "0 auto 14px", borderRadius: 10 }} aria-hidden="true">
            <rect width="280" height="150" rx="8" fill="#eaf4fb" />
            <rect x="60" y="20" width="160" height="80" fill="none" stroke="#c8102e" strokeWidth="3" />
            <line x1="113" y1="20" x2="113" y2="100" stroke="#0b1b2b" strokeOpacity="0.15" />
            <line x1="166" y1="20" x2="166" y2="100" stroke="#0b1b2b" strokeOpacity="0.15" />
            <line x1="60" y1="60" x2="220" y2="60" stroke="#0b1b2b" strokeOpacity="0.15" />
            <rect x="63" y="23" width="47" height="37" fill="#2b3a47" />
            <circle cx="193" cy="40" r="12" fill="none" stroke="#1f9d55" strokeWidth="3" />
            <circle cx="140" cy="80" r="12" fill="none" stroke="#1f9d55" strokeWidth="3" />
            {/* the shooter below the net, puck en route */}
            <circle cx="140" cy="132" r="14" fill="#f2b705" stroke="#0b1b2b" strokeWidth="3" />
            <circle cx="140" cy="102" r="6" fill="#0b1b2b" stroke="#ffffff" strokeWidth="2" />
          </svg>
          <p className="gym-goal"><strong>Your goal:</strong> shoot where the goalie is not, then watch it happen.</p>
          <p>
            <strong>The game:</strong> the net is split into spots. The goalie
            covers some of them (the dark pads), and the open spots have a
            target ring. Tap Go, then tap an open spot before the clock runs
            out. The shooter releases, the puck travels, and the goalie dives
            toward your spot: beat the pad and it's a goal, get there after
            the goalie and it's a save. The higher your level, the more the
            goalie covers, the faster the open spots close, and the shorter
            the clock. Read the open net and pick your spot fast.
          </p>
          <div className="gym-trains">
            <strong>Why it matters</strong>
            <span>
              Goal scorers do not just shoot hard, they shoot where the goalie
              is not. Training your eyes to find the open part of the net
              fast is how you beat a goalie who is set, and how you get a
              shot off before the window closes.
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
        onPointerDown={onCanvasTap}
        style={{ display: phase === "playing" ? "block" : "none" }}
      />

      {phase === "playing" && stage === "ready" && (
        <div className="gym-row" style={{ marginBottom: 10 }}>
          <button className="gym-btn" onClick={go}>
            Go
          </button>
        </div>
      )}

      {phase === "playing" && (
        <p className="gym-hint" aria-live="polite">
          {hint}
        </p>
      )}

      {phase === "playing" && stage === "reveal" && (
        <button className="gym-btn gym-fab" onClick={advanceRep}>
          Next shot
        </button>
      )}

      {phase === "done" && (
        <div className="gym-card">
          <h2>Session complete</h2>
          <ScoreCount value={points} />
          <ConfettiBurst fire={!!bestLabel} />
          {bestLabel && <p className="gym-best">{bestLabel}</p>}
          <p>
            {points} points. {hits} of {REPS} goals. Level {level}.
            {saved && (saved.bestPoints || 0) <= points && points > 0 ? " New best." : ""}
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
