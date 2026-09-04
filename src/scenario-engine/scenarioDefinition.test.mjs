#!/usr/bin/env node
// Run: node src/scenario-engine/scenarioDefinition.test.mjs
import { validateScenarioDefinition, SCENARIO_DEFINITION_SCHEMA_VERSION } from "./scenarioDefinition.js";
import { playSpaceToRinkFrame } from "./frameAdapters.js";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

// A real, valid definition shaped after the breakout fixture -- not a toy.
function validDefinition() {
  return {
    schemaVersion: SCENARIO_DEFINITION_SCHEMA_VERSION,
    id: "sd_dz_breakout_escape_pressure_u13_v1",
    version: 1,
    contentHash: null,
    family: "dz-breakout",
    tacticalClaimVersion: null, // Phase 4 hasn't run yet -- null is valid here
    proofMode: "coach-declared",
    ageSkillProfile: "u13",
    sources: [{ note: "docs/library/dz-breakout-retrieval-under-pressure.md", cite: "Puck retrieval under pressure..." }],
    rinkFrame: { profileId: "nhl-200x85-v1", units: "metres", attackingDirection: "+x" },
    initialState: {
      actors: [
        { id: "D1", team: "home", role: "puckCarrier", position: playSpaceToRinkFrame([192.5, 42.5]) },
        { id: "W1", team: "home", role: "support", position: playSpaceToRinkFrame([155, 20]) },
        { id: "F1", team: "away", role: "defender", position: playSpaceToRinkFrame([183, 64]) },
        { id: "F2", team: "away", role: "defender", position: playSpaceToRinkFrame([162, 42]) },
      ],
      puck: { position: playSpaceToRinkFrame([192.5, 42.5]) },
    },
    intendedActions: [
      { actorId: "F1", kind: "skate", startTime: 0, endTime: 1.2 },
      { actorId: "D1", kind: "skate", startTime: 0.3, endTime: 1.5 },
    ],
    decisionFreeze: { time: 1.2, observableCues: ["F1 committed low", "F2 still reading"] },
    declaredRead: { actorId: "D1", description: "Escape to the side the forechecker turned away from" },
    questionKindVariants: [{ kind: "lane-pick", ageBands: ["U11", "U13"], copy: { q: "Tap the ice where you take the puck." } }],
    generationParams: null,
    dependencyVersions: { rinkFrame: "rink-frame-v1" },
  };
}

const validResult = validateScenarioDefinition(validDefinition());
ok("a real, valid definition passes with zero errors", validResult.ok && validResult.errs.length === 0);

function corrupt(mutator) {
  const def = validDefinition();
  mutator(def);
  return validateScenarioDefinition(def);
}

