// Dependency-based recall, per Phase 6 Task 5: "given a changed/retired
// dependency, enumerate every affected promoted item and produce a
// reviewable removal/rollback patch touching only affected items." This
// module only FINDS what's affected and BUILDS the reviewable patch
// object -- it never applies a state transition itself. Applying a recall
// (moving an affected artifact's own state to "recalled" via
// stateMachine.js's appendStateTransition) is a separate, explicit step
// for whoever orchestrates the recall, matching the same "generated,
// reviewable diff, not a silent direct write" discipline
// scripts/promote-scenario.mjs follows for promotion.

export const RECALL_PATCH_SCHEMA_VERSION = "recall-patch-v1";

function getByPath(record, path) {
  return path.split(".").reduce((obj, key) => (obj === null || obj === undefined ? undefined : obj[key]), record);
}

// dependencyPath: a dot-path into a dependencyIndex record, e.g.
// "physicsProfile", "tacticalClaim", "sourceVersions.rinkFrame". Returns
// every entry whose value at that path equals oldVersion -- and ONLY
// those; an entry with a different value (even a different version of the
// SAME dependency TYPE) is correctly left untouched.
export function findAffectedByDependencyChange(index, dependencyPath, oldVersion) {
  return index.entries.filter((e) => getByPath(e, dependencyPath) === oldVersion);
}

export function buildRecallPatch(affectedRecords, dependencyPath, oldVersion, newVersion, reason) {
  return Object.freeze({
    schemaVersion: RECALL_PATCH_SCHEMA_VERSION,
    dependencyPath,
    oldVersion,
    newVersion,
    reason,
    affectedArtifacts: affectedRecords.map((r) => ({ artifactId: r.artifactId, artifactVersion: r.artifactVersion })),
    action: "recall",
  });
}
