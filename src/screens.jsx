// Cold-path screens — code-split out of App.jsx so they don't ship with the first paint.
// These are only loaded when the user navigates to them.

import { useState, useEffect, useRef } from "react";
import * as SB from "./supabase";
import {
  C, FONT, LEVELS,
  Screen, Card, Pill, Label, PrimaryBtn, BackBtn, ProgressBar, StickyHeader,
  SEASONS,
} from "./shared.jsx";
import { loadQB } from "./qbLoader.js";
import {
  COMPETENCIES, calcCompetencyScores, calcGameSenseScore, getMonthlyTrend,
  getPeerStats, calcPercentileRank, getPositioningJourneyState, GAME_SENSE_UNLOCK_SESSIONS,
} from "./utils/gameSense.js";
import { calcPlayerProfile, PROFILE_AXES } from "./utils/playerProfile.js";
import { getTrainingLog } from "./utils/trainingLog.js";
import { getParentRatings, saveParentRatings, PARENT_DIMENSIONS, PARENT_SCALE } from "./utils/parentAssessment.js";
import { AGES, LEVEL_FOR_AGE, ALL_TYPES, RECOMMENDED_TYPES_BY_AGE, TYPE_LABELS, isOffAgeType, blankQuestion } from "./utils/ageQuestionTypes.js";
import { SKILLS, RATING_SCALES, getSelfScale, getScaleColor } from "./data/constants.js";
import { deriveLevelFromBirthYear, validBirthYears } from "./utils/ageGroup.js";
import { isEphemeralPlayer } from "./utils/devBypass.js";

async function loadTeamData(coachCode, season) {
  if (!window.storage) return [];
  const key = "team:" + coachCode.toUpperCase() + ":" + season.replace("-","");
  try { const r = await window.storage.get(key, true); return r ? JSON.parse(r.value) : []; }
  catch(e) { return []; }
}

// ─────────────────────────────────────────────────────────
// AdminReports
// ─────────────────────────────────────────────────────────
export function AdminReports({ onBack }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qbFlat, setQbFlat] = useState([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [data, qb] = await Promise.all([SB.getQuestionReports(), loadQB()]);
      setReports(data);
      setQbFlat(Object.values(qb).flat());
      setLoading(false);
    })();
  }, []);

  async function handleResolve(id) {
    const ok = await SB.resolveReport(id);
    if (ok) setReports(prev => prev.map(r => r.id === id ? { ...r, resolved: true } : r));
  }

  const unresolvedCount = reports.filter(r => !r.resolved).length;
  function getQuestionText(questionId) {
    const q = qbFlat.find(x => x.id === questionId);
    return q ? (q.q || q.question || q.prompt || JSON.stringify(q).slice(0, 120)) : null;
  }

  return (
    <Screen>
      <BackBtn onClick={onBack} />
      <div style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: "1.8rem", marginBottom: ".5rem" }}>Question Reports</div>
      <div style={{ fontSize: 13, color: C.dim, marginBottom: "1.25rem" }}>
        {loading ? "Loading..." : `${unresolvedCount} unresolved report${unresolvedCount !== 1 ? "s" : ""}`}
      </div>
      {!loading && reports.length === 0 && (
        <Card><div style={{ color: C.dimmer, textAlign: "center", padding: "1.5rem 0" }}>No reports yet.</div></Card>
      )}
      {reports.map(r => {
        const qText = getQuestionText(r.question_id);
        return (
          <Card key={r.id} style={{ marginBottom: ".75rem", border: `1px solid ${r.resolved ? C.greenBorder : C.redBorder}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".5rem" }}>
              <Pill color={r.resolved ? C.green : C.red}>{r.resolved ? "Resolved" : "Open"}</Pill>
              <span style={{ fontSize: 11, color: C.dimmer }}>{new Date(r.created_at).toLocaleDateString()}</span>
            </div>
            <Label>Question ID</Label>
            <div style={{ fontSize: 13, color: C.white, marginBottom: ".5rem", wordBreak: "break-all" }}>{r.question_id}</div>
            {qText && (
              <>
                <Label>Question Text</Label>
                <div style={{ fontSize: 12, color: C.dim, marginBottom: ".5rem", lineHeight: 1.5, background: C.bgElevated, borderRadius: 8, padding: ".6rem .75rem", border: `1px solid ${C.border}` }}>{qText}</div>
              </>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".5rem", marginBottom: ".5rem" }}>
              <div><Label>Level</Label><div style={{ fontSize: 13, color: C.dim }}>{r.level || "—"}</div></div>
              <div><Label>Reason</Label><div style={{ fontSize: 13, color: C.gold }}>{r.reason || "—"}</div></div>
            </div>
            {r.detail && (
              <>
                <Label>Detail</Label>
                <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.5, marginBottom: ".5rem" }}>{r.detail}</div>
              </>
            )}
            {!r.resolved && (
              <button onClick={() => handleResolve(r.id)} style={{
                background: C.greenDim, color: C.green, border: `1px solid ${C.greenBorder}`,
                borderRadius: 10, padding: ".55rem", cursor: "pointer", fontSize: 13,
                fontFamily: FONT.body, fontWeight: 700, width: "100%", marginTop: ".25rem"
              }}>Mark Resolved</button>
            )}
          </Card>
        );
      })}
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────
// CoachDashboard
// ─────────────────────────────────────────────────────────
export function CoachDashboard({ onBack }) {
  const [code, setCode] = useState("");
  const [season, setSeason] = useState(SEASONS[0]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [qbFlat, setQbFlat] = useState([]);
  useEffect(() => { loadQB().then(qb => setQbFlat(Object.values(qb).flat())); }, []);

  async function load() {
    if (!code.trim()) { setErr("Enter your coach code"); return; }
    setLoading(true); setErr("");
    try { const sessions = await loadTeamData(code.trim(), season); setData(sessions); }
    catch(e) { setErr("Could not load data"); }
    setLoading(false);
  }

  let agg = null;
  if (data && data.length > 0) {
    const qStats = {}, catStats = {};
    data.forEach(session => session.qs.forEach(q => {
      if (!qStats[q.id]) qStats[q.id] = {ok:0,tot:0,cat:q.cat,d:q.d};
      qStats[q.id].tot++; if(q.ok) qStats[q.id].ok++;
      if (!catStats[q.cat]) catStats[q.cat] = {ok:0,tot:0};
      catStats[q.cat].tot++; if(q.ok) catStats[q.cat].ok++;
    }));
    const avgIQ = Math.round(data.reduce((s,d)=>s+d.iq,0)/data.length);
    const sorted = Object.entries(qStats).map(([id,v])=>({id,...v,pct:Math.round((v.ok/v.tot)*100)})).sort((a,b)=>a.pct-b.pct);
    agg = { sessions:data.length, avgIQ, qStats:sorted, catStats };
  }

  return (
    <Screen>
      <BackBtn onClick={onBack}/>
      <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"2rem",marginBottom:"1.5rem"}}>Coach Dashboard</div>
      <Card style={{marginBottom:"1rem"}}>
        <Label>Season</Label>
        <div style={{display:"flex",gap:".5rem",marginBottom:"1rem",flexWrap:"wrap"}}>
          {SEASONS.map(ss=><button key={ss} onClick={()=>{setSeason(ss);setData(null);}} style={{background:season===ss?C.goldDim:C.bgElevated,border:`1px solid ${season===ss?C.gold:C.border}`,borderRadius:8,padding:".4rem .8rem",cursor:"pointer",fontSize:12,fontFamily:FONT.body,fontWeight:season===ss?700:400,color:season===ss?C.gold:C.dim}}>{ss}</button>)}
        </div>
        <div style={{display:"flex",gap:".75rem"}}>
          <input value={code} onChange={e=>{setCode(e.target.value.toUpperCase());setData(null);setErr("");}} placeholder="Coach code" maxLength={8}
            style={{background:C.bgElevated,border:`1px solid ${err?C.red:code?C.gold:C.border}`,borderRadius:8,padding:".65rem .9rem",color:C.white,fontSize:15,fontFamily:FONT.body,flex:1,outline:"none",letterSpacing:".1em",fontWeight:700}}/>
          <button onClick={load} disabled={loading} style={{background:C.gold,color:C.bg,border:"none",borderRadius:8,padding:".65rem 1.25rem",cursor:"pointer",fontWeight:800,fontSize:14,fontFamily:FONT.body,whiteSpace:"nowrap"}}>{loading?"…":"Load"}</button>
        </div>
        {err && <div style={{fontSize:12,color:C.red,marginTop:".5rem"}}>{err}</div>}
        <div style={{fontSize:11,color:C.dimmer,marginTop:".65rem",lineHeight:1.6}}>Anonymous patterns only — no individual data ever stored.</div>
      </Card>
      {data && data.length === 0 && <Card><div style={{color:C.dimmer,textAlign:"center",padding:"1rem 0"}}>No sessions for this code in {season} yet.</div></Card>}
      {agg && (<>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".75rem",marginBottom:"1rem"}}>
          <Card style={{textAlign:"center"}}><Label>Sessions</Label><div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"2.8rem",color:C.gold}}>{agg.sessions}</div></Card>
          <Card style={{textAlign:"center"}}><Label>Team Avg GS</Label><div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"2.8rem",color:agg.avgIQ>=80?C.green:agg.avgIQ>=60?C.yellow:C.red}}>{agg.avgIQ}%</div></Card>
        </div>
        <Card style={{marginBottom:"1rem"}}>
          <Label>By Category — Worst First</Label>
          {Object.entries(agg.catStats).sort((a,b)=>(a[1].ok/a[1].tot)-(b[1].ok/b[1].tot)).map(([cat,v])=>{
            const pct=Math.round((v.ok/v.tot)*100);
            return(<div key={cat} style={{marginBottom:".85rem"}}><div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:5}}><span style={{color:C.dim}}>{cat}</span><span style={{fontWeight:700,color:pct>=80?C.green:pct>=60?C.yellow:C.red}}>{pct}%</span></div><ProgressBar value={pct} max={100} color={pct>=80?C.green:pct>=60?C.yellow:C.red}/></div>);
          })}
        </Card>
        <Card>
          <Label>Hardest Questions</Label>
          {agg.qStats.slice(0,5).map(q=>{
            const qData = qbFlat.find(x=>x.id===q.id);
            return(<div key={q.id} style={{padding:".7rem 0",borderBottom:`1px solid ${C.border}`}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:".3rem"}}><Pill color={q.pct<40?C.red:C.yellow} bg={q.pct<40?"rgba(239,68,68,.12)":"rgba(234,179,8,.12)"}>{q.pct}%</Pill><span style={{fontSize:11,color:C.dimmer}}>{q.ok}/{q.tot} correct</span></div><div style={{fontSize:12,color:C.dim,lineHeight:1.5}}>{qData?.sit?.slice(0,90)}{qData?.sit?.length>90?"…":""}</div></div>);
          })}
        </Card>
      </>)}
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────
// ProfileSetup
// ─────────────────────────────────────────────────────────
// Three-step welcome wizard. Step 1 asks whether the signup is the player
// themselves or a parent/guardian filling in for a kid — that toggle drives
// pronoun copy on the remaining steps. Step 2 captures age either by
// division pick OR year-of-birth; if birth year is chosen, all downstream
// UI reads "Born YYYY" instead of "U11 / Atom". Step 3 is position.
export function ProfileSetup({ profile, onComplete }) {
  // Step 1 — "Who's signing up?"
  const [who, setWho] = useState(profile.signupMode || ""); // "self" | "parent"
  // Step 2 — age capture
  const [ageMode, setAgeMode] = useState("level");           // "level" | "birthYear"
  const [level, setLevel] = useState(profile.level || "");
  const [birthYear, setBirthYear] = useState(profile.birthYear || null);
  // Step 3 — position
  const [position, setPosition] = useState(profile.position || "");
  const [saving, setSaving] = useState(false);

  // Pronouns flex based on the step-1 answer so we're not saying "you or your
  // child" all the way through. Default to self-phrasing before step 1 picks.
  const subject       = who === "parent" ? "your child" : "you";
  const subjectCap    = who === "parent" ? "Your child" : "You";
  const possessive    = who === "parent" ? "their" : "your";

  // When the user enters a year of birth we need a level to slot them into
  // questions / SKILLS — derive it on the fly.
  const derivedLevel = birthYear ? deriveLevelFromBirthYear(birthYear) : null;
  const effectiveLevel = ageMode === "birthYear" ? derivedLevel : level;
  const ageDone = !!effectiveLevel;

  async function save() {
    setSaving(true);
    try {
      const patch = { level: effectiveLevel, position, signup_mode: who };
      if (ageMode === "birthYear") patch.birth_year = birthYear;
      // updateProfile passes everything through; if birth_year column doesn't
      // exist yet in Supabase, the save will error — caller logs and keeps
      // going so the user isn't blocked.
      try { await SB.updateProfile(profile.id, patch); } catch (e) { console.warn("[ProfileSetup] updateProfile:", e?.message || e); }
      onComplete({
        ...profile,
        level: effectiveLevel,
        position,
        signupMode: who,
        ...(ageMode === "birthYear" ? { birthYear } : {}),
      });
    } finally {
      setSaving(false);
    }
  }

  // ── Step 1: Who's signing up? ─────────────────────────────────────────
  if (!who) return (
    <Screen>
      <div style={{marginBottom:"2rem"}}>
        <div style={{fontSize:10,letterSpacing:".18em",color:C.gold,textTransform:"uppercase",fontWeight:700,marginBottom:".6rem"}}>Welcome · Step 1 of 3</div>
        <h2 style={{fontFamily:FONT.display,fontWeight:800,fontSize:"2rem",margin:"0 0 .35rem"}}>Who's signing up?</h2>
        <div style={{fontSize:13,color:C.dim,lineHeight:1.55}}>Three quick questions and we'll get you on the ice.</div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:".6rem"}}>
        <button onClick={()=>setWho("self")} style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:14,padding:"1.15rem 1.25rem",cursor:"pointer",color:C.white,fontFamily:FONT.body,textAlign:"left"}}>
          <div style={{fontSize:26,marginBottom:".2rem"}}>🏒</div>
          <div style={{fontSize:15,fontWeight:700,marginBottom:2}}>I'm the player</div>
          <div style={{fontSize:12,color:C.dim,lineHeight:1.5}}>Track my own skills, quizzes, and goals.</div>
        </button>
        <button onClick={()=>setWho("parent")} style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:14,padding:"1.15rem 1.25rem",cursor:"pointer",color:C.white,fontFamily:FONT.body,textAlign:"left"}}>
          <div style={{fontSize:26,marginBottom:".2rem"}}>👪</div>
          <div style={{fontSize:15,fontWeight:700,marginBottom:2}}>I'm a parent or guardian</div>
          <div style={{fontSize:12,color:C.dim,lineHeight:1.5}}>I'm tracking on behalf of my child.</div>
        </button>
      </div>
    </Screen>
  );

  // ── Step 2: Age (level picker OR birth year) ──────────────────────────
  if (!ageDone) return (
    <Screen>
      <div style={{marginBottom:"1.5rem"}}>
        <div style={{fontSize:10,letterSpacing:".18em",color:C.gold,textTransform:"uppercase",fontWeight:700,marginBottom:".6rem"}}>Step 2 of 3</div>
        <h2 style={{fontFamily:FONT.display,fontWeight:800,fontSize:"2rem",margin:"0 0 .35rem"}}>
          {ageMode === "birthYear"
            ? `What year ${who==="parent"?"was your child":"were you"} born?`
            : `What age group does ${subject} play?`}
        </h2>
        <div style={{fontSize:13,color:C.dim,lineHeight:1.55}}>
          {ageMode === "birthYear"
            ? `We'll slot ${subject} into the right division automatically.`
            : `Or enter a year of birth — ${possessive} age group will be calculated.`}
        </div>
      </div>

      {/* Mode toggle */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".4rem",marginBottom:"1rem"}}>
        <button onClick={()=>{ setAgeMode("level"); setBirthYear(null); }}
          style={{background:ageMode==="level"?C.goldDim:C.bgCard,border:`1px solid ${ageMode==="level"?C.gold:C.border}`,borderRadius:10,padding:".6rem",cursor:"pointer",color:ageMode==="level"?C.gold:C.dim,fontFamily:FONT.body,fontSize:12,fontWeight:ageMode==="level"?700:500}}>
          Division
        </button>
        <button onClick={()=>{ setAgeMode("birthYear"); setLevel(""); }}
          style={{background:ageMode==="birthYear"?C.goldDim:C.bgCard,border:`1px solid ${ageMode==="birthYear"?C.gold:C.border}`,borderRadius:10,padding:".6rem",cursor:"pointer",color:ageMode==="birthYear"?C.gold:C.dim,fontFamily:FONT.body,fontSize:12,fontWeight:ageMode==="birthYear"?700:500}}>
          Year of birth
        </button>
      </div>

      {ageMode === "level" ? (
        <div style={{display:"flex",flexDirection:"column",gap:".5rem"}}>
          {LEVELS.map(l => (
            <button key={l} onClick={()=>setLevel(l)} style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:12,padding:"1rem 1.25rem",cursor:"pointer",color:C.white,fontFamily:FONT.body,fontSize:15,textAlign:"left",fontWeight:600}}>
              {l}
            </button>
          ))}
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:".5rem"}}>
          {validBirthYears().map(y => (
            <button key={y} onClick={()=>setBirthYear(y)} style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:12,padding:"1rem 1.25rem",cursor:"pointer",color:C.white,fontFamily:FONT.body,fontSize:15,textAlign:"left",fontWeight:600}}>
              Born {y}
            </button>
          ))}
        </div>
      )}

      <div style={{marginTop:"1rem"}}>
        <button onClick={()=>setWho("")} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:10,padding:".7rem 1rem",cursor:"pointer",color:C.dimmer,fontSize:13,fontFamily:FONT.body}}>← Back</button>
      </div>
    </Screen>
  );

  // ── Step 3: Position ──────────────────────────────────────────────────
  const posOptions = [{p:"Forward",i:"⚡"},{p:"Defense",i:"🛡"},{p:"Goalie",i:"🧤"},{p:"Multiple",i:"🔀"}];
  return (
    <Screen>
      <div style={{marginBottom:"1.5rem"}}>
        <div style={{fontSize:10,letterSpacing:".18em",color:C.gold,textTransform:"uppercase",fontWeight:700,marginBottom:".6rem"}}>Step 3 of 3</div>
        <h2 style={{fontFamily:FONT.display,fontWeight:800,fontSize:"2rem",margin:"0 0 .35rem"}}>What position does {subject} play?</h2>
        <div style={{fontSize:12,color:C.dim,marginTop:".35rem"}}>
          {ageMode === "birthYear" ? `Born ${birthYear}` : effectiveLevel}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".75rem",marginBottom:"1.5rem"}}>
        {posOptions.map(({p,i}) => (
          <button key={p} onClick={()=>setPosition(p)} style={{background:position===p?C.goldDim:C.bgCard,border:`1px solid ${position===p?C.gold:C.border}`,borderRadius:14,padding:"1.25rem .75rem",cursor:"pointer",textAlign:"center",transition:"all .15s"}}>
            <div style={{fontSize:26,marginBottom:".4rem"}}>{i}</div>
            <div style={{fontSize:13,color:position===p?C.gold:C.dim,fontWeight:position===p?700:400,fontFamily:FONT.body}}>{p}</div>
          </button>
        ))}
      </div>
      <div style={{display:"flex",gap:".5rem"}}>
        <button onClick={()=>{ setLevel(""); setBirthYear(null); }} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:10,padding:".75rem 1rem",cursor:"pointer",color:C.dimmer,fontSize:13,fontFamily:FONT.body}}>← Back</button>
        <PrimaryBtn onClick={save} disabled={!position||saving} style={{flex:1,margin:0}}>{saving?"Saving…":"Finish Setup →"}</PrimaryBtn>
      </div>
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────
// PlansScreen
// ─────────────────────────────────────────────────────────
const PRO_BENEFITS = [
  {icon:"♾️", text:"Unlimited quiz taking"},
  {icon:"🎮", text:"All 5 question formats — sequence, spot the mistake, what happens next, true/false"},
  {icon:"🧠", text:"Adaptive engine — difficulty matches your level"},
  {icon:"🏆", text:"Weekly Challenge — new curated quiz every Monday"},
  {icon:"🏒", text:"Hockey specific goal setting with category tracking"},
  {icon:"👨‍🏫", text:"Requestable coach feedback"},
  {icon:"📰", text:"Unlimited NHL Insights"},
  {icon:"📊", text:"Full progress snapshots + Skills Map radar"},
  {icon:"♾️", text:"Unlimited session history"},
  {icon:"📅", text:"Season pass: September → March (renews each season)"},
];
const FAMILY_BENEFITS = [
  {icon:"👨‍👩‍👧", text:"Everything in Pro"},
  {icon:"👥", text:"Up to 3 player profiles on one plan (siblings or parent-managed kids)"},
  {icon:"🔀", text:"Each profile has its own age group, ratings, goals"},
  {icon:"📅", text:"Season pass: September → March (renews each season)"},
];
const TEAM_BENEFITS = [
  {icon:"👨‍🏫", text:"Everything in Pro"},
  {icon:"📋", text:"Coach dashboard — full roster view"},
  {icon:"⭐", text:"Per-player ratings & development notes for up to 20 players"},
  {icon:"📅", text:"Season pass: September → March (renews each season)"},
];

