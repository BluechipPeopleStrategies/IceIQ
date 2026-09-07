// ScenarioRenderer — top-level entry point. Validates, renders prompt +
// optional countdown timer + a shared 3D rink, delegates the interactive layer
// to the registered primitive's unchanged scorer. Tracks visible decision time.

import { useEffect, useRef, useState } from "react";
import MultiStepPlayer from "./MultiStepPlayer.jsx";
import { validateScenario } from "./schema.js";
import Scenario3DInteraction from "./Scenario3DInteraction.jsx";
import { scenarioPrompt } from "./scenario3DAdapter.js";
import { getPrimitive } from "./registry.js";
import { logReactionTime } from "../utils/reactionTime.js";
import { ttsSupported, speakParts, stopSpeaking, getReadAloud } from "../speak.js";
import { C, FONT, Card } from "../shared.jsx";

const VERB_BADGE = {
  skate:    { icon: "⛸️", label: "SKATE",     color: "#5BA4E8" },
  carry:    { icon: "🏒", label: "CARRY",     color: "#5BA4E8" },
  pass:     { icon: "🎯", label: "PASS",      color: "#1D9E75" },
  shoot:    { icon: "💥", label: "SHOOT",     color: "#E24B4A" },
  screen:   { icon: "🛡️", label: "SCREEN",    color: "#7C3AED" },
  check:    { icon: "💪", label: "CHECK",     color: "#A32D2D" },
  backcheck:{ icon: "↩️", label: "BACKCHECK", color: "#5BA4E8" },
};

// Count visible, interactive rink time only. Loading, context loss and retries
// pause this clock without resetting an answer or giving a fresh timed attempt.
function useAvailableClock(active) {
  const accumulated = useRef(0), started = useRef(null);
  const [elapsed, setElapsed] = useState(0);
  const read = () => accumulated.current + (started.current == null ? 0 : Date.now() - started.current);
  useEffect(() => {
    if (!active) return undefined;
    started.current = Date.now();
    const interval = setInterval(() => setElapsed(read()), 50);
    return () => { accumulated.current = read(); started.current = null; clearInterval(interval); };
  }, [active]);
  return { elapsed, read };
}
function CountdownBar({ duration, elapsed, frozen }) {
  const remaining = Math.max(0, duration - elapsed);
  return <div style={{ marginBottom: '.6rem', color: C.gold, fontSize: 12 }}>
    <span>{(remaining / 1000).toFixed(1)}s{frozen ? ' · paused' : ''}</span>
    <div style={{ height: 5, borderRadius: 4, background: C.dimmest, marginTop: 5 }}><div style={{ height: '100%', width: `${Math.max(0, remaining / duration * 100)}%`, background: C.gold, borderRadius: 4 }}/></div>
  </div>;
}

