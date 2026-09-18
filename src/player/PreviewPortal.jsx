import {lazy, Suspense, useRef, useState} from 'react';
import {matchesPreviewCode,previewAge,previewPlayerId,previewGuidance} from './previewAccess.js';
import './PreviewPortal.css';
const PilotHome=lazy(()=>import('./PilotHome.jsx'));
const FoundationFlow=lazy(()=>import('../one-on-one/FoundationFlow.jsx'));
const SESSION_KEY='rinkreads_public_preview_v1';
function remembered(){try{return sessionStorage.getItem(SESSION_KEY)==='open';}catch{return false;}}
export default function PreviewPortal(){
  const [open,setOpen]=useState(remembered),[code,setCode]=useState(''),[error,setError]=useState(''),[age,setAge]=useState('U7'),[activity,setActivity]=useState(false);
  const heading=useRef(null);
  function enter(event){event.preventDefault();if(!matchesPreviewCode(code)){setError('That preview code did not match. Check the code you were given and try again.');return;}
    try{sessionStorage.setItem(SESSION_KEY,'open');}catch{}
    setError('');setOpen(true);requestAnimationFrame(()=>heading.current?.focus());
  }
  function leave(){try{sessionStorage.removeItem(SESSION_KEY);}catch{}setOpen(false);setActivity(false);setCode('');}
  return <main className="pp-root">
    <header className="pp-nav"><a href="#" aria-label="RinkReads home">RinkReads<span>.</span></a>{open?<button onClick={leave}>Leave preview</button>:import.meta.env.MODE==='preview'?<span>Player &amp; family preview</span>:<a href="#">Back to site</a>}</header>
    {!open?<section className="pp-gate"><p className="pp-eyebrow">YOUR FIRST SHIFT</p><h1>Step onto the ice.</h1><p>Enter the preview code you were given. Explore the rink, equipment and referee signals—no account needed.</p>
      <form onSubmit={enter}><label htmlFor="preview-code">Preview code</label><input id="preview-code" value={code} onChange={e=>{setCode(e.target.value);setError('');}} maxLength={40} autoCapitalize="characters" autoComplete="off" spellCheck={false} aria-describedby={error?'preview-error':'preview-help'} aria-invalid={!!error}/><p id="preview-help">Spaces and dashes are okay.</p>{error&&<p id="preview-error" role="alert">{error}</p>}<button type="submit">Open preview <span aria-hidden="true">→</span></button></form>
      <p className="pp-note">An early learning preview for players and families. No email, password or payment required.</p>
    </section>:<>
      <section className="pp-intro"><h1 ref={heading} tabIndex={-1}>Take your first shift.</h1><p>Early preview · learning content is still under review. Explore together, at your own pace.</p><label>Choose an age group <select value={age} onChange={e=>{setAge(previewAge(e.target.value));setActivity(false);}}><option>U7</option><option>U9</option><option>U11</option></select></label></section>
      {!activity&&<section className="pp-pathway" aria-label="How to learn here"><h2>Explore. Try. Revisit.</h2><p>{previewGuidance[age]}</p><ol><li>Explore the pictures</li><li>Try a small activity</li><li>Come back and notice more</li></ol>{age==='U11'&&<details><summary>A question to take to practice</summary><p>Which clue helped you recognize a rink spot or role? Ask your coach where you might notice it in a game.</p></details>}<details><summary>For parents: how this preview fits</summary><p>These activities build familiarity with hockey words and pictures. They complement practice with a coach. Full-rink diagrams are learning maps; your team's playing area may be smaller. Role pictures and shaded areas are examples, not fixed places to stand.</p><p>Our learning structure draws on progressive development described by <a href="https://www.omha.net/u9andbelow" target="_blank" rel="noreferrer">OMHA</a> and <a href="https://www.hockeycanada.ca/en-ca/hockey-programs/players/essentials/downloads" target="_blank" rel="noreferrer">Hockey Canada</a>. RinkReads is independent and is not endorsed by either organization.</p></details></section>}
      <Suspense fallback={<p role="status">Getting the rink ready…</p>}>{activity?<FoundationFlow key={age} playerId={previewPlayerId(age)} ageBand={age} onBack={()=>setActivity(false)} backLabel="Back to preview home"/>:<PilotHome key={age} playerId={previewPlayerId(age)} ageBand={age} onStart={()=>setActivity(true)} publicPreview/>}</Suspense>
      <footer className="pp-note">Practice stays in this browser. This preview does not sign you in, change an account or award hockey qualifications.</footer>
    </>}
  </main>;
}
