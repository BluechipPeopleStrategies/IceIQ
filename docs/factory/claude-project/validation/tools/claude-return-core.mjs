import {createHash} from 'node:crypto';
import {validateExperimentalBank,makeScene} from '../src/one-on-one/experimentalBankCore.js';
import {isCoachRoutePoint} from '../src/one-on-one/coachRouteSurfaceInput.js';
import {questionContentHash,positionSubjectIssue,questionActorWarnings,validateQuestionBatch} from './question-batch-core.mjs';

export const scenarioSnapshotHash = s => s ? createHash('sha256').update(JSON.stringify(s)).digest('hex') : null;
const CHECKS=['roster','geometry','answer','feedback','age','sources','grammar'];
const text=value=>typeof value==='string'&&value.trim().length>0;

// Read-only: these are candidate repairs. Passing never imports or approves them.
export function validateClaudeReturn(report,snapshot,currentBank=snapshot?.scenarios){
 const errors=[],warnings=[];
 const fail=message=>errors.push(message);
 if(!report||report.schemaVersion!==1||report.kind!=='rinkreads-content-review'||report.status!=='draft-not-reviewed')return {errors:['Expected a draft-not-reviewed rinkreads-content-review envelope.'],warnings};
 if(!snapshot||report.snapshotId!==snapshot.snapshotId)return {errors:['Snapshot ID does not match this handoff.'],warnings};
 const packet=snapshot.packets?.find(p=>p.id===report.packetId);
 if(!packet)return {errors:['Unknown packetId.'],warnings};
 if(!['complete','partial'].includes(report.completion))fail('completion must be complete or partial.');
 if(!Array.isArray(report.coverage)||!Array.isArray(report.repairs)||!Array.isArray(report.remainingQuestionIds)||!Array.isArray(report.sourceChecks))return {errors:[...errors,'coverage, repairs, remainingQuestionIds and sourceChecks must be arrays.'],warnings};
 const originals=new Map(snapshot.scenarios.map(s=>[s.id,s]));
 const current=new Map((currentBank||[]).map(s=>[s.id,s]));
 const expected=new Map(packet.scenarioIds.flatMap(id=>originals.get(id)?.questions.map(q=>[q.id,{q,s:originals.get(id)}])||[]));
 const coverage=new Map(),repairs=new Map();
 for(const row of report.coverage){
  const original=expected.get(row?.questionId);
  if(!original||row.scenarioId!==original.s.id){fail(`Unknown question in packet: ${row?.questionId}`);continue;}
  if(coverage.has(row.questionId))fail(`Duplicate coverage: ${row.questionId}`);
  coverage.set(row.questionId,row);
  if(row.baseContentHash!==questionContentHash(original.s,original.q))fail(`Wrong base content hash: ${row.questionId}`);
  const live=current.get(original.s.id),liveQuestion=live?.questions?.find(q=>q.id===row.questionId);
  if(!liveQuestion||live.version!==original.s.version||questionContentHash(live,liveQuestion)!==row.baseContentHash)fail(`Current question changed after handoff: ${row.questionId}`);
  if(!['retain','repair','blocked'].includes(row.verdict)||!text(row.reason))fail(`Verdict and specific reason required: ${row.questionId}`);
  if(!CHECKS.every(k=>['pass','fail','blocked'].includes(row.checks?.[k])))fail(`Seven explicit checks required: ${row.questionId}`);
  if(row.verdict==='retain'&&!CHECKS.every(k=>row.checks?.[k]==='pass'))fail(`A retained question has failed or blocked checks: ${row.questionId}`);
  if(!['visible','stated','unproven'].every(k=>Array.isArray(row.sceneEvidence?.[k])&&row.sceneEvidence[k].every(text))||!row.sceneEvidence?.visible?.length)fail(`Visible/stated/unproven evidence ledger required: ${row.questionId}`);
  if(original.q.basis==='coaching'&&!text(row.alternative))fail(`Conditional alternative required: ${row.questionId}`);
  if(!Array.isArray(row.sourceUrls)||!row.sourceUrls.every(text))fail(`sourceUrls array required: ${row.questionId}`);
  if(row.checks?.sources==='pass'&&(!Array.isArray(row.sourceUrls)||!row.sourceUrls.length||!row.sourceUrls.every(url=>report.sourceChecks.some(s=>s?.url===url&&s.access==='read'))))fail(`Source pass lacks a recorded source read: ${row.questionId}`);
 }
 const remaining=new Set(report.remainingQuestionIds);
 if(remaining.size!==report.remainingQuestionIds.length)fail('Duplicate remaining question IDs.');
 for(const id of remaining)if(!expected.has(id)||coverage.has(id))fail(`Remaining ID is unknown or already reviewed: ${id}`);
 for(const id of expected.keys())if(!coverage.has(id)&&!remaining.has(id))fail(`Question disappeared from coverage: ${id}`);
 if(report.completion==='complete'&&(remaining.size||coverage.size!==expected.size))fail('Complete requires coverage of every assigned question.');
 if(!coverage.size)fail('Return at least one reviewed question; an empty template is not a completed review.');
 for(const proposal of report.repairs){
  const original=originals.get(proposal?.scenarioId),replacement=proposal?.replacement;
  if(!original||!packet.scenarioIds.includes(original.id)){fail(`Repair outside assigned packet: ${proposal?.scenarioId}`);continue;}
  if(repairs.has(original.id))fail(`Duplicate scenario repair: ${original.id}`);
  repairs.set(original.id,proposal);
  if(proposal.baseVersion!==original.version||proposal.baseScenarioHash!==scenarioSnapshotHash(original))fail(`Wrong repair baseline: ${original.id}`);
  if(scenarioSnapshotHash(current.get(original.id))!==scenarioSnapshotHash(original))fail(`Current repository scene changed after handoff: ${original.id}`);
  if(!replacement||replacement.id!==original.id||replacement.version!==original.version+1||replacement.ageBand!==original.ageBand){fail(`Replacement must preserve ID/age and increment version once: ${original.id}`);continue;}
  try{errors.push(...validateExperimentalBank([replacement]));}catch{fail(`Malformed replacement: ${original.id}`);continue;}
  if(!Array.isArray(replacement.questions))continue;
  if(JSON.stringify(replacement.questions.map(q=>q.id).sort())!==JSON.stringify(original.questions.map(q=>q.id).sort()))fail(`Repairs must preserve every existing question ID: ${original.id}`);
  const actualAffected=replacement.questions.filter(q=>{const old=original.questions.find(o=>o.id===q.id);return !old||questionContentHash(original,old)!==questionContentHash(replacement,q);}).map(q=>q.id).sort();
  if(!actualAffected.length)fail(`Repair only changes version or key order: ${original.id}`);
  if(!Array.isArray(proposal.affectedQuestionIds)||JSON.stringify([...proposal.affectedQuestionIds].sort())!==JSON.stringify(actualAffected))fail(`affectedQuestionIds must list every changed scene/question hash: ${original.id}`);
  for(const q of original.questions)if(!coverage.has(q.id))fail(`Review every linked question before returning a scenario repair: ${q.id}`);
  if(!Array.isArray(proposal.reasons)||!proposal.reasons.length||!proposal.reasons.every(r=>text(r.issue)&&text(r.change)&&text(r.evidence)&&Array.isArray(r.questionIds)&&r.questionIds.length&&r.questionIds.every(id=>original.questions.some(q=>q.id===id))))fail(`Specific issue, change, evidence and question IDs required: ${original.id}`);
  const finalReview=proposal.replacementReview;
  if(!finalReview||!['self-checked','not-checked'].includes(finalReview.status)||!Array.isArray(finalReview.coverage))fail(`Explicit replacementReview status and coverage required: ${original.id}`);
  else if(finalReview.status==='not-checked'){
   if(!text(finalReview.reason)||finalReview.coverage.length)fail(`Unrechecked replacement needs a reason and empty coverage: ${original.id}`);
   warnings.push(`Replacement not self-checked; hold for further work: ${original.id}`);
  }else{
   const checked=new Map(finalReview.coverage.map(r=>[r.questionId,r]));
   if(checked.size!==replacement.questions.length||checked.size!==finalReview.coverage.length)fail(`Self-check must cover every final question once: ${original.id}`);
   for(const q of replacement.questions){const row=checked.get(q.id);if(!row||row.contentHash!==questionContentHash(replacement,q)||!text(row.reason)||!CHECKS.every(k=>['pass','fail','blocked'].includes(row.checks?.[k])))fail(`Missing exact final-content self-check: ${q.id}`);}
  }
  for(const q of replacement.questions){const issue=positionSubjectIssue(replacement,q);if(issue)fail(issue);warnings.push(...questionActorWarnings(replacement,q));}
  try{if(!isCoachRoutePoint(makeScene(replacement).puck))fail(`Carried puck outside ice: ${original.id}`);}catch{fail(`Cannot construct scene: ${original.id}`);}
 }
 for(const row of coverage.values())if(row.verdict==='repair'&&!repairs.has(row.scenarioId))fail(`Repair verdict has no replacement: ${row.questionId}`);
 for(const source of report.sourceChecks)if(!text(source?.url)||!['read','unavailable'].includes(source.access)||!text(source.scope)||!text(source.checkedAt)||!Number.isFinite(Date.parse(source.checkedAt)))fail('Source checks need URL, access, dated check and scope.');
 if(report.newContent){const checked=validateQuestionBatch(report.newContent,currentBank);errors.push(...checked.errors);warnings.push(...checked.warnings);}
 return {errors,warnings,counts:{assigned:expected.size,reviewed:coverage.size,remaining:remaining.size,repairedScenarios:repairs.size},limits:['Structure and stale-content checks only. Independent hockey review and rendered-scene verification remain required. No files were imported or changed.']};
}
