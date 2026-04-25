// Point primitive — user taps once anywhere on the rink. Compares the
// tap position to a target (zone or numeric point) within tolerance.
//
// Use cases: "where should you stand?", "click the spot the puck should
// end up", "tap the danger zone." Lighter than path (no drag) and more
// flexible than selection (no fixed candidate set).

import { useEffect, useState } from "react";
import { denorm, denormR } from "../schema.js";
import { resolveTarget } from "../zones.js";
import { scorePoint } from "./point-scorer.js";

export function PointPrimitive({ interaction, correct, svgPoint, locked, onAnswer }) {
  const [pick, setPick] = useState(null); // {x,y} normalized
  const [score, setScore] = useState(null);

  useEffect(() => { setPick(null); setScore(null); }, [interaction?.prompt]);

  const finalLocked = !!score || !!locked;
  const target = (() => {
    try { return resolveTarget(correct); } catch { return null; }
  })();

  function onTap(e) {
    if (finalLocked) return;
    const p = svgPoint(e);
    setPick(p);
    const result = scorePoint(p, correct);
    setScore(result);
    onAnswer?.({ ok: result.ok, reason: result.reason, point: p });
  }

  const targetPx = target ? denorm(target) : null;
  const targetR = target ? denormR(target.tolerance) : 0;
  const pickPx = pick ? denorm(pick) : null;

  return (
    <g
      onClick={onTap}
      onTouchEnd={(e) => { e.preventDefault(); onTap(e); }}
      style={{ cursor: finalLocked ? "default" : "crosshair", touchAction: "none" }}>
      {/* Capture surface — gets clicks even where there's no other geometry. */}
      <rect x="-50" y="-50" width="700" height="400" fill="transparent" pointerEvents="all"/>

      {/* Target zone — faint while idle, fills in on reveal. */}
      {targetPx && (
        <g opacity={score?.ok ? 0.95 : 0.5} style={{ pointerEvents: "none" }}>
          <circle cx={targetPx.x} cy={targetPx.y} r={targetR}
            fill={score?.ok ? "rgba(34,197,94,.22)" : "rgba(34,197,94,.08)"}
            stroke="#22c55e" strokeWidth="1.6"
            strokeDasharray={score?.ok ? "none" : "4 2.5"}/>
          {!score && (
            <text x={targetPx.x} y={targetPx.y + 4} textAnchor="middle"
              fill="#86EFAC" fontSize="10" fontWeight="700">target</text>
          )}
        </g>
      )}

      {/* User's tap — green dot if correct, red ✗ if wrong. */}
      {pickPx && (
        <g style={{ pointerEvents: "none" }}>
          {score?.ok ? (
            <circle cx={pickPx.x} cy={pickPx.y} r="9" fill="#22c55e"
              stroke="#0b1220" strokeWidth="2"/>
          ) : (
            <>
              <circle cx={pickPx.x} cy={pickPx.y} r="11" fill="rgba(239,68,68,.15)"
                stroke="#ef4444" strokeWidth="1.6"/>
              <line x1={pickPx.x - 5} y1={pickPx.y - 5} x2={pickPx.x + 5} y2={pickPx.y + 5}
                stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round"/>
              <line x1={pickPx.x - 5} y1={pickPx.y + 5} x2={pickPx.x + 5} y2={pickPx.y - 5}
                stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round"/>
            </>
          )}
        </g>
      )}
    </g>
  );
}

export const pointPrimitive = {
  kind: "point",
  Component: PointPrimitive,
  score: scorePoint,
};
