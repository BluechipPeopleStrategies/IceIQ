import { useMemo, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { buildHockeyPlayerRig } from './hockeyPlayerRig.js';
import { PlayerLocator } from '../visuals/PlayerLocator.jsx';
import { samplePlayerMotion } from '../visuals/playerMotion.js';
import TacticalPlayerMarker, { isTacticalPresentation } from '../visuals/TacticalPlayerMarker.jsx';

export default function Skater({ frameRef, actorKey, colour, number, goalie = false, selected = false, isLearner = false, showStick = true, showHeading = false, ageBand, stage, finish, visible = true, presentation = 'characters' }) {
  const holder = useRef();
  const heading = useRef();
  const marker = useRef();
  const tactical = isTacticalPresentation(presentation);
  const initialFrame = frameRef.current;
  const initialActor = initialFrame?.actors?.find(item => item.id === actorKey) || initialFrame?.[actorKey];
  const modelAge = ageBand ?? initialActor?.ageBand;
  const modelStage = stage ?? initialActor?.stage;
  const rig = useMemo(() => {
    const player = buildHockeyPlayerRig({ goalie, colour, number, showStick, ageBand: modelAge, stage: modelStage, finish });
    // Keep physical equipment in a stable draw order.
    player.group.renderOrder = 1;
    return player;
  }, [goalie, colour, number, showStick, modelAge, modelStage, finish]);
  useEffect(() => () => rig.dispose(), [rig]);
  useFrame(() => {
    const frame = frameRef.current;
    const actor = frame?.actors?.find(item => item.id === actorKey) || frame?.[actorKey];
    if (!holder.current) return;
    holder.current.visible = visible && !!actor && Number.isFinite(actor.x) && Number.isFinite(actor.y);
    if (!holder.current.visible) return;
    holder.current.position.set(actor.y, 0, -actor.x);
    const facing = Number.isFinite(actor.facing) ? actor.facing : 0;
    rig.group.rotation.y = -facing;
    rig.group.visible = !tactical;
    if (!tactical) rig.applyPose(samplePlayerMotion({ actor, time: frame.time }));
    if (marker.current) marker.current.rotation.y = -facing;
    if (heading.current) heading.current.rotation.y = -facing;
  });
  return <group ref={holder}>
    {isLearner && <PlayerLocator />}
    <primitive object={rig.group} />
    {tactical && <group ref={marker}><TacticalPlayerMarker colour={colour} /></group>}
    {!tactical && showHeading && showStick && <group ref={heading}><mesh position={[0, .06, -.82]} rotation={[-Math.PI / 2, 0, 0]}><coneGeometry args={[.15, .36, 3]} /><meshBasicMaterial color={colour} /></mesh></group>}
  </group>;
}
