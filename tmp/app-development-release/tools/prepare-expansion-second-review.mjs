import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {readBankFiles,readJson,projectRoot} from './experimental-bank-files.mjs';
import {questionContentHash} from './question-batch-core.mjs';
const lane=process.argv[2];if(!/^[a-z0-9-]+$/.test(lane||''))throw Error('Usage: node tools/prepare-expansion-second-review.mjs <first-review-lane>');
const directory=join(projectRoot,'docs/factory/research/question-review/expansion'),first=readJson(join(directory,`${lane}-first.json`));
const ages=[...new Set(first.coverage.map(r=>r.scenarioId.match(/-u\d+-/)[0].slice(1,-1).toUpperCase()))];
const {bank}=readBankFiles({ages});
const current=new Map(bank.flatMap(s=>s.questions.map(q=>[q.id,{s,q,hash:questionContentHash(s,q)}])));
// Scene edits affect every question's hash, including previously unflagged items.
const selected=first.coverage.filter(r=>r.status==='flag'||r.highRisk||current.get(r.questionId)?.hash!==r.contentHash),ids=new Set(selected.map(r=>r.questionId));
const scenarios=bank.filter(s=>s.questions.some(q=>ids.has(q.id)));
const before=ages.flatMap(age=>readJson(join(directory,`${age.toLowerCase()}-input.json`)).scenarios);
const originalQuestions=new Map(before.flatMap(s=>s.questions.map(q=>[q.id,q])));
const manifest=selected.map(row=>{const s=scenarios.find(s=>s.id===row.scenarioId),q=s.questions.find(q=>q.id===row.questionId);return {...row,firstReviewer:first.reviewer,firstContentHash:row.contentHash,contentHash:questionContentHash(s,q),originalQuestion:originalQuestions.get(q.id),changedAfterFirstReview:row.contentHash!==questionContentHash(s,q)};});
writeFileSync(join(directory,`${lane}-second-input.json`),JSON.stringify({instruction:'Independently review every assigned ID in full scenario context; examine the first finding and any changed question. A pass on changed content also rechecks the repair. Do not edit the bank.',assignedQuestionIds:[...ids],manifest,findings:first.findings,scenarios},null,2)+'\n');
console.log(JSON.stringify({lane,questions:ids.size,changed:manifest.filter(r=>r.changedAfterFirstReview).length}));
