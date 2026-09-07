export const backcheckRecoveryDefenderGetsBeat = {
  id: "play_backcheck_recovery_defender_gets_beat_u13_v1",
  type: "animated-play",
  title: "Backcheck recovery: Defender gets beat",
  concept: "backcheck recovery",
  ageBands: ["U7", "U9", "U11", "U13", "U15", "U18"],
  view: "horizontal",
  start: "recovery",
  space: {
    zone: "neutral-to-defensive",
    lane: "inside"
  },
  sourceRef: {
    note: "docs/scenario-family-standards.md",
    cite: "Backcheck recovery family variant: teammate gets beat"
  },
  actors: [
    { id: "P1", label: "P1", team: "away", role: "puckCarrier" },
    { id: "S1", label: "S1", team: "away", role: "support" },
    { id: "D1", label: "D1", team: "home", role: "defender" },
    { id: "YOU", label: "YOU", team: "home", role: "defender" },
    { id: "G", label: "G", team: "home", role: "goalie" }
  ],
  nodes: {
    recovery: {
      id: "recovery",
      q: "Which lane should you take after your teammate gets beat?",
      youngQ: "Your teammate got beat. Where should YOU go?",
      decisionActor: "YOU",
      enter: { P1: [132, 43], S1: [139, 27], D1: [136, 45], YOU: [122, 58], G: [187, 42] },
      pos: { P1: [151, 43], S1: [158, 27], D1: [143, 48], YOU: [137, 58], G: [187, 42] },
      puck: [151, 43],
      cue: {
        label: "Teammate beat",
        youngLabel: "Help now",
        shortLabel: "Beat",
        x: 143,
        y: 51
      },
      motions: [
        { actor: "P1", kind: "skate", from: [132, 43], to: [151, 43] },
        { actor: "S1", kind: "skate", from: [139, 27], to: [158, 27] },
        { actor: "D1", kind: "skate", from: [136, 45], to: [143, 48] },
        { actor: "YOU", kind: "skate", from: [122, 58], to: [137, 58] }
      ],
      ask: {
        choiceMode: "lane-pick",
        opts: [
          {
            id: "inside_next_defender",
            t: "Take inside and become the next defender",
            youngT: "Go inside and help",
            ok: true,
            next: "inside",
            why: "When the first defender is beaten, the backchecker must protect the most dangerous inside lane.",
            youngWhy: "Your teammate got beat, so YOU help inside.",
            zone: [154, 45, 9]
          },
          {
            id: "stay_support",
            t: "Stay with the support lane",
            youngT: "Stay with the open player",
            no: "The puck carrier is now the immediate danger because your teammate lost that lane.",
            youngWhy: "The puck is dangerous now.",
            next: "danger",
            zone: [158, 27, 9]
          },
          {
            id: "chase_behind",
            t: "Chase from behind",
            youngT: "Chase behind",
            no: "Chasing from behind does not protect the middle or stop the rush.",
            youngWhy: "Chasing behind does not help the middle.",
            next: "danger",
            zone: [143, 58, 9]
          }
        ]
      }
    },
    inside: {
      id: "inside",
      terminal: true,
      q: "Good recovery. You become the next defender and protect inside ice.",
      youngQ: "Nice read. YOU help inside.",
      pos: { P1: [158, 43], S1: [160, 27], D1: [143, 48], YOU: [153, 46], G: [187, 42] },
      puck: [158, 43],
      cue: {
        label: "Inside protected",
        youngLabel: "Help inside",
        shortLabel: "Inside",
        x: 153,
        y: 54
      },
      motions: [
        { actor: "YOU", kind: "skate", from: [137, 58], to: [153, 46] }
      ]
    },
    danger: {
      id: "danger",
      terminal: true,
      q: "The middle stays open, so the puck carrier keeps the dangerous lane.",
      youngQ: "The middle is open.",
      pos: { P1: [162, 43], S1: [160, 27], D1: [143, 48], YOU: [144, 58], G: [187, 42] },
      puck: [162, 43],
      cue: {
        label: "Middle open",
        youngLabel: "Open middle",
        shortLabel: "Middle",
        x: 158,
        y: 33
      }
    }
  }
};
