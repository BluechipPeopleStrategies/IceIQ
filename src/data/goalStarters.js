// Tappable starter options for the five SMART fields, by age band and category.
//
// WHY THIS EXISTS
// SMART Goals used to hand a player five blank textareas and one placeholder
// example, and the examples were keyed by CATEGORY NAME ALONE. Cross-referenced
// against GOAL_CATS, that covered 9 of 29 (level, category) pairs: U13 had 0 of
// 6, U18 had 0 of 6, U15 had 1 of 6. A U13 player opening this screen saw
// "Write your answer here…" on all five fields, for every category. Thomas's
// finding (S2-2): there should be a few high-level options to TAP plus the
// fill-in, never only a blank box.
//
// WHY THE BANDS DIFFER (this is the whole point of the file)
// Hockey Canada plays U7 cross-ice and U9 half-ice. Those players have no blue
// line, no neutral zone, and no fixed position, so a goal written in zone words
// names a place they have never stood on and a rule their game does not have.
// Same failure the question bank hit (see bankContent.test.mjs GUARD 1 and
// GUARD 5), so this module inherits the same banned vocabulary at U7/U9 and its
// test re-checks it. U7/U9 goals are SKILLS ("get my shot off the ice"), U11+
// goals may be SYSTEMS ("hold my layer in our 1-2-2"). Checking is legal at U15,
// which is why Physical Play exists there and nowhere younger.
//
// WHY M IS DIFFERENT FROM THE OTHER FOUR
// "Measurable" is the field that fails silently. Every M option here carries
// something countable: a number, a count out of attempts, a deadline, or a rung
// on the app's own ladder. The ladder rungs are the LIVE labels from
// constants.js (Introduced / Developing / Consistent / Proficient / Advanced).
// The old inline example promised "Coach rates me 'On Track'", which is a
// retired scale value that only survives in migrateRatings()'s OLD_NORM map.
// U7 has no rating scale at all (RATING_SCALES has no U7 entry), so no U7
// option refers to a coach rating. U9 has a coach ladder but no self-rating
// (selfRating.js), so U9 M options say "my coach marks", never "I rate myself".
//
// WHAT WAS MIGRATED, AND WHAT CHANGED ON THE WAY
// The nine SMART_EXAMPLES strings from App.jsx are preserved verbatim wherever
// they were already good, and are placed at the level whose vocabulary they
// actually used, not on every level sharing the category name. Four changes:
//   1. "Coach rates me 'On Track' in skating within 4 weeks" -> "Consistent".
//      'On Track' is not a rung on the live ladder.
//   2. "By end of October" / "Before Christmas break" dropped. A hard-coded
//      month reads as stale in July; time options are relative here instead.
//   3. "Reduce missed gap assignments to 0 per game" and "Rush reads are my
//      weakest RinkReads category" dropped. Both frame the goal as fixing a
//      deficiency, and the second asserts a fact about the player we do not
//      know. Goals here reach for something.
//   4. "Gap control is the #1 D skill in atom hockey" kept, but only at U11.
//      Gap Control is also a U15 category, where "atom" is simply wrong. That
//      leak is exactly what keying examples by category name alone caused.
//
// U7 ARRIVED MID-WRITE. GOAL_CATS had no U7 key when this file was started, so
// the band was written speculatively as Skating / Puck Control / Shooting /
// Teamwork; App.jsx gained ["Skating","Puck Control","Passing","Teamwork"]
// while it was in progress and the band was re-cut to match exactly. The U7
// Shooting set is not lost, it is just not a category:
//   S "Shoot the puck without stopping it first" / "Get my shot up off the ice"
//     / "Shoot at the corners of the net, not the middle"
//   M "Score 5 out of 10 shots at practice" / "Get 8 of 10 shots up off the ice"
//     / "Hit the net 7 times out of 10 tries"
//   R "Shots off the ice are harder for a goalie to stop" / "Shooting quicker
//     means the goalie has less time" / "Hitting the net gives my team a chance
//     to score"
// Paste it back in if Shooting is ever added to the U7 row. The parity test
// requires this module's category list to match GOAL_CATS exactly, so a fifth
// unused category here would fail rather than quietly change the tab strip.

