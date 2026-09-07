// Coach → Team homework assignments. Two surfaces:
//   - <HomeworkCard>      : player-side. Lists open assignments + lets the
//                           player mark each one complete.
//   - <CoachAssignmentsSection>: coach-side. Create + list + roll up completion
//                           counts per assignment for a given team.
//
// Storage is Supabase (migration_0006_assignments.sql). RLS enforces the
// boundary — coach can only CRUD their own rows; players only see rows for
// teams they're on and either-whole-team or explicitly targeted to them.

import { useEffect, useState } from "react";
import * as SB from "./supabase";
import { Card, Label, C, FONT } from "./shared.jsx";

// ─────────────────────────────────────────────
// PLAYER SIDE — Home screen card
// ─────────────────────────────────────────────
// LS key storing the ISO timestamp of the most-recent assignment created_at
// the player has already seen. Used to flag new assignments with a pulse
// badge on the Homework card.
const LS_LAST_HW_SEEN = "rinkreads_last_homework_seen_v1";

function getLastHomeworkSeen(playerId) {
  try {
    const raw = localStorage.getItem(LS_LAST_HW_SEEN);
    const map = raw ? JSON.parse(raw) : {};
    return map[playerId] || null;
  } catch { return null; }
}
function setLastHomeworkSeen(playerId, ts) {
  try {
    const raw = localStorage.getItem(LS_LAST_HW_SEEN);
    const map = raw ? JSON.parse(raw) : {};
    map[playerId] = ts;
    localStorage.setItem(LS_LAST_HW_SEEN, JSON.stringify(map));
  } catch {}
}

