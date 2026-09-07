import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

const modulePath = new URL('./inviteCode.js', import.meta.url);
const mod = existsSync(modulePath) ? await import(modulePath.href) : {};
const requireModule = () => assert.equal(typeof mod.normalizeInviteCode, 'function', 'invite codes need a pure format module');

test('normalizing accepts what a parent actually types', () => {
  requireModule();
  // Lowercase, the dash, and stray spaces all have to survive.
  assert.equal(mod.normalizeInviteCode('abcd-efgh'), 'ABCDEFGH');
  assert.equal(mod.normalizeInviteCode('ABCD EFGH'), 'ABCDEFGH');
  assert.equal(mod.normalizeInviteCode('  abcdefgh  '), 'ABCDEFGH');
  assert.equal(mod.normalizeInviteCode('ABCD--EFGH'), 'ABCDEFGH');
});

test('normalizing handles nothing gracefully rather than throwing', () => {
  assert.equal(mod.normalizeInviteCode(''), '');
  assert.equal(mod.normalizeInviteCode(null), '');
  assert.equal(mod.normalizeInviteCode(undefined), '');
});

test('the alphabet excludes characters people misread', () => {
  for (const character of ['I', 'L', 'O', '0', '1']) {
    assert.ok(!mod.INVITE_ALPHABET.includes(character), `${character} is too easily misread to be in a typed code`);
  }
});

test('format validation accepts a well-formed code and rejects the rest', () => {
  assert.equal(mod.isValidInviteFormat('ABCDEFGH'), true);
  assert.equal(mod.isValidInviteFormat('abcd-efgh'), true, 'validation normalizes first');
  assert.equal(mod.isValidInviteFormat('ABCDEFG'), false, 'too short');
  assert.equal(mod.isValidInviteFormat('ABCDEFGHI'), false, 'too long');
  assert.equal(mod.isValidInviteFormat('ABCDEFG0'), false, 'excluded character');
  assert.equal(mod.isValidInviteFormat(''), false);
  assert.equal(mod.isValidInviteFormat(null), false);
});

test('generated codes are valid, and only use the safe alphabet', () => {
  // Injected randomness keeps this deterministic.
  let counter = 0;
  const nextInt = max => (counter++ % max);
  for (let i = 0; i < 20; i += 1) {
    const code = mod.generateInviteCode(nextInt);
    assert.equal(code.length, 8);
    assert.equal(mod.isValidInviteFormat(code), true, `${code} should be valid`);
    for (const character of code) assert.ok(mod.INVITE_ALPHABET.includes(character), `${character} not in alphabet`);
  }
});

test('formatting for display groups the code so it can be read aloud', () => {
  assert.equal(mod.formatInviteCode('ABCDEFGH'), 'ABCD-EFGH');
  assert.equal(mod.formatInviteCode('abcdefgh'), 'ABCD-EFGH');
});
