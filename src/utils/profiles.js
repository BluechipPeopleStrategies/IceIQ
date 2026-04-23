// Child profile system — supports the Family plan (up to 3 profiles) while
// keeping Free and Pro capped at 1 profile each.
//
// Each profile is independent: its own age group, session history, and SMART
// goals. Switching profiles does NOT affect the device-level age group lock
// (which only applies to the Free tier). Pro and Family bypass the device lock.

import { TIERS } from "../config/pricing";
import { lsGet, lsSet, lsGetJSON, lsRemove } from "./storage.js";

const KEYS = {
  profiles:       "iceiq_child_profiles",
  activeProfile:  "iceiq_active_profile",
};

function generateUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function readProfiles() {
  const parsed = lsGetJSON(KEYS.profiles, []);
  return Array.isArray(parsed) ? parsed : [];
}
function writeProfiles(list) {
  lsSet(KEYS.profiles, JSON.stringify(list));
}

// ─────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────

/** Return the max number of profiles allowed for a given tier. */
export function getProfileLimit(tier) {
  // Accept either a tier key string ("FREE"/"PRO"/"FAMILY"/"TEAM") or the tier object
  let t = tier;
  if (typeof tier === "string") t = TIERS[tier.toUpperCase()];
  if (!t) return 1;
  if (typeof t.profiles === "number") return t.profiles;
  return 1;
}

/** Get all profiles for this device (JSON array). */
export function getProfiles() {
  return readProfiles();
}

/**
 * Get the active profile — the one the user is currently playing as.
 * If none is explicitly set and profiles exist, returns the first one.
 * Returns null if there are no profiles.
 */
export function getActiveProfile() {
  const profiles = readProfiles();
  if (profiles.length === 0) return null;
  const activeId = lsGet(KEYS.activeProfile);
  if (activeId) {
    const hit = profiles.find(p => p.id === activeId);
    if (hit) return hit;
  }
  return profiles[0];
}

/** Set which profile is active by id. Returns the profile, or null if not found. */
export function setActiveProfile(profileId) {
  const profiles = readProfiles();
  const hit = profiles.find(p => p.id === profileId);
  if (!hit) return null;
  lsSet(KEYS.activeProfile, profileId);
  return hit;
}

/**
 * Create a new profile. Returns:
 *   { ok: true, profile }                     — success
 *   { ok: false, reason: "upgrade_required",  — limit reached, show upgrade prompt
 *     suggestedTier: "FAMILY" }
 *   { ok: false, reason: "invalid" }          — bad input
 *
 * `tier` is the current user tier key ("FREE" | "PRO" | "FAMILY" | "TEAM")
 * or a tier object from pricing.js.
 */
export function createProfile(name, ageGroup, tier) {
  if (!name || !ageGroup) return { ok: false, reason: "invalid" };
  const profiles = readProfiles();
  const limit = getProfileLimit(tier);
  if (profiles.length >= limit) {
    return {
      ok: false,
      reason: "upgrade_required",
      suggestedTier: limit < 3 ? "FAMILY" : null,
      currentLimit: limit,
    };
  }
  const profile = {
    id: generateUUID(),
    name: String(name).trim(),
    ageGroup,
    positionFilter: null,
    sessionHistory: [],
    smartGoals: [],
    createdAt: new Date().toISOString(),
  };
  writeProfiles([...profiles, profile]);
  // If this is the first profile, mark it active
  if (profiles.length === 0) lsSet(KEYS.activeProfile, profile.id);
  return { ok: true, profile };
}

/** Delete a profile by id. If it was the active profile, falls back to the first remaining (or clears). */
export function deleteProfile(profileId) {
  const profiles = readProfiles();
  const idx = profiles.findIndex(p => p.id === profileId);
  if (idx < 0) return { ok: false, reason: "not_found" };
  const next = [...profiles.slice(0, idx), ...profiles.slice(idx + 1)];
  writeProfiles(next);
  const activeId = lsGet(KEYS.activeProfile);
  if (activeId === profileId) {
    if (next.length > 0) lsSet(KEYS.activeProfile, next[0].id);
    else lsRemove(KEYS.activeProfile);
  }
  return { ok: true };
}

/** Update a profile in place. Returns the updated profile, or null if not found. */
export function updateProfile(profileId, patch) {
  const profiles = readProfiles();
  const idx = profiles.findIndex(p => p.id === profileId);
  if (idx < 0) return null;
  const updated = { ...profiles[idx], ...patch, id: profiles[idx].id, createdAt: profiles[idx].createdAt };
  const next = [...profiles];
  next[idx] = updated;
  writeProfiles(next);
  return updated;
}
