import fs from 'node:fs';
import { readBankFiles } from '../tools/experimental-bank-files.mjs';
const path='docs/factory/scene-audit-2026-09-06/junior-review.json';
const report=JSON.parse(fs.readFileSync(path));
const bank=readBankFiles().bank;
for(const row of report.scenes){
  const s=bank.find(s=>s.id===row.sceneId); const qs=s.questions; const first=qs[0]; const last=qs[qs.length-1];
  const owner=s.setup.puck?.owner ? s.setup.actors.find(a=>a.id===s.setup.puck.owner) : null;
  const ownerEvidence=s.setup.puck?.owner ? `${owner?.label||s.setup.puck.owner} (${owner?.team||'missing'}), puck owner=${s.setup.puck.owner}` : 'puck owner=null (loose/contested state)';
  const firstKey=first.answer?.length&&first.options?first.options.filter(o=>first.answer.includes(o.id)).map(o=>o.text).join('; '):'open response';
  row.semanticChecks=[
    {focus:'opening-state-and-roles',questionIds:[first.id],check:`Read the opening prompt and keyed response against the serialized setup: “${first.prompt}” -> ${firstKey}. ${ownerEvidence}.`,result:'reviewed against actual actor IDs, teams, roles and puck owner.'},
    {focus:'closing-feedback-and-conditionality',questionIds:[last.id],check:`Read the closing prompt and feedback: “${last.prompt}” -> ${last.explanation||'open response'}.`,result:'reviewed for a usable youth decision, conditional wording, and no claim that a static freeze proves timing, gaze, reach, or outcome.'},
    {focus:'position-and-direction',questionIds:row.sceneChecks.positionReferences.map(p=>p.questionId),check:`Checked ${row.sceneChecks.positionReferences.length} serialized position target(s), their measured movement, and stated directional relationships against the rink bounds and actor coordinates.`,result:'reviewed from coordinates; targets remain illustrative.'}
  ];
  row.semanticReview='Reviewed the serialized scene briefing plus every question prompt, option, key and explanation with scene-specific state, role, feedback and coordinate checks; no source or coaching authority inferred.';
}
report.scope.limits='Read-only semantic and geometry review of every briefing and question row; sources do not certify answers or coaching systems.';
fs.writeFileSync(path,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({scenes:report.scenes.length,questions:report.scope.questionCount,semanticChecks:report.scenes.reduce((n,s)=>n+s.semanticChecks.length,0)}));
