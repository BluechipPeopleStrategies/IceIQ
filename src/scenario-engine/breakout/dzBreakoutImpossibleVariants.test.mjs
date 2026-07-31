#!/usr/bin/env node
// Run: node src/scenario-engine/breakout/dzBreakoutImpossibleVariants.test.mjs
import { readFileSync } from "node:fs";
import {
  DZ_BREAKOUT_IMPOSSIBLE_VARIANTS, BAD_SKATING_SPEED_VARIANT, IMPOSSIBLE_TURN_VARIANT,
  MISTIMED_PASS_VARIANT, CLOSED_LANE_CLAIMED_OPEN_VARIANT,
} from "./dzBreakoutImpossibleVariants.js";
import { validateScenarioDefinition } from "../scenarioDefinition.js";
import { simulate } from "../physics/simulator.js";
import { isUnsupportedModel, SEVERITY } from "../physics/findings.js";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

const u13Profile = JSON.parse(readFileSync(new URL("../physics/profiles/u13.json", import.meta.url), "utf8"));

// ---- contentHash is honestly null, never the original scenario's stale hash ----
// Each variant changes real content (actions or actor positions) -- inheriting
// DZ_BREAKOUT_SCENARIO_DEFINITION's own contentHash verbatim would assert a
// false provenance claim about content the variant doesn't actually have.
// (Caught by Phase 5's adversarial review, 2026-07-31, via a real committed
// blob whose definitionContentHash pointed at the wrong content.)
for (const { variant } of DZ_BREAKOUT_IMPOSSIBLE_VARIANTS) {
  ok(`${variant.id}: contentHash is null, not inherited from the original clean scenario`, variant.contentHash === null);
}
ok("closed-lane-claimed-open: contentHash is also null, not inherited", CLOSED_LANE_CLAIMED_OPEN_VARIANT.contentHash === null);

// ---- Each named hard-failure variant fails with EXACTLY its own specific code --
for (const { variant, expectedHardFailureCode } of DZ_BREAKOUT_IMPOSSIBLE_VARIANTS) {
  ok(`${variant.id}: still passes schema validation (only physics is corrupted)`, validateScenarioDefinition(variant).ok);

  const trace = await simulate(variant, u13Profile);
  ok(`${variant.id}: is NOT physically clean`, !trace.physicsClean);

  const hardFailures = trace.findings.filter((f) => !isUnsupportedModel(f) && f.severity === SEVERITY.HARD_FAILURE);
  ok(`${variant.id}: fails with a REAL hard-failure finding, not a generic rejection`, hardFailures.length > 0);
  ok(`${variant.id}: the hard failure is specifically coded "${expectedHardFailureCode}"`, hardFailures.some((f) => f.validatorCode === expectedHardFailureCode));
  ok(`${variant.id}: the finding names the actor and carries measured/threshold values`, hardFailures.find((f) => f.validatorCode === expectedHardFailureCode).actorId === "D1" && Number.isFinite(hardFailures.find((f) => f.validatorCode === expectedHardFailureCode).measuredValue));
}

// ---- Sanity: the corruptions are actually isolated to their own failure mode ----
{
  const bad = await simulate(BAD_SKATING_SPEED_VARIANT, u13Profile);
  ok("bad-skating-speed does NOT also trip unreachable-pass (isolated corruption)", !bad.findings.some((f) => f.validatorCode === "unreachable-pass" && !isUnsupportedModel(f) && f.severity === SEVERITY.HARD_FAILURE));

  const turn = await simulate(IMPOSSIBLE_TURN_VARIANT, u13Profile);
  ok("impossible-turn does NOT also trip illegal-bounds (target genuinely stays on the ice)", !turn.findings.some((f) => f.validatorCode === "illegal-bounds"));
  ok("impossible-turn does NOT also trip impossible-acceleration (isolated to turning specifically)", !turn.findings.some((f) => f.validatorCode === "impossible-acceleration" && !isUnsupportedModel(f) && f.severity === SEVERITY.HARD_FAILURE));

  const mistimed = await simulate(MISTIMED_PASS_VARIANT, u13Profile);
  ok("mistimed-pass does NOT also trip impossible-turning (isolated corruption)", !mistimed.findings.some((f) => f.validatorCode === "impossible-turning" && !isUnsupportedModel(f) && f.severity === SEVERITY.HARD_FAILURE));
}

// ---- Closed-lane-claimed-open: a genuine WARNING, not a hard failure, not silence --
{
  ok("closed-lane-claimed-open still passes schema validation", validateScenarioDefinition(CLOSED_LANE_CLAIMED_OPEN_VARIANT).ok);
  const trace = await simulate(CLOSED_LANE_CLAIMED_OPEN_VARIANT, u13Profile);
  ok("closed-lane-claimed-open stays physicsClean (interception is advisory, not a hard block, by Phase 2's own design)", trace.physicsClean);
  const interceptions = trace.findings.filter((f) => f.validatorCode === "possible-interception");
  ok("closed-lane-claimed-open produces a real, specific possible-interception WARNING, not silence", interceptions.length > 0 && interceptions.every((f) => f.severity === SEVERITY.WARNING));
  ok("the defender was actually relocated onto the pass line (not a no-op corruption)", JSON.stringify(CLOSED_LANE_CLAIMED_OPEN_VARIANT.initialState.actors.find((a) => a.id === "F1").position) !== JSON.stringify(BAD_SKATING_SPEED_VARIANT.initialState.actors.find((a) => a.id === "F1").position));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
