#!/usr/bin/env node
// Run: node src/scenario-engine/physics/simulator.test.mjs
import { readFileSync } from "node:fs";
import { simulate, SOLVER_CONTRACT } from "./simulator.js";
import { isUnsupportedModel, SEVERITY } from "./findings.js";
import { playSpaceToRinkFrame } from "../frameAdapters.js";
import { SCENARIO_DEFINITION_SCHEMA_VERSION } from "../scenarioDefinition.js";
import { rinkProfile } from "../rinkFrame.js";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

const u13Profile = JSON.parse(readFileSync(new URL("./profiles/u13.json", import.meta.url), "utf8"));

// Real breakout-fixture-shaped positions, matching Phase 1's own fixture.
const D1_START = playSpaceToRinkFrame([192.5, 42.5]);
const D1_ESCAPE = playSpaceToRinkFrame([186, 25]);
const W1_POS = playSpaceToRinkFrame([155, 20]);
const F1_POS = playSpaceToRinkFrame([183, 64]);
const F2_POS = playSpaceToRinkFrame([162, 42]);

function baseDefinition(overrides = {}) {
  return {
    schemaVersion: SCENARIO_DEFINITION_SCHEMA_VERSION,
    id: "sd_test_fixture",
    version: 1,
    contentHash: null,
    family: "dz-breakout",
    tacticalClaimVersion: null,
    proofMode: "coach-declared",
    ageSkillProfile: "u13",
    sources: [{ note: "docs/library/dz-breakout-retrieval-under-pressure.md", cite: "test fixture" }],
    rinkFrame: { profileId: "nhl-200x85-v1", units: "metres", attackingDirection: "+x" },
    initialState: {
      actors: [
        { id: "D1", team: "home", role: "puckCarrier", position: D1_START },
        { id: "W1", team: "home", role: "support", position: W1_POS },
        { id: "F1", team: "away", role: "defender", position: F1_POS },
        { id: "F2", team: "away", role: "defender", position: F2_POS },
      ],
      puck: { position: D1_START },
    },
    intendedActions: [],
    decisionFreeze: { time: 5, observableCues: ["test"] },
    declaredRead: { actorId: "D1", description: "test" },
    questionKindVariants: [{ kind: "lane-pick", ageBands: ["U13"], copy: { q: "test" } }],
    generationParams: null,
    dependencyVersions: { rinkFrame: "rink-frame-v1" },
    ...overrides,
  };
}

// ---- Solver contract is declared, not omitted -----------------------------
ok("solver contract declares rngAlgorithm explicitly (even as 'none')", SOLVER_CONTRACT.rngAlgorithm === "none");
ok("solver contract declares tie-breaking", typeof SOLVER_CONTRACT.tieBreaking === "string");
ok("solver contract declares float policy", typeof SOLVER_CONTRACT.floatPolicy === "string");
ok("solver contract is versioned", typeof SOLVER_CONTRACT.version === "string");

// ---- Just-inside / just-outside boundary: acceleration ---------------------
// U13 avgAccelMPS2=4.13, safety cap 4.7495. d=5m in t=1.5s -> 4.44 (inside);
// t=1.4s -> 5.10 (outside). Precise values computed and verified separately.
{
  const dir = [D1_ESCAPE[0] - D1_START[0], D1_ESCAPE[1] - D1_START[1]];
  const len = Math.hypot(...dir);
  const unit = [dir[0] / len, dir[1] / len];
  const to5m = [D1_START[0] + unit[0] * 5, D1_START[1] + unit[1] * 5];

  const insideDef = baseDefinition({
    intendedActions: [{ actorId: "D1", kind: "skate", startTime: 0, endTime: 1.5, toPosition: to5m }],
  });
  const outsideDef = baseDefinition({
    intendedActions: [{ actorId: "D1", kind: "skate", startTime: 0, endTime: 1.4, toPosition: to5m }],
  });

  const insideTrace = await simulate(insideDef, u13Profile);
  const outsideTrace = await simulate(outsideDef, u13Profile);

  ok("just-inside acceleration boundary: physically clean", insideTrace.physicsClean);
  ok("just-outside acceleration boundary: NOT physically clean", !outsideTrace.physicsClean);
  const accelFinding = outsideTrace.findings.find((f) => f.validatorCode === "impossible-acceleration");
  ok("just-outside case fails with a SPECIFIC finding (not a generic error)", accelFinding && accelFinding.severity === SEVERITY.HARD_FAILURE);
  ok("the finding names the actor, measured value, and threshold", accelFinding.actorId === "D1" && Number.isFinite(accelFinding.measuredValue) && Number.isFinite(accelFinding.threshold));
}

