import React from "react";
import ReviewBoard from "./ReviewBoard.jsx";
import { boardHash } from "./reviewCore.js";
import { C, FONT } from "../shared.jsx";

const VERDICT_LABEL = { keep: "KEEP", revise: "REVISE", retire: "RETIRE" };
const verdictBtn = { flex: 1, padding: ".9rem 0", borderRadius: 10, border: "1px solid", fontWeight: 700, fontFamily: FONT.body, cursor: "pointer", fontSize: ".95rem" };

// Shared single-board editor used by BOTH the #triage deck and the #browse grid.
// Presentation + callbacks only — it does not own the review queue. `children`
// renders between the verdict buttons and the coach panel (the deck slots its
// Prev/Next nav there).
export default function BoardReviewPanel({ scenario, coach, logs = [], savedVerdict, note, onNote, onVerdict, children }) {
  const coachStale = coach && coach.board_hash && coach.board_hash !== boardHash(scenario);
  const suggests = (v) => !savedVerdict && coach && coach.verdict === v;
  const vStyle = (v, dim, border, color) => ({
    ...verdictBtn, background: dim, color,
    borderColor: savedVerdict === v ? color : (suggests(v) ? color : border),
    borderStyle: suggests(v) ? "dashed" : "solid",
  });

  return (
    <>
      <ReviewBoard scenario={scenario} />

      {logs.length > 0 && (
        <div style={{ marginTop: ".4rem", padding: ".5rem .6rem", borderRadius: 8, background: C.bgCard, border: `1px dashed ${C.border}` }}>
          <div style={{ fontSize: ".72rem", color: C.dimmer, marginBottom: ".2rem" }}>Previously incorporated</div>
          {logs.map((l, k) => (
            <div key={k} style={{ fontSize: ".76rem", color: C.dim }}>· (iter {l.iteration}) {l.feedback}{l.change ? ` → ${l.change}` : ""}</div>
          ))}
        </div>
      )}

      <input value={note} onChange={e => onNote(e.target.value)} placeholder="note (use your keyboard 🎤 to speak)…"
        style={{ width: "100%", margin: ".6rem 0", padding: ".6rem", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bgCard, color: C.white, fontFamily: FONT.body, boxSizing: "border-box" }} />

      <div style={{ display: "flex", gap: ".5rem", marginBottom: ".5rem" }}>
        <button onClick={() => onVerdict("keep")} style={vStyle("keep", C.greenDim, C.greenBorder, C.green)}>KEEP{savedVerdict === "keep" ? " ✓" : suggests("keep") ? " ·sugg" : ""}</button>
        <button onClick={() => onVerdict("revise")} style={vStyle("revise", C.goldDim, C.goldBorder, C.gold)}>REVISE{savedVerdict === "revise" ? " ✓" : suggests("revise") ? " ·sugg" : ""}</button>
        <button onClick={() => onVerdict("retire")} style={vStyle("retire", C.redDim, C.redBorder, C.red)}>RETIRE{savedVerdict === "retire" ? " ✓" : suggests("retire") ? " ·sugg" : ""}</button>
      </div>

      {children}

      {coach && (
        <div style={{ marginTop: "1.4rem", padding: ".5rem .6rem", borderRadius: 8, background: C.bgCard, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: ".78rem", color: C.dim }}>
            🤖 Coaches: <b style={{ color: C.white }}>{VERDICT_LABEL[coach.verdict] || coach.verdict}</b>
            {coach.confidence != null ? ` · ${Math.round(coach.confidence * 100)}%` : ""}{coach.convened ? " · room" : ""}
            {coachStale ? " · ⚠ out of date" : ""}
          </div>
          {coach.notes && <div style={{ fontSize: ".78rem", color: C.dim, marginTop: ".2rem" }}>{coach.notes}</div>}
        </div>
      )}
    </>
  );
}
