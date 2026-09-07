// Plays a branching (or linear, or flat) scenario: renders each frame with
// ScenarioRenderer (as a synthetic flat scenario), shows a reveal beat (the
// route's outcome + Continue), follows the route to the next node, and ends with
// a per-read summary. All graph logic lives in branching.js.
import { useState } from "react";
import ScenarioRenderer from "./ScenarioRenderer.jsx";
import { start, frameFor, record, routeFor, advance, summary } from "./branching.js";
import { combinedResult } from "./multiStep.js";
import { C, FONT, Card } from "../shared.jsx";

export default function MultiStepPlayer({ scenario, playerId, onAnswer }) {
  const [state, setState] = useState(() => start(scenario));
  const [reveal, setReveal] = useState(null); // { route } after answering the current node (route may be null on a terminal)
  const [finished, setFinished] = useState(false);

  if (finished) {
    const s = summary(state);
    return (
      <Card style={{ background: C.dimmest, border: `1px solid ${C.border}` }}>
        <div style={{ fontWeight: 800, color: C.gold, marginBottom: ".4rem" }}>Play complete</div>
        <div style={{ fontSize: 14, color: C.white }}>You read {s.correct} of {s.total} correctly.</div>
        <div style={{ display: "flex", gap: ".4rem", marginTop: ".5rem", flexWrap: "wrap" }}>
          {s.perRead.map((ok, i) => (
            <span key={i} style={{ fontSize: 12, fontWeight: 800, color: ok ? C.green : C.red }}>{ok ? "✓" : "✗"} read {i + 1}</span>
          ))}
        </div>
      </Card>
    );
  }

  const frame = frameFor(state);

  function handleAnswer(result) {
    if (reveal) return;
    const st2 = record(state, result);
    setState(st2);
    setReveal({ route: routeFor(st2, result) });
    // Per-step, flagged incomplete. The quiz shell records ONE result per
    // question, emitted below when the whole play finishes -- recording each
    // step inflated `results`, which the counter, the progress bar and
    // calcWeightedIQ() all divide by ("Question 6 of 5", 2026-08-02).
    // Still emitted so per-step telemetry and previews keep working.
    onAnswer?.({ ...result, nodeId: state.nodeId, complete: false });
  }
  function advanceNext() {
    if (!reveal) return;
    if (reveal.route) { setState((st) => advance(st, reveal.route)); setReveal(null); }
    else {
      setFinished(true);
      // The question's real result: correct only if every read was.
      onAnswer?.(combinedResult(summary(state)));
    }
  }

  return (
    <div>
      <div style={{ fontSize: 11, color: C.dimmer, fontFamily: FONT.body, marginBottom: ".3rem" }}>
        Read {state.path.length}
      </div>
      <ScenarioRenderer scenario={frame} playerId={playerId} onAnswer={handleAnswer} />
      {reveal && (
        <Card style={{ marginTop: ".6rem", background: C.purpleDim, border: `1px solid ${C.purpleBorder}` }}>
          {reveal.route && reveal.route.outcome && (
            <div style={{ fontSize: 13, color: C.white, marginBottom: ".5rem" }}>▶ {reveal.route.outcome}</div>
          )}
          <button onClick={advanceNext}
            style={{ width: "100%", padding: ".7rem", borderRadius: 10, border: "none", background: C.gradientPrimary,
              color: C.bg, fontFamily: FONT.body, fontWeight: 800, cursor: "pointer" }}>
            {reveal.route ? "Continue →" : "See result →"}
          </button>
        </Card>
      )}
    </div>
  );
}
