// Coach dashboard analytics — complements <TeamFocusCard>.
// Where TeamFocusCard shows the competency heatmap, this section surfaces:
//   - Overall team quiz accuracy (one big number)
//   - 7-day accuracy vs the previous 7 days (trend arrow)
//   - Sessions logged this week (engagement signal)
//   - Most-improved + most-stagnant players (growth mindset)
//
// Reads `quiz_history` already attached to each roster row (see CoachHome
// toggleRoster — it bulk-fetches via SB.getTeamQuizHistory).

import { Card, Label, C, FONT } from "./shared.jsx";

// Flatten a single quiz session's `results` array into {ok, total}. Tolerates
// both the shipped shape (results = [{id,cat,ok}]) and the legacy raw-score
// shape (score + sessionLength).
function sessionAccuracy(session) {
  if (Array.isArray(session.results) && session.results.length) {
    const ok = session.results.filter(r => r.ok).length;
    return { ok, total: session.results.length };
  }
  if (typeof session.score === "number" && typeof session.sessionLength === "number") {
    const ok = Math.round((session.score / 100) * session.sessionLength);
    return { ok, total: session.sessionLength };
  }
  return { ok: 0, total: 0 };
}

function daysAgo(n) {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
}

function computeAnalytics(roster) {
  const weekAgo = daysAgo(7);
  const twoWeeksAgo = daysAgo(14);
  let okWeek = 0, totalWeek = 0;
  let okPrev = 0, totalPrev = 0;
  let okAll = 0, totalAll = 0;
  let sessionsWeek = 0, sessionsAll = 0;
  const perPlayer = [];
  (roster || []).forEach(p => {
    const hist = p?.quiz_history || p?.quizHistory || [];
    if (!hist.length) { perPlayer.push({ id: p.id, name: p.name, recentOk: 0, recentTotal: 0, weekSessions: 0, delta: 0 }); return; }
    let playerOk = 0, playerTotal = 0;
    let recentOk = 0, recentTotal = 0;
    let prevOk = 0, prevTotal = 0;
    let weekSessions = 0;
    for (const s of hist) {
      const d = (s.date || s.completed_at || "").slice(0, 10);
      const { ok, total } = sessionAccuracy(s);
      playerOk += ok; playerTotal += total;
      sessionsAll++;
      if (d >= weekAgo) {
        recentOk += ok; recentTotal += total; weekSessions++;
        sessionsWeek++;
        okWeek += ok; totalWeek += total;
      } else if (d >= twoWeeksAgo) {
        prevOk += ok; prevTotal += total;
        okPrev += ok; totalPrev += total;
      }
      okAll += ok; totalAll += total;
    }
    const recentPct = recentTotal ? Math.round((recentOk / recentTotal) * 100) : null;
    const prevPct = prevTotal ? Math.round((prevOk / prevTotal) * 100) : null;
    const allPct = playerTotal ? Math.round((playerOk / playerTotal) * 100) : 0;
    const delta = recentPct !== null && prevPct !== null ? recentPct - prevPct : null;
    perPlayer.push({ id: p.id, name: p.name, recentPct, allPct, delta, weekSessions });
  });
  return {
    teamAccPct: totalAll ? Math.round((okAll / totalAll) * 100) : 0,
    weekAccPct: totalWeek ? Math.round((okWeek / totalWeek) * 100) : null,
    prevAccPct: totalPrev ? Math.round((okPrev / totalPrev) * 100) : null,
    sessionsWeek,
    sessionsAll,
    activePlayersWeek: perPlayer.filter(p => p.weekSessions > 0).length,
    rosterSize: (roster || []).length,
    perPlayer,
  };
}

