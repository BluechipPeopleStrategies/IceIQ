import React, { useMemo, useRef } from "react";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { isCellOpenAt } from "./shootoutCore";
import {
  SHOOTOUT_CELL_LAYOUT,
  coverageReach,
  goalieTargetForCell,
  shootoutHitRegion,
} from "./gymVisualCore";
import { ArenaLights } from "./GymScenePrimitives";

const CELL_LABELS = {
  gloveHi: "GLOVE HIGH",
  midHi: "HIGH MIDDLE",
  blkrHi: "BLOCKER HIGH",
  gloveLo: "GLOVE LOW",
  fiveHole: "FIVE HOLE",
  blkrLo: "BLOCKER LOW",
};

function elapsedFor(scene, now) {
  if (!scene?.shot) return 0;
  if (scene.stage === "live" && scene.startTs != null) {
    return Math.min(now - scene.startTs, scene.shot.shotClockMs);
  }
  return scene.frozenElapsed || 0;
}

function makeNetLines() {
  const p = [];
  const add = (a, b) => p.push(...a, ...b);
  const left = -2.05;
  const right = 2.05;
  const floor = -1.32;
  const top = 1.32;
  const backZ = -0.64;
  for (let i = 0; i <= 8; i += 1) {
    const x = left + ((right - left) * i) / 8;
    add([x, floor, 0], [x * 0.9, floor, backZ]);
    add([x * 0.9, floor, backZ], [x * 0.9, top * 0.9, backZ]);
  }
  for (let i = 0; i <= 6; i += 1) {
    const y = floor + ((top - floor) * i) / 6;
    add([left, y, 0], [left * 0.9, y * 0.92, backZ]);
    add([right, y, 0], [right * 0.9, y * 0.92, backZ]);
    add([left * 0.9, y * 0.92, backZ], [right * 0.9, y * 0.92, backZ]);
  }
  return new Float32Array(p);
}

function GoalFrame() {
  const netPositions = useMemo(makeNetLines, []);
  return (
    <group>
      <lineSegments position={[0, 0, -0.03]}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[netPositions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#d8edf5" transparent opacity={0.58} />
      </lineSegments>
      {[-2.08, 2.08].map((x) => (
        <mesh key={x} castShadow position={[x, 0, 0]}>
          <cylinderGeometry args={[0.075, 0.075, 2.72, 16]} />
          <meshStandardMaterial color="#d81035" roughness={0.4} metalness={0.16} />
        </mesh>
      ))}
      <mesh castShadow position={[0, 1.34, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.075, 0.075, 4.22, 16]} />
        <meshStandardMaterial color="#d81035" roughness={0.4} metalness={0.16} />
      </mesh>
      <mesh receiveShadow position={[0, -1.37, -0.25]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.45, 48, 0, Math.PI]} />
        <meshStandardMaterial color="#59b7e8" transparent opacity={0.22} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function TargetCell({ cell, sceneRef, onSelectCell }) {
  const hitRegion = shootoutHitRegion(cell);
  const openRing = useRef(null);
  const coveredMark = useRef(null);
  const hitRef = useRef(null);
  const labelRef = useRef(null);
  const stateRef = useRef("");

  useFrame(({ clock }) => {
    const scene = sceneRef.current;
    if (!scene?.shot) return;
    const elapsed = elapsedFor(scene, performance.now());
    const open = isCellOpenAt(scene.shot, cell.id, elapsed);
    if (openRing.current) {
      openRing.current.visible = open;
      const pulse = scene.stage === "live" ? 1 + Math.sin(clock.elapsedTime * 5 + cell.column) * 0.055 : 1;
      openRing.current.scale.setScalar(pulse);
    }
    if (coveredMark.current) coveredMark.current.visible = !open;
    if (hitRef.current) hitRef.current.visible = scene.stage === "live";
    const nextState = open ? "OPEN" : "COVERED";
    if (nextState !== stateRef.current && labelRef.current) {
      stateRef.current = nextState;
      labelRef.current.textContent = `${CELL_LABELS[cell.id]} · ${nextState}`;
      labelRef.current.dataset.state = open ? "open" : "covered";
    }
  });

  return (
    <group position={[cell.x, cell.y, 0.13]}>
      <mesh
        ref={hitRef}
        position={[hitRegion.x-cell.x, hitRegion.y-cell.y, 0]}
        onPointerDown={(event) => {
          event.stopPropagation();
          if (sceneRef.current?.stage === "live") onSelectCell(cell.id);
        }}
      >
        <planeGeometry args={[hitRegion.width, hitRegion.height]} />
        <meshBasicMaterial transparent opacity={0.035} color="#ffffff" side={THREE.DoubleSide} />
      </mesh>
      <group ref={openRing}>
        <mesh>
          <ringGeometry args={[0.23, 0.285, 32]} />
          <meshBasicMaterial color="#ffd84d" transparent opacity={0.95} side={THREE.DoubleSide} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 4]}>
          <ringGeometry args={[0.34, 0.365, 4]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.76} side={THREE.DoubleSide} />
        </mesh>
      </group>
      <group ref={coveredMark}>
        <mesh rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.72, 0.075, 0.035]} />
          <meshBasicMaterial color="#a8bac5" transparent opacity={0.72} />
        </mesh>
        <mesh rotation={[0, 0, -Math.PI / 4]}>
          <boxGeometry args={[0.72, 0.075, 0.035]} />
          <meshBasicMaterial color="#a8bac5" transparent opacity={0.72} />
        </mesh>
      </group>
      <Html
        center
        transform
        distanceFactor={5.4}
        position={[0, cell.row === 0 ? 1.05 : -0.98, 0.04]}
        style={{ pointerEvents: "none" }}
      >
        <span ref={labelRef} className="gym-cell-label">{CELL_LABELS[cell.id]}</span>
      </Html>
    </group>
  );
}

