#!/usr/bin/env node
// Run: node src/play/animatedPlayV2Adapter.test.mjs
import { readFileSync } from "node:fs";
import { legacyPositionsAt, compiledPlayToLegacyNode, compiledPlayToFreezeNode, legacyMotionsForActor } from "./animatedPlayV2Adapter.js";
import { compileTeachingPlay } from "../scenario-engine/compiledTeachingPlay.js";
import { evaluateDecision } from "../scenario-engine/decisionEvaluation.js";
import { simulate } from "../scenario-engine/physics/simulator.js";
import { playSpaceToRinkFrame } from "../scenario-engine/frameAdapters.js";
import { SCENARIO_DEFINITION_SCHEMA_VERSION } from "../scenario-engine/scenarioDefinition.js";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

const u13Profile = JSON.parse(readFileSync(new URL("../scenario-engine/physics/profiles/u13.json", import.meta.url), "utf8"));

const D1_START = playSpaceToRinkFrame([192.5, 42.5]);
const D1_ESCAPE = playSpaceToRinkFrame([186, 25]);
const W1_POS = playSpaceToRinkFrame([155, 20]);
const F1_POS = playSpaceToRinkFrame([183, 64]);
const F2_POS = playSpaceToRinkFrame([162, 42]);
// A 1ft nudge -- short enough (<0.5m, TURN_MIN_SEGMENT_M) that the
// impossible-turning detector skips comparing it against D1's following
// skate heading. Only exists so the trace has a real puck-tagged sample to
// exercise the adapter's puck handling; not a tactically meaningful pass.
const D1_PASS_TARGET = playSpaceToRinkFrame([193.5, 42.5]);

const def = {
  schemaVersion: SCENARIO_DEFINITION_SCHEMA_VERSION, id: "sd_adapter_test", version: 1, contentHash: null,
  family: "dz-breakout", tacticalClaimVersion: null, proofMode: "coach-declared", ageSkillProfile: "u13",
  sources: [{ note: "test", cite: "test" }],
  rinkFrame: { profileId: "nhl-200x85-v1", units: "metres", attackingDirection: "+x" },
  initialState: {
    actors: [
      { id: "D1", team: "home", role: "puckCarrier", position: D1_START },
      { id: "W1", team: "home", role: "support", position: W1_POS },
      { id: "F1", team: "away", role: "defender", position: F1_POS },
      { id: "F2", team: "away", role: "defender", position: F2_POS },
    ],
    puck: { position: D1_START },
  },
  intendedActions: [
    { actorId: "D1", kind: "pass", startTime: 0, endTime: 0.5, toPosition: D1_PASS_TARGET },
    { actorId: "D1", kind: "skate", startTime: 0.5, endTime: 3.5, toPosition: D1_ESCAPE },
  ],
  decisionFreeze: { time: 5, observableCues: ["test"] },
  declaredRead: { actorId: "D1", description: "test" },
  questionKindVariants: [{ kind: "lane-pick", ageBands: ["U13"], copy: { q: "test" } }],
  generationParams: null, dependencyVersions: { rinkFrame: "rink-frame-v1" },
};

const trace = await simulate(def, u13Profile);
const evaluation = evaluateDecision([{ id: "escape_open_side", trace }]);
const compiledPlay = await compileTeachingPlay(def, trace, evaluation, "escape_open_side");

// ---- legacyPositionsAt: RinkFrame metres -> 200x85 feet ----------------------
const atStart = legacyPositionsAt(compiledPlay, 0);
ok("legacyPositionsAt returns D1's position in feet, matching the real starting point", Math.abs(atStart.pos.D1[0] - 192.5) < 0.1 && Math.abs(atStart.pos.D1[1] - 42.5) < 0.1);
ok("legacyPositionsAt returns a puck position", Array.isArray(atStart.puck) && atStart.puck.length === 2);

const atEnd = legacyPositionsAt(compiledPlay, 3.5);
ok("legacyPositionsAt at the action's end matches the real escape point", Math.abs(atEnd.pos.D1[0] - 186) < 0.1 && Math.abs(atEnd.pos.D1[1] - 25) < 0.1);

