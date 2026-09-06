import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { questionOptions, scoreLesson, creditLesson, buildLibrary, libraryMasteryDescriptor } from './lessonCore.js';
test('true/false never coerces a numeric option index into a boolean answer', () => {
  assert.equal(scoreLesson({type:'tf',ok:false},false),true);
  assert.equal(scoreLesson({type:'tf',ok:false},0),false);
});
test('every source bank answer survives the adapter without rewriting the record', () => {
  const bank=JSON.parse(readFileSync(new URL('../data/bank.json',import.meta.url)));
  const library=buildLibrary(bank,[]);
  assert.equal(library.length,Object.values(bank).flat().length);
  for(const item of library){
    const q=item.source;
    if(q.type==='seq') assert.equal(scoreLesson(q,q.correct_order),true,q.id);
    else if(q.type==='tf') assert.equal(scoreLesson(q,q.ok),true,q.id);
    else if(Array.isArray(q.opts)) {assert.equal(scoreLesson(q,q.ok),true,q.id);assert.deepEqual(questionOptions(q).map(o=>o.text),q.opts);}
  }
});
test('correct answers and retries cannot create instant mastery; legacy points remain intact', () => {
  let p=creditLesson({},'U11:q',false); p=creditLesson(p,'U11:q',true);p=creditLesson(p,'U11:q',true);
  assert.equal(p['U11:q'].firstCorrect,false);assert.equal(p['U11:q'].mastered,false);assert.equal(p['U11:q'].points,0);
  p=creditLesson({'U11:old':{firstCorrect:true,mastered:true,points:100}},'U11:old',false);
  assert.equal(p['U11:old'].mastered,true);assert.equal(p['U11:old'].points,100);
});
test('sequences require exactly the authored order, not just an equal prefix',()=>{
 const q={type:'seq',correct_order:[2,0,1]};assert.equal(scoreLesson(q,[2,0]),false);assert.equal(scoreLesson(q,[2,1,0]),false);
});
test('served scenario seeds retain their authored node concept and actual interaction format',()=>{
 const [row]=buildLibrary({'U11 / Atom':[{id:'seed',type:'scenario',nodeId:'u11.reading-the-play',interaction:{kind:'selection'}}]},[]);
 const descriptor=libraryMasteryDescriptor(row);
 assert.equal(row.concept,'reading-the-play');assert.equal(descriptor.concept,'reading-the-play');
 assert.equal(descriptor.format,'scenario:selection');assert.equal(descriptor.eligible,true);
});
