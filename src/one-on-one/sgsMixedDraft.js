import { createPositioningSession, restorePositioningSession, movePositioningPlayer, submitPositioningRead } from './positioningSequenceCore.js';
import { createComprehensionAttempt, restoreComprehensionAttempt, comprehensionReadContext, questionForRead, recordComprehensionAnswer } from './sgsComprehensionCore.js';

export const MIXED_DRAFT_VERSION = 'rinkreads-sgs-mixed-v1';
const POSITIONING_DRAFT_VERSION = 'rinkreads-positioning-workshop-v1';
const exactKeys = (value, keys) => !!value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).sort().join(',') === keys.split(',').sort().join(',');
export const mixedStorageKey = (playerId, candidateId) => `rinkreads_sgs_mixed_v1:${encodeURIComponent(playerId)}:${candidateId}`;
export const mixedSeedKey = playerId => `rinkreads_sgs_mixed_seed_v1:${encodeURIComponent(playerId)}`;
export const mixedArchiveKey = (playerId, attemptId) => `rinkreads_sgs_mixed_archive_v1:${encodeURIComponent(playerId)}:${encodeURIComponent(attemptId)}`;

export function archiveMixedDraft(storage, playerId, draft) {
  if (!restoreMixedDraft(draft, draft?.comprehension?.candidateId)) throw new Error('Download this attempt before replacing it; its saved record could not be validated.');
  const key = mixedArchiveKey(playerId, draft.comprehension.attemptId), text = JSON.stringify(draft);
  const existing = storage.getItem(key);
  if (existing !== null && existing !== text) throw new Error('A different saved record already uses this attempt ID. Download your current attempt before starting another mix.');
  if (existing === null) storage.setItem(key, text);
  if (storage.getItem(key) !== text) throw new Error('Your previous attempt could not be saved. Download it before starting another mix.');
  return key;
}

export function nextMixedSeed(raw, previousSeed = -1) {
  const stored = typeof raw === 'string' && /^(0|[1-9]\d*)$/.test(raw) ? Number(raw) : -1;
  const minimum = Number.isInteger(previousSeed) && previousSeed >= -1 ? previousSeed : -1;
  const seed = Math.max(Number.isSafeInteger(stored) ? stored : -1, minimum) + 1;
  if (seed > 0xffffffff) throw new RangeError('The local variety counter has reached its limit. Export this attempt before starting a new delivery history.');
  return seed;
}

export function createMixedDraft({ candidateId, seed, mode }) {
  return { version: MIXED_DRAFT_VERSION,
    positioning: { version: POSITIONING_DRAFT_VERSION, session: createPositioningSession(candidateId), reason: '', paused: false },
    comprehension: createComprehensionAttempt({ candidateId, seed, mode }) };
}

