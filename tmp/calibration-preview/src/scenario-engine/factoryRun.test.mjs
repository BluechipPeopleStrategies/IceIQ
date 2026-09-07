#!/usr/bin/env node
// Run: node src/scenario-engine/factoryRun.test.mjs
import { existsSync, readdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import {
  startRun, acquireLock, releaseLock, appendEvent, readEvents,
  writeBlob, readBlob, finishRun, resumeRun, isStepComplete, listRuns,
  RUN_ENVELOPE_SCHEMA_VERSION,
} from "./factoryRun.js";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };
const throwsSync = (fn) => { try { fn(); return false; } catch { return true; } };

const REPO_ROOT = join(new URL("../..", import.meta.url).pathname.replace(/^\/([A-Za-z]):/, "$1:"));
const testRunDirs = []; // cleaned up at the end -- this file's runs are never meant to be committed real records

function testRunConfig(overrides = {}) {
  return {
    family: "test_family",
    requestedCounts: { candidates: 1 },
    versions: { testSchema: "test-v1" },
    ...overrides,
  };
}

// ---- startRun: creates the envelope, writes an immutable manifest ------------
{
  const { runId, runDir, manifest } = startRun(testRunConfig());
  testRunDirs.push(runDir);

  ok("startRun creates the run directory", existsSync(runDir));
  ok("startRun creates blobs/", existsSync(join(runDir, "blobs")));
  ok("startRun writes start.json", existsSync(join(runDir, "start.json")));
  ok("startRun writes an empty events.jsonl", existsSync(join(runDir, "events.jsonl")) && readFileSync(join(runDir, "events.jsonl"), "utf8") === "");
  ok("startRun acquires the lock", existsSync(join(runDir, "run.lock")));
  ok("manifest carries the schema version", manifest.schemaVersion === RUN_ENVELOPE_SCHEMA_VERSION);
  ok("manifest carries a real runId matching the directory name", runId === runDir.split(/[\\/]/).pop());
  ok("manifest carries a real git branch (non-empty string)", typeof manifest.branch === "string" && manifest.branch.length > 0);
  ok("manifest's branch matches the real current branch", manifest.branch === execSync("git rev-parse --abbrev-ref HEAD", { cwd: REPO_ROOT, encoding: "utf8" }).trim());
  ok("manifest carries a real 40-char engine commit sha", /^[0-9a-f]{40}$/.test(manifest.engineCommit));
  ok("manifest's engineCommit matches the real current HEAD", manifest.engineCommit === execSync("git rev-parse HEAD", { cwd: REPO_ROOT, encoding: "utf8" }).trim());
  ok("manifest records workingTree.clean as a boolean", typeof manifest.workingTree.clean === "boolean");
  ok("manifest carries the caller's versions map through untouched", manifest.versions.testSchema === "test-v1");
  ok("manifest carries family/requestedCounts through", manifest.family === "test_family" && manifest.requestedCounts.candidates === 1);
  ok("kernelVersion/parameterSpace/seeds default to explicit null, not omitted", manifest.kernelVersion === null && manifest.parameterSpace === null && manifest.seeds === null);
  ok("start.json on disk matches the returned manifest", JSON.stringify(JSON.parse(readFileSync(join(runDir, "start.json"), "utf8"))) === JSON.stringify(manifest));

  ok("rejects a run with no family", throwsSync(() => startRun(testRunConfig({ family: undefined }))));
  ok("rejects a run with no requestedCounts", throwsSync(() => startRun(testRunConfig({ requestedCounts: undefined }))));
  ok("rejects a run with no versions", throwsSync(() => startRun(testRunConfig({ versions: undefined }))));
}

// ---- Lock: single-instance, no silent double-acquire --------------------------
{
  const { runDir } = startRun(testRunConfig());
  testRunDirs.push(runDir);
  ok("acquiring an already-held lock throws (single-instance guarantee)", throwsSync(() => acquireLock(runDir)));
  releaseLock(runDir);
  ok("after releaseLock, the lock file is gone", !existsSync(join(runDir, "run.lock")));
  ok("a released lock can be re-acquired", !throwsSync(() => acquireLock(runDir)));
}

