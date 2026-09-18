import {useEffect,useState} from 'react';
import {pilotHomeModel} from './pilotHomeCore.js';
import {STAGES} from '../one-on-one/foundationFlowCore.js';
import './PilotHome.css';
function storage(){try{return globalThis.localStorage;}catch{return null;}}
export default function PilotHome({playerId,ageBand,onStart,onAgeChange,onParentNavigate}){
  const [,refresh]=useState(0);
  useEffect(()=>{const update=()=>refresh(n=>n+1);window.addEventListener('storage',update);window.addEventListener('focus',update);return()=>{window.removeEventListener('storage',update);window.removeEventListener('focus',update);};},[]);
  const model=pilotHomeModel({playerId,ageBand,storage:storage()});
  if(!model.supported)return null;
  return <section className="ph-root" aria-label="Pilot player home">
    <header className="ph-header"><strong>RinkReads<span>.</span></strong><span>{model.age} · Player pilot</span></header>
    <p className="ph-review">Local pilot preview · human content review pending</p>
    <div className="ph-hero"><p className="ph-kicker">FROZEN TRAILS · YOUR FIRST HOCKEY WORLD</p><h1>{model.completed?'Look what you explored.':model.started?'Ready to keep going?':'Your next step starts here.'}</h1><p>Learn the rink, meet the positions and get ready to play. One small activity at a time.</p>
      <article className="ph-next"><p>{model.completed?'YOUR RECAP':model.started?'PICK UP HERE':'FIRST UP'}</p><h2>{model.next}</h2><button data-pilot-start onClick={onStart}>{model.label}<span aria-hidden="true"> →</span></button><p className="ph-save" role="status">{model.available?'Your place is saved on this device, separately for each player and age.':'Device storage is unavailable. You can practice, but your place may be lost when you leave.'}</p></article>
    </div>
    <section className="ph-path" aria-label="Your foundation path"><h2>A little at a time.</h2><ol>{STAGES.map((name,i)=><li key={name} aria-current={i===model.stage?'step':undefined}><span aria-hidden="true">{i<model.stage?'✓':i+1}</span><div>{name}<small>{i<model.stage?'Explored':i===model.stage?'You are here':'Coming next'}</small></div></li>)}</ol><p>Exploring an activity is a starting point. Keep asking questions and practicing on the ice.</p></section>
    <details className="ph-parents"><summary>For parents</summary><p>U7 players may need an adult to read and explore with them. This review flow records activity completion; it does not certify equipment fit, hockey ability or mastery.</p><p>Progress is device-local. Use the same browser to return. This pilot preview does not change your account or plan.</p>{onAgeChange&&<label>Review age group <select aria-label="Pilot age group" value={model.age} onChange={e=>onAgeChange(e.target.value)}>{['U7','U9','U11'].map(age=><option key={age}>{age}</option>)}</select></label>}{onParentNavigate&&<nav aria-label="Parent options">{[['profile','Player profile'],['history','Earlier activity'],['worlds','Browse hockey worlds']].map(([id,label])=><button key={id} onClick={()=>onParentNavigate(id)}>{label}</button>)}</nav>}</details>
  </section>;
}
