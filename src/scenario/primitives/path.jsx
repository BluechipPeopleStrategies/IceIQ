// Path primitive — user draws an ordered sequence of points starting AT
// `interaction.from` (an actor) and ending near `correct.end` (zone or
// point). SPADL verb (skate / carry / pass / shoot / screen / check)
// drives stroke + scoring tolerance.
//
// Visual contract (matches legacy PathDraw fidelity):
//   - Pulsing ring on the from-actor before answer ("grab here").
//   - Drag must START inside the from-ring; clicks elsewhere are ignored.
//   - Target zone shown as faint green dashed circle while drawing.
//   - Path renders as a smooth quadratic curve, not a polyline.
//   - After answer: target fills in, ideal line ghosts in dashed green,
//     puck (or skater) animates along the user's path.

import { useEffect, useMemo, useRef, useState } from "react";
import { denorm, denormR } from "../schema.js";
import { resolveTarget } from "../zones.js";

const VERB_STYLE = {
  skate:    { color: "#185FA5", dash: "none",  hint: "Drag from yourself to where you should skate." },
  carry:    { color: "#185FA5", dash: "8 3",   hint: "Drag the puck from your stick to where you should carry it." },
  pass:     { color: "#1D9E75", dash: "none",  hint: "Drag from your stick to the open teammate." },
  shoot:    { color: "#A32D2D", dash: "none",  hint: "Drag from your stick to the spot you should hit." },
  screen:   { color: "#7C3AED", dash: "4 3",   hint: "Drag from your spot to where the screen lands." },
  check:    { color: "#A32D2D", dash: "2 2",   hint: "Drag from your stick to the body to check." },
  backcheck:{ color: "#185FA5", dash: "2 2",   hint: "Drag from yourself to your backcheck position." },
};

function distance(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Quadratic-midpoint smoothing — same algorithm as the legacy PathDraw
// (smoothPathD). Produces a curve that follows finger/mouse without the
// polyline stair-step artefacts.
function smoothPathD(points) {
  if (!points.length) return "";
  if (points.length < 3) {
    return `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)} L ${points[points.length-1].x.toFixed(2)} ${points[points.length-1].y.toFixed(2)}`;
  }
  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 1; i < points.length - 1; i++) {
    const xc = (points[i].x + points[i + 1].x) / 2;
    const yc = (points[i].y + points[i + 1].y) / 2;
    d += ` Q ${points[i].x.toFixed(2)} ${points[i].y.toFixed(2)} ${xc.toFixed(2)} ${yc.toFixed(2)}`;
  }
  d += ` L ${points[points.length-1].x.toFixed(2)} ${points[points.length-1].y.toFixed(2)}`;
  return d;
}

// Linearly walk a point list at parameter t in [0,1] for the replay.
function ptAt(points, t) {
  if (!points.length) return null;
  if (t <= 0) return points[0];
  if (t >= 1) return points[points.length - 1];
  const idx = Math.min(points.length - 2, Math.floor(t * (points.length - 1)));
  const frac = (t * (points.length - 1)) - idx;
  const a = points[idx], b = points[idx + 1];
  return { x: a.x + (b.x - a.x) * frac, y: a.y + (b.y - a.y) * frac };
}

// Path-segment vs point distance — for interception detection. Returns
// the minimum distance from `pt` to any segment of `path` (normalized).
function minDistanceToPath(pt, path) {
  let best = Infinity;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    const dx = b.x - a.x, dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    let t = 0;
    if (len2 > 0) {
      t = ((pt.x - a.x) * dx + (pt.y - a.y) * dy) / len2;
      t = Math.max(0, Math.min(1, t));
    }
    const px = a.x + t * dx, py = a.y + t * dy;
    const d = Math.sqrt((pt.x - px) ** 2 + (pt.y - py) ** 2);
    if (d < best) best = d;
  }
  return best;
}

const INTERCEPT_RADIUS = 0.035; // a defender within ~21px of the line "intercepts"

