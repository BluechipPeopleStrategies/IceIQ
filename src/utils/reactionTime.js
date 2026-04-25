// Reaction-time log for scenarios. Mirrors Hockey IntelliGym's idea of
// tracking time-to-correct-answer over time so improvement is visible.
// Storage is per-player keyed; ephemeral demo sessions get aggregated
// under "__demo__".

import { lsGetJSON, lsSetJSON } from "./storage.js";

const LS_KEY = "rinkreads_rt_log_v1";

// Shape: { [playerId]: [ { id, cat, ms, ok, reason, ts }, ... ] }

export function logReactionTime(playerId, entry) {
  if (!playerId) return;
  const all = lsGetJSON(LS_KEY, {});
  const arr = Array.isArray(all[playerId]) ? all[playerId] : [];
  arr.push({ ...entry, ts: Date.now() });
  // Cap per-player to last 500 to keep LS sane.
  if (arr.length > 500) arr.splice(0, arr.length - 500);
  all[playerId] = arr;
  lsSetJSON(LS_KEY, all);
}

export function getReactionLog(playerId) {
  if (!playerId) return [];
  const all = lsGetJSON(LS_KEY, {});
  return Array.isArray(all[playerId]) ? all[playerId] : [];
}

// Rolling stats — last N attempts. Returns { count, correct, avgMs,
// medianMs, fastestMs }. Useful for the Report screen widget that shows
// "you're 320ms faster than two weeks ago."
export function reactionStats(playerId, lastN = 50) {
  const log = getReactionLog(playerId).slice(-lastN);
  const okOnly = log.filter(e => e.ok);
  if (!okOnly.length) {
    return { count: log.length, correct: 0, avgMs: null, medianMs: null, fastestMs: null };
  }
  const sorted = okOnly.map(e => e.ms).sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  return {
    count: log.length,
    correct: okOnly.length,
    avgMs: Math.round(sum / sorted.length),
    medianMs: sorted[Math.floor(sorted.length / 2)],
    fastestMs: sorted[0],
  };
}
