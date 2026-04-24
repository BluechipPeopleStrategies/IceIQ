// Streaks beyond the daily one.
// - Weekly streak: weeks in a row the player took >= 1 quiz.
// - Category streak: longest active consecutive-correct run per quiz
//   category, tracked across all quizzes.
//
// Daily streak lives separately in App.jsx (LS key iceiq_streak) — unchanged.

import { lsGetJSON, lsSetJSON } from "./storage.js";

const LS_WEEKLY = "iceiq_weekly_streak_v1"; // per-player map: { [id]: { count, lastWeek } }
const LS_CAT    = "iceiq_cat_streak_v1";    // per-player map: { [id]: { [cat]: count } }

// ─────────────────────────────────────────────
// Week key (ISO-ish: YYYY-Www, Sunday-anchored for hockey-season feel)
// ─────────────────────────────────────────────
function weekKey(d = new Date()) {
  const dt = new Date(d.getTime());
  // Roll to the Sunday that starts this week.
  dt.setHours(0, 0, 0, 0);
  dt.setDate(dt.getDate() - dt.getDay());
  return dt.toISOString().slice(0, 10); // "YYYY-MM-DD" of the Sunday
}

function prevWeekKey(key) {
  const d = new Date(key + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - 7);
  return d.toISOString().slice(0, 10);
}

// ─────────────────────────────────────────────
// Weekly streak
// ─────────────────────────────────────────────
export function getWeeklyStreak(playerId) {
  try {
    const m = lsGetJSON(LS_WEEKLY, {});
    return m[playerId] || { count: 0, lastWeek: null };
  } catch { return { count: 0, lastWeek: null }; }
}

/** Call after a quiz finishes. Returns { count, lastWeek, bumped, milestone } */
export function bumpWeeklyStreak(playerId) {
  const cur = getWeeklyStreak(playerId);
  const thisWeek = weekKey();
  if (cur.lastWeek === thisWeek) return { ...cur, bumped: false, milestone: null };
  const justMissedPrev = cur.lastWeek && cur.lastWeek === prevWeekKey(thisWeek);
  const next = {
    count: justMissedPrev ? cur.count + 1 : 1,
    lastWeek: thisWeek,
  };
  const milestone = [2, 4, 8, 12, 24, 52].includes(next.count) ? next.count : null;
  try {
    const m = lsGetJSON(LS_WEEKLY, {});
    m[playerId] = next;
    lsSetJSON(LS_WEEKLY, m);
  } catch {}
  return { ...next, bumped: true, milestone };
}

// ─────────────────────────────────────────────
// Category streak
// ─────────────────────────────────────────────
export function getCategoryStreaks(playerId) {
  try {
    const m = lsGetJSON(LS_CAT, {});
    return m[playerId] || {};
  } catch { return {}; }
}

/** Returns the top category streak as [cat, count] or null. */
export function topCategoryStreak(playerId) {
  const s = getCategoryStreaks(playerId);
  let best = null;
  for (const [cat, count] of Object.entries(s)) {
    if (count >= 3 && (!best || count > best[1])) best = [cat, count];
  }
  return best;
}

/**
 * Update category streaks from a session's results[]. Each result is
 * { cat, ok }. Right answer bumps the cat's streak; wrong resets to 0.
 * Returns a list of milestones hit during this session for toast firing.
 */
export function updateCategoryStreaks(playerId, results) {
  if (!playerId || !Array.isArray(results) || !results.length) return [];
  const milestones = [];
  try {
    const m = lsGetJSON(LS_CAT, {});
    const cur = { ...(m[playerId] || {}) };
    for (const r of results) {
      if (!r?.cat) continue;
      if (r.ok) {
        cur[r.cat] = (cur[r.cat] || 0) + 1;
        if ([5, 10, 20].includes(cur[r.cat])) {
          milestones.push({ cat: r.cat, count: cur[r.cat] });
        }
      } else {
        cur[r.cat] = 0;
      }
    }
    m[playerId] = cur;
    lsSetJSON(LS_CAT, m);
  } catch {}
  return milestones;
}

export function resetStreaks(playerId) {
  try {
    for (const key of [LS_WEEKLY, LS_CAT]) {
      const m = lsGetJSON(key, {});
      delete m[playerId];
      lsSetJSON(key, m);
    }
  } catch {}
}
