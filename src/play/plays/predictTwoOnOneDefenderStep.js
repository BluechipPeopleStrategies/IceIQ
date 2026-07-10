// Predict-next proof play. Occlusion point: the rush is live and the lone
// defender has not committed yet. The freeze shows the problem, not the
// solution (Question Reveal Rule); the truth node replays what happens.
export const PREDICT_TWO_ON_ONE_DEFENDER_STEP = {
  id: "predict_2v1_defender_step_u13_v1",
  type: "animated-play",
  title: "2-on-1: Read the defender's step",
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
      q: "The defender steps toward YOU. Which play is now open?",
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
        q: "The defender steps toward YOU. Which play is now open?",
        truthNext: "truth",
        opts: [
          { id: "lane_opens", t: "Pass to F2", ok: true, why: "The defender steps toward you and leaves F2 open.", next: "truth" },
          { id: "both_closed", t: "Shoot through the defender", no: "The defender has stepped into your shooting lane.", next: "truth" },
          { id: "lane_disappears", t: "Hold the puck", no: "F2 is open now. Move the puck before the defender can recover.", next: "truth" },
        ],
      },
    },
    truth: {
      id: "truth",
      terminal: true,
      q: "Correct. The defender steps toward YOU, so they cannot also cover F2. Make the pass.",
      pos: { F1: [146, 60], F2: [162, 24], D1: [158, 51], G: [186, 42] },
      puck: [141, 60],
      motions: [
        { kind: "skate", from: [162, 49], to: [158, 51], actor: "D1" },
      ],
      cue: { label: "Step", shortLabel: "Step", x: 158, y: 44 },
    },
  },
};
