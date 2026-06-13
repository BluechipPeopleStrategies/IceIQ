import React, { useEffect, useMemo, useState } from "react";
import BrowseTile from "./BrowseTile.jsx";
import BoardReviewPanel from "./BoardReviewPanel.jsx";
import { loadReviewScenarios } from "./reviewData.js";
import { ageTiers, applyFilters } from "./browseCore.js";
import { boardHash } from "./reviewCore.js";
import { enqueueReview, flushQueue, getSavedReview, syncServerReviews } from "./reviewQueue.js";
import { getSession, listCoachReviews, listFeedbackLog } from "../supabase.js";
import { C, FONT } from "../shared.jsx";

const OWNERS = (import.meta.env.VITE_REVIEW_OWNERS || "")
  .split(",").map(s => s.trim().toLowerCase()).filter(Boolean);

const FLAG_SCOPES = [
  { key: "all", label: "All" },
  { key: "coach", label: "🚩 Coach" },
  { key: "mine", label: "⚠ Mine" },
  { key: "unreviewed", label: "Unreviewed" },
];

function Centered({ children }) {
  return <div style={{ minHeight: "100vh", background: C.bg, color: C.white, fontFamily: FONT.body, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "1rem", gap: ".6rem" }}>{children}</div>;
}
const btn = { padding: ".5rem 1rem", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bgCard, color: C.white, cursor: "pointer" };
const ghost = { padding: ".3rem .6rem", borderRadius: 6, border: "none", background: "transparent", color: C.dim, fontSize: ".8rem", cursor: "pointer" };
const chip = (on) => ({ padding: ".3rem .6rem", borderRadius: 999, border: `1px solid ${on ? C.gold : C.border}`, background: on ? C.goldDim : "transparent", color: on ? C.gold : C.dim, fontSize: ".75rem", cursor: "pointer", fontFamily: FONT.body });

export default function BrowseScreen({ onBack }) {
  const [status, setStatus] = useState("loading"); // loading | denied | ready
  const [list, setList] = useState([]);
  const [coachById, setCoachById] = useState({});
  const [myById, setMyById] = useState({});
  const [revisedIds, setRevisedIds] = useState(new Set());
  const [logById, setLogById] = useState({});
  const [flagScope, setFlagScope] = useState("all");
  const [ageTier, setAgeTier] = useState("all");
  const [focused, setFocused] = useState(null); // scenario or null
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      let email = null;
      try { const s = await getSession(); email = s?.user?.email?.toLowerCase(); }
      catch (e) { console.error("[browse] getSession failed", e); }
      if (!email || (OWNERS.length && !OWNERS.includes(email))) { if (alive) setStatus("denied"); return; }
      try { await syncServerReviews(); } catch (e) { console.error("[browse] syncServerReviews failed", e); }
      let scenarios = [];
      try { scenarios = await loadReviewScenarios(new Set()); } catch (e) { console.error("[browse] loadReviewScenarios failed", e); }
      try { const c = await listCoachReviews(); if (alive) setCoachById(Object.fromEntries(c.map(x => [x.scenario_id, x]))); }
      catch (e) { console.error("[browse] listCoachReviews failed", e); }
      try { const logs = await listFeedbackLog(); if (alive) { setRevisedIds(new Set(logs.map(l => l.scenario_id))); const lg = {}; for (const r of logs) (lg[r.scenario_id] ||= []).push(r); setLogById(lg); } }
      catch (e) { console.error("[browse] listFeedbackLog failed", e); }
      if (!alive) return;
      const mine = {};
      for (const s of scenarios) { const sv = getSavedReview(s.id); if (sv) mine[s.id] = sv; }
      setMyById(mine);
      setList(scenarios);
      setStatus("ready");
    })();
    return () => { alive = false; };
  }, []);

  const tiers = useMemo(() => ageTiers(list), [list]);
  const filtered = useMemo(() => applyFilters(list, { flagScope, ageTier }, coachById, myById), [list, flagScope, ageTier, coachById, myById]);

  function openBoard(s) { setFocused(s); setNote(getSavedReview(s.id)?.note || ""); }
  function closeBoard() { setFocused(null); }

  async function saveVerdict(v) {
    if (!focused) return;
    enqueueReview({ scenario_id: focused.id, verdict: v, note: note.trim(), board_hash: boardHash(focused) });
    setMyById(m => ({ ...m, [focused.id]: { verdict: v, note: note.trim() } }));
    setPending(await flushQueue());
    closeBoard();
  }

  if (status === "loading") return <Centered>Loading library…</Centered>;
  if (status === "denied") return <Centered><div>Not authorized.</div><button onClick={onBack} style={btn}>Back</button></Centered>;

  if (focused) {
    const coach = coachById[focused.id] || null;
    const savedVerdict = getSavedReview(focused.id)?.verdict || myById[focused.id]?.verdict || null;
    return (
      <div style={{ minHeight: "100vh", background: C.bg, color: C.white, fontFamily: FONT.body, padding: "1rem", maxWidth: 480, margin: "0 auto" }}>
        <button onClick={closeBoard} style={ghost}>← back to grid{pending ? ` · ${pending} syncing` : ""}</button>
        <div style={{ height: ".4rem" }} />
        <BoardReviewPanel
          scenario={focused} coach={coach} logs={logById[focused.id] || []} savedVerdict={savedVerdict}
          note={note} onNote={setNote} onVerdict={saveVerdict}
        />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.white, fontFamily: FONT.body, padding: "1rem", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".5rem" }}>
        <button onClick={onBack} style={ghost}>← exit</button>
        <span style={{ color: C.dim, fontSize: ".8rem" }}>{filtered.length} board{filtered.length === 1 ? "" : "s"}{pending ? ` · ${pending} pending` : ""}</span>
        <span style={{ width: 40 }} />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: ".35rem", marginBottom: ".4rem" }}>
        {FLAG_SCOPES.map(f => <button key={f.key} onClick={() => setFlagScope(f.key)} style={chip(flagScope === f.key)}>{f.label}</button>)}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: ".35rem", marginBottom: ".8rem" }}>
        <button onClick={() => setAgeTier("all")} style={chip(ageTier === "all")}>All ages</button>
        {tiers.map(t => <button key={t} onClick={() => setAgeTier(t)} style={chip(ageTier === t)}>{t}</button>)}
      </div>

      {filtered.length === 0
        ? <div style={{ color: C.dim, textAlign: "center", padding: "2rem 0" }}>No boards match. <button onClick={() => { setFlagScope("all"); setAgeTier("all"); }} style={ghost}>clear filters</button></div>
        : <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: ".6rem" }}>
            {filtered.map(s => (
              <BrowseTile key={s.id} scenario={s} coach={coachById[s.id] || null} myVerdict={myById[s.id] || null} revised={revisedIds.has(s.id)} onOpen={openBoard} />
            ))}
          </div>}
    </div>
  );
}
