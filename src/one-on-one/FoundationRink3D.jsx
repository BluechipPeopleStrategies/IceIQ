import {Component, useEffect, useMemo, useRef, useState} from 'react';
import {Canvas, useThree} from '@react-three/fiber';
import {OrbitControls} from '@react-three/drei';
import {CanvasTexture, SRGBColorSpace, Shape, Path, Vector3, CatmullRomCurve3} from 'three';
import data from './foundationContent.json';
import {CAMERA_LIMITS, foundationCamera, foundationPixelToWorld} from './foundationCamera.js';
import './FoundationRink3D.css';

function outline(inset=0, Type=Shape){
  const x=data.profile.lengthM/2-inset,z=data.profile.widthM/2-inset,r=6.7-inset;
  const s=new Type();
  s.moveTo(-x+r,-z);s.lineTo(x-r,-z);s.quadraticCurveTo(x,-z,x,-z+r);
  s.lineTo(x,z-r);s.quadraticCurveTo(x,z,x-r,z);s.lineTo(-x+r,z);
  s.quadraticCurveTo(-x,z,-x,z-r);s.lineTo(-x,-z+r);s.quadraticCurveTo(-x,-z,-x+r,-z);
  return s;
}
function IceDrawing({svg,onError}){
  const {invalidate}=useThree();
  const [texture,setTexture]=useState(null);
  useEffect(()=>{
    let active=true, map;
    const img=new Image();
    img.onload=()=>{
      if(!active)return;
      const canvas=document.createElement('canvas');canvas.width=1400;canvas.height=760;
      const ctx=canvas.getContext('2d');
      if(!ctx){onError('Drawing canvas unavailable');return;}
      ctx.drawImage(img,0,0,1400,760);map=new CanvasTexture(canvas);map.colorSpace=SRGBColorSpace;
      setTexture(map);invalidate();
    };
    img.onerror=()=>{if(active)onError('Rink drawing could not load');};
    const imageSvg=svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="760" ').replace('</svg>','<style>.role-label,.spot-num{dominant-baseline:central}</style></svg>');
    img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(imageSvg);
    return()=>{active=false;map?.dispose();};
  },[svg,invalidate,onError]);
  return texture&&<mesh rotation={[-Math.PI/2,0,0]} position={foundationPixelToWorld(350,190)}>
    <planeGeometry args={[700/9.7,380/9.7]}/><meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false}/>
  </mesh>;
}
function Tube({points,color='#ba3945',radius=.055}){
  const curve=useMemo(()=>new CatmullRomCurve3(points.map(p=>new Vector3(...p)),false,'catmullrom',0),[points]);
  return <mesh><tubeGeometry args={[curve,24,radius,7,false]}/><meshStandardMaterial color={color} roughness={.5}/></mesh>;
}
function Nets(){
  return [-1,1].map(side=>{
    const x=side*data.lines.goal[1],back=x+side*1.1,w=.9144,h=1.22;
    return <group key={side}>
      <Tube points={[[x,.05,-w],[x,h,-w],[x,h,w],[x,.05,w]]}/>
      <Tube points={[[x,.08,-w],[back,.08,-w],[back,.08,w],[x,.08,w]]}/>
      {Array.from({length:9},(_,i)=>{const z=-w+i*w/4;return <Tube key={i} radius={.012} color="#d0e1e9" points={[[x,h,z],[back,.1,z]]}/>;})}
      {Array.from({length:5},(_,i)=>{const t=i/4;return <Tube key={i} radius={.012} color="#d0e1e9" points={[[x+(back-x)*t,h*(1-t)+.08,-w],[x+(back-x)*t,h*(1-t)+.08,w]]}/>;})}
    </group>;
  });
}
function Camera({view,reset}){
  const controls=useRef();
  const {camera,invalidate}=useThree();
  useEffect(()=>{camera.position.set(...foundationCamera(view));camera.lookAt(0,0,0);if(controls.current){controls.current.target.set(0,0,0);controls.current.update();}invalidate();},[view,reset,camera,invalidate]);
  return <OrbitControls ref={controls} enableDamping={false} enablePan={false}
    minAzimuthAngle={-CAMERA_LIMITS.azimuth} maxAzimuthAngle={CAMERA_LIMITS.azimuth}
    minPolarAngle={CAMERA_LIMITS.minPolar} maxPolarAngle={CAMERA_LIMITS.maxPolar}
    minDistance={CAMERA_LIMITS.minDistance} maxDistance={CAMERA_LIMITS.maxDistance}/>;
}
function Scene({svg,view,reset,onError,zoom}){
  const {camera,invalidate,gl,size}=useThree();
  const board=useMemo(()=>{const s=outline(-.28);s.holes.push(outline(.06,Path));return s;},[]);
  const base=useMemo(()=>outline(-.55),[]);
  useEffect(()=>{const lost=e=>{e.preventDefault();onError('Graphics context lost');};gl.domElement.addEventListener('webglcontextlost',lost);return()=>gl.domElement.removeEventListener('webglcontextlost',lost);},[gl,onError]);
  useEffect(()=>{camera.zoom=zoom*(size.width/size.height>1.8?1.65:1.22);camera.updateProjectionMatrix();invalidate();},[zoom,camera,invalidate,size.width,size.height]);
  return <>
    <ambientLight intensity={1.6}/><directionalLight position={[-25,45,20]} intensity={2.2}/><directionalLight position={[25,15,-20]} color="#a1d9ef" intensity={1}/>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.9,0]}><extrudeGeometry args={[base,{depth:.8,bevelEnabled:true,bevelSize:.18,bevelThickness:.12,bevelSegments:3,steps:1}]}/><meshStandardMaterial color="#25465a" roughness={.65}/></mesh>
    <mesh rotation={[-Math.PI/2,0,0]}><extrudeGeometry args={[board,{depth:1.05,bevelEnabled:false,steps:1}]}/><meshStandardMaterial color="#dce9ef" roughness={.55}/></mesh>
    <IceDrawing svg={svg} onError={onError}/><Nets/><Camera view={view} reset={reset}/>
  </>;
}
class RinkBoundary extends Component {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed?<p role="status">3D is unavailable here. Choose 2D rink below to keep exploring.</p>:this.props.children;}
}
export default function FoundationRink3D({svg}){
  const [view,setView]=useState('perspective'),[reset,setReset]=useState(0),[zoom,setZoom]=useState(1),[failed,setFailed]=useState(false);
  const onError=useMemo(()=>(reason)=>{console.warn('[Foundations 3D]',reason);setFailed(true);},[]);
  return <div className="fr3-root">
    <div className="fr3-title"><span>THE RINK · IN 3D</span><span>Our net ← · → Attacking end</span></div>
    <RinkBoundary>{failed?<p role="status">3D is unavailable here. Choose 2D rink below to keep exploring.</p>:<div className="fr3-canvas" role="img" aria-label="Three-dimensional rink. Select landmarks or positions with the labelled buttons below.">
      <Canvas frameloop="demand" dpr={[1,1.5]} camera={{position:foundationCamera(),fov:42,near:.1,far:250}} gl={{antialias:true,alpha:true}} fallback={<p>3D is unavailable. Choose 2D rink below.</p>}>
        <Scene svg={svg} view={view} reset={reset} zoom={zoom} onError={onError}/>
      </Canvas>
    </div>}</RinkBoundary>
    <div className="fr3-controls"><button aria-pressed={view==='perspective'} onClick={()=>setView('perspective')}>Angled view</button><button aria-pressed={view==='overhead'} onClick={()=>setView('overhead')}>Overhead</button><button disabled={zoom>=1.6} onClick={()=>setZoom(z=>Math.min(1.6,z+.2))}>Zoom in rink</button><button disabled={zoom<=.8} onClick={()=>setZoom(z=>Math.max(.8,z-.2))}>Zoom out rink</button><button onClick={()=>{setView('perspective');setZoom(1);setReset(n=>n+1);}}>Reset rink</button></div>
    <p className="fr3-hint">Drag to turn the rink slightly. Use the view buttons for keyboard access. Select a labelled spot or position below to explore it.</p>
  </div>;
}
