import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createPositioningSession, movePositioningPlayer, submitPositioningRead,
  advancePositioningPlayback, positioningState,
} from './positioningSequenceCore.js';

let core = {};
try { core = await import('./sgsComprehensionCore.js'); } catch {}
const candidateId = 'positioning-3v3-001-v1';
const clone = value => structuredClone(value);

test('the first six mixes vary factual families and later reads use the actual changed cue', () => {
  const session = contextThrough(2), openings = new Set(), changed = new Set();
  for (let seed = 0; seed < 6; seed++) {
    const attempt = core.createComprehensionAttempt({ candidateId, seed, mode: 'learning' });
    openings.add(question(attempt, session, 0).question.variantId);
    for (const readIndex of [1, 2]) {
      const variant = question(attempt, session, readIndex).question.variantId;
      assert.ok(['carried-puck', 'received-puck', 'carrier-net-distance', 'focus-carrier-distance'].includes(variant));
      changed.add(variant);
    }
  }
  assert.equal(openings.size, 3);
  assert.ok(changed.has('carried-puck') && changed.has('received-puck'));
});
function contextThrough(reads = 0, complete = false) {
  let session = createPositioningSession(candidateId);
  for (let index = 0; index < reads; index++) {
    session = submitPositioningRead(movePositioningPlayer(session, { x: 5, y: -7 }), 'I am watching the puck.');
    if (session.phase === 'playback') session = advancePositioningPlayback(session, 1);
  }
  if (complete && session.phase !== 'complete') session = submitPositioningRead(movePositioningPlayer(session, { x: 5, y: -7 }), 'I can see the new carrier.');
  return session;
}
function question(attempt, session, readIndex) {
  const context = core.comprehensionReadContext(session, readIndex);
  return { ...context, question: core.questionForRead({ attempt, readIndex, ...context }) };
}
function answer(attempt, session, readIndex, response) {
  const context = question(attempt, session, readIndex);
  const choice = response === undefined ? (context.question.format === 'tf' ? true : context.question.options[0].id) : response;
  return core.recordComprehensionAnswer(attempt, { ...context, readIndex, response: choice, inputMethod: 'button', reason: 'I looked at the players.' });
}

test('SGS comprehension is deterministic, rotates all three formats and offers multiple variants within each', () => {
  assert.equal(typeof core.createComprehensionAttempt, 'function', 'The factual comprehension sidecar must exist.');
  const session = contextThrough(2), variants = new Map();
  for (let seed = 0; seed < 72; seed++) {
    const attempt = core.createComprehensionAttempt({ candidateId, seed, mode: 'learning' });
    assert.deepEqual(attempt, core.createComprehensionAttempt({ candidateId, seed, mode: 'learning' }));
    const forms = [];
    for (let index = 0; index < 3; index++) {
      const q = question(attempt, session, index).question;
      assert.deepEqual(q, question(attempt, session, index).question);
      forms.push(q.format);
      if (!variants.has(q.format)) variants.set(q.format, new Set());
      variants.get(q.format).add(q.variantId);
      assert.equal('correctAnswer' in q || 'expectedResponse' in q || 'feedback' in q, false);
      assert.ok(q.sourceRefs.every(ref => ref.note.startsWith('docs/')));
    }
    assert.equal(new Set(forms).size, 3);
  }
  for (const format of ['actor-tap', 'mc', 'tf']) assert.ok(variants.get(format)?.size >= 3, `${format} needs actual content variants.`);
});

test('answering and feedback never mutate positions, possession, supplied objects or old sessions', () => {
  const session = contextThrough(0), before = JSON.stringify(session);
  const attempt = core.createComprehensionAttempt({ candidateId, seed: 0, mode: 'learning' }), original = clone(attempt);
  const context = question(attempt, session, 0), untouched = clone(context);
  const saved = core.recordComprehensionAnswer(attempt, { ...context, readIndex: 0, response: context.question.options[0].id, inputMethod: 'rink-tap', reason: '  I can see the puck.  ' });
  assert.deepEqual(attempt, original);
  assert.deepEqual(context, untouched);
  assert.equal(JSON.stringify(session), before);
  assert.equal(saved.records[0].reason, 'I can see the puck.');
  assert.deepEqual(saved.records[0].beforeState, positioningState(session));
  assert.deepEqual(core.restoreComprehensionAttempt(JSON.stringify(saved), { positioningSession: session }), saved);
  assert.deepEqual(core.comprehensionFeedback(saved, { positioningSession: session }), { available: false, results: [] });
  const submitted = submitPositioningRead(movePositioningPlayer(session, { x: 5, y: -7 }), 'I am watching the puck.');
  assert.equal(core.comprehensionFeedback(saved, { positioningSession: submitted }).available, true);
  assert.equal(JSON.stringify(session), before);
});

