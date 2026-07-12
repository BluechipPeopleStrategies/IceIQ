const fs = require("fs");
const path = require("path");

function mkdirp(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function write(filePath, content) {
  mkdirp(filePath);
  fs.writeFileSync(filePath, content.replace(/^\uFEFF/, ""), "utf8");
  console.log("Wrote", filePath);
}

function ensureImport(filePath, importLine) {
  let text = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  if (!text.includes(importLine)) {
    const lines = text.split("\n");
    let lastImport = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith("import ")) lastImport = i;
    }
    lines.splice(lastImport + 1, 0, importLine);
    fs.writeFileSync(filePath, lines.join("\n"), "utf8");
    console.log("Added import to", filePath, importLine);
  }
}

function appendExport(filePath, exportLine) {
  let text = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  if (!text.includes(exportLine)) {
    text = text.trimEnd() + "\n" + exportLine + "\n";
    fs.writeFileSync(filePath, text, "utf8");
    console.log("Added export to", filePath, exportLine);
  }
}

function ensurePackageScript(name, command) {
  const pkgPath = "package.json";
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8").replace(/^\uFEFF/, ""));
  pkg.scripts = pkg.scripts || {};
  pkg.scripts[name] = command;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
  console.log("Ensured package script", name);
}

write("src/play/playVariants.js", String.raw`
function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function mergeDeep(base, patch) {
  if (!isPlainObject(base) || !isPlainObject(patch)) return clone(patch);
  const next = clone(base);

  for (const [key, value] of Object.entries(patch)) {
    if (isPlainObject(value) && isPlainObject(next[key])) {
      next[key] = mergeDeep(next[key], value);
    } else {
      next[key] = clone(value);
    }
  }

  return next;
}

function upsertActors(baseActors, addedActors = []) {
  const byId = new Map((baseActors || []).map((actor) => [actor.id, clone(actor)]));
  for (const actor of addedActors) {
    byId.set(actor.id, { ...(byId.get(actor.id) || {}), ...clone(actor) });
  }
  return [...byId.values()];
}

export function makePlayVariant(basePlay, variant) {
  const play = clone(basePlay);

  play.id = variant.id;
  play.title = variant.title || basePlay.title;
  play.variantOf = basePlay.id;
  play.variantLabel = variant.label || "";
  play.difficulty = variant.difficulty || "standard";
  play.ageBands = variant.ageBands || basePlay.ageBands;
  play.sourceRef = {
    ...basePlay.sourceRef,
    ...(variant.sourceRef || {}),
    cite: variant.sourceRef?.cite || basePlay.sourceRef?.cite || "",
  };

  if (variant.actorsToAdd?.length) {
    play.actors = upsertActors(play.actors, variant.actorsToAdd);
  }

  if (variant.actorPatches) {
    play.actors = play.actors.map((actor) => ({
      ...actor,
      ...(variant.actorPatches[actor.id] || {}),
    }));
  }

  if (variant.nodes) {
    for (const [nodeId, patch] of Object.entries(variant.nodes)) {
      play.nodes[nodeId] = mergeDeep(play.nodes[nodeId] || {}, patch);
    }
  }

  if (variant.start) play.start = variant.start;
  return play;
}
`);

