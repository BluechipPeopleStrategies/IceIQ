// Widgets — small eager-loaded components extracted from App.jsx.
// These render on the first-paint path (Home/Profile/etc.) so they are NOT lazy-loaded.

import { useState, useEffect, useMemo } from "react";
import { C, FONT, Card, Label } from "./shared.jsx";
import { getTrainingLog, saveTrainingSession, getTrainingSummary } from "./utils/trainingLog.js";

// ─────────────────────────────────────────────────────────
// PRO HOCKEY INTEL WIDGET — small, unobtrusive, rotating stat card
// Appears on Home, Study, Results, Report. Dismissible per session.
// ─────────────────────────────────────────────────────────
export function HockeyInsightWidget({ onInsightRead } = {}) {
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
  function markRead(i) {
    const key = insights[i]?.stat;
    if (!key) return;
    try {
      const raw = window.localStorage.getItem("rinkreads_insights_read_v1");
      const arr = raw ? JSON.parse(raw) : [];
      if (!arr.includes(key)) {
        arr.push(key);
        window.localStorage.setItem("rinkreads_insights_read_v1", JSON.stringify(arr));
      }
    } catch {}
    if (onInsightRead) onInsightRead();
  }
  function next() { const n = (idx + 1) % insights.length; setIdx(n); setExpanded(false); markRead(n); }
  function toggleExpand() { setExpanded(e => { if (!e) markRead(idx); return !e; }); }
  return (
    <div style={{
      maxWidth:560, margin:"0 auto 1rem", padding:"0 1.25rem",
    }}>
      <div style={{
        background:`linear-gradient(135deg, rgba(252,76,2,.06), rgba(207,69,32,.06))`,
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
          <button onClick={toggleExpand} style={{background:"none",border:"none",color:C.dimmer,fontSize:11,cursor:"pointer",padding:"2px 4px"}} aria-label="Expand">
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

// Off-ice + on-ice activities the player can log. `pucks_shot` and `other`
// have specialised input UI; all other types fall through the standard
// minutes-counter path. Adding a new type here is enough — initial minutes
// state, icons/labels for the running log, and the coach roster digest all
// derive from this list (or from TRAINING_TYPE_META below).
const ACTIVITIES = [
  { type: "power_skating", label: "Power Skating",      icon: "⛸️", unit: "min",   color: C.blue },
  { type: "skills_dev",    label: "Skills Development", icon: "🏒",  unit: "min",   color: C.purple },
  { type: "pucks_shot",    label: "Pucks Shot",         icon: "🎯",  unit: "pucks", color: C.gold },
  { type: "mental_skills", label: "Mental Skills",      icon: "🧠",  unit: "min",   color: C.purple },
  { type: "dryland",       label: "Dryland Training",   icon: "💪",  unit: "min",   color: C.green },
  { type: "practice",      label: "Practice",           icon: "🥅",  unit: "min",   color: C.blue },
  { type: "game",          label: "Game",               icon: "🏆",  unit: "min",   color: C.gold },
  { type: "other",         label: "Create Your Own",    icon: "📝",  unit: "min",   color: C.green },
];

export function TrainingLog({ playerId }) {
  // Bump this whenever we save so the running log re-reads fresh LS.
  const [refreshTick, setRefreshTick] = useState(0);
  const log = useMemo(() => getTrainingLog(playerId), [playerId, refreshTick]);
  const today = new Date().toISOString().slice(0, 10);
  const [puckCount, setPuckCount] = useState(0);
  const [shotType, setShotType] = useState(null); // "wrist" | "snap" | "slap" | "backhand" | null = mixed
  // Default every minute-based activity to 30 min so the +/- counter has
  // something to render when the user opens it for the first time.
  const [minutes, setMinutes] = useState(() =>
    Object.fromEntries(ACTIVITIES.filter(a => a.unit === "min").map(a => [a.type, 30]))
  );
  const [otherLabel, setOtherLabel] = useState("");
  const [sessionDate, setSessionDate] = useState(today);
  const [sessionNotes, setSessionNotes] = useState("");
  const [sessionCoach, setSessionCoach] = useState("");
  const [sessionPrice, setSessionPrice] = useState("");
  const [activeType, setActiveType] = useState(null);
  const [saved, setSaved] = useState(null);
  const [showAllSessions, setShowAllSessions] = useState(false);

  function openActivity(type) {
    const isOpening = activeType !== type;
    setActiveType(isOpening ? type : null);
    if (isOpening) { setSessionDate(today); setSessionNotes(""); setSessionCoach(""); setSessionPrice(""); setShotType(null); }
  }

  function logSession(type, value, unit, label = "") {
    if (!value || value <= 0) return;
    // For pucks_shot, fold the chosen shot type into the label so the
    // running log can surface "Pucks Shot · wrist" without a schema change.
    const finalLabel = type === "pucks_shot" && shotType ? shotType : label;
    saveTrainingSession(
      playerId, type, value, unit, finalLabel,
      sessionDate, sessionNotes.trim(),
      sessionCoach.trim(), sessionPrice,
    );
    setSaved(type);
    setSessionNotes("");
    setSessionCoach("");
    setSessionPrice("");
    setRefreshTick(t => t + 1);
    setTimeout(() => setSaved(null), 2000);
    if (type === "pucks_shot") { setPuckCount(0); setShotType(null); }
  }

  return (
    <Card style={{ marginBottom: "1rem" }}>
      <Label>Training Log</Label>
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
                  <div style={{ display: "flex", gap: ".5rem", marginBottom: ".75rem" }}>
                    <div style={{ flex: 2, display: "flex", flexDirection: "column", gap: ".35rem" }}>
                      <label style={{ fontSize: 10, color: C.dimmer, letterSpacing: ".08em", textTransform: "uppercase", fontWeight: 700 }}>Coach</label>
                      <input type="text" value={sessionCoach} onChange={e => setSessionCoach(e.target.value)}
                        placeholder="Who led the session? (optional)"
                        style={{ background: C.bgGlass, border: `1px solid ${C.border}`, borderRadius: 8, padding: ".5rem .75rem", color: C.white, fontFamily: FONT.body, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" }} />
                    </div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: ".35rem" }}>
                      <label style={{ fontSize: 10, color: C.dimmer, letterSpacing: ".08em", textTransform: "uppercase", fontWeight: 700 }}>
                        Price <span style={{ color: C.dimmest, fontWeight: 600 }}>(optional)</span>
                      </label>
                      <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: ".6rem", top: "50%", transform: "translateY(-50%)", color: C.dimmer, fontSize: 13, fontFamily: FONT.body, pointerEvents: "none" }}>$</span>
                        <input type="number" inputMode="decimal" min="0" step="0.01" value={sessionPrice} onChange={e => setSessionPrice(e.target.value)}
                          placeholder="Skip if free"
                          style={{ background: C.bgGlass, border: `1px solid ${C.border}`, borderRadius: 8, padding: ".5rem .75rem .5rem 1.3rem", color: C.white, fontFamily: FONT.body, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" }} />
                      </div>
                    </div>
                  </div>
                  {act.type === "pucks_shot" ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}>
                      <div style={{ textAlign: "center", fontFamily: FONT.display, fontSize: "2.5rem", fontWeight: 800, color: act.color }}>{puckCount}</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: ".35rem" }}>
                        <label style={{ fontSize: 10, color: C.dimmer, letterSpacing: ".08em", textTransform: "uppercase", fontWeight: 700 }}>
                          Shot type <span style={{ color: C.dimmest, fontWeight: 600 }}>(optional)</span>
                        </label>
                        <div style={{ display: "flex", gap: ".35rem", flexWrap: "wrap" }}>
                          {[
                            { id: "wrist", label: "Wrist" },
                            { id: "snap", label: "Snap" },
                            { id: "slap", label: "Slap" },
                            { id: "backhand", label: "Backhand" },
                          ].map(s => {
                            const isOn = shotType === s.id;
                            return (
                              <button key={s.id} type="button"
                                onClick={() => setShotType(isOn ? null : s.id)}
                                style={{
                                  flex: "1 1 auto", minWidth: 0,
                                  background: isOn ? `${act.color}20` : C.dimmest,
                                  color: isOn ? act.color : C.dimmer,
                                  border: `1px solid ${isOn ? act.color + "70" : C.border}`,
                                  borderRadius: 8, padding: ".4rem .25rem",
                                  cursor: "pointer", fontWeight: 700, fontSize: 11,
                                  fontFamily: FONT.body,
                                }}>
                                {s.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
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

      {/* Running log — past 10 sessions visible by default; expandable. */}
      <TrainingLogRunning sessions={log.sessions || []} showAll={showAllSessions} onToggle={() => setShowAllSessions(v => !v)}/>
    </Card>
  );
}

// Running log of past training sessions. Pure presentation — consumes the
// full sessions array and windows to 10 (or all if expanded).
function TrainingLogRunning({ sessions, showAll, onToggle }) {
  const ICONS = Object.fromEntries(ACTIVITIES.map(a => [a.type, a.icon]));
  const LABELS = Object.fromEntries(ACTIVITIES.map(a => [a.type, a.label === "Create Your Own" ? "Training" : a.label]));
  if (!sessions || sessions.length === 0) {
    return (
      <div style={{marginTop:"1rem",paddingTop:"1rem",borderTop:`1px solid ${C.border}`}}>
        <Label>Recent sessions</Label>
        <div style={{fontSize:12,color:C.dimmer,fontStyle:"italic",padding:".5rem 0"}}>
          No sessions logged yet. Log a session above and it'll show up here.
        </div>
      </div>
    );
  }
  // Newest first.
  const sorted = [...sessions].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  const visible = showAll ? sorted : sorted.slice(0, 10);
  return (
    <div style={{marginTop:"1rem",paddingTop:"1rem",borderTop:`1px solid ${C.border}`}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:".5rem"}}>
        <Label>Recent sessions</Label>
        <div style={{fontSize:10,color:C.dimmer,fontWeight:600}}>{sessions.length} total</div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:".35rem"}}>
        {visible.map((s, i) => {
          const icon = ICONS[s.type] || "📓";
          const typeLabel = s.type === "other" && s.label ? s.label : (LABELS[s.type] || s.type);
          const unitLabel = s.unit === "pucks" ? `${s.value} pucks` : `${s.value} ${s.unit || "min"}`;
          return (
            <div key={i} style={{display:"flex",alignItems:"center",gap:".55rem",background:C.bgGlass,border:`1px solid ${C.border}`,borderRadius:8,padding:".5rem .7rem"}}>
              <span style={{fontSize:15,flexShrink:0}}>{icon}</span>
              <div style={{flex:1,minWidth:0,display:"flex",flexWrap:"wrap",gap:".45rem",alignItems:"baseline"}}>
                <span style={{fontSize:12,fontWeight:700,color:C.white}}>{typeLabel}</span>
                <span style={{fontSize:11,color:C.gold,fontWeight:700}}>{unitLabel}</span>
                {s.coach && <span style={{fontSize:11,color:C.dim}}>· {s.coach}</span>}
              </div>
              <span style={{fontSize:10,color:C.dimmer,flexShrink:0}}>{s.date || ""}</span>
            </div>
          );
        })}
      </div>
      {sessions.length > 10 && (
        <button onClick={onToggle}
          style={{background:"none",border:"none",color:C.gold,cursor:"pointer",fontSize:12,fontFamily:FONT.body,fontWeight:700,padding:".55rem 0 0",width:"100%",textAlign:"center"}}>
          {showAll ? "Show fewer" : `View all ${sessions.length} sessions →`}
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// HOME START-HERE CARD — Dismissible "For parents — start here" card.
// Placed above QuestChecklist on the home screen. Once dismissed, doesn't
// return unless localStorage key `rinkreads_parents_card_dismissed` is cleared.
// ─────────────────────────────────────────────────────────
const PARENTS_CARD_STORAGE_KEY = "rinkreads_parents_card_dismissed";

export function HomeStartHereCard({ onRead, subscriptionTier }) {
  // Start dismissed to avoid a flash before the LS read resolves.
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      const isDismissed = localStorage.getItem(PARENTS_CARD_STORAGE_KEY) === "true";
      setDismissed(isDismissed);
    } catch {
      setDismissed(false);
    }
  }, []);

  function handleDismiss() {
    try { localStorage.setItem(PARENTS_CARD_STORAGE_KEY, "true"); } catch {}
    setDismissed(true);
  }
  function handleRead() { if (typeof onRead === "function") onRead(); }

  // Paid tiers have already onboarded — hide the parents primer entirely.
  if (subscriptionTier === "PRO" || subscriptionTier === "TEAM") return null;
  if (dismissed) return null;

  return (
    <div
      role="complementary"
      aria-label="For first-time parents"
      style={{
        background: "transparent",
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: ".55rem .75rem",
        marginBottom: ".85rem",
        fontFamily: FONT.body,
        color: C.dim,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: ".75rem",
      }}
    >
      <div style={{fontSize:12,color:C.dim,lineHeight:1.45,minWidth:0}}>
        <span style={{color:C.dimmer,fontSize:10,letterSpacing:".12em",textTransform:"uppercase",fontWeight:700,marginRight:".45rem"}}>Parents</span>
        New to RinkReads? <button onClick={handleRead} style={{background:"none",border:"none",color:C.blue,cursor:"pointer",padding:0,fontSize:12,fontFamily:FONT.body,textDecoration:"underline",fontWeight:600}}>Start here</button>.
      </div>
      <button onClick={handleDismiss} aria-label="Dismiss" style={{
        fontSize:14,padding:"2px 6px",lineHeight:1,
        background:"none",color:C.dimmer,border:"none",borderRadius:6,
        cursor:"pointer",fontFamily:FONT.body,flexShrink:0,
      }}>✕</button>
    </div>
  );
}