ok("rejects a missing definition entirely", !validateScenarioDefinition(null).ok);
ok("rejects the wrong schemaVersion", !corrupt((d) => { d.schemaVersion = "v0"; }).ok);
ok("rejects a missing id", !corrupt((d) => { delete d.id; }).ok);
ok("rejects a non-integer version", !corrupt((d) => { d.version = 1.5; }).ok);
ok("rejects version 0", !corrupt((d) => { d.version = 0; }).ok);
ok("rejects an invalid proofMode", !corrupt((d) => { d.proofMode = "vibes"; }).ok);
ok("rejects empty sources", !corrupt((d) => { d.sources = []; }).ok);
ok("rejects a source missing cite", !corrupt((d) => { d.sources = [{ note: "x" }]; }).ok);
ok("rejects an unknown rinkFrame.profileId", !corrupt((d) => { d.rinkFrame.profileId = "made-up"; }).ok);
ok("rejects rinkFrame.units other than metres", !corrupt((d) => { d.rinkFrame.units = "feet"; }).ok);
ok("rejects a missing rinkFrame.attackingDirection", !corrupt((d) => { delete d.rinkFrame.attackingDirection; }).ok);
ok("rejects an invalid rinkFrame.attackingDirection", !corrupt((d) => { d.rinkFrame.attackingDirection = "north"; }).ok);
ok("accepts rinkFrame.attackingDirection of -x too", corrupt((d) => { d.rinkFrame.attackingDirection = "-x"; }).ok);
ok("rejects zero actors", !corrupt((d) => { d.initialState.actors = []; }).ok);
ok("rejects an actor missing role", !corrupt((d) => { delete d.initialState.actors[0].role; }).ok);
ok("rejects a duplicate actor id", !corrupt((d) => { d.initialState.actors.push({ ...d.initialState.actors[0] }); }).ok);
ok("rejects a non-finite actor position", !corrupt((d) => { d.initialState.actors[0].position = [NaN, 0]; }).ok);
ok("rejects an actor position outside the rink", !corrupt((d) => { d.initialState.actors[0].position = [1000, 1000]; }).ok);
ok("accepts an optional actor velocity vector", corrupt((d) => { d.initialState.actors[2].velocity = [8.6, 0]; }).ok);
ok("rejects a malformed actor velocity vector", !corrupt((d) => { d.initialState.actors[2].velocity = [8.6]; }).ok);
ok("rejects a non-finite actor velocity vector", !corrupt((d) => { d.initialState.actors[2].velocity = [Infinity, 0]; }).ok);
ok("rejects a missing puck position", !corrupt((d) => { delete d.initialState.puck; }).ok);
ok("rejects an intendedAction referencing an undeclared actor", !corrupt((d) => { d.intendedActions.push({ actorId: "GHOST", kind: "skate", startTime: 2 }); }).ok);
ok("accepts the constant-velocity motion model", corrupt((d) => { d.intendedActions[0].motionModel = "constant-velocity"; }).ok);
ok("rejects an unknown motion model", !corrupt((d) => { d.intendedActions[0].motionModel = "teleport"; }).ok);
ok("rejects intendedActions out of time order", !corrupt((d) => { d.intendedActions[0].startTime = 5; }).ok);
ok("rejects an endTime before startTime", !corrupt((d) => { d.intendedActions[0].endTime = -1; }).ok);
ok("rejects a missing decisionFreeze.time", !corrupt((d) => { delete d.decisionFreeze.time; }).ok);
ok("rejects decisionFreeze.observableCues that isn't an array", !corrupt((d) => { d.decisionFreeze.observableCues = "none"; }).ok);
ok("rejects a missing declaredRead.description", !corrupt((d) => { delete d.declaredRead.description; }).ok);
ok("rejects declaredRead.actorId referencing an undeclared actor", !corrupt((d) => { d.declaredRead.actorId = "GHOST"; }).ok);
ok("rejects empty questionKindVariants", !corrupt((d) => { d.questionKindVariants = []; }).ok);
ok("rejects a questionKindVariant missing ageBands", !corrupt((d) => { d.questionKindVariants = [{ kind: "lane-pick" }]; }).ok);
ok("rejects a questionKindVariant missing copy entirely (spec: variants AND age-translated copy)", !corrupt((d) => { d.questionKindVariants = [{ kind: "lane-pick", ageBands: ["U11"] }]; }).ok);
ok("rejects a questionKindVariant with copy but no copy.q", !corrupt((d) => { d.questionKindVariants = [{ kind: "lane-pick", ageBands: ["U11"], copy: {} }]; }).ok);
ok("rejects copy.q that isn't a string", !corrupt((d) => { d.questionKindVariants[0].copy.q = 123; }).ok);
ok("rejects a missing dependencyVersions", !corrupt((d) => { delete d.dependencyVersions; }).ok);

// Each rejection should carry a specific, non-generic message, not just fail silently.
{
  const result = corrupt((d) => { delete d.id; });
  ok("error messages are specific, not generic", result.errs.some((e) => e.toLowerCase().includes("id")));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
