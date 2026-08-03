// Machine-readable tactical claim schema + validator, per Phase 4 Task 2.
// A tactical claim is the versioned, sourced, human-approved knowledge layer
// a generator consults to know which candidate read is tactically correct --
// distinct from Phase 2's physics layer (a candidate can be physically clean
// and still be the WRONG hockey read; claims are what tell the difference).
// Claim DATA files live outside src/ (docs/factory/tactics/claims/ --
// framework-fit decision 3: factory-only, never shipped in the browser
// bundle). This SHAPE validator lives in src/ because it's reusable code,
// not data -- imported by both scripts/test-tactics.mjs (the catalog-wide
// CLI check) and, per Task 5, decisionEvaluation.js itself.
//
// This module only checks SHAPE. Deeper catalog-wide checks -- does a
// sourceRef's file actually exist, do linkedKernelIds/linkedValidatorIds
// resolve to real things elsewhere in the repo, do two approved claims
// conflict -- need visibility this module deliberately doesn't have; those
// live in scripts/test-tactics.mjs, the one place with visibility into the
// whole store plus the rest of the repo (mirrors physicsProfileSchema.js's
// own shape-only scope from Phase 2).

export const TACTICAL_CLAIM_SCHEMA_VERSION = "tactical-claim-v1";

export const CLAIM_STATUS = Object.freeze({
  DRAFT: "draft",
  REVIEW_REQUIRED: "review-required",
  APPROVED: "approved",
  RETIRED: "retired",
  SUPERSEDED: "superseded",
});

export const PROOF_MODE = Object.freeze({
  KERNEL_DERIVED: "kernel-derived",
  APPROVED_CLAIM_DERIVED: "approved-claim-derived",
});

// Only these named humans may move a claim to (or past) approved -- a DATA
// check, not just a convention, per the spec's explicit "enforce this as a
// data check, e.g. an approvedBy allowlist." A claim's own status/approvedBy
// pairing is checked against this list below; nothing in this factory ever
// adds a name here on Thomas's behalf.
export const APPROVED_REVIEWERS = Object.freeze(["Thomas Slifka"]);

const VALID_AGE_BANDS = ["U7", "U9", "U11", "U13", "U15", "U18"];