// ---- Events: append-only, sequential, round-trips exactly ---------------------
{
  const { runDir } = startRun(testRunConfig());
  testRunDirs.push(runDir);

  const e0 = appendEvent(runDir, "run-started", { note: "first" });
  const e1 = appendEvent(runDir, "candidate-created", { candidateId: "c1" });
  const e2 = appendEvent(runDir, "gate-passed", { candidateId: "c1", gateId: "gate1" });

  ok("events get sequential seq numbers starting at 0", e0.seq === 0 && e1.seq === 1 && e2.seq === 2);
  ok("each event carries a real timestamp", typeof e0.timestamp === "string" && !Number.isNaN(Date.parse(e0.timestamp)));

  const events = readEvents(runDir);
  ok("readEvents returns all three events in order", events.length === 3 && events[0].type === "run-started" && events[2].type === "gate-passed");
  ok("readEvents round-trips payload data exactly", events[1].candidateId === "c1");
  ok("readEvents on a run with no events yet returns an empty array", readEvents(join(runDir, "..", "does-not-exist")).length === 0);
}

// ---- Blobs: content-addressed, idempotent ---------------------------------------
{
  const { runDir } = startRun(testRunConfig());
  testRunDirs.push(runDir);

  const hashA = await writeBlob(runDir, "test-blob", "v1", { x: 1, y: 2 });
  const hashB = await writeBlob(runDir, "test-blob", "v1", { x: 1, y: 2 });
  const hashDifferent = await writeBlob(runDir, "test-blob", "v1", { x: 1, y: 3 });

  ok("writing identical content twice returns the same hash", hashA === hashB);
  ok("writing different content returns a different hash", hashA !== hashDifferent);
  ok("only ONE blob file exists on disk for the two identical writes (genuine idempotency, not a re-write)", readdirSync(join(runDir, "blobs")).length === 2);

  const read = readBlob(runDir, hashA);
  ok("readBlob round-trips the exact value", JSON.stringify(read.value) === JSON.stringify({ x: 1, y: 2 }));
  ok("readBlob round-trips kind and version", read.kind === "test-blob" && read.version === "v1");
  ok("readBlob throws for an unknown hash", throwsSync(() => readBlob(runDir, "0".repeat(64))));
}

// ---- finishRun: write-once, releases the lock ------------------------------------
{
  const { runDir } = startRun(testRunConfig());
  testRunDirs.push(runDir);
  appendEvent(runDir, "run-started", {});

  const record = finishRun(runDir, { kept: 1, rejected: 0 });
  ok("finishRun writes end.json", existsSync(join(runDir, "end.json")));
  ok("finishRun's returned record carries the caller's summary", record.kept === 1 && record.rejected === 0);
  ok("finishRun releases the lock", !existsSync(join(runDir, "run.lock")));
  ok("finishRun can only be called once (write-once)", throwsSync(() => finishRun(runDir, {})));
}

// ---- resumeRun: reconstructs completed steps from the event log ------------------
{
  const { runDir, runId } = startRun(testRunConfig());
  testRunDirs.push(runDir);
  appendEvent(runDir, "candidate-created", { candidateId: "c1" });
  appendEvent(runDir, "gate-passed", { candidateId: "c1", gateId: "gate1" });
  appendEvent(runDir, "gate-failed", { candidateId: "c1", gateId: "gate2", reason: "test failure" });
  // gate3 for c1 never ran -- should NOT show up as complete.

  // Simulates the realistic case resumeRun exists for: the original
  // process is gone (crashed, or simply exited), so its lock is released
  // before anyone resumes.
  releaseLock(runDir);
  const resumed = resumeRun(runId);
  ok("resumeRun finds the manifest", resumed.manifest.family === "test_family");
  ok("resumeRun replays all events", resumed.events.length === 3);
  ok("a passed gate is marked complete", isStepComplete(resumed, "c1", "gate1"));
  ok("a failed gate is ALSO marked complete -- it ran, resuming must not re-run it, only route around it", isStepComplete(resumed, "c1", "gate2"));
  ok("a gate that never ran is NOT marked complete", !isStepComplete(resumed, "c1", "gate3"));
  ok("resumeRun on an unfinished run reports finished: null", resumed.finished === null);

  // Lock reacquisition (Task 1's "single-instance lock file per run" --
  // caught missing entirely from the resume path by Phase 5's adversarial
  // review, 2026-07-31: resumeRun previously never touched run.lock at all).
  ok("resumeRun on an unfinished run REACQUIRES the lock", existsSync(join(runDir, "run.lock")));
  ok("a second resumeRun (or acquireLock) call while the first resume is still active throws -- single-instance guarantee extends to resume", throwsSync(() => acquireLock(runDir)));

  releaseLock(runDir); // so finishRun below can acquire-then-release cleanly
  finishRun(runDir, { kept: 0, rejected: 1 });
  const resumedAfterFinish = resumeRun(runId);
  ok("resumeRun on a finished run reports the real end.json contents", resumedAfterFinish.finished && resumedAfterFinish.finished.rejected === 1);
  ok("resumeRun on an ALREADY-FINISHED run does NOT acquire a lock -- nothing left to resume, no dangling lock", !existsSync(join(runDir, "run.lock")));

  ok("resumeRun throws for an unknown runId", throwsSync(() => resumeRun("run_does_not_exist")));
}

