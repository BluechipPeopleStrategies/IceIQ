#!/usr/bin/env node
// Run: node src/scenario-engine/generator/parameterSpace.test.mjs
import { readFileSync } from "node:fs";
import { validateScenarioDefinition } from "../scenarioDefinition.js";
import { validateTacticalClaim } from "../tactics/claimSchema.js";
import { filterNovel } from "../noveltySignature.js";
import { simulate } from "../physics/simulator.js";
import { contentHash } from "../canonicalHash.js";

let parameterSpace = {};
let dzBreakout = {};
let importError = null;

try {
  parameterSpace = await import("./parameterSpace.js");
  dzBreakout = await import("./familySpaces/dzBreakout.js");
} catch (error) {
  importError = error;
}

let pass = 0;
let fail = 0;
const ok = (name, condition) => {
  console.log(`${condition ? "PASS" : "FAIL"}  ${name}`);
  if (condition) pass += 1;
  else fail += 1;
};

const claim = JSON.parse(
  readFileSync(new URL("../../../docs/factory/tactics/claims/claim_dz_breakout_retrieval_escape_pressure_v1.json", import.meta.url), "utf8")
);
const u13Profile = JSON.parse(
  readFileSync(new URL("../physics/profiles/u13.json", import.meta.url), "utf8")
);

ok("the parameter-space modules load", importError === null);
ok("the explicitly approved breakout claim remains valid", validateTacticalClaim(claim).ok);

const space = dzBreakout.DZ_BREAKOUT_PARAMETER_SPACE;
const generate = dzBreakout.generateDzBreakoutDefinitions;

ok("the breakout space declares only load-bearing tactical axes", Boolean(space) &&
  Array.isArray(space.axes) &&
  space.axes.length === 3 &&
  space.axes.every((axis) => axis.loadBearing === true && Array.isArray(axis.values) && axis.values.length > 1));

const allParameterSets = parameterSpace.enumerateParameterSpace?.(space) ?? [];
ok("the declared breakout parameter space contains eighteen meaningful states", allParameterSets.length === 18);

let duplicateAxisRejected = false;
try {
  parameterSpace.enumerateParameterSpace?.({
    id: "duplicate-axis-values",
    axes: [{ id: "x", loadBearing: true, values: [1, 1] }],
  });
} catch (error) {
  duplicateAxisRejected = /duplicate/i.test(error.message);
}
ok("a parameter space rejects duplicate values that would create duplicate states", duplicateAxisRejected);

const firstRollout = generate ? await generate({ claim, seed: 73, count: 12 }) : [];
const repeatedRollout = generate ? await generate({ claim, seed: 73, count: 12 }) : [];
const differentSeedRollout = generate ? await generate({ claim, seed: 74, count: 12 }) : [];
const fullRollout = generate ? await generate({ claim, seed: 73, count: 18 }) : [];
const fullRolloutDifferentSeed = generate ? await generate({ claim, seed: 74, count: 18 }) : [];

ok("one seeded rollout returns the requested number of scenario definitions", firstRollout.length === 12);
ok("the same seed reproduces the identical rollout", firstRollout.length === 12 && JSON.stringify(firstRollout) === JSON.stringify(repeatedRollout));
ok("a different seed selects a different rollout from the same approved space", firstRollout.length === 12 && differentSeedRollout.length === 12 && JSON.stringify(firstRollout.map((definition) => definition.id)) !== JSON.stringify(differentSeedRollout.map((definition) => definition.id)));
ok("the forechecker is represented at the profile's full speed on the pressure side", fullRollout.length === 18 && fullRollout.every((definition) => {
  const f1 = definition.initialState.actors.find((actor) => actor.id === "F1");
  return f1 &&
    Array.isArray(f1.velocity) &&
    f1.velocity[0] === 0 &&
    f1.velocity[1] < 0 &&
    Math.hypot(...f1.velocity) === u13Profile.player.topSpeedMPS.value;
}));
ok("every forechecker state leaves the net physically between F1 and D1", fullRollout.length === 18 && fullRollout.every((definition) => {
  const f1 = definition.initialState.actors.find((actor) => actor.id === "F1");
  const d1 = definition.initialState.actors.find((actor) => actor.id === "D1");
  const f1PressureTarget = definition.intendedActions.find((action) => action.actorId === "F1" && action.motionModel === "constant-velocity")?.toPosition;
  const rightGoalLineX = 26.91384;
  return f1 && d1 && f1PressureTarget && f1.position[0] < rightGoalLineX && f1PressureTarget[0] < rightGoalLineX && rightGoalLineX < d1.position[0];
}));
ok("every generated definition records its seed and only load-bearing axes", firstRollout.length === 12 && firstRollout.every((definition) =>
  definition.generationParams?.seed === 73 &&
  definition.generationParams?.parameterSpaceId === "dz-breakout-escape-pressure-v1" &&
  Object.keys(definition.generationParams?.loadBearingAxes ?? {}).length === 3 &&
  !Object.hasOwn(definition.generationParams?.loadBearingAxes ?? {}, "seed")
));
ok("every generated definition is schema-valid and claim-derived", firstRollout.length === 12 && firstRollout.every((definition) =>
  validateScenarioDefinition(definition).ok &&
  definition.proofMode === "approved-claim-derived" &&
  definition.tacticalClaimVersion === `${claim.id}@v${claim.version}`
));

