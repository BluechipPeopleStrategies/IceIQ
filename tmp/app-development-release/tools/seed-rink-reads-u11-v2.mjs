// Seeds the v2 exemplar U11 visual rink-read questions — high-quality
// reference set authored against the 14-axis rubric (see
// tools/audit-rink-quality.mjs). Each question must score 14/14 to ship.
//
//   node tools/seed-rink-reads-u11-v2.mjs
//
// Voice and structure: every wrong option fails for a *different* hockey
// principle, every tip teaches the read without leaking the answer, every
// scene shows ≥ 4 player markers besides YOU. Sources cited in `_source`.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const qPath = path.join(here, "..", "src", "data", "questions.json");

const STANDARD = ["U11 / Atom", "U13 / Peewee"];

const QUESTIONS = [

  // ─── #1: D-zone gap on a 1-on-1 rush against ─────────────────────────
  {
    id: "u11_v2_gap_1on1", cat: "Gap Control", pos: ["D"], d: 2,
    type: "hot-spots",
    levels: STANDARD,
    q: "Carrier's coming up the wall at you 1-on-1, no help back yet. Where do you set your gap?",
    tip: "Your gap is the distance between you and the carrier. Too tight, they go around. Too loose, they walk in. Where's the spot that makes them choose?",
    rink: { view: "right", zone: "def-zone", markers: [
      { type: "attacker", x: 490, y: 220, label: "X" },
      { type: "teammate", x: 550, y: 160, label: "D2" },
      { type: "teammate", x: 420, y: 175, label: "F3" },
      { type: "goalie",   x: 560, y: 150 },
    ]},
    spots: [
      { x: 510, y: 205, correct: true,
        msg: "✓ Tight gap mid-wall, stick on the puck, body angled outside. Now the carrier has to chip-and-chase, get walled off, or try a low-percentage cut. You forced the choice." },
      { x: 550, y: 200, correct: false,
        msg: "Backed in toward the net. The carrier walks down the middle with all the time in the world to read the slot, dish to a trailer, or take a shot through traffic." },
      { x: 530, y: 220, correct: false,
        msg: "Lunging in for the poke. If the carrier pulls the puck back or cuts inside, you're skating where they used to be — now they're behind you with the goalie alone." },
      { x: 470, y: 175, correct: false,
        msg: "You let them walk in untouched. Without you closing the gap, they keep full speed and full options into the slot." },
    ],
    _source: "Hockey Canada LTPD Stage 4 (U11) Defenseman Module: gap control · USA Hockey ADM 11U Defensemen: tight gap, force outside, stick first · Pat Quinn, Coaching Hockey for Dummies — Defending the Rush",
  },

  // ─── #2: F1 forecheck angle on a retrieval ───────────────────────────
  {
    id: "u11_v2_forecheck_f1_angle", cat: "Forecheck", pos: ["F"], d: 2,
    type: "hot-spots",
    levels: STANDARD,
    q: "You're F1 forechecking. Their D is grabbing the puck behind the net on the strong side. What angle do you take?",
    tip: "F1's job is to make them throw the puck somewhere they don't want to throw it. Where do you stand to take away their best option?",
    rink: { view: "right", zone: "off-zone", markers: [
      { type: "defender", x: 580, y: 195, label: "X-D" },
      { type: "defender", x: 540, y: 100, label: "X-RW" },
      { type: "defender", x: 570, y: 90,  label: "X-D2" },
      { type: "teammate", x: 510, y: 215, label: "F2" },
      { type: "teammate", x: 450, y: 150, label: "F3" },
      { type: "goalie",   x: 560, y: 150 },
    ]},
    spots: [
      { x: 550, y: 195, correct: true,
        msg: "✓ Strong-side angle. You cut off the middle and force them up the boards — F2 is already pinching the wall, so the rim or pass dies in coverage. Classic 1-2 forecheck." },
      { x: 470, y: 145, correct: false,
        msg: "Standing high. They have all the time in the world to look up, find their winger, and complete a clean breakout. F1's pressure is the trigger for everything — without it, F2 has nobody to angle into." },
      { x: 575, y: 200, correct: false,
        msg: "Sprinting straight at the carrier. They reverse the puck under pressure — now you're past the play and the weak-side D walks it out clean." },
      { x: 550, y: 110, correct: false,
        msg: "You took the wrong side around the net. The strong-side wall is wide open — a soft chip up the boards beats your forecheck cleanly while you're skating to nowhere." },
    ],
    _source: "Hockey Canada LTPD Stage 4 (U11) Forward Module: F1/F2/F3 progression · USA Hockey ADM 11U Forward: first forechecker takes away one side · Mike Smith, Hockey Plays and Strategies — Ch. 4 (1-2-2 Forecheck)",
  },
];

// ─── Apply ──────────────────────────────────────────────────────────────
const qb = JSON.parse(fs.readFileSync(qPath, "utf8"));
const target = "U11 / Atom";
qb[target] = qb[target] || [];

const existingIds = new Set(qb[target].map(q => q.id));
let added = 0, skipped = 0;
for (const q of QUESTIONS) {
  if (existingIds.has(q.id)) { skipped++; continue; }
  qb[target].push(q);
  added++;
}

fs.writeFileSync(qPath, JSON.stringify(qb, null, 2) + "\n");
console.log(`Seeded ${added} U11 v2 exemplar question(s). Skipped ${skipped} (already present).`);
console.log(`U11 / Atom total: ${qb[target].length}`);
