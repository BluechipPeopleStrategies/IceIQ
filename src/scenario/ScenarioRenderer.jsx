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
import { resolveTarget } from "./zones.js";
import { denorm } from "./schema.js";

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

// Static reveal of the geometric `correct` read, drawn over the board AFTER the
// player answers. Selection -> ring the correct actor(s); point -> mark the spot;
// path -> arrow from the `from` actor to the end. Derived from `correct`, never
// authored separately, so it can't contradict the question.
function RevealLayer({ scenario }) {
  const c = scenario.correct;
  if (!c) return null;
  const actorById = Object.fromEntries((scenario.actors || []).map(a => [a.id, a]));
  if (c.kind === "selection") {
    return (
      <>
        {(c.ids || []).map(id => {
          const a = actorById[id]; if (!a) return null;
          const p = denorm(a);
          return <circle key={id} cx={p.x} cy={p.y} r="20" fill="none"
            stroke="#22c55e" strokeWidth="2.6" strokeDasharray="4 3"/>;
        })}
      </>
    );
  }
  if (c.kind === "point") {
    let t; try { t = resolveTarget(c); } catch { return null; }
    const p = denorm(t);
    // Normalized-distance tolerance → ellipse (rx=tol·600, ry=tol·300), not a circle.
    return <ellipse cx={p.x} cy={p.y} rx={t.tolerance * 600} ry={t.tolerance * 300} fill="rgba(34,197,94,.22)"
      stroke="#22c55e" strokeWidth="1.8"/>;
  }
  if (c.kind === "path") {
    const from = actorById[scenario.interaction?.from];
    let t; try { t = resolveTarget(c.end); } catch { return null; }
    if (!from) return null;
    const a = denorm(from), b = denorm(t);
    const mx = (a.x + b.x) / 2, my = Math.min(a.y, b.y) - 24;
    return (
      <>
        <defs><marker id="mcrev" markerWidth="5" markerHeight="5" refX="2.4" refY="2.5" orient="auto">
          <path d="M0,0 L5,2.5 L0,5 Z" fill="#C9A24B"/></marker></defs>
        <path d={`M${a.x},${a.y} Q ${mx},${my} ${b.x},${b.y}`} fill="none"
          stroke="#C9A24B" strokeWidth="2.6" strokeDasharray="5 3"
          markerEnd="url(#mcrev)" vectorEffect="non-scaling-stroke"/>
      </>
    );
  }
  return null;
}

function BoardMC({ scenario, playerId, onAnswer }) {
  const [picked, setPicked] = useState(null);
  const startedAtRef = useRef(Date.now());
  const mc = scenario.mc;
  const stem = mc.stem || scenario.interaction?.prompt || "What is the best play?";

  function pick(i) {
    if (picked != null) return;
    setPicked(i);
    const ok = i === mc.ok;
    const ms = Date.now() - startedAtRef.current;
    logReactionTime(playerId || "__anon__", { id: scenario.id, cat: scenario.cat, ms, ok, reason: ok ? "ok" : "wrong" });
    onAnswer?.({ ok, reason: ok ? "ok" : "wrong", ms, picked: i });
  }

  return (
    <div>
      <Card style={{ marginBottom: ".75rem", background: C.purpleDim, border: `1px solid ${C.purpleBorder}` }}>
        <div style={{ fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "#5BA4E8", fontWeight: 800, marginBottom: ".5rem" }}>
          📋 Read the play{scenario.cat ? ` · ${scenario.cat}` : ""}
        </div>
        <div style={{ fontSize: 15, lineHeight: 1.6, color: C.white, fontWeight: 500 }}>{stem}</div>
      </Card>

      <RinkStage stage={scenario.stage} actors={scenario.actors} levels={scenario.levels}>
        {() => (picked != null ? <RevealLayer scenario={scenario}/> : null)}
      </RinkStage>

      <div style={{ display: "grid", gap: ".5rem", marginTop: ".6rem" }}>
        {mc.opts.map((opt, i) => {
          const isCorrect = picked != null && i === mc.ok;
          const isWrongPick = picked === i && i !== mc.ok;
          const bg = isCorrect ? "rgba(34,197,94,.12)" : isWrongPick ? "rgba(239,68,68,.10)" : C.dimmest;
          const bd = isCorrect ? "#22c55e" : isWrongPick ? "#ef4444" : C.border;
          return (
            <button key={i} onClick={() => pick(i)} disabled={picked != null}
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

  const effectiveMode = mode || (scenario.mc ? "mc" : "interactive");

  const primitive = getPrimitive(scenario.interaction.kind);
  if (!primitive) {
    return (
      <Card style={{ background: C.redDim, border: `1px solid ${C.redBorder}` }}>
        <div style={{ fontWeight: 800, color: C.red }}>Unknown interaction kind: {scenario.interaction.kind}</div>
      </Card>
    );
  }

  if (effectiveMode === "mc" && scenario.mc) {
    return <BoardMC scenario={scenario} playerId={playerId} onAnswer={onAnswer}/>;
  }

  const PrimComponent = primitive.Component;
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
  const hint = kind === "path" ? (VERB_HINT[verb] || "Drag from the highlighted player.") : (KIND_HINT[kind] || "");
  // Actors the primitive renders itself (place = draggable tokens) — hide
  // them from the stage's static layer so they aren't drawn twice.
  const interactiveIds = primitive.interactiveActorIds ? primitive.interactiveActorIds(scenario.interaction) : [];
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
        levels={scenario.levels}
        scanWindow={scenario.scanWindow}
        highlightIds={result?.intercepterId ? [result.intercepterId] : []}
        hiddenIds={interactiveIds}
      >
        {(svgPoint) => (
          <PrimComponent
            interaction={scenario.interaction}
            correct={scenario.correct}
            actors={scenario.actors}
            svgPoint={svgPoint}
            view={scenario.stage?.view}
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
