import { useMemo, Component } from "react";

// World coords share the IceIQRink convention: 600 × 300 SVG units = 60m × 30m,
// origin top-left, 1 unit = 0.1 m. Heights (z) use the same scale: a 1.7 m
// skater is z=17. Camera sits at eye height; markers stand on the ice (z=0).

const RINK = { length: 600, width: 300, boardsHeight: 12 };
const SCREEN = { w: 600, h: 380, horizonY: 180, focal: 320 };

const COLORS = {
  ice: "#EAF3FB",
  iceFar: "#BFD6E8",
  boards: "#1A2638",
  boardsRail: "#FCE36F",
  crowd: "#1B1F2D",
  crowdHighlight: "#2C3349",
  sky: "#0F1626",
  sponsor: "#0C447C",
  sponsorText: "#FFFFFF",
  attacker: "#E24B4A",
  defender: "#262626",
  teammate: "#1D9E75",
  player: "#185FA5",
  goalie: "#5A4E3A",
  shadow: "rgba(20,30,45,0.35)",
  glove: "#1F2937",
  gloveStitch: "#FCE36F",
  helmet: "#0C111B",
  helmetRim: "#1F2937",
  cage: "#9CA3AF",
};

const DEFAULT_CAMERA = { x: 300, y: 240, z: 17, lookAt: { x: 300, y: 60 } };

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function toFiniteNumber(v, fallback = 0) {
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

// Pinhole projection. World (x, y, z) → screen ({sx, sy, scale, depth}).
// Returns null for points behind or near the camera (caller should cull).
function project(world, camera) {
  const fx = camera.lookAt.x - camera.x;
  const fy = camera.lookAt.y - camera.y;
  const flen = Math.hypot(fx, fy);
  if (flen < 0.001) return null;
  const fnx = fx / flen, fny = fy / flen;
  // Right vector: rotate forward 90° clockwise (screen-x grows to player's right).
  const rx = fny, ry = -fnx;

  const dx = world.x - camera.x;
  const dy = world.y - camera.y;
  const dz = (world.z || 0) - camera.z;

  const forward = dx * fnx + dy * fny;
  if (forward <= 1) return null;
  const right = dx * rx + dy * ry;
  const up = dz;

  const sx = (right / forward) * SCREEN.focal + SCREEN.w / 2;
  const sy = SCREEN.horizonY - (up / forward) * SCREEN.focal;
  const scale = SCREEN.focal / forward;
  return { sx, sy, scale, depth: forward };
}

// Project a vertical world segment (z=0 to z=h) → two screen points.
function projectVertical(x, y, h, camera) {
  const foot = project({ x, y, z: 0 }, camera);
  const head = project({ x, y, z: h }, camera);
  return { foot, head };
}

function sanitizeMarker(m, idx) {
  if (!m || typeof m !== "object") return null;
  const x = clamp(toFiniteNumber(m.x, RINK.length / 2), -20, RINK.length + 20);
  const y = clamp(toFiniteNumber(m.y, RINK.width / 2), -20, RINK.width + 20);
  const facing = toFiniteNumber(m.facing, 0); // radians, 0 = facing +y (away from default camera at y=240)
  const type = typeof m.type === "string" ? m.type : "player";
  return {
    type, x, y, facing,
    label: m.label != null ? String(m.label).slice(0, 30) : null,
    correct: !!m.correct,
    targetId: m.targetId != null ? String(m.targetId) : null,
  };
}

function sanitizeCamera(c) {
  if (!c || typeof c !== "object") return DEFAULT_CAMERA;
  const x = clamp(toFiniteNumber(c.x, DEFAULT_CAMERA.x), 0, RINK.length);
  const y = clamp(toFiniteNumber(c.y, DEFAULT_CAMERA.y), 0, RINK.width);
  const z = clamp(toFiniteNumber(c.z, DEFAULT_CAMERA.z), 1, 80);
  const la = c.lookAt && typeof c.lookAt === "object" ? c.lookAt : DEFAULT_CAMERA.lookAt;
  const lx = toFiniteNumber(la.x, DEFAULT_CAMERA.lookAt.x);
  const ly = toFiniteNumber(la.y, DEFAULT_CAMERA.lookAt.y);
  return { x, y, z, lookAt: { x: lx, y: ly } };
}

// Sky + crowd silhouette band. Rendered behind everything.
function Background() {
  return (
    <g>
      <rect x={0} y={0} width={SCREEN.w} height={SCREEN.horizonY} fill={COLORS.sky} />
      {/* Crowd band: sits just above the horizon. Layered rectangles + bumps
          give a "people in seats" silhouette without a full crowd asset. */}
      <rect x={0} y={SCREEN.horizonY - 36} width={SCREEN.w} height={36} fill={COLORS.crowd} />
      <g fill={COLORS.crowdHighlight} opacity="0.55">
        {Array.from({ length: 40 }).map((_, i) => {
          const cx = (i + 0.5) * (SCREEN.w / 40);
          const cy = SCREEN.horizonY - 28 + (i % 3) * 2;
          const r = 3.5 + (i % 4) * 0.6;
          return <circle key={i} cx={cx} cy={cy} r={r} />;
        })}
      </g>
      {/* Rink-edge sponsor panel — sells "this is in a building", not a chalkboard. */}
      <rect x={0} y={SCREEN.horizonY - 8} width={SCREEN.w} height={8} fill={COLORS.sponsor} />
      <text x={SCREEN.w / 2} y={SCREEN.horizonY - 1.5}
        textAnchor="middle" fill={COLORS.sponsorText}
        fontFamily="system-ui" fontWeight="800" fontSize="6" letterSpacing="0.15em">
        ICE-IQ · READ THE PLAY
      </text>
    </g>
  );
}

// Ice surface as a quadrilateral from the four rink corners (z=0). Plus a
// vertical lighting gradient and the visible portions of blue/red lines.
function IceSurface({ camera }) {
  const corners = [
    project({ x: 0, y: 0, z: 0 }, camera),
    project({ x: RINK.length, y: 0, z: 0 }, camera),
    project({ x: RINK.length, y: RINK.width, z: 0 }, camera),
    project({ x: 0, y: RINK.width, z: 0 }, camera),
  ].filter(Boolean);
  if (corners.length < 3) {
    // Camera angle put most of the rink behind us — fallback flat fill so we
    // never render a transparent void.
    return <rect x={0} y={SCREEN.horizonY} width={SCREEN.w} height={SCREEN.h - SCREEN.horizonY} fill={COLORS.ice} />;
  }
  const points = corners.map(c => `${c.sx},${c.sy}`).join(" ");
  return (
    <g>
      <polygon points={points} fill="url(#iceGradient)" />
    </g>
  );
}

// Side and end boards as projected ribbons from z=0 to z=boardsHeight.
function Boards({ camera }) {
  // Sample each board edge in segments so curvature/perspective stays smooth.
  function strip(p1, p2, segments = 12) {
    const top = [], bot = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = p1.x + (p2.x - p1.x) * t;
      const y = p1.y + (p2.y - p1.y) * t;
      const foot = project({ x, y, z: 0 }, camera);
      const head = project({ x, y, z: RINK.boardsHeight }, camera);
      if (foot && head) { top.push(head); bot.push(foot); }
    }
    if (top.length < 2) return null;
    const fwd = top.map(p => `${p.sx},${p.sy}`).join(" ");
    const rev = bot.slice().reverse().map(p => `${p.sx},${p.sy}`).join(" ");
    return `${fwd} ${rev}`;
  }
  const segs = [
    strip({ x: 0, y: 0 }, { x: RINK.length, y: 0 }),                 // top
    strip({ x: RINK.length, y: 0 }, { x: RINK.length, y: RINK.width }), // right
    strip({ x: RINK.length, y: RINK.width }, { x: 0, y: RINK.width }), // bottom
    strip({ x: 0, y: RINK.width }, { x: 0, y: 0 }),                   // left
  ].filter(Boolean);
  return (
    <g>
      {segs.map((pts, i) => (
        <polygon key={i} points={pts} fill={COLORS.boards} stroke={COLORS.boardsRail} strokeWidth="0.6" />
      ))}
    </g>
  );
}

