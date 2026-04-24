// Shared canvas for every scenario primitive. Wraps the existing IceIQRink
// (600×300 viewBox) with a normalized-coords overlay where actors are
// plotted and primitives draw their interaction layers.
//
// Primitives don't render the rink themselves — they receive the SVG
// coord-conversion helpers and a ref to the overlay <svg>.

import { useEffect, useMemo, useRef, useState } from "react";
import IceIQRink from "../IceIQRink.jsx";
import { RINK_W, RINK_H, denorm } from "./schema.js";
import { C } from "../shared.jsx";

// Mirror IceIQRink's internal viewBox math so the overlay coord system
// matches the rink's. Without this the overlay sits in a 0..600 / 0..300
// window while the rink crops to a half-view, and actors appear shifted.
function computeViewBox(view) {
  const pad = 15; // IceIQRink uses 1.5 * M = 15
  const w = RINK_W, h = RINK_H;
  if (view === "left")    return `${-pad} ${-pad} ${w / 2 + pad * 2} ${h + pad * 2}`;
  if (view === "right")   return `${w / 2 - pad} ${-pad} ${w / 2 + pad * 2} ${h + pad * 2}`;
  if (view === "neutral") {
    // LEFT_BLUE_X = 213, RIGHT_BLUE_X = 387 from IceIQRink dimensions
    return `${213 - pad} ${-pad} ${(387 - 213) + pad * 2} ${h + pad * 2}`;
  }
  return `${-pad} ${-pad} ${w + pad * 2} ${h + pad * 2}`;
}

// Playbook conventions — distinguishable by SHAPE, not color, so the
// scene reads correctly when printed black-and-white or in a colorblind
// mode. Color is preserved as secondary signal where it helps.
//
//   player   (YOU)        — filled circle with DOUBLED ring + "YOU"
//   teammate (home)       — filled circle with single white ring
//   defender (opponent)   — circle with an X drawn through it (playbook X)
//   goalie                — rounded square (distinct silhouette)
//   puck                  — ellipse with white outline
//
// Color stays for secondary readability but every kind is distinct
// without it.

const ACTOR_COLORS = {
  player:   { fill: "#0F4C8C", stroke: "#fff", text: "#fff" },
  teammate: { fill: "#0F4C8C", stroke: "#fff", text: "#fff" },
  defender: { fill: "#1a1a1a", stroke: "#fff", text: "#fff" },
  goalie:   { fill: "#3a3a3a", stroke: "#fff", text: "#fff" },
  puck:     { fill: "#0a0a0a", stroke: "#fff", text: "#fff" },
};

