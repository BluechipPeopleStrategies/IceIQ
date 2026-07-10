// Predict-next proof play. Occlusion point: the rush is live and the lone
// defender has not committed yet. The freeze shows the problem, not the
// solution (Question Reveal Rule); the truth node replays what happens.
export const PREDICT_TWO_ON_ONE_DEFENDER_STEP = {
  id: "predict_2v1_defender_step_u13_v1",
  type: "animated-play",
  title: "2-on-1: Predict the opening lane",
  concept: "odd-man-reads",
  ageBands: ["U13"],
  view: "half-right",
  start: "entry",
  space: { units: "rink-200x85" },
  sourceRef: {
    note: "docs/library/odd-man-reads.md",
    cite: "Odd-man rush read: when the lone defender steps to the puck carrier, the support option behind the defender becomes the clean next play.",
    url: "https://www.usahockey.com/smallareagames",
  },
  actors: [
    { id: "F1", team: "home", role: "puckCarrier", label: "YOU" },
    { id: "F2", team: "home", role: "support", label: "F2" },
    { id: "D1", team: "away", role: "defender", label: "D1" },
    { id: "G", team: "away", role: "goalie", label: "G" },
  ],
  nodes: {
    entry: {
      id: "entry",
      q: "The defender has stopped backing in and is stepping toward you. What happens to the passing lane next?",
      decisionActor: "F1",
      enter: { F1: [126, 60], F2: [150, 24], D1: [172, 45], G: [187, 42] },
      pos: { F1: [138, 60], F2: [158, 24], D1: [162, 49], G: [186, 42] },
      puck: [133, 60],
      motions: [
        { kind: "skate", from: [126, 60], to: [138, 60], actor: "F1" },
        { kind: "skate", from: [150, 24], to: [158, 24], actor: "F2" },
      ],
      ask: {
        kind: "predict-next",
        q: "The defender has stopped backing in and is stepping toward you. What happens to the passing lane next?",
        truthNext: "truth",
        opts: [
          { id: "lane_opens", t: "The lane behind the defender opens", ok: true, why: "The defender's step commits body and stick toward the puck carrier, opening space behind the step for F2.", next: "truth" },
          { id: "both_closed", t: "The defender closes both the shot and pass", no: "One defender cannot step to the puck and cover the support lane at the same time.", next: "truth" },
          { id: "lane_disappears", t: "The support lane disappears", no: "The visible step moves the defender away from the support lane, so that space opens rather than disappears.", next: "truth" },
        ],
      },
    },
    truth: {
      id: "truth",
      terminal: true,
      q: "The defender's step opens the support lane behind them. That visible commitment makes the pass to F2 the next read.",
      pos: { F1: [146, 60], F2: [162, 24], D1: [158, 51], G: [186, 42] },
      puck: [141, 60],
      motions: [
        { kind: "skate", from: [162, 49], to: [158, 51], actor: "D1" },
      ],
      cue: { label: "Step", shortLabel: "Step", x: 158, y: 44 },
    },
  },
};