// Blue and red lines as thin polygons on the ice surface. Sample multiple
// points to get the perspective right.
function Lines({ camera }) {
  function paintedStrip(xWorld, color, half = 1.5) {
    const pts = [];
    for (let i = 0; i <= 8; i++) {
      const y = (i / 8) * RINK.width;
      const a = project({ x: xWorld - half, y, z: 0 }, camera);
      const b = project({ x: xWorld + half, y, z: 0 }, camera);
      if (a) pts.push(a);
      if (b) pts.unshift(b); // build left edge then prepend right edge in reverse
    }
    if (pts.length < 4) return null;
    const left = [], right = [];
    for (let i = 0; i <= 8; i++) {
      const y = (i / 8) * RINK.width;
      const a = project({ x: xWorld - half, y, z: 0 }, camera);
      const b = project({ x: xWorld + half, y, z: 0 }, camera);
      if (a) left.push(a);
      if (b) right.push(b);
    }
    if (left.length < 2 || right.length < 2) return null;
    const polyPts = [
      ...left.map(p => `${p.sx},${p.sy}`),
      ...right.slice().reverse().map(p => `${p.sx},${p.sy}`),
    ].join(" ");
    return <polygon points={polyPts} fill={color} opacity="0.85" />;
  }
  return (
    <g>
      {paintedStrip(213, "#1F7ACC")}
      {paintedStrip(300, "#CC1F2B")}
      {paintedStrip(387, "#1F7ACC")}
    </g>
  );
}

