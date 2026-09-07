import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getCurriculumPositionVariant, evaluatePositionRubric, evaluateCurriculumPosition, createCurriculumPositionAttempt, moveCurriculumPosition, setCurriculumPositionReason, checkCurriculumPosition, restoreCurriculumPosition, curriculumPositionState, curriculumPositionStorageKey } from './curriculumPositionCore.js';
const pack = JSON.parse(readFileSync(new URL('./curriculum-draft.json', import.meta.url)));
const question = pack.lessons.flatMap(lesson => lesson.questions).find(item => item.id === 'practice-draft-u15-two-angles-mc');
const original = JSON.stringify(question);

test('one separately identified position variant is bound to the exact source question and leaves MC untouched', () => {
  const variant = getCurriculumPositionVariant(question);
  assert.equal(variant.id, 'practice-draft-u15-two-angles-position-v1');
  assert.equal(variant.status, 'draft-for-coach-review');
  assert.notEqual(variant.id, question.id);
  assert.equal(pack.lessons.flatMap(lesson => lesson.questions).filter(q => getCurriculumPositionVariant(q)).length, 1);
  for (const alter of [q => q.visual.actors[1].hasPuck = false, q => q.visual.actors[3].x++, q => q.ok = 2, q => q.visual.actors[0].facing = 0]) {
    const drift = structuredClone(question); alter(drift); assert.equal(getCurriculumPositionVariant(drift), null);
  }
  assert.equal(JSON.stringify(question), original);
});

test('the exercise accepts a useful area, including explicit edge tolerance, rather than one exact point', () => {
  for (const point of [{ x: 19, y: 6 }, { x: 17, y: 4 }, { x: 22, y: 8 }, { x: 15.5, y: 4 }]) {
    assert.equal(evaluateCurriculumPosition(question, point).matchesDraft, true, JSON.stringify(point));
  }
  const outside = evaluateCurriculumPosition(question, { x: 14.9, y: 8 });
  assert.equal(outside.matchesDraft, false);
  assert.equal(outside.checks.find(check => check.id === 'area').matched, false);
  assert.equal(outside.checks.find(check => check.id === 'passing-lane').matched, true, 'a clear route alone cannot replace the authored area');
  assert.throws(() => evaluateCurriculumPosition(question, { x: NaN, y: 6 }), /rink|finite/i);
  assert.throws(() => evaluateCurriculumPosition(question, { x: 30, y: 12 }), /rink/i, 'inside rectangular bounds but outside curved boards');
});

test('region membership cannot override a blocked lane, crowded receiver or duplicated support angle', () => {
  const variant = getCurriculumPositionVariant(question), state = createCurriculumPositionAttempt(question).sourceState;
  const rubric = { ...variant.rubric, regions: [{ type: 'polygon', points: [[0, -12], [27, -12], [27, 12], [0, 12]] }] };
  const crowdedRoute = evaluatePositionRubric({ state, focusActorId: variant.focusActorId, point: { x: 20, y: -5 }, rubric });
  assert.equal(crowdedRoute.checks.find(check => check.id === 'area').matched, true);
  for (const id of ['passing-lane', 'receiving-space', 'separate-angle']) assert.equal(crowdedRoute.checks.find(check => check.id === id).matched, false, id);
  assert.equal(crowdedRoute.matchesDraft, false);
  assert.equal(evaluatePositionRubric({ state, focusActorId: variant.focusActorId, point: { x: 19, y: 6 }, rubric }).matchesDraft, true);
});

test('only the focused player moves; source actors, facing and actual carrier/puck remain unchanged', () => {
  const initial = createCurriculumPositionAttempt(question), bytes = JSON.stringify(initial);
  const moved = moveCurriculumPosition(initial, question, 'YOU', { x: 22, y: 8 }, 'rink');
  const state = curriculumPositionState(moved, question);
  assert.deepEqual(state.puck, initial.sourceState.puck);
  assert.deepEqual(state.actors.filter(actor => actor.id !== 'YOU'), initial.sourceState.actors.filter(actor => actor.id !== 'YOU'));
  assert.equal(state.actors.find(actor => actor.id === 'YOU').facing, initial.sourceState.actors[0].facing);
  assert.equal(state.puck.owner, 'F1');
  assert.equal(JSON.stringify(initial), bytes); assert.equal(JSON.stringify(question), original);
  assert.throws(() => moveCurriculumPosition(initial, question, 'F1', { x: 22, y: 8 }), /highlighted/i);
  assert.throws(() => moveCurriculumPosition(initial, question, 'YOU', { x: 22, y: 8 }, 'hold'), /starting/i);
});

test('checking is explicit, optional notes can be empty, and restoration rejects altered results, source and hold evidence', () => {
  const initial = createCurriculumPositionAttempt(question);
  assert.throws(() => checkCurriculumPosition(initial, question), /position/i);
  let attempt = moveCurriculumPosition(initial, question, 'YOU', { x: 19, y: 6 }, 'hold');
  assert.equal(attempt.result, null);
  attempt = checkCurriculumPosition(attempt, question);
  assert.equal(attempt.reason, ''); assert.equal(attempt.result.matchesDraft, true);
  assert.deepEqual(restoreCurriculumPosition(JSON.stringify(attempt), question), attempt);
  for (const alter of [a => a.result.matchesDraft = false, a => a.sourceState.puck.owner = 'YOU', a => a.point.x = 20, a => a.extra = true]) {
    const tampered = structuredClone(attempt); alter(tampered); assert.equal(restoreCurriculumPosition(tampered, question), null);
  }
  const edited = setCurriculumPositionReason(moveCurriculumPosition(attempt, question, 'YOU', { x: 17, y: 4 }, 'coordinates'), question, 'A different clear route.');
  assert.equal(edited.result, null); assert.equal(restoreCurriculumPosition(edited, question).reason, 'A different clear route.');
  assert.notEqual(curriculumPositionStorageKey('a', question), `rinkreads_guided_curriculum_v1:a`);
  assert.notEqual(curriculumPositionStorageKey('a', question), curriculumPositionStorageKey('b', question));
});
