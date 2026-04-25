// Device-level locking for the Free tier.
// The lock is tied to the device, not the account — it survives logout/re-login.
// Bypassable by a determined user (localStorage can be cleared), but good enough
// for the free tier's one-age-group-per-device enforcement.

import { lsGet, lsSet } from "./storage.js";

const KEYS = {
  deviceId:         "rinkreads_device_id",
  ageGroupLock:     "rinkreads_age_group_lock",
  switchCount:      "rinkreads_switch_count",
  seasonResetYear:  "rinkreads_season_reset_year",
};

const FREE_SWITCH_ALLOWANCE = 1; // one free switch, then Pro prompt

function generateUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  // Fallback for very old browsers — RFC4122 v4-style
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

// ─────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────

/** Get (or create) the persistent device ID. Never overwrites an existing value. */
export function getDeviceId() {
  let id = lsGet(KEYS.deviceId);
  if (id) return id;
  id = generateUUID();
  lsSet(KEYS.deviceId, id);
  return id;
}

/** Get the locked age group for this device, or null if not yet set. */
export function getAgeGroupLock() {
  return lsGet(KEYS.ageGroupLock);
}

/** Lock this device to the given age group. Records device association. */
export function setAgeGroupLock(ageGroup) {
  if (!ageGroup) return;
  getDeviceId(); // ensure device id exists
  lsSet(KEYS.ageGroupLock, ageGroup);
}

/**
 * Check whether a free-tier user can switch age groups right now.
 * Returns { allowed: boolean, switchesUsed: number, switchesAllowed: number, reason?: string }
 */
export function canSwitchAgeGroup() {
  checkSeasonReset(); // opportunistically apply seasonal reset
  const used = parseInt(lsGet(KEYS.switchCount) || "0", 10) || 0;
  if (used < FREE_SWITCH_ALLOWANCE) {
    return { allowed: true, switchesUsed: used, switchesAllowed: FREE_SWITCH_ALLOWANCE };
  }
  return {
    allowed: false,
    switchesUsed: used,
    switchesAllowed: FREE_SWITCH_ALLOWANCE,
    reason: "upgrade_required",
  };
}

/** Record that the user just switched age groups. Returns the new count. */
export function recordAgeGroupSwitch() {
  const used = parseInt(lsGet(KEYS.switchCount) || "0", 10) || 0;
  const next = used + 1;
  lsSet(KEYS.switchCount, String(next));
  return next;
}

/**
 * Seasonal reset: on or after Sept 1 of any year, if the stored year differs
 * from the current year, zero out switchCount and stamp the new year.
 * Safe to call on every app load.
 */
export function checkSeasonReset() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed, Sept = 8
  const afterSept1 = month >= 8; // Sept 1 or later this calendar year
  const resetYear = afterSept1 ? year : year - 1; // the "season's start year"
  const stored = lsGet(KEYS.seasonResetYear);
  if (stored === String(resetYear)) return false;
  lsSet(KEYS.switchCount, "0");
  lsSet(KEYS.seasonResetYear, String(resetYear));
  return true;
}
