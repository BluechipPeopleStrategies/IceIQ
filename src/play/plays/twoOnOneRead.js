export const TWO_ON_ONE_READ_PLAY = {
  id: "play_2v1_backdoor_read_u11_v1",
  type: "animated-play",
  title: "2-on-1: Defender steps up",
  concept: "odd-man-reads",
  ageBands: ["U9", "U11", "U13"],
  view: "half-right",
  start: "rush",
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
    rush: {
      id: "rush",
      q: "The lone defender steps up to you. What is the best read?",
      decisionActor: "F1",
      enter: { F1: [132, 61], F2: [154, 24], D1: [178, 43], G: [187, 42] },
      pos: { F1: [146, 60], F2: [162, 24], D1: [160, 50], G: [186, 42] },
      puck: [141, 60],
      freeze: { x: 146, y: 60, label: "1" },
      motions: [
        { kind: "skate", from: [132, 61], to: [146, 60], actor: "F1" },
        { kind: "skate", from: [154, 24], to: [162, 24], actor: "F2" },
        { kind: "blocked", from: [146, 60], to: [186, 42], label: "shot lane covered" },
      ],
      overlays: [
        { kind: "freeze", x: 146, y: 60, label: "1" },
      ],
      ask: {
        actor: "F1",
        q: "The lone defender steps up to you. What is the best read?",
        opts: [
          { id: "shoot_far", t: "Shoot through the defender", youngT: "Shoot through the checker", no: "The defender has stepped into the shooting lane.", outcome: "The shot is blocked and the rush slows down.", next: "blockedShot" },
          { id: "pass_backdoor", t: "Pass across to F2", youngT: "Pass to your teammate", ok: true, next: "catch" },
          { id: "deke_middle", t: "Deke into the defender", youngT: "Try to beat the checker", no: "That lets the lone defender play your body and the puck.", outcome: "The defender closes the gap and the 2-on-1 disappears.", next: "turnover" },
          { id: "delay_wait", t: "Wait for everyone to catch up", youngT: "Wait longer", no: "Waiting gives the defender and goalie time to reset.", outcome: "The passing lane closes.", next: "turnover" },
        ],
      },
    },
    catch: {
      id: "catch",
      q: "F2 catches the pass while the goalie is sliding. What comes next?",
      decisionActor: "F2",
      enter: { F1: [146, 60], F2: [162, 24], D1: [160, 50], G: [186, 42] },
      pos: { F1: [162, 54], F2: [162, 24], D1: [170, 40], G: [187, 36] },
      puck: [160, 24],
      freeze: { x: 162, y: 24, label: "2" },
      motions: [
        { kind: "pass", from: [146, 60], to: [160, 24], label: "back-door pass" },
        { kind: "shot", from: [160, 24], to: [187, 45], label: "quick finish" },
      ],
      overlays: [
        { kind: "target", x: 187, y: 45, r: 5 },
      ],
      ask: {
        actor: "F2",
        q: "You catch it at the back door. What is the play?",
        opts: [
          { id: "quick_shot", t: "Shoot quickly before the goalie gets square", youngT: "Shoot quick", ok: true, next: "finish" },
          { id: "hold_puck", t: "Hold the puck", no: "Holding lets the goalie recover across the crease.", outcome: "The goalie gets square.", next: "turnover" },
          { id: "skate_corner", t: "Skate into the corner", no: "That takes the puck away from the open net.", outcome: "The scoring chance disappears.", next: "turnover" },
          { id: "pass_back", t: "Pass back to F1", youngT: "Pass back to your teammate", no: "F1 is no longer the open option.", outcome: "The defender recovers to the middle.", next: "turnover" },
        ],
      },
    },
    finish: {
      id: "finish",
      terminal: true,
      q: "Goal. The defender stepped to F1, the back-door pass moved the goalie, and F2 shot before the goalie recovered.",
      pos: { F1: [162, 54], F2: [158, 27], D1: [170, 40], G: [181, 30] },
      puck: [191, 44],
      motions: [
        { kind: "shot", from: [158, 27], to: [191, 44], label: "finish" },
      ],
    },
    blockedShot: {
      id: "blockedShot",
      terminal: true,
      q: "The defender blocks the shot. The open support option was missed.",
      pos: { F1: [150, 60], F2: [162, 24], D1: [157, 55], G: [186, 42] },
      puck: [157, 55],
      motions: [
        { kind: "blocked", from: [150, 60], to: [157, 55], label: "blocked" },
      ],
    },
    turnover: {
      id: "turnover",
      terminal: true,
      q: "The window closes. On a 2-on-1, the read has to happen while the defender is committed.",
      pos: { F1: [160, 58], F2: [165, 26], D1: [163, 46], G: [186, 42] },
      puck: [163, 46],
      motions: [
        { kind: "blocked", from: [160, 58], to: [163, 46], label: "lane gone" },
      ],
    },
  },
};

