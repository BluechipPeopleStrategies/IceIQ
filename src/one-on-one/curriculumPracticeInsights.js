import {restorePracticeAnalytics} from './experimentalPracticeAnalytics.js';

const emptyCounts=()=>({views:0,checks:0,retries:0,flags:0,reflectionSkips:0,sceneChecks:0,sceneMatches:0});
function count(row,e,q){
 if(e.event==='question_view')row.views++;
 if(e.event==='question_flag')row.flags++;
 if(e.event==='reflection_skip')row.reflectionSkips++;
 if(e.event==='question_check'){row.checks++;if(e.retry)row.retries++;if(q.basis==='scene'&&typeof e.sceneMatch==='boolean'){row.sceneChecks++;if(e.sceneMatch)row.sceneMatches++;}}
}
export function buildCurriculumPracticeInsights({bank=[],bindings={rows:[]},ledger={concepts:[]},manifest={questions:{}},snapshot,age='',type=''}={}){
 const selected=bank.filter(s=>!age||s.ageBand===age),selectedIds=new Set(selected.map(s=>s.id));
 const conceptMap=new Map(ledger.concepts.map(c=>[c.id,{conceptId:c.id,name:c.name,...emptyCounts(),scenes:0,authoredQuestions:0}]));
 const bindingMap=new Map((bindings.rows||[]).map(r=>[r.scenarioId,r]));
 const sceneConcepts=new Map(),unmappedScenes=[],questions=new Map();
 for(const s of bank){
  const b=bindingMap.get(s.id);
  const valid=b&&b.scenarioVersion===s.version&&s.questions.every(q=>b.questionIds?.includes(q.id)&&b.questionHashes?.[q.id]===manifest.questions?.[q.id]?.contentHash&&b.questionHashes?.[q.id])&&b.conceptIds?.every(id=>conceptMap.has(id));
  const ids=valid?b.conceptIds:[];sceneConcepts.set(s.id,ids);
  for(const q of s.questions)questions.set(q.id,{s,q});
  if(!selectedIds.has(s.id))continue;
  const qs=s.questions.filter(q=>!type||q.type===type);
  if(!ids.length)unmappedScenes.push({scenarioId:s.id,title:s.title,reason:valid?'No suitable concept assigned':'Missing or stale binding'});
  for(const id of ids){const c=conceptMap.get(id);if(qs.length)c.scenes++;c.authoredQuestions+=qs.length;}
 }
 const normalized=restorePracticeAnalytics(snapshot),seen=new Set(),questionRows=new Map();
 let currentEvents=0,staleEvents=0,duplicateEvents=0,filteredEvents=0;
 for(const e of normalized.events){
  if(seen.has(e.id)){duplicateEvents++;continue;}seen.add(e.id);
  const pair=questions.get(e.questionId),m=manifest.questions?.[e.questionId];
  if(!pair||!m||m.scenarioId!==pair.s.id||m.scenarioVersion!==pair.s.version||e.scenarioId!==pair.s.id||e.scenarioVersion!==pair.s.version||!e.contentHash||e.contentHash!==m.contentHash||(e.basis&&e.basis!==pair.q.basis)||(e.questionType&&e.questionType!==pair.q.type)){staleEvents++;continue;}
  const {s,q}=pair;
  if(!selectedIds.has(s.id)||(type&&q.type!==type)){filteredEvents++;continue;}
  currentEvents++;
  if(!questionRows.has(q.id))questionRows.set(q.id,{questionId:q.id,scenarioId:s.id,scenarioVersion:s.version,contentHash:m.contentHash,ageBand:s.ageBand,title:s.title,type:q.type,basis:q.basis,...emptyCounts()});
  count(questionRows.get(q.id),e,q);
  for(const id of sceneConcepts.get(s.id))count(conceptMap.get(id),e,q);
 }
 const concepts=[...conceptMap.values()].map(c=>({...c,sceneMatchRate:c.sceneChecks>=5?c.sceneMatches/c.sceneChecks:null,sampleNote:c.sceneChecks<5?'Fewer than 5 scene checks':'Descriptive local sample; not mastery'}));
 const priorities=[...questionRows.values()].filter(q=>q.flags||q.retries||(q.sceneChecks>=5&&q.sceneMatches/q.sceneChecks<.6)).map(q=>({...q,reason:q.flags?'Flagged for review':q.retries?'Repeated attempts; inspect wording and cues':'Low scene-match sample; investigate',url:`?arena=experimental&age=${encodeURIComponent(q.ageBand)}&scenario=${encodeURIComponent(q.scenarioId)}&question=${encodeURIComponent(q.questionId)}#practice-arena`})).sort((a,b)=>b.flags-a.flags||b.retries-a.retries||a.questionId.localeCompare(b.questionId));
 return {schemaVersion:1,scope:'Anonymous events from this browser only; scene-level provisional curriculum mapping.',minimumSceneChecksForRate:5,authoredScenes:selected.length,authoredQuestions:selected.flatMap(s=>s.questions).filter(q=>!type||q.type===type).length,currentEvents,staleEvents,duplicateEvents,filteredEvents,droppedEvents:normalized.droppedCount,concepts,unmappedScenes,priorities};
}
