// Seeded, staged-only parameter space for the approved defensive-zone
// retrieval-under-pressure claim. It emits ScenarioDefinitions; it does not
// write the live bank, catalog, or any promotion destination.

import { SCENARIO_DEFINITION_SCHEMA_VERSION } from "../../scenarioDefinition.js";
import { CLAIM_STATUS, validateTacticalClaim } from "../../tactics/claimSchema.js";
import { contentHash } from "../../canonicalHash.js";
import { filterNovel } from "../../noveltySignature.js";
import { enumerateParameterSpace, selectSeededParameterSets, PARAMETER_SPACE_VERSION } from "../parameterSpace.js";

export const DZ_BREAKOUT_PARAMETER_SPACE = Object.freeze({
  id: "dz-breakout-escape-pressure-v1",
  version: PARAMETER_SPACE_VERSION,
  axes: Object.freeze([
    // F1's distance changes how urgently D1 must use the protection of the
    // net. Values are metres in the canonical RinkFrame.
    // All values stay behind the right goal line so the net remains real
    // protection between the pressure-side forechecker and D1.
    Object.freeze({ id: "forecheckerApproachX", loadBearing: true, values: Object.freeze([20.8, 23.6, 26.2]) }),
    // The escape endpoint is the teaching answer; all values stay on the
    // open side of the net, away from the committed forechecker.
    Object.freeze({ id: "escapeLaneY", loadBearing: true, values: Object.freeze([-2.4, -5.0, -7.6]) }),
    // W1's outlet lane changes both the passing target and the visual cue.
    Object.freeze({ id: "outletLaneY", loadBearing: true, values: Object.freeze([-5.1, -8.3]) }),
  ]),
});

const BASE = Object.freeze({
  d1Start: [28.194, 0],
  d1EscapeX: 26.2128,
  outletX: 16.764,
  f1Y: 6.5532,
  // This is deliberately above the outlet lane in every allowed state. The
  // generated cue says the second forechecker has not closed that lane, so
  // the Level-1 reachability detector must agree with the authored geometry.
  f2: [18.8976, 4],
  goalie: [26.5176, -0.1524],
});
// Pinned to physics-u13-v1's sourced topSpeedMPS. The generator test reads
// that profile and fails if this authored full-speed cue drifts from it.
const U13_FULL_SPEED_MPS = 8.6;
const U13_STOPPING_DISTANCE_M = 8.95;

async function assertApprovedBreakoutClaim(claim) {
  const validation = validateTacticalClaim(claim);
  if (!validation.ok) throw new Error(`invalid tactical claim: ${validation.errs.join("; ")}`);
  if (claim.status !== CLAIM_STATUS.APPROVED || !claim.approval?.approvedBy) {
    throw new Error("an approved tactical claim is required for generation");
  }
  const { contentHash: declaredHash, ...claimContent } = claim;
  if (typeof declaredHash !== "string" || declaredHash !== await contentHash(claimContent)) {
    throw new Error("approved tactical claim content hash does not match its recorded content");
  }
  if (claim.family !== "dz_breakout" || claim.preferredRead?.id !== "escape_open_side") {
    throw new Error("claim does not authorize the defensive-zone escape-open-side family");
  }
}

function readableNumber(value) {
  return String(value).replace("-", "m").replace(".", "p");
}

// The seed records how this finite state was selected for a rollout. It is
// provenance for the batch, not semantic scenario content: the same set of
// load-bearing axes must retain its id/version/content hash if another seed
// happens to select it. Keep the remaining generation parameters because
// they define the parameter-space contract and the actual tactical state.
export function contentForScenarioHash(definition) {
  const { contentHash: ignoredHash, generationParams, ...semanticDefinition } = definition;
  const { seed: ignoredSeed, ...semanticGenerationParams } = generationParams ?? {};
  return {
    ...semanticDefinition,
    generationParams: semanticGenerationParams,
  };
}

