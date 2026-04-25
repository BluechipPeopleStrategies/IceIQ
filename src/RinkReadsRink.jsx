import { useMemo, Component } from "react";

const M = 10;

export const RINK_DIMENSIONS = {
  length: 60 * M,
  width: 30 * M,
  cornerRadius: 8.5 * M,
  goalLineFromEnd: 4 * M,
  goalLineToBlue: 17.3 * M,
  centerFaceoffRadius: 4.5 * M,
  endFaceoffRadius: 4.5 * M,
  endFaceoffFromGoalLine: 6 * M,
  endFaceoffFromCenter: 7 * M,
  nzFaceoffFromBlue: 1.5 * M,
  nzFaceoffFromCenter: 7 * M,
  creaseRadius: 1.8 * M,
  netWidth: 1.83 * M,
  netDepth: 1.12 * M,
  trapezoidBaseBoards: 8.5 * M,
  trapezoidBaseGoalLine: 6.7 * M,
  lineWidthBlue: 0.3 * M,
  lineWidthRed: 0.3 * M,
};

const D = RINK_DIMENSIONS;
const CX = D.length / 2;
const CY = D.width / 2;
const LEFT_GOAL_X = D.goalLineFromEnd;
const RIGHT_GOAL_X = D.length - D.goalLineFromEnd;
const LEFT_BLUE_X = LEFT_GOAL_X + D.goalLineToBlue;
const RIGHT_BLUE_X = RIGHT_GOAL_X - D.goalLineToBlue;

const END_FACEOFFS = [
  { x: LEFT_GOAL_X + D.endFaceoffFromGoalLine, y: CY - D.endFaceoffFromCenter },
  { x: LEFT_GOAL_X + D.endFaceoffFromGoalLine, y: CY + D.endFaceoffFromCenter },
  { x: RIGHT_GOAL_X - D.endFaceoffFromGoalLine, y: CY - D.endFaceoffFromCenter },
  { x: RIGHT_GOAL_X - D.endFaceoffFromGoalLine, y: CY + D.endFaceoffFromCenter },
];

const NZ_FACEOFFS = [
  { x: LEFT_BLUE_X + D.nzFaceoffFromBlue, y: CY - D.nzFaceoffFromCenter },
  { x: LEFT_BLUE_X + D.nzFaceoffFromBlue, y: CY + D.nzFaceoffFromCenter },
  { x: RIGHT_BLUE_X - D.nzFaceoffFromBlue, y: CY - D.nzFaceoffFromCenter },
  { x: RIGHT_BLUE_X - D.nzFaceoffFromBlue, y: CY + D.nzFaceoffFromCenter },
];

const COLORS = {
  ice: "#F4FAFF",
  boards: "#1a2638",
  blueLine: "#1F7ACC",
  redLine: "#CC1F2B",
  creaseFill: "#CCE4F5",
  crease: "#1F7ACC",
  goalFill: "#FFE4E6",
  textMuted: "#5F5E5A",
};

const VALID_VIEWS = ["full", "left", "right", "neutral"];
const VALID_MARKER_TYPES = ["attacker", "defender", "teammate", "player", "coach", "goalie", "puck", "text", "number"];
const VALID_LINE_TYPES = ["skate", "pass", "shoot", "handle", "back"];
const VALID_COLORS = ["black", "red", "blue", "green", "amber"];