// ---- Teleportation ----------------------------------------------------------
{
  const def = baseDefinition({
    intendedActions: [{ actorId: "D1", kind: "skate", startTime: 0, endTime: 0.01, toPosition: D1_ESCAPE }],
  });
  const trace = await simulate(def, u13Profile);
  ok("teleportation (huge distance, near-zero time) is a hard failure", !trace.physicsClean);
  ok("teleportation finding is specifically coded, not lumped into acceleration", trace.findings.some((f) => f.validatorCode === "teleportation"));
}

// ---- Impossible stopping ----------------------------------------------------
{
  const dir = [D1_ESCAPE[0] - D1_START[0], D1_ESCAPE[1] - D1_START[1]];
  const len = Math.hypot(...dir);
  const unit = [dir[0] / len, dir[1] / len];
  const to15m = [D1_START[0] + unit[0] * 15, D1_START[1] + unit[1] * 15];
  // Skates 15m in 3s (well within accel/speed caps), but freeze happens
  // 0.01s after the action ends -- no time to shed the exit speed.
  const def = baseDefinition({
    intendedActions: [{ actorId: "D1", kind: "skate", startTime: 0, endTime: 3, toPosition: to15m }],
    decisionFreeze: { time: 3.01, observableCues: ["test"] },
  });
  const trace = await simulate(def, u13Profile);
  ok("no time to stop before the freeze is a hard failure", !trace.physicsClean);
  ok("impossible-stopping is specifically coded", trace.findings.some((f) => f.validatorCode === "impossible-stopping"));
}

// ---- Unreachable pass --------------------------------------------------------
{
  const def = baseDefinition({
    intendedActions: [{ actorId: "D1", kind: "pass", startTime: 0, endTime: 0.4, toPosition: W1_POS }],
  });
  const trace = await simulate(def, u13Profile);
  ok("a pass requiring launch speed beyond the profile cap is a hard failure", !trace.physicsClean);
  const passFinding = trace.findings.find((f) => f.validatorCode === "unreachable-pass");
  ok("unreachable-pass finding is puck-flagged, not actor-flagged", passFinding && passFinding.puck === true);
}

