#!/usr/bin/env node
// Run: node src/scenario-engine/tactics/claimSchema.test.mjs
import {
  validateTacticalClaim,
  findConflict,
  deriveDependencyKey,
  TACTICAL_CLAIM_SCHEMA_VERSION,
  CLAIM_STATUS,
  PROOF_MODE,
  APPROVED_REVIEWERS,
} from "./claimSchema.js";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

function validClaim(overrides = {}) {
  return {
    schemaVersion: TACTICAL_CLAIM_SCHEMA_VERSION,
    id: "claim_test_v1",
    version: 1,
    contentHash: null,
    status: CLAIM_STATUS.REVIEW_REQUIRED,
    proofMode: PROOF_MODE.KERNEL_DERIVED,
    family: "test_family",
    phaseOfPlay: "test-phase",
    ageSkillApplicability: { ageBands: ["U13"], excludedBands: [], excludedReason: "n/a" },
    observableCues: [{ id: "cue_a", description: "a real cue" }],
    conditions: ["a real condition"],
    preferredRead: { id: "read_a", description: "the right read", reasoning: "why" },
    invalidatedReads: [{ id: "read_b", description: "a wrong read", reasoning: "why not" }],
    exceptions: [],
    sources: [{ note: "docs/library/some-file.md", cite: "test cite", evidenceConfidence: "principle-level-cited" }],
    linkedKernelIds: [],
    linkedValidatorIds: [],
    approval: { approvedBy: null, approvedDate: null, reviewNotes: "test fixture" },
    supersedes: null,
    dependencyKey: deriveDependencyKey("test_family", "test-phase"),
    ...overrides,
  };
}

// ---- A valid claim passes cleanly ---------------------------------------------
{
  const result = validateTacticalClaim(validClaim());
  ok("a fully valid claim passes with zero errors", result.ok && result.errs.length === 0);
}

// ---- Required top-level fields --------------------------------------------------
ok("rejects null/non-object input", !validateTacticalClaim(null).ok && !validateTacticalClaim("x").ok);
ok("rejects a wrong schemaVersion", !validateTacticalClaim(validClaim({ schemaVersion: "wrong" })).ok);
ok("rejects a missing id", !validateTacticalClaim(validClaim({ id: "" })).ok);
ok("rejects an id not prefixed with claim_", !validateTacticalClaim(validClaim({ id: "not_prefixed_v1" })).ok);
ok("rejects a non-integer version", !validateTacticalClaim(validClaim({ version: 1.5 })).ok);
ok("rejects version 0", !validateTacticalClaim(validClaim({ version: 0 })).ok);
ok("accepts contentHash: null", validateTacticalClaim(validClaim({ contentHash: null })).ok);
ok("accepts contentHash as a string", validateTacticalClaim(validClaim({ contentHash: "abc123" })).ok);
ok("rejects contentHash as a number", !validateTacticalClaim(validClaim({ contentHash: 123 })).ok);
ok("rejects an invalid status", !validateTacticalClaim(validClaim({ status: "not-a-real-status" })).ok);
ok("rejects an invalid proofMode", !validateTacticalClaim(validClaim({ proofMode: "guessed" })).ok);
ok("rejects a missing family", !validateTacticalClaim(validClaim({ family: "" })).ok);
ok("rejects a missing phaseOfPlay", !validateTacticalClaim(validClaim({ phaseOfPlay: "" })).ok);

// ---- Age/skill applicability ---------------------------------------------------
ok("rejects empty ageBands", !validateTacticalClaim(validClaim({ ageSkillApplicability: { ageBands: [] } })).ok);
ok("rejects an unknown age band", !validateTacticalClaim(validClaim({ ageSkillApplicability: { ageBands: ["U100"] } })).ok);
ok("accepts every real age band", validateTacticalClaim(validClaim({ ageSkillApplicability: { ageBands: ["U7", "U9", "U11", "U13", "U15", "U18"] } })).ok);

// ---- Cues, conditions, reads -----------------------------------------------------
ok("rejects empty observableCues", !validateTacticalClaim(validClaim({ observableCues: [] })).ok);
ok("rejects an observableCue missing a description", !validateTacticalClaim(validClaim({ observableCues: [{ id: "x" }] })).ok);
ok("rejects empty conditions", !validateTacticalClaim(validClaim({ conditions: [] })).ok);
ok("rejects a blank-string condition", !validateTacticalClaim(validClaim({ conditions: ["  "] })).ok);
ok("rejects a preferredRead missing an id", !validateTacticalClaim(validClaim({ preferredRead: { description: "x", reasoning: "y" } })).ok);
ok("rejects a preferredRead missing reasoning", !validateTacticalClaim(validClaim({ preferredRead: { id: "x", description: "y" } })).ok);
ok("accepts an empty invalidatedReads array", validateTacticalClaim(validClaim({ invalidatedReads: [] })).ok);
ok("rejects invalidatedReads that isn't an array", !validateTacticalClaim(validClaim({ invalidatedReads: null })).ok);
ok("rejects an invalidatedRead missing reasoning", !validateTacticalClaim(validClaim({ invalidatedReads: [{ id: "x", description: "y" }] })).ok);

