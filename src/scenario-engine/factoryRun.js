// The immutable, resumable, content-addressed factory run envelope, per
// Phase 5 Tasks 1-3 (framework-fit decision 2). A "run" is one factory
// invocation against one or more ScenarioDefinitions -- this module owns
// the on-disk record of what happened, not the pipeline logic itself
// (which lives in factoryPipeline.js and the gate modules). Every run gets
// its own directory under docs/factory/runs/<run-id>/ (factory-only,
// outside src/, consistent with decision 3's spirit).
//
// Design choices made explicit here (the spec left the exact mechanics
// open, matching the "document the judgment call" convention already used
// throughout Phases 1-4):
// - start.json is genuinely write-once: created via an exclusive ("wx")
//   file open that throws if the path already exists, so two callers can
//   never silently race-clobber the same run's manifest. Since runId
//   already embeds a fresh timestamp + random suffix, this should never
//   collide in practice -- the guard exists for correctness, not because
//   collisions are expected.
// - "start/end time" (Task 2's phrasing) does NOT mean end time lives
//   inside the immutable start.json -- that would contradict "immutable...
//   created before any candidate" (Task 1). End time lives in a separate
//   end.json, written exactly once by finishRun(), after the fact.
// - The lock file is a plain exclusive-create marker (pid + hostname +
//   timestamp) with NO cross-platform process-liveness checking -- a
//   second acquireLock() call always throws if the lock exists, full stop.
//   An operator who knows the previous process died removes the lock
//   file by hand. This trades convenience for correctness: no fragile
//   platform-specific "is this pid still alive" heuristic.
// - Blobs are content-addressed via canonicalHash.js's own
//   versionedContentHash (kind + version + value, the same convention
//   Phase 1-4's own artifacts already use for their content hashes), so
//   writing the same value twice is a genuine no-op, not a re-write --
//   this is what makes writeBlob() naturally idempotent for resumability.
// - Atomic writes use the standard temp-file-then-rename pattern (rename
//   is atomic on the same filesystem) for start.json/end.json/blobs;
//   events.jsonl uses plain appendFileSync per line -- safe here because
//   the lock file already guarantees single-writer access to a run.

import { existsSync, mkdirSync, writeFileSync, appendFileSync, readFileSync, renameSync, readdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { execSync } from "node:child_process";
import { hostname } from "node:os";
import { versionedContentHash } from "./canonicalHash.js";

export const RUN_ENVELOPE_SCHEMA_VERSION = "run-envelope-v1";

const REPO_ROOT = join(new URL("../..", import.meta.url).pathname.replace(/^\/([A-Za-z]):/, "$1:"));
const RUNS_ROOT = join(REPO_ROOT, "docs", "factory", "runs");

function nowIso() {
  return new Date().toISOString();
}

function atomicWriteFileSync(path, data) {
  const tmpPath = `${path}.tmp-${randomBytes(4).toString("hex")}`;
  writeFileSync(tmpPath, data);
  renameSync(tmpPath, path);
}

// git info is read fresh at run-start time -- never cached, never assumed,
// so a manifest always reflects the real working-tree state at the moment
// the run began, including whether it was dirty.
// stdio pipes stderr rather than inheriting it -- this repo's line-ending
// config makes every git invocation print a CRLF/LF warning to stderr,
// which would otherwise clutter every run's console output with noise
// unrelated to what this function actually reports.
const GIT_EXEC_OPTS = { cwd: REPO_ROOT, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] };

function getGitInfo() {
  const branch = execSync("git rev-parse --abbrev-ref HEAD", GIT_EXEC_OPTS).trim();
  const engineCommit = execSync("git rev-parse HEAD", GIT_EXEC_OPTS).trim();
  const status = execSync("git status --porcelain", GIT_EXEC_OPTS);
  const clean = status.trim().length === 0;
  // The dirty diff itself (staged + unstaged + untracked) is hashed, not
  // stored verbatim -- the manifest records WHETHER and to what degree the
  // tree was dirty (a changed hash proves a changed dirty state), without
  // duplicating a full diff into every run's manifest. `git diff HEAD`
  // alone is NOT sufficient here -- it only covers TRACKED files and never
  // shows untracked ones at all, so a brand-new untracked file would
  // silently leave dirtyDiffHash unchanged even though `clean` (which uses
  // `git status --porcelain` and does see untracked files) correctly flips
  // to false. Hashing status+diff together closes that gap. (Caught by
  // this module's own dirty-tree isolation test, not a review.)
  let dirtyDiffHash = null;
  if (!clean) {
    const diff = execSync("git diff HEAD", GIT_EXEC_OPTS);
    const shasum = execSync("git hash-object --stdin", { ...GIT_EXEC_OPTS, input: status + "\n" + diff }).trim();
    dirtyDiffHash = shasum;
  }
  return { branch, engineCommit, workingTree: { clean, dirtyDiffHash } };
}

