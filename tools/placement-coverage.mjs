import fs from 'node:fs';import {readBankFiles} from './experimental-bank-files.mjs';
const bank=readBankFiles().bank,questions=bank.flatMap(s=>s.questions.filter(q=>q.type==='position').map(q=>({scenarioId:s.id,questionId:q.id,scenarioVersion:s.version,status:'ungraded-no-calibrated-rubric'})));
const output={generatedAt:new Date().toISOString(),livePlacementQuestions:questions.length,calibrated:0,ungraded:questions.length,developmentOnlyDraftRubrics:2,scope:'Two rubrics apply only to the revised U11 pilot; none is admitted as a hockey grade.',questions};
fs.writeFileSync(new URL('../docs/factory/coaching-panel/placement-coverage.json',import.meta.url),JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify({...output,questions:undefined}));
