// Deliberately-impossible variants of the real breakout ScenarioDefinition,
// per Phase 5 Task 6: "bad skating speed, impossible turn, mistimed pass,
// closed-lane-claimed-open... asserting each fails with a specific
// structured finding, not a generic rejection." Each variant corrupts
// exactly ONE thing about the real, physically-clean
// DZ_BREAKOUT_SCENARIO_DEFINITION, calibrated (empirically, by running the
// real simulator) so it fails with exactly the named finding and nothing
// else confounding it.
//
// "Closed-lane-claimed-open" is the one variant that does NOT flip
// physicsClean to false -- Phase 2 deliberately built possible-interception
// as a WARNING, not a hard failure ("a near-zero geometric distance doesn't
// silently override... but a sharp disagreement is flagged," see
// hardFailureDetectors.js). This variant proves that WARNING path fires
// correctly on a realistic case, which is real, valuable coverage even
// though it isn't a hard block -- the exit gate's own language
// ("a specific, structured explanation") doesn't require every variant to
// be a hard failure, only that the engine's response is specific and
// structured, never a generic rejection.

import { DZ_BREAKOUT_SCENARIO_DEFINITION } from "./dzBreakoutScenario.js";

// contentHash: null on every variant below, deliberately -- each spreads
// DZ_BREAKOUT_SCENARIO_DEFINITION but changes real content (actions or
// actor positions), so inheriting the ORIGINAL's contentHash verbatim
// would be a provable lie about content this variant doesn't actually
// have. null is the schema's own documented "not yet computed" state
// (scenarioDefinition.js), the honest choice for a derived, corrupted-on-
// purpose test/demo fixture that was never meant to be a separately
// versioned, hash-locked artifact the way the two real fixtures are.
// (Caught by Phase 5's adversarial review, 2026-07-31, via a real
// committed blob whose definitionContentHash pointed at the wrong
// content.)
function withActions(id, intendedActions) {
  return Object.freeze({ ...DZ_BREAKOUT_SCENARIO_DEFINITION, id, contentHash: null, intendedActions });
}

// 1. Bad skating speed: the retrieval skate compressed to 0.3s -- the same
// 5.4m real distance now requires ~120 m/s^2, far beyond U13's ~4.75 cap.
export const BAD_SKATING_SPEED_VARIANT = withActions("sd_dz_breakout_variant_bad_skating_speed", [
  { actorId: "D1", kind: "skate", startTime: 0, endTime: 0.3, toPosition: DZ_BREAKOUT_SCENARIO_DEFINITION.intendedActions[0].toPosition },
  DZ_BREAKOUT_SCENARIO_DEFINITION.intendedActions[1],
]);

// 2. Impossible turn: the outlet pass replaced with a second SKATE at a
// sharp ~90-degree angle into a too-short 5m segment (46.89m of arc is
// needed at U13's turningRadiusM). A genuine skater-body turn, unlike
// variant 4 below or the real scenario's own skate-then-PASS transition
// (which detectImpossibleTurning correctly does NOT apply to, per the
// Phase 5 Task 4 fix).
export const IMPOSSIBLE_TURN_VARIANT = withActions("sd_dz_breakout_variant_impossible_turn", [
  DZ_BREAKOUT_SCENARIO_DEFINITION.intendedActions[0],
  { actorId: "D1", kind: "skate", startTime: 3, endTime: 5, toPosition: [21.560758035914542, -3.1965774080875495] },
]);

// 3. Mistimed pass: the real 9.6m outlet pass compressed to 0.1s, needing
// ~96 m/s launch speed against a ~17 m/s cap.
export const MISTIMED_PASS_VARIANT = withActions("sd_dz_breakout_variant_mistimed_pass", [
  DZ_BREAKOUT_SCENARIO_DEFINITION.intendedActions[0],
  { actorId: "D1", kind: "pass", startTime: 3, endTime: 3.1, toPosition: DZ_BREAKOUT_SCENARIO_DEFINITION.intendedActions[1].toPosition },
]);

// 4. Closed-lane-claimed-open: F1 relocated onto the exact midpoint of the
// D1->W1 outlet-pass line -- the "open" escape is claimed correct, but a
// defender now sits directly on the pass path. Everything else (actions,
// timing) is untouched from the real, clean scenario.
const D1_ESCAPE = DZ_BREAKOUT_SCENARIO_DEFINITION.intendedActions[0].toPosition;
const W1_OUTLET = DZ_BREAKOUT_SCENARIO_DEFINITION.intendedActions[1].toPosition;
const PASS_LINE_MIDPOINT = [(D1_ESCAPE[0] + W1_OUTLET[0]) / 2, (D1_ESCAPE[1] + W1_OUTLET[1]) / 2];
export const CLOSED_LANE_CLAIMED_OPEN_VARIANT = Object.freeze({
  ...DZ_BREAKOUT_SCENARIO_DEFINITION,
  id: "sd_dz_breakout_variant_closed_lane_claimed_open",
  contentHash: null, // see withActions' comment above -- real content changed (F1's position), inheriting the original's hash would be dishonest
  initialState: {
    ...DZ_BREAKOUT_SCENARIO_DEFINITION.initialState,
    actors: DZ_BREAKOUT_SCENARIO_DEFINITION.initialState.actors.map((a) => (a.id === "F1" ? { ...a, position: PASS_LINE_MIDPOINT } : a)),
  },
});

export const DZ_BREAKOUT_IMPOSSIBLE_VARIANTS = Object.freeze([
  { variant: BAD_SKATING_SPEED_VARIANT, expectedHardFailureCode: "impossible-acceleration" },
  { variant: IMPOSSIBLE_TURN_VARIANT, expectedHardFailureCode: "impossible-turning" },
  { variant: MISTIMED_PASS_VARIANT, expectedHardFailureCode: "unreachable-pass" },
]);