export function HomeworkCard({ playerId, demoMode }) {
  const [assignments, setAssignments] = useState([]);
  const [done, setDone] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null); // assignment id currently flipping
  const [lastSeenAtMount] = useState(() => (playerId ? getLastHomeworkSeen(playerId) : null));

  useEffect(() => {
    if (demoMode || !playerId) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      const [asn, comp] = await Promise.all([
        SB.getAssignmentsForPlayer(playerId),
        SB.getCompletionsForPlayer(playerId),
      ]);
      if (cancelled) return;
      setAssignments(asn);
      setDone(comp);
      setLoading(false);
      // Mark everything as seen the moment the list is shown. The
      // lastSeenAtMount snapshot above is what drives the "NEW" badge so
      // items stay flagged until the card unmounts.
      if (asn && asn.length) {
        const newest = asn.reduce((max, a) => a.created_at > max ? a.created_at : max, asn[0].created_at);
        setLastHomeworkSeen(playerId, newest);
      }
    })();
    return () => { cancelled = true; };
  }, [playerId, demoMode]);

  async function toggle(assignmentId) {
    if (busy) return;
    setBusy(assignmentId);
    const wasDone = done.has(assignmentId);
    // Optimistic update.
    setDone(prev => {
      const next = new Set(prev);
      wasDone ? next.delete(assignmentId) : next.add(assignmentId);
      return next;
    });
    try {
      if (wasDone) await SB.unmarkAssignmentComplete(assignmentId, playerId);
      else {
        await SB.markAssignmentComplete(assignmentId, playerId);
        // Bump the daily streak on the first completion of the day, same
        // contract as finishing a quiz. Inline so this component stays
        // independent of App's streak helpers.
        try {
          const today = new Date().toISOString().slice(0, 10);
          const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
          const cur = JSON.parse(localStorage.getItem("rinkreads_streak") || "{}");
          if (cur.last !== today) {
            const next = cur.last === yest
              ? { ...cur, count: (cur.count || 0) + 1, last: today }
              : { count: 1, last: today };
            localStorage.setItem("rinkreads_streak", JSON.stringify(next));
          }
        } catch { /* LS blocked — silent */ }
      }
    } catch {
      // Roll back on failure.
      setDone(prev => {
        const next = new Set(prev);
        wasDone ? next.add(assignmentId) : next.delete(assignmentId);
        return next;
      });
    }
    setBusy(null);
  }

  if (demoMode) return null;       // demo flow doesn't own a real team
  if (loading) return null;        // silent while first fetch resolves
  if (!assignments.length) return null;

  const open = assignments.filter(a => !done.has(a.id));
  const recent = open.slice(0, 4);
  // An assignment counts as "new" if it was created after the latest
  // timestamp stored before this mount. lastSeenAtMount is captured in the
  // state initializer so it reflects what the player saw LAST visit.
  const newCount = lastSeenAtMount
    ? assignments.filter(a => a.created_at > lastSeenAtMount && !done.has(a.id)).length
    : assignments.filter(a => !done.has(a.id)).length;

  return (
    <Card style={{marginBottom:"1rem",background:`linear-gradient(135deg,rgba(91,164,232,.1),rgba(91,164,232,.02))`,border:`1px solid rgba(91,164,232,.3)`}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:".5rem",gap:".5rem"}}>
        <div style={{display:"flex",alignItems:"center",gap:".45rem",minWidth:0}}>
          <Label style={{marginBottom:0}}>📋 Homework from Coach</Label>
          {newCount > 0 && (
            <span style={{
              fontSize:9,letterSpacing:".1em",textTransform:"uppercase",
              background:C.gold,color:C.bg,padding:"2px 7px",borderRadius:4,
              fontWeight:800,flexShrink:0,
              animation:"rinkreads-pulse 1.6s ease-in-out infinite",
            }}>
              {newCount} new
            </span>
          )}
        </div>
        <span style={{fontSize:11,color:C.dimmer,fontWeight:600,flexShrink:0}}>{open.length} open · {done.size} done</span>
      </div>
      <style>{`@keyframes rinkreads-pulse { 0%,100% { opacity:1 } 50% { opacity:.55 } }`}</style>
      {recent.map(a => {
        const isDone = done.has(a.id);
        const overdue = a.due_date && new Date(a.due_date) < new Date() && !isDone;
        const isNew = lastSeenAtMount ? a.created_at > lastSeenAtMount && !isDone : !isDone;
        const teamName = a.teams?.name;
        return (
          <button key={a.id} onClick={() => toggle(a.id)} disabled={busy === a.id}
            style={{
              width:"100%",textAlign:"left",padding:".65rem .85rem",
              background: isDone ? "rgba(34,197,94,.08)" : C.bgElevated,
              border:`1px solid ${isDone ? C.greenBorder : overdue ? C.goldBorder : isNew && lastSeenAtMount ? C.goldBorder : C.border}`,
              borderRadius:8,marginBottom:".4rem",cursor:busy===a.id?"wait":"pointer",
              fontFamily:FONT.body,display:"flex",alignItems:"flex-start",gap:".65rem",
            }}>
            <span style={{
              flexShrink:0,width:20,height:20,borderRadius:5,
              border:`1.5px solid ${isDone ? C.green : C.border}`,
              background: isDone ? C.green : "transparent",
              display:"flex",alignItems:"center",justifyContent:"center",
              color:C.bg,fontSize:12,fontWeight:800,marginTop:1,
            }}>{isDone ? "✓" : ""}</span>
            <span style={{flex:1,minWidth:0,color: isDone ? C.dimmer : C.white}}>
              <div style={{display:"flex",alignItems:"center",gap:".4rem",flexWrap:"wrap"}}>
                <div style={{fontSize:13,fontWeight:700,textDecoration:isDone?"line-through":"none",lineHeight:1.3}}>{a.title}</div>
                {isNew && lastSeenAtMount && (
                  <span style={{fontSize:8,letterSpacing:".1em",textTransform:"uppercase",background:C.gold,color:C.bg,padding:"1px 5px",borderRadius:3,fontWeight:800}}>New</span>
                )}
              </div>
              {a.description && <div style={{fontSize:11,color:C.dim,marginTop:3,lineHeight:1.45}}>{a.description}</div>}
              <div style={{fontSize:10,color:C.dimmer,marginTop:4,display:"flex",gap:".75rem",flexWrap:"wrap"}}>
                {teamName && <span>🏒 {teamName}</span>}
                {a.due_date && <span style={{color: overdue ? C.gold : C.dimmer,fontWeight:overdue?700:500}}>
                  {overdue ? "⚠ Overdue · " : "📅 Due "}{new Date(a.due_date).toLocaleDateString(undefined,{month:"short",day:"numeric"})}
                </span>}
              </div>
            </span>
          </button>
        );
      })}
    </Card>
  );
}

