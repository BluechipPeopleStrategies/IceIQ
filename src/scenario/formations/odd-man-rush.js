// Odd-man rush (3-on-1, optional 3-on-2). You carry the puck up the middle; the
// lone defender plays centrally but shades the COVERED wing's lane, leaving the
// OPEN wing's lane clear. The geometry forces the read: correct = openWing.
//
// `side` selects which wing is OPEN (and is the whole strong/weak mirror).
// Slot geometry functions receive the compiler context `p` (see
// scripts/formation-to-seed.mjs): p.side, p.other, p.wide/onLane/goalSide/crease,
// and p.resolved[role] for already-placed slots.

export default {
  id: "odd-man-rush",
  label: "Offensive-zone odd-man (3-on-1 / 3-on-2, established in zone)",
  concepts: {
    nodeIds: ["u13.odd-man-reads", "u11.decision-making", "u15.odd-man-reads"],
    ages: ["U11", "U13", "U15"],
  },
  themes: ["odd-man-rush", "3-on-2", "decision-making", "offensive-zone"],
  cat: "Offensive Play",
  stage: { view: "right", zone: "off-zone" },
  params: {
    side: { values: ["left", "right"], doc: "which wing is OPEN (the correct read)" },
    dCount: { values: [1, 2], default: 1, doc: "number of defenders (3-on-1 vs 3-on-2)" },
  },
  slots: [
    // Established well inside the zone (puck clear of the blue line) so the deep
    // wingers are unambiguously onside — see offsidesOnEntry in validators.js.
    { role: "carrier", kind: "player", tag: "YOU", geometry: () => ({ x: 0.74, y: 0.50 }) },
    { role: "puck", kind: "puck", with: "carrier" },
    { role: "openWing", kind: "teammate", geometry: (p) => p.wide(p.side, { x: 0.84, spread: 0.22 * p.spread }) },
    { role: "closedWing", kind: "teammate", geometry: (p) => p.wide(p.other, { x: 0.83, spread: 0.20 * p.spread }) },
    // THE READ: defender central but ON the carrier→closedWing lane (blocks it),
    // and goal-side of the puck. The carrier→openWing lane stays clear.
    { role: "d1", kind: "defender", geometry: (p) => p.onLane("carrier", "closedWing", { t: 0.42 }) },
    // Optional 2nd defender: plays the MIDDLE (goal-side of the carrier), not the
    // open wing — two D back, one shades the closed wing, one holds the central
    // lane, so the weak-side winger still reads as open.
    { role: "d2", kind: "defender", when: (p) => p.dCount === 2, geometry: (p) => p.goalSide("carrier", { depth: 0.45 }) },
    { role: "g", kind: "goalie", geometry: (p) => p.crease() },
  ],
  read: {
    open: "openWing",
    blockedBy: { d1: ["carrier", "closedWing"] }, // invariant asserted at compile
  },
  interaction: {
    kind: "selection",
    from: ["openWing", "closedWing"],
    correct: ["openWing"],
    prompt: "You have the puck in the offensive zone on an odd-man. The lone defender shades one side. Tap the teammate with the open lane.",
  },
  mc: {
    stem: "You have the puck in the offensive zone on an odd-man. The lone defender shades one side. Who has the open ice?",
    opts: [
      { text: "Your teammate on the open side, with a clear passing lane", correct: true },
      { text: "Your teammate the defender is shading — the lane is covered" },
      { text: "The narrow gap directly behind the defender" },
      { text: "Force it to the corner behind the net" },
    ],
  },
  feedback: {
    right: "The defender committed to the covered wing — the open-side teammate has a clear lane to the net.",
    wrong: "That lane is covered. Read which side the lone defender took away, and hit the other one.",
  },
  tip: "On an odd-man rush, pass away from the defender, not into the lane they're protecting.",
  why: "The lone defender can only take one lane; the open teammate is the higher-percentage play than forcing it.",
};
