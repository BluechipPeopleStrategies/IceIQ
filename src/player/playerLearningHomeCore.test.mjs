import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const output = new URL('../../node_modules/.cache/player-learning-home/core.mjs', import.meta.url);
mkdirSync(new URL('./', output), { recursive: true });
await build({ entryPoints: [fileURLToPath(new URL('./playerLearningHomeCore.js', import.meta.url))], outfile: fileURLToPath(output), bundle: true, packages: 'external', platform: 'node', format: 'esm', logLevel: 'silent' });
const { buildPlayerHomeModel, summarizeHomePractice, loadHomePractice, HOME_ACTIONS } = await import(output.href);
const { createMasteryLedger, masteryDescriptor, recordMasteryAttempt, masteryStorageKey } = await import('../one-on-one/spacedMasteryCore.js');
const ledger = JSON.parse(readFileSync(new URL('../data/curriculum-ledger.json', import.meta.url), 'utf8'));
const bank = { 'U13 / Peewee': Array.from({ length: 8 }, (_, i) => ({ id: `eligible-${i}`, conceptId: 'scanning', type: 'mc', q: `Read ${i}`, opts: ['A', 'B'], ok: 0 })), 'U9 / Novice': [{ id: 'younger-only', conceptId: 'passing', q: 'Read a pass', opts: ['A', 'B'], ok: 0 }] };

function practicedLedger() {
  let state = createMasteryLedger({ timeZone: 'America/Edmonton' });
  for (const date of ['2026-08-03', '2026-08-04', '2026-08-06', '2026-08-08', '2026-08-10']) {
    for (const source of bank['U13 / Peewee']) state = recordMasteryAttempt(state, { ...masteryDescriptor(source, { ageBand: 'U13', origin: 'existing-served' }), correct: true }, { now: `${date}T18:00:00Z` });
  }
  return JSON.stringify(state);
}

test('home preserves all six domains and uses only the selected age curriculum', () => {
  for (const ageBand of ledger.meta.ageBands) {
    const model = buildPlayerHomeModel({ player: { id: 'a', level: `${ageBand} / Name`, quizHistory: [] } });
    assert.equal(model.band, ageBand);
    assert.deepEqual(model.worlds.map(w => w.id), ledger.domains.map(d => d.id));
    assert.deepEqual(model.worlds.map(w => w.art), [0, 1, 2, 3, 4, 5]);
    assert.equal(model.missionCount, ledger.nodes.filter(n => n.ageId === ageBand).length);
    assert.equal(model.practice.status, 'unavailable');
  }
  assert.equal(buildPlayerHomeModel({ ageBand: 'invalid' }).band, 'U11');
  assert.deepEqual(HOME_ACTIONS.map(a => a.id), ['learn', 'practice', 'experimental', 'goals', 'training', 'progress']);
});

test('summary reads actual current question evidence and excludes experimental and other ages', () => {
  const state = summarizeHomePractice({ playerId: 'a', ageBand: 'U13', bank: { ...bank, 'U18 / Midget': bank['U13 / Peewee'], U13: [{ id: 'exp26-u13-001', conceptId: 'shooting', type: 'mc', experimental: true }] }, rawLedger: practicedLedger() });
  const model = buildPlayerHomeModel({ player: { id: 'a' }, ageBand: 'U13', masteryState: state });
  assert.equal(state.status, 'ready');
  assert.equal(model.practice.groupsPractised, 1);
  assert.equal(model.practice.requirementsMet, 1);
  assert.equal(model.practice.availableGroups, 1);
  assert.ok(state.summary.groups.every(g => g.ageBand === 'U13' && g.concept !== 'shooting'));
  const changed = summarizeHomePractice({ playerId: 'a', ageBand: 'U13', bank: { 'U13 / Peewee': bank['U13 / Peewee'].map(q => ({ ...q, q: 'Changed wording' })) }, rawLedger: practicedLedger() });
  assert.equal(buildPlayerHomeModel({ player: { id: 'a' }, ageBand: 'U13', masteryState: changed }).practice.requirementsMet, 0);
});

test('late results from another player or age never become visible progress', () => {
  const state = summarizeHomePractice({ playerId: 'a', ageBand: 'U13', bank, rawLedger: practicedLedger() });
  assert.equal(buildPlayerHomeModel({ player: { id: 'b' }, ageBand: 'U13', masteryState: state }).practice.status, 'loading');
  assert.equal(buildPlayerHomeModel({ player: { id: 'a' }, ageBand: 'U9', masteryState: state }).practice.status, 'loading');
  assert.equal(buildPlayerHomeModel({ player: { id: 'a', quizHistory: [{}, {}] }, ageBand: 'U13' }).historySessions, 2);
});

test('loading reads only the requested player ledger and keeps unavailable distinct from empty', async () => {
  const keys = [];
  const state = await loadHomePractice({ playerId: 'a', ageBand: 'U13', loadBank: async () => bank, readStorage: key => { keys.push(key); return practicedLedger(); } });
  assert.deepEqual(keys, [masteryStorageKey('a')]);
  assert.equal(state.status, 'ready');
  const empty = await loadHomePractice({ playerId: 'b', ageBand: 'U9', loadBank: async () => bank, readStorage: () => null });
  assert.equal(empty.status, 'ready');
  assert.equal(empty.summary.mastered, 0);
  const blocked = await loadHomePractice({ playerId: 'b', ageBand: 'U9', loadBank: async () => bank, readStorage: () => { throw Error('Unavailable'); } });
  assert.equal(blocked.status, 'unavailable');
  const malformed = await loadHomePractice({ playerId: 'b', ageBand: 'U9', loadBank: async () => bank, readStorage: () => '{' });
  assert.equal(malformed.status, 'unavailable');
});
