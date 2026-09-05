import { createDraft, putKey, sampleDraft, validateDraft } from './director.js';

export const COACH_QUESTION_VERSION = 'rinkreads-coach-question-v1';
export const COACH_ACTIONS = ['shoot', 'pass', 'carry'];
export const COACH_AGES = ['U7', 'U9', 'U11', 'U13', 'U15', 'U18'];
const clone = value => structuredClone(value);
const hasText = value => typeof value === 'string' && value.trim().length > 0;

function assertDirector(draft) {
  const result = validateDraft(draft);
  if (!result.ok) throw new TypeError(result.errs.join('; '));
}

export function snapshotCoachDraft(draft) {
  assertDirector(draft);
  const frame = sampleDraft(draft, 0);
  return {
    version: draft.version, title: draft.title, duration: 8,
    actors: frame.actors.map(actor => ({ id: actor.id, label: actor.label, team: actor.team, role: actor.role, frozen: false, fixedPose: null, keys: [{ time: 0, x: actor.x, y: actor.y, facing: actor.facing }] })),
    puck: { owner: draft.puck.owner }, sourceRef: draft.sourceRef ? clone(draft.sourceRef) : null,
    status: 'development-not-validated',
  };
}

export function createCoachQuestion(draft = createDraft(2, 2), options = {}) {
  const initial = snapshotCoachDraft(draft);
  return {
    version: COACH_QUESTION_VERSION, id: options.id ?? `coach-question-${Date.now()}`, revision: 0,
    title: 'Build a better read', ageBand: options.ageBand ?? 'U11',
    prompt: 'Where would you put your players to help your team?', type: 'position', controlledTeam: 'home',
    initialDraft: initial, referenceDraft: clone(initial), coachExplanation: '', expectedAction: null,
    sourceRef: { note: typeof draft.sourceRef?.note === 'string' ? draft.sourceRef.note : 'Local coach-authored practice question', ...(typeof draft.sourceRef?.id === 'string' ? { sourceId: draft.sourceRef.id } : {}) },
    status: 'coach-authored', answerStatus: 'draft', certification: 'not-certified', view: 'full',
  };
}

