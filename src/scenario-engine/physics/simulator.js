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
  detectImpossibleSampledAcceleration, detectImpossibleSpeed,
  detectMotionModelVelocityConsistency,
} from "./hardFailureDetectors.js";
import { isUnsupportedModel, SEVERITY } from "./findings.js";
import { rinkProfile } from "../rinkFrame.js";

// v2 (2026-07-31): output-changing fixes found by Phase 3's adversarial
// review -- (a) a puck-carrying actor's own skate/carry actions now mirror
// into the puck's own track (previously the puck had ZERO samples unless
// an explicit pass/shot action existed, even though it was riding along
// with its carrier the whole time); (b) samples now carry the real
// action.kind instead of a lossy pass/shot boolean. Both change simulate()'s
// output for existing definitions, so per this module's own solver-contract
// convention (see candidateIdDerivation below), the version bumps.
// v3 (2026-07-31): hardFailureDetectors.js's detectImpossibleTurning now
// skips pass/shot legs (its own v2 changelog) -- a real, previously
// hard-failing skate-then-outlet-pass sequence is now correctly
// UNSUPPORTED_MODEL instead. Detector behavior feeds directly into this
// module's own findings/physicsClean output, so the version bumps here too.
// v4 (2026-08-01): sampleAction now samples the constant-acceleration-from-rest
// curve the detectors certify instead of interpolating linearly, so the emitted
// positions themselves change for every skate action. canonicalTraceHash uses
// this string as its version namespace and does NOT hash the samples, so
// failing to bump here would let a materially different trace keep an identical
// hash -- the bump is what makes the provenance record honest.
// v5 (2026-08-03): runs detectImpossibleSpeed on each skate action's emitted
// samples alongside the sampled-acceleration check. Findings feed physicsClean
// directly, so a definition that previously certified can now hard-fail -- same
// output-changing rule as v3/v4.
// v6 (2026-09-04): adds authored initial-velocity, constant-velocity, and
// decelerate-to-rest segments to the rendered trace, with their declared
// vectors bound to the sampled path. It also measures sampled acceleration at
// interval midpoints, correcting the final short interval of an action. Both
// change trace findings/samples, so the trace identity version must advance.
export const SIMULATOR_VERSION = "level1-simulator-v6";

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

// Fixed-step samples between an action's declared start and end. Level-1
// simplification, documented: real skating paths curve and accelerate
// non-uniformly; this produces a deterministic, reproducible approximation
// sufficient for kinematic bounds-checking and downstream playback, not a
// physically simulated trajectory.
const SAMPLE_STEP_S = 0.5;

// The sampled motion profile must be the SAME model the hard-failure
// detectors certify, or the gate approves a curve that never plays (found
// 2026-08-01: these samples were linear while detectImpossibleAcceleration
// solved d = 0.5*a*t^2 "from rest", so every trace implied a jump from rest to
// full speed inside the first sample step -- unbounded acceleration, and
// invisible because nothing measured the samples).
//
// By default a skater accelerates from rest, so distance grows with the SQUARE
// of elapsed time: d(tau) = 0.5*a*tau^2 with a = 2*d/T^2, which is exactly the
// acceleration detectImpossibleAcceleration checks against the profile cap.
// `constant-velocity` and `decelerate-to-rest` are explicit, vector-bound
// exceptions for an already-moving decision-frame actor. Sampling each model
// makes the certified and played motion the same number by construction.
//
// A pass or shot is NOT from rest -- the puck leaves the stick at speed and
// holds it (Level 1 models no drag), so those stay linear. That split matches
// the detectors, which already skip pass/shot legs for the skater-body checks
// and judge puck flight separately in detectUnreachablePass.
const FROM_REST_KINDS_EXCLUDED = ["pass", "shot"];

