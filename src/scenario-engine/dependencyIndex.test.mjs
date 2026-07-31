#!/usr/bin/env node
// Run: node src/scenario-engine/dependencyIndex.test.mjs
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import {
  buildDependencyRecord, validateDependencyRecord, loadDependencyIndex,
  saveDependencyIndex, upsertDependencyRecord, findDependencyRecord,
  DEPENDENCY_INDEX_SCHEMA_VERSION,
} from "./dependencyIndex.js";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };
const throwsSync = (fn) => { try { fn(); return false; } catch { return true; } };

const SCRATCH_PATH = join(new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]):/, "$1:"), "_dependencyIndex_test_scratch.json");

function fakeDefinition(overrides = {}) {
  return {
    id: "sd_test_v1", version: 1,
    tacticalClaimVersion: "claim_test_v1@v1",
    generationParams: null,
    dependencyVersions: { rinkFrame: "rink-frame-v1", physicsProfile: "physics-u13-v1" },
    ...overrides,
  };
}
function fakeTrace(overrides = {}) {
  return { physicsProfileId: "physics-u13-v1", ...overrides };
}
function fakeJudgmentRecord(overrides = {}) {
  return { provider: "anthropic-claude-code-attended-session", model: "claude-sonnet-5", gateId: "gate8-hockey-judgment", calibrationCorpusVersion: null, ...overrides };
}

// ---- buildDependencyRecord: real fields, nothing invented -----------------------
{
  const record = buildDependencyRecord({ definition: fakeDefinition(), trace: fakeTrace(), judgmentRecord: fakeJudgmentRecord(), promotionPolicyVersion: 1, rendererVersion: "compiled-teaching-play-v1" });
  ok("carries the real artifactId/version from the definition", record.artifactId === "sd_test_v1" && record.artifactVersion === 1);
  ok("carries the real tactical claim reference", record.tacticalClaim === "claim_test_v1@v1");
  ok("carries the real physics profile id from the trace", record.physicsProfile === "physics-u13-v1");
  ok("hand-authored (generationParams: null) is correctly classified", record.kernelOrTemplate === "hand-authored");
  ok("carries the real judge stack info", record.judgeStack.provider === "anthropic-claude-code-attended-session" && record.judgeStack.model === "claude-sonnet-5");
  ok("carries the real sourceVersions object from the definition", record.sourceVersions.rinkFrame === "rink-frame-v1");
  ok("a genuinely valid record passes validation", validateDependencyRecord(record).ok);

  const kernelRecord = buildDependencyRecord({ definition: fakeDefinition({ generationParams: { seed: 1 } }), trace: fakeTrace(), judgmentRecord: fakeJudgmentRecord(), promotionPolicyVersion: 1, rendererVersion: "v1" });
  ok("a definition WITH generationParams is correctly classified kernel-generated", kernelRecord.kernelOrTemplate === "kernel-generated");
}

// ---- validateDependencyRecord: shape checks --------------------------------------
ok("rejects null input", !validateDependencyRecord(null).ok);
ok("rejects a missing artifactId", !validateDependencyRecord(buildDependencyRecord({ definition: fakeDefinition({ id: "" }), trace: fakeTrace(), judgmentRecord: fakeJudgmentRecord(), promotionPolicyVersion: 1, rendererVersion: "v1" })).ok);
ok("rejects a missing physicsProfile", !validateDependencyRecord(buildDependencyRecord({ definition: fakeDefinition(), trace: fakeTrace({ physicsProfileId: undefined }), judgmentRecord: fakeJudgmentRecord(), promotionPolicyVersion: 1, rendererVersion: "v1" })).ok);
ok("accepts a null tacticalClaim (no Phase 4 claim exists for this family)", validateDependencyRecord(buildDependencyRecord({ definition: fakeDefinition({ tacticalClaimVersion: null }), trace: fakeTrace(), judgmentRecord: fakeJudgmentRecord(), promotionPolicyVersion: 1, rendererVersion: "v1" })).ok);
ok("accepts a null calibrationCorpusVersion (none exists yet)", validateDependencyRecord(buildDependencyRecord({ definition: fakeDefinition(), trace: fakeTrace(), judgmentRecord: fakeJudgmentRecord({ calibrationCorpusVersion: null }), promotionPolicyVersion: 1, rendererVersion: "v1" })).ok);

