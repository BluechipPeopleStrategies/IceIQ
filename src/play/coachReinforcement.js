const KEY = "rinkreads_coach_reinforcement_v1";

function hash(value) {
  return String(value).split("").reduce((result, char) => ((result * 31) + char.charCodeAt(0)) >>> 0, 7);
}

function nextGap(seed, count) {
  return 2 + (hash(`${seed}:${count}`) % 3);
}

export function initialCoachReinforcement(seed = `${Date.now()}`) {
  return { seed, spotlightCount: 0, firstCorrectShown: false, correctSinceCoach: 0, nextGap: nextGap(seed, 0), handledIds: [] };
}

export function applyCoachAnswer(state, { id, correct, force = false }) {
  if (state.handledIds.includes(id)) return { state, showCoach: false };
  const handledIds = [...state.handledIds, id].slice(-100);
  if (!correct || force) return { state: { ...state, handledIds }, showCoach: true };
  const count = state.correctSinceCoach + 1;
  const showCoach = !state.firstCorrectShown || count >= state.nextGap;
  if (!showCoach) return { state: { ...state, correctSinceCoach: count, handledIds }, showCoach: false };
  const spotlightCount = state.spotlightCount + 1;
  return { state: { ...state, firstCorrectShown: true, correctSinceCoach: 0, spotlightCount, nextGap: nextGap(state.seed, spotlightCount), handledIds }, showCoach: true };
}

export function loadCoachReinforcement(storage = globalThis.sessionStorage) {
  try { return JSON.parse(storage.getItem(KEY)) || initialCoachReinforcement(); } catch { return initialCoachReinforcement(); }
}

export function saveCoachReinforcement(storage = globalThis.sessionStorage, state) {
  try { storage.setItem(KEY, JSON.stringify(state)); } catch {}
}