function sampleAction(action, fromPos) {
  if (!action.toPosition || action.endTime === undefined) return [];
  const duration = action.endTime - action.startTime;
  if (duration <= 0) return [{ t: action.startTime, pos: fromPos }];
  const acceleratesFromRest = !FROM_REST_KINDS_EXCLUDED.includes(action.kind) && !["constant-velocity", "decelerate-to-rest"].includes(action.motionModel);
  const samples = [];
  for (let t = action.startTime; t < action.endTime; t += SAMPLE_STEP_S) {
    const elapsedFraction = (t - action.startTime) / duration;
    const frac = action.motionModel === "decelerate-to-rest"
      ? 2 * elapsedFraction - elapsedFraction * elapsedFraction
      : (acceleratesFromRest ? elapsedFraction * elapsedFraction : elapsedFraction);
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
  const actorById = new Map(def.initialState.actors.map((actor) => [actor.id, actor]));
  // Track each actor's own BODY position across their skate actions -- an
  // action's "from" is the actor's position after their own previous
  // action (or their initial position, if this is their first). A pass/
  // shot does NOT move the initiating actor's body, so it must never
  // update this map for that actor -- only the puck moved.
  const lastPosition = new Map(def.initialState.actors.map((a) => [a.id, a.position]));
  // The puck's own running position, tracked independently of any single
  // actor -- it moves during pass/shot actions regardless of which actor
  // initiated them. A puck-carrying actor's OWN body position and the
  // puck's position happen to coincide while they're carrying it, but they
  // are not the same tracked quantity (conflating them was a real bug,
  // caught while wiring Phase 3's playback consumers -- see the sample
  // tagging below).
  let lastPuckPosition = def.initialState.puck.position;
  // The actor currently in control of the puck, so THEIR OWN skate/carry
  // actions can mirror into the puck's track too -- a carried puck moves
  // 1:1 with its carrier in this Level-1 model, so it must not sit frozen
  // (or have zero samples at all) while its carrier is visibly skating with
  // it. Starts at whichever actor the definition names puckCarrier.
  // ScenarioDefinition has no "who receives this pass" field, so Level-1
  // genuinely doesn't know who's holding the puck after a pass/shot --
  // possession goes to null (unknown/in-transit) rather than guessing; a
  // null carrier just means later skate actions don't move the puck
  // sample, so it correctly holds at its last known landing spot instead of
  // silently teleporting with whoever skates next. (Caught by both of Phase
  // 3's independent adversarial reviews, 2026-07-31 -- a puck-carrying
  // actor's plain skate action previously produced ZERO puck samples for
  // the entire action, the flagship dz-breakout-carry scenario shape.)
  let puckCarrierId = def.initialState.actors.find((a) => a.role === "puckCarrier")?.id ?? null;
  // Track each actor's previous action + the fromPos it used, so
  // detectImpossibleTurning can compare consecutive headings.
  const lastActionByActor = new Map();

  def.intendedActions.forEach((action, actionIndex) => {
    const isPuckAction = ["pass", "shot"].includes(action.kind);
    const fromPos = isPuckAction
      ? lastPuckPosition
      : (lastPosition.get(action.actorId) ?? actorPosition(def, action.actorId));
    // True when this actor already had the puck going into this action, so
    // their movement carries it along -- computed from the carrier as of
    // BEFORE this action runs, not after.
    const carriesPuck = !isPuckAction && action.actorId === puckCarrierId;
    const declaredVelocity = action.initialVelocity ?? actorById.get(action.actorId)?.velocity;
    const initialSpeedMPS = ["constant-velocity", "decelerate-to-rest"].includes(action.motionModel) && Array.isArray(declaredVelocity)
      ? Math.hypot(declaredVelocity[0], declaredVelocity[1])
      : 0;

    const checks = [
      detectTeleportation(action, actionIndex, fromPos),
      detectImpossibleAcceleration(action, actionIndex, fromPos, profileWithFrame),
      detectImpossibleStopping(action, actionIndex, fromPos, profileWithFrame, def.decisionFreeze?.time),
      detectMotionModelVelocityConsistency(action, actionIndex, fromPos, declaredVelocity, profileWithFrame),
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
      // Puck samples get their OWN track (actorId "puck"), not the
      // initiating actor's, and update the puck's OWN running position, not
      // the actor's -- a pass/shot moves the puck from A to B; the passer's
      // body stays put. Conflating the two was a real bug (both the sample
      // tagging and this position update), caught during Phase 3 while
      // wiring playbackClock.js/animatedPlayV2Adapter.js, which both
      // correctly assume a dedicated "puck" track exists.
      if (isPuckAction) {
        lastPuckPosition = action.toPosition;
        puckCarrierId = null; // in transit -- Level-1 doesn't model who receives it
      } else {
        lastPosition.set(action.actorId, action.toPosition);
        if (carriesPuck) lastPuckPosition = action.toPosition;
      }
      const actionSamples = sampleAction(action, fromPos).map((s) => ({ ...s, actorId: isPuckAction ? "puck" : action.actorId, actionKind: action.kind }));
      samples.push(...actionSamples);

      // Measure the samples this action actually emitted against the same cap
      // its endpoints were judged by. Scoped to ONE action deliberately: Level
      // 1 treats every action as starting from rest and carries no velocity
      // across action boundaries (see this module's header and
      // detectImpossibleAcceleration's "starts from rest" assumption), so an
      // actor legitimately ends one leg at speed and begins the next at zero.
      // Measuring across that seam would report a 12.7 m/s^2 "deceleration"
      // that is an artifact of the Level-1 model, not a claim the content
      // makes. KNOWN LIMITATION, not a fix: a real skater cannot shed 7 m/s
      // instantly either -- cross-action continuity is genuinely unchecked
      // here, and belongs to Level 2 (detectImpossibleStopping covers only the
      // specific case of decelerating before the decision freeze).
      if (!isPuckAction) {
        const sampledAccel = detectImpossibleSampledAcceleration(actionSamples, action.actorId, physicsProfile, { initialSpeedMPS });
        if (sampledAccel) findings.push(sampledAccel);
        // And the speed it accelerates TO. A long route given a generous
        // duration passes the acceleration cap while implying a skater faster
        // than that age band has ever been measured -- the acceleration is
        // fine, the speed is fiction.
        const sampledSpeed = detectImpossibleSpeed(actionSamples, action.actorId, physicsProfile, { initialSpeedMPS });
        if (sampledSpeed) findings.push(sampledSpeed);
      }
      // A carried puck moves with its carrier -- mirror the same samples
      // onto the puck's own track too, so consumers always have a real
      // puck position while it's being skated with, not only during an
      // explicit pass/shot.
      if (carriesPuck) samples.push(...actionSamples.map((s) => ({ ...s, actorId: "puck" })));
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
