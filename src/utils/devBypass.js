// Dev-only auth bypass. Invisible to real users — only activates when the
// localStorage flag `iceiq_dev_bypass` is set to "1", which you can only
// do via DevTools. When enabled, AuthScreen surfaces a dev panel and
// `window.__dev` exposes state helpers for rapid iteration.

const LS_FLAG     = "iceiq_dev_bypass";
const LS_PROFILE  = "iceiq_dev_profile";

// Player ids that are NOT Supabase UUIDs. Call sites that guard
// Supabase calls must skip when the id is ephemeral.
export function isEphemeralPlayer(id) {
  return id === "__demo__" || id === "__preview__" || id === "__dev__" || id === "__dev_coach__" || id === "__demo_coach__";
}

export function isDevBypassEnabled() {
  try { return typeof window !== "undefined" && window.localStorage.getItem(LS_FLAG) === "1"; }
  catch { return false; }
}

export function getDevProfile() {
  try {
    const raw = window.localStorage.getItem(LS_PROFILE);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function setDevProfile(profile) {
  try { window.localStorage.setItem(LS_PROFILE, JSON.stringify(profile)); } catch {}
}

export function clearDevProfile() {
  try { window.localStorage.removeItem(LS_PROFILE); } catch {}
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
