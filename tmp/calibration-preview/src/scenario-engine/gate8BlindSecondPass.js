// Gate 8 blind second-pass agreement -- Priority 1 from
// docs/superpowers/specs/2026-07-30-tactical-judgment-trust-design.md,
// modeled on AI-assisted mammography double-reading: an independent second
// judgment pass, with zero visibility into the first pass's verdict or
// reasoning, has to AGREE before a candidate is even eligible for the
// calibration-tier evaluation gate 9 already owns. Disagreement (or either
// pass being anything less than a clean, confident pass) routes straight to
// Thomas's queue with both verdicts shown.
//
// What this deliberately does NOT do, per the design doc's own caution
// (LLM-judge calibration literature, finding 3): self-consistency/agreement
// is never treated as a confidence score or promotion evidence on its own.
// Agreement only ever WIDENS eligibility for the existing, separately-earned
// calibration bar (50 decisions, 20/template, 20%+10 holdout, zero
// wrong-answer false approvals) -- it never substitutes for it, and it never
// auto-promotes anything by itself.
//
// Both passes MUST be invoked from an attended Claude Code session
// (framework-fit decision 8) -- this module has no headless/API-key path and
// is not meant to run in CI. It is called live, by Claude, with Thomas
// present, the same way gate 5's SSR judgment call is.

const REQUIRED_DIMENSIONS = ["hockeyAccuracy", "ambiguity", "pedagogy", "adversarialFailureModes"];
const CLEAN_ASSESSMENTS = {
  hockeyAccuracy: "correct",
  ambiguity: "single-forced-read",
  pedagogy: "sound",
  adversarialFailureModes: "none-found",
};

// Deterministic post-processing (code, not model trust) -- matches gate 5's
// SiblingReviewVerdict pattern: a malformed or incomplete verdict is never
// silently treated as a pass.
export function normalizeVerdict(raw) {
  if (!raw || typeof raw !== "object") {
    return { verdict: "review-required", reason: "malformed or missing verdict object", raw };
  }

  for (const dim of REQUIRED_DIMENSIONS) {
    if (!raw[dim] || typeof raw[dim].assessment !== "string") {
      return { verdict: "review-required", reason: `missing or malformed dimension: ${dim}`, raw };
    }
  }

  const uncertainDim = REQUIRED_DIMENSIONS.find((dim) => raw[dim].assessment === "uncertain");
  if (uncertainDim) {
    return { verdict: "review-required", reason: `dimension marked uncertain: ${uncertainDim}`, raw };
  }

  const isClean = REQUIRED_DIMENSIONS.every((dim) => raw[dim].assessment === CLEAN_ASSESSMENTS[dim]);
  if (isClean) {
    return { verdict: "pass", reason: null, raw };
  }

  const failedDim = REQUIRED_DIMENSIONS.find((dim) => raw[dim].assessment !== CLEAN_ASSESSMENTS[dim]);
  return { verdict: "fail", reason: `${failedDim}: ${raw[failedDim].assessment}${raw[failedDim].issue ? ` -- ${raw[failedDim].issue}` : ""}`, raw };
}

// The combination rule itself. Minority-veto, never majority-vote, never
// averaged: only mutual, clean agreement clears a candidate for the existing
// calibration-tier evaluation. Anything else -- either pass failing, either
// pass uncertain, or the two passes disagreeing -- routes to Thomas's queue.
export function combineBlindPasses(passA, passB) {
  const a = normalizeVerdict(passA);
  const b = normalizeVerdict(passB);

  if (a.verdict === "pass" && b.verdict === "pass") {
    return {
      status: "agree-pass",
      eligibleForCalibrationTier: true,
      reason: "both independent passes cleared all four dimensions",
      passA: a,
      passB: b,
    };
  }

  if (a.verdict === "fail" && b.verdict === "fail") {
    return {
      status: "agree-fail",
      eligibleForCalibrationTier: false,
      reason: "both independent passes independently rejected the candidate",
      passA: a,
      passB: b,
    };
  }

  return {
    status: "needs-human",
    eligibleForCalibrationTier: false,
    reason: a.verdict === b.verdict
      ? `both passes returned "review-required" -- ${a.reason}`
      : `passes disagree: first pass = ${a.verdict}${a.reason ? ` (${a.reason})` : ""}, second pass = ${b.verdict}${b.reason ? ` (${b.reason})` : ""}`,
    passA: a,
    passB: b,
  };
}
