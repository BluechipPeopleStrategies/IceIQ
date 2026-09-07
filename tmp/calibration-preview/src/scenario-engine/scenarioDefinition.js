// ScenarioDefinition: the immutable, renderer-independent authoring or
// generation input, per the spec's "Canonical scenario bundle" section.
// Phase 1 scope only: schema shape + structural validation. No physics, no
// tactical evaluation, no hashing side effects -- those are Phase 2+.
//
// Field list is exactly the spec's own list:
//   schema version, stable scenario ID, immutable version, content hash;
//   family, tactical claim version, proof mode, age/skill profile, sources;
//   rink frame/profile and canonical physical units;
//   initial actor and puck state;
//   time-ordered intended actions;
//   decision freeze and observable cues;
//   declaredRead;
//   question-kind variants and age-translated copy;
//   generation parameters and dependency versions.
//
// Returns { ok, errs, warns } -- the same shape validateAnimatedPlay() and
// validateFactoryStandards() already use catalog-wide, so factory tooling
// can treat every validator in this codebase the same way.

import { rinkProfile, isWithinBounds } from "./rinkFrame.js";
import { canonicalStringify } from "./canonicalHash.js";

export const SCENARIO_DEFINITION_SCHEMA_VERSION = "scenario-definition-v1";

const PROOF_MODES = new Set(["kernel-derived", "approved-claim-derived", "coach-declared"]);
const MOTION_MODELS = new Set(["accelerate-from-rest", "constant-velocity", "decelerate-to-rest"]);

function isFiniteXY(point) {
  return Array.isArray(point) && point.length === 2 && point.every((n) => typeof n === "number" && Number.isFinite(n));
}

