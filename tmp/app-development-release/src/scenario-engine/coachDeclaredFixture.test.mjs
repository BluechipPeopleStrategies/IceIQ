#!/usr/bin/env node
// Run: node src/scenario-engine/coachDeclaredFixture.test.mjs
import { readFileSync } from "node:fs";
import { TWO_ON_ONE_COACH_DECLARED_DEFINITION } from "./coachDeclaredFixture.js";
import { validateScenarioDefinition } from "./scenarioDefinition.js";
import { contentHash } from "./canonicalHash.js";
import { simulate } from "./physics/simulator.js";
import { evaluateDecision, compareDeclaredToDerived } from "./decisionEvaluation.js";
import { compileTeachingPlay } from "./compiledTeachingPlay.js";
import { isUnsupportedModel, SEVERITY } from "./physics/findings.js";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

const u11Profile = JSON.parse(readFileSync(new URL("./physics/profiles/u11.json", import.meta.url), "utf8"));

// ---- Schema + basic identity ---------------------------------------------------
{
  const result = validateScenarioDefinition(TWO_ON_ONE_COACH_DECLARED_DEFINITION);
  ok("the coach-declared fixture passes schema validation", result.ok && result.errs.length === 0);
  ok("uses the real, established family id", TWO_ON_ONE_COACH_DECLARED_DEFINITION.family === "two_on_one");
  ok("is a genuinely different family from the breakout fixture", TWO_ON_ONE_COACH_DECLARED_DEFINITION.family !== "dz_breakout");
  ok("has no tacticalClaimVersion -- no Phase 4 claim exists for this family, honestly null", TWO_ON_ONE_COACH_DECLARED_DEFINITION.tacticalClaimVersion === null);
  ok("proofMode is coach-declared, matching Task 7's own requirement", TWO_ON_ONE_COACH_DECLARED_DEFINITION.proofMode === "coach-declared");
}

// ---- Content hash stability --------------------------------------------------
{
  const { contentHash: declaredHash, ...rest } = TWO_ON_ONE_COACH_DECLARED_DEFINITION;
  const recomputed = await contentHash(rest);
  ok("the declared contentHash recomputes to the same value", declaredHash === recomputed);
}

// ---- Runs cleanly through physics -----------------------------------------------
const trace = await simulate(TWO_ON_ONE_COACH_DECLARED_DEFINITION, u11Profile);
ok("the real, live-catalog-adapted two_on_one scenario is physically clean end to end", trace.physicsClean);
ok("zero hard-failure findings", trace.findings.filter((f) => !isUnsupportedModel(f) && f.severity === SEVERITY.HARD_FAILURE).length === 0);

// ---- Decision evaluation on NON-kernel-derived, coach-declared input -------------
const evaluation = evaluateDecision([{ id: "pass_backdoor", trace }]);
ok("decision evaluation resolves to the backdoor-pass candidate", evaluation.status === "resolved" && evaluation.derivedRead === "pass_backdoor");

const agree = compareDeclaredToDerived("pass_backdoor", evaluation);
ok("declared/derived agreement holds (proves the comparison on genuinely coach-declared, non-kernel input)", agree.agreement === "agree");

// ---- The hard-fail path, proven here too, not just on the happy path ------------
// A deliberately-WRONG declared read on the SAME physics-clean trace --
// exercises the disagree path per the exit gate's explicit requirement:
// "including a test where they deliberately disagree, proving the hard-fail
// path, not just the happy path."
const disagreeEvaluation = evaluateDecision([
  { id: "pass_backdoor", trace },
  { id: "shoot_far", trace: { physicsClean: false, findings: [{ severity: "hard-failure", validatorCode: "test", explanation: "the shot lane is covered -- not physically blocked, tactically wrong, modeled here as a disproven candidate for this test" }] } },
]);
const disagree = compareDeclaredToDerived("shoot_far", disagreeEvaluation);
ok("a deliberately-wrong declared read against the real physics-clean trace is a DISAGREE, not silently accepted", disagree.agreement === "disagree");

// ---- Compiles into a real CompiledTeachingPlay -------------------------------
const compiledPlay = await compileTeachingPlay(TWO_ON_ONE_COACH_DECLARED_DEFINITION, trace, evaluation, "pass_backdoor");
ok("the coach-declared fixture compiles into a CompiledTeachingPlay", typeof compiledPlay.compiledHash === "string" && compiledPlay.compiledHash.length === 64);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
