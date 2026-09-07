// Physics-profile schema + validator, per Phase 2 Task 2: "one independently
// versioned document per {rink/rules geometry, player envelopes, skating
// performance, puck/ice/board/net parameters, age band, optional skill
// tier}." Every numeric parameter carries a `source` tag -- never a bare
// number -- per the Phase 2 exit gate's own requirement.
//
// Sourcing record: docs/scenario-engine/physics-sourcing.md

export const PHYSICS_PROFILE_SCHEMA_VERSION = "physics-profile-v1";

// A parameter is never a bare number -- always {value, source, citation}
// (stdDev optional, present when the source reports one).
const VALID_SOURCE_TAGS = new Set([
  "cited",
  "derived-from-citation",
  // Distinct from derived-from-citation: the input this value was computed
  // from is ITSELF an estimate (e.g. U7/U9's accel0to10mS), not a real
  // citation -- tagging the derived value "derived-from-citation" would
  // misleadingly imply it traces back to real data. Added after
  // adversarial review (2026-07-30) caught this exact mislabeling.
  "derived-from-estimate",
  "engineering-estimate-pending-source",
  "engineering-estimate-pending-source-general-athlete-proxy",
]);

function validateParameter(param, path, errs) {
  if (!param || typeof param !== "object") {
    errs.push(`${path} must be an object with value/source/citation`);
    return;
  }
  if (!Number.isFinite(param.value)) errs.push(`${path}.value must be a finite number`);
  if (!VALID_SOURCE_TAGS.has(param.source)) {
    errs.push(`${path}.source must be one of ${[...VALID_SOURCE_TAGS].join("/")}, got ${JSON.stringify(param.source)}`);
  }
  if (!param.citation || typeof param.citation !== "string") {
    errs.push(`${path}.citation is required -- every constant cites a source or states the estimate method, never bare`);
  }
  if (param.stdDev !== undefined && !Number.isFinite(param.stdDev)) {
    errs.push(`${path}.stdDev must be a finite number if present`);
  }
}

const PLAYER_PARAMS = ["topSpeedMPS", "accel0to10mS", "avgAccelMPS2", "turningRadiusM", "stoppingDistanceM", "reactionDelayS"];
const PUCK_PARAMS = ["passSpeedMPS", "iceDecelerationMPS2"];

export function validatePhysicsProfile(profile) {
  const errs = [];
  if (!profile || typeof profile !== "object") {
    return { ok: false, errs: ["profile is not an object"], warns: [] };
  }
  if (profile.schemaVersion !== PHYSICS_PROFILE_SCHEMA_VERSION) {
    errs.push(`schemaVersion must be "${PHYSICS_PROFILE_SCHEMA_VERSION}", got ${JSON.stringify(profile.schemaVersion)}`);
  }
  if (!profile.id || typeof profile.id !== "string") errs.push("missing id");
  if (!profile.ageBand || typeof profile.ageBand !== "string") errs.push("missing ageBand");
  if (profile.skillTier !== null && typeof profile.skillTier !== "string") {
    errs.push("skillTier must be a string or null (null = no skill-tier split yet)");
  }
  if (!profile.rinkFrameProfileId || typeof profile.rinkFrameProfileId !== "string") {
    errs.push("missing rinkFrameProfileId");
  }

  if (!profile.player || typeof profile.player !== "object") {
    errs.push("missing player block");
  } else {
    for (const key of PLAYER_PARAMS) validateParameter(profile.player[key], `player.${key}`, errs);
    if (profile.player.topSpeedMPS?.value <= 0) errs.push("player.topSpeedMPS.value must be positive");
    if (profile.player.reactionDelayS?.value < 0) errs.push("player.reactionDelayS.value must be non-negative");
  }

  if (!profile.puck || typeof profile.puck !== "object") {
    errs.push("missing puck block");
  } else {
    for (const key of PUCK_PARAMS) validateParameter(profile.puck[key], `puck.${key}`, errs);
  }

  if (!profile.dependencyVersions || typeof profile.dependencyVersions !== "object") {
    errs.push("missing dependencyVersions");
  }

  return { ok: errs.length === 0, errs, warns: [] };
}
