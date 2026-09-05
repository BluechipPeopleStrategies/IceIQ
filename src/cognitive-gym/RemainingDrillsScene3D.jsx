import React, { useMemo, useRef } from "react";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import GymRinkScene3D, { GymPuck } from "./gymRinkScene3D.jsx";
import { HockeySkater } from "./GymScenePrimitives.jsx";
import { pixelToWorldPoint } from "./eyesUpScene3DCore.js";
import { GYM_TARGET_MAX_Y } from "./gymEngine.js";
import { countdownRingScale, lateReadCueIndex, readNumbersLabelsVisible, runPlayCatchFraction, runPlayStepIndex } from "./gymScene3DCore.js";

const NAVY = "#0B1A33";
const GOLD = "#F2B705";
const BLUE = "#1B6CB0";
const RED = "#E8590C";
const RUN_PLAY_JERSEYS = [9, 16, 7, 29, 19, 87, 97];

function readNumbersShowLabels(scene) {
  return readNumbersLabelsVisible(scene?.stage);
}

function runPlayStep(scene) {
  if (scene?.stage !== "watch" || scene.watchStart == null || !scene.seq?.length || !(scene.stepMs > 0)) return -1;
  return runPlayStepIndex(performance.now() - scene.watchStart, scene.stepMs, scene.seq.length);
}

function runPlayPuckPoint(scene) {
  const step = runPlayStep(scene);
  if (step < 0 || !scene.skaters?.length) return null;
  const to = scene.skaters[scene.seq[step]];
  if (!to) return null;
  const from = step === 0 ? { x: scene.W / 2, y: scene.H + 20 } : scene.skaters[scene.seq[step - 1]];
  if (!from) return to;
  const elapsed = Math.max(0, performance.now() - scene.watchStart);
  const fraction = runPlayCatchFraction(elapsed, scene.stepMs);
  return { x: from.x + (to.x - from.x) * fraction, y: from.y + (to.y - from.y) * fraction };
}

function toWorld(point, scene, height = 0.08) {
  return point && scene?.W && scene?.H ? pixelToWorldPoint(point, scene.W, scene.H, height) : null;
}

function DynamicMarker({ sceneRef, point, colour = NAVY, label, number, visible = true, ring = false, puck = false, opacity = 1 }) {
  const rootRef = useRef(null);
  const ringRef = useRef(null);
  const labelRef = useRef(null);
  const numberRef = useRef(null);
  useFrame(() => {
    const scene = sceneRef.current;
    const world = toWorld(typeof point === "function" ? point(scene) : point, scene);
    if (!rootRef.current || !world) {
      if (rootRef.current) rootRef.current.visible = false;
      return;
    }
    const shown = typeof visible === "function" ? visible(scene) : visible;
    const ringShown = typeof ring === "function" ? ring(scene) : ring;
    const numberValue = typeof number === "function" ? number(scene) : number;
    rootRef.current.visible = shown && opacity > 0;
    rootRef.current.position.set(world.x, world.y, world.z);
    rootRef.current.scale.setScalar(Math.max(0.78, (scene.r || 16) / 15));
    if (ringRef.current) {
      ringRef.current.visible = !!ringShown;
      ringRef.current.material.color.set(GOLD);
    }
    if (numberRef.current) {
      numberRef.current.textContent = numberValue == null ? "" : String(numberValue);
      const hideNumber = !!(scene.skaters && !scene.seq && !readNumbersShowLabels(scene));
      numberRef.current.style.visibility = numberValue == null || hideNumber ? "hidden" : "visible";
    }
    if (labelRef.current) labelRef.current.style.visibility = shown && opacity > 0 ? "visible" : "hidden";
  });
  return (
    <group ref={rootRef} visible={false}>
      <HockeySkater colour={colour} isLearner={label === "YOU"} puck={puck} scale={0.92} />
      {(ring || typeof ring === "function") && <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.07, 0]}>
        <torusGeometry args={[0.94, 0.08, 8, 28]} />
        <meshBasicMaterial color={GOLD} transparent opacity={0.95} />
      </mesh>}
      {label && <Html center position={[0, 1.42, 0]} style={{ pointerEvents: "none" }}><span ref={labelRef} style={{ display: "inline-block", background: NAVY, color: "#FFFFFF", padding: "2px 5px", borderRadius: "999px", font: "800 12px/1 system-ui, sans-serif", whiteSpace: "nowrap", pointerEvents: "none" }}>{label}</span></Html>}
      {(number != null || typeof number === "function") && <Html center position={[0, 1.32, 0]} style={{ pointerEvents: "none" }}><span ref={numberRef} style={{ display: "inline-block", background: NAVY, color: "#FFFFFF", padding: "2px 5px", borderRadius: "999px", font: "800 12px/1 system-ui, sans-serif", whiteSpace: "nowrap", pointerEvents: "none" }}>{typeof number === "function" ? "" : String(number)}</span></Html>}
    </group>
  );
}

