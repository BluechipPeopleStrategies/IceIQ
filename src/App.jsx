import { useState, useEffect } from "react";

const C = {
  navy:"#0a1628", navyMid:"#112040", gold:"#c9a84c", white:"#f4f6fa",
  dim:"rgba(244,246,250,0.55)", dimmer:"rgba(244,246,250,0.28)", dimmest:"rgba(244,246,250,0.07)",
  purple:"#9b8df5", purpleDim:"rgba(155,141,245,0.14)",
  green:"#4caf82", yellow:"#e8b84b", red:"#e05252",
  border:"rgba(244,246,250,0.09)", ice:"#e8f4f8", rink:"#2a5f8f"
};

const DW = {1:1, 2:1.5, 3:2.2};
const TOTAL = 15;

const SCORE_TIERS = [
  { min:80, label:"Hockey Sense",   badge:"🏒", color:C.green  },
  { min:60, label:"Two-Way Player", badge:"⚡", color:C.yellow },
  { min:0,  label:"Tape to Tape",   badge:"🎯", color:C.red    },
];
function getTier(s) { return SCORE_TIERS.find(t => s >= t.min); }

const BADGES = {
  HOT_STREAK: { icon:"🔥", name:"Hot Streak",  desc:"3 correct in a row" },
  HOCKEY_IQ:  { icon:"🧠", name:"Hockey IQ",   desc:"Perfect session" },
  HARD_HAT:   { icon:"💎", name:"Hard Hat",    desc:"5 Advanced correct" },
  SNIPER:     { icon:"🎯", name:"Sniper",      desc:"100% on a category" },
  LEVEL_UP:   { icon:"📈", name:"Level Up",    desc:"Beat your last score" },
};

function calcBadges(results, prevScore) {
  const earned = new Set();
  let streak = 0;
  for (const r of results) {
    if (r.ok) { streak++; if (streak >= 3) earned.add("HOT_STREAK"); }
    else streak = 0;
  }
  if (results.every(r => r.ok)) earned.add("HOCKEY_IQ");
  if (results.filter(r => r.ok && r.d === 3).length >= 5) earned.add("HARD_HAT");
  const byCat = {};
  results.forEach(r => { if (!byCat[r.cat]) byCat[r.cat]={ok:0,tot:0}; byCat[r.cat].tot++; if(r.ok)byCat[r.cat].ok++; });
  if (Object.values(byCat).some(v => v.tot >= 2 && v.ok === v.tot)) earned.add("SNIPER");
  const score = calcIQ(results);
  if (prevScore !== null && score > prevScore) earned.add("LEVEL_UP");
  return [...earned].map(k => BADGES[k]);
}

