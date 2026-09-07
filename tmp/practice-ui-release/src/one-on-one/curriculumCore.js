export const CURRICULUM_AGES = ['U7', 'U9', 'U11', 'U13', 'U15', 'U18'];
export const CURRICULUM_STRANDS = ['scanning', 'off-puck-support-offense', 'gap-control', 'odd-man-reads'];
export const QUESTION_POINTS = 100;

export function insideCurriculumRink(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x) > 30.48 || Math.abs(y) > 12.954) return false;
  const radius = 8.5344;
  const cornerX = Math.abs(x) > 30.48 - radius ? Math.sign(x) * (30.48 - radius) : null;
  const cornerY = Math.abs(y) > 12.954 - radius ? Math.sign(y) * (12.954 - radius) : null;
  return cornerX === null || cornerY === null || Math.hypot(x - cornerX, y - cornerY) <= radius;
}

export function validateCurriculum(pack) {
  const errors = [];
  if (!pack || pack.version !== 'rinkreads-curriculum-draft-v1' || !Array.isArray(pack.lessons)) return ['invalid curriculum pack'];
  if (pack.status !== 'draft-for-review') errors.push('pack must retain draft status');
  if (pack.coordinateSystem !== 'rink-centred-metres') errors.push('unknown coordinate system');
  if (pack.lessons.length !== CURRICULUM_AGES.length * CURRICULUM_STRANDS.length) errors.push('exactly 24 lessons required');
  const ids = new Set();
  const text = value => typeof value === 'string' && value.trim().length > 0;
  for (const lesson of pack.lessons) {
    if (!lesson || typeof lesson !== 'object') { errors.push('invalid lesson'); continue; }
    if (!text(lesson.id) || ids.has(lesson.id)) errors.push('missing or duplicate lesson ID');
    ids.add(lesson.id);
    const young = ['U7', 'U9'].includes(lesson.ageBand);
    if (!CURRICULUM_AGES.includes(lesson.ageBand)) errors.push(`${lesson.id}: age`);
    if (!CURRICULUM_STRANDS.includes(lesson.curriculumStrand)) errors.push(`${lesson.id}: unknown strand`);
    if (young && lesson.conceptId === 'gap-control') errors.push(`${lesson.id}: formal gap-control age gate`);
    if (!text(lesson.sourceRef?.note) || !text(lesson.teachingPoint) || !text(lesson.ageRationale)) errors.push(`${lesson.id}: missing teaching provenance`);
    if (!Array.isArray(lesson.questions) || lesson.questions.length !== 2) { errors.push(`${lesson.id}: question pair required`); continue; }
    if (lesson.questions[0]?.type !== 'mc' || lesson.questions[1]?.type !== 'tf') errors.push(`${lesson.id}: expected MC then TF`);
    if (JSON.stringify(lesson.questions[0]?.visual) !== JSON.stringify(lesson.questions[1]?.visual)) errors.push(`${lesson.id}: paired board differs`);
    for (const q of lesson.questions) {
      if (!q || typeof q !== 'object') { errors.push(`${lesson.id}: invalid question`); continue; }
      if (!text(q.id) || ids.has(q.id)) errors.push(`${lesson.id}: missing or duplicate question ID`);
      ids.add(q.id);
      if (![q.sit, q.why, q.tip].every(text)) errors.push(`${q.id}: missing question or feedback`);
      if (q.type === 'tf' && typeof q.ok !== 'boolean') errors.push(`${q.id}: TF answer must be boolean`);
      if (q.type === 'mc') {
        const count = lesson.ageBand === 'U7' ? 2 : lesson.ageBand === 'U9' ? 3 : 4;
        if (!Array.isArray(q.opts) || q.opts.length !== count || !q.opts.every(text)) errors.push(`${q.id}: age option count`);
        if (!Number.isInteger(q.ok) || q.ok < 0 || q.ok >= (q.opts?.length ?? 0)) errors.push(`${q.id}: MC answer index`);
      }
      const visual = q.visual;
      if (!visual || !Array.isArray(visual.actors)) { errors.push(`${q.id}: authored board required`); continue; }
      if (!['half-right', 'cross-ice', 'full'].includes(visual.view)) errors.push(`${q.id}: unknown board view`);
      if (!['right-net-is-learners-own', 'right-net-is-attacking-net'].includes(visual.netContext)) errors.push(`${q.id}: unknown net context`);
      if (visual.actors.filter(actor => actor?.hasPuck).length !== 1) errors.push(`${q.id}: exactly one puck required`);
      if (visual.actors.filter(actor => actor?.label === 'YOU').length !== 1) errors.push(`${q.id}: exactly one YOU required`);
      if (young && visual.actors.some(actor => actor?.label && actor.label !== 'YOU')) errors.push(`${q.id}: young labels must be generic`);
      if (lesson.ageBand === 'U7' && (visual.view === 'full' || visual.hideBlueLines !== true)) errors.push(`${q.id}: U7 half ice without blue lines required`);
      if (young && ['timer', 'scanWindow', 'preview'].some(key => q[key] != null)) errors.push(`${q.id}: young age gate excludes pressure mechanics`);
      const actorIds = new Set();
      for (const actor of visual.actors) {
        if (!actor || !insideCurriculumRink(actor.x, actor.y)) errors.push(`${q.id}: actor outside rounded rink`);
        if (!text(actor?.id) || actorIds.has(actor?.id)) errors.push(`${q.id}: duplicate actor ID`);
        actorIds.add(actor?.id);
        if (!['home', 'away'].includes(actor?.team) || !['skater', 'goalie'].includes(actor?.role)) errors.push(`${q.id}: invalid team or role`);
        if (actor?.role === 'goalie') {
          const rightTeam = visual.netContext === 'right-net-is-learners-own' ? 'home' : 'away';
          const expectedTeam = actor.x >= 0 ? rightTeam : rightTeam === 'home' ? 'away' : 'home';
          if (actor.team !== expectedTeam) errors.push(`${q.id}: goalie team conflicts with net context`);
        }
      }
      if (young && visual.actors.filter(actor => actor?.role === 'skater').length > (lesson.ageBand === 'U7' ? 5 : 6)) errors.push(`${q.id}: young actor count`);
      if (visual.arrows != null && !Array.isArray(visual.arrows)) errors.push(`${q.id}: arrows must be an array`);
      for (const arrow of Array.isArray(visual.arrows) ? visual.arrows : []) {
        if (![arrow?.from, arrow?.to].every(point => Array.isArray(point) && point.length === 2 && insideCurriculumRink(...point))) errors.push(`${q.id}: arrow outside rounded rink`);
      }
    }
  }
  for (const age of CURRICULUM_AGES) for (const strand of CURRICULUM_STRANDS) {
    if (pack.lessons.filter(lesson => lesson?.ageBand === age && lesson?.curriculumStrand === strand).length !== 1) errors.push(`${age}: one lesson required for ${strand}`);
  }
  return errors;
}

