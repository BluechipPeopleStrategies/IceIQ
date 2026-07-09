// Predict-next proof play. Occlusion point: the rush is live and the lone
// defender has not committed yet. The freeze shows the problem, not the
// solution (Question Reveal Rule); the truth node replays what happens.
export const PREDICT_TWO_ON_ONE_DEFENDER_STEP = {
  id: "predict_2v1_defender_step_u13_v1",
  type: "animated-play",
  title: "2-on-1: Predict the defender",
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
      q: "Freeze. You carry the puck into a 2-on-1. What does the defender do next?",
      decisionActor: "F1",
      enter: { F1: [126, 60], F2: [150, 24], D1: [172, 45], G: [187, 42] },
      pos: { F1: [138, 60], F2: [158, 24], D1: [166, 47], G: [186, 42] },
      puck: [133, 60],
      motions: [
        { kind: "skate", from: [126, 60], to: [138, 60], actor: "F1" },
        { kind: "skate", from: [150, 24], to: [158, 24], actor: "F2" },
      ],
      ask: {
        kind: "predict-next",
        q: "Freeze. You carry the puck into a 2-on-1. What does the defender do next?",
        truthNext: "truth",
        opts: [
          { id: "steps_up", t: "The defender steps up to the puck", ok: true, why: "The gap was already tight. When the defender's feet turn to the puck carrier, the pass behind is the next read.", next: "truth" },
          { id: "sags_pass", t: "The defender sags to take away the pass", no: "Watch the defender's gap. It was closing on the puck side, not sliding to the pass lane.", next: "truth" },
          { id: "backs_in", t: "The defender keeps backing in with the rush", no: "Backing in gives up the shot. This defender had already stopped giving ground.", next: "truth" },
        ],
      },
    },
    truth: {
      id: "truth",
      terminal: true,
      q: "The defender steps up to the puck. That is the trigger: the support pass behind the step is now the read.",
      pos: { F1: [146, 60], F2: [162, 24], D1: [158, 51], G: [186, 42] },
      puck: [141, 60],
      motions: [
        { kind: "skate", from: [166, 47], to: [158, 51], actor: "D1" },
      ],
      cue: { label: "Step", shortLabel: "Step", x: 158, y: 44 },
    },
  },
};
