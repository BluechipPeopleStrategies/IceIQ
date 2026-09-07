import {readFileSync} from 'node:fs';
import {validateQuestionBatch} from './tools/question-batch-core.mjs';
try {if(!process.argv[2])throw Error('Usage: node validation/validate-batch.mjs new-content.json');
const snapshot=JSON.parse(readFileSync(new URL('../bank-snapshot.json',import.meta.url),'utf8'));
const batch=JSON.parse(readFileSync(process.argv[2],'utf8').replace(/^\uFEFF/,''));
const result=validateQuestionBatch(batch,snapshot.scenarios);console.log(JSON.stringify(result,null,2));if(result.errors.length)process.exitCode=1;
}catch(e){console.error(JSON.stringify({errors:[e.message]}));process.exitCode=1;}
