import test from "node:test";
import assert from "node:assert/strict";
import { calibratedStartLevel, seededLevel } from "../src/cognitive-gym/gymEngine.js";

test("calibratedStartLevel seeds by age band, defaults to 1", () => {
  assert.equal(calibratedStartLevel("U7"), 2);
  assert.equal(calibratedStartLevel("u9"), 4);
  assert.equal(calibratedStartLevel("U11"), 6);
  assert.equal(calibratedStartLevel("U15"), 1);
  assert.equal(calibratedStartLevel(null), 1);
});

test("seededLevel seeds an untouched drill, never lowers, leaves played drills", () => {
  // untouched (no sessions) -> seeded up to the age level
  assert.equal(seededLevel({ level: 1, sessions: [] }, "U11"), 6);
  // never lower an existing higher level
  assert.equal(seededLevel({ level: 9, sessions: [] }, "U7"), 9);
  // a played drill is left alone
  assert.equal(seededLevel({ level: 3, sessions: [{ date: "2026-06-14" }] }, "U11"), 3);
  // unknown band on untouched -> stays 1
  assert.equal(seededLevel({ level: 1, sessions: [] }, "U15"), 1);
});
