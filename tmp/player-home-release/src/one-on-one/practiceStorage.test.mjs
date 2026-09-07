import test from 'node:test';
import assert from 'node:assert/strict';
import { practiceStorageKey, readPracticeValue } from './practiceStorage.js';

test('old device drafts remain available only to preview; player libraries stay separate', () => {
  const values = new Map([['drafts', 'old device draft'], ['drafts:player-a', 'A draft'], ['drafts:player-b', 'B draft']]);
  const storage = { getItem: key => values.get(key) ?? null };
  assert.equal(readPracticeValue(storage, 'drafts'), 'old device draft');
  assert.equal(readPracticeValue(storage, 'drafts', 'player-a'), 'A draft');
  assert.equal(readPracticeValue(storage, 'drafts', 'player-b'), 'B draft');
  assert.equal(readPracticeValue(storage, 'drafts', 'new-player'), null);
  values.set(practiceStorageKey('drafts'), 'new preview draft');
  assert.equal(readPracticeValue(storage, 'drafts'), 'new preview draft');
});
