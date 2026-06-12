// The only module that touches persistence for the Cognitive Gym.
// Local-only via localStorage under a single key. When the Supabase backend is
// resumed, replace these four exported functions with async versions; the
// drills need only minor `await` changes.
//
// Stored shape:
// { [playerId]: { [drillId]: { level, best, sessions: [{date, score, level, meta}] } } }

const STORAGE_KEY = "rinkreads_gym_v1";

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function writeAll(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // storage unavailable (private mode / quota) — fail silently
  }
}

const emptyDrill = () => ({ level: 1, best: 0, sessions: [] });

// Read one drill's record for a player (level, best, session history).
export function getDrill(playerId, drillId) {
  const all = readAll();
  return (all[playerId] && all[playerId][drillId]) || emptyDrill();
}

// Append a completed session, update level + best, and persist.
// Session history is capped at the most recent 200 entries.
export function saveSession(playerId, drillId, session) {
  const all = readAll();
  if (!all[playerId]) all[playerId] = {};
  const drill = all[playerId][drillId] || emptyDrill();
  drill.level = session.level;
  drill.best = Math.max(drill.best, Math.round(session.score));
  drill.sessions.push({
    date: new Date().toISOString(),
    score: Math.round(session.score),
    level: session.level,
    meta: session.meta || null,
  });
  if (drill.sessions.length > 200) {
    drill.sessions = drill.sessions.slice(-200);
  }
  all[playerId][drillId] = drill;
  writeAll(all);
  return drill;
}

// Aggregate stats across all drills for a player: total sessions, distinct
// days trained, and the current consecutive-day streak (ending today).
export function getStats(playerId) {
  const drills = readAll()[playerId] || {};
  let totalSessions = 0;
  const days = new Set();
  Object.values(drills).forEach((drill) => {
    totalSessions += drill.sessions.length;
    drill.sessions.forEach((s) => days.add(s.date.slice(0, 10)));
  });

  let streak = 0;
  const today = new Date();
  for (let back = 0; back < 365; back += 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - back);
    const key = d.toISOString().slice(0, 10);
    if (days.has(key)) {
      streak += 1;
    } else if (back === 0) {
      // today not yet trained — don't break the streak
      continue;
    } else {
      break;
    }
  }

  return { totalSessions, daysTrained: days.size, streak };
}
