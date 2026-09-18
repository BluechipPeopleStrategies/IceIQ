import {lazy, Suspense, useEffect, useRef, useState} from 'react';
import content from './foundationContent.json';
import {STAGES, normalizeAge, newFlow, loadFlow, saveFlow, canContinue, advanceFlow} from './foundationFlowCore.js';
import {foundationRink} from './foundationRink.js';
import {refArt} from './foundationSignals.js';
import './FoundationFlow.css';
import MovableIllustration from './MovableIllustration.jsx';
const FoundationRink3D=lazy(()=>import('./FoundationRink3D.jsx'));

function deviceStorage(){try{return globalThis.localStorage;}catch{return null;}}
export default function FoundationFlow({playerId,ageBand,onBack,backLabel='Back to worlds'}){
  const age=normalizeAge(ageBand);
  if(!playerId||!['U7','U9','U11'].includes(age))return <section className="ff-root"><h1>Choose U7, U9 or U11 to explore foundations.</h1><button onClick={onBack}>{backLabel}</button></section>;
  return <Flow key={`${playerId}:${age}`} scope={{playerId,ageBand:age}} onBack={onBack} backLabel={backLabel}/>;
}
function Flow({scope,onBack,backLabel}){
  const [initial]=useState(()=>loadFlow(deviceStorage(),scope));
  const [flow,setFlow]=useState(initial.flow),[saved,setSaved]=useState(initial.available);
  const [spot,setSpot]=useState(initial.flow.spots.at(-1)||'blue'),[role,setRole]=useState(initial.flow.roles.at(-1)||'C');
  const [map,setMap]=useState(false),[phase,setPhase]=useState('attack'),[turnover,setTurnover]=useState('lose');
  const [signal,setSignal]=useState(()=>Math.max(0,content.signals.findIndex(s=>initial.flow.stage===3?!initial.flow.signals.includes(s.id):initial.flow.answers[s.id]!==s.id)));
  const [gearInspectId,setGearInspectId]=useState('helmet');
  const [rinkView,setRinkView]=useState('3d');
  const inspectedGear=content.gear.find(g=>g[0]===gearInspectId);
  const [gearNote,setGearNote]=useState('Select a piece to learn about it.'),[dragging,setDragging]=useState(false);
  const heading=useRef(null),rinkRef=useRef(null),pendingFocus=useRef(null),flowRef=useRef(initial.flow);
  useEffect(()=>{if(pendingFocus.current){rinkRef.current?.querySelector(pendingFocus.current)?.focus({preventScroll:true});pendingFocus.current=null;}},[flow]);
  useEffect(()=>{heading.current?.focus({preventScroll:true});},[flow.stage]);
  // Save only explicit learner actions; never write an old player's state from an effect.
  function update(change){const next=typeof change==='function'?change(flowRef.current):change;flowRef.current=next;setFlow(next);setSaved(saveFlow(deviceStorage(),scope,next).saved);}
  const visit=(key,id)=>update(current=>({...current,[key]:[...new Set([...current[key],id])]}));
  function pack(id,remove=false){const item=content.gear.find(g=>g[0]===id);if(!item)return;setGearInspectId(id);update(current=>({...current,packed:remove?current.packed.filter(x=>x!==id):[...new Set([...current.packed,id])]}));setGearNote((remove?'Taken out. ':'')+item[2]);}
  function chooseRink(event){const marker=event.target.closest('[data-spot],[data-role]');if(!marker)return;pendingFocus.current=marker.dataset.spot?`[data-spot="${marker.dataset.spot}"]`:`[data-role="${marker.dataset.role}"]`;if(marker.dataset.spot){setSpot(marker.dataset.spot);visit('spots',marker.dataset.spot);}else{setRole(marker.dataset.role);visit('roles',marker.dataset.role);}}
  const currentSpot=content.spots.find(s=>s[0]===spot),currentRole=content.roles[role],currentSignal=content.signals[signal];
  const correct=flow.answers[currentSignal.id]===currentSignal.id;
  const options=[currentSignal,...content.signals.filter(s=>s.id!==currentSignal.id).slice(0,({U7:2,U9:3,U11:4})[scope.ageBand]-1)].sort((a,b)=>a.name.localeCompare(b.name));
  const remaining=[`Find the blue lines, net and boards (${['blue','net','boards'].filter(id=>flow.spots.includes(id)).length}/3).`,`Meet all six positions (${flow.roles.length}/6).`,`Pack all 13 gear types (${flow.packed.length}/13).`,`Explore all six signals (${flow.signals.length}/6).`,`Match all six calls (${content.signals.filter(s=>flow.answers[s.id]===s.id).length}/6).`][flow.stage];
  return <section className="ff-root" aria-label="Foundations learning flow">
    <header className="ff-header"><button onClick={onBack}>{backLabel}</button><span>{scope.ageBand} · Frozen Trails</span></header>
    <p className="ff-review">Local review · content awaiting coach, equipment and official review. No mastery credit or world unlocks.</p>
    <p className="ff-save" role="status">{saved?'Saved on this device for this player and age.':'Not saved: device storage is unavailable. You can continue, but reloading may lose this session.'}</p>
    <ol className="ff-stages" aria-label="Learning path">{STAGES.map((name,i)=><li key={name} aria-current={flow.stage===i?'step':undefined}><span>{i+1}</span>{name}</li>)}</ol>
    <div className="ff-chapter" key={flow.stage}><span>FROZEN TRAILS · {String(flow.stage+1).padStart(2,'0')} / 06</span><h1 ref={heading} tabIndex={-1}>{STAGES[flow.stage]}</h1></div>
    {flow.stage===0&&<p>Find three familiar places first: the blue lines, the net and the boards. Explore the other spots whenever you like.</p>}
    {flow.stage===1&&<p>Meet the six positions. These are starting places, not places to stay. Younger players explore different roles.</p>}
    {flow.stage<=1&&<>
      <div className="ff-direction"><span>← Our net</span><span>We attack this way →</span></div>
      {rinkView==='3d'?<Suspense fallback={<p role="status">Loading the 3D rink… You can switch to 2D below.</p>}><FoundationRink3D svg={foundationRink({mode:flow.stage===0?'landmarks':map?'heat':'lineup',spot,role,phase,turnover})}/></Suspense>:<MovableIllustration label="Rink"><div className="ff-rink" ref={rinkRef} onClick={chooseRink} onKeyDown={e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('g[role="button"]')){e.preventDefault();chooseRink(e);}}} dangerouslySetInnerHTML={{__html:foundationRink({mode:flow.stage===0?'landmarks':map?'heat':'lineup',spot,role,phase,turnover})}}/></MovableIllustration>}
      <div className="ff-options" aria-label="Rink display"><button aria-pressed={rinkView==='3d'} onClick={()=>setRinkView('3d')}>3D rink</button><button aria-pressed={rinkView==='2d'} onClick={()=>setRinkView('2d')}>2D rink</button></div>
      <div className="ff-options">{flow.stage===0?content.spots.map(s=><button key={s[0]} data-foundation-spot={s[0]} aria-pressed={spot===s[0]} onClick={()=>{setSpot(s[0]);visit('spots',s[0]);}}>{s[1]}{flow.spots.includes(s[0])?' · explored':''}</button>):Object.entries(content.roles).map(([id,r])=><button key={id} data-foundation-role={id} aria-pressed={role===id} onClick={()=>{setRole(id);visit('roles',id);}}>{id} · {r.name}{flow.roles.includes(id)?' · explored':''}</button>)}</div>
      {flow.stage===0?<article className="ff-explanation" aria-live="polite"><h2>{currentSpot[1]}</h2><p>{currentSpot[6]}</p><p>{currentSpot[7]}</p></article>:<>
        <p>{map?`Responsibility map for ${currentRole.name}.`:`Gold = selected player (${currentRole.name}); navy = other players. Centre starts selected.`}</p>
        <button aria-pressed={map} onClick={()=>setMap(!map)}>{map?'Show lineup':'Explore responsibility maps'}</button>
        {map&&<><div className="ff-options">{['attack','defend','transition'].map(p=><button key={p} aria-pressed={phase===p} onClick={()=>setPhase(p)}>{({attack:'Attacking',defend:'Defending',transition:'Transition'})[p]}</button>)}</div>{phase==='transition'&&<div className="ff-options">{['win','lose'].map(t=><button key={t} aria-pressed={turnover===t} onClick={()=>setTurnover(t)}>We {t} the puck</button>)}</div>}<p className="ff-note">Illustrative responsibility emphasis: warmer colour means more emphasis. This is not tracking data, a fixed assignment or a boundary players must stay inside.</p></>}
        <article className="ff-explanation" aria-live="polite"><h2>{currentRole.name}</h2><p>{currentRole.summary}</p>{map?<p>{currentRole[phase==='transition'?turnover:phase]}</p>:<><p><strong>Attacking:</strong> {currentRole.attack}</p><p><strong>Defending:</strong> {currentRole.defend}</p><p><strong>Possession changes:</strong> {currentRole.win} {currentRole.lose}</p></>}</article>
      </>}
      <p className="ff-note">Full-ice orientation example. U7/U9 game formats differ. Left/right are viewed toward the opponent’s net. Exact maps remain coaching-review drafts.</p>
    </>}
    {flow.stage===2&&<>
      <p>{scope.ageBand==='U7'?'Pack together with an adult. Say each name as you put it in.':'Pack the kit, then explain why each piece belongs.'} Drag to the bag or tap a card. Tap again to unpack.</p>
      <div className="ff-gear-layout"><div className="ff-gear">{content.gear.map(g=><button key={g[0]} data-foundation-gear={g[0]} draggable aria-pressed={flow.packed.includes(g[0])} onDragStart={e=>{e.dataTransfer.setData('text/plain',g[0]);e.dataTransfer.effectAllowed='copy';}} onDragEnd={()=>setDragging(false)} onClick={()=>pack(g[0],flowRef.current.packed.includes(g[0]))}><svg viewBox="0 0 64 64" aria-hidden="true"><path d={g[3]}/></svg><span>{g[1]}</span><small>{flow.packed.includes(g[0])?'Packed · tap to remove':'Drag or tap to pack'}</small></button>)}</div>
      <aside className={`ff-bag${dragging?' is-over':''}`} aria-label="Hockey bag drop area" onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);pack(e.dataTransfer.getData('text/plain'));}}><h2>Your hockey bag</h2><p role="status">{flow.packed.length} of 13 packed</p><progress max="13" value={flow.packed.length} aria-label="Gear packed"/><p aria-live="polite">{gearNote}</p><button onClick={()=>{update(current=>({...current,packed:[]}));setGearNote('Bag emptied.');}}>Empty the bag</button><details className="ff-gear-inspect"><summary>Look closely at this gear</summary><h3>{inspectedGear[1]}</h3><MovableIllustration key={gearInspectId} label={inspectedGear[1]}><svg viewBox="0 0 64 64" role="img" aria-label={inspectedGear[1]}><path d={inspectedGear[3]} fill="#e6b952" stroke="#244660" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/></svg></MovableIllustration></details></aside></div>
      <p className="ff-note">A learning checklist, not a safety inspection. An adult checks real gear, fit, condition and program requirements. Goalies need a different kit. Bring a water bottle too.</p>
    </>}
    {(flow.stage===3||flow.stage===4)&&<>
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
    {flow.stage===5&&<article className="ff-explanation"><h2>You explored the foundations.</h2><p>You found rink landmarks, met the positions, packed 13 types of gear and matched six referee signals.</p><p>Tell your adult one thing you noticed and one question you want to ask your coach.</p><p>This recap records activity completion. It does not certify equipment fit, hockey ability or mastery.</p><button onClick={()=>{update(newFlow());setSignal(0);setSpot('blue');setRole('C');setMap(false);}}>Practice this flow again</button></article>}
    <footer className="ff-actions"><button disabled={flow.stage===0} onClick={()=>update(current=>({...current,stage:Math.max(0,current.stage-1)}))}>Previous step</button>{flow.stage<5?<div><p role="status">{canContinue(flow)?'Ready for the next step.':remaining}</p><button className="ff-primary" disabled={!canContinue(flow)} onClick={()=>{update(advanceFlow);setSignal(0);window.scrollTo({top:0,behavior:'instant'});}}>Continue</button></div>:<button className="ff-primary" onClick={onBack}>{backLabel}</button>}</footer>
    <details className="ff-sources"><summary>Teaching sources and review status</summary><p>Content revision {content.revision}. Owner-reviewed layout; human content qualification still pending.</p><a href="https://www.hockeycanada.ca/en-ca/hockey-programs/parents/faq">Hockey Canada equipment list</a> · <a href="https://www.hockeycanada.ca/en-ca/hockey-programs/players/essentials/equipment-fitting">Equipment fitting</a> · <a href="https://cdn.hockeycanada.ca/hockey-canada/Hockey-Programs/Officiating/Downloads/2026-28-hc-rulebook-e.pdf">2026–2028 signals, pages 2–3</a> · <a href="https://www.hockeycanada.ca/en-ca/hockey-programs/coaching/under-11/faq">U11 position rotation</a><p>Sources inform general principles; they do not validate the exact maps. No content here is admitted to mastery.</p></details>
  </section>;
}