write("src/play/plays/defenderHoldsMiddle.js", String.raw`
export const TWO_ON_ONE_DEFENDER_HOLDS_PLAY = {
  id: "play_2v1_defender_holds_middle_u11_v1",
  type: "animated-play",
  title: "2-on-1: Defender holds middle",
  concept: "odd-man-reads",
  ageBands: ["U9", "U11", "U13"],
  view: "half-right",
  start: "rush",
  space: { units: "rink-200x85" },
  sourceRef: {
    note: "docs/library/odd-man-reads.md",
    cite: "Odd-man rush read: when the defender protects the pass lane and stays between the puck carrier and support, the puck carrier may have the better shot or attack lane.",
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
      q: "The lone defender holds the middle and takes away the pass. What is the best read?",
      decisionActor: "F1",
      enter: { F1: [132, 57], F2: [154, 25], D1: [174, 43], G: [187, 42] },
      pos: { F1: [148, 56], F2: [162, 25], D1: [164, 39], G: [186, 42] },
      puck: [145, 56],
      freeze: { x: 148, y: 56, label: "1" },
      motions: [
        { kind: "skate", from: [132, 57], to: [148, 56], actor: "F1" },
        { kind: "skate", from: [154, 25], to: [162, 25], actor: "F2" },
        { kind: "blocked", from: [148, 56], to: [162, 25], label: "pass lane covered" },
      ],
      overlays: [
        { kind: "freeze", x: 148, y: 56, label: "1" },
      ],
      ask: {
        actor: "F1",
        q: "The lone defender holds the middle and takes away the pass. What is the best read?",
        opts: [
          { id: "force_pass", t: "Force the pass through D1", no: "The defender is sitting in the pass lane.", outcome: "D1 breaks up the pass.", next: "forcedPass" },
          { id: "shoot_lane", t: "Attack the open shot lane", ok: true, next: "finish" },
          { id: "wait", t: "Wait for the perfect pass", no: "Waiting gives the defender and goalie time to reset.", outcome: "The numbers advantage disappears.", next: "turnover" },
          { id: "skate_corner", t: "Skate away into the corner", no: "That gives up the middle-lane advantage.", outcome: "The scoring chance fades.", next: "turnover" },
        ],
      },
    },
    finish: {
      id: "finish",
      terminal: true,
      q: "Good read. D1 protected the pass, so you attacked the shot lane before the goalie got comfortable.",
      pos: { F1: [164, 54], F2: [163, 25], D1: [166, 39], G: [183, 42] },
      puck: [190, 43],
      motions: [
        { kind: "shot", from: [164, 54], to: [190, 43], label: "quick shot" },
      ],
    },
    forcedPass: {
      id: "forcedPass",
      terminal: true,
      q: "The defender breaks up the pass. When D1 sits in the lane, forcing the puck through the middle is the low-percentage play.",
      pos: { F1: [150, 56], F2: [162, 25], D1: [160, 39], G: [186, 42] },
      puck: [160, 39],
      motions: [
        { kind: "blocked", from: [150, 56], to: [160, 39], label: "pass blocked" },
      ],
    },
    turnover: {
      id: "turnover",
      terminal: true,
      q: "The window closes. On a 2-on-1, the read changes based on what the defender takes away.",
      pos: { F1: [160, 57], F2: [165, 27], D1: [163, 42], G: [186, 42] },
      puck: [163, 42],
      motions: [
        { kind: "blocked", from: [160, 57], to: [163, 42], label: "lane gone" },
      ],
    },
  },
};
`);

write("src/play/plays/offPuckSupport.js", String.raw`
export const OFF_PUCK_SUPPORT_PLAY = {
  id: "play_off_puck_support_window_u11_v1",
  type: "animated-play",
  title: "Off-puck support: Find the window",
  concept: "off-puck-support-offense",
  ageBands: ["U7", "U9", "U11", "U13"],
  view: "half-right",
  start: "supportRead",
  space: { units: "rink-200x85" },
  sourceRef: {
    note: "docs/library/off-puck-support-offense.md",
    cite: "Off-puck support read: when the puck carrier is pressured, the support player should move into open ice where the puck can reach them.",
    url: "https://www.usahockey.com/practiceplans",
  },
  actors: [
    { id: "F1", team: "home", role: "puckCarrier", label: "F1" },
    { id: "F2", team: "home", role: "support", label: "YOU" },
    { id: "D1", team: "away", role: "defender", label: "D1" },
    { id: "D2", team: "away", role: "defender", label: "D2" },
    { id: "G", team: "away", role: "goalie", label: "G" },
  ],
  nodes: {
    supportRead: {
      id: "supportRead",
      q: "Your teammate has the puck under pressure. Where should you go to help?",
      decisionActor: "F2",
      enter: { F1: [145, 58], F2: [155, 35], D1: [149, 55], D2: [157, 37], G: [187, 42] },
      pos: { F1: [151, 58], F2: [164, 29], D1: [153, 55], D2: [158, 38], G: [187, 42] },
      puck: [151, 58],
      freeze: { x: 164, y: 29, label: "1" },
      motions: [
        { kind: "skate", from: [155, 35], to: [164, 29], actor: "F2" },
        { kind: "blocked", from: [151, 58], to: [158, 38], label: "covered support" },
      ],
      overlays: [
        { kind: "freeze", x: 164, y: 29, label: "1" },
      ],
      ask: {
        actor: "F2",
        q: "Your teammate has the puck under pressure. Where should you go to help?",
        opts: [
          { id: "slide_window", t: "Slide into the open passing window", ok: true, next: "catchWindow" },
          { id: "stand_still", t: "Stand still and wait", no: "Standing still keeps you covered.", outcome: "The passing lane stays closed.", next: "covered" },
          { id: "skate_to_puck", t: "Skate directly toward the puck", no: "That brings your defender into the puck carrier's space.", outcome: "Pressure gets tighter.", next: "covered" },
          { id: "hide_behind_defender", t: "Stay behind the defender", no: "The puck carrier cannot pass through the defender.", outcome: "You are not available.", next: "covered" },
        ],
      },
    },
    catchWindow: {
      id: "catchWindow",
      terminal: true,
      q: "Good support. You moved away from coverage and gave F1 a clean option.",
      pos: { F1: [153, 58], F2: [166, 28], D1: [154, 56], D2: [159, 39], G: [187, 42] },
      puck: [166, 28],
      motions: [
        { kind: "pass", from: [153, 58], to: [166, 28], label: "support pass" },
      ],
    },
    covered: {
      id: "covered",
      terminal: true,
      q: "The support option is covered. Away from the puck, your job is to become useful before the puck carrier runs out of space.",
      pos: { F1: [154, 58], F2: [158, 38], D1: [155, 56], D2: [158, 38], G: [187, 42] },
      puck: [154, 58],
      motions: [
        { kind: "blocked", from: [154, 58], to: [158, 38], label: "covered" },
      ],
    },
  },
};
`);

