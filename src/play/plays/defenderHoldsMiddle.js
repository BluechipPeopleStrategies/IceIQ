
export const TWO_ON_ONE_DEFENDER_HOLDS_PLAY = {
  id: "play_2v1_defender_holds_middle_u11_v1",
  type: "animated-play",
  title: "2-on-1: Defender holds middle",
  concept: "odd-man-reads",
  ageBands: ["U9", "U11", "U13"],
  view: "half-right",
  start: "rush",
  space: { units: "rink-200x85" },
  sourceRef: {
    note: "docs/library/odd-man-reads.md",
    cite: "Odd-man rush read: when the defender protects the pass lane and stays between the puck carrier and support, the puck carrier may have the better shot or attack lane.",
    url: "https://www.usahockey.com/smallareagames",
  },
  actors: [
    { id: "F1", team: "home", role: "puckCarrier", label: "YOU" },
    { id: "F2", team: "home", role: "support", label: "F2" },
    { id: "D1", team: "away", role: "defender", label: "D1" },
    { id: "G", team: "away", role: "goalie", label: "G" },
  ],
  nodes: {
    rush: {
      id: "rush",
      q: "The lone defender holds the middle and takes away the pass. What is the best read?",
      decisionActor: "F1",
      enter: { F1: [132, 57], F2: [154, 25], D1: [174, 43], G: [187, 42] },
      pos: { F1: [148, 56], F2: [162, 25], D1: [164, 39], G: [186, 42] },
      puck: [145, 56],
      freeze: { x: 148, y: 56, label: "1" },
      motions: [
        { kind: "skate", from: [132, 57], to: [148, 56], actor: "F1" },
        { kind: "skate", from: [154, 25], to: [162, 25], actor: "F2" },
        { kind: "blocked", from: [148, 56], to: [162, 25], label: "pass lane covered" },
      ],
      overlays: [
        { kind: "freeze", x: 148, y: 56, label: "1" },
      ],
      ask: {
        actor: "F1",
        q: "The lone defender holds the middle and takes away the pass. What is the best read?",
        opts: [
          { id: "force_pass", t: "Force the pass through D1", no: "The defender is sitting in the pass lane.", outcome: "D1 breaks up the pass.", next: "forcedPass" },
          { id: "shoot_lane", t: "Attack the open shot lane", ok: true, next: "finish" },
          { id: "wait", t: "Wait for the perfect pass", no: "Waiting gives the defender and goalie time to reset.", outcome: "The numbers advantage disappears.", next: "turnover" },
          { id: "skate_corner", t: "Skate away into the corner", no: "That gives up the middle-lane advantage.", outcome: "The scoring chance fades.", next: "turnover" },
        ],
      },
    },
    finish: {
      id: "finish",
      terminal: true,
      q: "Good read. D1 protected the pass, so you attacked the shot lane before the goalie got comfortable.",
      pos: { F1: [164, 54], F2: [163, 25], D1: [166, 39], G: [183, 42] },
      puck: [190, 43],
      motions: [
        { kind: "shot", from: [164, 54], to: [190, 43], label: "quick shot" },
      ],
    },
    forcedPass: {
      id: "forcedPass",
      terminal: true,
      q: "The defender breaks up the pass. When D1 sits in the lane, forcing the puck through the middle is the low-percentage play.",
      pos: { F1: [150, 56], F2: [162, 25], D1: [160, 39], G: [186, 42] },
      puck: [160, 39],
      motions: [
        { kind: "blocked", from: [150, 56], to: [160, 39], label: "pass blocked" },
      ],
    },
    turnover: {
      id: "turnover",
      terminal: true,
      q: "The window closes. On a 2-on-1, the read changes based on what the defender takes away.",
      pos: { F1: [160, 57], F2: [165, 27], D1: [163, 42], G: [186, 42] },
      puck: [163, 42],
      motions: [
        { kind: "blocked", from: [160, 57], to: [163, 42], label: "lane gone" },
      ],
    },
  },
};
