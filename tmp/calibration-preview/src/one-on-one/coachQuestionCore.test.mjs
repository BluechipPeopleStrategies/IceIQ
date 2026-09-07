import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createDraft, sampleDraft } from './director.js';
import { NHL_200X85_PROFILE } from '../scenario-engine/rinkFrame.js';
import { createCoachQuestion, editQuestionActor, saveCoachReference, validateCoachQuestion, createLearnerAttempt, moveLearnerActor, submitLearnerAttempt, compareCoachAttempt, readSavedCoachQuestions } from './coachQuestionCore.js';

function readyQuestion(type = 'position') {
  const question = createCoachQuestion(createDraft(2, 2), { id: 'question-test' });
  return saveCoachReference({ ...question, type, prompt: 'Where should your players stand?', coachExplanation: 'Keep the middle covered and offer a clear outlet.', expectedAction: type === 'action' ? 'pass' : null });
}

test('reference edits and learner edits never mutate the starting draft or each other', () => {
  const original = createDraft(2, 2);
  const question = createCoachQuestion(original, { id: 'question-test' });
  const edited = editQuestionActor(question, 'referenceDraft', 'home-skater-1', { x: -4, y: 5 });
  assert.deepEqual(original, createDraft(2, 2));
  assert.equal(sampleDraft(question.referenceDraft, 0).actors[0].x, -12);
  assert.equal(sampleDraft(edited.initialDraft, 0).actors[0].x, -12);
  const saved = saveCoachReference({ ...edited, coachExplanation: 'Give a clear option.' });
  const attempt = createLearnerAttempt(saved);
  const moved = moveLearnerActor(saved, attempt, 'home-skater-1', { x: -7, y: 3 });
  assert.equal(sampleDraft(attempt.draft, 0).actors[0].x, -12);
  assert.equal(sampleDraft(saved.referenceDraft, 0).actors[0].x, -4);
  assert.equal(sampleDraft(moved.draft, 0).actors[0].x, -7);
});

test('comparison reports differences and explanations without a correctness score', () => {
  const question = readyQuestion('action');
  let attempt = createLearnerAttempt(question);
  attempt = moveLearnerActor(question, attempt, 'home-skater-1', { x: -9, y: 2 });
  attempt = submitLearnerAttempt(question, { ...attempt, action: 'carry', reason: 'I want to protect the puck.' });
  const before = structuredClone({ question, attempt });
  const result = compareCoachAttempt(question, attempt);
  assert.deepEqual({ question, attempt }, before);
  assert.equal(result.positions[0].distance, 5);
  assert.equal(result.learnerAction, 'carry');
  assert.equal(result.referenceAction, 'pass');
  assert.equal(result.learnerReason, attempt.reason);
  assert.equal(result.coachExplanation, question.coachExplanation);
  for (const key of ['score', 'correct', 'grade', 'passed']) assert.equal(key in result, false);
});

test('facing changes remain independent and compare through the shortest angle without grading', () => {
  const question = readyQuestion();
  const original = createLearnerAttempt(question);
  const moved = moveLearnerActor(question, original, 'home-skater-1', { facing: Math.PI * 1.75 });
  const result = compareCoachAttempt(question, submitLearnerAttempt(question, { ...moved, reason: 'Face the developing play.' }));
  assert.equal(original.draft.actors[0].keys[0].facing, 0);
  assert.ok(Math.abs(result.positions[0].facingDifference + 45) < 1e-9);
  assert.equal(result.positions[0].distance, 0);
  assert.equal(result.score, undefined);
});

test('question save requires an explicit explanation and action key when relevant', () => {
  const question = createCoachQuestion(createDraft());
  assert.throws(() => saveCoachReference(question), /explanation/);
  assert.throws(() => createLearnerAttempt(question), /save|reference/i);
  assert.throws(() => saveCoachReference({ ...question, type: 'action', coachExplanation: 'Pass to the open teammate.' }), /action/);
  assert.throws(() => submitLearnerAttempt(readyQuestion(), createLearnerAttempt(readyQuestion())), /reason/);
});

