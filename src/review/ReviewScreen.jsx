import React, { useEffect, useState } from "react";
import ReviewBoard from "./ReviewBoard.jsx";
import { loadReviewScenarios } from "./reviewData.js";
import { boardHash } from "./reviewCore.js";
import { enqueueReview, flushQueue, getReviewedIds, getSavedReview, syncServerReviews } from "./reviewQueue.js";
import { getSession, listCoachReviews, listFeedbackLog } from "../supabase.js";
import { C, FONT } from "../shared.jsx";

const OWNERS = (import.meta.env.VITE_REVIEW_OWNERS || "")
  .split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
const VERDICT_LABEL = { keep: "KEEP", revise: "REVISE", retire: "RETIRE" };

function Centered({ children }) {
  return <div style={{ minHeight: "100vh", background: C.bg, color: C.white, fontFamily: FONT.body, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "1rem", gap: ".6rem" }}>{children}</div>;
}
const btn = { padding: ".5rem 1rem", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bgCard, color: C.white, cursor: "pointer" };
const ghost = { padding: ".3rem .6rem", borderRadius: 6, border: "none", background: "transparent", color: C.dim, fontSize: ".8rem", cursor: "pointer" };
const navBtn = { flex: 1, padding: ".55rem 0", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bgCard, color: C.white, fontFamily: FONT.body, cursor: "pointer", fontSize: ".85rem" };
const verdictBtn = { flex: 1, padding: ".9rem 0", borderRadius: 10, border: "1px solid", fontWeight: 700, fontFamily: FONT.body, cursor: "pointer", fontSize: ".95rem" };

