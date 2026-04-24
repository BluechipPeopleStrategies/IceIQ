// Path primitive — user draws an ordered sequence of points starting from
// `interaction.from` (an actor id) and ending near `correct.end` (zone or
// point). SPADL-style verb (skate / pass / carry / shoot) drives the
// visual treatment AND the scoring tolerance — a `pass` is judged by
// endpoint, a `skate` by endpoint + path quality.

import { useMemo, useRef, useState } from "react";
import { denorm, denormR } from "../schema.js";
import { resolveTarget } from "../zones.js";
import { C, FONT } from "../../shared.jsx";

const VERB_STROKE = {
  skate: { color: "#185FA5", dash: "none" },        // solid blue
  carry: { color: "#185FA5", dash: "8 3" },         // dashed blue (carrying puck)
  pass:  { color: "#1D9E75", dash: "none" },        // solid green
  shoot: { color: "#A32D2D", dash: "none" },        // solid red
  screen:{ color: "#7C3AED", dash: "4 3" },         // purple short-dash
  check: { color: "#A32D2D", dash: "2 2" },         // red dotted
  backcheck:{ color: "#185FA5", dash: "2 2" },      // blue dotted
};

function distance(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function pathSvgD(points) {
  if (!points.length) return "";
  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x.toFixed(2)} ${points[i].y.toFixed(2)}`;
  }
  return d;
}

/**
 * Score a user path against the expected answer. Returns:
 *   { ok: boolean, distance: number, endPoint: {x,y}, target: {x,y,tolerance} }
 *
 * Endpoint within tolerance = correct. Avoiding obstacles, smooth curves,
 * and intermediate waypoints are reserved for v2 — v1 keeps it dead simple
 * to validate the primitive boundary first.
 */
export function scorePath(userPath, correct) {
  if (!userPath || userPath.length < 2) {
    return { ok: false, distance: Infinity, endPoint: null, target: null };
  }
  const target = resolveTarget(correct.end);
  const endPoint = userPath[userPath.length - 1];
  const d = distance(endPoint, target);
  return { ok: d <= target.tolerance, distance: d, endPoint, target };
}

/**
 * @param {Object} props
 * @param {import("../schema.js").PathInteraction} props.interaction
 * @param {import("../schema.js").PathAnswer} props.correct
 * @param {import("../schema.js").Actor[]} props.actors
 * @param {(svgPoint: (e: PointerEvent) => {x:number,y:number}) => void} props.svgPoint
 * @param {(result: { ok: boolean, userPath: Array<{x,y}> }) => void} [props.onAnswer]
 */
export function PathPrimitive({ interaction, correct, actors, svgPoint, onAnswer }) {
  const fromActor = useMemo(() => actors.find(a => a.id === interaction.from), [actors, interaction.from]);
  const target = useMemo(() => resolveTarget(correct.end), [correct.end]);
  const verb = VERB_STROKE[interaction.verb] || VERB_STROKE.skate;

  const [path, setPath] = useState([]);          // normalized 0..1 points
  const [drawing, setDrawing] = useState(false);
  const [score, setScore] = useState(null);      // null until submitted
  const dragStartedRef = useRef(false);

  if (!fromActor) {
    return (
      <text x="300" y="150" textAnchor="middle" fill="#ef4444" fontSize="12">
        path primitive: missing actor "{interaction.from}"
      </text>
    );
  }

  function onDown(e) {
    if (score) return;                          // locked after submit
    dragStartedRef.current = true;
    setPath([{ x: fromActor.x, y: fromActor.y }]);
    setDrawing(true);
    e.preventDefault?.();
  }
  function onMove(e) {
    if (!drawing || !dragStartedRef.current) return;
    const p = svgPoint(e);
    setPath(prev => [...prev, { x: p.x, y: p.y }]);
  }
  function onUp() {
    if (!drawing) return;
    setDrawing(false);
    dragStartedRef.current = false;
    // Auto-submit on lift — same UX as the existing path-draw type so the
    // parity test isolates the schema/render delta, not behavior.
    if (path.length >= 2) {
      const result = scorePath(path, correct);
      setScore(result);
      onAnswer?.({ ok: result.ok, userPath: path });
    }
  }
  function reset() {
    setPath([]);
    setScore(null);
  }

  // Convert normalized → pixel for SVG.
  const pixelPath = path.map(denorm);
  const startPx = denorm(fromActor);
  const targetPx = denorm(target);
  const targetR = denormR(target.tolerance);

  return (
    <g
      onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp}
      onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
      style={{ cursor: score ? "default" : "crosshair", touchAction: "none" }}>
      {/* Capture surface — invisible rect across the rink so events fire
          even when the cursor isn't over a marker. */}
      <rect x="0" y="0" width="600" height="300" fill="transparent" pointerEvents="all"/>

      {/* Target zone — green dashed circle while idle, fills in on reveal. */}
      <circle
        cx={targetPx.x} cy={targetPx.y} r={targetR}
        fill={score?.ok ? "rgba(34,197,94,.18)" : "rgba(34,197,94,.08)"}
        stroke="#22c55e"
        strokeWidth="1.6"
        strokeDasharray={score?.ok ? "none" : "4 2.5"}
      />

      {/* Start point ring on the from-actor. */}
      <circle cx={startPx.x} cy={startPx.y} r="14" fill="none" stroke={verb.color} strokeWidth="1.4" strokeDasharray="3 2" opacity="0.6"/>

      {/* User's path. */}
      {pixelPath.length > 1 && (
        <path d={pathSvgD(pixelPath)} fill="none"
          stroke={score ? (score.ok ? "#22c55e" : "#ef4444") : verb.color}
          strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray={verb.dash}/>
      )}

      {/* Reset chip after answer (small, doesn't intercept drag). */}
      {score && (
        <g transform={`translate(${denorm({x:0.02, y:0.06}).x},${denorm({x:0.02, y:0.06}).y})`}
          style={{ cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); reset(); }}>
          <rect x="0" y="-12" width="56" height="20" rx="10" fill="rgba(0,0,0,.65)"/>
          <text x="28" y="2" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700">↺ Reset</text>
        </g>
      )}
    </g>
  );
}

// Registry export — ScenarioRenderer pulls these by interaction.kind.
export const pathPrimitive = {
  kind: "path",
  Component: PathPrimitive,
  score: scorePath,
};
