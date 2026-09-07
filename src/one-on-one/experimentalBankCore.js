import { isCoachRoutePoint } from './coachRouteSurfaceInput.js';

export const EXPERIMENTAL_AGES = ['U7','U9','U11','U13','U15','U18'];
export const QUESTION_TYPES = { choice:'Choose an answer', multi:'Spot the cues', sequence:'Put in order', position:'Place a player', explain:'Explain your thinking' };
const text = value => typeof value === 'string' && value.trim().length > 0;
const unique = values => new Set(values).size === values.length;
const optionIds = question => (question.options || []).map(option => option.id);
const same = (a,b) => a.length === b.length && a.every((value,index)=>value===b[index]);

export function validateExperimentalBank(bank, expectedCounts) {
 const errors=[], ids=new Set(), questions=new Set(), titles=new Set();
 if(!Array.isArray(bank)) return ['bank must be an array'];
 for(const s of bank){
  const fail=message=>errors.push(`${s?.id||'unknown'}: ${message}`);
  if(!s||typeof s!=='object'){fail('scenario is required');continue;}
  if(!text(s.id)||ids.has(s.id))fail('missing or duplicate scenario ID');ids.add(s.id);
  if(titles.has(s.title))fail('duplicate title');titles.add(s.title);
  if(!EXPERIMENTAL_AGES.includes(s.ageBand)||!Number.isSafeInteger(s.version)||s.version<1)fail('unsupported age or version');
  for(const field of ['title','family','topic','objective','briefing','limits'])if(!text(s[field]))fail(`${field} is required`);
  if(!s.cues?.length||!s.cues.every(text)||!s.tags?.length||!s.tags.every(text))fail('cues and tags are required');
  if(!s.sources?.length)fail('source references required');
  for(const source of s.sources||[]){
   if(!['id','title','section','use'].every(key=>text(source[key])))fail('source metadata incomplete');
   try{if(!['http:','https:'].includes(new URL(source.url).protocol))fail('source URL protocol');}catch{fail('source URL invalid');}
  }
  const actors=s.setup?.actors||[], actorIds=actors.map(a=>a.id);
  if(!actors.length||!unique(actorIds)||!actorIds.every(text))fail('actors need unique IDs');
  for(const a of actors){
   if(!isCoachRoutePoint(a))fail(`actor ${a.id} outside ice`);
   if(!Number.isFinite(a.facing)||!['home','away'].includes(a.team)||!['skater','goalie'].includes(a.role)||!text(a.label))fail(`actor ${a.id} fields invalid`);
  }
  if(!actorIds.includes(s.focusActorId))fail('focus actor missing');
  const puck=s.setup?.puck;
  if(puck?.owner){if(!actors.some(a=>a.id===puck.owner&&a.role==='skater'))fail('puck owner must be a skater');}
  else if(!puck||!isCoachRoutePoint(puck))fail('loose puck outside ice');
  if(!Array.isArray(s.questions)||s.questions.length<6||s.questions.length>10)fail('six to ten questions required');
  const prompts=new Set();
  for(const q of s.questions||[]){
   if(!text(q.id)||questions.has(q.id))fail('missing or duplicate question ID');questions.add(q.id);
   if(prompts.has(q.prompt))fail('duplicate question prompt');prompts.add(q.prompt);
   if(!text(q.prompt)||!text(q.explanation)||!['scene','coaching'].includes(q.basis)||!QUESTION_TYPES[q.type])fail(`question ${q.id} fields invalid`);
   if(['choice','multi','sequence'].includes(q.type)){
    const opts=optionIds(q);
    if(opts.length<2||!unique(opts)||!q.options.every(o=>text(o.id)&&text(o.text)))fail(`question ${q.id} options invalid`);
    if(!Array.isArray(q.answer)||!q.answer.length||!unique(q.answer)||!q.answer.every(a=>opts.includes(a)))fail(`question ${q.id} answer invalid`);
    else if(q.type==='choice'&&q.answer.length!==1||q.type==='sequence'&&q.answer.length!==opts.length)fail(`question ${q.id} answer length invalid`);
   }
   if(q.type==='position'){
    const actor=actors.find(a=>a.id===q.actorId);
    if(!actor||!isCoachRoutePoint(q.reference))fail(`question ${q.id} position outside ice or actor missing`);
    else if(Math.hypot(actor.x-q.reference.x,actor.y-q.reference.y)<.1)fail(`question ${q.id} reference does not move actor`);
    if(q.basis!=='coaching')fail(`question ${q.id} positioning cannot claim objective grading`);
   }
  }
  if(new Set((s.questions||[]).map(q=>q.type)).size<4)fail('question variety needs at least four types');
 }
 if(expectedCounts)for(const [age,count] of Object.entries(expectedCounts))if(bank.filter(s=>s.ageBand===age).length!==count)errors.push(`${age}: expected ${count} scenarios`);
 return errors;
}

