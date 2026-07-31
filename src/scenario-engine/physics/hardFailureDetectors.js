// Hard-failure detectors, per Phase 2 Task 5: "teleportation, impossible
// acceleration/turning/stopping, unreachable passes, illegal bounds,
// inconsistent possession, impossible event ordering, claimed-open-lane
// physically intercepted before puck arrival."
//
// Level 1 fidelity ("scenario kinematics," per the design spec, distinct
// from the future Level 2 "real-time dynamics"): every check here reasons
// from straight-line start/end positions and a time window, not full
// continuous-force dynamics. Where a check genuinely can't be performed
// without more model than Level 1 has (no toPosition, no via/waypoint
// curvature data), it returns UNSUPPORTED_MODEL rather than guessing.

import { isWithinBounds } from "../rinkFrame.js";
import { buildFinding, buildUnsupportedModel, SEVERITY, ANSWER_IMPACT } from "./findings.js";

// v2 (2026-07-31): detectImpossibleTurning now skips pass/shot legs (see
// its own comment) -- output-changing, so the version bumps per this
// module's own convention (every caller reads DETECTORS_VERSION as the
// validatorVersion stamped onto each finding).
export const DETECTORS_VERSION = "hard-failure-detectors-v2";

function distance(a, b) {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

function actorPosition(def, actorId) {
  return def.initialState.actors.find((a) => a.id === actorId)?.position ?? null;
}

// --- 1. Teleportation -------------------------------------------------------
// Non-trivial distance covered in near-zero time.
const TELEPORT_MIN_DURATION_S = 0.05;
const TELEPORT_MIN_DISTANCE_M = 0.5; // roughly one body envelope

export function detectTeleportation(action, actionIndex, fromPos) {
  // Only applies to the ACTOR's own skating motion. A pass/shot's
  // toPosition/endTime describe the PUCK's flight, checked separately by
  // detectUnreachablePass against puck physics -- checking it here too
  // would wrongly measure puck distance against the skater's own
  // acceleration cap. Caught while adding turning/board-contact test
  // coverage (2026-07-30): a longer, more realistic pass duration surfaced
  // this latent bug that short test fixtures had been masking.
  if (["pass", "shot"].includes(action.kind)) return null;
  if (!action.toPosition || action.endTime === undefined) {
    return buildUnsupportedModel({
      validatorCode: "teleportation", validatorVersion: DETECTORS_VERSION,
      actorId: action.actorId, actionIndex, eventTime: action.startTime,
      reason: "action has no toPosition/endTime -- no physical claim to check",
    });
  }
  const duration = action.endTime - action.startTime;
  const d = distance(fromPos, action.toPosition);
  if (duration <= TELEPORT_MIN_DURATION_S && d >= TELEPORT_MIN_DISTANCE_M) {
    return buildFinding({
      validatorCode: "teleportation", validatorVersion: DETECTORS_VERSION,
      actorId: action.actorId, actionIndex, eventTime: action.startTime, eventIntervalS: duration,
      measuredValue: duration, threshold: TELEPORT_MIN_DURATION_S, units: "seconds",
      profileId: null, profileVersion: null, solverVersion: DETECTORS_VERSION,
      severity: SEVERITY.HARD_FAILURE, answerImpact: ANSWER_IMPACT.CHANGES_ANSWER,
      explanation: `Actor ${action.actorId} covers ${d.toFixed(2)}m in ${duration.toFixed(3)}s -- physically instantaneous movement, not a skating action.`,
    });
  }
  return null;
}

// --- 2. Impossible acceleration --------------------------------------------
// Level-1 simplification: each action is treated as starting from rest
// (no continuous velocity carried across actions yet -- a real limitation,
// not hidden: see the module comment). Required average acceleration to
// cover the claimed distance in the claimed time, via d = 0.5*a*t^2.
const ACCEL_SAFETY_FACTOR = 1.15; // 15% headroom before flagging -- profiles are means with real variance (stdDev), not hard caps

export function detectImpossibleAcceleration(action, actionIndex, fromPos, profile) {
  // Actor-only -- see detectTeleportation's comment; a pass/shot's distance
  // is the puck's, checked by detectUnreachablePass against puck physics.
  if (["pass", "shot"].includes(action.kind)) return null;
  if (!action.toPosition || action.endTime === undefined) {
    return buildUnsupportedModel({
      validatorCode: "impossible-acceleration", validatorVersion: DETECTORS_VERSION,
      actorId: action.actorId, actionIndex, eventTime: action.startTime,
      reason: "action has no toPosition/endTime -- no physical claim to check",
    });
  }
  const duration = action.endTime - action.startTime;
  if (duration <= 0) return null; // teleportation already covers zero-duration
  const d = distance(fromPos, action.toPosition);
  const requiredAccel = (2 * d) / (duration * duration);
  const cap = profile.player.avgAccelMPS2.value * ACCEL_SAFETY_FACTOR;
  if (requiredAccel > cap) {
    return buildFinding({
      validatorCode: "impossible-acceleration", validatorVersion: DETECTORS_VERSION,
      actorId: action.actorId, actionIndex, eventTime: action.startTime, eventIntervalS: duration,
      measuredValue: requiredAccel, threshold: cap, units: "m/s^2",
      profileId: profile.id, profileVersion: profile.schemaVersion,
      assumptions: ["starts from rest", `${((ACCEL_SAFETY_FACTOR - 1) * 100).toFixed(0)}% headroom over the profile mean`],
      solverVersion: DETECTORS_VERSION, severity: SEVERITY.HARD_FAILURE, answerImpact: ANSWER_IMPACT.CHANGES_ANSWER,
      explanation: `Actor ${action.actorId} (${profile.ageBand}) needs ${requiredAccel.toFixed(2)} m/s^2 to cover ${d.toFixed(2)}m in ${duration.toFixed(2)}s, exceeding this age band's cited/estimated capability (${profile.player.avgAccelMPS2.value} m/s^2, +${((ACCEL_SAFETY_FACTOR - 1) * 100).toFixed(0)}% headroom).`,
    });
  }
  return null;
}

// --- 3. Impossible stopping --------------------------------------------------
// If an actor's action ends and the decision freeze follows shortly after
// with no further action for that actor, check whether the speed reached
// during the action could physically be shed within the gap before freeze,
// via the profile's stoppingDistanceM (converted to a stopping TIME using
// v = a*t against the same avgAccelMPS2 used for acceleration -- the
// "comparable braking to acceleration capability" assumption documented in
// physics-sourcing.md).
export function detectImpossibleStopping(action, actionIndex, fromPos, profile, freezeTime) {
  // Actor-only -- a puck doesn't need to "stop skating" before a freeze.
  if (["pass", "shot"].includes(action.kind)) return null;
  if (!action.toPosition || action.endTime === undefined || !Number.isFinite(freezeTime)) {
    return buildUnsupportedModel({
      validatorCode: "impossible-stopping", validatorVersion: DETECTORS_VERSION,
      actorId: action.actorId, actionIndex, eventTime: action.startTime,
      reason: "action has no toPosition/endTime, or no freeze time given -- no physical claim to check",
    });
  }
  if (action.endTime > freezeTime) return null; // action doesn't need to have stopped by the freeze yet
  const duration = action.endTime - action.startTime;
  if (duration <= 0) return null;
  const d = distance(fromPos, action.toPosition);
  const speedAtEnd = d / duration; // average speed as a proxy for exit speed, Level-1 simplification
  const gapToFreeze = freezeTime - action.endTime;
  // Implied deceleration FROM stoppingDistanceM (topSpeedMPS^2 / (2*stoppingDistanceM))
  // rather than reading avgAccelMPS2 directly -- this is what the comment
  // above always claimed to do; an earlier version silently used
  // avgAccelMPS2 instead, leaving stoppingDistanceM unread anywhere in the
  // engine despite every profile sourcing/citing it (caught by adversarial
  // review, 2026-07-30). Mathematically these are the same number by
  // construction (stoppingDistanceM was itself derived from avgAccelMPS2
  // when the profiles were built), so this is not a behavior change -- it's
  // making the code actually consume the field whose job this is.
  const impliedDecelMPS2 = (profile.player.topSpeedMPS.value ** 2) / (2 * profile.player.stoppingDistanceM.value);
  const stopTimeNeeded = speedAtEnd / impliedDecelMPS2; // v = a*t
  if (stopTimeNeeded > gapToFreeze * ACCEL_SAFETY_FACTOR) {
    return buildFinding({
      validatorCode: "impossible-stopping", validatorVersion: DETECTORS_VERSION,
      actorId: action.actorId, actionIndex, eventTime: action.endTime, eventIntervalS: gapToFreeze,
      measuredValue: stopTimeNeeded, threshold: gapToFreeze, units: "seconds",
      profileId: profile.id, profileVersion: profile.schemaVersion,
      assumptions: ["braking capability comparable to acceleration capability (no direct braking data exists)"],
      solverVersion: DETECTORS_VERSION, severity: SEVERITY.HARD_FAILURE, answerImpact: ANSWER_IMPACT.POSSIBLE,
      explanation: `Actor ${action.actorId} exits the action at ~${speedAtEnd.toFixed(2)} m/s with only ${gapToFreeze.toFixed(2)}s before the decision freeze -- needs ~${stopTimeNeeded.toFixed(2)}s to stop at this age band's estimated braking capability.`,
    });
  }
  return null;
}

// --- 3b. Impossible turning ---------------------------------------------------
// Added after adversarial review (2026-07-30) found turningRadiusM was
// sourced and schema-validated in every profile but never actually checked
// anywhere -- dead data. Geometric check: at the transition between two
// CONSECUTIVE actions for the same actor, a real skater changing heading by
// angle theta needs an arc of length turningRadiusM*theta to do it, not a
// straight-line teleport of direction. If the outgoing segment is too short
// to physically contain that arc, the turn is sharper than this age band's
// estimated turning radius allows.
const TURN_MIN_SEGMENT_M = 0.5; // segments shorter than this can't establish a direction at all -- skip, don't guess

export function detectImpossibleTurning(prevAction, curAction, prevFromPos, curFromPos, profile) {
  // Actor-only, same rule as every other per-actor detector in this file
  // (detectTeleportation, detectImpossibleAcceleration,
  // detectImpossibleStopping all skip pass/shot at their own top) -- a
  // turning-RADIUS constraint is a SKATER-BODY limit. A pass or shot's
  // direction is set by stick/wrist release mechanics, not by how sharply
  // the skater's own body can carve an arc -- a puck can be redirected
  // through a wide angle with no equivalent skating turn at all. This
  // detector was the one exception missing that guard: comparing a skate's
  // heading against a FOLLOWING pass's launch direction (or a pass's
  // direction against a FOLLOWING skate's heading) using the skater's own
  // turningRadiusM produced a false "impossible turn" hard-failure on a
  // real, tactically-normal skate-then-outlet-pass sequence -- caught while
  // adapting the actual dz-breakout play into a ScenarioDefinition for
  // Phase 5 Task 4, 2026-07-31 (the first fixture this session to chain a
  // sharply-angled real pass right after a real skate).
  if (["pass", "shot"].includes(prevAction.kind) || ["pass", "shot"].includes(curAction.kind)) {
    return buildUnsupportedModel({
      validatorCode: "impossible-turning", validatorVersion: DETECTORS_VERSION,
      actorId: curAction.actorId, eventTime: curAction.startTime,
      reason: "a pass/shot's direction is set by release mechanics, not the skater's own turning radius -- not modeled by this detector",
    });
  }
  if (!prevAction.toPosition || !curAction.toPosition) {
    return buildUnsupportedModel({
      validatorCode: "impossible-turning", validatorVersion: DETECTORS_VERSION,
      actorId: curAction.actorId, eventTime: curAction.startTime,
      reason: "one of the two consecutive actions has no toPosition -- no direction to compare",
    });
  }
  const incoming = [prevAction.toPosition[0] - prevFromPos[0], prevAction.toPosition[1] - prevFromPos[1]];
  const outgoing = [curAction.toPosition[0] - curFromPos[0], curAction.toPosition[1] - curFromPos[1]];
  const inLen = Math.hypot(...incoming);
  const outLen = Math.hypot(...outgoing);
  if (inLen < TURN_MIN_SEGMENT_M || outLen < TURN_MIN_SEGMENT_M) return null; // too short to establish a heading either side

  const dot = (incoming[0] * outgoing[0] + incoming[1] * outgoing[1]) / (inLen * outLen);
  const angle = Math.acos(Math.max(-1, Math.min(1, dot))); // radians, clamp for float safety
  const requiredArcLength = profile.player.turningRadiusM.value * angle;
  if (outLen < requiredArcLength / ACCEL_SAFETY_FACTOR) {
    return buildFinding({
      validatorCode: "impossible-turning", validatorVersion: DETECTORS_VERSION,
      actorId: curAction.actorId, eventTime: curAction.startTime,
      measuredValue: outLen, threshold: requiredArcLength, units: "metres",
      profileId: profile.id, profileVersion: profile.schemaVersion,
      assumptions: ["straight-line segments either side of the transition, arc-length turn model", "0.6x lateral-acceleration-fraction assumption baked into turningRadiusM itself (see physics-sourcing.md)"],
      solverVersion: DETECTORS_VERSION, severity: SEVERITY.HARD_FAILURE, answerImpact: ANSWER_IMPACT.CHANGES_ANSWER,
      explanation: `${curAction.actorId} changes heading by ${(angle * 180 / Math.PI).toFixed(0)} degrees into a ${outLen.toFixed(2)}m segment, but this age band's estimated turning radius (${profile.player.turningRadiusM.value}m) needs at least ${requiredArcLength.toFixed(2)}m of arc to execute that turn.`,
    });
  }
  return null;
}

// --- Board contact (explicitly UNSUPPORTED_MODEL, not silently ignored) ----
// Task 6 names "contact model" directly as an example of a phenomenon this
// Level-1 simulator doesn't model. Rather than silently never mentioning
// board bounces, a pass/shot whose path comes close enough to the boards
// that contact is plausible gets an explicit UNSUPPORTED_MODEL marker.
const BOARD_PROXIMITY_M = 1.0;

export function detectPossibleBoardContact(action, actionIndex, fromPos, profile) {
  if (!["pass", "shot"].includes(action.kind) || !action.toPosition) return null;
  const { bounds } = profile.rinkFrameProfile;
  const nearBoards = (p) => (
    p[0] - bounds.minX < BOARD_PROXIMITY_M || bounds.maxX - p[0] < BOARD_PROXIMITY_M
    || p[1] - bounds.minY < BOARD_PROXIMITY_M || bounds.maxY - p[1] < BOARD_PROXIMITY_M
  );
  if (nearBoards(fromPos) || nearBoards(action.toPosition)) {
    return buildUnsupportedModel({
      validatorCode: "board-contact", validatorVersion: DETECTORS_VERSION,
      actorId: action.actorId, puck: true, actionIndex, eventTime: action.startTime,
      reason: `${action.kind} path passes within ${BOARD_PROXIMITY_M}m of the boards -- board-bounce/deflection physics is not modeled at Level 1 (design spec's own named example of an unmodeled phenomenon).`,
    });
  }
  return null;
}

// --- 4. Unreachable pass -----------------------------------------------------
// Puck decelerates via ice friction over the pass; required LAUNCH speed to
// still cover the distance in the claimed time is higher than the average
// speed implied by distance/time. d = v0*t - 0.5*a*t^2 => v0 = (d + 0.5*a*t^2)/t.
export function detectUnreachablePass(action, actionIndex, fromPos, profile) {
  if (!["pass", "shot"].includes(action.kind)) return null;
  if (!action.toPosition || action.endTime === undefined) {
    return buildUnsupportedModel({
      validatorCode: "unreachable-pass", validatorVersion: DETECTORS_VERSION,
      actorId: action.actorId, puck: true, actionIndex, eventTime: action.startTime,
      reason: "pass/shot action has no toPosition/endTime -- no physical claim to check",
    });
  }
  const duration = action.endTime - action.startTime;
  if (duration <= 0) return null;
  const d = distance(fromPos, action.toPosition);
  const decel = profile.puck.iceDecelerationMPS2.value;
  const requiredLaunchSpeed = (d + 0.5 * decel * duration * duration) / duration;
  const cap = profile.puck.passSpeedMPS.value * ACCEL_SAFETY_FACTOR;
  if (requiredLaunchSpeed > cap) {
    return buildFinding({
      validatorCode: "unreachable-pass", validatorVersion: DETECTORS_VERSION,
      actorId: action.actorId, puck: true, actionIndex, eventTime: action.startTime, eventIntervalS: duration,
      measuredValue: requiredLaunchSpeed, threshold: cap, units: "m/s",
      profileId: profile.id, profileVersion: profile.schemaVersion,
      assumptions: ["puck decelerates at the profile's ice-friction rate for the whole path", "no deflection/contact modeled"],
      solverVersion: DETECTORS_VERSION, severity: SEVERITY.HARD_FAILURE, answerImpact: ANSWER_IMPACT.CHANGES_ANSWER,
      explanation: `A ${action.kind} covering ${d.toFixed(2)}m in ${duration.toFixed(2)}s needs a ${requiredLaunchSpeed.toFixed(2)} m/s launch speed accounting for ice deceleration, exceeding this age band's estimated pass-speed capability (${profile.puck.passSpeedMPS.value} m/s).`,
    });
  }
  return null;
}

// --- 5. Illegal bounds -------------------------------------------------------
// Belt-and-suspenders re-check at the simulator level (ScenarioDefinition's
// own validator already checks this at authoring time) -- "reject, never
// clamp" applies here too, per the same spec requirement frameAdapters.js
// implements for presentation frames.
export function detectIllegalBounds(action, actionIndex, profile) {
  if (!action.toPosition) return null;
  if (!isWithinBounds(action.toPosition, profile.rinkFrameProfile)) {
    return buildFinding({
      validatorCode: "illegal-bounds", validatorVersion: DETECTORS_VERSION,
      actorId: action.actorId, actionIndex, eventTime: action.endTime ?? action.startTime,
      measuredValue: 1, threshold: 0, units: "boolean (1=out of bounds)",
      profileId: profile.rinkFrameProfile.id, profileVersion: profile.rinkFrameProfile.version,
      solverVersion: DETECTORS_VERSION, severity: SEVERITY.HARD_FAILURE, answerImpact: ANSWER_IMPACT.CHANGES_ANSWER,
      explanation: `${action.actorId ?? "puck"}'s claimed endpoint ${JSON.stringify(action.toPosition)} is outside the rink's playable bounds.`,
    });
  }
  return null;
}

// --- 6. Impossible event ordering -------------------------------------------
// Two actions for the SAME actor with overlapping time windows -- can't
// skate two directions at once. (Global non-decreasing startTime order is
// already enforced by scenarioDefinition.js; this checks the per-actor
// overlap that a globally-sorted list doesn't rule out.)
export function detectOverlappingActorActions(intendedActions) {
  const findings = [];
  const byActor = new Map();
  intendedActions.forEach((action, i) => {
    if (!byActor.has(action.actorId)) byActor.set(action.actorId, []);
    byActor.get(action.actorId).push({ ...action, index: i });
  });
  for (const [actorId, actions] of byActor) {
    for (let i = 1; i < actions.length; i++) {
      const prev = actions[i - 1];
      const cur = actions[i];
      const prevEnd = prev.endTime ?? prev.startTime;
      if (cur.startTime < prevEnd) {
        findings.push(buildFinding({
          validatorCode: "impossible-event-ordering", validatorVersion: DETECTORS_VERSION,
          actorId, actionIndex: cur.index, eventTime: cur.startTime,
          measuredValue: cur.startTime, threshold: prevEnd, units: "seconds",
          profileId: null, profileVersion: null, solverVersion: DETECTORS_VERSION,
          severity: SEVERITY.HARD_FAILURE, answerImpact: ANSWER_IMPACT.CHANGES_ANSWER,
          explanation: `${actorId}'s action ${cur.index} starts at ${cur.startTime}s, before its own previous action (index ${prev.index}) ends at ${prevEnd}s -- the same actor can't be doing two things at once.`,
        }));
      }
    }
  }
  return findings;
}

// --- 7. Inconsistent possession ---------------------------------------------
// Two pass/shot actions for the puck with overlapping time windows -- the
// puck can't be launched twice at once.
export function detectInconsistentPossession(intendedActions) {
  const findings = [];
  const puckActions = intendedActions
    .map((a, i) => ({ ...a, index: i }))
    .filter((a) => ["pass", "shot"].includes(a.kind));
  for (let i = 1; i < puckActions.length; i++) {
    const prev = puckActions[i - 1];
    const cur = puckActions[i];
    const prevEnd = prev.endTime ?? prev.startTime;
    if (cur.startTime < prevEnd) {
      findings.push(buildFinding({
        validatorCode: "inconsistent-possession", validatorVersion: DETECTORS_VERSION,
        puck: true, actionIndex: cur.index, eventTime: cur.startTime,
        measuredValue: cur.startTime, threshold: prevEnd, units: "seconds",
        profileId: null, profileVersion: null, solverVersion: DETECTORS_VERSION,
        severity: SEVERITY.HARD_FAILURE, answerImpact: ANSWER_IMPACT.CHANGES_ANSWER,
        explanation: `Puck action ${cur.index} (${cur.kind}) starts at ${cur.startTime}s, before the previous puck action (index ${prev.index}) resolves at ${prevEnd}s -- one puck can't be launched twice at once.`,
      }));
    }
  }
  return findings;
}

// --- 8. Claimed-open-lane physically intercepted before puck arrival -------
// Simplified geometric check, WARNING severity (not hard-failure): for each
// pass/shot, could any OTHER actor (not the passer) reach a point on the
// straight-line path before the puck does, using their own top speed from
// their current position? This is a real check but a simplification --
// full lane-openness proof would need reachability over the whole path
// swept by defender positioning, not just straight-line distance to the
// nearest path point, so it's flagged as "possible", not "changes-answer".
export function detectPossibleInterception(action, actionIndex, def, fromPos, profile) {
  if (!["pass", "shot"].includes(action.kind) || !action.toPosition || action.endTime === undefined) return null;
  const duration = action.endTime - action.startTime;
  if (duration <= 0) return null;
  const findings = [];
  for (const actor of def.initialState.actors) {
    if (actor.id === action.actorId) continue;
    // Every actor shares the definition's one physics profile (per spec:
    // "each definition targets exactly one physics age/skill profile").
    // Nearest point on the pass line to this actor's current position.
    const [ax, ay] = actorPosition(def, actor.id);
    const [fx, fy] = fromPos;
    const [tx, ty] = action.toPosition;
    const abx = tx - fx, aby = ty - fy;
    const lenSq = abx * abx + aby * aby || 1;
    const t = Math.max(0, Math.min(1, ((ax - fx) * abx + (ay - fy) * aby) / lenSq));
    const nearest = [fx + abx * t, fy + aby * t];
    const distToLine = distance([ax, ay], nearest);
    const timeAlongPath = t * duration; // when the puck reaches that point, roughly (Level-1 straight-line timing)
    const actorTimeToReach = distToLine / profile.player.topSpeedMPS.value;
    if (actorTimeToReach <= timeAlongPath) {
      findings.push(buildFinding({
        validatorCode: "possible-interception", validatorVersion: DETECTORS_VERSION,
        actorId: actor.id, puck: true, actionIndex, eventTime: action.startTime + timeAlongPath,
        measuredValue: actorTimeToReach, threshold: timeAlongPath, units: "seconds",
        profileId: profile.id, profileVersion: profile.schemaVersion,
        assumptions: ["straight-line reachability from current position only, not full defensive positioning/reaction", "this is a WARNING, not a hard failure -- a simplification, not a proof the lane is closed"],
        solverVersion: DETECTORS_VERSION, severity: SEVERITY.WARNING, answerImpact: ANSWER_IMPACT.POSSIBLE,
        explanation: `${actor.id} could reach the nearest point on ${action.actorId}'s ${action.kind} path (${distToLine.toFixed(2)}m away) in ${actorTimeToReach.toFixed(2)}s, at or before the puck arrives there (~${timeAlongPath.toFixed(2)}s) -- worth a human/tactical-claim check, not treated as disproof on its own.`,
      }));
    }
  }
  return findings;
}
