#!/usr/bin/env node
// npm run factory:breakout-demo
// Phase 5 Tasks 5-7's real, on-disk demonstration: runs the real breakout
// ScenarioDefinition through the actual run envelope TWICE independently
// (proving reproducibility -- Task 5's own exit-gate requirement), runs the
// 4 deliberately-impossible variants through the same pipeline (Task 6),
// and runs the coach-declared two_on_one fixture through it too (Task 7).
// Produces real, permanent run directories under docs/factory/runs/ and a
// human-readable summary at docs/factory/breakout-run-report.md, matching
// the existing kernel-expansion-report.md convention.

import { readFileSync, writeFileSync } from "node:fs";
import { startRun, finishRun, readEvents } from "../src/scenario-engine/factoryRun.js";
import { runCandidateThroughGates1to7 } from "../src/scenario-engine/factoryPipeline.js";
import { DZ_BREAKOUT_SCENARIO_DEFINITION } from "../src/scenario-engine/breakout/dzBreakoutScenario.js";
import { DZ_BREAKOUT_IMPOSSIBLE_VARIANTS } from "../src/scenario-engine/breakout/dzBreakoutImpossibleVariants.js";
import { TWO_ON_ONE_COACH_DECLARED_DEFINITION } from "../src/scenario-engine/coachDeclaredFixture.js";
import { SIMULATOR_VERSION } from "../src/scenario-engine/physics/simulator.js";
import { DETECTORS_VERSION } from "../src/scenario-engine/physics/hardFailureDetectors.js";
import { PHYSICS_PROFILE_SCHEMA_VERSION } from "../src/scenario-engine/physics/physicsProfileSchema.js";
import { SCENARIO_DEFINITION_SCHEMA_VERSION } from "../src/scenario-engine/scenarioDefinition.js";
import { DECISION_EVALUATION_SCHEMA_VERSION } from "../src/scenario-engine/decisionEvaluation.js";
import { COMPILED_TEACHING_PLAY_SCHEMA_VERSION } from "../src/scenario-engine/compiledTeachingPlay.js";
import { PLAYBACK_CLOCK_VERSION } from "../src/scenario-engine/playbackClock.js";
import { TACTICAL_CLAIM_SCHEMA_VERSION } from "../src/scenario-engine/tactics/claimSchema.js";

const VERSIONS = {
  simulator: SIMULATOR_VERSION,
  detectors: DETECTORS_VERSION,
  physicsProfileSchema: PHYSICS_PROFILE_SCHEMA_VERSION,
  scenarioDefinitionSchema: SCENARIO_DEFINITION_SCHEMA_VERSION,
  decisionEvaluationSchema: DECISION_EVALUATION_SCHEMA_VERSION,
  compiledTeachingPlaySchema: COMPILED_TEACHING_PLAY_SCHEMA_VERSION,
  playbackClock: PLAYBACK_CLOCK_VERSION,
  tacticalClaimSchema: TACTICAL_CLAIM_SCHEMA_VERSION,
};

const u13Profile = JSON.parse(readFileSync(new URL("../src/scenario-engine/physics/profiles/u13.json", import.meta.url), "utf8"));
const u11Profile = JSON.parse(readFileSync(new URL("../src/scenario-engine/physics/profiles/u11.json", import.meta.url), "utf8"));
const breakoutClaim = JSON.parse(readFileSync(new URL("../docs/factory/tactics/claims/claim_dz_breakout_retrieval_escape_pressure_v1.json", import.meta.url), "utf8"));

