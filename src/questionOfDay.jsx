// Question of the Day — one shared MC/TF question per age group per day.
// Every U11 player in the world gets the same RinkReads question today; it
// resets at midnight local.
//
// Three pieces:
//   todaysQuestionId(qb, level) — deterministic picker
//   <QotDCard>                   — Home-screen teaser with state
//   <QotDScreen>                 — one-question flow, post-answer community
//                                  stats + share-sheet output

import { useEffect, useState } from "react";
import * as SB from "./supabase";
import { Card, Label, C, FONT } from "./shared.jsx";
import { loadQB } from "./qbLoader.js";
import { lsGetJSON, lsSetJSON } from "./utils/storage.js";
import { toast } from "./toast.jsx";

const LS_QOTD = "rinkreads_qotd_done_v1";

// ─────────────────────────────────────────────
// Picker
// ─────────────────────────────────────────────

function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0; // unsigned
}

function todayYmd() {
  return new Date().toISOString().slice(0, 10);
}

// Filter the age's pool down to plain MC/TF (the shapes QotDScreen can
// render) and pick deterministically from (date, level).
function todaysQuestion(qb, level) {
  const pool = (qb[level] || []).filter(q => {
    const t = q.type || "mc";
    return t === "mc" || t === "tf";
  });
  if (!pool.length) return null;
  const seed = hashString(`${todayYmd()}|${level}`);
  return pool[seed % pool.length];
}

function getQotdState(playerId) {
  try {
    const map = lsGetJSON(LS_QOTD, {});
    return map[playerId] || null;
  } catch { return null; }
}

function saveQotdState(playerId, state) {
  try {
    const map = lsGetJSON(LS_QOTD, {});
    map[playerId] = state;
    lsSetJSON(LS_QOTD, map);
  } catch {}
}

// ─────────────────────────────────────────────
// Home card
// ─────────────────────────────────────────────

export function QotDCard({ player, demoMode, onOpen }) {
  const [q, setQ] = useState(null);
  const [done, setDone] = useState(null); // { date, ok, score } | null
  useEffect(() => {
    if (demoMode || !player?.level) return;
    loadQB().then(qb => {
      const todaysQ = todaysQuestion(qb, player.level);
      setQ(todaysQ);
      const s = getQotdState(player.id);
      if (s && s.date === todayYmd() && s.questionId === todaysQ?.id) setDone(s);
      else setDone(null);
    });
  }, [player?.level, player?.id, demoMode]);
  if (demoMode || !q) return null;

  const label = done ? (done.ok ? "✓ Done · nice read" : "✓ Done · try again tomorrow") : "Today's question — 1 shot";
  const accent = done ? (done.ok ? C.green : C.red) : C.gold;
  return (
    <Card style={{marginBottom:"1rem",background:`linear-gradient(135deg,rgba(252,76,2,.08),rgba(6,12,22,.4))`,border:`1px solid ${done?"rgba(255,255,255,.08)":C.goldBorder}`,cursor:done?"default":"pointer"}}
          onClick={() => !done && onOpen(q)}>
      <div style={{display:"flex",alignItems:"center",gap:".7rem"}}>
        <div style={{fontSize:28,flexShrink:0}}>{done ? (done.ok ? "✅" : "📝") : "📆"}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:accent,fontWeight:800,marginBottom:2}}>Question of the Day</div>
          <div style={{fontSize:13,color:C.white,fontWeight:700,lineHeight:1.3}}>{done ? label : `Take today's ${player.level.split(" / ")[0]} QotD`}</div>
          <div style={{fontSize:11,color:C.dimmer,marginTop:3,lineHeight:1.4}}>
            {done ? `Answered today — next drop tomorrow.` : `Same question as every ${player.level.split(" / ")[0]} player. One shot. Resets at midnight.`}
          </div>
        </div>
        {!done && <span style={{color:C.gold,fontSize:18,flexShrink:0}}>→</span>}
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────
// Run screen
// ─────────────────────────────────────────────

