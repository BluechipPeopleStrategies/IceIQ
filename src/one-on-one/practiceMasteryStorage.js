import { readMasteryLedger, recordMasteryAttempt, masteryStorageKey } from './spacedMasteryCore.js';

// A broken store is not an empty record. Never overwrite it with a fresh ledger.
export function readPracticeEvidence(raw, options) {
  if (raw !== null && raw !== undefined) {
    const value = JSON.parse(raw);
    if (value?.version !== 1 || !Array.isArray(value.attempts) || typeof value.timeZone !== 'string' || !value.timeZone) throw new TypeError('Unreadable practice history');
    new Intl.DateTimeFormat('en', { timeZone: value.timeZone }).format();
  }
  return readMasteryLedger(raw, options);
}

export function savePracticeEvidence({ playerId, attempt, storage, now }) {
  if (!attempt?.eligible || attempt.experimental) return { status: 'ineligible' };
  try {
    const store = storage ?? globalThis.localStorage;
    const key = masteryStorageKey(playerId);
    // Read on submission so a newly mounted or stale view does not replace newer answers.
    const previous = readPracticeEvidence(store.getItem(key), { now });
    const ledger = recordMasteryAttempt(previous, attempt, { now });
    if (ledger !== previous) store.setItem(key, JSON.stringify(ledger));
    return { status: 'saved', ledger };
  } catch {
    return { status: 'unavailable' };
  }
}
