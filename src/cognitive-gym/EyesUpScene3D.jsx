import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Arena, Ice, Goal } from "../one-on-one/PracticeScene.jsx";
import { GymRinkCamera } from "./gymRinkScene3D.jsx";
import {
  pixelToWorldPoint,
  worldPointToEyesUpTap,
} from "./eyesUpScene3DCore.js";
import { pixelHitRadii } from "./gymScene3DCore.js";

function FixationPuck() {
  return (
    <group position={[0, 0.2, 0]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.58, 0.58, 0.16, 32]} />
        <meshStandardMaterial color="#050a10" roughness={0.38} metalness={0.08} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.09, 0]}>
        <torusGeometry args={[0.92, 0.055, 10, 48]} />
        <meshBasicMaterial color="#f2b705" transparent opacity={0.95} />
      </mesh>
    </group>
  );
}

function FlashMarker({ sceneRef }) {
  const markerRef = useRef(null);
  const targetRingRef = useRef(null);
  const tapRef = useRef(null);
  const lineRef = useRef(null);
  const scratch = useRef({ a: new THREE.Vector3(), b: new THREE.Vector3(), direction: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0) });

  useFrame(() => {
    const scene = sceneRef.current;
    if (!scene?.flash || !scene.W || !scene.H) return;
    const flash = pixelToWorldPoint(scene.flash, scene.W, scene.H, 0.12);
    if (!flash) return;
    const visible = !!scene.showFlash || !!scene.result;
    if (markerRef.current) {
      markerRef.current.visible = visible;
      markerRef.current.position.set(flash.x, flash.y, flash.z);
    }
    if (targetRingRef.current) {
      targetRingRef.current.visible = !!scene.result;
      targetRingRef.current.position.set(flash.x, 0.065, flash.z);
      const radii = pixelHitRadii(scene.flash.hitR, scene.W, scene.H);
      if (radii) targetRingRef.current.scale.set(radii.z / 1.42, 1, radii.x / 1.42);
    }

    if (tapRef.current && lineRef.current && scene.tap) {
      const tap = pixelToWorldPoint(scene.tap, scene.W, scene.H, 0.13);
      tapRef.current.visible = visible;
      tapRef.current.position.set(tap.x, tap.y, tap.z);
      const { a, b, direction } = scratch.current;
      a.set(flash.x, 0.14, flash.z); b.set(tap.x, 0.14, tap.z);
      direction.copy(b).sub(a);
      const length = direction.length();
      lineRef.current.visible = visible && length > 0.001;
      if (length > 0.001) {
        lineRef.current.position.copy(a).add(b).multiplyScalar(0.5);
        lineRef.current.scale.set(1, length, 1);
        lineRef.current.quaternion.setFromUnitVectors(scratch.current.up, direction.normalize());
      }
    } else if (tapRef.current) {
      tapRef.current.visible = false;
      lineRef.current.visible = false;
    }
  });

  return (
    <>
      <group ref={markerRef} visible={false}>
        <mesh castShadow>
          <cylinderGeometry args={[0.85, 0.85, 0.12, 24]} />
          <meshStandardMaterial color="#1b6cb0" roughness={0.45} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.07, 0]}>
          <torusGeometry args={[0.86, 0.1, 10, 32]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.075, 0]}>
          <torusGeometry args={[1.08, 0.055, 10, 32]} />
          <meshBasicMaterial color="#0b1b2b" />
        </mesh>
      </group>
      <mesh ref={targetRingRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.065, 0]} visible={false}>
        <torusGeometry args={[1.42, 0.035, 8, 48]} />
        <meshBasicMaterial color="#f2b705" transparent opacity={0.9} />
      </mesh>
      <mesh ref={tapRef} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <torusGeometry args={[0.72, 0.08, 8, 24]} />
        <meshBasicMaterial color="#e8590c" />
      </mesh>
      <mesh ref={lineRef} visible={false}>
        <cylinderGeometry args={[0.025, 0.025, 1, 8]} />
        <meshBasicMaterial color="#0b1b2b" transparent opacity={0.48} />
      </mesh>
    </>
  );
}

function IceTapSurface({ sceneRef, onTap }) {
  const geometry = React.useMemo(() => new THREE.ShapeGeometry(roundedRinkShape(0.08), 28), []);
  React.useEffect(() => () => geometry.dispose(), [geometry]);
  const callback = useRef(onTap);
  callback.current = onTap;
  return (
    <mesh
      geometry={geometry}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.035, 0]}
      onPointerDown={(event) => {
        event.stopPropagation();
        const scene = sceneRef.current;
        if (!scene?.armed || scene.resolved || !scene.W || !scene.H) return;
        const tap = worldPointToEyesUpTap(event.point, scene.W, scene.H);
        if (tap) callback.current?.(tap);
      }}
    >
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

export default function EyesUpScene3D({ sceneRef, onTap }) {
  return (
    <>
      <color attach="background" args={["#07131f"]} />
      <fog attach="fog" args={["#07131f", 70, 150]} />
      <ambientLight intensity={0.82} color="#dff1fa" />
      <hemisphereLight args={["#f5fbff", "#20364a", 1.2]} />
      <directionalLight castShadow position={[-12, 30, 10]} intensity={2.1} color="#fff8e9" />
      <pointLight position={[0, 7, 0]} intensity={4} color="#69c7ff" distance={24} />
      <GymRinkCamera />
      <Arena openView />
      <Ice />
      <Goal />
      <group rotation={[0, Math.PI, 0]}><Goal /></group>
      <FixationPuck />
      <FlashMarker sceneRef={sceneRef} />
      <IceTapSurface sceneRef={sceneRef} onTap={onTap} />
    </>
  );
}
