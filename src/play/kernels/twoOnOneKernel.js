// src/play/kernels/twoOnOneKernel.js
// Parametric kernel for the two-on-one family: emits complete animated-play
// objects where the CORRECT ANSWER is decided by the `commit` parameter and
// the defender's geometry is derived to guarantee it. The kernel asserts its
// own lane invariants numerically before returning — a play that fails its
// invariant throws rather than emits. Prose comes verbatim from the two
// approved hand-authored branch plays (twoOnOneRead.js, defenderHoldsMiddle.js);
// a later LLM pass may vary prose for survivors, never the answer.
//
// Spec: docs/superpowers/specs/2026-07-21-play-kernel-engine-design.md

import { mirrorPlayY } from "../playVariants.js";

export const COMMITS = ["stepsUp", "holdsMiddle"];
export const DEPTHS = [0, 8, 16]; // ft deeper into the zone at the freeze
// Where the support skates: far post (classic cross-ice) or trailing the play
// (drop-pass read). This axis MOVES the answer target ~30 ft, which is what
// makes kernel variants survive the novelty gate as genuinely new reps.
export const SHAPES = ["backPost", "trailer"];

// Lane margins (ft). A gap between "blocked" and "clear" keeps the read
// unambiguous — mirrors the solver's DISTRACTOR margins in spirit.
export const LANE_BLOCKED_MAX_FT = 4;
export const LANE_CLEAR_MIN_FT = 8;

// Deterministic small rng (same generator family as the gym tests).
export function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function r1(v) {
  return Math.round(v * 10) / 10;
}

// Distance from point p to segment a->b, all [x, y] in feet.
export function pointSegDist(p, a, b) {
  const abx = b[0] - a[0];
  const aby = b[1] - a[1];
  const len2 = abx * abx + aby * aby || 1;
  let t = ((p[0] - a[0]) * abx + (p[1] - a[1]) * aby) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + abx * t), p[1] - (a[1] + aby * t));
}

const NET = [190, 43];

// Shared prose templates, lifted from the two approved hand plays.
const STEPS_UP_OPTS = [
  { id: "shoot_far", t: "Shoot through the defender", youngWhy: "Shoot only if the checker is not in your way.", why: "This only works if the shot lane is actually open.", youngT: "Shoot through the checker", no: "The defender has stepped into the shooting lane.", outcome: "The shot is blocked and the rush slows down.", next: "blockedShot" },
  { id: "pass_backdoor", t: "Pass across to F2", youngWhy: "The checker comes to YOU, so Helper is open.", why: "The defender steps toward you, so the support teammate is open.", youngT: "Pass to your teammate", ok: true, next: "catch" },
  { id: "deke_middle", t: "Deke into the defender", youngWhy: "That takes you into the checker.", why: "Driving into the defender helps the defender do their job.", youngT: "Try to beat the checker", no: "That lets the lone defender play your body and the puck.", outcome: "The defender closes the gap and the 2-on-1 disappears.", next: "turnover" },
  { id: "delay_wait", t: "Wait for everyone to catch up", youngWhy: "Waiting lets the checkers catch you.", why: "Waiting gives the defense time to recover.", youngT: "Wait longer", no: "Waiting gives the defender and goalie time to reset.", outcome: "The passing lane closes.", next: "turnover" },
];

const HOLDS_MIDDLE_OPTS = [
  { id: "force_pass", t: "Force the pass through D1", youngWhy: "Do not pass through the checker.", why: "Forcing a pass through coverage creates a turnover risk.", youngT: "Force a pass through the checker", no: "The defender is sitting in the pass lane.", outcome: "D1 breaks up the pass.", next: "forcedPass" },
  { id: "shoot_lane", t: "Attack the open shot lane", youngWhy: "The pass is covered, so use the open space.", why: "When the middle pass is covered, use the open shooting lane.", youngT: "Use the open shooting path", ok: true, next: "finish" },
  { id: "wait", t: "Wait for the perfect pass", youngT: "Wait for a better pass", no: "Waiting gives the defender and goalie time to reset.", outcome: "The numbers advantage disappears.", next: "turnover" },
  { id: "skate_corner", t: "Skate away into the corner", youngT: "Skate away to the corner", no: "That gives up the middle-lane advantage.", outcome: "The scoring chance fades.", next: "turnover" },
];

