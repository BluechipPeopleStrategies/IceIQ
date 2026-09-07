import test from 'node:test';import assert from 'node:assert/strict';
import {recordFlag,restoreReview,reviewIdentityMatches,reviewItemKey,questionDraftIssues,questionReviewIdentity} from './questionReviewCore.js';
import { readFileSync } from 'node:fs';
test('flags keep exact question version and response without promoting a draft',()=>{const s={id:'s1',version:2},q={id:'q1'};const state=recordFlag(restoreReview(null),s,q,{category:'Unclear question',note:'Two possible readings',response:['b']},'now');assert.deepEqual(state.items[reviewItemKey(s,q)].response,['b']);assert.equal(state.items[reviewItemKey(s,q)].status,'open');assert.equal(state.items[reviewItemKey({...s,version:3},q)],undefined);assert.deepEqual(restoreReview(JSON.stringify(state)),state);});
test('revision check rejects stale identity and answer IDs',()=>{const q={id:'q',type:'choice',prompt:'Where?',explanation:'Here',options:[{id:'a',text:'A'},{id:'b',text:'B'}],answer:['a']};assert.deepEqual(questionDraftIssues(q,q),[]);assert.ok(questionDraftIssues(q,{...q,answer:['z']}).length);assert.ok(questionDraftIssues(q,{...q,id:'other'}).length);assert.deepEqual(restoreReview('{broken'),{version:1,items:{}});});

test('changing a draft format requires a compatible explicit answer set',()=>{const q={id:'q',type:'sequence',prompt:'Order',explanation:'Suggested',options:[{id:'a',text:'A'},{id:'b',text:'B'}],answer:['a','b']};assert.deepEqual(questionDraftIssues(q,{...q,type:'multi'}),[]);assert.ok(questionDraftIssues(q,{...q,type:'choice'}).length);assert.ok(questionDraftIssues(q,{...q,answer:['a','a']}).length);});

test('review records bind to the exact manifest hash and reject stale receipts',()=>{
 const scenario={id:'s1',version:2},question={id:'q1'},identity={scenarioId:'s1',scenarioVersion:2,questionId:'q1',contentHash:'hash-a'};
 const state=recordFlag(restoreReview(null),scenario,question,{category:'Unclear question',note:'Needs a clearer cue'},'now',identity);
 const item=state.items[reviewItemKey(scenario,question)];
 assert.equal(item.contentHash,'hash-a');
 assert.equal(reviewIdentityMatches(item,identity),true);
 assert.equal(reviewIdentityMatches(item,{...identity,contentHash:'hash-b'}),false);
 assert.deepEqual(restoreReview(JSON.stringify(state)),state);
});

test('flagging revised content never transfers a draft from an older receipt',()=>{
 const scenario={id:'s1',version:2},question={id:'q1'},identity={scenarioId:'s1',scenarioVersion:2,questionId:'q1',contentHash:'new-hash'};
 const key=reviewItemKey(scenario,question);
 const state={version:1,items:{[key]:{...identity,contentHash:'old-hash',draft:{prompt:'Old text'}}}};
 const updated=recordFlag(state,scenario,question,{category:'Unclear question',note:'A new concern'},'now',identity);
 assert.equal(updated.items[key].draft,undefined);
 assert.equal(updated.items[key].contentHash,'new-hash');
 assert.equal(state.items[key].draft.prompt,'Old text');
});

test('the actual manifest format binds a saved flag and rejects a newer scene version',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../../docs/factory/research/question-review/current-content-manifest.json',import.meta.url)));
 const question={id:'exp26-u13-001-q1'},scenario={id:'exp26-u13-001',version:2};
 const identity=questionReviewIdentity(scenario,question,manifest);
 assert.equal(identity.questionId,question.id);
 const state=recordFlag(restoreReview(null),scenario,question,{category:'Unclear question',note:'Review this cue'},'now',identity);
 assert.equal(reviewIdentityMatches(state.items[reviewItemKey(scenario,question)],identity),true);
 assert.equal(questionReviewIdentity({...scenario,version:3},question,manifest),null);
 assert.equal(reviewIdentityMatches({},{}),false);
});
