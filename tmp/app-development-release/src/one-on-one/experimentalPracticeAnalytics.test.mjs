import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ANALYTICS_VERSION,
  MAX_ANALYTICS_EVENTS,
  buildPracticeInsights,
  createPracticeAnalyticsStore,
  restorePracticeAnalytics,
} from './experimentalPracticeAnalytics.js';

function storage(initial = null) {
  let value = initial;
  return {
    getItem() { return value; },
    setItem(_key, next) { value = next; },
    removeItem() { value = null; },
    raw() { return value; },
  };
}

const base = {
  scenarioId: 'exp26b-u13-016',
  scenarioVersion: 3,
  questionId: 'exp26b-u13-016-q5',
  contentHash: 'hash-016-q5',
  basis: 'coaching',
  questionType: 'choice',
};

test('records exact views and deduplicates only consecutive rerenders', () => {
  const store = createPracticeAnalyticsStore({ storage: storage(), sessionId: 'session-a', now: () => '2026-09-05T12:00:00.000Z' });
  store.recordQuestionView(base);
  store.recordQuestionView(base);
  store.recordQuestionView({ ...base, questionId: 'exp26b-u13-016-q6' });
  store.recordQuestionView(base);
  const events = store.getState().events;
  assert.equal(events.filter(event => event.event === 'question_view').length, 3);
  assert.deepEqual(events.map(event => event.questionId), [base.questionId, 'exp26b-u13-016-q6', base.questionId]);
});

test('checks count retries and stores scene matching only for scene questions', () => {
  const store = createPracticeAnalyticsStore({ storage: storage(), sessionId: 'session-b', now: () => '2026-09-05T12:00:00.000Z' });
  store.recordQuestionCheck({ ...base, basis: 'scene', sceneMatch: true });
  store.recordQuestionCheck({ ...base, basis: 'scene', sceneMatch: false });
  store.recordQuestionCheck({ ...base, basis: 'coaching', sceneMatch: true });
  const checks = store.getState().events.filter(event => event.event === 'question_check');
  assert.deepEqual(checks.map(event => [event.attemptNumber, event.retry]), [[1, false], [2, true], [3, true]]);
  assert.equal(checks[0].sceneMatch, true);
  assert.equal(checks[1].sceneMatch, false);
  assert.equal(Object.hasOwn(checks[2], 'sceneMatch'), false);
  const insights = buildPracticeInsights(store.getState());
  assert.equal(insights.sampleSizes.sceneChecks, 2);
  assert.equal(insights.sampleSizes.sceneMatches, 1);
  assert.equal(insights.sampleSizes.coachingChecks, 1);
});

test('uses distinct view IDs for cautious follow-through rates', () => {
  const store = createPracticeAnalyticsStore({ storage: storage(), sessionId: 'session-views', now: () => '2026-09-05T12:00:00.000Z' });
  store.recordQuestionView(base);
  store.recordQuestionCheck(base);
  store.recordQuestionCheck(base);
  store.recordQuestionView({ ...base, questionId: 'exp26b-u13-016-q6', questionType: 'explain' });
  store.recordQuestionView(base);
  const checks = store.getState().events.filter(event => event.event === 'question_check');
  assert.equal(checks[0].viewEventId, checks[1].viewEventId);
  const row = buildPracticeInsights(store.getState()).completionRates.find(item => item.questionId === base.questionId);
  assert.equal(row.totalViews, 2);
  assert.equal(row.distinctViewIDsWithCheck, 1);
  assert.equal(row.rate, 0.5);
  assert.equal(row.reliable, true);
});

test('counts an optional reflection skip as engagement without treating it as failure', () => {
  const store = createPracticeAnalyticsStore({ storage: storage(), sessionId: 'session-skip', now: () => '2026-09-05T12:00:00.000Z' });
  const reflection = { ...base, questionId: 'exp26b-u13-016-q6', questionType: 'explain' };
  store.recordQuestionView(reflection);
  store.recordReflectionSkip(reflection);
  const state = store.getState();
  assert.equal(state.events.filter(event => event.event === 'question_check').length, 0);
  assert.equal(state.events.filter(event => event.event === 'reflection_skip').length, 1);
  const row = buildPracticeInsights(state).completionRates[0];
  assert.equal(row.distinctViewIDsWithReflectionSkip, 1);
  assert.equal(row.distinctViewIDsWithCheckOrSkip, 1);
  assert.equal(row.rate, 1);
});

test('caps events and reports dropped count instead of silently sampling', () => {
  const store = createPracticeAnalyticsStore({ storage: storage(), sessionId: 'session-c', now: () => '2026-09-05T12:00:00.000Z' });
  for (let index = 0; index < MAX_ANALYTICS_EVENTS + 7; index += 1) {
    store.recordQuestionView({ ...base, questionId: `q-${index}` });
  }
  const state = store.getState();
  assert.equal(state.events.length, MAX_ANALYTICS_EVENTS);
  assert.equal(state.droppedCount, 7);
  assert.equal(state.events.at(-1).questionId, `q-${MAX_ANALYTICS_EVENTS + 6}`);
});

