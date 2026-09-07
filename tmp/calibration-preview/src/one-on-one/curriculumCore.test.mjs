import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateCurriculum, scoreCurriculumQuestion, recordCurriculumAnswer, readCurriculumProgress, curriculumStats } from './curriculumCore.js';

const pack = JSON.parse(readFileSync(new URL('./curriculum-draft.json', import.meta.url)));
const questions = pack.lessons.flatMap(lesson => lesson.questions);

test('authored curriculum has six complete age paths with preserved board and answer contracts', () => {
  assert.deepEqual(validateCurriculum(pack), []);
  assert.equal(pack.lessons.length, 24);
  assert.equal(questions.length, 48);
  for (const question of questions) {
    assert.equal(scoreCurriculumQuestion(question, question.ok), true, question.id);
    assert.equal(scoreCurriculumQuestion(question, question.type === 'tf' ? !question.ok : (question.ok + 1) % question.opts.length), false);
  }
});

test('content gate rejects answer coercion, duplicate IDs and a changed paired board', () => {
  const broken = structuredClone(pack);
  broken.lessons[0].questions[1].ok = 1;
  broken.lessons[1].questions[0].id = broken.lessons[0].questions[0].id;
  broken.lessons[0].questions[1].visual.actors[0].x = 1;
  const errors = validateCurriculum(broken).join(' ');
  assert.match(errors, /boolean/);
  assert.match(errors, /duplicate/);
  assert.match(errors, /paired board/);
  assert.equal(scoreCurriculumQuestion({ type: 'tf', ok: false }, 0), false);
  assert.equal(scoreCurriculumQuestion({ type: 'mc', ok: 1, opts: ['a', 'b'] }, '1'), false);
});

test('content gate rejects off-ice actors, missing pucks and young-board regressions', () => {
  const broken = structuredClone(pack);
  const lesson = broken.lessons[0];
  lesson.conceptId = 'gap-control';
  lesson.questions[0].visual.actors[0].x = 30.48;
  lesson.questions[0].visual.actors[0].y = 12.954;
  lesson.questions[0].visual.actors[1].label = 'RW';
  lesson.questions[0].visual.actors.forEach(actor => { actor.hasPuck = false; });
  lesson.questions[0].visual.hideBlueLines = false;
  const errors = validateCurriculum(broken).join(' ');
  for (const pattern of [/rounded rink/, /one puck/, /young labels/, /blue lines/, /age gate/]) assert.match(errors, pattern);
});

test('content gate rejects extra strands and contradictory goal ownership', () => {
  const broken = structuredClone(pack);
  broken.lessons.push({ ...structuredClone(broken.lessons[0]), id: 'extra-lesson', curriculumStrand: 'unknown' });
  broken.lessons[0].questions[0].visual.netContext = 'unspecified';
  const goalie = broken.lessons[1].questions[0].visual.actors.find(actor => actor.role === 'goalie');
  goalie.team = 'home';
  const errors = validateCurriculum(broken).join(' ');
  for (const pattern of [/24 lessons/, /unknown strand/, /net context/, /goalie team/]) assert.match(errors, pattern);
});

test('first miss stays recorded, later mastery earns once, review misses never erase earned points', () => {
  const question = questions[0];
  const initial = {};
  let progress = recordCurriculumAnswer(initial, question.id, false);
  progress = recordCurriculumAnswer(progress, question.id, true);
  progress = recordCurriculumAnswer(progress, question.id, true);
  progress = recordCurriculumAnswer(progress, question.id, false);
  assert.deepEqual(initial, {});
  assert.deepEqual(progress[question.id], { attempted: true, firstCorrect: false, mastered: true });
  assert.deepEqual(curriculumStats(progress, [question]), { attempted: 1, mastered: 1, points: 100, total: 1 });
});

test('storage loader drops malformed and unknown records rather than trusting saved points', () => {
  const id = questions[0].id;
  const known = questions.map(q => q.id);
  const raw = JSON.stringify({ version: 1, answers: { [id]: { attempted: true, firstCorrect: false, mastered: true, points: 999999 }, unknown: { attempted: true, firstCorrect: true, mastered: true }, [questions[1].id]: null } });
  const restored = readCurriculumProgress(raw, known);
  assert.deepEqual(Object.keys(restored), [id]);
  assert.equal(curriculumStats(restored, questions).points, 100);
  for (const invalid of ['null', '[null]', '{}', '{bad']) assert.deepEqual(readCurriculumProgress(invalid, known), {});
});
