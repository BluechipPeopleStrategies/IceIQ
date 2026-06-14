// Pure incentive/progression helpers for the Cognitive Gym. No DOM, no storage,
// so they are unit-testable in plain Node. All values are derived from data that
// gymStorage already keeps (drill levels, sessions, career points, streaks).

// Mastery star tier from a drill's level: 0 none, 1 bronze, 2 silver, 3 gold.
export const STAR_LEVELS = [5, 10, 15];
export function starTier(level) {
  let t = 0;
  for (const th of STAR_LEVELS) if ((level || 1) >= th) t += 1;
  return t;
}

// Gym XP from points (career XP is xpFromPoints over the career point total).
export function xpFromPoints(points) {
  return Math.max(0, Math.round((points || 0) / 10));
}

// Rank ladder by cumulative XP. Returns { name, index, nextAt } (nextAt null at top).
export const RANKS = [
  { name: "Warming Up", at: 0 },
  { name: "Reading the Ice", at: 500 },
  { name: "Heads Up", at: 1500 },
  { name: "Playmaker", at: 3500 },
  { name: "Hockey IQ", at: 7000 },
];
export function rankForXp(totalXp) {
  const xp = Math.max(0, totalXp || 0);
  let idx = 0;
  for (let i = 0; i < RANKS.length; i += 1) if (xp >= RANKS[i].at) idx = i;
  const next = RANKS[idx + 1] || null;
  return { name: RANKS[idx].name, index: idx, nextAt: next ? next.at : null };
}

// Distinct drills played on the given YYYY-MM-DD, for the daily goal.
export function dailyDrillsDone(records, ymd) {
  let n = 0;
  for (const id of Object.keys(records || {})) {
    const sessions = (records[id] && records[id].sessions) || [];
    if (sessions.some((s) => (s.date || "").slice(0, 10) === ymd)) n += 1;
  }
  return n;
}

// Earned badges from aggregate stats + per-drill records. Returns
// [{ id, label, earned }]. `records` is keyed by drillId.
export function earnedBadges(stats, records) {
  const recs = records || {};
  const ids = Object.keys(recs);
  const totalSessions = (stats && stats.totalSessions) || 0;
  const longest = (stats && stats.longestStreak) || 0;
  const anyLevelUp = ids.some((id) => ((recs[id] && recs[id].sessions) || []).some((s) => (s.level || 1) > 1));
  const allTried = ids.length > 0 && ids.every((id) => (((recs[id] && recs[id].sessions) || []).length) > 0);
  const shootoutSessions = ((recs.shootout && recs.shootout.sessions) || []).length;
  return [
    { id: "firstLevelUp", label: "Level Up", earned: anyLevelUp },
    { id: "weekStreak", label: "7-Day Streak", earned: longest >= 7 },
    { id: "allDrills", label: "Tried Them All", earned: allTried },
    { id: "regular", label: "Gym Regular", earned: totalSessions >= 25 },
    { id: "goalieBeater", label: "Goalie Beater", earned: shootoutSessions >= 10 },
  ];
}
