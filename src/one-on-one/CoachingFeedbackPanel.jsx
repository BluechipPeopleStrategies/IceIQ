import {useEffect,useState} from 'react';
import './CoachingFeedbackPanel.css';
import {feedbackOwner} from './feedbackOwner.js';
const tags=['Scene looks wrong','Wording unclear','Answer questionable','Too easy/hard','This works well'];
const labels={received:'Received',investigating:'Investigating',changed:'Changed','needs-context':'Needs more context','no-change':'Reviewed · no change needed'};
export default function CoachingFeedbackPanel({scenario,question,scene,answer,view,presentation={}}){
 const scope=new URLSearchParams(location.search).get('calibration')||'experimental';
 const draftKey=`rr-thought:${scope}:${scenario.id}:${scenario.version}:${question.id}`;
 const [note,setNote]=useState(()=>{try{return localStorage.getItem(draftKey)||''}catch{return ''}}),[selected,setSelected]=useState([]),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[history,setHistory]=useState([]),[all,setAll]=useState(false),[historyError,setHistoryError]=useState('');
 const refresh=async()=>{try{const r=await fetch('/__coaching-feedback',{headers:{'X-Feedback-Owner':feedbackOwner()}});if(!r.ok)throw Error();const data=await r.json();if(!Array.isArray(data.notes))throw Error();setHistory(data.notes);setHistoryError('');}catch{setHistoryError('Your feedback history is unavailable right now. Your draft stays in this browser.');}};
 useEffect(()=>{refresh()},[]);
 const update=text=>{setNote(text);setMessage('');try{localStorage.setItem(draftKey,text)}catch{setMessage('Browser draft saving is unavailable. Keep this page open until sent.')}};
 const send=async()=>{setBusy(true);setMessage('Saving your thought…');try{
  const {questions,version,...sourceScene}=scenario;
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify({scene:sourceScene,question})));
  const contentHash=Array.from(new Uint8Array(bytes)).map(v=>v.toString(16).padStart(2,'0')).join('');
  const context={...(question.type==='explain'?{}:{answer}),view,...presentation,actors:scene.actors.map(({id,x,y,facing})=>({id,x,y,facing})),puck:scene.puck};
  const r=await fetch('/__coaching-feedback',{method:'POST',headers:{'Content-Type':'application/json','X-Feedback-Owner':feedbackOwner()},body:JSON.stringify({scope,scenarioId:scenario.id,scenarioVersion:scenario.version,questionId:question.id,contentHash,note,tags:selected,context})});
  const result=await r.json();if(!r.ok||!result.saved)throw Error(result.error||'Could not save');
  setNote('');setSelected([]);try{localStorage.removeItem(draftKey)}catch{}setMessage('Received. We’ll investigate during the next work pass.');await refresh();
 }catch(e){setMessage(`Not sent. ${e.message.includes('JSON')?'The local feedback service is unavailable.':e.message} Your draft is still here.`)}finally{setBusy(false)}};
 const entries=history.filter(h=>all||h.questionId===question.id).slice().reverse();
 return <aside className="rr-feedback" aria-label="My feedback">
  <details><summary>Leave a thought</summary><p>No review or rewrite needed. A quick observation is enough.</p>
   <div className="rr-feedback-tags" aria-label="Optional feedback tags">{tags.map(tag=><button key={tag} type="button" aria-pressed={selected.includes(tag)} onClick={()=>setSelected(t=>t.includes(tag)?t.filter(v=>v!==tag):[...t,tag])}>{tag}</button>)}</div>
   <label>Your thought<textarea maxLength={4000} value={note} onChange={e=>update(e.target.value)} placeholder="For example: both passes look blocked."/></label>
   <p className="rr-feedback-hint">We’ll include your answer and where the players are, so you don’t have to explain the whole scene.</p>
   <button type="button" disabled={busy||!note.trim()} onClick={send}>{busy?'Sending…':'Send'}</button><p role="status">{message}</p>
  </details>
  <details onToggle={e=>{if(e.currentTarget.open)refresh()}}><summary>My feedback history {history.length>0?`(${history.length})`:''}</summary>
   <div className="rr-feedback-actions"><label><input type="checkbox" checked={all} onChange={e=>setAll(e.target.checked)}/> All questions</label><button type="button" onClick={refresh}>Refresh</button></div>
   {historyError?<p role="status">{historyError}</p>:!entries.length?<p>No feedback {all?'yet':'for this question yet'}.</p>:entries.map(entry=><article key={entry.id}><strong>{labels[entry.status]||'Received'}</strong><p>{entry.note}</p><small>{entry.questionId} · {new Date(entry.receivedAt).toLocaleString()}</small>{entry.updates?.map((u,i)=><div key={i}><p><b>{labels[u.status]}:</b> {u.summary}</p>{u.beforeText&&u.afterText&&<details><summary>Compare the change</summary><p>Before: {u.beforeText}</p><p>After: {u.afterText}</p></details>}</div>)}</article>)}
   <small>Your notes from this browser. Updates appear after we look into them.</small>
  </details>
 </aside>;
}
