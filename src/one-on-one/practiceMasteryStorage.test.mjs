import test from 'node:test';
import assert from 'node:assert/strict';
import { savePracticeEvidence } from './practiceMasteryStorage.js';
import { masteryStorageKey } from './spacedMasteryCore.js';

const attempt = { questionId:'one', revision:'v1', ageBand:'U11', concept:'scanning', format:'mc', origin:'existing-served', eligible:true, correct:true };
const now = '2026-09-01T18:00:00Z';
function storage() {
  const values = new Map(), writes = [];
  return {values, writes, getItem:key=>values.get(key)??null, setItem:(key,value)=>{writes.push(key);values.set(key,value);}};
}
test('each answer merges the latest player ledger and repeats cannot replace a first miss',()=>{
  const store=storage();
  savePracticeEvidence({playerId:'a',attempt:{...attempt,correct:false},storage:store,now});
  savePracticeEvidence({playerId:'a',attempt:{...attempt,questionId:'two'},storage:store,now});
  const retry=savePracticeEvidence({playerId:'a',attempt,storage:store,now});
  assert.equal(retry.status,'saved');
  assert.equal(retry.ledger.attempts.length,2);
  assert.equal(retry.ledger.attempts[0].correct,false);
  assert.equal(store.writes.length,2);
  const other=savePracticeEvidence({playerId:'b',attempt,storage:store,now});
  assert.equal(other.ledger.attempts.length,1);
  assert.equal(JSON.parse(store.values.get(masteryStorageKey('a'))).attempts.length,2);
});
test('unreadable or invalid stored history is preserved and reported unavailable',()=>{
  for(const raw of ['{','null',JSON.stringify({version:1,timeZone:'Invalid/Zone',attempts:[]}),JSON.stringify({version:9,attempts:[]})]) {
    const store=storage();store.values.set(masteryStorageKey('a'),raw);
    assert.equal(savePracticeEvidence({playerId:'a',attempt,storage:store,now}).status,'unavailable');
    assert.equal(store.writes.length,0);
    assert.equal(store.values.get(masteryStorageKey('a')),raw);
  }
  assert.equal(savePracticeEvidence({playerId:'a',attempt,now,storage:{getItem(){throw Error('denied')}}}).status,'unavailable');
});
test('failed writes never claim saved and experimental answers never write evidence',()=>{
  const store=storage();
  assert.equal(savePracticeEvidence({playerId:'a',attempt:{...attempt,eligible:false},storage:store,now}).status,'ineligible');
  assert.equal(store.writes.length,0);
  const result=savePracticeEvidence({playerId:'a',attempt,now,storage:{getItem(){return null},setItem(){throw Error('full')}}});
  assert.equal(result.status,'unavailable');
});