// Ice shadow ellipse under a marker. Oval — perspective-foreshortened.
function Shadow({ x, y, scale }) {
  return (
    <ellipse cx={x} cy={y + 0.6 * scale} rx={Math.max(2, 1.4 * scale)} ry={Math.max(0.6, 0.45 * scale)}
      fill={COLORS.shadow} />
  );
}

// Hand-authored skater silhouette. `s` is the projected scale (pixels per
// world unit at marker depth). Drawn from the feet position upward.
function Skater({ marker, foot, head, scale }) {
  const fillMap = {
    attacker: COLORS.attacker, defender: COLORS.defender,
    teammate: COLORS.teammate, player: COLORS.player, coach: "#BA7517",
  };
  const fill = fillMap[marker.type] || COLORS.player;
  const labelMap = { attacker: "X", defender: "D", teammate: "T", player: "O", coach: "C" };
  const label = marker.label || labelMap[marker.type] || "";
  const cx = foot.sx;
  const yFeet = foot.sy;
  const yHead = head.sy;
  const bodyH = yFeet - yHead;
  if (bodyH < 4) return null;
  const helmetR = bodyH * 0.18;
  const torsoTopY = yHead + helmetR * 1.6;
  const torsoBotY = yFeet - helmetR * 0.8;
  const torsoW = helmetR * 1.8;

  // Stick: rooted near the dominant glove (right hip), tip extended along
  // the marker's facing direction. Project a stick-tip world point so the
  // stick foreshortens correctly.
  const stickReachWorld = 14; // 1.4 m blade reach
  const fx = Math.sin(marker.facing);
  const fy = -Math.cos(marker.facing); // facing 0 = up the rink (-y screen)
  const tipWorld = { x: marker.x + fx * stickReachWorld, y: marker.y + fy * stickReachWorld, z: 0 };

  return (
    <g>
      <Shadow x={cx} y={yFeet} scale={scale} />
      {/* Stick — drawn first so the body covers the shaft entering the gloves. */}
      <StickFromMarker marker={marker} bladeWorld={tipWorld} foot={foot} scale={scale} />
      {/* Torso */}
      <ellipse cx={cx} cy={(torsoTopY + torsoBotY) / 2} rx={torsoW / 2} ry={(torsoBotY - torsoTopY) / 2 + 0.5} fill={fill} stroke="#000" strokeOpacity="0.25" strokeWidth="0.3" />
      {/* Helmet */}
      <circle cx={cx} cy={yHead + helmetR} r={helmetR} fill={COLORS.helmet} stroke={COLORS.helmetRim} strokeWidth="0.4" />
      <rect x={cx - helmetR * 0.7} y={yHead + helmetR * 0.6} width={helmetR * 1.4} height={helmetR * 0.55}
        fill={COLORS.cage} opacity="0.7" />
      {/* Jersey number / role tag */}
      {label && (
        <text x={cx} y={(torsoTopY + torsoBotY) / 2 + 1.5} textAnchor="middle"
          fill="#fff" fontFamily="system-ui" fontWeight="800"
          fontSize={Math.max(3, helmetR * 1.1)}>
          {label}
        </text>
      )}
    </g>
  );
}

