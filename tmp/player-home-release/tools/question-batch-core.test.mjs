import test from 'node:test';
import assert from 'node:assert/strict';
import {readBankFiles} from './experimental-bank-files.mjs';
import {validateQuestionBatch,questionContentHash,questionActorWarnings,positionSubjectIssue} from './question-batch-core.mjs';
const {original}=readBankFiles({originalOnly:true}),source=original[0];
const valid=()=>({schemaVersion:1,status:'draft-not-reviewed',batchId:'test-batch',scenarios:[],additions:[{scenarioId:source.id,scenarioVersion:source.version,questions:[{id:`${source.id}-q7`,type:'explain',basis:'coaching',prompt:'Describe a different way to help the puck holder in this situation.',explanation:'Explain the available space and pressure before choosing.'}]}]});
test('read-only batch validation accepts an additive draft and rejects collisions, stale targets and broken answers',()=>{
 assert.deepEqual(validateQuestionBatch(valid(),original).errors,[]);
 let batch=valid();batch.additions[0].scenarioVersion=99;assert.match(validateQuestionBatch(batch,original).errors.join(' '),/Stale/);
 batch=valid();batch.additions[0].questions[0]=source.questions[0];assert.match(validateQuestionBatch(batch,original).errors.join(' '),/already exists/);
 batch=valid();batch.additions[0].questions[0]={...source.questions[0],id:`${source.id}-q7`,answer:['unknown']};assert.match(validateQuestionBatch(batch,original).errors.join(' '),/answer invalid/);
});
test('imports reject invalid coordinates, gradeable reflections and self-approved status',()=>{
 let batch=valid();Object.assign(batch.additions[0].questions[0],{type:'position',actorId:source.focusActorId,reference:{x:30,y:12}});assert.match(validateQuestionBatch(batch,original).errors.join(' '),/outside ice/);
 batch=valid();batch.additions[0].questions[0].basis='scene';assert.match(validateQuestionBatch(batch,original).errors.join(' '),/reflection/);
 batch=valid();batch.status='approved';assert.ok(validateQuestionBatch(batch,original).errors.length);
});
test('malformed files produce errors rather than becoming published or crashing the validator',()=>{
 for(const value of [null,[],{}, {schemaVersion:1,status:'draft-not-reviewed',batchId:'test',scenarios:[null],additions:[]}])assert.ok(validateQuestionBatch(value,original).errors.length);
 for(const patch of [{id:42},{prompt:42},{type:'choice',options:'not an array',answer:['a']},{type:'choice',options:[{id:'a',text:42}],answer:['a']}]){
  const batch=valid();Object.assign(batch.additions[0].questions[0],patch);assert.ok(validateQuestionBatch(batch,original).errors.length);
 }
});
test('content receipts change with scene or question edits but not sibling additions',()=>{
 const hash=questionContentHash(source,source.questions[0]);
 assert.equal(questionContentHash({...source,questions:[],version:99},source.questions[0]),hash);
 assert.notEqual(questionContentHash({...source,briefing:'Changed'},source.questions[0]),hash);
 assert.notEqual(questionContentHash(source,{...source.questions[0],prompt:'Changed'}),hash);
});

test('named-player warnings use visible aliases and check the keyed answer',()=>{
 const scene={setup:{actors:[{id:'a1',team:'away',label:'A1'},{id:'h2',team:'home',label:'Navy2'}]}};
 assert.deepEqual(questionActorWarnings(scene,{id:'q1',prompt:'Look for Gold 1 and Navy2.'}),[]);
 assert.match(questionActorWarnings(scene,{id:'q2',prompt:'Find Navy3.'})[0],/Navy3/);
 assert.match(questionActorWarnings(scene,{id:'q3',options:[{id:'a',text:'D2'}],answer:['a']})[0],/D2/);
 assert.match(questionActorWarnings(scene,{id:'q4',options:[{id:'a',text:'Gold 1'},{id:'b',text:'Navy9'}],answer:['a']})[0],/Navy9/);
});

test('placement instructions cannot silently move a different named player',()=>{
 const batch=valid();Object.assign(batch.additions[0].questions[0],{type:'position',prompt:'Move YOU into open ice.',actorId:source.setup.actors.find(a=>a.label!=='YOU').id,reference:{x:0,y:0}});
 assert.match(validateQuestionBatch(batch,original).errors.join(' '),/targets a different player/);
 const scene={setup:{actors:[{id:'h2',label:'Navy2',team:'home'},{id:'a1',label:'D1',team:'away'}]}};
 assert.match(positionSubjectIssue(scene,{id:'q1',type:'position',prompt:'Move Navy 2 to a clear lane.',actorId:'a1'}),/different player/);
 assert.equal(positionSubjectIssue(scene,{id:'q1',type:'position',prompt:'Move Navy2 to a clear lane.',actorId:'h2'}),null);
});
