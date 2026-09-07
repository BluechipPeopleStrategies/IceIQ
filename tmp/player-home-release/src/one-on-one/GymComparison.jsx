import { lazy, Suspense } from 'react';
import LegacyShootout from './LegacyShootout.jsx';
import '../cognitive-gym/cognitive-gym.css';
import { C, RinkReadsLogo } from '../shared.jsx';
const Shootout=lazy(()=>import('../cognitive-gym/ShootoutDrill.jsx'));
const Gym=lazy(()=>import('../cognitive-gym/CognitiveGym.jsx'));
export default function GymComparison({view='before'}) {
  return <main style={{minHeight:'100vh',background:C.bg,padding:'20px',color:C.white,fontFamily:'Inter,system-ui'}}><div style={{maxWidth:1380,margin:'auto'}}><header style={{display:'flex',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between',gap:20,marginBottom:20}}><div><RinkReadsLogo size={28} wordmark/><h1 style={{fontSize:22,margin:'12px 0 0'}}>{view==='before'?'Before · Original goalie shootout':view==='now'?'Now · Updated goalie shootout':'Training lab'}</h1></div><nav aria-label="Graphics comparison" style={{display:'flex',flexWrap:'wrap',gap:8}}>{[['shootout-before','Before'],['shootout-now','Now'],['brain-gym','All games'],['practice-arena','Practice arena']].map(([hash,label])=><a key={hash} style={{color:C.gold,border:`1px solid ${C.goldBorder}`,borderRadius:25,padding:'11px 17px',textDecoration:'none',fontSize:12,background:C.goldDim}} href={`#${hash}`}>{label}</a>)}</nav></header><div className="gym-root"><Suspense fallback={<p>Loading the rink…</p>}>{view==='before'?<LegacyShootout playerId="graphics-before-preview" onExit={()=>window.location.hash='brain-gym'}/>:view==='now'?<Shootout playerId="graphics-now-preview" onExit={()=>window.location.hash='brain-gym'}/>:<Gym playerId="graphics-now-preview" ageBand="U11 / Atom"/>}</Suspense></div></div></main>;
}
