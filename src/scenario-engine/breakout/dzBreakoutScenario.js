// The real breakout ScenarioDefinition, per Phase 5 Task 4 -- "the first
// point in the whole plan the breakout content itself is touched" (after
// Phase 0's hash-and-record step). Adapted from the LIVE, currently-shipping
// catalog play (src/play/plays/dzBreakoutEscapePressure.js's "retrieval" and
// "escaped" nodes), not invented -- every coordinate below is read directly
// from that file, converted from its 200x85-feet play space into RinkFrame
// metres via Phase 1's own adapter.
//
// Provenance note: docs/factory/breakout-fixture-provenance.md (Phase 0,
// 2026-07-29) recorded this file's git blob hash BEFORE the 2026-07-30
// icon-proximity-shortcut fix (commit 70b6b5e) and a later UI-copy commit
// (ecdc700) -- both landed before this scenario-engine plan's Phase 1 even
// started, as part of separate, already-reviewed, already-pushed work, not
// as a violation of "nothing in this plan touches the breakout content
// before Phase 5 Task 4." This module adapts the CURRENT live file (the
// real source of truth today), not the Phase-0-era snapshot; the Phase 0
// record's job was only to prove scenario-engine Phases 1-4 didn't touch it
// prematurely, which they didn't.
//
// Mapping choice (documented, since the spec doesn't pin the exact
// translation): the live play's UI shows three stages -- an entry skate,
// then a static freeze where the question is asked, then the outcome
// motion. This engine's ScenarioDefinition/decisionFreeze model (already
// used consistently by every Phase 2-4 fixture) instead places
// intendedActions as "what happens if the correct read is chosen" and
// decisionFreeze comfortably AFTER those actions complete -- the same
// "did they have time to settle" semantics Phase 2's detectImpossibleStopping
// already checks against. So: D1's retrieval position is the scenario's
// t=0 state (skipping the live play's own pre-freeze entry glide, which
// carries no decision-relevant physics claim), and the escape+outlet-pass
// sequence is modeled as the actions under evaluation.

import { playSpaceToRinkFrame } from "../frameAdapters.js";
import { SCENARIO_DEFINITION_SCHEMA_VERSION } from "../scenarioDefinition.js";

// Real coordinates, read directly from src/play/plays/dzBreakoutEscapePressure.js
// (retrieval.pos / escaped.pos / escaped.motions), 2026-07-31.
const D1_RETRIEVAL = playSpaceToRinkFrame([192.5, 42.5]);
const D1_ESCAPE = playSpaceToRinkFrame([186, 26]);
const W1_OUTLET = playSpaceToRinkFrame([155, 20]); // = W1's own real position; the outlet pass lands on the winger
const F1_START = playSpaceToRinkFrame([183, 64]);
const F2_START = playSpaceToRinkFrame([162, 42]);
const G_START = playSpaceToRinkFrame([187, 42]);

export const DZ_BREAKOUT_SCENARIO_DEFINITION = Object.freeze({
  schemaVersion: SCENARIO_DEFINITION_SCHEMA_VERSION,
  id: "sd_dz_breakout_escape_pressure_v1",
  version: 1,
  // Computed once via canonicalHash.contentHash() over this object minus
  // this field, matching the same authoring convention Phase 4's tactical
  // claim JSON used. dzBreakoutScenario.test.mjs verifies this stays
  // stable (recomputes to the same value) as a regression check.
  contentHash: "950eb6ac2d803d234b8c3dcc24c54a3cd005ceb2156e694ec9aab7680f046eba",
  family: "dz_breakout", // the REAL, established family id (src/play/playFamilies.js) -- underscore, not the hyphenated form Phase 2/3's own test-only fixtures happened to use
  // Not yet approved (docs/factory/tactics/claims/claim_dz_breakout_retrieval_escape_pressure_v1.json
  // is status:"review-required") -- referenced for traceability regardless,
  // since proofMode below (not this field) is what carries the epistemic
  // status. A caller must not read tacticalClaimVersion as an approval claim.
  tacticalClaimVersion: "claim_dz_breakout_retrieval_escape_pressure_v1@v1",
  proofMode: "coach-declared",
  ageSkillProfile: "u13",
  sources: [
    {
      note: "docs/library/dz-breakout-retrieval-under-pressure.md",
      cite: "USA Hockey ADM breakout and puck-retrieval principles: the retrieving defender uses the net as protection and moves the puck away from pressure rather than through it.",
      url: "https://www.usahockey.com/practiceplans",
    },
    {
      note: "src/play/plays/dzBreakoutEscapePressure.js",
      cite: "The live, field-tested catalog play this ScenarioDefinition adapts -- same positions, same declared read, same wrong-answer set.",
    },
  ],
  rinkFrame: { profileId: "nhl-200x85-v1", units: "metres", attackingDirection: "+x" },
  initialState: {
    actors: [
      { id: "D1", team: "home", role: "puckCarrier", position: D1_RETRIEVAL },
      { id: "W1", team: "home", role: "support", position: W1_OUTLET },
      { id: "F1", team: "away", role: "defender", position: F1_START },
      { id: "F2", team: "away", role: "defender", position: F2_START },
      { id: "G", team: "home", role: "goalie", position: G_START },
    ],
    puck: { position: D1_RETRIEVAL },
  },
  intendedActions: [
    { actorId: "D1", kind: "skate", startTime: 0, endTime: 3, toPosition: D1_ESCAPE },
    { actorId: "D1", kind: "pass", startTime: 3, endTime: 4, toPosition: W1_OUTLET },
  ],
  decisionFreeze: {
    time: 6,
    observableCues: [
      "F1 (the low-side forechecker) has closed to full speed, committed to the low side of the net",
      "F2 (the far-side forechecker) is still approaching, not yet committed to a side",
      "the net sits between D1 and F1's angle of approach",
    ],
  },
  declaredRead: {
    actorId: "D1",
    description: "Take it back around the net to the side the forechecker has turned away from",
  },
  questionKindVariants: [
    {
      kind: "lane-pick",
      ageBands: ["U11", "U13", "U15", "U18"],
      copy: {
        q: "You have the puck behind your net and the first forechecker is charging down one side. Tap the ice where you take the puck.",
      },
    },
  ],
  generationParams: null, // hand-adapted from a live, hand-authored catalog play -- not kernel-generated
  dependencyVersions: {
    rinkFrame: "rink-frame-v1",
    physicsProfile: "physics-u13-v1",
    tacticalClaim: "claim_dz_breakout_retrieval_escape_pressure_v1@v1",
  },
});
