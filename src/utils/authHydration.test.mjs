import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const app=readFileSync(new URL('../App.jsx',import.meta.url),'utf8');
const source=app.slice(app.indexOf('  async function loadUser('),app.indexOf('  async function handleQuizFinish('));
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function mount(){
 const p=deferred(),details=deferred(),timers=[],writes=[];
 const scope={current:{userId:'A',generation:1}},demo={current:false};
 const ctx={authScopeRef:scope,demoModeRef:demo,SB:{getProfile:()=>p.promise,getPlayerSessions:()=>details.promise,getPlayerGoals:async()=>[],getSelfRatings:async()=>[]},setProfile:v=>writes.push(['profile',v]),setPlayer:v=>writes.push(['player',v]),setProfileProbe:v=>writes.push(['probe',v]),setPrevScore:()=>{},setTotalSessions:()=>{},setTimeout:fn=>timers.push(fn),mergeCachedPlayer:x=>x,SEASONS:['2026']};
 vm.createContext(ctx);vm.runInContext(source+';globalThis.run=loadUser;',ctx);
 return {p,details,timers,writes,scope,demo,run:ctx.run};
}
test('delayed profile cannot restore a signed-out user',async()=>{const h=mount(),run=h.run('A');h.scope.current={userId:null,generation:2};h.p.resolve({id:'A',role:'coach'});await run;assert.deepEqual(h.writes,[]);});
test('A response cannot overwrite user B',async()=>{const h=mount(),run=h.run('A');h.scope.current={userId:'B',generation:2};h.p.resolve({id:'A',role:'coach'});await run;assert.deepEqual(h.writes,[]);});
test('delayed enrichment cannot restore old player data',async()=>{const h=mount(),run=h.run('A');h.p.resolve({id:'A',role:'player',level:'U11'});await new Promise(r=>setImmediate(r));h.scope.current={userId:'B',generation:2};h.details.resolve([]);await run;assert.equal(h.writes.some(([kind])=>kind==='player'),false);});
test('queued missing-profile retry is cancelled after identity changes',async()=>{const h=mount();h.p.resolve(null);await h.run('A');assert.equal(h.timers.length,1);h.writes.length=0;h.scope.current={userId:null,generation:2};await h.timers[0]();await new Promise(r=>setImmediate(r));assert.deepEqual(h.writes,[]);assert.equal(h.timers.length,1);});
test('entering local preview cancels pending profile work',async()=>{const h=mount(),run=h.run('A');h.demo.current=true;h.p.resolve({id:'A',role:'coach'});await run;assert.deepEqual(h.writes,[]);});
test('same identity after sign-out/sign-in does not revive an old request',async()=>{const h=mount(),run=h.run('A');h.scope.current={userId:'A',generation:3};h.p.resolve({id:'A',role:'coach'});await run;assert.deepEqual(h.writes,[]);});
test('current profile loads normally',async()=>{const h=mount(),run=h.run('A');h.p.resolve({id:'A',role:'coach'});await run;assert.equal(h.writes.find(([kind])=>kind==='profile')[1].id,'A');});
