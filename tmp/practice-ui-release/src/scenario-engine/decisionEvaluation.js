// DecisionEvaluation: the tactical evaluator over one or more physics-clean
// traces, per Phase 3 Task 1-2 and Phase 4 Task 5. Physics alone decides
// viability: a candidate that fails physics is never viable, no matter what
// a claim says. Among physically-viable candidates, if exactly one
// survives, that's the derived read -- a claim is never consulted to
// override physics-derived resolution. If zero survive, it's genuinely
// unresolvable and a claim can't help either. Only when MULTIPLE candidates
// are physically viable does an approved tactical claim get a say: if the
// claim takes a clear position (its own preferredRead.id matches exactly
// one of the viable candidates), that narrows physically-viable down to
// tactically-correct. This is never prose/similarity matching -- only an
// exact id match against the claim's own preferredRead.id, the same id
// convention already used for candidate ids everywhere else in this
// pipeline (see claimSchema.js and the seeded dz-breakout claim).
// Un-narrowable ambiguity (no claim passed, claim not approved, or the
// claim's preferredRead isn't among the viable candidates) still routes to
// review-required, exactly as the Phase 3 stub did.

import { CLAIM_STATUS, APPROVED_REVIEWERS } from "./tactics/claimSchema.js";

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
// claim: optional TacticalClaim (claimSchema.js shape). Only consulted when
// physics alone leaves more than one candidate viable -- see the module
// comment above for exactly how and why.
export function evaluateDecision(candidates, claim = null) {
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
  const consultedClaimId = claim?.id ?? null;

  if (viable.length === 0) {
    return Object.freeze({
      schemaVersion: DECISION_EVALUATION_SCHEMA_VERSION,
      status: EVALUATION_STATUS.REVIEW_REQUIRED,
      derivedRead: null,
      viableCandidateIds: [],
      proofChain,
      consultedClaimId,
      reason: "no candidate is physically clean -- every option fails physics, the scenario itself needs review before any read can be derived",
    });
  }

  if (viable.length > 1) {
    // An approved claim gets a say ONLY here -- physics already resolved
    // the zero- and exactly-one-viable cases without any tactical input.
    // Narrowing requires an EXACT id match against the claim's own
    // preferredRead.id, never prose similarity -- if the claim doesn't
    // name one of the physically-viable candidates, or isn't approved, the
    // ambiguity is real and still routes to review-required.
    // status === "approved" is NOT trusted on its own -- claimSchema.js's
    // validateTacticalClaim() is what normally enforces the human-approver
    // allowlist, but that's an offline/authoring-time check; this is the
    // RUNTIME consumer, and a claim-shaped object reaching here (a stale
    // cache entry, a partially-deserialized record, a stray test double
    // reused in real code) was never guaranteed to have gone through that
    // validator. Re-checking approval.approvedBy against the same
    // allowlist here closes that gap. (Caught by Phase 4's adversarial
    // review, 2026-07-31 -- the first version trusted status alone.)
    const approvedBy = claim?.approval?.approvedBy;
    const hasRealApprover = typeof approvedBy === "string" && approvedBy.trim().length > 0 && APPROVED_REVIEWERS.includes(approvedBy);
    if (claim?.status === CLAIM_STATUS.APPROVED && hasRealApprover) {
      const narrowed = viable.filter((c) => c.id === claim.preferredRead?.id);
      if (narrowed.length === 1) {
        const sole = narrowed[0];
        return Object.freeze({
          schemaVersion: DECISION_EVALUATION_SCHEMA_VERSION,
          status: EVALUATION_STATUS.RESOLVED,
          derivedRead: sole.id,
          viableCandidateIds: [sole.id],
          proofChain,
          consultedClaimId,
          reason: `${viable.length} candidates (${viable.map((c) => c.id).join(", ")}) are all physically clean, but approved tactical claim ${claim.id} names "${sole.id}" as the preferred read -- narrowed from physically-viable to tactically correct.`,
        });
      }
    }
    return Object.freeze({
      schemaVersion: DECISION_EVALUATION_SCHEMA_VERSION,
      status: EVALUATION_STATUS.REVIEW_REQUIRED,
      derivedRead: null,
      viableCandidateIds: viable.map((c) => c.id),
      proofChain,
      consultedClaimId,
      reason: `${viable.length} candidates (${viable.map((c) => c.id).join(", ")}) are all physically clean -- physics alone can't narrow this to one read, and ${claim ? `the consulted claim (${claim.id}) doesn't resolve it (not approved, or its preferredRead isn't among the viable candidates)` : "no approved tactical claim was consulted"}; needs human review`,
    });
  }

  const sole = viable[0];
  return Object.freeze({
    schemaVersion: DECISION_EVALUATION_SCHEMA_VERSION,
    status: EVALUATION_STATUS.RESOLVED,
    derivedRead: sole.id,
    viableCandidateIds: [sole.id],
    proofChain,
    consultedClaimId,
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
