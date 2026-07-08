
export const GAP_CONTROL_HOLD_PLAY = {
  id: "play_gap_control_hold_middle_u13_v1",
  type: "animated-play",
  title: "Gap control: Hold the middle",
  concept: "gap-control",
  ageBands: ["U11", "U13", "U15", "U18"],
  view: "half-right",
  start: "entry",
  space: { units: "rink-200x85" },
  sourceRef: {
    note: "docs/library/gap-control.md",
    cite: "Gap control read: when the attacker has speed, the defender should manage space while protecting the middle lane.",
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
      q: "The attacker is entering with speed. What is the best defensive read?",
      decisionActor: "D1",
      enter: { A1: [112, 50], D1: [150, 43], A2: [137, 24], G: [187, 42] },
      pos: { A1: [149, 48], D1: [160, 43], A2: [156, 25], G: [187, 42] },
      puck: [149, 48],
      freeze: { x: 160, y: 43, label: "" },
      motions: [
        { kind: "skate", from: [112, 50], to: [149, 48], actor: "A1" },
        { kind: "blocked", from: [149, 48], to: [187, 42], label: "middle protected" },
      ],
      overlays: [
        { kind: "freeze", x: 160, y: 43, label: "" },
      ],
      ask: {
        actor: "D1",
        q: "The attacker is entering with speed. What is the best defensive read?",
        opts: [
          { id: "hold_gap", t: "Hold inside gap and protect the middle", ok: true, next: "contained" },
          { id: "step_too_early", t: "Step up too early and reach", no: "Reaching early can open the middle lane.", outcome: "The attacker slips inside.", next: "middleOpen" },
          { id: "back_in", t: "Back straight into the goalie", no: "Backing in gives the attacker time and space.", outcome: "The attacker keeps the middle available.", next: "middleOpen" },
          { id: "chase_support", t: "Leave the puck carrier to chase A2", no: "The puck carrier is the immediate threat.", outcome: "The middle lane opens.", next: "middleOpen" },
        ],
      },
    },
    contained: {
      id: "contained",
      terminal: true,
      q: "Good gap. You protected the middle and forced the attacker into a lower-danger lane.",
      pos: { A1: [170, 58], D1: [166, 49], A2: [160, 26], G: [187, 42] },
      puck: [170, 58],
      motions: [
        { kind: "blocked", from: [150, 48], to: [187, 42], label: "middle denied" },
      ],
    },
    middleOpen: {
      id: "middleOpen",
      terminal: true,
      q: "The middle opens. Gap control is about managing space without giving up dangerous ice.",
      pos: { A1: [171, 42], D1: [164, 52], A2: [160, 26], G: [187, 42] },
      puck: [171, 42],
      motions: [
        { kind: "shot", from: [171, 42], to: [187, 42], label: "middle chance" },
      ],
    },
  },
};
