import test from 'node:test';
import assert from 'node:assert/strict';
import { initialGuidedLessonIndex } from './learningNavigation.js';
import { buildLibrary } from './lessonCore.js';

test('world links choose the authored strand only within the requested age', () => {
  const lessons = [{id:'u11-gap',ageBand:'U11',curriculumStrand:'gap'}, {id:'u13-support',ageBand:'U13',curriculumStrand:'support'}];
  const strands = ['scan','support','gap'];
  assert.equal(initialGuidedLessonIndex(lessons,strands,'U11 / Atom','u11-gap'),2);
  assert.equal(initialGuidedLessonIndex(lessons,strands,'U13','u13-support'),1);
  assert.equal(initialGuidedLessonIndex(lessons,strands,'U11','u13-support'),0);
  assert.equal(initialGuidedLessonIndex(lessons,strands,'U11','missing'),0);
});

test('world library availability uses explicit node IDs without replacing authored concepts', () => {
  const sources = [{id:'node',nodeId:'u11.off-puck-support-offense'}, {id:'explicit',nodeId:'u11.scanning',conceptId:'gap-control'}, {id:'unknown',nodeId:'unmapped'}];
  const rows = buildLibrary({'U11 / Atom':sources},[]);
  assert.deepEqual(rows.map(row=>row.concept),['off-puck-support-offense','gap-control','']);
  assert.strictEqual(rows[0].source,sources[0]);
});
