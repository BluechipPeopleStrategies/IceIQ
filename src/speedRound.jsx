// Speed Round — ENGAGEMENT_IDEAS.md #3.
// 15 T/F questions, 10 seconds each, no coach blurbs between. Independent
// score; doesn't affect the main IQ calc. Pattern break for returning
// players — different tempo from the 10-question adaptive session.

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, Label, C, FONT } from "./shared.jsx";
import { loadQB } from "./qbLoader.js";
import { lsGetJSON, lsSetJSON } from "./utils/storage.js";
import * as SB from "./supabase";
import { isEphemeralPlayer } from "./utils/devBypass.js";
import { toast } from "./toast.jsx";

const LS_SPEED_BEST = "iceiq_speed_best_v1"; // per-player map: { [id]: {score, correct, ts} }
const SECONDS_PER_Q = 10;
const QUESTIONS_PER_ROUND = 15;

function pickTFPool(qb, level) {
  const pool = (qb[level] || []).filter(q => q.type === "tf");
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, QUESTIONS_PER_ROUND);
}

function getBest(playerId) {
  try { return lsGetJSON(LS_SPEED_BEST, {})[playerId] || null; } catch { return null; }
}
function saveBest(playerId, entry) {
  try {
    const m = lsGetJSON(LS_SPEED_BEST, {});
    const prev = m[playerId];
    if (!prev || entry.score > prev.score) {
      m[playerId] = entry;
      lsSetJSON(LS_SPEED_BEST, m);
    }
  } catch {}
}

// ─────────────────────────────────────────────
// Home card
// ─────────────────────────────────────────────

export function SpeedRoundCard({ player, demoMode, onStart }) {
  if (demoMode || !player?.level) return null;
  const best = getBest(player.id);
  return (
    <Card
      onClick={onStart}
      style={{
        marginBottom:"1rem", cursor:"pointer",
        background:`linear-gradient(135deg,rgba(239,68,68,.1),rgba(207,69,32,.04))`,
        border:`1px solid rgba(239,68,68,.4)`,
      }}>
      <div style={{display:"flex",alignItems:"center",gap:".7rem"}}>
        <div style={{fontSize:28,flexShrink:0}}>⚡</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:C.red,fontWeight:800,marginBottom:2}}>Speed Round</div>
          <div style={{fontSize:13,color:C.white,fontWeight:700,lineHeight:1.3}}>15 T/F · 10 sec each · no mercy</div>
          <div style={{fontSize:11,color:C.dimmer,marginTop:3,lineHeight:1.4}}>
            {best ? `Your best: ${best.correct}/15 · ${best.score}%` : "Trust your gut. See what sticks."}
          </div>
        </div>
        <span style={{color:C.red,fontSize:18,flexShrink:0}}>→</span>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────
// Run screen
// ─────────────────────────────────────────────

