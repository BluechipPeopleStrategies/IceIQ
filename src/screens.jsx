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
export function ProfileSetup({ profile, onComplete }) {
  const [level, setLevel] = useState(profile.level || "");
  const [position, setPosition] = useState(profile.position || "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await SB.updateProfile(profile.id, { level, position });
      onComplete({ ...profile, level, position });
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  if (!level) return (
    <Screen>
      <div style={{marginBottom:"2rem"}}>
        <div style={{fontSize:10,letterSpacing:".18em",color:C.gold,textTransform:"uppercase",fontWeight:700,marginBottom:".6rem"}}>Welcome · Step 1 of 2</div>
        <h2 style={{fontFamily:FONT.display,fontWeight:800,fontSize:"2rem",margin:"0 0 .35rem"}}>What age group do you (or your child) play?</h2>
        <div style={{fontSize:13,color:C.dim,lineHeight:1.55}}>Two quick questions and we'll get you on the ice.</div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:".5rem"}}>
        {LEVELS.map(l => (
          <button key={l} onClick={()=>setLevel(l)} style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:12,padding:"1rem 1.25rem",cursor:"pointer",color:C.white,fontFamily:FONT.body,fontSize:15,textAlign:"left",fontWeight:600}}>
            {l}
          </button>
        ))}
      </div>
    </Screen>
  );

  const posOptions = [{p:"Forward",i:"⚡"},{p:"Defense",i:"🛡"},{p:"Goalie",i:"🧤"},{p:"Multiple",i:"🔀"}];
  return (
    <Screen>
      <div style={{marginBottom:"1.5rem"}}>
        <div style={{fontSize:10,letterSpacing:".18em",color:C.gold,textTransform:"uppercase",fontWeight:700,marginBottom:".6rem"}}>Step 2 of 2</div>
        <h2 style={{fontFamily:FONT.display,fontWeight:800,fontSize:"2rem",margin:"0 0 .35rem"}}>What position do you (or your child) play?</h2>
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
        <button onClick={()=>setLevel("")} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:10,padding:".75rem 1rem",cursor:"pointer",color:C.dimmer,fontSize:13,fontFamily:FONT.body}}>← Back</button>
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
];
const FAMILY_BENEFITS = [
  {icon:"👨‍👩‍👧", text:"Everything in Pro"},
  {icon:"👥", text:"Up to 3 player profiles on one plan (siblings or parent-managed kids)"},
  {icon:"🔀", text:"Each profile has its own age group, ratings, goals"},
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
          <div style={{display:"flex",flexDirection:"column",gap:".4rem",marginBottom:".75rem"}}>
            <div><div style={{fontSize:10,color:C.dimmer,marginBottom:".2rem"}}>Hockey Season (Sep–Mar)</div><div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.8rem",color:C.gold}}>$89.99</div></div>
            <div><div style={{fontSize:10,color:C.dimmer,marginBottom:".2rem"}}>Summer (Apr–Aug)</div><div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.4rem",color:C.gold}}>$44.99</div></div>
            <div style={{paddingTop:".4rem",borderTop:`1px solid ${C.border}`}}><div style={{fontSize:10,color:C.dimmer,marginBottom:".2rem"}}>Full Year (Best Value)</div><div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.6rem",color:C.gold}}>$124.99 <span style={{fontSize:10,color:C.green,fontWeight:600}}>save $10.98</span></div></div>
          </div>
          {PRO_BENEFITS.map((b,i) => (
            <div key={i} style={{display:"flex",alignItems:"flex-start",gap:".55rem",padding:".3rem 0",fontSize:12,color:C.dim,lineHeight:1.5}}>
              <span style={{fontSize:14,flexShrink:0}}>{b.icon}</span><span>{b.text}</span>
            </div>
          ))}
        </Card>

        <Card style={{marginBottom:"1rem"}}>
          <Label>Family</Label>
          <div style={{display:"flex",flexDirection:"column",gap:".4rem",marginBottom:".75rem"}}>
            <div><div style={{fontSize:10,color:C.dimmer,marginBottom:".2rem"}}>Hockey Season (Sep–Mar)</div><div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.8rem",color:C.white}}>$139.99</div></div>
            <div><div style={{fontSize:10,color:C.dimmer,marginBottom:".2rem"}}>Summer (Apr–Aug)</div><div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.4rem",color:C.white}}>$69.99</div></div>
            <div style={{paddingTop:".4rem",borderTop:`1px solid ${C.border}`}}><div style={{fontSize:10,color:C.dimmer,marginBottom:".2rem"}}>Full Year (Best Value)</div><div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.6rem",color:C.white}}>$199.99 <span style={{fontSize:10,color:C.green,fontWeight:600}}>save $10.98</span></div></div>
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
          fill={`rgba(124,111,205,0.2)`}
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
    if (player.id && player.id !== "__demo__") {
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
            <button onClick={onSignup} style={{marginTop:".75rem",width:"100%",background:`linear-gradient(135deg, ${C.gold}, #b8860b)`,color:C.bg,border:"none",borderRadius:12,padding:".9rem",cursor:"pointer",fontWeight:800,fontSize:14,fontFamily:FONT.body,letterSpacing:".02em",boxShadow:"0 4px 14px rgba(201,168,76,.25), inset 0 1px 0 rgba(255,255,255,.25)"}}>
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
