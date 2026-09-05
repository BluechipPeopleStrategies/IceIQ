import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { HockeySkater } from "./GymScenePrimitives.jsx";
import GymRinkScene3D, { GymPuck } from "./gymRinkScene3D.jsx";
import { pixelToWorldPoint } from "./eyesUpScene3DCore.js";
import { feetToMetres } from "./gymScene3DCore.js";

function SnapshotMarker({ sceneRef, index }) {
  const rootRef = useRef(null);
  const markerRef = useRef(null);
  const ringRef = useRef(null);
  const crossRef = useRef(null);
  useFrame(() => {
    const scene = sceneRef.current;
    const marker = scene?.markers?.[index];
    if (!rootRef.current || !marker) {
      if (rootRef.current) rootRef.current.visible = false;
      return;
    }
    const visible = !!scene.showFormation || !!scene.result;
    rootRef.current.visible = visible;
    const world = pixelToWorldPoint(marker, scene.W, scene.H, 0.06);
    rootRef.current.position.set(world.x, world.y, world.z);
    const scale = Math.max(0.72, scene.r / 14);
    rootRef.current.scale.setScalar(scale);
    const open = marker.kind === "open";
    const defender = marker.kind === "defender";
    if (markerRef.current) {
      markerRef.current.material.color.set(open ? "#f2b705" : defender ? "#cdd9e1" : "#1b6cb0");
      markerRef.current.material.opacity = scene.result && !open ? 0.48 : 0.9;
    }
    if (ringRef.current) {
      ringRef.current.visible = open;
      ringRef.current.material.color.set("#0b1b2b");
    }
    if (crossRef.current) crossRef.current.visible = defender && visible;
  });
  return (
    <group ref={rootRef} visible={false}>
      <HockeySkater colour="#0B1A33" scale={1.05} />
      <mesh ref={markerRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.035, 0]}>
        <cylinderGeometry args={[0.76, 0.76, 0.045, 24]} />
        <meshBasicMaterial color="#1b6cb0" transparent opacity={0.9} />
      </mesh>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.065, 0]} visible={false}>
        <torusGeometry args={[0.92, 0.08, 8, 28]} />
        <meshBasicMaterial color="#0b1b2b" />
      </mesh>
      <group ref={crossRef} position={[0, 1.2, 0]} visible={false}>
        <mesh rotation={[0, 0, 0.78]}><boxGeometry args={[0.1, 0.08, 0.62]} /><meshBasicMaterial color="#0B1A33" /></mesh>
        <mesh rotation={[0, 0, -0.78]}><boxGeometry args={[0.1, 0.08, 0.62]} /><meshBasicMaterial color="#0B1A33" /></mesh>
      </group>
    </group>
  );
}

function SnapshotObjects({ sceneRef }) {
  const windowRef = useRef(null);
  const tapRef = useRef(null);
  const tapCrossRef = useRef(null);
  const linkRef = useRef(null);
  const scratch = useRef({ a: new THREE.Vector3(), b: new THREE.Vector3(), d: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0) });
  useFrame(() => {
    const scene = sceneRef.current;
    const open = scene?.open;
    const target = open && scene?.W && scene?.H ? pixelToWorldPoint(open, scene.W, scene.H, 0.13) : null;
    const tap = scene?.tap && scene?.W && scene?.H ? pixelToWorldPoint(scene.tap, scene.W, scene.H, 0.14) : null;
    const shown = !!scene?.result && !!target;
    if (windowRef.current) {
      windowRef.current.visible = shown;
      if (target) {
        windowRef.current.position.set(target.x, 0.1, target.z);
        const radius = feetToMetres(open.hitFt);
        windowRef.current.scale.setScalar(radius || 0.01);
      }
    }
    if (tapRef.current) {
      tapRef.current.visible = shown && !!tap && !!scene.result?.success;
      if (tap) tapRef.current.position.set(tap.x, 0.16, tap.z);
    }
    if (tapCrossRef.current) {
      tapCrossRef.current.visible = shown && !!tap && !scene.result?.success;
      if (tap) tapCrossRef.current.position.set(tap.x, 0.17, tap.z);
    }
    if (linkRef.current && target && tap) {
      const { a, b, d, up } = scratch.current;
      a.set(target.x, 0.17, target.z); b.set(tap.x, 0.17, tap.z); d.copy(b).sub(a);
      const length = d.length();
      linkRef.current.visible = shown && length > 0.001;
      linkRef.current.material.color.set(scene.result?.success ? "#1B6CB0" : "#E8590C");
      if (length > 0.001) {
        linkRef.current.position.copy(a).add(b).multiplyScalar(0.5);
        linkRef.current.scale.set(1, length, 1);
        linkRef.current.quaternion.setFromUnitVectors(up, d.normalize());
      }
    }
  });
  return (
    <>
      <GymPuck position={[0, 0.14, 0]} radius={0.34} />
      {Array.from({ length: 20 }, (_, index) => <SnapshotMarker key={index} sceneRef={sceneRef} index={index} />)}
      <mesh ref={windowRef} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <torusGeometry args={[1, 0.035, 8, 48]} />
        <meshBasicMaterial color="#1B6CB0" transparent opacity={0.62} />
      </mesh>
      <mesh ref={tapRef} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <torusGeometry args={[0.48, 0.09, 8, 24]} />
        <meshBasicMaterial color="#1B6CB0" />
      </mesh>
      <group ref={tapCrossRef} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <mesh rotation={[0, 0, Math.PI / 4]}><boxGeometry args={[0.12, 0.08, 1.1]} /><meshBasicMaterial color="#E8590C" /></mesh>
        <mesh rotation={[0, 0, -Math.PI / 4]}><boxGeometry args={[0.12, 0.08, 1.1]} /><meshBasicMaterial color="#E8590C" /></mesh>
      </group>
      <mesh ref={linkRef} visible={false}>
        <cylinderGeometry args={[0.025, 0.025, 1, 8]} />
        <meshBasicMaterial color="#0B1A33" transparent opacity={0.5} />
      </mesh>
    </>
  );
}

export default function SnapshotScene3D({ sceneRef, onTap }) {
  return (
    <GymRinkScene3D
      sceneRef={sceneRef}
      onTap={onTap}
      canTap={(scene) => !!scene?.armed && !scene?.resolved}
    >
      <SnapshotObjects sceneRef={sceneRef} />
    </GymRinkScene3D>
  );
}
