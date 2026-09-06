import test from 'node:test';import assert from 'node:assert/strict';import {auditChoiceQuality} from './question-choice-quality.mjs';
test('lexical candidates preserve keyed status and never certify an error',()=>{
 const q={id:'q',type:'choice',prompt:'Which rule?',options:[{id:'x',text:'Never leave the ice here'},{id:'y',text:'Go without looking'}],answer:['x']};
 const result=auditChoiceQuality([{id:'s',version:3,ageBand:'U9',questions:[q]}]);
 assert.equal(result.flaggedQuestions,1);assert.deepEqual(result.flags[0].options.map(o=>o.keyed),[true,false]);assert.equal(result.flags[0].status,'needs-content-review-not-proven-error');
 assert.deepEqual(result.answerPositionByAge[0].correctPositions,{1:1});
});
test('position counts follow displayed order and optional reflections do not enter audit',()=>{
 const result=auditChoiceQuality([{id:'s',version:1,ageBand:'U13',questions:[{id:'q',type:'choice',prompt:'Read',options:[{id:'b',text:'Hold'},{id:'a',text:'Pass'}],answer:['a']},{id:'r',type:'explain',prompt:'Never?'}]}]);
 assert.equal(result.flaggedQuestions,0);assert.deepEqual(result.answerPositionByAge[0].correctPositions,{2:1});assert.equal(result.questions,2);
});
