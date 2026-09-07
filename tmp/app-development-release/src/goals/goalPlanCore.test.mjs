import test from 'node:test';
import assert from 'node:assert/strict';
import {
  categoriesFor, readGoalPlan, updateGoalPlan, assessGoalPlan, goalFocusLimit,
  normaliseCheckIn, addGoalCheckIn, summariseCheckIns, makeGoalStarters,
  readGoalSupplement, writeGoalSupplement, mergeGoalSupplement, trainingSessionContext,
} from './goalPlanCore.js';

const ready = {
  action: 'Look over my shoulder before a practice pickup',
  measure: 'Mark whether I looked on each of four practice pickups',
  schedule: 'At the next skills practice, in the pickup drill',
  why: 'I want to see the space before I get the puck',
  reviewDate: '2026-09-12',
  checks: { ownAction: true, observable: true, feasible: true },
};
const opts = { level: 'U11 / Atom', today: '2026-09-05' };

test('editing one category preserves every unrelated category and untouched legacy string', () => {
  const before = {
    Skating: { goal: 'My old title', S: '  Skate with control  ', M: 'old measure', A: 'old schedule', R: 'My words', T: 'By October', completed: false, custom: { coach: 'retained' } },
    'Old custom category': { goal: 'Keep this', S: 'exact old text', completed: true },
    Passing: 'A legacy text-only goal',
  };
  const next = updateGoalPlan(before, 'Skating', { why: 'My new reason' }, { ...opts, status: 'draft' });
  assert.equal(next.Skating.S, before.Skating.S);
  assert.equal(next.Skating.goal, before.Skating.goal);
  assert.equal(next.Skating.T, 'By October');
  assert.equal(next.Skating.R, 'My new reason');
  assert.deepEqual(next.Skating.custom, { coach: 'retained' });
  assert.strictEqual(next.Passing, before.Passing);
  assert.strictEqual(next['Old custom category'], before['Old custom category']);
  assert.equal(before.Skating.R, 'My words');
});

test('read and save without field changes preserves legacy SMART strings exactly', () => {
  const legacy = { goal: 'Older headline', S: 'Keep  spacing', M: 'Count tries', A: 'At practice', R: 'My own reason', T: 'By end of October', completed: true };
  const plan = readGoalPlan(legacy, opts.level);
  assert.equal(plan.action, 'Keep  spacing');
  assert.equal(plan.reviewDate, '');
  assert.equal(plan.reviewWhen, 'By end of October');
  const next = updateGoalPlan({ Skating: legacy }, 'Skating', {}, opts).Skating;
  for (const key of ['goal', 'S', 'M', 'A', 'R', 'T', 'completed']) assert.equal(next[key], legacy[key]);
});

test('new plan produces existing cloud-compatible fields while keeping the local plan metadata', () => {
  const goal = updateGoalPlan({}, 'Skating', ready, { ...opts, status: 'active' }).Skating;
  assert.equal(goal.goal, ready.action);
  assert.equal(goal.S, ready.action);
  assert.equal(goal.M, ready.measure);
  assert.equal(goal.A, ready.schedule);
  assert.equal(goal.R, ready.why);
  assert.equal(goal.T, ready.reviewDate);
  assert.equal(goal.completed, false);
  assert.equal(goal.plan.status, 'active');
  assert.equal(assessGoalPlan(readGoalPlan(goal, opts.level), opts).ready, true);
});

test('incomplete drafts are saveable but cannot be activated as concrete plans', () => {
  const draft = updateGoalPlan({}, 'Passing', { action: 'Get better' }, { ...opts, status: 'draft' });
  const quality = assessGoalPlan(readGoalPlan(draft.Passing, opts.level), opts);
  assert.equal(quality.ready, false);
  assert.ok(quality.missing.some(item => item.field === 'measure'));
  assert.throws(() => updateGoalPlan(draft, 'Passing', {}, { ...opts, status: 'active' }), /Finish/);
  assert.throws(() => updateGoalPlan({}, '', ready, opts), /category/);
  assert.equal(assessGoalPlan({ ...ready, reviewDate: '2026-02-30' }, opts).ready, false);
  assert.equal(assessGoalPlan({ ...ready, reviewDate: '2026-09-01' }, opts).ready, false);
  assert.equal(assessGoalPlan({ ...ready, action: 'Get better' }, opts).ready, false);
});

test('young child intent needs no numerical measure, reason, SMART checks or RPE', () => {
  const youngOpts = { level: 'U7 / Initiation', today: opts.today, status: 'active' };
  const goal = updateGoalPlan({}, 'Teamwork', { action: 'Cheer for a teammate' }, youngOpts).Teamwork;
  assert.equal(goal.T, 'Next practice');
  assert.equal(assessGoalPlan(readGoalPlan(goal, youngOpts.level), youngOpts).ready, true);
  assert.equal(goal.M, undefined);
  assert.equal(goalFocusLimit(youngOpts.level), 1);
  assert.equal(goalFocusLimit('U18 / Midget'), 3);
  assert.equal(goalFocusLimit('unknown'), 1);
});

test('active focus limit parks new plans without deleting existing goals', () => {
  const first = updateGoalPlan({}, 'Skating', ready, { ...opts, level: 'U9 / Novice', status: 'active' });
  assert.throws(() => updateGoalPlan(first, 'Passing', ready, { ...opts, level: 'U9 / Novice', status: 'active' }), /focus/);
  const parked = updateGoalPlan(first, 'Passing', ready, { ...opts, level: 'U9 / Novice', status: 'up-next' });
  assert.equal(parked.Passing.plan.status, 'up-next');
  assert.strictEqual(parked.Skating, first.Skating);
});

