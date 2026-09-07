export const REVIEW_CATEGORIES=['Hockey decision','Scene or player position','Unclear question','Age or wording','Answer or feedback','Rule or safety','Other'];
export const reviewStorageKey=playerId=>`rinkreads_experimental_review_v1:${encodeURIComponent(playerId)}`;
export const reviewItemKey=(scenario,question)=>`${scenario.id}@${scenario.version}:${question.id}`;
const validHash=value=>typeof value==='string'&&value.trim().length>0;
export function questionReviewIdentity(scenario,question,manifest){
 const receipt=manifest?.questions?.[question.id];
 return receipt?.scenarioId===scenario.id&&receipt.scenarioVersion===scenario.version&&validHash(receipt.contentHash)?{...receipt,questionId:question.id}:null;
}
export function reviewIdentityMatches(record,identity){
 return !!record&&!!identity&&validHash(identity.contentHash)&&record.scenarioId===identity.scenarioId&&record.scenarioVersion===identity.scenarioVersion&&record.questionId===identity.questionId&&record.contentHash===identity.contentHash;
}
export function restoreReview(raw){
 try{const data=JSON.parse(raw);if(data?.version!==1)return {version:1,items:{}};
 return {version:1,items:Object.fromEntries(Object.entries(data.items||{}).filter(([,v])=>v&&typeof v.scenarioId==='string'&&Number.isSafeInteger(v.scenarioVersion)&&v.scenarioVersion>0&&typeof v.questionId==='string'&&typeof v.note==='string'&&typeof v.category==='string'&&['open','draft','resolved'].includes(v.status)).map(([key,v])=>[key,{...v,...(validHash(v.contentHash)?{contentHash:v.contentHash.trim()}: {})}]))};
 }catch{return {version:1,items:{}};}
}
export function recordFlag(state,scenario,question,{category,note,response=null},now=new Date().toISOString(),identity=null){
 if(!REVIEW_CATEGORIES.includes(category)||!note.trim())throw Error('Choose a category and describe the issue.');
 const key=reviewItemKey(scenario,question);
 const contentHash=identity?.contentHash||question.contentHash||scenario.contentHash;
 const previous=reviewIdentityMatches(state.items[key],{...identity,questionId:question.id})?state.items[key]:{};
 return {version:1,items:{...state.items,[key]:{...previous,scenarioId:scenario.id,scenarioVersion:scenario.version,questionId:question.id,...(validHash(contentHash)?{contentHash:contentHash.trim()}:{}),category,note:note.trim(),response,status:'open',updatedAt:now}}};
}
export function questionDraftIssues(original,draft){
 const issues=[];
 if(!draft?.prompt?.trim())issues.push('Question text is required.');
 if(!draft?.explanation?.trim())issues.push('Coaching feedback is required.');
 if(draft?.id!==original.id)issues.push('Keep the question identity.');
 if(original.options&&!['choice','multi','sequence'].includes(draft?.type))issues.push('Use a supported choice format.');
 if(!original.options&&draft?.type!==original.type)issues.push('This editor keeps the existing placement or reflection format.');
 if(original.options){
  const ids=draft.options?.map(o=>o.id)||[];
  if(ids.length!==original.options.length||new Set(ids).size!==ids.length||draft.options?.some(o=>!o.text?.trim()))issues.push('Keep unique choices with meaningful text.');
  if(!Array.isArray(draft.answer)||!draft.answer.length||draft.answer.some(id=>!ids.includes(id)))issues.push('Choose an answer from the available choices.');
  if(new Set(draft.answer||[]).size!==draft.answer?.length)issues.push('Use each answer ID only once.');
  if(draft.type==='choice'&&draft.answer?.length!==1)issues.push('A single-choice question needs one keyed answer.');
  if(draft.type==='sequence'&&draft.answer?.length!==ids.length)issues.push('The sequence must include every choice.');
 }
 return issues;
}
