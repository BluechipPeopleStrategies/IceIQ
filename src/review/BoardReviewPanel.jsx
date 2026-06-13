import React, { useState } from "react";
import ReviewBoard from "./ReviewBoard.jsx";
import { boardHash } from "./reviewCore.js";
import { iterationHeadline, groupIterations } from "./browseCore.js";
import { C, FONT } from "../shared.jsx";

const VERDICT_LABEL = { keep: "KEEP", revise: "REVISE", retire: "RETIRE" };
const verdictBtn = { flex: 1, padding: ".9rem 0", borderRadius: 10, border: "1px solid", fontWeight: 700, fontFamily: FONT.body, cursor: "pointer", fontSize: ".95rem" };

// Compact Mountain-Time date for a log row, e.g. "Jun 11". Empty on missing/invalid.
function fmtLogDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-CA", { month: "short", day: "numeric", timeZone: "America/Edmonton" });
}

// One collapsed accordion row in "Previously incorporated" = one change event
// (an iteration). Collapsed: date + one-line headline (the change). Click to reveal
// the full change plus the feedback that drove it, per source (owner + coach), and a
// meta line. Caret glyph signals state (not color — colorblind-safe).
function IterationRow({ group }) {
  const [open, setOpen] = useState(false);
  const date = fmtLogDate(group.created_at);
  const headline = iterationHeadline({ change: group.change, feedback: group.sources[0]?.feedback });
  const meta = [
    group.iteration != null ? `iter ${group.iteration}` : null,
    group.node ? `node ${group.node}` : null,
  ].filter(Boolean).join(" · ");
  return (
    <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: ".25rem", marginTop: ".25rem" }}>
      <div onClick={() => setOpen(o => !o)} style={{ display: "flex", gap: ".4rem", alignItems: "baseline", cursor: "pointer", fontSize: ".76rem", color: C.dim }}>
        <span style={{ color: C.dimmer }}>{open ? "▾" : "▸"}</span>
        {date && <span style={{ color: C.dimmer, flexShrink: 0 }}>{date}</span>}
        <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{headline}</span>
      </div>
      {open && (
        <div style={{ fontSize: ".74rem", color: C.dim, margin: ".25rem 0 .35rem 1rem", lineHeight: 1.4 }}>
          {group.change && <div><span style={{ color: C.dimmer }}>Change:</span> {group.change}</div>}
          {group.sources.map((s, i) => (
            <div key={i} style={{ marginTop: ".15rem" }}>
              <span style={{ color: C.dimmer, textTransform: "capitalize" }}>{s.source || "note"}:</span> {s.feedback}
            </div>
          ))}
          {meta && <div style={{ color: C.dimmer, marginTop: ".15rem" }}>{meta}</div>}
        </div>
      )}
    </div>
  );
}

// Shared single-board editor used by BOTH the #triage deck and the #browse grid.
// Presentation + callbacks only — it does not own the review queue. `children`
// renders between the verdict buttons and the coach panel (the deck slots its
// Prev/Next nav there).
export default function BoardReviewPanel({ scenario, coach, logs = [], savedVerdict, note, onNote, onVerdict, children }) {
  const coachStale = coach && coach.board_hash && coach.board_hash !== boardHash(scenario);
  const vStyle = (v, dim, border, color) => ({
    ...verdictBtn, background: dim, color,
    borderColor: savedVerdict === v ? color : border,
    borderStyle: "solid",
  });

  return (
    <>
      <ReviewBoard scenario={scenario} />

      {logs.length > 0 && (
        <div style={{ marginTop: ".4rem", padding: ".5rem .6rem", borderRadius: 8, background: C.bgCard, border: `1px dashed ${C.border}` }}>
          <div style={{ fontSize: ".72rem", color: C.dimmer, marginBottom: ".2rem" }}>Previously incorporated</div>
          {groupIterations(logs).map((g, k) => <IterationRow key={g.iteration ?? g.created_at ?? k} group={g} />)}
        </div>
      )}

      <input value={note} onChange={e => onNote(e.target.value)} placeholder="note (use your keyboard 🎤 to speak)…"
        style={{ width: "100%", margin: ".6rem 0", padding: ".6rem", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bgCard, color: C.white, fontFamily: FONT.body, boxSizing: "border-box" }} />

      <div style={{ display: "flex", gap: ".5rem", marginBottom: ".5rem" }}>
        <button onClick={() => onVerdict("keep")} style={vStyle("keep", C.greenDim, C.greenBorder, C.green)}>KEEP{savedVerdict === "keep" ? " ✓" : ""}</button>
        <button onClick={() => onVerdict("revise")} style={vStyle("revise", C.goldDim, C.goldBorder, C.gold)}>REVISE{savedVerdict === "revise" ? " ✓" : ""}</button>
        <button onClick={() => onVerdict("retire")} style={vStyle("retire", C.redDim, C.redBorder, C.red)}>RETIRE{savedVerdict === "retire" ? " ✓" : ""}</button>
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
