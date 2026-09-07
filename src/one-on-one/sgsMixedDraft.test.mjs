import test from 'node:test';
import assert from 'node:assert/strict';
import { createMixedDraft, restoreMixedDraft, mixedStorageKey, mixedSeedKey, mixedArchiveKey, archiveMixedDraft, startMixedDraft, nextMixedSeed, recordMixedObservation, moveMixedPlayer, submitMixedPosition } from './sgsMixedDraft.js';
import { comprehensionReadContext, questionForRead } from './sgsComprehensionCore.js';
import { advancePositioningPlayback } from './positioningSequenceCore.js';

const candidateId = 'positioning-1v1-009-v1';
function observed(draft) {
  const context = comprehensionReadContext(draft.positioning.session, draft.positioning.session.readIndex);
  const question = questionForRead({ attempt: draft.comprehension, readIndex: draft.positioning.session.readIndex, ...context });
  return recordMixedObservation(draft, { response: question.options[0].value ?? question.options[0].id, inputMethod: 'button' });
}
test('a mixed attempt owns one atomic namespace with stable identity and mode', () => {
  const draft = createMixedDraft({ candidateId, seed: 42, mode: 'challenge' });
  assert.deepEqual(restoreMixedDraft(JSON.stringify(draft), candidateId), draft);
  assert.equal(draft.comprehension.seed, 42);
  assert.equal(draft.comprehension.mode, 'challenge');
  assert.notEqual(mixedStorageKey('a:b', candidateId), mixedStorageKey('a', candidateId));
  assert.match(mixedStorageKey('a', candidateId), /^rinkreads_sgs_mixed_v1:/);
  assert.match(mixedSeedKey('a'), /^rinkreads_sgs_mixed_seed_v1:/);
  assert.equal(restoreMixedDraft(draft, 'positioning-2v2-001-v1'), null);
});
test('observing cannot place or advance a player and placement requires the observation', () => {
  const opening = createMixedDraft({ candidateId, seed: 0, mode: 'learning' });
  assert.throws(() => moveMixedPlayer(opening, { x: 27, y: -6 }), /observation/i);
  assert.throws(() => submitMixedPosition(opening), /observation/i);
  const next = observed(opening);
  assert.deepEqual(next.positioning, opening.positioning);
  assert.equal(next.comprehension.records.length, 1);
  assert.deepEqual(restoreMixedDraft(next, candidateId), next);
  assert.throws(() => observed(next), /once|order|already/i);
});
test('restore rejects skipped observations, extra keys and copied observations from another seed', () => {
  let draft = observed(createMixedDraft({ candidateId, seed: 0, mode: 'challenge' }));
  draft = moveMixedPlayer(draft, { x: 27, y: -6 });
  draft.positioning.reason = 'Leave room to match the carrier.';
  const submitted = submitMixedPosition(draft);
  assert.equal(submitted.positioning.session.phase, 'playback');
  const restored = restoreMixedDraft(submitted, candidateId);
  assert.equal(restored.positioning.paused, true);
  assert.deepEqual(restored.positioning.session, submitted.positioning.session);
  const skipped = structuredClone(submitted); skipped.comprehension.records = [];
  assert.equal(restoreMixedDraft(skipped, candidateId), null);
  assert.equal(restoreMixedDraft({ ...draft, extra: true }, candidateId), null);
  const changedSeed = structuredClone(draft); changedSeed.comprehension.seed = 6;
  assert.equal(restoreMixedDraft(changedSeed, candidateId), null);
  const unobservedMove = createMixedDraft({ candidateId, seed: 1, mode: 'challenge' });
  unobservedMove.positioning.session.point = { x: 27, y: -6 };
  assert.equal(restoreMixedDraft(unobservedMove, candidateId), null);
});
test('all three observations remain bound to their entry freezes after every placement', () => {
  let draft = createMixedDraft({ candidateId, seed: 3, mode: 'challenge' });
  for (let read = 0; read < 3; read++) {
    draft = observed(draft);
    draft = moveMixedPlayer(draft, { x: 27, y: -6 });
    draft.positioning.reason = `Read ${read + 1}: I can see the puck.`;
    draft = submitMixedPosition(draft);
    assert.ok(restoreMixedDraft(draft, candidateId));
    if (read < 2) draft.positioning.session = advancePositioningPlayback(draft.positioning.session, 1);
  }
  const restored = restoreMixedDraft(JSON.stringify(draft), candidateId);
  assert.equal(restored.positioning.session.phase, 'complete');
  assert.equal(restored.comprehension.records.length, 3);
  assert.deepEqual(restored.positioning.session.answers.map(x => x.beforeState), restored.comprehension.records.map(x => x.beforeState));
});
test('delivery seeds advance per player, recover malformed counters, and never wrap silently', () => {
  assert.equal(nextMixedSeed(null), 0);
  assert.equal(nextMixedSeed('0'), 1);
  assert.equal(nextMixedSeed('12', 20), 21);
  assert.equal(nextMixedSeed('not a counter', 5), 6);
  assert.equal(nextMixedSeed('-1'), 0);
  assert.throws(() => nextMixedSeed('4294967295'), /limit/i);
});
test('archived attempts are immutable and replacement fails when the archive cannot save', () => {
  const draft = observed(createMixedDraft({ candidateId, seed: 0, mode: 'learning' })), saved = new Map();
  const storage = { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) };
  const key = archiveMixedDraft(storage, 'kid', draft);
  assert.equal(key, mixedArchiveKey('kid', draft.comprehension.attemptId));
  assert.equal(saved.get(key), JSON.stringify(draft));
  assert.equal(archiveMixedDraft(storage, 'kid', draft), key);
  const changed = structuredClone(draft); changed.positioning.reason = 'A changed attempt';
  assert.throws(() => archiveMixedDraft(storage, 'kid', changed), /different saved record/);
  assert.equal(saved.get(key), JSON.stringify(draft));
  assert.throws(() => archiveMixedDraft({ getItem: () => null, setItem: () => { throw new Error('quota'); } }, 'kid', draft), /quota/);
});

