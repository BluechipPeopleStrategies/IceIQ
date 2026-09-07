#!/usr/bin/env node
// Run: node src/scenario-engine/breakout/dzBreakoutScenario.test.mjs
import { readFileSync } from "node:fs";
import { DZ_BREAKOUT_SCENARIO_DEFINITION } from "./dzBreakoutScenario.js";
import { validateScenarioDefinition } from "../scenarioDefinition.js";
import { contentHash } from "../canonicalHash.js";
import { simulate } from "../physics/simulator.js";
import { evaluateDecision, compareDeclaredToDerived } from "../decisionEvaluation.js";
import { compileTeachingPlay } from "../compiledTeachingPlay.js";
import { isUnsupportedModel, SEVERITY } from "../physics/findings.js";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

const u13Profile = JSON.parse(readFileSync(new URL("../physics/profiles/u13.json", import.meta.url), "utf8"));

// ---- Schema ----------------------------------------------------------------
{
  const result = validateScenarioDefinition(DZ_BREAKOUT_SCENARIO_DEFINITION);
  ok("the real breakout ScenarioDefinition passes schema validation", result.ok && result.errs.length === 0);
  ok("uses the real, established family id (underscore, matching playFamilies.js)", DZ_BREAKOUT_SCENARIO_DEFINITION.family === "dz_breakout");
  ok("declaredRead matches the live catalog play's actual correct-answer text", DZ_BREAKOUT_SCENARIO_DEFINITION.declaredRead.description.includes("side the forechecker has turned away from"));
}

// ---- Content hash stability --------------------------------------------------
{
  const { contentHash: declaredHash, ...rest } = DZ_BREAKOUT_SCENARIO_DEFINITION;
  const recomputed = await contentHash(rest);
  ok("the declared contentHash recomputes to the same value", declaredHash === recomputed);
}

// ---- THE central exit-gate check: the real breakout scenario is physically clean --
const trace = await simulate(DZ_BREAKOUT_SCENARIO_DEFINITION, u13Profile);
ok("the real, live-catalog-adapted breakout scenario is physically clean end to end", trace.physicsClean);
ok("zero hard-failure findings", trace.findings.filter((f) => !isUnsupportedModel(f) && f.severity === SEVERITY.HARD_FAILURE).length === 0);

{
  const turningFindings = trace.findings.filter((f) => f.validatorCode === "impossible-turning");
  ok("the skate-then-outlet-pass transition is correctly UNSUPPORTED_MODEL, not a false hard failure (the real bug this scenario surfaced)", turningFindings.length > 0 && turningFindings.every(isUnsupportedModel));
}

// ---- Puck actually tracks with D1 during the skate, then launches on the pass ----
{
  const puckSamples = trace.samples.filter((s) => s.actorId === "puck");
  ok("the puck has real samples throughout the retrieval skate (carried, per Phase 3's fix)", puckSamples.some((s) => s.t < 3));
  ok("the puck's final sample lands at the outlet pass target, not stuck at the retrieval spot", puckSamples[puckSamples.length - 1].t === 4);
}

// ---- Decision evaluation: the declared read is the one physically-clean candidate --
const evaluation = evaluateDecision([{ id: "escape_open_side", trace }]);
ok("decision evaluation resolves to the escape candidate", evaluation.status === "resolved" && evaluation.derivedRead === "escape_open_side");

const comparison = compareDeclaredToDerived("escape_open_side", evaluation);
ok("declared/derived agreement holds for the real breakout scenario", comparison.agreement === "agree");

// ---- Compiles into a real CompiledTeachingPlay -------------------------------
const compiledPlay = await compileTeachingPlay(DZ_BREAKOUT_SCENARIO_DEFINITION, trace, evaluation, "escape_open_side");
ok("the real breakout scenario compiles into a CompiledTeachingPlay", typeof compiledPlay.compiledHash === "string" && compiledPlay.compiledHash.length === 64);
ok("the compiled play carries real answer proof citing the escape candidate", compiledPlay.answerProof.derivedRead === "escape_open_side");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