function toFiniteNumber(v, fallback = 0) {
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function sanitizeView(view) {
  if (typeof view !== "string") return "full";
  return VALID_VIEWS.includes(view) ? view : "full";
}

function sanitizeMarker(m, idx = 0) {
  if (!m || typeof m !== "object") return null;
  let type = typeof m.type === "string" ? m.type : "player";
  if (!VALID_MARKER_TYPES.includes(type)) {
    console.warn(`[RinkReadsRink] Unknown marker type "${m.type}" at index ${idx}, defaulting to "player"`);
    type = "player";
  }
  const x = clamp(toFiniteNumber(m.x, CX), -20, D.length + 20);
  const y = clamp(toFiniteNumber(m.y, CY), -20, D.width + 20);
  const sanitized = { type, x, y };
  if (m.label != null) sanitized.label = String(m.label).slice(0, 30);
  if (m.caption != null) sanitized.caption = String(m.caption).slice(0, 50);
  // `motion` lets a marker animate during replay — array of {x,y} waypoints
  // the marker travels through as replayT goes 0 → 1. Static render uses
  // marker.x/y (which should be motion[0] for consistency).
  if (Array.isArray(m.motion) && m.motion.length >= 2) {
    sanitized.motion = m.motion
      .filter(p => p && typeof p === "object")
      .map(p => ({
        x: clamp(toFiniteNumber(p.x, CX), -20, D.length + 20),
        y: clamp(toFiniteNumber(p.y, CY), -20, D.width + 20),
      }));
  }
  return sanitized;
}

function pointAlongMotion(motion, t) {
  const tt = Math.max(0, Math.min(1, t));
  const segs = motion.length - 1;
  const totalT = tt * segs;
  const segIdx = Math.min(segs - 1, Math.floor(totalT));
  const segT = totalT - segIdx;
  const a = motion[segIdx], b = motion[segIdx + 1];
  return { x: a.x + (b.x - a.x) * segT, y: a.y + (b.y - a.y) * segT };
}

function sanitizeLine(l, idx = 0) {
  if (!l || typeof l !== "object") return null;
  let type = typeof l.type === "string" ? l.type : "skate";
  if (!VALID_LINE_TYPES.includes(type)) {
    console.warn(`[RinkReadsRink] Unknown line type "${l.type}" at index ${idx}, defaulting to "skate"`);
    type = "skate";
  }
  const x1 = clamp(toFiniteNumber(l.x1, 0), -20, D.length + 20);
  const y1 = clamp(toFiniteNumber(l.y1, 0), -20, D.width + 20);
  const x2 = clamp(toFiniteNumber(l.x2, 0), -20, D.length + 20);
  const y2 = clamp(toFiniteNumber(l.y2, 0), -20, D.width + 20);
  if (Math.hypot(x2 - x1, y2 - y1) < 0.5) return null;
  const sanitized = { type, x1, y1, x2, y2 };
  if (l.color && VALID_COLORS.includes(l.color)) sanitized.color = l.color;
  if (l.arrow === false) sanitized.arrow = false;
  return sanitized;
}

function halfRinkPath(side) {
  const r = D.cornerRadius;
  const L = D.length;
  const W = D.width;
  const mid = L / 2;
  if (side === "left") {
    return `M ${mid} 0 L ${r} 0 A ${r} ${r} 0 0 0 0 ${r} L 0 ${W - r} A ${r} ${r} 0 0 0 ${r} ${W} L ${mid} ${W} Z`;
  }
  return `M ${mid} 0 L ${L - r} 0 A ${r} ${r} 0 0 1 ${L} ${r} L ${L} ${W - r} A ${r} ${r} 0 0 1 ${L - r} ${W} L ${mid} ${W} Z`;
}

function fullRinkPath() {
  const r = D.cornerRadius;
  return `M ${r} 0 L ${D.length - r} 0 A ${r} ${r} 0 0 1 ${D.length} ${r} L ${D.length} ${D.width - r} A ${r} ${r} 0 0 1 ${D.length - r} ${D.width} L ${r} ${D.width} A ${r} ${r} 0 0 1 0 ${D.width - r} L 0 ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`;
}

const ZONE_PRESETS = {
  none: null,
  "def-zone": () => (
    <path
      d={`M 0 ${D.cornerRadius} A ${D.cornerRadius} ${D.cornerRadius} 0 0 1 ${D.cornerRadius} 0 L ${LEFT_BLUE_X} 0 L ${LEFT_BLUE_X} ${D.width} L ${D.cornerRadius} ${D.width} A ${D.cornerRadius} ${D.cornerRadius} 0 0 1 0 ${D.width - D.cornerRadius} Z`}
      fill="#AFA9EC" fillOpacity="0.35" stroke="#3C3489" strokeWidth="0.3" strokeDasharray="1.5 1" />
  ),
  "neutral-zone": () => (
    <rect x={LEFT_BLUE_X} y={0} width={RIGHT_BLUE_X - LEFT_BLUE_X} height={D.width}
      fill="#5DCAA5" fillOpacity="0.3" stroke="#0F6E56" strokeWidth="0.3" strokeDasharray="1.5 1" />
  ),
  "off-zone": () => (
    <path
      d={`M ${RIGHT_BLUE_X} 0 L ${D.length - D.cornerRadius} 0 A ${D.cornerRadius} ${D.cornerRadius} 0 0 1 ${D.length} ${D.cornerRadius} L ${D.length} ${D.width - D.cornerRadius} A ${D.cornerRadius} ${D.cornerRadius} 0 0 1 ${D.length - D.cornerRadius} ${D.width} L ${RIGHT_BLUE_X} ${D.width} Z`}
      fill="#F0997B" fillOpacity="0.38" stroke="#993C1D" strokeWidth="0.3" strokeDasharray="1.5 1" />
  ),
  slot: () => (
    <polygon
      points={`${END_FACEOFFS[2].x},${END_FACEOFFS[2].y} ${RIGHT_GOAL_X},${CY - 3 * M} ${RIGHT_GOAL_X},${CY + 3 * M} ${END_FACEOFFS[3].x},${END_FACEOFFS[3].y}`}
      fill="#D4537E" fillOpacity="0.4" stroke="#993556" strokeWidth="0.3" strokeDasharray="1.5 1" />
  ),
  "low-slot": () => (
    <polygon
      points={`${RIGHT_GOAL_X - 4 * M},${CY - 3 * M} ${RIGHT_GOAL_X},${CY - 2 * M} ${RIGHT_GOAL_X},${CY + 2 * M} ${RIGHT_GOAL_X - 4 * M},${CY + 3 * M}`}
      fill="#993556" fillOpacity="0.5" stroke="#4B1528" strokeWidth="0.3" strokeDasharray="1.5 1" />
  ),
  "def-slot": () => (
    <polygon
      points={`${END_FACEOFFS[0].x},${END_FACEOFFS[0].y} ${LEFT_GOAL_X},${CY - 3 * M} ${LEFT_GOAL_X},${CY + 3 * M} ${END_FACEOFFS[1].x},${END_FACEOFFS[1].y}`}
      fill="#D4537E" fillOpacity="0.4" stroke="#993556" strokeWidth="0.3" strokeDasharray="1.5 1" />
  ),
  "points-off": () => (
    <g>
      <rect x={RIGHT_BLUE_X} y={0} width={D.length - RIGHT_BLUE_X - D.cornerRadius / 2}
        height={D.cornerRadius + 2 * M}
        fill="#378ADD" fillOpacity="0.35" stroke="#0C447C" strokeWidth="0.3" strokeDasharray="1.5 1" />
      <rect x={RIGHT_BLUE_X} y={D.width - D.cornerRadius - 2 * M}
        width={D.length - RIGHT_BLUE_X - D.cornerRadius / 2}
        height={D.cornerRadius + 2 * M}
        fill="#378ADD" fillOpacity="0.35" stroke="#0C447C" strokeWidth="0.3" strokeDasharray="1.5 1" />
    </g>
  ),
  "corners-off": () => (
    <g>
      <path d={`M ${RIGHT_GOAL_X} 0 L ${D.length - D.cornerRadius} 0 A ${D.cornerRadius} ${D.cornerRadius} 0 0 1 ${D.length} ${D.cornerRadius} L ${D.length} ${D.cornerRadius + 2 * M} L ${RIGHT_GOAL_X} ${D.cornerRadius + 2 * M} Z`}
        fill="#EF9F27" fillOpacity="0.4" stroke="#854F0B" strokeWidth="0.3" strokeDasharray="1.5 1" />
      <path d={`M ${RIGHT_GOAL_X} ${D.width - D.cornerRadius - 2 * M} L ${D.length} ${D.width - D.cornerRadius - 2 * M} L ${D.length} ${D.width - D.cornerRadius} A ${D.cornerRadius} ${D.cornerRadius} 0 0 1 ${D.length - D.cornerRadius} ${D.width} L ${RIGHT_GOAL_X} ${D.width} Z`}
        fill="#EF9F27" fillOpacity="0.4" stroke="#854F0B" strokeWidth="0.3" strokeDasharray="1.5 1" />
    </g>
  ),
  "corners-def": () => (
    <g>
      <path d={`M 0 ${D.cornerRadius} A ${D.cornerRadius} ${D.cornerRadius} 0 0 1 ${D.cornerRadius} 0 L ${LEFT_GOAL_X} 0 L ${LEFT_GOAL_X} ${D.cornerRadius + 2 * M} L 0 ${D.cornerRadius + 2 * M} Z`}
        fill="#EF9F27" fillOpacity="0.4" stroke="#854F0B" strokeWidth="0.3" strokeDasharray="1.5 1" />
      <path d={`M 0 ${D.width - D.cornerRadius - 2 * M} L ${LEFT_GOAL_X} ${D.width - D.cornerRadius - 2 * M} L ${LEFT_GOAL_X} ${D.width} L ${D.cornerRadius} ${D.width} A ${D.cornerRadius} ${D.cornerRadius} 0 0 1 0 ${D.width - D.cornerRadius} Z`}
        fill="#EF9F27" fillOpacity="0.4" stroke="#854F0B" strokeWidth="0.3" strokeDasharray="1.5 1" />
    </g>
  ),
  "shooting-lane-off": () => (
    <polygon
      points={`${LEFT_BLUE_X},${CY - 4 * M} ${RIGHT_GOAL_X},${CY - 0.5 * M} ${RIGHT_GOAL_X},${CY + 0.5 * M} ${LEFT_BLUE_X},${CY + 4 * M}`}
      fill="#1D9E75" fillOpacity="0.32" stroke="#0F6E56" strokeWidth="0.3" strokeDasharray="1.5 1" />
  ),
  "half-wall-off": () => (
    <rect x={RIGHT_BLUE_X + 3 * M} y={CY - 4 * M} width={3 * M} height={8 * M}
      fill="#BA7517" fillOpacity="0.4" stroke="#412402" strokeWidth="0.3" strokeDasharray="1.5 1" />
  ),
};

function Zone({ zoneKey }) {
  if (!zoneKey || zoneKey === "none") return null;
  const preset = ZONE_PRESETS[zoneKey];
  if (!preset) {
    console.warn(`[RinkReadsRink] Unknown zone "${zoneKey}". Valid zones: ${Object.keys(ZONE_PRESETS).join(", ")}`);
    return null;
  }
  try {
    return preset();
  } catch (err) {
    console.error(`[RinkReadsRink] Error rendering zone "${zoneKey}":`, err);
    return null;
  }
}

function FaceoffCircle({ cx, cy }) {
  const r = D.endFaceoffRadius;
  // Faceoff markings are reference geometry — kids should see the players
  // and the read, not the rink lines. Muted to ~35% so they read as
  // background, not foreground.
  return (
    <g opacity="0.35">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={COLORS.redLine} strokeWidth="0.15" />
      <circle cx={cx} cy={cy} r={0.3 * M} fill={COLORS.redLine} />
      <g stroke={COLORS.redLine} strokeWidth="0.15">
        <line x1={cx - 0.6 * M} y1={cy - r} x2={cx - 0.6 * M} y2={cy - r - 0.6 * M} />
        <line x1={cx + 0.6 * M} y1={cy - r} x2={cx + 0.6 * M} y2={cy - r - 0.6 * M} />
        <line x1={cx - 0.6 * M} y1={cy + r} x2={cx - 0.6 * M} y2={cy + r + 0.6 * M} />
        <line x1={cx + 0.6 * M} y1={cy + r} x2={cx + 0.6 * M} y2={cy + r + 0.6 * M} />
      </g>
    </g>
  );
}

function Crease({ side }) {
  const goalX = side === "left" ? LEFT_GOAL_X : RIGHT_GOAL_X;
  const r = D.creaseRadius;
  const sweep = side === "left" ? 1 : 0;
  return (
    <path
      d={`M ${goalX} ${CY - r} A ${r} ${r} 0 0 ${sweep} ${goalX} ${CY + r} Z`}
      fill={COLORS.creaseFill} fillOpacity="0.5"
      stroke={COLORS.crease} strokeWidth="0.18"
    />
  );
}

function Goal({ side }) {
  const goalX = side === "left" ? LEFT_GOAL_X : RIGHT_GOAL_X;
  const halfW = D.netWidth / 2;
  return (
    <rect
      x={side === "left" ? goalX - D.netDepth : goalX}
      y={CY - halfW}
      width={D.netDepth}
      height={D.netWidth}
      fill={COLORS.goalFill} stroke={COLORS.redLine} strokeWidth="0.2"
    />
  );
}

function Trapezoid({ side }) {
  const goalX = side === "left" ? LEFT_GOAL_X : RIGHT_GOAL_X;
  const endX = side === "left" ? 0 : D.length;
  return (
    <g fill="none" stroke={COLORS.redLine} strokeWidth="0.1">
      <line x1={goalX} y1={CY - D.trapezoidBaseGoalLine / 2}
        x2={endX} y2={CY - D.trapezoidBaseBoards / 2} />
      <line x1={goalX} y1={CY + D.trapezoidBaseGoalLine / 2}
        x2={endX} y2={CY + D.trapezoidBaseBoards / 2} />
    </g>
  );
}

function Marker({ marker, replayT }) {
  const fills = {
    attacker: "#E24B4A", defender: "#2C2C2A", teammate: "#1D9E75",
    player: "#185FA5", coach: "#BA7517",
  };
  const labels = {
    attacker: "X", defender: "D", teammate: "T", player: "O", coach: "C",
  };
  // YOU/ME render slightly larger so the player can pick out their own
  // position at a glance — every other marker is r=6, YOU is r=7.
  const isYou = marker.label === "YOU" || marker.label === "ME";
  const playerRadius = isYou ? 7 : 6;

  // During replay, markers with a `motion` waypoint list animate along it.
  // Outside replay, render statically at marker.x/y.
  const animated = (replayT != null && Array.isArray(marker.motion) && marker.motion.length >= 2)
    ? pointAlongMotion(marker.motion, replayT) : null;
  const mx = animated ? animated.x : marker.x;
  const my = animated ? animated.y : marker.y;

  if (marker.type === "puck") {
    // Standard display puck dimensions — matches dashboard.html and any
    // other static-puck rendering. Drag-target uses a separate larger
    // red ellipse (rx=10, ry=3.5) for touch UX, NOT a representation puck.
    return (
      <g transform={`translate(${mx}, ${my})`}>
        <ellipse cx={0} cy={0.4} rx={4} ry={1.6} fill="#2C2C2A" stroke="#fff" strokeWidth="0.4" />
      </g>
    );
  }
  if (marker.type === "goalie") {
    return (
      <g transform={`translate(${mx}, ${my})`}>
        <ellipse cx={0} cy={0} rx={4.8} ry={6.2} fill="#444441" stroke="#fff" strokeWidth="0.7" />
        <text x={0} y={1.9} textAnchor="middle" fill="#fff"
          fontSize="5.6" fontWeight="700" fontFamily="system-ui">G</text>
      </g>
    );
  }
  if (marker.type === "text") {
    return (
      <g transform={`translate(${mx}, ${my})`}>
        <text x={0} y={1.8} textAnchor="middle" fill="#2C2C2A"
          fontSize="6.5" fontWeight="700" fontFamily="system-ui">{marker.label || "Text"}</text>
      </g>
    );
  }
  if (marker.type === "number") {
    return (
      <g transform={`translate(${mx}, ${my})`}>
        <circle cx={0} cy={0} r={6} fill="#EEEDFE" stroke="#3C3489" strokeWidth="0.7" />
        <text x={0} y={1.9} textAnchor="middle" fill="#3C3489"
          fontSize="5.6" fontWeight="700" fontFamily="system-ui">{marker.label || "1"}</text>
        {marker.caption && (
          <text x={0} y={11.5} textAnchor="middle" fill={COLORS.textMuted}
            fontSize="4" fontWeight="500" fontFamily="system-ui">{marker.caption}</text>
        )}
      </g>
    );
  }

  const fill = fills[marker.type] || "#185FA5";
  const label = marker.label || labels[marker.type] || "";
  // Defenders get vertical pinstripes so they read as "the other team" at
  // a glance even on a black-and-white screen. Pattern is namespaced per
  // marker so the SVG defs stay self-contained per render.
  const isDefender = marker.type === "defender";
  const patternId = isDefender ? `def-stripes-${marker.x}-${marker.y}` : null;
  return (
    <g transform={`translate(${marker.x}, ${marker.y})`}>
      {isDefender && (
        <defs>
          <pattern id={patternId} patternUnits="userSpaceOnUse" width="2" height="2" patternTransform="rotate(0)">
            <rect width="2" height="2" fill={fill}/>
            <line x1="0" y1="0" x2="0" y2="2" stroke="#5a5a58" strokeWidth="0.6"/>
          </pattern>
        </defs>
      )}
      <circle cx={0} cy={0} r={playerRadius}
        fill={isDefender ? `url(#${patternId})` : fill}
        stroke="#fff" strokeWidth={isYou ? 1.0 : 0.7} />
      <text x={0} y={2} textAnchor="middle" fill="#fff"
        fontSize="5.6" fontWeight="700" fontFamily="system-ui">{label}</text>
      {marker.caption && (
        <text x={0} y={12.5} textAnchor="middle" fill={COLORS.textMuted}
          fontSize="4" fontWeight="500" fontFamily="system-ui">{marker.caption}</text>
      )}
    </g>
  );
}

function Line({ line }) {
  const markerEnd = line.arrow === false ? undefined
    : line.type === "shoot" ? "url(#rinkreads-arrow-red)"
    : line.color === "green" ? "url(#rinkreads-arrow-green)"
    : line.color === "red" ? "url(#rinkreads-arrow-red)"
    : "url(#rinkreads-arrow-black)";

  const stroke = line.type === "shoot" ? "#CC1F2B"
    : line.color === "green" ? "#1D9E75"
    : line.color === "red" ? "#CC1F2B"
    : line.color === "blue" ? "#185FA5"
    : line.color === "amber" ? "#BA7517"
    : "#2C2C2A";

  const dasharray = line.type === "pass" ? "4 2.5" : undefined;
  const strokeWidth = line.type === "shoot" ? 2.4 : 1.6;

  if (line.type === "handle") {
    const { x1, y1, x2, y2 } = line;
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len < 0.5) return null;
    const steps = Math.max(3, Math.floor(len / 4));
    const ux = dx / len, uy = dy / len;
    const nx = -uy, ny = ux;
    let d = `M ${x1} ${y1}`;
    for (let j = 1; j <= steps; j++) {
      const t = j / steps;
      const px = x1 + dx * t;
      const py = y1 + dy * t;
      const amp = j % 2 === 0 ? 1 : -1;
      const cX = px - ux * (len / steps / 2) + nx * amp;
      const cY = py - uy * (len / steps / 2) + ny * amp;
      d += ` Q ${cX} ${cY} ${px} ${py}`;
    }
    return <path d={d} stroke={stroke} strokeWidth={1.1} fill="none"
      strokeLinecap="round" markerEnd={markerEnd} />;
  }
  return (
    <line x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}
      stroke={stroke} strokeWidth={strokeWidth}
      strokeDasharray={dasharray} strokeLinecap="round" markerEnd={markerEnd} />
  );
}

class RinkErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error("[RinkReadsRink] Render error caught:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          background: "#FAEEDA", color: "#633806",
          padding: "12px 16px", borderRadius: "8px",
          fontSize: "13px", lineHeight: 1.5,
          border: "1px solid #BA7517"
        }}>
          <strong style={{ display: "block", marginBottom: 4 }}>Rink couldn't render</strong>
          The diagram data has an issue. Question content remains usable.
          {this.state.error?.message && (
            <code style={{ display: "block", marginTop: 6, fontSize: 11, opacity: 0.8 }}>
              {this.state.error.message}
            </code>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

function RinkReadsRinkInner({
  view = "full",
  zone = "none",
  overlays = [],
  markers = [],
  lines = [],
  showLabels = false,
  showTrapezoid = false,
  showDimensions = false,
  replayT = null,
  className = "",
  style = {},
}) {
  const safeView = sanitizeView(view);
  const safeMarkers = useMemo(() => {
    const arr = Array.isArray(markers) ? markers : [];
    return arr.map((m, i) => sanitizeMarker(m, i)).filter(Boolean);
  }, [markers]);
  const safeLines = useMemo(() => {
    const arr = Array.isArray(lines) ? lines : [];
    return arr.map((l, i) => sanitizeLine(l, i)).filter(Boolean);
  }, [lines]);
  const safeOverlays = useMemo(() => {
    const arr = Array.isArray(overlays) ? overlays : [];
    return arr.filter(o => typeof o === "string" && ZONE_PRESETS[o]);
  }, [overlays]);

  const viewBox = useMemo(() => {
    const pad = 1.5 * M;
    const w = D.length, h = D.width;
    if (safeView === "left") return `${-pad} ${-pad} ${w / 2 + pad * 2} ${h + pad * 2}`;
    if (safeView === "right") return `${w / 2 - pad} ${-pad} ${w / 2 + pad * 2} ${h + pad * 2}`;
    if (safeView === "neutral") return `${LEFT_BLUE_X - pad} ${-pad} ${(RIGHT_BLUE_X - LEFT_BLUE_X) + pad * 2} ${h + pad * 2}`;
    return `${-pad} ${-pad} ${w + pad * 2} ${h + pad * 2}`;
  }, [safeView]);

  const showLeft = safeView === "full" || safeView === "left";
  const showRight = safeView === "full" || safeView === "right";
  const showCenter = safeView === "full" || safeView === "neutral";
  const showCenterCircle = safeView === "full";
  const clipId = `rinkClip-${safeView}`;

  let outlinePath;
  if (safeView === "left") outlinePath = halfRinkPath("left");
  else if (safeView === "right") outlinePath = halfRinkPath("right");
  else outlinePath = fullRinkPath();

  return (
    <svg viewBox={viewBox} xmlns="http://www.w3.org/2000/svg"
      className={className} style={{ display: "block", width: "100%", ...style }}
      role="img">
      <title>Olympic IIHF hockey rink ({safeView} view)</title>
      <defs>
        <clipPath id={clipId}>
          <path d={outlinePath} />
        </clipPath>
        <marker id="rinkreads-arrow-black" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <polygon points="0 0, 6 3, 0 6" fill="#2C2C2A" />
        </marker>
        <marker id="rinkreads-arrow-red" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <polygon points="0 0, 6 3, 0 6" fill="#CC1F2B" />
        </marker>
        <marker id="rinkreads-arrow-green" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <polygon points="0 0, 6 3, 0 6" fill="#1D9E75" />
        </marker>
      </defs>

      <path d={outlinePath} fill={COLORS.ice} />

      <g clipPath={`url(#${clipId})`}>
        <Zone zoneKey={zone} />
        {safeOverlays.map((o, i) => <Zone key={`ov-${i}`} zoneKey={o} />)}
      </g>

      <path d={outlinePath} fill="none" stroke={COLORS.boards} strokeWidth="0.4" />

      <g clipPath={`url(#${clipId})`}>
        {(showLeft || showCenter) && (
          <rect x={LEFT_BLUE_X - D.lineWidthBlue / 2} y={0}
            width={D.lineWidthBlue} height={D.width} fill={COLORS.blueLine} />
        )}
        {(showRight || showCenter) && (
          <rect x={RIGHT_BLUE_X - D.lineWidthBlue / 2} y={0}
            width={D.lineWidthBlue} height={D.width} fill={COLORS.blueLine} />
        )}
        <rect x={CX - D.lineWidthRed / 2} y={0}
          width={D.lineWidthRed} height={D.width} fill={COLORS.redLine} />
        {showLeft && (
          <rect x={LEFT_GOAL_X - 0.3} y={0} width={0.6} height={D.width} fill={COLORS.redLine} />
        )}
        {showRight && (
          <rect x={RIGHT_GOAL_X - 0.3} y={0} width={0.6} height={D.width} fill={COLORS.redLine} />
        )}
      </g>

      {showCenterCircle && (
        <g opacity="0.35">
          <circle cx={CX} cy={CY} r={D.centerFaceoffRadius}
            fill="none" stroke={COLORS.blueLine} strokeWidth="0.18" />
          <circle cx={CX} cy={CY} r={0.3 * M} fill={COLORS.blueLine} />
        </g>
      )}

      {showLeft && (
        <>
          <FaceoffCircle cx={END_FACEOFFS[0].x} cy={END_FACEOFFS[0].y} />
          <FaceoffCircle cx={END_FACEOFFS[1].x} cy={END_FACEOFFS[1].y} />
          <circle cx={NZ_FACEOFFS[0].x} cy={NZ_FACEOFFS[0].y} r={0.35 * M} fill={COLORS.redLine} opacity="0.35" />
          <circle cx={NZ_FACEOFFS[1].x} cy={NZ_FACEOFFS[1].y} r={0.35 * M} fill={COLORS.redLine} opacity="0.35" />
          <Crease side="left" />
          <Goal side="left" />
          {showTrapezoid && <Trapezoid side="left" />}
        </>
      )}
      {showRight && (
        <>
          <FaceoffCircle cx={END_FACEOFFS[2].x} cy={END_FACEOFFS[2].y} />
          <FaceoffCircle cx={END_FACEOFFS[3].x} cy={END_FACEOFFS[3].y} />
          <circle cx={NZ_FACEOFFS[2].x} cy={NZ_FACEOFFS[2].y} r={0.35 * M} fill={COLORS.redLine} opacity="0.35" />
          <circle cx={NZ_FACEOFFS[3].x} cy={NZ_FACEOFFS[3].y} r={0.35 * M} fill={COLORS.redLine} opacity="0.35" />
          <Crease side="right" />
          <Goal side="right" />
          {showTrapezoid && <Trapezoid side="right" />}
        </>
      )}

      {showLabels && safeView === "full" && (
        <g fontFamily="system-ui" fontSize="1.8" fontWeight="500" fill={COLORS.textMuted}>
          <text x={LEFT_GOAL_X + D.goalLineToBlue / 2} y={2.5} textAnchor="middle">DEF</text>
          <text x={CX} y={2.5} textAnchor="middle">NEUTRAL</text>
          <text x={RIGHT_GOAL_X - D.goalLineToBlue / 2} y={2.5} textAnchor="middle">OFF</text>
        </g>
      )}

      {showDimensions && (
        <g fontFamily="system-ui" fontSize="1.8" fill={COLORS.textMuted}>
          {safeView === "full" && (
            <>
              <text x={CX} y={D.width + 4} textAnchor="middle">60 m</text>
              <text x={-6} y={CY} textAnchor="middle" transform={`rotate(-90 -6 ${CY})`}>30 m</text>
            </>
          )}
        </g>
      )}

      {safeLines.map((line, i) => <Line key={`line-${i}`} line={line} />)}
      {safeMarkers.map((marker, i) => <Marker key={`marker-${i}`} marker={marker} replayT={replayT} />)}
    </svg>
  );
}

export default function RinkReadsRink(props) {
  return (
    <RinkErrorBoundary>
      <RinkReadsRinkInner {...props} />
    </RinkErrorBoundary>
  );
}

export const RINK_ZONES = Object.keys(ZONE_PRESETS);
export const RINK_VIEWS = VALID_VIEWS;
