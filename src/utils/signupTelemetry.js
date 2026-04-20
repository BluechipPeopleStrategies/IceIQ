// Tracks which CTA drove a signup so we can see which hooks convert.
// Two-step protocol:
//   1. CTA click → markSignupIntent(source) stamps a pending source in localStorage.
//   2. AuthScreen finishes signup → logSignupComplete() reads the pending source,
//      appends a completed entry to the history, and clears the pending stamp.

const PENDING_KEY = "iceiq_signup_pending_source";
const HISTORY_KEY = "iceiq_signup_sources_v1";
const MAX_HISTORY = 100;

export function markSignupIntent(source) {
  if (!source || typeof window === "undefined") return;
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify({ source, ts: new Date().toISOString() }));
  } catch {}
}

export function logSignupComplete({ role = null, level = null } = {}) {
  if (typeof window === "undefined") return null;
  try {
    const pendingRaw = localStorage.getItem(PENDING_KEY);
    const pending = pendingRaw ? JSON.parse(pendingRaw) : null;
    const source = pending?.source || "auth_direct";
    const intent_ts = pending?.ts || null;

    const raw = localStorage.getItem(HISTORY_KEY);
    const list = raw ? JSON.parse(raw) : [];
    list.push({ source, intent_ts, complete_ts: new Date().toISOString(), role, level });
    if (list.length > MAX_HISTORY) list.splice(0, list.length - MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
    localStorage.removeItem(PENDING_KEY);
    return { source, intent_ts };
  } catch { return null; }
}

export function getSignupConversionLog() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function getSignupSourceBreakdown() {
  const log = getSignupConversionLog();
  const counts = {};
  for (const entry of log) counts[entry.source] = (counts[entry.source] || 0) + 1;
  return counts;
}

// Dev convenience: `window.__iceiqSignupLog()` in the console.
if (typeof window !== "undefined") {
  window.__iceiqSignupLog = () => ({
    history: getSignupConversionLog(),
    breakdown: getSignupSourceBreakdown(),
  });
}
