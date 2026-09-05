import { readFileSync, writeFileSync } from 'node:fs';
import { questionContentHash } from './question-batch-core.mjs';

const basePath = 'src/one-on-one/experimental-bank/u13.json';
const newPath = 'src/one-on-one/experimental-expansion/u13-scenarios.json';
const additionsPath = 'src/one-on-one/experimental-expansion/u13-additions.json';
const receiptPath = 'docs/factory/research/question-review/repairs/u13-related-board-repairs.json';

const base = JSON.parse(readFileSync(basePath, 'utf8'));
const newScenes = JSON.parse(readFileSync(newPath, 'utf8'));
const additions = JSON.parse(readFileSync(additionsPath, 'utf8'));
const clone = value => structuredClone(value);
const findScene = id => base.find(scene => scene.id === id) || newScenes.find(scene => scene.id === id);
const findAddition = id => additions.find(row => row.scenarioId === id);

const changes = [];
const sceneEdits = [];
const composedQuestions = scene => [...scene.questions, ...(findAddition(scene.id)?.questions || [])];
function captureQuestions(beforeScene, afterScene, beforeQuestions, afterQuestions, reason) {
  for (const beforeQuestion of beforeQuestions) {
    const afterQuestion = afterQuestions.find(question => question.id === beforeQuestion.id);
    const beforeContentHash = questionContentHash(beforeScene, beforeQuestion);
    const afterContentHash = questionContentHash(afterScene, afterQuestion);
    changes.push({
      questionId: afterQuestion.id, scenarioId: afterScene.id, baseVersion: beforeScene.version, newVersion: afterScene.version,
      before: beforeQuestion, after: clone(afterQuestion), beforeContentHash, afterContentHash, contentChanged: beforeContentHash !== afterContentHash, reason,
    });
  }
}

// A completed retrieval can legitimately leave the carried puck inside the ice.
// Repair only the contradictory q4 wording; keep the past rim action intact.
const hinge = findScene('exp26b-u13-002');
const hingeAddition = findAddition(hinge.id);
const hingeBefore = clone(hinge);
const hingeBeforeQuestions = composedQuestions(hinge).map(clone);
hinge.version = 3;
const hingeQuestion = hinge.questions.find(question => question.id === 'exp26b-u13-002-q4');
hingeQuestion.prompt = 'Move YOU into an example hinge lane inside Gold 1 and clear of D1’s puck route.';
hingeQuestion.explanation = 'The inside spot gives D1 a short connection without copying the corner route; if Gold 1 cuts inside, widen or drop to keep a lane.';
if (hingeAddition) hingeAddition.scenarioVersion = 3;
captureQuestions(hingeBefore, hinge, hingeBeforeQuestions, composedQuestions(hinge), 'Corrected the q4 relation to the visible reference while preserving the valid completed rim retrieval and carried-puck state.');
sceneEdits.push({ scenarioId: hinge.id, beforeVersion: hingeBefore.version, afterVersion: hinge.version, before: { briefing: hingeBefore.briefing, setup: hingeBefore.setup }, after: { briefing: hinge.briefing, setup: hinge.setup }, reason: 'No puck move: the briefing describes a past rim retrieval, so the current carried puck inside the zone is valid. Only q4’s “below D1” relation conflicted with its reference.' });

const boardCases = [
  {
    id: 'exp26-u13-021',
    reason: 'Moved the current loose-puck board battle and its two contesting players to the upper side board so the live “along the side boards” wording is visible; preserved the high-support teaching roles.',
    edit(scene) {
      scene.version = 2;
      scene.setup.puck.y = 11.8;
      const f1 = scene.setup.actors.find(actor => actor.id === 'home-skater-2');
      const a1 = scene.setup.actors.find(actor => actor.id === 'away-skater-1');
      f1.y = 11.3; f1.facing = 0.464;
      a1.y = 11.8; a1.facing = 3.142;
      findAddition(scene.id).scenarioVersion = 2;
    },
  },
  {
    id: 'exp26-u13-025',
    reason: 'Moved the current loose puck and YOU’s approach to the upper side board so the live “toward the side boards” wording is visible; preserved C’s inside support and the conditional possession read.',
    edit(scene) {
      scene.version = 2;
      scene.setup.puck.y = 11.8;
      const you = scene.setup.actors.find(actor => actor.id === 'home-skater-1');
      you.y = 10.8; you.facing = 2.82;
      scene.questions.find(question => question.id === 'exp26-u13-025-q4').reference = { x: -14, y: 10.5 };
      findAddition(scene.id).scenarioVersion = 2;
      findAddition(scene.id).questions.find(question => question.id === 'exp26-u13-025-q9').reference = { x: -15, y: 10.6 };
    },
  },
];
for (const item of boardCases) {
  const scene = findScene(item.id);
  const addition = findAddition(item.id);
  const before = clone(scene);
  const beforeQuestions = composedQuestions(scene).map(clone);
  item.edit(scene);
  captureQuestions(before, scene, beforeQuestions, composedQuestions(scene), item.reason);
  sceneEdits.push({ scenarioId: scene.id, beforeVersion: before.version, afterVersion: scene.version, before: { briefing: before.briefing, setup: before.setup }, after: { briefing: scene.briefing, setup: scene.setup }, reason: item.reason });
}

const receipt = {
  status: 'applied-awaiting-independent-recheck', author: 'luna-u13-rebuild', changedAt: new Date().toISOString(),
  sourceFiles: { base: basePath, scenarios: newPath, additions: additionsPath }, changes, sceneEdits,
  limits: ['The completed retrieval in exp26b-u13-002 was intentionally preserved.', 'No other rim, wall or board-language rows were changed.'],
};
writeFileSync(basePath, JSON.stringify(base, null, 2) + '\n');
writeFileSync(newPath, JSON.stringify(newScenes, null, 2) + '\n');
writeFileSync(additionsPath, JSON.stringify(additions, null, 2) + '\n');
writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ scenarios: sceneEdits.map(edit => `${edit.scenarioId}@${edit.afterVersion}`), changes: changes.length }, null, 2));