// Hand-authored goalie silhouette. Bigger pads, leg stance wider.
function GoalieFigure({ marker, foot, head, scale }) {
  const cx = foot.sx;
  const yFeet = foot.sy;
  const yHead = head.sy;
  const bodyH = yFeet - yHead;
  if (bodyH < 4) return null;
  const helmetR = bodyH * 0.20;
  const padW = helmetR * 3.4;
  const padH = bodyH * 0.55;
  return (
    <g>
      <Shadow x={cx} y={yFeet} scale={scale * 1.4} />
      {/* Pads — wide stance */}
      <rect x={cx - padW / 2} y={yFeet - padH} width={padW} height={padH}
        fill={COLORS.goalie} stroke="#000" strokeOpacity="0.3" strokeWidth="0.4" rx={padW * 0.08} />
      {/* Chest protector */}
      <rect x={cx - padW * 0.45} y={yHead + helmetR * 1.6} width={padW * 0.9} height={bodyH * 0.35}
        fill={COLORS.goalie} stroke="#000" strokeOpacity="0.3" strokeWidth="0.4" rx={2} />
      {/* Mask */}
      <circle cx={cx} cy={yHead + helmetR} r={helmetR} fill={COLORS.helmet} stroke={COLORS.helmetRim} strokeWidth="0.5" />
      <path d={`M ${cx - helmetR * 0.7} ${yHead + helmetR * 1.0} Q ${cx} ${yHead + helmetR * 1.4} ${cx + helmetR * 0.7} ${yHead + helmetR * 1.0}`}
        fill="none" stroke={COLORS.cage} strokeWidth="0.5" />
      <circle cx={cx} cy={yHead + helmetR * 0.95} r={helmetR * 0.55}
        fill="none" stroke={COLORS.cage} strokeWidth="0.4" opacity="0.85" />
    </g>
  );
}

function StickFromMarker({ marker, bladeWorld, foot, scale }) {
  // Stick origin — approximate gloves at ~mid-torso height in front of the body.
  const handZ = 11; // 1.1 m
  const handsWorld = { x: marker.x + Math.sin(marker.facing) * 1.5, y: marker.y - Math.cos(marker.facing) * 1.5, z: handZ };
  const hands = project(handsWorld, /* injected via closure-of-parent */ window.__iceiq_pov_camera__ || DEFAULT_CAMERA);
  const blade = project({ ...bladeWorld, z: 0.5 }, window.__iceiq_pov_camera__ || DEFAULT_CAMERA);
  if (!hands || !blade) return null;
  return (
    <g>
      <line x1={hands.sx} y1={hands.sy} x2={blade.sx} y2={blade.sy}
        stroke="#3a2a1a" strokeWidth={Math.max(0.6, scale * 0.15)} strokeLinecap="round" />
      <ellipse cx={blade.sx} cy={blade.sy} rx={Math.max(1.2, scale * 0.6)} ry={Math.max(0.4, scale * 0.18)}
        fill="#1a1a1a" />
    </g>
  );
}

// First-person POV anchor: skater variant — helmet rim arc at top + a gloved
// hand on a stick shaft sweeping into the bottom of the frame.
function SkaterPOVOverlay() {
  return (
    <g pointerEvents="none">
      {/* Helmet rim arc, top of frame */}
      <path d={`M -10 -4 Q ${SCREEN.w / 2} 18 ${SCREEN.w + 10} -4 L ${SCREEN.w + 10} -16 L -10 -16 Z`}
        fill={COLORS.helmet} opacity="0.92" />
      <path d={`M -10 14 Q ${SCREEN.w / 2} 28 ${SCREEN.w + 10} 14`}
        fill="none" stroke={COLORS.helmetRim} strokeWidth="1.2" />
      {/* Stick shaft entering bottom-right at ~30° */}
      <line x1={SCREEN.w - 60} y1={SCREEN.h + 10} x2={SCREEN.w * 0.55} y2={SCREEN.horizonY + 60}
        stroke="#3a2a1a" strokeWidth="6" strokeLinecap="round" opacity="0.95" />
      {/* Bottom glove */}
      <g transform={`translate(${SCREEN.w - 70}, ${SCREEN.h - 28}) rotate(-18)`}>
        <rect x={-22} y={-14} width={44} height={32} rx={6}
          fill={COLORS.glove} stroke="#000" strokeOpacity="0.35" strokeWidth="0.6" />
        <path d="M -16 -8 L -10 6 M -6 -10 L -2 8 M 6 -10 L 4 8 M 14 -8 L 12 8"
          stroke={COLORS.gloveStitch} strokeWidth="0.7" fill="none" opacity="0.8" />
        <rect x={-26} y={2} width={10} height={22} rx={3} fill={COLORS.glove} />
      </g>
    </g>
  );
}

