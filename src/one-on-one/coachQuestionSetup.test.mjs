import test from 'node:test';
import assert from 'node:assert/strict';
import { createDraft } from './director.js';
import { createCoachQuestion, editQuestionActor, validateCoachQuestion, saveCoachReference, createLearnerAttempt, submitLearnerAttempt } from './coachQuestionCore.js';
import * as setup from './coachQuestionSetup.js';

test('grow a positioned question to ten skaters without losing positions, references or identity', () => {
  let question = createCoachQuestion(createDraft(2, 2));
  question = editQuestionActor(question, 'initialDraft', 'home-skater-1', { x: 23, y: 8, facing: .6 });
  question = editQuestionActor(question, 'referenceDraft', 'home-skater-1', { x: 18, y: -9, facing: 1.2 });
  const original = structuredClone(question);
  question = setup.resizeQuestionTeam(setup.resizeQuestionTeam(question, 'home', 5), 'away', 5);
  assert.equal(question.initialDraft.actors.filter(actor => actor.role === 'skater').length, 10);
  for (const field of ['initialDraft', 'referenceDraft']) {
    for (const actor of original[field].actors) assert.deepEqual(question[field].actors.find(item => item.id === actor.id), actor);
    assert.equal(new Set(question[field].actors.map(actor => actor.id)).size, 12);
  }
  assert.deepEqual(validateCoachQuestion(question, { requireReady: false }), []);
  assert.equal(original.initialDraft.actors.length, 6);
});

test('optional goalies and puck ownership survive ten-player question save, restore and both answer types', () => {
  let question = createCoachQuestion(createDraft(5, 5));
  question = setup.setQuestionGoalie(setup.setQuestionGoalie(question, 'home', false), 'away', false);
  assert.equal(question.initialDraft.actors.length, 10);
  question = setup.setQuestionPuckOwner(question, 'away-skater-5');
  for (const field of ['initialDraft', 'referenceDraft']) assert.equal(question[field].puck.owner, 'away-skater-5');
  for (const type of ['position', 'action']) {
    const saved = saveCoachReference({ ...question, type, expectedAction: type === 'action' ? 'pass' : null, coachExplanation: 'Use the open passing lane.' });
    const restored = JSON.parse(JSON.stringify(saved));
    const attempt = createLearnerAttempt(restored);
    const submitted = submitLearnerAttempt(restored, { ...attempt, action: type === 'action' ? 'pass' : null });
    assert.equal(submitted.draft.actors.length, 10);
    assert.equal(submitted.draft.puck.owner, 'away-skater-5');
  }
  question = setup.resizeQuestionTeam(question, 'away', 3);
  assert.equal(question.initialDraft.puck.owner, question.referenceDraft.puck.owner);
  assert.ok(question.initialDraft.actors.some(actor => actor.id === question.initialDraft.puck.owner));
  assert.deepEqual(validateCoachQuestion(question, { requireReady: false }), []);
  assert.throws(() => setup.resizeQuestionTeam(question, 'home', 0));
  assert.throws(() => setup.setQuestionPuckOwner(question, 'missing'));
});
