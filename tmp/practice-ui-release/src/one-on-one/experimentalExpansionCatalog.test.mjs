import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readBankFiles} from '../../tools/experimental-bank-files.mjs';
import {validateExperimentalBank,makeScene,responseReady,defaultResponse} from './experimentalBankCore.js';
import {isCoachRoutePoint} from './coachRouteSurfaceInput.js';
import {positionSubjectIssue} from '../../tools/question-batch-core.mjs';
const {bank,original,newScenarios,additions}=readBankFiles();
const allocation={U7:100,U9:150,U11:250,U13:250,U15:150,U18:100};
const originalIds=new Set(original.flatMap(s=>s.questions.map(q=>q.id)));
const added=bank.flatMap(s=>s.questions.filter(q=>!originalIds.has(q.id)).map(q=>({s,q})));
test('expansion contributes exactly1000 questions in the approved age allocation',()=>{
 assert.equal(bank.length,200);assert.equal(newScenarios.length,100);assert.equal(additions.length,100);assert.equal(added.length,1000);
 assert.equal(bank.reduce((sum,s)=>sum+s.questions.length,0),1600);
 assert.deepEqual(validateExperimentalBank(bank,{U7:20,U9:30,U11:50,U13:50,U15:30,U18:20}),[]);
 for(const [age,count] of Object.entries(allocation))assert.equal(added.filter(r=>r.s.ageBand===age).length,count,age);
});
test('all600 original questions and scenario versions survive additive composition intact',()=>{
 for(const before of original){const after=bank.find(s=>s.id===before.id);assert.equal(after.version,before.version);assert.deepEqual(after.questions.slice(0,6),before.questions);assert.equal(after.questions.length,10);}
 assert.ok(newScenarios.every(s=>s.questions.length===6));
});
test('every new answer state and position example remains usable on the rink',()=>{
 for(const {s,q} of added){
  assert.ok(isCoachRoutePoint(makeScene(s).puck),s.id);
  if(q.type==='position'){
   assert.ok(responseReady(q,q.reference),q.id);
   assert.ok(isCoachRoutePoint(makeScene(s,{actorId:q.actorId,point:q.reference}).puck),q.id);
   assert.equal(positionSubjectIssue(s,q),null,q.id);
  }
  else if(q.answer)assert.ok(responseReady(q,q.answer),q.id);
  if(q.type==='sequence')assert.notDeepEqual(defaultResponse(q),q.answer,q.id);
 }
});
test('new question prose contains no unresolved generation tokens or storage internals',()=>{
 for(const {q} of added){const prose=[q.prompt,q.explanation,...(q.options||[]).map(o=>o.text)].join(' ');assert.doesNotMatch(prose,/\bundefined\b|owner\s*:\s*null|home-skater-\d|away-skater-\d|\(\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*\)/,q.id);}
 const bodies=added.map(r=>r.q.explanation.trim());
 const repeats=new Map();for(const body of bodies)repeats.set(body,(repeats.get(body)||0)+1);
 assert.ok([...repeats.values()].every(count=>count<=4),'Generic feedback repeated across more than4 questions needs individual authoring review');
});
test('experimental release remains isolated from the approved/mastery loaders',()=>{
 const live=readFileSync(new URL('../qbLoader.js',import.meta.url),'utf8');assert.doesNotMatch(live,/experimental-expansion/);
 const release=JSON.parse(readFileSync(new URL('./experimental-expansion/release.json',import.meta.url),'utf8'));
 assert.deepEqual([...release.ages].sort(),Object.keys(allocation).sort());
});