// First-person POV anchor: goalie variant — top of mask cage in upper frame,
// blocker bottom-left, catching trapper bottom-right.
function GoaliePOVOverlay() {
  return (
    <g pointerEvents="none">
      {/* Mask cage curve at top */}
      <path d={`M -10 0 Q ${SCREEN.w / 2} 50 ${SCREEN.w + 10} 0 L ${SCREEN.w + 10} -20 L -10 -20 Z`}
        fill={COLORS.helmet} opacity="0.95" />
      <g stroke={COLORS.cage} strokeWidth="1" fill="none" opacity="0.75">
        {[0, 1, 2, 3, 4, 5].map(i => (
          <path key={i}
            d={`M ${-10 + (SCREEN.w + 20) * (i / 5)} 18 Q ${SCREEN.w / 2} ${30 + i * 6} ${SCREEN.w + 10 - (SCREEN.w + 20) * (i / 5)} 18`} />
        ))}
        {[0, 1, 2, 3].map(i => (
          <line key={`v${i}`}
            x1={(SCREEN.w / 4) * (i + 0.5)} y1={20}
            x2={(SCREEN.w / 4) * (i + 0.5)} y2={42} />
        ))}
      </g>
      {/* Blocker — bottom-left rectangular pad */}
      <g transform={`translate(40, ${SCREEN.h - 10}) rotate(-8)`}>
        <rect x={-30} y={-90} width={60} height={90} rx={6}
          fill={COLORS.goalie} stroke="#000" strokeOpacity="0.4" strokeWidth="0.7" />
        <rect x={-22} y={-82} width={44} height={70} rx={4} fill="none"
          stroke={COLORS.gloveStitch} strokeWidth="0.6" opacity="0.6" />
      </g>
      {/* Trapper — bottom-right round catching glove */}
      <g transform={`translate(${SCREEN.w - 50}, ${SCREEN.h - 30}) rotate(15)`}>
        <path d="M -28 0 Q -34 -36 0 -42 Q 34 -36 28 0 Q 18 18 0 18 Q -18 18 -28 0 Z"
          fill={COLORS.goalie} stroke="#000" strokeOpacity="0.4" strokeWidth="0.7" />
        <path d="M -10 -34 L -10 -10 M 0 -38 L 0 -8 M 10 -34 L 10 -10"
          stroke={COLORS.gloveStitch} strokeWidth="0.6" opacity="0.65" />
      </g>
    </g>
  );
}

class POVErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error("[IceIQPOVRink] Render error:", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ background: "#FAEEDA", color: "#633806", padding: "12px 16px",
          borderRadius: 8, fontSize: 13, lineHeight: 1.5, border: "1px solid #BA7517" }}>
          <strong style={{ display: "block", marginBottom: 4 }}>POV scene couldn't render</strong>
          The scene data has an issue. Question content remains usable.
        </div>
      );
    }
    return this.props.children;
  }
}