export function validateCoachQuestion(question, { requireReady = true } = {}) {
  const errors = [];
  if (!question || typeof question !== 'object' || Array.isArray(question)) return ['question must be an object'];
  if (question.version !== COACH_QUESTION_VERSION) errors.push('unsupported question version');
  if (!hasText(question.id) || !hasText(question.title)) errors.push('question ID and title are required');
  if (!COACH_AGES.includes(question.ageBand)) errors.push('unknown age band');
  if (question.view != null && !['full', 'half-right', 'cross-ice'].includes(question.view)) errors.push('unknown rink view');
  if (!['position', 'action'].includes(question.type)) errors.push('unknown question type');
  if (!['home', 'away'].includes(question.controlledTeam)) errors.push('unknown controlled team');
  if (!['example-for-coach-review', 'coach-authored'].includes(question.status)) errors.push('unknown question status');
  if (question.answerStatus != null && !['draft', 'authored-reference'].includes(question.answerStatus)) errors.push('unknown answer status');
  if (question.certification != null && question.certification !== 'not-certified') errors.push('coach references cannot claim certification');
  if (typeof question.prompt !== 'string' || typeof question.coachExplanation !== 'string') errors.push('prompt and explanation must be text');
  if (requireReady && !hasText(question.prompt)) errors.push('write a question before saving the reference');
  if (requireReady && !hasText(question.coachExplanation)) errors.push('write the coach explanation before saving the reference');
  if (question.expectedAction !== null && !COACH_ACTIONS.includes(question.expectedAction)) errors.push('unknown expected action');
  if (requireReady && question.type === 'action' && !COACH_ACTIONS.includes(question.expectedAction) && !question.rubric?.acceptableActions?.length) errors.push('choose the coach reference action');
  if (question.rubric != null) {
    const rubric = question.rubric;
    if (!rubric || !['forced', 'open'].includes(rubric.mode)) errors.push('rubric mode must be forced or open');
    for (const key of ['mustNotice', 'avoid']) if (!Array.isArray(rubric?.[key]) || !rubric[key].every(hasText)) errors.push(`rubric ${key} must be a list of cues`);
    if (!Array.isArray(rubric?.acceptableActions) || !rubric.acceptableActions.every(action => COACH_ACTIONS.includes(action))) errors.push('unknown rubric action');
    if (typeof rubric?.followUpCue !== 'string') errors.push('rubric followUpCue must be text');
  }
  if (!question.sourceRef || typeof question.sourceRef !== 'object' || !hasText(question.sourceRef.note)) errors.push('source note is required');
  else {
    for (const key of ['url', 'sourceId']) if (question.sourceRef[key] != null && typeof question.sourceRef[key] !== 'string') errors.push(`source ${key} must be text`);
    if (typeof question.sourceRef.url === 'string' && question.sourceRef.url) {
      try { if (!['http:', 'https:'].includes(new URL(question.sourceRef.url).protocol)) errors.push('source URL must use http or https'); }
      catch { errors.push('source URL must be a valid http or https URL'); }
    }
  }
  const valid = {};
  for (const field of ['initialDraft', 'referenceDraft']) {
    const result = validateDraft(question[field]);
    valid[field] = result.ok;
    errors.push(...result.errs.map(message => `${field}: ${message}`));
    if (result.ok && question[field].duration !== 8) errors.push(`${field}: snapshot duration must be 8`);
    if (result.ok && question[field].actors.some(actor => actor.keys.length !== 1 || actor.keys[0].time !== 0 || actor.frozen)) errors.push(`${field}: use static, unfrozen time-zero snapshots`);
    if (result.ok && question.view === 'half-right' && question[field].actors.some(actor => actor.keys[0].x < 0)) errors.push(`${field}: half-right view hides an actor`);
  }
  if (valid.initialDraft && valid.referenceDraft) {
    const initial = question.initialDraft.actors;
    const reference = question.referenceDraft.actors;
    if (initial.length !== reference.length) errors.push('reference actor identity must match the starting layout');
    for (const actor of initial) {
      const other = reference.find(item => item.id === actor.id);
      if (!other || actor.team !== other.team || actor.role !== other.role) errors.push('reference actor identity must match the starting layout');
      else if (actor.team !== question.controlledTeam && ['x', 'y', 'facing'].some(key => actor.keys[0][key] !== other.keys[0][key])) errors.push('uncontrolled team must keep the same reference context');
    }
    if (question.initialDraft.puck.owner !== question.referenceDraft.puck.owner) errors.push('puck ownership must match across the two snapshots');
  }
  return errors;
}

function assertQuestion(question, options) {
  const errors = validateCoachQuestion(question, options);
  if (errors.length) throw new TypeError(errors.join('; '));
}

export function reviseCoachQuestion(question, patch = {}) {
  return { ...clone(question), ...clone(patch), status: 'coach-authored', answerStatus: 'draft', certification: 'not-certified', revision: (question.revision ?? 0) + 1 };
}

export function editQuestionActor(question, field, actorId, point) {
  if (!['initialDraft', 'referenceDraft'].includes(field)) throw new RangeError('unknown snapshot');
  const actor = question[field].actors.find(item => item.id === actorId);
  if (!actor) throw new RangeError('unknown actor');
  if (field === 'referenceDraft' && actor.team !== question.controlledTeam) throw new RangeError('the reference moves only the controlled team');
  const pose = { ...actor.keys[0], ...point };
  const next = reviseCoachQuestion(question, { [field]: putKey(question[field], actorId, 0, pose) });
  // Other-team positions are shared context, rather than part of the learner's answer.
  if (field === 'initialDraft' && actor.team !== question.controlledTeam) next.referenceDraft = putKey(next.referenceDraft, actorId, 0, pose);
  assertQuestion(next, { requireReady: false });
  return next;
}

export function saveCoachReference(question) {
  const next = clone(question);
  if (next.rubric && typeof next.rubric === 'object') {
    for (const key of ['mustNotice', 'avoid']) if (Array.isArray(next.rubric[key])) next.rubric[key] = next.rubric[key].map(value => typeof value === 'string' ? value.trim() : value).filter(value => value !== '');
    if (typeof next.rubric.followUpCue === 'string') next.rubric.followUpCue = next.rubric.followUpCue.trim();
  }
  assertQuestion(next);
  return { ...next, status: 'coach-authored', answerStatus: 'authored-reference', certification: 'not-certified' };
}

export function coachReferenceReady(question) {
  return validateCoachQuestion(question).length === 0 && (question.status === 'example-for-coach-review' || question.answerStatus === 'authored-reference');
}

