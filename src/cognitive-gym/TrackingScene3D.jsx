import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { HockeySkater } from "./GymScenePrimitives.jsx";
import GymRinkScene3D, { GymPuck } from "./gymRinkScene3D.jsx";
import { pixelToWorldPoint } from "./eyesUpScene3DCore.js";
import { trackingTargetVisible } from "./gymScene3DCore.js";

function SoccerBall() {
  return (
    <group>
      <mesh castShadow>
        <sphereGeometry args={[0.26, 16, 12]} />
        <meshStandardMaterial color="#F7FAFC" roughness={0.7} />
      </mesh>
      <mesh position={[0.19, 0.08, 0.12]}>
        <sphereGeometry args={[0.075, 8, 6]} />
        <meshBasicMaterial color="#111820" />
      </mesh>
      <mesh position={[-0.16, 0.08, -0.14]}>
        <sphereGeometry args={[0.07, 8, 6]} />
        <meshBasicMaterial color="#111820" />
      </mesh>
    </group>
  );
}

function FeedbackMarks({ markRef }) {
  return (
    <group ref={markRef} visible={false} position={[0, 1.25, 0]}>
      <group name="check" visible={false}>
        <mesh position={[-0.16, 0, 0]} rotation={[0, 0, -0.7]}><boxGeometry args={[0.1, 0.08, 0.36]} /><meshBasicMaterial color="#FFFFFF" /></mesh>
        <mesh position={[0.13, 0, 0]} rotation={[0, 0, 0.72]}><boxGeometry args={[0.1, 0.08, 0.58]} /><meshBasicMaterial color="#FFFFFF" /></mesh>
      </group>
      <group name="cross" visible={false}>
        <mesh rotation={[0, 0, 0.78]}><boxGeometry args={[0.1, 0.08, 0.56]} /><meshBasicMaterial color="#FFFFFF" /></mesh>
        <mesh rotation={[0, 0, -0.78]}><boxGeometry args={[0.1, 0.08, 0.56]} /><meshBasicMaterial color="#FFFFFF" /></mesh>
      </group>
    </group>
  );
}

function TrackedDot({ sceneRef, index }) {
  const rootRef = useRef(null);
  const markerRef = useRef(null);
  const puckRef = useRef(null);
  const ringRef = useRef(null);
  const markRef = useRef(null);
  useFrame(() => {
    const scene = sceneRef.current;
    const dot = scene?.dots?.[index];
    if (!rootRef.current || !dot) {
      if (rootRef.current) rootRef.current.visible = false;
      return;
    }
    rootRef.current.visible = true;
    const world = pixelToWorldPoint(dot, scene.W, scene.H, 0.06);
    rootRef.current.position.set(world.x, world.y, world.z);
    const scale = Math.max(0.72, dot.r / 14);
    rootRef.current.scale.setScalar(scale);

    const target = scene.targetIdx?.has(index);
    const picked = scene.picks?.has(index);
    let colour = "#dfeaf0";
    if (scene.stage === "watch" && target) colour = "#f2b705";
    else if (scene.stage === "feedback" && target && picked) colour = "#1b6cb0";
    else if (scene.stage === "feedback" && picked) colour = "#d6336c";
    else if (scene.ballCall === index) colour = "#f2b705";
    if (markerRef.current) markerRef.current.material.color.set(colour);
    if (ringRef.current) {
      ringRef.current.visible = trackingTargetVisible(scene.stage, target);
      ringRef.current.material.color.set("#f2b705");
    }
    if (puckRef.current) puckRef.current.visible = index === scene.ballIdx && (scene.stage === "watch" || scene.stage === "feedback");
    if (markRef.current) {
      const pickedWrong = scene.stage === "feedback" && picked && !target;
      const pickedRight = scene.stage === "feedback" && picked && target;
      markRef.current.visible = pickedRight || pickedWrong;
      markRef.current.children[0].visible = pickedRight;
      markRef.current.children[1].visible = pickedWrong;
    }
  });
  return (
    <group ref={rootRef} visible={false}>
      <HockeySkater colour="#0B1A33" scale={1.05} />
      <mesh ref={markerRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.035, 0]}>
        <cylinderGeometry args={[0.76, 0.76, 0.045, 24]} />
        <meshBasicMaterial color="#dfeaf0" transparent opacity={0.72} />
      </mesh>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.065, 0]}>
        <torusGeometry args={[0.82, 0.06, 8, 24]} />
        <meshBasicMaterial color="#607888" />
      </mesh>
      <group ref={puckRef} position={[0.22, 0.09, -0.4]} visible={false}><SoccerBall /></group>
      <FeedbackMarks markRef={markRef} />
    </group>
  );
}

function TrackingObjects({ sceneRef }) {
  return <>{Array.from({ length: 16 }, (_, index) => <TrackedDot key={index} sceneRef={sceneRef} index={index} />)}</>;
}

export default function TrackingScene3D({ sceneRef, onTap }) {
  return (
    <GymRinkScene3D
      sceneRef={sceneRef}
      onTap={onTap}
      canTap={(scene) => scene?.stage === "pick"}
    >
      <TrackingObjects sceneRef={sceneRef} />
    </GymRinkScene3D>
  );
}
