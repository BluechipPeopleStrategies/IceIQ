#!/usr/bin/env node
// Run: node src/scenario-engine/noveltySignature.test.mjs
//
// The discriminating tests: a mirror, a prose change, and sub-threshold
// coordinate jitter must all collapse; a different tactical claim, answer, or
// decision topology must not; and the hand-authored definitions in the tree
// must stay pairwise distinct.

import {
  NOVELTY_SIGNATURE_VERSION,
  MIN_GEOMETRY_DISTANCE_M,
  MIN_TIME_DISTANCE_S,
  signatureOf,
  signatureDigest,
  signaturesMatch,
  geometryTimeDistance,
  filterNovel,
} from "./noveltySignature.js";
import { DZ_BREAKOUT_SCENARIO_DEFINITION } from "./breakout/dzBreakoutScenario.js";
import { CLOSED_LANE_CLAIMED_OPEN_VARIANT } from "./breakout/dzBreakoutImpossibleVariants.js";
import { TWO_ON_ONE_COACH_DECLARED_DEFINITION } from "./coachDeclaredFixture.js";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

// --- transforms used by the tests -----------------------------------------

// Hand-mirror a ScenarioDefinition. src/play/playVariants.js's mirrorPlayY is
// the repo's real far-side transform, but it walks legacy animated-play nodes
// (node.pos / node.motions / node.freeze / node.overlays) in feet-space, so it
// cannot be pointed at a ScenarioDefinition. What it actually DOES is a single
// flip about the rink's long axis (flipY: y -> midY*2 - y). RinkFrame is
// already centred (rinkFrame.js: origin centre ice, symmetric bounds), so the
// same transform here is y -> -y on every coordinate. The prose is left
// untouched on purpose: a real far-side mirror leaves "the low side" describing
// the wrong side, and the signature must not care.
const flipY = ([x, y]) => [x, -y];
function mirrorDefinitionY(def) {
  return {
    ...def,
    id: `${def.id}_mirror`,
    contentHash: null,
    initialState: {
      ...def.initialState,
      actors: def.initialState.actors.map((a) => ({ ...a, position: flipY(a.position) })),
      puck: { ...def.initialState.puck, position: flipY(def.initialState.puck.position) },
    },
    intendedActions: def.intendedActions.map((a) => (a.toPosition ? { ...a, toPosition: flipY(a.toPosition) } : { ...a })),
  };
}

// Deterministic pseudo-random jitter, scaled so the LARGEST single-point
// displacement stays under MIN_GEOMETRY_DISTANCE_M. No Math.random: a novelty
// gate whose test is flaky is worse than no gate.
function jitterDefinition(def, maxDisplacementM) {
  let seed = 20260803;
  const next = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const nudge = ([x, y]) => {
    const angle = next() * Math.PI * 2;
    const r = maxDisplacementM * (0.6 + 0.4 * next()); // 60-100% of the budget
    return [x + r * Math.cos(angle), y + r * Math.sin(angle)];
  };
  return {
    ...def,
    id: `${def.id}_jitter`,
    contentHash: null,
    initialState: {
      ...def.initialState,
      actors: def.initialState.actors.map((a) => ({ ...a, position: nudge(a.position) })),
      puck: { ...def.initialState.puck, position: nudge(def.initialState.puck.position) },
    },
    intendedActions: def.intendedActions.map((a) => (a.toPosition ? { ...a, toPosition: nudge(a.toPosition) } : { ...a })),
  };
}

const base = DZ_BREAKOUT_SCENARIO_DEFINITION;
const baseSig = signatureOf(base);

// --- version + shape -------------------------------------------------------

ok("signature carries the module version", baseSig.version === NOVELTY_SIGNATURE_VERSION);
ok("signature key is a stable string", typeof baseSig.key === "string" && baseSig.key.length > 0);
ok("signatureOf is deterministic across repeated calls", signatureOf(base).key === baseSig.key);
const digest = await signatureDigest(baseSig);
ok("signatureDigest returns a 64-char hex digest", /^[0-9a-f]{64}$/.test(digest));
ok("signatureDigest is stable for the same definition", digest === (await signatureDigest(signatureOf(base))));

// --- 1. a MIRROR is not a new scenario state -------------------------------

const mirrored = mirrorDefinitionY(base);
const mirroredSig = signatureOf(mirrored);
ok("mirrored copy: coordinates really did move (the mirror is a real transform)",
  mirrored.initialState.actors.some((a, i) => a.position[1] !== base.initialState.actors[i].position[1]));
