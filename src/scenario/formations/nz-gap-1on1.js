// Neutral-zone gap control, 1-on-1. YOU are the defending D; a lone carrier comes
// at you with speed. The read is to STEP UP under control and tighten the gap
// (deny time and space) rather than back off, dive, or stop your feet. The
// "pick the spot" target is concrete: the ice just in front of you, net-side of
// the carrier, where you step up to — not an abstract empty lane.
//
// `side` mirrors which way the carrier drives. Neutral zone → no goalie.

export default {
  id: "nz-gap-1on1",
  label: "Neutral-zone gap 1-on-1 (step up to tighten the gap)",
  concepts: {
    nodeIds: ["u13.gap-control", "u11.gap-control", "u15.gap-control"],
    ages: ["U11", "U13", "U15"],
  },
  themes: ["neutral-zone", "gap-control", "1-on-1", "positioning"],
  cat: "Defensive Play",
  stage: { view: "neutral", zone: "neutral" },
  params: {
    side: { values: ["left", "right"], doc: "which way the carrier drives" },
  },
  slots: [
    { role: "you", kind: "player", tag: "D", geometry: () => ({ x: 0.48, y: 0.5 }) },
    // lone carrier coming at you with speed, shading to one side
    { role: "attacker", kind: "defender", geometry: (p) => ({ x: 0.64, y: 0.5 + (p.side === "right" ? 0.08 : -0.08) * p.spread }) },
    { role: "puck", kind: "puck", with: "attacker" },
  ],
  interaction: {
    kind: "point",
    tolerance: 0.1,
    prompt: "The carrier is coming at you 1-on-1 with speed. Tap the ice where you should step up to tighten the gap.",
    // concrete target: just in front of you, net-side of the carrier
    correctGeometry: (p) => ({ x: 0.58, y: 0.5 + (p.side === "right" ? 0.04 : -0.04) }),
  },
  mc: {
    stem: "A lone carrier is coming at you with speed in the neutral zone. What is your best play?",
    opts: [
      { text: "Step up under control to tighten the gap and take away time and space", correct: true },
      { text: "Back off and give the carrier the middle of the ice" },
      { text: "Dive at the puck and hope to knock it free" },
      { text: "Stop your feet and let the carrier come to you" },
    ],
  },
  feedback: {
    right: "Step up under control — a tight gap kills the carrier's time and forces a decision.",
    wrong: "Backing off, diving, or stopping your feet gives the carrier what they want. Step up and tighten the gap.",
  },
  tip: "Close the gap early and under control — don't let the carrier build speed into you.",
  why: "A tight gap denies time and space; backing off lets the rush dictate the play.",
};