const QB = [
{id:"u11q1",cat:"Rush Reads",concept:"2-on-1 basic",d:1,sit:"You're on a 2-on-1. You have the puck. The defender is right in front of you. Your teammate is wide open. What do you do?",opts:["Shoot right away","Pass to your open teammate","Slow down and wait","Dump it in the corner"],ok:1,why:"When you have a 2-on-1 and the defender takes you, your open teammate is the play.",tip:"2-on-1: If the D takes you, pass."},
{id:"u11q2",cat:"Coverage",concept:"Find your man",d:1,sit:"The other team has the puck in your defensive zone. What's the most important thing every player on your team should be doing?",opts:["Watching the puck","Finding a man to cover","Skating to the blue line","Waiting for a turnover"],ok:1,why:"In your defensive zone, every player needs to find a man. Watching the puck without picking up a check is how goals happen.",tip:"Own zone: find your man first. Then watch the puck."},
{id:"u11q3",cat:"Blue Line Decisions",concept:"Keep puck in",d:1,sit:"Your team has the puck in the offensive zone. It's sliding toward the blue line. You're the defenseman. What do you do?",opts:["Let it go out","Skate to the puck and keep it in the zone","Back up to give room","Go to the net"],ok:1,why:"Keeping the puck in the offensive zone is the defenseman's first job.",tip:"Puck going to the line? Keep it in. That's your job as D."},
{id:"u11q4",cat:"Offensive Pressure",concept:"Forecheck basics",d:1,sit:"Your team is forechecking. The opposing D just picked up the puck behind their net. You're the first forward in. What's your goal?",opts:["Get the puck no matter what","Put pressure on the D so they can't make an easy breakout pass","Wait for your teammates before moving","Skate back to center ice"],ok:1,why:"The first forward on the forecheck pressures the puck carrier to take away easy options and force a mistake.",tip:"Forechecking: pressure the D. Take away their easy out."},
{id:"u11q5",cat:"Transition",concept:"Transition basics",d:1,sit:"Your team just lost the puck in the offensive zone. The other team is breaking out. What should every forward on your team do immediately?",opts:["Stay in the offensive zone and wait","Turn around and skate back toward your own zone","Stop and call for a pass","Stand still and watch"],ok:1,why:"The instant your team loses possession, every forward transitions back. Not eventually — immediately.",tip:"Lost the puck? Turn around. Right now."},
{id:"u11q6",cat:"Puck Protection",concept:"Body position",d:1,sit:"You have the puck along the boards and a defender is coming at you from behind. What's the right thing to do with your body?",opts:["Turn to face the defender","Put your body between the defender and the puck","Spin and try to skate through them","Pass immediately before they arrive"],ok:1,why:"Puck protection is about body position. Getting your body between the puck and the defender gives you time to make a play.",tip:"Defender behind you? Get your body between them and the puck."},
{id:"u11q7",cat:"Gap Control",concept:"Gap basics",d:1,sit:"You're a defender and an attacker is coming at you with the puck. You're backing up. Should you give them a lot of space or a little?",opts:["A lot of space — give them room","A steady controlled gap — not too much, not too little","No space — close on them immediately","It doesn't matter"],ok:1,why:"Gap control means maintaining the right distance. Too much space lets them get speed and options. Too little and they go around you.",tip:"Gap control: close enough to be a threat, far enough to react."},
{id:"u11q8",cat:"Special Teams",concept:"PP basics",d:1,sit:"Your team is on the power play. You have the extra skater. What's the most important thing you have that the other team doesn't?",opts:["Faster players","One more player on the ice","A better goalie","The home crowd"],ok:1,why:"The power play advantage is the extra skater. Every decision should exploit that — move the puck to find the player who isn't covered.",tip:"Power play: you have the extra man. Find them."},
{id:"u11q16",cat:"Rush Reads",concept:"2-on-1 timing",d:2,sit:"You're the puck carrier on a 2-on-1. The lone defender is backing up in the middle, not committing to either side. What do you do?",opts:["Pass immediately since it's a 2-on-1","Drive wide to force the defender to fully commit first, then decide","Shoot from where you are","Pull up and regroup"],ok:1,why:"If the defender isn't committing, you haven't created the advantage yet. Drive wide to force their decision.",tip:"Defender not committing? Make them. Drive wide first."},
{id:"u11q17",cat:"Rush Reads",concept:"3-on-2 middle lane",d:2,sit:"Your team rushes 3-on-2. Both defenders take your two wingers. The middle lane is completely open. You're the center. What do you do?",opts:["Pass to the right winger","Pass to the left winger","Drive the middle lane and shoot — the defenders opened it for you","Pull up and regroup"],ok:2,why:"When both defenders go to the wings, they've given you the middle. Driving the lane and shooting catches the goalie off-guard.",tip:"Both D go wide on a 3-on-2? Drive the middle. Shoot."},
{id:"u11q18",cat:"Rush Reads",concept:"Rush regroup",d:2,sit:"Your team is on a rush but you're outnumbered — 2-on-3 against you. What's the right call?",opts:["Attack anyway — speed is on your side","Pull up, regroup, and get set up properly","Dump it in and chase","Pass back to the blue line"],ok:1,why:"Attacking a 3-on-2 against you gives the other team the transition they want. Pulling up and regrouping resets the play on your terms.",tip:"Outnumbered on the rush? Pull up. Don't attack into a trap."},
{id:"u11q19",cat:"Coverage",concept:"Corner coverage",d:2,sit:"The puck goes into the corner in your defensive zone. You're the nearest forward. Your D is already there. What do you do?",opts:["Go help in the corner — two players are better","Hold the front of the net — don't leave it empty","Go to the blue line","Skate to center ice"],ok:1,why:"When your D goes to the corner, you hold the front of the net. Two players in the corner leaves the crease empty.",tip:"D goes to the corner? You hold the net front. Don't follow them in."},
{id:"u11q20",cat:"Coverage",concept:"Center coverage",d:2,sit:"Three attackers enter your zone. You're the center on defense. Your two wingers pick up the two opposing wingers. Who do you cover?",opts:["The puck","The opposing center","The open space in the slot","Go help a winger"],ok:1,why:"In standard defensive zone coverage, the center picks up the opposing center.",tip:"Three attackers in your zone? As center, you've got their center."},
{id:"u11q21",cat:"Blue Line Decisions",concept:"Pinch risk",d:2,sit:"You're the defenseman at the offensive blue line. The puck goes to the corner. Your nearest winger is there but about to get pressured. No coverage behind you. Should you pinch?",opts:["Yes — go help your winger","No — hold the blue line. If your winger loses the puck you'll be caught deep.","Go to the net front","Skate behind the net"],ok:1,why:"Pinching when there's no coverage behind you and your winger is under pressure is high-risk. If the puck turns over, you're caught deep with a 2-on-1 against you.",tip:"No coverage behind you? Don't pinch. Hold the line."},
{id:"u11q22",cat:"Blue Line Decisions",concept:"D-to-D pass",d:2,sit:"You're the right defenseman in the offensive zone. A defender is closing on you hard. Your D partner on the left side is wide open. What do you do?",opts:["Hold the puck and try to beat the pressure","Make a quick D-to-D pass to your partner — they're open and you're not","Shoot the puck through traffic","Pass back into the corner"],ok:1,why:"Under pressure at the point, the D-to-D pass is the reset. Your partner has time and a better look.",tip:"Pressure coming? D-to-D. Let your partner reset the play."},
{id:"u11q23",cat:"Blue Line Decisions",concept:"Shooting through traffic",d:2,sit:"You're the defenseman at the point on the power play. The slot is full of traffic. You have a shooting lane to the net. What do you do?",opts:["Hold the puck and wait for traffic to clear","Shoot immediately — traffic in front means screens and rebounds","Pass cross-ice to the other point","Skate in yourself"],ok:1,why:"Traffic in front of the net is an asset, not a problem. Shoot through it — the screen blocks the goalie's view and the traffic creates rebounds.",tip:"Traffic in front? Shoot. That's exactly what you want."},
{id:"u11q24",cat:"Offensive Pressure",concept:"High forward 2-1-2",d:2,sit:"Your team is in a 2-1-2 forecheck. The puck is in the corner. As the high forward, where do you position?",opts:["Go into the corner and chase the puck","Stay high between the two defensemen — cut off passes and take away the middle","Go to the net front","Back up to the blue line"],ok:1,why:"In a 2-1-2 forecheck, the high forward cuts off outlet passes through the middle.",tip:"High forward in a 2-1-2: sit between the D. Cut off the middle outlet."},
{id:"u11q25",cat:"Offensive Pressure",concept:"Forecheck angles",d:2,sit:"You're forechecking. The D picks up the puck behind the net and looks to the left winger up the wall. What's your angle?",opts:["Go straight at the D as fast as possible","Cut off the pass to the left — force the D to go right instead","Stop and let them make the pass","Back off completely"],ok:1,why:"Forechecking with angles means reading where the D wants to go and cutting that off.",tip:"Forecheck: read where they want to go. Cut it off."},
{id:"u11q41",cat:"Rush Reads",concept:"Goalie reads the 2-on-1",d:3,sit:"You're the puck carrier on a 2-on-1. The defender commits fully to your teammate. The goalie slides across expecting your pass. What's the right call now?",opts:["Pass to your teammate as planned","Shoot — the goalie has moved and there's a lane on your side","Pass to the other side","Pull up and regroup"],ok:1,why:"When the defender commits to your teammate AND the goalie slides to take away the pass, they've left your side open. Shoot — the goalie has moved.",tip:"2-on-1: if the goalie chases the pass, shoot becomes the right play. Read the goalie."},
{id:"u11q42",cat:"Rush Reads",concept:"3-on-2 D split",d:3,sit:"Your team turns the puck over in the offensive zone. The other team breaks out with a 3-on-2 against you. You're the far defenseman. The puck carrier is coming up your side. What's your priority?",opts:["Rush the puck carrier","Take your side, force the carrier wide, and trust your partner to take the middle player","Back up to the crease","Chase the trailer"],ok:1,why:"On a 3-on-2, the two D split responsibility. You take your side and force the carrier wide — your partner protects the middle.",tip:"3-on-2 against you: each D takes a side. Don't cross unless called."},
{id:"u11q43",cat:"Rush Reads",concept:"Backcheck weak side",d:3,sit:"Your team turns the puck over. The other team has a 2-on-1 and you're the only forward close enough to get back. You can't catch the puck carrier. What do you do?",opts:["Skate as fast as you can directly at the puck carrier","Skate back hard on the weak side — get between the second attacker and the net","Stop skating — you can't help","Go to the bench for a line change"],ok:1,why:"You can't catch the puck carrier, but you can take away the pass option on the weak side.",tip:"Can't catch the puck carrier? Get to the weak side. Take away the pass."},
{id:"u11q44",cat:"Coverage",concept:"Overload coverage",d:3,sit:"Three attackers enter your zone. They overload the left side — two attackers on the left and one on the right. Both your D are back. How should they adjust?",opts:["Both D go to the left to cover the two attackers","One D takes the two on the left, the other holds the middle and takes the weak-side attacker — both D communicate","Both D go to the right","One D goes behind the net"],ok:1,why:"An overload means the D have to communicate and adjust. One D takes the strong side with two attackers, while the partner takes the weak-side player and the slot.",tip:"Overload coverage: communicate. One takes the strong side, the other holds the middle and weak side."},
{id:"u11q45",cat:"Coverage",concept:"Late attacker uncovered",d:3,sit:"Two attackers entered your zone and both D picked them up. A third attacker trails in 5 seconds later — nobody picked them up. You're the center on defense. What do you do?",opts:["Stay with your current assignment","Pick up the late attacker — your winger on that side needs to find their assignment","Call it out and let someone else handle it","Ignore it — your D will figure it out"],ok:1,why:"A late attacker entering the zone creates a coverage breakdown. The center needs to pick them up or communicate a switch.",tip:"Late attacker uncovered? Call it and pick them up. Coverage gaps get exploited."},
{id:"u11q46",cat:"Blue Line Decisions",concept:"When to pinch advanced",d:3,sit:"You're the offensive zone D. The puck went to the corner. Your winger got there first and has possession, but a defender is closing. No coverage behind you. Your other winger is at the half-wall. Should you pinch?",opts:["Yes — go help your winger in the corner","No — your winger has possession and your half-wall winger can support. Hold the blue line.","Yes — any time there's a puck battle, pinch","Go to the net front instead"],ok:1,why:"Your winger has possession and the half-wall winger can support. You don't need to go. Pinching here with no coverage behind you risks a breakout against you.",tip:"Winger has it and half-wall can help? Hold the line."},
{id:"u11q47",cat:"Blue Line Decisions",concept:"Shot fake PP",d:3,sit:"You're the point on the power play. You have the puck and a shooting lane — but two PK forwards are closing on you hard. You have one second. What's the best play?",opts:["Shoot immediately before they close","Fake the shot to freeze them, then pass to the half-wall player who opened up when they committed to you","Hold the puck and wait for a lane","Pass back to the other point"],ok:1,why:"When two PK players commit to you, they've left someone open. A shot fake freezes them for a split second — the half-wall opens up the instant they both lean at you.",tip:"Two PKers closing? Fake the shot. Someone opened up when they committed."}
];

