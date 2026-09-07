import { useMemo, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { buildHockeyPlayerRig } from './hockeyPlayerRig.js';
import { PlayerLocator } from '../visuals/PlayerLocator.jsx';

export default function Skater({ frameRef, actorKey, colour, number, goalie = false, selected = false, isLearner = false, showStick = true, showHeading = false }) {
  const holder = useRef();
  const heading = useRef();
  const rig = useMemo(() => {
    const player = buildHockeyPlayerRig({ goalie, colour, number, showStick });
    // Draw real equipment after the learner outline so the ring cannot erase
    // part of the shaft when the low stick crosses the body-height marker.
    player.group.renderOrder = 1;
    return player;
  }, [goalie, colour, number, showStick]);
  useEffect(() => () => rig.dispose(), [rig]);
  useFrame(() => {
    const frame = frameRef.current;
    const actor = frame?.actors?.find(item => item.id === actorKey) || frame?.[actorKey];
    if (!actor || !holder.current) return;
    holder.current.position.set(actor.y, 0, -actor.x);
    rig.group.rotation.y = -(actor.facing || 0);
    if (heading.current) heading.current.rotation.y = -(actor.facing || 0);
    // Players glide in a balanced ready stance. Facing and location still follow
    // the actual play; stride, lunge and goalie squash are intentionally held.
  });
  return <group ref={holder}>
    {isLearner && <PlayerLocator />}
    {selected && !isLearner && <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .018, 0]}><ringGeometry args={[.67, .70, 48]} /><meshBasicMaterial color="#B8D8EC" transparent opacity={.9} /></mesh>}
    <primitive object={rig.group} />
    {showHeading && showStick && <group ref={heading}><mesh position={[0, .06, -.82]} rotation={[-Math.PI / 2, 0, 0]}><coneGeometry args={[.15, .36, 3]} /><meshBasicMaterial color={colour} /></mesh></group>}
  </group>;
}
