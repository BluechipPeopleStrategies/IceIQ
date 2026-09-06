import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {readBankFiles} from './experimental-bank-files.mjs';
import {questionContentHash} from './question-batch-core.mjs';
import {validateExperimentalBank} from '../src/one-on-one/experimentalBankCore.js';
const read=p=>JSON.parse(fs.readFileSync(p));
const bank=readBankFiles().bank,cal=read('docs/factory/calibration/skating-movement-2026-09-06.json').candidates;
test('composed bank and calibration candidates preserve schema and exact current manifest',()=>{
 assert.deepEqual(validateExperimentalBank(bank),[]);assert.deepEqual(validateExperimentalBank(cal),[]);
 const manifest=read('docs/factory/research/question-review/current-content-manifest.json').questions;
 for(const s of bank)for(const q of s.questions){assert.equal(manifest[q.id].scenarioVersion,s.version);assert.equal(manifest[q.id].contentHash,questionContentHash(s,q));}
});
test('five verified question payloads survived application and subsequent editorial pass',()=>{
 const staged=read('docs/factory/coaching-panel/pilot-2026-09-06/staged-repairs.json');
 for(const change of staged.directChanges){const s=[...bank,...cal].find(s=>s.id===change.scenarioId);assert.deepEqual(s.questions.find(q=>q.id===change.questionId),change.after);}
});
test('calibration choices have varied correct positions and no careless-action giveaway options',()=>{
 const choices=cal.flatMap(s=>s.questions.filter(q=>q.type==='choice'));
 assert.deepEqual([...new Set(choices.map(q=>q.options.findIndex(o=>q.answer.includes(o.id))))].sort(),[0,1,2]);
 for(const q of choices)for(const o of q.options)assert(!/without (looking|checking)|regardless|assume.*empty/i.test(o.text),q.id);
});
