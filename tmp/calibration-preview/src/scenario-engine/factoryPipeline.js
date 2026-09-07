// Per-candidate gate pipeline, per Phase 5 Task 8: "wire the gate order from
// the spec (environment/provenance -> schema/domain -> physics -> tactical
// invariants -> novelty -> question/age standards -> visual validation) up
// through gate 7 in this phase; gates 8-10 (Claude judgment, promotion
// policy, app gate) are Phase 6." This module ties factoryRun.js's envelope
// (event log + blob store) to Phase 1-4's already-built validators/
// simulator/decision-evaluator/compiler -- it doesn't re-implement any of
// them, only sequences and records them.
//
// Scope decision, made explicit (matching every other judgment call this
// plan has documented rather than silently resolved): gates 1-4 are real,
// substantive checks -- they map directly onto Phase 1-4's already-built,
// already-reviewed code. Gates 5-7 are explicit, honestly-recorded
// DEFERRALS, not fake passes:
// - Gate 5 (novelty): the Semantic Sibling Review design
//   (docs/superpowers/specs/2026-07-29-scenario-family-templating-FINAL-viable-design.md)
//   requires real Claude API spend and is explicitly marked "not
//   authorized" in its own "What Thomas needs to decide" section. Thomas's
//   own direction for this phase was to build everything except that spend
//   -- so gate 5 is recorded as skipped, with the reason on the record,
//   never silently passed or silently omitted.
// - Gates 6-7 (question/age standards, visual validation): no
//   ScenarioDefinition-shaped validator for either exists anywhere in
//   Phases 1-4 -- building one from scratch is new, unreviewed scope this
//   phase didn't budget for. Recorded as skipped for the same reason.
// A run's own event log is the honest record of what actually ran --
// "passes gates 1-7" for this phase's real candidates means gates 1-4
// genuinely ran and passed, and gates 5-7 are on record as deferred, not
// silently glossed over as done.

import { appendEvent, writeBlob, readBlob } from "./factoryRun.js";
import { validateScenarioDefinition } from "./scenarioDefinition.js";
import { simulate } from "./physics/simulator.js";
import { isUnsupportedModel, SEVERITY } from "./physics/findings.js";
import { evaluateDecision, compareDeclaredToDerived } from "./decisionEvaluation.js";
import { compileTeachingPlay } from "./compiledTeachingPlay.js";

export const DEFERRED_GATES = Object.freeze([
  {
    gateId: "gate5-novelty",
    reason: "Semantic Sibling Review design requires real Claude API spend and is explicitly unauthorized per its own design doc's 'What Thomas needs to decide' section -- deferred per Thomas's direction for this phase.",
  },
  {
    gateId: "gate6-question-age-standards",
    reason: "no ScenarioDefinition-shaped question/age-standards validator exists yet -- out of this phase's built scope.",
  },
  {
    gateId: "gate7-visual-validation",
    reason: "no ScenarioDefinition-shaped visual validator exists yet -- out of this phase's built scope.",
  },
]);

// Finds the prior gate-passed/gate-failed event for a candidate+gate, if
// this run is being resumed and that gate already ran. Every gate function
// below checks this FIRST and returns the cached result instead of
// redoing (and re-recording) the work -- this is what actually closes
// Task 3's "re-running a completed step must not duplicate candidates"
// requirement. (Phase 5's adversarial review, 2026-07-31, found this gap
// concretely: resumeRun()/isStepComplete() existed and were unit-tested in
// isolation, but nothing in this file ever called them, so a resumed run
// silently duplicated every gate event and the final candidate-compiled
// event too.)
function findGateEvent(resumed, candidateId, gateId) {
  if (!resumed) return undefined;
  return resumed.events.find((e) => e.candidateId === candidateId && e.gateId === gateId && (e.type === "gate-passed" || e.type === "gate-failed"));
}

export function runGate1Environment(runDir, candidateId, manifest, resumed = null) {
  const prior = findGateEvent(resumed, candidateId, "gate1-environment");
  if (prior) return prior.type === "gate-passed";

  const missing = [];
  if (!manifest.engineCommit) missing.push("engineCommit");
  if (!manifest.branch) missing.push("branch");
  if (!manifest.versions || Object.keys(manifest.versions).length === 0) missing.push("versions");
  const passed = missing.length === 0;
  appendEvent(runDir, passed ? "gate-passed" : "gate-failed", {
    candidateId, gateId: "gate1-environment",
    reason: passed ? "environment/provenance captured" : `missing: ${missing.join(", ")}`,
  });
  return passed;
}

export function runGate2Schema(runDir, candidateId, definition, resumed = null) {
  const prior = findGateEvent(resumed, candidateId, "gate2-schema");
  if (prior) return { ok: prior.type === "gate-passed", errs: prior.errs ?? [] };

  const result = validateScenarioDefinition(definition);
  appendEvent(runDir, result.ok ? "gate-passed" : "gate-failed", {
    candidateId, gateId: "gate2-schema", errs: result.errs,
  });
  return result;
}

