
export const FORECHECK_PRESSURE_PLAY = {
  id: "play_forecheck_pressure_force_wall_u13_v1",
  type: "animated-play",
  title: "Forecheck pressure: Force the wall",
  concept: "forecheck-pressure",
  ageBands: ["U11", "U13", "U15", "U18"],
  view: "half-right",
  start: "forecheck",
  space: { units: "rink-200x85" },
  sourceRef: {
    note: "docs/library/forecheck-pressure.md",
    cite: "Forecheck pressure read: the first forechecker should angle pressure to remove the middle and force the puck carrier toward the wall or a predictable outlet.",
    url: "https://www.usahockey.com/practiceplans",
  },
  actors: [
    { id: "P1", team: "home", role: "defender", label: "YOU" },
    { id: "A1", team: "away", role: "puckCarrier", label: "A1" },
    { id: "A2", team: "away", role: "support", label: "A2" },
    { id: "D1", team: "home", role: "defender", label: "D1" },
    { id: "G", team: "away", role: "goalie", label: "G" },
  ],
  nodes: {
    forecheck: {
      id: "forecheck",
      q: "You are first forechecker. How should you pressure the puck carrier?",
      decisionActor: "P1",
      enter: { P1: [118, 67], A1: [154, 55], A2: [172, 27], D1: [148, 31], G: [187, 42] },
      pos: { P1: [150, 55], A1: [164, 51], A2: [171, 27], D1: [157, 32], G: [187, 42] },
      puck: [164, 51],
      freeze: { x: 150, y: 55, label: "" },
      motions: [
        { kind: "skate", from: [118, 67], to: [150, 55], actor: "P1" },
        { kind: "blocked", from: [163, 50], to: [171, 27], label: "middle outlet denied" },
      ],
      overlays: [
        { kind: "freeze", x: 150, y: 55, label: "" },
      ],
      ask: {
        actor: "P1",
        q: "You are first forechecker. How should you pressure the puck carrier?",
        opts: [
          { id: "angle_wall", t: "Angle inside-out and force the wall", ok: true, next: "forcedWall" },
          { id: "straight_line", t: "Skate straight at the puck", no: "Straight pressure lets the puck carrier choose either side.", outcome: "The middle remains available.", next: "middlePass" },
          { id: "chase_behind", t: "Chase from behind the play", no: "Chasing gives the puck carrier time to scan.", outcome: "The outlet opens.", next: "middlePass" },
          { id: "peel_off", t: "Peel away to cover the net", no: "As first pressure, leaving the puck gives the carrier too much time.", outcome: "The breakout starts cleanly.", next: "middlePass" },
        ],
      },
    },
    forcedWall: {
      id: "forcedWall",
      terminal: true,
      // A1's position is directional ("forced a predictable wall play"), not
      // a fixed structural landmark — checked against the boards segment,
      // not a single point. docs/superpowers/specs/2026-07-30-wall-anchor-investigation.md
      intendedAnchor: { A1: "wallSegmentRightBottom" },
      q: "Good pressure. You removed the middle and forced a predictable wall play.",
      pos: { P1: [158, 55], A1: [168, 63], A2: [172, 28], D1: [160, 34], G: [187, 42] },
      puck: [168, 63],
      motions: [
        { kind: "blocked", from: [163, 50], to: [172, 28], label: "middle denied" },
      ],
    },
    middlePass: {
      id: "middlePass",
      terminal: true,
      q: "The middle opens. Forecheck pressure should take away the dangerous option first.",
      pos: { P1: [158, 58], A1: [166, 50], A2: [174, 30], D1: [160, 34], G: [187, 42] },
      puck: [174, 30],
      motions: [
        { kind: "pass", from: [166, 50], to: [174, 30], label: "middle outlet" },
      ],
    },
  },
};
