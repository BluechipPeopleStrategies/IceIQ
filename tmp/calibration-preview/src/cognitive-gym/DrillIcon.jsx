// Per-drill line icons for the Cognitive Gym cards. Gold primary stroke with a
// blue accent so each icon reads on the navy card without relying on color
// alone (every icon is a distinct shape). Mapped by drill id; matches the
// approved preview in docs/gym-icons-preview.html.

const G = "#e6b34a"; // gold
const B = "#5aa0e0"; // blue accent

const SVG = {
  viewBox: "0 0 48 48",
  fill: "none",
  stroke: G,
  strokeWidth: 2.4,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

const ICONS = {
  // Read the Pass: puck on a dotted arc hitting a crosshair on the line.
  anticipation: (
    <svg {...SVG}>
      <line x1="36" y1="6" x2="36" y2="42" stroke={B} />
      <path d="M8 39 Q 19 13 36 23" strokeDasharray="2.5 4" />
      <ellipse cx="8" cy="39" rx="4.2" ry="2.4" fill={G} stroke="none" />
      <circle cx="36" cy="23" r="5" />
      <line x1="31" y1="23" x2="41" y2="23" />
      <line x1="36" y1="18" x2="36" y2="28" />
    </svg>
  ),
  // Baylor's Pick: three jerseys with motion trails.
  tracking: (
    <svg {...SVG}>
      <path d="M6 34 Q 10 24 14 20" stroke={B} strokeDasharray="2.5 3.5" />
      <path d="M20 38 Q 24 24 26 14" stroke={B} strokeDasharray="2.5 3.5" />
      <path d="M40 36 Q 36 26 33 21" stroke={B} strokeDasharray="2.5 3.5" />
      <circle cx="14" cy="18" r="4.4" fill={G} stroke="none" />
      <circle cx="27" cy="12" r="4.4" />
      <circle cx="33" cy="19" r="4.4" fill={G} stroke="none" />
    </svg>
  ),
  // Shoot or Hold: stopwatch with a lightning bolt.
  reaction: (
    <svg {...SVG}>
      <line x1="24" y1="4" x2="24" y2="9" />
      <line x1="20" y1="4" x2="28" y2="4" />
      <circle cx="24" cy="27" r="15" />
      <path d="M26 18 L 19 29 L 25 29 L 22 38 L 31 26 L 25 26 Z" fill={B} stroke={B} strokeWidth="1.4" />
    </svg>
  ),
  // Eyes Up: an eye with a spark in the corner.
  eyesup: (
    <svg {...SVG}>
      <path d="M6 26 Q 22 12 38 26 Q 22 40 6 26 Z" />
      <circle cx="22" cy="26" r="5" fill={G} stroke="none" />
      <g stroke={B}>
        <line x1="42" y1="9" x2="42" y2="16" />
        <line x1="38.5" y1="12.5" x2="45.5" y2="12.5" />
        <line x1="39.5" y1="9.5" x2="44.5" y2="15.5" />
        <line x1="44.5" y1="9.5" x2="39.5" y2="15.5" />
      </g>
    </svg>
  ),
  // Snapshot: viewfinder framing a faded dot.
  snapshot: (
    <svg {...SVG}>
      <path d="M8 16 L8 10 L14 10" />
      <path d="M40 16 L40 10 L34 10" />
      <path d="M8 32 L8 38 L14 38" />
      <path d="M40 32 L40 38 L34 38" />
      <circle cx="24" cy="24" r="6" stroke={B} strokeDasharray="2.5 3" />
      <circle cx="24" cy="24" r="1.6" fill={B} stroke="none" />
    </svg>
  ),
  // Find the Lane: an arrow threading a gap between two defenders.
  findlane: (
    <svg {...SVG}>
      <rect x="14" y="6" width="6" height="13" rx="2" stroke={B} />
      <rect x="28" y="29" width="6" height="13" rx="2" stroke={B} />
      <path d="M8 40 L 40 8" />
      <path d="M40 8 L 33 9 M40 8 L 39 15" />
    </svg>
  ),
  // Best Option: a puck with three branching arrows.
  bestoption: (
    <svg {...SVG}>
      <ellipse cx="24" cy="40" rx="5" ry="2.6" fill={G} stroke="none" />
      <path d="M24 38 L 24 10 M24 10 L 20 15 M24 10 L 28 15" />
      <path d="M24 38 L 9 20 M9 20 L 15 21 M9 20 L 10 26" stroke={B} />
      <path d="M24 38 L 39 20 M39 20 L 33 21 M39 20 L 38 26" stroke={B} />
    </svg>
  ),
  // Read the Numbers: a jersey number with speed lines.
  readnumbers: (
    <svg {...SVG}>
      <rect x="18" y="10" width="22" height="28" rx="4" />
      <text x="29" y="32" textAnchor="middle" fontSize="20" fontWeight="800" fill={G} stroke="none" fontFamily="system-ui, sans-serif">7</text>
      <line x1="4" y1="16" x2="13" y2="16" stroke={B} />
      <line x1="2" y1="24" x2="13" y2="24" stroke={B} />
      <line x1="4" y1="32" x2="13" y2="32" stroke={B} />
    </svg>
  ),
  // Late Read: a pass arrow that bends late around a defender.
  lateread: (
    <svg {...SVG}>
      <rect x="20" y="20" width="8" height="8" rx="1.6" stroke={B} transform="rotate(45 24 24)" />
      <path d="M7 39 Q 16 30 18 24 Q 21 14 35 11" />
      <path d="M35 11 L 29 11 M35 11 L 34 17" />
    </svg>
  ),
  // Two Things at Once: two targets (circle + triangle).
  twothings: (
    <svg {...SVG}>
      <circle cx="15" cy="24" r="9" />
      <circle cx="15" cy="24" r="2.4" fill={G} stroke="none" />
      <path d="M33 16 L 41 30 L 25 30 Z" stroke={B} />
    </svg>
  ),
  // Pick Your Spot: a net with a goalie pad on one side, target in the open corner.
  shootout: (
    <svg {...SVG}>
      <rect x="8" y="12" width="32" height="24" rx="2" />
      <line x1="8" y1="24" x2="40" y2="24" strokeWidth="1.2" opacity="0.5" />
      <line x1="24" y1="12" x2="24" y2="36" strokeWidth="1.2" opacity="0.5" />
      <rect x="9" y="13" width="13" height="22" rx="2" fill={B} stroke="none" opacity="0.85" />
      <text x="15.5" y="28" textAnchor="middle" fontSize="11" fontWeight="800" fill="#0e1b2e" stroke="none" fontFamily="system-ui, sans-serif">G</text>
      <circle cx="33" cy="18" r="4" fill={G} stroke="none" />
    </svg>
  ),
  // Run the Play: three skaters chained by dashed passes, numbered order.
  runtheplay: (
    <svg {...SVG}>
      <path d="M10 36 L24 14" stroke={B} strokeDasharray="3 4" />
      <path d="M24 14 L38 32" stroke={B} strokeDasharray="3 4" />
      <circle cx="10" cy="36" r="5" fill={G} stroke="none" />
      <circle cx="24" cy="14" r="5" />
      <circle cx="38" cy="32" r="5" fill={G} stroke="none" />
      <text x="17" y="22" fontSize="9" fontWeight="800" fill={B} stroke="none" fontFamily="system-ui, sans-serif">1</text>
      <text x="34" y="19" fontSize="9" fontWeight="800" fill={B} stroke="none" fontFamily="system-ui, sans-serif">2</text>
    </svg>
  ),
};

// A drill's icon, sized by its container. Returns null for an unknown id.
export default function DrillIcon({ id }) {
  const svg = ICONS[id];
  if (!svg) return null;
  return (
    <span className="gym-drill-icon" aria-hidden="true">
      {svg}
    </span>
  );
}