export function validateScenarioDefinition(def) {
  const errs = [];
  const warns = [];

  if (!def || typeof def !== "object") {
    return { ok: false, errs: ["definition is not an object"], warns: [] };
  }

  if (def.schemaVersion !== SCENARIO_DEFINITION_SCHEMA_VERSION) {
    errs.push(`schemaVersion must be "${SCENARIO_DEFINITION_SCHEMA_VERSION}", got ${JSON.stringify(def.schemaVersion)}`);
  }
  if (!def.id || typeof def.id !== "string") errs.push("missing stable scenario id");
  if (!Number.isInteger(def.version) || def.version < 1) errs.push("version must be a positive integer");
  if (def.contentHash !== null && typeof def.contentHash !== "string") {
    errs.push("contentHash must be a string once computed, or null before it's computed");
  }
  if (!def.family || typeof def.family !== "string") errs.push("missing family");
  if (def.tacticalClaimVersion !== null && typeof def.tacticalClaimVersion !== "string") {
    errs.push("tacticalClaimVersion must be a string reference or null (Phase 4 has not run yet)");
  }
  if (!PROOF_MODES.has(def.proofMode)) {
    errs.push(`proofMode must be one of ${[...PROOF_MODES].join("/")}, got ${JSON.stringify(def.proofMode)}`);
  }
  if (!def.ageSkillProfile || typeof def.ageSkillProfile !== "string") errs.push("missing ageSkillProfile");

  if (!Array.isArray(def.sources) || def.sources.length === 0) {
    errs.push("sources must be a non-empty array");
  } else {
    def.sources.forEach((s, i) => {
      if (!s?.note || !s?.cite) errs.push(`sources[${i}] needs note and cite`);
    });
  }

  // Rink frame reference + canonical units.
  let profile = null;
  if (!def.rinkFrame?.profileId) {
    errs.push("missing rinkFrame.profileId");
  } else {
    try {
      profile = rinkProfile(def.rinkFrame.profileId);
    } catch (e) {
      errs.push(`rinkFrame.profileId: ${e.message}`);
    }
  }
  if (def.rinkFrame && def.rinkFrame.units !== "metres") {
    errs.push(`rinkFrame.units must be "metres", got ${JSON.stringify(def.rinkFrame.units)}`);
  }
  // Per spec: "attacking direction stored explicitly as +x or -x." This is a
  // property of THIS scenario instance (the same symmetric rink profile can
  // be attacked either way -- see rinkFrame.js), not of the profile itself.
  if (def.rinkFrame && !["+x", "-x"].includes(def.rinkFrame.attackingDirection)) {
    errs.push(`rinkFrame.attackingDirection must be "+x" or "-x", got ${JSON.stringify(def.rinkFrame?.attackingDirection)}`);
  }

  // Initial actor + puck state.
  const actorIds = new Set();
  if (!Array.isArray(def.initialState?.actors) || def.initialState.actors.length < 1) {
    errs.push("initialState.actors must be a non-empty array");
  } else {
    def.initialState.actors.forEach((a, i) => {
      if (!a?.id) { errs.push(`initialState.actors[${i}] missing id`); return; }
      if (actorIds.has(a.id)) errs.push(`initialState.actors[${i}] duplicate actor id ${a.id}`);
      actorIds.add(a.id);
      if (!isFiniteXY(a.position)) {
        errs.push(`initialState.actors[${a.id}].position must be [x,y] metres`);
      } else if (profile && !isWithinBounds(a.position, profile)) {
        errs.push(`initialState.actors[${a.id}].position is outside the rink profile's playable bounds`);
      }
      if (a.facing !== undefined && !Number.isFinite(a.facing)) {
        errs.push(`initialState.actors[${a.id}].facing must be a finite radian angle if present`);
      }
      if (a.velocity !== undefined && !isFiniteXY(a.velocity)) {
        errs.push(`initialState.actors[${a.id}].velocity must be a finite [x,y] metres-per-second vector if present`);
      }
      // Per spec, actor state includes "position, velocity, facing, role,
      // body/stick envelope, reach, and possession." Phase 1 only has
      // enough context to check the fields present at authoring time --
      // role is one of them and was silently unchecked before adversarial
      // review (2026-07-30) caught it (every real fixture already carries
      // one; this just stops a definition missing it from validating clean).
      if (!a.role || typeof a.role !== "string") {
        errs.push(`initialState.actors[${a.id}].role is required`);
      }
    });
  }
  if (!def.initialState?.puck || !isFiniteXY(def.initialState.puck.position)) {
    errs.push("initialState.puck.position must be [x,y] metres");
  } else if (profile && !isWithinBounds(def.initialState.puck.position, profile)) {
    errs.push("initialState.puck.position is outside the rink profile's playable bounds");
  }

  // Time-ordered intended actions.
  if (!Array.isArray(def.intendedActions)) {
    errs.push("intendedActions must be an array (may be empty for a static freeze-only definition)");
  } else {
    let lastStart = -Infinity;
    def.intendedActions.forEach((action, i) => {
      if (!action?.actorId || !actorIds.has(action.actorId)) {
        errs.push(`intendedActions[${i}].actorId must reference a declared actor`);
      }
      if (!action?.kind || typeof action.kind !== "string") errs.push(`intendedActions[${i}] missing kind`);
      if (action?.motionModel !== undefined && !MOTION_MODELS.has(action.motionModel)) {
        errs.push(`intendedActions[${i}].motionModel must be one of ${[...MOTION_MODELS].join("/")} if present`);
      }
      if (action?.initialVelocity !== undefined && !isFiniteXY(action.initialVelocity)) {
        errs.push(`intendedActions[${i}].initialVelocity must be a finite [x,y] metres-per-second vector if present`);
      }
      if (!Number.isFinite(action?.startTime) || action.startTime < 0) {
        errs.push(`intendedActions[${i}].startTime must be a non-negative number of seconds`);
      } else {
        if (action.startTime < lastStart) {
          errs.push(`intendedActions[${i}].startTime (${action.startTime}) is out of time order (previous was ${lastStart})`);
        }
        lastStart = action.startTime;
      }
      if (action?.endTime !== undefined && (!Number.isFinite(action.endTime) || action.endTime < action.startTime)) {
        errs.push(`intendedActions[${i}].endTime must be >= startTime if present`);
      }
      // Optional: the position this action's actor (or the puck, for a
      // pass/shot) should reach by endTime. Not required by this schema --
      // a definition can describe an action without a physically-checkable
      // claim (e.g. a hold/wait) -- but the Phase 2 simulator requires it
      // for movement kinds ("skate"/"pass"/"shot") to compute required
      // speed/acceleration, and will itself flag a missing one as
      // UNSUPPORTED_MODEL rather than silently skipping the check.
      if (action?.toPosition !== undefined && !isFiniteXY(action.toPosition)) {
        errs.push(`intendedActions[${i}].toPosition must be [x,y] metres if present`);
      } else if (action?.toPosition && profile && !isWithinBounds(action.toPosition, profile)) {
        errs.push(`intendedActions[${i}].toPosition is outside the rink profile's playable bounds`);
      }
    });
  }

  // Decision freeze + observable cues.
  if (!Number.isFinite(def.decisionFreeze?.time) || def.decisionFreeze.time < 0) {
    errs.push("decisionFreeze.time must be a non-negative number of seconds");
  }
  if (!Array.isArray(def.decisionFreeze?.observableCues)) {
    errs.push("decisionFreeze.observableCues must be an array (may be empty, but must be present -- the freeze frame's whole point is stating what's visible)");
  }

  // Declared read -- intent, supplied by a kernel or coach.
  if (!def.declaredRead || typeof def.declaredRead.description !== "string" || !def.declaredRead.description) {
    errs.push("declaredRead.description is required");
  }
  if (def.declaredRead && def.declaredRead.actorId !== undefined && !actorIds.has(def.declaredRead.actorId)) {
    errs.push("declaredRead.actorId, if present, must reference a declared actor");
  }

  // Question-kind variants + age-translated copy.
  if (!Array.isArray(def.questionKindVariants) || def.questionKindVariants.length === 0) {
    errs.push("questionKindVariants must be a non-empty array");
  } else {
    def.questionKindVariants.forEach((v, i) => {
      if (!v?.kind || typeof v.kind !== "string") errs.push(`questionKindVariants[${i}] missing kind`);
      if (!v?.ageBands || !Array.isArray(v.ageBands) || v.ageBands.length === 0) {
        errs.push(`questionKindVariants[${i}] missing non-empty ageBands`);
      }
      // Spec: "question-kind variants AND age-translated copy" -- the copy
      // half was silently unchecked before adversarial review (2026-07-30):
      // a variant with age bands but zero translated text passed cleanly.
      // `copy.q` is the required baseline (matches the existing catalog's
      // own q/youngQ convention); per-age-band overrides (e.g. `copy.U7`)
      // are allowed but not required at this schema level.
      if (!v?.copy || typeof v.copy !== "object") {
        errs.push(`questionKindVariants[${i}] missing copy (age-translated question text)`);
      } else if (!v.copy.q || typeof v.copy.q !== "string") {
        errs.push(`questionKindVariants[${i}].copy.q is required (the default/adult-register question text)`);
      }
    });
  }

  // Generation parameters + dependency versions.
  if (def.generationParams !== null && typeof def.generationParams !== "object") {
    errs.push("generationParams must be an object or null (null for a hand-authored/coach-declared definition)");
  }
  if (!def.dependencyVersions || typeof def.dependencyVersions !== "object") {
    errs.push("dependencyVersions must be an object (may be sparse this early, but must be present)");
  }

  return { ok: errs.length === 0, errs, warns };
}

// Deterministic key ordering for hashing/diffing -- delegates to the shared
// canonical serializer so every artifact type stays consistent.
export function canonicalScenarioDefinitionString(def) {
  return canonicalStringify(def);
}