const Q_MAP = Object.fromEntries(QB.map(q => [q.id, q]));

function shuffle(a) { return [...a].sort(() => Math.random() - 0.5); }

function makeQueue(ret) {
  const s = shuffle(QB);
  return { byD:{1:s.filter(q=>q.d===1), 2:s.filter(q=>q.d===2), 3:s.filter(q=>q.d===3)}, d:ret?2:1 };
}

function pullNext(queue, results) {
  const last2 = results.slice(-2);
  let { byD, d } = queue;
  if (last2.length === 2) {
    if (last2.every(r=>r.ok) && d < 3) d++;
    else if (last2.every(r=>!r.ok) && d > 1) d--;
  }
  if (!byD[d].length) {
    const fb = [1,2,3].find(x => x !== d && byD[x].length);
    if (!fb) return { q:null, queue };
    d = fb;
  }
  const i = Math.floor(Math.random() * byD[d].length);
  const q = byD[d][i];
  return { q, queue:{ byD:{...byD,[d]:byD[d].filter((_,j)=>j!==i)}, d } };
}

function calcIQ(results) {
  if (!results.length) return 0;
  const e = results.reduce((s,r) => s+(r.ok?DW[r.d]:0), 0);
  const p = results.reduce((s,r) => s+DW[r.d], 0);
  return Math.round((e/p)*100);
}

const dLabel = {1:"Foundation", 2:"Developing", 3:"Advanced"};

// ── Storage helpers ──────────────────────────────────────────────
async function saveResult(coachCode, results) {
  const key = "team:" + coachCode.toUpperCase();
  let existing = [];
  try {
    const r = await window.storage.get(key, true);
    if (r) existing = JSON.parse(r.value);
  } catch(e) {}
  // Store only anonymous question-level data
  const entry = {
    ts: Date.now(),
    iq: calcIQ(results),
    qs: results.map(r => ({ id:r.id, ok:r.ok, d:r.d, cat:r.cat }))
  };
  existing.push(entry);
  // Keep last 200 sessions per team
  if (existing.length > 200) existing = existing.slice(-200);
  await window.storage.set(key, JSON.stringify(existing), true);
}

