const KEY = "rinkreads_coach_reinforcement_v1";

export function initialCoachReinforcement(seed = `${Date.now()}`) {
  return { seed, spotlightCount: 0, handledIds: [] };
}

export function applyCoachAnswer(state, { id }) {
  const handledIds = state.handledIds.includes(id)
    ? state.handledIds
    : [...state.handledIds, id].slice(-100);
  const spotlightCount = state.spotlightCount + 1;
  return { state: { ...state, spotlightCount, handledIds }, showCoach: true };
}

export function loadCoachReinforcement(storage = globalThis.sessionStorage) {
  try { return JSON.parse(storage.getItem(KEY)) || initialCoachReinforcement(); } catch { return initialCoachReinforcement(); }
}

export function saveCoachReinforcement(storage = globalThis.sessionStorage, state) {
  try { storage.setItem(KEY, JSON.stringify(state)); } catch {}
}