export async function runGate3Physics(runDir, candidateId, definition, physicsProfile, resumed = null) {
  const prior = findGateEvent(resumed, candidateId, "gate3-physics");
  if (prior) return readBlob(runDir, prior.traceHash).value;

  const trace = await simulate(definition, physicsProfile);
  const traceHash = await writeBlob(runDir, "simulation-trace", trace.schemaVersion, trace);
  const hardFailures = trace.findings.filter((f) => !isUnsupportedModel(f) && f.severity === SEVERITY.HARD_FAILURE);
  appendEvent(runDir, trace.physicsClean ? "gate-passed" : "gate-failed", {
    candidateId, gateId: "gate3-physics", traceHash,
    hardFailureCodes: hardFailures.map((f) => f.validatorCode),
  });
  return trace;
}

export async function runGate4Tactical(runDir, candidateId, candidates, declaredCandidateId, claim, resumed = null) {
  const prior = findGateEvent(resumed, candidateId, "gate4-tactical");
  if (prior) {
    const evaluation = readBlob(runDir, prior.evalHash).value;
    return { evaluation, comparison: compareDeclaredToDerived(declaredCandidateId, evaluation) };
  }

  const evaluation = evaluateDecision(candidates, claim);
  const evalHash = await writeBlob(runDir, "decision-evaluation", evaluation.schemaVersion, evaluation);
  const comparison = compareDeclaredToDerived(declaredCandidateId, evaluation);
  const passed = comparison.agreement === "agree";
  appendEvent(runDir, passed ? "gate-passed" : "gate-failed", {
    candidateId, gateId: "gate4-tactical", evalHash,
    agreement: comparison.agreement, explanation: comparison.explanation,
  });
  return { evaluation, comparison };
}

export function recordDeferredGates(runDir, candidateId, resumed = null) {
  const alreadyRecorded = resumed && resumed.events.some((e) => e.type === "gate-skipped" && e.candidateId === candidateId && e.gateId === DEFERRED_GATES[0].gateId);
  if (alreadyRecorded) return DEFERRED_GATES;

  for (const { gateId, reason } of DEFERRED_GATES) {
    appendEvent(runDir, "gate-skipped", { candidateId, gateId, reason });
  }
  return DEFERRED_GATES;
}

// The full per-candidate sequence, gates 1 through compilation. Stops at
// the first gate that doesn't pass -- a failed run "preserves evidence and
// stops at the failing gate" (Task 3), it doesn't keep going past a real
// failure. additionalCandidates lets a caller supply OTHER already-
// simulated candidates for the same decision point (for a genuinely
// multi-candidate scenario); the definition's own declared candidate
// (this trace) is always included automatically.
//
// resumed: pass resumeRun()'s return value to make this call resume-safe
// -- every gate below checks whether it already ran for this candidate in
// a prior attempt at this same run and returns the cached result instead
// of redoing the work. Omit it (or pass null) for a fresh, never-resumed
// run, where every gate always runs for real.
export async function runCandidateThroughGates1to7(runDir, manifest, definition, physicsProfile, declaredCandidateId, { additionalCandidates = [], claim = null, resumed = null } = {}) {
  const candidateId = definition.id;

  // Already fully compiled in a prior attempt at this run -- return the
  // same result rather than re-running anything at all.
  const priorCompiled = resumed && resumed.events.find((e) => e.type === "candidate-compiled" && e.candidateId === candidateId);
  if (priorCompiled) {
    const gate3Event = findGateEvent(resumed, candidateId, "gate3-physics");
    const gate4Event = findGateEvent(resumed, candidateId, "gate4-tactical");
    const trace = gate3Event ? readBlob(runDir, gate3Event.traceHash).value : undefined;
    const evaluation = gate4Event ? readBlob(runDir, gate4Event.evalHash).value : undefined;
    const comparison = evaluation ? compareDeclaredToDerived(declaredCandidateId, evaluation) : undefined;
    return { trace, evaluation, comparison, compiledPlay: readBlob(runDir, priorCompiled.compiledHash).value, stoppedAt: null, resumedFromPriorAttempt: true };
  }

  const gate1Passed = runGate1Environment(runDir, candidateId, manifest, resumed);
  if (!gate1Passed) return { stoppedAt: "gate1-environment" };

  const gate2Result = runGate2Schema(runDir, candidateId, definition, resumed);
  if (!gate2Result.ok) return { schemaErrs: gate2Result.errs, stoppedAt: "gate2-schema" };

  const trace = await runGate3Physics(runDir, candidateId, definition, physicsProfile, resumed);
  if (!trace.physicsClean) return { trace, stoppedAt: "gate3-physics" };

  const candidates = [{ id: declaredCandidateId, trace }, ...additionalCandidates];
  const { evaluation, comparison } = await runGate4Tactical(runDir, candidateId, candidates, declaredCandidateId, claim, resumed);
  if (comparison.agreement !== "agree") return { trace, evaluation, comparison, stoppedAt: "gate4-tactical" };

  recordDeferredGates(runDir, candidateId, resumed);

  const compiledPlay = await compileTeachingPlay(definition, trace, evaluation, declaredCandidateId);
  const compiledHash = await writeBlob(runDir, "compiled-teaching-play", compiledPlay.schemaVersion, compiledPlay);
  appendEvent(runDir, "candidate-compiled", { candidateId, compiledHash });

  return { trace, evaluation, comparison, compiledPlay, stoppedAt: null };
}
