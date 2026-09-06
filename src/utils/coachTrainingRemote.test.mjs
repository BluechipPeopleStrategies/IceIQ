import test from 'node:test';
import assert from 'node:assert/strict';
import {createCoachTrainingRemote} from './coachTrainingRemote.js';
function client(responses=[],user='coach'){
 const calls=[];return {calls,auth:{getSession:async()=>({data:{session:{user:{id:user}}}})},from(table){
  const call={table,steps:[]};calls.push(call);const result=responses.shift()??{data:[],error:null};
  const builder={then:resolve=>Promise.resolve(result).then(resolve)};
  for(const op of ['select','eq','neq','order','range','upsert','maybeSingle','single'])builder[op]=(...args)=>{call.steps.push([op,...args]);return builder;};
  return builder;
 }};
}
test('coach editor filters its author and never reads private sentinel as ratings',async()=>{
 const db=client([{data:[{skill_id:'s1',coach_id:'coach',value:'consistent',note:'next'}],error:null}]);
 const result=await createCoachTrainingRemote(db).ratings('player','coach');
 assert.equal(result.ratings.s1,'consistent');assert.equal(result.assessments[0].coach_id,'coach');
 assert.ok(db.calls[0].steps.some(s=>s[0]==='eq'&&s[1]==='coach_id'&&s[2]==='coach'));
 assert.ok(db.calls[0].steps.some(s=>s[0]==='neq'&&s[2]==='__general_notes__'));
});
test('private backend absence throws; it never falls back to writing shared rating rows',async()=>{
 const db=client([{error:Error('missing table')}]);await assert.rejects(createCoachTrainingRemote(db).privateNote('player'));
 assert.equal(db.calls.length,1);assert.equal(db.calls[0].table,'coach_private_notes');
 const denied=client([],'other');await assert.rejects(createCoachTrainingRemote(denied).savePrivateNote('coach','player','text'));assert.equal(denied.calls.length,0);
});
test('legacy private read is author scoped and an explicit empty new note overrides legacy text',async()=>{
 const db=client([{data:null},{data:{note:'legacy'}}]);assert.equal(await createCoachTrainingRemote(db).privateNote('player'),'legacy');
 assert.ok(db.calls[1].steps.some(s=>s[0]==='eq'&&s[1]==='coach_id'&&s[2]==='coach'));
 const empty=client([{data:{note:''}}]);assert.equal(await createCoachTrainingRemote(empty).privateNote('player'),'');assert.equal(empty.calls.length,1);
});
test('training uploads keep the entry ID and zero price and require matching acknowledgement',async()=>{
 const db=client([{data:{id:'entry'}}],'player');const api=createCoachTrainingRemote(db);
 assert.deepEqual(await api.saveTraining('player',{id:'entry',date:'2026-09-05',type:'practice',value:30,unit:'min',price:0}),{id:'entry'});
 const upsert=db.calls[0].steps.find(s=>s[0]==='upsert');assert.equal(upsert[1].id,'entry');assert.equal(upsert[1].price,0);assert.equal(upsert[2].onConflict,'id');
 await assert.rejects(createCoachTrainingRemote(client([{data:null}],'player')).saveTraining('player',{id:'entry'}));
});
test('unavailable editor and strict training reads throw rather than impersonate an empty record',async()=>{
 await assert.rejects(createCoachTrainingRemote(null).ratings('player','coach'));
 await assert.rejects(createCoachTrainingRemote(null).training('player',{strict:true}));
 assert.deepEqual(await createCoachTrainingRemote(null).training('player'),[]);
});

test('report reads distinguish unavailable ratings from an empty assessment',async()=>{
 const result=await createCoachTrainingRemote(null).ratings('player');
 assert.ok(result.error);
});
