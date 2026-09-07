import { canonicalStringify } from '../scenario-engine/canonicalHash.js';
import { NHL_200X85_PROFILE } from '../scenario-engine/rinkFrame.js';
import {
  POSITIONING_TEMPLATES, createPositioningSession, movePositioningPlayer,
  submitPositioningRead, advancePositioningPlayback, positioningState, restorePositioningSession,
} from './positioningSequenceCore.js';

// Factual observation sits beside the positioning lesson. It never moves an
// actor, chooses a hockey action or certifies an open-ended positioning answer.
export const COMPREHENSION_VERSION = 'rinkreads-sgs-comprehension-v1';
export const OBSERVATION_TOLERANCE_M = .5;
const FORMATS = [
  ['actor-tap', 'mc', 'tf'], ['actor-tap', 'tf', 'mc'],
  ['mc', 'actor-tap', 'tf'], ['mc', 'tf', 'actor-tap'],
  ['tf', 'actor-tap', 'mc'], ['tf', 'mc', 'actor-tap'],
];
const clone = value => structuredClone(value);
const same = (a, b) => canonicalStringify(a) === canonicalStringify(b);
const templates = new Map(POSITIONING_TEMPLATES.map(item => [item.id, item]));
const EVIDENCE = 'This checks a visible fact or change in the shown play, not the quality of a tactical position. It does not measure a shoulder check.';
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const actorAt = (state, id) => state.actors.find(actor => actor.id === id);
const labelOf = (state, id) => id === null ? 'No player' : actorAt(state, id)?.label || id;
const exactKeys = (value, keys) => !!value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).sort().join(',') === [...keys].sort().join(',');

function definition(candidateId) {
  const item = templates.get(candidateId);
  if (!item) throw new RangeError('Choose a registered SGS candidate.');
  return item;
}

export function createComprehensionAttempt({ candidateId, seed, mode = 'learning' }) {
  definition(candidateId);
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new TypeError('Use an unsigned 32-bit seed.');
  if (!['learning', 'challenge'].includes(mode)) throw new TypeError('Choose Learning or Challenge mode.');
  return { version: COMPREHENSION_VERSION, candidateId, seed, mode,
    attemptId: `${COMPREHENSION_VERSION}:${candidateId}:${mode}:${seed}`, records: [] };
}

function checkAttempt(attempt) {
  if (!exactKeys(attempt, ['version', 'candidateId', 'seed', 'mode', 'attemptId', 'records']) || !Array.isArray(attempt.records) || attempt.records.length > 3) throw new TypeError('Invalid comprehension attempt.');
  const opening = createComprehensionAttempt(attempt);
  if (!same({ ...attempt, records: [] }, opening)) throw new TypeError('The comprehension attempt identity changed.');
  return definition(attempt.candidateId);
}

function checkReadIndex(readIndex) {
  if (!Number.isInteger(readIndex) || readIndex < 0 || readIndex > 2) throw new RangeError('Choose read zero, one or two.');
}

function checkFrame(state, template) {
  const opening = template.initialState;
  if (!state || !Array.isArray(state.actors) || state.actors.length !== opening.actors.length
      || new Set(state.actors.map(actor => actor.id)).size !== opening.actors.length || !state.puck
      || ![state.puck.x, state.puck.y].every(Number.isFinite)
      || !(state.puck.owner === null || state.actors.some(actor => actor.id === state.puck.owner))) throw new TypeError('A complete canonical read freeze is required.');
  for (const actor of state.actors) {
    const original = actorAt(opening, actor.id);
    if (!original || actor.team !== original.team || actor.role !== original.role
        || ![actor.x, actor.y, actor.facing].every(Number.isFinite)) throw new TypeError('The read freeze actor identity or pose changed.');
  }
}

