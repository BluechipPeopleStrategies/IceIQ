import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getCurriculumOpeningMotion, createCurriculumMotion, advanceCurriculumMotion, pauseCurriculumMotion, playCurriculumMotion, sampleCurriculumOpening, curriculumMotionCanAnswer } from './curriculumMotionCore.js';
const pack = JSON.parse(readFileSync(new URL('./curriculum-draft.json', import.meta.url)));
const questions = pack.lessons.flatMap(lesson => lesson.questions);
const question = questions.find(item => item.id === 'practice-draft-u18-support-change-mc');

test('only explicit registered D1 paths with matching endpoints become opening animations', () => {
  const motion = getCurriculumOpeningMotion(question);
  assert.equal(motion.actorId, 'D1');
  assert.deepEqual(motion.from, [17, 4]);
  assert.deepEqual(motion.to, [16.5, -1]);
  assert.equal(questions.filter(item => getCurriculumOpeningMotion(item)).length, 4);
  assert.equal(getCurriculumOpeningMotion(questions.find(item => item.id === 'practice-draft-u13-receive-finish-mc')), null, 'A completed-pass arrow does not authorize inventing possession changes.');
  const wrongEnd = structuredClone(question); wrongEnd.visual.arrows[0].to[0] += 1;
  assert.equal(getCurriculumOpeningMotion(wrongEnd), null);
  const wrongActor = structuredClone(question); wrongActor.visual.actors.find(actor => actor.id === 'D1').hasPuck = true;
  assert.equal(getCurriculumOpeningMotion(wrongActor), null);
});

test('D1 follows the drawn path and ends at the exact scored freeze; all other actors and puck flags remain unchanged', () => {
  const original = JSON.stringify(question);
  const motion = getCurriculumOpeningMotion(question);
  for (const progress of [0, .25, .5, .75, 1]) {
    const visual = sampleCurriculumOpening(question, progress);
    const defender = visual.actors.find(actor => actor.id === 'D1');
    assert.ok(defender.x >= 16.5 && defender.x <= 17);
    assert.ok(defender.y >= -1 && defender.y <= 4);
    assert.ok(Math.abs((defender.x - 17) * -5 - (defender.y - 4) * -.5) < 1e-9, 'Keep D1 on the authored straight arrow.');
    assert.ok(Number.isFinite(defender.facing));
    assert.deepEqual(visual.actors.filter(actor => actor.id !== 'D1'), question.visual.actors.filter(actor => actor.id !== 'D1'));
    assert.deepEqual(visual.actors.map(actor => actor.hasPuck), question.visual.actors.map(actor => actor.hasPuck));
    assert.equal(visual.arrows.length, 0, 'The played movement replaces only its arrow.');
  }
  assert.deepEqual(sampleCurriculumOpening(question, 0).actors.find(actor => actor.id === 'D1').x, motion.from[0]);
  const final = structuredClone(question.visual); final.arrows = [];
  assert.deepEqual(sampleCurriculumOpening(question, 1), final);
  assert.equal(JSON.stringify(question), original, 'Question text, options and answer key remain untouched.');
});

test('answering stays blocked through play, pause and replay, and unlocks only at the final freeze', () => {
  let state = createCurriculumMotion(question);
  assert.equal(state.phase, 'playing');
  assert.equal(curriculumMotionCanAnswer(state), false);
  state = advanceCurriculumMotion(state, .5);
  state = pauseCurriculumMotion(state);
  assert.equal(state.progress, .5);
  assert.equal(curriculumMotionCanAnswer(state), false);
  assert.throws(() => advanceCurriculumMotion(state, 1));
  state = advanceCurriculumMotion(playCurriculumMotion(state), 1);
  assert.equal(curriculumMotionCanAnswer(state), true);
  state = playCurriculumMotion(state, { replay: true });
  assert.equal(state.progress, 0);
  assert.equal(curriculumMotionCanAnswer(state), false);
});

test('reduced motion waits for explicit play and then exposes the final freeze without timed animation', () => {
  const state = createCurriculumMotion(question, { reducedMotion: true });
  assert.equal(state.phase, 'ready');
  assert.equal(curriculumMotionCanAnswer(state), false);
  const shown = playCurriculumMotion(state, { reducedMotion: true });
  assert.equal(shown.phase, 'complete');
  assert.equal(shown.progress, 1);
  assert.equal(curriculumMotionCanAnswer(shown), true);
  assert.deepEqual(sampleCurriculumOpening(question, shown.progress).actors, question.visual.actors);
});

test('questions without authored supported movement retain their full original visual and are immediately answerable', () => {
  for (const item of questions.filter(value => !getCurriculumOpeningMotion(value))) {
    assert.deepEqual(sampleCurriculumOpening(item, 0), item.visual);
    assert.equal(curriculumMotionCanAnswer(createCurriculumMotion(item)), true);
  }
});
