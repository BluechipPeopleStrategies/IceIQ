#!/usr/bin/env node
// Run: node src/scenario-engine/compiledTeachingPlay.test.mjs
import { readFileSync } from "node:fs";
import { compileTeachingPlay, deriveEventTimes, COMPILED_TEACHING_PLAY_SCHEMA_VERSION } from "./compiledTeachingPlay.js";
import { evaluateDecision, compareDeclaredToDerived } from "./decisionEvaluation.js";
import { simulate } from "./physics/simulator.js";
import { sampleAt, frameAt } from "./playbackClock.js";
import { playSpaceToRinkFrame } from "./frameAdapters.js";
import { SCENARIO_DEFINITION_SCHEMA_VERSION } from "./scenarioDefinition.js";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };
const throws = async (fn) => { try { await fn(); return false; } catch { return true; } };

const u13Profile = JSON.parse(readFileSync(new URL("./physics/profiles/u13.json", import.meta.url), "utf8"));

// Real breakout-fixture-shaped positions, matching Phase 1/2's own fixtures.
const D1_START = playSpaceToRinkFrame([192.5, 42.5]);
const D1_ESCAPE = playSpaceToRinkFrame([186, 25]);
const W1_POS = playSpaceToRinkFrame([155, 20]);
const F1_POS = playSpaceToRinkFrame([183, 64]);
const F2_POS = playSpaceToRinkFrame([162, 42]);

function baseDefinition(overrides = {}) {
  return {
    schemaVersion: SCENARIO_DEFINITION_SCHEMA_VERSION,
    id: "sd_test_fixture", version: 1, contentHash: null,
    family: "dz-breakout", tacticalClaimVersion: null, proofMode: "coach-declared", ageSkillProfile: "u13",
    sources: [{ note: "docs/library/dz-breakout-retrieval-under-pressure.md", cite: "test fixture" }],
    rinkFrame: { profileId: "nhl-200x85-v1", units: "metres", attackingDirection: "+x" },
    initialState: {
      actors: [
        { id: "D1", team: "home", role: "puckCarrier", position: D1_START },
        { id: "W1", team: "home", role: "support", position: W1_POS },
        { id: "F1", team: "away", role: "defender", position: F1_POS },
        { id: "F2", team: "away", role: "defender", position: F2_POS },
      ],
      puck: { position: D1_START },
    },
    intendedActions: [{ actorId: "D1", kind: "skate", startTime: 0, endTime: 3, toPosition: D1_ESCAPE }],
    decisionFreeze: { time: 5, observableCues: ["test"] }, // 2s gap after the action ends -- enough to stop (see detectImpossibleStopping)
    declaredRead: { actorId: "D1", description: "escape the way the forechecker turned away from" },
    questionKindVariants: [{ kind: "lane-pick", ageBands: ["U13"], copy: { q: "test" } }],
    generationParams: null, dependencyVersions: { rinkFrame: "rink-frame-v1" },
    ...overrides,
  };
}

// A clean candidate (matches the fixture above) and a physically-impossible
// one (teleportation), so evaluateDecision resolves to exactly one viable
// candidate -- a realistic end-to-end setup, not a synthetic unit shortcut.
const cleanDef = baseDefinition();
const impossibleDef = baseDefinition({
  id: "sd_test_fixture_impossible",
  intendedActions: [{ actorId: "D1", kind: "skate", startTime: 0, endTime: 0.01, toPosition: D1_ESCAPE }],
});

const cleanTrace = await simulate(cleanDef, u13Profile);
const impossibleTrace = await simulate(impossibleDef, u13Profile);

ok("setup: the clean fixture is actually physicsClean", cleanTrace.physicsClean);
ok("setup: the impossible fixture is actually NOT physicsClean", !impossibleTrace.physicsClean);

const evaluation = evaluateDecision([
  { id: "escape_open_side", trace: cleanTrace },
  { id: "into_pressure", trace: impossibleTrace },
]);
ok("setup: evaluation resolves to exactly the clean candidate", evaluation.status === "resolved" && evaluation.derivedRead === "escape_open_side");

// ---- Refuses to compile anything that isn't a clean AGREE --------------------
{
  const disagreeEval = evaluateDecision([
    { id: "escape_open_side", trace: cleanTrace },
    { id: "into_pressure", trace: impossibleTrace },
  ]);
  ok("compileTeachingPlay throws when the declared candidate doesn't match the derived one", await throws(() => compileTeachingPlay(cleanDef, cleanTrace, disagreeEval, "into_pressure")));

  const ambiguousEval = evaluateDecision([
    { id: "escape_open_side", trace: cleanTrace },
    { id: "also_clean", trace: cleanTrace },
  ]);
  ok("compileTeachingPlay throws when the evaluation is review-required (ambiguous)", await throws(() => compileTeachingPlay(cleanDef, cleanTrace, ambiguousEval, "escape_open_side")));

  // A trace that was never actually simulated FROM this definition -- e.g.
  // a caller accidentally pairs an unrelated (but physically clean) trace
  // with this definition's own identity/copy. Both of Phase 3's independent
  // adversarial reviews caught this: previously nothing checked that trace
  // and definition actually belonged together, so a "Frankenstein" artifact
  // (right id/declaredRead text, wrong samples) would compile cleanly.
  const otherDef = baseDefinition({
    id: "sd_test_fixture_unrelated",
    declaredRead: { actorId: "D1", description: "THIS IS A DIFFERENT SCENARIO'S declared read" },
  });
  const otherTrace = await simulate(otherDef, u13Profile);
  const otherEvaluation = evaluateDecision([{ id: "escape_open_side", trace: otherTrace }]);
  ok(
    "compileTeachingPlay throws when the trace doesn't actually belong to the given definition",
    await throws(() => compileTeachingPlay(cleanDef, otherTrace, otherEvaluation, "escape_open_side"))
  );
}

