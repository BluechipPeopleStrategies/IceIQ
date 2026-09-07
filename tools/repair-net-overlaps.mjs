import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import assert from 'node:assert/strict';
import {readBankFiles} from './experimental-bank-files.mjs';
import {questionContentHash} from './question-batch-core.mjs';
import {makeScene,validateExperimentalBank} from '../src/one-on-one/experimentalBankCore.js';
const dir='docs/factory/research/question-review/net-overlap-repairs';
const receiptPath=`${dir}/receipt.json`;
assert(!existsSync(receiptPath),'Repair receipt already exists; do not apply twice.');
const before=readBankFiles().bank;
const edits=[
 ['exp26b-u13-006','ga',27,26,0,Math.PI,'Defending goalie moved one metre forward, clear of the goal mouth.'],
 ['exp26b-u13-007','ga',27,26,0,Math.PI,'Defending goalie remains between the puck and net.'],
 ['exp26b-u13-014','nga',-27,-26,0,0,'Defending goalie remains closer to the rebound than D1; no possession assigned.'],
 ['exp26b-u13-019','ng',-27,-28.8,-2,Math.atan2(-5,2.8),'Released outlet goalie is outside the mesh on the D1 side; D1 keeps control.'],
 ['exp26b-u15-008','a1',-28,-29,0,Math.PI/2,'Behind-net carrier and blade puck clear the rear of the net.'],
 ['exp26b-u15-011','g1',-28,-28.8,-2,Math.atan2(-5,7.8),'Released outlet goalie is outside the mesh; the puck remains loose at its original location.'],
 ['exp26b-u15-012','g1',28,26,0,Math.PI,'Defending goalie moved into the crease; no save or open lane implied.'],
 ['exp26-u18-007','home-skater-4',28,29,0,-Math.PI/2,'Behind-net carrier and blade puck clear the rear while assigned point-cover examples remain unchanged.'],
 ['exp26b-u18-007','h3',28,29,0,-Math.PI/2,'Behind-net carrier and blade puck clear the rear while assigned point-cover examples remain unchanged.'],
];
const paths=['src/one-on-one/experimental-bank/u18.json',...['u13','u15','u18'].map(a=>`src/one-on-one/experimental-expansion/${a}-scenarios.json`),'src/one-on-one/experimental-expansion/u18-additions.json'];
const files=new Map(paths.map(p=>[p,JSON.parse(readFileSync(p,'utf8'))]));
for(const [id,actorId,oldX,x,y,facing] of edits){
 const s=[...files.values()].flat().find(s=>s.id===id);assert(s,id);
 const a=s.setup.actors.find(a=>a.id===actorId);assert.equal(a.x,oldX,id+' stale actor');
 Object.assign(a,{x,y,facing});s.version++;
 if(id==='exp26b-u13-006')s.questions[0].prompt='Which Gold skater is nearest the direct line from D2 toward the net?';
 if(id==='exp26b-u13-007')s.questions[0].prompt='Which Gold skater is nearest D2’s direct shooting line?';
 if(id==='exp26b-u13-019')s.briefing+=' The goalie remains behind the net, outside the mesh on D1’s side.';
 if(id==='exp26b-u15-011')s.briefing+=' The goalie remains behind the net, outside the mesh on the outlet side.';
 if(s.setup.puck.owner)Object.assign(s.setup.puck,makeScene(s).puck);
 const addition=[...files.values()].flat().find(a=>a.scenarioId===id);if(addition)addition.scenarioVersion=s.version;
}
for(const [path,rows] of files)writeFileSync(path,JSON.stringify(rows,null,2)+'\n');
const after=readBankFiles().bank;assert.deepEqual(validateExperimentalBank(after),[]);
const changes=edits.map(([id,actorId,,,,,reason])=>{
 const old=before.find(s=>s.id===id),next=after.find(s=>s.id===id);
 return {sceneId:id,actorId,reason,before:old,after:next,renderedPuckBefore:makeScene(old).puck,renderedPuckAfter:makeScene(next).puck,questions:next.questions.map(q=>({questionId:q.id,beforeHash:questionContentHash(old,old.questions.find(x=>x.id===q.id)),afterHash:questionContentHash(next,q),textChanged:JSON.stringify(q)!==JSON.stringify(old.questions.find(x=>x.id===q.id))}))};
});
assert.equal(changes.length,9);assert.equal(changes.flatMap(c=>c.questions).length,58);
for(const s of before.filter(s=>!edits.some(e=>e[0]===s.id)))assert.deepEqual(after.find(a=>a.id===s.id),s,'Unrelated scene changed');
mkdirSync(dir,{recursive:true});
writeFileSync(receiptPath,JSON.stringify({createdAt:new Date().toISOString(),status:'repaired-awaiting-render-verification',humanCoachApproval:false,counts:{scenes:9,affectedQuestionVersions:58,questionTextEdits:2,unchangedScenes:191},changes},null,2)+'\n');
console.log('Repaired 9 scenes; 58 question versions affected; 191 scenes unchanged.');