// ---- Impossible turning (just-inside / just-outside) --------------------------
// U13 turningRadiusM=29.85. A 90-degree turn needs 29.85*(pi/2)=46.89m of
// arc; a 5m outgoing segment can't contain it. A ~11-degree turn needs only
// ~5.9m, well inside a 15m segment.
{
  // initialState overridden so D1 starts at a clean [0,0] -- baseDefinition()'s
  // default D1 starts at the real breakout position (~28m from origin), which
  // silently broke the "10m"/"5m" distances these fixtures were built around.
  // decisionFreeze also pushed well past both actions' end so this tests
  // turning specifically, not stopping-before-freeze.
  const turningInitialState = {
    actors: [
      { id: "D1", team: "home", role: "puckCarrier", position: [0, 0] },
      { id: "W1", team: "home", role: "support", position: W1_POS },
      { id: "F1", team: "away", role: "defender", position: [25, -10] },
      { id: "F2", team: "away", role: "defender", position: [-25, 10] },
    ],
    puck: { position: [0, 0] },
  };
  const outsideDef = baseDefinition({
    initialState: turningInitialState,
    decisionFreeze: { time: 100, observableCues: ["test"] },
    intendedActions: [
      { actorId: "D1", kind: "skate", startTime: 0, endTime: 2.5, toPosition: [10, 0] }, // 10m/2.5s: 3.2 m/s^2, within cap -- isolates the turning failure below
      { actorId: "D1", kind: "skate", startTime: 2.5, endTime: 4.5, toPosition: [10, 5] }, // 90 degree turn, 5m/2s: 2.5 m/s^2 (also within cap) but only 5m of arc where 46.89m is needed
    ],
  });
  const insideDef = baseDefinition({
    initialState: turningInitialState,
    decisionFreeze: { time: 100, observableCues: ["test"] },
    intendedActions: [
      { actorId: "D1", kind: "skate", startTime: 0, endTime: 2.5, toPosition: [10, 0] }, // 10m/2.5s: 3.2 m/s^2, within U13's 4.75 cap
      { actorId: "D1", kind: "skate", startTime: 2.5, endTime: 5.5, toPosition: [25, 3] }, // ~11 degree turn, 15.3m/3s: 3.4 m/s^2, also within cap
    ],
  });
  const outsideTrace = await simulate(outsideDef, u13Profile);
  const insideTrace = await simulate(insideDef, u13Profile);
  ok("just-outside turning boundary: a sharp turn into a too-short segment is a hard failure", !outsideTrace.physicsClean);
  const outsideHardFailures = outsideTrace.findings.filter((f) => f.severity === SEVERITY.HARD_FAILURE);
  ok("the failure is isolated to turning specifically, not also tripping acceleration/speed (both legs are independently within those caps)", outsideHardFailures.every((f) => f.validatorCode === "impossible-turning"));
  const turnFinding = outsideTrace.findings.find((f) => f.validatorCode === "impossible-turning");
  ok("impossible-turning finding is specifically coded with actor/measured/threshold", turnFinding && turnFinding.actorId === "D1" && Number.isFinite(turnFinding.measuredValue) && Number.isFinite(turnFinding.threshold));
  ok("just-inside turning boundary: a shallow turn into a long segment is physically clean", insideTrace.physicsClean);
}

// ---- Impossible turning does NOT apply across a pass/shot leg ----------------
// A pass/shot's direction is set by release mechanics, not the skater's own
// turning radius -- the same sharp-angle transition that correctly hard-fails
// between two skate actions (above) must NOT hard-fail when either leg is a
// pass/shot. Caught adapting the real dz-breakout play into a
// ScenarioDefinition (Phase 5 Task 4, 2026-07-31): its real skate-then-
// outlet-pass sequence turns ~58 degrees in under 10m, which the turning
// detector -- before this fix -- flagged as an impossible turn.
{
  const turningInitialState = {
    actors: [
      { id: "D1", team: "home", role: "puckCarrier", position: [0, 0] },
      { id: "W1", team: "home", role: "support", position: W1_POS },
      { id: "F1", team: "away", role: "defender", position: [25, -10] },
      { id: "F2", team: "away", role: "defender", position: [-25, 10] },
    ],
    puck: { position: [0, 0] },
  };
  // Same geometry as the "just-outside" skate/skate case above (a 90-degree
  // turn into a too-short 5m segment) but the second leg is a PASS, not a
  // skate -- would have hard-failed as impossible-turning before this fix.
  const def = baseDefinition({
    initialState: turningInitialState,
    decisionFreeze: { time: 100, observableCues: ["test"] },
    intendedActions: [
      { actorId: "D1", kind: "skate", startTime: 0, endTime: 2.5, toPosition: [10, 0] },
      { actorId: "D1", kind: "pass", startTime: 2.5, endTime: 3, toPosition: [10, 5] },
    ],
  });
  const trace = await simulate(def, u13Profile);
  ok("a sharp turn is NOT a hard failure when the second leg is a pass", trace.findings.filter((f) => f.severity === SEVERITY.HARD_FAILURE && f.validatorCode === "impossible-turning").length === 0);
  ok("the turning check instead reports UNSUPPORTED_MODEL for a skate-then-pass transition", trace.findings.some((f) => f.validatorCode === "impossible-turning" && isUnsupportedModel(f)));

  // And the reverse order: a sharp-angled PASS followed by a skate.
  const reverseDef = baseDefinition({
    initialState: turningInitialState,
    decisionFreeze: { time: 100, observableCues: ["test"] },
    intendedActions: [
      { actorId: "D1", kind: "pass", startTime: 0, endTime: 0.7, toPosition: [10, 0] },
      { actorId: "D1", kind: "skate", startTime: 0.7, endTime: 3.2, toPosition: [10, 5] },
    ],
  });
  const reverseTrace = await simulate(reverseDef, u13Profile);
  ok("a sharp turn is NOT a hard failure when the FIRST leg is a pass", reverseTrace.findings.filter((f) => f.severity === SEVERITY.HARD_FAILURE && f.validatorCode === "impossible-turning").length === 0);
}