function DynamicPuck({ sceneRef, point, visible = true }) {
  const ref = useRef(null);
  useFrame(() => {
    const scene = sceneRef.current;
    const world = toWorld(typeof point === "function" ? point(scene) : point, scene, 0.16);
    if (!ref.current || !world) {
      if (ref.current) ref.current.visible = false;
      return;
    }
    ref.current.visible = typeof visible === "function" ? visible(scene) : visible;
    ref.current.position.set(world.x, world.y, world.z);
  });
  return <GymPuck ref={ref} visible={false} radius={0.38} />;
}

function DynamicLink({ sceneRef, from, to, colour = GOLD, visible = true, dashed = false, arrow = false }) {
  const ref = useRef(null);
  const arrowRef = useRef(null);
  const material = useMemo(() => new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity: dashed ? 0.38 : 0.9 }), [colour, dashed]);
  const scratch = useMemo(() => ({ a: new THREE.Vector3(), b: new THREE.Vector3(), d: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0) }), []);
  useFrame(() => {
    const scene = sceneRef.current;
    const a = toWorld(typeof from === "function" ? from(scene) : from, scene, 0.12);
    const b = toWorld(typeof to === "function" ? to(scene) : to, scene, 0.12);
    if (!ref.current || !a || !b) {
      if (ref.current) ref.current.visible = false;
      if (arrowRef.current) arrowRef.current.visible = false;
      return;
    }
    const { a: av, b: bv, d, up } = scratch;
    av.set(a.x, 0.14, a.z); bv.set(b.x, 0.14, b.z); d.copy(bv).sub(av);
    const length = d.length();
    ref.current.visible = (typeof visible === "function" ? visible(scene) : visible) && length > 0.001;
    if (length > 0.001) {
      ref.current.position.copy(av).add(bv).multiplyScalar(0.5);
      ref.current.scale.set(1, length, 1);
      ref.current.quaternion.setFromUnitVectors(up, d.normalize());
    }
    if (arrowRef.current) {
      arrowRef.current.visible = ref.current.visible;
      arrowRef.current.position.copy(bv).addScaledVector(d, -0.55);
      arrowRef.current.quaternion.copy(ref.current.quaternion);
    }
  });
  React.useEffect(() => () => material.dispose(), [material]);
  return <><mesh ref={ref} visible={false} material={material}><cylinderGeometry args={[0.035, 0.035, 1, 8]} /></mesh>{arrow && <mesh ref={arrowRef} visible={false} material={material}><coneGeometry args={[0.36, 1.1, 12]} /></mesh>}</>;
}

function CountdownRing({ sceneRef, duration }) {
  const ref = useRef(null);
  useFrame(() => {
    const scene = sceneRef.current;
    const world = toWorld(scene?.you || scene?.tr?.you, scene, 0.14);
    const start = scene?.startTs;
    const clock = typeof duration === "function" ? duration(scene) : duration;
    if (!ref.current || !world || scene?.stage !== "live" || start == null || !(clock > 0)) {
      if (ref.current) ref.current.visible = false;
      return;
    }
    const fraction = Math.max(0, Math.min(1, 1 - (performance.now() - start) / clock));
    ref.current.visible = true;
    ref.current.position.set(world.x, 0.11, world.z);
    // Scale the complete ring by its remaining fraction so it actually runs
    // out when the response window closes.
    ref.current.scale.setScalar(countdownRingScale(fraction));
    ref.current.children[0]?.material.color.set(fraction < 0.33 ? RED : GOLD);
  });
  return <group ref={ref} visible={false} rotation={[-Math.PI / 2, 0, 0]}><mesh><torusGeometry args={[1.05, 0.08, 8, 32]} /><meshBasicMaterial color={GOLD} transparent opacity={0.9} /></mesh></group>;
}

