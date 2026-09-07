import test from 'node:test';
import assert from 'node:assert/strict';
import { createMasteryLedger, recordMasteryAttempt, masteryProgress, readMasteryLedger, masteryStorageKey, masteryDescriptor } from './spacedMasteryCore.js';

const group={ageBand:'U11',concept:'scanning',format:'mc'};
const question=(id,extra={})=>({...group,questionId:id,revision:'r1',eligible:true,origin:'existing-served',...extra});
const catalog=Array.from({length:10},(_,i)=>question(`q${i}`));
const stamp=day=>`2026-09-${String(day).padStart(2,'0')}T18:00:00Z`;
const add=(ledger,id,day,correct=true,extra={})=>recordMasteryAttempt(ledger,{...question(id,extra),correct},{now:stamp(day)});

test('one answer or eight answers in one sitting cannot award mastery',()=>{
 let ledger=createMasteryLedger({timeZone:'America/Edmonton'});
 ledger=add(ledger,'q0',1);
 assert.equal(masteryProgress(ledger,group,{catalog}).points,0);
 for(let i=1;i<8;i++)ledger=add(ledger,`q${i}`,1);
 const result=masteryProgress(ledger,group,{catalog});
 assert.equal(result.distinctQuestions,8);assert.equal(result.practiceDays,1);assert.equal(result.mastered,false);
});

test('five varied questions across five dates and seven days earn one group award without a streak',()=>{
 let ledger=createMasteryLedger({timeZone:'America/Edmonton'});
 for(const [i,day] of [1,2,3,4,8].entries())ledger=add(ledger,`q${i}`,day,i!==2);
 const result=masteryProgress(ledger,group,{catalog});
 assert.equal(result.distinctQuestions,5);assert.equal(result.accuracy,.8);
 assert.equal(result.practiceDays,5);assert.equal(result.spanDays,7);assert.equal(result.calendarWeeks,2);
 assert.equal(result.mastered,true);assert.equal(result.points,100);
 ledger=add(ledger,'q0',25);assert.equal(masteryProgress(ledger,group,{catalog}).points,100,'a gap is not a streak penalty');
});

test('same-day retries cannot repair a miss, repeated IDs cannot create question variety',()=>{
 let ledger=createMasteryLedger({timeZone:'UTC'});
 ledger=add(ledger,'q0',1,false);ledger=add(ledger,'q0',1,true);
 assert.equal(masteryProgress(ledger,group,{catalog}).accuracy,0,'same-day retry does not repair the first answer');
 for(const day of [2,3,4,8])ledger=add(ledger,'q0',day,true);
 const result=masteryProgress(ledger,group,{catalog});
 assert.equal(ledger.attempts.length,5);assert.equal(result.distinctQuestions,1);
 assert.equal(result.accuracy,1,'a later day can demonstrate improvement without rewriting history');assert.equal(result.points,0);
});

test('accuracy and all time requirements remain independent and configurable',()=>{
 let ledger=createMasteryLedger({timeZone:'UTC'});
 for(const [i,day] of [1,1,2,3,4,4,4,8].entries())ledger=add(ledger,`q${i}`,day,i>1);
 assert.equal(masteryProgress(ledger,group,{catalog}).mastered,false,'six of eight is below eighty percent');
 const result=masteryProgress(ledger,group,{catalog,policy:{minAccuracy:.75}});
 assert.equal(result.mastered,true);
 assert.equal(masteryProgress(ledger,group,{catalog,policy:{minCalendarWeeks:3}}).mastered,false);
 assert.throws(()=>masteryProgress(ledger,group,{catalog,policy:{minAccuracy:2}}));
});

test('age, concept and actual response format have separate evidence buckets',()=>{
 let ledger=createMasteryLedger({timeZone:'UTC'});
 ledger=add(ledger,'q0',1);ledger=add(ledger,'q0',2,true,{ageBand:'U13'});
 ledger=add(ledger,'q0',3,true,{format:'tf'});ledger=add(ledger,'q0',4,true,{concept:'passing'});
 const all=[...catalog,question('q0',{ageBand:'U13'}),question('q0',{format:'tf'}),question('q0',{concept:'passing'})];
 assert.equal(masteryProgress(ledger,group,{catalog:all}).practiceDays,1);
 assert.equal(masteryProgress(ledger,{...group,format:'tf'},{catalog:all}).practiceDays,1);
});

