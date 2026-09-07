import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { CURRICULUM_PLAYER_COPY, curriculumPlayerCopy, curriculumValidationRationale, validateCurriculumAudienceCopy } from './curriculumAudienceCopy.js';
import { scoreCurriculumQuestion } from './curriculumCore.js';

const pack = JSON.parse(readFileSync(new URL('./curriculum-draft.json', import.meta.url), 'utf8'));
const sha = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const audit = JSON.parse(readFileSync(new URL('../../docs/one-on-one/evidence/curriculum-camera-copy-audit.json', import.meta.url), 'utf8'));

test('all48 source-bound audience variants retain the exact original question, answer order, geometry and sources', () => {
  const before = sha(pack);
  assert.equal(before, audit.afterPackSha256);
  assert.deepEqual(validateCurriculumAudienceCopy(pack), []);
  assert.equal(Object.keys(CURRICULUM_PLAYER_COPY).length, 48);
  for (const lesson of pack.lessons) for (const question of lesson.questions) {
    const copy = curriculumPlayerCopy(lesson, question);
    assert.deepEqual(Object.keys(copy).sort(), ['explanation', 'learnerAction', 'options', 'prompt', 'teachingPoint', 'tip', 'visualCaption']);
    assert.equal(copy.options?.length, question.opts?.length);
    const options = question.type === 'tf' ? [true, false] : copy.options.map((_, index) => index);
    for (const answer of options) assert.equal(scoreCurriculumQuestion(question, answer), answer === question.ok);
    assert.deepEqual(curriculumValidationRationale(lesson, question), { questionId: question.id, sourceRef: lesson.sourceRef, rationale: question.why });
    assert.ok(copy.prompt.length > 10 && copy.explanation.length > 15 && copy.tip.length > 5);
    const text = [copy.prompt, copy.explanation, copy.tip, copy.learnerAction, copy.teachingPoint, copy.visualCaption, ...(copy.options || [])].join(' ');
    assert.doesNotMatch(text, /meets (?:both conditions|the stated)|lane check|geometry supports|board cannot prove|constraint|receiving space|possession objective/i);
    assert.doesNotMatch(text, /\b(?:above|below|upper|lower)\b|pass (?:path )?to you are blocked|your lane/i);
    if (['U7', 'U9'].includes(lesson.ageBand)) assert.doesNotMatch(text, /\b[FDHA][123]\b|unobstructed|receiving angle|inside protection/i);
  }
  assert.equal(sha(pack), before, 'Presentation must not mutate its authoritative source');
});

test('pre-answer captions describe the scene without announcing the answer or a best option', () => {
  for (const lesson of pack.lessons) for (const question of lesson.questions) {
    const { visualCaption } = curriculumPlayerCopy(lesson, question);
    assert.doesNotMatch(visualCaption, /best|correct|clear (?:pass|lane|path|option)|offers? (?:a|another)|should|avoids both|open ice.*angle/i, question.id);
  }
});

test('missing or drifted copy fails closed instead of showing the internal rationale', () => {
  const lesson = pack.lessons.find(item => item.id.endsWith('u18-read-receiver'));
  const question = lesson.questions[0];
  for (const mutate of [q => { q.ok = 0; }, q => { q.why += ' New rationale.'; }, q => { q.opts.reverse(); }, q => { q.visual.actors[0].x += 1; }]) {
    const changed = structuredClone(question); mutate(changed);
    assert.throws(() => curriculumPlayerCopy(lesson, changed), /review/i);
  }
  assert.throws(() => curriculumPlayerCopy({ ...lesson, ageBand: 'U7' }, question), /review/i);
  assert.throws(() => curriculumPlayerCopy({ ...lesson, teachingPoint: 'A new teaching point' }, question), /review/i);
  assert.throws(() => curriculumPlayerCopy({ ...lesson, learnerAction: 'A new action' }, question), /review/i);
  assert.throws(() => curriculumPlayerCopy({ ...lesson, sourceRef: { ...lesson.sourceRef, note: 'another source' } }, question), /review/i);
  assert.throws(() => curriculumPlayerCopy(lesson, { ...question, id: 'not-mapped' }), /review/i);
  const changedPack = structuredClone(pack); changedPack.lessons[0].questions[0].why += ' Changed';
  assert.ok(validateCurriculumAudienceCopy(changedPack).length > 0);
});

test('the reported U18 example uses plain coaching language and preserves F3 at answer index1', () => {
  const lesson = pack.lessons.find(item => item.id.endsWith('u18-read-receiver'));
  const question = lesson.questions[0], copy = curriculumPlayerCopy(lesson, question);
  assert.equal(question.ok, 1);
  assert.equal(copy.prompt, 'Who can you pass to with a clear path and no opponent close by?');
  assert.match(copy.options[1], /^F3:/);
  assert.match(copy.explanation, /F3/); assert.match(copy.explanation, /F2/); assert.match(copy.explanation, /A2/); assert.match(copy.explanation, /A3/);
  assert.match(curriculumValidationRationale(lesson, question).rationale, /meets both conditions/);
  assert.doesNotMatch(JSON.stringify(copy), /meets both conditions|lane check/);
});
