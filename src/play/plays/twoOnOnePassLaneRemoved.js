export const twoOnOnePassLaneRemoved = {
  id: "play_2v1_pass_lane_removed_u11_v1",
  type: "animated-play",
  title: "2-on-1: Pass lane removed",
  concept: "2-on-1 reads",
  ageBands: ["U7", "U9", "U11", "U13", "U15", "U18"],
  view: "horizontal",
  start: "rush",
  space: {
    zone: "offensive",
    lane: "middle-to-slot"
  },
  sourceRef: {
    note: "docs/factory/two-on-one-family-plan.md",
    cite: "2-on-1 family variant: defender takes away pass lane"
  },
  actors: [
    { id: "F1", label: "F1", team: "home", role: "puckCarrier" },
    { id: "F2", label: "F2", team: "home", role: "support" },
    { id: "D1", label: "D1", team: "away", role: "defender" },
    { id: "G", label: "G", team: "away", role: "goalie" }
  ],
  nodes: {
    rush: {
      id: "rush",
      q: "The defender takes away the pass lane. What is the best read?",
      youngQ: "The pass is blocked. What should YOU do?",
      decisionActor: "F1",
      enter: { F1: [128, 58], F2: [146, 25], D1: [158, 42], G: [187, 42] },
      pos: { F1: [146, 57], F2: [162, 25], D1: [158, 39], G: [187, 42] },
      puck: [146, 57],
      cue: {
        label: "Pass lane closed",
        youngLabel: "Pass blocked",
        shortLabel: "Blocked",
        x: 154,
        y: 33
      },
      motions: [
        { actor: "F1", kind: "skate", from: [128, 58], to: [146, 57] },
        { actor: "F2", kind: "skate", from: [146, 25], to: [162, 25] },
        { actor: "D1", kind: "skate", from: [158, 42], to: [158, 39] }
      ],
      ask: {
        opts: [
          {
            id: "attack_shot_lane",
            t: "Attack the open shot lane",
            youngT: "Use the open space",
            ok: true,
            next: "finish",
            why: "When the defender removes the pass, the puck carrier can use the space they gave up.",
            youngWhy: "The pass is blocked, so YOU use the open space.",
            zone: [151, 56, 8]
          },
          {
            id: "force_pass",
            t: "Force the pass through D1",
            youngT: "Pass through the checker",
            no: "The defender is sitting in that lane, so forcing the pass risks a turnover.",
            youngWhy: "The checker is blocking that pass.",
            next: "turnover",
            zone: [158, 33, 8]
          },
          {
            id: "wait",
            t: "Wait for F2 to get more open",
            youngT: "Wait longer",
            no: "Waiting lets the defender and goalie reset.",
            youngWhy: "Waiting gives the checkers time.",
            next: "turnover",
            zone: [140, 50, 8]
          }
        ]
      }
    },
    finish: {
      id: "finish",
      terminal: true,
      q: "Good read. The pass is covered, so the puck carrier attacks the open shot lane.",
      youngQ: "Nice read. The pass is blocked, so YOU use the open space.",
      pos: { F1: [161, 55], F2: [163, 25], D1: [157, 39], G: [187, 42] },
      puck: [161, 55],
      cue: {
        label: "Shot lane",
        youngLabel: "Open",
        shortLabel: "Open",
        x: 160,
        y: 51
      },
      motions: [
        { actor: "F1", kind: "skate", from: [146, 57], to: [161, 55] },
        { actor: "F1", kind: "shot", from: [161, 55], to: [187, 42] }
      ]
    },
    turnover: {
      id: "turnover",
      terminal: true,
      q: "The forced pass gives the defender time to kill the play.",
      youngQ: "The checker was waiting for that pass.",
      pos: { F1: [146, 57], F2: [162, 25], D1: [158, 39], G: [187, 42] },
      puck: [158, 39],
      cue: {
        label: "Covered lane",
        youngLabel: "Blocked",
        shortLabel: "Blocked",
        x: 157,
        y: 34
      }
    }
  }
};
