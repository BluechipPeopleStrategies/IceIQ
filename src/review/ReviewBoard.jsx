import React from "react";
import RinkStage from "../scenario/RinkStage.jsx";
import { denorm } from "../scenario/schema.js";
import { resolveTarget } from "../scenario/zones.js";
import { C, FONT } from "../shared.jsx";

// Green ring / arrow / zone showing the declared correct answer, drawn over the board.
function CorrectOverlay({ scenario }) {
  const c = scenario.correct;
  if (!c) return null;
  const byId = Object.fromEntries((scenario.actors || []).map(a => [a.id, a]));
  if (c.kind === "selection") {
    return <>{(c.ids || []).map(id => {
      const a = byId[id]; if (!a) return null;
      const p = denorm(a);
      return <circle key={id} cx={p.x} cy={p.y} r="20" fill="none" stroke={C.green} strokeWidth="2.6" strokeDasharray="4 3" />;
    })}</>;
  }
  if (c.kind === "point") {
    let t; try { t = resolveTarget(c); } catch { return null; }
    const p = denorm(t);
    return <ellipse cx={p.x} cy={p.y} rx={t.tolerance * 600} ry={t.tolerance * 300} fill="rgba(34,197,94,.22)" stroke={C.green} strokeWidth="1.8" />;
  }
  if (c.kind === "path") {
    const from = byId[scenario.interaction?.from];
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
class BoardBoundary extends React.Component {
  constructor(p) { super(p); this.state = { err: false }; }
  static getDerivedStateFromError() { return { err: true }; }
  render() { return this.state.err ? this.props.fallback : this.props.children; }
}

export default function ReviewBoard({ scenario }) {
  const prompt = scenario.interaction?.prompt || scenario.mc?.stem || "";
  const fallback = <pre style={{ color: C.red, fontSize: ".7rem", overflow: "auto", background: C.bgCard, padding: ".5rem", borderRadius: 8 }}>{JSON.stringify(scenario, null, 2)}</pre>;
  return (
    <div>
      <BoardBoundary fallback={fallback}>
        <RinkStage stage={scenario.stage} actors={scenario.actors} levels={scenario.levels}>
          {() => <CorrectOverlay scenario={scenario} />}
        </RinkStage>
      </BoardBoundary>
      <div style={{ marginTop: ".5rem", fontFamily: FONT.body, color: C.white, fontSize: ".9rem" }}>{prompt}</div>
      {scenario.feedback?.right && <div style={{ marginTop: ".3rem", color: C.dim, fontSize: ".8rem" }}>✓ {scenario.feedback.right}</div>}
      {scenario.tip && <div style={{ marginTop: ".2rem", color: C.dimmer, fontSize: ".75rem" }}>tip: {scenario.tip}</div>}
    </div>
  );
}