async function loadTeamData(coachCode) {
  const key = "team:" + coachCode.toUpperCase();
  try {
    const r = await window.storage.get(key, true);
    return r ? JSON.parse(r.value) : [];
  } catch(e) { return []; }
}

// ── Rink SVG Diagrams ────────────────────────────────────────────
function RinkDiagram({ type }) {
  const w=280, h=150, cx=w/2, cy=h/2;
  const Rink = () => (
    <g>
      <rect x="4" y="4" width={w-8} height={h-8} rx="22" fill={C.ice} stroke={C.rink} strokeWidth="1.5"/>
      <line x1={cx} y1="4" x2={cx} y2={h-4} stroke={C.rink} strokeWidth="1" strokeDasharray="4,3" opacity="0.35"/>
      <circle cx={cx} cy={cy} r="16" fill="none" stroke={C.rink} strokeWidth="1" opacity="0.35"/>
    </g>
  );
  const Dot = ({x,y,fill,label}) => (
    <g>
      <circle cx={x} cy={y} r="10" fill={fill} stroke="white" strokeWidth="1.5"/>
      <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="7" fontWeight="600">{label}</text>
    </g>
  );
  const Arr = ({x1,y1,x2,y2,color=C.gold,dash,curved}) => {
    const dx=x2-x1,dy=y2-y1,len=Math.sqrt(dx*dx+dy*dy);
    const ux=dx/len,uy=dy/len,hx=x2-ux*11,hy=y2-uy*11;
    const d = curved
      ? `M${x1} ${y1} Q${(x1+x2)/2} ${y1-20} ${hx} ${hy}`
      : `M${x1} ${y1} L${hx} ${hy}`;
    return (
      <g>
        <path d={d} fill="none" stroke={color} strokeWidth="2" strokeDasharray={dash} opacity="0.9"/>
        <polygon points={`${x2},${y2} ${hx-uy*5},${hy+ux*5} ${hx+uy*5},${hy-ux*5}`} fill={color} opacity="0.9"/>
      </g>
    );
  };
  const Net = ({x,y}) => <rect x={x} y={y} width="12" height="24" rx="2" fill="none" stroke={C.rink} strokeWidth="2"/>;
  const Puck = ({x,y}) => <circle cx={x} cy={y} r="4" fill="#1a1a2e" stroke="white" strokeWidth="1"/>;

  const diagrams = {
    "2on1": (
      <svg width={w} height={h} style={{display:"block"}}>
        <Rink/>
        <Net x={w-18} y={cy-12}/>
        <Dot x={110} y={cy-15} fill="#2a8c5a" label="A1"/>
        <Dot x={110} y={cy+15} fill="#2a8c5a" label="A2"/>
        <Dot x={190} y={cy} fill={C.red} label="D"/>
        <Puck x={120} y={cy-10}/>
        <Arr x1={120} y1={cy-15} x2={w-22} y2={cy-8} curved/>
        <Arr x1={120} y1={cy+15} x2={w-22} y2={cy+10} color="rgba(76,175,130,0.6)" dash="4,3"/>
        <Arr x1={180} y1={cy} x2={160} y2={cy-10} color={C.red}/>
        <text x={110} y={20} textAnchor="middle" fill={C.rink} fontSize="7" fontWeight="600" opacity="0.7">2-ON-1 RUSH</text>
      </svg>
    ),
    "coverage": (
      <svg width={w} height={h} style={{display:"block"}}>
        <Rink/>
        <Net x={6} y={cy-12}/>
        <Dot x={130} y={50} fill={C.red} label="A1"/>
        <Dot x={160} y={80} fill={C.red} label="A2"/>
        <Dot x={130} y={110} fill={C.red} label="A3"/>
        <Puck x={140} y={55}/>
        <Dot x={90} y={50} fill="#2a8c5a" label="D1"/>
        <Dot x={90} y={80} fill="#2a8c5a" label="D2"/>
        <Dot x={90} y={110} fill="#2a8c5a" label="F"/>
        <text x={160} y={95} textAnchor="middle" fill={C.yellow} fontSize="14" fontWeight="700">?</text>
        <text x={130} y={20} textAnchor="middle" fill={C.rink} fontSize="7" fontWeight="600" opacity="0.7">DEFENSIVE ZONE</text>
        <text x={200} y={85} fill={C.red} fontSize="8">Uncovered!</text>
      </svg>
    ),
    "blueline": (
      <svg width={w} height={h} style={{display:"block"}}>
        <Rink/>
        <Net x={w-18} y={cy-12}/>
        <line x1={cx+10} y1="4" x2={cx+10} y2={h-4} stroke="#4466cc" strokeWidth="2.5" opacity="0.7"/>
        <text x={cx+16} y={16} fill="#4466cc" fontSize="7" fontWeight="600">BLUE LINE</text>
        <Puck x={cx+5} y={cy}/>
        <Arr x1={cx+5} y1={cy} x2={cx+35} y2={cy} color={C.red}/>
        <Dot x={cx+50} y={cy} fill="#2a8c5a" label="D"/>
        <Arr x1={cx+40} y1={cy} x2={cx+18} y2={cy} color="#2a8c5a"/>
        <text x={cx-30} y={cy-8} fill={C.red} fontSize="8">zone exit ✗</text>
        <text x={cx+55} y={cy-16} fill="#2a8c5a" fontSize="8">keep it in ✓</text>
      </svg>
    ),
    "forecheck": (
      <svg width={w} height={h} style={{display:"block"}}>
        <Rink/>
        <Net x={6} y={cy-12}/>
        <Dot x={80} y={cy} fill={C.red} label="D"/>
        <Puck x={90} y={cy-4}/>
        <Dot x={170} y={80} fill="#2a8c5a" label="F1"/>
        <Arr x1={160} y1={82} x2={95} y2={cy} color="#2a8c5a"/>
        <Arr x1={80} y1={cy-10} x2={80} y2={28} color={C.red} dash="3,3"/>
        <Arr x1={80} y1={cy-10} x2={140} y2={35} color={C.red} dash="3,3"/>
        <text x={65} y={22} fill={C.red} fontSize="7">outlet?</text>
        <text x={100} y={22} fill={C.rink} fontSize="7" fontWeight="600" opacity="0.7">CUT THE ANGLE</text>
      </svg>
    ),
  };
  return diagrams[type] || null;
}