export function PlansScreen({ onBack, tier }) {
  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.white,fontFamily:FONT.body,paddingBottom:80}}>
      <StickyHeader>
        <div style={{maxWidth:560,margin:"0 auto",display:"flex",alignItems:"center",gap:"1rem"}}>
          <BackBtn onClick={onBack}/>
          <div style={{flex:1,fontFamily:FONT.display,fontWeight:800,fontSize:"1.1rem"}}>Plans & Pricing</div>
          <div style={{fontSize:11,color:C.dimmer}}>You're on {tier}</div>
        </div>
      </StickyHeader>
      <div style={{padding:"1.25rem",maxWidth:560,margin:"0 auto"}}>
        <Card style={{marginBottom:"1rem"}}>
          <Label>Free</Label>
          <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"2rem",color:C.white}}>$0</div>
          <div style={{fontSize:11,color:C.dimmer,marginBottom:".75rem"}}>Get started, one age group, basic questions</div>
          <div style={{fontSize:12,color:C.dim,lineHeight:1.7}}>✓ 1 age group (device-locked)<br/>✓ Multiple choice questions only<br/>✓ Last 5 sessions of history</div>
        </Card>

        <Card style={{marginBottom:"1rem",background:`linear-gradient(135deg,${C.bgCard},${C.bgElevated})`,border:`1px solid ${C.goldBorder}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:".5rem"}}>
            <Label>Pro</Label>
            <div style={{fontSize:10,background:C.goldDim,color:C.gold,padding:"2px 8px",borderRadius:4,fontWeight:800,letterSpacing:".08em"}}>MOST POPULAR</div>
          </div>
          <div style={{marginBottom:".75rem"}}>
            <div style={{fontSize:10,color:C.dimmer,marginBottom:".2rem"}}>Hockey Season (Sep–Mar)</div>
            <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.8rem",color:C.gold}}>$89.99</div>
          </div>
          {PRO_BENEFITS.map((b,i) => (
            <div key={i} style={{display:"flex",alignItems:"flex-start",gap:".55rem",padding:".3rem 0",fontSize:12,color:C.dim,lineHeight:1.5}}>
              <span style={{fontSize:14,flexShrink:0}}>{b.icon}</span><span>{b.text}</span>
            </div>
          ))}
        </Card>

        <Card style={{marginBottom:"1rem"}}>
          <Label>Family</Label>
          <div style={{marginBottom:".75rem"}}>
            <div style={{fontSize:10,color:C.dimmer,marginBottom:".2rem"}}>Hockey Season (Sep–Mar)</div>
            <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.8rem",color:C.white}}>$139.99</div>
          </div>
          <div style={{fontSize:11,color:C.dimmer,marginBottom:".75rem"}}>Includes 3 profiles</div>
          {FAMILY_BENEFITS.map((b,i) => (
            <div key={i} style={{display:"flex",alignItems:"flex-start",gap:".55rem",padding:".3rem 0",fontSize:12,color:C.dim,lineHeight:1.5}}>
              <span style={{fontSize:14,flexShrink:0}}>{b.icon}</span><span>{b.text}</span>
            </div>
          ))}
        </Card>

        <Card style={{marginBottom:"1rem"}}>
          <Label>Team</Label>
          <div style={{display:"flex",flexDirection:"column",gap:".4rem",marginBottom:".75rem"}}>
            <div><div style={{fontSize:10,color:C.dimmer,marginBottom:".2rem"}}>Hockey Season (Sep–Mar)</div><div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.8rem",color:C.white}}>$249.99</div></div>
            <div style={{fontSize:11,color:C.dimmer}}>Covers entire competitive season</div>
          </div>
          <div style={{fontSize:11,color:C.dimmer,marginBottom:".75rem"}}>Up to 20 players · Coach dashboard</div>
          {TEAM_BENEFITS.map((b,i) => (
            <div key={i} style={{display:"flex",alignItems:"flex-start",gap:".55rem",padding:".3rem 0",fontSize:12,color:C.dim,lineHeight:1.5}}>
              <span style={{fontSize:14,flexShrink:0}}>{b.icon}</span><span>{b.text}</span>
            </div>
          ))}
        </Card>

        <div style={{textAlign:"center",marginTop:"1rem"}}>
          <div style={{fontSize:11,color:C.dimmer,marginBottom:".75rem",lineHeight:1.6}}>Online payment coming soon — get early access now.</div>
          <a href="mailto:mtslifka@gmail.com?subject=Ice-IQ Pro Early Access" style={{display:"inline-block",background:C.gold,color:C.bg,border:"none",borderRadius:10,padding:".65rem 1.5rem",cursor:"pointer",fontWeight:800,fontSize:13,fontFamily:FONT.body,textDecoration:"none"}}>Contact us for early access →</a>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// SPIDER CHART
// ─────────────────────────────────────────────────────────
function SpiderChart({ scores }) {
  const competencyKeys = Object.keys(COMPETENCIES);
  const n = competencyKeys.length;
  const angleSlice = (Math.PI * 2) / n;
  const radius = 100;
  const centerX = 150, centerY = 150;

  const points = competencyKeys.map((key, i) => {
    const angle = angleSlice * i - Math.PI / 2;
    const value = scores[key] || 0;
    const r = (value / 100) * radius;
    return {
      x: centerX + r * Math.cos(angle),
      y: centerY + r * Math.sin(angle),
      key,
    };
  });

  const axisPoints = competencyKeys.map((key, i) => {
    const angle = angleSlice * i - Math.PI / 2;
    const r = radius;
    return {
      x: centerX + r * Math.cos(angle),
      y: centerY + r * Math.sin(angle),
      key,
    };
  });

  return (
    <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
      <svg width="300" height="300" viewBox="0 0 300 300" style={{ maxWidth: "100%" }}>
        {axisPoints.map((pt, i) => (
          <line key={`axis-${i}`}
            x1={centerX} y1={centerY}
            x2={pt.x} y2={pt.y}
            stroke={C.border} strokeWidth="1" />
        ))}

        {[25, 50, 75, 100].map(pct => {
          const r = (pct / 100) * radius;
          return (
            <circle key={`ring-${pct}`}
              cx={centerX} cy={centerY} r={r}
              fill="none" stroke={C.dimmest} strokeWidth="1" />
          );
        })}

        <polygon
          points={points.map(p => `${p.x},${p.y}`).join(" ")}
          fill={`rgba(207,69,32,0.2)`}
          stroke={C.gold}
          strokeWidth="2" />

        {axisPoints.map((pt, i) => {
          const comp = COMPETENCIES[competencyKeys[i]];
          const angle = angleSlice * i - Math.PI / 2;
          const labelR = radius + 30;
          const labelX = centerX + labelR * Math.cos(angle);
          const labelY = centerY + labelR * Math.sin(angle);
          return (
            <g key={`label-${i}`}>
              <text x={labelX} y={labelY} textAnchor="middle" dominantBaseline="middle"
                style={{ fontSize: "12px", fontWeight: 700, fill: C.white, fontFamily: FONT.body }}>
                {comp.icon}
              </text>
              <text x={labelX} y={labelY + 14} textAnchor="middle"
                style={{ fontSize: "10px", fill: C.dimmer, fontFamily: FONT.body }}>
                {scores[competencyKeys[i]]}%
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// PLAYER PROFILE CARD (Layer 2)
// ─────────────────────────────────────────────────────────
function PlayerProfileCard({ player, coachRatings, parentRatings, onNavigate }) {
  const log = getTrainingLog(player.id);
  const trainingSessions = player.trainingSessions || log.sessions || [];
  const journey = getPositioningJourneyState(player.quizHistory || []);
  const profile = calcPlayerProfile(player, {
    coachRatings,
    parentRatings,
    trainingSessions,
    journeyAttempts: journey.attempts || 0,
  });

  const emptyCta = (axisKey) => {
    if (axisKey === "technical") return { text: "Coach hasn't added ratings yet", target: null };
    if (axisKey === "compete")   return { text: "Add Parent's View →", target: "parent" };
    if (axisKey === "habits")    return { text: "Log your first training session →", target: "profile" };
    return { text: "", target: null };
  };

  return (
    <Card style={{ marginBottom: "1rem" }}>
      <Label>Player Profile</Label>
      <div style={{ fontSize: "10px", color: C.dimmer, marginBottom: ".75rem", lineHeight: 1.4 }}>
        Off-ice signals: coach feedback, parent's view, and training volume.
      </div>
      {Object.entries(PROFILE_AXES).map(([key, axis]) => {
        const score = profile[key];
        const isEmpty = score === null || score === undefined;
        const cta = emptyCta(key);
        return (
          <div key={key} style={{ marginBottom: ".75rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: ".3rem" }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: C.white }}>
                <span style={{ marginRight: ".4rem" }}>{axis.icon}</span>{axis.name}
              </div>
              {!isEmpty && (
                <div style={{ fontSize: "11px", fontWeight: 700, color: C.gold }}>{score}%</div>
              )}
            </div>
            {isEmpty ? (
              cta.target ? (
                <button
                  onClick={() => onNavigate?.(cta.target)}
                  style={{ width: "100%", textAlign: "left", padding: ".5rem .65rem", background: C.bgElevated, border: `1px dashed ${C.border}`, borderRadius: 6, color: C.dim, fontSize: "11px", cursor: "pointer", fontFamily: "inherit" }}
                >
                  {cta.text}
                </button>
              ) : (
                <div style={{ padding: ".5rem .65rem", background: C.bgElevated, borderRadius: 6, color: C.dimmer, fontSize: "11px" }}>
                  {cta.text}
                </div>
              )
            ) : (
              <div style={{ height: "8px", background: C.bgElevated, borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${score}%`, background: axis.color, transition: "width .3s" }} />
              </div>
            )}
          </div>
        );
      })}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────
