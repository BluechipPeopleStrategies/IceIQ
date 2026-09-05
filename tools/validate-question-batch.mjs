import {resolve} from 'node:path';
import {readJson,readBankFiles} from './experimental-bank-files.mjs';
import {validateQuestionBatch} from './question-batch-core.mjs';
const path=process.argv[2];
if(!path){console.error('Usage: node tools/validate-question-batch.mjs <draft-batch.json>');process.exitCode=1;}
else try{
 const result=validateQuestionBatch(readJson(resolve(path)),readBankFiles().bank);
 console.log(JSON.stringify({...result,status:result.errors.length?'invalid':'structure-valid-coaching-review-required'},null,2));
 if(result.errors.length)process.exitCode=1;
}catch(error){console.error(`Cannot validate batch: ${error.message}`);process.exitCode=1;}
