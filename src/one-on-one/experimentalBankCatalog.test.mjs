import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateExperimentalBank,makeScene,responseReady,defaultResponse} from './experimentalBankCore.js';
import {isCoachRoutePoint} from './coachRouteSurfaceInput.js';
const counts={U7:10,U9:15,U11:25,U13:25,U15:15,U18:10};
const bank=Object.keys(counts).flatMap(age=>JSON.parse(readFileSync(new URL(`./experimental-bank/${age.toLowerCase()}.json`,import.meta.url),'utf8')));
test('the full catalog contains exactly100 unique original scenario records and600 linked questions',()=>{
 assert.deepEqual(validateExperimentalBank(bank,counts),[]);assert.equal(bank.length,100);assert.equal(bank.reduce((n,s)=>n+s.questions.length,0),600);
 const geometry=bank.map(s=>JSON.stringify(s.setup));assert.equal(new Set(geometry).size,100);
 assert.ok(new Set(bank.map(s=>s.family)).size>=40,'Meaningfully varied families, not one numerical parameter sweep');
});
test('all initial and comparison frames remain on ice, with finite puck and player state',()=>{
 for(const s of bank){
  assert.ok(isCoachRoutePoint(makeScene(s).puck),`${s.id} carried puck inside ice`);
  for(const q of s.questions){
   if(q.type==='position'){assert.ok(responseReady(q,q.reference),q.id);assert.ok(isCoachRoutePoint(makeScene(s,{actorId:q.actorId,point:q.reference}).puck),q.id);}
   else if(q.answer)assert.ok(responseReady(q,q.answer),q.id);
   if(q.type==='sequence')assert.notDeepEqual(defaultResponse(q),q.answer,q.id);
  }
 }
});
test('experimental content does not enter the approved bank or expose mastery certification',()=>{
 const loader=readFileSync(new URL('../qbLoader.js',import.meta.url),'utf8');assert.doesNotMatch(loader,/experimental-bank/);
 for(const s of bank){assert.notEqual(s.status,'approved');for(const q of s.questions)assert.notEqual(q.certification,'approved');}
});