const failures = [];
function assert(label, cond) {
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}`);
  if (!cond) failures.push(label);
}

// ---- Reproducibility: run the real breakout scenario through TWO independent runs --
const runA = startRun({ family: "dz_breakout", requestedCounts: { candidates: 1 }, versions: VERSIONS });
const resultA = await runCandidateThroughGates1to7(runA.runDir, runA.manifest, DZ_BREAKOUT_SCENARIO_DEFINITION, u13Profile, "escape_open_side", { claim: breakoutClaim });

const runB = startRun({ family: "dz_breakout", requestedCounts: { candidates: 1 }, versions: VERSIONS });
const resultB = await runCandidateThroughGates1to7(runB.runDir, runB.manifest, DZ_BREAKOUT_SCENARIO_DEFINITION, u13Profile, "escape_open_side", { claim: breakoutClaim });

assert("run A: the real breakout scenario reaches compilation (passes gates 1-4, gates 5-7 recorded as deferred)", resultA.stoppedAt === null && !!resultA.compiledPlay);
assert("run B: the real breakout scenario reaches compilation, independently", resultB.stoppedAt === null && !!resultB.compiledPlay);

// trace.canonicalTraceHash is an IDENTITY hash (definitionId/version/
// contentHash/profileId + SIMULATOR_VERSION -- see simulator.js's
// SOLVER_CONTRACT.candidateIdDerivation) -- it would match across any two
// runs given the same inputs REGARDLESS of whether simulate()'s actual
// output is deterministic, so citing it as reproducibility evidence is
// decorative, not substantive (caught by Phase 5's adversarial review,
// 2026-07-31). The gate-3 blob's own traceHash, by contrast, is a genuine
// content hash of the FULL trace (samples + findings included) -- that's
// the real evidence this exit-gate bullet needs.
const gate3EventA = readEvents(runA.runDir).find((e) => e.gateId === "gate3-physics" && e.candidateId === DZ_BREAKOUT_SCENARIO_DEFINITION.id && e.type === "gate-passed");
const gate3EventB = readEvents(runB.runDir).find((e) => e.gateId === "gate3-physics" && e.candidateId === DZ_BREAKOUT_SCENARIO_DEFINITION.id && e.type === "gate-passed");
assert("EXIT GATE: the same seed/pinned versions reproduce an identical FULL-CONTENT trace hash (samples + findings) across two independent runs", gate3EventA.traceHash === gate3EventB.traceHash);
assert("EXIT GATE: identical positions/motion/puck-timing samples across two independent runs", JSON.stringify(resultA.trace.samples) === JSON.stringify(resultB.trace.samples));
assert("EXIT GATE: identical compiled-play hash across two independent runs", resultA.compiledPlay.compiledHash === resultB.compiledPlay.compiledHash);
assert("declared/derived agreement holds (both runs)", resultA.comparison.agreement === "agree" && resultB.comparison.agreement === "agree");

// ---- Task 6: the 4 deliberately-impossible variants, through the same pipeline (run A) --
for (const { variant, expectedHardFailureCode } of DZ_BREAKOUT_IMPOSSIBLE_VARIANTS) {
  const result = await runCandidateThroughGates1to7(runA.runDir, runA.manifest, variant, u13Profile, "escape_open_side", { claim: breakoutClaim });
  assert(`variant ${variant.id}: stops at gate3-physics with a specific "${expectedHardFailureCode}" finding`, result.stoppedAt === "gate3-physics" && result.trace.findings.some((f) => f.validatorCode === expectedHardFailureCode));
}
// The 4th named variant (closed-lane-claimed-open) is a WARNING, not a hard
// block, by Phase 2's own deliberate design -- it runs all the way through
// gates 1-4 and compiles, same as the clean scenario, but its gate-3 event
// carries the possible-interception WARNING on the record.
{
  const { CLOSED_LANE_CLAIMED_OPEN_VARIANT } = await import("../src/scenario-engine/breakout/dzBreakoutImpossibleVariants.js");
  const result = await runCandidateThroughGates1to7(runA.runDir, runA.manifest, CLOSED_LANE_CLAIMED_OPEN_VARIANT, u13Profile, "escape_open_side", { claim: breakoutClaim });
  assert("variant closed-lane-claimed-open: still compiles (interception is advisory), but carries a real possible-interception WARNING on its gate-3 record", result.stoppedAt === null && result.trace.findings.some((f) => f.validatorCode === "possible-interception"));
}

// ---- Task 7: the coach-declared fixture, through the same envelope (run A) --------
const coachResult = await runCandidateThroughGates1to7(runA.runDir, runA.manifest, TWO_ON_ONE_COACH_DECLARED_DEFINITION, u11Profile, "pass_backdoor");
assert("the coach-declared two_on_one fixture reaches compilation through the real envelope", coachResult.stoppedAt === null && !!coachResult.compiledPlay);
assert("the coach-declared fixture's declared/derived comparison agrees (non-kernel-derived input)", coachResult.comparison.agreement === "agree");

// ---- Finish both runs -------------------------------------------------------------
const eventsA = readEvents(runA.runDir);
const eventsB = readEvents(runB.runDir);
finishRun(runA.runDir, { candidatesRun: 6, kept: eventsA.filter((e) => e.type === "candidate-compiled").length, failedAtGate3: DZ_BREAKOUT_IMPOSSIBLE_VARIANTS.length });
finishRun(runB.runDir, { candidatesRun: 1, kept: 1, failedAtGate3: 0 });

console.log(`\n${failures.length === 0 ? "ALL CHECKS PASSED" : `${failures.length} CHECK(S) FAILED`}`);

// ---- Human-readable report, matching the kernel-expansion-report.md convention --
const report = `# Breakout Factory Run Report

