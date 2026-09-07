#!/usr/bin/env node
// Run: node src/scenario-engine/stateMachine.test.mjs
import { rmSync } from "node:fs";
import { startRun, readEvents } from "./factoryRun.js";
import {
  STATES, isLegalTransition, isLegalTransitionShape, currentState, stateHistory,
  globalStateHistory, globalCurrentState, appendStateTransition,
} from "./stateMachine.js";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };
const throwsSync = (fn) => { try { fn(); return false; } catch { return true; } };

const testRunDirs = [];
function freshRun() {
  const { runDir } = startRun({ family: "test_family", requestedCounts: { candidates: 1 }, versions: { test: "v1" } });
  testRunDirs.push(runDir);
  return runDir;
}
function runsRootOf(runDir) {
  return runDir.replace(/[\\/][^\\/]+$/, "");
}

// ---- isLegalTransitionShape: the abstract graph -----------------------------
ok("null -> generated is legal (the only legal first transition)", isLegalTransitionShape(null, STATES.GENERATED));
ok("null -> validated is NOT legal (must start at generated)", !isLegalTransitionShape(null, STATES.VALIDATED));
ok("generated -> validated is legal", isLegalTransitionShape(STATES.GENERATED, STATES.VALIDATED));
ok("generated -> rejected is legal", isLegalTransitionShape(STATES.GENERATED, STATES.REJECTED));
ok("generated -> staged is NOT legal (can't skip stages)", !isLegalTransitionShape(STATES.GENERATED, STATES.STAGED));
ok("validated -> judged is legal", isLegalTransitionShape(STATES.VALIDATED, STATES.JUDGED));
ok("validated -> review-required is legal (shape-only -- the history-aware guard is tested separately below)", isLegalTransitionShape(STATES.VALIDATED, STATES.REVIEW_REQUIRED));
ok("judged -> promotion-eligible is legal", isLegalTransitionShape(STATES.JUDGED, STATES.PROMOTION_ELIGIBLE));
ok("review-required -> judged is legal", isLegalTransitionShape(STATES.REVIEW_REQUIRED, STATES.JUDGED));
ok("review-required -> rejected is legal", isLegalTransitionShape(STATES.REVIEW_REQUIRED, STATES.REJECTED));
ok("promotion-eligible -> staged is legal", isLegalTransitionShape(STATES.PROMOTION_ELIGIBLE, STATES.STAGED));
ok("staged -> promoted is legal", isLegalTransitionShape(STATES.STAGED, STATES.PROMOTED));
ok("promoted -> recalled is legal", isLegalTransitionShape(STATES.PROMOTED, STATES.RECALLED));
ok("promoted -> retired is legal", isLegalTransitionShape(STATES.PROMOTED, STATES.RETIRED));

for (const terminal of [STATES.REJECTED, STATES.RECALLED, STATES.RETIRED]) {
  for (const target of Object.values(STATES)) {
    ok(`${terminal} -> ${target} is NOT legal (${terminal} is terminal)`, !isLegalTransitionShape(terminal, target));
  }
}

// ---- isLegalTransition: the history-aware guard (the real safety check) -------
// The critical fix: REVIEW_REQUIRED -> PROMOTION_ELIGIBLE must NOT be legal
// unless a real JUDGED entry exists somewhere in history -- otherwise a
// validation-stage review-required (reached BEFORE any judgment exists at
// all) could skip straight to promotion-eligible. (Caught by Phase 6's
// adversarial review, 2026-07-31.)
{
  const neverJudgedHistory = [
    { toState: STATES.GENERATED }, { toState: STATES.VALIDATED }, { toState: STATES.REVIEW_REQUIRED },
  ];
  ok("EXIT GATE FIX: review-required reached WITHOUT ever being judged cannot jump to promotion-eligible", !isLegalTransition(neverJudgedHistory, STATES.PROMOTION_ELIGIBLE));
  ok("...but CAN still legally move to judged from there", isLegalTransition(neverJudgedHistory, STATES.JUDGED));
  ok("...or to rejected", isLegalTransition(neverJudgedHistory, STATES.REJECTED));

  const judgedThenReviewHistory = [
    { toState: STATES.GENERATED }, { toState: STATES.VALIDATED }, { toState: STATES.JUDGED }, { toState: STATES.REVIEW_REQUIRED },
  ];
  ok("review-required reached AFTER a real judgment CAN legally proceed to promotion-eligible", isLegalTransition(judgedThenReviewHistory, STATES.PROMOTION_ELIGIBLE));
}

// ---- currentState / stateHistory: LOCAL, single-run queries -------------------
{
  const runDir = freshRun();
  ok("currentState is null for an artifact with no transitions yet", currentState(readEvents(runDir), "a1") === null);
  appendStateTransition(runDir, "a1", "hash1", STATES.GENERATED, "created");
  ok("currentState reflects the first transition", currentState(readEvents(runDir), "a1") === STATES.GENERATED);
}

