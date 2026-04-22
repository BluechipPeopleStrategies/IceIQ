// Shared design tokens, primitives, and small constants — imported by App.jsx and lazy-loaded screens.
// Keeping these in one place lets Rollup split screen chunks without pulling in the rest of App.jsx.

export const C = {
  // Oilers navy family for surfaces
  bg:       "#041E42",
  bgCard:   "#0a2850",
  bgElevated:"#0e3566",
  bgGlass:  "rgba(255,255,255,0.05)",
  // Primary brand: Oilers orange (token name kept as `gold` to avoid ~500 call-site renames)
  gold:     "#FC4C02",
  goldDim:  "rgba(252,76,2,0.15)",
  goldBorder:"rgba(252,76,2,0.35)",
  // Secondary accent: retro-dynasty deep orange (token name kept as `purple` to avoid renames)
  purple:   "#CF4520",
  purpleDim:"rgba(207,69,32,0.14)",
  purpleBorder:"rgba(207,69,32,0.32)",
  // Info/data blue — tuned to sit on navy
  blue:     "#5BA4E8",
  blueDim:  "rgba(91,164,232,0.12)",
  // Semantic — unchanged (universal error/success/warning conventions)
  green:    "#22c55e",
  greenDim: "rgba(34,197,94,0.1)",
  greenBorder:"rgba(34,197,94,0.25)",
  yellow:   "#eab308",
  yellowDim:"rgba(234,179,8,0.1)",
  red:      "#ef4444",
  redDim:   "rgba(239,68,68,0.08)",
  redBorder:"rgba(239,68,68,0.25)",
  white:    "#f8fafc",
  dim:      "rgba(248,250,252,0.6)",
  dimmer:   "rgba(248,250,252,0.35)",
  dimmest:  "rgba(248,250,252,0.08)",
  border:   "rgba(255,255,255,0.08)",
  borderMid:"rgba(255,255,255,0.14)",
  ice:      "#e8f4fb",
  rink:     "#0e3566",
};

export const FONT = {
  display: "'Anton', 'Oswald', 'Barlow Condensed', Impact, sans-serif",
  body: "'DM Sans', 'Inter', system-ui, sans-serif",
};

export const LEVELS = ["U7 / Initiation","U9 / Novice","U11 / Atom","U13 / Peewee","U15 / Bantam","U18 / Midget"];
export const POSITIONS = ["Forward","Defense","Goalie","Multiple"];
export const POSITIONS_U11UP = ["Forward","Defense","Goalie"];
export const SEASONS = ["2025-26","2026 Spring/Summer","2026-27"];

export function IceIQLogo({ size = 32, color = "#FC4C02" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-label="IceIQ logo" style={{display:"block",flexShrink:0}}>
      {/* Outer circle ring */}
      <circle cx="20" cy="20" r="18" fill="none" stroke={color} strokeWidth="1.5" opacity="0.4"/>

      {/* Hockey stick — modern clean lines */}
      <path d="M 20 8 L 20 24" stroke={color} strokeWidth="2.4" strokeLinecap="round" fill="none"/>
      <path d="M 20 24 Q 28 24 32 28" stroke={color} strokeWidth="2.4" strokeLinecap="round" fill="none"/>

      {/* Puck — filled circle with motion lines */}
      <circle cx="20" cy="10" r="3.5" fill={color}/>

      {/* Motion blur lines (indicate speed/growth) */}
      <line x1="12" y1="10" x2="8" y2="10" stroke={color} strokeWidth="1.2" opacity="0.5" strokeLinecap="round"/>
      <line x1="11" y1="6" x2="7" y2="4" stroke={color} strokeWidth="1" opacity="0.4" strokeLinecap="round"/>
      <line x1="11" y1="14" x2="7" y2="16" stroke={color} strokeWidth="1" opacity="0.4" strokeLinecap="round"/>

      {/* Ice accent — subtle triangles at base */}
      <path d="M 18 32 L 20 28 L 22 32" fill="none" stroke={color} strokeWidth="1" opacity="0.6" strokeLinejoin="round"/>
    </svg>
  );
}

