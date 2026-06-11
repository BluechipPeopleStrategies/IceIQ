// Offensive-zone backdoor — a "pick the spot" read. You have the puck up high on
// the strong side; the defender and goalie are committed to the strong side, so
// the weak-side backdoor is the open scoring ice. Tap it.
//
// `side` selects which side is the OPEN backdoor (the strong/puck side is the
// other one). Interaction is `point` (tap the open ice), so there's no tempting
// teammate to block — the question is spatial, not a pass choice.

export default {
  id: "oz-backdoor",
  label: "Offensive-zone backdoor (pick the open ice)",
  concepts: {
    nodeIds: ["u13.off-puck-support-offense", "u15.off-puck-support-offense", "u13.scanning"],
    ages: ["U13", "U15"],
  },
  themes: ["offensive-zone", "net-front", "scan", "decision-making"],
  cat: "Offensive Play",
  stage: { view: "right", zone: "off-zone" },
  params: {
    side: { values: ["left", "right"], doc: "which side is the OPEN backdoor" },
  },
  slots: [
    // carrier high on the STRONG side (opposite the open backdoor) with the puck
    { role: "carrier", kind: "player", tag: "YOU", geometry: (p) => ({ x: 0.74, y: 0.5 + (p.other === "right" ? 0.10 : -0.10) }) },
    { role: "puck", kind: "puck", with: "carrier" },
    // defender committed net-front on the strong side
    { role: "d1", kind: "defender", geometry: (p) => ({ x: 0.86, y: 0.5 + (p.other === "right" ? 0.10 : -0.10) }) },
    { role: "g", kind: "goalie", geometry: (p) => p.crease() },
  ],
  interaction: {
    kind: "point",
    tolerance: 0.09,
    prompt: "The defence is committed to the puck side. Tap the open backdoor ice where the weak-side scoring chance is.",
    // open backdoor: weak side, near the net
    correctGeometry: (p) => ({ x: 0.86, y: 0.5 + (p.side === "right" ? 0.16 : -0.16) }),
  },
  feedback: {
    right: "Backdoor — the weak side is wide open while the defence watches the puck.",
    wrong: "That's where the defence already is. The open chance is the weak-side backdoor.",
  },
  tip: "When the defence collapses to the puck, the weak-side back door opens up.",
  why: "Scanning the weak side before you receive it is how backdoor goals happen.",
};
