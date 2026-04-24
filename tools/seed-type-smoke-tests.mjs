#!/usr/bin/env node
// Seed one bank question per new-schema rink type, so every renderer in
// IceIQRinkQuestion has at least one live example to smoke-test through
// the quiz flow. Idempotent — skip if id already present.

import fs from "node:fs";
import path from "node:path";

const BANK = path.resolve("src/data/questions.json");
const raw = fs.readFileSync(BANK, "utf8");
const bank = JSON.parse(raw);

const SEEDS = [
  // multi-tap — U11, Coverage, tap every teammate who's in a scoring position
  {
    level: "U11 / Atom",
    q: {
      id: "u11q_rink04",
      cat: "Net-Front",
      diff: "M",
      type: "multi-tap",
      pos: ["F"],
      q: "You've got the puck in the right corner. Tap every teammate who's in a dangerous scoring spot.",
      tip: "Scoring spots are the slot and the top of the crease. Wingers below the goal line and D at the blue line aren't dangerous right now.",
      rink: {
        view: "right",
        zone: "off-zone",
        markers: [
          { type: "teammate", x: 558, y: 248, label: "ME" },
          { type: "defender", x: 548, y: 238 },
          { type: "goalie", x: 560, y: 150 },
        ],
      },
      markers: [
        { type: "teammate", x: 510, y: 150, label: "S", correct: true },  // slot
        { type: "teammate", x: 540, y: 170, label: "N", correct: true },  // net front
        { type: "teammate", x: 420, y: 100, label: "P", correct: false }, // point
        { type: "teammate", x: 540, y: 260, label: "B", correct: false }, // below goal line
      ],
    },
  },

  // sequence-rink — U13, Breakouts, order the D-to-F support chain
  {
    level: "U13 / Peewee",
    q: {
      id: "u13q_rink06",
      cat: "Breakouts",
      diff: "M",
      type: "sequence-rink",
      pos: ["F", "D"],
      q: "Tap your team in the order they should touch the puck on a clean breakout: D1 picks it up, then?",
      tip: "D1 → weak-side D (D2) for a reverse → strong-side winger up the wall → center through the middle.",
      rink: {
        view: "left",
        zone: "def-zone",
        markers: [
          { type: "defender", x: 140, y: 150 },  // opposing forechecker (visual)
        ],
      },
      markers: [
        { type: "teammate", x: 55, y: 190, label: "D1", order: 1 },
        { type: "teammate", x: 60, y: 100, label: "D2", order: 2 },
        { type: "teammate", x: 165, y: 40, label: "W",  order: 3 },
        { type: "teammate", x: 175, y: 150, label: "C", order: 4 },
      ],
    },
  },

  // path-draw — U13, Decision-Making, draw the skating lane from your spot to open ice
  {
    level: "U13 / Peewee",
    q: {
      id: "u13q_rink07",
      cat: "Support",
      diff: "M",
      type: "path-draw",
      pos: ["F"],
      q: "You're F3, trailing the rush. Draw your path to the best support position.",
      tip: "Trail high — through the middle to the top of the slot gives you shot support AND backcheck coverage if it turns over.",
      rink: {
        view: "right",
        zone: "off-zone",
        markers: [
          { type: "teammate", x: 500, y: 120, label: "F1" },
          { type: "teammate", x: 530, y: 200, label: "F2" },
          { type: "defender", x: 515, y: 150 },
          { type: "goalie", x: 560, y: 150 },
        ],
      },
      start:  { x: 400, y: 150, radius: 28 },
      target: { x: 470, y: 130, radius: 35 },
      avoid: [
        { x: 515, y: 150, radius: 20 }, // the opposing D
      ],
    },
  },

  // lane-select — U11, Passing, pick the clear passing lane
  {
    level: "U11 / Atom",
    q: {
      id: "u11q_rink05",
      cat: "Passing",
      diff: "E",
      type: "lane-select",
      pos: ["F", "D"],
      q: "You've got the puck at the blue line. Which passing lane to your winger is open?",
      tip: "Read the defender's stick. The lane that doesn't cross a stick is the pass.",
      rink: {
        view: "right",
        zone: "off-zone",
        markers: [
          { type: "attacker", x: 400, y: 150, label: "YOU" },
          { type: "defender", x: 460, y: 170 },
          { type: "teammate", x: 540, y: 240, label: "W" },
          { type: "goalie", x: 560, y: 150 },
        ],
      },
      lanes: [
        { x1: 405, y1: 145, x2: 535, y2: 235, clear: false, msg: "Defender's stick is right across this lane. It'll get picked off." },
        { x1: 405, y1: 155, x2: 500, y2: 230, clear: true,  msg: "Clean lane — pass curls below the defender's stick." },
      ],
    },
  },

  // hot-spots — U13, Positioning, pick the best spot to be
  {
    level: "U13 / Peewee",
    q: {
      id: "u13q_rink08",
      cat: "Positioning",
      diff: "M",
      type: "hot-spots",
      pos: ["F"],
      q: "Your D is walking the puck at the point. Where should you (the weak-side winger) be?",
      tip: "Weak-side support is backdoor, mid-slot. Close enough to finish a feed, far enough to give the carrier options.",
      rink: {
        view: "right",
        zone: "off-zone",
        markers: [
          { type: "teammate", x: 420, y: 200, label: "D" },
          { type: "defender", x: 450, y: 195 },
          { type: "teammate", x: 540, y: 80, label: "SW" },
          { type: "goalie", x: 560, y: 150 },
        ],
      },
      spots: [
        { x: 540, y: 170, correct: true,  msg: "✓ Backdoor, mid-slot. That's the weak-side support spot on a point walk." },
        { x: 440, y: 80,  correct: false, msg: "Too high and too strong-side. You won't get a backdoor feed from there." },
        { x: 560, y: 240, correct: false, msg: "Too deep. You're below the goal line and can't finish a cross-ice pass." },
      ],
    },
  },

  // drag-place — U15, Systems, drag chips onto the 1-2-2 forecheck slots
  {
    level: "U15 / Bantam",
    q: {
      id: "u15q_rink03",
      cat: "Systems Play",
      diff: "H",
      type: "drag-place",
      pos: ["F", "D"],
      q: "Set up the 1-2-2 forecheck. Drag each chip to their starting spot.",
      tip: "1-2-2: F1 pressures the puck, F2 and F3 cover the strong-side wall + weak-side outlet, D1 and D2 hold the blue line.",
      rink: {
        view: "left",
        zone: "def-zone",
        markers: [
          { type: "attacker", x: 60, y: 150 },  // opposing puck carrier
          { type: "goalie", x: 45, y: 150 },
        ],
      },
      slots: [
        { id: "F1", x: 95,  y: 150, tol: 40 },
        { id: "F2", x: 170, y: 80,  tol: 40 },
        { id: "F3", x: 170, y: 220, tol: 40 },
        { id: "D1", x: 250, y: 100, tol: 40 },
        { id: "D2", x: 250, y: 200, tol: 40 },
      ],
      chips: [
        { id: "F1", kind: "teammate", label: "F1" },
        { id: "F2", kind: "teammate", label: "F2" },
        { id: "F3", kind: "teammate", label: "F3" },
        { id: "D1", kind: "teammate", label: "D1" },
        { id: "D2", kind: "teammate", label: "D2" },
      ],
    },
  },

  // pov-pick — U13, Decision-Making, tap the open teammate from your POV
  {
    level: "U13 / Peewee",
    q: {
      id: "u13q_rink09",
      cat: "Decision-Making",
      diff: "M",
      type: "pov-pick",
      pos: ["F"],
      q: "You're driving down the right wing with the puck. Tap the teammate who's open for a pass.",
      tip: "The open teammate has no defender between you and them, with a clean lane to the net.",
      pov: {
        povRole: "skater",
        camera: { x: 470, y: 230, z: 17, lookAt: { x: 555, y: 120 } },
        prompt: "Who's open?",
        markers: [
          { type: "teammate", x: 520, y: 90,  label: "A" },
          { type: "teammate", x: 540, y: 170, label: "B" },
          { type: "defender", x: 510, y: 100 },
          { type: "defender", x: 525, y: 175 },
          { type: "goalie", x: 560, y: 150 },
        ],
      },
      targets: [
        { id: "A", x: 520, y: 90,  radius: 24, correct: false, msg: "Covered — the defender is right between you and A." },
        { id: "B", x: 540, y: 170, radius: 24, correct: true,  msg: "✓ B is wide open backdoor with a defender out of the lane." },
      ],
    },
  },

  // pov-mc — U15, Decision-Making, what would you do next in this POV
  {
    level: "U15 / Bantam",
    q: {
      id: "u15q_rink04",
      cat: "Decision-Making",
      diff: "M",
      type: "pov-mc",
      pos: ["F"],
      q: "You're the trailing forward crossing the offensive blue line. The D is gapping tight on your puck carrier. What's your best play?",
      tip: "When the D commits to the puck carrier, trail-support option = drop pass. The puck carrier peels around, you step into the open slot.",
      pov: {
        povRole: "skater",
        camera: { x: 420, y: 230, z: 17, lookAt: { x: 510, y: 130 } },
        prompt: "D is gapping the carrier tight",
        markers: [
          { type: "teammate", x: 470, y: 140, label: "PC" },
          { type: "defender", x: 500, y: 130 },
          { type: "goalie", x: 560, y: 150 },
        ],
      },
      choices: [
        "Drive hard for the net front.",
        "Stop and pivot to the middle for a drop pass.",
        "Fly wide to the far wall looking for a pass.",
        "Shoot for the back of the line to back-check.",
      ],
      correct: 1,
    },
  },
];

let added = 0, skipped = 0;
for (const { level, q } of SEEDS) {
  const arr = bank[level];
  if (!arr) { console.error(`Missing level: ${level}`); process.exit(1); }
  if (arr.some(x => x.id === q.id)) {
    skipped++;
    continue;
  }
  arr.push(q);
  added++;
}

fs.writeFileSync(BANK, JSON.stringify(bank, null, 2) + "\n", "utf8");
console.log(`Seed complete: ${added} added, ${skipped} skipped.`);
