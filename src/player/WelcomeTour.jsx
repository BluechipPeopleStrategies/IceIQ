import {useRef,useState} from 'react';
import {readWelcomeTour,finishWelcomeTour} from './welcomeTourCore.js';
import './WelcomeTour.css';
const storage=()=>{try{return globalThis.localStorage;}catch{return null;}};
export default function WelcomeTour(props){return <Tour key={`${props.playerId}:${props.variant}`} {...props}/>;}
function Tour({playerId,variant,steps}){
  const [initial]=useState(()=>readWelcomeTour(storage(),playerId,variant));
  const [open,setOpen]=useState(!initial.seen),[step,setStep]=useState(0),[available,setAvailable]=useState(initial.available);
  const heading=useRef(null),launcher=useRef(null);
  function finish(status){setAvailable(finishWelcomeTour(storage(),playerId,variant,status));setOpen(false);requestAnimationFrame(()=>launcher.current?.focus());}
  function move(next){setStep(next);requestAnimationFrame(()=>heading.current?.focus());}
  return <aside className="wt-root" aria-label="Welcome walkthrough">
    {!open?<><button className="wt-launch" ref={launcher} onClick={()=>{setStep(0);setOpen(true);requestAnimationFrame(()=>heading.current?.focus());}}>Show me around</button>{!available&&<p className="wt-note">This browser could not remember your walkthrough choice.</p>}</>:<div className="wt-card">
      <div className="wt-top"><span>WELCOME TO RINKREADS · {step+1} OF {steps.length}</span><button onClick={()=>finish('skipped')}>Skip walkthrough</button></div>
      <h2 ref={heading} tabIndex={-1}>{steps[step].title}</h2><p>{steps[step].body}</p>
      <div className="wt-actions"><button disabled={step===0} onClick={()=>move(step-1)}>Back</button>{step<steps.length-1?<button onClick={()=>move(step+1)}>Next section</button>:<button onClick={()=>finish('complete')}>Finish walkthrough</button>}</div>
      {!available&&<p className="wt-note">You can still explore. This browser may show the welcome again next time.</p>}
    </div>}
  </aside>;
}
