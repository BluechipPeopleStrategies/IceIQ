import {Component,useEffect,useMemo,useRef,useState} from 'react';
import {Canvas,useThree} from '@react-three/fiber';
import {OrbitControls} from '@react-three/drei';
import {HelmetModel,RefereeModel} from './FoundationSampleModels.jsx';
import {HELMET_PARTS,HOLDING_DURATION} from './foundationSamples.js';
import './FoundationObject3D.css';

class ObjectBoundary extends Component{
  state={failed:false};static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed?<><p role="status">3D is unavailable here. Use this 2D illustration.</p>{this.props.fallback}</>:this.props.children;}
}
function ViewCamera({kind,view,reset,zoom,onError}){
  const controls=useRef();const {camera,invalidate,gl}=useThree();
  useEffect(()=>{const point=view==='detail'?[0,.65,3.2]:view==='side'?[5.7,.2,0]:view==='angled'?[2,.8,5.4]:[0,.25,5.7];camera.position.set(...point);camera.lookAt(0,0,0);if(controls.current){controls.current.target.set(0,view==='detail'?.45:0,view==='detail'?.25:0);controls.current.update();}invalidate();},[camera,invalidate,view,reset]);
  useEffect(()=>{camera.zoom=zoom;camera.updateProjectionMatrix();invalidate();},[camera,invalidate,zoom]);
  useEffect(()=>{const lost=e=>{e.preventDefault();onError();};gl.domElement.addEventListener('webglcontextlost',lost);return()=>gl.domElement.removeEventListener('webglcontextlost',lost);},[gl,onError]);
  return <OrbitControls ref={controls} enableDamping={false} enablePan={false} enableZoom={false} minPolarAngle={.65} maxPolarAngle={1.85} minAzimuthAngle={kind==='referee'?-.35:-Infinity} maxAzimuthAngle={kind==='referee'?.35:Infinity}/>;
}
export default function FoundationObject3D({kind,fallback}){
  const helmet=kind==='helmet';
  const [view,setView]=useState(helmet?'angled':'detail'),[zoom,setZoom]=useState(1),[reset,setReset]=useState(0),[failed,setFailed]=useState(false),[flat,setFlat]=useState(false),[part,setPart]=useState('shell');
  const [progress,setProgress]=useState(1),[running,setRunning]=useState(false),[replay,setReplay]=useState(0);
  const progressRef=useRef(1);
  const [reduced,setReduced]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const onError=useMemo(()=>()=>{setFailed(true);setRunning(false);},[]);
  const setPose=value=>{progressRef.current=value;setProgress(value);};
  useEffect(()=>{const q=window.matchMedia('(prefers-reduced-motion: reduce)');const update=()=>setReduced(q.matches);q.addEventListener('change',update);return()=>q.removeEventListener('change',update);},[]);
  useEffect(()=>{if(reduced){setRunning(false);setPose(1);}},[reduced]);
  useEffect(()=>{
    if(!running||reduced||flat||failed)return;
    let frame;const start=performance.now(),from=progressRef.current;
    const tick=now=>{const p=Math.min(1,from+(now-start)/HOLDING_DURATION);setPose(p);if(p<1)frame=requestAnimationFrame(tick);else setRunning(false);};
    frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
  },[running,reduced,flat,failed,replay]);
  const selected=HELMET_PARTS.find(p=>p.id===part);
  const unavailable=flat||failed;
  return <section className="fo-root" aria-label={helmet?'Helmet 3D sample':'Holding signal 3D sample'}>
    <div className="fo-title"><strong>{helmet?'Explore the helmet':'See the holding signal'}</strong><span>3D study sample</span></div>
    {unavailable?<div className="fo-fallback"><p>{failed?'3D is unavailable. The 2D illustration is ready.':'2D illustration'}</p>{fallback}</div>:<ObjectBoundary fallback={<div className="fo-fallback">{fallback}</div>}><div className="fo-canvas" role="img" aria-label={helmet?'Rotatable helmet. Use the labelled part and view buttons below.':'Referee demonstrating holding. Use replay or the pose slider below.'}>
      <Canvas frameloop="demand" dpr={[1,1.5]} camera={{position:[0,.25,5.7],fov:42}} gl={{antialias:true,alpha:true}} fallback={<div className="fo-fallback">{fallback}</div>}>
        <ambientLight intensity={1.7}/><directionalLight position={[-3,5,5]} intensity={2.3}/><directionalLight position={[4,2,-2]} intensity={1.7} color="#96c6e5"/>
        {helmet?<HelmetModel part={part} onPart={setPart}/>:<RefereeModel progress={progress}/>}
        <ViewCamera kind={kind} view={view} reset={reset} zoom={zoom} onError={onError}/>
      </Canvas></div></ObjectBoundary>}
    <div className="fo-controls" aria-label="Object view controls">
      {!unavailable&&<>{!helmet&&<button onClick={()=>setView('detail')}>Hands close-up</button>}<button onClick={()=>setView('front')}>Front view</button><button onClick={()=>setView(helmet?'side':'angled')}>{helmet?'Side view':'Angled view'}</button><button disabled={zoom>=1.5} onClick={()=>setZoom(z=>Math.min(1.5,z+.2))}>Zoom in object</button><button disabled={zoom<=.8} onClick={()=>setZoom(z=>Math.max(.8,z-.2))}>Zoom out object</button><button onClick={()=>{setView(helmet?'angled':'detail');setZoom(1);setReset(n=>n+1);}}>Reset object</button></>}
      <button aria-pressed={flat} onClick={()=>{setFlat(v=>!v);setRunning(false);}}>{flat?'Show 3D object':'Show 2D illustration'}</button>
    </div>
    {helmet?<><div className="fo-controls" aria-label="Helmet parts">{HELMET_PARTS.map(p=><button key={p.id} aria-pressed={part===p.id} onClick={()=>setPart(p.id)}>{p.name}</button>)}</div><div className="fo-caption" aria-live="polite"><strong>{selected.name}{!unavailable?' · highlighted in gold':''}</strong><p>{selected.description}</p></div><p className="fo-note">Drag to rotate, or use the view buttons. Simplified learning model; it does not demonstrate correct fit or certify real equipment.</p></>:<>
      {!unavailable&&<div className="fo-playback"><div className="fo-controls"><button disabled={reduced} onClick={()=>{if(reduced)return;setPose(0);setReplay(n=>n+1);setView('detail');setReset(n=>n+1);setRunning(true);}}>Replay signal</button><button disabled={reduced||(!running&&progress>=1)} onClick={()=>setRunning(v=>!v)}>{running?'Pause signal':'Resume signal'}</button><button onClick={()=>{setRunning(false);setPose(1);}}>Show held signal</button></div><label>Inspect the movement <input aria-label="Signal pose" type="range" min="0" max="1" step=".01" value={progress} onChange={e=>{setRunning(false);setPose(Number(e.target.value));}}/></label><p role="status">{reduced?'Reduced motion: use the slider or the held signal.':running?'Watch the hands come together.':progress===1?'Held signal: one hand grips the opposite wrist.':'Paused. Inspect the pose or resume.'}</p></div>}
      <p className="fo-note">One hand grips the other wrist in front of the chest. Replay shows a simplified transition into the held pose, not a timing standard. Draft awaiting an official’s review.</p>
    </>}
  </section>;
}
