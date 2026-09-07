// Read-only verification script for the visual-review-60 assignment.
// Compares each manifest target (scenarioId/version/questionId/contentHash) against
// the LIVE composed experimental bank at this worktree's pinned sourceCommit.
// Does not modify the bank. Run from the worktree root:
//   node docs/factory/claude-visual-review-60/output/verify-hashes.mjs
import {readFileSync, readdirSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readBankFiles} from '../../../../tools/experimental-bank-files.mjs';
import {questionContentHash} from '../../../../tools/question-batch-core.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const packetsDir = join(here, '..', 'packets');
const {bank} = readBankFiles({});
const sceneById = new Map(bank.map(s => [s.id, s]));

const files = readdirSync(packetsDir).filter(f => /-manifest\.json$/.test(f)).sort();
const results = [];
for (const f of files) {
  const manifest = JSON.parse(readFileSync(join(packetsDir, f), 'utf8'));
  for (const t of manifest.targets) {
    const scene = sceneById.get(t.scenarioId);
    if (!scene) {
      results.push({packetId: manifest.packetId, ...t, live: 'scenario-not-found', match: false});
      continue;
    }
    const q = (scene.questions || []).find(q => q.id === t.questionId);
    if (!q) {
      results.push({packetId: manifest.packetId, ...t, live: 'question-not-found-in-scene', liveVersion: scene.version, match: false});
      continue;
    }
    const liveHash = questionContentHash(scene, q);
    results.push({
      packetId: manifest.packetId,
      scenarioId: t.scenarioId,
      questionId: t.questionId,
      manifestVersion: t.scenarioVersion,
      liveVersion: scene.version,
      manifestHash: t.contentHash,
      liveHash,
      match: liveHash === t.contentHash && scene.version === t.scenarioVersion
    });
  }
}

const mismatches = results.filter(r => !r.match);
console.log(JSON.stringify({total: results.length, mismatches: mismatches.length, results}, null, 2));
