import fs from 'node:fs';import assert from 'node:assert/strict';
import {questionContentHash} from '../../../../tools/question-batch-core.mjs';
import {validateExperimentalBank} from '../../../../src/one-on-one/experimentalBankCore.js';
const base=new URL('./',import.meta.url),read=n=>JSON.parse(fs.readFileSync(new URL(n,base)));
const snapshot=read('snapshot.json'),review=read('second-review.json'),scenarios=structuredClone(snapshot.scenarios);
const ids=['cal26-u13-pace-change-001-q5','exp26-u11-001-q4','exp26-u11-001-q8','exp26-u11-001-q9','exp26-u11-001-q10'];
for(const id of ids){const s=scenarios.find(s=>s.questions.some(q=>q.id===id)),i=s.questions.findIndex(q=>q.id===id);s.questions[i]=structuredClone(review.rows.find(r=>r.questionId===id).proposedRepair);}
const u13=scenarios.find(s=>s.id==='cal26-u13-pace-change-001'),q5=u13.questions.find(q=>q.id.endsWith('-q5'));
Object.assign(q5,{prompt:'Gold2 moves into the direct line to Navy2. Which planned option needs to be reconsidered first?',options:[{id:'a',text:'A pass to Navy3'},{id:'b',text:'A pass to Navy2'},{id:'c',text:'A carry into open space'}],answer:['b'],explanation:'Gold2 now occupies the direct line to Navy2, so reassess that pass. Navy3 and carrying space are alternatives to compare, with Gold1 and the new pressure checked before committing. Neither alternative is guaranteed to work.'});
const retrieval=scenarios.find(s=>s.id==='exp26-u11-001');
retrieval.questions.find(q=>q.id.endsWith('-q9')).explanation='The example brings F2 closer to the middle of the rink and leaves D1 outside the straight line from the loose puck to F2. Compare those relationships at your chosen spot. Recheck after recovery; the picture does not guarantee a completed pass.';
retrieval.questions.find(q=>q.id.endsWith('-q10')).prompt='D1 closes on the loose puck while F2 moves behind the defender. How could YOUR approach to the puck change?';
const changed=scenarios.filter(s=>s.questions.some(q=>ids.includes(q.id)));for(const s of changed)s.version++;
assert.deepEqual(validateExperimentalBank(scenarios),[]);
const directChanges=ids.map(id=>{const before=snapshot.scenarios.find(s=>s.questions.some(q=>q.id===id)),after=changed.find(s=>s.id===before.id),bq=before.questions.find(q=>q.id===id),aq=after.questions.find(q=>q.id===id);return{questionId:id,scenarioId:after.id,fromVersion:before.version,toVersion:after.version,beforeHash:questionContentHash(before,bq),afterHash:questionContentHash(after,aq),before:bq,after:aq};});
const output={schemaVersion:1,status:'draft-repairs-not-applied',humanCoachApproval:false,sourceSnapshot:'snapshot.json',directChanges,affectedQuestionVersions:changed.flatMap(s=>s.questions.map(q=>({scenarioId:s.id,scenarioVersion:s.version,questionId:q.id,contentHash:questionContentHash(s,q)}))),scenarios:changed};
fs.writeFileSync(new URL('staged-repairs.json',base),JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify({directChanges:directChanges.length,sceneRevisions:changed.length,affectedQuestionVersions:output.affectedQuestionVersions.length}));
