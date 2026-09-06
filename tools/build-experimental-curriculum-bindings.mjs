import {readFileSync,writeFileSync} from 'node:fs';import assert from 'node:assert/strict';
import {readBankFiles} from './experimental-bank-files.mjs';
import {questionContentHash} from './question-batch-core.mjs';
const bank=readBankFiles().bank,ledger=JSON.parse(readFileSync('src/data/curriculum-ledger.json'));
const valid=new Set(ledger.concepts.map(c=>c.id));
const rows=['junior','senior'].flatMap(n=>JSON.parse(readFileSync(`docs/factory/curriculum-bindings/${n}.json`)));
assert.equal(rows.length,200);assert.equal(new Set(rows.map(r=>r.scenarioId)).size,200);
for(const s of bank){const r=rows.find(r=>r.scenarioId===s.id);assert(r,s.id);assert.equal(r.scenarioVersion,s.version);assert.deepEqual([...r.questionIds].sort(),s.questions.map(q=>q.id).sort());assert(r.conceptIds.every(id=>valid.has(id)));assert.equal(new Set(r.conceptIds).size,r.conceptIds.length);assert(r.rationale.length>20);assert(r.conceptIds.length||r.status==='needs-taxonomy-review');r.questionHashes=Object.fromEntries(s.questions.map(q=>[q.id,questionContentHash(s,q)]));}
const payload={schemaVersion:1,generatedAt:new Date().toISOString(),status:'provisional-scene-level-mapping-not-curriculum-admission',scope:'Bindings describe the learner task in a scene, not every question as a separate skill assessment.',rows};
writeFileSync('src/one-on-one/experimentalCurriculumBindings.json',JSON.stringify(payload,null,2)+'\n');
console.log(JSON.stringify({scenes:rows.length,unmapped:rows.filter(r=>!r.conceptIds.length).map(r=>r.scenarioId),conceptCounts:Object.fromEntries(ledger.concepts.map(c=>[c.id,rows.filter(r=>r.conceptIds.includes(c.id)).length]))},null,2));
