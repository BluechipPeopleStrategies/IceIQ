// The dependency index, per Phase 6 Task 4: "maps each promoted artifact
// version to its tactical claim, physics profile, kernel/template,
// renderer, rubric/judge stack, promotion-policy version, calibration-
// corpus version, source versions." A single aggregated, content-addressed
// JSON file (docs/factory/dependency-index.json) -- Task 5's recall needs
// to scan across every promoted item's dependencies to find what's
// affected by a change, which a single loadable index supports directly;
// per-artifact files would need a directory scan for the same query.
//
// This module only builds/reads/writes RECORDS; it doesn't decide
// promotion eligibility (dependencyRecord.js is purely descriptive of
// what a promoted artifact actually depends on) or run any gates itself.

import { existsSync, readFileSync, writeFileSync } from "node:fs";

export const DEPENDENCY_INDEX_SCHEMA_VERSION = "dependency-index-v1";

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

// Builds one dependency record from the real artifacts that produced a
// promoted item -- every field is read from an actual object already in
// hand (the ScenarioDefinition, its SimulationTrace, its judgment record),
// never invented or assumed.
export function buildDependencyRecord({ definition, trace, judgmentRecord, promotionPolicyVersion, rendererVersion }) {
  return Object.freeze({
    artifactId: definition.id,
    artifactVersion: definition.version,
    tacticalClaim: definition.tacticalClaimVersion,
    physicsProfile: trace.physicsProfileId,
    kernelOrTemplate: definition.generationParams ? "kernel-generated" : "hand-authored",
    rendererVersion,
    judgeStack: {
      provider: judgmentRecord.provider,
      model: judgmentRecord.model,
      gateId: judgmentRecord.gateId,
    },
    promotionPolicyVersion,
    calibrationCorpusVersion: judgmentRecord.calibrationCorpusVersion,
    sourceVersions: definition.dependencyVersions,
  });
}

export function validateDependencyRecord(record) {
  const errs = [];
  if (!record || typeof record !== "object") return { ok: false, errs: ["record must be an object"] };
  if (!isNonEmptyString(record.artifactId)) errs.push("artifactId is required");
  if (!Number.isInteger(record.artifactVersion) || record.artifactVersion < 1) errs.push("artifactVersion must be a positive integer");
  if (record.tacticalClaim !== null && !isNonEmptyString(record.tacticalClaim)) errs.push("tacticalClaim must be a string or null");
  if (!isNonEmptyString(record.physicsProfile)) errs.push("physicsProfile is required");
  if (!["kernel-generated", "hand-authored"].includes(record.kernelOrTemplate)) errs.push("kernelOrTemplate must be kernel-generated or hand-authored");
  if (!isNonEmptyString(record.rendererVersion)) errs.push("rendererVersion is required");
  if (!record.judgeStack || !isNonEmptyString(record.judgeStack.provider) || !isNonEmptyString(record.judgeStack.gateId)) errs.push("judgeStack.provider and judgeStack.gateId are required");
  if (!Number.isInteger(record.promotionPolicyVersion) || record.promotionPolicyVersion < 1) errs.push("promotionPolicyVersion must be a positive integer");
  if (record.calibrationCorpusVersion !== null && !isNonEmptyString(record.calibrationCorpusVersion)) errs.push("calibrationCorpusVersion must be a string or null");
  if (!record.sourceVersions || typeof record.sourceVersions !== "object") errs.push("sourceVersions is required");
  return { ok: errs.length === 0, errs };
}

export function loadDependencyIndex(indexPath) {
  if (!existsSync(indexPath)) {
    return { schemaVersion: DEPENDENCY_INDEX_SCHEMA_VERSION, entries: [] };
  }
  return JSON.parse(readFileSync(indexPath, "utf8"));
}

export function saveDependencyIndex(indexPath, index) {
  writeFileSync(indexPath, JSON.stringify(index, null, 2) + "\n");
}

// Adds an artifact's dependency record, keyed on artifactId+artifactVersion.
// Re-adding IDENTICAL content for an existing artifactId+version is a
// genuine no-op (idempotent). Re-adding DIFFERENT content under the SAME
// identity throws rather than silently overwriting -- an artifactId+
// version is supposed to be an immutable identity once indexed (a real
// change belongs under a new version), and recall.js's own
// findAffectedByDependencyChange trusts this index's field values to
// decide what must be recalled; a silently-corrupted entry would make a
// later legitimate recall miss or misidentify the affected item. Matches
// promotedArtifact.js's own identical-identity-different-content-throws
// rule for the same class of content. (Caught by Phase 6's adversarial
// review, 2026-07-31 -- the first version silently replaced on any
// upsert, with no conflict check at all.)
export function upsertDependencyRecord(index, record) {
  const existing = index.entries.find((e) => e.artifactId === record.artifactId && e.artifactVersion === record.artifactVersion);
  if (existing) {
    if (JSON.stringify(existing) === JSON.stringify(record)) {
      return index; // identical content -- genuine no-op
    }
    throw new Error(`upsertDependencyRecord: ${record.artifactId}@v${record.artifactVersion} already exists in the index with DIFFERENT content -- refusing to silently overwrite. A real change belongs under a new artifactVersion.`);
  }
  return { ...index, entries: [...index.entries, record] };
}

export function findDependencyRecord(index, artifactId, artifactVersion) {
  return index.entries.find((e) => e.artifactId === artifactId && e.artifactVersion === artifactVersion) ?? null;
}
