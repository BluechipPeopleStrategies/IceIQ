import test from 'node:test';import assert from 'node:assert/strict';
import {presentChoices,choiceSeed,presentationMetadata} from './choicePresentation.js';
import {createPracticeAnalyticsStore,restorePracticeAnalytics} from './experimentalPracticeAnalytics.js';
const q={id:'q',type:'choice',options:[{id:'a',text:'Pass'},{id:'b',text:'Carry'},{id:'c',text:'Hold'}],answer:['a']};
const args={contentHash:'hash',seed:'seed'};
test('stable, answer-independent ordering preserves source and every ID',()=>{const before=JSON.stringify(q),result=presentChoices(q,args);assert.deepEqual(result,presentChoices({...q,answer:['c']},args));assert.deepEqual(result,presentChoices(q,args));assert.equal(JSON.stringify(q),before);assert.notEqual(result,q.options);assert.deepEqual(result.map(o=>o.id).sort(),['a','b','c']);});
test('sequence and explicit exceptions preserve order',()=>{assert.deepEqual(presentChoices({...q,type:'sequence'},args),q.options);assert.deepEqual(presentChoices(q,{...args,preserveOrder:true}),q.options);});
test('fixed seed cohort does not heavily favour one position',()=>{const counts=[0,0,0];for(let i=0;i<3000;i++)counts[presentChoices(q,{...args,seed:'seed-'+i}).findIndex(o=>o.id==='a')]++;for(const count of counts)assert(count>850&&count<1150,JSON.stringify(counts));});
test('seed survives storage reads and has stable fallback when storage throws',()=>{const map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};assert.equal(choiceSeed(storage),choiceSeed(storage));const broken={getItem(){throw Error()},setItem(){throw Error()}};assert.equal(choiceSeed(broken),choiceSeed(broken));});
test('presentation metadata rejects foreign, missing and duplicated IDs',()=>{assert.deepEqual(presentationMetadata(q,[q.options[1],q.options[0],q.options[2]]).shownOptionIds,['b','a','c']);for(const options of [[q.options[0]],[q.options[0],q.options[0],q.options[2]],[...q.options,{id:'bad'}]])assert.deepEqual(presentationMetadata(q,options),{});});
test('analytics retains presentation, rejects malformed order, and reads old events',()=>{
 const store=createPracticeAnalyticsStore(),meta={scenarioId:'s',scenarioVersion:1,questionId:'q',basis:'coaching',questionType:'choice',questionOptionIds:['a','b','c']};
 store.recordQuestionView(meta);store.recordQuestionCheck({...meta,...presentationMetadata(q,q.options)});
 const restored=restorePracticeAnalytics(store.exportJSON());assert.equal(restored.events.length,2);assert.equal(restored.events[0].shownOptionIds,undefined);assert.deepEqual(restored.events[1].shownOptionIds,['a','b','c']);assert.equal(restored.events[1].sceneMatch,undefined);
 for(const ids of [['a','a'],['foreign-a','foreign-b','foreign-c'],Array(21).fill('a')])store.recordQuestionCheck({...meta,shownOptionIds:ids,choiceOrderVersion:'choice-order-v1'});
 assert.equal(store.getState().events.length,2);
});
