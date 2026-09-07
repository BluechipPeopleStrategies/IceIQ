import test from 'node:test';
import assert from 'node:assert/strict';
import { filterScenarios, validateExperimentalBank, makeScene, defaultResponse, responseReady, reviewResponse, restoreAttempts, updateAttempt, catalogCsv } from './experimentalBankCore.js';
const q = {id:'s-q1',type:'choice',prompt:'Who has the puck?',options:[{id:'a',text:'Navy'},{id:'b',text:'Gold'}],answer:['a'],basis:'scene',explanation:'Navy has possession.'};
const scenario = {id:'s',version:1,ageBand:'U11',title:'Support at the wall',family:'support',topic:'Passing',objective:'Find available support.',briefing:'Navy attacks right.',setup:{actors:[{id:'h',label:'YOU',team:'home',role:'skater',x:0,y:0,facing:0}],puck:{owner:'h'}},focusActorId:'h',cues:['Possession'],tags:['passing'],sources:[{id:'source',title:'Source',url:'https://example.com/source',section:'Support',use:'Principle'}],limits:'Original draft.',questions:[q,{...q,id:'s-q2',prompt:'Which cues are visible?',type:'multi',answer:['a','b']},{...q,id:'s-q3',prompt:'Order the routine.',type:'sequence',answer:['b','a']},{id:'s-q4',type:'position',actorId:'h',prompt:'Move into space.',reference:{x:3,y:2},basis:'coaching',explanation:'Space can vary.'},{id:'s-q5',type:'explain',prompt:'Explain the space.',basis:'coaching',explanation:'Many answers can work.'},{...q,id:'s-q6',basis:'coaching',prompt:'Where might you go?'}]};
test('catalog validates identities, typed answer membership, source URLs and rounded ice geometry',()=>{
 assert.deepEqual(validateExperimentalBank([scenario]),[]);
 const broken=structuredClone(scenario);broken.questions[0].answer=['missing'];broken.setup.actors[0].x=30;broken.setup.actors[0].y=12;
 const errors=validateExperimentalBank([broken]);assert.ok(errors.some(e=>e.includes('answer')));assert.ok(errors.some(e=>e.includes('ice')));
 assert.ok(validateExperimentalBank([scenario,scenario]).some(e=>e.includes('duplicate')));
});
test('filters compose by age, topic, format and text without changing catalog',()=>{
 const other={...scenario,id:'other',ageBand:'U9',title:'Turn toward space'};
 assert.deepEqual(filterScenarios([scenario,other],{age:'U11',type:'position',search:'wall'}).map(s=>s.id),['s']);
 assert.equal(filterScenarios([scenario],{topic:'Shooting'}).length,0);
});
test('position change retains all other actors and computes puck at the canonical blade offset',()=>{
 const scene=makeScene(scenario,{actorId:'h',point:{x:3,y:2}});
 assert.deepEqual([scene.puck.x,scene.puck.y],[4,2.7]);assert.equal(scenario.setup.actors[0].x,0);
 assert.throws(()=>makeScene(scenario,{actorId:'h',point:{x:99,y:2}}));
});
test('tactical answers and positioning are comparisons, never objective grades',()=>{
 assert.equal(reviewResponse(q,['a']).matched,true);
 assert.equal(reviewResponse({...q,basis:'coaching'},['b']).matched,null);
 assert.equal(reviewResponse(scenario.questions[3],{x:3,y:2}).matched,null);
 assert.equal(responseReady(q,[]),false);assert.equal(responseReady(q,['bogus']),false);
 assert.equal(responseReady(scenario.questions[4],''),true,'optional reflection can be skipped');
 const order=defaultResponse(scenario.questions[2]);assert.notDeepEqual(order,scenario.questions[2].answer);
});
test('attempt restore isolates revisions, rejects corrupt responses and preserves valid records',()=>{
 assert.deepEqual(validateExperimentalBank([{...scenario,version:2}]),[]);
 assert.ok(validateExperimentalBank([{...scenario,version:1.5}]).some(e=>e.includes('version')));
 let records=updateAttempt({},scenario,q,['a'],true);assert.deepEqual(restoreAttempts(JSON.stringify(records),[scenario]).records,records);
 const updated={...scenario,version:2};assert.equal(Object.keys(restoreAttempts(JSON.stringify(records),[updated]).records).length,0);
 assert.equal(restoreAttempts('{bad',[scenario]).error,true);
 records.s.answers[q.id].value=['invalid'];assert.equal(Object.keys(restoreAttempts(JSON.stringify(records),[scenario]).records.s.answers).length,0);
});
test('CSV uses one row per question and escapes spreadsheet formulas and quotes',()=>{
 const csv=catalogCsv([{...scenario,title:'=SUM(1,2)'}]);assert.equal(csv.split('\r\n').length,7);assert.ok(csv.includes("'=SUM(1,2)"));assert.ok(csv.includes('s-q4'));
});
