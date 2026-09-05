import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCoverageReport } from './build-curriculum-coverage.mjs';

test('curriculum coverage report keeps question volume separate from unique geometry', () => {
  const report = buildCoverageReport({
    bank: [
      {
        id: 's1', ageBand: 'U7', title: 'Small read', family: 'pickup', topic: 'Rink awareness',
        tags: ['foundation', 'scanning'], objective: 'Find the puck and a teammate.',
        setup: { actors: [{ id: 'YOU', role: 'skater', x: 1, y: 0 }], puck: { x: 1, y: 0 } },
        sources: [{ id: 'src', title: 'Example source', url: 'https://example.test/source', section: 'Skills', use: 'Context' }],
        questions: [
          { id: 's1-q1', type: 'choice', basis: 'scene', prompt: 'Who is there?' },
          { id: 's1-q2', type: 'position', basis: 'coaching', prompt: 'Where would you move?' },
        ],
      },
      {
        id: 's2', ageBand: 'U7', title: 'Same read', family: 'pickup', topic: 'Rink awareness',
        tags: ['foundation', 'scanning'], objective: 'Find the puck and a teammate.',
        setup: { actors: [{ id: 'YOU', role: 'skater', x: 1, y: 0 }], puck: { x: 1, y: 0 } },
        sources: [{ id: 'src', title: 'Example source', url: 'https://example.test/source', section: 'Skills', use: 'Context' }],
        questions: [{ id: 's2-q1', type: 'choice', basis: 'scene', prompt: 'What do you see?' }],
      },
    ],
  });
  assert.equal(report.overview.scenarios, 2);
  assert.equal(report.overview.questions, 3);
  assert.equal(report.overview.uniqueOpeningGeometry, 1);
  assert.equal(report.ageRows[0].questions, 3);
  assert.equal(report.ageRows[0].uniqueOpeningGeometry, 1);
  assert.equal(report.formatRows.find(row => row.id === 'move-player').currentQuestionCount, 1);
  assert.ok(report.qualityReviewRubric.length >= 3);
});
