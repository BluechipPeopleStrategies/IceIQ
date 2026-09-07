import fs from 'node:fs';
import assert from 'node:assert/strict';
import {questionContentHash} from '../../../../tools/question-batch-core.mjs';
import {readBankFiles} from '../../../../tools/experimental-bank-files.mjs';
import {validateExperimentalBank} from '../../../../src/one-on-one/experimentalBankCore.js';
import {validatePanelReviews} from '../../../../tools/coaching-panel-review.mjs';
const base=new URL('./',import.meta.url);
const read=n=>JSON.parse(fs.readFileSync(new URL(n,base)));
const write=(n,v)=>fs.writeFileSync(new URL(n,base),JSON.stringify(v,null,2)+'\n');
const manifest=read('manifest.json'), snapshot=read('snapshot.json'), lead=read('lead-review.json'), second=read('second-review.json'), amendment=read('second-review-amendment.json'), draft=read('staged-repairs.json'), final=read('final-payload-review.json');
const receipts=validatePanelReviews(manifest,lead,second); assert.deepEqual(receipts.errors,[]);
const live=[...read('../..//calibration/skating-movement-2026-09-06.json').candidates,readBankFiles().bank.find(s=>s.id==='exp26-u11-001')];
for(const row of manifest.questions){const s=live.find(s=>s.id===row.scenarioId);assert.equal(s.version,row.scenarioVersion);assert.equal(questionContentHash(s,s.questions.find(q=>q.id===row.questionId)),row.hash);}
const combined=snapshot.scenarios.map(s=>draft.scenarios.find(d=>d.id===s.id)||s);assert.deepEqual(validateExperimentalBank(combined),[]);
for(const row of draft.directChanges){const s=combined.find(s=>s.id===row.scenarioId),q=s.questions.find(q=>q.id===row.questionId);assert.equal(questionContentHash(s,q),row.afterHash);const f=final.rows.find(r=>r.questionId===row.questionId);assert.equal(f.afterHash,row.afterHash);assert.equal(f.verdict,'retain');}
for(const row of draft.affectedQuestionVersions){const s=combined.find(s=>s.id===row.scenarioId);assert.equal(questionContentHash(s,s.questions.find(q=>q.id===row.questionId)),row.contentHash);}
const rows=manifest.questions.map(q=>{const l=lead.rows.find(r=>r.questionId===q.questionId),s=second.rows.find(r=>r.questionId===q.questionId),a=amendment.rows.find(r=>r.questionId===q.questionId);return{questionId:q.questionId,contentHash:q.hash,leadVerdict:l.verdict,originalSecondVerdict:s.verdict,effectiveVerdict:(a||s).verdict,amendment:a?'second-review-amendment.json':null,disposition:draft.directChanges.some(r=>r.questionId===q.questionId)?'repair-staged-not-applied':'retain-within-pilot-scope-not-human-approved'};});
assert.equal(rows.filter(r=>r.effectiveVerdict==='repair').length,5);
write('adjudication.json',{status:'pilot-complete-repairs-staged',rows,totals:{questions:34,retain:29,repair:5},modelCalibration:{luna:{qualified:false,rawHistoricalVerdicts:{repair:5,retain:3},note:'The raw verdict counts contradict the lead self-summary of 4/4; some detections were partial. Current evidence also contained role and coordinate errors. All 34 questions received stronger review.'},sol:{historicalDetected:7,historicalPartial:1,historicalMissed:0,note:'One current arithmetic false flag was withdrawn after root recomputation. Known-case results do not establish general accuracy.'}},batchHolds:['Predictable answer positions and repeated cue patterns','Distractors with obvious verbal clues','Static pivot and pace titles exceed demonstrated skills'],humanCoachApproval:false,liveBankApplied:false});
write('verification.json',{verifiedAt:new Date().toISOString(),receiptValidation:receipts,unchangedSourceQuestions:34,stagedSchemaErrors:[],directHashesVerified:5,affectedHashesVerified:16,independentPayloadRetained:5,renderVerification:'No new browser/render test in this pilot; previous release evidence referenced in render-evidence.md.',scope:'Structural checks and bounded AI adjudication; not human approval or deployment.'});
console.log('Verified 34 unchanged source questions, 5 staged repairs, 16 affected hashes.');
