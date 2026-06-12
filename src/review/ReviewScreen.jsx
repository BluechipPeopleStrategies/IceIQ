import React, { useEffect, useState } from "react";
import ReviewBoard from "./ReviewBoard.jsx";
import { loadReviewScenarios } from "./reviewData.js";
import { boardHash } from "./reviewCore.js";
import { enqueueReview, flushQueue, getReviewedIds, syncServerReviews } from "./reviewQueue.js";
import { getSession } from "../supabase.js";
import { C, FONT } from "../shared.jsx";

const OWNERS = (import.meta.env.VITE_REVIEW_OWNERS || "")
  .split(",").map(s => s.trim().toLowerCase()).filter(Boolean);

function Centered({ children }) {
  return <div style={{ minHeight: "100vh", background: C.bg, color: C.white, fontFamily: FONT.body, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "1rem", gap: ".6rem" }}>{children}</div>;
}
const btn = { padding: ".5rem 1rem", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bgCard, color: C.white, cursor: "pointer" };
const btnGhost = { padding: ".3rem .6rem", borderRadius: 6, border: "none", background: "transparent", color: C.dim, fontSize: ".8rem", cursor: "pointer" };
const verdictBtn = { flex: 1, padding: ".9rem 0", borderRadius: 10, border: "1px solid", fontWeight: 700, fontFamily: FONT.body, cursor: "pointer", fontSize: ".95rem" };

export default function ReviewScreen({ onBack }) {
  const [status, setStatus] = useState("loading"); // loading | denied | empty | ready
  const [list, setList] = useState([]);
  const [i, setI] = useState(0);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      const session = await getSession();
      const email = session?.user?.email?.toLowerCase();
      if (!email || (OWNERS.length && !OWNERS.includes(email))) { if (alive) setStatus("denied"); return; }
      await syncServerReviews();
      const scenarios = await loadReviewScenarios(getReviewedIds());
      if (!alive) return;
      setList(scenarios);
      setStatus(scenarios.length ? "ready" : "empty");
    })();
    return () => { alive = false; };
  }, []);

  const current = list[i];
  async function verdict(v) {
    if (!current) return;
    enqueueReview({ scenario_id: current.id, verdict: v, note: note.trim(), board_hash: boardHash(current) });
    setNote("");
    setI(n => Math.min(n + 1, list.length));
    setPending(await flushQueue());
  }

  if (status === "loading") return <Centered>Loading review deck…</Centered>;
  if (status === "denied") return <Centered><div>Not authorized.</div><button onClick={onBack} style={btn}>Back</button></Centered>;
  if (status === "empty") return <Centered><div>No boards to review 🎉</div><button onClick={onBack} style={btn}>Back</button></Centered>;
  if (i >= list.length) return <Centered><div>Done. {pending ? `${pending} still syncing…` : "All synced."}</div><button onClick={onBack} style={btn}>Back</button></Centered>;

  const chips = [current.levels?.[0] || current.level || "", current.nodeId].filter(Boolean).join(" · ");
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.white, fontFamily: FONT.body, padding: "1rem", maxWidth: 480, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".5rem" }}>
        <button onClick={onBack} style={btnGhost}>← back</button>
        <span style={{ color: C.dim, fontSize: ".8rem" }}>{i + 1} / {list.length}{pending ? ` · ${pending} pending` : ""}</span>
        <button onClick={() => setI(n => Math.min(n + 1, list.length))} style={btnGhost}>skip ⏭</button>
      </div>
      <div style={{ color: C.gold, fontSize: ".75rem", marginBottom: ".4rem", letterSpacing: ".04em" }}>{chips}</div>
      <ReviewBoard scenario={current} />
      <input value={note} onChange={e => setNote(e.target.value)} placeholder="note (use your keyboard 🎤 to speak)…"
        style={{ width: "100%", margin: ".6rem 0", padding: ".6rem", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bgCard, color: C.white, fontFamily: FONT.body, boxSizing: "border-box" }} />
      <div style={{ display: "flex", gap: ".5rem" }}>
        <button onClick={() => verdict("keep")} style={{ ...verdictBtn, background: C.greenDim, borderColor: C.greenBorder, color: C.green }}>KEEP</button>
        <button onClick={() => verdict("revise")} style={{ ...verdictBtn, background: C.goldDim, borderColor: C.goldBorder, color: C.gold }}>REVISE</button>
        <button onClick={() => verdict("retire")} style={{ ...verdictBtn, background: C.redDim, borderColor: C.redBorder, color: C.red }}>RETIRE</button>
      </div>
      {i > 0 && <button onClick={() => setI(n => Math.max(0, n - 1))} style={{ ...btnGhost, marginTop: ".6rem" }}>← previous</button>}
    </div>
  );
}
