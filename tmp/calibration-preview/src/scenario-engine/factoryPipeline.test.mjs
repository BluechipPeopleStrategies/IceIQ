#!/usr/bin/env node
// Run: node src/scenario-engine/factoryPipeline.test.mjs
import { readFileSync, rmSync } from "node:fs";
import {
  runGate1Environment, runGate2Schema, runGate3Physics, runGate4Tactical,
  recordDeferredGates, runCandidateThroughGates1to7, DEFERRED_GATES,
} from "./factoryPipeline.js";
import { startRun, readEvents, readBlob, releaseLock, resumeRun } from "./factoryRun.js";
import { SCENARIO_DEFINITION_SCHEMA_VERSION } from "./scenarioDefinition.js";
import { playSpaceToRinkFrame } from "./frameAdapters.js";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

const u13Profile = JSON.parse(readFileSync(new URL("./physics/profiles/u13.json", import.meta.url), "utf8"));
const testRunDirs = [];

const D1_START = playSpaceToRinkFrame([192.5, 42.5]);
const D1_ESCAPE = playSpaceToRinkFrame([186, 25]);
const W1_POS = playSpaceToRinkFrame([155, 20]);
const F1_POS = playSpaceToRinkFrame([183, 64]);
const F2_POS = playSpaceToRinkFrame([162, 42]);

function testDefinition(overrides = {}) {
  return {
    schemaVersion: SCENARIO_DEFINITION_SCHEMA_VERSION, id: "sd_pipeline_test", version: 1, contentHash: null,
    family: "test_family", tacticalClaimVersion: null, proofMode: "coach-declared", ageSkillProfile: "u13",
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
    intendedActions: [{ actorId: "D1", kind: "skate", startTime: 0, endTime: 3, toPosition: D1_ESCAPE }],
    decisionFreeze: { time: 5, observableCues: ["test"] },
    declaredRead: { actorId: "D1", description: "test" },
    questionKindVariants: [{ kind: "lane-pick", ageBands: ["U13"], copy: { q: "test" } }],
    generationParams: null, dependencyVersions: { rinkFrame: "rink-frame-v1" },
    ...overrides,
  };
}

function freshRun() {
  const { runDir, runId, manifest } = startRun({ family: "test_family", requestedCounts: { candidates: 1 }, versions: { test: "v1" } });
  testRunDirs.push(runDir);
  return { runDir, runId, manifest };
}

// ---- Gate 1: environment ------------------------------------------------------
{
  const { runDir, manifest } = freshRun();
  const passed = runGate1Environment(runDir, "c1", manifest);
  ok("gate 1 passes for a real manifest with engineCommit/branch/versions", passed);
  const events = readEvents(runDir);
  ok("gate 1 records a gate-passed event", events.some((e) => e.type === "gate-passed" && e.gateId === "gate1-environment"));

  const failed = runGate1Environment(runDir, "c2", { ...manifest, engineCommit: null });
  ok("gate 1 fails when engineCommit is missing", !failed);
}

// ---- Gate 2: schema -------------------------------------------------------------
{
  const { runDir } = freshRun();
  const goodResult = runGate2Schema(runDir, "c1", testDefinition());
  ok("gate 2 passes a genuinely valid definition", goodResult.ok);

  const badResult = runGate2Schema(runDir, "c2", testDefinition({ family: "" }));
  ok("gate 2 fails an invalid definition with real errs", !badResult.ok && badResult.errs.length > 0);
  const events = readEvents(runDir);
  ok("gate 2 records the real errs on a gate-failed event", events.find((e) => e.gateId === "gate2-schema" && e.candidateId === "c2").errs.length > 0);
}

