// Durable local copy of the player-owned parts of `player`.
//
// WHY THIS EXISTS. On 2026-08-03 Thomas completed five of the six First-Five
// quests and lost all five. The one that survived was the training log — and
// the training log is the only one that writes localStorage synchronously
// before touching the network (utils/trainingLog.js). Everything else lived in
// React state whose sole durable home was Supabase, written last, unretried and
// unbounded. Durability of a child's answers equalled the durability of one
// HTTP request.
//
// The quest flags made it visible: rate6/quiz1/goal1 read `player` (volatile)
// while read3/train1 read localStorage (durable), so half the checklist reset
// and half did not.
//
// So: localStorage is the system of record for anything the user can change
// from inside the app, and Supabase is a sync target. Cache first, navigate
// second, sync third.

import { lsGetJSON, lsSetJSON } from "./storage.js";

const KEY = "rinkreads_player_cache_v1";

// Fields the user can change from inside the app. Anything not listed stays
// server-owned (id, isAdmin, birthYear, signupMode…) and is never written back
// from the cache — otherwise a stale local copy could resurrect a revoked flag.
const FIELDS = [
  "selfRatings", "goals", "quizHistory", "parentRatings",
  "name", "level", "position", "season", "sessionLength", "colorblind",
];

// Merged key-by-key rather than replaced, so a server row the cache never saw
// is not dropped when the two are combined.
const MERGE_AS_MAP = new Set(["selfRatings", "goals", "parentRatings"]);

export function cachePlayer(player) {
  if (!player?.id) return;
  const all = lsGetJSON(KEY, {}) || {};
  const slot = { ...(all[player.id] || {}) };
  for (const f of FIELDS) if (player[f] !== undefined) slot[f] = player[f];
  slot.__updatedAt = Date.now();
  all[player.id] = slot;
  lsSetJSON(KEY, all);
}

export function readCachedPlayer(playerId) {
  if (!playerId) return null;
  return (lsGetJSON(KEY, {}) || {})[playerId] || null;
}

/**
 * Merge the local cache OVER a freshly loaded server copy.
 *
 * Local wins. The cache is written synchronously at the instant of the user's
 * action, while the server copy may be missing a write that failed, timed out,
 * or is still in flight. Preferring the server here would re-introduce exactly
 * the data loss this module exists to stop.
 *
 * quizHistory takes whichever side has more sessions rather than concatenating,
 * because the two are the same list at different points in time and appending
 * would double-count — the session counter Thomas saw reading "9 of 9" is the
 * symptom of counting the same session more than once.
 */
export function mergeCachedPlayer(serverPlayer) {
  const cached = readCachedPlayer(serverPlayer?.id);
  if (!cached) return serverPlayer;
  const out = { ...serverPlayer };
  for (const f of FIELDS) {
    if (cached[f] === undefined) continue;
    if (MERGE_AS_MAP.has(f)) {
      out[f] = { ...(serverPlayer[f] || {}), ...(cached[f] || {}) };
    } else if (f === "quizHistory") {
      const s = serverPlayer.quizHistory || [];
      const c = cached.quizHistory || [];
      out.quizHistory = c.length > s.length ? c : s;
    } else {
      out[f] = cached[f];
    }
  }
  return out;
}

/** Drop one player's cache. Used on sign-out so a shared device doesn't leak. */
export function clearCachedPlayer(playerId) {
  if (!playerId) return;
  const all = lsGetJSON(KEY, {}) || {};
  if (!(playerId in all)) return;
  delete all[playerId];
  lsSetJSON(KEY, all);
}
