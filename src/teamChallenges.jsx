// Team challenges — coach picks a fixed question set, every team player
// takes the same quiz, coach sees a leaderboard.
//
// Three surfaces:
//   <CoachChallengeSection>  : inside expanded team on CoachHome. Create +
//                               list + leaderboard drill-in.
//   <ChallengeCard>          : player's Home card showing open challenges.
//   <ChallengeRunScreen>     : dedicated screen rendering the fixed quiz.
//
// Storage is Supabase (migration_0008_team_challenges.sql). Scope is
// intentionally small — only MC + TF question types are supported in the
// coach picker so the player-side quiz renderer can stay minimal.

import { useEffect, useMemo, useState } from "react";
import * as SB from "./supabase";
import { Card, Label, C, FONT } from "./shared.jsx";
import { loadQB } from "./qbLoader.js";

// ─────────────────────────────────────────────
// Helpers — question lookup + random picker
// ─────────────────────────────────────────────

function flatQB(qb) { return Object.values(qb).flat(); }
function findQ(qb, id) { return flatQB(qb).find(q => q.id === id); }
function pickRandomQuestions(qb, level, cat, count) {
  const pool = (qb[level] || []).filter(q => {
    if (q.type && q.type !== "mc" && q.type !== "tf") return false;
    if (cat && q.cat !== cat) return false;
    return true;
  });
  // Fisher-Yates
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

// ─────────────────────────────────────────────
// COACH SIDE
// ─────────────────────────────────────────────

export function CoachChallengeSection({ teamId, coachId, teamLevel, roster }) {
  const [qb, setQb] = useState(null);
  const [challenges, setChallenges] = useState([]);
  const [resultsByChallenge, setResultsByChallenge] = useState({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null); // challenge id drilled into
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [level, setLevel] = useState(teamLevel || "U11 / Atom");
  const [cat, setCat] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [picked, setPicked] = useState([]); // array of question objects
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => { loadQB().then(setQb); }, []);

  async function refresh() {
    setLoading(true);
    const list = await SB.getTeamChallenges(teamId);
    setChallenges(list);
    // Batch-fetch results for each challenge (at most a handful of challenges).
    const entries = await Promise.all(list.map(async c => [c.id, await SB.getChallengeResults(c.id)]));
    setResultsByChallenge(Object.fromEntries(entries));
    setLoading(false);
  }
  useEffect(() => { if (teamId) refresh(); }, [teamId]);

  const cats = useMemo(() => {
    if (!qb || !qb[level]) return [];
    return [...new Set(qb[level].map(q => q.cat).filter(Boolean))].sort();
  }, [qb, level]);

  function shuffle() {
    if (!qb) return;
    const picks = pickRandomQuestions(qb, level, cat || null, 10);
    setPicked(picks);
    setErr("");
  }
  function openForm() {
    setTitle("");
    setDueDate("");
    setCat("");
    setPicked([]);
    setShowForm(true);
    setErr("");
  }
  async function submit() {
    const t = title.trim();
    if (!t) { setErr("Give this challenge a title."); return; }
    if (picked.length < 3) { setErr("Shuffle to pick at least a few questions first."); return; }
    setSaving(true); setErr("");
    try {
      await SB.createTeamChallenge(coachId, teamId, {
        title: t,
        questionIds: picked.map(q => q.id),
        dueDate: dueDate || null,
      });
      setShowForm(false);
      await refresh();
    } catch (e) {
      setErr(e.message || "Could not save.");
    }
    setSaving(false);
  }
  async function remove(id) {
    if (!window.confirm("Delete this challenge? Players will lose access.")) return;
    try { await SB.deleteTeamChallenge(id); await refresh(); } catch {}
  }

  const rosterSize = roster?.length || 0;

  return (
    <div style={{marginTop:"1rem",paddingTop:"1rem",borderTop:`1px solid ${C.border}`}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:".5rem"}}>
        <Label style={{marginBottom:0}}>🏆 Team Challenges</Label>
        {!showForm && (
          <button onClick={openForm}
            style={{background:C.gold,color:C.bg,border:"none",borderRadius:8,padding:".35rem .75rem",cursor:"pointer",fontSize:11,fontWeight:800,fontFamily:FONT.body}}>
            + New
          </button>
        )}
      </div>

      {showForm && (
        <div style={{background:C.bgElevated,border:`1px solid ${C.border}`,borderRadius:10,padding:".85rem",marginBottom:".75rem"}}>
          <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Challenge title (e.g., Week 4 Face-Off)"
            style={{width:"100%",background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:8,padding:".6rem .75rem",color:C.white,fontSize:13,fontFamily:FONT.body,marginBottom:".5rem",outline:"none"}}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".4rem",marginBottom:".5rem"}}>
            <label style={{fontSize:10,color:C.dimmer,fontWeight:700,letterSpacing:".06em",textTransform:"uppercase"}}>
              Age
              <select value={level} onChange={e => { setLevel(e.target.value); setCat(""); setPicked([]); }}
                style={{width:"100%",marginTop:3,background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:6,padding:".4rem .5rem",color:C.white,fontSize:12,fontFamily:FONT.body,outline:"none"}}>
                {["U7 / Initiation","U9 / Novice","U11 / Atom","U13 / Peewee","U15 / Bantam","U18 / Midget"].map(l =>
                  <option key={l} value={l}>{l}</option>
                )}
              </select>
            </label>
            <label style={{fontSize:10,color:C.dimmer,fontWeight:700,letterSpacing:".06em",textTransform:"uppercase"}}>
              Category (optional)
              <select value={cat} onChange={e => { setCat(e.target.value); setPicked([]); }}
                style={{width:"100%",marginTop:3,background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:6,padding:".4rem .5rem",color:C.white,fontSize:12,fontFamily:FONT.body,outline:"none"}}>
                <option value="">Any category</option>
                {cats.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          </div>
          <div style={{display:"flex",gap:".4rem",alignItems:"center",marginBottom:".6rem",flexWrap:"wrap"}}>
            <label style={{fontSize:11,color:C.dimmer,fontWeight:600}}>Due:</label>
            <input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)}
              style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:6,padding:".35rem .5rem",color:C.white,fontSize:12,fontFamily:FONT.body,outline:"none",colorScheme:"dark"}}/>
            <button onClick={shuffle}
              style={{marginLeft:"auto",background:"none",color:C.gold,border:`1px solid ${C.goldBorder}`,borderRadius:8,padding:".35rem .8rem",cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:FONT.body}}>
              🎲 Shuffle 10
            </button>
          </div>
          {picked.length > 0 && (
            <div style={{maxHeight:160,overflowY:"auto",marginBottom:".6rem",background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:6,padding:".4rem .5rem"}}>
              <div style={{fontSize:10,color:C.dimmer,fontWeight:700,marginBottom:".3rem",letterSpacing:".06em",textTransform:"uppercase"}}>
                Preview · {picked.length} questions
              </div>
              {picked.map((q, i) => (
                <div key={q.id} style={{fontSize:11,color:C.dim,padding:"2px 0",borderBottom: i < picked.length-1 ? `1px solid ${C.border}` : "none"}}>
                  <span style={{color:C.gold,fontWeight:700,marginRight:".35rem"}}>{i+1}.</span>
                  {(q.q || q.sit || "").slice(0, 70)}{(q.q || q.sit || "").length > 70 ? "…" : ""}
                  <span style={{fontSize:9,color:C.dimmer,marginLeft:".35rem"}}>· {q.cat}</span>
                </div>
              ))}
            </div>
          )}
          {err && <div style={{fontSize:11,color:C.red,marginBottom:".5rem"}}>{err}</div>}
          <div style={{display:"flex",gap:".4rem"}}>
            <button onClick={submit} disabled={saving || picked.length === 0}
              style={{flex:1,background:picked.length ? C.gold : C.bgCard,color:picked.length ? C.bg : C.dimmer,border:"none",borderRadius:8,padding:".55rem",cursor:(saving||!picked.length)?"wait":"pointer",fontSize:12,fontWeight:800,fontFamily:FONT.body}}>
              {saving ? "Saving…" : `Post to ${rosterSize} player${rosterSize === 1 ? "" : "s"}`}
            </button>
            <button onClick={() => { setShowForm(false); setErr(""); }}
              style={{background:"none",color:C.dim,border:`1px solid ${C.border}`,borderRadius:8,padding:".55rem .85rem",cursor:"pointer",fontSize:12,fontFamily:FONT.body}}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{fontSize:11,color:C.dimmer,padding:".5rem 0"}}>Loading…</div>
      ) : challenges.length === 0 ? (
        <div style={{fontSize:11,color:C.dimmer,padding:".5rem 0",fontStyle:"italic"}}>
          No challenges yet. Fixed-quiz challenges everyone on the team takes — great for a "who scores best this week" moment.
        </div>
      ) : challenges.map(c => {
        const results = resultsByChallenge[c.id] || [];
        const done = results.length;
        const topScore = results[0]?.score;
        const isOpen = expanded === c.id;
        return (
          <div key={c.id} style={{background:C.bgElevated,border:`1px solid ${C.border}`,borderRadius:8,padding:".6rem .75rem",marginBottom:".4rem"}}>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:".5rem"}}>
              <button onClick={() => setExpanded(isOpen ? null : c.id)}
                style={{flex:1,minWidth:0,background:"none",border:"none",color:C.white,textAlign:"left",cursor:"pointer",padding:0,fontFamily:FONT.body}}>
                <div style={{fontSize:13,fontWeight:700,color:C.white,lineHeight:1.3}}>{c.title}</div>
                <div style={{fontSize:10,color:C.dimmer,marginTop:4,display:"flex",gap:".75rem",flexWrap:"wrap"}}>
                  <span>✅ {done}/{rosterSize} completed</span>
                  {topScore !== undefined && <span style={{color:C.gold,fontWeight:700}}>🏆 top {topScore}%</span>}
                  {c.due_date && <span>📅 {new Date(c.due_date).toLocaleDateString(undefined,{month:"short",day:"numeric"})}</span>}
                  <span>{c.question_ids.length} Qs</span>
                </div>
              </button>
              <button onClick={() => remove(c.id)} title="Delete"
                style={{background:"none",border:"none",color:C.dimmer,fontSize:14,cursor:"pointer",padding:"2px 6px",lineHeight:1,flexShrink:0}}>
                ✕
              </button>
            </div>
            {isOpen && (
              <div style={{marginTop:".55rem",paddingTop:".55rem",borderTop:`1px solid ${C.border}`}}>
                <div style={{fontSize:10,color:C.dimmer,fontWeight:700,letterSpacing:".06em",textTransform:"uppercase",marginBottom:".3rem"}}>
                  Leaderboard
                </div>
                {results.length === 0 ? (
                  <div style={{fontSize:11,color:C.dimmer,fontStyle:"italic"}}>Nobody's submitted yet.</div>
                ) : results.map((r, i) => (
                  <div key={r.player_id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:11,padding:"3px 0"}}>
                    <span style={{display:"flex",alignItems:"center",gap:".4rem",minWidth:0,overflow:"hidden"}}>
                      <span style={{color:i===0?C.gold:C.dimmer,fontWeight:800,width:16,textAlign:"right"}}>{i+1}.</span>
                      <span style={{color:C.white,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{r.name}</span>
                    </span>
                    <span style={{color:r.score >= 80 ? C.green : r.score >= 60 ? C.gold : C.red,fontWeight:800,flexShrink:0}}>{r.score}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
// PLAYER-HOME CARD
// ─────────────────────────────────────────────

export function ChallengeCard({ playerId, demoMode, onStart }) {
  const [challenges, setChallenges] = useState([]);
  const [done, setDone] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (demoMode || !playerId) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      const [list, completions] = await Promise.all([
        SB.getChallengesForPlayer(playerId),
        SB.getChallengeCompletionsForPlayer(playerId),
      ]);
      if (cancelled) return;
      setChallenges(list);
      setDone(completions);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [playerId, demoMode]);

  if (demoMode || loading) return null;
  const open = challenges.filter(c => !done.has(c.id));
  if (open.length === 0) return null;

  return (
    <Card style={{marginBottom:"1rem",background:`linear-gradient(135deg,rgba(252,76,2,.12),rgba(207,69,32,.04))`,border:`1px solid ${C.goldBorder}`}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:".5rem"}}>
        <Label style={{marginBottom:0}}>🏆 Team Challenge</Label>
        <span style={{fontSize:11,color:C.dimmer,fontWeight:600}}>{open.length} open</span>
      </div>
      {open.slice(0, 2).map(c => (
        <button key={c.id} onClick={() => onStart(c)}
          style={{width:"100%",textAlign:"left",padding:".7rem .85rem",background:C.bgElevated,border:`1px solid ${C.border}`,borderRadius:8,marginBottom:".4rem",cursor:"pointer",fontFamily:FONT.body,color:C.white,display:"flex",alignItems:"center",gap:".65rem"}}>
          <span style={{fontSize:22,flexShrink:0}}>🏆</span>
          <span style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:700,lineHeight:1.3}}>{c.title}</div>
            <div style={{fontSize:10,color:C.dimmer,marginTop:3,display:"flex",gap:".75rem",flexWrap:"wrap"}}>
              <span>{c.question_ids.length} questions · same for whole team</span>
              {c.teams?.name && <span>🏒 {c.teams.name}</span>}
              {c.due_date && <span>📅 {new Date(c.due_date).toLocaleDateString(undefined,{month:"short",day:"numeric"})}</span>}
            </div>
          </span>
          <span style={{color:C.gold,fontSize:13,fontWeight:800,flexShrink:0}}>Take it →</span>
        </button>
      ))}
    </Card>
  );
}

// ─────────────────────────────────────────────
// PLAYER-SIDE RUN SCREEN
// ─────────────────────────────────────────────

export function ChallengeRunScreen({ challenge, playerId, onBack, onDone }) {
  const [qb, setQb] = useState(null);
  const [idx, setIdx] = useState(0);
  const [sel, setSel] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [answers, setAnswers] = useState([]); // [{id, cat, ok}]
  const [submitting, setSubmitting] = useState(false);
  const [leaderboard, setLeaderboard] = useState(null);

  useEffect(() => { loadQB().then(setQb); }, []);

  if (!qb) {
    return (
      <div style={{minHeight:"100vh",background:C.bg,color:C.dimmer,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT.body}}>
        Loading…
      </div>
    );
  }

  const questions = challenge.question_ids.map(id => findQ(qb, id)).filter(Boolean);
  if (questions.length === 0) {
    return (
      <div style={{minHeight:"100vh",background:C.bg,color:C.white,fontFamily:FONT.body,padding:"2rem 1rem",textAlign:"center"}}>
        <div style={{fontSize:14,color:C.dim,marginBottom:"1rem"}}>This challenge's questions are no longer in the bank.</div>
        <button onClick={onBack} style={{background:C.gold,color:C.bg,border:"none",borderRadius:10,padding:".7rem 1.25rem",cursor:"pointer",fontWeight:800,fontSize:13,fontFamily:FONT.body}}>← Back</button>
      </div>
    );
  }

  const q = questions[idx];
  const total = questions.length;
  const isMC = q.type === "mc" || !q.type;
  const isTF = q.type === "tf";

  function choose(val) {
    if (answered) return;
    setSel(val);
    setAnswered(true);
    const ok = isTF ? (val === q.ok) : (val === q.ok);
    setAnswers(a => [...a, { id: q.id, cat: q.cat, ok }]);
  }

  async function next() {
    if (idx + 1 < total) {
      setIdx(idx + 1);
      setSel(null);
      setAnswered(false);
      return;
    }
    // Done. Compute score, submit.
    const score = Math.round((answers.filter(a => a.ok).length / answers.length) * 100);
    setSubmitting(true);
    try {
      await SB.submitChallengeResult(challenge.id, playerId, { score, results: answers });
      const lb = await SB.getChallengeResults(challenge.id);
      setLeaderboard({ score, board: lb });
    } catch (e) {
      setLeaderboard({ score, board: [], error: e?.message || "Could not submit" });
    }
    setSubmitting(false);
  }

  if (leaderboard) {
    const myRank = leaderboard.board.findIndex(r => r.player_id === playerId) + 1;
    return (
      <div style={{minHeight:"100vh",background:C.bg,color:C.white,fontFamily:FONT.body,padding:"2rem 1.25rem",maxWidth:560,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:"1.5rem"}}>
          <div style={{fontSize:48,marginBottom:".25rem"}}>🏆</div>
          <div style={{fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:C.gold,fontWeight:700,marginBottom:".3rem"}}>Challenge complete</div>
          <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"2.4rem",color:C.gold,lineHeight:1}}>{leaderboard.score}%</div>
          {myRank > 0 && <div style={{fontSize:12,color:C.dim,marginTop:".35rem"}}>#{myRank} of {leaderboard.board.length} teammates so far</div>}
          {leaderboard.error && <div style={{fontSize:11,color:C.red,marginTop:".5rem"}}>{leaderboard.error}</div>}
        </div>
        {leaderboard.board.length > 0 && (
          <Card style={{marginBottom:"1rem"}}>
            <Label>Leaderboard</Label>
            {leaderboard.board.slice(0, 10).map((r, i) => {
              const isMe = r.player_id === playerId;
              return (
                <div key={r.player_id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:12,padding:"4px 0",color:isMe?C.white:C.dim,fontWeight:isMe?700:500}}>
                  <span style={{display:"flex",alignItems:"center",gap:".5rem"}}>
                    <span style={{color:i===0?C.gold:isMe?C.white:C.dimmer,fontWeight:800,width:18}}>{i+1}.</span>
                    <span>{r.name}{isMe ? " (you)" : ""}</span>
                  </span>
                  <span style={{color:r.score >= 80 ? C.green : r.score >= 60 ? C.gold : C.red,fontWeight:800}}>{r.score}%</span>
                </div>
              );
            })}
          </Card>
        )}
        <button onClick={onDone} style={{width:"100%",background:C.gold,color:C.bg,border:"none",borderRadius:10,padding:".9rem",cursor:"pointer",fontWeight:800,fontSize:14,fontFamily:FONT.body}}>
          Back to home
        </button>
      </div>
    );
  }

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.white,fontFamily:FONT.body,paddingBottom:60}}>
      <div style={{position:"sticky",top:0,background:"rgba(6,12,22,.95)",backdropFilter:"blur(8px)",borderBottom:`1px solid ${C.border}`,padding:".75rem 1rem",zIndex:20}}>
        <div style={{maxWidth:560,margin:"0 auto",display:"flex",alignItems:"center",gap:"1rem"}}>
          <button onClick={onBack} style={{background:"none",border:`1px solid ${C.border}`,color:C.dimmer,borderRadius:8,padding:".3rem .7rem",cursor:"pointer",fontSize:13,fontFamily:FONT.body}}>←</button>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:14,color:C.gold,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>🏆 {challenge.title}</div>
            <div style={{fontSize:10,color:C.dimmer,marginTop:2}}>Question {idx+1} of {total}</div>
          </div>
          <div style={{width:80,height:4,background:C.bgElevated,borderRadius:2,overflow:"hidden"}}>
            <div style={{width:`${((idx + (answered ? 1 : 0)) / total) * 100}%`,height:"100%",background:C.gold,borderRadius:2,transition:"width .3s"}}/>
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
            {[true, false].map(v => {
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
              const isRight = answered && i === q.correct;
              const actualOk = typeof q.correct === "number" ? q.correct : q.ok;
              const rightIdx = typeof q.correct === "number" ? q.correct : q.ok;
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
          <Card style={{background: answers[answers.length-1]?.ok ? "rgba(34,197,94,.06)" : "rgba(239,68,68,.06)", border:`1px solid ${answers[answers.length-1]?.ok ? C.greenBorder : C.redBorder}`,marginBottom:"1rem"}}>
            <div style={{fontSize:11,fontWeight:800,color:answers[answers.length-1]?.ok?C.green:C.red,marginBottom:".4rem",letterSpacing:".06em"}}>
              {answers[answers.length-1]?.ok ? "✓ Correct" : "✗ Incorrect"}
            </div>
            {q.why && <div style={{fontSize:13,color:C.dim,lineHeight:1.6,marginBottom:q.tip?".45rem":0}}>{q.why}</div>}
            {q.tip && <div style={{fontSize:12,color:C.dimmer,lineHeight:1.55,fontStyle:"italic"}}>💡 {q.tip}</div>}
          </Card>
        )}

        {answered && (
          <button onClick={next} disabled={submitting}
            style={{width:"100%",background:C.gold,color:C.bg,border:"none",borderRadius:12,padding:".9rem",cursor:submitting?"wait":"pointer",fontWeight:800,fontSize:14,fontFamily:FONT.body}}>
            {submitting ? "Submitting…" : idx + 1 < total ? "Next question →" : "Finish & see leaderboard →"}
          </button>
        )}
      </div>
    </div>
  );
}