const DIAGRAMS = {
  u11q1:"2on1", u11q7:"2on1", u11q16:"2on1", u11q17:"2on1", u11q41:"2on1",
  u11q2:"coverage", u11q14:"coverage", u11q19:"coverage", u11q44:"coverage",
  u11q3:"blueline", u11q20:"blueline", u11q47:"blueline",
  u11q4:"forecheck", u11q24:"forecheck", u11q48:"forecheck",
};

// ── SCREENS ──────────────────────────────────────────────────────
const W = { minHeight:"100vh", background:C.navy, color:C.white, fontFamily:"'DM Sans',sans-serif" };
const P = { padding:"1.5rem 1.25rem", maxWidth:520, margin:"0 auto" };
const Card = ({children,style}) => (
  <div style={{background:C.dimmest,border:"1px solid "+C.border,borderRadius:14,padding:"1.25rem",...style}}>
    {children}
  </div>
);
const Btn = ({onClick,children,style}) => (
  <button onClick={onClick} style={{background:C.gold,color:C.navy,border:"none",borderRadius:10,padding:"1rem",cursor:"pointer",fontWeight:800,fontSize:15,fontFamily:"'DM Sans',sans-serif",width:"100%",...style}}>
    {children}
  </button>
);
const SecBtn = ({onClick,children,style}) => (
  <button onClick={onClick} style={{background:C.dimmest,color:C.dim,border:"1px solid "+C.border,borderRadius:10,padding:"1rem",cursor:"pointer",fontWeight:600,fontSize:14,fontFamily:"'DM Sans',sans-serif",width:"100%",...style}}>
    {children}
  </button>
);

function StartScreen({ onStart, onCoach }) {
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  function go(ret) {
    if (!code.trim()) { setErr("Enter your coach code to save results"); return; }
    if (code.trim().length < 4) { setErr("Code must be at least 4 characters"); return; }
    onStart(code.trim().toUpperCase(), ret);
  }
  return (
    <div style={W}><div style={P}>
      <div style={{textAlign:"center",marginBottom:"2rem"}}>
        <div style={{fontSize:36,marginBottom:".4rem"}}>🏒</div>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:"2.4rem",color:C.gold,letterSpacing:".06em"}}>IceIQ</div>
        <div style={{fontSize:13,color:C.dimmer,marginTop:".3rem"}}>U11 / Atom · 25 Questions · Adaptive</div>
      </div>
      <Card style={{marginBottom:"1rem"}}>
        <div style={{fontSize:12,color:C.dimmer,marginBottom:".85rem",fontWeight:600,letterSpacing:".08em",textTransform:"uppercase"}}>Coach Code</div>
        <input
          value={code} onChange={e=>{ setCode(e.target.value.toUpperCase()); setErr(""); }}
          placeholder="e.g. HAWKS or 2847"
          maxLength={8}
          style={{background:"rgba(255,255,255,.06)",border:"1px solid "+(err?C.red:code?C.gold:C.border),borderRadius:10,padding:".85rem 1rem",color:C.white,fontSize:18,fontFamily:"'DM Sans',sans-serif",width:"100%",outline:"none",marginBottom:".5rem",letterSpacing:".12em",textAlign:"center",fontWeight:700}}
        />
        {err && <div style={{fontSize:12,color:C.red,marginBottom:".5rem"}}>{err}</div>}
        <div style={{fontSize:11,color:C.dimmer,lineHeight:1.6}}>Your coach gives you this code. Results are saved anonymously — coaches see team patterns, not who answered what.</div>
      </Card>
      <Btn onClick={()=>go(false)} style={{marginBottom:".65rem"}}>Start Baseline Quiz →</Btn>
      <SecBtn onClick={()=>go(true)} style={{marginBottom:"1rem"}}>Returning Player (Starts Medium)</SecBtn>
      <button onClick={onCoach} style={{background:"none",border:"none",color:C.dimmer,fontSize:13,fontFamily:"'DM Sans',sans-serif",cursor:"pointer",width:"100%",textDecoration:"underline"}}>
        I'm a coach — view team dashboard →
      </button>
      <div style={{marginTop:"1.5rem"}}>
        <div style={{fontSize:10,letterSpacing:".1em",textTransform:"uppercase",color:C.dimmer,marginBottom:".6rem"}}>Score tiers</div>
        {SCORE_TIERS.map(t=>(
          <div key={t.label} style={{display:"flex",alignItems:"center",gap:".5rem",marginBottom:".35rem"}}>
            <span style={{fontSize:14}}>{t.badge}</span>
            <span style={{fontSize:13,fontWeight:700}}>{t.label}</span>
          </div>
        ))}
      </div>
    </div></div>
  );
}

