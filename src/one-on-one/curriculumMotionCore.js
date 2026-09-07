const REGISTERED = new Map([
  ['practice-draft-u13-refresh-picture-mc', 'D1 moved here'],
  ['practice-draft-u13-refresh-picture-tf', 'D1 moved here'],
  ['practice-draft-u18-support-change-mc', 'D1 moved onto the lane'],
  ['practice-draft-u18-support-change-tf', 'D1 moved onto the lane'],
]);
const bounded = value => Math.max(0, Math.min(1, value));
const copy = value => structuredClone(value);
const pointValid = point => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite)
  && point[0] >= 0 && point[0] <= 30.48 && Math.abs(point[1]) <= 12.954;

export function getCurriculumOpeningMotion(question) {
  const label = REGISTERED.get(question?.id);
  if (!label || !question.visual || !Array.isArray(question.visual.actors)) return null;
  const arrows = question.visual.arrows || [];
  const candidates = arrows.map((arrow, index) => ({ arrow, index })).filter(({ arrow }) => arrow.label === label);
  const actors = question.visual.actors.filter(actor => actor.id === 'D1');
  if (candidates.length !== 1 || actors.length !== 1) return null;
  const { arrow, index } = candidates[0], actor = actors[0];
  if (!pointValid(arrow.from) || !pointValid(arrow.to) || actor.hasPuck || !Number.isFinite(actor.facing)
    || arrow.to[0] !== actor.x || arrow.to[1] !== actor.y || Math.hypot(arrow.to[0] - arrow.from[0], arrow.to[1] - arrow.from[1]) < .1) return null;
  const carrier = question.visual.actors.find(item => item.hasPuck);
  // The curriculum renderer uses this same fixed attachment offset. The puck
  // does not move; this only gives the introductory pose a continuous facing.
  const initialFacing = carrier ? Math.atan2(carrier.y + .58 - arrow.from[1], carrier.x + 1 - arrow.from[0]) : actor.facing;
  return { actorId: actor.id, from: [...arrow.from], to: [...arrow.to], initialFacing, finalFacing: actor.facing,
    arrowIndex: index, durationMs: 1800, sourceRef: `src/one-on-one/curriculum-draft.json#${question.id}.visual.arrows[${index}]`,
    evidence: 'Explicit drawn actor movement; timing and initial facing are presentation interpolation.' };
}

export function sampleCurriculumOpening(question, rawProgress) {
  if (!Number.isFinite(rawProgress)) throw new TypeError('Opening progress must be finite.');
  const visual = copy(question.visual), motion = getCurriculumOpeningMotion(question);
  if (!motion) return visual;
  const progress = bounded(rawProgress);
  visual.arrows = visual.arrows.filter((_, index) => index !== motion.arrowIndex);
  if (progress === 1) return visual;
  const actor = visual.actors.find(item => item.id === motion.actorId);
  const eased = progress * progress * (3 - 2 * progress);
  actor.x = motion.from[0] + (motion.to[0] - motion.from[0]) * eased;
  actor.y = motion.from[1] + (motion.to[1] - motion.from[1]) * eased;
  const turn = Math.atan2(Math.sin(motion.finalFacing - motion.initialFacing), Math.cos(motion.finalFacing - motion.initialFacing));
  actor.facing = motion.initialFacing + turn * eased;
  visual.caption = 'Watch D1 move. The play will pause before you answer.';
  return visual;
}

export function createCurriculumMotion(question, { reducedMotion = false } = {}) {
  const motion = getCurriculumOpeningMotion(question);
  return { questionId: question.id, supported: Boolean(motion), actorId: motion?.actorId || null,
    phase: motion ? reducedMotion ? 'ready' : 'playing' : 'complete', progress: motion ? 0 : 1,
    durationMs: motion?.durationMs || 0 };
}

export function advanceCurriculumMotion(state, progress) {
  if (state.phase !== 'playing') throw new Error('Play the opening before advancing it.');
  if (!Number.isFinite(progress)) throw new TypeError('Opening progress must be finite.');
  const next = Math.max(state.progress, bounded(progress));
  return { ...state, progress: next, phase: next === 1 ? 'complete' : 'playing' };
}

export function pauseCurriculumMotion(state) {
  return state.phase === 'playing' ? { ...state, phase: 'paused' } : { ...state };
}

export function playCurriculumMotion(state, { replay = false, reducedMotion = false } = {}) {
  if (!state.supported) return { ...state };
  if (reducedMotion) return { ...state, progress: 1, phase: 'complete' };
  return { ...state, progress: replay || state.phase === 'complete' ? 0 : state.progress, phase: 'playing' };
}

export function curriculumMotionCanAnswer(state) {
  return state.phase === 'complete' && state.progress === 1;
}
