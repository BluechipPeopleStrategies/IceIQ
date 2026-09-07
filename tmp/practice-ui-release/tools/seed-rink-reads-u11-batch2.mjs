// Seeds 50 more U11 visual rink-read questions into src/data/questions.json.
// Idempotent: skips ids that already exist.
//
//   node tools/seed-rink-reads-u11-batch2.mjs
//
// Batch 2 of the visual on-ice reads project. Adds 50 questions across:
//   Defense       (12) — gap, coverage, net-front, weak-side rotation
//   Breakouts     ( 8) — D-to-D, reverse, stretch, center support
//   OZ / Cycle    (10) — cross-ice feed, point options, slot fill, dump
//   Forecheck     ( 6) — F1 angle, F2 support, rotation, stick-on-stick
//   Rush reads    ( 7) — 1-on-1, 2-on-1, 3-on-2, drop, late trailer
//   Special sit   ( 7) — PK / PP / faceoff / shell
//
// Formats split:  lane-select 13, hot-spots 13, pov-pick 12, drag-target 12.
//
// Multi-age tagging (conservative per session direction):
//   U9 + U11 + U13  — only true universal vision/pass reads (5 of 50)
//   U11 + U13       — default (37 of 50)
//   U11 only        — concepts U9 hasn't been taught + complex reads (8 of 50)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const qPath = path.join(here, "..", "src", "data", "questions.json");

const UNIVERSAL = ["U9 / Novice", "U11 / Atom", "U13 / Peewee"];
const STANDARD  = ["U11 / Atom", "U13 / Peewee"];
const U11_ONLY  = ["U11 / Atom"];

// Coordinate factories — keep marker creation tight + readable below.
const goalie    = (x = 560, y = 150) => ({ type: "goalie", x, y });
const teammate  = (x, y, label)      => ({ type: "teammate", x, y, label });
const attacker  = (x, y, label)      => ({ type: "attacker", x, y, label });
const defender  = (x, y, label)      => label
  ? { type: "defender", x, y, label }
  : { type: "defender", x, y };

