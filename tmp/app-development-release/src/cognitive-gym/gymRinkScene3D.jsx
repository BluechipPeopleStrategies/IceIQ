import React, { useLayoutEffect, useMemo, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { OrthographicCamera } from "@react-three/drei";
import * as THREE from "three";
import { Arena, Goal, Ice } from "../one-on-one/PracticeScene.jsx";
import { roundedRinkShape } from "../one-on-one/rinkMaterials.js";
import { worldPointToEyesUpTap } from "./eyesUpScene3DCore.js";
import { gymRinkCamera } from './gymRinkCameraCore.js';

export function GymRinkCamera() {
  const { size } = useThree();
  const ref=useRef(null);
  const view=useMemo(()=>gymRinkCamera(size.width/Math.max(1,size.height)),[size.width,size.height]);
  useLayoutEffect(() => {
    const camera=ref.current;if(!camera)return;
    camera.position.set(...view.position);
    camera.lookAt(...view.target);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  }, [view]);
  return <OrthographicCamera ref={ref} makeDefault manual position={view.position} left={view.left} right={view.right} top={view.top} bottom={view.bottom} near={view.near} far={view.far}/>;
}

export function GymRinkTapSurface({ sceneRef, onTap, canTap = () => true }) {
  const geometry = useMemo(() => new THREE.ShapeGeometry(roundedRinkShape(0.08), 28), []);
  const callback = useRef(onTap);
  callback.current = onTap;
  const permission = useRef(canTap);
  permission.current = canTap;
  React.useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh
      geometry={geometry}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.035, 0]}
      onPointerDown={(event) => {
        event.stopPropagation();
        const scene = sceneRef.current;
        if (!permission.current(scene) || !scene?.W || !scene?.H) return;
        const tap = worldPointToEyesUpTap(event.point, scene.W, scene.H);
        if (tap) callback.current?.(tap);
      }}
    >
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

export const GymPuck = React.forwardRef(function GymPuck({ position = [0, 0.12, 0], radius = 0.48 }, ref) {
  return (
    <mesh ref={ref} castShadow position={position}>
      <cylinderGeometry args={[radius, radius, radius * 0.22, 28]} />
      <meshStandardMaterial color="#03070a" roughness={0.42} metalness={0.05} />
    </mesh>
  );
});

export default function GymRinkScene3D({ sceneRef, onTap, canTap, children }) {
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
      {children}
      <GymRinkTapSurface sceneRef={sceneRef} onTap={onTap} canTap={canTap} />
    </>
  );
}