// ---- Possible interception (implemented in Phase 2, now actually tested) ----
{
  // F1/F2 start close to the pass line between D1 and W1's real breakout
  // positions -- both should be flagged as possible interceptors.
  const def = baseDefinition({
    intendedActions: [{ actorId: "D1", kind: "pass", startTime: 0, endTime: 1.5, toPosition: W1_POS }],
  });
  const trace = await simulate(def, u13Profile);
  const interceptions = trace.findings.filter((f) => f.validatorCode === "possible-interception");
  ok("a pass with a defender near its path produces a possible-interception WARNING", interceptions.length > 0);
  ok("possible-interception is a WARNING, not a hard failure on its own", interceptions.every((f) => f.severity === SEVERITY.WARNING));
}

// ---- Board contact: explicitly UNSUPPORTED_MODEL, never silently ignored ----
{
  const bounds = rinkProfile("nhl-200x85-v1").bounds;
  const nearBoardsPoint = [bounds.maxX - 0.3, 0]; // 0.3m from the +x boards
  const def = baseDefinition({
    initialState: {
      actors: [
        { id: "D1", team: "home", role: "puckCarrier", position: [0, 0] },
        { id: "W1", team: "home", role: "support", position: W1_POS },
        { id: "F1", team: "away", role: "defender", position: F1_POS },
        { id: "F2", team: "away", role: "defender", position: F2_POS },
      ],
      puck: { position: [0, 0] },
    },
    intendedActions: [{ actorId: "D1", kind: "shot", startTime: 0, endTime: 3, toPosition: nearBoardsPoint }],
  });
  const trace = await simulate(def, u13Profile);
  ok("a shot path ending near the boards produces an explicit UNSUPPORTED_MODEL board-contact marker", trace.findings.some((f) => isUnsupportedModel(f) && f.validatorCode === "board-contact"));
  ok("the board-contact marker doesn't itself flip physicsClean to false", trace.physicsClean === true);
}

// ---- Illegal bounds -----------------------------------------------------------
{
  const def = baseDefinition({
    intendedActions: [{ actorId: "D1", kind: "skate", startTime: 0, endTime: 5, toPosition: [1000, 1000] }],
  });
  // scenarioDefinition.js's own validator would already reject this at
  // authoring time; the simulator's belt-and-suspenders check still fires
  // if a caller bypasses that (e.g. a malformed definition reaching the
  // simulator directly in a test or a future call site).
  const trace = await simulate(def, u13Profile);
  ok("an out-of-bounds claimed endpoint is a hard failure at the simulator level too", !trace.physicsClean);
  ok("illegal-bounds is specifically coded", trace.findings.some((f) => f.validatorCode === "illegal-bounds"));
}

