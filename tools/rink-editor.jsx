// AUTO-GENERATED from src/Rink.jsx — do not edit directly.
// When src/Rink.jsx changes, run: npm run build:dashboard
(function(){
/**
 * Rink.jsx — IceIQ offensive-zone scenario editor + renderer
 * ----------------------------------------------------------
 * Self-contained React component for authoring and displaying hockey
 * decision-making scenarios. Designed to plug into an existing question
 * dashboard as a new question type: `type: "rink"`.
 *
 * Two modes:
 *   <Rink mode="edit"  scene={scene} onChange={setScene} />   // authoring
 *   <Rink mode="play"  scene={scene} onAnswer={handleAnswer}/> // kid playing
 *
 * Scene schema (JSON-serializable, store in Supabase jsonb or local state):
 *   {
 *     team: [{ id, label?, zone, hasPuck?, isYou?, x?, y?, offsetX?, offsetY? }],
 *     opponents: [{ id, zone, x?, y?, offsetX?, offsetY? }],
 *     puck: { zone, x?, y?, offsetX?, offsetY? },
 *     showGoalie: bool,
 *     showHomePlate: bool,
 *     texts:  [{ id, text, x, y }],
 *     arrows: [{ id, from, to, x1?, y1?, x2?, y2? }],
 *     flags:  [{ id, zone, x?, y? }],
 *     question: {
 *       mode: "choice" | "zone-click",
 *       prompt: string,
 *       // choice mode:
 *       options?: [{ text, verdict, feedback }],
 *       // zone-click mode:
 *       zones?:   { correct: [zoneKey], partial: [zoneKey], wrong: [zoneKey] },
 *       feedback?:{ correct, partial, wrong }
 *     }
 *   }
 *
 * No external dependencies beyond React. Drop into any IceIQ question editor.
 */

const { useState, useRef, useEffect, useCallback } = React;

// ─────────────────────────────────────────────────────────────────────────────
// GEOMETRY — true NHL proportions, offensive-zone only, net at top.
// 1 ft ≈ 7.06px horizontal, 6.3px vertical (slight vertical compression).
// ─────────────────────────────────────────────────────────────────────────────
const FX = 7.06, FY = 6.3;
const RINK_LEFT = 40, RINK_RIGHT = 640, RINK_CENTER_X = 340;
const RINK_TOP = 40;
const GOAL_LINE_Y    = RINK_TOP + 11 * FY;
const BLUE_LINE_Y    = RINK_TOP + 75 * FY;
const FACEOFF_Y      = GOAL_LINE_Y + 20 * FY;
const FACEOFF_X_OFF  = 22 * FX;
const L_FACEOFF_X    = RINK_CENTER_X - FACEOFF_X_OFF;
const R_FACEOFF_X    = RINK_CENTER_X + FACEOFF_X_OFF;
const FACEOFF_R      = 15 * FX;
const CORNER_R       = 28 * FX;
const NET_W          = 6 * FX;
const NET_DEPTH      = 3.3 * FY;
const BOARD_INSET    = 28;
const VIEWBOX_H      = 640;

// Zone anchor points. Players "live" at a zone; when dragged, their (x,y)
// override takes precedence. Change the zone dropdown to reset back to anchor.
const ZONES = {
  'net-front':      { x: RINK_CENTER_X,               y: GOAL_LINE_Y + 36,  label: 'Net-front' },
  'slot':           { x: RINK_CENTER_X,               y: FACEOFF_Y - 20,    label: 'Slot' },
  'high-slot':      { x: RINK_CENTER_X,               y: FACEOFF_Y + 46,    label: 'High slot' },
  'left-faceoff':   { x: L_FACEOFF_X,                 y: FACEOFF_Y,         label: 'Left faceoff dot' },
  'right-faceoff':  { x: R_FACEOFF_X,                 y: FACEOFF_Y,         label: 'Right faceoff dot' },
  'left-corner':    { x: RINK_LEFT + BOARD_INSET + 48,  y: GOAL_LINE_Y - 18,  label: 'Left corner' },
  'right-corner':   { x: RINK_RIGHT - BOARD_INSET - 48, y: GOAL_LINE_Y - 18,  label: 'Right corner' },
  'behind-net':     { x: RINK_CENTER_X,               y: GOAL_LINE_Y - 52,  label: 'Behind the net' },
  'left-boards':    { x: RINK_LEFT + BOARD_INSET + 18,  y: FACEOFF_Y + 6,     label: 'Left boards' },
  'right-boards':   { x: RINK_RIGHT - BOARD_INSET - 18, y: FACEOFF_Y + 6,     label: 'Right boards' },
  'left-point':     { x: L_FACEOFF_X - 42,            y: BLUE_LINE_Y - 34,  label: 'Left point' },
  'right-point':    { x: R_FACEOFF_X + 42,            y: BLUE_LINE_Y - 34,  label: 'Right point' },
};
const ZONE_KEYS = Object.keys(ZONES);

// Home plate (high-danger zone): pentagon from the top of the faceoff circles
// tapering down to just outside the crease at the goal line.
const HP_TOP_Y         = FACEOFF_Y - 8;
const HP_BOT_Y         = GOAL_LINE_Y;
const HP_TOP_LEFT_X    = L_FACEOFF_X + 6;
const HP_TOP_RIGHT_X   = R_FACEOFF_X - 6;
const HP_BOT_LEFT_X    = RINK_CENTER_X - 4 * FX;
const HP_BOT_RIGHT_X   = RINK_CENTER_X + 4 * FX;
const HP_MID_Y         = (HP_TOP_Y + HP_BOT_Y) / 2 + 10;
const HOME_PLATE_PATH  =
  `M ${HP_TOP_LEFT_X} ${HP_TOP_Y} ` +
  `L ${HP_TOP_RIGHT_X} ${HP_TOP_Y} ` +
  `L ${HP_TOP_RIGHT_X} ${HP_MID_Y} ` +
  `L ${HP_BOT_RIGHT_X} ${HP_BOT_Y} ` +
  `L ${HP_BOT_LEFT_X} ${HP_BOT_Y} ` +
  `L ${HP_TOP_LEFT_X} ${HP_MID_Y} Z`;

// Zone-click hit regions. For the "click a zone" question type we draw
// invisible <rect>/<path> hit targets over each nameable region.
// These are generous and non-overlapping so kids can click with confidence.
const ZONE_HIT_SHAPES = {
  'slot':        { d: `M ${RINK_CENTER_X - 55} ${GOAL_LINE_Y + 16} L ${RINK_CENTER_X + 55} ${GOAL_LINE_Y + 16} L ${RINK_CENTER_X + 55} ${FACEOFF_Y - 8} L ${RINK_CENTER_X - 55} ${FACEOFF_Y - 8} Z` },
  'high-slot':   { d: `M ${RINK_CENTER_X - 60} ${FACEOFF_Y + 16} L ${RINK_CENTER_X + 60} ${FACEOFF_Y + 16} L ${RINK_CENTER_X + 60} ${BLUE_LINE_Y - 10} L ${RINK_CENTER_X - 60} ${BLUE_LINE_Y - 10} Z` },
  'net-front':   { d: `M ${RINK_CENTER_X - 30} ${GOAL_LINE_Y} L ${RINK_CENTER_X + 30} ${GOAL_LINE_Y} L ${RINK_CENTER_X + 30} ${GOAL_LINE_Y + 50} L ${RINK_CENTER_X - 30} ${GOAL_LINE_Y + 50} Z` },
  'left-corner': { d: `M ${RINK_LEFT + 5} ${GOAL_LINE_Y - 70} L ${RINK_LEFT + 125} ${GOAL_LINE_Y - 70} L ${RINK_LEFT + 125} ${GOAL_LINE_Y + 30} L ${RINK_LEFT + 5} ${GOAL_LINE_Y + 30} Z` },
  'right-corner':{ d: `M ${RINK_RIGHT - 125} ${GOAL_LINE_Y - 70} L ${RINK_RIGHT - 5} ${GOAL_LINE_Y - 70} L ${RINK_RIGHT - 5} ${GOAL_LINE_Y + 30} L ${RINK_RIGHT - 125} ${GOAL_LINE_Y + 30} Z` },
  'behind-net':  { d: `M ${RINK_CENTER_X - 70} ${RINK_TOP + 4} L ${RINK_CENTER_X + 70} ${RINK_TOP + 4} L ${RINK_CENTER_X + 70} ${GOAL_LINE_Y - 8} L ${RINK_CENTER_X - 70} ${GOAL_LINE_Y - 8} Z` },
  'left-point':  { d: `M ${L_FACEOFF_X - 85} ${BLUE_LINE_Y - 65} L ${L_FACEOFF_X + 5} ${BLUE_LINE_Y - 65} L ${L_FACEOFF_X + 5} ${BLUE_LINE_Y - 8} L ${L_FACEOFF_X - 85} ${BLUE_LINE_Y - 8} Z` },
  'right-point': { d: `M ${R_FACEOFF_X - 5} ${BLUE_LINE_Y - 65} L ${R_FACEOFF_X + 85} ${BLUE_LINE_Y - 65} L ${R_FACEOFF_X + 85} ${BLUE_LINE_Y - 8} L ${R_FACEOFF_X - 5} ${BLUE_LINE_Y - 8} Z` },
  'home-plate':  { d: HOME_PLATE_PATH },
};

// ─────────────────────────────────────────────────────────────────────────────
// ID helper
// ─────────────────────────────────────────────────────────────────────────────
const uid = () => 'id_' + Math.random().toString(36).slice(2, 10);

// ─────────────────────────────────────────────────────────────────────────────
// Scene default + empty-scene factory
// ─────────────────────────────────────────────────────────────────────────────
function emptyScene() {
  return {
    team: [],
    opponents: [],
    puck: { zone: 'slot', offsetX: 26, offsetY: -2 },
    showGoalie: true,
    showHomePlate: false,
    hideBranding: false,
    texts: [],
    arrows: [],
    flags: [],
    hiddenLabels: [],
    question: {
      mode: 'choice',
      prompt: '',
      options: [],
      zones: { correct: [], partial: [], wrong: [] },
      feedback: { correct: '', partial: '', wrong: '' },
    },
  };
}

// Resolve a player/puck/text/flag to its rendered position. Explicit (x,y)
// from a drag takes precedence; otherwise zone anchor + optional offset.
function resolvePos(item) {
  if (item && item.x != null && item.y != null) return { x: item.x, y: item.y };
  const z = ZONES[item?.zone] || ZONES['slot'];
  return { x: z.x + (item?.offsetX || 0), y: z.y + (item?.offsetY || 0) };
}

function resolveArrowPoints(a) {
  const p1 = (a.x1 != null && a.y1 != null) ? { x: a.x1, y: a.y1 } : (ZONES[a.from] || ZONES.slot);
  const p2 = (a.x2 != null && a.y2 != null) ? { x: a.x2, y: a.y2 } : (ZONES[a.to] || ZONES['net-front']);
  return { p1, p2 };
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────
// Keys for every rink label — referenced by `scene.hiddenLabels` and by the
// edit-mode toggle chips so authors can remove any subset per scenario.
const LABEL_KEYS = [
  { key: 'corner-L',   text: 'Corner' },
  { key: 'corner-R',   text: 'Corner' },
  { key: 'behind-net', text: 'Behind the net' },
  { key: 'slot',       text: 'Slot' },
  { key: 'high-slot',  text: 'High slot' },
  { key: 'point-L',    text: 'Point' },
  { key: 'point-R',    text: 'Point' },
  { key: 'blue-line',  text: 'BLUE LINE' },
];

function RinkBackground({ lineOpacity = 0.45, showHomePlate, showZoneOutlines, hiddenLabels = [] }) {
  const hide = (k) => hiddenLabels.includes(k);
  // Reduced-opacity rink lines — see CLAUDE's note: "players & positioning
  // are more important than the lines". We keep all lines visible, just
  // dimmed, so on-ice objects dominate.
  const r = CORNER_R;
  const rinkPath =
    `M ${RINK_LEFT + r} ${RINK_TOP} L ${RINK_RIGHT - r} ${RINK_TOP} ` +
    `A ${r} ${r} 0 0 1 ${RINK_RIGHT} ${RINK_TOP + r} ` +
    `L ${RINK_RIGHT} ${BLUE_LINE_Y + 40} ` +
    `L ${RINK_LEFT} ${BLUE_LINE_Y + 40} ` +
    `L ${RINK_LEFT} ${RINK_TOP + r} ` +
    `A ${r} ${r} 0 0 1 ${RINK_LEFT + r} ${RINK_TOP} Z`;
  const netX = RINK_CENTER_X - NET_W / 2;
  const netYTop = GOAL_LINE_Y - NET_DEPTH;
  const creaseR = 6 * FX;

  return (
    <>
      {/* Rink board — kept fully opaque so the canvas has a clean edge */}
      <path d={rinkPath} fill="#FDFEFF" stroke="#2F4A6B" strokeWidth="3" />

      <g clipPath="url(#rink-clip)" opacity={lineOpacity}>
        <ellipse cx={RINK_CENTER_X} cy={RINK_TOP + 40} rx="280" ry="40" fill="#E8F1FA" opacity="0.5" />

        {/* Home plate overlay — always rendered if toggled, behind players */}
        {showHomePlate && (
          <path d={HOME_PLATE_PATH}
                fill="#FF9A3C"
                fillOpacity="0.22"
                stroke="#B8570A"
                strokeWidth="2"
                strokeDasharray="5 3" />
        )}

        {/* Crease */}
        <path d={`M ${RINK_CENTER_X - 4 * FX} ${GOAL_LINE_Y} L ${RINK_CENTER_X - 4 * FX} ${GOAL_LINE_Y + 4.5 * FY} A ${creaseR} ${creaseR} 0 0 0 ${RINK_CENTER_X + 4 * FX} ${GOAL_LINE_Y + 4.5 * FY} L ${RINK_CENTER_X + 4 * FX} ${GOAL_LINE_Y} Z`}
              fill="#A8D0EC" stroke="#3B7FC4" strokeWidth="1.5" opacity="0.85" />

        {/* Goal line */}
        <line x1={RINK_LEFT} y1={GOAL_LINE_Y} x2={RINK_RIGHT} y2={GOAL_LINE_Y} stroke="#E8453E" strokeWidth="2.5" />

        {/* Faceoff circles */}
        <circle cx={L_FACEOFF_X} cy={FACEOFF_Y} r={FACEOFF_R} fill="none" stroke="#E8453E" strokeWidth="2" />
        <circle cx={R_FACEOFF_X} cy={FACEOFF_Y} r={FACEOFF_R} fill="none" stroke="#E8453E" strokeWidth="2" />

        {/* Hashmarks */}
        <Hashmarks cx={L_FACEOFF_X} cy={FACEOFF_Y} />
        <Hashmarks cx={R_FACEOFF_X} cy={FACEOFF_Y} />

        {/* Faceoff dots */}
        <circle cx={L_FACEOFF_X} cy={FACEOFF_Y} r="7" fill="#E8453E" />
        <circle cx={R_FACEOFF_X} cy={FACEOFF_Y} r="7" fill="#E8453E" />

        {/* Net */}
        <rect x={netX} y={netYTop} width={NET_W} height={NET_DEPTH} fill="#FFFFFF" stroke="#2F4A6B" strokeWidth="2" rx="2" />

        {/* Blue line */}
        <rect x={RINK_LEFT} y={BLUE_LINE_Y - 4} width={RINK_RIGHT - RINK_LEFT} height="8" fill="#3B8BD4" />
      </g>

      {/* Zone outlines (only in zone-click authoring/play) — drawn above bg but below players */}
      {showZoneOutlines && (
        <g pointerEvents="none">
          {Object.entries(ZONE_HIT_SHAPES).map(([k, s]) => (
            <path key={k} d={s.d} fill="none" stroke="#378ADD" strokeWidth="1.5"
                  strokeDasharray="4 3" opacity="0.35" />
          ))}
        </g>
      )}

      {/* Zone labels — each toggleable via scene.hiddenLabels (see LABEL_KEYS) */}
      {!hide('corner-L')   && <ZoneLabel x={RINK_LEFT + 55}  y={GOAL_LINE_Y - 58} text="Corner" />}
      {!hide('corner-R')   && <ZoneLabel x={RINK_RIGHT - 55} y={GOAL_LINE_Y - 58} text="Corner" />}
      {!hide('behind-net') && <ZoneLabel x={RINK_CENTER_X}   y={RINK_TOP - 8}     text="Behind the net" />}
      {!hide('slot')       && <ZoneLabel x={RINK_CENTER_X}   y={FACEOFF_Y - 30}   text="Slot" />}
      {!hide('high-slot')  && <ZoneLabel x={RINK_CENTER_X}   y={FACEOFF_Y + 80}   text="High slot" />}
      {!hide('point-L')    && <ZoneLabel x={L_FACEOFF_X - 56} y={BLUE_LINE_Y - 24} text="Point" />}
      {!hide('point-R')    && <ZoneLabel x={R_FACEOFF_X + 56} y={BLUE_LINE_Y - 24} text="Point" />}
      {!hide('blue-line')  && (
        <text x={RINK_CENTER_X} y={BLUE_LINE_Y + 30}
              fontFamily="'Anthropic Sans',sans-serif" fontSize="14"
              fontWeight="700" fill="#3B8BD4" textAnchor="middle">BLUE LINE</text>
      )}
    </>
  );
}

function Hashmarks({ cx, cy }) {
  const r = FACEOFF_R;
  return (
    <>
      <line x1={cx - 18} y1={cy - r} x2={cx - 18} y2={cy - r - 14} stroke="#E8453E" strokeWidth="2" />
      <line x1={cx + 18} y1={cy - r} x2={cx + 18} y2={cy - r - 14} stroke="#E8453E" strokeWidth="2" />
      <line x1={cx - 18} y1={cy + r} x2={cx - 18} y2={cy + r + 14} stroke="#E8453E" strokeWidth="2" />
      <line x1={cx + 18} y1={cy + r} x2={cx + 18} y2={cy + r + 14} stroke="#E8453E" strokeWidth="2" />
    </>
  );
}

function ZoneLabel({ x, y, text }) {
  return (
    <text x={x} y={y}
          fontFamily="'Anthropic Sans',sans-serif" fontSize="13"
          fontWeight="600" fill="#4A5C6E" textAnchor="middle">{text}</text>
  );
}

// Generic helmet (replaces hair styles — per user request, hair is removed)
function Helmet({ cx, cy }) {
  return (
    <>
      <ellipse cx={cx} cy={cy} rx="11" ry="10" fill="#2F4A6B" stroke="#1A2B3E" strokeWidth="1.5" />
      <rect x={cx - 1.4} y={cy - 10} width="2.8" height="20" fill="#1A2B3E" />
      <path d={`M ${cx - 7} ${cy + 4} Q ${cx} ${cy + 7} ${cx + 7} ${cy + 4}`} fill="none" stroke="#1A2B3E" strokeWidth="1" />
    </>
  );
}

// Star drawn directly on the jersey chest — indicates "YOU"
function JerseyStar({ cx, cy }) {
  const sy = cy + 13;
  const pts = [
    [cx, sy - 7], [cx + 2, sy - 2.3], [cx + 7, sy - 2.3],
    [cx + 3, sy + 1], [cx + 4.5, sy + 6.5], [cx, sy + 3.5],
    [cx - 4.5, sy + 6.5], [cx - 3, sy + 1], [cx - 7, sy - 2.3], [cx - 2, sy - 2.3]
  ].map(p => p.join(',')).join(' ');
  return <polygon points={pts} fill="#FFD93D" stroke="#C89B0A" strokeWidth="1.3" />;
}

function Teammate({ item, selected, onPointerDown, playMode }) {
  const { x: cx, y: cy } = resolvePos(item);
  const strokeW = item.hasPuck ? 4 : 2.5;
  const labelOnChest = item.label && !item.isYou;
  const showYouBelow = item.isYou;
  const s = item.size || 1;

  return (
    <g className="rnk-draggable" data-id={item.id}
       style={{ cursor: playMode ? 'default' : 'grab' }}
       onPointerDown={onPointerDown}
       transform={s !== 1 ? `translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})` : undefined}>
      {selected && (
        <rect x={cx - 26} y={cy - 20} width="52" height="56" rx="8"
              fill="none" stroke="#378ADD" strokeWidth="2" strokeDasharray="4 3" />
      )}
      {/* Jersey */}
      <path d={`M ${cx - 18} ${cy} Q ${cx - 20} ${cy + 20} ${cx - 12} ${cy + 24} Q ${cx} ${cy + 28} ${cx + 12} ${cy + 24} Q ${cx + 20} ${cy + 20} ${cx + 18} ${cy} Q ${cx + 10} ${cy - 4} ${cx} ${cy - 4} Q ${cx - 10} ${cy - 4} ${cx - 18} ${cy} Z`}
            fill="#FFFFFF" stroke="#1E5FA5" strokeWidth={strokeW} strokeLinejoin="round" />
      {labelOnChest && (
        <text x={cx} y={cy + 15}
              fontFamily="'Anthropic Sans',sans-serif" fontSize="13"
              fontWeight="700" fill="#1E5FA5" textAnchor="middle"
              dominantBaseline="central">{item.label}</text>
      )}
      {item.isYou && <JerseyStar cx={cx} cy={cy} />}
      <Helmet cx={cx} cy={cy - 6} />
      {showYouBelow && (
        <text x={cx} y={cy + 38}
              fontFamily="'Anthropic Sans',sans-serif" fontSize="12"
              fontWeight="700" fill="#C89B0A" textAnchor="middle">
          {item.label ? `${item.label} (you)` : 'YOU'}
        </text>
      )}
    </g>
  );
}

function Opponent({ item, selected, onPointerDown, playMode }) {
  const { x: cx, y: cy } = resolvePos(item);
  const s = item.size || 1;
  return (
    <g className="rnk-draggable" data-id={item.id}
       style={{ cursor: playMode ? 'default' : 'grab' }}
       onPointerDown={onPointerDown}
       transform={s !== 1 ? `translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})` : undefined}>
      {selected && (
        <rect x={cx - 24} y={cy - 16} width="48" height="50" rx="8"
              fill="none" stroke="#378ADD" strokeWidth="2" strokeDasharray="4 3" />
      )}
      <path d={`M ${cx - 17} ${cy} Q ${cx - 19} ${cy + 18} ${cx - 11} ${cy + 22} Q ${cx} ${cy + 25} ${cx + 11} ${cy + 22} Q ${cx + 19} ${cy + 18} ${cx + 17} ${cy} Q ${cx + 9} ${cy - 3} ${cx} ${cy - 3} Q ${cx - 9} ${cy - 3} ${cx - 17} ${cy} Z`}
            fill="url(#oppStripes)" stroke="#2F4A6B" strokeWidth="2.5" strokeLinejoin="round" />
      <Helmet cx={cx} cy={cy - 6} />
    </g>
  );
}

// Goalie is a fixed-position fixture (not draggable). In edit mode it's
// clickable so it can be selected and removed via the × handle / Del key;
// in play mode it's non-interactive.
const GOALIE_POS = { x: RINK_CENTER_X, y: GOAL_LINE_Y + 16 };

function Goalie({ selected, playMode, onSelect }) {
  const cx = GOALIE_POS.x;
  const cy = GOALIE_POS.y;
  return (
    <g style={{ cursor: playMode ? 'default' : 'pointer' }}
       pointerEvents={playMode ? 'none' : 'auto'}
       onPointerDown={(e) => { if (onSelect) { e.stopPropagation(); onSelect(e); } }}>
      {selected && (
        <rect x={cx - 28} y={cy - 24} width="56" height="60" rx="8"
              fill="none" stroke="#378ADD" strokeWidth="2" strokeDasharray="4 3" />
      )}
      <rect x={cx - 19} y={cy + 8} width="12" height="24" rx="3" fill="#FFFFFF" stroke="#1A1A1A" strokeWidth="2" />
      <rect x={cx + 7}  y={cy + 8} width="12" height="24" rx="3" fill="#FFFFFF" stroke="#1A1A1A" strokeWidth="2" />
      <path d={`M ${cx - 20} ${cy - 2} Q ${cx - 23} ${cy + 17} ${cx - 14} ${cy + 19} L ${cx + 14} ${cy + 19} Q ${cx + 23} ${cy + 17} ${cx + 20} ${cy - 2} Q ${cx + 10} ${cy - 6} ${cx} ${cy - 6} Q ${cx - 10} ${cy - 6} ${cx - 20} ${cy - 2} Z`}
            fill="url(#oppStripes)" stroke="#1A1A1A" strokeWidth="2.5" />
      <rect x={cx + 18} y={cy + 2} width="10" height="13" rx="1.5" fill="#FFFFFF" stroke="#1A1A1A" strokeWidth="1.5" />
      <circle cx={cx - 23} cy={cy + 7} r="8" fill="#FFFFFF" stroke="#1A1A1A" strokeWidth="1.5" />
      <ellipse cx={cx} cy={cy - 11} rx="11" ry="10" fill="#FFFFFF" stroke="#1A1A1A" strokeWidth="2" />
      <text x={cx} y={cy + 9}
            fontFamily="'Anthropic Sans',sans-serif" fontSize="12"
            fontWeight="700" fill="#1E5FA5" textAnchor="middle"
            dominantBaseline="central">G</text>
    </g>
  );
}

function BigPuck({ puck, selected, onPointerDown, playMode }) {
  const { x: cx, y: cy } = resolvePos(puck);
  const s = puck.size || 1;
  return (
    <g className="rnk-draggable" data-id="puck"
       style={{ cursor: playMode ? 'default' : 'grab' }}
       onPointerDown={onPointerDown}
       transform={s !== 1 ? `translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})` : undefined}>
      {selected && (
        <circle cx={cx} cy={cy} r="22" fill="none" stroke="#378ADD" strokeWidth="2" strokeDasharray="4 3" />
      )}
      <circle cx={cx} cy={cy} r="16" fill="url(#puckGlow)" stroke="#6B4A00" strokeWidth="2.4" />
      <ellipse cx={cx - 4} cy={cy - 6} rx="6" ry="3.5" fill="#FFF4B8" opacity="0.8" />
      <text x={cx} y={cy + 1}
            fontFamily="'Anthropic Sans',sans-serif" fontSize="9"
            fontWeight="700" fill="#6B4A00" textAnchor="middle"
            dominantBaseline="central">PUCK</text>
    </g>
  );
}

function TextLabel({ item, selected, onPointerDown, playMode }) {
  const cx = item.x, cy = item.y;
  const w = Math.max(40, (item.text || '').length * 7.8 + 14);
  return (
    <g className="rnk-draggable" data-id={item.id}
       style={{ cursor: playMode ? 'default' : 'grab' }}
       onPointerDown={onPointerDown}>
      {selected && (
        <rect x={cx - 7} y={cy - 18} width={w + 4} height="24" rx="4"
              fill="none" stroke="#378ADD" strokeWidth="2" strokeDasharray="4 3" />
      )}
      <rect x={cx - 5} y={cy - 16} width={w} height="20" rx="3"
            fill="#FFFFE0" stroke="#C89B0A" strokeWidth="1" opacity="0.95" />
      <text x={cx} y={cy}
            fontFamily="'Anthropic Sans',sans-serif" fontSize="13"
            fontWeight="600" fill="#6B4A00">{item.text || 'Text'}</text>
    </g>
  );
}

function Flag({ item, selected, onPointerDown, playMode }) {
  const { x, y } = resolvePos(item);
  return (
    <g className="rnk-draggable" data-id={item.id}
       style={{ cursor: playMode ? 'default' : 'grab' }}
       onPointerDown={onPointerDown}>
      {selected && (
        <circle cx={x} cy={y + 8} r="36" fill="none"
                stroke="#378ADD" strokeWidth="2" strokeDasharray="4 3" />
      )}
      <circle cx={x} cy={y + 8} r="32" fill="none"
              stroke="#FF9A3C" strokeWidth="3" strokeDasharray="5 4" opacity="0.85" />
      <circle cx={x + 26} cy={y - 26} r="14"
              fill="#FF9A3C" stroke="#B8570A" strokeWidth="2" />
      <text x={x + 26} y={y - 26}
            fontFamily="'Anthropic Sans',sans-serif" fontSize="18"
            fontWeight="700" fill="#FFFFFF" textAnchor="middle"
            dominantBaseline="central">?</text>
    </g>
  );
}

function Arrow({ a }) {
  const { p1, p2 } = resolveArrowPoints(a);
  const dx = p2.x - p1.x, dy = p2.y - p1.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = dx / len, ny = dy / len;
  const sX = p1.x + nx * 10, sY = p1.y + ny * 10;
  const eX = p2.x - nx * 10, eY = p2.y - ny * 10;
  const mX = (sX + eX) / 2, mY = (sY + eY) / 2;
  return (
    <path d={`M ${sX} ${sY} Q ${mX + -ny * 12} ${mY + nx * 12} ${eX} ${eY}`}
          fill="none" stroke="#22A06B" strokeWidth="4.5"
          strokeLinecap="round" strokeDasharray="9 5"
          markerEnd="url(#move-arrow)" />
  );
}

// IceIQ branding watermark. Positioned bottom-right of the rink. Subtle but
// unmistakable — a stylized "IQ" monogram in ice-blue with a faint puck mark.
function IceIQBrand({ variant = 'corner' }) {
  if (variant === 'corner') {
    const x = RINK_RIGHT - 52;
    const y = BLUE_LINE_Y + 62;
    return (
      <g pointerEvents="none" opacity="0.9">
        {/* subtle chip behind wordmark */}
        <rect x={x - 62} y={y - 18} width="118" height="28" rx="14"
              fill="#0B2942" />
        <circle cx={x - 45} cy={y - 4} r="7" fill="url(#puckGlow)" stroke="#6B4A00" strokeWidth="1" />
        <text x={x - 32} y={y}
              fontFamily="'Anthropic Sans',sans-serif" fontSize="14"
              fontWeight="700" fill="#FFFFFF" letterSpacing="1.2"
              dominantBaseline="central">
          ICE<tspan fill="#3B8BD4">·</tspan>IQ
        </text>
        <text x={x + 12} y={y + 18}
              fontFamily="'Anthropic Sans',sans-serif" fontSize="8"
              fill="#6B8DAD" letterSpacing="2" textAnchor="middle">PLAYER DEV</text>
      </g>
    );
  }
  // Center-ice "ghost" variant — very faint, large, behind everything
  return (
    <g pointerEvents="none" opacity="0.05">
      <text x={RINK_CENTER_X} y={FACEOFF_Y + 30}
            fontFamily="'Anthropic Sans',sans-serif" fontSize="72"
            fontWeight="900" fill="#1E5FA5" textAnchor="middle"
            letterSpacing="6">ICE·IQ</text>
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
/**
 * <Rink />
 *
 * Props:
 *   scene       — required. Scene object (see schema above).
 *   onChange    — edit mode. Called with updated scene on every change.
 *   mode        — "edit" (default) | "play"
 *   onAnswer    — play mode. Called with { verdict, choice, feedback } when
 *                 the kid picks an option or clicks a zone.
 *   ageGroup    — optional: "U9" | "U11" | ... — used for UI affordances
 *                 (e.g. U9 defaults to no position labels).
 *   className   — optional wrapper class.
 */
function Rink({
  scene: sceneProp,
  onChange,
  mode = 'edit',
  onAnswer,
  ageGroup,
  className = '',
  lockAnswer = false, // when true, hides internal AnswerFeedback + blocks re-answering (host renders its own feedback)
}) {
  const [scene, setSceneInternal] = useState(sceneProp || emptyScene());
  const [selectedId, setSelectedId] = useState(null);
  const [placementTool, setPlacementTool] = useState(null); // 'teammate'|'opponent'|'puck'|'text'|'flag'|'arrow'
  const [arrowDraft, setArrowDraft] = useState(null);       // { x1, y1 } while placing an arrow
  const [playAnswer, setPlayAnswer] = useState(null);       // in play mode: the kid's chosen verdict+feedback
  const svgRef = useRef(null);
  const dragRef = useRef(null);                             // { id, offsetX, offsetY }

  // Keep internal scene in sync with prop changes (if parent controls)
  useEffect(() => {
    if (sceneProp) setSceneInternal(sceneProp);
  }, [sceneProp]);

  // Delete/Backspace removes the selected item in edit mode. Listener is
  // scoped to the rink wrapper so typing in other fields on the page stays
  // safe (inputs/textareas still take the keys because we only fire when
  // no text-input-like element is focused).
  useEffect(() => {
    if (mode !== 'edit' || !selectedId) return;
    const onKey = (e) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const ae = document.activeElement;
      const tag = ae && ae.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (ae && ae.isContentEditable)) return;
      e.preventDefault();
      setSceneInternal(prev => {
        const next = deleteItem(prev, selectedId);
        if (onChange) onChange(next);
        return next;
      });
      setSelectedId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, selectedId, onChange]);

  // Unified updater: mutates internal copy and fires onChange (edit mode)
  const updateScene = useCallback((updater) => {
    setSceneInternal(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (onChange) onChange(next);
      return next;
    });
  }, [onChange]);

  // ─── Coordinate conversion (screen → SVG) ────────────────────────────────
  const svgPoint = useCallback((e) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }, []);

  // ─── Drag handling ───────────────────────────────────────────────────────
  const onItemPointerDown = useCallback((e) => {
    if (mode === 'play') return;
    // If a placement tool is active, clicking an existing item cancels the tool.
    if (placementTool) { setPlacementTool(null); setArrowDraft(null); }
    e.stopPropagation();
    const id = e.currentTarget.getAttribute('data-id');
    setSelectedId(id);
    const pos = getItemPos(scene, id);
    const pt = svgPoint(e);
    dragRef.current = { id, offsetX: pt.x - pos.x, offsetY: pt.y - pos.y };
    e.currentTarget.setPointerCapture(e.pointerId);
    document.addEventListener('pointermove', onDragMove);
    document.addEventListener('pointerup', onDragEnd, { once: true });
  }, [scene, mode, placementTool, svgPoint]);

  const onDragMove = useCallback((e) => {
    const d = dragRef.current;
    if (!d) return;
    const pt = svgPoint(e);
    updateScene(prev => setItemPos(prev, d.id, pt.x - d.offsetX, pt.y - d.offsetY));
  }, [svgPoint, updateScene]);

  const onDragEnd = useCallback(() => {
    dragRef.current = null;
    document.removeEventListener('pointermove', onDragMove);
  }, [onDragMove]);

  // ─── Click-to-place (edit mode) ──────────────────────────────────────────
  const onRinkClick = useCallback((e) => {
    if (mode === 'play') {
      // In play mode, zone-click questions are handled by zone hit regions
      // directly (see renderZoneHits). A raw click on empty ice is a no-op.
      return;
    }
    if (!placementTool) return;
    // Ignore clicks that originated on an existing item
    if (e.target.closest('.rnk-draggable')) return;
    const pt = svgPoint(e);
    const x = pt.x, y = pt.y;

    updateScene(prev => {
      const next = { ...prev };
      const id = uid();
      switch (placementTool) {
        case 'teammate': {
          const newItem = {
            id,
            label: (ageGroup && ageGroup !== 'U9') ? 'C' : '',
            zone: nearestZone(x, y),
            x, y,
            hasPuck: false,
            isYou: false,
          };
          next.team = [...(prev.team || []), newItem];
          break;
        }
        case 'opponent': {
          const newItem = { id, zone: nearestZone(x, y), x, y };
          next.opponents = [...(prev.opponents || []), newItem];
          break;
        }
        case 'puck': {
          next.puck = { zone: nearestZone(x, y), x, y };
          break;
        }
        case 'text': {
          const text = window.prompt('Label text:', 'Note');
          if (!text) return prev;
          next.texts = [...(prev.texts || []), { id, text, x, y }];
          break;
        }
        case 'flag': {
          next.flags = [...(prev.flags || []), { id, zone: nearestZone(x, y), x, y }];
          break;
        }
        case 'arrow': {
          if (!arrowDraft) {
            setArrowDraft({ x1: x, y1: y });
            return prev;
          }
          const newArrow = { id, from: nearestZone(arrowDraft.x1, arrowDraft.y1), to: nearestZone(x, y), x1: arrowDraft.x1, y1: arrowDraft.y1, x2: x, y2: y };
          next.arrows = [...(prev.arrows || []), newArrow];
          setArrowDraft(null);
          break;
        }
        default: return prev;
      }
      setSelectedId(id);
      return next;
    });
    // After placing a single-click tool, keep the tool active so user can
    // place multiple in a row. They click the toolbar item again to deactivate.
    if (placementTool !== 'arrow') {
      // no-op: tool stays active
    }
  }, [placementTool, arrowDraft, mode, ageGroup, svgPoint, updateScene]);

  // ─── Zone-click answer (play mode, zone-click questions) ─────────────────
  const onZoneClickAnswer = useCallback((zoneKey) => {
    if (mode !== 'play' || scene.question?.mode !== 'zone-click') return;
    if (lockAnswer && playAnswer) return; // host has recorded result — ignore re-clicks
    const zones = scene.question.zones || {};
    const fb    = scene.question.feedback || {};
    let verdict = 'wrong';
    if ((zones.correct || []).includes(zoneKey)) verdict = 'correct';
    else if ((zones.partial || []).includes(zoneKey)) verdict = 'partial';
    const result = { verdict, choice: zoneKey, feedback: fb[verdict] || '' };
    setPlayAnswer(result);
    if (onAnswer) onAnswer(result);
  }, [mode, scene, onAnswer, lockAnswer, playAnswer]);

  // ─── Derived UI flags ────────────────────────────────────────────────────
  const isZoneClickQuestion = scene.question?.mode === 'zone-click';
  const showZoneOutlines = (mode === 'edit' && isZoneClickQuestion) ||
                           (mode === 'play' && isZoneClickQuestion && !playAnswer);

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className={`rnk-wrap ${className}`} style={styles.wrap}>
      {mode === 'edit' && (
        <>
          <Toolbar
            active={placementTool}
            onSelect={(tool) => {
              setPlacementTool(prev => prev === tool ? null : tool);
              setArrowDraft(null);
            }}
            arrowDraft={arrowDraft}
          />
          <SceneToggles
            scene={scene}
            onLabelToggle={(keys, hide) => updateScene(prev => {
              const set = new Set(prev.hiddenLabels || []);
              keys.forEach(k => hide ? set.add(k) : set.delete(k));
              return { ...prev, hiddenLabels: Array.from(set) };
            })}
            onSceneToggle={(field, on) => updateScene(prev => ({ ...prev, [field]: on }))}
          />
        </>
      )}

      <div style={styles.canvasWrap}>
        <svg ref={svgRef}
             viewBox={`0 0 680 ${VIEWBOX_H}`}
             width="100%"
             style={{ display: 'block', userSelect: 'none', touchAction: 'none', cursor: placementTool ? 'crosshair' : 'default' }}
             onClick={onRinkClick}
             role="img">
          <title>IceIQ offensive-zone scenario</title>
          <defs>
            <marker id="move-arrow" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
              <path d="M2 1 L10 6 L2 11 Z" fill="context-stroke" />
            </marker>
            <clipPath id="rink-clip">
              <path d={`M ${RINK_LEFT + CORNER_R} ${RINK_TOP} L ${RINK_RIGHT - CORNER_R} ${RINK_TOP} A ${CORNER_R} ${CORNER_R} 0 0 1 ${RINK_RIGHT} ${RINK_TOP + CORNER_R} L ${RINK_RIGHT} ${BLUE_LINE_Y + 40} L ${RINK_LEFT} ${BLUE_LINE_Y + 40} L ${RINK_LEFT} ${RINK_TOP + CORNER_R} A ${CORNER_R} ${CORNER_R} 0 0 1 ${RINK_LEFT + CORNER_R} ${RINK_TOP} Z`} />
            </clipPath>
            <radialGradient id="puckGlow" cx="0.35" cy="0.3">
              <stop offset="0%"   stopColor="#FFE88F" />
              <stop offset="60%"  stopColor="#F2C744" />
              <stop offset="100%" stopColor="#B8860B" />
            </radialGradient>
            <pattern id="oppStripes" patternUnits="userSpaceOnUse" width="7" height="7" patternTransform="rotate(45)">
              <rect width="7" height="7" fill="#FFFFFF" />
              <line x1="0" y1="0" x2="0" y2="7" stroke="#2F4A6B" strokeWidth="3.5" />
            </pattern>
          </defs>

          {/* Rink background (dimmed) */}
          <RinkBackground lineOpacity={0.45}
                          showHomePlate={scene.showHomePlate}
                          showZoneOutlines={showZoneOutlines}
                          hiddenLabels={scene.hiddenLabels || []} />

          {/* Faint center-ice IceIQ brand mark — hideable per scene */}
          {!scene.hideBranding && <IceIQBrand variant="ghost" />}

          {/* Zone click hit targets — only active when relevant */}
          {isZoneClickQuestion && (
            <g>
              {Object.entries(ZONE_HIT_SHAPES).map(([k, s]) => (
                <ZoneHit key={k}
                         zoneKey={k}
                         d={s.d}
                         mode={mode}
                         question={scene.question}
                         playAnswer={playAnswer}
                         onEditorClick={(zk) => {
                           if (mode !== 'edit') return;
                           updateScene(prev => cycleZoneAssignment(prev, zk));
                         }}
                         onPlayClick={onZoneClickAnswer} />
              ))}
            </g>
          )}

          {/* Arrows (below players) */}
          {(scene.arrows || []).map(a => <Arrow key={a.id} a={a} />)}

          {/* Flags */}
          {(scene.flags || []).map(f => (
            <Flag key={f.id} item={f}
                  selected={selectedId === f.id}
                  playMode={mode === 'play'}
                  onPointerDown={onItemPointerDown} />
          ))}

          {/* Goalie */}
          {scene.showGoalie && (
            <Goalie selected={selectedId === 'goalie'}
                    playMode={mode === 'play'}
                    onSelect={() => setSelectedId('goalie')} />
          )}

          {/* Teammates */}
          {(scene.team || []).map(p => (
            <Teammate key={p.id} item={p}
                      selected={selectedId === p.id}
                      playMode={mode === 'play'}
                      onPointerDown={onItemPointerDown} />
          ))}

          {/* Opponents */}
          {(scene.opponents || []).map(p => (
            <Opponent key={p.id} item={p}
                      selected={selectedId === p.id}
                      playMode={mode === 'play'}
                      onPointerDown={onItemPointerDown} />
          ))}

          {/* Puck */}
          {scene.puck && (
            <BigPuck puck={scene.puck}
                     selected={selectedId === 'puck'}
                     playMode={mode === 'play'}
                     onPointerDown={onItemPointerDown} />
          )}

          {/* Custom text labels */}
          {(scene.texts || []).map(t => (
            <TextLabel key={t.id} item={t}
                       selected={selectedId === t.id}
                       playMode={mode === 'play'}
                       onPointerDown={onItemPointerDown} />
          ))}

          {/* Arrow-in-progress marker */}
          {arrowDraft && (
            <circle cx={arrowDraft.x1} cy={arrowDraft.y1} r="8"
                    fill="none" stroke="#22A06B" strokeWidth="2.5" strokeDasharray="3 3" />
          )}

          {/* Inline delete handle for the currently selected item */}
          {mode === 'edit' && selectedId && (() => {
            const pos = getItemPos(scene, selectedId);
            if (!pos) return null;
            return (
              <DeleteHandle
                cx={pos.x + 24}
                cy={pos.y - 22}
                onClick={(e) => {
                  e.stopPropagation();
                  updateScene(prev => deleteItem(prev, selectedId));
                  setSelectedId(null);
                }}
              />
            );
          })()}

          {/* Corner IceIQ wordmark — hideable per scene */}
          {!scene.hideBranding && <IceIQBrand variant="corner" />}
        </svg>
      </div>

      {/* Edit-mode helper text */}
      {mode === 'edit' && placementTool && (
        <div style={styles.hint}>
          {placementTool === 'arrow' && !arrowDraft && 'Click the starting point of the arrow.'}
          {placementTool === 'arrow' && arrowDraft && 'Click the ending point of the arrow.'}
          {placementTool !== 'arrow' && `Click anywhere on the ice to place a ${placementTool}. Click the tool again to finish.`}
        </div>
      )}

      {/* Selected item inspector (edit mode) */}
      {mode === 'edit' && selectedId && (
        <Inspector
          scene={scene}
          id={selectedId}
          ageGroup={ageGroup}
          onChange={updateScene}
          onDelete={() => {
            updateScene(prev => deleteItem(prev, selectedId));
            setSelectedId(null);
          }}
        />
      )}

      {/* Play-mode answer feedback — suppressed when host renders its own */}
      {mode === 'play' && playAnswer && !lockAnswer && (
        <AnswerFeedback answer={playAnswer} onReset={() => setPlayAnswer(null)} />
      )}

      {/* Play-mode choice question renderer */}
      {mode === 'play' && scene.question?.mode === 'choice' && !playAnswer && (
        <ChoiceQuestion
          question={scene.question}
          onAnswer={(opt) => {
            const result = { verdict: opt.verdict, choice: opt.text, feedback: opt.feedback };
            setPlayAnswer(result);
            if (onAnswer) onAnswer(result);
          }} />
      )}

      {/* Play-mode zone-click prompt */}
      {mode === 'play' && scene.question?.mode === 'zone-click' && !playAnswer && (
        <div style={styles.zonePrompt}>
          <strong>{scene.question.prompt || 'Click the right spot on the ice.'}</strong>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function Toolbar({ active, onSelect, arrowDraft }) {
  const tools = [
    { key: 'teammate', label: 'Teammate', icon: '👤' },
    { key: 'opponent', label: 'Opponent', icon: '⚔' },
    { key: 'puck',     label: 'Puck',     icon: '●' },
    { key: 'text',     label: 'Text',     icon: 'T' },
    { key: 'flag',     label: 'Flag',     icon: '?' },
    { key: 'arrow',    label: 'Arrow',    icon: '→' },
  ];
  return (
    <div style={styles.toolbar}>
      {tools.map(t => (
        <button key={t.key}
                onClick={() => onSelect(t.key)}
                style={{
                  ...styles.toolBtn,
                  ...(active === t.key ? styles.toolBtnActive : null),
                }}>
          <span style={styles.toolIcon}>{t.icon}</span>
          {t.label}
          {active === t.key && t.key === 'arrow' && arrowDraft ? ' (end?)' : ''}
        </button>
      ))}
      {active && (
        <button onClick={() => onSelect(active)} style={styles.toolCancel}>Stop</button>
      )}
    </div>
  );
}

// Per-scene visibility toggles: goalie, home plate, IceIQ branding,
// and each of the 6 distinct zone labels (left/right "Corner" & "Point"
// are grouped into one chip so you don't have to toggle each side).
function SceneToggles({ scene, onLabelToggle, onSceneToggle }) {
  const hidden = new Set(scene.hiddenLabels || []);
  const labelGroups = [
    { keys: ['corner-L', 'corner-R'], text: 'Corner' },
    { keys: ['behind-net'],           text: 'Behind the net' },
    { keys: ['slot'],                 text: 'Slot' },
    { keys: ['high-slot'],            text: 'High slot' },
    { keys: ['point-L', 'point-R'],   text: 'Point' },
    { keys: ['blue-line'],            text: 'BLUE LINE' },
  ];
  const sceneChips = [
    { field: 'showGoalie',    text: 'Goalie',    showWhenTrue: true  },
    { field: 'showHomePlate', text: 'Home plate', showWhenTrue: true  },
    { field: 'hideBranding',  text: 'IceIQ mark', showWhenTrue: false },
  ];
  return (
    <div style={styles.labelToggles}>
      <span style={styles.labelTogglesLabel}>Show:</span>
      {sceneChips.map(c => {
        const visible = c.showWhenTrue ? !!scene[c.field] : !scene[c.field];
        return (
          <button key={c.field}
                  onClick={() => onSceneToggle(c.field, c.showWhenTrue ? !visible : visible)}
                  style={{ ...styles.labelChip, ...(visible ? null : styles.labelChipOff) }}>
            {visible ? '●' : '○'} {c.text}
          </button>
        );
      })}
      <span style={{ ...styles.labelTogglesLabel, marginLeft: '10px' }}>Labels:</span>
      {labelGroups.map(g => {
        const isHidden = g.keys.every(k => hidden.has(k));
        return (
          <button key={g.keys[0]}
                  onClick={() => onLabelToggle(g.keys, !isHidden)}
                  style={{ ...styles.labelChip, ...(isHidden ? styles.labelChipOff : null) }}>
            {isHidden ? '○' : '●'} {g.text}
          </button>
        );
      })}
    </div>
  );
}

// Small red "×" button rendered in SVG near a selected item — gives visible
// one-click deletion alongside the Inspector delete button and Del/Backspace.
function DeleteHandle({ cx, cy, onClick }) {
  return (
    <g style={{ cursor: 'pointer' }} onClick={onClick}>
      <circle cx={cx} cy={cy} r="11" fill="#E24B4A" stroke="#FFFFFF" strokeWidth="2.5" />
      <line x1={cx - 4.5} y1={cy - 4.5} x2={cx + 4.5} y2={cy + 4.5} stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
      <line x1={cx + 4.5} y1={cy - 4.5} x2={cx - 4.5} y2={cy + 4.5} stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
    </g>
  );
}

function Inspector({ scene, id, ageGroup, onChange, onDelete }) {
  const item = findItem(scene, id);
  if (!item) return null;
  const kind = itemKind(scene, id);
  const canResize = kind === 'team' || kind === 'opp' || kind === 'puck';

  return (
    <div style={styles.inspector}>
      <div style={styles.inspectorHeader}>
        <strong>
          {kind === 'team'   && `Teammate ${item.label ? '(' + item.label + ')' : ''}`}
          {kind === 'opp'    && 'Opponent'}
          {kind === 'puck'   && 'Puck'}
          {kind === 'text'   && 'Text label'}
          {kind === 'flag'   && 'Flag marker'}
          {kind === 'goalie' && 'Goalie'}
        </strong>
        <button style={styles.deleteBtn} onClick={onDelete}>Delete</button>
      </div>
      {canResize && (
        <LabeledField label="Size">
          <input type="range" min="0.6" max="1.6" step="0.1"
                 value={item.size ?? 1}
                 onChange={e => {
                   const size = Number(e.target.value);
                   onChange(prev => kind === 'puck'
                     ? { ...prev, puck: { ...(prev.puck || {}), size } }
                     : updateItem(prev, id, { size }));
                 }}
                 style={{ width: '140px' }} />
          <span style={{ fontSize: '12px', color: '#4A5C6E', marginLeft: '8px' }}>
            {(item.size ?? 1).toFixed(1)}×
          </span>
          {(item.size ?? 1) !== 1 && (
            <button style={styles.sizeResetBtn}
                    onClick={() => onChange(prev => kind === 'puck'
                      ? { ...prev, puck: { ...(prev.puck || {}), size: 1 } }
                      : updateItem(prev, id, { size: 1 }))}>
              Reset
            </button>
          )}
        </LabeledField>
      )}
      {kind === 'team' && (
        <>
          {(ageGroup !== 'U9') && (
            <LabeledField label="Position">
              <select value={item.label || ''}
                      onChange={e => onChange(prev => updateItem(prev, id, { label: e.target.value }))}
                      style={styles.input}>
                {['', 'C', 'LW', 'RW', 'LD', 'RD'].map(p =>
                  <option key={p} value={p}>{p || '—'}</option>
                )}
              </select>
            </LabeledField>
          )}
          <LabeledField label="Has puck">
            <input type="checkbox" checked={!!item.hasPuck}
                   onChange={e => onChange(prev => setPuckCarrier(prev, id, e.target.checked))} />
          </LabeledField>
          <LabeledField label='"You" marker'>
            <input type="checkbox" checked={!!item.isYou}
                   onChange={e => onChange(prev => setYouMarker(prev, id, e.target.checked))} />
          </LabeledField>
        </>
      )}
      {kind === 'text' && (
        <LabeledField label="Text">
          <input value={item.text || ''}
                 onChange={e => onChange(prev => updateItem(prev, id, { text: e.target.value }))}
                 style={styles.input} />
        </LabeledField>
      )}
      {kind === 'goalie' && (
        <div style={{ fontSize: '12px', color: '#4A5C6E', padding: '4px 0' }}>
          The goalie stays in the crease. Use Delete or the red × to remove;
          re-enable with the "Goalie" chip above.
        </div>
      )}
    </div>
  );
}

function LabeledField({ label, children }) {
  return (
    <div style={styles.field}>
      <label style={styles.fieldLabel}>{label}</label>
      <div>{children}</div>
    </div>
  );
}

function ChoiceQuestion({ question, onAnswer }) {
  return (
    <div style={styles.playBlock}>
      <p style={styles.prompt}>{question.prompt}</p>
      <div style={styles.optList}>
        {(question.options || []).map((opt, i) => (
          <button key={i} onClick={() => onAnswer(opt)} style={styles.optBtn}>
            {opt.text}
          </button>
        ))}
      </div>
    </div>
  );
}

function AnswerFeedback({ answer, onReset }) {
  const tones = {
    correct: { bg: '#EAF3DE', fg: '#27500A', label: '✓ Correct!' },
    partial: { bg: '#FAEEDA', fg: '#633806', label: '~ Partial credit' },
    wrong:   { bg: '#FCEBEB', fg: '#501313', label: '✗ Not quite' },
  };
  const t = tones[answer.verdict] || tones.wrong;
  return (
    <div style={{ ...styles.feedback, background: t.bg, color: t.fg }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{t.label}</div>
      <div>{answer.feedback}</div>
      <button style={styles.resetBtn} onClick={onReset}>Try another</button>
    </div>
  );
}

function ZoneHit({ zoneKey, d, mode, question, playAnswer, onEditorClick, onPlayClick }) {
  const zones = question?.zones || { correct: [], partial: [], wrong: [] };
  let fill = 'rgba(55, 138, 221, 0.08)';
  let stroke = 'rgba(55, 138, 221, 0.0)';
  if (mode === 'edit') {
    if (zones.correct?.includes(zoneKey)) { fill = 'rgba(99, 153, 34, 0.28)'; stroke = '#639922'; }
    else if (zones.partial?.includes(zoneKey)) { fill = 'rgba(186, 117, 23, 0.28)'; stroke = '#BA7517'; }
    else if (zones.wrong?.includes(zoneKey))   { fill = 'rgba(163, 45, 45, 0.24)'; stroke = '#A32D2D'; }
  }
  if (mode === 'play' && playAnswer && playAnswer.choice === zoneKey) {
    const map = { correct: '#639922', partial: '#BA7517', wrong: '#A32D2D' };
    stroke = map[playAnswer.verdict] || stroke;
    fill = stroke.replace(')', ', 0.25)').replace('rgb', 'rgba') || fill;
  }
  return (
    <path d={d}
          fill={fill}
          stroke={stroke}
          strokeWidth="2"
          strokeDasharray="4 3"
          style={{ cursor: 'pointer' }}
          onClick={(e) => {
            e.stopPropagation();
            if (mode === 'edit') onEditorClick(zoneKey);
            else onPlayClick(zoneKey);
          }} />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STATE HELPERS (pure — take scene, return new scene)
// ─────────────────────────────────────────────────────────────────────────────
function findItem(scene, id) {
  if (id === 'puck') return scene.puck;
  if (id === 'goalie') return { x: GOALIE_POS.x, y: GOALIE_POS.y };
  return (scene.team || []).find(x => x.id === id)
      || (scene.opponents || []).find(x => x.id === id)
      || (scene.texts || []).find(x => x.id === id)
      || (scene.flags || []).find(x => x.id === id)
      || null;
}

function itemKind(scene, id) {
  if (id === 'puck') return 'puck';
  if (id === 'goalie') return 'goalie';
  if ((scene.team || []).some(x => x.id === id)) return 'team';
  if ((scene.opponents || []).some(x => x.id === id)) return 'opp';
  if ((scene.texts || []).some(x => x.id === id)) return 'text';
  if ((scene.flags || []).some(x => x.id === id)) return 'flag';
  return null;
}

function getItemPos(scene, id) {
  if (id === 'goalie') return { x: GOALIE_POS.x, y: GOALIE_POS.y };
  const item = findItem(scene, id);
  return resolvePos(item);
}

function setItemPos(scene, id, x, y) {
  return mutateItem(scene, id, { x, y });
}

function updateItem(scene, id, patch) {
  return mutateItem(scene, id, patch);
}

function mutateItem(scene, id, patch) {
  if (id === 'puck') return { ...scene, puck: { ...(scene.puck || {}), ...patch } };
  if ((scene.team || []).some(x => x.id === id)) return { ...scene, team: scene.team.map(x => x.id === id ? { ...x, ...patch } : x) };
  if ((scene.opponents || []).some(x => x.id === id)) return { ...scene, opponents: scene.opponents.map(x => x.id === id ? { ...x, ...patch } : x) };
  if ((scene.texts || []).some(x => x.id === id)) return { ...scene, texts: scene.texts.map(x => x.id === id ? { ...x, ...patch } : x) };
  if ((scene.flags || []).some(x => x.id === id)) return { ...scene, flags: scene.flags.map(x => x.id === id ? { ...x, ...patch } : x) };
  return scene;
}

function deleteItem(scene, id) {
  if (id === 'puck') return { ...scene, puck: null };
  if (id === 'goalie') return { ...scene, showGoalie: false };
  return {
    ...scene,
    team:      (scene.team || []).filter(x => x.id !== id),
    opponents: (scene.opponents || []).filter(x => x.id !== id),
    texts:     (scene.texts || []).filter(x => x.id !== id),
    flags:     (scene.flags || []).filter(x => x.id !== id),
    arrows:    (scene.arrows || []).filter(x => x.id !== id),
  };
}

function setPuckCarrier(scene, id, carrying) {
  return {
    ...scene,
    team: (scene.team || []).map(x => ({
      ...x,
      hasPuck: x.id === id ? carrying : false,
    })),
  };
}

function setYouMarker(scene, id, isYou) {
  return {
    ...scene,
    team: (scene.team || []).map(x => ({
      ...x,
      isYou: x.id === id ? isYou : false,
    })),
  };
}

// Cycle a zone through: unassigned → correct → partial → wrong → unassigned
function cycleZoneAssignment(scene, zoneKey) {
  const z = scene.question?.zones || { correct: [], partial: [], wrong: [] };
  const inC = z.correct?.includes(zoneKey);
  const inP = z.partial?.includes(zoneKey);
  const inW = z.wrong?.includes(zoneKey);
  const without = {
    correct: (z.correct || []).filter(k => k !== zoneKey),
    partial: (z.partial || []).filter(k => k !== zoneKey),
    wrong:   (z.wrong   || []).filter(k => k !== zoneKey),
  };
  let next;
  if (!inC && !inP && !inW)      next = { ...without, correct: [...without.correct, zoneKey] };
  else if (inC)                  next = { ...without, partial: [...without.partial, zoneKey] };
  else if (inP)                  next = { ...without, wrong:   [...without.wrong,   zoneKey] };
  else                            next = without;
  return { ...scene, question: { ...(scene.question || {}), mode: 'zone-click', zones: next } };
}

// Find the zone whose anchor is closest to (x,y) — used when click-placing
function nearestZone(x, y) {
  let bestKey = 'slot', bestDist = Infinity;
  for (const [k, z] of Object.entries(ZONES)) {
    const dx = z.x - x, dy = z.y - y;
    const d = dx * dx + dy * dy;
    if (d < bestDist) { bestDist = d; bestKey = k; }
  }
  return bestKey;
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES (inline so the component is self-contained — no CSS imports needed)
// ─────────────────────────────────────────────────────────────────────────────
const styles = {
  wrap: {
    fontFamily: "'Anthropic Sans', -apple-system, system-ui, sans-serif",
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  toolbar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    padding: '8px 10px',
    background: '#F3F6FA',
    borderRadius: '12px',
    border: '1px solid #D6DEE8',
    alignItems: 'center',
  },
  toolBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 12px',
    fontSize: '13px',
    fontWeight: 500,
    borderRadius: '8px',
    border: '1px solid #D6DEE8',
    background: '#FFFFFF',
    color: '#1F2937',
    cursor: 'pointer',
  },
  toolBtnActive: {
    background: '#1E5FA5',
    color: '#FFFFFF',
    borderColor: '#0C447C',
  },
  toolIcon: {
    fontWeight: 700,
    fontSize: '14px',
  },
  toolCancel: {
    marginLeft: 'auto',
    padding: '7px 12px',
    fontSize: '12px',
    borderRadius: '8px',
    border: '1px solid #E24B4A',
    background: '#FCEBEB',
    color: '#791F1F',
    cursor: 'pointer',
  },
  labelToggles: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '5px',
    padding: '6px 10px',
    background: '#F8FAFC',
    borderRadius: '10px',
    border: '1px solid #D6DEE8',
    alignItems: 'center',
  },
  labelTogglesLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#4A5C6E',
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    marginRight: '4px',
  },
  labelChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 9px',
    fontSize: '11px',
    fontWeight: 500,
    borderRadius: '12px',
    border: '1px solid #B8D4E8',
    background: '#FFFFFF',
    color: '#1F2937',
    cursor: 'pointer',
  },
  labelChipOff: {
    background: '#F3F6FA',
    color: '#9AA8B6',
    borderColor: '#D6DEE8',
  },
  sizeResetBtn: {
    marginLeft: '10px',
    padding: '3px 9px',
    fontSize: '11px',
    borderRadius: '6px',
    border: '1px solid #D6DEE8',
    background: '#FFFFFF',
    color: '#4A5C6E',
    cursor: 'pointer',
  },
  canvasWrap: {
    background: '#EAF3FB',
    borderRadius: '18px',
    padding: '14px',
    border: '2px solid #B8D4E8',
  },
  hint: {
    fontSize: '13px',
    padding: '8px 12px',
    background: '#FFF7D6',
    border: '1px solid #E8C76A',
    borderRadius: '8px',
    color: '#6B4A00',
  },
  inspector: {
    padding: '10px 12px',
    background: '#F8FAFC',
    border: '1px solid #D6DEE8',
    borderRadius: '10px',
  },
  inspectorHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  deleteBtn: {
    padding: '4px 10px',
    fontSize: '12px',
    borderRadius: '6px',
    border: '1px solid #E24B4A',
    background: '#FCEBEB',
    color: '#791F1F',
    cursor: 'pointer',
  },
  field: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '4px 0',
  },
  fieldLabel: {
    fontSize: '12px',
    color: '#4A5C6E',
    fontWeight: 500,
    minWidth: '100px',
  },
  input: {
    padding: '5px 8px',
    fontSize: '13px',
    borderRadius: '6px',
    border: '1px solid #D6DEE8',
    fontFamily: 'inherit',
  },
  playBlock: {
    padding: '12px',
    background: '#F8FAFC',
    borderRadius: '10px',
  },
  prompt: {
    fontSize: '15px',
    fontWeight: 500,
    margin: '0 0 10px 0',
    color: '#1F2937',
  },
  optList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  optBtn: {
    textAlign: 'left',
    padding: '10px 12px',
    fontSize: '14px',
    borderRadius: '8px',
    border: '1px solid #D6DEE8',
    background: '#FFFFFF',
    cursor: 'pointer',
  },
  zonePrompt: {
    padding: '10px 14px',
    background: '#EAF3FB',
    borderRadius: '10px',
    color: '#0B2942',
    fontSize: '15px',
  },
  feedback: {
    padding: '12px 14px',
    borderRadius: '10px',
    fontSize: '14px',
    lineHeight: 1.5,
  },
  resetBtn: {
    display: 'block',
    marginTop: '8px',
    padding: '5px 10px',
    fontSize: '12px',
    borderRadius: '6px',
    border: '1px solid #D6DEE8',
    background: '#FFFFFF',
    cursor: 'pointer',
  },
};

window.IceIQRink = Rink;
window.IceIQEmptyScene = emptyScene;
window.dispatchEvent(new CustomEvent('iceiq-rink-ready'));
})();
