// The append-only event state machine over Phase 5's run envelope, per
// Phase 6 Task 1: "generated -> validated|rejected -> judged|review-
// required|rejected -> promotion-eligible|review-required -> staged ->
// promoted/recalled|retired." Built directly on factoryRun.js's own
// events.jsonl (not a parallel/separate log) -- a state transition is just
// another event type, `state-transition`, alongside the gate-passed/gate-
// failed/gate-skipped/candidate-compiled events Phase 5 already appends.
// Each transition references an artifact hash (never mutates the artifact
// itself, which stays content-addressed and immutable in the blob store),
// and every transition is checked against the legal-transition graph below
// before being recorded -- an illegal transition throws rather than
// silently recording bad state, matching this project's established
// "reject, never clamp" convention.
//
// GLOBAL, cross-run state tracking (not per-run): an artifact's lifecycle
// can legitimately span multiple runs (generated and promoted in one run,
// recalled via a later one), so legality is checked against every
// state-transition event for this artifactId across EVERY run directory
// under docs/factory/runs/, not just the events of whichever single run a
// caller happens to be holding. (Caught by both of Phase 6's independent
// adversarial reviews, 2026-07-31: per-run-only tracking let a terminal
// state -- e.g. RECALLED -- be trivially bypassed just by starting a new
// run for the same artifactId, since a fresh run's own events.jsonl has no
// memory of it.) Events are ordered by their real timestamp (not per-run
// seq, which restarts at 0 in every run) to merge histories correctly.
//
// Known, accepted structural limitation (documented, not silently
// unaddressed): appendEvent() in factoryRun.js is a fully generic
// primitive -- nothing at the data layer stops a future caller from
// constructing a "state-transition" event directly and bypassing
// isLegalTransition(). Only appendStateTransition() (this module's own
// entry point) enforces legality; every current call site in this
// codebase goes through it, but a redesign that makes illegal
// construction structurally impossible (e.g. a registered-event-type
// system in factoryRun.js) is out of this phase's scope.

import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { appendEvent, readEvents } from "./factoryRun.js";

export const STATE_MACHINE_SCHEMA_VERSION = "state-machine-v1";

export const STATES = Object.freeze({
  GENERATED: "generated",
  VALIDATED: "validated",
  REJECTED: "rejected",
  JUDGED: "judged",
  REVIEW_REQUIRED: "review-required",
  PROMOTION_ELIGIBLE: "promotion-eligible",
  STAGED: "staged",
  PROMOTED: "promoted",
  RECALLED: "recalled",
  RETIRED: "retired",
});

// The legal-transition graph (shape only -- see isLegalTransition below for
// the history-aware guard this shape alone can't express). `null` (no
// prior state) can only start at "generated". REJECTED, RECALLED, and
// RETIRED are terminal: once an artifact lands there, no further
// transition is legal (a superseding artifact gets its own new
// artifactId/version instead of mutating a terminal one's history).
// REVIEW_REQUIRED is NOT terminal -- it's the human-in-the-loop holding
// state at two different points in the flow (post-validation and post-
// judgment); a review resolves it forward or into REJECTED, never
// silently auto-advanced.
const TRANSITIONS = Object.freeze({
  [null]: new Set([STATES.GENERATED]),
  [STATES.GENERATED]: new Set([STATES.VALIDATED, STATES.REJECTED]),
  [STATES.VALIDATED]: new Set([STATES.JUDGED, STATES.REVIEW_REQUIRED, STATES.REJECTED]),
  [STATES.JUDGED]: new Set([STATES.PROMOTION_ELIGIBLE, STATES.REVIEW_REQUIRED]),
  [STATES.REVIEW_REQUIRED]: new Set([STATES.JUDGED, STATES.PROMOTION_ELIGIBLE, STATES.REJECTED]),
  [STATES.PROMOTION_ELIGIBLE]: new Set([STATES.STAGED]),
  [STATES.STAGED]: new Set([STATES.PROMOTED]),
  [STATES.PROMOTED]: new Set([STATES.RECALLED, STATES.RETIRED]),
  [STATES.REJECTED]: new Set(),
  [STATES.RECALLED]: new Set(),
  [STATES.RETIRED]: new Set(),
});