// Coach-facing quick-pick templates for common weekly homework. Tapping a
// template pre-fills title + description + a sensible default due date so
// the coach can post a new assignment in 3 clicks.
const ASSIGNMENT_TEMPLATES = [
  {
    label: "📺 Watch an NHL game",
    title: "Watch an NHL game this week",
    description: "Pick one player. Follow only them for 5 minutes. Come ready to talk about one thing they did off the puck.",
    offsetDays: 7,
  },
  {
    label: "🏒 Off-ice skills",
    title: "30 minutes of off-ice skills",
    description: "Stickhandling + shooting at home this week. Log it in your training log.",
    offsetDays: 7,
  },
  {
    label: "🎯 200 pucks",
    title: "Shoot 200 pucks this week",
    description: "Wrist, snap, backhand — mix of all three. Aim for corners, not just net.",
    offsetDays: 7,
  },
  {
    label: "📓 Review your weakest category",
    title: "Review your weakest quiz category",
    description: "Open RinkReads → your Report → pick the category you scored lowest on. Read the tips. Take a quiz this weekend and try to bump that %.",
    offsetDays: 7,
  },
  {
    label: "🧠 Extra quiz reps",
    title: "Take 3 quizzes this week",
    description: "Any category, any age group setting — just three 10-question quizzes. Your journey levels tick forward.",
    offsetDays: 7,
  },
];

