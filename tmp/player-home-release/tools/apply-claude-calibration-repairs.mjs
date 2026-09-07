// Applies only the independently reviewed five-scene calibration repair.
// --check performs all preflight checks without writing the bank or receipts.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {readBankFiles,readJson} from './experimental-bank-files.mjs';
import {questionContentHash} from './question-batch-core.mjs';
import {validateExperimentalBank} from '../src/one-on-one/experimentalBankCore.js';
import {composeExperimentalBank} from '../src/one-on-one/experimentalExpansionCore.js';
import {createHash} from 'node:crypto';

const root='docs/factory/research/question-review';
const receipt=readJson(`${root}/calibration/proposed-repairs.json`);
const recheck=readJson(`${root}/calibration/independent-recheck.json`);
const {bank,original,newScenarios,additions}=readBankFiles();
assert.equal(createHash('sha256').update(readFileSync(receipt.sourceReturn.path)).digest('hex'),receipt.sourceReturn.sha256,'Claude return bytes changed');
assert.notEqual(recheck.reviewer,receipt.author,'Repair author cannot independently approve their own edits');
assert.equal(recheck.reviewer,'luna-calibration-final');
const changedIds=receipt.changes.map(c=>c.questionId).sort();
assert.equal(changedIds.length,28);
assert.deepEqual(recheck.coverage.map(c=>c.questionId).sort(),changedIds,'Independent coverage must exactly match all changed hashes');
assert.equal(new Set(changedIds).size,changedIds.length);
assert.equal(receipt.sceneEdits.length,5);
const patchedOriginal=structuredClone(original),patchedAdditions=structuredClone(additions);
for(const edit of receipt.sceneEdits){
 const current=bank.find(s=>s.id===edit.scenarioId),after=edit.after;
 assert.deepEqual(current,edit.before,`${edit.scenarioId}: live content changed since adjudication; do not overwrite`);
 assert.equal(after.id,current.id);
 assert.equal(after.version,current.version+1);
 assert.deepEqual(after.questions.map(q=>q.id),current.questions.map(q=>q.id),'Preserve every question ID and order');
 const base=patchedOriginal.find(s=>s.id===current.id),extension=patchedAdditions.find(s=>s.scenarioId===current.id);
 assert.ok(base&&extension,'Calibration scenes must have both original and extension files');
 const baseIds=new Set(base.questions.map(q=>q.id));
 Object.assign(base,structuredClone(after),{questions:after.questions.filter(q=>baseIds.has(q.id))});
 extension.scenarioVersion=after.version;
 extension.questions=after.questions.filter(q=>!baseIds.has(q.id));
 for(const row of current.questions){
  const next=after.questions.find(q=>q.id===row.id),beforeHash=questionContentHash(current,row),afterHash=questionContentHash(after,next);
  if(beforeHash===afterHash)continue;
  const change=receipt.changes.find(c=>c.questionId===row.id),checked=recheck.coverage.find(c=>c.questionId===row.id);
  assert.equal(change?.beforeContentHash,beforeHash);
  assert.equal(change?.afterContentHash,afterHash);
  assert.equal(checked?.contentHash,afterHash,`${row.id}: independent review is stale`);
  assert.equal(checked?.decision,'pass',`${row.id}: independent finding unresolved`);
 }
}
const composed=composeExperimentalBank(patchedOriginal,newScenarios,patchedAdditions);
assert.deepEqual(validateExperimentalBank(composed,{U7:20,U9:30,U11:50,U13:50,U15:30,U18:20}),[]);
assert.equal(composed.flatMap(s=>s.questions).length,1600);
for(const old of bank.filter(s=>!receipt.sceneEdits.some(e=>e.scenarioId===s.id)))assert.deepEqual(composed.find(s=>s.id===old.id),old,'Unrelated scenario changed');
if(!process.argv.includes('--check')){
 for(const age of ['u7','u9','u11','u13']){
  const base=`src/one-on-one/experimental-bank/${age}.json`,extension=`src/one-on-one/experimental-expansion/${age}-additions.json`;
  const baseIds=new Set(readJson(base).map(s=>s.id)),extensionIds=new Set(readJson(extension).map(s=>s.scenarioId));
  writeFileSync(base,JSON.stringify(patchedOriginal.filter(s=>baseIds.has(s.id)),null,2)+'\n');
  writeFileSync(extension,JSON.stringify(patchedAdditions.filter(s=>extensionIds.has(s.scenarioId)),null,2)+'\n');
 }
 writeFileSync(`${root}/repairs/claude-calibration-repairs.json`,JSON.stringify({...receipt,status:'applied-and-independently-rechecked',appliedAt:new Date().toISOString(),independentReview:`${root}/followup/calibration-final-recheck.json`},null,2)+'\n');
 writeFileSync(`${root}/followup/calibration-final-recheck.json`,JSON.stringify(recheck,null,2)+'\n');
}
console.log(JSON.stringify({mode:process.argv.includes('--check')?'check':'applied',scenarios:5,changedHashes:28,untouchedScenarios:195,questions:1600}));
