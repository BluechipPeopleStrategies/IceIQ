import React, { useMemo } from "react";
import * as THREE from "three";
import { buildHockeyPlayerRig } from '../one-on-one/hockeyPlayerRig.js';
import { CARRY_OFFSET } from '../one-on-one/simulation.js';
import { PlayerLocator } from '../visuals/PlayerLocator.jsx';

export function ArenaLights({ dramatic = false }) {
  return (
    <>
      <hemisphereLight args={["#dff5ff", "#07131f", dramatic ? 1.4 : 1.8]} />
      <directionalLight
        castShadow
        position={[2, 8, 5]}
        intensity={dramatic ? 3.1 : 2.4}
        color="#ffffff"
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[-5, 3, -3]} intensity={dramatic ? 7 : 3} color="#45b7ff" distance={14} />
      <pointLight position={[5, 2, -2]} intensity={dramatic ? 5 : 2} color="#f2b705" distance={12} />
    </>
  );
}

export function IceSheet3D({ width = 10, depth = 5, endZone = false, blueLines = [-width * .17, width * .17] }) {
  return (
    <group>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#dff3fb" roughness={0.32} metalness={0.03} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.105, 0]}>
        <ringGeometry args={[0.72, 0.76, 64]} />
        <meshBasicMaterial color="#b31935" transparent opacity={0.72} />
      </mesh>
      {!endZone && (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
            <planeGeometry args={[0.045, depth]} />
            <meshBasicMaterial color="#c8102e" transparent opacity={0.65} />
          </mesh>
          {blueLines.map((x) => (
            <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, -0.095, 0]}>
              <planeGeometry args={[0.09, depth]} />
              <meshBasicMaterial color="#1b6cb0" transparent opacity={0.76} />
            </mesh>
          ))}
        </>
      )}
      {[-depth / 2, depth / 2].map((z) => (
        <mesh key={z} castShadow position={[0, 0.08, z]}>
          <boxGeometry args={[width, 0.34, 0.1]} />
          <meshStandardMaterial color="#f8fbfd" roughness={0.48} />
        </mesh>
      ))}
      {[-width / 2, width / 2].map((x) => (
        <mesh key={x} castShadow position={[x, 0.08, 0]}>
          <boxGeometry args={[0.1, 0.34, depth]} />
          <meshStandardMaterial color="#f8fbfd" roughness={0.48} />
        </mesh>
      ))}
    </group>
  );
}

// The same navy/gold equipment and neutral stance as the practice rink.
// Internal .77 scale preserves this component's earlier ~1.3m model height;
// callers retain their existing scale, local facing and game-state positions.
export function HockeySkater({
  colour = "#0B1A33",
  accent,
  puck = false,
  goalie = false,
  isLearner = false,
  scale = 1,
}) {
  const rig = useMemo(() => buildHockeyPlayerRig({ colour, accent, goalie }), [colour, accent, goalie]);
  React.useEffect(() => () => rig.dispose(), [rig]);
  return (
    <group scale={scale}>
      <group scale={.77}>{isLearner && <PlayerLocator />}<primitive object={rig.group} /></group>
      {puck && (
        <mesh castShadow position={[CARRY_OFFSET.lateral * .77, .039, -CARRY_OFFSET.forward * .77]}>
          <cylinderGeometry args={[0.065, 0.065, 0.035, 24]} />
          <meshStandardMaterial color="#03070a" roughness={0.42} />
        </mesh>
      )}
    </group>
  );
}

export function RouteArrow({ from, to, visible, colour = "#28d17c" }) {
  const geometry = useMemo(() => new THREE.CylinderGeometry(0.035, 0.035, 1, 10), []);
  const shaftRef = React.useRef(null);
  const headRef = React.useRef(null);
  const a = useMemo(() => new THREE.Vector3(), []);
  const b = useMemo(() => new THREE.Vector3(), []);
  const dir = useMemo(() => new THREE.Vector3(), []);
  const mid = useMemo(() => new THREE.Vector3(), []);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);

  React.useLayoutEffect(() => {
    if (!shaftRef.current || !headRef.current || !from || !to) return;
    a.set(from.x, 0.07, from.z);
    b.set(to.x, 0.07, to.z);
    dir.copy(b).sub(a);
    const length = dir.length();
    mid.copy(a).add(b).multiplyScalar(0.5);
    shaftRef.current.position.copy(mid);
    shaftRef.current.scale.set(1, length, 1);
    shaftRef.current.quaternion.setFromUnitVectors(up, dir.clone().normalize());
    headRef.current.position.copy(b);
    headRef.current.quaternion.copy(shaftRef.current.quaternion);
  }, [a, b, dir, from, mid, to, up]);

  return (
    <group visible={!!visible}>
      <mesh ref={shaftRef} geometry={geometry}>
        <meshBasicMaterial color={colour} />
      </mesh>
      <mesh ref={headRef}>
        <coneGeometry args={[0.14, 0.34, 12]} />
        <meshBasicMaterial color={colour} />
      </mesh>
    </group>
  );
}
