export const GAP_CONTROL_PIVOT_MATCH_PLAY = {
  id: "play_gap_control_pivot_match_speed_u13_v1",
  type: "animated-play",
  title: "Gap control: Match the rush speed",
  concept: "gap-control",
  ageBands: ["U11", "U13", "U15", "U18"],
  view: "half-right",
  start: "rush",
  space: { units: "rink-200x85" },
  sourceRef: {
    note: "docs/library/gap-control.md",
    cite: "Gap control read: when an attacker builds speed, the defender should pivot early, match speed, keep the play in front, and protect the middle lane.",
    url: "https://www.usahockey.com/practiceplans",
  },
  actors: [
    { id: "A1", team: "away", role: "puckCarrier", label: "A1" },
    { id: "D1", team: "home", role: "defender", label: "YOU" },
    { id: "G", team: "home", role: "goalie", label: "G" },
  ],
  nodes: {
    rush: {
      id: "rush",
      q: "The attacker is building speed at you. What is the best gap-control read?",
      decisionActor: "D1",
      enter: {
        A1: [118, 42],
        D1: [155, 43],
        G: [187, 42],
      },
      pos: {
        A1: [145, 42],
        D1: [160, 43],
        G: [187, 42],
      },
      puck: [145, 42],
      freeze: { x: 160, y: 43, label: "" },
      motions: [
        { kind: "skate", from: [118, 42], to: [145, 42], actor: "A1" },
      ],
      overlays: [
        { kind: "freeze", x: 160, y: 43, label: "" },
      ],
      ask: {
        actor: "D1",
        q: "The attacker is building speed at you. What is the best gap-control read?",
        opts: [
          {
            id: "pivot_match",
            t: "Pivot early, match speed, and keep the attacker in front",
            youngT: "Turn early and stay in front",
            ok: true,
            next: "matched",
          },
          {
            id: "hold_flat",
            t: "Stay flat-footed and reach at the blue line",
            youngT: "Stand still and reach",
            no: "A fast attacker can beat a flat-footed defender.",
            outcome: "The attacker chips the puck past you and wins the race.",
            next: "beatenWide",
          },
          {
            id: "lunge_puck",
            t: "Lunge straight at the puck carrier",
            youngT: "Jump at the puck",
            no: "Lunging at speed usually opens a lane behind you.",
            outcome: "The attacker cuts inside your reach.",
            next: "middleOpen",
          },
          {
            id: "retreat_deep",
            t: "Retreat deep into the slot right away",
            youngT: "Back way in",
            no: "Backing in too early gives up too much ice.",
            outcome: "The attacker gets time and space in a dangerous area.",
            next: "tooMuchSpace",
          },
        ],
      },
    },

    matched: {
      id: "matched",
      terminal: true,
      q: "Good read. You matched speed, kept the rush in front, and protected the middle.",
      pos: {
        A1: [169, 55],
        D1: [166, 47],
        G: [187, 42],
      },
      puck: [169, 55],
      motions: [
        { kind: "skate", from: [160, 43], to: [166, 47], actor: "D1" },
        { kind: "blocked", from: [169, 55], to: [187, 42], label: "middle protected" },
      ],
    },

    beatenWide: {
      id: "beatenWide",
      terminal: true,
      q: "You waited flat-footed. Against speed, the attacker can chip the puck past you and win the outside lane.",
      pos: {
        A1: [174, 61],
        D1: [160, 44],
        G: [187, 42],
      },
      puck: [174, 61],
      motions: [
        { kind: "skate", from: [145, 42], to: [174, 61], actor: "A1" },
      ],
    },

    middleOpen: {
      id: "middleOpen",
      terminal: true,
      q: "The lunge misses. Gap control is about matching speed first, not stabbing at the puck.",
      pos: {
        A1: [171, 42],
        D1: [158, 54],
        G: [187, 42],
      },
      puck: [171, 42],
      motions: [
        { kind: "shot", from: [171, 42], to: [187, 42], label: "middle chance" },
      ],
    },

    tooMuchSpace: {
      id: "tooMuchSpace",
      terminal: true,
      q: "You gave up too much ice. The attacker keeps speed and gets time to choose the next play.",
      pos: {
        A1: [166, 45],
        D1: [178, 43],
        G: [187, 42],
      },
      puck: [166, 45],
      motions: [
        { kind: "skate", from: [145, 42], to: [166, 45], actor: "A1" },
      ],
    },
  },
};
