#!/usr/bin/env node
// Seed 8 "select all that apply" multi-select questions for U15 / U18.
// Idempotent — skips ids already in the bank.

import fs from "node:fs";
import path from "node:path";

const BANK = path.resolve("src/data/questions.json");
const APPLY = process.argv.includes("--apply");

const SEEDS = {
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
