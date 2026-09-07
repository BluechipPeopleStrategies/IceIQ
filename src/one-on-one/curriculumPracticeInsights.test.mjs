import test from 'node:test';import assert from 'node:assert/strict';
import {buildCurriculumPracticeInsights} from './curriculumPracticeInsights.js';
const bank=[{id:'s',version:2,ageBand:'U11',title:'Read space',questions:[{id:'q',type:'choice',basis:'scene'},{id:'r',type:'explain',basis:'coaching'}]}];
const bindings={rows:[{scenarioId:'s',scenarioVersion:2,conceptIds:['space'],questionIds:['q','r'],questionHashes:{q:'current',r:'reflection'}}]};
const ledger={concepts:[{id:'space',name:'Time and space'},{id:'skate',name:'Skating'}]};
const manifest={questions:{q:{scenarioId:'s',scenarioVersion:2,contentHash:'current'},r:{scenarioId:'s',scenarioVersion:2,contentHash:'reflection'}}};
const e=(id,event,more={})=>({id,event,at:'2026-09-06T12:00:00.000Z',scenarioId:'s',scenarioVersion:2,questionId:'q',contentHash:'current',questionType:'choice',basis:'scene',...more});
const report=events=>buildCurriculumPracticeInsights({bank,bindings,ledger,manifest,snapshot:{version:1,events,droppedCount:0}});
test('current hash joins count flags, attempts and concept coverage without carrying stale answers',()=>{
 const r=report([e('v','question_view'),e('c','question_check',{attemptNumber:1,retry:false,sceneMatch:false}),e('f','question_flag',{category:'Unclear question'}),e('old','question_check',{contentHash:'old',attemptNumber:1,retry:false,sceneMatch:true})]);
 assert.equal(r.currentEvents,3);assert.equal(r.staleEvents,1);assert.equal(r.concepts[0].checks,1);assert.equal(r.concepts[0].flags,1);assert.equal(r.concepts[0].sceneMatchRate,null);assert.equal(r.priorities[0].questionId,'q');assert.equal(r.concepts[1].authoredQuestions,0);
});
test('duplicate IDs, optional skips and coaching answers cannot inflate scene-match rates',()=>{
 const flag=e('f','question_flag',{category:'Other'});const r=report([flag,flag,e('skip','reflection_skip',{questionId:'r',contentHash:'reflection',questionType:'explain',basis:'coaching'})]);
 assert.equal(r.concepts[0].flags,1);assert.equal(r.duplicateEvents,1);assert.equal(r.concepts[0].reflectionSkips,1);assert.equal(r.concepts[0].sceneChecks,0);
});
test('age filters and stale bindings leave missing mapping visible rather than attributing events',()=>{
 const r=buildCurriculumPracticeInsights({bank,bindings:{rows:[{...bindings.rows[0],scenarioVersion:1}]},ledger,manifest,snapshot:{version:1,events:[e('v','question_view')]}});
 assert.equal(r.unmappedScenes.length,1);assert.equal(r.concepts[0].views,0);
 const filtered=buildCurriculumPracticeInsights({bank,bindings,ledger,manifest,snapshot:{version:1,events:[e('v','question_view')]},age:'U9'});assert.equal(filtered.authoredQuestions,0);assert.equal(filtered.currentEvents,0);
});
test('empty samples expose null rates and no repair priorities',()=>{const r=report([]);assert.equal(r.concepts[0].sceneMatchRate,null);assert.deepEqual(r.priorities,[]);assert.equal(r.authoredQuestions,2)});
test('changed binding hash prevents concept attribution even for current events',()=>{
 const r=buildCurriculumPracticeInsights({bank,bindings:{rows:[{...bindings.rows[0],questionHashes:{q:'old',r:'reflection'}}]},ledger,manifest,snapshot:{version:1,events:[e('v','question_view')]}});
 assert.equal(r.currentEvents,1);assert.equal(r.concepts[0].views,0);assert.equal(r.unmappedScenes.length,1);
});
test('five scene checks expose only the observed rate and exports omit free text',()=>{
 const r=report(Array.from({length:5},(_,i)=>e('c'+i,'question_check',{attemptNumber:1,retry:false,sceneMatch:i<2,note:'private writing',sessionId:'private session'})));
 assert.equal(r.concepts[0].sceneMatchRate,.4);assert.equal(r.priorities.length,1);
 assert(!JSON.stringify(r).includes('private'));
});