test('failed active replacement rolls back only its new archive, then the original can continue and start again', () => {
  const player = 'transaction', original = createMixedDraft({ candidateId, seed: 0, mode: 'learning' });
  const activeKey = mixedStorageKey(player, candidateId), seedKey = mixedSeedKey(player), archiveKey = mixedArchiveKey(player, original.comprehension.attemptId);
  const unrelated = 'rinkreads_sgs_mixed_archive_v1:someone:previous';
  const saved = new Map([[activeKey, JSON.stringify(original)], [seedKey, '0'], [unrelated, 'existing archive bytes']]);
  let fail = true;
  const storage = { getItem: key => saved.get(key) ?? null, removeItem: key => saved.delete(key), setItem(key, value) { if (fail && key === activeKey && JSON.parse(value).comprehension.seed === 1) throw new Error('Quota'); saved.set(key, value); } };
  assert.throws(() => startMixedDraft(storage, player, { candidateId, mode: 'challenge', previousDraft: original }), /new mix could not be saved/i);
  assert.equal(saved.get(activeKey), JSON.stringify(original));
  assert.equal(saved.has(archiveKey), false);
  assert.equal(saved.get(seedKey), '0');
  assert.equal(saved.get(unrelated), 'existing archive bytes');
  const continued = observed(original); saved.set(activeKey, JSON.stringify(continued)); fail = false;
  const result = startMixedDraft(storage, player, { candidateId, mode: 'challenge', previousDraft: continued });
  assert.equal(result.draft.comprehension.seed, 1);
  assert.equal(result.counterSaved, true);
  assert.equal(saved.get(activeKey), JSON.stringify(result.draft));
  assert.equal(saved.get(archiveKey), JSON.stringify(continued));
  assert.equal(saved.get(seedKey), '1');
});

