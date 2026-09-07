#!/usr/bin/env node
// Seed 8 "select all that apply" multi-select questions for U15 / U18.
// Idempotent — skips ids already in the bank.

import fs from "node:fs";
import path from "node:path";

const BANK = path.resolve("src/data/questions.json");
const APPLY = process.argv.includes("--apply");

const SEEDS = {
  "U13 / Peewee": [
    {
      id: "u13_multi01",
      type: "multi",
      cat: "Forechecking",
      d: 3,
      sit: "You're the first forward in on the forecheck. The opposing defenseman just picked up the puck behind their net.",
      q: "Which of these are GOOD reads for F1?",
      opts: [
        "Take an angle that pushes the puck-carrier to one side",
        "Skate straight at them down the middle of the ice",
        "Keep your stick on the ice in the lane to the other defenseman",
        "Communicate which side you're forcing so your linemates know",
      ],
      correct: [0, 2, 3],
      tip: "F1 forces a side — never charge straight at the puck.",
      why: "Charging straight gives the puck-carrier both sides of the ice. Angling, taking the D-to-D pass with your stick, and calling your side are F1's three jobs.",
      levels: ["U13 / Peewee", "U15 / Bantam"],
    },
    {
      id: "u13_multi02",
      type: "multi",
      cat: "Puck Support",
      d: 3,
      sit: "Your teammate has the puck along the boards in the offensive zone, and a defender is closing in fast.",
      q: "Which of these are good support options for YOU as the closest forward?",
      opts: [
        "Stand still and yell for the puck",
        "Skate to a soft area where your teammate can pass to you",
        "Keep your stick on the ice as a target",
        "Make eye contact and call for it once you're open",
      ],
      correct: [1, 2, 3],
      tip: "Good support is moving + reachable + audible.",
      why: "Standing still makes you easy to cover. Moving to space, showing your blade, and a quick call — that's how you become an outlet.",
      levels: ["U13 / Peewee", "U15 / Bantam"],
    },
    {
      id: "u13_multi03",
      type: "multi",
      cat: "Defense",
      d: 2,
      sit: "An attacker is carrying the puck up your weak side as you skate backward.",
      q: "Which of these are part of good 1-on-1 defense?",
      opts: [
        "Match their speed so the gap stays the same",
        "Keep your stick on the ice in the puck-side lane",
        "Look at their feet so they can't fake you out",
        "Keep your hips squared so you can pivot either way",
      ],
      correct: [0, 1, 3],
      tip: "Watch the chest, not the feet — feet lie, the chest goes where they're going.",
      why: "Watching the feet is how you get burned by a fake. Speed match, stick in the lane, and squared hips are the fundamentals.",
      levels: ["U13 / Peewee", "U15 / Bantam"],
    },
    {
      id: "u13_multi04",
      type: "multi",
      cat: "Offensive Zone",
      d: 2,
      sit: "You and your linemate are setting up a cycle in the offensive zone. The puck is on the half-wall.",
      q: "Which of these are good cycle options?",
      opts: [
        "Pass back to the defenseman at the point",
        "Throw a blind backhand to the slot hoping someone's there",
        "Keep moving — find soft ice for the next pass",
        "Bump it down low to a teammate behind the net",
      ],
      correct: [0, 2, 3],
      tip: "Cycle = puck movement + skater movement. Blind passes kill possessions.",
      why: "Throwing it blind into the slot is how you get a turnover. Point, low D, and finding soft ice are all designed cycle reads.",
      levels: ["U13 / Peewee", "U15 / Bantam"],
    },
  ],
  "U15 / Bantam": [
    {
      id: "u15_multi01",
      type: "multi",
      cat: "Defense",
      d: 3,
      sit: "You're a defenseman, and the opposing forward is carrying the puck wide on your weak side along the boards.",
      q: "Which of these reads ALL apply to good gap control here?",
      opts: [
        "Match the attacker's speed so the gap stays the same as they cross the blue line",
        "Open your hips toward the boards so you can pivot if they cut inside",
        "Skate backward in a straight line at full speed regardless of the puck",
        "Keep your stick on the ice in their puck-side passing lane",
      ],
      correct: [0, 1, 3],
      tip: "Gap control is about matching speed AND keeping the inside route closed.",
      why: "Skating full speed backward without reading the puck takes you out of position. The other three are all part of holding a tight, smart gap.",
      levels: ["U15 / Bantam", "U18 / Midget"],
    },
    {
      id: "u15_multi02",
      type: "multi",
      cat: "Breakouts",
      d: 3,
      sit: "Your D-partner just retrieved the puck behind your net and is starting a breakout up the strong-side wall.",
      q: "Which of these are YOUR responsibilities as the other defenseman?",
      opts: [
        "Skate to the slot to be a high screen for the goalie",
        "Provide a low support option behind the net or across to the weak side",
        "Read pressure — if F1 forechecks hard, be ready for a reverse",
        "Communicate with a clear call so your partner knows where you are",
      ],
      correct: [1, 2, 3],
      tip: "On a wall breakout you're the safety valve, not the goalie's screen.",
      why: "Going to the slot puts you in the wrong place AND screens your own goalie. Low support, reading pressure, and clear calls are the D-partner's job on a wall breakout.",
      levels: ["U15 / Bantam", "U18 / Midget"],
    },
    {
      id: "u15_multi03",
      type: "multi",
      cat: "Forechecking",
      d: 3,
      sit: "You're F1 in a 1-2-2 forecheck. The opposing D retrieves the puck behind their net.",
      q: "Which of these are correct F1 reads?",
      opts: [
        "Take an angle that forces the puck to one side of the rink",
        "Charge straight at the puck-carrier from the middle of the ice",
        "Stick on the ice to take away the D-to-D pass",
        "Communicate which side you're forcing to F2 and F3",
      ],
      correct: [0, 2, 3],
      tip: "F1's job is to FORCE a side — never charge straight at the middle.",
      why: "Charging straight at the carrier opens both sides of the ice and lets them go either way. Angling, stick-on-ice, and clear calls let F2 and F3 set the trap.",
      levels: ["U15 / Bantam", "U18 / Midget"],
    },
    {
      id: "u15_multi04",
      type: "multi",
      cat: "Defensive Zone",
      d: 3,
      sit: "Your team is defending a 5-on-5 in your own zone. The puck cycles to the half-wall on your side.",
      q: "Which of these are correct reads if you're the strong-side D?",
      opts: [
        "Stay at the net front to protect the slot",
        "Pressure the puck-carrier on the half-wall hard",
        "Stay tight to the carrier — close the time and space without overcommitting",
        "Keep your stick in the passing lane to the slot",
      ],
      correct: [2, 3],
      tip: "Strong-side D pressures the wall — the F (winger) does NOT leave the net front.",
      why: "Charging hard at the wall leaves the slot open. Standing flat-footed at the net front while the wall is uncontested is the strong-side wing's job, not yours. Smart pressure plus a stick in the lane closes the play.",
      levels: ["U15 / Bantam", "U18 / Midget"],
    },
  ],
  "U18 / Midget": [
    {
      id: "u18_multi01",
      type: "multi",
      cat: "Power Play",
      d: 3,
      sit: "You're on the power play running a 1-3-1. The puck is at the half-wall on your strong side.",
      q: "Which options are GOOD looks for the half-wall player?",
      opts: [
        "One-touch pass to the bumper in the high slot",
        "Pass cross-ice to the weak-side flank for a one-timer",
        "Hard backhand pass to the point",
        "Force a low-percentage shot through three sticks",
      ],
      correct: [0, 1, 2],
      tip: "The 1-3-1 lives off three options — bumper, weak-side, and point. Forcing a contested shot kills a power-play possession.",
      why: "Half-wall has three release valves built into the formation. Forcing a shot through traffic gives the puck back. The first three are all designed reads.",
      levels: ["U18 / Midget"],
    },
    {
      id: "u18_multi02",
      type: "multi",
      cat: "Penalty Kill",
      d: 3,
      sit: "You're killing a penalty in a passive box. The other team has the puck at the point.",
      q: "Which of these are correct PK reads?",
      opts: [
        "Allow the point shot if the lane is clean — block it with your body if you can",
        "Both forwards charge the points hard and chase the puck",
        "Keep sticks in passing lanes to take away cross-ice seams",
        "Box collapses when the puck goes below the goal line",
      ],
      correct: [0, 2, 3],
      tip: "A passive box concedes the perimeter shot and protects the middle.",
      why: "Charging both points opens the slot and leaves the box broken. Passive box logic: take away the middle, allow low-percentage looks, collapse below the dots.",
      levels: ["U18 / Midget"],
    },
    {
      id: "u18_multi03",
      type: "multi",
      cat: "Transition",
      d: 3,
      sit: "Your team just won a defensive-zone faceoff cleanly back to your D-partner.",
      q: "Which of these are good first-pass options for the D?",
      opts: [
        "Quick D-to-D pass to swing the puck away from pressure",
        "Tape-to-tape outlet to the strong-side winger breaking up the wall",
        "Wrist a soft chip into the neutral zone with no skater going to it",
        "Stretch pass to a forward who has timed an attack with speed through center",
      ],
      correct: [0, 1, 3],
      tip: "Three reads — D-to-D, wing on the wall, stretch with timing. Soft chips with no support give it back.",
      why: "Chipping it out without a skater chasing is a turnover. Each of the other three is a designed first-pass option after a clean win.",
      levels: ["U18 / Midget"],
    },
    {
      id: "u18_multi04",
      type: "multi",
      cat: "Decision-Making",
      d: 3,
      sit: "You're on a 2-on-1 rush. You have the puck on your forehand; the defender is square and lined up on you.",
      q: "Which of these are GOOD reads for the puck-carrier?",
      opts: [
        "Drive wide and shoot for a rebound your linemate can chase",
        "Attempt a saucer pass through the defender's stick to your linemate's blade",
        "Slide the puck early before the defender commits, while there's still a clean lane",
        "Take a hard slap shot from the blue line through the defender's body",
      ],
      correct: [0, 2],
      tip: "On a 2-on-1, force the defender to pick — pass too late OR shoot too wide.",
      why: "Saucers through a square defender's stick are low-percentage. A blue-line slap shot wastes the rush. Driving wide for a rebound or sliding it early before the defender reads it both work.",
      levels: ["U18 / Midget"],
    },
    {
      id: "u18_multi05",
      type: "multi",
      cat: "Transition",
      d: 3,
      sit: "It's 4-on-4 OT. Your team just gained possession in your defensive zone after a turnover.",
      q: "Which of these are GOOD 4-on-4 OT reads?",
      opts: [
        "Skate the puck wide to drag a defender out of position",
        "Force a low-percentage stretch pass into traffic",
        "Hold the puck behind your net to regroup if no good option is there",
        "Use the open ice — controlled rushes beat dump-and-chase in OT",
      ],
      correct: [0, 2, 3],
      tip: "4-on-4 OT rewards possession and patience — open ice, not dump-and-chase.",
      why: "Forcing stretch passes into traffic gives back possession in sudden death. Drag, regroup, and controlled rushes use the extra space.",
      levels: ["U18 / Midget"],
    },
    {
      id: "u18_multi06",
      type: "multi",
      cat: "Goaltending",
      d: 3,
      sit: "You're a forward defending against a 6-on-5 (other team has pulled their goalie).",
      q: "Which of these are correct reads when defending the empty net push?",
      opts: [
        "Block shots aggressively — getting in lanes is more important than fancy positioning",
        "Stay in the high slot so a clear-attempt can get past the extra attacker",
        "Lock the half-wall — don't let the puck come up the boards on your side",
        "Cheat for the empty-net pass — take risks since the game's almost over",
      ],
      correct: [0, 1, 2],
      tip: "Defending 6-on-5: shot-blocks + clear lane awareness + wall lockdown. Don't gamble.",
      why: "Cheating for the empty-net is how teams give up the tying goal. Block shots, stay high for the breakout, and lock the wall.",
      levels: ["U18 / Midget"],
    },
    {
      id: "u18_multi07",
      type: "multi",
      cat: "Power Play",
      d: 3,
      sit: "Your team has been on a 5-on-3 power play for 30 seconds without a shot. The puck is at the point.",
      q: "Which of these are GOOD adjustments?",
      opts: [
        "Move the puck side-to-side to shift the kill before shooting",
        "Force a one-timer through three sticks — at least it's a shot",
        "Get a player to the front of the net for screens and tips",
        "Use a shot-pass — fake the shot, slide it across to a one-timer",
      ],
      correct: [0, 2, 3],
      tip: "5-on-3 fails when shots are forced through traffic. Move the kill, screen, shot-pass.",
      why: "Forcing a shot through three sticks is the easy block + counterattack. The other three move the kill out of position.",
      levels: ["U18 / Midget"],
    },
    {
      id: "u18_multi08",
      type: "multi",
      cat: "Defensive Zone",
      d: 3,
      sit: "Your team is up by one with 90 seconds left in regulation. You're a defenseman in your own zone.",
      q: "Which of these are GOOD reads with a 1-goal lead late?",
      opts: [
        "Keep all clears on the right side of the line — no icings, no offensive zone risks",
        "Pinch on the wall to extend your offensive shift",
        "Get pucks deep — don't try to skate it through the neutral zone",
        "Take the body when you can — finish checks, eat clock",
      ],
      correct: [0, 2, 3],
      tip: "Up 1 late: clear it, dump it, finish checks. Pinching = extra-attacker chance against.",
      why: "Pinching on the wall with a 1-goal lead is how leads disappear. Smart clears, dumps, and physical play ice the game.",
      levels: ["U18 / Midget"],
    },
  ],
};

const bank = JSON.parse(fs.readFileSync(BANK, "utf8"));
let added = 0;
let skipped = 0;
const existingIds = new Set();
for (const lvl of Object.keys(bank)) {
  for (const q of bank[lvl] || []) if (q.id) existingIds.add(q.id);
}

for (const [primaryLevel, rows] of Object.entries(SEEDS)) {
  for (const q of rows) {
    if (existingIds.has(q.id)) { skipped++; continue; }
    if (!bank[primaryLevel]) bank[primaryLevel] = [];
    bank[primaryLevel].push(q);
    existingIds.add(q.id);
    added++;
  }
}

if (!APPLY) {
  console.log(`DRY RUN — would add ${added}, skip ${skipped}. Pass --apply to write.`);
} else {
  fs.writeFileSync(BANK, JSON.stringify(bank, null, 2) + "\n", "utf8");
  console.log(`Added ${added} multi-select questions (${skipped} already present).`);
}
