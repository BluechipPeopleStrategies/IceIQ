import {useEffect,useMemo,useRef,useState} from 'react';
import * as SB from '../supabase.js';
import {SKILLS,getCoachScale} from '../data/constants.js';
import {OBSERVATION_CONTEXTS,PREVIEW_PLAYER_ID,assessmentCoverage,assessmentIssues,assessmentStorageKey,cleanSkillRatings,editableAssessmentNotes,isDemoAssessment,restoreAssessment,sharedAssessmentNote,validObservation} from './coachAssessmentCore.js';
import './CoachAssessment.css';

const localDate=()=>new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export default function CoachAssessment({coach,player,playerLevel,onDone}){
 const cats=SKILLS[playerLevel]||[],skills=cats.flatMap(c=>c.skills),skillIds=useMemo(()=>skills.map(s=>s.id),[playerLevel]);
 const scale=getCoachScale(playerLevel),key=assessmentStorageKey(coach?.id||'preview',player?.id||'preview');
 const demo=isDemoAssessment({coachId:coach?.id,playerId:player?.id}),preview=player?.id===PREVIEW_PLAYER_ID;
 const [ratings,setRatings]=useState({}),[baseline,setBaseline]=useState({}),[notes,setNotes]=useState({}),[observations,setObservations]=useState({}),[privateNote,setPrivateNote]=useState(''),[privateAvailable,setPrivateAvailable]=useState(true),[active,setActive]=useState(null),[status,setStatus]=useState('loading'),[message,setMessage]=useState(''),[issues,setIssues]=useState([]);
 const requestRef=useRef(0),saveRef=useRef(0),mountedRef=useRef(true);
 const [draftObservation,setDraftObservation]=useState({date:localDate(),context:'Practice',text:''});
 useEffect(()=>{
  const requestId=++requestRef.current;let alive=true;setStatus('loading');setMessage('');setPrivateAvailable(true);
  (async()=>{
   try{
    const cached=restoreAssessment(localStorage.getItem(key),skillIds);
    let existing={ratings:{},notes:{}},privateText=cached?.privateNote||'';
    let privateLoaded=demo;
    if(demo){existing=cached||existing;if(!cached)try{privateText=JSON.parse(localStorage.getItem('rinkreads_demo_coach_notes_v1')||'{}')[player.id]||'';}catch{}}
    else {
     const [ratingsResult,privateResult]=await Promise.allSettled([SB.getCoachRatingsForPlayer(player.id,coach.id),SB.getCoachPlayerNote(player.id)]);
     if(ratingsResult.status==='rejected')throw ratingsResult.reason;
     existing=ratingsResult.value||existing;
     if(privateResult.status==='fulfilled'){privateText=privateResult.value||'';privateLoaded=true;}
     else {privateLoaded=false;}
    }
    if(!alive||requestRef.current!==requestId)return;
    const clean=cleanSkillRatings(existing.ratings,skillIds),shared=editableAssessmentNotes(existing.notes,cached,skillIds);
    setRatings(clean);setBaseline(clean);setNotes(Object.fromEntries(Object.entries(shared).filter(([id,n])=>skillIds.includes(id)&&typeof n==='string')));setObservations(cached?.observations||{});setPrivateNote(privateText);setPrivateAvailable(privateLoaded);setStatus('ready');
    if(!privateLoaded)setMessage('Ratings loaded. The private note could not be loaded, so it is locked and will be left unchanged.');
   }catch(error){if(alive&&requestRef.current===requestId){setStatus('error');setMessage(error?.message||'The assessment could not load. Reload before editing so existing ratings are preserved.');}}
  })();return()=>{alive=false;};
 },[key,playerLevel]);
 useEffect(()=>{mountedRef.current=true;return()=>{mountedRef.current=false;saveRef.current+=1;};},[]);
 const coverage=assessmentCoverage(ratings,skillIds);
 function addObservation(id){
  if(!validObservation(draftObservation,localDate())){setMessage('Add a real observation date, context and a specific example (at least 12 characters).');return;}
  setObservations(old=>({...old,[id]:[...(old[id]||[]),{...draftObservation,text:draftObservation.text.trim()}]}));setDraftObservation({date:localDate(),context:'Practice',text:''});setMessage('Observation added to this draft.');setStatus('ready');
 }
 async function save(){
  const errors=assessmentIssues({ratings,baseline,observations,skillIds,today:localDate()});setIssues(errors);
  if(errors.length){setActive(errors[0].skillId);setMessage('Add evidence for the changed ratings before saving. Earlier ratings are preserved.');return;}
  const clean=cleanSkillRatings(ratings,skillIds),publishedNotes={};
  for(const id of skillIds)if(clean[id])publishedNotes[id]=sharedAssessmentNote(notes[id],observations[id]);
  const requestId=requestRef.current,saveId=++saveRef.current;const current=()=>mountedRef.current&&requestRef.current===requestId&&saveRef.current===saveId;
  let ratingsSaved=false,deviceCopySaved=true;
  setStatus('saving');setMessage('');
  try{
   if(!demo){
    const session=await SB.getSession();if(!session?.user?.id||session.user.id!==coach.id)throw Error('Sign in again with the coach account before saving.');
    await SB.saveCoachRatingsForPlayer(coach.id,player.id,clean,publishedNotes);
    ratingsSaved=true;
    if(privateAvailable)await SB.saveCoachPlayerNote(coach.id,player.id,privateNote.trim());
   }
   if(!current())return;
   const payload={version:1,ratings:clean,notes,observations,privateNote:privateAvailable?privateNote.trim():privateNote,publishedNotes};
   try{localStorage.setItem(key,JSON.stringify(payload));}catch{deviceCopySaved=false;if(demo)throw Error('This browser could not save the demo assessment.');}
   if(!current())return;
   setBaseline(clean);setStatus('saved');setMessage(!deviceCopySaved?'Ratings saved, but the device copy could not be written.':privateAvailable?'Assessment saved.':'Ratings and shared examples saved. The private note was not loaded, so it was left unchanged.');
  }catch(error){if(current()){setStatus('ready');setMessage(ratingsSaved?'Ratings and shared examples saved, but the private note could not be saved. '+(error.message||'Try again.'):error.message||'Could not save. Your unsaved entries remain here.');}}
 }
 return <main className="ca-root"><div className="ca-shell"><button type="button" onClick={onDone}>← Back to team</button><header className="ca-heading"><p>COACH ASSESSMENT / {playerLevel}</p><h1>What are you seeing<br/><em>in {player?.name||'this player'}?</em></h1><span>Record observed hockey behaviour, the context and a useful next step.</span></header>
  {status==='loading'?<p role="status">Loading existing assessment…</p>:status==='error'?<p role="alert">{message}</p>:<>
  <div className="ca-coverage"><strong>{coverage.observed}<small>skills observed</small></strong><strong>{coverage.notObserved}<small>not observed / not applicable</small></strong><p>Leave unfamiliar skills unassessed. An observation is more useful than filling every box.</p></div>
  <details className="ca-scale"><summary>Rating anchors and evidence standard</summary><p>Use the existing age-specific scale. New ratings need a dated example; Proficient and Advanced need examples on two dates, including game context. These are product review requirements, not a statistical percentile test.</p>{scale.map(item=><p key={item.value}><b>{item.label}:</b> {item.sub}</p>)}</details>
  {message&&<p className="ca-message" role="status">{message}</p>}
  {cats.map(cat=><section className="ca-category" key={cat.cat}><h2>{cat.cat}</h2>{cat.skills.map(skill=>{
   const rating=ratings[skill.id],open=active===skill.id,examples=observations[skill.id]||[];
   return <article className="ca-skill" key={skill.id}><button type="button" className="ca-skill-toggle" aria-expanded={open} onClick={()=>{setActive(open?null:skill.id);setDraftObservation({date:localDate(),context:'Practice',text:''});}}><span><strong>{skill.name}</strong><small>{skill.desc}</small></span><span>{scale.find(r=>r.value===rating)?.label||'Not yet assessed'}<small>{examples.length?`${examples.length} observed examples`:rating?'Previous rating':'Add an observation'}</small></span></button>
   {open&&<div className="ca-skill-body"><div className="ca-rating-choices" role="group" aria-label={`Rating ${skill.name}`}>{scale.map(item=><button type="button" key={item.value} aria-pressed={rating===item.value} onClick={()=>{setRatings(old=>({...old,[skill.id]:item.value}));setStatus('ready');}}><b>{item.value==='n/a'?'Not observed / not applicable':item.label}</b><span>{item.sub}</span></button>)}</div>
   {issues.filter(i=>i.skillId===skill.id).map((issue,i)=><p key={i} role="alert" className="ca-issue">{issue.message}</p>)}
   <div className="ca-observation"><h3>What happened?</h3><p>Describe an action you saw, the pressure or support present, and how much prompting was needed.</p><div className="ca-two"><label>Observed on<input type="date" max={localDate()} value={draftObservation.date} onChange={e=>setDraftObservation(old=>({...old,date:e.target.value}))}/></label><label>Context<select value={draftObservation.context} onChange={e=>setDraftObservation(old=>({...old,context:e.target.value}))}>{OBSERVATION_CONTEXTS.map(context=><option key={context}>{context}</option>)}</select></label></div><label>Observed example<textarea value={draftObservation.text} maxLength={2000} onChange={e=>setDraftObservation(old=>({...old,text:e.target.value}))} placeholder="During the wall drill, checked the middle before receiving on four of six reps, with one reminder."/></label><button type="button" onClick={()=>addObservation(skill.id)}>Add observation</button><ul>{examples.map((item,index)=><li key={index}><b>{item.date} · {item.context}</b><p>{item.text}</p></li>)}</ul></div>
   <label>Discussion note / next step<textarea value={notes[skill.id]||''} maxLength={5000} onChange={e=>{setNotes(old=>({...old,[skill.id]:e.target.value}));setStatus('ready');}} placeholder="One useful action to practise next…"/><small>The player can see this note and the observed examples when ratings are saved.</small></label></div>}
   </article>;
  })}</section>)}
  {!scale.length&&<p>This age does not use a numerical skill-rating scale. Record age-appropriate coaching notes.</p>}
  <section className="ca-private"><h2>Private coach note</h2><p>Kept separate from the shared skill observations and discussion notes.</p>{!privateAvailable&&<p id="private-note-locked" className="ca-issue" role="status">This private note could not be loaded. It stays unchanged while ratings are saved.</p>}<textarea aria-label="Private coach note" aria-describedby={!privateAvailable?'private-note-locked':undefined} value={privateNote} maxLength={10000} disabled={!privateAvailable||status==='saving'} onChange={e=>{setPrivateNote(e.target.value);setStatus('ready');}}/></section>
  <div className="ca-save"><p>{demo?'Demo assessment · saved on this device':preview?'Preview assessment · saved on this device':'Ratings and shared examples save to the player’s report. The private note is stored separately.'}</p><button type="button" className="ca-primary" disabled={status==='saving'} onClick={save}>{status==='saving'?'Saving…':status==='saved'?'Saved · save further changes':'Save assessment'}</button>{status==='saved'&&<span role="status">{demo?'Demo ratings and notes saved on this device.':privateAvailable?'Assessment saved.':'Ratings and shared examples saved; private note left unchanged.'}</span>}</div>
  </>}
 </div></main>;
}
