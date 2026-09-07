import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDailyIntel, saveDailyIntel, readDailyIntelCard } from './dailyHockeyIntelStore.js';
import { selectDailyIntel, LEGACY_INTEL_READ_KEY } from './dailyHockeyIntelCore.js';
const facts=Array.from({length:4},(_,i)=>({id:`f${i}`,term:`Term ${i}`,learnerText:'Short fact.',conceptId:`c${i}`,topic:`t${i}`,ageBands:['U11'],deliveryEligible:true,sourceRefs:[{url:'https://example.org'}]}));
const config={facts,playerId:'alex',ageBand:'U11',dayKey:'2026-09-05'};
function store(seed={}){const values=new Map(Object.entries(seed));return{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),values};}
test('daily progress persists across views, preserves legacy values, and emits the quest callback only on first read',()=>{
 const storage=store({[LEGACY_INTEL_READ_KEY]:JSON.stringify(['Prior statistic'])});let callbacks=0;const initial=loadDailyIntel(storage,config).state;saveDailyIntel(storage,initial);
 const one=readDailyIntelCard(storage,config,initial,initial.todayIds[0],()=>callbacks++);assert.equal(one.state.readIds.length,1);assert.equal(callbacks,1);
 const stale=readDailyIntelCard(storage,config,initial,initial.todayIds[1],()=>callbacks++);assert.equal(stale.state.readIds.length,2,'another view cannot overwrite the first read');assert.equal(callbacks,2);
 readDailyIntelCard(storage,config,initial,initial.todayIds[0],()=>callbacks++);assert.equal(callbacks,2);
 assert.equal(JSON.parse(storage.getItem(LEGACY_INTEL_READ_KEY))[0],'Prior statistic');assert.deepEqual(loadDailyIntel(storage,config).state,stale.state);
});
test('reading tomorrow does not consume more historical quest credit for a repeated fact',()=>{
 const storage=store();let n=0,previous;for(let day=5;day<9;day++){const next={...config,dayKey:`2026-09-0${day}`};previous=loadDailyIntel(storage,next).state;saveDailyIntel(storage,previous);for(const id of previous.todayIds)readDailyIntelCard(storage,next,previous,id,()=>n++);}
 assert.equal(n,4);assert.equal(JSON.parse(storage.getItem(LEGACY_INTEL_READ_KEY)).length,4);
});
test('a hidden or stale-day card cannot be marked read, and blocked storage keeps honest local progress',()=>{
 const initial=selectDailyIntel(config),storage=store();let n=0;const hidden=readDailyIntelCard(storage,config,initial,'not-today',()=>n++);assert.equal(hidden.state.readIds.length,0);assert.equal(n,0);
 const blocked={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
 const saved=readDailyIntelCard(blocked,config,initial,initial.todayIds[0],()=>n++);assert.equal(saved.state.readIds.length,1);assert.equal(saved.persisted,false);assert.equal(n,0);
 const stale=readDailyIntelCard(storage,{...config,dayKey:'2026-09-06'},initial,initial.todayIds[0],()=>n++);assert.equal(stale.accepted,false);
});
test('malformed legacy history remains byte-identical while current reading can still be saved',()=>{
 const bad='{"not":"an array"}',storage=store({[LEGACY_INTEL_READ_KEY]:bad}),initial=selectDailyIntel(config);let n=0;
 const result=readDailyIntelCard(storage,config,initial,initial.todayIds[0],()=>n++);assert.equal(result.state.readIds.length,1);assert.equal(storage.getItem(LEGACY_INTEL_READ_KEY),bad);assert.equal(n,0);assert.equal(result.persisted,true);
});
