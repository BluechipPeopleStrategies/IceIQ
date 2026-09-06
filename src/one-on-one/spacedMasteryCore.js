// Initial product thresholds, not a research claim or hockey certification.
export const DEFAULT_MASTERY_POLICY = Object.freeze({ minDistinctQuestions:5, minAccuracy:.8, minPracticeDays:5, minSpanDays:7, minCalendarWeeks:2, points:100 });
const AGES=['U7','U9','U11','U13','U15','U18'];
const DAY=86400000;
const nonempty=value=>typeof value==='string'&&value.trim().length>0;
const groupKey=value=>JSON.stringify([value.ageBand,value.concept,value.format]);
const evidenceKey=value=>JSON.stringify([value.ageBand,value.concept,value.format,value.questionId,value.revision]);
const validDescriptor=value=>value&&AGES.includes(value.ageBand)&&['concept','format','questionId','revision'].every(key=>nonempty(value[key]));
const eligible=value=>validDescriptor(value)&&value.eligible===true&&['existing-served','reviewed'].includes(value.origin)&&value.experimental!==true;

function zone(value) {
 const candidate=value||Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';
 new Intl.DateTimeFormat('en',{timeZone:candidate}).format();
 return candidate;
}
function instant(value) { const date=new Date(value??Date.now());if(!Number.isFinite(date.getTime()))throw new TypeError('A valid attempt time is required.');return date; }
function calendar(at,timeZone) {
 const parts=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(instant(at));
 const part=type=>parts.find(p=>p.type===type).value;
 const day=`${part('year')}-${part('month')}-${part('day')}`;
 const dayNumber=Date.parse(`${day}T00:00:00Z`)/DAY;
 const weekday=new Date(dayNumber*DAY).getUTCDay();
 return {day,week:new Date((dayNumber-(weekday+6)%7)*DAY).toISOString().slice(0,10),dayNumber};
}
export function createMasteryLedger({timeZone}={}) { return {version:1,timeZone:zone(timeZone),attempts:[]}; }
export const masteryStorageKey=playerId=>`rinkreads_spaced_mastery_v1:${encodeURIComponent(playerId||'practice-preview')}`;

// The first answer per question/local date is immutable. Another day
// can demonstrate improvement. Revisions remain history, never extra variety.
export function recordMasteryAttempt(ledger,attempt,{now}={}) {
 if(!eligible(attempt))return ledger;
 if(typeof attempt.correct!=='boolean')throw new TypeError('correct must be boolean');
 if(ledger?.version!==1||!Array.isArray(ledger.attempts))throw new TypeError('A dated mastery ledger is required.');
 const at=instant(now).toISOString(), {day,week}=calendar(at,ledger.timeZone);
 if(ledger.attempts.some(old=>groupKey(old)===groupKey(attempt)&&old.questionId===attempt.questionId&&old.day===day))return ledger;
 const {ageBand,concept,format,questionId,revision,correct,origin}=attempt;
 return {...ledger,attempts:[...ledger.attempts,{ageBand,concept,format,questionId,revision,correct,origin,at,day,week}]};
}

export function readMasteryLedger(raw,{now,timeZone}={}) {
 const empty=()=>createMasteryLedger({timeZone});
 try {
  const input=JSON.parse(raw);
  if(input?.version!==1||!Array.isArray(input.attempts)||!nonempty(input.timeZone))return empty();
  let ledger=createMasteryLedger({timeZone:input.timeZone});
  const cutoff=instant(now).getTime();
  const rows=input.attempts.filter(a=>validDescriptor(a)&&typeof a.correct==='boolean'&&nonempty(a.at)&&Number.isFinite(Date.parse(a.at))&&Date.parse(a.at)<=cutoff).sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
  for(const row of rows){
   const {day,week}=calendar(row.at,ledger.timeZone);
   if(row.day!==day||row.week!==week)continue;
   ledger=recordMasteryAttempt(ledger,{...row,eligible:true},{now:row.at});
  }
  return ledger;
 }catch{return empty();}
}

