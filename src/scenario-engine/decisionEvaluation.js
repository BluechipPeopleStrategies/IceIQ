// DecisionEvaluation: the tactical evaluator over one or more physics-clean
// traces, per Phase 3 Task 1-2. "A placeholder/stub claim interface is fine
// here -- Phase 4 builds the real claims store" (plan's own words) -- this
// module's stub deliberately does NOT pretend to have hockey tactical
// judgment. It only does what's honestly derivable from physics alone:
// a candidate that fails physics is not viable; among physically-viable
// candidates, if exactly one survives, that's the derived read; if zero or
// more than one survive, the ambiguity is real and routes to
// review-required rather than being guessed at. Phase 4's real claims
// store is what will later narrow "physically viable" down to "tactically
// correct" when more than one candidate survives physics alone.

export const DECISION_EVALUATION_SCHEMA_VERSION = "decision-evaluation-v1";

export const EVALUATION_STATUS = Object.freeze({
  RESOLVED: "resolved",
  REVIEW_REQUIRED: "review-required",
});

export const AGREEMENT = Object.freeze({
  AGREE: "agree",
  DISAGREE: "disagree",
  REVIEW_REQUIRED: "review-required",
});

// candidates: [{ id, declaredRead: {actorId, description}, trace: SimulationTrace }]
// Every candidate must already be a resolved SimulationTrace (Phase 2's
// simulate()) -- this module does no physics itself, only tactical
// evaluation over physics that's already been proven or disproven.
export function evaluateDecision(candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new Error("evaluateDecision: candidates must be a non-empty array");
  }
  for (const c of candidates) {
    if (!c?.id || !c?.trace || typeof c.trace.physicsClean !== "boolean") {
      throw new Error(`evaluateDecision: candidate ${JSON.stringify(c?.id)} is missing a resolved SimulationTrace`);
    }
  }

  const proofChain = candidates.map((c) => ({
    candidateId: c.id,
    physicsClean: c.trace.physicsClean,
    hardFailures: c.trace.findings
      .filter((f) => f.severity === "hard-failure")
      .map((f) => ({ validatorCode: f.validatorCode, explanation: f.explanation })),
  }));

  const viable = candidates.filter((c) => c.trace.physicsClean);

  if (viable.length === 0) {
    return Object.freeze({
      schemaVersion: DECISION_EVALUATION_SCHEMA_VERSION,
      status: EVALUATION_STATUS.REVIEW_REQUIRED,
      derivedRead: null,
      viableCandidateIds: [],
      proofChain,
      reason: "no candidate is physically clean -- every option fails physics, the scenario itself needs review before any read can be derived",
    });
  }

  if (viable.length > 1) {
    return Object.freeze({
      schemaVersion: DECISION_EVALUATION_SCHEMA_VERSION,
      status: EVALUATION_STATUS.REVIEW_REQUIRED,
      derivedRead: null,
      viableCandidateIds: viable.map((c) => c.id),
      proofChain,
      reason: `${viable.length} candidates (${viable.map((c) => c.id).join(", ")}) are all physically clean -- physics alone can't narrow this to one read; needs a real tactical claim (Phase 4) or human review`,
    });
  }

  const sole = viable[0];
  return Object.freeze({
    schemaVersion: DECISION_EVALUATION_SCHEMA_VERSION,
    status: EVALUATION_STATUS.RESOLVED,
    derivedRead: sole.id,
    viableCandidateIds: [sole.id],
    proofChain,
    reason: `exactly one candidate (${sole.id}) is physically clean -- the read physics alone can support`,
  });
}

// Compares the ScenarioDefinition's OWN declared candidate id against what
// evaluateDecision() derived. Per the plan: "agreement passes through; a
// disproven declared read is a hard failure (not silently resolved);
// missing evidence or multiple unresolved reads route to review-required
// with the mismatch and explanation preserved."
export function compareDeclaredToDerived(declaredCandidateId, evaluation) {
  if (!declaredCandidateId) throw new Error("compareDeclaredToDerived: declaredCandidateId is required");

  if (evaluation.status === EVALUATION_STATUS.REVIEW_REQUIRED) {
    return Object.freeze({
      agreement: AGREEMENT.REVIEW_REQUIRED,
      declaredCandidateId,
      derivedRead: evaluation.derivedRead,
      explanation: `Cannot compare -- decision evaluation itself is review-required: ${evaluation.reason}`,
      mismatchPreserved: true,
    });
  }

  if (evaluation.derivedRead === declaredCandidateId) {
    return Object.freeze({
      agreement: AGREEMENT.AGREE,
      declaredCandidateId,
      derivedRead: evaluation.derivedRead,
      explanation: `Declared read (${declaredCandidateId}) matches the physically-derived read.`,
      mismatchPreserved: false,
    });
  }

  // A declared candidate that was never among the ones evaluateDecision
  // actually saw (typo'd id, a candidate the generator silently dropped)
  // has zero physics evidence either way -- it must not be reported as
  // "disproven," which asserts something that was never actually checked.
  // Per the spec: "missing evidence... route[s] to review-required with the
  // mismatch and explanation preserved." (Caught by both of Phase 3's
  // independent adversarial reviews, 2026-07-31 -- this function previously
  // couldn't tell "tested and failed" apart from "never tested at all.")
  const declaredEntry = evaluation.proofChain.find((p) => p.candidateId === declaredCandidateId);
  if (!declaredEntry) {
    return Object.freeze({
      agreement: AGREEMENT.REVIEW_REQUIRED,
      declaredCandidateId,
      derivedRead: evaluation.derivedRead,
      explanation: `Cannot compare -- declared read (${declaredCandidateId}) was never among the evaluated candidates (evaluated: ${evaluation.proofChain.map((p) => p.candidateId).join(", ")}) -- missing evidence, not a disproven claim.`,
      mismatchPreserved: true,
    });
  }

  // A disproven declared read is a hard failure -- never silently swapped
  // in favor of the derived one, and never silently dropped. Both ids and
  // the full reasoning are preserved on the record.
  return Object.freeze({
    agreement: AGREEMENT.DISAGREE,
    declaredCandidateId,
    derivedRead: evaluation.derivedRead,
    explanation: `Declared read (${declaredCandidateId}) is disproven -- the only physically clean candidate is ${evaluation.derivedRead}, not the one this scenario declared.`,
    mismatchPreserved: true,
  });
}
