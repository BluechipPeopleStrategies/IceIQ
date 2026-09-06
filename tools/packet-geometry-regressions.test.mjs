import test from 'node:test';
import assert from 'node:assert/strict';
import {readBankFiles} from './experimental-bank-files.mjs';
const {bank}=readBankFiles();
const scene=id=>{const s=bank.find(s=>s.id===id);assert.ok(s,id);return s;};
const question=(s,n)=>s.questions.find(q=>q.id.endsWith(`-q${n}`));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
test('penalty-kill example depicts the stated four Navy skaters against five Gold skaters',()=>{
 const s=scene('exp26b-u15-003');
 assert.equal(s.setup.actors.filter(a=>a.team==='home'&&a.role!=='goalie').length,4);
 assert.equal(s.setup.actors.filter(a=>a.team==='away'&&a.role!=='goalie').length,5);
});
test('post-entry high support stays behind the new Navy carrier',()=>{
 const s=scene('exp26b-u15-005'),q=question(s,4),carrier=s.setup.actors.find(a=>a.id===s.setup.puck.owner);
 assert.ok(q.reference.x<carrier.x,'high support must be closer to the attacking blue line than F2');
 assert.notEqual(q.actorId,carrier.id,'support player must not take possession');
});
test('collecting the unsettled puck moves the player closer without assigning possession',()=>{
 const s=scene('exp26-u13-023'),q=question(s,9),a=s.setup.actors.find(a=>a.id===q.actorId);
 assert.equal(s.setup.puck.owner,null);
 assert.ok(distance(q.reference,s.setup.puck)<distance(a,s.setup.puck),'collection target must approach the loose puck');
});
test('rebound approach preserves the stated net-side and puck-distance relationships',()=>{
 const s=scene('exp26-u13-018'),q=question(s,4),a=s.setup.actors.find(a=>a.id===q.actorId),g=s.setup.actors.find(a=>a.role==='goalie'),opponent=s.setup.actors.find(a=>a.id==='away-skater-1');
 assert.ok(distance(q.reference,s.setup.puck)<distance(a,s.setup.puck));
 assert.ok(distance(q.reference,g)<distance(opponent,g));
 assert.equal(s.setup.puck.owner,null);
});
test('neutral-zone angling scene uses a matching location answer',()=>{
 const s=scene('exp26-u13-015'),q=question(s,1),carrier=s.setup.actors.find(a=>a.id===s.setup.puck.owner);
 assert.ok(Math.abs(carrier.x)<7.62);
 assert.match(q.options.find(o=>q.answer.includes(o.id)).text,/neutral.zone/i);
});
