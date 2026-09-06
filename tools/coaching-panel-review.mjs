import {readFileSync} from 'node:fs';import {pathToFileURL} from 'node:url';
const text=v=>typeof v==='string'&&v.trim().length>0;
export function validatePanelReviews(manifest,lead,second){
 const errors=[],expected=new Map((manifest.questions||[]).map(q=>[q.questionId,q]));
 if(!expected.size||expected.size!==manifest.questions?.length||(manifest.questions||[]).some(q=>!text(q.questionId)||!text(q.hash)))errors.push('Invalid manifest: require unique questions and nonempty content hashes');
 function rowsFor(review,label,required){
  const rows=new Map();if(!text(review?.reviewer))errors.push(`${label}: reviewer identity missing`);
  for(const row of review?.rows||[]){const q=expected.get(row.questionId);if(!q){errors.push(`${label}: unknown question ${row.questionId}`);continue;}if(rows.has(row.questionId))errors.push(`${label}: duplicate ${row.questionId}`);rows.set(row.questionId,row);
   if(row.contentHash!==q.hash)errors.push(`${label}: stale hash ${row.questionId}`);
   if(!['retain','repair','hold'].includes(row.verdict)||typeof row.highRisk!=='boolean'||!text(row.reason)||!text(row.sceneEvidence))errors.push(`${label}: incomplete evidence ${row.questionId}`);
   const opts=row.optionReviews||[],ids=opts.map(o=>o.optionId);if(new Set(ids).size!==ids.length||JSON.stringify([...ids].sort())!==JSON.stringify([...(q.optionIds||[])].sort())||opts.some(o=>!text(o.assessment)||!text(o.reason)))errors.push(`${label}: option coverage ${row.questionId}`);
  }
  for(const id of required)if(!rows.has(id))errors.push(`${label}: missing ${id}`);return rows;
 }
 const leads=rowsFor(lead,'lead',expected.keys());
 const needed=[...expected.values()].filter(q=>['position','sequence'].includes(q.type)||leads.get(q.questionId)?.highRisk||leads.get(q.questionId)?.verdict!=='retain').map(q=>q.questionId);
 if(needed.length&&!second)errors.push(`Missing second review for ${needed.length} flagged/high-risk questions`);
 if(second){if(second.reviewer===lead?.reviewer)errors.push('Independent second review must use a different reviewer');rowsFor(second,'second review',needed);}
 return {errors,counts:{questions:expected.size,leadRows:leads.size,secondRequired:needed.length},scope:'Structural receipt validation only. Not tactical correctness, agreement, repair closure or human coach approval.'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [manifest,lead,second]=process.argv.slice(2).map(p=>JSON.parse(readFileSync(p,'utf8')));
 if(!manifest||!lead)throw Error('Usage: node tools/coaching-panel-review.mjs manifest.json lead-review.json [second-review.json]');
 const result=validatePanelReviews(manifest,lead,second);console.log(JSON.stringify(result,null,2));if(result.errors.length)process.exitCode=1;
}
