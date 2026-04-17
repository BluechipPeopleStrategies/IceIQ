export const COMPETENCY_LADDER = [
  {value:"introduced", label:"Introduced",  sub_self:"I'm learning what this is",               sub_coach:"Has been introduced — needs consistent support · ~bottom 35%",   color:"#f87171"},
  {value:"developing", label:"Developing",  sub_self:"I can do it sometimes, needs reminders",  sub_coach:"Shows progress with reminders / in practice · ~35–60%",       color:"#facc15"},
  {value:"consistent", label:"Consistent",  sub_self:"I do it reliably in practice",            sub_coach:"Reliable in practice, inconsistent in games · ~top 40%",      color:"#22c55e"},
  {value:"proficient", label:"Proficient",  sub_self:"I do it in games without thinking",       sub_coach:"Performs reliably in game situations · ~top 20%",            color:"#3b82f6"},
  {value:"advanced",   label:"Advanced",    sub_self:"I can teach this to a teammate",          sub_coach:"Standout for age — impacts and helps teammates · ~top 5%",  color:"#a855f7"},
];

export function ladderFor(n, forSelf) {
  return COMPETENCY_LADDER.slice(0, n).map(o => ({
    value: o.value, label: o.label, color: o.color,
    sub: forSelf ? o.sub_self : o.sub_coach,
  }));
}

export const RATING_SCALES = {
  "U7 / Initiation": { self:{type:"ladder", options:ladderFor(3,true)},  coach:{type:"ladder", options:ladderFor(3,false)} },
  "U9 / Novice":     { self:{type:"ladder", options:ladderFor(4,true)},  coach:{type:"ladder", options:ladderFor(4,false)} },
  "U11 / Atom":      { self:{type:"ladder", options:ladderFor(5,true)},  coach:{type:"ladder", options:ladderFor(5,false)} },
  "U13 / Peewee":    { self:{type:"ladder", options:ladderFor(5,true)},  coach:{type:"ladder", options:ladderFor(5,false)} },
  "U15 / Bantam":    { self:{type:"ladder", options:ladderFor(5,true)},  coach:{type:"ladder", options:ladderFor(5,false)} },
  "U18 / Midget":    { self:{type:"ladder", options:ladderFor(5,true)},  coach:{type:"ladder", options:ladderFor(5,false)} },
};

export function getSelfScale(level) { return RATING_SCALES[level]?.self?.options || []; }
export function getCoachScale(level) { return RATING_SCALES[level]?.coach?.options || []; }
export function getScaleColor(scale, value) { const o = scale.find(s => s.value === value); return o ? o.color : "#999"; }
export function getScaleLabel(scale, value) { const o = scale.find(s => s.value === value); return o ? o.label : "Not rated"; }
export function normalizeRating(scale, value) {
  const idx = scale.findIndex(o => o.value === value);
  if (idx < 0) return null;
  return scale.length > 1 ? idx / (scale.length - 1) : 0;
}
export function getDiscussionPrompt(skillName, selfNorm, coachNorm) {
  if (selfNorm === null || coachNorm === null) return null;
  if (selfNorm > coachNorm + 0.25) return `You rated "${skillName}" higher than your coach — ask what specific things to work on to close that gap.`;
  if (coachNorm > selfNorm + 0.25) return `Your coach sees more progress in "${skillName}" than you do — you might be better than you think! Ask for examples.`;
  return null;
}

export function migrateRatings(ratings, level) {
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

export const PERCENTILE_RATINGS = RATING_SCALES["U13 / Peewee"].coach.options;
export const PR_COLOR = Object.fromEntries(PERCENTILE_RATINGS.map(r=>[r.value,r.color]));
export const PR_LABEL = Object.fromEntries(PERCENTILE_RATINGS.map(r=>[r.value,r.label]));

export const SKILLS={
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
