// The only module that touches persistence for the Cognitive Gym.
// Local-only via localStorage under a single key. When the Supabase backend is
// resumed, replace these four exported functions with async versions; the
// drills need only minor `await` changes.
//
// Stored shape:
// { [playerId]: { [drillId]: { level, best, sessions: [{date, score, level, meta}] } } }

const STORAGE_KEY = "rinkreads_gym_v1";
const UNIT_KEY = "rinkreads_gym_unit"; // "ft" | "m" — distance readout preference

// Player's distance unit for readouts. Defaults to feet (hockey convention).
export function getUnit() {
  try { return localStorage.getItem(UNIT_KEY) === "m" ? "m" : "ft"; } catch { return "ft"; }
}
export function setUnit(unit) {
  try { localStorage.setItem(UNIT_KEY, unit === "m" ? "m" : "ft"); } catch { /* unavailable */ }
}

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

const emptyDrill = () => ({ level: 1, streak: { ups: 0, downs: 0 }, best: 0, bestPoints: 0, sessions: [] });

// Read one drill's record, normalized so older records gain the new fields.
export function getDrill(playerId, drillId) {
  const all = readAll();
  const stored = (all[playerId] && all[playerId][drillId]) || {};
  return { ...emptyDrill(), ...stored, streak: { ...emptyDrill().streak, ...(stored.streak || {}) } };
}

// Append a completed session, update level + streak + best + bestPoints, persist.
// Session history is capped at the most recent 200 entries.
export function saveSession(playerId, drillId, session) {
  const all = readAll();
  if (!all[playerId]) all[playerId] = {};
  const drill = { ...emptyDrill(), ...(all[playerId][drillId] || {}) };
  drill.level = session.level;
  drill.streak = session.streak || { ups: 0, downs: 0 };
  drill.best = Math.max(drill.best, Math.round(session.score));
  drill.bestPoints = Math.max(drill.bestPoints || 0, Math.round(session.points || 0));
  drill.sessions.push({
    date: new Date().toISOString(),
    score: Math.round(session.score),
    points: Math.round(session.points || 0),
    level: session.level,
    meta: session.meta || null,
  });
  if (drill.sessions.length > 200) drill.sessions = drill.sessions.slice(-200);
  all[playerId][drillId] = drill;
  writeAll(all);
  return drill;
}

// Sum points across all sessions of all drills. Pure; legacy point-less
// sessions count as 0. Exported for testing and reuse.
export function careerPointsFromDrills(drills) {
  let total = 0;
  for (const d of Object.values(drills || {})) {
    for (const s of d.sessions || []) total += s.points || 0;
  }
  return total;
}

// Aggregate stats across all drills for a player: total sessions, distinct
// days trained, and the current consecutive-day streak (ending today).
export function getStats(playerId) {
  const drills = readAll()[playerId] || {};
  let totalSessions = 0;
  let bestSessionPoints = 0;
  let topLevel = 1;
  let fastestRt = null;
  const days = new Set();
  Object.values(drills).forEach((drill) => {
    totalSessions += (drill.sessions || []).length;
    topLevel = Math.max(topLevel, drill.level || 1);
    (drill.sessions || []).forEach((s) => {
      days.add(s.date.slice(0, 10));
      bestSessionPoints = Math.max(bestSessionPoints, s.points || 0);
      const rt = s.meta && s.meta.avgRt;
      if (rt && (fastestRt === null || rt < fastestRt)) fastestRt = rt;
    });
  });

  // current streak ending today (today not-yet-trained doesn't break it)
  let streak = 0;
  const today = new Date();
  for (let back = 0; back < 365; back += 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - back);
    const key = d.toISOString().slice(0, 10);
    if (days.has(key)) streak += 1;
    else if (back === 0) continue;
    else break;
  }

  // longest consecutive-day run ever
  const sorted = [...days].sort();
  let longestStreak = 0;
  let run = 0;
  let prev = null;
  for (const key of sorted) {
    if (prev) {
      const diff = Math.round(
        (new Date(key + "T00:00:00") - new Date(prev + "T00:00:00")) / 86400000
      );
      run = diff === 1 ? run + 1 : 1;
    } else {
      run = 1;
    }
    if (run > longestStreak) longestStreak = run;
    prev = key;
  }

  return {
    totalSessions,
    daysTrained: days.size,
    streak,
    longestStreak,
    careerPoints: careerPointsFromDrills(drills),
    bestSessionPoints,
    topLevel,
    fastestRt,
  };
}
