#!/usr/bin/env node
// Run: node src/scenario-engine/physics/impossibleSpeed.test.mjs
//
// Decision 1, docs/manual-playtest/2026-08-03-decisions-round4.md: the motion
// that is validated must be the motion that plays.
//
// Half of that was already closed on 2026-08-01. sampleAction now samples the
// constant-acceleration-from-rest curve the detectors certify, and
// detectImpossibleSampledAcceleration measures the emitted trace rather than
// the declared endpoints, so the certified and played ACCELERATION cannot
// diverge.
//
// The SPEED half was never checked anywhere. Every profile cites topSpeedMPS,
// and it was read only to derive a stopping distance and to time an
// interception — nothing asked whether a skater's own motion stayed under it.
// That gap is created BY the from-rest model: under d = 0.5*a*t^2 a leg exits
// at v = 2d/T, so a long route given a generous duration passes the
// acceleration cap comfortably while implying a skater faster than that age
// band has ever been measured. The acceleration is fine; the speed is fiction.
//
// This file locks the detector and, more importantly, locks the two models
// together — the peak speed the samples imply has to agree with the peak speed
// the validated model implies, or they have drifted apart again.

import { readFileSync } from "node:fs";
import {
  detectImpossibleAcceleration,
  detectImpossibleSampledAcceleration,
  detectImpossibleSpeed,
} from "./hardFailureDetectors.js";
import { simulate } from "./simulator.js";
import { DZ_BREAKOUT_SCENARIO_DEFINITION } from "../breakout/dzBreakoutScenario.js";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

const profile = JSON.parse(readFileSync(new URL("./profiles/u13.json", import.meta.url), "utf8"));
const withFrame = { ...profile, rinkFrameProfile: { lengthM: 60, widthM: 30 } };
const TOP_SPEED = profile.player.topSpeedMPS.value;   // 8.6
const CAP = TOP_SPEED * 1.15;                          // 9.89

// Sample the same from-rest curve simulator.sampleAction emits.
function fromRestSamples(distanceM, durationS, step = 0.5, actorId = "D1") {
  const s = [];
  for (let t = 0; t < durationS; t += step) {
    const frac = ((t / durationS) ** 2);
    s.push({ t, pos: [distanceM * frac, 0], actorId, actionKind: "skate" });
  }
  s.push({ t: durationS, pos: [distanceM, 0], actorId, actionKind: "skate" });
  return s;
}

// ---- the case that used to slip through -------------------------------------

{
  // 40 m in 8 s. From rest that is a = 2d/T^2 = 1.25 m/s^2 against a 4.13 cap,
  // and an exit speed of 2d/T = 10.0 m/s against a cited 8.6.
  const action = { actorId: "D1", kind: "skate", startTime: 0, endTime: 8, toPosition: [40, 0] };
  const samples = fromRestSamples(40, 8);

  ok("the endpoint acceleration check passes it — the acceleration really is fine",
    detectImpossibleAcceleration(action, 0, [0, 0], withFrame) === null);
  ok("the sampled acceleration check passes it too — both models agree on acceleration",
    detectImpossibleSampledAcceleration(samples, "D1", profile) === null);

  const finding = detectImpossibleSpeed(samples, "D1", profile);
  ok("the speed check catches it — this is the half nothing was checking", finding !== null);
  ok("it is coded impossible-speed with a real measured value and threshold",
    finding?.validatorCode === "impossible-speed" &&
    Number.isFinite(finding.measuredValue) && Number.isFinite(finding.threshold));
  ok("it reports the true exit speed of 10.0 m/s, not the 9.69 m/s interval average that would have slipped under the cap",
    Math.abs(finding.measuredValue - 10.0) < 0.05);
  ok("the explanation names the distinction — acceleration within capability, speed not",
    /acceleration is within capability/i.test(finding.explanation));
}

// ---- and is not an artifact of the sample step -------------------------------

