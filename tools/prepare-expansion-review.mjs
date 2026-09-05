import {writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {readBankFiles,projectRoot,readJson} from './experimental-bank-files.mjs';
import {questionContentHash} from './question-batch-core.mjs';
import {validateExperimentalBank} from '../src/one-on-one/experimentalBankCore.js';
const requested=process.argv.slice(2).map(a=>a.toUpperCase());
const ages=requested.length?requested:['U7','U9','U11','U13','U15','U18'];
if(ages.some(age=>!['U7','U9','U11','U13','U15','U18'].includes(age)))throw Error('Pass age bands such as u11 u13.');
const loaded=readBankFiles({ages}),bank=loaded.bank.filter(s=>ages.includes(s.ageBand)),original=loaded.original,directory=join(projectRoot,'docs/factory/research/question-review/expansion');
const old=new Set(original.flatMap(s=>s.questions.map(q=>q.id)));
const added=bank.flatMap(s=>s.questions.filter(q=>!old.has(q.id)).map(q=>({questionId:q.id,scenarioId:s.id,scenarioVersion:s.version,contentHash:questionContentHash(s,q)})));
const errors=validateExperimentalBank(bank);if(errors.length)throw Error(errors.join('\n'));
const allocation={U7:100,U9:150,U11:250,U13:250,U15:150,U18:100};
for(const age of ages)if(added.filter(r=>bank.find(s=>s.id===r.scenarioId)?.ageBand===age).length!==allocation[age])throw Error(`Incomplete ${age} authoring batch.`);
const manifestPath=join(directory,'manifest.json'),prior=existsSync(manifestPath)?readJson(manifestPath).coverage:[];
const merged=new Map(prior.map(r=>[r.questionId,r]));
for(const row of added){if(merged.has(row.questionId)&&merged.get(row.questionId).contentHash!==row.contentHash)throw Error(`Snapshot is already frozen for ${row.questionId}; use revision rechecks after edits.`);merged.set(row.questionId,row);}
writeFileSync(manifestPath,JSON.stringify({status:'unreviewed-content-snapshot',createdAt:new Date().toISOString(),coverage:[...merged.values()]},null,2)+'\n');
for(const age of ages){
 const scenarios=bank.filter(s=>s.ageBand===age),ids=new Set(scenarios.map(s=>s.id));
 writeFileSync(join(directory,`${age.toLowerCase()}-input.json`),JSON.stringify({instruction:'Read full scenario context. Review only assignedQuestionIds. Manifest rows are identity receipts, not review results.',ageBand:age,assignedQuestionIds:added.filter(r=>ids.has(r.scenarioId)).map(r=>r.questionId),manifest:added.filter(r=>ids.has(r.scenarioId)),scenarios},null,2)+'\n');
}
console.log(JSON.stringify({questions:added.length,packets:ages.length,totalFrozen:merged.size}));