async function definitionFromParams(claim, seed, params) {
  const id = [
    "sd_dz_breakout_escape_pressure",
    `fx${readableNumber(params.forecheckerApproachX)}`,
    `ey${readableNumber(params.escapeLaneY)}`,
    `oy${readableNumber(params.outletLaneY)}`,
  ].join("_");
  const escapeTarget = [BASE.d1EscapeX, params.escapeLaneY];
  const outletTarget = [BASE.outletX, params.outletLaneY];
  const forecheckerCommitTarget = [params.forecheckerApproachX, 0];
  const forecheckerCommitDuration = BASE.f1Y / U13_FULL_SPEED_MPS;
  const forecheckerStopTarget = [params.forecheckerApproachX, -U13_STOPPING_DISTANCE_M];
  const forecheckerStopDuration = (2 * U13_STOPPING_DISTANCE_M) / U13_FULL_SPEED_MPS;

  const definition = {
    schemaVersion: SCENARIO_DEFINITION_SCHEMA_VERSION,
    id,
    version: 1,
    contentHash: null,
    family: "dz_breakout",
    tacticalClaimVersion: `${claim.id}@v${claim.version}`,
    proofMode: "approved-claim-derived",
    ageSkillProfile: "u13",
    sources: claim.sources.map(({ note, cite, url }) => ({ note, cite, ...(url ? { url } : {}) })),
    rinkFrame: { profileId: "nhl-200x85-v1", units: "metres", attackingDirection: "+x" },
    initialState: {
      actors: [
        { id: "D1", team: "home", role: "puckCarrier", position: BASE.d1Start },
        { id: "W1", team: "home", role: "support", position: outletTarget },
        // The approved claim requires F1 to be ALREADY at full speed at the
        // decision frame. `velocity` captures that observable state; the
        // intended actions below remain the puck carrier's correct outcome.
        { id: "F1", team: "away", role: "defender", position: [params.forecheckerApproachX, BASE.f1Y], velocity: [0, -U13_FULL_SPEED_MPS], facing: -Math.PI / 2 },
        { id: "F2", team: "away", role: "defender", position: BASE.f2 },
        { id: "G", team: "home", role: "goalie", position: BASE.goalie },
      ],
      puck: { position: BASE.d1Start },
    },
    intendedActions: [
      // The speed exists at the decision frame (initial-state velocity),
      // carries F1 down the pressure side of the net, then is explicitly
      // braked across the profile's sourced stopping distance. Both segments
      // enter the deterministic trace used by downstream playback.
      { actorId: "F1", kind: "skate", motionModel: "constant-velocity", startTime: 0, endTime: forecheckerCommitDuration, toPosition: forecheckerCommitTarget },
      { actorId: "D1", kind: "skate", startTime: 0, endTime: 3, toPosition: escapeTarget },
      { actorId: "F1", kind: "skate", motionModel: "decelerate-to-rest", initialVelocity: [0, -U13_FULL_SPEED_MPS], startTime: forecheckerCommitDuration, endTime: forecheckerCommitDuration + forecheckerStopDuration, toPosition: forecheckerStopTarget },
      { actorId: "D1", kind: "pass", startTime: 3, endTime: 4, toPosition: outletTarget },
    ],
    decisionFreeze: {
      time: 6,
      observableCues: [
        "F1 is already at full speed toward the pressure side of the net, leaving the net-protected open-side escape lane available.",
        "F2 remains above the outlet lane and cannot reach the outlet before the puck arrives.",
        "The net remains between D1 and F1's committed approach.",
      ],
    },
    declaredRead: {
      actorId: "D1",
      description: "Take the puck around the net to the side the forechecker has turned away from, then outlet to W1.",
    },
    questionKindVariants: [
      {
        kind: "lane-pick",
        ageBands: claim.ageSkillApplicability.ageBands,
        copy: {
          q: "The first forechecker has committed to one side of the net. Tap the ice where you take the puck to escape pressure.",
        },
      },
    ],
    generationParams: {
      generatorVersion: PARAMETER_SPACE_VERSION,
      parameterSpaceId: DZ_BREAKOUT_PARAMETER_SPACE.id,
      seed,
      loadBearingAxes: params,
    },
    dependencyVersions: {
      rinkFrame: "rink-frame-v1",
      physicsProfile: "physics-u13-v1",
      tacticalClaim: `${claim.id}@v${claim.version}`,
      parameterSpace: `${DZ_BREAKOUT_PARAMETER_SPACE.id}@${PARAMETER_SPACE_VERSION}`,
    },
  };

  return { ...definition, contentHash: await contentHash(contentForScenarioHash(definition)) };
}

export async function generateDzBreakoutDefinitions({ claim, seed = 1, count = 18, existingDefinitions = [] } = {}) {
  await assertApprovedBreakoutClaim(claim);
  const totalStates = enumerateParameterSpace(DZ_BREAKOUT_PARAMETER_SPACE).length;
  if (!Number.isInteger(count) || count < 1 || count > totalStates) {
    throw new Error(`count must be an integer between 1 and ${totalStates}`);
  }

  // Shuffle the full finite space first, then ask the novelty gate for the
  // first count states that are not already in the supplied staged corpus.
  // This makes the seed reproducible while preventing a re-run from quietly
  // returning an existing scenario state.
  const orderedSets = selectSeededParameterSets(DZ_BREAKOUT_PARAMETER_SPACE, { seed, count: totalStates });
  const generated = await Promise.all(orderedSets.map((params) => definitionFromParams(claim, seed, params)));
  const novelty = filterNovel(generated, existingDefinitions);
  if (novelty.kept.length < count) {
    throw new Error(`only ${novelty.kept.length} novel states remain in ${DZ_BREAKOUT_PARAMETER_SPACE.id}; requested ${count}`);
  }
  return novelty.kept.slice(0, count);
}
