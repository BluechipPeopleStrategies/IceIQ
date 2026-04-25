// Dev-only auth bypass. Invisible to real users — only activates when the
// localStorage flag `rinkreads_dev_bypass` is set to "1", which you can only
// do via DevTools. When enabled, AuthScreen surfaces a dev panel and
// `window.__dev` exposes state helpers for rapid iteration.

import { lsGet, lsSet, lsRemove, lsGetJSON } from "./storage.js";

const LS_FLAG     = "rinkreads_dev_bypass";
const LS_PROFILE  = "rinkreads_dev_profile";

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
