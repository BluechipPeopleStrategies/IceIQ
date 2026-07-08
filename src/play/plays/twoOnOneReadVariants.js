
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
        q: "The defender steps up and a backchecker is closing. What is the best read now?",
        enter: { F1: [132, 61], F2: [154, 24], D1: [178, 43], G: [187, 42], BC1: [116, 66] },
        pos: { F1: [146, 60], F2: [162, 24], D1: [160, 50], G: [186, 42], BC1: [137, 63] },
        ask: {
          opts: [
            { id: "shoot_far", t: "Shoot through the defender", youngT: "Shoot through the checker", no: "The defender has stepped into the shooting lane.", outcome: "The shot is blocked and the rush slows down.", next: "blockedShot" },
            { id: "pass_backdoor", t: "Pass across to F2 before the backchecker arrives", youngT: "Pass to your teammate before the checker gets back", ok: true, next: "catch" },
            { id: "deke_middle", t: "Deke into the defender", youngT: "Try to beat the checker", no: "That lets the defender and backchecker squeeze the puck.", outcome: "The 2-on-1 disappears.", next: "turnover" },
            { id: "delay_wait", t: "Wait for everyone to catch up", youngT: "Wait longer", no: "The backchecker is exactly why waiting is dangerous.", outcome: "The passing lane closes.", next: "turnover" },
          ],
        },
      },
      catch: {
        pos: { F1: [162, 54], F2: [162, 24], D1: [170, 40], G: [187, 36], BC1: [154, 59] },
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
            { id: "shoot_far", t: "Shoot through the defender", no: "The defender has stepped into the shooting lane.", outcome: "The shot is blocked.", next: "blockedShot" },
            { id: "pass_backdoor", t: "Move it across to F2 now", youngT: "Pass to your teammate now", ok: true, next: "catch" },
            { id: "deke_middle", t: "Deke into the defender", no: "That lets the lone defender play your body and the puck.", outcome: "The 2-on-1 disappears.", next: "turnover" },
            { id: "delay_wait", t: "Wait for a cleaner angle", youngT: "Wait for a better pass", no: "Waiting lets the defender and goalie recover.", outcome: "The lane closes.", next: "turnover" },
          ],
        },
      },
      catch: {
        enter: { F1: [146, 60], F2: [163, 33], D1: [160, 50], G: [186, 42] },
        pos: { F1: [162, 54], F2: [164, 33], D1: [170, 40], G: [187, 38] },
        puck: [164, 33],
        freeze: { x: 164, y: 33, label: "2" },
        motions: [
          { kind: "pass", from: [146, 60], to: [164, 33], label: "flat pass" },
          { kind: "shot", from: [164, 33], to: [187, 45], label: "quick finish" },
        ],
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
        q: "F2 catches it and the goalie is late sliding across. What is the next read?",
        pos: { F1: [162, 54], F2: [162, 24], D1: [170, 40], G: [184, 39] },
        ask: {
          opts: [
            { id: "quick_shot", t: "Shoot before the goalie gets square", youngT: "Shoot quick", ok: true, next: "finish" },
            { id: "hold_puck", t: "Hold until the goalie moves first", no: "The goalie is already recovering. Holding gives the goalie time.", outcome: "The goalie gets square.", next: "turnover" },
            { id: "skate_corner", t: "Carry it below the goal line", no: "That takes the puck away from the scoring window.", outcome: "The chance disappears.", next: "turnover" },
            { id: "pass_back", t: "Pass back into traffic", youngT: "Pass back into traffic", no: "The defender is recovering through the middle.", outcome: "The defender disrupts the play.", next: "turnover" },
          ],
        },
      },
    },
  }),
];