function FindLaneObjects({ sceneRef }) {
  return <>
    <CountdownRing sceneRef={sceneRef} duration={(s) => s.closeMs} />
    <DynamicMarker sceneRef={sceneRef} point={(s) => s.you} label="YOU" colour={NAVY} puck />
    {Array.from({ length: 5 }, (_, i) => <DynamicMarker key={`r${i}`} sceneRef={sceneRef} point={(s) => s.receivers?.[i]} colour={NAVY} ring={(s) => s.result && i === s.openIndex} />)}
    {Array.from({ length: 7 }, (_, i) => <DynamicMarker key={`d${i}`} sceneRef={sceneRef} point={(s) => s.defenders?.[i]} colour={GOLD} label="×" />)}
    {Array.from({ length: 5 }, (_, i) => <DynamicLink key={`l${i}`} sceneRef={sceneRef} from={(s) => s.you} to={(s) => s.receivers?.[i]} visible={(s) => !!s.result && i === s.openIndex} colour="#28D17C" />)}
  </>;
}

function ReadNumbersObjects({ sceneRef }) {
  return <>{Array.from({ length: 9 }, (_, i) => <DynamicMarker key={i} sceneRef={sceneRef} point={(s) => s.skaters?.[i]} number={(s) => s.skaters?.[i]?.number} colour={NAVY} visible={(s) => !!s.skaters?.[i]} ring={(s) => s.stage === "feedback" && i === s.targetIndex} />)}</>;
}

function LateReadObjects({ sceneRef }) {
  return <>
    <CountdownRing sceneRef={sceneRef} duration={(s) => s.tr?.clockMs} />
    <DynamicMarker sceneRef={sceneRef} point={(s) => s.tr?.you} label="YOU" colour={NAVY} puck />
    {Array.from({ length: 5 }, (_, i) => <DynamicMarker key={`m${i}`} sceneRef={sceneRef} point={(s) => s.tr?.teammates?.[i]} colour={NAVY} ring={(s) => i === lateReadCueIndex(s, performance.now())} />)}
    {Array.from({ length: 5 }, (_, i) => <DynamicMarker key={`d${i}`} sceneRef={sceneRef} point={(s) => {
      const d = s.tr?.defenders?.[i];
      const fired = s.tr?.changes && (s.stage === "reveal" || (s.startTs != null && performance.now() - s.startTs >= s.tr.changeAtMs));
      if (i === 0 && fired && s.tr?.teammates?.[s.tr.firstIndex] && s.tr?.you) {
        const first = s.tr.teammates[s.tr.firstIndex];
        return { x: s.tr.you.x + (first.x - s.tr.you.x) * 0.6, y: s.tr.you.y + (first.y - s.tr.you.y) * 0.6 };
      }
      return d;
    }} colour={GOLD} label="×" />)}
    <DynamicLink sceneRef={sceneRef} from={(s) => s.tr?.you} to={(s) => s.tr?.teammates?.[lateReadCueIndex(s, performance.now())]} visible={(s) => s.stage === "live"} colour={GOLD} arrow />
    <DynamicLink sceneRef={sceneRef} from={(s) => s.tr?.you} to={(s) => s.tr?.teammates?.[s.tr?.finalIndex]} visible={(s) => s.stage === "reveal"} colour="#28D17C" arrow />
  </>;
}

