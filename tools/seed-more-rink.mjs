#!/usr/bin/env node
// More rink scenarios — round 2 of the rink backfill. Adds 15+ interactive
// rink questions distributed across ages using a mix of types. Idempotent.

import fs from "node:fs";
import path from "node:path";

const BANK = path.resolve("src/data/questions.json");
const bank = JSON.parse(fs.readFileSync(BANK, "utf8"));

const SEEDS = {
  "U9 / Novice": [
    {
      id: "u9r3", cat: "Positioning", pos: ["F","D"], d: 1,
      type: "zone-click",
      q: "Tap your DEFENSIVE zone — the end you protect.",
      tip: "Defensive zone is the end where YOUR goalie stands.",
      rink: { view: "right", markers: [{ type: "goalie", x: 40, y: 150 }] },
      zones: [
        { shape: "poly", points: [{x:20,y:20},{x:220,y:20},{x:220,y:280},{x:20,y:280}], correct: true,
          msg: "✓ That's your end — where your goalie stands." },
        { shape: "poly", points: [{x:220,y:20},{x:400,y:20},{x:400,y:280},{x:220,y:280}], correct: false,
          msg: "Neutral zone — the middle." },
        { shape: "poly", points: [{x:400,y:20},{x:600,y:20},{x:600,y:280},{x:400,y:280}], correct: false,
          msg: "That's where you want to score — offensive zone." },
      ],
    },
    {
      id: "u9r4", cat: "Teamwork", pos: ["F"], d: 1,
      type: "mc",
      q: "Your teammate has the puck in the corner. The goalie is on the far side. Where's the best place to stand?",
      choices: ["In the slot — ready for a pass.", "Right next to your teammate.", "Behind your goalie.", "At center ice."],
      correct: 0,
      tip: "The slot is in front of the net — that's where your friend can pass to you to score.",
      rink: {
        view: "right", zone: "slot",
        markers: [
          { type: "teammate", x: 560, y: 80, label: "friend" },
          { type: "goalie", x: 560, y: 150 },
        ],
      },
    },
  ],

  "U11 / Atom": [
    {
      id: "u11_rink_fill2", cat: "Breakout", pos: ["F","D"], d: 2,
      type: "lane-select",
      q: "Your D has the puck behind the net on a breakout. Which winger is the best outlet?",
      tip: "The winger who's unchecked AND parallel to the goal line is the safest pass.",
      rink: {
        view: "left", zone: "def-zone",
        markers: [
          { type: "defender", x: 60, y: 170, label: "D" },
          { type: "teammate", x: 140, y: 40, label: "LW" },
          { type: "teammate", x: 140, y: 260, label: "RW" },
          { type: "attacker", x: 160, y: 260 },
        ],
      },
      lanes: [
        { id: "to-lw", from: { x: 60, y: 170 }, to: { x: 140, y: 40 }, correct: true,
          msg: "✓ Wide open — unchecked LW on the wall." },
        { id: "to-rw", from: { x: 60, y: 170 }, to: { x: 140, y: 260 }, correct: false,
          msg: "Covered — the forechecker is right there." },
      ],
    },
    {
      id: "u11_rink_fill3", cat: "Shooting", pos: ["F"], d: 1,
      type: "multi-tap",
      q: "The goalie is square. Tap the two best corners to shoot for.",
      tip: "Top corners = small targets, hardest to save. Bottom corners = blocked by pads. Go up.",
      rink: {
        view: "right", zone: "slot",
        markers: [
          { type: "attacker", x: 490, y: 150, label: "YOU" },
          { type: "goalie", x: 560, y: 150 },
        ],
      },
      targets: [
        { id: "top-glove", x: 558, y: 135, radius: 14, correct: true,
          msg: "✓ Top-glove corner — small target, hardest to save." },
        { id: "top-stick", x: 558, y: 165, radius: 14, correct: true,
          msg: "✓ Top-stick corner — goalies track low better than high." },
        { id: "five-hole", x: 558, y: 150, radius: 12, correct: false,
          msg: "Five-hole works sometimes, but when the goalie's square it's closed." },
      ],
    },
    {
      id: "u11_rink_fill4", cat: "Coverage", pos: ["D"], d: 2,
      type: "drag-target",
      q: "The puck carrier is cutting to the slot. You're the weak-side D. Where should you be?",
      tip: "Weak-side D protects the net front. Stand between the puck and the backdoor, stick in the passing lane.",
      rink: {
        view: "right", zone: "def-zone",
        markers: [
          { type: "attacker", x: 490, y: 130, label: "X" },
          { type: "defender", x: 510, y: 210, label: "YOU" },
          { type: "teammate", x: 480, y: 140, label: "D1" },
          { type: "goalie", x: 560, y: 150 },
        ],
      },
      puckStart: { x: 510, y: 210 },
      targets: [
        { x: 540, y: 180, radius: 30, verdict: "best",
          feedback: "✓ Net-front seal. Stick in the backdoor lane, body between puck and net." },
        { x: 460, y: 130, radius: 30, verdict: "worst",
          feedback: "You just doubled up on the puck carrier — nobody's at the net. Goalie's alone." },
      ],
    },
  ],

  "U13 / Peewee": [
    {
      id: "u13_rink_fill1", cat: "Vision", pos: ["F","D"], d: 2,
      type: "pov-pick",
      q: "You're carrying in on the weak side. Who's the best late-arriving outlet?",
      tip: "Late support = the player skating IN with speed, not the one parked.",
      pov: {
        povRole: "skater",
        camera: { x: 420, y: 180, z: 17, lookAt: { x: 540, y: 140 } },
        prompt: "Best trail option?",
        markers: [
          { type: "teammate", x: 500, y: 80, label: "A" },
          { type: "teammate", x: 450, y: 230, label: "B" },
          { type: "defender", x: 520, y: 110 },
          { type: "goalie", x: 560, y: 150 },
        ],
      },
      targets: [
        { id: "A", x: 500, y: 80, radius: 24, correct: false,
          msg: "Covered. Defender reads that pass all day." },
        { id: "B", x: 450, y: 230, radius: 24, correct: true,
          msg: "✓ B is skating IN with speed — clean lane, soft feed." },
      ],
    },
    {
      id: "u13_rink_fill2", cat: "Gap Control", pos: ["D"], d: 2,
      type: "drag-target",
      q: "A forward is coming at you with speed through the neutral zone. Drag to your ideal gap.",
      tip: "Stay 1-2 stick lengths away, angle them toward the boards, stick in the lane.",
      rink: {
        view: "left", zone: "neutral-zone",
        markers: [
          { type: "attacker", x: 240, y: 120, label: "X" },
          { type: "defender", x: 180, y: 150, label: "YOU" },
        ],
      },
      puckStart: { x: 180, y: 150 },
      targets: [
        { x: 220, y: 130, radius: 32, verdict: "best",
          feedback: "✓ Tight gap, angling them outside, stick available. Classic D read." },
        { x: 110, y: 150, radius: 40, verdict: "worst",
          feedback: "Way too passive. You just gave them the whole neutral zone." },
      ],
    },
    {
      id: "u13_rink_fill3", cat: "Zone Entry", pos: ["F"], d: 2,
      type: "hot-spots",
      q: "You have the puck at the offensive blue line with clean speed. Tap every good entry option.",
      tip: "Carry (yourself), drop pass (to a trailer), chip (behind D). Dump back into your own zone is wrong.",
      rink: {
        view: "right", zone: "neutral-zone",
        markers: [
          { type: "attacker", x: 400, y: 150, label: "YOU" },
          { type: "defender", x: 440, y: 150 },
          { type: "teammate", x: 360, y: 210, label: "F2" },
        ],
      },
      spots: [
        { x: 500, y: 80, correct: true,
          msg: "✓ Chip-and-chase — behind the D. Good if they're tight." },
        { x: 370, y: 200, correct: true,
          msg: "✓ Drop to F2 — lets you carry through with speed." },
        { x: 150, y: 150, correct: false,
          msg: "Dumping back into your own zone? No. You had speed." },
      ],
    },
    {
      id: "u13_rink_fill4", cat: "Goaltending", pos: ["G"], d: 2,
      type: "pov-mc",
      q: "It's 2-on-1. The defender is playing the pass. What's your priority?",
      choices: [
        "Play the shooter — square up, get to the top of the crease.",
        "Drop into butterfly early and slide.",
        "Wait to see what they do.",
        "Come out aggressively to challenge.",
      ],
      correct: 0,
      tip: "When your D is taking the pass, they're giving you the shooter. Square up, challenge the angle — don't get caught moving.",
      pov: {
        povRole: "goalie",
        camera: { x: 558, y: 150, z: 18, lookAt: { x: 420, y: 150 } },
        prompt: "2-on-1 coming. Your read.",
        markers: [
          { type: "attacker", x: 440, y: 120, label: "shooter" },
          { type: "attacker", x: 440, y: 200, label: "X" },
          { type: "defender", x: 470, y: 180, label: "D" },
        ],
      },
    },
  ],

  "U15 / Bantam": [
    {
      id: "u15_rink_fill2", cat: "Systems Play", pos: ["F","D"], d: 2,
      type: "drag-place",
      q: "Set up the 2-1-2 forecheck from a dump-in. Drag each forechecker to their spot.",
      tip: "2-1-2: F1 + F2 pressure the corners, F3 reads mid, D1 + D2 hold the blue line.",
      rink: {
        view: "right", zone: "off-zone",
        markers: [
          { type: "goalie", x: 560, y: 150 },
        ],
      },
      puckStart: { x: 555, y: 110 },
      targets: [
        { x: 535, y: 70, radius: 36, verdict: "best",
          feedback: "F1 — first on the puck in the strong-side corner." },
        { x: 500, y: 150, radius: 36, verdict: "good",
          feedback: "F3 — high slot support, reads the play." },
        { x: 420, y: 100, radius: 36, verdict: "good",
          feedback: "D1 — strong-side blue line, ready to step up." },
      ],
    },
  ],

  "U18 / Midget": [
    {
      id: "u18r3", cat: "Decision-Making", pos: ["F"], d: 2,
      type: "hot-spots",
      q: "Power play, 5-on-4, set up in the offensive zone. Tap every spot where a one-timer becomes dangerous.",
      tip: "One-timer zones = the far-side dot and the bumper slot. Low walls only work if the defender strong-sides the puck.",
      rink: {
        view: "right", zone: "off-zone",
        markers: [
          { type: "teammate", x: 430, y: 150, label: "QB" },
          { type: "goalie", x: 560, y: 150 },
        ],
      },
      spots: [
        { x: 500, y: 220, correct: true,
          msg: "✓ Far-side dot — classic one-timer spot. Shot from the QB travels cross-ice to you." },
        { x: 510, y: 150, correct: true,
          msg: "✓ Bumper position (high slot) — live redirect or one-timer from a seam feed." },
        { x: 540, y: 90, correct: false,
          msg: "Near-side half-wall is a feed spot, not a shooter spot on this look." },
      ],
    },
    {
      id: "u18r4", cat: "Transition Game", pos: ["F","D"], d: 2,
      type: "sequence-rink",
      q: "Rebuild the fastest breakout on this regroup. Tap players in order 1 → 4.",
      tip: "D retrieves (1) → D-to-D reverse (2) → strong-side winger (3) → stretch to the F3 high (4).",
      rink: { view: "left" },
      markers: [
        { type: "defender", x: 60, y: 200, label: "D1", order: 1 },
        { type: "defender", x: 80, y: 100, label: "D2", order: 2 },
        { type: "teammate", x: 180, y: 40, label: "LW", order: 3 },
        { type: "teammate", x: 280, y: 170, label: "C", order: 4 },
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
console.log(`More rink: ${added} added, ${skipped} skipped.`);
