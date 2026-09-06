import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ScenarioRinkView from '../visuals/ScenarioRinkView.jsx';
import { actorDisplayName, compactActorLabel } from '../visuals/actorLabel.js';
import { listenForCoachRouteTaps, isCoachRoutePoint } from './coachRouteSurfaceInput.js';
import { EXPERIMENTAL_BANK } from './experimentalBank.js';
import { EXPERIMENTAL_AGES, QUESTION_TYPES, attemptStorageKey, catalogCsv, defaultResponse, filterScenarios, makeScene, responseReady, restoreAttempts, reviewResponse, updateAttempt } from './experimentalBankCore.js';
import './ExperimentalPractice.css';
import QuestionReviewRoom from './QuestionReviewRoom.jsx';
import {REVIEW_CATEGORIES,recordFlag,restoreReview,reviewStorageKey} from './questionReviewCore.js';
import { selectPracticeQuestions, summarizePracticeRecord } from './practiceQuestionSelection.js';
import { createPracticeAnalyticsStore } from './experimentalPracticeAnalytics.js';
import ExperimentalPracticeInsights from './ExperimentalPracticeInsights.jsx';
import contentManifest from '../../docs/factory/research/question-review/current-content-manifest.json';
import calibrationPack from '../../docs/factory/calibration/skating-movement-2026-09-06.json';
import coachingPilot from '../../docs/factory/coaching-panel/pilot-2026-09-06/staged-repairs.json';
import CoachingFeedbackPanel from './CoachingFeedbackPanel.jsx';
import {experimentalRinkContext} from './experimentalRinkContext.js';

