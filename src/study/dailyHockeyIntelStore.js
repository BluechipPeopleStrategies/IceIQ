import { selectDailyIntel, markDailyIntelRead, appendLegacyRead, dailyIntelStorageKey, LEGACY_INTEL_READ_KEY } from './dailyHockeyIntelCore.js';

export function loadDailyIntel(storage, config, fallback = null) {
  let previous = fallback, persisted = true;
  try {
    const raw = storage.getItem(dailyIntelStorageKey(config.playerId, config.ageBand));
    if (raw) previous = JSON.parse(raw);
  } catch { persisted = false; }
  return { state: selectDailyIntel({ ...config, previous }), persisted };
}
export function saveDailyIntel(storage, state) {
  try {
    const value = JSON.stringify(state);
    if (storage.getItem(state.identity) !== value) storage.setItem(state.identity, value);
    return true;
  } catch { return false; }
}
export function readDailyIntelCard(storage, config, current, id, onFirstRead) {
  // Stale events from yesterday or another player must not consume today's set.
  if (current?.dayKey !== config.dayKey || current?.identity !== dailyIntelStorageKey(config.playerId, config.ageBand)
    || !current?.todayIds?.includes(id)) return { state: current, accepted: false, persisted: false };
  const latest = loadDailyIntel(storage, config, current).state;
  const state = markDailyIntelRead(latest, id);
  if (!state.todayIds.includes(id)) return { state, accepted: false, persisted: false };
  const persisted = saveDailyIntel(storage, state);
  // Existing quests still count a new piece read once. Re-reading on a later
  // day completes that daily card without manufacturing more historical credit.
  try {
    const raw = storage.getItem(LEGACY_INTEL_READ_KEY);
    const legacy = appendLegacyRead(raw ? JSON.parse(raw) : [], id);
    if (legacy.added) {
      storage.setItem(LEGACY_INTEL_READ_KEY, JSON.stringify(legacy.values));
      onFirstRead?.();
    }
  } catch { /* Do not overwrite malformed or inaccessible historical progress. */ }
  return { state, accepted: true, persisted };
}