export default function ReviewScreen({ onBack }) {
  const [status, setStatus] = useState("loading"); // loading | denied | empty | ready
  const [list, setList] = useState([]);
  const [i, setI] = useState(0);
  const [notesById, setNotesById] = useState({});
  const [pending, setPending] = useState(0);
  const [coachById, setCoachById] = useState({});
  const [logById, setLogById] = useState({});
  const [flaggedOnly, setFlaggedOnly] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const session = await getSession();
      const email = session?.user?.email?.toLowerCase();
      if (!email || (OWNERS.length && !OWNERS.includes(email))) { if (alive) setStatus("denied"); return; }
      await syncServerReviews();
      const [scenarios, coaches, logs] = await Promise.all([
        loadReviewScenarios(getReviewedIds()), listCoachReviews(), listFeedbackLog(),
      ]);
      if (!alive) return;
      setCoachById(Object.fromEntries(coaches.map(c => [c.scenario_id, c])));
      const lg = {};
      for (const r of logs) (lg[r.scenario_id] ||= []).push(r);
      setLogById(lg);
      setList(scenarios);
      setStatus(scenarios.length ? "ready" : "empty");
    })();
    return () => { alive = false; };
  }, []);

  const deck = flaggedOnly ? list.filter(s => { const c = coachById[s.id]; return c && c.verdict !== "keep"; }) : list;
  const current = deck[i];
  const saved = current ? getSavedReview(current.id) : null;
  const savedVerdict = saved?.verdict || null;
  const coach = current ? coachById[current.id] : null;
  const logs = current ? (logById[current.id] || []) : [];
  const note = current ? (notesById[current.id] ?? "") : "";

  useEffect(() => {
    if (!current) return;
    setNotesById(m => (current.id in m ? m : { ...m, [current.id]: saved?.note || "" }));
  }, [current?.id]);

  const setNote = (text) => { if (current) setNotesById(m => ({ ...m, [current.id]: text })); };

  async function verdict(v) {
    if (!current) return;
    enqueueReview({ scenario_id: current.id, verdict: v, note: note.trim(), board_hash: boardHash(current) });
    setI(n => Math.min(n + 1, deck.length));
    setPending(await flushQueue());
  }

  async function move(delta) {
    if (current && savedVerdict && note.trim() !== (saved?.note || "")) {
      enqueueReview({ scenario_id: current.id, verdict: savedVerdict, note: note.trim(), board_hash: boardHash(current) });
      setPending(await flushQueue());
    }
    setI(n => Math.max(0, Math.min(n + delta, deck.length)));
  }

  function toggleFlagged() { setFlaggedOnly(f => !f); setI(0); }

  if (status === "loading") return <Centered>Loading review deck…</Centered>;
  if (status === "denied") return <Centered><div>Not authorized.</div><button onClick={onBack} style={btn}>Back</button></Centered>;
  if (status === "empty") return <Centered><div>No boards to review 🎉</div><button onClick={onBack} style={btn}>Back</button></Centered>;
  if (!current) return <Centered><div>{flaggedOnly ? "No coach-flagged boards 🎉" : "End of the deck."} {pending ? `${pending} syncing…` : ""}</div><button onClick={() => setI(0)} style={btn}>Back to start</button><button onClick={onBack} style={ghost}>Exit</button></Centered>;

  const chips = [current.levels?.[0] || current.level || "", current.nodeId].filter(Boolean).join(" · ");
  const coachStale = coach && coach.board_hash && coach.board_hash !== boardHash(current);
  const suggests = (v) => !savedVerdict && coach && coach.verdict === v;
  const vStyle = (v, dim, border, color) => ({
    ...verdictBtn, background: dim, color,
    borderColor: savedVerdict === v ? color : (suggests(v) ? color : border),
    borderStyle: suggests(v) ? "dashed" : "solid",
  });

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.white, fontFamily: FONT.body, padding: "1rem", maxWidth: 480, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".5rem" }}>
        <button onClick={onBack} style={ghost}>← exit</button>
        <span style={{ color: C.dim, fontSize: ".8rem" }}>
          {i + 1} / {deck.length}{pending ? ` · ${pending} pending` : ""}{savedVerdict ? ` · saved: ${VERDICT_LABEL[savedVerdict]}` : ""}
        </span>
        <button onClick={toggleFlagged} style={{ ...ghost, color: flaggedOnly ? C.gold : C.dim }}>{flaggedOnly ? "all" : "flagged"}</button>
      </div>
      <div style={{ color: C.gold, fontSize: ".75rem", marginBottom: ".4rem", letterSpacing: ".04em" }}>{chips}</div>
      <ReviewBoard scenario={current} />

      {coach && (
        <div style={{ marginTop: ".5rem", padding: ".5rem .6rem", borderRadius: 8, background: C.bgCard, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: ".78rem", color: C.dim }}>
            🤖 Coaches: <b style={{ color: C.white }}>{VERDICT_LABEL[coach.verdict] || coach.verdict}</b>
            {coach.confidence != null ? ` · ${Math.round(coach.confidence * 100)}%` : ""}{coach.convened ? " · room" : ""}
            {coachStale ? " · ⚠ out of date" : ""}
          </div>
          {coach.notes && <div style={{ fontSize: ".78rem", color: C.dim, marginTop: ".2rem" }}>{coach.notes}</div>}
        </div>
      )}

      {logs.length > 0 && (
        <div style={{ marginTop: ".4rem", padding: ".5rem .6rem", borderRadius: 8, background: C.bgCard, border: `1px dashed ${C.border}` }}>
          <div style={{ fontSize: ".72rem", color: C.dimmer, marginBottom: ".2rem" }}>Previously incorporated</div>
          {logs.map((l, k) => (
            <div key={k} style={{ fontSize: ".76rem", color: C.dim }}>· (iter {l.iteration}) {l.feedback}{l.change ? ` → ${l.change}` : ""}</div>
          ))}
        </div>
      )}

      <input value={note} onChange={e => setNote(e.target.value)} placeholder="note (use your keyboard 🎤 to speak)…"
        style={{ width: "100%", margin: ".6rem 0", padding: ".6rem", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bgCard, color: C.white, fontFamily: FONT.body, boxSizing: "border-box" }} />
      <div style={{ display: "flex", gap: ".5rem", marginBottom: ".5rem" }}>
        <button onClick={() => verdict("keep")} style={vStyle("keep", C.greenDim, C.greenBorder, C.green)}>KEEP{savedVerdict === "keep" ? " ✓" : suggests("keep") ? " ·sugg" : ""}</button>
        <button onClick={() => verdict("revise")} style={vStyle("revise", C.goldDim, C.goldBorder, C.gold)}>REVISE{savedVerdict === "revise" ? " ✓" : suggests("revise") ? " ·sugg" : ""}</button>
        <button onClick={() => verdict("retire")} style={vStyle("retire", C.redDim, C.redBorder, C.red)}>RETIRE{savedVerdict === "retire" ? " ✓" : suggests("retire") ? " ·sugg" : ""}</button>
      </div>
      <div style={{ display: "flex", gap: ".5rem" }}>
        <button onClick={() => move(-1)} disabled={i === 0} style={{ ...navBtn, opacity: i === 0 ? 0.4 : 1, cursor: i === 0 ? "default" : "pointer" }}>← Previous</button>
        <button onClick={() => move(1)} style={navBtn}>Next →</button>
      </div>
    </div>
  );
}
