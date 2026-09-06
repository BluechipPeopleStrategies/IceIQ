import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readBankFiles} from './experimental-bank-files.mjs';
import {composeExperimentalBank} from '../src/one-on-one/experimentalExpansionCore.js';
import {questionContentHash} from './question-batch-core.mjs';
import {presentChoices} from '../src/one-on-one/choicePresentation.js';

const dir='docs/factory/coaching-panel/choice-repairs-60';
const baselineCommit='4b1826e';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const old=p=>JSON.parse(execFileSync('git',['show',`${baselineCommit}:${p}`],{encoding:'utf8',maxBuffer:16*1024*1024}));
const ages=['u7','u9','u11','u13','u15','u18'];
const original=ages.flatMap(a=>old(`src/one-on-one/experimental-bank/${a}.json`));
const scenes=ages.flatMap(a=>old(`src/one-on-one/experimental-expansion/${a}-scenarios.json`));
const additions=ages.flatMap(a=>old(`src/one-on-one/experimental-expansion/${a}-additions.json`));
const baseline=composeExperimentalBank(original,scenes,additions),bank=readBankFiles().bank;
const targets=read('docs/factory/coaching-panel/choice-quality-remaining-04/root-adjudication.json').rows.filter(r=>r.verdict==='revise');
assert.equal(targets.length,60);
const applied=new Map();
for(const folder of fs.readdirSync(dir).filter(n=>/^packet-\d+-r\d+$/.test(n))){
 const base=`${dir}/${folder}`;
 if(!fs.existsSync(`${base}/application-receipt.json`))continue;
 const receipt=read(`${base}/application-receipt.json`),candidate=read(`${base}/candidates.json`);
 const sha=createHash('sha256').update(fs.readFileSync(`${base}/candidates.json`)).digest('hex');
 assert.equal(sha,read(`${base}/FREEZE.json`).candidateSha256);
 assert.deepEqual(receipt.changes,candidate.changes);
 for(const c of receipt.changes){
  assert(!applied.has(c.questionId),`Duplicate applied question ${c.questionId}`);
  const target=targets.find(r=>r.questionId===c.questionId);
  assert(target,`Unapproved scope ${c.questionId}`);assert.equal(target.contentHash,c.beforeHash);
  assert.equal(target.scenarioId,c.scenarioId);assert.equal(receipt.humanCoachApproval,false);
  for(const file of ['root-review.json','independent-review.json']){
   const review=read(`${base}/${file}`),isRoot=file==='root-review.json';
   assert.equal(review.reviewer,isRoot?'/root':'choice-quality-rewrite-independent-03');
   const rows=review.rows.filter(r=>r.questionId===c.questionId);
   assert.equal(rows.length,1);assert.equal(rows[0].verdict,'approve');assert.equal(rows[0].contentHash,c.afterHash);
   const approvals=receipt.adjudications.filter(a=>a.questionId===c.questionId&&a.role===(isRoot?'root':'independent'));
   assert.equal(approvals.length,1);assert.equal(approvals[0].afterHash,c.afterHash);assert.equal(approvals[0].verdict,'approve');
   assert.equal(approvals[0].reviewerId,isRoot?'/root':'/root/rewrite_independent');
  }
  applied.set(c.questionId,{...c,packet:folder});
 }
}
assert.equal(applied.size,60,'All sixty must have exact applied receipts before this report is generated');
assert.equal(bank.length,baseline.length);assert.equal(bank.length,200);
let unchanged=0,changed=0,affected=0;
for(const before of baseline){
 const after=bank.find(s=>s.id===before.id);assert(after);
 const metadata=s=>{const {version,questions,...rest}=s;return rest;};
 assert.deepEqual(metadata(after),metadata(before),`${before.id} scene metadata drift`);
 assert.deepEqual(after.questions.map(q=>q.id),before.questions.map(q=>q.id));
 let sceneChanges=0;
 for(const oldQ of before.questions){
  const q=after.questions.find(q=>q.id===oldQ.id),repair=applied.get(q.id);
  if(!repair){assert.deepEqual(q,oldQ,`${q.id} changed outside repair scope`);unchanged++;continue;}
  assert.deepEqual(repair.before,oldQ);assert.deepEqual(repair.after,q);
  assert.equal(questionContentHash(after,q),repair.afterHash);assert.equal(q.type,oldQ.type);
  for(const seed of ['release-a','release-b','release-c']){
   const shown=presentChoices(q,{contentHash:repair.afterHash,seed});
   assert.deepEqual(shown.map(o=>o.id).sort(),q.options.map(o=>o.id).sort());
   assert(q.answer.every(id=>shown.some(o=>o.id===id)),`${q.id} answer mapping lost`);
  }
  sceneChanges++;changed++;
 }
 assert.equal(after.version,before.version+(sceneChanges?1:0),`${before.id} version changed unexpectedly`);
 if(sceneChanges)affected++;
}
assert.equal(changed,60);assert.equal(unchanged,1540);
const rows=[...applied.values()].map(c=>{
 const scene=bank.find(s=>s.id===c.scenarioId);
 return {questionId:c.questionId,scenarioId:c.scenarioId,ageBand:scene.ageBand,version:scene.version,packet:c.packet,before:c.before,after:c.after,contentHash:c.afterHash};
});
const report={baselineCommit,generatedAt:new Date().toISOString(),status:'applied-and-source-verified',humanCoachApproval:false,changed,unchanged,affectedScenes:affected,totalScenarios:200,totalQuestions:1600,checks:['Exact frozen candidates and individual independent/root approvals','Every applied source payload matches its reviewed hash','All other 1540 questions unchanged','Scene metadata and question types preserved','Affected scene versions increment once','Every answer ID survives three presentation seeds'],rows};
fs.writeFileSync(`${dir}/release-report.json`,JSON.stringify(report,null,2)+'\n');
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cards=rows.map(r=>`<article data-age="${r.ageBand}"><small>${r.ageBand} · ${esc(r.questionId)} · v${r.version}</small><h2>${esc(r.after.prompt)}</h2><ul>${r.after.options.map(o=>`<li>${esc(o.text)}</li>`).join('')}</ul><p>${esc(r.after.explanation)}</p><details><summary>What changed</summary><p>${esc(r.before.prompt)}</p><ul>${r.before.options.map(o=>`<li>${esc(o.text)}</li>`).join('')}</ul></details><a href="/?arena=experimental&age=${r.ageBand}&scenario=${r.scenarioId}&question=${r.questionId}#practice-arena">Try this question and leave a thought ↗</a><details><summary>Review evidence</summary><a href="${r.packet}/independent-review.json">Independent review</a> · <a href="${r.packet}/root-review.json">Final review</a> · <a href="${r.packet}/application-receipt.json">Application receipt</a></details></article>`).join('\n');
fs.writeFileSync(`${dir}/index.html`,`<!doctype html><html lang="en"><link rel="icon" href="data:,"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RinkReads · sixty question repairs</title><style>*{box-sizing:border-box}body{margin:0;color:#eaf2f6;background:radial-gradient(at top right,#183c45,#091823 65%);font:16px/1.6 system-ui,sans-serif}main{max-width:1050px;margin:auto;padding:24px 16px}header,article{border:1px solid #ffffff26;border-radius:18px;background:#ffffff08;padding:24px;margin-bottom:18px;backdrop-filter:blur(12px)}h1{font:700 clamp(28px,5vw,42px)/1.2 Georgia,serif}h2{font-size:20px;line-height:1.4}a{color:#edd18a;display:inline-block;padding:8px 0}small{color:#adcad6}summary{cursor:pointer;min-height:44px;padding:8px 0}.filters{display:flex;gap:12px;flex-wrap:wrap;margin:20px 0}label{display:grid;gap:5px}input,select{min-height:44px;padding:8px;border:1px solid #ffffff44;border-radius:8px;background:#172d3d;color:inherit;max-width:100%}input{width:320px}[hidden]{display:none}@media(max-width:500px){header,article{padding:18px}.filters label,input{width:100%}}</style><main><header><small>RINKREADS · REPAIR RECORD</small><h1>60 questions rewritten and applied</h1><p>Each replacement received independent AI review and final review against its exact scene. All 1,540 other questions remain unchanged. The bank still contains 200 scenarios and 1,600 questions.</p><p>You do not need to rewrite or approve these. Try a question and leave a thought if the wording, picture or answer feels wrong. That feedback feeds the next repair cycle.</p><p><small>Experimental practice content. AI review does not constitute human-coach certification or proof of a successful on-ice outcome. Existing question types and optional reflections are preserved.</small></p><a href="release-report.json">Download the complete repair record</a> · <a href="../choice-quality-remaining-04/index.html">Original review snapshot</a></header><div class="filters"><label>Find a question<input id="search" type="search" placeholder="Question, ID or wording"></label><label>Age<select id="age"><option value="">All ages</option>${ages.map(a=>`<option>${a.toUpperCase()}</option>`).join('')}</select></label></div><p id="count" role="status"></p>${cards}<script>const cards=[...document.querySelectorAll('article')],search=document.querySelector('#search'),age=document.querySelector('#age');function filter(){let count=0;for(const c of cards){c.hidden=!!((age.value&&c.dataset.age!==age.value)||!c.textContent.toLowerCase().includes(search.value.toLowerCase()));if(!c.hidden)count++;}document.querySelector('#count').textContent=count+' questions shown';}search.addEventListener('input',filter);age.addEventListener('input',filter);filter();</script></main></html>`);
console.log(JSON.stringify({changed,unchanged,affectedScenes:affected,totalQuestions:1600}));
