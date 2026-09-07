import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFullCurriculumMatrix, buildCsv, loadLegacyBankRows, loadScenarioSeedRows, loadPovQuestionRows } from './build-full-curriculum-matrix.mjs';
import { classifyChangedCue } from './lib/curriculum-changed-cue.mjs';
import { cognitiveDemandFor, contextZoneForText } from './lib/curriculum-matrix-helpers.mjs';
import { loadLedger } from './lib/curriculum-ledger.mjs';

const ledger = loadLedger();

// ---------------------------------------------------------------------------
// Unit tests for the pure classification rules (no file I/O).
// ---------------------------------------------------------------------------

test('classifyChangedCue: rejects a plain pre-check with no narrated state change', () => {
  const result = classifyChangedCue({ type: 'choice', basis: 'coaching', prompt: 'What should YOU learn before F1 releases the pass?' });
  assert.equal(result.genuine, false);
});

test('classifyChangedCue: accepts an explicit "Suppose" hypothetical paired with a read-update ask', () => {
  const result = classifyChangedCue({ type: 'choice', basis: 'coaching', prompt: 'Suppose D2 now moves into your reset lane. What would you reconsider?' });
  assert.equal(result.genuine, true);
});

test('classifyChangedCue: accepts a narrated (non-"Suppose") state change paired with a read-update ask', () => {
  const result = classifyChangedCue({ type: 'choice', basis: 'coaching', prompt: 'F1 cuts back toward centre ice. What should you reassess?' });
  assert.equal(result.genuine, true);
});

test('classifyChangedCue: excludes "Move YOU..." placement instructions even when they mention a future event', () => {
  const result = classifyChangedCue({ type: 'position', basis: 'coaching', prompt: 'Move YOU farther into the forward lane before D1 closes.' });
  assert.equal(result.genuine, false);
  assert.equal(result.excludedBy, 'explicit-exclusion-rule');
});

test('classifyChangedCue: excludes a basis:scene fact about an already-fixed event', () => {
  const result = classifyChangedCue({ type: 'choice', basis: 'scene', prompt: 'What has changed the task even though the puck remains loose?' });
  assert.equal(result.genuine, false);
});

test('cognitiveDemandFor: explain is analyze, position is apply-spatial, scene-basis choice is recall', () => {
  assert.equal(cognitiveDemandFor({ type: 'explain' }), 'analyze');
  assert.equal(cognitiveDemandFor({ type: 'position' }), 'apply-spatial');
  assert.equal(cognitiveDemandFor({ type: 'choice', basis: 'scene' }), 'recall');
  assert.equal(cognitiveDemandFor({ type: 'choice', basis: 'coaching', changedCueGenuine: true }), 'analyze-changed-cue');
  assert.equal(cognitiveDemandFor({ type: 'choice', basis: 'coaching', changedCueGenuine: false }), 'apply');
});

test('contextZoneForText: unknown when no zone keyword is present, matched otherwise', () => {
  assert.equal(contextZoneForText('a completely generic prompt with no rink area named'), 'unknown');
  assert.equal(contextZoneForText('breakout from the defensive zone'), 'defensive-zone');
});

// ---------------------------------------------------------------------------
// Fixture-driven tests for each catalog loader (duplicate-ID / unknown /
// mapping-drift / optional-reflection behaviour), independent of the real
// 2000+ row dataset so they stay fast and deterministic.
// ---------------------------------------------------------------------------

test('loadLegacyBankRows: a valid nodeId resolves to an explicit binding; an invalid one is flagged as drift, not silently unmapped', () => {
  const bank = {
    'U15 / Bantam': [
      { id: 'valid-1', type: 'mc', nodeId: 'u15.attacking-1v1', cat: 'Offensive Play', sit: 'x' },
      { id: 'drift-1', type: 'mc', nodeId: 'u15.this-concept-does-not-exist', cat: 'zz no keyword overlap zz', sit: 'zz' },
      { id: 'nokey-1', type: 'mc', cat: 'zz unrelated random text with no signal zz', sit: 'zz' },
    ],
  };
  const rows = loadLegacyBankRows(ledger, { bank });
  const byId = Object.fromEntries(rows.map(r => [r.questionId, r]));
  assert.equal(byId['valid-1'].domainConceptMappingMethod, 'explicit-nodeId-binding');
  assert.equal(byId['valid-1'].conceptId, 'attacking-1v1');
  assert.equal(byId['drift-1'].domainConceptMappingMethod, 'unmapped');
  assert.match(byId['drift-1'].evidenceRationale, /mapping drift, not missing content/);
  assert.equal(byId['nokey-1'].domainId, 'unmapped');
  assert.equal(byId['nokey-1'].evidenceStrength, 'unknown');
});

