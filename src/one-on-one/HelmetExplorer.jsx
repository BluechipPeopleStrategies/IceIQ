import {useState} from 'react';
import MovableIllustration from './MovableIllustration.jsx';
import {HELMET_PARTS} from './foundationSamples.js';
import './HelmetExplorer.css';

const VIEWS=['Front view','Angled view','Side view','Inside view'];
const INNER_PARTS=[
  {id:'padding',name:'Inside padding',description:'Look at the layers and pads inside the shell. Real helmets have different designs. Ask an adult to check their condition and the helmet’s fit.'},
  {id:'adjustment',name:'Fit adjustment',description:'This illustration shows an adjustment at the back. An adult follows the instructions for your own helmet; its adjustment may look different.'},
  HELMET_PARTS[2],
];
const POINTS=[{shell:[50,20],cage:[52,56],strap:[25,65]},{shell:[42,22],cage:[71,56],strap:[34,72]},{shell:[38,22],cage:[82,52],strap:[48,77]},{padding:[50,42],adjustment:[50,75],strap:[76,87]}];
export default function HelmetExplorer(){
  const [view,setView]=useState(1),[part,setPart]=useState('shell');
  const parts=view===3?INNER_PARTS:HELMET_PARTS;
  const selected=parts.find(p=>p.id===part)||parts[0];
  return <section className="he-root" aria-label="Helmet image explorer">
    <div className="he-heading"><h2>Explore the helmet</h2><span>Detailed image views</span></div>
    <MovableIllustration key={view} label={`Helmet — ${VIEWS[view].toLowerCase()}`}>
      <div className={`he-image${view===3?' is-inside':''}`} style={view===3?undefined:{backgroundPosition:`${view*50}% center`}} role="group" aria-label={view===3?'Inside of the hockey helmet showing padding, rear adjustment and chin strap':`Navy hockey helmet with full wire cage, ${VIEWS[view].toLowerCase()}`}>
        {parts.map((p,index)=><button className="he-hotspot" key={p.id} aria-label={p.name} aria-pressed={selected.id===p.id} onClick={()=>setPart(p.id)} style={{left:`${POINTS[view][p.id][0]}%`,top:`${POINTS[view][p.id][1]}%`}}>{index+1}</button>)}
      </div>
    </MovableIllustration>
    <div className="ff-options" aria-label="Helmet image views">{VIEWS.map((name,i)=><button key={name} aria-pressed={view===i} onClick={()=>{setView(i);setPart(i===3?'padding':'shell');}}>{name}</button>)}</div>
    <div className="ff-options" aria-label="Helmet parts">{parts.map((p,i)=><button key={p.id} aria-pressed={selected.id===p.id} onClick={()=>setPart(p.id)}>{i+1} · {p.name}</button>)}</div>
    <div className="he-caption" aria-live="polite"><strong>{selected.name}</strong><p>{selected.description}</p></div>
    <p className="ff-note">Select a numbered part, switch views, or zoom in. These are AI-generated equipment illustrations, not a fit guide or a continuously rotatable 3D model.</p>
  </section>;
}
