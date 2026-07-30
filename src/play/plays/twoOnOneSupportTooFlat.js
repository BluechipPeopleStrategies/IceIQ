export const twoOnOneSupportTooFlat = {
  id: "play_2v1_support_too_flat_u11_v1",
  type: "animated-play",
  title: "2-on-1: Support too flat",
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
    cite: "2-on-1 family variant: support option too flat"
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
      q: "The support option is too flat. What is the best read?",
      youngQ: "Helper is not in a good spot. What should YOU do?",
      decisionActor: "F1",
      enter: { F1: [128, 58], F2: [142, 68], D1: [159, 43], G: [187, 42] },
      pos: { F1: [146, 57], F2: [154, 68], D1: [159, 44], G: [187, 42] },
      puck: [146, 57],
      cue: {
        label: "Support too flat",
        youngLabel: "Bad pass",
        shortLabel: "Flat",
        x: 160,
        y: 74
      },
      motions: [
        { actor: "F1", kind: "skate", from: [128, 58], to: [146, 57] },
        { actor: "F2", kind: "skate", from: [142, 68], to: [154, 68] },
        { actor: "D1", kind: "skate", from: [159, 43], to: [159, 44] }
      ],
      ask: {
        opts: [
          {
            id: "attack_lane",
            t: "Attack the open shot lane",
            youngT: "Use the open space",
            ok: true,
            next: "finish",
            why: "The support teammate is not in a dangerous lane, so forcing the pass lowers the chance.",
            youngWhy: "Helper is not open, so YOU use the space.",
            zone: [153, 56, 8]
          },
          {
            id: "force_flat_pass",
            t: "Force the pass to F2",
            youngT: "Pass to Helper anyway",
            no: "That pass is not dangerous because the support teammate is too flat.",
            youngWhy: "Helper is not in a good spot yet.",
            next: "turnover",
            zone: [154, 68, 8]
          },
          {
            id: "wait",
            t: "Wait for F2 to get more open",
            youngT: "Wait longer",
            no: "Waiting gives the defender and goalie time to reset.",
            youngWhy: "Waiting gives the checker time.",
            next: "turnover",
            zone: [141, 56, 8]
          }
        ]
      }
    },
    finish: {
      id: "finish",
      terminal: true,
      q: "Good read. The support option is too flat, so the puck carrier keeps the attack.",
      youngQ: "Nice read. Helper is not open, so YOU use the space.",
      pos: { F1: [161, 55], F2: [154, 68], D1: [158, 44], G: [187, 42] },
      puck: [161, 55],
      cue: {
        label: "Keep attack",
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
      q: "The forced pass lets the defender recover and kill the rush.",
      youngQ: "That pass was not open.",
      enter: { F1: [146, 57], F2: [154, 68], D1: [159, 44], G: [187, 42] },
      pos: { F1: [146, 57], F2: [154, 68], D1: [149, 44], G: [187, 42] },
      enterPuck: [159, 44],
      puck: [146.5, 45],
      motions: [
        { kind: "blocked", from: [146, 57], to: [159, 44], label: "picked off" },
      ],
      possessionChange: { kind: "interception", fromTeam: "home", toActor: "D1", counterTo: [149, 44] },
      cue: {
        label: "Low-value pass",
        youngLabel: "Blocked",
        shortLabel: "Blocked",
        x: 156,
        y: 58
      }
    }
  }
};