export function scoreCurriculumQuestion(question, answer) {
  if (question?.type === 'tf') return typeof answer === 'boolean' && answer === question.ok;
  return question?.type === 'mc' && Number.isInteger(answer) && answer >= 0 && answer < question.opts.length && answer === question.ok;
}

export function recordCurriculumAnswer(progress, questionId, correct) {
  if (typeof correct !== 'boolean') throw new TypeError('correct must be boolean');
  const old = progress[questionId];
  return { ...progress, [questionId]: { attempted: true, firstCorrect: old?.firstCorrect ?? correct, mastered: !!(old?.mastered || correct) } };
}

export function readCurriculumProgress(raw, knownQuestionIds) {
  try {
    const saved = JSON.parse(raw);
    if (saved?.version !== 1 || !saved.answers || typeof saved.answers !== 'object' || Array.isArray(saved.answers)) return {};
    const result = {};
    for (const id of knownQuestionIds) {
      const answer = saved.answers[id];
      if (answer?.attempted === true && typeof answer.firstCorrect === 'boolean' && typeof answer.mastered === 'boolean') {
        result[id] = { attempted: true, firstCorrect: answer.firstCorrect, mastered: answer.mastered };
      }
    }
    return result;
  } catch { return {}; }
}

export function curriculumStats(progress, questions) {
  const unique = [...new Map(questions.map(question => [question.id, question])).values()];
  const attempted = unique.filter(question => progress[question.id]?.attempted === true).length;
  const mastered = unique.filter(question => progress[question.id]?.mastered === true).length;
  return { attempted, mastered, points: mastered * QUESTION_POINTS, total: unique.length };
}
