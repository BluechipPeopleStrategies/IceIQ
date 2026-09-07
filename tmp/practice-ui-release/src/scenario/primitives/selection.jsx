// Selection primitive — user taps one or more candidates from a fixed
// set. Covers "tap the open teammate", "tap the player making the
// mistake", "select all that apply" — the full multi-tap / pov-pick /
// hot-spots family in the legacy engine.
//
// Visual contract:
//   - Each candidate gets a pulsing dashed ring on idle ("tap me").
//   - Single-pick scenarios auto-submit on tap.
//   - Multi-pick scenarios (correct.ids.length > 1) toggle on tap and
//     show a Submit button at the bottom.
//   - On reveal: chosen-correct is solid green, chosen-wrong is solid
//     red, missed-correct gets a green dashed glow so the player sees
//     what they missed.

import { useEffect, useMemo, useState } from "react";
import { denorm, denormR } from "../schema.js";
import { scoreSelection } from "./selection-scorer.js";
import { C, FONT } from "../../shared.jsx";

const CANDIDATE_RING_NORM_RADIUS = 0.040;

export function SelectionPrimitive({ interaction, correct, actors, locked, onAnswer }) {
  const [picked, setPicked] = useState(() => new Set());
  const [score, setScore] = useState(null);

  // Reset internal state when the question id (or correct shape) changes.
  useEffect(() => { setPicked(new Set()); setScore(null); }, [interaction?.prompt]);

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
  const isMulti = correctIds.length > 1;
  const finalLocked = !!score || !!locked;

  function tap(actorId) {
    if (finalLocked) return;
    if (isMulti) {
      const next = new Set(picked);
      if (next.has(actorId)) next.delete(actorId);
      else next.add(actorId);
      setPicked(next);
      return;
    }
    // Single-pick: tap → submit.
    const result = scoreSelection([actorId], correctIds, {
      ordered: interaction.order === "ordered",
    });
    setScore(result);
    setPicked(new Set([actorId]));
    onAnswer?.({ ok: result.ok, picked: [actorId], missed: result.missed, wrong: result.wrong });
  }

  function submit() {
    if (finalLocked || picked.size === 0) return;
    const arr = [...picked];
    const result = scoreSelection(arr, correctIds, {
      ordered: interaction.order === "ordered",
    });
    setScore(result);
    onAnswer?.({ ok: result.ok, picked: arr, missed: result.missed, wrong: result.wrong });
  }

  return (
    <>
      <g style={{ touchAction: "none" }}>
        <CandidateRings
          candidates={candidates}
          picked={picked}
          score={score}
          correctIds={correctIds}
          onTap={tap}
          locked={finalLocked}
        />
      </g>
      {/* Submit button is rendered as a foreignObject so it sits inside
          the SVG flow but uses normal DOM input. Only for multi-pick. */}
      {isMulti && !finalLocked && picked.size > 0 && (
        <foreignObject x="50%" y="280" width="100" height="20" transform="translate(-50, 0)">
          <div xmlns="http://www.w3.org/1999/xhtml"
            style={{ display: "flex", justifyContent: "center" }}>
            <button onClick={submit}
              style={{
                background: C.gold, color: C.bg,
                border: "none", borderRadius: 999,
                padding: ".25rem .9rem", fontSize: 11, fontWeight: 800,
                fontFamily: FONT.body, cursor: "pointer",
              }}>
              Submit ({picked.size})
            </button>
          </div>
        </foreignObject>
      )}
    </>
  );
}

function CandidateRings({ candidates, picked, score, correctIds, onTap, locked }) {
  return (
    <>
      {candidates.map(actor => {
        const px = denorm(actor);
        const r = denormR(CANDIDATE_RING_NORM_RADIUS);
        const wasPicked = picked.has(actor.id);
        const isRight = correctIds.includes(actor.id);
        // Visual state — driven by reveal once score lands, by hover/idle
        // before that.
        let ringFill, ringStroke, ringDash;
        if (score) {
          if (isRight && wasPicked) {
            ringFill = "rgba(34,197,94,0.22)";
            ringStroke = "#22c55e";
            ringDash = "none";
          } else if (isRight && !wasPicked) {
            // Missed-correct — show what they should have picked.
            ringFill = "rgba(34,197,94,0.10)";
            ringStroke = "#22c55e";
            ringDash = "5 3";
          } else if (!isRight && wasPicked) {
            ringFill = "rgba(239,68,68,0.18)";
            ringStroke = "#ef4444";
            ringDash = "none";
          } else {
            ringFill = "transparent";
            ringStroke = "rgba(255,255,255,0.18)";
            ringDash = "none";
          }
        } else if (wasPicked) {
          // Multi-pick mid-selection — picked but not yet submitted.
          ringFill = "rgba(91,164,232,0.22)";
          ringStroke = "#5BA4E8";
          ringDash = "none";
        } else {
          ringFill = "rgba(91,164,232,0.10)";
          ringStroke = "#5BA4E8";
          ringDash = "5 3";
        }
        return (
          <g key={actor.id} transform={`translate(${px.x},${px.y})`}
            style={{ cursor: locked ? "default" : "pointer" }}
            onClick={() => onTap(actor.id)}
            onTouchEnd={(e) => { e.preventDefault(); onTap(actor.id); }}>
            <circle cx="0" cy="0" r={r}
              fill={ringFill}
              stroke={ringStroke}
              strokeWidth="1.6"
              strokeDasharray={ringDash}>
              {!score && !wasPicked && (
                <>
                  <animate attributeName="r" values={`${r};${r + 3};${r}`} dur="1.6s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="1;0.55;1" dur="1.6s" repeatCount="indefinite"/>
                </>
              )}
            </circle>
            {score && isRight && wasPicked && (
              <text x="0" y={-r - 4} textAnchor="middle" fill="#22c55e"
                fontSize="11" fontWeight="800" style={{ pointerEvents: "none" }}>✓</text>
            )}
            {score && !isRight && wasPicked && (
              <text x="0" y={-r - 4} textAnchor="middle" fill="#ef4444"
                fontSize="11" fontWeight="800" style={{ pointerEvents: "none" }}>✗</text>
            )}
          </g>
        );
      })}
    </>
  );
}

export const selectionPrimitive = {
  kind: "selection",
  Component: SelectionPrimitive,
  score: scoreSelection,
};
