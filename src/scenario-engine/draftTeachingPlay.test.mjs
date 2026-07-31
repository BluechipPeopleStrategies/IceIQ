#!/usr/bin/env node
// Run: node src/scenario-engine/draftTeachingPlay.test.mjs
import { buildDraftTeachingPlay, DRAFT_TEACHING_PLAY_SCHEMA_VERSION } from "./draftTeachingPlay.js";
import { AGREEMENT, EVALUATION_STATUS } from "./decisionEvaluation.js";
import { buildFinding, SEVERITY, ANSWER_IMPACT } from "./physics/findings.js";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

const definition = {
  intendedActions: [{ startTime: 0, endTime: 1 }],
  decisionFreeze: { time: 0.5, observableCues: ["puck carrier's shoulders"] },
  declaredRead: { actorId: "a1", description: "pass to the weak side" },
};

const cleanTrace = { physicsClean: true, samples: [{ t: 0, pos: [0, 0], actorId: "a1" }], findings: [] };
const cleanEvaluation = {
  schemaVersion: "decision-evaluation-v1", status: EVALUATION_STATUS.RESOLVED,
  derivedRead: "a1", viableCandidateIds: ["a1"],
  proofChain: [{ candidateId: "a1", physicsClean: true, hardFailures: [] }],
  consultedClaimId: null, reason: "sole clean candidate",
};

{
  const draft = buildDraftTeachingPlay(definition, cleanTrace, cleanEvaluation, "a1");
  ok("schemaVersion is draft-teaching-play-v1", draft.schemaVersion === DRAFT_TEACHING_PLAY_SCHEMA_VERSION);
  ok("carries samples through verbatim", draft.samples === cleanTrace.samples);
  ok("eventTimes includes 0, 1, and 0.5", [0, 1, 0.5].every((t) => draft.eventTimes.includes(t)));
  ok("questionFreezeTime matches decisionFreeze.time", draft.questionFreezeTime === 0.5);
  ok("observableCues carried through", draft.observableCues === definition.decisionFreeze.observableCues);
  ok("physicsClean true for a clean trace", draft.physicsClean === true);
  ok("comparison.agreement is AGREE for a matching declared/derived read", draft.comparison.agreement === AGREEMENT.AGREE);
  ok("failedChecks is empty for a clean, agreeing draft", draft.failedChecks.length === 0);
  ok("draft is frozen", Object.isFrozen(draft));
}

const hardFail = buildFinding({
  validatorCode: "test.speed", validatorVersion: "v1", eventTime: 0.5,
  measuredValue: 20, threshold: 10, units: "m/s", profileId: "p", profileVersion: "v1",
  solverVersion: "v1", severity: SEVERITY.HARD_FAILURE, answerImpact: ANSWER_IMPACT.CHANGES_ANSWER,
  explanation: "actor a1 exceeds max skating speed",
});
const dirtyTrace = { physicsClean: false, samples: [], findings: [hardFail] };
const dirtyEvaluation = {
  schemaVersion: "decision-evaluation-v1", status: EVALUATION_STATUS.RESOLVED,
  derivedRead: "a2", viableCandidateIds: ["a2"],
  proofChain: [
    { candidateId: "a1", physicsClean: false, hardFailures: [hardFail] },
    { candidateId: "a2", physicsClean: true, hardFailures: [] },
  ],
  consultedClaimId: null, reason: "a1 disproven by physics",
};

{
  const draft = buildDraftTeachingPlay(definition, dirtyTrace, dirtyEvaluation, "a1");
  ok("physicsClean false for a dirty trace", draft.physicsClean === false);
  ok("comparison.agreement is DISAGREE when declared read is disproven", draft.comparison.agreement === AGREEMENT.DISAGREE);
  ok("failedChecks includes the hard-failure explanation", draft.failedChecks.includes(hardFail.explanation));
  ok("failedChecks includes the disagreement explanation", draft.failedChecks.some((c) => c.includes("disproven")));
  ok("failedChecks has exactly 2 entries (1 physics + 1 disagreement)", draft.failedChecks.length === 2);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
