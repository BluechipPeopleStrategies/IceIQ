#!/usr/bin/env node
// Run: node src/scenario-engine/promotedArtifact.test.mjs
import { existsSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildPromotedArtifactRecord, writePromotedArtifact, readPromotedArtifact,
  regeneratePromotedIndex, PROMOTED_ARTIFACT_SCHEMA_VERSION, PROMOTED_INDEX_SCHEMA_VERSION,
} from "./promotedArtifact.js";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };
const throwsSync = (fn) => { try { fn(); return false; } catch { return true; } };

const SCRATCH_ROOT = join(new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]):/, "$1:"), "_promotedArtifact_test_scratch");
if (existsSync(SCRATCH_ROOT)) rmSync(SCRATCH_ROOT, { recursive: true, force: true });

function fakeCompiledPlay(overrides = {}) {
  return { id: "sd_test_v1", version: 1, compiledHash: "compiledhash123", samples: [{ t: 0, pos: [1, 2] }], ...overrides };
}
function fakeJudgmentRecord() {
  return { verdict: "approve", rationale: "test", confidence: "high" };
}
function fakeDependencyRecord() {
  return { artifactId: "sd_test_v1", physicsProfile: "physics-u13-v1" };
}

// ---- buildPromotedArtifactRecord: promotedAt excluded from the hash -------------
{
  const recordA = await buildPromotedArtifactRecord({ family: "dz_breakout", compiledPlay: fakeCompiledPlay(), judgmentRecord: fakeJudgmentRecord(), dependencyRecord: fakeDependencyRecord(), promotedAt: "2026-07-31T00:00:00.000Z" });
  const recordB = await buildPromotedArtifactRecord({ family: "dz_breakout", compiledPlay: fakeCompiledPlay(), judgmentRecord: fakeJudgmentRecord(), dependencyRecord: fakeDependencyRecord(), promotedAt: "2026-08-15T12:34:56.000Z" });
  ok("the SAME underlying content produces the SAME recordHash regardless of promotedAt (idempotency depends on this)", recordA.recordHash === recordB.recordHash);
  ok("promotedAt itself is still preserved on the record (as metadata, just not hashed)", recordA.promotedAt === "2026-07-31T00:00:00.000Z" && recordB.promotedAt === "2026-08-15T12:34:56.000Z");

  const recordDifferentContent = await buildPromotedArtifactRecord({ family: "dz_breakout", compiledPlay: fakeCompiledPlay({ compiledHash: "different" }), judgmentRecord: fakeJudgmentRecord(), dependencyRecord: fakeDependencyRecord(), promotedAt: "2026-07-31T00:00:00.000Z" });
  ok("genuinely different content produces a different recordHash", recordA.recordHash !== recordDifferentContent.recordHash);
}

// ---- writePromotedArtifact: idempotent write, real conflict detection -----------
{
  const record = await buildPromotedArtifactRecord({ family: "dz_breakout", compiledPlay: fakeCompiledPlay(), judgmentRecord: fakeJudgmentRecord(), dependencyRecord: fakeDependencyRecord(), promotedAt: "2026-07-31T00:00:00.000Z" });

  const first = writePromotedArtifact(SCRATCH_ROOT, record);
  ok("the first write actually writes the file", first.wrote === true && existsSync(first.path));

  const recordAgainLaterTimestamp = await buildPromotedArtifactRecord({ family: "dz_breakout", compiledPlay: fakeCompiledPlay(), judgmentRecord: fakeJudgmentRecord(), dependencyRecord: fakeDependencyRecord(), promotedAt: "2026-08-01T00:00:00.000Z" });
  const second = writePromotedArtifact(SCRATCH_ROOT, recordAgainLaterTimestamp);
  ok("re-writing the SAME underlying content (even at a different promotedAt) is a genuine no-op, not a re-write", second.wrote === false);
  ok("the file on disk still has the ORIGINAL promotedAt -- the no-op truly didn't touch the file", JSON.parse(readFileSync(first.path, "utf8")).promotedAt === "2026-07-31T00:00:00.000Z");

  const conflictingRecord = await buildPromotedArtifactRecord({ family: "dz_breakout", compiledPlay: fakeCompiledPlay({ compiledHash: "a-genuinely-different-compile" }), judgmentRecord: fakeJudgmentRecord(), dependencyRecord: fakeDependencyRecord(), promotedAt: "2026-07-31T00:00:00.000Z" });
  ok("writing GENUINELY DIFFERENT content under the same artifactId+family throws (real conflict, never silently overwritten)", throwsSync(() => writePromotedArtifact(SCRATCH_ROOT, conflictingRecord)));
}

// ---- readPromotedArtifact ---------------------------------------------------------
ok("readPromotedArtifact reads back the real, written record", readPromotedArtifact(SCRATCH_ROOT, "dz_breakout", "sd_test_v1").artifactId === "sd_test_v1");
ok("readPromotedArtifact returns null for an artifact that was never promoted", readPromotedArtifact(SCRATCH_ROOT, "dz_breakout", "sd_never_promoted") === null);

// ---- regeneratePromotedIndex: deterministic, scans real files -------------------
{
  const recordB = await buildPromotedArtifactRecord({ family: "two_on_one", compiledPlay: fakeCompiledPlay({ id: "sd_other_v1" }), judgmentRecord: fakeJudgmentRecord(), dependencyRecord: fakeDependencyRecord(), promotedAt: "2026-07-31T00:00:00.000Z" });
  writePromotedArtifact(SCRATCH_ROOT, recordB);

  const index = regeneratePromotedIndex(SCRATCH_ROOT);
  ok("the regenerated index carries the schema version", index.schemaVersion === PROMOTED_INDEX_SCHEMA_VERSION);
  ok("the index lists BOTH real promoted artifacts, across both families", index.entries.length === 2);
  ok("each entry carries its own family/artifactId/recordHash", index.entries.some((e) => e.family === "dz_breakout" && e.artifactId === "sd_test_v1") && index.entries.some((e) => e.family === "two_on_one" && e.artifactId === "sd_other_v1"));

  // Regenerating again (e.g. after the promoter's own index.json file now
  // sits alongside the family directories) must not crash or duplicate.
  const indexAgain = regeneratePromotedIndex(SCRATCH_ROOT);
  ok("regenerating the index again (with index.json now present) still works and is stable", indexAgain.entries.length === 2);
}

// ---- Cleanup ------------------------------------------------------------------
rmSync(SCRATCH_ROOT, { recursive: true, force: true });

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
