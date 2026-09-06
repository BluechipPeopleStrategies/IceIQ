import ledger from '../data/curriculum-ledger.json';
import pack from './curriculum-draft.json';
import { bandsAvailable, getPath, levelToBand } from '../path/pathData.js';
import { missionFor, worldFor } from '../path/journeyPresentation.js';

export const LEARNING_ACTIVITIES = [
  { id: 'guided', title: 'Guided lessons', description: 'Start with a short scenario and feedback on your choice.', target: { tab: 'learn', learn: 'guided' }, icon: 'book' },
  { id: 'library', title: 'Lesson library', description: 'Browse questions, scenarios and animated plays by concept.', target: { tab: 'learn', learn: 'library' }, icon: 'library' },
  { id: 'discover', title: 'Explore the rink', description: 'Get to know the ice, its markings and useful spaces.', target: { tab: 'learn', learn: 'discover' }, icon: 'rink' },
  { id: 'choose', title: 'Choose the play', description: 'Watch a situation change, then make your next decision.', target: { tab: 'practice', practice: 'choose' }, icon: 'play' },
  { id: 'position', title: 'Find your position', description: 'Place a player and compare the space around them.', target: { tab: 'practice', practice: 'position' }, icon: 'position' },
  { id: 'play', title: 'Play', description: 'Try moves and decisions in the practice arena.', target: { tab: 'play' }, icon: 'stick' },
  { id: 'brain', title: 'Brain Gym', description: 'Try the existing awareness and decision games.', target: { tab: 'brain' }, icon: 'scan' },
];

export function allowsRinkDiscovery(ageBand) {
  return ['U7', 'U9'].includes(levelToBand(ageBand));
}

export function learningActivitiesForAge(ageBand) {
  return LEARNING_ACTIVITIES.filter(activity => allowsRinkDiscovery(ageBand) || activity.id !== 'discover');
}

// The path owns age scope; the ledger owns domain identity. Catalog matches
// mirror the existing library's concept filter, without fuzzy inference.
export function getLearningWorlds(ageBand, { library = [] } = {}) {
  const requested = levelToBand(ageBand);
  const band = bandsAvailable().includes(requested) ? requested : 'U11';
  const path = getPath(band);
  const activeGuides = pack.lessons.filter(lesson => lesson.ageBand === band && lesson.questions.some(question => question.type === 'mc'))
    .map(lesson => ({ id: lesson.id, title: lesson.title, ageBand: lesson.ageBand, conceptId: lesson.conceptId, questionCount: lesson.questions.filter(question => question.type === 'mc').length }));
  const ageLibrary = library.filter(item => levelToBand(item.age) === band);
  const worlds = ledger.domains.map(domain => {
    const nodes = path.units.find(unit => unit.id === domain.id)?.nodes || [];
    const conceptIds = new Set(ledger.concepts.filter(concept => concept.domainId === domain.id).map(concept => concept.id));
    const missions = nodes.map(node => ({
      ...node, ...missionFor(node),
      guidedLessons: activeGuides.filter(lesson => lesson.conceptId === node.conceptId),
      libraryCount: ageLibrary.filter(item => item.concept === node.conceptId).length,
    }));
    return {
      id: domain.id, domainName: domain.name, ...worldFor(domain), missions,
      // Some authored young-player foundations precede their formal path node.
      // Keep them available without adding a node or backdating a mission.
      foundations: activeGuides.filter(lesson => conceptIds.has(lesson.conceptId) && !nodes.some(node => node.conceptId === lesson.conceptId)),
    };
  });
  return { band, worlds, missionCount: path.nodes.length, guidedCount: activeGuides.length };
}

export function missionAvailability(mission, libraryStatus) {
  if (mission.guidedLessons.length) return 'guided';
  if (mission.libraryCount) return 'library';
  if (libraryStatus === 'loading') return 'loading';
  if (libraryStatus === 'error') return 'unknown';
  return 'study';
}