export function createLearnerAttempt(question) {
  if (!coachReferenceReady(question)) throw new TypeError('Save the coach reference and explanation first.');
  return { version: 'rinkreads-coach-attempt-v1', questionId: question.id, referenceRevision: question.revision ?? 0, draft: clone(question.initialDraft), action: null, reason: '', submitted: false };
}

function assertAttempt(question, attempt) {
  if (attempt?.version !== 'rinkreads-coach-attempt-v1' || attempt.questionId !== question.id || attempt.referenceRevision !== (question.revision ?? 0)) throw new TypeError('attempt belongs to a different question or reference revision');
  assertDirector(attempt.draft);
  if (typeof attempt.reason !== 'string' || (attempt.action !== null && !COACH_ACTIONS.includes(attempt.action))) throw new TypeError('invalid learner reason or action');
  if (attempt.draft.actors.length !== question.initialDraft.actors.length) throw new TypeError('attempt actor identity changed');
  for (const original of question.initialDraft.actors) {
    const actor = attempt.draft.actors.find(item => item.id === original.id);
    if (!actor || actor.team !== original.team || actor.role !== original.role) throw new TypeError('attempt actor identity changed');
    if (actor.team !== question.controlledTeam && JSON.stringify(actor.keys) !== JSON.stringify(original.keys)) throw new TypeError('attempt moved an uncontrolled team actor');
  }
}

export function moveLearnerActor(question, attempt, actorId, point) {
  assertAttempt(question, attempt);
  if (attempt.submitted) throw new TypeError('reset the attempt before editing');
  const actor = attempt.draft.actors.find(item => item.id === actorId);
  if (actor?.team !== question.controlledTeam) throw new RangeError('move only the controlled team');
  return { ...clone(attempt), draft: putKey(attempt.draft, actorId, 0, { ...actor.keys[0], ...point }) };
}

export function submitLearnerAttempt(question, attempt) {
  assertAttempt(question, attempt);
  if (!hasText(attempt.reason)) throw new TypeError('Add a short reason for your choice.');
  if (question.type === 'action' && !COACH_ACTIONS.includes(attempt.action)) throw new TypeError('Choose Shoot, Pass or Carry.');
  return { ...clone(attempt), submitted: true };
}

export function compareCoachAttempt(question, attempt) {
  assertQuestion(question);
  assertAttempt(question, attempt);
  if (!attempt.submitted) throw new TypeError('Submit your reasoning before comparing.');
  const learner = sampleDraft(attempt.draft, 0);
  const reference = sampleDraft(question.referenceDraft, 0);
  return {
    positions: learner.actors.filter(actor => actor.team === question.controlledTeam).map(actor => {
      const other = reference.actors.find(item => item.id === actor.id);
      const dx = actor.x - other.x, dy = actor.y - other.y;
      const facingDifference = Math.atan2(Math.sin(actor.facing - other.facing), Math.cos(actor.facing - other.facing)) * 180 / Math.PI;
      return { id: actor.id, label: actor.label, learner: { x: actor.x, y: actor.y }, reference: { x: other.x, y: other.y }, facingDifference, dx, dy, distance: Math.hypot(dx, dy) };
    }),
    learnerAction: attempt.action, referenceAction: question.expectedAction,
    learnerReason: attempt.reason, coachExplanation: question.coachExplanation,
    note: 'These are differences from an authored reference, not correctness grades. Discuss the reason and the visible hockey situation.',
  };
}

export function readSavedCoachQuestions(raw) {
  try { const values = JSON.parse(raw); return Array.isArray(values) ? values.filter(value => validateCoachQuestion(value).length === 0) : []; }
  catch { return []; }
}

export function clampCoachPoint(x, y) {
  const radius = 8.5344, margin = .65;
  let px = Math.max(-30.48 + margin, Math.min(30.48 - margin, x));
  let py = Math.max(-12.954 + margin, Math.min(12.954 - margin, y));
  const cx = Math.abs(px) > 30.48 - radius ? Math.sign(px) * (30.48 - radius) : null;
  const cy = Math.abs(py) > 12.954 - radius ? Math.sign(py) * (12.954 - radius) : null;
  if (cx !== null && cy !== null) { const dx = px - cx, dy = py - cy, length = Math.hypot(dx, dy); if (length > radius - margin) { px = cx + dx * (radius - margin) / length; py = cy + dy * (radius - margin) / length; } }
  return { x: px, y: py };
}
