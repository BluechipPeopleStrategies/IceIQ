import { questionContentHash } from './validation/tools/question-batch-core.mjs';
import fs from 'node:fs';

const p = JSON.parse(fs.readFileSync('./packets/packet-32.json', 'utf8'));
const s = p.scenarios.find(x => x.id === 'exp26-u15-010');
const manifest = p.manifest.find(m => m.scenarioId === 'exp26-u15-010');

for (const q of s.questions) {
  const h = questionContentHash(s, q);
  const expected = manifest.questions.find(mq => mq.questionId === q.id).baseContentHash;
  console.log(q.id, h === expected ? 'MATCH' : 'MISMATCH', h, expected);
}
