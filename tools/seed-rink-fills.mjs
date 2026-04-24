#!/usr/bin/env node
// Seed rink-scenario questions in ages that had 0 or 1. U7 and U18 were
// completely empty on rink content; U9/U15 had only 1-2 each. Adds a handful
// of scenarios distributed across supported rink types so every age shows
// visual/interactive questions in a 10-question quiz.
//
// Idempotent — skips ids that already exist.

import fs from "node:fs";
import path from "node:path";

const BANK = path.resolve("src/data/questions.json");
const bank = JSON.parse(fs.readFileSync(BANK, "utf8"));

const SEEDS = {
  "U7 / Initiation": [
    {
      id: "u7r1", cat: "Zone Awareness", pos: ["F","D"], d: 1,
      type: "zone-click",
      q: "Tap the SLOT — the best spot to try to score.",
      tip: "The slot is right in front of the net — that's where goals happen.",
      rink: {
        view: "right",
        markers: [{ type: "goalie", x: 560, y: 150 }],
      },
      zones: [
        { shape: "poly", points: [{x:470,y:120},{x:560,y:135},{x:560,y:165},{x:470,y:180}], correct: true,
          msg: "✓ That's the slot — front of the net, prime scoring area." },
        { shape: "poly", points: [{x:250,y:100},{x:350,y:100},{x:350,y:200},{x:250,y:200}], correct: false,
          msg: "That's center ice. Too far from the net to score from." },
        { shape: "poly", points: [{x:500,y:20},{x:600,y:20},{x:600,y:100},{x:500,y:100}], correct: false,
          msg: "That's the corner. Tough angle to score from." },
      ],
    },
    {
      id: "u7r2", cat: "Roles", pos: ["F","D"], d: 1,
      type: "mc",
      q: "Your goalie stands in the blue area in front of the net. What's that blue area called?",
      choices: ["The crease.", "The slot.", "The bench.", "Center ice."],
      correct: 0,
      tip: "The blue half-circle in front of the net is called the crease. Only the goalie belongs there.",
      rink: {
        view: "right", zone: "slot",
        markers: [{ type: "goalie", x: 560, y: 150, label: "G" }],
      },
    },
  ],

  "U9 / Novice": [
    {
      id: "u9r1", cat: "Positioning", pos: ["F","D"], d: 1,
      type: "zone-click",
      q: "You just lost the puck in the offensive zone. Tap the zone you should skate toward first.",
      tip: "When the other team gets the puck, you go back to your own end to help defend.",
      rink: {
        view: "right",
        markers: [{ type: "attacker", x: 480, y: 150, label: "THEM" }],
      },
      zones: [
        { shape: "poly", points: [{x:20,y:20},{x:200,y:20},{x:200,y:280},{x:20,y:280}], correct: true,
          msg: "✓ Back to your own end — help your D." },
        { shape: "poly", points: [{x:210,y:20},{x:390,y:20},{x:390,y:280},{x:210,y:280}], correct: false,
          msg: "Neutral zone. Keep going — all the way back to your net." },
        { shape: "poly", points: [{x:400,y:20},{x:600,y:20},{x:600,y:280},{x:400,y:280}], correct: false,
          msg: "Offensive zone. You just lost it here — you need to go BACK." },
      ],
    },
    {
      id: "u9r2", cat: "Shooting", pos: ["F"], d: 1,
      type: "mc",
      q: "You have the puck in the marked spot. The goalie is square. Where's the best place to aim?",
      choices: ["Corner of the net — away from the goalie's pads.", "Right at the goalie's chest.", "Way over the net.", "Back to your own end."],
      correct: 0,
      tip: "Aim where the goalie isn't. Corners are small but hard to save.",
      rink: {
        view: "right", zone: "slot",
        markers: [
          { type: "attacker", x: 500, y: 150, label: "YOU" },
          { type: "goalie", x: 560, y: 150, label: "G" },
        ],
      },
    },
  ],

  "U11 / Atom": [
    {
      id: "u11_rink_fill1", cat: "Vision", pos: ["F"], d: 2,
      type: "pov-pick",
      q: "You're carrying the puck into the offensive zone. Who's your best pass option right now?",
      tip: "The unchecked teammate with a clean lane is the best option — not the one being shadowed.",
      pov: {
        povRole: "skater",
        camera: { x: 400, y: 150, z: 18, lookAt: { x: 520, y: 150 } },
        prompt: "Pass to who?",
        markers: [
          { type: "teammate", x: 480, y: 90, label: "A" },
          { type: "defender", x: 485, y: 100 },
          { type: "teammate", x: 490, y: 210, label: "B" },
          { type: "goalie", x: 560, y: 150 },
        ],
      },
      targets: [
        { id: "A", x: 480, y: 90, radius: 24, correct: false, msg: "Covered — defender is right there." },
        { id: "B", x: 490, y: 210, radius: 24, correct: true, msg: "✓ B is wide open. Hit them in stride." },
      ],
    },
  ],

  "U15 / Bantam": [
    {
      id: "u15_rink_fill1", cat: "Positioning", pos: ["F"], d: 2,
      type: "hot-spots",
      q: "Your D is carrying the puck up the strong-side wall in the offensive zone. You're the weak-side winger. Tap every good support spot.",
      tip: "Weak-side options: backdoor mid-slot (scoring) and high slot (outlet for the D). Corner is wrong — the D just left there.",
      rink: {
        view: "right", zone: "off-zone",
        markers: [
          { type: "teammate", x: 500, y: 80, label: "D" },
          { type: "attacker", x: 470, y: 90 },
          { type: "goalie", x: 560, y: 150 },
        ],
      },
      spots: [
        { x: 530, y: 220, correct: true, msg: "✓ Backdoor — prime scoring area on a feed across." },
        { x: 460, y: 170, correct: true, msg: "✓ High slot — gives your D an outlet if they can't beat the pressure." },
        { x: 540, y: 80, correct: false, msg: "Corner — your D just left there. Going to the corner crowds the play." },
      ],
    },
  ],

  "U18 / Midget": [
    {
      id: "u18r1", cat: "Decision-Making", pos: ["F","D"], d: 2,
      type: "lane-select",
      q: "You just received the puck at the offensive blue line with pressure arriving. Which lane gets the puck to a teammate cleanly?",
      tip: "Read the defenders' sticks. The open lane is the one that doesn't cross a stick AND leads to a dangerous spot.",
      rink: {
        view: "right", zone: "off-zone",
        markers: [
          { type: "attacker", x: 400, y: 150, label: "YOU" },
          { type: "defender", x: 430, y: 140 },
          { type: "teammate", x: 500, y: 90, label: "LW" },
          { type: "teammate", x: 500, y: 210, label: "RW" },
          { type: "defender", x: 470, y: 210 },
          { type: "goalie", x: 560, y: 150 },
        ],
      },
      lanes: [
        { id: "to-lw", from: { x: 400, y: 150 }, to: { x: 500, y: 90 }, correct: true, msg: "✓ Clean lane to LW — defender's stick is on the other side." },
        { id: "to-rw", from: { x: 400, y: 150 }, to: { x: 500, y: 210 }, correct: false, msg: "Blocked — the second defender is in that lane." },
      ],
    },
    {
      id: "u18r2", cat: "Gap Control", pos: ["D"], d: 2,
      type: "drag-target",
      q: "You're the D on a 1-on-1. The attacker is carrying wide. Drag to where your gap should close.",
      tip: "Angle them to the boards — your stick in the passing lane, body between puck and center ice. Don't get beat wide.",
      rink: {
        view: "left", zone: "neutral-zone",
        markers: [
          { type: "attacker", x: 240, y: 90, label: "X" },
          { type: "defender", x: 200, y: 150, label: "YOU" },
        ],
      },
      puckStart: { x: 200, y: 150 },
      targets: [
        { x: 220, y: 100, radius: 36, verdict: "best", feedback: "✓ Gap closed on the boards, stick in the lane. Textbook." },
        { x: 200, y: 150, radius: 40, verdict: "worst", feedback: "Stayed flat-footed. The attacker's gone wide — you lost the gap." },
      ],
    },
  ],
};

let added = 0, skipped = 0;
for (const [level, seeds] of Object.entries(SEEDS)) {
  if (!bank[level]) bank[level] = [];
  for (const q of seeds) {
    if (bank[level].some(x => x.id === q.id)) { skipped++; continue; }
    bank[level].push(q);
    added++;
  }
}
fs.writeFileSync(BANK, JSON.stringify(bank, null, 2) + "\n", "utf8");
console.log(`Rink fill seed: ${added} added, ${skipped} skipped.`);