ok("mirrored copy produces the SAME signature key", mirroredSig.key === baseSig.key);
ok("mirrored copy produces the SAME canonical geometry",
  JSON.stringify(mirroredSig.geometry) === JSON.stringify(baseSig.geometry));
ok("mirrored copy matches the original (not a new scenario state)", signaturesMatch(baseSig, mirroredSig));
ok("mirror is at zero geometry distance after canonicalization",
  geometryTimeDistance(baseSig, mirroredSig).geometryM < 1e-9);
const doubleMirrored = signatureOf(mirrorDefinitionY(mirrored));
ok("mirroring twice also collapses (transform is an involution)", signaturesMatch(baseSig, doubleMirrored));
const mirroredTwoOnOne = signatureOf(mirrorDefinitionY(TWO_ON_ONE_COACH_DECLARED_DEFINITION));
ok("mirror collapse holds on the second fixture too",
  signaturesMatch(signatureOf(TWO_ON_ONE_COACH_DECLARED_DEFINITION), mirroredTwoOnOne));

// --- 2. sub-threshold coordinate JITTER is not a new scenario state --------

const jittered = jitterDefinition(base, MIN_GEOMETRY_DISTANCE_M * 0.4);
const jitteredSig = signatureOf(jittered);
const jitterDist = geometryTimeDistance(baseSig, jitteredSig);
ok("jittered copy: coordinates really did move",
  jittered.initialState.actors.some((a, i) => a.position[0] !== base.initialState.actors[i].position[0]));
ok("jittered copy stays under the geometry threshold", jitterDist.geometryM < MIN_GEOMETRY_DISTANCE_M);
ok("jittered copy produces the SAME signature key", jitteredSig.key === baseSig.key);
ok("jittered copy matches the original (not a new scenario state)", signaturesMatch(baseSig, jitteredSig));

// The threshold must not be vacuous: push past it and novelty must return.
const shoved = signatureOf(jitterDefinition(base, MIN_GEOMETRY_DISTANCE_M * 3));
ok("above-threshold displacement DOES count as a new scenario state", !signaturesMatch(baseSig, shoved));

// Time behaves the same way on both sides of MIN_TIME_DISTANCE_S.
const nudgedTime = signatureOf({
  ...base,
  id: `${base.id}_time_nudge`,
  decisionFreeze: { ...base.decisionFreeze, time: base.decisionFreeze.time + MIN_TIME_DISTANCE_S * 0.5 },
});
ok("sub-threshold timing shift is not a new scenario state", signaturesMatch(baseSig, nudgedTime));
const shiftedTime = signatureOf({
  ...base,
  id: `${base.id}_time_shift`,
  decisionFreeze: { ...base.decisionFreeze, time: base.decisionFreeze.time + MIN_TIME_DISTANCE_S * 3 },
});
ok("above-threshold timing shift IS a new scenario state", !signaturesMatch(baseSig, shiftedTime));

// --- 3. a PROSE change is not a new scenario state -------------------------

const reworded = signatureOf({
  ...base,
  id: `${base.id}_reworded`,
  declaredRead: { ...base.declaredRead, description: "Wheel it behind the net away from the pressure and hit the winger." },
  decisionFreeze: {
    ...base.decisionFreeze,
    observableCues: ["F1 is charging hard at one side", "F2 has not picked a side yet", "the net is between you and F1"],
  },
});
ok("reworded declaredRead + cues produce the SAME signature key", reworded.key === baseSig.key);
ok("reworded copy matches the original (not a new scenario state)", signaturesMatch(baseSig, reworded));

// --- 4. a different TACTICAL CLAIM is a new scenario state -----------------

const otherClaim = signatureOf({
  ...base,
  id: `${base.id}_other_claim`,
  tacticalClaimVersion: "claim_dz_breakout_reverse_to_the_strong_side_v1@v1",
});
ok("different tactical claim produces a DIFFERENT signature key", otherClaim.key !== baseSig.key);
ok("different tactical claim is a new scenario state", !signaturesMatch(baseSig, otherClaim));

const otherFamily = signatureOf({ ...base, id: `${base.id}_other_family`, family: "nz_regroup" });
ok("different family produces a DIFFERENT signature key", otherFamily.key !== baseSig.key);

