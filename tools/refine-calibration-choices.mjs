import fs from 'node:fs';import assert from 'node:assert/strict';
import {questionContentHash} from './question-batch-core.mjs';
const path='docs/factory/calibration/skating-movement-2026-09-06.json',pack=JSON.parse(fs.readFileSync(path));
const receipt='docs/factory/coaching-panel/calibration-choice-refinement.json';assert(!fs.existsSync(receipt));
const before=structuredClone(pack);
const replacements={
 'cal26-u7-skating-space-001-q5':{prompt:'Navy2 stops in the space you chose. You want room for your turn. Where could you go?',texts:['Another clear space','Right beside Navy2','The spot Navy2 is standing on'],explanation:'Choose another clear space so you have room to turn. Being close to a teammate can sometimes help with a pass; here the task is to find room for your own turn.'},
 'cal26-u9-wall-turn-001-q5':{prompt:'Gold2 moves into the middle space you planned to use. Which part of your plan needs another look?',texts:['The turn into that middle space','Where you started beside the wall','Who had the puck at the start'],explanation:'Gold2 now occupies the space you planned to turn into. Reassess that route before committing. The starting position and starting puck owner have not changed; another route or a support pass could be useful if available.'},
 'cal26-u11-pivot-lane-001-q5':{prompt:'Gold1 leaves the space ahead of YOU. Navy2 remains available for support. Which option has just become worth comparing with the support pass?',texts:['Carrying into the space Gold1 left','Passing to Navy2','Holding the puck in the current spot'],explanation:'Carrying into the newly available space is the changed option. Passing to Navy2 or holding briefly can still be defensible, depending on pressure and timing. Gold1 leaving alone does not prove that carrying will succeed.'}
};
let choiceIndex=0;
for(const s of pack.candidates){
 for(const q of s.questions.filter(q=>q.type==='choice')){
  const r=replacements[q.id];if(r){q.prompt=r.prompt;q.explanation=r.explanation;q.options.forEach((o,i)=>o.text=r.texts[i]);}
  // IDs stay stable. Spread correct positions without changing answer meaning.
  if(!q.id.endsWith('pace-change-001-q5')){const correct=q.options.find(o=>q.answer.includes(o.id)),others=q.options.filter(o=>o!==correct);others.splice(choiceIndex%3,0,correct);q.options=others;}
  choiceIndex++;
 }
 if(s.id==='cal26-u11-pivot-lane-001')s.title='Read space before a turn';
 if(s.id==='cal26-u13-pace-change-001')s.title='Compare pressure and support';
 s.version++;
}
const changes=pack.candidates.flatMap(s=>{const old=before.candidates.find(v=>v.id===s.id);return s.questions.map(q=>({scenarioId:s.id,questionId:q.id,fromVersion:old.version,toVersion:s.version,beforeHash:questionContentHash(old,old.questions.find(v=>v.id===q.id)),afterHash:questionContentHash(s,q)}));});
fs.writeFileSync(path,JSON.stringify(pack,null,2)+'\n');
fs.writeFileSync(receipt,JSON.stringify({at:new Date().toISOString(),status:'editorial-refinement-not-human-coach-approval',scope:'Four calibration scenes only. Three decision prompts refined; single-choice positions varied; two titles narrowed to observable tasks. Earlier review receipts remain historical.',changes},null,2)+'\n');
console.log('Refined calibration choices and recorded version changes.');
