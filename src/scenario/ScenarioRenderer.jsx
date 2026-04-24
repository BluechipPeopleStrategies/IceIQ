// ScenarioRenderer — top-level entry point. Validates, renders prompt +
// optional countdown timer + RinkStage, delegates the interactive layer
// to the registered primitive matching interaction.kind. Tracks reaction
// time per answer (Hockey IntelliGym-style cognitive training).

import { useEffect, useRef, useState } from "react";
import { validateScenario } from "./schema.js";
import RinkStage from "./RinkStage.jsx";
import { getPrimitive } from "./registry.js";
import { logReactionTime } from "../utils/reactionTime.js";
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

// Drains a visible bar over the timer duration. Calls onExpire if the
// player doesn't answer in time. Stops cleanly when frozen=true.
function CountdownBar({ duration, frozen, onExpire }) {
  const [tick, setTick] = useState(0);
  const startRef = useRef(Date.now());
  const firedRef = useRef(false);
  useEffect(() => {
    if (frozen) return;
    startRef.current = Date.now();
    firedRef.current = false;
    const id = setInterval(() => {
      setTick(t => t + 1);
      const elapsed = Date.now() - startRef.current;
      if (elapsed >= duration && !firedRef.current) {
        firedRef.current = true;
        clearInterval(id);
        onExpire?.();
      }
    }, 80);
    return () => clearInterval(id);
  }, [duration, frozen, onExpire]);
  const elapsed = Date.now() - startRef.current;
  const remaining = Math.max(0, duration - elapsed);
  const pct = Math.min(100, Math.max(0, (remaining / duration) * 100));
  const color = pct > 60 ? "#1D9E75" : pct > 25 ? "#eab308" : "#E24B4A";
  return (
    <div style={{ marginBottom: ".55rem" }}>
      <div style={{
        display: "flex", justifyContent: "space-between", marginBottom: ".25rem",
        fontSize: 11, fontWeight: 800, letterSpacing: ".06em", color,
      }}>
        <span>⏱ {(remaining / 1000).toFixed(1)}s</span>
        {frozen && <span style={{ color: C.dimmer }}>locked</span>}
      </div>
      <div style={{ height: 5, background: C.dimmest, borderRadius: 2, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct}%`, background: color,
          borderRadius: 2, transition: "width .08s linear",
        }}/>
      </div>
    </div>
  );
}

export default function ScenarioRenderer({ scenario, playerId, onAnswer }) {
  const [result, setResult] = useState(null);
  const startedAtRef = useRef(Date.now());
  // IntelliGym preview-lock — interaction is disabled for this many ms
  // after the scenario loads so the player has to READ before reacting.
  const [previewLocked, setPreviewLocked] = useState(
    !!(scenario?.preview?.lockMs && scenario.preview.lockMs > 0)
  );
  useEffect(() => {
    if (!scenario?.preview?.lockMs) return;
    const id = setTimeout(() => {
      setPreviewLocked(false);
      // Reset the reaction-time clock when the lock lifts so we measure
      // actual decision time, not the imposed read window.
      startedAtRef.current = Date.now();
    }, scenario.preview.lockMs);
    return () => clearTimeout(id);
  }, [scenario?.id, scenario?.preview?.lockMs]);

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
  const timer = scenario.timer && typeof scenario.timer.duration === "number" ? scenario.timer : null;

  function handleAnswer(p) {
    if (result) return; // dedupe — timer + answer can race
    const ms = Date.now() - startedAtRef.current;
    const enriched = { ...p, ms };
    setResult(enriched);
    logReactionTime(playerId || "__anon__", {
      id: scenario.id, cat: scenario.cat, ms,
      ok: !!p.ok, reason: p.reason || (p.ok ? "ok" : "wrong"),
    });
    onAnswer?.(enriched);
  }

  function handleTimeout() {
    if (result) return;
    handleAnswer({ ok: false, reason: "timeout" });
  }

  // Result-card copy varies by failure mode so the teaching moment is
  // specific instead of generic.
  function resultMessage() {
    if (!result) return null;
    if (result.ok) return scenario.feedback.right;
    if (result.reason === "timeout") return "Time's up — read the play faster. " + (scenario.tip || "");
    if (result.reason === "intercepted") return "Intercepted! That pass crossed a defender. " + scenario.feedback.wrong;
    return scenario.feedback.wrong;
  }

  return (
    <div>
      {/* Prompt card */}
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

      {timer && !previewLocked && (
        <CountdownBar duration={timer.duration} frozen={!!result} onExpire={handleTimeout}/>
      )}
      {previewLocked && (
        <Card style={{ marginBottom: ".55rem", background: C.dimmest, border: `1px dashed ${C.border}` }}>
          <div style={{ fontSize: 11, color: C.gold, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase" }}>
            👀 Read the play
          </div>
          <div style={{ fontSize: 12, color: C.dimmer, marginTop: 2 }}>
            Scan the rink before you can act ({(scenario.preview.lockMs / 1000).toFixed(1)}s).
          </div>
        </Card>
      )}

      <RinkStage
        stage={scenario.stage}
        actors={scenario.actors}
        scanWindow={scenario.scanWindow}
        highlightIds={result?.intercepterId ? [result.intercepterId] : []}
      >
        {(svgPoint) => (
          <PrimComponent
            interaction={scenario.interaction}
            correct={scenario.correct}
            actors={scenario.actors}
            svgPoint={svgPoint}
            locked={!!result || previewLocked}
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
            color: result.ok ? C.green : C.red, marginBottom: ".4rem",
            display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: ".75rem",
          }}>
            <span>
              {result.ok ? "✓ Right read" : result.reason === "timeout" ? "✗ Time's up" : result.reason === "intercepted" ? "✗ Intercepted" : "✗ Off-target"}
            </span>
            {typeof result.ms === "number" && (
              <span style={{ color: C.dimmer, fontWeight: 700, fontSize: 11 }}>
                ⏱ {(result.ms / 1000).toFixed(2)}s
              </span>
            )}
          </div>
          <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.6 }}>{resultMessage()}</div>
          {scenario.tip && (
            <div style={{ marginTop: ".4rem", fontSize: 12, color: C.dimmer, fontStyle: "italic" }}>💡 {scenario.tip}</div>
          )}
        </Card>
      )}
    </div>
  );
}
