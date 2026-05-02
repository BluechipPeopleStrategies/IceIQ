// Dev-only auth bypass. Invisible to real users — only activates when the
// localStorage flag `rinkreads_dev_bypass` is set to "1". Three ways to set it:
//   1. DevTools — `localStorage.setItem('rinkreads_dev_bypass','1')`
//   2. URL param — visit `?devbypass=<DEV_BYPASS_SECRET>` once, page reloads
//      with the panel enabled (param is scrubbed from the URL on entry)
//   3. Hidden tap pattern on AuthScreen — 5 taps on the top-left invisible
//      hotspot within 3 seconds
// When enabled, AuthScreen surfaces a dev panel and `window.__dev` exposes
// state helpers for rapid iteration.

import { lsGet, lsSet, lsRemove, lsGetJSON } from "./storage.js";

const LS_FLAG     = "rinkreads_dev_bypass";
const LS_PROFILE  = "rinkreads_dev_profile";

// Soft secret for URL/tap unlock. Treat as obscurity (hides the bypass from
// curious users), NOT real security. Anyone with this string and the URL can
// reach the dev panel — that's intentional, since the bypass is for the
// owner accessing from multiple accounts. Change the value to invalidate
// old links (e.g. if you shared a `?devbypass=…` URL and want it to stop
// working). Match is case-sensitive.
export const DEV_BYPASS_SECRET = "puck";

export function enableDevBypass() {
  lsSet(LS_FLAG, "1");
}

export function disableDevBypass() {
  lsRemove(LS_FLAG);
}

// Player ids that are NOT Supabase UUIDs. Call sites that guard
// Supabase calls must skip when the id is ephemeral.
export function isEphemeralPlayer(id) {
  return id === "__demo__" || id === "__preview__" || id === "__dev__" || id === "__dev_coach__" || id === "__demo_coach__";
}

export function isDevBypassEnabled() {
  return lsGet(LS_FLAG) === "1";
}

export function getDevProfile() {
  return lsGetJSON(LS_PROFILE, null);
}

export function setDevProfile(profile) {
  lsSet(LS_PROFILE, JSON.stringify(profile));
}

export function clearDevProfile() {
  lsRemove(LS_PROFILE);
}

// Build a minimal dev player object — no seeded history, matches what a real
// new signup actually looks like. Downstream code must not assume training
// sessions, quiz history, self-ratings etc. exist.
export function buildDevPlayer({ level, position, name }) {
  return {
    id: "__dev__",
    name: name || "Dev User",
    level: level || "U11 / Atom",
    position: position || "Multiple",
    season: undefined,
    sessionLength: 10,
    colorblind: false,
    coachCode: "",
    quizHistory: [],
    selfRatings: {},
    goals: {},
    parentRatings: null,
    trainingSessions: [],
    __dev: true,
  };
}
