import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {readBankFiles} from '../tools/experimental-bank-files.mjs';
import {questionContentHash} from '../tools/question-batch-core.mjs';
import {createHash} from 'node:crypto';

const path='docs/factory/claude-project/claude-output/review-packet-01-calibration.json';
const returned=JSON.parse(readFileSync(path,'utf8'));
const bank=readBankFiles().bank;
const selected=returned.repairs.map(r=>structuredClone(r.replacement));
const get=id=>selected.find(s=>s.id===id);
const q=(id,n)=>get(id).questions.find(q=>q.id===`${id}-q${n}`);
const original=(id,n)=>structuredClone(bank.find(s=>s.id===id).questions.find(q=>q.id===`${id}-q${n}`));

q('exp26-u7-001',5).explanation='A teammate can become covered. Look again or find clearer space. Sending the puck away before you look can give Gold1 a chance to get it.';
q('exp26-u9-006',5).prompt='Imagine Gold1 moves to the boards side. What should you check again?';
q('exp26-u9-006',5).options.find(o=>o.id==='a').text='Which side Gold1 is coming from';
q('exp26-u9-006',5).options.find(o=>o.id==='b').text='Only where the puck is sitting';
q('exp26-u9-006',5).explanation='Check which side Gold1 is coming from now. Finding the puck alone does not tell you where the pressure is. One early look does not cover a later change.';
q('exp26-u13-001',2).options.find(o=>o.id==='c').text='A guaranteed pass to W after the pickup';
q('exp26-u13-001',2).explanation='Pressure and support shape the first read. Check them again as you approach; no outlet is guaranteed to stay open.';
q('exp26-u13-001',7).explanation='Gold 1 reaching the rim first makes your pickup less certain. Check possession, reach and support before choosing how to respond. If YOU arrive first and gain control, check the outlets again.';
get('exp26-u13-001').questions=get('exp26-u13-001').questions.map(row=>row.id.endsWith('-q9')?original('exp26-u13-001',9):row);
Object.assign(q('exp26-u13-001',9),{
 actorId:'home-skater-3',
 prompt:'If YOU gain control at the rim, move W closer along the boards to offer a shorter outlet.',
 reference:{x:-16,y:11},
 explanation:'This example brings W closer along the boards, away from Gold 1 in the freeze. Use it only after YOU gain control and the lane is open. If Gold 1 moves into the lane, W needs a different angle or outlet.'
});
get('exp26-u13-010').questions=get('exp26-u13-010').questions.map(row=>row.id.endsWith('-q8')?original('exp26-u13-010',8):row);
q('exp26-u13-010',3).explanation='This is one possible preparation routine. Keep watching the puck carrier as you move and offer your stick; these actions can overlap. Movement and stick skill require on-ice practice.';
q('exp26-u13-010',9).explanation='This example offers F1 a passing angle away from Gold 1 in the freeze. It does not guarantee a completed pass. If Gold 1 moves across, check whether another pocket or a higher outlet is open.';

const before=returned.repairs.map(r=>bank.find(s=>s.id===r.scenarioId));
const changes=selected.flatMap(s=>{
 const old=before.find(b=>b.id===s.id);
 return s.questions.flatMap(row=>{
  const prior=old.questions.find(q=>q.id===row.id);
  const a=questionContentHash(old,prior),b=questionContentHash(s,row);
  return a===b?[]:[{questionId:row.id,scenarioId:s.id,baseVersion:old.version,newVersion:s.version,before:prior,after:row,beforeContentHash:a,afterContentHash:b,reason:'Claude calibration finding independently adjudicated by Codex; see calibration-adjudication.md. Scene edits rehash all linked questions.'}];
 });
});
const receipt={status:'prepared-awaiting-independent-recheck',author:'codex-calibration-adjudicator',changedAt:new Date().toISOString(),sourceReturn:{path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex'),snapshotId:returned.snapshotId,packetId:returned.packetId},changes,sceneEdits:selected.map(s=>({scenarioId:s.id,before:before.find(b=>b.id===s.id),after:s}))};
mkdirSync('docs/factory/research/question-review/calibration',{recursive:true});
writeFileSync('docs/factory/research/question-review/calibration/candidate-scenes.json',JSON.stringify({status:'draft-not-reviewed',scenarios:selected},null,2)+'\n');
writeFileSync('docs/factory/research/question-review/calibration/proposed-repairs.json',JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({scenarios:selected.map(s=>({id:s.id,version:s.version,changes:changes.filter(c=>c.scenarioId===s.id).length})),changedHashes:changes.length}));
