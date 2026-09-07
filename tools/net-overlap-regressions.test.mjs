import test from 'node:test';
import assert from 'node:assert/strict';
import {readBankFiles} from './experimental-bank-files.mjs';
import {makeScene,validateExperimentalBank} from '../src/one-on-one/experimentalBankCore.js';
import {NHL_200X85_PROFILE as NHL_RINK_PROFILE} from '../src/scenario-engine/rinkFrame.js';
const bank=readBankFiles().bank;
const goalX=NHL_RINK_PROFILE.landmarks.goalLineRight[0];
// PracticeScene.Goal floor: mouth +/-0.9144, rear +/-0.74, depth 1.1 m.
const insideNet=p=>{const depth=Math.abs(p.x)-goalX;return depth>=0&&depth<=1.1&&Math.abs(p.y)<=.9144-(.9144-.74)*depth/1.1;};
test('all opening actors, rendered pucks and placement examples clear the goal floor footprint',()=>{
 const overlaps=[];
 for(const s of bank){
  for(const [label,state] of [['opening',makeScene(s)],...s.questions.filter(q=>q.type==='position').map(q=>[q.id,makeScene(s,{actorId:q.actorId,point:q.reference})])]){
   for(const a of state.actors)if(insideNet(a))overlaps.push(`${s.id} ${label} ${a.id}`);
   if(insideNet(state.puck))overlaps.push(`${s.id} ${label} puck`);
  }
 }
 assert.deepEqual(overlaps,[]);
});
test('rebound repair preserves goalie then D1 proximity and unresolved possession',()=>{
 const s=bank.find(s=>s.id==='exp26b-u13-014'),p=s.setup.puck,d=a=>Math.hypot(a.x-p.x,a.y-p.y);
 assert.equal(p.owner,null);
 const g=s.setup.actors.find(a=>a.role==='goalie'),skaters=s.setup.actors.filter(a=>a.role==='skater').sort((a,b)=>d(a)-d(b));
 assert.equal(skaters[0].id,'n2');assert(d(g)<d(skaters[0]));
});
test('behind-net carriers keep ownership and both player and blade puck remain beyond the net back',()=>{
 for(const id of ['exp26b-u15-008','exp26-u18-007','exp26b-u18-007']){
  const s=bank.find(s=>s.id===id),state=makeScene(s),owner=state.actors.find(a=>a.id===state.puck.owner);
  assert(owner);assert(Math.abs(owner.x)>goalX+1.1+.5,id);
  assert(Math.abs(state.puck.x)>goalX+1.1,id+' puck');
 }
});
test('repaired bank retains valid contracts and the 200/1600 inventory',()=>{
 assert.equal(bank.length,200);assert.equal(bank.flatMap(s=>s.questions).length,1600);
 assert.deepEqual(validateExperimentalBank(bank),[]);
});
