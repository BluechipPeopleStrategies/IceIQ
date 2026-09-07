export const OBSERVATION_CONTEXTS=['Practice','Small-area game','Game','Video review'];
export const ASSESSMENT_VALUES=['introduced','developing','consistent','proficient','advanced','n/a'];
export const DEMO_COACH_ID='__demo_coach__';
export const PREVIEW_PLAYER_ID='__preview__';
// These are the explicit roster IDs used by the coach demo. A real UUID can
// begin with the same characters as a demo ID and must never be classified by
// prefix.
export const DEMO_PLAYER_IDS=new Set(['dr1','dr2','dr3','dr4','dr5','dr6','dr7','dr8','dr9','dr10','dr11','dr12','dr13','dr14','dr15','dr16']);
export function isDemoAssessment({coachId,playerId}={}){
 return coachId===DEMO_COACH_ID||DEMO_PLAYER_IDS.has(playerId);
}
const hasText=value=>typeof value==='string'&&value.trim().length>0;
export const assessmentStorageKey=(coachId,playerId)=>`rinkreads_coach_assessment_v1:${encodeURIComponent(coachId)}:${encodeURIComponent(playerId)}`;
export function editableAssessmentNotes(existing,cached,skillIds){
 const shared={...existing};
 for(const id of skillIds)if(cached&&Object.hasOwn(cached.publishedNotes||{},id)&&cached.publishedNotes[id]===shared[id])shared[id]=cached.notes?.[id]||'';
 return Object.fromEntries(Object.entries(shared).filter(([id,n])=>skillIds.includes(id)&&typeof n==='string'));
}
export function cleanSkillRatings(ratings,skillIds){
 return Object.fromEntries(Object.entries(ratings||{}).filter(([id,value])=>skillIds.includes(id)&&ASSESSMENT_VALUES.includes(value)));
}
export function validObservation(item,today){
 const date=new Date(`${item?.date}T12:00:00Z`);
 return !!item&&/^\d{4}-\d{2}-\d{2}$/.test(item.date)&&!Number.isNaN(date.valueOf())&&date.toISOString().startsWith(item.date)&&item.date<=today&&OBSERVATION_CONTEXTS.includes(item.context)&&hasText(item.text)&&item.text.trim().length>=12;
}
export function assessmentIssues({ratings,baseline={},observations={},skillIds,today}){
 const issues=[];
 for(const [id,value] of Object.entries(cleanSkillRatings(ratings,skillIds))){
  if(value==='n/a'||value===baseline[id])continue;
  const evidence=(observations[id]||[]).filter(o=>validObservation(o,today));
  if(!evidence.length)issues.push({skillId:id,message:'Add a dated example of what you observed before saving this new rating.'});
  if(['proficient','advanced'].includes(value)&&new Set(evidence.map(o=>o.date)).size<2)issues.push({skillId:id,message:'A game-level rating needs observations on at least two different dates.'});
  if(['proficient','advanced'].includes(value)&&!evidence.some(o=>['Game','Small-area game','Video review'].includes(o.context)))issues.push({skillId:id,message:'Include a game or game-review observation for this rating.'});
 }
 return issues;
}
export function assessmentCoverage(ratings,skillIds){
 const values=Object.values(cleanSkillRatings(ratings,skillIds));
 return {observed:values.filter(v=>v!=='n/a').length,notObserved:values.filter(v=>v==='n/a').length,total:skillIds.length};
}
export function sharedAssessmentNote(note,observations){
 const entries=(observations||[]).map(o=>`${o.date} · ${o.context}: ${o.text.trim()}`);
 return [String(note||'').trim(),entries.length?`Observed examples\n${entries.join('\n')}`:''].filter(Boolean).join('\n\n');
}
export function restoreAssessment(raw,skillIds){
 try{
  const value=JSON.parse(raw||'null');if(value?.version!==1)return null;
  return {version:1,ratings:cleanSkillRatings(value.ratings,skillIds),notes:Object.fromEntries(Object.entries(value.notes||{}).filter(([id,n])=>skillIds.includes(id)&&typeof n==='string')),observations:Object.fromEntries(Object.entries(value.observations||{}).filter(([id,items])=>skillIds.includes(id)&&Array.isArray(items)).map(([id,items])=>[id,items.filter(item=>item&&typeof item.date==="string"&&typeof item.context==="string"&&typeof item.text==="string")])),privateNote:typeof value.privateNote==='string'?value.privateNote:'',publishedNotes:value.publishedNotes||{}};
 }catch{return null;}
}
