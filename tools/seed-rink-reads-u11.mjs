// Seeds 12 U11 visual rink-read questions into src/data/questions.json.
// Idempotent: skips ids that already exist.
//
//   node tools/seed-rink-reads-u11.mjs
//
// All 12 are visual on-ice scenarios that require the player to make a
// specific read — gap control, backcheck angle, cycle support, breakout
// outlet, net-front coverage, 2-on-1 reads, etc. Mix of formats:
//   - lane-select (3) — which passing lane is clean?
//   - hot-spots   (3) — where do you skate?
//   - pov-pick    (3) — read the play from the carrier's POV
//   - drag-target (3) — drag yourself to the right spot
//
// Coordinate system matches existing U11 visual reads. Right-zone view:
// goalie ~ (560, 150), net-front 540–555, slot 490–525, faceoff dots
// (~470, 95) and (~470, 205), boards top/bot ~70 / ~230, blue line ~400.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const qPath = path.join(here, "..", "src", "data", "questions.json");

const LEVELS = ["U11 / Atom", "U13 / Peewee"];
const QUESTIONS = [

  // ─── 1. lane-select · D-to-winger breakout outlet ────────────────────
  {
    id: "u11_rr_breakout_outlet", cat: "Breakouts", pos: ["D"], d: 2,
    type: "lane-select",
    q: "You're the D, ringing the puck around the boards. Which winger is the open outlet?",
    tip: "The outlet without a forechecker on top is the safe pass. Don't force the strong-side wall.",
    rink: { view: "right", zone: "def-zone", markers: [
      { type: "teammate",  x: 555, y: 175, label: "YOU" },
      { type: "defender",  x: 510, y: 210 },
      { type: "teammate",  x: 460, y: 95,  label: "RW" },
      { type: "teammate",  x: 470, y: 220, label: "LW" },
      { type: "defender",  x: 480, y: 215 },
      { type: "goalie",    x: 560, y: 150 },
    ]},
    lanes: [
      { x1: 555, y1: 170, x2: 465, y2: 100, clear: true,  msg: "Clean rim — RW is alone with the wall as a passing line." },
      { x1: 555, y1: 180, x2: 472, y2: 220, clear: false, msg: "Forechecker's already on the LW. That's a turnover at your own blue line." },
    ],
  },

  // ─── 2. lane-select · OZ point-to-net feed ───────────────────────────
  {
    id: "u11_rr_point_feed", cat: "Passing", pos: ["F", "D"], d: 2,
    type: "lane-select",
    q: "You're walking the puck at the point. The strong-side feed is shadowed. What's open?",
    tip: "Read both defenders. The lane through the seam — between two coverage triangles — is the chance.",
    rink: { view: "right", zone: "off-zone", markers: [
      { type: "attacker",  x: 410, y: 150, label: "YOU" },
      { type: "defender",  x: 440, y: 165 },
      { type: "teammate",  x: 535, y: 145, label: "C" },
      { type: "defender",  x: 525, y: 140 },
      { type: "teammate",  x: 470, y: 95,  label: "LW" },
      { type: "goalie",    x: 560, y: 150 },
    ]},
    lanes: [
      { x1: 415, y1: 150, x2: 530, y2: 145, clear: false, msg: "C is shadowed. The defender's stick eats this pass on the way." },
      { x1: 415, y1: 145, x2: 470, y2: 100, clear: true,  msg: "Clean seam to the LW low in the circle — that's a one-timer angle." },
    ],
  },

  // ─── 3. lane-select · NZ regroup D-to-D ──────────────────────────────
  {
    id: "u11_rr_nz_regroup", cat: "Breakouts", pos: ["D"], d: 2,
    type: "lane-select",
    q: "Regroup in the neutral zone. Forecheck is pressing the strong side. Where's the safe pass?",
    tip: "When the strong side gets pressured, a quick D-to-D resets the attack on the weak side.",
    rink: { view: "right", zone: "neutral-zone", markers: [
      { type: "teammate",  x: 430, y: 200, label: "YOU" },
      { type: "defender",  x: 460, y: 195 },
      { type: "teammate",  x: 430, y: 100, label: "D2" },
      { type: "teammate",  x: 510, y: 130, label: "C" },
      { type: "defender",  x: 505, y: 135 },
    ]},
    lanes: [
      { x1: 430, y1: 195, x2: 510, y2: 130, clear: false, msg: "C is locked up. This pass goes through three sticks." },
      { x1: 425, y1: 195, x2: 430, y2: 105, clear: true,  msg: "Clean D-to-D reset. Now D2 attacks the weak side with time." },
    ],
  },

  // ─── 4. hot-spots · F3 cycle support ─────────────────────────────────
  {
    id: "u11_rr_cycle_f3", cat: "Positioning", pos: ["F"], d: 2,
    type: "hot-spots",
    q: "Your linemate has the puck low on the strong-side wall in a cycle. You're F3. Where do you go?",
    tip: "F3 is the safety net. High slot — close enough to be a pass option, high enough to defend the rush back.",
    rink: { view: "right", zone: "off-zone", markers: [
      { type: "teammate",  x: 545, y: 220, label: "F1" },
      { type: "defender",  x: 530, y: 215 },
      { type: "teammate",  x: 510, y: 95,  label: "F2" },
      { type: "goalie",    x: 560, y: 150 },
    ]},
    spots: [
      { x: 470, y: 150, correct: true,  msg: "✓ High-slot F3. Pass option, screen lane, and you're the first one back if it turns over." },
      { x: 540, y: 150, correct: false, msg: "Too low and too central — you're crowding F1's space and out of the play if there's a turnover." },
      { x: 415, y: 110, correct: false, msg: "Way too high. You're a pass option in name only and totally out of the cycle." },
    ],
  },

  // ─── 5. hot-spots · backcheck pickup ─────────────────────────────────
  {
    id: "u11_rr_backcheck_high", cat: "Defense", pos: ["F"], d: 2,
    type: "hot-spots",
    q: "Backchecking on a 3-on-2 against. Your D have the puck carrier and strong-side winger. Where do you pick up?",
    tip: "First forward back picks up the highest open man. That's the late F2 they'll dish back to.",
    rink: { view: "right", zone: "def-zone", markers: [
      { type: "attacker",  x: 480, y: 145, label: "X1" },
      { type: "defender",  x: 470, y: 150, label: "D1" },
      { type: "attacker",  x: 510, y: 95,  label: "X2" },
      { type: "defender",  x: 500, y: 105, label: "D2" },
      { type: "attacker",  x: 425, y: 165, label: "X3" },
      { type: "goalie",    x: 560, y: 150 },
    ]},
    spots: [
      { x: 425, y: 165, correct: true,  msg: "✓ X3 is the trailer with no one on him. Take him away — that's where the puck wants to go." },
      { x: 540, y: 130, correct: false, msg: "Both D already have this side. You'd be doubling up and leaving the trailer wide open." },
      { x: 555, y: 150, correct: false, msg: "Net-front is the goalie's job. You're abandoning the high option to do something already covered." },
    ],
  },

  // ─── 6. hot-spots · weak-side D net-front ────────────────────────────
  {
    id: "u11_rr_weakside_d", cat: "Coverage", pos: ["D"], d: 3,
    type: "hot-spots",
    q: "Puck is in the strong-side corner. Your partner's pinned in the battle. You're weak-side D. Where do you go?",
    tip: "Weak-side D owns the net front when the strong side is locked up. Stick in the backdoor lane, eyes both ways.",
    rink: { view: "right", zone: "def-zone", markers: [
      { type: "attacker",  x: 555, y: 220, label: "X1" },
      { type: "teammate",  x: 540, y: 215, label: "D1" },
      { type: "attacker",  x: 545, y: 90,  label: "X2" },
      { type: "goalie",    x: 560, y: 150 },
    ]},
    spots: [
      { x: 535, y: 155, correct: true,  msg: "✓ Net-front, stick in the backdoor lane. You'll kill any cross-ice feed to X2." },
      { x: 510, y: 95,  correct: false, msg: "You just chased X2 to the wall — nobody's at the net and a centring pass is a goal." },
      { x: 460, y: 145, correct: false, msg: "Too high. You're not helping the corner battle and the slot is wide open." },
    ],
  },

  // ─── 7. pov-pick · OZ entry first read ───────────────────────────────
  {
    id: "u11_rr_entry_read", cat: "Vision", pos: ["F"], d: 2,
    type: "pov-pick",
    q: "Carrying the puck wide on a clean entry. Your centre is in the slot, weak-side winger crashing late. Who do you hit?",
    tip: "The late winger is the killer pass — D have to step up on the centre and leave the back door open.",
    pov: {
      povRole: "skater",
      camera: { x: 410, y: 95, z: 18, lookAt: { x: 510, y: 150 } },
      prompt: "Pass to who?",
      markers: [
        { type: "teammate", x: 500, y: 150, label: "C" },
        { type: "defender", x: 490, y: 145 },
        { type: "teammate", x: 480, y: 215, label: "LW" },
        { type: "goalie",   x: 560, y: 150 },
      ],
    },
    targets: [
      { id: "C",  x: 500, y: 150, radius: 24, correct: false, msg: "C is being shadowed — stick right on the puck side. Pass dies in coverage." },
      { id: "LW", x: 480, y: 215, radius: 24, correct: true,  msg: "✓ LW is late and unchecked. Hit them in stride for a clean shot." },
    ],
  },

  // ─── 8. pov-pick · OZ cycle outlet ───────────────────────────────────
  {
    id: "u11_rr_cycle_outlet", cat: "Vision", pos: ["F"], d: 2,
    type: "pov-pick",
    q: "You've cycled the puck low and a defender is closing fast. Two outlets — who's open?",
    tip: "Read the eyes and sticks of the defenders. The teammate without a stick in their lane is the answer.",
    pov: {
      povRole: "skater",
      camera: { x: 545, y: 220, z: 14, lookAt: { x: 470, y: 150 } },
      prompt: "Outlet to who?",
      markers: [
        { type: "teammate", x: 460, y: 95,  label: "RW" },
        { type: "defender", x: 470, y: 110 },
        { type: "teammate", x: 415, y: 150, label: "D" },
        { type: "goalie",   x: 560, y: 150 },
      ],
    },
    targets: [
      { id: "RW", x: 460, y: 95,  radius: 24, correct: false, msg: "Defender's stick is between you and RW. That's a takeaway." },
      { id: "D",  x: 415, y: 150, radius: 24, correct: true,  msg: "✓ D is wide open at the point — clean reset, regroup the play." },
    ],
  },

  // ─── 9. pov-pick · 2-on-1 read for the carrier ───────────────────────
  {
    id: "u11_rr_2on1_pass_or_shoot", cat: "Decision-Making", pos: ["F"], d: 2,
    type: "pov-pick",
    q: "Two-on-one. The lone D is between you and your winger. Pass or shoot?",
    tip: "If the D commits to the passing lane, shoot. If the D commits to you, pass. Read their feet.",
    pov: {
      povRole: "skater",
      camera: { x: 420, y: 130, z: 16, lookAt: { x: 540, y: 150 } },
      prompt: "Best play?",
      markers: [
        { type: "defender", x: 510, y: 175, label: "D" },
        { type: "teammate", x: 510, y: 95,  label: "W" },
        { type: "goalie",   x: 560, y: 150 },
      ],
    },
    targets: [
      { id: "shoot", x: 558, y: 145, radius: 22, correct: true,  msg: "✓ D is sliding to take away the pass — their feet are in the lane. Shoot far side." },
      { id: "pass",  x: 510, y: 95,  radius: 24, correct: false, msg: "D is already in the passing lane. The pass gets blocked — shot was open." },
    ],
  },

  // ─── 10. drag-target · 1-on-1 gap control ────────────────────────────
  {
    id: "u11_rr_gap_1on1", cat: "Defense", pos: ["D"], d: 2,
    type: "drag-target",
    q: "Carrier is coming up the wall on a 1-on-1. You're the lone D. Where do you set your gap?",
    tip: "Mid-ice angle, stick on puck. Force them outside, don't backpedal to the net.",
    rink: { view: "right", zone: "def-zone", markers: [
      { type: "attacker",  x: 430, y: 215, label: "X" },
      { type: "defender",  x: 470, y: 150, label: "YOU" },
      { type: "goalie",    x: 560, y: 150 },
    ]},
    puckStart: { x: 470, y: 150 },
    targets: [
      { x: 460, y: 200, radius: 28, verdict: "best",  feedback: "✓ Tight angle, stick on puck, body between carrier and middle ice. They have to dump it or get walled off." },
      { x: 530, y: 175, radius: 28, verdict: "worst", feedback: "You backed in to the net. Carrier walks across the slot with all day to shoot." },
    ],
  },

  // ─── 11. drag-target · screen / tip net-front ────────────────────────
  {
    id: "u11_rr_screen_position", cat: "Positioning", pos: ["F"], d: 2,
    type: "drag-target",
    q: "Your D is winding up for a point shot. You're the net-front F. Where do you set up?",
    tip: "Goalie's eyes, not their pads. Off the post, slightly to the strong side, stick on the ice for the tip.",
    rink: { view: "right", zone: "off-zone", markers: [
      { type: "teammate",  x: 410, y: 150, label: "D" },
      { type: "defender",  x: 540, y: 145 },
      { type: "attacker",  x: 510, y: 175, label: "YOU" },
      { type: "goalie",    x: 560, y: 150 },
    ]},
    puckStart: { x: 510, y: 175 },
    targets: [
      { x: 545, y: 165, radius: 26, verdict: "best",  feedback: "✓ In the goalie's eyes, off the post, stick down. You either screen the shot or tip it." },
      { x: 555, y: 110, radius: 26, verdict: "worst", feedback: "You're behind the net's plane and on the wrong side. No screen, no tip — D might as well shoot at a wall." },
    ],
  },

  // ─── 12. drag-target · F1 forecheck angle ────────────────────────────
  {
    id: "u11_rr_forecheck_angle", cat: "Forecheck", pos: ["F"], d: 2,
    type: "drag-target",
    q: "You're F1 forechecking. Their D is retrieving the puck behind the net. What's your angle?",
    tip: "Take away one side. Force them up the strong-side wall where F2 is waiting — never give them the middle.",
    rink: { view: "right", zone: "off-zone", markers: [
      { type: "defender",  x: 555, y: 175, label: "X" },
      { type: "attacker",  x: 500, y: 150, label: "YOU" },
      { type: "teammate",  x: 460, y: 215, label: "F2" },
      { type: "goalie",    x: 560, y: 150 },
    ]},
    puckStart: { x: 500, y: 150 },
    targets: [
      { x: 540, y: 195, radius: 28, verdict: "best",  feedback: "✓ Strong-side angle. You force the D up the wall right into F2's pressure. Classic 1–2 forecheck." },
      { x: 540, y: 105, radius: 28, verdict: "worst", feedback: "You opened the strong-side wall. They reverse the puck weak-side and breakout clean." },
    ],
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
  qb[target].push({ ...q, levels: LEVELS });
  added++;
}

fs.writeFileSync(qPath, JSON.stringify(qb, null, 2) + "\n");
console.log(`Seeded ${added} U11 rink-read questions. Skipped ${skipped} (already present).`);
console.log(`U11 / Atom total: ${qb[target].length}`);