test('true/false responses are booleans and unknown option IDs or input methods are rejected', () => {
  const session = contextThrough(0);
  const attempt = core.createComprehensionAttempt({ candidateId, seed: 4, mode: 'learning' });
  const context = question(attempt, session, 0);
  assert.equal(context.question.format, 'tf');
  assert.deepEqual(context.question.options.map(option => option.value).sort(), [false, true]);
  for (const response of ['true', 'false', 1, null]) {
    assert.throws(() => core.recordComprehensionAnswer(attempt, { ...context, readIndex: 0, response, inputMethod: 'button' }), /boolean/i);
  }
  assert.throws(() => core.recordComprehensionAnswer(attempt, { ...context, readIndex: 0, response: true, inputMethod: 'telepathy' }), /input/i);
  const tapAttempt = core.createComprehensionAttempt({ candidateId, seed: 0, mode: 'learning' });
  assert.throws(() => answer(tapAttempt, session, 0, 'NOT-A-PLAYER'), /option|response/i);
});

test('challenge withholds all per-question results until the real positioning play is complete', () => {
  let session = contextThrough(0);
  let attempt = core.createComprehensionAttempt({ candidateId, seed: 0, mode: 'challenge' });
  attempt = answer(attempt, session, 0);
  assert.deepEqual(core.comprehensionFeedback(attempt, { positioningSession: session }), { available: false, results: [] });
  session = contextThrough(1); attempt = answer(attempt, session, 1);
  session = contextThrough(2); attempt = answer(attempt, session, 2);
  assert.deepEqual(core.comprehensionFeedback(attempt, { positioningSession: session }), { available: false, results: [] });
  session = contextThrough(2, true);
  const feedback = core.comprehensionFeedback(attempt, { positioningSession: session });
  assert.equal(feedback.available, true);
  assert.equal(feedback.results.length, 3);
  assert.ok(feedback.results.every(result => typeof result.matchesFact === 'boolean' && result.feedback));
});

test('read freeze uses actual prior placements and switches possession to the actual receiver only after the pass', () => {
  const session = contextThrough(2);
  const context = core.comprehensionReadContext(session, 2);
  assert.equal(context.state.puck.owner, 'F3');
  assert.equal(context.previousState.puck.owner, 'F1');
  assert.deepEqual(context.state.actors.find(actor => actor.id === 'F2'), positioningState(session).actors.find(actor => actor.id === 'F2'));
  let receiverQuestion;
  for (let seed = 0; seed < 72; seed++) {
    const attempt = core.createComprehensionAttempt({ candidateId, seed, mode: 'learning' });
    const q = question(attempt, session, 2).question;
    if (q.variantId === 'received-puck') { receiverQuestion = q; break; }
  }
  assert.ok(receiverQuestion, 'Receiving-player identification must be available after this real pass.');
  assert.match(receiverQuestion.prompt, /received|has the puck/i);
  let partial = contextThrough(1);
  partial = submitPositioningRead(movePositioningPlayer(partial, { x: 5, y: -7 }), 'I stay available.');
  partial = advancePositioningPlayback(partial, .5);
  assert.equal(positioningState(partial).puck.owner, null);
  assert.throws(() => core.comprehensionReadContext(partial, 2), /reached|available/i);
});