function runIdFor(timestamp) {
  const stamp = timestamp.replace(/[:.]/g, "-");
  const suffix = randomBytes(4).toString("hex");
  return `run_${stamp}_${suffix}`;
}

// Creates a fresh run directory, writes the immutable start.json manifest,
// and acquires the run's own lock. `versions` is a caller-supplied map of
// this run's pinned schema/solver versions (SIMULATOR_VERSION,
// TACTICAL_CLAIM_SCHEMA_VERSION, etc.) -- factoryRun.js doesn't import
// every scenario-engine module just to read their version constants; the
// pipeline layer that DOES import them passes the map in, so this module
// stays a pure envelope/storage concern.
export function startRun({ family, kernelVersion = null, parameterSpace = null, seeds = null, requestedCounts, versions }) {
  if (!family) throw new Error("startRun: family is required");
  if (!requestedCounts || typeof requestedCounts !== "object") throw new Error("startRun: requestedCounts is required");
  if (!versions || typeof versions !== "object") throw new Error("startRun: versions is required");

  const startedAt = nowIso();
  const runId = runIdFor(startedAt);
  const runDir = join(RUNS_ROOT, runId);
  if (existsSync(runDir)) throw new Error(`startRun: run directory already exists for ${runId} (this should be unreachable -- runId includes a random suffix)`);
  mkdirSync(runDir, { recursive: true });
  mkdirSync(join(runDir, "blobs"), { recursive: true });

  acquireLock(runDir);

  const gitInfo = getGitInfo();
  const manifest = Object.freeze({
    schemaVersion: RUN_ENVELOPE_SCHEMA_VERSION,
    runId,
    startedAt,
    ...gitInfo,
    versions,
    family,
    kernelVersion,
    parameterSpace,
    seeds,
    requestedCounts,
  });

  const startJsonPath = join(runDir, "start.json");
  // Exclusive create -- throws EEXIST rather than silently overwriting an
  // existing manifest. Write via temp+rename so a crash mid-write never
  // leaves a partially-written start.json on disk.
  if (existsSync(startJsonPath)) throw new Error(`startRun: start.json already exists at ${startJsonPath} -- refusing to overwrite an immutable manifest`);
  atomicWriteFileSync(startJsonPath, JSON.stringify(manifest, null, 2) + "\n");
  writeFileSync(join(runDir, "events.jsonl"), "");

  return { runId, runDir, manifest };
}

export function acquireLock(runDir) {
  const lockPath = join(runDir, "run.lock");
  const lockContent = JSON.stringify({ pid: process.pid, hostname: hostname(), acquiredAt: nowIso() }, null, 2) + "\n";
  try {
    writeFileSync(lockPath, lockContent, { flag: "wx" });
  } catch (err) {
    if (err.code === "EEXIST") {
      const existing = readFileSync(lockPath, "utf8");
      throw new Error(`acquireLock: ${runDir} is already locked -- ${existing.trim()}. If that process is confirmed dead, remove run.lock by hand before retrying.`);
    }
    throw err;
  }
}

export function releaseLock(runDir) {
  const lockPath = join(runDir, "run.lock");
  // Not atomic-rename-guarded -- a plain delete is fine here; the risk
  // atomic writes guard against (a reader observing a partially-written
  // file) doesn't apply to removing a lock. unlinkSync, not a shelled-out
  // del/rm -- no reason to invoke a subprocess for a single file delete.
  if (existsSync(lockPath)) unlinkSync(lockPath);
}

let eventSeqCache = new Map(); // runDir -> next seq number, so appendEvent doesn't re-read+re-parse the whole log every call

