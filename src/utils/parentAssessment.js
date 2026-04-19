const KEY = "iceiq_parent_assessment";

export function getParentRatings(playerId) {
  if (!playerId) return null;
  try {
    const raw = localStorage.getItem(KEY);
    const all = raw ? JSON.parse(raw) : {};
    return all[playerId] || null;
  } catch { return null; }
}

export function saveParentRatings(playerId, ratings) {
  if (!playerId) return;
  try {
    const raw = localStorage.getItem(KEY);
    const all = raw ? JSON.parse(raw) : {};
    all[playerId] = { ...ratings, updated_at: new Date().toISOString().slice(0, 10) };
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {}
}

export function hasParentRatings(ratings) {
  if (!ratings) return false;
  const { updated_at, ...rest } = ratings;
  return Object.values(rest).some(v => v);
}

export function daysSinceUpdated(ratings) {
  if (!ratings?.updated_at) return null;
  const then = new Date(ratings.updated_at).getTime();
  const now = Date.now();
  return Math.floor((now - then) / 86400000);
}
