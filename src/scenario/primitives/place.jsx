// Place primitive — user DRAGS one or more actors (interaction.items) to
// where they belong, then taps Check. Each actor's final position is scored
// against its target zone/point within tolerance.
//
// Use cases: "put the goalie in the crease and the D in front" (young ages,
// learning positioning) → "place each player in the ideal spot for this
// situation" (older ages). The placeable actors are hidden from the static
// stage render (ScenarioRenderer passes their ids as hiddenIds) and drawn
// here as draggable tokens starting at their authored (bench/neutral) coords.

import { useEffect, useMemo, useRef, useState } from "react";
import { denorm, RINK_W, RINK_H } from "../schema.js";
import { resolveTarget } from "../zones.js";
import { scorePlace } from "./place-scorer.js";
import { revealPlan, shouldAutoReveal } from "./place-reveal.js";
import { HockeyPlayerArt } from "../../visuals/HockeyPlayerArt.jsx";

const KIND_FILL = {
  player: "#0F4C8C", teammate: "#0F4C8C", defender: "#1a1a1a", goalie: "#51607A", puck: "#0a0a0a",
};
const ARROW_MARKER_ID = "place-reveal-arrow";
const clamp01 = (v) => Math.max(0.02, Math.min(0.98, v));

// `colorblind` is optional and defaults off. Every reveal channel below is
// redundant with colour (dash pattern, ✓/✗ glyph, identity label, arrow
// presence), so the reveal already reads without hue — the prop only swaps the
// green/red pair for the blue/orange one when a caller has the player's
// setting in scope.
export function PlacePrimitive({ interaction, correct, actors, svgPoint, view, locked, colorblind, onAnswer }) {
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
  // Reveal computed WITHOUT a Check tap — the timeout path. See below.
  const [autoScore, setAutoScore] = useState(null);
  // False until the primitive has been interactive at least once, so a lock
  // that was true from the very first render (the IntelliGym preview lock)
  // can never be mistaken for the end of the question.
  const everUnlockedRef = useRef(!locked);

  useEffect(() => {
    const p = {};
    for (const id of items) { const a = actorById[id]; if (a) p[id] = { x: a.x, y: a.y }; }
    setPositions(p); setMoved({}); setScore(null); setAutoScore(null); setDragging(null);
    everUnlockedRef.current = !locked;
  }, [interaction?.prompt]);

  // Timeout reveal. The parent times the question out by calling its own
  // onAnswer and passing locked=true; it never calls check(), so `score` stays
  // null and — before this — nothing at all was drawn. Recomputing the score
  // locally keeps the fix inside this file: no new prop, no parent change.
  // Deliberately does NOT call onAnswer — the parent has already recorded the
  // timeout, and firing again would double-log the reaction time.
  useEffect(() => {
    if (!locked) { everUnlockedRef.current = true; return; }
    if (!shouldAutoReveal({ locked, everUnlocked: everUnlockedRef.current, hasScore: !!score })) return;
    setAutoScore(prev => prev || scorePlace(positions, correct));
  }, [locked, score, positions, correct]);

  const revealScore = score || autoScore;
  const revealed = !!revealScore;
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
    if (revealScore?.placements) for (const r of revealScore.placements) m[r.id] = r;
    return m;
  }, [revealScore]);

  // Faint target guides shown up-front only if the author opts in (guided
  // mode for young ages). Otherwise targets reveal after Check.
  const showGuides = !!interaction.showTargets;

  function targetFor(id) {
    const t = (correct.placements || []).find(p => p.id === id);
    if (!t) return null;
    try { return resolveTarget(t); } catch { return null; }
  }

  const targets = useMemo(() => {
    const m = {};
    for (const id of items) m[id] = targetFor(id);
    return m;
  }, [items, correct]);

  // Everything the reveal draws — colours, ellipse geometry, label placement,
  // the movement arrow — is decided in place-reveal.js so it can be tested
  // from node. The single rule it enforces: the target is stroked the CORRECT
  // colour whether or not the player got that item right. It is the answer,
  // not the mistake. (This file used to stroke it red on a wrong placement,
  // identical to the player's own wrong token, so a miss taught nothing.)
  const plan = useMemo(() => (revealed ? revealPlan({
    items, actorById, targets, resultById, moved, colorblind,
  }) : []), [revealed, items, actorById, targets, resultById, moved, colorblind]);
  const planById = useMemo(() => Object.fromEntries(plan.map(p => [p.id, p])), [plan]);

  // Center the Check button in the VISIBLE crop, not at normalized x=0.5.
  // A half-view crops to one end of the ice, so x=0.5 lands at the cropped
  // edge and a 92px-wide button spills off-screen (the bug on left/right views).
  const CROP_CENTER_X = { left: 0.25, right: 0.75, neutral: 0.475 };
  const btn = denorm({ x: CROP_CENTER_X[view] ?? 0.5, y: 0.93 });

  return (
    <g style={{ touchAction: "none" }}>
      {/* Drag capture surface. Only present WHILE dragging, so it never eats
          clicks meant for the tokens themselves.

          Without it, pointermove/pointerup are bound solely to the token <g>,
          which means the drag depends entirely on setPointerCapture() working
          on an SVG group. Where that is unsupported or silently no-ops (it is
          called with optional chaining, so a miss is invisible), the pointer
          leaves the ~15px circle after a few pixels of travel and the token
          stops following -- indistinguishable from "I can't drag the players",
          reported from live playtest 2026-08-03. Catching the events on a
          full-bleed rect makes the drag independent of pointer capture. */}
      {dragging != null && (
        <rect x="-50" y="-50" width="700" height="400" fill="transparent"
          pointerEvents="all" onPointerMove={onMove} onPointerUp={endDrag}
          onPointerLeave={endDrag}/>
      )}

      {/* Faint author-opted guides, BEFORE the answer only. Once the reveal
          lands the block below replaces them. */}
      {!revealed && showGuides && items.map(id => {
        const t = targets[id];
        if (!t) return null;
        // Scorer uses normalized distance → the tolerance region is an ellipse
        // (rx = tol·600, ry = tol·300) in the viewBox, not a circle.
        const px = denorm(t);
        return (
          <ellipse key={"g" + id} cx={px.x} cy={px.y} rx={t.tolerance * RINK_W} ry={t.tolerance * RINK_H} fill="none"
            stroke="#86EFAC" strokeWidth="1.6" strokeDasharray="4 2.5" opacity={0.45}
            style={{ pointerEvents: "none" }}/>
        );
      })}

      {/* THE ANSWER. Drawn once the question is over — by Check, or by the
          parent locking the board on a timeout. Four channels, only one of
          which is colour:
            · a dashed ring on the correct spot (always the CORRECT colour),
            · the player's tag on it, so three rings on a breakout board can be
              told apart (RW vs C vs LW),
            · a gold arrow from where that player STARTED to where they should
              have ended up, drawn only where the player got it wrong,
            · a ✓ / ✗ on the token they actually left behind. */}
      {plan.length > 0 && (
        <g style={{ pointerEvents: "none" }}>
          <defs>
            <marker id={ARROW_MARKER_ID} markerWidth="5" markerHeight="5" refX="4.2" refY="2.5" orient="auto">
              <path d="M0,0 L5,2.5 L0,5 Z" fill="#C9A24B"/>
            </marker>
          </defs>
          {plan.map(p => (
            <g key={"rv" + p.id}>
              {p.arrow && (
                <>
                  {/* Ghost of the starting spot, so the arrow reads as "this
                      player travels from here" rather than beginning nowhere —
                      the authored actor is hidden from the stage while this
                      primitive owns it. */}
                  <circle cx={p.arrow.tailX} cy={p.arrow.tailY} r="4.5" fill="none"
                    stroke={p.arrowColor} strokeWidth="1.2" opacity="0.75"/>
                  <line x1={p.arrow.x1} y1={p.arrow.y1} x2={p.arrow.x2} y2={p.arrow.y2}
                    stroke={p.arrowColor} strokeWidth="2" strokeDasharray="5 3"
                    strokeLinecap="round" opacity="0.9" markerEnd={`url(#${ARROW_MARKER_ID})`}/>
                </>
              )}
              <ellipse cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry}
                fill={p.targetStroke} fillOpacity={p.targetFillOpacity}
                stroke={p.targetStroke} strokeWidth="1.8" strokeDasharray={p.targetDash}
                opacity={p.targetOpacity}/>
              {p.label && (
                <text x={p.labelX} y={p.labelY} textAnchor="middle" fontSize="10" fontWeight="800"
                  fill={p.targetStroke}
                  style={{ paintOrder: "stroke", textShadow: "0 1px 3px rgba(0,0,0,.95)" }}>
                  {p.label}
                </text>
              )}
            </g>
          ))}
        </g>
      )}

      {/* Draggable tokens. */}
      {items.map(id => {
        const a = actorById[id];
        const pos = positions[id];
        if (!a || !pos) return null;
        const px = denorm(pos);
        const p = planById[id];
        // A token the player never dragged (only reachable on a timeout) is
        // neither right nor wrong — it gets a neutral ring and no mark.
        const ring = p ? p.ring : (dragging === id ? "#C9A24B" : "#fff");
        const isGoalie = a.kind === "goalie";
        const isSkater = ["player", "teammate", "defender"].includes(a.kind);
        const dx = a.facing ? (a.facing.x - a.x) * RINK_W : 0;
        const dy = a.facing ? (a.facing.y - a.y) * RINK_H : 0;
        const facing = isSkater && Number.isFinite(dx) && Number.isFinite(dy) && Math.hypot(dx, dy) > .5
          ? Math.atan2(dy, dx) * 180 / Math.PI : null;
        return (
          <g key={id} transform={`translate(${px.x},${px.y})`}
            onPointerDown={(e) => startDrag(e, id)}
            onPointerMove={onMove}
            onPointerUp={endDrag}
            style={{ cursor: finalLocked ? "default" : "grab" }}>
            {/* draggable affordance ring */}
            {!revealed && (
              <circle cx="0" cy="0" r={isGoalie ? 16 : 15} fill="none"
                stroke="#C9A24B" strokeWidth="1.4" strokeDasharray="3 3" opacity="0.8"/>
            )}
            {isGoalie ? (
              <>
                <rect x="-11" y="-12" width="22" height="22" rx="7" fill={KIND_FILL.goalie} fillOpacity=".12" stroke={ring} strokeWidth="2"/>
                {/* This primitive has no goalie-team context. Retain neutral equipment. */}
                <g style={{ filter: "grayscale(1)" }}><HockeyPlayerArt radius={11} goalie facing={null}/></g>
              </>
            ) : a.kind === "defender" ? (
              <>
                <circle cx="0" cy="0" r="11" fill={KIND_FILL.defender} fillOpacity=".12" stroke={ring} strokeWidth="2"/>
                <HockeyPlayerArt radius={11} team="away" facing={facing}/>
                <g transform="translate(8,8)" pointerEvents="none">
                  <circle r="4.5" fill="#172B3D" stroke="#fff" strokeWidth=".8"/>
                  <path d="M-2-2 2 2 M-2 2 2-2" fill="none" stroke="#fff" strokeWidth="1.3" strokeLinecap="round"/>
                </g>
              </>
            ) : (
              <>
                <circle cx="0" cy="0" r="12" fill={KIND_FILL[a.kind] || KIND_FILL.teammate} fillOpacity={isSkater ? .12 : 1} stroke={ring} strokeWidth="2"/>
                {isSkater && <HockeyPlayerArt radius={12} team="home" facing={facing}/>}
              </>
            )}
            {(a.tag || isGoalie) && (
              <text x="0" y="-18" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="800"
                style={{ pointerEvents: "none", paintOrder: "stroke", textShadow: "0 1px 2px rgba(0,0,0,.85)" }}>
                {a.tag || "G"}
              </text>
            )}
            {/* Verdict on the player's own token — the non-colour half of the
                right/wrong signal, same device selection.jsx uses. */}
            {p?.glyph && (
              <text x={isGoalie ? 15 : 14} y={-9} textAnchor="middle" fontSize="11" fontWeight="800"
                fill={p.ring} style={{ pointerEvents: "none", textShadow: "0 1px 3px rgba(0,0,0,.95)" }}>
                {p.glyph}
              </text>
            )}
          </g>
        );
      })}

      {/* Check button. */}
      {!revealed && (
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
