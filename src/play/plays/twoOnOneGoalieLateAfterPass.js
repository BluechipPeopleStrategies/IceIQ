export const twoOnOneGoalieLateAfterPass = {
  id: "play_2v1_goalie_late_after_pass_u11_v1",
  type: "animated-play",
  title: "2-on-1: Goalie late after pass",
  concept: "2-on-1 reads",
  ageBands: ["U7", "U9", "U11", "U13", "U15", "U18"],
  view: "horizontal",
  start: "catch",
  space: {
    zone: "offensive",
    lane: "backdoor"
  },
  sourceRef: {
    note: "docs/factory/two-on-one-family-plan.md",
    cite: "2-on-1 family variant: goalie late after pass"
  },
  actors: [
    { id: "F1", label: "F1", team: "home", role: "support" },
    { id: "F2", label: "F2", team: "home", role: "puckCarrier" },
    { id: "D1", label: "D1", team: "away", role: "defender" },
    { id: "G", label: "G", team: "away", role: "goalie" }
  ],
  nodes: {
    catch: {
      id: "catch",
      q: "The puck moves across and the goalie is late. What is the best read?",
      youngQ: "Goalie is late. What now?",
      decisionActor: "F2",
      enter: { F1: [147, 58], F2: [154, 26], D1: [151, 54], G: [181, 39] },
      pos: { F1: [147, 58], F2: [162, 25], D1: [151, 54], G: [181, 39] },
      puck: [162, 25],
      cue: {
        label: "Goalie late",
        youngLabel: "Goalie late",
        shortLabel: "Late",
        x: 178,
        y: 35
      },
      motions: [
        { actor: "F2", kind: "skate", from: [154, 26], to: [162, 25] },
        { actor: "G", kind: "skate", from: [181, 39], to: [183, 40] }
      ],
      ask: {
        opts: [
          {
            id: "quick_shot",
            t: "Shoot before the goalie gets square",
            youngT: "Shoot quick",
            ok: true,
            next: "finish",
            why: "The goalie is still sliding, so the quick shot uses the timing advantage.",
            youngWhy: "Shoot before the goalie is ready.",
            zone: [166, 25, 8]
          },
          {
            id: "hold",
            t: "Hold the puck and wait",
            youngT: "Wait longer",
            no: "Waiting lets the goalie get square again.",
            youngWhy: "Waiting lets the goalie get ready.",
            next: "missedTiming",
            zone: [162, 25, 8]
          },
          {
            id: "pass_back",
            t: "Pass back to F1",
            youngT: "Pass back",
            no: "The advantage is the goalie being late now, so passing back gives that advantage away.",
            youngWhy: "The open shot is there now.",
            next: "missedTiming",
            zone: [147, 58, 8]
          }
        ]
      }
    },
    finish: {
      id: "finish",
      terminal: true,
      q: "Good timing. The goalie is late, so the quick shot is the best play.",
      youngQ: "Nice read. Shoot before the goalie is ready.",
      pos: { F1: [147, 58], F2: [165, 25], D1: [151, 54], G: [183, 40] },
      puck: [184, 38],
      cue: {
        label: "Quick shot",
        youngLabel: "Shoot",
        shortLabel: "Shot",
        x: 169,
        y: 23
      },
      motions: [
        { actor: "F2", kind: "shot", from: [165, 25], to: [187, 42] }
      ]
    },
    missedTiming: {
      id: "missedTiming",
      terminal: true,
      q: "The delay lets the goalie recover and get square.",
      youngQ: "The goalie gets ready again.",
      pos: { F1: [147, 58], F2: [162, 25], D1: [151, 54], G: [186, 42] },
      puck: [162, 25],
      cue: {
        label: "Goalie set",
        youngLabel: "Goalie ready",
        shortLabel: "Set",
        x: 181,
        y: 36
      }
    }
  }
};
