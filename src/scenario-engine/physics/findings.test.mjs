#!/usr/bin/env node
// Run: node src/scenario-engine/physics/findings.test.mjs
import { buildFinding, buildUnsupportedModel, isUnsupportedModel, SEVERITY, ANSWER_IMPACT } from "./findings.js";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };
const throws = (fn) => { try { fn(); return false; } catch { return true; } };

function validArgs(overrides = {}) {
  return {
    validatorCode: "test-code", validatorVersion: "v1", actorId: "D1", eventTime: 1.0,
    measuredValue: 10, threshold: 5, units: "m/s", profileId: "p1", profileVersion: "v1",
    solverVersion: "v1", severity: SEVERITY.HARD_FAILURE, answerImpact: ANSWER_IMPACT.CHANGES_ANSWER,
    explanation: "test explanation", ...overrides,
  };
}

const finding = buildFinding(validArgs());
ok("a valid finding builds successfully", finding.validatorCode === "test-code");
ok("margin is computed as measuredValue - threshold", finding.margin === 5);
ok("finding is frozen (immutable record)", Object.isFrozen(finding));

ok("rejects a missing validatorCode", throws(() => buildFinding(validArgs({ validatorCode: undefined }))));
ok("rejects an invalid severity", throws(() => buildFinding(validArgs({ severity: "extremely-bad" }))));
ok("rejects an invalid answerImpact", throws(() => buildFinding(validArgs({ answerImpact: "who-knows" }))));
ok("rejects a missing explanation (a finding with no human explanation defeats its purpose)", throws(() => buildFinding(validArgs({ explanation: "" }))));
ok("rejects a non-finite measuredValue", throws(() => buildFinding(validArgs({ measuredValue: NaN }))));
ok("rejects a non-finite eventTime", throws(() => buildFinding(validArgs({ eventTime: Infinity }))));

// margin is null when there's no numeric threshold to compare against.
const findingNoThreshold = buildFinding(validArgs({ threshold: undefined }));
ok("margin is null when threshold is not a number", findingNoThreshold.margin === null);

const unsupported = buildUnsupportedModel({ validatorCode: "x", validatorVersion: "v1", eventTime: 1, reason: "no data" });
ok("buildUnsupportedModel builds successfully", unsupported.kind === "UNSUPPORTED_MODEL");
ok("isUnsupportedModel recognizes it", isUnsupportedModel(unsupported));
ok("isUnsupportedModel rejects a real finding", !isUnsupportedModel(finding));
ok("isUnsupportedModel rejects null/undefined safely", !isUnsupportedModel(null) && !isUnsupportedModel(undefined));
ok("buildUnsupportedModel rejects a missing reason", throws(() => buildUnsupportedModel({ validatorCode: "x", eventTime: 1 })));
ok("an UNSUPPORTED_MODEL record has no severity (structurally distinct from pass/fail)", unsupported.severity === undefined);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