export function scorePath(userPath, correct, opts = {}) {
  if (!userPath || userPath.length < 2) return { ok: false, reason: "tooShort" };
  const target = resolveTarget(correct.end);
  const endPoint = userPath[userPath.length - 1];
  const d = distance(endPoint, target);
  // Interception check (only when defenders are passed in — primitive is
  // pure otherwise).
  const defenders = Array.isArray(opts.defenders) ? opts.defenders : [];
  for (const def of defenders) {
    if (minDistanceToPath(def, userPath) < INTERCEPT_RADIUS) {
      return { ok: false, reason: "intercepted", endPoint, target, intercepter: def };
    }
  }
  return {
    ok: d <= target.tolerance,
    reason: d <= target.tolerance ? "ok" : "offTarget",
    distance: d, endPoint, target,
  };
}

const START_RING_NORM_RADIUS = 0.045; // ~27px on the 600-wide rink

export function PathPrimitive({ interaction, correct, actors, svgPoint, onAnswer }) {
  const fromActor = useMemo(() => actors.find(a => a.id === interaction.from), [actors, interaction.from]);
  const target = useMemo(() => resolveTarget(correct.end), [correct.end]);
  const verb = VERB_STYLE[interaction.verb] || VERB_STYLE.skate;

  const [path, setPath] = useState([]);
  const [drawing, setDrawing] = useState(false);
  const [score, setScore] = useState(null);
  const [replayT, setReplayT] = useState(0);
  const replayRef = useRef(null);

  // Replay animation after answer — 1.6s linear sweep.
  useEffect(() => {
    if (!score || path.length < 2) return;
    const startTs = performance.now();
    const DURATION = 1600;
    const tick = (now) => {
      const elapsed = now - startTs;
      const frac = Math.min(1, elapsed / DURATION);
      setReplayT(frac);
      if (frac < 1) replayRef.current = requestAnimationFrame(tick);
    };
    replayRef.current = requestAnimationFrame(tick);
    return () => { if (replayRef.current) cancelAnimationFrame(replayRef.current); };
  }, [score, path.length]);

  // Defenders fed to the scorer for interception detection. Primitive
  // remains pure on tests — defenders are sourced from the actor list.
  const defenders = useMemo(
    () => actors.filter(a => a.kind === "defender").map(a => ({ x: a.x, y: a.y })),
    [actors],
  );

  // Drag handlers as document-level listeners — survive cursor leaving
  // the rink frame, which the inline-svg handlers in v0 didn't.
  useEffect(() => {
    if (!drawing) return;
    const onMove = (e) => {
      const p = svgPoint(e);
      setPath(prev => [...prev, { x: p.x, y: p.y }]);
      if (e.preventDefault) e.preventDefault();
    };
    const onUp = () => {
      setDrawing(false);
      setPath(prev => {
        if (prev.length < 2) return prev;
        const result = scorePath(prev, correct, { defenders });
        setScore(result);
        onAnswer?.({ ok: result.ok, reason: result.reason, userPath: prev });
        return prev;
      });
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
    };
  }, [drawing, svgPoint, correct, onAnswer, defenders]);

  if (!fromActor) {
    return <text x="300" y="150" textAnchor="middle" fill="#ef4444" fontSize="12">missing actor "{interaction.from}"</text>;
  }

  function onDown(e) {
    if (score) return;
    const p = svgPoint(e);
    // Enforce drag-from-actor: click must land inside the start ring.
    const d = distance(p, fromActor);
    if (d > START_RING_NORM_RADIUS) return;
    setDrawing(true);
    setPath([{ x: fromActor.x, y: fromActor.y }]);
    if (e.preventDefault) e.preventDefault();
  }

  // Convert all geometry to pixel coords once for rendering.
  const startPx = denorm(fromActor);
  const startR = denormR(START_RING_NORM_RADIUS);
  const targetPx = denorm(target);
  const targetR = denormR(target.tolerance);
  const pixelPath = path.map(denorm);

  // Replay puck/skater along the user's path.
  const skaterPx = score && pixelPath.length > 1 ? ptAt(pixelPath, replayT) : null;
  // Ideal end glyph — green pulsing puck dropping into the target.
  const idealPx = score && !score.ok ? targetPx : null;

  const stroke = !score ? verb.color
    : score.ok ? "#22c55e"
    : "#ef4444";

  return (
    <g
      onMouseDown={onDown} onTouchStart={onDown}
      style={{ touchAction: "none" }}>
      {/* Capture surface — invisible rect spans wide enough to cover any
          half-view's viewBox. Padded negatives so the user can drag past
          the rink edges without losing pointer events. */}
      <rect x="-50" y="-50" width="700" height="400" fill="transparent" pointerEvents="all"/>

      {/* Target zone — faint dashed circle while idle, fills in on reveal.
          Always shown so the player knows what they're aiming at. The
          legacy version hides it on wrong, but coaches asked for the
          target to remain visible so the teaching moment lands. */}
      <g opacity={score?.ok ? 0.95 : 0.5}>
        <circle cx={targetPx.x} cy={targetPx.y} r={targetR}
          fill={score?.ok ? "rgba(34,197,94,.22)" : "rgba(34,197,94,.08)"}
          stroke="#22c55e" strokeWidth="1.6"
          strokeDasharray={score?.ok ? "none" : "4 2.5"}/>
        {!score && (
          <text x={targetPx.x} y={targetPx.y + 4} textAnchor="middle"
            fill="#86EFAC" fontSize="10" fontWeight="700"
            style={{ pointerEvents: "none" }}>target</text>
        )}
      </g>

      {/* Pulsing start ring on the from-actor — drag handle. */}
      {!score && (
        <g style={{ pointerEvents: "none" }}>
          <circle cx={startPx.x} cy={startPx.y} r={startR}
            fill="rgba(91,164,232,.18)" stroke="#5BA4E8" strokeWidth="1.4"
            strokeDasharray="5 3">
            <animate attributeName="r" values={`${startR};${startR + 4};${startR}`} dur="1.4s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="1;0.55;1" dur="1.4s" repeatCount="indefinite"/>
          </circle>
        </g>
      )}

      {/* Ideal-path overlay — only after wrong answer. Dashed green line
          from the start actor to the target zone + a checkmark glyph at
          the target so the player sees the read they missed. */}
      {idealPx && (
        <g style={{ pointerEvents: "none" }}>
          <line x1={startPx.x} y1={startPx.y} x2={idealPx.x} y2={idealPx.y}
            stroke="#22c55e" strokeWidth="2.5" strokeDasharray="6 4"
            strokeLinecap="round" opacity="0.8"/>
          <circle cx={idealPx.x} cy={idealPx.y} r="9" fill="#22c55e" stroke="#0b1220" strokeWidth="2" opacity="0.9"/>
          <text x={idealPx.x} y={idealPx.y + 3} textAnchor="middle" fontSize="10" fontWeight="800" fill="#0b1220">✓</text>
        </g>
      )}

      {/* Player's drawn path — smoothed. */}
      {pixelPath.length > 1 && (
        <path d={smoothPathD(pixelPath)} fill="none"
          stroke={stroke} strokeWidth="3"
          strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray={!score ? verb.dash : "none"}
          opacity={score ? 0.85 : 1}/>
      )}

      {/* Replay skater/puck along the user's path. */}
      {skaterPx && (
        <g style={{ pointerEvents: "none" }} transform={`translate(${skaterPx.x},${skaterPx.y})`}>
          {interaction.verb === "pass" || interaction.verb === "carry" || interaction.verb === "shoot" ? (
            <ellipse cx="0" cy="1" rx="9" ry="3.5" fill="#0a0a0a" stroke="#fff" strokeWidth="1.5"/>
          ) : (
            <circle cx="0" cy="0" r="9" fill={stroke} stroke="#0b1220" strokeWidth="2"/>
          )}
        </g>
      )}
    </g>
  );
}

export const pathPrimitive = {
  kind: "path",
  Component: PathPrimitive,
  score: scorePath,
};