const contentHashesValid = await Promise.all(firstRollout.map(async (definition) => {
  const hashableContent = dzBreakout.contentForScenarioHash?.(definition);
  return typeof definition.contentHash === "string" &&
    definition.contentHash.length === 64 &&
    hashableContent &&
    definition.contentHash === await contentHash(hashableContent);
}));
ok("every generated definition is content-addressed by semantic content, excluding only rollout seed provenance", contentHashesValid.every(Boolean));

const contentHashById = new Map(fullRollout.map((definition) => [definition.id, definition.contentHash]));
ok("the same state keeps its content hash when a different seed selects it", fullRolloutDifferentSeed.length === 18 &&
  fullRolloutDifferentSeed.every((definition) => contentHashById.get(definition.id) === definition.contentHash));

const novelty = filterNovel(firstRollout, []);
ok("a rollout contains no mirror or jitter-only clones", firstRollout.length === 12 && novelty.kept.length === firstRollout.length && novelty.rejected.length === 0);

const excludingFirst = generate
  ? await generate({ claim, seed: 73, count: 12, existingDefinitions: [firstRollout[0]] })
  : [];
ok("generation replaces a state already present in the novelty corpus", excludingFirst.length === 12 && !excludingFirst.some((definition) => definition.id === firstRollout[0]?.id));

const physicalResults = await Promise.all(fullRollout.map((definition) => simulate(definition, u13Profile)));
const noOpponentInterceptionWarning = physicalResults.every((trace, index) => {
  const awayActorIds = new Set(fullRollout[index].initialState.actors.filter((actor) => actor.team === "away").map((actor) => actor.id));
  return !trace.findings.some((finding) => finding.validatorCode === "possible-interception" && awayActorIds.has(finding.actorId));
});
ok("every generated state is physically clean and its claimed outlet is not interceptable by an opponent", physicalResults.length === 18 && physicalResults.every((trace) => trace.physicsClean) && noOpponentInterceptionWarning);
const f1FullSpeedPlayback = physicalResults.every((trace) => {
  const f1Track = trace.samples.filter((sample) => sample.actorId === "F1").sort((a, b) => a.t - b.t);
  const speeds = f1Track.slice(1).flatMap((sample, index) => {
    const previous = f1Track[index];
    const dt = sample.t - previous.t;
    return dt > 0 ? [{ speed: Math.hypot(sample.pos[0] - previous.pos[0], sample.pos[1] - previous.pos[1]) / dt, dt }] : [];
  });
  return speeds.length >= 3 &&
    Math.abs(speeds[0].speed - u13Profile.player.topSpeedMPS.value) < 0.01 &&
    speeds.some(({ speed }) => speed < u13Profile.player.topSpeedMPS.value - 0.1) &&
    speeds.every(({ speed }) => speed <= u13Profile.player.topSpeedMPS.value + 0.01) &&
    physicalResults.every((trace) => !trace.findings.some((finding) => finding.validatorCode === "impossible-sampled-acceleration" && finding.actorId === "F1" && finding.severity === "hard-failure"));
});
ok("the full-speed forechecker condition is emitted and physically braked in the playback trace", f1FullSpeedPlayback);

const reversedVelocity = structuredClone(fullRollout[0]);
reversedVelocity.initialState.actors.find((actor) => actor.id === "F1").velocity = [0, u13Profile.player.topSpeedMPS.value];
const reversedVelocityTrace = await simulate(reversedVelocity, u13Profile);
ok("simulation rejects a declared constant velocity that disagrees with its trajectory", !reversedVelocityTrace.physicsClean &&
  reversedVelocityTrace.findings.some((finding) => finding.validatorCode === "inconsistent-motion-model-velocity"));

const unapprovedClaim = { ...claim, status: "review-required", approval: { ...claim.approval, approvedBy: null, approvedDate: null } };
let unapprovedRejected = false;
try {
  await generate?.({ claim: unapprovedClaim, seed: 73, count: 1 });
} catch (error) {
  unapprovedRejected = /approved tactical claim/i.test(error.message);
}
ok("generation refuses a claim that has not cleared human approval", unapprovedRejected);

const tamperedClaim = structuredClone(claim);
tamperedClaim.preferredRead.description = "A changed claim with a stale hash must not generate scenarios.";
let tamperedClaimRejected = false;
try {
  await generate?.({ claim: tamperedClaim, seed: 73, count: 1 });
} catch (error) {
  tamperedClaimRejected = /content hash/i.test(error.message);
}
ok("generation refuses an approved claim whose recorded content hash no longer matches", tamperedClaimRejected);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