test('restore ignores malformed events and separates versions', () => {
  const raw = JSON.stringify({
    version: ANALYTICS_VERSION,
    sessionId: 'session-d',
    droppedCount: 4,
    events: [
      { event: 'question_view', id: 'ok', at: '2026-09-05T12:00:00.000Z', scenarioId: 's', scenarioVersion: 1, questionId: 'q' },
      { event: 'question_view', id: 'bad', at: '2026-09-05T12:00:00.000Z', scenarioId: '', scenarioVersion: 1, questionId: 'q' },
      { event: 'unknown', id: 'bad2', at: '2026-09-05T12:00:00.000Z', scenarioId: 's', scenarioVersion: 1, questionId: 'q' },
    ],
  });
  const restored = restorePracticeAnalytics(raw, { sessionId: 'fallback' });
  assert.equal(restored.version, ANALYTICS_VERSION);
  assert.equal(restored.sessionId, 'session-d');
  assert.equal(restored.events.length, 1);
  assert.equal(restored.droppedCount, 6);
  const exported = JSON.stringify(restored);
  assert.equal(exported.includes('note'), false);
  const old = restorePracticeAnalytics(JSON.stringify({ version: ANALYTICS_VERSION + 1, sessionId: 'old', events: [{ event: 'question_view' }] }), { sessionId: 'fresh' });
  assert.equal(old.events.length, 0);
  assert.equal(old.sessionId, 'fresh');
  const oversized = Array.from({ length: MAX_ANALYTICS_EVENTS + 2 }, (_, index) => ({ event: 'question_view', id: `event-${index}`, at: '2026-09-05T12:00:00.000Z', scenarioId: 's', scenarioVersion: 1, questionId: `q-${index}` }));
  const capped = restorePracticeAnalytics(JSON.stringify({ version: ANALYTICS_VERSION, sessionId: 'session-e', events: oversized }), { sessionId: 'fresh' });
  assert.equal(capped.events.length, MAX_ANALYTICS_EVENTS);
  assert.equal(capped.droppedCount, 2);
  const badTimestamp = restorePracticeAnalytics(JSON.stringify({ version: ANALYTICS_VERSION, sessionId: 'session-f', events: [{ event: 'question_view', id: 'bad-time', at: 'tomorrow', scenarioId: 's', scenarioVersion: 1, questionId: 'q' }] }), { sessionId: 'fresh' });
  assert.equal(badTimestamp.events.length, 0);
  const invalidStore = createPracticeAnalyticsStore({ storage: storage(), sessionId: 'session-g', now: () => 'tomorrow' });
  invalidStore.recordQuestionView(base);
  assert.equal(invalidStore.getState().droppedCount, 1);
  const foreign = buildPracticeInsights({ version: ANALYTICS_VERSION, sessionId: 'session-f', droppedCount: 0, events: [
    { event: 'question_view', id: 'view-1', at: '2026-09-05T12:00:00.000Z', scenarioId: 's', scenarioVersion: 1, questionId: 'q', basis: 'coaching', questionType: 'choice' },
    { event: 'question_check', id: 'check-1', at: '2026-09-05T12:00:00.000Z', scenarioId: 's', scenarioVersion: 1, questionId: 'q', basis: 'coaching', questionType: 'choice', attemptNumber: 1, retry: false, viewEventId: 'other-view' },
  ] });
  assert.equal(foreign.completionRates[0].rate, null);
  assert.equal(foreign.completionRates[0].reliable, false);
});

test('flags, reflection skips, and insight aggregations stay anonymous and exact', () => {
  const store = createPracticeAnalyticsStore({ storage: storage(), sessionId: 'session-e', now: () => '2026-09-05T12:00:00.000Z' });
  store.recordQuestionView(base);
  store.recordQuestionCheck(base);
  store.recordQuestionCheck(base);
  store.recordReflectionSkip({ ...base, questionId: 'exp26b-u13-016-q6', questionType: 'explain' });
  store.recordQuestionFlag({ ...base, category: 'Age or wording' });
  store.recordReflectionSkip({ ...base, questionType: 'choice' });
  store.recordCameraUse({ ...base, cameraAction: 'camera-full' });
  const insights = buildPracticeInsights(store.getState());
  assert.deepEqual(insights.sampleSizes, {
    views: 1, checkedAttempts: 2, retries: 1, flags: 1, reflectionSkips: 1,
    sceneChecks: 0, sceneMatches: 0, coachingChecks: 2, cameraUses: 1,
  });
  assert.equal(insights.mostRetried[0].questionId, base.questionId);
  assert.equal(insights.mostFlagged[0].category, 'Age or wording');
  assert.equal(insights.framingUsage[0].format, 'choice');
  assert.equal(insights.framingUsage[0].count, 2);
  assert.equal(insights.cameraUsage[0].action, 'camera-full');
  assert.equal(insights.completionRates[0].rate, 1);
  assert.equal(JSON.stringify(store.getState()).includes('session-e'), true);
  assert.equal(JSON.stringify(store.getState()).includes('email'), false);
});

test('exposes memory-only status when persistence fails', () => {
  const failingStorage = { getItem: () => null, setItem: () => { throw new Error('blocked'); }, removeItem: () => { throw new Error('blocked'); } };
  const store = createPracticeAnalyticsStore({ storage: failingStorage, sessionId: 'session-h' });
  assert.equal(store.getState().storageStatus, 'available');
  store.recordQuestionView(base);
  assert.equal(store.getState().storageStatus, 'memory-only');
  assert.equal(JSON.parse(store.exportJSON()).events.length, 1);
});