export function filterScenarios(bank,{age='',topic='',type='',search=''}={}){
 const needle=search.trim().toLowerCase();
 return bank.filter(s=>(!age||s.ageBand===age)&&(!topic||s.topic===topic)&&(!type||s.questions.some(q=>q.type===type))&&(!needle||[s.id,s.title,s.family,s.topic,s.objective,...s.tags].join(' ').toLowerCase().includes(needle)));
}

export function makeScene(scenario, movement=null){
 const state=structuredClone(scenario.setup);
 if(movement){
  if(!isCoachRoutePoint(movement.point))throw new RangeError('Position must stay on the ice.');
  const actor=state.actors.find(a=>a.id===movement.actorId);if(!actor)throw new RangeError('Unknown player.');
  Object.assign(actor,movement.point);
 }
 if(state.puck.owner){
  const a=state.actors.find(a=>a.id===state.puck.owner);
  const cos=Math.cos(a.facing),sin=Math.sin(a.facing);
  Object.assign(state.puck,{x:a.x+cos-sin*.7,y:a.y+sin+cos*.7});
 }
 return state;
}

export function defaultResponse(q){
 if(q.type==='explain')return '';
 if(q.type==='position')return null;
 if(q.type==='sequence'){
  const ids=optionIds(q), shifted=[...ids.slice(1),ids[0]];
  return same(shifted,q.answer)?[...shifted].reverse():shifted;
 }
 return [];
}
export function responseReady(q,value){
 if(q.type==='explain')return typeof value==='string'&&value.length<=10000;
 if(q.type==='position')return isCoachRoutePoint(value);
 const ids=optionIds(q);
 return Array.isArray(value)&&unique(value)&&value.length>0&&value.every(id=>ids.includes(id))&&(q.type!=='choice'||value.length===1)&&(q.type!=='sequence'||value.length===ids.length);
}
export function reviewResponse(q,value){
 if(!responseReady(q,value))return null;
 const keyed=['choice','multi','sequence'].includes(q.type)&&Array.isArray(q.answer);
 const objective=q.basis==='scene'&&keyed;
 const answerMatches=keyed?(q.type==='sequence'?same(value,q.answer):same([...value].sort(),[...q.answer].sort())):null;
 // Coaching agreement is feedback, not an objective correctness or mastery signal.
 const matched=objective?answerMatches:null;
 const heading=objective?(matched?'Yep, you got it.':'Not quite. Look at the scene again.'):keyed?(answerMatches?(q.type==='sequence'?'Yep, you got it. That matches the suggested plan.':'Yep, that matches the suggested approach.'):'Your answer differs from the suggestion. Compare the cues below.'):'A coaching suggestion';
 return {matched,suggestionMatched:!objective?answerMatches:null,heading:q.type==='position'?'What to check in your position':heading,explanation:q.explanation};
}
export function updateAttempt(records,scenario,q,value,reviewed=false){
 if(!responseReady(q,value))throw new TypeError('Invalid response.');
 const old=records[scenario.id]?.version===scenario.version?records[scenario.id]:{version:scenario.version,answers:{}};
 return {...records,[scenario.id]:{...old,answers:{...old.answers,[q.id]:{value:structuredClone(value),reviewed:!!reviewed}}}};
}
export function restoreAttempts(raw,bank){
 if(!raw)return {records:{},error:false};
 try{
  const input=JSON.parse(raw);if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Invalid records');
  const records={};
  for(const s of bank){
   const saved=input[s.id];if(saved?.version!==s.version||!saved.answers||typeof saved.answers!=='object')continue;
   const answers={};for(const q of s.questions){const a=saved.answers[q.id];if(a&&responseReady(q,a.value))answers[q.id]={value:a.value,reviewed:!!a.reviewed};}
   records[s.id]={version:s.version,answers};
  }
  return {records,error:false};
 }catch{return {records:{},error:true};}
}
export const attemptStorageKey=playerId=>`rinkreads_experimental_100_v1:${encodeURIComponent(playerId||'practice-preview')}`;
export function catalogCsv(bank){
 const cell=v=>'"'+String(v??'').replace(/^[=+@-]/,"'$&").replaceAll('"','""').replace(/[\r\n]+/g,' ')+'"';
 const rows=[['Scenario ID','Version','Age','Title','Family','Topic','Question ID','Type','Question','Answer basis','Suggested answer','Rationale','Sources','Review status']];
 for(const s of bank)for(const q of s.questions)rows.push([s.id,s.version,s.ageBand,s.title,s.family,s.topic,q.id,q.type,q.prompt,q.basis,q.type==='position'?JSON.stringify(q.reference):q.answer?.map(id=>q.options.find(o=>o.id===id)?.text).join(' | ')||'',q.explanation,s.sources.map(x=>`${x.title}: ${x.url} (${x.section})`).join(' | '),'Experimental; see hash-bound review receipts; human coach approval pending']);
 return rows.map(row=>row.map(cell).join(',')).join('\r\n');
}
