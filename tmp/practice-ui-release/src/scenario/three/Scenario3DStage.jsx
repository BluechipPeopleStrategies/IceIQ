import { useEffect, useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { normalizedToWorld } from "./rink3dCoords.js";
import { levelsOf, rinkRenderFor } from "../youngRink.js";

const RINK_LENGTH_M = 60;
const RINK_WIDTH_M = 30;
const LINE_THICKNESS_M = 0.14;
const LINE_HEIGHT_M = 0.035;
const BOARD_THICKNESS_M = 0.45;
const BOARD_HEIGHT_M = 0.55;

const LINE_POSITIONS = {
  leftGoal: 40 / 600,
  leftBlue: 213 / 600,
  center: 0.5,
  rightBlue: 387 / 600,
  rightGoal: 560 / 600,
};

const COLORS = {
  ice: "#dff5ff",
  iceEdge: "#c5e7f6",
  boards: "#f8fafc",
  boardTop: "#d4d4d8",
  blueLine: "#2563eb",
  redLine: "#b91c1c",
  player: "#fbbf24",
  teammate: "#38bdf8",
  defender: "#111827",
  goalie: "#f97316",
  puck: "#020617",
  labelBg: "rgba(15, 23, 42, 0.88)",
  labelText: "#ffffff",
  ring: "#ffffff",
};

function canUseWebGL() {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl2") ||
        canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

function worldAt(x, y, height = 0) {
  const p = normalizedToWorld({ x, y });
  return [p.x, height, p.z];
}

function cameraFrame(view) {
  if (view === "left") return { center: normalizedToWorld({ x: 0.25, y: 0.5 }), width: 36, depth: 36 };
  if (view === "right") return { center: normalizedToWorld({ x: 0.75, y: 0.5 }), width: 36, depth: 36 };
  if (view === "neutral") return { center: normalizedToWorld({ x: 0.5, y: 0.5 }), width: 30, depth: 36 };
  return { center: normalizedToWorld({ x: 0.5, y: 0.5 }), width: 68, depth: 38 };
}

function CameraRig({ view }) {
  const { camera, invalidate, size } = useThree();
  const frame = cameraFrame(view);

  useEffect(() => {
    const visibleWidth = frame.width;
    const visibleHeight = frame.depth;
    camera.position.set(frame.center.x, 60, frame.center.z);
    camera.up.set(0, 0, -1);
    camera.lookAt(frame.center.x, 0, frame.center.z);
    camera.near = 0.1;
    camera.far = 140;
    camera.zoom = Math.max(1, Math.min(size.width / visibleWidth, size.height / visibleHeight));
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, frame.center.x, frame.center.z, frame.depth, frame.width, invalidate, size.height, size.width]);

  return null;
}

function Label({ children, position, compact = false }) {
  if (!children) return null;
  return (
    <Html position={position} center style={{ pointerEvents: "none" }}>
      <div
        style={{
          background: COLORS.labelBg,
          border: "1px solid rgba(255,255,255,0.55)",
          borderRadius: 6,
          color: COLORS.labelText,
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: compact ? 10 : 12,
          fontWeight: 800,
          lineHeight: 1,
          padding: compact ? "3px 5px" : "4px 6px",
          whiteSpace: "nowrap",
        }}
      >
        {children}
      </div>
    </Html>
  );
}

function LineStrip({ x, color, width = LINE_THICKNESS_M }) {
  return (
    <mesh position={worldAt(x, 0.5, LINE_HEIGHT_M / 2)}>
      <boxGeometry args={[width, LINE_HEIGHT_M, RINK_WIDTH_M]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

function Boards() {
  const center = normalizedToWorld({ x: 0.5, y: 0.5 });
  const left = normalizedToWorld({ x: 0, y: 0.5 });
  const right = normalizedToWorld({ x: 1, y: 0.5 });
  const top = normalizedToWorld({ x: 0.5, y: 0 });
  const bottom = normalizedToWorld({ x: 0.5, y: 1 });

  return (
    <group>
      <mesh position={[center.x, 0, center.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[RINK_LENGTH_M, RINK_WIDTH_M]} />
        <meshBasicMaterial color={COLORS.ice} />
      </mesh>
      <mesh position={[center.x, 0.006, center.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[RINK_LENGTH_M - 0.4, RINK_WIDTH_M - 0.4]} />
        <meshBasicMaterial color={COLORS.iceEdge} transparent opacity={0.38} />
      </mesh>
      <mesh position={[left.x - BOARD_THICKNESS_M / 2, BOARD_HEIGHT_M / 2, left.z]}>
        <boxGeometry args={[BOARD_THICKNESS_M, BOARD_HEIGHT_M, RINK_WIDTH_M + BOARD_THICKNESS_M * 2]} />
        <meshBasicMaterial color={COLORS.boards} />
      </mesh>
      <mesh position={[right.x + BOARD_THICKNESS_M / 2, BOARD_HEIGHT_M / 2, right.z]}>
        <boxGeometry args={[BOARD_THICKNESS_M, BOARD_HEIGHT_M, RINK_WIDTH_M + BOARD_THICKNESS_M * 2]} />
        <meshBasicMaterial color={COLORS.boards} />
      </mesh>
      <mesh position={[top.x, BOARD_HEIGHT_M / 2, top.z - BOARD_THICKNESS_M / 2]}>
        <boxGeometry args={[RINK_LENGTH_M + BOARD_THICKNESS_M * 2, BOARD_HEIGHT_M, BOARD_THICKNESS_M]} />
        <meshBasicMaterial color={COLORS.boards} />
      </mesh>
      <mesh position={[bottom.x, BOARD_HEIGHT_M / 2, bottom.z + BOARD_THICKNESS_M / 2]}>
        <boxGeometry args={[RINK_LENGTH_M + BOARD_THICKNESS_M * 2, BOARD_HEIGHT_M, BOARD_THICKNESS_M]} />
        <meshBasicMaterial color={COLORS.boards} />
      </mesh>
      <mesh position={[center.x, BOARD_HEIGHT_M + 0.02, top.z - BOARD_THICKNESS_M / 2]}>
        <boxGeometry args={[RINK_LENGTH_M + BOARD_THICKNESS_M * 2, 0.08, 0.12]} />
        <meshBasicMaterial color={COLORS.boardTop} />
      </mesh>
      <mesh position={[center.x, BOARD_HEIGHT_M + 0.02, bottom.z + BOARD_THICKNESS_M / 2]}>
        <boxGeometry args={[RINK_LENGTH_M + BOARD_THICKNESS_M * 2, 0.08, 0.12]} />
        <meshBasicMaterial color={COLORS.boardTop} />
      </mesh>
    </group>
  );
}

function GoalFrame({ side }) {
  const isLeft = side === "left";
  const goalLineX = isLeft ? LINE_POSITIONS.leftGoal : LINE_POSITIONS.rightGoal;
  const goal = normalizedToWorld({ x: goalLineX, y: 0.5 });
  const direction = isLeft ? -1 : 1;
  const depth = 1.2;
  const width = 3.0;
  const bar = 0.16;
  const height = 0.16;

  return (
    <group>
      <mesh position={[goal.x + direction * depth / 2, height, goal.z - width / 2]}>
        <boxGeometry args={[depth, height, bar]} />
        <meshBasicMaterial color={COLORS.redLine} />
      </mesh>
      <mesh position={[goal.x + direction * depth / 2, height, goal.z + width / 2]}>
        <boxGeometry args={[depth, height, bar]} />
        <meshBasicMaterial color={COLORS.redLine} />
      </mesh>
      <mesh position={[goal.x + direction * depth, height, goal.z]}>
        <boxGeometry args={[bar, height, width + bar]} />
        <meshBasicMaterial color={COLORS.redLine} />
      </mesh>
    </group>
  );
}

function RinkMarkings({ hideZoneLines }) {
  return (
    <group>
      {!hideZoneLines && (
        <>
          <LineStrip x={LINE_POSITIONS.leftBlue} color={COLORS.blueLine} width={0.22} />
          <LineStrip x={LINE_POSITIONS.center} color={COLORS.redLine} width={0.16} />
          <LineStrip x={LINE_POSITIONS.rightBlue} color={COLORS.blueLine} width={0.22} />
        </>
      )}
      <LineStrip x={LINE_POSITIONS.leftGoal} color={COLORS.redLine} width={0.12} />
      <LineStrip x={LINE_POSITIONS.rightGoal} color={COLORS.redLine} width={0.12} />
      <GoalFrame side="left" />
      <GoalFrame side="right" />
    </group>
  );
}

function DiscMarker({ color, position }) {
  return (
    <mesh position={position}>
      <cylinderGeometry args={[0.65, 0.65, 0.18, 32]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

function PlayerMarker({ actor }) {
  const p = normalizedToWorld(actor);
  return (
    <group position={[p.x, 0, p.z]}>
      <DiscMarker color={COLORS.player} position={[0, 0.12, 0]} />
      <mesh position={[0, 0.23, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.78, 0.045, 8, 48]} />
        <meshBasicMaterial color={COLORS.ring} />
      </mesh>
      <mesh position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.98, 0.045, 8, 48]} />
        <meshBasicMaterial color={COLORS.defender} />
      </mesh>
      <Label position={[0, 0.75, 0]}>YOU</Label>
    </group>
  );
}

function TeammateMarker({ actor }) {
  const p = normalizedToWorld(actor);
  const label = actor.tag || actor.label || "";
  return (
    <group position={[p.x, 0, p.z]}>
      <DiscMarker color={COLORS.teammate} position={[0, 0.12, 0]} />
      <mesh position={[0, 0.23, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.78, 0.04, 8, 40]} />
        <meshBasicMaterial color={COLORS.ring} />
      </mesh>
      <Label position={[0, 0.72, 0]} compact>{label}</Label>
    </group>
  );
}

function DefenderMarker({ actor }) {
  const p = normalizedToWorld(actor);
  return (
    <group position={[p.x, 0, p.z]}>
      <DiscMarker color={COLORS.defender} position={[0, 0.12, 0]} />
      <mesh position={[0, 0.27, 0]} rotation={[0, Math.PI / 4, 0]}>
        <boxGeometry args={[1.25, 0.08, 0.18]} />
        <meshBasicMaterial color={COLORS.ring} />
      </mesh>
      <mesh position={[0, 0.28, 0]} rotation={[0, -Math.PI / 4, 0]}>
        <boxGeometry args={[1.25, 0.08, 0.18]} />
        <meshBasicMaterial color={COLORS.ring} />
      </mesh>
    </group>
  );
}

function GoalieMarker({ actor }) {
  const p = normalizedToWorld(actor);
  return (
    <group position={[p.x, 0, p.z]}>
      <mesh position={[0, 0.16, 0]}>
        <boxGeometry args={[1.1, 0.32, 1.25]} />
        <meshBasicMaterial color={COLORS.goalie} />
      </mesh>
      <mesh position={[0, 0.34, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.78, 0.04, 8, 40]} />
        <meshBasicMaterial color={COLORS.defender} />
      </mesh>
      <Label position={[0, 0.78, 0]} compact>G</Label>
    </group>
  );
}

function PuckMarker({ actor }) {
  const p = normalizedToWorld(actor);
  return (
    <group position={[p.x, 0, p.z]}>
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.28, 0.28, 0.12, 24]} />
        <meshBasicMaterial color={COLORS.puck} />
      </mesh>
      <mesh position={[0, 0.18, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.34, 0.025, 8, 32]} />
        <meshBasicMaterial color={COLORS.ring} />
      </mesh>
    </group>
  );
}

function TextMarker({ actor }) {
  const p = normalizedToWorld(actor);
  const label = actor.label || actor.tag || actor.id;
  return <Label position={[p.x, 0.7, p.z]}>{label}</Label>;
}

function ActorMarker({ actor }) {
  if (!actor || typeof actor.x !== "number" || typeof actor.y !== "number") return null;
  if (actor.kind === "player") return <PlayerMarker actor={actor} />;
  if (actor.kind === "teammate") return <TeammateMarker actor={actor} />;
  if (actor.kind === "defender") return <DefenderMarker actor={actor} />;
  if (actor.kind === "goalie") return <GoalieMarker actor={actor} />;
  if (actor.kind === "puck") return <PuckMarker actor={actor} />;
  if (actor.kind === "text" || actor.kind === "number") return <TextMarker actor={actor} />;
  return null;
}

function Scene({ scenario, rinkPolicy }) {
  return (
    <>
      <CameraRig view={rinkPolicy.view} />
      <color attach="background" args={["#0f172a"]} />
      <Boards />
      <RinkMarkings hideZoneLines={rinkPolicy.hideZoneLines} />
      {(scenario.actors || []).map((actor) => (
        <ActorMarker key={actor.id} actor={actor} />
      ))}
    </>
  );
}

export default function Scenario3DStage({ scenario }) {
  const webglSupported = useMemo(() => canUseWebGL(), []);
  const rinkPolicy = useMemo(
    () => rinkRenderFor(scenario?.stage || { view: "full" }, levelsOf(scenario)),
    [scenario]
  );

  if (!webglSupported) {
    return (
      <div style={{ minHeight: 320, display: "grid", placeItems: "center" }}>
        WebGL is not supported on this device, so the 3D scenario preview cannot run.
      </div>
    );
  }

  return (
    <div style={{ minHeight: 420, height: "min(78vh, 760px)", width: "100%" }}>
      <Canvas frameloop="demand" dpr={[1, 1.5]} orthographic>
        <Scene scenario={scenario || { actors: [] }} rinkPolicy={rinkPolicy} />
      </Canvas>
    </div>
  );
}
