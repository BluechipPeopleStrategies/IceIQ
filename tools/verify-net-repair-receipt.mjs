import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {readBankFiles} from './experimental-bank-files.mjs';
import {questionContentHash} from './question-batch-core.mjs';
const dir='docs/factory/research/question-review/net-overlap-repairs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const receipt=read(`${dir}/receipt.json`),review=read(`${dir}/independent-review.json`),browser=read(`${dir}/browser-verification.json`),manifest=read('docs/factory/research/question-review/current-content-manifest.json');
const bank=readBankFiles().bank;
for(const row of receipt.changes){
 const s=bank.find(s=>s.id===row.sceneId);assert.deepEqual(s,row.after);assert.equal(s.version,row.before.version+1);
 const independent=review.rows.find(r=>r.sceneId===s.id);assert(independent);
 assert.deepEqual([...independent.affectedQuestionIds].sort(),s.questions.map(q=>q.id).sort());
 for(const q of s.questions){const hash=questionContentHash(s,q);assert.equal(row.questions.find(r=>r.questionId===q.id).afterHash,hash);assert.equal(manifest.questions[q.id].contentHash,hash);assert.equal(manifest.questions[q.id].scenarioVersion,s.version);}
}
assert.equal(browser.placementSubmissionsAndReloads.length,10);
for(const r of browser.placementSubmissionsAndReloads){const s=bank.find(s=>s.id===r.id),q=s.questions.find(q=>q.id===`${r.id}-q${r.question}`);assert.equal(Number(r.x),q.reference.x);assert.equal(Number(r.y),q.reference.y);}
console.log('Verified 9 scene replacements, 58 current hashes, independent question coverage and 10 placement/reload results.');
