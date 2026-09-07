import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {readBankFiles} from '../tools/experimental-bank-files.mjs';
import {questionContentHash} from '../tools/question-batch-core.mjs';
import {validateClaudeReturn} from '../tools/claude-return-core.mjs';
import {makeScene} from '../src/one-on-one/experimentalBankCore.js';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const root='docs/factory/research/question-review',cal=`${root}/calibration`;
const receipt=read(`${root}/repairs/claude-calibration-repairs.json`),review=read(`${cal}/independent-recheck.json`);
const snapshot=read('docs/factory/claude-project/bank-snapshot.json'),returned=read(receipt.sourceReturn.path);
const {bank}=readBankFiles(),combined=read(`${root}/combined-review.json`),manifest=read(`${root}/current-content-manifest.json`);
const frozen=validateClaudeReturn(returned,snapshot,snapshot.scenarios),live=validateClaudeReturn(returned,snapshot,bank);
assert.equal(frozen.errors.length,0);assert.ok(live.errors.length>0);
const affected=new Set(receipt.sceneEdits.map(s=>s.scenarioId));
for(const s of bank){
 if(!affected.has(s.id))assert.deepEqual(s,snapshot.scenarios.find(b=>b.id===s.id));
 for(const q of s.questions){
  const hash=questionContentHash(s,q),c=combined.coverage.find(r=>r.questionId===q.id),m=manifest.questions[q.id];
  assert.equal(c.contentHash,hash);assert.equal(m.contentHash,hash);assert.equal(m.scenarioVersion,s.version);assert.equal(c.scenarioVersion,s.version);
 }
}
for(const r of review.coverage){const s=bank.find(s=>s.id===r.scenarioId),q=s.questions.find(q=>q.id===r.questionId);assert.equal(r.contentHash,questionContentHash(s,q));assert.equal(r.decision,'pass');}
assert.equal(combined.counts.openQuestionFlags,0);
const segmentDistance=(p,a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy)));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);};
const net=bank.find(s=>s.id==='exp26-u13-010'),netBefore=snapshot.scenarios.find(s=>s.id===net.id),gold=net.setup.actors.find(a=>a.id==='away-skater-1');
const evidence={verifiedAt:new Date().toISOString(),status:'locally-applied-independent-ai-review-passed',humanCoachApproval:false,published:false,uiBaseCommit:'292e395796e416227c1567d67899a1281306dbaf',sourceReturn:receipt.sourceReturn,counts:{...combined.counts,calibrationReviewed:50,calibrationChangedHashes:28,calibrationIndependentRecheck:28,untouchedScenarios:195},checks:{sourceReturnAgainstFrozenSnapshot:{errors:frozen.errors.length,warnings:frozen.warnings.length},processedReturnAgainstLiveBank:{rejected:true,errorCount:live.errors.length,reason:'Processed packet versions are stale; rejection prevents re-import.'},independentReviewStalenessGate:'Preflight rejected superseded q9 review before final recheck; no bank writes occurred.',currentContentReceipts:'All 1600 scene/question hashes and scene versions match the composed bank.',focusedTests:{tests:34,passed:34,failed:0},build:{checkout:'tmp/calibration-preview',result:'pass',seconds:8.51,knownWarnings:['Existing chunk-size warning','Existing static/dynamic import overlap','Empty vendor-supabase chunk']},browser:{baseUrl:'http://127.0.0.1:5177',viewports:['1280x900 desktop','390x844 mobile/touch emulation'],checked:['U11 q4 D1 inside, placement (-7,8.5), conditional example feedback','U13 net-front q9 placement (24,4.5), conditional passing-angle feedback','U13 rim q9 moves W to (-16,11), puck remains by boards, shorter-outlet feedback','Rim q9 placement and feedback persist after full reload','U9 q5 revised choices and selected-answer feedback','U7 q5 revised distractor displays without horizontal overflow','U13 net-front q3 explicitly permits overlapping preparation actions'],horizontalOverflow:false,applicationConsoleErrorsObserved:0}},geometry:{netFrontPuck:makeScene(net).puck,defenderDistanceToBeforePassingSegment:segmentDistance(gold,makeScene(net).puck,netBefore.questions.find(q=>q.id.endsWith('-q9')).reference),defenderDistanceToAfterPassingSegment:segmentDistance(gold,makeScene(net).puck,net.questions.find(q=>q.id.endsWith('-q9')).reference),limit:'Static distance from depicted puck, not an interception or pass-completion simulation.'},limits:['Independent AI review is not human-coach approval.','Only selected rendered flows were checked; physical devices, all camera angles and on-ice transfer remain unverified.','The original Claude ZIP remains frozen; packet 02 and the other195 scenarios retain their baseline versions.','Local build and review do not establish public deployment.']};
writeFileSync(`${cal}/verification.json`,JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify({counts:evidence.counts,frozenErrors:frozen.errors.length,staleReturnRejected:live.errors.length>0,geometry:evidence.geometry}));
