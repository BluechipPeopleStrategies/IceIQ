import { useState, useEffect, useCallback } from "react";
import * as SB from "./supabase";
import { supabase, hasSupabase } from "./supabase";

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

const FONT = {
  display: "'Barlow Condensed', sans-serif",
  body: "'DM Sans', sans-serif",
};

// ─────────────────────────────────────────────────────────
// VERSION
// ─────────────────────────────────────────────────────────
const VERSION = "0.5.0";
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
const LEVELS = ["U7 / Initiation","U9 / Novice","U11 / Atom","U13 / Peewee"];
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



const QB={
  "U7 / Initiation":[
    {id:"u7q1",cat:"Orientation",pos:["F","D"],concept:"Which way?",d:1,sit:"You just got the puck near center ice. There are two nets. What's the FIRST thing you do?",opts:["Skate as fast as you can any direction","Look up and find which net is yours","Pass to the nearest player","Spin around and wait"],ok:1,why:"Before anything else — look up. A one-second glance tells you which way you're going. The habit of looking first is the most important skill in hockey.",tip:"Got the puck? Look up first. Every time."},
    {id:"u7q2",cat:"Compete",pos:["F","D"],concept:"Loose pucks",d:1,sit:"The puck is loose in the corner and nobody is near it. What do you do?",opts:["Wait and see who gets it","Skate hard toward the puck","Stay put and call for it","Go stand in front of the net"],ok:1,why:"Loose pucks belong to whoever wants them most. Going hard after every loose puck is one of the most important habits you can build.",tip:"Loose puck? Go get it. Every time. That's compete."},
    {id:"u7q3",cat:"Game Awareness",pos:["F","D"],concept:"Whistles",d:1,sit:"The referee blows the whistle and play stops. What should you do?",opts:["Keep skating and playing","Stop and look at the ref to see what's next","Sit down on the ice","Skate straight to the bench"],ok:1,why:"When the whistle blows, play is over. Stopping and looking at the ref resets your brain for what comes next.",tip:"Whistle = stop, look, listen. Every time."},
    {id:"u7q4",cat:"Teamwork",pos:["F","D"],concept:"Passing",d:1,sit:"You have the puck and a teammate is wide open beside you. Your path to the net is completely blocked. What's the best play?",opts:["Try to skate through the defenders","Pass to your open teammate","Shoot anyway","Hold the puck and wait"],ok:1,why:"Hockey is a team game. Open teammate + blocked path = pass. This is the beginning of understanding that passing can be smarter than carrying.",tip:"Open teammate + your path blocked = pass. That's real hockey thinking."},
    {id:"u7q5",cat:"Scoring",pos:["F","D"],concept:"Shooting",d:1,sit:"You're close to the net with the puck. Nobody is right on you. What's the best thing to do?",opts:["Skate back to center ice","Shoot at the net","Pass far across to a teammate","Wait for a defender to come"],ok:1,why:"When you're close to the net and open — shoot! Every shot makes the goalie work. Goals come from shooting, not thinking about shooting.",tip:"Close to the net and open? Shoot. Always."},
    {id:"u7q6",cat:"Defense",pos:["F","D"],concept:"Backchecking",d:1,sit:"The other team has the puck and is skating toward your net. What do you do?",opts:["Skate to center ice","Skate back toward your net to help defend","Stand still and watch","Go talk to your coach"],ok:1,why:"When the other team has the puck and is coming your way, your job is to turn around and get back. This is called backchecking.",tip:"Other team coming? Turn around and skate back hard."},
    {id:"u7q7",cat:"Positioning",pos:["F","D"],concept:"Open ice",d:1,sit:"Five teammates are all bunched in one corner chasing the puck. What's a smart thing to do?",opts:["Join the pile and chase too","Find empty ice somewhere else and get open","Skate off the ice","Stay exactly where you are"],ok:1,why:"Hockey players shouldn't all go to the same spot. Finding open ice gives your team options.",tip:"Everyone's in the corner? Go somewhere else and get open."},
    {id:"u7q8",cat:"Coachability",pos:["F","D"],concept:"Listening",d:1,sit:"Your coach is explaining a drill and you're not sure what to do. What's the best thing?",opts:["Just start skating randomly","Listen carefully, then ask what you didn't understand","Do what the kid next to you does","Sit down until someone explains"],ok:1,why:"Coaches give instructions to help you succeed. Listening well and asking questions is smart, not weak.",tip:"Confused? Listen first, then ask. That's how you get better."},
    {id:"u7q9",cat:"Scoring",pos:["F","D"],concept:"Get close to score",d:1,sit:"You have the puck and you're far away from the net. What should you do first before shooting?",opts:["Shoot from far away right now","Skate closer to the net and then shoot","Pass to your teammate who is even farther away","Stop and wait"],ok:1,why:"Shots from close to the net are much harder for goalies to stop. Skating closer before shooting gives you a much better chance to score.",tip:"Far away? Skate closer first. Then shoot."},
    {id:"u7q10",cat:"Compete",pos:["F","D"],concept:"Don't give up",d:1,sit:"You fell down on the ice during a play. What do you do?",opts:["Sit there and wait for the whistle","Get up as fast as you can and keep playing","Wave for a substitution","Watch the rest of the play from the ice"],ok:1,why:"Falling down happens to every player. Getting up fast and staying in the play is compete. The game doesn't stop — neither do you.",tip:"Fell down? Get up fast. Keep going."},
    {id:"u7q11",cat:"Game Awareness",pos:["F","D"],concept:"Which net is yours",d:1,sit:"Before the game starts, how can you tell which net your team is trying to score in?",opts:["You can't — just guess","Your goalie is in front of your team's net","Your goalie is in the other team's net","It changes every minute"],ok:1,why:"Your goalie always defends your team's net. Finding your goalie tells you which end you're defending — and which end you're trying to score in.",tip:"Not sure which net is yours? Find your goalie. They're in front of it."},
    {id:"u7q12",cat:"Teamwork",pos:["F","D"],concept:"Celebrate together",d:1,sit:"Your teammate scores a goal. What should you do?",opts:["Do nothing — you didn't score","Skate toward them and celebrate together","Skate off the ice","Stand by yourself"],ok:1,why:"Hockey is a team sport. When a teammate scores, everyone celebrates — you win together. Learning to celebrate your teammates' goals is part of being a good teammate.",tip:"Teammate scored? Celebrate with them. You're a team."},
    {id:"u7q13",cat:"Positioning",pos:["F","D"],concept:"Near the net",d:1,sit:"Your team has the puck in the offensive zone. You don't have it and nobody is near you. Where's the smartest place to go?",opts:["Stand at center ice","Get to the front of the net","Skate to the corner where the puck is","Go to the bench"],ok:1,why:"Standing in front of the net without the puck is one of the highest-value things a player can do. It creates a screen, puts you in rebound position, and forces a defender to deal with you.",tip:"No puck? Go to the net. Someone will find you there."},
    {id:"u7q14",cat:"Defense",pos:["F","D"],concept:"Get back",d:1,sit:"Your team just shot the puck and the goalie caught it. The other team will now get the puck. What should you start doing right away?",opts:["Stay where you are and watch","Skate back toward your own net to be ready to defend","Skate to the opposing team's end","Go to the corner"],ok:1,why:"After your team's shot is saved, the puck changes possession. Getting back toward your own net right away gets you in position to defend.",tip:"Your shot got saved? Start getting back right away."},
    {id:"u7q15",cat:"Coachability",pos:["F","D"],concept:"Try the drill",d:1,sit:"Your coach shows you a new drill you've never done before. It looks hard. What should you do?",opts:["Refuse to try it","Try your best even if it's hard","Watch other players do it for a long time first","Ask to go home"],ok:1,why:"New drills feel hard at first for everyone. Trying your best — even if you make mistakes — is how you get better. Every great player was a beginner once.",tip:"New drill? Try it. Mistakes are how you learn."},
    {id:"u7q16",cat:"Positioning",pos:["F","D"],concept:"Net front value",d:2,sit:"Your team is in the offensive zone. Your teammate has the puck in the corner. You're standing far away at center ice. What would be the better place to skate to?",opts:["Stay at center ice","Skate to the front of the net — right in front of the goalie","Skate to the same corner as your teammate","Skate to the other end of the rink"],ok:1,why:"When a teammate has the puck in the corner, the front of the net is where you can help most. A pass to you there is the most dangerous play, and you're right there for any rebound.",tip:"Teammate in the corner? You go to the net front. That's your spot."},
    {id:"u7q17",cat:"Game Awareness",pos:["F","D"],concept:"Offsides",d:2,sit:"Your team is skating into the other team's zone. You get there before the puck does. What happens?",opts:["Nothing — you got there first, that's good","The referee calls offsides and play stops","You score automatically","The other team gets to shoot"],ok:1,why:"If you enter the offensive zone before the puck, your team gets called for offsides and play stops. The puck always has to go in first.",tip:"Wait for the puck at the blue line. You can't go in before it."},
    {id:"u7q18",cat:"Compete",pos:["F","D"],concept:"Board battle",d:2,sit:"You and an opponent both reach a loose puck along the boards at the same time. What do you do?",opts:["Stop and let them have it","Use your body to shield the puck and fight to keep it","Skate away and hope a teammate gets it","Fall down"],ok:1,why:"Puck battles are won by the player who competes harder. Using your body to create a wall between the opponent and the puck is a real skill.",tip:"Puck battle: get your body between the opponent and the puck."},
    {id:"u7q19",cat:"Teamwork",pos:["F","D"],concept:"Spread out",d:2,sit:"You're on a 3-on-1 rush — three of your players against one defender. Where should the three attackers be?",opts:["All three skate together in a tight group","Spread out so the defender can't cover everyone","Two go left and one goes right","One attacker goes while two wait at center"],ok:1,why:"Spreading out on a rush forces the defender to make an impossible choice. A tight group lets one player cover all three.",tip:"Rush attack: spread out. Make the defender choose."},
    {id:"u7q20",cat:"Scoring",pos:["F","D"],concept:"Good angle",d:2,sit:"You have the puck right beside the net — almost behind it. The angle is really bad. You can barely see the net. What should you do?",opts:["Shoot from right there anyway","Skate to in front of the net for a better angle before shooting","Pass it all the way to center ice","Stop and wait"],ok:1,why:"Shooting from behind the net or from a bad angle gives the goalie an easy save. Taking an extra second to find a better angle — like cutting to the front — makes the shot much more dangerous.",tip:"Bad angle? Move to a better one. Then shoot."},
    {id:"u7q21",cat:"Defense",pos:["F","D"],concept:"Defend the front",d:2,sit:"The other team has the puck in the corner of your defensive zone. You're the nearest forward. Your defender has already gone to the corner. What should you do?",opts:["Go into the corner to help your defender","Stay at the front of the net so nobody is open there","Skate to center ice","Stand at the blue line"],ok:1,why:"When your defender goes to the corner, you cover the front of the net. If you both go to the corner, the most dangerous spot on the ice is completely empty.",tip:"Defender goes to the corner? You go to the net front. Always."},
    {id:"u7q22",cat:"Game Awareness",pos:["F","D"],concept:"Icing",d:2,sit:"Your team is tired and you just want a break. You shoot the puck all the way down the ice from your own end. What will probably happen?",opts:["Your team gets to change lines","The referee calls icing and the puck comes back — no line change","The other team gets a penalty shot","Nothing — play keeps going"],ok:1,why:"Shooting the puck from your own side of center all the way down the ice without it being touched is called icing. Play stops and comes back — no line change allowed.",tip:"Icing = no break. If you need a line change, do it the right way."},
    {id:"u7q23",cat:"Positioning",pos:["F","D"],concept:"Find the open ice",d:2,sit:"You're in the offensive zone without the puck. Your teammate has it. Three of their teammates are all crowded around them. What should you do?",opts:["Go join the crowd near the puck","Find an open space away from the crowd — near the net or at the blue line","Stand still","Go to the bench"],ok:1,why:"Crowding around the puck carrier makes it harder for them, not easier. Finding open ice gives them a passing option and stretches the defense.",tip:"Teammate has the puck and everyone's crowding them? Go find open ice. Give them an option."},
    {id:"u7q24",cat:"Compete",pos:["F","D"],concept:"Get to the puck first",d:2,sit:"A puck is sliding toward the boards. You and an opponent are racing to it. You're slightly behind them. What's the smart play as you approach?",opts:["Give up — they'll get there first","Angle your body to get to the inside position before they reach the puck","Skate straight at them","Stop and call for a pass"],ok:1,why:"Getting to the inside position — between your opponent and the puck — before they reach it gives you the advantage even if they arrive first.",tip:"Race to a puck: focus on getting inside position, not just getting there first."},
    {id:"u7q25",cat:"Coachability",pos:["F","D"],concept:"Watching from the bench",d:2,sit:"You're sitting on the bench watching the game. What's the best thing to do while you're waiting for your turn?",opts:["Talk to your friends about something else","Watch the game and learn from what's happening on the ice","Look at the crowd","Ignore the game and rest"],ok:1,why:"Watching the game from the bench isn't just resting — it's learning. Players who pay attention to the game while on the bench come back on the ice knowing what's happening.",tip:"On the bench? Watch the game. Learn what's happening before you go back on."},
    {id:"u7q26",cat:"Teamwork",pos:["F","D"],concept:"Be a good sport",d:2,sit:"The other team scores a goal against you. What do you do?",opts:["Argue with the referee","Say something mean to the other team","Skate back to your position and get ready for the next play","Sit down on the ice"],ok:1,why:"Goals happen in every game — even the best teams give them up. The response to a goal against is to regroup and get ready to play. Good sportsmanship means handling both winning and losing the right way.",tip:"Goal against? Head up. Get back to your position. The game's not over."},
    {id:"u7q27",cat:"Scoring",pos:["F","D"],concept:"Follow your shot",d:2,sit:"You shoot the puck at the net. The goalie doesn't quite catch it — the puck bounces off them. What should you do?",opts:["Skate away — you already shot","Chase the rebound and try to shoot again","Celebrate even though it didn't go in","Wait for the referee to blow the whistle"],ok:1,why:"Rebounds from your own shot are one of the easiest scoring chances in hockey. Chasing your shot to the net means you might get a second chance.",tip:"Follow your shot. Rebounds are your friend."},
    {id:"u7q28",cat:"Defense",pos:["F","D"],concept:"Watch your man",d:2,sit:"You're defending in your end of the ice. The puck is in the corner far away from you. Should you just watch the puck?",opts:["Yes — always watch where the puck is","No — find the player near you and keep them in front of you. You can still see the puck with your eyes.","Yes — the puck is the most important thing","Yes — run to where the puck is"],ok:1,why:"In your defensive zone, every defender needs to cover a player — not just watch the puck. If you lose your man, they could get an open pass.",tip:"Defending in your own zone? Find a player to cover. Watch them AND the puck."},
    {id:"u7q29",cat:"Game Awareness",pos:["F","D"],concept:"Line changes",d:2,sit:"You've been skating hard for a long time and your legs are getting tired. The puck goes out of play and the whistle blows. What should you do?",opts:["Keep playing","Skate to the bench so a fresh teammate can take your place","Stop in the middle of the ice","Ask the referee for a break"],ok:1,why:"Changing lines keeps your team fresh. When there's a stoppage and you're tired, getting off the ice and letting a fresh teammate on helps your team.",tip:"Tired during a stoppage? Get to the bench. Let a fresh teammate in."},
    {id:"u7q30",cat:"Compete",pos:["F","D"],concept:"Puck in the corner",d:2,sit:"The puck goes into the corner and you're the nearest player. It's going to be a tough battle to get it. What do you do?",opts:["Wait near the blue line","Go get it — compete hard in the corner","Let the other team have it","Skate away"],ok:1,why:"Corners are where compete happens in hockey. The player who battles hardest in the corners usually wins the puck — and that matters for the whole game.",tip:"Puck in the corner? Go battle for it. Compete wins corners."},
    {id:"u7q31",cat:"Positioning",pos:["F","D"],concept:"Triangle",d:2,sit:"Your team has the puck in the corner. You're a forward without the puck. The net front is empty and so is the area at the top of the face-off circle. Where do you go?",opts:["Go into the corner to help your teammate","Take the net front position","Skate to center ice","Stay at the blue line"],ok:1,why:"When a teammate has the puck in the corner, covering the net front is the highest-value position. It creates options and puts you in position to score.",tip:"Puck in the corner? Someone cover the net. That's usually the job of the nearest forward."},
    {id:"u7q32",cat:"Teamwork",pos:["F","D"],concept:"Help your teammate",d:2,sit:"Your teammate is trying to get the puck but they're getting pushed around by an opponent. You're nearby and don't have the puck. What can you do to help?",opts:["Watch — there's nothing you can do without the puck","Skate toward your teammate — being close creates support and could help them make a play","Skate to the other end","Call to the referee"],ok:1,why:"Being close to a teammate who's in a battle gives them a passing option and moral support. Hockey is about playing together — be there for your teammates.",tip:"Teammate in a battle? Get close and be their option. Support them."},
    {id:"u7q33",cat:"Scoring",pos:["F","D"],concept:"Where to aim",d:2,sit:"You're about to shoot the puck at the net. The goalie is standing in the middle. Where's the best place to aim?",opts:["Right at the goalie — they'll move","Try to shoot around them — aim for a corner of the net","Aim for the crossbar","Shoot as hard as you can without aiming"],ok:1,why:"Shooting right at the goalie makes their job easy. Aiming for the corners of the net — where the goalie isn't — gives you a much better chance to score.",tip:"Aiming for the net? Pick a corner. Shoot where the goalie isn't."},
    {id:"u7q34",cat:"Game Awareness",pos:["F","D"],concept:"Penalty",d:2,sit:"A player on your team does something against the rules and gets a penalty. What happens next?",opts:["Your team gets an extra player","Your team has to play with one less player for a period of time","Nothing changes","The other team loses a player too"],ok:1,why:"When your team takes a penalty, you have to play shorthanded — with fewer players. This is why avoiding penalties is important. The other team has an advantage until the penalty is over.",tip:"Your team has a penalty? You're playing with fewer players. Everyone has to work harder."},
    {id:"u7q35",cat:"Defense",pos:["F","D"],concept:"Shot block",d:2,sit:"A player from the other team is about to shoot the puck at your net. You're between them and the net. What could you try to do?",opts:["Move out of the way","Get in the shooting lane and try to block the shot with your body or stick","Skate to your bench","Turn around and look away"],ok:1,why:"Blocking shots is a way every player can help their team. Getting in the lane between the shooter and your net might deflect or block the shot.",tip:"Player about to shoot? Try to get in the lane and block it."},
    {id:"u7q36",cat:"Positioning",pos:["F","D"],concept:"Rush attack lanes",d:3,sit:"Your team is rushing toward the other team's net — you have more players than the other team right now. Where should you be on the ice to help most?",opts:["Skate as close to the puck carrier as possible","Spread across the ice so the defenders have to cover more space","Skate behind the puck carrier","Stop and watch"],ok:1,why:"Spreading out on a rush forces defenders to cover more space, opening up passing lanes and shooting opportunities.",tip:"Rush attack? Spread across the ice. Give the defenders more to think about."},
    {id:"u7q37",cat:"Teamwork",pos:["F","D"],concept:"Call for the puck",d:3,sit:"You're in a great open spot in the offensive zone with no defenders near you. Your teammate has the puck but hasn't seen you. What do you do?",opts:["Stay quiet — calling is rude","Call your teammate's name or yell 'here!' to let them know you're open","Skate toward them to get the puck yourself","Wait patiently and hope they turn around"],ok:1,why:"Letting your teammate know you're open is the right play. A loud 'here!' gives them a target and might lead directly to a scoring chance.",tip:"Open and your teammate can't see you? Call for the puck. Let them know."},
    {id:"u7q38",cat:"Scoring",pos:["F","D"],concept:"Rebound position",d:3,sit:"Your teammate is shooting the puck at the net from the blue line. You're the nearest forward. What should you do?",opts:["Stay where you are — it might go wide","Skate hard toward the net to get in position for a rebound","Skate away in case the shot misses","Skate to the corner"],ok:1,why:"Shots from the blue line often produce rebounds. Getting to the front of the net before the shot arrives puts you in position to score on the rebound.",tip:"Teammate shooting from far away? Crash the net. Be ready for the rebound."},
    {id:"u7q39",cat:"Game Awareness",pos:["F","D"],concept:"Puck out of play",d:3,sit:"The puck goes over the boards and out of play. What happens next?",opts:["The game keeps going","Play stops and there's a faceoff to restart the game","The team that shot it gets a penalty","Nothing — the referee gets a new puck and throws it in"],ok:1,why:"When the puck leaves the playing surface, play stops. The game restarts with a faceoff at the nearest faceoff dot.",tip:"Puck over the boards? Play stops. Get ready for the faceoff."},
    {id:"u7q40",cat:"Compete",pos:["F","D"],concept:"Going to the front of the net",d:3,sit:"Skating to the front of the other team's net when you don't have the puck can be scary because defenders are there. Why is it worth doing anyway?",opts:["It isn't — stay away from defenders","Because standing there creates scoring chances for your team — rebounds, screens, tips. The best chances come from the front of the net.","Because referees give you extra points for being brave","Because it tires out the goalie"],ok:1,why:"The front of the net is the most dangerous area in hockey. Going there creates screens, rebound chances, and tip opportunities — even though defenders are there. Competing in tough spots is how goals are scored.",tip:"Front of the net is hard. Go there anyway. That's where goals come from."},
    {id:"u7q41",cat:"Positioning",pos:["F","D"],concept:"Don't follow the crowd",d:3,sit:"The puck is in the offensive zone corner. All five of your teammates are chasing it in the corner. The entire front of the net and the blue line are empty. What should you do?",opts:["Join the crowd — the more the better","Pick one of the empty spots — net front or blue line — and get there. Give your team an option.","Go to the bench","Watch and wait for someone to pass it to you in the corner"],ok:1,why:"When everyone goes to the same spot, all the other spots open up. Finding the empty space — net front, blue line — gives your team a passing option and makes the defense split.",tip:"Everyone in the corner? Pick the empty spot. You're more useful there."},
    {id:"u7q42",cat:"Coachability",pos:["F","D"],concept:"Feedback",d:3,sit:"After a drill, your coach tells you something you did wrong and shows you how to do it better. How should you react?",opts:["Argue — you think you did it right","Ignore it — you'll do it your own way","Say thank you and try it the way they showed you","Feel bad and not try anymore"],ok:1,why:"Feedback from coaches is how you get better. A coach who corrects you is investing in you. Listening, saying thank you, and trying the correction is exactly what the best players do.",tip:"Coach gave you feedback? Say thanks and try it their way. That's how you improve."},
    {id:"u7q43",cat:"Teamwork",pos:["F","D"],concept:"Win together, lose together",d:3,sit:"Your team loses the game. A teammate is feeling really sad. What do you say or do?",opts:["Tell them it's their fault you lost","Ignore them — you're feeling bad too","Say 'good game' and encourage them — you'll work hard and get better together","Blame the referee"],ok:1,why:"Losing is part of sports. Being a good teammate means supporting each other even when things go wrong. Encouraging a sad teammate is one of the most important things you can do.",tip:"Team lost and a teammate is sad? Encourage them. You're in it together."},
    {id:"u7q44",cat:"Scoring",pos:["F","D"],concept:"Tip it in",d:3,sit:"A teammate takes a shot from far away. The puck is coming at the net. You're standing right in front of the goalie. What could you try?",opts:["Move out of the way","Try to tip or deflect the puck with your stick — even a small touch can change where it goes","Skate away toward the blue line","Watch to see if it goes in"],ok:1,why:"Deflecting or tipping a shot is one of the hardest things for goalies to stop. Even a small touch from your stick can change the puck's direction enough to score.",tip:"Shot coming and you're in front? Try to tip it. Even a little touch helps."},
    {id:"u7q45",cat:"Defense",pos:["F","D"],concept:"Protect the front",d:3,sit:"An attacker is trying to stand right in front of your goalie. Your goalie can't see the puck with the attacker there. What should you try to do?",opts:["Ignore them — the goalie will figure it out","Move the attacker out of the crease area so your goalie can see","Go get the puck in the corner","Stand beside the attacker and watch"],ok:1,why:"An attacker screening your goalie is a real problem. Moving them out of the crease area is the defender's job so the goalie can see the puck coming.",tip:"Attacker in front of your goalie? Move them out. Your goalie needs to see."},
    {id:"u7q46",cat:"Game Awareness",pos:["F","D"],concept:"Faceoffs",d:3,sit:"There's a faceoff near your team's net. You're not the one taking the faceoff. Where should you be standing?",opts:["Wherever you feel like","In your assigned faceoff position — usually covering a player or an area near the faceoff dot","Right on top of the faceoff dot","At center ice"],ok:1,why:"Faceoffs are set plays. Everyone has a position — you're not just watching the center take the draw. Being in position before the puck drops means your team is ready to win the faceoff and execute.",tip:"About to have a faceoff? Get to your position before the puck drops. Be ready."},
    {id:"u7q47",cat:"Compete",pos:["F","D"],concept:"Puck on the boards",d:3,sit:"The puck is pushed hard along the boards. You're racing an opponent to get it before it slides to the corner. You're even with them. What's the smart move?",opts:["Slow down — they'll probably win","Use your body to angle between them and the puck's path — cut them off before they get there","Skate away","Wait for it to bounce back"],ok:1,why:"Angling your body to cut off the opponent's path to the puck — even when you're even with them — uses body position to win the race. It's smarter than just skating straight.",tip:"Racing to a puck along the boards? Angle your body to cut off their path. Position beats pure speed."},
    {id:"u7q48",cat:"Positioning",pos:["F","D"],concept:"Two on one rush",d:3,sit:"Your team has a 2-on-1 — two of you and only one defender. You don't have the puck. Your teammate does. What should you do?",opts:["Stop and watch your teammate","Skate into open space — go to the side where the defender isn't. Give your teammate a pass option.","Skate toward your teammate","Go to the bench"],ok:1,why:"On a 2-on-1, the player without the puck needs to get to the open side. If the defender takes your teammate, you're wide open for the pass.",tip:"2-on-1 without the puck? Get to the open side. Be the option."},
    {id:"u7q49",cat:"Coachability",pos:["F","D"],concept:"Practice habits",d:3,sit:"Practice is almost over. You're tired. The coach announces one more drill. What do you do?",opts:["Complain loudly","Do the drill at half speed — you're tired so it's okay","Go as hard as you can on the last drill — finishing strong is a good habit","Sit on the ice and wait"],ok:1,why:"How you finish practice is a habit. Players who go hard on the last drill develop the discipline to push through when it's hard — and that matters in games.",tip:"Last drill of practice? Go hard. Finishing strong is a habit."},
    {id:"u7q50",cat:"Teamwork",pos:["F","D"],concept:"Include everyone",d:3,sit:"During a drill, one player on your team keeps getting left out — nobody passes to them. You have the puck and they're open. What do you do?",opts:["Ignore them — you'll pass to your friend instead","Pass to them — they're open and they're your teammate","Try a difficult move yourself","Tell them to move to a better spot first"],ok:1,why:"Every player on your team deserves to be part of the game. If they're open, pass to them. Including everyone makes the whole team better.",tip:"Teammate left out and open? Pass to them. Everyone is part of the team."},
    {id:"u7q51",cat:"Scoring",pos:["F","D"],concept:"Shoot from a good spot",d:3,sit:"You have the puck right in front of the net, 5 feet away. The goalie has stepped far out of the net to cut the angle. There's barely any net to shoot at. What do you do?",opts:["Shoot anyway — just blast it","Try to go around the goalie since they've come so far out","Stop and pass to a teammate","Skate backward"],ok:1,why:"When a goalie comes way out to cut the angle, going around them or pulling the puck wide and shooting on an open net is often better than trying to beat them on the shot.",tip:"Goalie way out cutting the angle? Go around them or pull wide. Don't just blast it at their chest."},
    {id:"u7q52",cat:"Defense",pos:["F","D"],concept:"Cover the pass",d:3,sit:"You're defending in your zone. The puck is in the corner. You see an opposing player standing in the slot with nobody covering them. What do you do?",opts:["Watch the puck in the corner — that's where the play is","Cover the open player in the slot — they're in the most dangerous area and if they get a pass, it'll likely be a goal","Go to the corner where the puck is","Stand at the blue line"],ok:1,why:"An uncovered player in the slot is the biggest danger on the ice. Covering them — even when the puck is in the corner — prevents the most dangerous play from happening.",tip:"Open player in the slot? Cover them immediately. The slot is the most dangerous spot."},
    {id:"u7q53",cat:"Game Awareness",pos:["F","D"],concept:"Off-sides entry",d:3,sit:"Your team is rushing into the offensive zone together. You're the fastest skater and you could easily get into the zone before the puck. Should you?",opts:["Yes — get there first and the puck will follow","No — wait for the puck. If you go in before the puck, your team gets called for offsides.","Yes — it's always better to go fast","Yes — the rules don't apply when you're fast enough"],ok:1,why:"No matter how fast you are, entering the offensive zone before the puck is offsides. The puck has to enter first — always. Wait at the blue line if you have to.",tip:"You're fast, but the puck enters first. Always. Wait for it at the blue line."},
    {id:"u7q54",cat:"Compete",pos:["F","D"],concept:"Hard work is for everyone",d:3,sit:"Your team is losing by a lot of goals with not much time left. Some of your teammates are giving up and not skating hard. What do you do?",opts:["Give up too — the game is over","Keep working hard and encourage your teammates to do the same","Blame your teammates","Argue with the coach"],ok:1,why:"Effort is something every player controls, no matter what the score is. Playing hard until the final whistle shows character, and it's how teams build the habit of never giving up.",tip:"Down by a lot? Keep playing hard. Every shift is a chance to practice compete."},
    {id:"u7q55",cat:"Coachability",pos:["F","D"],concept:"Practice in your head",d:3,sit:"You're on the bench and your coach just taught you something new about positioning. While you're sitting there, what's the best way to use that time?",opts:["Forget about it — you'll remember when you get on the ice","Picture yourself doing it correctly in your head while you watch the play on the ice","Talk to your friends about something else","Wait until next practice to think about it"],ok:1,why:"Visualizing yourself doing a skill correctly — especially right after learning it — helps your brain learn faster. Athletes at all levels use mental practice to improve.",tip:"Learned something new? Picture yourself doing it right while you're on the bench. Mental practice is real practice."},
    {id:"u7q56",cat:"Teamwork",pos:["F","D"],concept:"Communicate",d:3,sit:"You see the puck is coming toward your teammate's blind side — they can't see it. What do you shout?",opts:["Nothing — don't distract them","'Man on!' or 'Puck!' so they know it's coming","'Watch out!' but quietly so you don't seem rude","Wait to see what happens"],ok:1,why:"Communicating what you see to a teammate is one of the most important things in hockey. A quick loud 'man on' or 'puck' gives them the information they need to protect themselves or make a play.",tip:"See something your teammate can't? Shout it. Loud and fast. That's communication."},
    {id:"u7q57",cat:"Positioning",pos:["F","D"],concept:"D-man stay back",d:3,sit:"Your team is attacking and both defensemen have skated deep into the offensive zone. Now the puck turns over. What problem does this create?",opts:["No problem — more attackers is better","The other team can break out fast with nobody to stop them — your defensemen are too deep","Your goalie has to play forward","Your team gets a penalty"],ok:1,why:"When both defensemen go too deep, there's nobody to stop the other team from breaking out quickly. At least one defenseman should always be thinking about the space behind the rush.",tip:"Both D going deep into the attack? Dangerous. Someone needs to be ready for the other team to break out."},
    {id:"u7q58",cat:"Scoring",pos:["F","D"],concept:"Traffic in front",d:3,sit:"You're the defenseman at the blue line with the puck. There's lots of traffic — players from both teams — right in front of the goalie. Should you shoot?",opts:["No — you might hit one of your teammates","Yes — traffic in front makes it hard for the goalie to see, so shots through traffic are dangerous","No — wait until the traffic clears","No — pass to a teammate instead always"],ok:1,why:"Traffic in front of the net blocks the goalie's view of the puck — making your shot more dangerous, not less. Shooting through traffic creates screens and rebounds.",tip:"Traffic in front of the goalie? Shoot. The traffic helps you."},
    {id:"u7q59",cat:"Defense",pos:["F","D"],concept:"Don't all go to the puck",d:3,sit:"Three players from the other team are in your defensive zone. Two of your defenders are fighting for the puck in the corner. A third opposing player is wide open near the net. What should you — a forward — do?",opts:["Go into the corner to help with the puck battle","Cover the open player near the net — they're in a dangerous position and nobody has them","Watch from center ice","Skate toward the blue line"],ok:1,why:"When two teammates are already in the corner, you don't need to be a third player there. The open player near the net is the danger — cover them.",tip:"Two teammates already in the corner? Cover the open player near the net. Don't all go to the puck."},
    {id:"u7q60",cat:"Game Awareness",pos:["F","D"],concept:"Penalties cost your team",d:3,sit:"You're feeling frustrated and you want to hit the other player really hard. But it might be against the rules. What should you do?",opts:["Hit them hard anyway — you'll take the penalty","Control yourself — taking a penalty hurts your whole team, not just you","Ask the referee if it's okay first","Hit them and then apologize"],ok:1,why:"Taking a penalty doesn't just punish you — it puts your whole team at a disadvantage. Learning to control your frustration is an important skill that the best players have.",tip:"Feeling frustrated? Control it. A penalty hurts your whole team."},
    {id:"u7q61",cat:"Teamwork",pos:["F","D"],concept:"After a mistake",d:3,sit:"You made a mistake — you passed the puck to the other team by accident and they scored. Your teammates are looking at you. What do you do?",opts:["Blame someone else","Apologize and feel terrible for the rest of the game","Put your head up and keep going — everyone makes mistakes. Focus on the next play.","Stop trying to make any more passes"],ok:1,why:"Mistakes happen to every player in every game. The best response is to acknowledge it quickly and refocus on the next play. Staying in the moment instead of dwelling on a mistake is a real skill.",tip:"Made a mistake? Head up. Next play. Everyone does it."},
    {id:"u7q62",cat:"Compete",pos:["F","D"],concept:"Puck on the goal line",d:3,sit:"The puck is sitting on the goal line right beside the post. You and a goalie are both racing to it at the same time. What do you try to do?",opts:["Stop — the goalie will get there","Try to bat the puck into the net before the goalie covers it","Skate away","Wait for the referee"],ok:1,why:"Pucks on the goal line are live. If you can get a stick on it before the goalie covers it, it counts as a goal. Competing hard right to the edge of the crease is how goals are scored.",tip:"Puck on the goal line? Compete! Try to jam it in before the goalie covers it."},
    {id:"u7q63",cat:"Positioning",pos:["F","D"],concept:"Support the puck carrier",d:3,sit:"Your teammate has the puck and they're trying to skate with it but defenders are around them. You're 10 feet away and completely open. What do you do?",opts:["Stand still — you don't have the puck","Skate to a spot slightly behind and to the side of your teammate — support them with your positioning and be the easy pass option","Skate toward them and make the space even tighter","Go to the other end of the ice"],ok:1,why:"Supporting the puck carrier by positioning yourself behind and to the side gives them an easy outlet if they get pressured. You don't need the puck to help your teammate.",tip:"Teammate with the puck? Position yourself behind them to the side. Be the easy option."},
    {id:"u7q64",cat:"Coachability",pos:["F","D"],concept:"Ask the right way",d:3,sit:"You disagree with something your coach told you to do. You think your way is better. What's the best way to handle it?",opts:["Do it your own way during the game and tell the coach later","Argue with the coach right now in front of everyone","Try the coach's way during the game, then ask questions respectfully afterward","Refuse to do it and sit on the bench"],ok:1,why:"Coaches make decisions based on more information than you see. Trying their way first — then asking questions respectfully — is how good players and good people handle disagreement.",tip:"Disagree with your coach? Try their way first. Ask questions respectfully after. That's how you build trust."},
    {id:"u7q65",cat:"Game Awareness",pos:["F","D"],concept:"What's a power play?",d:3,sit:"The other team takes a penalty. Your team is now on the power play — you have more players on the ice than the other team. What does this mean your team should do?",opts:["Play exactly the same as usual","Use the extra player advantage — move the puck to find the player who's open because the other team is short","Play more cautiously since you could give up a shorthanded goal","Change players every 5 seconds"],ok:1,why:"A power play means the other team has fewer players — so someone on your team is always open. Moving the puck to find that open player is how power plays create scoring chances.",tip:"On the power play? You have the extra man. Move the puck to find them."},
    {id:"u7q66",cat:"Scoring",pos:["F","D"],concept:"Puck to the net",d:3,sit:"You have the puck in the offensive zone. You're not sure if you should shoot or pass. What's the most important thing to think about?",opts:["Which option looks coolest","Which option is most likely to get the puck on net — either a shot or a pass to a teammate with a better shot","What your parents are thinking","How many people are watching"],ok:1,why:"The best decision in the offensive zone is the one most likely to put the puck on the net. Sometimes that's shooting, sometimes that's passing to a teammate with a better look. Always think about getting the puck on net.",tip:"Shoot or pass? Pick whichever one is most likely to get the puck on net."},
    {id:"u7q67",cat:"Defense",pos:["F","D"],concept:"Get back fast",d:3,sit:"Your team just took a shot and the goalie saved it. All five of your players are in the offensive zone. The other team gets the puck and starts skating the other way fast. What's the most important thing for your forwards to do?",opts:["Stay in the offensive zone — the puck might come back","Turn around and get back as fast as possible — a team caught all up the ice is in trouble","Keep attacking the goalie","Skate slowly back and watch"],ok:1,why:"When the puck turns over and the other team has speed, getting back fast is the most important thing forwards can do. A team caught all in the offensive zone is wide open for a fast counter-attack.",tip:"Puck turned over and they have speed? Everyone turn around and go back. Fast."},
    {id:"u7q68",cat:"Compete",pos:["F","D"],concept:"Skating hard every shift",d:3,sit:"You've been playing hard and you're tired. You have one more shift before practice ends. What's the right mindset?",opts:["Coast — you're tired and nobody will notice","Skate as hard as you did on your very first shift — your last shift should look like your first","Give up on compete plays — save energy for the next practice","Skate slower and try to hide it"],ok:1,why:"Your last shift of practice should look like your first. Players who compete hard even when tired build real toughness — and coaches notice every shift, especially the last ones.",tip:"Tired on your last shift? Go just as hard as your first. That's the standard."},
    {id:"u7q69",cat:"Coachability",pos:["F","D"],concept:"Warm up right",d:3,sit:"You arrive at the rink early for practice and your coach wants everyone to do a proper warm-up. You feel fine and want to just start skating hard. What should you do?",opts:["Skip the warm-up — you're already ready","Do the warm-up with the team — your coach knows why it matters even if you feel fine","Do half the warm-up and then go skate fast","Warm up only if you feel stiff"],ok:1,why:"Warm-ups protect your body even when you feel fine. Coaches build warm-ups because they help prevent injuries and prepare your muscles for the work ahead. Following the team routine is part of being coachable.",tip:"Want to skip the warm-up? Do it anyway. Your coach included it for a reason."},
    {id:"u7q70",cat:"Teamwork",pos:["F","D"],concept:"Compliment a teammate",d:3,sit:"Your teammate makes a really good pass that leads to a goal. What do you say to them?",opts:["Nothing — it was just a pass","Nice pass! or Great play! — tell them they did something good","Say you could have done it better","Say nothing and skate away"],ok:1,why:"Complimenting a teammate when they do something well builds team chemistry and encourages them to keep making good plays. Great teams cheer each other on.",tip:"Teammate made a great play? Tell them. Positive teams perform better."},
    {id:"u7q71",cat:"Scoring",pos:["F","D"],concept:"Use both sides of your stick",d:3,sit:"You have the puck on your backhand — the weaker side of your stick. A good shot would be on your forehand. There's a small amount of time to switch. What do you do?",opts:["Shoot with your backhand — you don't have time to switch","Take the split second to switch the puck to your forehand if you safely have time — forehand is more accurate","Throw the stick and use your hands","Pass instead — you can never shoot from the backhand"],ok:1,why:"If you have time, switching to your forehand gives you a more accurate shot. But the backhand is also a real shot — if you don't have time to switch, use the backhand.",tip:"Puck on your backhand? Switch to forehand if you have time. If not, shoot the backhand — it's a real shot too."},
    {id:"u7q72",cat:"Positioning",pos:["F","D"],concept:"Stay in your lane",d:3,sit:"There's a 2-on-1 rush and you're the second attacker — you don't have the puck. The defender is moving toward the puck carrier. You're on the right side. Where do you stay?",opts:["Skate toward the puck carrier to get the puck","Stay on the right side — keep the lane open so the pass can get to you","Skate toward the net regardless of where the defender is","Slow down and let the puck carrier handle it"],ok:1,why:"On a 2-on-1, the second attacker needs to hold their lane. If you drift to the middle, the pass lane closes. Stay on your side and be ready when the puck comes.",tip:"2-on-1 without the puck? Hold your lane. Don't drift. Stay ready for the pass."},
    {id:"u7q73",cat:"Defense",pos:["F","D"],concept:"Stay between puck and net",d:3,sit:"An attacker has the puck and they're trying to skate around you to get to the net. What's the most important thing you keep between you and the net?",opts:["Your stick","Your body — stay between the attacker and your net at all times","Your skates","Your helmet"],ok:1,why:"The golden rule of defense is to keep your body between the attacker and your net. If you do that, they have to go through you — and that's where you have the advantage.",tip:"Defending 1-on-1? Keep your body between the attacker and your net. Always."},
    {id:"u7q74",cat:"Game Awareness",pos:["F","D"],concept:"Read the ref",d:3,sit:"The referee raises their arm during play but hasn't blown the whistle yet. What does this mean?",opts:["Nothing — they're just stretching","A penalty is about to be called. Play continues for now, but when the puck goes dead, the penalty will be announced.","The game is over","Your team scored"],ok:1,why:"A referee with their arm raised is signaling a delayed penalty. Play continues until the team being penalized touches the puck — then the whistle blows. This is actually good for your team because you can pull your goalie for an extra attacker.",tip:"Ref's arm is up? Delayed penalty. Keep playing — the whistle comes when they touch the puck."},
    {id:"u7q75",cat:"Compete",pos:["F","D"],concept:"Battle in practice",d:3,sit:"In a practice drill, you're paired with your best friend and they're trying to win the puck from you. Should you compete hard against them?",opts:["No — they're your friend, be nice","Yes — competing hard in practice with everyone, including friends, makes both of you better","Only if they compete hard first","No — practice is just for fun"],ok:1,why:"Practicing compete — even against friends — is how you both get better. Real practice competition prepares you for real games. Your friend can handle your compete, and you can handle theirs.",tip:"Competing against a friend in practice? Go hard. You both get better."},
    {id:"u7q76",cat:"Coachability",pos:["F","D"],concept:"Try it a new way",d:3,sit:"You've always held your stick one way. Your coach tells you there's a better way that will help you skate faster with the puck. It feels weird at first. What do you do?",opts:["Keep doing it the old way — it feels right","Try the new way, even though it feels weird. New things feel weird at first — that's part of learning.","Do half new way, half old way","Ask your parents if the coach is right first"],ok:1,why:"Almost every skill improvement feels awkward at first. The feeling of 'weird' is your brain and body adjusting to something new. Sticking with the new way through the awkward phase is how you improve.",tip:"New way feels weird? Keep trying it. Weird is what improvement feels like at first."},
    {id:"u7q77",cat:"Teamwork",pos:["F","D"],concept:"Encourage on the bench",d:3,sit:"A teammate comes off the ice after making a mistake and they look down. Nobody has said anything to them. What do you do?",opts:["Say nothing — they know they made a mistake","Say something encouraging — 'You've got it next time' or 'good effort'","Tell them what they did wrong","Ignore them"],ok:1,why:"A teammate who feels supported after a mistake is more likely to bounce back quickly and play well. One encouraging word from a teammate can make a real difference.",tip:"Teammate came off after a mistake? Encourage them. That's what good teammates do."},
    {id:"u7q78",cat:"Scoring",pos:["F","D"],concept:"Shoot on the move",d:3,sit:"You're skating with the puck toward the net at full speed. A defender is chasing you from behind. Should you slow down to take a better shot?",opts:["Yes — slow down and aim carefully","No — shoot while moving at full speed. A moving shooter is harder for the goalie to track.","Stop completely first","Pass to a teammate instead"],ok:1,why:"Shooting while moving at full speed is harder for a goalie to track than a stationary shot. Slowing down also lets the defender catch up. Shoot while moving.",tip:"Full speed toward the net? Shoot while moving. Don't slow down."},
    {id:"u7q79",cat:"Defense",pos:["F","D"],concept:"Watch out for the back door",d:3,sit:"The other team has the puck in the corner. You're covering a player at the far post of your net — far away from the puck. They're just standing there. Do you stop covering them?",opts:["Yes — they don't have the puck and they're far from it","No — a player standing at the far post is waiting for a back-door pass. That's actually one of the most dangerous plays.","Yes — move toward the puck instead","Yes — stand beside the goalie instead"],ok:1,why:"A player standing at the back post in the offensive zone is set up for a back-door pass — one of the hardest plays for a goalie to stop. Leaving them means giving up a dangerous scoring chance.",tip:"Player hanging at the far post? Keep covering them. They're waiting for the back-door pass."},
    {id:"u7q80",cat:"Game Awareness",pos:["F","D"],concept:"Pull the goalie",d:3,sit:"Your team is losing by one goal with one minute left. Suddenly your coach pulls your goalie off the ice and puts a sixth skater on. Why would they do that?",opts:["Your goalie made a mistake","Your goalie is tired","Having an extra skater gives your team a better chance to score and tie the game — even though your net is empty","Your goalie needs a rest"],ok:1,why:"Pulling the goalie for an extra attacker is a calculated risk. Your net is empty, but the extra skater gives your team more firepower to try to tie the game. It's a real strategy coaches use.",tip:"Coach pulled the goalie? They want the extra attacker to score. Protect the empty net on defense and attack hard on offense."},
    {id:"u7q81",cat:"Teamwork",pos:["F","D"],concept:"Hold the door",d:3,sit:"You're the first player coming off the ice for a line change. Your teammate is about to jump on. What should you make sure of before you leave the bench door area?",opts:["Nothing — just get off as fast as possible","Make sure your teammate is clearly coming on and is at the boards before you fully leave. The exchange has to be clean.","Run off the ice as fast as possible regardless","Wait until you're fully off before your teammate moves"],ok:1,why:"A clean line change means the incoming player is ready before the outgoing player leaves. A messy change can result in too many men on the ice. Coordinating the exchange is both players' responsibility.",tip:"Line change: make sure the exchange is clean. Incoming player ready, then you leave. No gaps, no overlaps."},
    {id:"u7q82",cat:"Scoring",pos:["F","D"],concept:"Hard shot vs. accurate shot",d:3,sit:"You're shooting the puck at the net. Should you always try to shoot as hard as you possibly can?",opts:["Yes — hardest shot always wins","Not always — an accurate shot that goes where the goalie isn't is better than a hard shot right at them","Yes — goalies can't stop a hard enough shot","Hard shots are rude — shoot softly"],ok:1,why:"Accuracy beats power when it comes to shooting. A perfect hard shot right at the goalie is an easy save. A well-placed shot — even if it's softer — that goes where the goalie isn't is more likely to score.",tip:"Hard shot vs. accurate shot? Pick the corner first. Power helps, but location wins."},
    {id:"u7q83",cat:"Defense",pos:["F","D"],concept:"Help your goalie",d:3,sit:"A shot is coming from far away and your goalie will probably make the save. But an opposing player is sneaking toward the front of your net. What should you do?",opts:["Watch the shot — it's more exciting","Go cover the player sneaking toward the front of your net — your goalie can handle the shot","Cheer for your goalie","Skate toward the shooter"],ok:1,why:"Your goalie can handle the shot from far away. Your job is to clear the player moving to the front of the net before they can get the rebound. Dividing the responsibility is how defense works.",tip:"Shot from far away and a player sneaking to the net? Go cover the sneaker. Your goalie has the shot."},
    {id:"u7q84",cat:"Compete",pos:["F","D"],concept:"Battle through a check",d:3,sit:"An opponent bumps you hard along the boards. You didn't fall but it knocked you sideways. What do you do?",opts:["Stop skating and wait for a penalty call","Regain your balance and keep playing — getting bumped is part of hockey","Fall down to get a penalty","Bump them back immediately"],ok:1,why:"Getting physically bumped along the boards is part of hockey. Regaining your balance quickly and continuing to play is what compete looks like. Stopping every time you get touched makes you easy to stop.",tip:"Got bumped? Regain your balance fast and keep playing. That's compete."},
    {id:"u7q85",cat:"Game Awareness",pos:["F","D"],concept:"Puck drops",d:3,sit:"You're at a faceoff. The referee is about to drop the puck. What are you thinking about right before it drops?",opts:["Nothing special — just react","Your assignment: what you're doing if your center wins it, and what you're doing if they lose it. Be ready before the puck drops.","Whether you're hungry","What happened earlier in the game"],ok:1,why:"A faceoff is a set play. Knowing your assignment before the puck drops — win or lose — means you're already moving in the right direction when play starts.",tip:"Before the faceoff: know your assignment. Win or lose — be ready to go."},
    {id:"u7q86",cat:"Positioning",pos:["F","D"],concept:"Read the play",d:3,sit:"You're watching the play develop. You can see a pass is about to be made by the other team across the ice. You're in a spot where you could skate to intercept it. What do you do?",opts:["Wait to see where the puck goes first","Start skating to intercept it now — before the pass is made — so you're there when it arrives","Stay where you are","Skate toward the player who is about to receive it"],ok:1,why:"Reading a pass before it's made — and moving early — is how you intercept pucks. Moving after the pass is made means you're always too late.",tip:"See a pass about to happen? Start moving to intercept now — before the pass is made."},
    {id:"u7q87",cat:"Teamwork",pos:["F","D"],concept:"Talk to your linemates",d:3,sit:"Your two linemates are on the bench beside you. You're about to go on for your next shift. What's a good thing to say to them?",opts:["Nothing — just go","Something short about what you're trying to do: 'let's get pucks deep' or 'let's play hard in the corners' — even a quick plan helps","Tell them what they did wrong last shift","Say you're nervous"],ok:1,why:"A quick word with your linemates before a shift helps everyone get on the same page. Even one sentence about what you're going to do builds communication and team chemistry.",tip:"About to go on for a shift? Say something to your linemates. Even one word. Communicate."},
    {id:"u7q88",cat:"Scoring",pos:["F","D"],concept:"One-timer",d:3,sit:"A pass is coming to you and the goalie is not ready for a quick shot. If you stop the puck and aim, the goalie will have time to set. What should you try instead?",opts:["Always stop the puck and aim","One-time it — shoot it right when it arrives. A quick one-touch shot catches the goalie off guard.","Pass it to someone else — never shoot without stopping","Wait for a better time"],ok:1,why:"A one-timer — shooting the puck on the first touch without stopping it — can catch a goalie before they're set. Even at a young age, learning to take the puck in stride is a skill worth practicing.",tip:"Pass coming and goalie not ready? One-time it. Quick release before they can set."},
    {id:"u7q89",cat:"Defense",pos:["F","D"],concept:"Puck along the boards in D zone",d:3,sit:"The puck is sliding along the boards in your defensive zone. An opponent is racing to it. You're slightly closer. What's the most important thing you do when you get there?",opts:["Touch the puck and skate away fast","Get your body between the puck and the opponent — win the inside position before you touch the puck","Kick the puck out of the zone","Call for your goalie"],ok:1,why:"Inside position on a loose puck along the boards is what wins the battle. Getting your body between the opponent and the puck — before you touch it — means you control the puck.",tip:"Racing to the puck along the boards in your own zone? Get inside position first. Body between the opponent and the puck."},
    {id:"u7q90",cat:"Compete",pos:["F","D"],concept:"Pre-game warmup compete",d:3,sit:"During warmups before the game, your team is doing skating drills. Some players are coasting. What do you do?",opts:["Coast too — it's just warmups","Go hard. How you warm up sets the tone for how you play.","Warmup halfway then watch the other team","Only go hard on the last drill"],ok:1,why:"Warming up hard prepares your body, sharpens your mind, and signals to your teammates that you're ready to compete. Players who coast in warmups often coast in the game.",tip:"Warmup drills? Go hard. Your first rep sets the tone for everything after."},
    {id:"u7q91",cat:"Coachability",pos:["F","D"],concept:"Film and feedback",d:3,sit:"Your coach shows the team a video of your last game and points out something you did wrong in front of everyone. How should you react?",opts:["Feel embarrassed and give up","Argue that the coach is wrong","Listen carefully — coaches show video to help the whole team learn, not to embarrass anyone","Pretend you weren't watching"],ok:1,why:"Video feedback is a coaching tool used at every level of hockey. Being pointed out in video is a chance to learn — the coach is trusting you to handle it and improve. That trust is earned by the players who respond well.",tip:"Coach showed video of your mistake? Listen and learn. Video feedback is how pros get better too."},
    {id:"u7q92",cat:"Game Awareness",pos:["F","D"],concept:"Offsides on a rush",d:3,sit:"Your team is on a 2-on-1 rush and you're slightly ahead of your teammate who has the puck. You cross the blue line before the puck. What happens?",opts:["Nothing — you were just faster","Offsides — your team loses the scoring chance","You get a penalty","The other team has to skate to center ice"],ok:1,why:"Even on a rush, the puck has to enter the offensive zone before or at the same time as the players. Going in ahead of the puck — even on a rush — is offsides.",tip:"On a rush? Stay even with the puck carrier until the puck is across the blue line. Don't jump offsides."},
    {id:"u7q93",cat:"Teamwork",pos:["F","D"],concept:"Set up your teammate",d:3,sit:"You're skating toward the net with the puck. A defender is focusing only on you. Your teammate is completely open on the other side of the net. What do you do?",opts:["Shoot anyway — you want to score","Pass to your open teammate — a player who sets up a teammate for a goal is just as important as the scorer","Try to do a trick move","Skate away from the net"],ok:1,why:"Setting up a teammate who's open for a goal is one of the most important plays in hockey. A pass to an open teammate is often the highest-percentage play — and assists matter as much as goals.",tip:"Open teammate? Pass. Setting up a goal is just as important as scoring one."},
    {id:"u7q94",cat:"Compete",pos:["F","D"],concept:"First to every puck",d:3,sit:"Every time a puck is loose, you and your opponents are racing to it. What habit should you build for every loose puck in every game?",opts:["Wait to see if it comes to you","Race to be first — make it a habit to win every loose puck race. First wins.","Only race if you think you'll win","Wait for the other team to get it then try to take it"],ok:1,why:"Making it a habit to race to every loose puck — not just the ones you think you'll win — is what separates compete players from passive ones. Even if you don't always win the race, the habit itself makes you better.",tip:"Loose puck anywhere on the ice? Race to it. Make it a habit. Every single time."},
    {id:"u7q95",cat:"Defense",pos:["F","D"],concept:"Contain not commit",d:3,sit:"An attacker is coming at you 1-on-1 and they're trying to deke you. They dangle the puck to the left. You start to reach for it. What should you do instead?",opts:["Reach and try to poke the puck","Stop your feet and reset — don't fully commit to the reach","Fall down and block","Skate backward as fast as possible"],ok:1,why:"Reaching for a puck during a deke is how you get beaten. A skilled attacker uses the deke to bait you into committing. Stopping your feet and resetting keeps you in front of them.",tip:"Attacker trying to deke you? Don't reach. Stop your feet and reset. Don't commit."},
    {id:"u7q96",cat:"Coachability",pos:["F","D"],concept:"Take notes in your brain",d:3,sit:"Your coach explains something technical — like how to angle your feet on a crossover turn — and then moves on quickly. You only understood half of it. What do you do?",opts:["Pretend you understood and hope for the best","Try to use what you understood, then ask the coach after to clarify the rest","Ask them to repeat it five times during the drill","Ignore it and do what you normally do"],ok:1,why:"Getting partial information and trying to apply it — then asking for clarification afterward — is mature and effective learning. Coaches appreciate players who try first, then ask.",tip:"Understood half the instruction? Try what you got, then ask to clarify the rest after. Coaches respect that."},
    {id:"u7q97",cat:"Game Awareness",pos:["F","D"],concept:"What is icing?",d:3,sit:"A defender shoots the puck from their own end all the way down the ice and it crosses the goal line without anyone touching it. What is this called and what happens?",opts:["A goal — it crossed the goal line","Icing — play stops and a faceoff comes back to the defending team's end","A penalty shot for the other team","Nothing — play continues"],ok:1,why:"Icing is when the puck is shot from behind the center line all the way down the ice across the opposing goal line without being touched. Play stops, and the faceoff comes back to the team that iced the puck.",tip:"Shot from your own end all the way down? That's icing. Play stops. Know the rule."},
    {id:"u7q98",cat:"Teamwork",pos:["F","D"],concept:"Share the puck",d:3,sit:"You have the puck and you've already made three great passes to teammates who scored. Now you have the puck again and a good shot. Your teammates are yelling for you to pass. Should you always pass just because they're calling?",opts:["Yes — always pass when someone calls for it","No — if you have a great scoring opportunity and a teammate in a worse spot is calling, shoot. Read the situation, don't just react to noise.","Yes — passing is always better than shooting","No — never pass"],ok:1,why:"Hockey requires reading the situation. Passing is often the right play, but sometimes — especially when you have the best chance — shooting is smarter. Develop the judgment to know which is right.",tip:"Teammate calling for a pass? Read the situation. Sometimes shoot, sometimes pass. Use your judgment."},
    {id:"u7q99",cat:"Defense",pos:["F","D"],concept:"Defensive zone faceoff position",d:3,sit:"There's a faceoff in your defensive zone right beside your net. The referee is about to drop the puck. Where should all the players except the centers be?",opts:["Wherever they like","In their assigned positions — covering specific areas and players based on what the coach set up. Be there before the puck drops.","In a big group near the puck","At center ice"],ok:1,why:"Defensive zone faceoffs are critical moments. Every player except the centers should be in their assigned position before the puck drops — covering a player or an area. The setup before the drop is part of the play.",tip:"Defensive zone faceoff? Get to your position before the puck drops. Every player has a job."},
    {id:"u7q100",cat:"Compete",pos:["F","D"],concept:"Finish every play",d:3,sit:"You're racing to a puck in the corner and you know the opponent will probably get there first. You're tired. Do you keep going?",opts:["No — if they'll get there first, there's no point","Yes — keep going at full speed. Maybe they make a mistake, maybe you get there, maybe your effort helps a teammate. Never quit.","Only go if you're sure you'll win the race","Stop and call for a different play"],ok:1,why:"Going hard to every puck — even ones you might not get — is what elite compete looks like. You never know when the opponent will bobble it, or when your effort puts pressure on them that leads to a mistake.",tip:"Won't get there first? Go anyway. Full speed. You never know what happens, and your effort always matters."},
  ,
    {id:"u7g1",cat:"Goalie",concept:"Your net",d:1,pos:["G"],sit:"You're the goalie. The other team has the puck and is skating toward your net. Where should you be standing?",opts:["In the corner of the net","Right in the middle of the net, between the two posts","Skating out to meet them","Sitting on the ice"],ok:1,why:"The goalie's job is to protect the net. Standing in the middle between the two posts gives you the best chance to stop the puck no matter which side it comes from.",tip:"Always come back to the middle. That's your home."},
    {id:"u7g2",cat:"Goalie",concept:"Stay on your feet",d:1,pos:["G"],sit:"A player is skating toward you with the puck. You're nervous and want to fall down to block the shot. What should you do instead?",opts:["Fall down right away","Stay on your feet as long as possible — you can see the puck better standing up","Skate out to the blue line","Turn around and face the net"],ok:1,why:"Staying on your feet keeps you in the game. The moment you fall down, you lose the ability to move left or right. Stay up and track the puck.",tip:"Stay up as long as you can. Watch the puck. Drop when you have to."},
    {id:"u7g3",cat:"Goalie",concept:"Watch the puck",d:1,pos:["G"],sit:"A lot of players are moving around in front of your net. It's hard to see. What's the most important thing you focus on?",opts:["Watch the players","Watch the puck — always know where it is","Look at your teammates","Close your eyes and guess"],ok:1,why:"The puck is what scores goals. No matter what else is happening, the goalie always tracks the puck. Players move — but the puck tells you where the danger is.",tip:"Eyes on the puck. Always. That's the number one goalie rule."},
    {id:"u7g4",cat:"Goalie",concept:"Rebounds",d:1,pos:["G"],sit:"You stop a shot but the puck bounces out in front of your net. What should you do?",opts:["Stand still and wait","Try to cover the puck or push it to the corner so your team can get it","Skate out and try to pass it","Go to the bench"],ok:1,why:"A rebound right in front of your net is dangerous — the other team can shoot again immediately. Try to cover it with your glove or paddle it to the corner where your team can get it.",tip:"Stop it once, then smother it or push it away. Don't let the rebound sit in front."},
    {id:"u7g5",cat:"Goalie",concept:"Calling for help",d:1,pos:["G"],sit:"The puck is loose behind your net and you can't see it. A teammate is right there. What do you do?",opts:["Stay quiet and hope they figure it out","Yell to your teammate to let them know where the puck is and that you need help","Skate out to get the puck yourself","Leave the net empty"],ok:1,why:"Goalies can see things from their angle that teammates can't — and teammates can see things goalies can't. Communicating out loud helps your whole team.",tip:"Talk out there! Goalies who communicate help their whole team."},
    {id:"u7g6",cat:"Goalie",concept:"Crease awareness",d:1,pos:["G"],sit:"A player from the other team is standing right in front of your net blocking your view. What do you do?",opts:["Ignore them","Try to see around them — move side to side a little to get a better view of the puck","Skate into them","Sit down"],ok:1,why:"Goalies can move slightly side to side to peek around a screener. Your teammates should also be pushing that player out, but you can help yourself by moving to find the puck.",tip:"Screener in front? Move to find the puck. Don't just stand still."},
    {id:"u7g7",cat:"Goalie",concept:"Short side",d:2,pos:["G"],sit:"A player is coming at you from the right side of the net. They have a very bad angle — almost behind the net. What do you do?",opts:["Leave the net and chase them","Move toward them and take away the near post — give them the long side shot which is much harder to score on","Stay in the exact middle of the net","Fall down immediately"],ok:1,why:"When a player has a bad angle, the goalie moves toward them to take away the short side — the close post. This forces them to shoot across the whole crease which is much harder.",tip:"Bad angle? Take away the short side. Hug the near post."},
    {id:"u7g8",cat:"Goalie",concept:"Getting up fast",d:2,pos:["G"],sit:"You went down to make a save and the puck is still loose. What's the most important thing to do now?",opts:["Stay on the ice and rest","Get back up to your feet as fast as you can so you're ready for the next shot","Wait for the whistle","Slide to the corner"],ok:1,why:"Getting up quickly after going down is one of the most important goalie skills. The puck can come back any second — you need to be back on your feet and in position.",tip:"Down? Get up fast. Every second on the ice is a second you can't make a save."},
    {id:"u7g9",cat:"Goalie",concept:"Freeze or play?",d:2,pos:["G"],sit:"You make a save and have your glove on the puck. Your team is tired and needs a rest. What can you do?",opts:["Throw the puck back into play","Cover it completely with your glove — the referee will blow the whistle and your team gets a rest","Kick it to your defenseman","Stand up and skate with it"],ok:1,why:"When a goalie covers the puck completely, the referee stops play. This lets both teams rest and reset — very useful when your team is tired or under heavy pressure.",tip:"Need a rest? Cover the puck completely. The whistle will come."},
    {id:"u7g10",cat:"Goalie",concept:"Talking to your D",d:3,pos:["G"],sit:"Your defenseman is behind the net and can't see where the other team's players are. You can see everything from your angle. What should you do?",opts:["Say nothing — it's their job to figure it out","Tell them where the pressure is coming from: 'Left side!' or 'Man coming right!'","Skate out to help","Go back to your crease and ignore it"],ok:1,why:"The goalie has the best view of the whole ice. Telling your defenseman where pressure is coming from is one of the most valuable things a goalie can do — it helps your whole team.",tip:"You see it all from back there. Talk to your D. They need your eyes."},

    // === SEQUENCE ORDERING QUESTIONS ===
    {id:"u7seq1",cat:"Game Awareness",pos:["F","D"],concept:"Getting ready to play",d:1,type:"seq",sit:"Put these steps in the right order for getting ready when your shift starts.",items:["Listen for your coach to call your line","Hop over the boards onto the ice","Skate to your position","Watch the puck and get ready to play"],correct_order:[0,1,2,3],why:"A good shift starts before you even get on the ice. Listen, hop on, get to your spot, and then focus on the puck. Doing it in order means you're ready right away.",tip:"Good shift: listen, hop on, get to your spot, watch the puck."},
    {id:"u7seq2",cat:"Scoring",pos:["F","D"],concept:"Scoring a goal steps",d:1,type:"seq",sit:"You want to score a goal. Put these steps in the right order.",items:["Get the puck","Skate toward the net","Pick a spot to aim at","Shoot the puck at the net"],correct_order:[0,1,2,3],why:"Scoring starts with getting the puck, then moving toward the net, picking your target, and shooting. Skipping steps — like shooting from far away without aiming — makes it harder.",tip:"Get it, skate close, pick your spot, shoot. That's how goals happen."},
    {id:"u7seq3",cat:"Defense",pos:["F","D"],concept:"What to do when they score",d:1,type:"seq",sit:"The other team just scored a goal. Put what happens next in the right order.",items:["Skate back to center ice for the faceoff","Line up in your position","Get ready for the puck to drop","Play hard on the next shift — one goal doesn't matter"],correct_order:[0,1,2,3],why:"After a goal against, you reset. Go to center, line up, get ready, and compete. Getting upset wastes time — the next shift is what matters.",tip:"They scored? Reset. Line up. Next shift. That's how tough players respond."},
    {id:"u7seq4",cat:"Teamwork",pos:["F","D"],concept:"Making a good pass",d:1,type:"seq",sit:"You want to pass the puck to your teammate. Put these steps in order.",items:["Look up and find your teammate","Make sure they're open and ready","Put the puck on their stick — aim your pass","Call out to let them know it's coming"],correct_order:[0,3,1,2],why:"A great pass starts with looking up, letting your teammate know, making sure they're ready, and then putting it right on their stick. Calling out first helps them get ready.",tip:"Look, call, check they're ready, pass it on their stick. That's teamwork."},
    {id:"u7seq5",cat:"Compete",pos:["F","D"],concept:"Chasing a loose puck",d:1,type:"seq",sit:"The puck is loose in the corner. Put these steps in order.",items:["See the loose puck","Skate hard toward it — don't wait","Get your stick on the puck first","Look up and make a play with it"],correct_order:[0,1,2,3],why:"Loose pucks go to whoever gets there first. See it, go hard, get it, then look up. Standing and watching lets the other team grab it.",tip:"See it, go get it, win it, use it. Every loose puck."},
    {id:"u7seq6",cat:"Positioning",pos:["F","D"],concept:"After the whistle routine",d:1,type:"seq",sit:"The referee just blew the whistle. Put what you should do in order.",items:["Stop playing — the whistle means stop","Look at the referee","Listen to where the faceoff will be","Skate to your position for the faceoff"],correct_order:[0,1,2,3],why:"When the whistle blows, everything resets. Stop, look at the ref, listen, then get to your spot. Players who keep playing after the whistle get penalties.",tip:"Whistle: stop, look, listen, get to your spot. Every time."},
    {id:"u7seq7",cat:"Coachability",pos:["F","D"],concept:"Learning a new drill",d:1,type:"seq",sit:"Your coach is teaching a new drill. Put these steps in order.",items:["Stop skating and look at the coach","Listen to the instructions carefully","Watch if the coach demonstrates it","Try the drill and do your best"],correct_order:[0,1,2,3],why:"Learning works best when you stop and focus first. Listen to the words, watch the demo, then try it. Players who skip the listening part make more mistakes.",tip:"Stop, listen, watch, try. That's how you learn new things fast."},
    {id:"u7seq8",cat:"Game Awareness",pos:["F","D"],concept:"Starting a shift",d:2,type:"seq",sit:"Your coach says your line is up next. Put these steps in order.",items:["Get to the door of the bench","Watch the play so you know what's happening","Jump on when your teammate comes off","Skate hard to where you need to be"],correct_order:[0,1,2,3],why:"A quick, smart line change starts before you leave the bench. Be ready at the door, watch what's happening, jump on at the right time, and get into the play fast.",tip:"Be at the door, watch the play, jump on, skate hard. Good changes start on the bench."},

    // === SPOT THE MISTAKE QUESTIONS ===
    {id:"u7mis1",cat:"Positioning",pos:["F","D"],concept:"Everyone in one spot",d:1,type:"mistake",sit:"All five players on your team are chasing the puck in the same corner. The other team's player is standing alone in front of your net. What's the mistake?",opts:["Your team is skating too slow","Everyone is in the same spot — some players should be spread out, especially someone covering the front of the net","Your goalie should come out more","The coach should call a timeout"],ok:1,why:"When everyone bunches up, the rest of the ice is wide open. Spreading out means your team covers more ice and doesn't leave players wide open near the net.",tip:"All in one corner? Spread out. Cover the ice. Someone needs to be near the net."},
    {id:"u7mis2",cat:"Defense",pos:["F","D"],concept:"Watching instead of skating back",d:1,type:"mistake",sit:"The other team gets the puck and starts skating toward your net. Your teammate stands at center ice and watches instead of skating back. What's the mistake?",opts:["They should have shot the puck","They're standing still instead of skating back — when the other team has the puck heading to your net, you skate back to help defend","They should go to the bench","They need better skates"],ok:1,why:"Watching the play from center ice doesn't help your team. Skating back puts you in a position to help your goalie and your teammates on defense.",tip:"Other team coming? Don't watch. Skate back. Help your team."},
    {id:"u7mis3",cat:"Scoring",pos:["F","D"],concept:"Shooting from too far",d:1,type:"mistake",sit:"You have the puck near center ice with nobody between you and the net. Instead of skating closer, you shoot from center. The puck barely reaches the goalie. What went wrong?",opts:["The ice was too bumpy","You shot from too far away — skate closer to the net first so your shot is harder and more accurate","Your stick is too small","The goalie was too good"],ok:1,why:"Shots from far away are weak and easy for goalies to stop. Getting closer makes your shot harder and gives you a better angle. Skate in first, then shoot.",tip:"Far from the net? Skate closer first. Close shots score more goals."},
    {id:"u7mis4",cat:"Teamwork",pos:["F","D"],concept:"Never passing",d:1,type:"mistake",sit:"A player on your team gets the puck and skates around by themselves every single time, even when teammates are wide open. They lose the puck a lot. What's the mistake?",opts:["They need to skate faster","They're not passing to open teammates — hockey is a team game and passing to open players creates better scoring chances","They should switch positions","Their stick is wrong"],ok:1,why:"Trying to do everything alone is tough, even for the best players. Passing to open teammates creates chances and keeps the other team guessing.",tip:"Open teammate? Pass. Hockey is a team game. You'll score more together."},
    {id:"u7mis5",cat:"Compete",pos:["F","D"],concept:"Giving up on the play",d:1,type:"mistake",sit:"Your teammate loses a race to the puck and stops skating. They stand still for the rest of the play. What's the mistake?",opts:["They should have been faster","They gave up — even if you lose the race, keep skating. You can still pressure the player or get open for the next play.","They should go to the bench","The other player cheated"],ok:1,why:"Losing one race doesn't mean the play is over. Keep going — you might force a mistake, get in a passing lane, or be ready for the next chance.",tip:"Lost the race? Keep going anyway. The play isn't over."},
    {id:"u7mis6",cat:"Game Awareness",pos:["F","D"],concept:"Playing after the whistle",d:1,type:"mistake",sit:"The referee blows the whistle to stop play. One player keeps skating and pushes an opponent. The ref gives them a penalty. What was the mistake?",opts:["The ref was wrong","They kept playing after the whistle — when the whistle blows, you stop. Pushing someone after the whistle is a penalty.","The opponent started it","They were just finishing their check"],ok:1,why:"The whistle means stop. Anything you do after the whistle — especially pushing or hitting — can be a penalty. Control yourself the moment you hear it.",tip:"Whistle blows? Stop. Right away. Don't take a penalty for something after the play."},
    {id:"u7mis7",cat:"Coachability",pos:["F","D"],concept:"Not listening to the coach",d:1,type:"mistake",sit:"Your coach tells the team to line up on the blue line for a drill. Two players keep skating around and shooting pucks instead. What's the mistake?",opts:["The drill sounds boring","They're not listening to the coach — when the coach gives instructions, everyone stops and listens. That's how the whole team gets better together.","They need more practice time","The coach should let them keep shooting"],ok:1,why:"Practice only works when everyone is on the same page. Listening to your coach is how you learn and how you show respect to your teammates and coaches.",tip:"Coach is talking? Stop and listen. That's how teams get better."},
    {id:"u7mis8",cat:"Positioning",pos:["F","D"],concept:"Standing behind your own goalie",d:1,type:"mistake",sit:"During a play, one of your teammates skates behind your own net and just stands there. They're right behind the goalie doing nothing. What's the mistake?",opts:["They're in a good spot","They're hiding behind the goalie instead of being in a useful position — get to open ice where you can help your team","They should talk to the goalie","They need a rest"],ok:1,why:"Standing behind your own goalie doesn't help anyone. Get to open ice where you can receive a pass, help on defense, or support the play.",tip:"Behind your own net doing nothing? Get to open ice. Be useful. Help your team."},

    // === WHAT HAPPENS NEXT QUESTIONS ===
    {id:"u7next1",cat:"Scoring",pos:["F","D"],concept:"Rebound chance",d:1,type:"next",sit:"Your teammate shoots the puck and the goalie stops it, but the puck bounces right out in front of the net. You're standing right there. What happens next?",opts:["You skate away","You wait for someone else to get it","You shoot the puck at the net — it's right there and the goalie is out of position","You pass it back to your teammate"],ok:2,why:"A rebound right in front of the net with the goalie scrambling is one of the best chances to score. Shoot it right away before the goalie can get set again.",tip:"Rebound in front? Shoot it. Fast. Before the goalie gets back."},
    {id:"u7next2",cat:"Defense",pos:["F","D"],concept:"Goalie has the puck",d:1,type:"next",sit:"Your goalie catches the puck and holds onto it. The referee blows the whistle. What happens next?",opts:["You keep playing","Everyone stops and there's a faceoff in your zone — use this time to catch your breath and get to your position","You go to the bench","The game is over"],ok:1,why:"When the goalie freezes the puck, play stops. There will be a faceoff. Use the stoppage to rest for a second and get into your faceoff position.",tip:"Goalie freezes it? Quick rest, then get to your faceoff spot."},
    {id:"u7next3",cat:"Teamwork",pos:["F","D"],concept:"Teammate falls down",d:1,type:"next",sit:"Your teammate is carrying the puck and falls down. The puck slides free. You're the closest player. What happens next?",opts:["You wait for them to get up","You pick up the loose puck and keep the play going — your teammate will get up and join back in","You fall down too","You stop and ask if they're okay"],ok:1,why:"When a teammate falls, the play keeps going. The closest player picks up the puck and continues. Your teammate will get up and rejoin. The game doesn't wait.",tip:"Teammate down? Grab the puck and keep going. They'll catch up."},
    {id:"u7next4",cat:"Game Awareness",pos:["F","D"],concept:"Penalty called",d:2,type:"next",sit:"The referee raises their arm and blows the whistle. They point at a player on the other team and send them to the penalty box. What happens next?",opts:["The game is over","Your team gets a power play — you have more players on the ice than them, so this is a great chance to score","Nothing changes","Both teams lose a player"],ok:1,why:"When the other team gets a penalty, your team has a power play — more players on the ice. This is a big advantage and a great time to try to score.",tip:"Other team gets a penalty? Power play! More players for you. Try to score."},
    {id:"u7next5",cat:"Compete",pos:["F","D"],concept:"Puck goes in the corner",d:1,type:"next",sit:"The puck gets shot into the corner of the rink. Nobody is near it. You and an opponent both see it at the same time. What happens next?",opts:["You both wait to see who goes first","Whoever skates harder gets there first — race to the puck and compete for it","You let them have it","You go to the bench"],ok:1,why:"When a puck is loose and both teams see it, it becomes a race. The player who wants it more and skates harder gets there first. That's compete.",tip:"Both see the puck? Race for it. Skate hard. Want it more."},
    {id:"u7next6",cat:"Positioning",pos:["F","D"],concept:"After a goal",d:1,type:"next",sit:"Your team just scored a goal! Everyone celebrates. What happens next?",opts:["You keep celebrating for the rest of the game","You celebrate quickly with your teammates, then skate back to center ice and line up for the next faceoff","You go straight to the bench","You do a long dance"],ok:1,why:"Celebrating is great — but keep it quick. After a goal, you need to get back to center ice and line up for the faceoff. The game keeps going.",tip:"Score a goal? Celebrate quick, then line up at center. The game isn't over."},
    {id:"u7next7",cat:"Coachability",pos:["F","D"],concept:"Coach calls your line",d:1,type:"next",sit:"You're on the bench and your coach says 'Next line, get ready!' You're on the next line. What happens next?",opts:["You keep sitting and wait","You stand up, get to the door, and get ready to jump on the ice as soon as your teammates come off","You start stretching","You ask which line you're on"],ok:1,why:"When the coach calls your line, you need to be ready immediately. Stand up, get to the door, watch the play, and hop on when it's time. Being ready shows you're a good teammate.",tip:"Your line is up? Get to the door. Be ready. Don't make your team wait."},

    // === TRUE/FALSE QUESTIONS ===
    {id:"u7tf1",cat:"Compete",pos:["F","D"],concept:"Try your hardest",d:1,type:"tf",sit:"It's okay to stop trying if the other team is winning by a lot.",ok:false,why:"You always play hard no matter the score. Games can change fast, and the habits you build when it's tough are the habits that make you better. Never stop competing.",tip:"Down by a lot? Doesn't matter. Keep going. Hard work is always worth it."},
    {id:"u7tf2",cat:"Teamwork",pos:["F","D"],concept:"Celebrate teammates",d:1,type:"tf",sit:"When your teammate scores a goal, you should celebrate with them even if you didn't help on the play.",ok:true,why:"Hockey is a team sport. Celebrating together builds team spirit. Your teammate's goal is your team's goal — every player matters, even when you're not the one who scored.",tip:"Teammate scored? Celebrate with them. That's what teams do."},
    {id:"u7tf3",cat:"Game Awareness",pos:["F","D"],concept:"Whistle means stop",d:1,type:"tf",sit:"When the referee blows the whistle, you should stop playing immediately.",ok:true,why:"The whistle means play is dead. Anything you do after the whistle doesn't count and could get you a penalty. Stop right away, every time.",tip:"Whistle = stop. Immediately. No exceptions."},
    {id:"u7tf4",cat:"Scoring",pos:["F","D"],concept:"Only stars shoot",d:1,type:"tf",sit:"Only the best player on the team should shoot the puck.",ok:false,why:"Every player should shoot when they have a chance. The more shots your team takes, the more chances you have to score. You don't have to be the best player to put the puck on net.",tip:"Got a chance to shoot? Shoot. Every player. Every shot counts."},
    {id:"u7tf5",cat:"Defense",pos:["F","D"],concept:"Everyone plays defense",d:1,type:"tf",sit:"Everyone on the team needs to help on defense — not just the defensemen.",ok:true,why:"Defense is everyone's job. Forwards backcheck. Centers cover the middle. When the whole team defends, the other team has a much harder time scoring.",tip:"Defense isn't just for D. Everyone helps. The whole team defends together."},
    {id:"u7tf6",cat:"Positioning",pos:["F","D"],concept:"Follow the puck",d:1,type:"tf",sit:"Every player on the team should always skate directly to wherever the puck is.",ok:false,why:"If everyone goes to the puck, the rest of the ice is empty. Smart players spread out and find open ice. Only one or two players need to be near the puck — everyone else should be open for a pass.",tip:"Not everyone goes to the puck. Spread out. Find open ice. Be ready for a pass."},
    {id:"u7tf7",cat:"Coachability",pos:["F","D"],concept:"Mistakes are okay",d:1,type:"tf",sit:"Making mistakes during practice and games is part of getting better at hockey.",ok:true,why:"Every player makes mistakes — even the pros. Mistakes are how you learn what works and what doesn't. The important thing is to keep trying and learn from them.",tip:"Made a mistake? Good. Now you know. Try again. That's how you get better."},
  ],
  "U9 / Novice":[
    {id:"u9q1",cat:"Decision Making",pos:["F","D"],concept:"Pass or shoot",d:1,sit:"You enter the offensive zone with speed. A defender is square in front of you, but your linemate is wide open on the left wing. What do you do?",opts:["Try to deke around the defender alone","Pass to your open linemate immediately","Dump the puck in and chase","Slow down and wait for help"],ok:1,why:"The defender is committed to you — which means your teammate is open. Defender takes you = give it up.",tip:"Defender takes you + teammate is open = pass. Almost always."},
    {id:"u9q2",cat:"Transitioning",pos:["F","D"],concept:"Defensive transition",d:1,sit:"Your team just turned the puck over in the offensive zone. The other team has it and is skating the other way. You're the nearest forward. What's your first move?",opts:["Stay in the offensive zone in case the puck comes back","Immediately turn and skate back hard","Skate slowly back and watch","Go to the bench"],ok:1,why:"The instant the puck changes hands, your job changes. You go from attacker to backchecker immediately.",tip:"Turnover = turn around. Don't wait. Go now."},
    {id:"u9q3",cat:"Positioning",pos:["F","D"],concept:"Open ice",d:1,sit:"You're in the offensive zone without the puck. Three players including you are all crowded near the puck carrier. What's the smart move?",opts:["Get as close to the puck as possible","Find open ice away from the puck — near the net or at the blue line","Go to the bench","Stand still and call for the puck"],ok:1,why:"Clustering around the puck is one of the most common mistakes at this age. Open ice is where plays are made.",tip:"Where's the open ice? Go there. That's where the play will come."},
    {id:"u9q4",cat:"Teamwork",pos:["F","D"],concept:"Man on call",d:1,sit:"You can see a defender coming at your teammate who has the puck but can't see behind them. What do you do?",opts:["Say nothing and see what happens","Yell 'man on!' so your teammate knows pressure is coming","Skate over to point at the defender","Wait until the check happens"],ok:1,why:"Communication is a decision. 'Man on' gives your teammate a split-second to protect the puck.",tip:"See something your teammate can't? Tell them. Loud and clear. That's hockey."},
    {id:"u9q5",cat:"Shooting",pos:["F"],concept:"Slot shot",d:1,sit:"You catch a pass in the slot, 15 feet from the net. The goalie is leaning slightly right. You have a clear shooting lane to the left. What should you do?",opts:["Pass to a teammate on the perimeter","Shoot quickly to the left where the goalie is out of position","Stickhandle and wait for a better angle","Turn and skate back"],ok:1,why:"When you catch the puck in the slot with a shooting lane and an out-of-position goalie, shoot immediately. Every second you wait, the goalie adjusts.",tip:"Slot + open lane + quick release = shoot. Don't think. Shoot."},
    {id:"u9q6",cat:"Starts",pos:["F","D"],concept:"Faceoff reaction",d:1,sit:"You lose a faceoff in your own zone. The other team's center has the puck. What's your immediate priority?",opts:["Argue with the ref","Go pressure the puck carrier immediately","Skate to the bench","Stand still and watch"],ok:1,why:"Lost faceoffs happen — what matters is the reaction. Going immediately to pressure the puck forces a mistake or delays the play.",tip:"Lost the draw? Go hard immediately. The puck is right there."},
    {id:"u9q7",cat:"Exiting the Zone",pos:["F","D"],concept:"Breakout wall",d:1,sit:"Your defenseman picks up the puck in your own corner. As a winger, where should you be going?",opts:["Stand in the corner with the defenseman","Get up the wall to give the D an outlet option","Skate to center ice immediately","Stay near the net in case of a rebound"],ok:1,why:"Breakout positioning means getting to spots that give your defenseman real options. As a winger, that's typically up the wall.",tip:"D has the puck in the corner? Get up the wall. Give them an out."},
    {id:"u9q8",cat:"Defense",pos:["D"],concept:"Backchecking",d:1,sit:"The other team has the puck and is skating toward your net. You're a forward behind the play. What's your job?",opts:["Stand at center ice and wait","Skate back hard to give your D support","Skate to the other team's end","Yell at your teammates to handle it"],ok:1,why:"When the other team has the puck and is coming your way, your job is to turn around and get back — always.",tip:"Other team going the other way? Turn around and go back hard."},
    {id:"u9q9",cat:"Positioning",pos:["F","D"],concept:"Net front",d:1,sit:"Your team has the puck in the offensive zone. You don't have it and there's no one near you. Where's the smartest place to go?",opts:["Stand at center ice","Get to the front of the net","Skate to the corner where the puck is","Go to the bench"],ok:1,why:"Standing in front of the net without the puck is one of the highest-value things a player can do. It creates a screen, puts you in rebound position, and forces a defender to deal with you.",tip:"No puck? Go to the net. Someone will find you there."},
    {id:"u9q10",cat:"Defense",pos:["D"],concept:"Gap control basics",d:1,sit:"You're a defender and an opposing player is skating toward you with the puck, 20 feet away. What's right?",opts:["Skate straight at them as fast as you can","Back up and maintain a steady gap while angling them toward the boards","Turn around and skate backward immediately to your crease","Stand completely still"],ok:1,why:"Gap control means not giving up too much — but also not closing too fast. Skating straight at a puck carrier lets them pull the puck past you.",tip:"Don't rush a puck carrier. Control your gap. Make them go where you want."},
    {id:"u9q11",cat:"Decision Making",pos:["F","D"],concept:"Simple outlet",d:1,sit:"You have the puck in your own zone. A forechecker is right on you. Your D partner is five feet away and completely open. What do you do?",opts:["Try to skate out yourself","Pass immediately to your open D partner","Shoot the puck down the ice","Wait for a better option"],ok:1,why:"The open D partner five feet away is the easy, correct play. Under pressure the simple play is almost always right.",tip:"Open partner right beside you? Give it to them. Simple."},
    {id:"u9q12",cat:"Shooting",pos:["F"],concept:"Rebounds",d:1,sit:"Your teammate takes a shot from the point. The goalie makes the save but the rebound bounces out to the slot. You're 10 feet away. What do you do?",opts:["Wait to see where the puck goes","Skate hard to the rebound and shoot immediately","Pass to a teammate further away","Back off to give the goalie space"],ok:1,why:"Rebounds are the highest-percentage scoring opportunities in hockey. The player who gets there first and shoots first wins most of those battles.",tip:"Rebound in the slot? Go get it. Shoot first, think later."},
    {id:"u9q13",cat:"Transitioning",pos:["F","D"],concept:"Quick puck after a save",d:1,sit:"Your goalie makes a save and has the puck. The other team has forecheckers coming in. Your winger is breaking back toward the goalie. What should the goalie do?",opts:["Hold the puck and freeze it for a faceoff","Pass to the winger breaking back — beat the forecheck","Shoot it down the ice","Rim it around the boards"],ok:1,why:"A goalie with the puck can start the breakout before the forecheck resets. A crisp pass to the returning winger beats the pressure.",tip:"Goalie has it and a winger is coming back? Start the breakout fast."},
    {id:"u9q14",cat:"Positioning",pos:["F","D"],concept:"Spread out on a rush",d:1,sit:"Your team is attacking 3-on-2. Where should the three forwards position themselves?",opts:["All three skate together in a tight group","Spread out across the ice so the two defenders can't cover everyone","Two go left and one goes right","One attacker goes while two wait at center"],ok:1,why:"Spreading out on a rush forces the defenders to make an impossible choice. A tight group lets two players cover all three.",tip:"Rush attack: spread out. Make the defenders choose."},
    {id:"u9q15",cat:"Teamwork",pos:["F","D"],concept:"Support play",d:1,sit:"Your teammate has the puck in the offensive zone and is pressured from behind. You're five feet away with no defender on you. What do you do?",opts:["Watch to see what they do","Get open and call for the puck — give them an easy outlet","Skate to the corner","Go to the net and wait"],ok:1,why:"When a teammate is pressured, your job is to get open and give them an easy option. The call helps them know you're there.",tip:"Teammate pressured? Get open and let them know. Be the easy option."},
    {id:"u9q16",cat:"Decision Making",pos:["F","D"],concept:"D-to-D reset",d:2,sit:"Your defenseman has the puck behind the net. Both wingers are covered. The other defenseman is open on the far side. What's the best option?",opts:["Force a pass to a covered winger","Walk out from behind the net alone","Pass across to the open defenseman to reset the breakout","Shoot the puck around the boards"],ok:2,why:"When your outlets are covered, the D-to-D pass behind the net resets the play. It switches the point of attack and gives the other side time to get open.",tip:"Outlets covered? Go D-to-D. Reset and rebuild."},
    {id:"u9q17",cat:"Positioning",pos:["F","D"],concept:"Weak side",d:2,sit:"Your team is in the offensive zone. The puck is in the left corner. You're the right winger. Where's your best spot?",opts:["Go into the left corner to help your teammate","Stay on the right side near the net — the weak side","Go to the blue line","Skate to center ice"],ok:1,why:"As the weak-side winger, your job is to stay available on the opposite side. Pucks go cross-ice constantly — you need to be ready.",tip:"Puck in the far corner? Stay on your side near the net. That's where the cross-ice pass goes."},
    {id:"u9q18",cat:"Transitioning",pos:["F","D"],concept:"Neutral zone read",d:2,sit:"Your team just got the puck in your own zone. The other team's forecheckers are still in your end. What do you do with the puck?",opts:["Shoot it down the ice immediately","Skate it out calmly — the forecheckers are out of position and you have time","Wait behind your net for them to regroup","Pass it back to your goalie"],ok:1,why:"When the other team's forecheckers are caught deep in your zone, they're out of position. That's your window to carry the puck out with speed.",tip:"Forecheckers caught deep? Carry it out. You have time."},
    {id:"u9q19",cat:"Decision Making",pos:["F","D"],concept:"Hold vs release",d:2,sit:"You receive a pass at the blue line on the power play. A penalty killer is closing fast. The slot is open. You have one second. What's right?",opts:["Hold the puck and wait for a better option","One-time it or shoot immediately into the open slot","Pass back to the other point","Skate into the zone yourself"],ok:1,why:"One second on the power play point with the slot open is a shooting opportunity — not a thinking opportunity. The PK player closing on you takes that lane away in two seconds.",tip:"Point with an open shot? Release it fast. The lane closes quick."},
    {id:"u9q20",cat:"Decision Making",pos:["F","D"],concept:"When NOT to shoot",d:2,sit:"You're in the offensive zone with the puck. You have a shooting lane but your teammate is streaking to the net completely unmarked. The goalie hasn't seen them yet. What do you do?",opts:["Shoot — you have the lane","Pass to your unmarked teammate cutting to the net","Dump it to the corner","Hold the puck and stickhandle"],ok:1,why:"An unmarked teammate cutting to the net with the goalie unaware is a higher-percentage chance than your open shot. The selfless play is also the smart play.",tip:"Teammate cutting to the net unmarked? Give it up. That's the better chance."},
    {id:"u9q21",cat:"Defense",pos:["D"],concept:"2-on-1 as D",d:2,sit:"You're the lone defender on a 2-on-1 against you. The puck carrier has a teammate to their right. What's the most important thing you do?",opts:["Rush at the puck carrier to take the puck","Take away the pass — stay in the middle, force the shooter, and let the goalie handle the shot","Chase the trailer player","Back up to your crease immediately"],ok:1,why:"On a 2-on-1, the defender's job is to take away the pass. If you rush the puck carrier, the pass kills you. Force the shot — your goalie is ready for that.",tip:"2-on-1 as D: take away the pass. Make them shoot. That's your job."},
    {id:"u9q22",cat:"Positioning",pos:["F","D"],concept:"Third forward safety",d:2,sit:"Your team is forechecking. Two forwards are already deep in the offensive zone. You're the third forward. Where do you set up?",opts:["Go deep into the zone with the other two","Stay at the top of the zone near the blue line as the safety","Go to the bench for a line change","Skate to the half-wall"],ok:1,why:"The third forward on a forecheck is the safety valve. If you all go deep, you leave yourself exposed to a quick breakout and a 3-on-2 against you.",tip:"Two forwards deep on the forecheck? You're the safety. Hold the blue line."},
    {id:"u9q23",cat:"Transitioning",pos:["F","D"],concept:"Quick transition attack",d:2,sit:"Your team just won a puck battle in the corner in your own zone. The other team has four players still deep in your end. You have speed. What's the call?",opts:["Reset and regroup","Go — skate it out fast and attack while they're out of position","Pass to your D and let them decide","Shoot it down the ice"],ok:1,why:"When you win a puck battle and the other team is caught deep, that's a transition opportunity. Going immediately puts them on their heels.",tip:"Other team caught deep? Go now. Transition kills before they reset."},
    {id:"u9q24",cat:"Defense",pos:["D"],concept:"Pressure reads",d:2,sit:"You have the puck behind your own net. A forechecker is coming at you hard. You have a defenseman open to your left. What do you do?",opts:["Try to outskate the forechecker and carry it yourself","Quickly pass to the open defenseman before the forechecker arrives","Stop behind the net and wait","Shoot the puck down the ice"],ok:1,why:"Decision timing is everything. The forechecker closing on you is information — it tells you to move the puck before you get pressured.",tip:"See pressure coming? Move the puck before it gets there."},
    {id:"u9q25",cat:"Shooting",pos:["F"],concept:"Shot location",d:2,sit:"You have the puck near the goal line, way out to the side. The goalie has the near post covered completely. A teammate is at the far post. What do you do?",opts:["Shoot from where you are — any shot is good","Pass across to your teammate at the far post — the goalie can't get there in time","Skate to center and shoot","Dump the puck behind the net"],ok:1,why:"Shooting from the goal line with the near post completely covered gives the goalie an easy save. A far-post pass forces the goalie to move across the entire crease.",tip:"Goalie has your side? Pass across. Make them move all the way."},
    {id:"u9q26",cat:"Teamwork",pos:["F","D"],concept:"Cycling below dots",d:2,sit:"Your team is cycling in the offensive zone below the dots. You're low in the corner with the puck. A defender is on you. Your winger is at the half-wall. What do you do?",opts:["Try to hold the puck alone in the corner","Pass to the half-wall winger and let the cycle continue","Shoot from the corner","Pass all the way back to the point"],ok:1,why:"When you're pressured low in the corner, passing to the half-wall winger moves the puck to a player with more options — they can shoot, pass to the slot, or continue the cycle.",tip:"Pressured in the corner? Pass to the half-wall. They have more options than you do."},
    {id:"u9q27",cat:"Defense",pos:["D"],concept:"Angling",d:2,sit:"An attacker is carrying the puck along the right boards toward your net. You're the defender. What's the goal of your positioning?",opts:["Stop them by skating straight at them","Angle your body to steer them along the boards and away from the middle of the ice","Back up all the way to your crease","Wait for them to shoot and block it"],ok:1,why:"Angling means steering the puck carrier where you want them — along the boards and away from the dangerous middle of the ice.",tip:"Angling: push them to the boards. Keep them out of the middle."},
    {id:"u9q28",cat:"Exiting the Zone",pos:["F","D"],concept:"Strong vs weak side",d:2,sit:"Your D picks up the puck. The strong-side winger is covered. The weak-side winger is open on the far side. What's the breakout call?",opts:["Force the pass to the covered strong-side winger","Pass to the open weak-side winger — they're the clean option","Carry it out yourself","Rim it around the boards"],ok:1,why:"A covered winger is not an option. The clean outlet is the open player — even if they're on the far side. Read the ice, not just the default option.",tip:"Strong side is covered? Go weak side. Find the open player."},
    {id:"u9q29",cat:"Positioning",pos:["F","D"],concept:"Crash the net",d:2,sit:"Your teammate is about to take a shot from the point. Nobody is near the net. What should you do right now?",opts:["Stay where you are — it might miss wide","Skate hard to the front of the net and get ready for a rebound","Back up to the blue line","Call for a pass instead of letting them shoot"],ok:1,why:"Getting to the net before the shot arrives means you're in position for a rebound before the goalie can cover it. Net-front presence wins games.",tip:"Teammate about to shoot? Crash the net. Get there before the puck does."},
    {id:"u9q30",cat:"Decision Making",pos:["F","D"],concept:"Stretch pass",d:2,sit:"You have the puck in your own zone. A defender is pressuring you. Your teammate is breaking into the neutral zone. They're 40 feet away but wide open. What's the read?",opts:["Dump the puck out","Attempt the stretch pass to the breaking teammate","Skate it out yourself","Hold the puck behind the net"],ok:1,why:"A stretch pass to a breaking forward turns a defensive zone puck into an immediate odd-man rush. The risk is the pass — but if the lane is open, it's the highest-reward play.",tip:"Breaking teammate wide open? Thread the stretch pass. Big reward if you make it."},
    {id:"u9q31",cat:"Teamwork",pos:["F","D"],concept:"Talk on D",d:2,sit:"You're defending in your own zone. Your D partner goes behind the net to get a puck. A forward is crashing to the net and nobody is covering them. What do you do?",opts:["Wait for your D partner to come back and handle it","Call out the open player to your teammates and cover them yourself","Ignore it — the goalie will handle it","Stand in front of your own net and do nothing"],ok:1,why:"When your D partner leaves to get the puck, you need to cover the open attacker. Calling it out also helps your team organize.",tip:"D partner left? You cover the open man. Call it out loud."},
    {id:"u9q32",cat:"Defense",pos:["D"],concept:"Contain the rush",d:2,sit:"An attacker is rushing the puck at you at full speed. You're the only defender. The attacker is fast. What do you do?",opts:["Charge at them at full speed to meet them","Back up at a controlled pace — keep your gap and angle them toward the boards","Turn around and race them to your net","Stand completely still"],ok:1,why:"Charging a fast attacker lets them blow past you. Backing up at a controlled pace while angling forces them to slow down or go where you want.",tip:"Fast attacker coming? Back up controlled. Don't chase. Angle them."},
    {id:"u9q33",cat:"Exiting the Zone",pos:["F","D"],concept:"Center option on breakout",d:2,sit:"Your D picks up the puck. Both wingers are tied up by forecheckers. But your center is open in the middle of the ice. What's the breakout call?",opts:["Force the pass to a covered winger","Pass to the open center in the middle — they're clean","Carry it yourself","Rim it around the boards"],ok:1,why:"The center in the middle is often the hidden option on a breakout. If both wingers are covered, the center up the middle is the smart outlet.",tip:"Both wingers covered? The center in the middle might be the cleanest option."},
    {id:"u9q34",cat:"Shooting",pos:["F"],concept:"One-timer",d:2,sit:"You're on the power play at the half-wall. The puck carrier passes it to you in stride. The goalie is leaning to their left. What's the right play?",opts:["Stop the puck and look for a pass","One-time it to the right side where the goalie hasn't moved yet","Stickhandle and wait","Pass it back to the point"],ok:1,why:"A one-timer on the power play catches the goalie before they can reset. Stopping the puck gives them time to adjust — a quick release doesn't.",tip:"Pass comes in stride with the goalie leaning? One-time it. Quick release wins."},
    {id:"u9q35",cat:"Transitioning",pos:["F","D"],concept:"Forward becoming a defender",d:2,sit:"The puck turns over in the neutral zone and now the other team has a 2-on-2 going toward your net. You're one of the two defenders. What's your priority?",opts:["Chase the puck carrier and try to get the puck back","Take your side — one defender takes the carrier, the other takes the second attacker — and protect the middle","Both defenders collapse to the crease","Go to the bench immediately"],ok:1,why:"A 2-on-2 defense requires each defender to take a side. The most dangerous play is a middle pass — stay in the lanes and make them go wide.",tip:"2-on-2 against you: each take a side. Protect the middle."},
    {id:"u9q36",cat:"Decision Making",pos:["F","D"],concept:"Chip and chase",d:2,sit:"Your team is entering the offensive zone. The defender is set at their blue line — they're not going to let you carry it in. What's the best entry option?",opts:["Carry it in at full speed and hope to blow past them","Chip the puck into the zone behind the defender and skate hard to get it first","Stop at the blue line and wait","Pass back and regroup"],ok:1,why:"A set defender at the blue line means you probably can't carry it in cleanly. Chipping the puck into space behind them and racing to get it first beats the defender's positioning.",tip:"Defender set at the line? Chip it in and go get it. Don't force the carry."},
    {id:"u9q37",cat:"Positioning",pos:["F","D"],concept:"Moving without the puck",d:2,sit:"You don't have the puck in the offensive zone and your teammate is being pressured. The defender covering you is watching the puck. What do you do?",opts:["Stand still and call for the puck","Skate to a new open spot — cut to the net or find a seam. Your defender will have to follow.","Skate toward your covered teammate","Go to the bench"],ok:1,why:"Moving without the puck forces your defender to follow you — and every step they take to follow you is a step away from the puck carrier. Create problems by moving.",tip:"No puck and defender watching the play? Move. Make them follow you. Create space."},
    {id:"u9q38",cat:"Defense",pos:["D"],concept:"Covering the point",d:2,sit:"Your team is on the penalty kill. The power play passes to the point. You're the near penalty killer forward. What do you do?",opts:["Go all the way to the corner","Close on the point player to pressure the shot or take away the dangerous pass options","Stay in the middle of the ice","Back up to your crease"],ok:1,why:"Closing on the point player on the PK takes away a clean shooting lane or forces a rushed decision. You don't have to get the puck — just make them uncomfortable.",tip:"PK: close on the point player. Make it hard for them to get a clean shot."},
    {id:"u9q39",cat:"Teamwork",pos:["F","D"],concept:"Puck support",d:2,sit:"Your teammate just won a puck battle in the corner in the defensive zone. They have the puck but defenders are still around them. You're nearby without a defender on you. What do you do?",opts:["Skate away to center ice","Get close enough to be an easy pass — support behind or beside them","Call for a long pass to the blue line","Stand still and watch"],ok:1,why:"When a teammate wins a puck battle in a tough spot, they need immediate support. Getting close gives them a safe, quick outlet before the next pressure arrives.",tip:"Teammate won the puck battle? Get close and give them a quick option."},
    {id:"u9q40",cat:"Exiting the Zone",pos:["F","D"],concept:"Timing the breakout",d:2,sit:"Your D picks up the puck behind your net. Two forecheckers are coming but they haven't arrived yet. You have 2 seconds. What's the key thing your D should do?",opts:["Wait until the forecheckers arrive before deciding","Look up immediately and read which outlet is open before the pressure arrives — decide early","Rim it around the boards automatically","Skate out with the puck no matter what"],ok:1,why:"Reading the breakout before the pressure arrives — deciding early — is the difference between a clean exit and getting trapped. The D needs to see the ice before the forechecker takes the options away.",tip:"D with the puck and pressure coming? Look up and decide early. Don't wait."},
    {id:"u9q41",cat:"Decision Making",pos:["F","D"],concept:"Rush read — shoot or pass",d:3,sit:"You're the puck carrier on a 2-on-1. The lone defender commits fully to your teammate. The goalie slides across expecting your pass. What's the right call now?",opts:["Pass to your teammate as planned","Shoot — the goalie has moved and there's a lane on your side","Pass to the other side","Pull up and regroup"],ok:1,why:"When the defender commits to your teammate AND the goalie slides to take away the pass, they've left your side open. Shoot — the goalie has moved.",tip:"2-on-1: if the goalie chases the pass, shoot. Read the goalie."},
    {id:"u9q42",cat:"Defense",pos:["D"],concept:"Reading a 3-on-2",d:3,sit:"Your team turned the puck over and now three attackers are coming at your two defensemen. You're the left D. The puck carrier is on your side. What's your job?",opts:["Rush the puck carrier immediately","Take your side and force the carrier wide — your partner protects the middle attacker","Chase the trailer","Back up to your crease"],ok:1,why:"On a 3-on-2, each D takes a side and the D on the puck side forces the carrier wide. The partner covers the middle — the most dangerous attacker.",tip:"3-on-2 against you: take your side. Protect the middle. Don't both go one way."},
    {id:"u9q43",cat:"Positioning",pos:["F","D"],concept:"Pre-read before receiving",d:3,sit:"You're about to receive a pass in the offensive zone. Before the puck reaches you, what should you already be doing?",opts:["Waiting with your stick ready to receive","Looking up and deciding where you're going with the puck before it arrives — pre-reading the play","Calling for the puck louder","Watching the pass to make sure you catch it"],ok:1,why:"Pre-reading the play — deciding where you're going before the puck arrives — is what separates slow players from fast ones. By the time the puck hits your stick, your decision should already be made.",tip:"Pass coming? Decide what you're doing with it before it arrives. Pre-read."},
    {id:"u9q44",cat:"Transitioning",pos:["F","D"],concept:"Counter attack timing",d:3,sit:"Your team is on the power play. The penalty kill gets the puck and two players immediately break the other way 2-on-2. What should your team do?",opts:["Chase immediately and attack the puck carrier","One forward pressures the puck, the others recover their positions — don't panic","All five players retreat to your own zone","Ignore it — the PP will get another chance"],ok:1,why:"A PP counter-attack is dangerous but not a guaranteed goal. One player pressures, everyone else recovers. Panicking and chasing creates a turnover.",tip:"PK breaks out on a counter? One pressures, others recover. Don't all chase."},
    {id:"u9q45",cat:"Shooting",pos:["F"],concept:"Screen and tip",d:3,sit:"Your team has a power play. You're standing in front of the goalie. Your teammate at the point winds up for a shot. What's your job?",opts:["Get out of the way so the goalie can see the shot","Stay planted and block the goalie's sightline — screen them, and be ready to tip the shot","Skate to the corner for the rebound","Call for a pass instead"],ok:1,why:"A screener in front of the net on the power play is one of the highest-value positions. You block the goalie's view and tip shots — that combination creates goals.",tip:"In front of the net on the PP? Screen the goalie and tip the shot. Stay planted."},
    {id:"u9q46",cat:"Teamwork",pos:["F","D"],concept:"Switch on defense",d:3,sit:"You're the right defenseman covering an attacker on your side. Another attacker cuts across in front of the net toward your side. Your partner calls 'switch!' What do you do?",opts:["Stay with your original assignment — ignore the switch call","Take the attacker cutting to your side, let your partner recover their original man","Call the referee","Back up to the crease and cover both"],ok:1,why:"A switch call means you take the player coming to your side while your partner recovers their original man. It's communication and trust.",tip:"Partner calls switch? Take the player coming to you. Trust the call."},
    {id:"u9q47",cat:"Defense",pos:["D"],concept:"Seal on puck battles",d:3,sit:"You're the defenseman and the opposing team's winger wins a puck battle in the corner in your defensive zone. They're about to pass to someone in the slot. What do you do?",opts:["Go into the corner and try to re-win the battle","Seal off the passing lane to the slot — get between the puck carrier and the dangerous area","Skate to the blue line","Watch and react when the pass is made"],ok:1,why:"Once the puck battle is lost, the priority shifts to cutting off the next play — which is almost always a slot pass. Get between the puck carrier and the slot immediately.",tip:"Lost the puck battle? Don't chase the puck. Seal the passing lane to the slot."},
    {id:"u9q48",cat:"Exiting the Zone",pos:["F","D"],concept:"Beating the forecheck",d:3,sit:"Your team is under heavy forecheck pressure. Your D picks up the puck behind your net. Two forecheckers are pinching in from both sides. What breakout option gives you the best chance?",opts:["Wheel and try to carry it out yourself","Reverse the puck to the other side — one forechecker can't follow, buying time for your winger to get position","Rim it around the boards hard","Shoot it down the ice for icing"],ok:1,why:"Under heavy forecheck pressure with two pinching forecheckers, the reverse gives you an extra second. One forechecker can't cover both sides simultaneously.",tip:"Two forecheckers pinching? Reverse the puck. One of them can't follow."},
    {id:"u9q49",cat:"Decision Making",pos:["F","D"],concept:"Recognize the trap",d:3,sit:"The other team is sitting back in a 1-2-2 neutral zone setup. Every time your team tries to enter, they get stopped at the red line. What adjustment do you make?",opts:["Keep trying to carry it in — eventually you'll break through","Pull the puck back to your defensemen, use a D-to-D pass to overload one side, or try a stretch pass to a breaking forward","Dump the puck in every time","Skate around the outside of the trap"],ok:1,why:"A 1-2-2 trap is designed to stop straight-line carries. The answer is patience and lateral movement.",tip:"Against a trap: go backward to go forward. Change the angle. Be patient."},
    {id:"u9q50",cat:"Positioning",pos:["F","D"],concept:"Defensive zone faceoff role",d:3,sit:"Your team is taking a defensive zone faceoff. Before the puck drops, what should every player already know?",opts:["Nothing — just react to where the puck goes","Their assignment — who they're covering and where they're going based on whether you win or lose the draw","Where the nearest door to the bench is","To skate as fast as possible after the puck"],ok:1,why:"A faceoff is a set play. Every player should know their assignment before the puck drops — what to do if you win, what to do if you lose. The setup before the drop is as important as the drop itself.",tip:"Before the faceoff drops: know your assignment. Win or lose — be ready to execute."},
    {id:"u9q51",cat:"Defense",pos:["D"],concept:"Angling at top speed",d:3,sit:"An opposing winger has broken the puck out of their own zone and is coming at you with speed. You're at the red line. The attacker is fast and has a step on you. What's your priority?",opts:["Charge at them and take the puck","Back up at a pace that doesn't let them get speed on you, angle them toward the boards, and wait for help","Turn and race them to your net","Stand completely still and wait"],ok:1,why:"An attacker with speed is trying to blow past you. Backing up at the right pace while angling keeps you ahead of them and denies the clean entry.",tip:"Fast attacker with a step on you? Back up fast and angle. Don't let them get speed going."},
    {id:"u9q52",cat:"Shooting",pos:["F"],concept:"Quick release in tight",d:3,sit:"You're in tight to the net — five feet out. The goalie is set. You have the puck on your backhand but there's barely any time. What do you do?",opts:["Try to switch the puck to your forehand for a better shot","Release your backhand immediately — the goalie is set for the forehand anyway","Pass to a teammate outside","Skate around to get a better angle"],ok:1,why:"In tight to the net with time running out, a quick backhand release is often better than taking the time to switch to your forehand. The goalie is already positioned for the forehand.",tip:"In tight with time running out? Shoot what you've got. Don't switch hands."},
    {id:"u9q53",cat:"Teamwork",pos:["F","D"],concept:"Cycle breakdown",d:3,sit:"Your team is cycling in the offensive zone. The cycle isn't working — the defenders have perfectly matched your movement for 20 seconds and nothing is opening. What should you do?",opts:["Keep cycling — eventually something will open","Stop the cycle — dump the puck deep, change lines, and come back with a new entry","Shoot from the corner","Pass all the way back to the blue line"],ok:1,why:"A cycle against a perfectly matched defense is just burning your legs. Recognize when the cycle isn't creating opportunities and make the change — dump, line change, come back fresh.",tip:"Cycle going nowhere? Dump and change. Come back with a fresh entry."},
    {id:"u9q54",cat:"Transitioning",pos:["F","D"],concept:"Winning position after a penalty",d:3,sit:"Your team just got called for a penalty. Before you leave the ice, what should the remaining four players know?",opts:["Nothing — just defend hard","Their specific penalty kill assignments — who covers the point, who covers the half-wall, and what the plan is if they get the puck","To skate as fast as possible","To surround the puck carrier at all times"],ok:1,why:"The penalty kill is a system. The four remaining players need to know their assignments before the power play sets up. Improvising on the PK gives up goals.",tip:"Going on the PK? Know your assignment. The system works when everyone knows their job."},
    {id:"u9q55",cat:"Defense",pos:["D"],concept:"Last man read",d:3,sit:"You're the last defender back and two attackers are coming at you on a 2-on-1. Your goalie is set. One attacker has the puck on the left. One is cutting to the net on the right. What do you do?",opts:["Commit to the puck carrier on the left","Stay in the middle — take away the pass to the cutter and force the shot. Your goalie handles the shot.","Chase the cutter to the right","Back up all the way to your crease"],ok:1,why:"Last man back on a 2-on-1: take away the pass, force the shot, trust your goalie. Don't commit to either attacker until they force your hand.",tip:"Last man back on a 2-on-1: take away the pass. Let the goalie have the shot."},
    {id:"u9q56",cat:"Decision Making",pos:["F","D"],concept:"Read the goalie on a breakaway",d:3,sit:"You're on a breakaway. The goalie is skating aggressively out to cut your angle. What's the most effective play?",opts:["Shoot blocker side immediately from distance","Pull the puck wide, make the goalie commit to one side, then shoot or go to the other side","Try a straight backhand shot immediately","Slow down and wait until you're right on top of them"],ok:1,why:"An aggressive goalie is looking for an early shot or for you to go straight. Make them commit — take the puck wide, let them follow, then shoot or go opposite.",tip:"Aggressive goalie on a breakaway: make them commit first. Then go where they're not."},
    {id:"u9q57",cat:"Positioning",pos:["F","D"],concept:"PP point read",d:3,sit:"Your power play is in a 1-3-1 and has been set up for 30 seconds without generating a shot. Two PK forwards are pressuring the top. What should the top player do?",opts:["Try to hold the puck and fight through both PK forwards","Move the puck quickly across to the half-wall before both pressure players arrive","Shoot from distance through traffic","Pass it back to your own zone and reset"],ok:1,why:"Two PK forwards pressuring one point means the rest of the formation has a gap — the half-wall is almost always where that gap is. Move the puck before both arrive.",tip:"Two PKers coming? Move the puck before they get there. They can't cover two spots at once."},
    {id:"u9q58",cat:"Teamwork",pos:["F","D"],concept:"Late game puck management",d:3,sit:"Your team is winning by one goal with two minutes left. You win a faceoff in the offensive zone. What's most important?",opts:["Take a big shot immediately to extend the lead","Control the puck, cycle below the dots, use every second — only shoot on a high-quality chance","Dump the puck to the corner and chase","Pass it back to your own zone to be safe"],ok:1,why:"Late-game puck management is a skill. Cycling below the dots forces the other team to chase, burns clock, and keeps the puck away from their skilled players.",tip:"Leading late: the clock is your ally. Protect the puck. Make them chase."},
    {id:"u9q59",cat:"Exiting the Zone",pos:["F","D"],concept:"Reading the forechecker's angle",d:3,sit:"You're the D and you pick up the puck in your own corner. The forechecker is coming from your left. Your left winger is up the wall on your left — open, but the forechecker is between you and that pass. Your right winger is also up the wall on the right, completely open. What do you do?",opts:["Force the pass to the left winger — they're your first option","Pass to the right winger — the forechecker has already cut off the left side","Carry it out yourself","Rim it around the boards"],ok:1,why:"Reading the forechecker's angle tells you which options they've taken away. If they're cutting off the left, the right side is the clean exit.",tip:"Forechecker cutting off one side? The other side is your outlet. Read the angle."},
    {id:"u9q60",cat:"Defense",pos:["D"],concept:"Contain without committing",d:3,sit:"A skilled forward is coming at you 1-on-1 at full speed. They're a good stickhandler and have already made two players fall down tonight. What do you avoid doing?",opts:["Backing up and staying patient","Poking check from maximum distance or charging them","Angling them toward the boards","Waiting for their first move before reacting"],ok:1,why:"A skilled stickhandler wants you to commit early — a premature poke check gives them exactly the step they need to blow past you. Stay patient and contained.",tip:"Skilled forward 1-on-1? Don't commit early. Stay patient. Make them decide first."},
    {id:"u9q61",cat:"Decision Making",pos:["F","D"],concept:"Back pass under pressure",d:3,sit:"You have the puck at the offensive blue line. A defender is closing hard from your right. Your center is open five feet behind you. Your only shooting lane is gone. What do you do?",opts:["Try to hold the puck and fight through the pressure","Drop a back pass to your center — they have time and space and you don't","Shoot into the defender","Dump the puck to the corner"],ok:1,why:"When your shooting lane is gone and a player is closing fast, a back pass to a player with time and space is the right play. Don't force the situation — solve it.",tip:"Shooting lane gone with pressure coming? Drop it back. Someone behind you has time."},
    {id:"u9q62",cat:"Shooting",pos:["F"],concept:"Read the goalie pre-shot",d:3,sit:"You're about to shoot from the slot. Before you release, you have a split second to look at the goalie. They're leaning hard to your right. Where should you shoot?",opts:["Top right — over their shoulder on the side they're leaning","Low left — the opposite side of where they're leaning. They can't recover in time.","Right at them — power wins","Wait for them to reset before shooting"],ok:1,why:"Pre-shot reads of the goalie give you a target before you even release. A goalie leaning hard to one side is leaving the other side vulnerable — shoot there.",tip:"Goalie leaning hard one way? Shoot the opposite side. They can't recover in time."},
    {id:"u9q63",cat:"Teamwork",pos:["F","D"],concept:"Reading your linemates",d:3,sit:"You're on a line change. Your linemates are still on the ice finishing a rush. The play is still alive. When do you go on?",opts:["Go immediately — you're fresh and need to help","Wait until the puck is dead, there's a stoppage, or your teammates are safely at the bench and can't be caught short","Jump on as soon as your teammate steps off the ice, even if they're still in the play","Go as soon as you feel like it"],ok:1,why:"Taking a too-many-men penalty on a rush because you jumped on too early is a critical mistake. The line change is clean only when the puck is dead or your teammate is safely off.",tip:"Line change during a rush: wait for a stoppage or until your teammate is safely off. Don't jump on early."},
    {id:"u9q64",cat:"Transitioning",pos:["F","D"],concept:"Timing the attack",d:3,sit:"Your team just won a puck battle in your own zone. Two of your forwards are already at center ice. The other team has one player back. A 3-on-1 is developing. What's the trigger?",opts:["Wait until all three forwards are in the neutral zone","Go immediately — the 3-on-1 window closes fast as the other team gets back","Regroup at your own blue line","Dump it in and change lines"],ok:1,why:"Transition opportunities close fast. If two forwards are already at center and you have a 3-on-1 developing, going immediately before the other team recovers is how you exploit it.",tip:"Transition chance opening? Go now. Those windows close in seconds."},
    {id:"u9q65",cat:"Defense",pos:["D"],concept:"Reading the pass pre-emptively",d:3,sit:"You're a defenseman in your own zone. The opposing winger has the puck in the corner and keeps looking at the player in the slot. What do you do?",opts:["Watch the puck carrier and wait for the pass to happen","Step in front of the anticipated pass lane — intercept it before it arrives","Go into the corner to pressure the puck carrier","Back up to your crease"],ok:1,why:"Reading a puck carrier's eyes tells you where the pass is going. If they keep looking at the slot, get in that lane before the pass is made — not after.",tip:"Puck carrier keeps looking at one spot? Get in that lane. Intercept before the pass arrives."},
    {id:"u9q66",cat:"Decision Making",pos:["F","D"],concept:"Neutral zone puck management",d:3,sit:"Your team has the puck in the neutral zone. You're being pressured. The other team has a 2-on-1 developing in your end. You have the puck behind you. What do you do?",opts:["Keep skating toward the offensive zone","Recognize the 2-on-1 developing and get the puck to your D immediately so they can deal with the threat","Dump the puck in and hope for the best","Stop and wait for teammates to come back"],ok:1,why:"Reading the play behind you — a developing 2-on-1 — is an important defensive awareness skill. Getting the puck to your D before the 2-on-1 is established gives them a chance to deal with it.",tip:"2-on-1 developing in your end and you have the puck? Get it back to your D. Don't skate forward."},
    {id:"u9q67",cat:"Teamwork",pos:["F","D"],concept:"Communicate the switch",d:3,sit:"You're defending in your own zone. An attacker cuts from the left side to the right side in front of the net. Your partner was covering them but now they're on your side. What do you do?",opts:["Ignore them — your partner will follow","Call switch and take the attacker coming to your side so your partner can recover","Call the referee for a penalty","Back up to the crease and let it happen"],ok:1,why:"When an attacker cuts across in front of the net, the defending pair needs to communicate a switch. You take the player coming to your side — your partner recovers.",tip:"Attacker cuts to your side? Call switch and take them. Let your partner recover."},
    {id:"u9q68",cat:"Positioning",pos:["F","D"],concept:"Overload read on offense",d:3,sit:"Your team is in the offensive zone. All three forwards are on the left side of the ice — bunched up. The entire right side is empty. You're the right winger. What do you do?",opts:["Stay on the left side — that's where the puck is","Move immediately to the right side — the space is there and the D will have to follow you or leave you open","Go to the bench","Stand in front of the net"],ok:1,why:"When everyone goes to the same side, the other side opens up completely. Moving to the open side as the right winger creates an immediate passing option and forces a defensive reaction.",tip:"Everyone bunching up on one side? Go the other way. The space is there."},
    {id:"u9q69",cat:"Defense",pos:["D"],concept:"PK box integrity",d:3,sit:"Your team is on the penalty kill and in a box formation. The power play moves the puck quickly around the outside. One of your PK players starts chasing every pass. What goes wrong?",opts:["Nothing — chasing is fine on the PK","Chasing breaks the box — gaps open up and the power play gets into the dangerous areas you were protecting","Chasing tires out the power play","Chasing makes the power play hesitate"],ok:1,why:"The box on the penalty kill works because every player holds their position and protects the dangerous areas. Chasing every pass breaks the structure and creates gaps the power play exploits.",tip:"PK box: hold your spot. Don't chase every pass. The box works when everyone stays in it."},
    {id:"u9q70",cat:"Decision Making",pos:["F","D"],concept:"Reading the whole ice",d:3,sit:"You're at center ice with the puck. You see a 3-on-2 developing in the offensive zone. One winger is on the left, one is on the right, and a third forward is trailing. Both defenders are inside. What's the read?",opts:["Pass immediately to the left winger","Look at both defenders first — pass to whichever winger the defenders are leaving more open, or drive the middle if it's open","Shoot from center ice","Dump the puck in and chase"],ok:1,why:"On a 3-on-2, reading both defenders first tells you which option is actually open before you commit. The best puck carrier reads the whole ice, not just one option.",tip:"3-on-2 developing? Read both defenders before picking your option. Don't just default to one side."},
    {id:"u9q71",cat:"Shooting",pos:["F"],concept:"Off the rush shot selection",d:3,sit:"You're the center on a rush. The defenders are both backing up. You're at the top of the circles moving at full speed. You have a shooting lane. What do you do?",opts:["Pass to a winger immediately — always pass first on a rush","Shoot — you're at full speed and the goalie has to set against a moving shooter","Pull up and stickhandle","Dump the puck in and reset"],ok:1,why:"A moving shooter at full speed at the top of the circles is harder for the goalie to set against than a stationary shooter. Use the speed — shoot.",tip:"Full speed at the circles with a lane? Shoot. Moving shooters are harder to stop."},
    {id:"u9q72",cat:"Exiting the Zone",pos:["F","D"],concept:"Reverse when both sides blocked",d:3,sit:"Your D picks up the puck. The forechecker is coming from the left. Your left winger is covered. Your right winger is also covered. Your center is late getting back. What's the option?",opts:["Force a pass to a covered winger","Reverse behind the net — the forechecker on the left has to follow, which buys time for the center to get back","Carry it out yourself into the forechecker","Shoot it down the ice for icing"],ok:1,why:"When all outlets are covered and a forechecker is coming from one side, reversing behind the net forces the forechecker to follow — buying a few seconds for outlets to get open.",tip:"All outlets covered and a forechecker coming? Reverse behind the net. Buy time."},
    {id:"u9q73",cat:"Defense",pos:["D"],concept:"Reading screens",d:3,sit:"Your team is on the penalty kill. A power play player is standing right in front of your goalie screening them. The puck is at the point. What's your immediate priority?",opts:["Go pressure the point player with the puck","Move the screener out of the crease — your goalie can't see the shot and that's more dangerous than the shot itself","Stay in a passing lane","Back up to the crease yourself"],ok:1,why:"A screener blocking your goalie's sightline on the PK is the most dangerous player on the ice. Moving them out is the priority — before the shot is taken.",tip:"Screener blocking your goalie on the PK? Move them out. Your goalie needs to see."},
    {id:"u9q74",cat:"Teamwork",pos:["F","D"],concept:"Supporting the shooter",d:3,sit:"Your teammate is about to shoot from the half-wall. The goalie is set. You're the weak-side winger. What should you be doing?",opts:["Staying where you are in case the shot misses wide","Crashing the net hard on the weak side — be there for the rebound before the goalie can cover","Backing up to the blue line","Calling for a pass instead of the shot"],ok:1,why:"The weak-side winger crashing the net on a shot is one of the highest-value plays without the puck. Rebounds bounce weak side — being there before the shot lands is how goals are scored.",tip:"Teammate shooting? Crash the net. Weak-side rebound is your job."},
    {id:"u9q75",cat:"Positioning",pos:["F","D"],concept:"Faceoff strategy",d:3,sit:"Your team wins a faceoff in the offensive zone. The opposing center had to tie the draw. The puck goes back to your defenseman at the point. Before the opposing center gets their bearings, what should you do?",opts:["Wait for the play to develop normally","Drive hard to the net immediately — the opposing center just spent all their energy on the draw and the lane to the net may be briefly open","Skate to the corner","Call for a pass from the point"],ok:1,why:"Winning a faceoff in the offensive zone creates a split-second window where the opposing center is off-balance. Driving hard to the net immediately exploits that window before they recover.",tip:"Win the OZ faceoff? Drive the net immediately. The center just fought the draw — they're recovering."},
    {id:"u9q76",cat:"Decision Making",pos:["F","D"],concept:"Puck to right player",d:3,sit:"You have the puck in the offensive zone. Two teammates are available — one is at the half-wall with a clear shot lane, and one is right in front of the net with no lane but good positioning. Which do you pass to?",opts:["The one in front of the net — they're in the best scoring position","The one at the half-wall — they have the open lane right now and can shoot immediately","Hold the puck yourself","Pass back to the point"],ok:1,why:"The immediate open lane wins over the better position without a lane. The half-wall player can shoot right now — the net-front player would need to receive, control, and find a lane. Open lane first.",tip:"Two options — one with a lane, one without? Give it to the one who can shoot right now."},
    {id:"u9q77",cat:"Teamwork",pos:["F","D"],concept:"Defensive zone rotation",d:3,sit:"Your team is in the defensive zone. The puck goes from the corner to the half-wall. As the nearest forward, you move to pressure the half-wall player. Who covers your corner assignment?",opts:["Nobody — you handle both","Your D partner rotates to cover the corner behind you — that's the rotation","Your winger on the other side skates across","You stay in both spots somehow"],ok:1,why:"When a forward pressures the half-wall, the D partner behind them rotates to cover the area the forward left. This is how defensive zone rotations work — everyone shifts together.",tip:"You go pressure the half-wall? Your D rotates behind you to cover. Everyone shifts."},
    {id:"u9q78",cat:"Defense",pos:["D"],concept:"Rush gap management",d:3,sit:"Three attackers are rushing at your two defensemen. All three attackers are at top speed. What's the biggest mistake a defenseman can make here?",opts:["Backing up too fast","Pinching up — closing aggressively on the puck carrier at the offensive zone instead of backing up","Staying in the middle of the ice","Talking to their partner"],ok:1,why:"Pinching up against a fast rush hands the attacking team a massive speed advantage. Backing up at the right pace — not too fast, not too slow — is the correct response to a rush with speed.",tip:"Rush coming with speed? Back up controlled. Never pinch up against a fast rush."},
    {id:"u9q79",cat:"Exiting the Zone",pos:["F","D"],concept:"Timing your break",d:3,sit:"Your team is under heavy forecheck pressure in your own zone. Your D has the puck and is looking to pass. You're a winger and you're currently covered. When should you break to the wall to get the pass?",opts:["Stay where you are — the D will figure it out","Skate to the wall hard, using your speed to lose the forechecker for a split second — make the D's decision easy","Don't break until the forechecker is gone","Stay still and call for the puck"],ok:1,why:"Creating separation from your forechecker — even for a split second — is how you get open. Skate hard to the wall to create the separation that makes the pass possible.",tip:"Covered on the breakout? Skate hard to create separation. Make yourself open."},
    {id:"u9q80",cat:"Decision Making",pos:["F","D"],concept:"High danger vs. safe play",d:3,sit:"You have the puck in the offensive zone. You can shoot from where you are — a decent but not great angle. OR you can pass to a teammate in the slot who's slightly covered but would have a much better shot. What do you do?",opts:["Shoot — you have the puck and a shot","Pass to the slot player — the higher danger location is worth the slight coverage risk","Hold the puck and wait","Pass back to the point"],ok:1,why:"A slightly covered player in the slot still represents a higher-danger chance than a clean shot from a poor angle. The math of chance quality favors the slot, even with some risk.",tip:"OK angle vs. slightly covered slot? The slot wins. Higher danger is worth the risk."},
    {id:"u9q81",cat:"Shooting",pos:["F"],concept:"One-touch in stride",d:3,sit:"You're breaking into the offensive zone with speed and a pass is coming to you in stride. The goalie is set in the middle of the net. You have a half-second. What's the best play?",opts:["Stop the puck and look for a pass","One-time it low blocker side — the goalie hasn't moved yet and a one-touch in stride catches them off-balance","Stickhandle to slow down and aim","Pass across to a winger"],ok:1,why:"A one-touch shot in stride catches the goalie before they can set against a stationary shooter. Stopping the puck gives the goalie time to adjust.",tip:"Pass coming to you in stride with a lane? One-time it. Don't stop the puck."},
    {id:"u9q82",cat:"Defense",pos:["D"],concept:"Loose puck in own zone",d:3,sit:"There's a loose puck in your defensive zone right in front of your net. You and an opposing player are racing to it at the same time. What's your priority?",opts:["Get to the puck first and try to skate it out","Get your body between the opponent and the puck — inside position wins this battle even if you get there second","Poke it with your stick from distance","Call for your goalie to come get it"],ok:1,why:"Inside position on a loose puck in front of your own net wins the battle even if you get there a step late. Body between opponent and puck — that's the priority.",tip:"Loose puck in your own zone? Get inside position. Body between opponent and puck."},
    {id:"u9q83",cat:"Teamwork",pos:["F","D"],concept:"Power play entry",d:3,sit:"Your team is on the power play trying to enter the offensive zone. The penalty killers are set at their blue line — two of them. How should your team attack?",opts:["Carry it in straight — you have the extra man","Use the extra man advantage: hold the puck until one PK player commits, then exploit what they've given up","Dump the puck in and chase","Skate back and regroup continuously"],ok:1,why:"The extra man on the power play means someone is always open. Don't just carry into a set defense — hold until a PK player commits, then move the puck to who they left open.",tip:"PP zone entry vs. set PK: hold until they commit. Then use the extra man."},
    {id:"u9q84",cat:"Positioning",pos:["F","D"],concept:"Off-puck movement",d:3,sit:"The puck carrier has the puck in the offensive zone but is being smothered by defenders. You don't have the puck and a defender is near you. What's the best thing you can do?",opts:["Stand still and call for the puck","Skate into open space — cut to the net, move to a seam. Make yourself available AND drag your defender out of the puck carrier's area.","Go help the puck carrier in the battle","Skate to the blue line"],ok:1,why:"Off-puck movement does two things: it makes you available for a pass and it drags your defender away from the puck carrier — creating more space for them.",tip:"Puck carrier in trouble? Move without the puck. Create space for them by dragging your defender away."},
    {id:"u9q85",cat:"Defense",pos:["D"],concept:"PK breakout under pressure",d:3,sit:"Your penalty kill clears the puck down the ice. Icing is called and the faceoff comes back to your defensive zone. Your two PK players are tired. What matters most before the next faceoff?",opts:["Change lines immediately even if it causes confusion","Get your two best faceoff players and PK coverage players out — fresh legs and the right assignments matter more than speed","Stay out — the familiar lineup is better","Send out the power play line instead"],ok:1,why:"A faceoff after an icing on the PK is a chance to reset with the right personnel. Getting the right PK players and faceoff specialist on the ice matters more than rushing.",tip:"PK icing faceoff? Get the right players out. Fresh legs and right assignments."},
    {id:"u9q86",cat:"Transitioning",pos:["F","D"],concept:"Read the rush before it happens",d:3,sit:"You're in the offensive zone and the puck is about to turn over. Before it does, where should you already be moving?",opts:["Stay put — wait to see if the turnover actually happens","Start transitioning early — turn toward your own zone before the turnover is complete. Get a head start.","Skate to the bench","Go to the corner"],ok:1,why:"The best backcheckers start their transition before the puck has fully changed hands. Reading that a turnover is about to happen and moving early gives you a huge head start.",tip:"Turnover about to happen? Start moving early. Get a head start on the backcheck."},
    {id:"u9q87",cat:"Decision Making",pos:["F","D"],concept:"Passing into traffic",d:3,sit:"You have the puck in the offensive zone. A teammate is in the slot but a defender is between you and them. You can see a sliver of the teammate. What do you do?",opts:["Force the pass through the defender — your teammate is in the slot","Find a better option — a covered pass through a defender is high-risk. Look for the winger or the point.","Hold the puck","Shoot from where you are"],ok:1,why:"A pass through a defender risks a turnover and an immediate counter-attack. If a defender is between you and your target, find a different option — the pass isn't open.",tip:"Defender in your passing lane? Find a different option. A blocked pass is a turnover."},
    {id:"u9q88",cat:"Positioning",pos:["F","D"],concept:"D pinching decision",d:3,sit:"You're the defenseman at the offensive blue line. Your winger just gained possession in the corner. Should you pinch to join the attack below the dots?",opts:["Yes — always get involved in the attack","Only if the other winger or center is positioned to cover the blue line behind you — otherwise hold the line","Yes — pinch every time your winger gets the puck","No — never pinch under any circumstances"],ok:1,why:"Pinching is right only when someone is positioned behind you to cover the blue line. Pinching without coverage gives up a breakout against you if the puck turns over.",tip:"Want to pinch? Make sure someone covers the line behind you first. Then go."},
    {id:"u9q89",cat:"Defense",pos:["D"],concept:"Box in the neutral zone",d:3,sit:"The other team is trying to enter your zone 4-on-4. Your team has set up in the neutral zone with all four players between the puck and your net. The puck carrier is coming at you. What's the key to making this work?",opts:["Everyone chase the puck carrier at the same time","Hold your positions and make the puck carrier make a decision — force them one way and take away the easiest options","All four players back up to your blue line immediately","One player challenges while three retreat all the way"],ok:1,why:"A neutral zone defensive structure works when everyone holds their lane and forces the puck carrier into a decision. If everyone chases, the structure collapses.",tip:"Neutral zone defense: hold your lane. Force the puck carrier to decide. Don't all chase."},
    {id:"u9q90",cat:"Teamwork",pos:["F","D"],concept:"Faceoff assignment win",d:3,sit:"Your team wins a faceoff in the neutral zone and the puck goes back to your defenseman. You're the center — you just took the faceoff. What do you do now?",opts:["Stand and watch what your D does with it","Transition immediately to your assignment — if you won the draw, get to your position in the rush development. The faceoff result gives your team the advantage if everyone executes.","Go to the bench","Celebrate winning the draw"],ok:1,why:"Winning a faceoff is just the start — executing the assignment immediately after is what turns a faceoff win into a scoring chance. The center transitions to their rush role.",tip:"Win the faceoff? Execute your next assignment immediately. Don't watch — go."},
    {id:"u9q91",cat:"Shooting",pos:["F"],concept:"Tip drill",d:3,sit:"A shot comes from the blue line. You're standing in front of the net. The puck is coming at the middle of the net right at the goalie. What's your job?",opts:["Get out of the way","Tip the puck — even a slight redirection completely changes the trajectory and defeats the goalie's tracking","Call for it to go wide","Skate away from the crease"],ok:1,why:"Tipping a shot on net is one of the most effective plays in hockey. Even a small deflection changes the trajectory enough to beat a goalie who is tracking the original shot.",tip:"Shot coming from the point right at the goalie? Tip it. Any deflection beats their tracking."},
    {id:"u9q92",cat:"Decision Making",pos:["F","D"],concept:"Simple first",d:3,sit:"You have the puck in your own zone under pressure. You have two options: a tricky cross-ice pass to a teammate at the blue line, or a simple short pass to your D partner three feet away. Which do you take?",opts:["The tricky cross-ice pass — it leads to a faster breakout","The simple short pass to your D partner — take the safe option under pressure and let them move the puck from a better position","Try to carry it yourself","Wait for a better option to appear"],ok:1,why:"Under pressure in your own zone, the simple play is almost always right. A tricky cross-ice pass into pressure risks a turnover in the worst possible area.",tip:"Two options under pressure? Take the simple one. Safe pass first, then build."},
    {id:"u9q93",cat:"Positioning",pos:["F","D"],concept:"Defensive zone triangle",d:3,sit:"Your team is defending in your own zone. The puck is in the far corner. The other team has three attackers in the zone and you have two defenders and one forward back. Where should the forward position?",opts:["Go into the corner to help your partner","Hold the high slot — be between the corner player and the open attackers in the high-danger area","Go to the blue line","Follow the nearest attacker everywhere"],ok:1,why:"With three attackers in the zone and only three defenders, the forward holds the high slot to take away the most dangerous pass options. Going to the corner leaves the front of the net completely open.",tip:"Three attackers, you're the lone forward back? Hold the high slot. Don't go to the corner."},
    {id:"u9q94",cat:"Defense",pos:["D"],concept:"Prevent the second shot",d:3,sit:"The other team takes a shot and your goalie makes the save. The rebound goes to the corner. An opposing player is racing to it. What do you do?",opts:["Watch to see if your goalie covers it","Get to the rebound before the opposing player — or at least get your body position between them and the puck","Call for your goalie to come out","Back up to the crease"],ok:1,why:"Beating the opposing player to the rebound — or at minimum getting inside position — prevents the second shot. Letting them get a clean rebound in the corner means a second chance against you.",tip:"Rebound in the corner? Race to it or get inside position. Prevent the second shot."},
    {id:"u9q95",cat:"Teamwork",pos:["F","D"],concept:"Breakout communication",d:3,sit:"Your D picks up the puck in your own corner. They're looking up but they can't see behind them. Your winger is open up the wall but a forechecker is about to close on them from the blind side. What do you do?",opts:["Say nothing — the D will figure it out","Call out 'man on!' or tell the winger to hold — give the information that only you can see","Skate over to get between the forechecker and the winger","Call for the pass yourself"],ok:1,why:"You can see something neither the D nor the winger can see. That information is valuable — communicating it immediately makes the play better.",tip:"You see something others can't? Say it loud and fast. That's your job."},
    {id:"u9q96",cat:"Transitioning",pos:["F","D"],concept:"Attack after the clear",d:3,sit:"Your penalty kill clears the puck all the way into the other team's zone. You're the first PK player over the other team's blue line. What do you do?",opts:["Slow down — it's probably just going to come back","Attack hard — a PK icing or clear can become a shorthanded chance if you pursue it aggressively. Speed wins that race.","Go to the bench for a line change","Wait for your teammate to come with you"],ok:1,why:"A PK clear that gets into the other team's zone is a chance for a shorthanded goal if you pursue aggressively. The other team is coming back for it — getting there first wins the race.",tip:"PK clear going deep? Attack it. Speed wins the race and shorthanded goals are game-changers."},
    {id:"u9q97",cat:"Decision Making",pos:["F","D"],concept:"Win the possession battle",d:3,sit:"Your team has been hemmed in your own zone for 45 seconds. Your D picks up the puck. Before they do anything else, what's the single most important question they should answer?",opts:["What's the score?","Which outlet is actually open — not which one I want to use, but which one is actually free?","Where is the nearest bench?","What did the coach say before the game?"],ok:1,why:"Under pressure after a long zone time, the temptation is to default to a favorite outlet. But reading which option is actually open — not which one you want — is what leads to a clean exit.",tip:"Long zone time, D finally has the puck? Read what's actually open. Don't default."},
    {id:"u9q98",cat:"Positioning",pos:["F","D"],concept:"Puck tracker vs. player",d:3,sit:"You're defending in your own zone. The puck is in the corner behind your net. Your assignment is an attacker near the half-wall on the opposite side. The puck is far away from them. Do you watch the puck or watch your man?",opts:["Watch the puck — it's more important to know where the puck is","Watch your man — keep them in front of you so you know when they move. You can track the puck with your peripheral vision.","Watch both equally","Go get the puck yourself"],ok:1,why:"In man coverage, losing sight of your assignment is how they get open for a pass. Keep them in front of you and use your peripheral vision for the puck.",tip:"Man coverage in your own zone: watch your man, not the puck. Use your peripheral vision for the puck."},
    {id:"u9q99",cat:"Teamwork",pos:["F","D"],concept:"Line change awareness",d:3,sit:"You're playing hard in the offensive zone on a long shift. The puck turns over and the other team is breaking out. Your legs are tired. What's the responsible play?",opts:["Push through — the play needs you","If you can't backcheck at full speed, get off and get a fresh player on. A tired player is worse than no player.","Slow jog back","Call for the other team to stop"],ok:1,why:"A tired player who can't backcheck at full speed is a liability, not an asset. The responsible play is to get off the ice and get a fresh player in who can actually defend.",tip:"Legs gone and the other team is breaking out? Get off. Fresh player is better than a tired one."},
    {id:"u9q100",cat:"Decision Making",pos:["F","D"],concept:"Read the whole play",d:3,sit:"You have the puck at center ice. Three options: your winger is open on the left but a defender is closing on them. Your center is open in the slot with a clear lane. Your D is open at the blue line on the right. What do you do?",opts:["Pass to the winger on the left — they were first in your vision","Pass to the center in the slot — open lane, dangerous position, immediate scoring threat","Pass to the D on the right — they're the safest option","Carry it yourself"],ok:1,why:"Reading all three options before picking tells you the center in the slot with a clear lane is the best play. The winger has a closing defender and the D is the safest but least dangerous option. Best chance wins.",tip:"Multiple options? Read all of them before you pick. The open slot beats everything else here."},
  ,
    {id:"u9g1",cat:"Goalie",concept:"Angle basics",d:1,pos:["G"],sit:"A forward is coming at you on a breakaway. You're standing on your goal line. What should you do with your position?",opts:["Stay on the goal line","Skate out toward the shooter to cut the angle — give them less net to shoot at","Skate all the way out to the blue line","Lie down on the ice immediately"],ok:1,why:"Coming out toward the shooter cuts down the angle — the shooter sees less net. A goalie who stays on the goal line gives the shooter a huge target. Move out and take space away.",tip:"Come out toward the shooter. Take away the angle. Give them less net."},
    {id:"u9g2",cat:"Goalie",concept:"Reading the 2-on-1",d:1,pos:["G"],sit:"Two attackers are coming at your lone defenseman on a 2-on-1. The puck carrier has the puck. What's the goalie's job?",opts:["Skate out to challenge the puck carrier","Stay in your crease, be ready for a shot, and watch for the pass — the D takes away the pass, you take the shot","Yell at your D to do something","Come out past the crease"],ok:1,why:"On a 2-on-1, the defender takes away the pass and the goalie takes the shot. The goalie stays set in the crease and is ready for either — but primarily prepared for the shot.",tip:"2-on-1: your D takes the pass, you take the shot. Stay set and read it."},
    {id:"u9g3",cat:"Goalie",concept:"Butterfly basics",d:1,pos:["G"],sit:"A shot is coming low along the ice. What's the most effective way to stop it?",opts:["Try to kick it with one foot","Drop into butterfly position — both knees down, pads flared out to cover the bottom of the net","Fall sideways","Stand still and hope it hits you"],ok:1,why:"The butterfly position drops both pads to the ice and covers the bottom of the net effectively. Low shots along the ice are best stopped this way.",tip:"Low shot coming? Butterfly. Pads down, cover the bottom of the net."},
    {id:"u9g4",cat:"Goalie",concept:"Rebound control",d:2,pos:["G"],sit:"You make a save but you can direct where the rebound goes. Where should you try to send it?",opts:["Straight back into the slot","Into the corner where your team can retrieve it","Over the boards out of play","Anywhere away from the net"],ok:1,why:"Directing rebounds to the corner keeps the puck away from the most dangerous area — the slot. Your team can retrieve it in the corner and start a breakout.",tip:"Control your rebounds. Aim for the corners, not the middle."},
    {id:"u9g5",cat:"Goalie",concept:"Screen handling",d:2,pos:["G"],sit:"A player from the other team is standing right in front of you, blocking your view of a point shot. The puck is about to be shot. What do you do?",opts:["Give up — you can't see","Move laterally to try to find a sightline, and be ready to react to tips and deflections","Skate into the screener","Call for your teammates and wait"],ok:1,why:"Screeners are a real problem but not impossible. Moving slightly helps you find the puck, and being ready for a deflection means you're not just frozen behind the screen.",tip:"Screener in front? Move to find the puck. Expect a tip. React."},
    {id:"u9g6",cat:"Goalie",concept:"Puck handling",d:2,pos:["G"],sit:"The puck comes behind your net. Your winger is coming back to get it but they're a second away. You can get there first. Should you play it?",opts:["Never touch the puck — it's too risky","Yes — if you can get there first and your winger is a step away, stop it for them so they have a clean pickup","Only if the other team isn't coming","Kick it with your skate"],ok:1,why:"Goalies who can handle the puck are a huge asset. If you can get to it first and stop it for your winger, you've started the breakout and taken pressure off your defense.",tip:"Comfortable behind the net? Play it. Stop it for your winger. Be an extra D."},
    {id:"u9g7",cat:"Goalie",concept:"Breakaway read",d:2,pos:["G"],sit:"A player is on a breakaway coming straight at you. They're moving fast. When should you commit to going down?",opts:["Right away — drop immediately","Wait until they've made their move — commit when you see what they're going to do, not before","Never go down — always stay up","As soon as they cross the blue line"],ok:1,why:"The goalie who commits too early loses. A patient goalie who waits for the shooter's move before committing forces the shooter to beat them rather than just beat the commit.",tip:"Breakaway: be patient. Make them show you something first. Then commit."},
    {id:"u9g8",cat:"Goalie",concept:"Post awareness",d:2,pos:["G"],sit:"The puck is in the corner to your left. An attacker has it but hasn't shot. Where should you be in your net?",opts:["In the middle of the net","Touching the left post — take away the near side","All the way to the right post","Out of the crease"],ok:1,why:"When the puck is in the corner, the goalie moves to the near post. This takes away the short side — the most dangerous option for that angle. The long side is much harder to score from.",tip:"Puck in the corner? Move to the near post. Take away the short side."},
    {id:"u9g9",cat:"Goalie",concept:"Communication — mine",d:1,pos:["G"],sit:"The puck is bouncing in the crease area and both you and your defenseman are going for it. What should you say?",opts:["Nothing — just grab it","Yell 'Mine!' loud and clear so your defenseman knows to get out of the way","Tap them on the shoulder","Wait until after the play to figure it out"],ok:1,why:"'Mine!' is one of the most important calls in hockey. It tells your defender to clear out and lets you take control of the puck without a collision or confusion.",tip:"'Mine!' — say it loud and say it early. Own your crease."},
    {id:"u9g10",cat:"Goalie",concept:"Tracking through traffic",d:3,pos:["G"],sit:"Three players from both teams are battling in front of your net. Sticks and bodies everywhere. The puck is somewhere in the mess. What's your priority?",opts:["Watch the bodies","Keep your eyes moving — track the puck through the traffic. Move with the puck, not with the players.","Wait for the puck to emerge","Drop immediately into butterfly"],ok:1,why:"Traffic in front is the hardest goalie situation. The key is to track the puck through the bodies, not get distracted by movement. The puck is what can score — bodies can't.",tip:"Traffic in front? Track the puck, not the bodies. The puck tells you everything."},
    {id:"u9g11",cat:"Goalie",concept:"Backdoor coverage",d:3,pos:["G"],sit:"The puck is on the half-wall. You're set on the post. A player cuts to the back door completely open on the far side. What do you do?",opts:["Stay on your post","Quickly push across to take away the back-door pass — your near post is less dangerous now","Skate out toward the puck","Stay completely still"],ok:1,why:"A back-door pass to an open player is one of the highest-danger plays in hockey. When you see the cut, you have to push across quickly to take away that option — the shooter at the half-wall is less dangerous than an open player at the back post.",tip:"Back-door cut? Push across. The post can wait — the open player is the emergency."},
    {id:"u9g12",cat:"Goalie",concept:"Freeze or play — decision",d:3,pos:["G"],sit:"You make a save and the puck is loose right in front of you. Two opposing players are about to get to it before your team. Should you cover it or try to play it?",opts:["Always cover it","Read the situation — if two opponents are about to get it, cover it immediately. If your team has it, leave it for them.","Always leave it for your team","Kick it away"],ok:1,why:"The decision to freeze or play is a real read. If opponents are about to get to a dangerous rebound, cover it. If your team has control, leaving it lets them start the breakout faster.",tip:"Freeze or play? Read who's going to get it. Cover when opponents are closest."},
    {id:"u9g13",cat:"Goalie",concept:"Shooter body language",d:3,pos:["G"],sit:"A shooter is coming at you. You notice their shoulder is turned slightly toward the left side of the net before they shoot. What does this tell you?",opts:["Nothing — ignore it","They're likely shooting to your right — their body is opening to the left which usually means the shot goes right","They're going to deke","They'll pass"],ok:1,why:"Reading a shooter's body language — especially shoulder position — is an advanced skill that top goalies develop. A shoulder turning left often means the shot goes right because the body follows the shot direction.",tip:"Read the shooter's shoulders and hips before they release. They tell you where it's going."},
    {id:"u9g14",cat:"Goalie",concept:"Desperation save",d:3,pos:["G"],sit:"You're down and out of position — the shooter has a completely open net. You can't get back to your feet in time. What do you do?",opts:["Give up — it's a goal","Use whatever you can reach — your stick, your glove, your skate — to get something in the way. Any part of you in the lane is better than nothing.","Stay still","Call for help"],ok:1,why:"Desperation saves are real. Even if you're out of position, getting any part of your body or equipment into the shooting lane can change a goal into a save. Never stop until the whistle.",tip:"Out of position? Reach for it anyway. Desperate saves happen. Never quit."},
    {id:"u9g15",cat:"Goalie",concept:"Post-to-post movement",d:3,pos:["G"],sit:"The puck moves quickly from the left corner to the right corner. You were on your left post. What's the fastest way to get to the right post?",opts:["Skate slowly across the crease","Push off the left post and use a strong T-push or shuffle across — keep your eyes on the puck the whole time","Turn around and skate","Stay on the left post — it's too far"],ok:1,why:"A T-push off the post is the fastest way for a goalie to move across the crease. You push with your post foot and slide across, keeping your eyes on the puck.",tip:"Post-to-post: T-push off the near post. Stay low, eyes on puck. It's a race."},

    // === SEQUENCE ORDERING QUESTIONS ===
    {id:"u9seq1",cat:"Exiting the Zone",pos:["F","D"],concept:"Breakout basics",d:1,type:"seq",sit:"Your team's goalie stops the puck. Put the basic breakout steps in order.",items:["Goalie leaves the puck for the defenseman or makes a short pass","Wings skate to their lanes along the boards","D picks up the puck and looks up for an option","D passes to the open winger and the team moves up ice"],correct_order:[0,1,2,3],why:"A breakout starts with the goalie, then wings get open, D retrieves and reads, then makes the pass. Everybody has a job and the order matters.",tip:"Breakout: goalie starts it, wings get open, D reads, pass and go."},
    {id:"u9seq2",cat:"Shooting",pos:["F","D"],concept:"Shot sequence",d:1,type:"seq",sit:"You receive a pass in the offensive zone. Put the steps for taking a good shot in order.",items:["Receive the pass and control the puck","Get your head up and pick your target","Get the puck into shooting position on your stick","Release the shot at the target"],correct_order:[0,1,2,3],why:"A good shot starts with a clean reception. Then you look where to shoot, get the puck ready, and release. Rushing past the target-picking step means you're just throwing it at the net.",tip:"Catch it clean, pick your spot, set it up, let it go. Good shots follow a sequence."},
    {id:"u9seq3",cat:"Defense",pos:["F","D"],concept:"Defending a 2-on-1",d:2,type:"seq",sit:"You're the lone defender on a 2-on-1 rush. Put your defensive steps in order.",items:["Skate backward and get between the two attackers","Take away the pass by positioning your stick in the passing lane","Force the puck carrier to the outside","Trust your goalie to handle the shot"],correct_order:[0,1,2,3],why:"On a 2-on-1, the defender's job is to take away the pass and force a shot. Get position, stick in the lane, steer the shooter wide, and let the goalie do their job.",tip:"2-on-1 defense: get between, take the pass away, force wide, trust your goalie."},
    {id:"u9seq4",cat:"Transitioning",pos:["F","D"],concept:"Offensive transition",d:2,type:"seq",sit:"Your team just intercepted a pass in your own zone. Put the transition to offense in order.",items:["Recognize you have the puck — transition starts now","Puck carrier looks up for options","Forwards sprint up ice to create passing lanes","Pass ahead to a forward with speed through the neutral zone"],correct_order:[0,1,2,3],why:"Fast transitions catch the other team off guard. The moment you get the puck, everyone's job changes — recognize it, read options, create lanes, and move the puck quickly.",tip:"Got the puck? Transition now. Forwards go. Move it fast while they're caught flat."},
    {id:"u9seq5",cat:"Positioning",pos:["F","D"],concept:"Offensive zone positioning",d:2,type:"seq",sit:"Your team enters the offensive zone with the puck. Put the positioning steps in order.",items:["Puck carrier drives wide or deep","One forward goes to the net for screens and rebounds","Third forward supports high — near the top of the circles","Defensemen hold the blue line and keep the puck in"],correct_order:[0,1,2,3],why:"Good offensive zone structure means everyone has a role. Puck goes deep, someone covers the net, someone supports high, and D hold the line. Structure creates chances.",tip:"In the O-zone: puck deep, player at the net, support high, D on the line. Structure."},
    {id:"u9seq6",cat:"Teamwork",pos:["F","D"],concept:"Helping a teammate in trouble",d:1,type:"seq",sit:"Your teammate has the puck along the boards and two opponents are closing on them. Put the support steps in order.",items:["See that your teammate is in trouble","Skate toward them and get open for a pass","Call out 'I'm here!' so they know you're an option","Be ready to receive the puck and make a quick play"],correct_order:[0,1,2,3],why:"Good teammates read when someone needs help. See the trouble, get open, communicate, and be ready. That sequence turns a bad situation into a clean play.",tip:"Teammate in trouble? See it, get open, call for it, be ready. That's support."},
    {id:"u9seq7",cat:"Decision Making",pos:["F","D"],concept:"Zone entry decision",d:2,type:"seq",sit:"You're carrying the puck through the neutral zone toward the offensive blue line. Put your decision-making steps in order.",items:["Read the defender's position at the blue line","Check if teammates are available for a pass","Decide: carry it in, pass it in, or dump and chase","Execute your choice with speed and commitment"],correct_order:[0,1,2,3],why:"Zone entry is a read, not a guess. Read the D, check your options, pick the best one, and commit. Players who don't read first make bad entries.",tip:"At the blue line: read, check options, decide, commit. Don't guess — read."},
    {id:"u9seq8",cat:"Defense",pos:["F","D"],concept:"Penalty kill positioning",d:3,type:"seq",sit:"The other team gets a power play. Put your PK steps in order.",items:["Get into your box formation as the puck enters the zone","Stay in your zone — cover passing lanes, not players","Pressure the puck when it comes to your side of the box","Clear the puck out of the zone when you get the chance"],correct_order:[0,1,2,3],why:"The penalty kill is about structure and discipline. Get in the box, stay in your zone, pressure when it's your turn, and clear when you can. Chasing kills the PK.",tip:"PK: box up, stay in your zone, pressure your side, clear when you can."},

    // === SPOT THE MISTAKE QUESTIONS ===
    {id:"u9mis1",cat:"Transitioning",pos:["F","D"],concept:"Slow transition back",d:1,type:"mistake",sit:"Your team loses the puck at the other team's blue line. Two of your forwards keep skating toward the other team's net instead of turning back. The other team rushes 3-on-2. What's the mistake?",opts:["The defensemen were too deep","The forwards didn't transition back — when your team loses the puck, everyone turns around immediately. Staying in the offensive zone creates an odd-man rush against you.","The goalie should have come out","The coach should have called timeout"],ok:1,why:"Transition is instant. The moment the puck changes hands, your forwards must get back. Lingering in the offensive zone after a turnover gives the other team a numbers advantage.",tip:"Lost the puck? Turn around. Now. Every forward, every time."},
    {id:"u9mis2",cat:"Shooting",pos:["F","D"],concept:"Fancy deke instead of shooting",d:1,type:"mistake",sit:"You're in close to the net with a clear shot. Instead of shooting, you try a fancy deke move you saw on TV. You lose the puck. What's the mistake?",opts:["Your deke wasn't good enough","You had an open shot and didn't take it — when you have a clear look at the net, shoot. Trying to be fancy when a simple shot works is how you waste chances.","You should have passed","The goalie was too good"],ok:1,why:"A clear shot from close range is one of the best chances in hockey. Taking it is almost always better than trying something fancy. Shoot when you can score.",tip:"Clear shot? Take it. Don't try to be highlight-reel when simple works."},
    {id:"u9mis3",cat:"Positioning",pos:["F","D"],concept:"Cherry picking",d:1,type:"mistake",sit:"One of your teammates stays at center ice while the rest of the team is defending in your own zone. They're waiting for a long pass. Your team is defending 4 against 5. What's the mistake?",opts:["They're being smart and waiting for a breakaway","They're cherry picking — not helping on defense. Everyone needs to defend when the puck is in your zone. Hanging back leaves your team short-handed.","The coach told them to stay","They're too tired to skate back"],ok:1,why:"Cherry picking leaves your team playing 4-on-5 in the defensive zone. Even if you get the odd breakaway, the goals you give up from being short a player far outweigh it.",tip:"Everyone defends. No cherry picking. Help your team first, then attack together."},
    {id:"u9mis4",cat:"Exiting the Zone",pos:["F","D"],concept:"Panic clearing",d:2,type:"mistake",sit:"Your defenseman gets the puck behind your net. Under pressure, they blindly shoot it up the middle of the ice. An opposing player intercepts it at your blue line and scores. What's the mistake?",opts:["The D wasn't fast enough","They made a blind pass up the middle — under pressure, the safe play is the boards. Passing up the middle without looking is the most dangerous turnover in hockey.","The other players didn't call for it","The goalie should have played it"],ok:1,why:"A blind pass up the middle of the ice in your own zone is extremely dangerous. The safe play under pressure is always the boards — rim it out, chip it off the glass, or find a winger on the wall.",tip:"Under pressure in your zone? Use the boards. Never throw it up the middle blind."},
    {id:"u9mis5",cat:"Decision Making",pos:["F","D"],concept:"Holding the puck too long",d:2,type:"mistake",sit:"Your center picks up the puck and skates through the neutral zone. Three teammates are open for passes. Instead, they hold the puck until two defenders close on them and strip it away. What's the mistake?",opts:["They should have skated faster","They held the puck too long — with three open teammates, making a pass early creates a much better play than trying to carry through traffic. Read and move the puck.","Their teammates weren't calling for it","The defenders got lucky"],ok:1,why:"Holding the puck when teammates are open is a common mistake. The puck moves faster than any skater. Making the pass early when options are available keeps the play moving.",tip:"Open teammates? Move the puck. The puck is always faster than your skates."},
    {id:"u9mis6",cat:"Defense",pos:["F","D"],concept:"Puck watching in the D-zone",d:2,type:"mistake",sit:"In the defensive zone, your winger watches the puck on the other side of the ice. Meanwhile, the player they should be covering sneaks behind them and gets a wide-open pass for a goal. What's the mistake?",opts:["The goalie should have saved it","The winger was puck watching instead of covering their player — in the D-zone, you need to know where your player is at all times, not just stare at the puck","The defenseman should have helped","The pass was too good to stop"],ok:1,why:"Puck watching in the defensive zone is one of the most common mistakes. You need to track both the puck and your man. If you lose your man, they get open for an easy chance.",tip:"D-zone: know where your man is. Watch the puck AND your check. Lose your man, lose the game."},
    {id:"u9mis7",cat:"Teamwork",pos:["F","D"],concept:"Not talking on ice",d:1,type:"mistake",sit:"Your teammate has the puck behind the net. A forechecker is coming hard from the left. Your teammate can't see them. Nobody on your team says anything. Your teammate gets hit and loses the puck. What's the mistake?",opts:["The teammate should have eyes in the back of their head","Nobody communicated — someone should have yelled 'man on left!' to warn their teammate about the pressure coming. Communication prevents turnovers.","The forechecker was too fast","The teammate should have passed sooner"],ok:1,why:"Communication saves possession. A simple 'man on!' call gives your teammate time to protect the puck or make a play. Silent teams give up easy turnovers.",tip:"See pressure coming at a teammate? Call it out. 'Man on!' saves the play."},
    {id:"u9mis8",cat:"Positioning",pos:["F","D"],concept:"Offside trap",d:2,type:"mistake",sit:"Your team is entering the offensive zone. The puck carrier slows down at the blue line, but two teammates have already crossed into the zone ahead of the puck. The whistle blows for offside. What's the mistake?",opts:["The puck carrier was too slow","The two teammates entered the zone before the puck — the puck must cross the blue line first. Players without the puck need to time their entry and stay onside.","The ref made a bad call","The blue line is confusing"],ok:1,why:"Offside kills momentum and gives the puck away. Players entering the zone need to watch the puck carrier and time their entry so the puck crosses the line first.",tip:"Entering the zone? Watch the puck. Don't cross the line until it does. Stay onside."},

    // === WHAT HAPPENS NEXT QUESTIONS ===
    {id:"u9next1",cat:"Decision Making",pos:["F","D"],concept:"Goalie out of position",d:2,type:"next",sit:"You're in the slot with the puck. The goalie just made a save on the other side and is sliding back. They're not set yet. You have a clear look at the open side of the net. What happens next?",opts:["You wait for the goalie to get set","You pass to a teammate","You shoot immediately at the open side — the goalie is out of position and you have the net to shoot at","You skate closer first"],ok:2,why:"When a goalie is out of position and you have a clear look, shoot immediately. Every fraction of a second you wait is a fraction they use to recover. Quick release scores.",tip:"Goalie moving and you have the open side? Shoot now. Don't wait. They're recovering."},
    {id:"u9next2",cat:"Transitioning",pos:["F","D"],concept:"Turnover at their blue line",d:2,type:"next",sit:"The other team tries to clear the puck out of their zone but your defenseman intercepts it at their blue line. Their forwards are all deep in their zone. What happens next?",opts:["Your D shoots from the blue line immediately","Your D passes to a forward who's driving the net — their team is caught deep and your forwards should be attacking with speed","Your D passes it back to your goalie","Everyone stops and regroups"],ok:1,why:"An interception at the blue line with the other team caught deep is a prime scoring chance. Get the puck to a forward driving the net before they can recover their positions.",tip:"Interception at their blue line? Attack fast. Get it to the forwards. They're caught."},
    {id:"u9next3",cat:"Defense",pos:["F","D"],concept:"Breakaway developing",d:2,type:"next",sit:"An opposing forward gets past your defensemen and has a clear path to your net. You're the closest forward and you're behind them but skating hard. You can't catch them. What happens next?",opts:["You give up — they're gone","You keep skating hard and try to get your stick in the shooting lane — even a stick in the lane can disrupt the shot or force a wider angle","You yell at your defensemen","You coast back slowly"],ok:1,why:"Even if you can't catch the breakaway, closing the gap and getting your stick in the lane can disrupt the shot, force a bad angle, or make the shooter rush. Never stop chasing.",tip:"Can't catch the breakaway? Get your stick in the lane anyway. Every bit of pressure helps."},
    {id:"u9next4",cat:"Shooting",pos:["F","D"],concept:"Screen in front",d:2,type:"next",sit:"You have the puck at the point. Two of your teammates are standing in front of the goalie, blocking their view. The goalie can't see you. What happens next?",opts:["You pass to the corner","You shoot through the screen — the goalie can't see the puck, so even a low shot through traffic has a great chance of going in or creating a rebound","You skate in closer","You wait for a better passing lane"],ok:1,why:"A shot through a screen is one of the most effective plays in hockey. The goalie can't track what they can't see. Low shots through traffic create goals and rebounds.",tip:"Teammates screening the goalie? Shoot low through the traffic. They can't stop what they can't see."},
    {id:"u9next5",cat:"Exiting the Zone",pos:["F","D"],concept:"Breakout under pressure",d:2,type:"next",sit:"Your D has the puck behind the net. Two forecheckers are coming from both sides. Your center is open in the middle of the ice, but the middle is risky. Your winger is on the wall. What happens next?",opts:["D tries to carry it out alone","D makes the safe play and passes to the winger on the wall — the middle is too risky with two forecheckers closing, and the boards are the safe route out","D shoots it down the ice","D freezes the puck"],ok:1,why:"Under heavy forecheck pressure, the boards are the safe play. The middle of the ice is where turnovers turn into goals against. Get it to the winger on the wall and live to attack another day.",tip:"Pressure from both sides? Go to the wall. The boards are your friend under pressure."},
    {id:"u9next6",cat:"Teamwork",pos:["F","D"],concept:"Line change opportunity",d:1,type:"next",sit:"Your team dumps the puck into the offensive zone. Your line has been on the ice for over a minute and everyone is tired. The other team is retrieving the puck behind their net. What happens next?",opts:["You forecheck hard even though you're tired","Your line changes — the puck is deep in their zone and they're behind their net, so this is the perfect time for a line change. Fresh legs coming on.","You stand still and rest on the ice","You call timeout"],ok:1,why:"A dump-in with the other team retrieving behind their net is the ideal time to change. Fresh legs are always better than tired legs trying to forecheck. Smart changes win games.",tip:"Puck dumped deep and you're gassed? Change. Fresh legs over tired legs, every time."},
    {id:"u9next7",cat:"Decision Making",pos:["F","D"],concept:"3-on-2 developing",d:3,type:"next",sit:"Your team has a 3-on-2. The puck carrier drives wide and draws one defender. The second defender is cheating toward the puck carrier too, leaving the far-side forward wide open. What happens next?",opts:["Puck carrier keeps going alone","Puck carrier sees the second defender cheat and makes the cross-ice pass to the wide-open forward for a high-quality scoring chance","Puck carrier dumps it in","Puck carrier stops and waits"],ok:1,why:"When both defenders commit to the puck carrier, the far-side forward is wide open. The cross-ice pass in this situation is the highest-percentage play because the goalie can't get across in time.",tip:"Both D cheat to you on a 3-on-2? Cross-ice pass to the open man. Goalie can't get there."},

    // === TRUE/FALSE QUESTIONS ===
    {id:"u9tf1",cat:"Decision Making",pos:["F","D"],concept:"Dump every time",d:1,type:"tf",sit:"You should always dump the puck into the offensive zone instead of carrying it in.",ok:false,why:"Dumping is one option, but if you have speed and space, carrying it in keeps possession and creates better chances. Read the situation — dump when you have to, carry when you can.",tip:"Dump or carry? Read the defense. Carry when you can, dump when you must."},
    {id:"u9tf2",cat:"Defense",pos:["F","D"],concept:"Forwards backcheck",d:1,type:"tf",sit:"Forwards should skate back hard to help on defense when the other team has the puck.",ok:true,why:"Backchecking is every forward's responsibility. A forward who doesn't backcheck leaves the team short in the defensive zone and creates odd-man rushes against.",tip:"Forwards backcheck. Period. It's not optional. Your team needs you back there."},
    {id:"u9tf3",cat:"Shooting",pos:["F","D"],concept:"Always top corner",d:2,type:"tf",sit:"You should always aim for the top corner of the net when you shoot.",ok:false,why:"Top corner is a great target, but low shots create rebounds, five-hole shots catch goalies off guard, and sometimes a quick release matters more than perfect placement. Read the situation.",tip:"Top corner isn't the only option. Low shots, far side, five-hole — read the goalie and pick the best target."},
    {id:"u9tf4",cat:"Positioning",pos:["F","D"],concept:"Spread out on offense",d:1,type:"tf",sit:"In the offensive zone, your team should spread out and use the whole ice instead of bunching up near the puck.",ok:true,why:"Spreading out creates passing lanes, opens up space, and makes it harder for the defense to cover everyone. Bunching up makes the defense's job easy — they can cover everyone at once.",tip:"Use the whole ice on offense. Spread out. Bunching up helps the other team, not yours."},
    {id:"u9tf5",cat:"Teamwork",pos:["F","D"],concept:"Communication helps",d:1,type:"tf",sit:"Calling out 'man on!' when a teammate is about to get hit helps your team keep the puck.",ok:true,why:"A 'man on' call gives your teammate a split second to protect the puck, make a pass, or brace for contact. That one call can be the difference between keeping possession and a turnover.",tip:"'Man on!' saves the play. One call, one second of warning, total difference."},
    {id:"u9tf6",cat:"Exiting the Zone",pos:["F","D"],concept:"Middle ice is always safe",d:2,type:"tf",sit:"When breaking out of your own zone, passing up the middle of the ice is always the safest play.",ok:false,why:"The middle of the ice in your own zone is the most dangerous area for a turnover. A picked-off pass in the middle goes straight to the slot. The boards are the safe breakout route.",tip:"Middle ice in your own zone is danger. Use the boards to break out safely."},
    {id:"u9tf7",cat:"Transitioning",pos:["F","D"],concept:"Transition is instant",d:1,type:"tf",sit:"When your team loses the puck, you should immediately start skating back toward your own net.",ok:true,why:"Transition defense is instant. Every second you wait is a step the other team gains. The fastest backchecking teams give up the fewest goals on the rush.",tip:"Lose the puck? Instant backcheck. No thinking. No watching. Go."},
  ],
  "U11 / Atom":[
    {id:"u11q1",cat:"Rush Reads",pos:["F","D"],concept:"2-on-1 basic",d:1,sit:"You're on a 2-on-1. You have the puck. The defender is right in front of you. Your teammate is wide open. What do you do?",opts:["Shoot right away","Pass to your open teammate","Slow down and wait","Dump it in the corner"],ok:1,why:"When you have a 2-on-1 and the defender takes you, your open teammate is the play.",tip:"2-on-1: If the D takes you, pass."},
    {id:"u11q2",cat:"Coverage",pos:["F","D"],concept:"Find your man",d:1,sit:"The other team has the puck in your defensive zone. What's the most important thing every player on your team should be doing?",opts:["Watching the puck","Finding a man to cover","Skating to the blue line","Waiting for a turnover"],ok:1,why:"In your defensive zone, every player needs to find a man. Watching the puck without picking up a check is how goals happen.",tip:"Own zone: find your man first. Then watch the puck."},
    {id:"u11q3",cat:"Blue Line Decisions",pos:["D"],concept:"Keep puck in",d:1,sit:"Your team has the puck in the offensive zone. It's sliding toward the blue line. You're the defenseman. What do you do?",opts:["Let it go out","Skate to the puck and keep it in the zone","Back up to give room","Go to the net"],ok:1,why:"Keeping the puck in the offensive zone is the defenseman's first job.",tip:"Puck going to the line? Keep it in. That's your job as D."},
    {id:"u11q4",cat:"Offensive Pressure",pos:["F"],concept:"Forecheck basics",d:1,sit:"Your team is forechecking. The opposing D just picked up the puck behind their net. You're the first forward in. What's your goal?",opts:["Get the puck no matter what","Put pressure on the D so they can't make an easy breakout pass","Wait for your teammates before moving","Skate back to center ice"],ok:1,why:"The first forward on the forecheck pressures the puck carrier to take away easy options and force a mistake.",tip:"Forechecking: pressure the D. Take away their easy out."},
    {id:"u11q5",cat:"Transition",pos:["F","D"],concept:"Transition basics",d:1,sit:"Your team just lost the puck in the offensive zone. The other team is breaking out. What should every forward on your team do immediately?",opts:["Stay in the offensive zone and wait","Turn around and skate back toward your own zone","Stop and call for a pass","Stand still and watch"],ok:1,why:"The instant your team loses possession, every forward transitions back. Not eventually — immediately.",tip:"Lost the puck? Turn around. Right now."},
    {id:"u11q6",cat:"Puck Protection",pos:["F","D"],concept:"Body position",d:1,sit:"You have the puck along the boards and a defender is coming at you from behind. What's the right thing to do with your body?",opts:["Turn to face the defender","Put your body between the defender and the puck","Spin and try to skate through them","Pass immediately before they arrive"],ok:1,why:"Puck protection is about body position. Getting your body between the puck and the defender gives you time to make a play.",tip:"Defender behind you? Get your body between them and the puck."},
    {id:"u11q7",cat:"Gap Control",pos:["D"],concept:"Gap basics",d:1,sit:"You're a defender and an attacker is coming at you with the puck. You're backing up. Should you give them a lot of space or a little?",opts:["A lot of space — give them room","A steady controlled gap — not too much, not too little","No space — close on them immediately","It doesn't matter"],ok:1,why:"Gap control means maintaining the right distance. Too much space lets them get speed and options. Too little and they go around you.",tip:"Gap control: close enough to be a threat, far enough to react."},
    {id:"u11q8",cat:"Special Teams",pos:["F","D"],concept:"PP basics",d:1,sit:"Your team is on the power play. You have the extra skater. What's the most important thing you have that the other team doesn't?",opts:["Faster players","One more player on the ice","A better goalie","The home crowd"],ok:1,why:"The power play advantage is the extra skater. Every decision should exploit that — move the puck to find the player who isn't covered.",tip:"Power play: you have the extra man. Find them."},
    {id:"u11q9",cat:"Decision Timing",pos:["F","D"],concept:"Simple decisions",d:1,sit:"You receive the puck in your own zone with a forechecker right on you. Your D partner is five feet away and completely open. What do you do?",opts:["Try to skate out yourself","Pass immediately to your open D partner","Shoot the puck down the ice","Wait for a better option"],ok:1,why:"The open D partner five feet away is the easy, correct play. Under pressure the simple play is almost always right.",tip:"Open partner right beside you? Give it to them. Simple."},
    {id:"u11q10",cat:"Cycle Play",pos:["F"],concept:"Why cycle",d:1,sit:"Your team has the puck below the dots in the offensive zone. Why is it good to cycle the puck down low rather than always shooting from outside?",opts:["It wastes time","It gets your team closer to the net and creates better scoring chances","It makes the game boring","It helps the other team"],ok:1,why:"Cycling below the dots draws defenders away from the net, creates open shooting lanes, and generates rebounds close to the crease.",tip:"Cycle: closer to the net = better chances."},
    {id:"u11q11",cat:"Exiting the Zone",pos:["F","D"],concept:"Breakout basics",d:1,sit:"Your defenseman picks up the puck in your own corner. As a winger, where should you immediately skate to?",opts:["Into the corner to help","Up the boards — give the D an outlet","To the front of your own net","To center ice"],ok:1,why:"The winger's breakout job is to get up the wall fast and give the defenseman an outlet option.",tip:"D in the corner? You go up the wall. Get open."},
    {id:"u11q12",cat:"Special Teams",pos:["F","D"],concept:"PK basics",d:1,sit:"Your team is on the penalty kill. The power play has set up in your zone. What's your team's main job?",opts:["Score a shorthanded goal","Keep the puck away from dangerous areas and get it out of your zone","Stay in a tight group in front of the net","Challenge every pass aggressively"],ok:1,why:"The penalty kill's job is to keep the puck out of dangerous areas and clear the zone.",tip:"Penalty kill: protect danger areas and get it out."},
    {id:"u11q13",cat:"Rush Reads",pos:["F","D"],concept:"Trailer role",d:1,sit:"Your team rushes 3-on-2. The two defenders take your two wingers. You're the trailing center. Where do you position?",opts:["Race to the net as fast as possible","Stay high and be ready for a drop pass or rebound shot","Skate to the corner","Stop at the red line"],ok:1,why:"The trailer on a 3-on-2 stays high — ready for a drop pass if the play breaks down or to get a rebound shot from the top.",tip:"Trailer on a rush: stay high. You're the safety and the extra option."},
    {id:"u11q14",cat:"Coverage",pos:["F","D"],concept:"Weak side awareness",d:1,sit:"The puck is in the offensive zone corner on your left. You're the right winger. You don't have the puck. Where should you be?",opts:["In the corner helping your teammate","On the right side near the net, ready for a cross-ice pass","At the blue line","On the bench"],ok:1,why:"As the weak-side winger, staying on your side near the net puts you in position for a cross-ice pass.",tip:"Puck in the far corner? Stay weak side near the net."},
    {id:"u11q15",cat:"Decision Timing",pos:["F","D"],concept:"Time and space",d:1,sit:"You receive a pass in the offensive zone with nobody near you. You have lots of time. What should you do before shooting or passing?",opts:["Shoot immediately no matter what","Look up and read what's happening — find the best play","Skate to the corner","Pass backward to the blue line"],ok:1,why:"When you have time and space, use it. Looking up before making your play is what separates reactive players from smart ones.",tip:"Got time? Look up first. Read the ice. Then play."},
    {id:"u11q16",cat:"Rush Reads",pos:["F","D"],concept:"2-on-1 timing",d:2,sit:"You're the puck carrier on a 2-on-1. The lone defender is backing up in the middle, not committing to either side. What do you do?",opts:["Pass immediately since it's a 2-on-1","Drive wide to force the defender to fully commit first, then decide","Shoot from where you are","Pull up and regroup"],ok:1,why:"If the defender isn't committing, you haven't created the advantage yet. Drive wide to force their decision.",tip:"Defender not committing? Make them. Drive wide first."},
    {id:"u11q17",cat:"Rush Reads",pos:["F","D"],concept:"3-on-2 middle lane",d:2,sit:"Your team rushes 3-on-2. Both defenders take your two wingers. The middle lane is completely open. You're the center. What do you do?",opts:["Pass to the right winger","Pass to the left winger","Drive the middle lane and shoot — the defenders opened it for you","Pull up and regroup"],ok:2,why:"When both defenders go to the wings, they've given you the middle. Driving the lane and shooting catches the goalie off-guard.",tip:"Both D go wide on a 3-on-2? Drive the middle. Shoot."},
    {id:"u11q18",cat:"Rush Reads",pos:["F","D"],concept:"Rush regroup",d:2,sit:"Your team is on a rush but you're outnumbered — 2-on-3 against you. What's the right call?",opts:["Attack anyway — speed is on your side","Pull up, regroup, and get set up properly","Dump it in and chase","Pass back to the blue line"],ok:1,why:"Attacking a 3-on-2 against you gives the other team the transition they want. Pulling up and regrouping resets the play on your terms.",tip:"Outnumbered on the rush? Pull up. Don't attack into a trap."},
    {id:"u11q19",cat:"Coverage",pos:["F","D"],concept:"Corner coverage",d:2,sit:"The puck goes into the corner in your defensive zone. You're the nearest forward. Your D is already there. What do you do?",opts:["Go help in the corner — two players are better","Hold the front of the net — don't leave it empty","Go to the blue line","Skate to center ice"],ok:1,why:"When your D goes to the corner, you hold the front of the net. Two players in the corner leaves the crease empty.",tip:"D goes to the corner? You hold the net front. Don't follow them in."},
    {id:"u11q20",cat:"Coverage",pos:["F","D"],concept:"Center coverage",d:2,sit:"Three attackers enter your zone. You're the center on defense. Your two wingers pick up the two opposing wingers. Who do you cover?",opts:["The puck","The opposing center","The open space in the slot","Go help a winger"],ok:1,why:"In standard defensive zone coverage, the center picks up the opposing center.",tip:"Three attackers in your zone? As center, you've got their center."},
    {id:"u11q21",cat:"Blue Line Decisions",pos:["D"],concept:"Pinch risk",d:2,sit:"You're the defenseman at the offensive blue line. The puck goes to the corner. Your nearest winger is there but about to get pressured. No coverage behind you. Should you pinch?",opts:["Yes — go help your winger","No — hold the blue line. If your winger loses the puck you'll be caught deep.","Go to the net front","Skate behind the net"],ok:1,why:"Pinching when there's no coverage behind you and your winger is under pressure is high-risk. If the puck turns over, you're caught deep with a 2-on-1 against you.",tip:"No coverage behind you? Don't pinch. Hold the line."},
    {id:"u11q22",cat:"Blue Line Decisions",pos:["D"],concept:"D-to-D pass",d:2,sit:"You're the right defenseman in the offensive zone. A defender is closing on you hard. Your D partner on the left side is wide open. What do you do?",opts:["Hold the puck and try to beat the pressure","Make a quick D-to-D pass to your partner — they're open and you're not","Shoot the puck through traffic","Pass back into the corner"],ok:1,why:"Under pressure at the point, the D-to-D pass is the reset. Your partner has time and a better look.",tip:"Pressure coming? D-to-D. Let your partner reset the play."},
    {id:"u11q23",cat:"Blue Line Decisions",pos:["D"],concept:"Shooting through traffic",d:2,sit:"You're the defenseman at the point on the power play. The slot is full of traffic. You have a shooting lane to the net. What do you do?",opts:["Hold the puck and wait for traffic to clear","Shoot immediately — traffic in front means screens and rebounds","Pass cross-ice to the other point","Skate in yourself"],ok:1,why:"Traffic in front of the net is an asset, not a problem. Shoot through it — the screen blocks the goalie's view and the traffic creates rebounds.",tip:"Traffic in front? Shoot. That's exactly what you want."},
    {id:"u11q24",cat:"Offensive Pressure",pos:["F"],concept:"High forward 2-1-2",d:2,sit:"Your team is in a 2-1-2 forecheck. The puck is in the corner. As the high forward, where do you position?",opts:["Go into the corner and chase the puck","Stay high between the two defensemen — cut off passes and take away the middle","Go to the net front","Back up to the blue line"],ok:1,why:"In a 2-1-2 forecheck, the high forward cuts off outlet passes through the middle.",tip:"High forward in a 2-1-2: sit between the D. Cut off the middle outlet."},
    {id:"u11q25",cat:"Offensive Pressure",pos:["F"],concept:"Forecheck angles",d:2,sit:"You're forechecking. The D picks up the puck behind the net and looks to the left winger up the wall. What's your angle?",opts:["Go straight at the D as fast as possible","Cut off the pass to the left — force the D to go right instead","Stop and let them make the pass","Back off completely"],ok:1,why:"Forechecking with angles means reading where the D wants to go and cutting that off.",tip:"Forecheck: read where they want to go. Cut it off."},
    {id:"u11q26",cat:"Transition",pos:["F","D"],concept:"Weak-side entry",d:2,sit:"Your team is entering the offensive zone. Two defenders are both already back. You're the center. What's the best thing you can do?",opts:["Drive straight to the net","Peel off and go to the weak side — create a triangle of options","Stop at the blue line","Go to the corner with the puck carrier"],ok:1,why:"When two defenders are back, you need to spread them out. Going weak side as the center creates a triangle that forces the defense to split.",tip:"Two D back? Go weak side and stretch the defense."},
    {id:"u11q27",cat:"Transition",pos:["F","D"],concept:"Neutral zone delay",d:2,sit:"Your team is in the neutral zone with the puck. The other team has three players sitting back. What's the best way to attack?",opts:["Skate at them full speed","Delay — use a D-to-D pass or drop pass to find a lane that opens up","Dump the puck in immediately","Regroup and come back the same way"],ok:1,why:"Three players waiting is designed to stop straight-line rushes. Delaying and using lateral movement creates a different angle of attack.",tip:"Three players waiting? Delay and find a lane."},
    {id:"u11q28",cat:"Puck Protection",pos:["F","D"],concept:"Chip off boards",d:2,sit:"You have the puck in the corner. A defender has you pinned against the boards. Your winger is at the half-wall. What do you do?",opts:["Try to power through the defender","Use a quick spin move or chip the puck off the boards to your winger","Try to pass between their legs","Fall down to draw a penalty"],ok:1,why:"When you're pinned, use a chip pass off the boards or a spin to create separation and move the puck.",tip:"Pinned in the corner? Chip it off the boards to your teammate."},
    {id:"u11q29",cat:"Puck Protection",pos:["F","D"],concept:"Reverse behind net",d:2,sit:"You're behind your own net with the puck. A forechecker is coming around the left side. Your left D is covered. Your right D is open. What do you do?",opts:["Try to carry it out to the left","Spin to the right and find your open defenseman","Stop and wait for the forechecker","Shoot it down the ice"],ok:1,why:"Reading which side the pressure is coming from and reversing to the open side is basic puck protection under pressure.",tip:"Forechecker coming from the left? Spin right. Go where they're not."},
    {id:"u11q30",cat:"Gap Control",pos:["D"],concept:"Closing gap",d:2,sit:"You've been backing up and the attacker is now near the top of your face-off circles. They haven't shot or passed yet. What do you do?",opts:["Keep backing up indefinitely","Close the gap slightly — you've given them enough space. Force them to make a play.","Turn and race toward your own net","Poke check from where you are"],ok:1,why:"Backing up forever isn't gap control — it's retreating. At some point you have to close and force the attacker's hand.",tip:"You've backed up enough. Close the gap and force a decision."},
    {id:"u11q31",cat:"Gap Control",pos:["D"],concept:"Angling to boards",d:2,sit:"An attacker is carrying the puck along the right boards. You're the defenseman. You want to angle them into the corner. Which direction should you push them?",opts:["Toward the middle of the ice","Into the corner toward the boards","Straight backward toward your net","It doesn't matter"],ok:1,why:"Angling means steering the puck carrier away from the dangerous middle and into the corner.",tip:"Angling: push them to the boards, away from the middle."},
    {id:"u11q32",cat:"Special Teams",pos:["F","D"],concept:"PP move early",d:2,sit:"Your team has a power play in a 1-3-1. The puck is at the top. A penalty killer closes on the top player hard. What should the top player do?",opts:["Hold the puck and fight through the pressure","Move the puck quickly before the pressure arrives — pass to the half-wall or the other side","Shoot under pressure","Back up to the red line"],ok:1,why:"On the power play, moving the puck before pressure arrives is the key. One extra skater means someone is always open.",tip:"PP with pressure coming? Move the puck early. Someone is open."},
    {id:"u11q33",cat:"Special Teams",pos:["F","D"],concept:"PP net-front",d:2,sit:"Your team is on the power play. A shot comes from the point. You're standing in front of the net. What's your job on that shot?",opts:["Get out of the way so the goalie can see","Screen the goalie and be ready to tip or deflect the shot","Skate to the corner for the rebound","Back off to the half-wall"],ok:1,why:"The net-front player on the power play screens the goalie and tips shots. Getting out of the way defeats the purpose of being there.",tip:"Net front on the PP: screen the goalie and get ready to tip."},
    {id:"u11q34",cat:"Special Teams",pos:["F","D"],concept:"PK timing challenges",d:2,sit:"You're on the penalty kill. The power play is cycling below the dots but not shooting. When should you challenge?",opts:["Immediately every time the puck moves","When they slow down or seem to be setting up a shot — not on every pass","Every time they're near the boards","Never — just stay back"],ok:1,why:"On the PK, challenging on every pass runs you out of position. Pick your moments.",tip:"PK: don't bite on every pass. Pick your moment. Challenge when it counts."},
    {id:"u11q35",cat:"Decision Timing",pos:["F","D"],concept:"Shoot the out-of-position goalie",d:2,sit:"You receive the puck at the half-wall. The goalie is slightly out of position and you have a shooting lane. What do you do?",opts:["Pass to a breaking winger","Shoot at the exposed net immediately","Hold the puck and wait","Pass back to the point"],ok:1,why:"An out-of-position goalie with a shooting lane is an opportunity. Shoot before they recover.",tip:"Goalie out of position with a lane? Shoot. Right now."},
    {id:"u11q36",cat:"Decision Timing",pos:["F","D"],concept:"Protect under dual pressure",d:2,sit:"You have the puck in the offensive zone. Two defenders are collapsing on you from both sides. You have no open teammates. What do you do?",opts:["Try to deke through both defenders","Protect the puck along the boards and wait for a teammate to support","Pass blindly into traffic","Shoot from where you are"],ok:1,why:"When two defenders collapse on you and there's nobody open, protecting the puck and waiting for support is smarter than forcing a bad play.",tip:"Two defenders collapsing and nobody open? Protect it. Wait for support."},
    {id:"u11q37",cat:"Cycle Play",pos:["F"],concept:"Cycling purpose",d:2,sit:"Your team is cycling in the offensive zone. The defenders are staying tight to the net. What should the cycling players be trying to create?",opts:["Time of possession for its own sake","A gap or opening — a shot lane, a pass to the slot, or a player breaking to the net","Confusion by passing as fast as possible","A penalty by forcing contact"],ok:1,why:"Cycling isn't just possession — it's designed to create something. Possession without purpose is just skating.",tip:"Cycle: you're looking for the opening. Possession is the means, not the goal."},
    {id:"u11q38",cat:"Cycle Play",pos:["F"],concept:"Board pass in cycle",d:2,sit:"You're low in the corner with the puck. Your winger is at the half-wall. A defender is pressuring you hard from behind. What do you do?",opts:["Try to power through and hold the puck","Bank a quick pass off the boards to your half-wall winger","Spin and try to skate into open ice","Shoot from the corner"],ok:1,why:"A quick board pass to the half-wall winger is the reliable escape when you're being pressured in the corner. The boards are your extra teammate.",tip:"Pressured in the corner? Bank it off the boards to the half-wall. Use the boards."},
    {id:"u11q39",cat:"Exiting the Zone",pos:["F","D"],concept:"Quick breakout",d:2,sit:"Your team wins a puck battle in your own corner. The other team's forecheckers are still coming hard. What's the fastest way out?",opts:["Hold the puck and wait for them to stop","Move the puck quickly — first open option up the wall or through the middle","Rim it around the boards","Shoot it down the ice for icing"],ok:1,why:"When forecheckers are bearing down, speed of decision matters more than finding the perfect option. First clean outlet — take it.",tip:"Forecheckers coming fast? Move the puck. First clean option. Go."},
    {id:"u11q40",cat:"Exiting the Zone",pos:["F","D"],concept:"Forechecker committed",d:2,sit:"Your D picks up the puck behind your net. One forechecker is coming around the right side. Your right winger is up the wall. Your left winger is covered. What's the breakout pass?",opts:["Force the pass to the covered left winger","Pass to the right winger — they're open and the forechecker has committed to that side","Carry it out yourself","Rim it around the boards"],ok:1,why:"The forechecker coming from the right creates a brief opening on that same side — the winger who got up the right wall is open because the forechecker has already committed.",tip:"Forechecker committed to one side? The outlet on that same side may be the cleanest."},
    {id:"u11q41",cat:"Rush Reads",pos:["F","D"],concept:"Goalie reads the 2-on-1",d:3,sit:"You're the puck carrier on a 2-on-1. The defender commits fully to your teammate. The goalie slides across expecting your pass. What's the right call now?",opts:["Pass to your teammate as planned","Shoot — the goalie has moved and there's a lane on your side","Pass to the other side","Pull up and regroup"],ok:1,why:"When the defender commits to your teammate AND the goalie slides to take away the pass, they've left your side open. Shoot — the goalie has moved.",tip:"2-on-1: if the goalie chases the pass, shoot becomes the right play. Read the goalie."},
    {id:"u11q42",cat:"Rush Reads",pos:["F","D"],concept:"3-on-2 D split",d:3,sit:"Your team turns the puck over in the offensive zone. The other team breaks out with a 3-on-2 against you. You're the far defenseman. The puck carrier is coming up your side. What's your priority?",opts:["Rush the puck carrier","Take your side, force the carrier wide, and trust your partner to take the middle player","Back up to the crease","Chase the trailer"],ok:1,why:"On a 3-on-2, the two D split responsibility. You take your side and force the carrier wide — your partner protects the middle.",tip:"3-on-2 against you: each D takes a side. Don't cross unless called."},
    {id:"u11q43",cat:"Rush Reads",pos:["F","D"],concept:"Backcheck weak side",d:3,sit:"Your team turns the puck over. The other team has a 2-on-1 and you're the only forward close enough to get back. You can't catch the puck carrier. What do you do?",opts:["Skate as fast as you can directly at the puck carrier","Skate back hard on the weak side — get between the second attacker and the net","Stop skating — you can't help","Go to the bench for a line change"],ok:1,why:"You can't catch the puck carrier, but you can take away the pass option on the weak side.",tip:"Can't catch the puck carrier? Get to the weak side. Take away the pass."},
    {id:"u11q44",cat:"Coverage",pos:["F","D"],concept:"Overload coverage",d:3,sit:"Three attackers enter your zone. They overload the left side — two attackers on the left and one on the right. Both your D are back. How should they adjust?",opts:["Both D go to the left to cover the two attackers","One D takes the two on the left, the other holds the middle and takes the weak-side attacker — both D communicate","Both D go to the right","One D goes behind the net"],ok:1,why:"An overload means the D have to communicate and adjust. One D takes the strong side with two attackers, while the partner takes the weak-side player and the slot.",tip:"Overload coverage: communicate. One takes the strong side, the other holds the middle and weak side."},
    {id:"u11q45",cat:"Coverage",pos:["F","D"],concept:"Late attacker uncovered",d:3,sit:"Two attackers entered your zone and both D picked them up. A third attacker trails in 5 seconds later — nobody picked them up. You're the center on defense. What do you do?",opts:["Stay with your current assignment","Pick up the late attacker — your winger on that side needs to find their assignment","Call it out and let someone else handle it","Ignore it — your D will figure it out"],ok:1,why:"A late attacker entering the zone creates a coverage breakdown. The center needs to pick them up or communicate a switch.",tip:"Late attacker uncovered? Call it and pick them up. Coverage gaps get exploited."},
    {id:"u11q46",cat:"Blue Line Decisions",pos:["D"],concept:"When to pinch advanced",d:3,sit:"You're the offensive zone D. The puck went to the corner. Your winger got there first and has possession, but a defender is closing. No coverage behind you. Your other winger is at the half-wall. Should you pinch?",opts:["Yes — go help your winger in the corner","No — your winger has possession and your half-wall winger can support. Hold the blue line.","Yes — any time there's a puck battle, pinch","Go to the net front instead"],ok:1,why:"Your winger has possession and the half-wall winger can support. You don't need to go. Pinching here with no coverage behind you risks a breakout against you.",tip:"Winger has it and half-wall can help? Hold the line."},
    {id:"u11q47",cat:"Blue Line Decisions",pos:["D"],concept:"Shot fake PP",d:3,sit:"You're the point on the power play. You have the puck and a shooting lane — but two PK forwards are closing on you hard. You have one second. What's the best play?",opts:["Shoot immediately before they close","Fake the shot to freeze them, then pass to the half-wall player who opened up when they committed to you","Hold the puck and wait for a lane","Pass back to the other point"],ok:1,why:"When two PK players commit to you, they've left someone open. A shot fake freezes them for a split second — the half-wall opens up the instant they both lean at you.",tip:"Two PKers closing? Fake the shot. Someone opened up when they committed."},
    {id:"u11q48",cat:"Offensive Pressure",pos:["F"],concept:"Two-man forecheck trap",d:3,sit:"You're forechecking. The D picks up the puck behind the net and starts to walk out to the left. You're closing from the right. Your linemate is on the left. How do you split?",opts:["Both go directly at the D","You force the D's direction from the right, your linemate cuts off the outlet to the left — trap them between you","You back off and let your linemate handle it","Both back off and reset"],ok:1,why:"A two-player forecheck trap works by forcing the puck carrier in a direction while the other player cuts off the outlet in that direction.",tip:"Two-man forecheck: one forces, one cuts the outlet. Trap them."},
    {id:"u11q49",cat:"Offensive Pressure",pos:["F"],concept:"High forward intercept",d:3,sit:"Your team is forechecking and the other team wins a battle in the corner. They're about to break out with speed. You're the high forward. What's the most important thing you do right now?",opts:["Chase the puck into the corner","Hold your position and intercept the first outlet pass — you're the plug","Immediately skate back to your own zone","Go to the bench"],ok:1,why:"When the puck changes in the corner, the high forward's job is to be the first interceptor — not to chase.",tip:"They won the corner battle? High forward reads the breakout. Don't chase — intercept."},
    {id:"u11q50",cat:"Transition",pos:["F","D"],concept:"Transition timing",d:3,sit:"Your team just won a puck battle in your own zone. Two of your forwards are already at center ice. The other team has one player back. A 3-on-1 is developing. What's the trigger?",opts:["Wait until all three forwards are in the neutral zone","Go immediately — the 3-on-1 window closes fast as the other team gets back","Regroup at your own blue line","Dump it in and change lines"],ok:1,why:"Transition opportunities close fast. If two forwards are already at center and you have a 3-on-1 developing, going immediately is how you exploit it.",tip:"Transition chance opening? Go now. Those windows close in seconds."},
    {id:"u11q51",cat:"Transition",pos:["F","D"],concept:"D pinching up",d:3,sit:"Your team breaks out. As you cross the red line you see both opposing defensemen are pinching up — they're at the red line, not their blue line. What do you do?",opts:["Slow down and let them set up","Skate hard behind them — you have a breakaway if you beat them to their blue line","Dump the puck in","Pass across to a winger"],ok:1,why:"Defensemen pinching up means they've given up the space behind them. If you can beat them to the puck, you have a breakaway or a clean zone entry.",tip:"Both D pinching up? Burn them. Get behind them before they recover."},
    {id:"u11q52",cat:"Puck Protection",pos:["F","D"],concept:"Wheel the net",d:3,sit:"You're protecting the puck behind the net with a defender leaning on you. Two teammates are in the zone but both are covered. What do you do?",opts:["Force a pass to a covered teammate","Wheel to the other side of the net — moving forces the defender to move and may open a teammate","Try to power through the defender","Fall down and hope for a penalty"],ok:1,why:"Wheeling behind the net when both outlets are covered forces the defender to move with you, which can open a teammate, and it resets the pressure.",tip:"Both outlets covered behind the net? Wheel. Force the defense to move."},
    {id:"u11q53",cat:"Puck Protection",pos:["F","D"],concept:"Dual pressure protection",d:3,sit:"You have the puck in the corner. Two defenders are collapsing on you from different angles. Your only open teammate is at the blue line — a long pass blocked by two defenders. What do you do?",opts:["Attempt the long pass to the blue line","Protect the puck tight to the boards with your body, wait for the angle to open, then make a short chip pass","Try to spin through both defenders","Shoot the puck around the boards randomly"],ok:1,why:"Under dual pressure with a long pass blocked, protecting tight and waiting for an opening is the disciplined play. Two defenders can't both have perfect angles — one will leave a gap.",tip:"Two defenders collapsing? Protect tight and wait. The gap will open."},
    {id:"u11q54",cat:"Gap Control",pos:["D"],concept:"Get in the lane",d:3,sit:"A skilled attacker gets a step on you at the blue line and is now skating toward your net with speed. You can't catch them. What's the right approach?",opts:["Give up and let the goalie handle it","Get your stick into their lane — angle them toward the boards and get your body in front of the shooting lane","Try to grab them","Chase from behind and hope to catch up"],ok:1,why:"When you can't catch an attacker, get in their lane. Angling them toward the boards takes away the shooting lane.",tip:"Can't catch them? Get your body in the lane. Take away the shooting angle."},
    {id:"u11q55",cat:"Gap Control",pos:["D"],concept:"Don't commit to a fake",d:3,sit:"You're the defenseman and an attacker is coming in at speed. They fake to the backhand. You start to move with the fake. What do you do next?",opts:["Keep moving with the fake — commit fully","Stop your movement, reset your feet, and regain your gap — don't fully commit","Fall down to block","Poke check immediately"],ok:1,why:"Getting caught on a fake is recoverable if you stop your feet and reset quickly. Fully committing to the fake loses the gap entirely.",tip:"Bit on a fake? Stop your feet immediately and reset. Don't chase the fake."},
    {id:"u11q56",cat:"Special Teams",pos:["F","D"],concept:"PP seam pass",d:3,sit:"Your power play is in a 1-3-1. The half-wall player has the puck. The near PK forward is cheating toward the half-wall. The seam pass to the middle player is now open. What's the right play?",opts:["Hold the puck at the half-wall","Thread the seam pass to the middle player — the PK forward cheating toward you opened that lane","Shoot from the half-wall","Pass back to the point"],ok:1,why:"When the PK forward cheats toward you, they've vacated the seam. The middle player is open. The seam pass is the highest-danger play.",tip:"PK forward cheated toward you? The seam is open. Thread it."},
    {id:"u11q57",cat:"Special Teams",pos:["F","D"],concept:"PP adjustment",d:3,sit:"Your team's power play is struggling. The PK has collapsed everything to the slot and the point. What adjustment do you make?",opts:["Keep shooting from the point","Pull the puck back out of the zone, reset, and come in with a new entry that attacks a different spot","Dump the puck to the corner","Have every player rush the net"],ok:1,why:"When the PK has your power play figured out and collapsed, pull back and re-enter with a different attack angle.",tip:"PP getting shut down? Pull back and reset. Come in differently."},
    {id:"u11q58",cat:"Special Teams",pos:["F","D"],concept:"PK mindset",d:3,sit:"Your penalty kill gets the puck out of your zone. It's a 2-on-3 as you exit. Do you try to score shorthanded or just clear?",opts:["Go for the shorthanded goal — attack","Clear the zone and get back — a clean clear is a win on the PK","Pass back to your goalie","Dump it right back in"],ok:1,why:"A clean clear on the PK is a win — it kills clock and resets the power play.",tip:"PK clear: clean exit = success. Don't gamble on a shorthanded goal."},
    {id:"u11q59",cat:"Decision Timing",pos:["F","D"],concept:"Pre-read the pass",d:3,sit:"You're about to receive a pass in the offensive zone. Before the puck reaches you, what should you already be doing?",opts:["Waiting with your stick ready to receive","Looking up and deciding where you're going with the puck before it arrives — pre-reading the play","Calling for the puck louder","Watching the pass to make sure you catch it"],ok:1,why:"Pre-reading the play — deciding where you're going before the puck arrives — is what separates slow players from fast ones. By the time the puck hits your stick, your decision should already be made.",tip:"Pass coming? Decide what you're doing with it before it arrives. Pre-read."},
    {id:"u11q60",cat:"Decision Timing",pos:["F","D"],concept:"Plans change",d:3,sit:"You skate into the offensive zone with speed. You planned to shoot from the right side, but as you enter you see the goalie has that side covered and a teammate is breaking to the net on the left. What do you do?",opts:["Shoot to the right as planned — stick to the plan","Read and react — pass to your breaking teammate. The plan changes when the situation changes.","Slow down and think","Dump it in and regroup"],ok:1,why:"Plans are starting points, not locks. If the situation changes, read it and react.",tip:"Read what's actually there. Your plan is a starting point, not a commitment."},
    {id:"u11q61",cat:"Cycle Play",pos:["F"],concept:"Cycle timing — attack it",d:3,sit:"You're cycling below the dots. Your partner passes to you at the half-wall. The slot is completely empty. What's the play?",opts:["Continue cycling — pass back to the corner","Shoot immediately into the open slot or pass to a teammate breaking there","Hold the puck","Drop it back to the point"],ok:1,why:"The slot opening up is exactly what the cycle is designed to create. The instant you see it, attack it — don't keep cycling for its own sake.",tip:"Slot opens during the cycle? That's the goal. Attack it immediately."},
    {id:"u11q62",cat:"Cycle Play",pos:["F"],concept:"Half-wall with time",d:3,sit:"You're at the half-wall with the puck. The point defender is cheating toward the net. The slot defender is watching the corner. Nobody is tight on you. What's the play?",opts:["Pass to the corner","Shoot from the half-wall — you have time and the slot defender is distracted","Pass up to the point","Drop the puck behind you"],ok:1,why:"When the slot defender is watching the corner and nobody's tight on you at the half-wall, you have a shooting opportunity. Take it.",tip:"Nobody on you at the half-wall and slot D is distracted? Shoot."},
    {id:"u11q63",cat:"Exiting the Zone",pos:["F","D"],concept:"D carry out",d:3,sit:"Two forecheckers are deep in your zone. Your winger is up the wall but covered. Your center in the middle is also covered. Your D has the puck behind the net. What's the best option?",opts:["Force a pass to a covered teammate","Wheel and carry it out — both forecheckers are committed to your forwards. The D carrying it out is the best option.","Shoot it around the boards","Wait behind the net"],ok:1,why:"When both forecheckers have committed to your forwards and left the D unguarded, the D carrying it out is the right play.",tip:"Both forecheckers on your forwards? D carry it out. The lane is open."},
    {id:"u11q64",cat:"Exiting the Zone",pos:["F","D"],concept:"Stretch pass",d:3,sit:"Your D picks up the puck in your own zone. Two forecheckers are on them but both wingers are covered. Your center breaks free through the neutral zone — 40 feet away but completely open. What's the call?",opts:["Don't attempt it — too risky","Thread the stretch pass to the center — they're breaking and open","Rim it around the boards","Wait behind the net for the forecheckers to leave"],ok:1,why:"A stretch pass to a breaking center turns a defensive zone puck into an immediate rush chance. The reward — an odd-man rush — is worth the risk when the lane is clean.",tip:"Breaking center open on the stretch? Thread it. Risky but the reward is a rush."},
    {id:"u11q65",cat:"Rush Reads",pos:["F","D"],concept:"1-on-1 rush patience",d:2,sit:"You're on a clean 1-on-1 rush. The defenseman is the only one back. They're skating backward. What's the best approach?",opts:["Skate directly at them as fast as possible","Skate with control, read their skates, and make a move when they commit","Shoot immediately from outside the zone","Slow down and wait"],ok:1,why:"On a 1-on-1 rush, patience wins. Skating directly at full speed gives the D control. Skating with control and reading their feet lets you make a move when they commit.",tip:"1-on-1 rush: patience. Read their feet. Move when they commit."},
    {id:"u11q66",cat:"Coverage",pos:["F","D"],concept:"Switch call",d:3,sit:"You're the left defenseman. Your partner calls switch as an attacker cuts from the right side to the left in front of the net. What do you do?",opts:["Stay with your original assignment — don't switch","Take the attacker coming to your side, let your partner clean up their original man","Call the referee","Back up to the crease"],ok:1,why:"A switch call means you take the player coming to your side while your partner recovers their original man. Communication and trust make it work.",tip:"Partner calls switch? Take the player coming to you. Trust the communication."},
    {id:"u11q67",cat:"Offensive Pressure",pos:["F"],concept:"Cut off the breakout lane",d:2,sit:"Your team is in the offensive zone. The other team won a puck battle and is trying to break out. You're the nearest forward. What's the most effective way to maintain pressure?",opts:["Chase the puck carrier at top speed","Read their breakout pass options and cut them off — be in the lane before the pass is made","Give up and change lines","Back off to the blue line"],ok:1,why:"Maintaining offensive pressure is about reading the breakout, not chasing. Getting into passing lanes before the pass happens is more effective than chasing from behind.",tip:"They won the puck battle? Get in the breakout lane — don't just chase."},
    {id:"u11q68",cat:"Puck Protection",pos:["F","D"],concept:"Delay game",d:3,sit:"Your team is winning by one goal with 90 seconds left. You win a puck battle in the neutral zone. What's the right thing to do with the puck?",opts:["Attack immediately and try to score another goal","Control the puck along the boards, protect it, and force the other team to come get it — use every second","Dump it into the other team's zone","Shoot it down the ice"],ok:1,why:"Game management late means using the clock. Protecting the puck in the neutral zone and making the other team come to you burns precious seconds.",tip:"Leading late and you won the puck? Protect it. Use the clock."},
    {id:"u11q69",cat:"Decision Timing",pos:["F","D"],concept:"Low on aggressive goalie",d:3,sit:"You receive a pass in the slot. The goalie is way out of their net, cutting the angle aggressively. Where should you shoot?",opts:["High to the blocker side — beat them over the shoulder","Low and to one side — an aggressive goalie is exposed low","Straight at them","Deke and go around them"],ok:1,why:"A goalie playing aggressively out of the net is vulnerable low. They've taken away the high areas, but low shots exploit their aggressive position.",tip:"Goalie aggressive and out of the net? Go low. They've taken away high."},
    {id:"u11q70",cat:"Special Teams",pos:["F","D"],concept:"PK clear priority",d:2,sit:"Your team is on the penalty kill. You win the puck along the boards in your own zone. What's the priority?",opts:["Pass around until you find a perfect option","Get the puck out of your zone as fast as possible — any clean clear is a win","Hold the puck and wait for the power play to tire out","Try to score shorthanded immediately"],ok:1,why:"Clearing the zone on the PK is priority one. Every second you hold the puck in your zone is a second the power play can set up.",tip:"PK with the puck? Get it out. First clean option. Don't hold."},
    {id:"u11q71",cat:"Transition",pos:["F","D"],concept:"PP counter-attack",d:3,sit:"Your team is on the power play. The penalty kill gets the puck and two players immediately break the other way 2-on-2. What should your team do?",opts:["Chase immediately and attack","One forward pressures the puck, the others recover their positions — don't panic","All five players retreat to your own zone","Ignore it — the PP will get another chance"],ok:1,why:"A power play counter-attack is dangerous but not a guaranteed goal. One player pressures the puck, everyone else recovers position. Panicking creates a turnover.",tip:"PK breaks out on a counter? One pressures, others recover. Don't panic."},
    {id:"u11q72",cat:"Gap Control",pos:["D"],concept:"Defending the cycle",d:3,sit:"The other team is cycling below the dots in your zone. You're the weak-side defenseman. When do you leave your position to challenge?",opts:["Every time the puck moves","When a player with the puck is in a dangerous spot — near the slot or about to pass to the slot","Never — always hold your spot","When your partner tells you to"],ok:1,why:"Defending the cycle means picking your moments. You don't challenge every pass — you protect your position and challenge when the puck is in a truly dangerous spot.",tip:"Defending the cycle: stay in position. Challenge when dangerous, not just moving."},
    {id:"u11q73",cat:"Rush Reads",pos:["F","D"],concept:"Rush breakdown pressure",d:3,sit:"Your team is attacking 3-on-2. The play breaks down and the other team gets the puck. You're the center, close to the play. What do you do first?",opts:["Go to the bench immediately","Pressure the puck carrier immediately to slow the breakout","Skate to the blue line","Stand still and watch"],ok:1,why:"When a rush play breaks down and the other team gets the puck, the nearest forward pressures immediately. Slowing their first move buys your teammates time to recover.",tip:"Rush broke down? Pressure the puck immediately. Buy your team two seconds."},
    {id:"u11q74",cat:"Cycle Play",pos:["F"],concept:"D stepped in",d:3,sit:"You're low in the offensive zone with the puck. The D at the point just stepped down from the blue line because they saw a lane. They're now inside the zone at the top of the circles. What's the play?",opts:["Ignore the D — pass to the corner","Pass to the D who stepped in — they now have a shot from a dangerous area","Shoot from the corner yourself","Pass up the boards to a winger"],ok:1,why:"A defenseman stepping down from the point into the top of the circles has created a scoring chance from a dangerous area. Hitting them in stride while inside the dots is a high-danger play.",tip:"D stepped in from the point? Hit them in stride. That's a dangerous shot location."},
    {id:"u11q75",cat:"Exiting the Zone",pos:["F","D"],concept:"Short-side breakout",d:3,sit:"Your team is breaking out. The strong-side winger is completely covered. The D picks up the puck on the right side. The center is in the middle and the left winger is open on the short side. What's the right read?",opts:["Force the pass to the covered strong-side winger","Pass to the open left winger on the short side — shortest distance, cleanest pass","Carry it out yourself","Rim it around the boards"],ok:1,why:"The short-side winger being open is the clean, low-risk breakout pass. The shortest distance pass under pressure is usually the right one.",tip:"Short-side winger open? Take the short pass. Shortest distance = cleanest option."},
    {id:"u11q76",cat:"Coverage",pos:["F","D"],concept:"Screener coverage",d:2,sit:"The other team is on the power play. Their point man has the puck. One of their forwards is screening your goalie in front of the crease. What's your job as the nearest PK forward?",opts:["Chase the point man to stop the shot","Push the screener out of the crease area — your goalie needs to see","Stay in the passing lane","Back up to your own blue line"],ok:1,why:"The screener in front of the crease is the most dangerous player on the power play. Your job is to move them out — not chase the puck.",tip:"Screener in the crease? Move them out. Your goalie needs to see."},
    {id:"u11q77",cat:"Decision Timing",pos:["F","D"],concept:"Timeout assignment",d:3,sit:"Your coach calls a timeout with 30 seconds left and your team down by one. You're going back on after the timeout. What should be the first thing in your mind?",opts:["Just play hard","Know your specific job for the next 30 seconds — faceoff role, where to go, who to cover","Try to score the first time you touch the puck","Get pumped up and skate fast"],ok:1,why:"A timeout is a chance to execute a specific play. Walking back on the ice with a clear assignment is more valuable than general energy.",tip:"Timeout: know your specific job before you go back out. Assignment over energy."},
    {id:"u11q78",cat:"Blue Line Decisions",pos:["D"],concept:"Cheat back slightly",d:3,sit:"You're the defenseman at the point. You see the opposing center beginning to break toward your blue line for a potential counter. Your team still has the puck. What do you do?",opts:["Follow the center toward your own zone","Hold the blue line but cheat back slightly — be ready if the puck turns over","Ignore them — focus on the attack","Call for the puck yourself"],ok:1,why:"Reading a player beginning to position for a counter-attack lets you cheat back slightly. You stay at the line but you're ready. If the puck turns, you're in position.",tip:"Center positioning for counter? Cheat back slightly. Ready for the turnover."},
    {id:"u11q79",cat:"Offensive Pressure",pos:["F"],concept:"Second wave attack",d:3,sit:"Your first two forecheckers won the puck battle. They passed it to you as the third forward coming in. The D is still scrambling. What do you do?",opts:["Stop and wait to see what happens","Attack the scrambled D immediately — they haven't recovered. Be the second wave.","Pass back to your own D","Skate to the corner"],ok:1,why:"The second wave of a forecheck attacks the scramble. If the first two forwards won the battle and the D hasn't recovered, the third forward attacks the confusion immediately.",tip:"First wave won and D is scrambling? Second wave attacks immediately. Go."},
    {id:"u11q80",cat:"Rush Reads",pos:["F","D"],concept:"Partial breakaway shoot fast",d:2,sit:"Late in a shift, you beat a tired defenseman at center ice and you're a step ahead but they're right behind you. What's the priority?",opts:["Try a complex deke to make it look good","Shoot as quickly as possible once you're in range — don't let the D recover","Pull up and wait for a teammate","Skate slowly to get your breath"],ok:1,why:"With a tired D right behind you, the clock is against you. Get in range and shoot before they recover. Complex moves give them time to catch up.",tip:"D right behind you on a partial break? Get in range and shoot fast. Don't deke."},
    {id:"u11q81",cat:"Coverage",pos:["F","D"],concept:"Net-front battle",d:2,sit:"The other team has a player parked in front of your net. You're the defenseman. What's the most effective way to move them?",opts:["Slash their stick","Get your body low and push them away from the crease — no penalty","Ignore them and focus on the puck","Try to lift their stick"],ok:1,why:"Moving a player out of the crease is a legal physical battle. Getting low and pushing with your body — without using your stick — is how it's done without taking a penalty.",tip:"Player in your crease? Get low and move them with your body. No stick."},
    {id:"u11q82",cat:"Exiting the Zone",pos:["F","D"],concept:"Goalie starts breakout",d:2,sit:"Your goalie stops a shot and has the puck. One winger is coming back and available. The forecheckers are still deep. What's the goalie's best move?",opts:["Freeze the puck for a faceoff","Pass to the winger coming back — beat the forecheck before they can set up","Rim it around the boards","Shoot it down the ice"],ok:1,why:"A goalie handling the puck can start the breakout before the forecheck resets. A crisp pass to the returning winger beats the pressure.",tip:"Goalie has it and a winger is coming back? Goalie starts the breakout. Beat the forecheck."},
    {id:"u11q83",cat:"Cycle Play",pos:["F"],concept:"Weak-side crash",d:2,sit:"Your team is cycling. The half-wall player shoots. You're the weak-side winger. What should you do the moment the shot is taken?",opts:["Stay on the weak side in case the shot goes wide","Drive hard to the net — be there for the rebound on the weak side","Stay at the half-wall","Back up to the blue line"],ok:1,why:"The weak-side winger's job on a shot is to crash the net. Rebounds bounce wide to the weak side — being there before the shot lands is how you score on second chances.",tip:"Shot taken? Weak-side winger crashes the net. Every time."},
    {id:"u11q84",cat:"Special Teams",pos:["F","D"],concept:"PK faceoff forward",d:3,sit:"Your team is on the penalty kill. You're the center taking a defensive zone faceoff. The power play wants to win the draw back to the point for a shot setup. What's your goal on this draw?",opts:["Win it backward to your D","Win it forward — kick it toward the corner or boards to prevent the PP shot setup","It doesn't matter — just win it","Tie up the opposing center after the draw"],ok:1,why:"On a PK defensive zone faceoff, winning it forward — toward the boards or corner — takes away the PP's plan. Winning backward gives the PP exactly what they want.",tip:"PK faceoff in your own zone: win it forward. Take away the point shot."},
    {id:"u11q85",cat:"Transition",pos:["F","D"],concept:"Goalie breakout read",d:2,sit:"Your team is defending. The goalie makes a save and controls the puck. The other team has three forecheckers in your zone. Your wingers are pinned. What's the right breakout option?",opts:["Goalie holds the puck for a faceoff","Goalie finds the center breaking through the middle or a winger escaping — don't give the puck to a covered player","Goalie shoots it down the ice","Goalie rims it around the boards"],ok:1,why:"After a save under forecheck pressure, the goalie needs to read the breakout. Finding the center or an escaping winger breaks the forecheck immediately.",tip:"Goalie made the save under pressure? Find the breaking player. Read the breakout."},
    {id:"u11q86",cat:"Gap Control",pos:["D"],concept:"Back up fast on 2-on-1",d:3,sit:"Two attackers are coming at you on a 2-on-1. They both have speed. The puck carrier is on your left. What's the first thing you do?",opts:["Commit to the puck carrier immediately","Back up fast enough to not get beaten by their speed, stay in the middle, and force the shooter","Race toward the net","Skate to the weak side"],ok:1,why:"Speed on a 2-on-1 is the attacker's advantage. Backing up fast enough while staying in the middle to take away the pass is the correct positioning.",tip:"Fast 2-on-1? Back up fast. Stay in the middle. Force the shot."},
    {id:"u11q87",cat:"Decision Timing",pos:["F","D"],concept:"First shot is best shot",d:2,sit:"You catch a pass in the slot. You see an opening to the top corner. But you hesitate for two seconds while repositioning the puck. The goalie recovers. What should you have done?",opts:["Always wait for the perfect shot","Released immediately on the catch — the opening was there when you first received it","Passed to a teammate instead","Skated in closer first"],ok:1,why:"Hesitating in the slot gives the goalie time to recover. If there's an opening when you catch the puck, release immediately.",tip:"Opening in the slot? Release immediately. The best shot is the first one."},
    {id:"u11q88",cat:"Offensive Pressure",pos:["F"],concept:"Tire the D",d:2,sit:"Your team is in the offensive zone for a long shift. The defenders are getting tired. What should your forwards be doing to take advantage?",opts:["Slow down to save your own energy","Keep cycling and creating traffic — tired defensemen make mistakes under sustained pressure","Shoot from everywhere","Change lines immediately"],ok:1,why:"Sustained offensive zone pressure tires defensemen. Tired defenders make bad reads, miss sticks, and give up inside position.",tip:"D getting tired in your zone? Keep the pressure going. Fatigue creates mistakes."},
    {id:"u11q89",cat:"Cycle Play",pos:["F"],concept:"Open point",d:3,sit:"Your team is cycling and the slot is clogged. All four opponents are below the dots. What's the play?",opts:["Keep cycling and wait for the slot to open","Pass back to the open point — four defenders below the dots means the point shot is uncontested","Shoot from the corner","Dump the puck and change lines"],ok:1,why:"When all four defenders collapse below the dots, the point is wide open. A point shot from there is uncontested and generates traffic and rebounds.",tip:"Four D collapsed below the dots? The point is open. Give it up. Free shot."},
    {id:"u11q90",cat:"Coverage",pos:["F","D"],concept:"Last man back",d:3,sit:"You're the last man back as two attackers come in on you. Your goalie is set. One attacker has the puck on the left. One is cutting to the net on the right. What do you do?",opts:["Commit to the puck carrier on the left","Stay in the middle — take away the pass to the cutter and force the shot. Your goalie handles the shot.","Chase the cutter to the right","Back up to your crease"],ok:1,why:"Last man back on a 2-on-1: take away the pass, force the shot, trust your goalie.",tip:"Last man back on a 2-on-1: take away the pass. Let the goalie have the shot."},
    {id:"u11q91",cat:"Rush Reads",pos:["F","D"],concept:"Counter read after dead puck",d:3,sit:"Your team just had a power play chance and the goalie covered the puck. Faceoff in the offensive zone. You win the draw. Two of the other team's forwards are already breaking out. What's the immediate play?",opts:["Set up the power play again","Get the puck to a breaking teammate immediately — the 2-on-2 counter is better than resetting the PP","Hold the puck and regroup","Dump it in and chase"],ok:1,why:"Reading a counter-opportunity after a dead puck is advanced hockey sense. If two forwards are breaking and you win the draw, the counter is a better chance than resetting the power play.",tip:"Win the draw and teammates are breaking? Go. Counter-attack beats a reset every time."},
    {id:"u11q92",cat:"Blue Line Decisions",pos:["D"],concept:"Don't pinch on lost possession",d:3,sit:"You're the D at the offensive blue line. Your forward is about to lose possession to a defender. If that defender gets the puck clean, they can break with speed. Should you pinch?",opts:["Yes — pinch and help","No — if possession is about to be lost, pinching puts you deep with no coverage during a fast breakout","Go to the net instead","Take a shot from the line as a distraction"],ok:1,why:"The moment possession is about to be lost is the worst time to pinch. If the D gets the puck clean, they'll have a speed advantage with you caught deep.",tip:"Possession about to be lost? Don't pinch. Hold the line for the breakout."},
    {id:"u11q93",cat:"Puck Protection",pos:["F","D"],concept:"Puck battle at the net",d:3,sit:"You have the puck right in front of the opponent's net. A defender has grabbed your stick and a second is pushing you from behind. The goalie is scrambling. What do you do?",opts:["Stop and call for a penalty","Keep your feet moving and get your stick free — any shot or swipe on net is worth taking","Fall down to draw a penalty","Pass it out of the area"],ok:1,why:"In front of the net under pressure, stopping your feet is the worst thing you can do. Keep moving, get your stick free, and put anything on net.",tip:"Front of net with defenders on you? Keep your feet moving. Get the stick free. Shoot anything."},
    {id:"u11q94",cat:"Exiting the Zone",pos:["F","D"],concept:"Reverse breakout",d:3,sit:"Your D picks up the puck. The left side breakout is shut down — the forechecker has cut it off. Your right side has a winger breaking free. What's the play?",opts:["Force the pass to the covered left side","Reverse — walk behind the net and find the open right side","Rim it around","Hold the puck and wait"],ok:1,why:"When one side of the breakout is shut down, reversing behind the net opens the other side. The forechecker can't cover both sides at once.",tip:"One side blocked? Reverse. The forechecker can't cover both."},
    {id:"u11q95",cat:"Decision Timing",pos:["F","D"],concept:"Read the ice not the noise",d:3,sit:"It's late in the third period. Your team is down by one. You get the puck in the offensive zone with one minute left. Your coach is yelling to shoot. You see a teammate in a clearly better position. What do you do?",opts:["Shoot immediately because your coach said to","Pass to the better position — the right play is still the right play","Hold the puck and think","Skate to the bench"],ok:1,why:"Coaches yell shoot to create urgency — but the right play is still the right play. A teammate in a clearly better position is worth the pass even late in the game.",tip:"Coach says shoot but a teammate has a better look? Pass. Read the ice, not just the noise."},
    {id:"u11q96",cat:"Cycle Play",pos:["F"],concept:"Quit the cycle",d:3,sit:"Your team has been cycling for 30 seconds. The defenders have perfectly matched your cycle. Nothing is opening. What should you do?",opts:["Keep cycling — eventually something will open","Stop cycling — dump the puck deep, change lines, and come back with a new entry","Shoot from the corner","Give the puck to your D at the point"],ok:1,why:"A cycle against a perfectly matched defense that isn't creating anything is just burning your legs. Recognize when the cycle isn't working and come in with a different look.",tip:"Cycle going nowhere? Dump and change. Come back with a fresh entry."},
    {id:"u11q97",cat:"Special Teams",pos:["F","D"],concept:"PP last 10 seconds",d:3,sit:"Your team has a power play with only 10 seconds left. You're in the offensive zone at the half-wall. No clear shot lane. What's the play?",opts:["Dump the puck in the corner and chase","Shoot from wherever you are — any shot is better than nothing with 10 seconds left","Regroup and try to get set up","Hold the puck and protect it"],ok:1,why:"With 10 seconds left on a PP, the time to set up is gone. Shoot from wherever you are — any shot is better than the power play expiring with no attempt.",tip:"10 seconds left on the PP? Shoot from anywhere. Time's up."},
    {id:"u11q98",cat:"Gap Control",pos:["D"],concept:"Stick in the lane",d:3,sit:"You're a forward backchecking on a 2-on-1. Your D is in the middle taking away the pass. The shooter pulls up just inside the blue line and winds up for a slap shot. You're close. What can you still do?",opts:["Keep skating — you can't help anymore","Get your stick in the shooting lane to deflect or block — you're close enough","Dive on the ice","Call for your D to rush the shooter"],ok:1,why:"A backchecker who's close to the shooter has one job — get your stick in the lane. A deflected or blocked shot is massive. Every stick in the lane matters.",tip:"Shooter winding up and you're close? Get your stick in the lane. Deflect it."},
    {id:"u11q99",cat:"Offensive Pressure",pos:["F"],concept:"Third forward stays high",d:3,sit:"Your team forechecks 2-1-2. Both D and one forward are along the boards below the dots. You're the second high forward. The D has rimmed the puck to the far winger position. Who gets it?",opts:["You go — you're the nearest high player","The near winger goes — they're in better position. You stay high and be the next pass option.","Both of you go for it","The D comes up to get it"],ok:1,why:"The near winger retrieves the rim — that's their assignment. You stay high as the next option. If both forwards go deep, you lose your high forward safety.",tip:"Rim going to the far winger? Let them get it. You stay high. Don't both go deep."},
    {id:"u11q100",cat:"Decision Timing",pos:["F","D"],concept:"Back post is the best play",d:3,sit:"You're in the slot with the puck. The goalie is square. A defender is closing. Your teammate is breaking to the back post, completely open. The goalie has no idea. You have one second. What do you do?",opts:["Shoot — you're in the slot","Pass to the breaking teammate — open player at the back post with goalie unaware is the highest-percentage play","Hold the puck","Skate behind the net"],ok:1,why:"An open teammate at the back post with the goalie unaware is a higher-percentage chance than a slot shot against a set goalie. The selfless play is also the smart play — and recognizing it in one second is elite hockey IQ.",tip:"Teammate open at the back post with the goalie unaware? Pass. That's the highest-percentage play in hockey."},
  ,
    {id:"u11g1",cat:"Goalie",concept:"Angle cutting",d:1,pos:["G"],sit:"A forward is coming in on a clean breakaway. You're on your line. As they cross the dots, what should you be doing?",opts:["Stay on your goal line","Skate out to the top of the crease — cut the angle and take away net","Skate all the way out to meet them","Butterfly immediately"],ok:1,why:"Coming out to the top of the crease dramatically cuts the shooting angle. The shooter sees far less net than if you stay on the line. You control how much net is available.",tip:"Breakaway coming? Get to the top of your crease. Take the net away."},
    {id:"u11g2",cat:"Goalie",concept:"Reading the 2-on-1",d:1,pos:["G"],sit:"It's a 2-on-1. Your D has taken the middle and is forcing the shot. The puck carrier is cutting wide. What do you do?",opts:["Cheat toward the pass option","Set for the shot — your D is taking away the pass, you take the shot","Rush at the puck carrier","Come out of your crease"],ok:1,why:"When your D is properly taking away the pass on a 2-on-1, the goalie sets and takes the shot. Trust your D to do their job. Cheating toward the pass gives up the shot.",tip:"2-on-1 with D in position: trust them. Set for the shot."},
    {id:"u11g3",cat:"Goalie",concept:"Seam pass read",d:2,pos:["G"],sit:"The power play has the puck at the half-wall. You're set slightly to that side. Suddenly the puck moves to the seam player at the top of the slot — close range. What happens?",opts:["Stay where you are","Push hard across — you're out of position for the new shot location. Get there fast.","Drop into butterfly immediately","Come out of your crease"],ok:1,why:"A seam pass that moves the puck from the half-wall to the high slot changes the shot angle completely. You have to push hard to get square to the new shooter — you were out of position for the half-wall shot.",tip:"Puck moves to the seam? Push hard to get square. Don't just react — move."},
    {id:"u11g4",cat:"Goalie",concept:"Tracking through screens",d:2,pos:["G"],sit:"The point man is winding up for a shot and there's a screener standing right in your sightline. You can't see the puck. What do you do?",opts:["Give up — you can't see it","Move laterally to find a gap around the screener, call to your D to move them, and be ready for a tip","Drop into butterfly and cover the bottom","Stay completely still"],ok:1,why:"Screeners require active problem-solving. Moving to find the puck, calling for your D to move the screener, and being ready for a tip is the full response. Passive goalies get scored on by screens.",tip:"Screened shot: find the puck, call for help, expect a tip. Don't be passive."},
    {id:"u11g5",cat:"Goalie",concept:"Rebound control — direction",d:2,pos:["G"],sit:"You make a save from the left side. You can control where the rebound goes. Where's the best place to send it?",opts:["Back to the shooter","To the right corner — opposite side from where the shot came","Straight up into the air","Anywhere in front of the net"],ok:1,why:"Sending the rebound to the far corner moves it away from the original shooter and the slot. Your defenseman on the right side can retrieve it and start the breakout.",tip:"Control your rebounds to the far corner. Away from the shooter, away from the slot."},
    {id:"u11g6",cat:"Goalie",concept:"Puck handling — pressure",d:2,pos:["G"],sit:"A forechecker is coming hard around the left side. The puck is sitting behind your net. You get there first. What do you do with it?",opts:["Try to carry it yourself","Stop it for your left defenseman who is coming to get it — get the puck to their forehand","Shoot it down the ice","Freeze it"],ok:1,why:"A goalie who handles the puck well under pressure is a huge asset. Stopping it cleanly for your D's forehand — not their backhand — sets them up for a clean breakout pass.",tip:"Play the puck to your D's forehand. Clean stop, clean pickup, clean exit."},
    {id:"u11g7",cat:"Goalie",concept:"Breakaway — shooter committed",d:3,pos:["G"],sit:"A shooter is on a breakaway and dekes hard to their backhand. You start to go with them. They pull back to their forehand. What do you do?",opts:["Commit fully to the backhand — you're already going that way","Stop your feet immediately and try to reset — don't fully commit to the fake","Fall down and cover the post","Come out further"],ok:1,why:"Getting caught on a deke is recoverable if you stop your feet quickly. Fully committing to the first move gives the shooter the open side. Reset as fast as possible.",tip:"Caught on a deke? Stop your feet. Reset. Don't fully commit to the fake."},
    {id:"u11g8",cat:"Goalie",concept:"Post integration",d:3,pos:["G"],sit:"The puck carrier is tight to the right side, almost at the goal line. You've moved to your right post. They cut hard toward the middle. What do you do?",opts:["Stay on the post","Push off the post and move with them — they've changed the angle and you need to stay square to the puck","Drop into butterfly on the post","Come way out into the crease"],ok:1,why:"When the puck carrier moves, you move. Staying on the post as they cut to the middle leaves you square to the wrong angle. Push off and stay square to the puck.",tip:"Puck carrier moving? You move. Stay square to the puck, not to the post."},
    {id:"u11g9",cat:"Goalie",concept:"Coverage call",d:3,pos:["G"],sit:"Your two defensemen are both going to the corner to battle for a puck. An attacker is cutting to the front of the net with nobody covering them. What do you do?",opts:["Do nothing — it's not your problem","Call out loudly to your nearest forward — 'Front! Front!' — so they know to pick up the open player","Skate out to cover them yourself","Drop into butterfly and wait"],ok:1,why:"When your D are both going to the corner, the front of the net is exposed. The goalie sees this happening and must call for a forward to cover it. That verbal communication can prevent a goal.",tip:"D both going to the corner? Call 'Front!' immediately. Get someone on that player."},
    {id:"u11g10",cat:"Goalie",concept:"Low-high read",d:3,pos:["G"],sit:"Your team is on the penalty kill. The power play passes it from the low corner up to the point quickly. You were set for the low play. What do you have to do?",opts:["Stay in your current position","Move out to the top of your crease immediately — the point shot requires a different position than the low play","Drop into butterfly","Back up to your goal line"],ok:1,why:"Moving from a low play to a high point shot requires the goalie to reset position. Coming out to the top of the crease gives you the best angle on the point shot.",tip:"Puck goes from low to high? Push out to the top of your crease immediately."},
    {id:"u11g11",cat:"Goalie",concept:"Desperation technique",d:3,pos:["G"],sit:"You're down and out of position. The puck is sliding toward an open corner of the net and you can't get up in time. What do you try?",opts:["Give up — it's a goal","Throw your stick or extend whatever body part you can reach into the path of the puck — any contact can change its direction","Call for a penalty","Stay still"],ok:1,why:"Out-of-position desperation is a real skill. Throwing your blocker hand, extending your toe, or reaching with your stick can deflect a puck that would have been a sure goal. Never give up on a play.",tip:"Out of position? Reach with anything. A blocker or a toe can make a save."},
    {id:"u11g12",cat:"Goalie",concept:"Back-door coverage",d:3,pos:["G"],sit:"You're set on the right post. The puck is on the right half-wall. A player cuts backdoor to the left post — completely open. The pass is about to happen. What do you do?",opts:["Stay on the right post","T-push hard across to the left post — the backdoor player is the immediate danger, the half-wall shooter is not","Come out of your crease toward the puck","Drop into butterfly on the right"],ok:1,why:"A backdoor cut with a pass coming is one of the hardest situations for a goalie. You have to move fast — T-push to the new post before the puck arrives. Half a second matters.",tip:"Backdoor cut? T-push now. Get to the left post before the pass arrives."},
    {id:"u11g13",cat:"Goalie",concept:"Shooter telegraph",d:3,pos:["G"],sit:"A shooter is coming down the right wing at full speed. Before they shoot you notice their elbow is dropping low. What does this usually mean?",opts:["Nothing — it's random","They're likely shooting high — a dropping elbow often indicates a high release","They're going to pass","They'll deke"],ok:1,why:"Shooter reads are a real goalie skill at higher levels. A dropping elbow often indicates a high shot because the mechanics of a high release require the elbow to come down. Reading this gives you a fraction of a second head start.",tip:"Watch the elbow — dropping elbow often means high shot. Read the body before the release."},
    {id:"u11g14",cat:"Goalie",concept:"5-hole awareness",d:2,pos:["G"],sit:"A shooter has the puck in tight and is trying to shoot between your legs. What's the best position to take away the 5-hole?",opts:["Spread your legs wide","Keep your pads together or slightly overlapping and squeeze your knees — make the 5-hole as small as possible","Drop to the butterfly immediately","Stand with feet shoulder width apart normally"],ok:1,why:"The 5-hole — between a goalie's legs — is a target for good shooters. Keeping your pads together and squeezing your knees reduces that gap without sacrificing your ability to move.",tip:"Puck going low and center? Squeeze your knees. Close the 5-hole."},
    {id:"u11g15",cat:"Goalie",concept:"Freeze read — late game",d:3,pos:["G"],sit:"Your team is winning by one goal with 90 seconds left. You make a save and the puck is loose at your feet. Your team has it covered nearby. Should you freeze it?",opts:["Freeze it immediately — kill the clock","Leave it for your team — freezing it gives the other team a faceoff in your zone with 90 seconds left, which is dangerous","Kick it away","Throw it to the corner"],ok:1,why:"Late game freeze decisions matter. Freezing the puck in your own zone gives the other team a faceoff set play — potentially with their best players — in your zone. If your team has control, leaving it lets them clear and kill more clock.",tip:"Leading late? Don't automatically freeze. If your team has it, let them clear. Faceoffs in your zone are dangerous."},
    {id:"u11g16",cat:"Goalie",concept:"Communication — D-to-D pass",d:3,pos:["G"],sit:"You can see that both opposing forwards are sneaking behind your defensemen as your D make a D-to-D pass in the offensive zone. What do you do?",opts:["Say nothing","Call out immediately — 'Two coming!' — to warn your D that forwards are breaking behind them","Wait to see if they notice","Call for a line change"],ok:1,why:"Goalies see the whole ice and see counter-attack threats forming before anyone else. Calling out 'Two coming!' gives your D a chance to adjust before they make the pass and get caught.",tip:"You see the counter developing before anyone else. Call it out. Your voice is a defensive tool."},
    {id:"u11g17",cat:"Goalie",concept:"Rush positioning",d:2,pos:["G"],sit:"Your team is defending a 3-on-2. The puck carrier has the puck on the right side. Where should you be in your net?",opts:["Dead center of the net","Slightly cheated to the right — toward the puck carrier's side — while staying square to the puck","All the way to the right post","All the way to the left post"],ok:1,why:"On a rush with the puck on one side, the goalie cheats slightly toward that side while staying square to the puck. This takes away the near-side shot while leaving you positioned to move to cover a pass.",tip:"Rush with puck on one side? Cheat slightly toward it. Stay square. Be ready to move."},
    {id:"u11g18",cat:"Goalie",concept:"Wraparound read",d:3,pos:["G"],sit:"An attacker carries the puck behind your net at speed, going from your left to your right. They're about to try a wraparound. What do you do?",opts:["Stay in the middle and wait","Move with them — push to the right post as they come around and seal it. Don't let them get the post.","Come out of the crease to stop them","Drop to the butterfly immediately"],ok:1,why:"On a wraparound, the goalie moves with the puck carrier and seals the near post as they come around. If you get to the post before they do, there's no open net to stuff the puck into.",tip:"Wraparound coming? Move with them. Seal the post before they get there."},
    {id:"u11g19",cat:"Goalie",concept:"Penalty shot read",d:3,pos:["G"],sit:"A player is awarded a penalty shot. They're coming straight at you. They haven't shown you anything yet. What's your strategy?",opts:["Come all the way out to the blue line","Come to the top of the crease, stay on your feet as long as possible, and force them to make the first move","Drop into butterfly immediately","Stay on your goal line"],ok:1,why:"On a penalty shot, coming to the top of the crease cuts the angle without over-committing. Staying on your feet as long as possible forces the shooter to make a decision — and every second they have to make a decision is a second you can read them.",tip:"Penalty shot: crease top, stay up, make them decide first. Patience wins."},
    {id:"u11g20",cat:"Goalie",concept:"Rebound — second shot danger",d:3,pos:["G"],sit:"You make a save but the rebound goes to the slot. A player is right there and shoots immediately before you recover. What did you do wrong and what should you do differently?",opts:["Nothing — it's just bad luck","Your rebound went to the most dangerous area. Direct rebounds to the corner, not the slot — or cover the puck if you can't direct it safely.","Your position was wrong","You should have frozen the first shot"],ok:1,why:"Rebound management is a key goalie skill. A rebound to the slot is the second-most dangerous play in hockey after an open net. Directing it to the corner or covering it prevents the second shot.",tip:"Rebound to the slot = danger. Direct to corners or cover. Never leave it in the slot."},

    // === SEQUENCE ORDERING QUESTIONS ===
    {id:"u11seq1",cat:"Exiting the Zone",pos:["F","D"],concept:"Breakout sequence",d:1,type:"seq",sit:"Put the steps of a basic breakout in the correct order.",items:["D retrieves the puck behind the net","Wingers get up the boards and create outlet options","D makes a pass to the open winger","Center supports through the middle of the ice"],correct_order:[0,1,2,3],why:"A clean breakout starts with the D retrieving the puck, wingers getting open along the boards, then the D makes a pass, and the center fills through the middle for support.",tip:"Breakout: D gets it, wingers get open, pass, center supports. In that order."},
    {id:"u11seq2",cat:"Rush Reads",pos:["F","D"],concept:"3-on-2 rush sequence",d:2,type:"seq",sit:"Your team has a 3-on-2 rush. Put these steps in the correct order.",items:["Puck carrier enters the zone with speed and draws the first defender","Wide players drive the net and get open","Puck carrier reads the D and passes to the open player","Receiver shoots or makes the next play"],correct_order:[0,1,2,3],why:"A 3-on-2 works when the puck carrier draws attention first, wide lanes get filled, the read is made, and then the shot or next play happens.",tip:"3-on-2: draw, fill lanes, read, finish. Speed and sequence."},
    {id:"u11seq3",cat:"Special Teams",pos:["F","D"],concept:"Power play setup",d:2,type:"seq",sit:"Your team just got a power play. Put these steps in the right order to get set up in the offensive zone.",items:["Win the faceoff or gain possession","Enter the zone with control — carry or pass it in","Get to your assigned PP positions","Move the puck to find the open lane or shot"],correct_order:[0,1,2,3],why:"A power play starts with possession, then a clean zone entry, getting into formation, and then executing the puck movement to create a chance.",tip:"PP: win it, enter with control, get set, move the puck. Don't rush the setup."},
    {id:"u11seq4",cat:"Gap Control",pos:["D"],concept:"Defending a rush sequence",d:2,type:"seq",sit:"An attacker is rushing up ice toward you. Put the defensive steps in order.",items:["Skate backward and establish your gap","Read the attacker's speed and angle","Close the gap as they approach the blue line","Steer them to the outside with your body position"],correct_order:[0,1,2,3],why:"Good gap control is a sequence: establish position, read the attacker, close as they approach, then steer them wide. Skipping steps gets you beat.",tip:"Defend the rush in steps: gap, read, close, steer. Don't jump ahead."},
    {id:"u11seq5",cat:"Game IQ",pos:["F","D"],concept:"Faceoff routine",d:1,type:"seq",sit:"Your team is about to take a defensive zone faceoff. Put these steps in order.",items:["Know your assignment before the puck drops","Get to your position beside or behind the center","Win the draw back or tie up their center","Get to the puck first and make a quick play out of the zone"],correct_order:[0,1,2,3],why:"Faceoffs are structured. Know your job, get into position, compete on the draw, then execute. Players who don't know their assignment before the drop are already behind.",tip:"Faceoff: know your job, get set, compete, execute. Preparation wins draws."},
    {id:"u11seq6",cat:"Transition",pos:["F","D"],concept:"Turnover recovery sequence",d:2,type:"seq",sit:"Your team just turned the puck over in the offensive zone. Put the recovery steps in order.",items:["Recognize the turnover immediately","Nearest player pressures the puck carrier","Other forwards sprint back toward the defensive zone","Defensemen hold the blue line or retreat to proper gap"],correct_order:[0,1,2,3],why:"Transition defense is a chain reaction: recognize, pressure, backcheck, hold structure. The team that recovers fastest gives up the fewest odd-man rushes.",tip:"Turnover: recognize, pressure, backcheck, structure. Speed of reaction matters most."},
    {id:"u11seq7",cat:"Skating",pos:["F","D"],concept:"Line change sequence",d:1,type:"seq",sit:"You need to make a line change during play. Put these steps in the right order.",items:["Make sure your team has possession or the puck is in a safe area","Skate toward the bench — don't coast","Get close to the bench before your replacement jumps on","Fresh player jumps on and gets into the play immediately"],correct_order:[0,1,2,3],why:"A good line change requires timing. Changing at the wrong time or too slowly creates odd-man situations. Possession first, skate hard to the bench, short change, fresh player engages.",tip:"Line change: safe puck, skate hard to bench, short swap, fresh legs engage."},
    {id:"u11seq8",cat:"Puck Protection",pos:["F"],concept:"Cycle play sequence",d:3,type:"seq",sit:"Your team is starting a cycle in the offensive zone corner. Put the cycle steps in order.",items:["Win the puck battle along the boards","Protect the puck with your body and look for support","Pass to a teammate who's in motion along the wall or down low","Supporting players rotate to create the next passing option"],correct_order:[0,1,2,3],why:"The cycle is a continuous loop: win the battle, protect, pass, rotate. If any step breaks down — especially the rotation — the cycle dies.",tip:"Cycle: win the battle, protect, pass, rotate. Keep the loop going."},

    // === SPOT THE MISTAKE QUESTIONS ===
    {id:"u11mis1",cat:"Coverage",pos:["F","D"],concept:"Defensive zone coverage error",d:1,type:"mistake",sit:"Your team is in the defensive zone. The other team has the puck. One of your teammates skates to the puck instead of covering their player. What's the mistake?",opts:["They should have stayed on the bench","They left their man open — in the D-zone, everyone needs to have a player covered before chasing the puck","They should have gone to the net","They skated too fast"],ok:1,why:"Chasing the puck in the defensive zone without covering your man first is one of the most common mistakes at U11. It leaves someone wide open for a pass and easy goal.",tip:"D-zone: cover your man first, then worry about the puck."},
    {id:"u11mis2",cat:"Rush Reads",pos:["F","D"],concept:"Offside mistake",d:1,type:"mistake",sit:"Your teammate carries the puck into the offensive zone. You're skating hard to join the rush but you cross the blue line before the puck does. What went wrong?",opts:["You were skating too slow","You entered the zone before the puck — that's offside. You need to time your entry so the puck crosses the line first.","You should have stopped at center","The puck carrier was too slow"],ok:1,why:"Offside kills momentum. The player without the puck must make sure the puck enters the zone before they do. Timing your entry is a basic but critical skill.",tip:"Blue line: puck goes first, then you. Time your entry."},
    {id:"u11mis3",cat:"Offensive Pressure",pos:["F"],concept:"Forecheck overcommit",d:2,type:"mistake",sit:"On the forecheck, all three forwards go deep into the corner chasing the puck. The opposing D makes a quick pass up the middle and the other team breaks out with speed. What was the mistake?",opts:["The forwards weren't fast enough","All three forwards went deep — at least one forward needs to stay high to prevent the breakout pass through the middle","The defensemen were too far back","The goalie didn't stop the breakout"],ok:1,why:"Three forwards deep in the corner means nobody is covering the middle of the ice. The second or third forward needs to stay high to cut off the easy breakout pass.",tip:"Forecheck: never all three deep. Someone stays high. Always."},
    {id:"u11mis4",cat:"Blue Line Decisions",pos:["D"],concept:"Pinch at the wrong time",d:2,type:"mistake",sit:"You're the D at the offensive blue line. The puck is loose along the boards. You pinch down to get it, but the opposing forward gets there first and goes around you for a breakaway. What was the mistake?",opts:["You should have pinched harder","You pinched when the puck wasn't clearly yours to win — if you can't get there first, hold the line instead of gambling","Your partner should have covered","The forward got lucky"],ok:1,why:"Pinching is a gamble. If you can't win the race to the puck, you're giving up your position and creating a breakaway. Only pinch when you're confident you'll get there first.",tip:"Pinch only when you'll win the race. If it's 50/50, hold the line."},
    {id:"u11mis5",cat:"Transition",pos:["F","D"],concept:"Slow backcheck",d:1,type:"mistake",sit:"Your team loses the puck in the offensive zone. Two forwards stand and watch for a moment before skating back. The other team gets a 3-on-2 rush. What's the mistake?",opts:["The defensemen were out of position","The forwards didn't transition immediately — when you lose the puck, you turn and skate back right away, no watching","The goalie came out too far","The coach called the wrong play"],ok:1,why:"Standing and watching after a turnover is the number one transition mistake. The other team converts turnovers into rushes in seconds. Every moment of standing still is a step they gain on you.",tip:"Lose the puck? Turn and go. Immediately. No watching."},
    {id:"u11mis6",cat:"Special Teams",pos:["F","D"],concept:"PK chasing the puck",d:2,type:"mistake",sit:"Your team is on the penalty kill. One of your players keeps chasing the puck carrier around the zone instead of staying in the box formation. What's the mistake?",opts:["They should chase even harder","They're breaking the PK structure — on the penalty kill, stay in your box and force them to make plays around you instead of chasing","They should go to the bench","They need to ice the puck more"],ok:1,why:"The penalty kill box works because it covers passing lanes and takes away the middle of the ice. Chasing the puck opens up holes the power play will exploit.",tip:"PK: stay in the box. Let them move the puck around you. Don't chase."},
    {id:"u11mis7",cat:"Game IQ",pos:["F","D"],concept:"Too many men",d:1,type:"mistake",sit:"During a line change, the fresh player jumps on the ice while the tired player is still at center ice skating slowly to the bench. The ref blows the whistle. What happened?",opts:["The ref made a bad call","Too many men on the ice — the fresh player jumped on before the tired player was close enough to the bench. The outgoing player needs to be within arm's reach of the bench.","Offside","Icing"],ok:1,why:"Too many men is an avoidable penalty. The outgoing player must be close to the bench before the new player jumps on. Communication and awareness prevent this.",tip:"Line change: don't jump on until the other guy is at the bench. Communicate."},
    {id:"u11mis8",cat:"Puck Protection",pos:["F"],concept:"Turning into pressure",d:2,type:"mistake",sit:"You pick up the puck along the boards. A defender is coming from your right side. You turn to your right — directly into the defender — and lose the puck. What should you have done?",opts:["Turned faster","Turned away from the pressure — to your left — protecting the puck with your body between you and the defender","Shot the puck immediately","Called for help louder"],ok:1,why:"Turning into pressure is a guaranteed turnover. Always turn away from the check, putting your body between the puck and the defender. Read where the pressure is coming from before you turn.",tip:"Pressure coming? Turn away from it, not into it. Protect with your body."},

    // === WHAT HAPPENS NEXT QUESTIONS ===
    {id:"u11next1",cat:"Rush Reads",pos:["F","D"],concept:"2-on-1 defender commits",d:1,type:"next",sit:"You're on a 2-on-1 with the puck. The lone defender suddenly slides toward your teammate to take away the pass. What happens next?",opts:["You pass anyway","You stop skating","You take the shot — the defender just opened the lane for you by leaving","You dump it in"],ok:2,why:"When the defender commits to the pass, they open the shooting lane. A smart player recognizes this immediately and shoots.",tip:"Defender leaves you to take the pass? Shoot. They just gave you the lane."},
    {id:"u11next2",cat:"Offensive Pressure",pos:["F"],concept:"Forecheck pressure result",d:2,type:"next",sit:"Your first forechecker pressures the D behind the net. The D panics and tries a blind backhand pass up the middle. What should happen next?",opts:["Your team backs off","Your second forward, who stayed high, intercepts the pass in the slot — that's exactly why they stayed high","Everyone goes to the corner","The play resets"],ok:1,why:"This is the payoff for staying high on the forecheck. The D under pressure makes a bad pass, and the high forward is in perfect position to intercept it in a dangerous area.",tip:"Forechecking works when someone stays high. They get the interception."},
    {id:"u11next3",cat:"Gap Control",pos:["D"],concept:"Attacker cuts inside",d:2,type:"next",sit:"You've steered the puck carrier to the outside with good gap control. Suddenly they cut hard back to the inside. What happens next?",opts:["You keep skating backward to the outside","You pivot and match their cut — stay on their inside hip and use your body to close them off","You stop and watch","You go for a hip check"],ok:1,why:"When an attacker cuts inside, the defender pivots with them and stays on the inside hip. You've already taken away the outside — now take away the middle too.",tip:"Attacker cuts inside? Pivot and stay on their inside hip. Don't let them get to the middle."},
    {id:"u11next4",cat:"Transition",pos:["F","D"],concept:"Quick counter-attack",d:2,type:"next",sit:"Your team forces a turnover at your own blue line. The other team's forwards are all deep in your zone. Your winger has the puck with open ice ahead. What happens next?",opts:["They dump it in and change","They attack with speed — the other team is caught deep, so this is a rush chance. Go now before they recover.","They pass it back to the goalie","They wait for everyone to get set"],ok:1,why:"Turnovers at the blue line with the other team caught deep are prime counter-attack opportunities. Speed is everything — attack before they recover their positions.",tip:"Turnover with them caught deep? Attack now. Speed beats recovery."},
    {id:"u11next5",cat:"Special Teams",pos:["F","D"],concept:"PP cross-ice pass",d:3,type:"next",sit:"On the power play, the puck is on the left half-wall. The PK is overloading that side. Your teammate makes a sharp cross-ice pass to the right side where a player is wide open. What happens next?",opts:["The open player passes it back","The open player has a one-timer or clean shot — the PK can't recover across the ice fast enough, so this is a prime scoring chance","The open player skates to the corner","The play dies"],ok:1,why:"A cross-ice pass against an overloaded PK creates the best power play chance there is — a clean shot with the goalie moving laterally and the PK out of position.",tip:"Cross-ice pass finds the open man? That's the shot. The PK can't get there in time."},
    {id:"u11next6",cat:"Game IQ",pos:["F","D"],concept:"Icing the puck",d:1,type:"next",sit:"Your team is under heavy pressure in the D-zone. A defenseman panics and shoots the puck all the way down the ice from behind the red line. No one touches it. What happens next?",opts:["Play continues normally","The ref blows the whistle for icing — faceoff comes back to your zone and your tired players can't change","Your team gets a power play","The other team gets a penalty"],ok:1,why:"Icing brings the faceoff back to your zone and your tired players stay on the ice. It's a last resort, not a strategy. If you can make a short pass instead, that's always better.",tip:"Icing means a D-zone faceoff with tired legs. Avoid it if you can make any other play."},
    {id:"u11next7",cat:"Puck Protection",pos:["F"],concept:"Winning the board battle",d:2,type:"next",sit:"You're battling for the puck along the boards in the offensive zone. You get lower than the defender and pin the puck with your skate. Your linemate is calling for it. What happens next?",opts:["You hold it forever","You kick the puck to your stick and make a quick pass to your linemate before the next defender arrives — you won the battle, now use it","You leave it and skate away","You shoot it on net from the boards"],ok:1,why:"Winning the board battle only matters if you do something with it quickly. Get it to a teammate before the next wave of pressure arrives. Battle, win, move it.",tip:"Won the board battle? Move it quick. The next defender is already coming."},
    {id:"u11next8",cat:"Skating",pos:["F","D"],concept:"Gaining the zone with speed",d:2,type:"next",sit:"You pick up the puck at center ice with a full head of steam. The defender is flat-footed at the blue line. You have a clear speed advantage. What happens next?",opts:["You dump it in","You use your speed to carry the puck wide around the flat-footed defender — your speed advantage makes the carry the best option","You stop at the blue line","You pass it backward"],ok:1,why:"A flat-footed defender against a player with speed is a mismatch. Use the speed advantage to carry it wide. Dumping the puck in when you have a clear speed advantage wastes the opportunity.",tip:"Speed advantage against a flat-footed D? Carry it. Don't dump what you can carry."},

    // === TRUE/FALSE QUESTIONS ===
    {id:"u11tf1",cat:"Rush Reads",pos:["F","D"],concept:"Always shoot on 2-on-1",d:1,type:"tf",sit:"On a 2-on-1, you should always shoot no matter what the defender does.",ok:false,why:"On a 2-on-1, the right play depends on the defender. If they take you, pass. If they take the pass, shoot. Reading the defender is the whole point of a 2-on-1.",tip:"2-on-1 is about reading, not always shooting. Defender takes you? Pass. Takes the pass? Shoot."},
    {id:"u11tf2",cat:"Coverage",pos:["F","D"],concept:"Everyone covers a man in D-zone",d:1,type:"tf",sit:"In the defensive zone, every skater on your team should have an opposing player to cover.",ok:true,why:"Defensive zone coverage means every player picks up a man. If someone is left uncovered, the other team has an easy passing option for a scoring chance.",tip:"D-zone: five skaters, five assignments. Nobody floats."},
    {id:"u11tf3",cat:"Transition",pos:["F","D"],concept:"Wait after turnover",d:1,type:"tf",sit:"When your team loses the puck, it's okay to wait a second to see what happens before skating back.",ok:false,why:"There is no waiting after a turnover. Every second of standing still is a step the other team gains on their rush. Transition back is immediate — always.",tip:"Turnover means instant backcheck. No waiting. No watching. Go."},
    {id:"u11tf4",cat:"Special Teams",pos:["F","D"],concept:"PK box formation",d:2,type:"tf",sit:"On the penalty kill, your team should form a box shape to protect the middle of the ice and the slot.",ok:true,why:"The penalty kill box takes away the most dangerous area — the slot and middle of the ice. It forces the power play to shoot from the outside where chances are lower.",tip:"PK box protects the slot. That's the whole idea. Stay in shape."},
    {id:"u11tf5",cat:"Gap Control",pos:["D"],concept:"Give lots of room on D",d:1,type:"tf",sit:"As a defenseman, you should give the attacker as much room as possible so they can't get around you.",ok:false,why:"Too much gap gives the attacker time and space to make plays. Good gap control means closing the distance so they have less time to decide, while still being able to match their speed.",tip:"Big gap = free time for the attacker. Close it down. Take away their time."},
    {id:"u11tf6",cat:"Game IQ",pos:["F","D"],concept:"Communicate on ice",d:1,type:"tf",sit:"Talking to your teammates on the ice — calling for the puck, calling out open players, warning about pressure — makes your team better.",ok:true,why:"Communication is one of the biggest advantages a team can have. Calling 'man on,' 'time,' 'wheel,' or 'open' gives your teammates information they can't see. Quiet teams get surprised.",tip:"Talk on the ice. Every call helps. Quiet teams lose pucks they didn't need to lose."},
    {id:"u11tf7",cat:"Offensive Pressure",pos:["F"],concept:"Everyone forecheck deep",d:2,type:"tf",sit:"On a forecheck, all three forwards should go deep into the zone to chase the puck.",ok:false,why:"If all three forwards go deep, there's nobody high to cut off the breakout pass or recover if the other team escapes the pressure. At least one forward stays high.",tip:"Forecheck: one or two deep, one stays high. Never all three in the corner."},
    {id:"u11tf8",cat:"Skating",pos:["F","D"],concept:"Glide to the bench",d:1,type:"tf",sit:"When making a line change, it's fine to glide slowly to the bench since your replacement is already coming on.",ok:false,why:"Gliding to the bench means you're on the ice longer without contributing and your team is effectively short a player in the play. Skate hard to the bench so the change is fast and clean.",tip:"Skate hard to the bench. Every second of coasting is a second your team plays short."},
    {id:"u11tf9",cat:"Puck Protection",pos:["F","D"],concept:"Body between puck and checker",d:2,type:"tf",sit:"When protecting the puck, you should keep your body between the puck and the opposing player at all times.",ok:true,why:"Puck protection is about body position. Your body is a shield — keep it between the defender and the puck, and they can't get it without going through you.",tip:"Puck protection = body position. Shield the puck with your body. Simple and effective."},
    {id:"u11tf10",cat:"Blue Line Decisions",pos:["D"],concept:"D always stays back",d:2,type:"tf",sit:"As a defenseman, you should never join the rush into the offensive zone.",ok:false,why:"Defensemen can and should join the rush when the situation is right — when there's a clear odd-man advantage or your partner is back to cover. Good D join the play; they just do it smartly.",tip:"D can join the rush — just make sure your partner has you covered. Smart D jump in at the right time."},
  ],
  "U13 / Peewee":[
    // EASY (d:1)
    {id:"u13q1",cat:"Blue Line Reads",concept:"Zone entry basics",d:1,sit:"You're the puck carrier entering the offensive zone. One defender is set at the blue line right in front of you. What's the right decision?",opts:["Try to carry it through them at full speed","Read the defender — if they're set, use your linemate or chip it behind them","Dump it immediately every time","Stop at the red line"],ok:1,why:"A set defender at the blue line is telling you something. Read them — if they're set and you try to carry, you risk a turnover in the worst spot. Use your linemate or chip the puck in.",tip:"Defender set at the line? Read them. Chip, use your linemate, or carry — but read first."},
    {id:"u13q2",cat:"Defensive Zone",concept:"Man coverage",d:1,sit:"Three attackers enter your zone. You're the center on defense. Your two wingers have taken the two opposing wingers. Who do you cover?",opts:["The puck","The opposing center","The open space in the slot","Help whichever winger needs it"],ok:1,why:"In man-to-man defensive zone coverage, the center covers the opposing center. Covering your assignment — not the puck — is the foundation.",tip:"Three attackers in your zone? As the center, you've got their center. Find them and cover them."},
    {id:"u13q3",cat:"Rush Reads",concept:"3-on-2 middle lane",d:1,sit:"You're the center on a 3-on-2. Both defenders take your two wingers. The middle lane is completely open. What do you do?",opts:["Pass to the right winger","Pass to the left winger","Drive the middle lane and shoot — the defenders opened it for you","Pull up and regroup"],ok:2,why:"When both defenders go wide to cover the wings, they've given you the middle. Drive it and shoot — the goalie is unscreened and the lane is open.",tip:"Both D go wide on a 3-on-2? Drive the middle. Shoot."},
    {id:"u13q4",cat:"Puck Management",concept:"Under pressure simple play",d:1,sit:"You have the puck in your own zone. A forechecker is closing hard. You have a D partner five feet away and wide open. What do you do?",opts:["Try to carry it out yourself","Pass immediately to your open D partner","Force the long breakout pass","Shoot it down the ice"],ok:1,why:"Under pressure in your own zone, the simple play is almost always right. Open D partner five feet away — give it to them.",tip:"Under pressure with an open partner? Give it to them. Simple is smart."},
    {id:"u13q5",cat:"Finishing",concept:"Slot shot",d:1,sit:"You catch a pass in the slot. The goalie is set in the middle. You have a half-second. What's the best shot?",opts:["Deke and try to go around them","Quick release low to the corner — the goalie has to move and can't get there in time","Hold the puck and wait for a better angle","Pass to a teammate on the perimeter"],ok:1,why:"A set goalie in the slot means high shots are low-percentage — they're ready. Low, quick releases to the corner beat goalies who are set.",tip:"Slot with a set goalie? Quick low release to the corner. Speed beats power here."},
    {id:"u13q6",cat:"Breakouts",concept:"Breakout basics",d:1,sit:"Your defenseman picks up the puck in your own corner. As a winger, what's your job?",opts:["Go into the corner to help them","Get up the wall — be the outlet option","Stay near the net in case of a turnover","Skate to center ice immediately"],ok:1,why:"The winger's breakout job is to get up the wall fast and give the defenseman a clean outlet. If you go to the corner, you're in the same spot as the D with nobody to pass to.",tip:"D in the corner? You go up the wall. Get open."},
    {id:"u13q7",cat:"Special Teams",concept:"PP extra man",d:1,sit:"Your team is on the power play. You have the extra skater. What's the most important thing your team should be doing with that advantage?",opts:["Skate harder than usual","Move the puck until you find the open player — the extra man means someone is always open","Shoot from wherever you have the puck","Stay in a tight group near the net"],ok:1,why:"The power play advantage is the extra skater. Moving the puck until you find who isn't covered exploits that advantage.",tip:"Power play: someone is always open. Move the puck until you find them."},
    {id:"u13q8",cat:"Gap Control",concept:"1-on-1 defense",d:1,sit:"An attacker is coming at you 1-on-1 at the top of your defensive zone. What's the right approach?",opts:["Charge at them immediately to take the puck","Back up at a controlled pace, angle them toward the boards, and wait for their first move","Turn and race them to your crease","Stand completely still and poke check from far away"],ok:1,why:"Rushing a skilled attacker gives them the chance to blow past you. Backing up at a controlled gap while angling forces them to go where you want.",tip:"1-on-1 defense: angle, control your gap, make them decide first."},
    {id:"u13q9",cat:"Transitioning",concept:"Defensive transition",d:1,sit:"Your team just turned the puck over in the offensive zone. The other team has it and is breaking out. What should every forward do immediately?",opts:["Stay in the offensive zone in case it comes back","Turn around and backcheck hard — immediately","Skate slowly back and watch","Wait at the red line"],ok:1,why:"The instant the puck changes hands, every forward transitions back. The sooner you go, the less damage the other team can do.",tip:"Turnover? Turn around. Right now. Every forward."},
    {id:"u13q10",cat:"Cycle Play",concept:"Cycling purpose",d:1,sit:"Your team is cycling in the offensive zone. What is the cycle designed to create?",opts:["Time of possession for its own sake","Openings — shot lanes, slot passes, or players breaking free. Possession is the means, not the goal.","Confusion by passing quickly","Fatigue in the penalty killers"],ok:1,why:"Cycling without purpose is just skating. The cycle is designed to move defenders and create openings — a slot pass, a shot lane, or a player breaking to the net.",tip:"Cycle: you're looking for the opening. Possession is the means, not the goal."},
    {id:"u13q11",cat:"Defensive Zone",concept:"Corner coverage",d:1,sit:"The puck goes into the corner in your defensive zone. You're the nearest forward. Your D is already going there. What do you do?",opts:["Go help in the corner — two is better than one","Hold the front of the net — don't leave it empty","Go to the blue line","Skate to center ice"],ok:1,why:"When your D goes to the corner, you cover the net front. Two players in the corner leaves the most dangerous area — the crease — completely empty.",tip:"D goes to the corner? You hold the net front. Don't follow them in."},
    {id:"u13q12",cat:"Finishing",concept:"Rebound position",d:1,sit:"Your teammate is about to shoot from the point. You're the nearest forward. Where should you be?",opts:["Back up to give the shooter space","Crash the net — be there for the rebound before the shot arrives","Stay at the half-wall","Skate to the corner"],ok:1,why:"Crashing the net before the shot arrives puts you in position for a rebound before the goalie can cover. Net-front presence on shots wins games.",tip:"Teammate shooting from the point? Crash the net. Get there before the puck does."},
    {id:"u13q13",cat:"Puck Management",concept:"Pre-read",d:1,sit:"A pass is coming to you in the offensive zone. Before the puck reaches you, what should you already be doing?",opts:["Watching the pass to make sure you catch it","Looking up and deciding where you're going with the puck before it arrives","Calling for the puck louder","Getting ready to shoot no matter what"],ok:1,why:"Pre-reading the play — deciding where you're going before the puck arrives — is what separates slow players from fast ones.",tip:"Pass coming? Decide what you're doing with it before it arrives. Pre-read."},
    {id:"u13q14",cat:"Breakouts",concept:"Reading the forecheck",d:1,sit:"Your D picks up the puck. One forechecker is closing from the left. Your right winger is up the wall on the right — open. Your left winger is covered. What's the breakout call?",opts:["Force the pass to the covered left winger","Pass to the open right winger — the forechecker has committed to the left side","Carry it out yourself no matter what","Rim it around the boards"],ok:1,why:"The forechecker committing to one side creates an opening on the other side. Read the forechecker and use the open outlet.",tip:"Forechecker committed to one side? The outlet on that same side may be open."},
    {id:"u13q15",cat:"Gap Control",concept:"Back up fast",d:1,sit:"Two attackers are coming at you on a 2-on-1. They have speed. What's the first thing you do?",opts:["Commit to the puck carrier immediately","Back up fast enough to not get beaten by their speed, stay in the middle, and force the shooter","Race toward the net","Skate to the weak side to cover the trailer"],ok:1,why:"Speed on a 2-on-1 is the attacker's advantage. Backing up fast enough while staying in the middle takes away the pass and forces the shot.",tip:"Fast 2-on-1? Back up fast. Stay in the middle. Force the shot."},
    // MEDIUM (d:2)
    {id:"u13q16",cat:"Blue Line Reads",concept:"Chip and chase",d:2,sit:"You're the puck carrier in the neutral zone at full speed. Two defenders are set at the blue line. Your linemate is trailing. Best entry?",opts:["Try to carry it between both set defenders","Chip the puck past the inside defender and go get it, or use a give-and-go with your trailer","Dump it hard into the corner and chase","Stop at the red line and regroup"],ok:1,why:"Carrying against two set defenders at the blue line is low-percentage. The chip-and-chase or give-and-go with the trailer are the smart options.",tip:"Two set defenders? Chip + go or use your trailer. Don't carry into a wall."},
    {id:"u13q17",cat:"Blue Line Reads",concept:"Pinch read",d:2,sit:"You're the offensive zone D at the blue line. The puck goes to the corner. Your winger is there and has possession, but a defender is closing. No coverage behind you. Your other winger is at the half-wall. Should you pinch?",opts:["Yes — go help your winger in the corner","No — your winger has possession and your half-wall winger can support. Hold the blue line.","Yes — always pinch when your winger has the puck","Go to the net front instead"],ok:1,why:"Your winger has possession and the half-wall winger can support. You don't need to go. Pinching here with no coverage behind you risks a breakout against you.",tip:"Winger has it and half-wall can help? Hold the line."},
    {id:"u13q18",cat:"Blue Line Reads",concept:"D-to-D switch",d:2,sit:"You're the right D at the point on the power play. A PK forward is closing hard on you. Your left D partner is wide open. What do you do?",opts:["Hold the puck and try to beat the pressure","Make a quick D-to-D pass to your partner — they're open and you're not","Shoot through the pressure","Rim it around the boards"],ok:1,why:"Under pressure at the point, the D-to-D pass resets the play. Your partner has time and a better look.",tip:"Pressure coming at the point? D-to-D. Let your partner reset."},
    {id:"u13q19",cat:"Defensive Zone",concept:"Reading the cycle",d:2,sit:"The other team is cycling below the dots in your zone. As the weak-side defenseman, when do you challenge the puck carrier?",opts:["Every time the puck moves","When a player with the puck is in a dangerous spot — near the slot or about to pass to the slot","Never — always hold your spot","When your partner goes to the corner"],ok:1,why:"Defending the cycle means picking your moments. You don't challenge every pass — protect your position and challenge when the puck is in a truly dangerous spot.",tip:"Defending the cycle: stay in position. Challenge when dangerous, not just moving."},
    {id:"u13q20",cat:"Defensive Zone",concept:"Overload coverage",d:2,sit:"Three attackers enter your zone and overload the left side — two on the left, one on the right. Both your D are back. How do they adjust?",opts:["Both D go left to cover the two attackers","One D takes the two on the left, the other holds the middle and takes the weak-side attacker — both communicate","Both D go right","One D goes behind the net"],ok:1,why:"An overload forces the D to communicate and adjust. One D takes the strong side with two attackers, the partner takes the weak-side player and the slot.",tip:"Overload in your zone: communicate. One takes the strong side, the other holds the middle and weak side."},
    {id:"u13q21",cat:"Rush Reads",concept:"2-on-1 timing",d:2,sit:"You're the puck carrier on a 2-on-1. The lone defender is backing up in the middle, not committing to either side. What do you do?",opts:["Pass immediately — it's a 2-on-1","Drive wide to force the defender to fully commit first, then decide","Shoot from where you are","Pull up and regroup"],ok:1,why:"If the defender isn't committing, you haven't created the advantage yet. Drive wide to force their decision.",tip:"Defender not committing? Make them. Drive wide first."},
    {id:"u13q22",cat:"Rush Reads",concept:"Rush breakdown response",d:2,sit:"Your team rushes 3-on-2. The play breaks down and the other team gets the puck. You're the center, close to the play. What do you do first?",opts:["Go to the bench immediately","Pressure the puck carrier immediately to slow the breakout","Skate to the blue line","Stand still and watch"],ok:1,why:"When a rush breaks down, the nearest forward pressures the puck immediately. Slowing their first move buys your teammates two seconds to recover.",tip:"Rush broke down? Pressure the puck immediately. Buy your team time."},
    {id:"u13q23",cat:"Finishing",concept:"Reading the goalie pre-shot",d:2,sit:"You're about to shoot from the slot. The goalie is leaning hard to your right. Where should you shoot?",opts:["Top right — over their shoulder on the side they're leaning","Low left — the opposite side of where they're leaning. They can't recover in time.","Right at them — power wins","Wait for them to reset before shooting"],ok:1,why:"Pre-shot reads of the goalie give you a target before you release. A goalie leaning hard to one side is leaving the other side vulnerable.",tip:"Goalie leaning hard one way? Shoot the opposite side. They can't recover in time."},
    {id:"u13q24",cat:"Finishing",concept:"Breakaway — aggressive goalie",d:2,sit:"You're on a breakaway. The goalie is skating aggressively out to cut your angle. What's the most effective play?",opts:["Shoot blocker side immediately from distance","Pull the puck wide, make the goalie commit to one side, then shoot or go to the other side","Try a straight backhand shot","Slow down and wait until you're right on top of them"],ok:1,why:"An aggressive goalie is looking for an early shot or for you to go straight. Make them commit — take the puck wide, let them follow, then shoot or go opposite.",tip:"Aggressive goalie on a breakaway: make them commit first. Then go where they're not."},
    {id:"u13q25",cat:"Breakouts",concept:"Reverse under pressure",d:2,sit:"Your team is under heavy forecheck pressure. The puck is won behind your net. Two forecheckers are pinching in from both sides. What breakout option gives you the best chance?",opts:["Wheel and try to carry it out yourself","Reverse the puck to the other side — one forechecker can't follow, buying time for your winger to get position","Rim it around the boards hard","Shoot it down the ice for icing"],ok:1,why:"Under heavy forecheck pressure with two pinching forecheckers, the reverse gives you an extra second. One forechecker can't cover both sides simultaneously.",tip:"Two forecheckers pinching? Reverse the puck. One of them can't follow."},
    {id:"u13q26",cat:"Breakouts",concept:"Stretch pass",d:2,sit:"Your D picks up the puck. Both wingers are covered. Your center breaks free through the neutral zone — 40 feet away but completely open. What's the call?",opts:["Don't attempt it — too risky","Thread the stretch pass to the center — they're breaking and open","Rim it around the boards","Wait behind the net for the forecheckers to leave"],ok:1,why:"A stretch pass to a breaking center turns a defensive zone puck into an immediate rush chance. The reward — an odd-man rush — is worth the risk when the lane is clean.",tip:"Breaking center open on the stretch? Thread it. Risky but the reward is a rush."},
    {id:"u13q27",cat:"Cycle Play",concept:"Half-wall read",d:2,sit:"You're at the half-wall with the puck. The slot defender is watching the corner. Nobody is tight on you. What's the play?",opts:["Pass to the corner","Shoot from the half-wall — you have time and the slot defender is distracted","Pass up to the point","Drop the puck behind you"],ok:1,why:"When the slot defender is watching the corner and nobody's tight on you at the half-wall, you have a shooting opportunity. Take it.",tip:"Nobody on you at the half-wall and slot D distracted? Shoot."},
    {id:"u13q28",cat:"Cycle Play",concept:"Cycle — when to quit it",d:2,sit:"Your team has been cycling for 30 seconds. The defenders have perfectly matched your cycle. Nothing is opening. What do you do?",opts:["Keep cycling — eventually something will open","Stop the cycle — dump the puck deep, change lines, and come back with a new entry","Shoot from the corner","Give the puck to your D at the point"],ok:1,why:"A cycle against a perfectly matched defense that isn't creating anything is burning your legs. Recognize when the cycle isn't working and come in with a different look.",tip:"Cycle going nowhere? Dump and change. Come back with a fresh entry."},
    {id:"u13q29",cat:"Special Teams",concept:"PP movement",d:2,sit:"Your power play is in a 1-3-1. The puck is at the top. A penalty killer closes hard on the top player. What should the top player do?",opts:["Hold the puck and fight through the pressure","Move the puck quickly before the pressure arrives — pass to the half-wall or the other side","Shoot under pressure","Back up to the red line"],ok:1,why:"On the power play, moving the puck before pressure arrives is the key. One extra skater means someone is always open — find them before the PK player gets there.",tip:"PP with pressure coming? Move the puck early. Someone is open."},
    {id:"u13q30",cat:"Special Teams",concept:"PK challenge timing",d:2,sit:"You're on the penalty kill. The power play is cycling below the dots. They're not shooting — just moving the puck. When should you challenge?",opts:["Immediately every time the puck moves","When they slow down or seem to be setting up a shot — not on every pass","Every time they're near the boards","Never — just stay back and protect the slot"],ok:1,why:"On the PK, challenging on every pass runs you out of position. Pick your moments — challenge when the puck carrier is stationary or loading up.",tip:"PK: don't bite on every pass. Pick your moment. Challenge when it counts."},
    {id:"u13q31",cat:"Puck Management",concept:"Leading late",d:2,sit:"Your team is winning by one goal with two minutes left. You win a faceoff in the offensive zone. What's most important?",opts:["Take a big shot immediately to extend the lead","Control the puck, cycle below the dots, use every second — only shoot on a high-quality chance","Dump the puck to the corner and chase","Pass it back to your own zone to be safe"],ok:1,why:"Late-game puck management is a skill. Cycling below the dots burns clock, forces the other team to chase, and keeps the puck away from their skilled players.",tip:"Leading late: the clock is your ally. Protect the puck. Make them chase."},
    {id:"u13q32",cat:"Puck Management",concept:"Quick outlet",d:2,sit:"You win a puck battle in your own corner. Forecheckers are still coming hard. What's the fastest way out?",opts:["Hold the puck and wait for them to stop","Move the puck quickly — first open option up the wall or through the middle","Rim it around the boards","Shoot it down the ice for icing"],ok:1,why:"When forecheckers are bearing down, speed of decision matters more than finding the perfect option. First clean outlet — take it.",tip:"Forecheckers coming fast? Move the puck. First clean option. Go."},
    {id:"u13q33",cat:"Transitioning",concept:"Counter read",d:2,sit:"Your team just had a power play chance and the goalie covered the puck. Faceoff in the offensive zone. You win the draw. Two of the other team's forwards are already breaking out. What's the immediate play?",opts:["Set up the power play again","Get the puck to a breaking teammate immediately — the 2-on-2 counter is better than resetting the PP","Hold the puck and regroup","Dump it in and chase"],ok:1,why:"Reading a counter-opportunity after a dead puck is advanced hockey sense. If two forwards are breaking and you win the draw, the counter is a better chance than resetting the power play.",tip:"Win the draw and teammates are breaking? Go. Counter-attack beats a reset every time."},
    {id:"u13q34",cat:"Transitioning",concept:"PP transition defense",d:2,sit:"Your team is on the power play. The penalty kill gets the puck and two players immediately break the other way 2-on-2. What should your team do?",opts:["Chase immediately and attack","One forward pressures the puck, the others recover their positions — don't panic","All five players retreat to your own zone","Ignore it — the PP will get another chance"],ok:1,why:"A PP counter-attack is dangerous but not a guaranteed goal. One player pressures, everyone else recovers. Panicking and all chasing creates a turnover.",tip:"PK breaks out on a counter? One pressures, others recover. Don't panic."},
    {id:"u13q35",cat:"Gap Control",concept:"Contain the skilled forward",d:2,sit:"A skilled forward is coming at you 1-on-1 at full speed. They're a known stickhandler. What do you avoid doing?",opts:["Backing up and staying patient","Poking check from maximum distance or charging them early","Angling them toward the boards","Waiting for their first move before reacting"],ok:1,why:"A skilled stickhandler wants you to commit early — a premature poke check gives them exactly the step they need to blow past you. Stay patient.",tip:"Skilled forward 1-on-1? Don't commit early. Stay patient. Make them decide first."},
    {id:"u13q36",cat:"Gap Control",concept:"Don't commit to a fake",d:2,sit:"You're the defenseman and an attacker fakes to the backhand. You start to move with the fake. What do you do next?",opts:["Keep moving with the fake — commit fully","Stop your movement, reset your feet, and regain your gap — don't fully commit","Fall down to block","Poke check immediately"],ok:1,why:"Getting caught on a fake is recoverable if you stop your feet and reset quickly. Fully committing to the fake loses the gap entirely.",tip:"Bit on a fake? Stop your feet immediately and reset. Don't chase the fake."},
    {id:"u13q37",cat:"Defensive Zone",concept:"Screening on PK",d:2,sit:"The other team is on the power play. A forward is screening your goalie right in front of the crease. The puck is at the point. What's your job as the nearest PK player?",opts:["Go pressure the point player with the puck","Move the screener out of the crease — your goalie needs to see","Stay in a passing lane","Back up to the crease yourself"],ok:1,why:"A screener blocking your goalie's sightline is the most dangerous player on the ice. Moving them out is the priority — before the shot is taken.",tip:"Screener in the crease? Move them out. Your goalie needs to see."},
    {id:"u13q38",cat:"Defensive Zone",concept:"PK box integrity",d:2,sit:"Your team is on the penalty kill in a box formation. The power play moves the puck quickly around the outside. One of your PK players starts chasing every pass. What goes wrong?",opts:["Nothing — chasing is fine on the PK","Chasing breaks the box — gaps open up and the power play gets into the dangerous areas you were protecting","Chasing tires out the power play","Chasing makes the power play hesitate"],ok:1,why:"The box on the penalty kill works because every player holds their position. Chasing every pass breaks the structure and creates gaps the power play exploits.",tip:"PK box: hold your spot. Don't chase every pass. The box works when everyone stays in it."},
    {id:"u13q39",cat:"Finishing",concept:"Front of net battle",d:2,sit:"You have the puck right in front of the opponent's net. A defender has grabbed your stick and a second is pushing you from behind. The goalie is scrambling. What do you do?",opts:["Stop and call for a penalty","Keep your feet moving and get your stick free — any shot or swipe on net is worth taking","Fall down to draw a penalty","Pass it out of the area"],ok:1,why:"In front of the net under pressure, stopping your feet is the worst thing you can do. Keep moving, get your stick free, and put anything on net.",tip:"Front of net with defenders on you? Keep your feet moving. Get the stick free. Shoot anything."},
    {id:"u13q40",cat:"Finishing",concept:"Tip drill",d:2,sit:"A shot comes from the blue line right at the middle of the net. You're standing in front of the goalie. What's your job?",opts:["Get out of the way","Tip the puck — even a slight redirection completely changes the trajectory and defeats the goalie's tracking","Call for it to go wide","Skate away from the crease"],ok:1,why:"Tipping a shot on net is one of the most effective plays in hockey. Even a small deflection changes the trajectory enough to beat a goalie who is tracking the original shot.",tip:"Shot coming from the point right at the goalie? Tip it. Any deflection beats their tracking."},
    // HARD (d:3)
    {id:"u13q41",cat:"Blue Line Reads",concept:"Point fake",d:3,sit:"You're the point on the power play. You have the puck and a shooting lane — but two PK forwards are closing on you hard. You have one second. What's the best play?",opts:["Shoot immediately before they close","Fake the shot to freeze them, then pass to the half-wall player who opened up when the PKers committed to you","Hold the puck and wait for a lane","Pass back to the other point"],ok:1,why:"When two PK players commit to you, they've left someone open. A shot fake freezes them for a split second — the half-wall opens up the instant they both lean at you.",tip:"Two PKers closing? Fake the shot. Someone opened up when they committed."},
    {id:"u13q42",cat:"Blue Line Reads",concept:"Pinch timing",d:3,sit:"You're the offensive zone D at the blue line. Your forward is about to lose possession of the puck in the corner to a defender who can break with speed. Should you pinch?",opts:["Yes — pinch and help","No — if possession is about to be lost, pinching puts you deep with no coverage during a fast breakout","Go to the net instead","Take a shot from the line as a distraction"],ok:1,why:"The moment possession is about to be lost is the worst time to pinch. If the D gets the puck clean, they'll have a speed advantage with you caught deep.",tip:"Possession about to be lost in the corner? Don't pinch. Hold the line."},
    {id:"u13q43",cat:"Blue Line Reads",concept:"Cheat back for counter",d:3,sit:"You're the D at the point. You see the opposing center beginning to break toward your blue line for a potential counter. Your team still has the puck. What do you do?",opts:["Follow the center toward your own zone","Hold the blue line but cheat back slightly — be ready to pursue if the puck turns over","Ignore them — focus on the attack","Call for the puck yourself"],ok:1,why:"Reading a player beginning to position for a counter lets you cheat back slightly. You stay at the line but you're ready. If the puck turns, you're in position.",tip:"Center positioning for a counter? Cheat back slightly. Ready for the turnover."},
    {id:"u13q44",cat:"Defensive Zone",concept:"Trap recognition",d:3,sit:"The other team is sitting back in a 1-2-2 neutral zone trap. Every time your team tries to enter, they get stopped at the red line. What adjustment do you make?",opts:["Keep trying to carry it in — eventually you'll break through","Pull the puck back to your D, use a D-to-D pass to overload one side, or try a stretch pass to a breaking forward","Dump the puck in every time","Skate around the outside of the trap repeatedly"],ok:1,why:"A 1-2-2 trap is designed to stop straight-line carries. The answer is patience and lateral movement — go backward to go forward.",tip:"Against a trap: go backward to go forward. Change the angle. Be patient."},
    {id:"u13q45",cat:"Defensive Zone",concept:"Last man back",d:3,sit:"You're the last defender back as two attackers come in on you. One has the puck on the left. One is cutting to the net on the right. What do you do?",opts:["Commit to the puck carrier on the left","Stay in the middle — take away the pass to the cutter and force the shot. Your goalie handles the shot.","Chase the cutter to the right","Back up to your crease"],ok:1,why:"Last man back on a 2-on-1: take away the pass, force the shot, trust your goalie. Don't commit to either attacker until they force your hand.",tip:"Last man back on a 2-on-1: take away the pass. Let the goalie have the shot."},
    {id:"u13q46",cat:"Defensive Zone",concept:"Late attacker",d:3,sit:"Two attackers entered your zone and both D picked them up. A third attacker trails in 5 seconds later — nobody picked them up. You're the center on defense. What do you do?",opts:["Stay with your current assignment","Pick up the late attacker — your winger on that side needs to find their assignment","Call it out and let someone else handle it","Ignore it — your D will figure it out"],ok:1,why:"A late attacker entering the zone creates a coverage breakdown. The center needs to pick them up or communicate a switch immediately.",tip:"Late attacker uncovered? Call it and pick them up. Coverage gaps get exploited."},
    {id:"u13q47",cat:"Rush Reads",concept:"Goalie reads the 2-on-1",d:3,sit:"You're the puck carrier on a 2-on-1. The defender commits fully to your teammate. The goalie slides across expecting your pass. What's the right call now?",opts:["Pass to your teammate as planned","Shoot — the goalie has moved and there's a lane on your side","Pass to the other side","Pull up and regroup"],ok:1,why:"When the defender commits to your teammate AND the goalie slides to take away the pass, they've left your side open. Shoot — the goalie has moved.",tip:"2-on-1: if the goalie chases the pass, shoot. Read the goalie."},
    {id:"u13q48",cat:"Rush Reads",concept:"Backcheck weak side",d:3,sit:"Your team turns the puck over. The other team has a 2-on-1 and you're the only forward close enough to get back. You can't catch the puck carrier. What do you do?",opts:["Skate as fast as you can directly at the puck carrier","Skate back hard on the weak side — get between the second attacker and the net to support your D","Stop skating — you can't help","Go to the bench for a line change"],ok:1,why:"You can't catch the puck carrier, but you can take away the pass option on the weak side. Get behind the play on the weak side and take away the easiest option.",tip:"Can't catch the puck carrier? Get to the weak side. Take away the pass."},
    {id:"u13q49",cat:"Rush Reads",concept:"Counter after dead puck",d:3,sit:"Your team just finished a power play chance and the goalie covered the puck. You're a forward who just won the faceoff in the offensive zone. You see two opponents already breaking out. What's the immediate play?",opts:["Dump it in and regroup","Get the puck to a breaking teammate immediately — the 2-on-2 counter is better than resetting the PP","Hold the puck and regroup","Set up the power play again"],ok:1,why:"Reading a counter-opportunity after a dead puck is advanced hockey sense. If two forwards are breaking and you win the draw, the counter is a better chance than resetting.",tip:"Win the draw and teammates are breaking? Go. Counter-attack beats a reset every time."},
    {id:"u13q50",cat:"Finishing",concept:"Slot — open but defended",d:3,sit:"You're in the slot with the puck. The goalie is square. A defender is closing from your left. Your teammate is breaking to the back post, completely open. The goalie has no idea. You have one second. What do you do?",opts:["Shoot — you're in the slot","Pass to the breaking teammate — open player at the back post with goalie unaware is the highest-percentage play","Hold the puck","Skate behind the net"],ok:1,why:"An open teammate at the back post with the goalie unaware is a higher-percentage chance than a slot shot against a set goalie. The selfless play is also the smart play.",tip:"Teammate open at the back post with the goalie unaware? Pass. That's the highest-percentage play in hockey."},
    {id:"u13q51",cat:"Finishing",concept:"Tight angle backhand",d:3,sit:"You're in tight to the net — five feet out. The goalie is set. You have the puck on your backhand but barely any time. What do you do?",opts:["Try to switch the puck to your forehand for a better shot","Release your backhand immediately — the goalie is set for the forehand anyway","Pass to a teammate outside","Skate around to get a better angle"],ok:1,why:"In tight to the net with time running out, a quick backhand release is often better than taking the time to switch to your forehand. The goalie is already set for the forehand.",tip:"In tight with time running out? Shoot what you've got. Don't switch hands."},
    {id:"u13q52",cat:"Finishing",concept:"One-timer recognition",d:3,sit:"You're on the power play at the half-wall. The puck carrier passes it to you in stride. The goalie is leaning left. What's the right play?",opts:["Stop the puck and look for a pass","One-time it to the right side where the goalie hasn't moved yet — quick release beats the goalie before they can adjust","Stickhandle and wait","Pass it back to the point"],ok:1,why:"A one-timer on the power play catches the goalie before they can reset. Stopping the puck gives them time to adjust — a quick release doesn't.",tip:"Pass comes in stride with the goalie leaning? One-time it. Quick release wins."},
    {id:"u13q53",cat:"Breakouts",concept:"D carry out",d:3,sit:"Two forecheckers are deep in your zone. Your winger is up the wall but covered. Your center in the middle is also covered. Your D has the puck behind the net. What's the best option?",opts:["Force a pass to a covered teammate","Wheel and carry it out — both forecheckers are committed to your forwards. The D carrying it out is now the best option.","Shoot it around the boards","Wait behind the net"],ok:1,why:"When both forecheckers have committed to your forwards and left the D unguarded, the D carrying it out is the right play.",tip:"Both forecheckers on your forwards? D carry it out. The lane is open."},
    {id:"u13q54",cat:"Breakouts",concept:"Reading both D pinching",d:3,sit:"Your team breaks out. As you cross the red line you see both opposing defensemen are pinching up — they're at the red line, not their blue line. What do you do?",opts:["Slow down and let them set up","Skate hard behind them — you have a breakaway if you beat them to their blue line","Dump the puck in","Pass across to a winger"],ok:1,why:"Defensemen pinching up means they've given up the space behind them. If you can beat them to the puck, you have a breakaway or a clean zone entry.",tip:"Both D pinching up? Burn them. Get behind them before they recover."},
    {id:"u13q55",cat:"Breakouts",concept:"Short side option",d:3,sit:"Your team is breaking out. The strong-side winger is completely covered. The D picks up the puck on the right side. The center is in the middle and the left winger is open on the short side. What's the right read?",opts:["Force the pass to the covered strong-side winger","Pass to the open left winger on the short side — shortest distance, cleanest pass","Carry it out yourself","Rim it around the boards"],ok:1,why:"The short-side winger being open is the clean, low-risk breakout pass. The shortest distance pass under pressure is usually the right one.",tip:"Short-side winger open? Take the short pass. Shortest distance = cleanest option."},
    {id:"u13q56",cat:"Cycle Play",concept:"D stepped in",d:3,sit:"You're low in the offensive zone with the puck. The D at the point just stepped down from the blue line into the zone at the top of the circles. They have a lane. What's the play?",opts:["Ignore the D — pass to the corner","Pass to the D who stepped in — they now have a shot from a dangerous area","Shoot from the corner yourself","Pass up the boards to a winger"],ok:1,why:"A defenseman stepping down from the point into the top of the circles has created a scoring chance from a dangerous area. Hitting them in stride while inside the dots is a high-danger play.",tip:"D stepped in from the point? Hit them in stride. That's a dangerous shot location."},
    {id:"u13q57",cat:"Cycle Play",concept:"Open point — all D collapsed",d:3,sit:"Your team is cycling and the slot is clogged. All four opponents are below the dots. What's the play?",opts:["Keep cycling and wait for the slot to open","Pass back to the open point — four defenders below the dots means the point shot is uncontested","Shoot from the corner","Dump the puck and change lines"],ok:1,why:"When all four defenders collapse below the dots, the point is wide open. A point shot from there is uncontested and generates traffic and rebounds.",tip:"Four D collapsed below the dots? The point is open. Give it up. Free shot."},
    {id:"u13q58",cat:"Cycle Play",concept:"Seam pass in the cycle",d:3,sit:"You're at the half-wall with the puck. The near penalty killer is cheating toward you. The player in the middle — the seam — is now open. What's the play?",opts:["Hold the puck at the half-wall","Thread the seam pass to the middle player — the PK forward cheating toward you opened that lane","Shoot from the half-wall","Pass back to the point"],ok:1,why:"When the PK forward cheats toward you, they've vacated the seam. The middle player is open. The seam pass is the highest-danger play.",tip:"Defender cheated toward you? The seam is open. Thread it."},
    {id:"u13q59",cat:"Special Teams",concept:"PP — 10 seconds left",d:3,sit:"Your team has a power play with only 10 seconds left. You're in the offensive zone at the half-wall. No clear shot lane. What's the play?",opts:["Dump the puck in the corner and chase","Shoot from wherever you are — any shot is better than nothing with 10 seconds left","Regroup and try to get set up","Hold the puck and protect it"],ok:1,why:"With 10 seconds left on a PP, the time to set up is gone. Shoot from wherever you are — any shot is better than the power play expiring with no attempt.",tip:"10 seconds left on the PP? Shoot from anywhere. Time's up."},
    {id:"u13q60",cat:"Special Teams",concept:"PP adjustment",d:3,sit:"Your team's power play is struggling. The PK has collapsed everything to the slot and the point. What adjustment do you make?",opts:["Keep shooting from the point — eventually it will work","Pull the puck back out of the zone, reset, and come in with a new entry that attacks a different spot","Dump the puck to the corner","Have every player rush the net"],ok:1,why:"When the PK has your power play figured out and collapsed, pull back and re-enter with a different attack angle. Don't keep running the same play into a locked door.",tip:"PP getting shut down? Pull back and reset. Come in differently."},
    {id:"u13q61",cat:"Special Teams",concept:"PK faceoff forward",d:3,sit:"Your team is on the penalty kill. You're the center taking a defensive zone faceoff. The power play wants to win the draw back to the point for a shot setup. What's your goal on this draw?",opts:["Win it backward to your D","Win it forward — kick it toward the corner or boards to prevent the PP shot setup","It doesn't matter — just win it","Tie up the opposing center after the draw"],ok:1,why:"On a PK defensive zone faceoff, winning it forward — toward the boards or corner — takes away the PP's plan. Winning backward gives the PP exactly what they want.",tip:"PK faceoff in your own zone: win it forward. Take away the point shot."},
    {id:"u13q62",cat:"Special Teams",concept:"PK mindset on a clear",d:3,sit:"Your penalty kill gets the puck out of your zone. It's a 2-on-3 as you exit. Do you try to score shorthanded or just clear?",opts:["Go for the shorthanded goal — attack","Clear the zone and get back — a clean clear is a win on the PK","Pass back to your goalie","Dump it right back in"],ok:1,why:"A clean clear on the PK is a win — it kills clock and resets the power play. Shorthanded goals happen but they shouldn't be the plan.",tip:"PK clear: clean exit = success. Don't gamble on a shorthanded goal."},
    {id:"u13q63",cat:"Gap Control",concept:"Stick in the lane",d:3,sit:"You're a forward backchecking on a 2-on-1. Your D is in the middle taking away the pass. The shooter pulls up just inside the blue line and winds up for a slap shot. You're close. What can you still do?",opts:["Keep skating — you can't help anymore","Get your stick in the shooting lane to deflect or block — you're close enough","Dive on the ice","Call for your D to rush the shooter"],ok:1,why:"A backchecker who's close to the shooter has one job — get your stick in the lane. A deflected or blocked shot is massive. Every stick in the lane matters.",tip:"Shooter winding up and you're close? Get your stick in the lane. Deflect it."},
    {id:"u13q64",cat:"Gap Control",concept:"Rush gap — back up speed",d:3,sit:"Three attackers are rushing at your two defensemen. All three are at top speed. What's the biggest mistake a defenseman can make here?",opts:["Backing up too fast","Pinching up — closing aggressively on the puck carrier instead of backing up","Staying in the middle of the ice","Talking to their partner"],ok:1,why:"Pinching up against a fast rush hands the attacking team a massive speed advantage. Backing up at the right controlled pace is the correct response.",tip:"Rush coming with speed? Back up controlled. Never pinch up against a fast rush."},
    {id:"u13q65",cat:"Puck Management",concept:"Read the whole play",d:3,sit:"You have the puck at center ice. A 3-on-2 is developing. Your left winger is on the left, your right winger is on the right, and a forward is trailing. Both defenders are inside. What's the read?",opts:["Pass immediately to the left winger","Look at both defenders first — pass to whichever winger the defenders are leaving more open, or drive the middle if it's open","Shoot from center ice","Dump the puck in"],ok:1,why:"Reading both defenders first tells you which option is actually open before you commit. The best puck carrier reads the whole ice, not just one option.",tip:"3-on-2 developing? Read both defenders before picking your option."},
    {id:"u13q66",cat:"Puck Management",concept:"Delay game late",d:3,sit:"Your team is winning by one goal with 90 seconds left. You win a puck battle in the neutral zone. What's the right thing to do with the puck?",opts:["Attack immediately and try to score another goal","Control the puck along the boards, protect it, and force the other team to come get it — use every second","Dump it into the other team's zone","Shoot it down the ice"],ok:1,why:"Game management late means using the clock. Protecting the puck in the neutral zone makes the other team come to you and burns precious seconds.",tip:"Leading late and won the puck? Protect it. Use the clock. Make them come to you."},
    {id:"u13q67",cat:"Puck Management",concept:"PP or counter?",d:3,sit:"Your team just finished a power play. The puck is stopped and the penalty expires. Now your team is 5-on-5 but the other team's defensemen are still pinched in your offensive zone. What do you do?",opts:["Reset to standard 5-on-5 play","Exploit the pinched D immediately — move the puck quick and attack before they recover","Change lines — the PP is over","Slow down and regroup"],ok:1,why:"When the other team's D are caught pinched at the end of your power play, the transition to 5-on-5 creates an immediate odd-man opportunity. Attack before they recover.",tip:"Penalty expired and their D are still deep? Attack immediately. That's a transition chance."},
    {id:"u13q68",cat:"Transitioning",concept:"Quick exit after forecheck",d:3,sit:"Your team is forechecking and the other team wins a battle in the corner. They're about to break out with speed. You're the high forward. What's the most important thing you do right now?",opts:["Chase the puck into the corner","Hold your position and intercept the first outlet pass — you're the plug","Immediately skate back to your own zone","Go to the bench"],ok:1,why:"When the puck changes in the corner, the high forward's job is to be the first interceptor — not to chase. Holding position and reading the breakout gives you a chance to pick off the first pass.",tip:"They won the corner battle? High forward reads the breakout. Don't chase — intercept."},
    {id:"u13q69",cat:"Transitioning",concept:"Transition timing",d:3,sit:"Your team just won a puck battle in your own zone. Two of your forwards are already at center ice. The other team has one player back. A 3-on-1 is developing. What's the trigger?",opts:["Wait until all three forwards are in the neutral zone","Go immediately — the 3-on-1 window closes fast as the other team gets back","Regroup at your own blue line","Dump it in and change lines"],ok:1,why:"Transition opportunities close fast. If two forwards are already at center and you have a 3-on-1 developing, going immediately is how you exploit it.",tip:"Transition chance opening? Go now. Those windows close in seconds."},
    {id:"u13q70",cat:"Transitioning",concept:"Recognize the D pinch",d:3,sit:"Your team breaks out. As you cross the red line you see both opposing defensemen are pinching up — they're at the red line, not their blue line. What do you do?",opts:["Slow down and let them set up","Skate hard behind them — you have a breakaway if you beat them to their blue line","Dump the puck in","Pass across to a winger"],ok:1,why:"Defensemen pinching up means they've given up the space behind them. If you can beat them to the puck, you have a breakaway or a clean zone entry.",tip:"Both D pinching up? Burn them. Get behind them before they recover."},
    {id:"u13q71",cat:"Finishing",concept:"Pre-read before shooting",d:3,sit:"You're about to receive a pass in the slot. The goalie is aggressive — they're coming way out of the net. Before the puck even reaches you, what should you already be deciding?",opts:["Wait until you have the puck to decide anything","Already deciding: the goalie is out, so you're going low or to the side — your shot destination is chosen before the puck arrives","Focus only on catching the puck cleanly","Decide to pass since the goalie is out"],ok:1,why:"Pre-reading the goalie's position before the puck arrives lets you shoot the instant you catch it. A goalie out of the net is vulnerable low — decide that before the puck gets there.",tip:"Goalie out of the net and puck coming to you? Decide to go low before the puck arrives. Pre-read."},
    {id:"u13q72",cat:"Defensive Zone",concept:"Reading the eyes",d:3,sit:"You're a defenseman in your own zone. The opposing winger has the puck in the corner and keeps looking at the player in the slot. What do you do?",opts:["Watch the puck carrier and wait for the pass to happen","Step in front of the anticipated pass lane — intercept it before it arrives","Go into the corner to pressure the puck carrier","Back up to your crease"],ok:1,why:"Reading a puck carrier's eyes tells you where the pass is going. If they keep looking at the slot, get in that lane before the pass is made — not after.",tip:"Puck carrier keeps looking at one spot? Get in that lane. Intercept before the pass arrives."},
    {id:"u13q73",cat:"Defensive Zone",concept:"Switch communication",d:3,sit:"You're the left defenseman. Your partner calls switch as an attacker cuts from the right side to the left in front of the net. What do you do?",opts:["Stay with your original assignment — don't switch","Take the attacker coming to your side, let your partner clean up their original man","Call the referee","Back up to the crease and cover both"],ok:1,why:"A switch call means you take the player coming to your side while your partner recovers their original man. Communication and trust make it work.",tip:"Partner calls switch? Take the player coming to you. Trust the communication."},
    {id:"u13q74",cat:"Special Teams",concept:"PP seam — half-wall read",d:3,sit:"Your power play is in a 1-3-1. The half-wall player has the puck. The near PK forward is cheating toward the half-wall. The seam pass to the middle player is now open. What's the right play?",opts:["Hold the puck at the half-wall","Thread the seam pass to the middle player — the PK forward cheating toward you opened that lane","Shoot from the half-wall","Pass back to the point"],ok:1,why:"When the PK forward cheats toward you, they've vacated the seam. The middle player is open. The seam pass is the highest-danger play.",tip:"PK forward cheated toward you? The seam is open. Thread it."},
    {id:"u13q75",cat:"Special Teams",concept:"Net-front PP",d:3,sit:"Your team is on the power play. You're the net-front player. A shot comes from the point and the goalie makes the save. The rebound goes to the corner. What do you do?",opts:["Chase the rebound to the corner","Hold your position at the net front unless the puck is about to leave the zone — the power play structure needs you there","Go to the blue line","Skate away from the net"],ok:1,why:"On the power play, structure wins. The net-front player holds position to maintain the formation. If you crash the corner, you leave the most dangerous area empty and the PP formation collapses.",tip:"PP rebound to the corner? Hold the net front. Structure beats chaos."},
    {id:"u13q76",cat:"Cycle Play",concept:"Wheel when covered",d:3,sit:"You're protecting the puck behind the net. A defender has you pinned. Two teammates are in the zone but both are covered. What do you do?",opts:["Force a pass to a covered teammate","Wheel to the other side of the net — moving forces the defender to move and may open a teammate","Try to power through the defender","Fall down and hope for a penalty"],ok:1,why:"Wheeling behind the net when both outlets are covered forces the defender to move with you, which can open a teammate, and resets the pressure.",tip:"Both outlets covered behind the net? Wheel. Force the defense to move."},
    {id:"u13q77",cat:"Cycle Play",concept:"Timing the attack",d:3,sit:"You're cycling below the dots. Your partner passes to you at the half-wall. As soon as the puck hits your stick, you see the slot is completely empty. What's the play?",opts:["Continue cycling — pass back to the corner","Shoot immediately into the open slot or pass to a teammate breaking there","Hold the puck","Drop it back to the point"],ok:1,why:"The slot opening up is exactly what the cycle is designed to create. The instant you see it, attack it — don't keep cycling for its own sake.",tip:"Slot opens during the cycle? That's the goal. Attack it immediately."},
    {id:"u13q78",cat:"Gap Control",concept:"Contain the rush",d:3,sit:"A skilled attacker gets a step on you at the blue line and is now skating toward your net with speed. You can't catch them. What's the right approach?",opts:["Give up and let the goalie handle it","Get your stick into their lane — angle them toward the boards and get your body in front of the shooting lane","Try to grab them","Chase from behind and hope"],ok:1,why:"When you can't catch an attacker, get in their lane. Angling them toward the boards takes away the shooting lane.",tip:"Can't catch them? Get your body in the lane. Take away the shooting angle."},
    {id:"u13q79",cat:"Puck Management",concept:"Protect in D zone late",d:3,sit:"Your team is winning by one goal. You win a battle behind your own net with 30 seconds left. The other team has pulled their goalie. What do you do?",opts:["Immediately shoot the puck the length of the ice to ice it","Protect the puck — use your body and the net, move it to a teammate if needed, and force them to come get it. Only clear it when you have a clean lane.","Skate it out yourself","Pass it randomly away"],ok:1,why:"With 30 seconds left protecting behind your net, protecting the puck and forcing the other team to come get it burns clock. A panicked clear into pressure turns the puck over.",tip:"Last 30 seconds behind your own net? Protect it. Force them to come get it. Clear when the lane is clean."},
    {id:"u13q80",cat:"Transitioning",concept:"Attack transition windows",d:3,sit:"The other team just changed lines mid-play in the neutral zone. Their new players are still getting up to speed. You have the puck. What does this create?",opts:["Nothing — play normally","A transition window — attack immediately while their fresh players aren't at full speed or in position","Change your lines too","Slow down and let them get set up"],ok:1,why:"A line change mid-play creates a brief window where the fresh players aren't at full speed or position. Attacking immediately exploits that window before it closes.",tip:"Other team just changed mid-play? Attack now. Their fresh players aren't set yet."},
    {id:"u13q81",cat:"Finishing",concept:"Shoot while moving",d:3,sit:"You're skating at full speed toward the net. A defender is chasing from behind. Should you slow down to take a more accurate shot?",opts:["Yes — slow down and aim carefully","No — shoot while moving at full speed. A moving shooter is harder for the goalie to track and slowing down lets the defender catch up.","Stop completely first","Pass to a teammate instead"],ok:1,why:"Shooting while moving at full speed is harder for a goalie to track. Slowing down also lets the defender catch up. Shoot while moving.",tip:"Full speed toward the net with a defender behind you? Shoot moving. Don't slow down."},
    {id:"u13q82",cat:"Defensive Zone",concept:"Puck tracker vs. player",d:3,sit:"You're defending in your own zone. The puck is in the corner behind your net. Your assignment is an attacker near the half-wall on the opposite side. Do you watch the puck or watch your man?",opts:["Watch the puck — it's more important to know where the puck is","Watch your man — keep them in front of you so you know when they move. You can track the puck with your peripheral vision.","Watch both equally","Go get the puck yourself"],ok:1,why:"In man coverage, losing sight of your assignment is how they get open for a pass. Keep them in front of you and use your peripheral vision for the puck.",tip:"Man coverage in your own zone: watch your man, not the puck. Use your peripheral vision for the puck."},
    {id:"u13q83",cat:"Breakouts",concept:"Second wave forecheck",d:3,sit:"Your first two forecheckers won the puck battle in the offensive zone. They passed it to you as the third forward coming in. The D is still scrambling. What do you do?",opts:["Stop and wait to see what happens","Attack the scrambled D immediately — they haven't recovered. Be the second wave.","Pass back to your own D","Skate to the corner"],ok:1,why:"The second wave of a forecheck attacks the scramble. If the first two forwards won the battle and the D hasn't recovered, the third forward attacks the confusion immediately.",tip:"First wave won and D is scrambling? Second wave attacks immediately. Go."},
    {id:"u13q84",cat:"Breakouts",concept:"Forecheck trap",d:3,sit:"You're forechecking. The D picks up the puck behind the net and starts to walk out to the left. You're closing from the right. Your linemate is on the left. How do you split?",opts:["Both go directly at the D","You force the D's direction from the right, your linemate cuts off the outlet to the left — trap them between you","You back off and let your linemate handle it","Both back off and reset"],ok:1,why:"A two-player forecheck trap works by forcing the puck carrier in a direction while the other player cuts off the outlet in that direction.",tip:"Two-man forecheck: one forces, one cuts the outlet. Trap them."},
    {id:"u13q85",cat:"Special Teams",concept:"Timeout assignment",d:3,sit:"Your coach calls a timeout with 30 seconds left and your team down by one. You're going back on after the timeout. What should be the first thing in your mind?",opts:["Just play hard","Know your specific job for the next 30 seconds — faceoff role, where to go, who to cover","Try to score the first time you touch the puck","Get pumped up and skate fast"],ok:1,why:"A timeout is a chance to execute a specific play. Walking back on the ice with a clear assignment is more valuable than general energy.",tip:"Timeout: know your specific job before you go back out. Assignment over energy."},
    {id:"u13q86",cat:"Puck Management",concept:"When to hold vs. shoot",d:3,sit:"You're in the offensive zone. You can shoot from where you are — a decent but not great angle. OR you can pass to a teammate in the slot who's slightly covered but would have a much better shot. What do you do?",opts:["Shoot — you have the puck and a shot","Pass to the slot player — the higher danger location is worth the slight coverage risk","Hold the puck and wait","Pass back to the point"],ok:1,why:"A slightly covered player in the slot still represents a higher-danger chance than a clean shot from a poor angle. The math of chance quality favors the slot, even with some risk.",tip:"OK angle vs. slightly covered slot? The slot wins. Higher danger is worth the risk."},
    {id:"u13q87",cat:"Transitioning",concept:"Recognize the transition window",d:3,sit:"Your team has been in the offensive zone for 45 seconds. The other team's defensemen are tired. Your team wins a puck battle and the D are caught flat-footed. What do you do?",opts:["Slow down — you're tired too","Attack immediately through the neutral zone — tired defensemen flat-footed after a long shift are vulnerable to a fast attack","Change lines first","Reset to an even play"],ok:1,why:"Tired, flat-footed defenders after a long shift in their own zone are vulnerable to a fast transition. Attacking immediately — even if your team is also tired — exploits the window before it closes.",tip:"Their D flat-footed after a long shift? Attack now. That's a transition window."},
    {id:"u13q88",cat:"Finishing",concept:"Reading and reacting",d:3,sit:"You skate into the offensive zone with speed. You planned to shoot from the right side, but as you enter you see the goalie has that side covered and a teammate is breaking to the net on the left. What do you do?",opts:["Shoot to the right as planned — stick to the plan","Read and react — pass to your breaking teammate. The plan changes when the situation changes.","Slow down and think","Dump it in and regroup"],ok:1,why:"Plans are starting points, not locks. If the situation changes — a breaking teammate with the goalie covering your planned shot is a change — read it and react.",tip:"Read what's actually there. Your plan is a starting point, not a commitment."},
    {id:"u13q89",cat:"Defensive Zone",concept:"PK third forward coverage",d:3,sit:"Your team is on the penalty kill and set in a box. The power play's point player steps down into the zone at the top of the circles. Nobody in the box has covered them. What does the nearest PK player do?",opts:["Hold the box formation — don't break it","The nearest PK player extends to pressure the point player who stepped in — a player inside the dots with space is too dangerous to leave alone","All four PK players collapse to the crease","Call for a line change"],ok:1,why:"A point player stepping inside the dots with space is one of the most dangerous power play plays. The nearest PK player has to extend and pressure — holding a rigid box against a smart power play gives up that shot.",tip:"PP player stepped inside the dots with space? The nearest PK player extends. Don't leave that shot open."},
    {id:"u13q90",cat:"Gap Control",concept:"Defending the rush with speed",d:3,sit:"A skilled forward has beaten your forecheck and is coming at you with a step of speed. You can't catch them before they enter the zone. What's your priority?",opts:["Give up and let the goalie handle it","Get to the inside position and your lane — angle them toward the boards and stay between them and the net","Try to dive and hook them from behind","Stand still at the blue line"],ok:1,why:"When you can't catch a fast attacker, getting to the inside position and your lane takes away their shooting angle and forces them to go wide. Your goalie can handle the angle.",tip:"Fast attacker beating you to the zone? Get to the inside. Take away the lane."},
    {id:"u13q91",cat:"Cycle Play",concept:"Read the point player",d:3,sit:"You're low in the offensive zone with the puck. The D at the point just stepped down from the blue line because they saw a lane. They're now inside the zone at the top of the circles. What's the play?",opts:["Ignore the D — pass to the corner","Pass to the D who stepped in — they now have a shot from a dangerous area","Shoot from the corner yourself","Pass up the boards to a winger"],ok:1,why:"A defenseman stepping inside the dots has created a scoring chance. Hitting them in stride while inside the dots is a high-danger play.",tip:"D stepped inside? Hit them in stride. That's a dangerous shot location."},
    {id:"u13q92",cat:"Special Teams",concept:"PK box adjust",d:3,sit:"Your penalty kill is in a box. The power play's center has dropped below the dots to create a 1-3-1. Your box is now mismatched against their formation. What adjustment do you make?",opts:["Hold the box — ignore their formation","Adjust — one PK forward drops to pressure the center who dropped in. The box has to mirror the threat.","All four players collapse to the crease","Change to a diamond formation immediately"],ok:1,why:"A 1-3-1 power play vs. a box requires a PK adjustment. One forward drops to pressure the center who's now below the dots — leaving them open in that area gives up the most dangerous shots in hockey.",tip:"PP dropped a player below the dots? One PK forward drops to match. Adjust to the threat."},
    {id:"u13q93",cat:"Puck Management",concept:"Faceoff assignment win",d:3,sit:"Your team wins a faceoff in the offensive zone. The opposing center had to fight hard to tie the draw. The puck goes back to your defenseman at the point. Before the opposing center gets their bearings, what should you do?",opts:["Wait for the play to develop normally","Drive hard to the net immediately — the opposing center just spent all their energy on the draw and the lane to the net may be briefly open","Skate to the corner","Call for a pass from the point"],ok:1,why:"Winning a faceoff creates a split-second window where the opposing center is recovering. Driving hard to the net immediately exploits that window before they recover.",tip:"Win the OZ faceoff? Drive the net immediately. Their center is recovering from the draw."},
    {id:"u13q94",cat:"Transitioning",concept:"Attack after save",d:3,sit:"Your team is defending. The goalie makes a save and controls the puck. The other team has three forecheckers in your zone. Your wingers are pinned. What's the right breakout option?",opts:["Goalie holds the puck for a faceoff","Goalie finds the center breaking through the middle or a winger escaping — don't give the puck to a covered player","Goalie shoots it down the ice","Goalie rims it around the boards"],ok:1,why:"After a save under forecheck pressure, the goalie needs to read the breakout. Finding the center or an escaping winger breaks the forecheck immediately.",tip:"Goalie made the save under pressure? Find the breaking player. Read the breakout."},
    {id:"u13q95",cat:"Defensive Zone",concept:"Prevent the second shot",d:3,sit:"The other team takes a shot and your goalie makes the save. The rebound goes to the corner. An opposing player is racing to it. What do you do?",opts:["Watch to see if your goalie covers it","Get to the rebound before the opposing player — or at least get your body position between them and the puck","Call for your goalie to come out","Back up to the crease"],ok:1,why:"Beating the opposing player to the rebound — or at minimum getting inside position — prevents the second shot. Letting them get a clean rebound in the corner means a second chance against you.",tip:"Rebound in the corner? Race to it or get inside position. Prevent the second shot."},
    {id:"u13q96",cat:"Finishing",concept:"Quick release vs. accuracy",d:3,sit:"You catch a pass in the slot. You see an opening to the top corner. But you hesitate for two seconds while repositioning the puck for what you think will be a better shot. The goalie recovers. What should you have done?",opts:["Always wait for the perfect shot","Released immediately on the catch — the opening was there when you first received it","Passed to a teammate instead","Skated in closer first"],ok:1,why:"Hesitating in the slot gives the goalie time to recover. If there's an opening when you catch the puck, release immediately.",tip:"Opening in the slot? Release immediately. The best shot is the first one."},
    {id:"u13q97",cat:"Gap Control",concept:"Two-on-one — read the goalie",d:3,sit:"You're the lone defender on a 2-on-1. You've taken away the pass. The shooter pulls up and shoots. The goalie makes the save but the rebound comes right to the second attacker. What do you do?",opts:["Chase the second attacker to get the puck","Get your body in front of the second attacker — between them and the net — before they can get the shot off","Back up to your crease","Call for your goalie"],ok:1,why:"When a rebound goes to the second attacker, your job shifts from pass prevention to body blocking. Getting your body between them and the net before they shoot is the only play.",tip:"Rebound goes to the second attacker? Get your body between them and the net. Block the shot."},
    {id:"u13q98",cat:"Puck Management",concept:"Read the game situation",d:3,sit:"It's a tied game in the third period. You have the puck in the neutral zone. Your team's fastest forward is breaking on your left, completely open. A defended pass is available on your right. What do you do?",opts:["Take the safe defended pass on the right","Thread the pass to the breaking forward on the left — a tied game in the third is the time to take the calculated risk for a high-danger chance","Hold the puck","Dump the puck in"],ok:1,why:"A tied game in the third period is when high-danger chances matter most. An open breaking forward is a calculated risk worth taking — the reward is a scoring chance, the risk is a missed pass.",tip:"Tied late with a breaking forward open? Thread it. High-danger chances matter most now."},
    {id:"u13q99",cat:"Special Teams",concept:"PP or 5-on-5 read",d:3,sit:"Your team has been on the power play for 30 seconds with no shots. The penalty kill has been perfect. You have 30 seconds of PP time left. What do you do differently in the last 30 seconds?",opts:["Keep the same approach — eventually it'll work","Increase urgency — shoot earlier, move faster, take more risks. The last 30 seconds of a PP that hasn't scored should look more urgent than the first 90.","Become more conservative — don't give up a shorthanded goal","Change lines and reset"],ok:1,why:"A PP that hasn't generated a shot in 90 seconds needs to change. The last 30 seconds should be more urgent — shoot earlier, move faster, take calculated risks. Running out the PP with the same conservative approach wastes the advantage.",tip:"PP almost over with no shots? Increase urgency. Shoot earlier. Move faster. Time is running out."},
    {id:"u13q100",cat:"Puck Management",concept:"The hardest decision",d:3,sit:"You're in the offensive zone with 5 seconds left in a tied game. You have the puck at the half-wall. A teammate is breaking to the net — open but a defender is almost there. You have a shooting lane. One second to decide. What do you do?",opts:["Shoot — you have a lane and one second","Pass to the breaking teammate — they'll get there before the defender and an open player at the net beats your half-wall shot","Hold the puck","Pass back to the point"],ok:1,why:"In a tied game with 5 seconds left, a breaking teammate who'll beat the defender to the net is a higher-danger chance than a half-wall shot. The risk is the pass, the reward is the highest-danger chance on the ice. That's the elite read.",tip:"Tied game, last 5 seconds, breaking teammate beating a defender to the net? Thread it. That's the highest-danger play. That's elite hockey IQ."},

    // === SEQUENCE ORDERING QUESTIONS ===
    {id:"u13seq1",cat:"Breakouts",pos:["F","D"],concept:"Structured breakout",d:1,type:"seq",sit:"Your goalie makes a save and controls the puck. Put the breakout steps in order.",items:["D sets up behind the net and calls for the puck","Wingers sprint to their breakout lanes along the boards","Center supports low then curls through the middle","D reads pressure and hits the first open option"],correct_order:[0,1,2,3],why:"A structured breakout has defined roles. D retrieves, wings get to their lanes, center fills the middle, and the D reads and passes. The system only works when everyone hits their spots.",tip:"Structured breakout: D retrieves, wings to lanes, center supports, D reads. Hit your spots."},
    {id:"u13seq2",cat:"Special Teams",pos:["F","D"],concept:"Power play entry",d:2,type:"seq",sit:"Your team has a power play and needs to set up in the offensive zone. Put the PP entry steps in order.",items:["Win the draw or gain clean possession in the neutral zone","Puck carrier enters with speed and reads the PK's setup","Supporting players stretch the PK by driving wide and high","Puck moves to the strong side and the PP gets into formation"],correct_order:[0,1,2,3],why:"A clean PP entry is the first step to a successful power play. Possession first, enter with speed and a read, stretch the PK, then set up your formation.",tip:"PP entry: possess, enter with speed, stretch the PK, get into formation. Clean entries = more PP time."},
    {id:"u13seq3",cat:"Defensive Zone",pos:["F","D"],concept:"D-zone faceoff play",d:2,type:"seq",sit:"Your team has a defensive zone faceoff with the other team's top line on the ice. Put the defensive steps in order.",items:["Everyone knows their assignment before the puck drops","Get to your assigned position around the faceoff circle","Center competes on the draw — win it back or tie up","If you lose the draw, immediately get to your coverage assignment"],correct_order:[0,1,2,3],why:"D-zone faceoffs are structured moments. Knowing your job, getting positioned, competing on the draw, and executing coverage immediately are the steps. Teams that wing it on faceoffs give up goals.",tip:"D-zone faceoff: know your job, get set, compete, execute coverage. No freelancing."},
    {id:"u13seq4",cat:"Cycle Play",pos:["F"],concept:"Offensive cycle initiation",d:2,type:"seq",sit:"Your team dumps the puck into the corner to start a cycle. Put the cycle steps in order.",items:["First forward wins the puck battle on the boards","Protect the puck and scan for support options","Second forward comes in low for the short pass or picks up a loose puck","Third forward stays high and the cycle rotation begins"],correct_order:[0,1,2,3],why:"The cycle is a system: win the board battle, protect, get support, and rotate. If the first battle is lost, the cycle never starts. If the third forward goes low, you lose your high option.",tip:"Cycle: win the battle, protect, support, rotate. Lose the first battle and nothing starts."},
    {id:"u13seq5",cat:"Gap Control",pos:["D"],concept:"Defending a rush — full sequence",d:2,type:"seq",sit:"A skilled forward is carrying the puck through the neutral zone at full speed, 1-on-1 against you. Put your defensive steps in order.",items:["Pivot and match their speed while establishing your gap","Read their body language — hips, head, stick position","Close the gap at the blue line and angle them to the outside","Use an active stick to take away their preferred move and force them wide"],correct_order:[0,1,2,3],why:"1-on-1 defending is a sequence of reads and actions. Match speed, read their intent, close at the right time, and take away their best option. Skip the read step and you'll commit too early.",tip:"1-on-1: match speed, read them, close at the line, steer wide. It's a sequence, not a gamble."},
    {id:"u13seq6",cat:"Transitioning",pos:["F","D"],concept:"Neutral zone regroup",d:2,type:"seq",sit:"Your team has the puck but can't enter the offensive zone — the D are too tight. Your center calls for a regroup. Put the steps in order.",items:["Puck carrier turns back and passes to the trailing defenseman","Forwards loop through the neutral zone and rebuild speed","D-to-D pass stretches the PK or defensive setup horizontally","Forwards attack with speed on the second entry attempt"],correct_order:[0,1,2,3],why:"A regroup is a tactical reset, not a failure. Bring it back, rebuild speed, stretch the defense, and attack again with better timing. Forcing a bad entry is worse than resetting.",tip:"Can't get in clean? Regroup. Bring it back, rebuild speed, attack again. Smart, not weak."},
    {id:"u13seq7",cat:"Finishing",pos:["F"],concept:"Net-front scoring sequence",d:3,type:"seq",sit:"You're set up in front of the net on the power play. A shot is coming from the point. Put your steps in order.",items:["Establish position in front of the goalie — between the dots","Screen the goalie by getting big without interfering","Read the shot — is it a tip opportunity or a rebound play?","React — tip on net, collect the rebound, or jam at a loose puck"],correct_order:[0,1,2,3],why:"Net-front presence is a skill with steps. Position, screen, read, react. Players who just stand there without reading the shot miss tip and rebound chances.",tip:"Net front: position, screen, read, react. Standing there isn't enough — you need to read the play."},
    {id:"u13seq8",cat:"Puck Management",pos:["F","D"],concept:"Clock management — protecting a lead",d:3,type:"seq",sit:"Your team is winning by one goal with 3 minutes left. The other team is pressing. Put the puck management steps in order.",items:["Make safe, simple passes — no high-risk plays in your own zone","Use the boards and the glass to clear when under pressure","Change lines quickly to keep fresh legs on the ice","Force them to earn zone entries — don't give up easy possession"],correct_order:[0,1,2,3],why:"Protecting a late lead is about discipline. Safe passes, smart clears, quick changes, and denying easy zone time. One high-risk turnover can cost you the game.",tip:"Protecting a lead: simple plays, clear when pressured, fresh legs, deny entries. Discipline wins."},

    // === SPOT THE MISTAKE QUESTIONS ===
    {id:"u13mis1",cat:"Blue Line Reads",pos:["D"],concept:"Pinch with no support",d:2,type:"mistake",sit:"Your team is in the offensive zone. The puck is loose along the boards near the blue line. You pinch down to get it, but your D partner has also jumped into the play low. The opponent chips it past both of you for a 2-on-0. What's the mistake?",opts:["You should have pinched harder","Both D went — one defenseman must always stay back to cover. If your partner is low, you hold the line. If you're pinching, they hold. Never both.","The forwards should have helped","The puck bounced wrong"],ok:1,why:"Two defensemen caught deep is a catastrophic defensive breakdown. One D always stays high as the safety valve. Communication between the D pair prevents this.",tip:"Both D can't go. Ever. One pinches, one stays. Communicate with your partner."},
    {id:"u13mis2",cat:"Defensive Zone",pos:["F","D"],concept:"Chasing behind the net",d:2,type:"mistake",sit:"In the defensive zone, the puck is behind your net. Both your defensemen go behind the net to battle for it. The opposing center sneaks to the front of the net completely uncovered. They score on a pass out front. What's the mistake?",opts:["The goalie should have stopped it","Both D went behind the net — one D battles for the puck, the other covers the front of the net. Leaving the front of the net empty is one of the most dangerous mistakes in hockey.","The forwards should have been there","The play happened too fast"],ok:1,why:"The front of the net must always be covered. When both D go behind the net, the most dangerous area on the ice is left wide open. One battles, one protects.",tip:"Both D behind the net? Someone better be in front. The front of the net is never optional."},
    {id:"u13mis3",cat:"Rush Reads",pos:["F"],concept:"Offside by overcommitting",d:2,type:"mistake",sit:"Your team has a 3-on-2 rush. The puck carrier slows down to make a play at the blue line. Two forwards are flying into the zone at full speed and cross the blue line before the puck. Offside. Rush killed. What's the mistake?",opts:["The puck carrier was too slow","The two forwards didn't read the puck carrier and entered the zone early — on a rush, everyone times their entry off the puck. If the carrier slows down, you slow down.","The ref made a bad call","The D played it well"],ok:1,why:"Offside on a rush with numbers is one of the most frustrating mistakes in hockey. The forwards must read the puck carrier's speed and time their entry. The puck always crosses first.",tip:"Rush entry: read the carrier's speed. Puck crosses first. Always. Kill your speed if you have to."},
    {id:"u13mis4",cat:"Special Teams",pos:["F","D"],concept:"PK overcommit on pressure",d:2,type:"mistake",sit:"On the penalty kill, your forward leaves the box to chase the puck behind the net. The power play moves it quickly to the open slot area where your forward was supposed to be. Goal. What's the mistake?",opts:["The forward should have chased faster","The forward left their position in the PK box — on the penalty kill, you stay in structure and cover your zone. Chasing the puck out of position opens the most dangerous area on the ice.","The D should have shifted","The goalie wasn't ready"],ok:1,why:"PK discipline means staying in the box. When a player chases out of position, the slot opens up. The power play is designed to exploit exactly that mistake.",tip:"PK: stay in the box. Chase out of position and the slot opens. That's where PP goals come from."},
    {id:"u13mis5",cat:"Finishing",pos:["F"],concept:"Admiring the pass",d:2,type:"mistake",sit:"Your linemate makes a beautiful cross-ice pass to you in the slot. You catch it cleanly and have a half-second to shoot. Instead, you look down to admire the pass and adjust the puck. The goalie sets and you shoot into their chest. What's the mistake?",opts:["The pass was too hard","You hesitated — in the slot with a half-second window, you shoot on the catch. Looking down and adjusting gave the goalie time to get set. Quick release beats perfect setup.","The goalie was lucky","You should have passed it back"],ok:1,why:"Slot chances are about speed of release, not perfection of setup. A half-second of puck adjustment gives the goalie time to square up. Shoot on the catch and beat them before they're ready.",tip:"Slot chance? Shoot on the catch. Don't look down. Don't adjust. Release beats perfection."},
    {id:"u13mis6",cat:"Breakouts",pos:["F","D"],concept:"D skates into pressure",d:2,type:"mistake",sit:"Your D picks up the puck behind the net. The forechecker is closing hard from the left side. Instead of going right or using the boards, your D skates directly into the forechecker. Turnover. What's the mistake?",opts:["The D wasn't strong enough","The D skated into pressure instead of away from it — when a forechecker closes from one side, go the other way or use the boards. Skating into pressure is a guaranteed turnover.","The forechecker was too fast","The forwards didn't help"],ok:1,why:"Reading the forecheck and going away from pressure is breakout 101. Skating into the forechecker gives them exactly what they want — a turnover in a dangerous area.",tip:"Forechecker from the left? Go right. Away from pressure. Always away. Never into it."},
    {id:"u13mis7",cat:"Gap Control",pos:["D"],concept:"Backing up to the net",d:1,type:"mistake",sit:"An attacker is carrying the puck through the neutral zone. Your defenseman keeps backing up all the way to the top of the crease, giving the attacker the entire offensive zone to work with. What's the mistake?",opts:["The D should have been more aggressive","The D gave up too much ice — backing up to the crease gives the attacker time, space, and options. Close the gap at the blue line and take away their time to make plays.","The forwards should have backchecked","The attacker was too skilled"],ok:1,why:"A defender who backs up to the crease surrenders the entire offensive zone. Gap control means closing the distance at the blue line — taking away the attacker's time and space before they can set up.",tip:"Don't back up to your crease. Close the gap at the blue line. Take away their time and space."},
    {id:"u13mis8",cat:"Transitioning",pos:["F","D"],concept:"Slow change after turnover",d:2,type:"mistake",sit:"Your team turns the puck over in the offensive zone. Two forwards are exhausted and glide slowly to the bench for a change. The other team rushes 4-on-3 and scores before the fresh players get into position. What's the mistake?",opts:["The coach should have called for a change earlier","The tired forwards changed too slowly at the wrong time — after a turnover, you sprint back first, then change when the puck is safe. Changing during transition is how you give up odd-man goals.","The defensemen should have held","The other team got lucky"],ok:1,why:"Line changes during defensive transition are deadly. Sprint back first, stabilize the defense, then change when the puck is in a safe area. Gliding to the bench during a rush against is a gift to the other team.",tip:"Turnover? Sprint back first. Change when it's safe. Never change during a rush against."},

    // === WHAT HAPPENS NEXT QUESTIONS ===
    {id:"u13next1",cat:"Cycle Play",pos:["F"],concept:"D-to-D opens the weak side",d:2,type:"next",sit:"Your team is cycling on the strong side. The defense has matched your cycle perfectly — nothing is opening up. Your D at the point makes a D-to-D pass to the weak side. What happens next?",opts:["The cycle continues on the same side","The weak-side D has an open shooting lane or passing option — the defense was overloaded to the strong side and the D-to-D pass shifts the play to open ice","Nothing changes","The weak-side D dumps it in"],ok:1,why:"A D-to-D pass against an overloaded defense opens the weak side completely. The defense was committed to the cycle side and can't recover across the ice in time.",tip:"Cycle stuck? D-to-D to the weak side. The defense overloaded to the strong side can't get there."},
    {id:"u13next2",cat:"Rush Reads",pos:["F","D"],concept:"Trailer on the rush",d:2,type:"next",sit:"Your team has a 3-on-2 rush. Both defenders focus on the three attackers. Your fourth player — the trailing D — jumps into the play late from the blue line, completely unnoticed. The puck carrier sees them. What happens next?",opts:["The trailing D stays back","The puck carrier drops it back to the trailing D who has a clean shot from the top of the circles — the defense never accounted for the trailer","The puck carrier shoots alone","Everyone regroups"],ok:1,why:"The trailing player on a rush is one of the most dangerous weapons in hockey. The defense accounts for the three rushers but forgets the trailer. A drop pass to an uncontested shooter at the top of the circles is a prime chance.",tip:"Trailer on the rush? Drop it back. The D has a clean look that nobody's covering."},
    {id:"u13next3",cat:"Defensive Zone",pos:["F","D"],concept:"Forced turnover — quick counter",d:3,type:"next",sit:"Your center strips the puck from the opposing center in your defensive zone slot area. The other team's forwards are all deep in your zone. Your wingers are at the hash marks. What happens next?",opts:["Your center dumps it out","Your center headmans it to a winger breaking up ice — the other team is caught deep, and a quick pass to a winger with speed creates an odd-man rush the other way","Everyone regroups in the D-zone","Your center holds the puck and waits"],ok:1,why:"A turnover in the defensive zone with the other team caught deep is a counter-attack opportunity. The quick headman pass to a winger with speed can create a 2-on-1 or breakaway before the other team recovers.",tip:"Strip the puck in your zone with them caught deep? Headman it fast. Counter-attack before they recover."},
    {id:"u13next4",cat:"Special Teams",pos:["F","D"],concept:"PK clears to center",d:2,type:"next",sit:"On the penalty kill, your team clears the puck to center ice. The power play's defenseman retrieves it, but your two PK forwards are already forechecking hard at the blue line. What happens next?",opts:["The PP sets up again easily","Your PK forwards pressure the D and force a turnover or a bad re-entry — aggressive PK forechecking at the blue line disrupts the PP's rhythm","Your PK falls back to the box","The PK changes lines"],ok:1,why:"A PK clear followed by immediate pressure on the retrieving D is elite penalty killing. You've broken their setup and now you're making them earn the zone entry all over again — under pressure this time.",tip:"PK clears it? Don't fall back. Pressure the retrieval. Make them earn the entry again."},
    {id:"u13next5",cat:"Puck Management",pos:["F","D"],concept:"D-zone faceoff loss — scramble",d:3,type:"next",sit:"Your team loses the defensive zone faceoff clean — the puck goes back to their point man who one-times it. Your goalie makes the save but can't control the rebound. It's loose in front. What happens next?",opts:["Everyone watches the goalie","Your forwards and D collapse to the net, box out opposing players, and either clear the puck or help the goalie freeze it — loose pucks in front after a faceoff loss require an all-hands response","The D pass it around the boards","Your goalie comes out to play it"],ok:1,why:"A loose puck in the crease after a faceoff loss is maximum danger. Everyone collapses to the net — box out, clear, freeze. Half a second of hesitation is a goal against.",tip:"Loose puck in front after a lost draw? Collapse. Box out. Clear or freeze. Everyone. Now."},
    {id:"u13next6",cat:"Finishing",pos:["F"],concept:"Goalie down — high shot",d:2,type:"next",sit:"You drive to the net and the goalie goes down in butterfly early. You still have the puck on your stick and you're in tight. The entire top of the net is open. What happens next?",opts:["You shoot low into the pads","You lift the puck high over the butterfly — goalie is down, the top of the net is wide open, and you have the puck and time to elevate it","You pass it across","You deke to the backhand"],ok:1,why:"A goalie in butterfly early leaves the top of the net open. If you have time and the puck, lifting it over the pads into the open net is the highest-percentage play. Read the goalie, not just the net.",tip:"Goalie down in butterfly early? Go high. Lift it. The top of the net is yours."},
    {id:"u13next7",cat:"Gap Control",pos:["D"],concept:"Forward stops up — danger",d:3,type:"next",sit:"You're defending a 1-on-1. The forward drives wide, then suddenly stops up at the top of the circle and cuts back to the middle. You were committed to the outside angle. What happens next?",opts:["You keep going to the outside","You pivot hard and recover to the inside — the forward just beat your angle, and if you don't recover inside, they'll have the slot. Pivot feet, close the inside lane.","You stop and watch","You go for a poke check from behind"],ok:1,why:"A stop-and-cut-back to the middle is designed to beat a defender committed outside. The recovery is a hard pivot to close the inside lane before they reach the slot. Feet must move — reaching from behind creates penalties.",tip:"Forward cuts back inside? Pivot and recover inside. Don't reach from behind. Move your feet."},

    // === TRUE/FALSE QUESTIONS ===
    {id:"u13tf1",cat:"Breakouts",pos:["F","D"],concept:"Always go up the boards",d:2,type:"tf",sit:"On a breakout, the safest option is always to go up the boards.",ok:false,why:"The boards are often safe, but the best play depends on where the pressure is. Sometimes the middle is open. Sometimes a reverse behind the net opens the other side. Always use the boards and you become predictable. Read the forecheck.",tip:"Boards are often safe, but not always best. Read the forecheck and use what's open."},
    {id:"u13tf2",cat:"Special Teams",pos:["F","D"],concept:"PP patience",d:2,type:"tf",sit:"On the power play, moving the puck quickly to find the open lane is more effective than holding onto it and trying to beat players one-on-one.",ok:true,why:"Power play efficiency comes from puck movement that forces the PK to shift. One player holding and deking lets the PK stay compact. Quick passes open seams the PK can't cover.",tip:"PP: move the puck. Quick passes open seams. Holding it lets the PK stay compact."},
    {id:"u13tf3",cat:"Defensive Zone",pos:["F","D"],concept:"Always freeze the puck",d:2,type:"tf",sit:"When you're under pressure in the defensive zone, you should always freeze the puck to stop play.",ok:false,why:"Freezing gives the other team a faceoff in your zone — a set play with their best players. If you can make a quick play to a teammate or clear it, that's better than giving them a structured offensive opportunity.",tip:"Freezing in your zone = giving them a set play. Clear or pass if you can. Freeze only when you must."},
    {id:"u13tf4",cat:"Finishing",pos:["F"],concept:"Shot selection matters",d:2,type:"tf",sit:"Taking a lot of shots from bad angles and low-danger areas is just as effective as fewer shots from high-danger areas.",ok:false,why:"Shot quality matters more than shot quantity. A shot from the slot is worth far more than five shots from the corner. Getting to high-danger areas and shooting from there produces more goals.",tip:"Shot quality over shot quantity. One slot shot beats five corner shots. Get to dangerous areas."},
    {id:"u13tf5",cat:"Gap Control",pos:["D"],concept:"Active stick beats body check",d:2,type:"tf",sit:"Using an active stick to poke the puck away is often more effective than going for a big body check.",ok:true,why:"An active stick disrupts plays without taking you out of position. A missed body check puts you behind the play. Good defenders use their stick first and their body when the timing is right.",tip:"Stick first, body second. Active stick keeps you in position. Missed hits put you behind the play."},
    {id:"u13tf6",cat:"Puck Management",pos:["F","D"],concept:"Turnovers kill more than missed shots",d:3,type:"tf",sit:"Turnovers in the neutral or defensive zone are more costly to your team than missed shots in the offensive zone.",ok:true,why:"A missed shot is a lost possession in the offensive zone — the other team still has to exit and come 200 feet. A neutral or defensive zone turnover gives them the puck in a dangerous area with less ice to cover. Location of turnovers matters.",tip:"Missed shot in their zone? Acceptable. Turnover in yours? Deadly. Location of turnovers matters."},
    {id:"u13tf7",cat:"Transitioning",pos:["F","D"],concept:"Best time to attack is after a turnover",d:2,type:"tf",sit:"The best time to create a scoring chance is immediately after your team forces a turnover, when the other team is out of position.",ok:true,why:"Transition offense works because the other team is still in their offensive mindset and out of defensive position. The fastest teams in transition create the most odd-man rushes and high-danger chances.",tip:"Turnover = attack window. They're out of position. Go now, before they recover."},

    // === U13 GOALIE QUESTIONS ===
    {id:"u13g1",cat:"Goalie",concept:"Depth on the rush",d:1,pos:["G"],sit:"An attacker is carrying the puck through the neutral zone. You're set up in your net. How deep should you be as they approach the blue line?",opts:["Deep on your goal line","At the top of your crease — cut the angle and still have room to react to passes or dekes","Halfway out between the crease and the blue line","All the way out at the hash marks"],ok:1,why:"The top of the crease gives you the best combination of angle coverage and recovery space. Going deeper gives up too much net. Going further out makes you vulnerable to dekes and passes.",tip:"Top of the crease on the rush. Cut the angle without sacrificing recovery."},
    {id:"u13g2",cat:"Goalie",concept:"Pre-shot scan",d:1,pos:["G"],sit:"The puck is in the corner to your right. You're set on the post. Before the pass comes out, what should you be doing with your eyes?",opts:["Stare at the puck only","Scan the slot and weak side to locate the other attackers before the puck moves","Watch your defensemen","Look at the bench"],ok:1,why:"Pre-scanning while the puck is still — finding the backdoor player, the high slot shooter, the trailer — is what separates elite goalies. When the puck moves, you already know where the danger is.",tip:"Puck still? Scan the ice. Find the danger before the puck moves."},
    {id:"u13g3",cat:"Goalie",concept:"RVH vs VH post integration",d:2,pos:["G"],sit:"The puck is tight to your right post, below the goal line — a sharp-angle walkout threat. What's the best way to seal the post?",opts:["Stand up tall in your stance","Go into Reverse VH (RVH) — pad stacked against the post, blocker and glove up to cover the top","Butterfly away from the post","Skate out to challenge"],ok:1,why:"RVH seals the bottom of the net against the post while keeping the top covered with the blocker and glove. It's the modern answer to walkouts and goal-line plays. Standing tall gives up the bottom.",tip:"Puck tight to the post below the goal line? RVH. Seal low, cover high."},
    {id:"u13g4",cat:"Goalie",concept:"Screen tracking through multiple bodies",d:3,pos:["G"],sit:"There's a point shot coming and two players — one from each team — are in your sightline. You can only see flashes of the puck. What do you do?",opts:["Give up — you can't see","Lower your stance slightly to find a gap, track the puck with micro-movements, and prepare for a tip or deflection","Close your eyes and drop","Come out past the crease"],ok:1,why:"Screens aren't all-or-nothing. A slight drop in stance, moving your head to find a sightline, and tracking through small gaps keeps you in the save. Expect tips — the shot won't necessarily arrive at the expected angle.",tip:"Multiple screens? Drop slightly, find gaps, track micro-movements. Expect a tip."},
    {id:"u13g5",cat:"Goalie",concept:"Puck handling under forecheck",d:2,pos:["G"],sit:"The puck is rimming around the boards and will end up behind your net. Two opposing forwards are forechecking hard. What do you do?",opts:["Leave it for your D to fight through the forecheck","Get to the puck first and either rim it to your D's forehand on the weak side, or freeze it if your D can't get there","Shoot it down the ice","Freeze the puck every time"],ok:1,why:"A goalie who plays the puck well under forecheck pressure is a huge weapon. Beat the forecheckers to the puck and either set up your D on the open side or freeze it to relieve pressure. Passive goalies let forechecks succeed.",tip:"Puck coming behind the net with pressure? Beat them to it. Set up your D or freeze."},
    {id:"u13g6",cat:"Goalie",concept:"Breakaway — patience and reads",d:2,pos:["G"],sit:"A skilled forward is coming on a breakaway. They're moving fast. What's your strategy before they reach the top of the circles?",opts:["Commit to the butterfly early","Stay patient on your feet, cut the angle at the top of the crease, and make them commit first","Rush out to challenge at the blue line","Back up to your goal line"],ok:1,why:"Patience wins breakaways. Staying on your feet as long as possible forces the shooter to show you their move first. Committing early — going down or lunging — gives the shooter the easy side.",tip:"Breakaway: patience. Stay up. Make them show you first. Then commit."},
    {id:"u13g7",cat:"Goalie",concept:"Lateral movement type",d:2,pos:["G"],sit:"The puck is passed from the left point to the right half-wall. You're set for the point shot and need to get square to the new shooter. What's the right movement?",opts:["Butterfly slide the whole way","T-push hard in your stance — stay on your feet because the shot isn't immediate and you need to be ready to track","Shuffle slowly","Stand up and skate across"],ok:1,why:"The movement type depends on the situation. For a pass to a new shooting location where the shot isn't imminent, stay on your feet with a T-push. Reserve butterfly slides for when the shot is coming immediately and you need to drop.",tip:"Pass between shooters? T-push on your feet. Save butterfly slides for imminent shots."},
    {id:"u13g8",cat:"Goalie",concept:"Reading deflections",d:3,pos:["G"],sit:"A point shot is coming and there's an opposing forward in front of you with their stick on the ice, ready for a tip. What should you prepare for?",opts:["The original shot only","The deflection — assume the puck will change direction. Stay in your stance, keep your stick on the ice, and read the deflection angle in real time.","Nothing — tips are random","Stand up tall"],ok:1,why:"A stick on the ice in front of you is a deflection setup. You have to assume the puck gets tipped. Stay low, keep your stick on the ice, and track the puck through the deflection — it usually changes angle and elevation.",tip:"Stick on the ice in front? Expect a tip. Stay low, track through the deflection."},
    {id:"u13g9",cat:"Goalie",concept:"Rebound redirect — slot vs corner",d:2,pos:["G"],sit:"You're making a save from a shot on the right side. You can control where the rebound goes with your pads or blocker. What's the best target for the rebound?",opts:["Right back at the shooter","Into the left corner — away from the shooter and out of the slot","Into the slot","Straight down in front of you"],ok:1,why:"Rebound direction is an active skill. Angling your pad to redirect the rebound to the far corner takes it out of the most dangerous area. A rebound in the slot is a goal waiting to happen.",tip:"Control your rebounds. Far corner. Away from the slot. Always."},
    {id:"u13g10",cat:"Goalie",concept:"Post-save recovery",d:2,pos:["G"],sit:"You made a kick save with your right pad and you're now on the ice. The puck is still loose in front of you. What's your priority?",opts:["Stay down and wait for the whistle","Get back to your feet immediately — the play isn't dead and a second shot is coming","Slide to the other post","Call for your D"],ok:1,why:"Recovery speed separates average from elite goalies. The second after a save, the play continues. Getting back on your feet fast gets you set for the next shot. Staying down is a goal waiting to happen.",tip:"Made the save? Up. Now. Second shots are the danger."},
    {id:"u13g11",cat:"Goalie",concept:"Backdoor reads on PK",d:3,pos:["G"],sit:"Your team is on the penalty kill. The power play is cycling and the puck moves from the half-wall toward the back-door player at the far post. You were set on the strong side. What do you do?",opts:["Stay on the strong side","Push across the crease aggressively using a butterfly slide or T-push — the backdoor tap-in is the highest-danger chance and you need to close that post","Stand up and come out","Drop into butterfly where you are"],ok:1,why:"The back-door play on a power play is one of the highest-danger chances in hockey. The goalie has to push hard across the crease to take that away. Half-speed movement = goal. Commit to the save.",tip:"PP backdoor play? Push hard across. Close that post. Full commitment."},
    {id:"u13g12",cat:"Goalie",concept:"Freeze management — late game",d:3,pos:["G"],sit:"Your team is leading by one goal with 45 seconds left. You make a save and have the puck in your glove. Your team is exhausted. What do you do?",opts:["Quickly play it to your D","Cover it completely and milk the whistle — a TV timeout-style faceoff with tired opposing forwards in your zone is actually fine when it kills clock","Throw it down the ice","Drop it for your skater"],ok:1,why:"Late-game freeze decisions are about clock management, not just safety. Freezing lets your tired team have a quick breather. Yes, the faceoff is in your zone — but the clock stops, you reset your lines, and your goalie gets a break too.",tip:"Late lead, tired team? Freeze and reset. Clock management over pressure avoidance."},
    {id:"u13g13",cat:"Goalie",concept:"Shooter tendencies",d:3,pos:["G"],sit:"A shooter is coming down the right wing. You know from previous shifts they always shoot short side, top corner on the rush. What's your approach?",opts:["Play it neutral","Cheat slightly to take away their preferred shot — respect their tendency by giving a bit more of the opposite corner","Come all the way out","Stay deep"],ok:1,why:"Elite goalies track shooter tendencies within a game. If a player has shown you their preferred spot multiple times, slightly cheating to take it away forces them to beat you somewhere else — often a spot they're less comfortable with.",tip:"Know a shooter's tendency? Respect it. Cheat slightly to take away their spot."},
    {id:"u13g14",cat:"Goalie",concept:"Communication — coverage call",d:2,pos:["G"],sit:"You see an opposing player sneaking to the backdoor completely uncovered by your D. Your D are both focused on the corner battle. The pass hasn't come yet. What do you do?",opts:["Stay silent","Yell loudly — 'Back door!' or 'Net front!' — to warn your D to get a stick on the open player","Skate out to cover yourself","Call a timeout"],ok:1,why:"The goalie has the best view of developing threats. A loud, specific call — 'Back door!' — can get a defender's stick into a passing lane before the pass even happens. Silent goalies watch goals happen.",tip:"See a coverage problem? Call it. Loud. Specific. 'Back door!' stops goals."},
    {id:"u13g15",cat:"Goalie",concept:"Post integration — VH vs overlap",d:3,pos:["G"],sit:"The puck carrier is skating in on your right post at a bad angle — they haven't gone below the goal line yet. What's the right post integration?",opts:["RVH","Vertical Horizontal (VH) — lead pad up against the post, back knee down, so you can push off and track if they cut to the middle","Just stand on the post","Butterfly in the middle of the crease"],ok:1,why:"VH is used when the puck is above the goal line and can still cut to the middle. RVH is for below the goal line. VH keeps your lead pad sealing the post while letting you push off if they attack the middle. Using the wrong post integration gives up the wrong side.",tip:"Above the goal line? VH. Below? RVH. Know the difference."},
    {id:"u13g16",cat:"Goalie",concept:"Odd-man rush positioning",d:2,pos:["G"],sit:"It's a 3-on-2 rush. Your D are in decent position. The puck carrier is on the right side. Where should you set up?",opts:["Dead center of the net","Slightly cheat right to match the puck carrier while staying square — trust your D on the pass, but give yourself the best angle on the shot","All the way right","All the way left"],ok:1,why:"On an odd-man rush, the goalie cheats slightly to the puck side to take away the shot while trusting the D to handle passes. Dead center gives up too much on both sides. Cheating hard commits too much.",tip:"3-on-2: slight cheat to the puck side. Trust your D. Play the shot."},
    {id:"u13g17",cat:"Goalie",concept:"Puck handling — D-to-D option",d:3,pos:["G"],sit:"The puck is shot around the boards behind your net. A forechecker is closing from your left. Your D is coming to the left side. Your other D is wide open on the right side. What's the best play?",opts:["Stop the puck for your left D","Stop it, then make a short pass to your right D who is wide open on the weak side — a clean D-to-D breakout under pressure","Ring it back around","Freeze it"],ok:1,why:"A goalie who can play a D-to-D pass under pressure is a major asset. Identifying the uncovered defender and getting them the puck clean starts the breakout before the forecheck sets up. This is an advanced skill worth developing.",tip:"Weak-side D wide open? Play it to them. D-to-D breaks forechecks."},
    {id:"u13g18",cat:"Goalie",concept:"Wraparound — seal the post",d:2,pos:["G"],sit:"An attacker is skating fast behind your net from right to left, setting up a wraparound attempt on your left post. What do you do?",opts:["Stay centered and wait","Push off your right post and move with them, arriving at the left post before they do — seal the bottom of the post with your pad","Butterfly in the middle of the crease","Come out past the goal line"],ok:1,why:"On a wraparound, the race to the post is everything. Moving with the puck carrier and sealing the near post before they arrive eliminates the wrap option. Late arrival = goal.",tip:"Wraparound? Move with them. Beat them to the post. Seal the bottom."},
    {id:"u13g19",cat:"Goalie",concept:"Aggressive vs conservative positioning",d:3,pos:["G"],sit:"Your team is down by two goals with three minutes left. The other team gets a rush chance. What should your positioning look like?",opts:["More aggressive than usual — come out further to cut angles and make them beat you","Exactly the same as a tied game — your job doesn't change","More conservative — stay deep to protect the open net","Less aggressive"],ok:0,why:"When trailing late, goalies can and should play slightly more aggressively to make stops — because every save gives your team more time. But this is situational: elite goalies adjust their depth based on game state, not just the shooter.",tip:"Trailing late? Slightly more aggressive. Every save buys time. Adjust to game state."},
    {id:"u13g20",cat:"Goalie",concept:"Mental reset after a goal",d:3,pos:["G"],sit:"You just gave up a soft goal. Your body language is visibly frustrated. There's a faceoff at center ice in 15 seconds. What's the most important thing to do?",opts:["Replay the goal in your head to figure out what went wrong","Reset immediately — physical cue (tap posts, breathe, focus on the next shot) and put the goal behind you. Analyze later, not now.","Yell at your defensemen","Ask the coach to pull you"],ok:1,why:"Mental reset after a goal is a real skill. Elite goalies have a consistent physical cue — tap the posts, deep breath, water bottle — to clear the last save and focus on the next shot. Dwelling on a bad goal during the game causes the next one.",tip:"Soft goal? Physical reset. Post tap, breath, water. Analyze after the game, not during."},
  ],

}

const COMP={
  "U7 / Initiation":{t:[0.75,0.5],l:["Game-Ready IQ","Getting It","Still Learning"]},
  "U9 / Novice":{t:[0.8,0.55],l:["Smart Player","Making Reads","Building Awareness"]},
  "U11 / Atom":{t:[0.8,0.6],l:["Hockey IQ Player","System Aware","Instinct Stage"]},
  "U13 / Peewee":{t:[0.82,0.65],l:["Elite Game Read","Situationally Sound","Tactical Foundation"]},
};
function getComp(level,score){const c=COMP[level];if(!c)return"—";return score>=c.t[0]?c.l[0]:score>=c.t[1]?c.l[1]:c.l[2];}


const SKILLS={
  "U7 / Initiation":[
    {cat:"Skating",icon:"⛸",skills:[{id:"u7s1",name:"Forward Stride",desc:"Pushes and glides with both feet"},{id:"u7s2",name:"Stopping",desc:"Attempts a two-foot snowplow stop"},{id:"u7s3",name:"Turning",desc:"Turns in both directions while moving"},{id:"u7s4",name:"Balance & Falls",desc:"Gets up from ice independently"}]},
    {cat:"Puck Skills",icon:"🏒",skills:[{id:"u7p1",name:"Stick Handling",desc:"Controls puck while stationary"},{id:"u7p2",name:"Shooting",desc:"Attempts a forehand push/shot on net"}]},
    {cat:"Compete & Attitude",icon:"🔥",skills:[{id:"u7c1",name:"Effort",desc:"Full effort throughout practice and games"},{id:"u7c2",name:"Listening",desc:"Follows coach instructions on ice"},{id:"u7c3",name:"Fun & Enjoyment",desc:"Shows enthusiasm for the game"}]},
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
    {cat:"Compete & Attitude",icon:"🔥",skills:[{id:"u9c1",name:"Battle Level",desc:"Competes for loose pucks"},{id:"u9c2",name:"Coachability",desc:"Accepts feedback and applies it"}]},
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
    {cat:"Compete & Attitude",icon:"🔥",skills:[{id:"u11c1",name:"Compete Level",desc:"Consistently battles hard in all situations"},{id:"u11c2",name:"Coachability",desc:"Implements feedback between shifts"}]},
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
    {cat:"Compete & Attitude",icon:"🔥",skills:[{id:"u13c1",name:"Compete Level",desc:"Battles hard every shift, every practice"},{id:"u13c2",name:"Coachability",desc:"Seeks feedback and self-corrects between reps"},{id:"u13c3",name:"Leadership",desc:"Positive leadership on bench and in the room"}]},
    {cat:"Game Decision-Making",icon:"🧠",isDM:true,skills:[
      {id:"u13dm1",name:"Zone Entry Decision",desc:"Reads the defensive setup and chooses correct entry",selfQ:"Can you read the defense and pick the right zone entry?"},
      {id:"u13dm2",name:"3-on-2 Rush Read",desc:"Middle player reads defender positioning correctly",selfQ:"On a 3-on-2, do you read whether to shoot or pass?"},
      {id:"u13dm3",name:"Corner Retrieval vs. Position",desc:"Reads whether to retrieve a puck or hold position",selfQ:"Do you know when to go get the puck vs. hold your spot?"},
      {id:"u13dm4",name:"Trap Recognition",desc:"Recognizes a 1-2-2 trap and adjusts",selfQ:"Can you recognize when the other team is running a trap?"},
      {id:"u13dm5",name:"Contact as a Decision Tool",desc:"Uses contact deliberately, not reactively",selfQ:"Do you use your body as a smart tool or just react?"},
      {id:"u13dm6",name:"Reading the Goalie",desc:"Reads goalie position before deciding to shoot",selfQ:"Do you look at the goalie before you get the puck?"},
    ]},
  ],
};


// ─────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────
function shuffle(a) { return [...a].sort(() => Math.random() - 0.5); }

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
function buildQueue(level, position, isReturning) {
  const allQ = QB[level] || [];
  const posFiltered = position === "Goalie"
    ? allQ.filter(q => !q.pos || q.pos.includes("G") || q.pos.includes("F"))
    : position === "Defense"
    ? allQ.filter(q => !q.pos || q.pos.includes("D") || q.pos.includes("F"))
    : position === "Not Sure"
    ? allQ.filter(q => !q.pos || q.pos.includes("F") || q.pos.includes("D")) // all skater questions
    : allQ.filter(q => !q.pos || q.pos.includes("F") || q.pos.includes("D"));

  const byD = {
    1: shuffle(posFiltered.filter(q => q.d === 1)),
    2: shuffle(posFiltered.filter(q => q.d === 2)),
    3: shuffle(posFiltered.filter(q => q.d === 3)),
  };
  return { byD, currentD: isReturning ? 2 : 1 };
}

function pullNext(queue, results) {
  const last2 = results.slice(-2);
  let { byD, currentD } = queue;
  if (last2.length === 2) {
    if (last2.every(r => r.ok) && currentD < 3) currentD++;
    else if (last2.every(r => !r.ok) && currentD > 1) currentD--;
  }
  if (!byD[currentD].length) {
    const fb = [1,2,3].find(d => d !== currentD && byD[d].length);
    if (!fb) return { q: null, queue };
    currentD = fb;
  }
  const i = Math.floor(Math.random() * byD[currentD].length);
  const q = byD[currentD][i];
  return { q, queue: { byD: {...byD, [currentD]: byD[currentD].filter((_,j) => j !== i)}, currentD } };
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
            <span>{opt}</span>
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
            <span>{opt}</span>
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
// ONBOARDING
// ─────────────────────────────────────────────────────────
function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [level, setLevel] = useState("");
  const [position, setPosition] = useState("");

  const posIcons = {Forward:"⚡", Defense:"🛡", Goalie:"🧤"};

  if (step === 0) return (
    <div style={{minHeight:"100vh",background:`linear-gradient(160deg,#080e1a 0%,#0d1e3a 60%,#080e1a 100%)`,display:"flex",flexDirection:"column",justifyContent:"center",padding:"2rem 1.5rem",fontFamily:FONT.body,color:C.white}}>
      <div style={{maxWidth:460,margin:"0 auto",width:"100%"}}>
        <div style={{marginBottom:"2.5rem"}}>
          <div style={{display:"flex",alignItems:"center",gap:".6rem",marginBottom:"1.5rem"}}>
            <span style={{fontSize:28}}>🏒</span>
            <span style={{fontFamily:FONT.display,fontWeight:800,fontSize:"2rem",color:C.gold,letterSpacing:".08em"}}>IceIQ</span>
          </div>
          <h1 style={{fontFamily:FONT.display,fontWeight:800,fontSize:"clamp(2rem,7vw,3rem)",lineHeight:1.08,margin:"0 0 1.1rem",letterSpacing:"-.01em"}}>
            Know the game.<br/>Own your development.
          </h1>
          <p style={{fontSize:15,color:C.dim,lineHeight:1.75,margin:0}}>
            The only player development tool that tests what you actually know — not just how fast you skate. Age-calibrated, position-specific, and built on real hockey frameworks.
          </p>
        </div>
        {[
          {icon:"🧠",text:"Real game scenarios calibrated to your age level"},
          {icon:"📊",text:"Self-assessment + coach comparison side by side"},
          {icon:"📈",text:"IQ Score that travels across every season and team"},
          {icon:"🎯",text:"Multiple question formats that test true understanding"},
        ].map((f,i) => (
          <div key={i} style={{display:"flex",alignItems:"center",gap:".85rem",padding:".75rem 1rem",background:C.bgGlass,borderRadius:12,border:`1px solid ${C.border}`,marginBottom:".6rem"}}>
            <span style={{fontSize:18,flexShrink:0}}>{f.icon}</span>
            <span style={{fontSize:13,color:C.dim,lineHeight:1.5}}>{f.text}</span>
          </div>
        ))}
        <PrimaryBtn onClick={() => setStep(1)} style={{marginTop:"1.75rem"}}>Build Your Profile →</PrimaryBtn>
        <div style={{fontSize:11,color:C.dimmer,textAlign:"center",marginTop:"1rem"}}>Aligned with Hockey Canada LTAD · USA Hockey ADM</div>
        <div style={{fontSize:10,color:C.dimmer,textAlign:"center",marginTop:".5rem",opacity:.5}}>v{VERSION}</div>
      </div>
    </div>
  );

  if (step === 1) return (
    <Screen>
      <div style={{marginBottom:"2rem"}}>
        <div style={{fontSize:10,letterSpacing:".18em",color:C.gold,textTransform:"uppercase",fontWeight:700,marginBottom:".6rem"}}>Step 1 of 3</div>
        <h2 style={{fontFamily:FONT.display,fontWeight:800,fontSize:"2rem",margin:0}}>What's your name?</h2>
      </div>
      <Card style={{marginBottom:"1.5rem"}}>
        <input value={name} onChange={e => setName(e.target.value)}
          placeholder="First name"
          autoFocus
          style={{background:"none",border:"none",color:C.white,fontSize:22,fontFamily:FONT.display,fontWeight:700,width:"100%",outline:"none",padding:"0"}}
        />
        <div style={{height:2,background:name?C.gold:C.border,borderRadius:2,marginTop:".75rem",transition:"background .2s"}}/>
      </Card>
      <PrimaryBtn onClick={() => name.trim() && setStep(2)} disabled={!name.trim()}>Continue →</PrimaryBtn>
    </Screen>
  );

  if (step === 2) return (
    <Screen>
      <div style={{marginBottom:"2rem"}}>
        <div style={{fontSize:10,letterSpacing:".18em",color:C.gold,textTransform:"uppercase",fontWeight:700,marginBottom:".6rem"}}>Step 2 of 3</div>
        <h2 style={{fontFamily:FONT.display,fontWeight:800,fontSize:"2rem",margin:0}}>What level, {name}?</h2>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:".6rem",marginBottom:"1.5rem"}}>
        {LEVELS.map(l => (
          <button key={l} onClick={() => setLevel(l)} style={{
            background:level===l?C.goldDim:C.bgCard,
            border:`1px solid ${level===l?C.gold:C.border}`,
            borderLeft:`3px solid ${level===l?C.gold:"transparent"}`,
            borderRadius:12,padding:"1rem 1.25rem",
            cursor:"pointer",textAlign:"left",
            color:level===l?C.gold:C.dim,
            fontFamily:FONT.body,fontSize:15,
            fontWeight:level===l?700:400,
            display:"flex",justifyContent:"space-between",
            transition:"all .15s",
          }}>
            <span>{l}</span>
            {level===l && <span>✓</span>}
          </button>
        ))}
      </div>
      <PrimaryBtn onClick={() => level && setStep(3)} disabled={!level}>Continue →</PrimaryBtn>
    </Screen>
  );

  const isYoung = level === "U7 / Initiation" || level === "U9 / Novice";
  const posOptions = [{p:"Forward",i:"⚡"},{p:"Defense",i:"🛡"},{p:"Goalie",i:"🧤"},{p:"Not Sure",i:"❓"}];

  return (
    <Screen>
      <div style={{marginBottom:"1.5rem"}}>
        <div style={{fontSize:10,letterSpacing:".18em",color:C.gold,textTransform:"uppercase",fontWeight:700,marginBottom:".6rem"}}>Step 3 of 3</div>
        <h2 style={{fontFamily:FONT.display,fontWeight:800,fontSize:"2rem",margin:"0 0 .35rem"}}>What is the player's preferred position?</h2>
        {isYoung && <div style={{fontSize:13,color:C.dimmer,lineHeight:1.6}}>At {level.split(" / ")[0]}, most players are still figuring this out — that's completely normal.</div>}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".75rem",marginBottom:"1.5rem"}}>
        {posOptions.map(({p,i}) => (
          <button key={p} onClick={() => setPosition(p)} style={{
            background:position===p?C.goldDim:C.bgCard,
            border:`1px solid ${position===p?C.gold:C.border}`,
            borderRadius:14,padding:"1.25rem .75rem",
            cursor:"pointer",textAlign:"center",
            transition:"all .15s",
          }}>
            <div style={{fontSize:26,marginBottom:".4rem"}}>{i}</div>
            <div style={{fontSize:13,color:position===p?C.gold:C.dim,fontWeight:position===p?700:400,fontFamily:FONT.body}}>{p}</div>
          </button>
        ))}
      </div>
      {position === "Not Sure" && (
        <div style={{background:C.goldDim,border:`1px solid ${C.goldBorder}`,borderRadius:12,padding:".85rem 1rem",marginBottom:"1rem",fontSize:12,color:C.gold,lineHeight:1.6}}>
          👍 No problem — you'll get questions that cover all positions. You can update this anytime in Settings.
        </div>
      )}
      <PrimaryBtn
        onClick={() => position && onComplete({name:name.trim(),level,position,selfRatings:initSR(level),quizHistory:[],goals:{},coachCode:"",season:SEASONS[0],sessionLength:10,colorblind:false})}
        disabled={!position}
      >
        Build {name}'s Profile →
      </PrimaryBtn>
    </Screen>
  );
}


// ─────────────────────────────────────────────────────────
// HOME SCREEN
// ─────────────────────────────────────────────────────────
function Home({ player, onNav }) {
  const { name, level, position, selfRatings, quizHistory, goals } = player;
  const latest = quizHistory[quizHistory.length-1];
  const iq = latest ? calcWeightedIQ(latest.results) : null;
  const tier = iq !== null ? getTier(iq) : null;
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
  }, []);

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:FONT.body,color:C.white,paddingBottom:80}}>
      {/* Header */}
      <div style={{padding:"1.5rem 1.25rem 1rem",maxWidth:560,margin:"0 auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"1.5rem"}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:".5rem",marginBottom:".2rem"}}>
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
          <button onClick={() => onNav("quiz")} style={{background:`linear-gradient(135deg,rgba(124,111,205,.15),rgba(124,111,205,.05))`,border:`1px solid ${C.purpleBorder}`,borderRadius:14,padding:"1.1rem",cursor:"pointer",textAlign:"left",color:C.white,fontFamily:FONT.body}}>
            <div style={{fontSize:22,marginBottom:".4rem"}}>🧠</div>
            <div style={{fontWeight:700,fontSize:14,marginBottom:2}}>Take Quiz</div>
            <div style={{fontSize:11,color:C.purple}}>Adaptive · {player.sessionLength||10}Q</div>
          </button>
          <button onClick={() => onNav("goals")} style={{background:`linear-gradient(135deg,rgba(201,168,76,.1),rgba(201,168,76,.03))`,border:`1px solid ${C.goldBorder}`,borderRadius:14,padding:"1.1rem",cursor:"pointer",textAlign:"left",color:C.white,fontFamily:FONT.body}}>
            <div style={{fontSize:22,marginBottom:".4rem"}}>🎯</div>
            <div style={{fontWeight:700,fontSize:14,marginBottom:2}}>My Goals</div>
            <div style={{fontSize:11,color:C.gold}}>{goalCount}/{goalCats} set</div>
          </button>
          <button onClick={() => onNav("skills")} style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:14,padding:"1.1rem",cursor:"pointer",textAlign:"left",color:C.white,fontFamily:FONT.body}}>
            <div style={{fontSize:22,marginBottom:".4rem"}}>📊</div>
            <div style={{fontWeight:700,fontSize:14,marginBottom:2}}>My Skills</div>
            <div style={{fontSize:11,color:C.dimmer}}>{ratedSkills}/{totalSkills} rated</div>
          </button>
          <button onClick={() => onNav("report")} style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:14,padding:"1.1rem",cursor:"pointer",textAlign:"left",color:C.white,fontFamily:FONT.body}}>
            <div style={{fontSize:22,marginBottom:".4rem"}}>📋</div>
            <div style={{fontWeight:700,fontSize:14,marginBottom:2}}>Report</div>
            <div style={{fontSize:11,color:C.dimmer}}>Development arc</div>
          </button>
        </div>

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
function Quiz({ player, onFinish, onBack }) {
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
    const q = buildQueue(player.level, player.position, isReturning);
    const { q: first, queue: q2 } = pullNext(q, []);
    setQueue(q2);
    setQuestion(first);
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
    if (isLast) setQuizDone(true);
  }

  function handleSeqAnswer(ok) {
    setSeqAnswered(true);
    setSeqCorrect(ok);
    if (!ok) setSeqPerfect(false);
    const newResult = { id:question.id, cat:question.cat, ok, d:question.d||2, type:"seq" };
    const newResults = [...results, newResult];
    setResults(newResults);
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
      <div style={{textAlign:"center",marginBottom:"2rem",paddingTop:"1rem"}}>
        <div style={{fontSize:56,marginBottom:".5rem"}}>{tier.badge}</div>
        <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"2rem",marginBottom:".15rem"}}>{tier.label}</div>
        <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"5rem",color:tier.color,lineHeight:.9,letterSpacing:"-.02em"}}>{score}<span style={{fontSize:"2rem"}}>%</span></div>
        <div style={{fontSize:13,color:C.dimmer,margin:".5rem 0 .75rem"}}>{correct}/{results.length} correct</div>
        {saved && player.coachCode && (
          <div style={{fontSize:11,color:C.green,display:"flex",alignItems:"center",justifyContent:"center",gap:".3rem"}}>✓ Saved to team {player.coachCode}</div>
        )}
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

function Report({ player, onBack, demoCoachData }) {
  const latest = player.quizHistory[player.quizHistory.length-1];
  const iq = latest ? calcWeightedIQ(latest.results) : null;
  const tier = iq !== null ? getTier(iq) : null;
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
      <BackBtn onClick={onBack}/>
      <div style={{marginBottom:"1.5rem"}}>
        <div style={{fontSize:10,letterSpacing:".16em",color:C.gold,textTransform:"uppercase",fontWeight:700,marginBottom:4}}>Player Development Report</div>
        <h1 style={{fontFamily:FONT.display,fontWeight:800,fontSize:"clamp(1.8rem,6vw,2.6rem)",margin:"0 0 .25rem",lineHeight:1}}>{player.name}</h1>
        <div style={{fontSize:13,color:C.dimmer}}>{player.level} · {player.position} · {player.season||SEASONS[0]}</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".75rem",marginBottom:"1rem"}}>
        <Card style={{background:`linear-gradient(135deg,${C.bgCard},${C.bgElevated})`,border:`1px solid ${C.goldBorder}`,textAlign:"center"}}>
          <Label>Hockey IQ</Label>
          <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"3rem",color:iq!==null?tier.color:"rgba(255,255,255,.15)",lineHeight:1}}>{iq!==null?`${iq}%`:"—"}</div>
          {tier && <div style={{fontSize:12,color:C.dimmer,marginTop:4}}>{tier.label}</div>}
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

function Profile({ player, onSave, onBack, onReset, demoMode }) {
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
          <Label>Position</Label>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".5rem"}}>
            {[{p:"Forward",i:"⚡"},{p:"Defense",i:"🛡"},{p:"Goalie",i:"🧤"},{p:"Not Sure",i:"❓"}].map(({p,i})=>(
              <button key={p} onClick={()=>upd("position")(p)} style={{background:s.position===p?C.goldDim:C.bgElevated,border:`1px solid ${s.position===p?C.gold:C.border}`,borderRadius:10,padding:".75rem .5rem",cursor:"pointer",textAlign:"center",color:s.position===p?C.gold:C.dim,fontFamily:FONT.body,fontSize:13,fontWeight:s.position===p?700:400}}>
                <div style={{fontSize:20,marginBottom:3}}>{i}</div>{p}
              </button>
            ))}
          </div>
        </Card>
        <Card style={{marginBottom:"1rem"}}>
          <Label>Level</Label>
          <div style={{display:"flex",flexDirection:"column",gap:".5rem"}}>
            {LEVELS.map(l=>(
              <button key={l} onClick={()=>upd("level")(l)} style={{background:s.level===l?C.goldDim:"none",border:`1px solid ${s.level===l?C.gold:C.border}`,borderRadius:8,padding:".65rem 1rem",cursor:"pointer",textAlign:"left",color:s.level===l?C.gold:C.dim,fontFamily:FONT.body,fontSize:14,fontWeight:s.level===l?700:400,display:"flex",justifyContent:"space-between"}}>
                <span>{l}</span>{s.level===l&&<span>✓</span>}
              </button>
            ))}
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
        <Card style={{marginBottom:"1rem"}}>
          <Label>About</Label>
          <div style={{fontSize:12,color:C.dimmer,lineHeight:1.9}}>
            <div>IceIQ v{VERSION} · {RELEASE_DATE}</div>
            <div>Hockey Canada LTAD · USA Hockey ADM</div>
            <div>Sport for Life Canada</div>
            <div style={{color:C.gold,marginTop:".25rem"}}>bluechip-people-strategies.com</div>
          </div>
        </Card>
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
            const QB_flat = Object.values(QB).flat();
            const qData = QB_flat.find(x=>x.id===q.id);
            return(<div key={q.id} style={{padding:".7rem 0",borderBottom:`1px solid ${C.border}`}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:".3rem"}}><Pill color={q.pct<40?C.red:C.yellow} bg={q.pct<40?"rgba(239,68,68,.12)":"rgba(234,179,8,.12)"}>{q.pct}%</Pill><span style={{fontSize:11,color:C.dimmer}}>{q.ok}/{q.tot} correct</span></div><div style={{fontSize:12,color:C.dim,lineHeight:1.5}}>{qData?.sit?.slice(0,90)}{qData?.sit?.length>90?"…":""}</div></div>);
          })}
        </Card>
      </>)}
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────
// COACH RATING SCREEN (accessed via invite link)
// ─────────────────────────────────────────────────────────
function CoachRatingScreen({ playerName, playerLevel, playerKey, skills, onDone }) {
  const [ratings, setRatings] = useState({});
  const [notes, setNotes] = useState({});
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeSkill, setActiveSkill] = useState(null);
  const cats = SKILLS[playerLevel] || [];
  const allSkills = cats.flatMap(c => c.skills.map(s => ({...s, cat:c.cat, icon:c.icon})));
  const rated = Object.values(ratings).filter(v=>v).length;
  const coachScale = getCoachScale(playerLevel);
  const coachScaleType = RATING_SCALES[playerLevel]?.coach?.type;

  const scaleIntro = {
    "ladder": "Rate each skill using the competency ladder — where is this player in their development? Focus on what they show consistently across games and practices.",
  };
  const legendTitle = {ladder:"Competency Ladder"};

  async function save() {
    setSaving(true);
    const ok = await saveCoachRatings(playerKey, ratings, notes);
    setSaving(false);
    setSaved(ok);
  }

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.white,fontFamily:FONT.body,padding:"1.5rem 1.25rem"}}>
      <div style={{maxWidth:560,margin:"0 auto"}}>
        {/* Header */}
        <div style={{display:"flex",alignItems:"center",gap:".6rem",marginBottom:"2rem"}}>
          <span style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.5rem",color:C.gold}}>IceIQ</span>
          <span style={{fontSize:13,color:C.dimmer}}>Coach Ratings</span>
        </div>

        <Card style={{marginBottom:"1.5rem",background:`linear-gradient(135deg,${C.bgCard},${C.bgElevated})`,border:`1px solid ${C.goldBorder}`}}>
          <div style={{fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:C.gold,marginBottom:".4rem"}}>Rating Player</div>
          <div style={{fontFamily:FONT.display,fontWeight:800,fontSize:"1.8rem"}}>{playerName}</div>
          <div style={{fontSize:13,color:C.dimmer,marginTop:2}}>{playerLevel}</div>
          <div style={{marginTop:".85rem",fontSize:12,color:C.dim,lineHeight:1.6}}>
            {scaleIntro[coachScaleType] || scaleIntro.ladder}
          </div>
        </Card>

        {/* Scale legend */}
        <Card style={{marginBottom:"1.25rem"}}>
          <Label>{legendTitle[coachScaleType] || "Scale"}</Label>
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

        {/* Progress */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:".75rem"}}>
          <div style={{fontSize:13,color:C.dim,fontWeight:600}}>{rated}/{allSkills.length} skills rated</div>
          <div style={{fontSize:11,color:C.dimmer}}>{rated===allSkills.length?"All done ✓":"Rate each skill below"}</div>
        </div>
        <ProgressBar value={rated} max={allSkills.length} color={C.gold} height={5}/>
        <div style={{height:"1rem"}}/>

        {/* Skills by category */}
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
                    style={{
                      width:"100%",background:rating?`${ratingColor}10`:C.bgCard,
                      border:`1px solid ${rating?ratingColor+"40":C.border}`,
                      borderLeft:`3px solid ${rating?ratingColor:"transparent"}`,
                      borderRadius:12,padding:".85rem 1rem",cursor:"pointer",
                      display:"flex",justifyContent:"space-between",alignItems:"center",
                      color:C.white,fontFamily:FONT.body,textAlign:"left",
                    }}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:14,fontWeight:600,marginBottom:2}}>{skill.name}</div>
                      <div style={{fontSize:11,color:C.dimmer,lineHeight:1.4}}>{skill.desc}</div>
                    </div>
                    <div style={{flexShrink:0,marginLeft:"1rem",textAlign:"right"}}>
                      {rating ? (
                        <div style={{fontSize:12,fontWeight:700,color:ratingColor}}>{ratingLabel}</div>
                      ) : (
                        <div style={{fontSize:11,color:C.dimmer}}>Tap to rate</div>
                      )}
                      <div style={{fontSize:11,color:C.dimmer,marginTop:2}}>{isActive?"▲":"▼"}</div>
                    </div>
                  </button>
                  {isActive && (
                    <div style={{background:C.bgElevated,border:`1px solid ${C.border}`,borderRadius:12,padding:".85rem",marginTop:".35rem",display:"flex",flexDirection:"column",gap:".4rem"}}>
                      {coachScale.map(r => (
                        <button key={r.value} onClick={() => setRatings(p=>({...p,[skill.id]:r.value}))}
                          style={{
                            background:ratings[skill.id]===r.value?`${r.color}18`:"none",
                            border:`1px solid ${ratings[skill.id]===r.value?r.color+"50":C.border}`,
                            borderRadius:8,padding:".65rem 1rem",cursor:"pointer",
                            display:"flex",alignItems:"center",gap:".75rem",
                            fontFamily:FONT.body,
                          }}>
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
                            placeholder={`What's one thing ${playerName} could work on for this skill?`}
                            rows={2}
                            style={{width:"100%",background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:8,padding:".55rem .7rem",color:C.white,fontSize:12,fontFamily:FONT.body,outline:"none",lineHeight:1.5}}/>
                          <div style={{fontSize:10,color:C.dimmer,marginTop:4,fontStyle:"italic"}}>This note appears in the player's report to spark a conversation — keep it specific and growth-focused.</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {/* Save */}
        {saved ? (
          <Card style={{background:"rgba(34,197,94,.08)",border:`1px solid ${C.greenBorder}`,textAlign:"center",padding:"1.5rem"}}>
            <div style={{fontSize:28,marginBottom:".5rem"}}>✅</div>
            <div style={{fontWeight:700,fontSize:15,color:C.green,marginBottom:".35rem"}}>Ratings Saved</div>
            <div style={{fontSize:13,color:C.dim}}>{playerName} can now see your ratings in their development report.</div>
          </Card>
        ) : (
          <PrimaryBtn onClick={save} disabled={saving || rated === 0} style={{marginBottom:"1rem"}}>
            {saving ? "Saving…" : `Save Ratings (${rated}/${allSkills.length} rated)`}
          </PrimaryBtn>
        )}

        <div style={{fontSize:11,color:C.dimmer,textAlign:"center",lineHeight:1.6,marginTop:"1rem"}}>
          Powered by IceIQ · bluechip-people-strategies.com<br/>
          Ratings are private and visible only to the player.
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// STUDY SCREEN — games to watch, drills, focus areas
// ─────────────────────────────────────────────────────────
// NHL INSIGHTS — real statistics paired with teaching points
// Each insight has: stat (the number), context (what it means), lesson (takeaway for the player)
// Mix of evergreen league facts + 2024-25 season specifics (verify before print/share)
const NHL_INSIGHTS = [
  {
    id: "possession-time",
    icon: "⏱",
    category: "Off-Puck Play",
    stat: "~1 minute of puck possession per game",
    context: "Even Connor McDavid and Leon Draisaitl average only 60-90 seconds of actual puck possession in a 60-minute NHL game. That's less than 3% of their time on ice.",
    lesson: "97% of the best players' games are played WITHOUT the puck. What you do without the puck — skating, positioning, supporting — is what separates great players from good ones.",
    source: "NHL tracking data, 2024-25 season",
  },
  {
    id: "shot-percentage",
    icon: "🎯",
    category: "Shooting",
    stat: "NHL average shooting %: ~10%",
    context: "League-wide, only about 1 in 10 NHL shots becomes a goal. Top snipers like Auston Matthews and William Nylander shoot around 14-17%. A 'sniper' means 1 goal per 6-7 shots — not every shot.",
    lesson: "You will miss more than you score, even at the NHL level. Shot volume beats perfection. Shoot when you have the chance.",
    source: "NHL league averages",
  },
  {
    id: "draisaitl-goals",
    icon: "⚡",
    category: "Shooting",
    stat: "Leon Draisaitl — Rocket Richard Trophy winner, 2024-25",
    context: "Leon Draisaitl won the Rocket Richard Trophy in 2024-25 as the NHL's top goal scorer. He also missed games during the season — meaning he averaged roughly 0.75+ goals per game he played.",
    lesson: "Elite scorers show up every single shift. Even missing games, he outscored everyone who played full seasons.",
    source: "NHL 2024-25 season award",
  },
  {
    id: "save-percentage",
    icon: "🧤",
    category: "Goaltending",
    stat: "Elite NHL goalies: .920+ save percentage",
    context: "NHL league-average save percentage sits around .900-.905. Elite starters (Connor Hellebuyck, Jake Oettinger, Juuse Saros) are in the .920 range — meaning they stop 92 of every 100 shots.",
    lesson: "Even elite goalies let in 8 out of 100 shots. Goals happen. What matters is staying mentally sharp for the next shot.",
    source: "NHL 2024-25 season",
  },
  {
    id: "hellebuyck-vezina",
    icon: "🏆",
    category: "Goaltending",
    stat: "Connor Hellebuyck — Vezina Trophy winner, 2024-25",
    context: "Connor Hellebuyck won his second straight Vezina Trophy as the NHL's top goalie in 2024-25, leading the Winnipeg Jets through a dominant regular season.",
    lesson: "Great goaltending carries teams. One position determines more games than any other.",
    source: "NHL 2024-25 season award",
  },
  {
    id: "faceoffs",
    icon: "⚔️",
    category: "Faceoffs",
    stat: "NHL's best faceoff men: 55-60% win rate",
    context: "Across the NHL, 50% is the break-even line on faceoffs. Top centers like Patrice Bergeron (career ~58%) and Sidney Crosby win more than they lose. Nobody — nobody — wins 70%.",
    lesson: "Even elite faceoff men lose 4 out of every 10 draws. Compete on every one, but losing a draw isn't the end of the play — it's the start of the next one.",
    source: "NHL career and season averages",
  },
  {
    id: "powerplay-rate",
    icon: "💥",
    category: "Special Teams",
    stat: "NHL's best power plays score 25%+ of the time",
    context: "The league-average power play converts around 21%. Top units like Edmonton Oilers and Tampa Bay Lightning push over 25%. That means the best power plays still fail 75% of the time.",
    lesson: "Power plays are about creating ONE great chance, not forcing the perfect play. Shoot, crash the net, live with a missed shot.",
    source: "NHL 2024-25 season",
  },
  {
    id: "penaltykill-rate",
    icon: "🛡",
    category: "Special Teams",
    stat: "NHL's best penalty kills: 82%+",
    context: "League-average PK sits around 78-80%. The best penalty kills (like Carolina and Florida) kill off 82%+ of opponent power plays. That's elite structure and compete.",
    lesson: "The PK is where compete and discipline meet. Everyone boxes out, everyone blocks shots, everyone clears when they can.",
    source: "NHL 2024-25 season",
  },
  {
    id: "makar-norris",
    icon: "🏒",
    category: "Defense",
    stat: "Cale Makar — Norris Trophy winner, 2024-25",
    context: "Cale Makar won the Norris Trophy as the NHL's top defenseman in 2024-25 with the Colorado Avalanche. He averaged over 25 minutes of ice time per game while posting elite offensive numbers.",
    lesson: "The best defensemen are also your most offensive weapons. Great D see the whole ice and make the first pass — they start the attack.",
    source: "NHL 2024-25 season award",
  },
  {
    id: "ice-time",
    icon: "⏳",
    category: "Conditioning",
    stat: "Top defensemen play 25+ minutes per game",
    context: "Elite NHL defensemen like Cale Makar, Quinn Hughes, and Victor Hedman average 25+ minutes of ice time — nearly half the game. That's 3-4x more than most U11/U13 players play.",
    lesson: "Conditioning is a skill. You have to be able to think clearly and execute when you're tired — that's when games are won.",
    source: "NHL 2024-25 season",
  },
  {
    id: "rookie-year",
    icon: "🌱",
    category: "Development",
    stat: "Most NHL stars were average-sized, average-skilled at U11",
    context: "Scouts consistently report that the NHL's current stars were NOT dominant players at age 10-11. Sidney Crosby, Patrick Kane, Brad Marchand, and many others developed their elite skills after puberty.",
    lesson: "What you are at 10 or 11 does not determine what you'll be at 18. Outwork your doubts. The game rewards players who keep getting better.",
    source: "NHL scouting interviews and player development research",
  },
  {
    id: "backcheck-speed",
    icon: "💨",
    category: "Transition",
    stat: "NHL forwards sprint 24+ mph when backchecking",
    context: "Speed tracking shows NHL forwards reach top speeds (22-24+ mph) during backchecks — often faster than they skate with the puck. The best players (Connor McDavid clocks 25+ mph) are faster WITHOUT the puck than most players are with it.",
    lesson: "Your compete level on the backcheck shows up in the stats. Every player measures themselves on offense. Elite players measure themselves on defense too.",
    source: "NHL player tracking, 2024-25 season",
  },
];

const STUDY_CONTENT = {
  "U7 / Initiation": {
    watchTips: [
      "Watch NHL highlights for 5-10 minutes — notice which way the goalie faces and where players celebrate goals",
      "Ask a parent to pause a game and point out your team's net vs the other team's net",
      "Watch how fast players get up after they fall down — get up fast like they do",
    ],
    focusAreas: [
      {skill:"Knowing which net to shoot at", drill:"Before every shift, look up and find your goalie"},
      {skill:"Going after loose pucks", drill:"Race to every puck in practice — even ones you think you'll lose"},
      {skill:"Getting up fast after falls", drill:"Fall on purpose in warmup, get up as fast as you can, 10 times"},
    ],
  },
  "U9 / Novice": {
    watchTips: [
      "Watch one NHL game per week — pick a player on the winning team and follow only them for 5 minutes",
      "Count how many times that player passes vs. shoots. What's their ratio?",
      "Notice what players do when they don't have the puck — where do they skate to?",
    ],
    focusAreas: [
      {skill:"Pass vs. shoot decision", drill:"In scrimmages, name out loud whether you passed or shot every time you had the puck"},
      {skill:"Finding open ice", drill:"Play 'keep away' with 2 vs 2 — only pass to someone in open space"},
      {skill:"Backchecking", drill:"Every time your team loses the puck, sprint back to your own blue line before doing anything else"},
    ],
  },
  "U11 / Atom": {
    watchTips: [
      "Watch an NHL game and pick one defenseman to follow. Track their gap control on the rush — do they close early or back up?",
      "Watch a power play and pause when it scores. Count how many passes happened before the shot.",
      "Find a 2-on-1 in any game — pause when the defender commits. Notice what the puck carrier does.",
    ],
    focusAreas: [
      {skill:"Rush reads", drill:"With a partner, run 2-on-1 drills where one defender randomly commits to the puck or the pass — force the read"},
      {skill:"Gap control", drill:"Shadow a skater backward — stay within one stick length, match their every cut"},
      {skill:"Cycle play", drill:"3-player board cycle — protect, pass, rotate. Never stop your feet."},
      {skill:"Decision timing", drill:"Time yourself: can you make a pass within 1.5 seconds of receiving the puck?"},
    ],
    games: [
      "Watch Oilers vs. any team — Connor McDavid's zone entries are a masterclass in reads",
      "Watch any Colorado Avalanche game — their D-to-D-to-wing breakouts are textbook",
      "Find clips of Patrice Bergeron defensive zone work on YouTube — positioning and stick work",
    ],
  },
  "U13 / Peewee": {
    watchTips: [
      "Watch a full NHL period and track one player. Note every decision they make — pass, shoot, carry, dump, change. Why each one?",
      "Watch NHL penalty kills — count how long each PK player holds their box position before rotating",
      "Find a D-to-D power play pass on video — how does the weak-side player's shot timing work?",
      "Watch NHL goaltenders on back-door plays — how fast do they push across?",
    ],
    focusAreas: [
      {skill:"Zone entry reads", drill:"With a partner simulating a defender, practice 3 entry types: carry, drop pass, chip-and-chase — based on their gap"},
      {skill:"Offensive zone cycling", drill:"3-player cycle below the dots — minimum 5 touches before a shot, all must be forechecked by a defender"},
      {skill:"Shot selection", drill:"From 3 different areas (slot, half-wall, point), pick the appropriate shot type each time — wrist/snap/slap"},
      {skill:"Defensive zone coverage", drill:"5-on-5 D-zone scrimmage — after every goal, review positioning with a video or a coach"},
      {skill:"Contact as a tool", drill:"1-on-1 battles with legal body contact — the goal is to win the puck without taking a penalty"},
    ],
    games: [
      "Watch any Panthers playoff game — structured defensive zone coverage at its best",
      "Follow Cale Makar's rush reads — elite zone entries and timing",
      "Watch Auston Matthews' shot selection — when he releases vs. when he holds",
      "Watch Connor Hellebuyck on wraparound plays — textbook post integration",
    ],
  },
};

function StudyScreen({ player, onBack, onNav }) {
  const content = STUDY_CONTENT[player.level] || STUDY_CONTENT["U11 / Atom"];
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
          <NHLInsightWidget />
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
// NHL INSIGHT WIDGET — small, unobtrusive, rotating stat card
// Appears on Home, Study, Results, Report. Dismissible per session.
// ─────────────────────────────────────────────────────────
function NHLInsightWidget() {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * NHL_INSIGHTS.length));
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const insight = NHL_INSIGHTS[idx];
  if (dismissed) return null;
  function next() { setIdx((idx + 1) % NHL_INSIGHTS.length); setExpanded(false); }
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
            <div style={{fontSize:9,letterSpacing:".1em",textTransform:"uppercase",color:C.gold,fontWeight:700,opacity:.85}}>NHL Insight · {insight.category}</div>
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
    {id:"study",  icon:"📺", label:"Study"},
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
function buildDemoPlayer() {
  const now = Date.now();
  const day = 86400000;
  // Fabricate three past quiz sessions with realistic progression
  const mkSession = (ok1, ok2, ok3, daysAgo, score) => ({
    results: [
      {id:"u11q1",cat:"Rush Reads",ok:ok1,d:1,type:"mc"},
      {id:"u11q2",cat:"Coverage",ok:ok1,d:1,type:"mc"},
      {id:"u11q6",cat:"Puck Protection",ok:ok1,d:1,type:"mc"},
      {id:"u11q11",cat:"Exiting the Zone",ok:ok1,d:1,type:"mc"},
      {id:"u11q20",cat:"Coverage",ok:ok2,d:2,type:"mc"},
      {id:"u11seq1",cat:"Exiting the Zone",ok:ok2,d:1,type:"seq"},
      {id:"u11mis1",cat:"Coverage",ok:ok2,d:1,type:"mistake"},
      {id:"u11next1",cat:"Rush Reads",ok:ok2,d:1,type:"next"},
      {id:"u11tf2",cat:"Coverage",ok:ok2,d:1,type:"tf"},
      {id:"u11q92",cat:"Blue Line Decisions",ok:ok3,d:3,type:"mc"},
      {id:"u11q95",cat:"Decision Timing",ok:ok3,d:3,type:"mc"},
      {id:"u11q100",cat:"Decision Timing",ok:ok3,d:3,type:"mc"},
      {id:"u11seq8",cat:"Puck Protection",ok:ok3,d:3,type:"seq"},
      {id:"u11tf10",cat:"Blue Line Decisions",ok:ok3,d:2,type:"tf"},
      {id:"u11mis8",cat:"Puck Protection",ok:ok2,d:2,type:"mistake"},
    ],
    score,
    date: new Date(now - daysAgo*day).toISOString(),
  });
  return {
    id: "__demo__",
    name: "Connor Crosby",
    level: "U11 / Atom",
    position: "Forward",
    season: SEASONS[0],
    sessionLength: 10,
    colorblind: false,
    coachCode: "",
    quizHistory: [
      mkSession(true, false, false, 14, 58),
      mkSession(true, true, false, 7, 71),
      mkSession(true, true, true, 1, 83),
    ],
    selfRatings: {
      // U11 skills — unified competency ladder values
      u11s1:"developing", u11s2:"consistent", u11s3:"developing", u11s4:"introduced",
      u11p1:"consistent", u11p2:"developing", u11p3:"developing", u11p4:"consistent",
      u11h1:"consistent", u11h2:"developing", u11h3:"developing",
      u11d1:"developing", u11d2:"introduced",
      u11c1:"advanced", u11c2:"proficient",
      u11dm1:"developing", u11dm2:"developing", u11dm3:"introduced", u11dm4:"consistent", u11dm5:"developing",
    },
    goals: {
      "Gap Control": {
        goal: "Work on closing the gap at the blue line instead of backing up to the crease",
        S: "Close the gap by the top of the circles on every rush",
        M: "Track number of clean gap closes per game using coach feedback",
        A: "Yes — drill this with my D-partner in warmups and 1-on-1 practice reps",
        R: "This is my biggest weakness and most games I give up the blue line",
        T: "By end of November 2026",
      },
      "Special Teams": {
        goal: "Learn the 1-3-1 power play setup and execute my position consistently",
        S: "Know my spot and responsibilities in the 1-3-1",
        M: "Ask coach to review video after next 3 power plays",
        A: "Yes, coach said this is where I'll play",
        R: "I get power play time and want to earn more",
        T: "Next 4 weeks",
      },
    },
    __demo: true,
  };
}
function buildDemoCoachRatings() {
  return {
    ratings: {
      u11s1:"developing", u11s2:"consistent", u11s3:"developing", u11s4:"developing",
      u11p1:"consistent", u11p2:"developing", u11p3:"consistent", u11p4:"proficient",
      u11h1:"consistent", u11h2:"developing", u11h3:"developing",
      u11d1:"introduced", u11d2:"introduced",
      u11c1:"advanced", u11c2:"proficient",
      u11dm1:"developing", u11dm2:"developing", u11dm3:"developing", u11dm4:"consistent", u11dm5:"developing",
    },
    notes: {
      u11d1: "Work on matching attacker speed and closing the gap — you back up too far and give them time.",
      u11c1: "Elite compete level — you set the tone for the line every shift. Keep it.",
      u11p4: "Great body position in puck battles. Now add the quick outlet pass once you win it.",
    },
  };
}

// ─────────────────────────────────────────────────────────
// AUTH SCREEN — login / signup
// ─────────────────────────────────────────────────────────
function AuthScreen({ onAuthenticated, onDemo }) {
  const [mode, setMode] = useState("login"); // login | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("player");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    setErr("");
    setLoading(true);
    try {
      if (mode === "signup") {
        if (!email.trim() || !password || !name.trim()) throw new Error("All fields required");
        if (password.length < 6) throw new Error("Password must be at least 6 characters");
        await SB.signUp({ email: email.trim(), password, role, name: name.trim() });
        // After signup, auth state listener in App will fire and load profile
      } else {
        if (!email.trim() || !password) throw new Error("Email and password required");
        await SB.signIn({ email: email.trim(), password });
      }
      onAuthenticated();
    } catch (e) {
      setErr(e.message || "Something went wrong");
    }
    setLoading(false);
  }

  return (
    <div style={{minHeight:"100vh",background:`linear-gradient(160deg,#080e1a 0%,#0d1e3a 60%,#080e1a 100%)`,display:"flex",flexDirection:"column",justifyContent:"center",padding:"2rem 1.5rem",fontFamily:FONT.body,color:C.white}}>
      <div style={{maxWidth:440,margin:"0 auto",width:"100%"}}>
        <div style={{display:"flex",alignItems:"center",gap:".6rem",marginBottom:"2rem"}}>
          <span style={{fontSize:28}}>🏒</span>
          <span style={{fontFamily:FONT.display,fontWeight:800,fontSize:"2rem",color:C.gold,letterSpacing:".08em"}}>IceIQ</span>
        </div>
        <h1 style={{fontFamily:FONT.display,fontWeight:800,fontSize:"clamp(1.8rem,6vw,2.4rem)",margin:"0 0 .5rem",lineHeight:1.1}}>
          {mode === "login" ? "Welcome back." : "Get started."}
        </h1>
        <p style={{fontSize:14,color:C.dim,marginBottom:"1.75rem",lineHeight:1.6}}>
          {mode === "login" ? "Sign in to see your development report." : "Create an account to start tracking hockey IQ."}
        </p>

        {mode === "signup" && (
          <>
            <div style={{marginBottom:"1rem"}}>
              <div style={{fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:C.dimmer,fontWeight:700,marginBottom:".5rem"}}>I am a...</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".5rem"}}>
                {[{v:"player",l:"Player / Parent",i:"🏒"},{v:"coach",l:"Coach",i:"👨‍🏫"}].map(o => (
                  <button key={o.v} onClick={()=>setRole(o.v)} style={{background:role===o.v?C.goldDim:C.bgCard,border:`1px solid ${role===o.v?C.gold:C.border}`,borderRadius:10,padding:".75rem",cursor:"pointer",color:role===o.v?C.gold:C.dim,fontFamily:FONT.body,fontWeight:role===o.v?700:500,fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",gap:".4rem"}}>
                    <span style={{fontSize:16}}>{o.i}</span>{o.l}
                  </button>
                ))}
              </div>
            </div>
            <Card style={{marginBottom:".75rem"}}>
              <Label>Name</Label>
              <input value={name} onChange={e=>setName(e.target.value)} placeholder={role==="coach"?"Coach name":"Player name"}
                style={{background:"none",border:"none",color:C.white,fontSize:16,fontFamily:FONT.body,width:"100%",outline:"none"}}/>
            </Card>
          </>
        )}

        <Card style={{marginBottom:".75rem"}}>
          <Label>Email</Label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email"
            style={{background:"none",border:"none",color:C.white,fontSize:16,fontFamily:FONT.body,width:"100%",outline:"none"}}/>
        </Card>

        <Card style={{marginBottom:".75rem"}}>
          <Label>Password</Label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder={mode==="signup"?"At least 6 characters":"Your password"} autoComplete={mode==="signup"?"new-password":"current-password"}
            style={{background:"none",border:"none",color:C.white,fontSize:16,fontFamily:FONT.body,width:"100%",outline:"none"}}/>
        </Card>

        {err && (
          <div style={{fontSize:13,color:C.red,background:C.redDim,border:`1px solid ${C.redBorder}`,borderRadius:8,padding:".6rem .8rem",marginBottom:".75rem"}}>
            {err}
          </div>
        )}

        <PrimaryBtn onClick={submit} disabled={loading}>
          {loading ? "…" : (mode === "login" ? "Sign In →" : "Create Account →")}
        </PrimaryBtn>

        <div style={{textAlign:"center",marginTop:"1.25rem",fontSize:13,color:C.dimmer}}>
          {mode === "login" ? "New to IceIQ? " : "Already have an account? "}
          <button onClick={()=>{setMode(mode==="login"?"signup":"login");setErr("");}} style={{background:"none",border:"none",color:C.gold,cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:FONT.body,padding:0,textDecoration:"underline"}}>
            {mode === "login" ? "Create account" : "Sign in"}
          </button>
        </div>

        <div style={{marginTop:"2rem",paddingTop:"1.5rem",borderTop:`1px solid ${C.border}`}}>
          <div style={{fontSize:11,letterSpacing:".14em",textTransform:"uppercase",color:C.dimmer,fontWeight:700,textAlign:"center",marginBottom:".85rem"}}>Or try it first</div>
          <button onClick={onDemo} style={{width:"100%",background:C.bgCard,border:`1px solid ${C.purpleBorder}`,borderRadius:10,padding:".85rem",cursor:"pointer",color:C.purple,fontFamily:FONT.body,fontWeight:700,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",gap:".5rem"}}>
            <span style={{fontSize:16}}>🎮</span> Try the Demo — No Signup
          </button>
          <div style={{fontSize:11,color:C.dimmer,textAlign:"center",marginTop:".65rem",lineHeight:1.5}}>Explore as Connor Crosby (U11 AA Edmonton Selects). Nothing is saved.</div>
        </div>

        <div style={{fontSize:10,color:C.dimmer,textAlign:"center",marginTop:"2rem",opacity:.6}}>v{VERSION}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// COACH HOME — teams list, create team, roster
// ─────────────────────────────────────────────────────────
function CoachHome({ profile, onSignOut, onOpenPlayer }) {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLevel, setNewLevel] = useState("U11 / Atom");
  const [newSeason, setNewSeason] = useState(SEASONS[0]);
  const [expandedTeam, setExpandedTeam] = useState(null);
  const [rosters, setRosters] = useState({});

  useEffect(() => { (async () => {
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
            <div style={{display:"flex",alignItems:"center",gap:".5rem",marginBottom:".25rem"}}>
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

  function enterDemo() {
    const p = buildDemoPlayer();
    const coachData = buildDemoCoachRatings();
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
    (async () => {
      const session = await SB.getSession();
      if (session?.user && mounted) await loadUser(session.user.id);
      if (mounted) setAuthReady(true);
    })();
    const { data } = SB.onAuthChange(async (session) => {
      if (!mounted) return;
      if (session?.user) await loadUser(session.user.id);
      else { setProfile(null); setPlayer(null); }
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
          @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: #080e1a; color: #f8fafc; -webkit-font-smoothing: antialiased; }
          ::-webkit-scrollbar { width: 4px; }
          ::-webkit-scrollbar-thumb { background: rgba(248,250,252,.08); border-radius: 2px; }
          input, textarea, button, select { font-family: 'DM Sans', sans-serif; }
          button:active { opacity: .8; }
          textarea { resize: none; }
        `}</style>
        <CoachHome
          profile={profile}
          onSignOut={handleSignOut}
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
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #080e1a; color: #f8fafc; -webkit-font-smoothing: antialiased; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(248,250,252,.08); border-radius: 2px; }
        input, textarea, button, select { font-family: 'DM Sans', sans-serif; }
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
        {screen === "home"    && <Home player={player} onNav={setScreen}/>}
        {screen === "quiz"    && <Quiz player={player} onFinish={handleQuizFinish} onBack={()=>setScreen("home")}/>}
        {screen === "results" && <Results results={quizResults} player={player} prevScore={prevScore} totalSessions={totalSessions} seqPerfect={seqPerfect} mistakeStreak={mistakeStreak} onAgain={()=>setScreen("quiz")} onHome={()=>setScreen("home")}/>}
        {screen === "skills"  && <Skills player={player} onSave={handleSkillsSave} onBack={()=>setScreen("home")}/>}
        {screen === "study"   && <StudyScreen player={player} onBack={()=>setScreen("home")} onNav={setScreen}/>}
        {screen === "goals"   && <GoalsScreen player={player} onSave={handleGoalsSave} onBack={()=>setScreen("home")}/>}
        {screen === "report"  && <Report player={player} onBack={()=>setScreen("home")} demoCoachData={demoMode?demoCoachRatings:null}/>}
        {screen === "profile" && <Profile player={player} onSave={handleProfileSave} onBack={()=>setScreen("home")} onReset={handleSignOut} demoMode={demoMode}/>}
      </div>

      {!["quiz","results"].includes(screen) && (
        <BottomNav active={screen} onNav={setScreen}/>
      )}
    </>
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

  useEffect(() => { (async () => {
    const existing = await SB.getCoachRatingsForPlayer(player.id);
    setRatings(existing.ratings || {});
    setNotes(existing.notes || {});
    setLoading(false);
  })(); }, []);

  async function save() {
    setSaving(true);
    try {
      await SB.saveCoachRatingsForPlayer(coach.id, player.id, ratings, notes);
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
