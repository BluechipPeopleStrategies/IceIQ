import test from 'node:test';
import assert from 'node:assert/strict';
import {composeExperimentalBank} from './experimentalExpansionCore.js';
import {restoreAttempts} from './experimentalBankCore.js';
const q={id:'old-q1',type:'choice',options:[{id:'a',text:'One'},{id:'b',text:'Two'}],answer:['a']};
const base=[{id:'old',version:2,ageBand:'U11',questions:[q]}];
const addition={scenarioId:'old',scenarioVersion:2,questions:[{...q,id:'old-q7'}]};
test('additions preserve old question objects, versions and saved responses without mutation',()=>{
 const copy=structuredClone(base),bank=composeExperimentalBank(base,[],[addition]);
 assert.deepEqual(base,copy);assert.deepEqual(bank[0].questions[0],q);assert.equal(bank[0].version,2);
 const saved={old:{version:2,answers:{'old-q1':{value:['a'],reviewed:true}}}};
 assert.deepEqual(restoreAttempts(JSON.stringify(saved),bank).records,saved);
});
test('stale additions and collisions fail before replacing content',()=>{
 assert.throws(()=>composeExperimentalBank(base,[],[{...addition,scenarioVersion:1}]),/Stale/);
 assert.throws(()=>composeExperimentalBank(base,[],[{...addition,scenarioId:'missing'}]),/Unknown/);
 assert.throws(()=>composeExperimentalBank(base,[],[{...addition,questions:[q]}]),/already exists/);
 assert.throws(()=>composeExperimentalBank(base,[],[addition,addition]),/Repeated/);
 assert.throws(()=>composeExperimentalBank(base,base),/Scenario ID/);
 assert.throws(()=>composeExperimentalBank(base,[{...base[0],id:'new'}]),/Question ID/);
});
