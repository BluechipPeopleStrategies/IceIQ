import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {readBankFiles,projectRoot} from './experimental-bank-files.mjs';
import {prepareReviewedRepairs} from './reviewed-question-repairs.mjs';
import {composeExperimentalBank} from '../src/one-on-one/experimentalExpansionCore.js';

const [packetPath,flag]=process.argv.slice(2);
assert.equal(path.resolve(process.cwd()).toLowerCase(),path.resolve(projectRoot).toLowerCase(),'Run from this tool\'s repository root');
assert(packetPath && (!flag || flag==='--apply'),'Usage: node tools/apply-reviewed-question-repairs.mjs adjudicated-packet.json [--apply]');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const pack=read(packetPath);
assert.equal(pack.status,'root-adjudicated-experimental-repairs');
assert.equal(pack.humanCoachApproval,false);
const bank=readBankFiles().bank;
const next=prepareReviewedRepairs(bank,pack.changes,pack.adjudications);
const receiptPath=path.join(path.dirname(packetPath),'application-receipt.json');
assert(!fs.existsSync(receiptPath),'Receipt exists; do not reapply');
const changes=new Map(pack.changes.map(c=>[c.questionId,c]));
const versions=new Map(pack.changes.map(c=>[c.scenarioId,c.toVersion]));
const outputs=new Map();
const originals=[],newScenes=[],additions=[];
const owners=new Map();
for(const age of ['u7','u9','u11','u13','u15','u18']) {
 for(const [file,kind] of [[`src/one-on-one/experimental-bank/${age}.json`,'original'],[`src/one-on-one/experimental-expansion/${age}-scenarios.json`,'new'],[`src/one-on-one/experimental-expansion/${age}-additions.json`,'additions']]) {
  if(!fs.existsSync(file))continue;
  const rows=read(file);let changed=false;
  for(const s of rows) {
   const id=kind==='additions'?s.scenarioId:s.id;
   if(!versions.has(id))continue;
   s[kind==='additions'?'scenarioVersion':'version']=versions.get(id);changed=true;
   s.questions=s.questions.map(q=>{
    if(!changes.has(q.id))return q;
    assert.equal(changes.get(q.id).scenarioId,id,'Question belongs to another scenario');
    assert(!owners.has(q.id),`Duplicate source owner: ${q.id}`);
    owners.set(q.id,file);return changes.get(q.id).after;
   });
  }
  (kind==='original'?originals:kind==='new'?newScenes:additions).push(...rows);
  if(changed)outputs.set(file,JSON.stringify(rows,null,2)+'\n');
 }
}
assert.equal(owners.size,changes.size,'Every repair must have one source owner');
// readBankFiles loads expansion files alphabetically, independently of age order.
const bankOrder=new Map(bank.map((s,index)=>[s.id,index]));
newScenes.sort((a,b)=>bankOrder.get(a.id)-bankOrder.get(b.id));
assert.deepEqual(composeExperimentalBank(originals,newScenes,additions),next,'Source routing differs from validated result');
for(const band of ['junior','senior']) {
 const file=`docs/factory/curriculum-bindings/${band}.json`,rows=read(file);let changed=false;
 for(const row of rows)if(versions.has(row.scenarioId)){row.scenarioVersion=versions.get(row.scenarioId);changed=true;}
 if(changed)outputs.set(file,JSON.stringify(rows,null,2)+'\n');
}
console.log(JSON.stringify({mode:flag?'apply':'dry-run',questions:changes.size,scenarios:versions.size,files:[...outputs.keys()]}));
if(flag==='--apply') {
 const backups=new Map([...outputs.keys()].map(file=>[file,fs.readFileSync(file)]));
 let receiptCreated=false;
 try {
  for(const [file,content] of outputs)fs.writeFileSync(file,content);
  assert.deepEqual(readBankFiles().bank,next,'Read-back differs');
  const fd=fs.openSync(receiptPath,'wx');receiptCreated=true;
  try{fs.writeFileSync(fd,JSON.stringify({appliedAt:new Date().toISOString(),humanCoachApproval:false,packet:path.basename(packetPath),changes:pack.changes,adjudications:pack.adjudications},null,2)+'\n');}finally{fs.closeSync(fd);}
 } catch(error) {
  // Best-effort restoration, not a crash-safe filesystem transaction.
  const restoration=[];
  for(const [file,content] of backups)try{fs.writeFileSync(file,content);}catch(e){restoration.push(`${file}: ${e.message}`);}
  if(receiptCreated)try{fs.unlinkSync(receiptPath);}catch(e){restoration.push(`${receiptPath}: ${e.message}`);}
  if(restoration.length)throw new AggregateError([error,...restoration],'Apply failed; some files need restoration');
  throw error;
 }
}
