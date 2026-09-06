import { useMemo, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { buildHockeyPlayerRig } from '../one-on-one/hockeyPlayerRig.js';
import { samplePlayerMotion } from './playerMotion.js';

/** The observer's existing equipment in world space. Camera scans never move
 * the gloves/stick. Camera-intersecting sleeves are visibility-masked;
 * no billboard, overlay, duplicate puck or enlarged reach. */
export default function FirstPersonEquipment({frameRef,actorKey,colour,goalie=false,ageBand,stage,finish,showStick=true}) {
 const holder=useRef();
 const actor=frameRef.current?.actors?.find(item=>item.id===actorKey)||frameRef.current?.[actorKey];
 const modelAge=ageBand??actor?.ageBand,modelStage=stage??actor?.stage;
 const rig=useMemo(()=>buildHockeyPlayerRig({view:'first-person',colour,goalie,ageBand:modelAge,stage:modelStage,finish,showStick}),[colour,goalie,modelAge,modelStage,finish,showStick]);
 useEffect(()=>()=>rig.dispose(),[rig]);
 useFrame(()=>{
  const frame=frameRef.current,current=frame?.actors?.find(item=>item.id===actorKey)||frame?.[actorKey];
  if(!holder.current)return;
  holder.current.visible=!!current&&Number.isFinite(current.x)&&Number.isFinite(current.y)&&Number.isFinite(current.facing);
  if(!holder.current.visible)return;
  holder.current.position.set(current.y,0,-current.x);
  rig.group.rotation.y=-current.facing;
  rig.applyPose(samplePlayerMotion({actor:current,time:frame.time}));
 });
 return <group ref={holder}><primitive object={rig.group}/></group>;
}
