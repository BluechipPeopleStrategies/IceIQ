import { useRef, useState, useCallback, useEffect } from "react";
import { createAdaptiveLevel, setupCanvas, pointerPos, lerp } from "./gymEngine";
import { getDrill, saveSession } from "./gymStorage";
import { cue, gymCueHooks } from "./gymAudio";
import { ScoreCount, ConfettiBurst } from "./gymFx";
import { sessionRankLabel } from "./gymProgressCore";
import {
  makeShot,
  scoreShot,
  isCellOpenAt,
  cellRects,
  cellAtPoint,
  nearestCellWithin,
  makeGoalieProfile,
} from "./shootoutCore";

// "Shootout" — a first-person breakaway. You start at center ice with the
// puck; the net and goalie grow as you skate in (the approach IS the shot
// clock). The goalie covers some spots and commits to more as you close in,
// biased by a per-session tendency announced in a scouting report. Tap an
// open spot to release before you run out of ice; the puck flies, the goalie
// dives, GOAL or SAVE. Ten shots, you vs the goalie on the scoreboard.
// Cell coverage / close-schedule / scoring logic is shootoutCore, unchanged.

const REPS = 10;
const SHOOT_ANIM_MS = 460; // release-to-outcome animation length
const NEAR_SCALE = 1.0; // net scale at the hash marks (release point)
const FAR_SCALE = 0.42; // net scale at center ice

