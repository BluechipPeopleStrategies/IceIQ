// D-zone breakout, first play in the dz_breakout family.
//
// Correct-by-construction: the forechecker's committed side is the parameter that
// decides the answer. F1 arrives down the low side, so the low side is closed and the
// high side is open. Flip F1's commitment and the correct escape flips with it — which
// is what makes this a kernel candidate rather than a one-off.
//
// Read the design note first: docs/library/dz-breakout-retrieval-under-pressure.md

export const DZ_BREAKOUT_ESCAPE_PRESSURE = {
  id: "play_dz_breakout_escape_pressure_u13_v1",
  type: "animated-play",
  title: "D-zone breakout: Go the way they can't turn",
  concept: "dz-breakout",
  ageBands: ["U11", "U13", "U15", "U18"],
  view: "half-right",
  start: "retrieval",
  space: { units: "rink-200x85" },
  sourceRef: {
    note: "docs/library/dz-breakout-retrieval-under-pressure.md",
    cite: "Puck retrieval under pressure: the first forechecker must commit to one side of the net to arrive with speed, so the retrieving defender takes the puck to the side the forechecker can no longer defend, using the net as protection instead of skating through pressure or through their own slot.",
    url: "https://www.usahockey.com/practiceplans",
  },
  actors: [
    { id: "D1", team: "home", role: "puckCarrier", label: "YOU" },
    { id: "W1", team: "home", role: "support", label: "W1" },
    { id: "F1", team: "away", role: "defender", label: "F1" },
    { id: "F2", team: "away", role: "defender", label: "F2" },
    { id: "G", team: "home", role: "goalie", label: "G" },
  ],
  nodes: {
    retrieval: {
      id: "retrieval",
      q: "You have the puck behind your net and the first forechecker is charging down one side. Tap the ice where you take the puck.",
      decisionActor: "D1",
      // D1's freeze-frame position is intentionally the behindNetRight anchor
      // (src/play/rinkAnchors.js) — see docs/superpowers/specs/2026-07-30-anchor-fidelity-validator-design.md
      // for the 11.5-unit drift this replaces and why it matters for the read.
      intendedAnchor: { D1: "behindNetRight" },
      enter: {
        D1: [196, 44],
        W1: [172, 16],
        F1: [172, 70],
        F2: [150, 38],
        G: [187, 42],
      },
      pos: {
        D1: [192.5, 42.5],
        W1: [172, 16],
        F1: [183, 64],
        F2: [162, 42],
        G: [187, 42],
      },
      puck: [192.5, 42.5],
      freeze: { x: 192.5, y: 42.5, label: "" },
      motions: [
        { kind: "skate", from: [196, 44], to: [192.5, 42.5], actor: "D1" },
        { kind: "skate", from: [172, 70], to: [183, 64], actor: "F1" },
        { kind: "skate", from: [150, 38], to: [162, 42], actor: "F2" },
      ],
      overlays: [],
      ask: {
        actor: "D1",
        choiceMode: "lane-pick",
        q: "You have the puck behind your net and the first forechecker is charging down one side. Tap the ice where you take the puck.",
        opts: [
          {
            id: "escape_open_side",
            t: "Take it back around the net to the side the forechecker has turned away from",
            youngT: "Go the way they can't turn",
            icon: "🔄",
            zone: [186, 25, 6],
            ok: true,
            next: "escaped",
          },
          {
            id: "into_pressure",
            t: "Keep coming out this side, into the forechecker",
            youngT: "Keep going toward them",
            icon: "💥",
            zone: [187, 68, 5],
            no: "They are arriving with speed you do not have yet, and behind your own net is the worst place to lose a puck battle.",
            outcome: "You get pinned and the puck ends up in front of your net.",
            next: "pinned",
          },
          {
            id: "through_the_slot",
            t: "Step straight out in front of your own net",
            youngT: "Go out in front of the net",
            icon: "⚠️",
            zone: [177, 42.5, 5],
            no: "The slot is the most dangerous ice on the sheet, and the second forechecker is already reading it.",
            outcome: "A routine retrieval turns into a scoring chance against.",
            next: "slotTurnover",
          },
          {
            id: "hold_behind_net",
            t: "Tuck back in behind the net and wait for help",
            youngT: "Wait behind the net",
            icon: "⏳",
            zone: [196.5, 42.5, 3.5],
            no: "The second forechecker is already coming, so waiting turns one problem into two.",
            outcome: "You get surrounded and the outlet you had is gone.",
            next: "heldTooLong",
          },
        ],
      },
    },

    escaped: {
      id: "escaped",
      terminal: true,
      q: "That is the read. They committed to one side, so the other side was theirs to give up. You came out with the puck, with speed, and your winger was there.",
      pos: {
        D1: [186, 26],
        W1: [172, 16],
        F1: [190, 60],
        F2: [166, 40],
        G: [187, 42],
      },
      puck: [172, 16],
      motions: [
        { kind: "skate", from: [192.5, 42.5], to: [186, 26], actor: "D1", via: [[197, 42]] },
        { kind: "skate", from: [183, 64], to: [190, 60], actor: "F1" },
        { kind: "pass", from: [186, 26], to: [172, 16], label: "outlet" },
      ],
    },

    pinned: {
      id: "pinned",
      terminal: true,
      q: "You skated into the pressure instead of away from it. They arrived with more speed than you had, and the puck came loose in the worst place on the ice.",
      pos: {
        D1: [187, 62],
        W1: [172, 16],
        F1: [184, 63],
        F2: [170, 46],
        G: [187, 42],
      },
      puck: [176, 44],
      motions: [
        { kind: "skate", from: [192.5, 42.5], to: [187, 62], actor: "D1" },
        { kind: "skate", from: [183, 64], to: [184, 63], actor: "F1" },
        { kind: "pass", from: [184, 63], to: [176, 44], label: "loose to the slot" },
      ],
    },

    slotTurnover: {
      id: "slotTurnover",
      terminal: true,
      q: "Never bring the puck through your own slot. The second forechecker was reading exactly that, and now they have it in the most dangerous spot on the sheet.",
      pos: {
        D1: [181, 45],
        W1: [172, 16],
        F1: [186, 60],
        F2: [176, 43],
        G: [187, 42],
      },
      puck: [176, 43],
      motions: [
        { kind: "skate", from: [192.5, 42.5], to: [181, 45], actor: "D1" },
        { kind: "blocked", from: [181, 45], to: [176, 43], label: "picked off" },
        { kind: "shot", from: [176, 43], to: [184.5, 42.5] },
      ],
    },

    heldTooLong: {
      id: "heldTooLong",
      terminal: true,
      q: "Waiting felt safe, but the second forechecker was already on the way. One problem became two, and the outlet you had when you picked it up is gone.",
      pos: {
        D1: [195, 46],
        W1: [172, 16],
        F1: [191, 57],
        F2: [191, 31],
        G: [187, 42],
      },
      puck: [195, 46],
      motions: [
        { kind: "skate", from: [192.5, 42.5], to: [195, 46], actor: "D1" },
        { kind: "skate", from: [183, 64], to: [191, 57], actor: "F1" },
        { kind: "skate", from: [162, 42], to: [191, 31], actor: "F2" },
        { kind: "blocked", from: [195, 46], to: [172, 16], label: "outlet gone" },
      ],
    },
  },
};