// ---- globalCurrentState / globalStateHistory: the real, cross-run picture -----
// EXIT GATE FIX: an artifact's terminal state must hold even across a
// BRAND NEW run directory -- per-run-only tracking previously let a
// terminal state be bypassed just by starting a fresh run for the same
// artifactId. (Caught by Phase 6's adversarial review, 2026-07-31.)
{
  const runA = freshRun();
  appendStateTransition(runA, "cross_run_artifact", "hashX", STATES.GENERATED, "created in run A");
  appendStateTransition(runA, "cross_run_artifact", "hashX", STATES.VALIDATED, "validated in run A");
  appendStateTransition(runA, "cross_run_artifact", "hashX", STATES.REJECTED, "rejected in run A");

  ok("globalCurrentState finds the artifact's real state from run A", globalCurrentState(runsRootOf(runA), "cross_run_artifact") === STATES.REJECTED);

  // A brand-new run, for the SAME artifactId.
  const runB = freshRun();
  ok("a fresh run's OWN local events know nothing about the artifact (expected -- it's a new run)", currentState(readEvents(runB), "cross_run_artifact") === null);
  ok("but globalCurrentState (scanning ALL runs) correctly reports the real, terminal REJECTED state", globalCurrentState(runsRootOf(runB), "cross_run_artifact") === STATES.REJECTED);

  ok("EXIT GATE: appendStateTransition in the NEW run refuses to resurrect a terminal artifact from an OLDER run", throwsSync(() => appendStateTransition(runB, "cross_run_artifact", "hashX", STATES.GENERATED, "trying to start over")));

  const history = globalStateHistory(runsRootOf(runB), "cross_run_artifact");
  ok("globalStateHistory returns the full cross-run history in real chronological order", history.length === 3 && history.map((e) => e.toState).join(",") === "generated,validated,rejected");
}

// ---- appendStateTransition: full happy-path chain + illegal-transition rejection --
{
  const runDir = freshRun();
  appendStateTransition(runDir, "a2", "hash2", STATES.GENERATED, "created");
  appendStateTransition(runDir, "a2", "hash2", STATES.VALIDATED, "passed gates 1-4");
  appendStateTransition(runDir, "a2", "hash2", STATES.JUDGED, "approved");
  appendStateTransition(runDir, "a2", "hash2", STATES.PROMOTION_ELIGIBLE, "policy math clears");
  appendStateTransition(runDir, "a2", "hash2", STATES.STAGED, "queued");
  appendStateTransition(runDir, "a2", "hash2", STATES.PROMOTED, "promoted");
  ok("the full legitimate chain (through a real judgment) reaches promoted", globalCurrentState(runsRootOf(runDir), "a2") === STATES.PROMOTED);

  const events = readEvents(runDir).filter((e) => e.type === "state-transition" && e.artifactId === "a2");
  ok("each transition event records its own fromState/toState/reason", events[1].fromState === STATES.GENERATED && events[1].toState === STATES.VALIDATED && events[1].reason === "passed gates 1-4");
}

{
  const runDir = freshRun();
  appendStateTransition(runDir, "a3", "hash3", STATES.GENERATED, "created");
  ok("skipping straight to staged throws", throwsSync(() => appendStateTransition(runDir, "a3", "hash3", STATES.STAGED, "nope")));
  ok("the illegal attempt was NOT recorded as an event", !readEvents(runDir).some((e) => e.type === "state-transition" && e.artifactId === "a3" && e.toState === STATES.STAGED));
  ok("currentState is unaffected by the rejected illegal attempt", currentState(readEvents(runDir), "a3") === STATES.GENERATED);

  appendStateTransition(runDir, "a3", "hash3", STATES.REJECTED, "failed physics");
  ok("nothing can follow a rejected artifact", throwsSync(() => appendStateTransition(runDir, "a3", "hash3", STATES.VALIDATED, "retry")));
}

// ---- Multiple artifacts in the same run don't cross-contaminate state -----------
{
  const runDir = freshRun();
  appendStateTransition(runDir, "artifact_x", "hx", STATES.GENERATED, "x created");
  appendStateTransition(runDir, "artifact_y", "hy", STATES.GENERATED, "y created");
  appendStateTransition(runDir, "artifact_x", "hx", STATES.VALIDATED, "x validated");

  ok("artifact_x advanced independently", currentState(readEvents(runDir), "artifact_x") === STATES.VALIDATED);
  ok("artifact_y stayed at its own state, unaffected by artifact_x's transition", currentState(readEvents(runDir), "artifact_y") === STATES.GENERATED);
}

// ---- Cleanup ------------------------------------------------------------------
for (const dir of testRunDirs) rmSync(dir, { recursive: true, force: true });

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
