// npm run test:tactics
// Validates the factory-only tactical claims store (docs/factory/tactics/claims/,
// outside src/ per framework-fit decision 3) and regenerates
// docs/factory/tactics/index.json. Per Phase 4 Task 3: schema validation,
// source-reference validity, status/approval-role checks, version-lineage
// integrity, hash stability, conflict detection, and linked-validator
// existence -- plus a battery of deliberately-broken in-memory fixtures that
// must be correctly rejected, matching the exit gate's explicit requirement.
//
// The per-claim checks below (sourcesExistOnDisk, linkedKernelIdsExist,
// linkedValidatorIdsExist, supersedeLineageIsCoherent) are extracted as
// named functions and reused by BOTH the real-store tests and the
// deliberately-broken-fixture tests, so a fixture test proves the real
// validation logic rejects bad input, not just that the fixture itself
// looks bad in isolation. (Caught by Phase 4's adversarial review,
// 2026-07-31 -- the first version's fixture tests re-derived the same
// primitive checks independently and would have kept passing even if the
// real per-claim checks above were silently broken.)

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  validateTacticalClaim,
  findConflict,
  deriveDependencyKey,
  TACTICAL_CLAIM_SCHEMA_VERSION,
  CLAIM_STATUS,
  PROOF_MODE,
  APPROVED_REVIEWERS,
} from "../src/scenario-engine/tactics/claimSchema.js";
import { contentHash } from "../src/scenario-engine/canonicalHash.js";
import * as hardFailureDetectors from "../src/scenario-engine/physics/hardFailureDetectors.js";
// NOT playById() -- it has a silent "|| CORE_ANIMATED_PLAYS[0]" rendering
// fallback for unknown ids (never crash the live renderer on a bad id), so
// it can never report "this id doesn't exist." A real existence check needs
// ALL_ANIMATED_PLAYS directly. (Caught by running this script: the first
// version used playById() and a "does not exist" test silently matched an
// unrelated real play instead of failing.)
import { ALL_ANIMATED_PLAYS } from "../src/play/playCatalog.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const CLAIMS_DIR = join(REPO_ROOT, "docs", "factory", "tactics", "claims");
const INDEX_PATH = join(REPO_ROOT, "docs", "factory", "tactics", "index.json");

function loadClaims() {
  return readdirSync(CLAIMS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({ file: f, claim: JSON.parse(readFileSync(join(CLAIMS_DIR, f), "utf8")) }));
}

// ---- Reusable per-claim checks (shared by real-store and fixture tests) ------

function sourcesExistOnDisk(claim) {
  return (claim.sources || []).every((s) => existsSync(join(REPO_ROOT, s.note)));
}

function linkedKernelIdsExist(claim) {
  return (claim.linkedKernelIds || []).every((id) => ALL_ANIMATED_PLAYS.some((p) => p.id === id));
}

function linkedValidatorIdsExist(claim) {
  return (claim.linkedValidatorIds || []).every((id) => typeof hardFailureDetectors[id] === "function");
}

function claimIdsAreUnique(loaded) {
  const ids = loaded.map(({ claim }) => claim.id);
  return new Set(ids).size === ids.length;
}

// Version-lineage integrity (Task 3): a supersedes reference must point to
// a real prior claim (self-reference is already rejected by
// validateTacticalClaim's own schema check), AND that lineage must actually
// make sense -- the superseding claim's version must be strictly greater,
// family/phaseOfPlay must match (a claim can't "supersede" an unrelated
// claim), and the superseded claim's own status must actually reflect
// being superseded/retired, not still draft/review-required/approved.
function supersedeLineageIsCoherent(claim, loaded) {
  if (claim.supersedes === null) return { ok: true, reason: null };
  const target = loaded.find((c) => c.claim.id === claim.supersedes)?.claim;
  if (!target) return { ok: false, reason: `supersedes references ${claim.supersedes}, which isn't in the store` };
  if (!(claim.version > target.version)) {
    return { ok: false, reason: `version (${claim.version}) must be greater than the superseded claim's version (${target.version})` };
  }
  if (claim.family !== target.family || claim.phaseOfPlay !== target.phaseOfPlay) {
    return { ok: false, reason: `family/phaseOfPlay must match the superseded claim (this: ${claim.family}/${claim.phaseOfPlay}, superseded: ${target.family}/${target.phaseOfPlay})` };
  }
  if (![CLAIM_STATUS.SUPERSEDED, CLAIM_STATUS.RETIRED].includes(target.status)) {
    return { ok: false, reason: `the superseded claim (${target.id}) must itself be marked superseded or retired, not "${target.status}"` };
  }
  return { ok: true, reason: null };
}