export function SpeedRoundScreen({ player, onBack, onDone }) {
  const [qb, setQb] = useState(null);
  const [queue, setQueue] = useState(null);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState([]); // { id, ok, timedOut }
  const [timeLeft, setTimeLeft] = useState(SECONDS_PER_Q);
  const [picked, setPicked] = useState(null); // true | false | null
  const [done, setDone] = useState(false);
  const tickRef = useRef(null);

  useEffect(() => { loadQB().then(setQb); }, []);
  useEffect(() => {
    if (!qb || !player?.level) return;
    setQueue(pickTFPool(qb, player.level));
  }, [qb, player?.level]);

  // Countdown. One interval; ticks tick as long as the question isn't
  // resolved. Timeout resolves with `timedOut: true`.
  useEffect(() => {
    if (done || !queue || picked !== null) return;
    if (timeLeft <= 0) { lockIn(null); return; }
    tickRef.current = setTimeout(() => setTimeLeft(t => t - 0.1), 100);
    return () => clearTimeout(tickRef.current);
  }, [timeLeft, picked, queue, done]);

  function lockIn(val) {
    if (picked !== null || !queue) return;
    clearTimeout(tickRef.current);
    const q = queue[idx];
    const timedOut = val === null;
    const ok = !timedOut && (val === q.ok);
    setPicked(val === null ? "timeout" : val);
    setAnswers(a => [...a, { id: q.id, ok, timedOut }]);
    // Telemetry — best-effort.
    if (player?.id && !isEphemeralPlayer(player.id) && !timedOut) {
      SB.recordQuestionAnswer(q.id, ok);
    }
    // Pause briefly so the player sees the verdict, then advance.
    setTimeout(() => {
      if (idx + 1 >= queue.length) {
        setDone(true);
      } else {
        setIdx(idx + 1);
        setPicked(null);
        setTimeLeft(SECONDS_PER_Q);
      }
    }, 750);
  }

  const q = queue?.[idx];
  const total = queue?.length ?? QUESTIONS_PER_ROUND;
  const correct = answers.filter(a => a.ok).length;
  const score = done ? Math.round((correct / total) * 100) : 0;
  const timeFrac = Math.max(0, Math.min(1, timeLeft / SECONDS_PER_Q));

  // Save best once the round ends.
  useEffect(() => {
    if (!done || !player?.id) return;
    saveBest(player.id, { correct, score, ts: Date.now() });
    if (score >= 80) {
      toast.celebrate({ title: `Lightning fast — ${correct}/${total}`, body: "Pattern-matching at full send.", icon: "⚡" });
    } else if (score >= 60) {
      toast.success(`Nice — ${correct}/${total} (${score}%)`);
    }
  }, [done]);

  if (!qb || !queue) {
    return <div style={{minHeight:"100vh",background:C.bg,color:C.dimmer,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT.body}}>Loading…</div>;
  }

  if (queue.length === 0) {
    return (
      <div style={{minHeight:"100vh",background:C.bg,color:C.white,fontFamily:FONT.body,padding:"2rem 1rem",textAlign:"center"}}>
        <div style={{fontSize:14,color:C.dim,marginBottom:"1rem"}}>No T/F questions available for {player.level} yet.</div>
        <button onClick={onBack} style={{background:C.gold,color:C.bg,border:"none",borderRadius:10,padding:".7rem 1.25rem",cursor:"pointer",fontWeight:800,fontSize:13,fontFamily:FONT.body}}>← Back</button>
      </div>
    );
  }

  if (done) {
    const tier = score >= 90 ? { label: "ELITE", color: C.gold, flavor: "Hockey brain on autopilot." }
               : score >= 75 ? { label: "SHARP", color: C.green, flavor: "Read the play without thinking." }
               : score >= 60 ? { label: "SOLID", color: C.green, flavor: "Good instincts. Keep grinding." }
               : score >= 40 ? { label: "WARMING UP", color: C.yellow || "#eab308", flavor: "Trust the reps. Next round." }
               :              { label: "RESET", color: C.red, flavor: "Slow down on the next one. Read first." };
    const timedOut = answers.filter(a => a.timedOut).length;
    return (
      <div style={{minHeight:"100vh",background:C.bg,color:C.white,fontFamily:FONT.body,padding:"2rem 1.25rem",maxWidth:560,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:"1.5rem"}}>
          <div style={{fontSize:48,marginBottom:".25rem"}}>⚡</div>
          <div style={{fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:tier.color,fontWeight:800,marginBottom:".35rem"}}>{tier.label}</div>
          <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"3rem",color:tier.color,lineHeight:1}}>{correct}/{total}</div>
          <div style={{fontSize:13,color:C.dim,marginTop:".5rem",lineHeight:1.5}}>{tier.flavor}</div>
        </div>
        <Card style={{marginBottom:"1rem"}}>
          <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:13}}>
            <span style={{color:C.dim}}>Score</span>
            <span style={{color:C.white,fontWeight:700}}>{score}%</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:13}}>
            <span style={{color:C.dim}}>Correct</span>
            <span style={{color:C.green,fontWeight:700}}>{correct}</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:13}}>
            <span style={{color:C.dim}}>Timed out</span>
            <span style={{color:timedOut>0?C.red:C.dimmer,fontWeight:700}}>{timedOut}</span>
          </div>
        </Card>
        <button onClick={() => { onBack(); setTimeout(onDone, 50); }}
          style={{width:"100%",background:C.gold,color:C.bg,border:"none",borderRadius:12,padding:".9rem",cursor:"pointer",fontWeight:800,fontSize:14,fontFamily:FONT.body,marginBottom:".5rem"}}>
          Back to home
        </button>
      </div>
    );
  }

  const isTimeout = picked === "timeout";
  const verdictColor = picked === null ? (timeFrac < 0.3 ? C.red : timeFrac < 0.6 ? C.gold : C.green) : null;

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.white,fontFamily:FONT.body,paddingBottom:40}}>
      <div style={{position:"sticky",top:0,background:"rgba(6,12,22,.95)",backdropFilter:"blur(8px)",borderBottom:`1px solid ${C.border}`,padding:".75rem 1rem",zIndex:20}}>
        <div style={{maxWidth:560,margin:"0 auto",display:"flex",alignItems:"center",gap:"1rem"}}>
          <button onClick={onBack} style={{background:"none",border:`1px solid ${C.border}`,color:C.dimmer,borderRadius:8,padding:".3rem .7rem",cursor:"pointer",fontSize:13,fontFamily:FONT.body}}>←</button>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:14,color:C.red}}>⚡ Speed Round</div>
            <div style={{fontSize:10,color:C.dimmer,marginTop:2}}>Question {idx+1} of {total} · {correct} correct</div>
          </div>
          <div style={{width:64,height:64,position:"relative",flexShrink:0}}>
            {/* Circular countdown ring */}
            <svg viewBox="0 0 64 64" style={{width:"100%",height:"100%",transform:"rotate(-90deg)"}}>
              <circle cx="32" cy="32" r="26" fill="none" stroke={C.bgElevated} strokeWidth="5"/>
              <circle cx="32" cy="32" r="26" fill="none"
                stroke={verdictColor || C.bgElevated} strokeWidth="5" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 26}`}
                strokeDashoffset={`${2 * Math.PI * 26 * (1 - timeFrac)}`}
                style={{transition: picked !== null ? "none" : "stroke-dashoffset .1s linear, stroke .15s"}}/>
            </svg>
            <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT.display,fontWeight:800,fontSize:18,color:verdictColor || C.white}}>
              {Math.ceil(timeLeft)}
            </div>
          </div>
        </div>
      </div>

      <div style={{padding:"1.5rem 1.25rem",maxWidth:560,margin:"0 auto"}}>
        <Card style={{marginBottom:"1.25rem",background:C.blueDim,border:`1px solid rgba(91,164,232,.3)`}}>
          <div style={{fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:C.blue,marginBottom:".6rem",fontWeight:700}}>⚡ True or False?</div>
          <div style={{fontSize:15,lineHeight:1.6,color:C.white,fontWeight:500}}>{q.sit}</div>
        </Card>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".75rem",marginBottom:"1rem"}}>
          {[true,false].map(v => {
            const isSel = picked === v;
            const isRight = picked !== null && v === q.ok;
            const isWrongSel = picked !== null && isSel && v !== q.ok;
            return (
              <button key={String(v)} onClick={() => lockIn(v)} disabled={picked !== null}
                style={{
                  background: isRight ? "rgba(34,197,94,.2)" : isWrongSel ? "rgba(239,68,68,.2)" : C.bgElevated,
                  border: `2px solid ${isRight ? C.green : isWrongSel ? C.red : C.border}`,
                  borderRadius: 14, padding: "1.35rem", cursor: picked !== null ? "default" : "pointer",
                  fontWeight: 800, fontSize: 20, color: isRight ? C.green : isWrongSel ? C.red : C.white, fontFamily: FONT.body,
                  transition: "background .15s, border-color .15s",
                }}>
                {v ? "TRUE" : "FALSE"}
              </button>
            );
          })}
        </div>

        {picked !== null && (
          <div style={{textAlign:"center",fontSize:13,color:isTimeout ? C.red : (answers[answers.length-1]?.ok ? C.green : C.red),fontWeight:700,padding:"8px 0"}}>
            {isTimeout ? "⏱ Timed out" : answers[answers.length-1]?.ok ? "✓ Correct" : "✗ Wrong"}
          </div>
        )}
      </div>
    </div>
  );
}
