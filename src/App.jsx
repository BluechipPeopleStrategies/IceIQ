import { useState, useEffect, useCallback } from "react";
import * as SB from "./supabase";
import { supabase, hasSupabase } from "./supabase";
import { canAccess, getUpgradeTriggerMessage } from "./utils/tierGate";
import { canSwitchAgeGroup, recordAgeGroupSwitch, getAgeGroupLock, setAgeGroupLock, checkSeasonReset } from "./utils/deviceLock";
const imgSplash = "/splash.jpg";
import imgCoreApp from "./assets/images/Core-App.jpg";
import imgDataPanel from "./assets/images/Data-Panel.jpg";
import imgProfile from "./assets/images/Profile-Analytics.jpg";
import imgTactics from "./assets/images/Tactics-Playbook.jpg";
import imgSuccess from "./assets/images/Success-Icon.jpg";

// Resolve the user's tier for gating decisions.
// Priority: demo mode → PRO (full showcase)
//           dev override (localStorage iceiq_tier_override) → that tier
//           profile.tier field (future Supabase subscriptions) → that tier
//           default → FREE
function resolveTier({ profile, demoMode } = {}) {
  // Demo mode experiences the FREE tier — people see exactly what they get for free
  if (demoMode) return "FREE";
  try {
    const override = typeof window !== "undefined" ? window.localStorage.getItem("iceiq_tier_override") : null;
    if (override && ["FREE","PRO","FAMILY","TEAM"].includes(override.toUpperCase())) {
      return override.toUpperCase();
    }
  } catch {}
  if (profile?.tier) {
    const t = String(profile.tier).toUpperCase();
    if (["FREE","PRO","FAMILY","TEAM"].includes(t)) return t;
  }
  return "FREE";
}

// ─────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────
const C = {
  // Backgrounds
  bg:       "#080e1a",
  bgCard:   "#0d1525",
  bgElevated:"#111e33",
  bgGlass:  "rgba(255,255,255,0.04)",
  // Brand
  gold:     "#c9a84c",
  goldDim:  "rgba(201,168,76,0.15)",
  goldBorder:"rgba(201,168,76,0.3)",
  // Accent
  purple:   "#7c6fcd",
  purpleDim:"rgba(124,111,205,0.12)",
  purpleBorder:"rgba(124,111,205,0.3)",
  blue:     "#3b82f6",
  blueDim:  "rgba(59,130,246,0.1)",
  // Status
  green:    "#22c55e",
  greenDim: "rgba(34,197,94,0.1)",
  greenBorder:"rgba(34,197,94,0.25)",
  yellow:   "#eab308",
  yellowDim:"rgba(234,179,8,0.1)",
  red:      "#ef4444",
  redDim:   "rgba(239,68,68,0.08)",
  redBorder:"rgba(239,68,68,0.25)",
  // Text
  white:    "#f8fafc",
  dim:      "rgba(248,250,252,0.6)",
  dimmer:   "rgba(248,250,252,0.35)",
  dimmest:  "rgba(248,250,252,0.08)",
  // Borders
  border:   "rgba(255,255,255,0.07)",
  borderMid:"rgba(255,255,255,0.12)",
  // Ice
  ice:      "#e8f4fb",
  rink:     "#1e5799",
};

// IceIQ logo mark — realistic brain up top, two crossed hockey sticks forming an X below, puck centered.
// Captures "hockey IQ" as a team crest — the mind on top, the tools of the game crossed beneath.
function IceIQLogo({ size = 32, color = "#c9a84c" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-label="IceIQ logo"
      style={{display:"block",flexShrink:0}}
    >
      {/* === BRAIN — compact side-profile, top third === */}
      {/* Bumpy outline: frontal bulge → gyri peaks → occipital → cerebellum → underside */}
      <path d="
        M 8 11.5
        C 7.5 9.5, 9 7.2, 10.8 7
        C 11.5 5.8, 13 5.5, 14 6.5
        C 15 5.5, 16.5 5.5, 17.5 6.5
        C 18.8 5.5, 20.5 5.8, 21.3 7
        C 23 6.8, 24.5 8.3, 24.5 10.3
        C 26 10.8, 26 12.3, 24.8 12.8
        C 25.3 13.5, 25 14.8, 23.8 15.2
        C 23.5 16.3, 22 16.8, 20.5 16.3
        C 19.8 17.2, 18 17.3, 17 16.5
        C 16 17.3, 14 17.3, 13 16.5
        C 11.5 17, 9.8 16.5, 9.2 15.3
        C 7.8 14.8, 7 13.3, 7.8 12
        C 6.8 11.5, 7.2 10.8, 8 11.5 Z"
        fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round"/>

      {/* Internal sulci — wavy folds across the brain surface */}
      <path d="M 10.5 8.5 Q 12.5 7.5 13.8 8.8 Q 15.5 7.8 16.8 8.8 Q 18.3 7.8 19.5 8.8"
            stroke={color} strokeWidth="0.85" fill="none" strokeLinecap="round"/>
      <path d="M 19.5 7.5 Q 21.5 8.2 23.5 7.8"
            stroke={color} strokeWidth="0.85" fill="none" strokeLinecap="round"/>
      <path d="M 9 11 Q 12 10, 15 11.3 Q 18 10.2, 21 11.3 Q 23 10.3, 25 11.3"
            stroke={color} strokeWidth="0.85" fill="none" strokeLinecap="round"/>
      <path d="M 9.3 13.8 Q 12.5 13, 16 14 Q 19.5 13.2, 23 14.2"
            stroke={color} strokeWidth="0.85" fill="none" strokeLinecap="round"/>

      {/* === TWO CROSSED HOCKEY STICKS — prominent X === */}
      {/* Stick A: butt top-right, shaft down-left, blade at bottom-left */}
      <line x1="24" y1="17" x2="7" y2="28" stroke={color} strokeWidth="2.2" strokeLinecap="round"/>
      {/* Stick A blade — curved toe pointing outward/up */}
      <path d="M 7 28 Q 3 28.5, 2.5 26.2" stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Stick A grip tape (dark band near butt) */}
      <line x1="21.5" y1="18.6" x2="24" y2="17" stroke="#0d1525" strokeWidth="1.1" strokeLinecap="round"/>

      {/* Stick B: butt top-left, shaft down-right, blade at bottom-right */}
      <line x1="8" y1="17" x2="25" y2="28" stroke={color} strokeWidth="2.2" strokeLinecap="round"/>
      {/* Stick B blade — curved toe pointing outward/up */}
      <path d="M 25 28 Q 29 28.5, 29.5 26.2" stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Stick B grip tape */}
      <line x1="10.5" y1="18.6" x2="8" y2="17" stroke="#0d1525" strokeWidth="1.1" strokeLinecap="round"/>

      {/* === PUCK — bottom center, sitting between the crossed sticks === */}
      <ellipse cx="16" cy="30" rx="3.2" ry="1.1" fill={color}/>
      <ellipse cx="16" cy="30" rx="3.2" ry="1.1" fill="none" stroke="#0d1525" strokeWidth="0.3"/>
    </svg>
  );
}

const FONT = {
  display: "'Anton', 'Oswald', 'Barlow Condensed', Impact, sans-serif",
  body: "'DM Sans', 'Inter', system-ui, sans-serif",
};

// ─────────────────────────────────────────────────────────
// VERSION
// ─────────────────────────────────────────────────────────
const VERSION = "0.6.0";
const RELEASE_DATE = "April 13, 2026";
const CHANGELOG = [
  { v:"2.0.0", date:"April 13, 2026", notes:[
    "Full redesign — premium interface built for paid product",
    "New question formats: Sequence Ordering, Spot the Mistake, What Happens Next, True/False",
    "SMART Goal Setting — set, track and achieve development goals by category",
    "Position-based quiz engine — Forward, Defense, Goalie each get tailored questions",
    "Goalie question bank — 45 new goalie-specific questions across U7, U9, U11",
    "Coach Dashboard — anonymous team results by season with category breakdown",
    "Daily streak system and badge collection",
  ]},
  { v:"1.0.0", date:"April 13, 2026", notes:[
    "Position-based quiz — Forward, Defense, Goalie each get a tailored question set",
    "Coach Dashboard — anonymous team results by season",
    "Goalie questions added across U7, U9, U11",
  ]},
];

// ─────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────
const LEVELS = ["U7 / Initiation","U9 / Novice","U11 / Atom","U13 / Peewee","U15 / Bantam","U18 / Midget"];
const POSITIONS = ["Forward","Defense","Goalie","Not Sure"];
const POSITIONS_U11UP = ["Forward","Defense","Goalie"];
const SEASONS = ["2025-26","2026 Spring/Summer","2026-27"];
const D_WEIGHT = {1:1, 2:1.5, 3:2.2};
const QUIZ_LENGTH = 10;

const SCORE_TIERS = [
  {min:80, label:"Hockey Sense",   badge:"🏒", color:C.green},
  {min:60, label:"Two-Way Player", badge:"⚡", color:C.yellow},
  {min:0,  label:"Tape to Tape",   badge:"🎯", color:C.red},
];
const getTier = s => SCORE_TIERS.find(t => s >= t.min) || SCORE_TIERS[2];

const BADGES = {
  HOT_STREAK: {icon:"🔥", name:"Hot Streak",  desc:"3 correct in a row"},
  HOCKEY_IQ:  {icon:"🧠", name:"Hockey IQ",   desc:"Perfect session"},
  HARD_HAT:   {icon:"💎", name:"Hard Hat",     desc:"5 Advanced correct"},
  SNIPER:     {icon:"🎯", name:"Sniper",       desc:"100% on a category"},
  LEVEL_UP:   {icon:"📈", name:"Level Up",     desc:"Beat your last score"},
  IRON_MAN:   {icon:"🏒", name:"Iron Man",     desc:"5 sessions completed"},
  TACTICIAN:  {icon:"🧩", name:"Tactician",    desc:"Sequence question perfect"},
  DETECTIVE:  {icon:"🔍", name:"Detective",    desc:"Spot 3 mistakes correctly"},
};

// SMART goal categories
const GOAL_CATS = {
  "U7 / Initiation": ["Skating","Puck Control","Game Awareness","Compete"],
  "U9 / Novice":     ["Skating","Passing","Shooting","Defense","Game IQ"],
  "U11 / Atom":      ["Skating","Puck Protection","Gap Control","Rush Reads","Special Teams","Game IQ"],
  "U13 / Peewee":    ["Edge Work","Shot Selection","Defensive Zone","Zone Entry","Special Teams","Leadership"],
  "U15 / Bantam":    ["Systems Play","Transition Game","Special Teams","Physical Play","Gap Control","Leadership"],
  "U18 / Midget":    ["Game Management","Advanced Tactics","Special Teams","Neutral Zone Play","Breakout Execution","Leadership"],
};

const SMART_PROMPTS = {
  S: "What specifically will you work on? (be precise)",
  M: "How will you measure improvement?",
  A: "Is this realistic for your current level?",
  R: "How does this help you on the ice?",
  T: "When will you achieve this by?",
};


// Unified escalating competency ladder — same values for self AND coach
const COMPETENCY_LADDER = [
  {value:"introduced", label:"Introduced",  sub_self:"I'm learning what this is",               sub_coach:"Has been introduced — needs consistent support",   color:"#f87171"},
  {value:"developing", label:"Developing",  sub_self:"I can do it sometimes, needs reminders",  sub_coach:"Shows progress with reminders / in practice",       color:"#facc15"},
  {value:"consistent", label:"Consistent",  sub_self:"I do it reliably in practice",            sub_coach:"Reliable in practice, inconsistent in games",      color:"#22c55e"},
  {value:"proficient", label:"Proficient",  sub_self:"I do it in games without thinking",       sub_coach:"Performs reliably in game situations",            color:"#3b82f6"},
  {value:"advanced",   label:"Advanced",    sub_self:"I can teach this to a teammate",          sub_coach:"Standout for age — impacts and helps teammates",  color:"#a855f7"},
];
function ladderFor(n, forSelf) {
  return COMPETENCY_LADDER.slice(0, n).map(o => ({
    value: o.value, label: o.label, color: o.color,
    sub: forSelf ? o.sub_self : o.sub_coach,
  }));
}
const RATING_SCALES = {
  "U7 / Initiation": { self:{type:"ladder", options:ladderFor(3,true)},  coach:{type:"ladder", options:ladderFor(3,false)} },
  "U9 / Novice":     { self:{type:"ladder", options:ladderFor(4,true)},  coach:{type:"ladder", options:ladderFor(4,false)} },
  "U11 / Atom":      { self:{type:"ladder", options:ladderFor(5,true)},  coach:{type:"ladder", options:ladderFor(5,false)} },
  "U13 / Peewee":    { self:{type:"ladder", options:ladderFor(5,true)},  coach:{type:"ladder", options:ladderFor(5,false)} },
  "U15 / Bantam":    { self:{type:"ladder", options:ladderFor(5,true)},  coach:{type:"ladder", options:ladderFor(5,false)} },
  "U18 / Midget":    { self:{type:"ladder", options:ladderFor(5,true)},  coach:{type:"ladder", options:ladderFor(5,false)} },
};

// Scale helpers
function getSelfScale(level) { return RATING_SCALES[level]?.self?.options || []; }
function getCoachScale(level) { return RATING_SCALES[level]?.coach?.options || []; }
function getScaleColor(scale, value) { const o = scale.find(s => s.value === value); return o ? o.color : C.dimmer; }
function getScaleLabel(scale, value) { const o = scale.find(s => s.value === value); return o ? o.label : "Not rated"; }
function normalizeRating(scale, value) {
  const idx = scale.findIndex(o => o.value === value);
  if (idx < 0) return null;
  return scale.length > 1 ? idx / (scale.length - 1) : 0;
}
function getDiscussionPrompt(skillName, selfNorm, coachNorm) {
  if (selfNorm === null || coachNorm === null) return null;
  if (selfNorm > coachNorm + 0.25) return `You rated "${skillName}" higher than your coach — ask what specific things to work on to close that gap.`;
  if (coachNorm > selfNorm + 0.25) return `Your coach sees more progress in "${skillName}" than you do — you might be better than you think! Ask for examples.`;
  return null;
}

// Migrate any old rating values to the new unified ladder
function migrateRatings(ratings, level) {
  if (!ratings) return ratings;
  const OLD_NORM = {
    "Needs Work":0, "On Track":0.5, "Excels":1,
    "hard":0, "sometimes":0.33, "easy":1,
    "never":0, "usually":0.67, "always":1,
    "beginning":0, "applying":0.5, "extending":1,
    "emerging":0, "competent":0.5, "confident":0.67,
    "top10":1, "top25":0.75, "top50":0.5, "top75":0.25, "dev":0,
  };
  const selfScale = getSelfScale(level);
  const migrated = {...ratings};
  let changed = false;
  for (const [k,v] of Object.entries(migrated)) {
    if (!v || selfScale.some(o => o.value === v)) continue;
    const norm = OLD_NORM[v];
    if (norm === undefined) continue;
    const closest = selfScale.reduce((best, opt, i) => {
      const n = selfScale.length > 1 ? i / (selfScale.length - 1) : 0;
      return Math.abs(n - norm) < Math.abs(best.dist) ? {val:opt.value, dist:n-norm} : best;
    }, {val:selfScale[0]?.value, dist:999});
    migrated[k] = closest.val;
    changed = true;
  }
  return changed ? migrated : ratings;
}

// Legacy lookups (used by U13 coach percentile)
const PERCENTILE_RATINGS = RATING_SCALES["U13 / Peewee"].coach.options;
const PR_COLOR = Object.fromEntries(PERCENTILE_RATINGS.map(r=>[r.value,r.color]));
const PR_LABEL = Object.fromEntries(PERCENTILE_RATINGS.map(r=>[r.value,r.label]));

// ─────────────────────────────────────────────────────────
// UI PRIMITIVES
// ─────────────────────────────────────────────────────────
const Screen = ({children, pad=true}) => (
  <div style={{minHeight:"100vh",background:C.bg,color:C.white,fontFamily:FONT.body}}>
    {pad ? <div style={{padding:"1.5rem 1.25rem",maxWidth:560,margin:"0 auto"}}>{children}</div> : children}
  </div>
);

