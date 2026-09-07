import {readFileSync} from 'node:fs';
import {validateClaudeReturn} from './tools/claude-return-core.mjs';
try {if(!process.argv[2])throw Error('Usage: node validation/validate-return.mjs returned-review.json');
const snapshot=JSON.parse(readFileSync(new URL('../bank-snapshot.json',import.meta.url),'utf8'));
const report=JSON.parse(readFileSync(process.argv[2],'utf8').replace(/^\uFEFF/,''));
const result=validateClaudeReturn(report,snapshot);console.log(JSON.stringify(result,null,2));if(result.errors.length)process.exitCode=1;
}catch(e){console.error(JSON.stringify({errors:[e.message]}));process.exitCode=1;}
