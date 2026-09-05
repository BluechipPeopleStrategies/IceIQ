import {writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {readJson,projectRoot} from './experimental-bank-files.mjs';
import {questionContentHash} from './question-batch-core.mjs';
const directory=join(projectRoot,'docs/factory/research/question-review/repairs');mkdirSync(directory,{recursive:true});
const receiptPath=join(directory,'root-early-repairs.json');
if(existsSync(receiptPath))throw Error('Repair receipt already exists; do not overwrite reviewed history.');
const basePath=join(projectRoot,'src/one-on-one/experimental-bank/u9.json'),additionPath=join(projectRoot,'src/one-on-one/experimental-expansion/u9-additions.json');
const base=readJson(basePath),additions=readJson(additionPath),s=base.find(s=>s.id==='exp26-u9-006'),extra=additions.find(a=>a.scenarioId===s.id);
if(s.version!==1||extra.scenarioVersion!==1)throw Error('Expected original scenario version1.');
const snapshot=readJson(join(projectRoot,'docs/factory/research/question-review/expansion/manifest.json')).coverage;
const repairs=[
 {id:'exp26-u9-006-q3',type:'choice',prompt:'You spotted Gold1 and Navy2 before moving. When should you look for them again?',options:[{id:'a',text:'Only once the puck is on your stick'},{id:'b',text:'Keep checking as you approach and before choosing your first touch'},{id:'c',text:'After you send the pass to Navy2'}],answer:['b'],basis:'coaching',explanation:'Gold1 and Navy2 can move while you approach. Keep checking pressure and support along with the puck, so your first touch fits the newest picture. Looking once does not finish the job.'},
 {id:'exp26-u9-006-q7',type:'explain',prompt:'Navy2 sees Gold1 closing from the inside. What could Navy2 call to help YOU before the pickup?',basis:'coaching',explanation:'A short call such as “Pressure inside; I am along the boards” gives the pressure side and an outlet. YOU still checks the play: the call helps the scan and does not replace it.'},
 {id:'exp26-u9-006-q8',type:'multi',prompt:'If Gold1 wins the puck before YOU, what could Navy2 do?',options:[{id:'a',text:'Check Gold1’s route and look for a useful passing lane to close'},{id:'b',text:'Look toward the Navy net and recover to help defend'},{id:'c',text:'Keep waiting in the old spot for a pass from YOU'}],answer:['a','b'],basis:'coaching',explanation:'Gold1 now has possession, so Navy2’s job changes from offering an outlet to helping defend. Recovering or closing an available lane can help; if Navy2 can reach the puck under control, challenging it may also fit.'},
 {id:'exp26-u9-006-q9',type:'position',actorId:'home-skater-2',prompt:'Move Navy2 to offer a shorter pass along the boards once YOU gain control.',reference:{x:22,y:9},basis:'coaching',explanation:'The example brings Navy2 closer along the board side while staying away from Gold1’s inside approach. A shorter outlet can help after the pickup, but Navy2 must keep checking whether Gold1 can close the lane.'},
 {id:'exp26-u9-006-q10',type:'choice',prompt:'The puck is near where the side boards curve around the end of the rink. What do we call this area?',options:[{id:'a',text:'The slot'},{id:'b',text:'The corner'},{id:'c',text:'The point'}],answer:['b'],basis:'scene',explanation:'This is the corner. The slot is the middle space in front of the net; the point is near the attacking blue line. Naming the corner helps a teammate understand where the pickup is happening.'}
];
const changes=repairs.map(after=>{
 const before=[...s.questions,...extra.questions].find(q=>q.id===after.id);
 const beforeHash=questionContentHash(s,before);
 const expected=after.id.endsWith('-q3')?'96a25e49ea3826f3fe67a3ae92c3dc889378f960e9a8dac6f7aff137ec7468d8':snapshot.find(r=>r.questionId===after.id)?.contentHash;
 if(beforeHash!==expected)throw Error(`Stale repair input: ${after.id}`);
 return {questionId:after.id,scenarioId:s.id,baseVersion:1,newVersion:2,before,after,beforeContentHash:beforeHash,afterContentHash:questionContentHash(s,after),reason:after.id.endsWith('-q3')?'Teach repeated checking without duplicating q2’s list of cues.':'Replace a question set attached to the wrong possession/actor situation with a distinct target grounded in the actual corner pickup.'};
});
const revised=new Map(repairs.map(q=>[q.id,q]));s.questions=s.questions.map(q=>revised.get(q.id)||q);s.version=2;
extra.questions=extra.questions.map(q=>revised.get(q.id)||q);extra.scenarioVersion=2;
writeFileSync(receiptPath,JSON.stringify({status:'applied-awaiting-independent-recheck',author:'root',changedAt:new Date().toISOString(),changes},null,2)+'\n');
writeFileSync(basePath,JSON.stringify(base,null,2)+'\n');writeFileSync(additionPath,JSON.stringify(additions,null,2)+'\n');
console.log(JSON.stringify({repairedQuestions:changes.length,scenarioId:s.id,version:s.version}));
