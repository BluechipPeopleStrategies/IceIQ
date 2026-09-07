import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { eligibleDailyFacts, localDayKey, nextLocalMidnight, selectDailyIntel, markDailyIntelRead, appendLegacyRead, dailyIntelStorageKey } from './dailyHockeyIntelCore.js';

const facts=Array.from({length:12},(_,i)=>({id:`fact-${i}`,version:1,term:`Fact ${i}`,learnerText:`A supported fact ${i}.`,topic:['rink','equipment','play'][i%3],conceptId:`concept-${i%4}`,ageBands:['U7','U11'],deliveryEligible:true,sourceRefs:[{url:'https://example.org/source'}]}));
const args={facts,playerId:'alex',ageBand:'U11',dayKey:'2026-09-05'};
test('three age-supported facts are stable through reload and vary by player, with varied concepts and topics when possible',()=>{
 const a=selectDailyIntel(args), b=selectDailyIntel({...args,previous:structuredClone(a)});
 assert.deepEqual(a,b);assert.equal(a.todayIds.length,3);
 const picked=a.todayIds.map(id=>facts.find(f=>f.id===id));assert.equal(new Set(picked.map(f=>f.conceptId)).size,3);assert.equal(new Set(picked.map(f=>f.topic)).size,3);
 assert.notDeepEqual(a.todayIds,selectDailyIntel({...args,playerId:'blair'}).todayIds);
 assert.deepEqual(selectDailyIntel(args).todayIds,a.todayIds,'a fresh deterministic fallback cannot shuffle on refresh');
});
test('unseen facts finish their round before any repeat, including days when the app was not opened',()=>{
 let previous=null;const shown=[];
 for(const dayKey of ['2026-09-05','2026-09-08','2026-09-09','2026-10-01']) {previous=selectDailyIntel({...args,dayKey,previous});shown.push(...previous.todayIds);}
 assert.equal(new Set(shown).size,12);assert.deepEqual(new Set(shown),new Set(facts.map(f=>f.id)));
 previous=selectDailyIntel({...args,dayKey:'2026-10-02',previous});assert.equal(previous.round,1);assert.equal(previous.todayIds.length,3);
});
test('a round boundary never repeats a card within the same day, and small catalogs have no duplicate fillers',()=>{
 let previous=null;const short=facts.slice(0,4), stream=[];
 for(let i=5;i<9;i++){previous=selectDailyIntel({...args,facts:short,dayKey:`2026-09-0${i}`,previous});assert.equal(new Set(previous.todayIds).size,3);stream.push(...previous.todayIds);}
 for(let i=0;i<stream.length;i+=4)assert.equal(new Set(stream.slice(i,i+4)).size,4);
 assert.equal(selectDailyIntel({...args,facts:facts.slice(0,2)}).todayIds.length,2);
 assert.deepEqual(selectDailyIntel({...args,facts:[]}).todayIds,[]);
});
test('research holds, unsupported ages, missing evidence and malformed or cross-player saves never enter delivery',()=>{
 const bad=[{...facts[0],id:'held',deliveryEligible:false},{...facts[1],id:'unsupported',ageBands:['U18']},{...facts[2],id:'unsourced',sourceRefs:[]}];
 assert.deepEqual(eligibleDailyFacts(bad,'U11'),[]);assert.deepEqual(eligibleDailyFacts(facts,'not-an-age'),[]);
 const a=selectDailyIntel(args);const unsafe={...a,todayIds:['held'],servedIds:['held'],readIds:['held']};
 assert.deepEqual(selectDailyIntel({...args,previous:unsafe}),a);
 assert.deepEqual(selectDailyIntel({...args,previous:{...a,identity:'someone-else'}}),a);
 assert.notEqual(dailyIntelStorageKey('a:b','U11'),dailyIntelStorageKey('a','b:U11'));
});
test('revoked facts disappear from a saved daily set and remaining read progress stays intact',()=>{
 let a=selectDailyIntel(args);a=markDailyIntelRead(a,a.todayIds[1]);const removed=a.todayIds[0];
 const changed=facts.map(f=>f.id===removed?{...f,deliveryEligible:false}:f);const next=selectDailyIntel({...args,facts:changed,previous:a});
 assert.equal(next.todayIds.includes(removed),false);assert.equal(next.todayIds.length,3);assert.equal(next.readIds.includes(a.todayIds[1]),true);
});
test('read markers require an explicit current item and reset daily; legacy flags are append-only and deduplicated',()=>{
 const a=selectDailyIntel(args),before=JSON.stringify(a);const b=markDailyIntelRead(a,a.todayIds[0]);assert.equal(JSON.stringify(a),before);
 assert.deepEqual(b.readIds,[a.todayIds[0]]);assert.deepEqual(markDailyIntelRead(b,a.todayIds[0]),b);assert.deepEqual(markDailyIntelRead(b,'other'),b);
 const tomorrow=selectDailyIntel({...args,dayKey:'2026-09-06',previous:b});assert.deepEqual(tomorrow.readIds,[]);
 const old=['Old stat', 'Another old stat'];const first=appendLegacyRead(old,'fact-0');assert.deepEqual(first.values,[...old,'intel:fact-0']);assert.equal(first.added,true);assert.deepEqual(old,['Old stat','Another old stat']);
 assert.equal(appendLegacyRead(first.values,'fact-0').added,false);assert.equal(appendLegacyRead({bad:true},'fact-0').added,false,'invalid historical data must not be overwritten');
});
test('calendar uses local dates and computes the next local midnight rather than a UTC or fixed24-hour boundary',()=>{
 const date=new Date(2026,8,5,23,59,59);assert.equal(localDayKey(date),'2026-09-05');const next=nextLocalMidnight(date);assert.equal(next.getFullYear(),2026);assert.equal(next.getMonth(),8);assert.equal(next.getDate(),6);assert.equal(next.getHours(),0);assert.equal(localDayKey(next),'2026-09-06');
});
test('real seed only delivers its eligible reviewed subset and keeps all admissions unchanged',()=>{
 const seed=JSON.parse(readFileSync(new URL('../../docs/library/study-facts-seed-2026-09-05.json',import.meta.url)));const original=JSON.stringify(seed);
 for(const ageBand of ['U7','U9','U11','U13','U15','U18']){const available=eligibleDailyFacts(seed.facts,ageBand);assert.ok(available.length>=3);for(const fact of available){assert.equal(fact.deliveryEligible,true);assert.equal(fact.review.curriculum,'not-admitted');}assert.equal(selectDailyIntel({...args,facts:seed.facts,ageBand}).todayIds.length,3);}
 assert.equal(JSON.stringify(seed),original);
});
