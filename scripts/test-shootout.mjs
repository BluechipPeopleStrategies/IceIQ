import test from "node:test";
import assert from "node:assert/strict";
import {
  shotClockMs, coveredAtStartCount, closesDuringShotCount, holeOpenMs,
  EASY_CLOCK_MS, HARD_CLOCK_MS, EASY_HOLE_MS, HARD_HOLE_MS,
} from "../src/cognitive-gym/shootoutCore.js";

// Deterministic PRNG for later tasks.
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
globalThis.__mulberry32 = mulberry32; // reused by later test blocks in this file

test("shot clock shrinks with level", () => {
  assert.equal(shotClockMs(1), EASY_CLOCK_MS);
  assert.equal(shotClockMs(20), HARD_CLOCK_MS);
  assert.ok(shotClockMs(1) > shotClockMs(10));
  assert.ok(shotClockMs(10) > shotClockMs(20));
});

test("goalie covers more cells at higher levels", () => {
  assert.equal(coveredAtStartCount(1), 1);
  assert.equal(coveredAtStartCount(20), 4);
  assert.ok(coveredAtStartCount(10) >= coveredAtStartCount(1));
});

test("more cells close mid-shot at higher levels", () => {
  assert.equal(closesDuringShotCount(1), 0);
  assert.equal(closesDuringShotCount(20), 2);
});

test("hole-open window shrinks, and faster at the top (pow curve)", () => {
  assert.equal(holeOpenMs(1), EASY_HOLE_MS);
  assert.equal(holeOpenMs(20), HARD_HOLE_MS);
  const dropLow = holeOpenMs(1) - holeOpenMs(10);
  const dropHigh = holeOpenMs(10) - holeOpenMs(20);
  assert.ok(dropHigh > dropLow, "window should drop faster at high levels");
});