write("src/play/plays/defensiveAngling.js", String.raw`
export const DEFENSIVE_ANGLING_PLAY = {
  id: "play_defensive_angling_steer_wide_u11_v1",
  type: "animated-play",
  title: "Defensive angling: Steer wide",
  concept: "defensive-angling",
  ageBands: ["U9", "U11", "U13", "U15"],
  view: "half-right",
  start: "entry",
  space: { units: "rink-200x85" },
  sourceRef: {
    note: "docs/library/defensive-angling.md",
    cite: "Defensive angling read: when the defender has inside position, the priority is to protect the middle and steer the attacker wide.",
    url: "https://www.usahockey.com/practiceplans",
  },
  actors: [
    { id: "A1", team: "away", role: "puckCarrier", label: "A1" },
    { id: "D1", team: "home", role: "defender", label: "YOU" },
    { id: "A2", team: "away", role: "support", label: "A2" },
    { id: "G", team: "home", role: "goalie", label: "G" },
  ],
  nodes: {
    entry: {
      id: "entry",
      q: "The attacker is entering with speed and you have inside position. What is the best defensive read?",
      decisionActor: "D1",
      enter: { A1: [132, 54], D1: [150, 45], A2: [144, 25], G: [187, 42] },
      pos: { A1: [148, 55], D1: [158, 45], A2: [154, 26], G: [187, 42] },
      puck: [148, 55],
      freeze: { x: 158, y: 45, label: "1" },
      motions: [
        { kind: "skate", from: [132, 54], to: [148, 55], actor: "A1" },
        { kind: "blocked", from: [148, 55], to: [183, 42], label: "middle protected" },
      ],
      overlays: [
        { kind: "freeze", x: 158, y: 45, label: "1" },
      ],
      ask: {
        actor: "D1",
        q: "The attacker is entering with speed and you have inside position. What is the best defensive read?",
        opts: [
          { id: "steer_wide", t: "Hold inside position and steer wide", ok: true, next: "wide" },
          { id: "chase_puck", t: "Reach across and chase the puck", no: "Reaching can open the middle lane.", outcome: "The attacker cuts inside.", next: "inside" },
          { id: "back_straight_in", t: "Back straight into the goalie", no: "Backing straight in gives the attacker too much middle ice.", outcome: "The attacker keeps options.", next: "inside" },
          { id: "stand_still", t: "Stop and wait", no: "Stopping gives the attacker speed advantage.", outcome: "The attacker skates around you.", next: "inside" },
        ],
      },
    },
    wide: {
      id: "wide",
      terminal: true,
      q: "Good defensive read. You protected the middle and guided the attacker to the outside.",
      pos: { A1: [170, 67], D1: [166, 55], A2: [158, 26], G: [187, 42] },
      puck: [170, 67],
      motions: [
        { kind: "blocked", from: [151, 55], to: [187, 42], label: "middle protected" },
      ],
    },
    inside: {
      id: "inside",
      terminal: true,
      q: "The middle opens. Defensive angling starts with protecting the dangerous ice first.",
      pos: { A1: [172, 43], D1: [164, 54], A2: [160, 27], G: [187, 42] },
      puck: [172, 43],
      motions: [
        { kind: "shot", from: [172, 43], to: [187, 42], label: "middle chance" },
      ],
    },
  },
};
`);

