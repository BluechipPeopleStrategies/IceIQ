
export const OFF_PUCK_SUPPORT_PLAY = {
  id: "play_off_puck_support_window_u11_v1",
  type: "animated-play",
  title: "Off-puck support: Find the window",
  concept: "off-puck-support-offense",
  ageBands: ["U7", "U9", "U11", "U13"],
  view: "half-right",
  start: "supportRead",
  space: { units: "rink-200x85" },
  sourceRef: {
    note: "docs/library/off-puck-support-offense.md",
    cite: "Off-puck support read: when the puck carrier is pressured, the support player should move into open ice where the puck can reach them.",
    url: "https://www.usahockey.com/practiceplans",
  },
  actors: [
    { id: "F1", team: "home", role: "puckCarrier", label: "F1" },
    { id: "F2", team: "home", role: "support", label: "YOU" },
    { id: "D1", team: "away", role: "defender", label: "D1" },
    { id: "D2", team: "away", role: "defender", label: "D2" },
    { id: "G", team: "away", role: "goalie", label: "G" },
  ],
  nodes: {
    supportRead: {
      id: "supportRead",
      q: "Your teammate has the puck under pressure. Where should you go to help?", youngQ: "Where should YOU go?",
      decisionActor: "F2",
      enter: { F1: [145, 58], F2: [155, 35], D1: [149, 55], D2: [157, 37], G: [187, 42] },
      pos: { F1: [151, 58], F2: [164, 29], D1: [153, 55], D2: [158, 38], G: [187, 42] },
      puck: [151, 58],
      freeze: { x: 164, y: 29, label: "1" },
      motions: [
        { kind: "skate", from: [155, 35], to: [164, 29], actor: "F2" },
        { kind: "blocked", from: [151, 58], to: [158, 38], label: "covered support" },
      ],
      overlays: [
        { kind: "freeze", x: 164, y: 29, label: "1" },
      ],
      ask: {
        actor: "F2",
        q: "Your teammate has the puck under pressure. Where should you go to help?", youngQ: "Where should YOU go?",
        opts: [
          { id: "slide_window", t: "Slide into the open passing window", ok: true, next: "catchWindow" },
          { id: "stand_still", t: "Stand still and wait", no: "Standing still keeps you covered.", outcome: "The passing lane stays closed.", next: "covered" },
          { id: "skate_to_puck", t: "Skate directly toward the puck", no: "That brings your defender into the puck carrier's space.", outcome: "Pressure gets tighter.", next: "covered" },
          { id: "hide_behind_defender", t: "Stay behind the defender", no: "The puck carrier cannot pass through the defender.", outcome: "You are not available.", next: "covered" },
        ],
      },
    },
    catchWindow: {
      id: "catchWindow",
      terminal: true,
      q: "Good support. You moved away from coverage and gave F1 a clean option.",
      pos: { F1: [153, 58], F2: [166, 28], D1: [154, 56], D2: [159, 39], G: [187, 42] },
      puck: [166, 28],
      motions: [
        { kind: "pass", from: [153, 58], to: [166, 28], label: "support pass" },
      ],
    },
    covered: {
      id: "covered",
      terminal: true,
      q: "The support option is covered. Away from the puck, your job is to become useful before the puck carrier runs out of space.",
      pos: { F1: [154, 58], F2: [158, 38], D1: [155, 56], D2: [158, 38], G: [187, 42] },
      puck: [154, 58],
      motions: [
        { kind: "blocked", from: [154, 58], to: [158, 38], label: "covered" },
      ],
    },
  },
};