test('restore rejects changed states, answer payloads, prompts, candidate identities, modes and duplicated reads', () => {
  const session = contextThrough(0);
  let attempt = core.createComprehensionAttempt({ candidateId, seed: 0, mode: 'learning' });
  attempt = answer(attempt, session, 0);
  const changes = [
    value => { value.records[0].beforeState.puck.owner = 'D1'; },
    value => { value.records[0].beforeState.actors[0].x += .2; },
    value => { value.records[0].response = 'INVENTED'; },
    value => { value.records[0].question.prompt = 'A different question'; },
    value => { value.candidateId = 'positioning-2v2-001-v1'; },
    value => { value.mode = 'challenge'; },
    value => { value.records.push(clone(value.records[0])); },
    value => { value.records[0].correct = true; },
  ];
  for (const mutate of changes) {
    const corrupted = clone(attempt); mutate(corrupted);
    assert.equal(core.restoreComprehensionAttempt(corrupted, { positioningSession: session }), null);
  }
  assert.throws(() => answer(attempt, session, 0), /order|already/i);
  assert.throws(() => core.createComprehensionAttempt({ candidateId: 'unknown', seed: 0, mode: 'learning' }), /candidate/i);
});

test('comparative questions bind both visited freezes and declare a display tolerance rather than tactical grading', () => {
  const session = contextThrough(2);
  let found;
  for (let seed = 0; seed < 72; seed++) {
    const attempt = core.createComprehensionAttempt({ candidateId, seed, mode: 'learning' });
    const q = question(attempt, session, 1).question;
    if (q.variantId === 'carrier-net-distance') { found = q; break; }
  }
  assert.ok(found);
  assert.equal(found.observationTolerance.unit, 'metres');
  assert.equal(found.observationTolerance.value, .5);
  assert.match(found.evidenceBoundary, /not.*tactical|not.*position/i);
  let attempt = core.createComprehensionAttempt({ candidateId, seed: 0, mode: 'learning' });
  attempt = answer(attempt, session, 0);
  const context = question(attempt, session, 1);
  context.previousState.actors[0].x += 1;
  assert.throws(() => core.recordComprehensionAnswer(attempt, { ...context, readIndex: 1, response: context.question.options[0].id, inputMethod: 'button' }), /order|freeze|question/i);
  context.question = core.questionForRead({ attempt, readIndex: 1, ...context });
  const inventedHistory = core.recordComprehensionAnswer(attempt, { ...context, readIndex: 1, response: context.question.options[0].id, inputMethod: 'button' });
  assert.equal(core.restoreComprehensionAttempt(inventedHistory, { positioningSession: session }), null, 'Even a re-authored question cannot replace the actual visited prior freeze.');
});

test('Learning releases only completed reads and comparative wording stays grammatical', () => {
  const beforePosition = contextThrough(1);
  let attempt = core.createComprehensionAttempt({ candidateId, seed: 0, mode: 'learning' });
  attempt = answer(attempt, beforePosition, 0);
  attempt = answer(attempt, beforePosition, 1);
  assert.equal(core.comprehensionFeedback(attempt, { positioningSession: beforePosition }).results.length, 1);
  const afterPosition = submitPositioningRead(movePositioningPlayer(beforePosition, { x: 5, y: -7 }), 'I remain available.');
  assert.equal(core.comprehensionFeedback(attempt, { positioningSession: afterPosition }).results.length, 2);
  for (let seed = 0; seed < 72; seed++) {
    const variant = core.createComprehensionAttempt({ candidateId, seed, mode: 'learning' });
    const q = question(variant, beforePosition, 1).question;
    assert.doesNotMatch(q.prompt, /closer from|same distance[^.]*than/);
  }
});

test('every applicable true/false fact can yield either truth value across delivery variants', () => {
  const session = contextThrough(2, true), outcomes = new Map();
  for (let seed = 0; seed < 144; seed++) {
    let attempt = core.createComprehensionAttempt({ candidateId, seed, mode: 'learning' });
    for (let readIndex = 0; readIndex < 3; readIndex++) attempt = answer(attempt, session, readIndex);
    const feedback = core.comprehensionFeedback(attempt, { positioningSession: session });
    for (const record of attempt.records.filter(record => record.question.format === 'tf')) {
      const fact = record.question.variantId;
      if (!outcomes.has(fact)) outcomes.set(fact, new Set());
      outcomes.get(fact).add(feedback.results.find(result => result.readIndex === record.readIndex).expectedResponse);
    }
  }
  for (const fact of ['current-carrier', 'focus-player', 'goalkeeper', 'carried-puck', 'received-puck', 'carrier-net-distance', 'focus-carrier-distance']) {
    assert.deepEqual([...(outcomes.get(fact) || [])].sort(), [false, true], `${fact} must not train a fixed True or False answer.`);
  }
});