const Card = ({children, style, onClick, glow}) => (
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

const Pill = ({children, color=C.purple, bg}) => (
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

const Label = ({children, style}) => (
  <div style={{fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:C.dimmer,fontWeight:700,marginBottom:".6rem",...style}}>{children}</div>
);

const PrimaryBtn = ({onClick,children,disabled,style}) => (
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

const SecBtn = ({onClick,children,style}) => (
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

const BackBtn = ({onClick}) => (
  <button onClick={onClick} style={{
    background:"none",border:`1px solid ${C.border}`,
    color:C.dimmer,borderRadius:8,
    padding:".4rem .9rem",cursor:"pointer",
    fontSize:13,fontFamily:FONT.body,
    marginBottom:"1.5rem",display:"inline-flex",
    alignItems:"center",gap:".4rem"
  }}>← Back</button>
);

const ProgressBar = ({value, max, color=C.purple, height=5}) => (
  <div style={{height,background:C.dimmest,borderRadius:height,overflow:"hidden"}}>
    <div style={{height:"100%",width:`${Math.min(100,(value/max)*100)}%`,background:color,borderRadius:height,transition:"width .4s ease"}}/>
  </div>
);

const StickyHeader = ({children}) => (
  <div style={{
    position:"sticky",top:0,zIndex:20,
    background:`${C.bg}f5`,
    backdropFilter:"blur(16px)",
    WebkitBackdropFilter:"blur(16px)",
    borderBottom:`1px solid ${C.border}`,
    padding:".9rem 1.25rem",
  }}>{children}</div>
);



import { loadQB, preloadQB } from "./qbLoader.js";

const COMP={
  "U7 / Initiation":{t:[0.75,0.5],l:["Game-Ready IQ","Getting It","Still Learning"]},
  "U9 / Novice":{t:[0.8,0.55],l:["Smart Player","Making Reads","Building Awareness"]},
  "U11 / Atom":{t:[0.8,0.6],l:["Hockey IQ Player","System Aware","Instinct Stage"]},
  "U13 / Peewee":{t:[0.82,0.65],l:["Elite Game Read","Situationally Sound","Tactical Foundation"]},
  "U15 / Bantam":{t:[0.84,0.68],l:["Systems Thinker","Positionally Sound","Developing Reads"]},
  "U18 / Midget":{t:[0.86,0.70],l:["Complete Player","Tactically Aware","Building Foundation"]},
};
function getComp(level,score){const c=COMP[level];if(!c)return"—";return score>=c.t[0]?c.l[0]:score>=c.t[1]?c.l[1]:c.l[2];}


const SKILLS={
  "U7 / Initiation":[
    {cat:"Skating",icon:"⛸",skills:[{id:"u7s1",name:"Forward Stride",desc:"Pushes and glides with both feet"},{id:"u7s2",name:"Stopping",desc:"Attempts a two-foot snowplow stop"},{id:"u7s3",name:"Turning",desc:"Turns in both directions while moving"},{id:"u7s4",name:"Balance & Falls",desc:"Gets up from ice independently"}]},
    {cat:"Puck Skills",icon:"🏒",skills:[{id:"u7p1",name:"Stick Handling",desc:"Controls puck while stationary"},{id:"u7p2",name:"Shooting",desc:"Attempts a forehand push/shot on net"}]},
    {cat:"Compete & Attitude",icon:"🔥",skills:[{id:"u7c1",name:"Effort",desc:"Full effort throughout practice and games"},{id:"u7c2",name:"Listening",desc:"Follows coach instructions on ice"},{id:"u7c3",name:"Fun & Enjoyment",desc:"Shows enthusiasm for the game"},{id:"u7c4",name:"Team Spirit",desc:"Cheers for teammates and plays like part of a team",selfQ:"Do you cheer for your teammates and play as a team?"}]},
    {cat:"Game Decision-Making",icon:"🧠",isDM:true,skills:[
      {id:"u7d1",name:"Shooting at the Right Net",desc:"Knows which net to shoot at",selfQ:"How well do you know which net to shoot at?"},
      {id:"u7d2",name:"Following the Puck",desc:"Pursues loose pucks instinctively",selfQ:"Do you always go after the puck when it's loose?"},
      {id:"u7d3",name:"Reacting After a Whistle",desc:"Stops and looks for next direction",selfQ:"Do you stop right away when the whistle blows?"},
    ]},
  ],
  "U9 / Novice":[
    {cat:"Skating",icon:"⛸",skills:[{id:"u9s1",name:"Forward Crossovers",desc:"Executes crossovers on both sides"},{id:"u9s2",name:"Backward Skating",desc:"Skates backward with control"},{id:"u9s3",name:"Edge Control",desc:"Uses inside/outside edges intentionally"},{id:"u9s4",name:"Stopping (One-Foot)",desc:"Executes a hockey stop on dominant side"}]},
    {cat:"Puck Skills",icon:"🏒",skills:[{id:"u9p1",name:"Stickhandling in Motion",desc:"Handles puck while skating at moderate speed"},{id:"u9p2",name:"Passing (Forehand)",desc:"Delivers accurate forehand pass"},{id:"u9p3",name:"Receiving Passes",desc:"Cushions and controls received passes"},{id:"u9p4",name:"Wrist Shot",desc:"Generates power and accuracy on wrist shot"}]},
    {cat:"Hockey Sense",icon:"👁",skills:[{id:"u9h1",name:"Puck Awareness",desc:"Knows where the puck is at all times"},{id:"u9h2",name:"Space Awareness",desc:"Begins to find open ice"}]},
    {cat:"Compete & Attitude",icon:"🔥",skills:[{id:"u9c1",name:"Battle Level",desc:"Competes for loose pucks"},{id:"u9c2",name:"Coachability",desc:"Accepts feedback and applies it"},{id:"u9c3",name:"Team-First Attitude",desc:"Supports teammates, celebrates their success, plays unselfishly",selfQ:"Do you put the team before personal stats and celebrate teammates?"}]},
    {cat:"Game Decision-Making",icon:"🧠",isDM:true,skills:[
      {id:"u9d1",name:"Pass or Shoot Recognition",desc:"Chooses appropriately between passing and shooting",selfQ:"Can you read when to pass vs. shoot in the zone?"},
      {id:"u9d2",name:"Finding Open Ice",desc:"Moves to open space rather than following the puck",selfQ:"Do you look for open ice or follow the puck?"},
      {id:"u9d3",name:"Carry vs. Pass Under Pressure",desc:"Recognizes when to move the puck quickly",selfQ:"Do you know when pressure means you should pass?"},
      {id:"u9d4",name:"Transition Awareness",desc:"Recognizes puck loss and transitions back immediately",selfQ:"Do you turn back right away when your team loses the puck?"},
    ]},
  ],
  "U11 / Atom":[
    {cat:"Skating",icon:"⛸",skills:[{id:"u11s1",name:"Backward Crossovers",desc:"Executes backward crossovers on both sides"},{id:"u11s2",name:"Pivots",desc:"Transitions between forward and backward fluidly"},{id:"u11s3",name:"Acceleration",desc:"Explosive first three strides from standstill"},{id:"u11s4",name:"Tight Turns",desc:"Executes tight turns at speed with puck"}]},
    {cat:"Puck Skills",icon:"🏒",skills:[{id:"u11p1",name:"Backhand Stickhandling",desc:"Controls puck on backhand side comfortably"},{id:"u11p2",name:"Backhand Pass",desc:"Delivers an accurate backhand pass"},{id:"u11p3",name:"Shooting off the Catch",desc:"Quick release without extra stickhandling"},{id:"u11p4",name:"Puck Protection",desc:"Uses body and stick to shield puck"}]},
    {cat:"Hockey Sense",icon:"👁",skills:[{id:"u11h1",name:"Offensive Zone Positioning",desc:"Understands basic offensive zone positions"},{id:"u11h2",name:"Backchecking Awareness",desc:"Recognizes when to transition back"},{id:"u11h3",name:"Reading the Play",desc:"Anticipates where the puck is going"}]},
    {cat:"Defensive Skills",icon:"🛡",skills:[{id:"u11d1",name:"Gap Control",desc:"Maintains appropriate gap on the rush"},{id:"u11d2",name:"Angling",desc:"Uses body position to angle opponent to boards"}]},
    {cat:"Compete & Attitude",icon:"🔥",skills:[{id:"u11c1",name:"Compete Level",desc:"Consistently battles hard in all situations"},{id:"u11c2",name:"Coachability",desc:"Implements feedback between shifts"},{id:"u11c3",name:"Team-Centred Play",desc:"Makes team decisions — passes when a teammate is open, supports on defense, accepts role",selfQ:"Do you make the team-first play even when it's not the flashy one?"}]},
    {cat:"Game Decision-Making",icon:"🧠",isDM:true,skills:[
      {id:"u11dm1",name:"Rush Read: 2-on-1",desc:"Puck carrier reads defender and makes correct decision",selfQ:"Can you read a 2-on-1 and make the right play?"},
      {id:"u11dm2",name:"Defensive Zone Assignment",desc:"Finds their man without being told every play",selfQ:"Do you find your check automatically in your own zone?"},
      {id:"u11dm3",name:"Pinch vs. Hold Decision",desc:"Correct call on whether to pinch at the blue line",selfQ:"Do you know when to pinch and when to hold the line?"},
      {id:"u11dm4",name:"Breakout Role Recognition",desc:"Knows their breakout role automatically",selfQ:"Do you know where to go in the breakout without being told?"},
      {id:"u11dm5",name:"Pressure Recognition",desc:"Moves the puck before being caught",selfQ:"Can you feel pressure coming and move the puck in time?"},
    ]},
  ],
  "U13 / Peewee":[
    {cat:"Skating",icon:"⛸",skills:[{id:"u13s1",name:"Edge Mastery",desc:"Powerful edges in all directions under pressure"},{id:"u13s2",name:"Speed with Puck",desc:"Maintains top speed while controlling puck"},{id:"u13s3",name:"Escape Moves",desc:"Executes toe drags, spins, cuts to evade pressure"}]},
    {cat:"Puck Skills",icon:"🏒",skills:[{id:"u13p1",name:"Deking Under Pressure",desc:"Executes effective moves against active defenders"},{id:"u13p2",name:"Saucer Pass",desc:"Uses saucer pass to beat sticks in traffic"},{id:"u13p3",name:"Shot Selection",desc:"Chooses the right shot type for the situation"},{id:"u13p4",name:"Shooting in Stride",desc:"Releases accurate shots at full speed"}]},
    {cat:"Hockey Sense",icon:"👁",skills:[{id:"u13h1",name:"Zone Entry Reads",desc:"Chooses correct entry based on situation"},{id:"u13h2",name:"Offensive Zone Cycling",desc:"Participates in cycle play below the dots"},{id:"u13h3",name:"Defensive Zone Coverage",desc:"Understands man/zone responsibilities in own end"},{id:"u13h4",name:"Neutral Zone Reads",desc:"Makes quick decisions at the blue line"}]},
    {cat:"Defensive Skills",icon:"🛡",skills:[{id:"u13df1",name:"Body Contact",desc:"Uses body legally and effectively in battles"},{id:"u13df2",name:"Shot Blocking",desc:"Willing and positioned to block shots"},{id:"u13df3",name:"Defensive-Zone Breakout",desc:"Executes breakout patterns correctly"}]},
    {cat:"Compete & Attitude",icon:"🔥",skills:[{id:"u13c1",name:"Compete Level",desc:"Battles hard every shift, every practice"},{id:"u13c2",name:"Coachability",desc:"Seeks feedback and self-corrects between reps"},{id:"u13c3",name:"Leadership",desc:"Positive leadership on bench and in the room"},{id:"u13c4",name:"Team-Centred Mindset",desc:"Prioritizes team success over personal stats, elevates teammates, makes the right play over the selfish play",selfQ:"Do you consistently choose the team play — and make teammates better around you?"}]},
    {cat:"Game Decision-Making",icon:"🧠",isDM:true,skills:[
      {id:"u13dm1",name:"Zone Entry Decision",desc:"Reads the defensive setup and chooses correct entry",selfQ:"Can you read the defense and pick the right zone entry?"},
      {id:"u13dm2",name:"3-on-2 Rush Read",desc:"Middle player reads defender positioning correctly",selfQ:"On a 3-on-2, do you read whether to shoot or pass?"},
      {id:"u13dm3",name:"Corner Retrieval vs. Position",desc:"Reads whether to retrieve a puck or hold position",selfQ:"Do you know when to go get the puck vs. hold your spot?"},
      {id:"u13dm4",name:"Trap Recognition",desc:"Recognizes a 1-2-2 trap and adjusts",selfQ:"Can you recognize when the other team is running a trap?"},
      {id:"u13dm5",name:"Contact as a Decision Tool",desc:"Uses contact deliberately, not reactively",selfQ:"Do you use your body as a smart tool or just react?"},
      {id:"u13dm6",name:"Reading the Goalie",desc:"Reads goalie position before deciding to shoot",selfQ:"Do you look at the goalie before you get the puck?"},
    ]},
  ],
  "U15 / Bantam":[
    {cat:"Skating",icon:"⛸",skills:[{id:"u15s1",name:"Power Skating",desc:"Generates explosive speed through crossovers and transitions"},{id:"u15s2",name:"Pivots Under Pressure",desc:"Executes forward-to-backward pivots while engaged with an opponent"},{id:"u15s3",name:"Lateral Agility",desc:"Quick lateral movement for defensive positioning and evasion"},{id:"u15s4",name:"Speed Through Contact",desc:"Maintains speed and balance through physical engagement"}]},
    {cat:"Puck Skills",icon:"🏒",skills:[{id:"u15p1",name:"Passing Under Pressure",desc:"Delivers accurate passes while absorbing contact"},{id:"u15p2",name:"One-Touch Plays",desc:"Executes quick one-touch passes and redirections"},{id:"u15p3",name:"Shot Deception",desc:"Uses fakes and release variation to beat goalies"},{id:"u15p4",name:"Below-the-Goal-Line Play",desc:"Cycles and protects the puck below the goal line effectively"}]},
    {cat:"Systems Play",icon:"📋",skills:[{id:"u15sys1",name:"Forechecking Systems",desc:"Executes 1-2-2, 2-1-2 forechecks correctly"},{id:"u15sys2",name:"Breakout Execution",desc:"Runs breakout patterns under pressure cleanly"},{id:"u15sys3",name:"Power Play Positioning",desc:"Understands and holds PP formation and rotations"},{id:"u15sys4",name:"Penalty Kill Structure",desc:"Maintains PK box/diamond under pressure"}]},
    {cat:"Hockey Sense",icon:"👁",skills:[{id:"u15h1",name:"Advanced Rush Reads",desc:"Reads odd-man rushes and makes correct decisions consistently"},{id:"u15h2",name:"Video Review Application",desc:"Applies concepts from video review to game situations"},{id:"u15h3",name:"Coverage Recognition",desc:"Identifies coverage breakdowns and adjusts in real time"},{id:"u15h4",name:"Transition Speed",desc:"Recognizes transition moments and reacts within one second"}]},
    {cat:"Physical Play",icon:"💪",skills:[{id:"u15phy1",name:"Legal Body Contact",desc:"Finishes checks legally and with purpose"},{id:"u15phy2",name:"Puck Protection in Traffic",desc:"Uses body to shield puck in heavy traffic"},{id:"u15phy3",name:"Net-Front Battles",desc:"Wins positioning in front of the net on both sides of the puck"}]},
    {cat:"Compete & Leadership",icon:"🔥",skills:[{id:"u15c1",name:"Compete Level",desc:"Battles hard every shift, every practice, every drill"},{id:"u15c2",name:"Coachability",desc:"Seeks video feedback and self-corrects between periods"},{id:"u15c3",name:"Leadership",desc:"Vocal leader on bench and in room — leads by example and holds teammates accountable"},{id:"u15c4",name:"Team-First Mindset",desc:"Sacrifices personal stats for team success consistently",selfQ:"Do you make the team play even when you have a personal opportunity?"}]},
    {cat:"Game Decision-Making",icon:"🧠",isDM:true,skills:[
      {id:"u15dm1",name:"Forecheck Read",desc:"Reads forecheck pressure and makes the right breakout decision",selfQ:"Can you read the forecheck and adjust your breakout in real time?"},
      {id:"u15dm2",name:"PP/PK Reads",desc:"Reads special teams situations and adjusts positioning",selfQ:"Do you recognize PP/PK patterns and know your role?"},
      {id:"u15dm3",name:"Gap and Angle Control",desc:"Maintains proper gap and angle on rush defense",selfQ:"Can you control gap and angle without giving up the middle?"},
      {id:"u15dm4",name:"Cycle Support Reads",desc:"Knows when to support the cycle vs hold position",selfQ:"Do you read when to jump into the cycle vs hold your spot?"},
      {id:"u15dm5",name:"Physical Play Decisions",desc:"Uses contact at the right time and place",selfQ:"Do you choose when to finish checks vs when to play the puck?"},
      {id:"u15dm6",name:"Transition Recognition",desc:"Reads puck possession changes and reacts immediately",selfQ:"Do you recognize transitions and switch immediately?"},
    ]},
  ],
  "U18 / Midget":[
    {cat:"Skating",icon:"⛸",skills:[{id:"u18s1",name:"Elite Edge Work",desc:"Uses all four edges at full speed in tight spaces"},{id:"u18s2",name:"Deceptive Skating",desc:"Changes pace and direction to manipulate defenders"},{id:"u18s3",name:"Conditioning Speed",desc:"Maintains top-end speed through a full shift late in games"},{id:"u18s4",name:"Recovery Skating",desc:"Recovers defensive positioning after being beaten with urgency"}]},
    {cat:"Puck Skills",icon:"🏒",skills:[{id:"u18p1",name:"Elite Passing",desc:"Delivers tape-to-tape passes through traffic at full speed"},{id:"u18p2",name:"Release Variation",desc:"Uses snap, wrist, slap, backhand with deception and accuracy"},{id:"u18p3",name:"Puck Retrieval Under Pressure",desc:"Wins puck battles along the wall and in corners consistently"},{id:"u18p4",name:"Playmaking Vision",desc:"Sees passing lanes two moves ahead and executes"}]},
    {cat:"Advanced Tactics",icon:"📋",skills:[{id:"u18tac1",name:"Pre-Scout Application",desc:"Adjusts play based on scouted opponent tendencies"},{id:"u18tac2",name:"Neutral Zone Structure",desc:"Executes neutral zone traps and counters effectively"},{id:"u18tac3",name:"Line Matching Awareness",desc:"Understands matchup implications and adjusts effort"},{id:"u18tac4",name:"Situational Awareness",desc:"Adjusts play style based on score, time, and game state"}]},
    {cat:"Hockey Sense",icon:"👁",skills:[{id:"u18h1",name:"Full-Ice Vision",desc:"Processes all 10 skaters and makes decisions accordingly"},{id:"u18h2",name:"Breakout Under Pressure",desc:"Executes clean breakouts against aggressive forechecks"},{id:"u18h3",name:"Coverage Rotations",desc:"Rotates seamlessly in defensive coverage without being told"},{id:"u18h4",name:"Game Management",desc:"Adjusts tempo and decisions based on game situation"},{id:"u18h5",name:"Reading Defensive Schemes",desc:"Identifies opponent defensive system and exploits weaknesses"}]},
    {cat:"Physical & Compete",icon:"💪",skills:[{id:"u18phy1",name:"Controlled Aggression",desc:"Uses physicality strategically without taking penalties"},{id:"u18phy2",name:"Board Battle Dominance",desc:"Wins the majority of puck battles along the wall"},{id:"u18phy3",name:"Net-Front Presence",desc:"Establishes and maintains position in front of the net"}]},
    {cat:"Leadership & Character",icon:"🔥",skills:[{id:"u18c1",name:"Compete Level",desc:"Elite effort every shift regardless of score or situation"},{id:"u18c2",name:"Coachability",desc:"Self-corrects using video, seeks feedback proactively"},{id:"u18c3",name:"Leadership",desc:"Leads vocally and by example — holds self and teammates to a high standard"},{id:"u18c4",name:"Resilience",desc:"Responds to adversity with increased effort and focus"},{id:"u18c5",name:"Team-First Culture",desc:"Builds team culture through actions, not just words",selfQ:"Do you actively build team culture and hold yourself and others to a high standard?"}]},
    {cat:"Game Decision-Making",icon:"🧠",isDM:true,skills:[
      {id:"u18dm1",name:"Pre-Scout Reads",desc:"Applies scouted information to in-game decisions",selfQ:"Do you adjust your game based on what you know about the opponent?"},
      {id:"u18dm2",name:"Game Management",desc:"Makes smart decisions based on score, time, and momentum",selfQ:"Do you adjust your play based on the game situation?"},
      {id:"u18dm3",name:"Line Matching",desc:"Understands when coach is matching lines and adjusts effort",selfQ:"Do you recognize matchup situations and adjust your game?"},
      {id:"u18dm4",name:"Advanced PP/PK",desc:"Reads and reacts to special teams situations at a high level",selfQ:"Can you read and exploit special teams patterns?"},
      {id:"u18dm5",name:"Breakout Under Pressure",desc:"Makes clean breakout decisions under heavy forecheck",selfQ:"Can you execute breakouts under aggressive forechecking?"},
      {id:"u18dm6",name:"Neutral Zone Reads",desc:"Reads and exploits neutral zone defensive structures",selfQ:"Can you identify and attack neutral zone trap weaknesses?"},
      {id:"u18dm7",name:"Leadership Decisions",desc:"Makes decisions that prioritize team success over personal stats",selfQ:"Do you make the leadership play in critical moments?"},
    ]},
  ],
};


// ─────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────
function shuffle(a) { return [...a].sort(() => Math.random() - 0.5); }

// Stable sample % for demo mode: deterministic per question id, shaped by difficulty.
// d=1 → 70-90%, d=2 → 50-75%, d=3 → 30-60%.
function demoStatPct(qid, d) {
  let h = 0;
  for (let i = 0; i < qid.length; i++) h = ((h << 5) - h + qid.charCodeAt(i)) | 0;
  const n = Math.abs(h) % 100; // 0-99 stable
  if (d === 1) return 70 + Math.floor(n * 21 / 100);       // 70-90
  if (d === 3) return 30 + Math.floor(n * 31 / 100);       // 30-60
  return 50 + Math.floor(n * 26 / 100);                    // 50-75 (d=2 or undef)
}

function shuffleOpts(q) {
  if (!q || !Array.isArray(q.opts) || q.opts.length < 2) return q;
  if (q.type && q.type !== "mc" && q.type !== "mistake" && q.type !== "next") return q;
  if (typeof q.ok !== "number") return q;
  const order = shuffle(q.opts.map((_, i) => i));
  const newOk = order.indexOf(q.ok);
  if (newOk < 0) return q;
  return { ...q, opts: order.map(i => q.opts[i]), ok: newOk };
}

function calcWeightedIQ(results) {
  if (!results.length) return 0;
  const e = results.reduce((s,r) => s + (r.ok ? D_WEIGHT[r.d||2] : 0), 0);
  const p = results.reduce((s,r) => s + D_WEIGHT[r.d||2], 0);
  return Math.round((e/p)*100);
}

function initSR(level) {
  const r = {};
  (SKILLS[level]||[]).forEach(c => c.skills.forEach(s => { r[s.id] = null; }));
  return r;
}

function getTodayKey() { return new Date().toISOString().slice(0,10); }

function getStreakData() {
  try { return JSON.parse(localStorage.getItem("iceiq_streak") || "{}"); }
  catch { return {}; }
}

function updateStreak(data) {
  const today = getTodayKey();
  const yesterday = new Date(Date.now()-86400000).toISOString().slice(0,10);
  if (data.last === today) return data;
  if (data.last === yesterday) return {...data, count:(data.count||0)+1, last:today};
  return {count:1, last:today};
}

function calcBadges(results, prevScore, totalSessions, hasSeqPerfect, mistakeStreak) {
  const earned = new Set();
  let streak = 0;
  for (const r of results) {
    if (r.ok) { streak++; if (streak >= 3) earned.add("HOT_STREAK"); }
    else streak = 0;
  }
  if (results.length >= QUIZ_LENGTH && results.every(r => r.ok)) earned.add("HOCKEY_IQ");
  if (results.filter(r => r.ok && r.d === 3).length >= 5) earned.add("HARD_HAT");
  const byCat = {};
  results.forEach(r => {
    if (!byCat[r.cat]) byCat[r.cat] = {ok:0,tot:0};
    byCat[r.cat].tot++;
    if (r.ok) byCat[r.cat].ok++;
  });
  if (Object.values(byCat).some(v => v.tot >= 2 && v.ok === v.tot)) earned.add("SNIPER");
  const score = calcWeightedIQ(results);
  if (prevScore !== null && score > prevScore) earned.add("LEVEL_UP");
  if (totalSessions >= 5) earned.add("IRON_MAN");
  if (hasSeqPerfect) earned.add("TACTICIAN");
  if (mistakeStreak >= 3) earned.add("DETECTIVE");
  return [...earned].map(k => BADGES[k]).filter(Boolean);
}

async function saveCoachRatings(playerKey, ratings, notes) {
  if (!window.storage) return false;
  try {
    await window.storage.set("coach_ratings:" + playerKey, JSON.stringify({ratings, notes: notes || {}, ts: Date.now()}), true);
    return true;
  } catch(e) { return false; }
}

async function loadCoachRatings(playerKey) {
  if (!window.storage) return null;
  try {
    const r = await window.storage.get("coach_ratings:" + playerKey, true);
    return r ? JSON.parse(r.value) : null;
  } catch(e) { return null; }
}

function makePlayerKey(name, level) {
  return (name + "_" + level).toLowerCase().replace(/[^a-z0-9]/g,"_").slice(0,40);
}

// Adaptive queue builder
function buildQueue(qb, level, position, isReturning, tier) {
  const allQ = qb[level] || [];
  // Gate: FREE only gets basic multiple-choice questions
  const formatAllowed = canAccess("allQuestionFormats", tier).allowed;
  const positionAllowed = canAccess("positionFilter", tier).allowed;

  let posFiltered;
  if (!positionAllowed) {
    // Free: ignore position filter, serve all skater questions
    posFiltered = allQ.filter(q => !q.pos || q.pos.includes("F") || q.pos.includes("D"));
  } else {
    posFiltered = position === "Goalie"
      ? allQ.filter(q => !q.pos || q.pos.includes("G") || q.pos.includes("F"))
      : position === "Defense"
      ? allQ.filter(q => !q.pos || q.pos.includes("D") || q.pos.includes("F"))
      : position === "Not Sure"
      ? allQ.filter(q => !q.pos || q.pos.includes("F") || q.pos.includes("D"))
      : allQ.filter(q => !q.pos || q.pos.includes("F") || q.pos.includes("D"));
  }

  if (!formatAllowed) {
    // Free: only standard multiple-choice questions (no tf/seq/mistake/next)
    posFiltered = posFiltered.filter(q => !q.type || q.type === "mc");
  }

  const byD = {
    1: shuffle(posFiltered.filter(q => q.d === 1)),
    2: shuffle(posFiltered.filter(q => q.d === 2)),
    3: shuffle(posFiltered.filter(q => q.d === 3)),
  };
  return { byD, currentD: isReturning ? 2 : 1, tier };
}

function pullNext(queue, results) {
  const last2 = results.slice(-2);
  let { byD, currentD, tier } = queue;
  // Gate: FREE users get random difficulty, no adaptive engine
  const adaptive = canAccess("adaptiveEngine", tier).allowed;
  if (adaptive && last2.length === 2) {
    if (last2.every(r => r.ok) && currentD < 3) currentD++;
    else if (last2.every(r => !r.ok) && currentD > 1) currentD--;
  }
  if (!byD[currentD].length) {
    const fb = [1,2,3].find(d => d !== currentD && byD[d].length);
    if (!fb) return { q: null, queue };
    currentD = fb;
  }
  const i = Math.floor(Math.random() * byD[currentD].length);
  const q = shuffleOpts(byD[currentD][i]);
  return { q, queue: { byD: {...byD, [currentD]: byD[currentD].filter((_,j) => j !== i)}, currentD, tier } };
}

// Storage (coach dashboard)
async function saveTeamResult(coachCode, results, season) {
  if (!coachCode || !window.storage) return;
  const key = "team:" + coachCode.toUpperCase() + ":" + season.replace("-","");
  let existing = [];
  try { const r = await window.storage.get(key, true); if (r) existing = JSON.parse(r.value); } catch(e) {}
  existing.push({ ts: Date.now(), iq: calcWeightedIQ(results), qs: results.map(r => ({id:r.id,ok:r.ok,d:r.d,cat:r.cat})) });
  if (existing.length > 500) existing = existing.slice(-500);
  try { await window.storage.set(key, JSON.stringify(existing), true); } catch(e) {}
}

async function loadTeamData(coachCode, season) {
  if (!window.storage) return [];
  const key = "team:" + coachCode.toUpperCase() + ":" + season.replace("-","");
  try { const r = await window.storage.get(key, true); return r ? JSON.parse(r.value) : []; }
  catch(e) { return []; }
}


// ─────────────────────────────────────────────────────────
// RINK DIAGRAMS
// ─────────────────────────────────────────────────────────
function RinkDiagram({ type }) {
  const w=300, h=160, cx=w/2, cy=h/2;
  const Ice = () => (
    <g>
      <rect x="3" y="3" width={w-6} height={h-6} rx="26" fill={C.ice} stroke={C.rink} strokeWidth="1.5"/>
      <line x1={cx} y1="3" x2={cx} y2={h-3} stroke={C.rink} strokeWidth="1" strokeDasharray="5,4" opacity="0.3"/>
      <circle cx={cx} cy={cy} r="18" fill="none" stroke={C.rink} strokeWidth="1" opacity="0.3"/>
      <circle cx={cx} cy={cy} r="3" fill={C.rink} opacity="0.25"/>
    </g>
  );
  const Player = ({x,y,color,label}) => (
    <g>
      <circle cx={x} cy={y} r="11" fill={color} stroke="white" strokeWidth="2"/>
      <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="7.5" fontWeight="700">{label}</text>
    </g>
  );
  const Arrow = ({x1,y1,x2,y2,color="#c9a84c",dash,arc}) => {
    const dx=x2-x1, dy=y2-y1, len=Math.sqrt(dx*dx+dy*dy);
    const ux=dx/len, uy=dy/len;
    const hx=x2-ux*12, hy=y2-uy*12;
    const d = arc ? `M${x1} ${y1} Q${(x1+x2)/2} ${y1-22} ${hx} ${hy}` : `M${x1} ${y1} L${hx} ${hy}`;
    return (
      <g>
        <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeDasharray={dash} opacity="0.9"/>
        <polygon points={`${x2},${y2} ${hx-uy*5},${hy+ux*5} ${hx+uy*5},${hy-ux*5}`} fill={color} opacity="0.9"/>
      </g>
    );
  };
  const Net = ({x,y}) => <rect x={x} y={y} width="13" height="26" rx="3" fill="none" stroke={C.rink} strokeWidth="2.5"/>;
  const Puck = ({x,y}) => <circle cx={x} cy={y} r="5" fill="#111827" stroke="white" strokeWidth="1.5"/>;
  const Tag = ({x,y,text,color}) => (
    <g>
      <rect x={x-2} y={y-10} width={text.length*7+4} height={14} rx={4} fill={`${color}22`}/>
      <text x={x} y={y} fill={color} fontSize="8" fontWeight="700">{text}</text>
    </g>
  );

  const diagrams = {
    "2on1": (
      <svg width={w} height={h} style={{display:"block"}}>
        <Ice/><Net x={w-16} y={cy-13}/>
        <Player x={115} y={cy-18} color="#16a34a" label="A1"/>
        <Player x={115} y={cy+18} color="#16a34a" label="A2"/>
        <Player x={200} y={cy} color="#dc2626" label="D"/>
        <Puck x={126} y={cy-13}/>
        <Arrow x1={126} y1={cy-18} x2={w-20} y2={cy-8} arc/>
        <Arrow x1={126} y1={cy+18} x2={w-20} y2={cy+12} color="rgba(22,163,74,0.5)" dash="5,3"/>
        <Arrow x1={190} y1={cy} x2={170} y2={cy-10} color="#dc2626"/>
        <Tag x={105} y={16} text="2-ON-1" color={C.rink}/>
      </svg>
    ),
    "coverage": (
      <svg width={w} height={h} style={{display:"block"}}>
        <Ice/><Net x={4} y={cy-13}/>
        <Player x={145} y={45} color="#dc2626" label="A1"/>
        <Player x={170} y={80} color="#dc2626" label="A2"/>
        <Player x={145} y={115} color="#dc2626" label="A3"/>
        <Puck x={155} y={50}/>
        <Player x={100} y={45} color="#16a34a" label="D1"/>
        <Player x={100} y={80} color="#16a34a" label="D2"/>
        <Player x={100} y={115} color="#16a34a" label="F"/>
        <text x={170} y={98} textAnchor="middle" fill={C.yellow} fontSize="18" fontWeight="800">?</text>
        <Tag x={120} y={16} text="DEFENSIVE ZONE" color={C.rink}/>
      </svg>
    ),
    "blueline": (
      <svg width={w} height={h} style={{display:"block"}}>
        <Ice/><Net x={w-16} y={cy-13}/>
        <line x1={cx+12} y1="3" x2={cx+12} y2={h-3} stroke="#1d4ed8" strokeWidth="3" opacity="0.8"/>
        <text x={cx+18} y={18} fill="#1d4ed8" fontSize="8" fontWeight="700">BLUE LINE</text>
        <Puck x={cx+8} y={cy}/>
        <Arrow x1={cx+8} y1={cy} x2={cx+38} y2={cy} color="#dc2626"/>
        <Player x={cx+55} y={cy} color="#16a34a" label="D"/>
        <Arrow x1={cx+44} y1={cy} x2={cx+20} y2={cy} color="#16a34a"/>
        <text x={cx-28} y={cy-10} fill="#dc2626" fontSize="9">exit ✗</text>
        <text x={cx+60} y={cy-18} textAnchor="middle" fill="#16a34a" fontSize="9">keep in ✓</text>
      </svg>
    ),
    "forecheck": (
      <svg width={w} height={h} style={{display:"block"}}>
        <Ice/><Net x={4} y={cy-13}/>
        <Player x={88} y={cy} color="#dc2626" label="D"/>
        <Puck x={99} y={cy-5}/>
        <Player x={185} y={80} color="#16a34a" label="F1"/>
        <Arrow x1={175} y1={82} x2={104} y2={cy} color="#16a34a"/>
        <Arrow x1={88} y1={cy-12} x2={88} y2={30} color="#dc2626" dash="4,3"/>
        <Arrow x1={88} y1={cy-12} x2={150} y2={36} color="#dc2626" dash="4,3"/>
        <text x={60} y={24} fill="#dc2626" fontSize="8">outlet?</text>
        <Tag x={100} y={16} text="CUT THE ANGLE" color={C.rink}/>
      </svg>
    ),
    "goalie_angle": (
      <svg width={w} height={h} style={{display:"block"}}>
        <Ice/><Net x={4} y={cy-13}/>
        <Player x={165} y={cy-22} color="#dc2626" label="S"/>
        <Arrow x1={160} y1={cy-20} x2={55} y2={cy} color="#dc2626"/>
        <Player x={62} y={cy} color="#16a34a" label="G"/>
        <text x={62} y={cy-24} textAnchor="middle" fill="#16a34a" fontSize="8.5" fontWeight="700">angle ✓</text>
        <rect x={14} y={cy-9} width="8" height="18" rx="2" fill="none" stroke={C.rink} strokeWidth="2.5"/>
        <Player x={32} y={cy} color="rgba(22,163,74,0.3)" label="G"/>
        <text x={32} y={cy-24} textAnchor="middle" fill="#dc2626" fontSize="8.5" fontWeight="700">line ✗</text>
        <Tag x={100} y={16} text="ANGLE CUTTING" color={C.rink}/>
      </svg>
    ),
    "goalie_2on1": (
      <svg width={w} height={h} style={{display:"block"}}>
        <Ice/><Net x={4} y={cy-13}/>
        <Player x={168} y={cy-22} color="#dc2626" label="A1"/>
        <Player x={168} y={cy+22} color="#dc2626" label="A2"/>
        <Player x={105} y={cy} color="#1d4ed8" label="D"/>
        <Puck x={176} y={cy-18}/>
        <Player x={42} y={cy} color="#16a34a" label="G"/>
        <Arrow x1={105} y1={cy} x2={135} y2={cy+20} color="#1d4ed8"/>
        <text x={42} y={cy-24} textAnchor="middle" fill="#16a34a" fontSize="8">set for shot</text>
        <Tag x={95} y={16} text="2-ON-1 GOALIE" color={C.rink}/>
      </svg>
    ),
  };

  return diagrams[type] ? (
    <div style={{background:"#f0f8ff",borderRadius:14,padding:".85rem",border:`2px solid ${C.rink}28`,display:"flex",justifyContent:"center"}}>
      {diagrams[type]}
    </div>
  ) : null;
}

const DIAGRAMS = {
  u11q1:"2on1", u11q7:"2on1", u11q16:"2on1", u11q17:"2on1", u11q41:"2on1",
  u11q2:"coverage", u11q14:"coverage", u11q19:"coverage", u11q44:"coverage",
  u11q3:"blueline", u11q20:"blueline", u11q47:"blueline",
  u11q4:"forecheck", u11q24:"forecheck",
  u11g1:"goalie_angle", u11g2:"goalie_2on1", u11g7:"goalie_angle",
};


// ─────────────────────────────────────────────────────────
// QUESTION FORMAT COMPONENTS
// ─────────────────────────────────────────────────────────
function MCQuestion({ q, sel, onPick, colorblind }) {
  const correctColor = colorblind ? "#2563eb" : C.green;
  const wrongColor = colorblind ? "#ea580c" : C.red;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:".55rem"}}>
      {q.opts.map((opt, i) => {
        const picked = sel !== null;
        const isCorrect = i === q.ok;
        const isWrong = picked && i === sel && !isCorrect;
        let bg=C.dimmest, bdr=C.border, col=C.dim, leftBdr="transparent";
        if (picked) {
          if (isCorrect) { bg=colorblind?"rgba(37,99,235,.1)":"rgba(34,197,94,.1)"; bdr=colorblind?"rgba(37,99,235,.35)":"rgba(34,197,94,.3)"; col=C.white; leftBdr=correctColor; }
          else if (isWrong) { bg=colorblind?"rgba(234,88,12,.08)":C.redDim; bdr=colorblind?"rgba(234,88,12,.3)":C.redBorder; col=C.dimmer; leftBdr=wrongColor; }
        } else if (sel === i) { bg=C.purpleDim; bdr=C.purpleBorder; col=C.white; }
        return (
          <button key={i} onClick={() => onPick(i)} disabled={sel !== null}
            style={{
              background:bg, border:`1px solid ${bdr}`,
              borderLeft:`3px solid ${leftBdr}`,
              borderRadius:12, padding:".95rem 1.1rem",
              cursor:sel!==null?"default":"pointer",
              textAlign:"left", color:col,
              fontFamily:FONT.body, fontSize:14, lineHeight:1.55,
              display:"flex", alignItems:"flex-start", gap:".75rem",
              transition:"all .15s", width:"100%",
            }}>
            <span style={{
              fontSize:11, fontWeight:800, minWidth:22, marginTop:1, flexShrink:0,
              color:picked?(isCorrect?correctColor:isWrong?wrongColor:C.dimmest):C.dimmer,
              fontFamily:FONT.display,
            }}>
              {picked ? (isCorrect ? "✓" : isWrong ? "✗" : String.fromCharCode(65+i)) : String.fromCharCode(65+i)}
            </span>
            <span style={{wordBreak:"break-word",whiteSpace:"normal",flex:1,fontSize:opt.length>100?13:14}}>{opt}</span>
          </button>
        );
      })}
    </div>
  );
}

function SeqQuestion({ q, onAnswer, answered }) {
  const [order, setOrder] = useState(() => [...Array(q.items.length).keys()]);
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect] = useState(false);

  function moveUp(i) { if (i === 0 || submitted) return; const o=[...order]; [o[i-1],o[i]]=[o[i],o[i-1]]; setOrder(o); }
  function moveDown(i) { if (i === order.length-1 || submitted) return; const o=[...order]; [o[i],o[i+1]]=[o[i+1],o[i]]; setOrder(o); }

  function submit() {
    if (submitted) return;
    const isCorrect = order.every((v,i) => v === q.correct_order[i]);
    setSubmitted(true);
    setCorrect(isCorrect);
    onAnswer(isCorrect);
  }

  return (
    <div>
      <div style={{display:"flex",flexDirection:"column",gap:".5rem",marginBottom:"1rem"}}>
        {order.map((itemIdx, i) => {
          const isRight = submitted && q.correct_order[i] === itemIdx;
          const isWrong = submitted && !isRight;
          return (
            <div key={itemIdx} style={{
              display:"flex", alignItems:"center", gap:".6rem",
              background:submitted ? (isRight ? "rgba(34,197,94,.08)" : "rgba(239,68,68,.06)") : C.bgElevated,
              border:`1px solid ${submitted ? (isRight ? C.greenBorder : C.redBorder) : C.border}`,
              borderLeft:`3px solid ${submitted ? (isRight ? C.green : C.red) : C.purple}`,
              borderRadius:12, padding:".8rem 1rem",
              transition:"all .2s",
            }}>
              <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.2rem",color:C.gold,minWidth:26,textAlign:"center"}}>{i+1}</div>
              <div style={{flex:1,fontSize:13,color:C.white,lineHeight:1.5}}>{q.items[itemIdx]}</div>
              {!submitted && (
                <div style={{display:"flex",flexDirection:"column",gap:1}}>
                  <button onClick={()=>moveUp(i)} style={{background:"none",border:`1px solid ${C.border}`,color:C.dimmer,cursor:"pointer",fontSize:12,padding:"3px 7px",borderRadius:5,lineHeight:1}}>▲</button>
                  <button onClick={()=>moveDown(i)} style={{background:"none",border:`1px solid ${C.border}`,color:C.dimmer,cursor:"pointer",fontSize:12,padding:"3px 7px",borderRadius:5,lineHeight:1}}>▼</button>
                </div>
              )}
              {submitted && <span style={{fontSize:16,flexShrink:0}}>{isRight?"✓":"✗"}</span>}
            </div>
          );
        })}
      </div>
      {!submitted && (
        <button onClick={submit} style={{background:C.purple,color:C.white,border:"none",borderRadius:12,padding:".85rem",cursor:"pointer",fontWeight:700,fontSize:14,fontFamily:FONT.body,width:"100%"}}>
          Submit Order →
        </button>
      )}
    </div>
  );
}

