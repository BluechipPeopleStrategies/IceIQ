import React from "react";
import RinkStage from "../scenario/RinkStage.jsx";
import { denorm } from "../scenario/schema.js";
import { resolveTarget } from "../scenario/zones.js";
import { stepToScenario } from "../scenario/multiStep.js";
import { toGraph, flattenNode } from "../scenario/branching.js";
import { hasBoard } from "./reviewCore.js";
import { levelsOf } from "../scenario/youngRink.js";
import { C, FONT } from "../shared.jsx";

// A text-only question (the bank, or any scenario without a rink board): render
// the stem + options + feedback. Handles both schemas (sit/opts/ok vs
// interaction.prompt / mc.stem / mc.opts / mc.ok).
function TextQuestion({ q }) {
  const stem = q.interaction?.prompt || q.mc?.stem || q.sit || q.q || "";
  const opts = q.mc?.opts || q.opts || [];
  const ok = q.mc?.ok != null ? q.mc.ok : (q.ok != null ? q.ok : null);
  const right = q.feedback?.right || q.why || "";
  const tip = q.tip || "";
  return (
    <div>
      <div style={{ fontFamily: FONT.body, color: C.white, fontSize: ".95rem", lineHeight: 1.45 }}>{stem}</div>
      {Array.isArray(opts) && opts.length > 0 && (
        <div style={{ marginTop: ".5rem", display: "flex", flexDirection: "column", gap: ".25rem" }}>
          {opts.map((opt, idx) => {
            const isOk = idx === ok;
            return (
              <div key={idx} style={{ fontSize: ".8rem", color: isOk ? C.green : C.dim, display: "flex", gap: ".45rem", lineHeight: 1.3 }}>
                <span style={{ fontWeight: 800 }}>{isOk ? "✓" : "✗"}</span>
                <span>{opt}</span>
              </div>
            );
          })}
        </div>
      )}
      {right && <div style={{ marginTop: ".4rem", color: C.dim, fontSize: ".8rem" }}>Right: {right}</div>}
      {tip && <div style={{ marginTop: ".2rem", color: C.dimmer, fontSize: ".75rem" }}>tip: {tip}</div>}
    </div>
  );
}

// Show every answer OPTION on the board: ring each candidate and mark the correct
// one with a green ✓, the rest with a dim ✗ (icon + shape, never colour alone).
export function OptionsOverlay({ scenario }) {
  const c = scenario.correct;
  const inter = scenario.interaction;
  const byId = Object.fromEntries((scenario.actors || []).map(a => [a.id, a]));

  // selection / sequence — candidates are interaction.from; correct are correct.ids
  if (inter && (inter.kind === "selection" || inter.kind === "sequence")) {
    const correctIds = new Set(c?.ids || []);
    return <>{(inter.from || []).map(id => {
      const a = byId[id]; if (!a) return null;
      const p = denorm(a);
      const ok = correctIds.has(id);
      return (
        <g key={id}>
          <circle cx={p.x} cy={p.y} r="20" fill="none" stroke={ok ? C.green : C.dim}
            strokeWidth="2.6" strokeDasharray={ok ? "4 3" : "1 4"} />
          <text x={p.x} y={p.y - 25} textAnchor="middle" fontSize="15" fontWeight="800"
            fill={ok ? C.green : C.dim} stroke={C.bg} strokeWidth="0.4" paintOrder="stroke">{ok ? "✓" : "✗"}</text>
        </g>
      );
    })}</>;
  }

  // point — single correct target zone
  if (c?.kind === "point") {
    let t; try { t = resolveTarget(c); } catch { return null; }
    const p = denorm(t);
    return <ellipse cx={p.x} cy={p.y} rx={t.tolerance * 600} ry={t.tolerance * 300}
      fill="rgba(34,197,94,.22)" stroke={C.green} strokeWidth="1.8" />;
  }

  // path — the correct route arrow
  if (c?.kind === "path") {
    const from = byId[inter?.from];
    let t; try { t = resolveTarget(c.end); } catch { return null; }
    if (!from) return null;
    const a = denorm(from), b = denorm(t);
    const mx = (a.x + b.x) / 2, my = Math.min(a.y, b.y) - 24;
    return <>
      <defs><marker id="rvwarrow" markerWidth="5" markerHeight="5" refX="2.4" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 Z" fill={C.gold} /></marker></defs>
      <path d={`M${a.x},${a.y} Q ${mx},${my} ${b.x},${b.y}`} fill="none" stroke={C.gold} strokeWidth="2.6" strokeDasharray="5 3" markerEnd="url(#rvwarrow)" vectorEffect="non-scaling-stroke" />
    </>;
  }
  return null;
}

