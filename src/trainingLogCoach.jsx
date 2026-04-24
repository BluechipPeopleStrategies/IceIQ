// Coach-visible training log. Pricing promises "Coach-visible training
// activity" on TEAM tier; this component surfaces each roster player's
// recent off-ice training so the coach can see who's putting in extra reps.
//
// Reads from `training_sessions` in Supabase (migration_0007). RLS restricts
// the read to coaches who own the team the player is on — so the component
// works with the anon-key client without any extra plumbing.

import { useEffect, useState } from "react";
import * as SB from "./supabase";
import { Card, Label, C, FONT } from "./shared.jsx";

// Sum minutes across all sessions within the last `days` days.
function summarize(sessions, days = 7) {
  const cutoff = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const recent = sessions.filter(s => (s.date || "") >= cutoff);
  const totalMin = recent
    .filter(s => s.unit === "min")
    .reduce((n, s) => n + (Number(s.value) || 0), 0);
  const pucks = recent
    .filter(s => s.unit === "pucks")
    .reduce((n, s) => n + (Number(s.value) || 0), 0);
  return { sessionCount: recent.length, totalMin, pucks, mostRecent: recent[0] };
}

function formatRelDate(d) {
  if (!d) return "";
  const today = new Date().toISOString().slice(0, 10);
  if (d === today) return "today";
  const diff = Math.round((new Date(today) - new Date(d)) / 86400000);
  if (diff === 1) return "yesterday";
  if (diff < 7) return diff + "d ago";
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function CoachTrainingSection({ teamId, roster }) {
  const [byPlayer, setByPlayer] = useState({}); // playerId -> sessions[]
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null); // playerId currently drilled into

  useEffect(() => {
    if (!teamId || !Array.isArray(roster) || !roster.length) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      const out = {};
      await Promise.all(roster.map(async (p) => {
        if (!p?.id) return;
        const sessions = await SB.getTrainingSessionsForPlayer(p.id);
        if (!cancelled) out[p.id] = sessions || [];
      }));
      if (!cancelled) { setByPlayer(out); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [teamId, roster.length]);

  if (!roster.length) return null;

  // Rank players by 7-day minutes so the most active rise to the top.
  const ranked = [...roster]
    .map(p => {
      const sessions = byPlayer[p.id] || [];
      return { player: p, sessions, summary: summarize(sessions, 7) };
    })
    .sort((a, b) => b.summary.totalMin - a.summary.totalMin);

  const teamMin = ranked.reduce((n, r) => n + r.summary.totalMin, 0);
  const activePlayers = ranked.filter(r => r.summary.sessionCount > 0).length;

  return (
    <div style={{marginTop: "1rem", paddingTop: "1rem", borderTop: `1px solid ${C.border}`}}>
      <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: ".5rem"}}>
        <Label style={{marginBottom: 0}}>💪 Training Activity · last 7 days</Label>
        <span style={{fontSize: 11, color: C.dimmer, fontWeight: 600}}>
          {activePlayers}/{roster.length} active · {teamMin}m total
        </span>
      </div>

      {loading ? (
        <div style={{fontSize: 11, color: C.dimmer, padding: ".5rem 0"}}>Loading…</div>
      ) : ranked.every(r => r.summary.sessionCount === 0) ? (
        <div style={{fontSize: 11, color: C.dimmer, padding: ".5rem 0", fontStyle: "italic"}}>
          No one's logged off-ice training in the last week yet. Nudge the roster to track minutes on their profile.
        </div>
      ) : (
        ranked.map(({ player, sessions, summary }) => {
          const active = summary.sessionCount > 0;
          const isExpanded = expanded === player.id;
          const last14 = summarize(sessions, 14);
          return (
            <div key={player.id} style={{
              background: active ? C.bgElevated : "rgba(255,255,255,.02)",
              border: `1px solid ${active ? C.border : "rgba(255,255,255,.05)"}`,
              borderRadius: 8,
              marginBottom: ".4rem",
              opacity: active ? 1 : 0.55,
            }}>
              <button onClick={() => setExpanded(isExpanded ? null : player.id)}
                style={{
                  width: "100%", textAlign: "left", padding: ".55rem .75rem",
                  background: "none", border: "none", cursor: "pointer",
                  fontFamily: FONT.body, color: C.white,
                  display: "flex", alignItems: "center", gap: ".65rem",
                }}>
                <span style={{flex: 1, minWidth: 0}}>
                  <div style={{fontSize: 13, fontWeight: 700, lineHeight: 1.3}}>{player.name}</div>
                  <div style={{fontSize: 10, color: C.dimmer, marginTop: 2, display: "flex", gap: ".75rem", flexWrap: "wrap"}}>
                    {active ? (
                      <>
                        <span>🕒 {summary.totalMin}m this week</span>
                        <span>📊 {summary.sessionCount} session{summary.sessionCount === 1 ? "" : "s"}</span>
                        {summary.pucks > 0 && <span>🎯 {summary.pucks} pucks</span>}
                        {summary.mostRecent && <span>last: {formatRelDate(summary.mostRecent.date)}</span>}
                      </>
                    ) : (
                      <span style={{fontStyle: "italic"}}>No sessions logged</span>
                    )}
                  </div>
                </span>
                {active && (
                  <span style={{fontSize: 10, color: C.gold, fontWeight: 700, letterSpacing: ".04em"}}>
                    {isExpanded ? "▾" : "▸"}
                  </span>
                )}
              </button>
              {isExpanded && active && (
                <div style={{padding: "0 .75rem .6rem", borderTop: `1px solid ${C.border}`}}>
                  <div style={{fontSize: 10, color: C.dimmer, margin: ".5rem 0 .35rem", letterSpacing: ".04em"}}>
                    Last 14 days: {last14.sessionCount} sessions · {last14.totalMin}m
                  </div>
                  {sessions.slice(0, 8).map((s, i) => (
                    <div key={i} style={{
                      padding: ".35rem .5rem",
                      background: C.bgCard,
                      borderRadius: 6,
                      marginBottom: ".25rem",
                      fontSize: 11,
                      color: C.dim,
                      display: "flex", justifyContent: "space-between", gap: ".5rem",
                    }}>
                      <span style={{flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>
                        {formatRelDate(s.date)} · {s.label || s.type}
                        {s.coach ? ` · ${s.coach}` : ""}
                      </span>
                      <span style={{color: C.white, fontWeight: 700, flexShrink: 0}}>
                        {s.value}{s.unit === "min" ? "m" : s.unit === "pucks" ? " pucks" : " " + s.unit}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