function setSegment(mesh, start, end, scratch) {
  if (!mesh) return;
  scratch.direction.copy(end).sub(start);
  const length = scratch.direction.length();
  scratch.midpoint.copy(start).add(end).multiplyScalar(0.5);
  mesh.position.copy(scratch.midpoint);
  mesh.scale.set(1, length, 1);
  mesh.quaternion.setFromUnitVectors(scratch.up, scratch.direction.normalize());
}

function GoalieAvatar({ sceneRef }) {
  const root = useRef(null);
  const torso = useRef(null);
  const stick = useRef(null);
  const glove = useRef(null);
  const blocker = useRef(null);
  const leftUpper = useRef(null);
  const leftFore = useRef(null);
  const rightUpper = useRef(null);
  const rightFore = useRef(null);
  const leftPad = useRef(null);
  const rightPad = useRef(null);
  const scratch = useMemo(() => ({
    up: new THREE.Vector3(0, 1, 0),
    direction: new THREE.Vector3(),
    midpoint: new THREE.Vector3(),
    leftShoulder: new THREE.Vector3(-0.48, 0.46, 0.02),
    rightShoulder: new THREE.Vector3(0.48, 0.46, 0.02),
    leftElbow: new THREE.Vector3(),
    rightElbow: new THREE.Vector3(),
    leftHand: new THREE.Vector3(),
    rightHand: new THREE.Vector3(),
  }), []);

  useFrame(({ clock }) => {
    const scene = sceneRef.current;
    if (!scene?.shot || !root.current) return;
    const now = performance.now();
    const elapsed = elapsedFor(scene, now);
    const live = scene.stage === "live";
    let tx = live ? Math.sin(elapsed / 260) * 0.06 : 0;
    let ty = 0;
    let crouch = live ? 1 + Math.sin(clock.elapsedTime * 5) * 0.012 : 1;

    if (scene.tappedId) {
      const target = goalieTargetForCell(scene.tappedId);
      const start = scene.shotAnimStart || now;
      const save = scene.result && !scene.result.success;
      const f = Math.min(1, (now - start) / 460) * (save ? 0.36 : 0.1);
      tx += target.x * f;
      ty += target.y * f * 0.35;
      crouch = 1 - f * 0.2;
    }
    if (scene.stage === "poking" || (scene.stage === "reveal" && scene.expired)) {
      const f = Math.min(1, (now - (scene.pokeAnimStart || now)) / 520);
      if (stick.current) stick.current.rotation.x = -0.45 - f * 0.72;
      if (torso.current) torso.current.rotation.x = f * 0.18;
    } else {
      if (stick.current) stick.current.rotation.x = -0.45;
      if (torso.current) torso.current.rotation.x = 0;
    }
    const selected = scene.tappedId;
    const saveBoost = selected && scene.result && !scene.result.success
      ? Math.min(1, (now - (scene.shotAnimStart || now)) / 420)
      : 0;
    const reach = (id) => Math.max(
      coverageReach(scene.shot, id, elapsed),
      selected === id ? saveBoost : 0
    );
    const gloveHigh = reach("gloveHi");
    const gloveLow = reach("gloveLo");
    const blockerHigh = reach("blkrHi");
    const blockerLow = reach("blkrLo");
    const butterfly = reach("fiveHole");
    const highMiddle = reach("midHi");

    scratch.leftHand.set(
      -0.68 - Math.max(gloveHigh, gloveLow) * 0.38,
      0.3 + gloveHigh * 0.45 - gloveLow * 0.56,
      0.12
    );
    scratch.rightHand.set(
      0.68 + Math.max(blockerHigh, blockerLow) * 0.38,
      0.31 + blockerHigh * 0.43 - blockerLow * 0.56,
      0.12
    );
    scratch.leftElbow.copy(scratch.leftShoulder).add(scratch.leftHand).multiplyScalar(0.5);
    scratch.leftElbow.x -= 0.11;
    scratch.leftElbow.y -= 0.12;
    scratch.leftElbow.z += 0.08;
    scratch.rightElbow.copy(scratch.rightShoulder).add(scratch.rightHand).multiplyScalar(0.5);
    scratch.rightElbow.x += 0.11;
    scratch.rightElbow.y -= 0.12;
    scratch.rightElbow.z += 0.08;
    setSegment(leftUpper.current, scratch.leftShoulder, scratch.leftElbow, scratch);
    setSegment(leftFore.current, scratch.leftElbow, scratch.leftHand, scratch);
    setSegment(rightUpper.current, scratch.rightShoulder, scratch.rightElbow, scratch);
    setSegment(rightFore.current, scratch.rightElbow, scratch.rightHand, scratch);
    glove.current?.position.copy(scratch.leftHand);
    blocker.current?.position.copy(scratch.rightHand);

    if (leftPad.current && rightPad.current) {
      const leftWide = gloveLow * 0.34;
      const rightWide = blockerLow * 0.34;
      leftPad.current.position.set(-0.31 - leftWide + butterfly * 0.08, -0.72 - butterfly * 0.08, 0.1);
      rightPad.current.position.set(0.31 + rightWide - butterfly * 0.08, -0.72 - butterfly * 0.08, 0.1);
      leftPad.current.rotation.z = -0.08 - gloveLow * 0.12 + butterfly * 0.22;
      rightPad.current.rotation.z = 0.08 + blockerLow * 0.12 - butterfly * 0.22;
    }

    root.current.position.set(tx, ty - 0.13 * (1 - crouch), 0.18);
    root.current.scale.set(1, crouch, 1);
    if (torso.current) torso.current.scale.set(1 + highMiddle * 0.04, 1 - butterfly * 0.08, 1);
    if (glove.current) glove.current.rotation.z = -0.18 + Math.sin(clock.elapsedTime * 2.2) * 0.03;
    if (blocker.current) blocker.current.rotation.z = 0.14 - Math.sin(clock.elapsedTime * 2.2) * 0.03;
  });

  return (
    <group ref={root}>
      <group ref={torso}>
        <mesh castShadow position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.59, 0.39, 0.86, 10]} />
          <meshStandardMaterial color="#0B1A33" roughness={0.43} />
        </mesh>
        <mesh castShadow position={[0, 0.43, 0.01]}>
          <cylinderGeometry args={[0.615, 0.61, 0.14, 10]} />
          <meshStandardMaterial color="#C9A24B" roughness={0.4} />
        </mesh>
        <mesh castShadow position={[0, -0.13, 0.01]}>
          <cylinderGeometry args={[0.43, 0.41, 0.12, 10]} />
          <meshStandardMaterial color="#C9A24B" roughness={0.42} />
        </mesh>
        <mesh castShadow position={[0, -0.29, 0]}>
          <boxGeometry args={[0.72, 0.34, 0.42]} />
          <meshStandardMaterial color="#07131f" roughness={0.55} />
        </mesh>
        <Html center transform distanceFactor={4.5} position={[0, 0.15, 0.43]} style={{ pointerEvents: "none" }}>
          <span className="gym-goalie-crest"><b>RR</b><small>31</small></span>
        </Html>
      </group>

      {/* Helmet shell, jaw mask and a recognisable steel cage. */}
      <group position={[0, 0.83, 0.02]}>
        <mesh castShadow scale={[1, 1.08, 0.94]}>
          <sphereGeometry args={[0.31, 28, 20]} />
          <meshStandardMaterial color="#eef3f5" roughness={0.36} metalness={0.08} />
        </mesh>
        <mesh position={[0, -0.17, 0.21]} rotation={[0.2, 0, 0]}>
          <boxGeometry args={[0.44, 0.2, 0.11]} />
          <meshStandardMaterial color="#e4eaed" roughness={0.4} />
        </mesh>
        {[0.12, 0, -0.12].map((y) => (
          <mesh key={y} position={[0, y, 0.302]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.012, 0.012, 0.48, 8]} />
            <meshStandardMaterial color="#55636d" metalness={0.72} roughness={0.2} />
          </mesh>
        ))}
        {[-0.16, 0, 0.16].map((x) => (
          <mesh key={x} position={[x, 0, 0.305]}>
            <cylinderGeometry args={[0.012, 0.012, 0.46, 8]} />
            <meshStandardMaterial color="#55636d" metalness={0.72} roughness={0.2} />
          </mesh>
        ))}
      </group>

      {/* Jointed arms connect the shoulder line to glove and blocker. */}
      {[leftUpper, leftFore, rightUpper, rightFore].map((ref, i) => (
        <mesh key={i} ref={ref} castShadow>
          <capsuleGeometry args={[0.105, 1, 6, 12]} />
          <meshStandardMaterial color="#1a1a18" roughness={0.48} />
        </mesh>
      ))}
      <group ref={glove} position={[-0.68, 0.3, 0.12]}>
        <mesh castShadow scale={[1.1, 0.92, 0.5]}>
          <sphereGeometry args={[0.3, 22, 16]} />
          <meshStandardMaterial color="#f1f4f5" roughness={0.5} />
        </mesh>
        <mesh position={[-0.05, 0, 0.17]}>
          <ringGeometry args={[0.13, 0.18, 16]} />
          <meshBasicMaterial color="#52616c" side={THREE.DoubleSide} />
        </mesh>
      </group>
      <group ref={blocker} position={[0.68, 0.31, 0.12]}>
        <mesh castShadow>
          <boxGeometry args={[0.52, 0.46, 0.25]} />
          <meshStandardMaterial color="#f1f4f5" roughness={0.46} />
        </mesh>
        <mesh position={[0, 0, 0.132]}>
          <boxGeometry args={[0.38, 0.035, 0.02]} />
          <meshBasicMaterial color="#C9A24B" />
        </mesh>
      </group>

      {/* Anatomical bent stance behind proper rectangular leg pads. */}
      {[-0.3, 0.3].map((x) => (
        <group key={`leg-${x}`}>
          <mesh castShadow position={[x, -0.43, -0.02]} rotation={[0.22, 0, x < 0 ? -0.12 : 0.12]}>
            <capsuleGeometry args={[0.13, 0.46, 5, 10]} />
            <meshStandardMaterial color="#0a1926" roughness={0.55} />
          </mesh>
          <mesh castShadow position={[x * 1.22, -1.25, 0.1]} rotation={[0, x < 0 ? -0.16 : 0.16, 0]}>
            <boxGeometry args={[0.44, 0.12, 0.52]} />
            <meshStandardMaterial color="#07131f" roughness={0.45} />
          </mesh>
          <mesh position={[x * 1.22, -1.33, 0.12]}>
            <boxGeometry args={[0.54, 0.035, 0.62]} />
            <meshStandardMaterial color="#b9c7cf" metalness={0.74} roughness={0.2} />
          </mesh>
        </group>
      ))}
      {[-0.31, 0.31].map((x, index) => (
        <group key={`pad-${x}`} ref={index === 0 ? leftPad : rightPad} position={[x, -0.72, 0.1]}>
          <mesh castShadow>
            <boxGeometry args={[0.44, 1.08, 0.3]} />
            <meshStandardMaterial color="#f3f5f6" roughness={0.46} />
          </mesh>
          {[0.28, 0, -0.28].map((y) => (
            <mesh key={y} position={[0, y, 0.158]}>
              <boxGeometry args={[0.38, 0.03, 0.018]} />
              <meshBasicMaterial color="#7c8992" />
            </mesh>
          ))}
          <mesh position={[0, 0, 0.164]}>
            <boxGeometry args={[0.035, 0.94, 0.018]} />
            <meshBasicMaterial color="#C9A24B" />
          </mesh>
        </group>
      ))}
      <group ref={stick} position={[0.73, -0.12, 0.18]} rotation={[-0.45, 0, -0.22]}>
        <mesh position={[0, -0.65, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 1.6, 10]} />
          <meshStandardMaterial color="#b78a54" roughness={0.64} />
        </mesh>
        <mesh position={[-0.22, -1.48, 0]} rotation={[0, 0, Math.PI / 2]}>
          <boxGeometry args={[0.58, 0.1, 0.18]} />
          <meshStandardMaterial color="#26333e" roughness={0.5} />
        </mesh>
      </group>
    </group>
  );
}