// A claim VERSION bump over unchanged geometry must NOT manufacture novelty.
const claimBump = signatureOf({
  ...base,
  id: `${base.id}_claim_v2`,
  tacticalClaimVersion: "claim_dz_breakout_retrieval_escape_pressure_v1@v2",
});
ok("re-approving the same claim at a new version is NOT a new scenario state", signaturesMatch(baseSig, claimBump));

// --- 5. a different ANSWER is a new scenario state -------------------------

// Same ice, same actors, same cues -- the read now belongs to the winger.
const otherAnswerActor = signatureOf({
  ...base,
  id: `${base.id}_answer_actor`,
  declaredRead: { actorId: "W1", description: base.declaredRead.description },
});
ok("different answering actor produces a DIFFERENT signature key", otherAnswerActor.key !== baseSig.key);
ok("different answering actor is a new scenario state", !signaturesMatch(baseSig, otherAnswerActor));

// Same actor, different action: the outlet pass becomes a shot.
const otherAnswerAction = signatureOf({
  ...base,
  id: `${base.id}_answer_action`,
  intendedActions: [base.intendedActions[0], { ...base.intendedActions[1], kind: "shot" }],
});
ok("different answer action kind produces a DIFFERENT signature key", otherAnswerAction.key !== baseSig.key);
ok("different answer action kind is a new scenario state", !signaturesMatch(baseSig, otherAnswerAction));

// Same actor, same action kind, answer lands somewhere materially different.
const movedAnswerTarget = signatureOf({
  ...base,
  id: `${base.id}_answer_moved`,
  intendedActions: [
    base.intendedActions[0],
    { ...base.intendedActions[1], toPosition: [base.intendedActions[1].toPosition[0], base.intendedActions[1].toPosition[1] + 6] },
  ],
});
ok("answer landing 6m away is a new scenario state", !signaturesMatch(baseSig, movedAnswerTarget));
ok("answer move is reported on its own axis",
  geometryTimeDistance(baseSig, movedAnswerTarget).answerMoveM > MIN_GEOMETRY_DISTANCE_M);

// --- 6. a different DECISION TOPOLOGY is a new scenario state --------------

// One more forechecker on the ice: same claim, same answer, different problem.
const extraDefender = signatureOf({
  ...base,
  id: `${base.id}_third_forechecker`,
  initialState: {
    ...base.initialState,
    actors: [...base.initialState.actors, { id: "F3", team: "away", role: "defender", position: [10, 5] }],
  },
});
ok("an added defender produces a DIFFERENT signature key", extraDefender.key !== baseSig.key);
ok("an added defender is a new scenario state", !signaturesMatch(baseSig, extraDefender));

// Same roster, different action sequence shape.
const droppedAction = signatureOf({
  ...base,
  id: `${base.id}_no_outlet`,
  intendedActions: [base.intendedActions[0]],
});
ok("a dropped action produces a DIFFERENT signature key", droppedAction.key !== baseSig.key);
ok("a dropped action is a new scenario state", !signaturesMatch(baseSig, droppedAction));

// A role reassignment (support -> defender) is a topology change, not a rename.
const roleSwap = signatureOf({
  ...base,
  id: `${base.id}_role_swap`,
  initialState: {
    ...base.initialState,
    actors: base.initialState.actors.map((a) => (a.id === "W1" ? { ...a, role: "defender" } : a)),
  },
});
ok("a changed actor role produces a DIFFERENT signature key", roleSwap.key !== baseSig.key);

// Renaming actor ids alone is NOT a topology change.
const renamed = signatureOf({
  ...base,
  id: `${base.id}_renamed`,
  initialState: {
    ...base.initialState,
    actors: base.initialState.actors.map((a) => ({ ...a, id: `${a.id}_x` })),
  },
  intendedActions: base.intendedActions.map((a) => ({ ...a, actorId: `${a.actorId}_x` })),
  declaredRead: { ...base.declaredRead, actorId: `${base.declaredRead.actorId}_x` },
});
ok("renaming actor ids is NOT a new scenario state", signaturesMatch(baseSig, renamed));

