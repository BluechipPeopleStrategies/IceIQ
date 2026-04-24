// Shared canvas for every scenario primitive. Wraps the existing IceIQRink
// (600×300 viewBox) with a normalized-coords overlay where actors are
// plotted and primitives draw their interaction layers.
//
// Primitives don't render the rink themselves — they receive the SVG
// coord-conversion helpers and a ref to the overlay <svg>.

import { useRef } from "react";
import IceIQRink from "../IceIQRink.jsx";
import { RINK_W, RINK_H, denorm } from "./schema.js";
import { C } from "../shared.jsx";

const ACTOR_COLORS = {
  player:   { fill: "#185FA5", stroke: "#fff" },     // YOU — blue
  teammate: { fill: "#1D9E75", stroke: "#fff" },     // green
  defender: { fill: "#A32D2D", stroke: "#fff" },     // red
  goalie:   { fill: "#2C2C2A", stroke: "#fff" },     // dark
  puck:     { fill: "#0a0a0a", stroke: "#fff" },     // black
};

function ActorMarker({ actor }) {
  const p = denorm(actor);
  const palette = ACTOR_COLORS[actor.kind] || ACTOR_COLORS.player;
  const isPuck = actor.kind === "puck";
  return (
    <g transform={`translate(${p.x},${p.y})`}>
      {isPuck ? (
        <ellipse cx="0" cy="1" rx="9" ry="3.5" fill={palette.fill} stroke={palette.stroke} strokeWidth="1.2"/>
      ) : (
        <circle cx="0" cy="0" r="11" fill={palette.fill} stroke={palette.stroke} strokeWidth="1.5"/>
      )}
      {actor.label && (
        <text x="0" y={isPuck ? -10 : -16} textAnchor="middle" fill="#fff" fontSize="10" fontWeight="800"
          style={{ textShadow: "0 1px 2px rgba(0,0,0,.65)", paintOrder: "stroke fill" }}>
          {actor.label}
        </text>
      )}
    </g>
  );
}

/**
 * @param {Object} props
 * @param {import("./schema.js").Stage} props.stage
 * @param {import("./schema.js").Actor[]} props.actors
 * @param {(svgPoint: (e: PointerEvent) => {x:number,y:number}) => React.ReactNode} props.children
 *        Render-prop: the primitive layer. Receives a helper that converts
 *        a DOM event to normalized 0..1 rink coords.
 */
export default function RinkStage({ stage, actors, children }) {
  const svgRef = useRef(null);

  // Convert a DOM event into normalized 0..1 rink coords. Primitives use
  // this for hit-testing and drag tracking — they never see pixel coords.
  function svgPoint(e) {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    pt.y = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const local = pt.matrixTransform(ctm.inverse());
    return { x: local.x / RINK_W, y: local.y / RINK_H };
  }

  return (
    <div style={{
      position: "relative", borderRadius: 10, overflow: "hidden",
      border: `1px solid ${C.border}`, background: C.bgCard, marginBottom: ".75rem",
    }}>
      <IceIQRink view={stage.view} zone={stage.zone} markers={[]} />
      <svg ref={svgRef}
        viewBox={`0 0 ${RINK_W} ${RINK_H}`}
        preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        {/* Actors plotted underneath the primitive's interactive layer. */}
        {actors.map(a => <ActorMarker key={a.id} actor={a}/>)}
        {/* Primitive renders over the actors. */}
        {typeof children === "function" ? children(svgPoint) : children}
      </svg>
    </div>
  );
}
