// ScenarioRenderer — top-level entry point. Validates the scenario,
// renders the prompt + RinkStage, and delegates the interactive layer to
// the registered primitive matching interaction.kind. This file stays
// small on purpose: every visual choice that varies by interaction kind
// lives in the primitive folder, not here.

import { useState } from "react";
import { validateScenario } from "./schema.js";
import RinkStage from "./RinkStage.jsx";
import { getPrimitive } from "./registry.js";
import { C, FONT, Card } from "../shared.jsx";

/**
 * @param {Object} props
 * @param {import("./schema.js").Scenario} props.scenario
 * @param {(result: { ok: boolean, payload: any }) => void} [props.onAnswer]
 */
export default function ScenarioRenderer({ scenario, onAnswer }) {
  const [result, setResult] = useState(null);
  const validation = validateScenario(scenario);

  if (!validation.ok) {
    return (
      <Card style={{ background: C.redDim, border: `1px solid ${C.redBorder}` }}>
        <div style={{ fontWeight: 800, color: C.red, marginBottom: 4 }}>Scenario validation failed</div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: C.dim }}>
          {validation.errs.map((e, i) => <li key={i}>{e}</li>)}
        </ul>
      </Card>
    );
  }

  const primitive = getPrimitive(scenario.interaction.kind);
  if (!primitive) {
    return (
      <Card style={{ background: C.redDim, border: `1px solid ${C.redBorder}` }}>
        <div style={{ fontWeight: 800, color: C.red }}>Unknown interaction kind: {scenario.interaction.kind}</div>
      </Card>
    );
  }

  const PrimComponent = primitive.Component;

  function handleAnswer(p) {
    setResult(p);
    onAnswer?.(p);
  }

  return (
    <div>
      <p style={{
        color: C.white, fontFamily: FONT.body, fontSize: 15, lineHeight: 1.5,
        margin: "0 0 .25rem"
      }}>
        {scenario.interaction.prompt}
      </p>

      <RinkStage stage={scenario.stage} actors={scenario.actors}>
        {(svgPoint) => (
          <PrimComponent
            interaction={scenario.interaction}
            correct={scenario.correct}
            actors={scenario.actors}
            svgPoint={svgPoint}
            onAnswer={handleAnswer}
          />
        )}
      </RinkStage>

      {result && (
        <Card style={{
          marginTop: ".5rem",
          background: result.ok ? "rgba(34,197,94,.08)" : "rgba(239,68,68,.08)",
          border: `1px solid ${result.ok ? "rgba(34,197,94,.3)" : "rgba(239,68,68,.3)"}`
        }}>
          <div style={{
            fontSize: 12, fontWeight: 800, letterSpacing: ".06em",
            color: result.ok ? C.green : C.red, marginBottom: ".4rem"
          }}>
            {result.ok ? "✓ Correct" : "✗ Off-target"}
          </div>
          <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.6 }}>
            {result.ok ? scenario.feedback.right : scenario.feedback.wrong}
          </div>
          {scenario.tip && (
            <div style={{ marginTop: ".4rem", fontSize: 12, color: C.dimmer, fontStyle: "italic" }}>💡 {scenario.tip}</div>
          )}
        </Card>
      )}
    </div>
  );
}