function TFQuestion({ q, sel, onPick }) {
  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
      {[{label:"TRUE",val:1,color:C.green},{label:"FALSE",val:0,color:C.red}].map(({label,val,color}) => {
        const picked = sel !== null;
        const isCorrect = val === (q.ok ? 1 : 0);
        const isSelected = sel === val;
        let bg=C.bgElevated, bdr=C.border, textColor=C.dim;
        if (picked) {
          if (isCorrect) { bg=val===1?"rgba(34,197,94,.1)":"rgba(239,68,68,.08)"; bdr=color+"50"; textColor=color; }
          else if (isSelected) { bg=C.redDim; bdr=C.redBorder; textColor=C.red; }
        } else if (isSelected) { bg=C.purpleDim; bdr=C.purpleBorder; textColor=C.purple; }
        return (
          <button key={label} onClick={() => onPick(val)} disabled={sel !== null}
            style={{
              background:bg, border:`1px solid ${bdr}`,
              borderRadius:14, padding:"1.5rem 1rem",
              cursor:sel!==null?"default":"pointer",
              textAlign:"center",
              fontFamily:FONT.display, fontWeight:800,
              fontSize:"1.5rem", letterSpacing:".06em",
              color:textColor, transition:"all .15s",
            }}>
            {label}
            {picked && isCorrect && <div style={{fontSize:11,fontFamily:FONT.body,marginTop:6,fontWeight:600}}>✓ Correct</div>}
            {picked && isSelected && !isCorrect && <div style={{fontSize:11,fontFamily:FONT.body,marginTop:6,color:C.red,fontWeight:600}}>✗ Wrong</div>}
          </button>
        );
      })}
    </div>
  );
}

function NextQuestion({ q, sel, onPick }) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:".55rem"}}>
      {q.opts.map((opt, i) => {
        const picked = sel !== null;
        const isCorrect = i === q.ok;
        const isWrong = picked && i === sel && !isCorrect;
        let bg=C.dimmest, bdr=C.border, col=C.dim, leftBdr="transparent";
        if (picked) {
          if (isCorrect) { bg="rgba(34,197,94,.1)"; bdr=C.greenBorder; col=C.white; leftBdr=C.green; }
          else if (isWrong) { bg=C.redDim; bdr=C.redBorder; col=C.dimmer; leftBdr=C.red; }
        } else if (sel === i) { bg=C.purpleDim; bdr=C.purpleBorder; col=C.white; }
        return (
          <button key={i} onClick={() => onPick(i)} disabled={sel !== null}
            style={{background:bg,border:`1px solid ${bdr}`,borderLeft:`3px solid ${leftBdr}`,borderRadius:12,padding:".95rem 1.1rem",cursor:sel!==null?"default":"pointer",textAlign:"left",color:col,fontFamily:FONT.body,fontSize:14,lineHeight:1.55,display:"flex",alignItems:"flex-start",gap:".75rem",transition:"all .15s",width:"100%"}}>
            <span style={{fontSize:11,fontWeight:800,minWidth:22,marginTop:1,flexShrink:0,color:picked?(isCorrect?C.green:isWrong?C.red:C.dimmest):C.dimmer,fontFamily:FONT.display}}>
              {picked?(isCorrect?"✓":isWrong?"✗":String.fromCharCode(65+i)):String.fromCharCode(65+i)}
            </span>
            <span style={{wordBreak:"break-word",whiteSpace:"normal",flex:1,fontSize:opt.length>100?13:14}}>{opt}</span>
          </button>
        );
      })}
    </div>
  );
}

// Type badge for question header
const Q_TYPE_LABELS = {
  mc:      {label:"Multiple Choice", color:C.purple,   icon:"📝"},
  seq:     {label:"Put in Order",    color:C.gold,     icon:"🔢"},
  mistake: {label:"Spot the Mistake",color:C.red,      icon:"🔍"},
  next:    {label:"What Happens Next",color:C.yellow,  icon:"🔮"},
  tf:      {label:"True or False",   color:C.blue,     icon:"⚡"},
};