// ─────────────────────────────────────────────
// COACH SIDE — inside expanded team on CoachHome
// ─────────────────────────────────────────────
export function CoachAssignmentsSection({ teamId, coachId, roster }) {
  const [assignments, setAssignments] = useState([]);
  const [completionCounts, setCompletionCounts] = useState({}); // id -> done count
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [targeted, setTargeted] = useState(new Set()); // empty = whole team
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  function daysFromNow(n) {
    return new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  }
  function applyTemplate(t) {
    setTitle(t.title);
    setDescription(t.description);
    setDueDate(daysFromNow(t.offsetDays));
    setTargeted(new Set());
    setShowForm(true);
    setErr("");
  }
  function duplicateAssignment(a) {
    setTitle(a.title || "");
    setDescription(a.description || "");
    setDueDate(daysFromNow(7));
    setTargeted(new Set(a.target_players || []));
    setShowForm(true);
    setErr("");
  }

  async function refresh() {
    setLoading(true);
    const list = await SB.getAssignmentsForTeam(teamId);
    setAssignments(list);
    // Fetch completion counts in parallel (at most 20 assignments typical).
    const entries = await Promise.all(list.map(async a => {
      const comps = await SB.getCompletionsForAssignment(a.id);
      return [a.id, comps.length];
    }));
    setCompletionCounts(Object.fromEntries(entries));
    setLoading(false);
  }

  useEffect(() => {
    if (!teamId) return;
    refresh();
  }, [teamId]);

  function togglePlayer(id) {
    setTargeted(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function submit() {
    const t = title.trim();
    if (!t) { setErr("Give this assignment a title."); return; }
    setSaving(true); setErr("");
    try {
      await SB.createAssignment(coachId, teamId, {
        title: t,
        description: description.trim() || null,
        dueDate: dueDate || null,
        targetPlayers: targeted.size ? [...targeted] : null,
      });
      setTitle(""); setDescription(""); setDueDate(""); setTargeted(new Set());
      setShowForm(false);
      await refresh();
    } catch (e) {
      setErr(e.message || "Could not save.");
    }
    setSaving(false);
  }

  async function remove(id) {
    if (!window.confirm("Delete this assignment? Players will no longer see it.")) return;
    try {
      await SB.deleteAssignment(id);
      await refresh();
    } catch { /* surfaced by RLS would be rare; no-op */ }
  }

  const targetSize = roster.length;
  const todayStr = new Date().toISOString().slice(0, 10);
  const overdueCount = assignments.filter(a => {
    if (!a.due_date || a.due_date >= todayStr) return false;
    const done = completionCounts[a.id] ?? 0;
    const audience = a.target_players?.length || targetSize;
    return done < audience;
  }).length;

  return (
    <div style={{marginTop:"1rem",paddingTop:"1rem",borderTop:`1px solid ${C.border}`}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:".5rem",gap:".5rem"}}>
        <div style={{display:"flex",alignItems:"center",gap:".5rem",minWidth:0}}>
          <Label style={{marginBottom:0}}>📋 Assignments</Label>
          {overdueCount > 0 && (
            <span style={{fontSize:9,letterSpacing:".1em",textTransform:"uppercase",background:"rgba(239,68,68,.15)",color:C.red,border:`1px solid ${C.redBorder}`,padding:"2px 7px",borderRadius:4,fontWeight:800,flexShrink:0}}>
              {overdueCount} overdue
            </span>
          )}
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)}
            style={{background:C.gold,color:C.bg,border:"none",borderRadius:8,padding:".35rem .75rem",cursor:"pointer",fontSize:11,fontWeight:800,fontFamily:FONT.body,flexShrink:0}}>
            + New
          </button>
        )}
      </div>

      {showForm && (
        <div style={{background:C.bgElevated,border:`1px solid ${C.border}`,borderRadius:10,padding:".85rem",marginBottom:".75rem"}}>
          {/* Quick-pick templates — one tap pre-fills the form. Scrollable
              row so we don't lose real estate on the create UI. */}
          <div style={{fontSize:10,letterSpacing:".1em",textTransform:"uppercase",color:C.dimmer,fontWeight:700,marginBottom:".35rem"}}>
            Quick templates
          </div>
          <div style={{display:"flex",gap:".3rem",overflowX:"auto",marginBottom:".6rem",paddingBottom:".2rem",marginLeft:-3,marginRight:-3,paddingLeft:3,paddingRight:3}}>
            {ASSIGNMENT_TEMPLATES.map((t, i) => (
              <button key={i} onClick={() => applyTemplate(t)}
                style={{flexShrink:0,background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:999,padding:".3rem .7rem",cursor:"pointer",fontFamily:FONT.body,fontSize:11,fontWeight:600,color:C.dim,whiteSpace:"nowrap"}}>
                {t.label}
              </button>
            ))}
          </div>
          <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Title (e.g., Watch the video on gap control)"
            style={{width:"100%",background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:8,padding:".6rem .75rem",color:C.white,fontSize:13,fontFamily:FONT.body,marginBottom:".5rem",outline:"none"}}/>
          <textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Optional — details, link, what to focus on"
            rows={3}
            style={{width:"100%",background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:8,padding:".6rem .75rem",color:C.white,fontSize:12,fontFamily:FONT.body,marginBottom:".5rem",outline:"none",resize:"vertical"}}/>
          <div style={{display:"flex",gap:".5rem",alignItems:"center",marginBottom:".6rem",flexWrap:"wrap"}}>
            <label style={{fontSize:11,color:C.dimmer,fontWeight:600}}>Due date:</label>
            <input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)}
              style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:6,padding:".35rem .5rem",color:C.white,fontSize:12,fontFamily:FONT.body,outline:"none",colorScheme:"dark"}}/>
          </div>
          <div style={{fontSize:11,color:C.dimmer,fontWeight:600,marginBottom:".35rem"}}>
            Who sees it? {targeted.size === 0 ? `Whole team (${targetSize})` : `${targeted.size} of ${targetSize} player${targetSize===1?"":"s"}`}
          </div>
          {roster.length > 0 && (
            <div style={{display:"flex",flexWrap:"wrap",gap:".3rem",marginBottom:".6rem",maxHeight:110,overflowY:"auto"}}>
              {roster.map(p => {
                const selected = targeted.has(p.id);
                return (
                  <button key={p.id} onClick={() => togglePlayer(p.id)}
                    style={{
                      background: selected ? C.goldDim : C.bgCard,
                      border: `1px solid ${selected ? C.gold : C.border}`,
                      borderRadius: 999, padding: ".25rem .65rem", cursor: "pointer",
                      color: selected ? C.gold : C.dim, fontFamily: FONT.body, fontSize: 11,
                      fontWeight: selected ? 700 : 500,
                    }}>
                    {p.name}
                  </button>
                );
              })}
            </div>
          )}
          {err && <div style={{fontSize:11,color:C.red,marginBottom:".5rem"}}>{err}</div>}
          <div style={{display:"flex",gap:".4rem"}}>
            <button onClick={submit} disabled={saving}
              style={{flex:1,background:C.gold,color:C.bg,border:"none",borderRadius:8,padding:".55rem",cursor:saving?"wait":"pointer",fontSize:12,fontWeight:800,fontFamily:FONT.body}}>
              {saving ? "Saving…" : "Assign"}
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
      ) : assignments.length === 0 ? (
        <div style={{fontSize:11,color:C.dimmer,padding:".5rem 0",fontStyle:"italic"}}>
          No assignments yet. Post homework so your players have something to work on between practices.
        </div>
      ) : (
        assignments.map(a => {
          const done = completionCounts[a.id] ?? 0;
          const audience = a.target_players?.length || targetSize;
          const overdue = a.due_date && a.due_date < todayStr && done < audience;
          return (
            <div key={a.id} style={{background:overdue?"rgba(239,68,68,.04)":C.bgElevated,border:`1px solid ${overdue?C.redBorder:C.border}`,borderRadius:8,padding:".6rem .75rem",marginBottom:".4rem"}}>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:".5rem"}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:".4rem",flexWrap:"wrap"}}>
                    <div style={{fontSize:13,fontWeight:700,color:C.white,lineHeight:1.3}}>{a.title}</div>
                    {overdue && (
                      <span style={{fontSize:9,letterSpacing:".1em",textTransform:"uppercase",background:"rgba(239,68,68,.15)",color:C.red,padding:"2px 7px",borderRadius:4,fontWeight:800}}>
                        Overdue
                      </span>
                    )}
                  </div>
                  {a.description && <div style={{fontSize:11,color:C.dim,marginTop:3,lineHeight:1.45}}>{a.description}</div>}
                  <div style={{fontSize:10,color:C.dimmer,marginTop:4,display:"flex",gap:".75rem",flexWrap:"wrap"}}>
                    <span>✅ {done}/{audience} complete</span>
                    {a.due_date && <span style={{color:overdue?C.red:C.dimmer,fontWeight:overdue?700:500}}>📅 Due {new Date(a.due_date).toLocaleDateString(undefined,{month:"short",day:"numeric"})}</span>}
                    {a.target_players?.length && <span>👥 Targeted</span>}
                  </div>
                </div>
                <div style={{display:"flex",gap:".15rem",flexShrink:0}}>
                  <button onClick={() => duplicateAssignment(a)} title="Reuse — prefill a new assignment from this one"
                    style={{background:"none",border:"none",color:C.gold,fontSize:14,cursor:"pointer",padding:"2px 6px",lineHeight:1}}>
                    ↻
                  </button>
                  <button onClick={() => remove(a.id)} title="Delete"
                    style={{background:"none",border:"none",color:C.dimmer,fontSize:14,cursor:"pointer",padding:"2px 6px",lineHeight:1}}>
                    ✕
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