import { ageGroupOf } from "./ratingCopy.js";

export { ageGroupOf };

export const SMART_FIELDS = ["S", "M", "A", "R", "T"];

// Chip cap. 64 characters is roughly two lines of a tappable chip at the
// screen's 560px max width and 14px body font, and the longest string we
// inherited from SMART_EXAMPLES was 57. Anything longer stops being a chip and
// starts being a paragraph the player has to read instead of tap.
export const MAX_CHIP_CHARS = 64;

// ─────────────────────────────────────────────────────────────────────────────
// U7 / Initiation — cross-ice, ages 5-6.
// No zones, no lines, no positions, no coach rating scale. Snowplow stops,
// getting up fast, keeping the puck close. Counted in reps at practice.
// ─────────────────────────────────────────────────────────────────────────────
const U7_CATEGORIES = {
  "Skating": {
    S: [
      "Get up fast every time I fall down",
      "Skate all the way across the ice without stopping",
      "Do a snowplow stop when the whistle goes",
    ],
    M: [
      "Do 10 snowplow stops in a row at practice",
      "Get up in 3 seconds every time for one practice",
      "Skate across the ice 5 times without falling",
    ],
    R: [
      "Skating fast means I get to the puck more",
      "Good stops let me change direction quicker",
      "When I get up fast I get back in the play",
    ],
  },
  "Puck Control": {
    S: [
      "Keep the puck close to my stick while I skate",
      "Look up while I stickhandle instead of at the puck",
      "Move the puck side to side with soft hands",
    ],
    M: [
      "Skate across the ice with the puck 5 times",
      "Stickhandle 20 times in a row looking up",
      "Keep the puck for a whole shift 3 practices in a row",
    ],
    R: [
      "Keeping the puck close means I can make more plays",
      "Looking up helps me see my teammates",
      "Soft hands help me skate around another player",
    ],
  },
  "Passing": {
    S: [
      "Pass the puck flat along the ice",
      "Look up and find my teammate before I pass",
      "Stop the puck with my stick when it comes to me",
    ],
    M: [
      "Land 8 of 10 passes to a teammate at practice",
      "Catch 10 passes in a row without missing one",
      "Make 3 good passes every game",
    ],
    R: [
      "A flat pass is easier for my teammate to catch",
      "Passing moves the puck faster than skating does",
      "Catching a pass means our play keeps going",
    ],
  },
  "Teamwork": {
    S: [
      "Take my turn and share the puck",
      "Cheer for my teammates on the bench",
      "Listen the first time my coach talks",
    ],
    M: [
      "Make 3 passes to a teammate every game",
      "Be first on the ice for 4 practices in a row",
      "Say one good thing to a teammate every shift",
    ],
    R: [
      "Hockey is more fun when my whole team is having fun",
      "Passing gets the puck up the ice faster than skating",
      "Being ready means I do not miss what coach says",
    ],
  },
};

