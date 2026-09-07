import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sampleDraft } from './director.js';

const examples = JSON.parse(readFileSync(new URL('./coach-question-examples.json', import.meta.url)));

// A goal-side defender must be able to see the threat described by the lesson.
// Test canonical data, so changing a camera or mirroring art cannot conceal it.
for (const [id, snapshots, targetId] of [
  ['coach-example-u9-angle-wide', ['initialDraft', 'referenceDraft'], 'away-skater-1'],
  ['coach-example-u11-gap-inside', ['initialDraft', 'referenceDraft'], 'away-skater-1'],
  ['coach-example-u13-backcheck-inside', ['referenceDraft'], 'away-skater-2'],
  ['coach-example-u18-backcheck-next-defender', ['referenceDraft'], 'away-skater-1'],
]) {
  test(`${id}: goal-side YOU faces the assigned threat`, () => {
    const question = examples.find(item => item.id === id);
    for (const snapshot of snapshots) {
      const { actors } = sampleDraft(question[snapshot], 0);
      const defender = actors.find(actor => actor.label === 'YOU');
      const threat = actors.find(actor => actor.id === targetId);
      assert.ok(defender.x < threat.x, `${snapshot}: goal-side of threat`);
      const dx = threat.x - defender.x, dy = threat.y - defender.y;
      const alignment = (Math.cos(defender.facing) * dx + Math.sin(defender.facing) * dy) / Math.hypot(dx, dy);
      assert.ok(alignment > .98, `${snapshot}: facing the threat, alignment=${alignment}`);
    }
  });
}

test('recovering backcheck starts still face the direction of recovery', () => {
  for (const id of ['coach-example-u13-backcheck-inside', 'coach-example-u18-backcheck-next-defender']) {
    const { actors } = sampleDraft(examples.find(item => item.id === id).initialDraft, 0);
    const learner = actors.find(actor => actor.label === 'YOU');
    assert.equal(learner.facing, Math.PI);
  }
});