// ---- Successful compilation ---------------------------------------------------
const compiledPlay = await compileTeachingPlay(cleanDef, cleanTrace, evaluation, "escape_open_side");
ok("a genuinely agreeing definition/trace/evaluation compiles successfully", compiledPlay.schemaVersion === COMPILED_TEACHING_PLAY_SCHEMA_VERSION);
ok("compiled play carries the dependency hashes (definition, trace, profile)", compiledPlay.dependencyHashes.definitionId === "sd_test_fixture" && compiledPlay.dependencyHashes.traceHash === cleanTrace.canonicalTraceHash);
ok("compiled play carries the resolved samples from the trace", compiledPlay.samples === cleanTrace.samples);
ok("compiled play carries the question freeze time and observable cues", compiledPlay.questionFreezeTime === 5 && compiledPlay.observableCues.length > 0);
ok("compiled play carries answer proof with the derived read and full proof chain", compiledPlay.answerProof.derivedRead === "escape_open_side" && compiledPlay.answerProof.proofChain.length === 2);
ok("compiled play is immutable (frozen)", Object.isFrozen(compiledPlay));
ok("compiled play has a real content hash", typeof compiledPlay.compiledHash === "string" && compiledPlay.compiledHash.length === 64);
ok("eventTimes includes every action start/end plus the freeze time", compiledPlay.eventTimes.includes(0) && compiledPlay.eventTimes.includes(3));

// ---- Determinism: compiling twice from identical inputs -----------------------
{
  const compiledAgain = await compileTeachingPlay(cleanDef, cleanTrace, evaluation, "escape_open_side");
  ok("compiling the same inputs twice produces an identical compiledHash", compiledPlay.compiledHash === compiledAgain.compiledHash);
}

// ---- THE central exit-gate proof: shared clock, independent consumers ---------
// Two independently-written "consumer" functions -- standing in for
// player-preview, coach-preview, and video-export -- both walk the SAME
// compiledPlay through the SAME playbackClock and must produce identical
// samples at every queried time. This is framework-fit decision 1's actual
// requirement, proven here before any real consumer exists.
function playerPreviewConsumer(play, times) {
  return times.map((t) => ({ t, frame: frameAt(play, t) }));
}
function videoExportConsumer(play, times) {
  // Deliberately structured differently (per-actor loop instead of
  // frameAt's batch call) to prove this isn't just "the same function
  // called twice" -- two genuinely different call patterns over the same
  // clock must still agree.
  return times.map((t) => {
    const frame = {};
    const actorIds = [...new Set(play.samples.map((s) => s.actorId))];
    for (const id of actorIds) frame[id] = sampleAt(play, id, t);
    return { t, frame: Object.freeze(frame) };
  });
}

const queryTimes = [0, 0.5, 1, 1.5, 2, 2.5, 3];
const playerOutput = playerPreviewConsumer(compiledPlay, queryTimes);
const videoOutput = videoExportConsumer(compiledPlay, queryTimes);
ok("player-preview and video-export consumers produce byte-identical samples at every time", JSON.stringify(playerOutput) === JSON.stringify(videoOutput));

// A third "coach-preview" consumer, querying in reverse order and at
// different intermediate times -- order and granularity of queries must
// not matter, only the (play, t) pair.
function coachPreviewConsumer(play, times) {
  return [...times].reverse().map((t) => ({ t, frame: frameAt(play, t) })).reverse();
}
const coachOutput = coachPreviewConsumer(compiledPlay, queryTimes);
ok("a third consumer querying in reverse order still agrees exactly", JSON.stringify(coachOutput) === JSON.stringify(playerOutput));

// ---- deriveEventTimes helper tests -----------------------------------------
{
  const def = {
    intendedActions: [{ startTime: 0.5, endTime: 1.2 }, { startTime: 1.2, endTime: 2 }],
    decisionFreeze: { time: 0.8 },
  };
  const times = deriveEventTimes(def);
  ok("deriveEventTimes includes 0", times.includes(0));
  ok("deriveEventTimes includes every action start/end", [0.5, 1.2, 2].every((t) => times.includes(t)));
  ok("deriveEventTimes includes decisionFreeze.time", times.includes(0.8));
  ok("deriveEventTimes is sorted ascending", times.every((t, i) => i === 0 || times[i - 1] <= t));
  ok("deriveEventTimes de-duplicates repeated times", times.filter((t) => t === 1.2).length === 1);
}
{
  const def = { intendedActions: [], decisionFreeze: {} };
  const times = deriveEventTimes(def);
  ok("deriveEventTimes with no decisionFreeze.time still returns [0]", times.length === 1 && times[0] === 0);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