// ─────────────────────────────────────────────────────────
// HOME SCREEN
// ─────────────────────────────────────────────────────────
function Home({ player, onNav, demoMode, subscriptionTier }) {
  const { name, level, position, selfRatings, quizHistory, goals } = player;
  const latest = quizHistory[quizHistory.length-1];
  const iq = latest ? calcWeightedIQ(latest.results) : null;
  const tier = iq !== null ? getTier(iq) : null;
  const showProPreview = demoMode || subscriptionTier === "FREE";
  const totalSessions = quizHistory.length;
  const ratedSkills = Object.values(selfRatings||{}).filter(v => v !== null).length;
  const totalSkills = Object.keys(selfRatings||{}).length;
  const goalCount = Object.keys(goals||{}).filter(k => goals[k]?.goal).length;
  const goalCats = (GOAL_CATS[level]||[]).length;

  // Streak
  const [streak, setStreak] = useState(0);
  useEffect(() => {
    const sd = getStreakData();
    const today = getTodayKey();
    const yesterday = new Date(Date.now()-86400000).toISOString().slice(0,10);
    if (sd.last === today || sd.last === yesterday) setStreak(sd.count || 0);
    preloadQB();
  }, []);

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:FONT.body,color:C.white,paddingBottom:80}}>
      {/* Header */}
      <div style={{padding:"1.5rem 1.25rem 1rem",maxWidth:560,margin:"0 auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"1.5rem"}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:".45rem",marginBottom:".2rem"}}>
              <IceIQLogo size={22}/>
              <span style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.5rem",color:C.gold,letterSpacing:".06em"}}>IceIQ</span>
              <span style={{fontSize:10,color:C.dimmer,fontWeight:500,letterSpacing:".04em"}}>v{VERSION}</span>
              {streak > 0 && (
                <div style={{background:"rgba(234,179,8,.12)",border:"1px solid rgba(234,179,8,.25)",borderRadius:20,padding:"2px 8px",fontSize:11,fontWeight:700,color:C.yellow,display:"flex",alignItems:"center",gap:".2rem"}}>
                  🔥{streak}
                </div>
              )}
            </div>
            <div style={{fontSize:12,color:C.dimmer}}>{name} · {level} · {position}</div>
          </div>
          <button onClick={() => onNav("profile")} style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:10,width:38,height:38,cursor:"pointer",color:C.dimmer,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>⚙</button>
        </div>

        {/* IQ Score Hero */}
        <Card glow={iq !== null} style={{marginBottom:"1rem",background:`linear-gradient(135deg,${C.bgCard},${C.bgElevated})`,position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:0,right:0,width:120,height:120,background:`radial-gradient(circle at top right,${iq!==null?tier.color+"15":"rgba(255,255,255,.02)"},transparent 70%)`,pointerEvents:"none"}}/>
          <Label>Hockey IQ Score</Label>
          {iq !== null ? (
            <div style={{display:"flex",alignItems:"flex-end",gap:"1rem"}}>
              <div>
                <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"4.5rem",color:tier.color,lineHeight:.9,letterSpacing:"-.02em"}}>{iq}<span style={{fontSize:"1.8rem"}}>%</span></div>
                <div style={{fontSize:13,color:C.dimmer,marginTop:".4rem"}}>{latest.results.filter(r=>r.ok).length}/{latest.results.length} correct</div>
              </div>
              <div>
                <div style={{fontFamily:FONT.display,fontWeight:700,fontSize:"1.2rem",color:C.white}}>{tier.badge} {tier.label}</div>
                <div style={{fontSize:12,color:C.dimmer,marginTop:2}}>{totalSessions} session{totalSessions!==1?"s":""}</div>
              </div>
            </div>
          ) : (
            <div>
              <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"3rem",color:"rgba(255,255,255,.1)",lineHeight:.9}}>—</div>
              <div style={{fontSize:13,color:C.dimmer,marginTop:".5rem"}}>Take your first quiz to get your baseline score</div>
            </div>
          )}
        </Card>

        {/* Quick action grid */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".75rem",marginBottom:"1rem"}}>
          <button onClick={() => onNav("quiz")} style={{background:`linear-gradient(135deg,rgba(124,111,205,.15),rgba(124,111,205,.05))`,border:`1px solid ${C.purpleBorder}`,borderRadius:14,padding:"1.1rem",cursor:"pointer",textAlign:"left",color:C.white,fontFamily:FONT.body,position:"relative",overflow:"hidden"}}>
            <img src={imgCoreApp} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:0.12,pointerEvents:"none"}}/>
            <div style={{position:"relative"}}>
            <div style={{fontSize:22,marginBottom:".4rem"}}>🧠</div>
            <div style={{fontWeight:700,fontSize:14,marginBottom:2}}>Take Quiz</div>
            <div style={{fontSize:11,color:C.purple}}>Adaptive · {player.sessionLength||10}Q</div>
            </div>
          </button>
          <button onClick={() => onNav("goals")} style={{background:`linear-gradient(135deg,rgba(201,168,76,.1),rgba(201,168,76,.03))`,border:`1px solid ${C.goldBorder}`,borderRadius:14,padding:"1.1rem",cursor:"pointer",textAlign:"left",color:C.white,fontFamily:FONT.body}}>
            <div style={{fontSize:22,marginBottom:".4rem"}}>🎯</div>
            <div style={{fontWeight:700,fontSize:14,marginBottom:2}}>My Goals</div>
            <div style={{fontSize:11,color:C.gold}}>{goalCount}/{goalCats} set</div>
          </button>
          <button onClick={() => onNav("study")} style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:14,padding:"1.1rem",cursor:"pointer",textAlign:"left",color:C.white,fontFamily:FONT.body,position:"relative",overflow:"hidden"}}>
            <img src={imgTactics} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:0.12,pointerEvents:"none"}}/>
            <div style={{position:"relative"}}>
            <div style={{fontSize:22,marginBottom:".4rem"}}>📺</div>
            <div style={{fontWeight:700,fontSize:14,marginBottom:2}}>Study</div>
            <div style={{fontSize:11,color:C.dimmer}}>Games, drills, Pro Hockey Intel</div>
            </div>
          </button>
          <button onClick={() => onNav("report")} style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:14,padding:"1.1rem",cursor:"pointer",textAlign:"left",color:C.white,fontFamily:FONT.body,position:"relative",overflow:"hidden"}}>
            <img src={imgDataPanel} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:0.12,pointerEvents:"none"}}/>
            <div style={{position:"relative"}}>
            <div style={{fontSize:22,marginBottom:".4rem"}}>📋</div>
            <div style={{fontWeight:700,fontSize:14,marginBottom:2}}>Report</div>
            <div style={{fontSize:11,color:C.dimmer}}>Development arc</div>
            </div>
          </button>
        </div>

        {showProPreview && (
          <button onClick={()=>onNav("plans")} style={{width:"100%",display:"block",textAlign:"left",background:`linear-gradient(135deg,rgba(201,168,76,.12),rgba(124,111,205,.08))`,border:`1px solid ${C.goldBorder}`,borderRadius:14,padding:"1rem 1.1rem",cursor:"pointer",color:C.white,fontFamily:FONT.body,marginBottom:"1rem"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:".5rem"}}>
              <div style={{display:"flex",alignItems:"center",gap:".5rem"}}>
                <span style={{fontSize:16}}>⭐</span>
                <span style={{fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:C.gold,fontWeight:800}}>Upgrade to IceIQ Pro</span>
              </div>
              <span style={{color:C.gold,fontSize:13}}>→</span>
            </div>
            <div style={{fontSize:13,color:C.dim,lineHeight:1.5,marginBottom:".55rem"}}>See what unlocks with Pro — all age groups, adaptive difficulty, position-specific questions, SMART goals, full history + Skills Map.</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".35rem",marginTop:".5rem"}}>
              {[
                {icon:"🔓",t:"All age groups"},
                {icon:"🎮",t:"5 question formats"},
                {icon:"🎯",t:"Position-specific"},
                {icon:"🧠",t:"Adaptive difficulty"},
                {icon:"⭐",t:"SMART goals"},
                {icon:"📊",t:"Skills Map radar"},
              ].map((b,i) => (
                <div key={i} style={{fontSize:11,color:C.dimmer,display:"flex",alignItems:"center",gap:".35rem"}}>
                  <span>{b.icon}</span><span>{b.t}</span>
                </div>
              ))}
            </div>
          </button>
        )}

        {/* What's New */}
        <Card style={{marginBottom:"1rem"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:".75rem"}}>
            <Label style={{marginBottom:0}}>What's New</Label>
            <span style={{fontSize:11,color:C.dimmer}}>v{VERSION}</span>
          </div>
          {CHANGELOG[0].notes.slice(0,3).map((note,i) => (
            <div key={i} style={{display:"flex",gap:".5rem",marginBottom:".35rem",alignItems:"flex-start"}}>
              <span style={{color:C.gold,fontSize:11,flexShrink:0,marginTop:2}}>·</span>
              <span style={{fontSize:12,color:C.dim,lineHeight:1.5}}>{note}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────
// QUIZ SCREEN
// ─────────────────────────────────────────────────────────
function Quiz({ player, onFinish, onBack, tier }) {
  const isReturning = player.quizHistory.length > 0;
  const qLen = player.sessionLength || 10;
  const [queue, setQueue] = useState(null);
  const [question, setQuestion] = useState(null);
  const [sel, setSel] = useState(null);
  const [seqAnswered, setSeqAnswered] = useState(false);
  const [seqCorrect, setSeqCorrect] = useState(false);
  const [results, setResults] = useState([]);
  const [seqPerfect, setSeqPerfect] = useState(true);
  const [mistakeStreak, setMistakeStreak] = useState(0);
  const [quizDone, setQuizDone] = useState(false);
  const [showFlag, setShowFlag] = useState(false);
  const [flagReason, setFlagReason] = useState("");
  const [flagDetail, setFlagDetail] = useState("");
  const [flagSent, setFlagSent] = useState(false);
  const [statsMap, setStatsMap] = useState({});
  const isDemo = !player.id || player.id === "__demo__";

  async function submitFlag() {
    if (!flagReason) return;
    if (player.id && player.id !== "__demo__") {
      await SB.reportQuestion({
        userId: player.id,
        questionId: question.id,
        level: player.level,
        reason: flagReason,
        detail: flagDetail.trim() || null,
      });
    }
    setFlagSent(true);
    setTimeout(() => { setShowFlag(false); setFlagSent(false); setFlagReason(""); setFlagDetail(""); }, 1600);
  }

  useEffect(() => {
    let cancelled = false;
    loadQB().then(qb => {
      if (cancelled) return;
      const q = buildQueue(qb, player.level, player.position, isReturning, tier);
      const { q: first, queue: q2 } = pullNext(q, []);
      setQueue(q2);
      setQuestion(first);
    });
    if (!isDemo) SB.getQuestionStats().then(setStatsMap).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const qNum = results.length;
  const isLast = qNum >= qLen - 1;
  const qtype = question?.type || "mc";

  function handlePick(i) {
    if (sel !== null || !question) return;
    setSel(i);
    const ok = i === question.ok;
    const newResult = { id:question.id, cat:question.cat, ok, d:question.d||2, type:qtype };
    const newResults = [...results, newResult];
    if (question.type === "mistake" && ok) setMistakeStreak(s => s+1);
    setResults(newResults);
    if (!isDemo) SB.recordQuestionAnswer(question.id, ok);
    if (isLast) setQuizDone(true);
  }

  function handleSeqAnswer(ok) {
    setSeqAnswered(true);
    setSeqCorrect(ok);
    if (!ok) setSeqPerfect(false);
    const newResult = { id:question.id, cat:question.cat, ok, d:question.d||2, type:"seq" };
    const newResults = [...results, newResult];
    setResults(newResults);
    if (!isDemo && question) SB.recordQuestionAnswer(question.id, ok);
    if (isLast) setQuizDone(true);
  }

  function advance() {
    if (!question) return;
    const { q: nextQ, queue: nextQueue } = pullNext(queue, results);
    setQueue(nextQueue);
    setQuestion(nextQ);
    setSel(null);
    setSeqAnswered(false);
    setSeqCorrect(false);
  }

  const canAdvance = qtype === "seq" ? seqAnswered : sel !== null;
  const answered = qtype === "seq" ? seqAnswered : sel !== null;
  const q = question;
  if (!q) return <Screen><div style={{color:C.dimmer,textAlign:"center",paddingTop:"4rem"}}>Loading…</div></Screen>;

  const typeInfo = Q_TYPE_LABELS[qtype] || Q_TYPE_LABELS.mc;
  const diagramType = DIAGRAMS[q.id];

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.white,fontFamily:FONT.body}}>
      <StickyHeader>
        <div style={{maxWidth:560,margin:"0 auto",display:"flex",alignItems:"center",gap:"1rem"}}>
          <button onClick={onBack} style={{background:"none",border:`1px solid ${C.border}`,color:C.dimmer,borderRadius:8,padding:".35rem .75rem",cursor:"pointer",fontSize:13,fontFamily:FONT.body}}>←</button>
          <div style={{flex:1}}>
            <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1rem",color:C.gold}}>IceIQ · {player.level}</div>
            <div style={{fontSize:11,color:C.dimmer}}>Q{qNum+1}/{qLen} · {player.position} · {player.season||SEASONS[0]}</div>
          </div>
          <div style={{width:80,height:4,background:C.dimmest,borderRadius:2,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${(qNum/qLen)*100}%`,background:C.purple,borderRadius:2,transition:"width .35s ease"}}/>
          </div>
        </div>
      </StickyHeader>

      <div style={{padding:"1.5rem 1.25rem",maxWidth:560,margin:"0 auto"}}>
        {/* Question type badge + category */}
        <div style={{display:"flex",gap:".5rem",marginBottom:"1rem",flexWrap:"wrap",alignItems:"center"}}>
          <Pill color={typeInfo.color}>{typeInfo.icon} {typeInfo.label}</Pill>
          <Pill color={C.dimmer} bg={C.dimmest}>{q.cat}</Pill>
          {q.concept && <Pill color={C.dimmer} bg={C.dimmest}>{q.concept}</Pill>}
        </div>

        {/* Diagram */}
        {diagramType && (
          <div style={{marginBottom:"1rem"}}>
            <div style={{fontSize:9,letterSpacing:".14em",textTransform:"uppercase",color:C.dimmer,fontWeight:700,marginBottom:".4rem"}}>📋 Coach's Clipboard</div>
            <RinkDiagram type={diagramType}/>
          </div>
        )}

        {/* Situation / Prompt */}
        {(qtype === "mc" || qtype === "seq" || qtype === "next") && (
          <Card style={{marginBottom:"1.25rem",background:C.purpleDim,border:`1px solid ${C.purpleBorder}`}}>
            <div style={{fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:C.purple,marginBottom:".6rem",fontWeight:700}}>📋 Game Situation</div>
            <div style={{fontSize:15,lineHeight:1.8,color:C.white,fontWeight:500}}>{q.sit}</div>
          </Card>
        )}

        {qtype === "tf" && (
          <Card style={{marginBottom:"1.25rem",background:C.blueDim,border:`1px solid rgba(59,130,246,.3)`}}>
            <div style={{fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:C.blue,marginBottom:".6rem",fontWeight:700}}>⚡ True or False?</div>
            <div style={{fontSize:15,lineHeight:1.8,color:C.white,fontWeight:500}}>{q.sit}</div>
          </Card>
        )}

        {qtype === "mistake" && (
          <Card style={{marginBottom:"1.25rem",background:C.redDim,border:`1px solid ${C.redBorder}`}}>
            <div style={{fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:C.red,marginBottom:".6rem",fontWeight:700}}>🔍 Spot the Mistake</div>
            <div style={{fontSize:14,color:C.dim,lineHeight:1.7,marginBottom:".75rem"}}>{q.sit}</div>
            <div style={{fontSize:15,fontWeight:700,color:C.white}}>{q.question}</div>
          </Card>
        )}

        {/* Question component */}
        {qtype === "mc" && <MCQuestion q={q} sel={sel} onPick={handlePick} colorblind={player.colorblind}/>}
        {qtype === "mistake" && <MCQuestion q={q} sel={sel} onPick={handlePick} colorblind={player.colorblind}/>}
        {qtype === "next" && <NextQuestion q={q} sel={sel} onPick={handlePick}/>}
        {qtype === "tf" && <TFQuestion q={q} sel={sel} onPick={i => handlePick(i)}/>}
        {qtype === "seq" && <SeqQuestion q={q} onAnswer={handleSeqAnswer} answered={seqAnswered}/>}

        {/* Explanation */}
        {answered && (
          <div ref={el => { if (el) setTimeout(() => el.scrollIntoView({behavior:"smooth",block:"nearest"}), 150); }} style={{marginTop:"1rem"}}>
            <Card style={{
              background: (qtype==="seq"?seqCorrect:(sel===q.ok)) ? "rgba(34,197,94,.06)" : C.redDim,
              border:`1px solid ${(qtype==="seq"?seqCorrect:(sel===q.ok)) ? C.greenBorder : C.redBorder}`,
              marginBottom:"1rem"
            }}>
              <div style={{fontSize:10,letterSpacing:".12em",textTransform:"uppercase",fontWeight:700,marginBottom:".5rem",color:(qtype==="seq"?seqCorrect:(sel===q.ok))?C.green:C.red}}>
                {(qtype==="seq"?seqCorrect:(sel===q.ok)) ? "✓ Correct" : "✗ Incorrect"}
              </div>
              <div style={{fontSize:13,color:C.dim,lineHeight:1.75,marginBottom:".75rem"}}>{q.why}</div>
              {(() => {
                const userCorrect = qtype === "seq" ? seqCorrect : (sel === q.ok);
                let pct = null, isSample = false;
                if (isDemo) { pct = demoStatPct(q.id, q.d); isSample = true; }
                else {
                  const s = statsMap[q.id];
                  if (s && s.attempts >= 10) pct = Math.round((s.correct / s.attempts) * 100);
                }
                if (pct === null) return null;
                const displayPct = userCorrect ? pct : pct;
                const msg = userCorrect
                  ? `🎯 ${displayPct}% of players got this right`
                  : (pct <= 40 ? `💪 Only ${pct}% got this right — tough one` : `📊 ${pct}% of players got this right`);
                return (
                  <div style={{fontSize:11,color:C.dimmer,marginBottom:".6rem",display:"flex",alignItems:"center",gap:".4rem"}}>
                    <span>{msg}</span>
                    {isSample && <span style={{background:C.dimmest,color:C.dimmer,padding:"1px 6px",borderRadius:4,fontSize:9,letterSpacing:".08em",fontWeight:700}}>SAMPLE</span>}
                  </div>
                );
              })()}
              <div style={{fontSize:12,color:C.purple,fontStyle:"italic",borderTop:`1px solid ${C.border}`,paddingTop:".6rem"}}>💡 {q.tip}</div>
            </Card>
            {quizDone ? (
              <button onClick={() => onFinish(results, seqPerfect, mistakeStreak)} style={{background:C.gold,color:C.bg,border:"none",borderRadius:12,padding:".9rem",cursor:"pointer",fontWeight:700,fontSize:14,fontFamily:FONT.body,width:"100%"}}>
                See Results →
              </button>
            ) : (
              <button onClick={advance} style={{background:C.purple,color:C.white,border:"none",borderRadius:12,padding:".9rem",cursor:"pointer",fontWeight:700,fontSize:14,fontFamily:FONT.body,width:"100%"}}>
                Next Question →
              </button>
            )}
            <button onClick={() => setShowFlag(true)} style={{background:"none",border:"none",color:C.dimmer,fontSize:11,marginTop:".65rem",cursor:"pointer",fontFamily:FONT.body,width:"100%",textAlign:"center",padding:".4rem",textDecoration:"underline"}}>
              🚩 Report this question
            </button>
          </div>
        )}

        {showFlag && (
          <div onClick={()=>setShowFlag(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}>
            <div onClick={e=>e.stopPropagation()} style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:16,padding:"1.5rem",maxWidth:420,width:"100%",color:C.white,fontFamily:FONT.body}}>
              {flagSent ? (
                <div style={{textAlign:"center",padding:"1rem 0"}}>
                  <div style={{fontSize:32,marginBottom:".5rem"}}>✅</div>
                  <div style={{fontWeight:700,fontSize:15,color:C.green}}>Thanks — report sent</div>
                  <div style={{fontSize:12,color:C.dim,marginTop:".3rem"}}>We'll review it.</div>
                </div>
              ) : (<>
                <div style={{fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:C.gold,fontWeight:700,marginBottom:".4rem"}}>🚩 Report question</div>
                <div style={{fontSize:14,color:C.dim,lineHeight:1.5,marginBottom:"1rem"}}>What's wrong with this one?</div>
                {[
                  {v:"wrong_answer",l:"The marked answer is wrong"},
                  {v:"misleading",l:"Question or options are misleading"},
                  {v:"too_hard",l:"Too advanced for this age"},
                  {v:"too_easy",l:"Too easy for this age"},
                  {v:"typo",l:"Typo or grammar issue"},
                  {v:"other",l:"Something else"},
                ].map(o => (
                  <button key={o.v} onClick={()=>setFlagReason(o.v)} style={{display:"block",width:"100%",background:flagReason===o.v?C.goldDim:C.bgElevated,border:`1px solid ${flagReason===o.v?C.gold:C.border}`,borderRadius:8,padding:".6rem .8rem",cursor:"pointer",color:flagReason===o.v?C.gold:C.dim,fontSize:13,fontFamily:FONT.body,fontWeight:flagReason===o.v?700:500,textAlign:"left",marginBottom:".35rem"}}>
                    {o.l}
                  </button>
                ))}
                <textarea value={flagDetail} onChange={e=>setFlagDetail(e.target.value)} placeholder="Optional: add more detail (what's wrong, what should be correct, etc.)"
                  rows={3}
                  style={{width:"100%",background:C.bgElevated,border:`1px solid ${C.border}`,borderRadius:8,padding:".6rem .8rem",color:C.white,fontSize:13,fontFamily:FONT.body,outline:"none",lineHeight:1.5,marginTop:".5rem"}}/>
                <div style={{display:"flex",gap:".5rem",marginTop:"1rem"}}>
                  <button onClick={()=>setShowFlag(false)} style={{flex:1,background:"none",border:`1px solid ${C.border}`,borderRadius:10,padding:".7rem",cursor:"pointer",color:C.dimmer,fontSize:13,fontFamily:FONT.body}}>Cancel</button>
                  <button onClick={submitFlag} disabled={!flagReason} style={{flex:2,background:C.gold,color:C.bg,border:"none",borderRadius:10,padding:".7rem",cursor:"pointer",fontWeight:800,fontSize:13,fontFamily:FONT.body}}>Send Report</button>
                </div>
              </>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────
// RESULTS SCREEN
// ─────────────────────────────────────────────────────────
function Results({ results, player, prevScore, totalSessions, seqPerfect, mistakeStreak, onAgain, onHome }) {
  const [saved, setSaved] = useState(false);
  const score = calcWeightedIQ(results);
  const tier = getTier(score);
  const badges = calcBadges(results, prevScore, totalSessions, seqPerfect, mistakeStreak);
  const byD = {1:{ok:0,tot:0},2:{ok:0,tot:0},3:{ok:0,tot:0}};
  results.forEach(r => { byD[r.d||2].tot++; if(r.ok) byD[r.d||2].ok++; });
  const byCat = {};
  results.forEach(r => { if(!byCat[r.cat])byCat[r.cat]={ok:0,tot:0}; byCat[r.cat].tot++; if(r.ok)byCat[r.cat].ok++; });
  const byType = {};
  results.forEach(r => { if(!byType[r.type||"mc"])byType[r.type||"mc"]={ok:0,tot:0}; byType[r.type||"mc"].tot++; if(r.ok)byType[r.type||"mc"].ok++; });

  useEffect(() => {
    if (player.coachCode) saveTeamResult(player.coachCode, results, player.season||SEASONS[0]).then(() => setSaved(true));
    else setSaved(true);
    try {
      localStorage.setItem("iceiq_score", JSON.stringify(score));
      localStorage.setItem("iceiq_sessions", String(totalSessions));
      const sd = updateStreak(getStreakData());
      localStorage.setItem("iceiq_streak", JSON.stringify(sd));
    } catch(e) {}
  }, []);

  const dLabel = {1:"Foundation",2:"Developing",3:"Advanced"};
  const correct = results.filter(r=>r.ok).length;

  return (
    <Screen>
      {/* Hero */}
      <div style={{textAlign:"center",marginBottom:"2rem",paddingTop:"1rem",position:"relative",overflow:"hidden"}}>
        <img src={imgSuccess} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:0.08,pointerEvents:"none",borderRadius:16}}/>
        <div style={{position:"relative"}}>
        <div style={{fontSize:56,marginBottom:".5rem"}}>{tier.badge}</div>
        <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"2rem",marginBottom:".15rem"}}>{tier.label}</div>
        <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"5rem",color:tier.color,lineHeight:.9,letterSpacing:"-.02em"}}>{score}<span style={{fontSize:"2rem"}}>%</span></div>
        <div style={{fontSize:13,color:C.dimmer,margin:".5rem 0 .75rem"}}>{correct}/{results.length} correct</div>
        {saved && player.coachCode && (
          <div style={{fontSize:11,color:C.green,display:"flex",alignItems:"center",justifyContent:"center",gap:".3rem"}}>✓ Saved to team {player.coachCode}</div>
        )}
        </div>
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <Card style={{marginBottom:"1rem",background:`linear-gradient(135deg,rgba(201,168,76,.08),rgba(201,168,76,.02))`,border:`1px solid ${C.goldBorder}`}}>
          <Label>Badges Earned</Label>
          <div style={{display:"flex",gap:".6rem",flexWrap:"wrap"}}>
            {badges.map((b,i) => (
              <div key={i} style={{background:C.bgElevated,border:`1px solid ${C.border}`,borderRadius:12,padding:".75rem",textAlign:"center",minWidth:80}}>
                <div style={{fontSize:24,marginBottom:4}}>{b.icon}</div>
                <div style={{fontSize:11,fontWeight:700,color:C.white}}>{b.name}</div>
                <div style={{fontSize:10,color:C.dimmer,marginTop:2}}>{b.desc}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Question type breakdown */}
      {Object.keys(byType).length > 1 && (
        <Card style={{marginBottom:"1rem"}}>
          <Label>By Format</Label>
          <div style={{display:"flex",gap:".5rem",flexWrap:"wrap"}}>
            {Object.entries(byType).map(([type,v]) => {
              const pct = Math.round((v.ok/v.tot)*100);
              const info = Q_TYPE_LABELS[type]||Q_TYPE_LABELS.mc;
              return (
                <div key={type} style={{background:C.bgElevated,border:`1px solid ${C.border}`,borderRadius:10,padding:".6rem .85rem",fontSize:12}}>
                  <div style={{color:info.color,fontWeight:700,marginBottom:2}}>{info.icon} {info.label}</div>
                  <div style={{color:pct>=80?C.green:pct>=60?C.yellow:C.red,fontWeight:700}}>{v.ok}/{v.tot}</div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Difficulty mix */}
      <Card style={{marginBottom:"1rem"}}>
        <Label>Difficulty Mix</Label>
        <div style={{display:"flex",gap:".5rem"}}>
          {[1,2,3].map(d => byD[d].tot > 0 && (
            <div key={d} style={{flex:1,textAlign:"center",padding:".7rem",borderRadius:10,
              background:d===1?"rgba(34,197,94,.07)":d===2?"rgba(234,179,8,.07)":"rgba(239,68,68,.07)",
              border:`1px solid ${d===1?"rgba(34,197,94,.25)":d===2?"rgba(234,179,8,.25)":"rgba(239,68,68,.25)"}`}}>
              <div style={{fontSize:14,fontWeight:700,color:d===1?C.green:d===2?C.yellow:C.red}}>{byD[d].ok}/{byD[d].tot}</div>
              <div style={{fontSize:10,color:C.dimmer,marginTop:2}}>{dLabel[d]}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* By category */}
      <Card style={{marginBottom:"1.5rem"}}>
        <Label>By Category</Label>
        {Object.entries(byCat).map(([cat,v]) => {
          const pct = Math.round((v.ok/v.tot)*100);
          return (
            <div key={cat} style={{marginBottom:".85rem"}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:5}}>
                <span style={{color:C.dim}}>{cat}</span>
                <span style={{fontWeight:700,color:pct>=80?C.green:pct>=60?C.yellow:C.red}}>{v.ok}/{v.tot}</span>
              </div>
              <ProgressBar value={v.ok} max={v.tot} color={pct>=80?C.green:pct>=60?C.yellow:C.red}/>
            </div>
          );
        })}
      </Card>

      <PrimaryBtn onClick={onAgain} style={{marginBottom:".75rem"}}>Take Another Quiz →</PrimaryBtn>
      <SecBtn onClick={onHome}>← Home</SecBtn>
    </Screen>
  );
}


// ─────────────────────────────────────────────────────────
// SMART GOALS SCREEN
// ─────────────────────────────────────────────────────────
function GoalsScreen({ player, onSave, onBack }) {
  const cats = GOAL_CATS[player.level] || [];
  const [goals, setGoals] = useState({ ...(player.goals || {}) });
  const [active, setActive] = useState(cats[0] || "");
  const [step, setStep] = useState("S");

  const SMART_STEPS = ["S","M","A","R","T"];
  const SMART_LABELS = {S:"Specific",M:"Measurable",A:"Achievable",R:"Relevant",T:"Time-bound"};
  const SMART_ICONS = {S:"🎯",M:"📏",A:"✅",R:"🏒",T:"📅"};
  const SMART_EXAMPLES = {
    "Skating":      {S:"Improve my backward crossovers on both sides",M:"Coach rates me 'On Track' in skating within 4 weeks",A:"I can already do basic crossovers",R:"Better backward skating helps my gap control as a defender",T:"By end of October"},
    "Gap Control":  {S:"Maintain a 10-foot gap on all rush situations",M:"Reduce missed gap assignments to 0 per game",A:"I understand gap theory already",R:"Gap control is the #1 D skill in atom hockey",T:"Before Christmas break"},
    "Rush Reads":   {S:"Make the correct 2-on-1 decision every time",M:"Score 80%+ on Rush Reads in IceIQ",A:"I get the concept, just need reps",R:"Rush reads are my weakest IceIQ category",T:"End of this month"},
    "Shooting":     {S:"Improve my quick-release wrist shot accuracy",M:"Hit top corners 3 out of 5 in practice drills",A:"I have good fundamentals already",R:"Quick release is what separates scorers at this level",T:"Within 6 weeks"},
    "Game IQ":      {S:"Pre-read plays before the puck arrives",M:"IceIQ score improves from current to Hockey Sense tier",A:"I've started thinking about it more already",R:"Faster reads = better plays",T:"End of season"},
  };

  function updateGoal(cat, field, value) {
    setGoals(g => ({...g, [cat]: {...(g[cat]||{}), [field]: value}}));
  }

  const currentGoal = goals[active] || {};
  const completedSteps = SMART_STEPS.filter(s => currentGoal[s]?.trim());
  const isComplete = completedSteps.length === 5 && currentGoal.goal?.trim();
  const example = SMART_EXAMPLES[active] || {};

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.white,fontFamily:FONT.body,paddingBottom:80}}>
      <StickyHeader>
        <div style={{maxWidth:560,margin:"0 auto",display:"flex",alignItems:"center",gap:"1rem"}}>
          <BackBtn onClick={onBack}/>
          <div style={{flex:1}}>
            <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.1rem"}}>SMART Goals</div>
            <div style={{fontSize:11,color:C.dimmer}}>{player.level} · {Object.keys(goals).filter(k=>goals[k]?.goal).length}/{cats.length} set</div>
          </div>
          <button onClick={() => onSave(goals)} style={{background:C.gold,color:C.bg,border:"none",borderRadius:8,padding:".4rem 1rem",cursor:"pointer",fontWeight:800,fontSize:13,fontFamily:FONT.body}}>Save</button>
        </div>
      </StickyHeader>

      <div style={{padding:"1.25rem",maxWidth:560,margin:"0 auto"}}>
        {/* Category tabs */}
        <div style={{display:"flex",gap:".5rem",overflowX:"auto",marginBottom:"1.25rem",paddingBottom:".25rem"}}>
          {cats.map(cat => {
            const g = goals[cat]||{};
            const done = SMART_STEPS.filter(s=>g[s]?.trim()).length;
            const hasGoal = g.goal?.trim();
            return (
              <button key={cat} onClick={() => {setActive(cat);setStep("S");}} style={{
                background:active===cat?C.goldDim:C.bgCard,
                border:`1px solid ${active===cat?C.gold:C.border}`,
                borderRadius:20,padding:".45rem 1rem",
                cursor:"pointer",whiteSpace:"nowrap",
                color:active===cat?C.gold:C.dim,
                fontFamily:FONT.body,fontSize:13,
                fontWeight:active===cat?700:400,
                display:"flex",alignItems:"center",gap:".4rem",
                flexShrink:0,
              }}>
                {cat} {hasGoal?<span style={{color:C.green,fontSize:10}}>✓</span>:done>0?<span style={{color:C.dimmer,fontSize:10}}>{done}/5</span>:null}
              </button>
            );
          })}
        </div>

        {/* Goal statement */}
        <Card style={{marginBottom:"1rem",background:`linear-gradient(135deg,${C.goldDim},transparent)`}}>
          <Label>Your Goal — {active}</Label>
          <textarea
            value={currentGoal.goal||""}
            onChange={e => updateGoal(active,"goal",e.target.value)}
            placeholder={`What is your development goal for ${active}?`}
            rows={2}
            style={{background:"none",border:"none",color:C.white,fontSize:14,fontFamily:FONT.body,width:"100%",outline:"none",resize:"none",lineHeight:1.6}}
          />
          <div style={{height:1,background:currentGoal.goal?C.gold:C.border,marginTop:".5rem",transition:"background .2s"}}/>
        </Card>

        {/* SMART steps */}
        <div style={{marginBottom:"1rem"}}>
          <div style={{display:"flex",gap:".4rem",marginBottom:"1rem"}}>
            {SMART_STEPS.map(s => (
              <button key={s} onClick={() => setStep(s)} style={{
                flex:1,background:step===s?C.purpleDim:C.bgCard,
                border:`1px solid ${step===s?C.purpleBorder:C.border}`,
                borderRadius:8,padding:".5rem .25rem",
                cursor:"pointer",textAlign:"center",
              }}>
                <div style={{fontSize:15}}>{SMART_ICONS[s]}</div>
                <div style={{fontSize:10,color:step===s?C.purple:currentGoal[s]?C.green:C.dimmer,fontWeight:700}}>{s}</div>
              </button>
            ))}
          </div>

          <Card>
            <div style={{fontSize:11,color:C.purple,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",marginBottom:".35rem"}}>{SMART_ICONS[step]} {SMART_LABELS[step]}</div>
            <div style={{fontSize:12,color:C.dimmer,marginBottom:".85rem",lineHeight:1.6}}>{SMART_PROMPTS[step]}</div>
            {example[step] && (
              <div style={{fontSize:11,color:C.dimmer,background:C.dimmest,borderRadius:8,padding:".6rem .8rem",marginBottom:".85rem",lineHeight:1.5,fontStyle:"italic"}}>
                e.g. "{example[step]}"
              </div>
            )}
            <textarea
              value={currentGoal[step]||""}
              onChange={e => updateGoal(active,step,e.target.value)}
              placeholder="Write your answer here..."
              rows={3}
              style={{background:C.bgElevated,border:`1px solid ${C.border}`,borderRadius:10,padding:".75rem 1rem",color:C.white,fontSize:13,fontFamily:FONT.body,width:"100%",outline:"none",resize:"none",lineHeight:1.6}}
            />
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:".75rem"}}>
              <div style={{fontSize:11,color:C.dimmer}}>{completedSteps.length}/5 steps complete</div>
              {step !== "T" && (
                <button onClick={() => setStep(SMART_STEPS[SMART_STEPS.indexOf(step)+1])} style={{background:C.purple,color:C.white,border:"none",borderRadius:8,padding:".4rem 1rem",cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:FONT.body}}>
                  Next →
                </button>
              )}
              {step === "T" && isComplete && (
                <button onClick={() => onSave(goals)} style={{background:C.gold,color:C.bg,border:"none",borderRadius:8,padding:".4rem 1rem",cursor:"pointer",fontSize:12,fontWeight:800,fontFamily:FONT.body}}>
                  Save Goal ✓
                </button>
              )}
            </div>
          </Card>
        </div>

        {/* Completed goal preview */}
        {isComplete && (
          <Card style={{background:"rgba(34,197,94,.06)",border:`1px solid ${C.greenBorder}`}}>
            <div style={{fontSize:10,letterSpacing:".12em",textTransform:"uppercase",color:C.green,fontWeight:700,marginBottom:".5rem"}}>✓ Goal Complete</div>
            <div style={{fontSize:13,color:C.white,fontWeight:600,marginBottom:".5rem"}}>{currentGoal.goal}</div>
            {SMART_STEPS.map(s => (
              <div key={s} style={{fontSize:12,color:C.dim,marginBottom:".25rem",lineHeight:1.5}}>
                <span style={{color:C.green,fontWeight:700}}>{SMART_LABELS[s]}:</span> {currentGoal[s]}
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────
// SKILLS, REPORT, PROFILE, COACH, BOTTOM NAV (condensed)
// ─────────────────────────────────────────────────────────

// Rating button renderer — branches by scale type (emoji/frequency/growth/rubric)
function RatingButtons({ level, value, onChange }) {
  const scaleInfo = RATING_SCALES[level]?.self;
  if (!scaleInfo) return null;
  const { options } = scaleInfo;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:".4rem"}}>
      {options.map((o, i) => {
        const picked = value === o.value;
        return (
          <button key={o.value} onClick={() => onChange(o.value)} style={{
            background: picked ? `${o.color}1a` : C.bgElevated,
            border: `1px solid ${picked ? o.color+"60" : C.border}`,
            borderLeft: `3px solid ${picked ? o.color : "transparent"}`,
            borderRadius: 10, padding:".65rem .85rem", cursor:"pointer",
            display:"flex", alignItems:"center", gap:".7rem",
            textAlign:"left", fontFamily:FONT.body,
          }}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0,minWidth:26}}>
              <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.1rem",color:o.color,lineHeight:1}}>{i+1}</div>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:picked?o.color:C.white,marginBottom:2}}>{o.label}</div>
              <div style={{fontSize:11,color:C.dimmer,lineHeight:1.45}}>{o.sub}</div>
            </div>
            {picked && <div style={{color:o.color,fontSize:14,flexShrink:0}}>✓</div>}
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// UPGRADE PROMPT — reusable modal for gated features
// ─────────────────────────────────────────────────────────
const PRO_BENEFITS = [
  {icon:"🔓", text:"Access to all age groups (U7 → U13)"},
  {icon:"🎮", text:"All 5 question formats — sequence, spot the mistake, what happens next, true/false"},
  {icon:"🎯", text:"Position-specific questions (Forward, Defense, Goalie)"},
  {icon:"🧠", text:"Adaptive engine — difficulty matches your level"},
  {icon:"⭐", text:"SMART goals with category tracking"},
  {icon:"📊", text:"Full progress snapshots + Skills Map radar"},
  {icon:"♾️", text:"Unlimited session history"},
];
const FAMILY_BENEFITS = [
  {icon:"👨‍👩‍👧", text:"Everything in Pro"},
  {icon:"👥", text:"Up to 3 player profiles on one plan (siblings or parent-managed kids)"},
  {icon:"🔀", text:"Each profile has its own age group, ratings, goals"},
];
const TEAM_BENEFITS = [
  {icon:"👨‍🏫", text:"Everything in Pro"},
  {icon:"📋", text:"Coach dashboard — full roster view"},
  {icon:"⭐", text:"Per-player ratings & development notes for up to 20 players"},
  {icon:"📅", text:"Season pass: September → March (renews each season)"},
];

function UpgradePrompt({ feature, onClose, onViewPlans, target }) {
  const message = getUpgradeTriggerMessage(feature);
  const upgradeTarget = target || "pro";
  const benefits =
    upgradeTarget === "family" ? FAMILY_BENEFITS :
    upgradeTarget === "team"   ? TEAM_BENEFITS :
    PRO_BENEFITS;
  const tierName = upgradeTarget === "family" ? "Family" : upgradeTarget === "team" ? "Team" : "Pro";
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem",fontFamily:FONT.body}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.bgCard,border:`1px solid ${C.goldBorder}`,borderRadius:16,padding:"1.5rem",maxWidth:440,width:"100%",color:C.white}}>
        <div style={{fontSize:32,textAlign:"center",marginBottom:".5rem"}}>🔒</div>
        <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.5rem",textAlign:"center",marginBottom:".35rem",color:C.gold}}>{message}</div>
        <div style={{fontSize:12,color:C.dimmer,textAlign:"center",marginBottom:"1.25rem"}}>Unlock this and more with IceIQ {tierName}</div>

        <div style={{background:C.bgElevated,border:`1px solid ${C.border}`,borderRadius:10,padding:".85rem 1rem",marginBottom:"1rem"}}>
          <div style={{fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:C.gold,fontWeight:700,marginBottom:".6rem"}}>What you get with {tierName}</div>
          {benefits.map((b, i) => (
            <div key={i} style={{display:"flex",alignItems:"flex-start",gap:".55rem",padding:".3rem 0",fontSize:12,color:C.dim,lineHeight:1.5}}>
              <span style={{fontSize:14,flexShrink:0}}>{b.icon}</span>
              <span>{b.text}</span>
            </div>
          ))}
        </div>

        <div style={{display:"flex",gap:".5rem"}}>
          <button onClick={onClose} style={{flex:1,background:"none",border:`1px solid ${C.border}`,borderRadius:10,padding:".75rem",cursor:"pointer",color:C.dimmer,fontSize:13,fontFamily:FONT.body}}>Not now</button>
          <button onClick={onViewPlans} style={{flex:2,background:C.gold,color:C.bg,border:"none",borderRadius:10,padding:".75rem",cursor:"pointer",fontWeight:800,fontSize:13,fontFamily:FONT.body}}>View Plans →</button>
        </div>
      </div>
    </div>
  );
}

function LockedCard({ feature, title, description, onUnlock }) {
  return (
    <Card style={{marginBottom:"1rem",background:C.bgElevated,border:`1px dashed ${C.border}`,textAlign:"center",padding:"1.5rem"}}>
      <div style={{fontSize:32,marginBottom:".5rem",opacity:.5}}>🔒</div>
      <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.1rem",color:C.dim,marginBottom:".35rem"}}>{title}</div>
      <div style={{fontSize:12,color:C.dimmer,marginBottom:"1rem",lineHeight:1.5}}>{description}</div>
      <button onClick={onUnlock} style={{background:C.gold,color:C.bg,border:"none",borderRadius:10,padding:".6rem 1.25rem",cursor:"pointer",fontWeight:800,fontSize:13,fontFamily:FONT.body}}>
        Unlock with Pro →
      </button>
    </Card>
  );
}

// Level-aware question phrasing
function getSelfPrompt(level, skill) {
  if (level === "U7 / Initiation") return skill.desc;
  if (level === "U9 / Novice") {
    const q = skill.selfQ || skill.desc;
    // Reframe as frequency-friendly if needed
    if (q.startsWith("Can you ")) return "How often can you " + q.slice(8);
    if (q.startsWith("Do you ")) return "How often do you " + q.slice(7);
    return q;
  }
  return skill.selfQ || skill.desc;
}

function Skills({ player, onSave, onBack }) {
  const [ratings, setR] = useState({...player.selfRatings});
  const [ac, setAc] = useState(0);
  const cats = SKILLS[player.level] || [];
  const cat = cats[ac];
  const total = Object.keys(ratings).length;
  const rated = Object.values(ratings).filter(v=>v!==null).length;
  const selfScale = getSelfScale(player.level);
  const scaleType = RATING_SCALES[player.level]?.self?.type;
  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.white,fontFamily:FONT.body,paddingBottom:80}}>
      <StickyHeader>
        <div style={{maxWidth:560,margin:"0 auto",display:"flex",alignItems:"center",gap:"1rem"}}>
          <BackBtn onClick={onBack}/>
          <div style={{flex:1}}>
            <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.1rem"}}>My Skills</div>
            <div style={{fontSize:11,color:C.dimmer}}>{rated}/{total} rated</div>
          </div>
          <ProgressBar value={rated} max={total} color={C.gold} height={4}/>
          <button onClick={()=>onSave(ratings)} style={{background:C.gold,color:C.bg,border:"none",borderRadius:8,padding:".4rem 1rem",cursor:"pointer",fontWeight:800,fontSize:13,fontFamily:FONT.body}}>Save</button>
        </div>
      </StickyHeader>
      <div style={{display:"flex",overflowX:"auto",borderBottom:`1px solid ${C.border}`,background:C.bg}}>
        {cats.map((c,i) => {
          const cr = c.skills.filter(s=>ratings[s.id]!==null).length;
          return (
            <button key={i} onClick={()=>setAc(i)} style={{background:"none",border:"none",borderBottom:`2px solid ${i===ac?(c.isDM?C.purple:C.gold):"transparent"}`,color:i===ac?C.white:C.dimmer,padding:".8rem 1rem",cursor:"pointer",fontSize:13,fontFamily:FONT.body,fontWeight:i===ac?700:400,whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:".3rem",flexShrink:0}}>
              <span>{c.icon}</span><span>{c.cat}</span>{cr===c.skills.length&&<span style={{color:C.green,fontSize:10}}>✓</span>}
            </button>
          );
        })}
      </div>
      <div style={{padding:"1.25rem",maxWidth:560,margin:"0 auto"}}>
        {cat?.isDM && <Card style={{marginBottom:"1rem",background:C.purpleDim,border:`1px solid ${C.purpleBorder}`}}><div style={{fontSize:12,color:C.purple,lineHeight:1.6}}>🧠 Rate honestly — this is for your development, not anyone else's judgment.</div></Card>}
        {scaleType === "rubric" && (
          <Card style={{marginBottom:"1rem",background:C.bgElevated}}>
            <div style={{fontSize:10,letterSpacing:".12em",textTransform:"uppercase",color:C.gold,fontWeight:700,marginBottom:".5rem"}}>How to rate yourself</div>
            <div style={{fontSize:12,color:C.dim,lineHeight:1.6}}>Each level has a specific behavior. Pick the one that sounds most like you in games — not practice. Be honest: this creates better conversations with your coach.</div>
          </Card>
        )}
        {cat?.skills.map(s => {
          const selfVal = ratings[s.id];
          const selfColor = selfVal ? getScaleColor(selfScale, selfVal) : null;
          return (
            <Card key={s.id} style={{marginBottom:".75rem",border:`1px solid ${selfColor?selfColor+"40":C.border}`,borderLeft:`3px solid ${selfColor||"transparent"}`}}>
              <div style={{fontWeight:700,fontSize:14,marginBottom:3}}>{s.name}</div>
              <div style={{fontSize:12,color:C.dimmer,marginBottom:".85rem",lineHeight:1.5}}>{getSelfPrompt(player.level, s)}</div>
              <RatingButtons level={player.level} value={selfVal} onChange={v => setR(p=>({...p,[s.id]:v}))} />
            </Card>
          );
        })}
        {ac<cats.length-1 && <SecBtn onClick={()=>setAc(i=>i+1)}>Next Category →</SecBtn>}
        {ac===cats.length-1 && <PrimaryBtn onClick={()=>onSave(ratings)}>Save All Ratings ✓</PrimaryBtn>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// RADAR / SPIDER CHART — skill breakdown visualization
// Averages each skill category and plots self + coach on the same axes
// ─────────────────────────────────────────────────────────
function SkillsRadar({ cats, selfRatings, coachRatings, selfScale, coachScale }) {
  const W = 320, H = 320;
  const cx = W / 2, cy = H / 2;
  const radius = 110;
  const rings = [0.25, 0.5, 0.75, 1.0];
  // One axis per category — average the skills within each category
  const axes = cats.map(cat => {
    const selfVals = cat.skills.map(s => selfRatings?.[s.id]).filter(Boolean);
    const coachVals = cat.skills.map(s => coachRatings?.[s.id]).filter(Boolean);
    const avgSelf = selfVals.length
      ? selfVals.map(v => normalizeRating(selfScale, v)).filter(x => x !== null).reduce((a,b)=>a+b,0) / Math.max(1, selfVals.filter(v => normalizeRating(selfScale, v) !== null).length)
      : null;
    const avgCoach = coachVals.length
      ? coachVals.map(v => normalizeRating(coachScale, v)).filter(x => x !== null).reduce((a,b)=>a+b,0) / Math.max(1, coachVals.filter(v => normalizeRating(coachScale, v) !== null).length)
      : null;
    return { label: cat.cat, icon: cat.icon, self: avgSelf, coach: avgCoach };
  }).filter(a => a.self !== null || a.coach !== null);

  if (axes.length < 3) return (
    <div style={{fontSize:12,color:C.dimmer,fontStyle:"italic",textAlign:"center",padding:"1rem 0"}}>Rate at least 3 skill categories to see your Skills Map.</div>
  );

  const n = axes.length;
  // Angle 0 at top, clockwise
  const angle = i => -Math.PI/2 + (i * 2*Math.PI/n);
  const point = (i, r) => [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))];

  // Build polygons for self and coach
  const selfPath = axes.map((a, i) => {
    const [x, y] = point(i, (a.self ?? 0) * radius);
    return `${i===0?"M":"L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ") + " Z";
  const hasCoach = axes.some(a => a.coach !== null);
  const coachPath = hasCoach ? axes.map((a, i) => {
    const [x, y] = point(i, (a.coach ?? 0) * radius);
    return `${i===0?"M":"L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ") + " Z" : null;

  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{display:"block",maxWidth:"100%",height:"auto"}}>
        {/* Grid rings */}
        {rings.map(r => {
          const pts = axes.map((_, i) => point(i, r * radius).map(v => v.toFixed(1)).join(",")).join(" ");
          return <polygon key={r} points={pts} fill="none" stroke={C.border} strokeWidth="1" opacity={0.5}/>;
        })}
        {/* Axis lines */}
        {axes.map((_, i) => {
          const [x, y] = point(i, radius);
          return <line key={i} x1={cx} y1={cy} x2={x.toFixed(1)} y2={y.toFixed(1)} stroke={C.border} strokeWidth="1" opacity={0.4}/>;
        })}
        {/* Coach polygon (under self) */}
        {coachPath && (
          <path d={coachPath} fill={C.gold} fillOpacity="0.08" stroke={C.gold} strokeWidth="2" strokeOpacity="0.65"/>
        )}
        {/* Self polygon */}
        <path d={selfPath} fill={C.purple} fillOpacity="0.18" stroke={C.purple} strokeWidth="2"/>
        {/* Self data points */}
        {axes.map((a, i) => {
          if (a.self === null) return null;
          const [x, y] = point(i, a.self * radius);
          return <circle key={`s${i}`} cx={x.toFixed(1)} cy={y.toFixed(1)} r="3.5" fill={C.purple}/>;
        })}
        {/* Coach data points */}
        {hasCoach && axes.map((a, i) => {
          if (a.coach === null) return null;
          const [x, y] = point(i, a.coach * radius);
          return <circle key={`c${i}`} cx={x.toFixed(1)} cy={y.toFixed(1)} r="3.5" fill={C.gold}/>;
        })}
        {/* Category labels */}
        {axes.map((a, i) => {
          const [lx, ly] = point(i, radius + 22);
          const anchor = Math.abs(lx - cx) < 8 ? "middle" : (lx > cx ? "start" : "end");
          return (
            <g key={`l${i}`}>
              <text x={lx.toFixed(1)} y={ly.toFixed(1)} fontSize="10" fontWeight="700" fill={C.white} textAnchor={anchor} dominantBaseline="middle" fontFamily="'Inter', 'DM Sans', sans-serif">
                {a.icon} {a.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div style={{display:"flex",gap:"1.25rem",marginTop:".75rem",fontSize:11}}>
        <div style={{display:"flex",alignItems:"center",gap:".3rem",color:C.dim}}>
          <span style={{display:"inline-block",width:10,height:10,background:C.purple,borderRadius:"50%"}}/> Self
        </div>
        {hasCoach && (
          <div style={{display:"flex",alignItems:"center",gap:".3rem",color:C.dim}}>
            <span style={{display:"inline-block",width:10,height:10,background:C.gold,borderRadius:"50%"}}/> Coach
          </div>
        )}
      </div>
    </div>
  );
}

function Report({ player, onBack, demoCoachData, tier, onUpgrade }) {
  const latest = player.quizHistory[player.quizHistory.length-1];
  const iq = latest ? calcWeightedIQ(latest.results) : null;
  const iqTier = iq !== null ? getTier(iq) : null;
  const canSeeRadar = canAccess("progressSnapshots", tier || "FREE").allowed;
  const goals = player.goals || {};
  const activeGoals = Object.entries(goals).filter(([,v])=>v?.goal?.trim());
  const [coachRatings, setCoachRatings] = useState(null);
  const [coachNotes, setCoachNotes] = useState({});
  const [loadingCoach, setLoadingCoach] = useState(true);

  useEffect(() => {
    if (demoCoachData) {
      setCoachRatings(demoCoachData.ratings || null);
      setCoachNotes(demoCoachData.notes || {});
      setLoadingCoach(false);
      return;
    }
    if (player.id && player.id !== "__demo__") {
      SB.getCoachRatingsForPlayer(player.id).then(data => {
        setCoachRatings(Object.keys(data.ratings || {}).length ? data.ratings : null);
        setCoachNotes(data.notes || {});
        setLoadingCoach(false);
      });
    } else {
      setLoadingCoach(false);
    }
  }, []);

  const cats = SKILLS[player.level] || [];
  const selfScale = getSelfScale(player.level);
  const coachScale = getCoachScale(player.level);

  // Compute alignment across all rated skills
  const allSkills = cats.flatMap(c => c.skills);
  const aligned = [], gaps = [];
  allSkills.forEach(skill => {
    const sv = player.selfRatings?.[skill.id];
    const cv = coachRatings?.[skill.id];
    if (!sv || !cv) return;
    const sn = normalizeRating(selfScale, sv);
    const cn = normalizeRating(coachScale, cv);
    if (sn === null || cn === null) return;
    const diff = Math.abs(sn - cn);
    if (diff <= 0.2) aligned.push({skill, sn, cn, diff});
    else gaps.push({skill, sn, cn, diff, selfHigher: sn > cn});
  });
  gaps.sort((a,b) => b.diff - a.diff);
  const bothRatedCount = aligned.length + gaps.length;
  const topDiscussion = gaps.slice(0, 3);
  return (
    <Screen>
      <div style={{position:"relative",height:100,overflow:"hidden",borderRadius:16,marginBottom:"1rem"}}>
        <img src={imgDataPanel} alt="" style={{width:"100%",height:"100%",objectFit:"cover",opacity:0.2}}/>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(8,14,26,1) 0%,transparent 100%)"}}/>
      </div>
      <BackBtn onClick={onBack}/>
      <div style={{marginBottom:"1.5rem"}}>
        <div style={{fontSize:10,letterSpacing:".16em",color:C.gold,textTransform:"uppercase",fontWeight:700,marginBottom:4}}>Player Development Report</div>
        <h1 style={{fontFamily:FONT.display,fontWeight:800,fontSize:"clamp(1.8rem,6vw,2.6rem)",margin:"0 0 .25rem",lineHeight:1}}>{player.name}</h1>
        <div style={{fontSize:13,color:C.dimmer}}>{player.level} · {player.position} · {player.season||SEASONS[0]}</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".75rem",marginBottom:"1rem"}}>
        <Card style={{background:`linear-gradient(135deg,${C.bgCard},${C.bgElevated})`,border:`1px solid ${C.goldBorder}`,textAlign:"center"}}>
          <Label>Hockey IQ</Label>
          <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"3rem",color:iq!==null?iqTier.color:"rgba(255,255,255,.15)",lineHeight:1}}>{iq!==null?`${iq}%`:"—"}</div>
          {iqTier && <div style={{fontSize:12,color:C.dimmer,marginTop:4}}>{iqTier.label}</div>}
        </Card>
        <Card style={{textAlign:"center"}}>
          <Label>Sessions</Label>
          <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"3rem",color:C.gold,lineHeight:1}}>{player.quizHistory.length}</div>
          <div style={{fontSize:12,color:C.dimmer,marginTop:4}}>this season</div>
        </Card>
      </div>
      {activeGoals.length > 0 && (
        <Card style={{marginBottom:"1rem"}}>
          <Label>Active SMART Goals</Label>
          {activeGoals.map(([cat,g]) => (
            <div key={cat} style={{padding:".65rem 0",borderBottom:`1px solid ${C.border}`}}>
              <div style={{fontSize:11,color:C.gold,fontWeight:700,marginBottom:2}}>{cat}</div>
              <div style={{fontSize:13,color:C.dim,lineHeight:1.5}}>{g.goal}</div>
              {g.T && <div style={{fontSize:11,color:C.dimmer,marginTop:2}}>📅 {g.T}</div>}
            </div>
          ))}
        </Card>
      )}
      {/* Alignment Score — summary */}
      {coachRatings && bothRatedCount > 0 && (
        <Card style={{marginBottom:"1rem",background:`linear-gradient(135deg,${C.bgCard},${C.bgElevated})`,border:`1px solid ${C.purpleBorder}`}}>
          <Label>Coach Alignment</Label>
          <div style={{display:"flex",alignItems:"flex-end",gap:"1rem",marginBottom:".75rem"}}>
            <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"2.8rem",color:C.purple,lineHeight:1}}>{aligned.length}<span style={{fontSize:"1.2rem",color:C.dimmer}}>/{bothRatedCount}</span></div>
            <div style={{fontSize:12,color:C.dim,lineHeight:1.5,paddingBottom:".4rem"}}>skills where you and your coach see things the same way</div>
          </div>
          {topDiscussion.length > 0 && (
            <div style={{marginTop:".75rem",paddingTop:".75rem",borderTop:`1px solid ${C.border}`}}>
              <div style={{fontSize:10,letterSpacing:".12em",textTransform:"uppercase",color:C.gold,fontWeight:700,marginBottom:".5rem"}}>💬 Recommended Discussion Topics</div>
              {topDiscussion.map(({skill, selfHigher}) => (
                <div key={skill.id} style={{fontSize:12,color:C.dim,lineHeight:1.5,padding:".35rem 0"}}>
                  <span style={{color:C.white,fontWeight:600}}>{skill.name}</span> — {selfHigher ? "you rated higher than your coach" : "your coach rated higher than you"}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Radar / Spider chart — gated to Pro (progressSnapshots) */}
      {Object.values(player.selfRatings||{}).some(v=>v) && (
        canSeeRadar ? (
          <Card style={{marginBottom:"1rem"}}>
            <Label>Skills Map</Label>
            <div style={{fontSize:11,color:C.dimmer,marginBottom:".75rem",lineHeight:1.5}}>Each axis is a skill category. Purple = your self-rating. Gold = your coach.</div>
            <SkillsRadar cats={cats} selfRatings={player.selfRatings} coachRatings={coachRatings} selfScale={selfScale} coachScale={coachScale}/>
          </Card>
        ) : (
          <Card style={{marginBottom:"1rem",background:C.bgElevated,border:`1px dashed ${C.border}`,textAlign:"center",padding:"1.25rem"}}>
            <div style={{fontSize:24,marginBottom:".35rem",opacity:.6}}>🔒</div>
            <Label>Skills Map</Label>
            <div style={{fontSize:12,color:C.dimmer,marginBottom:"0.85rem",lineHeight:1.5}}>See all your skill categories at a glance — your self-rating vs. coach, visualized.</div>
            <button onClick={()=>onUpgrade && onUpgrade("progressSnapshots","pro")} style={{background:C.gold,color:C.bg,border:"none",borderRadius:8,padding:".55rem 1.1rem",cursor:"pointer",fontWeight:800,fontSize:12,fontFamily:FONT.body}}>
              Unlock with Pro →
            </button>
          </Card>
        )
      )}

      {/* Self vs Coach comparison */}
      {(coachRatings || loadingCoach || Object.values(player.selfRatings||{}).some(v=>v)) && (
        <Card style={{marginBottom:"1rem"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem"}}>
            <Label style={{marginBottom:0}}>Skills — Self vs Coach</Label>
            {loadingCoach && <span style={{fontSize:11,color:C.dimmer}}>Loading…</span>}
            {!loadingCoach && coachRatings && <span style={{fontSize:11,color:C.green}}>Coach rated ✓</span>}
          </div>
          {cats.map(cat => (
            <div key={cat.cat} style={{marginBottom:"1.1rem"}}>
              <div style={{display:"flex",alignItems:"center",gap:".4rem",marginBottom:".5rem"}}>
                <span>{cat.icon}</span>
                <span style={{fontSize:11,color:C.dimmer,fontWeight:700,textTransform:"uppercase",letterSpacing:".1em"}}>{cat.cat}</span>
              </div>
              {cat.skills.map(skill => {
                const selfR = player.selfRatings?.[skill.id];
                const coachR = coachRatings?.[skill.id];
                const selfLabel = selfR ? getScaleLabel(selfScale, selfR) : null;
                const selfColor = selfR ? getScaleColor(selfScale, selfR) : null;
                const coachLabel = coachR ? getScaleLabel(coachScale, coachR) : null;
                const coachColor = coachR ? getScaleColor(coachScale, coachR) : null;
                const sn = selfR ? normalizeRating(selfScale, selfR) : null;
                const cn = coachR ? normalizeRating(coachScale, coachR) : null;
                const prompt = getDiscussionPrompt(skill.name, sn, cn);
                const gap = (sn!==null && cn!==null) ? Math.abs(sn-cn) : 0;
                const hasGap = gap > 0.2;
                const note = coachNotes?.[skill.id];
                return (
                  <div key={skill.id} style={{marginBottom:".6rem",padding:".75rem .9rem",background:C.bgElevated,borderRadius:10,border:`1px solid ${hasGap?C.goldBorder:C.border}`,borderLeft:hasGap?`3px solid ${C.gold}`:`1px solid ${C.border}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:".6rem"}}>
                      <div style={{fontSize:13,fontWeight:600,color:C.white}}>{skill.name}</div>
                      {hasGap && <div style={{fontSize:9,letterSpacing:".08em",textTransform:"uppercase",color:C.gold,fontWeight:700,background:C.goldDim,padding:"2px 6px",borderRadius:4}}>Discuss</div>}
                    </div>
                    {/* Alignment bar */}
                    {(sn!==null || cn!==null) && (
                      <div style={{position:"relative",height:6,background:C.dimmest,borderRadius:3,marginBottom:".55rem"}}>
                        {sn!==null && <div style={{position:"absolute",left:`${sn*100}%`,top:-3,width:12,height:12,marginLeft:-6,borderRadius:"50%",background:selfColor,border:`2px solid ${C.bg}`,zIndex:2}} title="You"/>}
                        {cn!==null && <div style={{position:"absolute",left:`${cn*100}%`,top:-3,width:12,height:12,marginLeft:-6,borderRadius:"50%",background:coachColor,border:`2px solid ${C.bg}`,boxShadow:`0 0 0 2px ${coachColor}40`,zIndex:1}} title="Coach"/>}
                      </div>
                    )}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".5rem"}}>
                      <div style={{background:selfR?`${selfColor}12`:"none",border:`1px solid ${selfR?selfColor+"35":C.border}`,borderRadius:8,padding:".4rem .65rem"}}>
                        <div style={{fontSize:10,color:C.dimmer,marginBottom:2}}>You said</div>
                        <div style={{fontSize:12,fontWeight:700,color:selfR?selfColor:C.dimmer}}>{selfLabel||"Not rated"}</div>
                      </div>
                      <div style={{background:coachR?`${coachColor}12`:"none",border:`1px solid ${coachR?coachColor+"35":C.border}`,borderRadius:8,padding:".4rem .65rem"}}>
                        <div style={{fontSize:10,color:C.dimmer,marginBottom:2}}>Coach says</div>
                        <div style={{fontSize:12,fontWeight:700,color:coachR?coachColor:C.dimmer}}>{coachLabel||"Pending"}</div>
                      </div>
                    </div>
                    {prompt && (
                      <div style={{marginTop:".55rem",padding:".5rem .65rem",background:C.goldDim,borderRadius:6,fontSize:11,color:C.gold,lineHeight:1.5,borderLeft:`2px solid ${C.gold}`}}>
                        💬 {prompt}
                      </div>
                    )}
                    {note && (
                      <div style={{marginTop:".55rem",padding:".55rem .7rem",background:C.purpleDim,borderRadius:6,fontSize:12,color:C.white,lineHeight:1.5,borderLeft:`2px solid ${C.purple}`}}>
                        <div style={{fontSize:9,letterSpacing:".1em",textTransform:"uppercase",color:C.purple,fontWeight:700,marginBottom:3}}>Coach's note</div>
                        {note}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          {!loadingCoach && !coachRatings && (
            <div style={{fontSize:13,color:C.dimmer,textAlign:"center",padding:".75rem 0"}}>
              No coach ratings yet — share your invite link from Settings.
            </div>
          )}
        </Card>
      )}

      <Card style={{marginBottom:"1rem"}}>
        <Label>IQ Score History</Label>
        {player.quizHistory.length === 0 ? (
          <div style={{fontSize:13,color:C.dimmer}}>No sessions yet — take your first quiz.</div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:".5rem"}}>
            {player.quizHistory.slice(-5).reverse().map((h,i) => {
              const s = calcWeightedIQ(h.results);
              const t = getTier(s);
              return (
                <div key={i} style={{display:"flex",alignItems:"center",gap:".75rem",padding:".5rem 0",borderBottom:`1px solid ${C.border}`}}>
                  <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.4rem",color:t.color,minWidth:52}}>{s}%</div>
                  <div style={{flex:1}}><div style={{fontSize:12,color:C.dim}}>{t.label}</div></div>
                  <ProgressBar value={s} max={100} color={t.color} height={3}/>
                </div>
              );
            })}
          </div>
        )}
      </Card>
      <Card style={{marginBottom:"1rem",background:`linear-gradient(135deg,${C.bgCard},${C.bgElevated})`,border:`1px solid ${C.goldBorder}`,textAlign:"center"}}>
        <div style={{fontSize:18,marginBottom:".5rem"}}>📋</div>
        <div style={{fontWeight:700,fontSize:14,color:C.gold,marginBottom:".4rem"}}>Tryout Package</div>
        <div style={{fontSize:12,color:C.dimmer,marginBottom:"1rem",lineHeight:1.6}}>One-page PDF with your IQ Score, skill profile, SMART goals, and development arc — formatted for coaches to read in 30 seconds.</div>
        <div style={{background:C.goldDim,color:C.gold,border:`1px solid ${C.goldBorder}`,borderRadius:8,padding:".6rem 1rem",fontSize:13,fontWeight:700}}>🔒 Premium Feature · Coming Soon</div>
      </Card>
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────
// ADMIN: QUESTION REPORTS
// ─────────────────────────────────────────────────────────
const ADMIN_EMAIL = "mtslifka@gmail.com";

function AdminReports({ onBack }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qbFlat, setQbFlat] = useState([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [data, qb] = await Promise.all([SB.getQuestionReports(), loadQB()]);
      setReports(data);
      setQbFlat(Object.values(qb).flat());
      setLoading(false);
    })();
  }, []);

  async function handleResolve(id) {
    const ok = await SB.resolveReport(id);
    if (ok) setReports(prev => prev.map(r => r.id === id ? { ...r, resolved: true } : r));
  }

  const unresolvedCount = reports.filter(r => !r.resolved).length;
  function getQuestionText(questionId) {
    const q = qbFlat.find(x => x.id === questionId);
    return q ? (q.q || q.question || q.prompt || JSON.stringify(q).slice(0, 120)) : null;
  }

  return (
    <Screen>
      <BackBtn onClick={onBack} />
      <div style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: "1.8rem", marginBottom: ".5rem" }}>Question Reports</div>
      <div style={{ fontSize: 13, color: C.dim, marginBottom: "1.25rem" }}>
        {loading ? "Loading..." : `${unresolvedCount} unresolved report${unresolvedCount !== 1 ? "s" : ""}`}
      </div>
      {!loading && reports.length === 0 && (
        <Card><div style={{ color: C.dimmer, textAlign: "center", padding: "1.5rem 0" }}>No reports yet.</div></Card>
      )}
      {reports.map(r => {
        const qText = getQuestionText(r.question_id);
        return (
          <Card key={r.id} style={{ marginBottom: ".75rem", border: `1px solid ${r.resolved ? C.greenBorder : C.redBorder}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".5rem" }}>
              <Pill color={r.resolved ? C.green : C.red}>{r.resolved ? "Resolved" : "Open"}</Pill>
              <span style={{ fontSize: 11, color: C.dimmer }}>{new Date(r.created_at).toLocaleDateString()}</span>
            </div>
            <Label>Question ID</Label>
            <div style={{ fontSize: 13, color: C.white, marginBottom: ".5rem", wordBreak: "break-all" }}>{r.question_id}</div>
            {qText && (
              <>
                <Label>Question Text</Label>
                <div style={{ fontSize: 12, color: C.dim, marginBottom: ".5rem", lineHeight: 1.5, background: C.bgElevated, borderRadius: 8, padding: ".6rem .75rem", border: `1px solid ${C.border}` }}>{qText}</div>
              </>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".5rem", marginBottom: ".5rem" }}>
              <div><Label>Level</Label><div style={{ fontSize: 13, color: C.dim }}>{r.level || "—"}</div></div>
              <div><Label>Reason</Label><div style={{ fontSize: 13, color: C.gold }}>{r.reason || "—"}</div></div>
            </div>
            {r.detail && (
              <>
                <Label>Detail</Label>
                <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.5, marginBottom: ".5rem" }}>{r.detail}</div>
              </>
            )}
            {!r.resolved && (
              <button onClick={() => handleResolve(r.id)} style={{
                background: C.greenDim, color: C.green, border: `1px solid ${C.greenBorder}`,
                borderRadius: 10, padding: ".55rem", cursor: "pointer", fontSize: 13,
                fontFamily: FONT.body, fontWeight: 700, width: "100%", marginTop: ".25rem"
              }}>Mark Resolved</button>
            )}
          </Card>
        );
      })}
    </Screen>
  );
}

function Profile({ player, onSave, onBack, onReset, demoMode, tier, onUpgrade, userEmail, onAdminReports }) {
  const positionLocked = !canAccess("positionFilter", tier || "FREE").allowed;
  const levelSwitchGated = !canAccess("multipleAgeGroups", tier || "FREE").allowed;
  const [s, setS] = useState({...player});
  const upd = k => v => setS(p => ({...p,[k]:v}));
  const [teams, setTeams] = useState([]);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinMsg, setJoinMsg] = useState("");

  useEffect(() => {
    if (demoMode) {
      // Fake demo team
      setTeams([{ id:"demo-team", name:"U11 AA Edmonton Selects", level:"U11 / Atom", season:SEASONS[0] }]);
      return;
    }
    if (player.id && player.id !== "__demo__") SB.getPlayerTeams(player.id).then(setTeams);
  }, [player.id, demoMode]);

  async function joinTeam() {
    if (!joinCode.trim()) return;
    if (demoMode) { setJoinMsg("Sign up to join real teams"); return; }
    setJoining(true); setJoinMsg("");
    try {
      const team = await SB.joinTeamByCode(player.id, joinCode.trim());
      setTeams([...teams, team]);
      setJoinCode("");
      setJoinMsg(`Joined ${team.name} ✓`);
    } catch (e) {
      setJoinMsg(e.message || "Could not join team");
    }
    setJoining(false);
  }

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.white,fontFamily:FONT.body,paddingBottom:80}}>
      <div style={{position:"relative",height:120,overflow:"hidden"}}>
        <img src={imgProfile} alt="" style={{width:"100%",height:"100%",objectFit:"cover",opacity:0.2}}/>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(8,14,26,1) 0%,transparent 100%)"}}/>
      </div>
      <StickyHeader>
        <div style={{maxWidth:560,margin:"0 auto",display:"flex",alignItems:"center",gap:"1rem"}}>
          <BackBtn onClick={onBack}/>
          <div style={{flex:1,fontFamily:FONT.display,fontWeight:800,fontSize:"1.1rem"}}>Settings</div>
          <button onClick={()=>onSave(s)} style={{background:C.gold,color:C.bg,border:"none",borderRadius:8,padding:".4rem 1rem",cursor:"pointer",fontWeight:800,fontSize:13,fontFamily:FONT.body}}>Save</button>
        </div>
      </StickyHeader>
      <div style={{padding:"1.25rem",maxWidth:560,margin:"0 auto"}}>
        <Card style={{marginBottom:"1rem"}}>
          <Label>Player Profile</Label>
          {[["name","Display name",""],["city","City / Province or State",""],["jersey","Jersey number",""]].map(([k,ph]) => (
            <input key={k} value={s[k]||""} onChange={e=>upd(k)(e.target.value)} placeholder={ph}
              style={{background:C.bgElevated,border:`1px solid ${C.border}`,borderRadius:8,padding:".65rem .9rem",color:C.white,fontSize:14,fontFamily:FONT.body,width:"100%",outline:"none",marginBottom:".6rem",display:"block"}}/>
          ))}
        </Card>
        <Card style={{marginBottom:"1rem"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:".25rem"}}>
            <Label style={{marginBottom:0}}>Position</Label>
            {positionLocked && <button onClick={()=>onUpgrade && onUpgrade("positionFilter","pro")} style={{background:"none",border:"none",color:C.gold,fontSize:11,cursor:"pointer",fontFamily:FONT.body,fontWeight:700,textDecoration:"underline"}}>🔒 Unlock</button>}
          </div>
          {positionLocked && <div style={{fontSize:11,color:C.dimmer,marginBottom:".6rem",lineHeight:1.5}}>Position-specific questions are a Pro feature. Free tier serves all skater questions.</div>}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".5rem",opacity:positionLocked?0.5:1,pointerEvents:positionLocked?"none":"auto"}}>
            {[{p:"Forward",i:"⚡"},{p:"Defense",i:"🛡"},{p:"Goalie",i:"🧤"},{p:"Not Sure",i:"❓"}].map(({p,i})=>(
              <button key={p} onClick={()=>upd("position")(p)} style={{background:s.position===p?C.goldDim:C.bgElevated,border:`1px solid ${s.position===p?C.gold:C.border}`,borderRadius:10,padding:".75rem .5rem",cursor:"pointer",textAlign:"center",color:s.position===p?C.gold:C.dim,fontFamily:FONT.body,fontSize:13,fontWeight:s.position===p?700:400}}>
                <div style={{fontSize:20,marginBottom:3}}>{i}</div>{p}
              </button>
            ))}
          </div>
        </Card>
        <Card style={{marginBottom:"1rem"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:".25rem"}}>
            <Label style={{marginBottom:0}}>Level</Label>
            {levelSwitchGated && <button onClick={()=>onUpgrade && onUpgrade("multipleAgeGroups","pro")} style={{background:"none",border:"none",color:C.gold,fontSize:11,cursor:"pointer",fontFamily:FONT.body,fontWeight:700,textDecoration:"underline"}}>🔒 Unlock all ages</button>}
          </div>
          {levelSwitchGated && <div style={{fontSize:11,color:C.dimmer,marginBottom:".6rem",lineHeight:1.5}}>Free tier is locked to one age group. Upgrade to Pro for all age groups.</div>}
          <div style={{display:"flex",flexDirection:"column",gap:".5rem"}}>
            {LEVELS.map(l=>{
              const isCurrent = s.level === l;
              const locked = levelSwitchGated && !isCurrent;
              return (
                <button key={l} disabled={locked} onClick={()=>{
                  if (locked) { onUpgrade && onUpgrade("multipleAgeGroups","pro"); return; }
                  upd("level")(l);
                }} style={{background:isCurrent?C.goldDim:"none",border:`1px solid ${isCurrent?C.gold:C.border}`,borderRadius:8,padding:".65rem 1rem",cursor:"pointer",textAlign:"left",color:isCurrent?C.gold:(locked?C.dimmer:C.dim),fontFamily:FONT.body,fontSize:14,fontWeight:isCurrent?700:400,display:"flex",justifyContent:"space-between",alignItems:"center",opacity:locked?0.5:1}}>
                  <span>{l}</span>
                  {isCurrent && <span>✓</span>}
                  {locked && <span style={{fontSize:11}}>🔒</span>}
                </button>
              );
            })}
          </div>
        </Card>
        <Card style={{marginBottom:"1rem"}}>
          <Label>Season</Label>
          <div style={{display:"flex",gap:".5rem",flexWrap:"wrap"}}>
            {SEASONS.map(ss=><button key={ss} onClick={()=>upd("season")(ss)} style={{background:s.season===ss?C.goldDim:C.bgElevated,border:`1px solid ${s.season===ss?C.gold:C.border}`,borderRadius:8,padding:".45rem .85rem",cursor:"pointer",fontSize:13,fontFamily:FONT.body,fontWeight:s.season===ss?700:400,color:s.season===ss?C.gold:C.dim}}>{ss}</button>)}
          </div>
        </Card>
        <Card style={{marginBottom:"1rem"}}>
          <Label>Quiz Preferences</Label>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:".85rem"}}>
            <span style={{fontSize:13,color:C.dim}}>Colorblind mode</span>
            <button onClick={()=>upd("colorblind")(!s.colorblind)} style={{background:s.colorblind?C.purpleDim:"none",border:`1px solid ${s.colorblind?C.purpleBorder:C.border}`,borderRadius:20,padding:".3rem .9rem",cursor:"pointer",color:s.colorblind?C.purple:C.dimmer,fontSize:12,fontFamily:FONT.body,fontWeight:700}}>{s.colorblind?"ON":"OFF"}</button>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:13,color:C.dim}}>Session length</span>
            <div style={{display:"flex",gap:".4rem"}}>
              {[5,10,15,20].map(n=><button key={n} onClick={()=>upd("sessionLength")(n)} style={{background:(s.sessionLength||10)===n?C.goldDim:C.bgElevated,border:`1px solid ${(s.sessionLength||10)===n?C.gold:C.border}`,borderRadius:8,padding:".35rem .7rem",cursor:"pointer",fontSize:13,fontFamily:FONT.body,fontWeight:(s.sessionLength||10)===n?700:400,color:(s.sessionLength||10)===n?C.gold:C.dim}}>{n}</button>)}
            </div>
          </div>
        </Card>
        <Card style={{marginBottom:"1rem"}}>
          <Label>Your Teams</Label>
          {teams.length === 0 ? (
            <div style={{fontSize:12,color:C.dimmer,marginBottom:".85rem",lineHeight:1.6,fontStyle:"italic"}}>You're not on any teams yet. Ask your coach for their team join code.</div>
          ) : (
            <div style={{marginBottom:".85rem"}}>
              {teams.map(t => (
                <div key={t.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:".55rem .75rem",background:C.bgElevated,border:`1px solid ${C.border}`,borderRadius:8,marginBottom:".4rem"}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:C.white}}>{t.name}</div>
                    <div style={{fontSize:11,color:C.dimmer}}>{t.level} · {t.season}</div>
                  </div>
                  <div style={{fontSize:11,color:C.green}}>✓ Joined</div>
                </div>
              ))}
            </div>
          )}
          <div style={{display:"flex",gap:".5rem"}}>
            <input value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase().slice(0,8))} placeholder="Team join code"
              style={{flex:1,background:C.bgElevated,border:`1px solid ${C.border}`,borderRadius:8,padding:".55rem .8rem",color:C.white,fontSize:14,fontFamily:FONT.body,outline:"none",letterSpacing:".1em",fontWeight:700,textAlign:"center"}}/>
            <button onClick={joinTeam} disabled={joining||!joinCode.trim()} style={{background:C.gold,color:C.bg,border:"none",borderRadius:8,padding:".55rem 1rem",cursor:"pointer",fontSize:13,fontFamily:FONT.body,fontWeight:800}}>{joining?"…":"Join"}</button>
          </div>
          {joinMsg && <div style={{fontSize:12,color:joinMsg.includes("✓")?C.green:C.red,marginTop:".5rem"}}>{joinMsg}</div>}
          <div style={{fontSize:11,color:C.dimmer,marginTop:".6rem",lineHeight:1.6}}>Coaches on your teams can rate you and leave feedback notes in your Report.</div>
        </Card>
        <Card style={{marginBottom:"1rem",background:tier==="FREE"?C.bgElevated:`linear-gradient(135deg,${C.bgCard},${C.bgElevated})`,border:`1px solid ${tier==="FREE"?C.border:C.goldBorder}`}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:".4rem"}}>
            <Label style={{marginBottom:0}}>Your Plan</Label>
            <div style={{fontSize:10,letterSpacing:".14em",background:tier==="FREE"?C.dimmest:C.goldDim,color:tier==="FREE"?C.dimmer:C.gold,padding:"3px 8px",borderRadius:4,fontWeight:800,textTransform:"uppercase"}}>{tier || "FREE"}</div>
          </div>
          {tier === "FREE" ? (
            <>
              <div style={{fontSize:12,color:C.dim,lineHeight:1.6,marginBottom:".75rem"}}>You're on the free plan — 1 age group, multiple-choice questions, last 5 sessions of history.</div>
              <button onClick={()=>onUpgrade && onUpgrade("multipleAgeGroups","pro")} style={{width:"100%",background:C.gold,color:C.bg,border:"none",borderRadius:10,padding:".7rem",cursor:"pointer",fontWeight:800,fontSize:13,fontFamily:FONT.body}}>See Pro Plans →</button>
            </>
          ) : (
            <div style={{fontSize:12,color:C.dim,lineHeight:1.6}}>You have access to the {tier} tier features.</div>
          )}
        </Card>
        <Card style={{marginBottom:"1rem"}}>
          <Label>About</Label>
          <div style={{fontSize:12,color:C.dimmer,lineHeight:1.9}}>
            <div>IceIQ v{VERSION} · {RELEASE_DATE}</div>
            <div>Hockey Canada LTAD · USA Hockey ADM</div>
            <div>Sport for Life Canada</div>
            <div style={{color:C.gold,marginTop:".25rem"}}>bluechip-people-strategies.com</div>
          </div>
        </Card>
        {userEmail === ADMIN_EMAIL && onAdminReports && (
          <Card style={{ marginBottom: "1rem", border: `1px solid ${C.purpleBorder}` }}>
            <Label>Admin</Label>
            <button onClick={onAdminReports} style={{
              background: C.purpleDim, color: C.purple, border: `1px solid ${C.purpleBorder}`,
              borderRadius: 10, padding: ".65rem", cursor: "pointer", fontSize: 13,
              fontFamily: FONT.body, fontWeight: 700, width: "100%"
            }}>Review Question Reports</button>
          </Card>
        )}
        <button onClick={onReset} style={{background:"rgba(239,68,68,.06)",color:C.red,border:`1px solid rgba(239,68,68,.2)`,borderRadius:10,padding:".65rem",cursor:"pointer",fontSize:13,fontFamily:FONT.body,width:"100%"}}>{demoMode ? "Exit Demo" : "Sign Out"}</button>
      </div>
    </div>
  );
}

function CoachDashboard({ onBack }) {
  const [code, setCode] = useState("");
  const [season, setSeason] = useState(SEASONS[0]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [qbFlat, setQbFlat] = useState([]);
  useEffect(() => { loadQB().then(qb => setQbFlat(Object.values(qb).flat())); }, []);

  async function load() {
    if (!code.trim()) { setErr("Enter your coach code"); return; }
    setLoading(true); setErr("");
    try { const sessions = await loadTeamData(code.trim(), season); setData(sessions); }
    catch(e) { setErr("Could not load data"); }
    setLoading(false);
  }

  let agg = null;
  if (data && data.length > 0) {
    const qStats = {}, catStats = {};
    data.forEach(session => session.qs.forEach(q => {
      if (!qStats[q.id]) qStats[q.id] = {ok:0,tot:0,cat:q.cat,d:q.d};
      qStats[q.id].tot++; if(q.ok) qStats[q.id].ok++;
      if (!catStats[q.cat]) catStats[q.cat] = {ok:0,tot:0};
      catStats[q.cat].tot++; if(q.ok) catStats[q.cat].ok++;
    }));
    const avgIQ = Math.round(data.reduce((s,d)=>s+d.iq,0)/data.length);
    const sorted = Object.entries(qStats).map(([id,v])=>({id,...v,pct:Math.round((v.ok/v.tot)*100)})).sort((a,b)=>a.pct-b.pct);
    agg = { sessions:data.length, avgIQ, qStats:sorted, catStats };
  }

  return (
    <Screen>
      <BackBtn onClick={onBack}/>
      <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"2rem",marginBottom:"1.5rem"}}>Coach Dashboard</div>
      <Card style={{marginBottom:"1rem"}}>
        <Label>Season</Label>
        <div style={{display:"flex",gap:".5rem",marginBottom:"1rem",flexWrap:"wrap"}}>
          {SEASONS.map(ss=><button key={ss} onClick={()=>{setSeason(ss);setData(null);}} style={{background:season===ss?C.goldDim:C.bgElevated,border:`1px solid ${season===ss?C.gold:C.border}`,borderRadius:8,padding:".4rem .8rem",cursor:"pointer",fontSize:12,fontFamily:FONT.body,fontWeight:season===ss?700:400,color:season===ss?C.gold:C.dim}}>{ss}</button>)}
        </div>
        <div style={{display:"flex",gap:".75rem"}}>
          <input value={code} onChange={e=>{setCode(e.target.value.toUpperCase());setData(null);setErr("");}} placeholder="Coach code" maxLength={8}
            style={{background:C.bgElevated,border:`1px solid ${err?C.red:code?C.gold:C.border}`,borderRadius:8,padding:".65rem .9rem",color:C.white,fontSize:15,fontFamily:FONT.body,flex:1,outline:"none",letterSpacing:".1em",fontWeight:700}}/>
          <button onClick={load} disabled={loading} style={{background:C.gold,color:C.bg,border:"none",borderRadius:8,padding:".65rem 1.25rem",cursor:"pointer",fontWeight:800,fontSize:14,fontFamily:FONT.body,whiteSpace:"nowrap"}}>{loading?"…":"Load"}</button>
        </div>
        {err && <div style={{fontSize:12,color:C.red,marginTop:".5rem"}}>{err}</div>}
        <div style={{fontSize:11,color:C.dimmer,marginTop:".65rem",lineHeight:1.6}}>Anonymous patterns only — no individual data ever stored.</div>
      </Card>
      {data && data.length === 0 && <Card><div style={{color:C.dimmer,textAlign:"center",padding:"1rem 0"}}>No sessions for this code in {season} yet.</div></Card>}
      {agg && (<>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".75rem",marginBottom:"1rem"}}>
          <Card style={{textAlign:"center"}}><Label>Sessions</Label><div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"2.8rem",color:C.gold}}>{agg.sessions}</div></Card>
          <Card style={{textAlign:"center"}}><Label>Team Avg IQ</Label><div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"2.8rem",color:agg.avgIQ>=80?C.green:agg.avgIQ>=60?C.yellow:C.red}}>{agg.avgIQ}%</div></Card>
        </div>
        <Card style={{marginBottom:"1rem"}}>
          <Label>By Category — Worst First</Label>
          {Object.entries(agg.catStats).sort((a,b)=>(a[1].ok/a[1].tot)-(b[1].ok/b[1].tot)).map(([cat,v])=>{
            const pct=Math.round((v.ok/v.tot)*100);
            return(<div key={cat} style={{marginBottom:".85rem"}}><div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:5}}><span style={{color:C.dim}}>{cat}</span><span style={{fontWeight:700,color:pct>=80?C.green:pct>=60?C.yellow:C.red}}>{pct}%</span></div><ProgressBar value={pct} max={100} color={pct>=80?C.green:pct>=60?C.yellow:C.red}/></div>);
          })}
        </Card>
        <Card>
          <Label>Hardest Questions</Label>
          {agg.qStats.slice(0,5).map(q=>{
            const qData = qbFlat.find(x=>x.id===q.id);
            return(<div key={q.id} style={{padding:".7rem 0",borderBottom:`1px solid ${C.border}`}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:".3rem"}}><Pill color={q.pct<40?C.red:C.yellow} bg={q.pct<40?"rgba(239,68,68,.12)":"rgba(234,179,8,.12)"}>{q.pct}%</Pill><span style={{fontSize:11,color:C.dimmer}}>{q.ok}/{q.tot} correct</span></div><div style={{fontSize:12,color:C.dim,lineHeight:1.5}}>{qData?.sit?.slice(0,90)}{qData?.sit?.length>90?"…":""}</div></div>);
          })}
        </Card>
      </>)}
    </Screen>
  );
}


// ─────────────────────────────────────────────────────────

function StudyScreen({ player, onBack, onNav }) {
  const [studyContent, setStudyContent] = useState(null);
  useEffect(() => {
    import("./data/studyContent.js").then(m => setStudyContent(m.STUDY_CONTENT));
  }, []);
  if (!studyContent) {
    return (
      <div style={{minHeight:"100vh",background:C.bg,color:C.dim,fontFamily:FONT.body,display:"flex",alignItems:"center",justifyContent:"center"}}>
        Loading…
      </div>
    );
  }
  const content = studyContent[player.level] || studyContent["U11 / Atom"];
  // Identify weakest skill areas from self ratings
  const cats = SKILLS[player.level] || [];
  const selfScale = getSelfScale(player.level);
  const weakSkills = [];
  cats.forEach(cat => {
    cat.skills.forEach(skill => {
      const rating = player.selfRatings?.[skill.id];
      if (!rating) return;
      const norm = normalizeRating(selfScale, rating);
      if (norm !== null && norm <= 0.33) weakSkills.push({ ...skill, cat: cat.cat, icon: cat.icon });
    });
  });
  weakSkills.splice(5);

  // Pull lowest quiz categories
  const latest = player.quizHistory[player.quizHistory.length-1];
  const weakCats = [];
  if (latest) {
    const tally = {};
    latest.results.forEach(r => {
      if (!tally[r.cat]) tally[r.cat] = {ok:0,total:0};
      tally[r.cat].total++;
      if (r.ok) tally[r.cat].ok++;
    });
    Object.entries(tally)
      .map(([cat, v]) => ({cat, pct: v.ok/v.total}))
      .filter(x => x.pct < 0.6)
      .sort((a,b) => a.pct - b.pct)
      .slice(0,3)
      .forEach(x => weakCats.push(x));
  }

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.white,fontFamily:FONT.body,paddingBottom:80}}>
      <div style={{position:"relative",height:100,overflow:"hidden"}}>
        <img src={imgTactics} alt="" style={{width:"100%",height:"100%",objectFit:"cover",opacity:0.15}}/>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(8,14,26,1) 0%,transparent 100%)"}}/>
      </div>
      <StickyHeader>
        <div style={{maxWidth:560,margin:"0 auto",display:"flex",alignItems:"center",gap:"1rem"}}>
          <BackBtn onClick={onBack}/>
          <div style={{flex:1}}>
            <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.1rem"}}>Study</div>
            <div style={{fontSize:11,color:C.dimmer}}>Your personal development plan</div>
          </div>
        </div>
      </StickyHeader>
      <div style={{padding:"1.25rem",maxWidth:560,margin:"0 auto"}}>
        <Card style={{marginBottom:"1rem",background:`linear-gradient(135deg,${C.bgCard},${C.bgElevated})`,border:`1px solid ${C.purpleBorder}`}}>
          <Label>Your Focus</Label>
          <div style={{fontSize:13,color:C.dim,lineHeight:1.6}}>{player.level} · {player.position}</div>
          <div style={{fontSize:12,color:C.dimmer,marginTop:".5rem",lineHeight:1.6}}>Based on your quiz results and self-ratings, here's what to watch and work on.</div>
        </Card>

        {weakCats.length > 0 && (
          <Card style={{marginBottom:"1rem",borderLeft:`3px solid ${C.gold}`}}>
            <Label>🎯 Your Weakest Quiz Categories</Label>
            {weakCats.map(({cat, pct}) => (
              <div key={cat} style={{marginBottom:".65rem",padding:".65rem .8rem",background:C.bgElevated,borderRadius:8,border:`1px solid ${C.border}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:13,fontWeight:600,color:C.white}}>{cat}</span>
                  <span style={{fontSize:12,fontWeight:700,color:pct<0.4?C.red:C.yellow}}>{Math.round(pct*100)}%</span>
                </div>
                <div style={{fontSize:11,color:C.dimmer,marginTop:3,lineHeight:1.5}}>Take more quizzes focused on this area — or ask your coach to build practice drills around it.</div>
              </div>
            ))}
          </Card>
        )}

        {weakSkills.length > 0 && (
          <Card style={{marginBottom:"1rem",borderLeft:`3px solid ${C.purple}`}}>
            <Label>📊 Skills You Want to Grow</Label>
            <div style={{fontSize:11,color:C.dimmer,marginBottom:".65rem",lineHeight:1.5}}>From your self-assessment — the areas you rated lowest. Tap a skill to make it a goal.</div>
            {weakSkills.map(skill => (
              <button key={skill.id} onClick={() => onNav("goals")} style={{width:"100%",background:C.bgElevated,border:`1px solid ${C.border}`,borderRadius:8,padding:".65rem .8rem",marginBottom:".4rem",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",color:C.white,fontFamily:FONT.body,textAlign:"left"}}>
                <div>
                  <div style={{fontSize:13,fontWeight:600}}>{skill.icon} {skill.name}</div>
                  <div style={{fontSize:11,color:C.dimmer,marginTop:2}}>{skill.cat}</div>
                </div>
                <span style={{color:C.gold,fontSize:12,fontWeight:700}}>Goal →</span>
              </button>
            ))}
          </Card>
        )}

        {content.games && content.games.length > 0 && (
          <Card style={{marginBottom:"1rem"}}>
            <Label>📺 Games & Clips to Watch</Label>
            <div style={{fontSize:11,color:C.dimmer,marginBottom:".65rem",lineHeight:1.5}}>Pick one this week. Watch with purpose — look for the specific things listed.</div>
            {content.games.map((g, i) => (
              <div key={i} style={{padding:".6rem .8rem",background:C.bgElevated,borderRadius:8,border:`1px solid ${C.border}`,marginBottom:".4rem",fontSize:13,color:C.dim,lineHeight:1.5}}>
                {g}
              </div>
            ))}
          </Card>
        )}

        <Card style={{marginBottom:"1rem"}}>
          <Label>👀 How to Watch Hockey Like a Player</Label>
          {content.watchTips.map((t, i) => (
            <div key={i} style={{display:"flex",gap:".65rem",padding:".55rem 0",borderBottom:i<content.watchTips.length-1?`1px solid ${C.border}`:"none"}}>
              <div style={{color:C.gold,fontWeight:700,fontSize:13,flexShrink:0}}>{i+1}.</div>
              <div style={{fontSize:13,color:C.dim,lineHeight:1.55}}>{t}</div>
            </div>
          ))}
        </Card>

        <Card style={{marginBottom:"1rem"}}>
          <Label>🏒 Focus Drills</Label>
          <div style={{fontSize:11,color:C.dimmer,marginBottom:".65rem",lineHeight:1.5}}>Ask your coach to build these into practice, or work on them in your own ice time.</div>
          {content.focusAreas.map((f, i) => (
            <div key={i} style={{padding:".7rem .85rem",background:C.bgElevated,borderRadius:8,border:`1px solid ${C.border}`,marginBottom:".45rem"}}>
              <div style={{fontSize:13,fontWeight:700,color:C.white,marginBottom:3}}>{f.skill}</div>
              <div style={{fontSize:12,color:C.dim,lineHeight:1.5}}>{f.drill}</div>
            </div>
          ))}
        </Card>

        <div style={{margin:"-1rem -1.25rem 1rem"}}>
          <HockeyInsightWidget />
        </div>

        <Card style={{background:C.purpleDim,border:`1px solid ${C.purpleBorder}`}}>
          <div style={{fontSize:13,color:C.purple,fontWeight:700,marginBottom:".4rem"}}>💡 Study Tip</div>
          <div style={{fontSize:12,color:C.dim,lineHeight:1.6}}>The best players watch hockey differently than fans. They watch the player <strong style={{color:C.white}}>without</strong> the puck — because that's where the game really happens. Try it this week.</div>
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// PRO HOCKEY INTEL WIDGET — small, unobtrusive, rotating stat card
// Appears on Home, Study, Results, Report. Dismissible per session.
// ─────────────────────────────────────────────────────────
function HockeyInsightWidget() {
  const [insights, setInsights] = useState(null);
  const [idx, setIdx] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    import("./data/hockeyInsights.js").then(m => {
      setInsights(m.HOCKEY_INSIGHTS);
      setIdx(Math.floor(Math.random() * m.HOCKEY_INSIGHTS.length));
    });
  }, []);
  if (dismissed || !insights) return null;
  const insight = insights[idx];
  function next() { setIdx((idx + 1) % insights.length); setExpanded(false); }
  return (
    <div style={{
      maxWidth:560, margin:"0 auto 1rem", padding:"0 1.25rem",
    }}>
      <div style={{
        background:`linear-gradient(135deg, rgba(201,168,76,.06), rgba(124,111,205,.06))`,
        border:`1px solid ${C.border}`,
        borderLeft:`3px solid ${C.gold}`,
        borderRadius:10, padding:".65rem .85rem",
        fontFamily:FONT.body, color:C.white,
      }}>
        <div style={{display:"flex",alignItems:"center",gap:".55rem"}}>
          <span style={{fontSize:15,flexShrink:0,opacity:.85}}>{insight.icon}</span>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:9,letterSpacing:".1em",textTransform:"uppercase",color:C.gold,fontWeight:700,opacity:.85}}>Pro Hockey Intel · {insight.category}</div>
            <div style={{fontSize:12,fontWeight:600,color:C.dim,lineHeight:1.35,marginTop:1}}>{insight.stat}</div>
          </div>
          <button onClick={()=>setExpanded(!expanded)} style={{background:"none",border:"none",color:C.dimmer,fontSize:11,cursor:"pointer",padding:"2px 4px"}} aria-label="Expand">
            {expanded ? "▲" : "▼"}
          </button>
          <button onClick={next} title="Next insight" style={{background:"none",border:"none",color:C.dimmer,fontSize:11,cursor:"pointer",padding:"2px 4px"}} aria-label="Next">↻</button>
          <button onClick={()=>setDismissed(true)} title="Dismiss" style={{background:"none",border:"none",color:C.dimmer,fontSize:12,cursor:"pointer",padding:"2px 4px",lineHeight:1}} aria-label="Dismiss">×</button>
        </div>
        {expanded && (
          <div style={{marginTop:".55rem",paddingTop:".55rem",borderTop:`1px solid ${C.border}`}}>
            <div style={{fontSize:11,color:C.dim,lineHeight:1.6,marginBottom:".45rem"}}>{insight.context}</div>
            <div style={{fontSize:11,color:C.purple,fontStyle:"italic",lineHeight:1.55}}>💡 {insight.lesson}</div>
            <div style={{fontSize:9,color:C.dimmer,fontStyle:"italic",marginTop:".4rem"}}>Source: {insight.source}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function BottomNav({ active, onNav }) {
  const tabs = [
    {id:"home",   icon:"🏠", label:"Home"},
    {id:"quiz",   icon:"🧠", label:"Quiz"},
    {id:"skills", icon:"📊", label:"Skills"},
    {id:"goals",  icon:"🎯", label:"Goals"},
    {id:"report", icon:"📋", label:"Report"},
  ];
  return (
    <div style={{position:"fixed",bottom:0,left:0,right:0,background:`${C.bgCard}f8`,backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",borderTop:`1px solid ${C.border}`,display:"flex",zIndex:100}}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onNav(t.id)} style={{flex:1,background:"none",border:"none",padding:".65rem .25rem",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:".2rem"}}>
          <span style={{fontSize:18}}>{t.icon}</span>
          <span style={{fontSize:10,color:active===t.id?C.gold:C.dimmer,fontFamily:FONT.body,fontWeight:active===t.id?700:400,transition:"color .15s"}}>{t.label}</span>
          {active===t.id && <div style={{width:4,height:4,borderRadius:"50%",background:C.gold}}/>}
        </button>
      ))}
    </div>
  );
}


// ─────────────────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────
// AUTH SCREEN — login / signup
// ─────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────
// DEMO MODE — pre-populated sample player, no signup required
// ─────────────────────────────────────────────────────────
const DEMO_PROFILES = {
  "U7 / Initiation":{
    name:"Nora Orr",position:"Not Sure",team:"U7 IP Calgary Flames",
    sessions:(mk)=>[mk(true,false,false,10,52),mk(true,true,false,5,65),mk(true,true,false,1,70)],
    results:(ok1,ok2,ok3)=>[
      {id:"u7q1",cat:"Skating",ok:ok1,d:1,type:"mc"},{id:"u7q3",cat:"Puck Control",ok:ok1,d:1,type:"mc"},
      {id:"u7q5",cat:"Game Awareness",ok:ok1,d:1,type:"mc"},{id:"u7q10",cat:"Compete",ok:ok1,d:1,type:"mc"},
      {id:"u7q20",cat:"Skating",ok:ok2,d:2,type:"mc"},{id:"u7q25",cat:"Compete",ok:ok2,d:1,type:"mc"},
      {id:"u7q30",cat:"Game Awareness",ok:ok2,d:2,type:"mc"},{id:"u7tf1",cat:"Game Awareness",ok:ok2,d:1,type:"tf"},
      {id:"u7q40",cat:"Compete",ok:ok3,d:3,type:"mc"},{id:"u7q50",cat:"Puck Control",ok:ok3,d:2,type:"mc"},
    ],
    selfRatings:{u7s1:"developing",u7s2:"introduced",u7s3:"introduced",u7s4:"developing",u7p1:"introduced",u7p2:"introduced",u7c1:"developing",u7c2:"developing",u7c3:"consistent",u7c4:"developing"},
    coachRatings:{u7s1:"introduced",u7s2:"introduced",u7s3:"introduced",u7s4:"developing",u7p1:"introduced",u7p2:"introduced",u7c1:"consistent",u7c2:"developing",u7c3:"consistent",u7c4:"developing"},
    coachNotes:{u7c1:"Great hustle — always gives full effort.",u7s2:"Still learning the snowplow stop. Keep practising at home."},
    goals:{"Skating":{goal:"Learn to stop on both sides",S:"Do 10 snowplow stops each practice",M:"Coach checks off each practice",A:"Yes — we practice stops every session",R:"I fall when I try to stop on my left side",T:"By end of December 2026"}},
  },
  "U9 / Novice":{
    name:"Luca Lidstrom",position:"Defense",team:"U9 A Saskatoon Blazers",
    sessions:(mk)=>[mk(true,false,false,12,55),mk(true,true,false,6,68),mk(true,true,true,2,78)],
    results:(ok1,ok2,ok3)=>[
      {id:"u9q1",cat:"Decision Making",ok:ok1,d:1,type:"mc"},{id:"u9q3",cat:"Positioning",ok:ok1,d:1,type:"mc"},
      {id:"u9q7",cat:"Exiting the Zone",ok:ok1,d:1,type:"mc"},{id:"u9q10",cat:"Defense",ok:ok1,d:1,type:"mc"},
      {id:"u9q16",cat:"Decision Making",ok:ok2,d:2,type:"mc"},{id:"u9q21",cat:"Defense",ok:ok2,d:2,type:"mc"},
      {id:"u9q27",cat:"Defense",ok:ok2,d:2,type:"mc"},{id:"u9q30",cat:"Decision Making",ok:ok2,d:2,type:"mc"},
      {id:"u9q41",cat:"Decision Making",ok:ok3,d:3,type:"mc"},{id:"u9q42",cat:"Defense",ok:ok3,d:3,type:"mc"},
    ],
    selfRatings:{u9s1:"developing",u9s2:"consistent",u9s3:"developing",u9s4:"introduced",u9p1:"developing",u9p2:"developing",u9p3:"introduced",u9p4:"introduced",u9h1:"developing",u9h2:"introduced",u9d1:"developing",u9d2:"introduced",u9c1:"consistent",u9c2:"developing",u9c3:"developing"},
    coachRatings:{u9s1:"developing",u9s2:"developing",u9s3:"introduced",u9s4:"introduced",u9p1:"developing",u9p2:"developing",u9p3:"developing",u9p4:"introduced",u9h1:"developing",u9h2:"introduced",u9d1:"introduced",u9d2:"introduced",u9c1:"consistent",u9c2:"consistent",u9c3:"developing"},
    coachNotes:{u9d1:"Good positioning but needs to close gap faster on rushes.",u9c1:"Competes hard every shift — great example for the team."},
    goals:{"Defense":{goal:"Improve gap control on the rush",S:"Hold the blue line and close gap by top of circles",M:"Coach tracks clean gap closes per game",A:"Yes — 1-on-1 rush drills in practice",R:"I back up too much and give attackers time",T:"By end of October 2026"}},
  },
  "U13 / Peewee":{
    name:"Maya Roy",position:"Goalie",team:"U13 AAA Vancouver Hawks",
    sessions:(mk)=>[mk(true,false,false,10,62),mk(true,true,false,4,75),mk(true,true,true,1,86)],
    results:(ok1,ok2,ok3)=>[
      {id:"u13q1",cat:"Rush Reads",ok:ok1,d:1,type:"mc"},{id:"u13q5",cat:"Defensive Zone",ok:ok1,d:1,type:"mc"},
      {id:"u13q10",cat:"Zone Entry",ok:ok1,d:1,type:"mc"},{id:"u13q15",cat:"Special Teams",ok:ok1,d:1,type:"mc"},
      {id:"u13q25",cat:"Shot Selection",ok:ok2,d:2,type:"mc"},{id:"u13q35",cat:"Defensive Zone",ok:ok2,d:2,type:"mc"},
      {id:"u13q45",cat:"Special Teams",ok:ok2,d:2,type:"mc"},{id:"u13g1",cat:"Goalie",ok:ok2,d:1,type:"mc"},
      {id:"u13g5",cat:"Goalie",ok:ok3,d:2,type:"mc"},{id:"u13g10",cat:"Goalie",ok:ok3,d:3,type:"mc"},
    ],
    selfRatings:{u13s1:"consistent",u13s2:"developing",u13s3:"developing",u13p1:"developing",u13p2:"introduced",u13p3:"consistent",u13p4:"developing",u13h1:"consistent",u13h2:"developing",u13h3:"consistent",u13h4:"developing",u13d1:"developing",u13d2:"consistent",u13c1:"proficient",u13c2:"consistent",u13c3:"developing",u13c4:"consistent"},
    coachRatings:{u13s1:"consistent",u13s2:"developing",u13s3:"introduced",u13p1:"developing",u13p2:"introduced",u13p3:"developing",u13p4:"developing",u13h1:"developing",u13h2:"developing",u13h3:"consistent",u13h4:"developing",u13d1:"developing",u13d2:"consistent",u13c1:"proficient",u13c2:"consistent",u13c3:"consistent",u13c4:"consistent"},
    coachNotes:{u13h3:"Strong defensive zone awareness for a goalie — reads plays well.",u13c1:"Natural leader. Keeps the team calm under pressure."},
    goals:{"Leadership":{goal:"Be more vocal in the room and on the ice during games",S:"Call out plays and communicate with D on every shift",M:"Coach gives feedback after each game on communication",A:"Yes — I already talk to my D but need to be louder",R:"Coach says I read the game well but teammates don't hear me",T:"By January 2027"}},
  },
  "U11 / Atom":{
    name:"Cole Gretzky",position:"Forward",team:"U11 AA Edmonton Selects",
    sessions:(mk)=>[mk(true,false,false,14,58),mk(true,true,false,7,71),mk(true,true,true,1,83)],
    results:(ok1,ok2,ok3)=>[
      {id:"u11q1",cat:"Rush Reads",ok:ok1,d:1,type:"mc"},{id:"u11q2",cat:"Coverage",ok:ok1,d:1,type:"mc"},
      {id:"u11q6",cat:"Puck Protection",ok:ok1,d:1,type:"mc"},{id:"u11q11",cat:"Exiting the Zone",ok:ok1,d:1,type:"mc"},
      {id:"u11q20",cat:"Coverage",ok:ok2,d:2,type:"mc"},{id:"u11q30",cat:"Special Teams",ok:ok2,d:2,type:"mc"},
      {id:"u11q40",cat:"Puck Protection",ok:ok2,d:2,type:"mc"},{id:"u11q50",cat:"Coverage",ok:ok2,d:2,type:"mc"},
      {id:"u11q92",cat:"Blue Line Decisions",ok:ok3,d:3,type:"mc"},{id:"u11q100",cat:"Decision Timing",ok:ok3,d:3,type:"mc"},
    ],
    selfRatings:{u11s1:"developing",u11s2:"consistent",u11s3:"developing",u11s4:"introduced",u11p1:"consistent",u11p2:"developing",u11p3:"developing",u11p4:"consistent",u11h1:"consistent",u11h2:"developing",u11h3:"developing",u11d1:"developing",u11d2:"introduced",u11c1:"advanced",u11c2:"proficient",u11c3:"consistent",u11dm1:"developing",u11dm2:"developing",u11dm3:"introduced",u11dm4:"consistent",u11dm5:"developing"},
    coachRatings:{u11s1:"developing",u11s2:"consistent",u11s3:"developing",u11s4:"developing",u11p1:"consistent",u11p2:"developing",u11p3:"consistent",u11p4:"proficient",u11h1:"consistent",u11h2:"developing",u11h3:"developing",u11d1:"introduced",u11d2:"introduced",u11c1:"advanced",u11c2:"proficient",u11c3:"proficient",u11dm1:"developing",u11dm2:"developing",u11dm3:"developing",u11dm4:"consistent",u11dm5:"developing"},
    coachNotes:{u11d1:"Work on matching attacker speed and closing the gap.",u11c1:"Elite compete level — sets the tone every shift."},
    goals:{"Gap Control":{goal:"Close the gap at the blue line instead of backing up",S:"Close gap by top of circles on every rush",M:"Track clean gap closes per game",A:"Yes — drill with D-partner in warmups",R:"Biggest weakness — I give up the blue line",T:"By end of November 2026"}},
  },
  "U15 / Bantam":{
    name:"Jack Bourque",position:"Defense",team:"U15 AAA Winnipeg Warriors",
    sessions:(mk)=>[mk(true,false,false,8,60),mk(true,true,false,3,74),mk(true,true,true,1,85)],
    results:(ok1,ok2,ok3)=>[
      {id:"u15q1",cat:"Systems Play",ok:ok1,d:1,type:"mc"},{id:"u15q5",cat:"Transition Game",ok:ok1,d:1,type:"mc"},
      {id:"u15q10",cat:"Special Teams",ok:ok1,d:1,type:"mc"},{id:"u15q15",cat:"Gap Control",ok:ok1,d:1,type:"mc"},
      {id:"u15q25",cat:"Physical Play",ok:ok2,d:2,type:"mc"},{id:"u15q35",cat:"Leadership",ok:ok2,d:2,type:"mc"},
      {id:"u15q45",cat:"Systems Play",ok:ok2,d:2,type:"mc"},{id:"u15q55",cat:"Transition Game",ok:ok2,d:2,type:"mc"},
      {id:"u15q75",cat:"Gap Control",ok:ok3,d:3,type:"mc"},{id:"u15q90",cat:"Special Teams",ok:ok3,d:3,type:"mc"},
    ],
    selfRatings:{},coachRatings:{},coachNotes:{},
    goals:{"Systems Play":{goal:"Master the 1-2-2 forecheck",S:"Execute my role in the 1-2-2 every shift",M:"Coach reviews video after each game",A:"Yes — we run this system every practice",R:"I freelance too much and break structure",T:"By end of January 2027"}},
  },
  "U18 / Midget":{
    name:"Eli Lemieux",position:"Forward",team:"U18 Prep Toronto Jr. Canadiens",
    sessions:(mk)=>[mk(true,true,false,6,72),mk(true,true,true,3,81),mk(true,true,true,1,89)],
    results:(ok1,ok2,ok3)=>[
      {id:"u18q1",cat:"Game Management",ok:ok1,d:1,type:"mc"},{id:"u18q5",cat:"Advanced Tactics",ok:ok1,d:1,type:"mc"},
      {id:"u18q10",cat:"Special Teams",ok:ok1,d:1,type:"mc"},{id:"u18q15",cat:"Breakout Execution",ok:ok1,d:1,type:"mc"},
      {id:"u18q25",cat:"Neutral Zone Play",ok:ok2,d:2,type:"mc"},{id:"u18q35",cat:"Leadership",ok:ok2,d:2,type:"mc"},
      {id:"u18q48",cat:"Advanced Tactics",ok:ok2,d:2,type:"mc"},{id:"u18q55",cat:"Breakout Execution",ok:ok2,d:2,type:"mc"},
      {id:"u18q81",cat:"Breakout Execution",ok:ok3,d:3,type:"mc"},{id:"u18q99",cat:"Breakout Execution",ok:ok3,d:3,type:"mc"},
    ],
    selfRatings:{},coachRatings:{},coachNotes:{},
    goals:{"Leadership":{goal:"Lead the room as an alternate captain",S:"Speak up in team meetings and set the tone pre-game",M:"Coaches track leadership moments weekly",A:"Yes — coaches gave me the A",R:"I lead by example but need to be more vocal",T:"By March 2027"}},
  },
};

function buildDemoPlayer(level) {
  const cfg = DEMO_PROFILES[level];
  if (!cfg) return null;
  const now = Date.now();
  const day = 86400000;
  const mkSession = (ok1, ok2, ok3, daysAgo, score) => ({
    results: cfg.results(ok1, ok2, ok3), score,
    date: new Date(now - daysAgo*day).toISOString(),
  });
  return {
    id: "__demo__", name: cfg.name, level, position: cfg.position,
    season: SEASONS[0], sessionLength: 10, colorblind: false, coachCode: "",
    quizHistory: cfg.sessions(mkSession),
    selfRatings: {...cfg.selfRatings}, goals: {...cfg.goals}, __demo: true,
  };
}
function buildDemoCoachRatings(level) {
  const cfg = DEMO_PROFILES[level];
  if (!cfg) return { ratings: {}, notes: {} };
  return { ratings: {...cfg.coachRatings}, notes: {...cfg.coachNotes} };
}

// ─────────────────────────────────────────────────────────
// RINK BACKGROUND — standard NHL rink geometry for the splash page
// Dimensions follow regulation proportions (200 ft × 85 ft) in SVG units.
// preserveAspectRatio="xMidYMid slice" fills the viewport on any aspect ratio.
// ─────────────────────────────────────────────────────────
function RinkBackground() {
  const ICE    = "#d7e8f5";     // pale blue ice
  const LINE_R = "#b8232e";     // red lines
  const LINE_B = "#0c5ab5";     // blue lines
  const OUTLINE= "#1c1c1c";
  const CREASE = "#5aa8e6";     // pale blue crease fill
  return (
    <svg
      viewBox="0 0 200 85"
      preserveAspectRatio="xMidYMid slice"
      style={{position:"absolute",inset:0,width:"100%",height:"100%",opacity:1}}
      aria-hidden="true"
    >
      {/* Ice surface */}
      <rect x="0.5" y="0.5" width="199" height="84" rx="28" ry="28" fill={ICE} />
      {/* Rink outline */}
      <rect x="0.5" y="0.5" width="199" height="84" rx="28" ry="28" fill="none" stroke={OUTLINE} strokeWidth="0.6" />

      {/* Goal lines */}
      <line x1="11" y1="5" x2="11" y2="80" stroke={LINE_R} strokeWidth="0.35" />
      <line x1="189" y1="5" x2="189" y2="80" stroke={LINE_R} strokeWidth="0.35" />

      {/* Blue lines */}
      <line x1="75" y1="0.5" x2="75" y2="84.5" stroke={LINE_B} strokeWidth="1.3" />
      <line x1="125" y1="0.5" x2="125" y2="84.5" stroke={LINE_B} strokeWidth="1.3" />

      {/* Center red line */}
      <line x1="100" y1="0.5" x2="100" y2="84.5" stroke={LINE_R} strokeWidth="1.3" />

      {/* Center faceoff circle + dot */}
      <circle cx="100" cy="42.5" r="15" fill="none" stroke={LINE_B} strokeWidth="0.4" />
      <circle cx="100" cy="42.5" r="0.8" fill={LINE_B} />

      {/* Referee crease (semicircle at center) */}
      <path d="M 90 85 A 10 10 0 0 1 110 85" fill="none" stroke={LINE_R} strokeWidth="0.3" />

      {/* Neutral zone faceoff dots (red) */}
      <circle cx="80" cy="20.5" r="0.9" fill={LINE_R} />
      <circle cx="80" cy="64.5" r="0.9" fill={LINE_R} />
      <circle cx="120" cy="20.5" r="0.9" fill={LINE_R} />
      <circle cx="120" cy="64.5" r="0.9" fill={LINE_R} />

      {/* End-zone faceoff circles (4 total) with hash marks + dots */}
      {[
        {cx:31,  cy:20.5},
        {cx:31,  cy:64.5},
        {cx:169, cy:20.5},
        {cx:169, cy:64.5},
      ].map((c, i) => (
        <g key={i}>
          <circle cx={c.cx} cy={c.cy} r="15" fill="none" stroke={LINE_R} strokeWidth="0.4" />
          <circle cx={c.cx} cy={c.cy} r="0.9" fill={LINE_R} />
          {/* L-hash guides inside the circle */}
          <path d={`M ${c.cx-2} ${c.cy-3.8} L ${c.cx-2} ${c.cy-5.8} L ${c.cx-0.3} ${c.cy-5.8}`} fill="none" stroke={LINE_R} strokeWidth="0.3" />
          <path d={`M ${c.cx+2} ${c.cy-3.8} L ${c.cx+2} ${c.cy-5.8} L ${c.cx+0.3} ${c.cy-5.8}`} fill="none" stroke={LINE_R} strokeWidth="0.3" />
          <path d={`M ${c.cx-2} ${c.cy+3.8} L ${c.cx-2} ${c.cy+5.8} L ${c.cx-0.3} ${c.cy+5.8}`} fill="none" stroke={LINE_R} strokeWidth="0.3" />
          <path d={`M ${c.cx+2} ${c.cy+3.8} L ${c.cx+2} ${c.cy+5.8} L ${c.cx+0.3} ${c.cy+5.8}`} fill="none" stroke={LINE_R} strokeWidth="0.3" />
        </g>
      ))}

      {/* Goal creases (semicircles facing center) */}
      <path d="M 11 37.5 A 6 6 0 0 1 11 47.5 Z" fill={CREASE} fillOpacity="0.35" stroke={LINE_R} strokeWidth="0.3" />
      <path d="M 189 37.5 A 6 6 0 0 0 189 47.5 Z" fill={CREASE} fillOpacity="0.35" stroke={LINE_R} strokeWidth="0.3" />

      {/* Goal nets (small rectangles behind goal lines) */}
      <rect x="9" y="40" width="2" height="5" fill="none" stroke={LINE_R} strokeWidth="0.25" />
      <rect x="189" y="40" width="2" height="5" fill="none" stroke={LINE_R} strokeWidth="0.25" />

      {/* Goalie trapezoid behind each net */}
      <path d="M 11 34 L 0.5 28 M 11 51 L 0.5 57" stroke={LINE_R} strokeWidth="0.25" fill="none" />
      <path d="M 189 34 L 199.5 28 M 189 51 L 199.5 57" stroke={LINE_R} strokeWidth="0.25" fill="none" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────
// AUTH SCREEN — login / signup
// ─────────────────────────────────────────────────────────
function AuthScreen({ onAuthenticated, onDemo }) {
  const [mode, setMode] = useState("login"); // login | signup | forgot
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("player");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [resetSent, setResetSent] = useState(false);

  // Returning user detection: any prior sign-in or signup stamps this flag
  const hasSignedInBefore = (() => {
    try { return typeof window !== "undefined" && !!window.localStorage.getItem("iceiq_has_signed_in_before"); }
    catch { return false; }
  })();

  async function submit() {
    setErr("");
    setLoading(true);
    try {
      if (mode === "signup") {
        if (!email.trim() || !password || !name.trim()) throw new Error("All fields required");
        if (password.length < 6) throw new Error("Password must be at least 6 characters");
        await SB.signUp({ email: email.trim(), password, role, name: name.trim() });
        try { window.localStorage.setItem("iceiq_has_signed_in_before", "1"); } catch {}
      } else if (mode === "forgot") {
        if (!email.trim()) throw new Error("Enter your email to reset your password");
        if (!supabase) throw new Error("Password reset unavailable — Supabase not configured");
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
        });
        if (error) throw error;
        setResetSent(true);
        setLoading(false);
        return;
      } else {
        if (!email.trim() || !password) throw new Error("Email and password required");
        await SB.signIn({ email: email.trim(), password });
        try { window.localStorage.setItem("iceiq_has_signed_in_before", "1"); } catch {}
      }
      onAuthenticated();
    } catch (e) {
      setErr(e.message || "Something went wrong");
    }
    setLoading(false);
  }

  const headline = mode === "signup" ? "Get started."
    : mode === "forgot" ? "Reset password"
    : (hasSignedInBefore ? "Welcome back." : "Welcome.");
  const subhead = mode === "signup" ? "Create an account to start tracking hockey IQ."
    : mode === "forgot" ? "Enter your email — we'll send you a reset link."
    : (hasSignedInBefore ? "Sign in to see your development report." : "Sign in or create a free account to get started.");

  return (
    <div style={{minHeight:"100vh",position:"relative",background:"#0d1e3a",display:"flex",flexDirection:"column",justifyContent:"center",padding:"2rem 1.5rem",fontFamily:FONT.body,color:C.white,overflow:"hidden"}}>
      <img src={imgSplash} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:0.45,pointerEvents:"none"}}/>
      <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at center, rgba(8,14,26,0) 30%, rgba(8,14,26,0.7) 100%)",pointerEvents:"none"}}/>

      <div style={{position:"relative",maxWidth:440,margin:"0 auto",width:"100%"}}>
        {/* What is IceIQ */}
        <div style={{textAlign:"center",marginBottom:"1.5rem"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:".6rem",marginBottom:".75rem"}}>
            <IceIQLogo size={38}/>
            <span style={{fontFamily:FONT.display,fontWeight:800,fontSize:"2.5rem",color:C.gold,letterSpacing:".08em"}}>IceIQ</span>
          </div>
          <p style={{fontSize:15,color:"rgba(248,250,252,.85)",lineHeight:1.6,margin:"0 0 1rem",maxWidth:380,marginLeft:"auto",marginRight:"auto"}}>
            The hockey development app that measures what matters — game sense, decision-making, and tactical IQ.
          </p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:".5rem",marginBottom:".25rem"}}>
            {[
              {icon:"🧠",label:"Adaptive quizzes",sub:"700+ questions across 6 age groups"},
              {icon:"📊",label:"Track your IQ",sub:"See your score improve over time"},
              {icon:"🏒",label:"Pro insights",sub:"Learn from NHL, SHL, KHL & more"},
            ].map((f,i) => (
              <div key={i} style={{background:"rgba(8,14,26,0.5)",border:`1px solid ${C.border}`,borderRadius:12,padding:".65rem .5rem",textAlign:"center"}}>
                <div style={{fontSize:20,marginBottom:4}}>{f.icon}</div>
                <div style={{fontSize:11,fontWeight:700,color:C.white,marginBottom:2}}>{f.label}</div>
                <div style={{fontSize:10,color:C.dimmer,lineHeight:1.3}}>{f.sub}</div>
              </div>
            ))}
          </div>
        </div>

      <div style={{background:"rgba(8,14,26,0.78)",backdropFilter:"blur(10px)",WebkitBackdropFilter:"blur(10px)",border:`1px solid ${C.border}`,borderRadius:16,padding:"2rem 1.5rem",boxShadow:"0 24px 60px rgba(0,0,0,0.5)"}}>
        <div style={{display:"flex",alignItems:"center",gap:".6rem",marginBottom:"2rem"}}>
          <IceIQLogo size={32}/>
          <span style={{fontFamily:FONT.display,fontWeight:800,fontSize:"2rem",color:C.gold,letterSpacing:".08em"}}>IceIQ</span>
        </div>
        <h1 style={{fontFamily:FONT.display,fontWeight:800,fontSize:"clamp(1.8rem,6vw,2.4rem)",margin:"0 0 .5rem",lineHeight:1.1}}>
          {headline}
        </h1>
        <p style={{fontSize:14,color:C.dim,marginBottom:"1.5rem",lineHeight:1.6}}>{subhead}</p>

        {mode === "signup" && (
          <>
            <div style={{marginBottom:"1rem"}}>
              <div style={{fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:C.dimmer,fontWeight:700,marginBottom:".5rem"}}>I am a...</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".5rem"}}>
                {[{v:"player",l:"Parent/Guardian (on behalf of player)",i:"👪"},{v:"coach",l:"Coach",i:"👨‍🏫"}].map(o => (
                  <button key={o.v} onClick={()=>setRole(o.v)} style={{background:role===o.v?C.goldDim:C.bgCard,border:`1px solid ${role===o.v?C.gold:C.border}`,borderRadius:10,padding:".75rem",cursor:"pointer",color:role===o.v?C.gold:C.dim,fontFamily:FONT.body,fontWeight:role===o.v?700:500,fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",gap:".4rem"}}>
                    <span style={{fontSize:16}}>{o.i}</span>{o.l}
                  </button>
                ))}
              </div>
            </div>
            <div style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:10,padding:".6rem .85rem",marginBottom:".6rem"}}>
              <div style={{fontSize:10,letterSpacing:".1em",textTransform:"uppercase",color:C.dimmer,fontWeight:700,marginBottom:2}}>Name</div>
              <input value={name} onChange={e=>setName(e.target.value)} placeholder={role==="coach"?"Coach name":"Player's name"}
                style={{background:"none",border:"none",color:C.white,fontSize:15,fontFamily:FONT.body,width:"100%",outline:"none",padding:0}}/>
            </div>
          </>
        )}

        {/* Email + password side-by-side on wider screens, stacked on narrow */}
        {mode !== "forgot" ? (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".5rem",marginBottom:".65rem"}}>
            <div style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:10,padding:".6rem .85rem"}}>
              <div style={{fontSize:10,letterSpacing:".1em",textTransform:"uppercase",color:C.dimmer,fontWeight:700,marginBottom:2}}>Email</div>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email"
                style={{background:"none",border:"none",color:C.white,fontSize:14,fontFamily:FONT.body,width:"100%",outline:"none",padding:0}}/>
            </div>
            <div style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:10,padding:".6rem .85rem"}}>
              <div style={{fontSize:10,letterSpacing:".1em",textTransform:"uppercase",color:C.dimmer,fontWeight:700,marginBottom:2}}>Password</div>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder={mode==="signup"?"6+ chars":"••••••"} autoComplete={mode==="signup"?"new-password":"current-password"}
                style={{background:"none",border:"none",color:C.white,fontSize:14,fontFamily:FONT.body,width:"100%",outline:"none",padding:0}}/>
            </div>
          </div>
        ) : (
          <div style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:10,padding:".6rem .85rem",marginBottom:".65rem"}}>
            <div style={{fontSize:10,letterSpacing:".1em",textTransform:"uppercase",color:C.dimmer,fontWeight:700,marginBottom:2}}>Email</div>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email"
              style={{background:"none",border:"none",color:C.white,fontSize:15,fontFamily:FONT.body,width:"100%",outline:"none",padding:0}}/>
          </div>
        )}

        {err && (
          <div style={{fontSize:13,color:C.red,background:C.redDim,border:`1px solid ${C.redBorder}`,borderRadius:8,padding:".6rem .8rem",marginBottom:".75rem"}}>
            {err}
          </div>
        )}
        {resetSent && (
          <div style={{fontSize:13,color:C.green,background:"rgba(34,197,94,.08)",border:`1px solid ${C.greenBorder}`,borderRadius:8,padding:".65rem .8rem",marginBottom:".75rem",lineHeight:1.5}}>
            ✓ Check your email for a reset link. It may take a minute to arrive.
          </div>
        )}

        {/* Big primary button — bigger than the email/password fields */}
        <button onClick={submit} disabled={loading} style={{width:"100%",background:C.gold,color:C.bg,border:"none",borderRadius:12,padding:"1.1rem",cursor:loading?"default":"pointer",fontWeight:800,fontSize:17,fontFamily:FONT.body,letterSpacing:".02em",boxShadow:`0 4px 16px ${C.gold}33`}}>
          {loading ? "…" : (mode === "signup" ? "Create Account →" : mode === "forgot" ? "Send Reset Link →" : "Sign In →")}
        </button>

        {/* Forgot password link — visible only on login mode */}
        {mode === "login" && (
          <div style={{textAlign:"center",marginTop:".75rem"}}>
            <button onClick={()=>{setMode("forgot");setErr("");setResetSent(false);}} style={{background:"none",border:"none",color:C.dimmer,cursor:"pointer",fontSize:12,fontFamily:FONT.body,padding:0,textDecoration:"underline"}}>
              Forgot password?
            </button>
          </div>
        )}
        {mode === "forgot" && (
          <div style={{textAlign:"center",marginTop:".75rem"}}>
            <button onClick={()=>{setMode("login");setErr("");setResetSent(false);}} style={{background:"none",border:"none",color:C.dimmer,cursor:"pointer",fontSize:12,fontFamily:FONT.body,padding:0,textDecoration:"underline"}}>
              ← Back to sign in
            </button>
          </div>
        )}

        {mode !== "forgot" && (
          <div style={{textAlign:"center",marginTop:"1.25rem",fontSize:13,color:C.dimmer}}>
            {mode === "login" ? "New to IceIQ? " : "Already have an account? "}
            <button onClick={()=>{setMode(mode==="login"?"signup":"login");setErr("");}} style={{background:"none",border:"none",color:C.gold,cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:FONT.body,padding:0,textDecoration:"underline"}}>
              {mode === "login" ? "Create account" : "Sign in"}
            </button>
          </div>
        )}

        <div style={{marginTop:"2rem",paddingTop:"1.5rem",borderTop:`1px solid ${C.border}`}}>
          <div style={{fontSize:11,letterSpacing:".14em",textTransform:"uppercase",color:C.dimmer,fontWeight:700,textAlign:"center",marginBottom:".85rem"}}>See it in action — pick a player</div>
          <div style={{fontSize:10,letterSpacing:".12em",textTransform:"uppercase",color:C.purple,fontWeight:700,marginBottom:".4rem"}}>Player</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".5rem",marginBottom:".75rem"}}>
            {LEVELS.map(lvl => {
              const cfg = DEMO_PROFILES[lvl];
              if (!cfg) return null;
              const short = lvl.split(" / ")[0];
              return (
                <button key={lvl} onClick={()=>onDemo(lvl)} style={{background:C.bgCard,border:`1px solid ${C.purpleBorder}`,borderRadius:10,padding:".7rem .6rem",cursor:"pointer",color:C.white,fontFamily:FONT.body,textAlign:"left"}}>
                  <div style={{fontWeight:700,fontSize:13,color:C.purple,marginBottom:2}}>{short} · {cfg.position}</div>
                  <div style={{fontSize:11,color:C.dimmer,lineHeight:1.4}}>{cfg.name} · {cfg.team}</div>
                </button>
              );
            })}
          </div>
          <div style={{fontSize:10,letterSpacing:".12em",textTransform:"uppercase",color:C.gold,fontWeight:700,marginBottom:".4rem"}}>Coach</div>
          <button onClick={()=>onDemo("__coach__")} style={{width:"100%",background:`linear-gradient(135deg,rgba(201,168,76,.12),rgba(201,168,76,.04))`,border:`1px solid ${C.goldBorder}`,borderRadius:10,padding:".7rem .6rem",cursor:"pointer",color:C.white,fontFamily:FONT.body,textAlign:"left"}}>
            <div style={{fontWeight:700,fontSize:13,color:C.gold,marginBottom:2}}>Coach Dashboard</div>
            <div style={{fontSize:11,color:C.dimmer,lineHeight:1.4}}>View a team roster, rate players, and explore the coach tools</div>
          </button>
          <div style={{fontSize:11,color:C.dimmer,textAlign:"center",marginTop:".65rem",lineHeight:1.5}}>Nothing is saved in demo mode.</div>
        </div>

        <div style={{fontSize:10,color:C.dimmer,textAlign:"center",marginTop:"2rem",opacity:.6}}>v{VERSION}</div>
      </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// COACH HOME — teams list, create team, roster