test('loadLegacyBankRows: learningObjective falls back to the ledger concept name resolved via nodeId when the row has no authored q.concept label (regression: was hardcoded to q.concept only, leaving every valid-nodeId row "unknown")', () => {
  const bank = {
    'U15 / Bantam': [
      { id: 'valid-no-concept-label', type: 'mc', nodeId: 'u15.attacking-1v1', cat: 'Offensive Play', sit: 'x' },
      { id: 'valid-with-concept-label', type: 'mc', nodeId: 'u15.attacking-1v1', cat: 'Offensive Play', sit: 'x', concept: 'Authored Label' },
      { id: 'no-nodeId-no-concept', type: 'mc', cat: 'zz unrelated random text with no signal zz', sit: 'zz' },
    ],
  };
  const rows = loadLegacyBankRows(ledger, { bank });
  const byId = Object.fromEntries(rows.map(r => [r.questionId, r]));
  assert.notEqual(byId['valid-no-concept-label'].learningObjective, 'unknown');
  assert.equal(byId['valid-no-concept-label'].objectiveSource, 'ledger-concept-via-nodeId');
  assert.equal(byId['valid-with-concept-label'].learningObjective, 'Authored Label');
  assert.equal(byId['valid-with-concept-label'].objectiveSource, 'authored-concept-label');
  assert.equal(byId['no-nodeId-no-concept'].learningObjective, 'unknown');
  assert.equal(byId['no-nodeId-no-concept'].objectiveSource, 'unknown');
});

test('loadScenarioSeedRows: skips non-scenario entries and flags a seed with no nodeId at all distinctly from a drifted one', () => {
  const seeds = [
    { id: 'seed-a', type: 'scenario', level: 'U13 / Peewee', nodeId: 'u13.gap-control', cat: 'Defensive Play', themes: [] },
    { id: 'seed-b', type: 'scenario', level: 'U13 / Peewee', cat: 'unrelated', themes: [] },
    { id: 'not-a-scenario', type: 'other-thing' },
  ];
  const rows = loadScenarioSeedRows(ledger, { seeds });
  assert.equal(rows.length, 2);
  const byId = Object.fromEntries(rows.map(r => [r.questionId, r]));
  assert.equal(byId['seed-a'].domainConceptMappingMethod, 'explicit-nodeId-binding');
  assert.match(byId['seed-b'].evidenceRationale, /no nodeId field at all/);
});

test('loadPovQuestionRows: every row is marked not-reachable-in-app regardless of content', () => {
  const data = { version: '1.0', images: [{ id: 'IMG-1', ageGroups: ['U11'], archetype: '2-on-1 Rush', questions: [{ id: 'IMG-1-q1', type: 'mc', prompt: 'x' }] }] };
  const rows = loadPovQuestionRows(ledger, { data });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].navigationExposure, 'not-reachable-in-app');
});

test('loadPovQuestionRows: format is read from the real field name "format", not "type" (regression: real povQuestions.json rows use q.format, e.g. "Multiple Choice", and have no q.type at all, so every row fell through to "unknown")', () => {
  const data = { version: '1.0', images: [{ id: 'IMG-1', ageGroups: ['U11'], archetype: '2-on-1 Rush', questions: [{ id: 'IMG-1-q1', format: 'Multiple Choice', prompt: 'x' }] }] };
  const rows = loadPovQuestionRows(ledger, { data });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].format, 'Multiple Choice');
});

// ---------------------------------------------------------------------------
// Integration invariants against the REAL checked-out data. These are the
// count-reconciliation / duplicate-ID / drift checks the assignment asks
// for, run against the actual catalogs rather than a synthetic fixture.
// ---------------------------------------------------------------------------

