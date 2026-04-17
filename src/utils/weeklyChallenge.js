// Weekly Challenge — ISO week tracking and seeded shuffle
// A new challenge drops every Monday. Same questions for everyone that week.

const STORAGE_KEY = "iceiq_weekly";

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

// Milliseconds until next Monday 00:00 UTC
export function msUntilNextWeek() {
  const now = new Date();
  const utcDay = now.getUTCDay(); // 0=Sun, 1=Mon … 6=Sat
  const daysUntilMon = utcDay === 0 ? 1 : 8 - utcDay;
  const nextMon = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilMon));
  return nextMon - now;
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
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
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
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}
