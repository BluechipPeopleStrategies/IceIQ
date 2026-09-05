import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {readBankFiles} from './experimental-bank-files.mjs';
import {validateClaudeReturn} from './claude-return-core.mjs';
try{
 const [returnPath,snapshotPath='docs/factory/claude-project/bank-snapshot.json']=process.argv.slice(2);
 if(!returnPath)throw Error('Usage: node tools/validate-claude-return.mjs returned-review.json [bank-snapshot.json]');
 const read=path=>JSON.parse(readFileSync(resolve(path),'utf8').replace(/^\uFEFF/,''));
 const result=validateClaudeReturn(read(returnPath),read(snapshotPath),readBankFiles().bank);
 console.log(JSON.stringify(result,null,2));if(result.errors.length)process.exitCode=1;
}catch(error){console.error(JSON.stringify({errors:[error.message]},null,2));process.exitCode=1;}
