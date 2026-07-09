export const FORECHECK_TAKE_AWAY_REVERSE_PLAY = {
  id: "play_forecheck_pressure_take_away_reverse_u13_v1",
  type: "animated-play",
  title: "Forecheck pressure: Take away the reverse",
  concept: "forecheck-pressure",
  ageBands: ["U11", "U13", "U15", "U18"],
  view: "half-right",
  start: "pressure",
  space: { units: "rink-200x85" },
  sourceRef: {
    note: "docs/library/forecheck-pressure.md",
    cite: "Forecheck pressure second read: after the carrier is forced one way, the first forechecker should finish on an angle that takes away the reverse so the breakout stays predictable.",
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
    pressure: {
      id: "pressure",
      q: "You are first on the forecheck. The carrier starts up the wall with a teammate trailing behind. How do you finish the pressure?",
      decisionActor: "P1",
      enter: { P1: [138, 44], A1: [182, 60], A2: [186, 50], D1: [128, 60], G: [187, 42] },
      pos: { P1: [156, 52], A1: [172, 62], A2: [181, 57], D1: [134, 61], G: [187, 42] },
      puck: [172, 62],
      freeze: { x: 156, y: 52, label: "" },
      motions: [
        { kind: "skate", from: [182, 60], to: [172, 62], actor: "A1" },
        { kind: "skate", from: [138, 44], to: [156, 52], actor: "P1" },
      ],
      overlays: [
        { kind: "freeze", x: 156, y: 52, label: "" },
      ],
      ask: {
        actor: "P1",
        q: "You are first on the forecheck. The carrier starts up the wall with a teammate trailing behind. How do you finish the pressure?",
        opts: [
          {
            id: "seal_reverse",
            t: "Angle in behind the carrier and take away the reverse",
            youngT: "Angle in and block the pass back",
            ok: true,
            next: "sealed",
          },
          {
            id: "straight_rush",
            t: "Rush straight at the puck carrier",
            youngT: "Skate right at them",
            no: "A straight rush lets the carrier turn back and escape the way they came.",
            outcome: "The puck reverses behind your pressure.",
            next: "reversed",
          },
          {
            id: "overrun_wall",
            t: "Cut off the wall higher up before the carrier gets there",
            youngT: "Race to the wall up ahead",
            no: "Committing to the wall early leaves the middle open.",
            outcome: "The carrier cuts inside through the space you left.",
            next: "cutInside",
          },
          {
            id: "glide_wait",
            t: "Glide in and wait for the carrier to come to you",
            youngT: "Slow down and wait",
            no: "First pressure has to keep skating; waiting hands the time back.",
            outcome: "The carrier keeps speed and picks the next play.",
            next: "freeTime",
          },
        ],
      },
    },

    sealed: {
      id: "sealed",
      terminal: true,
      q: "Good angle. You are skating in the reverse lane, so the carrier has to keep going up the wall into your pinching defender.",
      pos: { P1: [170, 61], A1: [162, 64], A2: [181, 57], D1: [146, 63], G: [187, 42] },
      puck: [162, 64],
      motions: [
        { kind: "skate", from: [156, 52], to: [170, 61], actor: "P1" },
        { kind: "blocked", from: [162, 64], to: [181, 57], label: "reverse closed" },
      ],
    },

    reversed: {
      id: "reversed",
      terminal: true,
      q: "The carrier turns back and reverses it. Your pressure is behind the play and the breakout flips away from you.",
      pos: { P1: [168, 61], A1: [175, 63], A2: [181, 57], D1: [134, 61], G: [187, 42] },
      puck: [181, 57],
      motions: [
        { kind: "skate", from: [156, 52], to: [168, 61], actor: "P1" },
        { kind: "pass", from: [172, 62], to: [181, 57], label: "reverse" },
      ],
    },

    cutInside: {
      id: "cutInside",
      terminal: true,
      q: "You committed to the wall too early. The carrier cuts off the wall into the middle you just left.",
      pos: { P1: [158, 65], A1: [165, 50], A2: [181, 57], D1: [134, 61], G: [187, 42] },
      puck: [165, 50],
      motions: [
        { kind: "skate", from: [156, 52], to: [158, 65], actor: "P1" },
        { kind: "skate", from: [172, 62], to: [165, 50], actor: "A1" },
      ],
    },

    freeTime: {
      id: "freeTime",
      terminal: true,
      q: "You stopped moving your feet. The carrier keeps speed, reads the pressure, and the breakout starts on their terms.",
      pos: { P1: [158, 55], A1: [162, 61], A2: [178, 58], D1: [134, 61], G: [187, 42] },
      puck: [162, 61],
      motions: [
        { kind: "skate", from: [172, 62], to: [162, 61], actor: "A1" },
      ],
    },
  },
};
