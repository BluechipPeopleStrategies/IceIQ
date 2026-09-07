import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import GymRinkScene3D, { GymPuck } from "./gymRinkScene3D.jsx";
import { EYES_UP_RINK, pixelToWorldPoint } from "./eyesUpScene3DCore.js";
import { feetToMetres } from "./gymScene3DCore.js";

const LONG_M = EYES_UP_RINK.bounds.maxX - EYES_UP_RINK.bounds.minX;
const WIDE_M = EYES_UP_RINK.bounds.maxY - EYES_UP_RINK.bounds.minY;

function PassObjects({ sceneRef }) {
  const puckRef = useRef(null);
  const barRef = useRef(null);
  const truthRef = useRef(null);
  const guessRef = useRef(null);
  const linkRef = useRef(null);
  const windowRef = useRef(null);
  const scratch = useRef({ a: new THREE.Vector3(), b: new THREE.Vector3(), d: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0) });

  useFrame(() => {
    const scene = sceneRef.current;
    const traj = scene?.traj;
    if (!scene || !traj || !scene.W || !scene.H) {
      if (barRef.current) barRef.current.visible = false;
      if (puckRef.current) puckRef.current.visible = false;
      return;
    }
    const horizontal = traj.motion === "x";
    const crossSpan = horizontal ? traj.playH : scene.W;
    const barCenter = horizontal
      ? { x: traj.exitM, y: traj.playH / 2 }
      : { x: scene.W / 2, y: traj.exitM };
    const bar = pixelToWorldPoint(barCenter, scene.W, scene.H, 0.055);
    if (barRef.current && bar) {
      barRef.current.visible = true;
      barRef.current.position.set(bar.x, bar.y, bar.z);
      barRef.current.scale.set(
        horizontal ? (crossSpan / scene.H) * WIDE_M : (22 / scene.H) * WIDE_M,
        1,
        horizontal ? (22 / scene.W) * LONG_M : (crossSpan / scene.W) * LONG_M,
      );
    }

    const elapsed = Math.max(0, (performance.now() - scene.startedAt) / 1000);
    const isReveal = scene.revealStart !== null;
    const revealElapsed = isReveal ? Math.max(0, (performance.now() - scene.revealStart) / 1000) : 0;
    const index = Math.min(
      traj.pts.length - 1,
      Math.floor(((isReveal ? (scene.frozenIdx * (1 / 120) + revealElapsed * 3) : elapsed) / (1 / 120))),
    );
    const point = traj.pts[index];
    const passedHide = traj.forward ? point?.[traj.motion === "x" ? "x" : "y"] > traj.hideM : point?.[traj.motion === "x" ? "x" : "y"] < traj.hideM;
    if (puckRef.current && point) {
      const puck = pixelToWorldPoint(point, scene.W, scene.H, 0.17);
      puckRef.current.position.set(puck.x, puck.y, puck.z);
      puckRef.current.visible = isReveal || !passedHide;
    }

    const shown = isReveal && scene.guessC !== null;
    const truthPx = horizontal ? { x: traj.exitM, y: traj.crossPos } : { x: traj.crossPos, y: traj.exitM };
    const guessPx = horizontal ? { x: traj.exitM, y: scene.guessC } : { x: scene.guessC, y: traj.exitM };
    const truth = pixelToWorldPoint(truthPx, scene.W, scene.H, 0.15);
    const guess = pixelToWorldPoint(guessPx, scene.W, scene.H, 0.16);
    if (truthRef.current && truth) {
      truthRef.current.visible = isReveal;
      truthRef.current.position.set(truth.x, truth.y, truth.z);
    }
    if (guessRef.current && guess) {
      guessRef.current.visible = shown;
      guessRef.current.position.set(guess.x, guess.y, guess.z);
    }
    if (linkRef.current && truth && guess) {
      const { a, b, d, up } = scratch.current;
      a.set(truth.x, 0.18, truth.z); b.set(guess.x, 0.18, guess.z); d.copy(b).sub(a);
      const length = d.length();
      linkRef.current.visible = shown && length > 0.001;
      if (length > 0.001) {
        linkRef.current.position.copy(a).add(b).multiplyScalar(0.5);
        linkRef.current.scale.set(1, length, 1);
        linkRef.current.quaternion.setFromUnitVectors(up, d.normalize());
      }
    }
    if (windowRef.current && truth) {
      const tolerance = feetToMetres(traj.toleranceFt) || 0.01;
      const barThickness = horizontal ? (22 / scene.W) * LONG_M : (22 / scene.H) * WIDE_M;
      windowRef.current.visible = isReveal;
      windowRef.current.position.set(truth.x, 0.11, truth.z);
      windowRef.current.scale.set(horizontal ? tolerance : barThickness, 1, horizontal ? barThickness : tolerance);
    }
  });

  return (
    <>
      <mesh ref={barRef} visible={false}>
        <boxGeometry args={[1, 0.06, 1]} />
        <meshStandardMaterial color="#f2b705" transparent opacity={0.92} roughness={0.4} />
      </mesh>
      <GymPuck ref={puckRef} position={[0, 0.17, 0]} />
      <mesh ref={truthRef} visible={false}>
        <sphereGeometry args={[0.34, 20, 14]} />
        <meshStandardMaterial color="#f2b705" emissive="#7a5900" emissiveIntensity={0.35} />
      </mesh>
      <mesh ref={guessRef} visible={false} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.55, 0.09, 8, 24]} />
        <meshBasicMaterial color="#e8590c" />
      </mesh>
      <mesh ref={linkRef} visible={false}>
        <cylinderGeometry args={[0.025, 0.025, 1, 8]} />
        <meshBasicMaterial color="#0b1b2b" transparent opacity={0.48} />
      </mesh>
      <mesh ref={windowRef} visible={false}>
        <boxGeometry args={[2, 0.045, 2]} />
        <meshBasicMaterial color="#1B6CB0" transparent opacity={0.22} />
      </mesh>
    </>
  );
}

export default function AnticipationScene3D({ sceneRef, onTap }) {
  return <GymRinkScene3D sceneRef={sceneRef} onTap={onTap} canTap={(scene) => !!scene?.traj && scene.revealStart === null}><PassObjects sceneRef={sceneRef} /></GymRinkScene3D>;
}
