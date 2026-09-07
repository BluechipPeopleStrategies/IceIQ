import {readBankFiles} from '../tools/experimental-bank-files.mjs';
import fs from 'node:fs';
const p=JSON.parse(fs.readFileSync('docs/factory/claude-project/claude-output/review-packet-19.json'));
for(const s of readBankFiles().bank.filter(s=>p.coverage.some(q=>q.scenarioId===s.id))){const r=p.repairs.find(r=>r.scenarioId===s.id)?.replacement||s;console.log(JSON.stringify(r));}