function TwoThingsObjects({ sceneRef }) {
  const circleRef = useRef(null);
  const triangleRef = useRef(null);
  const squareRef = useRef(null);
  const bandRef = useRef(null);
  const crossingRef = useRef(null);
  const tapRef = useRef(null);
  const missRef = useRef(null);
  useFrame(() => {
    const scene = sceneRef.current;
    const active = scene?.cueShowing && scene?.round?.cueShape;
    const cuePoint = scene?.W && scene?.H
      ? toWorld({ x: scene.W / 2, y: scene.H * (GYM_TARGET_MAX_Y - 0.08) }, scene, 0.2)
      : null;
    const crossingPoint = scene?.W && scene?.H
      ? toWorld({ x: scene.W / 2, y: scene.laneY }, scene, 0.13)
      : null;
    if (circleRef.current) circleRef.current.visible = active === "circle";
    if (triangleRef.current) triangleRef.current.visible = active === "triangle";
    if (squareRef.current) squareRef.current.visible = active === "square";
    [circleRef.current, triangleRef.current, squareRef.current].forEach((ref) => {
      if (ref && cuePoint) ref.position.set(cuePoint.x, cuePoint.y, cuePoint.z);
    });
    if (bandRef.current && scene?.stage !== "ready" && scene?.stage !== "reveal") {
      const p = crossingPoint;
      bandRef.current.visible = !!p;
      if (p) {
        bandRef.current.position.set(p.x, 0.055, p.z);
        // PlaneGeometry is local XY; after the rink rotation its local Y is
        // the long-axis thickness of the crossing band.
        bandRef.current.scale.set(25.908, Math.max(0.2, (scene.W ? 10 * 60.96 / scene.W : 0.75)), 1);
        bandRef.current.material.color.set(scene.inWindow ? RED : BLUE);
        bandRef.current.material.opacity = scene.inWindow ? 0.42 : 0.16;
      }
    } else if (bandRef.current) bandRef.current.visible = false;
    if (crossingRef.current) {
      crossingRef.current.visible = scene?.stage === "reveal" && !!crossingPoint;
      if (crossingPoint) crossingRef.current.position.set(crossingPoint.x, 0.16, crossingPoint.z);
    }
    const tapPoint = scene?.tapPos ? toWorld(scene.tapPos, scene, 0.17) : null;
    if (tapRef.current) {
      tapRef.current.visible = scene?.stage === "reveal" && !!tapPoint && !!scene.result?.primaryHit;
      if (tapPoint) tapRef.current.position.set(tapPoint.x, 0.17, tapPoint.z);
    }
    if (missRef.current) {
      missRef.current.visible = scene?.stage === "reveal" && !!tapPoint && !scene.result?.primaryHit;
      if (tapPoint) missRef.current.position.set(tapPoint.x, 0.18, tapPoint.z);
    }
  });
  return <>
    <DynamicPuck sceneRef={sceneRef} point={(s) => s.pos} visible={(s) => s.stage === "live" || s.stage === "reveal"} />
    <mesh ref={bandRef} rotation={[-Math.PI / 2, 0, 0]} visible={false}><planeGeometry args={[1, 1]} /><meshBasicMaterial color={BLUE} transparent opacity={0.16} depthWrite={false} /></mesh>
    <mesh ref={circleRef} rotation={[-Math.PI / 2, 0, 0]} visible={false}><ringGeometry args={[0.76, 1.05, 28]} /><meshBasicMaterial color={GOLD} transparent opacity={0.9} /></mesh>
    <mesh ref={triangleRef} rotation={[-Math.PI / 2, 0, 0]} visible={false}><ringGeometry args={[0.76, 1.05, 3]} /><meshBasicMaterial color={GOLD} transparent opacity={0.9} /></mesh>
    <mesh ref={squareRef} visible={false}><boxGeometry args={[1.65, 0.05, 1.65]} /><meshBasicMaterial color={GOLD} transparent opacity={0.9} /></mesh>
    <mesh ref={crossingRef} rotation={[-Math.PI / 2, 0, 0]} visible={false}><torusGeometry args={[0.42, 0.09, 8, 24]} /><meshBasicMaterial color={GOLD} /></mesh>
    <mesh ref={tapRef} rotation={[-Math.PI / 2, 0, 0]} visible={false}><torusGeometry args={[0.62, 0.1, 8, 24]} /><meshBasicMaterial color={BLUE} /></mesh>
    <group ref={missRef} visible={false}>
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 4]}><boxGeometry args={[0.12, 0.04, 1.25]} /><meshBasicMaterial color={RED} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, -Math.PI / 4]}><boxGeometry args={[0.12, 0.04, 1.25]} /><meshBasicMaterial color={RED} /></mesh>
    </group>
  </>;
}

function SequenceBadge({ sceneRef, sequenceIndex }) {
  const rootRef = useRef(null);
  const labelRef = useRef(null);
  useFrame(() => {
    const scene = sceneRef.current;
    const skaterIndex = scene?.seq?.[sequenceIndex];
    const point = skaterIndex == null ? null : toWorld(scene.skaters?.[skaterIndex], scene, 0.16);
    const shown = scene?.stage === "reveal" && !!point;
    if (!rootRef.current || !labelRef.current) return;
    rootRef.current.visible = shown;
    // Html is a separate DOM overlay and does not inherit a Three group's visibility.
    labelRef.current.style.visibility = shown ? "visible" : "hidden";
    if (!shown) return;
    rootRef.current.position.set(point.x, point.y, point.z);
    const correctPrefix = Number.isFinite(scene.result?.correctPrefix) ? scene.result.correctPrefix : 0;
    labelRef.current.textContent = String(sequenceIndex + 1);
    labelRef.current.style.background = sequenceIndex < correctPrefix ? "#1F9D55" : RED;
    const priorVisits = scene.seq.slice(0, sequenceIndex).filter(index => index === skaterIndex).length;
    labelRef.current.style.transform = `translate(${10 + priorVisits * 22}px, 18px)`;
  });
  return <group ref={rootRef} visible={false}>
    <Html center position={[0.48, 1.3, 0]} style={{ pointerEvents: "none" }}>
      <span ref={labelRef} data-run-order={sequenceIndex + 1} style={{ display: "inline-block", visibility: "hidden", minWidth: 18, textAlign: "center", background: RED, color: "#FFFFFF", padding: "2px 4px", borderRadius: "999px", font: "800 12px/1 system-ui, sans-serif", pointerEvents: "none" }}>{sequenceIndex + 1}</span>
    </Html>
  </group>;
}

