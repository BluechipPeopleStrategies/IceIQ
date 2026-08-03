#!/usr/bin/env node
// Run: node src/scenario-engine/recall.test.mjs
import { findAffectedByDependencyChange, buildRecallPatch, RECALL_PATCH_SCHEMA_VERSION } from "./recall.js";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

const index = {
  schemaVersion: "dependency-index-v1",
  entries: [
    { artifactId: "sd_breakout_v1", artifactVersion: 1, physicsProfile: "physics-u13-v1", sourceVersions: { rinkFrame: "rink-frame-v1" } },
    { artifactId: "sd_other_v1", artifactVersion: 1, physicsProfile: "physics-u11-v1", sourceVersions: { rinkFrame: "rink-frame-v1" } },
    { artifactId: "sd_breakout_v2", artifactVersion: 2, physicsProfile: "physics-u13-v1", sourceVersions: { rinkFrame: "rink-frame-v2" } },
  ],
};

// ---- findAffectedByDependencyChange: touches ONLY matching entries -------------
{
  const affected = findAffectedByDependencyChange(index, "physicsProfile", "physics-u13-v1");
  ok("finds exactly the entries using the old physics profile version", affected.length === 2 && affected.every((e) => e.physicsProfile === "physics-u13-v1"));
  ok("does NOT include the entry on a different physics profile version", !affected.some((e) => e.artifactId === "sd_other_v1"));
}

{
  const affected = findAffectedByDependencyChange(index, "sourceVersions.rinkFrame", "rink-frame-v1");
  ok("finds entries by a NESTED dependency path (sourceVersions.rinkFrame)", affected.length === 2);
  ok("does NOT include the entry already on the newer rinkFrame version", !affected.some((e) => e.artifactId === "sd_breakout_v2"));
}

ok("returns an empty array when nothing matches the old version", findAffectedByDependencyChange(index, "physicsProfile", "physics-does-not-exist").length === 0);
ok("returns an empty array for a nonexistent nested path", findAffectedByDependencyChange(index, "sourceVersions.doesNotExist", "anything").length === 0);

// ---- buildRecallPatch: a reviewable, complete record ----------------------------
{
  const affected = findAffectedByDependencyChange(index, "physicsProfile", "physics-u13-v1");
  const patch = buildRecallPatch(affected, "physicsProfile", "physics-u13-v1", "physics-u13-v2", "physics profile revised, prior calculations invalid");
  ok("the patch carries the schema version", patch.schemaVersion === RECALL_PATCH_SCHEMA_VERSION);
  ok("the patch names the changed dependency path and old/new versions", patch.dependencyPath === "physicsProfile" && patch.oldVersion === "physics-u13-v1" && patch.newVersion === "physics-u13-v2");
  ok("the patch preserves the human-readable reason", patch.reason === "physics profile revised, prior calculations invalid");
  ok("the patch lists exactly the affected artifacts, by id+version", patch.affectedArtifacts.length === 2 && patch.affectedArtifacts.some((a) => a.artifactId === "sd_breakout_v1" && a.artifactVersion === 1));
  ok("the patch does NOT list the unaffected artifact", !patch.affectedArtifacts.some((a) => a.artifactId === "sd_other_v1"));
  ok("the patch action is recall (matches the state machine's own vocabulary)", patch.action === "recall");
}

ok("buildRecallPatch on zero affected artifacts produces an empty, still-valid patch (nothing to recall)", buildRecallPatch([], "x", "old", "new", "no matches").affectedArtifacts.length === 0);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
