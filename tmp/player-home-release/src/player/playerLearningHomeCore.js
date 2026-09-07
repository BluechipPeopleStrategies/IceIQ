import { getLearningWorlds } from '../one-on-one/learningWorldsCore.js';
import { levelToBand } from '../path/pathData.js';
import { DEFAULT_MASTERY_POLICY, masteryStorageKey, masterySummary } from '../one-on-one/spacedMasteryCore.js';
import { readPracticeEvidence } from '../one-on-one/practiceMasteryStorage.js';
import { buildLibrary, libraryMasteryDescriptor } from '../one-on-one/lessonCore.js';

export const HOME_ACTIONS = [
  { id: 'learn', title: 'Learn the game', description: 'Guided starters, a lesson library and the spaces on the rink.', icon: 'book' },
  { id: 'practice', title: 'Practise a read', description: 'Choose the next play or move a player into useful space.', icon: 'position' },
  { id: 'experimental', title: 'Experimental scenarios', description: 'Try new situations and compare suggested answers.', icon: 'experiment', label: 'Experimental' },
  { id: 'goals', title: 'Set a hockey goal', description: 'Choose something to work on and keep your plan close.', icon: 'goal' },
  { id: 'training', title: 'Log your training', description: 'Keep track of practices, games and extra work.', icon: 'calendar' },
  { id: 'progress', title: 'See your progress', description: 'Look back at your recorded reads and practice.', icon: 'progress' },
];

export function summarizeHomePractice({ playerId, ageBand, bank, rawLedger }) {
  if (!bank || typeof bank !== 'object' || Array.isArray(bank)) throw new TypeError('A loaded question catalog is required.');
  const catalog = buildLibrary(bank, [])
    .filter(item => levelToBand(item.age) === ageBand)
    .map(libraryMasteryDescriptor)
    .filter(question => question.eligible);
  return { playerId, ageBand, status: 'ready', summary: masterySummary(readPracticeEvidence(rawLedger), catalog) };
}

// Only the active player's new ledger is read. Historical quiz, journey and
// lesson records are neither migrated nor treated as dated practice evidence.
export async function loadHomePractice({ playerId, ageBand, loadBank, readStorage }) {
  try {
    const bank = await loadBank();
    return summarizeHomePractice({ playerId, ageBand, bank, rawLedger: readStorage(masteryStorageKey(playerId)) });
  } catch {
    return { playerId, ageBand, status: 'unavailable' };
  }
}

export function buildPlayerHomeModel({ player = {}, ageBand, masteryState, trainingSessionCount } = {}) {
  const curriculum = getLearningWorlds(ageBand || player.level);
  const playerId = String(player.id || '__demo__');
  const scoped = masteryState?.playerId === playerId && masteryState.ageBand === curriculum.band;
  const status = masteryState ? (scoped ? masteryState.status : 'loading') : 'unavailable';
  const groups = status === 'ready' ? (masteryState.summary?.groups || []).filter(group => group.ageBand === curriculum.band && group.eligibleAvailable > 0) : [];
  return {
    ...curriculum,
    playerId,
    historySessions: Array.isArray(player.quizHistory) ? player.quizHistory.length : 0,
    trainingSessionCount: Number.isInteger(trainingSessionCount) && trainingSessionCount >= 0 ? trainingSessionCount : null,
    practice: {
      status,
      availableGroups: groups.length,
      groupsPractised: groups.filter(group => group.distinctQuestions > 0).length,
      requirementsMet: groups.filter(group => group.mastered === true).length,
      policy: DEFAULT_MASTERY_POLICY,
    },
  };
}
