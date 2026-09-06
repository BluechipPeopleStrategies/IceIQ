import test from 'node:test';
import assert from 'node:assert/strict';
import {readBankFiles} from './experimental-bank-files.mjs';
import {questionContentHash} from './question-batch-core.mjs';
import {prepareReviewedRepairs} from './reviewed-question-repairs.mjs';
function fixture(){
 const bank=readBankFiles().bank;
 const s=bank[0],q=s.questions.find(q=>q.type==='choice');
 const after={...q,prompt:q.prompt+' Look at the scene.'};
 const c={scenarioId:s.id,questionId:q.id,fromVersion:s.version,toVersion:s.version+1,before:q,after,beforeHash:questionContentHash(s,q),afterHash:questionContentHash(s,after)};
 const reviews=['root','independent'].map(role=>({role,reviewerId:role,questionId:q.id,afterHash:c.afterHash,verdict:'approve'}));
 return {bank,c,reviews};
}
test('valid repair preserves input, geometry and all other questions',()=>{
 const {bank,c,reviews}=fixture(),before=structuredClone(bank);
 const next=prepareReviewedRepairs(bank,[c],reviews);
 assert.deepEqual(bank,before);
 assert.equal(next[0].version,bank[0].version+1);
 assert.deepEqual(next[0].setup,bank[0].setup);
 assert.deepEqual(next.slice(1),bank.slice(1));
 assert.deepEqual(next[0].questions.filter(q=>q.id!==c.questionId),bank[0].questions.filter(q=>q.id!==c.questionId));
});
test('stale identities, forged after hash, missing/held reviews and invalid answers fail closed',()=>{
 for(const mutate of [
  f=>f.c.fromVersion++,f=>f.c.beforeHash='stale',f=>f.c.after.prompt+=' changed',
  f=>f.reviews.pop(),f=>f.reviews[0].verdict='revise',f=>f.reviews[0].afterHash='old',
  f=>delete f.reviews[0].reviewerId,f=>f.reviews[0].reviewerId=f.reviews[1].reviewerId,
  f=>{f.c.after.answer=['missing']; f.c.afterHash=questionContentHash(f.bank[0],f.c.after);f.reviews.forEach(r=>r.afterHash=f.c.afterHash);}
 ]) {const f=fixture();mutate(f);assert.throws(()=>prepareReviewedRepairs(f.bank,[f.c],f.reviews));}
});
test('duplicate changes are rejected before any result is returned',()=>{
 const {bank,c,reviews}=fixture();assert.throws(()=>prepareReviewedRepairs(bank,[c,c],reviews),/Duplicate/);
});
