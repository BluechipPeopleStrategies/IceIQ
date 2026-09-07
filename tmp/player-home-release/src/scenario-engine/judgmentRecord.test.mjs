#!/usr/bin/env node
// Run: node src/scenario-engine/judgmentRecord.test.mjs
import { validateJudgmentRecord, buildJudgmentRecord, JUDGMENT_RECORD_SCHEMA_VERSION, JUDGMENT_VERDICT, JUDGMENT_GATE } from "./judgmentRecord.js";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

function completeFields(overrides = {}) {
  return {
    artifactId: "sd_test_v1",
    artifactHash: "abc123",
    gateId: JUDGMENT_GATE.GATE8_HOCKEY_JUDGMENT,
    provider: "anthropic-claude-code-attended-session",
    sessionId: "session-abc",
    model: "claude-sonnet-5",
    reasoningConfig: { effort: "high" },
    calibrationCorpusVersion: "corpus-v1",
    rubricHash: "rubrichash",
    promptContextManifestHash: "manifesthash",
    toolManifestHash: "toolhash",
    engineCommit: "deadbeef",
    verdict: JUDGMENT_VERDICT.APPROVE,
    rationale: "the read is sourced and correct",
    confidence: "high",
    ...overrides,
  };
}

// ---- buildJudgmentRecord: derives metadataComplete/autoPromotionEligible correctly --
{
  const complete = buildJudgmentRecord(completeFields());
  ok("complete metadata -> metadataComplete: true", complete.metadataComplete === true);
  ok("complete metadata, no override -> autoPromotionEligible defaults true", complete.autoPromotionEligible === true);
  ok("a complete record passes validation", validateJudgmentRecord(complete).ok);
}

{
  const noModel = buildJudgmentRecord(completeFields({ model: null }));
  ok("model: null -> metadataComplete: false", noModel.metadataComplete === false);
  ok("model: null -> autoPromotionEligible FORCED false, never left true", noModel.autoPromotionEligible === false);
  ok("an incomplete-but-otherwise-valid record still passes shape validation", validateJudgmentRecord(noModel).ok);
}

{
  const noReasoningConfig = buildJudgmentRecord(completeFields({ reasoningConfig: null }));
  ok("reasoningConfig: null -> metadataComplete: false", noReasoningConfig.metadataComplete === false);
  ok("reasoningConfig: null -> autoPromotionEligible forced false", noReasoningConfig.autoPromotionEligible === false);
}

{
  const noCalibration = buildJudgmentRecord(completeFields({ calibrationCorpusVersion: null }));
  ok("calibrationCorpusVersion: null (no corpus exists yet) -> metadataComplete: false", noCalibration.metadataComplete === false);
  ok("no calibration corpus -> autoPromotionEligible forced false (this IS the real state before any calibration exists)", noCalibration.autoPromotionEligible === false);
}

{
  // A caller can opt a COMPLETE-metadata record OUT (e.g. "first template
  // class always promotes manually"), but never opt an INCOMPLETE one in.
  const optedOut = buildJudgmentRecord(completeFields({ requestedAutoPromotionEligible: false }));
  ok("complete metadata + explicit opt-out -> autoPromotionEligible false (caller's own choice honored)", optedOut.metadataComplete === true && optedOut.autoPromotionEligible === false);

  const cannotOptIn = buildJudgmentRecord(completeFields({ model: null, requestedAutoPromotionEligible: true }));
  ok("incomplete metadata CANNOT be opted into eligibility even if requested", cannotOptIn.autoPromotionEligible === false);
}

// ---- validateJudgmentRecord: shape + invariant checks ----------------------------
ok("rejects null/non-object input", !validateJudgmentRecord(null).ok);
{
  const record = { ...buildJudgmentRecord(completeFields()) };
  record.schemaVersion = "wrong-version";
  ok("rejects a tampered schemaVersion", !validateJudgmentRecord(record).ok);
}
ok("rejects a missing artifactId", !validateJudgmentRecord(buildJudgmentRecord(completeFields({ artifactId: "" }))).ok);
ok("rejects an invalid gateId", !validateJudgmentRecord(buildJudgmentRecord(completeFields({ gateId: "not-a-real-gate" }))).ok);
ok("accepts gate5-novelty as a valid gateId (built for future use)", validateJudgmentRecord(buildJudgmentRecord(completeFields({ gateId: JUDGMENT_GATE.GATE5_NOVELTY }))).ok);
ok("rejects a missing provider", !validateJudgmentRecord(buildJudgmentRecord(completeFields({ provider: "" }))).ok);
ok("rejects a missing sessionId", !validateJudgmentRecord(buildJudgmentRecord(completeFields({ sessionId: "" }))).ok);
ok("rejects an invalid verdict", !validateJudgmentRecord(buildJudgmentRecord(completeFields({ verdict: "maybe" }))).ok);
ok("accepts needs-human as a valid verdict", validateJudgmentRecord(buildJudgmentRecord(completeFields({ verdict: JUDGMENT_VERDICT.NEEDS_HUMAN }))).ok);
ok("rejects a missing rationale", !validateJudgmentRecord(buildJudgmentRecord(completeFields({ rationale: "" }))).ok);
ok("rejects an invalid confidence level", !validateJudgmentRecord(buildJudgmentRecord(completeFields({ confidence: "super-sure" }))).ok);
ok("rejects a missing rubricHash", !validateJudgmentRecord(buildJudgmentRecord(completeFields({ rubricHash: "" }))).ok);
ok("rejects a missing engineCommit", !validateJudgmentRecord(buildJudgmentRecord(completeFields({ engineCommit: "" }))).ok);

// ---- The invariant is checked even against a hand-tampered record, not just buildJudgmentRecord's own output --
{
  const tampered = { ...buildJudgmentRecord(completeFields({ model: null })), metadataComplete: true };
  ok("rejects a hand-tampered record CLAIMING metadataComplete:true while model is actually null", !validateJudgmentRecord(tampered).ok);
}
{
  const tampered = { ...buildJudgmentRecord(completeFields({ model: null })), autoPromotionEligible: true };
  ok("rejects a hand-tampered record with autoPromotionEligible:true despite incomplete metadata -- the forbidden 'silently defaulted' case", !validateJudgmentRecord(tampered).ok);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
