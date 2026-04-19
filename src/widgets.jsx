// Widgets — small eager-loaded components extracted from App.jsx.
// These render on the first-paint path (Home/Profile/etc.) so they are NOT lazy-loaded.

import { useState, useEffect } from "react";
import { C, FONT, Card, Label } from "./shared.jsx";
import { getTrainingLog, saveTrainingSession, getTrainingSummary } from "./utils/trainingLog.js";

// ─────────────────────────────────────────────────────────
// PRO HOCKEY INTEL WIDGET — small, unobtrusive, rotating stat card
// Appears on Home, Study, Results, Report. Dismissible per session.
// ─────────────────────────────────────────────────────────
export function HockeyInsightWidget() {
  const [insights, setInsights] = useState(null);
  const [idx, setIdx] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    import("./data/hockeyInsights.js").then(m => {
      setInsights(m.HOCKEY_INSIGHTS);
      setIdx(Math.floor(Math.random() * m.HOCKEY_INSIGHTS.length));
    });
  }, []);
  if (dismissed || !insights) return null;
  const insight = insights[idx];
  function next() { setIdx((idx + 1) % insights.length); setExpanded(false); }
  return (
    <div style={{
      maxWidth:560, margin:"0 auto 1rem", padding:"0 1.25rem",
    }}>
      <div style={{
        background:`linear-gradient(135deg, rgba(201,168,76,.06), rgba(124,111,205,.06))`,
        border:`1px solid ${C.border}`,
        borderLeft:`3px solid ${C.gold}`,
        borderRadius:10, padding:".65rem .85rem",
        fontFamily:FONT.body, color:C.white,
      }}>
        <div style={{display:"flex",alignItems:"center",gap:".55rem"}}>
          <span style={{fontSize:15,flexShrink:0,opacity:.85}}>{insight.icon}</span>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:9,letterSpacing:".1em",textTransform:"uppercase",color:C.gold,fontWeight:700,opacity:.85}}>Pro Hockey Intel · {insight.category}</div>
            <div style={{fontSize:12,fontWeight:600,color:C.dim,lineHeight:1.35,marginTop:1}}>{insight.stat}</div>
          </div>
          <button onClick={()=>setExpanded(!expanded)} style={{background:"none",border:"none",color:C.dimmer,fontSize:11,cursor:"pointer",padding:"2px 4px"}} aria-label="Expand">
            {expanded ? "▲" : "▼"}
          </button>
          <button onClick={next} title="Next insight" style={{background:"none",border:"none",color:C.dimmer,fontSize:11,cursor:"pointer",padding:"2px 4px"}} aria-label="Next">↻</button>
          <button onClick={()=>setDismissed(true)} title="Dismiss" style={{background:"none",border:"none",color:C.dimmer,fontSize:12,cursor:"pointer",padding:"2px 4px",lineHeight:1}} aria-label="Dismiss">×</button>
        </div>
        {expanded && (
          <div style={{marginTop:".55rem",paddingTop:".55rem",borderTop:`1px solid ${C.border}`}}>
            <div style={{fontSize:11,color:C.dim,lineHeight:1.6,marginBottom:".45rem"}}>{insight.context}</div>
            <div style={{fontSize:11,color:C.purple,fontStyle:"italic",lineHeight:1.55}}>💡 {insight.lesson}</div>
            <div style={{fontSize:9,color:C.dimmer,fontStyle:"italic",marginTop:".4rem"}}>Source: {insight.source}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export function BottomNav({ active, onNav, tier = "FREE" }) {
  const tabs = [
    {id:"home",   icon:"🏠", label:"Home"},
    {id:"quiz",   icon:"🧠", label:"Quiz"},
    {id:"skills", icon:"📊", label:"Skills"},
    {id:"goals",  icon:"🎯", label:"Goals", gated: tier === "FREE"},
    {id:"report", icon:"📋", label:"Report"},
  ];
  return (
    <div style={{position:"fixed",bottom:0,left:0,right:0,background:`${C.bgCard}f8`,backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",borderTop:`1px solid ${C.border}`,display:"flex",zIndex:100}}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onNav(t.id)} style={{flex:1,background:"none",border:"none",padding:".65rem .25rem",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:".2rem",position:"relative"}}>
          <span style={{fontSize:18}}>{t.icon}</span>
          {t.gated && <span style={{position:"absolute",top:"1px",right:"8px",width:"12px",height:"12px",background:C.gold,borderRadius:"50%",fontSize:"8px",display:"flex",alignItems:"center",justifyContent:"center",color:C.bg,fontWeight:800}}>🔒</span>}
          <span style={{fontSize:10,color:active===t.id?C.gold:C.dimmer,fontFamily:FONT.body,fontWeight:active===t.id?700:400,transition:"color .15s"}}>{t.label}</span>
          {active===t.id && <div style={{width:4,height:4,borderRadius:"50%",background:C.gold}}/>}
        </button>
      ))}
    </div>
  );
}

export function TrainingLog({ playerId }) {
  const log = getTrainingLog(playerId);
  const today = new Date().toISOString().slice(0, 10);
  const [puckCount, setPuckCount] = useState(0);
  const [minutes, setMinutes] = useState({ power_skating: 30, skills_dev: 30, other: 30 });
  const [otherLabel, setOtherLabel] = useState("");
  const [sessionDate, setSessionDate] = useState(today);
  const [sessionNotes, setSessionNotes] = useState("");
  const [activeType, setActiveType] = useState(null);
  const [saved, setSaved] = useState(null);

  function openActivity(type) {
    const isOpening = activeType !== type;
    setActiveType(isOpening ? type : null);
    if (isOpening) { setSessionDate(today); setSessionNotes(""); }
  }

  function logSession(type, value, unit, label = "") {
    if (!value || value <= 0) return;
    saveTrainingSession(playerId, type, value, unit, label, sessionDate, sessionNotes.trim());
    setSaved(type);
    setSessionNotes("");
    setTimeout(() => setSaved(null), 2000);
    if (type === "pucks_shot") setPuckCount(0);
  }

  const ACTIVITIES = [
    { type: "power_skating", label: "Power Skating", icon: "⛸️", unit: "min", color: C.blue },
    { type: "skills_dev", label: "Skills Development", icon: "🏒", unit: "min", color: C.purple },
    { type: "pucks_shot", label: "Pucks Shot", icon: "🎯", unit: "pucks", color: C.gold },
    { type: "other", label: "Other Training", icon: "💪", unit: "min", color: C.green },
  ];

  return (
    <Card style={{ marginBottom: "1rem" }}>
      <Label>Off-Ice Training Log</Label>
      <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
        {ACTIVITIES.map(act => {
          const summary = getTrainingSummary(log.sessions, act.type);
          const isActive = activeType === act.type;
          const justSaved = saved === act.type;
          return (
            <div key={act.type} style={{
              background: C.bgGlass,
              border: `1px solid ${isActive ? act.color + "60" : C.border}`,
              borderRadius: 12, padding: ".85rem 1rem",
              transition: "border .15s"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: isActive ? ".75rem" : 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                  <span style={{ fontSize: 18 }}>{act.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.white }}>{act.label}</div>
                    <div style={{ fontSize: 10, color: C.dimmer }}>
                      {summary.sessions === 0 ? "No sessions yet" :
                        act.unit === "pucks"
                          ? `${summary.total.toLocaleString()} pucks total · ${summary.week} this week`
                          : `${summary.total} min total · ${summary.week} min this week`}
                    </div>
                  </div>
                </div>
                <button onClick={() => openActivity(act.type)}
                  style={{ background: isActive ? act.color : C.dimmest, color: isActive ? C.bg : act.color, border: "none", borderRadius: 8, padding: ".3rem .75rem", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: FONT.body }}>
                  {isActive ? "Cancel" : "+ Log"}
                </button>
              </div>

              {isActive && (
                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: ".75rem" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: ".35rem", marginBottom: ".75rem" }}>
                    <label style={{ fontSize: 10, color: C.dimmer, letterSpacing: ".08em", textTransform: "uppercase", fontWeight: 700 }}>Date</label>
                    <input type="date" value={sessionDate} max={today} onChange={e => setSessionDate(e.target.value)}
                      style={{ background: C.bgGlass, border: `1px solid ${C.border}`, borderRadius: 8, padding: ".5rem .75rem", color: C.white, fontFamily: FONT.body, fontSize: 13, outline: "none", colorScheme: "dark" }} />
                  </div>
                  {act.type === "pucks_shot" ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}>
                      <div style={{ textAlign: "center", fontFamily: FONT.display, fontSize: "2.5rem", fontWeight: 800, color: act.color }}>{puckCount}</div>
                      <div style={{ display: "flex", gap: ".5rem" }}>
                        {[25, 50, 100].map(n => (
                          <button key={n} onClick={() => setPuckCount(c => c + n)}
                            style={{ flex: 1, background: C.dimmest, color: act.color, border: `1px solid ${act.color}40`, borderRadius: 8, padding: ".5rem", cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: FONT.body }}>
                            +{n}
                          </button>
                        ))}
                      </div>
                      <div style={{ display: "flex", gap: ".5rem" }}>
                        <button onClick={() => setPuckCount(c => Math.max(0, c - 25))}
                          style={{ flex: 1, background: C.dimmest, color: C.dimmer, border: `1px solid ${C.border}`, borderRadius: 8, padding: ".4rem", cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: FONT.body }}>
                          −25
                        </button>
                        <button onClick={() => setPuckCount(0)}
                          style={{ flex: 1, background: C.dimmest, color: C.dimmer, border: `1px solid ${C.border}`, borderRadius: 8, padding: ".4rem", cursor: "pointer", fontWeight: 600, fontSize: 12, fontFamily: FONT.body }}>
                          Reset
                        </button>
                      </div>
                      <textarea value={sessionNotes} onChange={e => setSessionNotes(e.target.value)}
                        placeholder="Notes — who led it, location, company, what you worked on…"
                        rows={2}
                        style={{ background: C.bgGlass, border: `1px solid ${C.border}`, borderRadius: 8, padding: ".55rem .75rem", color: C.white, fontFamily: FONT.body, fontSize: 13, outline: "none", width: "100%", resize: "vertical", boxSizing: "border-box" }} />
                      <button onClick={() => logSession("pucks_shot", puckCount, "pucks")}
                        disabled={puckCount === 0}
                        style={{ background: puckCount > 0 ? act.color : C.dimmest, color: puckCount > 0 ? C.bg : C.dimmer, border: "none", borderRadius: 10, padding: ".75rem", cursor: puckCount > 0 ? "pointer" : "default", fontWeight: 800, fontSize: 14, fontFamily: FONT.body, width: "100%" }}>
                        {justSaved ? "✓ Logged!" : `Save ${puckCount} Pucks`}
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}>
                      {act.type === "other" && (
                        <input value={otherLabel} onChange={e => setOtherLabel(e.target.value)}
                          placeholder="e.g. Dryland, Gym, Skating"
                          style={{ background: C.bgGlass, border: `1px solid ${C.border}`, borderRadius: 8, padding: ".5rem .75rem", color: C.white, fontFamily: FONT.body, fontSize: 13, outline: "none", width: "100%" }} />
                      )}
                      <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                        <button onClick={() => setMinutes(p => ({ ...p, [act.type]: Math.max(5, p[act.type] - 5) }))}
                          style={{ background: C.dimmest, color: C.dim, border: `1px solid ${C.border}`, borderRadius: 8, padding: ".4rem .8rem", cursor: "pointer", fontSize: 16, fontFamily: FONT.body }}>−</button>
                        <div style={{ flex: 1, textAlign: "center", fontFamily: FONT.display, fontSize: "1.6rem", fontWeight: 800, color: act.color }}>
                          {minutes[act.type]} <span style={{ fontSize: 12, color: C.dimmer, fontFamily: FONT.body }}>min</span>
                        </div>
                        <button onClick={() => setMinutes(p => ({ ...p, [act.type]: p[act.type] + 5 }))}
                          style={{ background: C.dimmest, color: act.color, border: `1px solid ${act.color}40`, borderRadius: 8, padding: ".4rem .8rem", cursor: "pointer", fontSize: 16, fontFamily: FONT.body }}>+</button>
                      </div>
                      <div style={{ display: "flex", gap: ".5rem" }}>
                        {[30, 45, 60, 90].map(n => (
                          <button key={n} onClick={() => setMinutes(p => ({ ...p, [act.type]: n }))}
                            style={{ flex: 1, background: minutes[act.type] === n ? `${act.color}20` : C.dimmest, color: minutes[act.type] === n ? act.color : C.dimmer, border: `1px solid ${minutes[act.type] === n ? act.color + "50" : C.border}`, borderRadius: 6, padding: ".3rem 0", cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: FONT.body }}>
                            {n}m
                          </button>
                        ))}
                      </div>
                      <textarea value={sessionNotes} onChange={e => setSessionNotes(e.target.value)}
                        placeholder="Notes — who led it, location, company, what you worked on…"
                        rows={2}
                        style={{ background: C.bgGlass, border: `1px solid ${C.border}`, borderRadius: 8, padding: ".55rem .75rem", color: C.white, fontFamily: FONT.body, fontSize: 13, outline: "none", width: "100%", resize: "vertical", boxSizing: "border-box" }} />
                      <button onClick={() => logSession(act.type, minutes[act.type], "min", act.type === "other" ? otherLabel : "")}
                        style={{ background: act.color, color: C.bg, border: "none", borderRadius: 10, padding: ".75rem", cursor: "pointer", fontWeight: 800, fontSize: 14, fontFamily: FONT.body, width: "100%" }}>
                        {justSaved ? "✓ Logged!" : `Log ${minutes[act.type]} min`}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
