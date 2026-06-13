import React, { useEffect, useMemo, useState } from "react";
import BrowseTile from "./BrowseTile.jsx";
import BoardReviewPanel from "./BoardReviewPanel.jsx";
import AddQuestions from "./AddQuestions.jsx";
import { loadReviewScenarios } from "./reviewData.js";
import { ageTiers, applyFilters, siblingsOf, questionTypeLabel } from "./browseCore.js";
import { boardHash } from "./reviewCore.js";
import { enqueueReview, flushQueue, getSavedReview, syncServerReviews } from "./reviewQueue.js";
import { getSession, listCoachReviews, listFeedbackLog } from "../supabase.js";
import { isDevBypassEnabled } from "../utils/devBypass.js";
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

// Expandable "Questions on this scene" — every question built on the same stem
// (shared stemId), each its own type + prompt, click to open. Hidden when the
// scene has only this one question.
function SceneQuestions({ focused, list, onOpen }) {
  const [open, setOpen] = useState(false);
  const sibs = siblingsOf(focused, list);
  if (sibs.length === 0) return null;
  const all = [focused, ...sibs];
  return (
    <div style={{ marginTop: "1rem", padding: ".5rem .6rem", borderRadius: 8, background: C.bgCard, border: `1px solid ${C.border}` }}>
      <div onClick={() => setOpen(o => !o)} style={{ display: "flex", gap: ".4rem", alignItems: "center", cursor: "pointer", fontSize: ".8rem", color: C.dim }}>
        <span style={{ color: C.dimmer }}>{open ? "▾" : "▸"}</span>
        <span>Questions on this scene ({all.length})</span>
      </div>
      {open && (
        <div style={{ marginTop: ".4rem", display: "flex", flexDirection: "column", gap: ".3rem" }}>
          {all.map(q => {
            const isCurrent = q.id === focused.id;
            const prompt = q.interaction?.prompt || q.mc?.stem || (q.nodes ? "branching play" : "");
            return (
              <div key={q.id} onClick={() => { if (!isCurrent) onOpen(q); }}
                style={{ padding: ".4rem .5rem", borderRadius: 6, border: `1px solid ${isCurrent ? C.gold : C.border}`, background: isCurrent ? C.goldDim : "transparent", cursor: isCurrent ? "default" : "pointer" }}>
                <div style={{ display: "flex", gap: ".4rem", alignItems: "baseline" }}>
                  <span style={{ fontSize: ".66rem", fontWeight: 800, letterSpacing: ".04em", color: C.gold, flexShrink: 0 }}>{questionTypeLabel(q)}</span>
                  {isCurrent && <span style={{ fontSize: ".62rem", color: C.dimmer }}>· viewing</span>}
                </div>
                {prompt && <div style={{ fontSize: ".72rem", color: C.dim, marginTop: ".15rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{prompt}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

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
  const [signedIn, setSignedIn] = useState(true); // reviews only sync to the server when signed in

  useEffect(() => {
    let alive = true;
    (async () => {
      let email = null;
      try { const s = await getSession(); email = s?.user?.email?.toLowerCase(); }
      catch (e) { console.error("[browse] getSession failed", e); }
      if (alive) setSignedIn(!!email);
      // See ReviewScreen: dev-bypass / local dev can browse boards without a login.
      const devOK = isDevBypassEnabled() || !!(import.meta.env && import.meta.env.DEV);
      if (!devOK && (!email || (OWNERS.length && !OWNERS.includes(email)))) { if (alive) setStatus("denied"); return; }
      try { await syncServerReviews(); } catch (e) { console.error("[browse] syncServerReviews failed", e); }
      // Once a session exists, push anything queued offline (e.g. saved earlier under
      // dev-bypass with no session) so it finally reaches the server.
      try { if (email) setPending(await flushQueue()); } catch (e) { console.error("[browse] flushQueue failed", e); }
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

  function openBoard(s) { setFocused(s); setNote(""); } // fresh comment box, never pre-filled
  function closeBoard() { setFocused(null); }
  // The board after `id` in the current filtered order (or null at the end).
  function nextAfter(id) { const i = filtered.findIndex(s => s.id === id); return i >= 0 ? filtered[i + 1] : null; }
  function goTo(delta) {
    const i = filtered.findIndex(s => s.id === focused?.id);
    const t = i >= 0 ? filtered[i + delta] : null;
    if (t) openBoard(t); else if (delta > 0) closeBoard();
  }

  async function saveVerdict(v) {
    if (!focused) return;
    const nextBoard = nextAfter(focused.id); // capture before state changes the filter
    // Empty box = keep the existing note (don't wipe it); typed text replaces it.
    const nextNote = note.trim() || (getSavedReview(focused.id)?.note || "");
    enqueueReview({ scenario_id: focused.id, verdict: v, note: nextNote, board_hash: boardHash(focused) });
    setMyById(m => ({ ...m, [focused.id]: { verdict: v, note: nextNote } }));
    setPending(await flushQueue());
    if (nextBoard) openBoard(nextBoard); else closeBoard(); // auto-advance, not back to the grid
  }

  if (status === "loading") return <Centered>Loading library…</Centered>;
  if (status === "denied") return <Centered><div>Not authorized.</div><button onClick={onBack} style={btn}>Back</button></Centered>;

  if (focused) {
    const coach = coachById[focused.id] || null;
    const savedVerdict = getSavedReview(focused.id)?.verdict || myById[focused.id]?.verdict || null;
    const pos = filtered.findIndex(s => s.id === focused.id);
    const navBtn = { flex: 1, padding: ".55rem 0", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bgCard, color: C.white, fontFamily: FONT.body, cursor: "pointer", fontSize: ".85rem" };
    return (
      <div style={{ minHeight: "100vh", background: C.bg, color: C.white, fontFamily: FONT.body, padding: "1rem", maxWidth: 480, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={closeBoard} style={ghost}>← grid</button>
          <span style={{ color: C.dim, fontSize: ".78rem" }}>{pos >= 0 ? `${pos + 1} / ${filtered.length}` : ""}{pending ? ` · ${pending} syncing` : ""}</span>
          <span style={{ width: 40 }} />
        </div>
        <div style={{ height: ".4rem" }} />
        <BoardReviewPanel
          scenario={focused} coach={coach} logs={logById[focused.id] || []} savedVerdict={savedVerdict}
          note={note} onNote={setNote} onVerdict={saveVerdict}
        >
          <div style={{ display: "flex", gap: ".5rem" }}>
            <button onClick={() => goTo(-1)} disabled={pos <= 0} style={{ ...navBtn, opacity: pos <= 0 ? 0.4 : 1, cursor: pos <= 0 ? "default" : "pointer" }}>← Previous</button>
            <button onClick={() => goTo(1)} style={navBtn}>Next →</button>
          </div>
          <SceneQuestions focused={focused} list={list} onOpen={openBoard} />
          <AddQuestions scenario={focused} />
        </BoardReviewPanel>
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

      {!signedIn && (
        <div style={{ marginBottom: ".6rem", padding: ".5rem .6rem", borderRadius: 8, background: "rgba(201,162,75,.12)", border: `1px solid ${C.gold}`, color: C.gold, fontSize: ".75rem", lineHeight: 1.35 }}>
          ⚠ Not signed in — your verdicts save on <b>this device only</b> and won't sync to the server. Open the app home, sign in, then return here to push them up.
        </div>
      )}

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
