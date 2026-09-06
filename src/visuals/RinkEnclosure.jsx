import { memo, useMemo, useEffect } from 'react';
import { BufferGeometry, Float32BufferAttribute, Quaternion, Vector3, DoubleSide } from 'three';
import { RINK, roundedRinkShape } from '../one-on-one/rinkMaterials.js';

function Beam({ a, b, radius = .055, color = '#748796' }) {
  const vector = new Vector3(...b).sub(new Vector3(...a));
  const quaternion = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), vector.clone().normalize());
  return <mesh position={a.map((v,i)=>(v+b[i])/2)} quaternion={quaternion}>
    <cylinderGeometry args={[radius,radius,vector.length(),6]}/><meshStandardMaterial color={color} roughness={.68} metalness={.35}/>
  </mesh>;
}
function RinkGlass() {
  // Reuse the exact board outline. Only the enclosure above the boards changes.
  const points=useMemo(()=>roundedRinkShape(-.03).getSpacedPoints(64),[]);
  const geometry=useMemo(()=>{
    const g=new BufferGeometry(),vertices=[],indices=[];
    for(let i=0;i<points.length-1;i++) {
      const a=points[i],b=points[i+1],n=vertices.length/3;
      vertices.push(a.x,1.2,-a.y,b.x,1.2,-b.y,a.x,2.9,-a.y,b.x,2.9,-b.y);
      indices.push(n,n+1,n+2,n+2,n+1,n+3);
    }
    g.setAttribute('position',new Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();return g;
  },[points]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <group>
    <mesh geometry={geometry} renderOrder={2}><meshPhysicalMaterial color="#c4e1e8" transparent opacity={.12} roughness={.12} metalness={.05} side={DoubleSide} depthWrite={false}/></mesh>
    {points.slice(0,-1).map((point,index)=><group key={index}>
      <mesh position={[point.x,2.05,-point.y]}><cylinderGeometry args={[.018,.023,1.7,5]}/><meshStandardMaterial color="#91a4ad" roughness={.45} metalness={.5}/></mesh>
      <mesh position={[point.x,1.18,-point.y]}><boxGeometry args={[.06,.075,.06]}/><meshStandardMaterial color="#576c78" roughness={.55}/></mesh>
    </group>)}
  </group>;
}

/** Original, restrained rink structure. Uses the shared rink dimensions and board outline. */
export default memo(function RinkEnclosure() {
  const width = RINK.widthM + 18, length = RINK.lengthM + 16;
  const stations=[-30,-20,-10,0,10,20,30];
  return <group>
    <RinkGlass/>
    {[-1,1].map(side=><group key={side}>
      <mesh position={[side*width/2,6,0]}><boxGeometry args={[.4,12,length]}/><meshStandardMaterial color="#8d979b" roughness={.94}/></mesh>
      <mesh position={[0,6,side*length/2]}><boxGeometry args={[width,12,.4]}/><meshStandardMaterial color="#929b9e" roughness={.94}/></mesh>
      {[0,1,2,3,4].map(row=><group key={row}>
        <mesh position={[side*(RINK.widthM/2+2+row),.4+row*.4,0]} receiveShadow><boxGeometry args={[1,.8+row*.8,RINK.lengthM+2]}/><meshStandardMaterial color="#344955" roughness={.86}/></mesh>
        <mesh position={[side*(RINK.widthM/2+2+row),.86+row*.8,0]}><boxGeometry args={[.58,.10,RINK.lengthM+2]}/><meshStandardMaterial color={row%2?'#476573':'#3d5967'} roughness={.7}/></mesh>
        <mesh position={[0,.4+row*.4,side*(RINK.lengthM/2+2+row)]} receiveShadow><boxGeometry args={[RINK.widthM+12,.8+row*.8,1]}/><meshStandardMaterial color="#344955" roughness={.86}/></mesh>
        <mesh position={[0,.86+row*.8,side*(RINK.lengthM/2+2+row)]}><boxGeometry args={[RINK.widthM+12,.1,.58]}/><meshStandardMaterial color={row%2?'#476573':'#3d5967'} roughness={.7}/></mesh>
      </group>)}
      {stations.map(z=><mesh key={z} position={[side*(width/2-.3),6,z]}><boxGeometry args={[.35,12,.4]}/><meshStandardMaterial color="#677d88" roughness={.7} metalness={.2}/></mesh>)}
      <mesh position={[0,5.3,side*(length/2-.25)]}><boxGeometry args={[width,.65,.08]}/><meshStandardMaterial color="#526c7b" roughness={.8}/></mesh>
    </group>)}
    <mesh position={[0,12,0]}><boxGeometry args={[width,.3,length]}/><meshStandardMaterial color="#aab2b6" roughness={.9}/></mesh>
    {stations.map(z=><group key={z}>
      <Beam a={[-width/2,10.5,z]} b={[width/2,10.5,z]} radius={.1}/>
      <Beam a={[-width/2,11.65,z]} b={[width/2,11.65,z]} radius={.075}/>
      {Array.from({length:10},(_,i)=>{
        const x=-width/2+i*width/10,next=x+width/10;
        return <Beam key={i} a={[x,i%2?11.65:10.5,z]} b={[next,i%2?10.5:11.65,z]} radius={.045}/>;
      })}
      {[-9,9].map(x=><group key={x}>
        <Beam a={[x,10.5,z]} b={[x,10.05,z]} radius={.025}/>
        <mesh position={[x,10,z]}><boxGeometry args={[2.1,.15,.7]}/><meshStandardMaterial color="#526674" roughness={.5} metalness={.4}/></mesh>
        <mesh position={[x,9.91,z]}><boxGeometry args={[1.9,.018,.56]}/><meshStandardMaterial color={z%20===0?'#fff4df':'#e5f2ff'} emissive={z%20===0?'#ffe8bc':'#d8eaff'} emissiveIntensity={.8} toneMapped={false}/></mesh>
      </group>)}
    </group>)}
    {[-12,12].map(x=><Beam key={x} a={[x,11.7,-length/2]} b={[x,11.7,length/2]} radius={.065}/>)}
    <pointLight position={[-8,7,15]} intensity={34} distance={32} decay={2} color="#ffe5c0"/>
    <pointLight position={[8,7,-15]} intensity={40} distance={32} decay={2} color="#c6e3ff"/>
  </group>;
});
