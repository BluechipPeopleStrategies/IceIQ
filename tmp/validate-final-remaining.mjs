import fs from 'node:fs';import {buildPlan} from '../tools/apply-amended-repairs.mjs';import {createHash} from 'node:crypto';
for(let n=25;n<=34;n++){const d=`docs/factory/research/question-review/packet-${n}`;try{const p=buildPlan({proposalPath:d+'/proposed-repairs.json'});console.log(n,p.changedRows.length,p.proposalSha256);}catch(e){console.log(n,'FAIL',e.message);process.exitCode=1;}}