function ActorMarker({ actor }) {
  const p = denorm(actor);
  const palette = ACTOR_COLORS[actor.kind] || ACTOR_COLORS.player;
  const labelStyle = {
    pointerEvents: "none",
    textShadow: "0 1px 2px rgba(0,0,0,.85), 0 0 4px rgba(0,0,0,.85)",
    paintOrder: "stroke fill",
  };

  // Caption position (above marker) — different glyph types want
  // different vertical offsets so the label clears the body cleanly.
  const captionY = actor.kind === "puck" ? -10
                 : actor.kind === "goalie" ? -14
                 : actor.kind === "player" ? -22
                 : -16;

  const positionTag = actor.tag || "";

  // Optional stick line — small line from the marker toward `facing`.
  // Adds tactical realism without rewriting the marker. Only shown for
  // skater kinds (player / teammate / defender), not goalies/pucks.
  const showStick = actor.facing &&
    (actor.kind === "player" || actor.kind === "teammate" || actor.kind === "defender");
  let stickLine = null;
  if (showStick) {
    const fp = denorm(actor.facing);
    const dx = fp.x - p.x, dy = fp.y - p.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0.5) {
      // Stick reaches ~16px out from the body in the facing direction.
      const STICK_LEN = 16;
      const ex = (dx / len) * STICK_LEN;
      const ey = (dy / len) * STICK_LEN;
      const bodyR = actor.kind === "player" ? 14 : 11;
      const sx = (dx / len) * (bodyR + 1);
      const sy = (dy / len) * (bodyR + 1);
      stickLine = (
        <line x1={sx} y1={sy} x2={sx + ex} y2={sy + ey}
          stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.85"/>
      );
    }
  }

  return (
    <g transform={`translate(${p.x},${p.y})`}>
      {stickLine}
      {/* GOALIE — rounded square */}
      {actor.kind === "goalie" && (
        <>
          <rect x="-12" y="-12" width="24" height="24" rx="4"
            fill={palette.fill} stroke={palette.stroke} strokeWidth="1.6"/>
          <text x="0" y="4" textAnchor="middle" fill={palette.text}
            fontSize="11" fontWeight="800" style={labelStyle}>G</text>
        </>
      )}

      {/* DEFENDER — X-marked circle (playbook opponent symbol). Hollow
          ring + thick X reads as "other team" without relying on red. */}
      {actor.kind === "defender" && (
        <>
          <circle cx="0" cy="0" r="11" fill={palette.fill}
            stroke={palette.stroke} strokeWidth="1.6"/>
          <line x1="-6" y1="-6" x2="6" y2="6"
            stroke={palette.stroke} strokeWidth="2.4" strokeLinecap="round"/>
          <line x1="-6" y1="6" x2="6" y2="-6"
            stroke={palette.stroke} strokeWidth="2.4" strokeLinecap="round"/>
        </>
      )}

      {/* TEAMMATE — solid filled circle (playbook home symbol). Position
          tag is rendered inside the circle when present. */}
      {actor.kind === "teammate" && (
        <>
          <circle cx="0" cy="0" r="11" fill={palette.fill}
            stroke={palette.stroke} strokeWidth="1.6"/>
          {positionTag && (
            <text x="0" y="4" textAnchor="middle" fill={palette.text}
              fontSize="10" fontWeight="800" style={labelStyle}>
              {positionTag}
            </text>
          )}
        </>
      )}

      {/* PLAYER (YOU) — DOUBLED-ring filled circle so the first-person is
          unmistakable. Larger than other markers. Position tag inside. */}
      {actor.kind === "player" && (
        <>
          <circle cx="0" cy="0" r="14" fill={palette.fill}
            stroke="#fff" strokeWidth="1.6"/>
          <circle cx="0" cy="0" r="17" fill="none"
            stroke="#fff" strokeWidth="1.6"/>
          {positionTag && (
            <text x="0" y="4" textAnchor="middle" fill={palette.text}
              fontSize="11" fontWeight="800" style={labelStyle}>
              {positionTag}
            </text>
          )}
        </>
      )}

      {/* PUCK */}
      {actor.kind === "puck" && (
        <ellipse cx="0" cy="1" rx="9" ry="3.5"
          fill={palette.fill} stroke={palette.stroke} strokeWidth="1.5"/>
      )}

      {/* Caption above marker — author-driven (e.g. "YOU", "OPEN") */}
      {actor.label && (
        <text x="0" y={captionY} textAnchor="middle" fill="#fff"
          fontSize="10" fontWeight="800" style={labelStyle}>
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
export default function RinkStage({ stage, actors, scanWindow, children }) {
  const svgRef = useRef(null);
  const viewBox = useMemo(() => computeViewBox(stage.view), [stage.view]);

  // IntelliGym scan-then-hide drill. Show the full scene for showMs;
  // after that, drop actors whose kind appears in hideKinds. Player must
  // answer from memory.
  const [scanElapsed, setScanElapsed] = useState(false);
  useEffect(() => {
    if (!scanWindow || !scanWindow.showMs) return;
    setScanElapsed(false);
    const id = setTimeout(() => setScanElapsed(true), scanWindow.showMs);
    return () => clearTimeout(id);
  }, [scanWindow]);
  const hideKinds = scanWindow && Array.isArray(scanWindow.hideKinds)
    ? new Set(scanWindow.hideKinds) : null;
  const visibleActors = useMemo(() => {
    if (!scanElapsed || !hideKinds) return actors;
    return actors.filter(a => !hideKinds.has(a.kind));
  }, [actors, scanElapsed, hideKinds]);

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
        viewBox={viewBox}
        preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        {/* Actors plotted underneath the primitive's interactive layer.
            Filtered by the scan-then-hide drill when active. */}
        {visibleActors.map(a => <ActorMarker key={a.id} actor={a}/>)}
        {scanElapsed && hideKinds && hideKinds.size > 0 && (
          <text x="50%" y="20" textAnchor="middle" fill="#eab308"
            fontSize="11" fontWeight="800" letterSpacing="0.06em"
            style={{ textShadow: "0 1px 2px rgba(0,0,0,.85)", pointerEvents: "none" }}>
            FROM MEMORY
          </text>
        )}
        {/* Primitive renders over the actors. */}
        {typeof children === "function" ? children(svgPoint) : children}
      </svg>
      <RinkLegend actors={actors}/>
    </div>
  );
}

// Tiny legend strip rendered under the rink — only includes glyphs that
// actually appear in this scenario's actor list, so it stays compact.
function RinkLegend({ actors }) {
  const kinds = new Set(actors.map(a => a.kind));
  const items = [];
  if (kinds.has("player"))   items.push({ glyph: "double-circle", text: "you"      });
  if (kinds.has("teammate")) items.push({ glyph: "circle",        text: "your team"});
  if (kinds.has("defender")) items.push({ glyph: "x",             text: "opponents"});
  if (kinds.has("goalie"))   items.push({ glyph: "square",        text: "goalie"   });
  if (kinds.has("puck"))     items.push({ glyph: "puck",          text: "puck"     });
  return (
    <div style={{
      display: "flex", gap: "1rem", justifyContent: "center", alignItems: "center",
      padding: ".4rem .6rem", background: "rgba(11,18,32,.6)",
      borderTop: `1px solid ${C.border}`, fontSize: 10,
      letterSpacing: ".06em", textTransform: "uppercase",
      color: C.dimmer, fontWeight: 700,
    }}>
      {items.map(it => (
        <span key={it.text} style={{ display: "flex", alignItems: "center", gap: ".4rem" }}>
          <LegendGlyph kind={it.glyph}/>
          <span>{it.text}</span>
        </span>
      ))}
    </div>
  );
}

function LegendGlyph({ kind }) {
  const W = 18, H = 18;
  return (
    <svg width={W} height={H} viewBox="-10 -10 20 20" style={{ flexShrink: 0 }}>
      {kind === "double-circle" && (
        <>
          <circle cx="0" cy="0" r="6" fill="#0F4C8C" stroke="#fff" strokeWidth="1.2"/>
          <circle cx="0" cy="0" r="8.5" fill="none" stroke="#fff" strokeWidth="1.2"/>
        </>
      )}
      {kind === "circle" && (
        <circle cx="0" cy="0" r="6" fill="#0F4C8C" stroke="#fff" strokeWidth="1.2"/>
      )}
      {kind === "x" && (
        <>
          <circle cx="0" cy="0" r="6" fill="#1a1a1a" stroke="#fff" strokeWidth="1.2"/>
          <line x1="-3.2" y1="-3.2" x2="3.2" y2="3.2" stroke="#fff" strokeWidth="1.6" strokeLinecap="round"/>
          <line x1="-3.2" y1="3.2" x2="3.2" y2="-3.2" stroke="#fff" strokeWidth="1.6" strokeLinecap="round"/>
        </>
      )}
      {kind === "square" && (
        <rect x="-6.5" y="-6.5" width="13" height="13" rx="2.5" fill="#3a3a3a" stroke="#fff" strokeWidth="1.2"/>
      )}
      {kind === "puck" && (
        <ellipse cx="0" cy="0.5" rx="6" ry="2.4" fill="#0a0a0a" stroke="#fff" strokeWidth="1.2"/>
      )}
    </svg>
  );
}
