// Structured-finding format, exactly per the design spec: "validator
// code+version, actor/puck/action IDs, event time/interval, measured value,
// threshold/range, margin, units, profile/source versions, assumptions,
// solver version, severity, answerImpact (none/possible/changes-answer),
// human explanation."
//
// Every hard-failure detector and boundary check in this simulator produces
// findings through buildFinding() -- never a bare string or boolean --so a
// downstream consumer (gate 3 in the run envelope, a human reviewer, a
// recall audit) can always trace exactly what was measured, against what
// threshold, with what margin, under which profile version.

export const FINDINGS_SCHEMA_VERSION = "structured-finding-v1";

export const SEVERITY = Object.freeze({
  INFO: "info",
  WARNING: "warning",
  HARD_FAILURE: "hard-failure",
});

export const ANSWER_IMPACT = Object.freeze({
  NONE: "none",
  POSSIBLE: "possible",
  CHANGES_ANSWER: "changes-answer",
});

export function buildFinding({
  validatorCode,
  validatorVersion,
  actorId = null,
  puck = false,
  actionIndex = null,
  eventTime,
  eventIntervalS = null,
  measuredValue,
  threshold,
  units,
  profileId,
  profileVersion,
  assumptions = [],
  solverVersion,
  severity,
  answerImpact,
  explanation,
}) {
  if (!validatorCode) throw new Error("buildFinding: validatorCode is required");
  if (!Object.values(SEVERITY).includes(severity)) throw new Error(`buildFinding: invalid severity ${severity}`);
  if (!Object.values(ANSWER_IMPACT).includes(answerImpact)) throw new Error(`buildFinding: invalid answerImpact ${answerImpact}`);
  if (!explanation) throw new Error("buildFinding: explanation is required -- a finding with no human explanation defeats its own purpose");
  if (!Number.isFinite(measuredValue)) throw new Error("buildFinding: measuredValue must be a finite number");
  if (!Number.isFinite(eventTime)) throw new Error("buildFinding: eventTime must be a finite number");

  const margin = Number.isFinite(threshold) ? Math.round((measuredValue - threshold) * 1e6) / 1e6 : null;

  return Object.freeze({
    schemaVersion: FINDINGS_SCHEMA_VERSION,
    validatorCode,
    validatorVersion,
    actorId,
    puck,
    actionIndex,
    eventTime,
    eventIntervalS,
    measuredValue,
    threshold,
    margin,
    units,
    profileId,
    profileVersion,
    assumptions,
    solverVersion,
    severity,
    answerImpact,
    explanation,
  });
}

// UNSUPPORTED_MODEL is not a severity -- it's a distinct result kind. A
// phenomenon this simulator doesn't model (saucer passes, deflections,
// contact) must never fall through to a guessed pass or fail; this is the
// explicit third path. Never constructed via buildFinding() (which requires
// a measured value/threshold that genuinely doesn't exist here).
export function buildUnsupportedModel({ validatorCode, validatorVersion, actorId = null, puck = false, actionIndex = null, eventTime, reason }) {
  if (!reason) throw new Error("buildUnsupportedModel: reason is required");
  return Object.freeze({
    schemaVersion: FINDINGS_SCHEMA_VERSION,
    kind: "UNSUPPORTED_MODEL",
    validatorCode,
    validatorVersion,
    actorId,
    puck,
    actionIndex,
    eventTime,
    reason,
  });
}

export function isUnsupportedModel(finding) {
  return finding?.kind === "UNSUPPORTED_MODEL";
}

export function hardFailuresOf(findings) {
  return findings.filter((f) => !isUnsupportedModel(f) && f.severity === SEVERITY.HARD_FAILURE);
}
