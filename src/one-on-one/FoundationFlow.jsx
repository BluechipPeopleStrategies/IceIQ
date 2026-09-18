import {lazy, Suspense, useEffect, useRef, useState} from 'react';
import content from './foundationContent.json';
import {STAGES, normalizeAge, newFlow, loadFlow, saveFlow, canContinue, advanceFlow} from './foundationFlowCore.js';
import {foundationRink} from './foundationRink.js';
import {refArt} from './foundationSignals.js';
import './FoundationFlow.css';
import GearPacking from './GearPacking.jsx';
import HelmetExplorer from './HelmetExplorer.jsx';
import ParentGearGuide from './ParentGearGuide.jsx';
import GearAccessories from './GearAccessories.jsx';
import MovableIllustration from './MovableIllustration.jsx';
import {rinkLandmarks,rinkRole,initialRolePositions,clampRinkPoint} from './foundationInteraction.js';
const FoundationRink3D=lazy(()=>import('./FoundationRink3D.jsx'));
const FoundationObject3D=lazy(()=>import('./FoundationObject3D.jsx'));

function SamplePanel({kind}){
  const [open,setOpen]=useState(false);
  const helmet=kind==='helmet';
  if(helmet)return <div className="ff-sample-toggle"><button aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{open?'Close helmet explorer':'Explore the helmet'}</button>{open&&<HelmetExplorer/>}</div>;
  const fallback=<img className="ff-ref-photo" src="/assets/gear/referee-holding-v1.png" alt="Referee holding one wrist with the opposite hand in front of the chest"/>;
  return <div className="ff-sample-toggle"><button aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{open?'Close': 'Explore'} {helmet?'helmet':'holding signal'} 3D sample</button>{open&&<Suspense fallback={<p role="status">Loading the 3D sample…</p>}><FoundationObject3D kind={kind} fallback={fallback}/></Suspense>}</div>;
}

