import {mkdirSync,readFileSync,writeFileSync,copyFileSync,readdirSync,existsSync} from 'node:fs';
import {join,dirname,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {readBankFiles,projectRoot,readJson} from './experimental-bank-files.mjs';
import {questionContentHash} from './question-batch-core.mjs';
import {scenarioSnapshotHash} from './claude-return-core.mjs';
import {validateExperimentalBank} from '../src/one-on-one/experimentalBankCore.js';
import {selectPracticeQuestions} from '../src/one-on-one/practiceQuestionSelection.js';

const out=join(projectRoot,'docs/factory/claude-project'),reviewRoot=join(projectRoot,'docs/factory/research/question-review');
mkdirSync(join(out,'packets'),{recursive:true});
const {bank}=readBankFiles(),errors=validateExperimentalBank(bank);if(errors.length)throw Error(errors.join('\n'));
const sha=value=>createHash('sha256').update(value).digest('hex');
const snapshotId=`rr-20260905-${sha(JSON.stringify(bank)).slice(0,16)}`;
const generatedAt=new Date().toISOString();
const manifest=bank.map(s=>({scenarioId:s.id,scenarioVersion:s.version,baseScenarioHash:scenarioSnapshotHash(s),questions:s.questions.map(q=>({questionId:q.id,baseContentHash:questionContentHash(s,q)}))}));
const calibrationIds=['exp26-u13-001','exp26-u13-010','exp26-u7-001','exp26-u9-006','exp26-u11-002'];
const groups=[bank.filter(s=>calibrationIds.includes(s.id)).sort((a,b)=>calibrationIds.indexOf(a.id)-calibrationIds.indexOf(b.id))];
const remaining=bank.filter(s=>!calibrationIds.includes(s.id));
for(let i=0;i<remaining.length;i+=5)groups.push(remaining.slice(i,i+5));
const packets=groups.map((scenes,i)=>({id:`packet-${String(i+1).padStart(2,'0')}${i===0?'-calibration':''}`,scenarioIds:scenes.map(s=>s.id),questions:scenes.reduce((n,s)=>n+s.questions.length,0)}));
const totalQuestions=bank.reduce((n,s)=>n+s.questions.length,0),routine=bank.flatMap(s=>selectPracticeQuestions(s));
const counts={scenarios:bank.length,authoredQuestions:totalQuestions,routineQuestions:routine.length,optionalReflections:routine.filter(q=>q.type==='explain').length,packets:packets.length};
const snapshot={schemaVersion:1,snapshotId,generatedAt,status:'experimental-not-approved',counts,packets,manifest,scenarios:bank};
const json=(name,value)=>{const path=join(out,name);mkdirSync(dirname(path),{recursive:true});writeFileSync(path,JSON.stringify(value,null,2)+'\n');};
json('bank-snapshot.json',snapshot);
const paths=['catalog-review.json','combined-review.json',...['expansion','followup'].flatMap(folder=>readdirSync(join(reviewRoot,folder)).filter(f=>/(?:first|second|recheck|proposals|adjudication)\.json$/.test(f)).map(f=>`${folder}/${f}`))].filter(p=>existsSync(join(reviewRoot,p)));
const reports=paths.map(file=>({file,...readJson(join(reviewRoot,file))}));
const historyRows=report=>report.coverage||report.results||report.entries||(report.questionId?[report]:[]);
const combined=reports.find(r=>r.file==='combined-review.json');
const latestById=new Map((combined?.coverage||[]).map(r=>[r.questionId,r]));
const currentCoverage=manifest.flatMap(s=>s.questions.map(q=>{const old=latestById.get(q.questionId);return {...q,scenarioId:s.scenarioId,scenarioVersion:s.scenarioVersion,historicalHashMatches:old?.contentHash===q.baseContentHash,historicalStatus:old?.contentHash===q.baseContentHash?old.status:'pending-current-content-review'};}));
const receipts=readdirSync(join(reviewRoot,'repairs')).filter(f=>f.endsWith('.json')).map(file=>({file,...readJson(join(reviewRoot,'repairs',file))}));
const historical={schemaVersion:1,snapshotId,limits:['Historical AI reviews are evidence of checks performed, not human approval or a guarantee of scene accuracy.','An unmatched hash means the historical finding does not certify current content.','Receipt status records its creation time; later exact-hash rechecks are separate.','Reports named before-adjudication retain superseded findings for accountability. Consult the current exact-hash recheck.','Claude returns use baseContentHash for the old content. They remain proposals until separately validated and independently reviewed; this builder does not promote them.'],previousCombinedCounts:combined?.counts,currentCoverage,reportIndex:reports.map(r=>({file:r.file,reviewer:r.reviewer,reviewKind:r.reviewKind,rows:historyRows(r).length,findings:r.findings||[]})),repairReceipts:receipts};
json('historical-checks.json',historical);
for(let i=0;i<groups.length;i++){
 const packet=packets[i],sceneIds=new Set(packet.scenarioIds),qids=new Set(groups[i].flatMap(s=>s.questions.map(q=>q.id)));
 const subsetReports=reports.flatMap(r=>{const rows=historyRows(r).filter(row=>qids.has(row.questionId));const findings=(r.findings||[]).filter(f=>(f.questionIds||[]).some(id=>qids.has(id)));return rows.length||findings.length?[{file:r.file,reviewer:r.reviewer,superseded:r.file.includes('before-adjudication'),rows,findings}]:[];});
 json(`packets/${packet.id}.json`,{schemaVersion:1,snapshotId,packetId:packet.id,status:'reference-context-not-an-import',assignment:'Audit every question and the full scene; propose exact replacements using RINKREADS-CLAUDE-PROJECT.md. Historical pass labels are not proof.',expected:{scenarios:groups[i].length,questions:packet.questions},manifest:manifest.filter(s=>sceneIds.has(s.scenarioId)),scenarios:groups[i],historicalReports:subsetReports,repairReceipts:receipts.flatMap(r=>{const changes=(r.changes||[]).filter(c=>qids.has(c.questionId));return changes.length?[{file:r.file,status:r.status,changes}]:[];})});
}
const sources=[...new Map(bank.flatMap(s=>s.sources.map(source=>[`${source.id}|${source.url}`,source]))).values()];
json('sources.json',{status:'source-leads-require-claim-specific-checking',sources});
copyFileSync(join(projectRoot,'src/data/curriculum-ledger.json'),join(out,'curriculum-ledger.json'));
copyFileSync(join(projectRoot,'docs/factory/curriculum-map/coverage.json'),join(out,'curriculum-coverage.json'));
copyFileSync(join(projectRoot,'docs/factory/claude-question-kit/START-HERE.md'),join(out,'AUTHORING-CONTRACT.md'));
copyFileSync(join(projectRoot,'docs/factory/claude-question-kit/example-batch.json'),join(out,'new-content-example.json'));
for(const file of ['catalog.html','catalog.json','catalog.csv','example-batch.json'])copyFileSync(join(projectRoot,'docs/factory/claude-question-kit',file),join(out,file));
copyFileSync(join(projectRoot,'docs/factory/research/question-review/repair-samples.html'),join(out,'historical-repair-samples.html'));
// Portable, read-only validation uses the same implementation as the repository.
const dependencyFiles=['tools/claude-return-core.mjs','tools/question-batch-core.mjs','src/one-on-one/experimentalBankCore.js','src/one-on-one/experimentalExpansionCore.js','src/one-on-one/coachRouteSurfaceInput.js','src/scenario-engine/rinkFrame.js','src/play/rinkAnchors.js','src/visuals/actorLabel.js'];
for(const file of dependencyFiles){const target=join(out,'validation',file);mkdirSync(dirname(target),{recursive:true});copyFileSync(join(projectRoot,file),target);}
writeFileSync(join(out,'validation/package.json'),'{"type":"module","private":true}\n');
writeFileSync(join(out,'validation/validate-return.mjs'),`import {readFileSync} from 'node:fs';
import {validateClaudeReturn} from './tools/claude-return-core.mjs';
try {if(!process.argv[2])throw Error('Usage: node validation/validate-return.mjs returned-review.json');
const snapshot=JSON.parse(readFileSync(new URL('../bank-snapshot.json',import.meta.url),'utf8'));
const report=JSON.parse(readFileSync(process.argv[2],'utf8').replace(/^\\uFEFF/,''));
const result=validateClaudeReturn(report,snapshot);console.log(JSON.stringify(result,null,2));if(result.errors.length)process.exitCode=1;
}catch(e){console.error(JSON.stringify({errors:[e.message]}));process.exitCode=1;}
`);
writeFileSync(join(out,'validation/validate-batch.mjs'),`import {readFileSync} from 'node:fs';
import {validateQuestionBatch} from './tools/question-batch-core.mjs';
try {if(!process.argv[2])throw Error('Usage: node validation/validate-batch.mjs new-content.json');
const snapshot=JSON.parse(readFileSync(new URL('../bank-snapshot.json',import.meta.url),'utf8'));
const batch=JSON.parse(readFileSync(process.argv[2],'utf8').replace(/^\\uFEFF/,''));
const result=validateQuestionBatch(batch,snapshot.scenarios);console.log(JSON.stringify(result,null,2));if(result.errors.length)process.exitCode=1;
}catch(e){console.error(JSON.stringify({errors:[e.message]}));process.exitCode=1;}
`);
json('return-template.json',{schemaVersion:1,kind:'rinkreads-content-review',status:'draft-not-reviewed',snapshotId,packetId:packets[0].id,completion:'partial',coverage:[],repairs:[],sourceChecks:[],remainingQuestionIds:groups[0].flatMap(s=>s.questions.map(q=>q.id))});
writeFileSync(join(out,'PACKET-INDEX.md'),`# RinkReads packet index\n\nSnapshot: **${snapshotId}**. Generated ${generatedAt}.\n\n${counts.scenarios} scenes / ${counts.authoredQuestions} authored questions / ${counts.packets} packets. Current practice presents ${counts.routineQuestions} questions, including ${counts.optionalReflections} optional reflections.\n\nRead the project instruction once. Start with packet 01, then continue in order. Each scene appears once. Read only the active packet and needed historical/source details to conserve context. The full snapshot is the immutable baseline for validation.\n\n| Packet | Ages | Scenes | Questions | File |\n|---|---|---:|---:|---|\n${packets.map((p,i)=>`| ${p.id} | ${[...new Set(groups[i].map(s=>s.ageBand))].join(', ')} | ${p.scenarioIds.length} | ${p.questions} | [JSON](packets/${p.id}.json) |`).join('\n')}\n\nReturn JSON, report and remaining IDs per packet. Do not infer that completing the review means every item passed or is ready to publish.\n`);
writeFileSync(join(out,'START-HERE.md'),`# Give this project to Claude\n\n1. Open **RINKREADS-CLAUDE-PROJECT.md**. It contains the exact assignment, parameters and opening message.\n2. Add that file, AUTHORING-CONTRACT.md and the first packet JSON to Claude. Add sources.json and curriculum-ledger.json when needed. For the full project, keep bank-snapshot.json and historical-checks.json as reference files; avoid rereading the whole bank for each small packet.\n3. Ask Claude to complete the calibration packet, then continue through PACKET-INDEX.md. Preserve its returned JSON and REPORT-BACK-TO-CODEX.md.\n4. Bring those files back to Codex. There is no automatic cross-app delivery. Codex validates current hashes, independently reviews changes and checks the rendered scenes before integration.\n\nThe ZIP is a transport folder. If Claude cannot open it, extract it and add the individual Markdown/JSON files. No paid book, player records, secrets or user response history are included.\n\nSnapshot: ${snapshotId}. Counts: ${JSON.stringify(counts)}.\n\n**Important:** return-template.json is deliberately empty and will not pass as a completed review. Historical repair samples show older before/after content; bank-snapshot.json is the authority for this assignment.\n`);
// File hashes make accidental package changes detectable; the ZIP is built outside this folder.
const files=[];function walk(folder){for(const item of readdirSync(folder,{withFileTypes:true})){const path=join(folder,item.name);if(item.isDirectory())walk(path);else if(item.name!=='package-manifest.json')files.push(path);}}walk(out);
json('package-manifest.json',{schemaVersion:1,snapshotId,generatedAt,counts,files:files.map(file=>({path:file.slice(out.length+1).replaceAll('\\','/'),sha256:sha(readFileSync(file)),bytes:readFileSync(file).length}))});
console.log(JSON.stringify({directory:out,snapshotId,...counts,files:files.length+1}));
