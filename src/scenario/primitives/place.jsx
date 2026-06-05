// Place primitive — user DRAGS one or more actors (interaction.items) to
// where they belong, then taps Check. Each actor's final position is scored
// against its target zone/point within tolerance.
//
// Use cases: "put the goalie in the crease and the D in front" (young ages,
// learning positioning) → "place each player in the ideal spot for this
// situation" (older ages). The placeable actors are hidden from the static
// stage render (ScenarioRenderer passes their ids as hiddenIds) and drawn
// here as draggable tokens starting at their authored (bench/neutral) coords.

import { useEffect, useMemo, useState } from "react";
import { denorm, denormR } from "../schema.js";
import { resolveTarget } from "../zones.js";
import { scorePlace } from "./place-scorer.js";

const KIND_FILL = {
  player: "#0F4C8C", teammate: "#0F4C8C", defender: "#1a1a1a", goalie: "#51607A", puck: "#0a0a0a",
};
const clamp01 = (v) => Math.max(0.02, Math.min(0.98, v));

export function PlacePrimitive({ interaction, correct, actors, svgPoint, locked, onAnswer }) {
  const items = useMemo(() => interaction.items || [], [interaction]);
  const actorById = useMemo(() => Object.fromEntries((actors || []).map(a => [a.id, a])), [actors]);

  const [positions, setPositions] = useState(() => {
    const p = {};
    for (const id of items) { const a = actorById[id]; if (a) p[id] = { x: a.x, y: a.y }; }
    return p;
  });
  const [dragging, setDragging] = useState(null);
  const [moved, setMoved] = useState({});
  const [score, setScore] = useState(null);

  useEffect(() => {
    const p = {};
    for (const id of items) { const a = actorById[id]; if (a) p[id] = { x: a.x, y: a.y }; }
    setPositions(p); setMoved({}); setScore(null); setDragging(null);
  }, [interaction?.prompt]);

  const finalLocked = !!score || !!locked;
  const allMoved = items.length > 0 && items.every(id => moved[id]);

  function startDrag(e, id) {
    if (finalLocked) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDragging(id);
  }
  function onMove(e) {
    if (dragging == null || finalLocked) return;
    const p = svgPoint(e);
    setPositions(prev => ({ ...prev, [dragging]: { x: clamp01(p.x), y: clamp01(p.y) } }));
    setMoved(m => (m[dragging] ? m : { ...m, [dragging]: true }));
  }
  function endDrag(e) {
    if (dragging != null) e.currentTarget.releasePointerCapture?.(e.pointerId);
    setDragging(null);
  }
  function check() {
    if (finalLocked || !allMoved) return;
    const result = scorePlace(positions, correct);
    setScore(result);
    onAnswer?.({ ok: result.ok, reason: result.reason, placements: result.placements, positions });
  }

  const resultById = useMemo(() => {
    const m = {};
    if (score?.placements) for (const r of score.placements) m[r.id] = r;
    return m;
  }, [score]);

  // Faint target guides shown up-front only if the author opts in (guided
  // mode for young ages). Otherwise targets reveal after Check.
  const showGuides = !!interaction.showTargets;

  function targetFor(id) {
    const t = (correct.placements || []).find(p => p.id === id);
    if (!t) return null;
    try { return resolveTarget(t); } catch { return null; }
  }

  const btn = denorm({ x: 0.5, y: 0.93 });

  return (
    <g style={{ touchAction: "none" }}>
      {/* Target guides (faint before, revealed after Check). */}
      {items.map(id => {
        const t = targetFor(id);
        if (!t) return null;
        const r = resultById[id];
        const reveal = !!score;
        if (!showGuides && !reveal) return null;
        const px = denorm(t), pr = denormR(t.tolerance);
        const col = reveal ? (r?.ok ? "#22c55e" : "#ef4444") : "#86EFAC";
        return (
          <circle key={"t" + id} cx={px.x} cy={px.y} r={pr} fill="none"
            stroke={col} strokeWidth="1.6" strokeDasharray="4 2.5" opacity={reveal ? 0.9 : 0.45}
            style={{ pointerEvents: "none" }}/>
        );
      })}

      {/* Draggable tokens. */}
      {items.map(id => {
        const a = actorById[id];
        const pos = positions[id];
        if (!a || !pos) return null;
        const px = denorm(pos);
        const r = resultById[id];
        const ring = score ? (r?.ok ? "#22c55e" : "#ef4444") : (dragging === id ? "#C9A24B" : "#fff");
        const isGoalie = a.kind === "goalie";
        return (
          <g key={id} transform={`translate(${px.x},${px.y})`}
            onPointerDown={(e) => startDrag(e, id)}
            onPointerMove={onMove}
            onPointerUp={endDrag}
            style={{ cursor: finalLocked ? "default" : "grab" }}>
            {/* draggable affordance ring */}
            {!score && (
              <circle cx="0" cy="0" r={isGoalie ? 16 : 15} fill="none"
                stroke="#C9A24B" strokeWidth="1.4" strokeDasharray="3 3" opacity="0.8"/>
            )}
            {isGoalie ? (
              <rect x="-11" y="-12" width="22" height="22" rx="7" fill={KIND_FILL.goalie} stroke={ring} strokeWidth="2"/>
            ) : a.kind === "defender" ? (
              <>
                <circle cx="0" cy="0" r="11" fill={KIND_FILL.defender} stroke={ring} strokeWidth="2"/>
                <line x1="-5" y1="-5" x2="5" y2="5" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                <line x1="-5" y1="5" x2="5" y2="-5" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
              </>
            ) : (
              <circle cx="0" cy="0" r="12" fill={KIND_FILL[a.kind] || KIND_FILL.teammate} stroke={ring} strokeWidth="2"/>
            )}
            {(a.tag || isGoalie) && (
              <text x="0" y="4" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="800"
                style={{ pointerEvents: "none", paintOrder: "stroke", textShadow: "0 1px 2px rgba(0,0,0,.85)" }}>
                {a.tag || "G"}
              </text>
            )}
          </g>
        );
      })}

      {/* Check button. */}
      {!score && (
        <g transform={`translate(${btn.x},${btn.y})`}
          onClick={check}
          onTouchEnd={(e) => { e.preventDefault(); check(); }}
          style={{ cursor: allMoved ? "pointer" : "default" }}>
          <rect x="-46" y="-13" width="92" height="26" rx="13"
            fill={allMoved ? "#1D9E75" : "rgba(255,255,255,.10)"}
            stroke={allMoved ? "#22c55e" : "rgba(255,255,255,.2)"} strokeWidth="1.4"/>
          <text x="0" y="4" textAnchor="middle" fontSize="12" fontWeight="800"
            fill={allMoved ? "#fff" : "rgba(255,255,255,.5)"} style={{ pointerEvents: "none" }}>
            {allMoved ? "✓ Check" : "Drag all"}
          </text>
        </g>
      )}
    </g>
  );
}

export const placePrimitive = {
  kind: "place",
  Component: PlacePrimitive,
  score: scorePlace,
  // Actors the primitive renders itself (as draggable tokens) — the stage
  // skips them in its static layer so they aren't drawn twice.
  interactiveActorIds: (interaction) => interaction.items || [],
};
