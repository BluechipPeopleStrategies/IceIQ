import { getReadSequenceStorageKey, serializeReadSequence, restoreReadSequence } from './readSequenceCore.js';
import { createReadSequenceRecall, checkReadSequenceRecallOrder } from './readSequenceRecall.js';

const VERSION = 'rinkreads-read-sequence-recall-attempt-v1';

export function getReadSequenceRecallStorageKey(playerId, scenarioId) {
  return `${getReadSequenceStorageKey(playerId, scenarioId)}:recall`;
}

function recallContext(session) {
  const serialized = serializeReadSequence(session);
  const restored = restoreReadSequence(serialized, session.scenarioId);
  if (!restored || serializeReadSequence(restored) !== serialized) {
    throw new TypeError('Recall needs a valid completed reflection.');
  }
  const reflection = JSON.parse(serialized);
  // Comparing a new opening cue does not change the play that was watched.
  delete reflection.changedCue;
  const recall = createReadSequenceRecall(session);
  return {
    recall,
    basis: {
      reflection,
      scenarioId: recall.scenarioId,
      pathId: recall.pathId,
      ageBand: recall.ageBand,
      cards: recall.cards.map(({ id, state, caption, description }) => ({ id, state, caption, description })),
    },
  };
}

function validatedAttempt(recall, order, reason, usedAnswer) {
  if (typeof reason !== 'string') throw new TypeError('The recall explanation must be text.');
  const trimmedReason = reason.trim();
  if (trimmedReason.length > 600) throw new RangeError('Use 600 characters or fewer for the recall explanation.');
  if (typeof usedAnswer !== 'boolean') throw new TypeError('Answer use must be true or false.');
  const { matchesPlay } = checkReadSequenceRecallOrder(recall, order);
  return { order: [...order], reason: trimmedReason, usedAnswer, matchesPlay };
}

export function serializeReadSequenceRecallAttempt(session, { order, reason = '', usedAnswer = false }) {
  const { recall, basis } = recallContext(session);
  const attempt = validatedAttempt(recall, order, reason, usedAnswer);
  return JSON.stringify({
    version: VERSION,
    basis,
    order: attempt.order,
    reason: attempt.reason,
    usedAnswer: attempt.usedAnswer,
  });
}

export function restoreReadSequenceRecallAttempt(raw, session) {
  try {
    const saved = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!saved || typeof saved !== 'object' || Array.isArray(saved) || saved.version !== VERSION) return null;
    const { recall, basis } = recallContext(session);
    if (JSON.stringify(saved.basis) !== JSON.stringify(basis)) return null;
    return validatedAttempt(recall, saved.order, saved.reason, saved.usedAnswer);
  } catch {
    return null;
  }
}