// Build one two-on-one play. Throws on invariant violation.
// params: { commit, depth, gap, mirror, seed }
export function makeTwoOnOnePlay({ commit = "stepsUp", depth = 0, shape = "backPost", mirror = false, seed = 1 } = {}) {
  if (!COMMITS.includes(commit)) throw new Error(`unknown commit: ${commit}`);
  if (!DEPTHS.includes(depth)) throw new Error(`unknown depth: ${depth}`);
  if (!SHAPES.includes(shape)) throw new Error(`unknown shape: ${shape}`);
  const rng = mulberry32(seed * 7919 + depth * 13 + (shape === "trailer" ? 5 : 0) + (commit === "stepsUp" ? 0 : 1));
  const j = () => (rng() - 0.5) * 4; // ±2 ft, non-load-bearing only

  // Attack skeleton: F1 drives the wide lane; F2 is either at the far post
  // (classic 2-on-1 shape) or trailing into the middle (drop-pass shape).
  const f1 = [r1(138 + depth), r1(61 + j() * 0.5)];
  const f2 = shape === "backPost" ? [r1(f1[0] + 15), 24] : [r1(f1[0] - 5), 34];
  const goalie = [186, 42];

  // Defender geometry follows the commit — this is what makes the answer
  // correct by construction.
  let d1;
  if (commit === "stepsUp") {
    // closes on the carrier: in the shot lane, out of the pass lane
    d1 = [r1(f1[0] + 13), r1(f1[1] - 8)];
  } else {
    // protects the pass: sits ON the F1->F2 lane, leaves the shot lane
    d1 = [r1((f1[0] + f2[0]) / 2 + 1.5), r1((f1[1] + f2[1]) / 2)];
  }

  // Invariants (ft): the read must be provable from the geometry.
  const passDist = pointSegDist(d1, f1, f2);
  const shotDist = pointSegDist(d1, f1, NET);
  if (commit === "stepsUp") {
    if (passDist < LANE_CLEAR_MIN_FT) throw new Error(`stepsUp pass lane not clear: ${passDist.toFixed(1)}ft`);
    if (shotDist > LANE_BLOCKED_MAX_FT + 2) throw new Error(`stepsUp shot lane not covered: ${shotDist.toFixed(1)}ft`);
  } else {
    if (passDist > LANE_BLOCKED_MAX_FT) throw new Error(`holdsMiddle pass lane not blocked: ${passDist.toFixed(1)}ft`);
    if (shotDist < LANE_CLEAR_MIN_FT) throw new Error(`holdsMiddle shot lane not clear: ${shotDist.toFixed(1)}ft`);
  }

  const enterF1 = [r1(f1[0] - 14), r1(f1[1] + j() * 0.4)];
  const enterF2 = [r1(f2[0] - 8), f2[1]];
  const enterD1 = commit === "stepsUp" ? [r1(d1[0] + 16), r1(43 + j() * 0.4)] : [r1(d1[0] + 12), r1(d1[1] + 3)];
  const puck = [r1(f1[0] - 4), f1[1]];

  const idBits = `${commit === "stepsUp" ? "steps_up" : "holds_middle"}_d${depth}_${shape.toLowerCase()}${mirror ? "_far" : ""}_s${seed}`;
  const stepsUp = commit === "stepsUp";

  const play = {
    id: `k2v1_${idBits}`,
    type: "animated-play",
    title: stepsUp ? "2-on-1: Defender steps up" : "2-on-1: Defender holds middle",
    concept: "odd-man-reads",
    generated: { kernel: "twoOnOne", params: { commit, depth, shape, mirror, seed } },
    ageBands: ["U9", "U11", "U13"],
    view: "half-right",
    start: "rush",
    space: { units: "rink-200x85" },
    sourceRef: {
      note: "docs/library/odd-man-reads.md",
      cite: stepsUp
        ? "Odd-man rush read: when the lone defender steps to the puck carrier, the support option behind the defender becomes the clean next play."
        : "Odd-man rush read: when the defender protects the pass lane and stays between the puck carrier and support, the puck carrier may have the better shot or attack lane.",
      url: "https://www.usahockey.com/smallareagames",
    },
    actors: [
      { id: "F1", team: "home", role: "puckCarrier", label: "YOU" },
      { id: "F2", team: "home", role: "support", label: "F2" },
      { id: "D1", team: "away", role: "defender", label: "D1" },
      { id: "G", team: "away", role: "goalie", label: "G" },
    ],
    nodes: {},
  };

  const rushQ = stepsUp
    ? "The lone defender steps up to you. What is the best read?"
    : "The lone defender holds the middle and takes away the pass. What is the best read?";

  play.nodes.rush = {
    id: "rush",
    q: rushQ,
    ...(stepsUp ? { youngQ: "What should YOU do now?" } : {}),
    decisionActor: "F1",
    enter: { F1: enterF1, F2: enterF2, D1: enterD1, G: [187, 42] },
    pos: { F1: f1, F2: f2, D1: d1, G: goalie },
    puck,
    freeze: { x: f1[0], y: f1[1], label: "1" },
    motions: [
      { kind: "skate", from: enterF1, to: f1, actor: "F1" },
      { kind: "skate", from: enterF2, to: f2, actor: "F2" },
      stepsUp
        ? { kind: "blocked", from: f1, to: [186, 42], label: "shot lane covered" }
        : { kind: "blocked", from: f1, to: f2, label: "pass lane covered" },
    ],
    overlays: [{ kind: "freeze", x: f1[0], y: f1[1], label: "1" }],
    ask: {
      actor: "F1",
      q: rushQ,
      ...(stepsUp ? { youngQ: "What should YOU do now?" } : {}),
      opts: (stepsUp ? STEPS_UP_OPTS : HOLDS_MIDDLE_OPTS).map((o) => {
        const opt = { ...o };
        // The trailer shape is a drop pass, not a cross-ice pass; keep the
        // young-player wording, sharpen the tactical wording.
        if (shape === "trailer" && opt.id === "pass_backdoor") opt.t = "Drop it back to F2";
        if (shape === "trailer" && opt.id === "force_pass") opt.t = "Force the drop pass through D1";
        return opt;
      }),
    },
  };

  if (stepsUp) {
    play.nodes.catch = {
      id: "catch",
      terminal: true,
      q: "Good pass. The support teammate is open for a quick shot.",
      youngQ: "Nice pass. Helper is open.",
      pos: { F1: f1, F2: [f2[0], r1(f2[1] + 1)], D1: [r1(d1[0] - 8), r1(d1[1] + 4)], G: [181, 39] },
      puck: [f2[0], r1(f2[1] + 1)],
      cue: { label: "Open shot", youngLabel: "Open", x: r1(f2[0] - 25), y: r1(f2[1] - 5) },
    };
    play.nodes.blockedShot = {
      id: "blockedShot",
      terminal: true,
      q: "The defender blocks the shot. The open support option was missed.",
      pos: { F1: [r1(f1[0] + 4), f1[1]], F2: f2, D1: [r1(d1[0] - 3), r1(d1[1] + 5)], G: [186, 42] },
      puck: [r1(d1[0] - 3), r1(d1[1] + 5)],
      motions: [{ kind: "blocked", from: [r1(f1[0] + 4), f1[1]], to: [r1(d1[0] - 3), r1(d1[1] + 5)], label: "blocked" }],
    };
    play.nodes.turnover = {
      id: "turnover",
      terminal: true,
      q: "The window closes. On a 2-on-1, the read has to happen while the defender is committed.",
      pos: { F1: [r1(f1[0] + 14), r1(f1[1] - 2)], F2: [r1(f2[0] + 3), r1(f2[1] + 2)], D1: [r1(d1[0] + 3), r1(d1[1] - 4)], G: [186, 42] },
      puck: [r1(d1[0] + 3), r1(d1[1] - 4)],
      motions: [{ kind: "blocked", from: [r1(f1[0] + 14), r1(f1[1] - 2)], to: [r1(d1[0] + 3), r1(d1[1] - 4)], label: "lane gone" }],
    };
  } else {
    play.nodes.finish = {
      id: "finish",
      terminal: true,
      q: "Good read. D1 protected the pass, so you attacked the shot lane before the goalie got comfortable.",
      pos: { F1: [r1(f1[0] + 16), r1(f1[1] - 2)], F2: [r1(f2[0] + 1), f2[1]], D1: [r1(d1[0] + 2), d1[1]], G: [183, 42] },
      puck: [190, 43],
      motions: [{ kind: "shot", from: [r1(f1[0] + 16), r1(f1[1] - 2)], to: [190, 43], label: "quick shot" }],
    };
    play.nodes.forcedPass = {
      id: "forcedPass",
      terminal: true,
      q: "The defender breaks up the pass. When D1 sits in the lane, forcing the puck through the middle is the low-percentage play.",
      enter: { F1: [r1(f1[0] + 2), f1[1]], F2: f2, D1: d1, G: [186, 42] },
      pos: { F1: [r1(f1[0] + 2), f1[1]], F2: f2, D1: [r1(d1[0] - 12), r1(d1[1] + 1)], G: [186, 42] },
      enterPuck: d1,
      puck: [r1(d1[0] - 14.5), r1(d1[1] + 2)],
      motions: [{ kind: "blocked", from: [r1(f1[0] + 2), f1[1]], to: d1, label: "pass blocked" }],
      possessionChange: { kind: "interception", fromTeam: "home", toActor: "D1", counterTo: [r1(d1[0] - 12), r1(d1[1] + 1)] },
    };
    play.nodes.turnover = {
      id: "turnover",
      terminal: true,
      q: "The window closes. On a 2-on-1, the read changes based on what the defender takes away.",
      pos: { F1: [r1(f1[0] + 12), r1(f1[1] + 1)], F2: [r1(f2[0] + 3), r1(f2[1] + 2)], D1: [r1(d1[0] - 1), r1(d1[1] + 3)], G: [186, 42] },
      puck: [r1(d1[0] - 1), r1(d1[1] + 3)],
      motions: [{ kind: "blocked", from: [r1(f1[0] + 12), r1(f1[1] + 1)], to: [r1(d1[0] - 1), r1(d1[1] + 3)], label: "lane gone" }],
    };
  }

  const finished = mirror
    ? mirrorPlayY(play, { id: play.id, title: `${play.title} (far side)`, label: "far-side mirror" })
    : play;
  if (mirror) {
    finished.variantOf = null; // kernel plays are their own lineage
    finished.variantLabel = "far-side kernel";
  }
  return finished;
}

// The full parameter space, expanded. `seeds` controls jitter diversity;
// the novelty gate downstream is what keeps only meaningfully distinct ones.
export function expandTwoOnOneFamily({ seeds = [1, 2] } = {}) {
  const out = [];
  for (const commit of COMMITS) {
    for (const depth of DEPTHS) {
      for (const shape of SHAPES) {
        for (const mirror of [false, true]) {
          for (const seed of seeds) {
            out.push(makeTwoOnOnePlay({ commit, depth, shape, mirror, seed }));
          }
        }
      }
    }
  }
  return out;
}
