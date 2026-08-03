export const BACKCHECK_RECOVERY_PLAY = {
  id: "play_backcheck_recovery_pick_up_middle_u13_v1",
  type: "animated-play",
  title: "Backcheck recovery: Choose your lane",
  concept: "backcheck-recovery",
  ageBands: ["U11", "U13", "U15", "U18"],
  view: "half-right",
  start: "recovery",
  space: { units: "rink-200x85" },
  sourceRef: {
    note: "docs/library/backcheck-recovery.md",
    cite: "Backcheck recovery read: when trailing the rush, the backchecker should choose the lane that removes the most dangerous threat instead of chasing the puck from behind or drifting wide.",
    url: "https://www.usahockey.com/practiceplans",
  },
  actors: [
    { id: "A1", team: "away", role: "puckCarrier", label: "A1" },
    { id: "A2", team: "away", role: "support", label: "A2" },
    { id: "BC1", team: "home", role: "defender", label: "YOU" },
    { id: "D1", team: "home", role: "defender", label: "D1" },
    { id: "G", team: "home", role: "goalie", label: "G" },
  ],
  nodes: {
    recovery: {
      id: "recovery",
      q: "You are backchecking into the rush. Which lane should you take?",
      decisionActor: "BC1",
      enter: {
        A1: [132, 60],
        A2: [148, 25],
        BC1: [118, 70],
        D1: [165, 44],
        G: [187, 42]
      },
      pos: {
        A1: [153, 57],
        A2: [165, 28],
        BC1: [132, 64],
        D1: [168, 44],
        G: [187, 42]
      },
      puck: [153, 57],
      freeze: { x: 132, y: 64, label: "" },
      motions: [
        { kind: "skate", from: [118, 70], to: [132, 64], actor: "BC1" }
      ],
      overlays: [],
      ask: {
        actor: "BC1",
        choiceMode: "lane-pick",
        q: "You are backchecking into the rush. Which lane should you take?",
        opts: [
          {
            id: "pick_middle",
            t: "Recover through the inside lane",
            youngT: "Cut inside",
            icon: "🎯",
            zone: [161, 33, 6],
            ok: true,
            next: "coveredMiddle"
          },
          {
            id: "go_wall",
            t: "Recover wide toward the wall",
            youngT: "Go to the wall",
            icon: "🧱",
            zone: [158, 68, 6],
            no: "Recovering wide leaves the dangerous inside lane available.",
            outcome: "The inside support player stays open.",
            next: "wallRecovery"
          },
          {
            id: "behind_puck",
            t: "Recover directly behind the puck carrier",
            youngT: "Follow behind",
            icon: "👣",
            zone: [162, 59, 6],
            no: "Chasing from directly behind does not take away the support option.",
            outcome: "The puck carrier can still move it inside.",
            next: "behindRecovery"
          },
          {
            id: "outside_left",
            t: "Recover to the outside lane",
            youngT: "Go outside",
            icon: "↗️",
            zone: [155, 44, 6],
            no: "Recovering outside looks active, but it does not remove the middle threat.",
            outcome: "The dangerous lane stays open.",
            next: "outsideRecovery"
          }
        ],
      },
    },

    coveredMiddle: {
      id: "coveredMiddle",
      terminal: true,
      q: "Good recovery. You got inside and removed the most dangerous support option.",
      pos: {
        A1: [166, 58],
        A2: [166, 29],
        BC1: [161, 33],
        D1: [170, 49],
        G: [187, 42]
      },
      puck: [166, 58],
      motions: [
        { kind: "skate", from: [132, 64], to: [161, 33], actor: "BC1" },
        { kind: "blocked", from: [166, 58], to: [166, 29], label: "inside lane covered" }
      ],
    },

    wallRecovery: {
      id: "wallRecovery",
      terminal: true,
      // Deliberately NOT tagged with intendedAnchor: BC1's correct position
      // is defined by the triggering `go_wall` option's own zone:[158,68,6]
      // in the `recovery` node (BC1 lands exactly on that zone's center),
      // not by proximity to any rink anchor — it's 10.44 units from the
      // nearest wall-segment point, which would be a false positive under
      // today's validator. Add a lane-pick-aware check before tagging this
      // node. docs/superpowers/specs/2026-07-30-wall-anchor-investigation.md
      q: "Recovering wide leaves the middle available. Backchecking is about removing the dangerous lane first.",
      pos: {
        A1: [166, 58],
        A2: [174, 33],
        BC1: [158, 68],
        D1: [170, 49],
        G: [187, 42]
      },
      puck: [174, 33],
      motions: [
        { kind: "skate", from: [132, 64], to: [158, 68], actor: "BC1" },
        { kind: "pass", from: [166, 58], to: [174, 33], label: "inside pass" }
      ],
    },

    behindRecovery: {
      id: "behindRecovery",
      terminal: true,
      q: "Recovering right behind the puck carrier feels safe, but it does not take away the support option.",
      pos: {
        A1: [166, 58],
        A2: [174, 33],
        BC1: [162, 59],
        D1: [170, 49],
        G: [187, 42]
      },
      puck: [174, 33],
      motions: [
        { kind: "skate", from: [132, 64], to: [162, 59], actor: "BC1" },
        { kind: "pass", from: [166, 58], to: [174, 33], label: "inside pass" }
      ],
    },

    outsideRecovery: {
      id: "outsideRecovery",
      terminal: true,
      q: "Recovering outside does not remove the middle threat. The inside option stays dangerous.",
      pos: {
        A1: [166, 58],
        A2: [174, 33],
        BC1: [155, 44],
        D1: [170, 49],
        G: [187, 42]
      },
      puck: [174, 33],
      motions: [
        { kind: "skate", from: [132, 64], to: [155, 44], actor: "BC1" },
        { kind: "pass", from: [166, 58], to: [174, 33], label: "inside pass" }
      ],
    },
  },
};
