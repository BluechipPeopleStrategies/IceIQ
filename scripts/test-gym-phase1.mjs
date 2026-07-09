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