// GAME SENSE REPORT SCREEN
// ─────────────────────────────────────────────────────────
export function GameSenseReportScreen({ player, onBack, demoMode, demoCoachData, onNavigate }) {
  const competencyScores = calcCompetencyScores(player.quizHistory || []);
  const gsScore = calcGameSenseScore(competencyScores);
  const trend = getMonthlyTrend(player.quizHistory || []);
  const strongest = Object.entries(competencyScores).sort((a, b) => b[1] - a[1])[0];
  const needsWork = Object.entries(competencyScores).sort((a, b) => a[1] - b[1])[0];
  const totalSessions = (player.quizHistory || []).length;
  const scoreUnlocked = totalSessions >= GAME_SENSE_UNLOCK_SESSIONS;
  const remaining = Math.max(0, GAME_SENSE_UNLOCK_SESSIONS - totalSessions);

  const [peerStats, setPeerStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [coachRatings, setCoachRatings] = useState(null);

  useEffect(() => {
    async function load() {
      const stats = await getPeerStats(player.level, player.position);
      setPeerStats(stats);
      setLoading(false);
    }
    load();
  }, [player.level, player.position]);

  useEffect(() => {
    if (demoCoachData) {
      setCoachRatings(demoCoachData.ratings || null);
      return;
    }
    if (player.id && !isEphemeralPlayer(player.id)) {
      SB.getCoachRatingsForPlayer(player.id).then(data => {
        setCoachRatings(Object.keys(data.ratings || {}).length ? data.ratings : null);
      });
    }
  }, [player.id, demoCoachData]);

  const hardcodedPeerAvg = {
    positioning: 75, decision_making: 72, awareness: 68, tempo_control: 74, physicality: 80, leadership: 71,
  };

  const peerMean = peerStats?.mean || hardcodedPeerAvg;

  return (
    <Screen onBack={onBack} title="Game Sense Profile">
      <div style={{ padding: "1.5rem 1.25rem" }}>
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ textAlign: "center", marginBottom: "1rem" }}>
            {scoreUnlocked ? (
              <>
                <div style={{ fontSize: "2.5rem", fontWeight: 800, color: C.gold, fontFamily: FONT.display }}>
                  {gsScore}
                </div>
                <div style={{ fontSize: "12px", color: C.dimmer }}>Game Sense Score</div>
                {!loading && peerStats && (
                  <div style={{ fontSize: "11px", color: C.dimmer, marginTop: ".5rem" }}>
                    vs peer avg {calcGameSenseScore(peerMean)}
                  </div>
                )}
              </>
            ) : (
              <>
                <div style={{ fontSize: "2.2rem", fontFamily: FONT.display, fontWeight: 800, color: "rgba(255,255,255,.2)" }}>🔒</div>
                <div style={{ fontSize: "12px", color: C.dim, marginTop: ".4rem" }}>Game Sense Score</div>
                <div style={{ fontSize: "11px", color: C.dimmer, marginTop: ".4rem", lineHeight: 1.5 }}>
                  {remaining} more quiz{remaining===1?"":"zes"} to unlock your score · {totalSessions}/{GAME_SENSE_UNLOCK_SESSIONS} done
                </div>
              </>
            )}
          </div>
          <SpiderChart scores={competencyScores} />
        </div>

        <Card style={{ marginBottom: "1rem" }}>
          <Label>Competency Breakdown</Label>
          {Object.entries(competencyScores).map(([key, score]) => {
            const comp = COMPETENCIES[key];
            const peerAvg = peerMean[key] || 70;
            const diff = score - peerAvg;
            return (
              <div key={key} style={{ marginBottom: ".75rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: ".3rem" }}>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: C.white }}>
                    {comp.name}
                  </div>
                  <div style={{ fontSize: "10px", color: C.dimmer }}>
                    Avg: {peerAvg}%
                  </div>
                </div>
                <div style={{
                  height: "8px", background: C.bgElevated, borderRadius: 4, overflow: "hidden", marginBottom: ".25rem",
                }}>
                  <div style={{
                    height: "100%", width: `${score}%`, background: comp.color, transition: "width .3s",
                  }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: ".3rem", fontSize: "11px" }}>
                  <span style={{ fontWeight: 700, color: C.gold }}>{score}%</span>
                  <span style={{ color: diff > 0 ? C.green : diff < 0 ? C.red : C.dimmer }}>
                    {diff > 0 ? `+${diff}%` : diff < 0 ? `${diff}%` : "="}
                  </span>
                </div>
              </div>
            );
          })}
        </Card>

        <PlayerProfileCard
          player={player}
          coachRatings={coachRatings}
          parentRatings={getParentRatings(player.id)}
          onNavigate={onNavigate}
        />

        <Card style={{ marginBottom: "1rem" }}>
          <Label>Your Insights</Label>
          <div style={{ display: "flex", gap: "1rem" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "11px", color: C.dimmer, marginBottom: ".25rem" }}>Strongest</div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: C.green }}>
                {strongest ? COMPETENCIES[strongest[0]].name : "—"}
              </div>
              <div style={{ fontSize: "12px", color: C.white, fontWeight: 700, marginTop: ".25rem" }}>
                {strongest?.[1] || 0}%
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "11px", color: C.dimmer, marginBottom: ".25rem" }}>Needs Work</div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: C.red }}>
                {needsWork ? COMPETENCIES[needsWork[0]].name : "—"}
              </div>
              <div style={{ fontSize: "12px", color: C.white, fontWeight: 700, marginTop: ".25rem" }}>
                {needsWork?.[1] || 0}%
              </div>
            </div>
          </div>
        </Card>

        <Card style={{ marginBottom: "1rem" }}>
          <Label>Percentile Rank</Label>
          {loading ? (
            <div style={{ fontSize: "12px", color: C.dimmer }}>Calculating...</div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "12px", color: C.dimmer, marginBottom: ".5rem" }}>Overall Game Sense</div>
                <div style={{ fontSize: "2rem", fontWeight: 800, color: C.gold }}>
                  Top {100 - calcPercentileRank(gsScore, calcGameSenseScore(peerMean), 12)}%
                </div>
              </div>
              <div style={{ fontSize: "3rem", color: C.gold }}>🥇</div>
            </div>
          )}
        </Card>

        <Card>
          <Label>Game Sense Trend</Label>
          <div style={{ height: "150px", display: "flex", alignItems: "flex-end", gap: ".5rem", padding: "1rem 0" }}>
            {trend.map((week, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{
                  width: "100%", height: `${(week.score / 100) * 120}px`, background: C.gold, borderRadius: "4px 4px 0 0", marginBottom: ".25rem",
                }}>
                  <div style={{
                    height: "100%", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: ".3rem",
                  }}>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: C.bg }}>{week.score}</span>
                  </div>
                </div>
                <div style={{ fontSize: "9px", color: C.dimmer, textAlign: "center" }}>{week.label}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────
// PARENT ASSESSMENT SCREEN
// ─────────────────────────────────────────────────────────
export function ParentAssessmentScreen({ player, onBack, onSave, demoMode, onSignup }) {
  const level = player.level || "U11 / Atom";
  const existing = getParentRatings(player.id) || player.parentRatings || {};

  // Hooks must be called unconditionally — wizard state lives at the top.
  const [ratings, setRatings] = useState(() => {
    const seed = {};
    for (const d of PARENT_DIMENSIONS) seed[d.id] = existing[d.id] ?? null;
    return seed;
  });
  const [idx, setIdx] = useState(0);
  const [onSummary, setOnSummary] = useState(false);
  const total = PARENT_DIMENSIONS.length;

  // ── Demo mode: read-only summary + signup CTA ─────────────
  if (demoMode) {
    return (
      <div style={{minHeight:"100vh",background:C.bg,color:C.white,fontFamily:FONT.body,paddingBottom:120}}>
        <StickyHeader>
          <div style={{maxWidth:560,margin:"0 auto",display:"flex",alignItems:"center",gap:"1rem"}}>
            <BackBtn onClick={onBack}/>
            <div style={{flex:1}}>
              <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.1rem"}}>Sample Parent Assessment</div>
              <div style={{fontSize:11,color:C.dimmer}}>{level} · 8/8 answered (sample data)</div>
            </div>
          </div>
        </StickyHeader>

        <div style={{padding:"1.25rem",maxWidth:560,margin:"0 auto"}}>
          <Card style={{marginBottom:"1rem",background:`linear-gradient(135deg,${C.purpleDim},transparent)`,border:`1px solid ${C.purpleBorder}`}}>
            <Label>👀 Preview</Label>
            <div style={{fontSize:13,color:C.dim,lineHeight:1.6,marginTop:".4rem"}}>
              This is what a completed parent assessment looks like for {player.name}. Parents rate how their child shows up at the rink — character, habits, and attitude. Sign up to fill one out for your own player.
            </div>
          </Card>

          {PARENT_DIMENSIONS.map(dim => {
            const prompt = dim.prompts[level] || dim.prompts["U11 / Atom"];
            const val = existing[dim.id];
            const scaleOpt = PARENT_SCALE.find(s => s.value === val);
            return (
              <Card key={dim.id} style={{marginBottom:".75rem"}}>
                <div style={{display:"flex",alignItems:"center",gap:".55rem",marginBottom:".35rem"}}>
                  <span style={{fontSize:18}}>{dim.icon}</span>
                  <div style={{flex:1,fontFamily:FONT.display,fontWeight:800,fontSize:14,color:C.white}}>{dim.label}</div>
                  {scaleOpt && (
                    <span style={{background:`${scaleOpt.color}22`,border:`1px solid ${scaleOpt.color}`,color:scaleOpt.color,borderRadius:999,padding:".2rem .7rem",fontSize:11,fontWeight:800}}>
                      {scaleOpt.label}
                    </span>
                  )}
                </div>
                <div style={{fontSize:12,color:C.dim,lineHeight:1.6}}>{prompt}</div>
              </Card>
            );
          })}

          {onSignup && (
            <button onClick={onSignup} style={{marginTop:".75rem",width:"100%",background:`linear-gradient(135deg, ${C.gold}, #CF4520)`,color:C.bg,border:"none",borderRadius:12,padding:".9rem",cursor:"pointer",fontWeight:800,fontSize:14,fontFamily:FONT.body,letterSpacing:".02em",boxShadow:"0 4px 14px rgba(252,76,2,.25), inset 0 1px 0 rgba(255,255,255,.25)"}}>
              🏒 Sign up free to fill this out yourself →
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Real-user mode: step-through wizard ───────────────────
  function advance() {
    if (idx >= total - 1) setOnSummary(true);
    else setIdx(i => i + 1);
  }
  function goBack() {
    if (onSummary) setOnSummary(false);
    else if (idx > 0) setIdx(i => i - 1);
    else onBack();
  }
  function pick(id, value) {
    setRatings(r => ({ ...r, [id]: value }));
    setTimeout(advance, 150);
  }
  function skip(id) {
    setRatings(r => ({ ...r, [id]: null }));
    advance();
  }
  function handleSave() {
    saveParentRatings(player.id, ratings);
    onSave && onSave(ratings);
  }

  // Summary screen
  if (onSummary) {
    const answered = PARENT_DIMENSIONS.filter(d => ratings[d.id]);
    const skipped = PARENT_DIMENSIONS.filter(d => ratings[d.id] == null);
    return (
      <div style={{minHeight:"100vh",background:C.bg,color:C.white,fontFamily:FONT.body,paddingBottom:120}}>
        <StickyHeader>
          <div style={{maxWidth:560,margin:"0 auto",display:"flex",alignItems:"center",gap:"1rem"}}>
            <BackBtn onClick={goBack}/>
            <div style={{flex:1}}>
              <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.1rem"}}>Review Your Assessment</div>
              <div style={{fontSize:11,color:C.dimmer}}>{answered.length}/{total} answered · {skipped.length} skipped</div>
            </div>
          </div>
        </StickyHeader>

        <div style={{padding:"1.25rem",maxWidth:560,margin:"0 auto"}}>
          {answered.length > 0 && (
            <>
              <Label style={{marginBottom:".5rem"}}>Your answers</Label>
              {answered.map(dim => {
                const opt = PARENT_SCALE.find(s => s.value === ratings[dim.id]);
                return (
                  <Card key={dim.id} style={{marginBottom:".5rem"}}>
                    <div style={{display:"flex",alignItems:"center",gap:".55rem"}}>
                      <span style={{fontSize:16}}>{dim.icon}</span>
                      <div style={{flex:1,fontSize:13,color:C.white,fontWeight:600}}>{dim.label}</div>
                      <span style={{background:`${opt.color}22`,border:`1px solid ${opt.color}`,color:opt.color,borderRadius:999,padding:".2rem .7rem",fontSize:11,fontWeight:800}}>{opt.label}</span>
                    </div>
                  </Card>
                );
              })}
            </>
          )}

          {skipped.length > 0 && (
            <>
              <Label style={{marginTop:"1rem",marginBottom:".5rem"}}>Skipped</Label>
              {skipped.map(dim => (
                <Card key={dim.id} style={{marginBottom:".5rem",opacity:.6}}>
                  <div style={{display:"flex",alignItems:"center",gap:".55rem"}}>
                    <span style={{fontSize:16}}>{dim.icon}</span>
                    <div style={{flex:1,fontSize:13,color:C.dim,fontWeight:600}}>{dim.label}</div>
                    <button onClick={()=>{ setOnSummary(false); setIdx(PARENT_DIMENSIONS.indexOf(dim)); }} style={{background:"none",border:`1px solid ${C.border}`,color:C.dimmer,borderRadius:8,padding:".25rem .7rem",fontSize:11,cursor:"pointer",fontFamily:FONT.body}}>Answer now</button>
                  </div>
                </Card>
              ))}
            </>
          )}

          <button onClick={handleSave} disabled={answered.length === 0} style={{marginTop:"1.25rem",width:"100%",background:answered.length>0?C.gold:C.dimmest,color:answered.length>0?C.bg:C.dimmer,border:"none",borderRadius:12,padding:".9rem",cursor:answered.length>0?"pointer":"default",fontWeight:800,fontSize:14,fontFamily:FONT.body}}>
            Save assessment →
          </button>
          {answered.length === 0 && <div style={{fontSize:11,color:C.dimmer,textAlign:"center",marginTop:".5rem"}}>Answer at least one dimension to save.</div>}
        </div>
      </div>
    );
  }

  // Step-through screen for the current dimension
  const dim = PARENT_DIMENSIONS[idx];
  const prompt = dim.prompts[level] || dim.prompts["U11 / Atom"];
  const current = ratings[dim.id];
  const pct = ((idx) / total) * 100;

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.white,fontFamily:FONT.body,paddingBottom:120}}>
      <StickyHeader>
        <div style={{maxWidth:560,margin:"0 auto",display:"flex",alignItems:"center",gap:"1rem"}}>
          <BackBtn onClick={goBack}/>
          <div style={{flex:1}}>
            <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.1rem"}}>Parent Assessment</div>
            <div style={{fontSize:11,color:C.dimmer}}>{level} · Question {idx+1} of {total}</div>
          </div>
        </div>
        <div style={{maxWidth:560,margin:"0.5rem auto 0"}}>
          <div style={{height:4,background:C.bgElevated,borderRadius:2,overflow:"hidden"}}>
            <div style={{width:`${pct}%`,height:"100%",background:C.gold,transition:"width .3s"}}/>
          </div>
        </div>
      </StickyHeader>

      <div style={{padding:"1.25rem",maxWidth:560,margin:"0 auto"}}>
        {idx === 0 && (
          <Card style={{marginBottom:"1rem",background:`linear-gradient(135deg,${C.purpleDim},transparent)`,border:`1px solid ${C.purpleBorder}`}}>
            <Label>👋 For parents</Label>
            <div style={{fontSize:13,color:C.dim,lineHeight:1.6,marginTop:".4rem"}}>
              Rate how your child shows up at the rink — the character, habits, and attitude you see that a coach often can't. This isn't about skill; it's about who your child is becoming. Takes 2 minutes.
            </div>
          </Card>
        )}

        <Card style={{marginBottom:".85rem",padding:"1.25rem"}}>
          <div style={{display:"flex",alignItems:"center",gap:".6rem",marginBottom:".65rem"}}>
            <span style={{fontSize:28}}>{dim.icon}</span>
            <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:18,color:C.white}}>{dim.label}</div>
          </div>
          <div style={{fontSize:14,color:C.dim,lineHeight:1.6,marginBottom:"1rem"}}>{prompt}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:".5rem"}}>
            {PARENT_SCALE.map(opt => {
              const isActive = current === opt.value;
              return (
                <button key={opt.value} onClick={() => pick(dim.id, opt.value)} style={{
                  background: isActive ? `${opt.color}22` : C.bgElevated,
                  border: `1px solid ${isActive ? opt.color : C.border}`,
                  color: isActive ? opt.color : C.dim,
                  borderRadius: 10, padding: ".75rem .4rem", cursor: "pointer",
                  fontFamily: FONT.body, fontSize: 13, fontWeight: isActive ? 800 : 600,
                }}>{opt.label}</button>
              );
            })}
          </div>
          <button onClick={() => skip(dim.id)} style={{marginTop:".85rem",background:"none",border:"none",color:C.dimmer,fontSize:12,cursor:"pointer",fontFamily:FONT.body,width:"100%",textAlign:"center",padding:".3rem",textDecoration:"underline"}}>
            I'm not sure — skip this
          </button>
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// QuestionReviewScreen — admin-only curation workspace.
// Reads/writes review_questions table. See supabase/migration_0004.
// ─────────────────────────────────────────────────────────