function WrongTapCross({ sceneRef }) {
  const rootRef = useRef(null);
  useFrame(() => {
    const scene = sceneRef.current;
    const point = scene?.wrongTap == null ? null : toWorld(scene.skaters?.[scene.wrongTap], scene, 0.18);
    const shown = scene?.stage === "reveal" && !!point;
    if (!rootRef.current) return;
    rootRef.current.visible = shown;
    if (point) rootRef.current.position.set(point.x, point.y, point.z);
  });
  return <group ref={rootRef} visible={false}>
    <mesh rotation={[-Math.PI / 2, 0, Math.PI / 4]}><boxGeometry args={[0.12, 0.04, 1.2]} /><meshBasicMaterial color={RED} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, -Math.PI / 4]}><boxGeometry args={[0.12, 0.04, 1.2]} /><meshBasicMaterial color={RED} /></mesh>
  </group>;
}

function RunThePlayObjects({ sceneRef }) {
  return <>
    {Array.from({ length: 8 }, (_, i) => <DynamicMarker key={i} sceneRef={sceneRef} point={(s) => s.skaters?.[i]} number={(s) => s.skaters?.[i] ? RUN_PLAY_JERSEYS[i % RUN_PLAY_JERSEYS.length] : null} colour={NAVY} ring={(s) => (s.stage === "watch" && runPlayStep(s) >= 0 && s.seq?.[runPlayStep(s)] === i) || (s.stage === "recall" && s.taps?.length > 0 && s.taps[s.taps.length - 1] === i)} visible={(s) => !!s.skaters?.[i]} />)}
    <DynamicPuck sceneRef={sceneRef} point={runPlayPuckPoint} visible={(s) => s.stage === "watch"} />
    {Array.from({ length: 7 }, (_, i) => <DynamicLink key={`pass-${i}`} sceneRef={sceneRef} from={(s) => {
      if (i === 0) return s.W && s.H ? { x: s.W / 2, y: s.H + 20 } : null;
      return s.skaters?.[s.seq?.[i - 1]];
    }} to={(s) => s.skaters?.[s.seq?.[i]]} visible={(s) => s.stage === "reveal" && s.seq?.[i] != null && (i === 0 || s.seq?.[i - 1] != null)} colour="#1F9D55" dashed />)}
    {Array.from({ length: 7 }, (_, i) => <SequenceBadge key={`badge-${i}`} sceneRef={sceneRef} sequenceIndex={i} />)}
    <WrongTapCross sceneRef={sceneRef} />
  </>;
}

export default function RemainingDrillsScene3D({ mode, sceneRef, onTap }) {
  const canTap = (scene) => {
    if (mode === "findlane") return scene?.stage === "live";
    if (mode === "readnumbers") return scene?.stage === "pick";
    if (mode === "lateread") return scene?.stage === "live";
    if (mode === "twothings") return scene?.stage === "live";
    if (mode === "runtheplay") return scene?.stage === "recall";
    return false;
  };
  return <GymRinkScene3D sceneRef={sceneRef} onTap={onTap} canTap={canTap}>
    {mode === "findlane" && <FindLaneObjects sceneRef={sceneRef} />}
    {mode === "readnumbers" && <ReadNumbersObjects sceneRef={sceneRef} />}
    {mode === "lateread" && <LateReadObjects sceneRef={sceneRef} />}
    {mode === "twothings" && <TwoThingsObjects sceneRef={sceneRef} />}
    {mode === "runtheplay" && <RunThePlayObjects sceneRef={sceneRef} />}
  </GymRinkScene3D>;
}
