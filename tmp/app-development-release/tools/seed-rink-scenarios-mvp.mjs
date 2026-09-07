// Seeds the 20 MVP rink scenarios (10 U9 + 10 U11) prescribed by the
// integration brief into src/data/questions.json. Idempotent:
//
//   node tools/seed-rink-scenarios-mvp.mjs
//
// Additive to the existing bank — does not touch u9rink1–10 or u11rink1–14.
// New ids: u9rink11–u9rink20, u11rink15–u11rink24.
//
// Scene schema: src/Rink.jsx. Zone keys: net-front, slot, high-slot,
// left-faceoff, right-faceoff, left-corner, right-corner, behind-net,
// left-boards, right-boards, left-point, right-point, home-plate.
//
// Voice: U9 is positionless (label:"") and writes at a 7-year-old level.
// U11 uses full position labels (C/LW/RW/LD/RD) and hockey vocabulary.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const qPath = path.join(here, "..", "src", "data", "questions.json");

const base = () => ({
  team: [], opponents: [], puck: { zone: "slot" },
  showGoalie: true, showHomePlate: false,
  texts: [], arrows: [], flags: [], hiddenLabels: [],
});

const SCENARIOS = [

  // ══════════════════════════════════════════════════════════════════════════
  // U9 / Novice — 10 scenarios (4 zone-click naming + 6 choice decision)
  // ══════════════════════════════════════════════════════════════════════════

  {
    level: "U9 / Novice", id: "u9rink11",
    cat: "Zone Knowledge", concept: "Name the slot", d: 1,
    sit: "The slot is the middle spot in front of the net. Where is it?",
    why: "The slot is the best place to shoot from. Every player needs to know where it is.",
    tip: "Slot = straight out from the net.",
    scene: { ...base(),
      team: [{ id: "you1", zone: "high-slot", offsetY: 40, isYou: true }],
      puck: { zone: "slot" },
      question: {
        mode: "zone-click",
        prompt: "Click the slot.",
        zones: {
          correct: ["slot"],
          partial: ["home-plate"],
          wrong: ["net-front","high-slot","behind-net","left-corner","right-corner","left-point","right-point","left-faceoff","right-faceoff","left-boards","right-boards"],
        },
        feedback: {
          correct: "That's the slot! Best shooting spot on the ice.",
          partial: "Close — that's the home plate area, which includes the slot. The slot itself is right in the middle.",
          wrong: "Not quite. The slot is straight out from the front of the net.",
        },
      },
    },
  },
  {
    level: "U9 / Novice", id: "u9rink12",
    cat: "Zone Knowledge", concept: "Name the left corner", d: 1,
    sit: "The corners are where you go to get loose pucks.",
    why: "Knowing the corners helps you know where to go when the puck is there.",
    tip: "Corner = all the way to the side, down low.",
    scene: { ...base(),
      team: [{ id: "you1", zone: "slot", isYou: true }],
      puck: { zone: "left-corner" },
      question: {
        mode: "zone-click",
        prompt: "Click the left corner.",
        zones: {
          correct: ["left-corner"],
          partial: ["left-boards"],
          wrong: ["slot","net-front","high-slot","behind-net","right-corner","right-boards","left-point","right-point","left-faceoff","right-faceoff"],
        },
        feedback: {
          correct: "Yes! That's the left corner.",
          partial: "That's the left boards, a bit higher up. The corner is down low by the net.",
          wrong: "The left corner is all the way to the left, right by the net.",
        },
      },
    },
  },
  {
    level: "U9 / Novice", id: "u9rink13",
    cat: "Zone Knowledge", concept: "Name the points", d: 1,
    sit: "The two points are where the defensemen usually stand.",
    why: "The point is high and wide — a safe spot for defensemen to get the puck and start a play.",
    tip: "Point = up high by the blue line.",
    scene: { ...base(),
      team: [{ id: "you1", zone: "slot", isYou: true }],
      puck: { zone: "slot" },
      question: {
        mode: "zone-click",
        prompt: "Click a point (there are two!).",
        zones: {
          correct: ["left-point","right-point"],
          partial: ["high-slot"],
          wrong: ["slot","net-front","behind-net","left-corner","right-corner","left-faceoff","right-faceoff","left-boards","right-boards"],
        },
        feedback: {
          correct: "Perfect! The points are up at the top on each side.",
          partial: "Close — that's the high slot. The points are even higher, near the blue line on each side.",
          wrong: "A point is up high by the blue line, to the left or right.",
        },
      },
    },
  },
  {
    level: "U9 / Novice", id: "u9rink14",
    cat: "Zone Knowledge", concept: "Home plate", d: 1,
    sit: "The orange shape in front of the net is called the home plate. Most goals happen here.",
    why: "The home plate is where the best scoring chances come from. Know where it is — and try to get the puck there.",
    tip: "Home plate = goal-scoring country.",
    scene: { ...base(),
      showHomePlate: true,
      team: [{ id: "you1", zone: "high-slot", offsetY: 40, isYou: true }],
      puck: { zone: "slot" },
      question: {
        mode: "zone-click",
        prompt: "Click the home plate.",
        zones: {
          correct: ["home-plate"],
          partial: ["slot","net-front"],
          wrong: ["high-slot","behind-net","left-corner","right-corner","left-point","right-point","left-faceoff","right-faceoff","left-boards","right-boards"],
        },
        feedback: {
          correct: "That's it! Goals live inside the home plate.",
          partial: "Close — that's inside the home plate, but the whole orange shape is the home plate.",
          wrong: "The home plate is the big orange shape in front of the net.",
        },
      },
    },
  },

  // ── U9 choice scenarios (decision-making) ────────────────────────────────

  {
    level: "U9 / Novice", id: "u9rink15",
    cat: "Offensive Pressure", concept: "Find the open friend", d: 1,
    sit: "Your teammate has the puck in the corner. You and another teammate are both open. You're in the slot. The other one is on the far boards with a defender nearby.",
    why: "Pass to the friend who has space. The slot friend is open and right in front of the net — that's a scoring chance.",
    tip: "Open friend in the slot? Pass there.",
    scene: { ...base(),
      team: [
        { id: "tm1", zone: "left-corner", hasPuck: true },
        { id: "you1", zone: "slot", isYou: true },
        { id: "tm2", zone: "right-boards" },
      ],
      opponents: [{ id: "op1", zone: "right-boards", offsetX: -12 }],
      puck: { zone: "left-corner" }, showHomePlate: true,
      question: {
        mode: "choice",
        prompt: "You're in the slot. Who should your teammate pass to?",
        options: [
          { text: "Me — I'm open in the slot", verdict: "correct", feedback: "Yes! You're open and in front of the net. Best chance to score." },
          { text: "The other friend on the far boards", verdict: "wrong", feedback: "They're covered by a defender. Pass to the open teammate." },
          { text: "Skate the puck themselves", verdict: "partial", feedback: "Could work, but you were wide open. A pass is faster." },
          { text: "Wait and see what happens", verdict: "wrong", feedback: "Waiting lets the other team catch up. Make the play now." },
        ],
      },
    },
  },
  {
    level: "U9 / Novice", id: "u9rink16",
    cat: "Offensive Pressure", concept: "Net-front support", d: 1,
    sit: "Your teammate has the puck behind the other team's net. You're on the far boards. Your team needs someone in front of the net.",
    why: "When your teammate has the puck behind the net, get in FRONT of the net. That's where the pass is going and where the goal happens.",
    tip: "Teammate behind net? You go in FRONT.",
    scene: { ...base(),
      team: [
        { id: "tm1", zone: "behind-net", hasPuck: true },
        { id: "you1", zone: "right-boards", isYou: true },
      ],
      opponents: [],
      puck: { zone: "behind-net" }, showHomePlate: true,
      question: {
        mode: "choice",
        prompt: "Where do you go to help?",
        options: [
          { text: "Skate to the front of the net", verdict: "correct", feedback: "Perfect. Your teammate can pass you the puck for a tap-in." },
          { text: "Stay on the boards", verdict: "wrong", feedback: "Nobody scores from the boards. Get to the net." },
          { text: "Skate to the point", verdict: "partial", feedback: "The point is okay, but the net-front is where the goals are." },
          { text: "Skate to your own net", verdict: "wrong", feedback: "The play is here! Help your team score." },
        ],
      },
    },
  },
  {
    level: "U9 / Novice", id: "u9rink17",
    cat: "Offensive Pressure", concept: "Who has the shot", d: 1,
    sit: "Three friends are all in the offensive zone. One is in the slot with NO defender on them. One is in the corner. One is at the point.",
    why: "The player with the open shot should get the puck. The slot with no defender = wide-open shot.",
    tip: "Open shot in the slot? That's who gets the puck.",
    scene: { ...base(),
      team: [
        { id: "tm1", zone: "left-corner", hasPuck: true },
        { id: "tm2", zone: "slot" },
        { id: "tm3", zone: "left-point" },
      ],
      opponents: [{ id: "op1", zone: "left-corner", offsetX: 14 }],
      puck: { zone: "left-corner" }, showHomePlate: true,
      question: {
        mode: "choice",
        prompt: "Who should take the shot?",
        options: [
          { text: "The friend in the slot — wide open", verdict: "correct", feedback: "Yes! Open friend in the slot = best shot." },
          { text: "The friend in the corner", verdict: "wrong", feedback: "The corner is too far from the net to score from." },
          { text: "The friend at the point", verdict: "partial", feedback: "The point can work for older players, but the slot is way better here." },
          { text: "Nobody — just wait", verdict: "wrong", feedback: "Don't wait! There's an open shot right now." },
        ],
      },
    },
  },
  {
    level: "U9 / Novice", id: "u9rink18",
    cat: "Offensive Pressure", concept: "Puck in the slot", d: 1,
    sit: "You have the puck in the slot. A defender is coming at you. You have a split second to decide.",
    why: "In the slot with a defender coming, the best play is to shoot. If you wait, the defender takes the puck or the goalie gets ready.",
    tip: "Slot + defender coming = SHOOT.",
    scene: { ...base(),
      team: [{ id: "you1", zone: "slot", hasPuck: true, isYou: true }],
      opponents: [{ id: "op1", zone: "high-slot", offsetY: -20 }],
      puck: { zone: "slot" }, showHomePlate: true,
      question: {
        mode: "choice",
        prompt: "Defender is coming. What do you do?",
        options: [
          { text: "Shoot right now", verdict: "correct", feedback: "Yes! Best shot you'll get — take it!" },
          { text: "Pass back to the point", verdict: "partial", feedback: "Safer, but you just gave up an open shot in the best spot on the ice." },
          { text: "Skate behind the net", verdict: "wrong", feedback: "You were in the best spot. Now you're in the worst." },
          { text: "Stop and wait", verdict: "wrong", feedback: "Waiting means the defender takes the puck. Shoot!" },
        ],
      },
    },
  },
  {
    level: "U9 / Novice", id: "u9rink19",
    cat: "Offensive Pressure", concept: "Net-front coverage", d: 1,
    sit: "Your team is attacking. One friend is near the net, one is in the corner, one is at the point. The friend near the net is the closest.",
    why: "Someone has to be in front of the net so the goalie has to worry about them. The closest teammate is the one who should go.",
    tip: "Closest to the net? You're the net-front.",
    scene: { ...base(),
      team: [
        { id: "you1", zone: "net-front", offsetX: -14, isYou: true },
        { id: "tm1", zone: "right-corner" },
        { id: "tm2", zone: "left-point" },
      ],
      opponents: [{ id: "op1", zone: "right-corner", offsetX: -12 }, { id: "op2", zone: "slot" }],
      puck: { zone: "right-corner" }, showHomePlate: true,
      question: {
        mode: "choice",
        prompt: "Who should go to the net?",
        options: [
          { text: "Me — I'm already closest", verdict: "correct", feedback: "Yes! If you're closest to the net, that's your spot." },
          { text: "The teammate at the point", verdict: "wrong", feedback: "The point is the defenseman's spot, not the net-front." },
          { text: "The teammate in the corner", verdict: "wrong", feedback: "They're going for the puck. The net needs someone else." },
          { text: "Nobody has to be there", verdict: "wrong", feedback: "Someone ALWAYS has to be in front of the net on offence." },
        ],
      },
    },
  },
  {
    level: "U9 / Novice", id: "u9rink20",
    cat: "Offensive Pressure", concept: "Weak-side support", d: 1,
    sit: "Your teammates have the puck on the right side of the ice. You're the only one on the left side. Where should you be?",
    why: "Stay on your side! If you crowd the puck, the other team covers everyone. Being on the weak side means you're open for a pass.",
    tip: "Puck on their side? You stay on yours.",
    scene: { ...base(),
      team: [
        { id: "tm1", zone: "right-corner", hasPuck: true },
        { id: "tm2", zone: "right-boards" },
        { id: "you1", zone: "left-boards", isYou: true },
      ],
      opponents: [{ id: "op1", zone: "right-corner", offsetX: -12 }, { id: "op2", zone: "net-front" }],
      puck: { zone: "right-corner" }, showHomePlate: true,
      question: {
        mode: "choice",
        prompt: "Where should you be?",
        options: [
          { text: "Stay on the left side, ready for a pass across", verdict: "correct", feedback: "Perfect — weak-side support. If the pass comes across, you've got a wide-open shot." },
          { text: "Skate over to help on the right side", verdict: "wrong", feedback: "Too many friends on one side makes it crowded. Stay on yours." },
          { text: "Skate behind the net", verdict: "wrong", feedback: "Behind the net isn't a scoring spot. Stay on the weak side." },
          { text: "Go to the point", verdict: "partial", feedback: "Not wrong, but closer to the slot on the weak side is the scoring play." },
        ],
      },
    },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // U11 / Atom — 10 scenarios (2 zone-click + 8 choice)
  // ══════════════════════════════════════════════════════════════════════════

  {
    level: "U11 / Atom", id: "u11rink15",
    cat: "Offensive Pressure", pos: ["F"], concept: "LW support off the point", d: 2,
    sit: "You're the LW. Your LD has the puck at the left point. The puck is about to move.",
    why: "LW support on a point release lives on the strong-side boards or in the slot — not at the net-front (that's the C's job) and not across the ice.",
    tip: "Your D has it at the point? You're on the boards or in the slot.",
    scene: { ...base(),
      team: [
        { id: "tm1", label: "LD", zone: "left-point", hasPuck: true },
        { id: "you1", label: "LW", zone: "left-boards", isYou: true },
        { id: "tm2", label: "C", zone: "net-front" },
        { id: "tm3", label: "RW", zone: "right-faceoff" },
      ],
      opponents: [{ id: "op1", zone: "net-front", offsetX: 14 }, { id: "op2", zone: "high-slot" }],
      puck: { zone: "left-point" }, showHomePlate: true,
      question: {
        mode: "zone-click",
        prompt: "Where should you be as the LW?",
        zones: {
          correct: ["left-boards","slot"],
          partial: ["net-front","left-faceoff"],
          wrong: ["right-corner","right-point","right-boards","right-faceoff","behind-net","high-slot","left-corner","left-point"],
        },
        feedback: {
          correct: "That's the read. You're either available for the shot-pass or threatening the slot off the release.",
          partial: "Close — but the net-front is the C's spot. Stay on the boards or in the slot to give a shot option.",
          wrong: "That's not your lane. LW supports strong-side on a point release.",
        },
      },
    },
  },
  {
    level: "U11 / Atom", id: "u11rink16",
    cat: "Offensive Pressure", pos: ["F"], concept: "Weak-side winger spot", d: 2,
    sit: "Your team is cycling the puck on the right-side boards. You're the weak-side LW. Where do you sit?",
    why: "Weak-side winger's job is to hold the slot or high slot — ready for a cross-seam pass or a shot rebound. Go too low and you clog the net-front; go too wide and you're out of the play.",
    tip: "Weak-side wing = hold the slot seam.",
    scene: { ...base(),
      team: [
        { id: "tm1", label: "C", zone: "right-boards", hasPuck: true },
        { id: "tm2", label: "RW", zone: "right-corner" },
        { id: "you1", label: "LW", zone: "left-faceoff", isYou: true },
        { id: "tm3", label: "LD", zone: "left-point" },
      ],
      opponents: [
        { id: "op1", zone: "right-boards", offsetX: -12 },
        { id: "op2", zone: "right-corner", offsetX: 10 },
        { id: "op3", zone: "net-front" },
      ],
      puck: { zone: "right-boards" }, showHomePlate: true,
      question: {
        mode: "zone-click",
        prompt: "Where does the weak-side LW sit?",
        zones: {
          correct: ["slot","high-slot"],
          partial: ["left-faceoff","net-front"],
          wrong: ["right-corner","right-boards","right-faceoff","right-point","behind-net","left-corner","left-boards","left-point"],
        },
        feedback: {
          correct: "Right read. You're a seam-pass threat and you can hunt rebounds from the middle.",
          partial: "Close — sit a little more central. Weak-side wing lives in the slot seam, not the dot.",
          wrong: "That's out of the play. The weak-side wing has to hold the middle.",
        },
      },
    },
  },

  // ── U11 choice scenarios ────────────────────────────────────────────────

  {
    level: "U11 / Atom", id: "u11rink17",
    cat: "Offensive Pressure", pos: ["D"], concept: "Best pass from the point", d: 2,
    sit: "You're the LD with the puck at the point. Your C is open in the slot. Your RD is at the right point. Your RW is on the half-wall.",
    why: "From the point, the seam pass to the slot is the highest-danger play. D-to-D is a reset, not a chance. Forcing a shot with no screen feeds the goalie.",
    tip: "Open seam to the slot? Hit it.",
    scene: { ...base(),
      team: [
        { id: "you1", label: "LD", zone: "left-point", hasPuck: true, isYou: true },
        { id: "tm1", label: "RD", zone: "right-point" },
        { id: "tm2", label: "C", zone: "slot" },
        { id: "tm3", label: "RW", zone: "right-boards" },
      ],
      opponents: [{ id: "op1", zone: "slot", offsetX: -18 }, { id: "op2", zone: "net-front" }],
      puck: { zone: "left-point" }, showHomePlate: true,
      question: {
        mode: "choice",
        prompt: "Best play from the point?",
        options: [
          { text: "Seam pass to the C in the slot", verdict: "correct", feedback: "Money play. Slot pass beats the box and gives you a high-danger shot." },
          { text: "Shot from the point — no screen", verdict: "wrong", feedback: "No screen means the goalie sees it the whole way. That's a save or a rebound the other way." },
          { text: "D-to-D across to your partner", verdict: "partial", feedback: "Safe reset, but you had the seam. Take the chance when it's there." },
          { text: "Dump it to the corner", verdict: "wrong", feedback: "You had the puck and options. Dumping gives up possession for nothing." },
        ],
      },
    },
  },
  {
    level: "U11 / Atom", id: "u11rink18",
    cat: "Positioning", pos: ["F"], concept: "Who's out of position", d: 2,
    sit: "Look at your team's forwards. Two are at the point. One is in the slot. One is in the corner. One of the forwards at the point drifted up from where they should be.",
    why: "Forwards at the point = defence coverage missing. The F who drifted up is the one who should have stayed lower to support the cycle or hold the slot.",
    tip: "Two forwards at the point? One of them is in the wrong spot.",
    scene: { ...base(),
      team: [
        { id: "tm1", label: "C", zone: "slot" },
        { id: "tm2", label: "LW", zone: "left-corner" },
        { id: "tm3", label: "RW", zone: "right-point" },
        { id: "tm4", label: "LD", zone: "left-point" },
        { id: "you1", label: "C", zone: "high-slot", isYou: true },
      ],
      opponents: [{ id: "op1", zone: "net-front" }, { id: "op2", zone: "behind-net" }],
      puck: { zone: "left-corner" }, showHomePlate: true,
      question: {
        mode: "choice",
        prompt: "Who is out of position?",
        options: [
          { text: "The RW at the right point", verdict: "correct", feedback: "Right read. Wingers don't live at the point — that's the D's spot. The RW should be on the boards or in the slot." },
          { text: "The LD at the left point", verdict: "wrong", feedback: "LD belongs at the point — that's exactly where they should be." },
          { text: "The LW in the corner", verdict: "wrong", feedback: "The LW is supporting the puck in the corner. Good spot." },
          { text: "The C in the slot", verdict: "wrong", feedback: "The C is in the scoring area where they should be." },
        ],
      },
    },
  },
  {
    level: "U11 / Atom", id: "u11rink19",
    cat: "Offensive Pressure", pos: ["F"], concept: "Cycle read on half-wall", d: 2,
    sit: "You have the puck on the right half-wall. Your D is open at the point. Your C is driving the net. Your LW is weak-side.",
    why: "Low-to-high (boards up to point) is the safest cycle release and creates a shot-pass off a clean D shot. Seam passes are tempting but get picked off when the slot is covered.",
    tip: "On the wall with pressure? Low-to-high.",
    scene: { ...base(),
      team: [
        { id: "you1", label: "RW", zone: "right-boards", hasPuck: true, isYou: true },
        { id: "tm1", label: "RD", zone: "right-point" },
        { id: "tm2", label: "C", zone: "net-front" },
        { id: "tm3", label: "LW", zone: "left-faceoff" },
      ],
      opponents: [
        { id: "op1", zone: "right-boards", offsetX: -14 },
        { id: "op2", zone: "slot", offsetX: 14 },
        { id: "op3", zone: "net-front", offsetX: 12 },
      ],
      puck: { zone: "right-boards" }, showHomePlate: true,
      question: {
        mode: "choice",
        prompt: "Best cycle option?",
        options: [
          { text: "Pass low-to-high to the RD", verdict: "correct", feedback: "Clean cycle release. D has the shot, bodies in front for tips." },
          { text: "Seam pass to the LW weak-side", verdict: "partial", feedback: "Nice thought, but it goes through two opponents. Too risky under pressure." },
          { text: "Cross-ice to the C at the net", verdict: "wrong", feedback: "Defender in the slot picks that off — it's a rush the other way." },
          { text: "Skate behind the net", verdict: "wrong", feedback: "You had a clean cycle play. Behind the net kills the momentum." },
        ],
      },
    },
  },
  {
    level: "U11 / Atom", id: "u11rink20",
    cat: "Forecheck", pos: ["F"], concept: "F1 angle", d: 2,
    sit: "You're F1 forechecking. The other team's D just picked up the puck behind their net. They have options both ways.",
    why: "F1's job is to angle the puck carrier to ONE side of the ice — don't chase the puck. Forcing them to one side lets F2 and F3 predict the play and jump the outlet.",
    tip: "F1 doesn't chase — F1 cuts off one side.",
    scene: { ...base(),
      team: [{ id: "you1", label: "C", zone: "high-slot", isYou: true }, { id: "tm1", label: "LW", zone: "left-boards" }, { id: "tm2", label: "RW", zone: "right-boards" }],
      opponents: [{ id: "op1", zone: "behind-net", offsetX: -8, hasPuck: false }, { id: "op2", zone: "right-corner" }, { id: "op3", zone: "left-boards" }],
      puck: { zone: "behind-net", offsetX: -8 }, showGoalie: false,
      question: {
        mode: "choice",
        prompt: "What's F1's job?",
        options: [
          { text: "Angle the D to one side — force them to commit", verdict: "correct", feedback: "Exactly. Make them predictable so F2 can jump the outlet." },
          { text: "Skate straight at the puck", verdict: "wrong", feedback: "Straight-on gives the D both sides. They'll pick the open one." },
          { text: "Back off to the blue line and set up a 1-2-2", verdict: "wrong", feedback: "You're F1 — that's a passive read that gives up the forecheck entirely." },
          { text: "Stand still and wait", verdict: "wrong", feedback: "The D gets time and space. F1 has to pressure." },
        ],
      },
    },
  },
  {
    level: "U11 / Atom", id: "u11rink21",
    cat: "Defensive Zone", pos: ["F"], concept: "C breakout support", d: 2,
    sit: "You're the C in your own zone. Your D just picked up the puck on the left boards. The forecheck is coming.",
    why: "The C on a breakout is the D's primary outlet — swing low behind the D and read their pressure. Sitting too high or too low kills the two-option read the D needs.",
    tip: "C on breakout = low and behind your D.",
    scene: { ...base(),
      team: [{ id: "tm1", label: "LD", zone: "left-boards", offsetY: -20, hasPuck: true }, { id: "you1", label: "C", zone: "high-slot", offsetY: -10, isYou: true }, { id: "tm2", label: "LW", zone: "left-faceoff", offsetY: -60 }],
      opponents: [{ id: "op1", zone: "left-boards", offsetY: -30 }, { id: "op2", zone: "slot" }],
      puck: { zone: "left-boards", offsetY: -20 }, showGoalie: false,
      question: {
        mode: "choice",
        prompt: "Where's your support?",
        options: [
          { text: "Swing low behind your D — give them a two-option read", verdict: "correct", feedback: "That's C support. You're the safety-valve outlet, moving with speed." },
          { text: "Stay high in the neutral zone", verdict: "wrong", feedback: "Too far — your D has no short outlet. They get pinned on the wall." },
          { text: "Go to the far boards", verdict: "wrong", feedback: "Cross-ice outlet in your own zone is a turnover and a breakaway." },
          { text: "Skate to the net-front", verdict: "wrong", feedback: "Wrong end of the ice. Help the breakout, not offensive work." },
        ],
      },
    },
  },
  {
    level: "U11 / Atom", id: "u11rink22",
    cat: "Offensive Pressure", pos: ["F"], concept: "Net-front battle", d: 2,
    sit: "You're C in front of the net. The opponent D is on your back, screening you. The puck is coming from your point.",
    why: "Net-front in a battle: stick on the ice, stay strong with your feet, be ready for tips and rebounds. Getting pushed out or letting the opponent clear you kills the shot.",
    tip: "Net-front = stick on the ice and hold your ground.",
    scene: { ...base(),
      team: [
        { id: "tm1", label: "LD", zone: "left-point", hasPuck: true },
        { id: "you1", label: "C", zone: "net-front", offsetX: -8, isYou: true },
      ],
      opponents: [{ id: "op1", zone: "net-front", offsetX: 6 }, { id: "op2", zone: "slot" }],
      puck: { zone: "left-point" }, showHomePlate: true,
      question: {
        mode: "choice",
        prompt: "Shot incoming. What do you do?",
        options: [
          { text: "Stick on the ice, hold ground, hunt the tip", verdict: "correct", feedback: "That's net-front work. Tips and rebounds win games." },
          { text: "Cycle out to the corner", verdict: "wrong", feedback: "You're abandoning the scoring area right when the shot is coming." },
          { text: "Pull the defender away from the net", verdict: "partial", feedback: "Okay read if the screen is already beaten, but first job is to hold the front." },
          { text: "Skate to the slot for a one-timer", verdict: "wrong", feedback: "You leave the net-front empty. D shot with no screen is a save." },
        ],
      },
    },
  },
  {
    level: "U11 / Atom", id: "u11rink23",
    cat: "Defensive Zone", pos: ["D"], concept: "Weak-side D coverage", d: 2,
    sit: "The opponent has the puck at their point. Your strong-side D is pressuring the point. You're the weak-side D.",
    why: "Weak-side D holds the slot — the most dangerous pass target. Stepping up to challenge the point leaves the slot wide open for a cross-seam goal.",
    tip: "Weak-side D = slot, not the point.",
    scene: { ...base(),
      team: [
        { id: "tm1", label: "LD", zone: "left-point", offsetY: -10 },
        { id: "you1", label: "RD", zone: "slot", isYou: true },
        { id: "tm2", label: "C", zone: "high-slot" },
      ],
      opponents: [
        { id: "op1", zone: "left-point", offsetY: -30, hasPuck: false },
        { id: "op2", zone: "net-front" },
        { id: "op3", zone: "right-faceoff" },
      ],
      puck: { zone: "left-point", offsetY: -30 }, showHomePlate: true,
      question: {
        mode: "choice",
        prompt: "What's your coverage?",
        options: [
          { text: "Hold the slot — cover the cross-seam target", verdict: "correct", feedback: "That's the read. Weak-side D's job is to take away the home plate." },
          { text: "Step up to challenge the opposite point", verdict: "wrong", feedback: "Leaves the slot wide open. Cross-seam pass and it's a goal." },
          { text: "Collapse to the net-front", verdict: "partial", feedback: "Net-front is the F's job. Weak-side D covers the slot, not the crease." },
          { text: "Skate to the boards", verdict: "wrong", feedback: "Not your lane at all. Slot coverage is non-negotiable for weak-side D." },
        ],
      },
    },
  },
  {
    level: "U11 / Atom", id: "u11rink24",
    cat: "Defensive Zone", pos: ["F"], concept: "Pressure release", d: 2,
    sit: "Your teammate has the puck on the wall under heavy pressure. You're the closest support. Your D is way at the point.",
    why: "Under pressure on the wall, your teammate needs a SHORT clean outlet, not a long diagonal. A nearby support option lets them escape the pressure and keep possession.",
    tip: "Teammate pinned? Get close enough to bail them out.",
    scene: { ...base(),
      team: [
        { id: "tm1", label: "LW", zone: "left-boards", hasPuck: true },
        { id: "you1", label: "C", zone: "left-faceoff", isYou: true },
        { id: "tm2", label: "LD", zone: "left-point" },
      ],
      opponents: [{ id: "op1", zone: "left-boards", offsetX: -4 }, { id: "op2", zone: "left-corner", offsetX: 14 }],
      puck: { zone: "left-boards" },
      question: {
        mode: "choice",
        prompt: "How do you help?",
        options: [
          { text: "Offer a short clean puck-support option", verdict: "correct", feedback: "Right read. Short pass beats the forecheck. Possession stays yours." },
          { text: "Skate to the far boards for a long pass option", verdict: "wrong", feedback: "Too far. Long passes under pressure get picked off." },
          { text: "Stay at the net for a shot option", verdict: "wrong", feedback: "Your teammate can't hit the net from pinned on the wall. They need an outlet." },
          { text: "Skate away to spread the defenders", verdict: "partial", feedback: "Sometimes, but your teammate needs a present option right now, not spacing." },
        ],
      },
    },
  },

];

// ═══════════════════════════════════════════════════════════════════════════
// Apply to questions.json
// ═══════════════════════════════════════════════════════════════════════════

const raw = fs.readFileSync(qPath, "utf8");
const bank = JSON.parse(raw);

let added = 0, skipped = 0;
for (const s of SCENARIOS) {
  const { level, ...question } = s;
  if (!Array.isArray(bank[level])) throw new Error(`Level not found: ${level}`);
  if (bank[level].some(q => q.id === question.id)) {
    console.log(`skip  ${question.id} (already in ${level})`);
    skipped++;
    continue;
  }
  // U11 scenarios declare their own `pos`; U9 are positionless (no pos field).
  if (!question.pos) question.pos = ["F"];
  question.type = "rink";
  bank[level].push(question);
  console.log(`add   ${question.id} → ${level}`);
  added++;
}

fs.writeFileSync(qPath, JSON.stringify(bank, null, 2) + "\n");
console.log(`\nMVP batch done. ${added} added, ${skipped} skipped.`);
