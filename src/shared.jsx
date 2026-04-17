// Shared design tokens, primitives, and small constants — imported by App.jsx and lazy-loaded screens.
// Keeping these in one place lets Rollup split screen chunks without pulling in the rest of App.jsx.

export const C = {
  bg:       "#080e1a",
  bgCard:   "#0d1525",
  bgElevated:"#111e33",
  bgGlass:  "rgba(255,255,255,0.04)",
  gold:     "#c9a84c",
  goldDim:  "rgba(201,168,76,0.15)",
  goldBorder:"rgba(201,168,76,0.3)",
  purple:   "#7c6fcd",
  purpleDim:"rgba(124,111,205,0.12)",
  purpleBorder:"rgba(124,111,205,0.3)",
  blue:     "#3b82f6",
  blueDim:  "rgba(59,130,246,0.1)",
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
  border:   "rgba(255,255,255,0.07)",
  borderMid:"rgba(255,255,255,0.12)",
  ice:      "#e8f4fb",
  rink:     "#1e5799",
};

export const FONT = {
  display: "'Anton', 'Oswald', 'Barlow Condensed', Impact, sans-serif",
  body: "'DM Sans', 'Inter', system-ui, sans-serif",
};

export const LEVELS = ["U7 / Initiation","U9 / Novice","U11 / Atom","U13 / Peewee","U15 / Bantam","U18 / Midget"];
export const POSITIONS = ["Forward","Defense","Goalie","Not Sure"];
export const POSITIONS_U11UP = ["Forward","Defense","Goalie"];
export const SEASONS = ["2025-26","2026 Spring/Summer","2026-27"];

export function IceIQLogo({ size = 32, color = "#c9a84c" }) {
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
    boxShadow: glow?"0 0 24px rgba(201,168,76,0.08)":"0 8px 32px rgba(0, 0, 0, 0.1)",
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
    background:disabled?"rgba(201,168,76,.2)":C.gold,
    color:disabled?"rgba(201,168,76,.4)":C.bg,
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
