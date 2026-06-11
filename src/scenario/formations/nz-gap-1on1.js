// Neutral-zone gap control, 1-on-1. YOU are the defending D; an attacker carries
// the puck at you with speed. The read is to keep a tight gap and steer the
// carrier toward the boards, away from the middle. "Pick the spot": tap the lane
// you steer them into.
//
// `side` selects which boards you steer them to (the side they're attacking).
// Neutral zone → no goalie; the attacker is the lone opponent.

export default {
  id: "nz-gap-1on1",
  label: "Neutral-zone gap 1-on-1 (steer to the boards)",
  concepts: {
    nodeIds: ["u13.gap-control", "u11.gap-control", "u15.gap-control"],
    ages: ["U11", "U13", "U15"],
  },
  themes: ["neutral-zone", "gap-control", "1-on-1", "positioning"],
  cat: "Defensive Play",
  stage: { view: "neutral", zone: "neutral" },
  params: {
    side: { values: ["left", "right"], doc: "which boards you steer the carrier to" },
  },
  slots: [
    { role: "you", kind: "player", tag: "D", geometry: () => ({ x: 0.50, y: 0.5 }) },
    // attacker carrying at you, shading to the chosen side
    { role: "attacker", kind: "defender", geometry: (p) => ({ x: 0.62, y: 0.5 + (p.side === "right" ? 0.10 : -0.10) }) },
    { role: "puck", kind: "puck", with: "attacker" },
  ],
  interaction: {
    kind: "point",
    tolerance: 0.10,
    prompt: "Keep a tight gap. Tap the lane you should steer the puck carrier into, away from the middle.",
    // the boards-side gap on the chosen side
    correctGeometry: (p) => ({ x: 0.58, y: 0.5 + (p.side === "right" ? 0.30 : -0.30) }),
  },
  feedback: {
    right: "Steer them to the boards — take away the middle and use the boards as a second defender.",
    wrong: "That gives up the middle. Keep inside position and steer the carrier to the wall.",
  },
  tip: "Protect the middle; the boards are your ally.",
  why: "A tight gap plus an active stick funnels the rush to the low-danger boards.",
};
