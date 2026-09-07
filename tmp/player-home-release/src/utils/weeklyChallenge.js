// Weekly Challenge — ISO week tracking and seeded shuffle
// A new challenge drops every Monday. Same questions for everyone that week.

import { lsGetJSON, lsSetJSON } from "./storage.js";

const STORAGE_KEY = "rinkreads_weekly";

// ISO week number: 1–52 (or 53). Changes every Monday.
export function getISOWeek(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return { week: Math.ceil((((d - yearStart) / 86400000) + 1) / 7), year: d.getUTCFullYear() };
}

export function getWeekKey() {
  const { week, year } = getISOWeek();
  return `${year}_W${String(week).padStart(2, "0")}`;
}

// Date of the next weekly unlock (Monday 00:00 UTC) as a real Date object.
// Format locally with Intl.DateTimeFormat to show the user their local
// equivalent (e.g. Sunday 5 PM Pacific, Sunday 8 PM Eastern).
export function getNextUnlockDate() {
  const now = new Date();
  const utcDay = now.getUTCDay(); // 0=Sun, 1=Mon … 6=Sat
  const daysUntilMon = utcDay === 0 ? 1 : 8 - utcDay;
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilMon));
}

// Milliseconds until next Monday 00:00 UTC (kept for existing callers).
export function msUntilNextWeek() {
  return getNextUnlockDate() - new Date();
}

// Formatted unlock moment in the user's local timezone.
// Returns e.g. "Sunday, April 27 at 8:00 PM EDT".
export function formatUnlockMoment(date = getNextUnlockDate()) {
  try {
    const dayStr = date.toLocaleString(undefined, { weekday: "long", month: "long", day: "numeric" });
    const timeStr = date.toLocaleString(undefined, { hour: "numeric", minute: "2-digit", timeZoneName: "short" });
    return `${dayStr} at ${timeStr}`;
  } catch {
    return date.toString();
  }
}

// Format countdown string "Xd Yh" or "Xh Ym"
export function formatCountdown(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h ${minutes}m`;
}

// Simple seeded pseudo-random number generator (Mulberry32)
function seededRng(seed) {
  let s = seed >>> 0;
  return function () {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Seeded shuffle — same seed = same order every time
export function seededShuffle(arr, seed) {
  const rng = seededRng(seed);
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Numeric seed from week key string (e.g., "2026_W16" → deterministic number)
export function weekSeed(weekKey = getWeekKey()) {
  let hash = 0;
  for (let i = 0; i < weekKey.length; i++) {
    hash = ((hash << 5) - hash) + weekKey.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Persistence
export function getWeeklyState() {
  return lsGetJSON(STORAGE_KEY, {});
}

export function getThisWeekRecord() {
  return getWeeklyState()[getWeekKey()] || null;
}

export function markWeeklyComplete(score) {
  const state = getWeeklyState();
  state[getWeekKey()] = { completed: true, score, completedAt: new Date().toISOString() };
  // Prune entries older than 8 weeks
  const keys = Object.keys(state).sort().reverse();
  keys.slice(8).forEach(k => delete state[k]);
  lsSetJSON(STORAGE_KEY, state);
}

// ─── Free tier weekly quiz cap ────────────────────────────
const CAP_KEY = "rinkreads_free_cap";
export const FREE_WEEKLY_QUIZ_CAP = 3;

function getCapState() {
  return lsGetJSON(CAP_KEY, {});
}

export function getFreeQuizCount() {
  return getCapState()[getWeekKey()] || 0;
}

export function isAtFreeQuizCap() {
  return getFreeQuizCount() >= FREE_WEEKLY_QUIZ_CAP;
}

export function incrementFreeQuizCount() {
  const state = getCapState();
  const key = getWeekKey();
  state[key] = (state[key] || 0) + 1;
  // Prune entries older than 4 weeks
  const keys = Object.keys(state).sort().reverse();
  keys.slice(4).forEach(k => delete state[k]);
  lsSetJSON(CAP_KEY, state);
}
