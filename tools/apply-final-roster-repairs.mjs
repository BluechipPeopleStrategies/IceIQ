import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {readBankFiles} from './experimental-bank-files.mjs';
import {questionContentHash} from './question-batch-core.mjs';
const path='docs/factory/research/question-review/repairs/final-roster-repairs.json';
if(existsSync(path))throw Error('Receipt exists.');
const {bank}=readBankFiles(),before=new Map(bank.map(s=>[s.id,structuredClone(s)])),changes=[];
const files=['u11-additions','u15-scenarios'].map(name=>({path:`src/one-on-one/experimental-expansion/${name}.json`,data:JSON.parse(readFileSync(`src/one-on-one/experimental-expansion/${name}.json`,'utf8'))}));
const records=files.flatMap(f=>f.data);
function edit(id,n,fn,reason){const s=records.find(s=>(s.id||s.scenarioId)===id),q=s.questions.find(q=>q.id===`${id}-q${n}`);fn(q);changes.push({scenarioId:id,questionId:q.id,reason});}
edit('exp26-u11-010',7,q=>{q.options[1].text='I will turn up ice before locating the arriving puck';q.options[2].text='Keep aiming at my old spot if I move wider';},'Replace the absent F2 and a guaranteed-outcome distractor with plausible receiving mistakes.');
edit('exp26-u11-010',8,q=>{q.options[2].text='YOU have already chosen the next touch before checking the arrival';},'The wrong option should test a receiving assumption, not mention an absent F2.');
edit('exp26-u11-011',7,q=>{q.options[1].text='Aim at the same board spot even if I move';q.options[2].text='Use the direct pass before checking D1’s stick';},'Use actual F1/YOU/D1 passing choices instead of nonexistent F2 or fixed-bounce certainty.');
const s=records.find(s=>s.id==='exp26b-u15-005');
s.version++;
s.briefing='Navy attacks Gold’s net. After F2 receives the entry pass, YOU are on the wall side of F2 and F3 supports lower in the zone. Gold 1 and Gold 2 defend inside while D1 is nearer the blue line. The next support job depends on F2 and those defenders.';
s.questions[0].options[0].text='F3';
for(const q of s.questions)changes.push({scenarioId:s.id,questionId:q.id,reason:'Correct the false blue-line location for YOU and use the visible F3 as the alternative carrier choice.'});
for(const c of changes){const old=before.get(c.scenarioId),s=records.find(s=>(s.id||s.scenarioId)===c.scenarioId),scene=s.id?s:{...old,questions:s.questions},q=s.questions.find(q=>q.id===c.questionId),oldq=old.questions.find(q=>q.id===c.questionId);Object.assign(c,{before:oldq,after:structuredClone(q),beforeContentHash:questionContentHash(old,oldq),afterContentHash:questionContentHash(scene,q)});}
for(const f of files)writeFileSync(f.path,JSON.stringify(f.data,null,2)+'\n');
writeFileSync(path,JSON.stringify({status:'applied-awaiting-independent-recheck',author:'root',changes,sceneEdits:[{scenarioId:s.id,before:before.get(s.id),after:s}]},null,2)+'\n');