function CoachScreen({ onBack }) {
  const [code, setCode] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    if (!code.trim()) { setErr("Enter your coach code"); return; }
    setLoading(true); setErr("");
    try {
      const sessions = await loadTeamData(code.trim());
      setData(sessions);
    } catch(e) { setErr("Could not load data"); }
    setLoading(false);
  }

  // Aggregate results
  let agg = null;
  if (data && data.length > 0) {
    const qStats = {};
    const catStats = {};
    data.forEach(session => {
      session.qs.forEach(q => {
        if (!qStats[q.id]) qStats[q.id] = { ok:0, tot:0, cat:q.cat, d:q.d };
        qStats[q.id].tot++;
        if (q.ok) qStats[q.id].ok++;
        if (!catStats[q.cat]) catStats[q.cat] = { ok:0, tot:0 };
        catStats[q.cat].tot++;
        if (q.ok) catStats[q.cat].ok++;
      });
    });
    const avgIQ = Math.round(data.reduce((s,d)=>s+d.iq,0)/data.length);
    // Sort questions by miss rate (worst first)
    const sorted = Object.entries(qStats)
      .map(([id,v]) => ({id,...v,pct:Math.round((v.ok/v.tot)*100)}))
      .sort((a,b) => a.pct - b.pct);
    agg = { sessions:data.length, avgIQ, qStats:sorted, catStats };
  }

  return (
    <div style={W}><div style={P}>
      <button onClick={onBack} style={{background:"none",border:"1px solid "+C.border,color:C.dim,borderRadius:8,padding:".4rem .9rem",cursor:"pointer",fontSize:13,fontFamily:"'DM Sans',sans-serif",marginBottom:"1.5rem"}}>← Back</button>
      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:"1.8rem",marginBottom:"1.5rem"}}>Coach Dashboard</div>
      <Card style={{marginBottom:"1rem"}}>
        <div style={{fontSize:12,color:C.dimmer,marginBottom:".75rem",fontWeight:600,letterSpacing:".08em",textTransform:"uppercase"}}>Your Coach Code</div>
        <div style={{display:"flex",gap:".75rem"}}>
          <input value={code} onChange={e=>{ setCode(e.target.value.toUpperCase()); setData(null); setErr(""); }}
            placeholder="Enter your code"
            maxLength={8}
            style={{background:"rgba(255,255,255,.06)",border:"1px solid "+(err?C.red:code?C.gold:C.border),borderRadius:10,padding:".75rem 1rem",color:C.white,fontSize:16,fontFamily:"'DM Sans',sans-serif",flex:1,outline:"none",letterSpacing:".1em",fontWeight:700}}
          />
          <button onClick={load} disabled={loading} style={{background:C.gold,color:C.navy,border:"none",borderRadius:10,padding:".75rem 1.25rem",cursor:"pointer",fontWeight:800,fontSize:14,fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap"}}>
            {loading?"Loading...":"Load"}
          </button>
        </div>
        {err && <div style={{fontSize:12,color:C.red,marginTop:".5rem"}}>{err}</div>}
        <div style={{fontSize:11,color:C.dimmer,marginTop:".65rem",lineHeight:1.6}}>Results are completely anonymous. You see patterns, not individuals.</div>
      </Card>

      {data && data.length === 0 && (
        <Card><div style={{color:C.dimmer,textAlign:"center",padding:"1rem 0"}}>No sessions recorded yet for this code.<br/>Share it with your players to start collecting data.</div></Card>
      )}

      {agg && (
        <>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".75rem",marginBottom:"1rem"}}>
            <Card style={{textAlign:"center"}}>
              <div style={{fontSize:11,color:C.dimmer,marginBottom:".25rem",textTransform:"uppercase",letterSpacing:".08em"}}>Sessions</div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:"2.5rem",color:C.gold}}>{agg.sessions}</div>
            </Card>
            <Card style={{textAlign:"center"}}>
              <div style={{fontSize:11,color:C.dimmer,marginBottom:".25rem",textTransform:"uppercase",letterSpacing:".08em"}}>Team Avg IQ</div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:"2.5rem",color:agg.avgIQ>=80?C.green:agg.avgIQ>=60?C.yellow:C.red}}>{agg.avgIQ}%</div>
            </Card>
          </div>

          <Card style={{marginBottom:"1rem"}}>
            <div style={{fontSize:12,letterSpacing:".1em",textTransform:"uppercase",color:C.dimmer,marginBottom:"1rem",fontWeight:600}}>By Category</div>
            {Object.entries(agg.catStats).sort((a,b)=>(a[1].ok/a[1].tot)-(b[1].ok/b[1].tot)).map(([cat,v])=>{
              const pct=Math.round((v.ok/v.tot)*100);
              return (
                <div key={cat} style={{marginBottom:".85rem"}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:4}}>
                    <span style={{color:C.dim}}>{cat}</span>
                    <span style={{fontWeight:700,color:pct>=80?C.green:pct>=60?C.yellow:C.red}}>{pct}% correct</span>
                  </div>
                  <div style={{height:6,background:C.border,borderRadius:3,overflow:"hidden"}}>
                    <div style={{height:"100%",width:pct+"%",background:pct>=80?C.green:pct>=60?C.yellow:C.red,borderRadius:3}}/>
                  </div>
                </div>
              );
            })}
          </Card>

          <Card>
            <div style={{fontSize:12,letterSpacing:".1em",textTransform:"uppercase",color:C.dimmer,marginBottom:".85rem",fontWeight:600}}>Hardest Questions (Team)</div>
            {agg.qStats.slice(0,8).map(q => {
              const qData = Q_MAP[q.id];
              const pct = q.pct;
              return (
                <div key={q.id} style={{padding:".75rem 0",borderBottom:"1px solid "+C.border}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"1rem",marginBottom:".35rem"}}>
                    <div style={{flex:1}}>
                      <span style={{fontSize:11,background:pct<40?"rgba(224,82,82,.15)":pct<60?"rgba(232,184,75,.15)":"rgba(76,175,130,.15)",color:pct<40?C.red:pct<60?C.yellow:C.green,padding:"2px 7px",borderRadius:10,marginRight:".4rem",fontWeight:600}}>{pct}%</span>
                      <span style={{fontSize:11,color:C.dimmer}}>{q.cat} · {dLabel[q.d]}</span>
                    </div>
                    <span style={{fontSize:11,color:C.dimmer,whiteSpace:"nowrap"}}>{q.ok}/{q.tot} correct</span>
                  </div>
                  <div style={{fontSize:13,color:C.dim,lineHeight:1.5}}>{qData?.sit?.slice(0,90)}{qData?.sit?.length>90?"…":""}</div>
                </div>
              );
            })}
          </Card>
        </>
      )}
    </div></div>
  );
}

