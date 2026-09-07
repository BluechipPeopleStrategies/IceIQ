import test from 'node:test';
import assert from 'node:assert/strict';
import {readBankFiles,readJson,projectRoot} from './experimental-bank-files.mjs';
import {validateExperimentalBank} from '../src/one-on-one/experimentalBankCore.js';
import {questionContentHash} from './question-batch-core.mjs';
test('owner-authorized companion release preserves reviewed content and manifest identity',()=>{
 const candidates=readJson(`${projectRoot}/docs/factory/companion-lessons-8/scenes.json`);
 const {bank}=readBankFiles();const manifest=readJson(`${projectRoot}/docs/factory/research/question-review/current-content-manifest.json`).questions;
 assert.deepEqual(validateExperimentalBank(bank),[]);assert.equal(bank.length,208);assert.equal(bank.flatMap(s=>s.questions).length,1648);
 for(const s of candidates){assert.deepEqual(bank.find(b=>b.id===s.id),s);for(const q of s.questions)assert.equal(manifest[q.id].contentHash,questionContentHash(s,q));}
 assert.equal(readBankFiles({originalOnly:true}).bank.length,100);
});
