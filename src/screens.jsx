// Cold-path screens — code-split out of App.jsx so they don't ship with the first paint.
// These are only loaded when the user navigates to them.

import { useState, useEffect } from "react";
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
        <div style={{fontSize:10,letterSpacing:".18em",color:C.gold,textTransform:"uppercase",fontWeight:700,marginBottom:".6rem"}}>Step 1 of 2</div>
        <h2 style={{fontFamily:FONT.display,fontWeight:800,fontSize:"2rem",margin:0}}>What age group?</h2>
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

  const posOptions = [{p:"Forward",i:"⚡"},{p:"Defense",i:"🛡"},{p:"Goalie",i:"🧤"},{p:"Not Sure",i:"❓"}];
  return (
    <Screen>
      <div style={{marginBottom:"1.5rem"}}>
        <div style={{fontSize:10,letterSpacing:".18em",color:C.gold,textTransform:"uppercase",fontWeight:700,marginBottom:".6rem"}}>Step 2 of 2</div>
        <h2 style={{fontFamily:FONT.display,fontWeight:800,fontSize:"2rem",margin:"0 0 .35rem"}}>What position?</h2>
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
export function ParentAssessmentScreen({ player, onBack, onSave }) {
  const existing = getParentRatings(player.id) || player.parentRatings || {};
  const [ratings, setRatings] = useState(() => {
    const seed = {};
    for (const d of PARENT_DIMENSIONS) seed[d.id] = existing[d.id] || null;
    return seed;
  });
  const level = player.level || "U11 / Atom";
  const completed = Object.values(ratings).filter(Boolean).length;
  const total = PARENT_DIMENSIONS.length;

  function pick(id, value) { setRatings(r => ({ ...r, [id]: value })); }
  function handleSave() {
    saveParentRatings(player.id, ratings);
    onSave && onSave(ratings);
  }

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.white,fontFamily:FONT.body,paddingBottom:120}}>
      <StickyHeader>
        <div style={{maxWidth:560,margin:"0 auto",display:"flex",alignItems:"center",gap:"1rem"}}>
          <BackBtn onClick={onBack}/>
          <div style={{flex:1}}>
            <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.1rem"}}>Parent Assessment</div>
            <div style={{fontSize:11,color:C.dimmer}}>{level} · {completed}/{total} answered</div>
          </div>
          <button onClick={handleSave} disabled={completed === 0} style={{background:completed>0?C.gold:C.dimmest,color:completed>0?C.bg:C.dimmer,border:"none",borderRadius:8,padding:".4rem 1rem",cursor:completed>0?"pointer":"default",fontWeight:800,fontSize:13,fontFamily:FONT.body}}>Save</button>
        </div>
      </StickyHeader>

      <div style={{padding:"1.25rem",maxWidth:560,margin:"0 auto"}}>
        <Card style={{marginBottom:"1rem",background:`linear-gradient(135deg,${C.purpleDim},transparent)`,border:`1px solid ${C.purpleBorder}`}}>
          <Label>👋 For parents</Label>
          <div style={{fontSize:13,color:C.dim,lineHeight:1.6,marginTop:".4rem"}}>
            Rate how your child shows up at the rink — the character, habits, and attitude you see that a coach often can't. This isn't about skill; it's about who your child is becoming. Takes 2 minutes.
          </div>
        </Card>

        {PARENT_DIMENSIONS.map(dim => {
          const prompt = dim.prompts[level] || dim.prompts["U11 / Atom"];
          const current = ratings[dim.id];
          return (
            <Card key={dim.id} style={{marginBottom:".75rem"}}>
              <div style={{display:"flex",alignItems:"center",gap:".55rem",marginBottom:".35rem"}}>
                <span style={{fontSize:18}}>{dim.icon}</span>
                <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:14,color:C.white}}>{dim.label}</div>
              </div>
              <div style={{fontSize:12,color:C.dim,lineHeight:1.6,marginBottom:".7rem"}}>{prompt}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:".4rem"}}>
                {PARENT_SCALE.map(opt => {
                  const isActive = current === opt.value;
                  return (
                    <button key={opt.value} onClick={() => pick(dim.id, opt.value)} style={{
                      background: isActive ? `${opt.color}22` : C.bgElevated,
                      border: `1px solid ${isActive ? opt.color : C.border}`,
                      color: isActive ? opt.color : C.dim,
                      borderRadius: 8, padding: ".55rem .35rem", cursor: "pointer",
                      fontFamily: FONT.body, fontSize: 12, fontWeight: isActive ? 800 : 600,
                    }}>{opt.label}</button>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
