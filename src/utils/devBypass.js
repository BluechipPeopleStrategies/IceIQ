// Dev-only auth bypass. For beta safety, this is disabled unless explicitly
// enabled with VITE_ENABLE_DEV_BYPASS=1.
//
// When disabled, old localStorage flags and hidden tap unlocks are ignored.
// To re-enable for local owner testing, add VITE_ENABLE_DEV_BYPASS=1 to .env.local.

import { lsGet, lsSet, lsRemove, lsGetJSON } from "./storage.js";

const LS_FLAG = "rinkreads_dev_bypass";
const LS_PROFILE = "rinkreads_dev_profile";

const DEV_BYPASS_ALLOWED =
  typeof import.meta !== "undefined" &&
  import.meta.env &&
  import.meta.env.VITE_ENABLE_DEV_BYPASS === "1";

export const DEV_BYPASS_SECRET = "puck";

export function enableDevBypass() {
  if (!DEV_BYPASS_ALLOWED) return;
  lsSet(LS_FLAG, "1");
}

export function disableDevBypass() {
  lsRemove(LS_FLAG);
}

// Player ids that are NOT Supabase UUIDs. Call sites that guard
// Supabase calls must skip when the id is ephemeral.
export function isEphemeralPlayer(id) {
  return (
    id === "__demo__" ||
    id === "__preview__" ||
    id === "__dev__" ||
    id === "__dev_coach__" ||
    id === "__demo_coach__"
  );
}

export function isDevBypassEnabled() {
  return DEV_BYPASS_ALLOWED && lsGet(LS_FLAG) === "1";
}

export function getDevProfile() {
  return lsGetJSON(LS_PROFILE, null);
}

export function setDevProfile(profile) {
  if (!DEV_BYPASS_ALLOWED) return;
  lsSet(LS_PROFILE, JSON.stringify(profile));
}

export function clearDevProfile() {
  lsRemove(LS_PROFILE);
}

// Build a minimal dev player object. No seeded history, matches what a real
// new signup actually looks like.
export function buildDevPlayer({ level, position, name, quizHistory }) {
  return {
    id: "__dev__",
    name: name || "Dev User",
    level: level || "U11 / Atom",
    position: position || "Multiple",
    season: undefined,
    sessionLength: 10,
    colorblind: false,
    coachCode: "",
    quizHistory: Array.isArray(quizHistory) ? quizHistory : [],
    selfRatings: {},
    goals: {},
    parentRatings: null,
    trainingSessions: [],
    __dev: true,
  };
}
