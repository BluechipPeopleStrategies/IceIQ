import test from "node:test";
import assert from "node:assert/strict";
import { resolveBand } from "../src/cognitive-gym/gymBand.js";
import { calibratedStartLevel, createAdaptiveLevel } from "../src/cognitive-gym/gymEngine.js";

test("resolveBand parses division strings, bare bands, and names", () => {
  assert.equal(resolveBand("U11 / Atom"), "U11");
  assert.equal(resolveBand("u9"), "U9");
  assert.equal(resolveBand("U18 / Midget"), "U18");
  assert.equal(resolveBand("Atom"), "U11");      // name-only fallback
  assert.equal(resolveBand("Peewee"), "U13");
  assert.equal(resolveBand(""), null);
  assert.equal(resolveBand(null), null);
  assert.equal(resolveBand("U12"), null);        // not a real band
});

test("calibratedStartLevel seeds every band from full division strings", () => {
  assert.equal(calibratedStartLevel("U7 / Initiation"), 2);
  assert.equal(calibratedStartLevel("U9 / Novice"), 4);
  assert.equal(calibratedStartLevel("U11 / Atom"), 6);
  assert.equal(calibratedStartLevel("U13 / Peewee"), 7);
  assert.equal(calibratedStartLevel("U15 / Bantam"), 8);
  assert.equal(calibratedStartLevel("U18 / Midget"), 8);
  assert.equal(calibratedStartLevel(null), 1);
});

test("createAdaptiveLevel fires onResult every rep and onChange on promote/relegate", () => {
  const results = [];
  const changes = [];
  const eng = createAdaptiveLevel(2, {
    onResult: (s) => results.push(s),
    onChange: (lvl, d) => changes.push([lvl, d]),
  });
  eng.record(true); eng.record(true); eng.record(true);   // promote to 3
  eng.record(false); eng.record(false);                    // relegate to 2
  assert.deepEqual(results, [true, true, true, false, false]);
  assert.deepEqual(changes, [[3, 1], [2, -1]]);
});

import { reactionPoints, RT_FLOOR_MS, HOLD_POINTS } from "../src/cognitive-gym/reactionCore.js";

test("reactionPoints: graded hits, flat holds, zero for errors", () => {
  // instant tap = max points; floor keeps humanly-fast taps near the top
  assert.equal(reactionPoints({ kind: "hit", rt: RT_FLOOR_MS, windowMs: 900 }), 1000);
  const mid = reactionPoints({ kind: "hit", rt: 500, windowMs: 900 });
  assert.ok(mid > 0 && mid < 1000);
  // slower rt earns less
  assert.ok(
    reactionPoints({ kind: "hit", rt: 700, windowMs: 900 }) <
    reactionPoints({ kind: "hit", rt: 400, windowMs: 900 })
  );
  assert.equal(reactionPoints({ kind: "hold" }), HOLD_POINTS);
  for (const kind of ["early", "slow", "falseAlarm", "missedGo"]) {
    assert.equal(reactionPoints({ kind }), 0);
  }
});

import { shiftPoints } from "../src/cognitive-gym/trackingCore.js";

test("shiftPoints: linear base, perfect bonus, ball bonus, max 1000", () => {
  assert.equal(shiftPoints(0, 3, false), 0);
  assert.equal(shiftPoints(1, 3, false), 200);
  assert.equal(shiftPoints(2, 3, false), 400);
  assert.equal(shiftPoints(3, 3, false), 750);        // 600 base + 150 perfect
  assert.equal(shiftPoints(3, 3, true), 1000);        // + 250 ball
  assert.equal(shiftPoints(1, 3, true), 450);         // ball counts even when imperfect
});

import { CUES, gymCueHooks } from "../src/cognitive-gym/gymAudio.js";

test("CUES: every cue is a non-empty list of {freq, dur, at} notes", () => {
  for (const name of ["tap", "go", "hit", "perfect", "miss", "levelUp", "fanfare"]) {
    assert.ok(Array.isArray(CUES[name]) && CUES[name].length > 0, name);
    for (const n of CUES[name]) {
      assert.ok(n.freq > 0 && n.dur > 0 && n.at >= 0);
    }
  }
});

test("gymCueHooks returns engine-shaped callbacks", () => {
  const hooks = gymCueHooks();
  assert.equal(typeof hooks.onResult, "function");
  assert.equal(typeof hooks.onChange, "function");
  // callable without an AudioContext (node) — must not throw
  hooks.onResult(true);
  hooks.onChange(5, 1);
});
