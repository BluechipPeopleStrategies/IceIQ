import {createHash} from 'node:crypto';
import {composeExperimentalBank} from '../src/one-on-one/experimentalExpansionCore.js';
import {validateExperimentalBank,makeScene} from '../src/one-on-one/experimentalBankCore.js';
import {isCoachRoutePoint} from '../src/one-on-one/coachRouteSurfaceInput.js';
import {actorDisplayName} from '../src/visuals/actorLabel.js';

export function questionActorWarnings(s,q) {
 const normalize=value=>value.replace(/\s/g,'').toLowerCase();
 const names=new Set((s.setup?.actors||[]).flatMap(a=>[actorDisplayName(a),a.label||'']).map(normalize));
 const text=[q.prompt,q.explanation,...(Array.isArray(q.options)?q.options.map(o=>o.text):[])].join(' ');
 return [...new Set(text.match(/\b(?:Navy|Gold)\s*\d+\b|\b[FDCA]\d+\b/g)||[])].filter(name=>!names.has(normalize(name))).map(name=>`${q.id}: ${name} is not a displayed actor name; check the exact scene and any explicitly introduced hypothetical.`);
}

export function positionSubjectIssue(s,q) {
 if(q.type!=='position')return null;
 const subject=/^(?:Move|Place)\s+(YOU|(?:Navy|Gold)\s*\d+|[FDCHA]\d+)\b/i.exec(q.prompt||'')?.[1];
 if(!subject)return null;
 const actor=s.setup?.actors?.find(a=>a.id===q.actorId),normalize=value=>String(value||'').replace(/\s/g,'').toLowerCase();
 if(!actor||![actor.label,actorDisplayName(actor)].some(label=>normalize(label)===normalize(subject)))return `${q.id}: prompt moves ${subject} but actorId targets a different player.`;
 return null;
}

export function questionContentHash(s,q) {
 const {questions,version,...scene}=s;
 return createHash('sha256').update(JSON.stringify({scene,question:q})).digest('hex');
}
export function validateQuestionBatch(batch,currentBank) {
 const errors=[],warnings=[];
 if(!batch||batch.schemaVersion!==1||batch.status!=='draft-not-reviewed') return {errors:['Expected schemaVersion:1 and status:"draft-not-reviewed".'],warnings};
 if(!/^[a-z0-9][a-z0-9-]{2,63}$/.test(batch.batchId||'')) errors.push('batchId must contain 3–64 lower-case letters, digits or hyphens.');
 if(!Array.isArray(batch.scenarios)||!Array.isArray(batch.additions)) return {errors:[...errors,'scenarios and additions must both be arrays.'],warnings};
 if(!batch.scenarios.length&&!batch.additions.length) errors.push('Batch contains no questions.');
 let combined;
 try { combined=composeExperimentalBank(currentBank,batch.scenarios,batch.additions); }
 catch(error) {return {errors:[...errors,error.message],warnings};}
 const affectedIds=new Set([...batch.scenarios.map(s=>s.id),...batch.additions.map(a=>a.scenarioId)]);
 const affected=combined.filter(s=>affectedIds.has(s.id));
 try {errors.push(...validateExperimentalBank(affected));}
 catch(error) {errors.push(`Malformed scenario or question structure: ${error.message}`);}
 const incomingIds=new Set([...batch.scenarios.flatMap(s=>s.questions||[]),...batch.additions.flatMap(s=>s.questions||[])].map(q=>q?.id));
 const existingPrompts=new Map(currentBank.flatMap(s=>s.questions.map(q=>[q.prompt.trim().toLowerCase(),q.id])));
 for(const s of affected){
  for(const q of s.questions||[]){
   if(!q||!incomingIds.has(q.id)||typeof q.id!=='string')continue;
   if(/\bundefined\b/.test(JSON.stringify(q)))errors.push(`${q.id}: unresolved undefined text.`);
   if(!q.id.startsWith(`${s.id}-q`))errors.push(`${q.id}: question ID must start with ${s.id}-q.`);
   if(q.type==='explain'&&q.basis!=='coaching')errors.push(`${q.id}: reflection must use coaching basis.`);
   const subjectIssue=positionSubjectIssue(s,q);if(subjectIssue)errors.push(subjectIssue);
   warnings.push(...questionActorWarnings(s,q));
   const prompt=typeof q.prompt==='string'?q.prompt.trim().toLowerCase():'';
   const duplicate=existingPrompts.get(prompt);
   if(duplicate)warnings.push(`${q.id}: prompt repeats ${duplicate}; check distinct learning value.`);
   if(prompt)existingPrompts.set(prompt,q.id);
   if(Array.isArray(q.options)&&new Set(q.options.map(o=>typeof o?.text==='string'?o.text.trim().toLowerCase():'')).size!==q.options.length)errors.push(`${q.id}: duplicate option text.`);
   if(q.type==='position')try{if(!isCoachRoutePoint(makeScene(s,{actorId:q.actorId,point:q.reference}).puck))errors.push(`${q.id}: moved carrier puts puck outside ice.`);}catch(e){errors.push(`${q.id}: ${e.message}`);}
   if(q.basis==='scene'&&/always|guarantee|will score|will intercept/i.test(`${q.prompt} ${q.explanation}`))warnings.push(`${q.id}: check unsupported certainty in an objectively graded question.`);
  }
  try{if(!isCoachRoutePoint(makeScene(s).puck))errors.push(`${s.id}: initial puck outside ice.`);}catch(e){errors.push(`${s.id}: ${e.message}`);}
  if(batch.scenarios.some(n=>n.id===s.id)){
   if(currentBank.some(old=>old.title===s.title))errors.push(`${s.id}: existing scenario title.`);
   if(currentBank.some(old=>JSON.stringify(old.setup)===JSON.stringify(s.setup)))warnings.push(`${s.id}: scene geometry exactly repeats an existing scenario.`);
  }
 }
 return {errors:[...new Set(errors)],warnings:[...new Set(warnings)],counts:{scenarios:batch.scenarios.length,extendedScenarios:batch.additions.length,questions:incomingIds.size}};
}
