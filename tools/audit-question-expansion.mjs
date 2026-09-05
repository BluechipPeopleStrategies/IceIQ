import {readdirSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {readBankFiles,readJson,projectRoot} from './experimental-bank-files.mjs';
import {questionContentHash} from './question-batch-core.mjs';
import {validateExperimentalBank} from '../src/one-on-one/experimentalBankCore.js';

const {bank,original,newScenarios,additions}=readBankFiles();
const root=join(projectRoot,'docs/factory/research/question-review'),directory=join(root,'expansion');
const files=readdirSync(directory);
const reports=suffix=>files.filter(f=>f.endsWith(suffix)).map(f=>({...readJson(join(directory,f)),file:f}));
const first=reports('-first.json'),second=reports('-second.json'),rechecks=reports('-recheck.json');
const snapshot=existsSync(join(directory,'manifest.json'))?new Map(readJson(join(directory,'manifest.json')).coverage.map(r=>[r.questionId,r])):new Map();
const repairRows=readdirSync(join(root,'repairs')).filter(f=>f.endsWith('.json')).flatMap(f=>readJson(join(root,'repairs',f)).changes||[]);
const recordedHashes=new Map();
for(const r of repairRows){const hashes=recordedHashes.get(r.questionId)||new Set();hashes.add(r.beforeContentHash);hashes.add(r.afterContentHash);recordedHashes.set(r.questionId,hashes);}
const originals=new Set(original.flatMap(s=>s.questions.map(q=>q.id)));
const added=bank.flatMap(s=>s.questions.filter(q=>!originals.has(q.id)).map(q=>({s,q,hash:questionContentHash(s,q)})));
const errors=validateExperimentalBank(bank,{U7:20,U9:30,U11:50,U13:50,U15:30,U18:20});
if(added.length!==1000||newScenarios.length!==100||additions.length!==100)errors.push('Expected 100 new scenes, 100 extensions and 1000 added questions.');
const index=reports=>{
 const map=new Map();for(const report of reports)for(const row of report.coverage||[]){
  if(map.has(row.questionId))errors.push(`Duplicate review: ${row.questionId}`);
  map.set(row.questionId,{...row,reviewer:report.reviewer,file:report.file});
 }return map;
};
const a=index(first),b=index(second),c=index(rechecks),addedIds=new Set(added.map(r=>r.q.id));
// Later owner-reported visual defects have separate receipts. Keep every
// historical review; supersede only with an independently reviewed repair hash.
for(const file of ['original-user-feedback-recheck.json','related-board-recheck.json']){
 const path=join(root,'followup',file);if(!existsSync(path))continue;
 const report=readJson(path);
 for(const row of report.coverage||[]){
  if(!addedIds.has(row.questionId))continue;
  if(!recordedHashes.get(row.questionId)?.has(row.contentHash))errors.push(`Owner repair recheck lacks before/after evidence: ${row.questionId}`);
  c.set(row.questionId,{...row,reviewer:report.reviewer,file:`followup/${file}`});
 }
}
for(const rows of [a,b,c])for(const id of rows.keys())if(!addedIds.has(id))errors.push(`Review references an unknown addition: ${id}`);
const findings=first.flatMap(r=>r.findings||[]),coverage=[];
for(const {s,q,hash} of added){
 const one=a.get(q.id),two=b.get(q.id),recheck=c.get(q.id);
 if(!one){errors.push(`Missing first review: ${q.id}`);continue;}
 if(snapshot.get(q.id)?.contentHash!==one.contentHash)errors.push(`First review does not match frozen authoring snapshot: ${q.id}`);
 if(!['pass','flag'].includes(one.status)||typeof one.highRisk!=='boolean')errors.push(`Invalid first-review status: ${q.id}`);
 if(one.status==='flag'&&!findings.some(f=>f.questionIds.includes(q.id)))errors.push(`Flag lacks finding: ${q.id}`);
 const required=one.status==='flag'||one.highRisk||one.contentHash!==hash;
 const effectiveSecond=two||recheck;
 if(required&&!effectiveSecond)errors.push(`Missing second review: ${q.id}`);
 if(effectiveSecond&&effectiveSecond.reviewer===one.reviewer)errors.push(`Second review not independent: ${q.id}`);
 if(required&&two&&two.contentHash!==one.contentHash&&two.contentHash!==hash&&!recordedHashes.get(q.id)?.has(two.contentHash))errors.push(`Second review has an unrelated content hash: ${q.id}`);
 if(two&&!['pass','revise','hold'].includes(two.decision))errors.push(`Invalid second-review decision: ${q.id}`);
 if(recheck&&!['pass','revise','hold'].includes(recheck.decision))errors.push(`Invalid recheck decision: ${q.id}`);
 const verifiedRepair=recheck||(one.contentHash!==hash&&two?.contentHash===hash?two:null);
 const current=[verifiedRepair,two,one].find(r=>r?.contentHash===hash);
 if(!current)errors.push(`No review of final content: ${q.id}`);
 if(one.contentHash!==hash&&(!verifiedRepair||verifiedRepair.contentHash!==hash||verifiedRepair.reviewer===one.reviewer))errors.push(`Edited question lacks independent recheck: ${q.id}`);
 const final=verifiedRepair?.contentHash===hash?verifiedRepair:two?.contentHash===hash?two:one;
 const open=final.decision?final.decision!=='pass':final.status!=='pass';
 coverage.push({questionId:q.id,scenarioId:s.id,scenarioVersion:s.version,contentHash:hash,firstReviewed:!!one,secondReviewed:!!effectiveSecond,revisionRechecked:!!verifiedRepair,status:open?'open-ai-finding':'no-open-ai-finding'});
}
// Historical reviews remain bound to the content actually reviewed. Later
// changes have separate before/after receipts and independent rechecks.
const old=readJson(join(root,'catalog-review.json'));
const followup=['mixed','u13'].flatMap(lane=>readJson(join(root,`followup/${lane}-proposals.json`)).entries);
if(followup.length!==55||new Set(followup.map(r=>r.questionId)).size!==55)errors.push('Follow-up must cover exactly55 unique questions.');
const oldQuestionMap=new Map(original.flatMap(s=>s.questions.map(q=>[q.id,{s,q}])));
const repairs=readJson(join(root,'repairs/root-early-repairs.json')).changes;
for(const row of followup){const source=oldQuestionMap.get(row.questionId),repair=repairs.find(r=>r.questionId===row.questionId);if(!source||(questionContentHash(source.s,source.q)!==row.contentHash&&repair?.beforeContentHash!==row.contentHash&&!recordedHashes.get(row.questionId)?.has(row.contentHash)))errors.push(`Stale follow-up: ${row.questionId}`);}
const kept=new Set(followup.filter(r=>r.decision==='keep').map(r=>r.questionId));
const oldCoverage=old.coverage.map(r=>kept.has(r.questionId)?{...r,status:'no-open-ai-finding',followupReviewed:true}:{...r,status:r.status==='revision-needed'?'open-ai-finding':r.status});
const oldFindings=old.findings.map(f=>({...f,questionIds:f.questionIds.filter(id=>!kept.has(id))})).filter(f=>f.questionIds.length);
const openIds=new Set(coverage.filter(r=>r.status==='open-ai-finding').map(r=>r.questionId));
const openFindings=findings.map(f=>({...f,questionIds:f.questionIds.filter(id=>openIds.has(id))})).filter(f=>f.questionIds.length);
for(const id of openIds)if(!openFindings.some(f=>f.questionIds.includes(id))){
 const row=c.get(id)||b.get(id),question=added.find(r=>r.q.id===id);
 if(!row?.reason)errors.push(`Open review lacks an actionable finding: ${id}`);
 else openFindings.push({id:`second-${id}`,severity:row.severity||'P2',questionIds:[id],scenarioIds:[question.s.id],category:'coaching',issue:row.reason,recommendedChange:row.recommendedChange||row.proposedQuestion?.prompt||'Revise the question to address the specific reviewer concern, then recheck it.'});
}
if(openFindings.length)errors.push('Resolve confirmed expansion findings before release.');
const allCoverage=[...oldCoverage,...coverage],allFindings=[...oldFindings,...openFindings];
const result={reviewKind:'AI coaching review; not human coach approval',reviewedAt:'2026-09-05',counts:{scenarios:bank.length,questions:bank.reduce((n,s)=>n+s.questions.length,0),firstPass:old.counts.firstPass+a.size,secondPass:old.counts.secondPass+coverage.filter(r=>r.secondReviewed).length,expansionQuestions:added.length,expansionHighRisk:[...a.values()].filter(r=>r.highRisk).length,revisionRechecks:old.counts.revisionRechecks+coverage.filter(r=>r.revisionRechecked).length,followupReviewed:followup.length,openQuestionFlags:allCoverage.filter(r=>r.status==='open-ai-finding').length},coverage:allCoverage,findings:allFindings,limits:['Historical600-question receipts retained;54 teaching-design suggestions received individual follow-up. Applied repairs have separate independent rechecks.','Every addition requires one full independent review, second review of flags/high-risk, and independent recheck after content edits.','AI content review is not human-coach approval or certification of every rendered camera view.']};
if(errors.length){console.error(JSON.stringify({errors:errors.slice(0,35),errorCount:errors.length,added:added.length,first:a.size,second:b.size},null,2));process.exitCode=1;}
else{writeFileSync(join(root,'combined-review.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result.counts));}
