import test from "node:test";
import assert from "node:assert/strict";
import {
  countdownRingScale,
  feetToMetres,
  lateReadCueIndex,
  pixelHitRadii,
  readNumbersLabelsVisible,
  runPlayCatchFraction,
  runPlayStepIndex,
  trackingTargetVisible,
} from "./gymScene3DCore.js";

test("tracking targets are hidden during movement and recall", () => {
  assert.equal(trackingTargetVisible("watch", true), true);
  assert.equal(trackingTargetVisible("feedback", true), true);
  assert.equal(trackingTargetVisible("track", true), false);
  assert.equal(trackingTargetVisible("pick", true), false);
  assert.equal(trackingTargetVisible("track", false), false);
});

test("snapshot hit window converts to physical elliptical radii", () => {
  assert.deepEqual(pixelHitRadii(40, 800, 496), { x: 3.048, z: 2.089354838709678 });
  assert.equal(pixelHitRadii(-1, 800, 496), null);
});

test("pass tolerance stays in regulation metres", () => {
  assert.equal(feetToMetres(10), 3.048);
  assert.equal(feetToMetres(-1), null);
});

test("read-number labels follow the actual watch and feedback stages", () => {
  assert.equal(readNumbersLabelsVisible("ready"), false);
  assert.equal(readNumbersLabelsVisible("pick"), false);
  assert.equal(readNumbersLabelsVisible("watch"), true);
  assert.equal(readNumbersLabelsVisible("feedback"), true);
});

test("late-read cue hides the future target until the authored defensive change", () => {
  const scene = { stage: 'ready', startTs: 100, tr: { changes: true, changeAtMs: 300, firstIndex: 1, finalIndex: 3 } };
  assert.equal(lateReadCueIndex(scene, 500), null);
  scene.stage = 'live';
  assert.equal(lateReadCueIndex(scene, 399), 1);
  assert.equal(lateReadCueIndex(scene, 400), 3);
  scene.tr.changes = false;
  assert.equal(lateReadCueIndex(scene, 500), 1);
  scene.stage = 'reveal';
  assert.equal(lateReadCueIndex(scene, 150), 3);
});

test("countdown ring reaches its end and play puck uses the catch fraction", () => {
  assert.equal(countdownRingScale(1), 1);
  assert.equal(countdownRingScale(0), 0.01);
  assert.equal(countdownRingScale(-1), 0.01);
  assert.equal(runPlayStepIndex(250, 100, 4), 2);
  assert.equal(runPlayCatchFraction(50, 100), 50 / 85);
  assert.equal(runPlayCatchFraction(99, 100), 1);
});
