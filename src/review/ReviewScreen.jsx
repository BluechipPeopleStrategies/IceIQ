import React, { useEffect, useState } from "react";
import BoardReviewPanel from "./BoardReviewPanel.jsx";
import { loadReviewScenarios } from "./reviewData.js";
import { boardHash } from "./reviewCore.js";
import { enqueueReview, flushQueue, getReviewedIds, getSavedReview, syncServerReviews } from "./reviewQueue.js";
import { getSession, listCoachReviews, listFeedbackLog } from "../supabase.js";
import { isDevBypassEnabled } from "../utils/devBypass.js";
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
      let email = null;
      try { const session = await getSession(); email = session?.user?.email?.toLowerCase(); }
      catch (e) { console.error("[review] getSession failed", e); }
      // Owners gate by email in production; a dev-bypass session (or any local
      // `npm run dev`) gets in without a Supabase login so boards are viewable
      // offline. Server-backed overlays (coach/feedback/sync) just come back
      // empty without a session — the local bank + saved reviews still render.
      const devOK = isDevBypassEnabled() || !!(import.meta.env && import.meta.env.DEV);
      if (!devOK && (!email || (OWNERS.length && !OWNERS.includes(email)))) { if (alive) setStatus("denied"); return; }
      try { await syncServerReviews(); } catch (e) { console.error("[review] syncServerReviews failed", e); }
      let scenarios = [];
      try { scenarios = await loadReviewScenarios(getReviewedIds()); }
      catch (e) { console.error("[review] loadReviewScenarios failed", e); }
      try { const coaches = await listCoachReviews(); if (alive) setCoachById(Object.fromEntries(coaches.map(c => [c.scenario_id, c]))); }
      catch (e) { console.error("[review] listCoachReviews failed", e); }
      try { const logs = await listFeedbackLog(); const lg = {}; for (const r of logs) (lg[r.scenario_id] ||= []).push(r); if (alive) setLogById(lg); }
      catch (e) { console.error("[review] listFeedbackLog failed", e); }
      if (!alive) return;
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
      <BoardReviewPanel
        scenario={current}
        coach={coach}
        logs={logs}
        savedVerdict={savedVerdict}
        note={note}
        onNote={setNote}
        onVerdict={verdict}
      >
        <div style={{ display: "flex", gap: ".5rem" }}>
          <button onClick={() => move(-1)} disabled={i === 0} style={{ ...navBtn, opacity: i === 0 ? 0.4 : 1, cursor: i === 0 ? "default" : "pointer" }}>← Previous</button>
          <button onClick={() => move(1)} style={navBtn}>Next →</button>
        </div>
      </BoardReviewPanel>
    </div>
  );
}
