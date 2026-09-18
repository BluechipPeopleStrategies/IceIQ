import {useMemo,useEffect} from 'react';
import {Vector3,Quaternion,CatmullRomCurve3,CanvasTexture,SRGBColorSpace,DoubleSide} from 'three';
import {holdingPose} from './foundationSamples.js';
const NAVY='#15344c',SKIN='#d5a782',GOLD='#e0b353';
function Ball({position,scale=[1,1,1],color=NAVY}){return <mesh position={position} scale={scale}><sphereGeometry args={[1,24,16]}/><meshStandardMaterial color={color} roughness={.58}/></mesh>;}
function Rod({a,b,r=.1,color=NAVY,map}){
  const delta=new Vector3(...b).sub(new Vector3(...a));const rotation=new Quaternion().setFromUnitVectors(new Vector3(0,1,0),delta.clone().normalize());
  return <mesh position={a.map((v,i)=>(v+b[i])/2)} quaternion={rotation} scale={[1,delta.length(),1]}><cylinderGeometry args={[r,r,1,16]}/><meshStandardMaterial color={color} map={map} roughness={.6}/></mesh>;
}
function Wire({points,r=.023,color='#c8d8e0'}){
  const curve=useMemo(()=>new CatmullRomCurve3(points.map(p=>new Vector3(...p))),[points]);
  return <mesh><tubeGeometry args={[curve,28,r,8,false]}/><meshStandardMaterial color={color} metalness={.55} roughness={.32}/></mesh>;
}
export function HelmetModel({part,onPart}){
  const select=id=>e=>{if(e.delta>4)return;e.stopPropagation();onPart(id);};
  const color=id=>part===id?GOLD:id==='shell'?NAVY:id==='strap'?'#263d4b':'#c2d6e3';
  return <group rotation={[0,-.28,0]}>
    <group onClick={select('shell')}>
      <mesh position={[0,.27,0]} scale={[.94,.87,1.05]}><sphereGeometry args={[1,48,32,0,Math.PI*2,0,Math.PI/2]}/><meshPhysicalMaterial color={color('shell')} roughness={.34} metalness={.18} clearcoat={.4} side={DoubleSide}/></mesh>
      {[-1,1].map(side=><group key={side}><Ball position={[side*.82,.02,-.25]} scale={[.13,.28,.43]} color={color('shell')}/><Ball position={[side*.947,-.03,-.15]} scale={[.012,.065,.09]} color="#092031"/></group>)}
      <Ball position={[0,.13,-.86]} scale={[.81,.27,.18]} color={color('shell')}/>
      {[-.42,0,.42].map(x=><Ball key={x} position={[x,.29+.87*Math.sqrt(1-x*x/(.94*.94)-.04/(1.05*1.05)),-.20]} scale={[.05,.022,.20]} color="#0a1e2e"/>)}
      <Wire r={.065} color={color('shell')} points={[[-.88,.25,.32],[-.6,.31,.82],[0,.33,1.03],[.6,.31,.82],[.88,.25,.32]]}/>
    </group>
    <group onClick={select('cage')}>
      {[.15,-.15,-.48,-.81,-1.08].map((y,i)=><Wire key={i} color={color('cage')} points={[[-.83,y,.42],[-.66,y,1.00],[0,y,1.27-i*.02],[.66,y,1.00],[.83,y,.42]]}/>)}
      {[-.62,-.31,0,.31,.62].map(x=><Wire key={x} color={color('cage')} points={[[x,.20,1.22-Math.abs(x)*.26],[x,-.45,1.28-Math.abs(x)*.26],[x*.82,-1.10,1.13-Math.abs(x)*.16]]}/>)}
      <Ball position={[0,-.98,.95]} scale={[.34,.14,.16]} color="#253e51"/>
    </group>
    <group onClick={select('strap')}><Wire r={.048} color={color('strap')} points={[[-.88,-.02,-.15],[-.74,-.70,.12],[0,-1.14,.45],[.74,-.70,.12],[.88,-.02,-.15]]}/><Ball position={[.76,-.49,.02]} scale={[.07,.10,.055]} color={color('strap')}/></group>
  </group>;
}
function useStripes(){
  const texture=useMemo(()=>{const c=document.createElement('canvas');c.width=128;c.height=64;const ctx=c.getContext('2d');ctx.fillStyle='#eef3f6';ctx.fillRect(0,0,128,64);ctx.fillStyle='#152d40';for(let x=0;x<128;x+=16)ctx.fillRect(x,0,8,64);const map=new CanvasTexture(c);map.colorSpace=SRGBColorSpace;return map;},[]);
  useEffect(()=>()=>texture.dispose(),[texture]);return texture;
}
export function RefereeModel({progress}){
  const stripe=useStripes(),arms=holdingPose(progress);
  return <group>
    <mesh position={[0,.25,0]} scale={[1,1,.65]}><cylinderGeometry args={[.46,.35,1.08,32]}/><meshStandardMaterial map={stripe} roughness={.85}/></mesh>
    <Ball position={[0,-.35,0]} scale={[.36,.21,.25]}/>
    {[-1,1].map(side=><group key={side}><Rod a={[side*.20,-.37,0]} b={[side*.25,-1.33,0]} r={.15}/><Ball position={[side*.25,-1.39,.10]} scale={[.17,.13,.33]}/><Rod a={[side*.25,-1.53,-.10]} b={[side*.25,-1.53,.37]} r={.028} color="#a9bfcb"/></group>)}
    <Rod a={[0,.75,0]} b={[0,1.03,0]} r={.13} color={SKIN}/><Ball position={[0,1.22,0]} scale={[.27,.33,.24]} color={SKIN}/>
    <mesh position={[0,1.3,-.02]} scale={[.29,.29,.27]}><sphereGeometry args={[1,28,18,0,Math.PI*2,0,Math.PI*.55]}/><meshStandardMaterial color={NAVY} roughness={.42}/></mesh>
    {[-.09,.09].map(x=><Ball key={x} position={[x,1.25,.226]} scale={[.018,.025,.012]} color="#142735"/>)}<Ball position={[0,1.18,.25]} scale={[.035,.055,.037]} color={SKIN}/>
    {arms.map(a=><group key={a.side}><Ball position={a.shoulder} scale={[.15,.17,.16]} color="#e9f0f4"/><Rod a={a.shoulder} b={a.elbow} r={.125} color="#fff" map={stripe}/><Ball position={a.elbow} scale={[.13,.13,.13]} color="#e9f0f4"/><Rod a={a.elbow} b={a.wrist} r={.09} color="#fff" map={stripe}/>
      <group position={a.wrist}>
        {a.side===1?<><Ball position={[-.08,.012,.025]} scale={[.115,.08,.08]} color={SKIN}/>{[-.08,-.035,.01,.055].map(y=><Ball key={y} position={[-.14,y,.05]} scale={[.038,.026,.064]} color={SKIN}/>)}</>:<><Ball position={[.015,.025,0]} scale={[.10,.07,.065]} color={SKIN}/>{[-.07,-.025,.02,.065].map(x=><mesh key={x} position={[x,-.015,-.04]} rotation={[0,Math.PI/2,0]}><torusGeometry args={[.074,.019,8,18,Math.PI*1.45]}/><meshStandardMaterial color={SKIN}/></mesh>)}</>}
      </group>
    </group>)}
  </group>;
}