function validMinimalClaim(overrides = {}) {
  return {
    schemaVersion: TACTICAL_CLAIM_SCHEMA_VERSION,
    id: "claim_test_fixture_v1",
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
    sources: [{ note: "docs/library/dz-breakout-retrieval-under-pressure.md", cite: "test cite", evidenceConfidence: "principle-level-cited" }],
    linkedKernelIds: [],
    linkedValidatorIds: [],
    approval: { approvedBy: null, approvedDate: null, reviewNotes: "test fixture" },
    supersedes: null,
    dependencyKey: deriveDependencyKey("test_family", "test-phase"),
    ...overrides,
  };
}

// ---- The real seeded claim set: must be fully valid --------------------------
describe("seeded tactical claims store", () => {
  const loaded = loadClaims();

  it("has at least one seeded claim", () => {
    assert.equal(loaded.length >= 1, true);
  });

  it("every claim id is unique across the store", () => {
    assert.equal(claimIdsAreUnique(loaded), true);
  });

  for (const { file, claim } of loaded) {
    it(`${file}: passes schema validation`, () => {
      const result = validateTacticalClaim(claim);
      assert.deepEqual(result.errs, []);
      assert.equal(result.ok, true);
    });

    it(`${file}: every source reference file actually exists on disk`, () => {
      assert.equal(sourcesExistOnDisk(claim), true);
    });

    it(`${file}: is not self-approved (no claim in this plan is pre-approved on Thomas's behalf)`, () => {
      assert.equal(claim.approval.approvedBy, null);
      assert.notEqual(claim.status, CLAIM_STATUS.APPROVED);
    });

    it(`${file}: content hash is stable (recomputes to the same value)`, async () => {
      const { contentHash: declaredHash, ...rest } = claim;
      const recomputed = await contentHash(rest);
      assert.equal(declaredHash, recomputed, "declared contentHash does not match a fresh recompute -- claim was edited without recomputing its hash");
    });

    it(`${file}: dependencyKey matches family+phaseOfPlay`, () => {
      assert.equal(claim.dependencyKey, deriveDependencyKey(claim.family, claim.phaseOfPlay));
    });

    it(`${file}: every linkedKernelId resolves to a real catalog play`, () => {
      assert.equal(linkedKernelIdsExist(claim), true);
    });

    it(`${file}: every linkedValidatorId resolves to a real exported detector`, () => {
      assert.equal(linkedValidatorIdsExist(claim), true);
    });

    it(`${file}: supersedes lineage (if set) is coherent`, () => {
      const result = supersedeLineageIsCoherent(claim, loaded);
      assert.equal(result.ok, true, result.reason);
    });
  }

  it("no two approved claims conflict (same family+phaseOfPlay+overlapping age bands, different preferred reads)", () => {
    const claims = loaded.map((c) => c.claim);
    for (let i = 0; i < claims.length; i++) {
      for (let j = i + 1; j < claims.length; j++) {
        assert.equal(findConflict(claims[i], claims[j]), null, `${claims[i].id} conflicts with ${claims[j].id}`);
      }
    }
  });

  it("generates docs/factory/tactics/index.json from the current store", () => {
    const index = {
      schemaVersion: TACTICAL_CLAIM_SCHEMA_VERSION,
      generatedFrom: "scripts/test-tactics.mjs",
      claims: loaded.map(({ claim }) => ({
        id: claim.id,
        version: claim.version,
        status: claim.status,
        family: claim.family,
        phaseOfPlay: claim.phaseOfPlay,
        dependencyKey: claim.dependencyKey,
        contentHash: claim.contentHash,
      })),
    };
    writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2) + "\n");
    assert.equal(existsSync(INDEX_PATH), true);
  });
});