write("src/play/plays/twoOnOneReadVariants.js", String.raw`
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
            { id: "shoot_far", t: "Shoot through the defender", no: "The defender has stepped into the shooting lane.", outcome: "The shot is blocked and the rush slows down.", next: "blockedShot" },
            { id: "pass_backdoor", t: "Pass across to F2 before the backchecker arrives", ok: true, next: "catch" },
            { id: "deke_middle", t: "Deke into the defender", no: "That lets the defender and backchecker squeeze the puck.", outcome: "The 2-on-1 disappears.", next: "turnover" },
            { id: "delay_wait", t: "Wait for everyone to catch up", no: "The backchecker is exactly why waiting is dangerous.", outcome: "The passing lane closes.", next: "turnover" },
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
            { id: "pass_backdoor", t: "Move it across to F2 now", ok: true, next: "catch" },
            { id: "deke_middle", t: "Deke into the defender", no: "That lets the lone defender play your body and the puck.", outcome: "The 2-on-1 disappears.", next: "turnover" },
            { id: "delay_wait", t: "Wait for a cleaner angle", no: "Waiting lets the defender and goalie recover.", outcome: "The lane closes.", next: "turnover" },
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
            { id: "quick_shot", t: "Shoot before the goalie gets square", ok: true, next: "finish" },
            { id: "hold_puck", t: "Hold until the goalie moves first", no: "The goalie is already recovering. Holding gives the goalie time.", outcome: "The goalie gets square.", next: "turnover" },
            { id: "skate_corner", t: "Carry it below the goal line", no: "That takes the puck away from the scoring window.", outcome: "The chance disappears.", next: "turnover" },
            { id: "pass_back", t: "Pass back into traffic", no: "The defender is recovering through the middle.", outcome: "The defender disrupts the play.", next: "turnover" },
          ],
        },
      },
    },
  }),
];
`);

write("src/play/playCatalog.js", String.raw`
import { TWO_ON_ONE_READ_PLAY } from "./plays/twoOnOneRead.js";
import { TWO_ON_ONE_DEFENDER_HOLDS_PLAY } from "./plays/defenderHoldsMiddle.js";
import { OFF_PUCK_SUPPORT_PLAY } from "./plays/offPuckSupport.js";
import { DEFENSIVE_ANGLING_PLAY } from "./plays/defensiveAngling.js";
import { TWO_ON_ONE_READ_VARIANTS } from "./plays/twoOnOneReadVariants.js";

export const CORE_ANIMATED_PLAYS = [
  TWO_ON_ONE_READ_PLAY,
  TWO_ON_ONE_DEFENDER_HOLDS_PLAY,
  OFF_PUCK_SUPPORT_PLAY,
  DEFENSIVE_ANGLING_PLAY,
];

export const VARIANT_ANIMATED_PLAYS = [
  ...TWO_ON_ONE_READ_VARIANTS,
];

export const ALL_ANIMATED_PLAYS = [
  ...CORE_ANIMATED_PLAYS,
  ...VARIANT_ANIMATED_PLAYS,
];

export function playById(id) {
  return ALL_ANIMATED_PLAYS.find((play) => play.id === id) || CORE_ANIMATED_PLAYS[0];
}

export function playsForAge(ageBand) {
  return ALL_ANIMATED_PLAYS.filter((play) => !play.ageBands || play.ageBands.includes(ageBand));
}
`);

