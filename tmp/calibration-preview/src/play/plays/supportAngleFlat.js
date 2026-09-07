export const SUPPORT_ANGLE_FLAT = {
  id: "supportangle_2v1_flat_support_u11_v1",
  type: "animated-play",
  title: "2-on-1: Create the passing angle",
  concept: "2-on-1-support-flat",
  ageBands: ["U11", "U13"],
  view: "half-right",
  start: "read",
  space: { units: "rink-200x85" },
  sourceRef: {
    note: "docs/library/two-on-one-support-too-flat.md",
    cite: "On a 2-on-1 the support skater stays slightly behind the puck line to create a passing angle the defender cannot cover with the carrier.",
    url: "https://www.usahockey.com/smallareagames",
  },
  actors: [
    { id: "F1", team: "home", role: "puckCarrier", label: "F1" },
    { id: "F2", team: "home", role: "support", label: "F2" },
    { id: "D1", team: "away", role: "defender", label: "D1" },
    { id: "G", team: "away", role: "goalie", label: "G" },
  ],
  nodes: {
    read: {
      id: "read",
      q: "Which skater should create a better passing angle? Tap that skater.",
      pos: { F1: [146, 58], F2: [148, 30], D1: [158, 44], G: [186, 42] },
      puck: [143.5, 58],
      ask: {
        kind: "spot-mistake",
        q: "Which skater should create a better passing angle? Tap that skater.",
        mistakeActor: "F2",
        opts: [
          { id: "angle_f2", actorId: "F2", t: "The support skater", ok: true, why: "F2 is even with the puck. Dropping slightly behind the puck line creates a lane the defender cannot cover at the same time as F1.", next: "betterAngle" },
          { id: "angle_f1", actorId: "F1", t: "The puck carrier", no: "F1 can hold and scan, but this question is about support availability. F2 creates the passing angle away from the defender.", next: "betterAngle" },
          { id: "angle_d1", actorId: "D1", t: "The defender", no: "D1 is protecting the middle. The offensive support skater must change depth to create the open lane.", next: "betterAngle" },
        ],
      },
    },
    betterAngle: {
      id: "betterAngle",
      terminal: true,
      q: "F2 drops slightly behind the puck line. Now the defender cannot cover F1 and the passing lane at the same time.",
      enter: { F1: [146, 58], F2: [148, 30], D1: [158, 44], G: [186, 42] },
      pos: { F1: [146, 58], F2: [140, 26], D1: [158, 44], G: [186, 42] },
      puck: [143.5, 58],
      motions: [
        { actor: "F2", kind: "skate", from: [148, 30], to: [140, 26], label: "create depth" },
        { kind: "pass", from: [146, 58], to: [140, 26], label: "open lane" },
      ],
      cue: { label: "Better angle", shortLabel: "Angle", x: 140, y: 19 },
    },
  },
};