test('changing a plan invalidates the relevant earlier self-check', () => {
  const before = updateGoalPlan({}, 'Skating', ready, { ...opts, status: 'active' });
  const after = updateGoalPlan(before, 'Skating', { action: 'Show my stick before a partner pass' }, opts);
  assert.equal(after.Skating.plan.checks.ownAction, false);
  assert.equal(after.Skating.plan.checks.observable, false);
  assert.equal(assessGoalPlan(readGoalPlan(after.Skating, opts.level), opts).ready, false);
});

test('check-ins keep zero separate from missing or not observed and reject invalid values', () => {
  const missing = normaliseCheckIn({ date: opts.today, observation: 'not-observed', rpe: '', durationMinutes: '', attempted: '', observed: '' });
  assert.equal(missing.rpe, null);
  assert.equal(missing.durationMinutes, null);
  assert.equal(missing.attempted, null);
  assert.equal(missing.observed, null);
  const zero = normaliseCheckIn({ date: opts.today, observation: 'tried', rpe: '0', durationMinutes: '0', attempted: '4', observed: '0' });
  assert.equal(zero.rpe, 0);
  assert.equal(zero.observed, 0);
  assert.throws(() => normaliseCheckIn({ date: opts.today, rpe: 11 }), /effort/i);
  assert.throws(() => normaliseCheckIn({ date: opts.today, rpe: 'junk' }), /effort/i);
  assert.throws(() => normaliseCheckIn({ date: opts.today, observation: 'tried', attempted: 2, observed: 3 }), /observed/i);
  assert.throws(() => normaliseCheckIn({ date: '2026-02-30' }), /date/i);
});

test('a check-in does not complete a goal or turn perceived effort into improvement', () => {
  const before = updateGoalPlan({}, 'Skating', ready, { ...opts, status: 'active' });
  const after = addGoalCheckIn(before, 'Skating', { date: opts.today, observation: 'not-observed', rpe: 10, reflection: 'I felt tired.' });
  assert.equal(after.Skating.completed, false);
  assert.equal(after.Skating.plan.checkIns[0].action, ready.action);
  assert.equal(before.Skating.plan.checkIns.length, 0);
  const summary = summariseCheckIns(after.Skating.plan.checkIns);
  assert.equal(summary.recorded, 1);
  assert.equal(summary.tried, 0);
  assert.equal(summary.notObserved, 1);
  assert.equal(summary.attempted, null);
  assert.equal(summary.observed, null);
  assert.equal(summary.score, undefined);
});

test('device supplement survives a cloud-only reload and remains isolated per player', () => {
  const memory = new Map();
  const storage = { getItem: key => memory.get(key) ?? null, setItem: (key, val) => memory.set(key, val) };
  const full = addGoalCheckIn(updateGoalPlan({}, 'Skating', ready, { ...opts, status: 'active' }), 'Skating', { date: opts.today, observation: 'not-observed', rpe: null });
  writeGoalSupplement('player-a', 'Skating', full.Skating, storage);
  const reloaded = mergeGoalSupplement({ Passing: { goal: 'Keep unrelated remote goal' }, Skating: { S: ready.action, goal: ready.action } }, readGoalSupplement('player-a', storage));
  assert.equal(reloaded.Skating.plan.checkIns[0].rpe, null);
  assert.equal(reloaded.Skating.plan.checkIns[0].observation, 'not-observed');
  assert.equal(reloaded.Passing.goal, 'Keep unrelated remote goal');
  assert.deepEqual(readGoalSupplement('player-b', storage), {});
  assert.throws(() => writeGoalSupplement('player-a', 'Skating', full.Skating, { getItem: () => null, setItem: () => { throw Error('quota'); } }), /quota/);
  assert.throws(() => readGoalSupplement('player-a', { getItem: () => 'null' }), /unsupported format/);
});

test('categories retain old keys and templates do not supply a borrowed reason', () => {
  assert.ok(categoriesFor('U11 / Atom', { 'My old custom focus': {} }).includes('My old custom focus'));
  for (const level of ['U7 / Initiation', 'U9 / Novice', 'U11 / Atom', 'U13 / Peewee', 'U15 / Bantam', 'U18 / Midget']) {
    for (const category of categoriesFor(level)) {
      const starters = makeGoalStarters(level, category);
      assert.ok(starters.length >= 2, `${level}/${category}`);
      for (const starter of starters) {
        assert.equal(starter.why, undefined);
        if (level.startsWith('U7')) assert.ok(starter.action.split(/\s+/).length <= 6);
      }
    }
  }
});

test('training-session context tolerates older entries with no type or label', () => {
  assert.deepEqual(trainingSessionContext({ date: '2026-09-04', unit: 'min', value: 45 }), {
    date: '2026-09-04', sessionLabel: '', durationMinutes: '45',
  });
  assert.deepEqual(trainingSessionContext({ type: 'small_game', unit: 'reps', value: 6 }), {
    date: '', sessionLabel: 'small game', durationMinutes: '',
  });
  assert.deepEqual(trainingSessionContext({ label: 'Team practice', type: 'ignored_type' }), {
    date: '', sessionLabel: 'Team practice', durationMinutes: '',
  });
});