const QUESTIONS = [

  // ══════════════════════════════════════════════════════════════════════
  // DEFENSE READS (12)
  // ══════════════════════════════════════════════════════════════════════
  {
    id: "u11_rr_13", cat: "Gap Control", pos: ["D"], d: 2, type: "drag-target",
    levels: STANDARD,
    q: "Carrier is wide, picking up speed at centre ice. You're the lone D — where do you set your gap at the blue line?",
    tip: "Tight gap, mid-lane. Step up before they cross the line so they can't carry it in clean.",
    rink: { view: "right", zone: "neutral-zone", markers: [
      attacker(390, 215, "X"), defender(440, 175, "YOU"), goalie(),
    ]},
    puckStart: { x: 440, y: 175 },
    targets: [
      { x: 410, y: 195, radius: 28, verdict: "best",  feedback: "✓ Tight gap at the line. They have to chip and chase or take it wide and lose speed." },
      { x: 510, y: 175, radius: 28, verdict: "worst", feedback: "Backed in 30 feet. They walk in clean with the puck on a string." },
    ],
  },
  {
    id: "u11_rr_14", cat: "Coverage", pos: ["D"], d: 2, type: "hot-spots",
    levels: STANDARD,
    q: "Cycle in your D-zone. Their F1 has the puck below the goal line. You're the strong-side D — where?",
    tip: "Stay above the puck, sealed against the boards. Don't get pulled below the goal line.",
    rink: { view: "right", zone: "def-zone", markers: [
      attacker(560, 200, "F1"), goalie(),
    ]},
    spots: [
      { x: 540, y: 175, correct: true,  msg: "✓ Above the puck, between F1 and the slot. You take away the centring lane." },
      { x: 558, y: 215, correct: false, msg: "Below the goal line. You can't defend the slot from here — pass to the front is wide open." },
      { x: 500, y: 145, correct: false, msg: "Way too high — that's the slot. Nobody's pinning F1 to the wall." },
    ],
  },
  {
    id: "u11_rr_15", cat: "Defensive Zone", pos: ["D"], d: 3, type: "drag-target",
    levels: U11_ONLY,
    q: "Their D pinches in. Loose puck on the half-wall, your wing fights it free. You're the weak-side D. Where do you fill?",
    tip: "When their D pinches and a forward gets caught up, the weak-side D rotates UP to cover. Don't stay locked at the post.",
    rink: { view: "right", zone: "def-zone", markers: [
      teammate(545, 95, "F1"), defender(420, 90, "X-D"),
      teammate(540, 215, "D1"), goalie(),
    ]},
    puckStart: { x: 540, y: 215 },
    targets: [
      { x: 430, y: 165, radius: 28, verdict: "best",  feedback: "✓ Up to high-slot / point area. You pick up their pinching D before it becomes a chance against." },
      { x: 555, y: 145, radius: 28, verdict: "worst", feedback: "Stuck at the net — you abandoned the high man. Goalie reads it but the high shot is wide open." },
    ],
  },
  {
    id: "u11_rr_16", cat: "Net-Front", pos: ["D"], d: 2, type: "drag-target",
    levels: STANDARD,
    q: "Point shot incoming. Their F is parked in front of your goalie. Where do you box them out?",
    tip: "Body between attacker and the puck. Stick down in their lane. Don't let them turn and tip.",
    rink: { view: "right", zone: "def-zone", markers: [
      teammate(415, 150, "X-D"), attacker(540, 150, "X-F"),
      defender(525, 165, "YOU"), goalie(),
    ]},
    puckStart: { x: 525, y: 165 },
    targets: [
      { x: 538, y: 150, radius: 26, verdict: "best",  feedback: "✓ Sealed between attacker and goalie. Goalie sees the shot, no tip available." },
      { x: 555, y: 175, radius: 26, verdict: "worst", feedback: "Behind your own attacker. They turn into the slot and tip the shot in." },
    ],
  },
  {
    id: "u11_rr_17", cat: "Blue Line Decisions", pos: ["D"], d: 3, type: "pov-pick",
    levels: U11_ONLY,
    q: "Pinching at the blue line on a loose puck. Their winger is already past you on the wall. Read?",
    tip: "If a forward is already past you AND your support isn't there, retreat. Pinching needs a backstop.",
    pov: { povRole: "skater",
      camera: { x: 410, y: 80, z: 18, lookAt: { x: 470, y: 150 } },
      prompt: "Pinch or retreat?",
      markers: [ attacker(440, 90, "X"), goalie() ],
    },
    targets: [
      { id: "pinch",   x: 440, y: 90,  radius: 24, correct: false, msg: "X is already past — pinching loses the foot race and you're going the wrong way on a 2-on-1." },
      { id: "retreat", x: 380, y: 175, radius: 26, correct: true,  msg: "✓ Retreat, get back to gap. Pinch only when you'll win the puck cleanly." },
    ],
  },
  {
    id: "u11_rr_18", cat: "Defense", pos: ["D"], d: 2, type: "drag-target",
    levels: STANDARD,
    q: "2-on-1 against, you're the lone D. Their carrier is wide, winger inside. What's your spot?",
    tip: "Take away the pass. Goalie has the shooter. Stick in the seam, body in the lane.",
    rink: { view: "right", zone: "def-zone", markers: [
      attacker(440, 215, "X1"), attacker(450, 105, "X2"),
      defender(490, 160, "YOU"), goalie(),
    ]},
    puckStart: { x: 490, y: 160 },
    targets: [
      { x: 475, y: 150, radius: 28, verdict: "best",  feedback: "✓ Centred, stick in the passing lane. Carrier has to shoot — that's the goalie's job." },
      { x: 460, y: 215, radius: 28, verdict: "worst", feedback: "You jumped the carrier — pass goes cross-ice and X2 has a tap-in." },
    ],
  },
  {
    id: "u11_rr_19", cat: "Coverage", pos: ["D", "F"], d: 2, type: "hot-spots",
    levels: STANDARD,
    q: "3-on-2 against you and your D-partner. Carrier's middle, two wings wide. You're the weak-side D — who?",
    tip: "Weak-side D takes the weak-side wing. Your partner stays mid-lane on the carrier.",
    rink: { view: "right", zone: "def-zone", markers: [
      attacker(440, 150, "X1"), attacker(440, 95,  "X2"), attacker(440, 215, "X3"),
      teammate(490, 150, "D1"), goalie(),
    ]},
    spots: [
      { x: 470, y: 95,  correct: true,  msg: "✓ Pick up the weak-side wing. D1 has the carrier, you cover X2 — that's a 1-on-1 now." },
      { x: 480, y: 150, correct: false, msg: "Doubling on the carrier. Both wings are now wide open for a cross-ice feed." },
      { x: 540, y: 150, correct: false, msg: "You retreated all the way. They walk in 3-on-2 with no resistance until the slot." },
    ],
  },
  {
    id: "u11_rr_20", cat: "Defense", pos: ["D"], d: 2, type: "drag-target",
    levels: STANDARD,
    q: "Carrier driving the wall in your zone. You're stick-side. Stick on puck or body on body?",
    tip: "Stick first. If you commit your body and they cut back, you're skating to the wrong place.",
    rink: { view: "right", zone: "def-zone", markers: [
      attacker(515, 220, "X"), defender(500, 195, "YOU"), goalie(),
    ]},
    puckStart: { x: 500, y: 195 },
    targets: [
      { x: 510, y: 210, radius: 28, verdict: "best",  feedback: "✓ Stick on puck, body angled to the wall. They have to dump or get walled off." },
      { x: 530, y: 220, radius: 28, verdict: "worst", feedback: "All-in body check. They cut back inside and you're chasing. Slot opens up." },
    ],
  },
  {
    id: "u11_rr_21", cat: "Coverage", pos: ["D"], d: 2, type: "hot-spots",
    levels: STANDARD,
    q: "Defensive-zone faceoff loss to your right. You're the right-side D. Where do you go first?",
    tip: "Lost faceoff = beat your man to the slot. Don't watch the puck, find your check.",
    rink: { view: "right", zone: "def-zone", markers: [
      attacker(470, 205, "X-LW"), attacker(490, 130, "X-D"),
      teammate(485, 215, "C"), goalie(),
    ]},
    spots: [
      { x: 480, y: 130, correct: true,  msg: "✓ Box out the high X-D before they can shoot. That's your immediate threat off a lost draw." },
      { x: 480, y: 200, correct: false, msg: "C is already on the wall battle. You're doubling up and leaving the high shot wide open." },
      { x: 555, y: 145, correct: false, msg: "Goalie covers net. You're looking for the next threat coming in, not standing on the goal line." },
    ],
  },
  {
    id: "u11_rr_22", cat: "Defense", pos: ["F", "D"], d: 3, type: "pov-pick",
    levels: U11_ONLY,
    q: "Carrier looking up ice — eyes on the strong-side wing, hands cocked for a pass. Where's the read?",
    tip: "Read the carrier's eyes AND their stick. If they're eyeing one option but stick says another, trust the stick.",
    pov: { povRole: "defender",
      camera: { x: 410, y: 150, z: 16, lookAt: { x: 480, y: 150 } },
      prompt: "Which lane to take away?",
      markers: [
        attacker(465, 145, "X"), teammate(530, 95, "X-W1"), teammate(525, 215, "X-W2"),
      ],
    },
    targets: [
      { id: "strong", x: 530, y: 95,  radius: 24, correct: false, msg: "Their eyes are decoy. The stick was set for a back-side dish — strong-side was bait." },
      { id: "weak",   x: 525, y: 215, radius: 24, correct: true,  msg: "✓ The stick angle gave it away. Cut off the back-side feed and force the play wide." },
    ],
  },
  {
    id: "u11_rr_23", cat: "Defense", pos: ["F"], d: 2, type: "drag-target",
    levels: STANDARD,
    q: "Last man back on a rush. Carrier's flying down the middle. Where do you cut them off?",
    tip: "Last forward back is a defender. Take the inside lane — never let them through the middle.",
    rink: { view: "right", zone: "neutral-zone", markers: [
      attacker(395, 150, "X"), defender(450, 150, "YOU"), goalie(),
    ]},
    puckStart: { x: 450, y: 150 },
    targets: [
      { x: 425, y: 150, radius: 28, verdict: "best",  feedback: "✓ Inside, mid-lane. They have to go wide and lose speed — gives the D time to set." },
      { x: 460, y: 100, radius: 28, verdict: "worst", feedback: "You drifted to the wing. Carrier walks down the middle with all the time in the world." },
    ],
  },
  {
    id: "u11_rr_24", cat: "Defensive Zone", pos: ["D"], d: 2, type: "hot-spots",
    levels: STANDARD,
    q: "Loose puck behind your net. You're retrieving. Your partner is below the dot on the strong side. Where do they need you?",
    tip: "If you're retrieving, partner needs to be your safety valve — net front, ready to reverse if forecheck closes.",
    rink: { view: "right", zone: "def-zone", markers: [
      teammate(580, 175, "YOU"), defender(540, 200, "X-F"),
      teammate(540, 95, "P"), goalie(),
    ]},
    spots: [
      { x: 540, y: 145, correct: true,  msg: "✓ Net-front strong-side support. You can reverse to them if the forecheck pins you." },
      { x: 410, y: 195, correct: false, msg: "Way too high. You can't reverse to a partner at the point — too far, too risky." },
      { x: 555, y: 220, correct: false, msg: "Same side as the forechecker. You'll just hit them with a reverse." },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════
  // BREAKOUTS / TRANSITION (8)
  // ══════════════════════════════════════════════════════════════════════
  {
    id: "u11_rr_25", cat: "Breakouts", pos: ["D"], d: 2, type: "lane-select",
    levels: STANDARD,
    q: "Forecheck pinning the strong side. Your partner is open across the ice. Best pass?",
    tip: "When the strong side gets sealed, D-to-D resets the breakout to the weak side every time.",
    rink: { view: "right", zone: "def-zone", markers: [
      teammate(555, 215, "YOU"), defender(540, 200, "F1"),
      teammate(555, 95, "D2"), goalie(),
    ]},
    lanes: [
      { x1: 555, y1: 200, x2: 470, y2: 220, clear: false, msg: "Up the wall — F2 is already there. Turnover at the goal line." },
      { x1: 555, y1: 195, x2: 555, y2: 105, clear: true,  msg: "✓ D-to-D behind your net. Resets the play, partner has time and space." },
    ],
  },
  {
    id: "u11_rr_26", cat: "Breakouts", pos: ["D"], d: 3, type: "lane-select",
    levels: U11_ONLY,
    q: "F1 is on top of you. Two outlets — strong-side wall and reverse to behind the net. Which?",
    tip: "If the wall is bottled up AND you have a partner behind, REVERSE — quick changes of direction beat brute force.",
    rink: { view: "right", zone: "def-zone", markers: [
      teammate(545, 175, "YOU"), defender(525, 175, "F1"),
      teammate(540, 100, "W1"), defender(515, 110, "F2"),
      teammate(580, 145, "D2"), goalie(),
    ]},
    lanes: [
      { x1: 545, y1: 170, x2: 540, y2: 105, clear: false, msg: "Wing is blanketed. Pass dies in coverage." },
      { x1: 545, y1: 180, x2: 580, y2: 145, clear: true,  msg: "✓ Reverse to D2 behind the net. Resets pressure, partner has new angle." },
    ],
  },
  {
    id: "u11_rr_27", cat: "Transition", pos: ["F"], d: 2, type: "pov-pick",
    levels: UNIVERSAL,
    q: "You're flying up the boards on a stretch. Your defender hit you with a long pass. What's the play ahead?",
    tip: "Look up before the pass arrives. If a teammate is open, you're already turning your hips — that's a one-touch.",
    pov: { povRole: "skater",
      camera: { x: 410, y: 95, z: 20, lookAt: { x: 510, y: 150 } },
      prompt: "Read ahead — pass or carry?",
      markers: [
        teammate(490, 215, "C"), defender(480, 220),
        teammate(530, 105, "RW"), goalie(),
      ],
    },
    targets: [
      { id: "carry", x: 480, y: 95, radius: 22, correct: true,  msg: "✓ Carry — you're already in stride and the back-side defender is high. Straight to the net." },
      { id: "passC", x: 490, y: 215, radius: 24, correct: false, msg: "C is shadowed. Throwing it across-ice loses your speed and gives away the entry." },
    ],
  },
  {
    id: "u11_rr_28", cat: "Breakouts", pos: ["F"], d: 2, type: "hot-spots",
    levels: STANDARD,
    q: "Your D has the puck behind the net. You're the centre. Where's your support spot?",
    tip: "Centre is the safety valve. Mid-zone, available to both D, ready to chip the puck or take a pass through middle.",
    rink: { view: "right", zone: "def-zone", markers: [
      teammate(555, 175, "D"), goalie(),
    ]},
    spots: [
      { x: 470, y: 150, correct: true,  msg: "✓ Mid-zone, mid-ice. D has you as a clean middle option for a pass or chip-out." },
      { x: 410, y: 200, correct: false, msg: "Too far up — you're a stretch option but not a breakout outlet. D needs you closer." },
      { x: 540, y: 95,  correct: false, msg: "You're up the wall — that's a winger's spot, not a centre's. D has nobody to pass through middle." },
    ],
  },
  {
    id: "u11_rr_29", cat: "Breakouts", pos: ["D"], d: 2, type: "lane-select",
    levels: STANDARD,
    q: "Forechecker between you and your wing on the wall. Wing or middle pass?",
    tip: "When the wall is blocked, look middle. Centre is usually open if the forecheck is committed to the wall.",
    rink: { view: "right", zone: "def-zone", markers: [
      teammate(550, 195, "YOU"), defender(510, 175, "F1"),
      teammate(545, 95, "W"), teammate(470, 150, "C"), goalie(),
    ]},
    lanes: [
      { x1: 550, y1: 190, x2: 545, y2: 100, clear: false, msg: "F1 is right in this lane. Pick-off, breakaway against." },
      { x1: 545, y1: 195, x2: 475, y2: 150, clear: true,  msg: "✓ Centre is open in middle ice. Quick pass, then C transitions up." },
    ],
  },
  {
    id: "u11_rr_30", cat: "Transition", pos: ["F", "D"], d: 2, type: "pov-pick",
    levels: STANDARD,
    q: "Regroup in the neutral zone. Strong side has pressure, weak side has space. Where do you direct the puck?",
    tip: "If one side has pressure and the other has space, you change sides every time. That's what regroups are for.",
    pov: { povRole: "skater",
      camera: { x: 420, y: 150, z: 18, lookAt: { x: 470, y: 150 } },
      prompt: "Pass to who?",
      markers: [
        teammate(465, 100, "RW"), defender(475, 110),
        teammate(465, 215, "LW"),
      ],
    },
    targets: [
      { id: "RW", x: 465, y: 100, radius: 24, correct: false, msg: "RW is locked up. Pass goes through coverage." },
      { id: "LW", x: 465, y: 215, radius: 24, correct: true,  msg: "✓ Weak-side LW has open ice. Switch the attack and they're skating with speed." },
    ],
  },
  {
    id: "u11_rr_31", cat: "Transition", pos: ["F"], d: 2, type: "hot-spots",
    levels: STANDARD,
    q: "Puck's about to come loose at your blue line. You're the late forward. Where do you support?",
    tip: "Late forward = high-middle support. Be available for a chip up or a quick centre play.",
    rink: { view: "right", zone: "neutral-zone", markers: [
      teammate(420, 200, "D"), goalie(),
    ]},
    spots: [
      { x: 460, y: 150, correct: true,  msg: "✓ Mid-ice, available in both directions. Chip out or quick-up pass — you're the link." },
      { x: 540, y: 95,  correct: false, msg: "Already past the puck. If we lose it here, you're 50 feet from the play." },
      { x: 410, y: 100, correct: false, msg: "Off the strong side. You're not a supporting option — D has no quick-up to you." },
    ],
  },
  {
    id: "u11_rr_32", cat: "Breakouts", pos: ["D"], d: 2, type: "pov-pick",
    levels: STANDARD,
    q: "Retrieved the puck behind net. Two options — quick-up to your winger, or chip glass-and-out. Read?",
    tip: "If the winger has a clean lane and you have time, pass. If the wall is bottled and you don't, glass-and-out beats a turnover.",
    pov: { povRole: "skater",
      camera: { x: 580, y: 175, z: 14, lookAt: { x: 540, y: 100 } },
      prompt: "Pass or chip?",
      markers: [
        teammate(540, 95, "W"), defender(530, 110),
      ],
    },
    targets: [
      { id: "pass", x: 540, y: 95,  radius: 24, correct: false, msg: "F1 is right on top of your winger. Pass dies in coverage." },
      { id: "chip", x: 470, y: 60,  radius: 24, correct: true,  msg: "✓ Glass and out. Beats the forecheck cleanly, neutral zone reset." },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════
  // OZ ENTRY / CYCLE / POINT (10)
  // ══════════════════════════════════════════════════════════════════════
  {
    id: "u11_rr_33", cat: "Cycle Play", pos: ["F"], d: 2, type: "lane-select",
    levels: STANDARD,
    q: "You've cycled the puck low and want to feed the slot. Two passing lanes — across or up to the point.",
    tip: "If a teammate is unchecked in the slot, that's the chance. The point is the safe reset, not the scoring play.",
    rink: { view: "right", zone: "off-zone", markers: [
      teammate(550, 220, "YOU"), defender(530, 215),
      teammate(500, 150, "C"), teammate(415, 195, "D"), goalie(),
    ]},
    lanes: [
      { x1: 550, y1: 220, x2: 500, y2: 155, clear: true,  msg: "✓ Cross-ice to the slot — C is unchecked. One-timer chance." },
      { x1: 555, y1: 215, x2: 420, y2: 195, clear: false, msg: "Point is the safe play but the slot was wide open. You bailed on the chance." },
    ],
  },
  {
    id: "u11_rr_34", cat: "Cycle Play", pos: ["F"], d: 2, type: "pov-pick",
    levels: STANDARD,
    q: "You've got the puck on the half-wall. Two cycle options — drop low, or curl up to the high slot.",
    tip: "Read where their D's are pinching. If the strong-side D commits low, curl high. If they stay home, drop low.",
    pov: { povRole: "skater",
      camera: { x: 520, y: 80, z: 14, lookAt: { x: 540, y: 175 } },
      prompt: "Drop low or curl high?",
      markers: [
        teammate(550, 220, "F2"), defender(540, 200, "X-D"),
        teammate(465, 145, "F3"), goalie(),
      ],
    },
    targets: [
      { id: "low",  x: 550, y: 220, radius: 24, correct: false, msg: "X-D collapsed low. You'd be passing into traffic — turnover." },
      { id: "high", x: 465, y: 145, radius: 24, correct: true,  msg: "✓ Their D went low so the high slot is wide open. F3 has time." },
    ],
  },
  {
    id: "u11_rr_35", cat: "Cycle Play", pos: ["F"], d: 2, type: "hot-spots",
    levels: STANDARD,
    q: "Your linemates are working a low cycle. You're F3. Where do you set up to give them a high option?",
    tip: "F3 stays high — slot or just below the point — to give the cycle a release valve and protect against the rush back.",
    rink: { view: "right", zone: "off-zone", markers: [
      teammate(545, 220, "F1"), teammate(555, 95, "F2"), goalie(),
    ]},
    spots: [
      { x: 460, y: 150, correct: true,  msg: "✓ Slot/high-slot. Available for a feed AND first one back if it turns over." },
      { x: 410, y: 110, correct: false, msg: "Too high — you're a point option only, not a scoring threat. F3's job is dual." },
      { x: 540, y: 145, correct: false, msg: "Crashing the net front. F1 and F2 have the low rotations — you're crowding them." },
    ],
  },
  {
    id: "u11_rr_36", cat: "Blue Line Decisions", pos: ["D"], d: 2, type: "pov-pick",
    levels: STANDARD,
    q: "Walking the puck along the blue line. Lane to the net is clogged but a teammate's open low. Shoot or feed?",
    tip: "If the lane is blocked, don't force the shot. Move the puck and walk into a new lane.",
    pov: { povRole: "skater",
      camera: { x: 415, y: 195, z: 14, lookAt: { x: 540, y: 150 } },
      prompt: "Shoot or feed?",
      markers: [
        defender(450, 165), defender(490, 145),
        teammate(550, 100, "RW"), goalie(),
      ],
    },
    targets: [
      { id: "shoot", x: 558, y: 145, radius: 22, correct: false, msg: "Shot's blocked — two sticks in the lane. It's not getting through." },
      { id: "feed",  x: 550, y: 100, radius: 24, correct: true,  msg: "✓ Hit RW low. They walk into the open lane and you re-attack." },
    ],
  },
  {
    id: "u11_rr_37", cat: "Net-Front", pos: ["F"], d: 2, type: "drag-target",
    levels: STANDARD,
    q: "Teammate winding up for a point shot. You're crashing the net. Where do you finish your route?",
    tip: "Off the post, in the goalie's eyes, stick on the ice. Goalie can't see, you can tip — that's a chance.",
    rink: { view: "right", zone: "off-zone", markers: [
      teammate(415, 145, "D"), defender(540, 145, "X-D"),
      attacker(510, 165, "YOU"), goalie(),
    ]},
    puckStart: { x: 510, y: 165 },
    targets: [
      { x: 545, y: 165, radius: 26, verdict: "best",  feedback: "✓ Off the post, in the eyes. Screen + tip — every D's worst nightmare." },
      { x: 525, y: 110, radius: 26, verdict: "worst", feedback: "Wrong side, too high. No screen, no tip. Goalie sees it the whole way." },
    ],
  },
  {
    id: "u11_rr_38", cat: "Offensive Zone", pos: ["F"], d: 2, type: "drag-target",
    levels: STANDARD,
    q: "Point shot's coming. You're a slot fill-in (not the screen). Where do you go?",
    tip: "Slot fill-in finds the rebound. Stick down, ready to whack at anything that pops out.",
    rink: { view: "right", zone: "off-zone", markers: [
      teammate(415, 195, "D"), attacker(540, 145, "F1-screen"),
      attacker(495, 175, "YOU"), goalie(),
    ]},
    puckStart: { x: 495, y: 175 },
    targets: [
      { x: 510, y: 155, radius: 26, verdict: "best",  feedback: "✓ Mid-slot, stick down. Rebound territory — most goals come from here." },
      { x: 555, y: 220, radius: 26, verdict: "worst", feedback: "Behind the net. No rebound goes here — you're invisible to the play." },
    ],
  },
  {
    id: "u11_rr_39", cat: "Forecheck", pos: ["F"], d: 2, type: "drag-target",
    levels: STANDARD,
    q: "Teammate's about to dump the puck deep. You're F1 chasing. What angle do you take?",
    tip: "Dump-and-chase, F1 takes the inside lane to cut off the strong-side wall. Force them to reverse or get hit.",
    rink: { view: "right", zone: "off-zone", markers: [
      teammate(450, 95, "F2"), goalie(),
    ]},
    puckStart: { x: 450, y: 95 },
    targets: [
      { x: 530, y: 110, radius: 28, verdict: "best",  feedback: "✓ Inside angle. You arrive with their D, cut off the wall, force a reverse." },
      { x: 510, y: 70,  radius: 28, verdict: "worst", feedback: "Outside angle. Their D walks the puck up the wall untouched." },
    ],
  },
  {
    id: "u11_rr_40", cat: "Zone Entry", pos: ["F"], d: 3, type: "pov-pick",
    levels: U11_ONLY,
    q: "Carrying the puck into the OZ. A trailer is right behind you, no defender on them. Drop or carry?",
    tip: "Drop pass with a trailer is gold — you take the D with you and your trailer walks into open ice.",
    pov: { povRole: "skater",
      camera: { x: 405, y: 150, z: 16, lookAt: { x: 480, y: 150 } },
      prompt: "Drop or drive?",
      markers: [
        defender(450, 145, "X-D"), defender(440, 200, "X-D2"),
        teammate(390, 175, "T"),
      ],
    },
    targets: [
      { id: "drop",  x: 390, y: 175, radius: 24, correct: true,  msg: "✓ Drop pass. Both D step up to you, trailer walks in clean." },
      { id: "drive", x: 470, y: 150, radius: 22, correct: false, msg: "You drove into two D. Got walled off, lost the chance." },
    ],
  },
  {
    id: "u11_rr_41", cat: "Cycle Play", pos: ["F"], d: 2, type: "lane-select",
    levels: STANDARD,
    q: "You're carrying the cycle low. Their forwards have collapsed. Bump it back up to the point or back into the wall?",
    tip: "When their forwards collapse low, the point is wide open. Reset to the D for a clean walk-and-shoot.",
    rink: { view: "right", zone: "off-zone", markers: [
      teammate(550, 215, "YOU"), defender(525, 200), defender(515, 175),
      teammate(415, 195, "D"), goalie(),
    ]},
    lanes: [
      { x1: 550, y1: 210, x2: 420, y2: 195, clear: true,  msg: "✓ Up to the D — clean reset. They walk into a quiet point with a shot lane." },
      { x1: 555, y1: 220, x2: 555, y2: 100, clear: false, msg: "Wall pass into a wall of bodies. Turnover at the goal line." },
    ],
  },
  {
    id: "u11_rr_42", cat: "Blue Line Decisions", pos: ["D"], d: 3, type: "lane-select",
    levels: U11_ONLY,
    q: "Walking the line for a shot. The defender's stick is high blocking the slot lane — what's open?",
    tip: "If the centre is taken away, walk into the seam between the D and the boards. That's the wide-side shot lane.",
    rink: { view: "right", zone: "off-zone", markers: [
      teammate(420, 150, "YOU"), defender(465, 130), goalie(),
    ]},
    lanes: [
      { x1: 425, y1: 150, x2: 558, y2: 145, clear: false, msg: "Stick's right in this lane — blocked." },
      { x1: 430, y1: 165, x2: 555, y2: 165, clear: true,  msg: "✓ Walk into the wider seam. Shot gets through clean to the goalie's stick side." },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════
  // FORECHECK / PRESSURE (6)
  // ══════════════════════════════════════════════════════════════════════
  {
    id: "u11_rr_43", cat: "Forecheck", pos: ["F"], d: 2, type: "drag-target",
    levels: STANDARD,
    q: "F1 forechecking a retrieval. The carrier already has their head up. Pressure or back off?",
    tip: "Head up = they've seen the pass. Don't run at them; take the lane away instead. F1 plays angle, not speed.",
    rink: { view: "right", zone: "off-zone", markers: [
      defender(560, 175, "X-D"), attacker(485, 145, "YOU"),
      teammate(465, 215, "F2"), goalie(),
    ]},
    puckStart: { x: 485, y: 145 },
    targets: [
      { x: 530, y: 175, radius: 28, verdict: "best",  feedback: "✓ Cut off the strong-side wall, force them up the boards into F2." },
      { x: 555, y: 175, radius: 28, verdict: "worst", feedback: "Ran straight at them. They saw it coming, made the easy pass past you." },
    ],
  },
  {
    id: "u11_rr_44", cat: "Forecheck", pos: ["F"], d: 2, type: "hot-spots",
    levels: STANDARD,
    q: "F1 has angled the carrier up the wall. You're F2. Where do you set up the trap?",
    tip: "F2 mid-lane high — close enough to support F1, in the lane to pick off a back-pass to their D.",
    rink: { view: "right", zone: "off-zone", markers: [
      teammate(540, 215, "F1"), attacker(530, 220, "X"), goalie(),
    ]},
    spots: [
      { x: 470, y: 195, correct: true,  msg: "✓ Mid-lane, high enough to take away the back-pass to D. F1 has support." },
      { x: 540, y: 105, correct: false, msg: "Way off the play. F1 has no support and any reverse to weak-side D is wide open." },
      { x: 555, y: 220, correct: false, msg: "Doubling on F1 — both of you on the same body. Pass over you and the play breaks down." },
    ],
  },
  {
    id: "u11_rr_45", cat: "Forecheck", pos: ["F"], d: 2, type: "drag-target",
    levels: STANDARD,
    q: "F1 is engaging the carrier on the wall. You're F2. What angle do you take in?",
    tip: "F2 angles in stick-on-stick — eliminates the pass option even if the carrier escapes F1.",
    rink: { view: "right", zone: "off-zone", markers: [
      teammate(540, 215, "F1"), attacker(545, 220, "X"),
      teammate(485, 175, "YOU"), goalie(),
    ]},
    puckStart: { x: 485, y: 175 },
    targets: [
      { x: 510, y: 200, radius: 28, verdict: "best",  feedback: "✓ Stick-on-stick angle. If carrier gets it past F1, you eat the puck." },
      { x: 470, y: 95,  radius: 28, verdict: "worst", feedback: "You went weak side — there's nobody supporting F1 and any pass back is uncovered." },
    ],
  },
  {
    id: "u11_rr_46", cat: "Forecheck", pos: ["F"], d: 2, type: "hot-spots",
    levels: STANDARD,
    q: "Pressure forced their D to rim it. Where does F3 get to?",
    tip: "F3 reads the rim. If it's coming up your strong side, swing high to seal it; if it's reversing, get back to the middle.",
    rink: { view: "right", zone: "off-zone", markers: [
      defender(580, 195, "X-D"), goalie(),
    ]},
    spots: [
      { x: 470, y: 95,  correct: true,  msg: "✓ Strong-side high — you can seal the rim or transition back if it reverses." },
      { x: 540, y: 100, correct: false, msg: "Too low — you'll get caught skating against the rim instead of meeting it." },
      { x: 410, y: 195, correct: false, msg: "Way too high — you're closer to centre than the puck. Useless on the rim." },
    ],
  },
  {
    id: "u11_rr_47", cat: "Forecheck", pos: ["F"], d: 3, type: "pov-pick",
    levels: U11_ONLY,
    q: "F1 first to a 50/50 puck. Their D is closing fast. Engage hard or chip out and reset?",
    tip: "If you don't have body position, chip out. Forcing a battle you can't win = turnover into a rush against.",
    pov: { povRole: "skater",
      camera: { x: 555, y: 195, z: 14, lookAt: { x: 540, y: 220 } },
      prompt: "Engage or chip?",
      markers: [ defender(545, 215, "X-D") ],
    },
    targets: [
      { id: "engage", x: 545, y: 215, radius: 22, correct: false, msg: "Lost the body position battle. They walk out with the puck behind you." },
      { id: "chip",   x: 470, y: 80,  radius: 24, correct: true,  msg: "✓ Chip glass and reset. Live to forecheck another shift." },
    ],
  },
  {
    id: "u11_rr_48", cat: "Forecheck", pos: ["F"], d: 2, type: "hot-spots",
    levels: STANDARD,
    q: "F1 went deep into a battle. You're F2 — what do you do as the rotation kicks in?",
    tip: "F2 becomes F1 when F1 commits. Take F1's old job — pressure on the puck, replace the angle.",
    rink: { view: "right", zone: "off-zone", markers: [
      teammate(555, 220, "F1"), attacker(540, 215, "X"), goalie(),
    ]},
    spots: [
      { x: 510, y: 195, correct: true,  msg: "✓ Step into F1's old role. Maintain pressure on the puck-side." },
      { x: 470, y: 95,  correct: false, msg: "You stayed home. F1 is alone in the battle and any escape is uncovered." },
      { x: 555, y: 220, correct: false, msg: "Crashed into F1 in the corner. Now you're both committed and there's nothing high." },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════
  // RUSH READS (7)
  // ══════════════════════════════════════════════════════════════════════
  {
    id: "u11_rr_49", cat: "Rush Reads", pos: ["F"], d: 2, type: "pov-pick",
    levels: STANDARD,
    q: "1-on-1 against the D. You've got speed, they're squared up. Shoot off the rush or drive wide?",
    tip: "If the D is squared and centred, shoot the moment the lane appears. Driving wide loses the angle.",
    pov: { povRole: "skater",
      camera: { x: 420, y: 150, z: 16, lookAt: { x: 540, y: 150 } },
      prompt: "Shoot or drive?",
      markers: [ defender(490, 150, "D"), goalie() ],
    },
    targets: [
      { id: "shoot", x: 558, y: 145, radius: 22, correct: true,  msg: "✓ Shot off the rush. Goalie hadn't squared up yet — corner pocket." },
      { id: "drive", x: 540, y: 95,  radius: 24, correct: false, msg: "Drove wide and got walled off. Lost the angle and the chance." },
    ],
  },
  {
    id: "u11_rr_50", cat: "Rush Reads", pos: ["F"], d: 2, type: "drag-target",
    levels: STANDARD,
    q: "3-on-2 rush. You're the wide winger on the strong side. Where's your route?",
    tip: "Wide winger drives the wall, hard. Pulls a D wide and opens up the slot for the centre.",
    rink: { view: "right", zone: "off-zone", markers: [
      teammate(420, 150, "C"), teammate(420, 200, "LW"),
      defender(490, 150, "D1"), defender(490, 200, "D2"),
      attacker(420, 100, "YOU"), goalie(),
    ]},
    puckStart: { x: 420, y: 100 },
    targets: [
      { x: 530, y: 95,  radius: 28, verdict: "best",  feedback: "✓ Drive the wall hard. Pulls D1 wide, opens the slot for the centre's shot." },
      { x: 480, y: 150, radius: 28, verdict: "worst", feedback: "You crashed the slot and now there's two attackers fighting for the same lane." },
    ],
  },
  {
    id: "u11_rr_51", cat: "Rush Reads", pos: ["F"], d: 3, type: "pov-pick",
    levels: U11_ONLY,
    q: "2-on-1, you're the carrier. Your winger crosses behind you to the strong side. What's the read?",
    tip: "Crossing 2-on-1 is built to fool the D. If they freeze on the cross, you SHOOT. If they follow the cross, you PASS.",
    pov: { povRole: "skater",
      camera: { x: 425, y: 215, z: 16, lookAt: { x: 540, y: 150 } },
      prompt: "Shoot or pass?",
      markers: [ defender(495, 175, "D"), teammate(485, 95, "W"), goalie() ],
    },
    targets: [
      { id: "shoot", x: 558, y: 145, radius: 22, correct: false, msg: "D froze on you, expecting the cross. Shot was open but you missed it." },
      { id: "pass",  x: 485, y: 95,  radius: 24, correct: true,  msg: "✓ D bit on the cross. Pass to the W on the back side — wide-open net." },
    ],
  },
  {
    id: "u11_rr_52", cat: "Rush Reads", pos: ["F"], d: 2, type: "hot-spots",
    levels: STANDARD,
    q: "You're the late forward on a 3-on-3 rush. The lead F is carrying. Where do you trail to?",
    tip: "Late F is the trailer. High-slot, available for a drop or a back-pass — and first one back if it turns over.",
    rink: { view: "right", zone: "off-zone", markers: [
      teammate(490, 150, "F1"), teammate(490, 100, "F2"),
      defender(540, 145), defender(540, 195), goalie(),
    ]},
    spots: [
      { x: 425, y: 150, correct: true,  msg: "✓ Trailer in the high slot. Drop pass option, back-pressure on transition." },
      { x: 540, y: 220, correct: false, msg: "Crashed the net front from behind. Useless — F1 won't pass back through traffic." },
      { x: 410, y: 95,  correct: false, msg: "Off the strong side. You're not a trailer, you're a third option F1 can't see." },
    ],
  },
  {
    id: "u11_rr_53", cat: "Rush Reads", pos: ["F"], d: 3, type: "pov-pick",
    levels: U11_ONLY,
    q: "Coming into the OZ, your trailer's calling for the drop. Defenders are square. Drop or carry?",
    tip: "If the D are square and committed to you, drop. The trailer walks into the open lane behind you.",
    pov: { povRole: "skater",
      camera: { x: 405, y: 150, z: 16, lookAt: { x: 480, y: 150 } },
      prompt: "Drop or carry?",
      markers: [
        defender(465, 145), defender(475, 195),
        teammate(390, 175, "T"),
      ],
    },
    targets: [
      { id: "drop",  x: 390, y: 175, radius: 24, correct: true,  msg: "✓ Drop. Both D committed forward to you — trailer walks in clean." },
      { id: "carry", x: 470, y: 150, radius: 22, correct: false, msg: "Drove into both D. Got separated from the puck before you could shoot." },
    ],
  },
  {
    id: "u11_rr_54", cat: "Rush Reads", pos: ["F"], d: 2, type: "drag-target",
    levels: STANDARD,
    q: "Rush against. F3 backchecking. Where do you cut into the play to support the D?",
    tip: "F3 takes the highest open attacker. Cut through the middle of the rush, not around it.",
    rink: { view: "right", zone: "neutral-zone", markers: [
      attacker(420, 150, "X1"), attacker(420, 95,  "X2"), attacker(420, 220, "X3"),
      defender(480, 150, "D1"), defender(480, 200, "D2"),
      teammate(380, 195, "YOU"), goalie(),
    ]},
    puckStart: { x: 380, y: 195 },
    targets: [
      { x: 410, y: 100, radius: 28, verdict: "best",  feedback: "✓ Cut through and pick up X2 — the highest unchecked attacker." },
      { x: 460, y: 175, radius: 28, verdict: "worst", feedback: "Doubled up on the carrier with D1. X2 and X3 are both unmarked for the cross." },
    ],
  },
  {
    id: "u11_rr_55", cat: "Rush Reads", pos: ["F"], d: 2, type: "hot-spots",
    levels: STANDARD,
    q: "Wide entry — your linemate carrying the puck along the wall. Where does the weak-side support set up?",
    tip: "Weak-side winger drives to the back post. That's the back-door tap-in if the carrier feeds across.",
    rink: { view: "right", zone: "off-zone", markers: [
      teammate(490, 95, "F1"), defender(485, 105),
      goalie(),
    ]},
    spots: [
      { x: 545, y: 195, correct: true,  msg: "✓ Back-post drive — back-door pass becomes a tap-in." },
      { x: 460, y: 150, correct: false, msg: "Slot looks like a scoring spot but on a wide entry there's nobody to feed you." },
      { x: 410, y: 195, correct: false, msg: "You stayed at the blue line — useless for a rush chance." },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════
  // SPECIAL SITUATIONS (7)
  // ══════════════════════════════════════════════════════════════════════
  {
    id: "u11_rr_56", cat: "Penalty Kill", pos: ["F", "D"], d: 3, type: "drag-target",
    levels: U11_ONLY,
    q: "PK in your zone. They're cycling on the strong side. You're the strong-side PK forward. Where?",
    tip: "PK box: strong-side F stays high, takes the strong-side point, doesn't chase below the dot.",
    rink: { view: "right", zone: "def-zone", markers: [
      attacker(545, 220, "X1"), teammate(540, 200, "D1"),
      attacker(420, 195, "X-D"), goalie(),
    ]},
    puckStart: { x: 470, y: 100 },
    targets: [
      { x: 460, y: 195, radius: 28, verdict: "best",  feedback: "✓ Strong-side high. You take away the point shot AND the seam pass to the slot." },
      { x: 540, y: 220, radius: 28, verdict: "worst", feedback: "Chased into the corner — you're now below the puck and out of the box." },
    ],
  },
  {
    id: "u11_rr_57", cat: "Penalty Kill", pos: ["F"], d: 3, type: "pov-pick",
    levels: U11_ONLY,
    q: "PK and you've got the puck on a clear. Two options — ice it down the strong side, or chip-and-chase up the middle. Which?",
    tip: "Icing down the wall = guaranteed clear, draw fresh PK. Chip-up only works if you have body position to chase.",
    pov: { povRole: "skater",
      camera: { x: 460, y: 200, z: 14, lookAt: { x: 410, y: 100 } },
      prompt: "Best play?",
      markers: [
        defender(470, 110, "X1"), defender(465, 140, "X2"),
      ],
    },
    targets: [
      { id: "ice", x: 540, y: 75, radius: 24, correct: true,  msg: "✓ Ice it down the wall. PK clear, fresh shift, reset the kill." },
      { id: "chip", x: 410, y: 100, radius: 22, correct: false, msg: "Two of theirs in the lane. Chip gets picked off — chance against." },
    ],
  },
  {
    id: "u11_rr_58", cat: "Power Play", pos: ["F", "D"], d: 3, type: "hot-spots",
    levels: U11_ONLY,
    q: "PP, 1-3-1 setup. The puck is on the half-wall strong side. You're the bumper. Where?",
    tip: "Bumper sits in the seam between their box and the net — feed lanes from the half-wall AND back to the point.",
    rink: { view: "right", zone: "off-zone", markers: [
      teammate(545, 220, "F1"), teammate(415, 150, "D"),
      teammate(540, 95,  "F3"), goalie(),
    ]},
    spots: [
      { x: 480, y: 150, correct: true,  msg: "✓ Bumper in the seam. Available from F1 on the wall AND from D at the point." },
      { x: 540, y: 145, correct: false, msg: "Net front is the screen's job, not the bumper. You took away your own seam." },
      { x: 415, y: 200, correct: false, msg: "Way off the play — bumper is a slot/seam role, not a corner." },
    ],
  },
  {
    id: "u11_rr_59", cat: "Power Play", pos: ["D"], d: 3, type: "drag-target",
    levels: U11_ONLY,
    q: "PP one-timer setup. The puck's about to come back to you at the point for the shot. Where do you settle for the release?",
    tip: "Off the strong-side hash. Open up to the puck so the one-timer is in stride, not stretching across your body.",
    rink: { view: "right", zone: "off-zone", markers: [
      teammate(545, 220, "F1"), goalie(),
    ]},
    puckStart: { x: 545, y: 220 },
    targets: [
      { x: 425, y: 195, radius: 28, verdict: "best",  feedback: "✓ Strong-side hash, hips open. One-timer is in stride, full velocity." },
      { x: 415, y: 95,  radius: 28, verdict: "worst", feedback: "Weak side. You'd have to reach across your body — the shot's a lob, not a one-timer." },
    ],
  },
  {
    id: "u11_rr_60", cat: "Defensive Zone", pos: ["F", "D"], d: 2, type: "hot-spots",
    levels: STANDARD,
    q: "Defensive faceoff lost to the strong-side wing. Where's your first move as the strong-side D?",
    tip: "Lost faceoff = beat the puck to the wall. Get into the shot lane before they can release.",
    rink: { view: "right", zone: "def-zone", markers: [
      teammate(485, 215, "C"), attacker(465, 205, "X-W"),
      attacker(485, 130, "X-D"), goalie(),
    ]},
    spots: [
      { x: 480, y: 190, correct: true,  msg: "✓ Get into the shot lane between X-W and the slot. Block-first mentality." },
      { x: 555, y: 145, correct: false, msg: "Retreated to the goalie. There's a free shot from the wall before you get there." },
      { x: 480, y: 130, correct: false, msg: "C has the high D — that's not your man on a lost draw." },
    ],
  },
  {
    id: "u11_rr_61", cat: "Offensive Zone", pos: ["F"], d: 2, type: "drag-target",
    levels: STANDARD,
    q: "Offensive zone faceoff WIN clean back. You're the strong-side winger. Where do you go?",
    tip: "Off a clean win, strong-side winger crashes the net for screens / tips / rebounds.",
    rink: { view: "right", zone: "off-zone", markers: [
      teammate(415, 195, "D"), teammate(485, 205, "C"),
      attacker(485, 215, "YOU"), goalie(),
    ]},
    puckStart: { x: 485, y: 215 },
    targets: [
      { x: 540, y: 165, radius: 26, verdict: "best",  feedback: "✓ Crash the net. D is winding up, you're the screen / tip / rebound man." },
      { x: 415, y: 95,  radius: 26, verdict: "worst", feedback: "Drifted to the weak-side point. You're nowhere near the action." },
    ],
  },
  {
    id: "u11_rr_62", cat: "Game Management", pos: ["F", "D"], d: 3, type: "drag-target",
    levels: U11_ONLY,
    q: "Up by one with 30 seconds left. They've pulled their goalie. You've got the puck behind your net. Where do you go?",
    tip: "Don't ice it — that's a faceoff in your zone. Carry the puck up the wall, eat seconds, only chip if pressured.",
    rink: { view: "right", zone: "def-zone", markers: [
      teammate(580, 175, "YOU"), defender(540, 200), goalie(),
    ]},
    puckStart: { x: 580, y: 175 },
    targets: [
      { x: 555, y: 95, radius: 28, verdict: "best",  feedback: "✓ Up the strong-side wall, controlled. Burns clock without the icing risk." },
      { x: 410, y: 150, radius: 28, verdict: "worst", feedback: "You iced it. Faceoff in your zone, no goalie for them — recipe for the tying goal." },
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
  qb[target].push(q);
  added++;
}

fs.writeFileSync(qPath, JSON.stringify(qb, null, 2) + "\n");
console.log(`Seeded ${added} U11 rink-read questions (batch 2). Skipped ${skipped} (already present).`);
console.log(`U11 / Atom total: ${qb[target].length}`);
