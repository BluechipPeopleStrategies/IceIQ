// Verdict proof play. Content recycled from play_2v1_backdoor_read_u11_v1's
// "shoot through the defender" wrong branch: here the skater on screen makes
// that read, and the learner judges it. Judge the read, never the player.
export const VERDICT_TWO_ON_ONE_FORCED_SHOT = {
  id: "verdict_2v1_forced_shot_u11_v1",
  type: "animated-play",
  title: "2-on-1: Judge the shot into the defender",
  concept: "odd-man-reads",
  ageBands: ["U11", "U13"],
  view: "half-right",
  start: "watch",
  space: { units: "rink-200x85" },
  sourceRef: {
    note: "docs/library/odd-man-reads.md",
    cite: "Odd-man rush read: when the lone defender steps to the puck carrier, the support option behind the defender becomes the clean next play.",
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
      q: "Watch the rush. The puck carrier shoots into the stepping defender.",
      pos: { F1: [146, 60], F2: [162, 24], D1: [158, 52], G: [186, 42] },
      enter: { F1: [132, 61], F2: [154, 24], D1: [176, 44], G: [187, 42] },
      puck: [141, 60],
      motions: [
        { kind: "skate", from: [132, 61], to: [146, 60], actor: "F1" },
        { kind: "blocked", from: [146, 60], to: [158, 52], label: "blocked" },
      ],
      autoNext: { next: "judge", ms: 2600 },
    },
    judge: {
      id: "judge",
      q: "The shot went into the defender. Was that the right read?",
      decisionActor: "F1",
      pos: { F1: [148, 60], F2: [162, 24], D1: [156, 53], G: [186, 42] },
      puck: [156, 53],
      ask: {
        kind: "verdict",
        q: "The shot went into the defender. Was that the right read?",
        opts: [
          { id: "right_read", t: "Right read", no: "The defender had stepped into the shot lane, so the shot had nowhere to go.", next: "debrief" },
          { id: "better_option", t: "A better option was there", ok: true, why: "The defender committed to the shooter, which is exactly when the cross-ice pass opens up.", next: "debrief" },
          { id: "timing", t: "Right idea, wrong timing", u13Only: true, no: "A shot works earlier, before the defender closes the lane. By this moment the lane was gone.", next: "debrief" },
        ],
        justify: {
          q: "What made the pass the better play?",
          opts: [
            { id: "d1_committed", t: "The defender stepped to the shooter and left the pass lane", evidence: "D1", ok: true },
            { id: "goalie_deep", t: "The goalie was playing deep in the net", evidence: "G", no: "The goalie's depth was not the read here. Watch the defender's commitment." },
          ],
        },
      },
    },
    debrief: {
      id: "debrief",
      terminal: true,
      q: "The defender took the shot away. The cross-ice pass to the support skater was the open play.",
      pos: { F1: [148, 60], F2: [162, 25], D1: [156, 53], G: [184, 40] },
      puck: [148, 60],
      motions: [
        { kind: "pass", from: [148, 60], to: [162, 25], label: "open" },
      ],
    },
  },
};
