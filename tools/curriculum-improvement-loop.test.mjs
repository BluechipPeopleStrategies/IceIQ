import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readBankFiles} from './experimental-bank-files.mjs';
import {questionContentHash} from './question-batch-core.mjs';
import {validateExperimentalBank} from '../src/one-on-one/experimentalBankCore.js';
import {isCoachRoutePoint} from '../src/one-on-one/coachRouteSurfaceInput.js';
const json=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
const bank=readBankFiles().bank;
const bindings=json('src/one-on-one/experimentalCurriculumBindings.json');
const pack=json('docs/factory/calibration/skating-movement-2026-09-06.json');
test('every live scene has an exact-content binding and taxonomy holds remain explicit',()=>{
 assert.equal(bindings.rows.length,200);
 assert.equal(bindings.rows.filter(r=>!r.conceptIds.length).length,6);
 for(const s of bank){const r=bindings.rows.find(r=>r.scenarioId===s.id);assert(r);assert.equal(r.scenarioVersion,s.version);for(const q of s.questions)assert.equal(r.questionHashes[q.id],questionContentHash(s,q));}
 assert.deepEqual(bindings.rows.find(r=>r.scenarioId==='exp26-u7-004').conceptIds,[]);
 assert(!bindings.rows.find(r=>r.scenarioId==='exp26b-u15-008').conceptIds.includes('off-puck-support-offense'));
});
test('calibration stays separate, valid, original and within playable ice',()=>{
 assert.deepEqual(validateExperimentalBank(pack.candidates),[]);
 assert.equal(pack.candidates.length,4);assert.equal(pack.candidates.flatMap(s=>s.questions).length,24);
 const prompts=new Set(bank.flatMap(s=>s.questions.map(q=>q.prompt.trim().toLowerCase())));
 for(const s of pack.candidates){assert(!bank.some(x=>x.id===s.id));assert(s.metadata.admissionLimit.includes('Does not close'));assert.equal(s.questions.filter(q=>q.type==='explain').length,1);for(const q of s.questions){assert(!prompts.has(q.prompt.trim().toLowerCase()));if(q.type==='position')assert(isCoachRoutePoint(q.reference));}for(const a of s.setup.actors)assert(isCoachRoutePoint(a));}
});
test('wall-turn example actually increases space from both boards and nearest defender',()=>{
 const s=pack.candidates.find(s=>s.ageBand==='U9'),q=s.questions.find(q=>q.type==='position'),you=s.setup.actors.find(a=>a.id===q.actorId),d=s.setup.actors.find(a=>a.team==='away');
 assert(Math.abs(q.reference.y)<Math.abs(you.y));
 assert(Math.hypot(q.reference.x-d.x,q.reference.y-d.y)>Math.hypot(you.x-d.x,you.y-d.y));
});
test('U11 wall retrieval is near boards and the outlet example clears the named defender',()=>{
 const s=bank.find(s=>s.id==='exp26-u11-001');assert(s.version>=3);assert(12.954-Math.abs(s.setup.puck.y)<1);
 assert(s.questions.find(q=>q.id.endsWith('-q8')).prompt.includes('pass toward F2'));
 const target=s.questions.find(q=>q.id.endsWith('-q9')).reference,p=s.setup.puck,d=s.setup.actors.find(a=>a.id==='a1');
 const vx=target.x-p.x,vy=target.y-p.y,t=Math.max(0,Math.min(1,((d.x-p.x)*vx+(d.y-p.y)*vy)/(vx*vx+vy*vy)));
 assert(Math.hypot(d.x-p.x-t*vx,d.y-p.y-t*vy)>3,'D1 should be outside this example lane; not a pass-success test');
});
