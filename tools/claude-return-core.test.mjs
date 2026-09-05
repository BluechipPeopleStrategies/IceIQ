import test from 'node:test';
import assert from 'node:assert/strict';
import {readBankFiles} from './experimental-bank-files.mjs';
import {questionContentHash} from './question-batch-core.mjs';
import {scenarioSnapshotHash,validateClaudeReturn} from './claude-return-core.mjs';
const scene=readBankFiles().bank[0];
const snapshot={snapshotId:'test',scenarios:[scene],packets:[{id:'p1',scenarioIds:[scene.id]}]};
function valid(){return {schemaVersion:1,kind:'rinkreads-content-review',status:'draft-not-reviewed',snapshotId:'test',packetId:'p1',completion:'complete',remainingQuestionIds:[],repairs:[],sourceChecks:[{url:scene.sources[0].url,access:'read',checkedAt:'2026-09-05T12:00:00.000Z',scope:'Test fixture only.'}],coverage:scene.questions.map(q=>({scenarioId:scene.id,questionId:q.id,baseContentHash:questionContentHash(scene,q),verdict:'retain',reason:'Fixture only: all explicit checks present.',sceneEvidence:{visible:['Test fixture visible cue.'],stated:[],unproven:[]},alternative:'Fixture: an alternative depends on pressure.',sourceUrls:[scene.sources[0].url],checks:Object.fromEntries(['roster','geometry','answer','feedback','age','sources','grammar'].map(k=>[k,'pass']))}))};}
test('return rejects missing coverage, false completion, duplicate rows and stale hashes',()=>{
 assert.deepEqual(validateClaudeReturn(valid(),snapshot).errors,[]);
 const missing=valid();missing.coverage.pop();assert.match(validateClaudeReturn(missing,snapshot).errors.join(' '),/disappeared|Complete/);
 const duplicate=valid();duplicate.coverage.push(duplicate.coverage[0]);assert.match(validateClaudeReturn(duplicate,snapshot).errors.join(' '),/Duplicate/);
 const stale=valid();stale.coverage[0].baseContentHash='wrong';assert.match(validateClaudeReturn(stale,snapshot).errors.join(' '),/hash/);
 const failed=valid();failed.coverage[0].checks.geometry='fail';assert.match(validateClaudeReturn(failed,snapshot).errors.join(' '),/retained/);
});
test('scene repairs include all linked questions and cannot overwrite a newer scene',()=>{
 const report=valid(),replacement=structuredClone(scene);replacement.version++;replacement.briefing+=' Read the opening positions.';
 report.repairs.push({scenarioId:scene.id,baseVersion:scene.version,baseScenarioHash:scenarioSnapshotHash(scene),replacement,affectedQuestionIds:scene.questions.map(q=>q.id),replacementReview:{status:'not-checked',reason:'Fixture candidate awaiting check.',coverage:[]},reasons:[{questionIds:[scene.questions[0].id],issue:'Fixture wording',change:'Clarify opening',evidence:'Fixture evidence'}]});
 assert.deepEqual(validateClaudeReturn(report,snapshot).errors,[]);
 report.repairs[0].affectedQuestionIds.pop();assert.match(validateClaudeReturn(report,snapshot).errors.join(' '),/every changed/);
 const changed=structuredClone(scene);changed.version++;
 assert.match(validateClaudeReturn(report,snapshot,[changed]).errors.join(' '),/changed after handoff/);
});
test('bare pass labels and source claims without reads cannot count as evidence',()=>{
 const report=valid();delete report.coverage[0].sceneEvidence;report.sourceChecks=[];
 const errors=validateClaudeReturn(report,snapshot).errors.join(' ');assert.match(errors,/evidence ledger/);assert.match(errors,/source read/);
 const changed=structuredClone(scene);changed.version++;assert.match(validateClaudeReturn(valid(),snapshot,[changed]).errors.join(' '),/Current question changed/);
});
test('partial review explicitly accounts for unreviewed questions and never imports',()=>{
 const report=valid();report.completion='partial';report.remainingQuestionIds=report.coverage.slice(1).map(r=>r.questionId);report.coverage=report.coverage.slice(0,1);
 const before=JSON.stringify(snapshot);assert.deepEqual(validateClaudeReturn(report,snapshot).errors,[]);assert.equal(JSON.stringify(snapshot),before);
 report.status='approved';assert.match(validateClaudeReturn(report,snapshot).errors.join(' '),/draft-not-reviewed/);
});
