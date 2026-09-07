import { useEffect, useMemo, useRef, useState } from 'react';
import { LEVELS } from '../shared.jsx';
import { loadQB } from '../qbLoader.js';
import { ALL_ANIMATED_PLAYS } from '../play/playCatalog.js';
import AnimatedPlay from '../play/AnimatedPlay.jsx';
import { ScenarioRenderer } from '../scenario/index.js';
import RinkReadsRinkQuestion from '../RinkReadsRinkQuestion.jsx';
import ScenarioImage from '../visuals/ScenarioImage.jsx';
import { COACH_PERSONAS, getCoachForQuestion, coachReaction } from '../coachPersonas.js';
import { CoachFeedback } from '../play/CoachFeedback.jsx';
import { TYPE_LABELS, questionOptions, scoreLesson, creditLesson, buildLibrary } from './lessonCore.js';

const documents=import.meta.glob('../../docs/library/*.md',{query:'?raw',import:'default',eager:true});
const NOTES=Object.entries(documents).filter(([path])=>!path.split('/').at(-1).startsWith('_')&&!path.endsWith('/INDEX.md')).map(([path,text])=>({id:path.split('/').at(-1).replace('.md',''),title:text.replace(/^\uFEFF/,'').split('\n').map(l=>l.trim()).find(l=>l.startsWith('# '))?.replace(/^# /,'').replace(/\s*\(`.*`\)/,'')||path.split('/').at(-1),text,path:path.replace('../../','')}));
const readProgress=key=>{try{const value=JSON.parse(localStorage.getItem(key));return value&&typeof value==='object'&&!Array.isArray(value)?value:{};}catch{return {};}};

function SourceQuestion({item,coachId,onCredit,playerId}) {
  const q=item.source;
  const [answer,setAnswer]=useState(null), [result,setResult]=useState(null), [order,setOrder]=useState(()=>q.items?.map((_,i)=>i)||[]),[picks,setPicks]=useState([]);
  const locked=useRef(false);
  const coach=COACH_PERSONAS.find(c=>c.id===coachId)||getCoachForQuestion(q,item.age,'Forward');
  function submit(correct,value){if(locked.current)return;locked.current=true;setAnswer(value);setResult(correct);onCredit(correct);}
  const spatial=q.type==='scenario'||q.rink;
  const options=questionOptions(q);
  return <div className="pf-question">
    {!spatial&&<><p className="oo-eyebrow">{TYPE_LABELS[item.type]||item.type} · {item.age.split(' / ')[0]}</p>{q.question&&q.sit&&<p>{q.sit}</p>}<h2>{q.question||q.sit||q.q||q.prompt||q.title}</h2>
      <ScenarioImage media={q.media} overlays={q.overlays} frameRatio={null}/>
      {q.type==='seq'?<><ol className="pf-sequence">{order.map((idx,i)=><li key={idx}><span>{q.items[idx]}</span><button disabled={result!==null||i===0} aria-label={`Move step ${i+1} up`} onClick={()=>setOrder(a=>{const n=[...a];[n[i-1],n[i]]=[n[i],n[i-1]];return n;})}>↑</button><button disabled={result!==null||i===order.length-1} aria-label={`Move step ${i+1} down`} onClick={()=>setOrder(a=>{const n=[...a];[n[i],n[i+1]]=[n[i+1],n[i]];return n;})}>↓</button></li>)}</ol><button className="oo-primary" disabled={result!==null} onClick={()=>submit(scoreLesson(q,order),order)}>Check the sequence</button></>:<div className="pf-options">{options.map(({value,text})=>{
        const chosen=q.type==='multi'?picks.includes(value):answer===value;
        const correct=result!==null&&q.type!=='multi'&&scoreLesson(q,value);
        return <button key={String(value)} disabled={result!==null} aria-pressed={chosen} className={`${correct?'correct':''} ${chosen?'chosen':''}`} onClick={()=>q.type==='multi'?setPicks(a=>a.includes(value)?a.filter(v=>v!==value):[...a,value]):submit(scoreLesson(q,value),value)}><b>{correct?'✓':q.type==='tf'?'?':String.fromCharCode(65+value)}</b><span>{text}</span></button>;
      })}{q.type==='multi'&&<button disabled={result!==null||!picks.length} onClick={()=>submit(scoreLesson(q,picks),picks)}>Check my choices</button>}</div>}
    </>}
    {q.type==='scenario'?<ScenarioRenderer scenario={q} playerId={playerId} onAnswer={p=>{if(p.complete!==false)submit(p.ok,p.picked)}}/>:q.rink?<RinkReadsRinkQuestion question={q} onAnswer={p=>submit(typeof p==='boolean'?p:!!p?.ok,p)}/>:null}
    {result!==null&&<><CoachFeedback coach={coach} correct={result} headline={coachReaction(coach,result,item.age)} explanation={q.why||q.explain||q.explanation||q.feedback?.[result?'correct':'incorrect']||''}/>{q.tip&&<p className="pf-tip">Remember: {q.tip}</p>}{q.type==='seq'&&!result&&<p>Source order: {q.correct_order.map(i=>q.items[i]).join(' → ')}</p>}<div className="pf-earned">{result?'★ Read mastered · 100 practice points':'Read the feedback. You can try this lesson again.'}</div></>}
  </div>;
}

export default function PracticeLibrary({onOpenDraft,playerId='practice-preview',ageBand='U11',initialConcept=''}) {
  const [bank,setBank]=useState(null),[error,setError]=useState('');
  const [age,setAge]=useState(()=>LEVELS.find(value=>value.split(' ')[0]===String(ageBand).split(' ')[0])||'U11 / Atom'),[concept,setConcept]=useState(initialConcept),[type,setType]=useState(''),[search,setSearch]=useState(''),[selected,setSelected]=useState(null),[attempt,setAttempt]=useState(0),[coachId,setCoachId]=useState('auto');
  const progressKey=`rinkreads_practice_lessons_v1:${playerId}`;
  const [progress,setProgress]=useState(()=>readProgress(progressKey));
  const [notice,setNotice]=useState('');
  useEffect(()=>{let active=true;loadQB().then(b=>{if(active)setBank(b)}).catch(e=>{if(active)setError(e.message)});return()=>{active=false};},[]);
  const library=useMemo(()=>buildLibrary(bank||{},ALL_ANIMATED_PLAYS),[bank]);
  const matches=library.filter(i=>i.age===age&&(!concept||i.concept===concept)&&(!type||i.type===type)&&(!search||`${i.title} ${i.source.id}`.toLowerCase().includes(search.toLowerCase())));
  const note=NOTES.find(n=>n.id===concept);
  const records=Object.values(progress),points=records.reduce((s,r)=>s+(Number(r?.points)||0),0),stars=records.filter(r=>r?.mastered).length;
  function credit(correct){if(!selected)return;setProgress(old=>{const next=creditLesson(old,selected.key,correct);try{localStorage.setItem(progressKey,JSON.stringify(next));}catch{setNotice('Progress is available for this visit; browser storage is unavailable.');}return next;});}
  return <section className="pf-library">
    <div className="pf-section-title"><div><p className="oo-eyebrow">YOUR RINKREADS CURRICULUM</p><h1>Learn the read.<br/><em>Then put it on the ice.</em></h1></div><div className="pf-score"><strong>{points.toLocaleString()}</strong><span>PRACTICE POINTS · {stars} ★</span><small>Saved on this device · separate preview progress</small></div></div>
    <div className="pf-filters"><label>AGE GROUP<select aria-label="Age group" value={age} onChange={e=>{setAge(e.target.value);setSelected(null)}}>{Object.keys(bank||{}).map(a=><option key={a}>{a}</option>)}</select></label><label>TEACHING CONCEPT<select aria-label="Teaching concept" value={concept} onChange={e=>{setConcept(e.target.value);setSelected(null)}}><option value="">All concepts</option>{[...new Set([...NOTES.map(n=>n.id),...library.map(i=>i.concept).filter(Boolean)])].sort().map(id=><option key={id} value={id}>{NOTES.find(n=>n.id===id)?.title||id.replaceAll('-',' ')}</option>)}</select></label><label>QUESTION TYPE<select aria-label="Question type" value={type} onChange={e=>{setType(e.target.value);setSelected(null)}}><option value="">All formats</option>{Object.entries(TYPE_LABELS).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><label>FIND A LESSON<input aria-label="Find a lesson" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Gap control, breakouts…"/></label></div>
    {note&&<details className="pf-source-note"><summary>{note.title} · Read your teaching notes</summary><p className="pf-source-id">{note.path}</p><pre>{note.text}</pre></details>}
    <div className="pf-library-grid"><aside className="pf-lesson-list"><p className="oo-eyebrow">{matches.length} LESSONS · {NOTES.length} CONCEPT DOCUMENTS</p>{error&&<p role="alert">{error}</p>}{!bank&&!error&&<p>Loading your RinkReads source library…</p>}{bank&&!matches.length&&<p>No source lessons match these filters. Try another age or format.</p>}{matches.map(i=><button className={selected?.key===i.key?'active':''} key={i.key} onClick={()=>{setSelected(i);setAttempt(0)}}><small>{TYPE_LABELS[i.type]||i.type}{progress[i.key]?.mastered?' · ★':''}</small><strong>{i.title}</strong><span>{i.concept.replaceAll('-',' ')}</span></button>)}</aside>
      <article className="pf-lesson-stage">{selected?<><div className="pf-lesson-toolbar"><label>YOUR COACH<select aria-label="Your coach" value={coachId} onChange={e=>setCoachId(e.target.value)}><option value="auto">Choose for this concept</option>{COACH_PERSONAS.map(c=><option key={c.id} value={c.id}>{c.name} · {c.role}</option>)}</select></label><button onClick={()=>setAttempt(a=>a+1)}>Try again</button></div>
      {selected.type==='animated-play'?<AnimatedPlay key={`${selected.key}:${attempt}`} play={selected.source} ageBand={age.split(' ')[0]} coachOverride={COACH_PERSONAS.find(c=>c.id===coachId)}/>:<SourceQuestion playerId={playerId} key={`${selected.key}:${attempt}`} item={selected} coachId={coachId} onCredit={credit}/>}
      {selected.type==='animated-play'&&<button className="oo-primary" onClick={()=>onOpenDraft(selected.source)}>Explore this setup in Coach Lab →</button>}
      <details className="pf-source-note"><summary>Lesson source & teaching context</summary><code>{selected.source.id}</code><p>{selected.source.sourceRef?.cite||'Existing RinkReads source question. Answers and explanation are preserved.'}</p>{selected.source.sourceRef?.url&&<a href={selected.source.sourceRef.url} target="_blank" rel="noreferrer">Open original reference ↗</a>}<p>{selected.source.sourceRef?.note||'src/data/bank.json or src/scenario/seeds'}</p></details>
      </>:<div className="pf-library-empty"><span>↖</span><h2>Pick a concept.<br/>Find your next read.</h2><p>Your multiple-choice questions, true/false questions, scenarios and animated plays are all here. Choose a lesson to begin.</p><div className="pf-coaches">{COACH_PERSONAS.map(c=><figure key={c.id}><img src={c.imageUrl} alt={c.name}/><figcaption>{c.name}</figcaption></figure>)}</div></div>}{notice&&<p role="status">{notice}</p>}</article></div>
  </section>;
}