test('validated JSON rejects nonfinite positions, unknown actions, changed identities and uncontrolled reference edits', () => {
  const question = readyQuestion();
  const malformed = structuredClone(question);
  malformed.referenceDraft.actors[0].keys[0].x = Infinity;
  malformed.expectedAction = 'teleport';
  malformed.referenceDraft.actors[1].id = 'unmatched';
  const errors = validateCoachQuestion(malformed).join(' ');
  assert.match(errors, /finite/);
  assert.match(errors, /action/);
  malformed.referenceDraft.actors[0].keys[0].x = -12;
  assert.match(validateCoachQuestion(malformed).join(' '), /identity/);
  assert.throws(() => editQuestionActor(question, 'referenceDraft', 'away-skater-1', { x: 0, y: 0 }), /controlled team/);
  assert.throws(() => moveLearnerActor(question, createLearnerAttempt(question), 'away-skater-1', { x: 0, y: 0 }), /controlled team/);
});

test('new coach references never inherit source grading or certification', () => {
  const draft = { ...createDraft(), sourceRef: { id: 'approved-source', note: 'docs/library/gap-control.md' }, approved: true, correct: 'shoot' };
  const question = createCoachQuestion(draft);
  assert.equal(question.expectedAction, null);
  assert.equal(question.answerStatus, 'draft');
  assert.equal(question.certification, 'not-certified');
  assert.equal(question.sourceRef.sourceId, 'approved-source');
  assert.equal('correct' in question, false);
  assert.equal('approved' in question, false);
  assert.equal(question.referenceDraft.status, 'development-not-validated');
});

test('saved questions round trip; corrupt entries are skipped without losing valid questions', () => {
  const question = readyQuestion();
  const raw = JSON.stringify([null, { id: 'broken' }, question]);
  assert.deepEqual(readSavedCoachQuestions(raw), [question]);
  assert.deepEqual(readSavedCoachQuestions('{broken'), []);
  assert.deepEqual(readSavedCoachQuestions('{}'), []);
});

test('open rubrics permit multiple discussed actions without inventing a single correctness key', () => {
  const question = { ...readyQuestion('action'), expectedAction: null, rubric: { mode: 'open', mustNotice: ['The defender partly covers the shot.', 'The receiver is under pressure.'], acceptableActions: ['shoot', 'carry'], avoid: ['Pass only because a teammate exists.'], followUpCue: 'Recheck the defender after moving the puck.' } };
  assert.deepEqual(validateCoachQuestion(question), []);
  assert.equal(createLearnerAttempt(question).action, null);
  assert.match(validateCoachQuestion({ ...question, rubric: { ...question.rubric, acceptableActions: ['teleport'] } }).join(' '), /rubric action/);
  assert.match(validateCoachQuestion({ ...question, rubric: { ...question.rubric, mustNotice: 'pressure' } }).join(' '), /mustNotice/);
});

test('ready-made scenarios cover every age twice and keep valid independent references', () => {
  const examples = JSON.parse(readFileSync(new URL('./coach-question-examples.json', import.meta.url)));
  assert.equal(examples.length, 12);
  for (const age of ['U7', 'U9', 'U11', 'U13', 'U15', 'U18']) assert.equal(examples.filter(item => item.ageBand === age).length, 2, age);
  for (const question of examples) {
    assert.deepEqual(validateCoachQuestion(question), [], question.id);
    const attempt = createLearnerAttempt(question);
    assert.notStrictEqual(attempt.draft, question.initialDraft);
    if (question.ageBand === 'U7') assert.equal(question.view, 'half-right');
    for (const snapshot of [question.initialDraft, question.referenceDraft]) {
      for (const goalie of snapshot.actors.filter(actor => actor.role === 'goalie')) assert.ok(Math.abs(goalie.keys[0].x) < NHL_200X85_PROFILE.landmarks.goalLineRight[0], `${question.id}: goalie must stand in front of this net`);
    }
  }
});

test('saving coach rubric text trims empty lines without silently changing the action choices', () => {
  const question = { ...readyQuestion('action'), rubric: { mode: 'open', mustNotice: [' Pressure beside the receiver. ', ''], acceptableActions: ['pass', 'carry'], avoid: ['  ', 'Passing by habit.'], followUpCue: ' Read again. ' } };
  const saved = saveCoachReference(question);
  assert.deepEqual(saved.rubric.mustNotice, ['Pressure beside the receiver.']);
  assert.deepEqual(saved.rubric.avoid, ['Passing by habit.']);
  assert.deepEqual(saved.rubric.acceptableActions, ['pass', 'carry']);
});
