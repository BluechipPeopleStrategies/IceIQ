import React,{useState,useEffect,useMemo,useCallback} from 'react';
import {createRoot} from 'react-dom/client';
import ScenarioRinkView from '../ScenarioRinkView.jsx';
import './player-lab.css';
const views={broadcast:{type:'preset',preset:'broadcast'},overhead:{type:'preset',preset:'overhead'},side:{type:'perspective',position:[8,2.2,-16],target:[0,1,-16],fov:70},eyes:{type:'first-person',actorId:'N1'},defender:{type:'first-person',actorId:'G1'}};
export function sampleLabScene(time,mode='forward'){
 const t=Math.max(0,Math.min(4,time)),moving=mode!=='glide',vx=mode==='backward'?-1.8:2;
 const phases=[{name:'prepare',start:0,end:1.4,turn:.7,lean:.3,lookYaw:.6},{name:'approach',start:1.4,end:2.8,turn:.4,lean:.2,lookYaw:.3},{name:'exit',start:2.8,end:4,turn:0,lean:0,lookYaw:0}];
 return {time:t,actors:[
  {id:'N1',label:'N1',number:7,team:'home',x:12+vx*t,y:-2,facing:mode==='rim'?Math.min(.7,t*.25):0,vx,vy:0,motion:{mode:moving?'skate':'glide',...(mode==='rim'?{action:{type:'rim-pickup-preparation',phases}}:{})}},
  {id:'G1',label:'G1',number:4,team:'away',x:21-t*.8,y:1,facing:Math.PI,vx:-.8,vy:0,motion:{mode:'glide'}},
  {id:'N2',label:'N2',number:11,team:'home',x:20,y:5,facing:0,vx:0,vy:0,motion:{mode:'ready'}},
  {id:'G2',label:'G2',number:31,team:'away',role:'goalie',x:27,y:0,facing:Math.PI,vx:0,vy:0,motion:{mode:'ready'}}
 ],puck:{x:mode==='rim'?18:13+vx*t,y:mode==='rim'?-10:-2.2}};
}
function App(){
 const params=new URLSearchParams(location.search);
 const [finish,setFinish]=useState('rounded-study');
 const [presentation,setPresentation]=useState('characters');
 const [age,setAge]=useState(params.get('age')||'U11'),[mode,setMode]=useState('forward'),[time,setTime]=useState(1),[playing,setPlaying]=useState(false),[question,setQuestion]=useState(params.get('view')||'broadcast'),[entry,setEntry]=useState(0),[ready,setReady]=useState(false),[reported,setReported]=useState(null),[saved,setSaved]=useState(null);
 useEffect(()=>{if(!playing)return;let id,last=performance.now();const tick=now=>{const dt=Math.min(.05,(now-last)/1000);last=now;setTime(t=>{if(t+dt>=4){setPlaying(false);return 4;}return t+dt;});id=requestAnimationFrame(tick);};id=requestAnimationFrame(tick);return()=>cancelAnimationFrame(id);},[playing]);
 const state=useMemo(()=>sampleLabScene(time,mode),[time,mode]);
 const report=useCallback(view=>setReported(view),[]);
 const changeQuestion=value=>{setQuestion(value);setEntry(v=>v+1);};
 const view=question==='saved'?saved:views[question];
 return <main><header><p className="eyebrow">RinkReads / local review</p><h1>One rink. Every angle.</h1><p>Shared 3D player and camera candidates. These movement examples are for visual inspection, not approved coaching questions.</p></header>
 <div className="lab-options"><label>Model finish <select aria-label="Model finish" value={finish} onChange={e=>setFinish(e.target.value)}><option value="rounded-study">Rounded study</option><option value="integration-candidate">Existing candidate</option></select></label><label>Presentation <select aria-label="Player presentation" value={presentation} onChange={e=>setPresentation(e.target.value)}><option value="characters">Characters</option><option value="tactical">Tactical X/O</option></select></label><label>Player age <select aria-label="Player age" value={age} onChange={e=>setAge(e.target.value)}><option>U7</option><option>U11</option><option>U18</option></select></label><label>Movement example <select aria-label="Movement example" value={mode} onChange={e=>{setMode(e.target.value);setTime(0);setPlaying(false);}}><option value="forward">Forward skating</option><option value="backward">Backward defending</option><option value="glide">Glide</option><option value="rim">Rim preparation pose study</option></select></label><label>Question starting view <select aria-label="Question starting view" value={question} onChange={e=>changeQuestion(e.target.value)}><option value="broadcast">Broadcast</option><option value="overhead">Overhead</option><option value="side">External perspective</option><option value="eyes">Navy N1 player eyes</option><option value="defender">Gold G1 player eyes</option>{saved&&<option value="saved">Saved perspective</option>}</select></label></div>
 <div className="lab-timeline"><button onClick={()=>{if(time>=4)setTime(0);setPlaying(v=>!v);}}>{playing?'Pause':'Play'}</button><label>Scene time <input aria-label="Scene time" type="range" min="0" max="4" step=".02" value={time} onChange={e=>{setPlaying(false);setTime(Number(e.target.value));}}/></label><output>{time.toFixed(2)} s</output><button onClick={()=>setEntry(v=>v+1)}>Re-enter question</button><span role="status">{ready?'View ready':'Preparing view'}</span></div>
 <ScenarioRinkView title="Shared 3D player review" state={state} time={time} playing={playing} ageBand={age} finish={finish} presentation={presentation} questionId={question} questionEntryToken={entry} startingView={view} onAvailabilityChange={setReady} onCameraViewChange={report} focusKey="lab" focusActorId="N1" teamLabels={{home:'Navy',away:'Gold'}}/>
 <section className="lab-notes"><h2>Inspect the same players</h2><p>Tactical symbols share the same positions. Player-eye views retain physical characters so body and stick cues remain available.</p><p>Use player eyes to check real perspective, occlusion and stick/body direction. Drag to look around; changing views never changes the scene time or player positions. Re-entering restores this question's saved angle.</p><button disabled={!reported||reported.type==='preset'} onClick={()=>{setSaved(structuredClone(reported));}}>Save current perspective for a question</button><p>Saving supports player-eye look direction and external perspective. Broadcast and overhead use named presets.</p>{mode==='rim'&&<p>This shows authored preparation and turning poses only. It does not demonstrate a verified rim pickup or puck contact.</p>}<details><summary>Current camera definition</summary><pre>{JSON.stringify(reported||view,null,2)}</pre></details></section>
 </main>;
}
const root = import.meta.hot?.data.root ?? createRoot(document.getElementById('root'));
if (import.meta.hot) import.meta.hot.data.root = root;
root.render(<App/>);
