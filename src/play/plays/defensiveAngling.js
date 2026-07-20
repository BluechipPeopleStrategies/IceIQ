
export const DEFENSIVE_ANGLING_PLAY = {
  id: "play_defensive_angling_steer_wide_u11_v1",
  type: "animated-play",
  title: "Defensive angling: Steer wide",
  concept: "defensive-angling",
  ageBands: ["U9", "U11", "U13", "U15"],
  view: "half-right",
  start: "entry",
  space: { units: "rink-200x85" },
  sourceRef: {
    note: "docs/library/defensive-angling.md",
    cite: "Defensive angling read: when the defender has inside position, the priority is to protect the middle and steer the attacker wide.",
    url: "https://www.usahockey.com/practiceplans",
  },
  actors: [
    { id: "A1", team: "away", role: "puckCarrier", label: "A1" },
    { id: "D1", team: "home", role: "defender", label: "YOU" },
    { id: "A2", team: "away", role: "support", label: "A2" },
    { id: "G", team: "home", role: "goalie", label: "G" },
  ],
  nodes: {
    entry: {
      id: "entry",
      q: "The attacker is entering with speed and you have inside position. What is the best defensive read?",
      decisionActor: "D1",
      enter: { A1: [132, 54], D1: [150, 45], A2: [144, 25], G: [187, 42] },
      pos: { A1: [148, 55], D1: [158, 45], A2: [154, 26], G: [187, 42] },
      puck: [148, 55],
      freeze: { x: 158, y: 45, label: "1" },
      motions: [
        { kind: "skate", from: [132, 54], to: [148, 55], actor: "A1" },
        { kind: "blocked", from: [148, 55], to: [183, 42], label: "middle protected" },
      ],
      overlays: [
        { kind: "freeze", x: 158, y: 45, label: "1" },
      ],
      ask: {
        actor: "D1",
        q: "The attacker is entering with speed and you have inside position. What is the best defensive read?",
        opts: [
          { id: "steer_wide", t: "Hold inside position and steer wide", ok: true, next: "wide" },
          { id: "chase_puck", t: "Reach across and chase the puck", no: "Reaching can open the middle lane.", outcome: "The attacker cuts inside.", next: "inside" },
          { id: "back_straight_in", t: "Back straight into the goalie", no: "Backing straight in gives the attacker too much middle ice.", outcome: "The attacker keeps options.", next: "inside" },
          { id: "stand_still", t: "Stop and wait", no: "Stopping gives the attacker speed advantage.", outcome: "The attacker skates around you.", next: "inside" },
        ],
      },
    },
    wide: {
      id: "wide",
      terminal: true,
      q: "Good defensive read. You protected the middle and guided the attacker to the outside.",
      pos: { A1: [170, 67], D1: [166, 55], A2: [158, 26], G: [187, 42] },
      puck: [170, 67],
      motions: [
        { kind: "blocked", from: [151, 55], to: [187, 42], label: "middle protected" },
      ],
    },
    inside: {
      id: "inside",
      terminal: true,
      q: "The middle opens. Defensive angling starts with protecting the dangerous ice first.",
      pos: { A1: [172, 43], D1: [164, 54], A2: [160, 27], G: [187, 42] },
      puck: [172, 43],
      motions: [
        { kind: "shot", from: [172, 43], to: [187, 42], label: "middle chance" },
      ],
    },
  },
};