write("scripts/test-play-catalog.mjs", String.raw`
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ALL_ANIMATED_PLAYS, CORE_ANIMATED_PLAYS, VARIANT_ANIMATED_PLAYS } from "../src/play/playCatalog.js";
import { validateAnimatedPlay } from "../src/play/validateAnimatedPlay.js";

describe("animated play catalog", () => {
  it("contains core plays and variants", () => {
    assert.equal(CORE_ANIMATED_PLAYS.length >= 4, true);
    assert.equal(VARIANT_ANIMATED_PLAYS.length >= 3, true);
    assert.equal(ALL_ANIMATED_PLAYS.length >= 7, true);
  });

  it("has unique ids", () => {
    const ids = ALL_ANIMATED_PLAYS.map((play) => play.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it("keeps every play valid and source-backed", () => {
    for (const play of ALL_ANIMATED_PLAYS) {
      const result = validateAnimatedPlay(play);
      assert.deepEqual(result.errs, [], play.id);
      assert.equal(result.ok, true, play.id);
      assert.equal(!!play.sourceRef?.note, true, play.id);
      assert.equal(!!play.sourceRef?.cite, true, play.id);
    }
  });

  it("keeps each non-terminal question to exactly one correct answer", () => {
    for (const play of ALL_ANIMATED_PLAYS) {
      for (const node of Object.values(play.nodes)) {
        if (!node.terminal) {
          assert.equal(node.ask.opts.filter((opt) => opt.ok).length, 1, play.id + " / " + node.id);
        }
      }
    }
  });
});
`);

write("docs/library/defensive-angling.md", String.raw`
# Defensive Angling

## Definition

Defensive angling is the defender's read when guiding an attacker away from dangerous middle ice and toward lower-danger space.

## Objective Read

When the defender has inside position, the priority is to protect the middle first. The defender should steer the attacker wide instead of reaching across or chasing the puck.

## Authoring Notes

- The attacker must threaten the middle before the freeze.
- The defender must clearly have inside position.
- The covered middle lane should be shown as unavailable.
- Do not make the correct answer depend only on color.
`);

write("docs/manual-playtest/animated-scenario-expansion.md", String.raw`
# Manual Playtest: Animated Scenario Expansion

Route: /#playtest

## Scenario Selector

- [ ] Selector shows core plays and variants.
- [ ] Switching scenarios resets the play cleanly.
- [ ] Age selector still works after switching scenarios.
- [ ] Telemetry summary updates for the selected play.

## Core Plays

- [ ] 2-on-1: Defender steps up
- [ ] 2-on-1: Defender holds middle
- [ ] Off-puck support: Find the window
- [ ] Defensive angling: Steer wide

## Variants

- [ ] Backchecker coming
- [ ] Support option is flatter
- [ ] Goalie slow to slide

## Standards

- [ ] No duplicate labels.
- [ ] Skate trails do not clutter the freeze point.
- [ ] Gray dotted lines mean unavailable or covered.
- [ ] Correct answer is not revealed before selection.
- [ ] Every non-terminal node has exactly one correct answer.
`);

const animatedPath = "src/play/AnimatedPlay.jsx";

ensureImport(animatedPath, 'import { ALL_ANIMATED_PLAYS } from "./playCatalog.js";');

let animated = fs.readFileSync(animatedPath, "utf8").replace(/^\uFEFF/, "");

// Help defensive scenarios: if the decision actor is a defender, show a single YOU label outside the token.
animated = animated.replace(
  /\{\(profile\.token === "figure" \|\| \(profile\.token === "symbol" && actor\.role !== "goalie"\)\) && \(\s*<text y="-8\.5" textAnchor="middle" fontSize="3\.2" fill="#0B1A33" fontWeight="900">\{isDecisionActor \? "YOU" : actor\.label\}<\/text>\s*\)\}/g,
  `{(profile.token === "figure" || (isDecisionActor && actor.role === "defender") || (profile.token === "symbol" && actor.role !== "goalie")) && (
                <text y="-8.5" textAnchor="middle" fontSize="3.2" fill="#0B1A33" fontWeight="900">{isDecisionActor ? "YOU" : actor.label}</text>
              )}`
);

