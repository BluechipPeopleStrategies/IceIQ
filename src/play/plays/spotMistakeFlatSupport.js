// Spot-mistake proof play. Exactly one wrong read on screen (One Defensible
// Mistake Rule): the support skater stays flat beside the carrier, so the
// cross-ice pass has no angle and the defender picks it off. F1's pass and
// D1's read are both defensible.
export const SPOT_MISTAKE_FLAT_SUPPORT = {
  id: "spotmistake_2v1_flat_support_u11_v1",
  type: "animated-play",
  title: "2-on-1: Spot the forced pass",
  concept: "odd-man-reads",
  ageBands: ["U11", "U13"],
  view: "half-right",
  start: "watch",
  space: { units: "rink-200x85" },
  sourceRef: {
    note: "docs/library/two-on-one-support-too-flat.md",
    cite: "On a 2-on-1 the support skater stays slightly behind the puck line; flat support removes the passing angle and lets one defender take both options.",
    url: "https://www.usahockey.com/smallareagames",
  },
  actors: [
    { id: "F1", team: "home", role: "puckCarrier", label: "F1" },
    { id: "F2", team: "home", role: "support", label: "F2" },
    { id: "D1", team: "away", role: "defender", label: "D1" },
    { id: "G", team: "away", role: "goalie", label: "G" },
  ],
  nodes: {
    watch: {
      id: "watch",
      q: "Watch the 2-on-1. The pass gets picked off.",
      enter: { F1: [130, 58], F2: [132, 30], D1: [168, 44], G: [187, 42] },
      pos: { F1: [146, 58], F2: [148, 30], D1: [149, 44], G: [186, 42] },
      puck: [141, 58],
      motions: [
        { kind: "skate", from: [130, 58], to: [146, 58], actor: "F1" },
        { kind: "skate", from: [132, 30], to: [148, 30], actor: "F2" },
      ],
      autoNext: { next: "intercept", ms: 700 },
    },
    intercept: {
      id: "intercept",
      q: "The defender steps into the passing lane.",
      enter: { F1: [146, 58], F2: [148, 30], D1: [149, 44], G: [186, 42] },
      pos: { F1: [146, 58], F2: [148, 30], D1: [147, 44], G: [186, 42] },
      enterPuck: [146, 58],
      puck: [144.5, 45],
      motions: [
        { kind: "blocked", from: [146, 58], to: [147, 44], label: "picked off" },
      ],
      autoNext: { next: "counter", ms: 650 },
    },
    counter: {
      id: "counter",
      q: "The defender takes the puck the other way.",
      enter: { F1: [146, 58], F2: [148, 30], D1: [147, 44], G: [186, 42] },
      pos: { F1: [146, 58], F2: [148, 30], D1: [136, 43], G: [186, 42] },
      enterPuck: [144.5, 45],
      puck: [133.5, 44],
      motions: [
        { kind: "blocked", from: [146, 58], to: [147, 44], label: "picked off" },
      ],
      possessionChange: { kind: "interception", fromTeam: "home", toActor: "D1", counterTo: [136, 43] },
      autoNext: { next: "spot", ms: 750 },
    },
    spot: {
      id: "spot",
      q: "The passing lane was covered. Tap the skater who forced the play.",
      pos: { F1: [146, 58], F2: [148, 30], D1: [136, 43], G: [186, 42] },
      puck: [133.5, 44],
      motions: [
        { kind: "blocked", from: [146, 58], to: [147, 44], label: "picked off" },
      ],
      ask: {
        kind: "spot-mistake",
        q: "The passing lane was covered. Tap the skater who forced the play.",
        mistakeActor: "F1",
        opts: [
          { id: "pick_f2", actorId: "F2", t: "The support skater", no: "F2 could create a better angle, but the puck carrier still owns the decision and cannot force a covered pass.", next: "replayRead" },
          { id: "pick_f1", actorId: "F1", t: "The puck carrier", ok: true, why: "F1 forced a covered pass after the defender had taken away the lane. The puck carrier must hold, shoot, or attack open ice instead.", next: "replayRead" },
          { id: "pick_d1", actorId: "D1", t: "The defender", no: "The defender made the right read: with support flat, sitting in the middle takes away the pass.", next: "replayRead" },
        ],
      },
    },
    replayRead: {
      id: "replayRead",
      q: "Watch the read again in slow motion.",
      enter: { F1: [140, 58], F2: [142, 30], D1: [154, 44], G: [186, 42] },
      pos: { F1: [146, 58], F2: [148, 30], D1: [149, 44], G: [186, 42] },
      puck: [141, 58],
      motions: [
        { kind: "skate", from: [140, 58], to: [146, 58], actor: "F1" },
        { kind: "skate", from: [142, 30], to: [148, 30], actor: "F2" },
      ],
      autoNext: { next: "replayIntercept", ms: 1000 },
    },
    replayIntercept: {
      id: "replayIntercept",
      q: "The defender reads the flat lane and steps through it.",
      enter: { F1: [146, 58], F2: [148, 30], D1: [149, 44], G: [186, 42] },
      pos: { F1: [146, 58], F2: [148, 30], D1: [147, 44], G: [186, 42] },
      enterPuck: [146, 58],
      puck: [144.5, 45],
      motions: [
        { kind: "blocked", from: [146, 58], to: [147, 44], label: "picked off" },
      ],
      autoNext: { next: "rewind", ms: 1100 },
    },
    rewind: {
      id: "rewind",
      terminal: true,
      q: "Rewind to the decision: the defender was already in the lane before F1 released the pass. Don't force a covered pass. If the lane is taken, hold, shoot, or attack the open ice.",
      enter: { F1: [146, 58], F2: [148, 30], D1: [147, 44], G: [186, 42] },
      pos: { F1: [146, 58], F2: [148, 30], D1: [136, 43], G: [186, 42] },
      enterPuck: [144.5, 45],
      puck: [133.5, 44],
      motions: [
        { kind: "blocked", from: [146, 58], to: [147, 44], label: "picked off" },
      ],
      possessionChange: { kind: "interception", fromTeam: "home", toActor: "D1", counterTo: [136, 43] },
      cue: { label: "Covered", shortLabel: "Covered", x: 146, y: 64 },
    },
  },
};
