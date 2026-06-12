// Plays a multi-step scenario: renders each frame with the existing
// ScenarioRenderer (as a synthetic flat scenario), then a reveal beat
// (the step's `outcome` + a Continue control), then the next frame, and
// a final per-step summary. All sequencing logic lives in multiStep.js.
import { useState } from "react";
import ScenarioRenderer from "./ScenarioRenderer.jsx";
import { start, stepToScenario, currentStep, record, next, isComplete, summary } from "./multiStep.js";
import { C, FONT, Card } from "../shared.jsx";

export default function MultiStepPlayer({ scenario, playerId, onAnswer }) {
  const [state, setState] = useState(() => start(scenario));
  const [answered, setAnswered] = useState(false);

  if (isComplete(state)) {
    const s = summary(state);
    return (
      <Card style={{ background: C.dimmest, border: `1px solid ${C.border}` }}>
        <div style={{ fontWeight: 800, color: C.gold, marginBottom: ".4rem" }}>Play complete</div>
        <div style={{ fontSize: 14, color: C.white }}>You read {s.correct} of {s.total} correctly.</div>
        <div style={{ display: "flex", gap: ".4rem", marginTop: ".5rem" }}>
          {s.perStep.map((okStep, i) => (
            <span key={i} style={{ fontSize: 12, fontWeight: 800, color: okStep ? C.green : C.red }}>
              {okStep ? "✓" : "✗"} read {i + 1}
            </span>
          ))}
        </div>
      </Card>
    );
  }

  const frame = stepToScenario(state, state.index);
  const step = currentStep(state);
  const total = state.steps.length;

  function handleAnswer(result) {
    if (answered) return;
    setState((st) => record(st, result));
    setAnswered(true);
    onAnswer?.({ ...result, stepIndex: state.index });
  }
  function advance() {
    setAnswered(false);
    setState((st) => next(st));
  }

  return (
    <div>
      <div style={{ fontSize: 11, color: C.dimmer, fontFamily: FONT.body, marginBottom: ".3rem" }}>
        Read {state.index + 1} of {total}
      </div>
      <ScenarioRenderer scenario={frame} playerId={playerId} onAnswer={handleAnswer} />
      {answered && (
        <Card style={{ marginTop: ".6rem", background: C.purpleDim, border: `1px solid ${C.purpleBorder}` }}>
          {step.outcome && <div style={{ fontSize: 13, color: C.white, marginBottom: ".5rem" }}>▶ {step.outcome}</div>}
          <button onClick={advance}
            style={{ width: "100%", padding: ".7rem", borderRadius: 10, border: "none", background: C.gradientPrimary,
              color: C.bg, fontFamily: FONT.body, fontWeight: 800, cursor: "pointer" }}>
            {state.index + 1 < total ? "Continue →" : "See result →"}
          </button>
        </Card>
      )}
    </div>
  );
}
