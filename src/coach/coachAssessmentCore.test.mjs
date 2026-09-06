import test from 'node:test';
import assert from 'node:assert/strict';
import {DEMO_COACH_ID,assessmentCoverage,assessmentIssues,cleanSkillRatings,isDemoAssessment,restoreAssessment,sharedAssessmentNote,validObservation} from './coachAssessmentCore.js';
const skillIds=['s1','s2'],today='2026-09-05',one={date:'2026-09-01',context:'Practice',text:'Scanned before receiving during the wall drill.'},two={date:'2026-09-03',context:'Game',text:'Checked the middle before two pressured receptions.'};
test('private note sentinel and unknown values never become ratings or coverage',()=>{
 const raw={s1:'consistent',s2:'n/a',__general_notes__:'note',bad:'advanced'};
 assert.deepEqual(cleanSkillRatings(raw,skillIds),{s1:'consistent',s2:'n/a'});assert.deepEqual(assessmentCoverage(raw,skillIds),{observed:1,notObserved:1,total:2});
});
test('changed ratings need dated evidence and game-level ratings need repeated observations',()=>{
 const base={ratings:{s1:'proficient'},baseline:{},skillIds,today};
 assert.ok(assessmentIssues(base).length);assert.ok(assessmentIssues({...base,observations:{s1:[one]}}).length);
 assert.deepEqual(assessmentIssues({...base,observations:{s1:[one,two]}}),[]);
 assert.deepEqual(assessmentIssues({...base,baseline:{s1:'proficient'}}),[],'legacy ratings preserved without fabricated observations');
 assert.deepEqual(assessmentIssues({...base,ratings:{s1:'n/a'}}),[]);
});
test('future, empty or invalid-context observations cannot establish evidence',()=>{
 assert.equal(validObservation({...one,date:'2026-09-06'},today),false);assert.equal(validObservation({...one,text:'good'},today),false);assert.equal(validObservation({...one,context:'Guess'},today),false);
});
test('shared note contains only deliberate discussion text and observed examples; private note stays separate',()=>{
 const payload={version:1,ratings:{s1:'consistent'},notes:{s1:'Try scanning earlier.'},observations:{s1:[one]},privateNote:'Private coach context',publishedNotes:{}};
 const restored=restoreAssessment(JSON.stringify(payload),skillIds);assert.deepEqual(restored,payload);assert.ok(!sharedAssessmentNote(restored.notes.s1,restored.observations.s1).includes('Private'));assert.equal(restoreAssessment('{broken',skillIds),null);
});

test('first assessment opens without a device cache and only own unchanged published notes are unpacked',async()=>{const {editableAssessmentNotes}=await import('./coachAssessmentCore.js');assert.deepEqual(editableAssessmentNotes({},null,['s']),{});assert.deepEqual(editableAssessmentNotes({s:'new note'},null,['s']),{s:'new note'});const cached={notes:{s:'draft'},publishedNotes:{s:'published'}};assert.deepEqual(editableAssessmentNotes({s:'published'},cached,['s']),{s:'draft'});assert.deepEqual(editableAssessmentNotes({s:'another coach changed this'},cached,['s']),{s:'another coach changed this'});});
test('demo assessment identity uses exact known IDs rather than a prefix',()=>{
 assert.equal(isDemoAssessment({coachId:DEMO_COACH_ID,playerId:'random-live-id'}),true);
 assert.equal(isDemoAssessment({coachId:'live-coach',playerId:'dr1'}),true);
 assert.equal(isDemoAssessment({coachId:'live-coach',playerId:'drift-live-id'}),false);
 assert.equal(isDemoAssessment({coachId:'live-coach',playerId:'dr123'}),false);
});