// ---- Gate 3: physics --------------------------------------------------------------
{
  const { runDir } = freshRun();
  const cleanTrace = await runGate3Physics(runDir, "c1", testDefinition(), u13Profile);
  ok("gate 3 passes a physically clean definition", cleanTrace.physicsClean);
  ok("gate 3 writes a real blob for the trace, referenced by hash", (() => {
    const event = readEvents(runDir).find((e) => e.gateId === "gate3-physics" && e.candidateId === "c1");
    const blob = readBlob(runDir, event.traceHash);
    return blob.kind === "simulation-trace" && JSON.stringify(blob.value.samples) === JSON.stringify(cleanTrace.samples);
  })());

  const impossibleTrace = await runGate3Physics(runDir, "c2", testDefinition({
    intendedActions: [{ actorId: "D1", kind: "skate", startTime: 0, endTime: 0.01, toPosition: D1_ESCAPE }],
  }), u13Profile);
  ok("gate 3 fails an impossible definition", !impossibleTrace.physicsClean);
  const failEvent = readEvents(runDir).find((e) => e.gateId === "gate3-physics" && e.candidateId === "c2");
  ok("gate 3's failure event names the specific hard-failure code", failEvent.hardFailureCodes.includes("teleportation"));
}

// ---- Gate 4: tactical -------------------------------------------------------------
{
  const { runDir } = freshRun();
  const trace = await runGate3Physics(runDir, "c1", testDefinition(), u13Profile);
  const { evaluation, comparison } = await runGate4Tactical(runDir, "c1", [{ id: "escape_open_side", trace }], "escape_open_side", null);
  ok("gate 4 resolves and agrees for a clean, correctly-declared candidate", evaluation.status === "resolved" && comparison.agreement === "agree");
  const events = readEvents(runDir);
  ok("gate 4 records a gate-passed event with the evaluation blob referenced", events.some((e) => e.gateId === "gate4-tactical" && e.evalHash));

  const { comparison: disagree } = await runGate4Tactical(runDir, "c2", [{ id: "escape_open_side", trace }], "wrong_declared_id", null);
  ok("gate 4 fails (review-required) when the declared id was never evaluated", disagree.agreement === "review-required");
}

// ---- Full sequence: stops at the first failing gate, doesn't run later gates ----
{
  const { runDir, manifest } = freshRun();
  const impossibleResult = await runCandidateThroughGates1to7(runDir, manifest, testDefinition({
    id: "sd_impossible_test",
    intendedActions: [{ actorId: "D1", kind: "skate", startTime: 0, endTime: 0.01, toPosition: D1_ESCAPE }],
  }), u13Profile, "escape_open_side");
  ok("the full sequence stops at gate3-physics for an impossible definition", impossibleResult.stoppedAt === "gate3-physics");
  ok("no gate4/compilation events exist for a candidate that failed gate 3", !readEvents(runDir).some((e) => e.candidateId === "sd_impossible_test" && (e.gateId === "gate4-tactical" || e.type === "candidate-compiled")));
}

// ---- Full sequence: a genuinely clean candidate runs all the way through -------
{
  const { runDir, manifest } = freshRun();
  const result = await runCandidateThroughGates1to7(runDir, manifest, testDefinition({ id: "sd_clean_test" }), u13Profile, "escape_open_side");
  ok("the full sequence reaches compilation for a clean, correctly-declared candidate", result.stoppedAt === null && result.compiledPlay);
  ok("the compiled play has a real hash", typeof result.compiledPlay.compiledHash === "string" && result.compiledPlay.compiledHash.length === 64);

  const events = readEvents(runDir).filter((e) => e.candidateId === "sd_clean_test");
  ok("gates 1-4 all recorded gate-passed events", ["gate1-environment", "gate2-schema", "gate3-physics", "gate4-tactical"].every((g) => events.some((e) => e.gateId === g && e.type === "gate-passed")));
  ok("gates 5-7 are recorded as explicitly skipped, not silently omitted or falsely passed", DEFERRED_GATES.every(({ gateId }) => events.some((e) => e.gateId === gateId && e.type === "gate-skipped")));
  ok("a candidate-compiled event exists with a real blob hash", events.some((e) => e.type === "candidate-compiled" && typeof e.compiledHash === "string"));
}