function deviceStorage(){try{return globalThis.localStorage;}catch{return null;}}
export default function FoundationFlow({playerId,ageBand,onBack,backLabel='Back to worlds',allowSkip=false,initialStage=null}){
  const age=normalizeAge(ageBand);
  if(!playerId||!['U7','U9','U11'].includes(age))return <section className="ff-root"><h1>Choose U7, U9 or U11 to explore foundations.</h1><button onClick={onBack}>{backLabel}</button></section>;
  return <Flow key={`${playerId}:${age}`} scope={{playerId,ageBand:age}} onBack={onBack} backLabel={backLabel} allowSkip={allowSkip} initialStage={initialStage}/>;
}
function Flow({scope,onBack,backLabel,allowSkip,initialStage}){
  const [initial]=useState(()=>{const loaded=loadFlow(deviceStorage(),scope);if(allowSkip&&Number.isInteger(initialStage)&&initialStage>=0&&initialStage<STAGES.length)loaded.flow={...loaded.flow,stage:initialStage};return loaded;});
  const [flow,setFlow]=useState(initial.flow),[saved,setSaved]=useState(initial.available?null:false);
  const [spot,setSpot]=useState(initial.flow.spots.at(-1)||'blue'),[role,setRole]=useState(initial.flow.roles.at(-1)||'C');
  const [map,setMap]=useState(false),[phase,setPhase]=useState('attack'),[turnover,setTurnover]=useState('lose');
  const [signal,setSignal]=useState(()=>Math.max(0,content.signals.findIndex(s=>initial.flow.stage===3?!initial.flow.signals.includes(s.id):initial.flow.answers[s.id]!==s.id)));

  const [rinkView,setRinkView]=useState('3d');
  const [nearby,setNearby]=useState([]),[tool,setTool]=useState('explore'),[puck,setPuck]=useState({x:12,y:3}),[positions,setPositions]=useState(initialRolePositions);


  const heading=useRef(null),rinkRef=useRef(null),pendingFocus=useRef(null),flowRef=useRef(initial.flow);
  useEffect(()=>{if(pendingFocus.current){rinkRef.current?.querySelector(pendingFocus.current)?.focus({preventScroll:true});pendingFocus.current=null;}},[flow]);
  useEffect(()=>{heading.current?.focus({preventScroll:true});},[flow.stage]);
  // Save only explicit learner actions; never write an old player's state from an effect.
  function update(change){const next=typeof change==='function'?change(flowRef.current):change;flowRef.current=next;setFlow(next);setSaved(saveFlow(deviceStorage(),scope,next).saved);}
  const visit=(key,id)=>update(current=>({...current,[key]:[...new Set([...current[key],id])]}));
  function selectSpot(id){setSpot(id);visit('spots',id);}
  function selectRole(id){setRole(id);visit('roles',id);}
  function jump(stage){update(current=>({...current,stage}));setSignal(0);setTool('explore');window.scrollTo({top:0,behavior:'instant'});}
  function place(x,y){const point=clampRinkPoint(x,y);if(tool==='player')setPositions(p=>({...p,[role]:point}));else setPuck(point);}
  function pointRink(x,y){
    if(flow.stage===0){const hits=rinkLandmarks(x,y);setNearby(hits);if(hits[0])selectSpot(hits[0]);}
    else if(map&&tool!=='explore')place(x,y);
    else {const id=rinkRole(x,y,positions);if(id)selectRole(id);else if(map)setPuck(clampRinkPoint(x,y));}
  }
  function tapDrawing(event){
    if(event.target.closest('[data-spot],[data-role]'))return;
    const svg=event.currentTarget.querySelector('svg'),matrix=svg?.getScreenCTM();if(!matrix)return;
    const point=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());pointRink((point.x-350)/9.7,(point.y-190)/9.7);
  }
  function pack(id,remove=false){const item=content.gear.find(g=>g[0]===id);if(!item)return;update(current=>({...current,packed:remove?current.packed.filter(x=>x!==id):[...new Set([...current.packed,id])]}));}
  function chooseRink(event){const marker=event.target.closest('[data-spot],[data-role]');if(!marker)return;pendingFocus.current=marker.dataset.spot?`[data-spot="${marker.dataset.spot}"]`:`[data-role="${marker.dataset.role}"]`;if(marker.dataset.spot){setSpot(marker.dataset.spot);visit('spots',marker.dataset.spot);}else{setRole(marker.dataset.role);visit('roles',marker.dataset.role);}}
  const currentSpot=content.spots.find(s=>s[0]===spot),currentRole=content.roles[role],currentSignal=content.signals[signal];
  const correct=flow.answers[currentSignal.id]===currentSignal.id;
  const options=[currentSignal,...[1,3,4].slice(0,({U7:2,U9:3,U11:4})[scope.ageBand]-1).map(offset=>content.signals[(signal+offset)%content.signals.length])].sort((a,b)=>a.name.localeCompare(b.name));
  const allExplored=[0,1,2,3,4].every(stage=>canContinue({...flow,stage}));
  const puckArea=content.spots.find(s=>s[0]===rinkLandmarks(puck.x,puck.y)[0])?.[1]||'open ice';
  const rinkSvg=foundationRink({mode:flow.stage===0?'landmarks':map?'heat':'lineup',spot,role,phase,turnover,positions,puck});
  const remaining=[`Find the blue lines, net and boards (${['blue','net','boards'].filter(id=>flow.spots.includes(id)).length}/3).`,`Meet all six positions (${flow.roles.length}/6).`,`Pack all 13 gear types (${flow.packed.length}/13).`,`Explore all six signals (${flow.signals.length}/6).`,`Match all six calls (${content.signals.filter(s=>flow.answers[s.id]===s.id).length}/6).`][flow.stage];
  return <section className="ff-root" aria-label="Foundations learning flow">
    <header className="ff-header"><button onClick={onBack}>{backLabel}</button><span>{scope.ageBand} · Frozen Trails</span></header>
    <p className="ff-review">Early preview · content review pending. No mastery credit.</p>
    <p className="ff-save" role="status">{saved===null?'Explore to save your next step on this device.':saved?'Saved on this device for this player and age.':'Not saved: device storage is unavailable. You can continue, but reloading may lose this session.'}</p>
    <ol className="ff-stages" aria-label="Learning path">{STAGES.map((name,i)=><li key={name} aria-current={flow.stage===i?'step':undefined}>{allowSkip?<button onClick={()=>jump(i)} aria-current={flow.stage===i?'step':undefined}><span>{i+1}</span>{name}</button>:<><span>{i+1}</span>{name}</>}</li>)}</ol>
    {allowSkip&&<p className="ff-demo-note">We recommend exploring these sections in order, but you can jump to any section for this demo. Skipping does not mark an activity completed.</p>}
    <div className="ff-chapter" key={flow.stage}><span>FROZEN TRAILS · {String(flow.stage+1).padStart(2,'0')} / 06</span><h1 ref={heading} tabIndex={-1}>{STAGES[flow.stage]}</h1></div>
    {flow.stage===0&&<p>Find three familiar places first: the blue lines, the net and the boards. Explore the other spots whenever you like.</p>}
    {flow.stage===1&&<p>Meet the six positions. These are starting places, not places to stay. Younger players explore different roles.</p>}
    {flow.stage<=1&&<>
      <div className="ff-direction"><span>← Our net</span><span>We attack this way →</span></div>
      {flow.stage===1&&<div className="ff-options"><button aria-pressed={!map} onClick={()=>{setMap(false);setTool('explore');}}>Lineup</button><button aria-pressed={map} onClick={()=>setMap(true)}>Responsibility map</button><span className="ff-note">Gold = selected · navy = other players</span></div>}
      {rinkView==='3d'?<Suspense fallback={<p role="status">Loading the 3D rink… You can switch to 2D below.</p>}><FoundationRink3D svg={rinkSvg} onPoint={pointRink} placing={map&&tool!=='explore'}/></Suspense>:<MovableIllustration label="Rink" onTap={tapDrawing} allowPan={!map||tool==='explore'}><div className="ff-rink" ref={rinkRef} onClick={chooseRink} onKeyDown={e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('g[role="button"]')){e.preventDefault();chooseRink(e);}}} dangerouslySetInnerHTML={{__html:rinkSvg}}/></MovableIllustration>}
      <div className="ff-options" aria-label="Rink display"><button aria-pressed={rinkView==='3d'} onClick={()=>setRinkView('3d')}>3D rink</button><button aria-pressed={rinkView==='2d'} onClick={()=>setRinkView('2d')}>2D rink</button></div>
      {flow.stage===0?<details className="ff-landmark-list"><summary>All 22 rink landmarks</summary><div className="ff-options">{content.spots.map(s=><button key={s[0]} data-foundation-spot={s[0]} aria-pressed={spot===s[0]} onClick={()=>selectSpot(s[0])}>{s[1]}{flow.spots.includes(s[0])?' · explored':''}</button>)}</div></details>:<div className="ff-options ff-role-options">{Object.entries(content.roles).map(([id,r])=><button key={id} data-foundation-role={id} aria-pressed={role===id} onClick={()=>selectRole(id)}>{id} · {r.name}{flow.roles.includes(id)?' · explored':''}</button>)}</div>}
      {flow.stage===0?<><div className="ff-options" aria-label="At this rink spot">{nearby.length>1&&<><span>Also here:</span>{nearby.filter(id=>id!==spot).map(id=><button key={id} onClick={()=>selectSpot(id)}>{content.spots.find(s=>s[0]===id)?.[1]}</button>)}</>}</div><article className="ff-explanation" aria-live="polite"><h2>{currentSpot[1]}</h2><p>{currentSpot[6]}</p><p>{currentSpot[7]}</p></article></>:<>
        {map&&<section className="ff-map-tools" aria-label="Responsibility map controls"><div className="ff-options">{[['explore','Explore'],['puck','Move puck'],['player',`Move ${role}`]].map(([id,label])=><button key={id} aria-pressed={tool===id} onClick={()=>setTool(id)}>{label}</button>)}<button onClick={()=>{setPositions(initialRolePositions());setPuck({x:12,y:3});setTool('explore');}}>Reset positions</button></div><p className="ff-note">Tap a player to select it. Tap open ice to move the puck, or choose Move {role} to place that player. The dotted line connects your player and puck; it is not a skating route.</p>{tool!=='explore'&&<div className="ff-map-sliders">{[['x','Along the rink',-29,29],['y','Across the rink',-12,12]].map(([axis,label,min,max])=><label key={axis}>{label}<input type="range" min={min} max={max} step=".5" value={(tool==='player'?positions[role]:puck)[axis]} onChange={e=>{const p=tool==='player'?positions[role]:puck;place(axis==='x'?Number(e.target.value):p.x,axis==='y'?Number(e.target.value):p.y);}}/></label>)}</div>}<p role="status">{currentRole.name} · Puck near {puckArea.toLowerCase()}. What changes when you move the puck?</p></section>}
        {map&&<><div className="ff-options">{['attack','defend','transition'].map(p=><button key={p} aria-pressed={phase===p} onClick={()=>setPhase(p)}>{({attack:'Attacking',defend:'Defending',transition:'Transition'})[p]}</button>)}</div>{phase==='transition'&&<div className="ff-options">{['win','lose'].map(t=><button key={t} aria-pressed={turnover===t} onClick={()=>setTurnover(t)}>We {t} the puck</button>)}</div>}<p className="ff-note">Illustrative responsibility emphasis: warmer colour means more emphasis. This is not tracking data, a fixed assignment or a boundary players must stay inside.</p></>}
        <article className="ff-explanation" aria-live="polite"><h2>{currentRole.name}</h2><p>{currentRole.summary}</p>{map?<p>{currentRole[phase==='transition'?turnover:phase]}</p>:<><p><strong>Attacking:</strong> {currentRole.attack}</p><p><strong>Defending:</strong> {currentRole.defend}</p><p><strong>Possession changes:</strong> {currentRole.win} {currentRole.lose}</p></>}</article>
      </>}
      <p className="ff-note">Full-ice orientation example. U7/U9 game formats differ. Left/right are viewed toward the opponent’s net. Exact maps remain coaching-review drafts.</p>
    </>}
    {flow.stage===2&&<>
      <SamplePanel kind="helmet"/>
      <ParentGearGuide/>
      <GearPacking gear={content.gear} packed={flow.packed} onPack={pack} onEmpty={()=>update(current=>({...current,packed:[]}))} ageBand={scope.ageBand}/>
      <GearAccessories/>
      <p className="ff-note">A learning checklist, not a safety inspection. An adult checks real gear, fit, condition and program requirements. Goalies need a different kit. Bring a water bottle too.</p>
    </>}
    {(flow.stage===3||flow.stage===4)&&<>
      {flow.stage===3&&currentSignal.id==='holding'&&<SamplePanel kind="referee"/>}
      <p>{flow.stage===3?'Notice the hands and arms. Learn the signal before trying the matching activity.':'Match the signal to its call. Read the feedback and try again as often as you need.'}</p>
      <p>Signal {signal+1} of {content.signals.length}</p>
      <div className="ff-signal-layout"><div><MovableIllustration key={currentSignal.id} label="Referee signal"><div className="ff-signal-art" dangerouslySetInnerHTML={{__html:refArt(currentSignal).split('</svg>')[0]+'</svg>'}}/></MovableIllustration><p><strong>Watch for:</strong> {currentSignal.cue}</p></div><div>
        {flow.stage===3?<><h2>{currentSignal.name}</h2><p>{currentSignal.meaning}</p><button onClick={()=>{visit('signals',currentSignal.id);setSignal((signal+1)%content.signals.length);}}>Got it — next signal</button></>:<>
          <h2>Which call is this?</h2><div className="ff-choices">{options.map(s=><button key={s.id} data-foundation-answer={s.id} aria-pressed={flow.answers[currentSignal.id]===s.id} onClick={()=>update(current=>({...current,answers:{...current.answers,[currentSignal.id]:s.id}}))}>{s.name}</button>)}</div>
          <p className="ff-explanation" role="status">{correct?`That’s it! ${currentSignal.meaning}`:flow.answers[currentSignal.id]?'Look at the hands and arms again. Try another call.':'Choose a call.'}</p>
          <button disabled={!correct} onClick={()=>setSignal((signal+1)%content.signals.length)}>Next signal</button>
        </>}
      </div></div>
      <p className="ff-note">Recognition practice, not penalty lengths. Age group, local rules and game format affect how calls are handled. Ask your coach or official about your program.</p>
    </>}
    {flow.stage===5&&<article className="ff-explanation"><h2>{allExplored?"You explored the foundations.":"Your demo recap"}</h2><p>{allExplored?"You found rink landmarks, met the positions, packed 13 types of gear and matched six referee signals.":"You can visit every section at your own pace. Skipped activities remain available to explore."}</p><p>{flow.spots.length} landmarks · {flow.roles.length}/6 positions · {flow.packed.length}/13 gear types · {flow.signals.length}/6 signals explored · {content.signals.filter(s=>flow.answers[s.id]===s.id).length}/6 calls matched.</p><p>Tell your adult one thing you noticed and one question you want to ask your coach.</p><p>This recap records activity completion. It does not certify equipment fit, hockey ability or mastery.</p><button onClick={()=>{update(newFlow());setSignal(0);setSpot('blue');setRole('C');setMap(false);}}>Practice this flow again</button></article>}
    <footer className="ff-actions"><button disabled={flow.stage===0} onClick={()=>update(current=>({...current,stage:Math.max(0,current.stage-1)}))}>Previous step</button>{flow.stage<5?<div><p role="status">{canContinue(flow)?'Ready for the next step.':remaining}</p>{allowSkip&&<button onClick={()=>jump(Math.min(5,flow.stage+1))}>Skip for now</button>}<button className="ff-primary" disabled={!canContinue(flow)} onClick={()=>{update(advanceFlow);setSignal(0);window.scrollTo({top:0,behavior:'instant'});}}>Continue</button></div>:<button className="ff-primary" onClick={onBack}>{backLabel}</button>}</footer>
    <details className="ff-sources"><summary>Teaching sources and review status</summary><p>Content revision {content.revision}. Owner-reviewed layout; human content qualification still pending.</p><a href="https://www.hockeycanada.ca/en-ca/hockey-programs/parents/faq">Hockey Canada equipment list</a> · <a href="https://www.hockeycanada.ca/en-ca/hockey-programs/players/essentials/equipment-fitting">Equipment fitting</a> · <a href="https://cdn.hockeycanada.ca/hockey-canada/Hockey-Programs/Officiating/Downloads/2026-28-hc-rulebook-e.pdf">2026–2028 signals, pages 2–3</a> · <a href="https://www.hockeycanada.ca/en-ca/hockey-programs/coaching/under-11/faq">U11 position rotation</a><p>Sources inform general principles; they do not validate the exact maps. No content here is admitted to mastery.</p></details>
  </section>;
}
