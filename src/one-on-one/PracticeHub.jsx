import { Suspense, lazy, useState } from 'react';
import OneOnOne from './OneOnOne.jsx';
import PracticeLibrary from './PracticeLibrary.jsx';
import GuidedCurriculum from './GuidedCurriculum.jsx';
import CoachQuestionLab from './CoachQuestionLab.jsx';
import ReadSequence from './ReadSequence.jsx';
import CoachLab, { draftFromPlay } from './CoachLab.jsx';
import { RinkReadsLogo } from '../shared.jsx';
import './practiceFramework.css';
import './practiceGlass.css';
const CognitiveGym=lazy(()=>import('../cognitive-gym/CognitiveGym.jsx'));
const ScenarioWorkshop=lazy(()=>import('./ScenarioWorkshop.jsx'));
const TABS=[['read','Read the play'],['sgs','Scenario Lab'],['learn','Learn the game'],['play','Play'],['coach','Coach Lab'],['brain','Brain Gym']];
export default function PracticeHub({player}) {
  const [tab,setTab]=useState(()=>typeof window!=='undefined'&&new URLSearchParams(window.location.search).get('arena')==='sgs'?'sgs':'read'),[coachDraft,setCoachDraft]=useState(null),[draftRevision,setDraftRevision]=useState(0),[error,setError]=useState(''),[library,setLibrary]=useState(false);
  const [coachView,setCoachView]=useState('questions'),[questionDraft,setQuestionDraft]=useState(null),[questionRevision,setQuestionRevision]=useState(0);
  function openDirector(draft){setCoachDraft(draft);setDraftRevision(v=>v+1);setCoachView('director');setTab('coach');setError('')}
  function openDraft(play){try{openDirector(draftFromPlay(play))}catch(e){setError(e.message)}}
  function askAboutDraft(draft){setQuestionDraft(structuredClone(draft));setQuestionRevision(v=>v+1);setCoachView('questions')}
  return <main className="pf-hub">
    <header className="pf-header"><a href="#" className="pf-brand"><RinkReadsLogo size={27} wordmark/><span>PRACTICE ARENA</span></a><nav aria-label="RinkReads arena">{TABS.map(([id,label])=><button key={id} aria-pressed={tab===id} onClick={()=>{setTab(id);setError('')}}>{label}</button>)}</nav><span className="pf-preview">REVIEW BUILD</span></header>
    {error&&<p role="alert">{error}</p>}
    {tab==='read'&&<ReadSequence key={player?.id||'practice-preview'} playerId={player?.id||'practice-preview'}/>}
    {tab==='sgs'&&<Suspense fallback={<p>Opening Scenario Lab…</p>}><ScenarioWorkshop key={player?.id||'practice-preview'} playerId={player?.id||'practice-preview'}/></Suspense>}
    {tab==='play'&&<OneOnOne key={player?.id||'practice-preview'} playerId={player?.id||'practice-preview'}/>}
    {tab==='learn'&&<><nav className="pf-learning-switch" aria-label="Learning collection"><button aria-pressed={!library} onClick={()=>setLibrary(false)}>Guided lessons <span>NEW</span></button><button aria-pressed={library} onClick={()=>setLibrary(true)}>Your source library</button></nav>{library?<PracticeLibrary key={`${player?.id||'practice-preview'}:${player?.level||'U11'}`} ageBand={player?.level||'U11'} playerId={player?.id||'practice-preview'} onOpenDraft={openDraft}/>:<GuidedCurriculum playerId={player?.id||'practice-preview'} ageBand={player?.level||'U11'}/>}</>}
    {tab==='coach'&&<><nav className="pf-learning-switch" aria-label="Coach workspace"><button aria-pressed={coachView==='questions'} onClick={()=>setCoachView('questions')}>Questions & positioning</button><button aria-pressed={coachView==='director'} onClick={()=>setCoachView('director')}>Animate a play</button></nav><div hidden={coachView!=='questions'}><CoachQuestionLab key={questionRevision} initialDraft={questionDraft} onOpenDirector={openDirector} playerId={player?.id||'practice-preview'}/></div>{coachView==='director'&&<CoachLab key={draftRevision} initialDraft={coachDraft} onDraftChange={setCoachDraft} onCreateQuestion={askAboutDraft} playerId={player?.id||'practice-preview'}/>}</>}
    {tab==='brain'&&<section className="pf-brain"><div className="pf-section-title"><div><p className="oo-eyebrow">BRAIN GYM / FIVE REPS. ONE SHARPER READ.</p><h1>See the game.<br/><em>Stay a step ahead.</em></h1></div><p>Shot reads. Decisions. Awareness.<br/>Your existing games and progression.</p></div><Suspense fallback={<p>Opening the Brain Gym…</p>}><CognitiveGym playerId={player?.id||'practice-preview'} ageBand={player?.level||'U11 / Atom'}/></Suspense></section>}
    <footer className="pf-footer"><span>RINKREADS · KNOW THE GAME.</span><span>Development player art · New simulations await hockey review</span></footer>
  </main>;
}
