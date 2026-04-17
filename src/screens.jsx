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
          <Card style={{textAlign:"center"}}><Label>Team Avg IQ</Label><div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"2.8rem",color:agg.avgIQ>=80?C.green:agg.avgIQ>=60?C.yellow:C.red}}>{agg.avgIQ}%</div></Card>
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
  {icon:"🔓", text:"Access to all age groups (U7 → U18)"},
  {icon:"🎮", text:"All 5 question formats — sequence, spot the mistake, what happens next, true/false"},
  {icon:"🧠", text:"Adaptive engine — difficulty matches your level"},
  {icon:"⭐", text:"SMART goals with category tracking"},
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
          <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"2rem",color:C.gold}}>$12.99<span style={{fontSize:13,color:C.dimmer,fontWeight:500}}> / month</span></div>
          <div style={{fontSize:11,color:C.dimmer,marginBottom:".75rem"}}>or $89.99 / year (save 42%)</div>
          {PRO_BENEFITS.map((b,i) => (
            <div key={i} style={{display:"flex",alignItems:"flex-start",gap:".55rem",padding:".3rem 0",fontSize:12,color:C.dim,lineHeight:1.5}}>
              <span style={{fontSize:14,flexShrink:0}}>{b.icon}</span><span>{b.text}</span>
            </div>
          ))}
        </Card>

        <Card style={{marginBottom:"1rem"}}>
          <Label>Family</Label>
          <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"2rem",color:C.white}}>$19.99<span style={{fontSize:13,color:C.dimmer,fontWeight:500}}> / month</span></div>
          <div style={{fontSize:11,color:C.dimmer,marginBottom:".75rem"}}>or $139.99 / year · 3 players</div>
          {FAMILY_BENEFITS.map((b,i) => (
            <div key={i} style={{display:"flex",alignItems:"flex-start",gap:".55rem",padding:".3rem 0",fontSize:12,color:C.dim,lineHeight:1.5}}>
              <span style={{fontSize:14,flexShrink:0}}>{b.icon}</span><span>{b.text}</span>
            </div>
          ))}
        </Card>

        <Card style={{marginBottom:"1rem"}}>
          <Label>Team</Label>
          <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"2rem",color:C.white}}>$49.99<span style={{fontSize:13,color:C.dimmer,fontWeight:500}}> / month</span></div>
          <div style={{fontSize:11,color:C.dimmer,marginBottom:".75rem"}}>or $249.99 season pass (Sep–Mar) · up to 20 players</div>
          {TEAM_BENEFITS.map((b,i) => (
            <div key={i} style={{display:"flex",alignItems:"flex-start",gap:".55rem",padding:".3rem 0",fontSize:12,color:C.dim,lineHeight:1.5}}>
              <span style={{fontSize:14,flexShrink:0}}>{b.icon}</span><span>{b.text}</span>
            </div>
          ))}
        </Card>

        <div style={{fontSize:11,color:C.dimmer,textAlign:"center",marginTop:"1rem",lineHeight:1.6}}>
          Payment processing is coming soon. Contact us at <span style={{color:C.gold}}>bluechip-people-strategies.com</span> for early access.
        </div>
      </div>
    </div>
  );
}
