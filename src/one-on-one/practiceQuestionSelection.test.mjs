import test from 'node:test';
import assert from 'node:assert/strict';
import { selectPracticeQuestions } from './practiceQuestionSelection.js';

const scenario = { questions: [
  { id: 'q1', type: 'choice' }, { id: 'q2', type: 'explain' },
  { id: 'q3', type: 'position' }, { id: 'q4', type: 'explain' },
] };

test('normal practice keeps one reflection and preserves authored question order', () => {
  assert.deepEqual(selectPracticeQuestions(scenario).map(question => question.id), ['q1', 'q2', 'q3']);
});

test('a direct link to another reflection selects it instead of the default', () => {
  assert.deepEqual(selectPracticeQuestions(scenario, 'q4').map(question => question.id), ['q1', 'q3', 'q4']);
});

test('a direct link to a non-reflection keeps the first reflection', () => {
  assert.deepEqual(selectPracticeQuestions(scenario, 'q3').map(question => question.id), ['q1', 'q2', 'q3']);
});

test('one reflection per scenario yields the expected 1,500 of 1,600 routine questions', () => {
  const original = Array.from({ length: 100 }, (_, index) => ({ questions: [
    ...Array.from({ length: 8 }, (_, questionIndex) => ({ id: `o${index}-${questionIndex}`, type: 'choice' })),
    { id: `o${index}-r1`, type: 'explain' }, { id: `o${index}-r2`, type: 'explain' },
  ] }));
  const additions = Array.from({ length: 100 }, (_, index) => ({ questions: [
    ...Array.from({ length: 5 }, (_, questionIndex) => ({ id: `n${index}-${questionIndex}`, type: 'choice' })),
    { id: `n${index}-r1`, type: 'explain' },
  ] }));
  const visible = [...original, ...additions].flatMap(item => selectPracticeQuestions(item));
  assert.equal(visible.length, 1500);
  assert.equal(visible.filter(question => question.type === 'explain').length, 200);
  assert.equal(visible.filter(question => question.type === 'explain').length / visible.length, 2 / 15);
});

test('selection leaves full authored IDs and saved answer keys untouched', () => {
  const sourceIds = scenario.questions.map(question => question.id);
  const saved = Object.fromEntries(sourceIds.map(id => [id, { value: id, reviewed: true }]));
  const visible = selectPracticeQuestions(scenario);
  assert.deepEqual(scenario.questions.map(question => question.id), sourceIds);
  assert.deepEqual(Object.keys(saved), sourceIds);
  assert.equal(visible.some(question => question.id === 'q4'), false);
});
