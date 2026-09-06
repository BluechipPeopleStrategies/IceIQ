import test from 'node:test';import assert from 'node:assert/strict';
import {validateContextFeedback,mergeFeedbackHistory} from './coaching-feedback-plugin.mjs';
import {questionContentHash} from './question-batch-core.mjs';
const s={id:'s1',version:2,setup:{actors:[]},questions:[{id:'q1',prompt:'Where?',type:'choice'}]};
const payload={questionId:'q1',scenarioId:'s1',scenarioVersion:2,contentHash:questionContentHash(s,s.questions[0]),note:'Lane unclear',tags:['Answer questionable'],context:{answer:['a'],actors:[{id:'you',x:2,y:3,facing:0}],puck:{x:1,y:2},view:'3d'}};
test('exact question and position context preserved',()=>{const r=validateContextFeedback(payload,[s]);assert.equal(r.afterHash,payload.contentHash);assert.deepEqual(r.context,payload.context);assert.equal(r.status,'new');});
test('stale version/hash and unbounded notes rejected',()=>{for(const patch of [{scenarioVersion:1},{contentHash:'wrong'},{note:'x'.repeat(4001)}])assert.throws(()=>validateContextFeedback({...payload,...patch},[s]));});
test('history stays received until explicit disposition; unknown states do not imply changed',()=>{const notes=[{id:'n',status:'new',note:'a'}];assert.equal(mergeFeedbackHistory(notes,[])[0].status,'received');const r=mergeFeedbackHistory(notes,[{feedbackId:'n',status:'changed',summary:'Fixed',beforeHash:'old',afterHash:'new'}])[0];assert.equal(r.status,'changed');assert.equal(r.updates.length,1);assert.equal(mergeFeedbackHistory(notes,[{feedbackId:'n',status:'approved'}])[0].status,'received');});