function QuizScreen({ coachCode, isRet, prevScore, onFinish, onBack }) {
  const [queue, setQueue] = useState(() => makeQueue(isRet));
  const [question, setQuestion] = useState(null);
  const [sel, setSel] = useState(null);
  const [results, setResults] = useState([]);

  useEffect(() => {
    const { q, queue:q2 } = pullNext(makeQueue(isRet), []);
    setQuestion(q);
    setQueue(q2);
  }, []);

  const qNum = results.length;
  const isLast = qNum >= TOTAL - 1;

  function pick(i) { if (sel !== null || !question) return; setSel(i); }

  function next() {
    if (sel === null) return;
    const newResult = { id:question.id, cat:question.cat, ok:sel===question.ok, d:question.d };
    const newResults = [...results, newResult];
    if (isLast) { onFinish(newResults); return; }
    const { q:nextQ, queue:nextQueue } = pullNext(queue, newResults);
    setResults(newResults); setQueue(nextQueue); setQuestion(nextQ); setSel(null);
  }

  const q = question;
  if (!q) return <div style={{...W,...P,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{color:C.dimmer}}>Loading...</div></div>;

  const diagramType = DIAGRAMS[q.id];

  return (
    <div style={W}>
      <div style={{position:"sticky",top:0,zIndex:10,background:"rgba(10,22,40,.97)",backdropFilter:"blur(12px)",borderBottom:"1px solid "+C.border,padding:".85rem 1.25rem",display:"flex",alignItems:"center",gap:"1rem"}}>
        <button onClick={onBack} style={{background:"none",border:"1px solid "+C.border,color:C.dim,borderRadius:8,padding:".35rem .75rem",cursor:"pointer",fontSize:13,fontFamily:"'DM Sans',sans-serif"}}>←</button>
        <div style={{flex:1}}>
          <div style={{fontWeight:700,fontSize:13,color:C.gold}}>IceIQ · U11</div>
          <div style={{fontSize:11,color:C.dimmer}}>Q{qNum+1}/{TOTAL} · {coachCode} · {isRet?"Adaptive":"Baseline"}</div>
        </div>
        <div style={{width:80,height:4,background:C.dimmest,borderRadius:2,overflow:"hidden"}}>
          <div style={{height:"100%",width:((qNum/TOTAL)*100)+"%",background:C.purple,borderRadius:2,transition:"width .3s"}}/>
        </div>
      </div>
      <div style={P}>
        <div style={{display:"flex",gap:".4rem",marginBottom:"1rem",flexWrap:"wrap"}}>
          <span style={{fontSize:11,background:C.purpleDim,color:C.purple,padding:"3px 10px",borderRadius:20,border:"1px solid rgba(155,141,245,.25)",fontWeight:600}}>{q.cat}</span>
          {q.concept && <span style={{fontSize:11,background:C.dimmest,color:C.dimmer,padding:"3px 10px",borderRadius:20,border:"1px solid "+C.border}}>{q.concept}</span>}
        </div>

        {diagramType && (
          <div style={{background:"#f0f7ff",borderRadius:12,padding:".85rem 1rem",marginBottom:"1rem",display:"flex",flexDirection:"column",alignItems:"center",border:"2px solid "+C.rink}}>
            <div style={{fontSize:9,letterSpacing:".12em",textTransform:"uppercase",color:C.rink,marginBottom:".4rem",fontWeight:700,opacity:0.7,alignSelf:"flex-start"}}>📋 Coach's Clipboard</div>
            <RinkDiagram type={diagramType}/>
          </div>
        )}

        <div style={{background:"rgba(155,141,245,.08)",border:"1px solid rgba(155,141,245,.2)",borderRadius:14,padding:"1.3rem",marginBottom:"1.25rem"}}>
          <div style={{fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:C.purple,marginBottom:".6rem",fontWeight:700}}>📋 Game Situation</div>
          <div style={{fontSize:15,lineHeight:1.8,color:C.white,fontWeight:500}}>{q.sit}</div>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:".5rem",marginBottom:"1.25rem"}}>
          {q.opts.map((opt,i) => {
            const picked = sel !== null;
            const isCorrect = i === q.ok;
            const isWrong = picked && i === sel && !isCorrect;
            let bg=C.dimmest, bdr=C.border, col=C.dim;
            if (picked) {
              if (isCorrect) { bg="rgba(76,175,130,.12)"; bdr="rgba(76,175,130,.4)"; col=C.white; }
              else if (isWrong) { bg="rgba(224,82,82,.1)"; bdr="rgba(224,82,82,.35)"; col=C.dimmer; }
            } else if (sel === i) { bg=C.purpleDim; bdr="rgba(155,141,245,.4)"; col=C.white; }
            const icon = picked ? (isCorrect?"✓":isWrong?"✗":null) : null;
            return (
              <button key={i} onClick={()=>pick(i)} disabled={sel!==null}
                style={{background:bg,border:"1px solid "+bdr,borderRadius:10,padding:".9rem 1rem",cursor:sel!==null?"default":"pointer",textAlign:"left",color:col,fontFamily:"'DM Sans',sans-serif",fontSize:14,lineHeight:1.5,display:"flex",alignItems:"flex-start",gap:".65rem",transition:"all .15s",width:"100%"}}>
                <span style={{fontSize:12,fontWeight:700,minWidth:20,marginTop:1,flexShrink:0,color:picked?(isCorrect?C.green:isWrong?C.red:C.dimmest):C.dimmer}}>
                  {icon || String.fromCharCode(65+i)}
                </span>
                <span>{opt}</span>
              </button>
            );
          })}
        </div>

        {sel !== null && (
          <>
            <div style={{background:sel===q.ok?"rgba(76,175,130,.07)":"rgba(224,82,82,.06)",border:"1px solid "+(sel===q.ok?"rgba(76,175,130,.25)":"rgba(224,82,82,.25)"),borderRadius:12,padding:"1rem 1.15rem",marginBottom:"1rem"}}>
              <div style={{fontSize:10,letterSpacing:".12em",textTransform:"uppercase",color:sel===q.ok?C.green:C.red,fontWeight:700,marginBottom:".4rem"}}>
                {sel===q.ok?"✓ Correct":"✗ Incorrect"}
              </div>
              <div style={{fontSize:13,color:C.dim,lineHeight:1.7,marginBottom:".65rem"}}>{q.why}</div>
              <div style={{fontSize:12,color:C.purple,fontStyle:"italic",borderTop:"1px solid "+C.border,paddingTop:".55rem"}}>💡 {q.tip}</div>
            </div>
            <button onClick={next} style={{background:C.purple,color:C.white,border:"none",borderRadius:10,padding:".8rem 1.6rem",cursor:"pointer",fontWeight:700,fontSize:14,fontFamily:"'DM Sans',sans-serif",width:"100%"}}>
              {isLast?"See Results →":"Next Question →"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ResultsScreen({ results, coachCode, prevScore, onAgain, onHome }) {
  const [saved, setSaved] = useState(false);
  const score = calcIQ(results);
  const tier = getTier(score);
  const badges = calcBadges(results, prevScore);
  const byD = {1:{ok:0,tot:0},2:{ok:0,tot:0},3:{ok:0,tot:0}};
  results.forEach(r => { byD[r.d].tot++; if(r.ok) byD[r.d].ok++; });
  const byCat = {};
  results.forEach(r => { if(!byCat[r.cat]) byCat[r.cat]={ok:0,tot:0}; byCat[r.cat].tot++; if(r.ok) byCat[r.cat].ok++; });

  useEffect(() => {
    saveResult(coachCode, results).then(() => setSaved(true));
  }, []);

  return (
    <div style={W}><div style={P}>
      <div style={{textAlign:"center",marginBottom:"2rem"}}>
        <div style={{fontSize:50,marginBottom:".5rem"}}>{tier.badge}</div>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:"1.7rem",marginBottom:".15rem"}}>{tier.label}</div>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:"4rem",color:tier.color,lineHeight:1}}>{score}%</div>
        <div style={{fontSize:13,color:C.dimmer,margin:".3rem 0 .5rem"}}>{results.filter(r=>r.ok).length}/{TOTAL} correct</div>
        {saved && <div style={{fontSize:11,color:C.green}}>✓ Results saved to team {coachCode}</div>}
      </div>

      {badges.length > 0 && (
        <Card style={{marginBottom:"1rem",background:"rgba(201,168,76,.06)",border:"1px solid rgba(201,168,76,.2)"}}>
          <div style={{fontSize:10,letterSpacing:".1em",textTransform:"uppercase",color:C.gold,marginBottom:".75rem"}}>Badges Earned</div>
          <div style={{display:"flex",gap:".6rem",flexWrap:"wrap"}}>
            {badges.map((b,i)=>(
              <div key={i} style={{background:C.dimmest,border:"1px solid "+C.border,borderRadius:10,padding:".6rem .9rem",textAlign:"center"}}>
                <div style={{fontSize:22,marginBottom:2}}>{b.icon}</div>
                <div style={{fontSize:11,fontWeight:700,color:C.white}}>{b.name}</div>
                <div style={{fontSize:10,color:C.dimmer}}>{b.desc}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card style={{marginBottom:"1rem"}}>
        <div style={{fontSize:10,letterSpacing:".1em",textTransform:"uppercase",color:C.dimmer,marginBottom:".85rem"}}>Difficulty Mix</div>
        <div style={{display:"flex",gap:".5rem"}}>
          {[1,2,3].map(d => byD[d].tot > 0 && (
            <div key={d} style={{flex:1,textAlign:"center",padding:".6rem",borderRadius:8,
              background:d===1?"rgba(76,175,130,.08)":d===2?"rgba(232,184,75,.08)":"rgba(224,82,82,.08)",
              border:"1px solid "+(d===1?"rgba(76,175,130,.2)":d===2?"rgba(232,184,75,.2)":"rgba(224,82,82,.2)")}}>
              <div style={{fontSize:13,fontWeight:700,color:d===1?C.green:d===2?C.yellow:C.red}}>{byD[d].ok}/{byD[d].tot}</div>
              <div style={{fontSize:10,color:C.dimmer,marginTop:2}}>{dLabel[d]}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card style={{marginBottom:"1.25rem"}}>
        <div style={{fontSize:10,letterSpacing:".1em",textTransform:"uppercase",color:C.dimmer,marginBottom:"1rem"}}>By Category</div>
        {Object.entries(byCat).map(([cat,v])=>{
          const pct=Math.round((v.ok/v.tot)*100);
          return (
            <div key={cat} style={{marginBottom:".85rem"}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:4}}>
                <span style={{color:C.dim}}>{cat}</span>
                <span style={{fontWeight:700,color:pct>=80?C.green:pct>=60?C.yellow:C.red}}>{v.ok}/{v.tot}</span>
              </div>
              <div style={{height:5,background:C.border,borderRadius:3,overflow:"hidden"}}>
                <div style={{height:"100%",width:pct+"%",background:pct>=80?C.green:pct>=60?C.yellow:C.red,borderRadius:3}}/>
              </div>
            </div>
          );
        })}
      </Card>

      <Btn onClick={onAgain} style={{marginBottom:".65rem"}}>Take Another Quiz →</Btn>
      <SecBtn onClick={onHome}>← Home</SecBtn>
    </div></div>
  );
}

// ── ROOT APP ─────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("start");
  const [coachCode, setCoachCode] = useState("");
  const [isRet, setIsRet] = useState(false);
  const [prevScore, setPrevScore] = useState(null);
  const [results, setResults] = useState([]);

  function startQuiz(code, ret) {
    setCoachCode(code); setIsRet(ret); setScreen("quiz");
  }

  function handleFinish(res) {
    const score = calcIQ(res);
    setResults(res);
    setPrevScore(score);
    setScreen("results");
  }

  if (screen === "start") return <StartScreen onStart={startQuiz} onCoach={()=>setScreen("coach")}/>;
  if (screen === "coach") return <CoachScreen onBack={()=>setScreen("start")}/>;
  if (screen === "quiz") return <QuizScreen coachCode={coachCode} isRet={isRet} prevScore={prevScore} onFinish={handleFinish} onBack={()=>setScreen("start")}/>;
  if (screen === "results") return <ResultsScreen results={results} coachCode={coachCode} prevScore={prevScore} onAgain={()=>setScreen("quiz")} onHome={()=>setScreen("start")}/>;
  return null;
}
