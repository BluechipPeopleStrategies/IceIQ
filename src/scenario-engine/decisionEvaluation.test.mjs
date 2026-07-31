#!/usr/bin/env node
// Run: node src/scenario-engine/decisionEvaluation.test.mjs
import { evaluateDecision, compareDeclaredToDerived, EVALUATION_STATUS, AGREEMENT } from "./decisionEvaluation.js";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };
const throws = (fn) => { try { fn(); return false; } catch { return true; } };

function fakeTrace(physicsClean, findings = []) {
  return { physicsClean, findings };
}
function hardFail(explanation) {
  return { severity: "hard-failure", validatorCode: "test", explanation };
}

// ---- Exactly one viable candidate: resolved ---------------------------------
{
  const candidates = [
    { id: "escape_open_side", trace: fakeTrace(true) },
    { id: "into_pressure", trace: fakeTrace(false, [hardFail("skates into a defender, physically fine but tactically bad -- not this stub's job to judge")]) },
  ];
  const evaluation = evaluateDecision(candidates);
  ok("exactly one physically-clean candidate resolves", evaluation.status === EVALUATION_STATUS.RESOLVED);
  ok("derivedRead is the sole viable candidate", evaluation.derivedRead === "escape_open_side");
  ok("viableCandidateIds lists exactly the one candidate", JSON.stringify(evaluation.viableCandidateIds) === JSON.stringify(["escape_open_side"]));
  ok("proofChain covers every candidate, not just the viable one", evaluation.proofChain.length === 2);
  ok("proofChain preserves the hard-failure explanation for the rejected candidate", evaluation.proofChain.find((p) => p.candidateId === "into_pressure").hardFailures.length === 1);
}

// ---- Zero viable candidates: review-required, not silently resolved ---------
{
  const candidates = [
    { id: "a", trace: fakeTrace(false, [hardFail("teleportation")]) },
    { id: "b", trace: fakeTrace(false, [hardFail("impossible acceleration")]) },
  ];
  const evaluation = evaluateDecision(candidates);
  ok("zero viable candidates routes to review-required, not a guess", evaluation.status === EVALUATION_STATUS.REVIEW_REQUIRED);
  ok("derivedRead stays null when nothing is viable", evaluation.derivedRead === null);
  ok("the reason explains why (zero physics-clean candidates)", evaluation.reason.includes("no candidate is physically clean"));
}

// ---- Multiple viable candidates: review-required, not averaged/majority-voted --
{
  const candidates = [
    { id: "a", trace: fakeTrace(true) },
    { id: "b", trace: fakeTrace(true) },
  ];
  const evaluation = evaluateDecision(candidates);
  ok("multiple physically-clean candidates routes to review-required, not a guess", evaluation.status === EVALUATION_STATUS.REVIEW_REQUIRED);
  ok("derivedRead stays null when the physics is genuinely ambiguous", evaluation.derivedRead === null);
  ok("viableCandidateIds lists both, so a human can see the real ambiguity", evaluation.viableCandidateIds.length === 2);
}

ok("rejects an empty candidates array", throws(() => evaluateDecision([])));
ok("rejects a non-array candidates argument", throws(() => evaluateDecision(null)));
ok("rejects a candidate with no trace", throws(() => evaluateDecision([{ id: "x" }])));

// ---- declaredRead vs derivedRead comparison ----------------------------------
{
  const resolved = evaluateDecision([{ id: "escape_open_side", trace: fakeTrace(true) }]);
  const agree = compareDeclaredToDerived("escape_open_side", resolved);
  ok("matching declared/derived reads agree", agree.agreement === AGREEMENT.AGREE);
  ok("agreement never marks mismatchPreserved when there's no mismatch", agree.mismatchPreserved === false);

  // A declared candidate that WAS actually evaluated (present in the
  // proofChain) and failed physics -- the genuine disagreement path.
  const testedAndFailed = evaluateDecision([
    { id: "escape_open_side", trace: fakeTrace(true) },
    { id: "into_pressure", trace: fakeTrace(false, [hardFail("skates into a defender, physically fine but tactically bad")]) },
  ]);
  const disagree = compareDeclaredToDerived("into_pressure", testedAndFailed);
  ok("a declared read that was tested and failed physics is a disagreement, not silently swapped", disagree.agreement === AGREEMENT.DISAGREE);
  ok("disagreement preserves BOTH the declared and derived ids", disagree.declaredCandidateId === "into_pressure" && disagree.derivedRead === "escape_open_side");
  ok("disagreement preserves the mismatch for the record", disagree.mismatchPreserved === true);

  // A declared candidate that was NEVER among the evaluated candidates at
  // all (typo'd id, a candidate the generator silently dropped) has zero
  // physics evidence either way -- it must route to review-required, not be
  // reported as a proven "disproven" claim it was never actually tested
  // against. (Caught by Phase 3's adversarial review, 2026-07-31 -- this is
  // the "missing evidence" path the spec calls out, previously conflated
  // with genuine disagreement.)
  const neverEvaluated = compareDeclaredToDerived("nonexistent_candidate", resolved);
  ok("a declared read that was never evaluated routes to review-required, not a false disagreement", neverEvaluated.agreement === AGREEMENT.REVIEW_REQUIRED);
  ok("the missing-evidence explanation says so, not 'disproven'", neverEvaluated.explanation.includes("never among the evaluated candidates"));
  ok("missing-evidence result still preserves both ids for the record", neverEvaluated.declaredCandidateId === "nonexistent_candidate" && neverEvaluated.derivedRead === "escape_open_side");

  const ambiguous = evaluateDecision([{ id: "a", trace: fakeTrace(true) }, { id: "b", trace: fakeTrace(true) }]);
  const reviewRequired = compareDeclaredToDerived("a", ambiguous);
  ok("comparing against an ambiguous evaluation routes to review-required, not a false agree", reviewRequired.agreement === AGREEMENT.REVIEW_REQUIRED);
}

ok("compareDeclaredToDerived rejects a missing declaredCandidateId", throws(() => compareDeclaredToDerived(null, evaluateDecision([{ id: "a", trace: fakeTrace(true) }]))));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
