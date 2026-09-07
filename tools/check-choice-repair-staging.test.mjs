import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { questionContentHash } from './question-batch-core.mjs';
import { composeSceneCandidates, exactApplication, reviewHeld, selectLatestRevisions, validateFrozenBytes, validateStagedChange } from './check-choice-repair-staging.mjs';

function scene(prompt = 'Old prompt') {
  return { id: 'exp26-u13-test', version: 2, ageBand: 'U13', title: 'Test', family: 'test', topic: 'Test', objective: 'Read the cue.', briefing: 'Static test scene.', setup: { actors: [{ id: 'h1', label: 'YOU', team: 'home', role: 'skater', x: 0, y: 0, facing: 0 }], puck: { owner: 'h1', x: 0, y: 0 } }, focusActorId: 'h1', cues: ['Read the cue.'], tags: ['test'], limits: 'Static.', sources: [{ id: 'src', title: 'Test', url: 'https://example.com/test', section: 'Test', use: 'Test.' }], questions: [{ id: 'exp26-u13-test-q1', type: 'choice', prompt, options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }], answer: ['a'], basis: 'coaching', explanation: 'Read the cue.' }] };
}

function fixture() {
  const before = scene();
  const after = structuredClone(before); after.version = 3; after.questions[0].prompt = 'New prompt';
  const expected = { scenarioId: before.id, questionId: before.questions[0].id, scenarioVersion: 2, contentHash: questionContentHash(before, before.questions[0]) };
  return { before, after, expected, change: { scenarioId: before.id, questionId: before.questions[0].id, fromVersion: 2, toVersion: 3, beforeHash: expected.contentHash, afterHash: questionContentHash(after, after.questions[0]), before: before.questions[0], beforeScene: before, afterScene: after } };
}

test('accepts an exact before/after scene change', () => {
  const f = fixture(); assert.deepEqual(validateStagedChange({ change: f.change, expected: f.expected, currentScene: f.before }), { ok: true, errors: [] });
});

test('rejects a stale before hash', () => {
  const f = fixture(); f.change.beforeHash = 'stale'; assert.match(validateStagedChange({ change: f.change, expected: f.expected, currentScene: f.before }).errors.join(' '), /before (?:version\/hash|snapshot)/);
});

test('rejects metadata changes outside version/questions', () => {
  const f = fixture(); f.after.topic = 'Changed'; assert.match(validateStagedChange({ change: f.change, expected: f.expected, currentScene: f.before }).errors.join(' '), /metadata/);
});

test('rejects an after hash that does not match the after snapshot', () => {
  const f = fixture(); f.change.afterHash = 'forged'; assert.match(validateStagedChange({ change: f.change, expected: f.expected, currentScene: f.before }).errors.join(' '), /after snapshot question hash/);
});

test('selects highest revision and marks older packet revision historical', () => {
  const rows = selectLatestRevisions(['packet-02-r1/candidates.json', 'packet-02-r2/candidates.json', 'packet-03-r1/candidates.json']);
  assert.equal(rows.find(r => r.file.includes('packet-02-r1')).historical, true);
  assert.equal(rows.find(r => r.file.includes('packet-02-r2')).historical, false);
  assert.equal(rows.find(r => r.file.includes('packet-03-r1')).historical, false);
});

test('validates canonical FREEZE.json candidateSha256 against raw candidate bytes', () => {
  const bytes = Buffer.from('{"changes":[]}');
  const hash = createHash('sha256').update(bytes).digest('hex');
  assert.equal(validateFrozenBytes(bytes, { candidateSha256: hash }).ok, true);
  assert.equal(validateFrozenBytes(bytes, { candidateSha256: 'old' }).ok, false);
});

test('requires distinct independent and root approval for the exact after hash', () => {
  const f = fixture();
  const approved = { ...f.change, independentReviews: [{ reviewer: 'independent', verdict: 'approve', contentHash: f.change.afterHash }], rootReviews: [{ reviewer: 'root', verdict: 'approve', contentHash: f.change.afterHash }] };
  assert.equal(reviewHeld(approved), false);
  assert.equal(reviewHeld({ ...approved, rootReviews: [] }), true);
  assert.equal(reviewHeld({ ...approved, rootReviews: [{ reviewer: 'independent', verdict: 'approve', contentHash: f.change.afterHash }] }), true);
});

test('counts applied only with exact current after hash and matching application receipt', () => {
  const f = fixture();
  const receipt = { changes: [{ scenarioId: f.change.scenarioId, questionId: f.change.questionId, fromVersion: 2, toVersion: 3, afterHash: f.change.afterHash }] };
  assert.equal(exactApplication({ candidate: f.change, currentScene: f.after, receipt }), true);
  const drifted = structuredClone(f.after); drifted.questions[0].prompt = 'Unrelated drift';
  assert.equal(exactApplication({ candidate: f.change, currentScene: drifted, receipt }), false);
  const expectedScene = structuredClone(f.after);
  expectedScene.questions.push({ id: 'exp26-u13-test-q2', type: 'choice', prompt: 'Stable sibling', options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }], answer: ['a'], basis: 'coaching', explanation: 'Read.' });
  const candidateWithSibling = { ...f.change, afterScene: expectedScene };
  const bankWithUnrelatedDrift = structuredClone(expectedScene); bankWithUnrelatedDrift.questions[1].prompt = 'Unrelated bank drift';
  assert.equal(exactApplication({ candidate: candidateWithSibling, currentScene: bankWithUnrelatedDrift, receipt }), false);
  assert.equal(exactApplication({ candidate: f.change, currentScene: f.after, receipt: null }), false);
});

test('composes two changed questions in one scene without rejecting the sibling change', () => {
  const f = fixture();
  const second = structuredClone(f.after); second.questions.push({ id: 'exp26-u13-test-q2', type: 'choice', prompt: 'Second', options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }], answer: ['a'], basis: 'coaching', explanation: 'Read.' });
  const base = structuredClone(f.before); base.questions.push(structuredClone(second.questions[1]));
  const first = { ...f.change, beforeScene: base, afterScene: second };
  const secondAfter = structuredClone(base); secondAfter.version = 3; secondAfter.questions[1].prompt = 'Second changed';
  const secondChange = { scenarioId: base.id, questionId: base.questions[1].id, fromVersion: 2, toVersion: 3, afterScene: secondAfter };
  const composed = composeSceneCandidates(base, [first, secondChange]);
  assert.deepEqual(composed.errors, []);
  assert.equal(composed.scene.questions[0].prompt, 'New prompt');
  assert.equal(composed.scene.questions[1].prompt, 'Second changed');
});