export const RINK_ZONE_DEFS = [
  { id: "dz-left-corner",  label: "Left Corner",    x: 0,   y: 50, w: 55,  h: 35 },
  { id: "dz-left-point",   label: "Left Point",     x: 0,   y: 0,  w: 55,  h: 35 },
  { id: "dz-slot",         label: "Slot",           x: 55,  y: 15, w: 90,  h: 55 },
  { id: "dz-right-corner", label: "Right Corner",   x: 145, y: 50, w: 55,  h: 35 },
  { id: "dz-right-point",  label: "Right Point",    x: 145, y: 0,  w: 55,  h: 35 },
  { id: "dz-behind-net",   label: "Behind Net",     x: 55,  y: 62, w: 90,  h: 23 },
  { id: "nz-left",         label: "Neutral Left",   x: 0,   y: 0,  w: 45,  h: 85 },
  { id: "nz-center",       label: "Neutral Center", x: 45,  y: 0,  w: 110, h: 85 },
  { id: "nz-right",        label: "Neutral Right",  x: 155, y: 0,  w: 45,  h: 85 },
  { id: "oz-slot",         label: "Offensive Slot", x: 55,  y: 15, w: 90,  h: 55 },
  { id: "oz-left-wing",    label: "Left Wing",      x: 0,   y: 0,  w: 55,  h: 85 },
  { id: "oz-right-wing",   label: "Right Wing",     x: 145, y: 0,  w: 55,  h: 85 },
];