// ---- Sources: never unsourced ---------------------------------------------------
ok("rejects an empty sources array -- unsourced claims are never valid", !validateTacticalClaim(validClaim({ sources: [] })).ok);
ok("rejects a source missing evidenceConfidence", !validateTacticalClaim(validClaim({ sources: [{ note: "x", cite: "y" }] })).ok);

// ---- linkedKernelIds / linkedValidatorIds: shape only, not existence -----------
ok("accepts empty linkedKernelIds/linkedValidatorIds", validateTacticalClaim(validClaim({ linkedKernelIds: [], linkedValidatorIds: [] })).ok);
ok("rejects linkedKernelIds that isn't an array of strings", !validateTacticalClaim(validClaim({ linkedKernelIds: [123] })).ok);

// ---- Approval / approver allowlist ----------------------------------------------
ok("a review-required claim with a null approver is valid", validateTacticalClaim(validClaim({ status: CLAIM_STATUS.REVIEW_REQUIRED, approval: { approvedBy: null, approvedDate: null, reviewNotes: "x" } })).ok);
ok("a review-required claim with a non-null approver is rejected -- no partial approvals", !validateTacticalClaim(validClaim({ status: CLAIM_STATUS.REVIEW_REQUIRED, approval: { approvedBy: "Thomas Slifka", approvedDate: "2026-07-31", reviewNotes: "x" } })).ok);
ok("an approved claim needs a real allowlisted approver", !validateTacticalClaim(validClaim({ status: CLAIM_STATUS.APPROVED, approval: { approvedBy: null, approvedDate: null, reviewNotes: "x" } })).ok);
ok("an approved claim with an approver NOT on the allowlist is rejected", !validateTacticalClaim(validClaim({ status: CLAIM_STATUS.APPROVED, approval: { approvedBy: "Nobody In Particular", approvedDate: "2026-07-31", reviewNotes: "x" } })).ok);
ok("an approved claim with an allowlisted approver + date is valid", validateTacticalClaim(validClaim({ status: CLAIM_STATUS.APPROVED, approval: { approvedBy: "Thomas Slifka", approvedDate: "2026-07-31", reviewNotes: "x" } })).ok);
ok("a retired claim still needs a real approver on record (it WAS approved once)", !validateTacticalClaim(validClaim({ status: CLAIM_STATUS.RETIRED, approval: { approvedBy: null, approvedDate: null, reviewNotes: "x" } })).ok);
ok("a superseded claim still needs a real approver on record", !validateTacticalClaim(validClaim({ status: CLAIM_STATUS.SUPERSEDED, approval: { approvedBy: null, approvedDate: null, reviewNotes: "x" } })).ok);
ok("rejects a missing approval.reviewNotes", !validateTacticalClaim(validClaim({ approval: { approvedBy: null, approvedDate: null, reviewNotes: "" } })).ok);
ok("the reviewer allowlist is a real, non-empty list", APPROVED_REVIEWERS.length > 0 && APPROVED_REVIEWERS.includes("Thomas Slifka"));

// ---- supersedes / dependencyKey --------------------------------------------------
ok("accepts supersedes: null", validateTacticalClaim(validClaim({ supersedes: null })).ok);
ok("accepts a real supersedes string", validateTacticalClaim(validClaim({ supersedes: "claim_older_v1" })).ok);
ok("rejects a non-string, non-null supersedes", !validateTacticalClaim(validClaim({ supersedes: 42 })).ok);
ok("rejects a claim that supersedes its own id", !validateTacticalClaim(validClaim({ id: "claim_self_v1", supersedes: "claim_self_v1" })).ok);
ok("rejects a missing dependencyKey", !validateTacticalClaim(validClaim({ dependencyKey: "" })).ok);

// ---- deriveDependencyKey ---------------------------------------------------------
ok("deriveDependencyKey combines family and phaseOfPlay deterministically", deriveDependencyKey("dz_breakout", "defensive-zone-retrieval") === "dz_breakout::defensive-zone-retrieval");
ok("deriveDependencyKey is stable across repeated calls", deriveDependencyKey("a", "b") === deriveDependencyKey("a", "b"));
ok("deriveDependencyKey differs for a different family", deriveDependencyKey("a", "b") !== deriveDependencyKey("c", "b"));