// A claim's own status implies whether it must (or must never) carry a real
// human approver -- draft/review-required haven't been approved yet, so
// approvedBy must be null (never a partial or pretend approval); approved/
// retired/superseded all passed through real approval at some point, even
// if since retired or superseded, so they must keep the record.
const STATUSES_REQUIRING_APPROVER = [CLAIM_STATUS.APPROVED, CLAIM_STATUS.RETIRED, CLAIM_STATUS.SUPERSEDED];

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function isStringArray(v) {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

export function validateTacticalClaim(claim) {
  const errs = [];
  if (!claim || typeof claim !== "object") return { ok: false, errs: ["claim must be an object"] };

  if (claim.schemaVersion !== TACTICAL_CLAIM_SCHEMA_VERSION) {
    errs.push(`schemaVersion must be "${TACTICAL_CLAIM_SCHEMA_VERSION}"`);
  }
  if (!isNonEmptyString(claim.id) || !claim.id.startsWith("claim_")) {
    errs.push('id must be a non-empty string starting with "claim_"');
  }
  if (!Number.isInteger(claim.version) || claim.version < 1) {
    errs.push("version must be a positive integer");
  }
  // null-or-string, matching scenarioDefinition.js's own contentHash
  // convention exactly: null before a separate tooling step computes it,
  // a string once it has. Deeper "does it actually recompute to the same
  // value" verification is scripts/test-tactics.mjs's job, not this shape
  // check's -- same division of labor as Phase 1/2's own schemas.
  if (claim.contentHash !== null && typeof claim.contentHash !== "string") {
    errs.push("contentHash must be a string once computed, or null before it's computed");
  }

  if (!Object.values(CLAIM_STATUS).includes(claim.status)) {
    errs.push(`status must be one of ${Object.values(CLAIM_STATUS).join(", ")}`);
  }
  if (!Object.values(PROOF_MODE).includes(claim.proofMode)) {
    errs.push(`proofMode must be one of ${Object.values(PROOF_MODE).join(", ")}`);
  }

  if (!isNonEmptyString(claim.family)) errs.push("family is required");
  if (!isNonEmptyString(claim.phaseOfPlay)) errs.push("phaseOfPlay is required");

  const bands = claim.ageSkillApplicability?.ageBands;
  if (!Array.isArray(bands) || bands.length === 0 || !bands.every((b) => VALID_AGE_BANDS.includes(b))) {
    errs.push(`ageSkillApplicability.ageBands must be a non-empty array drawn from ${VALID_AGE_BANDS.join(", ")}`);
  }

  if (!Array.isArray(claim.observableCues) || claim.observableCues.length === 0) {
    errs.push("observableCues must be a non-empty array -- a claim with no observable cue can't be read from the ice");
  } else {
    claim.observableCues.forEach((c, i) => {
      if (!isNonEmptyString(c?.id) || !isNonEmptyString(c?.description)) {
        errs.push(`observableCues[${i}] needs a non-empty id and description`);
      }
    });
  }

  if (!Array.isArray(claim.conditions) || claim.conditions.length === 0 || !claim.conditions.every(isNonEmptyString)) {
    errs.push("conditions must be a non-empty array of non-empty strings");
  }

  if (!isNonEmptyString(claim.preferredRead?.id) || !isNonEmptyString(claim.preferredRead?.description) || !isNonEmptyString(claim.preferredRead?.reasoning)) {
    errs.push("preferredRead needs a non-empty id, description, and reasoning");
  }

  if (!Array.isArray(claim.invalidatedReads)) {
    errs.push("invalidatedReads must be an array (may be empty, but must be present)");
  } else {
    claim.invalidatedReads.forEach((r, i) => {
      if (!isNonEmptyString(r?.id) || !isNonEmptyString(r?.description) || !isNonEmptyString(r?.reasoning)) {
        errs.push(`invalidatedReads[${i}] needs a non-empty id, description, and reasoning`);
      }
    });
  }

  if (!isStringArray(claim.exceptions)) {
    errs.push("exceptions must be an array of strings (may be empty)");
  }

  if (!Array.isArray(claim.sources) || claim.sources.length === 0) {
    errs.push("sources must be a non-empty array -- an unsourced tactical claim is never valid (same rigor Phase 2 held physics parameters to)");
  } else {
    claim.sources.forEach((s, i) => {
      if (!isNonEmptyString(s?.note) || !isNonEmptyString(s?.cite)) errs.push(`sources[${i}] needs a non-empty note and cite`);
      if (!isNonEmptyString(s?.evidenceConfidence)) errs.push(`sources[${i}] needs evidenceConfidence`);
    });
  }

  if (!isStringArray(claim.linkedKernelIds)) errs.push("linkedKernelIds must be an array of strings (may be empty)");
  if (!isStringArray(claim.linkedValidatorIds)) errs.push("linkedValidatorIds must be an array of strings (may be empty)");

  if (!claim.approval || typeof claim.approval !== "object") {
    errs.push("approval object is required");
  } else {
    const { approvedBy, approvedDate, reviewNotes } = claim.approval;
    if (!isNonEmptyString(reviewNotes)) errs.push("approval.reviewNotes is required");
    if (STATUSES_REQUIRING_APPROVER.includes(claim.status)) {
      if (!isNonEmptyString(approvedBy) || !APPROVED_REVIEWERS.includes(approvedBy)) {
        errs.push(`approval.approvedBy must be one of the named allowlisted reviewers (${APPROVED_REVIEWERS.join(", ")}) for status "${claim.status}"`);
      }
      if (!isNonEmptyString(approvedDate)) errs.push(`approval.approvedDate is required for status "${claim.status}"`);
    } else {
      if (approvedBy !== null) errs.push(`approval.approvedBy must be null for status "${claim.status}" -- never a partial/pre-approval`);
      if (approvedDate !== null) errs.push(`approval.approvedDate must be null for status "${claim.status}"`);
    }
  }

  if (claim.supersedes !== null && !isNonEmptyString(claim.supersedes)) {
    errs.push("supersedes must be a string claim id, or null");
  }
  if (isNonEmptyString(claim.supersedes) && isNonEmptyString(claim.id) && claim.supersedes === claim.id) {
    errs.push("supersedes cannot reference the claim's own id -- a claim can't supersede itself");
  }
  if (!isNonEmptyString(claim.dependencyKey)) errs.push("dependencyKey is required");

  return { ok: errs.length === 0, errs };
}

// The natural lookup key a generator (or Phase 6's dependency-recall
// machinery) would use to find "which claim(s) apply here" -- family plus
// phase of play. This is Phase 4's own concrete interpretation of the
// spec's "dependency key" field, in the same spirit as Phase 3's
// DecisionEvaluation stub: a real, usable placeholder Phase 6 can build on,
// not a guess at Phase 6's eventual full recall design.
export function deriveDependencyKey(family, phaseOfPlay) {
  return `${family}::${phaseOfPlay}`;
}

// Two claims conflict when both are APPROVED, cover the same family+phase
// of play (the same tactical situation) FOR AT LEAST ONE SHARED AGE BAND,
// but declare different preferred reads. Per Task 3: "two approved claims
// with overlapping conditions and incompatible reads -> conflict record,
// both ineligible for generation." `conditions` is free-text prose, not
// structured predicates, so this uses family+phaseOfPlay identity as the
// honest, checkable proxy for "the same situation" rather than attempting
// unreliable text-overlap matching -- documented here as the Phase 4-level
// interpretation, same as deriveDependencyKey above. Age-band overlap is
// checked too, not just family+phaseOfPlay: the seeded claim's own source
// (docs/library/dz-breakout-retrieval-under-pressure.md's "Age framing"
// section) deliberately gives U11/U13 a different framing than U15/U18
// within the SAME family+phase -- two claims that split that framing by
// age would never actually apply to the same learner, so they must not be
// flagged as conflicting just because they share a family+phase.
// (Age-band blindness caught by both of Phase 4's independent adversarial
// reviews, 2026-07-31.) Only APPROVED claims can conflict: a draft or
// review-required claim isn't live enough to be "ineligible for generation"
// yet -- it was never eligible in the first place.
export function findConflict(claimA, claimB) {
  if (claimA.status !== CLAIM_STATUS.APPROVED || claimB.status !== CLAIM_STATUS.APPROVED) return null;
  if (claimA.family !== claimB.family || claimA.phaseOfPlay !== claimB.phaseOfPlay) return null;
  if (claimA.preferredRead?.id === claimB.preferredRead?.id) return null;
  const bandsA = claimA.ageSkillApplicability?.ageBands ?? [];
  const bandsB = claimB.ageSkillApplicability?.ageBands ?? [];
  const sharedBands = bandsA.filter((b) => bandsB.includes(b));
  if (sharedBands.length === 0) return null;
  return {
    claimAId: claimA.id,
    claimBId: claimB.id,
    family: claimA.family,
    phaseOfPlay: claimA.phaseOfPlay,
    sharedAgeBands: sharedBands,
    reason: `Both claims are approved, cover the same family ("${claimA.family}") and phase of play ("${claimA.phaseOfPlay}"), and share at least one age band (${sharedBands.join(", ")}), but declare different preferred reads (${claimA.preferredRead?.id} vs ${claimB.preferredRead?.id}) -- conflicting, both ineligible for generation until resolved.`,
  };
}