export function QotDScreen({ question, player, onBack }) {
  const [sel, setSel] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [stats, setStats] = useState(null); // % community correct
  const isTF = question.type === "tf";
  const rightIdx = typeof question.correct === "number" ? question.correct : question.ok;

  async function choose(val) {
    if (answered) return;
    setSel(val);
    setAnswered(true);
    const ok = isTF ? (val === question.ok) : (val === rightIdx);
    saveQotdState(player.id, {
      date: todayYmd(),
      questionId: question.id,
      ok, chose: val,
    });
    // Fire telemetry + fetch community % (best-effort).
    try {
      SB.recordQuestionAnswer(question.id, ok);
      const s = await SB.getQuestionStats();
      const row = s?.[question.id];
      if (row && row.attempts >= 5) {
        setStats(Math.round((row.correct / row.attempts) * 100));
      }
    } catch {}
  }

  function share() {
    const s = getQotdState(player.id);
    const ymd = todayYmd();
    const emoji = s?.ok ? "🎯" : "❌";
    const text = `RinkReads QotD ${ymd} ${emoji} ${player.level.split(" / ")[0]}\nhttps://rinkreads.com`;
    if (navigator?.share) {
      navigator.share({ text }).catch(() => {});
    } else if (navigator?.clipboard) {
      navigator.clipboard.writeText(text).then(() => toast.success("Copied — paste anywhere."));
    } else {
      toast.info(text);
    }
  }

  const userOk = answered ? (isTF ? (sel === question.ok) : (sel === rightIdx)) : null;
  const q = question;

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.white,fontFamily:FONT.body,paddingBottom:60}}>
      <div style={{position:"sticky",top:0,background:"rgba(6,12,22,.95)",backdropFilter:"blur(8px)",borderBottom:`1px solid ${C.border}`,padding:".75rem 1rem",zIndex:20}}>
        <div style={{maxWidth:560,margin:"0 auto",display:"flex",alignItems:"center",gap:"1rem"}}>
          <button onClick={onBack} style={{background:"none",border:`1px solid ${C.border}`,color:C.dimmer,borderRadius:8,padding:".3rem .7rem",cursor:"pointer",fontSize:13,fontFamily:FONT.body}}>←</button>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:14,color:C.gold}}>📆 Question of the Day</div>
            <div style={{fontSize:10,color:C.dimmer,marginTop:2}}>{player.level} · Same question for every player today</div>
          </div>
        </div>
      </div>

      <div style={{padding:"1.5rem 1.25rem",maxWidth:560,margin:"0 auto"}}>
        <Card style={{marginBottom:"1.25rem"}}>
          <div style={{fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:C.dimmer,fontWeight:700,marginBottom:".35rem"}}>{q.cat}</div>
          <div style={{fontSize:15,color:C.white,lineHeight:1.7,fontWeight:500}}>{q.sit || q.q}</div>
        </Card>

        {isTF ? (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".75rem",marginBottom:"1rem"}}>
            {[true,false].map(v => {
              const isSel = sel === v;
              const isRight = answered && v === q.ok;
              const isWrongSel = answered && isSel && v !== q.ok;
              return (
                <button key={String(v)} onClick={() => choose(v)} disabled={answered}
                  style={{
                    background: isRight ? "rgba(34,197,94,.15)" : isWrongSel ? "rgba(239,68,68,.15)" : C.bgElevated,
                    border: `2px solid ${isRight ? C.green : isWrongSel ? C.red : C.border}`,
                    borderRadius: 12, padding: "1.25rem", cursor: answered ? "default" : "pointer",
                    fontWeight: 700, fontSize: 16, color: isRight ? C.green : isWrongSel ? C.red : C.white, fontFamily: FONT.body,
                  }}>
                  {v ? "True" : "False"}
                </button>
              );
            })}
          </div>
        ) : (
          <div style={{marginBottom:"1rem"}}>
            {(q.choices || q.opts || []).map((choice, i) => {
              const isSel = sel === i;
              const showRight = answered && i === rightIdx;
              const showWrong = answered && isSel && i !== rightIdx;
              return (
                <button key={i} onClick={() => choose(i)} disabled={answered}
                  style={{
                    width:"100%",textAlign:"left",marginBottom:".5rem",
                    background: showRight ? "rgba(34,197,94,.12)" : showWrong ? "rgba(239,68,68,.12)" : C.bgElevated,
                    border: `1.5px solid ${showRight ? C.green : showWrong ? C.red : C.border}`,
                    borderRadius: 10, padding: ".85rem 1rem", cursor: answered ? "default" : "pointer",
                    color: showRight ? C.green : showWrong ? C.red : C.white, fontFamily: FONT.body, fontSize: 14,
                  }}>
                  {choice}
                </button>
              );
            })}
          </div>
        )}

        {answered && (
          <>
            <Card style={{background: userOk ? "rgba(34,197,94,.06)" : "rgba(239,68,68,.06)",border:`1px solid ${userOk ? C.greenBorder : C.redBorder}`,marginBottom:"1rem"}}>
              <div style={{fontSize:11,fontWeight:800,color:userOk?C.green:C.red,marginBottom:".4rem",letterSpacing:".06em"}}>
                {userOk ? "✓ Correct" : "✗ Incorrect"}
              </div>
              {q.why && <div style={{fontSize:13,color:C.dim,lineHeight:1.65,marginBottom:q.tip?".5rem":0}}>{q.why}</div>}
              {q.tip && <div style={{fontSize:12,color:C.dimmer,lineHeight:1.55,fontStyle:"italic"}}>💡 {q.tip}</div>}
            </Card>
            {stats !== null && (
              <Card style={{marginBottom:"1rem",background:C.bgElevated,border:`1px solid ${C.border}`}}>
                <Label>Community</Label>
                <div style={{fontSize:13,color:C.dim,lineHeight:1.5}}>
                  <b style={{color:C.gold}}>{stats}%</b> of players got this right so far.
                </div>
              </Card>
            )}
            <button onClick={share}
              style={{width:"100%",background:"none",color:C.gold,border:`1px solid ${C.goldBorder}`,borderRadius:10,padding:".8rem",cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:FONT.body,marginBottom:".6rem"}}>
              Share today's result →
            </button>
            <button onClick={onBack}
              style={{width:"100%",background:C.gold,color:C.bg,border:"none",borderRadius:10,padding:".9rem",cursor:"pointer",fontWeight:800,fontSize:14,fontFamily:FONT.body}}>
              Back to home
            </button>
          </>
        )}
      </div>
    </div>
  );
}
