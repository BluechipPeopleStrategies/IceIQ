// Per-device counter for the FREE-tier rink teaser.
//
// Policy: a FREE user gets up to RINK_FREE_PER_AGE rink scenarios per age
// group. After that, `buildQueue` injects a rinkLocked sentinel that the
// quiz renderer turns into the standard upgrade card (see canAccess
// "rinkQuestions" in tierGate.js for the copy + target tier).
//
// Storage: localStorage key `iceiq_rink_seen` as JSON keyed by age code:
//   { u7: 2, u9: 3, u11: 0, ... }
// We count IDs rather than raw increments so re-answering the same
// scenario (e.g. after a refresh) doesn't double-count.

import { lsGetJSON, lsSetJSON } from "./storage.js";

const LS_KEY = "iceiq_rink_seen";

export const RINK_FREE_PER_AGE = 3;

// Map "U9 / Novice" → "u9" so callers can pass either form.
function normalizeAge(ageOrLevel) {
  if (!ageOrLevel) return null;
  const s = String(ageOrLevel);
  const m = s.match(/^(U\d{1,2})/i);
  return m ? m[1].toLowerCase() : s.toLowerCase();
}

function read() {
  const parsed = lsGetJSON(LS_KEY, null);
  if (!parsed) return { seen: {}, ids: {} };
  return {
    seen: parsed.seen || {},
    ids: parsed.ids || {},
  };
}

function write(state) {
  lsSetJSON(LS_KEY, state);
}

/** How many rinks has this device answered in the given age group? */
export function getRinkSeenCount(ageOrLevel) {
  const age = normalizeAge(ageOrLevel);
  if (!age) return 0;
  return read().seen[age] || 0;
}

/**
 * Record that the device answered a rink question. Idempotent per id —
 * calling twice with the same id won't double-count.
 */
export function recordRinkSeen(ageOrLevel, questionId) {
  const age = normalizeAge(ageOrLevel);
  if (!age || !questionId) return;
  const state = read();
  const ids = state.ids[age] || [];
  if (ids.includes(questionId)) return;
  state.ids[age] = [...ids, questionId];
  state.seen[age] = (state.seen[age] || 0) + 1;
  write(state);
}

/**
 * Should the user see another rink in this age group?
 * Non-FREE tiers always allowed; FREE capped at RINK_FREE_PER_AGE.
 */
export function canSeeMoreRinks(ageOrLevel, tier) {
  if (tier !== "FREE") return true;
  return getRinkSeenCount(ageOrLevel) < RINK_FREE_PER_AGE;
}

/** How many rink slots does a FREE user have remaining in this age? */
export function rinksRemainingForFree(ageOrLevel) {
  return Math.max(0, RINK_FREE_PER_AGE - getRinkSeenCount(ageOrLevel));
}