const newAnimatedPlayTest = String.raw`
export function AnimatedPlayTest() {
  const [age, setAge] = useState("U11");
  const [playId, setPlayId] = useState(TWO_ON_ONE_READ_PLAY.id);
  const [events, setEvents] = useState([]);

  const activePlay = useMemo(
    () => ALL_ANIMATED_PLAYS.find((play) => play.id === playId) || TWO_ON_ONE_READ_PLAY,
    [playId]
  );

  return (
    <div style={{ minHeight: "100vh", background: "#F4F6FA", fontFamily: "Inter, system-ui, Arial, sans-serif", padding: "20px 16px 60px" }}>
      <div style={{ maxWidth: 660, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "#C9A24B", fontWeight: 900 }}>Animated read kernel</div>
            <div style={{ fontSize: 19, fontWeight: 900, color: "#0B1A33" }}>{activePlay.title}</div>
            {activePlay.variantOf && (
              <div style={{ marginTop: 3, fontSize: 12, color: "#5B6575", fontWeight: 700 }}>
                Variant: {activePlay.variantLabel || activePlay.difficulty}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: 10, marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, color: "#4B5563", fontWeight: 800 }}>
            Scenario
            <select value={playId} onChange={(event) => { setPlayId(event.target.value); setEvents([]); }} style={{ display: "block", width: "100%", marginTop: 5, fontFamily: "inherit", fontSize: 14, padding: "8px 10px", borderRadius: 9, border: "1px solid #CDD5E0" }}>
              {ALL_ANIMATED_PLAYS.map((play) => (
                <option key={play.id} value={play.id}>
                  {play.variantOf ? "Variant - " : ""}{play.title}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "block", fontSize: 12, color: "#4B5563", fontWeight: 800 }}>
            Age band
            <select value={age} onChange={(event) => setAge(event.target.value)} style={{ display: "block", width: "100%", marginTop: 5, fontFamily: "inherit", fontSize: 14, padding: "8px 10px", borderRadius: 9, border: "1px solid #CDD5E0" }}>
              {AGE_BANDS.map((band) => <option key={band} value={band}>{profileForAge(band).label}</option>)}
            </select>
          </label>
        </div>

        <AnimatedPlay
          key={activePlay.id + "-" + age}
          play={activePlay}
          ageBand={age}
          onEvent={(event) => {
            const logged = logAnimatedPlayEvent(event);
            setEvents((prev) => [...prev.slice(-5), logged || event]);
          }}
        />

        <div style={{ marginTop: 14, fontSize: 12, color: "#5B6575", lineHeight: 1.5 }}>
          Use the selector to test core scenarios and slight variations. Variants change pressure, spacing, or timing without changing the underlying renderer.
        </div>

        <div style={{ marginTop: 12, background: "#FFFFFF", border: "1px solid #DDE3EC", borderRadius: 10, padding: 10, fontSize: 12, color: "#243044" }}>
          <strong>Prototype telemetry:</strong> {JSON.stringify(summarizeAnimatedPlayEvents(activePlay.id))}
        </div>

        <pre style={{ marginTop: 12, background: "#0B1A33", color: "#E5E7EB", borderRadius: 10, padding: 10, fontSize: 11, overflowX: "auto" }}>
          {JSON.stringify(events, null, 2)}
        </pre>
      </div>
    </div>
  );
}
`;

if (/export function AnimatedPlayTest\(\) \{[\s\S]*$/.test(animated)) {
  animated = animated.replace(/export function AnimatedPlayTest\(\) \{[\s\S]*$/, newAnimatedPlayTest.trimStart() + "\n");
  fs.writeFileSync(animatedPath, animated, "utf8");
  console.log("Replaced AnimatedPlayTest with scenario selector.");
} else {
  console.warn("Could not replace AnimatedPlayTest. Review src/play/AnimatedPlay.jsx manually.");
}

appendExport("src/play/index.js", 'export { ALL_ANIMATED_PLAYS, CORE_ANIMATED_PLAYS, VARIANT_ANIMATED_PLAYS, playById, playsForAge } from "./playCatalog.js";');
appendExport("src/play/index.js", 'export { makePlayVariant } from "./playVariants.js";');
appendExport("src/play/index.js", 'export { TWO_ON_ONE_DEFENDER_HOLDS_PLAY } from "./plays/defenderHoldsMiddle.js";');
appendExport("src/play/index.js", 'export { OFF_PUCK_SUPPORT_PLAY } from "./plays/offPuckSupport.js";');
appendExport("src/play/index.js", 'export { DEFENSIVE_ANGLING_PLAY } from "./plays/defensiveAngling.js";');

ensurePackageScript("test:play-catalog", "node --test scripts/test-play-catalog.mjs");

console.log("Scenario expansion patch complete.");