// ---- Dirty-tree isolation (Task 3's explicit exit-gate requirement) --------------
// A run's own recorded artifacts must not be contaminated by an unrelated
// dirty working tree -- the run store is isolated by construction (it only
// ever writes into its own directory), and this proves it, not just claims
// it. Uses a real scratch file under the repo root so getGitInfo() sees a
// genuinely dirtier tree, then reverts it -- never leaves the repo dirty.
// NOTE: this repo may already have other genuine uncommitted work in
// progress at test time (active development), so this test does NOT
// assume the tree starts clean -- it compares against real `git status`
// ground truth before/after, never a hardcoded expectation either way.
{
  const scratchPath = join(REPO_ROOT, "_factoryRun_test_scratch_DO_NOT_COMMIT.tmp");
  ok("setup: scratch file does not already exist", !existsSync(scratchPath));

  const statusBefore = execSync("git status --porcelain", { cwd: REPO_ROOT, encoding: "utf8" });
  const { runDir: beforeRunDir, manifest: beforeManifest } = startRun(testRunConfig());
  testRunDirs.push(beforeRunDir);
  const beforeBlobHash = await writeBlob(beforeRunDir, "isolation-test", "v1", { fixed: "value" });

  writeFileSync(scratchPath, "dirtying the tree on purpose for a test\n");
  try {
    const statusAfter = execSync("git status --porcelain", { cwd: REPO_ROOT, encoding: "utf8" });
    const { runDir: afterRunDir, manifest: afterManifest } = startRun(testRunConfig());
    testRunDirs.push(afterRunDir);
    const afterBlobHash = await writeBlob(afterRunDir, "isolation-test", "v1", { fixed: "value" });

    ok("the manifest's clean/dirty call matches real `git status` before the scratch file", beforeManifest.workingTree.clean === (statusBefore.trim().length === 0));
    ok("the manifest's clean/dirty call matches real `git status` after the scratch file (always dirty now)", afterManifest.workingTree.clean === false && statusAfter.trim().length > 0);
    ok("adding the scratch file changes the recorded dirty-diff-hash -- the hash genuinely tracks real tree changes, not a static/ignored value", beforeManifest.workingTree.dirtyDiffHash !== afterManifest.workingTree.dirtyDiffHash);
    ok("dirtying an unrelated scratch file does NOT change a fixed value's content-addressed hash -- the run store is isolated from tree dirtiness", beforeBlobHash === afterBlobHash);
  } finally {
    rmSync(scratchPath, { force: true });
  }
  ok("cleanup: scratch file removed", !existsSync(scratchPath));
}

ok("listRuns includes every run created in this test file", testRunDirs.every((dir) => listRuns().includes(dir.split(/[\\/]/).pop())));

// ---- Cleanup: this file's runs are test debris, never meant to be committed -----
for (const dir of testRunDirs) {
  rmSync(dir, { recursive: true, force: true });
}
ok("cleanup: all test run directories removed", testRunDirs.every((dir) => !existsSync(dir)));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