{
  // The whole reason for recovering the peak from the midpoint identity rather
  // than reading an interval average: the answer must not move when the
  // simulator changes SAMPLE_STEP_S.
  const peaks = [0.25, 0.5, 1.0].map((step) => {
    const f = detectImpossibleSpeed(fromRestSamples(40, 8, step), "D1", profile);
    return f ? f.measuredValue : null;
  });
  ok(`the measured peak is the same at every sample step (${peaks.map((p) => p?.toFixed(2)).join(", ")} m/s)`,
    peaks.every((p) => p !== null && Math.abs(p - peaks[0]) < 0.01));
}

{
  // A single-interval track: from rest, the average over the interval is half
  // the exit speed, so the peak must come out at 2x the average — not 1.5x,
  // which is what a naive midpoint correction gives when it forgets the actor
  // starts at rest half an interval before the first midpoint.
  const samples = [
    { t: 0, pos: [0, 0], actorId: "D1", actionKind: "skate" },
    { t: 1, pos: [12, 0], actorId: "D1", actionKind: "skate" },
  ];
  const f = detectImpossibleSpeed(samples, "D1", profile);
  ok("a single interval from rest reports 2x its average (24.0 m/s), not 1.5x",
    f !== null && Math.abs(f.measuredValue - 24.0) < 0.01);
}

// ---- the two models have to agree ------------------------------------------

{
  // The guarantee itself. For every leg, the peak speed recovered from the
  // EMITTED samples must match the peak the VALIDATED model implies (2d/T).
  // If these ever disagree, the certified curve and the played curve have
  // drifted apart again, which is the whole defect.
  const cases = [[40, 8], [15.3, 3.5], [10, 2.5], [5, 2], [22, 6]];
  const rows = cases.map(([d, t]) => {
    const f = detectImpossibleSpeed(fromRestSamples(d, t), "D1", { ...profile, player: { ...profile.player, topSpeedMPS: { value: 0.001 } } });
    return { d, t, sampled: f.measuredValue, model: (2 * d) / t };
  });
  ok("sampled peak speed equals the validated model's 2d/T on every leg",
    rows.every((r) => Math.abs(r.sampled - r.model) < 0.01));
  for (const r of rows) {
    console.log(`      ${r.d}m / ${r.t}s -> sampled ${r.sampled.toFixed(3)} m/s, model ${r.model.toFixed(3)} m/s`);
  }
}

// ---- and it stays quiet on real content -------------------------------------

{
  const trace = await simulate(DZ_BREAKOUT_SCENARIO_DEFINITION, profile);
  const speedFindings = trace.findings.filter((f) => f.validatorCode === "impossible-speed");
  ok("the live breakout fixture carries no impossible-speed finding", speedFindings.length === 0);
  ok("and is still physicsClean overall", trace.physicsClean === true);

  // The puck must never be judged against a skater's top speed — a pass leaves
  // the stick far faster than any skater and is judged by detectUnreachablePass.
  const puckSpeeds = trace.samples.filter((s) => s.actorId === "puck");
  const fastest = puckSpeeds.reduce((acc, s, i, arr) => {
    if (i === 0) return acc;
    const dt = s.t - arr[i - 1].t;
    if (dt <= 0) return acc;
    return Math.max(acc, Math.hypot(s.pos[0] - arr[i - 1].pos[0], s.pos[1] - arr[i - 1].pos[1]) / dt);
  }, 0);
  ok(`the puck moves faster than a U13's cited top speed (${fastest.toFixed(2)} m/s vs ${TOP_SPEED}), so judging it by skater physics would be measuring the wrong thing`,
    fastest > TOP_SPEED);
  ok("and no impossible-speed finding is ever attributed to the puck — the simulator only ever hands this detector a skater track",
    trace.findings.every((f) => !(f.validatorCode === "impossible-speed" && f.actorId === "puck")));
}

{
  const noSpeed = { ...profile, player: { ...profile.player, topSpeedMPS: {} } };
  const f = detectImpossibleSpeed(fromRestSamples(40, 8), "D1", noSpeed);
  ok("a profile with no topSpeedMPS reports UNSUPPORTED_MODEL rather than silently passing",
    f !== null && f.validatorCode === "impossible-speed" && /no topSpeedMPS/.test(f.reason || f.explanation || ""));
}

ok("a stationary actor makes no speed claim and is not flagged",
  detectImpossibleSpeed([{ t: 0, pos: [0, 0], actorId: "D1" }], "D1", profile) === null);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