// ─────────────────────────────────────────────────────────
const DEMO_COACH_TEAMS = [
  {id:"demo-t1",name:"U11 AA Edmonton Selects",level:"U11 / Atom",season:SEASONS[0],code:"SELECTS"},
];
const DEMO_COACH_ROSTER = [
  {id:"dr1",name:"Cole Gretzky",level:"U11 / Atom",position:"Forward",iq:83,sessions:3},
  {id:"dr2",name:"Nora Howe",level:"U11 / Atom",position:"Defense",iq:71,sessions:2},
  {id:"dr3",name:"Marcus Sakic",level:"U11 / Atom",position:"Forward",iq:65,sessions:1},
  {id:"dr4",name:"Maya Hasek",level:"U11 / Atom",position:"Goalie",iq:78,sessions:3},
  {id:"dr5",name:"Tyler Blackwood",level:"U11 / Atom",position:"Defense",iq:58,sessions:1},
];

function CoachHome({ profile, onSignOut, onOpenPlayer, demoMode }) {
  const isDemo = demoMode || profile.id === "__demo_coach__";
  const [teams, setTeams] = useState(isDemo ? DEMO_COACH_TEAMS : []);
  const [loading, setLoading] = useState(!isDemo);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLevel, setNewLevel] = useState("U11 / Atom");
  const [newSeason, setNewSeason] = useState(SEASONS[0]);
  const [expandedTeam, setExpandedTeam] = useState(isDemo ? "demo-t1" : null);
  const [rosters, setRosters] = useState(isDemo ? {"demo-t1": DEMO_COACH_ROSTER} : {});

  useEffect(() => { if (isDemo) return; (async () => {
    const t = await SB.getCoachTeams(profile.id);
    setTeams(t);
    setLoading(false);
  })(); }, []);

  async function createTeam() {
    if (!newName.trim()) return;
    try {
      const team = await SB.createTeam({ coachId: profile.id, name: newName.trim(), level: newLevel, season: newSeason });
      setTeams([team, ...teams]);
      setCreating(false); setNewName("");
    } catch (e) { alert(e.message); }
  }

  async function toggleRoster(teamId) {
    if (expandedTeam === teamId) { setExpandedTeam(null); return; }
    setExpandedTeam(teamId);
    if (!rosters[teamId]) {
      const r = await SB.getTeamRoster(teamId);
      setRosters(p => ({...p, [teamId]: r}));
    }
  }

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.white,fontFamily:FONT.body,paddingBottom:40}}>
      <div style={{padding:"1.5rem 1.25rem",maxWidth:560,margin:"0 auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"1.5rem"}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:".45rem",marginBottom:".25rem"}}>
              <IceIQLogo size={22}/>
              <span style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.5rem",color:C.gold,letterSpacing:".06em"}}>IceIQ</span>
              <span style={{fontSize:10,color:C.dimmer,fontWeight:500}}>v{VERSION}</span>
            </div>
            <div style={{fontSize:13,color:C.dimmer}}>{profile.name} · Coach</div>
          </div>
          <button onClick={onSignOut} style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:10,padding:".5rem .85rem",color:C.dimmer,cursor:"pointer",fontSize:12,fontFamily:FONT.body}}>Sign out</button>
        </div>

        <Card style={{marginBottom:"1rem",background:`linear-gradient(135deg,${C.bgCard},${C.bgElevated})`,border:`1px solid ${C.goldBorder}`}}>
          <Label>Coach Dashboard</Label>
          <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"2.2rem",color:C.gold,lineHeight:1}}>{teams.length}</div>
          <div style={{fontSize:12,color:C.dimmer,marginTop:4}}>team{teams.length===1?"":"s"} you coach</div>
        </Card>

        {!creating ? (
          <PrimaryBtn onClick={()=>setCreating(true)} style={{marginBottom:"1rem"}}>+ Create New Team</PrimaryBtn>
        ) : (
          <Card style={{marginBottom:"1rem"}}>
            <Label>New Team</Label>
            <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Team name (e.g. Oilers U11 A)" autoFocus
              style={{background:C.bgElevated,border:`1px solid ${C.border}`,borderRadius:8,padding:".6rem .8rem",color:C.white,fontSize:14,fontFamily:FONT.body,width:"100%",outline:"none",marginBottom:".6rem"}}/>
            <div style={{display:"flex",gap:".5rem",marginBottom:".6rem"}}>
              <select value={newLevel} onChange={e=>setNewLevel(e.target.value)}
                style={{flex:1,background:C.bgElevated,border:`1px solid ${C.border}`,borderRadius:8,padding:".6rem .6rem",color:C.white,fontSize:13,fontFamily:FONT.body,outline:"none"}}>
                {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <select value={newSeason} onChange={e=>setNewSeason(e.target.value)}
                style={{flex:1,background:C.bgElevated,border:`1px solid ${C.border}`,borderRadius:8,padding:".6rem .6rem",color:C.white,fontSize:13,fontFamily:FONT.body,outline:"none"}}>
                {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{display:"flex",gap:".5rem"}}>
              <button onClick={()=>setCreating(false)} style={{flex:1,background:"none",border:`1px solid ${C.border}`,borderRadius:8,padding:".65rem",cursor:"pointer",color:C.dimmer,fontSize:13,fontFamily:FONT.body,fontWeight:600}}>Cancel</button>
              <button onClick={createTeam} disabled={!newName.trim()} style={{flex:2,background:C.gold,color:C.bg,border:"none",borderRadius:8,padding:".65rem",cursor:"pointer",fontSize:13,fontFamily:FONT.body,fontWeight:800}}>Create</button>
            </div>
          </Card>
        )}

        {loading ? (
          <div style={{color:C.dimmer,textAlign:"center",padding:"2rem"}}>Loading…</div>
        ) : teams.length === 0 ? (
          <Card><div style={{color:C.dimmer,textAlign:"center",padding:"1rem"}}>No teams yet. Create your first team to get started.</div></Card>
        ) : teams.map(t => {
          const roster = rosters[t.id] || [];
          const expanded = expandedTeam === t.id;
          return (
            <Card key={t.id} style={{marginBottom:".75rem"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",cursor:"pointer"}} onClick={()=>toggleRoster(t.id)}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:15,marginBottom:2}}>{t.name}</div>
                  <div style={{fontSize:11,color:C.dimmer}}>{t.level} · {t.season}</div>
                </div>
                <div style={{textAlign:"right",flexShrink:0,marginLeft:"1rem"}}>
                  <div style={{fontSize:10,letterSpacing:".14em",color:C.dimmer,fontWeight:700,textTransform:"uppercase",marginBottom:2}}>Join Code</div>
                  <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.2rem",color:C.gold,letterSpacing:".1em"}}>{t.code}</div>
                </div>
              </div>
              {expanded && (
                <div style={{marginTop:".85rem",paddingTop:".85rem",borderTop:`1px solid ${C.border}`}}>
                  <Label>Roster ({roster.length})</Label>
                  {roster.length === 0 ? (
                    <div style={{fontSize:12,color:C.dimmer,fontStyle:"italic"}}>No players yet — share the join code <span style={{color:C.gold,fontWeight:700}}>{t.code}</span> with players.</div>
                  ) : roster.map(p => (
                    <button key={p.id} onClick={()=>onOpenPlayer(p)} style={{width:"100%",background:C.bgElevated,border:`1px solid ${C.border}`,borderRadius:8,padding:".7rem .85rem",marginBottom:".4rem",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",color:C.white,fontFamily:FONT.body,textAlign:"left"}}>
                      <div>
                        <div style={{fontSize:13,fontWeight:600}}>{p.name}</div>
                        <div style={{fontSize:11,color:C.dimmer}}>{p.level || "No level set"} · {p.position || "No position"}</div>
                      </div>
                      <span style={{color:C.gold,fontSize:14}}>→</span>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// POST-SIGNUP PROFILE SETUP (player picks level/position)
// ─────────────────────────────────────────────────────────
function ProfileSetup({ profile, onComplete }) {
  const [level, setLevel] = useState(profile.level || "");
  const [position, setPosition] = useState(profile.position || "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await SB.updateProfile(profile.id, { level, position });
      onComplete({ ...profile, level, position });
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  if (!level) return (
    <Screen>
      <div style={{marginBottom:"2rem"}}>
        <div style={{fontSize:10,letterSpacing:".18em",color:C.gold,textTransform:"uppercase",fontWeight:700,marginBottom:".6rem"}}>Step 1 of 2</div>
        <h2 style={{fontFamily:FONT.display,fontWeight:800,fontSize:"2rem",margin:0}}>What age group?</h2>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:".5rem"}}>
        {LEVELS.map(l => (
          <button key={l} onClick={()=>setLevel(l)} style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:12,padding:"1rem 1.25rem",cursor:"pointer",color:C.white,fontFamily:FONT.body,fontSize:15,textAlign:"left",fontWeight:600}}>
            {l}
          </button>
        ))}
      </div>
    </Screen>
  );

  const posOptions = [{p:"Forward",i:"⚡"},{p:"Defense",i:"🛡"},{p:"Goalie",i:"🧤"},{p:"Not Sure",i:"❓"}];
  return (
    <Screen>
      <div style={{marginBottom:"1.5rem"}}>
        <div style={{fontSize:10,letterSpacing:".18em",color:C.gold,textTransform:"uppercase",fontWeight:700,marginBottom:".6rem"}}>Step 2 of 2</div>
        <h2 style={{fontFamily:FONT.display,fontWeight:800,fontSize:"2rem",margin:"0 0 .35rem"}}>What position?</h2>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".75rem",marginBottom:"1.5rem"}}>
        {posOptions.map(({p,i}) => (
          <button key={p} onClick={()=>setPosition(p)} style={{background:position===p?C.goldDim:C.bgCard,border:`1px solid ${position===p?C.gold:C.border}`,borderRadius:14,padding:"1.25rem .75rem",cursor:"pointer",textAlign:"center",transition:"all .15s"}}>
            <div style={{fontSize:26,marginBottom:".4rem"}}>{i}</div>
            <div style={{fontSize:13,color:position===p?C.gold:C.dim,fontWeight:position===p?700:400,fontFamily:FONT.body}}>{p}</div>
          </button>
        ))}
      </div>
      <div style={{display:"flex",gap:".5rem"}}>
        <button onClick={()=>setLevel("")} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:10,padding:".75rem 1rem",cursor:"pointer",color:C.dimmer,fontSize:13,fontFamily:FONT.body}}>← Back</button>
        <PrimaryBtn onClick={save} disabled={!position||saving} style={{flex:1,margin:0}}>{saving?"Saving…":"Finish Setup →"}</PrimaryBtn>
      </div>
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────
// APP ROOT
// ─────────────────────────────────────────────────────────
export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [profile, setProfile] = useState(null);
  const [player, setPlayer] = useState(null); // enriched player object (profile + synced data)
  const [demoMode, setDemoMode] = useState(false);
  const [demoCoachRatings, setDemoCoachRatings] = useState(null);
  const [screen, setScreen] = useState("home");
  const [prevScore, setPrevScore] = useState(null);
  const [totalSessions, setTotalSessions] = useState(0);
  const [quizResults, setQuizResults] = useState([]);
  const [seqPerfect, setSeqPerfect] = useState(false);
  const [mistakeStreak, setMistakeStreak] = useState(0);
  const [upgradePrompt, setUpgradePrompt] = useState(null); // {feature, target} | null
  const [userEmail, setUserEmail] = useState(null);

  // Resolve tier once per render
  const tier = resolveTier({ profile, demoMode });

  function promptUpgrade(feature, target) {
    setUpgradePrompt({ feature, target: target || null });
  }
  function closeUpgrade() { setUpgradePrompt(null); }

  // Run season reset check on boot so free-tier switch counters refresh each September
  useEffect(() => { try { checkSeasonReset(); } catch {} }, []);

  function enterDemo(levelOrRole) {
    if (levelOrRole === "__coach__") {
      setDemoMode(true);
      setDemoCoachRatings(null);
      setProfile({ id: "__demo_coach__", role: "coach", name: "Coach Demo" });
      setScreen("home");
      return;
    }
    const level = levelOrRole || "U9 / Novice";
    const p = buildDemoPlayer(level);
    const coachData = buildDemoCoachRatings(level);
    setDemoMode(true);
    setDemoCoachRatings(coachData);
    setProfile({ id: "__demo__", role: "player", name: p.name, level: p.level, position: p.position });
    setPlayer(p);
    setPrevScore(p.quizHistory[p.quizHistory.length-1]?.score || null);
    setTotalSessions(p.quizHistory.length);
    setScreen("home");
  }

  function exitDemo() {
    setDemoMode(false);
    setDemoCoachRatings(null);
    setProfile(null);
    setPlayer(null);
    setPrevScore(null);
    setTotalSessions(0);
    setScreen("home");
  }

  // Hydrate from Supabase on mount, subscribe to auth changes
  useEffect(() => {
    if (!hasSupabase) { setAuthReady(true); return; }
    let mounted = true;
    const timeout = setTimeout(() => { if (mounted) setAuthReady(true); }, 5000);
    (async () => {
      try {
        const session = await SB.getSession();
        if (session?.user && mounted) {
          setUserEmail(session.user.email || null);
          await loadUser(session.user.id);
        }
      } catch(e) { console.error("Session check failed:", e); }
      if (mounted) { clearTimeout(timeout); setAuthReady(true); }
    })();
    const { data } = SB.onAuthChange(async (session) => {
      if (!mounted) return;
      if (session?.user) {
        setUserEmail(session.user.email || null);
        await loadUser(session.user.id);
      }
      else { setProfile(null); setPlayer(null); setUserEmail(null); }
    });
    return () => { mounted = false; data?.subscription?.unsubscribe?.(); };
  }, []);

  async function loadUser(userId) {
    const p = await SB.getProfile(userId);
    if (!p) return;
    setProfile(p);
    if (p.role === "player" && p.level) {
      // Build enriched player object from Supabase data
      const [sessions, goals, selfRatings] = await Promise.all([
        SB.getPlayerSessions(userId),
        SB.getPlayerGoals(userId),
        SB.getSelfRatings(userId),
      ]);
      const quizHistory = sessions.map(s => ({ results: s.results, score: s.score, date: s.completed_at }));
      const enriched = {
        id: p.id,
        name: p.name,
        level: p.level,
        position: p.position || "Not Sure",
        selfRatings,
        quizHistory,
        goals,
        season: p.season || SEASONS[0],
        sessionLength: p.session_length || 10,
        colorblind: !!p.colorblind,
        coachCode: "",
      };
      setPlayer(enriched);
      const latest = quizHistory[quizHistory.length-1];
      setPrevScore(latest ? latest.score : null);
      setTotalSessions(quizHistory.length);
    }
  }

  async function handleQuizFinish(results, sq, ms) {
    const score = calcWeightedIQ(results);
    const newTotal = totalSessions + 1;
    const newHistory = [...(player.quizHistory||[]), {results, score, date:new Date().toISOString()}];
    const updatedPlayer = {...player, quizHistory: newHistory};
    setPlayer(updatedPlayer);
    setQuizResults(results);
    setSeqPerfect(sq);
    setMistakeStreak(ms);
    setPrevScore(score);
    setTotalSessions(newTotal);
    try {
      const sd = updateStreak(getStreakData());
      localStorage.setItem("iceiq_streak", JSON.stringify(sd));
    } catch(e) {}
    if (!demoMode) {
      try { await SB.saveQuizSession(player.id, { results, score, sessionLength: player.sessionLength }); }
      catch(e) { console.error(e); }
    }
    setScreen("results");
  }

  async function handleSkillsSave(ratings) {
    setPlayer({...player, selfRatings: ratings});
    if (!demoMode) {
      try { await SB.saveSelfRatings(player.id, ratings); } catch(e) { console.error(e); }
    }
    setScreen("home");
  }

  async function handleGoalsSave(goals) {
    setPlayer({...player, goals});
    if (!demoMode) {
      try {
        for (const [cat, g] of Object.entries(goals)) {
          if (g?.goal) await SB.saveGoal(player.id, cat, g);
        }
      } catch(e) { console.error(e); }
    }
    setScreen("home");
  }

  async function handleProfileSave(settings) {
    const updated = {...player, ...settings};
    setPlayer(updated);
    if (!demoMode) {
      try {
        await SB.updateProfile(player.id, {
          name: settings.name,
          level: settings.level,
          position: settings.position,
          season: settings.season,
          session_length: settings.sessionLength,
          colorblind: settings.colorblind,
        });
      } catch(e) { console.error(e); }
    }
    setScreen("home");
  }

  async function handleSignOut() {
    if (demoMode) { exitDemo(); return; }
    await SB.signOut();
    setProfile(null); setPlayer(null);
    setScreen("home");
  }

  // Loading while auth settles
  if (!authReady) {
    return <div style={{minHeight:"100vh",background:C.bg,color:C.dimmer,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT.body}}>Loading…</div>;
  }

  // Not logged in → auth screen
  if (!profile) {
    if (!hasSupabase) {
      return <div style={{minHeight:"100vh",background:C.bg,color:C.white,display:"flex",alignItems:"center",justifyContent:"center",padding:"2rem",fontFamily:FONT.body,textAlign:"center"}}>
        <div>
          <div style={{fontSize:"1.2rem",color:C.red,marginBottom:"1rem"}}>Supabase not configured</div>
          <div style={{fontSize:13,color:C.dimmer,lineHeight:1.6}}>Create a <code style={{color:C.gold}}>.env</code> file with<br/><code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>.</div>
        </div>
      </div>;
    }
    return <AuthScreen onAuthenticated={()=>{}} onDemo={enterDemo}/>;
  }

  // Coach home
  if (profile.role === "coach") {
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700;800&family=Barlow+Condensed:wght@700;800&family=Inter:wght@400;500;600;700;800&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: #080e1a; color: #f8fafc; -webkit-font-smoothing: antialiased; }
          ::-webkit-scrollbar { width: 4px; }
          ::-webkit-scrollbar-thumb { background: rgba(248,250,252,.08); border-radius: 2px; }
          input, textarea, button, select { font-family: 'Inter', 'DM Sans', system-ui, sans-serif; }
          button:active { opacity: .8; }
          textarea { resize: none; }
        `}</style>
        <CoachHome
          profile={profile}
          onSignOut={handleSignOut}
          demoMode={demoMode}
          onOpenPlayer={(p) => {
            // Coach rating for this player
            const pk = p.id;
            const playerLevel = p.level || "U11 / Atom";
            // We'll open a rating screen inline
            setScreen({kind:"rate", player:p, playerLevel});
          }}
        />
        {typeof screen === "object" && screen.kind === "rate" && (
          <CoachRatingScreenAuthed
            coach={profile}
            player={screen.player}
            playerLevel={screen.playerLevel}
            onDone={()=>setScreen("home")}
          />
        )}
      </>
    );
  }

  // Player without completed profile → profile setup
  if (profile.role === "player" && (!profile.level || !profile.position)) {
    return <ProfileSetup profile={profile} onComplete={async () => { await loadUser(profile.id); }}/>;
  }

  // Player not fully loaded yet
  if (!player) return <div style={{minHeight:"100vh",background:C.bg,color:C.dimmer,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT.body}}>Loading profile…</div>;

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #080e1a; color: #f8fafc; -webkit-font-smoothing: antialiased; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(248,250,252,.08); border-radius: 2px; }
        input, textarea, button, select { font-family: 'DM Sans', 'Inter', system-ui, sans-serif; }
        button:active { opacity: .8; }
        textarea { resize: none; }
      `}</style>

      {demoMode && (
        <div style={{position:"sticky",top:0,background:C.purple,color:C.white,padding:".45rem 1rem",fontSize:12,fontWeight:600,textAlign:"center",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",gap:".75rem"}}>
          🎮 Demo mode — data won't be saved.
          <button onClick={exitDemo} style={{background:C.white,color:C.purple,border:"none",borderRadius:6,padding:".25rem .7rem",fontWeight:800,fontSize:11,cursor:"pointer",fontFamily:FONT.body}}>Sign Up →</button>
        </div>
      )}

      <div style={{paddingBottom: screen==="quiz"||screen==="results" ? 0 : 80}}>
        {screen === "home"    && <Home player={tierLimitedPlayer(player, tier)} onNav={setScreen} demoMode={demoMode} subscriptionTier={tier}/>}
        {screen === "quiz"    && <Quiz player={player} onFinish={handleQuizFinish} onBack={()=>setScreen("home")} tier={tier}/>}
        {screen === "results" && <Results results={quizResults} player={player} prevScore={prevScore} totalSessions={totalSessions} seqPerfect={seqPerfect} mistakeStreak={mistakeStreak} onAgain={()=>setScreen("quiz")} onHome={()=>setScreen("home")}/>}
        {screen === "skills"  && <Skills player={player} onSave={handleSkillsSave} onBack={()=>setScreen("home")}/>}
        {screen === "study"   && <StudyScreen player={player} onBack={()=>setScreen("home")} onNav={setScreen}/>}
        {screen === "goals"   && (canAccess("smartGoals", tier).allowed
          ? <GoalsScreen player={player} onSave={handleGoalsSave} onBack={()=>setScreen("home")}/>
          : <GatedScreen feature="smartGoals" title="SMART Goals" description="Set specific, measurable, achievable development goals across every skill category — tied to your self-assessment and coach feedback." onBack={()=>setScreen("home")} onUnlock={()=>promptUpgrade("smartGoals","pro")}/>
        )}
        {screen === "report"  && <Report player={tierLimitedPlayer(player, tier)} onBack={()=>setScreen("home")} demoCoachData={demoMode?demoCoachRatings:null} tier={tier} onUpgrade={(f,t)=>promptUpgrade(f,t)}/>}
        {screen === "profile" && <Profile player={player} onSave={handleProfileSave} onBack={()=>setScreen("home")} onReset={handleSignOut} demoMode={demoMode} tier={tier} onUpgrade={(f,t)=>promptUpgrade(f,t)} userEmail={userEmail} onAdminReports={()=>setScreen("admin")}/>}
        {screen === "admin" && <AdminReports onBack={()=>setScreen("profile")}/>}
      </div>

      {!["quiz","results"].includes(screen) && (
        <BottomNav active={screen} onNav={setScreen}/>
      )}

      {upgradePrompt && (
        <UpgradePrompt
          feature={upgradePrompt.feature}
          target={upgradePrompt.target}
          onClose={closeUpgrade}
          onViewPlans={() => { closeUpgrade(); setScreen("plans"); }}
        />
      )}
      {screen === "plans" && <PlansScreen onBack={()=>setScreen("home")} tier={tier}/>}
    </>
  );
}

// Helper: cap quiz history for tiers without fullSessionHistory
function tierLimitedPlayer(player, tier) {
  if (!player) return player;
  if (canAccess("fullSessionHistory", tier).allowed) return player;
  const cap = 5;
  if (!player.quizHistory || player.quizHistory.length <= cap) return player;
  return { ...player, quizHistory: player.quizHistory.slice(-cap) };
}

// Generic gated-screen wrapper for full-screen locked features
function GatedScreen({ feature, title, description, onBack, onUnlock }) {
  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.white,fontFamily:FONT.body,paddingBottom:80}}>
      <StickyHeader>
        <div style={{maxWidth:560,margin:"0 auto",display:"flex",alignItems:"center",gap:"1rem"}}>
          <BackBtn onClick={onBack}/>
          <div style={{flex:1,fontFamily:FONT.display,fontWeight:800,fontSize:"1.1rem"}}>{title}</div>
        </div>
      </StickyHeader>
      <div style={{padding:"2rem 1.25rem",maxWidth:560,margin:"0 auto"}}>
        <Card style={{textAlign:"center",padding:"2rem 1.25rem",background:`linear-gradient(135deg,${C.bgCard},${C.bgElevated})`,border:`1px solid ${C.goldBorder}`}}>
          <div style={{fontSize:40,marginBottom:".75rem"}}>🔒</div>
          <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.6rem",color:C.gold,marginBottom:".5rem"}}>{title}</div>
          <div style={{fontSize:13,color:C.dim,lineHeight:1.6,marginBottom:"1.5rem"}}>{description}</div>
          <button onClick={onUnlock} style={{background:C.gold,color:C.bg,border:"none",borderRadius:10,padding:".8rem 1.5rem",cursor:"pointer",fontWeight:800,fontSize:14,fontFamily:FONT.body}}>
            Unlock with Pro →
          </button>
        </Card>
      </div>
    </div>
  );
}

// Plans screen — showcase all tiers
function PlansScreen({ onBack, tier }) {
  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.white,fontFamily:FONT.body,paddingBottom:80}}>
      <StickyHeader>
        <div style={{maxWidth:560,margin:"0 auto",display:"flex",alignItems:"center",gap:"1rem"}}>
          <BackBtn onClick={onBack}/>
          <div style={{flex:1,fontFamily:FONT.display,fontWeight:800,fontSize:"1.1rem"}}>Plans & Pricing</div>
          <div style={{fontSize:11,color:C.dimmer}}>You're on {tier}</div>
        </div>
      </StickyHeader>
      <div style={{padding:"1.25rem",maxWidth:560,margin:"0 auto"}}>
        <Card style={{marginBottom:"1rem"}}>
          <Label>Free</Label>
          <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"2rem",color:C.white}}>$0</div>
          <div style={{fontSize:11,color:C.dimmer,marginBottom:".75rem"}}>Get started, one age group, basic questions</div>
          <div style={{fontSize:12,color:C.dim,lineHeight:1.7}}>✓ 1 age group (device-locked)<br/>✓ Multiple choice questions only<br/>✓ Last 5 sessions of history</div>
        </Card>

        <Card style={{marginBottom:"1rem",background:`linear-gradient(135deg,${C.bgCard},${C.bgElevated})`,border:`1px solid ${C.goldBorder}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:".5rem"}}>
            <Label>Pro</Label>
            <div style={{fontSize:10,background:C.goldDim,color:C.gold,padding:"2px 8px",borderRadius:4,fontWeight:800,letterSpacing:".08em"}}>MOST POPULAR</div>
          </div>
          <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"2rem",color:C.gold}}>$12.99<span style={{fontSize:13,color:C.dimmer,fontWeight:500}}> / month</span></div>
          <div style={{fontSize:11,color:C.dimmer,marginBottom:".75rem"}}>or $89.99 / year (save 42%)</div>
          {PRO_BENEFITS.map((b,i) => (
            <div key={i} style={{display:"flex",alignItems:"flex-start",gap:".55rem",padding:".3rem 0",fontSize:12,color:C.dim,lineHeight:1.5}}>
              <span style={{fontSize:14,flexShrink:0}}>{b.icon}</span><span>{b.text}</span>
            </div>
          ))}
        </Card>

        <Card style={{marginBottom:"1rem"}}>
          <Label>Family</Label>
          <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"2rem",color:C.white}}>$19.99<span style={{fontSize:13,color:C.dimmer,fontWeight:500}}> / month</span></div>
          <div style={{fontSize:11,color:C.dimmer,marginBottom:".75rem"}}>or $139.99 / year · 3 players</div>
          {FAMILY_BENEFITS.map((b,i) => (
            <div key={i} style={{display:"flex",alignItems:"flex-start",gap:".55rem",padding:".3rem 0",fontSize:12,color:C.dim,lineHeight:1.5}}>
              <span style={{fontSize:14,flexShrink:0}}>{b.icon}</span><span>{b.text}</span>
            </div>
          ))}
        </Card>

        <Card style={{marginBottom:"1rem"}}>
          <Label>Team</Label>
          <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"2rem",color:C.white}}>$49.99<span style={{fontSize:13,color:C.dimmer,fontWeight:500}}> / month</span></div>
          <div style={{fontSize:11,color:C.dimmer,marginBottom:".75rem"}}>or $249.99 season pass (Sep–Mar) · up to 20 players</div>
          {TEAM_BENEFITS.map((b,i) => (
            <div key={i} style={{display:"flex",alignItems:"flex-start",gap:".55rem",padding:".3rem 0",fontSize:12,color:C.dim,lineHeight:1.5}}>
              <span style={{fontSize:14,flexShrink:0}}>{b.icon}</span><span>{b.text}</span>
            </div>
          ))}
        </Card>

        <div style={{fontSize:11,color:C.dimmer,textAlign:"center",marginTop:"1rem",lineHeight:1.6}}>
          Payment processing is coming soon. Contact us at <span style={{color:C.gold}}>bluechip-people-strategies.com</span> for early access.
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// COACH RATING SCREEN (authenticated version)
// ─────────────────────────────────────────────────────────
function CoachRatingScreenAuthed({ coach, player, playerLevel, onDone }) {
  const [ratings, setRatings] = useState({});
  const [notes, setNotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeSkill, setActiveSkill] = useState(null);
  const cats = SKILLS[playerLevel] || [];
  const allSkills = cats.flatMap(c => c.skills.map(s => ({...s, cat:c.cat, icon:c.icon})));
  const rated = Object.values(ratings).filter(v=>v).length;
  const coachScale = getCoachScale(playerLevel);
  const coachScaleType = RATING_SCALES[playerLevel]?.coach?.type;

  const scaleIntro = {
    "growth":     "Rate each skill using the growth scale — where is this player in their development journey?",
    "competency": "Rate each skill using the competency scale — how reliably does this player execute in games?",
    "percentile": "Rate each skill using the percentile system.",
  };
  const legendTitle = {growth:"Growth Scale",competency:"Competency Scale",percentile:"Percentile Scale"};

  const isDemo = coach?.id === "__demo_coach__" || String(player?.id || "").startsWith("dr") || String(player?.id || "").startsWith("__demo");
  useEffect(() => {
    if (isDemo) { setLoading(false); return; }
    (async () => {
      const existing = await SB.getCoachRatingsForPlayer(player.id);
      setRatings(existing.ratings || {});
      setNotes(existing.notes || {});
      setLoading(false);
    })();
  }, []);

  async function save() {
    setSaving(true);
    try {
      if (!isDemo) await SB.saveCoachRatingsForPlayer(coach.id, player.id, ratings, notes);
      setSaved(true);
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  return (
    <div style={{position:"fixed",inset:0,background:C.bg,color:C.white,fontFamily:FONT.body,padding:"1.5rem 1.25rem",overflowY:"auto",zIndex:100}}>
      <div style={{maxWidth:560,margin:"0 auto"}}>
        <BackBtn onClick={onDone}/>
        <Card style={{marginBottom:"1.5rem",background:`linear-gradient(135deg,${C.bgCard},${C.bgElevated})`,border:`1px solid ${C.goldBorder}`}}>
          <div style={{fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:C.gold,marginBottom:".4rem"}}>Rating Player</div>
          <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.8rem"}}>{player.name}</div>
          <div style={{fontSize:13,color:C.dimmer,marginTop:2}}>{playerLevel}</div>
          <div style={{marginTop:".85rem",fontSize:12,color:C.dim,lineHeight:1.6}}>{scaleIntro[coachScaleType] || scaleIntro.ladder}</div>
        </Card>

        {loading ? <div style={{color:C.dimmer,textAlign:"center",padding:"2rem"}}>Loading…</div> : (<>
          <Card style={{marginBottom:"1.25rem"}}>
            <Label>{legendTitle[coachScaleType]}</Label>
            <div style={{display:"flex",flexDirection:"column",gap:".4rem"}}>
              {coachScale.map(r => (
                <div key={r.value} style={{display:"flex",alignItems:"center",gap:".75rem",padding:".45rem .6rem",borderRadius:8,background:`${r.color}10`,border:`1px solid ${r.color}25`}}>
                  <div style={{width:10,height:10,borderRadius:"50%",background:r.color,flexShrink:0}}/>
                  <div style={{fontWeight:700,fontSize:13,color:r.color,minWidth:95}}>{r.label}</div>
                  <div style={{fontSize:12,color:C.dimmer}}>{r.sub}</div>
                </div>
              ))}
            </div>
          </Card>

          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:".75rem"}}>
            <div style={{fontSize:13,color:C.dim,fontWeight:600}}>{rated}/{allSkills.length} skills rated</div>
            <div style={{fontSize:11,color:C.dimmer}}>{rated===allSkills.length?"All done ✓":"Rate each skill below"}</div>
          </div>
          <ProgressBar value={rated} max={allSkills.length} color={C.gold} height={5}/>
          <div style={{height:"1rem"}}/>

          {cats.map(cat => (
            <div key={cat.cat} style={{marginBottom:"1.25rem"}}>
              <div style={{display:"flex",alignItems:"center",gap:".4rem",marginBottom:".6rem"}}>
                <span style={{fontSize:15}}>{cat.icon}</span>
                <span style={{fontSize:11,letterSpacing:".12em",textTransform:"uppercase",color:C.dimmer,fontWeight:700}}>{cat.cat}</span>
              </div>
              {cat.skills.map(skill => {
                const rating = ratings[skill.id];
                const isActive = activeSkill === skill.id;
                const ratingColor = rating ? getScaleColor(coachScale, rating) : null;
                const ratingLabel = rating ? getScaleLabel(coachScale, rating) : null;
                return (
                  <div key={skill.id} style={{marginBottom:".6rem"}}>
                    <button onClick={() => setActiveSkill(isActive ? null : skill.id)}
                      style={{width:"100%",background:rating?`${ratingColor}10`:C.bgCard,border:`1px solid ${rating?ratingColor+"40":C.border}`,borderLeft:`3px solid ${rating?ratingColor:"transparent"}`,borderRadius:12,padding:".85rem 1rem",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",color:C.white,fontFamily:FONT.body,textAlign:"left"}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:14,fontWeight:600,marginBottom:2}}>{skill.name}</div>
                        <div style={{fontSize:11,color:C.dimmer,lineHeight:1.4}}>{skill.desc}</div>
                      </div>
                      <div style={{flexShrink:0,marginLeft:"1rem",textAlign:"right"}}>
                        {rating ? <div style={{fontSize:12,fontWeight:700,color:ratingColor}}>{ratingLabel}</div> : <div style={{fontSize:11,color:C.dimmer}}>Tap to rate</div>}
                        <div style={{fontSize:11,color:C.dimmer,marginTop:2}}>{isActive?"▲":"▼"}</div>
                      </div>
                    </button>
                    {isActive && (
                      <div style={{background:C.bgElevated,border:`1px solid ${C.border}`,borderRadius:12,padding:".85rem",marginTop:".35rem",display:"flex",flexDirection:"column",gap:".4rem"}}>
                        {coachScale.map(r => (
                          <button key={r.value} onClick={() => setRatings(p=>({...p,[skill.id]:r.value}))}
                            style={{background:ratings[skill.id]===r.value?`${r.color}18`:"none",border:`1px solid ${ratings[skill.id]===r.value?r.color+"50":C.border}`,borderRadius:8,padding:".65rem 1rem",cursor:"pointer",display:"flex",alignItems:"center",gap:".75rem",fontFamily:FONT.body}}>
                            <div style={{width:10,height:10,borderRadius:"50%",background:r.color,flexShrink:0}}/>
                            <div style={{textAlign:"left"}}>
                              <div style={{fontSize:13,fontWeight:700,color:r.color}}>{r.label}</div>
                              <div style={{fontSize:11,color:C.dimmer}}>{r.sub}</div>
                            </div>
                            {ratings[skill.id]===r.value && <div style={{marginLeft:"auto",color:r.color,fontSize:14}}>✓</div>}
                          </button>
                        ))}
                        {rating && (
                          <div style={{marginTop:".5rem",paddingTop:".6rem",borderTop:`1px solid ${C.border}`}}>
                            <div style={{fontSize:10,letterSpacing:".1em",textTransform:"uppercase",color:C.gold,fontWeight:700,marginBottom:".35rem"}}>💬 Discussion note (optional)</div>
                            <textarea value={notes[skill.id]||""} onChange={e=>setNotes(p=>({...p,[skill.id]:e.target.value}))}
                              placeholder={`What's one thing ${player.name} could work on?`}
                              rows={2}
                              style={{width:"100%",background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:8,padding:".55rem .7rem",color:C.white,fontSize:12,fontFamily:FONT.body,outline:"none",lineHeight:1.5}}/>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {saved ? (
            <Card style={{background:"rgba(34,197,94,.08)",border:`1px solid ${C.greenBorder}`,textAlign:"center",padding:"1.5rem"}}>
              <div style={{fontSize:28,marginBottom:".5rem"}}>✅</div>
              <div style={{fontWeight:700,fontSize:15,color:C.green,marginBottom:".35rem"}}>Ratings Saved</div>
              <div style={{fontSize:13,color:C.dim}}>{player.name} will see your ratings and notes in their report.</div>
              <PrimaryBtn onClick={onDone} style={{marginTop:"1rem"}}>Back to Teams</PrimaryBtn>
            </Card>
          ) : (
            <PrimaryBtn onClick={save} disabled={saving || rated === 0} style={{marginBottom:"1rem"}}>
              {saving ? "Saving…" : `Save Ratings (${rated}/${allSkills.length} rated)`}
            </PrimaryBtn>
          )}
        </>)}
      </div>
    </div>
  );
}
