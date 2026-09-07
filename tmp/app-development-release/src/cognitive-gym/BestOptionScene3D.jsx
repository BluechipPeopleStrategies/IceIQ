import React, { useMemo, useRef } from "react";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { normalizedRinkPoint, BEST_OPTION_BLUE_LINES } from "./gymVisualCore";
import { ArenaLights, HockeySkater, IceSheet3D } from "./GymScenePrimitives";

const MAX_TEAMMATES = 6;
const MAX_DEFENDERS = 7;

function mapped(point, scene) {
  return normalizedRinkPoint(point, scene.W, scene.H);
}

function ActorSlot({ sceneRef, role, index = 0 }) {
  const root = useRef(null);
  const badge = useRef(null);
  useFrame(() => {
    const scene = sceneRef.current;
    const sit = scene?.sit;
    if (!root.current || !sit) return;
    const actor = role === "you" ? sit.you : role === "goalie" ? sit.goalie : role === "teammate" ? sit.teammates[index] : sit.defenders[index];
    root.current.visible = !!actor;
    if (!actor) return;
    const p = mapped(actor, scene);
    root.current.position.set(p.x, 0, p.z);
    const facing = role === "goalie" ? sit.you : sit.net;
    const target = mapped(facing, scene);
    root.current.lookAt(target.x, 0, target.z);
    if (badge.current) {
      const revealOpen = scene.stage === "reveal" && role === "teammate" && actor.open && sit.best === "pass";
      badge.current.style.opacity = revealOpen || role === "you" ? "1" : "0";
      badge.current.textContent = role === "you" ? "YOU · PUCK" : "OPEN PLAYER";
    }
  });

  const goalie = role === "goalie";
  const colour = role === "you" || role === "teammate" ? "#0B1A33" : "#C9A24B";
  return (
    <group ref={root}>
      <HockeySkater colour={colour} accent={role === "defender" || goalie ? "#0B1A33" : "#C9A24B"} puck={role === "you"} isLearner={role === "you"} goalie={goalie} scale={goalie ? 0.46 : 0.39} />
      {(role === "you" || role === "teammate") && (
        <Html center position={[0, 0.72, 0]} style={{ pointerEvents: "none" }}>
          <span ref={badge} className="gym-actor-label" />
        </Html>
      )}
      {role === "defender" && (
        <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
          <ringGeometry args={[0.26, 0.31, 4]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.72} />
        </mesh>
      )}
    </group>
  );
}

function DecisionGoal({ sceneRef }) {
  const root = useRef(null);
  useFrame(() => {
    const scene = sceneRef.current;
    if (!root.current || !scene?.sit) return;
    const p = mapped(scene.sit.net, scene);
    root.current.position.set(p.x, 0.04, p.z);
    root.current.rotation.y = Math.PI / 2;
  });
  return (
    <group ref={root}>
      {[-0.42, 0.42].map((x) => (
        <mesh key={x} castShadow position={[x, 0.35, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.7, 10]} />
          <meshStandardMaterial color="#d81035" />
        </mesh>
      ))}
      <mesh castShadow position={[0, 0.7, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.035, 0.035, 0.9, 10]} />
        <meshStandardMaterial color="#d81035" />
      </mesh>
      <mesh position={[0, 0.36, -0.08]}>
        <planeGeometry args={[0.82, 0.64]} />
        <meshBasicMaterial color="#d8edf5" wireframe transparent opacity={0.42} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function CountdownHalo({ sceneRef }) {
  const root = useRef(null);
  const ring = useRef(null);
  useFrame(() => {
    const scene = sceneRef.current;
    if (!root.current || !scene?.sit) return;
    const p = mapped(scene.sit.you, scene);
    root.current.position.set(p.x, 0.035, p.z);
    const live = scene.stage === "live" && scene.startTs != null;
    root.current.visible = live;
    if (!live) return;
    const frac = Math.max(0, 1 - (performance.now() - scene.startTs) / scene.sit.clockMs);
    ring.current.scale.setScalar(0.52 + frac * 0.48);
    ring.current.material.color.set(frac > 0.33 ? "#28aaf2" : "#ff7b31");
  });
  return (
    <group ref={root}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.42, 0.5, 48]} />
        <meshBasicMaterial transparent opacity={0.9} />
      </mesh>
    </group>
  );
}

function DecisionRoute({ sceneRef }) {
  const group = useRef(null);
  const shaft = useRef(null);
  const head = useRef(null);
  const a = useMemo(() => new THREE.Vector3(), []);
  const b = useMemo(() => new THREE.Vector3(), []);
  const dir = useMemo(() => new THREE.Vector3(), []);
  const mid = useMemo(() => new THREE.Vector3(), []);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);

  useFrame(() => {
    const scene = sceneRef.current;
    if (!group.current || !scene?.sit) return;
    group.current.visible = scene.stage === "reveal" && !!scene.result;
    if (!group.current.visible) return;
    const sit = scene.sit;
    const from = mapped(sit.you, scene);
    let destination = sit.net;
    if (sit.best === "pass") destination = sit.teammates.find((player) => player.open) || sit.teammates[0];
    if (sit.best === "carry") {
      destination = {
        x: sit.you.x + (sit.net.x - sit.you.x) * 0.5,
        y: sit.you.y + (sit.net.y - sit.you.y) * 0.5,
      };
    }
    const to = mapped(destination, scene);
    a.set(from.x, 0.08, from.z);
    b.set(to.x, 0.08, to.z);
    dir.copy(b).sub(a);
    const length = dir.length();
    mid.copy(a).add(b).multiplyScalar(0.5);
    shaft.current.position.copy(mid);
    shaft.current.scale.set(1, length, 1);
    shaft.current.quaternion.setFromUnitVectors(up, dir.normalize());
    head.current.position.copy(b);
    head.current.quaternion.copy(shaft.current.quaternion);
  });
  return (
    <group ref={group}>
      <mesh ref={shaft}>
        <cylinderGeometry args={[0.045, 0.045, 1, 10]} />
        <meshBasicMaterial color="#28d17c" />
      </mesh>
      <mesh ref={head}>
        <coneGeometry args={[0.16, 0.4, 12]} />
        <meshBasicMaterial color="#28d17c" />
      </mesh>
    </group>
  );
}

export default function BestOptionScene3D({ sceneRef }) {
  useFrame(({ camera }) => camera.lookAt(0, 0, 0));
  return (
    <>
      <fog attach="fog" args={["#07131f", 12, 24]} />
      <ArenaLights />
      <IceSheet3D width={10} depth={4.7} blueLines={BEST_OPTION_BLUE_LINES} />
      <DecisionGoal sceneRef={sceneRef} />
      <ActorSlot sceneRef={sceneRef} role="goalie" />
      <ActorSlot sceneRef={sceneRef} role="you" />
      {Array.from({ length: MAX_TEAMMATES }, (_, index) => (
        <ActorSlot key={`mate-${index}`} sceneRef={sceneRef} role="teammate" index={index} />
      ))}
      {Array.from({ length: MAX_DEFENDERS }, (_, index) => (
        <ActorSlot key={`def-${index}`} sceneRef={sceneRef} role="defender" index={index} />
      ))}
      <CountdownHalo sceneRef={sceneRef} />
      <DecisionRoute sceneRef={sceneRef} />
    </>
  );
}