// ---- load/save/upsert/find round-trip, idempotent upsert -------------------------
{
  if (existsSync(SCRATCH_PATH)) rmSync(SCRATCH_PATH, { force: true });

  const empty = loadDependencyIndex(SCRATCH_PATH);
  ok("loading a nonexistent index returns a fresh, empty, correctly-versioned index", empty.schemaVersion === DEPENDENCY_INDEX_SCHEMA_VERSION && empty.entries.length === 0);

  const recordA = buildDependencyRecord({ definition: fakeDefinition({ id: "sd_a_v1" }), trace: fakeTrace(), judgmentRecord: fakeJudgmentRecord(), promotionPolicyVersion: 1, rendererVersion: "v1" });
  const recordB = buildDependencyRecord({ definition: fakeDefinition({ id: "sd_b_v1" }), trace: fakeTrace(), judgmentRecord: fakeJudgmentRecord(), promotionPolicyVersion: 1, rendererVersion: "v1" });

  let index = upsertDependencyRecord(empty, recordA);
  index = upsertDependencyRecord(index, recordB);
  ok("upsert adds new entries", index.entries.length === 2);

  saveDependencyIndex(SCRATCH_PATH, index);
  ok("saveDependencyIndex writes the file", existsSync(SCRATCH_PATH));

  const reloaded = loadDependencyIndex(SCRATCH_PATH);
  ok("reloading the saved index round-trips both entries", reloaded.entries.length === 2);

  ok("findDependencyRecord finds an existing entry", findDependencyRecord(reloaded, "sd_a_v1", 1).artifactId === "sd_a_v1");
  ok("findDependencyRecord returns null for an unknown artifact", findDependencyRecord(reloaded, "sd_nonexistent", 1) === null);

  // Idempotent upsert: re-adding IDENTICAL content for the same
  // artifactId+version is a genuine no-op, never a duplicate.
  const identicalRecordA = buildDependencyRecord({ definition: fakeDefinition({ id: "sd_a_v1" }), trace: fakeTrace(), judgmentRecord: fakeJudgmentRecord(), promotionPolicyVersion: 1, rendererVersion: "v1" });
  const reupsertedIdentical = upsertDependencyRecord(reloaded, identicalRecordA);
  ok("upserting IDENTICAL content for the same artifactId+version is a genuine no-op, not a duplicate", reupsertedIdentical.entries.length === 2);

  // EXIT GATE FIX: re-adding DIFFERENT content under the SAME identity
  // must throw, never silently overwrite -- matches promotedArtifact.js's
  // own conflict rule. (Caught by Phase 6's adversarial review, 2026-07-31
  // -- the first version silently replaced with no conflict check at all.)
  const conflictingRecordA = buildDependencyRecord({ definition: fakeDefinition({ id: "sd_a_v1", tacticalClaimVersion: "claim_updated_v2@v2" }), trace: fakeTrace(), judgmentRecord: fakeJudgmentRecord(), promotionPolicyVersion: 2, rendererVersion: "v1" });
  ok("EXIT GATE: upserting DIFFERENT content under the same artifactId+version throws, never silently overwrites", throwsSync(() => upsertDependencyRecord(reloaded, conflictingRecordA)));
  ok("the ORIGINAL entry is untouched after the rejected conflicting upsert", findDependencyRecord(reloaded, "sd_a_v1", 1).tacticalClaim === "claim_test_v1@v1");

  rmSync(SCRATCH_PATH, { force: true });
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