// ---- Impossible event ordering / inconsistent possession --------------------
{
  const def = baseDefinition({
    intendedActions: [
      { actorId: "D1", kind: "skate", startTime: 0, endTime: 2, toPosition: D1_ESCAPE },
      { actorId: "D1", kind: "skate", startTime: 1, endTime: 3, toPosition: W1_POS }, // overlaps the first
    ],
  });
  const trace = await simulate(def, u13Profile);
  ok("overlapping actions for the same actor is a hard failure", !trace.physicsClean);
  ok("impossible-event-ordering is specifically coded", trace.findings.some((f) => f.validatorCode === "impossible-event-ordering"));
}
{
  const def = baseDefinition({
    intendedActions: [
      { actorId: "D1", kind: "pass", startTime: 0, endTime: 1, toPosition: W1_POS },
      { actorId: "W1", kind: "pass", startTime: 0.5, endTime: 1.5, toPosition: D1_START }, // overlaps the puck's own first pass
    ],
  });
  const trace = await simulate(def, u13Profile);
  ok("two overlapping puck actions is a hard failure", !trace.physicsClean);
  ok("inconsistent-possession is specifically coded", trace.findings.some((f) => f.validatorCode === "inconsistent-possession"));
}

// ---- UNSUPPORTED_MODEL: never masquerades as pass or fail --------------------
{
  const def = baseDefinition({
    intendedActions: [{ actorId: "D1", kind: "skate", startTime: 0 }], // no toPosition, no endTime -- nothing to check
  });
  const trace = await simulate(def, u13Profile);
  ok("an action with no physical claim produces UNSUPPORTED_MODEL findings", trace.unsupportedModelCount > 0);
  ok("UNSUPPORTED_MODEL findings are structurally distinct from pass/fail findings", trace.findings.filter(isUnsupportedModel).every((f) => f.kind === "UNSUPPORTED_MODEL" && f.severity === undefined));
  // Critically: an unsupported-model action must not silently count as
  // clean OR as a failure -- physicsClean only reflects real hard failures.
  ok("a definition with ONLY unsupported-model actions is not silently marked physicsClean=false by them alone", trace.physicsClean === true);
}

// ---- Determinism: same input, same pinned versions -> identical hash --------
{
  const def = baseDefinition({
    intendedActions: [{ actorId: "D1", kind: "skate", startTime: 0, endTime: 1.5, toPosition: D1_ESCAPE }],
  });
  const trace1 = await simulate(def, u13Profile);
  const trace2 = await simulate(def, u13Profile);
  ok("identical input produces an identical canonical trace hash across two runs", trace1.canonicalTraceHash === trace2.canonicalTraceHash);
  ok("identical input produces identical samples across two runs", JSON.stringify(trace1.samples) === JSON.stringify(trace2.samples));

  const defDifferent = baseDefinition({
    id: "sd_test_fixture_different",
    intendedActions: [{ actorId: "D1", kind: "skate", startTime: 0, endTime: 1.5, toPosition: D1_ESCAPE }],
  });
  const trace3 = await simulate(defDifferent, u13Profile);
  ok("a genuinely different definition id produces a different trace hash", trace1.canonicalTraceHash !== trace3.canonicalTraceHash);
}

// ---- A fully clean, physically valid definition ------------------------------
{
  const def = baseDefinition({
    intendedActions: [{ actorId: "D1", kind: "skate", startTime: 0, endTime: 3, toPosition: D1_ESCAPE }],
  });
  const trace = await simulate(def, u13Profile);
  ok("a realistic, well-timed skate action is physically clean", trace.physicsClean);
  ok("a clean trace has zero hard-failure findings", trace.findings.filter((f) => !isUnsupportedModel(f) && f.severity === SEVERITY.HARD_FAILURE).length === 0);
}

