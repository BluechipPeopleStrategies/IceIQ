// Shared canvas for every scenario primitive. Wraps the existing RinkReadsRink
// (600×300 viewBox) with a normalized-coords overlay where actors are
// plotted and primitives draw their interaction layers.
//
// Primitives don't render the rink themselves — they receive the SVG
// coord-conversion helpers and a ref to the overlay <svg>.

import { useEffect, useMemo, useRef, useState } from "react";
import RinkReadsRink from "../RinkReadsRink.jsx";
import { RINK_W, RINK_H, denorm } from "./schema.js";
import { C } from "../shared.jsx";

// Mirror RinkReadsRink's internal viewBox math so the overlay coord system
// matches the rink's. Without this the overlay sits in a 0..600 / 0..300
// window while the rink crops to a half-view, and actors appear shifted.
function computeViewBox(view) {
  const pad = 15; // RinkReadsRink uses 1.5 * M = 15
  const w = RINK_W, h = RINK_H;
  if (view === "left")    return `${-pad} ${-pad} ${w / 2 + pad * 2} ${h + pad * 2}`;
  if (view === "right")   return `${w / 2 - pad} ${-pad} ${w / 2 + pad * 2} ${h + pad * 2}`;
  if (view === "neutral") {
    // LEFT_BLUE_X = 213, RIGHT_BLUE_X = 387 from RinkReadsRink dimensions
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
  goalie:   { fill: "#51607A", stroke: "#fff", text: "#fff" },
  puck:     { fill: "#0a0a0a", stroke: "#fff", text: "#fff" },
};

// Subtle drop shadow under every marker — same filter for everyone, gives
// the actors a little lift off the ice without becoming a video-game mood.
const SHADOW_FILTER_ID = "rinkstage-actor-shadow";
const HIGHLIGHT_FILTER_ID = "rinkstage-actor-highlight";

function StageDefs() {
  return (
    <defs>
      <filter id={SHADOW_FILTER_ID} x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="1.2"/>
        <feOffset dx="0" dy="1.2"/>
        <feComponentTransfer><feFuncA type="linear" slope="0.55"/></feComponentTransfer>
        <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id={HIGHLIGHT_FILTER_ID} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2.5"/>
        <feMerge><feMergeNode/><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
  );
}

function ActorMarker({ actor, highlight, hideTag, offset, ageStyle = "playbook", goalieFill }) {
  const p = denorm(actor);
  if (offset) { p.x += offset.x; p.y += offset.y; }   // nudge a carried puck to the carrier's edge
  // Goalie color follows its team: OUR goalie (we're defending) reads as our
  // blue, the OPPOSING goalie (we're attacking) reads as opponent black. The
  // square silhouette still distinguishes it from skaters, so color is free
  // to carry team identity.
  const palette = (actor.kind === "goalie" && goalieFill)
    ? { ...ACTOR_COLORS.goalie, fill: goalieFill }
    : (ACTOR_COLORS[actor.kind] || ACTOR_COLORS.player);
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

  // Position tags (LW/RW/D…) are hidden for the youngest bands (U7/U9), where
  // play is half-ice and the markers are "just players".
  const positionTag = hideTag ? "" : (actor.tag || "");

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
    <g transform={`translate(${p.x},${p.y})`}
      filter={`url(#${highlight ? HIGHLIGHT_FILTER_ID : SHADOW_FILTER_ID})`}>
      {/* Highlight ring under the body — only when this actor is being
          flagged (e.g. the defender who intercepted a pass). */}
      {highlight && (
        <circle cx="0" cy="0" r="20" fill="none"
          stroke="#ef4444" strokeWidth="2.4" strokeDasharray="3 3" opacity="0.95">
          <animate attributeName="r" values="18;22;18" dur="0.8s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.95;0.45;0.95" dur="0.8s" repeatCount="indefinite"/>
        </circle>
      )}
      {stickLine}
      {/* GOALIE — playbook: plain square; friendly: rounded "pad" block with
          little leg pads, clearly distinct from skater circles. */}
      {actor.kind === "goalie" && (
        ageStyle === "playbook" ? (
          <>
            <rect x="-11" y="-11" width="22" height="22" rx="3"
              fill={palette.fill} stroke={palette.stroke} strokeWidth="1.6"/>
            <text x="0" y="4" textAnchor="middle" fill={palette.text}
              fontSize="11" fontWeight="800" style={labelStyle}>G</text>
          </>
        ) : (
          <>
            {/* leg pads peeking below the body */}
            <rect x="-9" y="6" width="7" height="9" rx="3" fill={palette.fill} stroke={palette.stroke} strokeWidth="1.2"/>
            <rect x="2" y="6" width="7" height="9" rx="3" fill={palette.fill} stroke={palette.stroke} strokeWidth="1.2"/>
            {/* body */}
            <rect x="-11" y="-13" width="22" height="24" rx="8"
              fill={palette.fill} stroke={palette.stroke} strokeWidth="1.8"/>
            <text x="0" y="3" textAnchor="middle" fill={palette.text}
              fontSize="12" fontWeight="800" style={labelStyle}>G</text>
          </>
        )
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

      {/* PLAYER (YOU) — playbook: smaller plain circle (r=12); friendly:
          doubled-ring filled circle (r=14) so the first-person is
          unmistakable. Larger than other markers. Position tag inside. */}
      {actor.kind === "player" && (
        <>
          <circle cx="0" cy="0" r={ageStyle === "playbook" ? 12 : 14} fill={palette.fill}
            stroke="#fff" strokeWidth="1.6"/>
          {ageStyle !== "playbook" && (
            <circle cx="0" cy="0" r="17" fill="none" stroke="#fff" strokeWidth="1.6"/>
          )}
          {positionTag && (
            <text x="0" y="4" textAnchor="middle" fill={palette.text}
              fontSize="11" fontWeight="800" style={labelStyle}>{positionTag}</text>
          )}
        </>
      )}

      {/* PUCK — a clean round disc (clearer for young ages than the thin
          perspective ellipse, which read as a smudge at small size). */}
      {actor.kind === "puck" && (
        <>
          <circle cx="0" cy="0" r="6" fill={palette.fill} stroke={palette.stroke} strokeWidth="1.8"/>
          <ellipse cx="0" cy="-2" rx="3" ry="1.4" fill="#fff" opacity="0.3"/>
        </>
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
export default function RinkStage({ stage, actors, levels, scanWindow, highlightIds, hiddenIds, children }) {
  const highlightSet = useMemo(() => new Set(Array.isArray(highlightIds) ? highlightIds : []), [highlightIds]);
  // Actors a primitive renders itself (e.g. draggable place tokens) — skip
  // them in the static layer so they aren't drawn twice.
  const hiddenSet = useMemo(() => new Set(Array.isArray(hiddenIds) ? hiddenIds : []), [hiddenIds]);

  // Youngest bands play half-ice; markers are "just players", no position tags.
  const hideTags = useMemo(() => {
    const ls = Array.isArray(levels) ? levels : [];
    return ls.some(l => /^U7\b|^U9\b/.test(String(l)));
  }, [levels]);

  // Diagram tone scales with age: U7/U9 keep the friendly markers; U11+ render
  // austere "X's-and-O's" playbook (thinner strokes, plain goalie box, no
  // decorative double-ring) so a 14-year-old gets a chalk-talk, not a cartoon.
  const ageStyle = useMemo(() => {
    const ls = Array.isArray(levels) ? levels : [];
    return ls.some(l => /^U7\b|^U9\b/.test(String(l))) ? "friendly" : "playbook";
  }, [levels]);

  // Goalie team color by zone: def-zone = OUR net (our blue), off-zone =
  // their net (opponent black). Neutral keeps the team-agnostic slate.
  const goalieFill = stage.zone === "def-zone" ? "#0F4C8C"
                   : stage.zone === "off-zone" ? "#1a1a1a"
                   : "#51607A";

  // Plain-language zone label so the player never misreads which end they're
  // in. Tone scales with age (younger bands get the simplest words).
  const zoneLabel = useMemo(() => {
    const young = (Array.isArray(levels) ? levels : []).some(l => /^U7\b|^U9\b/.test(String(l)));
    if (stage.zone === "def-zone") return young ? "OUR END" : "DEFENDING ZONE";
    if (stage.zone === "off-zone") return young ? "ATTACK END" : "ATTACKING ZONE";
    if (stage.zone === "neutral")  return young ? "MIDDLE" : "NEUTRAL ZONE";
    return null;
  }, [stage.zone, levels]);
  // Blue for our end, amber for the attack end, slate for the middle.
  const zoneAccent = stage.zone === "def-zone" ? "#3b82f6"
                   : stage.zone === "off-zone" ? "#f59e0b"
                   : "#94a3b8";

  // When the puck sits on top of a skater (the carrier), nudge it to that
  // skater's lower-right edge so it reads as "this player has the puck"
  // instead of muddying the marker.
  const puckOffsets = useMemo(() => {
    const map = {};
    const skaters = actors.filter(a => a.kind === "player" || a.kind === "teammate" || a.kind === "defender");
    for (const pk of actors.filter(a => a.kind === "puck")) {
      let best = null, bestD = Infinity;
      for (const sk of skaters) {
        const d = Math.hypot((pk.x - sk.x) * RINK_W, (pk.y - sk.y) * RINK_H);
        if (d < bestD) { bestD = d; best = sk; }
      }
      if (best && bestD < 24) {
        const off = (best.kind === "player" ? 17 : 11) + 6;
        map[pk.id] = { x: off * 0.72, y: off * 0.69 };
      }
    }
    return map;
  }, [actors]);
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
    let list = hiddenSet.size ? actors.filter(a => !hiddenSet.has(a.id)) : actors;
    if (scanElapsed && hideKinds) list = list.filter(a => !hideKinds.has(a.kind));
    return list;
  }, [actors, scanElapsed, hideKinds, hiddenSet]);

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
      <RinkReadsRink view={stage.view} zone={stage.zone} markers={[]} />
      {/* Zone badge — names the end of the ice on-screen so the read can't
          start with a misread of which zone the player is in. */}
      {zoneLabel && (
        <div style={{
          position: "absolute", top: 8, left: 8, zIndex: 2,
          display: "flex", alignItems: "center", gap: ".35rem",
          padding: ".2rem .5rem", borderRadius: 999,
          background: "rgba(11,18,32,.78)", border: `1px solid ${zoneAccent}`,
          fontSize: 10, fontWeight: 800, letterSpacing: ".07em",
          color: "#e2e8f0", pointerEvents: "none",
          boxShadow: "0 1px 4px rgba(0,0,0,.4)",
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: "50%",
            background: zoneAccent, flexShrink: 0,
          }}/>
          {zoneLabel}
        </div>
      )}
      <svg ref={svgRef}
        viewBox={viewBox}
        preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <StageDefs/>
        {/* Actors plotted underneath the primitive's interactive layer.
            Filtered by the scan-then-hide drill when active. */}
        {visibleActors.map(a => (
          <ActorMarker key={a.id} actor={a} highlight={highlightSet.has(a.id)}
            hideTag={hideTags} offset={puckOffsets[a.id]} ageStyle={ageStyle}
            goalieFill={goalieFill}/>
        ))}
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
      <RinkLegend actors={actors} goalieFill={goalieFill} zone={stage.zone}/>
    </div>
  );
}

// Tiny legend strip rendered under the rink — only includes glyphs that
// actually appear in this scenario's actor list, so it stays compact.
function RinkLegend({ actors, goalieFill, zone }) {
  const kinds = new Set(actors.map(a => a.kind));
  const items = [];
  if (kinds.has("player"))   items.push({ glyph: "double-circle", text: "you"      });
  if (kinds.has("teammate")) items.push({ glyph: "circle",        text: "your team"});
  if (kinds.has("defender")) items.push({ glyph: "x",             text: "opponents"});
  if (kinds.has("goalie"))   items.push({ glyph: "square",        text: zone === "off-zone" ? "their goalie" : "your goalie", fill: goalieFill });
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
          <LegendGlyph kind={it.glyph} fill={it.fill}/>
          <span>{it.text}</span>
        </span>
      ))}
    </div>
  );
}

function LegendGlyph({ kind, fill }) {
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
        <rect x="-6.5" y="-6.5" width="13" height="13" rx="4.5" fill={fill || "#51607A"} stroke="#fff" strokeWidth="1.2"/>
      )}
      {kind === "puck" && (
        <circle cx="0" cy="0" r="4" fill="#0a0a0a" stroke="#fff" strokeWidth="1.2"/>
      )}
    </svg>
  );
}
