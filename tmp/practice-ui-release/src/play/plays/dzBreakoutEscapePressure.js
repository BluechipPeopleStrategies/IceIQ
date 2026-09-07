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
        W1: [155, 20],
        F1: [172, 70],
        F2: [150, 38],
        G: [187, 42],
      },
      pos: {
        D1: [192.5, 42.5],
        W1: [155, 20],
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
            zone: [186, 25, 5],
            ok: true,
            next: "confirmCommit",
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

    // Justification step: the correct tap zone (escape_open_side) is also the
    // zone farthest from any opposing icon on the sheet, so a player can land
    // on it by "biggest gap" guessing instead of reading commitment. This node
    // re-checks the SAME frozen moment (positions unchanged from retrieval)
    // and only awards the clean pass if the player can also name who committed
    // and to which side — see docs/superpowers/specs/2026-07-30-icon-proximity-shortcut-solution.md.
    confirmCommit: {
      id: "confirmCommit",
      reRead: true,
      q: "Good tap. Before you see it play out — which forechecker actually committed, and to which side?",
      youngQ: "Which checker is already coming, and which way?",
      pos: {
        D1: [192.5, 42.5],
        W1: [155, 20],
        F1: [183, 64],
        F2: [162, 42],
        G: [187, 42],
      },
      puck: [192.5, 42.5],
      // Deliberately neutral: placed on the puck/D1, the shared vantage point,
      // not on either forechecker. A cue naming an actor+side here would just
      // be the answer key rendered on the ice (caught by adversarial review,
      // 2026-07-30 — the first version did exactly that).
      // x:175,y:52 (not on D1/puck) fixes a real render bug: the cue pill is
      // 20 units wide centered on cue.x, and the half-right viewBox only
      // runs to x=200 -- the old x:192.5 pushed the pill 2.5 units past the
      // edge, clipping it, and overlapped the D1/G tokens besides (caught
      // via live Playwright screenshot, 2026-07-30, not just data review).
      // The full label is 18 chars and overflows the young-band pill (Cue Label
      // Size Rule, MAX_CUE_LABEL_CHARS = 12). This play carries U11/U13 as well
      // as U15/U18, so the young read gets the short neutral form and the film
      // room keeps the full one. Still deliberately says nothing about which
      // forechecker or which side (S2-18, 2026-08-03).
      cue: { label: "Read the ice again", youngLabel: "Look again", shortLabel: "Look again", x: 175, y: 52 },
      // Full 2x2 (which forechecker x which side) so neither attribute has a
      // majority across options — a 3-option single-attribute-swap set let a
      // player solve this by word-frequency counting alone, with zero
      // rink-reading (caught by adversarial review, 2026-07-30). "far side"
      // (not "middle") on purpose too: retrieval's own prompt says the
      // forechecker is "charging down one side," so any option using
      // "middle" could be eliminated by that earlier line alone.
      //
      // Identifies each forechecker by visible behavior (already at full
      // speed vs. still reading), never by "F1"/"F2" letter code — a third
      // adversarial pass found that letter codes break down two ways for
      // U11/U13 specifically: they never render an on-screen label at that
      // age band (AnimatedPlay.jsx's ActorToken label condition), and
      // playerFacingTextForAge() blind-regex-rewrites \bF1\b/\bF2\b into
      // "teammate with the puck"/"support teammate" — copy borrowed from
      // twoOnOneRead.js, where F1/F2 really are teammates, but wrong here
      // where they're the opposing forecheckers. Behavior-based phrasing
      // sidesteps both, and reads as genuine hockey observation besides.
      ask: {
        actor: "D1",
        opts: [
          {
            id: "reading_far",
            t: "The forechecker still reading, far side",
            youngT: "The one still watching, far side",
            no: "The other forechecker is the one still reading — and it's the low side, not the far side, that's closing.",
            outcome: "You tapped the right escape, but not for the right reason.",
            next: "escapedButGuessed",
          },
          {
            id: "speed_far",
            t: "The forechecker already at full speed, far side",
            youngT: "The one already coming fast, far side",
            no: "That forechecker is coming in low, not on the far side — that's exactly the side they gave up.",
            outcome: "You tapped the right escape, but not for the right reason.",
            next: "escapedButGuessed",
          },
          {
            id: "speed_low",
            t: "The forechecker already at full speed, low side",
            youngT: "The one already coming fast, low side",
            ok: true,
            next: "escaped",
          },
          {
            id: "reading_low",
            t: "The forechecker still reading, low side",
            youngT: "The one still watching, low side",
            no: "The low-side forechecker isn't just reading — they're already at full speed. That commitment is what closes the low side.",
            outcome: "You tapped the right escape, but not for the right reason.",
            next: "escapedButGuessed",
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
        W1: [155, 20],
        F1: [190, 60],
        F2: [166, 40],
        G: [187, 42],
      },
      puck: [155, 20],
      motions: [
        { kind: "skate", from: [192.5, 42.5], to: [186, 26], actor: "D1", via: [[197, 42]] },
        { kind: "skate", from: [183, 64], to: [190, 60], actor: "F1" },
        { kind: "pass", from: [186, 26], to: [155, 20], label: "outlet" },
      ],
    },

    escapedButGuessed: {
      id: "escapedButGuessed",
      terminal: true,
      q: "You found the escape, but not the reason. The forechecker already at full speed was on the low side — that commitment is what closed that side and opened the other. Read who's committed before you move, and the same tap will hold up every time.",
      pos: {
        D1: [186, 26],
        W1: [155, 20],
        F1: [190, 60],
        F2: [166, 40],
        G: [187, 42],
      },
      puck: [155, 20],
      motions: [
        { kind: "skate", from: [192.5, 42.5], to: [186, 26], actor: "D1", via: [[197, 42]] },
        { kind: "skate", from: [183, 64], to: [190, 60], actor: "F1" },
        { kind: "pass", from: [186, 26], to: [155, 20], label: "outlet" },
      ],
    },

    pinned: {
      id: "pinned",
      terminal: true,
      q: "You skated into the pressure instead of away from it. They arrived with more speed than you had, and the puck came loose in the worst place on the ice.",
      pos: {
        D1: [187, 62],
        W1: [155, 20],
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
        W1: [155, 20],
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
        W1: [155, 20],
        F1: [191, 57],
        F2: [191, 31],
        G: [187, 42],
      },
      puck: [195, 46],
      motions: [
        { kind: "skate", from: [192.5, 42.5], to: [195, 46], actor: "D1" },
        { kind: "skate", from: [183, 64], to: [191, 57], actor: "F1" },
        { kind: "skate", from: [162, 42], to: [191, 31], actor: "F2" },
        { kind: "blocked", from: [195, 46], to: [155, 20], label: "outlet gone" },
      ],
    },
  },
};