export function CoachTeamAnalyticsSection({ roster }) {
  const a = computeAnalytics(roster);
  const hasData = a.sessionsAll > 0;
  if (!hasData) return null; // TeamFocusCard already handles the empty state

  const trend = (a.weekAccPct !== null && a.prevAccPct !== null)
    ? a.weekAccPct - a.prevAccPct
    : null;
  const trendColor = trend === null ? C.dimmer : trend > 0 ? C.green : trend < 0 ? C.red : C.dimmer;
  const trendGlyph = trend === null ? "—" : trend > 0 ? "↑" : trend < 0 ? "↓" : "→";

  // Rank per-player trends. Most improved = biggest positive delta.
  const withDelta = a.perPlayer.filter(p => p.delta !== null);
  withDelta.sort((x, y) => y.delta - x.delta);
  const mostImproved = withDelta.slice(0, 2).filter(p => p.delta > 0);
  const mostStagnant = [...withDelta].reverse().slice(0, 2).filter(p => p.delta < 0);

  return (
    <div style={{marginTop:"1rem",paddingTop:"1rem",borderTop:`1px solid ${C.border}`}}>
      <Label>📊 Team Analytics</Label>

      {/* Hero row — accuracy + 7-day trend + sessions this week */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3, 1fr)",gap:".5rem",marginBottom:".85rem"}}>
        <div style={{background:C.bgElevated,border:`1px solid ${C.border}`,borderRadius:10,padding:".65rem .75rem"}}>
          <div style={{fontSize:9,letterSpacing:".14em",textTransform:"uppercase",color:C.dimmer,fontWeight:700,marginBottom:2}}>Team accuracy</div>
          <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.5rem",color:C.white,lineHeight:1}}>{a.teamAccPct}<span style={{fontSize:".85rem",color:C.dimmer}}>%</span></div>
          <div style={{fontSize:10,color:C.dimmer,marginTop:3}}>all time · {a.sessionsAll} session{a.sessionsAll===1?"":"s"}</div>
        </div>
        <div style={{background:C.bgElevated,border:`1px solid ${trendColor+"40"}`,borderRadius:10,padding:".65rem .75rem"}}>
          <div style={{fontSize:9,letterSpacing:".14em",textTransform:"uppercase",color:C.dimmer,fontWeight:700,marginBottom:2}}>7-day trend</div>
          <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.5rem",color:trendColor,lineHeight:1,display:"flex",alignItems:"baseline",gap:".15rem"}}>
            {trendGlyph}
            <span>{trend === null ? "—" : Math.abs(trend)}</span>
            {trend !== null && <span style={{fontSize:".85rem",color:C.dimmer}}>pts</span>}
          </div>
          <div style={{fontSize:10,color:C.dimmer,marginTop:3}}>
            {a.weekAccPct !== null ? `${a.weekAccPct}% this wk` : "no sessions this wk"}
          </div>
        </div>
        <div style={{background:C.bgElevated,border:`1px solid ${C.border}`,borderRadius:10,padding:".65rem .75rem"}}>
          <div style={{fontSize:9,letterSpacing:".14em",textTransform:"uppercase",color:C.dimmer,fontWeight:700,marginBottom:2}}>Active this wk</div>
          <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.5rem",color:C.white,lineHeight:1}}>{a.activePlayersWeek}<span style={{fontSize:".85rem",color:C.dimmer}}>/{a.rosterSize}</span></div>
          <div style={{fontSize:10,color:C.dimmer,marginTop:3}}>{a.sessionsWeek} session{a.sessionsWeek===1?"":"s"} logged</div>
        </div>
      </div>

      {/* Movers — most improved + stagnating. Only render if we have signal. */}
      {(mostImproved.length + mostStagnant.length) > 0 && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".5rem",marginBottom:".5rem"}}>
          <div style={{background:"rgba(34,197,94,.05)",border:`1px solid ${C.greenBorder}`,borderRadius:10,padding:".55rem .75rem"}}>
            <div style={{fontSize:9,letterSpacing:".1em",textTransform:"uppercase",color:C.green,fontWeight:700,marginBottom:".3rem"}}>📈 Most improved</div>
            {mostImproved.length === 0 ? (
              <div style={{fontSize:11,color:C.dimmer,fontStyle:"italic"}}>No clear risers yet — give it another week.</div>
            ) : mostImproved.map(p => (
              <div key={p.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:11,padding:"2px 0"}}>
                <span style={{color:C.white,fontWeight:600,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</span>
                <span style={{color:C.green,fontWeight:700,flexShrink:0}}>+{p.delta} pts</span>
              </div>
            ))}
          </div>
          <div style={{background:"rgba(239,68,68,.05)",border:`1px solid ${C.redBorder}`,borderRadius:10,padding:".55rem .75rem"}}>
            <div style={{fontSize:9,letterSpacing:".1em",textTransform:"uppercase",color:C.red,fontWeight:700,marginBottom:".3rem"}}>📉 Slipping</div>
            {mostStagnant.length === 0 ? (
              <div style={{fontSize:11,color:C.dimmer,fontStyle:"italic"}}>Nobody sliding — solid week.</div>
            ) : mostStagnant.map(p => (
              <div key={p.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:11,padding:"2px 0"}}>
                <span style={{color:C.white,fontWeight:600,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</span>
                <span style={{color:C.red,fontWeight:700,flexShrink:0}}>{p.delta} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