// ---- The puck moves WITH its carrier during a plain skate/carry action -------
// Both of Phase 3's independent adversarial reviews caught this: a puck
// carrier's own skate action previously produced ZERO puck samples at all
// (only an explicit pass/shot ever touched the puck's track), silently
// leaving the puck missing for the entire flagship dz-breakout-carry shape.
{
  const def = baseDefinition({
    intendedActions: [{ actorId: "D1", kind: "skate", startTime: 0, endTime: 3, toPosition: D1_ESCAPE }],
  });
  const trace = await simulate(def, u13Profile);
  const puckSamples = trace.samples.filter((s) => s.actorId === "puck");
  ok("D1's own skate action produces real puck samples (D1 is the declared puckCarrier)", puckSamples.length > 0);
  ok("the mirrored puck samples match D1's own carried trajectory", JSON.stringify(puckSamples.map((s) => s.pos)) === JSON.stringify(trace.samples.filter((s) => s.actorId === "D1").map((s) => s.pos)));
  ok("puck samples are tagged with the real action kind, not a lossy boolean", puckSamples.every((s) => s.actionKind === "skate"));
}

// ---- A non-carrier's own skate action does NOT move the puck -----------------
{
  const def = baseDefinition({
    intendedActions: [{ actorId: "W1", kind: "skate", startTime: 0, endTime: 2, toPosition: F1_POS }],
  });
  const trace = await simulate(def, u13Profile);
  const puckSamples = trace.samples.filter((s) => s.actorId === "puck");
  ok("a support player's own skate action does not produce puck samples (they don't have the puck)", puckSamples.length === 0);
}

// ---- After a pass/shot, possession is unknown -- later skating doesn't drag the puck --
{
  const def = baseDefinition({
    intendedActions: [
      { actorId: "D1", kind: "pass", startTime: 0, endTime: 0.5, toPosition: W1_POS },
      { actorId: "D1", kind: "skate", startTime: 0.5, endTime: 2.5, toPosition: D1_ESCAPE },
    ],
  });
  const trace = await simulate(def, u13Profile);
  const puckSamples = trace.samples.filter((s) => s.actorId === "puck");
  const finalPuckSample = puckSamples[puckSamples.length - 1];
  const EPS = 1e-5;
  const near = (a, b) => Math.abs(a[0] - b[0]) < EPS && Math.abs(a[1] - b[1]) < EPS;
  ok("the puck's last sample lands where the pass actually ended, not dragged along by D1's later skate", finalPuckSample && near(finalPuckSample.pos, W1_POS) && !near(finalPuckSample.pos, D1_ESCAPE));
  ok("D1 skating again after passing does not re-attach the puck (Level-1 doesn't know who caught it)", puckSamples.every((s) => s.t <= 0.5));
}

// ---- Stationary (routeless) actors still get a sample --------------------
// F2 never gets an intendedAction in ANY case in this file (including the
// base fixture's default []) -- it's the existing routeless-actor case,
// which every prior test in this file passed without checking. Confirms
// the new fallback sample fires for a real fixture actor, not a
// hand-invented one.
{
  const def = baseDefinition({
    intendedActions: [{ actorId: "D1", kind: "skate", startTime: 0, endTime: 2, toPosition: D1_ESCAPE }],
  });
  const trace = await simulate(def, u13Profile);
  const f2Samples = trace.samples.filter((s) => s.actorId === "F2");
  ok("routeless actor F2 gets at least one sample", f2Samples.length >= 1);
  ok("F2's sample sits at their initial position", f2Samples[0].pos[0] === F2_POS[0] && f2Samples[0].pos[1] === F2_POS[1]);
  ok("F2's sample is at t=0", f2Samples[0].t === 0);
  const d1Samples = trace.samples.filter((s) => s.actorId === "D1");
  ok("D1 (who has a real action) is unaffected -- still has action-derived samples", d1Samples.length >= 1);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
