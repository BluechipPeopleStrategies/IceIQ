import fs from 'node:fs';
import path from 'node:path';
import {readBankFiles} from '../tools/experimental-bank-files.mjs';
import {questionContentHash} from '../tools/question-batch-core.mjs';
const d='docs/factory/research/question-review', f=d+'/packets-15-16';
const receipt=JSON.parse(fs.readFileSync(f+'/application-receipt.json'));
const {bank}=readBankFiles();
for(const row of receipt.changes){const s=bank.find(s=>s.id===row.scenarioId);if(questionContentHash(s,s.questions.find(q=>q.id===row.questionId))!==row.afterContentHash)throw Error(row.questionId);}
const cal=f+'/calibration-result.md';fs.writeFileSync(cal,fs.readFileSync(cal,'utf8').replaceAll('|\\n|','|\n|'));
const files=[...['15','16'].flatMap(n=>['review-packet-'+n+'.json','REPORT-BACK-TO-CODEX-packet-'+n+'.md'].map(x=>'docs/factory/claude-project/claude-output/'+x)),...fs.readdirSync(f).map(x=>f+'/'+x),d+'/repairs/claude-packets-15-16-repairs.json',d+'/followup/packets-15-16-final-recheck.json',...['csv','html','json'].map(x=>'docs/factory/claude-question-kit/catalog.'+x),...['README.md','catalog-review.json','combined-review.json','current-content-manifest.json'].map(x=>d+'/'+x),'src/one-on-one/experimental-bank/u11.json','src/one-on-one/experimental-expansion/u11-additions.json','src/one-on-one/experimental-expansion/u11-scenarios.json',...['audit-experimental-coaching.mjs','audit-question-expansion.mjs','build-question-review-summary.mjs'].map(x=>'tools/'+x)];
const release='tmp/packets-production-release';
for(const file of files){const dest=path.join(release,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(file,dest);}
const line='2026-09-05 · Packets 15–16 applied and independently rechecked: 88 questions reviewed, 29 question versions repaired across eight scenarios. Release verification in progress. Supabase deferred until tomorrow; no database action.';
for(const root of ['.',release]){const p=path.join(root,'docs/roadmap/TASKS.md');let t=fs.readFileSync(p,'utf8');t=t.replace(/\*\*Last updated:\*\*[^\r\n]*/,'**Last updated:** '+line);t=t.replace('## Changelog','## Changelog\n\n- '+line);fs.writeFileSync(p,t);}
files.push('docs/roadmap/TASKS.md');fs.writeFileSync('tmp/packets15-16-release-files.json',JSON.stringify(files,null,2));
console.log(JSON.stringify({verifiedHashes:receipt.changes.length,files:files.length}));