test('failed replacement retains pre-existing archives and reports a rollback failure without unsafe overwrite', () => {
  const player = 'rollback', original = createMixedDraft({ candidateId, seed: 0, mode: 'learning' });
  const activeKey = mixedStorageKey(player, candidateId), archiveKey = mixedArchiveKey(player, original.comprehension.attemptId), bytes = JSON.stringify(original);
  for (const alreadyArchived of [true, false]) {
    const saved = new Map([[activeKey, bytes], ...(alreadyArchived ? [[archiveKey, bytes]] : [])]);
    const storage = { getItem: key => saved.get(key) ?? null, removeItem() { throw new Error('Cannot remove'); }, setItem(key, value) { if (key === activeKey) throw new Error('Quota'); saved.set(key, value); } };
    assert.throws(() => startMixedDraft(storage, player, { candidateId, mode: 'learning', previousDraft: original }), alreadyArchived ? /new mix could not be saved/i : /could not be fully restored/i);
    assert.equal(saved.get(activeKey), bytes);
    assert.equal(saved.get(archiveKey), bytes);
  }
});

test('active replacement is verified before the counter advances, and a failed counter recovers from the saved seed', () => {
  const player = 'counter', saved = new Map(), seedKey = mixedSeedKey(player);
  let failCounter = true;
  const storage = { getItem: key => saved.get(key) ?? null, removeItem: key => saved.delete(key), setItem(key, value) { if (key === seedKey && failCounter) throw new Error('Counter blocked'); saved.set(key, value); } };
  const first = startMixedDraft(storage, player, { candidateId, mode: 'learning' });
  assert.equal(first.draft.comprehension.seed, 0); assert.equal(first.counterSaved, false);
  assert.equal(saved.get(mixedStorageKey(player, candidateId)), JSON.stringify(first.draft));
  const second = startMixedDraft(storage, player, { candidateId, mode: 'learning', previousDraft: first.draft });
  assert.equal(second.draft.comprehension.seed, 1); assert.equal(second.counterSaved, false);
  failCounter = false;
  const third = startMixedDraft(storage, player, { candidateId, mode: 'learning', previousDraft: second.draft });
  assert.equal(third.draft.comprehension.seed, 2); assert.equal(saved.get(seedKey), '2');
});

test('a failed write cannot overwrite an independently changed active draft or delete its recovery archive', () => {
  const player = 'changed', original = createMixedDraft({ candidateId, seed: 0, mode: 'learning' });
  const activeKey = mixedStorageKey(player, candidateId), archiveKey = mixedArchiveKey(player, original.comprehension.attemptId);
  const externalBytes = JSON.stringify(createMixedDraft({ candidateId, seed: 9, mode: 'challenge' }));
  const saved = new Map([[activeKey, JSON.stringify(original)]]);
  const storage = { getItem: key => saved.get(key) ?? null, removeItem: key => saved.delete(key), setItem(key, value) { if (key === activeKey) { saved.set(key, externalBytes); throw new Error('Interrupted write'); } saved.set(key, value); } };
  assert.throws(() => startMixedDraft(storage, player, { candidateId, mode: 'learning', previousDraft: original }), /could not be fully restored/i);
  assert.equal(saved.get(activeKey), externalBytes);
  assert.equal(saved.get(archiveKey), JSON.stringify(original));
});

test('failed active readback restores the exact original bytes after our write succeeded', () => {
  const player = 'readback', original = observed(createMixedDraft({ candidateId, seed: 0, mode: 'learning' }));
  const activeKey = mixedStorageKey(player, candidateId), archiveKey = mixedArchiveKey(player, original.comprehension.attemptId), bytes = JSON.stringify(original);
  const saved = new Map([[activeKey, bytes]]); let rejectRead = false;
  const storage = { getItem(key) { if (key === activeKey && rejectRead) { rejectRead = false; throw new Error('Readback failed'); } return saved.get(key) ?? null; }, removeItem: key => saved.delete(key), setItem(key, value) { saved.set(key, value); if (key === activeKey && value !== bytes) rejectRead = true; } };
  assert.throws(() => startMixedDraft(storage, player, { candidateId, mode: 'learning', previousDraft: original }), /new mix could not be saved/i);
  assert.equal(saved.get(activeKey), bytes);
  assert.equal(saved.has(archiveKey), false);
});