// ---- findConflict -----------------------------------------------------------------
{
  const approvedA = validClaim({ id: "claim_a_v1", status: CLAIM_STATUS.APPROVED, family: "f", phaseOfPlay: "p", dependencyKey: deriveDependencyKey("f", "p"), preferredRead: { id: "left", description: "x", reasoning: "y" }, approval: { approvedBy: "Thomas Slifka", approvedDate: "2026-07-31", reviewNotes: "x" } });
  const approvedBDifferentRead = validClaim({ id: "claim_b_v1", status: CLAIM_STATUS.APPROVED, family: "f", phaseOfPlay: "p", dependencyKey: deriveDependencyKey("f", "p"), preferredRead: { id: "right", description: "x", reasoning: "y" }, approval: { approvedBy: "Thomas Slifka", approvedDate: "2026-07-31", reviewNotes: "x" } });
  const approvedBSameRead = validClaim({ id: "claim_c_v1", status: CLAIM_STATUS.APPROVED, family: "f", phaseOfPlay: "p", dependencyKey: deriveDependencyKey("f", "p"), preferredRead: { id: "left", description: "x", reasoning: "y" }, approval: { approvedBy: "Thomas Slifka", approvedDate: "2026-07-31", reviewNotes: "x" } });
  const draftB = validClaim({ id: "claim_d_v1", status: CLAIM_STATUS.REVIEW_REQUIRED, family: "f", phaseOfPlay: "p", dependencyKey: deriveDependencyKey("f", "p"), preferredRead: { id: "right", description: "x", reasoning: "y" } });
  const differentFamily = validClaim({ id: "claim_e_v1", status: CLAIM_STATUS.APPROVED, family: "other_f", phaseOfPlay: "p", dependencyKey: deriveDependencyKey("other_f", "p"), preferredRead: { id: "right", description: "x", reasoning: "y" }, approval: { approvedBy: "Thomas Slifka", approvedDate: "2026-07-31", reviewNotes: "x" } });
  // Same family+phase, but DISJOINT age bands -- an intentional
  // age-differentiated split (e.g. U11/U13 gets one framing, U15/U18 gets
  // a more advanced one), never actually applies to the same learner, and
  // must not be flagged as conflicting just because it shares a
  // family+phase. (Both of Phase 4's independent adversarial reviews found
  // findConflict originally ignored ageBands entirely, 2026-07-31.)
  const youngBand = validClaim({ id: "claim_young_v1", status: CLAIM_STATUS.APPROVED, family: "f", phaseOfPlay: "p", dependencyKey: deriveDependencyKey("f", "p"), ageSkillApplicability: { ageBands: ["U11", "U13"], excludedBands: [], excludedReason: "n/a" }, preferredRead: { id: "simple", description: "x", reasoning: "y" }, approval: { approvedBy: "Thomas Slifka", approvedDate: "2026-07-31", reviewNotes: "x" } });
  const oldBand = validClaim({ id: "claim_old_v1", status: CLAIM_STATUS.APPROVED, family: "f", phaseOfPlay: "p", dependencyKey: deriveDependencyKey("f", "p"), ageSkillApplicability: { ageBands: ["U15", "U18"], excludedBands: [], excludedReason: "n/a" }, preferredRead: { id: "advanced", description: "x", reasoning: "y" }, approval: { approvedBy: "Thomas Slifka", approvedDate: "2026-07-31", reviewNotes: "x" } });
  const overlappingBand = validClaim({ id: "claim_overlap_v1", status: CLAIM_STATUS.APPROVED, family: "f", phaseOfPlay: "p", dependencyKey: deriveDependencyKey("f", "p"), ageSkillApplicability: { ageBands: ["U13", "U15"], excludedBands: [], excludedReason: "n/a" }, preferredRead: { id: "other", description: "x", reasoning: "y" }, approval: { approvedBy: "Thomas Slifka", approvedDate: "2026-07-31", reviewNotes: "x" } });

  ok("two approved claims, same situation, different reads: conflict", findConflict(approvedA, approvedBDifferentRead) !== null);
  ok("two approved claims, same situation, same read: no conflict", findConflict(approvedA, approvedBSameRead) === null);
  ok("one approved + one non-approved: no conflict (not live yet)", findConflict(approvedA, draftB) === null);
  ok("two approved claims covering different situations: no conflict", findConflict(approvedA, differentFamily) === null);
  ok("a conflict record names both claim ids and explains why", findConflict(approvedA, approvedBDifferentRead).claimAId === "claim_a_v1" && findConflict(approvedA, approvedBDifferentRead).claimBId === "claim_b_v1" && findConflict(approvedA, approvedBDifferentRead).reason.length > 0);
  ok("two approved claims with DISJOINT age bands: no conflict (intentional age split)", findConflict(youngBand, oldBand) === null);
  ok("two approved claims with an OVERLAPPING age band: conflict", findConflict(youngBand, overlappingBand) !== null);
  ok("a disjoint-age-band conflict record (if it existed) would list shared bands -- confirm overlap case does", findConflict(youngBand, overlappingBand).sharedAgeBands.includes("U13"));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