// --- 7. the hand-authored definitions in the tree are pairwise distinct ----
//
// Three definitions with hand-placed coordinates live in the tree:
//   1. the real breakout          (breakout/dzBreakoutScenario.js)
//   2. the two-on-one coach-declared fixture (coachDeclaredFixture.js)
//   3. the closed-lane variant    (breakout/dzBreakoutImpossibleVariants.js),
//      the one variant that moves a player rather than a clock -- F1 relocated
//      onto the outlet-pass line.
// (3) is the load-bearing case: it shares family, claim, answer and topology
// with (1), so it is separated ONLY by the geometry-distance dimension. If
// that dimension were doing no work, this test would fail while a naive
// family-based signature would still pass.
const authored = [
  ["dz_breakout", DZ_BREAKOUT_SCENARIO_DEFINITION],
  ["two_on_one coach-declared", TWO_ON_ONE_COACH_DECLARED_DEFINITION],
  ["dz_breakout closed-lane", CLOSED_LANE_CLAIMED_OPEN_VARIANT],
];
const authoredSigs = authored.map(([name, def]) => [name, signatureOf(def)]);
let allDistinct = true;
for (let i = 0; i < authoredSigs.length; i++) {
  for (let j = i + 1; j < authoredSigs.length; j++) {
    if (signaturesMatch(authoredSigs[i][1], authoredSigs[j][1])) {
      allDistinct = false;
      console.log(`      collision: ${authoredSigs[i][0]} vs ${authoredSigs[j][0]}`);
    }
  }
}
ok("the three hand-authored definitions produce three distinct signatures", allDistinct);
ok("the closed-lane variant shares its key with the breakout (separated by distance alone)",
  authoredSigs[2][1].key === authoredSigs[0][1].key);
ok("the closed-lane variant is separated by real displacement",
  geometryTimeDistance(authoredSigs[0][1], authoredSigs[2][1]).geometryM > MIN_GEOMETRY_DISTANCE_M);

const digests = await Promise.all(authoredSigs.map(([, s]) => signatureDigest(s)));
ok("the two different families get different key digests", digests[0] !== digests[1]);

// --- 8. filterNovel: corpus AND within-batch -------------------------------

const corpus = [DZ_BREAKOUT_SCENARIO_DEFINITION];
const batch = [
  mirrorDefinitionY(base),                                   // mirror of the corpus -> reject
  jitterDefinition(base, MIN_GEOMETRY_DISTANCE_M * 0.4),     // jitter of the corpus -> reject
  TWO_ON_ONE_COACH_DECLARED_DEFINITION,                      // genuinely new -> keep
  mirrorDefinitionY(TWO_ON_ONE_COACH_DECLARED_DEFINITION),   // mirror of an EARLIER SURVIVOR -> reject
  CLOSED_LANE_CLAIMED_OPEN_VARIANT,                          // same key, far enough away -> keep
];
const result = filterNovel(batch, corpus);
ok("filterNovel keeps exactly the two genuinely-new definitions", result.kept.length === 2);
ok("filterNovel keeps the right two",
  result.kept[0].id === TWO_ON_ONE_COACH_DECLARED_DEFINITION.id && result.kept[1].id === CLOSED_LANE_CLAIMED_OPEN_VARIANT.id);
ok("filterNovel rejects the mirror of an EARLIER SURVIVOR, not just of the corpus",
  result.rejected.some((r) => r.reason.includes("earlier survivor in this batch")));
ok("filterNovel rejection reasons carry the measured distances",
  result.rejected.every((r) => /geometry \d/.test(r.reason) && /time \d/.test(r.reason)));
ok("filterNovel reports the thresholds it used (spec: publish all thresholds)",
  result.thresholds.minGeometryM === MIN_GEOMETRY_DISTANCE_M && result.thresholds.minTimeS === MIN_TIME_DISTANCE_S);
ok("filterNovel stamps the signature version on the result", result.signatureVersion === NOVELTY_SIGNATURE_VERSION);
ok("filterNovel on an empty batch is safe", filterNovel([], corpus).kept.length === 0);

// The headline arithmetic this module exists for: a 2 mirrors x 2 seeds fan-out
// over one scenario is 4 candidates and 1 scenario state, not 4.
const seedJitter = (n) => jitterDefinition({ ...base, id: `${base.id}_seed${n}` }, MIN_GEOMETRY_DISTANCE_M * (0.2 + 0.1 * n));
const fanOut = [base, mirrorDefinitionY(base), seedJitter(1), mirrorDefinitionY(seedJitter(2))];
ok("a 2-mirror x 2-seed fan-out collapses to ONE scenario state", filterNovel(fanOut, []).kept.length === 1);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