const STATUSES = ["unreviewed", "keep", "flag", "kill"];
const STATUS_COLORS = {
  unreviewed: C.dimmer,
  keep: C.green,
  flag: C.gold,
  kill: C.red,
};
const STATUS_BG = {
  unreviewed: C.dimmest,
  keep: C.greenDim,
  flag: C.goldDim,
  kill: C.redDim,
};

function isEdited(row) {
  if (!row.original) return false; // tool-created rows: always considered "fresh" until edited
  try { return JSON.stringify(row.original) !== JSON.stringify(row.current); }
  catch { return false; }
}

export function QuestionReviewScreen({ onBack }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ age: "all", type: "all", status: "all" });
  const [visible, setVisible] = useState(100);
  const [showDashboard, setShowDashboard] = useState(true);
  const [adding, setAdding] = useState(false);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await SB.listReviewQuestions();
      setRows(data);
      setLoading(false);
    })();
  }, []);

  // Apply filters
  const filtered = rows.filter(r => {
    if (filters.age !== "all" && r.age !== filters.age) return false;
    const t = r.current?.type || "mc";
    if (filters.type !== "all" && t !== filters.type) return false;
    if (filters.status !== "all" && r.status !== filters.status) return false;
    return true;
  });

  // Dashboard stats
  const totals = { total: rows.length, unreviewed: 0, keep: 0, flag: 0, kill: 0, edited: 0 };
  const matrix = {}; // matrix[age][type] = { total, unreviewed, keep, flag, kill }
  for (const a of AGES) {
    matrix[a] = {};
    for (const t of ALL_TYPES) matrix[a][t] = { total: 0, unreviewed: 0, keep: 0, flag: 0, kill: 0 };
  }
  for (const r of rows) {
    totals[r.status] = (totals[r.status] || 0) + 1;
    if (isEdited(r)) totals.edited += 1;
    const t = r.current?.type || "mc";
    if (matrix[r.age] && matrix[r.age][t]) {
      matrix[r.age][t].total += 1;
      matrix[r.age][t][r.status] = (matrix[r.age][t][r.status] || 0) + 1;
    }
  }

  async function handleStatus(id, nextStatus) {
    // Toggle off if same status clicked twice → revert to unreviewed
    const row = rows.find(r => r.id === id);
    const target = row?.status === nextStatus ? "unreviewed" : nextStatus;
    setRows(prev => prev.map(r => r.id === id ? { ...r, status: target } : r));
    await SB.setReviewQuestionStatus(id, target);
  }

  async function handleReset(id) {
    if (!confirm("Reset this question (revert edits + clear status)?")) return;
    const updated = await SB.resetReviewQuestion(id);
    if (updated) setRows(prev => prev.map(r => r.id === id ? updated : r));
  }

  // Debounced edit: keeps a per-id timer so edits coalesce
  const saveTimersRef = useRef({});
  function handleCurrentChange(id, patch) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, current: { ...r.current, ...patch } } : r));
    clearTimeout(saveTimersRef.current[id]);
    saveTimersRef.current[id] = setTimeout(async () => {
      const row = (rowsRef.current || []).find(r => r.id === id);
      if (!row) return;
      await SB.updateReviewQuestionCurrent(id, row.current);
    }, 500);
  }

  // Keep a ref to current rows so the debounced closure reads the latest value
  const rowsRef = useRef(rows);
  useEffect(() => { rowsRef.current = rows; }, [rows]);

  async function handleCreate(newRow) {
    const created = await SB.createReviewQuestion(newRow);
    if (created) {
      setRows(prev => [...prev, created]);
      setAdding(false);
    }
  }

  return (
    <Screen>
      <BackBtn onClick={onBack} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: ".5rem" }}>
        <div style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: "1.8rem" }}>Question Review</div>
        <button onClick={() => setShowDashboard(s => !s)} style={{
          background: "transparent", color: C.dim, border: `1px solid ${C.border}`,
          borderRadius: 8, padding: ".35rem .6rem", cursor: "pointer", fontSize: 11,
          fontFamily: FONT.body, fontWeight: 700,
        }}>{showDashboard ? "Hide dashboard" : "Show dashboard"}</button>
      </div>
      <div style={{ fontSize: 12, color: C.dim, marginBottom: "1rem" }}>
        {loading ? "Loading…" : `${rows.length} questions loaded`}
      </div>

      {showDashboard && !loading && (
        <Card style={{ marginBottom: "1rem" }}>
          <Label>Dashboard</Label>
          {/* Status totals row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: ".5rem", marginBottom: ".75rem" }}>
            <StatTile label="Total" n={totals.total} color={C.white}/>
            <StatTile label="Unreviewed" n={totals.unreviewed} color={C.dim}/>
            <StatTile label="Keep" n={totals.keep} color={C.green}/>
            <StatTile label="Flag" n={totals.flag} color={C.gold}/>
            <StatTile label="Kill" n={totals.kill} color={C.red}/>
            <StatTile label="Edited" n={totals.edited} color={C.purple}/>
          </div>
          {/* Age × Type matrix */}
          <Label>Age × Type</Label>
          <div style={{ overflowX: "auto", marginTop: ".25rem" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, fontFamily: FONT.body }}>
              <thead>
                <tr>
                  <th style={thSt}></th>
                  {ALL_TYPES.map(t => (
                    <th key={t} style={thSt} title={TYPE_LABELS[t]}>{t.toUpperCase()}</th>
                  ))}
                  <th style={thSt}>Total</th>
                </tr>
              </thead>
              <tbody>
                {AGES.map(a => {
                  const rowTotal = ALL_TYPES.reduce((s, t) => s + matrix[a][t].total, 0);
                  return (
                    <tr key={a}>
                      <td style={{ ...tdSt, fontWeight: 800, color: C.white }}>{a.toUpperCase()}</td>
                      {ALL_TYPES.map(t => {
                        const cell = matrix[a][t];
                        const off = isOffAgeType(a, t) && cell.total > 0;
                        return (
                          <td key={t} style={{ ...tdSt, background: off ? C.redDim : "transparent" }}>
                            <div style={{ color: C.white, fontWeight: 700 }}>{cell.total}</div>
                            {cell.total > 0 && (
                              <div style={{ fontSize: 9, color: C.dimmer, lineHeight: 1.3 }}>
                                <span style={{ color: STATUS_COLORS.unreviewed }}>U:{cell.unreviewed}</span>{" "}
                                <span style={{ color: STATUS_COLORS.keep }}>K:{cell.keep}</span>{" "}
                                <span style={{ color: STATUS_COLORS.flag }}>F:{cell.flag}</span>{" "}
                                <span style={{ color: STATUS_COLORS.kill }}>X:{cell.kill}</span>
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td style={{ ...tdSt, color: C.dim, fontWeight: 700 }}>{rowTotal}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: 10, color: C.dimmer, marginTop: ".5rem" }}>
            Red-shaded cells = off-age type (not in the recommended type set for that age).
            U=unreviewed · K=keep · F=flag · X=kill
          </div>
        </Card>
      )}

      {/* Filter chips */}
      <Card style={{ marginBottom: "1rem" }}>
        <FilterRow label="Age"    value={filters.age}    options={["all", ...AGES]}     onChange={v => { setFilters(f => ({ ...f, age: v })); setVisible(100); }}/>
        <FilterRow label="Type"   value={filters.type}   options={["all", ...ALL_TYPES]} onChange={v => { setFilters(f => ({ ...f, type: v })); setVisible(100); }}/>
        <FilterRow label="Status" value={filters.status} options={["all", ...STATUSES]}  onChange={v => { setFilters(f => ({ ...f, status: v })); setVisible(100); }} colorMap={STATUS_COLORS}/>
        <button onClick={() => setAdding(a => !a)} style={{
          background: adding ? C.greenDim : C.purpleDim,
          color: adding ? C.green : C.purple,
          border: `1px solid ${adding ? C.greenBorder : C.purpleBorder}`,
          borderRadius: 10, padding: ".5rem", cursor: "pointer", fontSize: 12,
          fontFamily: FONT.body, fontWeight: 700, width: "100%", marginTop: ".75rem",
        }}>{adding ? "Cancel add" : "+ Add Question"}</button>
      </Card>

      {adding && (
        <AddQuestionForm
          defaultAge={filters.age !== "all" ? filters.age : "u5"}
          existingIds={rows.map(r => r.id)}
          onCancel={() => setAdding(false)}
          onCreate={handleCreate}
        />
      )}

      {/* Card list */}
      {!loading && filtered.slice(0, visible).map(row => (
        <ReviewCard
          key={row.id}
          row={row}
          expanded={!!expanded[row.id]}
          onToggle={() => setExpanded(e => ({ ...e, [row.id]: !e[row.id] }))}
          onStatus={(s) => handleStatus(row.id, s)}
          onReset={() => handleReset(row.id)}
          onEdit={(patch) => handleCurrentChange(row.id, patch)}
        />
      ))}

      {!loading && filtered.length > visible && (
        <button onClick={() => setVisible(v => v + 100)} style={{
          background: "transparent", color: C.dim, border: `1px dashed ${C.border}`,
          borderRadius: 10, padding: ".75rem", cursor: "pointer", fontSize: 12,
          fontFamily: FONT.body, fontWeight: 700, width: "100%",
        }}>Load more ({filtered.length - visible} remaining)</button>
      )}

      {!loading && filtered.length === 0 && (
        <Card><div style={{ color: C.dimmer, textAlign: "center", padding: "1.5rem 0" }}>
          No questions match these filters.
        </div></Card>
      )}
    </Screen>
  );
}

// ─── helpers: dashboard styling ───
const thSt = {
  fontSize: 10, color: C.dimmer, fontWeight: 700, padding: ".3rem .4rem",
  textAlign: "center", borderBottom: `1px solid ${C.border}`,
  letterSpacing: "0.05em", textTransform: "uppercase",
};
const tdSt = {
  padding: ".35rem .4rem", borderBottom: `1px solid ${C.border}`,
  textAlign: "center", verticalAlign: "middle",
};

function StatTile({ label, n, color }) {
  return (
    <div style={{
      background: C.bgElevated, border: `1px solid ${C.border}`,
      borderRadius: 8, padding: ".5rem", textAlign: "center",
    }}>
      <div style={{ fontSize: 20, color, fontWeight: 800, fontFamily: FONT.display, lineHeight: 1 }}>{n}</div>
      <div style={{ fontSize: 9, color: C.dimmer, marginTop: ".2rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}

function FilterRow({ label, value, options, onChange, colorMap }) {
  return (
    <div style={{ marginBottom: ".5rem" }}>
      <Label>{label}</Label>
      <div style={{ display: "flex", gap: ".25rem", flexWrap: "wrap" }}>
        {options.map(o => {
          const active = value === o;
          const tint = colorMap && colorMap[o];
          return (
            <button key={o} onClick={() => onChange(o)} style={{
              background: active ? (tint || C.purple) : "transparent",
              color: active ? C.bg : (tint || C.dim),
              border: `1px solid ${active ? (tint || C.purple) : C.border}`,
              borderRadius: 14, padding: ".25rem .65rem", cursor: "pointer",
              fontSize: 11, fontFamily: FONT.body, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.03em",
            }}>{o}</button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Review card ───
function ReviewCard({ row, expanded, onToggle, onStatus, onReset, onEdit }) {
  const c = row.current || {};
  const type = c.type || "mc";
  const edited = isEdited(row);
  const off = isOffAgeType(row.age, type);

  return (
    <Card style={{
      marginBottom: ".65rem",
      borderLeft: `3px solid ${STATUS_COLORS[row.status]}`,
      opacity: row.status === "kill" ? 0.55 : 1,
    }}>
      {/* Header */}
      <div style={{ display: "flex", gap: ".35rem", flexWrap: "wrap", alignItems: "center", marginBottom: ".5rem" }}>
        <span style={{ background: C.bg, color: C.purple, fontSize: 10, padding: ".15rem .5rem", borderRadius: 3, fontFamily: FONT.body, fontWeight: 700 }}>{row.id}</span>
        <Pill color={STATUS_COLORS[row.status]}>{row.age.toUpperCase()}</Pill>
        <span style={{ background: C.blueDim, color: C.blue, fontSize: 10, padding: ".15rem .5rem", borderRadius: 3, fontWeight: 700 }}>
          {type.toUpperCase()}
        </span>
        {c.cat && <span style={{ background: C.bg, color: C.dim, fontSize: 10, padding: ".15rem .5rem", borderRadius: 3 }}>{c.cat}</span>}
        {c.d && <span style={{ color: c.d === 1 ? C.green : c.d === 2 ? C.gold : C.red, fontSize: 10, fontWeight: 700 }}>
          {c.d === 1 ? "EASY" : c.d === 2 ? "MED" : "HARD"}
        </span>}
        {off && (
          <span style={{ background: C.redDim, color: C.red, fontSize: 9, padding: ".15rem .4rem", borderRadius: 3, fontWeight: 700 }}
                title={`Type "${type}" not in recommended set for ${row.age.toUpperCase()}`}>
            OFF-AGE
          </span>
        )}
        {edited && <span style={{ background: C.purpleDim, color: C.purple, fontSize: 9, padding: ".15rem .4rem", borderRadius: 3, fontWeight: 700, marginLeft: "auto" }}>EDITED</span>}
        {row.created_in_tool && <span style={{ background: C.greenDim, color: C.green, fontSize: 9, padding: ".15rem .4rem", borderRadius: 3, fontWeight: 700 }}>NEW</span>}
      </div>

      {/* Prompt (collapsed: preview only) */}
      <div
        contentEditable={expanded}
        suppressContentEditableWarning
        onBlur={(e) => expanded && onEdit({ sit: e.currentTarget.textContent })}
        style={{
          fontSize: 14, color: C.white, fontWeight: 600, lineHeight: 1.5,
          marginBottom: ".5rem", cursor: expanded ? "text" : "pointer",
          outline: expanded ? `1px solid ${C.border}` : "none",
          padding: expanded ? ".4rem .5rem" : 0, borderRadius: 6,
        }}
        onClick={() => { if (!expanded) onToggle(); }}
      >
        {c.sit || c.q || "(no prompt)"}
      </div>

      {/* Expanded body */}
      {expanded && (
        <>
          {/* MC / TF / mistake / next — opts + correct index */}
          {(type === "mc" || type === "tf" || type === "mistake" || type === "next") && Array.isArray(c.opts) && (
            <div style={{ display: "grid", gap: ".35rem", marginBottom: ".6rem" }}>
              {c.opts.map((opt, i) => (
                <div key={i} style={{
                  display: "flex", gap: ".5rem", alignItems: "center",
                  background: i === c.ok ? C.greenDim : C.bgElevated,
                  border: `1px solid ${i === c.ok ? C.greenBorder : C.border}`,
                  borderRadius: 6, padding: ".4rem .5rem",
                }}>
                  <button onClick={() => onEdit({ ok: i })} style={{
                    background: i === c.ok ? C.green : "transparent",
                    color: i === c.ok ? C.bg : C.dimmer,
                    border: `1px solid ${i === c.ok ? C.green : C.border}`,
                    borderRadius: 12, width: 22, height: 22, cursor: "pointer",
                    fontSize: 10, fontWeight: 800, flexShrink: 0,
                  }}>{String.fromCharCode(65 + i)}</button>
                  <div
                    contentEditable suppressContentEditableWarning
                    onBlur={(e) => {
                      const next = [...c.opts]; next[i] = e.currentTarget.textContent;
                      onEdit({ opts: next });
                    }}
                    style={{ flex: 1, fontSize: 13, color: C.white, outline: "none" }}
                  >{opt}</div>
                </div>
              ))}
            </div>
          )}

          {/* Sequence — items */}
          {type === "seq" && Array.isArray(c.items) && (
            <div style={{ marginBottom: ".6rem" }}>
              <Label>Correct order (top = 1st)</Label>
              <div style={{ display: "grid", gap: ".3rem" }}>
                {(c.correct_order || c.items.map((_, i) => i)).map((origIdx, rank) => (
                  <div key={rank} style={{
                    display: "flex", gap: ".5rem", alignItems: "center",
                    background: C.bgElevated, border: `1px solid ${C.border}`,
                    borderRadius: 6, padding: ".35rem .5rem",
                  }}>
                    <span style={{ color: C.green, fontWeight: 800, fontSize: 12, minWidth: 18 }}>{rank + 1}</span>
                    <div
                      contentEditable suppressContentEditableWarning
                      onBlur={(e) => {
                        const next = [...c.items]; next[origIdx] = e.currentTarget.textContent;
                        onEdit({ items: next });
                      }}
                      style={{ flex: 1, fontSize: 13, color: C.white, outline: "none" }}
                    >{c.items[origIdx] || ""}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tip */}
          <Label>Coach tip</Label>
          <div
            contentEditable suppressContentEditableWarning
            onBlur={(e) => onEdit({ tip: e.currentTarget.textContent })}
            style={{
              fontSize: 12, color: C.dim, background: C.bgElevated,
              border: `1px solid ${C.border}`, borderRadius: 6,
              padding: ".4rem .5rem", outline: "none", marginBottom: ".6rem",
            }}
          >{c.tip || ""}</div>

          {/* Why */}
          <Label>Why (explanation)</Label>
          <div
            contentEditable suppressContentEditableWarning
            onBlur={(e) => onEdit({ why: e.currentTarget.textContent })}
            style={{
              fontSize: 12, color: C.dim, background: C.bgElevated,
              border: `1px solid ${C.border}`, borderRadius: 6,
              padding: ".4rem .5rem", outline: "none", marginBottom: ".6rem",
            }}
          >{c.why || ""}</div>
        </>
      )}

      {/* Status bar */}
      <div style={{ display: "flex", gap: ".35rem", marginTop: ".5rem", paddingTop: ".5rem", borderTop: `1px solid ${C.border}` }}>
        {STATUSES.filter(s => s !== "unreviewed").map(s => {
          const active = row.status === s;
          return (
            <button key={s} onClick={() => onStatus(s)} style={{
              background: active ? STATUS_COLORS[s] : "transparent",
              color: active ? C.bg : STATUS_COLORS[s],
              border: `1px solid ${STATUS_COLORS[s]}`,
              borderRadius: 6, padding: ".3rem .7rem", cursor: "pointer",
              fontSize: 10, fontFamily: FONT.body, fontWeight: 800,
              letterSpacing: "0.05em", textTransform: "uppercase",
            }}>{s}</button>
          );
        })}
        <button onClick={onToggle} style={{
          background: "transparent", color: C.dim, border: `1px solid ${C.border}`,
          borderRadius: 6, padding: ".3rem .7rem", cursor: "pointer",
          fontSize: 10, fontFamily: FONT.body, fontWeight: 700,
          letterSpacing: "0.05em", textTransform: "uppercase",
        }}>{expanded ? "Collapse" : "Edit"}</button>
        <button onClick={onReset} style={{
          marginLeft: "auto",
          background: "transparent", color: C.dimmer, border: `1px solid ${C.border}`,
          borderRadius: 6, padding: ".3rem .7rem", cursor: "pointer",
          fontSize: 10, fontFamily: FONT.body, fontWeight: 700,
          letterSpacing: "0.05em", textTransform: "uppercase",
        }}>Reset</button>
      </div>
    </Card>
  );
}

// ─── Add Question form ───
function AddQuestionForm({ defaultAge, existingIds, onCancel, onCreate }) {
  const [age, setAge] = useState(defaultAge);
  const [type, setType] = useState(RECOMMENDED_TYPES_BY_AGE[defaultAge][0] || "mc");
  const [advanced, setAdvanced] = useState(false);
  const [draft, setDraft] = useState(() => blankQuestion(type, defaultAge));

  useEffect(() => {
    setDraft(blankQuestion(type, age));
  }, [type, age]);

  function nextIdFor(a) {
    const nums = existingIds
      .filter(id => id.startsWith(a + "q"))
      .map(id => Number(id.slice((a + "q").length)))
      .filter(n => !isNaN(n));
    const n = (nums.length ? Math.max(...nums) : 0) + 1;
    return `${a}q${n}`;
  }

  function submit() {
    const id = nextIdFor(age);
    const cleaned = { ...draft };
    cleaned.id = id;
    onCreate({ id, age, level: LEVEL_FOR_AGE[age], current: cleaned });
  }

  const typeOptions = advanced ? ALL_TYPES : (RECOMMENDED_TYPES_BY_AGE[age] || ALL_TYPES);

  return (
    <Card style={{ marginBottom: "1rem", border: `1px solid ${C.purpleBorder}` }}>
      <Label>New question</Label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".5rem", marginBottom: ".5rem" }}>
        <div>
          <div style={{ fontSize: 10, color: C.dimmer, marginBottom: ".2rem" }}>Age</div>
          <select value={age} onChange={e => setAge(e.target.value)} style={selectSt}>
            {AGES.map(a => <option key={a} value={a}>{a.toUpperCase()}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 10, color: C.dimmer, marginBottom: ".2rem" }}>Type</div>
          <select value={type} onChange={e => setType(e.target.value)} style={selectSt}>
            {typeOptions.map(t => <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>)}
          </select>
        </div>
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: ".35rem", fontSize: 11, color: C.dim, marginBottom: ".5rem" }}>
        <input type="checkbox" checked={advanced} onChange={e => setAdvanced(e.target.checked)}/>
        Show advanced types (off-age allowed)
      </label>

      <div style={{ fontSize: 10, color: C.dimmer, marginBottom: ".2rem" }}>Prompt</div>
      <textarea value={draft.sit} onChange={e => setDraft(d => ({ ...d, sit: e.target.value }))}
        placeholder="The situation / question text"
        style={{ ...inputSt, minHeight: 60, marginBottom: ".5rem" }}/>

      <div style={{ fontSize: 10, color: C.dimmer, marginBottom: ".2rem" }}>Category</div>
      <input value={draft.cat} onChange={e => setDraft(d => ({ ...d, cat: e.target.value }))}
        placeholder="e.g. Orientation, Compete, Game Awareness"
        style={{ ...inputSt, marginBottom: ".5rem" }}/>

      {(type === "mc" || type === "tf" || type === "mistake" || type === "next") && (
        <>
          <div style={{ fontSize: 10, color: C.dimmer, marginBottom: ".2rem" }}>Choices (click A/B/C/D to mark correct)</div>
          {draft.opts.map((opt, i) => (
            <div key={i} style={{ display: "flex", gap: ".35rem", alignItems: "center", marginBottom: ".25rem" }}>
              <button onClick={() => setDraft(d => ({ ...d, ok: i }))} style={{
                background: i === draft.ok ? C.green : "transparent",
                color: i === draft.ok ? C.bg : C.dim,
                border: `1px solid ${i === draft.ok ? C.green : C.border}`,
                borderRadius: 12, width: 26, height: 26, cursor: "pointer",
                fontSize: 11, fontWeight: 800, flexShrink: 0,
              }}>{String.fromCharCode(65 + i)}</button>
              <input value={opt} onChange={e => {
                const next = [...draft.opts]; next[i] = e.target.value;
                setDraft(d => ({ ...d, opts: next }));
              }} style={inputSt}/>
            </div>
          ))}
          {type === "mc" && (
            <button onClick={() => setDraft(d => ({ ...d, opts: [...d.opts, ""] }))} style={{
              background: "transparent", color: C.dim, border: `1px dashed ${C.border}`,
              borderRadius: 6, padding: ".25rem .5rem", cursor: "pointer",
              fontSize: 10, fontWeight: 700, marginTop: ".25rem",
            }}>+ Add choice</button>
          )}
        </>
      )}

      {type === "seq" && (
        <>
          <div style={{ fontSize: 10, color: C.dimmer, marginBottom: ".2rem" }}>Sequence items (top = 1st, in correct order)</div>
          {draft.items.map((item, i) => (
            <div key={i} style={{ display: "flex", gap: ".35rem", alignItems: "center", marginBottom: ".25rem" }}>
              <span style={{ color: C.green, fontWeight: 800, fontSize: 11, minWidth: 18 }}>{i + 1}</span>
              <input value={item} onChange={e => {
                const next = [...draft.items]; next[i] = e.target.value;
                setDraft(d => ({ ...d, items: next }));
              }} style={inputSt}/>
            </div>
          ))}
        </>
      )}

      <div style={{ fontSize: 10, color: C.dimmer, margin: ".5rem 0 .2rem" }}>Coach tip</div>
      <input value={draft.tip} onChange={e => setDraft(d => ({ ...d, tip: e.target.value }))}
        placeholder="The takeaway — one sentence"
        style={{ ...inputSt, marginBottom: ".5rem" }}/>

      <div style={{ display: "flex", gap: ".5rem", marginTop: ".5rem" }}>
        <button onClick={submit} style={{
          background: C.green, color: C.bg, border: "none",
          borderRadius: 8, padding: ".5rem .9rem", cursor: "pointer",
          fontSize: 12, fontFamily: FONT.body, fontWeight: 800,
          letterSpacing: "0.05em", textTransform: "uppercase", flex: 1,
        }}>Create</button>
        <button onClick={onCancel} style={{
          background: "transparent", color: C.dim, border: `1px solid ${C.border}`,
          borderRadius: 8, padding: ".5rem .9rem", cursor: "pointer",
          fontSize: 12, fontFamily: FONT.body, fontWeight: 700,
        }}>Cancel</button>
      </div>
    </Card>
  );
}

const selectSt = {
  width: "100%", background: C.bgElevated, color: C.white,
  border: `1px solid ${C.border}`, borderRadius: 6,
  padding: ".4rem .5rem", fontSize: 12, fontFamily: FONT.body,
};
const inputSt = {
  width: "100%", background: C.bgElevated, color: C.white,
  border: `1px solid ${C.border}`, borderRadius: 6,
  padding: ".4rem .5rem", fontSize: 12, fontFamily: FONT.body,
  outline: "none",
};

// ─────────────────────────────────────────────────────────
// SkillsOnboarding — First-Six guided rating flow.
// Picks 6 random skills from the player's level and walks them through
// one-at-a-time. Does not replace the full Skills screen (still
// accessible via Profile). Goal is to get onboarding done fast.
// ─────────────────────────────────────────────────────────

// Simple deterministic shuffle keyed by player id + day so a refresh
// doesn't re-scramble the 6 mid-session.
function seededShuffle(arr, seedStr) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) { h ^= seedStr.charCodeAt(i); h = (h * 16777619) >>> 0; }
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) >>> 0;
    const j = h % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function getSelfPromptLocal(level, skill) {
  if (level === "U9 / Novice") {
    const q = skill.selfQ || skill.desc;
    if (q.startsWith("Can you ")) return "How often can you " + q.slice(8);
    if (q.startsWith("Do you ")) return "How often do you " + q.slice(7);
    return q;
  }
  return skill.selfQ || skill.desc;
}

export function SkillsOnboarding({ player, onSave, onBack }) {
  const scale = getSelfScale(player.level);
  const allSkills = (SKILLS[player.level] || []).flatMap(c => c.skills.map(s => ({...s, catName: c.cat, catIcon: c.icon})));
  const seed = (player.id || "__local__") + "|" + new Date().toISOString().slice(0, 10);
  const picked = seededShuffle(allSkills, seed).slice(0, 6);
  const [idx, setIdx] = useState(0);
  const [ratings, setRatings] = useState({});
  const [saving, setSaving] = useState(false);
  const total = picked.length;
  const current = picked[idx];

  function advance(val) {
    const next = val != null ? { ...ratings, [current.id]: val } : ratings;
    setRatings(next);
    if (idx + 1 < total) {
      setIdx(idx + 1);
    } else {
      // Finalize — merge into existing selfRatings and save
      setSaving(true);
      const merged = { ...(player.selfRatings || {}), ...next };
      Promise.resolve(onSave(merged)).finally(() => setSaving(false));
    }
  }

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.white,fontFamily:FONT.body}}>
      <StickyHeader>
        <div style={{maxWidth:560,margin:"0 auto",display:"flex",alignItems:"center",gap:"1rem"}}>
          <BackBtn onClick={onBack}/>
          <div style={{flex:1}}>
            <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.1rem"}}>Rate yourself</div>
            <div style={{fontSize:11,color:C.dimmer}}>Skill {idx+1} of {total}</div>
          </div>
          <ProgressBar value={idx+1} max={total} color={C.gold} height={4}/>
        </div>
      </StickyHeader>
      <div style={{padding:"1.25rem",maxWidth:560,margin:"0 auto"}}>
        {/* Progress dots */}
        <div style={{display:"flex",gap:6,justifyContent:"center",marginBottom:"1.25rem"}}>
          {picked.map((s, i) => (
            <span key={s.id} style={{
              width: i === idx ? 20 : 8, height: 8, borderRadius: 4,
              background: i < idx ? C.gold : i === idx ? C.gold : C.bgElevated,
              border: `1px solid ${i <= idx ? C.gold : C.border}`,
              transition: "width .15s"
            }}/>
          ))}
        </div>
        <Card style={{marginBottom:"1.25rem",borderLeft:`3px solid ${C.gold}`}}>
          <div style={{fontSize:10,letterSpacing:".12em",textTransform:"uppercase",color:C.dimmer,fontWeight:700,marginBottom:".45rem"}}>{current.catIcon} {current.catName}</div>
          <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.4rem",lineHeight:1.15,marginBottom:".45rem"}}>{current.name}</div>
          <div style={{fontSize:13,color:C.dim,lineHeight:1.55,marginBottom:"1.1rem"}}>{getSelfPromptLocal(player.level, current)}</div>
          <div style={{display:"flex",flexDirection:"column",gap:".5rem"}}>
            {scale.map(opt => (
              <button key={opt.value} onClick={() => advance(opt.value)}
                style={{background:C.bgElevated,border:`1px solid ${getScaleColor(scale, opt.value)}40`,borderLeft:`3px solid ${getScaleColor(scale, opt.value)}`,borderRadius:10,padding:".8rem 1rem",cursor:"pointer",color:C.white,fontFamily:FONT.body,fontSize:14,fontWeight:600,textAlign:"left"}}>
                <div>{opt.label}</div>
                {opt.desc && <div style={{fontSize:11,color:C.dim,marginTop:2,fontWeight:400}}>{opt.desc}</div>}
              </button>
            ))}
          </div>
        </Card>
        <div style={{display:"flex",gap:".5rem",flexWrap:"wrap"}}>
          <button onClick={() => setIdx(Math.max(0, idx - 1))} disabled={idx === 0}
            style={{background:"none",border:`1px solid ${C.border}`,borderRadius:10,padding:".7rem 1rem",cursor:idx===0?"default":"pointer",color:idx===0?C.dimmest:C.dimmer,fontSize:13,fontFamily:FONT.body,opacity:idx===0?0.5:1}}>← Back</button>
          <button onClick={() => advance("n/a")} disabled={saving}
            style={{flex:"1 1 40%",background:"none",border:`1px solid ${C.border}`,borderRadius:10,padding:".7rem 1rem",cursor:"pointer",color:C.dimmer,fontSize:13,fontFamily:FONT.body}}>
            Not applicable
          </button>
          <button onClick={() => advance(null)} disabled={saving}
            style={{flex:"1 1 40%",background:"none",border:`1px solid ${C.border}`,borderRadius:10,padding:".7rem 1rem",cursor:"pointer",color:C.dimmer,fontSize:13,fontFamily:FONT.body}}>
            {idx + 1 === total ? (saving ? "Saving…" : "Skip & finish") : "Skip →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// InsightsScreen — browsable full list of HOCKEY_INSIGHTS,
// destination for the "Read 3 pro insights" First-Six quest.
// Each card, when expanded, marks its stat as read (same LS key
// as the inline HockeyInsightWidget on Home).
// ─────────────────────────────────────────────────────────
export function InsightsScreen({ onBack, onInsightRead }) {
  const [insights, setInsights] = useState(null);
  const [openIds, setOpenIds] = useState(() => new Set());
  const [readSet, setReadSet] = useState(() => {
    try { const raw = window.localStorage.getItem("iceiq_insights_read_v1"); return new Set(raw ? JSON.parse(raw) : []); }
    catch { return new Set(); }
  });

  useEffect(() => {
    import("./data/hockeyInsights.js").then(m => setInsights(m.HOCKEY_INSIGHTS));
  }, []);

  function markRead(stat) {
    if (!stat) return;
    try {
      const raw = window.localStorage.getItem("iceiq_insights_read_v1");
      const arr = raw ? JSON.parse(raw) : [];
      if (!arr.includes(stat)) {
        arr.push(stat);
        window.localStorage.setItem("iceiq_insights_read_v1", JSON.stringify(arr));
        setReadSet(new Set(arr));
      }
    } catch {}
    if (onInsightRead) onInsightRead();
  }

  function toggle(i, stat) {
    setOpenIds(prev => {
      const next = new Set(prev);
      if (next.has(i)) { next.delete(i); }
      else { next.add(i); markRead(stat); }
      return next;
    });
  }

  const readCount = readSet.size;

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.white,fontFamily:FONT.body,paddingBottom:80}}>
      <StickyHeader>
        <div style={{maxWidth:560,margin:"0 auto",display:"flex",alignItems:"center",gap:"1rem"}}>
          <BackBtn onClick={onBack}/>
          <div style={{flex:1}}>
            <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.1rem"}}>Pro Hockey Intel</div>
            <div style={{fontSize:11,color:C.dimmer}}>{readCount} read · {insights ? insights.length : "…"} total</div>
          </div>
        </div>
      </StickyHeader>
      <div style={{padding:"1.25rem",maxWidth:560,margin:"0 auto"}}>
        {!insights && <div style={{color:C.dimmer,fontSize:13}}>Loading…</div>}
        {insights && insights.map((ins, i) => {
          const isOpen = openIds.has(i);
          const isRead = readSet.has(ins.stat);
          return (
            <button key={i} onClick={() => toggle(i, ins.stat)}
              style={{display:"block",width:"100%",textAlign:"left",background:isOpen?C.bgElevated:C.bgCard,border:`1px solid ${isOpen?C.goldBorder:C.border}`,borderLeft:`3px solid ${isRead?C.gold:C.border}`,borderRadius:10,padding:".85rem 1rem",cursor:"pointer",color:C.white,fontFamily:FONT.body,marginBottom:".55rem"}}>
              <div style={{display:"flex",alignItems:"baseline",gap:".6rem",marginBottom:isOpen?".55rem":0}}>
                <span style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.2rem",color:C.gold,flexShrink:0}}>{ins.stat}</span>
                <span style={{fontSize:13,color:C.white,lineHeight:1.45,flex:1}}>{ins.headline}</span>
                {isRead && <span style={{fontSize:10,color:C.green,fontWeight:700,flexShrink:0}}>✓</span>}
              </div>
              {isOpen && ins.detail && (
                <div style={{fontSize:12,color:C.dim,lineHeight:1.65,paddingTop:".35rem",borderTop:`1px solid ${C.border}`,marginTop:".35rem"}}>{ins.detail}</div>
              )}
              {isOpen && ins.source && (
                <div style={{fontSize:10,color:C.dimmer,marginTop:".45rem",letterSpacing:".05em"}}>— {ins.source}</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// PARENTS PAGE — first-time parents marketing/explainer surface.
// Seven sections: why, not, use, progress, pricing, privacy, developer.
// Reachable via hash #parents (pre- and post-auth).
// Palette translated from the design spec's light-theme blues to Ice-IQ's
// dark-theme `C` tokens. Copy preserved verbatim from the spec.
// ─────────────────────────────────────────────────────────
export function ParentsPage({ onNavigate, onContact, photoSrc }) {
  useEffect(() => {
    try {
      document.title = "For parents — Ice-IQ";
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "description";
        document.head.appendChild(meta);
      }
      meta.content = "What Ice-IQ is, how to use it with your kid, and what to expect — written for first-time hockey parents.";
    } catch {}
  }, []);

  function handleNav(route) { if (typeof onNavigate === "function") onNavigate(route); }
  function handleContact() {
    if (typeof onContact === "function") onContact();
    else window.location.href = "mailto:thomas@bluechip-people-strategies.com";
  }

  return (
    <div style={{minHeight:"100vh",background:C.bg,padding:"2.5rem 1rem",fontFamily:FONT.body,color:C.white}}>
      <div style={{maxWidth:760,margin:"0 auto",lineHeight:1.65}}>

        {/* Hero — personal-note typography (Caveat) to signal this section
            is a direct address to the reader, not marketing copy. */}
        <div style={S.eyebrow}>For first-time parents</div>
        <h1 style={{...S.h1, fontFamily:"'Caveat', 'Kalam', cursive", fontWeight:700, fontSize:44, letterSpacing:0}}>Welcome to Ice-IQ.</h1>
        <p style={{...S.lead, fontFamily:"'Caveat', 'Kalam', cursive", fontWeight:500, fontSize:22, lineHeight:1.5}}>
          Your kid already knows how to chase a puck. This is where they learn
          to think the game.
        </p>

        {/* Table of contents */}
        <nav style={S.toc} aria-label="On this page">
          <a href="#why" style={S.tocLink}>1. Why Ice-IQ exists</a>
          <a href="#not" style={S.tocLink}>2. What Ice-IQ is <em>not</em></a>
          <a href="#use" style={S.tocLink}>3. How to use it</a>
          <a href="#progress" style={S.tocLink}>4. Reading progress</a>
          <a href="#yours" style={S.tocLink}>5. This is yours — help us build it</a>
          <a href="#pricing" style={S.tocLink}>6. Free vs paid</a>
          <a href="#privacyinfo" style={S.tocLink}>7. Privacy</a>
          <a href="#developer" style={S.tocLink}>8. About the developer</a>
        </nav>

        {/* 01 — Why Ice-IQ exists */}
        <section id="why" style={S.section}>
          <div style={S.sectionEyebrow}>01 — Why Ice-IQ exists</div>
          <h2 style={S.h2}>Hockey sense isn't taught — it's assumed.</h2>
          <p style={S.body}>
            Kids spend thousands of dollars and hundreds of hours working on
            skating, shooting, and stickhandling. The part that actually
            separates players as they move up — reading the play, making the
            right decision, knowing where to be — barely gets coached at all.
          </p>
          <p style={S.body}>
            Ice-IQ is the off-ice reps your kid doesn't get anywhere else. Short
            scenarios. Real situations. Age-appropriate. Built so they can do
            it in 5 minutes before bed.
          </p>
        </section>

        {/* 02 — What Ice-IQ is not */}
        <section id="not" style={S.section}>
          <div style={S.sectionEyebrow}>02 — What Ice-IQ is not</div>
          <h2 style={S.h2}>Three things to get clear before you start.</h2>
          <div style={S.cardGrid3}>
            <_NotCard
              title="Not a replacement for ice time"
              body="Skating and skills still come from practice. This is the thinking layer on top."
            />
            <_NotCard
              title="Not a test or ranking"
              body="No scores get sent to coaches. No comparison to other kids. It's practice, not evaluation."
            />
            <_NotCard
              title="Not a shortcut to AA"
              body="It's a tool, not a ticket. Kids who use it consistently build sharper instincts over time — that's it."
            />
          </div>
        </section>

        {/* 03 — How to use it */}
        <section id="use" style={S.section}>
          <div style={S.sectionEyebrow}>03 — How to use it with your kid</div>
          <h2 style={S.h2}>Short, consistent, theirs.</h2>
          <p style={S.body}>
            The strongest signal we see from families who stick with this is
            simple: the kid owns it. Not the parent. Ice-IQ works when it's a
            tool the player reaches for themselves — the way they'd reach for
            a stickhandling ball or a net in the driveway. Your job is to set
            them up and then get out of the way.
          </p>
          <dl style={S.dl}>
            <_HowRow
              label="Age group"
              body="Pick the one that matches their current season, not their skill level. The scenarios are built around what an average U9, U11 or U13 player actually faces on the ice."
            />
            <_HowRow
              label="Session length"
              body="5 to 10 minutes, 3 to 4 times a week. Longer isn't better — fatigue kills decision-making practice."
            />
            <_HowRow
              label="Your role"
              body="Sit beside them the first couple of sessions if they're under 10. After that, step back. This is their tool — their profile, their goals, their streak. Let them feel that."
            />
            <_HowRow
              label="Tone"
              body={<>Curious, not coach-y. <em>"Why did you pick that one?"</em> travels further than <em>"That's wrong."</em></>}
            />
          </dl>
        </section>

        {/* 04 — Reading progress */}
        <section id="progress" style={S.section}>
          <div style={S.sectionEyebrow}>04 — Reading progress (and talking about it)</div>
          <h2 style={S.h2}>Progress ≠ the percentage.</h2>
          <p style={S.body}>
            The dashboard shows which concepts your kid is getting, which
            they're still working through, and where they're improving
            week-over-week. What it doesn't show is a grade. There's no passing
            score.
          </p>
          <div style={S.callout}>
            <div style={S.calloutLabel}>If you take one thing from this section</div>
            <div style={S.calloutBody}>
              Ask them what they <em>learned</em>, not what they <em>got right</em>.
              Kids who can explain why an answer was wrong improve twice as fast
              as kids who just get it right and move on.
            </div>
          </div>
        </section>

        {/* 05 — This is yours */}
        <section id="yours" style={S.section}>
          <div style={S.sectionEyebrow}>05 — This is yours — help us build it</div>
          <h2 style={S.h2}>Tell us what's missing. Often.</h2>
          <p style={S.body}>
            Ice-IQ isn't a finished product shipped down from somewhere. It's
            a living tool — and the parents using it are the ones shaping what
            it becomes next. Every question we add, every screen we redesign,
            every age-group gap we fill starts with a parent or a kid saying
            "this doesn't work for me yet."
          </p>
          <p style={S.body}>
            What's your kid actually struggling with in their games? What's a
            concept you wish we explained better? Is there a scenario they keep
            running into on the ice that we don't cover? A question that feels
            too easy, too hard, or just wrong for their age? Tell us.
          </p>
          <div style={S.callout}>
            <div style={S.calloutLabel}>Use the report button. Often.</div>
            <div style={S.calloutBody}>
              Every screen has a small report button — tucked in the corner, not
              in your way. Tap it any time something feels off, confusing, or
              missing. We read every report. Most fixes happen within a week.
              The more we hear from you, the better this gets for your kid.
            </div>
          </div>
          <p style={S.bodyMuted}>
            If this doesn't fit how your family trains, we want to know why.
            Silence doesn't help us build the thing you actually need.
          </p>
        </section>

        {/* 06 — Free vs paid */}
        <section id="pricing" style={S.section}>
          <div style={S.sectionEyebrow}>06 — Free vs paid</div>
          <h2 style={S.h2}>Free is real. Paid unlocks more.</h2>
          <div style={S.tierGrid}>
            <_TierCard tier="Free" price="$0" body="One age group. Core scenarios. Forever — no trial clock." />
            <_TierCard tier="Pro" price="$89.99/season" body="Full library, adaptive engine, progress tracking, goalie content." highlighted />
            <_TierCard tier="Family" price="$139.99/season" body="Everything in Pro, up to 3 kids." />
            <_TierCard tier="Team" price="$249.99/season" body="For coaches. Up to 20 players." />
          </div>
          <p style={S.bodyMuted}>
            The free tier is genuinely useful on its own. Upgrade when your kid
            has outgrown the scenarios in their age group — not before.
          </p>
        </section>

        {/* 07 — Privacy */}
        <section id="privacyinfo" style={S.section}>
          <div style={S.sectionEyebrow}>07 — Privacy &amp; your kid's data</div>
          <h2 style={S.h2}>We collect as little as possible.</h2>
          <p style={S.body}>
            Ice-IQ asks for a first name (or nickname) and an age group. That's
            it. No email required for your kid's profile. No last name, no
            school, no team affiliation unless you're on the Team tier and a
            coach invites you.
          </p>
          <p style={S.body}>
            We store what questions your kid has answered so the adaptive
            engine can stop repeating what they already know. We don't sell
            data. We don't share it with teams, associations, or advertisers.
            Ever.
          </p>
        </section>

        {/* 08 — About the developer */}
        <section id="developer" style={{...S.section, borderTop:`1px solid ${C.border}`, paddingTop:32, marginTop:16}}>
          <div style={S.sectionEyebrow}>08 — About the developer</div>
          <h2 style={S.h2}>Who's behind this.</h2>

          <div style={S.devIntro}>
            <div style={S.photo}>
              {photoSrc ? (
                <img src={photoSrc} alt="Thomas, Ice-IQ developer" style={S.photoImg}/>
              ) : (
                <div style={S.photoPlaceholder}>Photo</div>
              )}
            </div>
            <div>
              <p style={S.body}>
                Ice-IQ was built by Thomas, a hockey parent and coach born in
                the United States and based in Alberta. His own kid plays —
                the gaps in how hockey sense gets taught showed up at the
                kitchen table long before they showed up in a product.
              </p>
              <p style={S.body}>
                He's also the founder of BlueChip People Strategies, a
                performance and decision-making advisory serving small
                businesses, post-secondary institutions, and municipalities.
              </p>
            </div>
          </div>

          <div style={S.lensGrid}>
            <_LensCard
              label="The hockey side"
              body="Has coached at the provincial level. A hockey parent first, which is why the app is built for parents, not around them."
            />
            <_LensCard
              label="The learning side"
              body="Master's in coaching. Has taught leadership and people development at the post-secondary level and delivered training across the municipal sector. Adults and young people learn differently — the scenarios are built for how kids actually process information."
            />
            <_LensCard
              label="The decision-making side"
              body="20+ years of high-stakes decision-making and a career in HR and labour relations. Both are fields where the quality of a decision matters more than knowing the right answer. That's the lens Ice-IQ is built through."
            />
          </div>

          <div style={S.contactCallout}>
            Questions, feedback, or want to pilot Ice-IQ with your team or
            association? Reach out directly —{" "}
            <a
              href="mailto:thomas@bluechip-people-strategies.com"
              style={S.contactEmail}
              onClick={(e) => { if (onContact) { e.preventDefault(); handleContact(); } }}
            >
              thomas@bluechip-people-strategies.com
            </a>
          </div>
        </section>

        {/* Footer CTAs */}
        <div style={S.footerCtas}>
          <button style={S.btn} onClick={() => handleNav("home")}>
            Pick your kid's age group
          </button>
          <button style={S.btn} onClick={() => handleNav("sample")}>
            See a sample scenario
          </button>
          <button style={S.btn} onClick={handleContact}>
            Questions? Get in touch
          </button>
        </div>
      </div>
    </div>
  );
}

export function CoachesPage({ onNavigate, onContact }) {
  useEffect(() => {
    try {
      document.title = "For coaches — Ice-IQ";
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "description";
        document.head.appendChild(meta);
      }
      meta.content = "What Ice-IQ gives a coach, how to run your team on it, and what to read off the dashboard — written for volunteer and association-level coaches.";
    } catch {}
  }, []);

  function handleNav(route) { if (typeof onNavigate === "function") onNavigate(route); }
  function handleContact() {
    if (typeof onContact === "function") onContact();
    else window.location.href = "mailto:thomas@bluechip-people-strategies.com";
  }

  return (
    <div style={{minHeight:"100vh",background:C.bg,padding:"2.5rem 1rem",fontFamily:FONT.body,color:C.white}}>
      <div style={{maxWidth:760,margin:"0 auto",lineHeight:1.65}}>

        {/* Hero — personal-note typography (Caveat). Only the direct-address
            lead is handwritten; the rest of the page stays in the body font. */}
        <div style={S.eyebrow}>For coaches</div>
        <h1 style={{...S.h1, fontFamily:"'Caveat', 'Kalam', cursive", fontWeight:700, fontSize:44, letterSpacing:0}}>Thank you, Coach.</h1>
        <p style={{...S.lead, fontFamily:"'Caveat', 'Kalam', cursive", fontWeight:500, fontSize:22, lineHeight:1.5}}>
          Coaching is hard. You give up weeknights, you eat cold dinners, you
          field parent emails you didn't ask for, and you carry a team's
          development on your shoulders for reasons most people will never
          understand. We see it. Ice-IQ exists to give you a few minutes of
          your week back — and to put the <em>thinking</em> layer you don't
          have time to teach into your players' hands between practices.
        </p>

        <nav style={S.toc} aria-label="On this page">
          <a href="#why-coach" style={S.tocLink}>1. What Ice-IQ does for you</a>
          <a href="#not-coach" style={S.tocLink}>2. What Ice-IQ is <em>not</em></a>
          <a href="#setup" style={S.tocLink}>3. Setting up your team</a>
          <a href="#dashboard" style={S.tocLink}>4. Reading your dashboard</a>
          <a href="#notes" style={S.tocLink}>5. Player notes &amp; ratings</a>
          <a href="#yours-coach" style={S.tocLink}>6. This is yours — help us build it</a>
          <a href="#pricing-coach" style={S.tocLink}>7. Pricing for teams</a>
          <a href="#privacy-coach" style={S.tocLink}>8. Privacy</a>
        </nav>

        <section id="why-coach" style={S.section}>
          <div style={S.sectionEyebrow}>01 — What Ice-IQ does for you</div>
          <h2 style={S.h2}>The thinking layer you don't have time to teach.</h2>
          <p style={S.body}>
            If you're lucky, you get 60 minutes of ice — maybe twice a week,
            maybe less, maybe more depending on your association and the
            season. You spend most of it on skating, skills, and the systems
            basics that keep a U-whatever team from looking like bumper-cars.
            By the time you'd get to the decision-making layer — when to pass
            versus shoot, when to pinch, where to be on a 2-on-1, how to read
            a forecheck — the Zamboni's on. So that layer usually gets taught
            in the car on the way home, by a parent who means well but doesn't
            quite teach it the way you would, or doesn't get taught at all.
          </p>
          <p style={S.body}>
            Ice-IQ is that layer. Your players do the off-ice reps. You open
            one screen and see — in plain English — the one concept your team
            is getting wrong right now, and how many of your kids are getting
            it wrong. Then you pick one drill that addresses it and run it at
            your next practice. No clipboard. No spreadsheet. No evaluation
            report to write.
          </p>
          <p style={S.body}>
            What you get back is time, clarity, and a team that shows up on
            Saturday already half-taught on whatever you're about to cover.
            Parents stop guessing at what their kid should be working on.
            You stop repeating yourself across a season. And the conversation
            at the rink shifts from "did we win?" to "did we get better?"
          </p>
        </section>

        <section id="not-coach" style={S.section}>
          <div style={S.sectionEyebrow}>02 — What Ice-IQ is not</div>
          <h2 style={S.h2}>Three things to set straight.</h2>
          <div style={S.cardGrid3}>
            <_NotCard
              title="Not a scouting or ranking tool"
              body="Nothing here gets shared with leagues or sent up to evaluators. Your team's data belongs to your team."
            />
            <_NotCard
              title="Not a replacement for practice"
              body="Ice is where things get cemented. Ice-IQ is the reps between practices, so when they hit the ice they're already halfway there."
            />
            <_NotCard
              title="Not a coaching manual"
              body="We show you the gap. You decide the drill. The app assumes you know your team better than any dashboard ever will."
            />
          </div>
        </section>

        <section id="setup" style={S.section}>
          <div style={S.sectionEyebrow}>03 — Setting up your team</div>
          <h2 style={S.h2}>Five minutes, one code.</h2>
          <dl style={S.dl}>
            <_HowRow
              label="Create the team"
              body="Pick your age group and season. The app generates a 6-character join code."
            />
            <_HowRow
              label="Share the code"
              body="Text it to the team group chat or put it on your practice plan. Parents sign up their kid, enter the code, done."
            />
            <_HowRow
              label="Wait a few sessions"
              body="Allow a few weeks for player entries to populate so you can start to accurately glean information from the data. A dashboard is only as useful as the reps behind it."
            />
            <_HowRow
              label="Check in weekly"
              body="Before your practice plan goes out. Two minutes. See the team's weakest concept, pick one drill that addresses it."
            />
          </dl>
        </section>

        <section id="dashboard" style={S.section}>
          <div style={S.sectionEyebrow}>04 — Reading your dashboard</div>
          <h2 style={S.h2}>One number to watch.</h2>
          <p style={S.body}>
            The hero card on your coach home tells you the one competency
            your team is weakest at right now — Positioning, Decision-Making,
            Awareness, Tempo Control, Physicality, or Leadership — with how
            many players are below grade level on it.
          </p>
          <p style={S.body}>
            Below that, a tiny heatmap shows all six competencies ranked. Tap
            the orange button and we'll take you to age-appropriate drills for
            whatever the weakness is. Pick one. Run it Tuesday.
          </p>
          <div style={S.callout}>
            <div style={S.calloutLabel}>The play you're making</div>
            <div style={S.calloutBody}>
              Trust the pattern, not the single quiz. If one kid tanks on a bad
              day, the team average barely moves. If the whole team is weak on
              a concept for three weeks running, that's your practice focus.
            </div>
          </div>
        </section>

        <section id="notes" style={S.section}>
          <div style={S.sectionEyebrow}>05 — Player notes &amp; ratings</div>
          <h2 style={S.h2}>Your private coaching log.</h2>
          <p style={S.body}>
            Tap any player on your roster. You'll see two things: a skill
            rating grid (growth, competency, or percentile, age-appropriate)
            and a private notes field. Only you can see the notes. Use it for
            the stuff that doesn't fit a rating — effort patterns, parent
            conversations, who's due for a tougher role, who's struggling off
            the ice.
          </p>
          <p style={S.bodyMuted}>
            Every rating and note is tied to that player for the season. Pull
            it up before parent conversations. Pull it up before call-up
            decisions. Pull it up at season end when you're writing the
            evaluations you actually want to write.
          </p>
        </section>

        <section id="yours-coach" style={S.section}>
          <div style={S.sectionEyebrow}>06 — This is yours — help us build it</div>
          <h2 style={S.h2}>Tell us what's missing. Often.</h2>
          <p style={S.body}>
            Ice-IQ for coaches is early. The feature set will look different
            in six months, and the thing driving that difference is coaches
            telling us what works, what doesn't, and what they actually
            need. We're not guessing — we're asking.
          </p>
          <p style={S.body}>
            What's the report you'd check every morning if it existed? What
            pre-game or post-game surface would you use? What's a concept we
            should add to the taxonomy? What's the drill library missing?
            What feels clunky?
          </p>
          <div style={S.callout}>
            <div style={S.calloutLabel}>Use the report button. Often.</div>
            <div style={S.calloutBody}>
              It's on every screen, small, out of your way. Tap it any time
              something's off or missing. We read every report. Most fixes land
              within a week. The coaches who report the most shape the product
              the most — it's that simple.
            </div>
          </div>
        </section>

        <section id="pricing-coach" style={S.section}>
          <div style={S.sectionEyebrow}>07 — Pricing for teams</div>
          <h2 style={S.h2}>One tier. One price. Your whole team.</h2>
          <div style={S.tierGrid}>
            <_TierCard tier="Team" price="$249.99/season" body="Up to 20 players. Full coach dashboard, team aggregations, per-player ratings and notes, drill deep-links." highlighted/>
            <_TierCard tier="Association" price="Contact" body="Running multiple teams across an association? Get in touch."/>
          </div>
          <div style={{marginTop:16,display:"flex",flexWrap:"wrap",gap:10}}>
            <button
              style={{...S.btn,background:C.goldDim,border:`1px solid ${C.goldBorder}`,color:C.gold,fontWeight:800}}
              onClick={() => {
                const subject = encodeURIComponent("Ice-IQ for our association");
                const body = encodeURIComponent(
                  "Hi — I coach a team in our association and I think Ice-IQ could be a good fit for us at a broader level.\n\n" +
                  "Take a look: https://ice-iq.vercel.app/#coaches\n\n" +
                  "Thanks,"
                );
                try { window.location.href = `mailto:?subject=${subject}&body=${body}`; } catch {}
              }}>
              ✉️ Forward to your association
            </button>
            <button style={S.btn} onClick={() => {
              const url = "https://ice-iq.vercel.app/#coaches";
              if (navigator?.share) {
                navigator.share({ title: "Ice-IQ for coaches", url }).catch(() => {});
              } else if (navigator?.clipboard) {
                navigator.clipboard.writeText(url).then(() => alert("Link copied — paste it wherever you need to share it.")).catch(() => {});
              }
            }}>
              🔗 Copy share link
            </button>
          </div>
        </section>

        <section id="privacy-coach" style={S.section}>
          <div style={S.sectionEyebrow}>08 — Privacy</div>
          <h2 style={S.h2}>Your team's data belongs to your team.</h2>
          <p style={S.body}>
            Player quiz results, self-ratings, and goals are visible to the
            coach of the team they've joined — nobody else. Your private coach
            notes on each player are visible only to you, the coach who wrote
            them. No associations, no scouts, no advertisers. Not negotiable.
          </p>
        </section>

        <div style={S.footerCtas}>
          <button style={S.btn} onClick={() => handleNav("coach-demo")}>
            Try the coach dashboard demo →
          </button>
          <button style={S.btn} onClick={() => handleNav("coach-signup")}>
            Sign up as a coach (free) →
          </button>
          <button style={S.btn} onClick={() => handleNav("parents")}>
            See the parents page
          </button>
          <button style={S.btn} onClick={handleContact}>
            Questions? Get in touch
          </button>
        </div>
        <p style={{...S.bodyMuted,fontSize:12,marginTop:14,textAlign:"center"}}>
          Free accounts can browse the coach dashboard and preview the demo roster. To invite
          real players and run a real team, upgrade to the Team tier.
        </p>
      </div>
    </div>
  );
}

export function PlayersPage({ onNavigate, onContact }) {
  useEffect(() => {
    try {
      document.title = "For players — Ice-IQ";
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) { meta = document.createElement("meta"); meta.name = "description"; document.head.appendChild(meta); }
      meta.content = "The player's guide to Ice-IQ — what it is, how to use it, and how to get the most out of the off-ice reps.";
    } catch {}
  }, []);
  function handleNav(route) { if (typeof onNavigate === "function") onNavigate(route); }
  function handleContact() {
    if (typeof onContact === "function") onContact();
    else window.location.href = "mailto:thomas@bluechip-people-strategies.com";
  }
  return (
    <div style={{minHeight:"100vh",background:C.bg,padding:"2.5rem 1rem",fontFamily:FONT.body,color:C.white}}>
      <div style={{maxWidth:760,margin:"0 auto",lineHeight:1.65}}>
        <div style={S.eyebrow}>For players</div>
        <h1 style={{...S.h1, fontFamily:"'Caveat', 'Kalam', cursive", fontWeight:700, fontSize:44, letterSpacing:0}}>Hey, player. This is yours.</h1>
        <p style={{...S.lead, fontFamily:"'Caveat', 'Kalam', cursive", fontWeight:500, fontSize:22, lineHeight:1.5}}>
          Your parents signed you up, but this app isn't theirs. It's yours.
          Your profile. Your goals. Your streak. The kids who get the most out
          of Ice-IQ are the ones who open it on their own, pick their own
          drills to watch, and chase their own score.
        </p>

        <nav style={S.toc} aria-label="On this page">
          <a href="#why-player" style={S.tocLink}>1. Why it matters</a>
          <a href="#how-player" style={S.tocLink}>2. How to use it</a>
          <a href="#pro-player" style={S.tocLink}>3. Pro habits</a>
          <a href="#yours-player" style={S.tocLink}>4. This is yours — help us build it</a>
        </nav>

        <section id="why-player" style={S.section}>
          <div style={S.sectionEyebrow}>01 — Why it matters</div>
          <h2 style={S.h2}>Hockey sense is built off the ice.</h2>
          <p style={S.body}>
            The hardest part of hockey isn't the skating — it's the reading.
            Knowing where to be. Knowing when to pass, when to shoot, when to
            pinch, when to back off. Those reads get faster the more you see
            them. Ice-IQ is where you see them, over and over, until they're
            automatic when the puck drops.
          </p>
          <p style={S.body}>
            Five minutes a day. Three days a week. That's enough to be the
            kid on your team who always seems to know what's about to happen.
          </p>
        </section>

        <section id="how-player" style={S.section}>
          <div style={S.sectionEyebrow}>02 — How to use it</div>
          <h2 style={S.h2}>Short, consistent, honest.</h2>
          <dl style={S.dl}>
            <_HowRow label="Session length" body="5 to 10 minutes. Longer isn't better — your brain gets tired faster than your legs."/>
            <_HowRow label="Consistency" body="Three or four times a week beats one long session. Build a habit, not a marathon."/>
            <_HowRow label="Rate yourself honestly" body="When you rate your skills, don't just tap 'consistent' on everything. Real growth comes from knowing what you actually need to work on."/>
            <_HowRow label="Read the tips" body="When you get a question wrong, read WHY before tapping next. The tip is the lesson."/>
          </dl>
        </section>

        <section id="pro-player" style={S.section}>
          <div style={S.sectionEyebrow}>03 — Pro habits</div>
          <h2 style={S.h2}>Things pros do that most kids don't.</h2>
          <div style={S.cardGrid3}>
            <_NotCard title="Pre-scan every touch" body="Before the puck arrives, look over both shoulders. Know what you'll do BEFORE you have to do it."/>
            <_NotCard title="Second efforts" body="If you lose a puck battle, the next two seconds matter. Get back in it. Every time."/>
            <_NotCard title="Short memory" body="Bad shift? Forget it. Next shift. The best players don't carry mistakes into their next touch."/>
          </div>
        </section>

        <section id="yours-player" style={S.section}>
          <div style={S.sectionEyebrow}>04 — This is yours — help us build it</div>
          <h2 style={S.h2}>Tell us what's missing. Often.</h2>
          <p style={S.body}>
            A question feels too easy? Too hard? A concept your coach talks
            about that we don't cover? A drill video that was boring, or
            confusing, or wrong? Tell us. The report button is on every
            screen — tap it, say what's on your mind. We read every report.
          </p>
          <div style={S.callout}>
            <div style={S.calloutLabel}>The players who shape the app the most</div>
            <div style={S.calloutBody}>
              …are the ones who use the report button most. You're not
              bothering us. You're helping us build the thing you actually want.
            </div>
          </div>
        </section>

        <div style={S.footerCtas}>
          <button style={S.btn} onClick={() => handleNav("home")}>Take a quiz →</button>
          <button style={S.btn} onClick={() => handleNav("parents")}>For my parents</button>
          <button style={S.btn} onClick={handleContact}>Questions? Get in touch</button>
        </div>
      </div>
    </div>
  );
}

export function AssociationsPage({ onNavigate, onContact }) {
  useEffect(() => {
    try {
      document.title = "For associations — Ice-IQ";
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) { meta = document.createElement("meta"); meta.name = "description"; document.head.appendChild(meta); }
      meta.content = "How Ice-IQ fits inside a minor-hockey association: development standards, coach support, and player literacy at scale.";
    } catch {}
  }, []);
  function handleNav(route) { if (typeof onNavigate === "function") onNavigate(route); }
  function handleContact() {
    if (typeof onContact === "function") onContact();
    else window.location.href = "mailto:thomas@bluechip-people-strategies.com";
  }
  return (
    <div style={{minHeight:"100vh",background:C.bg,padding:"2.5rem 1rem",fontFamily:FONT.body,color:C.white}}>
      <div style={{maxWidth:760,margin:"0 auto",lineHeight:1.65}}>
        <div style={S.eyebrow}>For associations</div>
        <h1 style={{...S.h1, fontFamily:"'Caveat', 'Kalam', cursive", fontWeight:700, fontSize:44, letterSpacing:0}}>Thank you for running hockey.</h1>
        <p style={{...S.lead, fontFamily:"'Caveat', 'Kalam', cursive", fontWeight:500, fontSize:22, lineHeight:1.5}}>
          Associations are the volunteers nobody claps for — the ones who
          keep ice booked, coaches trained, and kids on teams season after
          season. We built Ice-IQ to give your coaches a tool they can
          actually use on Tuesday night, and your players a standard of
          hockey sense they can carry from house league up to rep.
        </p>

        <nav style={S.toc} aria-label="On this page">
          <a href="#why-assoc" style={S.tocLink}>1. Why this matters for your association</a>
          <a href="#what-assoc" style={S.tocLink}>2. What an association rollout looks like</a>
          <a href="#pricing-assoc" style={S.tocLink}>3. Pricing & tiers</a>
          <a href="#yours-assoc" style={S.tocLink}>4. This is yours — help us build it</a>
        </nav>

        <section id="why-assoc" style={S.section}>
          <div style={S.sectionEyebrow}>01 — Why this matters for your association</div>
          <h2 style={S.h2}>One standard, across every age group.</h2>
          <p style={S.body}>
            The hardest part of running minor hockey isn't ice; it's
            consistency. Every coach has their own philosophy, every team
            learns systems differently, every age group arrives with wildly
            different readiness. Ice-IQ gives you a common language —
            age-appropriate, progressive, and opinion-free — that lives
            alongside whatever your coaches are already doing.
          </p>
          <p style={S.body}>
            Players who use Ice-IQ through their U9, U11 and U13 seasons
            show up to tryouts able to articulate their own reads. That's
            evaluators dream material, and it's the kind of development
            record that makes your association look exactly as serious as
            it is.
          </p>
        </section>

        <section id="what-assoc" style={S.section}>
          <div style={S.sectionEyebrow}>02 — What an association rollout looks like</div>
          <h2 style={S.h2}>Low-lift. No mandatory anything.</h2>
          <dl style={S.dl}>
            <_HowRow label="Pilot first" body="Pick one age group or one division. Three to five coaches run with Team tier for a season. No commitment from the association."/>
            <_HowRow label="Tools for coaches" body="Each coach sees their own team dashboard — what their players are getting, what the team is missing. No admin panel, no spreadsheets to maintain."/>
            <_HowRow label="No data obligation" body="Associations don't need to collect or store anything. Players and coaches own their own data. We don't share it with leagues, evaluators, or anyone else."/>
            <_HowRow label="Opt-in for players" body="Parents sign their kids up individually. It's never mandatory, and it never becomes the coach's administrative problem."/>
          </dl>
        </section>

        <section id="pricing-assoc" style={S.section}>
          <div style={S.sectionEyebrow}>03 — Pricing & tiers</div>
          <h2 style={S.h2}>Flexible — reach out.</h2>
          <div style={S.tierGrid}>
            <_TierCard tier="Team" price="$249.99/season" body="Per team. Up to 20 players. Full coach dashboard." highlighted/>
            <_TierCard tier="Association" price="Contact" body="Multi-team pricing, custom onboarding. Reach out and we'll build it around your association." />
          </div>
        </section>

        <section id="yours-assoc" style={S.section}>
          <div style={S.sectionEyebrow}>04 — This is yours — help us build it</div>
          <h2 style={S.h2}>Tell us what an association actually needs.</h2>
          <p style={S.body}>
            Every association is different. We're building Ice-IQ by
            listening to the associations using it, not by guessing. What
            reporting would help your VP Hockey? What's the development
            conversation you wish you could have but don't have the tools
            for? What do you wish every coach in your association had?
          </p>
          <div style={S.callout}>
            <div style={S.calloutLabel}>Reach out directly</div>
            <div style={S.calloutBody}>
              Email and we'll find a fit — pilot scope, pricing, onboarding.
              Associations who come in early shape where this product goes next.
            </div>
          </div>
        </section>

        <div style={S.footerCtas}>
          <button style={S.btn} onClick={handleContact}>Contact us →</button>
          <button style={S.btn} onClick={() => handleNav("coaches")}>See the coaches page</button>
          <button style={S.btn} onClick={() => handleNav("home")}>Back to Ice-IQ</button>
        </div>
      </div>
    </div>
  );
}

function _NotCard({ title, body }) {
  return (
    <div style={S.notCard}>
      <div style={S.notCardTitle}>{title}</div>
      <div style={S.notCardBody}>{body}</div>
    </div>
  );
}
function _HowRow({ label, body }) {
  return (
    <>
      <dt style={S.dt}>{label}</dt>
      <dd style={S.dd}>{body}</dd>
    </>
  );
}
function _TierCard({ tier, price, body, highlighted }) {
  return (
    <div style={{...S.tierCard, ...(highlighted ? S.tierCardHighlighted : {})}}>
      <div style={{...S.tierLabel, ...(highlighted ? S.tierLabelHighlighted : {})}}>{tier}</div>
      <div style={S.tierPrice}>{price}</div>
      <div style={S.tierBody}>{body}</div>
    </div>
  );
}
function _LensCard({ label, body }) {
  return (
    <div style={S.lensCard}>
      <div style={S.lensLabel}>{label}</div>
      <div style={S.lensBody}>{body}</div>
    </div>
  );
}

// Styles for ParentsPage — dark-theme translation of the light-theme spec.
const S = {
  eyebrow: { fontSize:11, letterSpacing:".14em", textTransform:"uppercase", color:C.blue, fontWeight:700, marginBottom:10 },
  h1: { margin:"0 0 10px", fontSize:32, fontWeight:800, fontFamily:FONT.display, letterSpacing:"-.01em", color:C.white },
  lead: { margin:"0 0 32px", fontSize:16, color:C.dim, lineHeight:1.7, borderLeft:`2px solid ${C.blue}`, paddingLeft:14 },
  toc: { display:"flex", flexWrap:"wrap", gap:14, padding:"12px 14px", background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:10, marginBottom:40, fontSize:13 },
  tocLink: { color:C.dim, textDecoration:"none" },
  section: { marginBottom:40 },
  sectionEyebrow: { fontSize:11, letterSpacing:".12em", textTransform:"uppercase", color:C.dimmer, marginBottom:6, fontWeight:700 },
  h2: { margin:"0 0 12px", fontSize:22, fontWeight:700, fontFamily:FONT.display, color:C.white, letterSpacing:"-.005em" },
  body: { margin:"0 0 10px", fontSize:15, lineHeight:1.7, color:C.white },
  bodyMuted: { margin:"14px 0 0", fontSize:13, color:C.dim, lineHeight:1.6 },
  cardGrid3: { display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))", gap:12, marginTop:14 },
  notCard: { background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:10, padding:14 },
  notCardTitle: { fontSize:13, fontWeight:700, color:C.white, marginBottom:6 },
  notCardBody: { fontSize:13, color:C.dim, lineHeight:1.6 },
  dl: { display:"grid", gridTemplateColumns:"120px 1fr", gap:"10px 20px", fontSize:14, lineHeight:1.7, marginTop:10 },
  dt: { color:C.dimmer, fontSize:13, fontWeight:700, letterSpacing:".02em" },
  dd: { margin:0, color:C.white },
  callout: { background:C.blueDim, border:`1px solid rgba(91,164,232,.25)`, borderRadius:10, padding:"14px 16px", marginTop:14 },
  calloutLabel: { fontSize:12, fontWeight:700, color:C.blue, marginBottom:6, letterSpacing:".04em", textTransform:"uppercase" },
  calloutBody: { fontSize:14, color:C.white, lineHeight:1.6 },
  tierGrid: { display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(140px, 1fr))", gap:10, marginTop:14 },
  tierCard: { background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:10, padding:14 },
  tierCardHighlighted: { border:`2px solid ${C.gold}`, background:`linear-gradient(135deg,${C.bgCard},rgba(252,76,2,.06))` },
  tierLabel: { fontSize:11, letterSpacing:".1em", textTransform:"uppercase", color:C.dimmer, marginBottom:4, fontWeight:700 },
  tierLabelHighlighted: { color:C.gold },
  tierPrice: { fontSize:14, fontWeight:700, marginBottom:6, color:C.white },
  tierBody: { fontSize:12, color:C.dim, lineHeight:1.6 },
  devIntro: { display:"grid", gridTemplateColumns:"96px 1fr", gap:20, alignItems:"start", marginBottom:18 },
  photo: { width:96, height:96, borderRadius:10, overflow:"hidden", background:C.bgCard },
  photoImg: { width:"100%", height:"100%", objectFit:"cover" },
  photoPlaceholder: { width:"100%", height:"100%", border:`1px dashed ${C.border}`, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, color:C.dimmer },
  lensGrid: { display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))", gap:12, marginTop:18, marginBottom:20 },
  lensCard: { background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:10, padding:14 },
  lensLabel: { fontSize:11, letterSpacing:".08em", textTransform:"uppercase", color:C.dimmer, marginBottom:6, fontWeight:700 },
  lensBody: { fontSize:13, lineHeight:1.6, color:C.white },
  contactCallout: { background:C.blueDim, border:`1px solid rgba(91,164,232,.25)`, borderRadius:10, padding:"14px 16px", fontSize:14, color:C.white, lineHeight:1.6 },
  contactEmail: { color:C.blue, fontWeight:700, textDecoration:"none" },
  footerCtas: { marginTop:40, paddingTop:24, borderTop:`1px solid ${C.border}`, display:"flex", gap:10, flexWrap:"wrap" },
  btn: { fontSize:13, padding:".55rem 1rem", background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:10, cursor:"pointer", color:C.white, fontFamily:FONT.body, fontWeight:600 },
};