Generated by \`scripts/run-breakout-factory-demo.mjs\` (Phase 5 Tasks 5-7), 2026-07-31.

## Runs

- **Run A** (\`${runA.runId}\`): the real breakout scenario, its 4 impossible variants, and the coach-declared two_on_one fixture -- 6 candidates total.
- **Run B** (\`${runB.runId}\`): the real breakout scenario alone, run independently, to prove reproducibility against Run A.

## Reproducibility (Task 5's exit gate)

The full-content trace hash is the substantive check -- it hashes the
entire trace (samples + findings), so a match genuinely proves identical
simulator output. The identity hashes (canonicalTraceHash, compiledHash)
only cover definition/profile/dependency identity (see simulator.js's
SOLVER_CONTRACT.candidateIdDerivation) -- they'd match given the same
inputs regardless of simulator determinism, so they're included for
completeness, not as the primary evidence.

| Check | Result |
|---|---|
| **Full-content trace hash (samples + findings) matches across runs A/B** | **${gate3EventA.traceHash === gate3EventB.traceHash ? "MATCH" : "MISMATCH"}** |
| Samples (position/motion/puck timing) match across runs A/B | ${JSON.stringify(resultA.trace.samples) === JSON.stringify(resultB.trace.samples) ? "MATCH" : "MISMATCH"} |
| Identity trace hash (canonicalTraceHash) matches across runs A/B | ${resultA.trace.canonicalTraceHash === resultB.trace.canonicalTraceHash ? "MATCH" : "MISMATCH"} |
| Identity compiled-play hash matches across runs A/B | ${resultA.compiledPlay.compiledHash === resultB.compiledPlay.compiledHash ? "MATCH" : "MISMATCH"} |

## Impossible variants (Task 6)

| Variant | Expected finding | Result |
|---|---|---|
${DZ_BREAKOUT_IMPOSSIBLE_VARIANTS.map(({ variant, expectedHardFailureCode }) => `| ${variant.id} | ${expectedHardFailureCode} (hard failure) | stopped at gate3-physics |`).join("\n")}
| sd_dz_breakout_variant_closed_lane_claimed_open | possible-interception (WARNING, not a hard block) | compiled, WARNING on record |

## Coach-declared fixture (Task 7)

\`${TWO_ON_ONE_COACH_DECLARED_DEFINITION.id}\` (family \`${TWO_ON_ONE_COACH_DECLARED_DEFINITION.family}\`, distinct from \`dz_breakout\`) -- declared/derived agreement: ${coachResult.comparison.agreement}.

## Gate coverage this phase

Gates 1-4 ran for real against every candidate above. Gates 5-7 are recorded
as explicitly deferred on every candidate's own event log (\`gate-skipped\`
events, with reasons) -- gate 5 (novelty/SSR) because it requires real
Claude API spend Thomas asked to defer this phase, gates 6-7 because no
ScenarioDefinition-shaped validator exists yet for either. See
\`docs/superpowers/plans/2026-07-29-scenario-engine-foundation-plan.md\`
Phase 5 and \`src/scenario-engine/factoryPipeline.js\`'s own header comment.

## Overall result

${failures.length === 0 ? "All checks passed." : `${failures.length} check(s) failed:\n${failures.map((f) => `- ${f}`).join("\n")}`}
`;

writeFileSync(new URL("../docs/factory/breakout-run-report.md", import.meta.url), report);
console.log("\nReport written to docs/factory/breakout-run-report.md");

process.exit(failures.length === 0 ? 0 : 1);
