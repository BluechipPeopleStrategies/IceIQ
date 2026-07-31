// CompiledTeachingPlay: the immutable playback artifact combining an
// approved ScenarioDefinition, its SimulationTrace, and its
// DecisionEvaluation, per Phase 3 Task 3. Consumed identically by player
// preview, coach preview, and video export (framework-fit decision 1) via
// playbackClock.js -- this module only builds the artifact, it doesn't
// walk it.
//
// "Approved" is enforced, not just implied by the name: this function
// refuses to compile anything whose declared/derived comparison isn't a
// clean AGREE. An unresolved or disproven read has no business being
// turned into playback content.

import { compareDeclaredToDerived, AGREEMENT } from "./decisionEvaluation.js";
import { versionedContentHash } from "./canonicalHash.js";

export const COMPILED_TEACHING_PLAY_SCHEMA_VERSION = "compiled-teaching-play-v1";

export function deriveEventTimes(definition) {
  const eventTimesSet = new Set([0]);
  for (const action of definition.intendedActions) {
    eventTimesSet.add(action.startTime);
    if (action.endTime !== undefined) eventTimesSet.add(action.endTime);
  }
  if (Number.isFinite(definition.decisionFreeze?.time)) eventTimesSet.add(definition.decisionFreeze.time);
  return [...eventTimesSet].sort((a, b) => a - b);
}

export async function compileTeachingPlay(definition, trace, evaluation, declaredCandidateId) {
  // The trace argument must actually have been simulated FROM this
  // definition -- otherwise a caller can pair an unrelated (but physically
  // clean) trace with this definition's identity/copy and compile a
  // Frankenstein artifact: right id and declaredRead text, wrong samples.
  // simulate() stamps definitionId/definitionVersion from the real
  // definition it ran on, so this is a genuine identity check, not just a
  // trust-the-caller convention. (Caught by both of Phase 3's independent
  // adversarial reviews, 2026-07-31 -- previously nothing checked this at
  // all; only trace.physicsClean and the declared/derived ID strings were
  // checked, both blind to which objects were actually passed in.)
  if (trace.definitionId !== definition.id || trace.definitionVersion !== definition.version) {
    throw new Error(
      `compileTeachingPlay: refusing to compile -- trace belongs to definition ${trace.definitionId}@${trace.definitionVersion}, not the given definition ${definition.id}@${definition.version}.`
    );
  }
  const comparison = compareDeclaredToDerived(declaredCandidateId, evaluation);
  if (comparison.agreement !== AGREEMENT.AGREE) {
    throw new Error(
      `compileTeachingPlay: refusing to compile -- declared/derived agreement is "${comparison.agreement}", not "agree". ${comparison.explanation}`
    );
  }
  if (!trace.physicsClean) {
    // Should be unreachable if evaluation/comparison are used correctly
    // (an AGREE implies the derived candidate's trace was physicsClean),
    // but checked directly anyway -- never trust a caller to have chained
    // the steps correctly when the artifact is meant to be immutable proof.
    throw new Error("compileTeachingPlay: refusing to compile a trace that is not physicsClean");
  }

  const eventTimes = deriveEventTimes(definition);

  const dependencyHashes = {
    definitionId: definition.id,
    definitionVersion: definition.version,
    definitionContentHash: definition.contentHash,
    traceHash: trace.canonicalTraceHash,
    physicsProfileId: trace.physicsProfileId,
  };

  const compiledHash = await versionedContentHash("compiled-teaching-play", COMPILED_TEACHING_PLAY_SCHEMA_VERSION, {
    dependencyHashes,
    derivedRead: evaluation.derivedRead,
  });

  return Object.freeze({
    schemaVersion: COMPILED_TEACHING_PLAY_SCHEMA_VERSION,
    id: definition.id,
    version: definition.version,
    compiledHash,
    dependencyHashes,
    // Resolved keyframes/samples -- the trace's own fixed-step samples,
    // carried through verbatim (this module doesn't re-derive them).
    samples: trace.samples,
    eventTimes,
    questionFreezeTime: definition.decisionFreeze.time,
    observableCues: definition.decisionFreeze.observableCues,
    declaredRead: definition.declaredRead,
    // Answer proof: which candidate was derived-correct and the full
    // physics-based reasoning chain behind it, per the plan's own
    // requirement that CompiledTeachingPlay carry "answer proof."
    answerProof: Object.freeze({
      derivedRead: evaluation.derivedRead,
      proofChain: evaluation.proofChain,
      comparison,
    }),
    questionKindVariants: definition.questionKindVariants,
  });
}
