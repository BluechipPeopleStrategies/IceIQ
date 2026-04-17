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
    <svg width={size} height={size} viewBox="0 0 32 32" aria-label="IceIQ logo" style={{display:"block",flexShrink:0}}>
      <path d="M 8 11.5 C 7.5 9.5, 9 7.2, 10.8 7 C 11.5 5.8, 13 5.5, 14 6.5 C 15 5.5, 16.5 5.5, 17.5 6.5 C 18.8 5.5, 20.5 5.8, 21.3 7 C 23 6.8, 24.5 8.3, 24.5 10.3 C 26 10.8, 26 12.3, 24.8 12.8 C 25.3 13.5, 25 14.8, 23.8 15.2 C 23.5 16.3, 22 16.8, 20.5 16.3 C 19.8 17.2, 18 17.3, 17 16.5 C 16 17.3, 14 17.3, 13 16.5 C 11.5 17, 9.8 16.5, 9.2 15.3 C 7.8 14.8, 7 13.3, 7.8 12 C 6.8 11.5, 7.2 10.8, 8 11.5 Z" fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round"/>
      <path d="M 10.5 8.5 Q 12.5 7.5 13.8 8.8 Q 15.5 7.8 16.8 8.8 Q 18.3 7.8 19.5 8.8" stroke={color} strokeWidth="0.85" fill="none" strokeLinecap="round"/>
      <path d="M 19.5 7.5 Q 21.5 8.2 23.5 7.8" stroke={color} strokeWidth="0.85" fill="none" strokeLinecap="round"/>
      <path d="M 9 11 Q 12 10, 15 11.3 Q 18 10.2, 21 11.3 Q 23 10.3, 25 11.3" stroke={color} strokeWidth="0.85" fill="none" strokeLinecap="round"/>
      <path d="M 9.3 13.8 Q 12.5 13, 16 14 Q 19.5 13.2, 23 14.2" stroke={color} strokeWidth="0.85" fill="none" strokeLinecap="round"/>
      <line x1="24" y1="17" x2="7" y2="28" stroke={color} strokeWidth="2.2" strokeLinecap="round"/>
      <path d="M 7 28 Q 3 28.5, 2.5 26.2" stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="21.5" y1="18.6" x2="24" y2="17" stroke="#0d1525" strokeWidth="1.1" strokeLinecap="round"/>
      <line x1="8" y1="17" x2="25" y2="28" stroke={color} strokeWidth="2.2" strokeLinecap="round"/>
      <path d="M 25 28 Q 29 28.5, 29.5 26.2" stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="10.5" y1="18.6" x2="8" y2="17" stroke="#0d1525" strokeWidth="1.1" strokeLinecap="round"/>
      <ellipse cx="16" cy="30" rx="3.2" ry="1.1" fill={color}/>
      <ellipse cx="16" cy="30" rx="3.2" ry="1.1" fill="none" stroke="#0d1525" strokeWidth="0.3"/>
    </svg>
  );
}

export const Screen = ({children, pad=true}) => (
  <div style={{minHeight:"100vh",background:C.bg,color:C.white,fontFamily:FONT.body}}>
    {pad ? <div style={{padding:"1.5rem 1.25rem",maxWidth:560,margin:"0 auto"}}>{children}</div> : children}
  </div>
);

export const Card = ({children, style, onClick, glow}) => (
  <div onClick={onClick} style={{
    background:C.bgCard,
    border:`1px solid ${glow?C.goldBorder:C.border}`,
    borderRadius:16,
    padding:"1.25rem",
    boxShadow: glow?"0 0 24px rgba(201,168,76,0.08)":"none",
    cursor:onClick?"pointer":"default",
    transition:"all .2s",
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
