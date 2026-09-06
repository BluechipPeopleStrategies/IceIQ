import fs from 'node:fs';
import assert from 'node:assert/strict';
import {readBankFiles} from './experimental-bank-files.mjs';
import {questionContentHash} from './question-batch-core.mjs';
const dir='docs/factory/coaching-panel/pilot-2026-09-06/';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const pack=read(dir+'staged-repairs.json'),bank=readBankFiles().bank;
const calPath='docs/factory/calibration/skating-movement-2026-09-06.json',cal=read(calPath);
const basePath='src/one-on-one/experimental-bank/u11.json',base=read(basePath);
const extraPath='src/one-on-one/experimental-expansion/u11-additions.json',extra=read(extraPath);
assert(!fs.existsSync(dir+'application-receipt.json'),'Already applied; do not rewrite the receipt.');
for(const c of pack.directChanges){
 const s=[...bank,...cal.candidates].find(s=>s.id===c.scenarioId);
 assert.equal(s.version,c.fromVersion);assert.equal(questionContentHash(s,s.questions.find(q=>q.id===c.questionId)),c.beforeHash);
 const after=pack.scenarios.find(s=>s.id===c.scenarioId);
 assert.equal(questionContentHash(after,after.questions.find(q=>q.id===c.questionId)),c.afterHash);
}
for(const c of pack.directChanges){
 const s=base.find(s=>s.id===c.scenarioId)||cal.candidates.find(s=>s.id===c.scenarioId);
 const addition=extra.find(a=>a.scenarioId===c.scenarioId);
 const owner=s.questions.some(q=>q.id===c.questionId)?s:addition;
 owner.questions=owner.questions.map(q=>q.id===c.questionId?c.after:q);
 s.version=c.toVersion;if(addition)addition.scenarioVersion=c.toVersion;
}
const bindingsPath='docs/factory/curriculum-bindings/junior.json',bindings=read(bindingsPath);
bindings.find(r=>r.scenarioId==='exp26-u11-001').scenarioVersion=4;
for(const [p,v] of [[basePath,base],[extraPath,extra],[calPath,cal],[bindingsPath,bindings]])fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const applied=[...readBankFiles().bank,...read(calPath).candidates];
for(const c of pack.directChanges){const s=applied.find(s=>s.id===c.scenarioId);assert.equal(questionContentHash(s,s.questions.find(q=>q.id===c.questionId)),c.afterHash);}
fs.writeFileSync(dir+'application-receipt.json',JSON.stringify({appliedAt:new Date().toISOString(),humanCoachApproval:false,changes:pack.directChanges.map(({before,after,...identity})=>identity)},null,2)+'\n');
console.log('Applied and verified all five exact repairs. Historical review files preserved.');
