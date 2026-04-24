// ScenarioRenderer — top-level entry point. Validates the scenario,
// renders the prompt + RinkStage, delegates the interactive layer to
// the registered primitive matching interaction.kind. Stays small on
// purpose: every visual choice that varies by interaction kind lives
// in the primitive folder, not here.

import { useState } from "react";
import { validateScenario } from "./schema.js";
import RinkStage from "./RinkStage.jsx";
import { getPrimitive } from "./registry.js";
import { C, FONT, Card } from "../shared.jsx";

const VERB_HINT = {
  skate:    "Drag from yourself to where you should skate.",
  carry:    "Drag the puck from your stick to where you should carry it.",
  pass:     "Drag from your stick to the open teammate.",
  shoot:    "Drag from your stick to the spot you should hit.",
  screen:   "Drag from your spot to where the screen lands.",
  check:    "Drag from your stick to the body to check.",
  backcheck:"Drag from yourself to your backcheck position.",
};

const VERB_BADGE = {
  skate:    { icon: "⛸️", label: "SKATE",     color: "#5BA4E8" },
  carry:    { icon: "🏒", label: "CARRY",     color: "#5BA4E8" },
  pass:     { icon: "🎯", label: "PASS",      color: "#1D9E75" },
  shoot:    { icon: "💥", label: "SHOOT",     color: "#E24B4A" },
  screen:   { icon: "🛡️", label: "SCREEN",    color: "#7C3AED" },
  check:    { icon: "💪", label: "CHECK",     color: "#A32D2D" },
  backcheck:{ icon: "↩️", label: "BACKCHECK", color: "#5BA4E8" },
};

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
  const verb = scenario.interaction.verb || "skate";
  const badge = VERB_BADGE[verb] || VERB_BADGE.skate;
  const hint = VERB_HINT[verb] || "Drag from the highlighted player.";

  function handleAnswer(p) {
    setResult(p);
    onAnswer?.(p);
  }

  return (
    <div>
      {/* Prompt card — same purple-tinted shape used elsewhere in the app
          so the scenario engine reads as part of the existing surface. */}
      <Card style={{
        marginBottom: ".75rem",
        background: C.purpleDim,
        border: `1px solid ${C.purpleBorder}`,
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: ".4rem",
          fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase",
          color: badge.color, fontWeight: 800, marginBottom: ".5rem"
        }}>
          <span style={{ fontSize: 14 }}>{badge.icon}</span>
          <span>{badge.label}</span>
          {scenario.cat && <span style={{ color: C.dimmer, fontWeight: 700 }}>· {scenario.cat}</span>}
        </div>
        <div style={{ fontSize: 15, lineHeight: 1.6, color: C.white, fontWeight: 500, marginBottom: ".4rem" }}>
          {scenario.interaction.prompt}
        </div>
        <div style={{ fontSize: 11, color: C.dimmer, lineHeight: 1.5, fontStyle: "italic" }}>{hint}</div>
      </Card>

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
            {result.ok ? "✓ Right read" : "✗ Off-target"}
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
