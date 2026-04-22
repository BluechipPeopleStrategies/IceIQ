const TRAINING_KEY = "iceiq_training_log";

export function getTrainingLog(playerId) {
  try {
    const raw = localStorage.getItem(TRAINING_KEY);
    const all = raw ? JSON.parse(raw) : {};
    return all[playerId] || { sessions: [] };
  } catch { return { sessions: [] }; }
}

export function saveTrainingSession(playerId, type, value, unit, label = "", date = "", notes = "", coach = "", price = null) {
  try {
    const raw = localStorage.getItem(TRAINING_KEY);
    const all = raw ? JSON.parse(raw) : {};
    if (!all[playerId]) all[playerId] = { sessions: [] };
    const today = new Date().toISOString().slice(0, 10);
    const priceNum = (price === null || price === "" || price === undefined) ? null : Number(price);
    all[playerId].sessions.push({
      date: date || today,
      type, value: Number(value), unit,
      ...(label ? { label } : {}),
      ...(notes ? { notes } : {}),
      ...(coach ? { coach } : {}),
      ...(Number.isFinite(priceNum) && priceNum > 0 ? { price: priceNum } : {}),
    });
    if (all[playerId].sessions.length > 200) {
      all[playerId].sessions = all[playerId].sessions.slice(-200);
    }
    localStorage.setItem(TRAINING_KEY, JSON.stringify(all));
  } catch {}
}

// Bulk-seed plausible training sessions across a roster. Used by coach demo
// so every player in the dashboard has realistic "extra training" data —
// ice time, practice, off-ice, stick-handling — staggered across the last
// two weeks. Idempotent by design: if a player already has sessions logged,
// we skip them (don't double-seed). Safe to call multiple times.
export function seedDemoTrainingForRoster(roster, perPlayer = 4) {
  if (!Array.isArray(roster) || !roster.length) return;
  try {
    const raw = localStorage.getItem(TRAINING_KEY);
    const all = raw ? JSON.parse(raw) : {};
    const TYPES = [
      { type: "ice_time",       unit: "min", min: 50, max: 80, coach: "Coach Benetti",     label: "Team practice" },
      { type: "practice",       unit: "min", min: 25, max: 55, coach: "Coach Benetti",     label: "Skills session" },
      { type: "off_ice",        unit: "min", min: 20, max: 40, coach: "",                  label: "Off-ice conditioning" },
      { type: "stick_handling", unit: "min", min: 10, max: 25, coach: "",                  label: "Stick-handling reps" },
      { type: "video",          unit: "min", min: 15, max: 30, coach: "Coach Benetti",     label: "Video review" },
    ];
    const nowMs = Date.now();
    for (const p of roster) {
      if (!p?.id) continue;
      if (!all[p.id]) all[p.id] = { sessions: [] };
      // Skip players who already have seeded sessions so repeat-entering the
      // demo doesn't pile up duplicates.
      if (all[p.id].sessions.length >= perPlayer) continue;
      for (let i = 0; i < perPlayer; i++) {
        const t = TYPES[(i + (p.id.length % TYPES.length)) % TYPES.length];
        const daysAgo = i * 3 + (p.id.length % 3);
        const variance = ((p.iq || 70) % 20) / 20;
        const value = t.min + Math.round(variance * (t.max - t.min));
        const date = new Date(nowMs - daysAgo * 86400000).toISOString().slice(0, 10);
        all[p.id].sessions.push({
          date, type: t.type, value, unit: t.unit, label: t.label,
          ...(t.coach ? { coach: t.coach } : {}),
        });
      }
    }
    localStorage.setItem(TRAINING_KEY, JSON.stringify(all));
  } catch {}
}

export function getTrainingSummary(sessions, type) {
  const typed = sessions.filter(s => s.type === type);
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  return {
    total: typed.reduce((n, s) => n + s.value, 0),
    week: typed.filter(s => s.date >= weekAgo).reduce((n, s) => n + s.value, 0),
    todayCount: typed.filter(s => s.date === today).length,
    sessions: typed.length,
  };
}