// The real legality check, given an artifact's FULL transition history
// (not just its immediate prior state -- REVIEW_REQUIRED is reused at two
// different pipeline points, and the shape-only graph above can't tell
// them apart from fromState alone).
export function isLegalTransition(history, toState) {
  const fromState = history.length === 0 ? null : history[history.length - 1].toState;
  const allowed = TRANSITIONS[fromState];
  if (!allowed || !allowed.has(toState)) return false;
  // REVIEW_REQUIRED -> PROMOTION_ELIGIBLE is only legal if a real
  // judgment has happened SOMEWHERE in this artifact's history -- without
  // this guard, a review-required reached straight from VALIDATED (a
  // physics/schema-level ambiguity, before any Claude judgment exists at
  // all) could jump directly to promotion-eligible, skipping gate 8's
  // hockey/pedagogy judgment entirely -- the exact outcome Task 7/the
  // exit gate's "Claude can approve or reject... with a complete
  // judgment record" exists to prevent. (Caught by Phase 6's adversarial
  // review, 2026-07-31.)
  if (fromState === STATES.REVIEW_REQUIRED && toState === STATES.PROMOTION_ELIGIBLE) {
    return history.some((e) => e.toState === STATES.JUDGED);
  }
  return true;
}

// Shape-only check (no history), for callers that just want to know "is
// fromState -> toState ever legal in the abstract graph" -- e.g. a quick
// sanity test of the graph itself. NOT sufficient on its own to gate a
// real transition (see isLegalTransition above); appendStateTransition
// never uses this.
export function isLegalTransitionShape(fromState, toState) {
  const allowed = TRANSITIONS[fromState];
  return allowed ? allowed.has(toState) : false;
}

// The current state of one artifact from a SINGLE run's own events array
// -- a purely local, in-memory query (e.g. "what did THIS run record"),
// never used to gate a real transition (which requires the global,
// cross-run picture -- see globalCurrentState).
export function currentState(events, artifactId) {
  const transitions = stateHistory(events, artifactId);
  return transitions.length === 0 ? null : transitions[transitions.length - 1].toState;
}

export function stateHistory(events, artifactId) {
  return events.filter((e) => e.type === "state-transition" && e.artifactId === artifactId);
}

function runsRootFor(runDir) {
  return dirname(runDir);
}

// Scans EVERY run directory under the given runs root for state-transition
// events belonging to this artifactId, merged and ordered by real
// timestamp (never per-run seq, which restarts at 0 in each run) -- the
// authoritative, cross-run picture appendStateTransition checks legality
// against.
export function globalStateHistory(runsRoot, artifactId) {
  const all = [];
  if (!existsSync(runsRoot)) return all;
  for (const runId of readdirSync(runsRoot)) {
    const candidateDir = join(runsRoot, runId);
    if (!existsSync(join(candidateDir, "start.json"))) continue;
    all.push(...stateHistory(readEvents(candidateDir), artifactId));
  }
  all.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  return all;
}

export function globalCurrentState(runsRoot, artifactId) {
  const history = globalStateHistory(runsRoot, artifactId);
  return history.length === 0 ? null : history[history.length - 1].toState;
}

// Appends a state-transition event to runDir's own log, after checking it
// against this artifact's GLOBAL history (every run, not just runDir's
// own) and the legal-transition graph. Throws on an illegal transition
// rather than recording it.
export function appendStateTransition(runDir, artifactId, artifactHash, toState, reason) {
  const runsRoot = runsRootFor(runDir);
  const history = globalStateHistory(runsRoot, artifactId);
  if (!isLegalTransition(history, toState)) {
    const fromState = history.length === 0 ? null : history[history.length - 1].toState;
    throw new Error(`appendStateTransition: illegal transition for ${artifactId}: "${fromState}" -> "${toState}" (reason given: ${reason})`);
  }
  const fromState = history.length === 0 ? null : history[history.length - 1].toState;
  return appendEvent(runDir, "state-transition", { artifactId, artifactHash, fromState, toState, reason });
}