function IceIQPOVRinkInner({
  camera = DEFAULT_CAMERA,
  povRole = "skater",       // "skater" | "goalie" — which overlay anchor
  markers = [],
  targets = [],             // [{id, x, y, radius, label, correct}]
  onTargetClick,
  showPrompt = null,        // optional decision-moment string overlay
  className = "",
  style = {},
}) {
  const safeCam = sanitizeCamera(camera);
  // Stash camera so the StickFromMarker helper can read it without prop-drilling.
  if (typeof window !== "undefined") window.__iceiq_pov_camera__ = safeCam;

  const safeMarkers = useMemo(() => {
    const arr = Array.isArray(markers) ? markers : [];
    return arr.map((m, i) => sanitizeMarker(m, i)).filter(Boolean);
  }, [markers]);

  const safeTargets = useMemo(() => {
    const arr = Array.isArray(targets) ? targets : [];
    return arr.map((t, i) => {
      if (!t || typeof t !== "object") return null;
      const x = clamp(toFiniteNumber(t.x, 300), -20, RINK.length + 20);
      const y = clamp(toFiniteNumber(t.y, 150), -20, RINK.width + 20);
      const radius = clamp(toFiniteNumber(t.radius, 25), 5, 80);
      return { ...t, x, y, radius, id: t.id != null ? String(t.id) : `t${i}` };
    }).filter(Boolean);
  }, [targets]);

  // Sort markers by depth (far first) so near players paint over distant ones.
  const projected = safeMarkers
    .map(m => {
      const playerHeight = m.type === "goalie" ? 18 : 17;
      const v = projectVertical(m.x, m.y, playerHeight, safeCam);
      if (!v.foot || !v.head) return null;
      return { marker: m, foot: v.foot, head: v.head, scale: v.foot.scale };
    })
    .filter(Boolean)
    .sort((a, b) => b.foot.depth - a.foot.depth);

  const projectedTargets = safeTargets
    .map(t => {
      const v = project({ x: t.x, y: t.y, z: 0 }, safeCam);
      if (!v) return null;
      return { ...t, sx: v.sx, sy: v.sy, scale: v.scale };
    })
    .filter(Boolean);

  return (
    <svg viewBox={`0 0 ${SCREEN.w} ${SCREEN.h}`} xmlns="http://www.w3.org/2000/svg"
      className={className} style={{ display: "block", width: "100%", ...style }} role="img">
      <title>POV scene from {povRole}</title>
      <defs>
        <linearGradient id="iceGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={COLORS.iceFar} />
          <stop offset="60%" stopColor={COLORS.ice} />
          <stop offset="100%" stopColor="#FFFFFF" />
        </linearGradient>
        <radialGradient id="rinkLight" cx="50%" cy="20%" r="60%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
      </defs>

      <Background />
      <IceSurface camera={safeCam} />
      <Lines camera={safeCam} />
      <Boards camera={safeCam} />
      {/* Ambient light hot-spot — sells "rink lights overhead" */}
      <rect x={0} y={SCREEN.horizonY} width={SCREEN.w} height={SCREEN.h - SCREEN.horizonY} fill="url(#rinkLight)" />

      {/* Tap targets — drawn before players so a target behind a player is partially covered. */}
      {projectedTargets.map((t, i) => (
        <g key={`tg-${i}`} style={{ cursor: onTargetClick ? "pointer" : "default" }}
          onClick={() => onTargetClick && onTargetClick(t)}>
          <ellipse cx={t.sx} cy={t.sy} rx={Math.max(8, t.radius * t.scale * 0.3)} ry={Math.max(4, t.radius * t.scale * 0.12)}
            fill="rgba(29,158,117,0.22)" stroke="#1D9E75" strokeWidth="0.8" strokeDasharray="3 2" />
          {t.label && (
            <text x={t.sx} y={t.sy + 1} textAnchor="middle" fill="#085041" fontSize={Math.max(5, t.scale * 1.5)} fontWeight="700">
              {t.label}
            </text>
          )}
        </g>
      ))}

      {/* Players, far → near so closer skaters cover farther ones. */}
      {projected.map((p, i) => p.marker.type === "goalie"
        ? <GoalieFigure key={`g-${i}`} marker={p.marker} foot={p.foot} head={p.head} scale={p.scale} />
        : <Skater key={`s-${i}`} marker={p.marker} foot={p.foot} head={p.head} scale={p.scale} />)}

      {/* Decision-moment prompt — top-center, semi-transparent panel */}
      {showPrompt && (
        <g pointerEvents="none">
          <rect x={SCREEN.w * 0.1} y={6} width={SCREEN.w * 0.8} height={20} rx={4}
            fill="rgba(15, 22, 38, 0.78)" />
          <text x={SCREEN.w / 2} y={20} textAnchor="middle"
            fill="#FCE36F" fontFamily="system-ui" fontWeight="800" fontSize="10" letterSpacing="0.05em">
            {String(showPrompt).slice(0, 80)}
          </text>
        </g>
      )}

      {/* First-person POV overlay (helmet rim + gloves / mask + pads). */}
      {povRole === "goalie" ? <GoaliePOVOverlay /> : <SkaterPOVOverlay />}
    </svg>
  );
}

export default function IceIQPOVRink(props) {
  return (
    <POVErrorBoundary>
      <IceIQPOVRinkInner {...props} />
    </POVErrorBoundary>
  );
}

export const POV_DEFAULT_CAMERA = DEFAULT_CAMERA;
