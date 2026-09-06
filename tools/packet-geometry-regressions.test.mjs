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

test('two-on-one read has two attackers and one defending skater in the direct passing lane',()=>{
 const s=scene('exp26b-u15-012');
 const home=s.setup.actors.filter(a=>a.team==='home'&&a.role!=='goalie');
 const away=s.setup.actors.filter(a=>a.team==='away'&&a.role!=='goalie');
 assert.equal(home.length,2);assert.equal(away.length,1);
 const a=home.find(a=>a.id===s.setup.puck.owner),b=home.find(b=>b!==a),d=away[0];
 const dx=b.x-a.x,dy=b.y-a.y,t=((d.x-a.x)*dx+(d.y-a.y)*dy)/(dx*dx+dy*dy);
 assert.ok(t>0&&t<1,'defender must lie between the two attackers along the pass');
 assert.ok(distance(d,{x:a.x+t*dx,y:a.y+t*dy})<0.1,'defender must actually occupy the stated direct passing line');
});

test('wall battle starts near the attacking side boards with an unowned puck',()=>{
 const s=scene('exp26b-u15-013'),p=s.setup.puck;
 assert.equal(p.owner,null);assert.ok(p.x>20&&p.x<26);
 assert.ok(Math.abs(p.y)>10&&Math.abs(p.y)<12.954,'wall contest cannot be in central open ice');
 const first=s.setup.actors.find(a=>a.label==='F1'),opponent=s.setup.actors.find(a=>a.label==='A1');
 assert.ok(distance(first,p)<1);assert.ok(distance(opponent,p)<1.5);
});