const U7_DEFAULTS = {
  S: [
    "Pick one thing my coach said to work on",
    "Work on the part of this I want to be best at",
  ],
  M: [
    "Do it right 8 times out of 10 at practice",
    "Practise it at 3 practices in a row",
  ],
  A: [
    "I have already tried this at practice",
    "My coach showed us how to do this",
    "I can do a bit of it already",
  ],
  R: [
    "Getting better at this makes the game more fun",
    "This helps my team when I get it right",
  ],
  T: [
    "By the end of the month",
    "In 4 weeks",
    "By the end of the season",
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// U9 / Novice — half-ice, ages 7-8.
// Still no zone or line words. Positions are loose, so "my check" and "our net"
// do the work that "defensive zone" would do later. Coach ladder exists (four
// rungs), self-rating does not, so M can cite what the COACH marks.
// Skill names quoted in M options are the real ones from constants.js SKILLS.
// ─────────────────────────────────────────────────────────────────────────────
const U9_CATEGORIES = {
  "Skating": {
    S: [
      "Do crossovers on both my strong and weak side",
      "Skate backward without looking down at my feet",
      "Hockey stop on both sides, not just my good side",
    ],
    M: [
      "Do 10 clean crossovers each way at practice",
      "My coach marks Backward Skating as Consistent",
      "Stop on my weak side 8 times out of 10",
    ],
    R: [
      "Crossovers help me build speed in the turns",
      "Backward skating helps me stay with the puck",
      "Stopping both ways lets me change direction fast",
    ],
  },
  "Passing": {
    S: [
      "Put my passes flat on the ice every time",
      "Catch a pass and keep skating with it",
      "Look up and find a teammate before I pass",
    ],
    M: [
      "Land 8 of 10 flat passes in a practice drill",
      "Catch 10 passes in a row without losing one",
      "My coach marks Receiving Passes as Consistent",
    ],
    R: [
      "A flat pass is way easier for a teammate to catch",
      "Catching cleanly means I keep our play going",
      "Looking up first helps me find the open teammate",
    ],
  },
  "Shooting": {
    S: [
      "Get my wrist shot up off the ice every time",
      "Shoot without stopping the puck first",
      "Pick a corner before I shoot",
    ],
    M: [
      // Preserved verbatim from the old SMART_EXAMPLES table.
      "Hit top corners 3 out of 5 in practice drills",
      "Get 8 of 10 wrist shots up off the ice",
      "My coach marks Wrist Shot as Consistent",
    ],
    R: [
      "A quick shot gives the goalie less time to set",
      "Shots off the ice are harder to stop",
      "Picking a corner is how shots turn into goals",
    ],
  },
  "Defense": {
    S: [
      "Skate back to help as soon as we lose the puck",
      "Keep my stick on the ice to take away a pass",
      "Stay between my check and our net",
    ],
    M: [
      "Beat my check back to our net 4 times a game",
      "My coach marks Transition Awareness as Consistent",
      "Take away 3 passes a game with my stick down",
    ],
    R: [
      "Getting back fast gives our goalie help",
      "A stick on the ice takes away the easy pass",
      "Staying between them and the net is hard to beat",
    ],
  },
  "Game IQ": {
    S: [
      "Find open ice instead of chasing the puck",
      "Know where the puck is before it comes to me",
      "Decide to pass or shoot before I get the puck",
    ],
    M: [
      "Score 70% or better on Hockey Sense in RinkReads",
      "My coach marks Space Awareness as Consistent",
      "Ask my coach for 1 read to work on each week",
    ],
    R: [
      "Open ice means my teammate has somewhere to pass",
      "Knowing where the puck is helps me get there first",
      "Deciding early means I do not get stuck with it",
    ],
  },
};

const U9_DEFAULTS = {
  S: [
    "Pick one thing my coach said to work on",
    "Work on the part of this I want to be best at",
  ],
  M: [
    "Do it right 8 times out of 10 at practice",
    "My coach marks this skill as Consistent",
  ],
  A: [
    "I can already do this some of the time",
    "My coach has shown me how at practice",
    "I have done it before, just not every time",
  ],
  R: [
    "Getting better at this makes the game more fun",
    "This helps my team when I get it right",
  ],
  T: [
    "By the end of the month",
    "In 6 weeks",
    "By the end of the season",
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// U11 / Atom — first full-ice band, so zone and line words are finally real.
// First band that self-rates (selfRating.js), and the band the old inline
// examples were unknowingly written for. Those strings live here.
// ─────────────────────────────────────────────────────────────────────────────
const U11_CATEGORIES = {
  "Skating": {
    // S / A / R preserved verbatim from the old SMART_EXAMPLES table.
    S: [
      "Improve my backward crossovers on both sides",
      "Win the first three strides out of every turn",
      "Tighten my turns so I keep my speed through them",
    ],
    M: [
      "Coach rates my skating Consistent within 4 weeks",
      "Do 20 backward crossovers each way without a stumble",
      "Beat my check to 5 loose pucks in a game",
    ],
    A: [
      "I can already do basic crossovers",
      "My coach has worked on it with me",
    ],
    R: [
      "Better backward skating helps my gap control as a defender",
      "Speed out of turns gets me to pucks first",
      "Skating is the skill every other skill sits on",
    ],
  },
  "Puck Protection": {
    S: [
      "Keep my body between the defender and the puck",
      "Protect the puck on my backhand along the boards",
      "Take one look over my shoulder before I turn",
    ],
    M: [
      "Win 6 of 10 board battles in a practice drill",
      "Coach rates my puck protection Consistent in 4 weeks",
      "Come out of 8 of 10 battles still holding the puck",
    ],
    R: [
      "Holding the puck an extra second creates a play",
      "Protecting the puck keeps our team on offence",
      "Strong on the puck means I can play anywhere",
    ],
  },
  "Gap Control": {
    // S and R preserved verbatim; "#1 D skill in atom hockey" is accurate here
    // and only here.
    S: [
      "Maintain a 10-foot gap on all rush situations",
      "Keep my feet moving backward as they come at me",
      "Angle the puck carrier toward the boards",
    ],
    M: [
      "Hold a tight gap on 10 rushes in a row",
      "Coach rates my gap control Consistent in 4 weeks",
      "Stand up 8 of 10 rushes at the blue line",
    ],
    A: [
      "I understand gap theory already",
      "My coach has worked on it with me",
    ],
    R: [
      "Gap control is the #1 D skill in atom hockey",
      "A tight gap gives the puck carrier no room",
      "Good gaps keep the rush out of our end",
    ],
  },
  "Rush Reads": {
    // S / M / A preserved verbatim.
    S: [
      "Make the correct 2-on-1 decision every time",
      "Take away the pass and let my goalie take the shot",
      "Read the rush before I get to the blue line",
    ],
    M: [
      "Score 80%+ on Rush Reads in RinkReads",
      "Coach rates my rush reads Consistent in 6 weeks",
      "Make the right read on 8 of 10 odd-man rushes",
    ],
    A: [
      "I get the concept, just need reps",
      "My coach has worked on it with me",
    ],
    R: [
      "Reading the rush early turns defence into offence",
      "Right reads mean fewer scrambles in our end",
      "Good reads make my whole line faster",
    ],
  },
  "Special Teams": {
    S: [
      "Get my stick in the passing lane on the penalty kill",
      "Get to the net front on our power play",
      "Keep the power play moving with quick puck touches",
    ],
    M: [
      "Kill 8 of 10 penalties I am on the ice for",
      "Coach rates my penalty killing Consistent in 6 weeks",
      "Get 3 pucks to the net on the power play each game",
    ],
    R: [
      "Special teams often decide who wins the game",
      "Killing a penalty gets my team momentum back",
      "Power play time is where I get to create",
    ],
  },
  "Game IQ": {
    // S / M / A / R preserved verbatim. "Hockey Sense" is the real top comp
    // tier label for U11 in App.jsx COMP.
    S: [
      "Pre-read plays before the puck arrives",
      "Check my shoulders before the puck gets to me",
      "Support the puck instead of watching it",
    ],
    M: [
      "RinkReads score improves from current to Hockey Sense tier",
      "Score 80% or better on Hockey Sense in RinkReads",
      "Coach rates my reading of the play Consistent in 6 weeks",
    ],
    A: [
      "I've started thinking about it more already",
      "My coach has worked on it with me",
    ],
    R: [
      "Faster reads = better plays",
      "Seeing it early means I have more time with it",
      "Good reads let me play faster than my feet",
    ],
  },
};

const U11_DEFAULTS = {
  S: [
    "Pick one habit in this area and lock it in",
    "Work on the part of this that shows up in games",
  ],
  M: [
    "Do it right on 8 of 10 reps in practice",
    "Coach rates this Consistent within 6 weeks",
  ],
  A: [
    "I can already do parts of this",
    "My coach has worked on it with me",
    "This is the next step from what I do now",
  ],
  R: [
    "This is the area I can move most this season",
    "Getting this right helps my whole line",
  ],
  T: [
    "By the end of next month",
    "In 6 weeks",
    "By the end of the season",
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// U13 / Peewee — full ice, real systems language, still NO body checking
// (Hockey Canada removed it from Peewee in 2013). Nothing here asks a U13 to
// finish a check. Battles, boxing out and body position are the physical words
// this band gets.
// ─────────────────────────────────────────────────────────────────────────────
const U13_CATEGORIES = {
  "Edge Work": {
    S: [
      "Hold an inside edge through the whole turn",
      "Use tight turns to escape pressure on the wall",
      "Do mohawk turns on both sides at full speed",
    ],
    M: [
      "Coach rates my edge work Consistent in 6 weeks",
      "Do 10 clean tight turns each way in a practice",
      "Escape pressure with a tight turn 5 times a game",
    ],
    R: [
      "Edges are what let me change direction at speed",
      "Better edges buy me an extra second with the puck",
      "Strong edges keep me balanced through contact",
    ],
  },
  "Shot Selection": {
    S: [
      "Get my shot off quicker from the slot",
      "Take the shot that is there instead of forcing one",
      "Shoot for a rebound when the goalie is set",
    ],
    M: [
      "Get 3 shots on net from the slot each game",
      "Coach rates my shot selection Consistent in 6 weeks",
      "Get 8 of 10 shots through in a practice drill",
    ],
    R: [
      "The right shot at the right time beats a hard one",
      "Shots through traffic create rebounds for my line",
      "A quick release catches the goalie before they set",
    ],
  },
  "Defensive Zone": {
    S: [
      "Win the net-front battle on every shot",
      "Support my defence partner low in our zone",
      "Box out instead of chasing the puck carrier",
    ],
    M: [
      "Coach rates my zone coverage Consistent in 6 weeks",
      "Win 8 of 10 net-front battles in a practice drill",
      "Clear the front of our net 5 times a game",
    ],
    R: [
      "Winning the net front is how we end their shifts",
      "Clean coverage gets us out of our end quicker",
      "My goalie needs to see the puck to stop it",
    ],
  },
  "Zone Entry": {
    S: [
      "Attack the blue line with speed instead of slowing",
      "Use a delay to wait for my late support",
      "Enter wide and drive the defender back",
    ],
    M: [
      "Make a clean entry on 7 of 10 tries in a game",
      "Coach rates my zone entries Consistent in 6 weeks",
      "Carry the puck in with control 5 times a game",
    ],
    R: [
      "A clean entry keeps our line in their end longer",
      "Speed at the line makes the defence back off",
      "Good entries are how a rush turns into a chance",
    ],
  },
  "Special Teams": {
    S: [
      "Get in the shooting lane on the penalty kill",
      "Win my faceoff on the power play draw",
      "Get to the net front and hold my ground",
    ],
    M: [
      "Coach rates my penalty killing Consistent in 6 weeks",
      "Block or deflect 3 shots a game on the kill",
      "Get 4 pucks to the net on the power play each game",
    ],
    R: [
      "Special teams swing more games than even strength",
      "A big kill gives my whole bench a lift",
      "Power play reps are where I learn to make plays",
    ],
  },
  "Leadership": {
    S: [
      "Say something positive after a teammate's mistake",
      "Be the first one over the boards every shift",
      "Ask my coach one question after each game",
    ],
    M: [
      "Talk to 3 teammates on the bench every period",
      "Be first on the ice for 8 practices in a row",
      "Ask my coach 1 question after every game this month",
    ],
    R: [
      "A team plays better when someone lifts it up",
      "Leaders get trusted with the big minutes",
      "How I act after a mistake sets the tone",
    ],
  },
};

const U13_DEFAULTS = {
  S: [
    "Pick one habit in this area and lock it in",
    "Work on the part of this that shows up in games",
  ],
  M: [
    "Do it right on 8 of 10 reps in practice",
    "Coach rates this Consistent within 6 weeks",
  ],
  A: [
    "I can already do parts of this",
    "My coach has worked on this with me",
    "This is the next step from where I am now",
  ],
  R: [
    "This is the area I can move most this season",
    "Getting this right helps my whole line",
  ],
  T: [
    "By the end of next month",
    "In 6 weeks",
    "Before playoffs start",
    "By the end of the season",
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// U15 / Bantam — first band where body checking is legal in Canada, which is
// why Physical Play exists here and nowhere younger. Every physical option is
// written to a legal, coachable standard: angling, body position, taking the
// body cleanly. Nothing here says "on the numbers" or anything else that
// describes a hit from behind.
// ─────────────────────────────────────────────────────────────────────────────
const U15_CATEGORIES = {
  "Systems Play": {
    S: [
      "Know my job on the forecheck without being told",
      "Hold my layer through the neutral zone",
      "Rotate properly in our defensive zone coverage",
    ],
    M: [
      "Coach rates my systems play Consistent in 8 weeks",
      "Make the right system read on 8 of 10 shifts",
      "Review 1 shift on video with my coach each week",
    ],
    R: [
      "A system works when all five of us read it the same",
      "Knowing the system lets me play fast, not think",
      "Coaches trust players who are where they belong",
    ],
  },
  "Transition": {
    S: [
      "Turn a defensive stop into offence in one pass",
      "Get my head up the second I gain the puck",
      "Beat the other team back through the neutral zone",
    ],
    M: [
      "Start 3 clean transitions up ice each game",
      "Coach rates my transition speed Consistent in 8 weeks",
      "React within one second on 8 of 10 turnovers",
    ],
    R: [
      "Transition is where most goals actually start",
      "The first pass out decides how the shift goes",
      "Speed in transition catches them changing",
    ],
  },
  "Special Teams": {
    S: [
      "Attack the puck carrier hard on the penalty kill",
      "Win the wall battles on our power play entries",
      "Get into the seam for one-timers on the half wall",
    ],
    M: [
      "Coach rates my special teams Consistent in 8 weeks",
      "Get 5 pucks to the net a game on the power play",
      "Break up 3 entries a game on the penalty kill",
    ],
    R: [
      "Special teams minutes are earned, not given",
      "A kill can change the momentum of a whole game",
      "Power play time is where scorers get noticed",
    ],
  },
  "Physical Play": {
    S: [
      "Angle the puck carrier off instead of lunging",
      "Take the body cleanly, never from behind",
      "Use my body to seal the wall and win pucks",
      "Win body position in front of our net",
    ],
    M: [
      "Win 7 of 10 board battles in a practice drill",
      "Coach rates my body position Consistent in 8 weeks",
      "Play 4 straight games clean of hitting penalties",
    ],
    R: [
      "Winning body position wins the puck back",
      "Clean, hard hockey is what coaches trust",
      "Angling keeps me in control and out of the box",
    ],
  },
  "Gap Control": {
    S: [
      "Kill their speed by closing my gap early",
      "Keep my feet moving instead of reaching",
      "Stand up the rush before it reaches our blue line",
    ],
    M: [
      "Coach rates my gap control Consistent in 8 weeks",
      "Stand up 8 of 10 rushes at our blue line",
      "Force 3 dump-ins a game with a tight gap",
    ],
    R: [
      "A tight gap takes away their time to make a play",
      "Good gaps mean fewer odd-man rushes against us",
      "Gap control is what separates D at this level",
    ],
  },
  "Leadership": {
    S: [
      "Set the tone on the first shift of every period",
      "Pick up a teammate right after a bad shift",
      "Bring the same energy to practice as to games",
    ],
    M: [
      "Lead a warmup drill 4 times this month",
      "Check in with one teammate after every game",
      "Coach rates my leadership Consistent in 8 weeks",
    ],
    R: [
      "The room follows whoever works hardest in it",
      "Leadership is why coaches give out big minutes",
      "Teams go as far as their leaders take them",
    ],
  },
};

const U15_DEFAULTS = {
  S: [
    "Pick one habit in this area and lock it in",
    "Work on the part of this that shows up in games",
  ],
  M: [
    "Do it right on 8 of 10 reps in practice",
    "Coach rates this Consistent within 8 weeks",
  ],
  A: [
    "I already do parts of this in practice",
    "My coach has given me feedback on this",
    "This is the next level up from where I am",
  ],
  R: [
    "This is the area I can move most this season",
    "Getting this right helps my whole line",
  ],
  T: [
    "By the end of next month",
    "In 8 weeks",
    "Before playoffs start",
    "By the end of the season",
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// U18 / Midget — full tactical vocabulary, video review is normal, and the
// ladder rung worth chasing is Proficient rather than Consistent. Options lean
// on game state (score, clock, scheme) because that is what actually separates
// players who already have the skills.
// ─────────────────────────────────────────────────────────────────────────────
const U18_CATEGORIES = {
  "Game Management": {
    S: [
      "Play to the score and the clock, not just instinct",
      "Manage the puck with a lead late in the third",
      "Change on the fly at the right moment every shift",
    ],
    M: [
      "Keep my shifts under 45 seconds for a full game",
      "Coach rates my game management Proficient in 8 weeks",
      "Review 2 late-game shifts on video each month",
    ],
    R: [
      "Games are won in the last five minutes",
      "Smart puck management keeps leads intact",
      "Short shifts keep my whole line fresh",
    ],
  },
  "Advanced Tactics": {
    S: [
      "Read their defensive scheme in the first period",
      "Attack the weak side once their coverage shifts",
      "Adjust my route when the forecheck changes",
    ],
    M: [
      "Name their system correctly in 3 straight games",
      "Coach rates my tactical reads Proficient in 8 weeks",
      "Review 1 opponent system on video every week",
    ],
    R: [
      "Reading their system is how I find the open ice",
      "Tactics are the edge when everyone is skilled",
      "Coaches notice players who solve the game",
    ],
  },
  "Special Teams": {
    S: [
      "Own the bumper spot on our power play",
      "Take away the seam pass on the penalty kill",
      "Win the retrieval after every failed entry",
    ],
    M: [
      "Coach rates my special teams Proficient in 8 weeks",
      "Break up 4 entries a game on the penalty kill",
      "Get 6 pucks to the net a game on the power play",
    ],
    R: [
      "Special teams decide close games at this level",
      "Power play minutes are where points come from",
      "Penalty killers get trusted in every big moment",
    ],
  },
  "Neutral Zone Play": {
    S: [
      "Support the puck through the middle every rush",
      "Time my route so I hit the line with speed",
      "Hold my layer in our neutral zone forecheck",
    ],
    M: [
      "Coach rates my neutral zone play Proficient in 8 weeks",
      "Force 5 turnovers in the neutral zone each game",
      "Hit the blue line with speed on 8 of 10 rushes",
    ],
    R: [
      "The neutral zone decides who gets to attack",
      "Winning the middle means fewer rushes against us",
      "Clean neutral zone play makes entries easy",
    ],
  },
  "Breakouts": {
    S: [
      "Make the first pass crisp and on the tape",
      "Present a good target on the wall every breakout",
      "Beat the forecheck with one touch under pressure",
    ],
    M: [
      "Complete 9 of 10 first passes in a game",
      "Coach rates my breakouts Proficient in 8 weeks",
      "Exit our zone cleanly on 8 of 10 attempts",
    ],
    R: [
      "A clean breakout is where every rush starts",
      "One good first pass beats three chip-outs",
      "Breakouts under pressure are what scouts watch",
    ],
  },
  "Leadership": {
    S: [
      "Hold the standard of the room at every practice",
      "Mentor one younger player through the season",
      "Own my mistakes out loud so others can too",
    ],
    M: [
      "Check in with 2 teammates after every game",
      "Lead 4 team warmups this month",
      "Coach rates my leadership Proficient in 8 weeks",
    ],
    R: [
      "Teams take on the habits of their older players",
      "Leadership is the part of my game that travels",
      "Coaches at the next level ask about character",
    ],
  },
};

const U18_DEFAULTS = {
  S: [
    "Pick one habit in this area and lock it in",
    "Work on the part of this that shows up in games",
  ],
  M: [
    "Do it right on 8 of 10 reps in practice",
    "Coach rates this Proficient within 8 weeks",
  ],
  A: [
    "I already do parts of this in games",
    "My coach and I have talked about this",
    "This is the next level up from where I am",
  ],
  R: [
    "This is the area I can move most this season",
    "Getting this right helps my whole line",
  ],
  T: [
    "By the end of next month",
    "In 8 weeks",
    "Before playoffs start",
    "By the end of the season",
  ],
};

// Keyed by the number in "U11", exactly like ratingCopy.js BANDS, so a level
// string ("U11 / Atom"), a bare age group ("U11"), or a renamed division label
// all resolve the same way.
const BANDS = {
  7:  { categories: U7_CATEGORIES,  defaults: U7_DEFAULTS },
  9:  { categories: U9_CATEGORIES,  defaults: U9_DEFAULTS },
  11: { categories: U11_CATEGORIES, defaults: U11_DEFAULTS },
  13: { categories: U13_CATEGORIES, defaults: U13_DEFAULTS },
  15: { categories: U15_CATEGORIES, defaults: U15_DEFAULTS },
  18: { categories: U18_CATEGORIES, defaults: U18_DEFAULTS },
};

// The level strings this module knows, in LEVELS order. Kept here so the goal
// screen can eventually read categories from one place instead of the inline
// GOAL_CATS table in App.jsx.
const LEVEL_LABELS = {
  7:  "U7 / Initiation",
  9:  "U9 / Novice",
  11: "U11 / Atom",
  13: "U13 / Peewee",
  15: "U15 / Bantam",
  18: "U18 / Midget",
};

/**
 * Goal categories per level, derived from the tables above so the two can never
 * drift. Same shape and (for the five levels App.jsx already ships) the same
 * contents and order as GOAL_CATS, plus the U7 set GOAL_CATS is missing.
 */
export const GOAL_CATEGORIES = Object.fromEntries(
  Object.entries(BANDS).map(([n, band]) => [LEVEL_LABELS[n], Object.keys(band.categories)])
);

function bandOf(level) {
  const group = ageGroupOf(level);
  if (!group) return null;
  return BANDS[Number(group.slice(1))] || null;
}

// Category keys are matched loosely so a rename in App.jsx that only changes
// case or spacing ("Game IQ" -> "Game I.Q.") degrades to the band default
// rather than to nothing, and a straight case change keeps working.
const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "");

function categoryOf(band, category) {
  if (!band) return null;
  const table = band.categories;
  if (Object.prototype.hasOwnProperty.call(table, category)) return table[category];
  const want = norm(category);
  if (!want) return null;
  const hit = Object.keys(table).find((k) => norm(k) === want);
  return hit ? table[hit] : null;
}

/**
 * 2-4 short, tappable starter options for one SMART field.
 *
 * Falls back to the band's generic set when a category is unknown, so a new
 * category added to GOAL_CATS shows sensible chips on day one instead of the
 * blank box this module exists to remove. Returns [] only when the level or the
 * field cannot be understood at all.
 *
 * @param {string} level    e.g. "U13 / Peewee" (or just "U13")
 * @param {string} category e.g. "Zone Entry"
 * @param {"S"|"M"|"A"|"R"|"T"} field
 * @returns {string[]}
 */
export function starterOptionsFor(level, category, field) {
  const f = String(field || "").trim().toUpperCase();
  if (!SMART_FIELDS.includes(f)) return [];
  const band = bandOf(level);
  if (!band) return [];
  const cat = categoryOf(band, category);
  const fromCat = cat && cat[f];
  if (fromCat && fromCat.length) return fromCat.slice();
  const fromBand = band.defaults[f];
  return fromBand && fromBand.length ? fromBand.slice() : [];
}

/**
 * Where the options for a field come from: "category" (written for this exact
 * level and category), "band" (the level's generic fallback), or null.
 * The coverage test asserts S, M and R are "category" for every real pair, so
 * band fallbacks can never quietly stand in for missing content.
 */
export function starterSourceFor(level, category, field) {
  const f = String(field || "").trim().toUpperCase();
  if (!SMART_FIELDS.includes(f)) return null;
  const band = bandOf(level);
  if (!band) return null;
  const cat = categoryOf(band, category);
  if (cat && cat[f] && cat[f].length) return "category";
  if (band.defaults[f] && band.defaults[f].length) return "band";
  return null;
}

/** True when this exact (level, category) pair has its own written content. */
export function hasSpecificStarters(level, category) {
  return categoryOf(bandOf(level), category) != null;
}

/**
 * The old SMART_EXAMPLES row for a category: one example string per field.
 * Takes the first (best) starter for each field, so deleting the inline
 * SMART_EXAMPLES table in App.jsx costs nothing. Unlike that table, this is
 * keyed by level as well as category, which is what stopped U13 and U18 from
 * getting any placeholder at all.
 */
export function exampleFor(level, category) {
  const out = {};
  for (const f of SMART_FIELDS) {
    const opts = starterOptionsFor(level, category, f);
    if (opts.length) out[f] = opts[0];
  }
  return out;
}
