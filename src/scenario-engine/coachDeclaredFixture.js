// The second, simpler coach-declared ScenarioDefinition, per Phase 5 Task 7:
// "a second, simpler scenario with a human-supplied declaredRead, distinct
// from the breakout, to prove the declared/derived comparison on
// non-kernel-derived input." Adapted from the LIVE, currently-shipping
// two_on_one catalog play (src/play/plays/twoOnOneRead.js's "rush" and
// "catch" nodes) and its real source doc (docs/library/odd-man-reads.md),
// not invented -- same rigor as dzBreakoutScenario.js, deliberately a
// different family (two_on_one, not dz_breakout) so this run envelope has
// two genuinely distinct scenarios in it, not two copies of the same shape.
//
// No Phase 4 tactical claim exists yet for two_on_one (Phase 4 only seeded
// the dz_breakout claim) -- tacticalClaimVersion is honestly null, not a
// placeholder reference to something that doesn't exist.

import { playSpaceToRinkFrame } from "./frameAdapters.js";
import { SCENARIO_DEFINITION_SCHEMA_VERSION } from "./scenarioDefinition.js";

// Real coordinates, read directly from src/play/plays/twoOnOneRead.js
// (rush.pos / catch.puck), 2026-07-31.
const F1_START = playSpaceToRinkFrame([146, 60]);
const F2_START = playSpaceToRinkFrame([162, 24]);
const D1_START = playSpaceToRinkFrame([160, 50]);
const G_START = playSpaceToRinkFrame([186, 42]);
const F2_CATCH = playSpaceToRinkFrame([162, 25]); // where the pass actually lands, per the live play's "catch" node

export const TWO_ON_ONE_COACH_DECLARED_DEFINITION = Object.freeze({
  schemaVersion: SCENARIO_DEFINITION_SCHEMA_VERSION,
  id: "sd_two_on_one_backdoor_read_v1",
  version: 1,
  // Computed once via canonicalHash.contentHash() over this object minus
  // this field. coachDeclaredFixture.test.mjs verifies this stays stable
  // (recomputes to the same value) as a regression check.
  contentHash: "db76095c3b0c26347869c7818e5770d0b477d07febcf34479787a6db38bbe14a",
  family: "two_on_one", // the real, established family id (src/play/playFamilies.js)
  tacticalClaimVersion: null, // no Phase 4 machine-readable claim exists yet for two_on_one -- honestly null, not a placeholder
  proofMode: "coach-declared",
  ageSkillProfile: "u11",
  sources: [
    {
      note: "docs/library/odd-man-reads.md",
      cite: "Odd-man rush read: when the lone defender steps to the puck carrier, the support option behind the defender becomes the clean next play.",
      url: "https://www.usahockey.com/smallareagames",
    },
    {
      note: "src/play/plays/twoOnOneRead.js",
      cite: "The live, field-tested catalog play this ScenarioDefinition adapts -- same positions, same declared read.",
    },
  ],
  rinkFrame: { profileId: "nhl-200x85-v1", units: "metres", attackingDirection: "+x" },
  initialState: {
    actors: [
      { id: "F1", team: "home", role: "puckCarrier", position: F1_START },
      { id: "F2", team: "home", role: "support", position: F2_START },
      { id: "D1", team: "away", role: "defender", position: D1_START },
      { id: "G", team: "away", role: "goalie", position: G_START },
    ],
    puck: { position: F1_START },
  },
  intendedActions: [
    { actorId: "F1", kind: "pass", startTime: 0, endTime: 1.2, toPosition: F2_CATCH },
  ],
  decisionFreeze: {
    time: 2,
    observableCues: [
      "the lone defender (D1) has stepped up into F1's shooting lane",
      "F2 is open behind the defender's step, with a clear shooting lane of their own",
    ],
  },
  declaredRead: {
    actorId: "F1",
    description: "Pass across to F2 -- the defender stepped toward you, so the support teammate is open",
  },
  questionKindVariants: [
    {
      kind: "lane-pick",
      ageBands: ["U9", "U11", "U13"],
      copy: { q: "The lone defender steps up to you. What is the best read?" },
    },
  ],
  generationParams: null, // hand-adapted from a live, hand-authored catalog play -- not kernel-generated
  dependencyVersions: {
    rinkFrame: "rink-frame-v1",
    physicsProfile: "physics-u11-v1",
  },
});