// If the board throws while rendering, show the raw JSON so it's still triageable.
export class BoardBoundary extends React.Component {
  constructor(p) { super(p); this.state = { err: false }; }
  static getDerivedStateFromError() { return { err: true }; }
  render() { return this.state.err ? this.props.fallback : this.props.children; }
}

// One static board (RinkStage + the answer overlay + prompt/opts/feedback).
function OneBoard({ scenario, label }) {
  const prompt = scenario.interaction?.prompt || scenario.mc?.stem || "";
  const mc = scenario.mc;
  const fallback = <pre style={{ color: C.red, fontSize: ".7rem", overflow: "auto", background: C.bgCard, padding: ".5rem", borderRadius: 8 }}>{JSON.stringify(scenario, null, 2)}</pre>;
  return (
    <div>
      {label && <div style={{ fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: C.gold, fontWeight: 800, marginBottom: ".3rem" }}>{label}</div>}
      <BoardBoundary fallback={fallback}>
        <RinkStage stage={scenario.stage} actors={scenario.actors} levels={levelsOf(scenario)}>
          {() => <OptionsOverlay scenario={scenario} />}
        </RinkStage>
      </BoardBoundary>
      <div style={{ marginTop: ".5rem", fontFamily: FONT.body, color: C.white, fontSize: ".9rem" }}>{prompt}</div>
      {Array.isArray(mc?.opts) && (
        <div style={{ marginTop: ".45rem", display: "flex", flexDirection: "column", gap: ".25rem" }}>
          {mc.opts.map((opt, idx) => {
            const ok = idx === mc.ok;
            return (
              <div key={idx} style={{ fontSize: ".8rem", color: ok ? C.green : C.dim, display: "flex", gap: ".45rem", lineHeight: 1.3 }}>
                <span style={{ fontWeight: 800 }}>{ok ? "✓" : "✗"}</span>
                <span>{opt}</span>
              </div>
            );
          })}
        </div>
      )}
      {scenario.feedback?.right && <div style={{ marginTop: ".4rem", color: C.dim, fontSize: ".8rem" }}>Right: {scenario.feedback.right}</div>}
      {scenario.outcome && <div style={{ marginTop: ".25rem", color: C.dimmer, fontSize: ".78rem" }}>▶ {scenario.outcome}</div>}
      {scenario.tip && <div style={{ marginTop: ".2rem", color: C.dimmer, fontSize: ".75rem" }}>tip: {scenario.tip}</div>}
    </div>
  );
}

export default function ReviewBoard({ scenario }) {
  // Text-only question (the bank, or any board-less scenario): render the text.
  if (!hasBoard(scenario)) return <TextQuestion q={scenario} />;
  // Branching: stack every node frame, each with its own answer overlay.
  if (scenario.nodes && scenario.entry) {
    const ids = Object.keys(toGraph(scenario).nodes);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: ".9rem" }}>
        {ids.map((id) => (
          <OneBoard key={id} scenario={flattenNode(scenario, id)} label={`Frame · ${id}`} />
        ))}
      </div>
    );
  }
  // Multi-step: show every frame stacked, each with its own answer overlay.
  if (Array.isArray(scenario.steps) && scenario.steps.length) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: ".9rem" }}>
        {scenario.steps.map((_, i) => (
          <OneBoard key={i} scenario={stepToScenario(scenario, i)} label={`Read ${i + 1} of ${scenario.steps.length}`} />
        ))}
      </div>
    );
  }
  return <OneBoard scenario={scenario} />;
}
