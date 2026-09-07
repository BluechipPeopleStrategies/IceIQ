import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { validateExperimentalBank, makeScene, responseReady, reviewResponse } from '../src/one-on-one/experimentalBankCore.js';
const dir='docs/factory/companion-lessons-8';
const read=name=>JSON.parse(fs.readFileSync(`${dir}/${name}.json`,'utf8'));
const originals=JSON.parse(fs.readFileSync('docs/factory/draft-repairs-10/scenes.json','utf8'));
const parts=['youth','older'].map(read);
const corrections=fs.existsSync(`${dir}/review-corrections.json`)?read('review-corrections'):[];
const bank=parts.flatMap(p=>p.scenes).sort((a,b)=>a.id.localeCompare(b.id));
assert.equal(bank.length,8);
assert.deepEqual(validateExperimentalBank(bank),[]);
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');
const rows=[];
for(const s of bank){
 const original=originals.find(o=>o.id===s.id);assert.ok(original);
 assert.deepEqual(s.setup,original.setup,'Do not silently change reviewed scene geometry');
 for(const old of original.questions){const correction=corrections.find(c=>c.id===old.id);if(correction)assert.deepEqual(correction.before,old);assert.deepEqual(s.questions.find(q=>q.id===old.id),correction?.after||old,'Preserve or explicitly adjudicate previously repaired questions');}
 assert.equal(s.questions.length,6);
 for(const q of s.questions){
  const sample=q.type==='position'?q.reference:q.type==='explain'?'':q.answer;
  assert.ok(responseReady(q,sample));assert.ok(reviewResponse(q,sample));
  if(q.type==='explain')assert.equal(q.optional,true);
  if(q.type==='position')makeScene(s,{actorId:q.actorId,point:q.reference});
  rows.push({scenarioId:s.id,questionId:q.id,type:q.type,basis:q.basis,hash:hash({scene:Object.fromEntries(Object.entries(s).filter(([k])=>k!=='questions')),question:q}),new:!original.questions.some(o=>o.id===q.id)});
 }
}
const reflections=rows.filter(r=>r.type==='explain').length;
const scene=id=>bank.find(s=>s.id===id), distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const circle=scene('draft26-u7-vocab-002').questions.find(q=>q.type==='position').reference;
assert.ok(distance(circle,{x:21.03,y:-6.25})>4.572&&distance(circle,{x:20.7,y:-6.7})>4.572,'Outside-circle example must work in both existing renderers');
const support=scene('draft26-u9-receive-002'), point=support.questions.find(q=>q.type==='position').reference;
const actor=id=>support.setup.actors.find(a=>a.id===id);
assert.ok(distance(point,actor('f2'))>distance(actor('gold3'),actor('f2'))&&distance(point,actor('gold2'))<distance(actor('gold3'),actor('gold2')),'Support example must move farther from pressure and closer to receiver');
const defence=scene('draft26-u18-skate-002'), defendingPoint=defence.questions.find(q=>q.type==='position').reference;
assert.equal(defence.attackDirection,-1);assert.ok(defendingPoint.x>defence.setup.actors.find(a=>a.id==='f1').x&&defendingPoint.x<27,'Defending example stays goal-side');
assert.equal(reflections,6);assert.equal(rows.length,48);assert.equal(rows.filter(r=>r.new).length,38);
const counts=Object.fromEntries([...new Set(rows.map(r=>r.type))].map(t=>[t,rows.filter(r=>r.type===t).length]));
fs.writeFileSync(`${dir}/scenes.json`,JSON.stringify(bank,null,2)+'\n');
fs.writeFileSync(`${dir}/validation.json`,JSON.stringify({status:'structure-pass; coaching-admission-pending',scenes:8,questions:48,newQuestions:38,optionalReflections:reflections,reflectionPercent:100*reflections/48,types:counts,rows,limits:['Schema and response checks do not certify hockey quality.','Static illustrations do not assess skating execution.','No live bank admission or qualified coaching clearance.']},null,2)+'\n');
console.log(JSON.stringify({scenes:8,questions:48,newQuestions:38,types:counts,validation:'pass'}));