// ---- Resumability: an interrupted-and-resumed run does NOT duplicate candidates --
// Both of Phase 5's independent adversarial reviews found this exact gap by
// running the real code: resumeRun()/isStepComplete() existed and were
// unit-tested in isolation, but runCandidateThroughGates1to7 never
// consulted them, so re-driving a candidate after a simulated interruption
// duplicated every gate event. This reproduces their exact repro and
// proves the fix.
{
  const { runDir, runId, manifest } = freshRun();
  const def = testDefinition({ id: "sd_resume_test" });

  const firstAttempt = await runCandidateThroughGates1to7(runDir, manifest, def, u13Profile, "escape_open_side");
  ok("first attempt reaches compilation", firstAttempt.stoppedAt === null && !!firstAttempt.compiledPlay);

  const beforeResumeEventCount = readEvents(runDir).length;

  // Simulate the process dying and being resumed -- release the lock
  // (matching resumeRun's own documented convention) and resume.
  releaseLock(runDir);
  const resumed = resumeRun(runId);
  const secondAttempt = await runCandidateThroughGates1to7(runDir, manifest, def, u13Profile, "escape_open_side", { resumed });

  ok("EXIT GATE: resuming and re-driving the SAME candidate does not duplicate its events", readEvents(runDir).length === beforeResumeEventCount);
  ok("the resumed attempt reports it came from a prior attempt, not a fresh run", secondAttempt.resumedFromPriorAttempt === true);
  ok("the resumed attempt returns the SAME compiled play (identical hash), not a freshly recompiled one", secondAttempt.compiledPlay.compiledHash === firstAttempt.compiledPlay.compiledHash);
  ok("the resumed attempt returns the SAME trace (identical canonical hash)", secondAttempt.trace.canonicalTraceHash === firstAttempt.trace.canonicalTraceHash);

  const events = readEvents(runDir).filter((e) => e.candidateId === "sd_resume_test");
  ok("still exactly ONE candidate-compiled event, not two", events.filter((e) => e.type === "candidate-compiled").length === 1);
  ok("still exactly ONE gate4-tactical gate-passed event, not two", events.filter((e) => e.gateId === "gate4-tactical" && e.type === "gate-passed").length === 1);

}

// ---- Resumability: a run interrupted MID-SEQUENCE only redoes what's left ------
{
  const { runDir, runId, manifest } = freshRun();
  const def = testDefinition({ id: "sd_partial_resume_test" });

  // Manually run gates 1-3 only (simulating a crash between gate 3 and
  // gate 4), then resume and drive the full sequence -- gates 1-3 must be
  // skipped (reusing their recorded results), only gate 4 + compilation
  // should actually run for the first time.
  runGate1Environment(runDir, def.id, manifest);
  runGate2Schema(runDir, def.id, def);
  await runGate3Physics(runDir, def.id, def, u13Profile);
  const eventCountAfterGate3 = readEvents(runDir).length;

  releaseLock(runDir);
  const resumed = resumeRun(runId);
  const result = await runCandidateThroughGates1to7(runDir, manifest, def, u13Profile, "escape_open_side", { resumed });

  ok("a mid-sequence resume completes the candidate (reaches compilation)", result.stoppedAt === null && !!result.compiledPlay);
  ok("gates 1-3 were NOT re-run -- only their own three events exist, no duplicates", readEvents(runDir).filter((e) => e.candidateId === def.id && ["gate1-environment", "gate2-schema", "gate3-physics"].includes(e.gateId)).length === 3);
  ok("gate 4 + compilation genuinely ran for the first time this call (events grew past the gate-3 checkpoint)", readEvents(runDir).length > eventCountAfterGate3);

}

// ---- Cleanup ------------------------------------------------------------------
for (const dir of testRunDirs) rmSync(dir, { recursive: true, force: true });

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