function downloadFile(filename,text,type){
 const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

export function ExperimentalBoard({scene,onPoint,reference}){
 const ref=useRef(null);
 useEffect(()=>{
  if(!onPoint||!ref.current)return;
  return listenForCoachRouteTaps(ref.current,event=>{
   const p=ref.current.createSVGPoint();p.x=event.clientX;p.y=event.clientY;
   const matrix=ref.current.getScreenCTM();if(!matrix)return;
   const hit=p.matrixTransform(matrix.inverse()),point={x:hit.x,y:-hit.y};if(isCoachRoutePoint(point))onPoint(point);
  });
 },[onPoint]);
 return <svg className="ep-board" viewBox="-33 -16 66 32" ref={ref} role="img" aria-label="Overhead rink. Navy attacks right. Player coordinates are also listed below.">
  <rect x="-30.48" y="-12.954" width="60.96" height="25.908" rx="8.5344" fill="#e4eff2" stroke="#c9a24b" strokeWidth=".3"/>
  <path d="M-7.62-12.954v25.908M7.62-12.954v25.908" stroke="#478eb7" strokeWidth=".22"/><path d="M0-12.954v25.908M-27-9.8V9.8M27-9.8V9.8" stroke="#cf6574" strokeWidth=".16"/>
  <circle r="4.572" fill="none" stroke="#87b5cc" strokeWidth=".12"/>
  {[-20.7,20.7].flatMap(x=>[-6.7,6.7].map(y=><g key={`${x}:${y}`}><circle cx={x} cy={y} r="4.572" fill="none" stroke="#d8a5ad" strokeWidth=".1"/><circle cx={x} cy={y} r=".24" fill="#c85f70"/></g>))}
  {[-1,1].map(side=><g key={side}><path d={`M${side*27},-1.85A1.85,1.85 0 0 ${side===1?0:1} ${side*27},1.85`} fill="#b5d6e5"/><rect x={side===1?27:-29} y="-1" width="2" height="2" fill="none" stroke="#c35c66" strokeWidth=".18"/></g>)}
  <text x="0" y="-14" textAnchor="middle" fontSize="1" fill="#aec6da">NAVY ATTACKS →</text>
  {reference&&<g transform={`translate(${reference.x},${-reference.y})`}><circle r="1.15" fill="none" stroke="#146a73" strokeWidth=".22" strokeDasharray=".35 .2"/><text y="2" textAnchor="middle" fontSize=".75" fill="#155563">Example</text></g>}
  {scene.actors.map(a=><g key={a.id} transform={`translate(${a.x},${-a.y})`}><title>{actorDisplayName(a)}</title><circle r=".65" fill={a.team==='home'?'#10233d':'#c9a24b'} stroke={a.team==='home'?'#fff':'#795916'} strokeWidth=".12"/><path d="M.8-.28l.6.28-.6.28" transform={`rotate(${-a.facing*180/Math.PI})`} fill="none" stroke="#364b59" strokeWidth=".15"/><text y="-1.05" textAnchor="middle" fontSize=".9" fontWeight="700" fill="#10233d" stroke="#edf5f4" strokeWidth=".25" paintOrder="stroke">{compactActorLabel(a)}</text></g>)}
  <circle cx={scene.puck.x} cy={-scene.puck.y} r=".23" fill="#08101c" stroke="#fff" strokeWidth=".12"/>
 </svg>;
}

function ResponseControls({question:q,value,onChange}){
 if(q.type==='explain')return <label className="ep-reflection">Your thinking (optional)<textarea value={value||''} maxLength={10000} onChange={e=>onChange(e.target.value)} placeholder="What did you notice? A short answer is enough."/></label>;
 if(q.type==='position')return <p className="ep-hint">Select a position on the rink, or use the coordinate controls. You can compare your choice with an example after responding.</p>;
 if(q.type==='sequence')return <ol className="ep-sequence">{value.map((id,index)=>{
  const option=q.options.find(o=>o.id===id);
  const move=direction=>{const next=[...value];[next[index],next[index+direction]]=[next[index+direction],next[index]];onChange(next);};
  return <li key={id}><span className="ep-order">{index+1}</span><span>{option.text}</span><button type="button" disabled={index===0} aria-label={`Move ${option.text} earlier`} onClick={()=>move(-1)}>↑</button><button type="button" disabled={index===value.length-1} aria-label={`Move ${option.text} later`} onClick={()=>move(1)}>↓</button></li>;
 })}</ol>;
 return <div className="ep-options" role="group" aria-label={q.type==='multi'?'Choose all that apply':'Choose one answer'}>{q.options.map(option=>{
  const picked=value.includes(option.id);
  return <button type="button" key={option.id} aria-pressed={picked} onClick={()=>onChange(q.type==='multi'?(picked?value.filter(id=>id!==option.id):[...value,option.id]):[option.id])}><span className={q.type==='multi'?'ep-check':'ep-radio'}>{picked?'✓':''}</span>{option.text}</button>;
 })}</div>;
}

function QuestionFlag({onFlag}){
 const [category,setCategory]=useState(REVIEW_CATEGORIES[0]),[note,setNote]=useState(''),[saved,setSaved]=useState(false);
 return <details className="ep-source-review"><summary>Flag this question</summary><label>What needs work?<select value={category} onChange={e=>setCategory(e.target.value)}>{REVIEW_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></label><label>Describe the issue<textarea value={note} onChange={e=>{setNote(e.target.value);setSaved(false);}} placeholder="What seems wrong or unclear?"/></label><button disabled={!note.trim()} onClick={()=>{onFlag({category,note});setSaved(true);}}>Save question flag</button>{saved&&<p role="status">Flag recorded for this question and version. Open the question workshop to work on it.</p>}</details>;
}
function ScenarioQuestions({scenario:s,record,onRecord,onFlag,onMetric}){
 const requestedQuestionId=new URLSearchParams(window.location.search).get('question')||'';
 const visibleQuestions=useMemo(()=>selectPracticeQuestions(s,requestedQuestionId),[s,requestedQuestionId]);
 const [index,setIndex]=useState(()=>Math.max(0,visibleQuestions.findIndex(q=>q.id===requestedQuestionId))),[drafts,setDrafts]=useState({}),[board,setBoard]=useState(false),[availability,setAvailability]=useState(true),[notice,setNotice]=useState('');
 const currentAnswers=record?.version===s.version?record.answers||{}:{};
 const q=visibleQuestions[index]||visibleQuestions[0], saved=currentAnswers[q.id];
 useEffect(()=>{onMetric('view',s,q);},[onMetric,s,q]);
 useEffect(()=>{const url=new URL(window.location.href);url.searchParams.set('scenario',s.id);url.searchParams.set('question',q.id);window.history.replaceState(window.history.state,'',url);},[s.id,q.id]);
 const value=Object.hasOwn(drafts,q.id)?drafts[q.id]:saved?.value??defaultResponse(q);
 const [revealed,setRevealed]=useState({});
 const showReview=Object.hasOwn(revealed,q.id)?revealed[q.id]:saved?.reviewed;
 const result=showReview?reviewResponse(q,value):null;
 const isPosition=q.type==='position';
 const movement=isPosition&&value?{actorId:q.actorId,point:value}:null;
 const scene=useMemo(()=>makeScene(s,movement),[s,q.id,value]);
 const actor=isPosition?scene.actors.find(a=>a.id===q.actorId):null;
 const [coordinates,setCoordinates]=useState({x:'',y:''});
 useEffect(()=>{setCoordinates({x:String(actor?.x??''),y:String(actor?.y??'')});},[q.id,actor?.x,actor?.y]);
 const change=next=>{setDrafts(current=>({...current,[q.id]:next}));setRevealed(current=>({...current,[q.id]:false}));if(q.type!=='explain'&&responseReady(q,next))onRecord(q,next,false);setNotice('');};
 const move=point=>{if(isCoachRoutePoint(point))change({x:Math.round(point.x*100)/100,y:Math.round(point.y*100)/100});};
 const review=()=>{if(!responseReady(q,value))return;onRecord(q,value,true);onMetric('check',s,q,{sceneMatch:reviewResponse(q,value)?.matched});setRevealed(current=>({...current,[q.id]:true}));};
  const skipReflection=()=>{onRecord(q,'',true);onMetric('skip',s,q);setDrafts(current=>{const next={...current};delete next[q.id];return next;});setRevealed(current=>({...current,[q.id]:true}));};
 return <section className="ep-scenario" aria-label={s.title}>
  <header><p className="ep-kicker">{s.ageBand} / {s.topic} / {s.id}</p><h2>{s.title}</h2><p className="ep-briefing">{s.briefing}</p></header>
  <nav className="ep-question-nav" aria-label="Scenario questions">{visibleQuestions.map((item,i)=><button key={item.id} type="button" aria-label={`Question ${i+1}: ${QUESTION_TYPES[item.type]}${item.type==='explain'?' (optional)':''}${currentAnswers[item.id]?.reviewed?', reviewed':''}`} title={`${QUESTION_TYPES[item.type]}${item.type==='explain'?' (optional)':''}`} aria-current={i===index?'step':undefined} onClick={()=>{setIndex(i);setNotice('');}}><span aria-hidden="true">{i+1}</span>{currentAnswers[item.id]?.reviewed&&<span className="ep-reviewed-dot" aria-hidden="true"/>}</button>)}</nav>
  <div className="ep-workspace">
   <div className="ep-rink-column"><div className="ep-view-choice"><span>{experimentalRinkContext(scene)}</span><button type="button" aria-pressed={board} onClick={()=>setBoard(v=>!v)}>{board?'Open 3D rink':'Use overhead board'}</button></div>
    {board||!availability?<ExperimentalBoard scene={scene} onPoint={isPosition?move:null} reference={result&&isPosition?q.reference:null}/>:<ScenarioRinkView state={scene} title={s.title} focusKey={`${s.id}:${s.version}:${q.id}`} focusPoints={isPosition&&q.reference?[q.reference]:[]} focusActorId={isPosition?q.actorId:s.focusActorId} selectedActorId={isPosition?q.actorId:null} editableIds={isPosition?[q.actorId]:[]} onSelect={()=>{}} onMove={(_,point)=>move(point)} onAvailabilityChange={setAvailability} teamLabels={{home:'Navy',away:'Gold'}} onViewUsage={cameraAction=>onMetric('camera',s,q,{cameraAction})}/>}
    {isPosition&&<div className="ep-coordinates"><span>Place {actorDisplayName(actor)}</span>{['x','y'].map(axis=><label key={axis}>{axis==='x'?'Along rink':'Across rink'}<input type="number" step=".25" aria-label={`Player ${axis} coordinate`} value={coordinates[axis]} onChange={e=>setCoordinates(old=>({...old,[axis]:e.target.value}))}/></label>)}<button type="button" onClick={()=>{const point={x:Number(coordinates.x),y:Number(coordinates.y)};if(coordinates.x.trim()&&coordinates.y.trim()&&isCoachRoutePoint(point))move(point);else setNotice('Choose a position inside the rink.');}}>Place player</button><button type="button" onClick={()=>{const original=s.setup.actors.find(a=>a.id===q.actorId);move({x:original.x,y:original.y});}}>Reset position</button></div>}
    {notice&&<p role="alert">{notice}</p>}
    <details className="ep-positions"><summary>Player locations and facing</summary><ul>{scene.actors.map(a=><li key={a.id}>{actorDisplayName(a)} · {a.x.toFixed(1)}, {a.y.toFixed(1)} m · {Math.round(a.facing*180/Math.PI)}°</li>)}</ul><p>0° faces the right end of the rink. Turning the camera does not change the players’ directions.</p></details>
   </div>
   <div className="ep-question"><p className="ep-kicker">QUESTION {index+1} OF {visibleQuestions.length} · {q.basis==='scene'?'READ THE SCENE':'EXPLORE A DECISION'}</p><h3>{q.prompt}</h3><ResponseControls question={q} value={value} onChange={change}/><button type="button" className="ep-primary" disabled={!responseReady(q,value)} onClick={review}>{q.basis==='scene'?'Check the scene':'Compare my thinking'}</button>{q.type==='explain'&&!showReview&&<button type="button" className="ep-skip-reflection" onClick={skipReflection}>Skip reflection / Continue without writing</button>}
    {result&&<div className="ep-response" aria-live="polite"><strong>{result.heading}</strong><p>{result.explanation}</p>{q.answer&&<p><b>{q.basis==='scene'?'Scene answer':'Suggested response'}:</b> {q.answer.map(id=>q.options.find(o=>o.id===id).text).join(q.type==='sequence'?' → ':'; ')}</p>}{isPosition&&<><p>Example position: {q.reference.x}, {q.reference.y} m. Other positions may work; compare the passing lane, pressure and support.</p><button type="button" onClick={()=>setBoard(true)}>Show example on overhead board</button></>}{q.basis==='coaching'&&<small>This draft gives a coaching suggestion. It does not award mastery or grade an exact position.</small>}{index<visibleQuestions.length-1&&<button type="button" className="ep-next" onClick={()=>setIndex(index+1)}>Next question →</button>}</div>}
    <CoachingFeedbackPanel key={`${s.id}:${s.version}:${q.id}`} scenario={s} question={q} scene={scene} answer={value} view={board||!availability?'overhead':'3d'}/>
   </div>
  </div>
  <details className="ep-source-review"><summary>Teaching notes, sources and review status</summary><p><b>Learning objective:</b> {s.objective}</p><p><b>Cues:</b> {s.cues.join(' · ')}</p><p><b>Limitations:</b> {s.limits}</p><p>Original experimental scenario. AI coaching review findings are available in the question workshop. Human coach approval, animation physics and approved-bank admission remain separate. The rink is a static illustration, not a verified action simulation.</p><ul>{s.sources.map(source=><li key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a> · {source.section}<p>{source.use}</p></li>)}</ul></details>
 </section>;
}

export default function ExperimentalPractice({playerId='practice-preview',bank:suppliedBank=EXPERIMENTAL_BANK,initialAge=''}){
 const calibrationId=new URLSearchParams(window.location.search).get('calibration');
 const pilot=calibrationId==='coaching-pilot-2026-09-06';
 const calibration=pilot||calibrationId==='skating-2026-09-06';
 const bank=pilot?coachingPilot.scenarios:calibration?calibrationPack.candidates:suppliedBank;
 const storagePlayer=calibration?`${playerId}:calibration:${calibrationId}`:playerId;
 const key=attemptStorageKey(storagePlayer),reviewKey=reviewStorageKey(storagePlayer);
 const analytics=useMemo(()=>createPracticeAnalyticsStore(),[]);
 const [showInsights,setShowInsights]=useState(()=>new URLSearchParams(window.location.search).get('insights')==='curriculum');
 const metric=useCallback((event,s,q,extra={})=>{
  if(calibration)return;
  const identity=contentManifest.questions[q.id];
  if(!identity||identity.scenarioId!==s.id||identity.scenarioVersion!==s.version)return;
  const meta={...identity,questionId:q.id,basis:q.basis,questionType:q.type,...extra};
  if(event==='view')analytics.recordQuestionView(meta);
  if(event==='check')analytics.recordQuestionCheck(meta);
  if(event==='skip')analytics.recordReflectionSkip(meta);
  if(event==='flag')analytics.recordQuestionFlag(meta);
  if(event==='camera')analytics.recordCameraUse(meta);
 },[analytics,calibration]);
 const [reviewState,setReviewState]=useState(()=>{try{return restoreReview(localStorage.getItem(reviewKey));}catch{return restoreReview(null);}});
 const [reviewMode,setReviewMode]=useState(()=>!calibration&&['triage','browse'].includes(new URLSearchParams(window.location.search).get('review')));
 const saveReview=next=>{setReviewState(next);try{localStorage.setItem(reviewKey,JSON.stringify(next));setSaveError(false);}catch{setSaveError(true);}};
  const flag=(s,q,value)=>{saveReview(recordFlag(reviewState,s,q,value,undefined,contentManifest.questions[q.id]));metric('flag',s,q,{category:value.category});};
 const toggleReview=next=>{setReviewMode(next);const url=new URL(window.location.href);if(next)url.searchParams.set('review','triage');else url.searchParams.delete('review');history.replaceState(history.state,'',url);};
 const openQuestion=(scenarioId,questionId)=>{setFilters({age:'',topic:'',type:'',search:''});setSelectedId(scenarioId);setShowCatalog(false);const url=new URL(window.location.href);url.searchParams.set('scenario',scenarioId);url.searchParams.set('question',questionId);url.searchParams.delete('review');history.replaceState(history.state,'',url);setReviewMode(false);};
 const [stored,setStored]=useState(()=>{try{return restoreAttempts(localStorage.getItem(key),bank);}catch{return {records:{},error:true};}});
 const recordsRef=useRef(stored.records);
 const [saveError,setSaveError]=useState(false),[filters,setFilters]=useState({age:bank.find(s=>s.id===new URLSearchParams(window.location.search).get('scenario'))?.ageBand||(EXPERIMENTAL_AGES.includes(initialAge)?initialAge:''),topic:'',type:'',search:''}),[selectedId,setSelectedId]=useState(()=>new URLSearchParams(window.location.search).get('scenario')),[showCatalog,setShowCatalog]=useState(true);
 const filtered=filterScenarios(bank,filters), selected=filtered.find(s=>s.id===selectedId)||filtered[0];
 const count=bank.reduce((n,s)=>n+s.questions.length,0), practiceCount=bank.reduce((n,s)=>n+selectPracticeQuestions(s).length,0), topics=[...new Set(bank.map(s=>s.topic))].sort();
 const update=(field,value)=>{setFilters(current=>({...current,[field]:value}));setShowCatalog(true);};
 function record(q,value,reviewed){
  const records=updateAttempt(recordsRef.current,selected,q,value,reviewed);recordsRef.current=records;
  try{localStorage.setItem(key,JSON.stringify(records));setSaveError(false);}catch{setSaveError(true);}
  setStored({records,error:false});
 }
 return <section className="ep-root" aria-label="Experimental scenario bank">
  <header className="ep-heading"><div><p className="ep-kicker">RINKREADS / EXPERIMENTAL PRACTICE</p><h1>One situation.<br/><em>Several ways to read it.</em></h1><p>Explore original hockey situations, place players, spot cues and explain your choices.</p></div><div className="ep-count"><strong>{bank.length}</strong><span>SCENARIOS</span><small>{practiceCount} practice questions · {count} in the authoring bank</small></div></header>
  <p className="ep-experimental">Experimental collection · Teaching answers are drafts for coaching review. Practice here does not award mastery points.</p>
  {calibration&&<p className="ep-experimental"><strong>Calibration drafts · {bank.length} scenes / {count} authored questions.</strong> These are separate from the normal bank. Static movement decisions do not assess skating technique. Responses save separately on this device; activity is excluded from normal practice analytics. <a href="/docs/factory/calibration/index.html">Review and export coaching feedback ↗</a></p>}
  {stored.error&&<p role="alert">Saved experimental responses could not be restored. Earlier practice history is unchanged.</p>}{saveError&&<p role="alert">Your responses are kept for this visit, but this browser could not save them.</p>}
  {!calibration&&<div className="ep-catalog-actions"><button type="button" onClick={()=>toggleReview(!reviewMode)}>{reviewMode?'Return to practice':'Question workshop · browse and triage'}</button><button type="button" aria-expanded={showInsights} onClick={()=>setShowInsights(v=>!v)}>{showInsights?'Hide practice report':'Practice report'}</button><a href="/docs/factory/curriculum-map/index.html" target="_blank" rel="noreferrer">Curriculum coverage ↗</a><a href="/docs/factory/RinkReads-Claude-Project-2026-09-05.zip" download>Download Claude project</a></div>}
  {!calibration&&showInsights&&<ExperimentalPracticeInsights store={analytics} bank={bank} manifest={contentManifest}/>}
  {!calibration&&<p className="ep-hint">Question views, checks, retries, optional skips, camera choices and flag categories are counted on this device to help improve the bank. Export them from Practice report. Written responses are not included in that report.</p>}
  {reviewMode?<QuestionReviewRoom bank={bank} state={reviewState} onState={saveReview} onOpen={openQuestion}/>:<>
  <div className="ep-filters"><label>Search<input type="search" placeholder="Topic, situation or ID" value={filters.search} onChange={e=>update('search',e.target.value)}/></label><label>Age<select value={filters.age} onChange={e=>update('age',e.target.value)}><option value="">All ages</option>{EXPERIMENTAL_AGES.map(age=><option key={age}>{age}</option>)}</select></label><label>Topic<select value={filters.topic} onChange={e=>update('topic',e.target.value)}><option value="">All topics</option>{topics.map(topic=><option key={topic}>{topic}</option>)}</select></label><label>Question type<select value={filters.type} onChange={e=>update('type',e.target.value)}><option value="">All types</option>{Object.entries(QUESTION_TYPES).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label></div>
  <div className="ep-catalog-actions"><span>{filtered.length} of {bank.length} scenarios</span><button type="button" onClick={()=>setShowCatalog(v=>!v)}>{showCatalog?'Hide catalog':'Browse catalog'}</button><button type="button" onClick={()=>downloadFile('rinkreads-experimental-catalog.csv',catalogCsv(bank),'text/csv;charset=utf-8')}>Export question catalog</button><button type="button" onClick={()=>downloadFile('rinkreads-experimental-scenarios.json',JSON.stringify({version:1,status:'experimental-not-approved',scenarios:bank},null,2),'application/json')}>Export scenarios</button></div>
  {showCatalog&&<div className="ep-catalog" role="region" aria-label="Scenario catalog"><table><thead><tr><th>Scenario</th><th>Age / topic</th><th>Practice questions</th><th>Reviewed here</th></tr></thead><tbody>{filtered.map(s=><tr key={s.id} className={s.id===selected?.id?'is-current':''}><td><button type="button" onClick={()=>{setSelectedId(s.id);setShowCatalog(false);}}><strong>{s.title}</strong><small>{s.id} · {s.family}</small></button></td><td>{s.ageBand}<small>{s.topic}</small></td><td>{summarizePracticeRecord(s).questionCount}<small>{[...new Set(s.questions.map(q=>QUESTION_TYPES[q.type]))].join(' · ')}</small></td><td>{summarizePracticeRecord(s,stored.records[s.id]).reviewedCount} / {summarizePracticeRecord(s).questionCount}</td></tr>)}</tbody></table></div>}
  {!filtered.length?<p className="ep-empty">No scenarios match these filters. Try another age or topic.</p>:<ScenarioQuestions key={`${key}:${selected.id}:${selected.version}`} scenario={selected} record={stored.records[selected.id]} onRecord={record} onFlag={calibration?null:flag} onMetric={metric}/>}
  </>}
 </section>;
}
