// Shared design tokens, primitives, and small constants — imported by App.jsx and lazy-loaded screens.
// Keeping these in one place lets Rollup split screen chunks without pulling in the rest of App.jsx.

export const C = {
  // BlueChip palette selected by the owner; keep hex tokens for alpha suffix callers.
  bg:       "#0B1A33",
  bgCard:   "#14243C",
  bgElevated:"#20324C",
  bgGlass:  "rgba(255,255,255,0.05)",
  // Legacy token names retained; brand accents now use BlueChip gold.
  gold:     "#C9A24B",
  goldDim:  "rgba(201,162,75,0.12)",
  goldBorder:"rgba(201,162,75,0.36)",
  purple:   "#C9A24B",
  purpleDim:"rgba(201,162,75,0.12)",
  purpleBorder:"rgba(201,162,75,0.32)",
  // Semantic info blue remains distinct from the brand.
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
  white:    "#F5EFE6",
  dim:      "rgba(248,250,252,0.6)",
  // Small secondary labels retain at least 4.9:1 on the three shared navy surfaces.
  dimmer:   "rgba(248,250,252,0.55)",
  dimmest:  "rgba(248,250,252,0.08)",
  border:   "rgba(255,255,255,0.08)",
  borderMid:"rgba(255,255,255,0.14)",
  ice:      "#e8f4fb",
  rink:     "#20324C",
  gradientPrimary: "linear-gradient(145deg, #E7CE96, #C9A24B 55%, #B48A36)",
};

export const FONT = {
  display: "'Playfair Display', Georgia, serif",
  body: "'Inter', system-ui, sans-serif",
};

export const LEVELS = ["U7 / Initiation","U9 / Novice","U11 / Atom","U13 / Peewee","U15 / Bantam","U18 / Midget"];

// TEMPORARY (2026-06): single mixed-age "Pro" experience while the bank is
// small. When true: onboarding skips the age-group picker, the quiz pulls
// questions from ALL levels mixed (a kid may get a U7 then a U15 question),
// and all formats are unlocked. The LEVELS / tier system is untouched —
// flip this back to false to restore per-age selection once the bank is large.
export const ALL_AGES_MODE = true;
export const DEFAULT_MIX_LEVEL = "U11 / Atom"; // placeholder level stored on new profiles while ALL_AGES_MODE is on
export const POSITIONS = ["Forward","Defense","Goalie","Multiple"];
export const POSITIONS_U11UP = ["Forward","Defense","Goalie"];
export const SEASONS = ["2025-26","2026 Spring/Summer","2026-27"];

// Eye-Puck mark — a hockey puck head-on with a stylized eye + motion swoosh
// (eyebrow). Plays on "reads" — anticipation, eyes-up. Pupil is offset
// up-right to suggest forward gaze. The single-color `mono` mode is for
// places where the gradient + multi-tone fill would be too busy (small
// favicons, monochrome contexts). The `wordmark` prop renders the full
// horizontal lockup with "RINK READS" set in the BlueChip display font.
export function RinkReadsLogo({ size = 32, color, mono = false, wordmark = false }) {
  // Unique gradient id per render so multiple logos on a page don't collide.
  const gid = `rrIris-${Math.random().toString(36).slice(2, 8)}`;
  const stroke = color || C.white;
  const fillIris = mono ? (color || C.gold) : `url(#${gid})`;
  const fillPuckOuter = mono ? (color || C.bg) : C.bg;
  const fillPuckInner = mono ? "#f8fafc" : "#f8fafc";
  const fillPupil = mono ? (color || C.bg) : C.bg;
  const fillEyebrow = mono ? (color || C.gold) : `url(#${gid})`;

  const Icon = (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-label="RinkReads logo" style={{display:"block",flexShrink:0}}>
      <defs>
        <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E7CE96"/>
          <stop offset="100%" stopColor={C.gold}/>
        </linearGradient>
      </defs>
      <circle cx="32" cy="35" r="26" fill={fillPuckOuter}/>
      <circle cx="32" cy="35" r="22" fill={fillPuckInner}/>
      <circle cx="32" cy="35" r="13" fill={fillIris}/>
      <circle cx="34" cy="33" r="5.5" fill={fillPupil}/>
      <circle cx="35.4" cy="31.4" r="1.8" fill="#f8fafc" opacity="0.9"/>
      <path d="M 12 14 Q 32 6 52 14" stroke={fillEyebrow} strokeWidth="3.5" fill="none" strokeLinecap="round"/>
    </svg>
  );

  if (!wordmark) return Icon;

  // Horizontal lockup — icon + "RINK READS" in Playfair uppercase. Sized so the
  // wordmark cap-height matches roughly 50% of the icon height.
  const wordSize = Math.round(size * 0.52);
  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:Math.max(6, size*0.18),flexShrink:0}}>
      {Icon}
      <span style={{
        fontFamily:FONT.display,
        fontSize: wordSize,
        lineHeight: 1,
        letterSpacing: "0.03em",
        textTransform: "uppercase",
        color: stroke,
        whiteSpace: "nowrap",
      }}>
        Rink <span style={{
          background: mono ? undefined : C.gradientPrimary,
          WebkitBackgroundClip: mono ? undefined : "text",
          WebkitTextFillColor: mono ? undefined : "transparent",
          color: mono ? (color || C.gold) : undefined,
        }}>Reads</span>
      </span>
    </span>
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
    background:`radial-gradient(ellipse at 85% 0%, rgba(201,162,75,.07), transparent 45%), ${C.bg}`,
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
        linear-gradient(120deg, transparent 35%, rgba(255,255,255,.025) 50%, transparent 65%)
      `,
      pointerEvents:"none"
    }}/>
    {pad ? <div style={{padding:"1.5rem 1.25rem",maxWidth:560,margin:"0 auto",position:"relative",zIndex:1}}>{children}</div> : children}
  </div>
);

export const Card = ({children, style, onClick, glow}) => (
  <div onClick={onClick}
    {...(onClick ? { role:"button", tabIndex:0, onKeyDown:(e)=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); onClick(e); } } } : {})}
    style={{
    background:"linear-gradient(145deg,rgba(245,239,230,.065),rgba(245,239,230,.015)),rgba(11,26,51,.78)",
    backdropFilter:"blur(20px)",
    WebkitBackdropFilter:"blur(20px)",
    border:`1px solid ${glow?C.goldBorder:"rgba(255, 255, 255, 0.1)"}`,
    borderRadius:16,
    padding:"1.25rem",
    boxShadow: glow?"inset 0 1px 0 #ffffff12,0 0 32px rgba(201,162,75,.06)":"inset 0 1px 0 #ffffff0d,0 16px 40px #0003",
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
    backdropFilter:"blur(12px)",
    WebkitBackdropFilter:"blur(12px)",
    boxShadow:"inset 0 1px 0 #ffffff12",
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
    background:disabled?C.goldDim:C.gradientPrimary,
    color:disabled?C.dim:C.bg,
    border:`1px solid ${disabled?C.border:C.goldBorder}`,borderRadius:12,
    boxShadow:disabled?"none":"inset 0 1px 0 #fff9,0 5px 20px #C9A24B12",
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
    background:"linear-gradient(145deg,#ffffff0d,#ffffff03)",
    color:C.white,
    border:`1px solid ${C.borderMid}`,
    backdropFilter:"blur(12px)",
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