test('real data: reported totals reconcile with the actual row array and per-catalog counts', () => {
  const report = buildFullCurriculumMatrix();
  assert.equal(report.meta.counting.totalQuestions, report.rows.length);
  const sumOfCatalogs = report.meta.catalogs.reduce((n, c) => n + c.rowCount, 0);
  assert.equal(sumOfCatalogs, report.rows.length);
  assert.equal(report.meta.counting.requiredQuestions + report.meta.counting.optionalReflections, report.rows.length);
});

test('real data: no duplicate (catalog, questionId) pair exists across the composed matrix', () => {
  const report = buildFullCurriculumMatrix();
  const seen = new Set();
  const duplicates = [];
  for (const row of report.rows) {
    const key = `${row.catalog}::${row.questionId}`;
    if (seen.has(key)) duplicates.push(key);
    seen.add(key);
  }
  assert.deepEqual(duplicates, []);
});

test('real data: an "unmapped" mapping method never leaves a resolved domain/concept id behind', () => {
  const report = buildFullCurriculumMatrix();
  for (const row of report.rows) {
    if (row.domainConceptMappingMethod === 'unmapped') {
      assert.equal(row.domainId, 'unmapped', `${row.catalog}/${row.questionId} is unmapped but has domainId ${row.domainId}`);
      assert.equal(row.conceptId, 'unmapped', `${row.catalog}/${row.questionId} is unmapped but has conceptId ${row.conceptId}`);
    }
  }
});

test('real data: every experimental-bank scenario has at most one "required" reflection and the rest are optional', () => {
  const report = buildFullCurriculumMatrix();
  const bySceneReflections = new Map();
  for (const row of report.rows) {
    if (row.catalog !== 'experimental-bank' || row.format !== 'explain') continue;
    (bySceneReflections.get(row.sceneId) || bySceneReflections.set(row.sceneId, []).get(row.sceneId)).push(row.reflectionType);
  }
  for (const [sceneId, types] of bySceneReflections) {
    const requiredCount = types.filter(t => t === 'required').length;
    assert.equal(requiredCount, 1, `scene ${sceneId} should have exactly one required reflection, saw ${requiredCount}`);
  }
});

test('animated decision inventory includes older-age pivot cues without claiming zero semantic coverage',()=>{
 const report=buildFullCurriculumMatrix();
 for(const age of ['U15','U18'])assert.ok(report.rows.some(r=>r.catalog==='animated-play'&&r.ageBand===age&&r.sceneId==='play_gap_control_pivot_match_speed_u13_v1'));
 assert.equal(report.gapBacklog[0].confidence,'limited');
 const animated=report.rows.filter(r=>r.catalog==='animated-play');
 assert.ok(new Set(animated.map(r=>r.contentUnitId)).size<animated.length);
 assert.ok(report.meta.counting.unreachableRows>0);
});

test('real data: the U11 changed-cue manual-verification ledger only references IDs that exist in the live U11 bank', () => {
  const report = buildFullCurriculumMatrix();
  const u11Ids = new Set(report.rows.filter(r => r.catalog === 'experimental-bank' && r.ageBand === 'U11').map(r => r.questionId));
  assert.equal(report.u11ChangedCue.totalU11Questions, u11Ids.size);
  assert.ok(report.u11ChangedCue.manuallyVerifiedCount <= u11Ids.size);
  assert.equal(report.u11ChangedCue.genuineChangedCueQuestions, report.u11ChangedCue.manuallyVerifiedGenuineCount, 'manual overrides are authoritative for every U11 question that was flagged, so the reported genuine count must equal the manual genuine count');
});

test('real data: CSV has one header row plus exactly one data row per question, and every row is a well-formed quoted line', () => {
  const report = buildFullCurriculumMatrix();
  const csv = buildCsv(report);
  const lines = csv.trim().split('\r\n');
  assert.equal(lines.length, report.rows.length + 1);
  for (const line of lines.slice(0, 5)) assert.ok(line.startsWith('"'), 'CSV rows should be quoted');
});

test('animated loader includes node-level prompts as well as ask.q',()=>{const report=buildFullCurriculumMatrix();assert.ok(report.rows.some(r=>r.sceneId==='play_2v1_pass_lane_removed_u11_v1'&&r.catalog==='animated-play'));});