function BoardMC({ scenario, playerId, onAnswer }) {
  const [picked, setPicked] = useState(null);
  const [ready, setReady] = useState(false);
  const availableNow = useRef(false);
  const availability = value => { availableNow.current = value; setReady(value); };
  const submitted = useRef(false);
  const clock = useAvailableClock(ready && picked == null);
  const mc = scenario.mc;
  const stem = mc.stem || scenario.interaction?.prompt || "What is the best play?";

  // Read the stem, then each lettered choice, aloud (browser TTS). Auto-fires
  // on a new question when "read aloud" is on; the 🔊 button replays on demand.
  function readNow() {
    speakParts([stem, ...mc.opts.map((o, i) => `${"ABCD"[i]}. ${o}`)]);
  }
  useEffect(() => {
    if (ttsSupported() && getReadAloud()) {
      speakParts([stem, ...mc.opts.map((o, i) => `${"ABCD"[i]}. ${o}`)]);
    }
    return () => stopSpeaking();
  }, [scenario.id]);

  function pick(i) {
    if (picked != null || submitted.current || !availableNow.current) return;
    submitted.current = true;
    setPicked(i);
    const ok = i === mc.ok;
    const ms = clock.read();
    logReactionTime(playerId || "__anon__", { id: scenario.id, cat: scenario.cat, ms, ok, reason: ok ? "ok" : "wrong" });
    onAnswer?.({ ok, reason: ok ? "ok" : "wrong", ms, picked: i });
  }

  return (
    <div>
      <Card style={{ marginBottom: ".75rem", background: C.purpleDim, border: `1px solid ${C.purpleBorder}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: ".5rem" }}>
          <div style={{ fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "#5BA4E8", fontWeight: 800 }}>
            📋 Read the play{scenario.cat ? ` · ${scenario.cat}` : ""}
          </div>
          {ttsSupported() && getReadAloud() && (
            <button onClick={readNow} title="Read the question aloud" aria-label="Read the question aloud"
              style={{ background: "transparent", border: "none", color: "#5BA4E8", fontSize: 16, cursor: "pointer", lineHeight: 1, padding: 0 }}>🔊</button>
          )}
        </div>
        <div style={{ fontSize: 15, lineHeight: 1.6, color: C.white, fontWeight: 500 }}>{stem}</div>
      </Card>

      <Scenario3DInteraction scenario={scenario} interactive={false} revealed={picked != null} onAvailabilityChange={availability}/>

      <div style={{ display: "grid", gap: ".5rem", marginTop: ".6rem" }}>
        {mc.opts.map((opt, i) => {
          const isCorrect = picked != null && i === mc.ok;
          const isWrongPick = picked === i && i !== mc.ok;
          const bg = isCorrect ? "rgba(34,197,94,.12)" : isWrongPick ? "rgba(239,68,68,.10)" : C.dimmest;
          const bd = isCorrect ? "#22c55e" : isWrongPick ? "#ef4444" : C.border;
          return (
            <button key={i} onClick={() => pick(i)} disabled={picked != null || !ready}
              style={{ display: "flex", gap: ".6rem", alignItems: "flex-start", textAlign: "left",
                background: bg, border: `1.5px solid ${bd}`, borderRadius: 12, padding: ".85rem 1rem",
                color: C.white, fontFamily: FONT.body, fontSize: 14, lineHeight: 1.5, cursor: picked != null ? "default" : "pointer" }}>
              <span style={{ fontWeight: 800, color: C.dimmer }}>{"ABCD"[i]}</span>
              <span style={{ flex: 1 }}>{opt}</span>
              {isCorrect && <span style={{ color: "#22c55e", fontWeight: 800 }}>✓</span>}
            </button>
          );
        })}
      </div>

      {picked != null && (
        <Card style={{ marginTop: ".6rem", background: picked === mc.ok ? "rgba(34,197,94,.08)" : "rgba(239,68,68,.08)",
          border: `1px solid ${picked === mc.ok ? "rgba(34,197,94,.3)" : "rgba(239,68,68,.3)"}` }}>
          <div style={{ fontWeight: 800, color: picked === mc.ok ? C.green : C.red, marginBottom: ".35rem", fontSize: 12 }}>
            {picked === mc.ok ? "✓ Right read" : "✗ Not the best read"}
          </div>
          <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.6 }}>
            {picked === mc.ok ? scenario.feedback.right : scenario.feedback.wrong}
          </div>
          {scenario.tip && <div style={{ marginTop: ".4rem", fontSize: 12, color: C.dimmer, fontStyle: "italic" }}>💡 {scenario.tip}</div>}
        </Card>
      )}
    </div>
  );
}

export default function ScenarioRenderer({ scenario, playerId, mode, onAnswer }) {
  if ((Array.isArray(scenario?.steps) && scenario.steps.length) || (scenario?.nodes && scenario?.entry)) {
    return <MultiStepPlayer key={scenario.id} scenario={scenario} playerId={playerId} onAnswer={onAnswer} />;
  }
  return <FlatScenario key={`${scenario?.id}:${mode || 'default'}`} {...{ scenario, playerId, mode, onAnswer }}/>;
}

function FlatScenario({ scenario, playerId, mode, onAnswer }) {
  const [result, setResult] = useState(null);
  const [ready, setReady] = useState(false);
  const availableNow = useRef(false);
  const availability = value => { availableNow.current = value; setReady(value); };
  const submitted = useRef(false);
  const clock = useAvailableClock(ready && !result);
  const previewMs = Math.max(0, scenario?.preview?.lockMs || 0);
  const previewLocked = clock.elapsed < previewMs;
  const timer = scenario?.timer && typeof scenario.timer.duration === 'number' ? scenario.timer : null;
  const decisionMs = Math.max(0, clock.elapsed - previewMs);
  useEffect(() => {
    if (ready && !previewLocked && !result && timer && decisionMs >= timer.duration) handleTimeout();
  }, [ready, previewLocked, result, timer?.duration, decisionMs]);

  const validation = validateScenario(scenario);

  if (!validation.ok) {
    return (
      <Card style={{ background: C.redDim, border: `1px solid ${C.redBorder}` }}>
        <div style={{ fontWeight: 800, color: C.red, marginBottom: 4 }}>This play is not ready yet.</div>
        <p style={{ color: C.dim }}>Choose another situation and keep practising.</p>
      </Card>
    );
  }

  const effectiveMode = mode || (scenario.mc ? "mc" : "interactive");

  const primitive = getPrimitive(scenario.interaction.kind);
  if (!primitive) {
    return (
      <Card style={{ background: C.redDim, border: `1px solid ${C.redBorder}` }}>
        <div style={{ fontWeight: 800, color: C.red }}>This question is not ready yet. Choose another situation.</div>
      </Card>
    );
  }

  if (effectiveMode === "mc" && scenario.mc) {
    return <BoardMC scenario={scenario} playerId={playerId} onAnswer={onAnswer}/>;
  }

  const kind = scenario.interaction.kind;
  const verb = scenario.interaction.verb || "skate";
  const KIND_BADGE = {
    place:     { icon: "✋", label: "PLACE",     color: "#7C3AED" },
    point:     { icon: "📍", label: "PICK SPOT", color: "#1D9E75" },
    selection: { icon: "👆", label: "PICK",      color: "#5BA4E8" },
    sequence:  { icon: "🔢", label: "ORDER",     color: "#C9A24B" },
  };
  const badge = kind === "path" ? (VERB_BADGE[verb] || VERB_BADGE.skate) : (KIND_BADGE[kind] || VERB_BADGE.skate);
  const KIND_HINT = {
    place:     "Drag each highlighted player to where they belong, then tap Check.",
    point:     "Tap the spot on the rink.",
    selection: "Tap the player(s) you'd choose.",
    sequence:  "Tap the players in the right order.",
  };
  const hint = kind === "path" ? "Add points on the ice to show the route, then tap Check route." : (KIND_HINT[kind] || "");

  function handleAnswer(p) {
    if (submitted.current || result || !availableNow.current || previewLocked) return;
    submitted.current = true;
    const ms = Math.max(0, clock.read() - previewMs);
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
    if (result.reason === "timeout") return "Time's up. Look at the play again. " + (scenario.tip || "");
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
          {scenarioPrompt(scenario)}
        </div>
        <div style={{ fontSize: 11, color: C.dimmer, lineHeight: 1.5, fontStyle: "italic" }}>{hint}</div>
      </Card>

      {timer && !previewLocked && (
        <CountdownBar duration={timer.duration} elapsed={decisionMs} frozen={!!result || !ready}/>
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

      <Scenario3DInteraction scenario={scenario} locked={!!result || previewLocked} revealed={!!result} onAnswer={handleAnswer} onAvailabilityChange={availability}/>


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
