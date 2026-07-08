
import { makePlayVariant } from "../playVariants.js";
import { TWO_ON_ONE_READ_PLAY } from "./twoOnOneRead.js";

export const TWO_ON_ONE_READ_VARIANTS = [
  makePlayVariant(TWO_ON_ONE_READ_PLAY, {
    id: "play_2v1_backdoor_read_backchecker_u11_v1",
    title: "2-on-1: Backchecker coming",
    label: "Backchecker pressure",
    difficulty: "harder",
    actorsToAdd: [
      { id: "BC1", team: "away", role: "defender", label: "BC1" },
    ],
    sourceRef: {
      cite: "Odd-man rush variation: back pressure makes delay a worse option and rewards an earlier read.",
    },
    nodes: {
      rush: {
        q: "The defender steps up and a backchecker is closing. What is the best read now?", youngQ: "What should YOU do now?",
        enter: { F1: [132, 61], F2: [154, 24], D1: [178, 43], G: [187, 42], BC1: [116, 66] },
        pos: { F1: [146, 60], F2: [162, 24], D1: [160, 50], G: [186, 42], BC1: [137, 63] },
        ask: {
          opts: [
            { id: "shoot_far", t: "Shoot through the defender", youngWhy: "Shoot only if the checker is not in your way.", why: "This only works if the shot lane is actually open.", youngT: "Shoot through the checker", no: "The defender has stepped into the shooting lane.", outcome: "The shot is blocked and the rush slows down.", next: "blockedShot" },
            { id: "pass_backdoor", t: "Pass across to F2 before the backchecker arrives", youngWhy: "Pass before the checker gets back.", why: "Move the puck before the backchecker can close the passing lane.", youngT: "Pass to your teammate before the checker gets back", ok: true, next: "catch" },
            { id: "deke_middle", t: "Deke into the defender", youngWhy: "That takes you into the checker.", why: "Driving into the defender helps the defender do their job.", youngT: "Try to beat the checker", no: "That lets the defender and backchecker squeeze the puck.", outcome: "The 2-on-1 disappears.", next: "turnover" },
            { id: "delay_wait", t: "Wait for everyone to catch up", youngWhy: "Waiting lets the checkers catch you.", why: "Waiting gives the defense time to recover.", youngT: "Wait longer", no: "The backchecker is exactly why waiting is dangerous.", outcome: "The passing lane closes.", next: "turnover" },
          ],
        },
      },
      catch: {
      id: "catch",
      terminal: true,
      q: "Good pass. The support teammate is open for a quick shot.",
      youngQ: "Nice pass. Helper is open.",
      pos: { F1: [146, 60], F2: [162, 25], D1: [151, 55], G: [181, 39] },
      puck: [162, 25],
      cue: {
        label: "Open shot",
        youngLabel: "Open",
        x: 137,
        y: 20
      }
    },
      finish: {
        pos: { F1: [162, 54], F2: [158, 27], D1: [170, 40], G: [181, 30], BC1: [158, 59] },
      },
      blockedShot: {
        pos: { F1: [150, 60], F2: [162, 24], D1: [157, 55], G: [186, 42], BC1: [149, 61] },
      },
      turnover: {
        pos: { F1: [160, 58], F2: [165, 26], D1: [163, 46], G: [186, 42], BC1: [158, 58] },
      },
    },
  }),

  makePlayVariant(TWO_ON_ONE_READ_PLAY, {
    id: "play_2v1_backdoor_read_support_flat_u11_v1",
    title: "2-on-1: Support option is flatter",
    label: "Harder support angle",
    difficulty: "harder",
    sourceRef: {
      cite: "Odd-man rush variation: the support option may be available even when the passing angle is less perfect, as long as the defender has committed to the puck carrier.",
    },
    nodes: {
      rush: {
        q: "F2 is available, but the passing angle is flatter. The defender still steps up. What is the best read?",
        enter: { F1: [132, 61], F2: [150, 33], D1: [178, 43], G: [187, 42] },
        pos: { F1: [146, 60], F2: [163, 33], D1: [160, 50], G: [186, 42] },
        motions: [
          { kind: "skate", from: [132, 61], to: [146, 60], actor: "F1" },
          { kind: "skate", from: [150, 33], to: [163, 33], actor: "F2" },
          { kind: "blocked", from: [146, 60], to: [186, 42], label: "shot lane covered" },
        ],
        ask: {
          opts: [
            { id: "shoot_far", t: "Shoot through the defender", youngWhy: "Shoot only if the checker is not in your way.", why: "This only works if the shot lane is actually open.", no: "The defender has stepped into the shooting lane.", outcome: "The shot is blocked.", next: "blockedShot" },
            { id: "pass_backdoor", t: "Move it across to F2 now", youngWhy: "Helper is open now. Do not wait.", why: "The support teammate is open now. Waiting lets the gap close.", youngT: "Pass to your teammate now", ok: true, next: "catch" },
            { id: "deke_middle", t: "Deke into the defender", youngWhy: "That takes you into the checker.", why: "Driving into the defender helps the defender do their job.", no: "That lets the lone defender play your body and the puck.", outcome: "The 2-on-1 disappears.", next: "turnover" },
            { id: "delay_wait", t: "Wait for a cleaner angle", youngWhy: "The open play is there now.", why: "Waiting can close the lane that is open right now.", youngT: "Wait for a better pass", no: "Waiting lets the defender and goalie recover.", outcome: "The lane closes.", next: "turnover" },
          ],
        },
      },
      catch: {
      id: "catch",
      terminal: true,
      q: "Good pass. The support teammate is open for a quick shot.",
      youngQ: "Nice pass. Helper is open.",
      pos: { F1: [146, 60], F2: [162, 25], D1: [151, 55], G: [181, 39] },
      puck: [162, 25],
      cue: {
        label: "Open shot",
        youngLabel: "Open",
        x: 137,
        y: 20
      }
    },
    },
  }),

  makePlayVariant(TWO_ON_ONE_READ_PLAY, {
    id: "play_2v1_backdoor_read_late_goalie_slide_u13_v1",
    title: "2-on-1: Goalie slow to slide",
    label: "Second-read finish",
    difficulty: "harder",
    ageBands: ["U11", "U13", "U15"],
    sourceRef: {
      cite: "Odd-man rush variation: after the cross-ice pass, the receiver must read goalie recovery and shoot before the goalie gets square.",
    },
    nodes: {
      catch: {
      id: "catch",
      terminal: true,
      q: "Good pass. The support teammate is open for a quick shot.",
      youngQ: "Nice pass. Helper is open.",
      pos: { F1: [146, 60], F2: [162, 25], D1: [151, 55], G: [181, 39] },
      puck: [162, 25],
      cue: {
        label: "Open shot",
        youngLabel: "Open",
        x: 137,
        y: 20
      }
    },
    },
  }),
];