export function appendEvent(runDir, type, payload = {}) {
  const eventsPath = join(runDir, "events.jsonl");
  if (!eventSeqCache.has(runDir)) {
    eventSeqCache.set(runDir, readEvents(runDir).length);
  }
  const seq = eventSeqCache.get(runDir);
  const event = Object.freeze({ seq, type, timestamp: nowIso(), ...payload });
  appendFileSync(eventsPath, JSON.stringify(event) + "\n");
  eventSeqCache.set(runDir, seq + 1);
  return event;
}

export function readEvents(runDir) {
  const eventsPath = join(runDir, "events.jsonl");
  if (!existsSync(eventsPath)) return [];
  const raw = readFileSync(eventsPath, "utf8");
  return raw
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));
}

// Content-addressed, idempotent: writing the same {kind, version, value}
// twice produces the same hash and is a genuine no-op the second time --
// this is the mechanism resumability relies on (Task 3: "re-running a
// completed step must not duplicate candidates").
export async function writeBlob(runDir, kind, version, value) {
  const hash = await versionedContentHash(kind, version, value);
  const blobPath = join(runDir, "blobs", `${hash}.json`);
  if (!existsSync(blobPath)) {
    atomicWriteFileSync(blobPath, JSON.stringify({ kind, version, value }, null, 2) + "\n");
  }
  return hash;
}

export function readBlob(runDir, hash) {
  const blobPath = join(runDir, "blobs", `${hash}.json`);
  if (!existsSync(blobPath)) throw new Error(`readBlob: no blob found for hash ${hash} in ${runDir}`);
  return JSON.parse(readFileSync(blobPath, "utf8"));
}

// Written exactly once, after the fact -- refuses to overwrite an existing
// end.json, matching start.json's own write-once discipline.
export function finishRun(runDir, summary = {}) {
  const endJsonPath = join(runDir, "end.json");
  if (existsSync(endJsonPath)) throw new Error(`finishRun: end.json already exists at ${endJsonPath} -- a run can only be finished once`);
  const record = Object.freeze({ finishedAt: nowIso(), ...summary });
  atomicWriteFileSync(endJsonPath, JSON.stringify(record, null, 2) + "\n");
  releaseLock(runDir);
  return record;
}

// Reconstructs "what's already been done" from the append-only event log,
// so a caller resuming an interrupted run can skip completed work instead
// of re-doing (and duplicating) it. completedSteps is a Set of
// "candidateId::gateId" strings, built from "gate-passed"/"gate-failed"
// events -- either outcome means the gate already ran for that candidate,
// so a resumed run must not run it again, only pick up where it stopped.
export function resumeRun(runId) {
  const runDir = join(RUNS_ROOT, runId);
  const startJsonPath = join(runDir, "start.json");
  if (!existsSync(startJsonPath)) throw new Error(`resumeRun: no run found at ${runDir}`);
  const manifest = JSON.parse(readFileSync(startJsonPath, "utf8"));
  const events = readEvents(runDir);
  eventSeqCache.set(runDir, events.length);

  const completedSteps = new Set();
  for (const event of events) {
    if (event.type === "gate-passed" || event.type === "gate-failed") {
      completedSteps.add(`${event.candidateId}::${event.gateId}`);
    }
  }

  const endJsonPath = join(runDir, "end.json");
  const finished = existsSync(endJsonPath) ? JSON.parse(readFileSync(endJsonPath, "utf8")) : null;

  // A finished run is immutable (end.json is write-once) and has nothing
  // left to resume -- no lock needed, and acquiring one would leave a
  // dangling lock nobody will ever release. An UNfinished run gets the
  // SAME single-instance guarantee startRun() gives a fresh run:
  // acquireLock() throws if another process is already resuming/holding
  // this run, and throws just as loudly if the lock was never released
  // after a genuine crash -- an operator who knows the prior process died
  // removes run.lock by hand first, matching acquireLock's own documented
  // convention. (Caught by Phase 5's adversarial review, 2026-07-31 --
  // resumeRun previously never touched the lock at all, so two processes
  // could both "resume" the same unfinished run with zero coordination.)
  if (!finished) acquireLock(runDir);

  return { runId, runDir, manifest, events, completedSteps, finished };
}

export function isStepComplete(resumed, candidateId, gateId) {
  return resumed.completedSteps.has(`${candidateId}::${gateId}`);
}

export function listRuns() {
  if (!existsSync(RUNS_ROOT)) return [];
  return readdirSync(RUNS_ROOT).filter((name) => existsSync(join(RUNS_ROOT, name, "start.json")));
}
