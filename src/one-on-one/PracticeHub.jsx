import { Suspense, lazy, useState } from 'react';
import OneOnOne from './OneOnOne.jsx';
import PracticeLibrary from './PracticeLibrary.jsx';
import GuidedCurriculum from './GuidedCurriculum.jsx';
import LearningWorlds from './LearningWorlds.jsx';
import { allowsRinkDiscovery } from './learningWorldsCore.js';
import CoachQuestionLab from './CoachQuestionLab.jsx';
import ReadSequence from './ReadSequence.jsx';
import CoachLab, { draftFromPlay } from './CoachLab.jsx';
import { RinkReadsLogo } from '../shared.jsx';
import { bandsAvailable } from '../path/pathData.js';
import { JOURNEY_WORLDS } from '../path/journeyPresentation.js';
import './practiceFramework.css';
import './practiceGlass.css';
const CognitiveGym=lazy(()=>import('../cognitive-gym/CognitiveGym.jsx'));
const ScenarioWorkshop=lazy(()=>import('./ScenarioWorkshop.jsx'));
const RinkDiscovery=lazy(()=>import('./RinkDiscovery.jsx'));
const ExperimentalPractice=lazy(()=>import('./ExperimentalPractice.jsx'));
const TABS=[['practice','Practice'],['learn','Learn the game'],['play','Play'],['coach','Coach Lab'],['brain','Brain Gym']];
export function initialHubNavigation(search = typeof window === 'undefined' ? '' : window.location.search) {
  const query = new URLSearchParams(search);
  const context = { ...(bandsAvailable().includes(query.get('age')) ? { ageBand: query.get('age') } : {}), ...(Object.hasOwn(JOURNEY_WORLDS, query.get('world')) ? { worldId: query.get('world') } : {}) };
  if(query.get('arena')==='experimental') return {tab:'practice',practice:'experimental',learn:'worlds',...context};
  if(query.get('arena')==='library') return {tab:'learn',practice:'choose',learn:'library',...context};
  if(query.get('arena')==='worlds') return {tab:'learn',practice:'choose',learn:'worlds',...context};
  if(query.get('arena')==='sgs'&&query.get('sgs')==='discover') return {tab:'learn',practice:'position',learn:'discover',...context};
  return {tab:'practice',practice:query.get('arena')==='sgs'?'position':'choose',learn:'worlds'};
}
export default function PracticeHub({player,initialSearch,onBack}) {
  const learningProfile=`${player?.id||'practice-preview'}:${player?.level||'U11'}`;
  const [navigation,setNavigation]=useState(()=>{const initial=initialHubNavigation(initialSearch);return {...initial,learningProfile,learningAge:initial.ageBand||player?.level||'U11'}}),[coachDraft,setCoachDraft]=useState(null),[draftRevision,setDraftRevision]=useState(0),[error,setError]=useState('');
  const tab=navigation.tab;
  const learningAge=navigation.learningProfile===learningProfile?navigation.learningAge:player?.level||'U11';
  const discoveryAvailable=allowsRinkDiscovery(learningAge);
  const learningView=navigation.learn==='discover'&&!discoveryAvailable?'worlds':navigation.learn;
  const setTab=value=>setNavigation(current=>({...current,tab:value}));
  function openLearningActivity(target){setNavigation(current=>({...current,tab:target.tab,learn:target.learn||current.learn,practice:target.practice||current.practice,learningProfile,learningAge:target.ageBand||learningAge,lessonId:target.lessonId||null,conceptId:target.conceptId||null}));setError('')}
  const [coachView,setCoachView]=useState('questions'),[questionDraft,setQuestionDraft]=useState(null),[questionRevision,setQuestionRevision]=useState(0);
  function openDirector(draft){setCoachDraft(draft);setDraftRevision(v=>v+1);setCoachView('director');setTab('coach');setError('')}
  function openDraft(play){try{openDirector(draftFromPlay(play))}catch(e){setError(e.message)}}
  function askAboutDraft(draft){setQuestionDraft(structuredClone(draft));setQuestionRevision(v=>v+1);setCoachView('questions')}
  return <main className="pf-hub">
    <header className="pf-header">{onBack&&<button className="oo-secondary" onClick={onBack}>Back to Home</button>}<a onClick={onBack ? event=>{event.preventDefault();onBack();} : undefined} href="#" className="pf-brand"><RinkReadsLogo size={27} wordmark/><span>PRACTICE ARENA</span></a><nav aria-label="RinkReads arena">{TABS.map(([id,label])=><button key={id} aria-pressed={tab===id} onClick={()=>{setTab(id);setError('')}}>{label}</button>)}</nav></header>
    {error&&<p role="alert">{error}</p>}
    {tab==='practice'&&<><nav className="pf-learning-switch" aria-label="Practice activity">{[['choose','Choose the play'],['position','Find your position'],['experimental','Experimental scenarios']].map(([id,label])=><button key={id} aria-pressed={navigation.practice===id} onClick={()=>setNavigation(current=>({...current,practice:id}))}>{label}</button>)}</nav>{navigation.practice==='choose'?<ReadSequence key={player?.id||'practice-preview'} playerId={player?.id||'practice-preview'}/>:navigation.practice==='experimental'?<Suspense fallback={<p>Opening experimental scenarios…</p>}><ExperimentalPractice initialAge={learningAge} key={player?.id||'practice-preview'} playerId={player?.id||'practice-preview'}/></Suspense>:<Suspense fallback={<p>Opening positioning practice…</p>}><ScenarioWorkshop key={player?.id||'practice-preview'} playerId={player?.id||'practice-preview'} hideDiscovery/></Suspense>}</>}
    {tab==='play'&&<OneOnOne key={player?.id||'practice-preview'} playerId={player?.id||'practice-preview'}/>}
    {tab==='learn'&&<><nav className="pf-learning-switch" aria-label="Learning collection">{[['worlds','Your hockey worlds'],['guided','Guided lessons'],['library','Lesson library'],['discover','Explore the rink']].filter(([id])=>id!=='discover'||discoveryAvailable).map(([id,label])=><button key={id} aria-pressed={learningView===id} onClick={()=>setNavigation(current=>({...current,learn:id}))}>{label}</button>)}</nav>
      {learningView==='worlds'?<LearningWorlds key={learningProfile} ageBand={learningAge} playerId={learningProfile} initialWorldId={navigation.worldId} onAgeChange={ageBand=>setNavigation(current=>({...current,learningProfile,learningAge:ageBand,lessonId:null,conceptId:null}))} onNavigate={openLearningActivity}/>
        :learningView==='library'?<PracticeLibrary key={`${learningProfile}:${learningAge}:${navigation.conceptId||'all'}`} ageBand={learningAge} initialConcept={navigation.conceptId||''} onOpenDraft={openDraft} playerId={player?.id||'practice-preview'}/>
        :learningView==='discover'?<Suspense fallback={<p>Opening the rink…</p>}><RinkDiscovery key={player?.id||'practice-preview'}/></Suspense>
        :<GuidedCurriculum playerId={player?.id||'practice-preview'} ageBand={learningAge} initialLessonId={navigation.lessonId}/>}
    </>}
    {tab==='coach'&&<><nav className="pf-learning-switch" aria-label="Coach workspace"><button aria-pressed={coachView==='questions'} onClick={()=>setCoachView('questions')}>Questions & positioning</button><button aria-pressed={coachView==='director'} onClick={()=>setCoachView('director')}>Animate a play</button></nav><div hidden={coachView!=='questions'}><CoachQuestionLab key={questionRevision} initialDraft={questionDraft} onOpenDirector={openDirector} playerId={player?.id||'practice-preview'}/></div>{coachView==='director'&&<CoachLab key={draftRevision} initialDraft={coachDraft} onDraftChange={setCoachDraft} onCreateQuestion={askAboutDraft} playerId={player?.id||'practice-preview'}/>}</>}
    {tab==='brain'&&<section className="pf-brain"><div className="pf-section-title"><div><p className="oo-eyebrow">BRAIN GYM / FIVE REPS. ONE SHARPER READ.</p><h1>See the game.<br/><em>Stay a step ahead.</em></h1></div><p>Shot reads. Decisions. Awareness.<br/>Your existing games and progression.</p></div><Suspense fallback={<p>Opening the Brain Gym…</p>}><CognitiveGym key={`${learningProfile}:${learningAge}`} playerId={player?.id||'practice-preview'} ageBand={learningAge}/></Suspense></section>}
    <footer className="pf-footer"><span>RINKREADS · KNOW THE GAME.</span><span>Development player art · New simulations await hockey review</span></footer>
  </main>;
}