/** Verified local writes with best-effort rollback; localStorage has no transaction API. */
export function startMixedDraft(storage, playerId, { candidateId, mode, previousDraft = null }) {
  if (previousDraft !== null && !restoreMixedDraft(previousDraft, candidateId)) throw new Error('The current attempt could not be validated. Download it before replacing it.');
  const activeKey = mixedStorageKey(playerId, candidateId), seedKey = mixedSeedKey(playerId);
  const previousText = previousDraft === null ? null : JSON.stringify(previousDraft);
  let previousActive, counter;
  try { previousActive = storage.getItem(activeKey); counter = storage.getItem(seedKey); }
  catch { throw new Error('Browser saving is unavailable. The current screen has been kept.'); }
  if (previousActive !== null && previousActive !== previousText) throw new Error('Another version of this situation is already saved. Reload to continue that record before starting another mix.');
  // Validate the next delivery before creating any archive or replacing data.
  const seed = nextMixedSeed(counter, previousDraft?.comprehension.seed ?? -1);
  const draft = createMixedDraft({ candidateId, seed, mode }), text = JSON.stringify(draft);
  const archiveKey = previousDraft === null ? null : mixedArchiveKey(playerId, previousDraft.comprehension.attemptId);
  let createdArchive = false, stage = 'archive';
  try {
    if (previousDraft) {
      createdArchive = storage.getItem(archiveKey) === null;
      archiveMixedDraft(storage, playerId, previousDraft);
    }
    stage = 'active';
    storage.setItem(activeKey, text);
    if (storage.getItem(activeKey) !== text) throw new Error('Active draft readback did not match.');
  } catch {
    let activeRestored = false, archiveRestored = true;
    try {
      const after = storage.getItem(activeKey);
      // Restore only our own exact write. Never overwrite another tab's record.
      if (after === text) {
        if (previousActive === null) storage.removeItem(activeKey);
        else storage.setItem(activeKey, previousActive);
        activeRestored = storage.getItem(activeKey) === previousActive;
      } else activeRestored = after === previousActive;
    } catch { /* The notice below describes an incomplete rollback honestly. */ }
    if (createdArchive) {
      archiveRestored = false;
      if (activeRestored) try {
        const archived = storage.getItem(archiveKey);
        if (archived === previousText) {
          storage.removeItem(archiveKey);
          archiveRestored = storage.getItem(archiveKey) === null;
        } else archiveRestored = archived === null;
      } catch { /* Keep a recovery archive if its exact removal cannot be verified. */ }
    }
    if (!activeRestored || !archiveRestored) throw new Error(`The new mix could not be saved and browser records could not be fully restored. ${previousDraft ? 'Your current attempt is still open. Download it before leaving.' : 'Your current screen has been kept.'}`);
    throw new Error(stage === 'archive' ? 'Your previous attempt could not be archived. The current attempt has been kept.' : 'The new mix could not be saved. Your current screen and saved records are unchanged.');
  }
  // The active attempt now owns its seed, so counter failure cannot discard it.
  // A later restart uses that stored seed as its minimum even if this write fails.
  let counterSaved = false;
  try { storage.setItem(seedKey, String(seed)); counterSaved = storage.getItem(seedKey) === String(seed); } catch { /* Return the verified active attempt and a clear warning. */ }
  return { draft, counterSaved, warning: counterSaved ? '' : 'Your new mix is saved. Its variety counter could not update, but this attempt keeps its own seed.' };
}

export function restoreMixedDraft(raw, candidateId) {
  try {
    const saved = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!exactKeys(saved, 'version,positioning,comprehension') || saved.version !== MIXED_DRAFT_VERSION) return null;
    const position = saved.positioning;
    if (!exactKeys(position, 'version,session,reason,paused') || position.version !== POSITIONING_DRAFT_VERSION
        || typeof position.reason !== 'string' || position.reason.length > 600 || typeof position.paused !== 'boolean') return null;
    const session = restorePositioningSession(position.session);
    if (!session || session.templateId !== candidateId) return null;
    const comprehension = restoreComprehensionAttempt(saved.comprehension, { positioningSession: session });
    if (!comprehension) return null;
    const observations = comprehension.records.length, answers = session.answers.length;
    if (observations < answers || observations > answers + (session.phase === 'read' ? 1 : 0)) return null;
    if (session.phase === 'read' && (session.point || position.reason) && observations !== session.readIndex + 1) return null;
    return { version: MIXED_DRAFT_VERSION, positioning: { ...position, session, paused: session.phase === 'playback' || position.paused }, comprehension };
  } catch { return null; }
}

export function recordMixedObservation(draft, { response, inputMethod, reason = '' }) {
  const session = draft.positioning.session;
  if (session.phase !== 'read') throw new Error('Wait for the next frozen read.');
  const context = comprehensionReadContext(session, session.readIndex);
  const question = questionForRead({ attempt: draft.comprehension, readIndex: session.readIndex, ...context });
  const comprehension = recordComprehensionAnswer(draft.comprehension, { question, ...context, readIndex: session.readIndex, response, inputMethod, reason });
  return { ...draft, comprehension };
}

function requireObservation(draft) {
  const session = draft.positioning.session;
  if (session.phase !== 'read' || draft.comprehension.records.length !== session.readIndex + 1) throw new Error('Save your observation before choosing a position.');
}
export function moveMixedPlayer(draft, point) {
  requireObservation(draft);
  return { ...draft, positioning: { ...draft.positioning, session: movePositioningPlayer(draft.positioning.session, point) } };
}
export function submitMixedPosition(draft, reducedMotion = false) {
  requireObservation(draft);
  return { ...draft, positioning: { ...draft.positioning,
    session: submitPositioningRead(draft.positioning.session, draft.positioning.reason), reason: '',
    paused: draft.comprehension.mode === 'learning' || reducedMotion } };
}