function FlyingPuck({ sceneRef }) {
  const puck = useRef(null);
  useFrame(() => {
    const scene = sceneRef.current;
    if (!puck.current || !scene?.shot) return;
    const now = performance.now();
    if (scene.tappedId && (scene.stage === "shooting" || scene.stage === "reveal")) {
      const target = goalieTargetForCell(scene.tappedId);
      const f = Math.min(1, (now - (scene.shotAnimStart || now)) / 460);
      const stop = scene.result && !scene.result.success ? Math.min(f, 0.82) : f;
      puck.current.visible = true;
      puck.current.position.set(target.x * stop, -1.25 + (target.y + 1.25) * stop, 3.7 - stop * 3.45);
      puck.current.scale.setScalar(1);
    } else if (scene.stage === "poking" || (scene.stage === "reveal" && scene.expired)) {
      const f = Math.min(1, (now - (scene.pokeAnimStart || now)) / 520);
      puck.current.visible = true;
      puck.current.position.set(-1.8 * f * f, -1.24 + f * 0.08, 3.7 - f * 0.5);
    } else {
      puck.current.visible = scene.stage === "ready" || scene.stage === "live";
      puck.current.position.set(0, -1.24, 3.7);
      puck.current.scale.setScalar(1);
    }
  });
  return (
    <mesh ref={puck} castShadow>
      <cylinderGeometry args={[0.105, 0.105, 0.055, 28]} />
      <meshStandardMaterial color="#020609" roughness={0.42} />
    </mesh>
  );
}

