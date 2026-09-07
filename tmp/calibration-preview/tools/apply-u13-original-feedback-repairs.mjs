import { readFileSync, writeFileSync } from 'node:fs';
import { questionContentHash } from './question-batch-core.mjs';

const basePath = 'src/one-on-one/experimental-bank/u13.json';
const additionsPath = 'src/one-on-one/experimental-expansion/u13-additions.json';
const receiptPath = 'docs/factory/research/question-review/repairs/u13-original-repairs.json';

const base = JSON.parse(readFileSync(basePath, 'utf8'));
const additions = JSON.parse(readFileSync(additionsPath, 'utf8'));
const findBase = id => base.find(scenario => scenario.id === id);
const findAddition = id => additions.find(row => row.scenarioId === id);
const clone = value => structuredClone(value);

const rim = findBase('exp26-u13-001');
const rimAddition = findAddition(rim.id);
const rimBefore = clone(rim);
const rimBeforeQuestions = [...rim.questions, ...rimAddition.questions].map(clone);

// The renderer uses metres with the side boards at y=±12.954. At x=-23,
// y=8 is several metres inside the ice; y=12.2 is visibly on the upper wall.
// YOU's facing is pointed at the moved loose puck so the approach picture and
// the rim language agree without inventing possession.
rim.version = 2;
rim.setup.puck.y = 12.2;
rim.setup.actors.find(actor => actor.id === 'home-skater-1').facing = 2.337;
rim.questions.find(question => question.id === 'exp26-u13-001-q4').reference = { x: -21, y: 10.5 };
rimAddition.scenarioVersion = 2;
rimAddition.questions.find(question => question.id === 'exp26-u13-001-q9').reference = { x: -20, y: 10.2 };

const grammar = findBase('exp26-u13-010');
const grammarAddition = findAddition(grammar.id);
const grammarBefore = clone(grammar);
const grammarQuestion = grammar.questions.find(question => question.id === 'exp26-u13-010-q1');
const grammarBeforeQuestion = clone(grammarQuestion);
grammar.version = 2;
grammarQuestion.prompt = 'Where are YOU compared with the net-front centre?';
grammarAddition.scenarioVersion = 2;

const changes = [];
for (const beforeQuestion of rimBeforeQuestions) {
  const afterQuestion = [...rim.questions, ...rimAddition.questions].find(question => question.id === beforeQuestion.id);
  changes.push({
    questionId: afterQuestion.id, scenarioId: rim.id, baseVersion: rimBefore.version, newVersion: rim.version,
    before: beforeQuestion, after: clone(afterQuestion), beforeContentHash: questionContentHash(rimBefore, beforeQuestion),
    afterContentHash: questionContentHash(rim, afterQuestion),
    reason: 'Moved the loose puck onto the upper side board and aligned YOU’s facing and approach references with the described rim retrieval; preserve the loose-puck read and conditional coaching.'
  });
}
changes.push({
  questionId: grammarQuestion.id, scenarioId: grammar.id, baseVersion: grammarBefore.version, newVersion: grammar.version,
  before: grammarBeforeQuestion, after: clone(grammarQuestion), beforeContentHash: questionContentHash(grammarBefore, grammarBeforeQuestion),
  afterContentHash: questionContentHash(grammar, grammarQuestion), reason: 'Corrected the approved scene question grammar while preserving its keyed scene answer.'
});

const receipt = {
  status: 'applied-awaiting-independent-recheck', author: 'luna-u13-rebuild', changedAt: new Date().toISOString(),
  sourceFiles: { base: basePath, additions: additionsPath },
  changes,
  sceneEdits: [
    { scenarioId: rim.id, beforeVersion: rimBefore.version, afterVersion: rim.version, before: { setup: rimBefore.setup, briefing: rimBefore.briefing }, after: { setup: rim.setup, briefing: rim.briefing }, reason: 'The original rim briefing said side-board retrieval while the loose puck was visibly in open ice. The puck now sits near the upper board and YOU faces the approach.' },
    { scenarioId: grammar.id, beforeVersion: grammarBefore.version, afterVersion: grammar.version, before: { briefing: grammarBefore.briefing }, after: { briefing: grammar.briefing }, reason: 'Version bump accompanies the grammar repair so the scenario and its additive extension remain aligned.' },
  ],
};

writeFileSync(basePath, JSON.stringify(base, null, 2) + '\n');
writeFileSync(additionsPath, JSON.stringify(additions, null, 2) + '\n');
writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ scenarios: [rim.id, grammar.id], versions: [rim.version, grammar.version], changes: changes.map(change => ({ questionId: change.questionId, beforeContentHash: change.beforeContentHash, afterContentHash: change.afterContentHash })) }, null, 2));