export default function ShootoutDrill({ playerId = "default", onExit }) {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const sceneRef = useRef({});
  const timersRef = useRef([]);
  const rafRef = useRef(0);
  const pointsRef = useRef(0);
  const profileRef = useRef(null);

  const [phase, setPhase] = useState("intro"); // intro | playing | done
  const [rep, setRep] = useState(0);
  const [hits, setHits] = useState(0);
  const [level, setLevel] = useState(() => getDrill(playerId, "shootout").level);
  const [points, setPoints] = useState(0);
  const [stage, setStage] = useState("ready"); // ready | live | shooting | reveal
  const [last, setLast] = useState(null);
  const [saved, setSaved] = useState(null);
  const [combo, setCombo] = useState(0);
  const [pips, setPips] = useState([]); // "goal" | "save" per finished shot

  function clearTimers() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
  }

  // Approach progress 0..1 -> eased skate (accelerates as you close in).
  function approachEase(p) {
    return p * (0.55 + 0.45 * p);
  }

  // Net rect at approach progress p (0 = center ice, 1 = the hash marks).
  function netAt(W, H, p) {
    const pe = approachEase(Math.min(Math.max(p, 0), 1));
    const s = lerp(FAR_SCALE, NEAR_SCALE, pe);
    const w = Math.min(W * 0.62, (H * 0.42) / 0.55) * s;
    const h = w * 0.55;
    const yBottom = lerp(H * 0.44, H * 0.8, pe);
    return { x: (W - w) / 2, y: yBottom - h, w, h };
  }

  const HORIZON = 0.3; // fraction of H where the ice meets the boards

  // Each net cell maps to the goalie body part that covers it.
  const CELL_PART = {
    gloveHi: "glove",
    midHi: "head",
    blkrHi: "blocker",
    gloveLo: "padL",
    fiveHole: "stick",
    blkrLo: "padR",
  };

  // How far the goalie has reached into a cell at the given time: 0 (open) to
  // 1 (covered). Start-covered cells are always 1; a closing cell sweeps shut
  // over the last REACH_MS before its atMs.
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

  function drawOpenCell(ctx, r) {
    ctx.save();
    ctx.strokeStyle = "#1f9d55";
    ctx.lineWidth = Math.max(2, r.w * 0.045);
    ctx.beginPath();
    ctx.arc(r.x + r.w / 2, r.y + r.h / 2, Math.min(r.w, r.h) * 0.28, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawGoalieCore(ctx, cx, cy, u) {
    ctx.save();
    ctx.fillStyle = "#2b3a47";
    ctx.beginPath();
    ctx.ellipse(cx, cy + u * 0.15, u * 0.7, u * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy - u * 0.55, u * 0.48, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#f4f9fc";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - u * 0.3, cy - u * 0.55);
    ctx.lineTo(cx + u * 0.3, cy - u * 0.55);
    ctx.moveTo(cx, cy - u * 0.9);
    ctx.lineTo(cx, cy - u * 0.2);
    ctx.stroke();
    ctx.restore();
  }

  // One save piece reaching from the core into a covered cell. `reach` (0..1)
  // animates position (core -> cell center) and size (small -> cell-filling).
  function drawSavePiece(ctx, part, cell, core, reach, u) {
    const tx = cell.x + cell.w / 2;
    const ty = cell.y + cell.h / 2;
    const x = core.x + (tx - core.x) * reach;
    const y = core.y + (ty - core.y) * reach;
    const s = Math.min(cell.w, cell.h) * (0.16 + 0.26 * reach);
    ctx.save();
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
      // leg pad: tall rounded rectangle with straps
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

  // Your stick blade + the puck at the bottom of the frame (first-person). A
  // slight sway while skating sells the stride; a kick on release sells the
  // shot.
  function drawPov(ctx, W, H, { sway = 0, windUp = false, puckVisible = true }) {
    const bx = W * 0.5 + sway;
    const by = H * 0.97;
    ctx.save();
    ctx.strokeStyle = "#5b3a1e";
    ctx.lineWidth = Math.max(6, W * 0.016);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(W * (windUp ? 0.86 : 0.82), H * 1.04);
    ctx.lineTo(bx + W * 0.05, by - (windUp ? H * 0.015 : 0));
    ctx.stroke();
    // blade
    ctx.strokeStyle = "#3d2813";
    ctx.lineWidth = Math.max(8, W * 0.02);
    ctx.beginPath();
    ctx.moveTo(bx + W * 0.055, by);
    ctx.lineTo(bx - W * 0.045, by + H * 0.008);
    ctx.stroke();
    ctx.restore();
    if (puckVisible) drawPuck(ctx, bx - W * 0.01, by - H * 0.012, Math.max(6, W * 0.016));
  }

  // The arena: boards/glass band above the horizon, converging ice edges,
  // and speed lines that sweep toward you while you skate.
  function drawArena(ctx, W, H, elapsed, skating) {
    const hy = H * HORIZON;
    // crowd/glass bands
    ctx.fillStyle = "#dbe7ef";
    ctx.fillRect(0, 0, W, hy);
    ctx.fillStyle = "#c3d4e0";
    ctx.fillRect(0, hy - H * 0.055, W, H * 0.055);
    // ice
    ctx.fillStyle = "#f4f9fc";
    ctx.fillRect(0, hy, W, H - hy);
    // converging board edges
    ctx.strokeStyle = "rgba(107,130,148,0.6)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(W * 0.33, hy);
    ctx.moveTo(W, H);
    ctx.lineTo(W * 0.67, hy);
    ctx.stroke();
    // speed lines: ice markings sweeping toward the shooter
    const base = skating ? elapsed : 0;
    ctx.save();
    for (let i = 0; i < 4; i += 1) {
      const f = ((base / 1100 + i / 4) % 1 + 1) % 1;
      const y = hy + (H - hy) * f * f;
      const half = lerp(W * 0.1, W * 0.52, f);
      ctx.strokeStyle = `rgba(27,108,176,${0.05 + 0.13 * f})`;
      ctx.lineWidth = Math.max(1, 3.5 * f);
      ctx.beginPath();
      ctx.moveTo(W / 2 - half, y);
      ctx.lineTo(W / 2 + half, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  const render = useCallback(() => {
    const sc = sceneRef.current;
    if (!sc.ctx) return;
    const { ctx, W, H, shot } = sc;
    ctx.clearRect(0, 0, W, H);
    if (!shot) return;

    const isLive = sc.stage === "live";
    const isAnimating = sc.stage === "shooting";
    const isReveal = sc.stage === "reveal";
    const elapsed = isLive && sc.startTs != null
      ? Math.min(performance.now() - sc.startTs, shot.shotClockMs)
      : sc.frozenElapsed != null
      ? sc.frozenElapsed
      : 0;

    drawArena(ctx, W, H, elapsed, isLive);

    // the net at the current approach distance (frozen once the shot is away)
    const p = elapsed / shot.shotClockMs;
    const net = netAt(W, H, p);
    const rects = cellRects(net);
    sc.rects = rects; // taps map against what is on screen right now

    // net frame + grid
    ctx.strokeStyle = "#c8102e";
    ctx.lineWidth = Math.max(3, net.w * 0.014);
    ctx.strokeRect(net.x, net.y, net.w, net.h);
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

    // goal crease under the net
    ctx.fillStyle = "rgba(27,108,176,0.16)";
    ctx.beginPath();
    ctx.ellipse(net.x + net.w / 2, net.y + net.h + net.h * 0.06, net.w * 0.42, net.h * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    // shot animation progress (0..1), held at its final value through reveal
    let animFrac = 0;
    if (isAnimating && sc.shotAnimStart != null) {
      animFrac = Math.min(1, (performance.now() - sc.shotAnimStart) / SHOOT_ANIM_MS);
    } else if (isReveal && sc.tappedId) {
      animFrac = 1;
    }
    const eased = 1 - Math.pow(1 - animFrac, 2);
    const target = sc.tappedId ? rects.find((r) => r.id === sc.tappedId) || null : null;
    const isSave = !!(sc.result && !sc.result.success && target);
    const diveCap = target ? (isSave ? 1 : 0.55) : 0;
    const diveFrac = eased * diveCap;

    const u = Math.min(net.w / 3, net.h / 2) * 0.36;
    const coreBase = { x: net.x + net.w / 2, y: net.y + net.h / 2 };
    let core = coreBase;
    if (target) {
      const tc = { x: target.x + target.w / 2, y: target.y + target.h / 2 };
      core = {
        x: coreBase.x + (tc.x - coreBase.x) * diveFrac * 0.7,
        y: coreBase.y + (tc.y - coreBase.y) * diveFrac * 0.4,
      };
    }

    // open-cell rings (skip the target once the dive is underway)
    rects.forEach((r) => {
      if (target && r.id === target.id) return;
      if (isCellOpenAt(shot, r.id, elapsed)) drawOpenCell(ctx, r);
    });

    drawGoalieCore(ctx, core.x, core.y, u);

    rects.forEach((r) => {
      if (target && r.id === target.id) return;
      const reach = cellReach(shot, r.id, elapsed);
      if (reach > 0.01) drawSavePiece(ctx, CELL_PART[r.id], r, coreBase, reach, u);
    });
    if (target && diveFrac > 0.01) {
      drawSavePiece(ctx, CELL_PART[target.id], target, core, diveFrac, u);
    }

    // first-person stick + puck
    const sway = isLive ? Math.sin(elapsed / 170) * W * 0.012 : 0;
    drawPov(ctx, W, H, {
      sway,
      windUp: isAnimating && animFrac < 0.2,
      puckVisible: !target && !sc.expired,
    });

    // the released puck flying to the chosen spot (shrinks with distance)
    if (target) {
      const tc = { x: target.x + target.w / 2, y: target.y + target.h / 2 };
      const from = { x: W * 0.49, y: H * 0.95 };
      const puckCap = isSave ? 0.82 : 1;
      const f = Math.min(eased, puckCap);
      const px = from.x + (tc.x - from.x) * f;
      const py = from.y + (tc.y - from.y) * f;
      const pr = lerp(Math.max(6, W * 0.016), Math.max(4, u * 0.2), f);
      drawPuck(ctx, px, py, pr);
    }

    // reveal: banner + check/X on the target cell
    if (isReveal) {
      if (sc.tappedId && target) {
        ctx.save();
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        if (sc.result && sc.result.success) {
          ctx.strokeStyle = "#1f9d55";
          ctx.beginPath();
          ctx.moveTo(target.x + target.w * 0.3, target.y + target.h * 0.55);
          ctx.lineTo(target.x + target.w * 0.45, target.y + target.h * 0.7);
          ctx.lineTo(target.x + target.w * 0.7, target.y + target.h * 0.32);
          ctx.stroke();
        } else {
          ctx.strokeStyle = "#c8102e";
          ctx.beginPath();
          ctx.moveTo(target.x + target.w * 0.32, target.y + target.h * 0.32);
          ctx.lineTo(target.x + target.w * 0.68, target.y + target.h * 0.68);
          ctx.moveTo(target.x + target.w * 0.68, target.y + target.h * 0.32);
          ctx.lineTo(target.x + target.w * 0.32, target.y + target.h * 0.68);
          ctx.stroke();
        }
        ctx.restore();
      }
      ctx.save();
      ctx.fillStyle = sc.result && sc.result.success ? "#1f9d55" : "#c8102e";
      ctx.font = "800 26px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        sc.result && sc.result.success ? "GOAL!" : sc.expired ? "POKE CHECK" : "SAVED",
        W / 2,
        Math.max(26, net.y - 14)
      );
      ctx.restore();
    }

    // live: remaining-ice bar along the bottom
    if (isLive && sc.startTs != null) {
      const frac = 1 - elapsed / shot.shotClockMs;
      ctx.fillStyle = "rgba(11,27,43,0.12)";
      ctx.fillRect(W * 0.08, H - 8, W * 0.84, 6);
      ctx.fillStyle = frac > 0.33 ? "#1b6cb0" : "#e8590c";
      ctx.fillRect(W * 0.08, H - 8, W * 0.84 * Math.max(0, frac), 6);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tick = useCallback(() => {
    const sc = sceneRef.current;
    if (sc.stage === "live") {
      render();
      if (performance.now() - sc.startTs >= sc.shot.shotClockMs) {
        resolveShot(null); // out of ice, never got the shot off
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
    const weights = profileRef.current ? profileRef.current.weights : null;
    const shot = makeShot(engineRef.current.level, { weights });
    sceneRef.current = {
      ctx, W, H, shot,
      rects: [],
      stage: "ready",
      startTs: null,
      resolved: false,
      tappedId: null,
      result: null,
      expired: false,
      frozenElapsed: 0,
      shotAnimStart: null,
      repIndex,
    };
    setStage("ready");
    render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [render]);

  function go() {
    const sc = sceneRef.current;
    if (!sc.ctx || sc.resolved || sc.stage !== "ready") return;
    cue("go");
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
    setCombo(engineRef.current.combo);
    setPips((p) => [...p, success ? "goal" : "save"]);
    if (success) setHits((h) => h + 1);
  }, []);

  // Reveal stays on screen until the player taps Next shot; the outcome can
  // actually be studied.
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
        // never released: the goalie pokes it away, straight to the reveal
        sc.expired = true;
        sc.stage = "reveal";
        setStage("reveal");
        setLast({ success: false, repPoints: 0, expired: true });
        render();
        resolveRep(false);
        return;
      }

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
    const id = cellAtPoint(sc.rects, p.x, p.y) || nearestCellWithin(sc.rects, p.x, p.y);
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
    profileRef.current = makeGoalieProfile();
    setHits(0);
    setRep(0);
    setLast(null);
    setSaved(null);
    setCombo(0);
    setPips([]);
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
        meta: {
          bestCombo: engineRef.current.bestCombo,
          goalie: profileRef.current ? profileRef.current.id : null,
          goals: hits,
          saves: REPS - hits,
        },
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
      sc.ctx = ctx;
      sc.W = W;
      sc.H = H;
      render();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [phase, render]);

  useEffect(() => () => clearTimers(), []);

  const saves = pips.filter((p) => p === "save").length;
  const goals = pips.filter((p) => p === "goal").length;

  const hint = {
    ready:
      sceneRef.current.repIndex === 0
        ? "Ref's whistle. Tap Go, skate in, and pick your spot."
        : "Tap Go for your next attempt.",
    live: "Shoot! Tap an open ring before you run out of ice.",
    shooting: "",
    reveal: last
      ? last.success
        ? `Goal! +${last.repPoints}${combo >= 2 ? ` — ${combo} in a row` : ""}`
        : last.expired
        ? "Poke check! You held it too long — shoot before you're in on the goalie."
        : "Saved. The goalie beat you there. Re-read the scouting report."
      : "",
  }[stage];

  const won = goals > saves;
  const tied = goals === saves;
  const bestLabel = phase === "done" && saved ? sessionRankLabel(saved.sessions, Math.round(points)) : null;

  return (
    <div className="gym-drill" ref={rootRef}>
      {phase !== "intro" && <h2 className="gym-drill-title">Shootout</h2>}
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
          <span className="gym-chip">You {goals} — {saves} Goalie</span>
        )}
        {phase === "playing" && combo >= 2 && <span className="gym-chip">🔥 x{combo}</span>}
        {phase === "playing" && <span className="gym-chip">{points} pts</span>}
      </div>

      {phase === "playing" && (
        <div className="gym-row" style={{ gap: 6, marginBottom: 8, flexWrap: "wrap" }} aria-label="Shootout progress">
          {Array.from({ length: REPS }, (_, i) => {
            const done = pips[i];
            return (
              <span
                key={i}
                style={{
                  fontSize: 16,
                  lineHeight: 1,
                  color: done === "goal" ? "#1f9d55" : done === "save" ? "#c8102e" : "rgba(11,27,43,0.35)",
                }}
              >
                {done === "goal" ? "●" : done === "save" ? "✕" : "○"}
              </span>
            );
          })}
        </div>
      )}

      {phase === "playing" && profileRef.current && (
        <p className="gym-hint" style={{ marginTop: 0 }}>
          📋 Scouting report: {profileRef.current.report}
        </p>
      )}

      {phase === "intro" && (
        <div className="gym-card">
          <h2>Shootout</h2>
          <svg viewBox="0 0 280 170" width="100%" style={{ maxWidth: 280, display: "block", margin: "0 auto 14px", borderRadius: 10 }} aria-hidden="true">
            <rect width="280" height="170" rx="8" fill="#eaf4fb" />
            <rect x="0" y="0" width="280" height="48" fill="#dbe7ef" />
            {/* converging ice edges */}
            <line x1="10" y1="170" x2="95" y2="48" stroke="#6b8294" strokeWidth="2" opacity="0.6" />
            <line x1="270" y1="170" x2="185" y2="48" stroke="#6b8294" strokeWidth="2" opacity="0.6" />
            {/* the net in the distance */}
            <rect x="92" y="52" width="96" height="52" fill="none" stroke="#c8102e" strokeWidth="3" />
            <line x1="124" y1="52" x2="124" y2="104" stroke="#0b1b2b" strokeOpacity="0.15" />
            <line x1="156" y1="52" x2="156" y2="104" stroke="#0b1b2b" strokeOpacity="0.15" />
            <line x1="92" y1="78" x2="188" y2="78" stroke="#0b1b2b" strokeOpacity="0.15" />
            {/* goalie center, glove-side covered */}
            <ellipse cx="140" cy="80" rx="13" ry="16" fill="#2b3a47" />
            <circle cx="140" cy="62" r="8" fill="#2b3a47" stroke="#f4f9fc" strokeWidth="1.5" />
            <rect x="94" y="54" width="29" height="23" fill="#2b3a47" opacity="0.9" />
            <circle cx="172" cy="65" r="9" fill="none" stroke="#1f9d55" strokeWidth="3" />
            <circle cx="172" cy="92" r="9" fill="none" stroke="#1f9d55" strokeWidth="3" />
            {/* your stick + puck, first person */}
            <line x1="235" y1="176" x2="150" y2="152" stroke="#5b3a1e" strokeWidth="7" strokeLinecap="round" />
            <line x1="158" y1="153" x2="128" y2="156" stroke="#3d2813" strokeWidth="9" strokeLinecap="round" />
            <circle cx="136" cy="148" r="7" fill="#0b1b2b" stroke="#ffffff" strokeWidth="2" />
          </svg>
          <p className="gym-goal"><strong>Your goal:</strong> win the shootout. Ten attempts, you against the goalie.</p>
          <p>
            <strong>The game:</strong> you're in alone. Tap Go and you skate
            in — the net gets bigger the closer you get, but the goalie keeps
            taking spots away. Open spots show a target ring. Tap one to
            shoot before you run out of ice. Every goalie has a tell: read
            the scouting report and use it. Goals beat saves after ten shots
            and you win the shootout.
          </p>
          <div className="gym-trains">
            <strong>Why it matters</strong>
            <span>
              Breakaway scorers don't guess — they read the goalie on the way
              in and shoot where he isn't. Training that read, at speed and
              under a closing window, is how you stay calm in alone instead
              of panicking and shooting into a pad.
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
          {rep + 1 >= REPS ? "See the result" : "Next shot"}
        </button>
      )}

      {phase === "done" && (
        <div className="gym-card">
          <h2>{won ? "You win the shootout!" : tied ? "Shootout tied" : "The goalie takes this one"}</h2>
          <ScoreCount value={points} />
          <ConfettiBurst fire={!!bestLabel || won} />
          {bestLabel && <p className="gym-best">{bestLabel}</p>}
          <p>
            Final: you {hits}, goalie {REPS - hits}. {points} points. Level {level}.
            {engineRef.current && engineRef.current.bestCombo >= 3
              ? ` Best run: ${engineRef.current.bestCombo} straight.`
              : ""}
            {saved && (saved.bestPoints || 0) <= points && points > 0 ? " New best." : ""}
          </p>
          <div className="gym-row">
            <button className="gym-btn" onClick={start}>
              Rematch
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
