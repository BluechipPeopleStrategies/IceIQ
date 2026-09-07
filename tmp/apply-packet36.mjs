import fs from 'node:fs';
import {buildPlan,writePlan} from '../tools/apply-amended-repairs.mjs';
const dir='docs/factory/research/question-review';
const packet=Number(process.argv[2]);if(!Number.isInteger(packet)||packet<21||packet>36)throw Error('Expected packet21–34');
const folder=`${dir}/packet-${packet}`;
const receiptPath=`${folder}/independent-final-recheck.json`;
const plan=buildPlan({proposalPath:`${folder}/proposed-repairs.json`,receiptPath,write:true});
const edits=plan.proposal.packets.flatMap(p=>p.scenarios).map(s=>({scenarioId:s.scenarioId,before:plan.parts.bank.find(b=>b.id===s.scenarioId),after:s.replacement}));
const receipt={schemaVersion:1,author:'Codex root',status:'prepared-not-applied',sourceSnapshotId:plan.proposal.sourceSnapshotId,proposalSha256:plan.proposalSha256,sourceReturnFileHashes:plan.sourceReturnFileHashes,independentReview:receiptPath,changes:plan.changedRows.map(row=>{const e=edits.find(e=>e.scenarioId===row.scenarioId);return {scenarioId:row.scenarioId,questionId:row.questionId,beforeContentHash:row.beforeHash,afterContentHash:row.afterHash,before:e.before.questions.find(q=>q.id===row.questionId),after:e.after.questions.find(q=>q.id===row.questionId),reason:row.reason};}),sceneEdits:edits,limits:'Experimental content only. Independent AI review is not human coach approval or mastery admission.'};
const write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');
write(`${folder}/application-receipt.json`,receipt);
writePlan(plan);
receipt.status='applied-locally';receipt.appliedAt=new Date().toISOString();
write(`${folder}/application-receipt.json`,receipt);
write(`${dir}/repairs/claude-packet-${packet}-repairs.json`,receipt);
const independent=JSON.parse(fs.readFileSync(receiptPath));
write(`${dir}/followup/packet-${packet}-final-recheck.json`,{...independent,coverage:independent.questions.map(q=>({...q,contentHash:q.afterHash}))});
console.log(JSON.stringify({scenarios:edits.length,questions:plan.changedRows.length,proposalSha256:plan.proposalSha256}));