function policyWith(overrides={}) {
 const policy={...DEFAULT_MASTERY_POLICY,...overrides};
 for(const field of ['minDistinctQuestions','minPracticeDays','minCalendarWeeks','points'])if(!Number.isInteger(policy[field])||policy[field]<1)throw new RangeError(`Invalid ${field}`);
 if(!Number.isInteger(policy.minSpanDays)||policy.minSpanDays<0||!Number.isFinite(policy.minAccuracy)||policy.minAccuracy<=0||policy.minAccuracy>1)throw new RangeError('Invalid mastery accuracy or span');
 return policy;
}

export function masteryProgress(ledger,group,{catalog=[],policy:overrides}={}) {
 const policy=policyWith(overrides), key=groupKey(group);
 const available=catalog.filter(q=>eligible(q)&&groupKey(q)===key);
 const current=new Set(available.map(evidenceKey));
 const evidence=(ledger?.attempts||[]).filter(a=>groupKey(a)===key&&current.has(evidenceKey(a))).sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
 const latest=new Map(), dates=new Set(), weeks=new Set(), daily=new Set();
 for(const a of evidence){
  const dayKey=JSON.stringify([a.questionId,a.revision,a.day]);if(daily.has(dayKey))continue;daily.add(dayKey);
  latest.set(a.questionId,a);dates.add(a.day);weeks.add(a.week);
 }
 const ordered=[...dates].sort();
 const distinctQuestions=latest.size, correct=[...latest.values()].filter(a=>a.correct).length;
 const accuracy=distinctQuestions?correct/distinctQuestions:0;
 const practiceDays=dates.size, calendarWeeks=weeks.size;
 const spanDays=ordered.length>1?(Date.parse(ordered.at(-1))-Date.parse(ordered[0]))/DAY:0;
 const eligibleAvailable=new Set(available.map(a=>a.questionId)).size;
 const requirements={questions:distinctQuestions>=policy.minDistinctQuestions,accuracy:accuracy>=policy.minAccuracy,days:practiceDays>=policy.minPracticeDays,span:spanDays>=policy.minSpanDays,weeks:calendarWeeks>=policy.minCalendarWeeks};
 const mastered=Object.values(requirements).every(Boolean);
 return {mastered,points:mastered?policy.points:0,distinctQuestions,correct,accuracy,practiceDays,spanDays,calendarWeeks,eligibleAvailable,coverageShortfall:Math.max(0,policy.minDistinctQuestions-eligibleAvailable),requirements,policy};
}

function canonical(value) {
 if(Array.isArray(value))return value.map(canonical);
 if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).filter(key=>key!=='masteryReview').sort().map(key=>[key,canonical(value[key])]));
 return value;
}
function revisionFor(source) {
 // A content-change identifier, not a security signature or approval token.
 let hash=2166136261;for(const char of JSON.stringify(canonical(source)))hash=Math.imul(hash^char.charCodeAt(0),16777619);
 return `content-${(hash>>>0).toString(16)}`;
}
export function masteryDescriptor(source,{ageBand,concept,format,origin}={}) {
 const revision=revisionFor(source);
 const draft=/draft|experimental/i.test(String(source.status||''))||/^exp26[a-z]*-/i.test(String(source.id||''))||source.experimental===true;
 const reviewed=source.masteryReview?.status==='approved'&&source.masteryReview.revision===revision;
 const resolvedOrigin=reviewed?'reviewed':origin;
 const nodeConcept=String(source.nodeId||'').match(/^u(?:7|9|11|13|15|18)\.(.+)$/i)?.[1]||'';
 const descriptor={ageBand:String(ageBand||source.ageBand||source.level||'').split(' ')[0],concept:concept||source.conceptId||source.concepts?.[0]||source.concept||nodeConcept,format:format||source.type||'mc',questionId:String(source.id||''),revision,origin:resolvedOrigin||'unknown',eligible:!draft&&(resolvedOrigin==='existing-served'||reviewed)};
 return {...descriptor,eligible:descriptor.eligible&&validDescriptor(descriptor)};
}

export function masterySummary(ledger,catalog,options={}) {
 const groups=[...new Map(catalog.filter(validDescriptor).map(q=>[groupKey(q),q])).values()];
 const results=groups.map(group=>({...group,...masteryProgress(ledger,group,{...options,catalog})}));
 return {groups:results,mastered:results.filter(r=>r.mastered).length,points:results.reduce((sum,r)=>sum+r.points,0)};
}