export function RinkDiagramZones({ zones, onZoneClick, selected, correct, dark = false }) {
  const bg = dark ? "#03090f" : "#e8f4f8";
  const iceColor = dark ? "#0a1929" : "#dceefa";

  return (
    <svg width="100%" height="auto" viewBox="0 0 200 85" style={{maxWidth:"100%",border:`1px solid ${C.border}`,borderRadius:12,background:bg}} preserveAspectRatio="xMidYMid meet">
      <defs>
        <filter id="ice-glow">
          <feGaussianBlur stdDeviation="1" />
        </filter>
      </defs>

      {/* Ice surface */}
      <rect x="0" y="0" width="200" height="85" rx="8" fill={iceColor}/>

      {/* Red center line */}
      <line x1="100" y1="0" x2="100" y2="85" stroke="#ef4444" strokeWidth="0.8" opacity="0.6"/>

      {/* Blue lines */}
      <line x1="55" y1="0" x2="55" y2="85" stroke="#5BA4E8" strokeWidth="1.2" opacity="0.5"/>
      <line x1="145" y1="0" x2="145" y2="85" stroke="#5BA4E8" strokeWidth="1.2" opacity="0.5"/>

      {/* Left net area */}
      <rect x="0" y="30" width="8" height="25" fill="#ef4444" opacity="0.15" rx="2"/>

      {/* Right net area */}
      <rect x="192" y="30" width="8" height="25" fill="#ef4444" opacity="0.15" rx="2"/>

      {/* Face-off circles — subtle dots */}
      <circle cx="40" cy="23" r="1.5" fill="#5BA4E8" opacity="0.3"/>
      <circle cx="40" cy="62" r="1.5" fill="#5BA4E8" opacity="0.3"/>
      <circle cx="160" cy="23" r="1.5" fill="#5BA4E8" opacity="0.3"/>
      <circle cx="160" cy="62" r="1.5" fill="#5BA4E8" opacity="0.3"/>

      {/* Zone overlay rects */}
      {zones && zones.map(zoneId => {
        const zone = RINK_ZONE_DEFS.find(z => z.id === zoneId);
        if (!zone) return null;
        const isSelected = zoneId === selected;
        const isCorrect = zoneId === correct;
        let fillColor = C.dimmest;
        let fillOpacity = 0.15;
        if (isCorrect) {
          fillColor = C.green;
          fillOpacity = 0.25;
        } else if (isSelected) {
          fillColor = C.gold;
          fillOpacity = 0.3;
        }
        return (
          <g key={zoneId}>
            <rect
              x={zone.x} y={zone.y} width={zone.w} height={zone.h}
              fill={fillColor} fillOpacity={fillOpacity}
              stroke={isCorrect ? C.green : isSelected ? C.gold : C.border}
              strokeWidth={isCorrect || isSelected ? 1.2 : 0.5}
              onClick={() => onZoneClick && onZoneClick(zoneId)}
              style={{cursor: onZoneClick ? "pointer" : "default", transition:"all 0.2s"}}
            />
            {onZoneClick && (
              <text
                x={zone.x + zone.w / 2} y={zone.y + zone.h / 2 + 1.5}
                textAnchor="middle" dominantBaseline="middle"
                fontSize="4" fill={C.dim} fontWeight="600" pointerEvents="none"
              >
                {zone.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export const Screen = ({children, pad=true}) => (
  <div style={{
    minHeight:"100vh",
    background:`linear-gradient(135deg, ${C.bg} 0%, ${C.bg} 70%, rgba(30, 87, 153, 0.15) 100%)`,
    backgroundAttachment:"fixed",
    color:C.white,
    fontFamily:FONT.body,
    position:"relative",
    overflow:"hidden"
  }}>
    <div style={{
      position:"absolute",
      top:0,left:0,right:0,bottom:0,
      backgroundImage:`
        linear-gradient(90deg, transparent 0%, rgba(201, 168, 76, 0.02) 50%, transparent 100%),
        repeating-linear-gradient(0deg, transparent 0px, rgba(59, 130, 246, 0.03) 2px, transparent 4px)
      `,
      pointerEvents:"none"
    }}/>
    {pad ? <div style={{padding:"1.5rem 1.25rem",maxWidth:560,margin:"0 auto",position:"relative",zIndex:1}}>{children}</div> : children}
  </div>
);

export const Card = ({children, style, onClick, glow}) => (
  <div onClick={onClick} style={{
    background:"rgba(13, 21, 37, 0.45)",
    backdropFilter:"blur(12px)",
    WebkitBackdropFilter:"blur(12px)",
    border:`1px solid ${glow?C.goldBorder:"rgba(255, 255, 255, 0.1)"}`,
    borderRadius:16,
    padding:"1.25rem",
    boxShadow: glow?"0 0 24px rgba(252,76,2,0.08)":"0 8px 32px rgba(0, 0, 0, 0.1)",
    cursor:onClick?"pointer":"default",
    transition:"all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease",
    animation:"slideInUp 0.5s ease-out",
    ...style
  }}>{children}</div>
);

export const Pill = ({children, color=C.purple, bg}) => (
  <span style={{
    display:"inline-flex",alignItems:"center",
    background:bg||`${color}18`,
    color,
    border:`1px solid ${color}35`,
    borderRadius:20,
    padding:"3px 10px",
    fontSize:11,
    fontWeight:700,
    letterSpacing:".04em",
  }}>{children}</span>
);

export const Label = ({children, style}) => (
  <div style={{fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:C.dimmer,fontWeight:700,marginBottom:".6rem",...style}}>{children}</div>
);

export const PrimaryBtn = ({onClick,children,disabled,style}) => (
  <button onClick={onClick} disabled={disabled} style={{
    background:disabled?"rgba(252,76,2,.2)":C.gold,
    color:disabled?"rgba(252,76,2,.4)":C.bg,
    border:"none",borderRadius:12,
    padding:"1rem 1.25rem",
    cursor:disabled?"default":"pointer",
    fontWeight:800,fontSize:15,
    fontFamily:FONT.body,
    width:"100%",
    letterSpacing:".02em",
    transition:"all .15s",
    ...style
  }}>{children}</button>
);

export const SecBtn = ({onClick,children,style}) => (
  <button onClick={onClick} style={{
    background:"none",
    color:C.dim,
    border:`1px solid ${C.border}`,
    borderRadius:12,padding:"1rem 1.25rem",
    cursor:"pointer",fontWeight:600,fontSize:14,
    fontFamily:FONT.body,width:"100%",
    transition:"all .15s",
    ...style
  }}>{children}</button>
);

export const BackBtn = ({onClick}) => (
  <button onClick={onClick} style={{
    background:"none",border:`1px solid ${C.border}`,
    color:C.dimmer,borderRadius:8,
    padding:".4rem .9rem",cursor:"pointer",
    fontSize:13,fontFamily:FONT.body,
    marginBottom:"1.5rem",display:"inline-flex",
    alignItems:"center",gap:".4rem"
  }}>← Back</button>
);

export const ProgressBar = ({value, max, color=C.purple, height=5}) => (
  <div style={{height,background:C.dimmest,borderRadius:height,overflow:"hidden"}}>
    <div style={{height:"100%",width:`${Math.min(100,(value/max)*100)}%`,background:color,borderRadius:height,transition:"width .4s ease"}}/>
  </div>
);

export const StickyHeader = ({children}) => (
  <div style={{
    position:"sticky",top:0,zIndex:20,
    background:`${C.bg}f5`,
    backdropFilter:"blur(16px)",
    WebkitBackdropFilter:"blur(16px)",
    borderBottom:`1px solid ${C.border}`,
    padding:".9rem 1.25rem",
  }}>{children}</div>
);
