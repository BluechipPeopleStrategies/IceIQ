import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {questionContentHash} from './question-batch-core.mjs';
const dir=process.argv[2];assert(dir,'Supply a frozen packet directory');
const read=name=>JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'));
const candidateBytes=fs.readFileSync(path.join(dir,'candidates.json'));
const pack=JSON.parse(candidateBytes),freeze=read('FREEZE.json');
assert.equal(createHash('sha256').update(candidateBytes).digest('hex'),freeze.candidateSha256,'Frozen candidate bytes changed');
const independent=read('independent-review.json'),root=read('root-review.json');
const scope=JSON.parse(fs.readFileSync('docs/factory/coaching-panel/choice-quality-remaining-04/root-adjudication.json','utf8'));
const targets=new Map(scope.rows.filter(r=>r.verdict==='revise').map(r=>[r.questionId,r]));
const adjudications=[];
assert.equal(independent.reviewer,'choice-quality-rewrite-independent-03','Unexpected independent review provenance');
assert.equal(root.reviewer,'/root','Unexpected root review provenance');
const seen=new Set();
for(const change of pack.changes){
 const identity=`${change.scenarioId}::${change.questionId}`;assert(!seen.has(identity),'Duplicate repair');seen.add(identity);
 const target=targets.get(change.questionId);assert(target,'Not an authorized repair');
 assert.equal(change.scenarioId,target.scenarioId);
 assert.equal(change.beforeHash,target.contentHash);
 const scene=pack.scenarios.find(s=>s.id===change.scenarioId);assert(scene,'Missing candidate scene');
 assert.deepEqual(scene.questions.find(q=>q.id===change.questionId),change.after,'Candidate scene and replacement differ');
 assert.equal(questionContentHash(scene,change.after),change.afterHash,'Candidate hash is not its actual payload');
 for(const [review,role,reviewerId] of [[independent,'independent','/root/rewrite_independent'],[root,'root','/root']]){
  const rows=review.rows.filter(r=>r.questionId===change.questionId);assert.equal(rows.length,1,'Missing or duplicate verdict');
  const row=rows[0];assert.equal(row.verdict,'approve',`${role} holds ${change.questionId}`);
  assert.equal(row.contentHash||row.afterHash,change.afterHash,'Review is for another payload');
  adjudications.push({role,reviewerId,questionId:change.questionId,afterHash:change.afterHash,verdict:'approve',reason:row.reason||row.issue||'Exact option and scene findings are recorded in the linked review.',evidence:role==='root'?'root-review.json':'independent-review.json'});
 }
}
fs.writeFileSync(path.join(dir,'adjudicated-packet.json'),JSON.stringify({status:'root-adjudicated-experimental-repairs',humanCoachApproval:false,changes:pack.changes,adjudications},null,2)+'\n',{flag:'wx'});
console.log(`Prepared ${pack.changes.length} exact reviewed repairs; no bank writes.`);