function ShootoutWorld({ sceneRef, onSelectCell, onExpire, onAnimationComplete }) {
  const goalGroup = useRef(null);
  const completedStage = useRef("");
  useFrame(({ camera, clock }) => {
    const scene = sceneRef.current;
    if (!scene?.shot || !goalGroup.current) return;
    const now = performance.now();
    const elapsed = elapsedFor(scene, now);
    const raw = elapsed / scene.shot.shotClockMs;
    const approach = raw * (0.55 + 0.45 * raw);
    // Move the shooter camera through a fixed world. Scaling the net used to
    // lift the goalie's skates off the ice and separate shot endpoints from targets.
    goalGroup.current.scale.setScalar(1);
    goalGroup.current.position.y = 0;
    camera.position.z = 8.6 - approach * 3.2;
    camera.position.x = Math.sin(clock.elapsedTime * 5.5) * (scene.stage === "live" ? 0.035 : 0);
    camera.position.y = 0.22 + Math.sin(clock.elapsedTime * 7) * (scene.stage === "live" ? 0.025 : 0);
    camera.lookAt(0, 0, 0);

    if (scene.stage === "live" && now - scene.startTs >= scene.shot.shotClockMs) onExpire();
    if (scene.stage === "shooting" && now - scene.shotAnimStart >= 460 && completedStage.current !== "shooting") {
      completedStage.current = "shooting";
      onAnimationComplete("shooting");
    }
    if (scene.stage === "poking" && now - scene.pokeAnimStart >= 520 && completedStage.current !== "poking") {
      completedStage.current = "poking";
      onAnimationComplete("poking");
    }
    if (scene.stage === "ready" || scene.stage === "live") completedStage.current = "";
  });

  return (
    <>
      <fog attach="fog" args={["#07131f", 10, 24]} />
      <ArenaLights dramatic />
      <mesh position={[0, 2.25, -3.4]}>
        <planeGeometry args={[16, 7]} />
        <meshStandardMaterial color="#07131f" roughness={0.78} />
      </mesh>
      {[-2.3, -1.55, -0.8].map((y, index) => (
        <mesh key={y} position={[0, y + 3.7, -3.31]}>
          <boxGeometry args={[14, 0.34, 0.16]} />
          <meshStandardMaterial color={index === 1 ? "#133957" : "#102b42"} roughness={0.72} />
        </mesh>
      ))}
      {[-3.9, 0, 3.9].map((x) => (
        <group key={x} position={[x, 4.6, -2.5]}>
          <mesh>
            <cylinderGeometry args={[0.34, 0.5, 0.22, 24]} />
            <meshStandardMaterial color="#dbe8ee" metalness={0.5} roughness={0.25} />
          </mesh>
          <pointLight position={[0, -0.25, 0.4]} intensity={7} color="#e9f7ff" distance={10} />
        </group>
      ))}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.4, 1.8]}>
        <planeGeometry args={[18, 18]} />
        <meshPhysicalMaterial color="#dff3fb" roughness={0.24} metalness={0.02} clearcoat={0.35} clearcoatRoughness={0.3} />
      </mesh>
      {[-5.1, 5.1].map((x) => (
        <group key={x}>
          <mesh castShadow position={[x, -0.72, 0]}>
            <boxGeometry args={[0.2, 1.25, 14]} />
            <meshStandardMaterial color="#f7fafb" roughness={0.5} />
          </mesh>
          <mesh position={[x, 0.08, 0]}>
            <boxGeometry args={[0.24, 0.11, 14]} />
            <meshStandardMaterial color="#C9A24B" roughness={0.4} />
          </mesh>
          <mesh position={[x, 1.05, 0]}>
            <boxGeometry args={[0.055, 1.8, 14]} />
            <meshPhysicalMaterial color="#bfe6f5" transparent opacity={0.14} roughness={0.12} transmission={0.48} />
          </mesh>
        </group>
      ))}
      {[1, 2, 3, 4].map((i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.385, i * 2.4 - 1]}>
          <planeGeometry args={[8.8, 0.045]} />
          <meshBasicMaterial color={i % 2 ? "#1b6cb0" : "#c8102e"} transparent opacity={0.22} />
        </mesh>
      ))}
      <group ref={goalGroup} position={[0, 0, 0]}>
        <GoalFrame />
        {SHOOTOUT_CELL_LAYOUT.map((cell) => (
          <TargetCell key={cell.id} cell={cell} sceneRef={sceneRef} onSelectCell={onSelectCell} />
        ))}
        <GoalieAvatar sceneRef={sceneRef} />
      </group>
      <FlyingPuck sceneRef={sceneRef} />
    </>
  );
}

export default function ShootoutScene3D(props) {
  return <ShootoutWorld {...props} />;
}
