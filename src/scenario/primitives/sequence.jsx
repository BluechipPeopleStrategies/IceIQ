// Sequence primitive — user taps a fixed set of actors IN ORDER. Each
// tap stamps a numbered badge so the chosen sequence is visible. The
// scenario is correct when the picked order exactly matches the
// expected order in correct.ids.
//
// Conceptually this is "selection with order=ordered + numbered UI."
// Schema kept separate (kind:"sequence") so the LLM and the registry
// can route the right rendering and the right validators.

import { useEffect, useMemo, useState } from "react";
import { denorm, denormR } from "../schema.js";
import { scoreSequence } from "./sequence-scorer.js";
import { C, FONT } from "../../shared.jsx";

const CANDIDATE_RING_NORM_RADIUS = 0.040;

export function SequencePrimitive({ interaction, correct, actors, locked, onAnswer }) {
  const [order, setOrder] = useState([]); // array of actor ids in tap order
  const [score, setScore] = useState(null);

  useEffect(() => { setOrder([]); setScore(null); }, [interaction?.prompt]);

  const candidates = useMemo(() => {
    const fromIds = Array.isArray(interaction?.from) ? interaction.from : [];
    return fromIds
      .map(id => actors.find(a => a.id === id))
      .filter(Boolean);
  }, [actors, interaction?.from]);

  const correctIds = useMemo(
    () => Array.isArray(correct?.ids) ? correct.ids : [],
    [correct?.ids],
  );
  const expected = correctIds.length;
  const finalLocked = !!score || !!locked;

  function tap(actorId) {
    if (finalLocked) return;
    if (order.includes(actorId)) return; // can't double-tap
    const next = [...order, actorId];
    setOrder(next);
    if (next.length >= expected) {
      const result = scoreSequence(next, correctIds);
      setScore(result);
      onAnswer?.({ ok: result.ok, picked: next, missed: result.missed, wrong: result.wrong });
    }
  }

  function reset() {
    if (finalLocked) return;
    setOrder([]);
  }

  return (
    <>
      <g style={{ touchAction: "none" }}>
        {candidates.map(actor => {
          const px = denorm(actor);
          const r = denormR(CANDIDATE_RING_NORM_RADIUS);
          const orderIdx = order.indexOf(actor.id);          // -1 if not picked
          const expectedIdx = correctIds.indexOf(actor.id);  // -1 if not in correct
          let ringFill, ringStroke, ringDash;
          if (score) {
            // Reveal: green if your tap matched the expected slot, red otherwise.
            if (orderIdx >= 0 && orderIdx === expectedIdx) {
              ringFill = "rgba(34,197,94,.22)"; ringStroke = "#22c55e"; ringDash = "none";
            } else if (orderIdx >= 0) {
              ringFill = "rgba(239,68,68,.18)"; ringStroke = "#ef4444"; ringDash = "none";
            } else if (expectedIdx >= 0) {
              ringFill = "rgba(34,197,94,.08)"; ringStroke = "#22c55e"; ringDash = "5 3";
            } else {
              ringFill = "transparent"; ringStroke = "rgba(255,255,255,0.18)"; ringDash = "none";
            }
          } else if (orderIdx >= 0) {
            ringFill = "rgba(91,164,232,.22)"; ringStroke = "#5BA4E8"; ringDash = "none";
          } else {
            ringFill = "rgba(91,164,232,.08)"; ringStroke = "#5BA4E8"; ringDash = "5 3";
          }
          return (
            <g key={actor.id} transform={`translate(${px.x},${px.y})`}
              style={{ cursor: finalLocked ? "default" : "pointer" }}
              onClick={() => tap(actor.id)}
              onTouchEnd={(e) => { e.preventDefault(); tap(actor.id); }}>
              <circle cx="0" cy="0" r={r}
                fill={ringFill} stroke={ringStroke}
                strokeWidth="1.6" strokeDasharray={ringDash}>
                {!score && orderIdx < 0 && (
                  <>
                    <animate attributeName="r" values={`${r};${r + 3};${r}`} dur="1.6s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" values="1;0.55;1" dur="1.6s" repeatCount="indefinite"/>
                  </>
                )}
              </circle>
              {/* Order-number badge — sits to the side of the marker. */}
              {orderIdx >= 0 && (
                <g transform={`translate(${r * 0.85},${-r * 0.85})`} style={{ pointerEvents: "none" }}>
                  <circle cx="0" cy="0" r="9" fill="#0b1220" stroke="#fff" strokeWidth="1.4"/>
                  <text x="0" y="3.5" textAnchor="middle" fill="#fff"
                    fontSize="10" fontWeight="800">{orderIdx + 1}</text>
                </g>
              )}
              {/* Expected badge — shown after reveal on missed-correct items. */}
              {score && orderIdx < 0 && expectedIdx >= 0 && (
                <g transform={`translate(${r * 0.85},${-r * 0.85})`} style={{ pointerEvents: "none" }}>
                  <circle cx="0" cy="0" r="9" fill="rgba(34,197,94,.85)" stroke="#fff" strokeWidth="1.4"/>
                  <text x="0" y="3.5" textAnchor="middle" fill="#0b1220"
                    fontSize="10" fontWeight="800">{expectedIdx + 1}</text>
                </g>
              )}
            </g>
          );
        })}
      </g>
      {/* Progress + reset chip — only visible mid-sequence. */}
      {!finalLocked && order.length > 0 && (
        <foreignObject x="50%" y="278" width="180" height="22" transform="translate(-90, 0)">
          <div xmlns="http://www.w3.org/1999/xhtml"
            style={{ display: "flex", justifyContent: "center", gap: ".5rem" }}>
            <div style={{
              padding: ".2rem .65rem", background: "rgba(11,18,32,.95)",
              border: `1px solid ${C.border}`, borderRadius: 999,
              fontSize: 10, fontWeight: 800, letterSpacing: ".05em",
              color: C.dim, fontFamily: FONT.body,
            }}>
              {order.length} / {expected}
            </div>
            <button onClick={reset}
              style={{
                background: "transparent", color: C.dimmer,
                border: `1px solid ${C.border}`, borderRadius: 999,
                padding: ".15rem .65rem", fontSize: 10, fontWeight: 700,
                fontFamily: FONT.body, cursor: "pointer",
              }}>↺ Reset</button>
          </div>
        </foreignObject>
      )}
    </>
  );
}

export const sequencePrimitive = {
  kind: "sequence",
  Component: SequencePrimitive,
  score: scoreSequence,
};