// ---- compiledPlayToLegacyNode: the exact shape AnimatedPlay.jsx already reads --
const node = compiledPlayToLegacyNode(compiledPlay, 1.5);
ok("legacy node has a pos object keyed by actor id", typeof node.pos === "object" && node.pos.D1);
ok("legacy node has a puck field", Array.isArray(node.puck));
ok("legacy node is not terminal mid-action", node.terminal === false);

const terminalNode = compiledPlayToLegacyNode(compiledPlay, 5);
ok("legacy node IS terminal at/after the last event time", terminalNode.terminal === true);

// ---- compiledPlayToFreezeNode: the exact moment AnimatedPlay.jsx's question UI needs --
const freezeNode = compiledPlayToFreezeNode(compiledPlay);
ok("freeze node samples at questionFreezeTime specifically", JSON.stringify(freezeNode) === JSON.stringify(compiledPlayToLegacyNode(compiledPlay, compiledPlay.questionFreezeTime)));

// ---- legacyMotionsForActor: a legacy motions[] entry --------------------------
const motions = legacyMotionsForActor(compiledPlay, "D1");
ok("legacyMotionsForActor returns at least one motion segment for a moving actor", motions.length > 0);
ok("each motion has from/to in feet and the right kind", motions.every((m) => Array.isArray(m.from) && Array.isArray(m.to) && m.kind === "skate"));
ok("motions for an actor with no samples returns an empty array, not a throw", legacyMotionsForActor(compiledPlay, "GHOST").length === 0);

// ---- Puck motions carry the real action kind (skate/pass/shot), not a lossy pass/skate guess --
// Caught by Phase 3's adversarial review, 2026-07-31: deriving kind from a
// boolean puck flag mislabeled every carried-puck segment AND every shot
// as "pass".
const puckMotions = legacyMotionsForActor(compiledPlay, "puck");
ok("the fixture's own pass action is labeled 'pass', not guessed", puckMotions.length > 0 && puckMotions[0].kind === "pass");
{
  const shotDef = {
    ...def,
    id: "sd_adapter_test_shot",
    intendedActions: [{ actorId: "D1", kind: "shot", startTime: 0, endTime: 0.5, toPosition: D1_PASS_TARGET }],
  };
  const shotTrace = await simulate(shotDef, u13Profile);
  const shotEvaluation = evaluateDecision([{ id: "shoot", trace: shotTrace }]);
  const shotCompiledPlay = await compileTeachingPlay(shotDef, shotTrace, shotEvaluation, "shoot");
  const shotMotions = legacyMotionsForActor(shotCompiledPlay, "puck");
  ok("a shot action is labeled 'shot', not mislabeled 'pass'", shotMotions.length > 0 && shotMotions[0].kind === "shot");
}

// ---- Zero product-code consumers: nothing imports this module -----------------
// (Task requirement: "AnimatedPlay.jsx has zero diff in this phase; the
// adapter is new, opt-in code only." Confirmed by grep, not just claimed.)
// Matches actual import/require syntax only -- a bare substring grep for
// "animatedPlayV2Adapter" also matches PROSE mentions of the filename in
// comments (e.g. simulator.js's own changelog-style comments), which is a
// false positive, not a real consumer.
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const srcRoot = fileURLToPath(new URL("..", import.meta.url));
const importPattern = /(?:from\s+["'][^"']*animatedPlayV2Adapter|require\(["'][^"']*animatedPlayV2Adapter)/;

function findImporters(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = `${directory}/${entry.name}`;
    if (entry.isDirectory()) return findImporters(filePath);
    if (!/\.(?:js|jsx)$/.test(entry.name)) return [];
    if (entry.name === "animatedPlayV2Adapter.js" || entry.name === "animatedPlayV2Adapter.test.mjs") return [];
    return importPattern.test(readFileSync(filePath, "utf8")) ? [filePath] : [];
  });
}

const importers = findImporters(srcRoot);
ok("nothing outside this module and its own test imports animatedPlayV2Adapter.js yet", importers.length === 0);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
