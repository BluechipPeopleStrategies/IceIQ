import {Component, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Canvas, useThree} from '@react-three/fiber';
import {OrbitControls} from '@react-three/drei';
import {CanvasTexture, SRGBColorSpace, Shape, Path, Vector3, CatmullRomCurve3} from 'three';
import data from './foundationContent.json';
import {CAMERA_LIMITS, CAMERA_CLIP, RINK_SURFACES, foundationCamera, foundationPixelToWorld,fitRinkZoom} from './foundationCamera.js';
import './FoundationRink3D.css';

function outline(inset=0, Type=Shape){
  const x=data.profile.lengthM/2-inset,z=data.profile.widthM/2-inset,r=6.7-inset;
  const s=new Type();
  s.moveTo(-x+r,-z);s.lineTo(x-r,-z);s.quadraticCurveTo(x,-z,x,-z+r);
  s.lineTo(x,z-r);s.quadraticCurveTo(x,z,x-r,z);s.lineTo(-x+r,z);
  s.quadraticCurveTo(-x,z,-x,z-r);s.lineTo(-x,-z+r);s.quadraticCurveTo(-x,-z,-x+r,-z);
  return s;
}
function IceDrawing({svg,onError,onPick}){
  const {invalidate}=useThree();
  const [texture,setTexture]=useState(null);
  useEffect(()=>{
    let active=true, map;
    const img=new Image();
    const drawing=new DOMParser().parseFromString(svg,'image/svg+xml');
    const labels=[...drawing.querySelectorAll('text')].map(node=>{const item={text:node.textContent,x:Number(node.getAttribute('x')),y:Number(node.getAttribute('y')),size:Number(node.getAttribute('font-size')||15),weight:node.getAttribute('font-weight')||'700',fill:node.getAttribute('fill')||'#173450',anchor:node.getAttribute('text-anchor'),middle:node.classList.contains('role-label')||node.classList.contains('spot-num')};node.remove();return item;});
    img.onload=async()=>{
      try{await document.fonts.load('800 34px Inter');}catch{}
      if(!active)return;
      const canvas=document.createElement('canvas');canvas.width=1400;canvas.height=760;
      const ctx=canvas.getContext('2d');
      if(!ctx){onError('Drawing canvas unavailable');return;}
      ctx.drawImage(img,0,0,1400,760);
      for(const label of labels){ctx.font=`${label.weight} ${label.size*2}px Inter`;ctx.fillStyle=label.fill;ctx.textAlign=label.anchor==='middle'?'center':'left';ctx.textBaseline=label.middle?'middle':'alphabetic';ctx.fillText(label.text,label.x*2,label.y*2);}
      map=new CanvasTexture(canvas);map.colorSpace=SRGBColorSpace;
      setTexture(map);invalidate();
    };
    img.onerror=()=>{if(active)onError('Rink drawing could not load');};
    drawing.documentElement.setAttribute('xmlns','http://www.w3.org/2000/svg');drawing.documentElement.setAttribute('width','1400');drawing.documentElement.setAttribute('height','760');
    const imageSvg=new XMLSerializer().serializeToString(drawing.documentElement);
    img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(imageSvg);
    return()=>{active=false;map?.dispose();};
  },[svg,invalidate,onError]);
  return texture&&<mesh rotation={[-Math.PI/2,0,0]} position={foundationPixelToWorld(350,190)} onClick={onPick}>
    <planeGeometry args={[700/9.7,380/9.7]}/><meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false}/>
  </mesh>;
}
function Tube({points,color='#ba3945',radius=.055}){
  const curve=useMemo(()=>new CatmullRomCurve3(points.map(p=>new Vector3(...p)),false,'catmullrom',0),[points]);
  return <mesh><tubeGeometry args={[curve,24,radius,7,false]}/><meshStandardMaterial color={color} roughness={.5}/></mesh>;
}
function Nets({onPick}){
  return [-1,1].map(side=>{
    const x=side*data.lines.goal[1],back=x+side*1.1,w=.9144,h=1.22;
    return <group key={side} onClick={onPick}>
      <Tube points={[[x,.05,-w],[x,h,-w],[x,h,w],[x,.05,w]]}/>
      <Tube points={[[x,.08,-w],[back,.08,-w],[back,.08,w],[x,.08,w]]}/>
      {Array.from({length:9},(_,i)=>{const z=-w+i*w/4;return <Tube key={i} radius={.012} color="#d0e1e9" points={[[x,h,z],[back,.1,z]]}/>;})}
      {Array.from({length:5},(_,i)=>{const t=i/4;return <Tube key={i} radius={.012} color="#d0e1e9" points={[[x+(back-x)*t,h*(1-t)+.08,-w],[x+(back-x)*t,h*(1-t)+.08,w]]}/>;})}
    </group>;
  });
}
function Camera({view,reset,interactive,onChange}){
  const controls=useRef();
  const {camera,invalidate}=useThree();
  useEffect(()=>{camera.position.set(...foundationCamera(view));camera.lookAt(0,0,0);if(controls.current){controls.current.target.set(0,0,0);controls.current.update();}onChange();invalidate();},[view,reset,camera,invalidate]);
  return <OrbitControls ref={controls} enabled={!interactive} enableZoom={false} onChange={onChange} enableDamping={false} enablePan={false}
    minAzimuthAngle={-CAMERA_LIMITS.azimuth} maxAzimuthAngle={CAMERA_LIMITS.azimuth}
    minPolarAngle={CAMERA_LIMITS.minPolar} maxPolarAngle={CAMERA_LIMITS.maxPolar}
    minDistance={CAMERA_LIMITS.minDistance} maxDistance={CAMERA_LIMITS.maxDistance}/>;
}
function Scene({svg,view,reset,onError,zoom,onPoint,placing}){
  const {camera,invalidate,gl,size}=useThree();
  const board=useMemo(()=>{const s=outline(-.28);s.holes.push(outline(.06,Path));return s;},[]);
  const base=useMemo(()=>outline(-.55),[]);
  const pick=e=>{e.stopPropagation();if(e.delta<=5)onPoint?.(e.point.x,e.point.z);};
  const fit=useCallback(()=>{fitRinkZoom(camera,zoom);invalidate();},[camera,zoom,invalidate]);
  useEffect(()=>{const lost=e=>{e.preventDefault();onError('Graphics context lost');};gl.domElement.addEventListener('webglcontextlost',lost);return()=>gl.domElement.removeEventListener('webglcontextlost',lost);},[gl,onError]);
  useEffect(()=>{fit();},[fit,size.width,size.height]);
  return <>
    <ambientLight intensity={1.6}/><directionalLight position={[-25,45,20]} intensity={2.2}/><directionalLight position={[25,15,-20]} color="#a1d9ef" intensity={1}/>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,RINK_SURFACES.baseY,0]}><extrudeGeometry args={[base,{depth:RINK_SURFACES.depth,bevelEnabled:true,bevelSize:.18,bevelThickness:RINK_SURFACES.bevelThickness,bevelSegments:3,steps:1}]}/><meshStandardMaterial color="#25465a" roughness={.65}/></mesh>
    <mesh rotation={[-Math.PI/2,0,0]} onClick={pick}><extrudeGeometry args={[board,{depth:1.05,bevelEnabled:false,steps:1}]}/><meshStandardMaterial color="#dce9ef" roughness={.55}/></mesh>
    <IceDrawing svg={svg} onError={onError} onPick={pick}/><Nets onPick={pick}/><Camera view={view} reset={reset} interactive={placing} onChange={fit}/>
  </>;
}
class RinkBoundary extends Component {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(){this.props.onError?.('Rink rendering failed');}
  render(){return this.state.failed?<p role="status">3D is unavailable here. Choose 2D rink below to keep exploring.</p>:this.props.children;}
}
export default function FoundationRink3D({svg,onPoint,placing=false}){
  const [view,setView]=useState('perspective'),[reset,setReset]=useState(0),[zoom,setZoom]=useState(1),[failed,setFailed]=useState(false);
  const onError=useMemo(()=>(reason)=>{console.warn('[Foundations 3D]',reason);setFailed(true);},[]);
  return <div className="fr3-root">
    <div className="fr3-title"><span>THE RINK · IN 3D</span><span>Our net ← · → Attacking end</span></div>
    <RinkBoundary key={reset} onError={onError}>{failed?<p role="status">3D is unavailable here. Choose 2D rink below to keep exploring.</p>:<div className="fr3-canvas" role="group" aria-label="Interactive three-dimensional rink. Tap a landmark or player; labelled buttons below offer the same choices.">
      <Canvas aria-hidden="true" frameloop="demand" dpr={[1,1.5]} camera={{position:foundationCamera(),fov:42,...CAMERA_CLIP}} gl={{antialias:true,alpha:true}} fallback={<p>3D is unavailable. Choose 2D rink below.</p>}>
        <Scene svg={svg} view={view} reset={reset} zoom={zoom} onError={onError} onPoint={onPoint} placing={placing}/>
      </Canvas>
    </div>}</RinkBoundary>
    <div className="fr3-controls">{failed?<button onClick={()=>{setFailed(false);setReset(n=>n+1);}}>Try 3D again</button>:<><button aria-pressed={view==='perspective'} onClick={()=>setView('perspective')}>Angled view</button><button aria-pressed={view==='overhead'} onClick={()=>setView('overhead')}>Overhead</button><button disabled={zoom>=1.6} onClick={()=>setZoom(z=>Math.min(1.6,z+.2))}>Zoom in rink</button><button disabled={zoom<=.8} onClick={()=>setZoom(z=>Math.max(.8,z-.2))}>Zoom out rink</button><button onClick={()=>{setView('perspective');setZoom(1);setReset(n=>n+1);}}>Reset rink</button></>}</div>
    <p className="fr3-hint">{placing?'Tap the ice to place your puck or selected player. Choose Explore to turn the rink again.':'Tap a rink feature or player to explore it. Drag to turn the rink; dragging does not select anything.'} Use the labelled controls below for keyboard access.</p>
  </div>;
}
