// Deterministic Level-1 ("scenario kinematics") simulator core, per Phase 2
// Task 3: given a ScenarioDefinition, resolve a SimulationTrace using a
// pinned solver contract. This is a kinematic PLAUSIBILITY checker, not a
// force/momentum/collision engine -- straight-line start/end positions and
// time windows, checked against sourced or explicitly-estimated physics
// profiles. Level 2 ("real-time dynamics") is a distinct, future,
// out-of-scope system per the design spec.

import { validatePhysicsProfile } from "./physicsProfileSchema.js";
import { versionedContentHash } from "../canonicalHash.js";
import {
  DETECTORS_VERSION,
  detectTeleportation, detectImpossibleAcceleration, detectImpossibleStopping,
  detectImpossibleTurning, detectPossibleBoardContact,
  detectUnreachablePass, detectIllegalBounds, detectOverlappingActorActions,
  detectInconsistentPossession, detectPossibleInterception,
} from "./hardFailureDetectors.js";
import { isUnsupportedModel, SEVERITY } from "./findings.js";
import { rinkProfile } from "../rinkFrame.js";

export const SIMULATOR_VERSION = "level1-simulator-v1";

// Pinned solver contract -- declared and versioned explicitly, per the
// spec's requirement, even for the fields Level 1 doesn't currently need.
export const SOLVER_CONTRACT = Object.freeze({
  version: SIMULATOR_VERSION,
  // Level-1 kinematic bounds-checking is fully deterministic given a
  // ScenarioDefinition -- no randomness is consumed anywhere in this
  // solver. Declared explicitly ("none", not omitted) so the contract is
  // complete and auditable rather than silently missing a field; a future
  // solver revision that DOES need randomness (e.g. sampled physics noise)
  // must bump this version and declare a real algorithm/seed-order here.
  rngAlgorithm: "none",
  rngVersion: null,
  seedConsumptionOrder: null,
  // Actions are resolved in the definition's own array order (already
  // enforced non-decreasing by startTime in scenarioDefinition.js). Ties
  // (identical startTime) resolve in array-index order -- stable, since JS
  // array iteration order is itself stable and no sort is applied here.
  tieBreaking: "array-index-order",
  floatPolicy: "round6", // matches rinkFrame.js's own rounding convention
  coordinatePrecision: "rink-frame-native-metres",
  candidateIdDerivation: "versionedContentHash(kind='simulation-trace', version=SIMULATOR_VERSION, value={definitionId, definitionVersion, definitionContentHash})",
});

function round6(n) {
  return Math.round(n * 1e6) / 1e6;
}

function actorPosition(def, actorId) {
  return def.initialState.actors.find((a) => a.id === actorId)?.position ?? null;
}

// Fixed-step linear-interpolation samples between an action's declared
// start and end. Level-1 simplification, documented: real skating paths
// curve and accelerate non-uniformly; this produces a deterministic,
// reproducible approximation sufficient for kinematic bounds-checking and
// downstream playback, not a physically simulated trajectory.
const SAMPLE_STEP_S = 0.5;

function sampleAction(action, fromPos) {
  if (!action.toPosition || action.endTime === undefined) return [];
  const duration = action.endTime - action.startTime;
  if (duration <= 0) return [{ t: action.startTime, pos: fromPos }];
  const samples = [];
  for (let t = action.startTime; t < action.endTime; t += SAMPLE_STEP_S) {
    const frac = (t - action.startTime) / duration;
    samples.push({
      t: round6(t),
      pos: [round6(fromPos[0] + (action.toPosition[0] - fromPos[0]) * frac), round6(fromPos[1] + (action.toPosition[1] - fromPos[1]) * frac)],
    });
  }
  samples.push({ t: round6(action.endTime), pos: [round6(action.toPosition[0]), round6(action.toPosition[1])] });
  return samples;
}

// Resolve one ScenarioDefinition + one physics profile into a
// SimulationTrace. Synchronous and pure except for the final content hash
// (canonicalHash.js's Web Crypto call is async) -- callers await the
// returned promise.
export async function simulate(def, physicsProfile) {
  const profileCheck = validatePhysicsProfile(physicsProfile);
  if (!profileCheck.ok) {
    throw new Error(`simulate: invalid physics profile -- ${profileCheck.errs.join("; ")}`);
  }
  const rinkFrameProfile = rinkProfile(physicsProfile.rinkFrameProfileId);
  const profileWithFrame = { ...physicsProfile, rinkFrameProfile };

  const findings = [];
  const samples = [];
  // Track each actor's running position across actions -- an action's
  // "from" is the actor's position after their own previous action (or
  // their initial position, if this is their first).
  const lastPosition = new Map(def.initialState.actors.map((a) => [a.id, a.position]));
  // Track each actor's previous action + the fromPos it used, so
  // detectImpossibleTurning can compare consecutive headings.
  const lastActionByActor = new Map();

  def.intendedActions.forEach((action, actionIndex) => {
    const fromPos = action.kind === "pass" || action.kind === "shot"
      ? (lastPosition.get(action.actorId) ?? actorPosition(def, action.actorId))
      : (lastPosition.get(action.actorId) ?? actorPosition(def, action.actorId));

    const checks = [
      detectTeleportation(action, actionIndex, fromPos),
      detectImpossibleAcceleration(action, actionIndex, fromPos, profileWithFrame),
      detectImpossibleStopping(action, actionIndex, fromPos, profileWithFrame, def.decisionFreeze?.time),
      detectUnreachablePass(action, actionIndex, fromPos, profileWithFrame),
      detectIllegalBounds(action, actionIndex, profileWithFrame),
      detectPossibleBoardContact(action, actionIndex, fromPos, profileWithFrame),
      ...(detectPossibleInterception(action, actionIndex, def, fromPos, profileWithFrame) || []),
    ];
    const prev = lastActionByActor.get(action.actorId);
    if (prev) {
      checks.push(detectImpossibleTurning(prev.action, action, prev.fromPos, fromPos, profileWithFrame));
    }
    for (const c of checks) if (c) findings.push(c);

    if (action.toPosition) {
      lastPosition.set(action.actorId, action.toPosition);
      samples.push(...sampleAction(action, fromPos).map((s) => ({ ...s, actorId: action.actorId, puck: ["pass", "shot"].includes(action.kind) })));
    }
    lastActionByActor.set(action.actorId, { action, fromPos });
  });

  findings.push(...detectOverlappingActorActions(def.intendedActions));
  findings.push(...detectInconsistentPossession(def.intendedActions));

  const hardFailures = findings.filter((f) => !isUnsupportedModel(f) && f.severity === SEVERITY.HARD_FAILURE);
  const unsupportedModelCount = findings.filter(isUnsupportedModel).length;

  const traceId = await versionedContentHash("simulation-trace", SIMULATOR_VERSION, {
    definitionId: def.id,
    definitionVersion: def.version,
    definitionContentHash: def.contentHash,
    profileId: physicsProfile.id,
  });

  return Object.freeze({
    schemaVersion: "simulation-trace-v1",
    solverContract: SOLVER_CONTRACT,
    definitionId: def.id,
    definitionVersion: def.version,
    physicsProfileId: physicsProfile.id,
    physicsClean: hardFailures.length === 0,
    findings,
    unsupportedModelCount,
    samples,
    canonicalTraceHash: traceId,
  });
}