test('local calendar days are fixed to ledger timezone across UTC midnight, DST and year-week boundaries',()=>{
 let ledger=createMasteryLedger({timeZone:'America/Edmonton'});
 for(const now of ['2026-11-01T06:30:00Z','2026-11-01T07:30:00Z','2026-11-01T08:30:00Z'])ledger=recordMasteryAttempt(ledger,{...question('q0'),correct:true},{now});
 assert.equal(ledger.attempts.length,1,'the repeated local hour stays the same practice date');
 ledger=recordMasteryAttempt(ledger,{...question('q0'),correct:true},{now:'2026-11-02T07:30:00Z'});
 assert.equal(ledger.attempts.length,2,'local midnight begins a new date');
 let boundary=createMasteryLedger({timeZone:'UTC'});
 for(const now of ['2020-12-31T12:00:00Z','2021-01-01T12:00:00Z'])boundary=recordMasteryAttempt(boundary,{...question(now),correct:true},{now});
 const boundaryCatalog=boundary.attempts.map(a=>({...a,eligible:true}));
 assert.equal(masteryProgress(boundary,group,{catalog:boundaryCatalog}).calendarWeeks,1,'a calendar-year change alone is not a new Monday-based week');
});

test('catalog revisions exclude stale answers while revision changes never multiply distinct IDs',()=>{
 let ledger=createMasteryLedger({timeZone:'UTC'});ledger=add(ledger,'q0',1);
 const revised=[question('q0',{revision:'r2'})];
 assert.equal(masteryProgress(ledger,group,{catalog:revised}).distinctQuestions,0);
 ledger=add(ledger,'q0',1,false,{revision:'r2'});
 assert.equal(ledger.attempts.length,1,'a revision does not create another first attempt on the same date');
 ledger=add(ledger,'q0',2,false,{revision:'r2'});
 const result=masteryProgress(ledger,group,{catalog:revised});
 assert.equal(result.distinctQuestions,1);assert.equal(result.accuracy,0);assert.equal(result.practiceDays,1);
});

test('existing-served origin is product eligibility, but explicit drafts, unknowns and experiments are excluded',()=>{
 const source={id:'q',type:'mc',conceptId:'scanning',sit:'Find the puck',opts:['A','B'],ok:0};
 const known=masteryDescriptor(source,{ageBand:'U11',origin:'existing-served'});
 assert.equal(known.eligible,true);assert.equal(masteryDescriptor(source,{ageBand:'U11'}).eligible,false);
 for(const status of ['draft-for-review','experimental'])assert.equal(masteryDescriptor({...source,status},{ageBand:'U11',origin:'existing-served'}).eligible,false);
 assert.equal(masteryDescriptor({...source,id:'exp26-u11-001'},{ageBand:'U11',origin:'existing-served'}).eligible,false);
 assert.equal(masteryDescriptor({...source,id:'exp26b-u11-001'},{ageBand:'U11',origin:'existing-served'}).eligible,false);
 assert.notEqual(masteryDescriptor({...source,ok:1},{ageBand:'U11',origin:'existing-served'}).revision,known.revision);
 const empty=createMasteryLedger({timeZone:'UTC'});
 assert.equal(recordMasteryAttempt(empty,{...known,eligible:false,correct:true},{now:stamp(1)}).attempts.length,0);
 const progress=masteryProgress(empty,group,{catalog:[known]});assert.equal(progress.eligibleAvailable,1);assert.equal(progress.coverageShortfall,4);
});

test('storage restores dated evidence only and never upgrades legacy points or malformed records',()=>{
 let ledger=createMasteryLedger({timeZone:'America/Edmonton'});ledger=add(ledger,'q0',1,false);
 assert.deepEqual(readMasteryLedger(JSON.stringify(ledger),{now:stamp(5)}),ledger);
 const poisoned=structuredClone(ledger);poisoned.attempts.push({...poisoned.attempts[0],correct:true});
 poisoned.attempts.push({...poisoned.attempts[0],questionId:'future',at:stamp(25)});
 poisoned.points=9999;
 const restored=readMasteryLedger(JSON.stringify(poisoned),{now:stamp(5)});
 assert.equal(restored.attempts.length,1);assert.equal(restored.attempts[0].correct,false);assert.equal(restored.points,undefined);
 for(const raw of ['{bad','null',JSON.stringify({version:1,answers:{q:{mastered:true,points:100}}})])assert.equal(readMasteryLedger(raw).attempts.length,0);
 assert.notEqual(masteryStorageKey('player:a'),masteryStorageKey('player:b'));
});
