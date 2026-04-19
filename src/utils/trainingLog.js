const TRAINING_KEY = "iceiq_training_log";

export function getTrainingLog(playerId) {
  try {
    const raw = localStorage.getItem(TRAINING_KEY);
    const all = raw ? JSON.parse(raw) : {};
    return all[playerId] || { sessions: [] };
  } catch { return { sessions: [] }; }
}

export function saveTrainingSession(playerId, type, value, unit, label = "", date = "", notes = "") {
  try {
    const raw = localStorage.getItem(TRAINING_KEY);
    const all = raw ? JSON.parse(raw) : {};
    if (!all[playerId]) all[playerId] = { sessions: [] };
    const today = new Date().toISOString().slice(0, 10);
    all[playerId].sessions.push({
      date: date || today,
      type, value: Number(value), unit,
      ...(label ? { label } : {}),
      ...(notes ? { notes } : {})
    });
    if (all[playerId].sessions.length > 200) {
      all[playerId].sessions = all[playerId].sessions.slice(-200);
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