/** Exact visited read openings, before the learner places the focus player. */
export function comprehensionReadContext(positioningSession, readIndex) {
  checkReadIndex(readIndex);
  const saved = restorePositioningSession(positioningSession);
  if (!saved) throw new TypeError('A valid positioning session is required.');
  if (readIndex > saved.readIndex) throw new RangeError('That read has not been reached yet.');
  let replay = createPositioningSession(saved.templateId);
  let previousState = null;
  for (let index = 0; index < readIndex; index++) {
    previousState = positioningState(replay);
    const answer = saved.answers[index];
    if (!answer) throw new RangeError('That read is not available yet.');
    replay = submitPositioningRead(movePositioningPlayer(replay, answer.point), answer.reason);
    replay = advancePositioningPlayback(replay, 1);
  }
  return { state: positioningState(replay), previousState };
}

function shuffled(items, seed) {
  const result = clone(items);
  let value = (seed ^ 0x9e3779b9) >>> 0;
  for (let index = result.length - 1; index > 0; index--) {
    value ^= value << 13; value ^= value >>> 17; value ^= value << 5;
    const other = (value >>> 0) % (index + 1);
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

function relation(delta) {
  return delta < -OBSERVATION_TOLERANCE_M ? 'closer' : delta > OBSERVATION_TOLERANCE_M ? 'farther' : 'similar';
}
const relationLabels = { closer: 'Closer', farther: 'Farther away', similar: 'About the same distance' };
function distanceWording(value, target) {
  return value === 'closer' ? `closer to ${target} than in the previous freeze`
    : value === 'farther' ? `farther from ${target} than in the previous freeze`
    : `about the same distance from ${target} as in the previous freeze`;
}

function factsFor(template, state, previousState) {
  const owner = state.puck.owner, focus = template.focusActorId;
  const goalie = state.actors.find(actor => actor.role === 'goalie')?.id;
  const facts = [
    { id: 'current-carrier', type: 'actor', answer: owner, prompt: 'Who has the puck in this freeze?',
      explain: owner ? `${labelOf(state, owner)} has the puck in this freeze.` : 'The puck is loose. No player has it.' },
    { id: 'focus-player', type: 'actor', answer: focus, prompt: 'Which player will you position in this read?',
      explain: `${labelOf(state, focus)} ${labelOf(state, focus) === 'YOU' ? 'are' : 'is'} the player you control. The other players stay frozen while you choose a position.` },
    { id: 'goalkeeper', type: 'actor', answer: goalie, prompt: 'Which player is defending the net as the goalie?',
      explain: `${labelOf(state, goalie)} is the goalie. Their role is shown by the goalie equipment near the net.` },
  ];
  if (!previousState) return facts;
  const previousOwner = previousState.puck.owner;
  if (owner && previousOwner && owner !== previousOwner) facts.push({
    id: 'received-puck', type: 'actor', answer: owner,
    prompt: 'Who received the puck during the part you just watched?',
    explain: `The puck moved from ${labelOf(previousState, previousOwner)} to ${labelOf(state, owner)}. ${labelOf(state, owner)} has it now.`,
  });
  if (owner && owner === previousOwner && distance(actorAt(state, owner), actorAt(previousState, owner)) > OBSERVATION_TOLERANCE_M) facts.push({
    id: 'carried-puck', type: 'actor', answer: owner,
    prompt: 'Who moved with the puck during the part you just watched?',
    explain: `${labelOf(state, owner)} moved with the puck and still has possession.`,
  });
  if (owner && previousOwner) {
    const [x, y] = NHL_200X85_PROFILE.landmarks.goalLineRight;
    const goal = { x, y };
    const netChange = distance(actorAt(state, owner), goal) - distance(actorAt(previousState, previousOwner), goal);
    const gapChange = distance(actorAt(state, focus), actorAt(state, owner)) - distance(actorAt(previousState, focus), actorAt(previousState, previousOwner));
    facts.push({ id: 'carrier-net-distance', type: 'relation', answer: relation(netChange),
      prompt: 'Compared with the previous freeze, is the player with the puck closer to the attacking net, farther away or about the same distance?',
      statement: 'The player with the puck is', subject: 'distance to the attacking net',
      explain: `The player with the puck is ${distanceWording(relation(netChange), 'the attacking net')}.` });
    facts.push({ id: 'focus-carrier-distance', type: 'relation', answer: relation(gapChange),
      prompt: 'Compared with the previous freeze, are YOU closer to the player with the puck, farther away or about the same distance?',
      statement: 'YOU are', subject: 'distance to the player with the puck',
      explain: `YOU are ${distanceWording(relation(gapChange), 'the player with the puck')}. This describes the gap; it does not decide whether the position is good.` });
  }
  return facts;
}

function deriveQuestion({ attempt, readIndex, state, previousState = null }) {
  const template = checkAttempt(attempt);
  checkReadIndex(readIndex);
  checkFrame(state, template);
  if (readIndex === 0) {
    if (previousState !== null || !same(state, template.initialState)) throw new TypeError('The first question must use the actual opening freeze.');
  } else {
    if (!previousState) throw new TypeError('A later read needs its previous visited freeze.');
    checkFrame(previousState, template);
  }
  const format = FORMATS[attempt.seed % FORMATS.length][readIndex];
  const eligible = factsFor(template, state, previousState).filter(fact => format !== 'actor-tap' || (fact.type === 'actor' && fact.answer !== null));
  // Later reads test the newly visible event/relationship. Format rotation must
  // not turn the first six deliveries into six versions of the same trivia.
  const changed = eligible.filter(fact => ['received-puck', 'carried-puck', 'carrier-net-distance', 'focus-carrier-distance'].includes(fact.id));
  const facts = readIndex > 0 && changed.length ? changed : eligible;
  const ordinal = Math.floor(attempt.seed / FORMATS.length);
  const fact = facts[(attempt.seed + ordinal + readIndex) % facts.length];
  const roster = state.actors.map(actor => ({ id: actor.id, label: labelOf(state, actor.id) }));
  let prompt = fact.prompt, expectedResponse = fact.answer;
  let options = fact.type === 'actor' ? roster : Object.entries(relationLabels).map(([id, label]) => ({ id, label }));
  if (fact.answer === null) options.push({ id: 'no-player', label: 'No player' });
  if (fact.answer === null) expectedResponse = 'no-player';
  if (format === 'tf') {
    // Use the next quotient, not the variant index's parity: an even-sized
    // fact list otherwise makes each fact permanently True or permanently False.
    const positive = (Math.floor(ordinal / facts.length) + readIndex) % 2 === 0;
    if (fact.type === 'actor') {
      const wrong = roster.filter(actor => actor.id !== fact.answer);
      const actorId = positive ? fact.answer : wrong[(ordinal + readIndex) % wrong.length].id;
      const subject = labelOf(state, actorId);
      const verb = actorId === template.focusActorId ? 'are' : 'is';
      prompt = fact.id === 'current-carrier' ? `${subject} ${actorId === template.focusActorId ? 'have' : 'has'} the puck in this freeze.`
        : fact.id === 'focus-player' ? `${subject} ${verb} the player you will position in this read.`
        : fact.id === 'goalkeeper' ? `${subject} ${verb} the goalie.`
        : fact.id === 'received-puck' ? `${subject} received the puck during the part you just watched.`
        : `${subject} moved with the puck during the part you just watched.`;
      expectedResponse = actorId === fact.answer;
    } else {
      const alternatives = Object.keys(relationLabels).filter(id => id !== fact.answer);
      const proposed = positive ? fact.answer : alternatives[(ordinal + readIndex) % alternatives.length];
      prompt = fact.id === 'carrier-net-distance'
        ? `The player with the puck is ${distanceWording(proposed, 'the attacking net')}.`
        : `YOU are ${distanceWording(proposed, 'the player with the puck')}.`;
      expectedResponse = proposed === fact.answer;
    }
    options = [{ id: 'true', label: 'True', value: true }, { id: 'false', label: 'False', value: false }];
  } else options = shuffled(options, (attempt.seed + readIndex * 65537) >>> 0);
  const sourceRefs = [
    { note: 'docs/library/scanning.md', use: 'Look at the actual scene and notice what changed; no head movement or scanning skill is scored.' },
    { note: template.teamSize === 1 ? 'docs/library/gap-control.md' : 'docs/library/off-puck-support-offense.md',
      use: 'Coaching context for the following position-and-explain read, not authority for grading a coordinate.' },
  ];
  const freezeKey = canonicalStringify({ candidateId: attempt.candidateId, readIndex, state, previousState });
  return {
    question: { id: `${attempt.candidateId}:observation-v1:${readIndex}:${format}:${fact.id}:${attempt.seed}`,
      version: 'sgs-observation-question-v1', readIndex, format, variantId: fact.id, prompt, options,
      instruction: format === 'actor-tap' ? 'Tap that player or choose their label.' : format === 'tf' ? 'Choose True or False from what you can see.' : 'Choose the observation that matches the ice.',
      sourceRefs, freezeKey, evidenceBoundary: EVIDENCE,
      observationTolerance: { value: OBSERVATION_TOLERANCE_M, unit: 'metres', purpose: 'Visible distance-change grouping only; not a hockey or tactical threshold.' } },
    expectedResponse, feedback: fact.explain,
  };
}

export function questionForRead(input) { return deriveQuestion(input).question; }

export function recordComprehensionAnswer(attempt, { question, state, previousState = null, readIndex, response, inputMethod, reason = '' }) {
  checkAttempt(attempt);
  if (readIndex !== attempt.records.length) throw new RangeError('Answer each read once, in order.');
  const derived = deriveQuestion({ attempt, state, previousState, readIndex });
  if (!same(question, derived.question)) throw new TypeError('The question does not match this read freeze.');
  if (!['rink-tap', 'button', 'keyboard'].includes(inputMethod) || (inputMethod === 'rink-tap' && question.format !== 'actor-tap')) throw new TypeError('The input method does not match this question.');
  if (question.format === 'tf') {
    if (typeof response !== 'boolean') throw new TypeError('A true/false response must be a boolean.');
  } else if (typeof response !== 'string' || !question.options.some(option => option.id === response)) throw new TypeError('Choose a response from the question options.');
  if (typeof reason !== 'string' || reason.trim().length > 600) throw new TypeError('Use a text reason of 600 characters or fewer.');
  return { ...clone(attempt), records: [...clone(attempt.records), {
    readIndex, question: clone(derived.question), beforeState: clone(state), previousState: clone(previousState),
    response, inputMethod, reason: reason.trim(),
  }] };
}

export function restoreComprehensionAttempt(raw, { positioningSession } = {}) {
  try {
    const saved = typeof raw === 'string' ? JSON.parse(raw) : raw;
    checkAttempt(saved);
    const positioning = restorePositioningSession(positioningSession);
    if (!positioning || saved.candidateId !== positioning.templateId) return null;
    let restored = createComprehensionAttempt(saved);
    for (const record of saved.records) {
      const context = comprehensionReadContext(positioning, record.readIndex);
      if (!same(record.beforeState, context.state) || !same(record.previousState, context.previousState)) return null;
      restored = recordComprehensionAnswer(restored, { ...context, question: record.question, readIndex: record.readIndex,
        response: record.response, inputMethod: record.inputMethod, reason: record.reason });
    }
    return same(saved, restored) ? restored : null;
  } catch { return null; }
}

/** Only this presentation accessor releases factual results; Challenge waits. */
export function comprehensionFeedback(attempt, { positioningSession } = {}) {
  const restored = restoreComprehensionAttempt(attempt, { positioningSession });
  if (!restored) throw new TypeError('Feedback needs an attempt bound to the actual positioning play.');
  if (restored.mode === 'challenge' && (positioningSession.phase !== 'complete' || restored.records.length !== 3)) return { available: false, results: [] };
  const visibleRecords = restored.records.filter(record => record.readIndex < positioningSession.answers.length);
  if (!visibleRecords.length) return { available: false, results: [] };
  return { available: true, results: visibleRecords.map(record => {
    const derived = deriveQuestion({ attempt: restored, state: record.beforeState, previousState: record.previousState, readIndex: record.readIndex });
    return { readIndex: record.readIndex, questionId: record.question.id, matchesFact: record.response === derived.expectedResponse,
      feedback: derived.feedback, response: record.response, expectedResponse: derived.expectedResponse,
      evidenceBoundary: EVIDENCE };
  }) };
}
