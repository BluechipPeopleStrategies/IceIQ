#!/usr/bin/env node
// Run: node src/scenario-engine/gate8BlindSecondPass.test.mjs
import { normalizeVerdict, combineBlindPasses } from "./gate8BlindSecondPass.js";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

const CLEAN = {
  hockeyAccuracy: { assessment: "correct" },
  ambiguity: { assessment: "single-forced-read" },
  pedagogy: { assessment: "sound" },
  adversarialFailureModes: { assessment: "none-found" },
};

function withDimension(base, dim, patch) {
  return { ...base, [dim]: { ...base[dim], ...patch } };
}

// normalizeVerdict: clean input -> pass
{
  const v = normalizeVerdict(CLEAN);
  ok("all four clean dimensions -> pass", v.verdict === "pass");
}

// normalizeVerdict: malformed/missing input never silently passes
{
  ok("null verdict -> review-required", normalizeVerdict(null).verdict === "review-required");
  ok("empty object -> review-required", normalizeVerdict({}).verdict === "review-required");
  const missingOne = { ...CLEAN };
  delete missingOne.pedagogy;
  ok("missing one dimension -> review-required", normalizeVerdict(missingOne).verdict === "review-required");
}

// normalizeVerdict: any dimension marked uncertain forces review-required, never pass
{
  const uncertainAmbiguity = withDimension(CLEAN, "ambiguity", { assessment: "uncertain" });
  const v = normalizeVerdict(uncertainAmbiguity);
  ok("uncertain dimension -> review-required, not pass", v.verdict === "review-required");
  ok("reason names the uncertain dimension", v.reason.includes("ambiguity"));
}

// normalizeVerdict: a genuinely bad dimension -> fail, with the specific dimension named
{
  const badAccuracy = withDimension(CLEAN, "hockeyAccuracy", { assessment: "incorrect", issue: "the declared correct answer is wrong" });
  const v = normalizeVerdict(badAccuracy);
  ok("bad hockey-accuracy dimension -> fail", v.verdict === "fail");
  ok("reason names the failed dimension and issue", v.reason.includes("hockeyAccuracy") && v.reason.includes("wrong"));
}

// combineBlindPasses: both clean passes -> agree-pass, eligible for calibration tier
{
  const r = combineBlindPasses(CLEAN, CLEAN);
  ok("both clean -> agree-pass", r.status === "agree-pass");
  ok("agree-pass is eligible for calibration tier", r.eligibleForCalibrationTier === true);
}

// combineBlindPasses: both independently fail the same way -> agree-fail, not eligible
{
  const bad = withDimension(CLEAN, "pedagogy", { assessment: "weak", issue: "no mechanism given" });
  const r = combineBlindPasses(bad, bad);
  ok("both fail -> agree-fail", r.status === "agree-fail");
  ok("agree-fail is not eligible for calibration tier", r.eligibleForCalibrationTier === false);
}

// combineBlindPasses: the core safety property -- ANY disagreement or uncertainty
// routes to a human, never averages, never majority-votes (there's only two
// passes, so "majority" isn't even well-defined -- the point is neither pass
// gets silently overridden by the other).
{
  const r = combineBlindPasses(CLEAN, withDimension(CLEAN, "hockeyAccuracy", { assessment: "incorrect", issue: "x" }));
  ok("pass vs fail -> needs-human, not silently averaged", r.status === "needs-human");
  ok("needs-human is not eligible for calibration tier", r.eligibleForCalibrationTier === false);
  ok("reason states both passes' verdicts", r.reason.includes("pass") && r.reason.includes("fail"));
}

{
  const r = combineBlindPasses(CLEAN, withDimension(CLEAN, "ambiguity", { assessment: "uncertain" }));
  ok("pass vs uncertain -> needs-human, uncertainty never clears silently", r.status === "needs-human");
}

// combineBlindPasses: a single malformed pass can never be outvoted into a pass
{
  const r = combineBlindPasses(CLEAN, {});
  ok("clean pass + malformed pass -> needs-human, not agree-pass", r.status === "needs-human");
}

// combineBlindPasses: full verdict detail is always attached, so Thomas sees
// exactly why -- never just a bare status string
{
  const r = combineBlindPasses(CLEAN, withDimension(CLEAN, "pedagogy", { assessment: "weak" }));
  ok("both full normalized verdicts are attached for review", !!r.passA && !!r.passB);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
