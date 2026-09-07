import fs from 'node:fs';
import { readBankFiles } from '../tools/experimental-bank-files.mjs';
import { questionContentHash } from '../tools/question-batch-core.mjs';
const bank=readBankFiles().bank;
for(const n of [25,26,27,28,29]){const p=`docs/factory/research/question-review/packet-${n}/proposed-repairs.json`;const x=JSON.parse(fs.readFileSync(p));for(const note of x.reviewNotes||[]){const s=x.packets[0].scenarios.find(z=>z.scenarioId===note.scenarioId);const q=s?.replacement.questions.find(z=>z.id===note.questionId);if(q){note.finalContentHash=questionContentHash(s.replacement,q);note.finalAffected=s.finalAffectedQuestionIds.includes(note.questionId);if(note.finalAffected&&!note.neededChange.includes('geometry'))note.neededChange+=' Independent geometry review correction applied; final hash refreshed.';}}fs.writeFileSync(p,JSON.stringify(x,null,2)+'\n');console.log(n)}
