// Offensive-zone backdoor — find the open weak-side teammate. You have the puck
// on the strong side. A strong-side teammate is the obvious option but the
// defender is shading that lane; a teammate has slipped backdoor on the weak side
// with a clear lane. The geometry forces the read: pass backdoor.
//
// `side` selects which side the OPEN backdoor teammate is on (the puck/strong
// side is the other one). Selection read: from [backdoor, strongMate].

export default {
  id: "oz-backdoor",
  label: "Offensive-zone backdoor (find the weak-side teammate)",
  concepts: {
    nodeIds: ["u13.off-puck-support-offense", "u15.off-puck-support-offense", "u13.scanning"],
    ages: ["U13", "U15"],
  },
  themes: ["offensive-zone", "net-front", "scan", "decision-making"],
  cat: "Offensive Play",
  stage: { view: "right", zone: "off-zone" },
  params: {
    side: { values: ["left", "right"], doc: "which side the OPEN backdoor teammate is on" },
  },
  slots: [
    // carrier high on the STRONG side (opposite the open backdoor) with the puck,
    // established inside the zone (clear of the blue line — see offsidesOnEntry).
    { role: "carrier", kind: "player", tag: "YOU", geometry: (p) => ({ x: 0.74, y: 0.5 + (p.other === "right" ? 0.20 : -0.20) * p.spread }) },
    { role: "puck", kind: "puck", with: "carrier" },
    // strong-side teammate — the tempting option, but its lane is covered.
    // Set well apart from the carrier so the shading defender fits between them.
    { role: "strongMate", kind: "teammate", geometry: (p) => ({ x: 0.86, y: 0.5 + (p.other === "right" ? 0.08 : -0.08) }) },
    // defender shading the strong-side lane
    { role: "d1", kind: "defender", geometry: (p) => p.onLane("carrier", "strongMate", { t: 0.5 }) },
    // backdoor teammate — open, weak side, net-front (wider apart for younger ages)
    { role: "backdoor", kind: "teammate", geometry: (p) => ({ x: 0.87, y: 0.5 + (p.side === "right" ? 0.16 : -0.16) * p.spread }) },
    { role: "g", kind: "goalie", geometry: (p) => p.crease() },
  ],
  read: {
    open: "backdoor",
    blockedBy: { d1: ["carrier", "strongMate"] },
  },
  interaction: {
    kind: "selection",
    from: ["backdoor", "strongMate"],
    correct: ["backdoor"],
    prompt: "The defence is shading your strong-side teammate. Tap the open teammate for the scoring chance.",
  },
  mc: {
    stem: "You have the puck on the strong side and the defender is shading your near teammate. Who has the open lane?",
    opts: [
      { text: "The backdoor teammate on the weak side — clear lane to the net", correct: true },
      { text: "The strong-side teammate the defender is covering" },
      { text: "Throw it blind to the point" },
      { text: "Force it into the corner" },
    ],
  },
  feedback: {
    right: "Backdoor — the weak side is wide open while the defence watches the puck side.",
    wrong: "That lane is covered. Scan weak-side: the backdoor teammate is open.",
  },
  tip: "When the defence collapses to the puck, the weak-side back door opens up.",
  why: "Scanning the weak side before you receive it is how backdoor goals happen.",
};