// ---- Deliberately-broken fixtures: must be correctly rejected ----------------
describe("deliberately-broken claim fixtures are rejected", () => {
  it("rejects a claim with a bad (nonexistent) source reference file", () => {
    const claim = validMinimalClaim({ sources: [{ note: "docs/library/this-file-does-not-exist.md", cite: "fake", evidenceConfidence: "engineering-estimate" }] });
    assert.equal(validateTacticalClaim(claim).ok, true, "shape is still valid -- the file-existence check is this script's job, not the shape validator's");
    assert.equal(sourcesExistOnDisk(claim), false);
  });

  it("rejects an approved claim with no approver", () => {
    const claim = validMinimalClaim({ status: CLAIM_STATUS.APPROVED, approval: { approvedBy: null, approvedDate: null, reviewNotes: "test" } });
    const result = validateTacticalClaim(claim);
    assert.equal(result.ok, false);
    assert.equal(result.errs.some((e) => e.includes("approvedBy")), true);
  });

  it("rejects an approved claim with an approver not on the allowlist", () => {
    const claim = validMinimalClaim({ status: CLAIM_STATUS.APPROVED, approval: { approvedBy: "Some Random Person", approvedDate: "2026-07-31", reviewNotes: "test" } });
    assert.equal(APPROVED_REVIEWERS.includes("Some Random Person"), false);
    const result = validateTacticalClaim(claim);
    assert.equal(result.ok, false);
    assert.equal(result.errs.some((e) => e.includes("allowlisted reviewers")), true);
  });

  it("rejects a draft/review-required claim that carries a partial approval", () => {
    const claim = validMinimalClaim({ status: CLAIM_STATUS.REVIEW_REQUIRED, approval: { approvedBy: "Thomas Slifka", approvedDate: "2026-07-31", reviewNotes: "test" } });
    const result = validateTacticalClaim(claim);
    assert.equal(result.ok, false);
    assert.equal(result.errs.some((e) => e.includes("must be null")), true);
  });

  it("rejects a claim with an unsourced (empty sources array) claim", () => {
    const claim = validMinimalClaim({ sources: [] });
    const result = validateTacticalClaim(claim);
    assert.equal(result.ok, false);
    assert.equal(result.errs.some((e) => e.includes("sources")), true);
  });

  it("rejects a claim that supersedes its own id", () => {
    const claim = validMinimalClaim({ id: "claim_self_v1", supersedes: "claim_self_v1" });
    const result = validateTacticalClaim(claim);
    assert.equal(result.ok, false);
    assert.equal(result.errs.some((e) => e.includes("supersede itself")), true);
  });

  it("rejects a store with two claims sharing the same id", () => {
    const fakeLoaded = [
      { file: "a.json", claim: validMinimalClaim({ id: "claim_dupe_v1" }) },
      { file: "b.json", claim: validMinimalClaim({ id: "claim_dupe_v1" }) },
    ];
    assert.equal(claimIdsAreUnique(fakeLoaded), false);
  });

  it("accepts a store where every claim id is genuinely unique", () => {
    const fakeLoaded = [
      { file: "a.json", claim: validMinimalClaim({ id: "claim_a_v1" }) },
      { file: "b.json", claim: validMinimalClaim({ id: "claim_b_v1" }) },
    ];
    assert.equal(claimIdsAreUnique(fakeLoaded), true);
  });

  it("detects a genuinely conflicting pair of approved claims (same family/phase/age band, different reads)", () => {
    const base = { family: "conflict_family", phaseOfPlay: "conflict-phase", dependencyKey: deriveDependencyKey("conflict_family", "conflict-phase"), status: CLAIM_STATUS.APPROVED, ageSkillApplicability: { ageBands: ["U13"], excludedBands: [], excludedReason: "n/a" }, approval: { approvedBy: "Thomas Slifka", approvedDate: "2026-07-31", reviewNotes: "test" } };
    const claimA = validMinimalClaim({ ...base, id: "claim_conflict_a_v1", preferredRead: { id: "go_left", description: "go left", reasoning: "why" } });
    const claimB = validMinimalClaim({ ...base, id: "claim_conflict_b_v1", preferredRead: { id: "go_right", description: "go right", reasoning: "why not" } });
    const conflict = findConflict(claimA, claimB);
    assert.notEqual(conflict, null);
    assert.equal(conflict.claimAId, "claim_conflict_a_v1");
    assert.equal(conflict.claimBId, "claim_conflict_b_v1");
  });

  it("does NOT flag two approved claims with disjoint age bands as conflicting (an intentional age-differentiated split)", () => {
    const base = { family: "conflict_family", phaseOfPlay: "conflict-phase", dependencyKey: deriveDependencyKey("conflict_family", "conflict-phase"), status: CLAIM_STATUS.APPROVED, approval: { approvedBy: "Thomas Slifka", approvedDate: "2026-07-31", reviewNotes: "test" } };
    const claimA = validMinimalClaim({ ...base, id: "claim_young_v1", ageSkillApplicability: { ageBands: ["U11", "U13"], excludedBands: [], excludedReason: "n/a" }, preferredRead: { id: "simple_read", description: "simple", reasoning: "why" } });
    const claimB = validMinimalClaim({ ...base, id: "claim_old_v1", ageSkillApplicability: { ageBands: ["U15", "U18"], excludedBands: [], excludedReason: "n/a" }, preferredRead: { id: "advanced_read", description: "advanced", reasoning: "why not" } });
    assert.equal(findConflict(claimA, claimB), null);
  });

  it("does NOT flag two non-approved claims with different reads as conflicting (they aren't live yet)", () => {
    const base = { family: "conflict_family", phaseOfPlay: "conflict-phase", dependencyKey: deriveDependencyKey("conflict_family", "conflict-phase"), status: CLAIM_STATUS.REVIEW_REQUIRED };
    const claimA = validMinimalClaim({ ...base, id: "claim_conflict_a_v1", preferredRead: { id: "go_left", description: "go left", reasoning: "why" } });
    const claimB = validMinimalClaim({ ...base, id: "claim_conflict_b_v1", preferredRead: { id: "go_right", description: "go right", reasoning: "why not" } });
    assert.equal(findConflict(claimA, claimB), null);
  });

  it("does NOT flag two approved claims covering different situations as conflicting", () => {
    const claimA = validMinimalClaim({ id: "claim_a_v1", family: "family_a", phaseOfPlay: "phase_a", dependencyKey: deriveDependencyKey("family_a", "phase_a"), status: CLAIM_STATUS.APPROVED, approval: { approvedBy: "Thomas Slifka", approvedDate: "2026-07-31", reviewNotes: "test" }, preferredRead: { id: "go_left", description: "go left", reasoning: "why" } });
    const claimB = validMinimalClaim({ id: "claim_b_v1", family: "family_b", phaseOfPlay: "phase_b", dependencyKey: deriveDependencyKey("family_b", "phase_b"), status: CLAIM_STATUS.APPROVED, approval: { approvedBy: "Thomas Slifka", approvedDate: "2026-07-31", reviewNotes: "test" }, preferredRead: { id: "go_right", description: "go right", reasoning: "why not" } });
    assert.equal(findConflict(claimA, claimB), null);
  });

  it("rejects a claim referencing a linkedKernelId that doesn't exist in the catalog", () => {
    const claim = validMinimalClaim({ linkedKernelIds: ["play_this_does_not_exist_v1"] });
    assert.equal(validateTacticalClaim(claim).ok, true, "shape is still valid -- catalog existence is this script's job");
    assert.equal(linkedKernelIdsExist(claim), false);
  });

  it("rejects a claim referencing a linkedValidatorId that doesn't exist", () => {
    const claim = validMinimalClaim({ linkedValidatorIds: ["detectSomethingThatIsNotReal"] });
    assert.equal(linkedValidatorIdsExist(claim), false);
  });

  it("rejects incoherent supersede lineage: version not actually increased", () => {
    const target = validMinimalClaim({ id: "claim_old_v1", version: 2, status: CLAIM_STATUS.SUPERSEDED, approval: { approvedBy: "Thomas Slifka", approvedDate: "2026-07-31", reviewNotes: "x" } });
    const claim = validMinimalClaim({ id: "claim_new_v1", version: 1, supersedes: "claim_old_v1" });
    const loaded = [{ file: "old.json", claim: target }, { file: "new.json", claim }];
    assert.equal(supersedeLineageIsCoherent(claim, loaded).ok, false);
  });

  it("rejects incoherent supersede lineage: family/phaseOfPlay don't match", () => {
    const target = validMinimalClaim({ id: "claim_old_v1", version: 1, family: "family_a", status: CLAIM_STATUS.SUPERSEDED, approval: { approvedBy: "Thomas Slifka", approvedDate: "2026-07-31", reviewNotes: "x" } });
    const claim = validMinimalClaim({ id: "claim_new_v1", version: 2, family: "unrelated_family", supersedes: "claim_old_v1" });
    const loaded = [{ file: "old.json", claim: target }, { file: "new.json", claim }];
    assert.equal(supersedeLineageIsCoherent(claim, loaded).ok, false);
  });

  it("rejects incoherent supersede lineage: superseded claim's own status was never flipped", () => {
    const target = validMinimalClaim({ id: "claim_old_v1", version: 1, status: CLAIM_STATUS.REVIEW_REQUIRED });
    const claim = validMinimalClaim({ id: "claim_new_v1", version: 2, supersedes: "claim_old_v1" });
    const loaded = [{ file: "old.json", claim: target }, { file: "new.json", claim }];
    assert.equal(supersedeLineageIsCoherent(claim, loaded).ok, false);
  });

  it("accepts a genuinely coherent supersede lineage", () => {
    const target = validMinimalClaim({ id: "claim_old_v1", version: 1, status: CLAIM_STATUS.SUPERSEDED, approval: { approvedBy: "Thomas Slifka", approvedDate: "2026-07-31", reviewNotes: "x" } });
    const claim = validMinimalClaim({ id: "claim_new_v1", version: 2, supersedes: "claim_old_v1" });
    const loaded = [{ file: "old.json", claim: target }, { file: "new.json", claim }];
    assert.equal(supersedeLineageIsCoherent(claim, loaded).ok, true);
  });
});
