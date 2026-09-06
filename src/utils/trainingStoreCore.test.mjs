import test from 'node:test';
import assert from 'node:assert/strict';
import { createTrainingStore, mergeTrainingRows, trainingTotals, trainingLocalDate } from './trainingStoreCore.js';

function fixture(options={}) {
 const values=new Map(),sent=[];let next=0;
 const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
 const store=createTrainingStore({storage,uuid:()=>`session-${++next}`,now:()=>new Date('2026-09-05T18:00:00Z'),isEphemeral:id=>id==='demo',remoteSave:async(id,row)=>{sent.push([id,row]);return {id:row.id}},remoteRead:async()=>[],...options});
 return {store,values,sent};
}
const session={type:'practice',value:30,unit:'min',date:'2026-09-05',price:0};
test('local save preserves all history and zero cost, creates stable identity and isolates players',()=>{
 const f=fixture();f.values.set('rinkreads_training_log',JSON.stringify({a:{unknown:'kept',sessions:Array.from({length:201},()=>({...session}))},b:{sessions:[{...session,value:60}]}}));
 const row=f.store.save('a',session);
 assert.equal(row.sync,'pending');assert.equal(row.price,0);assert.ok(row.id);
 assert.equal(f.store.read('a').sessions.length,202);assert.equal(f.store.read('a').unknown,'kept');assert.equal(f.store.read('b').sessions[0].value,60);
});
test('failed upload stays pending and retries use the same ID; acknowledged upload is not repeated',async()=>{
 let fail=true;const sent=[];const f=fixture({remoteSave:async(id,row)=>{sent.push(row.id);if(fail)throw Error('offline');return {id:row.id}}});
 const row=f.store.save('a',session);await f.store.sync('a');assert.equal(f.store.read('a').sessions[0].sync,'pending');
 fail=false;await f.store.sync('a');await f.store.sync('a');assert.deepEqual(sent,[row.id,row.id]);assert.equal(f.store.read('a').sessions[0].sync,'synced');
});
test('remote restore merges by identity, matches legacy rows once, and preserves pending edits',()=>{
 const old=[{...session},{...session}, {...session,id:'pending',value:45,sync:'pending'}];
 const remote=[{...session,id:'cloud'}, {...session,id:'pending',value:20}];
 const merged=mergeTrainingRows(old,remote);
 assert.equal(merged.length,3);assert.equal(merged.filter(s=>s.id==='cloud').length,1);assert.equal(merged.find(s=>s.id==='pending').value,45);
 assert.deepEqual(mergeTrainingRows(merged,remote),merged);
});
test('bad or blocked storage never reports a save or replaces the original record',()=>{
 const f=fixture();f.values.set('rinkreads_training_log','{bad');assert.throws(()=>f.store.save('a',session));assert.equal(f.values.get('rinkreads_training_log'),'{bad');
 const blocked=fixture({storage:{getItem(){return null},setItem(){throw Error('quota')}}});assert.throws(()=>blocked.store.save('a',session));
});
test('demo saves never call remote APIs; missing remote acknowledgement stays pending',async()=>{
 const f=fixture({remoteSave:async()=>undefined});f.store.save('a',session);await f.store.sync('a');assert.equal(f.store.read('a').sessions[0].sync,'pending');
 f.store.save('demo',session);await f.store.sync('demo');assert.equal(f.sent.length,0);assert.equal(f.store.read('demo').sessions[0].sync,'local');
});
test('minutes and pucks remain separate and invalid inputs are rejected',()=>{
 assert.deepEqual(trainingTotals([{value:30,unit:'min'},{value:150,unit:'pucks'},{value:'20',unit:'min'}]),{minutes:50,pucks:150});
 const f=fixture();for(const patch of [{value:-1},{value:NaN},{date:'2026-02-31'},{date:'2026-09-06'},{price:-2}])assert.throws(()=>f.store.save('a',{...session,...patch}));
});

test('legacy omitted optional fields match cloud empty values without duplicating a session',()=>{
 const old={...session};delete old.price;
 const merged=mergeTrainingRows([old],[{...old,id:'restored',label:'',notes:'',coach:'',price:null}]);
 assert.equal(merged.length,1);assert.equal(merged[0].id,'restored');
});

test('training dates use the local calendar across the UTC midnight boundary',()=>{
 assert.equal(trainingLocalDate(new Date('2026-09-06T01:30:00Z'),'America/Edmonton'),'2026-09-05');
 assert.equal(trainingLocalDate(new Date('2026-09-06T01:30:00Z'),'Asia/Tokyo'),'2026-09-06');
});
