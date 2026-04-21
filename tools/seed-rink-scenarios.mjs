// Seeds 10 rink-type scenarios into src/data/questions.json.
// Idempotent: skips any id already present. Run once:
//   node tools/seed-rink-scenarios.mjs
//
// Scene schema: see src/Rink.jsx
// Zone keys: net-front, slot, high-slot, left-faceoff, right-faceoff,
//            left-corner, right-corner, behind-net, left-boards, right-boards,
//            left-point, right-point  (+ home-plate for zone-click)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const qPath = path.join(here, "..", "src", "data", "questions.json");

// ── Scenario authoring ─────────────────────────────────────────────────────

const SCENARIOS = [
  // ── U11 / Atom ──────────────────────────────────────────────────────────
  {
    level: "U11 / Atom",
    id: "u11rink2",
    cat: "Offensive Pressure",
    pos: ["F"],
    concept: "Seam pass recognition",
    d: 2,
    sit: "You're on the left half-wall with the puck. Your center is open in the slot, your right wing is weak-side, and one defender is closing from the high slot.",
    why: "Middle ice beats goalies. A seam pass to the slot turns a perimeter look into a high-danger chance — that's the #1 play from the half-wall.",
    tip: "Half-wall with the puck? First look is always to the middle.",
    scene: {
      team: [
        { id: "you1", label: "LW", zone: "left-boards", hasPuck: true, isYou: true },
        { id: "tm1", label: "C", zone: "slot" },
        { id: "tm2", label: "RW", zone: "right-boards" }
      ],
      opponents: [{ id: "op1", zone: "high-slot" }],
      puck: { zone: "left-boards", offsetX: 6, offsetY: 0 },
      showGoalie: true,
      showHomePlate: false,
      texts: [],
      arrows: [],
      flags: [],
      question: {
        mode: "choice",
        prompt: "You've got the puck on the half-wall. What's the best pass?",
        options: [
          { text: "Seam pass to the center in the slot",                 verdict: "correct", feedback: "Money play. Middle ice creates the highest-danger look." },
          { text: "D-to-D pass behind your own net to reset",            verdict: "wrong",   feedback: "You don't reset from the offensive zone — that's a pass back and a missed chance." },
          { text: "Blind cross-ice pass to the weak-side winger",        verdict: "wrong",   feedback: "Blind cross-ice passes get picked off and turn into breakaways the other way." },
          { text: "Rim it around to the other corner",                   verdict: "partial", feedback: "Safe, not dangerous. Keeps possession but you just skipped the best play available." }
        ]
      }
    }
  },
  {
    level: "U11 / Atom",
    id: "u11rink3",
    cat: "Offensive Pressure",
    pos: ["F"],
    concept: "Rebound support",
    d: 2,
    sit: "Your teammate is winding up for a shot from the half-wall. You don't have the puck and need to get to a spot where rebounds come out.",
    why: "Rebounds come to the slot and net-front. That's where you need to be — a stick length from the goalie, ready to bang one home.",
    tip: "Rebounds don't come to the corners. Get inside.",
    scene: {
      team: [
        { id: "tm1", label: "LW", zone: "left-boards", hasPuck: true },
        { id: "you1", label: "C", zone: "high-slot", isYou: true }
      ],
      opponents: [
        { id: "op1", zone: "slot" },
        { id: "op2", zone: "left-corner" }
      ],
      puck: { zone: "left-boards", offsetX: 6, offsetY: 0 },
      showGoalie: true,
      showHomePlate: true,
      texts: [],
      arrows: [],
      flags: [],
      question: {
        mode: "zone-click",
        prompt: "Click the best spot to be for a rebound chance.",
        zones: {
          correct: ["net-front", "slot"],
          partial: ["high-slot"],
          wrong: ["behind-net", "left-corner", "right-corner", "left-point", "right-point", "left-faceoff", "right-faceoff", "left-boards", "right-boards"]
        },
        feedback: {
          correct: "Net-front and slot are where rebounds live. Stick on the ice, ready to whack it.",
          partial: "High slot is okay for a second shot if the rebound pops out that way — but most rebounds come closer to the net.",
          wrong: "That spot's too far from the net. Rebounds don't travel that far."
        }
      }
    }
  },
  {
    level: "U11 / Atom",
    id: "u11rink4",
    cat: "Rush Reads",
    pos: ["F", "D"],
    concept: "Wide carry vs. chip",
    d: 2,
    sit: "You just crossed the blue line with the puck on the left side. A defender is closing hard from the middle. Your winger is trailing behind you.",
    why: "Wide carries protect the puck and buy time for your support to catch up. Cutting back into the defender is how you turn the puck over in the worst spot.",
    tip: "Wide and protect. Don't feed the D.",
    scene: {
      team: [
        { id: "you1", label: "LW", zone: "left-faceoff", hasPuck: true, isYou: true },
        { id: "tm1", label: "C", zone: "high-slot" }
      ],
      opponents: [{ id: "op1", zone: "slot" }],
      puck: { zone: "left-faceoff", offsetX: -8, offsetY: -6 },
      showGoalie: true,
      showHomePlate: false,
      texts: [],
      arrows: [],
      flags: [],
      question: {
        mode: "choice",
        prompt: "D is closing from the middle. What's the play?",
        options: [
          { text: "Carry wide into the corner and protect the puck",     verdict: "correct", feedback: "Wide carry keeps the puck safe and buys time for your linemates to catch up." },
          { text: "Cut back toward the middle to beat the defender",     verdict: "wrong",   feedback: "Cutting into the defender is how you lose the puck — now they're going the other way on a rush." },
          { text: "Chip it deep behind them and forecheck",              verdict: "partial", feedback: "Fine if you have no other read, but you had the time and space to carry. Chip is a last resort, not the first." },
          { text: "Blind pass back to the trailer",                      verdict: "wrong",   feedback: "Blind pass under pressure + no vision = giveaway." }
        ]
      }
    }
  },

  // ── U13 / Peewee ────────────────────────────────────────────────────────
  {
    level: "U13 / Peewee",
    id: "u13rink1",
    cat: "Offensive Pressure",
    pos: ["F"],
    concept: "Weak-side backdoor",
    d: 2,
    sit: "Your teammate has the puck in the left corner. You're the weak-side forward. Where do you drive?",
    why: "The backdoor of the slot is the most-open piece of ice when the puck is low in the far corner. Goalie has to track the puck — you arrive into nothing.",
    tip: "Puck low-far-side? Drive the backdoor.",
    scene: {
      team: [
        { id: "tm1", label: "LW", zone: "left-corner", hasPuck: true },
        { id: "you1", label: "RW", zone: "right-boards", isYou: true },
        { id: "tm2", label: "C", zone: "high-slot" }
      ],
      opponents: [
        { id: "op1", zone: "left-corner" },
        { id: "op2", zone: "slot" }
      ],
      puck: { zone: "left-corner", offsetX: 4, offsetY: 0 },
      showGoalie: true,
      showHomePlate: true,
      texts: [],
      arrows: [],
      flags: [],
      question: {
        mode: "zone-click",
        prompt: "Where do you drive as the weak-side winger?",
        zones: {
          correct: ["slot", "net-front"],
          partial: ["right-faceoff"],
          wrong: ["right-corner", "right-point", "behind-net", "left-corner", "left-point", "high-slot", "left-boards", "right-boards", "left-faceoff"]
        },
        feedback: {
          correct: "Backdoor. Puck in the far corner means the slot and net-front are wide open — that's where the seam pass goes.",
          partial: "Near the right dot is in the area but you want to arrive at the slot as a scoring threat, not just the faceoff dot.",
          wrong: "That's not the scoring lane here. When the puck's low-far-side, the backdoor is the read."
        }
      }
    }
  },
  {
    level: "U13 / Peewee",
    id: "u13rink2",
    cat: "Offensive Pressure",
    pos: ["F"],
    concept: "Point-shot net-front",
    d: 2,
    sit: "Your D winds up for a point shot. An opponent is tight on you at the net-front. What do you do?",
    why: "The net-front job on a point shot is non-negotiable: screen the goalie, stay for the rebound, tip anything in reach. Drifting off the net erases all three.",
    tip: "Point shot? You stay at the net. Period.",
    scene: {
      team: [
        { id: "tm1", label: "RD", zone: "right-point", hasPuck: true },
        { id: "you1", label: "C", zone: "net-front", isYou: true },
        { id: "tm2", label: "LW", zone: "left-faceoff" }
      ],
      opponents: [
        { id: "op1", zone: "net-front" },
        { id: "op2", zone: "slot" }
      ],
      puck: { zone: "right-point", offsetX: 0, offsetY: 6 },
      showGoalie: true,
      showHomePlate: true,
      texts: [],
      arrows: [],
      flags: [],
      question: {
        mode: "choice",
        prompt: "Your D is about to shoot. What do you do at the net-front?",
        options: [
          { text: "Hold your screen and box out for the rebound",        verdict: "correct", feedback: "That's the whole job. Block the goalie's eyes, stay strong on your stick, hunt the rebound." },
          { text: "Tip it if it comes in waist-high, otherwise screen",  verdict: "correct", feedback: "Same idea — tips and screens are both net-front work. Perfect." },
          { text: "Swing out to give the shooter a clearer lane",        verdict: "wrong",   feedback: "Clearer lane is worthless if there's no screen and no rebound threat. Stay home." },
          { text: "Peel to the corner for a missed shot",                verdict: "wrong",   feedback: "You just abandoned the best scoring area on the ice. Missed shots go wide — rebounds stay near the net." }
        ]
      }
    }
  },
  {
    level: "U13 / Peewee",
    id: "u13rink3",
    cat: "Defensive Zone",
    pos: ["F", "D"],
    concept: "Wall battle escape",
    d: 3,
    sit: "You have the puck on the left-side boards. A forechecker is on you hard. Your D is at the point, center is in the slot but covered.",
    why: "Under pressure on the wall, the reverse is the highest-success play: it uses your body as a shield, beats the F1 who has all his momentum going forward, and resets possession for your D.",
    tip: "Pressure on the wall? Reverse it and spin.",
    scene: {
      team: [
        { id: "you1", label: "LW", zone: "left-boards", hasPuck: true, isYou: true },
        { id: "tm1", label: "LD", zone: "left-point" },
        { id: "tm2", label: "C", zone: "slot" }
      ],
      opponents: [
        { id: "op1", zone: "left-boards", offsetX: -4, offsetY: 4 },
        { id: "op2", zone: "slot" }
      ],
      puck: { zone: "left-boards", offsetX: 6, offsetY: 0 },
      showGoalie: true,
      showHomePlate: false,
      texts: [],
      arrows: [],
      flags: [],
      question: {
        mode: "choice",
        prompt: "F1 is all over you on the wall. What do you do?",
        options: [
          { text: "Reverse the puck low off the boards and spin back",   verdict: "correct", feedback: "Reverse beats the F1's momentum and gets the puck back to your D. Cleanest wall escape in hockey." },
          { text: "Blind pass up to the point",                          verdict: "wrong",   feedback: "Blind pass into traffic is a blocked shot or a turnover at the blue line. Don't feed the rush." },
          { text: "Throw it off the glass and chase",                    verdict: "partial", feedback: "Glass is a safe escape but you're giving up possession. Reverse keeps it." },
          { text: "Try to power through the forechecker",                verdict: "wrong",   feedback: "Power moves against an F1 with momentum = you get stripped. Use his momentum against him." }
        ]
      }
    }
  },

  // ── U15 / Bantam ────────────────────────────────────────────────────────
  {
    level: "U15 / Bantam",
    id: "u15rink1",
    cat: "Rush Reads",
    pos: ["F"],
    concept: "2-on-1 decision",
    d: 3,
    sit: "2-on-1 down the middle. You have the puck on the left. Your teammate is on the right. The lone D is shading toward your teammate.",
    why: "On a 2-on-1, the D's body language tells you what to do. D leaning off you = shoot, because the goalie has to respect you and can't cheat to the pass. Pass too early and the D reads it.",
    tip: "D leans off? Shoot. D takes you? Pass. Read, don't guess.",
    scene: {
      team: [
        { id: "you1", label: "LW", zone: "left-faceoff", hasPuck: true, isYou: true },
        { id: "tm1", label: "RW", zone: "right-faceoff" }
      ],
      opponents: [{ id: "op1", zone: "slot", offsetX: 14, offsetY: 0 }],
      puck: { zone: "left-faceoff", offsetX: -6, offsetY: 0 },
      showGoalie: true,
      showHomePlate: true,
      texts: [],
      arrows: [],
      flags: [],
      question: {
        mode: "choice",
        prompt: "D is leaning toward your teammate. What's the play?",
        options: [
          { text: "Shoot low glove-side and look for a rebound",         verdict: "correct", feedback: "D leaning off you = shoot. Goalie can't cheat to the pass, so you're shooting into a full opening." },
          { text: "Pass across early to the weak-side winger",           verdict: "wrong",   feedback: "Early pass lets the D read it and get the stick in the lane. You haven't forced the goalie to respect you." },
          { text: "Delay and wait for the trailing center",              verdict: "partial", feedback: "Delay gives the back-checker time to catch up. If you've got a trailer close, maybe — but the 2-on-1 advantage disappears fast." },
          { text: "Cut across in front to try a wraparound",             verdict: "wrong",   feedback: "Wraparound on a 2-on-1 gives up the shot lane and lets both the D and goalie reset. No angle, no play." }
        ]
      }
    }
  },
  {
    level: "U15 / Bantam",
    id: "u15rink2",
    cat: "Forecheck",
    pos: ["F"],
    concept: "F3 support on a rim",
    d: 3,
    sit: "Opponent is going behind the net about to rim the puck around the boards. F1 and F2 are on the forecheck. You're F3 — the high forward supporting the play.",
    why: "F3's job on a rim is to kill the puck on the strong-side boards before it clears. Cheating to the middle lets the puck skip past you up the wall and out.",
    tip: "F3 on a rim? Support the strong-side wall, not the middle.",
    scene: {
      team: [
        { id: "tm1", label: "LW", zone: "left-corner" },
        { id: "tm2", label: "RW", zone: "high-slot" },
        { id: "you1", label: "C", zone: "slot", isYou: true }
      ],
      opponents: [
        { id: "op1", zone: "behind-net", hasPuck: false },
        { id: "op2", zone: "left-point" },
        { id: "op3", zone: "right-point" }
      ],
      puck: { zone: "behind-net", offsetX: -10, offsetY: 4 },
      showGoalie: false,
      showHomePlate: false,
      texts: [],
      arrows: [],
      flags: [],
      question: {
        mode: "zone-click",
        prompt: "Where do you sit as F3 to kill the rim?",
        zones: {
          correct: ["right-boards"],
          partial: ["high-slot", "right-faceoff"],
          wrong: ["behind-net", "left-corner", "right-corner", "left-boards", "net-front", "slot", "left-point", "right-point", "left-faceoff"]
        },
        feedback: {
          correct: "Strong-side wall. You kill the rim before it clears, and you're in a spot to either chip it back deep or start the cycle.",
          partial: "High slot is the right general area but you need to be tight to the wall — not in the middle — to actually stop the rim.",
          wrong: "That spot lets the puck skip right past you and out of the zone. F3 has to be on the strong-side boards to kill the play."
        }
      }
    }
  },

  // ── U18 / Midget ────────────────────────────────────────────────────────
  {
    level: "U18 / Midget",
    id: "u18rink1",
    cat: "Special Teams",
    pos: ["F"],
    concept: "O-zone faceoff win setup",
    d: 3,
    sit: "You just won the O-zone faceoff clean back to your left D. The opposing center is closing on your D; their winger is on your winger. What's your move as the center who just won the draw?",
    why: "The O-zone faceoff play is built around a quick release from the D. Your job as the C who won the draw is to find the slot for the one-timer tip-screen — not stand over the dot or peel away.",
    tip: "Won the O-zone draw? Get to the slot. Be the finisher.",
    scene: {
      team: [
        { id: "tm1", label: "LD", zone: "left-point", hasPuck: true },
        { id: "you1", label: "C", zone: "left-faceoff", isYou: true },
        { id: "tm2", label: "LW", zone: "left-boards" },
        { id: "tm3", label: "RD", zone: "right-point" }
      ],
      opponents: [
        { id: "op1", zone: "left-faceoff", offsetX: 12, offsetY: 8 },
        { id: "op2", zone: "left-boards", offsetX: 14, offsetY: 0 },
        { id: "op3", zone: "high-slot" }
      ],
      puck: { zone: "left-point", offsetX: 0, offsetY: 8 },
      showGoalie: true,
      showHomePlate: true,
      texts: [],
      arrows: [],
      flags: [],
      question: {
        mode: "choice",
        prompt: "D has the puck at the point. What's your move as the C who won the draw?",
        options: [
          { text: "Drive the slot for a one-timer, tip, or screen",      verdict: "correct", feedback: "That's the whole point of winning an O-zone draw — quick release from the D with you as the finisher." },
          { text: "Peel down to the corner to open the lane",            verdict: "partial", feedback: "Opens the lane but you just left the best scoring area on the ice. Someone else has to be in the slot instead." },
          { text: "Hold at the dot and screen from there",               verdict: "wrong",   feedback: "Standing still means you're easy to cover and not a tip/rebound threat. The slot is where the scoring happens." },
          { text: "Swing high to support the D",                         verdict: "wrong",   feedback: "High support isn't the read off an O-zone win. You need to be a scoring threat — get inside." }
        ]
      }
    }
  },
  {
    level: "U18 / Midget",
    id: "u18rink2",
    cat: "Rush Reads",
    pos: ["F"],
    concept: "Late trailer lane",
    d: 3,
    sit: "Your teammate is skating the puck into the zone. You're the trailing forward — they don't see you yet. Where do you go to be the best outlet?",
    why: "The trailer-lane read is the high slot: it's behind the D, out of their field of view, and a stride from both shot and pass. Going too wide takes you out of the play; going too deep puts you underneath the D where there's no angle.",
    tip: "Late forward? High slot. Always.",
    scene: {
      team: [
        { id: "tm1", label: "LW", zone: "left-faceoff", hasPuck: true },
        { id: "you1", label: "C", zone: "high-slot", offsetY: 30, isYou: true }
      ],
      opponents: [
        { id: "op1", zone: "left-faceoff", offsetX: 20, offsetY: -4 },
        { id: "op2", zone: "right-point" }
      ],
      puck: { zone: "left-faceoff", offsetX: -4, offsetY: 2 },
      showGoalie: true,
      showHomePlate: true,
      texts: [],
      arrows: [],
      flags: [],
      question: {
        mode: "zone-click",
        prompt: "Where do you arrive as the trailing forward?",
        zones: {
          correct: ["high-slot"],
          partial: ["slot", "left-faceoff", "right-faceoff"],
          wrong: ["behind-net", "left-corner", "right-corner", "net-front", "left-boards", "right-boards", "left-point", "right-point"]
        },
        feedback: {
          correct: "High slot — behind the D, scoring threat from the middle, one stride from shot or seam pass. That's the trailer lane.",
          partial: "You're in the right neighborhood but the trailer's money spot is the high slot — behind the D, not in the middle of them.",
          wrong: "Too far from the shot. As the late F, you're there to finish — you want to arrive in the scoring area, not circle around it."
        }
      }
    }
  }
];

// ── Apply to questions.json ────────────────────────────────────────────────

const raw = fs.readFileSync(qPath, "utf8");
const bank = JSON.parse(raw);

let added = 0;
let skipped = 0;
for (const s of SCENARIOS) {
  const { level, ...question } = s;
  if (!Array.isArray(bank[level])) {
    throw new Error(`Level not found in questions.json: ${level}`);
  }
  if (bank[level].some(q => q.id === question.id)) {
    console.log(`skip  ${question.id} (already present in ${level})`);
    skipped++;
    continue;
  }
  question.type = "rink";
  bank[level].push(question);
  console.log(`add   ${question.id} → ${level}`);
  added++;
}

fs.writeFileSync(qPath, JSON.stringify(bank, null, 2) + "\n");
console.log(`\nDone. ${added} added, ${skipped} skipped. Wrote ${path.relative(process.cwd(), qPath)}.`);
